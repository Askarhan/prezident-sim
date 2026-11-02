// Headless check of the peaceful path. Serve www on :8765 with t.html (see HANDOFF, Testing). Run: node tools/sim/peace.js <shot dir>
const {chromium} = require('playwright'), D = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport:{width:900, height:420}}), errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200))); await p.route('**/flags/*.svg', r => r.abort());
  await p.goto('http://localhost:8765/t.html'); await p.waitForTimeout(1000);
  const r = await p.evaluate(() => { newGame('ru'); ui.tab = 'map'; render(); const kz = C().kz, de = C().de; kz.emb = kz.nap = kz.trade = kz.ally = true; kz.rel = 70; const log = [];
    for (let m = 1; m <= 60; m++){ aiTurn(); if (m % 12 === 0) log.push([Math.round(infOf(kz)), Math.round(infOf(de))]); }
    return {log, parts:infParts(kz).join(' ; '), tgt:infTarget(kz), all:Object.values(C()).filter(x => !x.owner).map(x => Math.round(infOf(x))).sort((a, b) => b - a).slice(0, 8)}; });
  console.log(JSON.stringify(r));
  await p.evaluate(() => { ui.mapMode = 'inf'; closeModal && closeModal(); render(); }); await p.waitForTimeout(900);
  const c = await p.evaluate(() => { const q = [...document.querySelectorAll('button')].find(x => /сам разберусь/.test(x.textContent)); if (q) q.click(); ui.ctry = 'kz'; ui.ctab = 'dip'; ui.tab = 'country'; render(); return ui.tab; }); await p.waitForTimeout(500);
  await p.screenshot({path:D + '/card.png'}); console.log(c, errs.slice(0, 3).join(' | ')); await b.close();
})();
