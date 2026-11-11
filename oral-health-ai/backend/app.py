"""
OralAI — Flask AI Backend  v3.0  (PyTorch + EfficientNetB0)
=============================================================
Replaces the TensorFlow backend with a PyTorch model loaded
from models/oralai_efficientnet_best.pth (produced by train.py).

Falls back to weighted random mock predictions when no model file
exists and DEMO_MODE=1 (default for development).

Quick start:
    cd oral-health-ai\\backend
    python -m venv .venv
    .venv\\Scripts\\activate
    pip install -r requirements.txt
    python app.py                     # demo mode (no model needed)
    python app.py                     # real mode after training

Endpoints
---------
GET  /                    → friendly status HTML page
GET  /health              → health check (frontend polls this)
GET  /api/health          → alias for /health
POST /api/analyze         → analyse uploaded dental image
GET  /api/scans           → list in-memory scan history
GET  /api/scans/<id>      → single scan
GET  /api/sensors         → latest sensor readings
POST /api/sensors/update  → push new sensor values
GET  /api/models          → list available models
POST /api/demo/simulate   → randomise sensor values

Frontend API contract (fields expected by upload.js):
    scanId, score, confidence, attentionAreas, findings[],
    diagnosis, processingTime, model, imageQuality,
    sensorFusion, recommendations[], severity, demoMode,
    timestamp, sensors{}, scanType

Environment variables (.env or shell exports):
    PORT               5000
    FLASK_DEBUG        0
    SECRET_KEY         change-me
    ALLOWED_ORIGINS    http://localhost:8080,http://127.0.0.1:8080
    MODEL_PATH         models/oralai_efficientnet_best.pth
    CLASS_NAMES_PATH   models/class_names.json
    IMG_SIZE           224
    CONFIDENCE_THRESHOLD  0.50
    DEMO_MODE          1   ← set 0 to require real model
    RATE_LIMIT_PER_MIN 20
    MAX_SCANS          100
    LOG_LEVEL          INFO
"""

import io
import json
import logging
import os
import random
import time
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

# ── Load .env ────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

from flask import Flask, abort, jsonify, request
from flask_cors import CORS

# ── Shared preprocessing — single source of truth for transforms/quality ──────
import preprocessing as _pp

# ── PIL (image decoding fallback flag) ───────────────────────────────────────
try:
    import numpy as np
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    np = None

# ── OpenCV (kept for direct CV2 work if needed elsewhere) ────────────────────
try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

# ── PyTorch ──────────────────────────────────────────────────────────────────
try:
    import torch
    import torch.nn as nn
    from torchvision import transforms
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

try:
    import timm
    HAS_TIMM = True
except ImportError:
    HAS_TIMM = False

# ── Flask app ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "oralai-dev-key-change-in-prod")

_raw_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5500,http://127.0.0.1:5500",
)
_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
CORS(app, resources={r"/*": {"origins": _origins}}, supports_credentials=False)

logging.basicConfig(
    level=getattr(logging, os.environ.get("LOG_LEVEL", "INFO"), logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
log = logging.getLogger(__name__)

# ── Config ───────────────────────────────────────────────────────────────────
IMG_SIZE             = int(os.environ.get("IMG_SIZE", 224))
MAX_SCANS            = int(os.environ.get("MAX_SCANS", 100))
RATE_LIMIT_PER_MIN   = int(os.environ.get("RATE_LIMIT_PER_MIN", 20))
DEMO_MODE            = os.environ.get("DEMO_MODE", "0") == "1"
CONF_THRESHOLD       = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.30"))

# Per-class minimum confidence to show a finding.
# LOWER thresholds so disease findings fire even at moderate confidence.
# For severe diseases (caries, periodontal) we want to catch them early.
_CLASS_MIN_CONF = {
    "healthy":                 0.35,   # healthy needs higher bar to claim all-clear
    "plaque":                  0.20,   # plaque: fire at low confidence — low risk of false alarm
    "gingivitis":              0.20,
    "caries":                  0.20,   # caries: important to catch early
    "oral_ulcer":              0.20,
    "enamel_demineralization": 0.20,
    "periodontal_disease":     0.15,   # very important to flag even at low confidence
    "oral_lesion":             0.15,   # critical — flag at lowest threshold
}

# Flag result as low-confidence when top-1 < this, regardless of class
LOW_CONF_WARNING_THRESHOLD = 0.60   # show warning banner below 60%
MODEL_PATH           = os.environ.get("MODEL_PATH",
                         str(Path(__file__).parent / "models" / "oralai_efficientnet_best.pth"))
CLASS_NAMES_PATH     = os.environ.get("CLASS_NAMES_PATH",
                         str(Path(__file__).parent / "models" / "class_names.json"))

ALLOWED_MIME         = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES            = 10 * 1024 * 1024   # 10 MB
MODEL_VERSION        = "oralai-efficientnet-b0-v1"

# ImageNet stats for normalisation
_MEAN = [0.485, 0.456, 0.406]
_STD  = [0.229, 0.224, 0.225]

# ── Disease classes (fallback if class_names.json absent) ─────────────────────
DEFAULT_CLASSES = [
    "Healthy",
    "Plaque Accumulation",
    "Gingivitis",
    "Dental Caries",
    "Enamel Demineralization",
    "Periodontal Disease",
    "Oral Ulcer",
    "Oral Lesion",
]
# Demo mock weights (index-aligned to DEFAULT_CLASSES)
_MOCK_WEIGHTS = [0.15, 0.20, 0.18, 0.22, 0.12, 0.06, 0.04, 0.03]

# ── Per-class metadata — snake_case keys matching ImageFolder class names ──────
# These MUST match the folder names in dataset/train/<class>/
_URGENCY = {
    "healthy":                 "none",
    "plaque":                  "monitor",
    "enamel_demineralization": "monitor",
    "caries":                  "dentist",
    "gingivitis":              "dentist",
    "oral_ulcer":              "dentist",
    "periodontal_disease":     "urgent",
    "oral_lesion":             "urgent",
    # Legacy capitalised names (fallback for old checkpoints)
    "Healthy":                 "none",
    "Plaque Accumulation":     "monitor",
    "Enamel Demineralization": "monitor",
    "Dental Caries":           "dentist",
    "Gingivitis":              "dentist",
    "Oral Ulcer":              "dentist",
    "Periodontal Disease":     "urgent",
    "Oral Lesion":             "urgent",
}
_SEVERITY = {
    "healthy":                 "Clear",
    "plaque":                  "Mild",
    "enamel_demineralization": "Mild",
    "caries":                  "Moderate",
    "gingivitis":              "Moderate",
    "oral_ulcer":              "Moderate",
    "periodontal_disease":     "Severe",
    "oral_lesion":             "Severe",
    # Legacy
    "Healthy":                 "Clear",
    "Plaque Accumulation":     "Mild",
    "Enamel Demineralization": "Mild",
    "Dental Caries":           "Moderate",
    "Gingivitis":              "Moderate",
    "Oral Ulcer":              "Moderate",
    "Periodontal Disease":     "Severe",
    "Oral Lesion":             "Severe",
}
_REGIONS = {
    "caries":                  "Posterior molars",
    "gingivitis":              "Gingival margin",
    "plaque":                  "Interproximal spaces",
    "enamel_demineralization": "Upper incisors",
    "periodontal_disease":     "Periodontal pockets",
    "oral_ulcer":              "Buccal mucosa",
    "oral_lesion":             "Lateral tongue / soft tissue",
    "healthy":                 "N/A",
    # Legacy
    "Dental Caries":           "Posterior molars",
    "Gingivitis":              "Gingival margin",
    "Plaque Accumulation":     "Interproximal spaces",
    "Enamel Demineralization": "Upper incisors",
    "Periodontal Disease":     "Periodontal pockets",
    "Oral Ulcer":              "Buccal mucosa",
    "Oral Lesion":             "Lateral tongue",
    "Healthy":                 "N/A",
}

# Human-readable display names for the frontend
_DISPLAY_NAMES = {
    "healthy":                 "Healthy",
    "caries":                  "Dental Caries",
    "gingivitis":              "Gingivitis",
    "plaque":                  "Plaque Accumulation",
    "enamel_demineralization": "Enamel Demineralization",
    "periodontal_disease":     "Periodontal Disease",
    "oral_ulcer":              "Oral Ulcer",
    "oral_lesion":             "Oral Lesion / Cancer Risk",
}

# ── In-memory stores ─────────────────────────────────────────────────────────
_scans: list   = []
_sensors: dict = {
    "ph": 6.8, "temperature": 36.6, "bacterial": 42, "moisture": 71,
    "lastUpdated": datetime.now(timezone.utc).isoformat(),
}

# ── Model state ──────────────────────────────────────────────────────────────
_MODEL        = None
_DEVICE       = None
_CLASS_NAMES  = DEFAULT_CLASSES[:]
_TRANSFORM    = None


def _build_transform(img_size: int):
    """Delegates to the shared preprocessing module (val/infer pipeline)."""
    return _pp.build_transform(img_size, "infer")


def load_pytorch_model() -> None:
    global _MODEL, _DEVICE, _CLASS_NAMES, _TRANSFORM

    if not HAS_TORCH or not HAS_TIMM:
        log.info("PyTorch/timm not available — demo mode active")
        return

    _DEVICE = torch.device(
        "cuda" if torch.cuda.is_available() else
        "mps"  if torch.backends.mps.is_available() else "cpu"
    )

    # Load class names
    cn_path = Path(CLASS_NAMES_PATH)
    if cn_path.exists():
        with open(cn_path) as f:
            _CLASS_NAMES = json.load(f)["classes"]
        log.info("Loaded %d classes from %s", len(_CLASS_NAMES), cn_path)
    else:
        log.warning("class_names.json not found — using default class list")

    # Load model
    mp = Path(MODEL_PATH)
    if not mp.exists():
        log.info("No model file at %s — running in demo/mock mode", mp)
        return

    try:
        ckpt     = torch.load(str(mp), map_location=_DEVICE, weights_only=False)
        cn_saved = ckpt.get("class_names", _CLASS_NAMES)
        if cn_saved:
            _CLASS_NAMES = cn_saved
        img_sz   = ckpt.get("img_size", IMG_SIZE)
        arch     = ckpt.get("arch", "mobilenet_v2")

        # ── Build matching architecture ────────────────────────────────────
        if arch == "mobilenet_v2":
            from torchvision import models as tvm
            model = tvm.mobilenet_v2(weights=None)
            in_f  = model.classifier[1].in_features
            # Try new head first (256 hidden), fall back to old head (direct)
            if any("classifier.4" in k for k in ckpt["model_state"].keys()):
                # New head: Dropout → Linear(1280→256) → ReLU → Dropout → Linear(256→n)
                model.classifier = nn.Sequential(
                    nn.Dropout(p=0.5),
                    nn.Linear(in_f, 256),
                    nn.ReLU(inplace=True),
                    nn.Dropout(p=0.3),
                    nn.Linear(256, len(_CLASS_NAMES)),
                )
            else:
                # Old head: Dropout → Linear(1280→n)
                model.classifier = nn.Sequential(
                    nn.Dropout(p=0.4),
                    nn.Linear(in_f, len(_CLASS_NAMES)),
                )
        else:
            # Legacy EfficientNetB0 (smoke checkpoint)
            backbone = timm.create_model("efficientnet_b0", pretrained=False,
                                         num_classes=0, global_pool="avg")
            head = nn.Sequential(
                nn.Dropout(0.4),
                nn.Linear(backbone.num_features, 512),
                nn.GELU(),
                nn.Dropout(0.2),
                nn.Linear(512, len(_CLASS_NAMES)),
            )
            model = nn.Sequential(backbone, head)

        model.load_state_dict(ckpt["model_state"])
        model.eval().to(_DEVICE)

        _MODEL     = model
        _TRANSFORM = _build_transform(img_sz)
        log.info("✅  PyTorch model loaded  arch=%s  device=%s  classes=%d  epoch=%s",
                 arch, _DEVICE, len(_CLASS_NAMES), ckpt.get("epoch", "?"))
    except Exception as exc:
        log.error("⚠️  Failed to load model: %s — fallback to demo mode", exc)
        _MODEL = None


# ── Image quality check ───────────────────────────────────────────────────────
def _assess_quality(raw_bytes: bytes) -> dict:
    """Delegates to the shared preprocessing module."""
    return _pp.assess_quality(raw_bytes)


# ── Inference ─────────────────────────────────────────────────────────────────
def _run_inference(raw_bytes: bytes) -> list:
    """
    Returns list of (class_name, probability) tuples, all classes.
    Uses real model when loaded, otherwise weighted random mock.
    Raises RuntimeError if DEMO_MODE=0 and no model loaded.
    """
    if _MODEL is not None and HAS_TORCH:
        try:
            img    = _pp.open_image_bytes(raw_bytes)   # EXIF fix + RGB
            tensor = _TRANSFORM(img).unsqueeze(0).to(_DEVICE)
            with torch.no_grad():
                logits = _MODEL(tensor)
                probs  = torch.softmax(logits, dim=1).squeeze().cpu().numpy()
            return list(zip(_CLASS_NAMES, probs.tolist()))
        except Exception as exc:
            log.warning("Inference error: %s", exc)
            if not DEMO_MODE:
                raise RuntimeError(f"Model inference failed: {exc}")

    if not DEMO_MODE:
        raise RuntimeError(
            "No trained model loaded and DEMO_MODE=0. "
            "Train the model (python train.py) or set DEMO_MODE=1."
        )

    classes = _CLASS_NAMES or DEFAULT_CLASSES
    weights = _MOCK_WEIGHTS[:len(classes)]
    raw     = [random.random() * w for w in weights]
    total   = sum(raw) or 1.0
    return list(zip(classes, [v / total for v in raw]))


# ── Sensor fusion ─────────────────────────────────────────────────────────────
def _fuse(pairs: list, sensors: dict) -> list:
    """Adjust class probabilities based on IoT sensor readings."""
    ph   = float(sensors.get("ph",          7.0))
    bact = float(sensors.get("bacterial",   40))
    temp = float(sensors.get("temperature", 36.6))
    mois = float(sensors.get("moisture",    70))

    class_to_idx = {name: i for i, (name, _) in enumerate(pairs)}
    probs = [p for _, p in pairs]

    def bump(cls, factor):
        i = class_to_idx.get(cls)
        if i is not None:
            probs[i] = min(1.0, probs[i] * factor)

    # Low pH → acid erosion → boosts caries and enamel demineralisation
    if ph < 6.5:
        k = 1.0 + (6.5 - ph) * 0.3
        bump("caries",                  k)
        bump("enamel_demineralization", k)
    # High bacteria → gum disease
    if bact > 50:
        k = 1.0 + (bact - 50) * 0.01
        bump("gingivitis", k)
        bump("plaque",     k)
    # Elevated temperature → periodontal inflammation
    if temp > 37.2:
        bump("periodontal_disease", 1.2)
    # Low moisture → ulcers / dry mouth
    if mois < 50:
        bump("oral_ulcer",  1.3)
        bump("oral_lesion", 1.15)

    total = sum(probs) or 1.0
    return [(name, p / total) for (name, _), p in zip(pairs, probs)]


# ── Report builder ────────────────────────────────────────────────────────────
def _build_report(pairs: list, scan_type: str, sensors: dict, ms: float,
                  img_quality: dict) -> dict:
    """
    Build a report from inference pairs [(class_name, probability), ...].

    Scoring philosophy:
    - Score uses the FULL softmax distribution weighted by disease severity,
      not just the top-1 class. This means a badly diseased image gets a
      low score even if no single class has very high confidence.
    - Low confidence (top-1 < 60%) shows a warning but still computes a
      real score from the distribution — does NOT silently return 50.
    - Multiple findings are shown for all classes above their min threshold.
    """
    sorted_pairs = sorted(pairs, key=lambda x: x[1], reverse=True)
    top1_name, top1_prob = sorted_pairs[0]

    # ── Disease severity weights — used for BOTH score and findings ───────────
    CLASS_PENALTY = {
        "healthy":                  0,
        "plaque":                  30,    # raised: plaque at any level affects score
        "gingivitis":              45,    # raised
        "caries":                  60,    # raised significantly
        "enamel_demineralization": 38,
        "oral_ulcer":              50,
        "periodontal_disease":     80,    # near-critical
        "oral_lesion":             90,    # critical
    }
    HEALTHY_CLASSES = {"healthy", "Healthy"}

    # ── Compute score from FULL distribution ──────────────────────────────────
    # Weighted sum of (penalty × probability) across ALL disease classes.
    # This correctly penalises images where disease probability is spread
    # across multiple classes — exactly the "severely diseased but uncertain" case.
    # Using sqrt of probability to avoid over-penalising low-confidence classes
    # while still catching spread-distribution disease images.
    disease_pressure = 0.0
    for name, prob in pairs:
        if name in HEALTHY_CLASSES:
            continue
        penalty = CLASS_PENALTY.get(name, 35)
        # Linear weighting — every disease class contributes proportionally
        disease_pressure += penalty * prob

    # disease_pressure: 0 = clean, ~90 = 100% oral_lesion
    # Score = 100 - pressure, clamped 10–100
    score = max(10, min(100, int(100 - disease_pressure)))

    # ── Healthy fast-path: top-1 is healthy AND disease pressure is truly low ─
    is_healthy_pred = top1_name in HEALTHY_CLASSES and top1_prob >= 0.35
    is_low_disease  = disease_pressure < 15   # <15 disease pressure = genuinely clean
    if is_healthy_pred and is_low_disease:
        health_score = min(100, int(85 + top1_prob * 15))
        return {
            "score":            health_score,
            "confidence":       round(top1_prob * 100, 1),
            "attentionAreas":   0,
            "findings":         [],
            "diagnosis":        "No significant oral disease detected. Your oral health looks good!",
            "model":            MODEL_VERSION if _MODEL else f"{MODEL_VERSION}-mock",
            "demoMode":         _MODEL is None,
            "scanType":         scan_type,
            "processingTime":   f"{ms:.0f}ms",
            "imageQuality":     f"Quality score: {img_quality['score']}/100",
            "sensorFusion":     True,
            "severity":         "Good",
            "urgency":          "none",
            "low_confidence":   False,
            "primaryDiagnosis": "Healthy",
            "top_3_predictions": [
                {"class": _DISPLAY_NAMES.get(n, n.replace("_"," ").title()),
                 "confidence": round(p * 100, 2)}
                for n, p in sorted_pairs[:3]
            ],
            "timestamp":        datetime.now(timezone.utc).isoformat(),
            "sensors":          {k: sensors.get(k) for k in
                                 ("ph", "temperature", "bacterial", "moisture")},
            "recommendations":  [
                "Great news — no significant disease detected.",
                "Continue brushing twice daily with fluoride toothpaste.",
                "Floss daily to prevent plaque buildup.",
                "Stay hydrated and limit acidic/sugary foods.",
                "Schedule a routine check-up every 6 months.",
                "Follow-up AI scan recommended in 30 days.",
            ],
            "disclaimer": (
                "This is an AI screening result, not a final diagnosis. "
                "Regular professional check-ups are still recommended."
            ),
        }

    # ── Build findings list ───────────────────────────────────────────────────
    # Collect ALL classes above their minimum confidence threshold.
    # This catches multi-disease scenarios and borderline cases.
    findings = []
    suppress_findings = (top1_name in HEALTHY_CLASSES and is_low_disease)
    for name, prob in sorted_pairs:
        if suppress_findings or name in HEALTHY_CLASSES:
            continue
        min_conf_for_class = _CLASS_MIN_CONF.get(name, 0.20)
        if prob < min_conf_for_class:
            continue
        penalty = CLASS_PENALTY.get(name, 30)
        # Severity: based on disease type severity AND how confident the model is
        if penalty >= 60 or prob >= 0.65:
            sev = "Severe"
        elif penalty >= 40 or prob >= 0.35:
            sev = "Moderate"
        else:
            sev = "Mild"
        display = _DISPLAY_NAMES.get(name, name.replace("_", " ").title())
        findings.append({
            "condition":  display,
            "confidence": round(prob * 100, 1),
            "severity":   sev,
            "region":     _REGIONS.get(name, _REGIONS.get(display, "Unspecified")),
        })

    # Sort findings by severity (worst first)
    sev_order = {"Severe": 0, "Moderate": 1, "Mild": 2}
    findings.sort(key=lambda f: (sev_order.get(f["severity"], 9), -f["confidence"]))

    # ── Low-confidence flag (warn but still show real score) ──────────────────
    is_low_conf = top1_prob < LOW_CONF_WARNING_THRESHOLD

    # ── Severity label ────────────────────────────────────────────────────────
    if score >= 85 and not findings:
        severity = "Good"
        summary  = "No significant oral disease detected. Oral health looks good."
    elif score >= 80:
        severity = "Good"
        f0 = findings[0]["condition"] if findings else "Minor condition"
        summary  = f"Minor {f0.lower()} noted. Maintain regular hygiene routine."
    elif score >= 65:
        severity = "Fair"
        f0 = findings[0]["condition"] if findings else "Minor condition"
        summary  = f"{f0} detected. Professional cleaning recommended within 4–6 weeks."
    elif score >= 45:
        severity = "Needs Attention"
        conds = ", ".join(f["condition"] for f in findings[:2]) if findings else "Multiple conditions"
        summary  = f"{conds} detected. Dental appointment advised within 1–2 weeks."
    elif score >= 25:
        severity = "Poor"
        conds = ", ".join(f["condition"] for f in findings[:3]) if findings else "Severe disease"
        summary  = f"Significant {conds} detected. See a dentist urgently this week."
    else:
        severity = "Critical"
        conds = ", ".join(f["condition"] for f in findings[:3]) if findings else "Severe disease"
        summary  = f"Severe oral disease: {conds}. Seek emergency dental care immediately."

    # ── Urgency — driven by worst finding, not just top-1 ─────────────────────
    worst_class = sorted_pairs[0][0] if not findings else None
    for f in findings:
        # Map display name back to class key for urgency lookup
        for k, v in _DISPLAY_NAMES.items():
            if v == f["condition"]:
                worst_class = k
                break
        if f["severity"] == "Severe":
            break
    urgency = _URGENCY.get(worst_class or top1_name, "monitor")

    # ── Recommendations ───────────────────────────────────────────────────────
    found_classes = set()
    for f in findings:
        for k, v in _DISPLAY_NAMES.items():
            if v == f["condition"]:
                found_classes.add(k)
    found_classes.add(top1_name)   # always include top prediction
    all_names = found_classes | {_DISPLAY_NAMES.get(c, c) for c in found_classes}

    recs = []
    if not findings and score >= 75:
        recs += [
            "No significant disease detected — great result!",
            "Continue brushing twice daily with fluoride toothpaste.",
            "Floss daily and use an antiseptic mouthwash.",
            "Limit sugary and acidic food and drinks.",
            "Schedule a routine dental check-up every 6 months.",
        ]
    else:
        if any(n in all_names for n in ("caries", "Dental Caries")):
            recs.append("Dental caries detected — schedule a filling consultation immediately.")
            recs.append("Use fluoride toothpaste twice daily and consider fluoride varnish.")
        if any(n in all_names for n in ("enamel_demineralization", "Enamel Demineralization")):
            recs.append("Enamel demineralization detected — reduce acidic food/drink intake.")
        if any(n in all_names for n in ("plaque", "Plaque Accumulation")):
            recs.append("Plaque accumulation detected — professional scaling recommended.")
            recs.append("Brush for 2 minutes twice daily, focusing on the gum line.")
        if any(n in all_names for n in ("gingivitis", "Gingivitis")):
            recs.append("Gingivitis detected — professional cleaning within 4 weeks.")
            recs.append("Use antiseptic mouthwash (chlorhexidine) twice daily.")
        if any(n in all_names for n in ("periodontal_disease", "Periodontal Disease")):
            recs.append("Periodontal disease detected — consult a periodontist urgently.")
            recs.append("Deep scaling and root planing may be required.")
        if any(n in all_names for n in ("oral_lesion", "Oral Lesion / Cancer Risk")):
            recs.append("Oral lesion detected — urgent specialist review and biopsy recommended.")
            recs.append("Do not ignore — early diagnosis significantly improves outcomes.")
        if any(n in all_names for n in ("oral_ulcer", "Oral Ulcer")):
            recs.append("Oral ulcer detected — if persistent >2 weeks, see a dentist.")
        if float(sensors.get("ph", 7.0)) < 6.5:
            recs.append(f"Mouth pH is low ({sensors.get('ph')}) — reduce acidic foods and drinks.")
        if float(sensors.get("bacterial", 40)) > 50:
            recs.append(f"Elevated bacterial load — use antiseptic mouthwash twice daily.")
        if not recs:
            recs.append("Monitor oral hygiene closely and schedule a professional check-up.")
    if is_low_conf:
        recs.insert(0, "Low-confidence result — retake image in better lighting for more accuracy.")
    recs.append("Follow-up AI scan recommended in 30 days to track progress.")

    overall_conf = round(top1_prob * 100, 1)
    top1_display = _DISPLAY_NAMES.get(top1_name, top1_name.replace("_", " ").title())

    return {
        "score":            score,
        "confidence":       overall_conf,
        "attentionAreas":   len(findings),
        "findings":         findings,
        "diagnosis":        summary,
        "model":            MODEL_VERSION if _MODEL else f"{MODEL_VERSION}-mock",
        "demoMode":         _MODEL is None,
        "scanType":         scan_type,
        "processingTime":   f"{ms:.0f}ms",
        "imageQuality":     f"Quality score: {img_quality['score']}/100",
        "sensorFusion":     True,
        "severity":         severity,
        "urgency":          urgency,
        "low_confidence":   is_low_conf,
        "primaryDiagnosis": top1_display,
        "disease_pressure": round(disease_pressure, 2),
        "top_3_predictions": [
            {
                "class":      _DISPLAY_NAMES.get(n, n.replace("_", " ").title()),
                "confidence": round(p * 100, 2),
            }
            for n, p in sorted_pairs[:3]
        ],
        "timestamp":        datetime.now(timezone.utc).isoformat(),
        "sensors":          {k: sensors.get(k) for k in
                             ("ph", "temperature", "bacterial", "moisture")},
        "recommendations":  recs,
        "disclaimer": (
            "This is an AI screening finding, not a final diagnosis. "
            "All results must be interpreted by a qualified dental professional."
        ),
    }


# ── Rate limiter ──────────────────────────────────────────────────────────────
_rate_store: dict = {}


def rate_limit(per_minute: int = 20):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            ip   = request.remote_addr or "0.0.0.0"
            now  = time.time()
            hits = [t for t in _rate_store.get(ip, []) if now - t < 60]
            if len(hits) >= per_minute:
                return jsonify({"error": "Rate limit exceeded."}), 429
            hits.append(now)
            _rate_store[ip] = hits
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# ════════════════════════════════════════════════════════════════════════════
#  ROUTES
# ════════════════════════════════════════════════════════════════════════════

@app.route("/", methods=["GET"])
def index():
    model_status = "Loaded" if _MODEL else "Not loaded (demo mode)"
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>OralAI Backend</title>
<style>
  body{{font-family:system-ui,sans-serif;background:#050a14;color:#e2e8f0;
        display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}}
  .box{{background:#0c1626;border:1px solid #1a2d47;border-radius:16px;padding:40px;
        max-width:540px;width:100%;text-align:center}}
  h1{{font-size:1.9rem;font-weight:900;margin:0 0 6px}}
  .teal{{color:#00d4aa}} .gray{{color:#4a6785}}
  a{{color:#06b6d4;text-decoration:none}}
  .tag{{background:#1a2d47;border-radius:6px;padding:4px 10px;
        font-family:monospace;font-size:.82rem;color:#8facc0}}
  .row{{display:flex;justify-content:space-between;padding:9px 0;
        border-bottom:1px solid #1a2d47;font-size:.88rem}}
  .row:last-child{{border:none}}
</style></head>
<body><div class="box">
  <div style="font-size:3rem;margin-bottom:12px">🦷</div>
  <h1><span class="teal">●</span> OralAI Backend</h1>
  <p class="gray" style="margin-bottom:20px">PyTorch EfficientNetB0 — v3.0</p>
  <div style="text-align:left;margin-bottom:24px">
    <div class="row"><span>Status</span><strong class="teal">Online ✓</strong></div>
    <div class="row"><span>Model</span><span>{model_status}</span></div>
    <div class="row"><span>Demo Mode</span><span>{"On" if DEMO_MODE else "Off"}</span></div>
    <div class="row"><span>Classes</span><span>{len(_CLASS_NAMES)}</span></div>
    <div class="row"><span>PyTorch</span><span>{"✓" if HAS_TORCH else "✗ not installed"}</span></div>
    <div class="row"><span>OpenCV</span><span>{"✓" if HAS_CV2 else "✗ not installed"}</span></div>
    <div class="row"><span>Port</span><span>5000</span></div>
  </div>
  <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:16px">
    <a href="/health" class="tag">/health</a>
    <a href="/api/models" class="tag">/api/models</a>
    <a href="/api/sensors" class="tag">/api/sensors</a>
    <a href="/api/scans" class="tag">/api/scans</a>
    <a href="/api/specialists" class="tag">/api/specialists</a>
    <a href="/api/analytics" class="tag">/api/analytics</a>
  </div>
  <div style="text-align:left;font-size:.8rem;color:#4a6785;margin-bottom:12px">
    <strong style="color:#8facc0">New APIs (v3.1):</strong>
    /api/auth/login · /api/auth/register · /api/user/profile ·
    /api/appointments · /api/treatments · /api/reminders ·
    /api/family · /api/notifications · /api/consent ·
    /api/symptom/assess · /api/progress · /api/scans/compare ·
    /api/scans/export · /api/sensors/history · /api/analytics ·
    /api/clinic/analytics · /api/doctor/patients · /api/export
  </div>
  <p style="font-size:.8rem" class="gray">
    Frontend: <a href="http://localhost:8080">http://localhost:8080</a>
  </p>
</div></body></html>""", 200, {"Content-Type": "text/html; charset=utf-8"}


@app.route("/health", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status":       "ok",
        "version":      "3.0.0",
        "model":        MODEL_VERSION if _MODEL else f"{MODEL_VERSION}-mock",
        "model_loaded": _MODEL is not None,
        "demo_mode":    DEMO_MODE,
        "has_torch":    HAS_TORCH,
        "has_timm":     HAS_TIMM,
        "has_pil":      HAS_PIL,
        "has_cv2":      HAS_CV2,
        "classes":      _CLASS_NAMES,
        "num_classes":  len(_CLASS_NAMES),
        "timestamp":    datetime.now(timezone.utc).isoformat(),
    }), 200


@app.route("/api/analyze", methods=["POST"])
@rate_limit(per_minute=RATE_LIMIT_PER_MIN)
def analyze():
    t0 = time.time()

    # ── Validate image ────────────────────────────────────────────────────────
    img_file = request.files.get("image")
    if not img_file:
        return jsonify({"error": "No image. POST a 'image' field as multipart/form-data."}), 400
    mime = (img_file.content_type or "").lower().split(";")[0].strip()
    if mime not in ALLOWED_MIME:
        return jsonify({"error": f"Unsupported type '{mime}'. Use JPEG, PNG, or WebP."}), 415
    raw = img_file.read()
    if len(raw) > MAX_BYTES:
        return jsonify({"error": f"Image exceeds 10 MB ({len(raw)//1024//1024} MB)."}), 413
    if len(raw) < 100:
        return jsonify({"error": "Image appears empty or corrupt."}), 400

    # ── Quality check ─────────────────────────────────────────────────────────
    quality = _assess_quality(raw)

    # ── Parse form data ───────────────────────────────────────────────────────
    scan_type = request.form.get("scan_type", "Basic RGB")
    try:
        sensors = json.loads(request.form.get("sensors", "{}"))
    except json.JSONDecodeError:
        sensors = {}
    merged = {**_sensors, **sensors}

    # ── Reject very bad images before inference ───────────────────────────────
    if not quality["pass"]:
        ms = (time.time() - t0) * 1000
        scan_id = f"RPT-{int(time.time()*1000) % 100_000_000:08d}-ANALYSIS"
        report  = {
            "score": 0, "confidence": 0.0, "attentionAreas": 0,
            "findings": [], "severity": "Unknown", "urgency": "retake",
            "low_confidence": True,
            "diagnosis": (
                f"Unable to assess — image quality too low "
                f"({quality['reason']}). "
                "Please retake with better lighting and focus."
            ),
            "model":           f"{MODEL_VERSION}-quality-reject",
            "demoMode":        _MODEL is None,
            "scanType":        scan_type,
            "processingTime":  f"{ms:.0f}ms",
            "imageQuality":    f"REJECTED — score {quality['score']}/100: {quality['reason']}",
            "sensorFusion":    False,
            "top_3_predictions": [],
            "recommendations": [
                "Retake the image in better lighting.",
                "Follow the camera guidance checklist.",
                "Consult a dentist for professional examination.",
            ],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sensors":   {k: merged.get(k) for k in ("ph","temperature","bacterial","moisture")},
            "disclaimer": "This is an AI screening finding, not a final diagnosis.",
        }
        _scans.insert(0, {"id": scan_id, "date": datetime.now(timezone.utc).strftime("%b %d, %Y"), **report})
        if len(_scans) > MAX_SCANS: _scans.pop()
        return jsonify({"scanId": scan_id, **report}), 200

    # ── Inference + sensor fusion ─────────────────────────────────────────────
    try:
        pairs = _run_inference(raw)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503

    fused  = _fuse(pairs, merged)
    ms     = (time.time() - t0) * 1000
    report = _build_report(fused, scan_type, merged, ms, quality)

    scan_id = f"RPT-{int(time.time()*1000) % 100_000_000:08d}-ANALYSIS"
    _scans.insert(0, {
        "id":   scan_id,
        "date": datetime.now(timezone.utc).strftime("%b %d, %Y"),
        **report,
    })
    if len(_scans) > MAX_SCANS:
        _scans.pop()

    log.info("scan=%s  score=%d  findings=%d  conf=%.1f%%  quality=%d  %.0fms  demo=%s",
             scan_id, report["score"], report["attentionAreas"],
             report["confidence"], quality["score"], ms, _MODEL is None)

    return jsonify({"scanId": scan_id, **report}), 200


@app.route("/api/scans",         methods=["GET"])
def get_scans():
    limit = min(int(request.args.get("limit", 50)), MAX_SCANS)
    return jsonify({"scans": _scans[:limit], "total": len(_scans)}), 200

@app.route("/api/scans/<sid>",   methods=["GET"])
def get_scan(sid):
    s = next((x for x in _scans if x["id"] == sid), None)
    if not s: abort(404)
    return jsonify(s), 200

@app.route("/api/sensors",       methods=["GET"])
def get_sensors():
    return jsonify(_sensors), 200

@app.route("/api/sensors/update", methods=["POST"])
@rate_limit(per_minute=60)
def update_sensors():
    data = request.get_json(silent=True) or {}
    for k in ("ph", "temperature", "bacterial", "moisture"):
        if k in data:
            try: _sensors[k] = float(data[k])
            except (TypeError, ValueError): pass
    _sensors["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    return jsonify({"status": "ok", "sensors": _sensors}), 200

@app.route("/api/models",        methods=["GET"])
def list_models():
    return jsonify({
        "models": [
            {"id": MODEL_VERSION, "name": "EfficientNetB0 PyTorch",
             "active": _MODEL is not None},
            {"id": f"{MODEL_VERSION}-mock", "name": "Mock (demo)",
             "active": _MODEL is None},
        ],
        "current": MODEL_VERSION if _MODEL else f"{MODEL_VERSION}-mock",
        "classes": _CLASS_NAMES,
    }), 200

@app.route("/api/demo/simulate", methods=["POST"])
def simulate():
    _sensors["ph"]          = round(6.4 + random.random() * 1.2, 2)
    _sensors["temperature"] = round(36.1 + random.random() * 1.2, 1)
    _sensors["bacterial"]   = round(30   + random.random() * 35,  1)
    _sensors["moisture"]    = round(55   + random.random() * 30,  1)
    _sensors["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    return jsonify({"status": "ok", "sensors": _sensors}), 200

# ── Error handlers ────────────────────────────────────────────────────────────
@app.errorhandler(404)
def _404(e): return jsonify({"error": "Not found"}), 404
@app.errorhandler(405)
def _405(e): return jsonify({"error": "Method not allowed"}), 405
@app.errorhandler(500)
def _500(e):
    log.exception("Internal server error")
    return jsonify({"error": "Internal server error"}), 500


# ══════════════════════════════════════════════════════════════════════════════
#  ROLE-BASED API  (v2)
#  All endpoints validate the X-User-Role and X-User-Id headers sent by the
#  frontend.  In a production system replace with JWT verification.
# ══════════════════════════════════════════════════════════════════════════════

def _get_caller():
    """Extract (user_id, role) from request headers."""
    uid  = request.headers.get("X-User-Id",   "").strip()
    role = request.headers.get("X-User-Role",  "patient").strip().lower()
    return uid, role


def _require_role(*allowed_roles):
    """Return (uid, role) or abort with 403."""
    uid, role = _get_caller()
    if not uid:
        abort(401, description="Authentication required")
    if allowed_roles and role not in allowed_roles:
        abort(403, description=f"Role '{role}' is not permitted here")
    return uid, role


# ── In-memory stores for role-based data (demo only) ─────────────────────────
_doctor_reviews: dict  = {}   # review_id -> review dict
_report_shares:  dict  = {}   # share_id  -> share dict
_audit_logs:     list  = []   # list of audit entries
_consent_records: dict = {}   # consent_id -> consent dict


def _add_audit(action: str, user_id: str, detail: str):
    import uuid
    _audit_logs.append({
        "id":        str(uuid.uuid4())[:12].upper(),
        "action":    action,
        "userId":    user_id,
        "detail":    detail,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    if len(_audit_logs) > 500:
        _audit_logs.pop(0)


# ── Patient dashboard ─────────────────────────────────────────────────────────
@app.route("/api/patient/dashboard", methods=["GET"])
def patient_dashboard():
    uid, role = _require_role("patient", "admin")
    scans = [s for s in _scans if s.get("patientId") == uid]
    latest = scans[0] if scans else None
    shares = [s for s in _report_shares.values() if s.get("patientId") == uid and not s.get("revoked")]
    return jsonify({
        "patient_id":    uid,
        "total_scans":   len(scans),
        "latest_score":  latest.get("score") if latest else None,
        "latest_date":   latest.get("timestamp") if latest else None,
        "active_shares": len(shares),
        "scans":         scans[:10],
    })


@app.route("/api/patient/scans", methods=["GET"])
def patient_scans():
    uid, role = _require_role("patient", "admin")
    scans = [s for s in _scans if s.get("patientId") == uid]
    return jsonify({"scans": scans, "total": len(scans)})


@app.route("/api/patient/scans/<scan_id>", methods=["GET"])
def patient_scan_detail(scan_id):
    uid, role = _require_role("patient", "doctor", "admin")
    scan = next((s for s in _scans if s.get("scanId") == scan_id), None)
    if not scan:
        return jsonify({"error": "Scan not found"}), 404
    # Patients can only access their own; doctors need an active share
    if role == "patient" and scan.get("patientId") != uid:
        return jsonify({"error": "Access denied"}), 403
    if role == "doctor":
        active_share = next((
            s for s in _report_shares.values()
            if s.get("scanId") == scan_id
            and s.get("doctorId") == uid
            and not s.get("revoked")
        ), None)
        if not active_share:
            return jsonify({"error": "No active share for this scan"}), 403
    return jsonify(scan)


@app.route("/api/patient/reports/<report_id>/share", methods=["POST"])
def share_report(report_id):
    uid, role = _require_role("patient")
    data = request.get_json(force=True) or {}
    doctor_email = data.get("doctorEmail", "").strip()
    if not doctor_email:
        return jsonify({"error": "doctorEmail is required"}), 400

    scan = next((s for s in _scans if s.get("scanId") == report_id), None)
    if not scan:
        return jsonify({"error": "Report not found"}), 404
    if scan.get("patientId") and scan["patientId"] != uid:
        return jsonify({"error": "Access denied"}), 403

    import uuid
    share_id = "SHR-" + str(uuid.uuid4())[:8].upper()
    share = {
        "id":          share_id,
        "reportId":    report_id,
        "scanId":      report_id,
        "patientId":   uid,
        "doctorId":    doctor_email,
        "doctorEmail": doctor_email,
        "doctorName":  data.get("doctorName", doctor_email),
        "sharedAt":    datetime.now(timezone.utc).isoformat(),
        "expiresAt":   data.get("expiresAt"),
        "revoked":     False,
        "accessCount": 0,
    }
    _report_shares[share_id] = share
    _add_audit("report_shared", uid, f"Report {report_id} shared with {doctor_email}")
    return jsonify({"shareId": share_id, "message": "Report shared successfully"}), 201


@app.route("/api/patient/report-shares/<share_id>", methods=["DELETE"])
def revoke_share(share_id):
    uid, role = _require_role("patient", "admin")
    share = _report_shares.get(share_id)
    if not share:
        return jsonify({"error": "Share not found"}), 404
    if share.get("patientId") != uid and role != "admin":
        return jsonify({"error": "Access denied"}), 403
    share["revoked"]   = True
    share["revokedAt"] = datetime.now(timezone.utc).isoformat()
    _add_audit("share_revoked", uid, f"Share {share_id} revoked")
    return jsonify({"message": "Share revoked"})


# ── Doctor dashboard ──────────────────────────────────────────────────────────
@app.route("/api/doctor/dashboard", methods=["GET"])
def doctor_dashboard():
    uid, role = _require_role("doctor", "admin")
    all_reviews  = [r for r in _doctor_reviews.values() if r.get("doctorId") == uid]
    active_shares = [
        s for s in _report_shares.values()
        if s.get("doctorId") == uid
        and not s.get("revoked")
    ]
    pending = len([s for s in active_shares
                   if not any(r.get("scanId") == s.get("scanId") for r in all_reviews)])
    return jsonify({
        "doctor_id":       uid,
        "pending_reviews": pending,
        "total_reviews":   len(all_reviews),
        "active_shares":   len(active_shares),
        "recent_reviews":  all_reviews[:5],
    })


@app.route("/api/doctor/review-queue", methods=["GET"])
def doctor_review_queue():
    uid, role = _require_role("doctor", "admin")
    active_shares = [
        s for s in _report_shares.values()
        if s.get("doctorId") == uid and not s.get("revoked")
    ]
    queue = []
    for share in active_shares:
        scan = next((sc for sc in _scans if sc.get("scanId") == share.get("scanId")), {})
        review = next((
            r for r in _doctor_reviews.values()
            if r.get("scanId") == share.get("scanId") and r.get("doctorId") == uid
        ), None)
        queue.append({**share, "scan": scan, "review": review, "reviewed": review is not None})
    # Sort: unreviewed first, then by urgency
    queue.sort(key=lambda x: (x["reviewed"], x.get("scan", {}).get("score", 100)))
    return jsonify({"queue": queue, "total": len(queue), "pending": sum(1 for q in queue if not q["reviewed"])})


@app.route("/api/doctor/patients/<patient_id>", methods=["GET"])
def doctor_patient_profile(patient_id):
    uid, role = _require_role("doctor", "admin")
    # Verify doctor has at least one active share for this patient
    has_access = any(
        s for s in _report_shares.values()
        if s.get("patientId") == patient_id
        and s.get("doctorId") == uid
        and not s.get("revoked")
    )
    if not has_access and role != "admin":
        return jsonify({"error": "No active consent for this patient"}), 403
    patient_scans = [s for s in _scans if s.get("patientId") == patient_id]
    return jsonify({"patient_id": patient_id, "scans": patient_scans})


@app.route("/api/doctor/reports/<report_id>", methods=["GET"])
def doctor_report_detail(report_id):
    uid, role = _require_role("doctor", "admin")
    active_share = next((
        s for s in _report_shares.values()
        if s.get("scanId") == report_id
        and s.get("doctorId") == uid
        and not s.get("revoked")
    ), None)
    if not active_share and role != "admin":
        return jsonify({"error": "No active share for this report"}), 403
    scan = next((s for s in _scans if s.get("scanId") == report_id), None)
    if not scan:
        return jsonify({"error": "Report not found"}), 404
    # Track access
    if active_share:
        active_share["accessCount"] = active_share.get("accessCount", 0) + 1
        active_share["lastAccessedAt"] = datetime.now(timezone.utc).isoformat()
        _add_audit("report_accessed", uid, f"Doctor {uid} accessed report {report_id}")
    review = next((r for r in _doctor_reviews.values()
                   if r.get("scanId") == report_id and r.get("doctorId") == uid), None)
    return jsonify({**scan, "doctorReview": review})


@app.route("/api/doctor/reports/<report_id>/review", methods=["POST"])
def submit_doctor_review(report_id):
    uid, role = _require_role("doctor")
    # Confirm active share
    active_share = next((
        s for s in _report_shares.values()
        if s.get("scanId") == report_id
        and s.get("doctorId") == uid
        and not s.get("revoked")
    ), None)
    if not active_share:
        return jsonify({"error": "No active share — cannot review this report"}), 403

    data = request.get_json(force=True) or {}
    required = ["ai_correct", "review_notes"]
    missing = [f for f in required if not data.get(f) and data.get(f) is not False]
    if missing:
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    import uuid
    review_id = "REV-" + str(uuid.uuid4())[:8].upper()
    review = {
        "id":                review_id,
        "reportId":          report_id,
        "scanId":            report_id,
        "patientId":         active_share.get("patientId"),
        "patientName":       active_share.get("patientName"),
        "doctorId":          uid,
        "doctorName":        request.headers.get("X-User-Name", uid),
        "ai_correct":        data["ai_correct"],
        "corrected_labels":  data.get("corrected_labels", ""),
        "corrected_severity":data.get("corrected_severity", ""),
        "review_notes":      data["review_notes"],
        "follow_up":         data.get("follow_up", "none"),
        "urgent_referral":   bool(data.get("urgent_referral", False)),
        "status":            "urgent" if data.get("urgent_referral") else "reviewed",
        "reviewed_at":       datetime.now(timezone.utc).isoformat(),
    }
    _doctor_reviews[review_id] = review
    _add_audit("doctor_review", uid, f"Review {review_id} saved for report {report_id}")
    return jsonify({"reviewId": review_id, "message": "Review saved"}), 201


@app.route("/api/doctor/analytics", methods=["GET"])
def doctor_analytics():
    uid, role = _require_role("doctor", "admin")
    reviews = [r for r in _doctor_reviews.values() if r.get("doctorId") == uid]
    ai_confirmed  = sum(1 for r in reviews if r.get("ai_correct") is True)
    ai_corrected  = sum(1 for r in reviews if r.get("ai_correct") is False)
    ai_partial    = sum(1 for r in reviews if r.get("ai_correct") == "partially_correct")
    urgent        = sum(1 for r in reviews if r.get("urgent_referral"))
    return jsonify({
        "total_reviews":   len(reviews),
        "ai_confirmed":    ai_confirmed,
        "ai_corrected":    ai_corrected,
        "ai_partial":      ai_partial,
        "urgent_referrals":urgent,
        "accuracy_rate":   round(ai_confirmed / max(len(reviews), 1) * 100, 1),
    })


@app.route("/api/audit-logs", methods=["GET"])
def get_audit_logs():
    _, role = _require_role("admin", "doctor")
    uid, _ = _get_caller()
    if role == "doctor":
        # Doctors see only their own audit entries
        logs = [l for l in _audit_logs if l.get("userId") == uid]
    else:
        logs = _audit_logs
    limit = min(int(request.args.get("limit", 100)), 500)
    return jsonify({"logs": logs[-limit:], "total": len(logs)})


# ══════════════════════════════════════════════════════════════════════════════
#  AUTH  — login / register / logout
#  In production replace with JWT + bcrypt.  Here we use a simple in-memory
#  user store that seeds one demo user per role so the frontend works.
# ══════════════════════════════════════════════════════════════════════════════

import hashlib, uuid as _uuid_mod

_USERS: dict = {
    "patient@oralai.com": {
        "id": "USR-PATIENT-001", "name": "Demo Patient", "email": "patient@oralai.com",
        "password_hash": hashlib.sha256(b"patient123").hexdigest(),
        "role": "patient", "speciality": None,
        "dob": "1995-06-15", "avatarColor": "#0a8aff,#0070eb",
        "joinedDate": "2026-01-01T00:00:00Z",
    },
    "doctor@oralai.com": {
        "id": "USR-DOCTOR-001", "name": "Dr. Demo Doctor", "email": "doctor@oralai.com",
        "password_hash": hashlib.sha256(b"doctor123").hexdigest(),
        "role": "doctor", "speciality": "General Dentistry",
        "dob": None, "avatarColor": "#10b981,#059669",
        "joinedDate": "2026-01-01T00:00:00Z",
    },
    "admin@oralai.com": {
        "id": "USR-ADMIN-001", "name": "Demo Admin", "email": "admin@oralai.com",
        "password_hash": hashlib.sha256(b"admin123").hexdigest(),
        "role": "admin", "speciality": None,
        "dob": None, "avatarColor": "#f59e0b,#d97706",
        "joinedDate": "2026-01-01T00:00:00Z",
    },
}


def _safe_user(u: dict) -> dict:
    """Strip sensitive fields before returning user to client."""
    return {k: v for k, v in u.items() if k != "password_hash"}


@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    """Register a new patient account."""
    data  = request.get_json(force=True) or {}
    name  = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    pwd   = (data.get("password") or "").strip()
    role  = (data.get("role") or "patient").strip().lower()

    if not name or not email or not pwd:
        return jsonify({"error": "name, email, and password are required"}), 400
    if role not in ("patient", "doctor"):
        return jsonify({"error": "role must be 'patient' or 'doctor'"}), 400
    if email in _USERS:
        return jsonify({"error": "Email already registered"}), 409
    if len(pwd) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    user_id = "USR-" + str(_uuid_mod.uuid4())[:8].upper()
    _USERS[email] = {
        "id":            user_id,
        "name":          name,
        "email":         email,
        "password_hash": hashlib.sha256(pwd.encode()).hexdigest(),
        "role":          role,
        "speciality":    data.get("speciality"),
        "dob":           data.get("dob"),
        "avatarColor":   data.get("avatarColor", "#0a8aff,#0070eb"),
        "joinedDate":    datetime.now(timezone.utc).isoformat(),
    }
    _add_audit("register", email, f"New {role} account created: {name}")
    log.info("New user registered: %s (%s)", email, role)
    return jsonify({"user": _safe_user(_USERS[email]), "message": "Account created"}), 201


@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    """Authenticate an existing user."""
    data  = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    pwd   = (data.get("password") or "").strip()

    if not email or not pwd:
        return jsonify({"error": "email and password are required"}), 400

    user = _USERS.get(email)
    if not user or user["password_hash"] != hashlib.sha256(pwd.encode()).hexdigest():
        return jsonify({"error": "Invalid email or password"}), 401

    _add_audit("login", email, f"User logged in: {user['name']}")
    log.info("Login: %s (%s)", email, user["role"])
    return jsonify({"user": _safe_user(user), "message": "Login successful"}), 200


@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    uid, role = _require_role("patient", "doctor", "admin")
    _add_audit("logout", uid, f"User logged out")
    return jsonify({"message": "Logged out successfully"}), 200


# ══════════════════════════════════════════════════════════════════════════════
#  USER PROFILE
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/user/profile", methods=["GET"])
def get_user_profile():
    uid, role = _require_role("patient", "doctor", "admin")
    user = next((u for u in _USERS.values() if u["id"] == uid or u["email"] == uid), None)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(_safe_user(user)), 200


@app.route("/api/user/profile", methods=["PUT"])
def update_user_profile():
    uid, role = _require_role("patient", "doctor", "admin")
    user = next((u for u in _USERS.values() if u["id"] == uid or u["email"] == uid), None)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(force=True) or {}
    allowed = ("name", "dob", "speciality", "avatarColor", "language")
    for k in allowed:
        if k in data:
            user[k] = data[k]
    # Allow password change with old password verification
    if "new_password" in data:
        old_hash = hashlib.sha256((data.get("old_password", "")).encode()).hexdigest()
        if user["password_hash"] != old_hash:
            return jsonify({"error": "Old password is incorrect"}), 400
        if len(data["new_password"]) < 6:
            return jsonify({"error": "New password must be at least 6 characters"}), 400
        user["password_hash"] = hashlib.sha256(data["new_password"].encode()).hexdigest()

    _add_audit("profile_update", uid, f"Profile updated for {user['name']}")
    return jsonify({"user": _safe_user(user), "message": "Profile updated"}), 200


# ══════════════════════════════════════════════════════════════════════════════
#  APPOINTMENTS  (tele-dentistry booking)
# ══════════════════════════════════════════════════════════════════════════════

_appointments: dict = {}  # appt_id -> appointment dict

# Seed some demo appointments
_appointments["APT-DEMO-001"] = {
    "id": "APT-DEMO-001", "patientId": "patient@oralai.com",
    "dentist": "Dr. Arjun Sharma", "specialty": "Periodontist", "avatar": "AS",
    "date": "2026-10-05", "time": "10:30 AM", "mode": "video",
    "status": "confirmed", "notes": "Follow-up on plaque findings",
    "createdAt": "2026-09-01T10:00:00Z",
}
_appointments["APT-DEMO-002"] = {
    "id": "APT-DEMO-002", "patientId": "patient@oralai.com",
    "dentist": "Dr. Priya Nair", "specialty": "Orthodontist", "avatar": "PN",
    "date": "2026-10-18", "time": "02:00 PM", "mode": "in-person",
    "status": "pending", "notes": "Enamel demineralization review",
    "createdAt": "2026-09-02T12:00:00Z",
}


@app.route("/api/appointments", methods=["GET"])
def get_appointments():
    uid, role = _require_role("patient", "doctor", "admin")
    if role in ("doctor",):
        appts = [a for a in _appointments.values() if a.get("doctorId") == uid]
    elif role == "admin":
        appts = list(_appointments.values())
    else:
        appts = [a for a in _appointments.values() if a.get("patientId") == uid]
    status_filter = request.args.get("status")
    if status_filter:
        appts = [a for a in appts if a.get("status") == status_filter]
    # Sort upcoming first
    appts.sort(key=lambda x: x.get("date", ""), reverse=False)
    return jsonify({"appointments": appts, "total": len(appts)}), 200


@app.route("/api/appointments", methods=["POST"])
def create_appointment():
    uid, role = _require_role("patient", "admin")
    data = request.get_json(force=True) or {}
    required = ("dentist", "date", "time")
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {missing}"}), 400

    appt_id = "APT-" + str(_uuid_mod.uuid4())[:8].upper()
    appt = {
        "id":         appt_id,
        "patientId":  uid,
        "dentist":    data["dentist"],
        "specialty":  data.get("specialty", "General Dentistry"),
        "avatar":     data.get("avatar", (data["dentist"].split()[-1][:2]).upper()),
        "date":       data["date"],
        "time":       data["time"],
        "mode":       data.get("mode", "video"),
        "status":     "confirmed",
        "notes":      data.get("notes", ""),
        "scanId":     data.get("scanId"),    # optional: attach a scan
        "createdAt":  datetime.now(timezone.utc).isoformat(),
    }
    _appointments[appt_id] = appt
    _add_audit("appointment_created", uid, f"Appointment {appt_id} with {data['dentist']} on {data['date']}")
    log.info("Appointment created: %s by %s", appt_id, uid)
    return jsonify({"appointment": appt, "message": "Appointment booked"}), 201


@app.route("/api/appointments/<appt_id>", methods=["GET"])
def get_appointment(appt_id):
    uid, role = _require_role("patient", "doctor", "admin")
    appt = _appointments.get(appt_id)
    if not appt:
        return jsonify({"error": "Appointment not found"}), 404
    if role == "patient" and appt.get("patientId") != uid:
        return jsonify({"error": "Access denied"}), 403
    return jsonify(appt), 200


@app.route("/api/appointments/<appt_id>", methods=["PUT"])
def update_appointment(appt_id):
    uid, role = _require_role("patient", "doctor", "admin")
    appt = _appointments.get(appt_id)
    if not appt:
        return jsonify({"error": "Appointment not found"}), 404
    if role == "patient" and appt.get("patientId") != uid:
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json(force=True) or {}
    mutable = ("date", "time", "mode", "notes", "status")
    for k in mutable:
        if k in data:
            appt[k] = data[k]
    appt["updatedAt"] = datetime.now(timezone.utc).isoformat()
    _add_audit("appointment_updated", uid, f"Appointment {appt_id} updated — status: {appt.get('status')}")
    return jsonify({"appointment": appt, "message": "Appointment updated"}), 200


@app.route("/api/appointments/<appt_id>", methods=["DELETE"])
def delete_appointment(appt_id):
    uid, role = _require_role("patient", "admin")
    appt = _appointments.get(appt_id)
    if not appt:
        return jsonify({"error": "Appointment not found"}), 404
    if role == "patient" and appt.get("patientId") != uid:
        return jsonify({"error": "Access denied"}), 403
    _appointments.pop(appt_id)
    _add_audit("appointment_deleted", uid, f"Appointment {appt_id} deleted")
    return jsonify({"message": "Appointment deleted"}), 200


# ── List available specialists ────────────────────────────────────────────────
@app.route("/api/specialists", methods=["GET"])
def get_specialists():
    """Return the list of bookable dental specialists."""
    specialists = [
        {"name": "Dr. Arjun Sharma",   "specialty": "Periodontist",    "rating": 4.9, "reviews": 142, "avatar": "AS", "available": ["Mon", "Wed", "Fri"], "nextSlot": "Oct 5, 10:30 AM"},
        {"name": "Dr. Priya Nair",     "specialty": "Orthodontist",    "rating": 4.8, "reviews": 98,  "avatar": "PN", "available": ["Tue", "Thu"],         "nextSlot": "Oct 18, 2:00 PM"},
        {"name": "Dr. Rahul Mehta",    "specialty": "Endodontist",     "rating": 4.7, "reviews": 76,  "avatar": "RM", "available": ["Mon", "Tue", "Thu"],   "nextSlot": "Oct 22, 11:00 AM"},
        {"name": "Dr. Sneha Kulkarni", "specialty": "General Dentist", "rating": 4.9, "reviews": 203, "avatar": "SK", "available": ["Mon-Fri"],             "nextSlot": "Sep 25, 9:00 AM"},
        {"name": "Dr. Farhan Ali",     "specialty": "Oral Surgeon",    "rating": 4.6, "reviews": 61,  "avatar": "FA", "available": ["Wed", "Fri"],           "nextSlot": "Oct 8, 3:00 PM"},
        {"name": "Dr. Meera Iyer",     "specialty": "Pedodontist",     "rating": 5.0, "reviews": 88,  "avatar": "MI", "available": ["Mon", "Wed"],           "nextSlot": "Oct 1, 10:00 AM"},
    ]
    specialty_filter = request.args.get("specialty")
    if specialty_filter:
        specialists = [s for s in specialists if specialty_filter.lower() in s["specialty"].lower()]
    return jsonify({"specialists": specialists, "total": len(specialists)}), 200


# ══════════════════════════════════════════════════════════════════════════════
#  SCAN MANAGEMENT  (delete, compare, export, progress)
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/scans/<sid>", methods=["DELETE"])
def delete_scan(sid):
    uid, role = _require_role("patient", "admin")
    idx = next((i for i, s in enumerate(_scans) if s["id"] == sid), None)
    if idx is None:
        return jsonify({"error": "Scan not found"}), 404
    scan = _scans[idx]
    if role == "patient" and scan.get("patientId") and scan["patientId"] != uid:
        return jsonify({"error": "Access denied"}), 403
    _scans.pop(idx)
    _add_audit("scan_deleted", uid, f"Scan {sid} deleted")
    return jsonify({"message": "Scan deleted"}), 200


@app.route("/api/scans/compare", methods=["GET"])
def compare_scans():
    """
    Compare two scans side by side.
    Query params: a=<scan_id>&b=<scan_id>
    """
    uid, role = _require_role("patient", "doctor", "admin")
    id_a = request.args.get("a", "").strip()
    id_b = request.args.get("b", "").strip()
    if not id_a or not id_b:
        return jsonify({"error": "Both 'a' and 'b' scan IDs are required"}), 400
    scan_a = next((s for s in _scans if s["id"] == id_a), None)
    scan_b = next((s for s in _scans if s["id"] == id_b), None)
    if not scan_a:
        return jsonify({"error": f"Scan '{id_a}' not found"}), 404
    if not scan_b:
        return jsonify({"error": f"Scan '{id_b}' not found"}), 404

    score_diff  = scan_a.get("score", 0) - scan_b.get("score", 0)
    conf_diff   = (scan_a.get("confidence", 0) or 0) - (scan_b.get("confidence", 0) or 0)

    # Identify findings present in A but not B, and vice-versa
    def _cond_set(scan):
        return {(f["condition"] if isinstance(f, dict) else f) for f in (scan.get("findings") or [])}

    conds_a, conds_b = _cond_set(scan_a), _cond_set(scan_b)
    new_in_a    = sorted(conds_a - conds_b)
    resolved_in_a = sorted(conds_b - conds_a)

    trend = "improved" if score_diff > 0 else "worsened" if score_diff < 0 else "stable"

    return jsonify({
        "scan_a":       scan_a,
        "scan_b":       scan_b,
        "score_diff":   score_diff,
        "conf_diff":    round(conf_diff, 1),
        "trend":        trend,
        "new_findings":      new_in_a,
        "resolved_findings": resolved_in_a,
        "summary": (
            f"Score {'improved' if score_diff > 0 else 'worsened' if score_diff < 0 else 'unchanged'} "
            f"by {abs(score_diff)} points between the two scans."
        ),
    }), 200


@app.route("/api/scans/export", methods=["GET"])
def export_scans_csv():
    """Export all scans for the authenticated patient as CSV."""
    uid, role = _require_role("patient", "admin")
    if role == "patient":
        scans_to_export = [s for s in _scans if not s.get("patientId") or s.get("patientId") == uid]
    else:
        scans_to_export = _scans

    import io as _io, csv as _csv
    buf = _io.StringIO()
    writer = _csv.writer(buf)
    writer.writerow(["ID", "Date", "Score", "Confidence", "Severity", "Urgency",
                     "Findings", "Model", "Demo", "ProcessingTime"])
    for s in scans_to_export:
        findings_str = "; ".join(
            (f["condition"] if isinstance(f, dict) else str(f))
            for f in (s.get("findings") or [])
        )
        writer.writerow([
            s.get("id", ""), s.get("date", ""), s.get("score", ""),
            s.get("confidence", ""), s.get("severity", ""), s.get("urgency", ""),
            findings_str, s.get("model", ""), s.get("demoMode", ""),
            s.get("processingTime", ""),
        ])
    csv_content = buf.getvalue()
    return csv_content, 200, {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": f"attachment; filename=oralai-scans-{int(time.time())}.csv",
    }


@app.route("/api/progress", methods=["GET"])
def get_progress():
    """
    Return time-series score data and trend stats for a patient.
    Optional query params: limit (default 20)
    """
    uid, role = _require_role("patient", "doctor", "admin")
    if role == "doctor":
        patient_id = request.args.get("patientId", uid)
        scans_list = [s for s in _scans if s.get("patientId") == patient_id]
    elif role == "admin":
        patient_id = request.args.get("patientId")
        scans_list = [s for s in _scans if not patient_id or s.get("patientId") == patient_id]
    else:
        scans_list = [s for s in _scans if not s.get("patientId") or s.get("patientId") == uid]

    limit = min(int(request.args.get("limit", 20)), 100)
    ordered = list(reversed(scans_list))[:limit]  # oldest → newest

    scores = [s.get("score", 0) for s in ordered]
    avg    = round(sum(scores) / max(len(scores), 1), 1)
    best   = max(scores, default=0)
    worst  = min(scores, default=0)
    trend  = "improving" if len(scores) >= 2 and scores[-1] > scores[0] else \
             "declining"  if len(scores) >= 2 and scores[-1] < scores[0] else "stable"

    # Findings frequency across all scans
    finding_freq: dict = {}
    for s in scans_list:
        for f in (s.get("findings") or []):
            name = f["condition"] if isinstance(f, dict) else str(f)
            finding_freq[name] = finding_freq.get(name, 0) + 1

    return jsonify({
        "scans":          ordered,
        "total_scans":    len(scans_list),
        "scores":         scores,
        "dates":          [s.get("date", "") for s in ordered],
        "avg_score":      avg,
        "best_score":     best,
        "worst_score":    worst,
        "trend":          trend,
        "finding_frequency": sorted(finding_freq.items(), key=lambda x: -x[1]),
    }), 200


# ══════════════════════════════════════════════════════════════════════════════
#  SYMPTOM CHECKER  —  server-side risk assessment
# ══════════════════════════════════════════════════════════════════════════════

# Weight table mirrors the frontend's _computeRisk() exactly
_SYMPTOM_WEIGHTS = {
    "pain":        12,
    "bleeding":    10,
    "sensitivity":  8,
    "swelling":    15,
    "ulcer":       15,
    "tobacco":     10,
    "diabetes":     8,
    "history":      7,
}
_SYMPTOM_MAX_RAW = 3 * sum(_SYMPTOM_WEIGHTS.values())   # 3 × 85 = 255


def _compute_symptom_risk(answers: dict) -> dict:
    """
    Mirror of the frontend _computeRisk().  Accepts {symptom_id: 0-3} dict.
    Returns risk_score (0-100), urgency, flags, summary, actions.
    """
    raw = sum(answers.get(k, 0) * w for k, w in _SYMPTOM_WEIGHTS.items())
    risk_score = round((raw / _SYMPTOM_MAX_RAW) * 100)
    urgency = "high" if risk_score >= 60 else "medium" if risk_score >= 30 else "low"

    flags = []
    if answers.get("pain",        0) >= 2: flags.append("Pain")
    if answers.get("bleeding",    0) >= 2: flags.append("Gum Bleeding")
    if answers.get("swelling",    0) >= 2: flags.append("Swelling")
    if answers.get("ulcer",       0) >= 2: flags.append("Ulcer >1 week")
    if answers.get("tobacco",     0) >= 2: flags.append("Tobacco Use")
    if answers.get("diabetes",    0) >= 2: flags.append("Diabetes")
    if answers.get("sensitivity", 0) >= 2: flags.append("Sensitivity")
    if answers.get("history",     0) >= 2: flags.append("Prior Disease")

    emergency = (
        answers.get("swelling", 0) >= 3 or
        answers.get("ulcer", 0) >= 3 or
        (answers.get("pain", 0) >= 3 and answers.get("swelling", 0) >= 2)
    )

    summaries = {
        "low":    "Your symptom profile suggests low immediate risk. Maintain regular hygiene and schedule a routine check-up.",
        "medium": "Moderate symptoms detected. A dentist visit within 2–4 weeks is recommended.",
        "high":   "High-risk symptom profile. Please consult a dentist as soon as possible.",
    }
    actions_map = {
        "low":    ["Continue brushing twice daily with fluoride toothpaste",
                   "Floss daily to prevent plaque buildup",
                   "Schedule routine dental check-up within 6 months",
                   "Re-assess if symptoms worsen"],
        "medium": ["Book a dentist appointment within 2–4 weeks",
                   "Avoid tobacco, alcohol, and acidic foods",
                   "Use antiseptic mouthwash twice daily",
                   "Upload a dental scan for AI screening"],
        "high":   ["Contact your dentist today or visit an emergency dental clinic",
                   "Do not delay — some conditions worsen rapidly",
                   "If severe swelling or breathing difficulty, call emergency services",
                   "Upload a dental scan and share the report with your dentist immediately"],
    }

    return {
        "risk_score": risk_score,
        "urgency":    urgency,
        "flags":      flags,
        "summary":    summaries[urgency],
        "actions":    actions_map[urgency],
        "emergency":  emergency,
        "answers":    answers,
    }


@app.route("/api/symptom/assess", methods=["POST"])
def symptom_assess():
    """
    Compute a symptom risk score from an 8-question answer set.

    Body (JSON):
    {
      "answers": {
        "pain": 0-3, "bleeding": 0-3, "sensitivity": 0-3,
        "swelling": 0-3, "ulcer": 0-3, "tobacco": 0-3,
        "diabetes": 0-3, "history": 0-3
      },
      "scan_score": 75,          // optional — latest AI scan score
      "sensors":   {...}         // optional — IoT readings for combined risk
    }
    """
    uid, role = _require_role("patient", "doctor", "admin")
    data    = request.get_json(force=True) or {}
    answers = data.get("answers") or {}

    # Validate value ranges
    for k, v in answers.items():
        if k in _SYMPTOM_WEIGHTS:
            try:
                answers[k] = max(0, min(3, int(v)))
            except (TypeError, ValueError):
                answers[k] = 0

    result = _compute_symptom_risk(answers)

    # Combined risk: blend symptom risk with AI scan score + IoT if provided
    scan_score = data.get("scan_score")
    if scan_score is not None:
        try:
            scan_score = float(scan_score)
            ph   = float((data.get("sensors") or {}).get("ph",          7.0))
            bact = float((data.get("sensors") or {}).get("bacterial",   40))
            ph_risk   = 15 if ph   < 6.5 else 0
            bact_risk = 15 if bact > 60  else (8 if bact > 50 else 0)
            combined_risk = min(100, round(
                result["risk_score"] * 0.5 +
                (100 - scan_score)   * 0.35 +
                ph_risk + bact_risk
            ))
            result["combined_risk"] = combined_risk
            result["scan_score"]    = scan_score
        except (TypeError, ValueError):
            pass

    # Persist as most recent symptom check for this user
    _add_audit("symptom_check", uid, f"Symptom check — risk={result['risk_score']}  urgency={result['urgency']}")
    return jsonify(result), 200


# ══════════════════════════════════════════════════════════════════════════════
#  REMINDERS
# ══════════════════════════════════════════════════════════════════════════════

_reminders: dict = {}   # reminder_id -> reminder dict

# Seed default reminders for demo patient
_reminders["REM-DEMO-001"] = {
    "id": "REM-DEMO-001", "patientId": "patient@oralai.com",
    "type": "brushing", "title": "Morning Brush", "frequency": "daily",
    "time": "08:00", "enabled": True, "streak": 5,
    "lastDone": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    "createdAt": "2026-09-01T00:00:00Z",
}
_reminders["REM-DEMO-002"] = {
    "id": "REM-DEMO-002", "patientId": "patient@oralai.com",
    "type": "flossing", "title": "Evening Floss", "frequency": "daily",
    "time": "21:00", "enabled": True, "streak": 3,
    "lastDone": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    "createdAt": "2026-09-01T00:00:00Z",
}
_reminders["REM-DEMO-003"] = {
    "id": "REM-DEMO-003", "patientId": "patient@oralai.com",
    "type": "scan", "title": "Monthly Scan", "frequency": "monthly",
    "time": "10:00", "enabled": True, "streak": 2,
    "lastDone": "2026-09-01",
    "createdAt": "2026-08-01T00:00:00Z",
}


@app.route("/api/reminders", methods=["GET"])
def get_reminders():
    uid, role = _require_role("patient", "admin")
    if role == "admin":
        result = list(_reminders.values())
    else:
        result = [r for r in _reminders.values() if r.get("patientId") == uid]
    return jsonify({"reminders": result, "total": len(result)}), 200


@app.route("/api/reminders", methods=["POST"])
def create_reminder():
    uid, role = _require_role("patient", "admin")
    data = request.get_json(force=True) or {}
    if not data.get("title"):
        return jsonify({"error": "title is required"}), 400

    rem_id = "REM-" + str(_uuid_mod.uuid4())[:8].upper()
    reminder = {
        "id":         rem_id,
        "patientId":  uid,
        "type":       data.get("type", "custom"),
        "title":      data["title"],
        "frequency":  data.get("frequency", "daily"),
        "time":       data.get("time", "08:00"),
        "enabled":    data.get("enabled", True),
        "streak":     0,
        "lastDone":   None,
        "notes":      data.get("notes", ""),
        "createdAt":  datetime.now(timezone.utc).isoformat(),
    }
    _reminders[rem_id] = reminder
    _add_audit("reminder_created", uid, f"Reminder '{reminder['title']}' created")
    return jsonify({"reminder": reminder, "message": "Reminder created"}), 201


@app.route("/api/reminders/<rem_id>", methods=["PUT"])
def update_reminder(rem_id):
    uid, role = _require_role("patient", "admin")
    reminder = _reminders.get(rem_id)
    if not reminder:
        return jsonify({"error": "Reminder not found"}), 404
    if role == "patient" and reminder.get("patientId") != uid:
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json(force=True) or {}
    mutable = ("title", "type", "frequency", "time", "enabled", "notes")
    for k in mutable:
        if k in data:
            reminder[k] = data[k]
    # Mark as done — increments streak
    if data.get("markDone"):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if reminder.get("lastDone") != today:
            reminder["streak"] = reminder.get("streak", 0) + 1
            reminder["lastDone"] = today
    reminder["updatedAt"] = datetime.now(timezone.utc).isoformat()
    return jsonify({"reminder": reminder, "message": "Reminder updated"}), 200


@app.route("/api/reminders/<rem_id>", methods=["DELETE"])
def delete_reminder(rem_id):
    uid, role = _require_role("patient", "admin")
    reminder = _reminders.get(rem_id)
    if not reminder:
        return jsonify({"error": "Reminder not found"}), 404
    if role == "patient" and reminder.get("patientId") != uid:
        return jsonify({"error": "Access denied"}), 403
    _reminders.pop(rem_id)
    _add_audit("reminder_deleted", uid, f"Reminder {rem_id} deleted")
    return jsonify({"message": "Reminder deleted"}), 200


# ══════════════════════════════════════════════════════════════════════════════
#  TREATMENT LOG
# ══════════════════════════════════════════════════════════════════════════════

_treatments: dict = {}

_treatments["TRT-DEMO-001"] = {
    "id": "TRT-DEMO-001", "patientId": "patient@oralai.com",
    "type": "Professional Cleaning", "dentist": "Dr. Arjun Sharma",
    "date": "2026-09-15", "notes": "Full mouth scaling and polishing.",
    "outcome": "Improved", "followUpDate": "2026-12-15",
    "createdAt": "2026-09-15T10:00:00Z",
}
_treatments["TRT-DEMO-002"] = {
    "id": "TRT-DEMO-002", "patientId": "patient@oralai.com",
    "type": "Fluoride Application", "dentist": "Dr. Priya Nair",
    "date": "2026-08-10", "notes": "Fluoride varnish applied to upper incisors.",
    "outcome": "In Progress", "followUpDate": "2026-11-10",
    "createdAt": "2026-08-10T09:00:00Z",
}


@app.route("/api/treatments", methods=["GET"])
def get_treatments():
    uid, role = _require_role("patient", "doctor", "admin")
    if role == "patient":
        result = [t for t in _treatments.values() if t.get("patientId") == uid]
    elif role == "doctor":
        result = [t for t in _treatments.values() if t.get("doctorId") == uid or t.get("patientId") == uid]
    else:
        result = list(_treatments.values())
    result.sort(key=lambda x: x.get("date", ""), reverse=True)
    return jsonify({"treatments": result, "total": len(result)}), 200


@app.route("/api/treatments", methods=["POST"])
def create_treatment():
    uid, role = _require_role("patient", "doctor", "admin")
    data = request.get_json(force=True) or {}
    if not data.get("type"):
        return jsonify({"error": "type is required"}), 400

    trt_id = "TRT-" + str(_uuid_mod.uuid4())[:8].upper()
    treatment = {
        "id":           trt_id,
        "patientId":    data.get("patientId", uid),
        "doctorId":     uid if role == "doctor" else data.get("doctorId"),
        "type":         data["type"],
        "dentist":      data.get("dentist", ""),
        "date":         data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "notes":        data.get("notes", ""),
        "outcome":      data.get("outcome", "Scheduled"),
        "followUpDate": data.get("followUpDate"),
        "medications":  data.get("medications", []),
        "createdAt":    datetime.now(timezone.utc).isoformat(),
    }
    _treatments[trt_id] = treatment
    _add_audit("treatment_logged", uid, f"Treatment '{treatment['type']}' logged on {treatment['date']}")
    return jsonify({"treatment": treatment, "message": "Treatment logged"}), 201


@app.route("/api/treatments/<trt_id>", methods=["PUT"])
def update_treatment(trt_id):
    uid, role = _require_role("patient", "doctor", "admin")
    treatment = _treatments.get(trt_id)
    if not treatment:
        return jsonify({"error": "Treatment not found"}), 404
    if role == "patient" and treatment.get("patientId") != uid:
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json(force=True) or {}
    for k in ("type", "dentist", "date", "notes", "outcome", "followUpDate", "medications"):
        if k in data:
            treatment[k] = data[k]
    treatment["updatedAt"] = datetime.now(timezone.utc).isoformat()
    return jsonify({"treatment": treatment, "message": "Treatment updated"}), 200


@app.route("/api/treatments/<trt_id>", methods=["DELETE"])
def delete_treatment(trt_id):
    uid, role = _require_role("patient", "admin")
    treatment = _treatments.get(trt_id)
    if not treatment:
        return jsonify({"error": "Treatment not found"}), 404
    if role == "patient" and treatment.get("patientId") != uid:
        return jsonify({"error": "Access denied"}), 403
    _treatments.pop(trt_id)
    _add_audit("treatment_deleted", uid, f"Treatment {trt_id} deleted")
    return jsonify({"message": "Treatment deleted"}), 200


# ══════════════════════════════════════════════════════════════════════════════
#  FAMILY PROFILES
# ══════════════════════════════════════════════════════════════════════════════

_family_profiles: dict = {}


@app.route("/api/family", methods=["GET"])
def get_family():
    uid, role = _require_role("patient", "admin")
    if role == "admin":
        members = list(_family_profiles.values())
    else:
        members = [m for m in _family_profiles.values() if m.get("ownerId") == uid]
    return jsonify({"members": members, "total": len(members)}), 200


@app.route("/api/family", methods=["POST"])
def create_family_member():
    uid, role = _require_role("patient", "admin")
    data = request.get_json(force=True) or {}
    if not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    member_id = "FAM-" + str(_uuid_mod.uuid4())[:8].upper()
    member = {
        "id":           member_id,
        "ownerId":      uid,
        "name":         data["name"],
        "relationship": data.get("relationship", "Other"),
        "ageGroup":     data.get("ageGroup", "Adult"),
        "dob":          data.get("dob"),
        "color":        data.get("color", "#0a8aff"),
        "avatar":       data.get("avatar", data["name"][0].upper()),
        "notes":        data.get("notes", ""),
        "conditions":   data.get("conditions", []),
        "createdAt":    datetime.now(timezone.utc).isoformat(),
    }
    _family_profiles[member_id] = member
    _add_audit("family_member_added", uid, f"Family member '{member['name']}' added")
    return jsonify({"member": member, "message": "Family member added"}), 201


@app.route("/api/family/<member_id>", methods=["PUT"])
def update_family_member(member_id):
    uid, role = _require_role("patient", "admin")
    member = _family_profiles.get(member_id)
    if not member:
        return jsonify({"error": "Member not found"}), 404
    if role == "patient" and member.get("ownerId") != uid:
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json(force=True) or {}
    for k in ("name", "relationship", "ageGroup", "dob", "color", "avatar", "notes", "conditions"):
        if k in data:
            member[k] = data[k]
    member["updatedAt"] = datetime.now(timezone.utc).isoformat()
    return jsonify({"member": member, "message": "Member updated"}), 200


@app.route("/api/family/<member_id>", methods=["DELETE"])
def delete_family_member(member_id):
    uid, role = _require_role("patient", "admin")
    member = _family_profiles.get(member_id)
    if not member:
        return jsonify({"error": "Member not found"}), 404
    if role == "patient" and member.get("ownerId") != uid:
        return jsonify({"error": "Access denied"}), 403
    _family_profiles.pop(member_id)
    _add_audit("family_member_deleted", uid, f"Family member {member_id} removed")
    return jsonify({"message": "Member deleted"}), 200


# ══════════════════════════════════════════════════════════════════════════════
#  NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════

_notifications: dict = {}

# Seed demo notifications
for _n_id, _n_data in [
    ("NOTIF-001", {"icon": "🦷", "message": "Scan reminder: Monthly scan due in 3 days",   "time": "2 hours ago",  "read": False}),
    ("NOTIF-002", {"icon": "🤖", "message": "AI tip: Increase flossing frequency",           "time": "Yesterday",    "read": False}),
    ("NOTIF-003", {"icon": "📅", "message": "Appointment confirmed: Dr. Arjun Sharma",       "time": "2 days ago",   "read": True }),
    ("NOTIF-004", {"icon": "⚠️","message": "pH sensor reading slightly low (6.4)",           "time": "3 days ago",   "read": True }),
]:
    _notifications[_n_id] = {
        "id": _n_id, "patientId": "patient@oralai.com",
        "category": "system",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        **_n_data,
    }


@app.route("/api/notifications", methods=["GET"])
def get_notifications():
    uid, role = _require_role("patient", "doctor", "admin")
    if role == "admin":
        notifs = list(_notifications.values())
    else:
        notifs = [n for n in _notifications.values() if n.get("patientId") == uid or n.get("patientId") is None]
    # Optionally filter unread only
    if request.args.get("unread") == "true":
        notifs = [n for n in notifs if not n.get("read")]
    unread_count = sum(1 for n in notifs if not n.get("read"))
    return jsonify({"notifications": notifs, "total": len(notifs), "unread": unread_count}), 200


@app.route("/api/notifications/mark-read", methods=["POST"])
def mark_notifications_read():
    uid, role = _require_role("patient", "doctor", "admin")
    data = request.get_json(force=True) or {}
    ids  = data.get("ids")   # list of notification IDs, or None to mark all

    marked = 0
    for n in _notifications.values():
        if n.get("patientId") == uid or role == "admin":
            if ids is None or n["id"] in ids:
                n["read"] = True
                marked += 1
    return jsonify({"message": f"{marked} notification(s) marked as read", "marked": marked}), 200


@app.route("/api/notifications/<notif_id>", methods=["DELETE"])
def delete_notification(notif_id):
    uid, role = _require_role("patient", "admin")
    notif = _notifications.get(notif_id)
    if not notif:
        return jsonify({"error": "Notification not found"}), 404
    if role == "patient" and notif.get("patientId") != uid:
        return jsonify({"error": "Access denied"}), 403
    _notifications.pop(notif_id)
    return jsonify({"message": "Notification deleted"}), 200


# ══════════════════════════════════════════════════════════════════════════════
#  CONSENT  (fine-grained per-category toggles)
# ══════════════════════════════════════════════════════════════════════════════

_patient_consents: dict = {}  # patient_id -> consent dict

_DEFAULT_CONSENT = {
    "aiAnalysis":        True,
    "dataStorage":       True,
    "clinicSharing":     False,
    "researchAnonymous": False,
    "thirdParty":        False,
    "agreedAt":          None,
}


@app.route("/api/consent", methods=["GET"])
def get_consent():
    uid, role = _require_role("patient", "admin")
    consent = _patient_consents.get(uid, dict(_DEFAULT_CONSENT))
    return jsonify(consent), 200


@app.route("/api/consent", methods=["PUT"])
def update_consent():
    uid, role = _require_role("patient", "admin")
    data = request.get_json(force=True) or {}
    existing = _patient_consents.get(uid, dict(_DEFAULT_CONSENT))

    allowed_keys = ("aiAnalysis", "dataStorage", "clinicSharing", "researchAnonymous", "thirdParty")
    for k in allowed_keys:
        if k in data:
            existing[k] = bool(data[k])
    existing["agreedAt"] = datetime.now(timezone.utc).isoformat()
    _patient_consents[uid] = existing
    _add_audit("consent_updated", uid, "Consent preferences updated")
    return jsonify({"consent": existing, "message": "Consent preferences saved"}), 200


# ══════════════════════════════════════════════════════════════════════════════
#  SENSOR HISTORY  —  paginated time-series query
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/sensors/history", methods=["GET"])
def sensor_history():
    """
    Return rolling in-memory sensor history.
    The backend stores the last 100 readings appended by /api/sensors/update.
    """
    _require_role("patient", "doctor", "admin")
    limit = min(int(request.args.get("limit", 20)), 100)
    metric = request.args.get("metric")   # optional: ph | temperature | bacterial | moisture
    history = _sensor_history[-limit:]
    if metric and metric in ("ph", "temperature", "bacterial", "moisture"):
        history = [{"timestamp": h["timestamp"], metric: h.get(metric)} for h in history]
    return jsonify({"history": history, "total": len(_sensor_history), "metric": metric}), 200


# Extend the existing update_sensors endpoint to append to rolling history
_sensor_history: list = []   # list of {timestamp, ph, temperature, bacterial, moisture}

# Monkey-patch update_sensors to also append to history
_original_update_sensors = update_sensors


def update_sensors():           # type: ignore[misc]
    response = _original_update_sensors()
    _sensor_history.append({
        "timestamp":   _sensors["lastUpdated"],
        "ph":          _sensors["ph"],
        "temperature": _sensors["temperature"],
        "bacterial":   _sensors["bacterial"],
        "moisture":    _sensors["moisture"],
    })
    if len(_sensor_history) > 100:
        _sensor_history.pop(0)
    return response


app.view_functions["update_sensors"] = update_sensors


# ══════════════════════════════════════════════════════════════════════════════
#  PATIENT ANALYTICS  (personal summary)
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/analytics", methods=["GET"])
def patient_analytics():
    """
    Returns a summary of the requesting patient's scan performance,
    disease trends, and AI model accuracy breakdown.
    """
    uid, role = _require_role("patient", "admin")
    if role == "admin":
        patient_id = request.args.get("patientId", uid)
        scans_list = [s for s in _scans if not patient_id or s.get("patientId") == patient_id]
    else:
        scans_list = [s for s in _scans if not s.get("patientId") or s.get("patientId") == uid]

    scan_count = len(scans_list)
    scores     = [s.get("score", 0) for s in scans_list]
    confs      = [s.get("confidence", 0) or 0 for s in scans_list]
    avg_score  = round(sum(scores) / max(scan_count, 1), 1)
    avg_conf   = round(sum(confs)  / max(scan_count, 1), 1)
    best_score = max(scores, default=0)
    worst_score= min(scores, default=0)

    # Score buckets
    score_buckets = {
        "good":  sum(1 for s in scores if s >= 80),
        "fair":  sum(1 for s in scores if 60 <= s < 80),
        "poor":  sum(1 for s in scores if s < 60),
    }

    # Confidence buckets
    conf_buckets = {
        "90-100": sum(1 for c in confs if c >= 90),
        "80-89":  sum(1 for c in confs if 80 <= c < 90),
        "70-79":  sum(1 for c in confs if 70 <= c < 80),
        "<70":    sum(1 for c in confs if c < 70),
    }

    # Finding frequency across all scans
    finding_freq: dict = {}
    for s in scans_list:
        for f in (s.get("findings") or []):
            name = f["condition"] if isinstance(f, dict) else str(f)
            finding_freq[name] = finding_freq.get(name, 0) + 1
    top_findings = sorted(finding_freq.items(), key=lambda x: -x[1])[:8]
    top_finding  = top_findings[0][0] if top_findings else "—"

    # Trend direction (last 5 scans, oldest→newest)
    recent_scores = list(reversed([s.get("score", 0) for s in scans_list[:5]]))
    trend = (
        "improving" if len(recent_scores) >= 2 and recent_scores[-1] > recent_scores[0] else
        "declining" if len(recent_scores) >= 2 and recent_scores[-1] < recent_scores[0] else
        "stable"
    )

    # CNN paper metrics (static — from research)
    cnn_metrics = {
        "accuracy":    95.2,
        "precision":   93.8,
        "recall":      94.5,
        "f1_score":    88.0,
        "specificity": 96.1,
        "sensitivity": 94.5,
    }

    return jsonify({
        "patient_id":      uid,
        "total_scans":     scan_count,
        "avg_score":       avg_score,
        "avg_confidence":  avg_conf,
        "best_score":      best_score,
        "worst_score":     worst_score,
        "trend":           trend,
        "top_finding":     top_finding,
        "score_buckets":   score_buckets,
        "conf_buckets":    conf_buckets,
        "top_findings":    [{"condition": k, "count": v} for k, v in top_findings],
        "cnn_metrics":     cnn_metrics,
        "score_history":   list(reversed(scores[:20])),   # oldest→newest
        "date_history":    [s.get("date", "") for s in reversed(scans_list[:20])],
    }), 200


# ══════════════════════════════════════════════════════════════════════════════
#  CLINIC ANALYTICS  (doctor / admin)
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/clinic/analytics", methods=["GET"])
def clinic_analytics():
    """
    Aggregate clinic-wide metrics: disease distribution, confidence
    distribution, score distribution, review queue stats.
    """
    uid, role = _require_role("doctor", "admin")
    all_scans   = _scans
    all_reviews = list(_doctor_reviews.values())
    scan_count  = len(all_scans)

    # Active shares for this doctor
    if role == "doctor":
        active_shares = [s for s in _report_shares.values()
                         if s.get("doctorId") == uid and not s.get("revoked")]
        pending_review = sum(
            1 for s in active_shares
            if not any(r.get("scanId") == s.get("scanId") for r in all_reviews)
        )
    else:
        active_shares  = [s for s in _report_shares.values() if not s.get("revoked")]
        pending_review = sum(
            1 for s in active_shares
            if not any(r.get("scanId") == s.get("scanId") for r in all_reviews)
        )

    # Disease distribution
    disease_map: dict = {}
    for s in all_scans:
        for f in (s.get("findings") or []):
            name = f["condition"] if isinstance(f, dict) else str(f)
            disease_map[name] = disease_map.get(name, 0) + 1
    top_diseases = sorted(disease_map.items(), key=lambda x: -x[1])[:8]

    # Confidence distribution
    conf_buckets = {"<70": 0, "70-79": 0, "80-89": 0, "90-100": 0}
    for s in all_scans:
        c = s.get("confidence") or 0
        if   c < 70:  conf_buckets["<70"]    += 1
        elif c < 80:  conf_buckets["70-79"]  += 1
        elif c < 90:  conf_buckets["80-89"]  += 1
        else:         conf_buckets["90-100"] += 1

    # Score distribution
    score_buckets = {"poor": 0, "fair": 0, "good": 0}
    for s in all_scans:
        sc = s.get("score", 0)
        if   sc >= 80: score_buckets["good"] += 1
        elif sc >= 60: score_buckets["fair"] += 1
        else:          score_buckets["poor"] += 1

    # Average turnaround
    avg_turnaround_ms = None
    tts = [s.get("processingTime") for s in all_scans if s.get("processingTime")]
    if tts:
        def _parse_ms(pt):
            try:
                return float(str(pt).replace("ms", "").replace("s", "000").strip())
            except Exception:
                return None
        vals = [v for v in map(_parse_ms, tts) if v]
        avg_turnaround_ms = round(sum(vals) / len(vals)) if vals else None

    # AI accuracy from doctor reviews
    confirmed  = sum(1 for r in all_reviews if r.get("ai_correct") is True)
    corrected  = sum(1 for r in all_reviews if r.get("ai_correct") is False)
    partial    = sum(1 for r in all_reviews if r.get("ai_correct") == "partially_correct")
    total_rev  = max(len(all_reviews), 1)
    accuracy_rate = round(confirmed / total_rev * 100, 1)

    return jsonify({
        "total_scans":      scan_count,
        "pending_review":   pending_review,
        "total_reviews":    len(all_reviews),
        "avg_turnaround_ms":avg_turnaround_ms,
        "disease_distribution": [{"condition": k, "count": v} for k, v in top_diseases],
        "conf_buckets":     conf_buckets,
        "score_buckets":    score_buckets,
        "ai_accuracy": {
            "confirmed":  confirmed,
            "corrected":  corrected,
            "partial":    partial,
            "total":      len(all_reviews),
            "rate":       accuracy_rate,
        },
    }), 200


@app.route("/api/doctor/patients", methods=["GET"])
def list_doctor_patients():
    """List all patients who have shared at least one active report with this doctor."""
    uid, role = _require_role("doctor", "admin")
    if role == "admin":
        active_shares = [s for s in _report_shares.values() if not s.get("revoked")]
    else:
        active_shares = [
            s for s in _report_shares.values()
            if s.get("doctorId") == uid and not s.get("revoked")
        ]

    # Deduplicate patients
    seen: set = set()
    patients  = []
    for share in active_shares:
        pid = share.get("patientId")
        if pid and pid not in seen:
            seen.add(pid)
            patient_scans = [s for s in _scans if s.get("patientId") == pid]
            patients.append({
                "patientId":   pid,
                "patientName": share.get("patientName", pid),
                "totalScans":  len(patient_scans),
                "latestScore": patient_scans[0].get("score") if patient_scans else None,
                "latestDate":  patient_scans[0].get("date")  if patient_scans else None,
                "activeShares": sum(1 for s in active_shares if s.get("patientId") == pid),
            })
    return jsonify({"patients": patients, "total": len(patients)}), 200


# ══════════════════════════════════════════════════════════════════════════════
#  DATA EXPORT  — full patient archive as JSON
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/export", methods=["GET"])
def export_patient_data():
    """
    Export all data belonging to the authenticated patient as a JSON archive.
    Doctors/admins can pass ?patientId= to export a specific patient.
    """
    uid, role = _require_role("patient", "doctor", "admin")
    if role in ("doctor", "admin"):
        patient_id = request.args.get("patientId", uid)
    else:
        patient_id = uid

    archive = {
        "exportedAt":    datetime.now(timezone.utc).isoformat(),
        "version":       "3.0",
        "patientId":     patient_id,
        "scans":         [s for s in _scans if not s.get("patientId") or s.get("patientId") == patient_id],
        "appointments":  [a for a in _appointments.values() if a.get("patientId") == patient_id],
        "treatments":    [t for t in _treatments.values()   if t.get("patientId") == patient_id],
        "reminders":     [r for r in _reminders.values()    if r.get("patientId") == patient_id],
        "family":        [f for f in _family_profiles.values() if f.get("ownerId") == patient_id],
        "consent":       _patient_consents.get(patient_id, dict(_DEFAULT_CONSENT)),
        "audit_logs":    [l for l in _audit_logs if l.get("userId") == patient_id][-100:],
    }
    import json as _json_mod
    json_str = _json_mod.dumps(archive, indent=2)
    return json_str, 200, {
        "Content-Type":        "application/json; charset=utf-8",
        "Content-Disposition": f"attachment; filename=oralai-export-{patient_id}-{int(time.time())}.json",
    }


# ── Boot ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    load_pytorch_model()
    port  = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    log.info("🚀  OralAI backend v3.0  host=0.0.0.0  port=%d  debug=%s  demo=%s  model=%s",
             port, debug, DEMO_MODE, "loaded" if _MODEL else "demo/mock")
    log.info("📡  CORS origins: %s", _origins)
    app.run(host="0.0.0.0", port=port, debug=debug)
