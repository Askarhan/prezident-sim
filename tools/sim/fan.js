// Headless check of the fan front: one sheet per attacker/target at a few progress mixes, plus numbers (solid land, land only grows, 100% = all).
// Serve www on :8765 with t.html (see HANDOFF, Testing). Run: node tools/sim/fan.js <png> ['[["ru","kz"],...]']
const {chromium} = require('playwright'), out = process.argv[2] || 'fan.png';
const pairs = JSON.parse(process.argv[3] || '[["ua","ru"],["ar","cl"],["au","id"],["ru","kz"],["us","ca"],["cn","jp"]]');
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport:{width:1000, height:700}}), errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await p.goto('http://localhost:8765/t.html'); await p.waitForTimeout(1200);
  const r = await p.evaluate(pairs => { newGame('ru'); render();
    const mixes = [[12, 8, 15], [45, 25, 60], [85, 60, 95]], sheet = document.createElement('div'); sheet.id = 'sheet';
    sheet.style = 'position:fixed;inset:0;z-index:99999;background:#111;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;overflow:hidden'; const res = {};
    document.body.append(sheet);
    pairs.forEach(([a, t]) => { if (!C()[t] && t !== S.player || !countryPath(t)){ res[a + '>' + t] = 'no country'; return; }
      const n = frontsOf(t).length, R = frontRoutes(a, t, n); if (!R){ res[a + '>' + t] = 'no routes'; return; }
      const F = occField(a, t, R.map(x => x.ll)); if (!F){ res[a + '>' + t] = 'no field'; return; }
      const path = countryPath(t), d = path.getAttribute('d'), P2 = new Path2D(d), {gw, gh, x0, y0, cs} = F, land = new Uint8Array(gw*gh);
      for (let k = 0; k < gw*gh; k++){ const c = F.cell(k % gw, Math.floor(k/gw)); land[k] = inCountry(path, c.x, c.y) ? 1 : 0; }
      const cnt = v => { let c = 0; for (let k = 0; k < gw*gh; k++) if (land[k] && v && v[k] > 0) c++; return c; }, all = cnt(land.map(() => 1));
      // pieces of taken land joined over any cells (sea gaps of islands are bridged two cells wide)
      const parts = v => { const seen = new Uint8Array(gw*gh); let c = 0; for (let s = 0; s < gw*gh; s++){ if (!(v[s] > 0) || !land[s] || seen[s]) continue; c++; const st = [s]; seen[s] = 1;
        while (st.length){ const q = st.pop(), i = q % gw, j = (q - i)/gw; for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++){ const a = i + x, b = j + y; if (a < 0 || b < 0 || a >= gw || b >= gh) continue; const m = b*gw + a; if (!seen[m] && land[m] && v[m] > 0){ seen[m] = 1; st.push(m); } } } } return c; };
      const shares = [], pc = []; mixes.forEach(mx => { const prog = R.map((_, i) => mx[i % 3]), v = occVal(F, prog);
        shares.push(Math.round(cnt(v)/all*100)); pc.push(v ? parts(v) : 0);
        const cv = document.createElement('canvas'); cv.width = 330; cv.height = 225; sheet.append(cv); const g = cv.getContext('2d'), z = Math.min(310/(gw*cs), 205/(gh*cs)); g.setTransform(z, 0, 0, z, 10 - x0*z, 10 - y0*z);
        g.fillStyle = '#556'; g.fill(P2); g.save(); g.clip(P2); g.fillStyle = '#f5a524'; if (v) for (let k = 0; k < gw*gh; k++) if (v[k] > 0){ const q = F.cell(k % gw, Math.floor(k/gw)); g.fillRect(q.x - cs/2, q.y - cs/2, cs + .1, cs + .1); } g.restore();
        F.routes.forEach((Q, i) => { g.strokeStyle = i ? '#7cf' : '#f66'; g.lineWidth = 1.2/z; g.beginPath(); Q.pts.forEach((q, s) => s ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.stroke(); const q = routePoint(Q, prog[i]); g.fillStyle = '#fff'; g.fillRect(q.x - 2/z, q.y - 2/z, 4/z, 4/z); });
        g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText(`${a}>${t} ${mx}`, 6, 13); });
      // land never shrinks, all 100% is the whole country
      let lost = 0, prev = null; for (let q = 0; q <= 100; q += 4){ const v = occVal(F, R.map(() => q)); if (v){ if (prev) for (let k = 0; k < gw*gh; k++) if (land[k] && prev[k] > 0 && !(v[k] > 0)) lost++; prev = v.slice(); } }
      const fin = cnt(occVal(F, R.map(() => 100))); F.t0 = performance.now(); for (let i = 0; i < 20; i++) occVal(F, R.map((_, k) => 30 + k*7 + i));
      res[a + '>' + t] = {n, names:R.map(x => x.places[2]).join('/'), angles:R.map(x => { const q = x.ll[2] && proj(x.ll[2][0], x.ll[2][1]), o = q && F.polar(q.x, q.y); return o ? Math.round(o.th*57.3) : null; }).join(','), share:shares.join(' '), parts:pc.join(' '), lost, full:fin + '/' + all, ms:+((performance.now() - F.t0)/20).toFixed(2)}; });
    return res; }, pairs);
  await p.waitForTimeout(200); console.log(JSON.stringify(r).replace(/\},/g, '},\n'));
  if (errs.length) console.log(errs.slice(0, 3).join('\n'));
  await p.screenshot({path:out, clip:{x:0, y:0, width:1000, height:Math.min(700, 228*Math.ceil(pairs.length))}}); await b.close();
})();
