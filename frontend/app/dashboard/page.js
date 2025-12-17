'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import agenticAPI from '@/services/api'
import { 
  MessageSquare, Search, Plus, Send, Upload,
  FileText, X, Menu, MoreVertical, Edit2, Share2, Trash2,
  LogOut, Bot, Sparkles, RefreshCw, Key, FileUp,
  Cpu, UploadCloud, Brain, Zap, FileIcon
} from 'lucide-react'

// Global variable to track mount state
let isDashboardMounted = false;

export default function DashboardPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [chats, setChats] = useState([])
  const [currentChat, setCurrentChat] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const fileInputRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [menuOpen, setMenuOpen] = useState(null)
  const [user, setUser] = useState({
    name: 'Loading...',
    email: 'Loading...',
    photo: null,
    id: null
  })
  const [loadingChats, setLoadingChats] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [agenticStatus, setAgenticStatus] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')

  // Mount protection
  useEffect(() => {
    if (isDashboardMounted) {
      console.warn('🚨 Dashboard already mounted! Preventing duplicate mount.');
      return;
    }
    
    isDashboardMounted = true;
    console.log('📱 Dashboard mounted');
    
    return () => {
      isDashboardMounted = false;
      console.log('📱 Dashboard unmounted');
    };
  }, []);

// In dashboard.js, update the saveChatToServer function:
const saveChatToServer = useCallback(async (chat) => {
  if (!chat || !user.id || isSaving) return;
  
  setIsSaving(true);
  try {
    console.log('💾 Saving chat to server:', chat.chatId);
    
    // Extract just filenames from file objects
    const extractFilenames = (filesArray) => {
      if (!Array.isArray(filesArray)) return [];
      return filesArray.map(file => {
        if (typeof file === 'string') return file;
        if (file && typeof file === 'object') {
          return file.name || file.filename || String(file);
        }
        return '';
      }).filter(f => f && f.trim() !== '');
    };
    
    // Prepare data exactly as backend expects
    const chatDataForServer = {
      chatId: chat.chatId,
      title: chat.title || 'New Chat',
      messages: chat.messages?.map(msg => ({
        text: msg.text,
        isUser: msg.isUser,
        timestamp: msg.timestamp,
        files: extractFilenames(msg.files)  // Send only filenames
      })) || [],
      files: extractFilenames(chat.files),  // Send only filenames
      date: chat.date,
      time: chat.time,
      userId: user.id
    };
    
    console.log('📤 Sending chat data:', chatDataForServer);
    
    const response = await agenticAPI.saveChat(chatDataForServer);
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
}, [user.id, isSaving]);

  // Delete chat from server function
  const deleteChatFromServer = useCallback(async (chatId) => {
    if (!chatId || !user.id) return;
    
    try {
      console.log('🗑️ Deleting chat from server:', chatId);
      
      const localChats = localStorage.getItem(`chats_${user.id}`);
      if (localChats) {
        const updatedChats = JSON.parse(localChats).filter(chat => chat.chatId !== chatId);
        localStorage.setItem(`chats_${user.id}`, JSON.stringify(updatedChats));
      }
      
      await agenticAPI.deleteChat(chatId);
      console.log('✅ Chat deleted successfully:', chatId);
    } catch (error) {
      console.error('❌ Error deleting chat:', error);
    }
  }, [user.id]);

  // Load user data
  const loadUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        console.log('❌ No token found, redirecting to login');
        router.push('/login')
        return;
      }
      
      const savedUser = localStorage.getItem('agentic_ai_user')
      
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
        
        const lastUserFetch = localStorage.getItem('user_last_fetch')
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
        
        if (!lastUserFetch || parseInt(lastUserFetch) < fiveMinutesAgo) {
          try {
            console.log('🔄 Fetching fresh user data from API');
            const apiUser = await agenticAPI.getCurrentUser()
            if (apiUser.success && apiUser.user) {
              const updatedUser = {
                ...apiUser.user,
                photo: parsedUser.photo || null
              }
              setUser(updatedUser)
              localStorage.setItem('agentic_ai_user', JSON.stringify(updatedUser))
              localStorage.setItem('user_last_fetch', Date.now().toString())
            }
          } catch (apiError) {
            console.log('⚠️ Using cached user data:', apiError.message)
            if (apiError.response?.status === 401) {
              localStorage.removeItem('token')
              localStorage.removeItem('agentic_ai_user')
              router.push('/login')
              return;
            }
          }
        } else {
          console.log('✅ Using recently cached user data');
        }
      } else {
        console.log('📥 No cached user, fetching from API');
        try {
          const apiUser = await agenticAPI.getCurrentUser()
          if (apiUser.success && apiUser.user) {
            setUser(apiUser.user)
            localStorage.setItem('agentic_ai_user', JSON.stringify(apiUser.user))
            localStorage.setItem('user_last_fetch', Date.now().toString())
          } else {
            throw new Error('No user data received')
          }
        } catch (error) {
          console.error('❌ Error fetching user:', error)
          localStorage.removeItem('token')
          router.push('/login')
          return;
        }
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('agentic_ai_user')
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  // Load chat history
// Load chat history
const loadChatHistory = useCallback(async () => {
  if (!user.id || isLoading) return;
  
  // Remove the guard that was preventing the function from running
  // when loadingChats was true
  
  console.log('📚 Loading chat history...');
  setLoadingChats(true);
  
  try {
    const lastChatLoad = localStorage.getItem('chat_last_load');
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    
    // Check if we should fetch from server (cache is older than 10 minutes)
    if (!lastChatLoad || parseInt(lastChatLoad) < tenMinutesAgo) {
      console.log('🔄 Fetching chats from server (cache expired)');
      const response = await agenticAPI.getChats();
      
      if (response.success && response.chats) {
        const sortedChats = response.chats.sort((a, b) => 
          new Date(b.lastUpdated) - new Date(a.lastUpdated)
        );
        
        console.log('✅ Loaded', sortedChats.length, 'chats from server');
        setChats(sortedChats);
        
        // Save to localStorage
        localStorage.setItem(`chats_${user.id}`, JSON.stringify(sortedChats));
        localStorage.setItem('chat_last_load', Date.now().toString());
        
        // Set current chat if none is selected
        if (sortedChats.length > 0 && !currentChat) {
          setCurrentChat(sortedChats[0]);
        }
      } else {
        console.log('⚠️ No chats from server, trying cache');
        throw new Error('No chats from server');
      }
    } else {
      // Use cached data
      const localChats = localStorage.getItem(`chats_${user.id}`);
      
      if (localChats) {
        const parsedChats = JSON.parse(localChats);
        console.log('✅ Loaded', parsedChats.length, 'chats from cache');
        setChats(parsedChats);
        
        if (parsedChats.length > 0 && !currentChat) {
          setCurrentChat(parsedChats[0]);
        }
      } else {
        console.log('📭 No chats found in cache, trying server');
        // Try server if no cache
        const response = await agenticAPI.getChats();
        if (response.success && response.chats) {
          const sortedChats = response.chats.sort((a, b) => 
            new Date(b.lastUpdated) - new Date(a.lastUpdated)
          );
          
          console.log('✅ Loaded', sortedChats.length, 'chats from server');
          setChats(sortedChats);
          localStorage.setItem(`chats_${user.id}`, JSON.stringify(sortedChats));
          localStorage.setItem('chat_last_load', Date.now().toString());
          
          if (sortedChats.length > 0 && !currentChat) {
            setCurrentChat(sortedChats[0]);
          }
        } else {
          console.log('📭 No chats available');
          setChats([]);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error loading chat history:', error);
    
    // Fallback to localStorage if available
    const localChats = localStorage.getItem(`chats_${user.id}`);
    if (localChats) {
      console.log('🔄 Falling back to localStorage');
      const parsedChats = JSON.parse(localChats);
      setChats(parsedChats);
      
      if (parsedChats.length > 0 && !currentChat) {
        setCurrentChat(parsedChats[0]);
      }
    } else {
      console.log('📭 No chats available in fallback');
      setChats([]);
    }
  } finally {
    setLoadingChats(false);
  }
}, [user.id, currentChat, isLoading]);

  // Check Agentic backend status
  const checkAgenticStatus = useCallback(async () => {
    try {
      console.log('🤖 Checking Agentic backend status...');
      const status = await agenticAPI.getStatus();
      console.log('✅ Agentic backend status:', status);
      setAgenticStatus(status);
    } catch (error) {
      console.error('❌ Agentic backend not reachable:', error);
      setAgenticStatus({ 
        success: false,
        model_initialized: false, 
        model_name: 'Not connected',
        systems_count: 0,
        available_systems: []
      });
    }
  }, []);

  // Initial load
  useEffect(() => {
    console.log('🚀 Initial dashboard load');
    loadUserData();
  }, [loadUserData]);

  // Load chats when user is loaded
useEffect(() => {
  if (user.id && !isLoading) {
    console.log('👤 User loaded, loading chats');
    
    // Use a short delay to ensure everything is ready
    const timer = setTimeout(() => {
      loadChatHistory();
    }, 100);
    
    return () => clearTimeout(timer);
  }
}, [user.id, loadChatHistory, isLoading]);

  // Check Agentic status
  useEffect(() => {
    if (!isLoading) {
      checkAgenticStatus();
    }
  }, [isLoading, checkAgenticStatus]);

  // Auto-save chat when it changes
  useEffect(() => {
    if (currentChat && user.id && !isSaving) {
      const saveTimeout = setTimeout(() => {
        saveChatToServer(currentChat)
      }, 2000)
      
      return () => clearTimeout(saveTimeout)
    }
  }, [currentChat, user.id, isSaving, saveChatToServer])

  // Handle logout
  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await agenticAPI.logout();
        console.log('✅ Logout successful');
      } catch (error) {
        console.log('⚠️ Logout completed with warning:', error.message);
      } finally {
        // Always redirect to login
        router.push('/login');
      }
    }
  }

  // Handle change password
  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    setPasswordError('');
    setPasswordSuccess('');
    
    try {
      const response = await agenticAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.success) {
        setPasswordSuccess('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        setTimeout(() => {
          setPasswordSuccess('');
          setShowChangePasswordModal(false);
        }, 3000);
      } else {
        setPasswordError(response.message || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError(error.response?.data?.message || error.message || 'Error changing password');
    }
  }

// REPLACE the handleFileUploadToAgentic function with this:
const handleFileUploadToAgentic = async (files, chatId) => {
  const uploaded = [];
  
  for (const file of files) {
    try {
      setProcessingStatus(`Uploading ${file.name}...`);
      const response = await agenticAPI.uploadFile(file);
      
      console.log('📤 Upload response:', response);
      
      if (response.success && response.file) {
        // IMPORTANT: Use the saved filename, not the full path
        const savedFilename = response.file.saved_name || response.file.filename;
        
        uploaded.push({
          name: response.file.original_name,
          filename: savedFilename,  // Store just the filename
          serverPath: response.file.path,
          type: response.file.mimetype,
          size: response.file.size,
          uploadedAt: response.file.uploaded_at
        });
        
        console.log(`✅ File uploaded: ${response.file.original_name} -> ${savedFilename}`);
      }
    } catch (error) {
      console.error(`❌ Failed to upload ${file.name}:`, error);
      alert(`Failed to upload ${file.name}: ${error.message}`);
    }
  }
  
  return uploaded;
}

// REPLACE the entire handleSendMessage function (lines 275-400) with:

const handleSendMessage = async () => {
  if ((!message.trim() && selectedFiles.length === 0) || isProcessing) return;

  setIsProcessing(true);
  setProcessingStatus('Processing your request...');

  try {
    // Upload files if any selected
    let filePaths = {};
    let uploadedFiles = [];
    
   if (selectedFiles.length > 0) {
  setProcessingStatus('Uploading files...');
  uploadedFiles = await handleFileUploadToAgentic(selectedFiles, currentChat?.chatId);
  
  // Create file_paths object - JUST USE FILENAME
  uploadedFiles.forEach(file => {
    // Use just the filename, not the path
    filePaths[file.name] = file.filename; // This should be like "1742276832345-test.txt"
  });
  
  console.log('📁 Files for AI processing:', {
    count: uploadedFiles.length,
    filePaths: filePaths,
    files: uploadedFiles.map(f => ({
      original: f.name,
      saved: f.filename
    }))
  });
}

    // Prepare conversation history
    const history = (currentChat?.messages || []).map(msg => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.text,
      timestamp: msg.timestamp || new Date().toISOString()
    }));

    // Add user message to UI immediately
    const userMessage = {
      text: message || (uploadedFiles.length > 0 ? 
        `Uploaded ${uploadedFiles.length} file(s): ${uploadedFiles.map(f => f.name).join(', ')}` : 
        ""),
      files: uploadedFiles,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    // Update chat with user message immediately
    const chatWithUserMessage = {
      ...currentChat,
      messages: [...(currentChat?.messages || []), userMessage],
      lastUpdated: new Date().toISOString()
    };
    
    if (uploadedFiles.length > 0) {
      chatWithUserMessage.uploadedFiles = [
        ...(currentChat?.uploadedFiles || []),
        ...uploadedFiles
      ];
    }
    
    setCurrentChat(chatWithUserMessage);

    // Send to Agentic backend
    setProcessingStatus('Analyzing with AI agents...');
    
    const chatMessage = message || 
      (uploadedFiles.length > 0 ? 
        `Please analyze these ${uploadedFiles.length} file(s)` : 
        "");
    
    console.log('💬 Sending to Agentic AI:', {
      message: chatMessage,
      filePaths: filePaths, // Check this in console
      historyLength: history.length
    });

    // Make the chat request
    const response = await agenticAPI.chat(chatMessage, history, filePaths);
    
    console.log('🤖 Agentic Response:', response);

    // FIX: Handle both response structures
    const aiResponse = {
      text: response.response || response.message || 
            (response.success ? "I've processed your files." : "Failed to process request"),
      isUser: false,
      timestamp: new Date().toISOString(),
      agentData: response.data || {},
      fileOutputs: response.file_outputs || []
    };

    // Update chat with AI response
    const updatedChat = {
      ...chatWithUserMessage,
      messages: [...chatWithUserMessage.messages, aiResponse],
      lastUpdated: new Date().toISOString()
    };

    setCurrentChat(updatedChat);
    
    // Update chat list
    const updatedChats = chats.map(chat => 
      chat.chatId === updatedChat.chatId ? updatedChat : chat
    );
    setChats(updatedChats);

    // Save to backend
    await saveChatToServer(updatedChat);

    // Auto-generate title for new chats
    if (!currentChat || currentChat.title === 'New Chat') {
      const suggestedTitle = message.substring(0, 30) || 
        `${uploadedFiles.length} file(s) analysis`;
      const titledChat = { 
        ...updatedChat, 
        title: suggestedTitle + (message.length > 30 ? '...' : '')
      };
      setCurrentChat(titledChat);
      
      const titledChats = updatedChats.map(chat => 
        chat.chatId === titledChat.chatId ? titledChat : chat
      );
      setChats(titledChats);
      
      // Save with new title
      await saveChatToServer(titledChat);
    }

    console.log('✅ Chat processed successfully with files:', uploadedFiles.length);

  } catch (error) {
    console.error('❌ Error processing request:', error);
    
    // Show error in chat
    const errorMessage = {
      text: `Error: ${error.message || 'Failed to process request'}`,
      isUser: false,
      timestamp: new Date().toISOString(),
      isError: true
    };
    
    const chatWithError = {
      ...currentChat,
      messages: [...(currentChat?.messages || []), errorMessage],
      lastUpdated: new Date().toISOString()
    };
    
    setCurrentChat(chatWithError);
    
  } finally {
    setIsProcessing(false);
    setProcessingStatus('');
    setMessage('');
    setSelectedFiles([]); // Clear selected files
  }
}

const handleNewChat = () => {
  const newChat = {
    chatId: `chat_${Date.now()}_${user.id}`,
    title: 'New Chat',
    date: new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    time: new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    messages: [],
    files: [],
    uploadedFiles: [], // Initialize empty uploadedFiles array
    lastUpdated: new Date().toISOString(),
    userId: user.id
  };
  
  const updatedChats = [newChat, ...chats];
  setChats(updatedChats);
  setCurrentChat(newChat);
  setSelectedFiles([]); // Clear any selected files
  setEditingId(newChat.chatId);
  setEditTitle('');
}

const handleSelectChat = (chat) => {
  setCurrentChat(chat);
  setSelectedFiles([]); // Clear any pending file uploads
  setEditingId(null);
}

  const handleEditStart = (chat) => {
    setEditingId(chat.chatId);
    setEditTitle(chat.title);
  }

  const handleEditSave = async (chatId) => {
    if (editTitle.trim()) {
      const updatedChats = chats.map(chat => 
        chat.chatId === chatId ? { ...chat, title: editTitle } : chat
      );
      setChats(updatedChats);
      
      if (currentChat?.chatId === chatId) {
        const updatedCurrentChat = { ...currentChat, title: editTitle };
        setCurrentChat(updatedCurrentChat);
        await saveChatToServer(updatedCurrentChat);
      }
    }
    setEditingId(null);
    setEditTitle('');
  }

  const handleDeleteChat = async (chatId) => {
    if (confirm('Delete this chat?')) {
      const updatedChats = chats.filter(chat => chat.chatId !== chatId);
      setChats(updatedChats);
      
      if (currentChat?.chatId === chatId) {
        setCurrentChat(updatedChats.length > 0 ? updatedChats[0] : null);
      }
      
      await deleteChatFromServer(chatId);
    }
  }

  const handleShareChat = async (chat) => {
    try {
      const shareUrl = `${window.location.origin}/share/${chat.chatId}`;
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    const allowedExtensions = ['.txt', '.csv', '.xlsx', '.xls', '.pdf', '.doc', '.docx', '.eml', '.msg'];
    
    const validFiles = uploadedFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      return allowedExtensions.includes(ext);
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  }

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.messages && chat.messages.some(msg => 
      msg.text.toLowerCase().includes(searchQuery.toLowerCase())
    ))
  );

  // Agentic Status Badge Component
  const AgenticStatusBadge = () => (
    <div className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
      agenticStatus?.success !== false && agenticStatus?.model_initialized 
        ? 'bg-green-100 text-green-800 border border-green-200' 
        : 'bg-red-100 text-red-800 border border-red-200'
    }`}>
      {agenticStatus?.success !== false && agenticStatus?.model_initialized ? (
        <>
          <Cpu className="w-4 h-4" />
          <span>🤖 Agentic AI Connected</span>
          <span className="text-xs opacity-75 ml-1">
            ({agenticStatus?.model_name})
          </span>
        </>
      ) : (
        <>
          <X className="w-4 h-4" />
          <span>⚠️ Agentic AI Offline</span>
        </>
      )}
    </div>
  );

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Sidebar Component
  const Sidebar = () => (
    <div className="h-full flex flex-col bg-white border-r">
      {/* Logo Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 rounded-2xl animate-spin-slow opacity-80"></div>
              <div className="absolute inset-1 bg-gradient-to-br from-purple-700 to-pink-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Bot className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Agentic AI</h1>
            <p className="text-xs text-gray-500">Multi-Agent System</p>
          </div>
        </div>
        
        {/* Agentic Status in Sidebar */}
        <div className="mt-3">
          <AgenticStatusBadge />
        </div>
      </div>

      {/* New Chat Button */}
      <button
        onClick={handleNewChat}
        className="mx-4 my-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        New chat
      </button>

      {/* Search Chats */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Chat history
          </div>
          {isSaving && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Saving...
            </div>
          )}
        </div>
        
        {loadingChats ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading chats...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No chats found</p>
            {searchQuery && (
              <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredChats.map((chat) => (
              <div
                key={chat.chatId}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors
                         ${currentChat?.chatId === chat.chatId ? 'bg-purple-50 border border-purple-100' : 'hover:bg-gray-100 border border-transparent'}`}
                onClick={() => handleSelectChat(chat)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentChat?.chatId === chat.chatId ? 'text-purple-600' : 'text-gray-400'}`} />
                  <div className="min-w-0 flex-1">
                    {editingId === chat.chatId ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleEditSave(chat.chatId)}
                        onKeyPress={(e) => e.key === 'Enter' && handleEditSave(chat.chatId)}
                        className="w-full text-sm border border-purple-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {chat.title}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-500">{chat.date}</p>
                      <span className="text-xs text-gray-400">•</span>
                      <p className="text-xs text-gray-500">{chat.time}</p>
                      {chat.files && chat.files.length > 0 && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-purple-600">{chat.files.length} file(s)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === chat.chatId ? null : chat.chatId);
                    }}
                    className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                  
                  {menuOpen === chat.chatId && (
                    <div className="absolute right-4 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                      <div className="py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStart(chat);
                            setMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit name
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareChat(chat);
                            setMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(chat.chatId);
                            setMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Profile & Logout */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors flex-1"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                           flex items-center justify-center text-white font-bold text-sm">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowChangePasswordModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Change Password"
            >
              <Key className="w-5 h-5 text-gray-500 hover:text-purple-600" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-gray-500 hover:text-red-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white shadow-sm p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 rounded-lg animate-spin-slow opacity-80"></div>
              <div className="absolute inset-1 bg-gradient-to-br from-purple-700 to-pink-700 rounded-md flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Agentic AI</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChangePasswordModal(true)}
              className="p-1"
              title="Change Password"
            >
              <Key className="w-5 h-5 text-gray-500" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                           flex items-center justify-center text-white font-bold text-sm">
              {user.name.charAt(0)}
            </div>
          </div>
        </header>

        <div className="flex h-screen">
          {/* Sidebar */}
          <div className={`fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out 
                         ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
            <Sidebar />
          </div>

          {/* Overlay for mobile */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 lg:hidden z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Desktop Header */}
            <header className="hidden lg:flex items-center justify-between p-4 border-b bg-white">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentChat ? currentChat.title : 'Ready when you are'}
                </h2>
                <AgenticStatusBadge />
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Key className="w-4 h-4" />
                  Change Password
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {currentChat ? (
                <div className="max-w-4xl mx-auto">
                  {/* File Preview Section */}
                  {/* File Preview Section */}
{currentChat?.uploadedFiles && currentChat.uploadedFiles.length > 0 && (
  <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
    <div className="flex items-center gap-3 mb-3">
      <UploadCloud className="w-5 h-5 text-blue-600" />
      <h3 className="font-semibold text-gray-900">Uploaded Files for this Chat</h3>
      <span className="ml-auto text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
        {currentChat.uploadedFiles.length} file(s)
      </span>
    </div>
    <div className="flex flex-wrap gap-2">
      {currentChat.uploadedFiles.map((file, index) => (
        <div key={index} className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg">
          <FileIcon className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-gray-700">{file.name}</span>
          <span className="text-xs text-gray-500">
            ({new Date(file.uploadedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
          </span>
        </div>
      ))}
    </div>
  </div>
)}

                  {/* Agentic Processing Status */}
                  {isProcessing && (
                    <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Agentic AI Processing</p>
                          <p className="text-sm text-gray-600">{processingStatus}</p>
                        </div>
                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="space-y-6">
                    {!currentChat.messages || currentChat.messages.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Ready to Process Files
                        </h3>
                        <p className="text-gray-600">
                          Upload files or ask anything to use the multi-agent system
                        </p>
                        <div className="mt-4 text-sm text-gray-500">
                          <p>Supports: Excel, Word, PDF, Email, Text files</p>
                        </div>
                      </div>
                    ) : (
                      currentChat.messages.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex gap-4 ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {!msg.isUser && (
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div
                            className={`max-w-xl rounded-2xl p-4 ${msg.isUser 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-none' 
                              : 'bg-white border border-gray-200 rounded-bl-none shadow-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            
                            {/* Show agent reasoning if available */}
                            {msg.agentData?.reasoning && (
                              <div className="mt-3 pt-3 border-t border-gray-200/50">
                                <p className="text-xs font-medium text-gray-500 mb-1">AI Reasoning:</p>
                                <p className="text-xs text-gray-600">{msg.agentData.reasoning}</p>
                              </div>
                            )}

                            {/* Show file outputs if available */}
                            {msg.fileOutputs && msg.fileOutputs.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200/50">
                                <p className="text-xs font-medium text-gray-500 mb-2">Generated Files:</p>
                                <div className="space-y-2">
                                  {msg.fileOutputs.map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                      <FileText className="w-4 h-4 text-gray-400" />
                                      <span className="text-gray-700">{file.filename}</span>
                                      <span className="text-xs text-gray-500">({file.type})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {msg.isUser && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-white">
                                {user.name.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                // Empty state with Agentic features
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="relative w-32 h-32 mb-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 rounded-3xl animate-spin-slow opacity-80"></div>
                    <div className="absolute inset-4 bg-gradient-to-br from-purple-700 to-pink-700 rounded-2xl flex items-center justify-center">
                      <Bot className="w-20 h-20 text-white animate-float" />
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Welcome to Agentic AI!
                  </h2>
                  <p className="text-gray-600 max-w-md mb-6">
                    I'm a multi-agent system that can process files, answer questions, and help with document operations.
                  </p>
                  
                  {/* Agentic Capabilities */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-2xl">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mb-3">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">Process Files</h4>
                      <p className="text-sm text-gray-600">Upload Excel, Word, PDF, and more</p>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-3">
                        <Cpu className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">Multi-Agent AI</h4>
                      <p className="text-sm text-gray-600">Specialized agents for different tasks</p>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mb-3">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">Smart Processing</h4>
                      <p className="text-sm text-gray-600">Extract, analyze, and modify content</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleNewChat}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-medium hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 text-lg flex items-center gap-3"
                  >
                    <Sparkles className="w-6 h-6" />
                    Start AI Conversation
                  </button>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t p-4 bg-white">
              <div className="max-w-4xl mx-auto">
                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {selectedFiles.length} file(s) ready for AI processing
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg text-sm">
                          <FileIcon className="w-4 h-4 text-purple-500" />
                          <span className="max-w-xs truncate">{file.name}</span>
                          <button
                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                            className="text-purple-400 hover:text-red-500 ml-2"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".xlsx,.xls,.docx,.doc,.pdf,.eml,.msg,.txt"
                  />
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                    title="Upload files for AI processing"
                    disabled={isProcessing}
                  >
                    <FileUp className="w-5 h-5" />
                    <span className="hidden sm:inline">Upload Files</span>
                  </button>
                  
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage()}
                      placeholder={selectedFiles.length > 0 
                        ? "Ask AI to process these files..." 
                        : "Ask Agentic AI anything or upload files..."}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                      disabled={isProcessing}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={(!message.trim() && selectedFiles.length === 0) || isProcessing}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-500">
                    Supports: Excel (.xlsx, .xls), Word (.docx, .doc), PDF, Email (.eml, .msg), Text (.txt)
                  </p>
                  {agenticStatus && (
                    <p className="text-xs text-gray-400 mt-1">
                      Using {agenticStatus.model_name} with {agenticStatus.systems_count} agent systems
                    </p>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                    <p className="text-sm text-gray-500">Update your account password</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setPasswordError('');
                    setPasswordSuccess('');
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {passwordSuccess && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                  {passwordSuccess}
                </div>
              )}

              {passwordError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowChangePasswordModal(false);
                      setPasswordError('');
                      setPasswordSuccess('');
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-200"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}