# Natural Earth 1:50m countries -> jsVectorMap-compatible world.js in the game's map units (same projection as borders.js)
import json, math, sys, subprocess
SRC, OLD, OUT, EPS = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 0.025
MINA = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0004
exec(open('build_borders.py').read().split("def lines(")[0].split("SRC, OUT = sys.argv[1], sys.argv[2]")[1])
old = json.loads(subprocess.check_output(["node", "-e", "global.jsVectorMap={addMap(n,d){process.stdout.write(JSON.stringify(d))}};require(process.argv[1])", OLD]))
keys = set(old["paths"])
SPECIAL = {"Kosovo":"_0", "N. Cyprus":"_1", "Somaliland":"_2"}
def area(r): return sum(r[i][0]*r[(i+1)%len(r)][1] - r[(i+1)%len(r)][0]*r[i][1] for i in range(len(r)))/2
def ring_pts(ring):
    pts, prev = [], None
    for lon, lat in ring:
        x, y = proj(lon, lat)
        if prev is not None:
            while x - prev[0] > MAP_W/2: x -= MAP_W
            while prev[0] - x > MAP_W/2: x += MAP_W
        pts.append((x, y)); prev = (x, y)
    return pts
out, seen = {}, set()
for f in json.load(open(SRC))["features"]:
    pr = f["properties"]; nm = pr.get("NAME") or ""
    k = SPECIAL.get(nm) or (pr.get("ISO_A2_EH") if pr.get("ISO_A2_EH") not in (None, "-99") else pr.get("ISO_A2"))
    if k not in keys: continue
    g = f["geometry"]; polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    parts = []
    for poly in polys:
        for ri, ring in enumerate(poly):
            pts = ring_pts(ring)
            if pts[0] == pts[-1]: pts = pts[:-1]
            if len(pts) < 4: continue
            h = len(pts)//2
            s = simplify(pts[:h+1], EPS)[:-1] + simplify(pts[h:] + [pts[0]], EPS)[:-1]
            if len(s) < 3 or abs(area(s)) < MINA: continue
            # outer rings clockwise on screen, holes counter-clockwise: nonzero fill gives the holes
            if (area(s) < 0) != (ri > 0): s = s[::-1]
            q = [(round(x*100), round(y*100)) for x, y in s]
            num = lambda v: (("-" if v < 0 else "") + (f"{abs(v)/100:.2f}".rstrip("0").rstrip(".")).lstrip("0").replace("", "") or "0") if v else "0"
            def fmt(v):
                t = f"{abs(v)/100:.2f}".rstrip("0").rstrip(".")
                if t.startswith("0."): t = t[1:]
                return ("-" if v < 0 else "") + (t or "0")
            rel = "".join((fmt(b[0]-a[0]) if fmt(b[0]-a[0]).startswith("-") else " " + fmt(b[0]-a[0])) + (fmt(b[1]-a[1]) if fmt(b[1]-a[1]).startswith("-") else " " + fmt(b[1]-a[1])) for a, b in zip(q, q[1:]))
            parts.append(f"M{fmt(q[0][0])} {fmt(q[0][1])}l" + rel.lstrip() + "z")
    if not parts: continue
    if k in out: out[k]["path"] += "".join(parts)
    else: out[k] = {"path": "".join(parts), "name": old["paths"][k]["name"]}
    seen.add(k)
missing = keys - seen
for k in missing: out[k] = old["paths"][k]   # keep the old outline for anything Natural Earth names differently
data = {k: v for k, v in old.items() if k != "paths"}; data["paths"] = out
open(OUT, "w").write('jsVectorMap.addMap("world",' + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ");")
print("missing from NE:", sorted(missing)); import os; print(os.path.getsize(OUT), "bytes")
