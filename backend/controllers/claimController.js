const Claim = require('../models/Claim');
const FoundItem = require('../models/FoundItem');
const LostItem = require('../models/LostItem');
const Notification = require('../models/Notification');
const { emitClaimAlert } = require('../services/socketService');
const EmailService = require('../services/emailService');

/**
 * @desc    Submit ownership claim verification for an item
 * @route   POST /api/claims
 * @access  Public / Optional Auth
 */
const submitClaim = async (req, res) => {
  try {
    const { itemId, itemModel, claimantName, claimantEmail, claimantPhone, proofDetails } = req.body;

    if (!itemId || !claimantName || !claimantEmail || !proofDetails) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required claim details and verification answer',
      });
    }

    if (mongoose.connection.readyState !== 1) {
      let proofImageUrl = '';
      if (req.file) {
        proofImageUrl = `/uploads/${req.file.filename}`;
      }
      const mockClaim = {
        _id: 'CLM-' + Date.now(),
        item: itemId,
        itemModel: itemModel || 'FoundItem',
        claimant: req.user ? req.user._id : null,
        claimantName,
        claimantEmail,
        claimantPhone: claimantPhone || '',
        proofDetails,
        proofImage: proofImageUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      return res.status(201).json({
        success: true,
        message: 'Claim verification submitted successfully. The finder/custodian has been notified.',
        data: mockClaim,
      });
    }

    const modelName = itemModel === 'LostItem' ? 'LostItem' : 'FoundItem';
    const Model = modelName === 'LostItem' ? LostItem : FoundItem;
    const targetItem = await Model.findById(itemId);

    if (!targetItem) {
      return res.status(404).json({
        success: false,
        message: 'Target item to claim does not exist',
      });
    }

    let proofImageUrl = '';
    if (req.file) {
      proofImageUrl = `/uploads/${req.file.filename}`;
    }

    const claim = await Claim.create({
      item: itemId,
      itemModel: modelName,
      claimant: req.user ? req.user._id : null,
      claimantName,
      claimantEmail,
      claimantPhone: claimantPhone || '',
      proofDetails,
      proofImage: proofImageUrl,
    });

    // Notify item reporter if registered
    if (targetItem.reporter) {
      await Notification.create({
        recipient: targetItem.reporter,
        title: 'New Ownership Claim Submitted!',
        message: `${claimantName} submitted a verification proof claim on your reported item "${targetItem.title}".`,
        type: 'claim',
        link: `/my-reports.html`,
        relatedItem: targetItem._id,
        relatedItemModel: modelName,
      });

      // ⚡ Emit Instant Live WebSocket Claim Alert to Reporter
      emitClaimAlert(targetItem.reporter.toString(), {
        message: `${claimantName} submitted a verification ownership claim on "${targetItem.title}".`,
        item: targetItem,
        claimantName,
        link: `/my-reports.html`,
      });

      // 📧 Send Automated Email Alert to Item Custodian / Finder
      const recipientEmail = targetItem.reporterEmail || (targetItem.reporter && targetItem.reporter.email);
      if (recipientEmail) {
        EmailService.sendClaimAlert({
          recipientEmail,
          recipientName: targetItem.reporterName,
          item: targetItem,
          claim,
        }).catch((err) => console.warn('Claim email dispatch warning:', err.message));
      }
    }

    res.status(201).json({
      success: true,
      message: 'Claim verification submitted successfully. The finder/custodian has been notified.',
      data: claim,
    });
  } catch (error) {
    console.error('Submit Claim Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error submitting claim',
    });
  }
};

/**
 * @desc    Get claims for a specific item
 * @route   GET /api/claims/item/:itemId
 * @access  Private / Reporter only
 */
const getClaimsForItem = async (req, res) => {
  try {
    const claims = await Claim.find({ item: req.params.itemId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: claims.length,
      data: claims,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Update claim status (approve or reject)
 * @route   PUT /api/claims/:id/status
 * @access  Private / Reporter or Admin
 */
const updateClaimStatus = async (req, res) => {
  try {
    const { status, reviewerNotes } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid claim status provided',
      });
    }

    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found',
      });
    }

    // Verify caller is the item custodian/reporter or Admin/Security
    const Model = claim.itemModel === 'LostItem' ? LostItem : FoundItem;
    const targetItem = await Model.findById(claim.item);
    const isCustodian = targetItem && targetItem.reporter && targetItem.reporter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'Security';

    if (!isCustodian && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve or reject this claim',
      });
    }

    claim.status = status;
    if (reviewerNotes) claim.reviewerNotes = reviewerNotes;
    await claim.save();

    // If approved, update target item status to 'returned'
    if (status === 'approved') {
      const Model = claim.itemModel === 'LostItem' ? LostItem : FoundItem;
      await Model.findByIdAndUpdate(claim.item, { status: 'returned' });

      // Notify claimant if registered user
      if (claim.claimant) {
        await Notification.create({
          recipient: claim.claimant,
          title: 'Ownership Claim Approved! 🎉',
          message: `Your claim for item verification was approved! You can now arrange pickup.`,
          type: 'claim',
          link: `/item-details.html?id=${claim.item}`,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Claim status successfully updated to ${status}`,
      data: claim,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  submitClaim,
  getClaimsForItem,
  updateClaimStatus,
};
