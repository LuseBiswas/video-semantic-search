#!/usr/bin/env python3
"""Test FFmpeg utilities with a synthetic test video."""

import os
import subprocess
import tempfile
from pathlib import Path
from worker.utils.ffmpeg import probe_video, extract_frames, extract_single_frame, create_thumbnail


def create_test_video(output_path: str, duration_sec: int = 5) -> None:
    """
    Create a test video using FFmpeg.
    
    Args:
        output_path: Output video path
        duration_sec: Video duration in seconds
    """
    print(f"📹 Creating test video ({duration_sec}s)...")
    
    # Create test video with color gradient + timestamp overlay
    cmd = [
        'ffmpeg',
        '-f', 'lavfi',
        '-i', f'testsrc=duration={duration_sec}:size=640x480:rate=30',
        '-vf', 'drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text=%{pts\\:hms}:fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2',
        '-pix_fmt', 'yuv420p',
        '-c:v', 'libx264',
        '-y',  # Overwrite output
        output_path
    ]
    
    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        print(f"✅ Test video created: {output_path}")
    except subprocess.CalledProcessError as e:
        print(f"⚠️  Could not create video with timestamp overlay, trying simpler version...")
        # Fallback: create without text overlay
        cmd_simple = [
            'ffmpeg',
            '-f', 'lavfi',
            '-i', f'testsrc=duration={duration_sec}:size=640x480:rate=30',
            '-pix_fmt', 'yuv420p',
            '-c:v', 'libx264',
            '-y',
            output_path
        ]
        subprocess.run(cmd_simple, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"✅ Test video created: {output_path}")


def test_probe():
    """Test video probing."""
    print("\n" + "=" * 60)
    print("Test 1: Probe Video Metadata")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = os.path.join(tmpdir, "test.mp4")
        create_test_video(video_path, duration_sec=3)
        
        metadata = probe_video(video_path)
        
        print(f"\n📊 Video Metadata:")
        print(f"  Duration: {metadata['duration_ms']}ms ({metadata['duration_ms']/1000:.1f}s)")
        print(f"  Resolution: {metadata['width']}x{metadata['height']}")
        print(f"  FPS: {metadata['fps']:.2f}")
        
        assert metadata['duration_ms'] > 0, "Duration should be > 0"
        assert metadata['width'] == 640, f"Width should be 640, got {metadata['width']}"
        assert metadata['height'] == 480, f"Height should be 480, got {metadata['height']}"
        
        print("\n✅ Probe test passed")


def test_extract_frames():
    """Test frame extraction at 1 fps."""
    print("\n" + "=" * 60)
    print("Test 2: Extract Frames (1 fps)")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = os.path.join(tmpdir, "test.mp4")
        create_test_video(video_path, duration_sec=3)
        
        frames = list(extract_frames(video_path, fps=1.0))
        
        print(f"\n📸 Extracted {len(frames)} frames:")
        for timestamp_ms, frame in frames:
            print(f"  Frame at {timestamp_ms}ms - size: {frame.size}, mode: {frame.mode}")
        
        # Should get ~3 frames (1 fps * 3 seconds)
        assert 2 <= len(frames) <= 4, f"Expected ~3 frames, got {len(frames)}"
        
        # Check first frame
        timestamp_ms, frame = frames[0]
        assert timestamp_ms >= 0, f"First timestamp should be >= 0ms, got {timestamp_ms}ms"
        assert frame.mode == 'RGB', f"Frame should be RGB, got {frame.mode}"
        assert frame.size == (640, 480), f"Frame size should be (640, 480), got {frame.size}"
        
        # Check timestamps are increasing
        timestamps = [ts for ts, _ in frames]
        assert timestamps == sorted(timestamps), "Timestamps should be monotonically increasing"
        
        print("\n✅ Frame extraction test passed")


def test_extract_single_frame():
    """Test extracting single frame at timestamp."""
    print("\n" + "=" * 60)
    print("Test 3: Extract Single Frame")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = os.path.join(tmpdir, "test.mp4")
        create_test_video(video_path, duration_sec=5)
        
        # Extract frame at 2.5 seconds
        frame = extract_single_frame(video_path, timestamp_sec=2.5)
        
        print(f"\n📸 Single frame at 2.5s:")
        print(f"  Size: {frame.size}")
        print(f"  Mode: {frame.mode}")
        
        assert frame.size == (640, 480), f"Expected (640, 480), got {frame.size}"
        assert frame.mode == 'RGB', f"Expected RGB, got {frame.mode}"
        
        print("\n✅ Single frame extraction test passed")


def test_thumbnail():
    """Test thumbnail creation."""
    print("\n" + "=" * 60)
    print("Test 4: Thumbnail Creation")
    print("=" * 60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = os.path.join(tmpdir, "test.mp4")
        create_test_video(video_path, duration_sec=2)
        
        # Extract a frame and create thumbnail
        frame = extract_single_frame(video_path, timestamp_sec=1.0)
        original_size = frame.size
        
        # Create thumbnail (max 320px)
        thumb = create_thumbnail(frame.copy(), max_size=320)
        
        print(f"\n🖼️  Thumbnail:")
        print(f"  Original size: {original_size}")
        print(f"  Thumbnail size: {thumb.size}")
        print(f"  Aspect ratio preserved: {abs(original_size[0]/original_size[1] - thumb.size[0]/thumb.size[1]) < 0.01}")
        
        # Check that thumbnail is smaller
        assert max(thumb.size) <= 320, f"Thumbnail should be max 320px, got {max(thumb.size)}"
        
        # Check aspect ratio preserved (roughly)
        original_ratio = original_size[0] / original_size[1]
        thumb_ratio = thumb.size[0] / thumb.size[1]
        assert abs(original_ratio - thumb_ratio) < 0.1, "Aspect ratio not preserved"
        
        print("\n✅ Thumbnail test passed")


def main():
    """Run all tests."""
    print("=" * 60)
    print("🚀 FFmpeg Utilities Test")
    print("=" * 60)
    
    try:
        test_probe()
        test_extract_frames()
        test_extract_single_frame()
        test_thumbnail()
        
        print("\n" + "=" * 60)
        print("🎉 All FFmpeg tests passed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())

