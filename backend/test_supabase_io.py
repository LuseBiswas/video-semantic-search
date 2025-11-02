#!/usr/bin/env python3
"""Test Supabase I/O utilities."""

import uuid
import tempfile
import psycopg
from PIL import Image
from app.core.config import settings
from worker.utils.supabase_io import (
    upload_frame,
    get_signed_url,
    insert_video,
    insert_segment,
    get_video,
    count_segments,
    update_video_status,
    upload_to_storage,
    download_from_storage
)


def get_or_create_test_user() -> str:
    """
    Get existing user or create a test user in auth.users.
    
    Returns:
        User UUID
    """
    with psycopg.connect(settings.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # Try to get existing user
            cur.execute("SELECT id FROM auth.users LIMIT 1")
            row = cur.fetchone()
            
            if row:
                print(f"✅ Using existing user: {row[0]}")
                return str(row[0])
            
            # No users exist - create a test user
            test_user_id = str(uuid.uuid4())
            test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
            
            print(f"⚠️  No users found, creating test user...")
            print(f"   Email: {test_email}")
            
            cur.execute("""
                INSERT INTO auth.users (
                    id, 
                    email, 
                    encrypted_password, 
                    email_confirmed_at, 
                    created_at, 
                    updated_at,
                    aud,
                    role
                )
                VALUES (
                    %s, 
                    %s, 
                    crypt('test_password_123', gen_salt('bf')),
                    NOW(),
                    NOW(),
                    NOW(),
                    'authenticated',
                    'authenticated'
                )
            """, (test_user_id, test_email))
            conn.commit()
            
            print(f"✅ Test user created: {test_user_id}")
            return test_user_id


def test_upload_frame():
    """Test uploading frame image to Storage."""
    print("=" * 60)
    print("Test 1: Upload Frame to Storage")
    print("=" * 60)
    
    # Create test image
    test_image = Image.new("RGB", (640, 480), color=(255, 100, 50))
    
    # Generate unique path
    test_user_id = str(uuid.uuid4())
    test_video_id = str(uuid.uuid4())
    frame_path = f"test/{test_user_id}/{test_video_id}/frame_test.jpg"
    
    print(f"\n📤 Uploading test frame...")
    print(f"   Path: frames/{frame_path}")
    
    try:
        storage_path = upload_frame("frames", frame_path, test_image, quality=85)
        print(f"✅ Upload successful: {storage_path}")
        
        # Get signed URL
        print(f"\n🔗 Generating signed URL...")
        signed_url = get_signed_url("frames", frame_path, expires_in=300)
        print(f"✅ Signed URL: {signed_url[:80]}...")
        
        return frame_path
        
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        raise


def test_insert_video(user_id: str):
    """Test inserting video record."""
    print("\n" + "=" * 60)
    print("Test 2: Insert Video Record")
    print("=" * 60)
    
    test_video_id = str(uuid.uuid4())
    
    print(f"\n📝 Inserting video record...")
    print(f"   Video ID: {test_video_id}")
    print(f"   User ID: {user_id}")
    
    try:
        insert_video(
            video_id=test_video_id,
            user_id=user_id,
            url=f"videos/{user_id}/test_video.mp4",
            duration_ms=10000,
            width=1920,
            height=1080,
            status="processing"
        )
        print(f"✅ Video record inserted")
        
        # Verify insertion
        video = get_video(test_video_id)
        if video:
            print(f"\n📊 Retrieved video:")
            print(f"   Status: {video['status']}")
            print(f"   Duration: {video['duration_ms']}ms")
            print(f"   Resolution: {video['width']}x{video['height']}")
        else:
            raise ValueError("Video not found after insertion")
        
        return test_video_id
        
    except Exception as e:
        print(f"❌ Insert failed: {e}")
        raise


def test_insert_segment(video_id: str, frame_path: str):
    """Test inserting segment with embedding."""
    print("\n" + "=" * 60)
    print("Test 3: Insert Segment with Embedding")
    print("=" * 60)
    
    # Create mock embedding (512 dimensions)
    mock_embedding = [0.01 * i for i in range(512)]
    
    print(f"\n📝 Inserting segment...")
    print(f"   Video ID: {video_id}")
    print(f"   Timestamp: 1000ms")
    print(f"   Embedding dim: {len(mock_embedding)}")
    
    try:
        segment_id = insert_segment(
            video_id=video_id,
            t_start_ms=1000,
            t_end_ms=1000,
            frame_url=f"frames/{frame_path}",
            emb=mock_embedding,
            modality="vision"
        )
        print(f"✅ Segment inserted: {segment_id}")
        
        # Count segments
        count = count_segments(video_id)
        print(f"✅ Segment count for video: {count}")
        
        return segment_id
        
    except Exception as e:
        print(f"❌ Insert segment failed: {e}")
        raise


def test_update_status(video_id: str):
    """Test updating video status."""
    print("\n" + "=" * 60)
    print("Test 4: Update Video Status")
    print("=" * 60)
    
    print(f"\n📝 Updating video status to 'ready'...")
    
    try:
        update_video_status(video_id, status="ready")
        print(f"✅ Status updated")
        
        # Verify update
        video = get_video(video_id)
        if video and video['status'] == 'ready':
            print(f"✅ Status verified: {video['status']}")
        else:
            raise ValueError(f"Status not updated correctly: {video['status']}")
        
    except Exception as e:
        print(f"❌ Update failed: {e}")
        raise


def test_storage_round_trip():
    """Test upload and download from storage."""
    print("\n" + "=" * 60)
    print("Test 5: Storage Round-Trip (Upload + Download)")
    print("=" * 60)
    
    # Create test file
    test_data = b"Hello, Supabase Storage! This is test data."
    test_path = f"test/{uuid.uuid4()}/test_file.txt"
    
    print(f"\n📤 Uploading test file...")
    print(f"   Size: {len(test_data)} bytes")
    
    try:
        # Upload
        upload_to_storage("frames", test_path, test_data, content_type="text/plain")
        print(f"✅ Upload successful: {test_path}")
        
        # Download
        print(f"\n📥 Downloading test file...")
        with tempfile.NamedTemporaryFile(mode='rb', delete=False) as tmp:
            download_from_storage("frames", test_path, tmp.name)
            tmp.seek(0)
            downloaded_data = tmp.read()
        
        # Verify
        if downloaded_data == test_data:
            print(f"✅ Download successful, data matches")
        else:
            raise ValueError("Downloaded data doesn't match uploaded data")
        
    except Exception as e:
        print(f"❌ Round-trip failed: {e}")
        raise


def main():
    """Run all tests."""
    print("=" * 60)
    print("🚀 Supabase I/O Test Suite")
    print("=" * 60)
    
    try:
        # Get or create test user
        print("\n" + "=" * 60)
        print("Setup: Get Test User")
        print("=" * 60)
        user_id = get_or_create_test_user()
        
        # Test 1: Upload frame
        frame_path = test_upload_frame()
        
        # Test 2: Insert video
        video_id = test_insert_video(user_id)
        
        # Test 3: Insert segment
        segment_id = test_insert_segment(video_id, frame_path)
        
        # Test 4: Update status
        test_update_status(video_id)
        
        # Test 5: Storage round-trip
        test_storage_round_trip()
        
        print("\n" + "=" * 60)
        print("🎉 All Supabase I/O tests passed!")
        print("=" * 60)
        print(f"\n📋 Summary:")
        print(f"   Video ID: {video_id}")
        print(f"   User ID: {user_id}")
        print(f"   Segment ID: {segment_id}")
        print(f"   Frame path: frames/{frame_path}")
        print(f"\n💡 Test data remains in database for verification")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())

