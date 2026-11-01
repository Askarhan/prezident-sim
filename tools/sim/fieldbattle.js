const {chromium} = require('playwright');
const RUNS = JSON.parse(process.argv[2]);   // [[me, foe, type], ...]
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}); const out = [];
  for (const [me, foe, type, pct] of RUNS){
    const p = await b.newPage({viewport:{width:800, height:500}}); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
    await p.goto('http://localhost:8765/t.html'); await p.waitForTimeout(1500);
    const plan = await p.evaluate(([me, foe, type, pct]) => { newGame(me); startWar(foe, true); const w = S.wars[0];
      for (let k = 0; k < 40; k++){ S.day = (S.day||1) + 1; dayTick(); if (S.day > daysIn(S.month, S.year)) nextMonth(); }
      const i = w.fronts.reduce((bi, f, j) => (w.fronts[bi].p >= 100 || f.p < 100 && cbCount(w.dep[j]) > cbCount(w.dep[bi])) ? j : bi, 0); w.fronts[i].lastD = type === "atk" ? 1 : -1;
      let win = 0, a = 0, ae = 0, g = 0, e = 0; const N = 60;
      for (let k = 0; k < N; k++){ const c = cbPlan(w, i, pct); win += c.win; a += cbCount(c.L)/Math.max(1, cbCount(c.g)); ae += cbCount(c.LE)/Math.max(1, cbCount(c.e)); g = cbCount(c.g); e = cbCount(c.e); }
      w.bfCd = 0; openBattle(foe, i); window._i = i; return {win:win/N, a:+(a/N).toFixed(2), ae:+(ae/N).toFixed(2), g, e}; }, [me, foe, type, pct]);
    await p.waitForTimeout(1200);
    await p.evaluate(() => { const g = document.querySelector('[data-cbgo]'); if (g) setTimeout(() => g.click(), 0); });
    let ok = await p.waitForFunction(() => BF.open && BF.open.api && BF.open.api.ff && BF.open.cb && BF.open.cb.real, null, {timeout:90000}).then(() => true, () => false);
    let res = null;
    if (ok){ await p.waitForTimeout(3000); await p.evaluate(() => { window._cb = BF.open.cb; });
      for (let k = 0; k < 50; k++){ const done = await p.evaluate(() => { const c = window._cb; if (c.end) return true; if (BF.open && BF.open.api) BF.open.api.ff(10); return c.end; }); if (done) break; await p.waitForTimeout(150); }
      res = await p.evaluate(() => { const c = window._cb; return {end:!!c.end, win:c.win, t:c.t, a:+(cbCount(c.a)/cbCount(c.g)).toFixed(2), ae:+(cbCount(c.ae)/cbCount(c.e)).toFixed(2), g:cbCount(c.g), e:cbCount(c.e)}; }); }
    out.push({run:`${me}-${foe} ${type} ${pct}`, plan, field:res, errs:errs.slice(0, 2)}); await p.close();
  }
  console.log(out.map(o => JSON.stringify(o)).join('\n')); await b.close();
})();
