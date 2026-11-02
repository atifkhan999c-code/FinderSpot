const express = require('express');
const router = express.Router();
const { searchAllItems, getMapItems } = require('../controllers/searchController');

// Unified multi-criteria search endpoint
// Example: GET /api/search?q=phone&category=Electronics&type=lost
router.get('/', searchAllItems);

// Geo-spatial and interactive map items with proximity radius filter
// Example: GET /api/search/map?lat=40.7295&lng=-73.9965&radius=1000&type=all
router.get('/map', getMapItems);

module.exports = router;
