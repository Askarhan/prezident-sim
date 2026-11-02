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
  await p.waitForTimeout(600); await p.getByText('Я сам разберусь').click({timeout:3000}).catch(() => {}); await p.waitForTimeout(300);
  const L = await p.evaluate(() => { const o = {}, M = () => { for (let i = 0; i < 1; i++) aiTurn(); S.turn++; }, kz = C().kz, us = C().us, de = C().de; S.treasury = 5000;
    us.emb = us.ally = true; us.rel = 80; us.inf = 80; o.big = unionGate(us).why;
    o.gate0 = refGate(kz).why; dipAct('union', 'kz'); o.union = [kz.union, kz.unionT]; o.gate1 = refGate(kz).why; const tr = S.treasury; M(); o.tax = +(S.treasury - tr).toFixed(2);
    for (let i = 0; i < 12; i++) M(); kz.inf = Math.max(kz.inf, 75); o.chance = refChance(kz); o.parts = refParts(kz).join(' ; '); dipAct('ref', 'kz'); o.run = S.refs.kz;
    const R0 = Math.random; Math.random = () => .995; for (let i = 0; i < 6; i++) M(); Math.random = R0; o.fail = [kz.owner || null, kz.refT - S.turn, Math.round(kz.inf), S.log[0].text.slice(0, 60)];
    S.turn = kz.refT; kz.inf = 80; kz.rel = 80; dipAct('ref', 'kz'); const g0 = me().gdp; Math.random = () => .01; for (let i = 0; i < 6; i++) M(); Math.random = R0; occupationTurn();
    o.win = [kz.owner, joined('kz'), garrisonNeed(S.occupied.kz), Math.round(me().gdp - g0), S.peaceJ, S.log.find(q => /Референдум/.test(q.text)).text.slice(0, 70)];
    de.ally = true; de.union = true; de.unionT = S.turn - 20; de.rel = 80; de.inf = 80; for (let i = 0; i < 3; i++) M(); o.de = [de.union, de.ally]; de.inf = 10; M(); o.deOut = de.union;
    return o; });
  console.log(JSON.stringify(L).slice(0, 900));
  await p.evaluate(() => { const c = C().de; c.ally = c.union = true; c.gdp = 50; c.inf = 80; c.rel = 80; c.unionT = 0; const q = [...document.querySelectorAll('button')].find(x => /сам разберусь/.test(x.textContent)); if (q) q.click(); ui.ctry = 'de'; ui.ctab = 'dip'; ui.tab = 'country'; render(); }); await p.waitForTimeout(500);
  const c = await p.evaluate(() => { const o = {}, f = C().fr, R0 = Math.random, R = infRival(); o.rival = R && R.id; f.union = f.ally = true; f.gdp = 100; f.inf = 80; f.rel = 80; f.unionT = -20; S.treasury = 5000; S.refs = {fr:{left:6}}; Math.random = () => .01; rivalMonth(); Math.random = R0; o.pen = S.refs.fr.pen; const c0 = refChance(f); dipAct('ref', 'fr'); o.reply = [c0, refChance(f), S.refs.fr.pen]; delete S.refs.fr; f.inf = 40; Math.random = () => .005; rivalMonth(); Math.random = R0; o.coup = [f.union, f.ally]; return o; });
  console.log(JSON.stringify(c));
  await p.screenshot({path:D + '/card.png'});
  await p.evaluate(() => { ui.tab = 'map'; ui.mapMode = 'inf'; ui.mapSel = null; render(); }); await p.waitForTimeout(900); await p.screenshot({path:D + '/mapinf.png'}); console.log(c, errs.slice(0, 3).join(' | ')); await b.close();
})();
