const express = require('express');
const router = express.Router();
const {
  getUserConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// All chat endpoints require JWT authentication
router.use(protect);

router.route('/conversations')
  .get(getUserConversations)
  .post(getOrCreateConversation);

router.route('/conversations/:id/messages')
  .get(getMessages)
  .post(sendMessage);

router.route('/conversations/:id/read')
  .put(markAsRead);

module.exports = router;
