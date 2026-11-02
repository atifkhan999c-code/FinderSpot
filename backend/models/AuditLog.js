const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'CLAIM_APPROVED',
        'CLAIM_REJECTED',
        'ITEM_HANDOVER',
        'ITEM_DELETED',
        'USER_ROLE_UPDATED',
        'VAULT_INTAKE',
        'STATUS_OVERRIDE',
      ],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    performerName: {
      type: String,
      default: 'Campus Security / Admin',
    },
    performerRole: {
      type: String,
      default: 'Security',
    },
    targetId: {
      type: String,
      default: '',
    },
    targetType: {
      type: String,
      enum: ['Claim', 'LostItem', 'FoundItem', 'User', 'Vault', 'System'],
      default: 'Claim',
    },
    details: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
  },
  {
    timestamps: true,
    collection: 'AuditLogs',
  }
);

// Indexes for fast administrative querying
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ targetType: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
