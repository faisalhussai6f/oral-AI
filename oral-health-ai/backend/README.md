# OralAI Backend — PyTorch EfficientNetB0

Real-Time Oral Disease Detection  
Bearys Institute of Technology · AI & Data Science

---

## Quick Start (Windows PowerShell)

```powershell
# 1 — enter the backend folder
cd oral-health-ai\backend

# 2 — create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 3 — install dependencies
pip install -r requirements.txt

# 4 — start the API server (demo mode — no model needed)
python app.py
```

Open http://localhost:8080 for the frontend, http://localhost:5000 for backend status.

---

## Training

### Prepare your dataset

```
dataset/
  train/   val/   test/
    healthy/
    plaque/
    gingivitis/
    caries/
    enamel_demineralization/
    oral_ulcer/
    oral_lesion/
    periodontal_disease/
```

**Data integrity requirements (read carefully):**

- Images must be **clinically labelled by a qualified dentist**.
- The train / val / test split must be made **by patient**, not by random
  image shuffle.  If multiple images from the same patient appear in both
  train and test, the model appears to generalise but is actually memorising
  — this is **data leakage** and inflates test accuracy.
- Use at least 50 images per class for meaningful training.
- Recommended split: 70 % train · 15 % val · 15 % test.

### Run training

```powershell
# Full training (up to 30 epochs, early stopping)
python train.py

# Smoke test — verifies pipeline runs end-to-end in ~1 min
python train.py --smoke

# Custom settings
python train.py --epochs 50 --batch 32 --lr 3e-4 --data ./dataset

# View all options
python train.py --help
```

Training outputs:
| File | Description |
|------|-------------|
| `models/oralai_efficientnet_best.pth` | Best checkpoint (by val accuracy) |
| `models/class_names.json` | Class index mapping |
| `outputs/training_history.csv` | Per-epoch loss & accuracy |

---

## Evaluation

```powershell
python evaluate.py
```

Outputs:
- Classification report (accuracy, precision, recall, F1 per class)
- `outputs/confusion_matrix.png`

**Important:** The numbers from `evaluate.py` are measured on your test set.
Do **not** report validation accuracy as model performance — report test metrics only.

---

## Single-Image Prediction

```powershell
# Predict on one image
python predict.py path\to\tooth.jpg

# Set confidence threshold
python predict.py path\to\tooth.jpg --threshold 0.6

# Use a different model
python predict.py path\to\tooth.png --model models\oralai_efficientnet_best.pth
```

Example output:
```json
{
  "image_quality_score": 82,
  "low_confidence": false,
  "predicted_finding": "Plaque Accumulation",
  "confidence": 73.4,
  "top_3_predictions": [...],
  "urgency": "monitor",
  "severity": "Mild",
  "model_version": "oralai-efficientnet-b0-v1",
  "disclaimer": "This is an AI screening finding, not a final diagnosis."
}
```

---

## API Reference

Base URL: `http://localhost:5000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check, model state, class list |
| GET | `/api/health` | Alias |
| POST | `/api/analyze` | Analyse dental image |
| GET | `/api/scans` | Scan history (in-memory) |
| GET | `/api/scans/<id>` | Single scan |
| GET | `/api/sensors` | Latest sensor readings |
| POST | `/api/sensors/update` | Update sensors |
| GET | `/api/models` | List models |
| POST | `/api/demo/simulate` | Randomise sensor values |

### POST /api/analyze

```
Content-Type: multipart/form-data

image      (file)    JPEG / PNG / WebP, max 10 MB
scan_type  (string)  "Basic RGB" or "Advanced Spectral"
sensors    (JSON)    {"ph":6.8,"temperature":36.6,"bacterial":42,"moisture":71}
```

Response fields (match frontend `upload.js` contract):
```json
{
  "scanId":            "RPT-12345678-ANALYSIS",
  "score":             78,
  "confidence":        86.4,
  "attentionAreas":    2,
  "findings":          [{"condition":"Plaque Accumulation","confidence":73.4,"severity":"Mild","region":"Interproximal spaces"}],
  "diagnosis":         "Some conditions detected...",
  "model":             "oralai-efficientnet-b0-v1",
  "demoMode":          false,
  "scanType":          "Basic RGB",
  "processingTime":    "124ms",
  "imageQuality":      "Quality score: 82/100",
  "sensorFusion":      true,
  "severity":          "Fair",
  "urgency":           "monitor",
  "low_confidence":    false,
  "top_3_predictions": [...],
  "recommendations":   [...],
  "timestamp":         "2026-09-20T17:00:00+00:00",
  "sensors":           {"ph":6.8,...},
  "disclaimer":        "This is an AI screening finding, not a final diagnosis."
}
```

---

## Environment Variables

Copy `.env.example` → `.env` and set:

```env
PORT=5000
FLASK_DEBUG=0
SECRET_KEY=your-secret-key
ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
MODEL_PATH=models/oralai_efficientnet_best.pth
CLASS_NAMES_PATH=models/class_names.json
CONFIDENCE_THRESHOLD=0.50
DEMO_MODE=1
RATE_LIMIT_PER_MIN=20
LOG_LEVEL=INFO
```

Set `DEMO_MODE=0` after training to require a real model.

---

## Architecture

```
EfficientNetB0 (pretrained ImageNet)
  └── GlobalAvgPool → [1280]
        └── Dropout(0.4) → Linear(512) → GELU → Dropout(0.2) → Linear(8)
                                                                   ↓
                                                           Softmax → 8 classes
```

Training strategy:
1. **Phase 1 (warm-up):** backbone frozen, head trained only — fast convergence
2. **Phase 2 (fine-tune):** backbone unfrozen at 10× lower LR

---

## Medical Disclaimer

> This system is an **AI screening tool**, not a diagnostic device.  
> All findings must be reviewed by a qualified dental professional.  
> Do not use AI confidence scores as a clinical decision without dentist evaluation.  
> Accuracy figures in this codebase reflect performance on the specific dataset used — not a clinical validation study.
