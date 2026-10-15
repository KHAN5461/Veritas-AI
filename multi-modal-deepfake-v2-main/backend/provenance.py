import os
import re
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger("veritas.provenance")

# Common generator software signatures and prompt metadata tags
AI_SIGNATURES = [
    (re.compile(rb"midjourney", re.IGNORECASE), "Midjourney Synthetic Image"),
    (re.compile(rb"stable diffusion|diffusers|comfyui|automatic1111", re.IGNORECASE), "Stable Diffusion / ComfyUI Pipeline"),
    (re.compile(rb"dall[- ]?e", re.IGNORECASE), "OpenAI DALL-E Generative Model"),
    (re.compile(rb"adobe firefly", re.IGNORECASE), "Adobe Firefly Generative AI"),
    (re.compile(rb"kling[ -]?ai|kling", re.IGNORECASE), "Kling Generative Video"),
    (re.compile(rb"runway[ -]?gen|runwayml", re.IGNORECASE), "RunwayML Gen Series"),
    (re.compile(rb"sora", re.IGNORECASE), "OpenAI Sora Video Engine"),
    (re.compile(rb"c2pa|jumbf|urn:c2pa", re.IGNORECASE), "C2PA Content Credentials Manifest"),
    (re.compile(rb"synthid", re.IGNORECASE), "Google SynthID Digital Watermark Container"),
    (re.compile(rb"elevenlabs", re.IGNORECASE), "ElevenLabs Neural Audio Synthesizer"),
    (re.compile(rb"flux\.1|black-forest-labs", re.IGNORECASE), "FLUX.1 Diffusion Model"),
]

CAMERA_SIGNATURES = [
    (re.compile(rb"canon|nikon|sony|fujifilm|leica|panasonic|apple|samsung", re.IGNORECASE), "Hardware Camera Sensor Metadata"),
]

def scan_file_provenance(file_path: str) -> Dict[str, Any]:
    """Fast binary inspection of headers, EXIF, XMP and container metadata for AI generative tags and provenance."""
    if not os.path.exists(file_path):
        return {"has_ai_provenance": False, "ai_signatures": [], "has_c2pa": False, "has_camera_metadata": False}

    detected_ai = []
    has_c2pa = False
    has_camera = False

    try:
        # Read the first 256KB and last 64KB where EXIF, XMP, JUMBF, and container metadata reside
        file_size = os.path.getsize(file_path)
        with open(file_path, "rb") as f:
            head_bytes = f.read(min(262144, file_size))
            tail_bytes = b""
            if file_size > 262144:
                f.seek(max(0, file_size - 65536))
                tail_bytes = f.read()

        combined_chunk = head_bytes + tail_bytes

        # Test AI signatures
        for pattern, label in AI_SIGNATURES:
            if pattern.search(combined_chunk):
                if "c2pa" in label.lower():
                    has_c2pa = True
                else:
                    detected_ai.append(label)

        # Test hardware camera signatures
        for pattern, label in CAMERA_SIGNATURES:
            if pattern.search(combined_chunk):
                has_camera = True
                break

    except Exception as e:
        logger.debug("Provenance scan error: %s", e)

    return {
        "has_ai_provenance": len(detected_ai) > 0,
        "ai_signatures": list(set(detected_ai)),
        "has_c2pa": has_c2pa,
        "has_camera_metadata": has_camera
    }
