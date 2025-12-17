// backend/models/Chat.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: String,
  files: [String],
  isUser: Boolean,
  timestamp: Date,
  agentData: Object,
  fileOutputs: [Object]
});

const chatSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    default: 'New Chat'
  },
  messages: [messageSchema],
  files: [String],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  date: String,
  time: String
}, { timestamps: true });

// Compound index
chatSchema.index({ userId: 1, lastUpdated: -1 });

module.exports = mongoose.model('Chat', chatSchema);