'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, LogIn, Eye, EyeOff, Sparkles, AlertCircle, CheckCircle, Bot } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI, agenticAPI } from '@/services/api';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get backend URL from environment
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://agentic-system-1.onrender.com'

  // Check for success messages
  useEffect(() => {
    const resetSuccess = searchParams.get('resetSuccess')
    const signupSuccess = searchParams.get('signupSuccess')
    
    if (resetSuccess) {
      setSuccessMessage('Password reset successfully! Please login with your new password.')
      toast.success('Password reset successfully!')
    }
    
    if (signupSuccess) {
      setSuccessMessage('Account created successfully! Please login.')
      toast.success('Account created successfully!')
    }

    // Check if user is already logged in
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('agentic_ai_user')
      if (token && userData) {
        // User is already logged in, redirect to dashboard
        router.push('/dashboard')
      }
    }
  }, [searchParams, router])

  // Check backend health on component mount
  useEffect(() => {
    checkBackendHealth()
  }, [])

  const checkBackendHealth = async () => {
  try {
    setBackendStatus('checking')
    console.log('🔍 Checking backend health...')
    const health = await agenticAPI.healthCheck() // Use agenticAPI.healthCheck
    console.log('✅ Backend health check:', health)
    setBackendStatus('connected')
  } catch (error) {
    console.error('❌ Backend health check failed:', error)
    setBackendStatus('disconnected')
  }
}

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      console.log('🔄 Attempting login...')
      console.log('📡 Backend URL:', BACKEND_URL)

      // Check backend status first
      if (backendStatus === 'disconnected') {
        try {
          await checkBackendHealth()
        } catch (healthError) {
          console.error('❌ Backend connection failed:', healthError)
          setError(`
            Cannot connect to the server. Please check:
            1. Backend server is running
            2. Network connection is working
            
            Backend URL: ${BACKEND_URL}
          `)
          toast.error('Cannot connect to server')
          setLoading(false)
          return
        }
      }

      // Proceed with login using the imported authAPI
      console.log('📤 Sending login request...', { email: formData.email })
      
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password
      })

      console.log('✅ Login API response:', response)

      if (response.success) {
        console.log('✅ Login successful, user data:', response.user)
        console.log('✅ Token saved:', response.token ? 'Yes' : 'No')
        
        setSuccessMessage('Login successful! Redirecting...')
        toast.success('Welcome to Agentic System!')
        
        // Check if token and user data are saved
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token')
          const user = localStorage.getItem('agentic_ai_user')
          console.log('✅ Local storage check - Token:', token ? 'Saved' : 'Not saved')
          console.log('✅ Local storage check - User:', user ? 'Saved' : 'Not saved')
        }
        
        // Redirect to dashboard after successful login
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      } else {
        setError(response.message || 'Login failed. Please try again.')
        toast.error(response.message || 'Login failed')
      }
    } catch (error) {
      console.error('🔥 Login error:', error)
      
      // Detailed error logging
      console.log('🔍 Error details:', {
        message: error.message,
        status: error.status,
        data: error.data,
        url: error.config?.url // This will show the exact endpoint being called
      })
      
      if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
        setError(`
          Cannot connect to the server. Please check:
          1. Backend server is running at ${BACKEND_URL}
          2. Network connection is working
          
          Backend URL: ${BACKEND_URL}
        `)
        toast.error('Cannot connect to server')
      } else if (error.message.includes('timeout')) {
        setError('Request timeout. The server is taking too long to respond.')
        toast.error('Request timeout')
      } else if (error.status === 404) {
        setError('API endpoint not found. Please check backend routes.')
        toast.error('API endpoint not found')
      } else if (error.status === 401 || error.message.includes('Invalid credentials')) {
        setError('Invalid email or password. Please try again.')
        toast.error('Invalid email or password')
      } else if (error.data?.message) {
        setError(error.data.message)
        toast.error(error.data.message)
      } else {
        setError(`Login failed: ${error.message}`)
        toast.error('Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Background decorative elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl"></div>
      </div>

      {/* Backend status indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 backdrop-blur-sm border ${
          backendStatus === 'connected' 
            ? 'bg-green-100/80 text-green-800 border-green-300/50' 
            : backendStatus === 'disconnected'
            ? 'bg-red-100/80 text-red-800 border-red-300/50'
            : 'bg-yellow-100/80 text-yellow-800 border-yellow-300/50'
        }`}>
          {backendStatus === 'connected' ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>✅ Backend Connected</span>
            </>
          ) : backendStatus === 'disconnected' ? (
            <>
              <AlertCircle className="w-4 h-4" />
              <span>❌ Backend Offline</span>
            </>
          ) : (
            <>
              <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
              <span>🔄 Checking Backend...</span>
            </>
          )}
        </div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Header with Enhanced Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              {/* Animated Logo */}
              <div className="relative w-28 h-28">
                {/* Outer ring */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 rounded-3xl animate-spin-slow [animation-duration:8s] opacity-80"></div>
                
                {/* Main logo */}
                <div className="absolute inset-2 bg-gradient-to-br from-purple-700 to-pink-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30">
                  <Bot className="w-16 h-16 text-white animate-float" />
                </div>
                
                {/* Decorative dots */}
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full border-4 border-white shadow-lg animate-bounce"></div>
                <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full border-4 border-white shadow-lg animate-bounce delay-300"></div>
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full border-4 border-white shadow-lg animate-bounce delay-500"></div>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome Back
          </h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-300"></div>
            <p className="text-gray-600 text-lg">
              Sign in to <span className="font-bold gradient-text">Agentic System</span>
            </p>
            <div className="h-px w-12 bg-gradient-to-r from-purple-300 to-transparent"></div>
          </div>
          <p className="text-gray-500 text-sm">
            Your AI-powered conversation platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/40">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Success Message */}
            {successMessage && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-xl mb-6 animate-slide-in">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-4 rounded-xl mb-6 animate-slide-in">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-500" />
                  Email Address
                </div>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 hover:border-purple-300"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-500" />
                  Password
                </div>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 hover:border-purple-300"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              <div className="mt-2 flex justify-end">
                <Link 
                  href="/forgot-password" 
                  className="text-sm font-medium gradient-text hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Remember Me & Submit */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                  Remember me
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span className="text-lg">Sign In</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Quick Access</span>
              </div>
            </div>

            {/* Demo Credentials */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Demo Credentials</p>
                  <div className="space-y-1">
                    <p className="text-xs text-blue-700">
                      <span className="font-medium">Backend:</span> {backendStatus === 'connected' ? 'Connected ✅' : 'Demo Mode ⚠️'}
                    </p>
                    <button
                        type="button"
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const response = await fetch(`${BACKEND_URL}/api/demo/register`, { method: 'POST' });
                                const data = await response.json();
                                if (data.success) {
                                  if (typeof window !== 'undefined') {
                                    localStorage.setItem('token', data.user.token);
                                    localStorage.setItem('agentic_ai_user', JSON.stringify(data.user));
                                  }
                                  setSuccessMessage('Demo Login Successful!');
                                  setTimeout(() => router.push('/dashboard'), 1000);
                                }
                            } catch (e) {
                                toast.error("Demo login failed");
                            } finally {
                                setLoading(false);
                            }
                        }}
                        className="mt-2 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
                    >
                        One-Click Demo Login
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Signup Link */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600">
              New to Agentic System?{' '}
              <Link
                href="/signup"
                className="font-bold gradient-text hover:underline hover:underline-offset-2"
              >
                Create your account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-6 h-px bg-gradient-to-r from-transparent to-purple-300"></div>
            <p className="text-xs text-gray-500">
              © 2024 Agentic System. AI Chat Platform
            </p>
            <div className="w-6 h-px bg-gradient-to-r from-purple-300 to-transparent"></div>
          </div>
          <p className="text-xs text-gray-400">
            Backend: {backendStatus === 'connected' ? 'Connected ✅' : 'Demo Mode ⚠️'}
          </p>
        </div>
      </div>
    </div>
  )
}