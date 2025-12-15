import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://agentic-system-1.onrender.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
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

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response.data;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      // Clear token and redirect on unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    // Return a consistent error format
    return Promise.reject({
      success: false,
      message: error.response?.data?.message || error.message || 'Network error. Please check your connection.',
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

// Health check with better error handling
export const checkHealth = async () => {
  try {
    console.log('🩺 Checking backend health...');
    const response = await api.get('/health');
    console.log('✅ Backend health:', response);
    return response;
  } catch (error) {
    console.error('❌ Health check failed:', error);
    throw {
      success: false,
      message: 'Cannot connect to backend server. Please ensure backend is running on port 5000.',
      details: error.message
    };
  }
};

// Auth API
export const authAPI = {
  // Register user with better error handling
  register: async (userData) => {
    try {
      console.log('📝 Attempting registration for:', userData.email);
      const response = await api.post('/auth/register', userData);
      
      if (response.success && response.token) {
        console.log('✅ Registration successful');
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          // Initialize empty chat history for new user
          localStorage.setItem(`chats_${response.user.id}`, JSON.stringify([]));
        }
      }
      
      return response;
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      console.log('🔐 Attempting login for:', credentials.email);
      const response = await api.post('/auth/login', credentials);
      
      if (response.success && response.token) {
        console.log('✅ Login successful');
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          // Initialize chat history if not exists
          if (!localStorage.getItem(`chats_${response.user.id}`)) {
            localStorage.setItem(`chats_${response.user.id}`, JSON.stringify([]));
          }
        }
      }
      
      return response;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgotpassword', { email });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Reset password
  resetPassword: async (token, password) => {
    try {
      const response = await api.put(`/auth/resetpassword/${token}`, { password });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      const response = await api.put('/auth/changepassword', passwordData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Logout
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  },

  // CHAT HISTORY METHODS - NEWLY ADDED

  // Save chat history
  saveChat: async (chatData) => {
    try {
      console.log('💾 Saving chat:', chatData.chatId);
      const response = await api.post('/auth/chats', chatData);
      return response;
    } catch (error) {
      console.error('❌ Save chat error:', error);
      
      // Fallback to localStorage if API fails
      if (typeof window !== 'undefined') {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const chats = JSON.parse(localStorage.getItem(`chats_${userData.id}`) || '[]');
        
        const existingChatIndex = chats.findIndex(chat => chat.chatId === chatData.chatId);
        
        if (existingChatIndex >= 0) {
          chats[existingChatIndex] = chatData;
        } else {
          chats.push(chatData);
        }
        
        localStorage.setItem(`chats_${userData.id}`, JSON.stringify(chats));
        
        return {
          success: true,
          message: 'Chat saved locally',
          chatId: chatData.chatId
        };
      }
      
      throw error;
    }
  },

  // Get chat history
  getChats: async () => {
    try {
      console.log('📚 Loading chat history');
      const response = await api.get('/auth/chats');
      return response;
    } catch (error) {
      console.error('❌ Get chats error:', error);
      
      // Fallback to localStorage if API fails
      if (typeof window !== 'undefined') {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const chats = JSON.parse(localStorage.getItem(`chats_${userData.id}`) || '[]');
        
        return {
          success: true,
          chats: chats
        };
      }
      
      throw error;
    }
  },

  // Delete chat
  deleteChat: async (chatId) => {
    try {
      console.log('🗑️ Deleting chat:', chatId);
      const response = await api.delete(`/auth/chats/${chatId}`);
      return response;
    } catch (error) {
      console.error('❌ Delete chat error:', error);
      
      // Fallback to localStorage if API fails
      if (typeof window !== 'undefined') {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        let chats = JSON.parse(localStorage.getItem(`chats_${userData.id}`) || '[]');
        chats = chats.filter(chat => chat.chatId !== chatId);
        localStorage.setItem(`chats_${userData.id}`, JSON.stringify(chats));
        
        return {
          success: true,
          message: 'Chat deleted locally'
        };
      }
      
      throw error;
    }
  },

  // Sync local chats with server
  syncChats: async () => {
    if (typeof window !== 'undefined') {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const localChats = JSON.parse(localStorage.getItem(`chats_${userData.id}`) || '[]');
      
      // Save each local chat to server
      for (const chat of localChats) {
        try {
          await api.post('/auth/chats', chat);
        } catch (error) {
          console.error('Failed to sync chat:', chat.chatId, error);
        }
      }
      
      // Clear local storage after successful sync
      localStorage.removeItem(`chats_${userData.id}`);
      
      return {
        success: true,
        message: 'Chats synced successfully'
      };
    }
  }
};

export default api;