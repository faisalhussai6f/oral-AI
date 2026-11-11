# OralAI Inference Consistency Audit

**Generated:** 2026-09-27 11:46 UTC  
**Test images:** 20 (from `dataset/test/`, seed=42)  
**Model:** `oralai_best.pth`  
**Flask URL:** `http://localhost:5000`  
**Flask online:** Yes

---

## Accuracy Results

| Metric | Value |
|--------|-------|
| Direct-model accuracy | **85.0%** (17/20) |
| Flask API accuracy    | **85.0%** (17/20) |
| Prediction mismatches (direct vs API) | **0/20** (0.0%) |
| API errors/timeouts   | 0/20 |

---

## Per-Class Breakdown

| Class | Samples | Direct Correct | Direct Acc% | API Correct | API Acc% |
|-------|---------|----------------|-------------|-------------|----------|
| `caries` | 3 | 3 | 100% | 3 | 100% |
| `gingivitis` | 3 | 1 | 33% | 1 | 33% |
| `healthy` | 4 | 4 | 100% | 4 | 100% |
| `oral_lesion` | 3 | 3 | 100% | 3 | 100% |
| `oral_ulcer` | 3 | 2 | 67% | 2 | 67% |
| `plaque` | 4 | 4 | 100% | 4 | 100% |

---

## Preprocessing Configuration

### Direct Model (this script)

```
Architecture  : mobilenet_v2
img_size      : 96px  (read from checkpoint)
Transform     : Resize(96,96) -> ToTensor -> Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
EXIF fix      : ImageOps.exif_transpose applied  (audit fix)
model.eval()  : Yes
torch.no_grad : Yes
```

### Flask API (app.py)

```
Architecture  : detected from checkpoint arch key
img_size      : read from checkpoint (ckpt.get('img_size', env_IMG_SIZE))
Transform     : Resize(img_size,img_size) -> ToTensor -> Normalize(ImageNet)
EXIF fix      : NOT applied  (known issue from audit)
model.eval()  : Yes
torch.no_grad : Yes
Sensor fusion : Yes (default sensor values sent with request)
```

---

## Class Mapping

Flask `/api/analyze` returns display names in `primaryDiagnosis`.  
This script normalises them back to folder names for comparison.

| Flask display name | Folder / direct-model name |
|--------------------|---------------------------|
| `Healthy` | `healthy` |
| `Dental Caries` | `caries` |
| `Gingivitis` | `gingivitis` |
| `Plaque Accumulation` | `plaque` |
| `Enamel Demineralization` | `enamel_demineralization` |
| `Periodontal Disease` | `periodontal_disease` |
| `Oral Ulcer` | `oral_ulcer` |
| `Oral Lesion / Cancer Risk` | `oral_lesion` |
| `Oral Lesion` | `oral_lesion` |

---

## Mismatch Details

_No mismatches found._

---

## Notes

- All images sampled exclusively from `dataset/test/` — `dataset/train/` never used.
- The direct-model path applies `ImageOps.exif_transpose()` (audit recommendation).
- Flask does **not** apply `exif_transpose()` — any difference attributable to EXIF
  orientation will appear as a mismatch between the two columns.
- Sensor fusion in Flask may shift the API confidence slightly from the raw model output.
- See `outputs/model_audit_report.md` for full root-cause analysis.
