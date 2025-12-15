const User = require('../models/User');
const jwt = require('jsonwebtoken');
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

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
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
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!isDBConnected()) {
      return res.json({
        success: true,
        message: 'Password reset email sent (Demo Mode)',
        resetToken: 'demo-reset-token',
        resetUrl: `${process.env.FRONTEND_URL}/reset-password/demo-token`
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    res.json({
      success: true,
      message: 'Password reset email sent',
      resetToken, // In production, don't send token in response
      resetUrl
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = async (req, res) => {
  try {
    if (!isDBConnected()) {
      const demoToken = jwt.sign({ id: 'demo_' + Date.now() }, process.env.JWT_SECRET, {
        expiresIn: '30d'
      });
      
      return res.json({
        success: true,
        message: 'Password reset successful (Demo Mode)',
        token: demoToken,
        user: {
          id: 'demo_user_reset',
          name: 'Demo User',
          email: 'demo@agentic.com'
        }
      });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password reset successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/changepassword
// @access  Private
const changePassword = async (req, res) => {
  try {
    if (!isDBConnected()) {
      return res.json({
        success: true,
        message: 'Password changed successfully (Demo Mode)'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(req.body.currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = req.body.newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
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