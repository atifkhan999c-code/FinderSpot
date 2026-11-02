const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    item: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'itemModel',
      required: false,
    },
    itemModel: {
      type: String,
      enum: ['LostItem', 'FoundItem'],
      default: 'FoundItem',
    },
    itemTitle: {
      type: String,
      default: '',
    },
    itemImage: {
      type: String,
      default: '',
    },
    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      senderName: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now },
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find conversations for a user
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ item: 1 });

module.exports = mongoose.model('Conversation', ConversationSchema, 'Conversations');
