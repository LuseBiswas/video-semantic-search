import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DashboardLayout } from '../components/DashboardLayout'
import { UploadModal } from '../components/UploadModal'
import { listVideos, deleteVideo, getVideo } from '../lib/api'
import { Upload, Video, Clock, CheckCircle, AlertCircle, Loader, RefreshCw, MoreVertical, Trash2 } from 'lucide-react'

export function Dashboard() {
  const { user } = useAuth()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [processingVideos, setProcessingVideos] = useState([])
  const [progress, setProgress] = useState(0)
  const menuRef = useRef(null)
  const pollIntervalRef = useRef(null)

  const fetchVideos = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await listVideos(user.id)
      // Only show videos with status "ready"
      const readyVideos = data.filter(video => video.status === 'ready')
      setVideos(readyVideos)
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
    }
  }, [user?.id])

  const handleUploadSuccess = (videoId) => {
    // Add to processing list
    setProcessingVideos(prev => [...prev, videoId])
    setProgress(0)
    
    // Start polling for progress
    startProgressPolling(videoId)
  }

  const startProgressPolling = (videoId) => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    // Poll every 3 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const video = await getVideo(videoId, user.id)
        
        // Calculate progress based on status
        if (video.status === 'uploaded') {
          setProgress(10)
        } else if (video.status === 'processing') {
          // Increment progress gradually (10% to 90%)
          setProgress(prev => Math.min(prev + 5, 90))
        } else if (video.status === 'ready') {
          setProgress(100)
          
          // Wait a bit to show 100%, then cleanup
          setTimeout(() => {
            setProcessingVideos(prev => prev.filter(id => id !== videoId))
            setProgress(0)
            fetchVideos() // Refresh to show the new video
            
            // Clear interval
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          }, 1000)
        } else if (video.status === 'error') {
          // Handle error
          setProcessingVideos(prev => prev.filter(id => id !== videoId))
          setProgress(0)
          alert('Video processing failed. Please try again.')
          
          // Clear interval
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
        }
      } catch (err) {
        console.error('Error polling video status:', err)
      }
    }, 3000)
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const handleDeleteClick = (video) => {
    setVideoToDelete(video)
    setDeleteModalOpen(true)
    setOpenMenuId(null)
  }

  const handleDeleteConfirm = async () => {
    if (!videoToDelete) return

    try {
      setDeleting(true)
      await deleteVideo(videoToDelete.id, user.id)
      setDeleteModalOpen(false)
      setVideoToDelete(null)
      fetchVideos() // Refresh video list
    } catch (err) {
      console.error('Error deleting video:', err)
      alert('Failed to delete video: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setVideoToDelete(null)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        {/* Header with Refresh Button */}
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
            onClick={fetchVideos}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300"
            style={{ backgroundColor: 'white' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#e9ecef')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'white')}
            title="Refresh video list"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Videos Grid */}
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
              className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
              style={{ backgroundColor: '#83c5be' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6fb3aa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#83c5be'}
            >
              <Upload size={18} />
              Upload Video
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => {
              return (
                <div
                  key={video.id}
                  className="group cursor-pointer relative"
                >
                  {/* Thumbnail */}
                  <div className="relative bg-gray-900 aspect-video rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all">
                    {video.thumbnail_url ? (
                      <img 
                        src={video.thumbnail_url} 
                        alt={`Video ${video.id.slice(0, 8)}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video size={48} className="text-gray-600" />
                      </div>
                    )}
                    
                    {/* Duration Overlay */}
                    {video.duration_ms && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 px-2 py-1 rounded text-xs font-medium text-white">
                        {formatDuration(video.duration_ms)}
                      </div>
                    )}
                    
                    {/* Video Title Overlay at Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
                      <h4 className="font-medium text-white text-sm truncate">
                        Video {video.id.slice(0, 8)}...
                      </h4>
                    </div>
                    
                    {/* Processing/Error Indicator (if not ready) */}
                    {video.status === 'processing' && (
                      <div className="absolute top-2 left-2">
                        <Loader size={16} className="text-white animate-spin" />
                      </div>
                    )}
                    {video.status === 'error' && (
                      <div className="absolute top-2 left-2">
                        <AlertCircle size={16} className="text-red-500" />
                      </div>
                    )}

                    {/* Three Dots Menu */}
                    <div className="absolute top-2 right-2" ref={openMenuId === video.id ? menuRef : null}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(openMenuId === video.id ? null : video.id)
                        }}
                        className="p-1.5 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full transition-colors"
                      >
                        <MoreVertical size={16} className="text-white" />
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuId === video.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(video)
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                            Delete Video
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Upload Button with Progress */}
      <div className="fixed bottom-8 right-8 z-40">
        {/* Circular Progress Ring */}
        {processingVideos.length > 0 && (
          <svg className="absolute inset-0 w-20 h-20 -m-2 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="#e5e7eb"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="#83c5be"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
        )}
        
        {/* Upload Button */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          disabled={processingVideos.length > 0}
          className="relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 hover:shadow-3xl disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ backgroundColor: '#83c5be' }}
          onMouseEnter={(e) => {
            if (processingVideos.length === 0) e.currentTarget.style.backgroundColor = '#6fb3aa'
          }}
          onMouseLeave={(e) => {
            if (processingVideos.length === 0) e.currentTarget.style.backgroundColor = '#83c5be'
          }}
          title={processingVideos.length > 0 ? `Processing video... ${progress}%` : 'Upload Video'}
        >
          {processingVideos.length > 0 ? (
            <div className="flex flex-col items-center">
              <Loader size={20} className="text-white animate-spin" />
              <span className="text-white text-xs mt-1 font-medium">{progress}%</span>
            </div>
          ) : (
            <Upload size={24} className="text-white" />
          )}
        </button>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Video</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this video? This will permanently remove:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
                <li>Video file and thumbnail</li>
                <li>All extracted frames and embeddings</li>
                <li>Search history for this video</li>
              </ul>
              <p className="text-sm font-medium text-red-600">
                This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

