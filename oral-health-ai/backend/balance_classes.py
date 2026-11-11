"""
OralAI — Class Balancer
========================
Fixes the class imbalance by:
1. Augmenting under-represented classes (healthy, caries, oral_ulcer)
   by generating flipped/rotated copies until they reach TARGET_MIN
2. Capping over-represented classes (oral_lesion, gingivitis)
   by randomly removing images down to TARGET_MAX

Run BEFORE rebalance_and_train.py:
    python balance_classes.py
    python rebalance_and_train.py
"""

import random, shutil
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter

DATASET_DIR  = Path("./dataset")
TARGET_MIN   = 2500   # augment any class below this
TARGET_MAX   = 3000   # cap any class above this
SEED         = 42
SPLITS       = ["train"]  # only balance the training split

VALID_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def augment_image(img: Image.Image, idx: int) -> Image.Image:
    """Apply one of several augmentations based on idx."""
    ops = [
        lambda i: ImageOps.mirror(i),
        lambda i: i.rotate(random.uniform(-15, 15), expand=False),
        lambda i: ImageOps.autocontrast(i),
        lambda i: i.filter(ImageFilter.SHARPEN),
        lambda i: ImageOps.mirror(i).rotate(random.uniform(-10, 10)),
        lambda i: i.rotate(180),
        lambda i: ImageOps.flip(i),
        lambda i: ImageOps.equalize(i.convert("RGB")),
    ]
    op = ops[idx % len(ops)]
    try:
        return op(img.convert("RGB"))
    except Exception:
        return img.convert("RGB")


def balance_split(split: str):
    split_dir = DATASET_DIR / split
    if not split_dir.exists():
        print(f"  ⚠️  {split_dir} not found, skipping.")
        return

    classes = [d for d in split_dir.iterdir() if d.is_dir()]
    rng = random.Random(SEED)

    print(f"\n  Split: {split}")
    print(f"  {'Class':<30}  {'Before':>7}  {'After':>7}  {'Action'}")
    print("  " + "─" * 65)

    for cls_dir in sorted(classes):
        images = [f for f in cls_dir.iterdir()
                  if f.suffix.lower() in VALID_EXTS and f.is_file()]
        n = len(images)

        # ── CAP over-represented classes ──────────────────────────────────
        if n > TARGET_MAX:
            rng.shuffle(images)
            to_remove = images[TARGET_MAX:]
            for f in to_remove:
                f.unlink(missing_ok=True)
            after = TARGET_MAX
            print(f"  {cls_dir.name:<30}  {n:>7}  {after:>7}  capped (-{len(to_remove)})")

        # ── AUGMENT under-represented classes ─────────────────────────────
        elif n < TARGET_MIN:
            needed = TARGET_MIN - n
            sources = images.copy()
            rng.shuffle(sources)
            added = 0
            aug_idx = 0
            while added < needed:
                src = sources[added % len(sources)]
                try:
                    img = Image.open(src).convert("RGB")
                    aug = augment_image(img, aug_idx)
                    dst = cls_dir / f"{cls_dir.name}_aug_{added:05d}{src.suffix.lower()}"
                    aug.save(dst, quality=92)
                    added += 1
                except Exception:
                    pass
                aug_idx += 1
            after = n + added
            print(f"  {cls_dir.name:<30}  {n:>7}  {after:>7}  augmented (+{added})")

        else:
            print(f"  {cls_dir.name:<30}  {n:>7}  {n:>7}  ok")


def main():
    print("\n  ╔═══════════════════════════════════════╗")
    print("  ║  OralAI — Class Balancer              ║")
    print(f"  ║  Target min={TARGET_MIN}  max={TARGET_MAX}            ║")
    print("  ╚═══════════════════════════════════════╝")

    for split in SPLITS:
        balance_split(split)

    print("\n  ✅ Balancing complete.")
    print("  Now run:  python rebalance_and_train.py\n")


if __name__ == "__main__":
    main()
