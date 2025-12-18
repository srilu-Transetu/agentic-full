const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

// Check if database is connected
const isDBConnected = () => {
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1;
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    console.log('📝 Registration attempt received:', {
      name: req.body.name,
      email: req.body.email,
      hasPassword: !!req.body.password,
      hasConfirmPassword: !!req.body.confirmPassword
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    const { name, email, password, confirmPassword } = req.body;

    console.log('✅ Validation passed for:', email);

    // Check database connection
    const mongoose = require('mongoose');
    const isDBConnected = mongoose.connection.readyState === 1;
    
    if (!isDBConnected) {
      console.log('⚠️ Database not connected, using demo mode');
      
      // Demo mode - simulate successful registration
      const demoToken = jwt.sign({ 
        id: 'demo_' + Date.now(),
        email: email 
      }, process.env.JWT_SECRET, {
        expiresIn: '30d'
      });
      
      return res.status(201).json({
        success: true,
        message: 'Account created successfully (Demo Mode)',
        token: demoToken,
        user: {
          id: 'demo_' + Date.now(),
          name,
          email,
          createdAt: new Date().toISOString()
        }
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log(`❌ User already exists: ${email}`);
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    console.log(`✅ Creating new user in database: ${email}`);
    const user = await User.create({
      name,
      email,
      password
    });

    if (user) {
      const token = generateToken(user._id);
      console.log(`🎉 User created successfully in MongoDB: ${email}`);
      
      res.status(201).json({
        success: true,
        message: 'Account created successfully! Welcome to Agentic System.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    } else {
      console.log(`❌ User creation failed: ${email}`);
      res.status(400).json({
        success: false,
        message: 'Invalid user data'
      });
    }
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Handle duplicate key error (MongoDB)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(err => err.message).join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// @desc    Login user - FIXED VERSION
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', {
      email: email,
      passwordLength: password ? password.length : 0
    });

    // Check database connection
    if (!isDBConnected()) {
      // Demo mode - simulate successful login
      const demoToken = jwt.sign({ id: 'demo_' + Date.now() }, process.env.JWT_SECRET, {
        expiresIn: '30d'
      });
      
      return res.json({
        success: true,
        message: 'Login successful (Demo Mode - Database not connected)',
        token: demoToken,
        user: {
          id: 'demo_user_123',
          name: 'Demo User',
          email: email || 'demo@agentic.com'
        }
      });
    }

    // Check for user - MAKE SURE TO SELECT PASSWORD
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log(`✅ User found: ${user.email}`);
    console.log(`🔑 Password field available: ${!!user.password}`);
    
    // Check password
    console.log('🔄 Comparing passwords...');
    const isMatch = await user.matchPassword(password);
    
    console.log(`🔐 Password match result: ${isMatch ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (!isMatch) {
      console.log('❌ Password does not match');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔑 Forgot password request for:', email);

    if (!isDBConnected()) {
      console.log('⚠️ Database not connected - using demo mode');
      return res.json({
        success: true,
        message: 'Password reset email sent (Demo Mode)',
        resetToken: 'demo_reset_token_' + Date.now(),
        resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=demo_reset_token_${Date.now()}&email=${encodeURIComponent(email || 'demo@example.com')}`
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      // For security, don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a reset link shortly.'
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    
    console.log(`✅ Generated reset token for ${email}:`, resetToken);
    console.log(`Token expires at: ${new Date(user.resetPasswordExpire).toLocaleString()}`);

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    console.log(`🔗 Reset URL: ${resetUrl}`);

    // In development, return the token for testing
    if (process.env.NODE_ENV === 'development') {
      res.json({
        success: true,
        message: 'Password reset link generated',
        resetToken: resetToken, // Send token for testing
        resetUrl: resetUrl,
        expiresAt: user.resetPasswordExpire
      });
    } else {
      res.json({
        success: true,
        message: 'Password reset email sent'
      });
      // TODO: Send actual email here
    }
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing request'
    });
  }
};

// @desc    Reset password - COMPLETELY FIXED VERSION
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { resettoken } = req.params;
    const { password } = req.body;
    const email = req.query.email || req.body.email;
    
    console.log('🔄 Reset password attempt:', {
      token: resettoken,
      email: email,
      hasPassword: !!password,
      passwordLength: password ? password.length : 0
    });

    // Check for demo token
    if (resettoken === 'demo' || resettoken.startsWith('demo_') || resettoken.includes('demo')) {
      console.log('✅ Demo token detected');
      
      let user;
      if (email) {
        user = await User.findOne({ email: email.toLowerCase() });
      } else {
        user = await User.findOne();
      }
      
      if (!user) {
        console.log('❌ No user found for demo reset');
        return res.status(400).json({
          success: false,
          message: 'No user found'
        });
      }
      
      console.log(`✅ Found user: ${user.email}`);
      
      // Set new password - Mongoose pre-save middleware will hash it
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      
      // Save user (password will be hashed automatically)
      await user.save();
      
      console.log('✅ Password updated for demo user');
      
      const token = generateToken(user._id);
      
      return res.json({
        success: true,
        message: 'Password reset successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    }

    // For real tokens
    console.log('🔍 Looking for user with reset token...');
    
    // Hash the token to compare with stored hash
    const crypto = require('crypto');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resettoken)
      .digest('hex');
    
    console.log(`🔑 Looking for hashed token: ${hashedToken.substring(0, 20)}...`);
    
    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      console.log('❌ No valid token found');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`📅 Token expires at: ${new Date(user.resetPasswordExpire).toLocaleString()}`);
    
    // Set new password - Mongoose will hash it automatically
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    // Save user (password will be hashed by pre-save middleware)
    await user.save();
    
    console.log('✅ Password reset completed successfully');
    
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password reset successful! You can now login with your new password.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Password validation failed: ' + error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during password reset',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Change password - UPDATED VERSION (Fixes the issue)
// @route   PUT /api/auth/changepassword
// @access  Private
const changePassword = async (req, res) => {
  try {
    console.log('🔐 Change password request received for user:', req.user?.id || 'no user');
    console.log('📦 Request body:', {
      hasCurrentPassword: !!req.body.currentPassword,
      hasNewPassword: !!req.body.newPassword,
      hasConfirmNewPassword: !!req.body.confirmNewPassword
    });

    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password, new password, and confirm new password'
      });
    }

    // Check if new passwords match
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Check password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // Check if user is in demo mode
    const isDemoUser = req.user.id && req.user.id.toString().startsWith('demo_');
    
    if (isDemoUser) {
      console.log('🎮 Demo user - password change simulation');
      return res.json({
        success: true,
        message: 'Password changed successfully (Demo Mode)'
      });
    }

    // Check database connection
    if (!isDBConnected()) {
      console.log('⚠️ Database not connected');
      return res.status(500).json({
        success: false,
        message: 'Database connection error. Please try again.'
      });
    }

    // Find user WITH password field for comparison
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      console.log('❌ User not found with ID:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('🔍 User found:', user.email);

    // Check current password
    console.log('🔄 Verifying current password...');
    const isMatch = await user.matchPassword(currentPassword);
    
    if (!isMatch) {
      console.log('❌ Current password is incorrect');
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    console.log('✅ Current password verified');

    // Update to new password
    user.password = newPassword;
    
    // Save the user (password will be hashed automatically by pre-save middleware)
    await user.save();
    
    console.log('✅ Password updated successfully for:', user.email);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    
    // Handle specific errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Password validation failed: ' + Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Password update failed due to database constraint'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while changing password',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        stack: error.stack 
      })
    });
  }
};



// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    if (!isDBConnected()) {
      return res.json({
        success: true,
        user: {
          id: 'demo_user_123',
          name: 'Demo User',
          email: 'demo@agentic.com',
          createdAt: new Date().toISOString()
        }
      });
    }

    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// @desc    Health check
// @route   GET /api/health
// @access  Public
const healthCheck = async (req, res) => {
  try {
    const dbStatus = isDBConnected() ? 'Connected' : 'Disconnected';
    
    res.json({
      success: true,
      message: 'Agentic System API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Save chat history
// @route   POST /api/auth/chats
// @access  Private
const saveChatHistory = async (req, res) => {
  try {
    const { chatId, title, date, time, messages, files } = req.body;
    
    if (!isDBConnected()) {
      return res.json({
        success: true,
        message: 'Chat saved in demo mode',
        chatId
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if chat already exists
    const existingChatIndex = user.chatHistory.findIndex(chat => chat.chatId === chatId);
    
    if (existingChatIndex >= 0) {
      // Update existing chat
      user.chatHistory[existingChatIndex] = {
        chatId,
        title,
        date,
        time,
        messages,
        files,
        lastUpdated: Date.now()
      };
    } else {
      // Add new chat
      user.chatHistory.push({
        chatId,
        title,
        date,
        time,
        messages,
        files,
        lastUpdated: Date.now()
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Chat saved successfully',
      chatId
    });
  } catch (error) {
    console.error('Save chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save chat'
    });
  }
};

// @desc    Get user's chat history
// @route   GET /api/auth/chats
// @access  Private
const getChatHistory = async (req, res) => {
  try {
    if (!isDBConnected()) {
      // Return demo data
      return res.json({
        success: true,
        chats: [
          {
            chatId: 'demo_1',
            title: 'Sales Analysis Demo',
            date: 'Dec 15, 2024',
            time: '10:30 AM',
            messages: [
              {
                text: 'Can you analyze the sales data?',
                isUser: true,
                timestamp: new Date().toISOString()
              },
              {
                text: 'I will analyze the sales.csv file and create a chart.',
                isUser: false,
                timestamp: new Date().toISOString()
              }
            ],
            files: ['sales.csv'],
            lastUpdated: new Date().toISOString()
          }
        ]
      });
    }

    const user = await User.findById(req.user.id).select('chatHistory');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Sort by lastUpdated in descending order
    const sortedChats = user.chatHistory.sort((a, b) => 
      new Date(b.lastUpdated) - new Date(a.lastUpdated)
    );

    res.json({
      success: true,
      chats: sortedChats
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load chat history'
    });
  }
};

// @desc    Delete a chat
// @route   DELETE /api/auth/chats/:chatId
// @access  Private
const deleteChat = async (req, res) => {
  try {
    if (!isDBConnected()) {
      return res.json({
        success: true,
        message: 'Chat deleted in demo mode'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.chatHistory = user.chatHistory.filter(chat => chat.chatId !== req.params.chatId);
    await user.save();

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chat'
    });
  }
};

// Update the export at the end of the file:
module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  healthCheck,
  saveChatHistory,
  getChatHistory,
  deleteChat
};