const jwt = require('jsonwebtoken');

/**
 * Common Helper Utilities
 */

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'super_secret_jwt_key_finderspot_2026_campus_auth',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const sanitizeInput = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
};

module.exports = {
  generateToken,
  formatDate,
  sanitizeInput,
};
