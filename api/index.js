// Ensure DNS resolution succeeds for MongoDB Atlas on serverless environments
try {
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) { }

require('dotenv').config();
const app = require('../server/server');

module.exports = app;
