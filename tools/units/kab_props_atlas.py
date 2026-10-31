# downsample prop renders x4 (premultiplied), crop, pack into www/field/props.webp + props.json
import json, sys, os, numpy as np
from PIL import Image
src = sys.argv[1]; out = sys.argv[2]
meta = json.load(open(os.path.join(src, "meta.json")))
items = []
for name, m in meta.items():
    im = np.array(Image.open(os.path.join(src, name + ".png")).convert("RGBA")).astype(np.float32)/255
    a = im[..., 3:4]; pre = np.concatenate([im[..., :3]*a, a], -1)
    h, w = pre.shape[:2]; h4, w4 = h//4, w//4
    sm = pre[:h4*4, :w4*4].reshape(h4, 4, w4, 4, 4).mean((1, 3))
    al = sm[..., 3]; ys, xs = np.where(al > 0.02)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    c = sm[y0:y1, x0:x1]; aa = c[..., 3:4]
    rgb = np.where(aa > 0, c[..., :3]/np.maximum(aa, 1e-6), 0)
    img = Image.fromarray((np.concatenate([rgb, aa], -1).clip(0, 1)*255).astype(np.uint8), "RGBA")
    items.append(dict(id=name, img=img, ax=m["ax"]/4 - x0, ay=m["ay"]/4 - y0))
items.sort(key=lambda t: -t["img"].size[1])
W = 1024; x = y = rowh = 0; pad = 2
for t in items:
    w, h = t["img"].size
    if x + w > W: x = 0; y += rowh + pad; rowh = 0
    t["x"], t["y"] = x, y; x += w + pad; rowh = max(rowh, h)
H = y + rowh
atlas = Image.new("RGBA", (W, H))
for t in items: atlas.paste(t["img"], (t["x"], t["y"]))
atlas.save(os.path.join(out, "props.webp"), "WEBP", quality=88, method=6)
atlas.save(os.path.join(out, "props_preview.png"))
json.dump({"ppm": 12, "el": 40, "p": {t["id"]: [t["x"], t["y"], t["img"].size[0], t["img"].size[1], round(t["ax"], 1), round(t["ay"], 1)] for t in items}}, open(os.path.join(out, "props.json"), "w"), separators=(",", ":"))
print(W, H, os.path.getsize(os.path.join(out, "props.webp")))
