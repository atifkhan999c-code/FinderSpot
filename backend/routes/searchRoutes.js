const express = require('express');
const router = express.Router();
const { searchAllItems, getMapItems } = require('../controllers/searchController');
const { protect } = require('../middleware/authMiddleware');

// Unified multi-criteria search endpoint (Requires login)
router.get('/', protect, searchAllItems);

// Geo-spatial and interactive map items (Requires login)
router.get('/map', protect, getMapItems);

module.exports = router;
