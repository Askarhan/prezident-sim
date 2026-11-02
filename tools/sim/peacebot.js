// Peaceful path test: a bot plays N years without any war of its own: embassies, trade, alliances, gestures, union states, referendums. Real game code in headless Chromium.
// node tools/sim/peacebot.js [years] [runs] [countries]        (needs a fresh www/ build and playwright)
const { chromium } = require("playwright"), http = require("http"), fs = require("fs"), path = require("path");
const WWW = path.resolve(__dirname, "../../www"), YEARS = +(process.argv[2] || 15), REPS = +(process.argv[3] || 1), LIST = (process.argv[4] || "us,ru,fr,kz,kg").split(",");
const HOOK = "window.SIM = {newGame, dayTick, nextMonth, daysIn, dipAct, unionGate, refGate, refChance, infOf, infTarget, peaceFit, embCost, visitCost, cultCost, aidCost, investSize, get S(){ return S; }, get ui(){ return ui; }, me};\n";
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/sim.html";
  if (p === "/sim.html"){ const s = fs.readFileSync(path.join(WWW, "index.html"), "utf8"), i = s.lastIndexOf("netGate();\n})();"); res.setHeader("content-type", "text/html"); res.end(s.slice(0, i) + HOOK + s.slice(i)); return; }
  fs.readFile(path.join(WWW, p), (e, d) => { if (e){ res.statusCode = 404; res.end(); } else res.end(d); });
}).listen(0, async () => {
  const b = await chromium.launch(), pg = await b.newPage(); pg.on("pageerror", e => console.log("ERR", e.message.slice(0, 140)));
  await pg.goto(`http://localhost:${server.address().port}/sim.html`); await pg.waitForTimeout(1500);
  console.log("| Страна | Вошло | Союзных | Союзов | Провалов | Первое вступление, лет | ВВП ×  | Война на нас | Итог |\n|---|---|---|---|---|---|---|---|---|");
  for (const c of LIST) for (let k = 0; k < REPS; k++){
    const r = await pg.evaluate(([c, YEARS]) => {
      const X = SIM, S = () => X.S; X.newGame(c); X.ui.speed = 0; X.ui.tab = "army"; const g0 = X.me().gdp; let first = null, fails = 0, day = 0, wars = 0, mon = 0;
      const others = () => Object.values(S().countries).filter(x => !x.owner && x.id !== c && !S().wars.some(w => w.enemy === x.id));
      for (; day < YEARS*360 && !S().over; day++){
        S().pendingEvent = null; document.querySelectorAll(".modal").forEach(m => m.remove()); S().approval = Math.max(S().approval, 55); S().stability = Math.max(S().stability, 50); S().electionIn = 48;
        S().wars.forEach(w => { w.offer = false; }); if (S().pendingVictory) delete S().pendingVictory;
        if (S().day === 1){ mon++; const list = others().filter(x => X.peaceFit(x) && x.rel > -30).sort((a, c2) => a.gdp - c2.gdp || 0).slice(0, 4), spend = () => S().treasury > X.me().gdp/24;   // three or four targets at a time, smallest first; a person would pick the same
          list.forEach(x => { const P = a => { if (spend()) X.dipAct(a, x.id); };
            if (!x.emb) P("emb"); if (x.emb && !x.nap && x.rel >= 10) P("nap"); if (x.rel >= 20 && !x.trade && !x.sanction) x.trade = true; if (x.rel >= 60 && !x.ally) x.ally = true;
            P("visit"); P("cult"); if (!(x.aidCd > 0)) P("aid"); if (x.rel >= 10 && mon % 6 === 0) P("invest");
            if (!x.union && X.unionGate(x).ok) P("union"); const run = S().refs && S().refs[x.id]; if (run && run.pen >= 8) P("ref"); else if (!run && x.union && X.refGate(x).ok && X.refChance(x) >= 40){ const before = S().peaceJ || 0; P("ref"); } });
        }
        const pj = S().peaceJ || 0, ft = S().log[0] && S().log[0].text; S().day = (S().day||1) + 1; X.dayTick(); if (S().day > X.daysIn(S().month, S().year)) X.nextMonth();
        if ((S().peaceJ || 0) > pj && first == null) first = +(day/360).toFixed(1); if (S().log[0] && S().log[0].text !== ft && /провален/.test(S().log[0].text)) fails++; wars = Math.max(wars, S().wars.length);
      }
      const a = Object.values(S().countries);
      return {j:S().peaceJ || 0, u:a.filter(x => x.union).length, al:a.filter(x => x.ally && !x.owner).length, fails, first, g:+(X.me().gdp/g0).toFixed(1), wars, over:S().over ? `конец на дне ${day}: ${(S().overTitle || S().overRank || "").slice(0, 40)}` : ""};
    }, [c, YEARS]);
    console.log(`| ${c} | ${r.j} | ${r.u} | ${r.al} | ${r.fails} | ${r.first ?? "—"} | ${r.g} | ${r.wars} | ${r.over} |`);
  }
  await b.close(); server.close();
});
