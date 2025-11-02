import { useState } from 'react'
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { uploadVideo } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
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
      setSuccess(true)
      
      // Wait 2 seconds then close and refresh
      setTimeout(() => {
        handleClose()
        onUploadSuccess()
      }, 2000)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed. Please try again.')
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setUploading(false)
    setSuccess(false)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
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
          {success ? (
            <div className="text-center py-8">
              <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Successful!
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Your video is being processed in the background.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-xs text-blue-800 font-medium mb-2">Processing steps:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>✓ Video uploaded</li>
                  <li>⏳ Extracting frames (1 per second)</li>
                  <li>⏳ Computing embeddings</li>
                  <li>⏳ Storing in database</li>
                </ul>
                <p className="text-xs text-blue-600 mt-3">
                  This takes ~1 minute per 5 minutes of video
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
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
                <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
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
                className="w-full mt-6 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload Video'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Processing starts automatically after upload. You'll be able to search once it's ready.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

