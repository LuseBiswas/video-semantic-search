"""Test OpenAI semantic similarity."""

import os
from app.utils.openai_filter import calculate_text_similarity

# Test cases
test_cases = [
    ("dog", "a brown dog is standing in the snow"),
    ("cat", "a couple of cats sleeping on a bed"),
    ("dog", "cat"),  # Should be very low
    ("sunset", "golden hour"),  # Should be high
]

print("🧪 Testing OpenAI Semantic Similarity\n")
print("="*60)

for query, caption in test_cases:
    score = calculate_text_similarity(query, caption)
    print(f"\nQuery: '{query}'")
    print(f"Caption: '{caption}'")
    print(f"Similarity: {score:.3f} ({score*100:.1f}%)")
    print("-"*60)

