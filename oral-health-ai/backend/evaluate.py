# -*- coding: utf-8 -*-
"""
OralAI — Model Evaluation Script
==================================
Evaluates the trained model exclusively on dataset/test.
Uses the shared preprocessing module so the transform is
IDENTICAL to what Flask uses in production.

Outputs (all written to outputs/)
----------------------------------
  confusion_matrix.png       — annotated heatmap
  classification_report.txt  — full sklearn text report
  test_metrics.json          — machine-readable metrics

Printed to console
------------------
  Per-class precision / recall / F1
  Top-1 and Top-3 accuracy
  Weak-class analysis (low recall or few test samples)
  Confusion-matrix row for each misclassified class

Usage
-----
    python evaluate.py                            # defaults
    python evaluate.py --model oralai_best.pth    # explicit checkpoint
    python evaluate.py --data dataset/test        # explicit test dir

IMPORTANT
---------
  Accuracy reported here is TEST-SET accuracy only.
  The val_acc stored in the checkpoint is VALIDATION accuracy —
  a different split, measured during training.  Never report
  checkpoint val_acc as the model's real-world accuracy.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# ── Numeric / ML ─────────────────────────────────────────────────────────────
import numpy as np

try:
    import torch
    import torch.nn as nn
except ImportError:
    sys.exit("PyTorch not installed. Activate .venv and run: pip install torch torchvision")

try:
    from torchvision import datasets, models as tvm
    from torch.utils.data import DataLoader
except ImportError:
    sys.exit("torchvision not installed.")

try:
    from sklearn.metrics import (
        accuracy_score,
        classification_report,
        confusion_matrix,
        top_k_accuracy_score,
    )
except ImportError:
    sys.exit("scikit-learn not installed: pip install scikit-learn")

# ── Plotting ──────────────────────────────────────────────────────────────────
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import seaborn as sns
    HAS_PLOT = True
except ImportError:
    HAS_PLOT = False
    print("  WARNING: matplotlib/seaborn not installed — confusion matrix plot skipped.")

# ── Shared preprocessing ──────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))
from preprocessing import build_transform, safe_loader, MEAN, STD

# ─────────────────────────────────────────────────────────────────────────────
#  WEAK-CLASS THRESHOLDS
#  A class is flagged as weak if recall < this, or if it has fewer test images
# ─────────────────────────────────────────────────────────────────────────────
WEAK_RECALL_THRESHOLD  = 0.70   # recall below 70 % → weak
FEW_IMAGES_THRESHOLD   = 100    # fewer than 100 test images → data-scarce


# ══════════════════════════════════════════════════════════════════════════════
#  CLI
# ══════════════════════════════════════════════════════════════════════════════

def get_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Evaluate OralAI classifier on dataset/test (never dataset/train)"
    )
    p.add_argument(
        "--model",
        default=str(Path(__file__).parent / "oralai_best.pth"),
        help="Path to checkpoint .pth file",
    )
    p.add_argument(
        "--data",
        default=str(Path(__file__).parent / "dataset" / "test"),
        help="Path to test directory (must be ImageFolder layout)",
    )
    p.add_argument("--batch",   type=int, default=32, help="Batch size (default 32)")
    p.add_argument("--workers", type=int, default=0,  help="DataLoader workers (0 for Windows)")
    p.add_argument(
        "--out-dir",
        default=str(Path(__file__).parent / "outputs"),
        help="Directory for output files",
    )
    return p.parse_args()


# ══════════════════════════════════════════════════════════════════════════════
#  MODEL LOADER  — mirrors app.py exactly (uses checkpoint arch key)
# ══════════════════════════════════════════════════════════════════════════════

def load_model(model_path: str, device: torch.device):
    """
    Load checkpoint and reconstruct the exact architecture that was trained.
    Reads arch, img_size, and class_names from the checkpoint itself —
    never hardcodes the architecture.
    """
    mp = Path(model_path)
    if not mp.exists():
        sys.exit(
            f"\n  ERROR: Model not found at {mp}\n"
            "  Train first:  python train.py\n"
        )

    ckpt        = torch.load(str(mp), map_location=device, weights_only=False)
    class_names = ckpt.get("class_names", [])
    img_size    = ckpt.get("img_size",    96)
    arch        = ckpt.get("arch",        "mobilenet_v2")
    epoch       = ckpt.get("epoch",       "?")
    val_acc     = ckpt.get("val_acc",     None)
    num_classes = len(class_names)

    if not class_names:
        sys.exit("  ERROR: Checkpoint has no 'class_names' key. Re-train with train.py.")

    # ── Reconstruct architecture ───────────────────────────────────────────────
    state_keys = list(ckpt["model_state"].keys())

    if arch == "mobilenet_v2":
        model = tvm.mobilenet_v2(weights=None)
        in_f  = model.classifier[1].in_features   # 1280

        if any("classifier.4" in k for k in state_keys):
            # New head: Dropout → Linear(1280→256) → ReLU → Dropout → Linear(256→N)
            model.classifier = nn.Sequential(
                nn.Dropout(p=0.5),
                nn.Linear(in_f, 256),
                nn.ReLU(inplace=True),
                nn.Dropout(p=0.3),
                nn.Linear(256, num_classes),
            )
            head_label = f"MobileNetV2 + Linear(1280→256)→ReLU→Linear(256→{num_classes})"
        else:
            # Old head: Dropout → Linear(1280→N)
            model.classifier = nn.Sequential(
                nn.Dropout(p=0.4),
                nn.Linear(in_f, num_classes),
            )
            head_label = f"MobileNetV2 + Linear(1280→{num_classes})"

    else:
        # EfficientNetB0 or other timm arch
        try:
            import timm
        except ImportError:
            sys.exit("timm not installed but checkpoint arch != mobilenet_v2: pip install timm")
        backbone = timm.create_model(arch, pretrained=False,
                                     num_classes=0, global_pool="avg")
        head = nn.Sequential(
            nn.Dropout(0.4),
            nn.Linear(backbone.num_features, 512),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(512, num_classes),
        )
        model     = nn.Sequential(backbone, head)
        head_label = f"{arch} + Linear(feat→512)→GELU→Linear(512→{num_classes})"

    model.load_state_dict(ckpt["model_state"])
    model.eval().to(device)

    return model, class_names, img_size, {
        "arch":       arch,
        "head":       head_label,
        "img_size":   img_size,
        "epoch":      epoch,
        "val_acc_pct": round(val_acc * 100, 4) if val_acc else None,
        "num_classes":num_classes,
        "checkpoint": str(mp),
    }


# ══════════════════════════════════════════════════════════════════════════════
#  DATASET
# ══════════════════════════════════════════════════════════════════════════════

def load_test_dataset(data_dir: str, img_size: int, batch: int, workers: int):
    """
    Loads dataset/test with the deterministic 'infer' transform from preprocessing.py.
    This is IDENTICAL to the transform Flask uses — no randomness, no CenterCrop.
    """
    test_dir = Path(data_dir)
    if not test_dir.exists():
        sys.exit(
            f"\n  ERROR: Test directory not found: {test_dir}\n"
            "  Expected layout: dataset/test/<class_name>/*.jpg\n"
        )

    transform = build_transform(img_size, "infer")   # shared preprocessing
    ds = datasets.ImageFolder(str(test_dir), transform=transform, loader=safe_loader)

    loader = DataLoader(
        ds,
        batch_size=batch,
        shuffle=False,
        num_workers=workers,
        pin_memory=False,
    )
    return ds, loader


# ══════════════════════════════════════════════════════════════════════════════
#  INFERENCE LOOP
# ══════════════════════════════════════════════════════════════════════════════

def run_inference(model, loader, device) -> tuple[list, list, list]:
    """
    Returns (all_labels, all_preds, all_probs).
    model.eval() is verified; torch.no_grad() wraps every forward pass.
    """
    assert not model.training, "model must be in eval() mode before calling run_inference"

    all_labels, all_preds, all_probs = [], [], []

    with torch.no_grad():
        for batch_idx, (images, labels) in enumerate(loader):
            images = images.to(device)
            logits = model(images)
            probs  = torch.softmax(logits, dim=1).cpu().numpy()
            preds  = probs.argmax(axis=1)

            all_labels.extend(labels.numpy().tolist())
            all_preds.extend(preds.tolist())
            all_probs.extend(probs.tolist())

            # Progress dot every 10 batches
            if (batch_idx + 1) % 10 == 0:
                sys.stdout.write(".")
                sys.stdout.flush()

    print()  # newline after dots
    return all_labels, all_preds, all_probs


# ══════════════════════════════════════════════════════════════════════════════
#  CONFUSION MATRIX PLOT
# ══════════════════════════════════════════════════════════════════════════════

def save_confusion_matrix(
    cm: np.ndarray,
    class_names: list[str],
    out_path: str,
    top1_acc: float,
    n_samples: int,
):
    if not HAS_PLOT:
        print(f"  Skipping plot — matplotlib not installed.")
        return

    fig, ax = plt.subplots(figsize=(max(8, len(class_names) * 1.4),
                                    max(7, len(class_names) * 1.2)))

    # Normalised confusion matrix (row = true, col = pred)
    cm_norm = cm.astype(float) / cm.sum(axis=1, keepdims=True).clip(min=1)

    # Annotate with count AND percent
    annot = np.empty_like(cm, dtype=object)
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            annot[i, j] = f"{cm[i,j]}\n({cm_norm[i,j]*100:.0f}%)"

    sns.heatmap(
        cm_norm,
        annot=annot, fmt="",
        cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names,
        linewidths=0.5,
        linecolor="#e5e7eb",
        vmin=0, vmax=1,
        ax=ax,
        annot_kws={"size": 9},
    )

    ax.set_title(
        f"OralAI — Test-Set Confusion Matrix\n"
        f"Top-1 Accuracy: {top1_acc*100:.2f}%  |  N={n_samples} test images",
        fontsize=13, pad=14,
    )
    ax.set_xlabel("Predicted Label", fontsize=11)
    ax.set_ylabel("True Label",      fontsize=11)
    plt.xticks(rotation=35, ha="right", fontsize=9)
    plt.yticks(rotation=0,  fontsize=9)
    plt.tight_layout()
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  Confusion matrix  → {out_path}")


# ══════════════════════════════════════════════════════════════════════════════
#  WEAK-CLASS ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

def analyse_weak_classes(
    class_names:    list[str],
    per_class:      dict,
    class_counts:   dict,
) -> list[dict]:
    """
    Returns list of dicts for classes that are weak by recall or data volume.
    """
    weak = []
    for cls in class_names:
        m     = per_class.get(cls, {})
        rec   = m.get("recall",    0.0)
        prec  = m.get("precision", 0.0)
        f1    = m.get("f1",        0.0)
        count = class_counts.get(cls, 0)
        flags = []

        if rec < WEAK_RECALL_THRESHOLD:
            flags.append(f"low recall ({rec*100:.1f}% < {WEAK_RECALL_THRESHOLD*100:.0f}%)")
        if count < FEW_IMAGES_THRESHOLD:
            flags.append(f"few test images ({count} < {FEW_IMAGES_THRESHOLD})")

        if flags:
            weak.append({
                "class":     cls,
                "recall":    round(rec,   4),
                "precision": round(prec,  4),
                "f1":        round(f1,    4),
                "test_count":count,
                "flags":     flags,
            })
    return weak


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    args = get_args()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device(
        "cuda" if torch.cuda.is_available() else
        "mps"  if torch.backends.mps.is_available() else "cpu"
    )

    # ── Header ────────────────────────────────────────────────────────────────
    print()
    print("=" * 68)
    print("  OralAI — Test-Set Evaluation")
    print("=" * 68)
    print(f"  Device        : {device}")

    # ── Load model ─────────────────────────────────────────────────────────────
    model, class_names, img_size, ckpt_meta = load_model(args.model, device)
    print(f"  Checkpoint    : {Path(args.model).name}")
    print(f"  Architecture  : {ckpt_meta['arch']}")
    print(f"  Head          : {ckpt_meta['head']}")
    print(f"  img_size      : {img_size}px")
    print(f"  Classes ({ckpt_meta['num_classes']}): {class_names}")
    if ckpt_meta["val_acc_pct"] is not None:
        print(f"  Val acc (ckpt): {ckpt_meta['val_acc_pct']}%  "
              f"← validation-split accuracy, NOT test accuracy")
    print(f"  Transform     : preprocessing.build_transform({img_size}, 'infer')")
    print(f"                  Resize({img_size},{img_size}) → ToTensor → "
          f"Normalize({MEAN},{STD})")
    print(f"  EXIF fix      : safe_loader applies exif_transpose + RGB")
    print(f"  model.eval()  : {not model.training}")
    print(f"  no_grad       : enforced inside run_inference()")
    print()

    # ── Dataset ────────────────────────────────────────────────────────────────
    ds, loader = load_test_dataset(args.data, img_size, args.batch, args.workers)

    # Sanity check: ImageFolder class order must match checkpoint
    folder_order = [c for c, _ in sorted(ds.class_to_idx.items(), key=lambda x: x[1])]
    if folder_order != class_names:
        print("  WARNING: folder class order differs from checkpoint class_names!")
        for i, (f, c) in enumerate(zip(folder_order, class_names)):
            status = "OK" if f == c else f"MISMATCH  folder={f}  ckpt={c}"
            print(f"    [{i}] {status}")
    else:
        print("  Class order   : matches checkpoint exactly")

    # Per-class image counts in test split
    class_counts = {}
    for cls, idx in ds.class_to_idx.items():
        class_counts[cls] = sum(1 for _, lbl in ds.samples if lbl == idx)

    print(f"  Test images   : {len(ds)}")
    print(f"  Test dir      : {Path(args.data)}")
    print()
    print("  Per-class test counts:")
    for cls in class_names:
        n   = class_counts.get(cls, 0)
        flag = "  ⚠ FEW" if n < FEW_IMAGES_THRESHOLD else ""
        print(f"    {cls:<28} {n:>5} images{flag}")
    print()

    # ── Inference ──────────────────────────────────────────────────────────────
    print("  Running inference", end="")
    all_labels, all_preds, all_probs = run_inference(model, loader, device)
    n = len(all_labels)

    # ── Top-1 accuracy ─────────────────────────────────────────────────────────
    top1_acc = accuracy_score(all_labels, all_preds)

    # ── Top-3 accuracy ─────────────────────────────────────────────────────────
    probs_arr = np.array(all_probs)
    k         = min(3, len(class_names))
    top3_acc  = top_k_accuracy_score(all_labels, probs_arr, k=k)

    # ── Per-class metrics ──────────────────────────────────────────────────────
    report_str = classification_report(
        all_labels, all_preds,
        target_names=class_names,
        digits=4,
        zero_division=0,
    )
    report_dict = classification_report(
        all_labels, all_preds,
        target_names=class_names,
        digits=4,
        zero_division=0,
        output_dict=True,
    )

    per_class = {}
    for cls in class_names:
        m = report_dict.get(cls, {})
        per_class[cls] = {
            "precision": round(m.get("precision", 0.0), 4),
            "recall":    round(m.get("recall",    0.0), 4),
            "f1":        round(m.get("f1-score",  0.0), 4),
            "support":   int(m.get("support",     0)),
        }

    # ── Confusion matrix ───────────────────────────────────────────────────────
    cm = confusion_matrix(all_labels, all_preds)

    # ── Weak-class analysis ────────────────────────────────────────────────────
    weak_classes = analyse_weak_classes(class_names, per_class, class_counts)

    # ══════════════════════════════════════════════════════════════════════════
    #  PRINT RESULTS
    # ══════════════════════════════════════════════════════════════════════════

    print("=" * 68)
    print("  TEST-SET RESULTS")
    print("=" * 68)
    print(f"  Top-1 Accuracy : {top1_acc*100:.2f}%  ({sum(p==l for p,l in zip(all_preds,all_labels))}/{n})")
    print(f"  Top-{k} Accuracy : {top3_acc*100:.2f}%")
    print()

    # Per-class table
    w = max(len(c) for c in class_names)
    print(f"  {'Class':<{w}}  {'Precision':>10}  {'Recall':>8}  {'F1':>8}  {'Support':>8}")
    print("  " + "-" * (w + 42))
    for cls in class_names:
        m    = per_class[cls]
        flag = ""
        if m["recall"] < WEAK_RECALL_THRESHOLD:
            flag += "  ← low recall"
        if m["support"] < FEW_IMAGES_THRESHOLD:
            flag += "  ← few images"
        print(
            f"  {cls:<{w}}  {m['precision']:>10.4f}  {m['recall']:>8.4f}"
            f"  {m['f1']:>8.4f}  {m['support']:>8}{flag}"
        )
    print()

    # Macro / weighted averages
    ma = report_dict.get("macro avg", {})
    wa = report_dict.get("weighted avg", {})
    print(f"  Macro avg   — precision:{ma.get('precision',0):.4f}  "
          f"recall:{ma.get('recall',0):.4f}  F1:{ma.get('f1-score',0):.4f}")
    print(f"  Weighted avg— precision:{wa.get('precision',0):.4f}  "
          f"recall:{wa.get('recall',0):.4f}  F1:{wa.get('f1-score',0):.4f}")
    print()

    # Confusion matrix (text)
    print("  Confusion Matrix (rows=True, cols=Predicted):")
    header = "  " + " " * w + "  " + "  ".join(f"{c[:6]:>6}" for c in class_names)
    print(header)
    for i, cls in enumerate(class_names):
        row = "  ".join(f"{cm[i,j]:>6}" for j in range(len(class_names)))
        print(f"  {cls:<{w}}  {row}")
    print()

    # Weak-class analysis
    if weak_classes:
        print("  ⚠  WEAK CLASSES DETECTED:")
        for wc in weak_classes:
            print(f"     {wc['class']:<{w}}  recall={wc['recall']*100:.1f}%  "
                  f"f1={wc['f1']*100:.1f}%  test_n={wc['test_count']}")
            for fl in wc["flags"]:
                print(f"       → {fl}")
        print()
        print("  Interpretation:")
        print("  - Low recall means the model misses real cases of that disease.")
        print("  - Few test images means this metric is statistically unreliable.")
        print("  - Both together = the class needs more real training data.")
        print()
    else:
        print("  All classes passed recall and data-volume thresholds.")
        print()

    print("  Medical screening note:")
    print("  Accuracy alone is NOT sufficient for disease screening.")
    print("  Recall (sensitivity) is critical — a missed disease is a false negative.")
    print("  Review per-class recall above, especially for severe conditions.")
    print()

    # ══════════════════════════════════════════════════════════════════════════
    #  SAVE OUTPUTS
    # ══════════════════════════════════════════════════════════════════════════

    ts = datetime.now(timezone.utc).isoformat()

    # ── 1. Confusion matrix PNG ────────────────────────────────────────────────
    cm_path = str(out_dir / "confusion_matrix.png")
    save_confusion_matrix(cm, class_names, cm_path, top1_acc, n)

    # ── 2. Classification report TXT ──────────────────────────────────────────
    cr_path = out_dir / "classification_report.txt"
    with open(cr_path, "w", encoding="utf-8") as f:
        f.write("OralAI — Classification Report (Test Set)\n")
        f.write(f"Generated : {ts}\n")
        f.write(f"Checkpoint: {ckpt_meta['checkpoint']}\n")
        f.write(f"Test dir  : {args.data}\n")
        f.write(f"Samples   : {n}\n")
        f.write(f"Top-1 Acc : {top1_acc*100:.4f}%\n")
        f.write(f"Top-{k} Acc : {top3_acc*100:.4f}%\n")
        f.write("\n")
        f.write("NOTE: This is TEST-SET accuracy. "
                "val_acc in the checkpoint is a different split.\n\n")
        f.write(report_str)
        f.write("\n")
        if weak_classes:
            f.write("WEAK CLASSES\n")
            f.write("-" * 40 + "\n")
            for wc in weak_classes:
                f.write(f"  {wc['class']}: recall={wc['recall']*100:.1f}%  "
                        f"f1={wc['f1']*100:.1f}%  test_n={wc['test_count']}\n")
                for fl in wc["flags"]:
                    f.write(f"    -> {fl}\n")
    print(f"  Classification report → {cr_path}")

    # ── 3. JSON metrics ───────────────────────────────────────────────────────
    json_payload = {
        "generated_at":       ts,
        "note": (
            "top1_accuracy and top3_accuracy are TEST-SET metrics. "
            "val_acc_in_checkpoint is a DIFFERENT split measured during training — "
            "do NOT report it as model accuracy."
        ),
        "checkpoint":         ckpt_meta["checkpoint"],
        "arch":               ckpt_meta["arch"],
        "head":               ckpt_meta["head"],
        "img_size":           img_size,
        "epoch_saved":        ckpt_meta["epoch"],
        "val_acc_in_checkpoint": ckpt_meta["val_acc_pct"],
        "test_dir":           args.data,
        "n_test_images":      n,
        "top1_accuracy":      round(top1_acc, 6),
        "top1_accuracy_pct":  round(top1_acc * 100, 4),
        "top3_accuracy":      round(top3_acc, 6),
        "top3_accuracy_pct":  round(top3_acc * 100, 4),
        "macro_precision":    round(ma.get("precision", 0), 6),
        "macro_recall":       round(ma.get("recall",    0), 6),
        "macro_f1":           round(ma.get("f1-score",  0), 6),
        "weighted_precision": round(wa.get("precision", 0), 6),
        "weighted_recall":    round(wa.get("recall",    0), 6),
        "weighted_f1":        round(wa.get("f1-score",  0), 6),
        "per_class":          per_class,
        "test_image_counts":  {c: class_counts.get(c, 0) for c in class_names},
        "weak_classes":       weak_classes,
        "class_names":        class_names,
        "preprocessing": {
            "transform":    f"build_transform({img_size}, 'infer')",
            "resize":       f"({img_size}, {img_size})",
            "normalize_mean": MEAN,
            "normalize_std":  STD,
            "exif_fix":     "ImageOps.exif_transpose via safe_loader",
            "augmentation": "none (infer split)",
        },
        "confusion_matrix": cm.tolist(),
    }

    jm_path = out_dir / "test_metrics.json"
    with open(jm_path, "w", encoding="utf-8") as f:
        json.dump(json_payload, f, indent=2)
    print(f"  Test metrics JSON  → {jm_path}")

    print()
    print("=" * 68)
    print(f"  Done.  Top-1 Test Accuracy: {top1_acc*100:.2f}%  "
          f"Top-{k}: {top3_acc*100:.2f}%")
    print("=" * 68)
    print()


if __name__ == "__main__":
    main()
