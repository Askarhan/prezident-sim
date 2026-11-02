// How often real wars make pockets. For each war: first day and mean progress of a pocket, most pockets at once, biggest share; then random front positions as a geometry check.
// node tools/sim/pockets.js [maxDays] [INDEX=path env]     (needs a fresh www/ build and playwright)
const { chromium } = require("playwright"), http = require("http"), fs = require("fs"), path = require("path");
const WWW = path.resolve(__dirname, "../../www"), MAX = +(process.argv[2] || 700);
const WARS = [["ru","kz"],["us","mx"],["ru","by"],["br","ar"],["in","pk"],["fr","de"],["cn","in"],["kr","jp"],["de","pl"],["tr","ir"],["kz","kg"],["us","ca"]];
if (process.env.WARS) WARS.splice(0, 99, ...process.env.WARS.split(";").map(x => x.split(",")));
const HOOK = "window.SIM = {newGame, startWar, dayTick, nextMonth, daysIn, occField, frontLL, pocketCells, PK, get S(){ return S; }, get ui(){ return ui; }};\n";
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/sim.html";
  if (p === "/sim.html"){ const s = fs.readFileSync(process.env.INDEX || path.join(WWW, "index.html"), "utf8"), i = s.lastIndexOf("netGate();\n})();"); res.setHeader("content-type", "text/html"); res.end(s.slice(0, i) + HOOK + s.slice(i)); return; }
  fs.readFile(path.join(WWW, p), (e, d) => { if (e){ res.statusCode = 404; res.end(); } else res.end(d); });
}).listen(0, async () => {
  const REACH = process.env.REACH != null ? +process.env.REACH : null;
  const b = await chromium.launch(), pg = await b.newPage(); pg.on("pageerror", e => console.log("ERR", e.message.slice(0, 120)));
  await pg.goto(`http://localhost:${server.address().port}/sim.html`); await pg.waitForTimeout(1500);
  console.log("| Война | Итог, дн. | Первый котёл, день | Прогресс тогда | Макс. котлов | Макс. доля | Случайно: 30–50% | 50–70% | Котлов/пало/прорыв |\n|---|---|---|---|---|---|---|---|---|");
  const L = [], T = [], Win = []; let Lost = 0, Stuck = 0;
  for (const [a, d] of WARS){
    const r = await pg.evaluate(([a, d, MAX, REACH, NOPK, BRIEF]) => {
      const X = SIM; const R = window.TOT = window.TOT || {fell:0, m:0, out:0, cut:0}; if (REACH != null) X.PK.reach = REACH; if (NOPK) X.PK.min = 9; X.newGame(a); X.ui.speed = 0; X.ui.tab = "army"; if (!X.S.countries[d]) return {err:1};
      const w = X.startWar(d, true); w.mode = "attack"; let first = null, prog = null, left = null, most = 0, big = 0, end = "—";
      for (let i = 0; i < MAX; i++){
        X.S.pendingEvent = null; X.S.pendingVictory = null; X.S.day = (X.S.day||1) + 1; X.dayTick(); if (X.S.day > X.daysIn(X.S.month, X.S.year)) X.nextMonth();
        document.querySelectorAll(".modal").forEach(m => m.remove()); w.offer = false;
        const P = w.pockets || []; if (P.length && first == null){ first = w.days; prog = Math.round(w.fronts.reduce((s, f) => s + Math.max(0, f.p), 0)/w.fronts.length); }
        most = Math.max(most, P.length); P.forEach(p => { big = Math.max(big, p.share); });
        if (!X.S.wars.includes(w)){ end = (w.progress >= 100 ? "+" : "−") + w.days; left = first == null ? null : w.days - first; break; }
      }
      const F = X.occField(X.S.player, d, X.frontLL(w, false)), n = w.fronts.length, sweep = (lo, hi) => { let c = 0; const R = 200; for (let i = 0; i < R; i++){ const v = Array.from({length:n}, () => lo + Math.random()*(hi - lo)); if (X.pocketCells(F, v).length) c++; } return BRIEF ? "" : Math.round(c/R*100) + "%"; };
      R.fell += w.pkFell||0; R.m += w.pkFellM||0; R.out += w.pkOut||0; R.cut += w.pkCut||0; return {fin:w.fronts.map(f => Math.round(f.p)).join("/") + " p" + Math.round(w.progress) + " пасс" + (w.pockets||[]).length + " " + (w.phase||"") + (w.mode||""), fell:w.pkFell||0, out:w.pkOut||0, pn:w.pkN||0, n, end, left, first, prog, most, big:Math.round(big*100), s1:sweep(30, 50), s2:sweep(50, 70)};
    }, [a, d, MAX, REACH, !!process.env.NOPK, !!process.env.BRIEF]);
    if (r.first != null) L.push(r.prog), T.push(r.left);
    if (r.end[0] === "+") Win.push(+r.end.slice(1)); else if (r.end[0] === "−") Lost++; else Stuck++;
    if (process.env.BRIEF) continue;
    console.log(r.err ? `| ${a}>${d} | нет страны |` : `| ${a}>${d} (${r.n}) | ${r.end} | ${r.first ?? "нет"} | ${r.prog ?? "—"} | ${r.most} | ${r.big}% | ${r.s1} | ${r.s2} | ${r.pn}/${r.fell}/${r.out} | ${r.fin} |`);
  }
  console.log(`${process.env.NOPK ? "без котлов" : "с котлами"}: побед ${Win.length} (медиана ${Win.sort((x, y) => x - y)[Win.length >> 1]} дн.), поражений ${Lost}, не кончилось ${Stuck}`);
  console.log("всего", JSON.stringify(await pg.evaluate(() => window.TOT)));
  console.log(`reach ${REACH ?? "как в игре"}: котёл в ${L.length} из ${WARS.length} войн, прогресс [${L.sort((x, y) => x - y)}], дней до конца войны [${T.sort((x, y) => x - y)}]`);
  await b.close(); server.close();
});
