const mongoose = require('mongoose');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Notification = require('../models/Notification');
const { emitMatchAlert, broadcast } = require('../services/socketService');
const EmailService = require('../services/emailService');
const { MOCK_LOST_ITEMS } = require('../data/mockData');
const { isSupabaseDbReady, uploadImageToSupabase } = require('../config/supabase');
const SupabaseDB = require('../services/supabaseDb');

/**
 * @desc    Create a new lost item report
 * @route   POST /api/lost-items
 * @access  Private
 */
const createLostItem = async (req, res) => {
  try {
    const {
      title,
      category,
      location,
      date,
      time,
      reward,
      description,
      securityQuestion,
      contactPreference,
      tags,
    } = req.body;

    let imageUrl = req.body.image || 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=800&q=80';
    if (req.file) {
      const supaUrl = await uploadImageToSupabase(req.file, 'lost');
      imageUrl = supaUrl || `/uploads/${req.file.filename}`;
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
      reward: reward || '',
      description,
      securityQuestion: securityQuestion || '',
      contactPreference: contactPreference || 'inapp',
      image: imageUrl,
      reporter: req.user ? req.user._id : null,
      reporterName: req.user ? req.user.name : (req.body.reporterName || 'Anonymous'),
      reporterEmail: req.user ? req.user.email : (req.body.reporterEmail || ''),
      reporterPhone: req.user ? req.user.phone : (req.body.reporterPhone || ''),
      tags: typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags,
    };
    if (locationPoint) {
      itemData.locationPoint = locationPoint;
    }

    if (isSupabaseDbReady()) {
      if (!title || !category || !location || !description) {
        return res.status(400).json({ success: false, message: 'Please provide title, category, location, and description' });
      }
      const lostItem = await SupabaseDB.createItem('lost', itemData);
      broadcast('new_report_published', {
        id: lostItem._id,
        title: lostItem.title,
        category: lostItem.category,
        location: lostItem.location,
        date: lostItem.date,
        type: 'lost',
      });
      return res.status(201).json({
        success: true,
        message: 'Lost item report published successfully',
        data: lostItem,
      });
    }

    if (mongoose.connection.readyState !== 1) {
      const mockCreated = {
        _id: 'LF-' + Date.now(),
        ...itemData,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      MOCK_LOST_ITEMS.unshift(mockCreated);
      return res.status(201).json({
        success: true,
        message: 'Lost item report published successfully',
        data: mockCreated,
      });
    }

    const lostItem = await LostItem.create(itemData);

    // Check for potential matches in FoundItem collection
    const potentialMatches = await FoundItem.find({
      category: lostItem.category,
      status: 'active',
      $text: { $search: lostItem.title },
    }).populate('reporter').limit(3);

    // If matches found and user is authenticated, create notification
    if (potentialMatches.length > 0 && req.user) {
      await Notification.create({
        recipient: req.user._id,
        title: 'Potential Match Found!',
        message: `Your reported lost item "${lostItem.title}" resembles a found report "${potentialMatches[0].title}".`,
        type: 'match',
        link: `/item-details.html?id=${potentialMatches[0]._id}`,
        relatedItem: potentialMatches[0]._id,
        relatedItemModel: 'FoundItem',
      });

      // ⚡ Emit Instant Live WebSocket Match Alert to Reporter
      emitMatchAlert(req.user._id.toString(), {
        message: `Your reported lost item "${lostItem.title}" resembles found report "${potentialMatches[0].title}"!`,
        item: potentialMatches[0],
        matchedWith: lostItem,
        link: `/item-details.html?id=${potentialMatches[0]._id}&type=found`,
      });

      // 📧 Send Automated HTML Email Notification to Item Owner
      const recipientEmail = req.user.email || lostItem.reporterEmail;
      if (recipientEmail) {
        EmailService.sendMatchAlert({
          recipientEmail,
          recipientName: req.user.name || lostItem.reporterName,
          lostItem,
          foundItem: potentialMatches[0],
        }).catch((err) => console.warn('Email dispatch warning:', err.message));
      }
    }

    // ⚡ Broadcast new lost item to all connected users
    broadcast('new_lost_item', {
      _id: lostItem._id,
      title: lostItem.title,
      category: lostItem.category,
      location: lostItem.location,
      image: lostItem.image,
      reward: lostItem.reward,
      date: lostItem.date,
      type: 'lost',
    });

    res.status(201).json({
      success: true,
      message: 'Lost item report published successfully',
      data: lostItem,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message).join(', ');
      return res.status(400).json({
        success: false,
        message: messages,
      });
    }
    console.error('Create Lost Item Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating lost item report',
    });
  }
};

/**
 * @desc    Get all lost items with pagination and filters
 * @route   GET /api/lost-items
 * @access  Public
 */
const getAllLostItems = async (req, res) => {
  try {
    const { category, status, sort, q } = req.query;

    if (isSupabaseDbReady()) {
      const items = await SupabaseDB.queryItems('lost', { category, status, sort, q });
      return res.status(200).json({ success: true, count: items.length, data: items });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: true,
        count: MOCK_LOST_ITEMS.length,
        data: MOCK_LOST_ITEMS,
      });
    }

    let query = {};

    if (category && category !== 'all') {
      query.category = category;
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

    const items = await LostItem.find(query).sort(sortOption);

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
 * @desc    Get single lost item by ID
 * @route   GET /api/lost-items/:id
 * @access  Private
 */
const getLostItemById = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      const item = await SupabaseDB.getItemById('lost', req.params.id);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Lost item report not found' });
      }
      return res.status(200).json({ success: true, data: item });
    }

    if (mongoose.connection.readyState !== 1) {
      const mock = MOCK_LOST_ITEMS.find((i) => i._id === req.params.id);
      if (!mock) return res.status(404).json({ success: false, message: 'Lost item report not found' });
      return res.status(200).json({ success: true, data: mock });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Lost item report not found',
      });
    }

    const item = await LostItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Lost item report not found',
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
        message: 'Lost item report not found',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Update lost item
 * @route   PUT /api/lost-items/:id
 * @access  Private / Reporter only
 */
const updateLostItem = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      const existing = await SupabaseDB.getItemById('lost', req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Lost item not found' });
      }
      const isOwner = existing.reporter && String(existing.reporter) === String(req.user._id);
      const isAdmin = req.user.role === 'Admin' || req.user.role === 'Security';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this lost item report' });
      }
      if (req.file) {
        const supaUrl = await uploadImageToSupabase(req.file, 'lost');
        req.body.image = supaUrl || `/uploads/${req.file.filename}`;
      }
      const updated = await SupabaseDB.updateItem('lost', req.params.id, req.body);
      return res.status(200).json({ success: true, message: 'Report updated successfully', data: updated });
    }

    let item = await LostItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found',
      });
    }

    // Verify ownership or administrative authorization
    const isOwner = item.reporter && item.reporter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'Security';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this lost item report',
      });
    }

    if (req.file) {
      req.body.image = `/uploads/${req.file.filename}`;
    }

    item = await LostItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
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
 * @desc    Delete lost item
 * @route   DELETE /api/lost-items/:id
 * @access  Private / Reporter only
 */
const deleteLostItem = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      const existing = await SupabaseDB.getItemById('lost', req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Lost item not found' });
      }
      const isOwner = existing.reporter && String(existing.reporter) === String(req.user._id);
      const isAdmin = req.user.role === 'Admin' || req.user.role === 'Security';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this lost item report' });
      }
      await SupabaseDB.deleteItem('lost', req.params.id);
      return res.status(200).json({ success: true, message: 'Lost item report deleted successfully' });
    }

    const item = await LostItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found',
      });
    }

    // Verify ownership or administrative authorization
    const isOwner = item.reporter && item.reporter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'Security';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this lost item report',
      });
    }

    await item.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Lost item report deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Get lost items created by logged-in user
 * @route   GET /api/lost-items/my-reports
 * @access  Private
 */
const getMyLostItems = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      const items = await SupabaseDB.queryItems('lost', { reporterId: req.user._id });
      return res.status(200).json({ success: true, count: items.length, data: items });
    }

    if (mongoose.connection.readyState !== 1) {
      const items = MOCK_LOST_ITEMS.filter(
        (i) => i.reporterEmail && req.user.email && i.reporterEmail.toLowerCase() === req.user.email.toLowerCase()
      );
      return res.status(200).json({ success: true, count: items.length, data: items });
    }

    const items = await LostItem.find({ reporter: req.user._id }).sort({ createdAt: -1 });

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
  createLostItem,
  getAllLostItems,
  getLostItemById,
  updateLostItem,
  deleteLostItem,
  getMyLostItems,
};
