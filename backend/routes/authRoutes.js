const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Debug middleware
router.use((req, res, next) => {
  console.log(`📦 AuthRoutes: ${req.method} ${req.originalUrl}`);
  next();
});

// Public routes
router.get('/health', healthCheck);
router.post('/register', register); // Temporarily removed validation
router.post('/login', login); // Temporarily removed validation
router.post('/forgotpassword', forgotPassword); // Temporarily removed validation
router.put('/resetpassword/:resettoken', resetPassword); // Temporarily removed validation

// Protected routes
router.get('/me', protect, getMe);
router.put('/changepassword', protect, changePassword); // TEMPORARILY REMOVED VALIDATION - THIS IS THE FIX
router.post('/chats', protect, saveChatHistory);
router.get('/chats', protect, getChatHistory);
router.delete('/chats/:chatId', protect, deleteChat);

// Test route inside authRoutes
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: "Auth routes are working!",
    endpoints: [
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/auth/me",
      "PUT /api/auth/changepassword"
    ]
  });
});

module.exports = router;