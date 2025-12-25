'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import authAPI from '@/services/api'
import { 
  MessageSquare, Search, Plus, Send, Upload,
  FileText, X, Menu, MoreVertical, Edit2, Share2, Trash2,
  LogOut, Bot, Sparkles, RefreshCw, FileUp,
  Cpu, UploadCloud, Brain, Zap, FileIcon,
  Download, User, Settings
} from 'lucide-react'

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
  const [loadingChats, setLoadingChats] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Load user data
  const loadUserData = useCallback(async () => {
    try {
      // Check if user is authenticated
      const isAuthenticated = authAPI.isAuthenticated()
      
      if (!isAuthenticated) {
        console.log('❌ No authentication found, redirecting to login')
        router.push('/login')
        return
      }

      // Get user from localStorage
      const currentUser = authAPI.getCurrentUser()
      
      if (currentUser) {
        setUser(currentUser)
        console.log('✅ User loaded from localStorage:', currentUser.email)
      } else {
        // Try to verify token with server
        try {
          console.log('🔄 Verifying token with server...')
          await authAPI.verifyToken()
          // If verification succeeds, get fresh user data
          const savedUser = localStorage.getItem('agentic_ai_user')
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser)
            setUser(parsedUser)
          }
        } catch (error) {
          console.log('❌ Token verification failed, redirecting to login')
          router.push('/login')
          return
        }
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error)
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  // Handle logout
  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await authAPI.logout()
        console.log('✅ Logout successful')
      } catch (error) {
        console.log('⚠️ Logout completed with warning:', error.message)
      } finally {
        // Always redirect to login
        router.push('/login')
      }
    }
  }

  // Navigate to profile page
  const handleNavigateToProfile = () => {
    router.push('/profile')
    setShowProfileMenu(false)
  }

  // Initial load
  useEffect(() => {
    console.log('🚀 Initial dashboard load')
    loadUserData()
  }, [loadUserData])

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
      lastUpdated: new Date().toISOString(),
      userId: user.id
    }
    
    const updatedChats = [newChat, ...chats]
    setChats(updatedChats)
    setCurrentChat(newChat)
    setSelectedFiles([])
    setEditingId(newChat.chatId)
    setEditTitle('')
    
    // Save to localStorage
    localStorage.setItem(`chats_${user.id}`, JSON.stringify(updatedChats))
  }

  const handleSelectChat = (chat) => {
    setCurrentChat({
      ...chat,
      // Ensure files are included
      files: chat.files || []
    })
    setSelectedFiles([])
    setEditingId(null)
  }

  const handleEditStart = (chat) => {
    setEditingId(chat.chatId)
    setEditTitle(chat.title)
  }

  const handleEditSave = (chatId) => {
    if (editTitle.trim()) {
      const updatedChats = chats.map(chat => 
        chat.chatId === chatId ? { ...chat, title: editTitle } : chat
      )
      setChats(updatedChats)
      
      if (currentChat?.chatId === chatId) {
        const updatedCurrentChat = { ...currentChat, title: editTitle }
        setCurrentChat(updatedCurrentChat)
      }
      
      // Save to localStorage
      localStorage.setItem(`chats_${user.id}`, JSON.stringify(updatedChats))
    }
    setEditingId(null)
    setEditTitle('')
  }

  const handleDeleteChat = (chatId) => {
    if (confirm('Delete this chat?')) {
      const updatedChats = chats.filter(chat => chat.chatId !== chatId)
      setChats(updatedChats)
      
      if (currentChat?.chatId === chatId) {
        setCurrentChat(updatedChats.length > 0 ? updatedChats[0] : null)
      }
      
      // Update localStorage
      localStorage.setItem(`chats_${user.id}`, JSON.stringify(updatedChats))
    }
  }

  const handleShareChat = async (chat) => {
    try {
      const shareUrl = `${window.location.origin}/share/${chat.chatId}`
      await navigator.clipboard.writeText(shareUrl)
      alert('Share link copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files)
    
    // ALLOWED FILE TYPES: TXT, CSV, XLSX, PDF, PY, JSON, DOC, EML, MSG
    const allowedExtensions = [
      '.txt', '.csv', '.xlsx', '.xls', '.pdf', 
      '.py', '.json', '.doc', '.docx', '.eml', '.msg'
    ]
    const validFiles = uploadedFiles.filter(file => {
      const fileName = file.name.toLowerCase()
      const ext = '.' + fileName.split('.').pop()
      
      // Check if extension is in allowed list
      const hasValidExtension = allowedExtensions.includes(ext)
      
      // Also check file type for better validation
      const validTypes = [
        'text/plain', 'text/csv', 'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel', 'application/vnd.ms-excel.sheet.macroEnabled.12',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/json', 'text/x-python', 'application/x-python-code',
        'message/rfc822' // For EML files
      ]
      
      const hasValidType = validTypes.includes(file.type) || 
                          file.type === '' || // Some files might not have type
                          file.name.endsWith('.msg') // MSG files
      
      return hasValidExtension && hasValidType
    })

    // Show warning for rejected files
    if (validFiles.length !== uploadedFiles.length) {
      const rejectedCount = uploadedFiles.length - validFiles.length
      alert(`${rejectedCount} file(s) were rejected. Only allowed: TXT, CSV, XLSX, PDF, PY, JSON, DOC, EML, MSG`)
    }

    setSelectedFiles(prev => [...prev, ...validFiles])
    
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // File download function
  const handleDownloadFile = async (file) => {
    try {
      // If it's a File object from the input
      if (file.fileObject instanceof File) {
        const url = URL.createObjectURL(file.fileObject);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // If it's stored as data, you might need to fetch it
        alert(`File: ${file.name}\nSize: ${Math.round(file.size / 1024)} KB\nType: ${file.type}`);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Could not download ${file.name}`);
    }
  };

  // Modified handleSendMessage to use Agentic API
  const handleSendMessage = async () => {
     if (!message.trim() && selectedFiles.length === 0) return

    // 1. Check or Create Chat
    let activeChat = currentChat;
    if (!activeChat) {
      activeChat = {
        chatId: `chat_${Date.now()}_${user.id}`,
        title: 'New Chat',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        messages: [],
        files: [],
        lastUpdated: new Date().toISOString(),
        userId: user.id
      }
      // We will perform state updates after getting the chat structure ready
    }

    const currentFiles = [...selectedFiles];
    const currentMessage = message;

    // Clear inputs UI immediately for better UX
    setMessage('');
    setSelectedFiles([]);

    // 2. Add User Message to UI
    const userMsgObj = {
      text: currentMessage.trim() || (currentFiles.length > 0 ? `Uploaded ${currentFiles.length} file(s)` : ""),
      isUser: true,
      timestamp: new Date().toISOString(),
      files: currentFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
    };

    let updatedChat = {
        ...activeChat,
        messages: [...(activeChat.messages || []), userMsgObj],
        lastUpdated: new Date().toISOString()
    };

    // Sync State
    const updateStatsAndStorage = (chatObj) => {
        setCurrentChat(chatObj);
        setChats(prev => {
            const exists = prev.find(c => c.chatId === chatObj.chatId);
            const newList = exists 
                ? prev.map(c => c.chatId === chatObj.chatId ? chatObj : c)
                : [chatObj, ...prev];
            localStorage.setItem(`chats_${user.id}`, JSON.stringify(newList));
            return newList;
        });
    }
    
    updateStatsAndStorage(updatedChat);

    try {
        // 3. Upload Files (if any)
        const filePaths = {};
        if (currentFiles.length > 0) {
             for (const file of currentFiles) {
                 try {
                     const uploadResult = await authAPI.agentic.uploadFile(file);
                     if (uploadResult && (uploadResult.path || uploadResult.file?.path)) {
                         // Backend expects: { "filename": "path" }
                         // Using saved_name or filename as key
                         const key = uploadResult.file?.saved_name || uploadResult.filename || file.name;
                         const path = uploadResult.path || uploadResult.file?.path;
                         filePaths[key] = path;
                     }
                 } catch (uploadErr) {
                     console.error(`Failed to upload ${file.name}`, uploadErr);
                     // Add error system message?
                 }
             }
        }

        // 4. Send to Chat API
        // If we have files but no message, we might send a default "Analyze these files" 
        // to convert it into a chat interaction, OR just upload them.
        // However, the user flow usually implies "Here is a file" -> Response.
        const chatMessage = currentMessage || (Object.keys(filePaths).length > 0 ? "Analyze these files" : "");
        
        if (chatMessage) {
            const apiResponse = await authAPI.agentic.chat(
                chatMessage, 
                filePaths, 
                updatedChat.messages.map(m => ({
                    role: m.isUser ? 'user' : 'assistant',
                    content: m.text,
                    timestamp: m.timestamp
                }))
            );

            // 5. Add AI Response
            const aiMsgObj = {
                text: apiResponse.response || "I processed your request.",
                isUser: false,
                timestamp: new Date().toISOString(),
                // If the backend returns detailed file analysis or data, attach it
                data: apiResponse.data
            };

            updatedChat = {
                ...updatedChat,
                messages: [...updatedChat.messages, aiMsgObj],
                lastUpdated: new Date().toISOString()
            };
            
            // Auto-title if new
            if (updatedChat.title === 'New Chat') {
                updatedChat.title = currentMessage.slice(0, 30) || 'File Analysis';
            }

            updateStatsAndStorage(updatedChat);
        }

    } catch (error) {
        console.error('Chat processing error:', error);
        const errorMsg = {
            text: `Error: ${error.message || "Failed to process request"}`,
            isUser: false,
            timestamp: new Date().toISOString(),
            isError: true
        };
        updatedChat = {
            ...updatedChat,
            messages: [...updatedChat.messages, errorMsg]
        };
        updateStatsAndStorage(updatedChat);
    }
  }

  const uploadFilesToBackend = async (files) => {
    if (!files || files.length === 0) return []
    
    const uploadedFiles = []
    
    for (const file of files) {
      try {
        // Create FormData for file upload
        const formData = new FormData()
        formData.append('file', file)
        formData.append('chatId', currentChat?.chatId || '')
        formData.append('userId', user.id || '')
        
        // Replace with your actual upload endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        })
        
        if (response.ok) {
          const result = await response.json()
          uploadedFiles.push({
            ...file,
            uploaded: true,
            serverPath: result.filePath,
            uploadId: result.uploadId
          })
        } else {
          uploadedFiles.push({
            ...file,
            uploaded: false,
            error: 'Upload failed'
          })
        }
      } catch (error) {
        console.error('File upload error:', error)
        uploadedFiles.push({
          ...file,
          uploaded: false,
          error: error.message
        })
      }
    }
    
    return uploadedFiles
  }

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.messages && chat.messages.some(msg => 
      msg.text.toLowerCase().includes(searchQuery.toLowerCase())
    ))
  )

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Sidebar Component with Profile
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
        
        {/* Authentication Status */}
        <div className="mt-3 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 bg-green-100 text-green-800 border border-green-200">
          <Sparkles className="w-4 h-4" />
          <span>Logged in as {user.email}</span>
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
        </div>
        
        {filteredChats.length === 0 ? (
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
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(menuOpen === chat.chatId ? null : chat.chatId)
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
                            e.stopPropagation()
                            handleEditStart(chat)
                            setMenuOpen(null)
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit name
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShareChat(chat)
                            setMenuOpen(null)
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteChat(chat.chatId)
                            setMenuOpen(null)
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

      {/* User Profile & Actions */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                           flex items-center justify-center text-white font-bold text-sm">
                {user.photo ? (
                  <img 
                    src={user.photo} 
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </button>
            
            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-lg border z-10">
                <div className="py-2">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  
                  <button
                    onClick={handleNavigateToProfile}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile Settings</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleNavigateToProfile}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors group relative"
            title="Profile Settings"
          >
            <Settings className="w-5 h-5 text-gray-500 group-hover:text-purple-600 transition-colors" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Profile Settings
            </div>
          </button>
        </div>
      </div>
    </div>
  )

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
          
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                           flex items-center justify-center text-white font-bold text-sm">
              {user.photo ? (
                <img 
                  src={user.photo} 
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user.name.charAt(0)
              )}
            </div>
          </button>
          
          {/* Mobile Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute top-16 right-4 w-56 bg-white rounded-lg shadow-lg border z-10">
              <div className="py-2">
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                
                <button
                  onClick={handleNavigateToProfile}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Profile Settings</span>
                </button>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
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
                <div className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 bg-blue-100 text-blue-800 border border-blue-200">
                  <Bot className="w-4 h-4" />
                  <span>Demo Mode</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={handleNavigateToProfile}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors hover:text-purple-600"
                >
                  <User className="w-4 h-4" />
                  Profile Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors hover:text-red-600"
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
                  {/* Messages */}
                  <div className="space-y-6">
                    {!currentChat.messages || currentChat.messages.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Start a conversation
                        </h3>
                        <p className="text-gray-600">
                          Type a message or upload files to begin
                        </p>
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
                            <p className="whitespace-pre-wrap mb-2">{msg.text}</p>
                            
                            {/* Display uploaded files if they exist */}
                            {msg.files && msg.files.length > 0 && (
                              <div className={`mt-3 pt-3 border-t ${msg.isUser ? 'border-white/30' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className={`w-4 h-4 ${msg.isUser ? 'text-white/80' : 'text-gray-500'}`} />
                                  <span className={`text-sm font-medium ${msg.isUser ? 'text-white/90' : 'text-gray-700'}`}>
                                    {msg.files.length} uploaded file(s):
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {msg.files.map((file, fileIndex) => {
                                    // Get file extension for icon
                                    const ext = file.name.split('.').pop().toLowerCase();
                                    let iconColor = msg.isUser ? "text-white/80" : "text-blue-500";
                                    
                                    if (['txt', 'py'].includes(ext)) {
                                      iconColor = msg.isUser ? "text-white/80" : "text-blue-500";
                                    } else if (['csv', 'xlsx', 'xls'].includes(ext)) {
                                      iconColor = msg.isUser ? "text-white/80" : "text-green-500";
                                    } else if (ext === 'pdf') {
                                      iconColor = msg.isUser ? "text-white/80" : "text-red-500";
                                    } else if (ext === 'json') {
                                      iconColor = msg.isUser ? "text-white/80" : "text-yellow-500";
                                    } else if (['doc', 'docx'].includes(ext)) {
                                      iconColor = msg.isUser ? "text-white/80" : "text-blue-600";
                                    } else if (['eml', 'msg'].includes(ext)) {
                                      iconColor = msg.isUser ? "text-white/80" : "text-indigo-500";
                                    }
                                    
                                    return (
                                      <div 
                                        key={fileIndex} 
                                        className={`flex items-center justify-between p-2 rounded-lg ${msg.isUser 
                                          ? 'bg-white/10 hover:bg-white/20' 
                                          : 'bg-gray-50 hover:bg-gray-100'
                                        } transition-colors`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <FileText className={`w-4 h-4 ${iconColor}`} />
                                          <div className="flex flex-col">
                                            <span className={`text-sm font-medium truncate max-w-xs ${msg.isUser ? 'text-white' : 'text-gray-900'}`}>
                                              {file.name}
                                            </span>
                                            <span className={`text-xs ${msg.isUser ? 'text-white/70' : 'text-gray-500'}`}>
                                              {Math.round(file.size / 1024)} KB • {file.type || 'Unknown type'}
                                            </span>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleDownloadFile(file)}
                                          className={`p-1 rounded ${msg.isUser 
                                            ? 'text-white/70 hover:text-white hover:bg-white/20' 
                                            : 'text-gray-400 hover:text-blue-600 hover:bg-gray-200'
                                          } transition-colors`}
                                          title="Download file"
                                        >
                                          <Download className="w-4 h-4" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* Display file analysis from AI response */}
                            {!msg.isUser && msg.fileAnalysis && msg.fileAnalysis.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                  <Brain className="w-4 h-4 text-purple-500" />
                                  <span className="text-sm font-medium text-gray-700">File Analysis:</span>
                                </div>
                                <div className="space-y-2">
                                  {msg.fileAnalysis.map((analysis, idx) => (
                                    <div key={idx} className="text-sm text-gray-600 bg-purple-50 p-2 rounded">
                                      <span className="font-medium">{analysis.fileName}:</span> {analysis.summary}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {msg.isUser && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                              {user.photo ? (
                                <img 
                                  src={user.photo} 
                                  alt={user.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-medium text-white">
                                  {user.name.charAt(0)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                // Empty state
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="relative w-32 h-32 mb-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 rounded-3xl animate-spin-slow opacity-80"></div>
                    <div className="absolute inset-4 bg-gradient-to-br from-purple-700 to-pink-700 rounded-2xl flex items-center justify-center">
                      <Bot className="w-20 h-20 text-white animate-float" />
                    </div>
                  </div>
                  
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Welcome to Agentic AI Demo!
                  </h2>
                  <p className="text-gray-600 max-w-md mb-6">
                    This is a frontend demo. AI features require backend integration.
                  </p>
                  
                  <button
                    onClick={handleNewChat}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-medium hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 text-lg flex items-center gap-3"
                  >
                    <Sparkles className="w-6 h-6" />
                    Start New Chat
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
                        {selectedFiles.length} file(s) ready to send with your message
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg text-sm">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="max-w-xs truncate">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({Math.round(file.size / 1024)} KB)
                          </span>
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
                    accept=".txt,.csv,.xlsx,.xls,.pdf,.py,.json,.doc,.docx,.eml,.msg"
                  />
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                    title="Upload files"
                  >
                    <FileUp className="w-5 h-5" />
                    <span className="hidden sm:inline">Upload Files</span>
                  </button>
                  
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim() && selectedFiles.length === 0}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-500">
                    Demo version - AI features require backend integration
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}