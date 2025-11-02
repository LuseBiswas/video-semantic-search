"""Supabase Storage and Database I/O utilities."""

import io
import json
import uuid
import psycopg
import httpx
from PIL import Image
from typing import Optional
from datetime import timedelta
from app.core.config import settings


def get_db_connection() -> psycopg.Connection:
    """
    Get database connection.
    
    Returns:
        psycopg Connection
    """
    return psycopg.connect(settings.DATABASE_URL)


def get_storage_url(bucket: str, path: str) -> str:
    """
    Build Supabase Storage URL.
    
    Args:
        bucket: Bucket name
        path: File path within bucket
    
    Returns:
        Full storage URL
    """
    return f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{path}"


def get_signed_url(bucket: str, path: str, expires_in: int = 3600) -> str:
    """
    Generate signed URL for private object.
    
    Args:
        bucket: Bucket name
        path: File path within bucket
        expires_in: Expiry time in seconds (default 1 hour)
    
    Returns:
        Signed URL
    """
    url = f"{settings.SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}"
    
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {"expiresIn": expires_in}
    
    response = httpx.post(url, json=payload, headers=headers)
    response.raise_for_status()
    
    data = response.json()
    signed_path = data.get("signedURL")
    
    if not signed_path:
        raise ValueError(f"Failed to generate signed URL: {data}")
    
    # Return full URL
    return f"{settings.SUPABASE_URL}/storage/v1{signed_path}"


def download_from_storage(bucket: str, path: str, output_path: str) -> None:
    """
    Download file from Supabase Storage.
    
    Args:
        bucket: Bucket name
        path: File path within bucket
        output_path: Local path to save file
    """
    # Get signed URL
    signed_url = get_signed_url(bucket, path, expires_in=300)
    
    # Download
    with httpx.stream("GET", signed_url) as response:
        response.raise_for_status()
        with open(output_path, "wb") as f:
            for chunk in response.iter_bytes(chunk_size=8192):
                f.write(chunk)


def upload_to_storage(bucket: str, path: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    """
    Upload file to Supabase Storage.
    
    Args:
        bucket: Bucket name
        path: File path within bucket
        data: File bytes
        content_type: MIME type
    
    Returns:
        Storage path
    """
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": content_type
    }
    
    response = httpx.post(url, content=data, headers=headers, timeout=30.0)
    response.raise_for_status()
    
    return path


def upload_frame(bucket: str, path: str, image: Image.Image, quality: int = 85) -> str:
    """
    Upload PIL Image as JPEG to Storage.
    
    Args:
        bucket: Bucket name (typically "frames")
        path: File path within bucket (e.g., "user_123/video_456/frame_001000.jpg")
        image: PIL Image
        quality: JPEG quality (1-100)
    
    Returns:
        Storage path
    """
    # Convert PIL Image to JPEG bytes
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=quality, optimize=True)
    jpeg_bytes = buffer.getvalue()
    
    # Upload
    return upload_to_storage(bucket, path, jpeg_bytes, content_type="image/jpeg")


def insert_video(
    video_id: str,
    user_id: str,
    url: str,
    duration_ms: int,
    width: Optional[int] = None,
    height: Optional[int] = None,
    status: str = "processing",
    error_msg: Optional[str] = None,
    thumbnail_url: Optional[str] = None
) -> None:
    """
    Insert or update video record in database.
    
    Args:
        video_id: Video UUID
        user_id: User UUID
        url: Storage path (e.g., "videos/user_123/video.mp4")
        duration_ms: Duration in milliseconds
        width: Video width
        height: Video height
        status: Status (processing, completed, failed)
        error_msg: Error message if failed
        thumbnail_url: Thumbnail URL
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO public.videos (
                    id, user_id, url, duration_ms, width, height, status, error_msg, thumbnail_url
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) 
                DO UPDATE SET
                    duration_ms = EXCLUDED.duration_ms,
                    width = EXCLUDED.width,
                    height = EXCLUDED.height,
                    status = EXCLUDED.status,
                    error_msg = EXCLUDED.error_msg,
                    thumbnail_url = EXCLUDED.thumbnail_url
            """, (video_id, user_id, url, duration_ms, width, height, status, error_msg, thumbnail_url))
            conn.commit()


def insert_segment(
    video_id: str,
    t_start_ms: int,
    t_end_ms: int,
    frame_url: str,
    emb: list[float],
    modality: str = "vision",
    caption: Optional[dict] = None
) -> str:
    """
    Insert segment with embedding into database.
    
    Args:
        video_id: Video UUID
        t_start_ms: Start time in milliseconds
        t_end_ms: End time in milliseconds
        frame_url: Storage path to frame image
        emb: Embedding vector (512 or 768 dimensions)
        modality: Type (vision, audio, caption)
        caption: Optional caption metadata
    
    Returns:
        Segment UUID
    """
    segment_id = str(uuid.uuid4())
    
    # Convert caption dict to JSON string for JSONB column
    caption_json = json.dumps(caption) if caption else None
    
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO public.segments (
                    id, video_id, t_start_ms, t_end_ms, modality, frame_url, emb, caption
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
            """, (segment_id, video_id, t_start_ms, t_end_ms, modality, frame_url, emb, caption_json))
            conn.commit()
    
    return segment_id


def update_video_status(video_id: str, status: str, error_msg: Optional[str] = None) -> None:
    """
    Update video processing status.
    
    Args:
        video_id: Video UUID
        status: New status (processing, completed, failed)
        error_msg: Error message if failed
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE public.videos
                SET status = %s, error_msg = %s
                WHERE id = %s
            """, (status, error_msg, video_id))
            conn.commit()


def get_video(video_id: str) -> Optional[dict]:
    """
    Get video record from database.
    
    Args:
        video_id: Video UUID
    
    Returns:
        Video record dict or None if not found
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, user_id, url, duration_ms, width, height, status, error_msg, created_at, thumbnail_url
                FROM public.videos
                WHERE id = %s
            """, (video_id,))
            
            row = cur.fetchone()
            if row:
                return {
                    'id': row[0],
                    'user_id': row[1],
                    'url': row[2],
                    'duration_ms': row[3],
                    'width': row[4],
                    'height': row[5],
                    'status': row[6],
                    'error_msg': row[7],
                    'created_at': row[8],
                    'thumbnail_url': row[9]
                }
            return None


def count_segments(video_id: str) -> int:
    """
    Count segments for a video.
    
    Args:
        video_id: Video UUID
    
    Returns:
        Number of segments
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*)
                FROM public.segments
                WHERE video_id = %s
            """, (video_id,))
            
            return cur.fetchone()[0]

