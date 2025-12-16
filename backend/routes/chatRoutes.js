// backend/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');

// Save or update a chat
router.post('/', async (req, res) => {
  try {
    const { chatId, title, messages, files, date, time } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const chatData = {
      chatId,
      userId,
      title: title || 'New Chat',
      messages: messages || [],
      files: files || [],
      date: date || new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      time: time || new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      lastUpdated: new Date()
    };

    const chat = await Chat.findOneAndUpdate(
      { chatId, userId },
      chatData,
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: "Chat saved successfully",
      chat: {
        chatId: chat.chatId,
        title: chat.title,
        messages: chat.messages,
        files: chat.files,
        date: chat.date,
        time: chat.time,
        lastUpdated: chat.lastUpdated
      }
    });
  } catch (error) {
    console.error('Save chat error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to save chat",
      error: error.message
    });
  }
});

// Get all chats for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const chats = await Chat.find({ userId })
      .sort({ lastUpdated: -1 })
      .select('chatId title messages files date time lastUpdated');

    res.json({
      success: true,
      message: "Chats retrieved successfully",
      chats: chats.map(chat => ({
        chatId: chat.chatId,
        title: chat.title,
        messages: chat.messages,
        files: chat.files,
        date: chat.date,
        time: chat.time,
        lastUpdated: chat.lastUpdated
      }))
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chats",
      error: error.message
    });
  }
});

// Delete a specific chat
router.delete('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const result = await Chat.findOneAndDelete({ chatId, userId });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Chat not found"
      });
    }

    res.json({
      success: true,
      message: "Chat deleted successfully"
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to delete chat",
      error: error.message
    });
  }
});

module.exports = router;