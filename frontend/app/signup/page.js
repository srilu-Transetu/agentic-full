'use client'
import axios from 'axios';
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Eye, EyeOff, CheckCircle, XCircle, FileText, Shield, X, Bot, Sparkles } from 'lucide-react'
import { authAPI } from '@/services/api';
import toast from 'react-hot-toast'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const router = useRouter()

  // Get backend URL from environment
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://agentic-system-1.onrender.com'

  // Password validation
  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*]/.test(password)
    }
    return requirements
  }

  const passwordRequirements = validatePassword(formData.password)

const handleSubmit = async (e) => {
  e.preventDefault()
  setError('')
  setSuccess('')

  // Validation
  if (formData.password !== formData.confirmPassword) {
    setError('Passwords do not match')
    toast.error('❌ Passwords do not match')
    return
  }

  // Check all password requirements
  const requirements = validatePassword(formData.password)
  const allValid = Object.values(requirements).every(req => req)
  if (!allValid) {
    setError('Please meet all password requirements')
    toast.error('⚠️ Please meet all password requirements')
    return
  }

  setLoading(true)

  try {
    console.log('📝 Signup attempt for:', formData.email)
    console.log('📡 Backend URL:', BACKEND_URL)
    
    // FIXED: Use the correct response structure
    const response = await axios.post(`${BACKEND_URL}/api/auth/register`, {
      name: formData.name,
      email: formData.email,
      password: formData.password
    });

    const data = response.data; // Get the data from response
    console.log('✅ Signup API response:', data)
    
    // FIXED: Check data.success instead of response.success
    if (data.success) {
      setSuccess(data.message || 'Account created successfully! Welcome to Agentic System.')
      
      toast.success('🎉 Account created successfully!')
      
      // Check if token and user data are saved
      if (typeof window !== 'undefined') {
        // FIXED: Save token and user from data, not response
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        if (data.user) {
          localStorage.setItem('agentic_ai_user', JSON.stringify(data.user));
        }
        
        const token = localStorage.getItem('token')
        const user = localStorage.getItem('agentic_ai_user')
        console.log('✅ Local storage check - Token:', token ? 'Saved' : 'Not saved')
        console.log('✅ Local storage check - User:', user ? 'Saved' : 'Not saved')
      }
      
      // Redirect to dashboard after successful signup
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
      
    } else {
      // Show detailed error if available
      let errorMessage = data.message || 'Signup failed. Please try again.'
      
      // Check if there are validation errors
      if (data.errors && Array.isArray(data.errors)) {
        errorMessage = data.errors.map(err => `${err.field}: ${err.message}`).join(', ')
      }
      
      setError(errorMessage)
      toast.error('❌ ' + errorMessage)
    }

  } catch (err) {
    console.error('❌ Signup error:', err)
    
    // FIXED: Handle axios error structure
    let errorMessage = 'Signup failed. Please try again.';
    
    if (err.response) {
      // Server responded with error
      const errorData = err.response.data;
      errorMessage = errorData.message || errorData.error || 'Signup failed';
      
      if (errorData.errors && Array.isArray(errorData.errors)) {
        errorMessage = errorData.errors.map(err => `${err.field}: ${err.message}`).join(', ')
      }
    } else if (err.request) {
      // Request was made but no response
      errorMessage = 'No response from server. Please check your internet connection.';
    } else {
      // Something else happened
      errorMessage = err.message || 'Signup failed';
    }
    
    setError(errorMessage)
    toast.error('❌ ' + errorMessage)
  } finally {
    setLoading(false)
  }
}

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Clear error when user starts typing
    if (error) {
      setError('')
    }
  }

  // Terms of Service Modal
  const TermsOfService = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-900 mb-2">Terms of Service</h3>
      <p className="text-sm text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900">1. Acceptance of Terms</h4>
        <p className="text-gray-600 text-sm">
          By accessing and using Agentic System, you accept and agree to be bound by the terms and provision of this agreement.
        </p>

        <h4 className="font-semibold text-gray-900">2. Description of Service</h4>
        <p className="text-gray-600 text-sm">
          Agentic System provides AI-powered chat services, including intelligent conversations, 
          content assistance, and automated processing based on user instructions.
        </p>

        <h4 className="font-semibold text-gray-900">3. User Responsibilities</h4>
        <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
          <li>You must be at least 18 years old to use this service</li>
          <li>You are responsible for maintaining the confidentiality of your account</li>
          <li>You agree not to use the service for any illegal or unauthorized purpose</li>
          <li>You are responsible for all content processed through your account</li>
        </ul>

        <h4 className="font-semibold text-gray-900">4. Intellectual Property</h4>
        <p className="text-gray-600 text-sm">
          All intellectual property rights in the service and its original content are and will remain the exclusive property 
          of Agentic System and its licensors.
        </p>

        <h4 className="font-semibold text-gray-900">5. Limitation of Liability</h4>
        <p className="text-gray-600 text-sm">
          Agentic System shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting 
          from your use of or inability to use the service.
        </p>

        <h4 className="font-semibold text-gray-900">6. Changes to Terms</h4>
        <p className="text-gray-600 text-sm">
          We reserve the right to modify these terms at any time. We will notify users of any changes by updating the date at 
          the top of these terms.
        </p>
      </div>
    </div>
  )

  // Privacy Policy Modal
  const PrivacyPolicy = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-900 mb-2">Privacy Policy</h3>
      <p className="text-sm text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900">1. Information We Collect</h4>
        <p className="text-gray-600 text-sm">
          We collect information you provide directly to us, including:
        </p>
        <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
          <li>Account information (name, email address)</li>
          <li>Chat history and conversation data</li>
          <li>Usage patterns and preferences</li>
          <li>Communication preferences</li>
        </ul>

        <h4 className="font-semibold text-gray-900">2. How We Use Your Information</h4>
        <p className="text-gray-600 text-sm">
          We use the information we collect to:
        </p>
        <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
          <li>Provide, maintain, and improve our AI chat services</li>
          <li>Personalize your chat experience</li>
          <li>Communicate with you about updates and features</li>
          <li>Ensure security and prevent fraud</li>
        </ul>

        <h4 className="font-semibold text-gray-900">3. Data Storage and Security</h4>
        <p className="text-gray-600 text-sm">
          We implement appropriate technical and organizational security measures to protect your personal information. 
          Chat data is encrypted and stored securely.
        </p>

        <h4 className="font-semibold text-gray-900">4. Your Rights</h4>
        <p className="text-gray-600 text-sm">
          You have the right to:
        </p>
        <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate personal information</li>
          <li>Request deletion of your personal information</li>
          <li>Object to processing of your personal information</li>
          <li>Request restriction of processing your personal information</li>
        </ul>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Background decorative elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl"></div>
      </div>

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/40">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Terms of Service</h2>
                  <p className="text-sm text-gray-500">Please read these terms carefully</p>
                </div>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-2 hover:bg-white/50 rounded-xl transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <TermsOfService />
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowTermsModal(false)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300"
              >
                I Understand & Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/40">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Privacy Policy</h2>
                  <p className="text-sm text-gray-500">How we protect and use your data</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="p-2 hover:bg-white/50 rounded-xl transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <PrivacyPolicy />
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300"
              >
                I Understand & Agree
              </button>
            </div>
          </div>
        </div>
      )}

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
            Create Account
          </h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-purple-300"></div>
            <p className="text-gray-600 text-lg">
              Join <span className="font-bold gradient-text">Agentic System</span>
            </p>
            <div className="h-px w-12 bg-gradient-to-r from-purple-300 to-transparent"></div>
          </div>
          <p className="text-gray-500 text-sm">
            Start your AI-powered conversation journey
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/40">
          {success && (
            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-xl animate-slide-in">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm text-green-700 font-medium">{success}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-4 rounded-xl animate-slide-in">
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-500" />
                  Full Name
                </div>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 hover:border-purple-300"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

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
                  placeholder="Create a strong password"
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

              {/* Password Requirements */}
              <div className="mt-4 space-y-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Password Requirements:</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(passwordRequirements).map(([key, isValid]) => (
                    <div key={key} className="flex items-center gap-2">
                      {isValid ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300" />
                      )}
                      <span className={`text-xs font-medium ${isValid ? 'text-green-600' : 'text-gray-500'}`}>
                        {key === 'length' && '8+ Characters'}
                        {key === 'uppercase' && 'Uppercase Letter'}
                        {key === 'number' && 'Number (0-9)'}
                        {key === 'special' && 'Special Character'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-500" />
                  Confirm Password
                </div>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 hover:border-purple-300"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="terms"
                required
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mt-1"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-purple-600 hover:text-purple-700 font-semibold hover:underline"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-purple-600 hover:text-purple-700 font-semibold hover:underline"
                >
                  Privacy Policy
                </button>
              </label>
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
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span className="text-lg">Create Account</span>
                </>
              )}
            </button>

            {/* Demo Note */}
{/* Demo Note - UPDATED CODE (Replace with this) */}
<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
  <div className="flex items-start">
    <div className="flex-shrink-0">
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
    </div>
    <div className="ml-3">
      <p className="text-sm font-semibold text-blue-900 mb-1">Backend Status</p>
      <div className="space-y-1">
        <p className="text-xs text-blue-700">
          • Endpoint: POST {BACKEND_URL}/api/auth/register
        </p>
        <p className="text-xs text-blue-700">
          • Data saved to MongoDB
        </p>
        <p className="text-xs text-blue-700">
          • JWT authentication enabled
        </p>
      </div>
    </div>
  </div>
</div>
          </form>

          {/* Login Link */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-bold gradient-text hover:underline hover:underline-offset-2"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-6 h-px bg-gradient-to-r from-transparent to-purple-300"></div>
            <p className="text-xs text-gray-500">
              © 2024 Agentic System. Secure AI Chat Platform
            </p>
            <div className="w-6 h-px bg-gradient-to-r from-purple-300 to-transparent"></div>
          </div>
          <p className="text-xs text-gray-400">
            All your conversations are encrypted and secure
          </p>
        </div>
      </div>
    </div>
  )
}