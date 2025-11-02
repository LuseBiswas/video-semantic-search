"""FFmpeg utilities for video processing."""

import ffmpeg
import numpy as np
from PIL import Image
from typing import Iterator, Optional


def probe_video(filepath: str) -> dict:
    """
    Probe video file to extract metadata.
    
    Args:
        filepath: Path to video file
    
    Returns:
        dict with keys: duration_ms, width, height, fps
    
    Raises:
        ffmpeg.Error: If probe fails
    """
    try:
        probe = ffmpeg.probe(filepath)
        
        # Find video stream
        video_stream = next(
            (s for s in probe['streams'] if s['codec_type'] == 'video'),
            None
        )
        
        if video_stream is None:
            raise ValueError("No video stream found in file")
        
        # Extract duration (in seconds, convert to ms)
        duration_sec = float(probe['format'].get('duration', 0))
        duration_ms = int(duration_sec * 1000)
        
        # Extract dimensions
        width = int(video_stream['width'])
        height = int(video_stream['height'])
        
        # Extract FPS (handle fractional frame rates like "30000/1001")
        fps_str = video_stream.get('r_frame_rate', '30/1')
        if '/' in fps_str:
            num, denom = fps_str.split('/')
            fps = float(num) / float(denom)
        else:
            fps = float(fps_str)
        
        return {
            'duration_ms': duration_ms,
            'width': width,
            'height': height,
            'fps': fps
        }
    
    except ffmpeg.Error as e:
        raise RuntimeError(f"FFmpeg probe failed: {e.stderr.decode()}") from e


def extract_frames(
    filepath: str,
    fps: float = 1.0,
    start_time: Optional[float] = None,
    end_time: Optional[float] = None
) -> Iterator[tuple[int, Image.Image]]:
    """
    Extract frames from video at specified FPS.
    
    Args:
        filepath: Path to video file
        fps: Frames per second to extract (default 1.0 = 1 frame/sec)
        start_time: Start time in seconds (optional)
        end_time: End time in seconds (optional)
    
    Yields:
        Tuple of (timestamp_ms, PIL.Image)
        
    Example:
        for timestamp_ms, frame in extract_frames("video.mp4", fps=1.0):
            print(f"Frame at {timestamp_ms}ms")
            frame.save(f"frame_{timestamp_ms}.jpg")
    """
    try:
        # Get video metadata first
        metadata = probe_video(filepath)
        width = metadata['width']
        height = metadata['height']
        
        # Build ffmpeg command
        input_args = {}
        if start_time is not None:
            input_args['ss'] = start_time
        if end_time is not None:
            input_args['t'] = end_time - (start_time or 0)
        
        # Extract frames at specified FPS, output as raw RGB24 bytes
        process = (
            ffmpeg
            .input(filepath, **input_args)
            .filter('fps', fps=fps)
            .output('pipe:', format='rawvideo', pix_fmt='rgb24')
            .run_async(pipe_stdout=True, pipe_stderr=True, quiet=True)
        )
        
        frame_idx = 0
        frame_size = width * height * 3  # RGB = 3 bytes per pixel
        
        while True:
            # Read one frame worth of bytes
            raw_frame = process.stdout.read(frame_size)
            
            if not raw_frame or len(raw_frame) < frame_size:
                break
            
            # Convert raw bytes to numpy array
            frame_array = np.frombuffer(raw_frame, dtype=np.uint8)
            frame_array = frame_array.reshape((height, width, 3))
            
            # Convert to PIL Image
            frame_image = Image.fromarray(frame_array, mode='RGB')
            
            # Calculate timestamp (ms) for this frame
            timestamp_sec = frame_idx / fps
            if start_time is not None:
                timestamp_sec += start_time
            timestamp_ms = int(timestamp_sec * 1000)
            
            yield (timestamp_ms, frame_image)
            
            frame_idx += 1
        
        # Wait for process to complete
        process.stdout.close()
        process.wait()
        
    except ffmpeg.Error as e:
        raise RuntimeError(f"FFmpeg extraction failed: {e.stderr.decode()}") from e
    except Exception as e:
        raise RuntimeError(f"Frame extraction failed: {str(e)}") from e


def extract_single_frame(filepath: str, timestamp_sec: float) -> Image.Image:
    """
    Extract a single frame at specific timestamp.
    
    Args:
        filepath: Path to video file
        timestamp_sec: Timestamp in seconds
    
    Returns:
        PIL Image
    """
    try:
        metadata = probe_video(filepath)
        width = metadata['width']
        height = metadata['height']
        
        # Seek to timestamp and extract 1 frame
        process = (
            ffmpeg
            .input(filepath, ss=timestamp_sec)
            .output('pipe:', vframes=1, format='rawvideo', pix_fmt='rgb24')
            .run_async(pipe_stdout=True, pipe_stderr=True, quiet=True)
        )
        
        raw_frame = process.stdout.read(width * height * 3)
        process.stdout.close()
        process.wait()
        
        if not raw_frame:
            raise ValueError(f"Could not extract frame at {timestamp_sec}s")
        
        frame_array = np.frombuffer(raw_frame, dtype=np.uint8)
        frame_array = frame_array.reshape((height, width, 3))
        
        return Image.fromarray(frame_array, mode='RGB')
        
    except ffmpeg.Error as e:
        raise RuntimeError(f"FFmpeg extraction failed: {e.stderr.decode()}") from e


def create_thumbnail(image: Image.Image, max_size: int = 320) -> Image.Image:
    """
    Create thumbnail preserving aspect ratio.
    
    Args:
        image: PIL Image
        max_size: Max dimension (width or height)
    
    Returns:
        Resized PIL Image
    """
    image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    return image

