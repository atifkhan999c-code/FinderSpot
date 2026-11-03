const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Global API Rate Limiter
 * Limits general requests to 150 per 15-minute window per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

/**
 * Strict Rate Limiter for Authentication (Brute-force protection)
 * Limits login & register attempts to 10 per 15-minute window per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 30 : 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  },
});

/**
 * Anti-Spam Rate Limiter for Submitting Reports & Claims
 * Limits report and claim submissions per 15-minute window per IP
 */
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 50 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Submission limit reached. Please wait a few minutes before submitting another report.',
  },
});

/**
 * Helmet Security Headers Configuration
 * Configured with CSP directives that safely allow Tailwind CDN, Google Fonts, and Unsplash images
 */
const configureHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.tailwindcss.com',
          'https://cdnjs.cloudflare.com',
          'https://cdn.socket.io',
          'https://unpkg.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com',
          'https://unpkg.com',
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://images.unsplash.com',
          'https://*.tile.openstreetmap.org',
          'https://tile.openstreetmap.org',
          'https://unpkg.com',
        ],
        connectSrc: ["'self'", 'ws:', 'wss:', 'https://*.tile.openstreetmap.org', 'https://tile.openstreetmap.org'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
};

module.exports = {
  apiLimiter,
  authLimiter,
  submissionLimiter,
  configureHelmet,
};
