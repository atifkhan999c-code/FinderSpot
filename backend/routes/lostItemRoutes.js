const express = require('express');
const router = express.Router();
const {
  createLostItem,
  getAllLostItems,
  getLostItemById,
  updateLostItem,
  deleteLostItem,
  getMyLostItems,
} = require('../controllers/lostItemController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { submissionLimiter } = require('../middleware/securityMiddleware');
const upload = require('../services/uploadService');

// Get all lost items / create new report
router
  .route('/')
  .get(getAllLostItems)
  .post(submissionLimiter, optionalAuth, upload.single('image'), createLostItem);

// Logged-in user's own reported lost items
router.get('/my-reports', protect, getMyLostItems);

// Individual item operations
router
  .route('/:id')
  .get(getLostItemById)
  .put(protect, upload.single('image'), updateLostItem)
  .delete(protect, deleteLostItem);

module.exports = router;
