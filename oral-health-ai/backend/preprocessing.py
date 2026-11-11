# -*- coding: utf-8 -*-
"""
OralAI — Shared Preprocessing Module
======================================
Single source of truth for every image-handling decision.
Imported by:  train.py  •  app.py  •  test_inference_consistency.py

Public API
----------
MEAN, STD                       ImageNet normalisation constants
build_transform(img_size, split) torchvision Compose for 'train' | 'val' | 'infer'
safe_loader(path)                PIL loader with EXIF fix + RGB (for ImageFolder)
open_image_bytes(raw_bytes)      PIL Image from bytes with EXIF fix + RGB (for Flask)
assess_quality(source)           dict {score, pass, reason, ...}  — path OR bytes

Rules enforced here
-------------------
- EXIF orientation corrected on EVERY image open (training loader AND Flask)
- All images converted to RGB (handles grayscale / RGBA / P-mode inputs)
- No random augmentation in 'val' or 'infer' splits
- Resize is always (img_size, img_size) — square, no CenterCrop, matching train val
- Normalisation is always ImageNet mean/std
- Quality rejection: corrupt / too small / blurry / too dark / overexposed
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Union

# ── PIL ───────────────────────────────────────────────────────────────────────
try:
    from PIL import Image, ImageOps, UnidentifiedImageError
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# ── OpenCV (optional — better blur metric) ───────────────────────────────────
try:
    import cv2
    import numpy as np
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    np = None

# ── PyTorch / torchvision ────────────────────────────────────────────────────
try:
    from torchvision import transforms
    HAS_TV = True
except ImportError:
    HAS_TV = False


# ══════════════════════════════════════════════════════════════════════════════
#  CONSTANTS  (single definition used everywhere)
# ══════════════════════════════════════════════════════════════════════════════

# ImageNet statistics — identical in train.py and app.py previously
MEAN: list[float] = [0.485, 0.456, 0.406]
STD:  list[float] = [0.229, 0.224, 0.225]

# Quality thresholds
_MIN_DIMENSION   = 64      # pixels — reject smaller images
_BLUR_THRESHOLD  = 80.0    # Laplacian variance below this = blurry
_DARK_THRESHOLD  = 30.0    # mean pixel value below this = too dark
_BRIGHT_THRESHOLD= 230.0   # mean pixel value above this = overexposed
_QUALITY_PASS_MIN= 40      # overall score must be >= this to pass


# ══════════════════════════════════════════════════════════════════════════════
#  TRANSFORM FACTORY
# ══════════════════════════════════════════════════════════════════════════════

def build_transform(img_size: int, split: str):
    """
    Return a torchvision Compose pipeline.

    split='train'        — augmentation on (random crop, flip, jitter, rotation)
    split='val'  or
    split='infer'        — deterministic only (resize + normalise)

    The val/infer pipeline is IDENTICAL so that:
      • training validation accuracy reflects live inference behaviour
      • Flask API and evaluate.py use the same pixel values the model saw

    Parameters
    ----------
    img_size : int   e.g. 96  (read from checkpoint)
    split    : str   'train' | 'val' | 'infer'
    """
    if not HAS_TV:
        raise ImportError("torchvision is not installed.")

    if split == "train":
        return transforms.Compose([
            # Slight oversize then random crop — subtle positional jitter
            transforms.Resize((img_size + 10, img_size + 10)),
            transforms.RandomCrop(img_size),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=8),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ])
    else:
        # val / infer — deterministic, no randomness
        return transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ])


# ══════════════════════════════════════════════════════════════════════════════
#  IMAGE OPENERS  (both apply EXIF fix + RGB conversion)
# ══════════════════════════════════════════════════════════════════════════════

def _fix(img: "Image.Image") -> "Image.Image":
    """Apply EXIF orientation correction then convert to RGB."""
    img = ImageOps.exif_transpose(img)   # corrects 90/180/270° phone rotations
    return img.convert("RGB")


def safe_loader(path: Union[str, Path]) -> "Image.Image":
    """
    PIL image loader for torchvision ImageFolder.

    Replaces torchvision's default_loader.
    - Applies EXIF orientation fix (phone photos stored rotated)
    - Converts to RGB (handles grayscale, RGBA, palette-mode images)
    - Returns a blank 96×96 grey image on corrupt/unreadable files so the
      batch does not crash — same contract as the old _safe_loader in train.py
    """
    try:
        img = Image.open(str(path))
        return _fix(img)
    except (UnidentifiedImageError, OSError, Exception):
        return Image.new("RGB", (96, 96), (128, 128, 128))


def open_image_bytes(raw_bytes: bytes) -> "Image.Image":
    """
    Open an image from raw bytes (e.g. Flask request.files.read()).
    - Applies EXIF orientation fix
    - Converts to RGB
    Raises ValueError if the bytes cannot be decoded.
    """
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        return _fix(img)
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError(f"Cannot decode image: {exc}") from exc


# ══════════════════════════════════════════════════════════════════════════════
#  IMAGE QUALITY ASSESSMENT
# ══════════════════════════════════════════════════════════════════════════════

def assess_quality(source: Union[bytes, str, Path]) -> dict:
    """
    Evaluate image quality from raw bytes, a file path, or a Path object.

    Returns
    -------
    dict with keys:
        score   int  0–100
        pass    bool True if score >= 40
        reason  str  human-readable explanation ('' if Good)
        brightness float
        sharpness  float

    Strategy
    ---------
    1. Decode with PIL (handles JPEG, PNG, WebP, BMP)
    2. Convert to grayscale for brightness + sharpness checks
    3. Use OpenCV Laplacian for sharpness if available, else PIL approximation
    """
    try:
        # ── Decode ────────────────────────────────────────────────────────────
        if isinstance(source, (bytes, bytearray)):
            try:
                pil_img = Image.open(io.BytesIO(source)).convert("L")  # grayscale
            except Exception:
                return {"score": 0, "pass": False, "reason": "Cannot decode image",
                        "brightness": 0.0, "sharpness": 0.0}
        else:
            try:
                pil_img = Image.open(str(source)).convert("L")
            except Exception:
                return {"score": 0, "pass": False, "reason": f"Cannot open {source}",
                        "brightness": 0.0, "sharpness": 0.0}

        # ── Minimum resolution ────────────────────────────────────────────────
        w, h = pil_img.size
        if h < _MIN_DIMENSION or w < _MIN_DIMENSION:
            return {"score": 0, "pass": False,
                    "reason": f"Resolution too low ({w}x{h}px, minimum {_MIN_DIMENSION}px)",
                    "brightness": 0.0, "sharpness": 0.0}

        # ── Brightness via PIL ────────────────────────────────────────────────
        import statistics
        pixels    = list(pil_img.getdata())
        brightness = sum(pixels) / len(pixels)

        # ── Sharpness ─────────────────────────────────────────────────────────
        if HAS_CV2:
            arr      = np.array(pil_img, dtype=np.float64)
            sharpness = float(cv2.Laplacian(arr, cv2.CV_64F).var())
        else:
            # Fallback: variance of pixel values as crude sharpness proxy
            mean_px   = brightness
            sharpness = float(sum((p - mean_px) ** 2 for p in pixels) / len(pixels))
            sharpness = min(sharpness, 1000.0)  # cap for normalisation

        # ── Score ─────────────────────────────────────────────────────────────
        score   = 100
        reasons = []

        if sharpness < _BLUR_THRESHOLD:
            deduction = max(0, int((_BLUR_THRESHOLD - sharpness) / _BLUR_THRESHOLD * 50))
            score    -= deduction
            reasons.append(f"blurry (sharpness={sharpness:.0f})")

        if brightness < _DARK_THRESHOLD:
            score   -= 40
            reasons.append(f"too dark (brightness={brightness:.0f})")

        if brightness > _BRIGHT_THRESHOLD:
            score   -= 30
            reasons.append(f"overexposed (brightness={brightness:.0f})")

        score = max(0, min(100, score))
        return {
            "score":      score,
            "pass":       score >= _QUALITY_PASS_MIN,
            "reason":     "; ".join(reasons) if reasons else "Good",
            "brightness": round(brightness, 1),
            "sharpness":  round(sharpness,  1),
        }

    except Exception as exc:
        # Never crash the caller — return a permissive result with a warning
        return {"score": 50, "pass": True,
                "reason": f"Quality check error: {exc}",
                "brightness": 0.0, "sharpness": 0.0}


# ══════════════════════════════════════════════════════════════════════════════
#  SELF-TEST
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys
    print("OralAI preprocessing.py — self-test")
    print(f"  PIL      : {'OK' if HAS_PIL else 'MISSING'}")
    print(f"  OpenCV   : {'OK' if HAS_CV2 else 'not installed (optional)'}")
    print(f"  torchvision: {'OK' if HAS_TV else 'MISSING'}")
    print(f"  MEAN     : {MEAN}")
    print(f"  STD      : {STD}")

    for split in ("train", "val", "infer"):
        t = build_transform(96, split)
        print(f"  transform({split}): {[type(s).__name__ for s in t.transforms]}")

    # Quality check on a synthetic image
    img  = Image.new("RGB", (128, 128), (128, 128, 128))
    buf  = io.BytesIO()
    img.save(buf, format="JPEG")
    q    = assess_quality(buf.getvalue())
    print(f"  quality(synthetic): score={q['score']}  pass={q['pass']}  reason='{q['reason']}'")
    print("  OK")
