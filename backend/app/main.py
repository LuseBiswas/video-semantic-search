"""FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.routers import search, videos, debug
from app.db import close_pool, get_connection


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events (startup/shutdown)."""
    # Startup
    print("🚀 Starting Video Semantic Search API...")
    print(f"   CORS Origins: {settings.CORS_ORIGINS}")
    print(f"   Model: {settings.MODEL_NAME} ({settings.MODEL_PRETRAIN})")
    print(f"   Embedding Dim: {settings.EMB_DIM}")
    
    yield
    
    # Shutdown
    print("👋 Shutting down...")
    close_pool()


# Create FastAPI app
app = FastAPI(
    title="Video Semantic Search API",
    description="Content-based video search using OpenCLIP and pgvector",
    version="0.1.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(search.router)
app.include_router(videos.router)
app.include_router(debug.router)


@app.get("/health")
def health_check():
    """
    Health check endpoint with database connectivity test.
    
    Returns:
        Health status including database and connection pool status
    """
    import time
    from app.db import get_pool
    
    health_status = {
        "service": "video-semantic-search",
        "version": "0.1.0",
        "status": "healthy",
        "timestamp": time.time(),
        "checks": {}
    }
    
    # Check database connectivity
    try:
        start_time = time.time()
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        
        db_response_time = (time.time() - start_time) * 1000
        health_status["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": round(db_response_time, 2)
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Check connection pool
    try:
        pool = get_pool()
        pool_status = "healthy"
        
        if pool.available == 0:
            pool_status = "critical"
            health_status["status"] = "degraded"
        elif pool.available < pool.size * 0.3:
            pool_status = "degraded"
        
        health_status["checks"]["connection_pool"] = {
            "status": pool_status,
            "size": pool.size,
            "available": pool.available,
            "waiting": pool.waiting
        }
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["connection_pool"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    return health_status


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Video Semantic Search API",
        "docs": "/docs",
        "health": "/health"
    }

