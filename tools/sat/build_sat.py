# Builds the satellite map pyramid for the game.
#   colour: NASA Blue Marble Next Generation (topo + bathy), 5400x2700
#   relief: shaded relief (Tom Patterson / Natural Earth style), 10800x5400 -> high-pass shading
# Output is reprojected into the jsVectorMap "mill" (Miller) projection of world.js,
# so tile pixels line up with the SVG country paths (900 x 440.706 map units).
import os, sys, math, numpy as np, cv2

SRC, OUT = sys.argv[1], sys.argv[2]
A = 1.15                      # relief strength
LEVELS = [2048, 4096, 8192]   # level widths (px for 900 map units)
TILE = 512
MAP_W, MAP_H = 900.0, 440.70631074413296
BB0X, BB0Y, BB1X, BB1Y = -20004297.151525836, -12671671.123330014, 20026572.39474939, 6930392.025135122
CM, R = 11.5, 6381372.0

def composite():
    rel = cv2.imread(os.path.join(SRC, "shadedrelief.jpg"), cv2.IMREAD_COLOR)
    H, W = rel.shape[:2]
    L = cv2.cvtColor(rel, cv2.COLOR_BGR2GRAY).astype(np.float32) + 1
    del rel
    shade = (L / (cv2.GaussianBlur(L, (0, 0), 14) + 1e-3)) ** A
    shade *= (L / (cv2.GaussianBlur(L, (0, 0), 60) + 1e-3)) ** (A * 0.45)
    del L
    np.clip(shade, 0.35, 1.9, out=shade)
    bm = cv2.imread(os.path.join(SRC, "bmng.jpg"), cv2.IMREAD_COLOR)
    bm = cv2.resize(bm, (W, H), interpolation=cv2.INTER_CUBIC)
    out = np.empty((H, W, 3), np.uint8)
    for y in range(0, H, 600):            # strips keep memory low
        b = bm[y:y+600].astype(np.float32) * shade[y:y+600, :, None]
        b = np.clip(b, 0, 255).astype(np.uint8)
        hsv = cv2.cvtColor(b, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[..., 1] *= 1.18
        hsv[..., 2] = 255 * (hsv[..., 2] / 255) ** 0.85
        out[y:y+600] = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR)
    return out

def maps_for(W, x0, y0, w, h, SW, SH):
    Hl = W * MAP_H / MAP_W
    px = (np.arange(x0, x0 + w, dtype=np.float64) + 0.5)
    py = (np.arange(y0, y0 + h, dtype=np.float64) + 0.5)
    X = BB0X + px / W * (BB1X - BB0X)
    Y = BB0Y + py / Hl * (BB1Y - BB0Y)
    lon = CM + np.degrees(X / R)
    lat = (np.degrees(np.arctan(np.exp(-0.8 * Y / R))) - 45) / 0.4
    mx = ((lon + 180) / 360 * SW - 0.5) % SW
    my = (90 - lat) / 180 * SH - 0.5
    MX, MY = np.meshgrid(mx, my)
    return MX.astype(np.float32), MY.astype(np.float32)

def main():
    img = composite()
    SH, SW = img.shape[:2]
    for z, W in enumerate(LEVELS):
        Hl = int(math.ceil(W * MAP_H / MAP_W))
        src = img if W >= SW * 0.7 else cv2.resize(img, (W * 2, W), interpolation=cv2.INTER_AREA)
        sh, sw = src.shape[:2]
        d = os.path.join(OUT, str(z)); os.makedirs(d, exist_ok=True)
        if z == 0:
            mx, my = maps_for(W, 0, 0, W, Hl, sw, sh)
            t = cv2.remap(src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
            cv2.imwrite(os.path.join(OUT, "world.webp"), t, [cv2.IMWRITE_WEBP_QUALITY, 80])
            cv2.imwrite(os.path.join(OUT, "world_preview.jpg"), t, [cv2.IMWRITE_JPEG_QUALITY, 85])
            continue
        nx, ny = W // TILE, int(math.ceil(Hl / TILE))
        for ty in range(ny):
            for tx in range(nx):
                h = min(TILE, Hl - ty * TILE)
                mx, my = maps_for(W, tx * TILE, ty * TILE, TILE, h, sw, sh)
                t = cv2.remap(src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
                cv2.imwrite(os.path.join(d, f"{tx}_{ty}.webp"), t, [cv2.IMWRITE_WEBP_QUALITY, 78])
        print("level", z, W, "x", Hl, nx, "x", ny, "tiles")

main()
