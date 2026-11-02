const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { initSocket } = require('./services/socketService');
require('dotenv').config();

// Connect Database
connectDB();

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5000;

function startServer(port) {
  const httpServer = http.createServer(app);

  // Initialize Real-time WebSockets with Socket.IO
  initSocket(httpServer);

  httpServer
    .listen(port, () => {
      console.log(`\n🚀 FinderSpot Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
      console.log(`📡 Frontend Web App: http://localhost:${port}/index.html`);
      console.log(`⚡ Real-time WebSockets: Active on port ${port} (Socket.IO attached)`);
      console.log(`🩺 Health check: http://localhost:${port}/api/health\n`);
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️  Port ${port} is currently in use. Automatically switching to port ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('❌ Server startup error:', err);
      }
    });

  return httpServer;
}

startServer(DEFAULT_PORT);

process.on('unhandledRejection', (err) => {
  console.error(`💥 Unhandled Promise Rejection: ${err.message}`);
});
