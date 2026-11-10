const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Route imports
const authRoutes = require('./routes/authRoutes');
const lostItemRoutes = require('./routes/lostItemRoutes');
const foundItemRoutes = require('./routes/foundItemRoutes');
const searchRoutes = require('./routes/searchRoutes');
const claimRoutes = require('./routes/claimRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Security & Error Middleware imports
const {
  apiLimiter,
  authLimiter,
  submissionLimiter,
  configureHelmet,
} = require('./middleware/securityMiddleware');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// 1. Security Headers (Helmet)
app.use(configureHelmet());

// 2. CORS & Body Parsers
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization against Stored XSS
const { sanitizeObject } = require('./utils/sanitize');
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const originalPassword = req.body.password;
    sanitizeObject(req.body);
    if (originalPassword) req.body.password = originalPassword;
  }
  next();
});

// 3. Static Assets Serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Clean SEO & Direct Authentication/Page Routes (support URLs without .html)
const cleanPages = [
  'login',
  'register',
  'dashboard',
  'map',
  'browse-items',
  'report-lost',
  'report-found',
  'item-details',
  'my-reports',
  'my-claims',
  'notifications',
  'profile',
  'admin',
  'contact',
  'about',
];
cleanPages.forEach((page) => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', `${page}.html`));
  });
});
app.get('/browse', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'browse-items.html'));
});

// 4. Global API Rate Limiter
app.use('/api', apiLimiter);

// 5. API Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Lost and Found Web API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'fallback',
    databaseNotice: global.dbConnectionError || null,
    security: 'Helmet CSP & Rate Limiting Active',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 6. Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/lost-items', lostItemRoutes);
app.use('/api/found-items', foundItemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);

// 7. Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
