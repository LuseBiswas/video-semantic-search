"""Semantic search endpoint."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.db import get_connection
from worker.utils.embeddings import encode_text
from worker.utils.supabase_io import get_signed_url
from app.core.config import settings


router = APIRouter(prefix="/v1/search", tags=["search"])


class SearchRequest(BaseModel):
    """Search request."""
    query: str
    user_id: str
    top_k: int = 20
    video_id: Optional[str] = None  # Optional: search within specific video


class SearchResult(BaseModel):
    """Single search result (moment)."""
    video_id: str
    segment_id: str
    timestamp_ms: int
    score: float
    preview_url: str


class SearchResponse(BaseModel):
    """Search response."""
    results: List[SearchResult]
    query: str
    count: int


@router.post("", response_model=SearchResponse)
def search_videos(request: SearchRequest):
    """
    Semantic search across video segments.
    
    Args:
        request: SearchRequest with query and filters
    
    Returns:
        SearchResponse with ranked results
    """
    if not request.query or len(request.query.strip()) == 0:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    # Step 1: Encode query text to vector
    try:
        query_embedding = encode_text(request.query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to encode query: {str(e)}")
    
    # Step 2: Execute ANN search with pgvector
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Build query with optional video_id filter
            if request.video_id:
                # Search within specific video
                sql = """
                    SELECT 
                        s.id AS segment_id,
                        s.video_id,
                        s.t_start_ms,
                        s.frame_url,
                        1 - (s.emb <=> %s::vector) AS score
                    FROM public.segments s
                    JOIN public.videos v ON s.video_id = v.id
                    WHERE v.user_id = %s 
                      AND v.status = 'ready'
                      AND s.video_id = %s
                    ORDER BY s.emb <=> %s::vector
                    LIMIT %s
                """
                params = (
                    query_embedding.tolist(),
                    request.user_id,
                    request.video_id,
                    query_embedding.tolist(),
                    request.top_k
                )
            else:
                # Search across all user's videos
                sql = """
                    SELECT 
                        s.id AS segment_id,
                        s.video_id,
                        s.t_start_ms,
                        s.frame_url,
                        1 - (s.emb <=> %s::vector) AS score
                    FROM public.segments s
                    JOIN public.videos v ON s.video_id = v.id
                    WHERE v.user_id = %s 
                      AND v.status = 'ready'
                    ORDER BY s.emb <=> %s::vector
                    LIMIT %s
                """
                params = (
                    query_embedding.tolist(),
                    request.user_id,
                    query_embedding.tolist(),
                    request.top_k
                )
            
            cur.execute(sql, params)
            rows = cur.fetchall()
    
    # Step 3: Group nearby segments into moments (optional: within 2s = same moment)
    moments = group_into_moments(rows, time_threshold_ms=2000)
    
    # Step 4: Generate signed URLs for preview frames
    results = []
    for moment in moments[:request.top_k]:
        segment_id, video_id, timestamp_ms, frame_url, score = moment
        
        # Extract bucket and path from frame_url
        # Expected format: "frames/user_id/video_id/frame_xxx.jpg"
        if frame_url.startswith(f"{settings.BUCKET_FRAMES}/"):
            path = frame_url[len(f"{settings.BUCKET_FRAMES}/"):]
        else:
            path = frame_url
        
        try:
            preview_url = get_signed_url(settings.BUCKET_FRAMES, path, expires_in=3600)
        except Exception as e:
            print(f"Failed to generate signed URL for {frame_url}: {e}")
            preview_url = None
        
        results.append(SearchResult(
            video_id=str(video_id),
            segment_id=str(segment_id),
            timestamp_ms=timestamp_ms,
            score=round(score, 4),
            preview_url=preview_url
        ))
    
    return SearchResponse(
        results=results,
        query=request.query,
        count=len(results)
    )


def group_into_moments(
    segments: List[tuple],
    time_threshold_ms: int = 2000
) -> List[tuple]:
    """
    Group nearby segments into moments.
    
    Args:
        segments: List of (segment_id, video_id, timestamp_ms, frame_url, score)
        time_threshold_ms: Max gap between segments to group as same moment
    
    Returns:
        List of representative segments (one per moment)
    """
    if not segments:
        return []
    
    moments = []
    current_moment = None
    
    for seg in segments:
        segment_id, video_id, timestamp_ms, frame_url, score = seg
        
        if current_moment is None:
            # Start first moment
            current_moment = {
                'video_id': video_id,
                'start_ms': timestamp_ms,
                'end_ms': timestamp_ms,
                'best_segment': seg,
                'best_score': score
            }
        else:
            # Check if this segment belongs to current moment
            same_video = video_id == current_moment['video_id']
            time_gap = timestamp_ms - current_moment['end_ms']
            close_in_time = time_gap <= time_threshold_ms
            
            if same_video and close_in_time:
                # Extend current moment
                current_moment['end_ms'] = timestamp_ms
                # Keep best scoring segment
                if score > current_moment['best_score']:
                    current_moment['best_segment'] = seg
                    current_moment['best_score'] = score
            else:
                # Save current moment and start new one
                moments.append(current_moment['best_segment'])
                current_moment = {
                    'video_id': video_id,
                    'start_ms': timestamp_ms,
                    'end_ms': timestamp_ms,
                    'best_segment': seg,
                    'best_score': score
                }
    
    # Add last moment
    if current_moment:
        moments.append(current_moment['best_segment'])
    
    return moments

