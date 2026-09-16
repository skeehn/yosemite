"""Bake MiDaS_small monocular depth for the hero image -> public/images/hero-depth.png"""
import numpy as np
import torch
from PIL import Image

SRC = "/tmp/hero-full.jpg"
OUT = "public/images/hero-depth.png"
W = 960

model = torch.hub.load("intel-isl/MiDaS", "MiDaS_small", trust_repo=True)
model.eval()
tf = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True).small_transform

img = np.asarray(Image.open(SRC).convert("RGB"))
t = tf(img)
batch = t if t.ndim == 4 else t.unsqueeze(0)

with torch.no_grad():
    depth = model(batch).squeeze().numpy()

d = (depth - depth.min()) / max(depth.max() - depth.min(), 1e-6)
d = (d * 255).astype(np.uint8)
h, w = d.shape
out = Image.fromarray(d).resize((W, int(h * W / w)), Image.LANCZOS)
out.save(OUT)
print("saved", OUT, out.size, "range", float(depth.min()), float(depth.max()))
