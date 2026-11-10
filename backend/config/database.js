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

  // Verified Atlas cluster fallback if Render env var is missing or misconfigured
  const DEFAULT_ATLAS_URI =
    'mongodb+srv://atifkhan999c_db_user:Atifkhan1234@cluster0.ztmgtbw.mongodb.net/lost_and_found_db?retryWrites=true&w=majority';

  if (!uri && isProduction) {
    console.log('📡 Using verified MongoDB Atlas Cluster URI for cloud production deployment.');
    uri = DEFAULT_ATLAS_URI;
  }

  const mongoUri = uri || 'mongodb://127.0.0.1:27017/lost_and_found_db';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    global.dbConnectionError = null;
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host} (${conn.connection.name})`);
  } catch (error) {
    console.warn(`⚠️  Primary MongoDB Connection Failed (${error.message}).`);
    if (isProduction && mongoUri !== DEFAULT_ATLAS_URI) {
      try {
        console.log('🔄 Retrying with verified MongoDB Atlas Cluster URI...');
        const fallbackConn = await mongoose.connect(DEFAULT_ATLAS_URI, {
          serverSelectionTimeoutMS: 10000,
        });
        global.dbConnectionError = null;
        console.log(`✅ MongoDB Connected Successfully via Fallback: ${fallbackConn.connection.host} (${fallbackConn.connection.name})`);
        return;
      } catch (fallbackErr) {
        global.dbConnectionError = fallbackErr.message;
        console.warn(`⚠️  Fallback Atlas Connection Error: ${fallbackErr.message}`);
      }
    } else {
      global.dbConnectionError = error.message;
    }
    console.warn('💡 Running in Standalone Fallback Mode until MongoDB connection recovers.');
  }
};

module.exports = connectDB;
