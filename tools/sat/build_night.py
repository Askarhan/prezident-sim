#!/usr/bin/env python3
"""Builds the night layer of the satellite map from NASA Black Marble 2016 Color, BlackMarble_2016_3km.jpg (13500 x 6750, 07.11.2026).
Same Miller reprojection and tile grid as build_sat.py: www/sat/night/world.webp (2048), 1/ (4096), 2/ (8192). Level 3 of the day map uses level 2 at night.
Run from the repo root: python3 tools/sat/build_night.py <path to BlackMarble_2016_3km.jpg>"""
import math, os, sys
import cv2, numpy as np
MAP_W, MAP_H = 900.0, 440.70631074413296
BB0X, BB0Y, BB1X, BB1Y = -20004297.151525836, -12671671.123330014, 20026572.39474939, 6930392.025135122
CM, R = 11.5, 6381372.0
LEVELS, TILE, Q = [2048, 4096, 8192], 512, 80
SPAN = (BB1X - BB0X) / (2 * math.pi * R)

def maps_for(W, x0, y0, w, h, SW, SH):
    Hl = W * MAP_H / MAP_W
    px = np.arange(x0, x0 + w, dtype=np.float64) + 0.5; py = np.arange(y0, y0 + h, dtype=np.float64) + 0.5
    X = BB0X + px / W * (BB1X - BB0X); Y = BB0Y + py / Hl * (BB1Y - BB0Y)
    lon = CM + np.degrees(X / R); lat = (np.degrees(np.arctan(np.exp(-0.8 * Y / R))) - 45) / 0.4
    MX, MY = np.meshgrid(((lon + 180) / 360 * SW - 0.5) % SW, (90 - lat) / 180 * SH - 0.5)
    return MX.astype(np.float32), MY.astype(np.float32)

J = cv2.imread(sys.argv[1]); n = 0; os.makedirs("www/sat/night", exist_ok=True)
for z, W in enumerate(LEVELS):
    sw = min(J.shape[1], round(W / SPAN)); src = cv2.resize(J, (sw, sw // 2), interpolation=cv2.INTER_AREA); SH, SW = src.shape[:2]
    Hl = math.ceil(W * MAP_H / MAP_W)
    if z == 0:
        mx, my = maps_for(W, 0, 0, W, Hl, SW, SH)
        cv2.imwrite("www/sat/night/world.webp", cv2.remap(src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP), [cv2.IMWRITE_WEBP_QUALITY, Q]); continue
    os.makedirs(f"www/sat/night/{z}", exist_ok=True)
    for ty in range(math.ceil(Hl / TILE)):
        for tx in range(W // TILE):
            h = min(TILE, Hl - ty * TILE); mx, my = maps_for(W, tx * TILE, ty * TILE, TILE, h, SW, SH)
            cv2.imwrite(f"www/sat/night/{z}/{tx}_{ty}.webp", cv2.remap(src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP), [cv2.IMWRITE_WEBP_QUALITY, Q]); n += 1
print(n, "night tiles")
