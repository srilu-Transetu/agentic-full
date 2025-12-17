// frontend/services/api.js - UPDATED AND CORRECTED VERSION
import axios from 'axios';

// ==================== SINGLE BACKEND URL ====================
// Using environment variable for flexibility
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://agentic-system-1.onrender.com';

console.log('🚀 API Base URL:', API_BASE_URL);

// Create axios instance with better error handling
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
  withCredentials: false,
});

// Request interceptor - FIXED TO ADD TOKEN PROPERLY
api.interceptors.request.use(
  (config) => {
    // Log request for debugging
    console.log(`🌐 ${config.method?.toUpperCase()} Request to:`, config.url);
    
    // Add authorization token if exists
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} Response from:`, response.config.url);
    return response;
  },
  (error) => {
    // Network errors (server not reachable)
    if (error.code === 'ERR_NETWORK') {
      console.error('🌐 Network Error: Cannot connect to server');
      console.error('Please check:');
      console.error('1. Backend server is running at', API_BASE_URL);
      console.error('2. Your network connection is working');
      console.error('3. No CORS issues (check browser console)');
      
      return Promise.reject({
        success: false,
        message: `Cannot connect to the server at ${API_BASE_URL}`,
        details: 'Please check if the backend server is running and accessible',
        code: 'NETWORK_ERROR',
        status: 0
      });
    }
    
    // Timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timeout');
      return Promise.reject({
        success: false,
        message: 'Request timeout. Server is taking too long to respond.',
        details: 'Try again or check server status',
        code: 'TIMEOUT',
        status: 408
      });
    }

    // HTTP errors
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      responseData: error.response?.data
    });

    // Handle specific status codes
    if (error.response?.status === 401) {
      console.log('🔒 401 Unauthorized - clearing storage');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('agentic_ai_user');
      }
    }

    // Return a consistent error format
    return Promise.reject({
      success: false,
      message: error.response?.data?.message || 
               error.response?.data?.error || 
               error.message || 
               'Unknown error occurred',
      status: error.response?.status,
      data: error.response?.data,
      code: error.code
    });
  }
);

// ==================== IMPROVED HEALTH CHECK ====================
export const checkHealth = async () => {
  try {
    console.log('🩺 Checking backend health...');
    const startTime = Date.now();
    
    const response = await api.get('/api/health', {
      timeout: 10000 // 10 seconds for health check
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`✅ Backend health check passed in ${responseTime}ms`);
    
    return {
      success: true,
      status: response.status,
      message: response.data?.message || 'Server is healthy',
      responseTime,
      timestamp: new Date().toISOString(),
      data: response.data
    };
  } catch (error) {
    console.log('⚠️ Health check failed:', error.message);
    
    // Provide more detailed error information
    let errorDetails = 'Unknown error';
    if (error.code === 'ERR_NETWORK') {
      errorDetails = `Cannot connect to ${API_BASE_URL}. Server might be down or unreachable.`;
    } else if (error.code === 'ECONNABORTED') {
      errorDetails = 'Server took too long to respond. It might be overloaded or having issues.';
    } else if (error.response?.status) {
      errorDetails = `Server responded with status ${error.response.status}`;
    }
    
    return {
      success: false,
      message: 'Health check failed',
      details: errorDetails,
      error: error.message,
      code: error.code,
      status: error.status,
      timestamp: new Date().toISOString(),
      suggestion: 'Please check if your backend server is running and accessible.'
    };
  }
};

// ==================== CONNECTION TEST UTILITY ====================
export const testConnection = async () => {
  console.log('🔌 Testing connection to backend...');
  
  // Try multiple endpoints to see what works
  const endpoints = [
    '/api/health',
    '/',
    '/api/auth/test'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying ${endpoint}...`);
      const response = await axios.get(API_BASE_URL + endpoint, {
        timeout: 5000
      });
      
      console.log(`✅ Successfully connected to ${endpoint}`);
      return {
        success: true,
        endpoint,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      console.log(`❌ Failed to connect to ${endpoint}:`, error.message);
    }
  }
  
  return {
    success: false,
    message: `Could not connect to any endpoint at ${API_BASE_URL}`,
    suggestion: 'Check if the server is running and the URL is correct'
  };
};

// ==================== UNIFIED API ====================
export const agenticAPI = {
  // ========== CONNECTION & HEALTH ==========
  healthCheck: checkHealth,
  
  testConnection: testConnection,

  // ========== AUTH ENDPOINTS ==========
  register: async (userData) => {
    try {
      console.log('📝 Registering:', userData.email);
      const response = await api.post('/api/auth/register', userData);
      
      if (response.data.success && response.data.token) {
        console.log('✅ Registration successful');
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('agentic_ai_user', JSON.stringify(response.data.user));
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Registration error:', error.message);
      
      // Provide better error message
      if (error.code === 'ERR_NETWORK') {
        throw {
          ...error,
          userMessage: `Cannot connect to server. Please make sure the backend is running at ${API_BASE_URL}`
        };
      }
      
      throw error;
    }
  },

  login: async (credentials) => {
    try {
      console.log('🔐 Logging in:', credentials.email);
      const response = await api.post('/api/auth/login', credentials);
      
      if (response.data.success && response.data.token) {
        console.log('✅ Login successful');
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('agentic_ai_user', JSON.stringify(response.data.user));
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Enhanced error handling for login
      let userMessage = 'Login failed';
      
      if (error.code === 'ERR_NETWORK') {
        userMessage = `Cannot connect to server. Please check if the backend is running at ${API_BASE_URL}`;
      } else if (error.status === 401) {
        userMessage = 'Invalid email or password';
      } else if (error.status === 404) {
        userMessage = 'Login endpoint not found. Check backend routes.';
      }
      
      throw {
        ...error,
        userMessage
      };
    }
  },

  getCurrentUser: async () => {
    try {
      console.log('👤 Getting current user');
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (error) {
      console.error('❌ Get current user error:', error.message);
      
      // If 401, clear storage
      if (error.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('agentic_ai_user');
        }
      }
      
      throw error;
    }
  },

  logout: () => {
    console.log('🚪 Logging out');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('agentic_ai_user');
    }
    return Promise.resolve({ success: true });
  },

  changePassword: async (passwordData) => {
    try {
      console.log('🔐 Changing password');
      const response = await api.put('/api/auth/changepassword', passwordData);
      return response.data;
    } catch (error) {
      console.error('❌ Change password error:', error.message);
      throw error;
    }
  },

  // ========== CHAT HISTORY ENDPOINTS ==========
  saveChat: async (chatData) => {
    try {
      console.log('💾 Saving chat:', chatData.chatId);
      
      if (!chatData.chatId) {
        console.error('❌ chatId is required but not provided');
        return {
          success: false,
          message: 'chatId is required',
          status: 400
        };
      }
      
      const formattedData = {
        chatId: chatData.chatId,
        title: chatData.title || 'New Chat',
        messages: Array.isArray(chatData.messages) ? chatData.messages : [],
        files: Array.isArray(chatData.files) ? chatData.files : [],
        date: chatData.date || new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        time: chatData.time || new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
      
      console.log('📤 Sending chat data:', formattedData);
      
      const response = await api.post('/api/auth/chats', formattedData);
      console.log('✅ Save chat response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Save chat error:', error);
      
      return {
        success: false,
        message: error.message || 'Failed to save chat',
        status: error.status || 500,
        data: error.data
      };
    }
  },

  getChats: async () => {
    try {
      console.log('📚 Loading chats');
      const response = await api.get('/api/auth/chats');
      return response.data;
    } catch (error) {
      console.error('❌ Get chats error:', error.message);
      
      return {
        success: false,
        chats: [],
        message: error.message
      };
    }
  },

  deleteChat: async (chatId) => {
    try {
      console.log('🗑️ Deleting chat:', chatId);
      const response = await api.delete(`/api/auth/chats/${chatId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Delete chat error:', error.message);
      throw error;
    }
  },

  // ========== AGENTIC AI ENDPOINTS ==========
  getStatus: async () => {
    try {
      console.log('🤖 Checking Agentic AI status');
      const response = await api.get('/api/agentic/status');
      return response.data;
    } catch (error) {
      console.error('❌ Agentic status error:', error.message);
      return {
        success: false,
        model_initialized: false,
        model_name: "Not connected",
        systems_count: 0,
        available_systems: [],
        message: error.message
      };
    }
  },

  chat: async (message, history = [], file_paths = {}) => {
    try {
      console.log('💬 Sending chat to Agentic AI:', message.substring(0, 50));
      
      const response = await api.post('/api/agentic/chat', {
        message,
        history,
        file_paths
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Agentic chat error:', error.message);
      
      return {
        success: false,
        response: "Sorry, I'm having trouble connecting to the AI service. Please try again.",
        data: null,
        file_outputs: [],
        message: error.message
      };
    }
  },

  uploadFile: async (file) => {
    try {
      console.log('📤 Uploading file:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/api/agentic/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('📤 Upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ File upload error:', error);
      throw error;
    }
  },

  testChat: async () => {
    try {
      console.log('🧪 Testing chat endpoint');
      const response = await api.get('/api/agentic/test');
      return response.data;
    } catch (error) {
      console.error('❌ Test chat error:', error.message);
      throw error;
    }
  }
};

// For backward compatibility
export const authAPI = agenticAPI;

// Default expoitrt
export default agenticAPI;