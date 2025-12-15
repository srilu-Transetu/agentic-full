const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // For demo mode, check if it's a demo token
      if (decoded.id && decoded.id.startsWith('demo_')) {
        req.user = {
          id: decoded.id,
          name: 'Demo User',
          email: 'demo@agentic.com'
        };
        return next();
      }

      // For real tokens, check database
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        // Database not connected
        return res.status(401).json({
          success: false,
          message: 'Database not connected'
        });
      }

      const User = require('../models/User');
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

module.exports = { protect };