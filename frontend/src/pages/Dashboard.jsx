import { useAuth } from '../contexts/AuthContext'
import { DashboardLayout } from '../components/DashboardLayout'

export function Dashboard() {
  const { user } = useAuth()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back!
          </h2>
          <p className="text-gray-600">
            Start searching your videos by meaning
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">✅ Authentication</h3>
            <p className="text-sm text-gray-600">
              User ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{user?.id?.slice(0, 8)}...</code>
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">📡 Backend API</h3>
            <p className="text-sm text-gray-600">
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">localhost:8000</code>
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">🎬 Videos</h3>
            <p className="text-sm text-gray-600">
              0 videos uploaded
            </p>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-3">🚀 Getting Started</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">1.</span>
              <span>Upload your first video</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span>Wait for automatic processing (extracts frames & creates embeddings)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">3.</span>
              <span>Search using natural language: "sunset", "golden hour", "ocean waves"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">4.</span>
              <span>Click results to jump to that moment in the video</span>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}

