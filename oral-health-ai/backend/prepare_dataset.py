"""
OralAI — Kaggle Dataset Downloader & Organiser
================================================
Downloads:  sizlingdhairya1/oral-infection
Then maps the Kaggle folder names → our 8 class names and creates
the train / val / test split expected by train.py.

Usage:
    python prepare_dataset.py              # download + organise
    python prepare_dataset.py --skip-download  # re-organise existing cache
    python prepare_dataset.py --split 0.7 0.15 0.15  # custom split ratios

Split strategy:
    - Files are shuffled with a fixed seed (42).
    - Splits are made PER CLASS so every class has proportional
      representation in each split.
    - This is NOT a patient-level split (we don't have patient IDs
      in this dataset). For clinical use, always split by patient.

Output:
    dataset/
      train/ val/ test/
        caries/ gingivitis/ healthy/ oral_lesion/ oral_ulcer/
        enamel_demineralization/ periodontal_disease/ plaque/
"""

import argparse
import random
import shutil
from pathlib import Path

# ── Try to import kagglehub ────────────────────────────────────────────────────
try:
    import kagglehub
    HAS_KAGGLEHUB = True
except ImportError:
    HAS_KAGGLEHUB = False


# ── Class name mapping ─────────────────────────────────────────────────────────
# Maps every folder name we might find in the Kaggle dataset →
# our canonical 8 class names (lower-snake-case).
# Add / edit entries here if the Kaggle folder names differ.
CLASS_MAP = {
    # Healthy / Normal
    "healthy":                  "healthy",
    "normal":                   "healthy",
    "no disease":               "healthy",
    "nodisease":                "healthy",

    # Dental Caries
    "caries":                   "caries",
    "dental caries":            "caries",
    "dental_caries":            "caries",
    "cavity":                   "caries",
    "cavities":                 "caries",

    # Gingivitis
    "gingivitis":               "gingivitis",
    "gum disease":              "gingivitis",
    "gum_disease":              "gingivitis",

    # Plaque
    "plaque":                   "plaque",
    "plaque accumulation":      "plaque",
    "plaque_accumulation":      "plaque",
    "dental plaque":            "plaque",
    "dental_plaque":            "plaque",

    # Enamel Demineralisation
    "enamel demineralization":  "enamel_demineralization",
    "enamel_demineralization":  "enamel_demineralization",
    "demineralization":         "enamel_demineralization",
    "enamel":                   "enamel_demineralization",
    "white spot":               "enamel_demineralization",
    "white_spot":               "enamel_demineralization",

    # Periodontal Disease
    "periodontal":              "periodontal_disease",
    "periodontal disease":      "periodontal_disease",
    "periodontal_disease":      "periodontal_disease",
    "periodontitis":            "periodontal_disease",

    # Oral Ulcer
    "oral ulcer":               "oral_ulcer",
    "oral_ulcer":               "oral_ulcer",
    "ulcer":                    "oral_ulcer",
    "canker":                   "oral_ulcer",
    "aphthous":                 "oral_ulcer",

    # Oral Lesion
    "oral lesion":              "oral_lesion",
    "oral_lesion":              "oral_lesion",
    "lesion":                   "oral_lesion",
    "mouth lesion":             "oral_lesion",
    "oral cancer":              "oral_lesion",
    "oral_cancer":              "oral_lesion",

    # Tooth Discoloration → map to plaque (surface staining / deposit)
    "tooth discoloration":      "plaque",
    "tooth_discoloration":      "plaque",
    "discoloration":            "plaque",
    "staining":                 "plaque",
    "tooth staining":           "plaque",

    # Hypodontia (missing teeth / structural) → oral_lesion (structural anomaly)
    "hypodontia":               "oral_lesion",
    "missing teeth":            "oral_lesion",
    "missing_teeth":            "oral_lesion",
    "oligodontia":              "oral_lesion",

    # Calculus (tartar) → plaque (hardened plaque deposit)
    "calculus":                 "plaque",
    "tartar":                   "plaque",
    "dental calculus":          "plaque",
    "dental_calculus":          "plaque",

    # Catch-alls — add more Kaggle folder names here as needed
    "infection":                "oral_ulcer",
    "oral infection":           "oral_ulcer",
}

VALID_EXTS  = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"}
SPLITS      = ("train", "val", "test")
DATASET_DIR = Path("dataset")


def download(slug: str) -> Path:
    if not HAS_KAGGLEHUB:
        raise RuntimeError(
            "kagglehub is not installed.\n"
            "Run:  pip install kagglehub\n"
            "Then set your Kaggle API credentials:\n"
            "  Windows: set KAGGLE_USERNAME=xxx  set KAGGLE_KEY=xxx\n"
            "  Or create C:\\Users\\<you>\\.kaggle\\kaggle.json"
        )
    print(f"  Downloading dataset: {slug} …")
    path = kagglehub.dataset_download(slug)
    print(f"  Downloaded to: {path}")
    return Path(path)


def find_images(root: Path):
    """Walk root and collect all image files recursively."""
    imgs = []
    for ext in VALID_EXTS:
        imgs.extend(root.rglob(f"*{ext}"))
        imgs.extend(root.rglob(f"*{ext.upper()}"))
    return imgs


def map_folder(folder_name: str) -> str | None:
    """Return canonical class name or None if unknown."""
    key = folder_name.lower().strip().replace("-", " ").replace("_", " ")
    # Try direct lookup first
    if key in CLASS_MAP:
        return CLASS_MAP[key]
    # Try normalised (remove spaces)
    key_nospace = key.replace(" ", "_")
    if key_nospace in CLASS_MAP:
        return CLASS_MAP[key_nospace]
    # Partial match
    for k, v in CLASS_MAP.items():
        if k in key or key in k:
            return v
    return None


def organise(src_root: Path, ratios: tuple, seed: int = 42):
    """
    Walk src_root, classify images by folder name, split, copy to dataset/.
    """
    rng = random.Random(seed)
    assert abs(sum(ratios) - 1.0) < 1e-6, "Ratios must sum to 1.0"

    # ── Collect images grouped by canonical class ──────────────────────────────
    class_files: dict[str, list[Path]] = {}
    unknown: list[tuple[str, Path]] = []

    for img in find_images(src_root):
        folder = img.parent.name
        cls = map_folder(folder)
        if cls:
            class_files.setdefault(cls, []).append(img)
        else:
            unknown.append((folder, img))

    if not class_files:
        print("\n  ⚠️  No images found with recognisable class folder names.")
        print("  Folders discovered:")
        seen = set()
        for img in find_images(src_root):
            n = img.parent.name
            if n not in seen:
                print(f"    {n}")
                seen.add(n)
        print("\n  Edit CLASS_MAP in this script to map those names to our 8 classes.")
        return

    if unknown:
        unknown_folders = {f for f, _ in unknown}
        print(f"\n  ⚠️  {len(unknown)} images in unrecognised folders (skipped): "
              f"{unknown_folders}")

    # ── Clear old dataset (smoke images) ──────────────────────────────────────
    if DATASET_DIR.exists():
        print(f"\n  Removing old dataset at {DATASET_DIR} …")
        shutil.rmtree(DATASET_DIR)

    # ── Copy into train / val / test ───────────────────────────────────────────
    totals = {s: 0 for s in SPLITS}
    print()
    print(f"  {'Class':<30}  {'Total':>6}  {'Train':>6}  {'Val':>5}  {'Test':>5}")
    print("  " + "─" * 60)

    for cls, files in sorted(class_files.items()):
        rng.shuffle(files)
        n     = len(files)
        n_tr  = int(n * ratios[0])
        n_val = int(n * ratios[1])
        # Test gets the remainder so we don't lose any images to rounding
        splits_files = {
            "train": files[:n_tr],
            "val":   files[n_tr:n_tr + n_val],
            "test":  files[n_tr + n_val:],
        }
        print(f"  {cls:<30}  {n:>6}  {len(splits_files['train']):>6}  "
              f"{len(splits_files['val']):>5}  {len(splits_files['test']):>5}")

        for split, split_files in splits_files.items():
            dest_dir = DATASET_DIR / split / cls
            dest_dir.mkdir(parents=True, exist_ok=True)
            for i, src in enumerate(split_files):
                dst = dest_dir / f"{cls}_{split}_{i:05d}{src.suffix.lower()}"
                shutil.copy2(src, dst)
            totals[split] += len(split_files)

    print("  " + "─" * 60)
    print(f"  {'TOTAL':<30}  {sum(totals.values()):>6}  "
          f"{totals['train']:>6}  {totals['val']:>5}  {totals['test']:>5}")
    print(f"\n  Dataset organised → {DATASET_DIR.resolve()}")
    print(f"  Classes: {sorted(class_files.keys())}")
    print(f"\n  Next step:")
    print(f"    python train.py --epochs 30 --batch 16")


# ════════════════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Download and organise Kaggle oral disease dataset")
    parser.add_argument("--slug",           default="sizlingdhairya1/oral-infection",
                        help="Kaggle dataset slug (default: sizlingdhairya1/oral-infection)")
    parser.add_argument("--skip-download",  action="store_true",
                        help="Skip download, re-organise from cached path")
    parser.add_argument("--cached-path",    default="",
                        help="Path to already-downloaded dataset (use with --skip-download)")
    parser.add_argument("--split",          nargs=3, type=float, default=[0.70, 0.15, 0.15],
                        metavar=("TRAIN", "VAL", "TEST"),
                        help="Train/val/test split ratios, must sum to 1.0 (default: 0.70 0.15 0.15)")
    parser.add_argument("--seed",           type=int, default=42)
    args = parser.parse_args()

    ratios = tuple(args.split)
    assert abs(sum(ratios) - 1.0) < 1e-6, "Split ratios must sum to 1.0"

    print("\n  ╔═══════════════════════════════════════════╗")
    print("  ║  OralAI — Dataset Downloader & Organiser  ║")
    print("  ╚═══════════════════════════════════════════╝\n")

    if args.skip_download:
        if args.cached_path:
            src = Path(args.cached_path)
        else:
            print("  --skip-download requires --cached-path  or  the dataset must already")
            print("  exist in the kagglehub cache (~/.cache/kagglehub/...).\n")
            # Try to find it automatically via kagglehub
            if HAS_KAGGLEHUB:
                print("  Trying to resolve cached path via kagglehub …")
                src = Path(kagglehub.dataset_download(args.slug))
            else:
                raise RuntimeError("Provide --cached-path when using --skip-download without kagglehub.")
    else:
        src = download(args.slug)

    print(f"\n  Source root : {src}")
    print(f"  Split       : train={ratios[0]:.0%}  val={ratios[1]:.0%}  test={ratios[2]:.0%}")
    print(f"  Seed        : {args.seed}\n")

    organise(src, ratios, args.seed)

    print("\n  ✅ Done.  Now run:")
    print("     python train.py --epochs 30 --batch 16\n")


if __name__ == "__main__":
    main()
