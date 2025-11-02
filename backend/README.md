# Video Semantic Search Backend

Content-based video search using OpenCLIP and pgvector.

## Features

- 🎬 **Video Upload** - Upload videos and automatically extract embeddings
- 🔍 **Semantic Search** - Search by meaning: "sunset", "golden hour", "ocean waves"
- 🎯 **ANN Search** - Fast approximate nearest neighbor search with pgvector
- 🔒 **Row-Level Security** - Users only see their own videos
- 📸 **Frame Thumbnails** - Signed URLs for preview frames

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` file:

```bash
DATABASE_URL=postgresql://postgres...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...
BUCKET_VIDEOS=videos
BUCKET_FRAMES=frames
BUCKET_PREVIEWS=previews
MODEL_NAME=ViT-B-32
MODEL_PRETRAIN=openai
EMB_DIM=512
CORS_ORIGINS=http://localhost:3000
```

### 3. Run Tests

```bash
# Test Supabase connection
python test_connection.py

# Test OpenCLIP embeddings
python test_embeddings.py

# Test FFmpeg frame extraction
python test_ffmpeg.py

# Test Supabase I/O
python test_supabase_io.py

# Test video ingestion pipeline
python test_ingestion.py
```

## Running the API

### Start Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### API Endpoints

#### Health Check
```bash
GET /health
```

#### Upload Video
```bash
POST /v1/videos/upload
Content-Type: multipart/form-data

file: <video_file>
user_id: <uuid>
```

#### List Videos
```bash
GET /v1/videos?user_id=<uuid>&limit=50
```

#### Get Video Details
```bash
GET /v1/videos/{video_id}?user_id=<uuid>
```

#### Search Videos
```bash
POST /v1/search
Content-Type: application/json

{
  "query": "sunset",
  "user_id": "<uuid>",
  "top_k": 20,
  "video_id": "<optional: search within specific video>"
}
```

### Example Usage

```bash
# Upload video
curl -X POST http://localhost:8000/v1/videos/upload \
  -F "file=@/path/to/video.mp4" \
  -F "user_id=abc-123"

# Search
curl -X POST http://localhost:8000/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "golden hour",
    "user_id": "abc-123",
    "top_k": 10
  }'
```

## API Documentation

Interactive API docs available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Manual Ingestion (CLI)

For batch processing or testing:

```bash
python worker/ingest_video.py <video_path> <video_id> <user_id>

# Example
python worker/ingest_video.py /path/to/video.mp4 auto user-123
```

## Architecture

```
┌─────────────┐
│   FastAPI   │  ← REST API
└──────┬──────┘
       │
       ├── /v1/videos/upload  → Upload + trigger ingestion
       ├── /v1/videos         → List/get videos
       └── /v1/search         → Semantic search
       
┌────────────────────────────────────┐
│      Ingestion Pipeline            │
├────────────────────────────────────┤
│ 1. FFmpeg     → Extract frames     │
│ 2. OpenCLIP   → Compute embeddings │
│ 3. Supabase   → Upload + store     │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│         Supabase                   │
├────────────────────────────────────┤
│ • Postgres + pgvector (embeddings) │
│ • Storage (frames, videos)         │
│ • Auth (RLS policies)              │
└────────────────────────────────────┘
```

## Performance

- **Ingestion**: ~1 minute per 5-minute video @ 1 fps
- **Search**: ~200-500ms for 100k segments
- **Model Loading**: ~2-3 seconds (cached after first load)

## Tech Stack

- **FastAPI** - REST API framework
- **OpenCLIP** - Image/text embeddings (ViT-B-32)
- **pgvector** - Vector similarity search
- **FFmpeg** - Video frame extraction
- **Supabase** - Database + Storage + Auth
- **psycopg** - PostgreSQL driver

## License

MIT

