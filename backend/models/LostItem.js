const mongoose = require('mongoose');

const LostItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an item title'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    category: {
      type: String,
      required: [true, 'Please select an item category'],
      enum: [
        'Electronics',
        'Wallets & Cards',
        'Keys',
        'Bags & Luggage',
        'Books & Stationery',
        'Accessories',
        'Clothing',
        'Other',
      ],
    },
    location: {
      type: String,
      required: [true, 'Please specify the location where item was lost'],
      trim: true,
    },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    locationPoint: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    date: {
      type: Date,
      required: [true, 'Please specify date lost'],
    },
    time: {
      type: String,
      default: '',
    },
    reward: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'claimed', 'returned', 'archived'],
      default: 'active',
    },
    description: {
      type: String,
      required: [true, 'Please provide a detailed description'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=800&q=80',
    },
    securityQuestion: {
      type: String,
      default: '',
      trim: true,
    },
    contactPreference: {
      type: String,
      enum: ['inapp', 'direct'],
      default: 'inapp',
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    reporterName: {
      type: String,
      default: 'Anonymous',
    },
    reporterEmail: {
      type: String,
      default: '',
    },
    reporterPhone: {
      type: String,
      default: '',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Add text indexing for search
LostItemSchema.index({ title: 'text', description: 'text', location: 'text', tags: 'text' });
// Add spatial index for geo-radius queries
LostItemSchema.index({ locationPoint: '2dsphere' }, { sparse: true });

// Explicitly bind to 'LostItems' collection
module.exports = mongoose.model('LostItem', LostItemSchema, 'LostItems');
