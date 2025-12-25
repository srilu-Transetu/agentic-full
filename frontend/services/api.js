// frontend/services/api.js - AUTHENTICATION ONLY VERSION
import axios from 'axios';

// ==================== SINGLE BACKEND URL ====================
// Using environment variable for flexibility
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

// ==================== UNIFIED API ====================
export const authAPI = {
  // ========== HEALTH CHECK ==========
  healthCheck: checkHealth,

  // ========== AUTHENTICATION ENDPOINTS ==========
  
  // 1. Register new user
  register: async (userData) => {
    try {
      console.log('📝 Registering user:', userData.email);
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
      
      if (error.code === 'ERR_NETWORK') {
        throw {
          ...error,
          userMessage: `Cannot connect to server. Please make sure the backend is running at ${API_BASE_URL}`
        };
      }
      
      throw error;
    }
  },

  // 2. User login
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

  // 3. Password reset request
  forgotPassword: async (email) => {
    try {
      console.log('🔑 Forgot password request:', email);
      const response = await api.post('/api/auth/forgot-password', { email });
      console.log('✅ Forgot password request sent');
      return response.data;
    } catch (error) {
      console.error('❌ Forgot password error:', error.message);
      
      let userMessage = 'Failed to process password reset request';
      if (error.code === 'ERR_NETWORK') {
        userMessage = 'Cannot connect to server. Please check your internet connection.';
      }
      
      throw {
        ...error,
        userMessage
      };
    }
  },

  // 4. Reset password with token
resetPassword: async (token, newPassword) => {
  try {
    console.log('🔄 Resetting password with token');
    const response = await api.put(`/api/auth/resetpassword/${token}`, {
      password: newPassword
    });
    return response.data;
  } catch (error) {
      console.error('❌ Reset password error:', error.message);
      
      let userMessage = 'Failed to reset password';
      if (error.status === 400) {
        userMessage = 'Invalid or expired reset token';
      }
      
      throw {
        ...error,
        userMessage
      };
    }
  },

// Change this in your frontend/services/api.js
// Update ONLY the changePassword function:

// 5. Change password (authenticated)
changePassword: async (passwordData) => {
  try {
    console.log('🔐 Changing password...', {
      hasCurrentPassword: !!passwordData.currentPassword,
      hasNewPassword: !!passwordData.newPassword,
      hasConfirmPassword: !!passwordData.confirmNewPassword
    });
    
    const response = await api.put('/api/auth/changepassword', {
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
      confirmNewPassword: passwordData.confirmNewPassword
    });
    
    console.log('✅ Password changed successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Change password error:', {
      message: error.message,
      status: error.status,
      data: error.data
    });
    
    let userMessage = 'Failed to change password';
    
    if (error.status === 401) {
      userMessage = 'Session expired. Please login again.';
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('agentic_ai_user');
      }
    } else if (error.status === 400) {
      userMessage = error.data?.message || 'Invalid request. Please check your inputs.';
    } else if (error.code === 'ERR_NETWORK') {
      userMessage = 'Cannot connect to server. Please check your connection.';
    }
    
    throw {
      ...error,
      userMessage
    };
  }
},

  // 6. Validate JWT token
  verifyToken: async () => {
    try {
      console.log('🔍 Verifying JWT token');
      const response = await api.get('/api/auth/me');
      console.log('✅ Token is valid');
      return response.data;
    } catch (error) {
      console.error('❌ Token verification error:', error.message);
      
      // Clear storage if token is invalid
      if (error.status === 401) {
        console.log('🔒 Invalid token - clearing storage');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('agentic_ai_user');
        }
      }
      
      throw error;
    }
  },

  // 7. Get current user
  getMe: async () => {
    try {
      console.log('👤 Getting current user');
      const response = await api.get('/api/auth/me');
      console.log('✅ User data retrieved');
      return response.data;
    } catch (error) {
      console.error('❌ Get user error:', error.message);
      throw error;
    }
  },

  // 8. User logout (server-side)
  logout: async () => {
    try {
      console.log('🚪 Logging out from server');
      const response = await api.post('/api/auth/logout');
      
      // Always clear localStorage on logout
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('agentic_ai_user');
      }
      
      console.log('✅ Logout successful');
      return response.data;
    } catch (error) {
      console.error('❌ Logout error:', error.message);
      
      // Still clear localStorage even if server logout fails
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('agentic_ai_user');
      }
      
      // Return success anyway since localStorage is cleared
      return {
        success: true,
        message: 'Logged out locally (server logout failed)'
      };
    }
  },

  // Helper function to check if user is logged in
  isAuthenticated: () => {
    if (typeof window === 'undefined') return false;
    
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('agentic_ai_user');
    
    return !!(token && user);
  },

  // Helper to get current user from localStorage
  getCurrentUser: () => {
    if (typeof window === 'undefined') return null;
    
    try {
      const userStr = localStorage.getItem('agentic_ai_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      return null;
    }
  },

  // Helper to get token
  getToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  },

  // ==================== AGENTIC SYSTEM ENDPOINTS ====================
  agentic: {
    // 1. Upload File
    uploadFile: async (file) => {
      try {
        console.log('its uploading file...', file.name);
        const formData = new FormData();
        formData.append('file', file);
        
        // Remove Content-Type header to let browser set it with boundary
        const response = await api.post('/api/agentic/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        console.log('✅ File uploaded:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Upload error:', error);
        throw error;
      }
    },

    // 2. Chat with Agentic System
    chat: async (message, filePaths = {}, history = []) => {
      try {
        console.log('🤖 Sending to Agentic AI:', { message, fileCount: Object.keys(filePaths).length });
        
        const payload = {
          message: message, // Changed from query to message to match backend
          history: history,
          file_paths: filePaths
        };

        const response = await api.post('/api/agentic/chat', payload);
        console.log('✅ Agentic response:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ Chat error:', error);
        throw error;
      }
    },

    // 3. Get System Status
    getStatus: async () => {
      try {
        const response = await api.get('/api/agentic/status');
        return response.data;
      } catch (error) {
        console.error('❌ Status check error:', error);
        throw error;
      }
    },
    
    // 4. Test Endpoint
    test: async () => {
       try {
        const response = await api.get('/api/agentic/test');
        return response.data;
      } catch (error) {
        console.error('❌ Test error:', error);
        throw error;
      }
    }
  }
};

// For backward compatibility
export const agenticAPI = authAPI;

// Default export
export default authAPI;