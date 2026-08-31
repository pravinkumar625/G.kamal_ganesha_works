const express = require('express');
const router = express.Router();
const db = require('../db');
const requireRole = require('../middleware/requireRole');

// All routes here require the 'customer' role
router.use(requireRole('customer'));

// Get logged-in customer's profile details
router.get('/profile', (req, res) => {
  const customer = db.findOne('users', u => u.id === req.user.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json({
    id: customer.id,
    name: customer.name,
    mobile: customer.mobile,
    email: customer.email,
    address: customer.address
  });
});

// Update customer profile details
router.post('/profile', (req, res) => {
  const { name, email, address } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const updated = db.update('users', req.user.id, {
    name: name.trim(),
    email: email ? email.trim() : '',
    address: address ? address.trim() : ''
  });

  if (!updated) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: updated.id,
      name: updated.name,
      mobile: updated.mobile,
      email: updated.email,
      address: updated.address
    }
  });
});

// Get catalog for customer
router.get('/catalog', (req, res) => {
  const catalog = db.getCollection('ganesha_items');
  res.json(catalog);
});

// Get customer's own orders (strict data isolation enforced server-side)
router.get('/orders', (req, res) => {
  const customerId = req.user.id;
  const orders = db.find('orders', o => o.customerId === customerId);
  
  // Return orders with base64 PDF omitted for lighter payload, unless requested specifically
  const ordersSummary = orders.map(o => {
    const { originalPdfBase64, ...rest } = o;
    return {
      ...rest,
      hasOriginalBill: !!originalPdfBase64
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

  const customer = db.findOne('users', u => u.id === req.user.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer profile not found' });
  }

  const orderData = {
    customerId: customer.id,
    customerDetails: {
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email || '',
      address: customer.address || '',
      customerType: customer.customerType || 'retail'
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

  const order = db.findOne('orders', o => o.id === orderId);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Ensure this order belongs to the requesting customer
  if (order.customerId !== customerId) {
    return res.status(403).json({ error: 'Access denied: You do not own this order' });
  }

  // Enforce server-side gate: only return the PDF data if the order is finalized
  if (order.status !== 'finalized' || !order.originalPdfBase64) {
    return res.status(403).json({ error: 'Access denied: Original Bill is not ready or approved yet' });
  }

  res.json({
    orderId: order.id,
    pdfBase64: order.originalPdfBase64
  });
});

module.exports = router;
