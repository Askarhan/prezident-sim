// Triangulates the country outlines of www/world.js for the WebGL map and writes www/sat/fill.js.
// Run: THREE=path/to/three.module.min.js node tools/sat/build_fill.mjs   (three is used only here, for its earcut)
// The point order must match mgParse() in src/game.html.
import fs from "fs";
import vm from "vm";
const { ShapeUtils, Vector2 } = await import(process.env.THREE || "three");
const box = { jsVectorMap: { addMap: (n, m) => { box.map = m; } } };
vm.runInNewContext(fs.readFileSync("www/world.js", "utf8"), box);
const parse = d => {
  const out = []; let c = "", x = 0, y = 0, r = null, n = null;
  for (const t of d.match(/[MmLlZz]|-?\d*\.?\d+(?:e-?\d+)?/g)){
    if (/[A-Za-z]/.test(t)){ c = t; if (c === "z" || c === "Z"){ if (r) out.push(r); r = null; } continue; }
    if (n === null){ n = +t; continue; }
    const a = n, b = +t; n = null;
    if (c === "M" || c === "m"){ if (r) out.push(r); r = []; x = c === "m" ? x + a : a; y = c === "m" ? y + b : b; c = c === "m" ? "l" : "L"; }
    else if (c === "l"){ x += a; y += b; } else { x = a; y = b; }
    if (!r) r = [];
    r.push(x, y);
  }
  if (r) out.push(r);
  for (const q of out) if (q.length > 4 && q[0] === q[q.length-2] && q[1] === q[q.length-1]) q.length -= 2;
  return out;
};
const keys = Object.keys(box.map.paths), idx = [], counts = []; let base = 0;
for (const k of keys){
  let n = 0;
  for (const r of parse(box.map.paths[k].path)){
    const pts = []; for (let i = 0; i < r.length; i += 2) pts.push(new Vector2(r[i], r[i+1]));
    if (pts.length >= 3) for (const f of ShapeUtils.triangulateShape(pts, [])){ idx.push(base+f[0], base+f[1], base+f[2]); n += 3; }
    base += pts.length;
  }
  counts.push(n);
}
if (base > 65535) throw new Error("too many points");
const b64 = Buffer.from(Uint16Array.from(idx).buffer).toString("base64");
fs.writeFileSync("www/sat/fill.js", `window.SAT_FILL=${JSON.stringify({v:base, k:keys, n:counts, i:b64})};\n`);
console.log("countries", keys.length, "points", base, "tris", idx.length/3, "kB", Math.round(b64.length/1024));
