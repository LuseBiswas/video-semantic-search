#!/usr/bin/env python3
"""Test OpenCLIP embeddings."""

import numpy as np
from PIL import Image
from worker.utils.embeddings import get_model, encode_text, encode_image


def test_model_loading():
    """Test model loads successfully."""
    print("=" * 60)
    print("Test 1: Model Loading")
    print("=" * 60)
    
    model = get_model()
    print(f"✅ Model loaded: {model.model_name}")
    print(f"✅ Pretrained: {model.pretrained}")
    print(f"✅ Embedding dimension: {model.emb_dim}")
    print(f"✅ Device: {model.device}")
    
    return model


def test_text_encoding():
    """Test text encoding."""
    print("\n" + "=" * 60)
    print("Test 2: Text Encoding")
    print("=" * 60)
    
    queries = ["sunset", "golden hour", "mountain landscape", "ocean waves"]
    
    for query in queries:
        emb = encode_text(query)
        norm = np.linalg.norm(emb)
        
        print(f"\n'{query}':")
        print(f"  Shape: {emb.shape}")
        print(f"  L2 norm: {norm:.6f} (should be ~1.0)")
        print(f"  Sample values: [{emb[0]:.4f}, {emb[1]:.4f}, {emb[2]:.4f}, ...]")
        
        assert emb.shape[0] in [512, 768], f"Unexpected dimension: {emb.shape}"
        assert 0.99 < norm < 1.01, f"Not unit-normalized: {norm}"
    
    print("\n✅ All text encodings successful")


def test_image_encoding():
    """Test image encoding with synthetic images."""
    print("\n" + "=" * 60)
    print("Test 3: Image Encoding")
    print("=" * 60)
    
    # Create test images
    test_images = [
        ("Red image", Image.new("RGB", (224, 224), color=(255, 0, 0))),
        ("Green image", Image.new("RGB", (224, 224), color=(0, 255, 0))),
        ("Blue image", Image.new("RGB", (224, 224), color=(0, 0, 255))),
    ]
    
    for name, img in test_images:
        emb = encode_image(img)
        norm = np.linalg.norm(emb)
        
        print(f"\n{name}:")
        print(f"  Shape: {emb.shape}")
        print(f"  L2 norm: {norm:.6f} (should be ~1.0)")
        print(f"  Sample values: [{emb[0]:.4f}, {emb[1]:.4f}, {emb[2]:.4f}, ...]")
        
        assert emb.shape[0] in [512, 768], f"Unexpected dimension: {emb.shape}"
        assert 0.99 < norm < 1.01, f"Not unit-normalized: {norm}"
    
    print("\n✅ All image encodings successful")


def test_similarity():
    """Test semantic similarity (cosine similarity)."""
    print("\n" + "=" * 60)
    print("Test 4: Semantic Similarity")
    print("=" * 60)
    
    # Encode related and unrelated queries
    sunset_emb = encode_text("sunset")
    golden_hour_emb = encode_text("golden hour")
    mountain_emb = encode_text("mountain")
    
    # Cosine similarity (dot product of normalized vectors)
    sim_sunset_golden = np.dot(sunset_emb, golden_hour_emb)
    sim_sunset_mountain = np.dot(sunset_emb, mountain_emb)
    
    print(f"\nSimilarity scores (0=unrelated, 1=identical):")
    print(f"  'sunset' ↔ 'golden hour': {sim_sunset_golden:.4f}")
    print(f"  'sunset' ↔ 'mountain':     {sim_sunset_mountain:.4f}")
    
    # Related queries should be more similar
    assert sim_sunset_golden > sim_sunset_mountain, \
        "Expected 'sunset' to be more similar to 'golden hour' than 'mountain'"
    
    print(f"\n✅ Semantic similarity works as expected")
    print(f"   ('sunset' is more similar to 'golden hour' than 'mountain')")


def test_batch_encoding():
    """Test batch image encoding."""
    print("\n" + "=" * 60)
    print("Test 5: Batch Encoding")
    print("=" * 60)
    
    # Create batch of images
    images = [
        Image.new("RGB", (224, 224), color=(255, 0, 0)),
        Image.new("RGB", (224, 224), color=(0, 255, 0)),
        Image.new("RGB", (224, 224), color=(0, 0, 255)),
    ]
    
    model = get_model()
    embeddings = model.encode_images_batch(images)
    
    print(f"\nBatch shape: {embeddings.shape}")
    print(f"Expected: (3, {model.emb_dim})")
    
    for i, emb in enumerate(embeddings):
        norm = np.linalg.norm(emb)
        print(f"  Image {i+1} norm: {norm:.6f}")
        assert 0.99 < norm < 1.01, f"Not unit-normalized: {norm}"
    
    print("\n✅ Batch encoding successful")


def main():
    """Run all tests."""
    try:
        test_model_loading()
        test_text_encoding()
        test_image_encoding()
        test_similarity()
        test_batch_encoding()
        
        print("\n" + "=" * 60)
        print("🎉 All tests passed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())

