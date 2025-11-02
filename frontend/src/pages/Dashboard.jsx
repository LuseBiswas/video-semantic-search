import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Video Semantic Search
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to your Dashboard</h2>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">✅ Authentication Connected!</h3>
              <p className="text-sm text-blue-700">
                User ID: <code className="bg-blue-100 px-2 py-1 rounded">{user?.id}</code>
              </p>
              <p className="text-sm text-blue-700 mt-1">
                This ID will be used to connect with the backend API.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">🎉 Next Steps:</h3>
              <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                <li>Build video upload interface</li>
                <li>Create search interface</li>
                <li>Display search results with thumbnails</li>
                <li>Add video player with jump-to-timestamp</li>
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">📡 Backend API:</h3>
              <p className="text-sm text-gray-600">
                Base URL: <code className="bg-gray-200 px-2 py-1 rounded">http://localhost:8000</code>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Make sure your backend server is running!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

