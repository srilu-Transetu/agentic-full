const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// NEW: Create a FileSchema to store file objects
const FileSchema = new mongoose.Schema({
  name: String,           // Original filename
  filename: String,       // Server saved filename
  serverPath: String,     // Server path
  type: String,           // MIME type
  size: Number,           // File size in bytes
  uploadedAt: Date        // When it was uploaded
});

const ChatMessageSchema = new mongoose.Schema({
  text: String,
  // UPDATE: Change from [String] to [FileSchema]
  files: [FileSchema],    // Array of file objects
  isUser: Boolean,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ChatHistorySchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  date: String,
  time: String,
  messages: [ChatMessageSchema],
  // UPDATE: Change from [String] to [FileSchema]
  files: [FileSchema],    // Array of file objects
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  chatHistory: [ChatHistorySchema],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  // ADD: This allows the schema to accept extra fields without validation errors
  strict: false
});

// Encrypt password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update updatedAt timestamp
UserSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Method to compare password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate reset password token
UserSchema.methods.getResetPasswordToken = function() {
  const crypto = require('crypto');
  
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', UserSchema);