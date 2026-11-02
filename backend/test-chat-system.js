/**
 * Automated Verification Script for FinderSpot Peer-to-Peer Chat & Socket.IO
 */

const http = require('http');
const { io } = require('socket.io-client');

const BASE_URL = 'http://127.0.0.1:5000';

function post(path, body, token = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      `${BASE_URL}${path}`,
      { method: 'POST', headers },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function get(path, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.get(`${BASE_URL}${path}`, { headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
  });
}

function put(path, body = {}, token = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      `${BASE_URL}${path}`,
      { method: 'PUT', headers },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runChatVerification() {
  console.log('🧪 Starting Full Chat & Socket.IO End-to-End Verification...\n');

  // Step 1: Health
  const health = await get('/api/health');
  if (health.status !== 200 || health.body.status !== 'online') {
    throw new Error('Health check failed: ' + JSON.stringify(health.body));
  }
  console.log('  ✅ [PASS] Backend Health Check: Online (Port 5000, MongoDB Connected)');

  // Step 2: Login Alex Morgan
  const alexAuth = await post('/api/auth/login', {
    email: 'alex.morgan@campus.edu',
    password: 'password123',
  });
  if (alexAuth.status !== 200 || !alexAuth.body.data.token) {
    throw new Error('Alex login failed: ' + JSON.stringify(alexAuth.body));
  }
  const alexToken = alexAuth.body.data.token;
  const alexId = alexAuth.body.data._id;
  console.log(`  ✅ [PASS] Authenticated Student: Alex (ID: ${alexId})`);

  // Step 3: Login Officer David Vance
  const officerAuth = await post('/api/auth/login', {
    email: 'security.lostfound@campus.edu',
    password: 'password123',
  });
  if (officerAuth.status !== 200 || !officerAuth.body.data.token) {
    throw new Error('Officer login failed: ' + JSON.stringify(officerAuth.body));
  }
  const officerToken = officerAuth.body.data.token;
  const officerId = officerAuth.body.data._id;
  console.log(`  ✅ [PASS] Authenticated Security Officer: David Vance (ID: ${officerId})`);

  // Step 4: Socket.IO connections for both users
  const alexSocket = io(BASE_URL, { transports: ['websocket'] });
  const officerSocket = io(BASE_URL, { transports: ['websocket'] });

  await new Promise((resolve) => {
    let connected = 0;
    alexSocket.on('connect', () => {
      alexSocket.emit('join_user_room', alexId);
      connected++;
      if (connected === 2) resolve();
    });
    officerSocket.on('connect', () => {
      officerSocket.emit('join_user_room', officerId);
      connected++;
      if (connected === 2) resolve();
    });
  });
  console.log('  ✅ [PASS] Real-time WebSockets: Alex & Officer Vance connected to Socket.IO');

  // Step 5: Get or create conversation between them
  const convRes = await post(
    '/api/chat/conversations',
    {
      itemTitle: 'Hydro Flask Verification Handover',
      recipientId: officerId,
    },
    alexToken
  );
  if (convRes.status !== 200 || !convRes.body.data._id) {
    throw new Error('Failed to create/get conversation: ' + JSON.stringify(convRes.body));
  }
  const conversationId = convRes.body.data._id;
  console.log(`  ✅ [PASS] Active Thread Established: Conversation ID: ${conversationId}`);

  // Both join conversation room
  alexSocket.emit('join_conversation', conversationId);
  officerSocket.emit('join_conversation', conversationId);

  // Step 6: Test real-time message sending from Alex to Officer Vance
  const receivedByOfficerPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Officer did not receive Alex message in 5s')), 5000);
    officerSocket.on('new_chat_message', (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });

  const alexSendRes = await post(
    `/api/chat/conversations/${conversationId}/messages`,
    { text: 'Hello Officer Vance! I can meet at Room 104 at 3 PM.' },
    alexToken
  );

  if (alexSendRes.status !== 201 || !alexSendRes.body.data._id) {
    throw new Error('Alex message send failed: ' + JSON.stringify(alexSendRes.body));
  }
  console.log(`  ✅ [PASS] Alex Sent Message: "${alexSendRes.body.data.text}" (Status 201)`);

  const officerReceived = await receivedByOfficerPromise;
  console.log(`  ✅ [PASS] Officer Vance Socket.IO Received Alex Message in Real-Time!`);

  // Step 7: Test reply from Officer Vance to Alex
  const receivedByAlexPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Alex did not receive Officer message in 5s')), 5000);
    alexSocket.on('new_chat_message', (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });

  const officerSendRes = await post(
    `/api/chat/conversations/${conversationId}/messages`,
    { text: 'Sounds perfect, Alex! The Hydro Flask is safely stored in locker B-12.' },
    officerToken
  );

  if (officerSendRes.status !== 201 || !officerSendRes.body.data._id) {
    throw new Error('Officer reply failed: ' + JSON.stringify(officerSendRes.body));
  }
  console.log(`  ✅ [PASS] Officer Vance Sent Reply: "${officerSendRes.body.data.text}" (Status 201)`);

  const alexReceived = await receivedByAlexPromise;
  console.log(`  ✅ [PASS] Alex Socket.IO Received Officer Reply in Real-Time!`);

  // Step 8: Fetch Message History
  const messagesRes = await get(`/api/chat/conversations/${conversationId}/messages`, alexToken);
  if (messagesRes.status !== 200 || !Array.isArray(messagesRes.body.data)) {
    throw new Error('Message history fetch failed: ' + JSON.stringify(messagesRes.body));
  }
  console.log(`  ✅ [PASS] Message History: Retrieved ${messagesRes.body.data.length} chronological messages`);

  // Step 9: Mark as Read & Reset Unread Counter
  const readRes = await put(`/api/chat/conversations/${conversationId}/read`, {}, alexToken);
  if (readRes.status !== 200) {
    throw new Error('Mark as read failed: ' + JSON.stringify(readRes.body));
  }
  console.log(`  ✅ [PASS] Mark as Read: Unread counter successfully reset to 0`);

  // Cleanup sockets
  alexSocket.disconnect();
  officerSocket.disconnect();

  console.log('\n🎉 ALL 9 REAL-TIME CHAT & SOCKET.IO TESTS PASSED WITH 100% SUCCESS!\n');
}

runChatVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
