// World conquest test: a bot plays one country for N years, attacks the weakest independent country and annexes it. Real game code in headless Chromium.
// node tools/sim/conquest.js [years] [runs] [countries, comma separated]        (needs a fresh www/ build and playwright; INDEX=path tests another build)
const { chromium } = require("playwright"), http = require("http"), fs = require("fs"), path = require("path");
const WWW = path.resolve(__dirname, "../../www"), YEARS = +(process.argv[2] || 10), REPS = +(process.argv[3] || 2), LIST = (process.argv[4] || "us,ru,cn,fr,kz").split(",");
const HOOK = "window.SIM = {newGame, startWar, dayTick, nextMonth, daysIn, settleVictory, get S(){ return S; }, get ui(){ return ui; }};\n";
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/sim.html";
  if (p === "/sim.html"){ const s = fs.readFileSync(process.env.INDEX || path.join(WWW, "index.html"), "utf8"), i = s.lastIndexOf("netGate();\n})();"); res.setHeader("content-type", "text/html"); res.end(s.slice(0, i) + HOOK + s.slice(i)); return; }
  fs.readFile(path.join(WWW, p), (e, d) => { if (e){ res.statusCode = 404; res.end(); } else res.end(d); });
}).listen(0, async () => {
  const b = await chromium.launch(), pg = await b.newPage(); pg.on("pageerror", e => console.log("ERR", e.message.slice(0, 120)));
  await pg.goto(`http://localhost:${server.address().port}/sim.html`); await pg.waitForTimeout(1500);
  console.log("| Страна | Захвачено стран | Первая победа, дн. | Топливо на старте | Итог |\n|---|---|---|---|---|");
  for (const c of LIST) for (let k = 0; k < REPS; k++){
    const r = await pg.evaluate(([c, YEARS]) => {
      const X = SIM; X.newGame(c); X.ui.speed = 0; X.ui.tab = "army"; const S = () => X.S; let won = 0, first = null, day = 0, fuel0 = null, over = null, cool = 0;
      const free = () => Object.values(S().countries).filter(x => !x.owner && x.id !== c && !x.puppet && !x.ally && !S().wars.some(w => w.enemy === x.id));
      for (; day < YEARS*360 && !S().over; day++){
        S().pendingEvent = null; document.querySelectorAll(".modal").forEach(m => m.remove());
        if (S().pendingVictory){ X.settleVictory(S().pendingVictory.iso, "annex"); won++; if (first == null) first = day; cool = 20; document.querySelectorAll(".modal").forEach(m => m.remove()); }
        if (!S().wars.length && --cool <= 0){ const f = free().sort((a, b) => a.gdp - b.gdp)[0]; if (!f) break; const w = X.startWar(f.id, true); if (w) w.mode = "attack"; }
        S().wars.forEach(w => { w.offer = false; }); S().approval = Math.max(S().approval, 55); S().stability = Math.max(S().stability, 50); S().electionIn = 48;   // the bot plays only the war: home politics stays out of this test
        S().day = (S().day||1) + 1; X.dayTick(); if (S().day > X.daysIn(S().month, S().year)) X.nextMonth();
        if (day === 45 && S().wars[0]) fuel0 = +(S().wars[0].fuel ?? 1).toFixed(2);
      }
      return {won, first, fuel0, inf:Math.round(S().infamy||0), coal:S().wars.filter(w=>w.coal).length, ll:S().wars.reduce((a,w)=>a+(w.llGot||0),0), over:S().over ? `конец на дне ${day}: ${(S().over.title || S().over.reason || JSON.stringify(S().over)).slice(0, 50)}` : `${Math.round(day/360)} лет`};
    }, [c, YEARS]);
    console.log(`| ${c} | ${r.won} | ${r.first ?? "—"} | ${r.fuel0 ?? "—"} | инф.${r.inf} коал.${r.coal} лл.${r.ll} ${r.over} |`);
  }
  await b.close(); server.close();
});
