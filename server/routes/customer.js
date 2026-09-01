const express = require('express');
const router = express.Router();
const db = require('../db');
const requireRole = require('../middleware/requireRole');

// All routes here require the 'customer' role
router.use(requireRole('customer'));

// Get logged-in customer's profile details
router.get('/profile', (req, res) => {
  const userMobile = req.user.mobile ? req.user.mobile.toString().replace(/\D/g, '').slice(-10) : '';
  
  let customer = db.findOne('users', u => u.id === req.user.id);
  if (!customer && userMobile) {
    customer = db.findOne('users', u => 
      u.role === 'customer' && (u.mobile === req.user.mobile || (u.mobile && u.mobile.replace(/\D/g, '').slice(-10) === userMobile))
    );
  }
  
  if (!customer) {
    customer = db.insert('users', {
      id: req.user.id,
      name: 'New Customer',
      mobile: userMobile || req.user.mobile || '',
      email: '',
      address: '',
      customerType: req.user.customerType || 'retail',
      role: 'customer'
    });
  }

  res.json({
    id: customer.id || req.user.id,
    name: customer.name || 'New Customer',
    mobile: customer.mobile || req.user.mobile,
    email: customer.email || '',
    address: customer.address || '',
    customerType: customer.customerType || req.user.customerType || 'retail'
  });
});

// Update customer profile details
router.post('/profile', (req, res) => {
  const { name, email, address } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const cleanName = name.trim();
  const cleanEmail = email ? email.trim() : '';
  const cleanAddress = address ? address.trim() : '';

  let updated = db.update('users', req.user.id, {
    name: cleanName,
    email: cleanEmail,
    address: cleanAddress
  });

  if (!updated && req.user.mobile) {
    const normalizedMobile = req.user.mobile.toString().replace(/\D/g, '').slice(-10);
    const existing = db.findOne('users', u => 
      u.role === 'customer' && (u.mobile === req.user.mobile || (u.mobile && u.mobile.replace(/\D/g, '').slice(-10) === normalizedMobile))
    );
    if (existing) {
      updated = db.update('users', existing.id, {
        name: cleanName,
        email: cleanEmail,
        address: cleanAddress
      });
    }
  }

  if (!updated) {
    updated = db.insert('users', {
      id: req.user.id,
      name: cleanName,
      mobile: req.user.mobile || '',
      email: cleanEmail,
      address: cleanAddress,
      customerType: req.user.customerType || 'retail',
      role: 'customer'
    });
  }

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: updated.id || req.user.id,
      name: updated.name,
      mobile: updated.mobile || req.user.mobile,
      email: updated.email,
      address: updated.address,
      customerType: updated.customerType || req.user.customerType || 'retail'
    }
  });
});

// Get catalog for customer
router.get('/catalog', (req, res) => {
  const catalog = db.getCollection('ganesha_items');
  res.json(catalog);
});

// Get customer's own orders (matches by customerId OR matching mobile number)
router.get('/orders', (req, res) => {
  const customerId = req.user.id;
  const userMobile = req.user.mobile ? req.user.mobile.toString().replace(/\D/g, '').slice(-10) : '';

  const orders = db.find('orders', o => {
    if (o.customerId === customerId) return true;
    if (userMobile && o.customerDetails?.mobile) {
      const orderMobile = o.customerDetails.mobile.toString().replace(/\D/g, '').slice(-10);
      if (orderMobile === userMobile) return true;
    }
    return false;
  });
  
  // Sort latest first
  const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Return orders with base64 PDF omitted for lighter payload
  const ordersSummary = sorted.map(o => {
    const { originalPdfBase64, ...rest } = o;
    return {
      ...rest,
      hasOriginalBill: !!(o.status === 'finalized' || originalPdfBase64)
    };
  });

  res.json(ordersSummary);
});

// Place a new order
router.post('/orders', (req, res) => {
  const { items, grandTotal, advancePayment, balanceDue } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  let customer = db.findOne('users', u => u.id === req.user.id);
  const normalizedUserMobile = req.user.mobile ? req.user.mobile.toString().replace(/\D/g, '').slice(-10) : '';

  if (!customer && normalizedUserMobile) {
    customer = db.findOne('users', u => 
      u.role === 'customer' && 
      (u.mobile === req.user.mobile || u.mobile === normalizedUserMobile || (u.mobile && u.mobile.replace(/\D/g, '').slice(-10) === normalizedUserMobile))
    );
  }

  if (!customer) {
    customer = db.insert('users', {
      id: req.user.id,
      name: 'Customer',
      mobile: normalizedUserMobile || req.user.mobile || '',
      email: '',
      address: '',
      customerType: req.user.customerType || 'retail',
      role: 'customer'
    });
  }

  const orderData = {
    customerId: customer.id || req.user.id,
    customerDetails: {
      name: customer.name || 'Customer',
      mobile: customer.mobile || normalizedUserMobile || req.user.mobile || '',
      email: customer.email || '',
      address: customer.address || '',
      customerType: customer.customerType || req.user.customerType || 'retail'
    },
    items,
    grandTotal: Number(grandTotal) || 0,
    advancePayment: Number(advancePayment) || 0,
    balanceDue: Number(balanceDue) || 0,
    status: 'pending_review',
    billSentVia: 'none',
    billSentLogs: []
  };

  const newOrder = db.insert('orders', orderData);
  res.status(201).json(newOrder);
});

// Download Original finalized PDF (enforced security gate server-side)
router.get('/orders/:id/original-bill', (req, res) => {
  const orderId = req.params.id;
  const customerId = req.user.id;
  const userMobile = req.user.mobile ? req.user.mobile.toString().replace(/\D/g, '').slice(-10) : '';

  const order = db.findOne('orders', o => o.id === orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Ensure this order belongs to the requesting customer
  const orderMobile = order.customerDetails?.mobile ? order.customerDetails.mobile.toString().replace(/\D/g, '').slice(-10) : '';
  const isOwner = order.customerId === customerId || (userMobile && orderMobile === userMobile);

  if (!isOwner) {
    return res.status(403).json({ error: 'Access denied: You do not own this order' });
  }

  // Enforce server-side gate: only return the PDF data if the order is finalized
  if (order.status !== 'finalized') {
    return res.status(403).json({ error: 'Access denied: Original Bill is not ready or approved yet' });
  }

  res.json({
    orderId: order.id,
    pdfBase64: order.originalPdfBase64 || null,
    order: order
  });
});

module.exports = router;
