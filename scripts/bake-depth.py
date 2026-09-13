"""Bake a landscape-prior depth map from public/photo.jpg -> public/depth.png.
White = far, black = near. No ML: vertical prior + sky/haze detection + detail.
Deterministic; rerun any time the photo changes."""
from PIL import Image, ImageFilter
import numpy as np
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'public', 'photo.jpg')
DST = os.path.join(HERE, '..', 'public', 'depth.png')

img = Image.open(SRC).convert('RGB')
W = 640
H = round(W * img.height / img.width)
small = img.resize((W, H), Image.LANCZOS)
a = np.asarray(small).astype(np.float32) / 255.0
R, G, B = a[..., 0], a[..., 1], a[..., 2]
lum = 0.299 * R + 0.587 * G + 0.114 * B
sat = a.max(axis=2) - a.min(axis=2)
v = np.repeat(np.linspace(0, 1, H)[:, None], W, axis=1)  # 0 top, 1 bottom

depth = (1.0 - v) * 0.75                       # top of frame reads far
sky = (B - R > 0.04) & (v < 0.62) & (sat < 0.35)
depth = np.where(sky, 0.98, depth)             # sky pinned far
haze = (lum > 0.55) & (sat < 0.25) & (v < 0.55)
depth = np.where(haze, np.maximum(depth, 0.72), depth)   # distant pale rock
darkfore = (lum < 0.32) & (v > 0.70)
depth = np.where(darkfore, np.minimum(depth, 0.15), depth)  # foreground pines near
depth = depth + (0.5 - lum) * 0.12             # luminance detail
depth = np.clip(depth, 0, 1)

out = Image.fromarray((depth * 255).astype(np.uint8))
out = out.filter(ImageFilter.GaussianBlur(7))
out.save(DST)
print('depth saved', DST, out.size)
