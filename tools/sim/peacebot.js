// Peaceful path test: a bot plays N years without any war of its own: embassies, trade, alliances, gestures, union states, referendums. Real game code in headless Chromium.
// ECON=1: the bot also develops the economy like a person: builds power, mines, factories, roads, bridges, airports, buys materials, researches, signs trade deals, funds education and infrastructure.
// node tools/sim/peacebot.js [years] [runs] [countries]        (needs a fresh www/ build and playwright)
const { chromium } = require("playwright"), http = require("http"), fs = require("fs"), path = require("path");
const WWW = path.resolve(__dirname, "../../www"), YEARS = +(process.argv[2] || 15), REPS = +(process.argv[3] || 1), LIST = (process.argv[4] || "us,ru,fr,kz,kg").split(",");
const HOOK = "window.SIM_B = BUILDINGS; window.SIM = {newGame, dayTick, nextMonth, daysIn, dipAct, unionGate, refGate, refChance, infOf, infTarget, peaceFit, embCost, visitCost, cultCost, aidCost, investSize, act, budget, canBuild, buildCost, powerBalance, selfSuff, startResearch, researching, researchSlots, tlv, techCostLv, techReqFail, TECH_BY, objCount, maxSlots, growthMonthly, get S(){ return S; }, get ui(){ return ui; }, me};\n";
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/sim.html";
  if (p === "/sim.html"){ const s = fs.readFileSync(path.join(WWW, "index.html"), "utf8"), i = s.lastIndexOf("netGate();\n})();"); res.setHeader("content-type", "text/html"); res.end(s.slice(0, i) + HOOK + s.slice(i)); return; }
  fs.readFile(path.join(WWW, p), (e, d) => { if (e){ res.statusCode = 404; res.end(); } else res.end(d); });
}).listen(0, async () => {
  const b = await chromium.launch(), pg = await b.newPage(); pg.on("pageerror", e => console.log("ERR", e.message.slice(0, 140)));
  await pg.goto(`http://localhost:${server.address().port}/sim.html`); await pg.waitForTimeout(1500);
  const ECON = !!process.env.ECON; console.log("| Страна | Вошло | Союзных | Союзов | Провалов | Первое вступление, лет | ВВП ×  | Война на нас | Итог |\n|---|---|---|---|---|---|---|---|---|");
  for (const c of LIST) for (let k = 0; k < REPS; k++){
    const r = await pg.evaluate(([c, YEARS, ECON]) => {
      const X = SIM, S = () => X.S; X.newGame(c); X.ui.speed = 0; X.ui.tab = "army"; const g0 = X.me().gdp; let first = null, fails = 0, day = 0, wars = 0, mon = 0, trace = [], gate = null, seen = {};
      const econ = () => { const s = S(), net = X.budget().net || 0;
        ["egov", "automation", "smartgrid", "fintech", "ai"].forEach(id => { const t = X.TECH_BY[id], lv = X.tlv(id) + 1; if (lv > t.max || X.researching(id) || (s.rq||[]).length >= X.researchSlots()) return; if (!X.techReqFail(t, lv) && s.rp >= X.techCostLv(t, lv)) X.startResearch(id); });
        const lift = net > 0.0002*X.me().gdp/12; ["edu", "infra"].forEach(k => { s.sectors[k] = lift ? Math.min(1.25, s.sectors[k] + .05) : Math.max(1, s.sectors[k] - .05); });
        others().forEach(x => { if (x.rel >= 20 && !x.trade && !x.sanction) X.act("trade", x.id); });
        others().filter(x => !x.trade && x.rel > -30).sort((a, b) => b.rel - a.rel).slice(0, 3).forEach(x => { if (!x.emb) X.dipAct("emb", x.id); X.dipAct("visit", x.id); X.dipAct("cult", x.id); });
        const want = []; if (X.powerBalance() < 0){ want.push("hydro"); if (X.objCount("solar") < 12) want.push("solar"); want.push("power"); } [["metal", "mine"], ["food", "farm"], ["oil", "oil"]].forEach(([r, b]) => { if (X.selfSuff(r) < 95) want.push(b); });
        if (X.objCount("institute") < 3) want.push("institute"); want.push("factory", "highway", "airport", "bridge", "port", "chem", "auto", "chips");
        for (let n = 0; n < 2 && s.queue.length < X.maxSlots(); n++){ let done = false; for (const id of want){ if (s.treasury < X.buildCost(id)*1.2) continue; const k = X.canBuild(id);
          if (k.ok){ X.act("build", id); seen[id] = (seen[id] || 0) + 1; done = true; break; } if (k.mat){ Object.keys((s.stock && BM(id)) || {}).forEach(r => { if (s.stock[r] < BM(id)[r] && s.treasury > 0) X.act("buy", r); }); break; } } if (!done) break; } };
      const BM = id => (SIM_B[id] || {}).mat || {};
      const others = () => Object.values(S().countries).filter(x => !x.owner && x.id !== c && !S().wars.some(w => w.enemy === x.id));
      for (; day < YEARS*360 && !S().over; day++){
        if (day % 1800 === 0) trace.push(`${day/360}:${Math.round(X.me().gdp)}/${(X.growthMonthly()*1200).toFixed(1)}%/${S().treasury.toFixed(1)}`); if (gate == null && others().some(x => X.peaceFit(x))) gate = +(day/360).toFixed(1);
        if (ECON && S().day === 1) econ();
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
      return {j:S().peaceJ || 0, u:a.filter(x => x.union).length, al:a.filter(x => x.ally && !x.owner).length, fails, first, g:+(X.me().gdp/g0).toFixed(1), wars, gate, trace:trace.join(" "), seen:JSON.stringify(seen).replace(/"/g, ""), over:S().over ? `конец на дне ${day}: ${(S().overTitle || S().overRank || "").slice(0, 40)}` : ""};
    }, [c, YEARS, ECON]);
    console.log(`| ${c} | ${r.j} | ${r.u} | ${r.al} | ${r.fails} | ${r.first ?? "—"} | ${r.g} | ${r.wars} | ${r.over} |`); if (ECON) console.log(`  годы:ВВП/рост/казна ${r.trace}; лестница с ${r.gate ?? "—"} г.; стройка ${r.seen}`);
  }
  await b.close(); server.close();
});
