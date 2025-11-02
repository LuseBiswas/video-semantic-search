"""FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.routers import search, videos
from app.db import close_pool


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


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "video-semantic-search",
        "version": "0.1.0"
    }


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Video Semantic Search API",
        "docs": "/docs",
        "health": "/health"
    }

