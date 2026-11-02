// Headless check of what stage 2 of the WebGL map draws (names, flags, routes, war marks, held land) and of the SVG fallback.
// Serve www on :8765 with t.html (see HANDOFF, Testing). Flags are faked. Run: node tools/sim/mapover.js <shot dir>
const {chromium} = require('playwright'); const D = process.argv[2] || '.';
const fake = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="#2a6"/><rect width="4" height="1" fill="#fff"/></svg>';
const open = async (b, init) => {
  const p = await b.newPage({viewport:{width:900, height:420}, deviceScaleFactor:2}), errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200))); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.route('**/flags/*.svg', r => r.fulfill({contentType:'image/svg+xml', body:fake}));
  if (init) await p.addInitScript(init);
  await p.goto('http://localhost:8765/t.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { newGame('ru'); ui.tab = 'map'; closeModal && closeModal(); render(); }); await p.waitForTimeout(1800);
  await p.evaluate(() => { const c = [...document.querySelectorAll('button')].find(x => /сам разберусь/.test(x.textContent)); if (c) c.click(); }); await p.waitForTimeout(300);
  return {p, errs};
};
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}), out = {};
  const {p, errs} = await open(b);
  await p.evaluate(() => { C().fr.trade = true; S.rails.de = {done:1}; const L = LABELS.kz; ui.map = {k:2.6, x:300 - L.x*2.6, y:170 - L.y*2.6}; startWar('kz', true);
    const w = S.wars[0]; w.fronts.forEach((f, i) => { f.p = i ? -18 : 35; }); w.track = [w.fronts.map(() => 5)]; for (let i = 0; i < 40; i++) S.shipments.push({id:'t' + i, from:['fr','cn','de','tr'][i%4], to:'ru', r:i%2 ? 'oil' : 'wood', qty:1, left:20 - i/3, total:30, dir:i%3 ? 'in' : 'out', cat:i%5 ? undefined : 'ammo'}); ui.mapHtml = null; ui.tab = 'map'; render(); });
  await p.waitForTimeout(1800);
  await p.evaluate(() => { ui.map = {k:1.8, x:-120, y:-60}; mapApply(); }); await p.waitForTimeout(700);
  out.gl = await p.evaluate(() => { const m = {}; MA.marks.forEach(q => { m[q.kind] = (m[q.kind] || 0) + 1; }); return {marks:m, routes:MA.routes.map(r => r.speed.toFixed(1) + (r.dash ? 'd' : '')), anim:MG.anim, occ:Object.keys(MG.occ), sprites:MA.map.size, cargo:MA.cargo.length, icons:[...MA.map.keys()].filter(k => k[0] === 'i').length, moveMs:(() => { const t = performance.now(); for (let i = 0; i < 100; i++) moveCargo(); return +(performance.now() - t).toFixed(2); })(), flags:[...MA.map.keys()].filter(k => k[0] === 'f').length, atlasY:MA.y, q:MA.n/30, err:MG.gl.getError()}; });
  await p.screenshot({path:D + '/war.png'});
  const hit = await p.evaluate(() => { const el = document.querySelector('#map-fx .fx-hit'); if (!el) return null; const r = el.getBoundingClientRect(), x = r.left + r.width/2, y = r.top + r.height/2, t = document.elementFromPoint(x, y); return {x, y, on:!!(t && t.closest('[data-battle]'))}; });
  out.hit = hit && hit.on; if (hit && hit.on){ await p.mouse.click(hit.x, hit.y); await p.waitForTimeout(600); out.opened = await p.evaluate(() => !!(window.BF && BF.open) || !!document.querySelector('.bf-root,.bf-offer,.bf')); }
  out.errs = errs.slice(0, 4);
  const s2 = await open(b, () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(t, o){ return /webgl/.test(t) ? null : g.call(this, t, o); }; });
  out.fallback = await s2.p.evaluate(() => ({ok:MG.ok, vis:[...document.querySelectorAll('#map-labels text')].filter(t => t.style.display !== 'none').length, flags:document.querySelectorAll('#map-labels image').length}));
  out.fbErrs = s2.errs.slice(0, 3);
  console.log(JSON.stringify(out)); await b.close();
})();
