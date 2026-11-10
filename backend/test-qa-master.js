/**
 * FinderSpot - Master Comprehensive QA Test Suite
 * Executes real Functional, API, Security, Edge Case, and Performance Tests
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:5000';

const testResults = {
  timestamp: new Date().toISOString(),
  categories: {
    functional: { total: 0, passed: 0, failed: 0, tests: [] },
    api: { total: 0, passed: 0, failed: 0, tests: [] },
    security: { total: 0, passed: 0, failed: 0, tests: [] },
    edgeCases: { total: 0, passed: 0, failed: 0, tests: [] },
    performance: { total: 0, passed: 0, failed: 0, tests: [] },
  },
  bugs: [],
};

// Helper: Make HTTP Request
function makeRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const start = Date.now();

    const headers = options.headers || {};
    let postData = options.body;

    if (postData && typeof postData === 'object' && !(postData instanceof Buffer)) {
      postData = JSON.stringify(postData);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers,
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const duration = Date.now() - start;
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          rawBody: data,
          duration,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Multipart Form-Data helper for file upload tests
function makeMultipartRequest(endpoint, fields = {}, file = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const start = Date.now();

    const parts = [];

    // Fields
    for (const [key, val] of Object.entries(fields)) {
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`);
    }

    // File
    if (file) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`
      );
    }

    const startPayload = Buffer.from(parts.join(''));
    const filePayload = file ? Buffer.from(file.content) : Buffer.alloc(0);
    const endPayload = Buffer.from(`${file ? '\r\n' : ''}--${boundary}--\r\n`);
    const fullBody = Buffer.concat([startPayload, filePayload, endPayload]);

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': fullBody.length,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers,
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const duration = Date.now() - start;
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          duration,
        });
      });
    });

    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

function recordTest(category, name, passed, details = {}) {
  const cat = testResults.categories[category];
  cat.total++;
  if (passed) {
    cat.passed++;
  } else {
    cat.failed++;
    testResults.bugs.push({
      category,
      testName: name,
      ...details,
    });
  }
  cat.tests.push({
    name,
    passed,
    ...details,
  });

  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol} [${category.toUpperCase()}] ${name}`);
  if (!passed && details.error) {
    console.log(`   Issue: ${details.error}`);
  }
}

async function runMasterQA() {
  console.log('====================================================');
  console.log('🚀 STARTING COMPREHENSIVE FINDERSPOT QA TEST SUITE');
  console.log(`Target: ${BASE_URL} | Time: ${new Date().toISOString()}`);
  console.log('====================================================\n');

  let studentToken = null;
  let studentUser = null;
  let adminToken = null;
  let testLostItemId = null;
  let testFoundItemId = null;
  let testClaimId = null;
  let testConvId = null;

  // ----------------------------------------------------------------
  // 1. BACKEND & API CONNECTIVITY / HEALTH CHECK
  // ----------------------------------------------------------------
  try {
    const healthRes = await makeRequest('/api/health');
    recordTest('api', 'Health Check Endpoint (/api/health)', healthRes.status === 200 && healthRes.data.status === 'online', {
      status: healthRes.status,
      duration: healthRes.duration,
      response: healthRes.data,
    });
  } catch (err) {
    recordTest('api', 'Health Check Endpoint (/api/health)', false, { error: err.message });
  }

  // ----------------------------------------------------------------
  // 2. FUNCTIONAL TESTING: AUTHENTICATION & USER MANAGEMENT
  // ----------------------------------------------------------------
  const uniqueId = Date.now();
  const testStudentEmail = `qa.student.${uniqueId}@campus.edu`;
  const testPassword = 'Password123!';

  // Functional Test 1: User Registration
  try {
    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'QA Test Student',
        email: testStudentEmail,
        password: testPassword,
        role: 'Student',
        studentId: 'ST-998877',
        department: 'Computer Science',
      },
    });

    const passed = regRes.status === 201 && regRes.data.success && regRes.data.data.token;
    if (passed) {
      studentToken = regRes.data.data.token;
      studentUser = regRes.data.data;
    }
    recordTest('functional', 'User Registration with valid credentials', passed, {
      status: regRes.status,
      response: regRes.data,
      error: passed ? null : (regRes.data?.message || 'Expected 201 with auth token'),
    });
  } catch (err) {
    recordTest('functional', 'User Registration with valid credentials', false, { error: err.message });
  }

  // Functional Test 2: User Login
  try {
    const loginRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: testStudentEmail,
        password: testPassword,
      },
    });

    const passed = loginRes.status === 200 && loginRes.data.success && loginRes.data.data.token;
    if (passed && !studentToken) {
      studentToken = loginRes.data.data.token;
    }
    recordTest('functional', 'User Login with valid credentials', passed, {
      status: loginRes.status,
      response: loginRes.data,
      error: passed ? null : (loginRes.data?.message || 'Expected 200 with JWT token'),
    });
  } catch (err) {
    recordTest('functional', 'User Login with valid credentials', false, { error: err.message });
  }

  // Functional Test 3: Get User Profile (Protected)
  try {
    const profileRes = await makeRequest('/api/auth/profile', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const passed = profileRes.status === 200 && profileRes.data.success && profileRes.data.data.email === testStudentEmail;
    recordTest('functional', 'Get Current User Profile (/api/auth/profile)', passed, {
      status: profileRes.status,
      error: passed ? null : 'Failed to retrieve authenticated user profile',
    });
  } catch (err) {
    recordTest('functional', 'Get Current User Profile (/api/auth/profile)', false, { error: err.message });
  }

  // Functional Test 4: Update User Profile
  try {
    const updateProfileRes = await makeRequest('/api/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        phone: '+1 (555) 777-8899',
        department: 'Software Engineering',
      },
    });
    const passed = updateProfileRes.status === 200 && updateProfileRes.data.data.department === 'Software Engineering';
    recordTest('functional', 'Update User Profile Details', passed, {
      status: updateProfileRes.status,
      error: passed ? null : 'Profile update not persisted',
    });
  } catch (err) {
    recordTest('functional', 'Update User Profile Details', false, { error: err.message });
  }

  // Login as Seeded Admin for Admin testing
  try {
    const adminLoginRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'security.lostfound@campus.edu',
        password: 'password123',
      },
    });
    if (adminLoginRes.status === 200 && adminLoginRes.data.data?.token) {
      adminToken = adminLoginRes.data.data.token;
    }
  } catch (e) {}

  // ----------------------------------------------------------------
  // 3. FUNCTIONAL TESTING: LOST & FOUND REPORTS
  // ----------------------------------------------------------------
  // Functional Test 5: Report a Lost Item
  try {
    const lostRes = await makeRequest('/api/lost-items', {
      method: 'POST',
      headers: studentToken ? { Authorization: `Bearer ${studentToken}` } : {},
      body: {
        title: 'MacBook Pro 16-inch Space Grey',
        category: 'Electronics',
        location: 'Library 3rd Floor Study Carrel #12',
        date: '2026-11-01',
        time: '15:30',
        reward: '$100',
        description: 'M2 Pro Space Grey MacBook in black sleeve. Has GitHub sticker on lid.',
        securityQuestion: 'What is the sticker on the back?',
        contactPreference: 'inapp',
        tags: 'macbook, laptop, apple, computer',
      },
    });

    const passed = lostRes.status === 201 && lostRes.data.success && lostRes.data.data._id;
    if (passed) {
      testLostItemId = lostRes.data.data._id;
    }
    recordTest('functional', 'Report a Lost Item (POST /api/lost-items)', passed, {
      status: lostRes.status,
      response: lostRes.data,
      error: passed ? null : (lostRes.data?.message || 'Failed to create lost item'),
    });
  } catch (err) {
    recordTest('functional', 'Report a Lost Item (POST /api/lost-items)', false, { error: err.message });
  }

  // Functional Test 6: Report a Found Item
  try {
    const foundRes = await makeRequest('/api/found-items', {
      method: 'POST',
      headers: studentToken ? { Authorization: `Bearer ${studentToken}` } : {},
      body: {
        title: 'Blue Leather Keychain with Dorm Keys',
        category: 'Keys',
        location: 'Campus Dining Hall near Table 14',
        date: '2026-11-01',
        time: '13:00',
        description: 'Ring with 3 brass keys and a blue leather fob marked "Room 304". Handed to cafeteria manager.',
        securityQuestion: 'What number is marked on the fob?',
        contactPreference: 'inapp',
        tags: 'keys, keychain, blue, dorm',
      },
    });

    const passed = foundRes.status === 201 && foundRes.data.success && foundRes.data.data._id;
    if (passed) {
      testFoundItemId = foundRes.data.data._id;
    }
    recordTest('functional', 'Report a Found Item (POST /api/found-items)', passed, {
      status: foundRes.status,
      response: foundRes.data,
      error: passed ? null : (foundRes.data?.message || 'Failed to create found item'),
    });
  } catch (err) {
    recordTest('functional', 'Report a Found Item (POST /api/found-items)', false, { error: err.message });
  }

  // Functional Test 7: Upload Item Image with Report (Multipart Form-Data)
  try {
    const dummyImageBuffer = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;');
    const fileRes = await makeMultipartRequest(
      '/api/found-items',
      {
        title: 'Silver Water Bottle with Gym Logo',
        category: 'Other',
        location: 'Gymnasium Locker Room',
        date: '2026-11-02',
        time: '10:00',
        description: 'Hydro Flask 32oz bottle with scratches on the bottom.',
        securityQuestion: 'What color is the inner cap seal?',
      },
      {
        fieldname: 'image',
        filename: 'water_bottle.gif',
        mimetype: 'image/gif',
        content: dummyImageBuffer,
      },
      studentToken
    );

    const passed = fileRes.status === 201 && fileRes.data.success && fileRes.data.data.image && fileRes.data.data.image.includes('/uploads/');
    recordTest('functional', 'Upload Item Image via Multipart Form-Data', passed, {
      status: fileRes.status,
      imagePath: fileRes.data?.data?.image,
      error: passed ? null : 'Image upload failed or image path not saved',
    });
  } catch (err) {
    recordTest('functional', 'Upload Item Image via Multipart Form-Data', false, { error: err.message });
  }

  // Functional Test 8: Get Item Details by ID
  try {
    const detailRes = await makeRequest(`/api/lost-items/${testLostItemId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const passed = detailRes.status === 200 && detailRes.data.success && detailRes.data.data._id === testLostItemId;
    recordTest('functional', 'View Item Details by ID (GET /api/lost-items/:id)', passed, {
      status: detailRes.status,
      error: passed ? null : 'Failed to retrieve item by ID',
    });
  } catch (err) {
    recordTest('functional', 'View Item Details by ID (GET /api/lost-items/:id)', false, { error: err.message });
  }

  // Functional Test 9: Search and Filter Items
  try {
    const searchRes = await makeRequest('/api/search?q=MacBook&type=all', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const passed = searchRes.status === 200 && searchRes.data.success && Array.isArray(searchRes.data.data);
    const itemFound = searchRes.data.data.some((i) => i.title.includes('MacBook'));
    recordTest('functional', 'Search items by query keyword (/api/search?q=...)', passed && itemFound, {
      status: searchRes.status,
      totalCount: searchRes.data.totalCount,
      itemFound,
      error: (passed && itemFound) ? null : 'Search query did not return expected matching items',
    });
  } catch (err) {
    recordTest('functional', 'Search items by query keyword (/api/search?q=...)', false, { error: err.message });
  }

  // Functional Test 10: Category and Type Filter
  try {
    const filterRes = await makeRequest('/api/search?category=Electronics&type=lost', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const passed = filterRes.status === 200 && filterRes.data.success && filterRes.data.data.every((i) => i.type === 'lost' && i.category === 'Electronics');
    recordTest('functional', 'Filter items by Category and Type (/api/search?category=...&type=...)', passed, {
      status: filterRes.status,
      error: passed ? null : 'Category/type filter returned non-matching items',
    });
  } catch (err) {
    recordTest('functional', 'Filter items by Category and Type (/api/search?category=...&type=...)', false, { error: err.message });
  }

  // Functional Test 11: Interactive Map Endpoints
  try {
    const mapRes = await makeRequest('/api/search/map?lat=40.7295&lng=-73.9965&radius=1000&type=all', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const passed = mapRes.status === 200 && mapRes.data.success && Array.isArray(mapRes.data.data);
    recordTest('functional', 'Map Geo-spatial query endpoint (/api/search/map)', passed, {
      status: mapRes.status,
      count: mapRes.data?.data?.length,
      error: passed ? null : 'Failed to retrieve map items',
    });
  } catch (err) {
    recordTest('functional', 'Map Geo-spatial query endpoint (/api/search/map)', false, { error: err.message });
  }

  // Functional Test 12: Submit Claim Request
  try {
    const claimRes = await makeRequest('/api/claims', {
      method: 'POST',
      headers: studentToken ? { Authorization: `Bearer ${studentToken}` } : {},
      body: {
        itemId: testFoundItemId,
        itemModel: 'FoundItem',
        claimantName: 'John Doe Claimant',
        claimantEmail: 'john.claimant@campus.edu',
        claimantPhone: '+1 (555) 432-1098',
        proofDetails: 'The keychain has Room 304 marked on it and 3 brass keys for the north wing dorms.',
      },
    });

    const passed = claimRes.status === 201 && claimRes.data.success && claimRes.data.data._id;
    if (passed) {
      testClaimId = claimRes.data.data._id;
    }
    recordTest('functional', 'Submit Ownership Claim Request (POST /api/claims)', passed, {
      status: claimRes.status,
      claimId: testClaimId,
      error: passed ? null : (claimRes.data?.message || 'Failed to submit ownership claim'),
    });
  } catch (err) {
    recordTest('functional', 'Submit Ownership Claim Request (POST /api/claims)', false, { error: err.message });
  }

  // Functional Test 13: Chat - Start Conversation and Send Message
  try {
    const startConvRes = await makeRequest('/api/chat/conversations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        itemId: testFoundItemId,
        itemModel: 'FoundItem',
      },
    });

    const convPassed = startConvRes.status === 200 && startConvRes.data.success && startConvRes.data.data._id;
    if (convPassed) {
      testConvId = startConvRes.data.data._id;
    }

    let msgPassed = false;
    if (testConvId) {
      const msgRes = await makeRequest(`/api/chat/conversations/${testConvId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: {
          text: 'Hello, I think this item belongs to me! Where can we meet on campus?',
        },
      });
      msgPassed = (msgRes.status === 200 || msgRes.status === 201) && msgRes.data.success && msgRes.data.data.text;
    }

    recordTest('functional', 'Chat: Start Conversation & Send Real-time Message', convPassed && msgPassed, {
      convStatus: startConvRes.status,
      convId: testConvId,
      msgPassed,
      error: (convPassed && msgPassed) ? null : 'Failed to establish conversation or send message',
    });
  } catch (err) {
    recordTest('functional', 'Chat: Start Conversation & Send Real-time Message', false, { error: err.message });
  }

  // Functional Test 14: User's Own Reports (/api/lost-items/my-reports)
  try {
    const myReportsRes = await makeRequest('/api/lost-items/my-reports', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const passed = myReportsRes.status === 200 && myReportsRes.data.success && Array.isArray(myReportsRes.data.data);
    recordTest('functional', 'User My Reports Endpoint (/api/lost-items/my-reports)', passed, {
      status: myReportsRes.status,
      count: myReportsRes.data?.count,
      error: passed ? null : 'Failed to retrieve user reports',
    });
  } catch (err) {
    recordTest('functional', 'User My Reports Endpoint (/api/lost-items/my-reports)', false, { error: err.message });
  }

  // Functional Test 15: Admin Dashboard Stats (Admin Access)
  try {
    const adminStatsRes = await makeRequest('/api/admin/stats', {
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
    });
    const passed = adminStatsRes.status === 200 && adminStatsRes.data.success && adminStatsRes.data.data.totalLost !== undefined;
    recordTest('functional', 'Admin Dashboard Analytics (/api/admin/stats)', passed, {
      status: adminStatsRes.status,
      data: adminStatsRes.data?.data,
      error: passed ? null : 'Admin stats endpoint failed or unauthorized',
    });
  } catch (err) {
    recordTest('functional', 'Admin Dashboard Analytics (/api/admin/stats)', false, { error: err.message });
  }

  // ----------------------------------------------------------------
  // 4. SECURITY AUDITING & VULNERABILITY TESTING
  // ----------------------------------------------------------------
  console.log('\n--- Commencing Security & Vulnerability Audits ---');

  // Security Test 1: NoSQL Injection via Object Injection on Login
  try {
    const nosqlRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: { $gt: '' },
        password: { $gt: '' },
      },
    });

    // An injection bypass would return 200 or leak user record; a secure API returns 400 or 401 or handles cleanly without bypass
    const bypassed = nosqlRes.status === 200 && nosqlRes.data.success && nosqlRes.data.data?.token;
    recordTest('security', 'NoSQL Injection Authentication Bypass Defense', !bypassed, {
      status: nosqlRes.status,
      response: nosqlRes.data,
      error: bypassed ? 'CRITICAL: NoSQL Injection bypassed authentication!' : null,
      notes: bypassed ? 'Query operators allowed authentication without valid credentials' : 'Rejected cleanly with status ' + nosqlRes.status,
    });
  } catch (err) {
    recordTest('security', 'NoSQL Injection Authentication Bypass Defense', true, { notes: 'Threw handled error: ' + err.message });
  }

  // Security Test 2: Privilege Escalation on User Registration (Assigning Role: Admin)
  try {
    const privEscEmail = `privesc.${Date.now()}@campus.edu`;
    const privEscRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Hacker Privilege Esc',
        email: privEscEmail,
        password: 'Password123!',
        role: 'Admin', // Attacker attempts to become admin directly
      },
    });

    const isEscalated = privEscRes.status === 201 && privEscRes.data.data?.role === 'Admin';
    recordTest('security', 'Privilege Escalation Defense: Public Registration of Admin Role', !isEscalated, {
      status: privEscRes.status,
      assignedRole: privEscRes.data?.data?.role,
      error: isEscalated ? 'HIGH VULNERABILITY: Public registration endpoint allows arbitrary role assignment to "Admin"' : null,
      expected: 'Endpoint should force role to "Student" or reject elevated roles',
      actual: `Created user with role: ${privEscRes.data?.data?.role}`,
    });
  } catch (err) {
    recordTest('security', 'Privilege Escalation Defense: Public Registration of Admin Role', false, { error: err.message });
  }

  // Security Test 3: Unauthorized Access & Privilege Enforcement (Student accessing Admin endpoints)
  try {
    const studentAdminRes = await makeRequest('/api/admin/stats', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    const passed = studentAdminRes.status === 403;
    recordTest('security', 'Role-Based Access Control: Student Blocked from Admin Endpoint (/api/admin/stats)', passed, {
      status: studentAdminRes.status,
      expected: 403,
      actual: studentAdminRes.status,
      error: passed ? null : `Expected HTTP 403 Forbidden, but received HTTP ${studentAdminRes.status}`,
    });
  } catch (err) {
    recordTest('security', 'Role-Based Access Control: Student Blocked from Admin Endpoint', false, { error: err.message });
  }

  // Security Test 4: Access Protected Endpoint Without Token
  try {
    const noTokenRes = await makeRequest('/api/auth/profile');
    const passed = noTokenRes.status === 401;
    recordTest('security', 'Unauthorized Access Defense: No Token Provided (/api/auth/profile)', passed, {
      status: noTokenRes.status,
      expected: 401,
      actual: noTokenRes.status,
      error: passed ? null : `Expected HTTP 401 Unauthorized, received ${noTokenRes.status}`,
    });
  } catch (err) {
    recordTest('security', 'Unauthorized Access Defense: No Token Provided', false, { error: err.message });
  }

  // Security Test 5: Access Protected Endpoint With Tampered / Invalid JWT
  try {
    const badTokenRes = await makeRequest('/api/auth/profile', {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature' },
    });
    const passed = badTokenRes.status === 401;
    recordTest('security', 'JWT Signature Verification: Tampered Token Rejected', passed, {
      status: badTokenRes.status,
      expected: 401,
      actual: badTokenRes.status,
      error: passed ? null : `Expected 401, received ${badTokenRes.status}`,
    });
  } catch (err) {
    recordTest('security', 'JWT Signature Verification: Tampered Token Rejected', false, { error: err.message });
  }

  // Security Test 6: Insecure Direct Object Reference (IDOR / BOLA) - User B modifying User A's report
  try {
    // Create User B
    const userBRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'User B Attacker',
        email: `userb.${Date.now()}@campus.edu`,
        password: 'Password123!',
      },
    });
    const userBToken = userBRes.data?.data?.token;

    // User B tries to update User A's lost item
    const idorRes = await makeRequest(`/api/lost-items/${testLostItemId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${userBToken}` },
      body: {
        title: 'Hacked Title By Attacker B',
      },
    });

    // If status is 200 and title was updated, IDOR exists!
    const idorVulnerable = idorRes.status === 200 && idorRes.data?.data?.title === 'Hacked Title By Attacker B';
    recordTest('security', 'IDOR / BOLA Defense: Preventing User B from Modifying User A\'s Report', !idorVulnerable, {
      status: idorRes.status,
      updatedTitle: idorRes.data?.data?.title,
      error: idorVulnerable ? 'HIGH VULNERABILITY: Insecure Direct Object Reference (IDOR). Any authenticated user can modify other users\' reports without ownership checks!' : null,
      expected: 'HTTP 403 Forbidden',
      actual: `HTTP ${idorRes.status}`,
    });
  } catch (err) {
    recordTest('security', 'IDOR / BOLA Defense: Modifying Other User Report', false, { error: err.message });
  }

  // Security Test 7: Stored XSS Payload in Item Report
  try {
    const xssPayload = '<script>alert("XSS")</script><img src=x onerror=alert(document.cookie)>';
    const xssRes = await makeRequest('/api/lost-items', {
      method: 'POST',
      headers: studentToken ? { Authorization: `Bearer ${studentToken}` } : {},
      body: {
        title: `Wallet ${xssPayload}`,
        category: 'Wallets & Cards',
        location: 'Library',
        description: `Description containing ${xssPayload}`,
      },
    });

    const isStored = xssRes.status === 201 && xssRes.data.data.title.includes('<script>');
    recordTest('security', 'Stored XSS Sanitization in Item Submission', !isStored, {
      status: xssRes.status,
      storedTitle: xssRes.data?.data?.title,
      error: isStored ? 'MEDIUM VULNERABILITY: Raw unescaped HTML/script tags are accepted and stored directly in database without server-side sanitization.' : null,
      notes: isStored ? 'Relying exclusively on frontend DOM escaping or CSP is defense-in-depth weakness; server should sanitize HTML tags.' : 'Sanitized cleanly',
    });
  } catch (err) {
    recordTest('security', 'Stored XSS Sanitization in Item Submission', false, { error: err.message });
  }

  // Security Test 8: File Upload Vulnerability - Executable / PHP File Upload
  try {
    const maliciousBuffer = Buffer.from('<?php echo "pwned"; ?>');
    const uploadRes = await makeMultipartRequest(
      '/api/found-items',
      {
        title: 'Malicious Upload Test',
        category: 'Other',
        location: 'Lab',
        description: 'Testing dangerous file extension rejection',
      },
      {
        fieldname: 'image',
        filename: 'shell.php',
        mimetype: 'application/x-php',
        content: maliciousBuffer,
      },
      studentToken
    );

    // Should be rejected by uploadService fileFilter (returns 500 or 400 with error message)
    const wasRejected = uploadRes.status !== 201 && (!uploadRes.data?.success);
    recordTest('security', 'File Upload Defense: Malicious Extensions (.php) Rejected', wasRejected, {
      status: uploadRes.status,
      response: uploadRes.data,
      error: wasRejected ? null : 'CRITICAL: Non-image dangerous file was accepted!',
    });
  } catch (err) {
    recordTest('security', 'File Upload Defense: Malicious Extensions (.php) Rejected', true, { notes: 'Blocked: ' + err.message });
  }

  // Security Test 9: Password Hash Exposure Check
  try {
    const profileRes = await makeRequest('/api/auth/profile', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    const passwordExposed = profileRes.data?.data?.password !== undefined;
    recordTest('security', 'Sensitive Information Exposure: Password Hash Excluded from Responses', !passwordExposed, {
      status: profileRes.status,
      passwordExposed,
      error: passwordExposed ? 'CRITICAL: User password hash is exposed in profile API response!' : null,
    });
  } catch (err) {
    recordTest('security', 'Sensitive Information Exposure: Password Hash Excluded', false, { error: err.message });
  }

  // Security Test 10: Security Headers (Helmet CSP, HSTS, X-Content-Type-Options)
  try {
    const headerRes = await makeRequest('/api/health');
    const headers = headerRes.headers;
    const hasCsp = !!headers['content-security-policy'];
    const hasXFrame = !!headers['x-frame-options'];
    const hasContentType = !!headers['x-content-type-options'];

    const passed = hasCsp && (hasXFrame || headers['content-security-policy'].includes('frame-ancestors')) && hasContentType;
    recordTest('security', 'HTTP Security Headers Verification (CSP, X-Frame-Options, X-Content-Type-Options)', passed, {
      hasCsp,
      hasXFrame,
      hasContentType,
      error: passed ? null : 'Missing recommended security headers',
    });
  } catch (err) {
    recordTest('security', 'HTTP Security Headers Verification', false, { error: err.message });
  }

  // ----------------------------------------------------------------
  // 5. EDGE CASE TESTING
  // ----------------------------------------------------------------
  console.log('\n--- Commencing Edge Case Testing ---');

  // Edge Case 1: Empty Form Submission on Registration
  try {
    const emptyRegRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {},
    });
    const passed = emptyRegRes.status === 400 && !emptyRegRes.data.success;
    recordTest('edgeCases', 'Empty Form Submission on Registration (POST /api/auth/register)', passed, {
      status: emptyRegRes.status,
      response: emptyRegRes.data,
      expected: 400,
      actual: emptyRegRes.status,
      error: passed ? null : `Expected 400 Bad Request, got ${emptyRegRes.status}`,
    });
  } catch (err) {
    recordTest('edgeCases', 'Empty Form Submission on Registration', false, { error: err.message });
  }

  // Edge Case 2: Invalid Email Address
  try {
    const invalidEmailRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Invalid Email User',
        email: 'invalid-email-address-without-at-sign',
        password: 'Password123!',
      },
    });
    // Schema validator regex should trigger 400 or 500 error
    const rejected = invalidEmailRes.status >= 400 && !invalidEmailRes.data.success;
    const properStatus = invalidEmailRes.status === 400;
    recordTest('edgeCases', 'Invalid Email Format Handling', rejected, {
      status: invalidEmailRes.status,
      response: invalidEmailRes.data,
      error: properStatus ? null : (rejected ? 'Notice: Returns status ' + invalidEmailRes.status + ' instead of 400' : 'Accepted invalid email format!'),
    });
  } catch (err) {
    recordTest('edgeCases', 'Invalid Email Format Handling', false, { error: err.message });
  }

  // Edge Case 3: Duplicate Registration (Same Email)
  try {
    const dupRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate Alex',
        email: testStudentEmail, // already registered in test 1
        password: 'Password123!',
      },
    });
    const passed = dupRes.status === 400 && dupRes.data.message.toLowerCase().includes('already registered');
    recordTest('edgeCases', 'Duplicate User Registration (Conflict Handling)', passed, {
      status: dupRes.status,
      message: dupRes.data?.message,
      error: passed ? null : `Expected 400 with duplicate message, got ${dupRes.status}`,
    });
  } catch (err) {
    recordTest('edgeCases', 'Duplicate User Registration', false, { error: err.message });
  }

  // Edge Case 4: Weak Password (< 6 chars)
  try {
    const weakPwdRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Weak Password User',
        email: `weak.${Date.now()}@campus.edu`,
        password: '123', // 3 chars
      },
    });
    const rejected = weakPwdRes.status >= 400 && !weakPwdRes.data.success;
    recordTest('edgeCases', 'Weak Password Rejection (< 6 chars)', rejected, {
      status: weakPwdRes.status,
      response: weakPwdRes.data,
      error: rejected ? null : 'Failed to reject weak 3-character password',
    });
  } catch (err) {
    recordTest('edgeCases', 'Weak Password Rejection (< 6 chars)', false, { error: err.message });
  }

  // Edge Case 5: Very Long Text Inputs (5,000 characters description)
  try {
    const longString = 'A'.repeat(5000);
    const longRes = await makeRequest('/api/lost-items', {
      method: 'POST',
      headers: studentToken ? { Authorization: `Bearer ${studentToken}` } : {},
      body: {
        title: 'Item with 5000-char description',
        category: 'Other',
        location: 'Engineering Hall',
        description: longString,
      },
    });

    const handled = longRes.status === 201 || (longRes.status === 400 && !longRes.data.success);
    recordTest('edgeCases', 'Very Long Text Input (5,000 chars payload)', handled, {
      status: longRes.status,
      error: handled ? null : 'Crashed or threw unhandled error on long text input',
    });
  } catch (err) {
    recordTest('edgeCases', 'Very Long Text Input', false, { error: err.message });
  }

  // Edge Case 6: Special Characters, Emojis, and Multilingual Unicode
  try {
    const unicodeTitle = '🎧 Lost AirPods Pro in Tokyo 🗼 1234 ¥ 日本語 / தமிழ் / العربية';
    const unicodeRes = await makeRequest('/api/lost-items', {
      method: 'POST',
      headers: studentToken ? { Authorization: `Bearer ${studentToken}` } : {},
      body: {
        title: unicodeTitle,
        category: 'Electronics',
        location: 'Global Center',
        description: 'Contains emojis 🎉🔥, currency symbols ¥€$, and CJK characters.',
      },
    });

    const passed = unicodeRes.status === 201 && unicodeRes.data.data.title === unicodeTitle;
    recordTest('edgeCases', 'Special Characters, Emojis & Multilingual Unicode Support', passed, {
      status: unicodeRes.status,
      savedTitle: unicodeRes.data?.data?.title,
      error: passed ? null : 'Failed to save or corrupted unicode text/emojis',
    });
  } catch (err) {
    recordTest('edgeCases', 'Special Characters, Emojis & Multilingual Unicode Support', false, { error: err.message });
  }

  // Security Test 11: Unauthenticated Access to Lost/Found Reports Blocked (401)
  try {
    const unauthLostRes = await makeRequest('/api/lost-items');
    const unauthFoundRes = await makeRequest('/api/found-items');
    const passed = unauthLostRes.status === 401 && unauthFoundRes.status === 401;
    recordTest('security', 'Auth Gate: Lost & Found Reports Blocked Before Login (401)', passed, {
      lostStatus: unauthLostRes.status,
      foundStatus: unauthFoundRes.status,
      error: passed ? null : 'Lost or found reports leaked before authentication!',
    });
  } catch (err) {
    recordTest('security', 'Auth Gate: Lost & Found Reports Blocked Before Login (401)', false, { error: err.message });
  }

  // Edge Case 7: Non-existent Valid ObjectId (404 expected)
  try {
    const nonExistentId = '507f1f77bcf86cd799439011';
    const notFoundRes = await makeRequest(`/api/lost-items/${nonExistentId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const passed = notFoundRes.status === 404 && !notFoundRes.data.success;
    recordTest('edgeCases', 'Non-existent Item ID (GET /api/lost-items/507f...)', passed, {
      status: notFoundRes.status,
      expected: 404,
      actual: notFoundRes.status,
      error: passed ? null : `Expected 404 Not Found, received ${notFoundRes.status}`,
    });
  } catch (err) {
    recordTest('edgeCases', 'Non-existent Item ID', false, { error: err.message });
  }

  // Edge Case 8: Malformed / Invalid ObjectId ('abc-123')
  try {
    const malformedIdRes = await makeRequest('/api/lost-items/invalid-id-xyz', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    // If CastError is unhandled, it may return 500; a well-handled API returns 400 or 404
    const handledGracefully = malformedIdRes.status === 400 || malformedIdRes.status === 404;
    recordTest('edgeCases', 'Malformed ObjectId Handling (CastError handling)', handledGracefully, {
      status: malformedIdRes.status,
      expected: '400 or 404',
      actual: malformedIdRes.status,
      error: handledGracefully ? null : `MEDIUM BUG: Malformed ObjectId returned HTTP ${malformedIdRes.status} (Internal Server Error) due to unhandled Mongoose CastError`,
    });
  } catch (err) {
    recordTest('edgeCases', 'Malformed ObjectId Handling', false, { error: err.message });
  }

  // Edge Case 9: Unescaped Regex Characters in Search Query ('[', '(', '*', '+')
  try {
    const regexRes = await makeRequest('/api/search?q=[', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    // If unescaped, MongoDB throws MongoServerError: Regular expression is invalid -> returns 500
    const handledGracefully = regexRes.status === 200 || regexRes.status === 400;
    recordTest('edgeCases', 'Search Query Regex Injection / Unescaped Metacharacters', handledGracefully, {
      status: regexRes.status,
      expected: '200 or 400',
      actual: regexRes.status,
      error: handledGracefully ? null : `MEDIUM BUG: Search query with unescaped regex bracket '[' caused HTTP ${regexRes.status} crash!`,
    });
  } catch (err) {
    recordTest('edgeCases', 'Search Query Regex Injection', false, { error: err.message });
  }

  // Edge Case 10: Oversized File Upload (> 5MB)
  try {
    // Generate a 6MB buffer
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');
    const largeUploadRes = await makeMultipartRequest(
      '/api/found-items',
      {
        title: 'Large File Test',
        category: 'Other',
        location: 'Campus',
        description: 'Testing 6MB upload rejection',
      },
      {
        fieldname: 'image',
        filename: 'huge_image.png',
        mimetype: 'image/png',
        content: largeBuffer,
      },
      studentToken
    );

    const rejected = largeUploadRes.status !== 201;
    recordTest('edgeCases', 'Large File Upload (> 5MB limit enforcement)', rejected, {
      status: largeUploadRes.status,
      error: rejected ? null : 'CRITICAL: File larger than 5MB was accepted!',
    });
  } catch (err) {
    recordTest('edgeCases', 'Large File Upload', true, { notes: 'Rejected: ' + err.message });
  }

  // ----------------------------------------------------------------
  // 6. PERFORMANCE TESTING
  // ----------------------------------------------------------------
  console.log('\n--- Commencing Performance Profiling & Concurrency ---');

  // Performance Test 1: Health check latency (< 100ms target)
  try {
    const p1 = await makeRequest('/api/health');
    const passed = p1.duration < 100;
    recordTest('performance', 'Health Check Endpoint Latency (< 100ms)', passed, {
      duration: `${p1.duration}ms`,
      error: passed ? null : `Latency ${p1.duration}ms exceeded 100ms target`,
    });
  } catch (err) {
    recordTest('performance', 'Health Check Endpoint Latency', false, { error: err.message });
  }

  // Performance Test 2: Search API latency (< 250ms target)
  try {
    const p2 = await makeRequest('/api/search?q=phone&category=all', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const passed = p2.duration < 250;
    recordTest('performance', 'Search API Latency (< 250ms)', passed, {
      duration: `${p2.duration}ms`,
      error: passed ? null : `Latency ${p2.duration}ms exceeded 250ms target`,
    });
  } catch (err) {
    recordTest('performance', 'Search API Latency', false, { error: err.message });
  }

  // Performance Test 3: Concurrent Request Burst (20 simultaneous requests)
  try {
    const burstStart = Date.now();
    const burstPromises = Array.from({ length: 20 }, (_, i) =>
      makeRequest('/api/lost-items', {
        headers: { Authorization: `Bearer ${studentToken}` },
      })
    );
    const burstResults = await Promise.all(burstPromises);
    const totalBurstDuration = Date.now() - burstStart;
    const allSuccessful = burstResults.every((r) => r.status === 200);
    const avgDuration = Math.round(burstResults.reduce((acc, r) => acc + r.duration, 0) / burstResults.length);

    recordTest('performance', 'Concurrent Request Burst (20 parallel requests)', allSuccessful && avgDuration < 500, {
      totalDuration: `${totalBurstDuration}ms`,
      avgDuration: `${avgDuration}ms`,
      allSuccessful,
      error: (allSuccessful && avgDuration < 500) ? null : `Burst test failed or average latency ${avgDuration}ms too high`,
    });
  } catch (err) {
    recordTest('performance', 'Concurrent Request Burst', false, { error: err.message });
  }

  // ----------------------------------------------------------------
  // SUMMARY OUTPUT
  // ----------------------------------------------------------------
  console.log('\n====================================================');
  console.log('🏁 QA EXECUTION COMPLETE - TEST SUMMARY');
  console.log('====================================================');
  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;

  for (const [catName, cat] of Object.entries(testResults.categories)) {
    grandTotal += cat.total;
    grandPassed += cat.passed;
    grandFailed += cat.failed;
    const passRate = cat.total > 0 ? ((cat.passed / cat.total) * 100).toFixed(1) : '100.0';
    console.log(`• ${catName.toUpperCase().padEnd(12)}: ${cat.passed}/${cat.total} Passed (${passRate}%) - Failed: ${cat.failed}`);
  }

  const overallRate = ((grandPassed / grandTotal) * 100).toFixed(1);
  console.log('----------------------------------------------------');
  console.log(`TOTAL TESTS   : ${grandTotal}`);
  console.log(`TOTAL PASSED  : ${grandPassed} (${overallRate}%)`);
  console.log(`TOTAL FAILED  : ${grandFailed}`);
  console.log('====================================================\n');

  // Save detailed results to JSON file for report generation
  const reportPath = 'C:\\Users\\Atif Khan\\.gemini\\antigravity\\brain\\c0a620fc-b1d1-4f38-8209-6894ceb81c72\\qa-test-results.json';
  try {
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`Detailed results saved to: ${reportPath}`);
  } catch (err) {
    console.log(`Note: could not save json file: ${err.message}`);
  }
}

runMasterQA().catch(console.error);
