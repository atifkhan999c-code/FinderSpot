const mongoose = require('mongoose');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Notification = require('../models/Notification');
const { emitMatchAlert, broadcast } = require('../services/socketService');
const EmailService = require('../services/emailService');
const { MOCK_LOST_ITEMS } = require('../data/mockData');

/**
 * @desc    Create a new lost item report
 * @route   POST /api/lost-items
 * @access  Public / Optional Auth
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

    const lostItem = await LostItem.create({
      title,
      category,
      location,
      coordinates,
      locationPoint,
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
    });

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
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: true,
        count: MOCK_LOST_ITEMS.length,
        data: MOCK_LOST_ITEMS,
      });
    }

    const { category, status, sort, q } = req.query;
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
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
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
 * @access  Public
 */
const getLostItemById = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const mock = MOCK_LOST_ITEMS.find((i) => i._id === req.params.id) || MOCK_LOST_ITEMS[0];
      return res.status(200).json({ success: true, data: mock });
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
    let item = await LostItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found',
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
    const item = await LostItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found',
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
