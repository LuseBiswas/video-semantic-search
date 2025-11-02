import { Home, Box, Search, User, LogOut, Settings, ChevronDown, TreePine } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: Home },
    { name: 'Search', path: '/search', icon: Search },
  ]

  // Fetch user profile
  useEffect(() => {
    if (user?.id) {
      fetchProfile()
    }
  }, [user?.id])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()
      
      if (data) {
        setProfile(data)
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  return (
    <div className="w-64 h-screen flex flex-col" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Logo Section - Same height as header */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white" style={{ backgroundColor: '#83c5be' }}>
          <TreePine />
          </div>
          <span className="font-semibold text-xl text-gray-900">MemoryTree</span>
        </div>
        {/* <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
          <Box size={20} />
        </button> */}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                  style={isActive ? { backgroundColor: '#83c5be' } : {}}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = '#b0dcd8'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = ''
                  }}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {/* Avatar */}
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white overflow-hidden flex-shrink-0"
            style={{ backgroundColor: '#83c5be' }}
          >
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={20} />
            )}
          </div>
          
          {/* User Info */}
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.full_name || 'Anonymous'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
          
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => {
                setShowMenu(false)
                navigate('/profile')
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <Settings size={16} className="text-gray-600" />
              <span className="text-sm text-gray-700">Settings</span>
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left border-t border-gray-100"
            >
              <LogOut size={16} className="text-red-600" />
              <span className="text-sm text-red-600 font-medium">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

