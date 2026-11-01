const {chromium} = require('playwright'); const S = process.argv[2];
const RUNS = JSON.parse(process.argv[3]);   // [[me, foe, type, wxKind, night, shotAt], ...]
(async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}); const out = [];
  for (const [me, foe, type, wk, night, shotAt] of RUNS){
    const p = await b.newPage({viewport:{width:800, height:500}}); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await p.goto('http://localhost:8765/t.html'); await p.waitForTimeout(1500);
    await p.evaluate(([me, foe, type]) => { newGame(me); startWar(foe, true); const w = S.wars[0];
      for (let k = 0; k < 40; k++){ S.day = (S.day||1) + 1; dayTick(); if (S.day > daysIn(S.month, S.year)) nextMonth(); }
      const i = w.fronts.reduce((bi, f, j) => (w.fronts[bi].p >= 100 || f.p < 100 && cbCount(w.dep[j]) > cbCount(w.dep[bi])) ? j : bi, 0); w.fronts[i].lastD = type === "def" ? -1 : 1;
      w.bfCd = 0; openBattle(foe, i); }, [me, foe, type]);
    await p.waitForTimeout(1200);
    const card = await p.evaluate(([type, wk, night]) => { const st = BF.open; st.cbt = type; st.wx = {kind:wk, night}; const t = document.querySelector('.bf-cmd-wx'); const g = document.querySelector('[data-cbgo]'); if (g) setTimeout(() => g.click(), 0); return t && t.textContent; }, [type, wk, night]);
    const ok = await p.waitForFunction(() => BF.open && BF.open.api && BF.open.api.ff && BF.open.cb && BF.open.cb.real, null, {timeout:90000}).then(() => true, () => false);
    let res = null, mid = null;
    if (ok){ await p.waitForTimeout(3000); await p.evaluate(() => { window._cb = BF.open.cb; });
      if (shotAt){ await p.evaluate(s => BF.open.api.ff(s), shotAt); await p.waitForTimeout(700); mid = await p.evaluate(() => BF.open.api.battle()); await p.screenshot({path:`${S}/w_${type}.png`}); }
      for (let k = 0; k < 50; k++){ const done = await p.evaluate(() => { const c = window._cb; if (c.end) return true; if (BF.open && BF.open.api) BF.open.api.ff(10); return c.end; }); if (done) break; await p.waitForTimeout(150); }
      res = await p.evaluate(() => { const c = window._cb; return {type:c.type, end:!!c.end, win:c.win, t:c.t, a:cbCount(c.a)+'/'+cbCount(c.g), ae:cbCount(c.ae)+'/'+cbCount(c.e)}; }); }
    out.push({run:`${me}-${foe} ${type} ${wk}${night ? '+night' : ''}`, card, mid, res, errs:errs.slice(0, 3)}); await p.close();
  }
  console.log(out.map(o => JSON.stringify(o)).join('\n')); await b.close();
})();
