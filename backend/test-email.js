/**
 * Automated Verification Script for Email Service
 */
const EmailService = require('./services/emailService');

const runEmailTest = async () => {
  console.log('🧪 Testing FinderSpot Automated Email Service...\n');

  const result = await EmailService.sendMatchAlert({
    recipientEmail: 'alex.morgan@campus.edu',
    recipientName: 'Alex Morgan',
    lostItem: {
      title: 'MacBook Pro M2 Space Gray',
      category: 'Electronics',
      reporterName: 'Alex Morgan',
    },
    foundItem: {
      _id: '672538192a7e11234567890a',
      title: 'Space Gray MacBook Laptop',
      category: 'Electronics',
      location: 'Main Campus Library 2nd Floor',
      description: 'Found resting on a wooden study cubicle with silver MagSafe charger.',
    },
  });

  if (result.success) {
    console.log('✅ [PASS] Automated Match Email Generated and Dispatched!');
    if (result.previewUrl) {
      console.log(`🔗 Click/Open Live Browser Preview: ${result.previewUrl}`);
    }
    process.exit(0);
  } else {
    console.error('❌ [FAIL] Email failed:', result.error || result.reason);
    process.exit(1);
  }
};

runEmailTest();
