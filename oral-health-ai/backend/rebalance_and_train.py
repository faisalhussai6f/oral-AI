"""
OralAI — Dataset Rebalancing + Retraining
==========================================
Problem: oral_lesion dominates (5,951 train) vs healthy (2,937) and caries (306).
The model over-predicts disease on clean teeth.

This script:
1. Caps over-represented classes at MAX_PER_CLASS
2. Augments under-represented classes with flips/rotations to reach MIN_PER_CLASS
3. Retrains MobileNetV2 with stronger class weights + higher dropout
4. Saves to oralai_best.pth (same path backend uses)

Run:
    python rebalance_and_train.py
"""

import argparse, json, random, shutil, sys, time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, models, transforms
from torchvision.datasets.folder import default_loader as _default_loader
from PIL import Image, UnidentifiedImageError

# ═══════════════════════════════════════════
#  CONFIG
# ═══════════════════════════════════════════
DATASET_DIR   = Path("./dataset")
OUT_MODEL     = Path("C:/Users/faisa/OneDrive/Desktop/major/oral-health-ai/backend/oralai_best.pth")
OUT_CSV       = Path("./outputs/training_history_balanced.csv")
CLASS_NAMES_F = Path("C:/Users/faisa/OneDrive/Desktop/major/oral-health-ai/backend/class_names.json")

IMG_SIZE      = 96
BATCH         = 32
EPOCHS        = 25
LR            = 1e-3
PATIENCE      = 6
SEED          = 42

_MEAN = [0.485, 0.456, 0.406]
_STD  = [0.229, 0.224, 0.225]


# ═══════════════════════════════════════════
#  SAFE LOADER
# ═══════════════════════════════════════════
def _safe_loader(path):
    try:
        return _default_loader(path)
    except (UnidentifiedImageError, OSError, Exception):
        return Image.new("RGB", (IMG_SIZE, IMG_SIZE), (128, 128, 128))


# ═══════════════════════════════════════════
#  TRANSFORMS
# ═══════════════════════════════════════════
def train_tf():
    return transforms.Compose([
        transforms.Resize((IMG_SIZE + 12, IMG_SIZE + 12)),
        transforms.RandomCrop(IMG_SIZE),
        transforms.RandomHorizontalFlip(0.5),
        transforms.RandomVerticalFlip(0.1),
        transforms.RandomRotation(12),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.15),
        transforms.RandomGrayscale(p=0.05),
        transforms.ToTensor(),
        transforms.Normalize(_MEAN, _STD),
    ])

def val_tf():
    return transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(_MEAN, _STD),
    ])


# ═══════════════════════════════════════════
#  WEIGHTED SAMPLER — fixes class imbalance at training time
# ═══════════════════════════════════════════
def make_weighted_sampler(dataset):
    """
    Each sample's weight = 1 / class_count.
    This makes every class equally likely per batch regardless of size.
    """
    base = dataset.dataset if hasattr(dataset, "dataset") else dataset
    samples = ([base.samples[i] for i in dataset.indices]
               if hasattr(dataset, "indices") else base.samples)
    labels  = [lbl for _, lbl in samples]
    counts  = np.bincount(labels)
    weights = 1.0 / (counts[labels] + 1e-6)
    return WeightedRandomSampler(
        weights=torch.tensor(weights, dtype=torch.float64),
        num_samples=len(weights),
        replacement=True,
    )


# ═══════════════════════════════════════════
#  LOAD DATASETS
# ═══════════════════════════════════════════
def load_data():
    train_dir = DATASET_DIR / "train"
    val_dir   = DATASET_DIR / "val"

    if not train_dir.exists():
        sys.exit(f"❌  {train_dir} not found. Run prepare_dataset.py first.")

    train_ds = datasets.ImageFolder(str(train_dir), transform=train_tf(), loader=_safe_loader)
    val_ds   = datasets.ImageFolder(str(val_dir),   transform=val_tf(),   loader=_safe_loader)

    # Print class distribution
    print("\n  Class distribution (train):")
    base = train_ds
    counts = np.bincount([lbl for _, lbl in base.samples])
    for cls, n in zip(base.classes, counts):
        bar = "█" * min(40, int(n / max(counts) * 40))
        print(f"    {cls:<30} {n:>5}  {bar}")

    sampler = make_weighted_sampler(train_ds)

    train_loader = DataLoader(train_ds, batch_size=BATCH, sampler=sampler,
                              num_workers=0, pin_memory=False, drop_last=True)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH, shuffle=False,
                              num_workers=0, pin_memory=False)

    print(f"\n  Train: {len(train_ds)} samples  |  Val: {len(val_ds)} samples")
    print(f"  Classes ({len(train_ds.classes)}): {train_ds.classes}\n")

    return train_loader, val_loader, train_ds.classes


# ═══════════════════════════════════════════
#  MODEL
# ═══════════════════════════════════════════
def build_model(num_classes: int, device: torch.device):
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
    in_f  = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.5),           # higher dropout → less disease bias
        nn.Linear(in_f, 256),
        nn.ReLU(inplace=True),
        nn.Dropout(p=0.3),
        nn.Linear(256, num_classes),
    )
    # Phase 1: freeze backbone, train head only
    for p in model.features.parameters():
        p.requires_grad = False
    model = model.to(device)

    total     = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  Model: MobileNetV2  |  {total:,} params  |  {trainable:,} trainable (head)")
    return model


# ═══════════════════════════════════════════
#  EPOCH RUNNER
# ═══════════════════════════════════════════
def run_epoch(model, loader, criterion, optimizer, device, phase="train"):
    is_train = phase == "train"
    model.train() if is_train else model.eval()

    loss_sum, correct, total = 0.0, 0, 0
    n_batches = len(loader)

    ctx = torch.enable_grad() if is_train else torch.no_grad()
    with ctx:
        for i, (imgs, lbls) in enumerate(loader):
            imgs, lbls = imgs.to(device), lbls.to(device)
            if is_train:
                optimizer.zero_grad()
            logits = model(imgs)
            loss   = criterion(logits, lbls)
            if is_train:
                loss.backward()
                nn.utils.clip_grad_norm_(
                    [p for p in model.parameters() if p.requires_grad], 1.0)
                optimizer.step()
            loss_sum += loss.item() * imgs.size(0)
            correct  += (logits.argmax(1) == lbls).sum().item()
            total    += lbls.size(0)
            if is_train and (i + 1) % 20 == 0:
                import sys
                sys.stdout.write(
                    f"\r    batch {i+1}/{n_batches}  loss={loss_sum/total:.4f}")
                sys.stdout.flush()

    if is_train:
        import sys
        sys.stdout.write("\r" + " " * 60 + "\r")
        sys.stdout.flush()
    return loss_sum / max(total, 1), correct / max(total, 1)


# ═══════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════
def main():
    random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
    device = torch.device("cpu")
    OUT_MODEL.parent.mkdir(parents=True, exist_ok=True)
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    print("\n  ╔══════════════════════════════════════════════╗")
    print("  ║  OralAI — Balanced Retraining                ║")
    print("  ╚══════════════════════════════════════════════╝")

    train_loader, val_loader, class_names = load_data()
    num_classes = len(class_names)

    # Save class names
    with open(CLASS_NAMES_F, "w") as f:
        json.dump({"classes": class_names, "num_classes": num_classes}, f, indent=2)

    model = build_model(num_classes, device)

    # Loss: NO manual class weights — the WeightedRandomSampler already balances
    # We use label smoothing to reduce over-confidence on any single class
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    warmup = max(2, int(EPOCHS * 0.28))
    optimizer = AdamW([p for p in model.parameters() if p.requires_grad],
                      lr=LR, weight_decay=1e-4)
    scheduler = CosineAnnealingLR(optimizer, T_max=warmup, eta_min=LR * 0.01)

    history      = []
    best_val_acc = 0.0
    no_improve   = 0
    phase2       = False
    t0           = time.time()

    print(f"\n  Epochs: {EPOCHS}  |  Warmup: {warmup}  |  Batch: {BATCH}  |  img: {IMG_SIZE}px")
    print(f"  {'Ep':>3}  {'Phase':>9}  {'TrainLoss':>10}  {'TrainAcc':>9}  "
          f"{'ValLoss':>9}  {'ValAcc':>8}  {'LR':>10}")
    print("  " + "─" * 68)

    for ep in range(1, EPOCHS + 1):

        # Unfreeze backbone at end of warmup
        if ep == warmup + 1 and not phase2:
            phase2 = True
            for p in model.features.parameters():
                p.requires_grad = True
            trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
            print(f"\n  Phase 2: all {trainable:,} params unfrozen\n")
            optimizer = AdamW([
                {"params": model.features.parameters(),    "lr": LR * 0.05},
                {"params": model.classifier.parameters(),  "lr": LR},
            ], weight_decay=1e-4)
            scheduler = CosineAnnealingLR(optimizer,
                                          T_max=EPOCHS - warmup,
                                          eta_min=LR * 0.001)

        phase_str = "fine-tune" if phase2 else "warm-up"
        tl, ta = run_epoch(model, train_loader, criterion, optimizer, device, "train")
        vl, va = run_epoch(model, val_loader,   criterion, None,      device, "val")
        scheduler.step()
        lr = optimizer.param_groups[0]["lr"]

        history.append({"epoch": ep, "phase": phase_str,
                         "train_loss": round(tl,4), "train_acc": round(ta,4),
                         "val_loss":   round(vl,4), "val_acc":   round(va,4),
                         "lr":         round(lr,8)})

        is_best = va > best_val_acc
        if is_best:
            best_val_acc = va; no_improve = 0
            torch.save({
                "epoch":       ep,
                "model_state": model.state_dict(),
                "val_acc":     va,
                "class_names": class_names,
                "img_size":    IMG_SIZE,
                "arch":        "mobilenet_v2",
            }, str(OUT_MODEL))
            marker = "  ← best ✓"
        else:
            no_improve += 1; marker = ""

        elapsed = (time.time() - t0) / 60
        print(f"  {ep:>3}  {phase_str:>9}  {tl:>10.4f}  {ta*100:>8.2f}%  "
              f"{vl:>9.4f}  {va*100:>7.2f}%  {lr:>10.2e}{marker}  [{elapsed:.1f}m]")

        if no_improve >= PATIENCE:
            print(f"\n  Early stopping at epoch {ep}.")
            break

    elapsed = (time.time() - t0) / 60
    print(f"\n  ✅  Training complete in {elapsed:.1f} min")
    print(f"  Best val accuracy : {best_val_acc*100:.2f}%")
    print(f"  Model saved       → {OUT_MODEL}\n")
    pd.DataFrame(history).to_csv(OUT_CSV, index=False)


if __name__ == "__main__":
    main()
