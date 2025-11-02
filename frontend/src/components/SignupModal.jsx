import { useState } from 'react'
import { X, Mail, Lock, User, Loader, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export function SignupModal({ isOpen, onClose }) {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  })

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      await signUp(formData.email, formData.password, formData.fullName)
      setSuccess(true)
      
      // Wait 2 seconds then navigate
      setTimeout(() => {
        onClose()
        navigate('/dashboard')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({ email: '', password: '', confirmPassword: '', fullName: '' })
    setError('')
    setSuccess(false)
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Create Account
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Account created successfully!</p>
                <p className="text-xs text-green-700 mt-1">Redirecting to dashboard...</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Enter your full name"
                required
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                style={{ 
                  borderColor: formData.fullName ? '#83c5be' : '',
                }}
                onFocus={(e) => e.target.style.borderColor = '#83c5be'}
                onBlur={(e) => !formData.fullName && (e.target.style.borderColor = '')}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email"
                required
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                style={{ 
                  borderColor: formData.email ? '#83c5be' : '',
                }}
                onFocus={(e) => e.target.style.borderColor = '#83c5be'}
                onBlur={(e) => !formData.email && (e.target.style.borderColor = '')}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create a password (min. 6 characters)"
                required
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                style={{ 
                  borderColor: formData.password ? '#83c5be' : '',
                }}
                onFocus={(e) => e.target.style.borderColor = '#83c5be'}
                onBlur={(e) => !formData.password && (e.target.style.borderColor = '')}
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                required
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                style={{ 
                  borderColor: formData.confirmPassword ? '#83c5be' : '',
                }}
                onFocus={(e) => e.target.style.borderColor = '#83c5be'}
                onBlur={(e) => !formData.confirmPassword && (e.target.style.borderColor = '')}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !formData.email || !formData.password || !formData.confirmPassword || !formData.fullName}
            className="w-full py-3 px-4 text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
            style={{ 
              backgroundColor: loading || !formData.email || !formData.password || !formData.confirmPassword || !formData.fullName ? '' : '#83c5be' 
            }}
            onMouseEnter={(e) => {
              if (!loading && formData.email && formData.password && formData.confirmPassword && formData.fullName) {
                e.currentTarget.style.backgroundColor = '#6fb3aa'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && formData.email && formData.password && formData.confirmPassword && formData.fullName) {
                e.currentTarget.style.backgroundColor = '#83c5be'
              }
            }}
          >
            {loading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

