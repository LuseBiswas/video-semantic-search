import { useState } from 'react'
import { X, Upload, AlertCircle } from 'lucide-react'
import { uploadVideo } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)

  if (!isOpen) return null

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      if (files[0].type.startsWith('video/')) {
        setFile(files[0])
        setError('')
      } else {
        setError('Please upload a video file')
      }
    }
  }

  const handleFileChange = (e) => {
    const files = e.target.files
    if (files && files[0]) {
      if (files[0].type.startsWith('video/')) {
        setFile(files[0])
        setError('')
      } else {
        setError('Please upload a video file')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a video file')
      return
    }

    setUploading(true)
    setError('')

    try {
      const result = await uploadVideo(file, user.id)
      console.log('Upload successful:', result)
      
      // Close modal immediately and start tracking progress
      handleClose()
      onUploadSuccess(result.video_id)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed. Please try again.')
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setUploading(false)
    setError('')
    onClose()
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Upload Video
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={uploading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? 'bg-blue-50'
                : 'border-gray-300 bg-gray-50'
            }`}
            style={dragActive ? { borderColor: '#83c5be' } : {}}
          >
            <Upload
              size={48}
              className={`mx-auto mb-4 ${
                dragActive ? 'text-blue-500' : 'text-gray-400'
              }`}
            />
            <p className="text-sm font-medium text-gray-900 mb-1">
              Drag and drop your video here
            </p>
            <p className="text-xs text-gray-500 mb-4">or</p>
            <label 
              className="inline-flex items-center px-4 py-2 text-white rounded-lg cursor-pointer transition-colors"
              style={{ backgroundColor: '#83c5be' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6fb3aa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#83c5be'}
            >
              <span className="text-sm font-medium">Choose File</span>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <p className="text-xs text-gray-400 mt-3">
              Supported formats: MP4, MOV, AVI, WebM
            </p>
          </div>

          {/* Selected File */}
          {file && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {!uploading && (
                  <button
                    onClick={() => setFile(null)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full mt-6 py-3 px-4 text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: !file || uploading ? '' : '#83c5be' }}
            onMouseEnter={(e) => {
              if (!(!file || uploading)) e.currentTarget.style.backgroundColor = '#6fb3aa'
            }}
            onMouseLeave={(e) => {
              if (!(!file || uploading)) e.currentTarget.style.backgroundColor = '#83c5be'
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Video'}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Processing starts automatically after upload. You'll be able to search once it's ready.
          </p>
        </div>
      </div>
    </div>
  )
}

