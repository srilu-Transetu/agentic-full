'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Mail, 
  Camera, 
  Lock, 
  Moon, 
  Sun,
  Bell,
  HelpCircle,
  Settings,
  CreditCard,
  Shield
} from 'lucide-react'

export default function UserProfile({ user, onChangePassword }) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const router = useRouter()

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        console.log('New profile picture:', reader.result)
        // Here you would call API to update profile picture
      }
      reader.readAsDataURL(file)
    }
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    // Implement theme switching logic
    if (!isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                         flex items-center justify-center text-white text-2xl font-bold">
            {user.photo ? (
              <img 
                src={user.photo} 
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg 
                           cursor-pointer hover:bg-gray-50 transition-colors">
            <Camera className="w-4 h-4 text-gray-600" />
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
          <p className="text-gray-600 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {user.email}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              Premium User
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Change Password */}
        <button
          onClick={() => router.push('/change-password')}
          className="flex items-center justify-between w-full p-3 hover:bg-gray-50 rounded-xl 
                     transition-all duration-200 group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Lock className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Change Password</p>
              <p className="text-sm text-gray-500">Update your account password</p>
            </div>
          </div>
          <div className="text-gray-400 group-hover:text-gray-600">
            →
          </div>
        </button>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl 
                       transition-all duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-medium text-gray-900">Theme</p>
              <p className="text-sm text-gray-500">{isDarkMode ? 'Dark' : 'Light'} mode</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full 
                       ${isDarkMode ? 'bg-purple-600' : 'bg-gray-300'} transition-colors`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform 
                            ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Notifications */}
        <button className="flex items-center justify-between w-full p-3 hover:bg-gray-50 rounded-xl 
                       transition-all duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Notifications</p>
              <p className="text-sm text-gray-500">Manage your notifications</p>
            </div>
          </div>
          <div className="text-gray-400">
            →
          </div>
        </button>

        {/* Billing */}
        <button className="flex items-center justify-between w-full p-3 hover:bg-gray-50 rounded-xl 
                       transition-all duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Billing</p>
              <p className="text-sm text-gray-500">Manage subscription & payments</p>
            </div>
          </div>
          <div className="text-gray-400">
            →
          </div>
        </button>

        {/* Security */}
        <button className="flex items-center justify-between w-full p-3 hover:bg-gray-50 rounded-xl 
                       transition-all duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Security</p>
              <p className="text-sm text-gray-500">Privacy & security settings</p>
            </div>
          </div>
          <div className="text-gray-400">
            →
          </div>
        </button>

        {/* Help & Support */}
        <button className="flex items-center justify-between w-full p-3 hover:bg-gray-50 rounded-xl 
                       transition-all duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Help & Support</p>
              <p className="text-sm text-gray-500">Get help and contact support</p>
            </div>
          </div>
          <div className="text-gray-400">
            →
          </div>
        </button>
      </div>
    </div>
  )
}