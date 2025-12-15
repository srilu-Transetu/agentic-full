'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/services/api'
import { 
  MessageSquare, 
  Search, 
  Plus,
  Send,
  Upload,
  BarChart3,
  FileText,
  X,
  Menu,
  MoreVertical,
  Edit2,
  Share2,
  Trash2,
  LogOut,
  Bot,
  Sparkles,
  RefreshCw
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
  const [loadingChats, setLoadingChats] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load user data from localStorage or API
  const loadUserData = useCallback(async () => {
    try {
      // First try to get from localStorage
      const savedUser = localStorage.getItem('agentic_ai_user')
      const token = localStorage.getItem('token')
      
      if (savedUser && token) {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
        
        // If we have a token, try to get fresh data from API
        try {
          const apiUser = await authAPI.getCurrentUser()
          if (apiUser.success && apiUser.user) {
            const updatedUser = {
              ...apiUser.user,
              photo: parsedUser.photo || null
            }
            setUser(updatedUser)
            localStorage.setItem('agentic_ai_user', JSON.stringify(updatedUser))
          }
        } catch (apiError) {
          console.log('Using cached user data:', apiError.message)
        }
      } else {
        // No user in localStorage, redirect to login
        router.push('/login')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      router.push('/login')
    }
  }, [router])

  // Load chat history from server
  const loadChatHistory = useCallback(async () => {
    if (!user.id) return
    
    setLoadingChats(true)
    try {
      const response = await authAPI.getChats()
      if (response.success && response.chats) {
        // Sort chats by lastUpdated in descending order
        const sortedChats = response.chats.sort((a, b) => 
          new Date(b.lastUpdated) - new Date(a.lastUpdated)
        )
        setChats(sortedChats)
        
        if (sortedChats.length > 0 && !currentChat) {
          setCurrentChat(sortedChats[0])
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
      // Load from localStorage as fallback
      const localChats = localStorage.getItem(`chats_${user.id}`)
      if (localChats) {
        setChats(JSON.parse(localChats))
      }
    } finally {
      setLoadingChats(false)
    }
  }, [user.id, currentChat])

  // Save chat to server
  const saveChatToServer = useCallback(async (chatData) => {
    if (!user.id) return
    
    setIsSaving(true)
    try {
      await authAPI.saveChat({
        ...chatData,
        userId: user.id
      })
      
      // Also save to localStorage as backup
      const localChats = JSON.parse(localStorage.getItem(`chats_${user.id}`) || '[]')
      const existingIndex = localChats.findIndex(c => c.chatId === chatData.chatId)
      
      if (existingIndex >= 0) {
        localChats[existingIndex] = chatData
      } else {
        localChats.push(chatData)
      }
      
      localStorage.setItem(`chats_${user.id}`, JSON.stringify(localChats))
    } catch (error) {
      console.error('Error saving chat:', error)
      // Save to localStorage only
      const localChats = JSON.parse(localStorage.getItem(`chats_${user.id}`) || '[]')
      const existingIndex = localChats.findIndex(c => c.chatId === chatData.chatId)
      
      if (existingIndex >= 0) {
        localChats[existingIndex] = chatData
      } else {
        localChats.push(chatData)
      }
      
      localStorage.setItem(`chats_${user.id}`, JSON.stringify(localChats))
    } finally {
      setIsSaving(false)
    }
  }, [user.id])

  // Delete chat from server
  const deleteChatFromServer = useCallback(async (chatId) => {
    if (!user.id) return
    
    try {
      await authAPI.deleteChat(chatId)
      
      // Also remove from localStorage
      const localChats = JSON.parse(localStorage.getItem(`chats_${user.id}`) || '[]')
      const updatedChats = localChats.filter(chat => chat.chatId !== chatId)
      localStorage.setItem(`chats_${user.id}`, JSON.stringify(updatedChats))
      
      return true
    } catch (error) {
      console.error('Error deleting chat:', error)
      
      // Remove from localStorage only
      const localChats = JSON.parse(localStorage.getItem(`chats_${user.id}`) || '[]')
      const updatedChats = localChats.filter(chat => chat.chatId !== chatId)
      localStorage.setItem(`chats_${user.id}`, JSON.stringify(updatedChats))
      
      return true
    }
  }, [user.id])

  // Initial load
  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  // Load chats when user is loaded
  useEffect(() => {
    if (user.id) {
      loadChatHistory()
    }
  }, [user.id, loadChatHistory])

  // Auto-save chat when it changes
  useEffect(() => {
    if (currentChat && user.id && !isSaving) {
      const saveTimeout = setTimeout(() => {
        saveChatToServer(currentChat)
      }, 2000) // Debounce for 2 seconds
      
      return () => clearTimeout(saveTimeout)
    }
  }, [currentChat, user.id, isSaving, saveChatToServer])

  // Handle logout
  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token')
      localStorage.removeItem('agentic_ai_user')
      // Clear all user-specific chat storage
      if (user.id) {
        localStorage.removeItem(`chats_${user.id}`)
      }
      router.push('/login')
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
      lastUpdated: new Date().toISOString(),
      userId: user.id
    }
    
    const updatedChats = [newChat, ...chats]
    setChats(updatedChats)
    setCurrentChat(newChat)
    setEditingId(newChat.chatId)
    setEditTitle('')
  }

  const handleSelectChat = (chat) => {
    setCurrentChat(chat)
    setEditingId(null)
  }

  const handleEditStart = (chat) => {
    setEditingId(chat.chatId)
    setEditTitle(chat.title)
  }

  const handleEditSave = async (chatId) => {
    if (editTitle.trim()) {
      const updatedChats = chats.map(chat => 
        chat.chatId === chatId ? { ...chat, title: editTitle } : chat
      )
      setChats(updatedChats)
      
      if (currentChat?.chatId === chatId) {
        const updatedCurrentChat = { ...currentChat, title: editTitle }
        setCurrentChat(updatedCurrentChat)
        await saveChatToServer(updatedCurrentChat)
      }
    }
    setEditingId(null)
    setEditTitle('')
  }

  const handleDeleteChat = async (chatId) => {
    if (confirm('Delete this chat?')) {
      const updatedChats = chats.filter(chat => chat.chatId !== chatId)
      setChats(updatedChats)
      
      if (currentChat?.chatId === chatId) {
        setCurrentChat(updatedChats.length > 0 ? updatedChats[0] : null)
      }
      
      await deleteChatFromServer(chatId)
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
    const allowedExtensions = ['.txt', '.csv', '.xlsx', '.pdf', '.py', '.json', '.doc', '.docx', '.eml', '.msg']
    
    const validFiles = uploadedFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase()
      return allowedExtensions.includes(ext)
    })

    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSendMessage = async () => {
    if (!message.trim() && selectedFiles.length === 0) return

    const newMessage = {
      text: message,
      files: selectedFiles.map(f => f.name),
      isUser: true,
      timestamp: new Date().toISOString()
    }

    const updatedChat = {
      ...currentChat,
      messages: [...(currentChat?.messages || []), newMessage],
      files: [...(currentChat?.files || []), ...selectedFiles.map(f => f.name)],
      lastUpdated: new Date().toISOString()
    }

    // Auto-generate AI response
    const aiResponse = {
      text: selectedFiles.length > 0 
        ? `I've received your ${selectedFiles.length} file(s). I'll analyze the data and create a chart for you.`
        : "I'll help you create a chart based on your request. You can upload data files for better analysis.",
      isUser: false,
      timestamp: new Date().toISOString()
    }

    updatedChat.messages.push(aiResponse)

    setCurrentChat(updatedChat)
    
    // Update chats list
    const updatedChats = chats.map(chat => 
      chat.chatId === updatedChat.chatId ? updatedChat : chat
    )
    setChats(updatedChats)

    // Save to server
    await saveChatToServer(updatedChat)

    setMessage('')
    setSelectedFiles([])

    // If it's a new chat without title, set default title
    if (currentChat?.title === 'New Chat' && !editingId) {
      const suggestedTitle = selectedFiles.length > 0 
        ? `Analysis of ${selectedFiles[0].name.split('.')[0]}`
        : 'Chart Analysis'
      
      const titledChat = { ...updatedChat, title: suggestedTitle }
      setCurrentChat(titledChat)
      setChats(updatedChats.map(chat => 
        chat.chatId === titledChat.chatId ? titledChat : chat
      ))
      await saveChatToServer(titledChat)
    }
  }

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase()
    const icons = {
      txt: '📄',
      csv: '📊',
      xlsx: '📈',
      pdf: '📕',
      json: '⚙️',
      py: '🐍',
      doc: '📝',
      docx: '📝',
      eml: '✉️',
      msg: '✉️'
    }
    return icons[ext] || '📁'
  }

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.messages.some(msg => msg.text.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Sidebar Component
  const Sidebar = () => (
    <div className="h-full flex flex-col bg-white border-r">
      {/* Logo Header with Animation */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Animated Logo */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 rounded-2xl animate-spin-slow opacity-80"></div>
              <div className="absolute inset-1 bg-gradient-to-br from-purple-700 to-pink-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Bot className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Agentic AI</h1>
            <p className="text-xs text-gray-500">Welcome, {user.name.split(' ')[0]}</p>
          </div>
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
                      {chat.files.length > 0 && (
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

      {/* User Profile & Logout */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <div 
            onClick={() => router.push('/profile')}
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
          
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-2"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-gray-500 hover:text-red-500" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
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
        
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                       flex items-center justify-center text-white font-bold text-sm">
          {user.name.charAt(0)}
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
              {currentChat && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{currentChat.date}</span>
                  <span>•</span>
                  <span>{currentChat.time}</span>
                  {currentChat.files.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-purple-600">{currentChat.files.length} file(s)</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
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
              <div className="max-w-3xl mx-auto">
                {/* Chart Preview */}
                {currentChat.files.length > 0 && (
                  <div className="mb-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-purple-100">
                    <div className="flex items-center gap-3 mb-4">
                      <BarChart3 className="w-6 h-6 text-purple-600" />
                      <h3 className="font-semibold text-gray-900">Chart Preview</h3>
                      <span className="ml-auto text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                        {currentChat.files.length} file(s)
                      </span>
                    </div>
                    <div className="h-48 bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-600">Chart will be generated here</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Uploaded files: {currentChat.files.join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="space-y-6">
                  {currentChat.messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Ready when you are
                      </h3>
                      <p className="text-gray-600">
                        Upload files or ask anything to create charts
                      </p>
                      <div className="mt-4 text-sm text-gray-500">
                        <p>Supports: TXT, CSV, XLSX, PDF, PY, JSON, DOC, EML, MSG</p>
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
                            : 'bg-white border border-gray-200 rounded-bl-none'
                          }`}
                        >
                          <p>{msg.text}</p>
                          {msg.files?.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {msg.files.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm opacity-90">
                                  <FileText className="w-4 h-4" />
                                  <span>{file}</span>
                                </div>
                              ))}
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
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="relative w-32 h-32 mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 rounded-3xl animate-spin-slow [animation-duration:8s] opacity-80"></div>
                  <div className="absolute inset-4 bg-gradient-to-br from-purple-700 to-pink-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30">
                    <Bot className="w-20 h-20 text-white animate-float" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Welcome back, {user.name.split(' ')[0]}!
                </h2>
                <p className="text-gray-600 max-w-md mb-8 text-lg">
                  Your intelligent chart creation assistant
                </p>
                <button
                  onClick={handleNewChat}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-medium hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200 text-lg flex items-center gap-3"
                >
                  <Plus className="w-6 h-6" />
                  Start new chat
                </button>
                <div className="mt-8 text-sm text-gray-500">
                  <p>You have {chats.length} saved chat{chats.length !== 1 ? 's' : ''}</p>
                  <p className="mt-1">Upload files or ask questions to generate charts</p>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t p-4 bg-white">
            <div className="max-w-3xl mx-auto">
              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Selected Files:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 
                                 rounded-lg text-sm"
                      >
                        <span className="text-lg">{getFileIcon(file.name)}</span>
                        <span className="max-w-xs truncate">{file.name}</span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-gray-400 hover:text-red-500 ml-2"
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
                  accept=".txt,.csv,.xlsx,.pdf,.py,.json,.doc,.docx,.eml,.msg"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                  title="Upload files"
                >
                  <Upload className="w-5 h-5" />
                  <span className="hidden sm:inline">Upload</span>
                </button>
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask Agentic AI anything..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={(!message.trim() && selectedFiles.length === 0) || isSaving}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 
                             bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 text-center">
                <p className="text-xs text-gray-500">
                  Chat automatically saved • Supports: TXT, CSV, XLSX, PDF, PY, JSON, DOC, EML, MSG
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}