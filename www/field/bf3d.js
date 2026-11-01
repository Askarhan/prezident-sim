// The 3D battlefield: real models with turrets that track targets, shots, explosions, burning wrecks.
// Loaded on demand by the game: import("./field/bf3d.js").then(m => m.start(el, ctx))
import * as THREE from "../lib/three/three.module.min.js";
import { GLTFLoader } from "../lib/three/GLTFLoader.js";

const FIELD = 240;                 // metres, square
const MODEL_CACHE = new Map();     // glb name -> Promise<gltf scene>
const loader = new GLTFLoader();
// models that also ship a light copy <name>_lo.glb (~2.5-4k triangles, half-size textures)
const HAS_LO = new Set(["t72", "abrams", "bmp2", "bradley", "grad", "armata", "t90", "m1a1", "leo", "ztz99", "type96", "marder", "stryker", "btr82", "patria", "zbd04", "msta", "akacia", "paladin", "pzh", "himars", "tornado", "plz05", "gepard", "patriot", "s400", "s300", "thaad", "buk", "nasams", "su25", "ka52", "tb2", "a10", "su34", "mi24"]);
// graphics levels: pixel ratio cap, shadow map (0 = off), distance beyond which the light copy is drawn, effects share, squads per side at the front
// aircraft on the field: roles the game sends for them
const AIR_ROLES = new Set(["plane", "heli", "drone"]);
const QL = {high:{pr:1.6, sh:2048, soft:true, lod:150, fx:1, cap:6}, mid:{pr:1, sh:1024, soft:false, lod:90, fx:0.65, cap:6}, low:{pr:0.8, sh:0, soft:false, lod:0, fx:0.4, cap:4}};
function loadModel(name){
  // the app ships .glb files; the web page gets the same files as base64 text (hosts that don't serve .glb)
  if (!MODEL_CACHE.has(name)) MODEL_CACHE.set(name, new Promise((res, rej) => loader.load(`field/models/${name}.glb`, g => res(g.scene), undefined,
    () => fetch(`field/models/${name}.glb.txt`).then(r => { if (!r.ok) throw new Error("model " + name); return r.text(); })
      .then(t => { const bin = atob(t.trim()), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i); loader.parse(buf.buffer, "", g => res(g.scene), rej); }).catch(rej))));
  return MODEL_CACHE.get(name);
}
function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; }; }
function noise2(seed){
  const R = rng(seed), P = new Float32Array(65536); for (let i = 0; i < 65536; i++) P[i] = R();
  const at = (x, y) => P[((y & 255) << 8) | (x & 255)];
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx*fx*(3 - 2*fx), sy = fy*fy*(3 - 2*fy);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1); return a + (b - a)*sx + (c - a)*sy + (a - b - c + d)*sx*sy; };
  n.fbm = (x, y, o = 4) => { let s = 0, w = 0.5, f = 1, t = 0; for (let i = 0; i < o; i++){ s += n(x*f, y*f)*w; t += w; w *= 0.5; f *= 2.03; } return s/t; };
  return n;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a)*t;
const angDiff = (a, b) => { let d = (b - a) % (Math.PI*2); if (d > Math.PI) d -= Math.PI*2; if (d < -Math.PI) d += Math.PI*2; return d; };

/* ---------- ground: colour texture painted on a canvas, detail texture tiled on top, gentle relief ---------- */
const PAL = {
  p:{a:[78,96,46], b:[118,122,60], soil:[96,78,54], road:[124,108,82]},
  f:{a:[44,62,32], b:[66,82,42], soil:[70,60,42], road:[106,92,70]},
  m:{a:[98,94,82], b:[132,126,112], soil:[90,84,74], road:[118,112,100]},
  u:{a:[92,92,88], b:[112,110,104], soil:[80,76,70], road:[58,60,62]},
  d:{a:[178,152,106], b:[200,176,128], soil:[150,124,88], road:[146,124,90]}
};
function buildGround(ctx, R, N, quality){
  const ter = PAL[ctx.terrain] ? ctx.terrain : "p", pal = PAL[ter], S = quality === "high" ? 2048 : 1024, k = S/FIELD;
  const cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d");
  // base colour at quarter resolution, scaled up
  const L = S/2, lc = document.createElement("canvas"); lc.width = lc.height = L; const lg = lc.getContext("2d"), im = lg.createImageData(L, L);
  for (let y = 0; y < L; y++) for (let x = 0; x < L; x++){
    const wx = x/L*FIELD, wy = y/L*FIELD, t = N.fbm(wx/22, wy/22, 4), t2 = N.fbm(wx/3 + 40, wy/3, 3), t3 = N.fbm(wx/60 + 7, wy/60, 3), o = (y*L + x)*4;
    const c = [0, 1, 2].map(i => lerp(pal.a[i], pal.b[i], t)*(0.78 + t2*0.34)*(0.85 + t3*0.3));
    im.data[o] = c[0]; im.data[o+1] = c[1]; im.data[o+2] = c[2]; im.data[o+3] = 255;
  }
  lg.putImageData(im, 0, 0); g.imageSmoothingQuality = "high"; g.drawImage(lc, 0, 0, S, S);
  const P = (x, z) => [(x + FIELD/2)*k, (z + FIELD/2)*k];
  // fields
  if (ter === "p" || ter === "f"){
    const cols = ter === "p" ? [[164,146,80],[96,120,50],[100,80,56],[134,130,82]] : [[78,92,48]];
    for (let n = 0; n < (ter === "p" ? 16 : 5); n++){
      const x = (R() - 0.5)*FIELD, z = (R() - 0.5)*FIELD, w = 30 + R()*60, h = 25 + R()*55, a = (R() - 0.5)*0.6, c = cols[Math.floor(R()*cols.length)];
      g.save(); g.translate(...P(x, z)); g.rotate(a); g.globalAlpha = 0.5; g.fillStyle = `rgb(${c})`; g.fillRect(-w/2*k, -h/2*k, w*k, h*k);
      if (c[0] === 100){ g.globalAlpha = 0.3; g.strokeStyle = "#3a2c1c"; g.lineWidth = 0.35*k; for (let s = -h/2; s < h/2; s += 1.6){ g.beginPath(); g.moveTo(-w/2*k, s*k); g.lineTo(w/2*k, s*k); g.stroke(); } }
      g.restore();
    }
  }
  // roads
  const roads = [];
  const road = (pts, w) => { roads.push({pts, w}); g.lineCap = g.lineJoin = "round";
    const path = () => { g.beginPath(); pts.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); };
    g.globalAlpha = 0.85; path(); g.strokeStyle = `rgb(${pal.soil})`; g.lineWidth = (w + 2.5)*k; g.stroke();
    g.globalAlpha = 1; path(); g.strokeStyle = `rgb(${pal.road})`; g.lineWidth = w*k; g.stroke();
    g.globalAlpha = 0.35; path(); g.strokeStyle = "rgba(60,48,34,1)"; g.lineWidth = w*0.18*k; g.setLineDash([]); [ -0.25, 0.25 ].forEach(o => { g.save(); g.translate(o*w*k, 0); path(); g.stroke(); g.restore(); }); g.globalAlpha = 1; };
  const rx = (R() - 0.5)*80;
  const wig = (a, b, amp, n) => Array.from({length:n + 1}, (_, i) => { const t = i/n; return [lerp(a[0], b[0], t) + (a[0] === b[0] ? Math.sin(t*5 + R())*amp : 0), lerp(a[1], b[1], t) + (a[1] === b[1] ? Math.sin(t*4 + R())*amp : 0)]; });
  road(wig([rx, -FIELD/2 - 5], [rx + (R() - 0.5)*40, FIELD/2 + 5], 10, 24), 5.5);
  road(wig([-FIELD/2 - 5, 70 + R()*20], [FIELD/2 + 5, 70 + R()*20], 6, 24), 4.5);
  // no man's land: scorched patches, craters
  const pos = ctx.phase === "pos", band = pos ? 45 : 30, craters = [];
  for (let n = 0; n < 30; n++){ const [a, b] = P((R() - 0.5)*FIELD, (R() - 0.5)*band*2), r = (6 + R()*14)*k, gr = g.createRadialGradient(a, b, 0, a, b, r); gr.addColorStop(0, "rgba(38,30,22,.45)"); gr.addColorStop(1, "rgba(38,30,22,0)"); g.fillStyle = gr; g.beginPath(); g.arc(a, b, r, 0, 7); g.fill(); }
  for (let n = 0; n < (pos ? 90 : 30); n++){ const x = (R() - 0.5)*FIELD, z = (R() + R() - 1)*band*1.1, r = 0.7 + R()*R()*3; craters.push([x, z, r]);
    const [a, b] = P(x, z), gr = g.createRadialGradient(a, b, 0, a, b, r*1.7*k); gr.addColorStop(0, "rgba(24,18,12,.95)"); gr.addColorStop(0.5, "rgba(56,44,30,.85)"); gr.addColorStop(0.72, "rgba(150,128,96,.45)"); gr.addColorStop(1, "rgba(150,128,96,0)"); g.fillStyle = gr; g.beginPath(); g.arc(a, b, r*1.7*k, 0, 7); g.fill(); }
  // trenches
  const trenches = [];
  [1, -1].forEach(s => { const z0 = s*(pos ? 15 : 19), pts = []; let x = -FIELD/2 - 4;
    while (x < FIELD/2 + 4){ pts.push([x, z0 + (pts.length % 2 ? 1.3 : -1.3) + (R() - 0.5)*1.6 + Math.sin(x/37 + s)*3]); x += 4 + R()*7; }
    trenches.push({s, pts}); const path = () => { g.beginPath(); pts.forEach(([a, b], i) => { const [qa, qb] = P(a, b); i ? g.lineTo(qa, qb) : g.moveTo(qa, qb); }); };
    g.lineJoin = "miter"; g.filter = `blur(${Math.max(1, k*0.6)}px)`; path(); g.strokeStyle = "rgba(128,106,76,.55)"; g.lineWidth = 3.4*k; g.stroke(); g.filter = "none"; path(); g.strokeStyle = "rgba(34,26,18,.95)"; g.lineWidth = 1.2*k; g.stroke(); });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  // detail texture: fine grass / soil grain, tiled
  const D = 256, dc = document.createElement("canvas"); dc.width = dc.height = D; const dg = dc.getContext("2d"), di = dg.createImageData(D, D), N3 = noise2(ctx.seed ^ 77);
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++){ const v = 0.55*N3.fbm(x/8, y/8, 3) + 0.45*Math.random(), o = (y*D + x)*4, c = 150 + v*105; di.data[o] = di.data[o+1] = di.data[o+2] = c; di.data[o+3] = 255; }
  // make it tile seamlessly by mirroring the noise part (good enough for grain)
  dg.putImageData(di, 0, 0);
  const det = new THREE.CanvasTexture(dc); det.wrapS = det.wrapT = THREE.RepeatWrapping; det.anisotropy = 8;
  // relief: low hills, sunken trenches and craters
  // the land goes on beyond the field into the haze: one big mesh, the field texture mirrored outside
  const BIG = FIELD*2.5, seg = quality === "high" ? 250 : 160, geo = new THREE.PlaneGeometry(BIG, BIG, seg, seg); geo.rotateX(-Math.PI/2);
  tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
  const amp = ter === "m" ? 9 : ter === "d" ? 4 : 2.4, pos3 = geo.attributes.position;
  const height = (x, z) => {
    let h = (N.fbm(x/70 + 9, z/70 + 3, 4) - 0.5)*amp*2;
    if (Math.abs(z) < 60) h *= 0.35 + Math.abs(z)/60*0.65;           // the front sits in a flatter valley
    if (Math.abs(x) > FIELD/2 + 4 || Math.abs(z) > FIELD/2 + 4) return h;
    for (const tr of trenches) for (let i = 0; i < tr.pts.length - 1; i++){ const [a, b] = tr.pts[i], [c, d] = tr.pts[i + 1], dx = c - a, dz = d - b, L2 = dx*dx + dz*dz, t = clamp(((x - a)*dx + (z - b)*dz)/L2, 0, 1), dd = Math.hypot(x - a - dx*t, z - b - dz*t); if (dd < 1.6) h -= (1.6 - dd)*0.9; }
    for (const [cx, cz, r] of craters){ const dd = Math.hypot(x - cx, z - cz); if (dd < r*1.6) h -= Math.max(0, 1 - dd/r)*r*0.35; }
    return h; };
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos3.count; i++){ const x = pos3.getX(i), z = pos3.getZ(i); pos3.setY(i, height(x, z)); uv.setXY(i, 0.5 + x/FIELD, 0.5 - z/FIELD); }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({map:tex, roughness:0.96, metalness:0});
  mat.onBeforeCompile = sh => {
    sh.uniforms.detailMap = {value:det};
    sh.fragmentShader = sh.fragmentShader.replace("#include <map_pars_fragment>", "#include <map_pars_fragment>\nuniform sampler2D detailMap;")
      .replace("#include <map_fragment>", "#include <map_fragment>\n{ float d1 = texture2D(detailMap, vMapUv*58.0).r; float d2 = texture2D(detailMap, vMapUv*13.0 + 0.37).r; diffuseColor.rgb *= mix(0.82, 1.18, d1)*mix(0.9, 1.1, d2); }");
  };
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true;
  return {mesh, height, roads, trenches, craters, ter};
}

/* ---------- vegetation and buildings, instanced ---------- */
function jitter(geo, R, a){ const p = geo.attributes.position; for (let i = 0; i < p.count; i++){ p.setXYZ(i, p.getX(i)*(1 + (R() - 0.5)*a), p.getY(i)*(1 + (R() - 0.5)*a*0.6), p.getZ(i)*(1 + (R() - 0.5)*a)); } geo.computeVertexNormals(); return geo; }
function colorize(geo, c, v, R){ const n = geo.attributes.position.count, arr = new Float32Array(n*3); const col = new THREE.Color(c); for (let i = 0; i < n; i++){ const s = 1 + (R() - 0.5)*v; arr[i*3] = col.r*s; arr[i*3+1] = col.g*s; arr[i*3+2] = col.b*s; } geo.setAttribute("color", new THREE.BufferAttribute(arr, 3)); return geo; }
function merge(geos){
  // tiny merge of non-indexed geometries with position, normal, color
  const parts = geos.map(g => g.index ? g.toNonIndexed() : g); let n = 0; parts.forEach(g => n += g.attributes.position.count);
  const pos = new Float32Array(n*3), nor = new Float32Array(n*3), col = new Float32Array(n*3); let o = 0;
  parts.forEach(g => { pos.set(g.attributes.position.array, o*3); nor.set(g.attributes.normal.array, o*3); col.set(g.attributes.color.array, o*3); o += g.attributes.position.count; });
  const m = new THREE.BufferGeometry(); m.setAttribute("position", new THREE.BufferAttribute(pos, 3)); m.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); m.setAttribute("color", new THREE.BufferAttribute(col, 3)); return m;
}
function treeGeo(R, kind){
  const parts = [];
  if (kind === "pine"){
    const tr = new THREE.CylinderGeometry(0.16, 0.26, 3, 6); tr.translate(0, 1.5, 0); parts.push(colorize(tr, 0x3b2a1c, 0.2, R));
    [[2.6, 3.4, 2.4], [2.1, 3.0, 4.4], [1.6, 2.6, 6.2], [1.0, 2.2, 7.8]].forEach(([r, h, y]) => { const c = new THREE.ConeGeometry(r, h, 9, 2); jitter(c, R, 0.25); c.translate(0, y, 0); parts.push(colorize(c, 0x1d3a22, 0.35, R)); });
  } else if (kind === "bush"){
    for (let i = 0; i < 3; i++){ const s = new THREE.IcosahedronGeometry(0.8 + R()*0.5, 1); jitter(s, R, 0.35); s.scale(1, 0.75, 1); s.translate((R() - 0.5)*1.2, 0.6, (R() - 0.5)*1.2); parts.push(colorize(s, i ? 0x2f4a20 : 0x3d5a26, 0.35, R)); }
  } else {
    const tr = new THREE.CylinderGeometry(0.2, 0.32, 4, 7); tr.translate(0, 2, 0); parts.push(colorize(tr, 0x3e2e20, 0.2, R));
    for (let i = 0; i < 6; i++){ const a = i*2.4, d = i ? 1.2 + R()*0.6 : 0, s = new THREE.IcosahedronGeometry(1.5 + R()*0.8, 1); jitter(s, R, 0.35); s.translate(Math.cos(a)*d, 4.6 + R()*1.6, Math.sin(a)*d); parts.push(colorize(s, [0x2c4a1e, 0x3a5a24, 0x2a4220][i % 3], 0.4, R)); }
  }
  return merge(parts);
}
function houseGeo(R){
  const parts = [], w = 7 + R()*3, d = 6 + R()*2, h = 3;
  const b = new THREE.BoxGeometry(w, h, d); b.translate(0, h/2, 0); parts.push(colorize(b, R() < 0.5 ? 0xb8ad98 : 0x9c9486, 0.1, R));
  const roof = new THREE.CylinderGeometry(d*0.62, d*0.62, w + 0.6, 3, 1); roof.rotateZ(Math.PI/2); roof.rotateX(Math.PI/6*0); roof.scale(1, 0.5, 1); roof.translate(0, h + d*0.16, 0); parts.push(colorize(roof, R() < 0.5 ? 0x6e2a1c : 0x3c4046, 0.12, R));
  return merge(parts);
}
function scatterProps(scene, ctx, G, R, avoid){
  const mat = new THREE.MeshStandardMaterial({vertexColors:true, roughness:0.95, metalness:0, flatShading:true});
  const kinds = ctx.terrain === "f" ? {pine:[3, 260], oak:[2, 80], bush:[2, 60]} : ctx.terrain === "m" ? {pine:[2, 90], bush:[2, 80]} : ctx.terrain === "d" ? {bush:[2, 40]} : {oak:[3, 120], pine:[1, 20], bush:[2, 110]};
  const onRoad = (x, z, m) => G.roads.some(rd => rd.pts.some(([a, b], i) => { const q = rd.pts[i + 1]; if (!q) return false; const dx = q[0] - a, dz = q[1] - b, L2 = dx*dx + dz*dz || 1, t = clamp(((x - a)*dx + (z - b)*dz)/L2, 0, 1); return Math.hypot(x - a - dx*t, z - b - dz*t) < rd.w/2 + m; }));
  const ok = (x, z, r) => !onRoad(x, z, r) && !avoid.some(([ax, az, ar]) => Math.hypot(ax - x, az - z) < ar + r);
  const dummy = new THREE.Object3D();
  for (const [kind, [variants, count]] of Object.entries(kinds)){
    const geos = Array.from({length:variants}, () => treeGeo(R, kind));
    geos.forEach(geo => {
      const pts = [];
      for (let i = 0; i < count/variants*3 && pts.length < count/variants; i++){
        // trees grow in lines and clusters, thinner near the front
        let x, z; if (R() < 0.6 && pts.length){ const p = pts[Math.floor(R()*pts.length)]; x = p[0] + (R() - 0.5)*14; z = p[1] + (R() - 0.5)*6; } else { x = (R() - 0.5)*FIELD; z = (R() - 0.5)*FIELD; }
        if (Math.abs(z) < 34 && R() < 0.85) continue;
        if (Math.abs(x) > FIELD/2 - 2 || Math.abs(z) > FIELD/2 - 2 || !ok(x, z, 3)) continue; pts.push([x, z]);
      }
      const inst = new THREE.InstancedMesh(geo, mat, pts.length); inst.castShadow = true; inst.receiveShadow = true;
      pts.forEach(([x, z], i) => { const s = 0.8 + R()*0.5; dummy.position.set(x, G.height(x, z) - 0.2, z); dummy.rotation.set(0, R()*6.28, 0); dummy.scale.set(s, s*(0.9 + R()*0.25), s); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); });
      scene.add(inst);
    });
  }
  // a village in the rear of each side
  const houses = []; [1, -1].forEach(s => { const cx = (R() - 0.5)*120, cz = s*(85 + R()*20); for (let i = 0; i < 6; i++){ const x = cx + (R() - 0.5)*60, z = cz + (R() - 0.5)*30; if (ok(x, z, 6)) houses.push([x, z]); } });
  const hg = [houseGeo(R), houseGeo(R)];
  hg.forEach((geo, gi) => { const mine = houses.filter((_, i) => i % 2 === gi), inst = new THREE.InstancedMesh(geo, mat, mine.length); inst.castShadow = inst.receiveShadow = true;
    mine.forEach(([x, z], i) => { dummy.position.set(x, G.height(x, z), z); dummy.rotation.set(0, Math.floor(R()*4)*Math.PI/2 + (R() - 0.5)*0.2, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); }); scene.add(inst); });
}

/* ---------- particles: one draw call for smoke and dust, one for fire and flashes ---------- */
function softTex(kind){
  const S = 64, c = document.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d"), gr = g.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
  if (kind === "fire"){ gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,.65)"); gr.addColorStop(1, "rgba(255,255,255,0)"); }
  else { gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(0.5, "rgba(255,255,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); }
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  if (kind !== "fire"){ const im = g.getImageData(0, 0, S, S); for (let i = 0; i < im.data.length; i += 4) im.data[i + 3] *= 0.75 + Math.random()*0.25; g.putImageData(im, 0, 0); }
  const t = new THREE.CanvasTexture(c); return t;
}
class Particles {
  constructor(scene, max, additive){
    this.max = max; this.n = 0; this.items = [];
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max*3); this.col = new Float32Array(max*4); this.size = new Float32Array(max);
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("pcolor", new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("psize", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms:{map:{value:softTex(additive ? "fire" : "smoke")}, scale:{value:400}},
      vertexShader:`attribute vec4 pcolor; attribute float psize; varying vec4 vC; uniform float scale;
        void main(){ vC = pcolor; vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_PointSize = psize*scale/-mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader:`uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a*t.a); if (gl_FragColor.a < 0.01) discard; }`,
      transparent:true, depthWrite:false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending});
    this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = additive ? 3 : 2; scene.add(this.points); this.geo = geo;
  }
  emit(p){ if (this.items.length >= this.max) this.items.shift(); p.age = 0; this.items.push(p); }
  update(dt){
    const out = [];
    for (const p of this.items){ p.age += dt; if (p.age >= p.life) continue; out.push(p);
      p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt; p.vy += (p.g || 0)*dt; const dr = p.drag ?? 0.6; p.vx *= 1 - dr*dt; p.vz *= 1 - dr*dt; if (p.g) p.vy *= 1 - 0.2*dt; }
    this.items = out;
    let i = 0;
    for (const p of out){ const t = p.age/p.life, a = p.fadeIn ? Math.min(1, t/p.fadeIn) : 1;
      this.pos[i*3] = p.x; this.pos[i*3+1] = p.y; this.pos[i*3+2] = p.z;
      const c0 = p.c, c1 = p.c1 || p.c; this.col[i*4] = lerp(c0[0], c1[0], t); this.col[i*4+1] = lerp(c0[1], c1[1], t); this.col[i*4+2] = lerp(c0[2], c1[2], t); this.col[i*4+3] = p.a*(1 - t)*a;
      this.size[i] = lerp(p.s0, p.s1, Math.sqrt(t)); i++; }
    this.geo.setDrawRange(0, i);
    for (const k of ["position", "pcolor", "psize"]) this.geo.attributes[k].needsUpdate = true;
  }
}

/* ---------- the scene ---------- */
/* ---------- sound: recordings for guns, explosions, helicopters and engines; jets, drones and missile launches are synthesised.
   Every sound sits on the field: quieter, duller and a little later with distance from the camera, panned to its side. ---------- */
const SFX = {tank:["tank1", "tank2", "tank3", "tank4", "tank5"], autocannon:["autocannon"], arty:["arty"], boom:["boom"], heli:["heli_loop"], engine:["engine_loop"]};
const SFX_GAP = {tank:0.05, autocannon:0.07, arty:0.08, boom:0.07, rocket:0.08, sam:0.12};   // the same sound no more often than this (s)
function makeSound(on, shared){
  let ac = null; try { if (on) ac = shared || new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ ac = null; }
  const S = {lx:0, ly:100, lz:0, rx:1, rz:0};
  if (!ac) return {ok:false, play(){}, loop(){ return null; }, listen(){}, wake(){}, sleep(){}, set(){}, info(){ return null; }, record(){ return Promise.resolve(null); }, dispose(){}};
  const master = ac.createGain(), comp = ac.createDynamicsCompressor(); master.gain.value = 0.55;
  comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.25;
  master.connect(comp); comp.connect(ac.destination);
  const buf = {}, last = {}, plays = {}; let voices = 0, hiddenSleep = false, enabled = true;
  Object.entries(SFX).forEach(([k, names]) => { buf[k] = []; names.forEach(n => fetch(`field/sfx/${n}.ogg`).then(r => r.ok ? r.arrayBuffer() : Promise.reject(n)).then(b => ac.decodeAudioData(b)).then(d => buf[k].push(d)).catch(() => {})); });
  const noise = (sec, brown) => { const b = ac.createBuffer(1, Math.round(ac.sampleRate*sec), ac.sampleRate), d = b.getChannelData(0); let l = 0;
    for (let i = 0; i < d.length; i++){ const w = Math.random()*2 - 1; if (brown){ l = (l + 0.02*w)/1.02; d[i] = l*3.5; } else d[i] = w; }
    // loop seam: fade the ends into each other
    const f = Math.round(ac.sampleRate*0.05); for (let i = 0; i < f; i++){ const k = i/f; d[i] = d[i]*k + d[d.length - f + i]*(1 - k); } return b; };
  const white = noise(1.5, false), brown = noise(3, true);
  function where(x, y, z){ const dx = x - S.lx, dy = y - S.ly, dz = z - S.lz, d = Math.hypot(dx, dy, dz);
    return {d, g:1/(1 + Math.max(0, d - 45)/55), lp:clamp(16000 - (d - 60)*55, 1200, 16000), pan:clamp((dx*S.rx + dz*S.rz)/Math.max(30, d), -0.8, 0.8), delay:Math.min(0.35, d/900)}; }
  function out(p, vol){ const f = ac.createBiquadFilter(), g = ac.createGain(), pn = ac.createStereoPanner ? ac.createStereoPanner() : null;
    f.type = "lowpass"; f.frequency.value = p.lp; g.gain.value = vol*p.g; f.connect(g);
    if (pn){ pn.pan.value = p.pan; g.connect(pn); pn.connect(master); } else g.connect(master); return {f, g, pn}; }
  // a one-shot at a point of the field
  function play(kind, x, y, z, o = {}){
    if (ac.state !== "running") return;
    const t = ac.currentTime, vol = o.vol == null ? 1 : o.vol; if (t - (last[kind] || -9) < (SFX_GAP[kind] || 0.05) || voices > 18) return;
    const p = where(x, y, z); if (vol*p.g < 0.02) return; last[kind] = t;
    const nd = out(p, vol), at = t + p.delay; let src, len;
    if (buf[kind]){ const L = buf[kind]; if (!L.length) return; src = ac.createBufferSource(); src.buffer = L[Math.floor(Math.random()*L.length)];
      src.playbackRate.value = (o.rate || 1)*(0.92 + Math.random()*0.16); src.connect(nd.f); len = src.buffer.duration/src.playbackRate.value; }
    else {   // rocket / sam: a rushing noise whose pitch rises, with a low thump at the launch
      const sam = kind === "sam", dur = (sam ? 1.3 : 0.9)/(o.rate || 1), bp = ac.createBiquadFilter(), env = ac.createGain();
      src = ac.createBufferSource(); src.buffer = white; src.loop = true; bp.type = "bandpass"; bp.Q.value = 0.9;
      bp.frequency.setValueAtTime(sam ? 500 : 700, at); bp.frequency.exponentialRampToValueAtTime(sam ? 2600 : 1800, at + dur*0.7);
      env.gain.setValueAtTime(0.0001, at); env.gain.exponentialRampToValueAtTime(sam ? 0.9 : 0.7, at + 0.03); env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      src.connect(bp); bp.connect(env); env.connect(nd.f); len = dur;
      const th = ac.createOscillator(), tg = ac.createGain(); th.frequency.setValueAtTime(90, at); th.frequency.exponentialRampToValueAtTime(40, at + 0.25);
      tg.gain.setValueAtTime(0.6, at); tg.gain.exponentialRampToValueAtTime(0.0001, at + 0.3); th.connect(tg); tg.connect(nd.f); th.start(at); th.stop(at + 0.32); }
    voices++; plays[kind] = (plays[kind] || 0) + 1; src.onended = () => { voices--; nd.g.disconnect(); }; src.start(at); if (src.loop) src.stop(at + len);
  }
  // a continuous sound that follows something: helicopter, jet, drone, engines
  function loop(kind, o = {}){
    const p = {g:0, lp:16000, pan:0}, nd = out(p, 0), base = o.vol || 0.5, srcs = []; let rateK = 1, started = false;
    function start(){
      if (kind === "jet"){ [[brown, 1], [white, 0.18]].forEach(([b, v], i) => { const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); s.buffer = b; s.loop = true;
          f.type = i ? "bandpass" : "highpass"; f.frequency.value = i ? 2200 : 120; g.gain.value = v; s.connect(f); f.connect(g); g.connect(nd.f); s.start(); srcs.push(s); }); }
      else if (kind === "drone"){ const s = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), f = ac.createBiquadFilter(); s.type = "sawtooth"; s.frequency.value = o.f || 95;
        lfo.frequency.value = 5 + Math.random()*3; lg.gain.value = (o.f || 95)*0.03; lfo.connect(lg); lg.connect(s.frequency); f.type = "lowpass"; f.frequency.value = 1100; s.connect(f); f.connect(nd.f); s.start(); lfo.start(); srcs.push(s, lfo); }
      else { const L = buf[kind]; if (!L || !L.length) return false; const s = ac.createBufferSource(); s.buffer = L[0]; s.loop = true; s.loopStart = 0; s.loopEnd = s.buffer.duration;
        s.playbackRate.value = (o.rate || 1)*(0.95 + Math.random()*0.1); s.connect(nd.f); s.start(ac.currentTime, Math.random()*s.buffer.duration); srcs.push(s); }
      return true; }
    return {
      set(x, y, z, vol, rate){ if (!started) started = start(); if (!started) return; const q = where(x, y, z), t = ac.currentTime;
        nd.g.gain.setTargetAtTime((vol == null ? 1 : vol)*base*q.g, t, 0.12); nd.f.frequency.setTargetAtTime(q.lp, t, 0.12); if (nd.pn) nd.pn.pan.setTargetAtTime(q.pan, t, 0.12);
        if (rate && Math.abs(rate - rateK) > 0.005){ rateK = rate; srcs.forEach(s => { if (s.playbackRate) s.playbackRate.setTargetAtTime(rate, t, 0.1); else if (s.type === "sawtooth") s.frequency.setTargetAtTime((o.f || 95)*rate, t, 0.1); }); } },
      stop(){ const t = ac.currentTime; nd.g.gain.setTargetAtTime(0, t, 0.08); srcs.forEach(s => { try { s.stop(t + 0.4); } catch(e){} }); setTimeout(() => nd.g.disconnect(), 600); }
    };
  }
  return {ok:true, play, loop,
    listen(cam){ const e = cam.matrixWorld.elements; S.lx = e[12]; S.ly = e[13]; S.lz = e[14]; S.rx = e[0]; S.rz = e[2]; },
    // browsers start audio only after a tap; the app in the background goes quiet
    wake(fromHidden){ if (fromHidden && !hiddenSleep) return; hiddenSleep = false; if (ac.state === "suspended") ac.resume(); master.gain.setTargetAtTime(enabled ? 0.55 : 0, ac.currentTime, 0.05); },
    // a shared context keeps running for the game, so the field only goes silent
    sleep(){ if (hiddenSleep) return; hiddenSleep = true; master.gain.setTargetAtTime(0, ac.currentTime, 0.02); },
    set(on){ enabled = !!on; master.gain.setTargetAtTime(on ? 0.55 : 0, ac.currentTime, 0.05); },
    // test hooks: what is loaded and played, and a recording of the mix (webm) to listen to outside the game
    info(){ return {state:ac.state, loaded:Object.fromEntries(Object.entries(buf).map(([k, v]) => [k, v.length])), plays:{...plays}, voices}; },
    record(sec){ return new Promise(res => { const dst = ac.createMediaStreamDestination(); comp.connect(dst); const rec = new MediaRecorder(dst.stream), parts = [];
      rec.ondataavailable = e => parts.push(e.data); rec.onstop = () => { comp.disconnect(dst); const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(new Blob(parts, {type:"audio/webm"})); };
      rec.start(); setTimeout(() => rec.stop(), sec*1000); }); },
    dispose(){ try { master.gain.value = 0; comp.disconnect(); if (!shared) ac.close(); } catch(e){} }};
}
export async function start(el, ctx){
  let level = QL[ctx.quality] ? ctx.quality : ctx.quality === "medium" ? "mid" : "high", Q = QL[level];
  const quality = level === "high" ? "high" : "low";   // ground texture and relief detail are fixed at start
  const renderer = new THREE.WebGLRenderer({antialias:level !== "low", powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr));
  renderer.shadowMap.enabled = Q.sh > 0; renderer.shadowMap.type = Q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement); renderer.domElement.className = "bf3d-cv";
  const scene = new THREE.Scene(), haze = ctx.terrain === "d" ? 0xc9b48e : 0x9aa6a0;
  scene.background = new THREE.Color(haze); scene.fog = new THREE.Fog(haze, 160, 430);
  const camera = new THREE.PerspectiveCamera(32, 1, 2, 900);
  const snd = makeSound(ctx.sound !== false, ctx.audio); snd.wake();
  const hemi = new THREE.HemisphereLight(0xcfdcff, 0x4a4234, 0.55); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.6); sun.castShadow = Q.sh > 0;
  sun.shadow.mapSize.set(Q.sh || 1024, Q.sh || 1024);
  Object.assign(sun.shadow.camera, {left:-90, right:90, top:90, bottom:-90, near:10, far:400}); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  const R = rng(ctx.seed), N = noise2(ctx.seed);
  const G = buildGround(ctx, R, N, quality); scene.add(G.mesh);

  // units: positions first so props keep away from them
  const units = [];
  const tz = ctx.phase === "pos" ? 15 : 19, DEPTH = {front:[tz + 5, tz + 19], arty:[tz + 34, tz + 50], ad:[tz + 56, tz + 70]};
  [0, 1].forEach(side => ["front", "arty", "ad"].forEach(role => {
    const list = ctx.units.filter(u => u.side === side && (u.role || "front") === role), n = list.length, s = side ? -1 : 1, span = role === "front" ? FIELD*0.75 : FIELD*0.5;
    list.forEach((u, k) => { const x = (k + 0.5 - n/2)*(span/Math.max(n, 1)) + (R() - 0.5)*8, d = DEPTH[role], z = s*(d[0] + R()*(d[1] - d[0]));
      units.push({...u, role, x, z, h: u.side ? -Math.PI/2 : Math.PI/2, home:[x, z], hp:u.hp || 1, hpMax:u.hp || 1, pend:0, alive:true, reload:2 + R()*6, state:"hold", next:R()*8}); });
  }));
  scatterProps(scene, ctx, G, R, units.map(u => [u.x, u.z, 9]));
  // load models and place them
  // weak phones load only the light copies; the others load the full models now and the light ones in the background
  const models = {};
  async function getModel(m, lo){ const k = lo && HAS_LO.has(m) ? m + "_lo" : m;
    if (!(k in models)){ try { models[k] = await loadModel(k); } catch(e){ models[k] = k !== m ? await getModel(m, false) : null; } }
    return models[k]; }
  const airInit = ctx.units.filter(u => AIR_ROLES.has(u.role));
  await Promise.all([...new Set([...units, ...airInit].map(u => u.model))].map(m => getModel(m, level === "low")));
  if (level !== "low") [...new Set(units.map(u => u.model))].forEach(m => getModel(m, true));
  const accent = [new THREE.MeshStandardMaterial({color:ctx.accentUs || 0x2f6bff, emissive:ctx.accentUs || 0x2f6bff, emissiveIntensity:0.35, roughness:0.5}),
                  new THREE.MeshStandardMaterial({color:ctx.accentThem || 0xe03030, emissive:ctx.accentThem || 0xe03030, emissiveIntensity:0.35, roughness:0.5})];
  function makeSet(u, src){
    const set = {obj:src.clone(true)};
    set.obj.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; if (o.material && o.material.name === "accent") o.material = accent[u.side]; else if (o.material){ o.material = o.material.clone(); } }
      if (/_turret$/.test(o.name)) set.turret = o; if (/_gun$/.test(o.name)) set.gun = o; if (/_hull$/.test(o.name)) set.hull = o; });
    return set;
  }
  function useSet(u, set){ u.turret = set.turret; u.gun = set.gun; u.hull = set.hull; }
  function dress(u){
    const lo = level === "low" && HAS_LO.has(u.model);
    const src = models[lo ? u.model + "_lo" : u.model] || models[u.model] || models[u.model + "_lo"]; if (!src) { u.alive = false; return; }
    const set = makeSet(u, src), root = new THREE.Group(); root.add(set.obj);
    u.sets = {[lo ? "lo" : "hi"]:set}; u.lod = lo ? "lo" : "hi"; useSet(u, set);
    u.muzzle = (u.hull && u.hull.userData && u.hull.userData.muzzle) || 4.6;
    u.obj = root; u.gun0 = u.gun ? u.gun.position.x : 0; scene.add(root);
  }
  // swap a unit between its full and light model, carrying over where the turret and gun point
  function setLod(u, want){
    if (u.lod === want || !u.alive || !u.obj) return;
    let set = u.sets[want];
    if (!set){ const src = models[want === "lo" ? u.model + "_lo" : u.model]; if (!src){ getModel(u.model, want === "lo"); return; } set = makeSet(u, src); u.sets[want] = set; u.obj.add(set.obj); }
    const old = u.sets[u.lod];
    if (old.turret && set.turret){ set.turret.rotation.copy(old.turret.rotation); set.turret.position.copy(old.turret.position); }
    if (old.gun && set.gun){ set.gun.rotation.copy(old.gun.rotation); set.gun.position.copy(old.gun.position); set.gun.visible = old.gun.visible; }
    if (old.hull && set.hull) set.hull.rotation.copy(old.hull.rotation);
    old.obj.visible = false; set.obj.visible = true; u.lod = want; useSet(u, set);
  }
  let lodT = 0;
  function lodPass(dt){
    lodT -= dt; if (lodT > 0) return; lodT = 0.3;
    for (const u of units){ if (!u.alive || !u.obj || !HAS_LO.has(u.model)) continue;
      setLod(u, level === "low" || camera.position.distanceTo(u.obj.position) > Q.lod ? "lo" : "hi"); }
  }
  units.forEach(dress);
  const fxSmoke = new Particles(scene, 1400, false), fxFire = new Particles(scene, 700, true);
  fxSmoke.max = Math.round(1400*Q.fx); fxFire.max = Math.round(700*Q.fx);
  // tracers
  const TR_MAX = 64, trPos = new Float32Array(TR_MAX*6), trCol = new Float32Array(TR_MAX*6), trGeo = new THREE.BufferGeometry();
  trGeo.setAttribute("position", new THREE.BufferAttribute(trPos, 3).setUsage(THREE.DynamicDrawUsage)); trGeo.setAttribute("color", new THREE.BufferAttribute(trCol, 3).setUsage(THREE.DynamicDrawUsage));
  const tracerLines = new THREE.LineSegments(trGeo, new THREE.LineBasicMaterial({vertexColors:true, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false})); tracerLines.frustumCulled = false; scene.add(tracerLines);
  let shells = [];
  const flash = new THREE.PointLight(0xffb060, 0, 40, 2); scene.add(flash); let flashT = 0;
  // decals for fresh craters on the ground
  const scorchMat = new THREE.MeshBasicMaterial({map:softTex("smoke"), color:0x1a1410, transparent:true, opacity:0.75, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2});
  const scorchGeo = new THREE.PlaneGeometry(1, 1); scorchGeo.rotateX(-Math.PI/2);
  let scorches = [];
  function scorch(x, z, r){ const m = new THREE.Mesh(scorchGeo, scorchMat); m.position.set(x, G.height(x, z) + 0.05, z); m.scale.set(r*2.4, 1, r*2.4); m.rotation.y = Math.random()*6; scene.add(m); scorches.push(m); if (scorches.length > 80) scene.remove(scorches.shift()); }
  /* ---- effects ---- */
  function muzzle(u){
    const g = u.gun || u.turret || u.obj, p = new THREE.Vector3(u.gun ? u.muzzle + 0.3 : 4, u.gun ? 0 : 1.6, 0); g.localToWorld(p);
    const d = new THREE.Vector3(1, 0, 0).transformDirection(g.matrixWorld);
    for (let i = 0; i < 6; i++) fxFire.emit({x:p.x, y:p.y, z:p.z, vx:d.x*(8 + i*4) + (Math.random() - 0.5)*3, vy:d.y*8 + Math.random()*2, vz:d.z*(8 + i*4) + (Math.random() - 0.5)*3, life:0.12 + Math.random()*0.08, s0:2.6, s1:1.2, c:[1, 0.85, 0.5], c1:[1, 0.4, 0.1], a:1, drag:4});
    for (let i = 0; i < 10; i++) fxSmoke.emit({x:p.x, y:p.y, z:p.z, vx:d.x*(4 + Math.random()*6) + (Math.random() - 0.5)*2, vy:0.6 + Math.random(), vz:d.z*(4 + Math.random()*6) + (Math.random() - 0.5)*2, life:1.6 + Math.random()*1.4, s0:1.2, s1:5, c:[0.62, 0.6, 0.56], c1:[0.75, 0.73, 0.7], a:0.55, drag:1.4, fadeIn:0.05});
    // blast lifts dust around the tank
    for (let i = 0; i < 10; i++){ const a = Math.random()*6.28; fxSmoke.emit({x:u.obj.position.x + Math.cos(a)*2, y:u.obj.position.y + 0.4, z:u.obj.position.z + Math.sin(a)*2, vx:Math.cos(a)*5, vy:0.5, vz:Math.sin(a)*5, life:1.2 + Math.random(), s0:1.5, s1:4.5, c:[0.55, 0.47, 0.36], a:0.35, drag:2}); }
    flash.position.copy(p); flash.intensity = 60; flashT = 0.08;
    u.recoil = 1;
    return {p, d};
  }
  function explosion(x, z, big, airburst, sc = 1, ay){
    const y = ay != null ? ay : G.height(x, z) + (airburst ? 4 : 0.3);
    snd.play("boom", x, y, z, {vol:(big ? 1 : 0.55)*Math.min(1.3, sc), rate:big ? 0.85 : airburst ? 1.25 : 1.1});
    const n = Math.round((big ? 34 : 14)*sc);
    for (let i = 0; i < n; i++){ const a = Math.random()*6.28, v = (big ? 6 : 4)*Math.random(); fxFire.emit({x, y:y + Math.random()*(big ? 2 : 1), z, vx:Math.cos(a)*v, vy:(big ? 5 : 3) + Math.random()*4, vz:Math.sin(a)*v, life:0.35 + Math.random()*(big ? 0.6 : 0.3), s0:big ? 6 : 3.5, s1:big ? 3 : 1.5, c:[1, 0.85, 0.45], c1:[0.9, 0.25, 0.05], a:1, drag:2.5}); }
    // dirt thrown up, then smoke
    if (!airburst) for (let i = 0; i < Math.round((big ? 26 : 16)*sc); i++){ const a = Math.random()*6.28, v = Math.random()*(big ? 7 : 5)*sc; fxSmoke.emit({x, y, z, vx:Math.cos(a)*v, vy:((big ? 9 : 7) + Math.random()*6)*Math.sqrt(sc), vz:Math.sin(a)*v, g:-14, life:0.9 + Math.random()*0.8, s0:1.2, s1:2.4, c:[0.27, 0.21, 0.15], a:0.9, drag:0.4}); }
    for (let i = 0; i < Math.round((big ? 30 : 14)*sc); i++){ const a = Math.random()*6.28, v = Math.random()*(big ? 3 : 2); fxSmoke.emit({x:x + Math.cos(a)*1.5, y:y + Math.random()*2, z:z + Math.sin(a)*1.5, vx:Math.cos(a)*v + 0.6, vy:1 + Math.random()*2, vz:Math.sin(a)*v, life:3 + Math.random()*4, s0:3, s1:big ? 14 : 9, c:[0.22, 0.2, 0.18], c1:[0.5, 0.48, 0.45], a:0.6, drag:0.5, fadeIn:0.06}); }
    if (!airburst && sc > 0.6) scorch(x, z, (big ? 3.5 : 2)*sc);
    flash.position.set(x, y + 2, z); flash.intensity = (big ? 220 : 90)*sc; flashT = 0.12;
  }
  // where a shot leaves the vehicle: the muzzle, or the top of a launcher
  function launchPoint(u){ if (u.gun){ const p = new THREE.Vector3(u.muzzle + 0.2, 0, 0); u.gun.localToWorld(p); return p; } const p = new THREE.Vector3(0, 1.4, 0); (u.turret || u.obj).localToWorld(p); return p; }
  function launchSmoke(p, n, sz){ for (let i = 0; i < n; i++) fxSmoke.emit({x:p.x, y:p.y, z:p.z, vx:(Math.random() - 0.5)*4, vy:Math.random()*2, vz:(Math.random() - 0.5)*4, life:2.5 + Math.random()*2.5, s0:sz, s1:sz*4, c:[0.7, 0.68, 0.64], c1:[0.8, 0.79, 0.76], a:0.6, drag:1, fadeIn:0.04});
    for (let i = 0; i < Math.ceil(n/3); i++) fxFire.emit({x:p.x, y:p.y, z:p.z, vx:(Math.random() - 0.5)*3, vy:Math.random()*2, vz:(Math.random() - 0.5)*3, life:0.15 + Math.random()*0.15, s0:sz*1.6, s1:sz*0.6, c:[1, 0.85, 0.5], c1:[1, 0.4, 0.1], a:1, drag:3}); }
  // indirect fire: an arcing shell or a rocket; it lands among the target's position and brings the war's real losses with it
  function lob(u, t, kind){
    const p = launchPoint(u), spread = kind === "rocket" ? 14 : kind === "missile" ? 3 : 9, dmg = t && t.pend >= 1 ? Math.floor(t.pend) : 0; if (dmg) t.pend -= dmg;
    const tx = t ? t.x : u.x, tz = t ? t.z : u.z + (u.side ? 1 : -1)*100, ex = tx + (dmg ? 0 : (Math.random() - 0.5)*spread*2), ez = tz + (dmg ? 0 : (Math.random() - 0.5)*spread*2), ey = G.height(ex, ez) + 0.3;
    const dist = Math.hypot(ex - p.x, ez - p.z), sh = {x0:p.x, y0:p.y, z0:p.z, x1:ex, y1:ey, z1:ez, t:0, dur:kind === "missile" ? 3.2 : kind === "rocket" ? 1.6 + dist/260 : 2.2 + dist/200, arc:kind === "missile" ? 140 : dist*(kind === "rocket" ? 0.18 : 0.32), side:u.side, kind, trail:kind !== "shell",
      c:kind === "shell" ? [1, 0.75, 0.4] : [1, 0.9, 0.6], onHit:() => { if (sh.dead) return; explosion(ex, ez, kind !== "rocket", false, kind === "missile" ? 1.6 : kind === "rocket" ? 0.8 : 1); if (dmg && t){ t.inbound = (t.inbound || 0) - dmg; damage(t, dmg); } }};
    sh.dmg = dmg; if (dmg && t) t.inbound = (t.inbound || 0) + dmg;
    if (kind === "shell") snd.play("arty", p.x, p.y, p.z, {vol:0.9}); else snd.play("rocket", p.x, p.y, p.z, kind === "missile" ? {vol:1, rate:0.6} : {vol:0.5});
    shells.push(sh); return sh;
  }
  function fireAt(u, t, small){
    if (small){ // autocannon and machine guns: a burst of thin tracers, small hits
      const p = launchPoint(u); snd.play("autocannon", p.x, p.y, p.z, {vol:0.55});
      const dmg = t.pend >= 1 ? Math.floor(t.pend) : 0; if (dmg){ t.pend -= dmg; t.inbound = (t.inbound || 0) + dmg; }
      for (let i = 0; i < small; i++){ const last = i === small - 1, ex = t.x + (Math.random() - 0.5)*(dmg && last ? 1 : 10), ez = t.z + (Math.random() - 0.5)*(dmg && last ? 1 : 10);
        const sh = {x0:p.x, y0:p.y, z0:p.z, x1:ex, y1:G.height(ex, ez) + 0.8, z1:ez, t:-i*0.09, dur:Math.hypot(ex - p.x, ez - p.z)/700 + 0.05, side:u.side, kind:"bullet", c:u.side ? [1, 0.5, 0.35] : [1, 0.9, 0.55],
          onHit:() => { explosion(ex, ez, false, false, 0.25); if (last && dmg){ t.inbound -= dmg; damage(t, dmg); } }}; shells.push(sh); }
      for (let i = 0; i < 3; i++) fxFire.emit({x:p.x, y:p.y, z:p.z, vx:0, vy:0, vz:0, life:0.08, s0:1.1, s1:0.5, c:[1, 0.85, 0.5], a:1});
      return;
    }
    const {p, d} = muzzle(u); snd.play("tank", p.x, p.y, p.z, {vol:0.9});
    const tx = t.obj.position.x, tz = t.obj.position.z, dmg = t.pend >= 1 ? Math.floor(t.pend) : 0, hit = dmg > 0; t.pend -= dmg; if (hit) t.inbound = (t.inbound || 0) + dmg;
    const ex = hit ? tx + (Math.random() - 0.5)*1.5 : tx + (Math.random() - 0.5)*16, ez = hit ? tz + (Math.random() - 0.5)*1.5 : tz + (Math.random() - 0.5)*16;
    const ey = G.height(ex, ez) + (hit ? 1.4 : 0.2), dist = Math.hypot(ex - p.x, ez - p.z);
    shells.push({x0:p.x, y0:p.y, z0:p.z, x1:ex, y1:ey, z1:ez, t:0, dur:dist/900 + 0.08, c:u.side ? [1, 0.45, 0.3] : [1, 0.85, 0.5], onHit:() => { explosion(ex, ez, false); if (hit){ t.inbound -= dmg; damage(t, dmg); for (let i = 0; i < 12; i++) fxFire.emit({x:tx, y:ey, z:tz, vx:(Math.random() - 0.5)*14, vy:Math.random()*8, vz:(Math.random() - 0.5)*14, g:-12, life:0.4 + Math.random()*0.4, s0:0.6, s1:0.3, c:[1, 0.9, 0.6], a:1, drag:0.5}); } }});
  }
  // floating numbers over the squads: «−3» when the war destroys three of its machines
  const floats = [];
  function damage(t, dmg){ if (!t.alive) return; t.hp -= dmg; floats.push({u:t, text:"−" + Math.round(dmg), t:0}); if (t.hp <= 0.5) destroy(t); }
  const wrecks = [];
  function destroy(u){
    if (!u.alive) return; u.alive = false; u.pend = 0; wrecks.push(u);
    // only the last wrecks stay on the field so the scene stays light
    while (wrecks.length > 10){ const w = wrecks.shift(); if (w.obj){ scene.remove(w.obj); w.obj = null; } }
    explosion(u.obj.position.x, u.obj.position.z, true);
    u.obj.traverse(o => { if (o.isMesh && o.material && o.material.color){ o.material = o.material.clone(); o.material.color.multiplyScalar(0.18); if (o.material.emissive) o.material.emissiveIntensity = 0; } });
    if (u.turret && Math.random() < 0.55){ u.pop = {vy:9 + Math.random()*5, vx:(Math.random() - 0.5)*4, vz:(Math.random() - 0.5)*4, spin:(Math.random() - 0.5)*6}; }
    u.burn = 40 + Math.random()*40;
  }
  // a new squad drives in from our (or their) edge of the map to the front
  async function reinforce(side, id, hp){
    const model = (ctx.modelOf && ctx.modelOf[id]) || "t72"; if (!models[model]){ try { models[model] = await loadModel(model); } catch(e){ return; } }
    const role = (ctx.roleOf && ctx.roleOf[id]) || "front", d = DEPTH[role] || DEPTH.front;
    const s = side ? -1 : 1, x = (Math.random() - 0.5)*FIELD*0.7, z = s*(FIELD/2 - 6), hz = s*(d[0] + Math.random()*(d[1] - d[0]));
    const u = {id, model, side, role, x, z, h:side ? -Math.PI/2 : Math.PI/2, home:[x, hz], hp, hpMax:hp, pend:0, alive:true, reload:4, state:"move", wp:[x, hz], next:20};
    if (role !== "front"){ u.x = x; u.z = hz - s*40; }
    units.push(u); dress(u); floats.push({u, text:"подкрепление", t:0});
  }
  /* ---- camera: pan with one finger, pinch to zoom, twist to rotate ---- */
  const cam = {x:0, z:4, dist:135, yaw:0, pitch:0.92};
  function placeCamera(){
    cam.dist = clamp(cam.dist, 35, 230); const m = clamp(FIELD/2 - cam.dist*0.45, 10, FIELD/2 - 10); cam.x = clamp(cam.x, -m, m); cam.z = clamp(cam.z, -m, m);
    const ty = G.height(cam.x, cam.z), h = Math.sin(cam.pitch)*cam.dist, r = Math.cos(cam.pitch)*cam.dist;
    camera.position.set(cam.x + Math.sin(cam.yaw)*r, ty + h, cam.z + Math.cos(cam.yaw)*r); camera.lookAt(cam.x, ty, cam.z);
    sun.position.set(cam.x - 70, ty + 140, cam.z + 40); sun.target.position.set(cam.x, ty, cam.z);
    const s = clamp(cam.dist*0.75, 50, 150); Object.assign(sun.shadow.camera, {left:-s, right:s, top:s, bottom:-s}); sun.shadow.camera.updateProjectionMatrix();
  }
  const cv = renderer.domElement, pts = new Map(); let pinch = null;
  cv.style.touchAction = "none";
  cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, {x:e.clientX, y:e.clientY, b:e.button}); if (pts.size === 2){ const [a, b] = [...pts.values()]; pinch = {d:Math.hypot(a.x - b.x, a.y - b.y), ang:Math.atan2(b.y - a.y, b.x - a.x), dist:cam.dist, yaw:cam.yaw, pitch:cam.pitch, my:(a.y + b.y)/2}; } });
  cv.addEventListener("pointermove", e => { const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 1){
      if (p.b === 2 || e.shiftKey){ cam.yaw -= dx*0.006; cam.pitch = clamp(cam.pitch + dy*0.004, 0.6, 1.4); }
      else { const k = cam.dist/el.clientHeight*1.1, c = Math.cos(cam.yaw), s = Math.sin(cam.yaw); cam.x -= (dx*c + dy*s)*k; cam.z -= (-dx*s + dy*c)*k; }
    } else if (pts.size === 2 && pinch){ const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      cam.dist = pinch.dist*pinch.d/Math.max(20, d); cam.yaw = pinch.yaw - angDiff(pinch.ang, ang); cam.pitch = clamp(pinch.pitch + ((a.y + b.y)/2 - pinch.my)*0.004, 0.6, 1.4); }
    placeCamera(); });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("contextmenu", e => e.preventDefault());
  cv.addEventListener("wheel", e => { e.preventDefault(); cam.dist *= Math.exp(e.deltaY*0.0012); placeCamera(); }, {passive:false});
  const hud = document.createElement("canvas"); hud.className = "bf3d-hud"; el.appendChild(hud); const hg = hud.getContext("2d");
  let selected = null, selT = 0, downAt = null;
  cv.addEventListener("pointerdown", e => { downAt = {x:e.clientX, y:e.clientY, t:performance.now()}; });
  cv.addEventListener("pointerup", e => { if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8 || performance.now() - downAt.t > 400) return;
    const r = cv.getBoundingClientRect(); let best = null, bd = 44; for (const u of [...units, ...air]){ if (!u.alive || !u.obj) continue; const q = screenOf(u, 1.5); const d = Math.hypot(q.x - (e.clientX - r.left), q.y - (e.clientY - r.top)); if (d < bd){ bd = d; best = u; } }
    selected = best; selT = 4; });
  const v3 = new THREE.Vector3();
  function screenOf(u, up){ v3.set(u.x, (u.air ? u.y : G.height(u.x, u.z)) + up, u.z).project(camera); return {x:(v3.x + 1)/2*el.clientWidth, y:(1 - v3.y)/2*el.clientHeight, vis:v3.z < 1}; }
  function drawHud(dt){
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = el.clientWidth, H = el.clientHeight;
    if (hud.width !== Math.round(W*dpr)){ hud.width = Math.round(W*dpr); hud.height = Math.round(H*dpr); }
    hg.setTransform(dpr, 0, 0, dpr, 0, 0); hg.clearRect(0, 0, W, H);
    const close = cam.dist < 80; selT -= dt; if (selT <= 0) selected = null;
    hg.font = "600 11px system-ui, sans-serif"; hg.textAlign = "center";
    for (const u of [...units, ...air]){ if (!u.alive || !u.obj || u.temp || (u.air && u.state === "fall")) continue; const q = screenOf(u, u.air ? 3.2 : 4.2); if (!q.vis) continue;
      const w = 26, k = clamp(u.hp/u.hpMax, 0, 1);
      hg.fillStyle = "rgba(0,0,0,.55)"; hg.fillRect(q.x - w/2 - 1, q.y - 1, w + 2, 5);
      hg.fillStyle = u.side ? "#ff5a4f" : "#4f8cff"; hg.fillRect(q.x - w/2, q.y, w*k, 3);
      if (close || u === selected){ const t = `${ctx.names[u.id] || u.id} ×${Math.max(1, Math.round(u.hp))}`; hg.lineWidth = 3; hg.strokeStyle = "rgba(0,0,0,.7)"; hg.strokeText(t, q.x, q.y - 4); hg.fillStyle = "#fff"; hg.fillText(t, q.x, q.y - 4); } }
    for (let i = floats.length - 1; i >= 0; i--){ const f = floats[i]; f.t += dt; if (f.t > 1.6 || !f.u.obj){ floats.splice(i, 1); continue; }
      const q = screenOf(f.u, 5 + f.t*3); hg.globalAlpha = 1 - f.t/1.6; hg.font = "700 14px system-ui, sans-serif"; hg.lineWidth = 3; hg.strokeStyle = "rgba(0,0,0,.75)"; hg.strokeText(f.text, q.x, q.y - 10); hg.fillStyle = f.u.side ? "#ffd2c8" : "#ffd27a"; hg.fillText(f.text, q.x, q.y - 10); hg.globalAlpha = 1; }
  }
  function resize(){ const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(el); resize(); placeCamera();
  /* ---- the battle itself ---- */
  let last = performance.now(), running = true, artT = 3;
  /* ---- aviation: planes make passes over the field, helicopters hover behind their lines and fire ATGMs,
     drones circle over the enemy and drop bombs, loitering munitions dive on a target.
     Nothing on the field decides a kill: the war's real losses arrive as pend, and the air defence (or a MANPADS
     from the front line) brings that aircraft down. ---- */
  const air = [];
  const roleOf = id => (ctx.roleOf && ctx.roleOf[id]) || "front";
  const isAir = id => AIR_ROLES.has(roleOf(id));
  const airCap = () => level === "low" ? {plane:2, heli:2, drone:2} : {plane:4, heli:3, drone:4};
  // heights stay under the default camera (~105 m up) so passes read as low and fast
  const SPEC = {plane:{v:34, alt:[30, 40], turn:0.95}, heli:{v:13, alt:[12, 18], turn:0.8}, drone:{v:17, alt:[44, 54], turn:0.6}, loiter:{v:30, alt:[28, 36], turn:1.5}};
  const bombGeo = new THREE.CapsuleGeometry(0.22, 0.9, 2, 6), bombMat = new THREE.MeshStandardMaterial({color:0x3a3d38, roughness:0.6, metalness:0.3});
  bombGeo.rotateZ(Math.PI/2);
  function airAdd(side, id, hp, wait){
    const role = roleOf(id), loiter = ctx.kindOf[id] === "loiter";
    const a = {id, model:(ctx.modelOf && ctx.modelOf[id]) || "su25", side, cls:role, loiter, air:true, hp, hpMax:hp, pend:0, alive:true, obj:null,
      state:"wait", t:wait != null ? wait : 2 + Math.random()*4, x:0, y:0, z:0, h:0, pitch:0, roll:0, reload:3 + Math.random()*4, next:0, pendT:0};
    a.spec = loiter ? SPEC.loiter : SPEC[role];
    air.push(a); getModel(a.model, level === "low"); return a;
  }
  airInit.forEach((u, k) => airAdd(u.side, u.id, u.hp || 1, u.role === "plane" ? 2 + Math.random()*9 : u.role === "heli" ? 0.5 + k*0.7 : 1 + Math.random()*5));
  const own = a => a.side ? -1 : 1;                                   // the sign of z on our half of the field
  const groundY = (x, z) => G.height(clamp(x, -FIELD*1.2, FIELD*1.2), clamp(z, -FIELD*1.2, FIELD*1.2));
  function pickGround(a, front){
    let es = units.filter(v => v.alive && v.obj && v.side !== a.side); if (front){ const f = es.filter(v => v.role === "front"); if (f.length) es = f; }
    if (!es.length) return null; const p = es.filter(v => v.pendAir >= 1), q = p.length ? p : es.filter(v => v.pend >= 1), L = q.length ? q : es; return L[Math.floor(Math.random()*L.length)];
  }
  // the war's losses this strike brings with it (same bookkeeping as artillery: pend -> inbound -> damage)
  // losses an ordered strike caused (pendAir) are kept for the aircraft; the rest of the war's losses (pend) too
  function payload(t){ if (!t) return 0; let d = 0; if (t.pendAir >= 1){ d = Math.floor(t.pendAir); t.pendAir -= d; } else if (t.pend >= 1){ d = Math.floor(t.pend); t.pend -= d; } if (d) t.inbound = (t.inbound || 0) + d; return d; }
  function land(t, d){ if (d && t){ t.inbound -= d; damage(t, d); } }
  function spawn(a){
    const lo = level === "low" && HAS_LO.has(a.model), src = models[lo ? a.model + "_lo" : a.model] || models[a.model] || models[a.model + "_lo"];
    if (!src){ getModel(a.model, lo); return false; }
    const set = makeSet(a, src), root = new THREE.Group(); root.add(set.obj); root.rotation.order = "YZX";
    a.rotors = []; a.hull = null; set.obj.traverse(o => { if (/_rotor\d*$/.test(o.name)) a.rotors.push(o); if (/_hull$/.test(o.name)) a.hull = o; });
    a.axes = String((a.hull && a.hull.userData && a.hull.userData.rotors) || "").split(",");
    if (a.loiter) root.scale.setScalar(0.26);
    a.obj = root; scene.add(root); a.chased = false; a.pendT = 0;
    const s = own(a), sp = a.spec, R = Math.random;
    a.alt = sp.alt[0] + R()*(sp.alt[1] - sp.alt[0]); a.v = sp.v; a.pitch = 0; a.roll = 0; a.h = a.side ? -Math.PI/2 : Math.PI/2;
    if (a.cls === "plane"){ a.target = pickGround(a, false); const tx = a.target ? a.target.x : (R() - 0.5)*140;
      a.x = clamp(tx + (R() - 0.5)*80, -FIELD/2, FIELD/2); a.z = s*(FIELD/2 + 70); a.state = "in"; a.kind = a.raid > 0 || a.temp ? "bombs" : R() < 0.5 ? "rockets" : "bombs"; }
    else if (a.cls === "heli"){ const mine = air.filter(b => b !== a && b.side === a.side && b.cls === "heli" && b.hx != null).map(b => b.hx);
      let hx = 0, best = -1; for (let i = 0; i < 8; i++){ const x = (R() - 0.5)*FIELD*0.7, d = Math.min(99, ...mine.map(m => Math.abs(m - x))); if (d > best){ best = d; hx = x; } }
      a.hx = hx; a.hz = s*(tz + 30 + R()*14); a.x = hx + (R() - 0.5)*30; a.z = s*(FIELD/2 + 30); a.state = a.shots > 0 ? "strike" : "in"; if (a.sx == null) a.sx = hx; }
    else if (a.loiter){ a.target = pickGround(a, false); a.x = (R() - 0.5)*FIELD*0.6; a.z = s*(FIELD/2 + 30); a.state = "in"; }
    else { a.cx = (R() - 0.5)*FIELD*0.5; a.cz = -s*(40 + R()*25); a.r = 38 + R()*14; a.dir = R() < 0.5 ? 1 : -1; a.ang = 0;
      a.x = a.cx + (R() - 0.5)*40; a.z = s*(FIELD/2 + 40); a.state = "in"; a.reload = 6 + R()*6; }
    a.y = groundY(a.x, a.z) + a.alt; place(a); return true;
  }
  function despawn(a){ if (a.obj){ scene.remove(a.obj); a.obj = null; } a.state = "wait"; a.chased = false; }
  // a sortie is over: an ordered raid sends the aircraft again soon; a temporary one (a strike with no squad on the field) is gone
  function rest(a, wait){ despawn(a); if (a.raid > 0){ a.raid--; a.t = 1.5 + Math.random()*2; return; } if (a.temp){ a.alive = false; return; } a.t = wait; }
  function tempAir(side, cls, model, loiter, wait){
    const a = {id:"_strike", model, side, cls, loiter, air:true, temp:true, hp:1, hpMax:1, pend:0, alive:true, obj:null, state:"wait", t:wait, x:0, y:0, z:0, h:0, pitch:0, roll:0, reload:0, next:0, pendT:0};
    a.spec = loiter ? SPEC.loiter : SPEC[cls]; air.push(a); getModel(model, level === "low"); return a;
  }
  function place(a){ a.obj.position.set(a.x, a.y, a.z); a.obj.rotation.set(a.roll, a.h, a.pitch); }
  // steer towards a point: limited turn rate, banking into the turn, climbing or diving towards wy
  function fly(a, wx, wy, wz, dt, v){
    const want = Math.atan2(-(wz - a.z), wx - a.x), d = angDiff(a.h, want), rate = clamp(d*2, -a.spec.turn, a.spec.turn);
    a.h += rate*dt; a.roll = lerp(a.roll, -rate*(a.cls === "heli" ? 0.25 : 0.85), Math.min(1, dt*3));
    const vy = clamp((wy - a.y)*0.9, -v*0.45, v*0.35); a.y += vy*dt;
    a.pitch = lerp(a.pitch, a.cls === "heli" ? -0.12*v/a.spec.v : Math.atan2(vy, v), Math.min(1, dt*3));
    a.x += Math.cos(a.h)*v*dt; a.z -= Math.sin(a.h)*v*dt;
    return Math.hypot(wx - a.x, wz - a.z);
  }
  function onField(a, m = 30){ return a.obj && Math.abs(a.x) < FIELD/2 + m && Math.abs(a.z) < FIELD/2 + m; }
  // weapons
  function rockets(a, t){
    const d = payload(t), tx = t ? t.x : a.x + Math.cos(a.h)*60, tz = t ? t.z : a.z - Math.sin(a.h)*60; snd.play("rocket", a.x, a.y, a.z, {vol:0.7});
    for (let i = 0; i < 8; i++){ const last = i === 7, ex = tx + (last && d ? 0 : (Math.random() - 0.5)*16), ez = tz + (last && d ? 0 : (Math.random() - 0.5)*16);
      const p = new THREE.Vector3(0.4, -1.2, (i % 2 ? 1 : -1)*2.5); a.obj.localToWorld(p);
      shells.push({x0:p.x, y0:p.y, z0:p.z, x1:ex, y1:G.height(ex, ez) + 0.3, z1:ez, t:-i*0.09, dur:Math.hypot(ex - p.x, ez - p.z, p.y)/170 + 0.1, side:a.side, kind:"arocket", trail:true, c:[1, 0.85, 0.55],
        onHit:() => { explosion(ex, ez, false, false, 0.7); if (last) land(t, d); }}); }
  }
  function bombs(a, t, n, fallT){
    const d = payload(t), tx = t ? t.x : a.x + Math.cos(a.h)*40, tz = t ? t.z : a.z - Math.sin(a.h)*40;
    for (let i = 0; i < n; i++){ const last = i === n - 1, along = (i - (n - 1)/2)*7, ex = tx + Math.cos(a.h)*along + (last && d ? 0 : (Math.random() - 0.5)*5), ez = tz - Math.sin(a.h)*along + (last && d ? 0 : (Math.random() - 0.5)*5);
      const p = new THREE.Vector3(0, -1.4, (i % 2 ? 1 : -1)*1.6); a.obj.localToWorld(p); const m = new THREE.Mesh(bombGeo, bombMat); m.rotation.y = a.h;
      shells.push({x0:p.x, y0:p.y, z0:p.z, x1:ex, y1:G.height(ex, ez) + 0.3, z1:ez, t:-i*0.12, dur:fallT, fall:-p.y*0.25, side:a.side, kind:"bomb", mesh:m, c:[0, 0, 0],
        onHit:() => { explosion(ex, ez, true, false, 1.1); if (last) land(t, d); }}); }
  }
  function atgm(a, t){
    const d = payload(t), p = new THREE.Vector3(1.5, -0.9, (Math.random() < 0.5 ? 1 : -1)*2.6); a.obj.localToWorld(p);
    const ex = t.x + (d ? 0 : (Math.random() - 0.5)*10), ez = t.z + (d ? 0 : (Math.random() - 0.5)*10), ey = G.height(ex, ez) + (d ? 1.4 : 0.3);
    launchSmoke(p, 6, 0.7); snd.play("rocket", p.x, p.y, p.z, {vol:0.45, rate:1.3});
    shells.push({x0:p.x, y0:p.y, z0:p.z, x1:ex, y1:ey, z1:ez, t:0, dur:Math.hypot(ex - p.x, ez - p.z, ey - p.y)/140 + 0.2, arc:2, side:a.side, kind:"atgm", trail:true, c:[1, 0.8, 0.5],
      onHit:() => { explosion(ex, ez, d > 0, false, 0.9); land(t, d); }});
  }
  // the air defence: a homing missile; a miss ends in a burst near the aircraft, which throws flares
  const homers = [];
  function airTarget(u){
    const cand = air.filter(a => a.alive && a.side !== u.side && a.state !== "fall" && a.state !== "wait" && onField(a, 10) && !a.chased);
    const real = cand.filter(a => a.pend >= 1); if (real.length) return real[Math.floor(Math.random()*real.length)];
    return cand.length && Math.random() < 0.05 ? cand[Math.floor(Math.random()*cand.length)] : null;
  }
  function launchSAM(p, a, miss){ a.chased = true; snd.play("sam", p.x, p.y, p.z, {vol:0.8}); homers.push({x:p.x, y:p.y, z:p.z, vx:0, vy:25, vz:0, a, miss, t:0}); launchSmoke(p, 10, 1); flash.position.copy(p); flash.intensity = 80; flashT = 0.08; }
  function flares(a){ for (let i = 0; i < 10; i++) fxFire.emit({x:a.x, y:a.y - 1, z:a.z, vx:(Math.random() - 0.5)*14, vy:-2 - Math.random()*4, vz:(Math.random() - 0.5)*14, g:-6, life:1.2 + Math.random()*0.8, s0:2.2, s1:0.8, c:[1, 0.95, 0.75], c1:[1, 0.5, 0.15], a:1, drag:1.2}); }
  function homersStep(dt){
    for (let i = homers.length - 1; i >= 0; i--){ const m = homers[i], a = m.a; m.t += dt;
      const gone = !a.alive || !a.obj || a.state === "fall" || a.state === "wait";
      if (gone || m.t > 7 || m.y < groundY(m.x, m.z)){ explosion(m.x, m.z, false, true, 0.5, m.y); homers.splice(i, 1); if (a.chased && !gone) a.chased = false; continue; }
      const dx = a.x - m.x, dy = a.y - m.y, dz = a.z - m.z, d = Math.hypot(dx, dy, dz), sp = Math.min(115, 25 + m.t*140), k = Math.min(1, dt*(m.miss ? 2.5 : 6));
      m.vx = lerp(m.vx, dx/d*sp, k); m.vy = lerp(m.vy, dy/d*sp, k); m.vz = lerp(m.vz, dz/d*sp, k);
      m.x += m.vx*dt; m.y += m.vy*dt; m.z += m.vz*dt;
      if (Math.random() < dt*60) fxSmoke.emit({x:m.x, y:m.y, z:m.z, vx:0, vy:0.3, vz:0, life:2.2, s0:1, s1:4, c:[0.86, 0.85, 0.83], a:0.55, drag:1});
      fxFire.emit({x:m.x, y:m.y, z:m.z, vx:0, vy:0, vz:0, life:0.06, s0:1.6, s1:0.6, c:[1, 0.85, 0.5], a:1});
      if (m.miss && d < 14 && !m.fl){ m.fl = true; flares(a); }
      if (d < (m.miss ? 7 : 2.5)){ homers.splice(i, 1); a.chased = false;
        if (m.miss){ explosion(m.x, m.z, false, true, 0.6, m.y); }
        else { const dmg = Math.max(1, Math.floor(a.pend)); a.pend = Math.max(0, a.pend - dmg); explosion(a.x, a.z, false, true, a.loiter ? 0.5 : 1, a.y); shootDown(a, dmg); } }
    }
  }
  function shootDown(a, dmg){
    a.hp -= dmg; floats.push({u:a, text:"−" + Math.round(dmg), t:0});
    if (a.loiter){ despawn(a); a.t = 5 + Math.random()*8; if (a.hp <= 0.5 || a.temp) a.alive = false; return; }
    a.state = "fall"; a.vy = a.cls === "plane" ? 2 : 0; a.spin = (Math.random() < 0.5 ? -1 : 1)*(a.cls === "heli" ? 3 : 1.6);
  }
  // our machines that the war lost while no air defence of the enemy is on this field: a MANPADS from the front line
  function manpads(a, dt){
    if (!(a.pend >= 1) || a.chased || !onField(a, 0) || a.state === "fall") { a.pendT = 0; return; }
    a.pendT += dt; if (a.pendT < 3) return;
    const ad = units.some(u => u.alive && u.obj && u.side !== a.side && u.role === "ad" && ctx.kindOf[u.id] !== "ew");
    if (ad && a.pendT < 9) return;
    const sh = units.filter(u => u.alive && u.obj && u.side !== a.side), from = sh.length ? sh[Math.floor(Math.random()*sh.length)] : null;
    const p = from ? new THREE.Vector3(from.x + (Math.random() - 0.5)*6, G.height(from.x, from.z) + 2, from.z + (Math.random() - 0.5)*6) : new THREE.Vector3(a.x + (Math.random() - 0.5)*60, 0, -own(a)*(tz + 10));
    if (!from) p.y = G.height(p.x, p.z) + 1;
    launchSAM(p, a, false); a.pendT = 0;
  }
  function airThink(a, dt){
    const R = Math.random, s = own(a), gy = groundY(a.x, a.z);
    a.reload -= dt; a.next -= dt;
    if (a.state === "fall"){
      a.vy -= 9.8*dt; a.y += a.vy*dt; a.h += a.spin*dt*(a.cls === "heli" ? 1 : 0.3); a.roll += a.spin*dt*(a.cls === "heli" ? 0.2 : 1.2);
      a.pitch = a.cls === "plane" ? Math.max(-0.9, a.pitch - dt*0.5) : lerp(a.pitch, -0.3, dt);
      const v = a.cls === "plane" ? a.v : a.cls === "heli" ? 3 : a.v*0.7; a.x += Math.cos(a.h)*v*dt; a.z -= Math.sin(a.h)*v*dt;
      if (R() < dt*40) fxFire.emit({x:a.x, y:a.y, z:a.z, vx:(R() - 0.5)*2, vy:1, vz:(R() - 0.5)*2, life:0.4, s0:3, s1:1, c:[1, 0.75, 0.3], c1:[0.9, 0.2, 0.04], a:0.9, drag:1});
      if (R() < dt*30) fxSmoke.emit({x:a.x, y:a.y, z:a.z, vx:0, vy:0.5, vz:0, life:5 + R()*3, s0:2.5, s1:10, c:[0.1, 0.09, 0.08], c1:[0.35, 0.34, 0.33], a:0.7, drag:0.3, fadeIn:0.05});
      if (a.y <= gy + 0.5){ explosion(a.x, a.z, !a.loiter, false, a.loiter ? 0.35 : a.cls === "drone" ? 0.9 : 1.5); despawn(a); if (a.hp <= 0.5 || a.temp) a.alive = false; else a.t = 18 + R()*14; }
      else place(a);
      return;
    }
    if (a.state === "wait"){ a.t -= dt; if (a.t <= 0 && !spawn(a)) a.t = 1; return; }
    manpads(a, dt);
    const sp = a.spec;
    if (a.cls === "plane"){
      if (a.state === "in"){
        if (a.target && !a.target.alive) a.target = pickGround(a, false);
        const t = a.target, tx = t ? t.x : a.x, tzz = t ? t.z : -s*40, dd = Math.hypot(tx - a.x, tzz - a.z);
        fly(a, tx, groundY(tx, tzz) + (dd < 150 ? lerp(17, a.alt, dd/150) : a.alt), tzz, dt, a.v);
        const ahead = Math.cos(a.h)*(tx - a.x) - Math.sin(a.h)*(tzz - a.z);
        if ((dd < 60 && ahead > 15) || ahead < 0){ if (a.kind === "rockets") rockets(a, t); else bombs(a, t, 4, 1.7); a.state = "out"; a.wp = [clamp(a.x + (R() - 0.5)*120, -FIELD/2, FIELD/2), s*(FIELD/2 + 140)]; }
      } else {
        fly(a, a.wp[0], gy + a.alt + 8, a.wp[1], dt, a.v*1.1);
        if (a.z*s > FIELD/2 + 110) rest(a, 7 + R()*12);
      }
    } else if (a.cls === "heli"){
      if (a.state === "strike"){
        if (!a.target || !a.target.alive) a.target = pickGround(a, true);
        const t = a.target, d = Math.hypot(a.sx - a.x, a.sz - a.z);
        if (d > 6) fly(a, a.sx, groundY(a.sx, a.sz) + a.alt*0.8, a.sz, dt, a.v*1.5);
        else { const want = t ? Math.atan2(-(t.z - a.z), t.x - a.x) : (a.side ? -Math.PI/2 : Math.PI/2), df = angDiff(a.h, want);
          a.h += clamp(df, -0.9*dt, 0.9*dt); a.roll = lerp(a.roll, 0, dt*3); a.pitch = lerp(a.pitch, -0.08, dt*3);
          if (t && Math.abs(df) < 0.2 && a.reload < 0 && a.shots > 0){ atgm(a, t); a.shots--; a.reload = 0.8; a.leaveT = 1.5; }
          if (a.shots <= 0 && (a.leaveT -= dt) < 0) a.state = a.temp ? "leave" : "in"; }
      } else if (a.state === "leave"){ fly(a, a.x, gy + a.alt, s*(FIELD/2 + 80), dt, a.v*1.4); if (a.z*s > FIELD/2 + 50) rest(a, 0); }
      else if (a.state === "in"){ const d = fly(a, a.hx, groundY(a.hx, a.hz) + a.alt, a.hz, dt, a.v); if (d < 6) a.state = "hover"; }
      else {
        if (!a.target || !a.target.alive || R() < dt*0.08) a.target = pickGround(a, true);
        const t = a.target, want = t ? Math.atan2(-(t.z - a.z), t.x - a.x) : (a.side ? Math.PI/2 : -Math.PI/2)*-1, d = angDiff(a.h, want);
        a.h += clamp(d, -0.6*dt, 0.6*dt); a.x = lerp(a.x, a.hx, dt*0.5); a.z = lerp(a.z, a.hz, dt*0.5);
        a.bob = (a.bob || R()*6) + dt; a.y = lerp(a.y, groundY(a.hx, a.hz) + a.alt + Math.sin(a.bob*0.9)*0.7, dt); a.roll = lerp(a.roll, Math.sin(a.bob*0.6)*0.04, dt*2); a.pitch = lerp(a.pitch, -0.05, dt*2);
        if (t && Math.abs(d) < 0.15 && a.reload < 0){ atgm(a, t); a.reload = (a.side ? ctx.rofThem : ctx.rofUs)*1.5*(0.7 + R()*0.6); }
        if (a.next < 0){ a.next = 12 + R()*14; a.hx = clamp(a.hx + (R() - 0.5)*30, -FIELD*0.4, FIELD*0.4); a.hz = s*(tz + 30 + R()*14); }
      }
    } else if (a.loiter){
      if (a.target && !a.target.alive) a.target = pickGround(a, false);
      const t = a.target, tx = t ? t.x : a.x, tzz = t ? t.z : -s*40, ty = G.height(tx, tzz) + 1;
      if (a.jam && a.state === "in" && a.z*s < -5){ a.state = "fall"; a.vy = 1; a.spin = (R() < 0.5 ? -1 : 1)*5; if (a.obj) place(a); return; }
      if (a.state === "in"){ const d = fly(a, tx, groundY(tx, tzz) + a.alt, tzz, dt, a.v); if (d < a.alt*0.9) { a.state = "dive"; a.dmg = payload(t); } }
      else { const dx = tx - a.x, dy = ty - a.y, dz = tzz - a.z, d = Math.hypot(dx, dy, dz), v = 48;
        a.h = Math.atan2(-dz, dx); a.pitch = Math.atan2(dy, Math.hypot(dx, dz)); a.roll = 0;
        a.x += dx/d*v*dt; a.y += dy/d*v*dt; a.z += dz/d*v*dt;
        if (d < 2.5 || a.y < ty){ explosion(tx, tzz, false, false, 0.9); land(t, a.dmg); a.dmg = 0; rest(a, 4 + R()*9); return; } }
    } else {
      if (a.state === "in"){ const d = fly(a, a.cx + a.r, groundY(a.cx, a.cz) + a.alt, a.cz, dt, a.v); if (d < a.r*0.6){ a.state = "orbit"; a.ang = 0; } }
      else { a.ang += a.dir*a.v/a.r*dt; const px = a.cx + Math.cos(a.ang + a.dir*0.5)*a.r, pz = a.cz + Math.sin(a.ang + a.dir*0.5)*a.r;
        fly(a, px, groundY(a.cx, a.cz) + a.alt, pz, dt, a.v);
        if (a.reload < 0){ const t = pickGround(a, false); if (t && Math.hypot(t.x - a.x, t.z - a.z) < 120){ bombs(a, t, 1, 2.6); } a.reload = (a.side ? ctx.rofThem : ctx.rofUs)*2.6*(0.8 + R()*0.5); } }
    }
    if (a.obj) place(a);
  }
  function airStep(dt){
    for (let i = air.length - 1; i >= 0; i--) if (!air[i].alive && !air[i].obj) air.splice(i, 1);
    for (const u of units) if (u.pendAir > 0){ u.pendAirT = (u.pendAirT || 0) + dt; if (u.pendAirT > 25){ u.pend += u.pendAir; u.pendAir = 0; u.pendAirT = 0; } }
    for (const a of air){ airThink(a, dt);
      if (a.obj && a.rotors) a.rotors.forEach((r, i) => { const ax = a.axes[i] || "y"; r.rotation[ax] += dt*(ax === "x" ? 42 : 21)*(i % 2 ? -1 : 1); }); }
    homersStep(dt);
  }
  // what the war has in the air over this direction: new squads come from the rear, existing ones take the rest as their strength
  // a strike ordered from the game: our planes make a bombing raid, helicopters move up for an ATGM salvo, a drone swarm flies in
  function raid(type, o = {}){
    const R = Math.random, mine = cls => air.filter(a => a.alive && !a.temp && a.side === 0 && a.cls === cls && a.state !== "fall");
    if (type === "air"){
      let ps = mine("plane"); if (!ps.length) ps = [0, 1].map(k => tempAir(0, "plane", "su25", false, 0.4 + k*1.1));
      ps.forEach((a, k) => { a.raid = 1; if (a.state === "wait") a.t = Math.min(a.t, 0.3 + k*0.9); });
    } else if (type === "heli"){
      let hs = mine("heli"); if (!hs.length) hs = [0, 1].map(k => tempAir(0, "heli", "ka52", false, 0.2 + k*0.7));
      hs.forEach(a => { a.shots = 3; a.sx = clamp(a.hx != null ? a.hx : (R() - 0.5)*120, -FIELD*0.4, FIELD*0.4); a.sz = tz + 2; if (a.state === "hover" || a.state === "in") a.state = "strike"; });
    } else if (type === "drones"){
      const k = clamp(Math.round((o.n || 30)/3), 6, 12), nj = Math.round(k*(o.jam || 0)), sq = air.find(a => a.side === 0 && a.loiter && !a.temp);
      for (let i = 0; i < k; i++){ const a = tempAir(0, "drone", sq ? sq.model : "tb2", true, 0.2 + i*0.3); a.jam = i < nj; }
    }
  }
  function airSync(side, have){
    const cap = airCap();
    for (const [id, n] of Object.entries(have)){
      const role = roleOf(id), mine = air.filter(a => a.alive && a.side === side && a.id === id), held = mine.reduce((s, a) => s + a.hp - a.pend, 0), diff = n - held;
      const slots = air.filter(a => a.alive && !a.temp && a.side === side && a.cls === role).length < cap[role];
      if (diff >= 1 && slots && (!mine.length || diff > held/mine.length*0.5)) airAdd(side, id, diff, 2 + Math.random()*6);
      else if (diff > 0.5 && mine.length) mine.forEach(a => { a.hp += diff/mine.length; a.hpMax = Math.max(a.hpMax, a.hp); });
      else if (diff < -0.5 && mine.length) mine[0].pend += -diff;
    }
  }

  const enemiesOf = u => units.filter(v => v.alive && v.side !== u.side && v.obj);
  function think(u, dt){
    if (!u.alive || !u.obj) return;
    u.next -= dt; u.reload -= dt;
    if (u.role === "arty" || u.role === "ad") return supportThink(u, dt);
    if (u.state === "move"){
      const dx = u.wp[0] - u.x, dz = u.wp[1] - u.z, d = Math.hypot(dx, dz), want = Math.atan2(-dz, dx);
      const turn = angDiff(u.h, want); u.h += clamp(turn, -0.7*dt, 0.7*dt);
      if (Math.abs(turn) < 0.5){ const v = Math.min(d, 5*dt); u.x += Math.cos(u.h)*v; u.z -= Math.sin(u.h)*v;
        if (Math.random() < dt*8) fxSmoke.emit({x:u.x - Math.cos(u.h)*3.5 + (Math.random() - 0.5)*2, y:G.height(u.x, u.z) + 0.3, z:u.z + Math.sin(u.h)*3.5 + (Math.random() - 0.5)*2, vx:(Math.random() - 0.5), vy:0.6, vz:(Math.random() - 0.5), life:2 + Math.random(), s0:1.4, s1:5, c:ctx.terrain === "d" ? [0.72, 0.6, 0.42] : [0.52, 0.45, 0.34], a:0.35, drag:0.8, fadeIn:0.1}); }
      if (d < 1.5){ u.state = "hold"; u.next = 10 + Math.random()*16; }
    } else if (u.next < 0){
      // a short bound to a new firing position
      const s = u.side ? -1 : 1; u.wp = [clamp(u.home[0] + (Math.random() - 0.5)*30, -FIELD/2 + 8, FIELD/2 - 8), u.home[1] + s*(Math.random() - 0.5)*14]; u.state = "move";
    }
    // target and turret
    if (!u.target || !u.target.alive || Math.random() < dt*0.05 || (!(u.target.pend >= 1) && Math.random() < dt*0.6)){ let best = null, bd = 1e9; for (const v of enemiesOf(u)){ const d = Math.hypot(v.x - u.x, v.z - u.z) - (v.pend >= 1 ? 400 : 0); if (d < bd){ bd = d; best = v; } } u.target = best; }
    if (u.turret){
      const want = u.target ? Math.atan2(-(u.target.z - u.z), u.target.x - u.x) - u.h : 0;
      const cur = u.turret.rotation.y, diff = angDiff(cur, want); u.turret.rotation.y = cur + clamp(diff, -0.9*dt, 0.9*dt);
      if (u.gun){ const el2 = u.target ? clamp(Math.hypot(u.target.x - u.x, u.target.z - u.z)/2200, 0.005, 0.06) : 0; u.gun.rotation.z = lerp(u.gun.rotation.z, el2, dt*2); }
      if (u.target && Math.abs(diff) < 0.035 && u.reload < 0){ const k = ctx.kindOf[u.id]; fireAt(u, u.target, k === "ifv" ? 4 : k === "apc" ? 7 : 0); u.reload = (u.side ? ctx.rofThem : ctx.rofUs)*(k === "apc" ? 0.5 : k === "ifv" ? 0.6 : 1)*(0.7 + Math.random()*0.6); }
    }
    if (u.recoil){ u.recoil = Math.max(0, u.recoil - dt*4); if (u.gun) u.gun.position.x = u.gun0 - Math.sin(u.recoil*Math.PI)*0.45; }
    // losses no gun is aiming at arrive by artillery or a drone
    if (u.pend >= 1){ u.pendT = (u.pendT || 0) + dt; if (u.pendT > 4){ const d = Math.floor(u.pend); u.pend -= d; u.pendT = 0; explosion(u.x + (Math.random() - 0.5)*2, u.z + (Math.random() - 0.5)*2, false); damage(u, d); } } else u.pendT = 0;
  }
  // artillery fires from the rear, rockets in salvoes, ballistic missiles rise before launch; air defence turns its radar and shoots down rockets
  function supportThink(u, dt){
    const k = ctx.kindOf[u.id];
    if (!u.target || !u.target.alive || Math.random() < dt*0.08){ const es = enemiesOf(u).filter(v => v.role === "front"), pool = es.length ? es : enemiesOf(u); const pend = pool.filter(v => v.pend >= 1); const L = pend.length ? pend : pool; u.target = L.length ? L[Math.floor(Math.random()*L.length)] : null; }
    const t = u.target, want = t ? Math.atan2(-(t.z - u.z), t.x - u.x) - u.h : 0;
    if (u.role === "ad"){
      if (u.turret) u.turret.rotation.y += dt*(k === "ew" ? 0.4 : 0.6);
      if (u.reload < 0 && k !== "ew"){ const a = airTarget(u); if (a){ launchSAM(launchPoint(u), a, !(a.pend >= 1)); u.reload = 3 + Math.random()*3; return; } }
      if (u.reload < 0){ const inc = shells.find(sh => !sh.dead && !sh.chased && sh.side !== u.side && (sh.kind === "rocket" || sh.kind === "missile") && sh.t/sh.dur > 0.25 && sh.t/sh.dur < 0.7 && !sh.dmg);
        if (inc && Math.random() < 0.6){ inc.chased = true; const lead = Math.min(0.95, inc.t/inc.dur + 0.18), at = q => [lerp(inc.x0, inc.x1, q), lerp(inc.y0, inc.y1, q) + Math.sin(Math.PI*q)*inc.arc, lerp(inc.z0, inc.z1, q)], [ix, iy, iz] = at(lead), p = launchPoint(u);
          launchSmoke(p, 8, 0.9);
          shells.push({x0:p.x, y0:p.y, z0:p.z, x1:ix, y1:iy, z1:iz, t:0, dur:Math.max(0.3, (lead - inc.t/inc.dur)*inc.dur), arc:6, side:u.side, kind:"sam", trail:true, c:[0.85, 0.95, 1], onHit:() => { inc.dead = true; explosion(ix, iz, false, true, 0.8, iy); }});
          u.reload = 3 + Math.random()*3; } else u.reload = 0.5; }
      return;
    }
    if (u.turret){ const cur = u.turret.rotation.y, diff = angDiff(cur, want); u.turret.rotation.y = cur + clamp(diff, -0.5*dt, 0.5*dt); u.aimed = Math.abs(diff) < 0.05; } else u.aimed = true;
    if (k === "sph"){ if (u.gun) u.gun.rotation.z = lerp(u.gun.rotation.z, 0.7, dt*1.5);
      if (t && u.aimed && u.reload < 0){ const p = launchPoint(u); launchSmoke(p, 14, 1.2); flash.position.copy(p); flash.intensity = 120; flashT = 0.1; u.recoil = 1; lob(u, t, "shell"); u.reload = (u.side ? ctx.rofThem : ctx.rofUs)*1.6*(0.8 + Math.random()*0.4); } }
    else if (k === "mlrs"){ if (u.turret) u.turret.rotation.z = lerp(u.turret.rotation.z, 0.5, dt*1.2);
      if (u.salvo > 0){ u.salvoT -= dt; if (u.salvoT <= 0){ u.salvoT = 0.13; u.salvo--; const p = launchPoint(u); launchSmoke(p, 5, 0.8); lob(u, u.salvoTarget && u.salvoTarget.alive ? u.salvoTarget : t, "rocket"); } }
      else if (t && u.aimed && u.reload < 0){ u.salvo = 8 + Math.floor(Math.random()*5); u.salvoT = 0; u.salvoTarget = t; u.reload = (u.side ? ctx.rofThem : ctx.rofUs)*4*(0.8 + Math.random()*0.4); } }
    else if (k === "srbm"){ u.erect = clamp((u.erect || 0) + (u.reload < 6 ? dt/3 : -dt/3), 0, 1); if (u.gun){ u.gun.rotation.z = u.erect*1.2; u.gun.visible = u.reload < 40; }
      if (u.erect >= 1 && u.reload < 0){ const p = launchPoint(u); launchSmoke(p, 40, 2); flash.position.copy(p); flash.intensity = 200; flashT = 0.15; lob(u, t, "missile"); u.reload = 50 + Math.random()*20; } }
    if (u.recoil){ u.recoil = Math.max(0, u.recoil - dt*3); if (u.gun) u.gun.position.x = u.gun0 - Math.sin(u.recoil*Math.PI)*0.6; }
    if (u.pend >= 1){ u.pendT = (u.pendT || 0) + dt; if (u.pendT > 6){ const d = Math.floor(u.pend); u.pend -= d; u.pendT = 0; explosion(u.x + (Math.random() - 0.5)*2, u.z + (Math.random() - 0.5)*2, false); damage(u, d); } } else u.pendT = 0;
  }
  function step(dt){
    for (let i = units.length - 1; i >= 0; i--) if (!units[i].alive && !units[i].obj) units.splice(i, 1);
    airStep(dt);
    for (const u of units){
      think(u, dt);
      if (!u.obj) continue;
      const y = G.height(u.x, u.z), hx = G.height(u.x + Math.cos(u.h)*3, u.z - Math.sin(u.h)*3) - G.height(u.x - Math.cos(u.h)*3, u.z + Math.sin(u.h)*3);
      u.obj.position.set(u.x, y, u.z); u.obj.rotation.set(0, u.h, 0); if (u.hull) u.hull.rotation.z = Math.atan2(hx, 6);
      if (u.pop && u.turret){ const p = u.pop; u.turret.position.y += p.vy*dt; u.turret.position.x += p.vx*dt; u.turret.position.z += p.vz*dt; p.vy -= 18*dt; u.turret.rotation.x += p.spin*dt; if (u.turret.position.y < -0.6 && p.vy < 0){ u.pop = null; } }
      if (u.burn > 0){ u.burn -= dt; const bx = u.x, bz = u.z;
        if (Math.random() < dt*30) fxFire.emit({x:bx + (Math.random() - 0.5)*2, y:y + 1.6, z:bz + (Math.random() - 0.5)*2, vx:(Math.random() - 0.5)*0.6, vy:2 + Math.random()*2, vz:(Math.random() - 0.5)*0.6, life:0.5 + Math.random()*0.5, s0:2.4, s1:0.8, c:[1, 0.75, 0.3], c1:[0.9, 0.2, 0.04], a:0.9, drag:0.5});
        if (Math.random() < dt*14) fxSmoke.emit({x:bx, y:y + 2.5, z:bz, vx:0.9 + Math.random()*0.6, vy:3 + Math.random()*2, vz:(Math.random() - 0.5)*0.6, life:6 + Math.random()*4, s0:2.5, s1:16, c:[0.08, 0.075, 0.07], c1:[0.32, 0.31, 0.3], a:0.75, drag:0.2, fadeIn:0.04}); }
    }

    // artillery falls on both lines; more in the positional phase
    artT -= dt; if (artT < 0){ artT = (ctx.phase === "pos" ? 1.6 : 3.2)*(0.5 + Math.random())*(units.some(u => u.alive && u.role === "arty") ? 3 : 1);
      const s = Math.random() < ctx.artyUs/(ctx.artyUs + ctx.artyThem + 1e-6) ? -1 : 1, x = (Math.random() - 0.5)*FIELD*0.85, z = s*(20 + Math.random()*55); explosion(x, z, Math.random() < 0.3); }
    // shells in flight
    let i = 0; const live = [];
    for (const sh of shells){ sh.t += dt; if (sh.dead){ if (sh.mesh) scene.remove(sh.mesh); continue; } const k = sh.t/sh.dur; if (k >= 1){ if (sh.mesh) scene.remove(sh.mesh); sh.onHit(); continue; } live.push(sh); if (k < 0) continue;
      const at = q => [lerp(sh.x0, sh.x1, q), lerp(sh.y0, sh.y1, q) + (sh.arc ? Math.sin(Math.PI*q)*sh.arc : 0) - (sh.fall ? sh.fall*q*(1 - q) : 0), lerp(sh.z0, sh.z1, q)];
      if (sh.mesh){ const [x, y, z] = at(k); sh.mesh.position.set(x, y, z); if (!sh.mesh.parent) scene.add(sh.mesh); continue; }
      if (sh.trail && Math.random() < dt*40){ const [x, y, z] = at(k); fxSmoke.emit({x, y, z, vx:0, vy:0.3, vz:0, life:sh.kind === "missile" ? 4 : 1.6, s0:sh.kind === "missile" ? 2.5 : 1, s1:sh.kind === "missile" ? 7 : 3, c:[0.8, 0.79, 0.77], a:0.55, drag:1}); fxFire.emit({x, y, z, vx:0, vy:0, vz:0, life:0.08, s0:sh.kind === "missile" ? 3 : 1.4, s1:0.6, c:[1, 0.8, 0.45], a:1}); }
      if (i < TR_MAX){ const k0 = Math.max(0, k - (sh.arc ? 0.04 : 0.25));
        trPos.set([...at(k0), ...at(k)], i*6); trCol.set([sh.c[0]*0.2, sh.c[1]*0.2, sh.c[2]*0.2, ...sh.c], i*6); i++; } }
    shells = live; trGeo.setDrawRange(0, i*2); trGeo.attributes.position.needsUpdate = trGeo.attributes.color.needsUpdate = true;
    if (flashT > 0){ flashT -= dt; if (flashT <= 0) flash.intensity = 0; }
    fxSmoke.update(dt); fxFire.update(dt);
  }
  // automatic graphics: measure the frame rate in 3-second windows and step down while it stays under ~27 fps
  const perf = {t0:performance.now() + 2500, frames:0, time:0};
  function lower(){
    if (level === "low") return false;
    level = level === "high" ? "mid" : "low"; Q = QL[level];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr)); resize();
    if (Q.sh){ sun.shadow.mapSize.set(Q.sh, Q.sh); if (sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; } renderer.shadowMap.type = Q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; }
    else { renderer.shadowMap.enabled = false; sun.castShadow = false; }
    scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
    fxSmoke.max = Math.round(1400*Q.fx); fxFire.max = Math.round(700*Q.fx);
    if (level === "low") [...new Set(units.map(u => u.model))].forEach(m => getModel(m, true));
    if (ctx.onQuality) ctx.onQuality(level);
    return true;
  }
  function measure(now, raw){
    if (!ctx.auto || now < perf.t0 || raw > 2500) return;   // longer gaps are pauses (app in background), not slow frames
    perf.frames++; perf.time += raw;
    if (perf.time >= 3000){ const fps = perf.frames*1000/perf.time; perf.frames = 0; perf.time = 0; perf.last = Math.round(fps); if (fps < 27 && lower()) perf.t0 = now + 1500; }
  }
  // continuous sounds: one per aircraft in the air (jets with a Doppler shift), and the engines of the vehicles near the camera
  const LOOP_CAP = {plane:6, heli:5, drone:5}; let engine = null, engT = 0;
  function soundStep(dt){
    if (!snd.ok) return; snd.listen(camera);
    const n = {plane:0, heli:0, drone:0};
    for (const a of air){
      const up = a.alive && a.obj && a.state !== "wait";
      if (!up){ if (a.snd){ a.snd.stop(); a.snd = null; } continue; }
      if (!a.snd){ if (n[a.cls] >= LOOP_CAP[a.cls]) continue; a.snd = a.cls === "heli" ? snd.loop("heli", {vol:0.5}) : a.cls === "plane" ? snd.loop("jet", {vol:0.75}) : snd.loop("drone", a.loiter ? {vol:0.3, f:170} : {vol:0.22, f:95}); }
      n[a.cls]++; if (!a.snd) continue;
      let rate = 1;
      if (a.cls === "plane"){ const dx = camera.position.x - a.x, dy = camera.position.y - a.y, dz = camera.position.z - a.z, d = Math.hypot(dx, dy, dz) || 1, vr = (Math.cos(a.h)*dx - Math.sin(a.h)*dz)*a.v/d;
        rate = clamp(1 + vr/340*2.5, 0.7, 1.4); }
      a.snd.set(a.x, a.y, a.z, a.state === "fall" ? 0.7 : 1, rate);
    }
    engT -= dt; if (engT < 0){ engT = 0.3; engine = engine || snd.loop("engine", {vol:0.4});
      let k = 0; for (const u of units) if (u.alive && u.obj){ const d = Math.hypot(u.x - cam.x, u.z - cam.z); if (d < 90) k += (1 - d/90)*(u.state === "move" ? 1 : 0.45); }
      engine.set(cam.x, G.height(cam.x, cam.z) + 2, cam.z, clamp(k*0.25, 0, 1)*clamp(1.6 - cam.dist/120, 0.15, 1)); }
  }
  cv.addEventListener("pointerdown", () => snd.wake());
  function frame(now){
    if (!running) return; requestAnimationFrame(frame);
    if (document.hidden) { last = now; snd.sleep(); return; }
    snd.wake(true); soundStep(Math.min(0.1, (now - last)/1000));
    const raw = now - last, dt = clamp(raw/1000, 0, 0.05); last = now; measure(now, raw);
    step(dt); lodPass(dt); fxSmoke.mat.uniforms.scale.value = fxFire.mat.uniforms.scale.value = el.clientHeight*renderer.getPixelRatio()/(2*Math.tan(camera.fov*Math.PI/360));
    renderer.render(scene, camera); drawHud(dt);
  }
  requestAnimationFrame(frame);
  return {
    // the war destroyed n machines of model id on this front
    hit(side, id, n, via){ if (isAir(id)){ const ap = air.filter(a => a.alive && a.side === side && a.id === id); if (ap.length) ap.reduce((a, b) => (b.hp - b.pend) > (a.hp - a.pend) ? b : a).pend += n; return; }
      let pool = units.filter(u => u.alive && u.obj && u.side === side && u.id === id); if (!pool.length) pool = units.filter(u => u.alive && u.obj && u.side === side); if (!pool.length) return;
      const left = v => v.hp - v.pend - (v.pendAir || 0), u = pool.reduce((a, b) => left(b) > left(a) ? b : a);
      if (via === "air"){ u.pendAir = (u.pendAir || 0) + n; u.pendAirT = 0; } else u.pend += n; },
    raid(type, o){ raid(type, o); },
    // machines spent (drones that flew their strike): the squads get smaller without anything being shot down
    consume(side, id, n){ let left = n; air.filter(a => a.alive && !a.temp && a.side === side && a.id === id).forEach(a => { const q = Math.min(left, Math.max(0, a.hp - 0.5)); a.hp -= q; left -= q; }); },
    // what the army really has on this front: reinforce from the map edge when there is more than the squads hold
    sync(side, have){ const airHave = {}; for (const id in have) if (isAir(id)){ airHave[id] = have[id]; delete have[id]; } airSync(side, airHave);
      const CAP = {front:Q.cap, arty:2, ad:2}, roleOf = id => (ctx.roleOf && ctx.roleOf[id]) || "front", slots = id => units.filter(u => u.alive && u.side === side && (u.role || "front") === roleOf(id)).length < CAP[roleOf(id)];
      for (const [id, n] of Object.entries(have)){ const mine = units.filter(u => u.alive && u.side === side && u.id === id), held = mine.reduce((a, u) => a + u.hp - u.pend - (u.pendAir || 0) - (u.inbound || 0), 0), diff = n - held;
        const per = mine.length ? held/mine.length : n;
        if (diff > Math.max(1, per*0.5) && slots(id)){ reinforce(side, id, diff); }
        else if (diff > 0.5 && mine.length){ mine.forEach(u => { u.hp += diff/mine.length; u.hpMax = Math.max(u.hpMax, u.hp); }); }
        else if (diff < -0.5 && mine.length) mine[0].pend += -diff; } },
    names(map){ Object.assign(ctx.names, map); },

    focus(i, dist, yaw){ const u = units.filter(v => v.obj)[i]; if (!u) return; cam.x = u.x; cam.z = u.z; cam.dist = dist || 40; if (yaw != null) cam.yaw = yaw; placeCamera(); },
    advance(sec){ for (let t = 0; t < sec; t += 1/30){ step(1/30); soundStep(1/30); } },
    list(){ return units.filter(v => v.obj).map(v => v.side + ':' + v.model); },
    quality(lv){ if (lv && QL[lv]){ while (level !== lv && lower()); } return {level, fps:perf.last || null}; },
    lods(){ return units.filter(u => u.obj).map(u => u.model + ":" + u.lod); },
    air(){ return air.filter(a => a.alive).map(a => ({side:a.side, id:a.id, cls:a.cls, state:a.state, hp:+a.hp.toFixed(1), pend:+a.pend.toFixed(1), y:a.obj ? +a.y.toFixed(1) : null})); },
    airFocus(i, dist){ const a = air.filter(a => a.obj)[i]; if (!a) return false; const k = (a.y - G.height(a.x, a.z))/Math.tan(cam.pitch);
      cam.x = a.x - Math.sin(cam.yaw)*k; cam.z = a.z - Math.cos(cam.yaw)*k; cam.dist = dist || 60; placeCamera(); return true; },
    info(){ return {air:[0, 1].map(s => air.filter(a => a.side === s && a.alive).length), alive:[0, 1].map(s => units.filter(u => u.side === s && u.alive).length), particles:fxSmoke.items.length + fxFire.items.length, calls:renderer.info.render.calls, tris:renderer.info.render.triangles}; },
    sound(on){ snd.set(on); },
    soundInfo(){ return snd.ok ? snd.info() : null; },
    soundRecord(sec){ return snd.ok ? snd.record(sec) : Promise.resolve(null); },
    dispose(){ running = false; snd.dispose(); ro.disconnect(); renderer.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); renderer.domElement.remove(); }
  };
}
