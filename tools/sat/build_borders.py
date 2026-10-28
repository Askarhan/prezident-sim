# Natural Earth 1:50m land boundaries -> SVG path in the game's map units (jsVectorMap "mill", 900 wide)
import json, math, sys
SRC, OUT = sys.argv[1], sys.argv[2]
MAP_W, MAP_H = 900.0, 440.70631074413296
B0X, B0Y, B1X, B1Y = -20004297.151525836, -12671671.123330014, 20026572.39474939, 6930392.025135122
CM, R = 11.5, 6381372.0

def proj(lon, lat):
    dl = lon - CM
    if dl < -180: dl += 360
    if dl > 180: dl -= 360
    lat = max(-85, min(85, lat))
    X = R * math.radians(dl)
    Y = -R * math.log(math.tan(math.radians(45 + 0.4 * lat))) / 0.8
    return (X - B0X) / (B1X - B0X) * MAP_W, (Y - B0Y) / (B1Y - B0Y) * MAP_H

def simplify(pts, eps):
    if len(pts) < 3: return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1e-9
    i, dm = 0, -1
    for j in range(1, len(pts) - 1):
        d = abs(dy * (pts[j][0] - ax) - dx * (pts[j][1] - ay)) / L
        if d > dm: i, dm = j, d
    if dm <= eps: return [pts[0], pts[-1]]
    return simplify(pts[:i+1], eps)[:-1] + simplify(pts[i:], eps)

def lines(geom):
    if geom["type"] == "LineString": return [geom["coordinates"]]
    if geom["type"] == "MultiLineString": return geom["coordinates"]
    return []

out = {"solid": [], "disputed": []}
for f in json.load(open(SRC))["features"]:
    cls = (f["properties"].get("FEATURECLA") or "").lower()
    key = "solid" if cls.startswith("international") else "disputed"
    for line in lines(f["geometry"]):
        seg = []
        prev = None
        for lon, lat in line:
            p = proj(lon, lat)
            if prev and abs(p[0] - prev[0]) > MAP_W / 2:   # crosses the map seam
                if len(seg) > 1: out[key].append(seg)
                seg = []
            seg.append(p); prev = p
        if len(seg) > 1: out[key].append(seg)

def d(segs):
    parts = []
    for s in segs:
        s = simplify(s, 0.025)
        parts.append("M" + "L".join(f"{x:.2f} {y:.2f}".replace(".00", "") for x, y in s))
    return "".join(parts)

js = "window.SAT_BORDERS=" + json.dumps({k: d(v) for k, v in out.items()}, separators=(",", ":")) + ";"
open(OUT, "w").write(js)
print(len(js), "bytes", {k: len(v) for k, v in out.items()})
