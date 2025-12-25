'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Mail, 
  Camera, 
  ArrowLeft,
  Save,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Shield
} from 'lucide-react'
import { authAPI } from '@/services/api'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState({
    name: 'Loading...',
    email: 'Loading...',
    photo: null
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Password Change State
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

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
      
      // Validate file size (max 800KB to prevent LocalStorage quota issues)
      // 800KB = 800 * 1024 bytes
      if (file.size > 800 * 1024) {
        alert('Image size should be less than 800KB to ensure it can be saved.')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const newPhoto = reader.result
        
        try {
          // Update local state
          const updatedUser = { ...user, photo: newPhoto }
          
          // Try to save to localStorage FIRST to catch quota errors before updating state
          saveUserToLocalStorage(updatedUser)
          
          // If successful, update state
          setUser(updatedUser)
          
          // If editing, automatically save (already saved above)
          if (isEditing) {
            toast.success('Profile photo updated')
          }
        } catch (error) {
          console.error('Storage error:', error)
          if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
            alert('Storage full! Please upload a smaller image (under 500KB recommended).')
          } else {
            alert('Failed to save image. Please try again.')
          }
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
      throw error; // Re-throw to be caught by caller
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
    
    try {
      // Save to localStorage
      saveUserToLocalStorage(user)
      setIsEditing(false)
      toast.success('Profile updated successfully!')
    } catch (error) {
      alert('Failed to save changes. Your browser storage might be full.')
    }
  }

  const handleCancelEdit = () => {
    // Reload original data from localStorage
    loadUserData()
    setIsEditing(false)
  }

  // Password Change Handler
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')
    setIsChangingPassword(true)

    try {
      if (passwordData.newPassword !== passwordData.confirmNewPassword) {
        throw new Error('New passwords do not match')
      }

      if (passwordData.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters')
      }

      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmNewPassword: passwordData.confirmNewPassword
      })

      setPasswordSuccess('Password changed successfully! Please login with your new password.')
      toast.success('Password changed successfully!')
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      })
      
      // Initializing logout after short delay
      setTimeout(() => {
        authAPI.logout()
        router.push('/login')
      }, 2000)

    } catch (error) {
      console.error('Password change error:', error)
      setPasswordError(error.userMessage || error.message || 'Failed to change password')
      toast.error(error.userMessage || 'Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
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
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

          {/* Profile Photo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                           flex items-center justify-center text-white text-4xl font-bold mb-4 overflow-hidden shadow-lg border-4 border-white">
                {user.photo ? (
                  <img 
                    src={user.photo} 
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <label className="absolute bottom-4 right-0 bg-white p-2.5 rounded-full shadow-lg 
                             cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200 group">
                <Camera className="w-5 h-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
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
                className="mt-2 text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* Name Field */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 text-purple-500" />
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
              <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 border border-gray-100">
                {user.name}
              </div>
            )}
          </div>

          {/* Email Field */}
          <div className="mb-8">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 text-purple-500" />
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
              <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 border border-gray-100">
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
                Edit Profile Info
              </button>
            )}
          </div>
        </div>

        {/* Change Password Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 overflow-hidden">
           <button 
             onClick={() => setShowPasswordSection(!showPasswordSection)}
             className="w-full flex items-center justify-between text-left"
           >
             <div className="flex items-center gap-3">
               <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                 <Shield className="w-5 h-5" />
               </div>
               <span className="font-semibold text-gray-900">Security & Password</span>
             </div>
             <span className="text-gray-400">
                {showPasswordSection ? 'Hide' : 'Show'}
             </span>
           </button>

           <div className={`transition-all duration-300 ease-in-out ${
             showPasswordSection ? 'max-h-[500px] opacity-100 mt-6' : 'max-h-0 opacity-0 overflow-hidden'
           }`}>
             
              {/* Success Message */}
             {passwordSuccess && (
               <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-xl flex items-center gap-2 text-sm">
                 <CheckCircle className="w-4 h-4 flex-shrink-0" />
                 {passwordSuccess}
               </div>
             )}

             {/* Error Message */}
             {passwordError && (
               <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-xl flex items-center gap-2 text-sm">
                 <AlertCircle className="w-4 h-4 flex-shrink-0" />
                 {passwordError}
               </div>
             )}

             <form onSubmit={handlePasswordChange} className="space-y-4">
               {/* Current Password */}
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
               </div>

               {/* New Password */}
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
               </div>

               {/* Confirm Password */}
               <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={passwordData.confirmNewPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                      className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Confirm new password"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Lock className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
               </div>

               <button
                 type="submit"
                 disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword}
                 className="w-full bg-indigo-600 text-white rounded-lg py-2.5 font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
               >
                 {isChangingPassword ? 'Updating Password...' : 'Update Password'}
               </button>
             </form>
           </div>
        </div>

        {/* Storage Info */}
        <div className="mt-8">
          <p className="text-xs text-gray-500 text-center">
             Profile data is stored locally. 
             Photos restricted to 800KB.
          </p>
        </div>
      </div>
    </div>
  )
}