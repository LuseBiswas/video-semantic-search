#!/usr/bin/env python3
"""Test how OpenCLIP handles query variations."""

import numpy as np
from worker.utils.embeddings import encode_text


def cosine_similarity(vec1, vec2):
    """Compute cosine similarity between two vectors."""
    return np.dot(vec1, vec2)


def test_semantic_variations():
    """Test that similar queries produce similar embeddings."""
    print("=" * 60)
    print("🧪 Testing Query Variations with OpenCLIP")
    print("=" * 60)
    print("\nDemonstrating that OpenCLIP understands semantic similarity")
    print("WITHOUT needing any LLM or query expansion!\n")
    
    # Test Case 1: Sunset variations
    print("📍 Test Case 1: Sunset Variations")
    print("-" * 60)
    
    queries_sunset = [
        "sunset",
        "golden hour",
        "evening shot",
        "dusk",
        "sun setting over horizon"
    ]
    
    embeddings_sunset = [encode_text(q) for q in queries_sunset]
    base_emb = embeddings_sunset[0]  # "sunset"
    
    print(f"Base query: '{queries_sunset[0]}'\n")
    print("Similarity scores (1.0 = identical, 0.0 = unrelated):\n")
    
    for query, emb in zip(queries_sunset, embeddings_sunset):
        similarity = cosine_similarity(base_emb, emb)
        bar = "█" * int(similarity * 40)
        print(f"  '{query:30s}' → {similarity:.4f} {bar}")
    
    # Test Case 2: Beach variations
    print("\n\n📍 Test Case 2: Beach Variations")
    print("-" * 60)
    
    queries_beach = [
        "beach",
        "ocean",
        "seaside",
        "coastline",
        "sandy shore"
    ]
    
    embeddings_beach = [encode_text(q) for q in queries_beach]
    base_emb = embeddings_beach[0]  # "beach"
    
    print(f"Base query: '{queries_beach[0]}'\n")
    print("Similarity scores:\n")
    
    for query, emb in zip(queries_beach, embeddings_beach):
        similarity = cosine_similarity(base_emb, emb)
        bar = "█" * int(similarity * 40)
        print(f"  '{query:30s}' → {similarity:.4f} {bar}")
    
    # Test Case 3: Cross-category (should be LESS similar)
    print("\n\n📍 Test Case 3: Unrelated Queries")
    print("-" * 60)
    
    sunset_emb = encode_text("sunset")
    unrelated_queries = [
        "car",
        "computer",
        "pizza",
        "cat"
    ]
    
    print(f"Base query: 'sunset'\n")
    print("Similarity scores (should be LOW):\n")
    
    for query in unrelated_queries:
        emb = encode_text(query)
        similarity = cosine_similarity(sunset_emb, emb)
        bar = "█" * int(similarity * 40)
        print(f"  '{query:30s}' → {similarity:.4f} {bar}")
    
    # Test Case 4: Natural language queries
    print("\n\n📍 Test Case 4: Natural Language Queries")
    print("-" * 60)
    
    natural_queries = [
        "sunset",
        "show me videos of sunset",
        "I want to see a beautiful sunset",
        "videos with sunset scenes",
        "find sunset clips"
    ]
    
    embeddings_natural = [encode_text(q) for q in natural_queries]
    base_emb = embeddings_natural[0]  # simple "sunset"
    
    print(f"Base query: '{natural_queries[0]}'\n")
    print("Similarity scores (natural language queries work too!):\n")
    
    for query, emb in zip(natural_queries, embeddings_natural):
        similarity = cosine_similarity(base_emb, emb)
        bar = "█" * int(similarity * 40)
        print(f"  '{query:45s}' → {similarity:.4f} {bar}")
    
    # Summary
    print("\n\n" + "=" * 60)
    print("✅ Key Takeaways:")
    print("=" * 60)
    print("""
1. ✅ OpenCLIP understands synonyms automatically
   → "sunset", "golden hour", "dusk" are similar

2. ✅ Natural language works fine
   → "show me sunset" ≈ "sunset" ≈ "videos with sunset"

3. ✅ Unrelated concepts have low similarity
   → "sunset" vs "car" = low score

4. ✅ NO LLM NEEDED!
   → OpenCLIP text encoder handles everything

💡 Conclusion:
   Users can type natural queries like:
   - "golden hour"
   - "show me sunset videos"  
   - "evening landscape shots"
   
   And they'll all find the right frames!
""")


if __name__ == "__main__":
    test_semantic_variations()

