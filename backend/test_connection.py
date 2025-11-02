#!/usr/bin/env python3
"""Test Supabase connection and verify schema."""

import sys
import psycopg
from app.core.config import settings


def test_postgres_connection():
    """Test direct Postgres connection."""
    print("🔌 Testing Postgres connection...")
    try:
        with psycopg.connect(settings.DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                version = cur.fetchone()[0]
                print(f"✅ Connected to Postgres: {version[:50]}...")
                return True
    except Exception as e:
        print(f"❌ Postgres connection failed: {e}")
        return False


def test_extensions():
    """Check pgvector extension."""
    print("\n🔌 Checking extensions...")
    try:
        with psycopg.connect(settings.DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT extname, extversion 
                    FROM pg_extension 
                    WHERE extname IN ('vector', 'pgcrypto');
                """)
                exts = cur.fetchall()
                for name, version in exts:
                    print(f"✅ Extension {name} v{version} enabled")
                
                if len(exts) < 2:
                    print("⚠️  Missing extensions. Expected: vector, pgcrypto")
                    return False
                return True
    except Exception as e:
        print(f"❌ Extension check failed: {e}")
        return False


def test_tables():
    """Verify videos and segments tables exist."""
    print("\n📊 Checking tables...")
    try:
        with psycopg.connect(settings.DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Check videos table
                cur.execute("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                      AND table_name = 'videos'
                    ORDER BY ordinal_position;
                """)
                video_cols = cur.fetchall()
                
                if video_cols:
                    print(f"✅ Table 'videos' exists with {len(video_cols)} columns")
                    for col, dtype in video_cols:
                        print(f"   - {col}: {dtype}")
                else:
                    print("❌ Table 'videos' not found")
                    return False
                
                # Check segments table
                cur.execute("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                      AND table_name = 'segments'
                    ORDER BY ordinal_position;
                """)
                segment_cols = cur.fetchall()
                
                if segment_cols:
                    print(f"\n✅ Table 'segments' exists with {len(segment_cols)} columns")
                    for col, dtype in segment_cols:
                        print(f"   - {col}: {dtype}")
                else:
                    print("❌ Table 'segments' not found")
                    return False
                
                return True
    except Exception as e:
        print(f"❌ Table check failed: {e}")
        return False


def test_indexes():
    """Check vector index on segments."""
    print("\n🔍 Checking indexes...")
    try:
        with psycopg.connect(settings.DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT indexname, indexdef 
                    FROM pg_indexes 
                    WHERE tablename = 'segments' 
                      AND schemaname = 'public';
                """)
                indexes = cur.fetchall()
                
                if indexes:
                    print(f"✅ Found {len(indexes)} index(es) on 'segments':")
                    for name, defn in indexes:
                        print(f"   - {name}")
                        if "ivfflat" in defn.lower():
                            print(f"     🎯 Vector index detected!")
                else:
                    print("⚠️  No indexes found on 'segments'")
                
                return True
    except Exception as e:
        print(f"❌ Index check failed: {e}")
        return False


def test_rls():
    """Check if RLS is enabled."""
    print("\n🔒 Checking Row Level Security...")
    try:
        with psycopg.connect(settings.DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT tablename, rowsecurity 
                    FROM pg_tables 
                    WHERE schemaname = 'public' 
                      AND tablename IN ('videos', 'segments');
                """)
                rls_status = cur.fetchall()
                
                for table, enabled in rls_status:
                    status = "✅ Enabled" if enabled else "⚠️  Disabled"
                    print(f"{status} on '{table}'")
                
                return True
    except Exception as e:
        print(f"❌ RLS check failed: {e}")
        return False


def main():
    print("=" * 60)
    print("🚀 Supabase Connection Test")
    print("=" * 60)
    
    results = []
    results.append(test_postgres_connection())
    results.append(test_extensions())
    results.append(test_tables())
    results.append(test_indexes())
    results.append(test_rls())
    
    print("\n" + "=" * 60)
    if all(results):
        print("✅ All checks passed! Ready to proceed.")
        print("=" * 60)
        return 0
    else:
        print("❌ Some checks failed. Review output above.")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())

