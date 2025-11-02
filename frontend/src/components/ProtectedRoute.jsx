import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#ffffff' }}
      >
        <div className="w-64 h-64">
          <DotLottieReact
            src="/Davsan.lottie"
            loop
            autoplay
          />
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}

