"""
OralAI — PyTorch Training Script  (CPU-optimised)
==================================================
Architecture : MobileNetV2 (pretrained on ImageNet via torchvision)
               → Dropout(0.4) → Linear(num_classes)
               Fast on CPU (~2-4 min/epoch for 8K images at 96px)

Optimizer    : AdamW with CosineAnnealingLR
Loss         : Weighted CrossEntropyLoss (handles class imbalance)
Features     : Early stopping, best-model checkpointing, CSV history,
               per-batch progress dots so you can see it moving

Dataset layout (required before running):
    dataset/
      train/ val/ test/
        each contains one folder per class

Usage:
    python train.py                         # full training (CPU-optimised)
    python train.py --smoke                 # 2 epochs, tiny batch
    python train.py --epochs 30 --batch 32  # custom settings

Outputs:
    models/oralai_efficientnet_best.pth   ← best checkpoint (same filename as before)
    models/class_names.json               ← class index mapping
    outputs/training_history.csv          ← per-epoch metrics
"""

import argparse
import json
import os
import random
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms


# ── Shared preprocessing (EXIF fix, RGB, transforms, quality check) ───────────
from preprocessing import build_transform as _build_transform, safe_loader as _safe_loader


# ════════════════════════════════════════════════════════════════════════════
#  ARGS
# ════════════════════════════════════════════════════════════════════════════

def get_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Train OralAI classifier (CPU-optimised)")
    p.add_argument("--data",      default="./dataset",       help="Dataset root")
    p.add_argument("--epochs",    type=int,   default=20,    help="Max training epochs")
    p.add_argument("--batch",     type=int,   default=32,    help="Batch size")
    p.add_argument("--lr",        type=float, default=1e-3,  help="Learning rate")
    p.add_argument("--img-size",  type=int,   default=96,    help="Input image size (96 for CPU speed)")
    p.add_argument("--patience",  type=int,   default=5,     help="Early-stopping patience")
    p.add_argument("--dropout",   type=float, default=0.4,   help="Head dropout probability")
    p.add_argument("--workers",   type=int,   default=0,     help="DataLoader workers (0 for Windows)")
    p.add_argument("--seed",      type=int,   default=42)
    p.add_argument("--out-model", default="./models/oralai_efficientnet_best.pth")
    p.add_argument("--out-csv",   default="./outputs/training_history.csv")
    p.add_argument("--smoke",     action="store_true", help="2 epochs, batch=8, 50 samples/class")
    return p.parse_args()


# ════════════════════════════════════════════════════════════════════════════
#  REPRODUCIBILITY
# ════════════════════════════════════════════════════════════════════════════

def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


# ════════════════════════════════════════════════════════════════════════════
#  TRANSFORMS
# ════════════════════════════════════════════════════════════════════════════

_MEAN = [0.485, 0.456, 0.406]
_STD  = [0.229, 0.224, 0.225]


def build_transforms(img_size: int, split: str):
    """Delegates to the shared preprocessing module."""
    return _build_transform(img_size, split)


# ════════════════════════════════════════════════════════════════════════════
#  DATASET
# ════════════════════════════════════════════════════════════════════════════

def load_datasets(data_root: str, img_size: int, batch: int, workers: int, smoke: bool):
    root      = Path(data_root)
    train_dir = root / "train"
    val_dir   = root / "val"

    if not train_dir.exists():
        raise FileNotFoundError(f"Training dir not found: {train_dir}\nRun prepare_dataset.py first.")
    if not val_dir.exists():
        raise FileNotFoundError(f"Val dir not found: {val_dir}")

    train_ds = datasets.ImageFolder(str(train_dir), transform=build_transforms(img_size, "train"),
                                    loader=_safe_loader)
    val_ds   = datasets.ImageFolder(str(val_dir),   transform=build_transforms(img_size, "val"),
                                    loader=_safe_loader)

    # Smoke: limit to 50 samples per class for a fast sanity check
    if smoke:
        from torch.utils.data import Subset
        def cap(ds, n_per_class):
            idxs = []
            counts = {}
            for i, (_, lbl) in enumerate(ds.samples):
                if counts.get(lbl, 0) < n_per_class:
                    idxs.append(i)
                    counts[lbl] = counts.get(lbl, 0) + 1
            return Subset(ds, idxs)
        train_ds = cap(train_ds, 50)
        val_ds   = cap(val_ds,   20)

    # Class weights for imbalanced data
    # Get underlying dataset for samples list
    base_train = train_ds.dataset if hasattr(train_ds, "dataset") else train_ds
    samples    = [base_train.samples[i] for i in train_ds.indices] if hasattr(train_ds, "indices") else base_train.samples
    labels     = [lbl for _, lbl in samples]
    counts     = np.bincount(labels)
    total      = counts.sum()
    weights    = torch.tensor(total / (len(counts) * counts + 1e-8), dtype=torch.float32)

    # Windows: num_workers must be 0 (no forking)
    train_loader = DataLoader(train_ds, batch_size=batch, shuffle=True,  num_workers=0, pin_memory=False, drop_last=False)
    val_loader   = DataLoader(val_ds,   batch_size=batch, shuffle=False, num_workers=0, pin_memory=False)

    base = base_train
    print(f"\n  Dataset loaded")
    print(f"  Classes ({len(base.classes)}): {base.classes}")
    print(f"  Train samples : {len(train_ds)}")
    print(f"  Val   samples : {len(val_ds)}")
    print(f"  Class weights : {weights.numpy().round(3)}")

    return train_loader, val_loader, base.classes, weights


# ════════════════════════════════════════════════════════════════════════════
#  MODEL  — MobileNetV2 (fast on CPU, ~3.4M params)
# ════════════════════════════════════════════════════════════════════════════

def build_model(num_classes: int, dropout: float, device: torch.device):
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)

    # Replace classifier
    in_features = model.classifier[1].in_features   # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(p=dropout),
        nn.Linear(in_features, num_classes),
    )

    # Phase 1: freeze all features, train only classifier
    for param in model.features.parameters():
        param.requires_grad = False
    for param in model.classifier.parameters():
        param.requires_grad = True

    model = model.to(device)

    total     = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"\n  Model      : MobileNetV2 + head (1280 → {num_classes})")
    print(f"  Parameters : {total:,} total  |  {trainable:,} trainable (head only, phase 1)")
    return model


# ════════════════════════════════════════════════════════════════════════════
#  TRAIN / VALIDATE ONE EPOCH
# ════════════════════════════════════════════════════════════════════════════

def run_epoch(model, loader, criterion, optimizer, device, phase="train"):
    is_train = phase == "train"
    model.train() if is_train else model.eval()

    running_loss = 0.0
    correct = 0
    total   = 0
    n_batches = len(loader)

    ctx = torch.enable_grad() if is_train else torch.no_grad()
    with ctx:
        for batch_idx, (images, labels) in enumerate(loader):
            images, labels = images.to(device), labels.to(device)

            if is_train:
                optimizer.zero_grad()

            logits = model(images)
            loss   = criterion(logits, labels)

            if is_train:
                loss.backward()
                nn.utils.clip_grad_norm_(
                    [p for p in model.parameters() if p.requires_grad], max_norm=1.0
                )
                optimizer.step()

            running_loss += loss.item() * images.size(0)
            preds         = logits.argmax(dim=1)
            correct      += (preds == labels).sum().item()
            total        += labels.size(0)

            # Progress: print a dot every 10 batches so the user sees activity
            if is_train and (batch_idx + 1) % 10 == 0:
                pct = (batch_idx + 1) / n_batches * 100
                sys.stdout.write(f"\r    batch {batch_idx+1}/{n_batches} ({pct:.0f}%)  loss={running_loss/total:.4f}")
                sys.stdout.flush()

    if is_train:
        sys.stdout.write("\r" + " " * 60 + "\r")  # clear progress line
        sys.stdout.flush()

    return running_loss / max(total, 1), correct / max(total, 1)


# ════════════════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════════════════

def main():
    args = get_args()

    if args.smoke:
        print("\n  ⚡ SMOKE TEST — 2 epochs, batch=8, 50 samples/class")
        args.epochs   = 2
        args.batch    = 8
        args.patience = 99

    set_seed(args.seed)

    device = torch.device("cpu")   # CPU only (no GPU on this machine)
    print(f"\n  Device : {device}  (MobileNetV2 @ {args.img_size}px — optimised for CPU)")

    Path(args.out_model).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out_csv).parent.mkdir(parents=True, exist_ok=True)

    train_loader, val_loader, class_names, class_weights = load_datasets(
        args.data, args.img_size, args.batch, args.workers, args.smoke
    )
    num_classes = len(class_names)

    # Save class names
    cn_path = Path(args.out_model).parent / "class_names.json"
    with open(cn_path, "w") as f:
        json.dump({"classes": class_names, "num_classes": num_classes}, f, indent=2)
    print(f"  Class names saved → {cn_path}")

    model     = build_model(num_classes, args.dropout, device)
    criterion = nn.CrossEntropyLoss(weight=class_weights.to(device))

    # Phase 1: head only
    optimizer = AdamW([p for p in model.parameters() if p.requires_grad],
                      lr=args.lr, weight_decay=1e-4)
    warmup_epochs  = max(1, int(args.epochs * 0.3))
    scheduler      = CosineAnnealingLR(optimizer, T_max=warmup_epochs, eta_min=args.lr * 0.01)

    history        = []
    best_val_acc   = 0.0
    no_improve     = 0
    phase2_started = False

    print(f"\n  Training {args.epochs} epochs  |  batch={args.batch}  |  img={args.img_size}px  |  patience={args.patience}")
    print(f"  Warmup (head only): {warmup_epochs} epochs  →  then full fine-tune")
    print()
    print(f"  {'Ep':>4}  {'Phase':>9}  {'TrainLoss':>10}  {'TrainAcc':>9}  {'ValLoss':>9}  {'ValAcc':>8}  {'LR':>10}")
    print("  " + "─" * 70)

    t_start = time.time()

    for epoch in range(1, args.epochs + 1):

        # Switch to phase 2
        if epoch == warmup_epochs + 1 and not phase2_started:
            phase2_started = True
            for param in model.features.parameters():
                param.requires_grad = True
            trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
            print(f"\n  Phase 2: all params unfrozen ({trainable:,} trainable)\n")
            optimizer = AdamW([
                {"params": model.features.parameters(), "lr": args.lr * 0.1},
                {"params": model.classifier.parameters(), "lr": args.lr},
            ], weight_decay=1e-4)
            scheduler = CosineAnnealingLR(optimizer, T_max=args.epochs - warmup_epochs,
                                          eta_min=args.lr * 0.001)

        phase_str = "fine-tune" if phase2_started else "warm-up"

        train_loss, train_acc = run_epoch(model, train_loader, criterion, optimizer, device, "train")
        val_loss,   val_acc   = run_epoch(model, val_loader,   criterion, None,      device, "val")
        scheduler.step()
        current_lr = optimizer.param_groups[0]["lr"]

        history.append({
            "epoch": epoch, "phase": phase_str,
            "train_loss": round(train_loss, 4), "train_acc": round(train_acc, 4),
            "val_loss":   round(val_loss,   4), "val_acc":   round(val_acc,   4),
            "lr":         round(current_lr, 8),
        })

        is_best = val_acc > best_val_acc
        if is_best:
            best_val_acc = val_acc
            no_improve   = 0
            torch.save({
                "epoch":       epoch,
                "model_state": model.state_dict(),
                "val_acc":     val_acc,
                "class_names": class_names,
                "img_size":    args.img_size,
                "arch":        "mobilenet_v2",
            }, args.out_model)
            marker = "  ← best ✓"
        else:
            no_improve += 1
            marker = ""

        elapsed_min = (time.time() - t_start) / 60
        print(f"  {epoch:>4}  {phase_str:>9}  {train_loss:>10.4f}  "
              f"{train_acc*100:>8.2f}%  {val_loss:>9.4f}  "
              f"{val_acc*100:>7.2f}%  {current_lr:>10.2e}{marker}"
              f"  [{elapsed_min:.1f}m]")

        if no_improve >= args.patience:
            print(f"\n  Early stopping at epoch {epoch} (no improvement for {args.patience} epochs)")
            break

    elapsed = time.time() - t_start
    print(f"\n  ✅ Training complete in {elapsed/60:.1f} min")
    print(f"  Best val accuracy : {best_val_acc*100:.2f}%")
    print(f"  Model saved       → {args.out_model}")

    pd.DataFrame(history).to_csv(args.out_csv, index=False)
    print(f"  History saved     → {args.out_csv}\n")


if __name__ == "__main__":
    main()
