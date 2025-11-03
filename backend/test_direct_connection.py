"""Test if we can connect to database at all."""

import os
import sys
import psycopg
from dotenv import load_dotenv

# Load .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

print(f"🔍 Testing Database Connection")
print(f"{'='*60}")
print(f"DATABASE_URL: {DATABASE_URL[:50] if DATABASE_URL else 'NOT SET'}...")
print(f"{'='*60}\n")

if not DATABASE_URL:
    print("❌ DATABASE_URL is not set in .env file!")
    sys.exit(1)

# Test direct connection (no pool)
print("Testing direct connection (no pool)...")
try:
    conn = psycopg.connect(DATABASE_URL, connect_timeout=5)
    print("✅ Direct connection successful!")
    
    # Try a simple query
    with conn.cursor() as cur:
        cur.execute("SELECT 1 as test")
        result = cur.fetchone()
        if result and result[0] == 1:
            print("✅ Query test successful!")
        else:
            print("❌ Query test failed!")
    
    conn.close()
    print("\n🎉 Database connection is working!")
    print("\nThe issue is with the connection pool, not the database.")
    print("Try restarting your backend with a fresh terminal.")
    
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print("\n🔧 Possible fixes:")
    print("1. Check your .env file has correct DATABASE_URL")
    print("2. Make sure it's port 5432 (not 6543)")
    print("3. No extra spaces or duplicate 'DATABASE_URL=' text")
    print("\nExpected format:")
    print("DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres")

