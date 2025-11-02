"""Database connection pool for FastAPI."""

import psycopg_pool
from app.core.config import settings


# Connection pool (lazy-initialized)
_pool = None


def get_pool() -> psycopg_pool.ConnectionPool:
    """
    Get or create database connection pool.
    
    Returns:
        psycopg ConnectionPool
    """
    global _pool
    
    if _pool is None:
        _pool = psycopg_pool.ConnectionPool(
            settings.DATABASE_URL,
            min_size=2,
            max_size=10,
            timeout=30.0
        )
    
    return _pool


def get_connection():
    """
    Get a connection from the pool (context manager).
    
    Usage:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT ...")
    """
    pool = get_pool()
    return pool.connection()


def close_pool():
    """Close the connection pool."""
    global _pool
    if _pool:
        _pool.close()
        _pool = None

