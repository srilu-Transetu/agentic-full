'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, ArrowLeft, CheckCircle, Key, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Store email in localStorage for demo (in real app, you'd send email)
      if (typeof window !== 'undefined') {
        localStorage.setItem('resetEmail', email)
        localStorage.setItem('resetToken', 'demo-reset-token-' + Date.now())
      }
      
      setEmailSent(true)
      toast.success('Reset link generated! Redirecting to reset page...')
      
      // Redirect to reset page with demo token
      setTimeout(() => {
        router.push('/reset-password?token=demo-reset-token&email=' + encodeURIComponent(email))
      }, 2000)
      
    } catch (error) {
      console.error('Forgot password error:', error)
      toast.error('Failed to process request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Background decorative elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-indigo-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Back Button */}
        <Link
          href="/login"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl shadow-2xl shadow-purple-500/30">
            <Key className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Reset Password
          </h1>
          <p className="text-gray-600">
            Enter your email to reset your password
          </p>
        </div>

        {/* Reset Card */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/40">
          {emailSent ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Check Your Email
              </h3>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to{' '}
                <span className="font-semibold text-purple-600">{email}</span>
              </p>
              
              {/* Demo Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      ⚠️ Demo Mode Active
                    </p>
                    <p className="text-xs text-blue-700">
                      Since this is a demo, you'll be redirected to the reset page directly.
                      In a real app, you would receive an email with a reset link.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="text-sm text-gray-500 animate-pulse">
                  Redirecting to reset page...
                </div>
                <Link
                  href="/reset-password?token=demo&email=demo@example.com"
                  className="text-sm font-medium gradient-text hover:underline"
                >
                  Click here if not redirected
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 hover:border-purple-300"
                      placeholder="Enter your registered email"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3.5 rounded-xl hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending Reset Link...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      <span className="text-lg">Send Reset Link</span>
                    </>
                  )}
                </button>
              </form>

              {/* Demo Information */}
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Demo Information
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs text-blue-700">
                        • In demo mode, you'll be redirected directly to the reset page
                      </p>
                      <p className="text-xs text-blue-700">
                        • No actual email will be sent
                      </p>
                      <p className="text-xs text-blue-700">
                        • You can use any email address for testing
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
              Need help? Contact support@agenticsystem.com
            </p>
            <div className="w-6 h-px bg-gradient-to-r from-purple-300 to-transparent"></div>
          </div>
          <p className="text-xs text-gray-400">
            Reset links expire in 10 minutes for security
          </p>
        </div>
      </div>
    </div>
  )
}