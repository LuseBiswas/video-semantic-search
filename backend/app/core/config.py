import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_ANON_KEY: str
    
    # Storage Buckets
    BUCKET_VIDEOS: str = "videos"
    BUCKET_FRAMES: str = "frames"
    BUCKET_PREVIEWS: str = "previews"
    
    # Model
    MODEL_NAME: str = "ViT-B-32"
    MODEL_PRETRAIN: str = "openai"
    EMB_DIM: int = 512  # ViT-B-32 produces 512-dim embeddings
    
    # API
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

