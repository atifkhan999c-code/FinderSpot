const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 */
const connectDB = async () => {
  let uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.MONGODB_URL ||
    process.env.DATABASE_URL;

  // Auto-detect ANY environment variable matching mongo/mongodb or containing a mongodb connection string
  if (!uri) {
    for (const [key, val] of Object.entries(process.env)) {
      if (typeof val === 'string' && (val.startsWith('mongodb+srv://') || val.startsWith('mongodb://'))) {
        console.log(`📡 Auto-detected MongoDB connection string from environment variable: "${key}"`);
        uri = val;
        break;
      }
    }
  }

  // Also check keys case-insensitively (e.g. "Monogo uri", "mongo uri", "MONGODB")
  if (!uri) {
    for (const [key, val] of Object.entries(process.env)) {
      if (key.toLowerCase().includes('mongo') && typeof val === 'string' && val.trim().length > 0) {
        console.log(`📡 Auto-detected MongoDB key from environment variable: "${key}"`);
        uri = val.trim();
        break;
      }
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // If running in production on Render and no cloud URI is provided, run in Standalone/Demo mode
  if (isProduction && (!uri || uri.includes('127.0.0.1') || uri.includes('localhost'))) {
    console.log('☁️ [FinderSpot] Production Cloud Mode: Running in Demo Mode (Local Storage & Heuristics active).');
    console.log('💡 Tip: Set MONGO_URI in Render dashboard whenever you want to connect a cloud MongoDB database.');
    return;
  }

  try {
    const mongoUri = uri || 'mongodb://127.0.0.1:27017/lost_and_found_db';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host} (${conn.connection.name})`);
  } catch (error) {
    console.warn(`⚠️  MongoDB Connection Notice: ${error.message}`);
    console.warn('💡 The web app is running in Standalone Mode. Connect a cloud MONGO_URI anytime to enable persistent database storage.');
  }
};

module.exports = connectDB;
