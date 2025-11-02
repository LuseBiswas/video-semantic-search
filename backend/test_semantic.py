"""Test Sentence Transformers semantic similarity."""

from app.utils.openai_filter import calculate_text_similarity

# Test cases
test_cases = [
    ("dog", "a brown dog is standing in the snow"),
    ("dog on snow", "a brown dog is standing in the snow"),
    ("cat", "a couple of cats sleeping on a bed"),
    ("cat laying on bed", "a couple of cats sleeping on a bed"),
    ("dog", "cat"),  # Should be low
    ("sunset", "golden hour"),  # Should be high
]

print("🧪 Testing Sentence Transformers Semantic Similarity\n")
print("="*60)

for query, caption in test_cases:
    score = calculate_text_similarity(query, caption)
    badge = "✅" if score >= 0.7 else "⚠️" if score >= 0.5 else "❌"
    print(f"\n{badge} Query: '{query}'")
    print(f"   Caption: '{caption}'")
    print(f"   Similarity: {score:.3f} ({score*100:.1f}%)")
    print("-"*60)

print("\n" + "="*60)
print("✅ = Good match (≥70%)")
print("⚠️  = Okay match (50-70%)")
print("❌ = Poor match (<50%)")

