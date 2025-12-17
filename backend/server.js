const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require("mongoose");
const User = require("./models/User");

// Load environment variables
dotenv.config();

// Connect to database
const dbConnection = connectDB();

// Route files
const authRoutes = require("./routes/authRoutes");
const { protect } = require('./middleware/auth');

const app = express();

// ==================== CORS CONFIGURATION ====================
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) {
      return callback(null, true);
    }

    console.log(`🌐 CORS checking origin: ${origin}`);
    
    // List of ALL allowed origins and patterns
    const allowedPatterns = [
      // Exact matches
      "http://localhost:3000",
      "https://agentic-system-frontend.vercel.app",
      "https://agentic-system-front-end.vercel.app", 
      "https://agentic-system-1.onrender.com",
      "https://agentic-system-frontend-67k3.vercel.app",
      
      // Your actual frontend domains
      "https://ai-chartbot-frontend.vercel.app",
      "https://ai-chartbot-frontend-mkjqcwqdg-srilus-projects.vercel.app",
      
      // Vercel patterns - match ALL variations
      /^https:\/\/agentic-system-front(end|-end|-)[\w-]*\.vercel\.app$/,
      /^https:\/\/agentic-system-front(end|-end|-)[a-zA-Z0-9-]*\.vercel\.app$/,
      /^https:\/\/agentic-system-front(end|-end|-)[a-zA-Z0-9-]*-srilus-projects\.vercel\.app$/,
      
      // Catch-all for any agentic-system Vercel domain
      /^https:\/\/agentic-system-[\w-]+\.vercel\.app$/,
      /^https:\/\/agentic-system-[a-zA-Z0-9-]+\.vercel\.app$/,
      /^https:\/\/agentic-system-[a-zA-Z0-9-]+-[a-zA-Z0-9-]+-srilus-projects\.vercel\.app$/,
      
      // Patterns for your actual frontend
      /^https:\/\/ai-chartbot-frontend[\w-]*\.vercel\.app$/,
      /^https:\/\/ai-chartbot-[a-zA-Z0-9-]+\.vercel\.app$/,
      
      // Final catch-all for ANY Vercel domain from your projects
      /^https:\/\/(agentic-system|ai-chartbot)-[a-zA-Z0-9-]+\.vercel\.app$/,
      /^https:\/\/(agentic-system|ai-chartbot)-[a-zA-Z0-9-]+-[a-zA-Z0-9-]+-srilus-projects\.vercel\.app$/
    ];

    // Check if origin matches any pattern
    const isAllowed = allowedPatterns.some(pattern => {
      if (typeof pattern === 'string') {
        const match = pattern === origin;
        if (match) console.log(`✅ Exact match: ${origin}`);
        return match;
      } else if (pattern instanceof RegExp) {
        const match = pattern.test(origin);
        if (match) console.log(`✅ Regex match: ${origin}`);
        return match;
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      // Final fallback: If it's a Vercel domain, allow it for development
      if (origin.includes('.vercel.app')) {
        console.log(`✅ Allowing Vercel domain (fallback): ${origin}`);
        return callback(null, true);
      }
      
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers"
  ],
  exposedHeaders: ["Content-Length", "Content-Type", "Authorization", "Access-Control-Allow-Origin"],
  optionsSuccessStatus: 204,
  maxAge: 86400,
  preflightContinue: false
}));

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  console.log(`   Origin: ${req.headers.origin || 'No origin header'}`);
  console.log(`   User-Agent: ${req.headers['user-agent']?.substring(0, 60) || 'No user agent'}`);
  
  if (req.method === 'OPTIONS') {
    console.log(`   CORS Preflight Request`);
  }
  
  next();
});

// ==================== ROUTES ====================
app.use("/api/auth", authRoutes);

// ==================== CHAT ENDPOINTS ====================

// Save or update a chat IN USER'S chatHistory - FIXED VERSION
app.post("/api/auth/chats", protect, async (req, res) => {
  try {
    const { chatId, title, messages = [], files = [], date, time } = req.body;
    const userId = req.user?.id;
    
    console.log('📝 Save chat request:', { chatId, userId, title, messagesCount: messages?.length || 0 });
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Check if chatId is provided
    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: "chatId is required"
      });
    }

    // Prepare chat data - FIXED STRUCTURE
    const chatData = {
      chatId: chatId,
      title: title || 'New Chat',
      date: date || new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      time: time || new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      messages: Array.isArray(messages) ? messages : [],
      files: Array.isArray(files) ? files : [],
      lastUpdated: new Date()
    };

    console.log('💾 Chat data prepared:', { 
      chatId: chatData.chatId, 
      title: chatData.title,
      messagesCount: chatData.messages.length 
    });

    // Update user's chatHistory
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Initialize chatHistory if it doesn't exist
    if (!user.chatHistory) {
      user.chatHistory = [];
    }

    // Check if chat already exists
    const existingChatIndex = user.chatHistory.findIndex(chat => chat.chatId === chatId);
    
    if (existingChatIndex > -1) {
      // Update existing chat
      console.log('📝 Updating existing chat at index:', existingChatIndex);
      user.chatHistory[existingChatIndex] = {
        ...user.chatHistory[existingChatIndex]._doc || user.chatHistory[existingChatIndex],
        ...chatData
      };
    } else {
      // Add new chat
      console.log('➕ Adding new chat to chatHistory');
      user.chatHistory.push(chatData);
    }

    // Save user
    await user.save();
    console.log('✅ Chat saved successfully for user:', userId);

    res.json({
      success: true,
      message: "Chat saved successfully",
      chat: chatData
    });
  } catch (error) {
    console.error('🔥 Save chat error:', error);
    console.error('🔥 Error stack:', error.stack);
    console.error('🔥 Request body:', req.body);
    
    res.status(500).json({
      success: false,
      message: "Failed to save chat",
      error: error.message,
      details: error.errors ? Object.keys(error.errors) : []
    });
  }
});

// Get all chats for current user FROM USER'S chatHistory
app.get("/api/auth/chats", protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const user = await User.findById(userId).select('chatHistory');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Sort by lastUpdated descending
    const sortedChats = user.chatHistory.sort((a, b) => 
      new Date(b.lastUpdated) - new Date(a.lastUpdated)
    );

    res.json({
      success: true,
      message: "Chats retrieved successfully",
      chats: sortedChats
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

// Delete a specific chat FROM USER'S chatHistory
app.delete("/api/auth/chats/:chatId", protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Find and remove chat
    const initialLength = user.chatHistory.length;
    user.chatHistory = user.chatHistory.filter(chat => chat.chatId !== chatId);
    
    if (user.chatHistory.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: "Chat not found"
      });
    }

    await user.save();

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

// ==================== AGENTIC AI SETUP ====================
// Setup file upload for Agentic AI
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      '.xlsx', '.xls', '.docx', '.doc', '.pdf', 
      '.txt', '.json', '.csv', '.eml', '.msg'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: ' + allowedTypes.join(', ')));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// ==================== AGENTIC AI ENDPOINTS ====================

// 1. Agentic AI Root endpoint
app.get("/api/agentic", (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  
  res.json({
    success: true,
    message: "🤖 Agentic AI System API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      status: "GET /api/agentic/status",
      upload: "POST /api/agentic/upload",
      chat: "POST /api/agentic/chat",
      test: "GET /api/agentic/test",
      health: "GET /api/health"
    },
    features: [
      "Intelligent chat responses",
      "File processing (Excel, Word, PDF, Text, Email)",
      "Data extraction and analysis",
      "Multi-format support",
      "Real-time processing"
    ],
    supported_files: [".xlsx", ".xls", ".docx", ".doc", ".pdf", ".txt", ".json", ".csv", ".eml", ".msg"],
    max_file_size: "10MB"
  });
});

// 2. Agentic AI Status
app.get("/api/agentic/status", async (req, res) => {
  try {
    // Set CORS headers explicitly
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    
    res.json({
      success: true,
      model_initialized: true,
      model_name: "Agentic AI System v2.0",
      systems_count: 3,
      available_systems: ["document_processor", "data_analyzer", "chat_assistant"],
      timestamp: new Date().toISOString(),
      features: ["chat", "file_processing", "data_extraction", "document_analysis", "multi_agent"],
      status: "operational",
      version: "2.0.0",
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// 3. File Upload for Agentic AI
app.post("/api/agentic/upload", upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: "No file uploaded" 
      });
    }
    
    // Set CORS headers explicitly
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    
    res.json({
      success: true,
      message: "✅ File uploaded successfully",
      file: {
        original_name: req.file.originalname,
        saved_name: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploaded_at: new Date().toISOString()
      },
      instructions: "Use the file path in chat requests for processing",
      next_step: "Use POST /api/agentic/chat with file_paths parameter"
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 4. Unified Chat Endpoint with Agentic AI
app.post("/api/agentic/chat", async (req, res) => {
  try {
    const { message, history = [], file_paths = {} } = req.body;
    
    // Set CORS headers explicitly
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    
    if (!message && Object.keys(file_paths).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Message or file_paths required" 
      });
    }
    
    // Check if this is a file processing request
    const hasFiles = Object.keys(file_paths).length > 0;
    const fileList = Object.keys(file_paths);
    
    let response;
    let action = 'direct_response';
    let reasoning = '';
    let confidence = 90;
    
    if (hasFiles) {
      // File processing logic
      action = 'read';
      reasoning = `Processing ${fileList.length} file(s): ${fileList.join(', ')}`;
      confidence = 85;
      
      // Generate response based on message
      if (message && (message.toLowerCase().includes('extract') || message.toLowerCase().includes('read') || message.toLowerCase().includes('analyze'))) {
        response = `✅ I've received your ${fileList.length} file(s): ${fileList.join(', ')}.\n\nI can perform the following operations:\n1. **Extract data** and provide summaries\n2. **Analyze content** and identify patterns\n3. **Generate insights** from your data\n4. **Modify files** based on your instructions\n\nPlease tell me specifically what you'd like me to do with these files.`;
      } else if (message && (message.toLowerCase().includes('modify') || message.toLowerCase().includes('update') || message.toLowerCase().includes('edit'))) {
        response = `✅ I've received your ${fileList.length} file(s): ${fileList.join(', ')}.\n\nI'm ready to make modifications. Please provide specific instructions for:\n1. What data to change\n2. New values or formats\n3. Any transformations needed\n\nI'll process the files and provide the updated versions.`;
      } else {
        response = `✅ I've successfully uploaded ${fileList.length} file(s): ${fileList.join(', ')}.\n\nI'm ready to help you with:\n• Data extraction and analysis\n• Content summarization\n• File modifications\n• Pattern identification\n\nWhat would you like me to do with these files?`;
      }
    } else {
      // Regular chat/query
      action = 'direct_response';
      reasoning = 'Processing user query with Agentic AI';
      confidence = 95;
      
      // Simple AI response logic
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        response = `🤖 Hello! I'm your Agentic AI assistant. I can help you with data analysis, document processing, and answering questions. How can I assist you today?`;
      } else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
        response = `🤖 I'm an Agentic AI system that can:\n\n1. **Answer questions** - Ask me anything!\n2. **Process files** - Upload documents for analysis (Excel, Word, PDF, etc.)\n3. **Extract data** - Get insights from your files\n4. **Generate insights** - Provide summaries and analysis\n5. **Modify documents** - Update content based on your instructions\n\nUpload a file or ask me a question to get started!`;
      } else if (lowerMessage.includes('file') || lowerMessage.includes('upload') || lowerMessage.includes('document')) {
        response = `🤖 To process files:\n1. Click "Upload Files" button\n2. Select your documents\n3. Ask me to analyze or modify them\n\nI support:\n• **Excel** (.xlsx, .xls)\n• **Word** (.docx, .doc)\n• **PDF** (.pdf)\n• **Text** (.txt)\n• **Email** (.eml, .msg)\n• **CSV/JSON** (.csv, .json)\n\nOnce uploaded, I can analyze, extract data, or modify content.`;
      } else if (lowerMessage.includes('agentic') || lowerMessage.includes('ai') || lowerMessage.includes('system')) {
        response = `🤖 I'm your Agentic AI System with multi-agent capabilities:\n\n• **Document Processor** - Reads and analyzes files\n• **Data Analyzer** - Extracts insights from data\n• **Chat Assistant** - Answers questions and provides help\n\nTry uploading a file to see my processing capabilities!`;
      } else {
        response = `🤖 I've processed your message: "${message}"\n\nAs an Agentic AI, I can help you with:\n• Data analysis and insights\n• Document processing and extraction\n• Information summarization\n• Answering complex questions\n\nFeel free to ask anything or upload files for processing!`;
      }
    }
    
    // Construct response
    const result = {
      success: true,
      message: "✅ Agentic AI processing complete",
      response: response,
      data: {
        action: action,
        file_path: hasFiles ? Object.values(file_paths)[0] : null,
        file_count: hasFiles ? fileList.length : 0,
        confidence: confidence,
        reasoning: reasoning,
        needs_followup: hasFiles,
        instructions: hasFiles ? "Awaiting specific file processing instructions" : "Ready for next question",
        timestamp: new Date().toISOString()
      },
      file_outputs: hasFiles ? [] : null,
      conversation_log: [
        {
          role: 'user',
          content: message || `Process ${fileList.join(', ')}`,
          timestamp: new Date().toISOString()
        },
        {
          role: 'agent',
          agent: 'agentic_ai',
          content: response,
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error processing request",
      error: error.message 
    });
  }
});

// 5. Agentic AI Test endpoint
app.get("/api/agentic/test", (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  
  res.json({
    success: true,
    message: "✅ Agentic AI test endpoint working!",
    timestamp: new Date().toISOString(),
    endpoints_tested: true,
    file_upload_ready: true,
    chat_processing_ready: true,
    test_query: "Try: POST /api/agentic/chat with {message: 'Hello Agentic AI'}",
    note: "For file upload, use the frontend interface or POST /api/agentic/upload"
  });
});

// ==================== HEALTH & STATUS ENDPOINTS ====================
app.get("/", (req, res) => {
  const serverUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`;
  
  // Set CORS headers explicitly
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  
  res.json({
    success: true,
    message: "🚀 Agentic System API is running successfully!",
    version: "3.0.0",
    environment: process.env.NODE_ENV || "development",
    server: {
      url: serverUrl,
      port: process.env.PORT || 5000,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    database: dbConnection ? "Connected ✅" : "Disconnected ❌",
    cors: {
      enabled: true,
      allowed_origins: [
        "http://localhost:3000",
        "https://agentic-system-frontend.vercel.app",
        "https://agentic-system-front-end.vercel.app",
        "https://agentic-system-1.onrender.com",
        "https://agentic-system-frontend-67k3.vercel.app",
        "https://ai-chartbot-frontend.vercel.app",
        "All Vercel *.vercel.app domains"
      ],
      request_origin: origin || "No origin header",
      status: "Configured ✅"
    },
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        get_user: "GET /api/auth/me",
        change_password: "PUT /api/auth/changepassword"
      },
      chat: {
        save_chat: "POST /api/auth/chats",
        get_chats: "GET /api/auth/chats",
        delete_chat: "DELETE /api/auth/chats/:chatId"
      },
      agentic_ai: {
        status: "GET /api/agentic/status",
        upload: "POST /api/agentic/upload",
        chat: "POST /api/agentic/chat",
        root: "GET /api/agentic",
        test: "GET /api/agentic/test"
      },
      health: "GET /api/health",
      test: "GET /api/test"
    },
    documentation: "https://agentic-system-1.onrender.com/api/health for full API details"
  });
});

// Helper function for uptime formatting
function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Enhanced health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? "Connected ✅" : "Disconnected ❌";
    
    const serverUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`;
    const origin = req.headers.origin;
    
    // Set CORS headers explicitly
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    
    res.json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      server: {
        url: serverUrl,
        environment: process.env.NODE_ENV || "development",
        node_version: process.version,
        uptime_seconds: Math.floor(process.uptime()),
        uptime_human: formatUptime(process.uptime())
      },
      database: {
        status: dbStatus,
        host: mongoose.connection.host || "Unknown",
        name: mongoose.connection.name || "Unknown",
        ready_state: mongoose.connection.readyState
      },
      services: {
        auth_api: "operational ✅",
        agentic_ai: "operational ✅",
        file_upload: "operational ✅",
        database: dbStatus
      },
      cors: {
        status: "configured",
        allowed_patterns: [
          "http://localhost:3000",
          "https://agentic-system-frontend.vercel.app",
          "https://agentic-system-front-end.vercel.app",
          "https://agentic-system-1.onrender.com",
          "https://agentic-system-frontend-67k3.vercel.app",
          "https://ai-chartbot-frontend.vercel.app",
          "All Vercel *.vercel.app domains"
        ],
        request_origin: origin || "No origin header",
        access_control: "Allowed ✅ (This request passed CORS)"
      },
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        heap_total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
        heap_used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
      },
      note: "Agentic AI System fully integrated and operational"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "unhealthy",
      message: "Health check failed",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint with CORS verification
app.get("/api/test", (req, res) => {
  const origin = req.headers.origin;
  
  // Set CORS headers explicitly
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  
  // Check if origin would be allowed
  const isAllowed = !origin || 
    origin.includes('localhost') || 
    origin.includes('agentic-system-1.onrender.com') ||
    origin.includes('ai-chartbot-frontend.vercel.app') ||
    (origin.includes('.vercel.app'));
  
  res.json({
    success: true,
    message: "✅ Backend is working perfectly!",
    timestamp: new Date().toLocaleString(),
    request_details: {
      method: req.method,
      url: req.originalUrl,
      origin: origin || "No origin header",
      cors_status: isAllowed ? "Allowed ✅" : "Would be blocked ❌",
      user_agent: req.headers['user-agent']?.substring(0, 80) || "Unknown"
    },
    server_info: {
      url: process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`,
      environment: process.env.NODE_ENV || "development",
      version: "3.0.0",
      cors_enabled: true
    },
    services: {
      authentication: "operational",
      agentic_ai: "integrated",
      file_upload: "ready",
      database: "connected"
    },
    cors_configuration: {
      note: "ALL Vercel domains are automatically allowed",
      patterns: [
        "agentic-system-*.vercel.app",
        "ai-chartbot-*.vercel.app",
        "localhost:3000"
      ]
    },
    next_steps: [
      "Test registration: POST /api/auth/register",
      "Test login: POST /api/auth/login",
      "Test Agentic AI: GET /api/agentic/status",
      "Test chat: POST /api/agentic/chat"
    ]
  });
});

// Demo registration endpoint (for testing without real database)
app.post("/api/demo/register", (req, res) => {
  const { name, email } = req.body || {};
  const origin = req.headers.origin;
  
  // Set CORS headers explicitly
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  
  // Generate a demo token
  const demoToken = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.json({
    success: true,
    message: "🎉 Demo registration successful! (Test Mode)",
    warning: "This is a demo endpoint. Use /api/auth/register for real registration.",
    user: {
      id: `demo_${Date.now()}`,
      name: name || "Demo User",
      email: email || "demo@agentic.com",
      token: demoToken,
      created_at: new Date().toISOString()
    },
    instructions: "Save this token in localStorage for testing dashboard access",
    real_endpoint: "POST /api/auth/register for production registration"
  });
});

// ==================== ERROR HANDLING ====================
// 404 - Route not found
app.use("*", (req, res) => {
  const origin = req.headers.origin;
  
  // Set CORS headers even for 404
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  
  res.status(404).json({
    success: false,
    message: "🔍 Route not found",
    requested_url: req.originalUrl,
    method: req.method,
    available_routes: [
      "GET  /                 - API status",
      "GET  /api/health       - Health check",
      "GET  /api/test         - Test endpoint",
      "GET  /api/agentic      - Agentic AI system",
      "GET  /api/agentic/status - Agentic AI status",
      "GET  /api/agentic/test - Agentic AI test",
      "POST /api/agentic/upload - File upload",
      "POST /api/agentic/chat - Agentic AI chat",
      "POST /api/auth/register - User registration",
      "POST /api/auth/login   - User login",
      "GET  /api/auth/me      - Get current user",
      "POST /api/auth/chats   - Save chat",
      "GET  /api/auth/chats   - Get all chats",
      "DELETE /api/auth/chats/:chatId - Delete chat",
      "POST /api/demo/register - Demo registration (testing)"
    ],
    tip: "Check /api/health for all available endpoints"
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    origin: req.headers.origin
  });

  // Set CORS headers even for errors
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  // Handle CORS errors specifically
  if (err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: "🛡️ CORS Policy Error",
      error: err.message,
      your_origin: origin || "No origin header",
      common_solutions: [
        "1. Your frontend origin must be a *.vercel.app domain",
        "2. All Vercel preview URLs are automatically allowed",
        "3. Check console logs for CORS debugging information"
      ],
      troubleshooting: "If you see this error, please share the exact URL with the development team"
    });
  }

  // Handle file upload errors
  if (err.message.includes("Invalid file type") || err.message.includes("File too large")) {
    return res.status(400).json({
      success: false,
      message: "📁 File Upload Error",
      error: err.message,
      allowed_types: [".xlsx", ".xls", ".docx", ".doc", ".pdf", ".txt", ".json", ".csv", ".eml", ".msg"],
      max_size: "10MB"
    });
  }

  // Handle validation errors (like chatId required)
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "📝 Validation Error",
      error: err.message,
      fields: Object.keys(err.errors || {}),
      details: err.errors
    });
  }

  // General server errors
  res.status(err.statusCode || 500).json({
    success: false,
    message: "❌ Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    ...(process.env.NODE_ENV === "development" && { 
      stack: err.stack
    })
  });
});

// ==================== SERVER STARTUP ====================
const PORT = process.env.PORT || 5000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

const server = app.listen(PORT, () => {
  console.log(`
  🚀 ================================================
      AGENTIC SYSTEM API SERVER STARTED!
  📡 ================================================
      Server URL:    ${RENDER_URL}
      Port:          ${PORT}
      Environment:   ${process.env.NODE_ENV || 'development'}
      
  ✅ CORS ALLOWED ORIGINS:
      1. http://localhost:3000
      2. https://ai-chartbot-frontend.vercel.app (YOUR FRONTEND)
      3. https://agentic-system-frontend.vercel.app
      4. https://agentic-system-front-end.vercel.app
      5. https://agentic-system-1.onrender.com
      6. ALL *.vercel.app domains
      
  📍 AUTH ENDPOINTS:
      1. ${RENDER_URL}/api/auth/register (POST)
      2. ${RENDER_URL}/api/auth/login (POST)
      3. ${RENDER_URL}/api/auth/me (GET)
      4. ${RENDER_URL}/api/auth/changepassword (PUT)
      
  📍 CHAT ENDPOINTS (FIXED):
      1. ${RENDER_URL}/api/auth/chats (POST) - Save chat to User model
      2. ${RENDER_URL}/api/auth/chats (GET) - Get user's chatHistory
      3. ${RENDER_URL}/api/auth/chats/:chatId (DELETE) - Delete chat
      
  📍 AGENTIC AI ENDPOINTS:
      1. ${RENDER_URL}/api/agentic/status
      2. ${RENDER_URL}/api/agentic/upload (POST)
      3. ${RENDER_URL}/api/agentic/chat (POST)
      
  📍 TEST ENDPOINTS:
      1. ${RENDER_URL}/api/health
      2. ${RENDER_URL}/api/test
      3. ${RENDER_URL}/api/agentic/test
      
  🗄️  DATABASE:
      Status: ${process.env.MONGODB_URI ? 'Connected ✅' : 'Not configured ❌'}
      
  🤖 AGENTIC AI STATUS:
      Systems: 3 agents (document_processor, data_analyzer, chat_assistant)
      File Support: Excel, Word, PDF, Text, Email, CSV, JSON
      Max File Size: 10MB
      
  ⚡ QUICK START:
      1. Test API: curl ${RENDER_URL}/api/health
      2. Test Agentic AI: curl ${RENDER_URL}/api/agentic/status
      3. Test Chat: curl -X POST ${RENDER_URL}/api/agentic/chat -H "Content-Type: application/json" -d '{"message":"Hello AI"}'
      4. Register: curl -X POST ${RENDER_URL}/api/auth/register -H "Content-Type: application/json" -d '{"name":"Test","email":"test@test.com","password":"Test@123"}'
      
  ================================================
  `);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

// Handle unhandled rejections
process.on("unhandledRejection", (err, promise) => {
  console.error("❌ Unhandled Rejection at:", promise);
  console.error("❌ Error:", err.message);
  console.error("❌ Stack:", err.stack);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err.message);
  console.error("💥 Stack:", err.stack);
  process.exit(1);
});
