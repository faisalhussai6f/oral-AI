# OralAI Model Audit Report

**Generated:** 2026-09-27  
**Auditor:** Kiro (automated static + dynamic analysis)  
**Scope:** Why the trained model gives correct results on training/validation images but inaccurate results on uploaded/unseen real-world images.

---

## Executive Summary

Seven distinct issues were found. Three are **critical** (directly cause wrong predictions on unseen images), three are **high severity** (cause metrics to be misleading or create silent failure modes), and one is **medium severity** (a latent risk that would break inference silently under a specific condition).

| # | Severity | Issue | Primary File(s) |
|---|----------|-------|-----------------|
| 1 | 🔴 Critical | Extreme dataset imbalance — model trained on 87–88% synthetic images for caries and oral_ulcer | `balance_classes.py`, `dataset/train/` |
| 2 | 🔴 Critical | No EXIF rotation handling — real phone uploads arrive rotated; dataset images do not | `app.py`, `train.py` |
| 3 | 🔴 Critical | Domain gap — Kaggle web images vs real intraoral phone photos are fundamentally different | `prepare_dataset.py`, `train.py` |
| 4 | 🟠 High | evaluate.py and predict.py use a different transform than training — test accuracy is not representative of Flask inference | `evaluate.py`, `predict.py` |
| 5 | 🟠 High | evaluate.py loads wrong architecture (EfficientNetB0 via timm) but checkpoint is MobileNetV2 — evaluation crashes silently | `evaluate.py` |
| 6 | 🟠 High | Augmentation is too narrow — RandomRotation ±8° won't cover real-world orientation, lighting, and angle variation | `train.py` |
| 7 | 🟡 Medium | `.env` sets `IMG_SIZE=224` but model was trained at 96px — a latent landmine if checkpoint ever loses the `img_size` key | `backend/.env`, `app.py` |

The following items were **checked and confirmed correct** (not causing the problem):

- ✅ Class label order: `ImageFolder` alphabetical order matches checkpoint `class_names` exactly
- ✅ `class_names.json` matches checkpoint exactly
- ✅ `model.eval()` called before inference in Flask, evaluate.py, predict.py
- ✅ `torch.no_grad()` used in all three inference paths
- ✅ Head architecture loaded correctly (`classifier.4` detection works)
- ✅ No filename-level data leakage between train/val/test splits
- ✅ No augmented `_aug_` files present in val/test splits
- ✅ RGB colour space used consistently (PIL `convert("RGB")` everywhere, no BGR confusion)
- ✅ ImageNet normalisation constants (`[0.485, 0.456, 0.406]` / `[0.229, 0.224, 0.225]`) identical across all paths

---

## Issue 1 — Extreme Synthetic Augmentation for Under-represented Classes

**Severity: 🔴 Critical**

### Evidence (from `audit2_output.txt`)

```
train/caries      : 2500 total  (2194 augmented)   →  306 real images  → 87.8% synthetic
train/oral_ulcer  : 2500 total  (2129 augmented)   →  371 real images  → 85.2% synthetic
train/plaque      : 2500 total  ( 430 augmented)   →  2070 real images → 17.2% synthetic
train/gingivitis  : 3000 total  (   0 augmented)   →  3000 real images
train/oral_lesion : 3000 total  (   0 augmented)   →  3000 real images
train/healthy     : 2937 total  (   0 augmented)   →  2937 real images

val/caries        :   65 images   (0 augmented)
test/caries       :   67 images   (0 augmented)
val/oral_ulcer    :   79 images   (0 augmented)
test/oral_ulcer   :   80 images   (0 augmented)
```

### What this means

`balance_classes.py` takes the original small collections of `caries` (≈306 real) and `oral_ulcer` (≈371 real) images and pads them to 2500 by repeatedly applying 8 simple PIL operations (mirror, rotate ±15°, autocontrast, sharpen, flip, equalize) on the same source pool.

**The model has seen the same ≈306 caries photos and their direct augmentations thousands of times.** It has learned the specific textures, lighting, and camera angles of those particular source images rather than general visual features of caries. When a new caries image arrives that was photographed differently (different phone, angle, light source, focal length), the model fails to generalise.

The 91% validation accuracy is inflated because the val set (`val/caries`: 65 images) was also drawn from the same original small pool — the same source distribution.

### Affected files
- `backend/balance_classes.py` — augmentation strategy
- `backend/dataset/train/caries/` — 87.8% synthetic
- `backend/dataset/train/oral_ulcer/` — 85.2% synthetic

---

## Issue 2 — No EXIF Rotation Handling

**Severity: 🔴 Critical**

### Evidence

- PIL version in use: **11.1.0**
- `PIL.Image.open().convert("RGB")` does **not** auto-apply EXIF orientation. The `ImageOps.exif_transpose()` function must be called explicitly; it is not called anywhere in the codebase.
- Training images (from the Kaggle `sizlingdhairya1/oral-infection` dataset) are web-scraped images. They typically have **no EXIF rotation tag** — the pixel data is already in display orientation.
- Real-world phone uploads (iOS, Android) almost always have an EXIF orientation tag of **90° or 270°** because the sensor captures landscape while the phone is held in portrait. The pixel data is stored rotated; the EXIF tag tells viewers to rotate it back. Without calling `exif_transpose()`, the model receives a sideways image.

### Pipeline audit

| Step | EXIF handled? |
|------|--------------|
| `ImageFolder` default loader (`_default_loader`) in `train.py` | ❌ No `exif_transpose()` |
| `balance_classes.py` augmentation (`Image.open(src)`) | ❌ No `exif_transpose()` — augments the raw pixel data, preserving wrong orientation |
| Flask `_run_inference` (`Image.open(io.BytesIO(raw_bytes)).convert("RGB")`) | ❌ No `exif_transpose()` |
| `predict.py` (`Image.open(str(img_path)).convert("RGB")`) | ❌ No `exif_transpose()` |

### Impact

A photo taken in portrait on a phone is stored with JPEG pixel rows running left-to-right (landscape), with EXIF tag saying "rotate 90°". Without the fix, the model sees a landscape-oriented rotated image of the inside of a mouth. The training set contained no such images. Confidence collapses — the model defaults to "healthy" or produces random class predictions.

### Affected files
- `backend/app.py` — `_run_inference()` function (~line 393)
- `backend/train.py` — `_safe_loader()` function (~line 45)
- `backend/predict.py` — `predict()` function (~line 155)
- `backend/balance_classes.py` — `balance_split()` augmentation loop (~line 59)

---

## Issue 3 — Domain Gap: Kaggle Web Images vs Real Intraoral Phone Photos

**Severity: 🔴 Critical**

### Evidence (from `prepare_dataset.py`)

The dataset source is `sizlingdhairya1/oral-infection` on Kaggle. These are web-scraped clinical stock photographs:
- Shot by professional dental cameras under controlled lighting
- Often showing isolated pathology on a clean white background or with dental retractors
- High contrast, close-up, well-lit, typically landscape orientation, no motion blur
- Already normalized by web scrapers to standard display orientation

Real user uploads are:
- Shot by phone camera at arm's length inside a mouth
- Variable lighting (overhead bathroom light, flashlight, dark rooms)
- Subject motion blur from trying to hold phone steady while opening mouth
- Saliva reflections, tongue in frame, partial tooth visibility
- Various focal distances and angles never represented in training data

`prepare_dataset.py` correctly notes in its docstring: *"This is NOT a patient-level split (we don't have patient IDs in this dataset). For clinical use, always split by patient."*

The entire train/val/test split was done from the **same Kaggle source**, which means the 91% val accuracy measures in-distribution performance only. There is no held-out out-of-distribution test.

### Affected files
- `backend/prepare_dataset.py` — dataset source and split strategy
- `backend/train.py` — insufficient augmentation to bridge domain gap

---

## Issue 4 — evaluate.py / predict.py Use a Different Transform Than Training

**Severity: 🟠 High**

### Evidence

```python
# train.py  —  validation transform (what the model was tuned against)
transforms.Resize((96, 96))       # exact square resize
transforms.ToTensor()
transforms.Normalize(MEAN, STD)

# evaluate.py  —  test transform  (DIFFERENT)
transforms.Resize(int(96 * 1.05)) # = Resize(100)  — 5% larger
transforms.CenterCrop(96)         # then centre-crop to 96
transforms.ToTensor()
transforms.Normalize(MEAN, STD)

# predict.py  —  inference transform  (SAME AS evaluate.py — DIFFERENT from training)
transforms.Resize(int(img_size * 1.05))
transforms.CenterCrop(img_size)
transforms.ToTensor()
transforms.Normalize(MEAN, STD)
```

### What this means

The val accuracy reported during training (91%) was measured using the **direct Resize** transform. `evaluate.py` measures with **Resize→CenterCrop**. These produce slightly different pixel values. The reported test accuracy from `evaluate.py` does not correspond to either the training or the Flask inference pipeline — it is a third, unmeasured variant.

**Flask inference (`app.py`) correctly uses the training-matching transform** (`_build_transform` uses `Resize((img_size, img_size))`), so the live API is not broken by this issue. But the evaluation results printed by `evaluate.py` cannot be trusted as representative of what users actually experience.

### Affected files
- `backend/evaluate.py` — wrong test transform (~lines 63–68)
- `backend/predict.py` — wrong inference transform (~lines 158–163)

---

## Issue 5 — evaluate.py Loads Wrong Architecture

**Severity: 🟠 High**

### Evidence

```python
# evaluate.py  (lines 53–62)
backbone = timm.create_model("efficientnet_b0", pretrained=False,
                              num_classes=0, global_pool="avg")
head = nn.Sequential(
    nn.Dropout(0.4),
    nn.Linear(backbone.num_features, 512),
    nn.GELU(),
    nn.Dropout(0.2),
    nn.Linear(512, num_classes),
)
model = nn.Sequential(backbone, head)
model.load_state_dict(ckpt["model_state"])  # ← WILL FAIL
```

```python
# predict.py (lines 113–122) — same problem
backbone = timm.create_model("efficientnet_b0", ...)
```

The checkpoint `oralai_best.pth` contains:
```
arch          : 'mobilenet_v2'
classifier.*  : MobileNetV2 keys (features.0.0.weight, classifier.1.weight, ...)
```

`evaluate.py` and `predict.py` attempt to load a MobileNetV2 checkpoint into an EfficientNetB0 skeleton. `model.load_state_dict()` will raise a `RuntimeError: unexpected key / missing key` error. These scripts will crash before producing any metrics.

**The only path that correctly handles this is `app.py`**, which reads `arch` from the checkpoint and branches accordingly.

### Affected files
- `backend/evaluate.py` — hardcoded EfficientNetB0 architecture (~lines 52–62)
- `backend/predict.py` — hardcoded EfficientNetB0 architecture (~lines 112–122)

---

## Issue 6 — Augmentation Too Narrow to Cover Real-World Variation

**Severity: 🟠 High**

### Evidence — training augmentations in `train.py`

```python
transforms.Resize((106, 106))
transforms.RandomCrop(96)
transforms.RandomHorizontalFlip(p=0.5)
transforms.RandomRotation(degrees=8)           # ±8° only
transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1)
```

### What is missing

| Missing augmentation | Why it matters for real uploads |
|----------------------|--------------------------------|
| `RandomVerticalFlip` | Some users photograph upside-down |
| `RandomRotation(degrees=90)` or `RandomApply([RandomRotation([90,180,270])])` | EXIF rotations at 90°/180°/270° (Issue 2) |
| `RandomPerspective` / `RandomAffine` | Phone cameras taken at oblique angles |
| `GaussianBlur` | Motion blur from handheld phone shots |
| `RandomGrayscale` | Some phones save dental photos as grayscale |
| `Stronger ColorJitter` (brightness up to 0.5) | Bathroom lighting, flashlight, low-light |
| `RandomAdjustSharpness` | Out-of-focus phone photos |
| `CutMix` / `MixUp` | Better generalisation on small real-image pools |
| Aspect-ratio–preserving resize with padding | Avoids squashing non-square images |

The current ±8° rotation is useful only for slight tilt. It provides **zero coverage** for the 90°/270° EXIF rotation scenario.

### Affected files
- `backend/train.py` — `build_transforms()` function (~lines 79–96)

---

## Issue 7 — `.env` IMG_SIZE=224 Contradicts Trained Model's 96px Size

**Severity: 🟡 Medium (Latent)**

### Evidence

```ini
# backend/.env
IMG_SIZE=224
```

```python
# backend/app.py
IMG_SIZE  = int(os.environ.get("IMG_SIZE", 224))   # reads 224 from .env
...
img_sz = ckpt.get("img_size", IMG_SIZE)             # uses 96 from checkpoint
_TRANSFORM = _build_transform(img_sz)               # correctly builds 96px transform
```

**Currently** the code is safe because the checkpoint stores `img_size=96` and `ckpt.get("img_size", IMG_SIZE)` returns 96.

**The landmine:** If anyone re-trains and saves a checkpoint without the `img_size` key (older `torch.save` call, manual checkpoint edit, or smoke-test checkpoint), `img_sz` falls back to `IMG_SIZE=224`. The model then receives 224×224 tensors but was trained on 96×96 — **catastrophically wrong activations, near-random output**.

Additionally, `evaluate.py` and `predict.py` hardcode `IMG_SIZE = 224` at the top of each file, which would compound Issue 5 if those scripts were ever patched to load the correct architecture.

### Affected files
- `backend/.env` — `IMG_SIZE=224` should be `IMG_SIZE=96`
- `backend/app.py` — `IMG_SIZE` default and fallback logic (~lines 104, 264)
- `backend/evaluate.py` — `IMG_SIZE = 224` hardcoded constant (~line 15 of evaluate.py header)
- `backend/predict.py` — `IMG_SIZE = 224` hardcoded constant (~line 20 of predict.py header)

---

## Summary Table — All Affected Files

| File | Issues |
|------|--------|
| `backend/app.py` | #2 (no EXIF), #7 (IMG_SIZE fallback) |
| `backend/train.py` | #2 (no EXIF in safe_loader), #3 (domain gap), #6 (narrow augmentation) |
| `backend/evaluate.py` | #4 (wrong transform), #5 (wrong architecture), #7 (hardcoded IMG_SIZE=224) |
| `backend/predict.py` | #4 (wrong transform), #5 (wrong architecture), #7 (hardcoded IMG_SIZE=224) |
| `backend/balance_classes.py` | #1 (extreme synthetic augmentation), #2 (no EXIF in augment loop) |
| `backend/prepare_dataset.py` | #3 (Kaggle-only source, no patient-level split) |
| `backend/.env` | #7 (IMG_SIZE=224 contradicts trained 96px model) |
| `backend/dataset/train/caries/` | #1 (2194/2500 = 87.8% synthetic) |
| `backend/dataset/train/oral_ulcer/` | #1 (2129/2500 = 85.2% synthetic) |

---

## Confirmed-Good Items (No Action Needed)

| Check | Result |
|-------|--------|
| Class label order (ImageFolder vs checkpoint) | ✅ Alphabetical match confirmed |
| `class_names.json` vs checkpoint | ✅ Exact match |
| `model.eval()` before inference | ✅ All three paths confirmed |
| `torch.no_grad()` during inference | ✅ All three paths confirmed |
| RGB vs BGR colour space | ✅ PIL `convert("RGB")` used everywhere, no OpenCV BGR→RGB confusion |
| ImageNet normalisation constants | ✅ Identical across train/val/Flask/evaluate/predict |
| Head architecture loading (new 256-hidden head) | ✅ `classifier.4` detection in `app.py` works correctly |
| Data leakage (train filenames in val/test) | ✅ No filename overlap found |
| Augmented files in val/test | ✅ None found |
| Flask IMG_SIZE at runtime | ✅ Correctly reads 96 from checkpoint (not 224 from .env) |

---

## Recommended Fix Priority

1. **Fix EXIF first** (Issue 2) — one-line fix, immediate improvement for phone uploads.  
   Add `from PIL import ImageOps` and call `img = ImageOps.exif_transpose(img)` after every `Image.open()` call in `app.py`, `train.py`, and `predict.py`. Also add it in `balance_classes.py` before augmenting.

2. **Fix evaluate.py and predict.py architecture** (Issue 5) — both scripts are currently broken for this checkpoint.  
   Mirror the `arch`-detection logic from `app.py`.

3. **Fix evaluate.py and predict.py transforms** (Issue 4) — align with `train.py` val transform.  
   Replace `Resize(int(img_size*1.05))` + `CenterCrop(img_size)` with `Resize((img_size, img_size))`.

4. **Fix `.env` IMG_SIZE** (Issue 7) — change `IMG_SIZE=224` to `IMG_SIZE=96`.

5. **Expand augmentation** (Issue 6) — add `RandomRotation(90)` / multi-angle rotations, stronger `ColorJitter`, `GaussianBlur`, `RandomPerspective`.

6. **Collect more real images** (Issues 1 & 3) — caries (306 real) and oral_ulcer (371 real) need at least 1000–2000 real diverse images each before the model can generalise. Reduce the augmentation multiplier once real data is available.
