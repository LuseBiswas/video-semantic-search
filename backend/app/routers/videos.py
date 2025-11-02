"""Video upload and management endpoints."""

import os
import uuid
import tempfile
import threading
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from typing import Optional, List

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
    
    return VideoResponse(
        id=str(video['id']),
        user_id=str(video['user_id']),
        url=video['url'],
        duration_ms=video['duration_ms'],
        width=video['width'],
        height=video['height'],
        status=video['status'],
        error_msg=video['error_msg'],
        created_at=video['created_at'].isoformat() if video['created_at'] else None
    )


@router.get("", response_model=List[VideoResponse])
def list_videos(user_id: str, limit: int = 50):
    """
    List all videos for a user.
    
    Args:
        user_id: User UUID
        limit: Max number of videos to return
    
    Returns:
        List of VideoResponse
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, user_id, url, duration_ms, width, height, status, error_msg, created_at
                FROM public.videos
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (user_id, limit))
            
            rows = cur.fetchall()
            
            videos = []
            for row in rows:
                videos.append(VideoResponse(
                    id=str(row[0]),
                    user_id=str(row[1]),
                    url=row[2],
                    duration_ms=row[3],
                    width=row[4],
                    height=row[5],
                    status=row[6],
                    error_msg=row[7],
                    created_at=row[8].isoformat() if row[8] else None
                ))
            
            return videos

