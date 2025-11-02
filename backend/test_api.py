#!/usr/bin/env python3
"""Test complete API."""

import time
import subprocess
import psycopg
from app.core.config import settings


def test_api():
    """Test all API endpoints."""
    print("=" * 60)
    print("🚀 Testing Complete API")
    print("=" * 60)
    
    # Get test user and video from previous tests
    with psycopg.connect(settings.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # Get test user
            cur.execute("SELECT id FROM auth.users LIMIT 1")
            row = cur.fetchone()
            if not row:
                print("❌ No users found. Run test_supabase_io.py first.")
                return 1
            user_id = str(row[0])
            
            # Get a ready video
            cur.execute("""
                SELECT id FROM public.videos 
                WHERE user_id = %s AND status = 'ready'
                LIMIT 1
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                print("❌ No ready videos found. Run test_ingestion.py first.")
                return 1
            video_id = str(row[0])
    
    print(f"✅ Using test user: {user_id}")
    print(f"✅ Using test video: {video_id}\n")
    
    base_url = "http://localhost:8000"
    
    # Test 1: Health check
    print("📍 Test 1: Health Check")
    print("-" * 60)
    cmd = f"curl -s {base_url}/health"
    print(f"$ {cmd}\n")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(result.stdout)
    print()
    
    # Test 2: List videos
    print("\n📍 Test 2: List Videos")
    print("-" * 60)
    cmd = f"curl -s '{base_url}/v1/videos?user_id={user_id}&limit=5'"
    print(f"$ {cmd}\n")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(result.stdout[:500] + "..." if len(result.stdout) > 500 else result.stdout)
    print()
    
    # Test 3: Get specific video
    print("\n📍 Test 3: Get Video Details")
    print("-" * 60)
    cmd = f"curl -s '{base_url}/v1/videos/{video_id}?user_id={user_id}'"
    print(f"$ {cmd}\n")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(result.stdout)
    print()
    
    # Test 4: Search - "sunset"
    print("\n📍 Test 4: Search for 'sunset'")
    print("-" * 60)
    cmd = f'''curl -s -X POST {base_url}/v1/search \
  -H "Content-Type: application/json" \
  -d '{{"query": "sunset", "user_id": "{user_id}", "top_k": 5}}'
'''
    print(f"$ {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(result.stdout[:800] + "..." if len(result.stdout) > 800 else result.stdout)
    print()
    
    # Test 5: Search within specific video
    print("\n📍 Test 5: Search within specific video")
    print("-" * 60)
    cmd = f'''curl -s -X POST {base_url}/v1/search \
  -H "Content-Type: application/json" \
  -d '{{"query": "colorful", "user_id": "{user_id}", "video_id": "{video_id}", "top_k": 3}}'
'''
    print(f"$ {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(result.stdout[:800] + "..." if len(result.stdout) > 800 else result.stdout)
    print()
    
    print("\n" + "=" * 60)
    print("✅ API Test Complete!")
    print("=" * 60)
    print("\n💡 Next steps:")
    print("   1. Open http://localhost:8000/docs for interactive API docs")
    print("   2. Test file upload: POST /v1/videos/upload")
    print("   3. Build frontend to consume these APIs")
    
    return 0


def main():
    print("\nℹ️  Make sure the API server is running:")
    print("   $ uvicorn app.main:app --reload\n")
    
    response = input("Is the server running at http://localhost:8000? (y/n): ")
    if response.lower() != 'y':
        print("\n❌ Start the server first:")
        print("   $ uvicorn app.main:app --reload")
        print("\nThen run this test again.")
        return 1
    
    return test_api()


if __name__ == "__main__":
    import sys
    sys.exit(main())

