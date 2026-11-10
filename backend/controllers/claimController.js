const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const FoundItem = require('../models/FoundItem');
const LostItem = require('../models/LostItem');
const Notification = require('../models/Notification');
const { emitClaimAlert } = require('../services/socketService');
const EmailService = require('../services/emailService');
const { isSupabaseDbReady, uploadImageToSupabase } = require('../config/supabase');
const SupabaseDB = require('../services/supabaseDb');

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

    if (isSupabaseDbReady()) {
      const modelName = itemModel === 'LostItem' ? 'LostItem' : 'FoundItem';
      const itemType = modelName === 'LostItem' ? 'lost' : 'found';
      const targetItem = await SupabaseDB.getItemById(itemType, itemId);

      if (!targetItem) {
        return res.status(404).json({
          success: false,
          message: 'Target item to claim does not exist',
        });
      }

      let proofImageUrl = '';
      if (req.file) {
        const supaUrl = await uploadImageToSupabase(req.file, 'claims');
        proofImageUrl = supaUrl || `/uploads/${req.file.filename}`;
      }

      const claim = await SupabaseDB.createClaim({
        item: itemId,
        itemModel: modelName,
        claimant: req.user ? req.user._id : null,
        claimantName,
        claimantEmail,
        claimantPhone: claimantPhone || '',
        proofDetails,
        proofImage: proofImageUrl,
      });

      if (targetItem.reporter) {
        await SupabaseDB.createNotification({
          recipient: targetItem.reporter,
          title: 'New Ownership Claim Submitted!',
          message: `${claimantName} submitted a verification proof claim on your reported item "${targetItem.title}".`,
          type: 'claim',
          link: `/my-reports.html`,
          relatedItem: targetItem._id,
          relatedItemModel: modelName,
        });

        emitClaimAlert(String(targetItem.reporter), {
          message: `${claimantName} submitted a verification ownership claim on "${targetItem.title}".`,
          item: targetItem,
          claimantName,
          link: `/my-reports.html`,
        });

        if (targetItem.reporterEmail) {
          EmailService.sendClaimAlert({
            recipientEmail: targetItem.reporterEmail,
            recipientName: targetItem.reporterName,
            item: targetItem,
            claim,
          }).catch((err) => console.warn('Claim email dispatch warning:', err.message));
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Claim verification submitted successfully. The finder/custodian has been notified.',
        data: claim,
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
    const itemModel = req.query.itemModel || null;

    if (isSupabaseDbReady()) {
      const claims = await SupabaseDB.getClaimsForItem(req.params.itemId, itemModel);
      return res.status(200).json({
        success: true,
        count: claims.length,
        data: claims,
      });
    }

    const filter = { item: req.params.itemId };
    if (itemModel) filter.itemModel = itemModel;
    const claims = await Claim.find(filter).sort({ createdAt: -1 });

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

    if (isSupabaseDbReady()) {
      const claim = await SupabaseDB.getClaimById(req.params.id);
      if (!claim) {
        return res.status(404).json({
          success: false,
          message: 'Claim not found',
        });
      }

      const itemType = claim.itemModel === 'LostItem' ? 'lost' : 'found';
      const targetItem = await SupabaseDB.getItemById(itemType, claim.item);
      const isCustodian = targetItem && targetItem.reporter && String(targetItem.reporter) === String(req.user._id);
      const isAdmin = req.user.role === 'Admin' || req.user.role === 'Security';

      if (!isCustodian && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to approve or reject this claim',
        });
      }

      const updatedClaim = await SupabaseDB.updateClaim(req.params.id, {
        status,
        reviewerNotes: reviewerNotes !== undefined ? reviewerNotes : claim.reviewerNotes,
      });

      if (status === 'approved') {
        await SupabaseDB.updateItem(itemType, claim.item, { status: 'returned' });

        if (claim.claimant) {
          await SupabaseDB.createNotification({
            recipient: claim.claimant,
            title: 'Ownership Claim Approved! 🎉',
            message: `Your claim for item verification was approved! You can now arrange pickup.`,
            type: 'claim',
            link: `/item-details.html?id=${claim.item}`,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: `Claim status successfully updated to ${status}`,
        data: updatedClaim,
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
