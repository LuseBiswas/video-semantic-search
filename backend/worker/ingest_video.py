#!/usr/bin/env python3
"""
Video ingestion pipeline: Extract frames, compute embeddings, store in Supabase.

Usage:
    python ingest_video.py <video_path> <video_id> <user_id>
    
Example:
    python ingest_video.py /path/to/video.mp4 abc-123 user-456
"""

import sys
import os
import uuid
from pathlib import Path
from typing import Optional

from worker.utils.ffmpeg import probe_video, extract_frames
from worker.utils.embeddings import get_model
from worker.utils.captioning import generate_captions_batch
from worker.utils.supabase_io import (
    upload_frame,
    insert_video,
    insert_segment,
    update_video_status,
    upload_to_storage
)
from app.core.config import settings


def ingest_video(
    video_path: str,
    video_id: str,
    user_id: str,
    fps: float = 1.0,
    batch_size: int = 10,
    upload_video: bool = False
) -> dict:
    """
    Ingest video: extract frames, compute embeddings, store in Supabase.
    
    Args:
        video_path: Path to video file on disk
        video_id: UUID for this video
        user_id: User UUID who owns this video
        fps: Frames per second to extract (default: 1.0)
        batch_size: Number of frames to process in batch (default: 10)
        upload_video: Whether to upload original video to storage (default: False)
    
    Returns:
        dict with summary: {
            'video_id': str,
            'duration_ms': int,
            'frames_extracted': int,
            'segments_inserted': int,
            'status': str
        }
    """
    print("=" * 60)
    print(f"🎬 Video Ingestion Pipeline")
    print("=" * 60)
    print(f"Video: {video_path}")
    print(f"Video ID: {video_id}")
    print(f"User ID: {user_id}")
    print(f"FPS: {fps}")
    print()
    
    try:
        # Step 1: Probe video metadata
        print("📊 Step 1: Probing video metadata...")
        metadata = probe_video(video_path)
        duration_ms = metadata['duration_ms']
        width = metadata['width']
        height = metadata['height']
        
        print(f"   Duration: {duration_ms}ms ({duration_ms/1000:.1f}s)")
        print(f"   Resolution: {width}x{height}")
        print(f"   FPS: {metadata['fps']:.2f}")
        
        # Step 2: Upload original video (optional)
        video_url = None
        if upload_video:
            print("\n📤 Step 2: Uploading original video...")
            video_filename = Path(video_path).name
            storage_path = f"{user_id}/{video_id}/{video_filename}"
            
            with open(video_path, 'rb') as f:
                video_bytes = f.read()
            
            upload_to_storage(
                settings.BUCKET_VIDEOS,
                storage_path,
                video_bytes,
                content_type="video/mp4"
            )
            video_url = f"{settings.BUCKET_VIDEOS}/{storage_path}"
            print(f"   ✅ Uploaded to: {video_url}")
        else:
            print("\n⏭️  Step 2: Skipping video upload (upload_video=False)")
            video_url = f"local://{video_path}"
        
        # Step 3: Insert video record
        print("\n📝 Step 3: Creating video record...")
        insert_video(
            video_id=video_id,
            user_id=user_id,
            url=video_url,
            duration_ms=duration_ms,
            width=width,
            height=height,
            status="processing"
        )
        print(f"   ✅ Video record created (status: processing)")
        
        # Step 4: Load models
        print("\n🤖 Step 4: Loading AI models...")
        model = get_model(
            model_name=settings.MODEL_NAME,
            pretrained=settings.MODEL_PRETRAIN
        )
        print(f"   ✅ OpenCLIP model loaded: {settings.MODEL_NAME}")
        
        # Pre-load caption model (will be lazy-loaded on first use)
        from worker.utils.captioning import get_caption_model
        get_caption_model()
        print(f"   ✅ BLIP captioning model loaded")
        
        # Step 5: Extract frames and process in batches
        print(f"\n🎞️  Step 5: Extracting frames at {fps} fps...")
        
        frame_buffer = []
        timestamp_buffer = []
        frames_extracted = 0
        segments_inserted = 0
        first_frame_uploaded = False
        
        for timestamp_ms, frame_image in extract_frames(video_path, fps=fps):
            # Upload first frame as thumbnail
            if not first_frame_uploaded:
                print("   📸 Generating thumbnail from first frame...")
                thumbnail_path = f"{user_id}/{video_id}/thumbnail.jpg"
                upload_frame(
                    settings.BUCKET_FRAMES,
                    thumbnail_path,
                    frame_image,
                    quality=90
                )
                thumbnail_url = f"{settings.BUCKET_FRAMES}/{thumbnail_path}"
                
                # Update video record with thumbnail
                insert_video(
                    video_id=video_id,
                    user_id=user_id,
                    url=video_url,
                    duration_ms=duration_ms,
                    width=width,
                    height=height,
                    status="processing",
                    thumbnail_url=thumbnail_url
                )
                print(f"   ✅ Thumbnail uploaded: {thumbnail_path}")
                first_frame_uploaded = True
            
            frame_buffer.append(frame_image)
            timestamp_buffer.append(timestamp_ms)
            frames_extracted += 1
            
            # Process batch when buffer is full
            if len(frame_buffer) >= batch_size:
                segments_inserted += process_frame_batch(
                    frame_buffer,
                    timestamp_buffer,
                    video_id,
                    user_id,
                    model
                )
                frame_buffer.clear()
                timestamp_buffer.clear()
                
                print(f"   Processed {frames_extracted} frames, {segments_inserted} segments inserted...", end='\r')
        
        # Process remaining frames
        if frame_buffer:
            segments_inserted += process_frame_batch(
                frame_buffer,
                timestamp_buffer,
                video_id,
                user_id,
                model
            )
        
        print(f"\n   ✅ Extracted {frames_extracted} frames")
        print(f"   ✅ Inserted {segments_inserted} segments")
        
        # Step 6: Update video status to ready
        print("\n✅ Step 6: Finalizing...")
        update_video_status(video_id, status="ready")
        print(f"   ✅ Video status: ready")
        
        print("\n" + "=" * 60)
        print("🎉 Ingestion Complete!")
        print("=" * 60)
        
        return {
            'video_id': video_id,
            'user_id': user_id,
            'duration_ms': duration_ms,
            'frames_extracted': frames_extracted,
            'segments_inserted': segments_inserted,
            'status': 'ready'
        }
        
    except Exception as e:
        print(f"\n❌ Ingestion failed: {e}")
        
        # Update video status to error
        try:
            update_video_status(video_id, status="error", error_msg=str(e))
            print(f"   Video status updated to: error")
        except:
            pass
        
        raise


def process_frame_batch(
    frames: list,
    timestamps: list,
    video_id: str,
    user_id: str,
    model
) -> int:
    """
    Process a batch of frames: encode embeddings, generate captions, upload frames, insert segments.
    
    Args:
        frames: List of PIL Images
        timestamps: List of timestamp_ms
        video_id: Video UUID
        user_id: User UUID
        model: OpenCLIP model instance
    
    Returns:
        Number of segments inserted
    """
    # Compute embeddings in batch (efficient)
    embeddings = model.encode_images_batch(frames)
    
    # Generate captions in batch
    captions = generate_captions_batch(frames)
    
    # Upload frames and insert segments
    for i, (frame, timestamp_ms, embedding, caption) in enumerate(zip(frames, timestamps, embeddings, captions)):
        # Generate frame path
        frame_filename = f"frame_{timestamp_ms:08d}.jpg"
        frame_path = f"{user_id}/{video_id}/{frame_filename}"
        
        # Upload frame to storage
        upload_frame(
            settings.BUCKET_FRAMES,
            frame_path,
            frame,
            quality=85
        )
        
        # Insert segment with embedding and caption
        insert_segment(
            video_id=video_id,
            t_start_ms=timestamp_ms,
            t_end_ms=timestamp_ms,
            frame_url=f"{settings.BUCKET_FRAMES}/{frame_path}",
            emb=embedding.tolist(),  # Convert numpy array to list
            modality="vision",
            caption={"text": caption}  # Store caption in JSONB field
        )
    
    return len(frames)


def main():
    """CLI entry point."""
    if len(sys.argv) < 4:
        print("Usage: python ingest_video.py <video_path> <video_id> <user_id>")
        print("\nExample:")
        print("  python ingest_video.py /path/to/video.mp4 abc-123 user-456")
        print("\nOptional: Generate UUIDs automatically:")
        print("  python ingest_video.py /path/to/video.mp4 auto user-456")
        sys.exit(1)
    
    video_path = sys.argv[1]
    video_id = sys.argv[2]
    user_id = sys.argv[3]
    
    # Validate video file exists
    if not os.path.exists(video_path):
        print(f"❌ Error: Video file not found: {video_path}")
        sys.exit(1)
    
    # Auto-generate video_id if requested
    if video_id == "auto":
        video_id = str(uuid.uuid4())
        print(f"Generated video_id: {video_id}")
    
    # Run ingestion
    try:
        result = ingest_video(
            video_path=video_path,
            video_id=video_id,
            user_id=user_id,
            fps=1.0,
            batch_size=10,
            upload_video=False  # Set to True to upload original video
        )
        
        print(f"\n📋 Summary:")
        print(f"   Video ID: {result['video_id']}")
        print(f"   Duration: {result['duration_ms']}ms")
        print(f"   Frames: {result['frames_extracted']}")
        print(f"   Segments: {result['segments_inserted']}")
        print(f"   Status: {result['status']}")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())

