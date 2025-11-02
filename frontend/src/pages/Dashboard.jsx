import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { DashboardLayout } from '../components/DashboardLayout'
import { UploadModal } from '../components/UploadModal'
import { listVideos, deleteVideo, getVideo, searchVideos } from '../lib/api'
import { supabase } from '../lib/supabase'
import { Upload, Video, Clock, CheckCircle, AlertCircle, Loader, MoreVertical, Trash2, Search, X, Play } from 'lucide-react'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [hoveredVideoId, setHoveredVideoId] = useState(null)
  const [loadedVideoIds, setLoadedVideoIds] = useState(new Set())
  const menuRef = useRef(null)
  const pollIntervalRef = useRef(null)
  const videoRefs = useRef({})

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
      fetchUserProfile()
    }
  }, [user?.id])

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setUserProfile(data)
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }

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

  const handleDeleteClick = useCallback((video) => {
    setVideoToDelete(video)
    setDeleteModalOpen(true)
    setOpenMenuId(null)
  }, [])

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

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      fetchVideos() // Reset to all videos if search is empty
      return
    }

    setSearching(true)
    setError('')
    try {
      const results = await searchVideos(searchQuery, user.id)
      
      // Extract unique video IDs from search results
      const videoIds = [...new Set(results.results.map(r => r.video_id))]
      
      // Fetch full video details for these IDs
      const allVideos = await listVideos(user.id)
      const matchedVideos = allVideos.filter(v => videoIds.includes(v.id) && v.status === 'ready')
      
      setVideos(matchedVideos)
    } catch (err) {
      setError(err.message)
      console.error('Search error:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    fetchVideos()
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

  const getBentoClass = useCallback((video, index) => {
    // Calculate aspect ratio
    const aspectRatio = video.width && video.height ? video.width / video.height : 16/9
    
    // Bento box classes based on aspect ratio and position
    // Landscape videos (wide) get larger
    if (aspectRatio > 1.5) {
      return 'md:col-span-2 md:row-span-1'
    }
    // Portrait videos (tall) get taller
    else if (aspectRatio < 0.8) {
      return 'md:col-span-1 md:row-span-2'
    }
    // Square or near-square videos
    else if (aspectRatio >= 0.8 && aspectRatio <= 1.2) {
      // Every 3rd square video gets larger for variety
      return index % 3 === 0 ? 'md:col-span-2 md:row-span-2' : 'md:col-span-1 md:row-span-1'
    }
    // Default
    return 'md:col-span-1 md:row-span-1'
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Greeting and Search */}
        <div className="flex items-center gap-6">
          {/* Animated Greeting */}
          <AnimatePresence mode="wait">
            {!searchQuery && (
              <motion.h2
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="text-2xl font-bold text-gray-900 whitespace-nowrap overflow-hidden"
              >
                Hey, {userProfile?.full_name || 'there'}! 👋
              </motion.h2>
            )}
          </AnimatePresence>

          {/* Animated Search Bar */}
          <motion.form
            onSubmit={handleSearch}
            layout
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="flex-1 min-w-0"
          >
            <motion.div
              layout
              className="flex items-center border-b-2 border-gray-300 focus-within:border-custom-blue pb-2"
              style={{ transition: "border-color 0.2s" }}
            >
              <Search size={20} className="text-gray-400 mr-3 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your videos by content... (e.g., 'sunset', 'dog playing')"
                className="flex-1 outline-none text-gray-900 placeholder-gray-400 bg-transparent min-w-0"
                disabled={searching}
              />
              
              {/* Animated Clear Button */}
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    type="button"
                    onClick={handleClearSearch}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                    title="Clear search"
                  >
                    <X size={16} />
                  </motion.button>
                )}
              </AnimatePresence>
              
              {searching && (
                <Loader size={18} className="ml-2 text-gray-400 animate-spin flex-shrink-0" />
              )}
            </motion.div>
          </motion.form>
        </div>

        {/* Videos Grid */}
        {loading ? (
          <div 
            className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4"
            style={{ 
              gridAutoFlow: 'dense',
              gridAutoRows: 'minmax(200px, auto)'
            }}
          >
            {/* Skeleton Loaders */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className={`${i % 3 === 0 ? 'md:col-span-2 md:row-span-2' : i % 5 === 0 ? 'md:col-span-2' : ''}`}
              >
                <div className="relative bg-gray-200 rounded-lg overflow-hidden shadow-sm h-full min-h-[200px] animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" 
                       style={{ backgroundSize: '200% 100%' }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  </div>
                </div>
              </motion.div>
            ))}
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
          <div 
            className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4"
            style={{ 
              gridAutoFlow: 'dense',
              gridAutoRows: 'minmax(200px, auto)'
            }}
          >
            {videos.map((video, index) => {
              const bentoClass = getBentoClass(video, index)
              const isHovering = hoveredVideoId === video.id
              const isVideoLoaded = loadedVideoIds.has(video.id)
              
              const handleMouseEnter = () => {
                setHoveredVideoId(video.id)
                
                // Small delay to avoid accidental triggers
                setTimeout(() => {
                  const videoElement = videoRefs.current[video.id]
                  console.log('▶️ Attempting to play:', video.id.slice(0, 8), 'element:', !!videoElement, 'url:', !!video.video_url)
                  if (videoElement && video.video_url) {
                    videoElement.currentTime = 0
                    videoElement.play().catch(err => {
                      console.log('Playback failed:', err)
                    })
                  }
                }, 150)
              }
              
              const handleMouseLeave = () => {
                setHoveredVideoId(null)
                const videoElement = videoRefs.current[video.id]
                if (videoElement) {
                  videoElement.pause()
                  videoElement.currentTime = 0
                }
              }
              
              const handleVideoLoaded = () => {
                setLoadedVideoIds(prev => new Set([...prev, video.id]))
              }
              
              return (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ 
                    delay: index * 0.05,
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  className={`group cursor-pointer relative ${bentoClass} h-full`}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Thumbnail and Video Container */}
                  <div 
                    className="relative bg-gray-900 rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all w-full h-full"
                  >
                    {/* Thumbnail (always visible) */}
                    {video.thumbnail_url ? (
                      <img 
                        src={video.thumbnail_url} 
                        alt={`Video ${video.id.slice(0, 8)}`}
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          isHovering && isVideoLoaded ? 'opacity-0' : 'opacity-100 group-hover:scale-105'
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video size={48} className="text-gray-600" />
                      </div>
                    )}
                    
                    {/* Video Element (plays on hover) */}
                    {video.video_url && (
                      <video
                        ref={el => videoRefs.current[video.id] = el}
                        src={video.video_url}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                          isHovering && isVideoLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onLoadedData={handleVideoLoaded}
                      />
                    )}
                    
                    {/* Play Icon Overlay (shows on hover before video loads) */}
                    {!isVideoLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 pointer-events-none">
                        <div className="w-16 h-16 rounded-full bg-white bg-opacity-90 flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
                          <Play size={24} className="text-gray-900 ml-1" fill="currentColor" />
                        </div>
                      </div>
                    )}
                    
                    {/* Duration Overlay */}
                    {video.duration_ms && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 px-2 py-1 rounded text-xs font-medium text-white z-10">
                        {formatDuration(video.duration_ms)}
                      </div>
                    )}
                    
                    {/* Video Title Overlay at Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 z-10">
                      <h4 className="font-medium text-white text-sm truncate">
                        Video {video.id.slice(0, 8)}...
                      </h4>
                    </div>
                    
                    {/* Processing/Error Indicator (if not ready) */}
                    {video.status === 'processing' && (
                      <div className="absolute top-2 left-2 z-10">
                        <Loader size={16} className="text-white animate-spin" />
                      </div>
                    )}
                    {video.status === 'error' && (
                      <div className="absolute top-2 left-2 z-10">
                        <AlertCircle size={16} className="text-red-500" />
                      </div>
                    )}

                    {/* Three Dots Menu */}
                    <div className="absolute top-2 right-2 z-20" ref={openMenuId === video.id ? menuRef : null}>
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
                </motion.div>
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

