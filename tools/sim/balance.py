# Balance proposal: within every kind, a more expensive model must be at least as cost-effective as a cheaper one
# (+4% per doubling of price). "Value" is what the battle model rewards for that kind; stats rise up to x2, the rest comes off the price.
import re, json, math, sys
src = open(sys.argv[1] if len(sys.argv) > 1 else "src/game.html", encoding="utf-8").read()
i = src.index("const MODEL_ROWS"); j = src.index("];", i)
ROW = re.compile(r'\["(\w+)","(\w+)","([^"]+)","(\w+)",(\d),([\d.e-]+),([\d.]+),([\d.]+),([\d.]+),([\d.]+)(?:,(\d+))?\]')
rows = [list(m.groups()) for m in ROW.finditer(src[i:j])]
# value per kind: (main stat, armour exponent)
MAIN = {"tank":("ga", 1), "ifv":("ga", 1), "apc":("ga", 1), "sph":("ga", .5), "mlrs":("ga", .5), "srbm":("ga", .5),
        "fighter":("aa", 1), "attack":("ga", .5), "bomber":("ga", .5), "heli":("ga", .5), "drone":("ga", .5), "loiter":("ga", 0),
        "shorad":("aa", .5), "mrsam":("aa", .5), "lrsam":("aa", .5), "ew":("aa", .5),
        "corvette":("gaa", .5), "frigate":("gaa", .5), "destroyer":("gaa", .5), "sub":("ga", .5), "carrier":("gaa", .5)}
def val(r):
    k = r[1]; ga, aa, df = float(r[7]), float(r[8]), float(r[9]); m, e = MAIN[k]
    x = ga if m == "ga" else aa if m == "aa" else ga + aa
    if k == "fighter": x = aa + 0.3*ga
    return x*max(df, 1)**e
out = []; BONUS = 0.04; CAP = 2.0
kinds = {}
for r in rows: kinds.setdefault(r[1], []).append(r)
for k, L in kinds.items():
    if k not in MAIN: continue
    L.sort(key=lambda r: float(r[5])); best = None
    for r in L:
        p = float(r[5]); v = val(r); vp = v/p
        if best is None: best = (vp, p); out.append((k, r, 1, p, v, v)); continue
        need = best[0]*(1 + BONUS*math.log2(max(1, p/best[1])))
        if vp >= need: best = (vp, p); out.append((k, r, 1, p, v, v)); continue
        f = need/vp; m, e = MAIN[k]; s = min(CAP, f)**(1/(1 + e))
        v2 = v*s**(1 + e); p2 = p if f <= CAP else v2/need
        out.append((k, r, s, p2, v, v2)); best = (need, p2)
print("| Модель | Вид | Цена было → стало | Атака/ПВО | Броня | Ценность за $ было → стало |\n|---|---|---|---|---|---|")
res = {}
for k, r, s, p2, v, v2 in out:
    ga, aa, df = float(r[7]), float(r[8]), float(r[9]); m, e = MAIN[k]
    nga = ga*s if m in ("ga", "gaa") or k == "fighter" and False else ga
    naa = aa*s if m in ("aa", "gaa") else aa
    ndf = df*s if e > 0 else df
    if k == "fighter": naa, nga = aa*s, ga*s
    R = lambda x: round(x*2)/2 if x < 10 else round(x)
    nga, naa, ndf = R(nga), R(naa), R(ndf); p2 = float(f"{p2:.3g}")
    res[r[0]] = [nga, naa, ndf, p2]
    if s > 1.001 or abs(p2 - float(r[5])) > 1e-9:
        print(f"| {r[2]} | {k} | {r[5]} → {p2} | {r[7] if m!='aa' else r[8]} → {nga if m!='aa' else naa} | {r[9]} → {ndf} | {v/float(r[5]):.0f} → {v2/p2:.0f} |")
json.dump(res, open("/tmp/claude-0/-home-claude/e7254a50-ba4b-5e2b-bb4a-186ab147d0ed/scratchpad/balance.json", "w"))
