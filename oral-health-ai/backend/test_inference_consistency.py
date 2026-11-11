# -*- coding: utf-8 -*-
"""
OralAI — Inference Consistency Test
=====================================
Picks 20 images from dataset/test (never dataset/train).
For each image:
  1. Runs direct model inference (mirrors app.py's _run_inference exactly)
  2. POSTs the image to the running Flask /api/analyze endpoint
  3. Compares actual label, direct prediction, API prediction, confidence, top-3

Outputs:
  outputs/test_inference_audit.csv
  outputs/inference_summary.md

Usage:
    python test_inference_consistency.py
    python test_inference_consistency.py --flask-url http://localhost:5000
    python test_inference_consistency.py --n 20 --seed 42
"""

import argparse
import csv
import json
import os
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# ── Deps ──────────────────────────────────────────────────────────────────────
try:
    import torch
    import torch.nn as nn
    from torchvision import transforms, models as tvm
except ImportError:
    sys.exit("PyTorch not installed. Activate .venv first.")

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow not installed. Activate .venv first.")

try:
    import requests
except ImportError:
    sys.exit("requests not installed: pip install requests")

# ── Shared preprocessing ──────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))
from preprocessing import build_transform, open_image_bytes, assess_quality

# ── Defaults ──────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
TEST_DIR     = SCRIPT_DIR / "dataset" / "test"
MODEL_PATH   = SCRIPT_DIR / "oralai_best.pth"
OUTPUT_DIR   = SCRIPT_DIR / "outputs"
CSV_PATH     = OUTPUT_DIR / "test_inference_audit.csv"
MD_PATH      = OUTPUT_DIR / "inference_summary.md"
FLASK_URL    = "http://localhost:5000"
N_IMAGES     = 20
SEED         = 42


# ══════════════════════════════════════════════════════════════════════════════
#  CLI
# ══════════════════════════════════════════════════════════════════════════════

def get_args():
    p = argparse.ArgumentParser(description="OralAI inference consistency test")
    p.add_argument("--flask-url", default=FLASK_URL, help="Flask base URL")
    p.add_argument("--model",     default=str(MODEL_PATH))
    p.add_argument("--test-dir",  default=str(TEST_DIR))
    p.add_argument("--n",         type=int, default=N_IMAGES, help="Images to sample")
    p.add_argument("--seed",      type=int, default=SEED)
    return p.parse_args()


# ══════════════════════════════════════════════════════════════════════════════
#  MODEL LOADER  — mirrors app.py load_pytorch_model exactly
# ══════════════════════════════════════════════════════════════════════════════

def load_model(model_path: str):
    """
    Load checkpoint using the same logic as app.py.
    Returns (model, device, class_names, img_size, transform).
    """
    mp = Path(model_path)
    if not mp.exists():
        sys.exit(f"Model not found: {mp}")

    device = torch.device("cpu")
    ckpt   = torch.load(str(mp), map_location=device, weights_only=False)

    class_names = ckpt.get("class_names", [])
    img_size    = ckpt.get("img_size",    224)
    arch        = ckpt.get("arch",        "mobilenet_v2")
    epoch       = ckpt.get("epoch",       "?")
    val_acc     = ckpt.get("val_acc",     None)

    print(f"\n  Checkpoint : {mp.name}")
    print(f"  Arch       : {arch}")
    print(f"  img_size   : {img_size}px")
    print(f"  Epoch      : {epoch}")
    print(f"  Val acc    : {val_acc*100:.2f}%" if val_acc else "  Val acc    : unknown")
    print(f"  Classes    : {class_names}")

    # ── Build architecture (mirrors app.py) ───────────────────────────────────
    state_keys = list(ckpt["model_state"].keys())

    if arch == "mobilenet_v2":
        model = tvm.mobilenet_v2(weights=None)
        in_f  = model.classifier[1].in_features  # 1280
        if any("classifier.4" in k for k in state_keys):
            model.classifier = nn.Sequential(
                nn.Dropout(p=0.5),
                nn.Linear(in_f, 256),
                nn.ReLU(inplace=True),
                nn.Dropout(p=0.3),
                nn.Linear(256, len(class_names)),
            )
            head_desc = "Dropout(0.5)->Linear(1280->256)->ReLU->Dropout(0.3)->Linear(256->N)"
        else:
            model.classifier = nn.Sequential(
                nn.Dropout(p=0.4),
                nn.Linear(in_f, len(class_names)),
            )
            head_desc = "Dropout(0.4)->Linear(1280->N)"
    else:
        try:
            import timm
            backbone = timm.create_model("efficientnet_b0", pretrained=False,
                                         num_classes=0, global_pool="avg")
            head = nn.Sequential(
                nn.Dropout(0.4),
                nn.Linear(backbone.num_features, 512),
                nn.GELU(),
                nn.Dropout(0.2),
                nn.Linear(512, len(class_names)),
            )
            model = nn.Sequential(backbone, head)
            head_desc = "EfficientNetB0 + Dropout(0.4)->Linear(feat->512)->GELU->Dropout(0.2)->Linear(512->N)"
        except ImportError:
            sys.exit("timm not installed but arch=efficientnet_b0. pip install timm")

    model.load_state_dict(ckpt["model_state"])
    model.eval().to(device)

    # ── Transform — from shared preprocessing module ('infer' = same as val) ──
    transform = build_transform(img_size, "infer")

    print(f"  Head       : {head_desc}")
    print(f"  Transform  : preprocessing.build_transform({img_size}, 'infer')")
    print(f"               → Resize({img_size},{img_size}) -> ToTensor -> Normalize(ImageNet)")
    print(f"  EXIF fix   : via preprocessing.open_image_bytes (exif_transpose)\n")

    return model, device, class_names, img_size, transform


# ══════════════════════════════════════════════════════════════════════════════
#  DIRECT INFERENCE
# ══════════════════════════════════════════════════════════════════════════════

def direct_predict(img_path: Path, model, device, class_names: list, transform) -> dict:
    """
    Run inference using the shared preprocessing pipeline (same as Flask).
    open_image_bytes handles EXIF fix + RGB conversion.
    """
    raw    = img_path.read_bytes()
    img    = open_image_bytes(raw)           # EXIF fix + RGB via preprocessing.py
    tensor = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(tensor)
        probs  = torch.softmax(logits, dim=1).squeeze().cpu().numpy()

    sorted_idx = probs.argsort()[::-1]
    top3 = [{"class": class_names[i], "confidence": round(float(probs[i]) * 100, 2)}
            for i in sorted_idx[:3]]
    return {
        "predicted": class_names[sorted_idx[0]],
        "confidence": round(float(probs[sorted_idx[0]]) * 100, 2),
        "top3": top3,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  FLASK API CALL
# ══════════════════════════════════════════════════════════════════════════════

def api_predict(img_path: Path, flask_url: str, timeout: int = 30) -> dict:
    """POST image to /api/analyze and return parsed result."""
    url = flask_url.rstrip("/") + "/api/analyze"
    try:
        with open(img_path, "rb") as f:
            resp = requests.post(
                url,
                files={"image": (img_path.name, f, "image/jpeg")},
                data={
                    "scan_type": "Basic RGB",
                    "sensors": json.dumps({"ph": 6.8, "temperature": 36.6,
                                           "bacterial": 42, "moisture": 71}),
                },
                timeout=timeout,
            )
        if resp.status_code != 200:
            return {"error": f"HTTP {resp.status_code}", "predicted": "API_ERROR",
                    "confidence": 0.0, "top3": []}
        data = resp.json()
        # Extract top prediction from primaryDiagnosis and top_3_predictions
        top3_raw = data.get("top_3_predictions", [])
        # Normalise: API returns display names ("Dental Caries"), direct returns snake_case ("caries")
        # Keep as-is; we'll note the mapping in the summary
        predicted_raw = data.get("primaryDiagnosis") or (top3_raw[0]["class"] if top3_raw else "unknown")
        confidence    = data.get("confidence", 0.0)
        return {
            "predicted":  predicted_raw,
            "confidence": round(float(confidence), 2),
            "top3":       top3_raw,
            "score":      data.get("score", 0),
            "severity":   data.get("severity", ""),
        }
    except requests.exceptions.ConnectionError:
        return {"error": "Connection refused — is Flask running?", "predicted": "NO_CONNECTION",
                "confidence": 0.0, "top3": []}
    except Exception as exc:
        return {"error": str(exc), "predicted": "EXCEPTION",
                "confidence": 0.0, "top3": []}


# ══════════════════════════════════════════════════════════════════════════════
#  DISPLAY NAME → SNAKE_CASE MAP  (to compare API output with direct output)
# ══════════════════════════════════════════════════════════════════════════════

# Flask returns display names in primaryDiagnosis; direct model returns folder names
_DISPLAY_TO_SNAKE = {
    "Healthy":                  "healthy",
    "Dental Caries":            "caries",
    "Gingivitis":               "gingivitis",
    "Plaque Accumulation":      "plaque",
    "Enamel Demineralization":  "enamel_demineralization",
    "Periodontal Disease":      "periodontal_disease",
    "Oral Ulcer":               "oral_ulcer",
    "Oral Lesion / Cancer Risk":"oral_lesion",
    "Oral Lesion":              "oral_lesion",
}

def normalise_api_label(label: str) -> str:
    """Convert Flask display name back to snake_case folder name."""
    return _DISPLAY_TO_SNAKE.get(label, label.lower().replace(" ", "_"))


# ══════════════════════════════════════════════════════════════════════════════
#  IMAGE SAMPLER
# ══════════════════════════════════════════════════════════════════════════════

def sample_test_images(test_dir: Path, n: int, seed: int) -> list:
    """
    Sample n images from test split, distributed across classes.
    Returns list of (img_path, true_label) tuples.
    Never touches dataset/train.
    """
    all_images = []
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    for cls_dir in sorted(test_dir.iterdir()):
        if not cls_dir.is_dir():
            continue
        imgs = [f for f in cls_dir.iterdir() if f.suffix.lower() in valid_exts]
        for img in imgs:
            all_images.append((img, cls_dir.name))

    if not all_images:
        sys.exit(f"No images found in {test_dir}")

    rng = random.Random(seed)
    rng.shuffle(all_images)

    # Distribute: pick ceil(n / num_classes) per class to ensure all classes represented
    classes = sorted({lbl for _, lbl in all_images})
    per_class = max(1, n // len(classes))
    selected = []
    by_class = {c: [] for c in classes}
    for img, lbl in all_images:
        by_class[lbl].append((img, lbl))

    # Round-robin fill
    for cls in classes:
        selected.extend(by_class[cls][:per_class])

    # Top up to exactly n if needed
    remainder = [x for x in all_images if x not in selected]
    rng.shuffle(remainder)
    selected.extend(remainder[:max(0, n - len(selected))])

    # Trim to exactly n
    rng.shuffle(selected)
    return selected[:n]


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    args = get_args()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 65)
    print("  OralAI — Inference Consistency Test")
    print("=" * 65)

    # ── Load model ──────────────────────────────────────────────────────────
    model, device, class_names, img_size, transform = load_model(args.model)

    # ── Check Flask health ──────────────────────────────────────────────────
    flask_online = False
    try:
        r = requests.get(args.flask_url.rstrip("/") + "/health", timeout=4)
        if r.ok:
            flask_online = True
            hdata = r.json()
            print(f"  Flask API  : ONLINE  model_loaded={hdata.get('model_loaded')}  "
                  f"demo={hdata.get('demo_mode')}")
    except Exception:
        pass
    if not flask_online:
        print(f"  Flask API  : OFFLINE ({args.flask_url}) — API column will show NO_CONNECTION")
    print()

    # ── Sample images ───────────────────────────────────────────────────────
    test_dir = Path(args.test_dir)
    samples  = sample_test_images(test_dir, args.n, args.seed)
    print(f"  Sampled {len(samples)} images from {test_dir}")
    print(f"  Distribution: { {c: sum(1 for _,l in samples if l==c) for c in class_names} }")
    print()

    # ── Run comparisons ─────────────────────────────────────────────────────
    rows = []
    direct_correct = 0
    api_correct    = 0
    mismatches     = 0
    api_errors     = 0

    header = (
        "image_path", "true_label",
        "direct_predicted", "direct_confidence",
        "direct_top1", "direct_top2", "direct_top3",
        "api_predicted", "api_predicted_normalised", "api_confidence",
        "api_top1", "api_top2", "api_top3",
        "direct_correct", "api_correct", "predictions_match",
    )

    print(f"  {'#':>3}  {'File':<35}  {'True':<15}  {'Direct':<15}  {'API':<25}  Match")
    print("  " + "-" * 110)

    for idx, (img_path, true_label) in enumerate(samples, 1):
        # Direct prediction
        direct = direct_predict(img_path, model, device, class_names, transform)

        # API prediction
        api = api_predict(img_path, args.flask_url)

        api_norm  = normalise_api_label(api["predicted"])
        d_correct = (direct["predicted"] == true_label)
        a_correct = (api_norm == true_label)
        match     = (direct["predicted"] == api_norm)

        if d_correct: direct_correct += 1
        if a_correct and flask_online: api_correct += 1
        if not match and flask_online:  mismatches  += 1
        if "error" in api:              api_errors  += 1

        # Format top3 strings
        def fmt_top3(top3_list):
            out = []
            for entry in (top3_list or []):
                cls = entry.get("class", "?")
                cnf = entry.get("confidence", 0)
                out.append(f"{cls}({cnf:.1f}%)")
            while len(out) < 3:
                out.append("")
            return out[0], out[1], out[2]

        dt1, dt2, dt3 = fmt_top3(direct["top3"])
        at1, at2, at3 = fmt_top3(api.get("top3", []))

        rows.append({
            "image_path":              str(img_path.relative_to(SCRIPT_DIR)),
            "true_label":              true_label,
            "direct_predicted":        direct["predicted"],
            "direct_confidence":       direct["confidence"],
            "direct_top1":             dt1,
            "direct_top2":             dt2,
            "direct_top3":             dt3,
            "api_predicted":           api["predicted"],
            "api_predicted_normalised":api_norm,
            "api_confidence":          api["confidence"],
            "api_top1":                at1,
            "api_top2":                at2,
            "api_top3":                at3,
            "direct_correct":          d_correct,
            "api_correct":             a_correct,
            "predictions_match":       match,
        })

        match_sym = "=" if match else "X"
        d_sym     = "+" if d_correct else "-"
        a_sym     = "+" if a_correct else ("-" if flask_online else "?")

        short_name = img_path.name[:33]
        print(f"  {idx:>3}  {short_name:<35}  {true_label:<15}  "
              f"{direct['predicted']:<15}({d_sym})  "
              f"{api['predicted']:<22}({a_sym})  {match_sym}")

        # Small delay to avoid hammering the API rate limiter
        if flask_online:
            time.sleep(0.15)

    print()

    # ── Write CSV ───────────────────────────────────────────────────────────
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=header)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  CSV saved  : {CSV_PATH}")

    # ── Compute summary stats ───────────────────────────────────────────────
    n            = len(samples)
    direct_acc   = direct_correct / n * 100
    api_acc      = api_correct    / n * 100 if flask_online else None
    mismatch_pct = mismatches     / n * 100 if flask_online else None

    # Per-class accuracy (direct)
    class_stats = {}
    for r in rows:
        c = r["true_label"]
        if c not in class_stats:
            class_stats[c] = {"total": 0, "direct_correct": 0, "api_correct": 0}
        class_stats[c]["total"] += 1
        if r["direct_correct"]: class_stats[c]["direct_correct"] += 1
        if r["api_correct"]:    class_stats[c]["api_correct"]    += 1

    # ── Write Markdown summary ──────────────────────────────────────────────
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    md_lines = [
        "# OralAI Inference Consistency Audit",
        "",
        f"**Generated:** {ts}  ",
        f"**Test images:** {n} (from `dataset/test/`, seed={args.seed})  ",
        f"**Model:** `{Path(args.model).name}`  ",
        f"**Flask URL:** `{args.flask_url}`  ",
        f"**Flask online:** {'Yes' if flask_online else 'No'}",
        "",
        "---",
        "",
        "## Accuracy Results",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Direct-model accuracy | **{direct_acc:.1f}%** ({direct_correct}/{n}) |",
    ]
    if flask_online:
        md_lines += [
            f"| Flask API accuracy    | **{api_acc:.1f}%** ({api_correct}/{n}) |",
            f"| Prediction mismatches (direct vs API) | **{mismatches}/{n}** ({mismatch_pct:.1f}%) |",
            f"| API errors/timeouts   | {api_errors}/{n} |",
        ]
    else:
        md_lines.append("| Flask API accuracy    | N/A (offline) |")
    md_lines += ["", "---", "", "## Per-Class Breakdown", "",
                 "| Class | Samples | Direct Correct | Direct Acc% | API Correct | API Acc% |",
                 "|-------|---------|----------------|-------------|-------------|----------|"]
    for cls in sorted(class_stats):
        s  = class_stats[cls]
        da = s["direct_correct"] / s["total"] * 100 if s["total"] else 0
        aa = s["api_correct"]    / s["total"] * 100 if (s["total"] and flask_online) else 0
        api_cell  = f"{s['api_correct']} | {aa:.0f}%" if flask_online else "N/A | N/A"
        md_lines.append(
            f"| `{cls}` | {s['total']} | {s['direct_correct']} | {da:.0f}% | {api_cell} |"
        )

    md_lines += [
        "",
        "---",
        "",
        "## Preprocessing Configuration",
        "",
        "### Direct Model (this script)",
        "",
        f"```",
        f"Architecture  : {ckpt_meta(args.model, 'arch')}",
        f"img_size      : {img_size}px  (read from checkpoint)",
        f"Transform     : Resize({img_size},{img_size}) -> ToTensor -> Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])",
        f"EXIF fix      : ImageOps.exif_transpose applied  (audit fix)",
        f"model.eval()  : Yes",
        f"torch.no_grad : Yes",
        f"```",
        "",
        "### Flask API (app.py)",
        "",
        f"```",
        f"Architecture  : detected from checkpoint arch key",
        f"img_size      : read from checkpoint (ckpt.get('img_size', env_IMG_SIZE))",
        f"Transform     : Resize(img_size,img_size) -> ToTensor -> Normalize(ImageNet)",
        f"EXIF fix      : NOT applied  (known issue from audit)",
        f"model.eval()  : Yes",
        f"torch.no_grad : Yes",
        f"Sensor fusion : Yes (default sensor values sent with request)",
        f"```",
        "",
        "---",
        "",
        "## Class Mapping",
        "",
        "Flask `/api/analyze` returns display names in `primaryDiagnosis`.  ",
        "This script normalises them back to folder names for comparison.",
        "",
        "| Flask display name | Folder / direct-model name |",
        "|--------------------|---------------------------|",
    ]
    for display, snake in _DISPLAY_TO_SNAKE.items():
        md_lines.append(f"| `{display}` | `{snake}` |")

    md_lines += [
        "",
        "---",
        "",
        "## Mismatch Details",
        "",
    ]
    mismatch_rows = [r for r in rows if not r["predictions_match"]]
    if mismatch_rows and flask_online:
        md_lines += [
            "| # | File | True | Direct | API (normalised) | D-conf | A-conf |",
            "|---|------|------|--------|-----------------|--------|--------|",
        ]
        for i, r in enumerate(mismatch_rows, 1):
            fname = Path(r["image_path"]).name[:40]
            md_lines.append(
                f"| {i} | `{fname}` | `{r['true_label']}` | `{r['direct_predicted']}` "
                f"| `{r['api_predicted_normalised']}` | {r['direct_confidence']}% | {r['api_confidence']}% |"
            )
    elif not flask_online:
        md_lines.append("_Flask was offline — mismatch comparison not available._")
    else:
        md_lines.append("_No mismatches found._")

    md_lines += [
        "",
        "---",
        "",
        "## Notes",
        "",
        "- All images sampled exclusively from `dataset/test/` — `dataset/train/` never used.",
        "- The direct-model path applies `ImageOps.exif_transpose()` (audit recommendation).",
        "- Flask does **not** apply `exif_transpose()` — any difference attributable to EXIF",
        "  orientation will appear as a mismatch between the two columns.",
        "- Sensor fusion in Flask may shift the API confidence slightly from the raw model output.",
        "- See `outputs/model_audit_report.md` for full root-cause analysis.",
    ]

    with open(MD_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines) + "\n")
    print(f"  MD saved   : {MD_PATH}")

    # ── Console summary ─────────────────────────────────────────────────────
    print()
    print("=" * 65)
    print("  RESULTS SUMMARY")
    print("=" * 65)
    print(f"  Images tested          : {n}")
    print(f"  Direct-model accuracy  : {direct_acc:.1f}%  ({direct_correct}/{n})")
    if flask_online:
        print(f"  Flask API accuracy     : {api_acc:.1f}%  ({api_correct}/{n})")
        print(f"  Prediction mismatches  : {mismatches}/{n}  ({mismatch_pct:.1f}%)")
        print(f"  API errors             : {api_errors}/{n}")
    else:
        print("  Flask API              : OFFLINE")
    print()
    print(f"  Per-class accuracy (direct):")
    for cls in sorted(class_stats):
        s  = class_stats[cls]
        da = s["direct_correct"] / s["total"] * 100 if s["total"] else 0
        bar = "#" * int(da / 10) + "-" * (10 - int(da / 10))
        print(f"    {cls:<25}  [{bar}]  {da:5.1f}%  ({s['direct_correct']}/{s['total']})")
    print()
    print(f"  CSV  : {CSV_PATH}")
    print(f"  MD   : {MD_PATH}")
    print()


def ckpt_meta(model_path, key):
    """Quick helper to read a single key from checkpoint without loading full model."""
    try:
        ckpt = torch.load(str(model_path), map_location="cpu", weights_only=False)
        return ckpt.get(key, "unknown")
    except Exception:
        return "unknown"


if __name__ == "__main__":
    main()
