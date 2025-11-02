import { Sidebar } from './Sidebar'
import { useLocation } from 'react-router-dom'

export function DashboardLayout({ children }) {
  const location = useLocation()

  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/dashboard') return 'Dashboard'
    if (path === '/search') return 'Search'
    if (path === '/profile') return 'Profile'
    return 'Dashboard'
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Top Header */}
        <header className="border-b border-gray-200 px-6 py-4 bg-white" >
          <h1 className="text-xl font-semibold text-gray-800">
            {getPageTitle()}
          </h1>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

