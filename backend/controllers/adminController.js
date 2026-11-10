const User = require('../models/User');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const AuditService = require('../services/auditService');
const EmailService = require('../services/emailService');
const { notifyUser, broadcast } = require('../services/socketService');
const { isSupabaseDbReady } = require('../config/supabase');
const SupabaseDB = require('../services/supabaseDb');

/**
 * @desc    Get dashboard metrics and analytics for Admin / Security
 * @route   GET /api/admin/stats
 * @access  Private (Admin / Security)
 */
const getAdminStats = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      const stats = await SupabaseDB.getStats();
      return res.status(200).json({ success: true, data: stats });
    }

    const [
      totalUsers,
      totalLost,
      totalFound,
      activeLost,
      activeFound,
      pendingClaims,
      returnedItems,
      auditLogsCount,
    ] = await Promise.all([
      User.countDocuments(),
      LostItem.countDocuments(),
      FoundItem.countDocuments(),
      LostItem.countDocuments({ status: 'active' }),
      FoundItem.countDocuments({ status: 'active' }),
      Claim.countDocuments({ status: 'pending' }),
      FoundItem.countDocuments({ status: 'returned' }),
      AuditLog.countDocuments(),
    ]);

    const totalReported = totalLost + totalFound;
    const recoveryRate = totalReported > 0 ? Math.round((returnedItems / totalReported) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalLost,
        totalFound,
        activeLost,
        activeFound,
        pendingClaims,
        returnedItems,
        recoveryRate: `${recoveryRate}%`,
        vaultCount: activeFound,
        auditLogsCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get deep analytics breakdown (Categories, Hotspots, 7-Day Trends)
 * @route   GET /api/admin/analytics
 * @access  Private (Admin / Security)
 */
const getAdminAnalytics = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      const [lostItems, foundItems, claimsList] = await Promise.all([
        SupabaseDB.queryItems('lost', { status: 'all' }),
        SupabaseDB.queryItems('found', { status: 'all' }),
        SupabaseDB.listAllClaims(),
      ]);

      const categoriesMap = {};
      lostItems.forEach((it) => {
        categoriesMap[it.category] = (categoriesMap[it.category] || 0) + 1;
      });
      foundItems.forEach((it) => {
        categoriesMap[it.category] = (categoriesMap[it.category] || 0) + 1;
      });
      const categoryBreakdown = Object.keys(categoriesMap).map((cat) => ({
        category: cat,
        count: categoriesMap[cat],
      }));

      const locationCounts = {};
      foundItems.forEach((it) => {
        locationCounts[it.location] = (locationCounts[it.location] || 0) + 1;
      });
      const hotspots = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([location, count]) => ({ location, count }));

      const approvedClaims = claimsList.filter((c) => c.status === 'approved').length;
      const rejectedClaims = claimsList.filter((c) => c.status === 'rejected').length;
      const pendingClaims = claimsList.filter((c) => c.status === 'pending').length;

      return res.status(200).json({
        success: true,
        data: {
          categoryBreakdown,
          hotspots,
          claimsBreakdown: {
            approved: approvedClaims,
            rejected: rejectedClaims,
            pending: pendingClaims,
            total: approvedClaims + rejectedClaims + pendingClaims,
          },
        },
      });
    }

    // 1. Category Breakdown Aggregation
    const lostByCategory = await LostItem.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const foundByCategory = await FoundItem.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    // Merge categories
    const categoriesMap = {};
    lostByCategory.forEach((c) => {
      categoriesMap[c._id] = (categoriesMap[c._id] || 0) + c.count;
    });
    foundByCategory.forEach((c) => {
      categoriesMap[c._id] = (categoriesMap[c._id] || 0) + c.count;
    });

    const categoryBreakdown = Object.keys(categoriesMap).map((cat) => ({
      category: cat,
      count: categoriesMap[cat],
    }));

    // 2. Hotspot locations
    const hotspots = await FoundItem.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // 3. Claims breakdown
    const [approvedClaims, rejectedClaims, pendingClaims] = await Promise.all([
      Claim.countDocuments({ status: 'approved' }),
      Claim.countDocuments({ status: 'rejected' }),
      Claim.countDocuments({ status: 'pending' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        categoryBreakdown,
        hotspots: hotspots.map((h) => ({ location: h._id, count: h.count })),
        claimsBreakdown: {
          approved: approvedClaims,
          rejected: rejectedClaims,
          pending: pendingClaims,
          total: approvedClaims + rejectedClaims + pendingClaims,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Audit Log Trail
 * @route   GET /api/admin/audit-logs
 * @access  Private (Admin / Security)
 */
const getAuditLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;

    if (isSupabaseDbReady()) {
      const logs = await SupabaseDB.getAuditLogs(limit, req.query.action || null);
      return res.status(200).json({
        success: true,
        count: logs.length,
        data: logs,
      });
    }

    const filter = {};
    if (req.query.action) filter.action = req.query.action;

    const logs = await AuditService.getRecent(limit, filter);

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all users list
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      const users = await SupabaseDB.listAllUsers();
      return res.status(200).json({ success: true, count: users.length, data: users });
    }

    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update user role or trust score with Audit Trail
 * @route   PUT /api/admin/users/:id
 * @access  Private (Admin)
 */
const updateUserRole = async (req, res) => {
  try {
    const { role, trustPoints } = req.body;

    if (isSupabaseDbReady()) {
      const existing = await SupabaseDB.findUserById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const previousRole = existing.role;
      const updated = await SupabaseDB.updateUser(req.params.id, {
        ...(role ? { role } : {}),
        ...(trustPoints !== undefined ? { trustPoints } : {}),
      });
      await SupabaseDB.recordAudit({
        actorId: req.user?._id,
        actorName: req.user?.name,
        action: 'USER_ROLE_UPDATED',
        targetType: 'User',
        targetId: updated._id,
        details: `Updated user "${updated.name}" (${updated.email}) role from ${previousRole} to ${updated.role}. Trust points: ${updated.trustPoints}.`,
      });
      return res.status(200).json({
        success: true,
        message: 'User permissions and trust score updated successfully',
        data: updated,
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const previousRole = user.role;
    const previousPoints = user.trustPoints;

    if (role) user.role = role;
    if (trustPoints !== undefined) user.trustPoints = trustPoints;

    await user.save();

    // 📋 Record in Audit Log
    await AuditService.record({
      action: 'USER_ROLE_UPDATED',
      req,
      targetId: user._id,
      targetType: 'User',
      details: `Updated user "${user.name}" (${user.email}) role from ${previousRole} to ${user.role}. Trust points: ${user.trustPoints}.`,
      metadata: { previousRole, newRole: user.role, previousPoints, newPoints: user.trustPoints },
    });

    res.status(200).json({
      success: true,
      message: 'User permissions and trust score updated successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all claims across the platform
 * @route   GET /api/admin/claims
 * @access  Private (Admin / Security)
 */
const getAllClaimsForAdmin = async (req, res) => {
  try {
    if (isSupabaseDbReady()) {
      const claims = await SupabaseDB.listAllClaims();
      return res.status(200).json({ success: true, count: claims.length, data: claims });
    }

    const claims = await Claim.find()
      .sort({ createdAt: -1 })
      .populate('claimant', 'name email role department avatar');

    res.status(200).json({ success: true, count: claims.length, data: claims });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Process Claim Decision (Approve / Reject Handover with Locker Assignment)
 * @route   PUT /api/admin/claims/:id/status
 * @access  Private (Admin / Security)
 */
const updateClaimDecision = async (req, res) => {
  try {
    const { status, reviewerNotes, pickupLocker } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    if (isSupabaseDbReady()) {
      const claim = await SupabaseDB.getClaimById(req.params.id);
      if (!claim) {
        return res.status(404).json({ success: false, message: 'Claim not found' });
      }
      const updatedClaim = await SupabaseDB.updateClaim(req.params.id, {
        status,
        reviewerNotes: reviewerNotes !== undefined ? reviewerNotes : claim.reviewerNotes,
      });

      const itemType = claim.itemModel === 'LostItem' ? 'lost' : 'found';
      const item = await SupabaseDB.getItemById(itemType, claim.item);
      if (item && status === 'approved') {
        await SupabaseDB.updateItem(itemType, claim.item, { status: 'returned' });
      }

      const action = status === 'approved' ? 'CLAIM_APPROVED' : 'CLAIM_REJECTED';
      const auditDetails =
        status === 'approved'
          ? `Approved ownership claim for item "${item ? item.title : 'Item'}" to claimant ${claim.claimantName}. ${
              pickupLocker ? `Assigned Locker: ${pickupLocker}.` : ''
            } Notes: ${reviewerNotes || 'Verified proof.'}`
          : `Rejected claim for item "${item ? item.title : 'Item'}" from ${claim.claimantName}. Reason: ${
              reviewerNotes || 'Unverified proof.'
            }`;

      await SupabaseDB.recordAudit({
        actorId: req.user?._id,
        actorName: req.user?.name,
        action,
        targetType: 'Claim',
        targetId: claim._id,
        details: auditDetails,
      });

      if (claim.claimant) {
        notifyUser(String(claim.claimant), 'claim_status_update', {
          claimId: claim._id,
          status,
          itemTitle: item ? item.title : 'Your Claimed Item',
          pickupLocker: pickupLocker || 'Room 104 Security Desk',
          notes: reviewerNotes,
        });
      }

      broadcast('inventory_updated', { itemId: claim.item, status: status === 'approved' ? 'returned' : undefined });

      return res.status(200).json({
        success: true,
        message: `Claim successfully ${status}`,
        data: updatedClaim,
      });
    }

    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    claim.status = status;
    if (reviewerNotes) claim.reviewerNotes = reviewerNotes;
    await claim.save();

    const Model = claim.itemModel === 'LostItem' ? LostItem : FoundItem;
    const item = await Model.findById(claim.item);

    if (item && status === 'approved') {
      item.status = 'returned';
      await item.save();
    }

    // 📋 Record Audit Trail
    const action = status === 'approved' ? 'CLAIM_APPROVED' : 'CLAIM_REJECTED';
    const auditDetails =
      status === 'approved'
        ? `Approved ownership claim for item "${item ? item.title : 'Item'}" to claimant ${claim.claimantName}. ${
            pickupLocker ? `Assigned Locker: ${pickupLocker}.` : ''
          } Notes: ${reviewerNotes || 'Verified proof.'}`
        : `Rejected claim for item "${item ? item.title : 'Item'}" from ${claim.claimantName}. Reason: ${
            reviewerNotes || 'Unverified proof.'
          }`;

    await AuditService.record({
      action,
      req,
      targetId: claim._id,
      targetType: 'Claim',
      details: auditDetails,
      metadata: { itemId: claim.item, claimant: claim.claimantName, pickupLocker },
    });

    // ⚡ Real-Time WebSocket Push to Claimant
    if (claim.claimant) {
      notifyUser(claim.claimant.toString(), 'claim_status_update', {
        claimId: claim._id,
        status,
        itemTitle: item ? item.title : 'Your Claimed Item',
        pickupLocker: pickupLocker || 'Room 104 Security Desk',
        notes: reviewerNotes,
      });
    }

    // Broadcast inventory refresh to everyone
    broadcast('inventory_updated', { itemId: claim.item, status: 'returned' });

    res.status(200).json({
      success: true,
      message: `Claim successfully ${status}`,
      data: claim,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Log Security Vault Custody Intake (Room 104 Locker)
 * @route   POST /api/admin/custody
 * @access  Private (Admin / Security)
 */
const logCustodyIntake = async (req, res) => {
  try {
    const { itemId, lockerNumber, officerNotes } = req.body;

    if (isSupabaseDbReady()) {
      const item = await SupabaseDB.getItemById('found', itemId);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Found item record not found' });
      }
      const updatedItem = await SupabaseDB.updateItem('found', itemId, {
        custodyLocationDetails: `Locker ${lockerNumber} (Security Desk Room 104)`,
      });
      await SupabaseDB.recordAudit({
        actorId: req.user?._id,
        actorName: req.user?.name,
        action: 'VAULT_INTAKE',
        targetType: 'Vault',
        targetId: updatedItem._id,
        details: `Intake of "${updatedItem.title}" into physical vault locker ${lockerNumber}. Custody Officer: ${
          req.user ? req.user.name : 'Officer'
        }. Notes: ${officerNotes || 'Secure storage logged.'}`,
      });
      return res.status(200).json({
        success: true,
        message: `Item custody safely logged into Locker ${lockerNumber}`,
        data: updatedItem,
      });
    }

    const item = await FoundItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Found item record not found' });
    }

    item.custodyLocationDetails = `Locker ${lockerNumber} (Security Desk Room 104)`;
    await item.save();

    // 📋 Record in Audit Log
    await AuditService.record({
      action: 'VAULT_INTAKE',
      req,
      targetId: item._id,
      targetType: 'Vault',
      details: `Intake of "${item.title}" into physical vault locker ${lockerNumber}. Custody Officer: ${
        req.user ? req.user.name : 'Officer'
      }. Notes: ${officerNotes || 'Secure storage logged.'}`,
      metadata: { lockerNumber, itemId: item._id },
    });

    res.status(200).json({
      success: true,
      message: `Item custody safely logged into Locker ${lockerNumber}`,
      data: item,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Archive or force delete item with Audit Trail
 * @route   DELETE /api/admin/items/:type/:id
 * @access  Private (Admin / Security)
 */
const deleteItemByAdmin = async (req, res) => {
  try {
    const { type, id } = req.params;

    if (isSupabaseDbReady()) {
      const itemType = type === 'lost' ? 'lost' : 'found';
      const item = await SupabaseDB.getItemById(itemType, id);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }
      const itemTitle = item.title;
      await SupabaseDB.deleteItem(itemType, id);
      await SupabaseDB.recordAudit({
        actorId: req.user?._id,
        actorName: req.user?.name,
        action: 'ITEM_DELETED',
        targetType: type === 'lost' ? 'LostItem' : 'FoundItem',
        targetId: id,
        details: `Permanently removed ${type} item report "${itemTitle}" from platform.`,
      });
      return res.status(200).json({
        success: true,
        message: 'Item permanently deleted from portal and logged to audit trail',
      });
    }

    const Model = type === 'lost' ? LostItem : FoundItem;

    const item = await Model.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const itemTitle = item.title;
    await item.deleteOne();

    // 📋 Record in Audit Log
    await AuditService.record({
      action: 'ITEM_DELETED',
      req,
      targetId: id,
      targetType: type === 'lost' ? 'LostItem' : 'FoundItem',
      details: `Permanently removed ${type} item report "${itemTitle}" from platform.`,
      metadata: { type, title: itemTitle },
    });

    res.status(200).json({
      success: true,
      message: 'Item permanently deleted from portal and logged to audit trail',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAdminStats,
  getAdminAnalytics,
  getAuditLogs,
  getAllUsers,
  updateUserRole,
  getAllClaimsForAdmin,
  updateClaimDecision,
  logCustodyIntake,
  deleteItemByAdmin,
};
