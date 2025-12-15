'use client'

import { useState } from 'react'
import { 
  MessageSquare, 
  Search, 
  Plus,
  Folder,
  Users,
  MoreVertical,
  Edit2,
  Share2,
  Trash2,
  User,
  LogOut
} from 'lucide-react'

export default function Sidebar({ 
  chats, 
  currentChatId, 
  onNewChat, 
  onSelectChat,
  onEditTitle,
  onDeleteChat,
  onShareChat,
  user,
  onProfileClick
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [menuOpen, setMenuOpen] = useState(null)

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleEditStart = (chat) => {
    setEditingId(chat.id)
    setEditTitle(chat.title)
  }

  const handleEditSave = (id) => {
    if (editTitle.trim()) {
      onEditTitle(id, editTitle)
    }
    setEditingId(null)
    setEditTitle('')
  }

  const handleDelete = (id) => {
    if (confirm('Delete this chat?')) {
      onDeleteChat(id)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Logo */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">ChartGPT</h1>
            <p className="text-xs text-gray-500">Free offer</p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <button
        onClick={onNewChat}
        className="mx-4 my-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        New chat
      </button>

      {/* Search */}
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

      {/* Navigation */}
      <div className="px-4 mb-4 space-y-1">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          Navigation
        </div>
        <button className="flex items-center gap-3 p-2 text-gray-700 hover:bg-gray-100 rounded-lg w-full text-sm">
          <Folder className="w-4 h-4" />
          Library
        </button>
        <button className="flex items-center gap-3 p-2 text-gray-700 hover:bg-gray-100 rounded-lg w-full text-sm">
          <Users className="w-4 h-4" />
          Projects
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          Previous chats
        </div>
        
        <div className="space-y-1">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors
                       ${currentChatId === chat.id ? 'bg-purple-50' : 'hover:bg-gray-100'}`}
              onClick={() => onSelectChat(chat)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentChatId === chat.id ? 'text-purple-600' : 'text-gray-400'}`} />
                <div className="min-w-0 flex-1">
                  {editingId === chat.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleEditSave(chat.id)}
                      onKeyPress={(e) => e.key === 'Enter' && handleEditSave(chat.id)}
                      className="w-full text-sm border-none bg-transparent focus:outline-none focus:ring-0"
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {chat.title}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">{chat.date}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {chat.files.length > 0 && (
                  <span className="text-xs text-gray-400">{chat.files.length} files</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(menuOpen === chat.id ? null : chat.id)
                  }}
                  className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
                
                {menuOpen === chat.id && (
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
                          onShareChat(chat)
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
                          handleDelete(chat.id)
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
      </div>

      {/* User Profile */}
      <div className="p-4 border-t">
        <div 
          onClick={onProfileClick}
          className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
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
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <button className="p-1 hover:bg-gray-200 rounded">
            <LogOut className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  )
}