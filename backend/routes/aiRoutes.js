const express = require('express');
const router = express.Router();
const upload = require('../services/uploadService');
const { analyzeImage } = require('../controllers/aiController');

// POST /api/ai/analyze-image
// Accepts multipart FormData (with field 'image') or JSON with 'imageBase64'
router.post('/analyze-image', upload.single('image'), analyzeImage);

module.exports = router;
