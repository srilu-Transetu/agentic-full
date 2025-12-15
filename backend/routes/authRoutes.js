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
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword
} = require('../utils/validation');

// Public routes
router.get('/health', healthCheck);
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/forgotpassword', validateForgotPassword, forgotPassword);
router.put('/resetpassword/:resettoken', validateResetPassword, resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/changepassword', protect, validateChangePassword, changePassword);
router.post('/chats', protect, saveChatHistory);
router.get('/chats', protect, getChatHistory);
router.delete('/chats/:chatId', protect, deleteChat);

module.exports = router;