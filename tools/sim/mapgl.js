// Headless check of the WebGL world map. Serve www on :8765 with t.html (see HANDOFF, Testing). Run: node tools/sim/mapgl.js <shot dir>
const {chromium} = require('playwright'); const D = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport:{width:900, height:420}, deviceScaleFactor:2}); const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200))); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto('http://localhost:8765/t.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { newGame('ru'); ui.tab = 'map'; closeModal && closeModal(); render(); });
  await p.waitForTimeout(2500);
  await p.evaluate(() => { const c = [...document.querySelectorAll('button')].find(x => /сам разберусь/.test(x.textContent)); if (c) c.click(); }); await p.waitForTimeout(800);
  const out = {};
  out.state = await p.evaluate(() => ({ok:MG.ok, live:mgLive(), z:MG.z, strokes:MG.strokes.length, nS:MG.nS, cv:[MG.cv.width, MG.cv.height], t0:!!MG.t0, glErr:MG.gl && MG.gl.getError()}));
  await p.screenshot({path:D + '/a.png'});
  const hit = (iso) => p.evaluate(iso => { const L = LABELS[iso], r = document.getElementById('worldmap').getBoundingClientRect(), [w] = mapSize(), m = ui.map, u = w/r.width; const x = r.left + (L.x*m.k + m.x)/u, y = r.top + (L.y*m.k + m.y)/u, el = document.elementFromPoint(x, y); return [Math.round(x), Math.round(y), el && el.tagName, el && el.dataset && el.dataset.iso]; }, iso);
  out.hit = [await hit('fr'), await hit('br'), await hit('au')];
  const c = await hit('de');
  await p.mouse.click(c[0], c[1]); await p.waitForTimeout(500);
  out.sel = await p.evaluate(() => [ui.mapSel, ui.tab, MG.strokes.map(s => s.iso).join()]);
  await p.evaluate(() => { ui.tab = 'map'; ui.mapSel = null; ui.map = {k:4, x:-1500, y:-250}; startWar('kz', true); render(); }); await p.waitForTimeout(1500);
  out.war = await p.evaluate(() => ({z:MG.z, tex:MG.tex.size, pulse:MG.pulse, gl:MG.gl.getError()}));
  await p.screenshot({path:D + '/b.png'});
  const box = await p.evaluate(() => { const r = document.getElementById('map-wrap').getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; });
  await p.mouse.move(box[0], box[1]); await p.mouse.down(); await p.mouse.move(box[0] - 80, box[1] - 20, {steps:4});
  out.moving = await p.evaluate(() => { mapMvMark(); ui.map.x -= 30; ui.map.y -= 10; mapApply(); return [!!ui.mapMv, document.getElementById('worldmap').style.transform, document.getElementById('map-wrap').className]; });
  await p.mouse.up(); await p.waitForTimeout(400);
  out.rest = await p.evaluate(() => [!!ui.mapMv, document.getElementById('worldmap').style.transform, document.getElementById('map-g').getAttribute('transform')]);
  await p.mouse.wheel(0, -300); await p.waitForTimeout(500); out.wheel = await p.evaluate(() => [ui.map.k, !!ui.mapMv]);
  // a merged bloc, an occupied land
  await p.evaluate(() => { const c = C(); ui.map = {k:1.6, x:-380, y:-40}; S.wars = []; c.kz.owner = 'player'; S.occupied = S.occupied || {}; S.occupied.kz = {integ:1, res:0, referendum:true, share:1}; c.de.owner = 'player'; S.occupied.de = {integ:.3, res:0}; ui.mapSel = S.player; render(); });
  await p.waitForTimeout(1500);
  out.bloc = await p.evaluate(() => ({n:MG.bloc.length, line:!!MG.blocLine, gl:MG.gl.getError(), strokes:MG.strokes.map(s => s.iso + (s.dash ? ':d' : '')).join()}));
  await p.screenshot({path:D + '/c.png'});
  // speed of a drawn frame in software (only a comparison between builds, phones use a real GPU)
  out.ms = await p.evaluate(() => { const t = performance.now(); for (let i = 0; i < 20; i++) mgFrame(); MG.gl.finish(); return Math.round((performance.now() - t)/20); });
  out.errs = errs.slice(0, 5);
  console.log(JSON.stringify(out)); await b.close();
})();
