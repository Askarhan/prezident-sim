#!/usr/bin/env python3
"""Builds the staff map theme (www/staff) from the satellite tiles, world.js land shapes.
Same layout as www/sat: world.webp (2048), 1/x_y.webp (4096), 2/x_y.webp (8192), 512 px tiles.
Borders, names and marks are not baked: the game draws them. Run from the repo root."""
import json, math, os, subprocess, tempfile
import cv2, numpy as np
from PIL import Image
from scipy import ndimage as ni
Image.MAX_IMAGE_PIXELS = None
MW, MH, TILE, Q = 900.0, 440.70631074413296, 512, 74
BX0, BY0, BX1, BY1 = -20004297.151525836, -12671671.123330014, 20026572.39474939, 6930392.025135122
CM, R = 11.5, 6381372.0
W, H = 8192, math.ceil(8192*MH/MW)
hexc = lambda s: np.array([int(s[i:i+2], 16) for i in (1, 3, 5)], np.float32)/255
mix = lambda a, b, t: a + (b - a)*t[..., None]
def P(lon, lat):
    return ((R*math.radians(lon - CM) - BX0)/(BX1 - BX0)*W, (-(R/.8)*math.log(math.tan(math.radians(45 + .4*lat))) - BY0)/(BY1 - BY0)*H)
src = np.zeros((H, W, 3), np.uint8)
for ty in range(8):
    for tx in range(16):
        a = np.asarray(Image.open(f"www/sat/2/{tx}_{ty}.webp").convert("RGB")); src[ty*TILE:ty*TILE + a.shape[0], tx*TILE:tx*TILE + a.shape[1]] = a
d = open("www/world.js").read(); world = json.loads(d[d.index("{"):d.rindex("}") + 1])
with tempfile.TemporaryDirectory() as t:
    open(t + "/l.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {MW} {MH}"><rect width="2000" height="2000" fill="#000"/>' + "".join(f'<path d="{v["path"]}" fill="#fff"/>' for v in world["paths"].values()) + "</svg>")
    subprocess.run(["rsvg-convert", t + "/l.svg", "-o", t + "/l.png"], check=True); land = np.asarray(Image.open(t + "/l.png").convert("L")) > 127
img = src.astype(np.float32)/255; r, g, b = img[..., 0], img[..., 1], img[..., 2]; L = .3*r + .59*g + .11*b; del src
lake = ni.binary_opening((b > r + .015) & (b >= g - .01) & (L < .34), iterations=1)
# lakes the colour test misses (lon0, lat0, lon1, lat1): Aral, Balkhash, Issyk-Kul
for a_, b_, c_, d_ in [(58, 43.3, 62, 47), (73.2, 44.6, 79.6, 47.1), (76, 42, 78.5, 42.95)]:
    xa, ya = map(int, P(a_, d_)); xb, yb = map(int, P(c_, b_))
    lb, n = ni.label(ni.binary_opening(L[ya:yb, xa:xb] < .3))
    if n:
        sz = ni.sum(np.ones_like(lb), lb, range(1, n + 1)); lake[ya:yb, xa:xb] |= ni.binary_fill_holes(np.isin(lb, [i + 1 for i in np.argsort(sz)[-2:]]))
water = ni.binary_closing(~land | lake); landm = ~water; del lake
gs = ni.gaussian_filter(L, .8); rug = ni.gaussian_filter(np.hypot(ni.sobel(gs, 0), ni.sobel(gs, 1)), 4.5)*landm; del gs
rug = np.clip(rug/np.percentile(rug[landm], 99), 0, 1).astype(np.float32)
rel = L - ni.gaussian_filter(L, 7); rel = (rel/(rel[landm].std() + 1e-6)).astype(np.float32)
wd = ni.distance_transform_edt(water).astype(np.float32); ld = ni.distance_transform_edt(landm).astype(np.float32)
forest = ni.binary_opening((g > r*1.03) & (L < .34) & landm & (rug < .75)); dune = (r > g*1.08) & (L > .42) & (rug < .2) & landm & (ld > 6)
del img, r, g, b, ld
c = mix(hexc("#1A2740"), hexc("#3E5472"), np.clip(.3 + .15*rel + .5*rug, 0, 1))
c = mix(c, hexc("#8E7B55"), np.clip((rug - .35)*1.5, 0, 1)*np.clip(.5 + .25*rel, 0, 1))
c = mix(c, hexc("#6F8499"), np.clip((L - .7)*6, 0, 1)*.6)
c = mix(c, hexc("#DCD8C8"), np.clip((L - .55)*4, 0, 1)*(rug > .3)*.8)
wc = np.full((H, W, 3), hexc("#0A1424"), np.float32)
wl = sum(np.exp(-((wd - k*6)/.7)**2)*(1 - k/7) for k in range(1, 7))
wc = mix(wc, hexc("#3E7396"), np.clip(wl, 0, 1)*.55); del wl
o = np.where(water[..., None], wc, c); del wc, c
GOLD = hexc("#F2A93B")
hs = ni.gaussian_filter(rug, 2.5) + .25*ni.gaussian_filter(np.clip(rel, -2, 2)*.1 + .1, 2); n = np.floor(hs*13); del hs, rel, rug
e = ((n != np.roll(n, 1, 0)) | (n != np.roll(n, 1, 1))) & landm; e5 = e & (n % 4 == 0); del n
o = mix(o, GOLD, ni.gaussian_filter(e.astype(np.float32), .4)*.3); o = mix(o, GOLD, ni.gaussian_filter(e5.astype(np.float32), .5)*.3); del e, e5
o = mix(o, hexc("#6FA6C6"), ni.gaussian_filter(((wd < 1.2) & water).astype(np.float32), .5)*.85); del wd
yy, xx = np.mgrid[0:H, 0:W]; st = (yy % 8 == 0) & ((xx + (yy//8 % 2)*4) % 8 == 0)
o = mix(o, GOLD, ni.gaussian_filter((st & dune).astype(np.float32), .6)*1.4*.36); del st, yy, xx, dune
T = np.zeros((22, 22), np.uint8)
for x_, y_ in ((5, 5), (16, 16)): cv2.polylines(T, [np.array([[x_ - 3, y_ + 2], [x_, y_ - 2], [x_ + 3, y_ + 2]])], False, 255, 1, cv2.LINE_AA)
o = mix(o, hexc("#80C896"), np.tile(T, (H//22 + 1, W//22 + 1))[:H, :W].astype(np.float32)/255*forest*.3); del forest
G = np.zeros((H, W), np.float32)
for lon in range(-170, 180, 10): G[:, int(P(lon, 0)[0]) % W] = 1
for lat in range(-80, 81, 10):
    y = int(P(CM, lat)[1])
    if 0 <= y < H: G[y] = 1
o = mix(o, GOLD, G*.13); del G
out = (np.clip(o, 0, 1)*255).astype(np.uint8); del o
os.makedirs("www/staff/1", exist_ok=True); os.makedirs("www/staff/2", exist_ok=True)
for z, LW in ((1, 4096), (2, 8192)):
    LH = math.ceil(LW*MH/MW); a = out if LW == W else cv2.resize(out, (LW, LH), interpolation=cv2.INTER_AREA)
    for ty in range(math.ceil(LH/TILE)):
        for tx in range(LW//TILE): Image.fromarray(a[ty*TILE:(ty + 1)*TILE, tx*TILE:(tx + 1)*TILE]).save(f"www/staff/{z}/{tx}_{ty}.webp", quality=Q, method=5)
Image.fromarray(cv2.resize(out, (2048, math.ceil(2048*MH/MW)), interpolation=cv2.INTER_AREA)).save("www/staff/world.webp", quality=80, method=5)
print("done", land.mean().round(3), water.mean().round(3))
