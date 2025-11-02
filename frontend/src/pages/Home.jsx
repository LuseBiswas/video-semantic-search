import { useState } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { LoginModal } from '../components/LoginModal'
import { SignupModal } from '../components/SignupModal'
import { Search, Sparkles, Video } from 'lucide-react'

export function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)

  // tweak this if you want a tighter/looser crop
  const LOTTIE_ZOOM = 1.60

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
    >
      {/* Full-bleed Background Lottie (edge-to-edge, behind everything) */}
      <div 
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ 
          backgroundColor: '#f8f9fa',
          zIndex: 0
        }}
      >
        <DotLottieReact
          src="/Bunny Hop.lottie"
          loop
          autoplay
          style={{
            width: '100vw',
            height: '100vh',
            display: 'block',
            // emulate background-size: cover
            transform: `scale(${LOTTIE_ZOOM})`,
            transformOrigin: 'center center',
          }}
        />
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto text-center relative z-10 px-4">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
        Hop<span style={{ color: '#83c5be' }}>2</span>Engram
        </h1>

        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Hop on to memories with your bunny. Just give him a hint and that's it
        </p>

     

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-8 py-4 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            style={{ backgroundColor: '#83c5be' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6fb3aa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#83c5be'}
          >
            Existing User
          </button>

          <button
            onClick={() => setShowSignupModal(true)}
            className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold text-lg border-2 hover:shadow-lg transform hover:scale-105 transition-all"
            style={{ borderColor: '#83c5be' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b0dcd8'
              e.currentTarget.style.borderColor = '#83c5be'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.borderColor = '#83c5be'
            }}
          >
            New User
          </button>
        </div>

        <p className="mt-12 text-sm text-gray-500">
          Powered by Ritesh Biswas
        </p>
      </div>

      {/* Modals */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
      <SignupModal 
        isOpen={showSignupModal} 
        onClose={() => setShowSignupModal(false)} 
      />
    </div>
  )
}
