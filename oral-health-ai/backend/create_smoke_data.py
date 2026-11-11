"""
Create tiny synthetic images for the smoke test.
Each class folder gets 8 train + 4 val + 4 test images (32x32 solid-colour PNG).
Run: python create_smoke_data.py
"""
import os
from pathlib import Path
from PIL import Image

CLASSES = [
    "healthy","plaque","gingivitis","caries",
    "enamel_demineralization","oral_ulcer","oral_lesion","periodontal_disease",
]
COLOURS = [
    (200,230,200),(240,220,180),(210,200,230),(230,200,200),
    (200,220,240),(240,200,210),(220,210,200),(200,215,220),
]

for split, n in [("train",8),("val",4),("test",4)]:
    for cls, colour in zip(CLASSES, COLOURS):
        folder = Path("dataset") / split / cls
        folder.mkdir(parents=True, exist_ok=True)
        for i in range(n):
            img = Image.new("RGB", (64,64), colour)
            img.save(folder / f"{cls}_{split}_{i:03d}.jpg")

print("Smoke-test images created in dataset/")
