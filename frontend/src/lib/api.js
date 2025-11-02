/**
 * API client for backend communication
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Upload video
 */
export async function uploadVideo(file, userId) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('user_id', userId)

  const response = await fetch(`${API_BASE}/v1/videos/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Upload failed')
  }

  return response.json()
}

/**
 * List user's videos
 */
export async function listVideos(userId, limit = 50) {
  const response = await fetch(
    `${API_BASE}/v1/videos?user_id=${userId}&limit=${limit}`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch videos')
  }

  return response.json()
}

/**
 * Get video details
 */
export async function getVideo(videoId, userId) {
  const response = await fetch(
    `${API_BASE}/v1/videos/${videoId}?user_id=${userId}`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch video')
  }

  return response.json()
}

/**
 * Search videos
 */
export async function searchVideos(query, userId, topK = 20, minScore = 0, semanticThreshold = 0.49, videoId = null) {
  const response = await fetch(`${API_BASE}/v1/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      user_id: userId,
      top_k: topK,
      min_score: minScore,  // Set to 0 to let OpenAI do all filtering
      semantic_threshold: semanticThreshold,  // OpenAI similarity threshold (0.7 = 70%)
      ...(videoId && { video_id: videoId }),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Search failed')
  }

  return response.json()
}

/**
 * Delete video
 */
export async function deleteVideo(videoId, userId) {
  const response = await fetch(
    `${API_BASE}/v1/videos/${videoId}?user_id=${userId}`,
    {
      method: 'DELETE',
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to delete video')
  }

  return response.json()
}
