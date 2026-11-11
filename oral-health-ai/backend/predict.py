"""
OralAI — Single-Image Prediction Script
=========================================
Runs the trained model on one image from the command line.

Usage:
    python predict.py path/to/tooth.jpg
    python predict.py path/to/tooth.png --threshold 0.6
    python predict.py path/to/tooth.webp --model models/oralai_efficientnet_best.pth

Returns top-3 predicted classes with probabilities.
If the top confidence is below --threshold, a low-confidence
safety message is printed instead of a finding.

DISCLAIMER:
    Results are labelled "AI screening finding", not "diagnosis".
    This tool does not replace clinical examination by a dentist.
"""

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms

try:
    import timm
except ImportError:
    raise SystemExit("timm not installed. Run: pip install timm")


# ── Configuration ─────────────────────────────────────────────────────────────
DEFAULT_MODEL      = "./models/oralai_efficientnet_best.pth"
DEFAULT_THRESHOLD  = 0.50    # below this → low-confidence warning
IMG_SIZE           = 224
_MEAN = [0.485, 0.456, 0.406]
_STD  = [0.229, 0.224, 0.225]

# Per-finding urgency levels (used by the frontend)
URGENCY_MAP = {
    "Healthy":               "none",
    "Plaque Accumulation":   "monitor",
    "Enamel Demineralization":"monitor",
    "Dental Caries":         "dentist",
    "Gingivitis":            "dentist",
    "Oral Ulcer":            "dentist",
    "Periodontal Disease":   "urgent",
    "Oral Lesion":           "urgent",
}

SEVERITY_MAP = {
    "Healthy":               "Clear",
    "Plaque Accumulation":   "Mild",
    "Enamel Demineralization":"Mild",
    "Dental Caries":         "Moderate",
    "Gingivitis":            "Moderate",
    "Oral Ulcer":            "Moderate",
    "Periodontal Disease":   "Severe",
    "Oral Lesion":           "Severe",
}


# ════════════════════════════════════════════════════════════════════════════
#  IMAGE QUALITY CHECKS
# ════════════════════════════════════════════════════════════════════════════

def assess_image_quality(img_path: str) -> dict:
    """
    Reject images that are:
      - Too blurry (Laplacian variance < threshold)
      - Too dark (mean pixel < 30)
      - Too bright / overexposed (mean pixel > 230)
      - Below minimum resolution

    Returns a dict with 'pass' bool, 'score' 0-100, and 'reason'.
    """
    try:
        bgr = cv2.imread(str(img_path))
        if bgr is None:
            return {"pass": False, "score": 0, "reason": "Cannot read image file — corrupt or unsupported format."}

        h, w = bgr.shape[:2]
        if h < 64 or w < 64:
            return {"pass": False, "score": 0, "reason": f"Image too small ({w}×{h}). Minimum 64×64 px required."}

        gray  = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        mean  = float(gray.mean())
        blur  = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        score = 100
        reasons = []

        if blur < 80:
            score -= max(0, int((80 - blur) / 80 * 50))
            reasons.append(f"image appears blurry (sharpness score {blur:.0f})")
        if mean < 30:
            score -= 40
            reasons.append(f"image is too dark (mean brightness {mean:.0f}/255)")
        if mean > 230:
            score -= 30
            reasons.append(f"image is overexposed (mean brightness {mean:.0f}/255)")

        score = max(0, min(100, score))
        passed = score >= 40

        return {
            "pass":       passed,
            "score":      score,
            "brightness": round(mean, 1),
            "sharpness":  round(blur, 1),
            "reason":     "; ".join(reasons) if reasons else "Good quality",
        }
    except Exception as exc:
        return {"pass": False, "score": 0, "reason": f"Quality check failed: {exc}"}


# ════════════════════════════════════════════════════════════════════════════
#  MODEL LOADER
# ════════════════════════════════════════════════════════════════════════════

_cached_model      = None
_cached_class_names = None
_cached_img_size   = IMG_SIZE


def load_model(model_path: str):
    global _cached_model, _cached_class_names, _cached_img_size
    if _cached_model is not None:
        return _cached_model, _cached_class_names, _cached_img_size

    if not Path(model_path).exists():
        raise FileNotFoundError(
            f"Model not found: {model_path}\n"
            "Train the model first: python train.py"
        )

    device = torch.device(
        "cuda" if torch.cuda.is_available() else
        "mps"  if torch.backends.mps.is_available() else "cpu"
    )

    ckpt        = torch.load(model_path, map_location=device)
    class_names = ckpt["class_names"]
    img_size    = ckpt.get("img_size", IMG_SIZE)
    num_classes = len(class_names)

    backbone = timm.create_model("efficientnet_b0", pretrained=False,
                                 num_classes=0, global_pool="avg")
    head     = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(backbone.num_features, 512),
        nn.GELU(),
        nn.Dropout(0.2),
        nn.Linear(512, num_classes),
    )
    model = nn.Sequential(backbone, head)
    model.load_state_dict(ckpt["model_state"])
    model.eval().to(device)

    _cached_model       = (model, device)
    _cached_class_names = class_names
    _cached_img_size    = img_size
    return _cached_model, class_names, img_size


# ════════════════════════════════════════════════════════════════════════════
#  INFERENCE
# ════════════════════════════════════════════════════════════════════════════

def predict(
    image_path: str,
    model_path: str  = DEFAULT_MODEL,
    threshold:  float = DEFAULT_THRESHOLD,
) -> dict:
    """
    Run inference on a single image.

    Returns a dict compatible with the OralAI frontend /api/analyze contract:
        image_quality_score, predicted_finding, confidence, top_3_predictions,
        urgency, severity, model_version, disclaimer, low_confidence
    """
    img_path = Path(image_path)
    if not img_path.exists():
        return {"error": f"Image file not found: {image_path}"}

    # ── Quality check ──────────────────────────────────────────────────────────
    quality = assess_image_quality(str(img_path))
    if not quality["pass"]:
        return {
            "image_quality_score":  quality["score"],
            "low_confidence":       True,
            "predicted_finding":    "Unable to assess",
            "confidence":           0.0,
            "top_3_predictions":    [],
            "urgency":              "retake",
            "severity":             "Unknown",
            "model_version":        "oralai-efficientnet-b0-v1",
            "disclaimer":           (
                "Low-quality image detected. "
                f"Issue: {quality['reason']}. "
                "Please retake the image with better lighting and focus, "
                "or consult a dentist directly."
            ),
        }

    # ── Load model ─────────────────────────────────────────────────────────────
    try:
        (model, device), class_names, img_size = load_model(model_path)
    except FileNotFoundError as exc:
        return {"error": str(exc)}

    # ── Preprocess ─────────────────────────────────────────────────────────────
    transform = transforms.Compose([
        transforms.Resize(int(img_size * 1.05)),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(_MEAN, _STD),
    ])

    try:
        img    = Image.open(str(img_path)).convert("RGB")
        tensor = transform(img).unsqueeze(0).to(device)
    except Exception as exc:
        return {"error": f"Image preprocessing failed: {exc}"}

    # ── Inference ──────────────────────────────────────────────────────────────
    with torch.no_grad():
        logits = model(tensor)
        probs  = torch.softmax(logits, dim=1).squeeze().cpu().numpy()

    top3_idx  = probs.argsort()[::-1][:3]
    top3      = [
        {
            "class":      class_names[i],
            "confidence": round(float(probs[i]) * 100, 2),
        }
        for i in top3_idx
    ]

    best_class = class_names[top3_idx[0]]
    best_conf  = float(probs[top3_idx[0]])

    # ── Low-confidence path ────────────────────────────────────────────────────
    if best_conf < threshold:
        return {
            "image_quality_score":  quality["score"],
            "low_confidence":       True,
            "predicted_finding":    "Uncertain",
            "confidence":           round(best_conf * 100, 2),
            "top_3_predictions":    top3,
            "urgency":              "retake",
            "severity":             "Unknown",
            "model_version":        "oralai-efficientnet-b0-v1",
            "disclaimer": (
                f"Low-confidence AI screening result ({best_conf*100:.1f}%). "
                "The model is not sufficiently certain about this image. "
                "Please retake the image following the camera guidance checklist, "
                "or consult a dentist directly. "
                "This is not a final diagnosis."
            ),
        }

    return {
        "image_quality_score":  quality["score"],
        "low_confidence":       False,
        "predicted_finding":    best_class,
        "confidence":           round(best_conf * 100, 2),
        "top_3_predictions":    top3,
        "urgency":              URGENCY_MAP.get(best_class, "monitor"),
        "severity":             SEVERITY_MAP.get(best_class, "Mild"),
        "model_version":        "oralai-efficientnet-b0-v1",
        "disclaimer": (
            "This is an AI screening finding, not a final diagnosis. "
            "Results must be interpreted by a qualified dental professional. "
            "Do not use this tool as a substitute for clinical examination."
        ),
    }


# ════════════════════════════════════════════════════════════════════════════
#  CLI
# ════════════════════════════════════════════════════════════════════════════

def main():
    p = argparse.ArgumentParser(description="OralAI single-image prediction")
    p.add_argument("image",     help="Path to JPEG/PNG/WebP image")
    p.add_argument("--model",   default=DEFAULT_MODEL)
    p.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD,
                   help=f"Confidence threshold (default {DEFAULT_THRESHOLD})")
    args = p.parse_args()

    result = predict(args.image, args.model, args.threshold)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
