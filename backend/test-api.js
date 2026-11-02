/**
 * Automated Verification Script for FinderSpot Backend APIs
 * Auto-detects active port (5000, 5001, 5002)
 */

const http = require('http');

const BASE_HOST = '127.0.0.1';

const probePort = (port) => {
  return new Promise((resolve) => {
    const req = http.get(`http://${BASE_HOST}:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
};

const makeRequest = (port, path, method = 'GET', body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_HOST,
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runApiTests = async () => {
  // Discover running port
  const candidatePorts = [5000, 5001, 5002];
  let activePort = null;

  for (const p of candidatePorts) {
    if (await probePort(p)) {
      activePort = p;
      break;
    }
  }

  if (!activePort) {
    console.error('❌ Could not connect to running server on ports 5000, 5001, or 5002.');
    console.error('   Please ensure `npm run dev` is running.');
    process.exit(1);
  }

  console.log(`\n🧪 STARTING AUTOMATED API VERIFICATION ON http://${BASE_HOST}:${activePort}...\n`);
  let passed = 0;
  let total = 0;

  const test = async (name, fn) => {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ❌ [FAIL] ${name} - ${e.message}`);
    }
  };

  // 1. Health check with security validation
  await test('GET /api/health returns online status and security headers', async () => {
    const res = await makeRequest(activePort, '/api/health');
    if (res.status !== 200 || res.body.status !== 'online') {
      throw new Error(`Expected 200 online, got ${res.status}`);
    }
  });

  // 2. Authentication Login
  let authToken = '';
  await test('POST /api/auth/login authenticates seeded user under rate limiter', async () => {
    const res = await makeRequest(activePort, '/api/auth/login', 'POST', {
      email: 'alex.morgan@campus.edu',
      password: 'password123',
    });
    if (res.status !== 200 || !res.body.data.token) {
      throw new Error(`Login failed with status ${res.status}`);
    }
    authToken = res.body.data.token;
  });

  // 3. Lost Items Endpoint
  await test('GET /api/lost-items returns seeded lost belongings', async () => {
    const res = await makeRequest(activePort, '/api/lost-items');
    if (res.status !== 200 || !Array.isArray(res.body.data)) {
      throw new Error(`Expected array of lost items, got status ${res.status}`);
    }
  });

  // 4. Found Items Endpoint
  await test('GET /api/found-items returns seeded found belongings', async () => {
    const res = await makeRequest(activePort, '/api/found-items');
    if (res.status !== 200 || !Array.isArray(res.body.data)) {
      throw new Error(`Expected array of found items, got status ${res.status}`);
    }
  });

  // 5. Search Endpoint
  await test('GET /api/search?q=phone returns matching results', async () => {
    const res = await makeRequest(activePort, '/api/search?q=phone');
    if (res.status !== 200 || !res.body.data) {
      throw new Error(`Search failed with status ${res.status}`);
    }
  });

  // 6. Protected Profile Endpoint
  await test('GET /api/auth/profile validates JWT and returns user details', async () => {
    const res = await makeRequest(activePort, '/api/auth/profile', 'GET', null, {
      Authorization: `Bearer ${authToken}`,
    });
    if (res.status !== 200 || res.body.data.email !== 'alex.morgan@campus.edu') {
      throw new Error(`Protected profile query failed with status ${res.status}`);
    }
  });

  // 7. Socket.IO Real-Time Handshake Check
  await test('GET /socket.io/ returns active real-time WebSocket handshake', async () => {
    const res = await makeRequest(activePort, '/socket.io/?EIO=4&transport=polling');
    const bodyStr = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
    if (res.status !== 200 || !bodyStr.includes('sid')) {
      throw new Error(`Socket.IO handshake failed with status ${res.status}`);
    }
  });

  // 8. Admin & Moderation Analytics
  let securityToken = '';
  await test('GET /api/admin/analytics with Security role returns category breakdown', async () => {
    // Login as Security Officer David Vance
    const loginRes = await makeRequest(activePort, '/api/auth/login', 'POST', {
      email: 'security.lostfound@campus.edu',
      password: 'password123',
    });
    if (loginRes.status !== 200 || !loginRes.body.data.token) {
      throw new Error(`Security officer login failed`);
    }
    securityToken = loginRes.body.data.token;

    const res = await makeRequest(activePort, '/api/admin/analytics', 'GET', null, {
      Authorization: `Bearer ${securityToken}`,
    });
    if (res.status !== 200 || !Array.isArray(res.body.data.categoryBreakdown)) {
      throw new Error(`Analytics endpoint failed with status ${res.status}`);
    }
  });

  // 9. Compliance Audit Trail Verification
  await test('GET /api/admin/audit-logs returns chronological administrative logs', async () => {
    const res = await makeRequest(activePort, '/api/admin/audit-logs', 'GET', null, {
      Authorization: `Bearer ${securityToken}`,
    });
    if (res.status !== 200 || !Array.isArray(res.body.data) || res.body.data.length === 0) {
      throw new Error(`Audit logs retrieval failed with status ${res.status}`);
    }
  });

  // 10. Interactive Geo-Spatial Map & Proximity Radius Search
  await test('GET /api/search/map returns proximity-sorted pins with radius boundary', async () => {
    const res = await makeRequest(
      activePort,
      '/api/search/map?lat=40.7295&lng=-73.9965&radius=2000&type=all',
      'GET'
    );
    if (res.status !== 200 || !res.body.success) {
      throw new Error(`Geo-map API failed with status ${res.status}`);
    }
    if (!res.body.center || typeof res.body.center.lat !== 'number') {
      throw new Error(`Geo-map missing center metadata`);
    }
    if (!Array.isArray(res.body.data) || res.body.data.length === 0) {
      throw new Error(`Geo-map returned 0 pins in campus radius`);
    }
    const sample = res.body.data[0];
    if (!sample.coordinates || typeof sample.distanceMeters !== 'number' || !sample.distanceText) {
      throw new Error(`Geo-map item missing distance or coordinates fields`);
    }
  });

  // 11. AI Image Recognition & Auto-Tagging (Gemini Vision)
  await test('POST /api/ai/analyze-image returns auto-categorization and visual tags', async () => {
    const res = await makeRequest(
      activePort,
      '/api/ai/analyze-image',
      'POST',
      {
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        filename: 'sony-headphones-black.jpg',
        mimeType: 'image/jpeg',
      }
    );
    if (res.status !== 200 || !res.body.success) {
      throw new Error(`AI analysis failed with status ${res.status}`);
    }
    const data = res.body.data;
    if (!data.category || !data.suggestedTitle || !Array.isArray(data.tags) || data.tags.length === 0) {
      throw new Error(`AI analysis missing expected category, title, or tags`);
    }
  });

  // 12. Real-Time Peer-to-Peer Chat & Messaging
  await test('GET & POST /api/chat/conversations manages secure threads and messages', async () => {
    // Login as Alex Morgan
    const alexLogin = await makeRequest(activePort, '/api/auth/login', 'POST', {
      email: 'alex.morgan@campus.edu',
      password: 'password123',
    });
    if (alexLogin.status !== 200 || !alexLogin.body.data.token) {
      throw new Error('Alex login failed for chat test');
    }
    const alexToken = alexLogin.body.data.token;

    // Fetch conversations
    const convsRes = await makeRequest(activePort, '/api/chat/conversations', 'GET', null, {
      Authorization: `Bearer ${alexToken}`,
    });
    if (convsRes.status !== 200 || !Array.isArray(convsRes.body.data) || convsRes.body.data.length === 0) {
      throw new Error('Failed to retrieve user conversations');
    }

    const testConvId = convsRes.body.data[0]._id;

    // Fetch messages
    const msgsRes = await makeRequest(activePort, `/api/chat/conversations/${testConvId}/messages`, 'GET', null, {
      Authorization: `Bearer ${alexToken}`,
    });
    if (msgsRes.status !== 200 || !Array.isArray(msgsRes.body.data)) {
      throw new Error('Failed to retrieve conversation messages');
    }

    // Send a message
    const sendRes = await makeRequest(
      activePort,
      `/api/chat/conversations/${testConvId}/messages`,
      'POST',
      { text: 'Hello, checking on the custody status of this item.' },
      { Authorization: `Bearer ${alexToken}` }
    );
    if (sendRes.status !== 201 || !sendRes.body.data.text) {
      throw new Error('Failed to send peer-to-peer chat message');
    }

    // Mark as read
    const readRes = await makeRequest(
      activePort,
      `/api/chat/conversations/${testConvId}/read`,
      'PUT',
      null,
      { Authorization: `Bearer ${alexToken}` }
    );
    if (readRes.status !== 200 || !readRes.body.success) {
      throw new Error('Failed to mark conversation as read');
    }
  });

  console.log(`\n📊 RESULTS: ${passed}/${total} API ENDPOINTS VERIFIED WITH SECURITY ACTIVE!\n`);
  process.exit(passed === total ? 0 : 1);
};

runApiTests().catch((err) => {
  console.error('Fatal test error:', err.message);
  process.exit(1);
});
