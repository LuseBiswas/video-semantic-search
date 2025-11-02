"""OpenCLIP embedding utilities for image and text encoding."""

import numpy as np
import open_clip
import torch
from PIL import Image
from typing import Optional


class EmbeddingModel:
    """Singleton OpenCLIP model for encoding images and text."""
    
    def __init__(
        self,
        model_name: str = "ViT-B-32",
        pretrained: str = "openai",
        device: str = "cpu"
    ):
        """
        Initialize OpenCLIP model.
        
        Args:
            model_name: Model architecture (e.g., "ViT-B-32", "ViT-B-16")
            pretrained: Pretrained weights (e.g., "openai", "laion2b_s34b_b79k")
            device: Device to run on ("cpu" or "cuda")
        """
        self.device = device
        self.model_name = model_name
        self.pretrained = pretrained
        
        print(f"Loading OpenCLIP model: {model_name} ({pretrained})...")
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            model_name,
            pretrained=pretrained,
            device=device
        )
        self.tokenizer = open_clip.get_tokenizer(model_name)
        self.model.eval()
        
        # Get embedding dimension
        with torch.no_grad():
            dummy_text = self.tokenizer(["test"])
            self.emb_dim = self.model.encode_text(dummy_text).shape[-1]
        
        print(f"✅ Model loaded. Embedding dim: {self.emb_dim}")
    
    def encode_image(self, image: Image.Image) -> np.ndarray:
        """
        Encode PIL image to unit-normalized embedding vector.
        
        Args:
            image: PIL Image (RGB)
        
        Returns:
            numpy array of shape (emb_dim,), L2-normalized
        """
        with torch.no_grad():
            # Preprocess and add batch dimension
            image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)
            
            # Encode and normalize
            features = self.model.encode_image(image_tensor)
            features = features / features.norm(dim=-1, keepdim=True)
            
            # Convert to numpy
            embedding = features.cpu().numpy().squeeze()
        
        return embedding
    
    def encode_text(self, text: str) -> np.ndarray:
        """
        Encode text query to unit-normalized embedding vector.
        
        Args:
            text: Query string
        
        Returns:
            numpy array of shape (emb_dim,), L2-normalized
        """
        with torch.no_grad():
            # Tokenize
            text_tokens = self.tokenizer([text]).to(self.device)
            
            # Encode and normalize
            features = self.model.encode_text(text_tokens)
            features = features / features.norm(dim=-1, keepdim=True)
            
            # Convert to numpy
            embedding = features.cpu().numpy().squeeze()
        
        return embedding
    
    def encode_images_batch(self, images: list[Image.Image]) -> np.ndarray:
        """
        Encode multiple images in a batch (more efficient).
        
        Args:
            images: List of PIL Images
        
        Returns:
            numpy array of shape (len(images), emb_dim), L2-normalized
        """
        with torch.no_grad():
            # Stack preprocessed images
            image_tensors = torch.stack([
                self.preprocess(img) for img in images
            ]).to(self.device)
            
            # Encode and normalize
            features = self.model.encode_image(image_tensors)
            features = features / features.norm(dim=-1, keepdim=True)
            
            # Convert to numpy
            embeddings = features.cpu().numpy()
        
        return embeddings


# Global model instance (lazy-loaded)
_model: Optional[EmbeddingModel] = None


def get_model(
    model_name: str = "ViT-B-32",
    pretrained: str = "openai",
    device: str = "cpu"
) -> EmbeddingModel:
    """
    Get or create global embedding model instance.
    
    Args:
        model_name: Model architecture
        pretrained: Pretrained weights
        device: Device to run on
    
    Returns:
        EmbeddingModel instance
    """
    global _model
    
    if _model is None:
        _model = EmbeddingModel(
            model_name=model_name,
            pretrained=pretrained,
            device=device
        )
    
    return _model


def encode_image(image: Image.Image) -> np.ndarray:
    """Convenience function: encode single image."""
    model = get_model()
    return model.encode_image(image)


def encode_text(text: str) -> np.ndarray:
    """Convenience function: encode text query."""
    model = get_model()
    return model.encode_text(text)


def encode_images_batch(images: list[Image.Image]) -> np.ndarray:
    """Convenience function: encode batch of images."""
    model = get_model()
    return model.encode_images_batch(images)

