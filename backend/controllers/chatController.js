const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const User = require('../models/User');
const { emitChatMessage, emitConversationRead } = require('../services/socketService');

/**
 * @desc    Get all conversations for the authenticated user
 * @route   GET /api/chat/conversations
 * @access  Private
 */
const getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'name email role avatar trustPoints department')
      .sort({ updatedAt: -1 })
      .lean();

    // Format conversations with clean recipient and unread counter for current user
    const formatted = conversations.map((conv) => {
      const recipient = conv.participants.find((p) => p._id.toString() !== userId.toString()) || {
        name: 'Campus User',
        role: 'Community Member',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      };

      let unread = 0;
      if (conv.unreadCounts) {
        if (typeof conv.unreadCounts.get === 'function') {
          unread = conv.unreadCounts.get(userId.toString()) || 0;
        } else if (typeof conv.unreadCounts === 'object') {
          unread = conv.unreadCounts[userId.toString()] || 0;
        }
      }

      return {
        _id: conv._id,
        item: conv.item,
        itemModel: conv.itemModel,
        itemTitle: conv.itemTitle || 'Item Inquiry',
        itemImage: conv.itemImage || 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=300&q=80',
        recipient,
        lastMessage: conv.lastMessage || null,
        unreadCount: unread,
        updatedAt: conv.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching conversations',
    });
  }
};

/**
 * @desc    Get or create a conversation for an item
 * @route   POST /api/chat/conversations
 * @access  Private
 */
const getOrCreateConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { itemId, itemModel = 'FoundItem', recipientId } = req.body;

    let targetRecipientId = recipientId;
    let itemTitle = 'Property Discussion';
    let itemImage = '';

    // If itemId provided, fetch item details
    if (itemId) {
      const ItemModel = itemModel === 'LostItem' ? LostItem : FoundItem;
      const item = await ItemModel.findById(itemId).populate('reporter');
      if (item) {
        itemTitle = item.title;
        itemImage = item.image;

        // If no recipientId specified, target the reporter
        if (!targetRecipientId && item.reporter) {
          targetRecipientId = item.reporter._id ? item.reporter._id.toString() : item.reporter.toString();
        }
      }
    }

    // If recipient is still not resolved or caller is talking to self, assign Campus Security desk
    if (!targetRecipientId || targetRecipientId === currentUserId.toString()) {
      const securityOfficer = await User.findOne({ role: 'Security' });
      if (securityOfficer && securityOfficer._id.toString() !== currentUserId.toString()) {
        targetRecipientId = securityOfficer._id.toString();
      } else {
        // Fallback to any admin
        const adminUser = await User.findOne({ _id: { $ne: currentUserId } });
        if (adminUser) targetRecipientId = adminUser._id.toString();
      }
    }

    if (!targetRecipientId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to resolve conversation recipient.',
      });
    }

    // Check if conversation already exists between these 2 users for this item
    let conv = await Conversation.findOne({
      participants: { $all: [currentUserId, targetRecipientId] },
      ...(itemId ? { item: itemId } : {}),
    }).populate('participants', 'name email role avatar trustPoints department');

    if (!conv) {
      conv = await Conversation.create({
        participants: [currentUserId, targetRecipientId],
        item: itemId || null,
        itemModel,
        itemTitle,
        itemImage,
        unreadCounts: new Map(),
      });

      conv = await Conversation.findById(conv._id).populate(
        'participants',
        'name email role avatar trustPoints department'
      );
    }

    res.status(200).json({
      success: true,
      data: conv,
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating conversation',
    });
  }
};

/**
 * @desc    Get chronological messages for a conversation
 * @route   GET /api/chat/conversations/:id/messages
 * @access  Private
 */
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const conv = await Conversation.findById(id);
    if (!conv) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const isParticipant = conv.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view messages in this conversation',
      });
    }

    const messages = await Message.find({ conversation: id })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching messages',
    });
  }
};

/**
 * @desc    Send a new chat message
 * @route   POST /api/chat/conversations/:id/messages
 * @access  Private
 */
const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, attachments } = req.body;
    const sender = req.user;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text cannot be empty',
      });
    }

    const conv = await Conversation.findById(id);
    if (!conv) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const isParticipant = conv.participants.some(
      (p) => p.toString() === sender._id.toString()
    );

    if (!isParticipant && sender.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages to this conversation',
      });
    }

    // Determine recipient
    const recipientId = conv.participants
      .find((p) => p.toString() !== sender._id.toString())
      ?.toString();

    // Create Message document
    const message = await Message.create({
      conversation: id,
      sender: sender._id,
      senderName: sender.name,
      senderRole: sender.role,
      senderAvatar:
        sender.avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      text: text.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    // Update Conversation last message and increment unread count for recipient
    conv.lastMessage = {
      text: message.text,
      sender: sender._id,
      senderName: sender.name,
      createdAt: message.createdAt,
    };

    if (recipientId) {
      if (!conv.unreadCounts || typeof conv.unreadCounts.set !== 'function') {
        conv.unreadCounts = new Map();
      }
      const currentCount =
        (typeof conv.unreadCounts.get === 'function' && conv.unreadCounts.get(recipientId)) || 0;
      conv.unreadCounts.set(recipientId, currentCount + 1);
    }

    await conv.save();

    // Dispatch real-time WebSocket events
    emitChatMessage(id, message, recipientId);

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error sending message',
    });
  }
};

/**
 * @desc    Mark conversation messages as read
 * @route   PUT /api/chat/conversations/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const conv = await Conversation.findById(id);
    if (!conv) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Mark all unread incoming messages as read
    await Message.updateMany(
      { conversation: id, sender: { $ne: userId }, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    // Reset unread count for current user
    if (!conv.unreadCounts || typeof conv.unreadCounts.set !== 'function') {
      conv.unreadCounts = new Map();
    }
    conv.unreadCounts.set(userId.toString(), 0);
    await conv.save();

    emitConversationRead(id, userId.toString());

    res.status(200).json({
      success: true,
      message: 'Conversation marked as read',
    });
  } catch (error) {
    console.error('Error marking conversation read:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error marking as read',
    });
  }
};

module.exports = {
  getUserConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead,
};
