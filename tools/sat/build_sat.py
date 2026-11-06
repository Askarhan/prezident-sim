#!/usr/bin/env python3
"""Builds the satellite map pyramid for the game from NASA Blue Marble Next Generation, July 2004,
world.200407.3x21600x10800.jpg, used as it is (owner's choice 07.11.2026): no relief shading, flat ocean, no colour grade.
Output is reprojected into the jsVectorMap "mill" (Miller) projection of world.js (900 x 440.706 map units):
www/sat/world.webp (2048), 1/ (4096), 2/ (8192), 3/ (16384: land tiles north of 60°S only, listed in SAT_Z3 of src/game.html).
Run from the repo root: python3 tools/sat/build_sat.py <path to the July jpg>"""
import math, os, re, sys
import cv2, numpy as np
MAP_W, MAP_H = 900.0, 440.70631074413296
BB0X, BB0Y, BB1X, BB1Y = -20004297.151525836, -12671671.123330014, 20026572.39474939, 6930392.025135122
CM, R = 11.5, 6381372.0
LEVELS, TILE, Q, OCEAN = [2048, 4096, 8192, 16384], 512, 85, (20, 5, 2)   # OCEAN: flat ocean colour of the photo (BGR)
SPAN = (BB1X - BB0X) / (2 * math.pi * R)                                   # part of 360° the map shows

def maps_for(W, x0, y0, w, h, SW, SH):
    Hl = W * MAP_H / MAP_W
    px = np.arange(x0, x0 + w, dtype=np.float64) + 0.5; py = np.arange(y0, y0 + h, dtype=np.float64) + 0.5
    X = BB0X + px / W * (BB1X - BB0X); Y = BB0Y + py / Hl * (BB1Y - BB0Y)
    lon = CM + np.degrees(X / R); lat = (np.degrees(np.arctan(np.exp(-0.8 * Y / R))) - 45) / 0.4
    MX, MY = np.meshgrid(((lon + 180) / 360 * SW - 0.5) % SW, (90 - lat) / 180 * SH - 0.5)
    return MX.astype(np.float32), MY.astype(np.float32), lat

J = cv2.imread(sys.argv[1]); z3 = []
for z, W in enumerate(LEVELS):
    sw = min(J.shape[1], round(W / SPAN)); src = cv2.resize(J, (sw, sw // 2), interpolation=cv2.INTER_AREA); SH, SW = src.shape[:2]
    Hl = math.ceil(W * MAP_H / MAP_W)
    if z == 0:
        mx, my, _ = maps_for(W, 0, 0, W, Hl, SW, SH)
        cv2.imwrite("www/sat/world.webp", cv2.remap(src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP), [cv2.IMWRITE_WEBP_QUALITY, Q]); continue
    os.makedirs(f"www/sat/{z}", exist_ok=True)
    land = (cv2.absdiff(src, np.full_like(src, OCEAN)).max(2) > 24).astype(np.uint8) * 255 if z == 3 else None
    for ty in range(math.ceil(Hl / TILE)):
        for tx in range(W // TILE):
            h = min(TILE, Hl - ty * TILE); mx, my, lat = maps_for(W, tx * TILE, ty * TILE, TILE, h, SW, SH)
            if z == 3:
                if lat.max() < -60 or (cv2.remap(land, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP) > 127).sum() < 400: continue
                z3.append(f"{tx}_{ty}")
            cv2.imwrite(f"www/sat/{z}/{tx}_{ty}.webp", cv2.remap(src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP), [cv2.IMWRITE_WEBP_QUALITY, Q])
    del src
line = 'const SAT_Z3 = new Set("' + " ".join(z3) + '".split(" "));   // level 3 tiles that exist (land), written by tools/sat/build_sat.py'
s = open("src/game.html", encoding="utf-8").read(); s, n = re.subn(r"^const SAT_Z3 = .*$", lambda _: line, s, flags=re.M); assert n == 1
open("src/game.html", "w", encoding="utf-8").write(s); print(len(z3), "level 3 tiles")
