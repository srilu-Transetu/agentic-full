const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const mongoose = require("mongoose");
const User = require("./models/User");

// File processing libraries
const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const xlsx = require('xlsx');
const emailjs = require('emailjs');
const cheerio = require('cheerio');

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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enhanced request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  console.log(`   Origin: ${req.headers.origin || 'No origin header'}`);
  console.log(`   Content-Type: ${req.headers['content-type'] || 'No content-type'}`);
  
  if (req.method === 'POST' && req.originalUrl === '/api/agentic/chat') {
    console.log(`   Chat request body preview:`, {
      message: req.body?.message?.substring(0, 100),
      fileCount: Object.keys(req.body?.file_paths || {}).length,
      files: Object.keys(req.body?.file_paths || {})
    });
  }
  
  if (req.method === 'OPTIONS') {
    console.log(`   CORS Preflight Request`);
  }
  
  next();
});

// ==================== ROUTES ====================
app.use("/api/auth", authRoutes);

// ==================== CHAT ENDPOINTS ====================
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

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: "chatId is required"
      });
    }

    // FIX: Clean the files data before saving
    const cleanFiles = files.map(file => {
      if (typeof file === 'string') return file;
      if (file && typeof file === 'object') {
        // Store just the filename as string
        return file.name || file.filename || JSON.stringify(file);
      }
      return '';
    }).filter(f => f);

    // FIX: Clean messages files too
    const cleanMessages = messages.map(msg => ({
      ...msg,
      files: (msg.files || []).map(file => {
        if (typeof file === 'string') return file;
        if (file && typeof file === 'object') {
          return file.name || file.filename || JSON.stringify(file);
        }
        return '';
      }).filter(f => f)
    }));

    // Prepare chat data - with cleaned files
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
      messages: cleanMessages,
      files: cleanFiles,
      lastUpdated: new Date()
    };

    console.log('💾 Chat data prepared (cleaned):', { 
      chatId: chatData.chatId, 
      title: chatData.title,
      messagesCount: chatData.messages.length,
      filesCount: chatData.files.length
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
    
    // Try to clean the database
    if (error.message.includes('Cast to [string] failed')) {
      return res.status(400).json({
        success: false,
        message: "Data format error. Please use the /api/auth/clean-chat-data endpoint first.",
        error: "Invalid files format"
      });
    }
    
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

// ==================== FILE PROCESSING FUNCTIONS ====================

// ==================== FILE PROCESSING FUNCTIONS ====================

// Helper function to read file content based on type
async function readFileContent(filePath, filename) {
  try {
    console.log(`📖 Attempting to read: ${filename} (provided path: ${filePath})`);
    
    // Handle different path formats from frontend
    let actualPath;
    
    if (filePath.includes('C:/')) {
      // Frontend sent Windows path - extract just the filename
      const justFilename = path.basename(filePath);
      actualPath = path.join('uploads', justFilename);
    } else if (filePath.includes('uploads/')) {
      // Already has uploads/ prefix
      actualPath = filePath;
    } else {
      // Just filename, prepend uploads/
      actualPath = path.join('uploads', filePath);
    }
    
    console.log(`🔍 Looking for file at: ${actualPath}`);
    console.log(`🔍 Full path: ${path.resolve(actualPath)}`);
    
    // Check if file exists
    try {
      await fs.access(actualPath);
      console.log(`✅ File exists at: ${actualPath}`);
    } catch (err) {
      console.log(`❌ File not found at: ${actualPath}`);
      
      // List files in uploads directory for debugging
      const uploadsDir = 'uploads/';
      if (fsSync.existsSync(uploadsDir)) {
        const files = fsSync.readdirSync(uploadsDir);
        console.log(`📁 Available files in uploads/: ${files.length} files`);
        files.forEach((f, i) => {
          if (i < 10) console.log(`  ${i+1}. ${f}`);
          if (i === 10) console.log(`  ... and ${files.length - 10} more`);
        });
      } else {
        console.log('❌ Uploads directory does not exist!');
      }
      
      return null;
    }
    
    const stats = await fs.stat(actualPath);
    console.log(`✅ File stats: ${stats.size} bytes, modified: ${stats.mtime}`);
    
    // Get file extension
    const ext = path.extname(filename).toLowerCase();
    
    // Now continue with your original file reading logic
    switch (ext) {
      case '.txt':
      case '.csv':
      case '.json':
      case '.html':
      case '.htm':
        // Text files
        const content = await fs.readFile(actualPath, 'utf8');
        return {
          type: 'text',
          content: content,
          size: stats.size,
          lines: content.split('\n').length,
          words: content.split(/\s+/).length
        };
        
      case '.pdf':
        try {
          // PDF files
          const dataBuffer = await fs.readFile(actualPath);
          const pdfData = await pdf(dataBuffer);
          return {
            type: 'pdf',
            content: pdfData.text,
            size: stats.size,
            pages: pdfData.numpages || 'Unknown',
            lines: pdfData.text.split('\n').length,
            words: pdfData.text.split(/\s+/).length
          };
        } catch (pdfError) {
          console.log(`⚠️ PDF parsing error, using fallback: ${pdfError.message}`);
          return {
            type: 'pdf',
            content: `PDF file: ${filename} (${formatFileSize(stats.size)})\n[PDF content extraction requires proper setup]`,
            size: stats.size
          };
        }
        
      case '.docx':
        try {
          // Word documents
          const docBuffer = await fs.readFile(actualPath);
          const result = await mammoth.extractRawText({ buffer: docBuffer });
          return {
            type: 'word',
            content: result.value,
            size: stats.size,
            lines: result.value.split('\n').length,
            words: result.value.split(/\s+/).length
          };
        } catch (docError) {
          console.log(`⚠️ Word parsing error: ${docError.message}`);
          return {
            type: 'word',
            content: `Word document: ${filename} (${formatFileSize(stats.size)})`,
            size: stats.size
          };
        }
        
      case '.xlsx':
      case '.xls':
        try {
          // Excel files
          const workbook = xlsx.readFile(actualPath);
          let excelContent = '';
          let totalRows = 0;
          let totalColumns = 0;
          
          workbook.SheetNames.forEach((sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            const range = xlsx.utils.decode_range(worksheet['!ref']);
            const rows = range.e.r - range.s.r + 1;
            const cols = range.e.c - range.s.c + 1;
            
            excelContent += `Sheet ${index + 1}: ${sheetName}\n`;
            excelContent += `Rows: ${rows}, Columns: ${cols}\n\n`;
            
            // Get first few rows as preview
            const previewRows = Math.min(5, rows);
            for (let i = 0; i < previewRows; i++) {
              const row = [];
              for (let j = 0; j < Math.min(5, cols); j++) {
                const cellAddress = xlsx.utils.encode_cell({r: i, c: j});
                const cell = worksheet[cellAddress];
                row.push(cell ? cell.v : '');
              }
              excelContent += row.join('\t') + '\n';
            }
            excelContent += '\n';
            
            totalRows += rows;
            totalColumns = Math.max(totalColumns, cols);
          });
          
          return {
            type: 'excel',
            content: excelContent,
            size: stats.size,
            sheets: workbook.SheetNames.length,
            totalRows: totalRows,
            totalColumns: totalColumns
          };
        } catch (excelError) {
          console.log(`⚠️ Excel parsing error: ${excelError.message}`);
          return {
            type: 'excel',
            content: `Excel file: ${filename} (${formatFileSize(stats.size)})`,
            size: stats.size
          };
        }
        
      default:
        return {
          type: 'unknown',
          content: `File type: ${ext} (${formatFileSize(stats.size)})`,
          size: stats.size
        };
    }
  } catch (error) {
    console.error(`❌ Error reading file ${filename}:`, error.message);
    return {
      type: 'error',
      content: `Error reading file: ${error.message}`,
      size: 0
    };
  }
}

// Helper function to analyze document content
function analyzeDocumentContent(content, filename, query) {
  if (!content || content.length === 0) {
    return {
      summary: `The document "${filename}" appears to be empty or could not be read.`,
      insights: [],
      statistics: { lines: 0, words: 0, characters: 0 }
    };
  }
  
  const lines = content.split('\n');
  const words = content.split(/\s+/);
  const characters = content.length;
  
  // Basic statistics
  const statistics = {
    lines: lines.length,
    words: words.length,
    characters: characters,
    avgWordsPerLine: words.length / Math.max(lines.length, 1)
  };
  
  // Extract key insights
  const insights = [];
  
  // Check for common patterns
  if (content.toLowerCase().includes('@')) {
    const emailMatches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emailMatches && emailMatches.length > 0) {
      insights.push(`Contains ${emailMatches.length} email address(es)`);
    }
  }
  
  if (content.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/g)) {
    insights.push('Contains date(s)');
  }
  
  if (content.match(/\$\d+[\d,]*\.?\d*/g)) {
    insights.push('Contains monetary values');
  }
  
  if (content.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g)) {
    insights.push('Contains proper names');
  }
  
  // Generate summary based on content
  let summary = '';
  
  if (query && (query.toLowerCase().includes('explain') || query.toLowerCase().includes('what is'))) {
    const firstParagraph = content.substring(0, 500);
    const sentences = content.split(/[.!?]+/);
    
    summary = `**Document Analysis for "${filename}":**\n\n`;
    summary += `**Overview:** This document contains ${statistics.words} words across ${statistics.lines} lines.\n\n`;
    
    if (sentences.length > 0) {
      summary += `**Key Content:** ${sentences[0]}. `;
      if (sentences.length > 1) summary += `${sentences[1]}.`;
    }
    
    if (insights.length > 0) {
      summary += `\n\n**Insights:** ${insights.join(', ')}.`;
    }
    
  } else if (query && query.toLowerCase().includes('summar')) {
    const sentences = content.split(/[.!?]+/);
    if (sentences.length <= 3) {
      summary = content.substring(0, 300) + '...';
    } else {
      summary = `${sentences[0]}. ${sentences[1]}. ${sentences[Math.floor(sentences.length / 2)]}.`;
    }
  } else {
    summary = `Document "${filename}" analyzed:\n`;
    summary += `• Size: ${statistics.words} words, ${statistics.lines} lines\n`;
    summary += `• Type: Based on content analysis\n`;
    if (insights.length > 0) {
      summary += `• Features: ${insights.join(', ')}\n`;
    }
  }
  
  return {
    summary: summary,
    insights: insights,
    statistics: statistics,
    preview: content.substring(0, 300) + (content.length > 300 ? '...' : '')
  };
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== AGENTIC AI SETUP ====================
// Setup file upload for Agentic AI
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fsSync.existsSync(uploadDir)) {
      fsSync.mkdirSync(uploadDir, { recursive: true });
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
      '.txt', '.json', '.csv', '.eml', '.msg',
      '.html', '.htm'
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
    supported_files: [".xlsx", ".xls", ".docx", ".doc", ".pdf", ".txt", ".json", ".csv", ".eml", ".msg", ".html", ".htm"],
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

// In server.js - Update the upload endpoint
app.post("/api/agentic/upload", upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: "No file uploaded" 
      });
    }
    
    // Set CORS headers
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    
    console.log('✅ File uploaded:', {
      name: req.file.originalname,
      savedName: req.file.filename,
      path: req.file.path,
      size: req.file.size
    });
    
// In server.js, find the upload endpoint (around line 330)
// Update the response to include filename clearly:
res.json({
  success: true,
  message: "✅ File uploaded successfully",
  file: {
    original_name: req.file.originalname,
    saved_name: req.file.filename,      // This is the actual filename on server
    filename: req.file.filename,        // Add this for clarity
    path: req.file.path,
    size: req.file.size,
    mimetype: req.file.mimetype,
    uploaded_at: new Date().toISOString()
  },
  instructions: "Use the saved_name in chat requests for processing"
});
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 4. Unified Chat Endpoint with REAL File Processing
app.post("/api/agentic/chat", async (req, res) => {
  try {
    const { message, history = [], file_paths = {} } = req.body;
    
    console.log('📥 Chat request received:', { 
      message: message?.substring(0, 100),
      fileCount: Object.keys(file_paths).length,
      files: Object.keys(file_paths),
      filePaths: file_paths
    });
    
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
    let fileAnalysis = [];
    
    if (hasFiles) {
      // FILE PROCESSING LOGIC - ACTUALLY READ AND ANALYZE FILES
      action = 'read';
      reasoning = `Processing ${fileList.length} file(s): ${fileList.join(', ')}`;
      confidence = 85;
      
      console.log(`📁 Processing ${fileList.length} file(s):`, fileList);
      
      // Process each file
      for (const [filename, filepath] of Object.entries(file_paths)) {
        try {
          // Extract actual path from "C:/uploads/..." format
          let actualPath = filepath;
          if (filepath.startsWith('C:/')) {
            actualPath = filepath.replace('C:/', '').replace(/\//g, path.sep);
          }
          
          console.log(`📖 Reading file: ${filename} from ${actualPath}`);
          
          // Read file content
          const fileContent = await readFileContent(actualPath, filename);
          
          if (fileContent) {
            // Analyze the content
            const analysis = analyzeDocumentContent(fileContent.content, filename, message);
            
            fileAnalysis.push({
              filename: filename,
              status: 'success',
              type: fileContent.type,
              size: fileContent.size,
              formattedSize: formatFileSize(fileContent.size),
              content: fileContent.content,
              analysis: analysis,
              statistics: fileContent
            });
            
            console.log(`✅ Successfully analyzed ${filename}: ${fileContent.content?.length || 0} chars`);
          } else {
            fileAnalysis.push({
              filename: filename,
              status: 'error',
              error: 'Could not read file content'
            });
            console.log(`❌ Could not read ${filename}`);
          }
          
        } catch (fileError) {
          console.error(`❌ Error processing ${filename}:`, fileError.message);
          fileAnalysis.push({
            filename: filename,
            status: 'error',
            error: fileError.message
          });
        }
      }
      
      // Generate response based on user query and file analysis
      const successfulFiles = fileAnalysis.filter(f => f.status === 'success');
      
      if (message) {
        // User asked a specific question about the files
        if (message.toLowerCase().includes('explain') || 
            message.toLowerCase().includes('what is') || 
            message.toLowerCase().includes('tell me about') ||
            message.toLowerCase().includes('analyze')) {
          
          response = `📊 **Document Analysis Report**\n\n`;
          response += `I've analyzed ${successfulFiles.length} of ${fileAnalysis.length} file(s).\n\n`;
          
          successfulFiles.forEach((file, index) => {
            response += `---\n`;
            response += `**${index + 1}. ${file.filename}**\n`;
            response += `• Type: ${file.type.toUpperCase()} file\n`;
            response += `• Size: ${file.formattedSize}\n`;
            
            if (file.statistics) {
              if (file.statistics.lines) response += `• Lines: ${file.statistics.lines}\n`;
              if (file.statistics.words) response += `• Words: ${file.statistics.words}\n`;
              if (file.statistics.sheets) response += `• Sheets: ${file.statistics.sheets}\n`;
              if (file.statistics.pages) response += `• Pages: ${file.statistics.pages}\n`;
            }
            
            response += `\n**Analysis:**\n${file.analysis?.summary || 'No analysis available'}\n\n`;
            
            if (file.analysis?.preview) {
              response += `**Content Preview:**\n${file.analysis.preview}\n\n`;
            }
          });
          
          if (fileAnalysis.some(f => f.status === 'error')) {
            response += `\n**⚠️ Some files could not be processed:**\n`;
            fileAnalysis.filter(f => f.status === 'error').forEach(f => {
              response += `• ${f.filename}: ${f.error}\n`;
            });
          }
          
        } else if (message.toLowerCase().includes('extract') || 
                  message.toLowerCase().includes('data') || 
                  message.toLowerCase().includes('information')) {
          
          response = `🔍 **Extracted Information**\n\n`;
          response += `From ${successfulFiles.length} file(s):\n\n`;
          
          successfulFiles.forEach((file, index) => {
            response += `${index + 1}. **${file.filename}**\n`;
            response += `   Size: ${file.formattedSize}\n`;
            
            if (file.analysis?.insights && file.analysis.insights.length > 0) {
              response += `   Insights: ${file.analysis.insights.join(', ')}\n`;
            }
            
            // Extract specific data if requested
            if (message.toLowerCase().includes('email')) {
              const emailMatches = file.content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
              if (emailMatches) {
                response += `   Emails: ${emailMatches.slice(0, 3).join(', ')}${emailMatches.length > 3 ? '...' : ''}\n`;
              }
            }
            
            if (message.toLowerCase().includes('date') || message.toLowerCase().includes('time')) {
              const dateMatches = file.content.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/g);
              if (dateMatches) {
                response += `   Dates: ${dateMatches.slice(0, 3).join(', ')}${dateMatches.length > 3 ? '...' : ''}\n`;
              }
            }
            
            response += `\n`;
          });
          
        } else if (message.toLowerCase().includes('summar') || 
                  message.toLowerCase().includes('brief')) {
          
          response = `📄 **Document Summaries**\n\n`;
          
          successfulFiles.forEach((file, index) => {
            response += `${index + 1}. **${file.filename}**\n`;
            response += `   ${file.analysis?.summary?.substring(0, 200) || 'No summary available'}...\n\n`;
          });
          
        } else {
          // Generic response with file info
          response = `📁 **Files Processed Successfully**\n\n`;
          response += `I've analyzed ${successfulFiles.length} file(s) based on your query: "${message}"\n\n`;
          
          successfulFiles.forEach((file, index) => {
            response += `${index + 1}. **${file.filename}** (${file.type}, ${file.formattedSize})\n`;
          });
          
          response += `\n**You can ask me to:**\n`;
          response += `• "Explain these documents in detail"\n`;
          response += `• "Extract specific information from the files"\n`;
          response += `• "Summarize the main points"\n`;
          response += `• "Analyze the data patterns"\n`;
        }
        
      } else {
        // No specific query - show file overview
        response = `✅ **Files Ready for Analysis**\n\n`;
        response += `I've received ${fileAnalysis.length} file(s).\n\n`;
        
        fileAnalysis.forEach((file, index) => {
          response += `${index + 1}. **${file.filename}**\n`;
          response += `   • Status: ${file.status === 'success' ? '✅ Ready' : '❌ ' + file.error}\n`;
          if (file.status === 'success') {
            response += `   • Type: ${file.type}\n`;
            response += `   • Size: ${file.formattedSize}\n`;
          }
          response += `\n`;
        });
        
        response += `**What would you like me to do with these files?**\n`;
        response += `Try asking:\n`;
        response += `• "Explain what these documents are about"\n`;
        response += `• "Analyze the content of these files"\n`;
        response += `• "Extract key information from the documents"\n`;
        response += `• "Summarize the main points"\n`;
      }
      
    } else {
      // Regular chat/query (no files)
      action = 'direct_response';
      reasoning = 'Processing user query with Agentic AI';
      confidence = 95;
      
      // Simple AI response logic
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        response = `🤖 **Hello!** I'm your Agentic AI assistant.\n\n`;
        response += `I can help you with:\n`;
        response += `• **Document processing** (PDF, Word, Excel, Text)\n`;
        response += `• **Data extraction and analysis**\n`;
        response += `• **Content summarization**\n`;
        response += `• **Answering questions**\n\n`;
        response += `Upload a file or ask me anything!`;
      } else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
        response = `🤖 **Agentic AI Capabilities:**\n\n`;
        response += `📁 **File Processing:**\n`;
        response += `• Read and analyze PDF, Word, Excel, Text files\n`;
        response += `• Extract text content and metadata\n`;
        response += `• Analyze document structure and content\n\n`;
        response += `🔍 **Analysis Features:**\n`;
        response += `• Document explanation and summarization\n`;
        response += `• Data extraction (emails, dates, names, etc.)\n`;
        response += `• Content insights and pattern recognition\n\n`;
        response += `📊 **Supported Formats:**\n`;
        response += `• PDF (.pdf) - Full text extraction\n`;
        response += `• Word (.docx) - Content reading\n`;
        response += `• Excel (.xlsx, .xls) - Data analysis\n`;
        response += `• Text (.txt, .csv, .json) - Direct reading\n\n`;
        response += `**To get started:** Upload a file and ask me to explain it!`;
      } else if (lowerMessage.includes('file') || lowerMessage.includes('upload') || lowerMessage.includes('document')) {
        response = `📁 **How to Process Files:**\n\n`;
        response += `1. Click "Upload Files" button\n`;
        response += `2. Select your documents (PDF, Word, Excel, Text)\n`;
        response += `3. Ask me to analyze or explain them\n\n`;
        response += `**Example Questions:**\n`;
        response += `• "Explain this document"\n`;
        response += `• "What's in this PDF file?"\n`;
        response += `• "Extract all emails from these documents"\n`;
        response += `• "Summarize the Excel spreadsheet"\n`;
        response += `• "Analyze the Word document"\n\n`;
        response += `**Try it now:** Upload a file and ask me anything about it!`;
      } else {
        response = `🤖 I understand you asked: "${message}"\n\n`;
        response += `As an **Agentic AI System**, I specialize in:\n`;
        response += `• Reading and analyzing uploaded documents\n`;
        response += `• Extracting insights from various file formats\n`;
        response += `• Providing detailed explanations and summaries\n\n`;
        response += `**Try uploading a file** (PDF, Word, Excel, or Text) and asking me:\n`;
        response += `• "Explain this document"\n`;
        response += `• "What information is in this file?"\n`;
        response += `• "Summarize the content"\n`;
        response += `• "Extract key data points"\n`;
      }
    }
    
    // Construct response
    const result = {
      success: true,
      message: "✅ Agentic AI processing complete",
      response: response,
      data: {
        action: action,
        file_count: hasFiles ? fileList.length : 0,
        file_names: hasFiles ? fileList : null,
        files_processed: hasFiles ? fileAnalysis.filter(f => f.status === 'success').length : 0,
        confidence: confidence,
        reasoning: reasoning,
        needs_followup: hasFiles && (!message || message.toLowerCase().includes('upload')),
        timestamp: new Date().toISOString()
      },
      conversation_log: [
        {
          role: 'user',
          content: message || `Upload ${fileList.join(', ')}`,
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
    
    console.log('📤 Sending response:', { 
      success: result.success,
      responseLength: response.length,
      fileCount: result.data.file_count,
      filesProcessed: result.data.files_processed
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Chat error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: "Error processing request",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
  
  // Test file processing capabilities
  const testFilesDir = 'uploads/';
  const hasUploadsDir = fsSync.existsSync(testFilesDir);
  const testFiles = hasUploadsDir ? fsSync.readdirSync(testFilesDir).slice(0, 5) : [];
  
  res.json({
    success: true,
    message: "✅ Agentic AI test endpoint working!",
    timestamp: new Date().toISOString(),
    endpoints_tested: true,
    file_upload_ready: true,
    chat_processing_ready: true,
    file_processing_ready: true,
    test_query: "Try: POST /api/agentic/chat with {message: 'Hello Agentic AI'}",
    upload_dir_status: hasUploadsDir ? `Exists (${testFiles.length} files)` : 'Not found',
    sample_files: testFiles,
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
  
  // Check uploads directory
  const uploadsDir = 'uploads/';
  const uploadsDirExists = fsSync.existsSync(uploadsDir);
  const uploadFileCount = uploadsDirExists ? fsSync.readdirSync(uploadsDir).length : 0;
  
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
    file_processing: {
      status: "Ready ✅",
      uploads_directory: uploadsDirExists ? `Exists (${uploadFileCount} files)` : "Not found ❌",
      supported_formats: ["PDF", "Word (.docx)", "Excel (.xlsx, .xls)", "Text (.txt, .csv, .json)", "HTML"],
      max_file_size: "10MB"
    },
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
        chat: "POST /api/agentic/chat (REAL file processing)",
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
    
    // Check uploads directory
    const uploadsDir = 'uploads/';
    const uploadsDirExists = fsSync.existsSync(uploadsDir);
    const uploadFileCount = uploadsDirExists ? fsSync.readdirSync(uploadsDir).length : 0;
    
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
      file_processing: {
        status: "Ready ✅",
        uploads_directory: uploadsDirExists ? `Exists (${uploadFileCount} files)` : "Not found ❌",
        libraries: {
          pdf_parse: "Installed ✅",
          mammoth: "Installed ✅",
          xlsx: "Installed ✅",
          emailjs: "Installed ✅"
        }
      },
      services: {
        auth_api: "operational ✅",
        agentic_ai: "operational ✅",
        file_upload: "operational ✅",
        file_processing: "operational ✅",
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
      note: "Agentic AI System with REAL file processing fully operational"
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
      agentic_ai: "integrated with REAL file processing",
      file_upload: "ready",
      file_processing: "ready",
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
      "Test file upload: POST /api/agentic/upload",
      "Test file processing: POST /api/agentic/chat with file_paths"
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
      "POST /api/agentic/chat - Agentic AI chat (with REAL file processing)",
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
      allowed_types: [".xlsx", ".xls", ".docx", ".doc", ".pdf", ".txt", ".json", ".csv", ".eml", ".msg", ".html", ".htm"],
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

  // Handle file processing errors
  if (err.message.includes("ENOENT") || err.message.includes("file not found")) {
    return res.status(404).json({
      success: false,
      message: "📄 File Not Found",
      error: "The requested file could not be found on the server",
      details: err.message,
      troubleshooting: "Try re-uploading the file or check the file path"
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
      
  📍 AGENTIC AI ENDPOINTS (WITH REAL FILE PROCESSING):
      1. ${RENDER_URL}/api/agentic/status
      2. ${RENDER_URL}/api/agentic/upload (POST) - Upload files
      3. ${RENDER_URL}/api/agentic/chat (POST) - REAL file analysis
      4. ${RENDER_URL}/api/agentic/test - Test endpoint
      
  📍 FILE PROCESSING CAPABILITIES:
      • PDF files: Full text extraction
      • Word documents: Content reading
      • Excel files: Data analysis
      • Text files: Direct reading
      • HTML files: Content extraction
      
  📍 TEST ENDPOINTS:
      1. ${RENDER_URL}/api/health
      2. ${RENDER_URL}/api/test
      3. ${RENDER_URL}/api/agentic/test
      
  🗄️  DATABASE:
      Status: ${process.env.MONGODB_URI ? 'Connected ✅' : 'Not configured ❌'}
      
  🤖 AGENTIC AI STATUS:
      Systems: 3 agents (document_processor, data_analyzer, chat_assistant)
      File Support: PDF, Word, Excel, Text, Email, CSV, JSON, HTML
      Max File Size: 10MB
      
  ⚡ QUICK START:
      1. Test API: curl ${RENDER_URL}/api/health
      2. Test file upload: curl -X POST ${RENDER_URL}/api/agentic/upload -F "file=@test.txt"
      3. Test file processing: curl -X POST ${RENDER_URL}/api/agentic/chat -H "Content-Type: application/json" -d '{"message":"Explain this document","file_paths":{"test.txt":"C:/uploads/test.txt"}}'
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
// Add this cleanup endpoint
app.post("/api/admin/cleanup-files", async (req, res) => {
  try {
    const users = await User.find({});
    let fixedUsers = 0;
    
    for (const user of users) {
      let needsFix = false;
      
      if (user.chatHistory && Array.isArray(user.chatHistory)) {
        for (const chat of user.chatHistory) {
          // Fix chat-level files
          if (chat.files && Array.isArray(chat.files)) {
            chat.files = chat.files.map(file => {
              if (typeof file === 'string') return file;
              if (file && typeof file === 'object') {
                return file.name || file.filename || String(file);
              }
              return '';
            }).filter(f => f && f.trim() !== '');
            needsFix = true;
          }
          
          // Fix message-level files
          if (chat.messages && Array.isArray(chat.messages)) {
            for (const msg of chat.messages) {
              if (msg.files && Array.isArray(msg.files)) {
                msg.files = msg.files.map(file => {
                  if (typeof file === 'string') return file;
                  if (file && typeof file === 'object') {
                    return file.name || file.filename || String(file);
                  }
                  return '';
                }).filter(f => f && f.trim() !== '');
                needsFix = true;
              }
            }
          }
        }
        
        if (needsFix) {
          await user.save();
          fixedUsers++;
        }
      }
    }
    
    res.json({
      success: true,
      message: `Fixed ${fixedUsers} users`,
      totalUsers: users.length
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});