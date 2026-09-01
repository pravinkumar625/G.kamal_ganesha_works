const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'ganesha_secret_key_9739142445';

// Customer Login (No Password)
router.post('/login/customer', (req, res) => {
  const { email, mobile, customerType } = req.body;

  if (!mobile) {
    return res.status(400).json({ error: 'Mobile number is required' });
  }

  // Standardize mobile number by trimming whitespace and extracting last 10 digits
  const cleanMobile = mobile.trim();
  const normalizedMobile = cleanMobile.replace(/\D/g, '').slice(-10) || cleanMobile;
  const cleanEmail = email ? email.trim() : '';
  const selectedType = (customerType === 'wholesale' || customerType === 'retail') ? customerType : 'retail';

  // Look up customer by mobile (either exact match or normalized 10-digit match)
  let customer = db.findOne('users', u => 
    u.role === 'customer' && 
    (u.mobile === cleanMobile || u.mobile === normalizedMobile || (u.mobile && u.mobile.replace(/\D/g, '').slice(-10) === normalizedMobile))
  );

  if (!customer) {
    // Self-registration on first login
    customer = db.insert('users', {
      name: 'New Customer',
      mobile: normalizedMobile,
      email: cleanEmail,
      address: '',
      customerType: selectedType,
      role: 'customer'
    });
  } else {
    // If logging in again, preserve existing customerType unless changed, and normalize mobile
    const updates = { mobile: normalizedMobile };
    if (customerType && (customerType === 'wholesale' || customerType === 'retail')) {
      updates.customerType = customerType;
      customer.customerType = customerType;
    }
    if (cleanEmail && (!customer.email || cleanEmail !== customer.email)) {
      updates.email = cleanEmail;
      customer.email = cleanEmail;
    }
    if (customer.deleted) {
      updates.deleted = false;
      updates.deletedAt = null;
      customer.deleted = false;
      customer.deletedAt = null;
    }
    db.update('users', customer.id, updates);
    customer.mobile = normalizedMobile;
  }

  // Create login log entry
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  db.insert('login_logs', {
    customerId: customer.id,
    name: customer.name || 'New Customer',
    email: cleanEmail || customer.email || '',
    mobile: normalizedMobile,
    timestamp: new Date().toISOString(),
    userAgent: userAgent
  });

  // Generate JWT token containing the pricing customerType claim
  const token = jwt.sign(
    { id: customer.id, mobile: customer.mobile, role: 'customer', customerType: customer.customerType },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: customer.id,
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      address: customer.address,
      customerType: customer.customerType,
      role: 'customer'
    }
  });
});

// Admin Login (Password Required)
router.post('/login/admin', (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return res.status(400).json({ error: 'Mobile number and password are required' });
  }

  const cleanMobile = mobile.trim();

  // Find admin by mobile
  const admin = db.findOne('users', u => u.mobile === cleanMobile && u.role === 'admin');

  if (!admin) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  // Verify bcrypt password
  const isMatch = bcrypt.compareSync(password, admin.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: admin.id, mobile: admin.mobile, role: 'admin', name: admin.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: admin.id,
      name: admin.name,
      mobile: admin.mobile,
      role: 'admin'
    }
  });
});

module.exports = { router, JWT_SECRET };
