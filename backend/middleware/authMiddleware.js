const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { MOCK_USERS } = require('../data/mockData');
const { isSupabaseDbReady } = require('../config/supabase');
const SupabaseDB = require('../services/supabaseDb');

async function resolveUserById(id) {
  if (isSupabaseDbReady()) {
    return await SupabaseDB.findUserById(id);
  }
  if (mongoose.connection.readyState === 1) {
    return await User.findById(id).select('-password');
  }
  const pool = global.fallbackUsers || MOCK_USERS;
  const found = pool.find((u) => String(u._id) === String(id));
  if (!found) return null;
  const { password: _, ...safe } = found;
  return safe;
}

/**
 * Protect route with JWT authentication
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'super_secret_jwt_key_finderspot_2026_campus_auth'
      );

      req.user = await resolveUserById(decoded.id);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User belonging to this token no longer exists',
        });
      }

      return next();
    } catch (error) {
      console.error('JWT Error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid or expired token',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }
};

/**
 * Admin or Security only middleware
 */
const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'Security')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied: Requires Admin or Campus Security privileges',
  });
};

/**
 * Optional authentication middleware
 */
const optionalAuth = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'super_secret_jwt_key_finderspot_2026_campus_auth'
      );
      req.user = await resolveUserById(decoded.id);
    } catch (e) {
      req.user = null;
    }
  }
  next();
};

module.exports = { protect, adminOnly, optionalAuth };
