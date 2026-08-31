const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const requireRole = require('../middleware/requireRole');
const { sendBillSMS } = require('../services/smsService');

// All routes in this router require the 'admin' role
router.use(requireRole('admin'));

// --- ORDERS ENDPOINTS ---

// Get all orders
router.get('/orders', (req, res) => {
  const orders = db.getCollection('orders');
  // Sort orders by creation date descending
  const sorted = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

// Get a single order
router.get('/orders/:id', (req, res) => {
  const order = db.findOne('orders', o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// Create a new order by Admin
router.post('/orders', (req, res) => {
  const { customerDetails, items, grandTotal, advancePayment, balanceDue, status } = req.body;

  if (!customerDetails || !customerDetails.name || !customerDetails.mobile) {
    return res.status(400).json({ error: 'Customer name and mobile number are required' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  // Find or create customer in users
  let customer = db.findOne('users', u => u.mobile === customerDetails.mobile.trim());
  if (!customer) {
    customer = db.insert('users', {
      name: customerDetails.name.trim(),
      mobile: customerDetails.mobile.trim(),
      email: customerDetails.email ? customerDetails.email.trim() : '',
      address: customerDetails.address ? customerDetails.address.trim() : '',
      customerType: customerDetails.customerType || 'retail',
      role: 'customer'
    });
  }

  const calculatedTotal = items.reduce((s, i) => s + (Number(i.lineTotal) || (Number(i.rate) * Number(i.quantity)) || 0), 0);
  const discountAmt = Number(req.body.discount) || 0;
  const extraChargesAmt = Number(req.body.extraCharges) || 0;
  const finalGrandTotal = grandTotal !== undefined ? Number(grandTotal) : Math.max(0, calculatedTotal - discountAmt + extraChargesAmt);
  const finalAdvance = advancePayment !== undefined ? Number(advancePayment) : 0;
  const finalBalance = balanceDue !== undefined ? Number(balanceDue) : Math.max(0, finalGrandTotal - finalAdvance);

  const orderData = {
    customerId: customer.id,
    customerDetails: {
      name: customerDetails.name.trim(),
      mobile: customerDetails.mobile.trim(),
      email: customerDetails.email ? customerDetails.email.trim() : '',
      address: customerDetails.address ? customerDetails.address.trim() : '',
      customerType: customerDetails.customerType || customer.customerType || 'retail'
    },
    items,
    discount: discountAmt,
    extraCharges: extraChargesAmt,
    grandTotal: finalGrandTotal,
    advancePayment: finalAdvance,
    balanceDue: finalBalance,
    status: status || 'pending_review',
    billSentVia: 'none',
    billSentLogs: []
  };

  const newOrder = db.insert('orders', orderData);
  res.status(201).json(newOrder);
});

// Edit an order's contents
router.put('/orders/:id', (req, res) => {
  const orderId = req.params.id;
  const { customerDetails, items, grandTotal, advancePayment, balanceDue, status } = req.body;

  const order = db.findOne('orders', o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const updates = {};
  if (customerDetails) updates.customerDetails = customerDetails;
  if (items) updates.items = items;
  if (req.body.discount !== undefined) updates.discount = Number(req.body.discount);
  if (req.body.extraCharges !== undefined) updates.extraCharges = Number(req.body.extraCharges);
  if (grandTotal !== undefined) updates.grandTotal = Number(grandTotal);
  if (advancePayment !== undefined) updates.advancePayment = Number(advancePayment);
  if (balanceDue !== undefined) updates.balanceDue = Number(balanceDue);
  if (status) updates.status = status;

  const updatedOrder = db.update('orders', orderId, updates);
  res.json({ message: 'Order updated successfully', order: updatedOrder });
});

// Delete an order
router.delete('/orders/:id', (req, res) => {
  const orderId = req.params.id;
  const success = db.delete('orders', orderId);
  if (!success) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({ message: 'Order deleted successfully' });
});

// Approve & Finalize Order (generates original bill, sends SMS notification)
router.post('/orders/:id/approve', async (req, res) => {
  const orderId = req.params.id;
  const { pdfBase64 } = req.body;

  if (!pdfBase64) {
    return res.status(400).json({ error: 'Original Bill PDF data (base64) is required for approval' });
  }

  const order = db.findOne('orders', o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const updates = {
    status: 'finalized',
    originalPdfBase64: pdfBase64,
    billSentLogs: order.billSentLogs || []
  };

  const logs = [...updates.billSentLogs];
  const mobileNumber = order.customerDetails?.mobile;

  if (mobileNumber) {
    try {
      const host = req.get('host');
      const protocol = req.protocol;
      const billUrl = `${protocol}://${host}/api/public/bills/${order.id}/download`;

      const result = await sendBillSMS({
        mobileNumber,
        customerName: order.customerDetails.name,
        orderId: order.id,
        billUrl: billUrl,
        grandTotal: order.grandTotal
      });

      logs.push({
        channel: 'sms',
        timestamp: new Date().toISOString(),
        status: 'success',
        details: result.simulated ? 'Simulated Send (Logged to logs/sms.log)' : `Message SID: ${result.messageSid}`
      });
      updates.billSentVia = 'sms';
    } catch (err) {
      logs.push({
        channel: 'sms',
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: err.message
      });
      updates.billSentVia = 'none';
    }
  } else {
    logs.push({
      channel: 'sms',
      timestamp: new Date().toISOString(),
      status: 'failed',
      error: 'No mobile number registered for customer'
    });
    updates.billSentVia = 'none';
  }

  updates.billSentLogs = logs;

  const finalizedOrder = db.update('orders', orderId, updates);
  res.json({ message: 'Order finalized and SMS sent', order: finalizedOrder });
});

// --- CATALOG MANAGEMENT ENDPOINTS ---

// Get catalog for admin
router.get('/catalog', (req, res) => {
  const catalog = db.getCollection('ganesha_items');
  res.json(catalog);
});

// Add new catalog item
router.post('/catalog', (req, res) => {
  const { name, size, costPrice, retailPrice, wholesalePrice, image, images } = req.body;

  if (!name || !size || retailPrice === undefined || wholesalePrice === undefined) {
    return res.status(400).json({ error: 'Item name, size, retail price, and wholesale price are required' });
  }

  const newItem = db.insert('ganesha_items', {
    name: name.trim(),
    size: size.trim(),
    costPrice: costPrice !== undefined && costPrice !== '' ? Number(costPrice) : 0,
    retailPrice: Number(retailPrice),
    wholesalePrice: Number(wholesalePrice),
    image: image || '',
    images: images || []
  });

  res.status(201).json(newItem);
});

// Edit catalog item
router.put('/catalog/:id', (req, res) => {
  const itemId = req.params.id;
  const { name, size, costPrice, retailPrice, wholesalePrice, image, images } = req.body;

  const updates = {};
  if (name) updates.name = name.trim();
  if (size) updates.size = size.trim();
  if (costPrice !== undefined) updates.costPrice = costPrice !== '' ? Number(costPrice) : 0;
  if (retailPrice !== undefined) updates.retailPrice = Number(retailPrice);
  if (wholesalePrice !== undefined) updates.wholesalePrice = Number(wholesalePrice);
  if (image !== undefined) updates.image = image;
  if (images !== undefined) updates.images = images;

  const updated = db.update('ganesha_items', itemId, updates);

  if (!updated) {
    return res.status(404).json({ error: 'Catalog item not found' });
  }

  res.json({ message: 'Catalog item updated successfully', item: updated });
});

// Delete catalog item
router.delete('/catalog/:id', (req, res) => {
  const success = db.delete('ganesha_items', req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Catalog item not found' });
  }
  res.json({ message: 'Catalog item deleted successfully' });
});

// --- CUSTOMERS DIRECTORY ENDPOINTS ---

// Get all customers details (registered list including active and deleted)
router.get('/customers', (req, res) => {
  const users = db.getCollection('users');
  const customers = users.filter(u => u.role === 'customer');

  const orders = db.getCollection('orders');

  // Enrich customer profiles with registration details, order stats, and deletion status
  const enriched = customers.map(c => {
    const customerOrders = orders.filter(o => o.customerId === c.id);
    const totalOrders = customerOrders.length;
    const totalSpent = customerOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const balanceDue = customerOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);
    const advancePaid = customerOrders.reduce((sum, o) => sum + (o.advancePayment || 0), 0);

    return {
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      email: c.email,
      address: c.address,
      customerType: c.customerType || 'retail',
      registeredAt: c.createdAt,
      totalOrders,
      totalSpent,
      advancePaid,
      balanceDue,
      deleted: !!c.deleted,
      deletedAt: c.deletedAt || null,
      orders: customerOrders.map(o => ({
        id: o.id,
        createdAt: o.createdAt,
        grandTotal: o.grandTotal,
        advancePayment: o.advancePayment,
        balanceDue: o.balanceDue,
        status: o.status,
        items: o.items
      }))
    };
  });

  res.json(enriched);
});

// Soft Delete a customer (mark as deleted)
router.delete('/customers/:id', (req, res) => {
  const customerId = req.params.id;
  const user = db.findOne('users', u => u.id === customerId && u.role === 'customer');
  if (!user) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const updated = db.update('users', customerId, {
    deleted: true,
    deletedAt: new Date().toISOString()
  });

  res.json({ message: 'Customer moved to deleted list successfully', customer: updated });
});

// Permanently delete a customer (hard delete)
router.delete('/customers/:id/permanent', (req, res) => {
  const customerId = req.params.id;
  const user = db.findOne('users', u => u.id === customerId && u.role === 'customer');
  if (!user) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  const success = db.delete('users', customerId);
  if (!success) {
    return res.status(500).json({ error: 'Failed to permanently delete customer' });
  }
  res.json({ message: 'Customer permanently deleted' });
});

// Restore a deleted customer
router.post('/customers/:id/restore', (req, res) => {
  const customerId = req.params.id;
  const user = db.findOne('users', u => u.id === customerId);
  if (!user) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const updated = db.update('users', customerId, {
    deleted: false,
    deletedAt: null
  });

  res.json({ message: 'Customer restored successfully', customer: updated });
});

// Update Customer Amounts (overrides balance/advance on their most recent order or specified order)
router.put('/customers/:id/adjust-amount', (req, res) => {
  const customerId = req.params.id;
  const { orderId, grandTotal, advancePayment, balanceDue } = req.body;

  const orders = db.getCollection('orders');
  let targetOrder;
  if (orderId) {
    targetOrder = orders.find(o => o.id === orderId);
  } else {
    // Find latest order for this customer
    targetOrder = orders.filter(o => o.customerId === customerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  }

  if (!targetOrder) {
    return res.status(404).json({ error: 'No order found for this customer to adjust amounts' });
  }

  const updates = {};
  if (grandTotal !== undefined) updates.grandTotal = Number(grandTotal);
  if (advancePayment !== undefined) updates.advancePayment = Number(advancePayment);
  if (balanceDue !== undefined) updates.balanceDue = Number(balanceDue);

  const updatedOrder = db.update('orders', targetOrder.id, updates);
  res.json({ message: 'Amounts updated successfully', order: updatedOrder });
});

// --- CUSTOMER LOGIN LOGS ENDPOINTS ---

// Get customer login activities
router.get('/login-activity', (req, res) => {
  const logs = db.getCollection('login_logs');
  // Sort descending by timestamp
  const sorted = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(sorted);
});

// --- ADMIN ACCOUNTS MANAGEMENT ---

// Create a new admin account
router.post('/accounts', (req, res) => {
  const { name, mobile, password } = req.body;

  if (!name || !mobile || !password) {
    return res.status(400).json({ error: 'Name, mobile number, and password are required' });
  }

  const cleanMobile = mobile.trim();

  // Check if user already exists
  const existing = db.findOne('users', u => u.mobile === cleanMobile && u.role === 'admin');
  if (existing) {
    return res.status(400).json({ error: 'An admin with this mobile number already exists' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const newAdmin = db.insert('users', {
    name: name.trim(),
    mobile: cleanMobile,
    password: hashedPassword,
    role: 'admin',
    email: ''
  });

  res.status(201).json({
    message: 'Admin account created successfully',
    admin: {
      id: newAdmin.id,
      name: newAdmin.name,
      mobile: newAdmin.mobile,
      role: 'admin'
    }
  });
});

// --- SMS DISPATCH LOGS & SMS GATEWAY SETTINGS ---

// Get SMS Dispatch Logs
router.get('/sms-logs', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const logFile = path.join(__dirname, '..', 'logs', 'sms.log');

  const logs = [];

  // Parse text log file if exists
  if (fs.existsSync(logFile)) {
    try {
      const content = fs.readFileSync(logFile, 'utf-8');
      const blocks = content.split('=============================================');
      blocks.forEach(block => {
        const lines = block.trim().split('\n');
        if (lines.length >= 5) {
          const entry = {};
          lines.forEach(line => {
            if (line.startsWith('Timestamp:')) entry.timestamp = line.replace('Timestamp:', '').trim();
            else if (line.startsWith('To:')) entry.to = line.replace('To:', '').trim();
            else if (line.startsWith('Customer:')) entry.customer = line.replace('Customer:', '').trim();
            else if (line.startsWith('Order ID:')) entry.orderId = line.replace('Order ID:', '').trim();
            else if (line.startsWith('Grand Total:')) entry.grandTotal = line.replace('Grand Total:', '').trim();
            else if (line.startsWith('Status:')) entry.status = line.replace('Status:', '').trim();
            else if (line.startsWith('Message:')) entry.message = line.replace('Message:', '').trim();
          });
          if (entry.timestamp || entry.to) {
            logs.push(entry);
          }
        }
      });
    } catch (err) {
      console.error('Error reading sms.log:', err);
    }
  }

  // Also combine with any order billSentLogs
  const orders = db.getCollection('orders');
  orders.forEach(o => {
    if (o.billSentLogs && Array.isArray(o.billSentLogs)) {
      o.billSentLogs.forEach(l => {
        const alreadyExists = logs.some(entry => entry.orderId === o.id && entry.timestamp === l.timestamp);
        if (!alreadyExists) {
          logs.push({
            timestamp: l.timestamp,
            to: o.customerDetails?.mobile || 'N/A',
            customer: o.customerDetails?.name || 'Customer',
            orderId: o.id,
            grandTotal: `₹${o.grandTotal}`,
            status: l.status === 'success' ? (l.details || 'Dispatched') : `Failed: ${l.error || 'Unknown'}`,
            message: `Thank you for purchasing from G.Kamal Ganesha Works, ${o.customerDetails?.name}! Order #${o.id} bill download link dispatched.`
          });
        }
      });
    }
  });

  // Sort latest first
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(logs);
});

// Get SMS Twilio settings
router.get('/sms-settings', (req, res) => {
  const settings = db.getSettings();
  
  const smsConfig = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || settings.sms?.accountSid || settings.whatsapp?.accountSid || '',
    hasToken: !!(process.env.TWILIO_AUTH_TOKEN || settings.sms?.authToken || settings.whatsapp?.authToken),
    fromNumber: process.env.TWILIO_PHONE_NUMBER || settings.sms?.fromNumber || settings.whatsapp?.fromNumber || '',
    isConfigured: !!(process.env.TWILIO_ACCOUNT_SID || settings.sms?.accountSid) && !!(process.env.TWILIO_AUTH_TOKEN || settings.sms?.authToken)
  };

  res.json(smsConfig);
});

// Save SMS Twilio settings
router.post('/sms-settings', (req, res) => {
  const { accountSid, authToken, fromNumber } = req.body;
  const currentSettings = db.getSettings();

  const smsUpdates = {
    accountSid: accountSid ? accountSid.trim() : '',
    fromNumber: fromNumber ? fromNumber.trim() : ''
  };

  if (authToken) {
    smsUpdates.authToken = authToken.trim();
  } else if (currentSettings.sms?.authToken) {
    smsUpdates.authToken = currentSettings.sms.authToken;
  }

  db.saveSettings({ sms: smsUpdates });
  res.json({ message: 'SMS Gateway settings saved successfully' });
});

// Send Test SMS
router.post('/sms/test', async (req, res) => {
  const { mobileNumber } = req.body;
  if (!mobileNumber) {
    return res.status(400).json({ error: 'Mobile number is required for test SMS' });
  }

  try {
    const result = await sendBillSMS({
      mobileNumber: mobileNumber.trim(),
      customerName: 'Valued Customer (Test)',
      orderId: 'TEST-SMS',
      billUrl: `${req.protocol}://${req.get('host')}/api/public/bills/TEST-SMS/download`,
      grandTotal: 1000
    });

    res.json({
      message: result.simulated ? 'Test SMS simulated and logged successfully.' : 'Live Test SMS sent successfully via Twilio!',
      result
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to send test SMS' });
  }
});

module.exports = router;
