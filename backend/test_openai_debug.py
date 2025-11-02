"""Debug OpenAI embeddings."""

import numpy as np
from openai import OpenAI
from app.core.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

# Test case
query = "dog"
caption = "a brown dog is standing in the snow"

print("🔍 Debugging OpenAI Embeddings\n")
print("="*60)
print(f"Query: '{query}'")
print(f"Caption: '{caption}'")
print("-"*60)

# Get embeddings
response = client.embeddings.create(
    model="text-embedding-3-small",
    input=[query, caption]
)

query_emb = np.array(response.data[0].embedding)
caption_emb = np.array(response.data[1].embedding)

print(f"\nQuery embedding shape: {query_emb.shape}")
print(f"Caption embedding shape: {caption_emb.shape}")
print(f"Query embedding first 5 values: {query_emb[:5]}")
print(f"Caption embedding first 5 values: {caption_emb[:5]}")

# Check if normalized
query_norm = np.linalg.norm(query_emb)
caption_norm = np.linalg.norm(caption_emb)
print(f"\nQuery norm: {query_norm:.6f}")
print(f"Caption norm: {caption_norm:.6f}")

# Calculate dot product (for normalized vectors, this IS the cosine similarity)
dot_product = np.dot(query_emb, caption_emb)
print(f"\nDot product: {dot_product:.6f}")

# Manual cosine similarity
cosine_sim = dot_product / (query_norm * caption_norm)
print(f"Cosine similarity (manual): {cosine_sim:.6f} ({cosine_sim*100:.1f}%)")

print("\n" + "="*60)
print("✅ Expected: ~0.80-0.90 (80-90%)")
print(f"❌ Got: {cosine_sim:.3f} ({cosine_sim*100:.1f}%)")

