const path = require('path');
const { analyzeItemImage } = require('../services/geminiService');

/**
 * @desc    Analyze uploaded image using Google Gemini API (or smart heuristic fallback)
 * @route   POST /api/ai/analyze-image
 * @access  Public
 */
const analyzeImage = async (req, res) => {
  try {
    let filePath = null;
    let base64Data = null;
    let mimeType = 'image/jpeg';
    let originalFilename = '';

    if (req.file) {
      filePath = req.file.path;
      mimeType = req.file.mimetype;
      originalFilename = req.file.originalname;
    } else if (req.body.imageBase64 || req.body.image) {
      base64Data = req.body.imageBase64 || req.body.image;
      if (req.body.mimeType) {
        mimeType = req.body.mimeType;
      }
      originalFilename = req.body.filename || 'uploaded-item.jpg';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file or provide base64 image data for AI analysis.',
      });
    }

    const analysis = await analyzeItemImage({
      filePath,
      base64Data,
      mimeType,
      originalFilename,
    });

    res.status(200).json({
      success: true,
      message: analysis.keyConfigured
        ? 'AI recognition processed via Google Gemini 1.5 Flash.'
        : 'AI recognition processed via intelligent heuristic engine (Add GEMINI_API_KEY to .env for real Gemini Vision).',
      data: analysis,
    });
  } catch (error) {
    console.error('AI Analysis Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during AI visual recognition.',
    });
  }
};

module.exports = {
  analyzeImage,
};
