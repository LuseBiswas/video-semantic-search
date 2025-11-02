import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader } from 'lucide-react'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#f8f9fa' }}
      >
        <Loader size={48} className="animate-spin" style={{ color: '#83c5be' }} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}

