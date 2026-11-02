const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAdminAnalytics,
  getAuditLogs,
  getAllUsers,
  updateUserRole,
  getAllClaimsForAdmin,
  updateClaimDecision,
  logCustodyIntake,
  deleteItemByAdmin,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Protect all admin endpoints with JWT & Admin/Security role check
router.use(protect);
router.use(adminOnly);

router.get('/stats', getAdminStats);
router.get('/analytics', getAdminAnalytics);
router.get('/audit-logs', getAuditLogs);
router.get('/users', getAllUsers);
router.put('/users/:id', updateUserRole);
router.get('/claims', getAllClaimsForAdmin);
router.put('/claims/:id/status', updateClaimDecision);
router.post('/custody', logCustodyIntake);
router.delete('/items/:type/:id', deleteItemByAdmin);

module.exports = router;
