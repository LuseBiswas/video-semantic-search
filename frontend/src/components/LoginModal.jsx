import { useState } from 'react'
import { X, Mail, Lock, Loader, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export function LoginModal({ isOpen, onClose }) {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(formData.email, formData.password)
      onClose()
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({ email: '', password: '' })
    setError('')
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
            Welcome Back
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

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
                placeholder="Enter your password"
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !formData.email || !formData.password}
            className="w-full py-3 px-4 text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
            style={{ backgroundColor: loading || !formData.email || !formData.password ? '' : '#83c5be' }}
            onMouseEnter={(e) => {
              if (!loading && formData.email && formData.password) {
                e.currentTarget.style.backgroundColor = '#6fb3aa'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && formData.email && formData.password) {
                e.currentTarget.style.backgroundColor = '#83c5be'
              }
            }}
          >
            {loading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

