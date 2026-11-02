const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO on the active HTTP server
 * @param {import('http').Server} httpServer
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.IO] New client connected: ${socket.id}`);

    // Join private user notification channel
    socket.on('join_user_room', (userId) => {
      if (userId) {
        const room = `user_${userId}`;
        socket.join(room);
        console.log(`👤 [Socket.IO] Socket ${socket.id} joined personal room: ${room}`);
      }
    });

    // Join specific item discussion / real-time updates room
    socket.on('join_item_room', (itemId) => {
      if (itemId) {
        const room = `item_${itemId}`;
        socket.join(room);
        console.log(`📦 [Socket.IO] Socket ${socket.id} joined item room: ${room}`);
      }
    });

    // Join real-time peer-to-peer chat conversation
    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        const room = `conv_${conversationId}`;
        socket.join(room);
        console.log(`💬 [Socket.IO] Socket ${socket.id} joined chat room: ${room}`);
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        const room = `conv_${conversationId}`;
        socket.leave(room);
        console.log(`💬 [Socket.IO] Socket ${socket.id} left chat room: ${room}`);
      }
    });

    // Real-time typing indicators
    socket.on('typing_start', ({ conversationId, userName }) => {
      if (conversationId) {
        socket.to(`conv_${conversationId}`).emit('user_typing', { conversationId, userName });
      }
    });

    socket.on('typing_stop', ({ conversationId, userName }) => {
      if (conversationId) {
        socket.to(`conv_${conversationId}`).emit('user_stop_typing', { conversationId, userName });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Get active Socket.IO server instance
 */
const getIO = () => {
  return io;
};

/**
 * Emit event to a specific authenticated user
 * @param {string} userId
 * @param {string} event
 * @param {object} payload
 */
const notifyUser = (userId, event, payload) => {
  if (io && userId) {
    const room = `user_${userId}`;
    io.to(room).emit(event, payload);
    console.log(`📢 [Socket.IO] Emitted [${event}] to room [${room}]`);
  }
};

/**
 * Broadcast event to all connected clients
 * @param {string} event
 * @param {object} payload
 */
const broadcast = (event, payload) => {
  if (io) {
    io.emit(event, payload);
    console.log(`📢 [Socket.IO] Broadcasted [${event}] across all connected clients`);
  }
};

/**
 * Emit real-time Match Alert to item reporter
 */
const emitMatchAlert = (recipientUserId, matchDetails) => {
  notifyUser(recipientUserId, 'match_alert', {
    type: 'match',
    title: 'Potential Match Found for Your Property!',
    message: matchDetails.message,
    item: matchDetails.item,
    matchedWith: matchDetails.matchedWith,
    link: matchDetails.link || `/item-details.html?id=${matchDetails.item._id}`,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit real-time Claim Alert to item reporter
 */
const emitClaimAlert = (recipientUserId, claimDetails) => {
  notifyUser(recipientUserId, 'claim_alert', {
    type: 'claim',
    title: 'New Ownership Claim Submitted!',
    message: claimDetails.message,
    item: claimDetails.item,
    claimantName: claimDetails.claimantName,
    link: claimDetails.link || '/my-reports.html',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit real-time peer-to-peer chat message
 */
const emitChatMessage = (conversationId, message, recipientUserId) => {
  if (io && conversationId) {
    // 1. Broadcast to the active conversation room
    io.to(`conv_${conversationId}`).emit('new_chat_message', {
      conversationId,
      message,
    });

    // 2. Also notify the recipient's personal room for header badges and floating notification
    if (recipientUserId) {
      notifyUser(recipientUserId, 'new_chat_notification', {
        conversationId,
        message,
        senderName: message.senderName,
        text: message.text,
        timestamp: message.createdAt,
      });
    }
    console.log(`💬 [Socket.IO] Dispatched chat message to conv_${conversationId}`);
  }
};

/**
 * Emit conversation read receipt
 */
const emitConversationRead = (conversationId, readerUserId) => {
  if (io && conversationId) {
    io.to(`conv_${conversationId}`).emit('conversation_read', {
      conversationId,
      readerUserId,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  initSocket,
  getIO,
  notifyUser,
  broadcast,
  emitMatchAlert,
  emitClaimAlert,
  emitChatMessage,
  emitConversationRead,
};
