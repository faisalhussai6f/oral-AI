"""
OralAI — Second Dataset Merger
================================
Downloads:  zaidpy/oral-cancer-dataset
Merges it into the existing  dataset/train|val|test/<class>/  folders
that were already built from sizlingdhairya1/oral-infection.

New images are APPENDED — existing images are not removed.
A 70/15/15 per-class split is applied to the new images only.

Usage:
    python merge_dataset.py              # download + merge
    python merge_dataset.py --dry-run    # show what would happen, copy nothing
    python merge_dataset.py --skip-download  # re-merge from cache
"""

import argparse
import random
import shutil
from pathlib import Path

try:
    import kagglehub
    HAS_KAGGLEHUB = True
except ImportError:
    HAS_KAGGLEHUB = False

# ── Class map — handles both datasets ─────────────────────────────────────────
CLASS_MAP = {
    # Healthy
    "healthy": "healthy", "normal": "healthy", "no disease": "healthy",
    "benign": "healthy", "non cancer": "healthy", "non-cancer": "healthy",
    "noncancer": "healthy", "no cancer": "healthy",

    # Caries
    "caries": "caries", "dental caries": "caries", "dental_caries": "caries",
    "cavity": "caries", "cavities": "caries",

    # Gingivitis
    "gingivitis": "gingivitis", "gum disease": "gingivitis",

    # Plaque
    "plaque": "plaque", "plaque accumulation": "plaque",
    "dental plaque": "plaque", "calculus": "plaque",
    "tooth discoloration": "plaque", "tooth_discoloration": "plaque",
    "discoloration": "plaque",

    # Enamel
    "enamel demineralization": "enamel_demineralization",
    "enamel_demineralization": "enamel_demineralization",
    "demineralization": "enamel_demineralization",
    "white spot": "enamel_demineralization",

    # Periodontal
    "periodontal": "periodontal_disease",
    "periodontal disease": "periodontal_disease",
    "periodontal_disease": "periodontal_disease",
    "periodontitis": "periodontal_disease",

    # Oral Ulcer
    "oral ulcer": "oral_ulcer", "oral_ulcer": "oral_ulcer",
    "ulcer": "oral_ulcer", "canker": "oral_ulcer", "aphthous": "oral_ulcer",
    "infection": "oral_ulcer", "oral infection": "oral_ulcer",

    # Oral Lesion / Cancer
    "oral lesion": "oral_lesion", "oral_lesion": "oral_lesion",
    "lesion": "oral_lesion", "mouth lesion": "oral_lesion",
    "oral cancer": "oral_lesion", "oral_cancer": "oral_lesion",
    "cancer": "oral_lesion", "malignant": "oral_lesion",
    "hypodontia": "oral_lesion", "missing teeth": "oral_lesion",
    "squamous cell carcinoma": "oral_lesion",
    "squamous_cell_carcinoma": "oral_lesion",
    "oscc": "oral_lesion",
    "tumour": "oral_lesion", "tumor": "oral_lesion",
    "leukoplakia": "oral_lesion",
}

VALID_EXTS  = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"}
DATASET_DIR = Path("dataset")
SPLITS      = ("train", "val", "test")
RATIOS      = (0.70, 0.15, 0.15)


def map_folder(name: str):
    key = name.lower().strip().replace("-", " ").replace("_", " ")
    if key in CLASS_MAP:
        return CLASS_MAP[key]
    key2 = key.replace(" ", "_")
    if key2 in CLASS_MAP:
        return CLASS_MAP[key2]
    for k, v in CLASS_MAP.items():
        if k in key or key in k:
            return v
    return None


def find_images(root: Path):
    imgs = []
    for ext in VALID_EXTS:
        imgs.extend(root.rglob(f"*{ext}"))
        imgs.extend(root.rglob(f"*{ext.upper()}"))
    return imgs


def merge(src_root: Path, seed: int = 42, dry_run: bool = False):
    rng = random.Random(seed)

    # ── Collect new images by class ───────────────────────────────────────────
    class_files: dict[str, list[Path]] = {}
    unknown: list[str] = []

    # First, list all unique folder names for debug
    all_folders = set()
    for img in find_images(src_root):
        all_folders.add(img.parent.name)

    print(f"\n  Folders found in dataset: {sorted(all_folders)}\n")

    for img in find_images(src_root):
        folder = img.parent.name
        cls = map_folder(folder)
        if cls:
            class_files.setdefault(cls, []).append(img)
        else:
            if folder not in unknown:
                unknown.append(folder)

    if unknown:
        print(f"  ⚠️  Unrecognised folders (skipped): {unknown}")
        print("     Add them to CLASS_MAP in merge_dataset.py to include them.\n")

    if not class_files:
        print("  ❌  No images matched any class. Check CLASS_MAP.")
        return

    # ── Print plan ────────────────────────────────────────────────────────────
    total_new = sum(len(v) for v in class_files.values())
    print(f"  {'Class':<30}  {'New imgs':>8}  {'→ train':>7}  {'→ val':>6}  {'→ test':>6}")
    print("  " + "─" * 62)

    added = 0
    for cls, files in sorted(class_files.items()):
        rng.shuffle(files)
        n     = len(files)
        n_tr  = int(n * RATIOS[0])
        n_val = int(n * RATIOS[1])
        splits_files = {
            "train": files[:n_tr],
            "val":   files[n_tr:n_tr + n_val],
            "test":  files[n_tr + n_val:],
        }
        print(f"  {cls:<30}  {n:>8}  {len(splits_files['train']):>7}  "
              f"{len(splits_files['val']):>6}  {len(splits_files['test']):>6}")

        if dry_run:
            continue

        for split, split_files in splits_files.items():
            dest_dir = DATASET_DIR / split / cls
            dest_dir.mkdir(parents=True, exist_ok=True)
            # Count existing files to avoid overwriting
            existing = len(list(dest_dir.iterdir())) if dest_dir.exists() else 0
            for i, src in enumerate(split_files):
                dst = dest_dir / f"{cls}_{split}_z{existing+i:05d}{src.suffix.lower()}"
                shutil.copy2(src, dst)
                added += 1

    print("  " + "─" * 62)
    print(f"  Total new images  : {total_new}")
    if not dry_run:
        print(f"  Images copied     : {added}")
        print(f"  Merged into       : {DATASET_DIR.resolve()}")
    else:
        print("  [DRY RUN — no files were copied]")

    # ── Updated totals ────────────────────────────────────────────────────────
    if not dry_run:
        print(f"\n  Updated dataset totals:")
        grand = 0
        for split in SPLITS:
            split_dir = DATASET_DIR / split
            if split_dir.exists():
                n = sum(len(list(c.iterdir())) for c in split_dir.iterdir() if c.is_dir())
                grand += n
                print(f"    {split:<6}: {n:,} images")
        print(f"    total : {grand:,} images")

        print(f"\n  ✅ Done. Now retrain:")
        print(f"     python train.py --epochs 20 --batch 32 --img-size 96\n")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--slug",           default="zaidpy/oral-cancer-dataset")
    p.add_argument("--skip-download",  action="store_true")
    p.add_argument("--cached-path",    default="")
    p.add_argument("--dry-run",        action="store_true", help="Show plan without copying")
    p.add_argument("--seed",           type=int, default=42)
    args = p.parse_args()

    print("\n  ╔════════════════════════════════════════╗")
    print("  ║  OralAI — Second Dataset Merger        ║")
    print("  ╚════════════════════════════════════════╝\n")

    if args.skip_download and args.cached_path:
        src = Path(args.cached_path)
    elif args.skip_download:
        if not HAS_KAGGLEHUB:
            raise RuntimeError("Need --cached-path when using --skip-download without kagglehub")
        print("  Resolving cache via kagglehub ...")
        src = Path(kagglehub.dataset_download(args.slug))
    else:
        if not HAS_KAGGLEHUB:
            raise RuntimeError("kagglehub not installed. Run: pip install kagglehub")
        print(f"  Downloading {args.slug} ...")
        src = Path(kagglehub.dataset_download(args.slug))

    print(f"  Source : {src}")
    if args.dry_run:
        print("  Mode   : DRY RUN (no files will be copied)\n")

    merge(src, seed=args.seed, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
