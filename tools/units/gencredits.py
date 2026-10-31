# rewrite the CREDITS3D table in the game source from tools/units/credits3d.json
import json, re, sys
src = __import__('pathlib').Path(__file__).resolve().parents[2] / 'src' / 'game.html'
rows = json.load(open(__import__('pathlib').Path(__file__).with_name('credits3d.json'), encoding='utf-8'))
s = open(src, encoding='utf-8').read()
body = ",\n".join("  " + json.dumps([mid, by, "https://sketchfab.com/3d-models/" + uid], ensure_ascii=False) for mid, by, uid in rows)
s2 = re.sub(r"const CREDITS3D = \[\n.*?\n\];", lambda m: "const CREDITS3D = [\n" + body + "\n];", s, count=1, flags=re.S)
assert s2 != s or body in s
s2 = s2.replace("${CREDITS3D.map(([n,by,u]) => `<div class=\"cr-row\"><b>${esc(n)}</b>", "${CREDITS3D.map(([n,by,u]) => `<div class=\"cr-row\"><b>${esc(MODELS[n] ? MODELS[n].name : n)}</b>")
open(src, 'w', encoding='utf-8').write(s2); print(len(rows), 'rows')
