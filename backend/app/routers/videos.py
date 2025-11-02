"""Video upload and management endpoints."""

import os
import uuid
import tempfile
import threading
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from typing import Optional, List
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.db import get_connection
from worker.ingest_video import ingest_video
from worker.utils.supabase_io import get_video, get_signed_url
from app.core.config import settings


router = APIRouter(prefix="/v1/videos", tags=["videos"])


class VideoResponse(BaseModel):
    """Video record response."""
    id: str
    user_id: str
    url: str
    duration_ms: int
    width: Optional[int] = None
    height: Optional[int] = None
    status: str
    error_msg: Optional[str] = None
    created_at: str
    thumbnail_url: Optional[str] = None
    video_url: Optional[str] = None  # Signed URL for video playback


class UploadResponse(BaseModel):
    """Upload response."""
    video_id: str
    user_id: str
    status: str
    message: str


@router.post("/upload", response_model=UploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    """
    Upload video and trigger ingestion pipeline.
    
    Args:
        file: Video file (MP4, MOV, etc.)
        user_id: User UUID
    
    Returns:
        UploadResponse with video_id and status
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="File must be a video")
    
    # Generate video ID
    video_id = str(uuid.uuid4())
    
    # Save uploaded file to temp location
    temp_dir = tempfile.mkdtemp()
    file_extension = Path(file.filename).suffix or '.mp4'
    temp_path = os.path.join(temp_dir, f"video_{video_id}{file_extension}")
    
    try:
        # Save uploaded file
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Start ingestion in background thread
        def run_ingestion():
            try:
                ingest_video(
                    video_path=temp_path,
                    video_id=video_id,
                    user_id=user_id,
                    fps=1.0,
                    batch_size=10,
                    upload_video=True  # Upload original to storage
                )
            except Exception as e:
                print(f"Ingestion failed for {video_id}: {e}")
            finally:
                # Cleanup temp file
                try:
                    os.remove(temp_path)
                    os.rmdir(temp_dir)
                except:
                    pass
        
        thread = threading.Thread(target=run_ingestion, daemon=True)
        thread.start()
        
        return UploadResponse(
            video_id=video_id,
            user_id=user_id,
            status="processing",
            message="Video uploaded successfully. Processing in background."
        )
        
    except Exception as e:
        # Cleanup on error
        try:
            os.remove(temp_path)
            os.rmdir(temp_dir)
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/{video_id}", response_model=VideoResponse)
def get_video_details(video_id: str, user_id: str):
    """
    Get video details by ID.
    
    Args:
        video_id: Video UUID
        user_id: User UUID (for RLS)
    
    Returns:
        VideoResponse with video details
    """
    video = get_video(video_id)
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Verify ownership (basic check)
    if str(video['user_id']) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate signed URL for thumbnail if it exists
    thumbnail_url = None
    if video.get('thumbnail_url'):
        try:
            # Split bucket and path: "frames/user_id/video_id/thumbnail.jpg" -> bucket="frames", path="user_id/video_id/thumbnail.jpg"
            parts = video['thumbnail_url'].split('/', 1)
            if len(parts) == 2:
                bucket, path = parts
                thumbnail_url = get_signed_url(bucket, path, expires_in=3600)
        except Exception as e:
            print(f"Failed to generate signed URL for thumbnail: {e}")
    
    # Generate signed URL for video
    video_url = None
    if video.get('url'):
        try:
            # Split bucket and path: "videos/user_id/video_id/filename" -> bucket="videos", path="user_id/video_id/filename"
            parts = video['url'].split('/', 1)
            if len(parts) == 2:
                bucket, path = parts
                video_url = get_signed_url(bucket, path, expires_in=3600)
        except Exception as e:
            print(f"Failed to generate signed URL for video: {e}")
    
    return VideoResponse(
        id=str(video['id']),
        user_id=str(video['user_id']),
        url=video['url'],
        duration_ms=video['duration_ms'],
        width=video['width'],
        height=video['height'],
        status=video['status'],
        error_msg=video['error_msg'],
        created_at=video['created_at'].isoformat() if video['created_at'] else None,
        thumbnail_url=thumbnail_url,
        video_url=video_url
    )


def _generate_signed_urls_for_video(row: tuple) -> dict:
    """
    Generate signed URLs for a single video (thumbnail + video).
    Helper function for parallel execution.
    
    Args:
        row: Database row (id, user_id, url, duration_ms, width, height, status, error_msg, created_at, thumbnail_url)
    
    Returns:
        Dict with video data and signed URLs
    """
    video_id, user_id, url, duration_ms, width, height, status, error_msg, created_at, thumbnail_url_raw = row
    
    thumbnail_url = None
    video_url = None
    
    # Generate signed URL for thumbnail if it exists
    if thumbnail_url_raw:
        try:
            parts = thumbnail_url_raw.split('/', 1)
            if len(parts) == 2:
                bucket, path = parts
                thumbnail_url = get_signed_url(bucket, path, expires_in=3600)
        except Exception as e:
            print(f"Failed to generate signed URL for thumbnail: {e}")
    
    # Generate signed URL for video
    if url:
        try:
            parts = url.split('/', 1)
            if len(parts) == 2:
                bucket, path = parts
                video_url = get_signed_url(bucket, path, expires_in=3600)
        except Exception as e:
            print(f"Failed to generate signed URL for video: {e}")
    
    return {
        'id': str(video_id),
        'user_id': str(user_id),
        'url': url,
        'duration_ms': duration_ms,
        'width': width,
        'height': height,
        'status': status,
        'error_msg': error_msg,
        'created_at': created_at.isoformat() if created_at else None,
        'thumbnail_url': thumbnail_url,
        'video_url': video_url
    }


@router.get("", response_model=List[VideoResponse])
def list_videos(user_id: str, limit: int = 50):
    """
    List all videos for a user.
    Uses parallel execution for signed URL generation.
    
    Args:
        user_id: User UUID
        limit: Max number of videos to return
    
    Returns:
        List of VideoResponse
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, user_id, url, duration_ms, width, height, status, error_msg, created_at, thumbnail_url
                FROM public.videos
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (user_id, limit))
            
            rows = cur.fetchall()
            
            if not rows:
                return []
            
            # Generate signed URLs in parallel
            videos = []
            with ThreadPoolExecutor(max_workers=20) as executor:
                # Submit all tasks
                future_to_row = {
                    executor.submit(_generate_signed_urls_for_video, row): idx
                    for idx, row in enumerate(rows)
                }
                
                # Collect results as they complete
                results = []
                for future in as_completed(future_to_row):
                    try:
                        result = future.result()
                        idx = future_to_row[future]
                        results.append((idx, result))
                    except Exception as e:
                        print(f"Error generating signed URLs: {e}")
                
                # Sort by original order
                results.sort(key=lambda x: x[0])
                
                # Build response
                for _, video_data in results:
                    videos.append(VideoResponse(**video_data))
            
            return videos


@router.delete("/{video_id}")
def delete_video(video_id: str, user_id: str):
    """
    Delete video and all associated data.
    
    Args:
        video_id: Video UUID
        user_id: User UUID (for ownership verification)
    
    Returns:
        Success message
    """
    # Verify ownership
    video = get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    if str(video['user_id']) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete from database (cascade will delete segments)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM public.videos
                WHERE id = %s
            """, (video_id,))
            conn.commit()
    
    return {"message": "Video deleted successfully", "video_id": video_id}

