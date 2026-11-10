const Notification = require('../models/Notification');
const { isSupabaseDbReady } = require('../config/supabase');
const SupabaseDB = require('../services/supabaseDb');

/**
 * @desc    Get all notifications for logged-in user
 * @route   GET /api/notifications
 * @access  Private
 */
const getUserNotifications = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      const notifications = await SupabaseDB.getUserNotifications(req.user._id);
      const unreadCount = notifications.filter((n) => !n.read).length;
      return res.status(200).json({
        success: true,
        unreadCount,
        count: notifications.length,
        data: notifications,
      });
    }

    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Mark a single notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      const notification = await SupabaseDB.markNotificationRead(req.params.id, req.user._id);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or unauthorized',
        });
      }
      return res.status(200).json({
        success: true,
        data: notification,
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or unauthorized',
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Mark all user notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      await SupabaseDB.markAllNotificationsRead(req.user._id);
      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      const notification = await SupabaseDB.deleteNotification(req.params.id, req.user._id);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or unauthorized',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      });
    }

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or unauthorized',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
