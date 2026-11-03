const mongoose = require('mongoose');
const FoundItem = require('../models/FoundItem');
const LostItem = require('../models/LostItem');
const Notification = require('../models/Notification');
const { emitMatchAlert, broadcast } = require('../services/socketService');
const EmailService = require('../services/emailService');
const { MOCK_FOUND_ITEMS } = require('../data/mockData');

/**
 * @desc    Create a new found item report
 * @route   POST /api/found-items
 * @access  Public / Optional Auth
 */
const createFoundItem = async (req, res) => {
  try {
    const {
      title,
      category,
      location,
      date,
      time,
      custody,
      custodyLocationDetails,
      description,
      securityQuestion,
      tags,
    } = req.body;

    let imageUrl = req.body.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    let coordinates = null;
    let locationPoint = undefined;
    const reqLat = req.body.lat ? parseFloat(req.body.lat) : (req.body.coordinates?.lat ? parseFloat(req.body.coordinates.lat) : null);
    const reqLng = req.body.lng ? parseFloat(req.body.lng) : (req.body.coordinates?.lng ? parseFloat(req.body.coordinates.lng) : null);
    if (!isNaN(reqLat) && !isNaN(reqLng) && reqLat !== null && reqLng !== null) {
      coordinates = { lat: reqLat, lng: reqLng };
      locationPoint = { type: 'Point', coordinates: [reqLng, reqLat] };
    }

    const itemData = {
      title,
      category,
      location,
      coordinates,
      date: date || new Date(),
      time: time || '',
      custody: custody || 'security',
      custodyLocationDetails: custodyLocationDetails || 'Campus Security Desk Room 104',
      description,
      securityQuestion,
      image: imageUrl,
      reporter: req.user ? req.user._id : null,
      reporterName: req.user ? req.user.name : (req.body.reporterName || 'Campus Samaritan'),
      reporterEmail: req.user ? req.user.email : (req.body.reporterEmail || ''),
      reporterPhone: req.user ? req.user.phone : (req.body.reporterPhone || ''),
      tags: typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags,
    };
    if (locationPoint) {
      itemData.locationPoint = locationPoint;
    }

    const foundItem = await FoundItem.create(itemData);

    // Match detection against lost items to alert owners
    const matchingLost = await LostItem.find({
      category: foundItem.category,
      status: 'active',
      $text: { $search: foundItem.title },
    }).populate('reporter').limit(3);

    for (const lost of matchingLost) {
      const reporterId = lost.reporter ? (lost.reporter._id || lost.reporter) : null;
      if (reporterId) {
        await Notification.create({
          recipient: reporterId,
          title: 'Potential Match Found for Your Lost Belonging!',
          message: `A found item "${foundItem.title}" discovered at "${foundItem.location}" closely matches your report.`,
          type: 'match',
          link: `/item-details.html?id=${foundItem._id}`,
          relatedItem: foundItem._id,
          relatedItemModel: 'FoundItem',
        });

        // ⚡ Emit Instant Live WebSocket Match Alert to Reporter
        emitMatchAlert(reporterId.toString(), {
          message: `A found item "${foundItem.title}" discovered at "${foundItem.location}" closely matches your lost report "${lost.title}"!`,
          item: foundItem,
          matchedWith: lost,
          link: `/item-details.html?id=${foundItem._id}&type=found`,
        });
      }

      // 📧 Send Automated HTML Email Notification to Item Owner
      const recipientEmail = (lost.reporter && lost.reporter.email) || lost.reporterEmail;
      if (recipientEmail) {
        EmailService.sendMatchAlert({
          recipientEmail,
          recipientName: (lost.reporter && lost.reporter.name) || lost.reporterName,
          lostItem: lost,
          foundItem,
        }).catch((err) => console.warn('Email dispatch warning:', err.message));
      }
    }

    // ⚡ Broadcast new item event to all connected users
    broadcast('new_found_item', {
      _id: foundItem._id,
      title: foundItem.title,
      category: foundItem.category,
      location: foundItem.location,
      image: foundItem.image,
      date: foundItem.date,
      type: 'found',
    });

    res.status(201).json({
      success: true,
      message: 'Found item report published successfully',
      data: foundItem,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message).join(', ');
      return res.status(400).json({
        success: false,
        message: messages,
      });
    }
    console.error('Create Found Item Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating found item report',
    });
  }
};

/**
 * @desc    Get all found items with filters
 * @route   GET /api/found-items
 * @access  Public
 */
const getAllFoundItems = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: true,
        count: MOCK_FOUND_ITEMS.length,
        data: MOCK_FOUND_ITEMS,
      });
    }

    const { category, custody, status, sort, q } = req.query;
    let query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (custody && custody !== 'all') {
      query.custody = custody;
    }

    if (status && status !== 'all') {
      query.status = status;
    } else {
      query.status = { $ne: 'archived' };
    }

    if (q) {
      const safeQ = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: safeQ, $options: 'i' } },
        { description: { $regex: safeQ, $options: 'i' } },
        { location: { $regex: safeQ, $options: 'i' } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }

    const items = await FoundItem.find(query).sort(sortOption);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Get single found item by ID
 * @route   GET /api/found-items/:id
 * @access  Public
 */
const getFoundItemById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Found item report not found',
      });
    }

    if (mongoose.connection.readyState !== 1) {
      const mock = MOCK_FOUND_ITEMS.find((i) => i._id === req.params.id) || MOCK_FOUND_ITEMS[0];
      return res.status(200).json({ success: true, data: mock });
    }

    const item = await FoundItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Found item report not found',
      });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Found item report not found',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Update found item
 * @route   PUT /api/found-items/:id
 * @access  Private / Reporter only
 */
const updateFoundItem = async (req, res) => {
  try {
    let item = await FoundItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Found item not found',
      });
    }

    // Verify ownership or administrative authorization
    const isOwner = item.reporter && item.reporter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'Security';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this found item report',
      });
    }

    if (req.file) {
      req.body.image = `/uploads/${req.file.filename}`;
    }

    item = await FoundItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Found report updated successfully',
      data: item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Delete found item
 * @route   DELETE /api/found-items/:id
 * @access  Private / Reporter only
 */
const deleteFoundItem = async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Found item not found',
      });
    }

    // Verify ownership or administrative authorization
    const isOwner = item.reporter && item.reporter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'Security';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this found item report',
      });
    }

    await item.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Found item report deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Get found items created by logged-in user
 * @route   GET /api/found-items/my-reports
 * @access  Private
 */
const getMyFoundItems = async (req, res) => {
  try {
    const items = await FoundItem.find({ reporter: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createFoundItem,
  getAllFoundItems,
  getFoundItemById,
  updateFoundItem,
  deleteFoundItem,
  getMyFoundItems,
};
