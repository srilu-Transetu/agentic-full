'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Mail, 
  Camera, 
  ArrowLeft,
  Save
} from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState({
    name: 'Loading...',
    email: 'Loading...',
    photo: null
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load user data from localStorage on component mount
  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = () => {
    try {
      // Try to get user from localStorage
      const savedUser = localStorage.getItem('agentic_ai_user')
      
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser)
        setUser({
          name: parsedUser.name || 'User',
          email: parsedUser.email || '',
          photo: parsedUser.photo || null
        })
      } else {
        // Fallback to authAPI if needed
        const currentUser = JSON.parse(localStorage.getItem('agentic_ai_user') || '{}')
        setUser({
          name: currentUser.name || 'User',
          email: currentUser.email || '',
          photo: currentUser.photo || null
        })
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      setUser({
        name: 'User',
        email: '',
        photo: null
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const newPhoto = reader.result
        
        // Update local state
        const updatedUser = { ...user, photo: newPhoto }
        setUser(updatedUser)
        
        // Save to localStorage
        saveUserToLocalStorage(updatedUser)
        
        // If editing, automatically save
        if (isEditing) {
          handleSaveChanges()
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const saveUserToLocalStorage = (userData) => {
    try {
      // Get existing user data
      const existingUser = JSON.parse(localStorage.getItem('agentic_ai_user') || '{}')
      
      // Merge with new data
      const updatedUser = {
        ...existingUser,
        name: userData.name,
        email: userData.email,
        photo: userData.photo
      }
      
      // Save back to localStorage
      localStorage.setItem('agentic_ai_user', JSON.stringify(updatedUser))
      console.log('✅ User data saved to localStorage')
      
      // Also update dashboard state by triggering a custom event
      window.dispatchEvent(new Event('userProfileUpdated'))
      
    } catch (error) {
      console.error('Error saving user data:', error)
    }
  }

  const handleSaveChanges = () => {
    if (!user.name.trim()) {
      alert('Name cannot be empty')
      return
    }
    
    if (!user.email.trim()) {
      alert('Email cannot be empty')
      return
    }
    
    // Save to localStorage
    saveUserToLocalStorage(user)
    
    setIsEditing(false)
    alert('Profile updated successfully!')
  }

  const handleCancelEdit = () => {
    // Reload original data from localStorage
    loadUserData()
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

          {/* Profile Photo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                           flex items-center justify-center text-white text-4xl font-bold mb-4 overflow-hidden">
                {user.photo ? (
                  <img 
                    src={user.photo} 
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg 
                             cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200">
                <Camera className="w-5 h-5 text-gray-600" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-gray-500">Click camera icon to change photo</p>
            {user.photo && (
              <button
                onClick={() => {
                  if (confirm('Remove profile photo?')) {
                    const updatedUser = { ...user, photo: null }
                    setUser(updatedUser)
                    saveUserToLocalStorage(updatedUser)
                  }
                }}
                className="mt-2 text-sm text-red-500 hover:text-red-700"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* Name Field */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={user.name}
                onChange={(e) => setUser(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your name"
              />
            ) : (
              <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900">
                {user.name}
              </div>
            )}
          </div>

          {/* Email Field */}
          <div className="mb-8">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={user.email}
                onChange={(e) => setUser(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your email"
              />
            ) : (
              <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900">
                {user.email}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Storage Info */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Profile data is stored locally in your browser. 
              Photos are saved as Base64 strings in localStorage (max 5MB).
            </p>
            <p className="text-xs text-gray-400 text-center mt-1">
              Data will persist until you clear browser data or logout.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}