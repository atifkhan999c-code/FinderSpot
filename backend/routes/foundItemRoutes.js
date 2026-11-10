const express = require('express');
const router = express.Router();
const {
  createFoundItem,
  getAllFoundItems,
  getFoundItemById,
  updateFoundItem,
  deleteFoundItem,
  getMyFoundItems,
} = require('../controllers/foundItemController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { submissionLimiter } = require('../middleware/securityMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Get all found items / report newly found item (Requires login)
router
  .route('/')
  .get(protect, getAllFoundItems)
  .post(protect, submissionLimiter, upload.single('image'), createFoundItem);

// Logged-in user's own reported found items
router.get('/my-reports', protect, getMyFoundItems);

// Individual found item operations
router
  .route('/:id')
  .get(protect, getFoundItemById)
  .put(protect, upload.single('image'), updateFoundItem)
  .delete(protect, deleteFoundItem);

module.exports = router;
