const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lost_and_found_db'
    );

    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host} (${conn.connection.name})`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.warn('⚠️  Please configure MONGO_URI in your environment settings (e.g. from free MongoDB Atlas cluster).');
  }
};

module.exports = connectDB;
