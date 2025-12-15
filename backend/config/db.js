const mongoose = require('mongoose');

console.log('🔄 Connection URI:', process.env.MONGODB_URI?.replace(/:[^:@]*@/, ':****@'));

const connectDB = async () => {
  try {
    // Check if MongoDB URI is provided
    if (!process.env.MONGODB_URI) {
      console.error('❌ MongoDB URI is not configured');
      console.log('📝 Please add MONGODB_URI to your .env file');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to DB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    
    // Check specific error types
    if (error.name === 'MongoServerSelectionError') {
      console.log('🔍 Troubleshooting steps:');
      console.log('1. Check if MongoDB Atlas IP whitelist includes your IP (0.0.0.0/0 for all)');
      console.log('2. Verify MongoDB credentials in .env file');
      console.log('3. Check network connection');
      console.log('4. Ensure MongoDB cluster is running in Atlas dashboard');
      console.log(`5. URI: ${process.env.MONGODB_URI?.substring(0, 50)}...`);
    }
    
    // Don't exit in development mode to allow demo mode
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    return null;
  }
};

module.exports = connectDB;