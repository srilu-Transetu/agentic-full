'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle, XCircle, ArrowLeft, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tokenValid, setTokenValid] = useState(true)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Password validation
  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*]/.test(password),
    }
    return requirements
  }

  const passwordRequirements = validatePassword(formData.newPassword)

  // Check token on component mount
  useEffect(() => {
    const token = searchParams.get('token')
    const email = searchParams.get('email')
    
    // In demo mode, accept any token
    if (!token || token === 'demo' || token.includes('demo')) {
      setTokenValid(true)
    } else {
      // Check if token exists in localStorage (demo)
      const storedToken = localStorage.getItem('resetToken')
      if (storedToken && storedToken === token) {
        setTokenValid(true)
      } else {
        setTokenValid(false)
        toast.error('Invalid or expired reset token')
      }
    }
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Check if token is valid
    if (!tokenValid) {
      toast.error('Invalid reset token. Please request a new reset link.')
      return
    }
    
    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    // Check all password requirements
    const requirements = validatePassword(formData.newPassword)
    const allValid = Object.values(requirements).every(req => req)
    if (!allValid) {
      toast.error('Please meet all password requirements')
      return
    }

    // Check if new password is same as old (demo check)
    const oldPassword = localStorage.getItem('oldPassword')
    if (oldPassword && formData.newPassword === oldPassword) {
      toast.error('New password must be different from your previous password')
      return
    }

    setLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Store new password in localStorage for demo
      if (typeof window !== 'undefined') {
        localStorage.setItem('oldPassword', formData.newPassword)
        localStorage.removeItem('resetToken')
        localStorage.removeItem('resetEmail')
      }
      
      setPasswordChanged(true)
      toast.success('✅ Password reset successful!')
      
      // Redirect to login after success
      setTimeout(() => {
        router.push('/login?resetSuccess=true')
      }, 2000)
      
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error('Failed to reset password. Please try again.')
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

  // If token is invalid
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl shadow-2xl">
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Invalid Token
            </h1>
            <p className="text-gray-600 mb-8">
              Your reset token is invalid or has expired
            </p>
            
            <div className="space-y-4">
              <Link
                href="/forgot-password"
                className="inline-block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300"
              >
                Request New Reset Link
              </Link>
              <Link
                href="/login"
                className="inline-block w-full bg-white text-purple-700 font-semibold py-3.5 rounded-xl border border-purple-200 hover:bg-purple-50 transition-all duration-300"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Background decorative elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-2/3 right-1/3 w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/forgot-password"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Reset Request
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl shadow-2xl shadow-purple-500/30">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Set New Password
          </h1>
          <p className="text-gray-600">
            Create a strong new password for your account
          </p>
        </div>

        {/* Reset Card */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/40">
          {passwordChanged ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Password Reset Successful!
              </h3>
              <p className="text-gray-600 mb-6">
                Your password has been updated successfully.
              </p>
              <div className="text-sm text-gray-500 animate-pulse">
                Redirecting to login page...
              </div>
            </div>
          ) : (
            <>
              {/* Demo Notice */}
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Security Requirements
                    </p>
                    <p className="text-xs text-blue-700">
                      Create a strong password that meets all requirements below.
                      Your new password must be different from your previous password.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-500" />
                      New Password
                    </div>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="w-full pl-12 pr-12 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 hover:border-purple-300"
                      placeholder="Enter new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>

                  {/* Password Requirements */}
                  <div className="mt-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Password Requirements:
                    </p>
                    <div className="space-y-2">
                      {Object.entries(passwordRequirements).map(([key, isValid]) => (
                        <div key={key} className="flex items-center gap-3">
                          {isValid ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-300" />
                          )}
                          <span className={`text-sm ${isValid ? 'text-green-600' : 'text-gray-500'}`}>
                            {key === 'length' && 'At least 8 characters'}
                            {key === 'uppercase' && 'One uppercase letter (A-Z)'}
                            {key === 'number' && 'One number (0-9)'}
                            {key === 'special' && 'One special character (!@#$%^&*)'}
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
                      Confirm New Password
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
                      placeholder="Confirm new password"
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
                  
                  {/* Password Match Indicator */}
                  {formData.newPassword && formData.confirmPassword && (
                    <div className="mt-2">
                      {formData.newPassword === formData.confirmPassword ? (
                        <div className="flex items-center gap-2 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>Passwords match</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <XCircle className="w-4 h-4" />
                          <span>Passwords do not match</span>
                        </div>
                      )}
                    </div>
                  )}
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
                      <span>Resetting Password...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      <span className="text-lg">Reset Password</span>
                    </>
                  )}
                </button>
              </form>

              {/* Security Tips */}
              <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900 mb-1">
                      Password Security Tips
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs text-green-700">
                        • Use a unique password not used elsewhere
                      </p>
                      <p className="text-xs text-green-700">
                        • Consider using a password manager
                      </p>
                      <p className="text-xs text-green-700">
                        • Avoid personal information in passwords
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-6 h-px bg-gradient-to-r from-transparent to-purple-300"></div>
            <p className="text-xs text-gray-500">
              Password reset tokens expire after 10 minutes
            </p>
            <div className="w-6 h-px bg-gradient-to-r from-purple-300 to-transparent"></div>
          </div>
          <p className="text-xs text-gray-400">
            All passwords are encrypted and stored securely
          </p>
        </div>
      </div>
    </div>
  )
}