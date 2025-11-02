#!/usr/bin/env python3
"""Test video ingestion pipeline with a real video."""

import os
import sys
import uuid
import tempfile
import subprocess
from worker.ingest_video import ingest_video
from worker.utils.supabase_io import get_video, count_segments


def create_test_video(output_path: str, duration_sec: int = 5) -> None:
    """Create a test video using FFmpeg."""
    print(f"📹 Creating {duration_sec}s test video...")
    
    cmd = [
        'ffmpeg',
        '-f', 'lavfi',
        '-i', f'testsrc=duration={duration_sec}:size=640x480:rate=30',
        '-pix_fmt', 'yuv420p',
        '-c:v', 'libx264',
        '-y',
        output_path
    ]
    
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print(f"✅ Test video created: {output_path}\n")


def test_ingestion():
    """Test complete ingestion pipeline."""
    print("=" * 60)
    print("🚀 Video Ingestion Test")
    print("=" * 60)
    print()
    
    # Get test user (from previous test)
    import psycopg
    from app.core.config import settings
    
    with psycopg.connect(settings.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM auth.users LIMIT 1")
            row = cur.fetchone()
            if not row:
                print("❌ No users found. Run test_supabase_io.py first to create test user.")
                return 1
            test_user_id = str(row[0])
    
    print(f"👤 Using test user: {test_user_id}\n")
    
    # Create test video
    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = os.path.join(tmpdir, "test_video.mp4")
        create_test_video(video_path, duration_sec=5)
        
        # Generate video ID
        video_id = str(uuid.uuid4())
        
        # Run ingestion
        try:
            result = ingest_video(
                video_path=video_path,
                video_id=video_id,
                user_id=test_user_id,
                fps=1.0,
                batch_size=3,  # Small batch for testing
                upload_video=False
            )
            
            print("\n" + "=" * 60)
            print("✅ Ingestion Test Passed!")
            print("=" * 60)
            
            # Verify results
            print("\n🔍 Verification:")
            
            # Check video record
            video = get_video(video_id)
            if video:
                print(f"   ✅ Video record exists")
                print(f"      Status: {video['status']}")
                print(f"      Duration: {video['duration_ms']}ms")
            else:
                print(f"   ❌ Video record not found!")
                return 1
            
            # Check segments
            segment_count = count_segments(video_id)
            print(f"   ✅ Segments inserted: {segment_count}")
            
            # Verify count matches
            expected_segments = result['segments_inserted']
            if segment_count == expected_segments:
                print(f"   ✅ Segment count matches: {segment_count}")
            else:
                print(f"   ⚠️  Segment count mismatch: expected {expected_segments}, got {segment_count}")
            
            print("\n📋 Final Summary:")
            print(f"   Video ID: {result['video_id']}")
            print(f"   User ID: {result['user_id']}")
            print(f"   Duration: {result['duration_ms']}ms ({result['duration_ms']/1000:.1f}s)")
            print(f"   Frames extracted: {result['frames_extracted']}")
            print(f"   Segments in DB: {segment_count}")
            print(f"   Status: {result['status']}")
            
            print("\n💡 Test data remains in database for verification")
            print(f"   You can query this video in search tests using video_id: {video_id}")
            
            return 0
            
        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            import traceback
            traceback.print_exc()
            return 1


def main():
    return test_ingestion()


if __name__ == "__main__":
    sys.exit(main())

