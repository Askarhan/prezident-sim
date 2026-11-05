#!/usr/bin/env python3
"""Finds a fixed place and size for each country name and writes LBL_FIX into src/game.html.
Each name gets the biggest box of its own width and height that sits mostly on the country's largest land part.
Numbers are map units (900 wide): x, y, font size. Needs a fresh www/index.html for the names. Run from the repo root."""
import json, os, re, subprocess, tempfile, time
import cv2, numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
Image.MAX_IMAGE_PIXELS = None
SC, MW, MH = 4, 900.0, 440.70631074413296
W, H = int(MW*SC), int(MH*SC) + 1
d = open("www/world.js").read(); paths = json.loads(d[d.index("{"):d.rindex("}") + 1])["paths"]; codes = list(paths)
h = open("www/index.html", encoding="utf-8").read(); i = h.index("\n(function(){\n"); j = h.rindex("})();")
open("www/_t.html", "w", encoding="utf-8").write(h[:i] + "\n" + h[i + 14:j] + h[j + 5:])   # same page without the closure, so the test can reach the game
srv = subprocess.Popen(["python3", "-m", "http.server", "8766", "-d", "www"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); g = b.new_page(); g.goto("http://127.0.0.1:8766/_t.html"); g.wait_for_timeout(1500)
        names = g.evaluate("(c)=>{newGame('kg');return Object.fromEntries(c.map(k=>[k,partnerName(k.toLowerCase())]))}", codes); b.close()
finally: srv.kill(); os.remove("www/_t.html")
with tempfile.TemporaryDirectory() as t:
    body = "".join(f'<path d="{paths[c]["path"]}" fill="#{(i + 1)*40 >> 8 & 255:02x}{(i + 1)*40 & 255:02x}80"/>' for i, c in enumerate(codes))
    open(t + "/i.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" width="{W}" height="{H}" viewBox="0 0 {MW} {H/SC}"><rect width="2000" height="2000" fill="#000"/>{body}</svg>')
    subprocess.run(["rsvg-convert", t + "/i.svg", "-o", t + "/i.png"], check=True); a = np.asarray(Image.open(t + "/i.png").convert("RGB"), np.int32)
ids = (a[..., 0]*256 + a[..., 1])//40
out = {}
for i, c in enumerate(codes):
    m = (ids == i + 1).astype(np.uint8)
    if not m.any(): continue
    n, lab, st, cen = cv2.connectedComponentsWithStats(m, connectivity=8); k = 1 + int(np.argmax(st[1:, 4]))
    x0, y0, bw, bh = st[k, :4]; x0 = max(0, x0 - 4); y0 = max(0, y0 - 4); m = (lab[y0:y0 + bh + 8, x0:x0 + bw + 8] == k).astype(np.float32); cx, cy = cen[k]
    asp = max(len(names[c]), 3)*.92/1.1; lo, hi, best = 1.0, min(bh + 2, (bw + 2)/asp), None
    for _ in range(11):
        h = (lo + hi)/2; rw, rh = max(1, int(asp*h)) | 1, max(1, int(h)) | 1
        f = cv2.blur(m, (rw, rh), borderType=cv2.BORDER_CONSTANT); ok = f >= .8
        if ok.any(): lo = h; best = (h, f)
        else: hi = h
    if best: h, f = best; ys, xs = np.nonzero(f >= max(.8, f.max() - .03)); j = int(np.argmin((xs + x0 - cx)**2 + (ys + y0 - cy)**2)); px, py = xs[j] + x0, ys[j] + y0
    else: h, px, py = 1, cx, cy
    out[c.lower()] = [round(float(px)/SC, 1), round(float(py)/SC, 1), round(max(1.1, min(13, h/1.1/SC*.86)), 2)]
line = "const LBL_FIX = " + json.dumps(out, separators=(",", ":")).replace('"', '') + ";"
line = re.sub(r"([{,])([a-z_]+\d*|[a-z]+-\d+):", lambda q: q.group(1) + q.group(2) + ":" if "-" not in q.group(2) else q.group(1) + json.dumps(q.group(2)) + ":", line)
s = open("src/game.html", encoding="utf-8").read(); s, n = re.subn(r"^const LBL_FIX = .*$", lambda _: line, s, flags=re.M); assert n == 1
open("src/game.html", "w", encoding="utf-8").write(s); print(len(out), "labels,", len(line), "bytes;", {k: out[k] for k in ("ru", "kz", "kg", "us", "cl") if k in out})
