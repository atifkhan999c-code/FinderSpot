const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'itemModel',
    },
    itemModel: {
      type: String,
      required: true,
      enum: ['FoundItem', 'LostItem'],
      default: 'FoundItem',
    },
    claimant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    claimantName: {
      type: String,
      required: [true, 'Please provide claimant name'],
      trim: true,
    },
    claimantEmail: {
      type: String,
      required: [true, 'Please provide claimant email'],
      trim: true,
      lowercase: true,
    },
    claimantPhone: {
      type: String,
      default: '',
    },
    proofDetails: {
      type: String,
      required: [true, 'Please provide your answer or verification proof'],
      maxlength: [1000, 'Proof details cannot exceed 1000 characters'],
    },
    proofImage: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewerNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Explicitly bind to 'Claims' collection
module.exports = mongoose.model('Claim', ClaimSchema, 'Claims');
