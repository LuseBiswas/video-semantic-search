# 🚀 Video Semantic Search Enhancements

## ✨ New Feature: Image Captioning with BLIP

We've enhanced the video ingestion pipeline to automatically generate text descriptions for every frame using BLIP (Bootstrapping Language-Image Pre-training).

---

## 📦 Installation

### 1. Install New Dependencies

```bash
cd backend
pip install transformers==4.46.3 accelerate==1.2.1
```

Or reinstall from requirements.txt:
```bash
pip install -r requirements.txt
```

### 2. Verify Installation

```bash
python -c "from transformers import BlipProcessor, BlipForConditionalGeneration; print('✅ BLIP installed successfully')"
```

---

## 🎯 What This Enhancement Does

### During Video Ingestion

**Before:**
- ❌ Extracted frames
- ❌ Generated embeddings only
- ❌ No text descriptions

**After:**
- ✅ Extracts frames
- ✅ Generates embeddings (OpenCLIP)
- ✅ **NEW: Generates captions (BLIP)**
- ✅ Stores captions in database

### Example Captions Generated

| Frame | BLIP Caption |
|-------|--------------|
| ![Beach](docs/beach.jpg) | "a person sitting on the beach watching the sunset" |
| ![City](docs/city.jpg) | "a city street with cars and buildings" |
| ![Dog](docs/dog.jpg) | "a dog playing with a ball in the grass" |

---

## 🔍 Enhanced Search Logs

Now when you search, the backend console shows **what the AI sees**:

```
============================================================
🔍 SEARCH: 'dragon'
============================================================
Total results from DB: 9

📊 Top 10 Results (sorted by score):
  ✗ #1: score=0.4823 (48.2%) at 0:01
       Caption: "a person sitting on the beach watching the sunset"
       Video: 09bdfeb2...
       Quality: POOR

  ✗ #2: score=0.4156 (41.6%) at 0:02
       Caption: "there is a view of the ocean from the shore"
       Video: 09bdfeb2...
       Quality: POOR

✅ Results above threshold (0.5): 0
============================================================
```

**Now you can see WHY "dragon" doesn't match a beach video!**

---

## 🎨 Frontend Updates

Search results now display AI-generated captions:

```jsx
┌─────────────────────────────────┐
│  [Beach Sunset Thumbnail]       │
│                         85%      │
└─────────────────────────────────┘
  "a person sitting on the beach 
   watching the sunset"
  
  Video 09bdfeb2...
  At 0:01
                          [Play]
```

---

## ⚡ Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| **Processing Time** | ~1 min / 5 min video | ~2 min / 5 min video |
| **Models Loaded** | 1 (OpenCLIP) | 2 (OpenCLIP + BLIP) |
| **Memory Usage** | ~2 GB | ~3.5 GB |
| **Database Storage** | Embeddings only | Embeddings + Captions |

**Trade-off:** Slightly longer processing for **much better debugging** and **richer results**.

---

## 🛠️ Technical Details

### Models Used

1. **OpenCLIP (ViT-B-32)**
   - Purpose: Generate 512-dim embeddings
   - Used for: Semantic search
   - Size: ~350 MB

2. **BLIP (Salesforce/blip-image-captioning-base)**
   - Purpose: Generate text captions
   - Used for: Describing frame contents
   - Size: ~990 MB

### Batch Processing

Both models process frames in batches for efficiency:

```python
# Process 10 frames at once
embeddings = model.encode_images_batch(frames)      # OpenCLIP
captions = generate_captions_batch(frames)          # BLIP
```

### Database Schema

Captions are stored in the `segments.caption` JSONB column:

```json
{
  "text": "a person sitting on the beach watching the sunset"
}
```

---

## 🧪 Testing

### Test the Ingestion Pipeline

```bash
cd backend
python -m worker.ingest_video /path/to/video.mp4 <video_id> <user_id>
```

You should see:
```
🤖 Step 4: Loading AI models...
   ✅ OpenCLIP model loaded: ViT-B-32
   ✅ BLIP captioning model loaded
```

### Verify Captions in Database

```bash
python test_captions.py
```

---

## 🚀 Next Steps

Now that we have captions, we can:

1. ✅ **Debug search results** - See exactly what the AI thinks is in each frame
2. 🔄 **Improve search** - Combine text embeddings + visual embeddings
3. 🎯 **Add filters** - Search by caption keywords
4. 📊 **Analytics** - Analyze video content automatically

---

## 📝 Code Changes

### New Files
- `backend/worker/utils/captioning.py` - BLIP captioning utilities

### Modified Files
- `backend/requirements.txt` - Added transformers + accelerate
- `backend/worker/ingest_video.py` - Integrated captioning
- `backend/app/routers/search.py` - Return captions in search results
- `frontend/src/pages/Search.jsx` - Display captions in UI

---

## ❓ FAQ

**Q: Will old videos without captions still work?**
A: Yes! The system handles missing captions gracefully.

**Q: Can I disable captioning to speed up processing?**
A: Yes, comment out the captioning calls in `ingest_video.py`.

**Q: Can I use a different caption model?**
A: Yes! Edit `captioning.py` to use BLIP-2, Florence-2, or LLaVA.

**Q: Do I need a GPU?**
A: No, but it's **highly recommended**. CPU processing will be ~10x slower.

---

## 🎉 Summary

You now have a **fully enhanced** video search system that:
- ✅ Understands visual content (OpenCLIP embeddings)
- ✅ Describes what it sees (BLIP captions)
- ✅ Shows detailed search logs
- ✅ Displays captions in the UI
- ✅ Helps debug irrelevant results

**No more mystery results!** You can now see exactly what the AI is finding.

