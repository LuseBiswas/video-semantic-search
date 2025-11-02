"""Image captioning utilities using BLIP."""

import torch
from PIL import Image
from transformers import BlipProcessor, BlipForConditionalGeneration
from typing import Optional


# Global caption model (lazy-loaded)
_caption_processor: Optional[BlipProcessor] = None
_caption_model: Optional[BlipForConditionalGeneration] = None


def get_caption_model(device: str = "cpu"):
    """
    Get or create global BLIP caption model.
    
    Args:
        device: Device to run on ("cpu" or "cuda")
    
    Returns:
        tuple of (processor, model)
    """
    global _caption_processor, _caption_model
    
    if _caption_processor is None or _caption_model is None:
        print("Loading BLIP captioning model (Salesforce/blip-image-captioning-base)...")
        _caption_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        _caption_model = BlipForConditionalGeneration.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        ).to(device)
        _caption_model.eval()
        print("✅ Caption model loaded")
    
    return _caption_processor, _caption_model


def generate_caption(image: Image.Image, device: str = "cpu") -> str:
    """
    Generate caption for an image.
    
    Args:
        image: PIL Image (RGB)
        device: Device to run on
    
    Returns:
        Caption string
    """
    processor, model = get_caption_model(device)
    
    with torch.no_grad():
        # Process image
        inputs = processor(image, return_tensors="pt").to(device)
        
        # Generate caption
        outputs = model.generate(
            **inputs,
            max_length=50,
            num_beams=5,
            early_stopping=True
        )
        
        # Decode caption
        caption = processor.decode(outputs[0], skip_special_tokens=True)
    
    return caption


def generate_captions_batch(images: list[Image.Image], device: str = "cpu") -> list[str]:
    """
    Generate captions for multiple images in batch.
    
    Args:
        images: List of PIL Images
        device: Device to run on
    
    Returns:
        List of caption strings
    """
    processor, model = get_caption_model(device)
    
    with torch.no_grad():
        # Process images in batch
        inputs = processor(images, return_tensors="pt", padding=True).to(device)
        
        # Generate captions
        outputs = model.generate(
            **inputs,
            max_length=50,
            num_beams=5,
            early_stopping=True
        )
        
        # Decode all captions
        captions = [
            processor.decode(output, skip_special_tokens=True)
            for output in outputs
        ]
    
    return captions

