const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const requireRole = require('../middleware/requireRole');

// All routes in this router require the 'admin' role
router.use(requireRole('admin'));

// --- ORDERS ENDPOINTS ---

// Get all orders (optimized for lightweight payload by omitting heavy base64 strings during auto-sync)
router.get('/orders', (req, res) => {
  const orders = db.getCollection('orders');
  // Sort orders by creation date descending
  const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const sanitized = sorted.map(o => {
    const { originalPdfBase64, ...rest } = o;
    return {
      ...rest,
      hasOriginalBill: !!(o.status === 'finalized' || originalPdfBase64)
    };
  });

  res.json(sanitized);
});

// Get a single order with full details
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
  const adminMobile = customerDetails.mobile.trim();
  const normalizedAdminMobile = adminMobile.replace(/\D/g, '').slice(-10) || adminMobile;

  let customer = db.findOne('users', u => 
    u.role === 'customer' && 
    (u.mobile === adminMobile || u.mobile === normalizedAdminMobile || (u.mobile && u.mobile.replace(/\D/g, '').slice(-10) === normalizedAdminMobile))
  );

  if (!customer) {
    customer = db.insert('users', {
      name: customerDetails.name.trim(),
      mobile: normalizedAdminMobile,
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
      mobile: normalizedAdminMobile,
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
    status: status || 'pending_review'
  };

  const newOrder = db.insert('orders', orderData);
  res.status(201).json(newOrder);
});

// Edit an order's contents / status
router.put('/orders/:id', (req, res) => {
  const orderId = req.params.id;
  const { customerDetails, items, grandTotal, advancePayment, balanceDue, status, rejectionReason } = req.body;

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
  if (status) {
    updates.status = status;
    if (status === 'pending_review') {
      updates.rejectionReason = '';
    }
  }
  if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason;

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

// Approve & Finalize Order (generates and stores original bill)
router.post('/orders/:id/approve', (req, res) => {
  const orderId = req.params.id;
  const { pdfBase64 } = req.body;

  const order = db.findOne('orders', o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const updates = {
    status: 'finalized',
    rejectionReason: '',
    finalizedAt: new Date().toISOString()
  };

  if (pdfBase64) {
    updates.originalPdfBase64 = pdfBase64;
  }

  const finalizedOrder = db.update('orders', orderId, updates);
  res.json({ message: 'Order approved and finalized successfully', order: finalizedOrder });
});

// Reject Order
router.post('/orders/:id/reject', (req, res) => {
  const orderId = req.params.id;
  const { reason } = req.body;

  const order = db.findOne('orders', o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const updates = {
    status: 'rejected',
    rejectionReason: (reason && typeof reason === 'string' && reason.trim()) ? reason.trim() : 'Cannot fulfill order at this time / Out of stock',
    rejectedAt: new Date().toISOString()
  };

  const updatedOrder = db.update('orders', orderId, updates);
  res.json({ message: 'Order rejected successfully', order: updatedOrder });
});

// Reset Order to Pending Review
router.post('/orders/:id/reset', (req, res) => {
  const orderId = req.params.id;
  const order = db.findOne('orders', o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const updates = {
    status: 'pending_review',
    rejectionReason: ''
  };

  const updatedOrder = db.update('orders', orderId, updates);
  res.json({ message: 'Order reset to Pending Review successfully', order: updatedOrder });
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
    const normCustMobile = c.mobile ? c.mobile.replace(/\D/g, '').slice(-10) : '';
    const customerOrders = orders.filter(o => {
      if (o.customerId === c.id) return true;
      if (normCustMobile && o.customerDetails?.mobile) {
        return o.customerDetails.mobile.replace(/\D/g, '').slice(-10) === normCustMobile;
      }
      return false;
    });

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
        rejectionReason: o.rejectionReason || '',
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

module.exports = router;
