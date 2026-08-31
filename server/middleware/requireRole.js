const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../routes/auth');

function requireRole(allowedRoles = []) {
  // Can accept a string or array of allowed roles
  const roles = typeof allowedRoles === 'string' ? [allowedRoles] : allowedRoles;

  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Access token is required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access token is malformed' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;

      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Access denied: insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('JWT Verification Error:', error);
      return res.status(401).json({ error: 'Access token is invalid or expired' });
    }
  };
}

module.exports = requireRole;
