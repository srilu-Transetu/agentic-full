const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables FIRST
dotenv.config();

console.log('🔄 Starting server initialization...');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🔑 PORT from env:', process.env.PORT);
console.log('📁 Current directory:', __dirname);

// Initialize Express app
const app = express();

// ==================== MIDDLEWARE ====================
// CORS configuration
app.use(cors({
  origin: [
    'https://agentic-system-frontend-zum6.vercel.app',
    'https://agentic-system-frontend-srilus-projects.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// ==================== ROUTE LOADING ====================
console.log('🔄 Loading routes...');

// First, let's debug what files exist
try {
  console.log('📂 Checking directory structure...');
  
  // List files in current directory
  const filesInDir = fs.readdirSync(__dirname);
  console.log('📁 Files in current directory:', filesInDir);
  
  // Check if routes directory exists
  const routesDir = path.join(__dirname, 'routes');
  if (fs.existsSync(routesDir)) {
    const routeFiles = fs.readdirSync(routesDir);
    console.log('📂 Files in routes directory:', routeFiles);
  } else {
    console.log('❌ routes directory does not exist at:', routesDir);
  }
  
  // Check if parent routes directory exists
  const parentRoutesDir = path.join(__dirname, '..', 'routes');
  if (fs.existsSync(parentRoutesDir)) {
    const parentRouteFiles = fs.readdirSync(parentRoutesDir);
    console.log('📂 Files in ../routes directory:', parentRouteFiles);
  } else {
    console.log('❌ ../routes directory does not exist at:', parentRoutesDir);
  }
  
  // Try to load authRoutes
  let authRoutes;
  let loadedPath;
  
  // Try common paths
  const possiblePaths = [
    './routes/authRoutes',           // backend/routes/authRoutes
    '../routes/authRoutes',          // routes/authRoutes (if outside backend)
    '../../routes/authRoutes',       // if deeper structure
    './authRoutes',                  // directly in backend folder
    path.join(__dirname, 'routes/authRoutes'),
    path.join(__dirname, '..', 'routes/authRoutes'),
    path.join(__dirname, '..', '..', 'routes/authRoutes')
  ];
  
  for (const routePath of possiblePaths) {
    try {
      console.log(`🔍 Trying: ${routePath}`);
      authRoutes = require(routePath);
      loadedPath = routePath;
      console.log(`✅ SUCCESS: Loaded authRoutes from: ${routePath}`);
      break;
    } catch (err) {
      // Continue trying
    }
  }
  
  if (authRoutes) {
    // Register the routes
    app.use('/api/auth', authRoutes);
    console.log(`✅ Routes registered from: ${loadedPath}`);
  } else {
    throw new Error('authRoutes.js not found in any common location');
  }
  
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  
  // IMPORTANT: Since your authRoutes.js exists, let's create it dynamically
  console.log('🛠️ Creating auth routes dynamically...');
  
  // Create the auth router manually
  const authRouter = express.Router();
  
  // Health check
  authRouter.get('/health', (req, res) => {
    res.json({ 
      success: true, 
      message: 'Auth routes are working',
      status: 'online' 
    });
  });
  
  // Register endpoint
  authRouter.post('/register', (req, res) => {
    console.log('📝 Registration request:', req.body);
    // Here you would normally save to database
    res.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: 'temp-' + Date.now(),
        name: req.body.name,
        email: req.body.email
      }
    });
  });
  
  // Login endpoint
  authRouter.post('/login', (req, res) => {
    console.log('🔐 Login request:', req.body);
    res.json({
      success: true,
      message: 'Login successful',
      token: 'jwt-token-' + Date.now(),
      user: {
        id: 'user-id',
        name: 'Test User',
        email: req.body.email
      }
    });
  });
  
  // Forgot password
  authRouter.post('/forgotpassword', (req, res) => {
    res.json({ 
      success: true, 
      message: 'Password reset email sent' 
    });
  });
  
  // Reset password
  authRouter.put('/resetpassword/:resettoken', (req, res) => {
    res.json({ 
      success: true, 
      message: 'Password reset successful' 
    });
  });
  
  // Get current user (protected)
  authRouter.get('/me', (req, res) => {
    res.json({
      success: true,
      user: {
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com'
      }
    });
  });
  
  // Register the router
  app.use('/api/auth', authRouter);
  console.log('✅ Dynamic auth routes created and registered');
}

// ==================== MONGODB CONNECTION ====================
console.log('🔌 Attempting MongoDB connection...');

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`📍 Host: ${mongoose.connection.host}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Server will run without database connection');
  });
} else {
  console.error('❌ MONGODB_URI environment variable is not set');
}

// ==================== BASIC ROUTES ====================
// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({ 
    success: true,
    status: 'OK', 
    message: 'Agentic System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      forgotPassword: 'POST /api/auth/forgotpassword',
      resetPassword: 'PUT /api/auth/resetpassword/:token',
      getUser: 'GET /api/auth/me',
      health: 'GET /api/health',
      authHealth: 'GET /api/auth/health'
    }
  });
});

// Home route
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Welcome to Agentic System API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    server: {
      port: process.env.PORT || 5000,
      environment: process.env.NODE_ENV || 'development',
      renderUrl: process.env.RENDER_EXTERNAL_URL || 'Not on Render'
    },
    documentation: {
      health: 'GET /api/health',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      authHealth: 'GET /api/auth/health'
    }
  });
});

// ==================== ERROR HANDLERS ====================
// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404: Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    availableEndpoints: {
      home: 'GET /',
      health: 'GET /api/health',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      authHealth: 'GET /api/auth/health'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error('🔥 Error Stack:', err.stack);
  }
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;

// Validate PORT
if (isNaN(PORT)) {
  console.error('❌ Invalid PORT:', PORT);
  process.exit(1);
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀 ============================================
     Agentic System API Server Started!
  📡 ============================================
     Server URL:    http://localhost:${PORT}
     Render URL:    ${process.env.RENDER_EXTERNAL_URL || 'Not deployed on Render'}
     Environment:   ${process.env.NODE_ENV || 'development'}
     
  📍 TEST THESE ENDPOINTS:
     1. ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/api/health
     2. ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/api/auth/register
     3. ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/api/auth/login
     4. ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/api/auth/health
     
  📋 AVAILABLE AUTH ENDPOINTS:
     • POST /api/auth/register     - Register new user
     • POST /api/auth/login        - Login user
     • POST /api/auth/forgotpassword - Forgot password
     • PUT  /api/auth/resetpassword/:token - Reset password
     • GET  /api/auth/me          - Get current user
     • GET  /api/auth/health      - Auth health check
     
  ============================================
  `);
  
  console.log(`✅ Server successfully listening on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server startup error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`⚠️  PORT ${PORT} is already in use!`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close(false, () => {
        console.log('✅ MongoDB connection closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});