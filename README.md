# 🔍 FinderSpot — Lost and Found Web Application

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.19-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-brightgreen.svg)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-black.svg)](https://socket.io/)
[![Google Gemini API](https://img.shields.io/badge/Gemini%20AI-Multimodal%20Vision-blue.svg)](https://ai.google.dev/)
[![Leaflet.js](https://img.shields.io/badge/Leaflet-Geo--Radius%20Search-green.svg)](https://leafletjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A modern full-stack web application and campus community platform designed for universities, colleges, and organizations to report, discover, match, and safely recover lost belongings.

---

## ✨ Key Features

- **📱 Responsive UI & Clean Dashboards:** Built with Tailwind CSS and responsive design across desktop, tablet, and mobile.
- **💬 Real-Time Peer-to-Peer Chat (Socket.IO):** Safe, encrypted peer-to-peer discussion threads between Claimants, Finders, and Campus Security with live typing indicators and audio chimes.
- **🤖 Multimodal Visual AI Categorization (Google Gemini API):** Auto-analyzes item photos to suggest titles, categories, brands, primary/secondary colors, distinctive marks, and search tags.
- **🗺️ Interactive Map & Proximity Radius Search (Leaflet & OpenStreetMap):** Interactive campus pin clusters with real-time distance calculations and draggable search radius boundaries (500m to 5km).
- **🛡️ Admin Moderation & Audit Logs:** Role-based access control (Student, Security, Admin) with chronological compliance trails and custody tracking.
- **🔐 Verification Claims & Security Challenges:** Eliminates false claims through confidential security questions and serial/photo proof verification.
- **📧 Automated Email Notifications (Nodemailer / SendGrid):** Dispatches instant alerts when matches or claims are submitted.

---

## 📁 Project Architecture

```text
Lost-and-Found/
├── frontend/                     # Client Presentation Layer
│   ├── index.html                # Main Landing Page & Live Items Directory
│   ├── map.html                  # Interactive Campus Map & Radius Search
│   ├── item-details.html         # Item Inspection, Proof Claims & Chat Trigger
│   ├── report-lost.html          # Lost Belonging Submission with AI Vision
│   ├── report-found.html         # Found Property Form with Custody Tracking
│   ├── browse-items.html         # Filterable Items Directory
│   ├── dashboard.html            # User Metrics & Activity Dashboard
│   ├── admin.html                # Admin Moderation & Audit Log Analytics
│   ├── login.html                # Authentication with 1-Click Demo Fill
│   ├── register.html             # Account Creation Form
│   ├── profile.html              # Profile Management & Trust Badges
│   ├── my-reports.html           # Active Reports Management
│   ├── my-claims.html            # Submitted Claims Tracker
│   ├── notifications.html        # Smart Match & System Notifications
│   ├── contact.html              # Help Desk & Support
│   ├── about.html                # Platform Purpose & Campus Partnership
│   ├── js/
│   │   ├── api.js                # Centralized REST API Client
│   │   ├── chat.js               # Socket.IO Real-Time Chat Engine
│   │   ├── app.js                # Global State & Notification Engine
│   │   └── main.js               # Core Mock Data & Local Storage Fallback
│   └── css/                      # Custom Styling & Responsive Sheets
│
├── backend/                      # Node.js + Express API Server
│   ├── server.js                 # Server Entry Point & WebSocket Attacher
│   ├── app.js                    # Express Application, Middleware & Routes
│   ├── .env.example              # Environment Configuration Template
│   ├── config/
│   │   ├── database.js           # Mongoose MongoDB Connection
│   │   └── seed.js               # Database Seeder (Users, Items, Claims, Logs)
│   ├── controllers/              # REST Request Controllers
│   ├── models/                   # Mongoose Schemas (User, LostItem, FoundItem, Claim, Message, etc.)
│   ├── routes/                   # Express Routers
│   ├── services/
│   │   ├── socketService.js      # Socket.IO Event Handlers & Room Manager
│   │   ├── emailService.js       # Nodemailer Alert Dispatcher
│   │   ├── geminiService.js      # Gemini Multimodal Vision Analyzer
│   │   └── matchingService.js    # Keyword & Category Matcher
│   ├── test-api.js               # Automated 12-Endpoint Backend API Test Suite
│   └── test-chat-system.js       # Automated 9-Step Real-Time Chat & WebSocket Test Suite
│
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local Community Server on `localhost:27017` or MongoDB Atlas URI)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/<your-username>/Lost-and-Found.git
cd Lost-and-Found/backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default local settings:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/lost_and_found_db
JWT_SECRET=super_secret_jwt_key_finderspot_2026_campus_auth
APP_BASE_URL=http://localhost:5000
```

### 3. Seed Sample Database
Populate sample users, items, claims, and chat threads:
```bash
npm run seed
```

### 4. Start the Server
```bash
npm start
```
Visit **`http://localhost:5000/index.html`** in your browser.

---

## 🧪 Automated Testing

Run the automated backend test suites:
```bash
# Verify all 12 REST API endpoints:
node test-api.js

# Verify real-time chat & WebSocket messaging:
node test-chat-system.js
```

---

## 👥 Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Student (Alex)** | `alex.morgan@campus.edu` | `password123` |
| **Campus Security (Officer Vance)** | `security.lostfound@campus.edu` | `password123` |
| **Student (Sarah Jenkins)** | `sarah.j@campus.edu` | `password123` |

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for details.
