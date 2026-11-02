const AuditLog = require('../models/AuditLog');

class AuditService {
  /**
   * Record an immutable administrative or moderation event
   */
  static async record({
    action,
    req = null,
    performedBy = null,
    performerName = '',
    performerRole = '',
    targetId = '',
    targetType = 'Claim',
    details,
    metadata = {},
  }) {
    try {
      let finalPerformedBy = performedBy;
      let finalPerformerName = performerName || 'System Automated';
      let finalPerformerRole = performerRole || 'Admin';
      let ipAddress = '127.0.0.1';

      if (req) {
        if (req.user) {
          finalPerformedBy = req.user._id;
          finalPerformerName = req.user.name || finalPerformerName;
          finalPerformerRole = req.user.role || finalPerformerRole;
        }
        ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
      }

      const log = await AuditLog.create({
        action,
        performedBy: finalPerformedBy,
        performerName: finalPerformerName,
        performerRole: finalPerformerRole,
        targetId: targetId ? targetId.toString() : '',
        targetType,
        details,
        metadata,
        ipAddress,
      });

      console.log(`📋 [AUDIT LOG] [${action}] by ${finalPerformerName} (${finalPerformerRole}): ${details}`);
      return log;
    } catch (err) {
      console.error('Audit Log Record Error:', err.message);
      return null;
    }
  }

  /**
   * Fetch recent audit records
   */
  static async getRecent(limit = 50, filter = {}) {
    return await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('performedBy', 'name email role department');
  }
}

module.exports = AuditService;
