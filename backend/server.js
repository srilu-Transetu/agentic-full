const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to database
const dbConnection = connectDB();

// Route files
const authRoutes = require("./routes/authRoutes");

const app = express();

// ==================== CORS CONFIGURATION ====================
// Universal CORS configuration for all Vercel URLs
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) {
      return callback(null, true);
    }

    // Debug logging
    console.log(`🌐 CORS checking origin: ${origin}`);
    
    // List of ALL allowed origins and patterns
    const allowedPatterns = [
      // Exact matches
      "http://localhost:3000",
      "https://agentic-system-frontend.vercel.app",
      "https://agentic-system-front-end.vercel.app", 
      "https://agentic-system-1.onrender.com",
      "https://agentic-system-frontend-67k3.vercel.app",
      
      // Vercel patterns - match ALL variations
      /^https:\/\/agentic-system-front(end|-end|-)[\w-]*\.vercel\.app$/,
      /^https:\/\/agentic-system-front(end|-end|-)[a-zA-Z0-9-]*\.vercel\.app$/,
      /^https:\/\/agentic-system-front(end|-end|-)[a-zA-Z0-9-]*-srilus-projects\.vercel\.app$/,
      
      // Catch-all for any agentic-system Vercel domain
      /^https:\/\/agentic-system-[\w-]+\.vercel\.app$/,
      /^https:\/\/agentic-system-[a-zA-Z0-9-]+\.vercel\.app$/,
      /^https:\/\/agentic-system-[a-zA-Z0-9-]+-[a-zA-Z0-9-]+-srilus-projects\.vercel\.app$/
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
      // Final fallback: If it's a Vercel domain with agentic-system, allow it
      if (origin.includes('agentic-system') && origin.includes('.vercel.app')) {
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

// Remove the manual app.options("*") handler - CORS middleware handles it

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
    version: "2.0.0",
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
      health: "GET /api/health",
      test: "GET /api/test"
    },
    documentation: "https://agentic-system-1.onrender.com/api/health for full API details"
  });
});

// Enhanced health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const mongoose = require("mongoose");
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
      cors: {
        status: "configured",
        allowed_patterns: [
          "http://localhost:3000",
          "https://agentic-system-frontend.vercel.app",
          "https://agentic-system-front-end.vercel.app",
          "https://agentic-system-1.onrender.com",
          "https://agentic-system-frontend-67k3.vercel.app",
          "/^https:\\/\\/agentic-system-[\\w-]+\\.vercel\\.app$/ (all Vercel domains)"
        ],
        request_origin: origin || "No origin header",
        access_control: "Allowed ✅ (This request passed CORS)"
      },
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        heap_total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
        heap_used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
      },
      note: "CORS is properly configured for ALL Vercel preview deployments including front, frontend, and front-end variations"
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
  
  // Check if origin would be allowed - SIMPLIFIED
  const isAllowed = !origin || 
    origin.includes('localhost') || 
    origin.includes('agentic-system-1.onrender.com') ||
    (origin.includes('agentic-system') && origin.includes('.vercel.app'));
  
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
      version: "2.0.0",
      cors_enabled: true
    },
    cors_configuration: {
      note: "ALL Vercel domains with 'agentic-system' prefix are automatically allowed",
      patterns: [
        "agentic-system-front.vercel.app",
        "agentic-system-frontend.vercel.app", 
        "agentic-system-front-end.vercel.app",
        "agentic-system-*-srilus-projects.vercel.app"
      ]
    },
    next_steps: [
      "Test registration: POST /api/auth/register",
      "Test login: POST /api/auth/login",
      "Check response headers for 'Access-Control-Allow-Origin'"
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
      "POST /api/auth/register - User registration",
      "POST /api/auth/login   - User login",
      "GET  /api/auth/me      - Get current user",
      "POST /api/auth/chats   - Save chat",
      "GET  /api/auth/chats   - Get all chats",
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
        "1. Your frontend origin must contain 'agentic-system'",
        "2. Your frontend must be a *.vercel.app domain",
        "3. All Vercel preview URLs are automatically allowed",
        "4. Check console logs for CORS debugging information"
      ],
      troubleshooting: "If you see this error, please share the exact URL with the development team"
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
      Frontend URL:  ${process.env.FRONTEND_URL || 'https://agentic-system-frontend.vercel.app'}
      
  ✅ CORS ALLOWED ORIGINS:
      1. http://localhost:3000
      2. https://agentic-system-frontend.vercel.app
      3. https://agentic-system-front-end.vercel.app
      4. https://agentic-system-1.onrender.com
      5. https://agentic-system-frontend-67k3.vercel.app
      6. ALL Vercel domains matching:
         - agentic-system-front.*.vercel.app
         - agentic-system-frontend.*.vercel.app
         - agentic-system-front-end.*.vercel.app
         - agentic-system-*-srilus-projects.vercel.app
      
  📍 TEST ENDPOINTS:
      1. ${RENDER_URL}/api/health
      2. ${RENDER_URL}/api/test
      3. ${RENDER_URL}/api/auth/register (POST)
      
  🗄️  DATABASE:
      Status: ${process.env.MONGODB_URI ? 'Configured ✅' : 'Not configured ❌'}
      Host: ${process.env.MONGODB_URI ? 'MongoDB Atlas' : 'Unknown'}
      
  ⚡ QUICK START:
      1. Test API: curl ${RENDER_URL}/api/health
      2. Check CORS: curl -H "Origin: https://agentic-system-front-dqkbwu21t-srilus-projects.vercel.app" ${RENDER_URL}/api/test
      3. Register: curl -X POST ${RENDER_URL}/api/auth/register -H "Content-Type: application/json" -d '{"name":"Test","email":"test@test.com","password":"Test@123"}'
      
  ================================================
  `);
});

// ==================== HELPER FUNCTIONS ====================
function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

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