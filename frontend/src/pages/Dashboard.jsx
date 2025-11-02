import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DashboardLayout } from '../components/DashboardLayout'
import { UploadModal } from '../components/UploadModal'
import { listVideos } from '../lib/api'
import { Upload, Video, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react'

export function Dashboard() {
  const { user } = useAuth()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchVideos = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await listVideos(user.id)
      setVideos(data)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching videos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchVideos()
      
      // Auto-refresh every 10 seconds to check processing status
      const interval = setInterval(() => {
        fetchVideos()
      }, 10000)
      
      return () => clearInterval(interval)
    }
  }, [user?.id])

  const handleUploadSuccess = () => {
    fetchVideos() // Refresh video list
  }

  const getStatusBadge = (status) => {
    const badges = {
      uploaded: { text: 'Uploaded', class: 'bg-gray-100 text-gray-700', icon: Clock },
      processing: { text: 'Processing', class: 'bg-yellow-100 text-yellow-700', icon: Loader },
      ready: { text: 'Ready', class: 'bg-green-100 text-green-700', icon: CheckCircle },
      error: { text: 'Error', class: 'bg-red-100 text-red-700', icon: AlertCircle },
    }
    return badges[status] || badges.uploaded
  }

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Upload Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              My Videos
            </h2>
            <p className="text-gray-600">
              {videos.length} video{videos.length !== 1 ? 's' : ''} uploaded
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Upload size={20} />
            Upload Video
          </button>
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
              {videos.filter(v => v.status === 'ready').length} ready to search
            </p>
          </div>
        </div>

        {/* Videos List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Your Videos</h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader size={32} className="mx-auto text-gray-400 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Loading videos...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertCircle size={32} className="mx-auto text-red-500 mb-3" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="p-12 text-center">
              <Video size={48} className="mx-auto text-gray-300 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No videos yet</h4>
              <p className="text-sm text-gray-500 mb-4">
                Upload your first video to start searching by meaning
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload size={18} />
                Upload Video
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {videos.map((video) => {
                const status = getStatusBadge(video.status)
                const StatusIcon = status.icon
                
                return (
                  <div
                    key={video.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            Video {video.id.slice(0, 8)}...
                          </h4>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.class}`}>
                            <StatusIcon size={14} />
                            {status.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>📅 {formatDate(video.created_at)}</span>
                          {video.duration_ms && (
                            <span>⏱️ {formatDuration(video.duration_ms)}</span>
                          )}
                          {video.width && video.height && (
                            <span>📐 {video.width}x{video.height}</span>
                          )}
                        </div>
                        {video.error_msg && (
                          <p className="mt-2 text-sm text-red-600">
                            Error: {video.error_msg}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </DashboardLayout>
  )
}

