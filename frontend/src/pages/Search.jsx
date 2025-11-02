import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DashboardLayout } from '../components/DashboardLayout'
import { searchVideos } from '../lib/api'
import { Search as SearchIcon, Loader, Video, Clock } from 'lucide-react'

export function Search() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    
    if (!query.trim()) {
      setError('Please enter a search query')
      return
    }

    setLoading(true)
    setError('')
    setHasSearched(true)

    try {
      const data = await searchVideos(query, user.id, 20)
      setResults(data.results)
      console.log('Search results:', data)
    } catch (err) {
      setError(err.message)
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (ms) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    } else {
      return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
    }
  }

  const exampleQueries = [
    'sunset',
    'golden hour',
    'ocean waves',
    'mountain landscape',
    'city night',
    'people talking'
  ]

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Search Your Videos
          </h1>
          <p className="text-gray-600">
            Find moments in your videos using natural language
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Try "sunset", "golden hour", "ocean waves"...'
              className="w-full px-6 py-4 pr-32 text-lg border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 transition-colors"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <SearchIcon size={20} />
                  Search
                </>
              )}
            </button>
          </div>
        </form>

        {/* Example Queries */}
        {!hasSearched && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">Try these examples:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {exampleQueries.map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setQuery(example)
                    // Auto-submit after short delay
                    setTimeout(() => {
                      document.querySelector('form').requestSubmit()
                    }, 100)
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {hasSearched && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {results.length > 0 ? (
                  <>Found {results.length} moment{results.length !== 1 ? 's' : ''} for "{query}"</>
                ) : (
                  <>No results found for "{query}"</>
                )}
              </h2>
            </div>

            {results.length === 0 ? (
              <div className="p-12 text-center">
                <Video size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No relevant moments found
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  No frames matched your search with sufficient similarity (≥50%)
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto text-left">
                  <p className="text-xs text-blue-800 font-medium mb-2">💡 Why no results?</p>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li>The search term doesn't match your video content</li>
                    <li>Example: Searching "dragon" won't match a beach video</li>
                    <li>Try terms that describe what's actually in your videos</li>
                    <li>Make sure your videos have status "Ready"</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {results.map((result) => (
                  <div
                    key={result.segment_id}
                    className="group bg-gray-50 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer border border-gray-200 hover:border-blue-300"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-gray-200">
                      {result.preview_url ? (
                        <img
                          src={result.preview_url}
                          alt={`Frame at ${formatTimestamp(result.timestamp_ms)}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video size={48} className="text-gray-400" />
                        </div>
                      )}
                      
                      {/* Timestamp Badge */}
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimestamp(result.timestamp_ms)}
                      </div>

                      {/* Score Badge */}
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                        result.score >= 0.8 ? 'bg-green-600' :
                        result.score >= 0.6 ? 'bg-blue-600' :
                        'bg-yellow-600'
                      } text-white`}>
                        {Math.round(result.score * 100)}%
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            Video {result.video_id.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-gray-500">
                            At {formatTimestamp(result.timestamp_ms)}
                          </p>
                        </div>
                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors opacity-0 group-hover:opacity-100">
                          Play
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        {!hasSearched && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3">🔍 How Semantic Search Works</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Search by <strong>meaning</strong>, not just keywords</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>"sunset" will also find "golden hour" and "dusk"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Powered by OpenCLIP AI model that understands visual content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Results show the exact timestamp where that content appears</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

