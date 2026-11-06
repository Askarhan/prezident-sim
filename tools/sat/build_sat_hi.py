#!/usr/bin/env python3
"""Adds the sharp level 3 (16384 px) of the satellite map from NASA Blue Marble NG, July,
world.200407.3x21600x10800.jpg (the plain one: flat ocean, no topo or bathy).
Colours and relief come from level 2 (www/sat/2), detail from the July image: out = up2(level 2) + high-pass(July) on land.
Only tiles with land north of 60°S are written; the game draws level 2 under the rest (SAT_Z3 in src/game.html).
Run from the repo root: python3 tools/sat/build_sat_hi.py <path to the July jpg>"""
import math, os, re, sys
import cv2, numpy as np
MAP_W, MAP_H = 900.0, 440.70631074413296
BB0X, BB0Y, BB1X, BB1Y = -20004297.151525836, -12671671.123330014, 20026572.39474939, 6930392.025135122
CM, R = 11.5, 6381372.0
LW, TILE, SIGMA, OCEAN = 16384, 512, 1.3, (20, 5, 2)   # OCEAN: flat ocean colour of the plain image (BGR)

def maps_for(W, x0, y0, w, h, SW, SH):   # same as build_sat.py
    Hl = W * MAP_H / MAP_W
    px = np.arange(x0, x0 + w, dtype=np.float64) + 0.5; py = np.arange(y0, y0 + h, dtype=np.float64) + 0.5
    X = BB0X + px / W * (BB1X - BB0X); Y = BB0Y + py / Hl * (BB1Y - BB0Y)
    lon = CM + np.degrees(X / R); lat = (np.degrees(np.arctan(np.exp(-0.8 * Y / R))) - 45) / 0.4
    MX, MY = np.meshgrid(((lon + 180) / 360 * SW - 0.5) % SW, (90 - lat) / 180 * SH - 0.5)
    return MX.astype(np.float32), MY.astype(np.float32), lat

J = cv2.imread(sys.argv[1]); J = cv2.resize(J, (LW, LW // 2), interpolation=cv2.INTER_AREA)
land = (cv2.absdiff(J, np.full_like(J, OCEAN)).max(2) > 24).astype(np.uint8) * 255
SH, SW = J.shape[:2]; Hl = math.ceil(LW * MAP_H / MAP_W); Hl2 = math.ceil(LW / 2 * MAP_H / MAP_W)
os.makedirs("www/sat/3", exist_ok=True); done = []; k3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
for ty in range(math.ceil(Hl / TILE)):
    for tx in range(LW // TILE):
        h = min(TILE, Hl - ty * TILE); mx, my, lat = maps_for(LW, tx * TILE, ty * TILE, TILE, h, SW, SH)
        if lat.max() < -60: continue
        m = cv2.remap(land, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
        if (m > 127).sum() < 400: continue
        jt = cv2.remap(J, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP).astype(np.float32)
        P = cv2.imread(f"www/sat/2/{tx >> 1}_{ty >> 1}.webp"); oy = (ty & 1) * 256; ph = min(256, P.shape[0] - oy)
        up = cv2.resize(P[oy:oy + ph, (tx & 1) * 256:(tx & 1) * 256 + 256], (TILE, h), interpolation=cv2.INTER_CUBIC).astype(np.float32)
        a = cv2.GaussianBlur(cv2.dilate(m, k3).astype(np.float32) / 255, (0, 0), 1.5)[..., None]
        out = up + (jt - cv2.GaussianBlur(jt, (0, 0), SIGMA)) * a
        cv2.imwrite(f"www/sat/3/{tx}_{ty}.webp", np.clip(out, 0, 255).astype(np.uint8), [cv2.IMWRITE_WEBP_QUALITY, 78]); done.append(f"{tx}_{ty}")
line = 'const SAT_Z3 = new Set("' + " ".join(done) + '".split(" "));   // level 3 tiles that exist (land), written by tools/sat/build_sat_hi.py'
s = open("src/game.html", encoding="utf-8").read(); s, n = re.subn(r"^const SAT_Z3 = .*$", lambda _: line, s, flags=re.M); assert n == 1
open("src/game.html", "w", encoding="utf-8").write(s); print(len(done), "tiles")
