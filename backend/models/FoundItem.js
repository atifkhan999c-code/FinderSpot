const mongoose = require('mongoose');

const FoundItemSchema = new mongoose.Schema(
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
      required: [true, 'Please specify discovery location'],
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
      required: [true, 'Please specify date found'],
    },
    time: {
      type: String,
      default: '',
    },
    custody: {
      type: String,
      enum: ['security', 'with_me', 'department'],
      default: 'security',
    },
    custodyLocationDetails: {
      type: String,
      default: 'Campus Security Desk, Room 104',
    },
    status: {
      type: String,
      enum: ['active', 'claimed', 'returned', 'archived'],
      default: 'active',
    },
    description: {
      type: String,
      required: [true, 'Please provide a public description'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    },
    securityQuestion: {
      type: String,
      required: [true, 'Please provide a secret verification question for the claimant'],
      trim: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    reporterName: {
      type: String,
      default: 'Campus Samaritan',
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
FoundItemSchema.index({ title: 'text', description: 'text', location: 'text', tags: 'text' });
// Add spatial index for geo-radius queries
FoundItemSchema.index({ locationPoint: '2dsphere' }, { sparse: true });

// Explicitly bind to 'FoundItems' collection
module.exports = mongoose.model('FoundItem', FoundItemSchema, 'FoundItems');
