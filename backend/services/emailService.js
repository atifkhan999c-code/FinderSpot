const nodemailer = require('nodemailer');

let cachedTransporter = null;

/**
 * Get or initialize Nodemailer transporter
 * Supports both Production SMTP (SendGrid, Mailgun, Gmail) and Dev Ethereal Inboxes
 */
const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  // 1. Production or User-configured SMTP
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log(`📧 [Email Service] Configured with SMTP Host: ${process.env.EMAIL_HOST}`);
    return cachedTransporter;
  }

  // 2. Development Mode: Auto-generate Ethereal Test Account
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log(`📧 [Email Service] Running in Development Mode with Ethereal Test Inbox: ${testAccount.user}`);
    return cachedTransporter;
  } catch (err) {
    console.warn(`⚠️ [Email Service] Could not create Ethereal test inbox, logging fallback only: ${err.message}`);
    return null;
  }
};

/**
 * Generate Modern Responsive HTML Template for Match Notifications
 */
const getMatchHtml = ({ recipientName, lostItem, foundItem, actionUrl }) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Potential Match Found | FinderSpot</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
      
      <!-- Top Brand Header -->
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
        <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px;">
          Finder<span style="color: #a5f3fc;">Spot</span>
        </div>
        <p style="margin: 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.9;">
          Automated Match Alert
        </p>
      </div>

      <!-- Main Body -->
      <div style="padding: 32px 28px;">
        <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px;">
          Good news, ${recipientName || 'Student'}! 🎉
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
          Our intelligent lost-and-found system detected a newly reported item that closely matches the property you reported lost:
        </p>

        <!-- Matched Item Card -->
        <div style="background-color: #f1f5f9; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 28px;">
          <div style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px;">
            FOUND ITEM MATCH
          </div>
          <h3 style="font-size: 17px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0;">
            ${foundItem.title}
          </h3>
          <p style="font-size: 13px; color: #64748b; margin: 0 0 14px 0; line-height: 1.5;">
            ${foundItem.description || 'No additional description provided.'}
          </p>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">Category:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${foundItem.category}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Discovered At:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${foundItem.location}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Matches Your Report:</td>
              <td style="padding: 6px 0; color: #4f46e5; font-weight: 700;">${lostItem.title}</td>
            </tr>
          </table>
        </div>

        <!-- Action Callout Button -->
        <div style="text-align: center; margin-bottom: 28px;">
          <a href="${actionUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);">
            View Item Details & Claim Ownership &rarr;
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; text-align: center;">
          To verify ownership, be prepared to answer any security challenge questions or provide unique identifying features.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center; font-size: 11px; color: #94a3b8;">
        <p style="margin: 0 0 6px 0;">&copy; 2026 FinderSpot Platform. Verified Campus Network.</p>
        <p style="margin: 0;">Main Security Desk: Room 104 &bull; Hotline: +1 (555) 911-0022</p>
      </div>

    </div>
  </body>
  </html>
  `;
};

/**
 * Generate Modern HTML Template for Claim Notifications
 */
const getClaimHtml = ({ recipientName, item, claimantName, claimantEmail, proofDetails, actionUrl }) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ownership Claim Filed | FinderSpot</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
      
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
        <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px;">
          Finder<span style="color: #a7f3d0;">Spot</span>
        </div>
        <p style="margin: 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.9;">
          Ownership Claim Verification
        </p>
      </div>

      <div style="padding: 32px 28px;">
        <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px;">
          Hello ${recipientName || 'Finder'},
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
          An ownership verification claim has been submitted for the item you reported: <strong>"${item.title}"</strong>.
        </p>

        <div style="background-color: #f8fafc; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 10px;">
            Claimant Information
          </div>
          <p style="margin: 0 0 6px 0; font-size: 14px; color: #0f172a;"><strong>Claimant:</strong> ${claimantName}</p>
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #0f172a;"><strong>Email:</strong> ${claimantEmail}</p>
          
          <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">
            Verification Proof / Answer:
          </div>
          <div style="background: #ffffff; padding: 12px 16px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 13px; color: #334155; font-style: italic;">
            "${proofDetails}"
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${actionUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);">
            Review Claim & Approve / Reject &rarr;
          </a>
        </div>
      </div>

      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center; font-size: 11px; color: #94a3b8;">
        &copy; 2026 FinderSpot Platform. Verified Community Network.
      </div>

    </div>
  </body>
  </html>
  `;
};

/**
 * Modern Email Service Engine
 */
class EmailService {
  /**
   * Dispatch match notification email to item owner
   */
  static async sendMatchAlert({ recipientEmail, recipientName, lostItem, foundItem }) {
    if (!recipientEmail) return { success: false, reason: 'No recipient email' };

    try {
      const transporter = await getTransporter();
      if (!transporter) return { success: false, reason: 'No mail transport' };

      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
      const actionUrl = `${baseUrl}/item-details.html?id=${foundItem._id}&type=found`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || '"FinderSpot Portal" <notifications@finderspot.edu>',
        to: recipientEmail,
        subject: `🎉 Potential Match Found for Your Lost "${lostItem.title}" - FinderSpot`,
        text: `Good news! A found item "${foundItem.title}" at "${foundItem.location}" matches your lost report "${lostItem.title}". Review it at: ${actionUrl}`,
        html: getMatchHtml({
          recipientName: recipientName || lostItem.reporterName,
          lostItem,
          foundItem,
          actionUrl,
        }),
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`\n📬 [EMAIL SENT] Match alert delivered to: ${recipientEmail}`);
      console.log(`   Message ID: ${info.messageId}`);

      // If Ethereal test account, display the instant browser preview URL
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`   🔗 Live Email Browser Preview: ${previewUrl}\n`);
      }

      return { success: true, messageId: info.messageId, previewUrl };
    } catch (err) {
      console.error(`❌ [Email Service Error] Failed sending match email to ${recipientEmail}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Dispatch claim notification email to finder/custodian
   */
  static async sendClaimAlert({ recipientEmail, recipientName, item, claim }) {
    if (!recipientEmail) return { success: false, reason: 'No recipient email' };

    try {
      const transporter = await getTransporter();
      if (!transporter) return { success: false, reason: 'No mail transport' };

      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
      const actionUrl = `${baseUrl}/my-reports.html`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || '"FinderSpot Portal" <claims@finderspot.edu>',
        to: recipientEmail,
        subject: `🔔 New Ownership Claim for "${item.title}" - FinderSpot`,
        text: `A claim was submitted by ${claim.claimantName} for "${item.title}". Proof: "${claim.proofDetails}". Review at: ${actionUrl}`,
        html: getClaimHtml({
          recipientName: recipientName || item.reporterName,
          item,
          claimantName: claim.claimantName,
          claimantEmail: claim.claimantEmail,
          proofDetails: claim.proofDetails,
          actionUrl,
        }),
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`\n📬 [EMAIL SENT] Claim notification delivered to: ${recipientEmail}`);
      console.log(`   Message ID: ${info.messageId}`);

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`   🔗 Live Email Browser Preview: ${previewUrl}\n`);
      }

      return { success: true, messageId: info.messageId, previewUrl };
    } catch (err) {
      console.error(`❌ [Email Service Error] Failed sending claim email to ${recipientEmail}:`, err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = EmailService;
