// The 3D battlefield: real models with turrets that track targets, shots, explosions, burning wrecks.
// Loaded on demand by the game: import("./field/bf3d.js").then(m => m.start(el, ctx))
import * as THREE from "../lib/three/three.module.min.js";
import { GLTFLoader } from "../lib/three/GLTFLoader.js";

const FIELD = 240;                 // metres, square
const MODEL_CACHE = new Map();     // glb name -> Promise<gltf scene>
const loader = new GLTFLoader();
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
export async function start(el, ctx){
  const quality = ctx.quality || "high";
  const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === "high" ? 1.6 : 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement); renderer.domElement.className = "bf3d-cv";
  const scene = new THREE.Scene(), haze = ctx.terrain === "d" ? 0xc9b48e : 0x9aa6a0;
  scene.background = new THREE.Color(haze); scene.fog = new THREE.Fog(haze, 160, 430);
  const camera = new THREE.PerspectiveCamera(32, 1, 2, 900);
  const hemi = new THREE.HemisphereLight(0xcfdcff, 0x4a4234, 0.55); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.6); sun.castShadow = true;
  sun.shadow.mapSize.set(quality === "high" ? 2048 : 1024, quality === "high" ? 2048 : 1024);
  Object.assign(sun.shadow.camera, {left:-90, right:90, top:90, bottom:-90, near:10, far:400}); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  const R = rng(ctx.seed), N = noise2(ctx.seed);
  const G = buildGround(ctx, R, N, quality); scene.add(G.mesh);

  // units: positions first so props keep away from them
  const units = [];
  const sideCount = [0, 0];
  ctx.units.forEach(u => sideCount[u.side]++);
  const idx = [0, 0];
  ctx.units.forEach(u => { const s = u.side ? -1 : 1, k = idx[u.side]++, n = sideCount[u.side], x = (k + 0.5 - n/2)*(FIELD*0.75/Math.max(n, 1)) + (R() - 0.5)*8, z = s*((ctx.phase === "pos" ? 15 : 19) + 5 + R()*14);
    units.push({...u, x, z, h: u.side ? -Math.PI/2 : Math.PI/2, home:[x, z], hp:u.hp || 1, hpMax:u.hp || 1, pend:0, alive:true, reload:2 + R()*4, state:"hold", next:R()*8}); });
  scatterProps(scene, ctx, G, R, units.map(u => [u.x, u.z, 9]));
  // load models and place them
  const models = {}; await Promise.all([...new Set(units.map(u => u.model))].map(async m => { try { models[m] = await loadModel(m); } catch(e){ models[m] = null; } }));
  const accent = [new THREE.MeshStandardMaterial({color:ctx.accentUs || 0x2f6bff, emissive:ctx.accentUs || 0x2f6bff, emissiveIntensity:0.35, roughness:0.5}),
                  new THREE.MeshStandardMaterial({color:ctx.accentThem || 0xe03030, emissive:ctx.accentThem || 0xe03030, emissiveIntensity:0.35, roughness:0.5})];
  function dress(u){
    const src = models[u.model]; if (!src) { u.alive = false; return; }
    const obj = src.clone(true); const root = new THREE.Group(); root.add(obj);
    obj.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; if (o.material && o.material.name === "accent") o.material = accent[u.side]; else if (o.material){ o.material = o.material.clone(); } }
      if (/_turret$/.test(o.name)) u.turret = o; if (/_gun$/.test(o.name)) u.gun = o; if (/_hull$/.test(o.name)) u.hull = o; });
    u.muzzle = (u.hull && u.hull.userData && u.hull.userData.muzzle) || 4.6;
    u.obj = root; u.gun0 = u.gun ? u.gun.position.x : 0; scene.add(root);
  }
  units.forEach(dress);
  const fxSmoke = new Particles(scene, quality === "high" ? 1400 : 700, false), fxFire = new Particles(scene, quality === "high" ? 700 : 400, true);
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
    const p = new THREE.Vector3(u.muzzle + 0.3, 0, 0); u.gun.localToWorld(p);
    const d = new THREE.Vector3(1, 0, 0).transformDirection(u.gun.matrixWorld);
    for (let i = 0; i < 6; i++) fxFire.emit({x:p.x, y:p.y, z:p.z, vx:d.x*(8 + i*4) + (Math.random() - 0.5)*3, vy:d.y*8 + Math.random()*2, vz:d.z*(8 + i*4) + (Math.random() - 0.5)*3, life:0.12 + Math.random()*0.08, s0:2.6, s1:1.2, c:[1, 0.85, 0.5], c1:[1, 0.4, 0.1], a:1, drag:4});
    for (let i = 0; i < 10; i++) fxSmoke.emit({x:p.x, y:p.y, z:p.z, vx:d.x*(4 + Math.random()*6) + (Math.random() - 0.5)*2, vy:0.6 + Math.random(), vz:d.z*(4 + Math.random()*6) + (Math.random() - 0.5)*2, life:1.6 + Math.random()*1.4, s0:1.2, s1:5, c:[0.62, 0.6, 0.56], c1:[0.75, 0.73, 0.7], a:0.55, drag:1.4, fadeIn:0.05});
    // blast lifts dust around the tank
    for (let i = 0; i < 10; i++){ const a = Math.random()*6.28; fxSmoke.emit({x:u.obj.position.x + Math.cos(a)*2, y:u.obj.position.y + 0.4, z:u.obj.position.z + Math.sin(a)*2, vx:Math.cos(a)*5, vy:0.5, vz:Math.sin(a)*5, life:1.2 + Math.random(), s0:1.5, s1:4.5, c:[0.55, 0.47, 0.36], a:0.35, drag:2}); }
    flash.position.copy(p); flash.intensity = 60; flashT = 0.08;
    u.recoil = 1;
    return {p, d};
  }
  function explosion(x, z, big, airburst){
    const y = G.height(x, z) + (airburst ? 4 : 0.3);
    const n = big ? 34 : 14;
    for (let i = 0; i < n; i++){ const a = Math.random()*6.28, v = (big ? 6 : 4)*Math.random(); fxFire.emit({x, y:y + Math.random()*(big ? 2 : 1), z, vx:Math.cos(a)*v, vy:(big ? 5 : 3) + Math.random()*4, vz:Math.sin(a)*v, life:0.35 + Math.random()*(big ? 0.6 : 0.3), s0:big ? 6 : 3.5, s1:big ? 3 : 1.5, c:[1, 0.85, 0.45], c1:[0.9, 0.25, 0.05], a:1, drag:2.5}); }
    // dirt thrown up, then smoke
    for (let i = 0; i < (big ? 26 : 16); i++){ const a = Math.random()*6.28, v = Math.random()*(big ? 7 : 5); fxSmoke.emit({x, y, z, vx:Math.cos(a)*v, vy:(big ? 9 : 7) + Math.random()*6, vz:Math.sin(a)*v, g:-14, life:0.9 + Math.random()*0.8, s0:1.2, s1:2.4, c:[0.27, 0.21, 0.15], a:0.9, drag:0.4}); }
    for (let i = 0; i < (big ? 30 : 14); i++){ const a = Math.random()*6.28, v = Math.random()*(big ? 3 : 2); fxSmoke.emit({x:x + Math.cos(a)*1.5, y:y + Math.random()*2, z:z + Math.sin(a)*1.5, vx:Math.cos(a)*v + 0.6, vy:1 + Math.random()*2, vz:Math.sin(a)*v, life:3 + Math.random()*4, s0:3, s1:big ? 14 : 9, c:[0.22, 0.2, 0.18], c1:[0.5, 0.48, 0.45], a:0.6, drag:0.5, fadeIn:0.06}); }
    if (!airburst) scorch(x, z, big ? 3.5 : 2);
    flash.position.set(x, y + 2, z); flash.intensity = big ? 220 : 90; flashT = 0.12;
  }
  function fireAt(u, t){
    const {p, d} = muzzle(u);
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
    const s = side ? -1 : 1, x = (Math.random() - 0.5)*FIELD*0.7, z = s*(FIELD/2 - 6), hz = s*((ctx.phase === "pos" ? 15 : 19) + 5 + Math.random()*14);
    const u = {id, model, side, x, z, h:side ? -Math.PI/2 : Math.PI/2, home:[x, hz], hp, hpMax:hp, pend:0, alive:true, reload:4, state:"move", wp:[x, hz], next:20};
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
    const r = cv.getBoundingClientRect(); let best = null, bd = 44; for (const u of units){ if (!u.alive || !u.obj) continue; const q = screenOf(u, 1.5); const d = Math.hypot(q.x - (e.clientX - r.left), q.y - (e.clientY - r.top)); if (d < bd){ bd = d; best = u; } }
    selected = best; selT = 4; });
  const v3 = new THREE.Vector3();
  function screenOf(u, up){ v3.set(u.x, G.height(u.x, u.z) + up, u.z).project(camera); return {x:(v3.x + 1)/2*el.clientWidth, y:(1 - v3.y)/2*el.clientHeight, vis:v3.z < 1}; }
  function drawHud(dt){
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = el.clientWidth, H = el.clientHeight;
    if (hud.width !== Math.round(W*dpr)){ hud.width = Math.round(W*dpr); hud.height = Math.round(H*dpr); }
    hg.setTransform(dpr, 0, 0, dpr, 0, 0); hg.clearRect(0, 0, W, H);
    const close = cam.dist < 80; selT -= dt; if (selT <= 0) selected = null;
    hg.font = "600 11px system-ui, sans-serif"; hg.textAlign = "center";
    for (const u of units){ if (!u.alive || !u.obj) continue; const q = screenOf(u, 4.2); if (!q.vis) continue;
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
  const enemiesOf = u => units.filter(v => v.alive && v.side !== u.side && v.obj);
  function think(u, dt){
    if (!u.alive || !u.obj) return;
    u.next -= dt; u.reload -= dt;
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
      if (u.target && Math.abs(diff) < 0.035 && u.reload < 0){ fireAt(u, u.target); u.reload = (u.side ? ctx.rofThem : ctx.rofUs)*(0.7 + Math.random()*0.6); }
    }
    if (u.recoil){ u.recoil = Math.max(0, u.recoil - dt*4); if (u.gun) u.gun.position.x = u.gun0 - Math.sin(u.recoil*Math.PI)*0.45; }
    // losses no gun is aiming at arrive by artillery or a drone
    if (u.pend >= 1){ u.pendT = (u.pendT || 0) + dt; if (u.pendT > 4){ const d = Math.floor(u.pend); u.pend -= d; u.pendT = 0; explosion(u.x + (Math.random() - 0.5)*2, u.z + (Math.random() - 0.5)*2, false); damage(u, d); } } else u.pendT = 0;
  }
  function step(dt){
    for (let i = units.length - 1; i >= 0; i--) if (!units[i].alive && !units[i].obj) units.splice(i, 1);
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
    artT -= dt; if (artT < 0){ artT = (ctx.phase === "pos" ? 1.6 : 3.2)*(0.5 + Math.random());
      const s = Math.random() < ctx.artyUs/(ctx.artyUs + ctx.artyThem + 1e-6) ? -1 : 1, x = (Math.random() - 0.5)*FIELD*0.85, z = s*(20 + Math.random()*55); explosion(x, z, Math.random() < 0.3); }
    // shells in flight
    let i = 0; const live = [];
    for (const sh of shells){ sh.t += dt; const k = sh.t/sh.dur; if (k >= 1){ sh.onHit(); continue; } live.push(sh);
      if (i < TR_MAX){ const k0 = Math.max(0, k - 0.25), at = q => [lerp(sh.x0, sh.x1, q), lerp(sh.y0, sh.y1, q), lerp(sh.z0, sh.z1, q)];
        trPos.set([...at(k0), ...at(k)], i*6); trCol.set([sh.c[0]*0.2, sh.c[1]*0.2, sh.c[2]*0.2, ...sh.c], i*6); i++; } }
    shells = live; trGeo.setDrawRange(0, i*2); trGeo.attributes.position.needsUpdate = trGeo.attributes.color.needsUpdate = true;
    if (flashT > 0){ flashT -= dt; if (flashT <= 0) flash.intensity = 0; }
    fxSmoke.update(dt); fxFire.update(dt);
  }
  function frame(now){
    if (!running) return; requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = clamp((now - last)/1000, 0, 0.05); last = now;
    step(dt); fxSmoke.mat.uniforms.scale.value = fxFire.mat.uniforms.scale.value = el.clientHeight*renderer.getPixelRatio()/(2*Math.tan(camera.fov*Math.PI/360));
    renderer.render(scene, camera); drawHud(dt);
  }
  requestAnimationFrame(frame);
  return {
    // the war destroyed n machines of model id on this front
    hit(side, id, n){ let pool = units.filter(u => u.alive && u.obj && u.side === side && u.id === id); if (!pool.length) pool = units.filter(u => u.alive && u.obj && u.side === side); if (!pool.length) return;
      const u = pool.reduce((a, b) => (b.hp - b.pend) > (a.hp - a.pend) ? b : a); u.pend += n; },
    // what the army really has on this front: reinforce from the map edge when there is more than the squads hold
    sync(side, have){ const slots = () => units.filter(u => u.alive && u.side === side).length;
      for (const [id, n] of Object.entries(have)){ const mine = units.filter(u => u.alive && u.side === side && u.id === id), held = mine.reduce((a, u) => a + u.hp - u.pend - (u.inbound || 0), 0), diff = n - held;
        const per = mine.length ? held/mine.length : n;
        if (diff > Math.max(1, per*0.5) && slots() < 10){ reinforce(side, id, diff); }
        else if (diff > 0.5 && mine.length){ mine.forEach(u => { u.hp += diff/mine.length; u.hpMax = Math.max(u.hpMax, u.hp); }); }
        else if (diff < -0.5 && mine.length) mine[0].pend += -diff; } },
    names(map){ Object.assign(ctx.names, map); },

    focus(i, dist, yaw){ const u = units.filter(v => v.obj)[i]; if (!u) return; cam.x = u.x; cam.z = u.z; cam.dist = dist || 40; if (yaw != null) cam.yaw = yaw; placeCamera(); },
    advance(sec){ for (let t = 0; t < sec; t += 1/30) step(1/30); },
    info(){ return {alive:[0, 1].map(s => units.filter(u => u.side === s && u.alive).length), particles:fxSmoke.items.length + fxFire.items.length, calls:renderer.info.render.calls, tris:renderer.info.render.triangles}; },
    dispose(){ running = false; ro.disconnect(); renderer.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); renderer.domElement.remove(); }
  };
}
