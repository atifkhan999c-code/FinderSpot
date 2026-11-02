const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide notification title'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Please provide notification message'],
    },
    type: {
      type: String,
      enum: ['match', 'claim', 'system', 'tip'],
      default: 'system',
    },
    link: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
    },
    relatedItem: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedItemModel',
      default: null,
    },
    relatedItemModel: {
      type: String,
      enum: ['LostItem', 'FoundItem'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Explicitly bind to 'Notifications' collection
module.exports = mongoose.model('Notification', NotificationSchema, 'Notifications');
