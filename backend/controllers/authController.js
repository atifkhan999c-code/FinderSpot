const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { MOCK_USERS } = require('../data/mockData');
const { isSupabaseDbReady } = require('../config/supabase');
const SupabaseDB = require('../services/supabaseDb');

if (!global.fallbackUsers) {
  global.fallbackUsers = MOCK_USERS.map((u) => ({ ...u, password: 'password123' }));
}

const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

/**
 * Generate JSON Web Token
 */
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'super_secret_jwt_key_finderspot_2026_campus_auth',
    {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    }
  );
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, studentId, department } = req.body;

    if (!name || !email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    const emailClean = email.trim().toLowerCase();

    // Restrict public registration roles to prevent unauthorized privilege escalation
    const allowedPublicRoles = ['Student', 'Faculty', 'Staff', 'General Public'];
    let assignedRole = 'Student';
    if (role && allowedPublicRoles.includes(role)) {
      assignedRole = role;
    }

    if (isSupabaseDbReady()) {
      if (!EMAIL_REGEX.test(emailClean)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      const exists = await SupabaseDB.findUserByEmail(emailClean);
      if (exists) {
        return res.status(400).json({ success: false, message: 'A user with this email address is already registered' });
      }
      const user = await SupabaseDB.createUser({
        name,
        email: emailClean,
        password,
        phone,
        role: assignedRole,
        studentId,
        department,
      });
      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          ...user,
          token: generateToken(user._id),
        },
      });
    }

    if (mongoose.connection.readyState !== 1) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      const exists = global.fallbackUsers.find((u) => u.email === emailClean);
      if (exists) {
        return res.status(400).json({ success: false, message: 'A user with this email address is already registered' });
      }
      const newUser = {
        _id: 'USR-' + Date.now(),
        name: name.trim(),
        email: emailClean,
        password,
        phone: phone || '',
        role: assignedRole,
        studentId: studentId || '',
        department: department || '',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        trustPoints: 100,
      };
      global.fallbackUsers.push(newUser);
      const { password: _, ...safeUser } = newUser;
      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: { ...safeUser, token: generateToken(newUser._id) },
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: emailClean });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address is already registered',
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: emailClean,
      password,
      phone: phone || '',
      role: assignedRole,
      studentId: studentId || '',
      department: department || '',
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        avatar: user.avatar,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ success: false, message: msg });
    }
    console.error('Registration Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration',
    });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const emailClean = email.trim().toLowerCase();

    if (isSupabaseDbReady()) {
      const user = await SupabaseDB.findUserByEmail(emailClean, true);
      if (!user || !(await SupabaseDB.verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email address or password',
        });
      }
      const { passwordHash: _, ...safeUser } = user;
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          ...safeUser,
          token: generateToken(user._id),
        },
      });
    }

    if (mongoose.connection.readyState !== 1) {
      const matched = global.fallbackUsers.find(
        (u) => u.email.toLowerCase() === emailClean && u.password === password
      );
      if (!matched) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email address or password',
        });
      }
      const { password: _, ...safeUser } = matched;
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          ...safeUser,
          token: generateToken(matched._id),
        },
      });
    }

    // Check for user (include password field)
    const user = await User.findOne({ email: emailClean }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        avatar: user.avatar,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during login',
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      const user = await SupabaseDB.findUserById(req.user._id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      return res.status(200).json({ success: true, data: user });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ success: true, data: req.user });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      const updatedUser = await SupabaseDB.updateUser(req.user._id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.name = req.body.name || user.name;
    user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
    user.department = req.body.department !== undefined ? req.body.department : user.department;
    user.studentId = req.body.studentId !== undefined ? req.body.studentId : user.studentId;

    if (req.body.avatar) {
      user.avatar = req.body.avatar;
    }

    if (req.body.notificationPreferences) {
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...req.body.notificationPreferences,
      };
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        department: updatedUser.department,
        studentId: updatedUser.studentId,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
};
