const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      console.log('🔐 Auth middleware - Token received');
      console.log('📌 Token length:', token ? token.length : 0);

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production'
      );

      console.log('✅ Token decoded:', {
        id: decoded.id,
        exp: decoded.exp ? new Date(decoded.exp * 1000).toLocaleString() : 'No expiry'
      });

      // For demo mode, check if it's a demo token
      if (decoded.id && decoded.id.toString().startsWith('demo_')) {
        console.log('🎮 Demo mode activated');
        req.user = {
          id: decoded.id,
          name: 'Demo User',
          email: 'demo@agentic.com'
        };
        return next();
      }

      // Check database connection
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        console.error('❌ Database not connected');
        return res.status(401).json({
          success: false,
          message: 'Database not connected'
        });
      }

      // Get user from database (without password)
      req.user = await User.findById(decoded.id).select('-password -resetPasswordToken -resetPasswordExpire');

      if (!req.user) {
        console.error('❌ User not found in database for ID:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log('✅ User authenticated:', req.user.email);
      next();

    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      
      // Specific error handling
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token format'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.'
        });
      }
      
      res.status(401).json({
        success: false,
        message: 'Not authorized, token verification failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // If no token found
  if (!token) {
    console.log('❌ No authorization token provided');
    res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }
};

module.exports = { protect };