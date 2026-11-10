const express = require('express');
const router = express.Router();
const {
  submitClaim,
  getClaimsForItem,
  updateClaimStatus,
} = require('../controllers/claimController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { submissionLimiter } = require('../middleware/securityMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Submit a new ownership verification claim (Requires login)
router.post('/', protect, submissionLimiter, upload.single('proofImage'), submitClaim);

// Get all claims filed for a specific item
router.get('/item/:itemId', protect, getClaimsForItem);

// Approve or reject a claim
router.put('/:id/status', protect, updateClaimStatus);

module.exports = router;
