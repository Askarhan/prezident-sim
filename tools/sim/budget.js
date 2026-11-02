// Is a big country really rich? Economy bot + (NEEDS=1) state programs keep the six needs at norm; no wars. Prints money flow by 5 years.
// node tools/sim/budget.js [years] [countries]. NEEDS=0 is the old bot, without programs. NOTRADE=1: no trade deals. INDEX=path tests another build.
const { chromium } = require("playwright"), http = require("http"), fs = require("fs"), path = require("path");
const WWW = path.resolve(__dirname, "../../www"), YEARS = +(process.argv[2] || 15), LIST = (process.argv[3] || "us,fr,kg").split(","), NEEDS = process.env.NEEDS !== "0", NOTRADE = !!process.env.NOTRADE;
const HOOK = fs.readFileSync(path.join(__dirname, "econ-bot.js"), "utf8") + "window.SIM_B = BUILDINGS; window.SIM = {newGame, dayTick, nextMonth, daysIn, dipAct, act, budget, canBuild, buildCost, powerBalance, selfSuff, startResearch, researching, researchSlots, tlv, techCostLv, techReqFail, TECH_BY, objCount, NEEDS, FAC, facCov, facNorm, facCanStart, startProg, facProgCost, needCov, tech, growthMonthly, get S(){ return S; }, get ui(){ return ui; }, me};\n";
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/sim.html";
  if (p === "/sim.html"){ const s = fs.readFileSync(process.env.INDEX || path.join(WWW, "index.html"), "utf8"), i = s.lastIndexOf("netGate();\n})();"); r.setHeader("content-type", "text/html"); r.end(s.slice(0, i) + HOOK + s.slice(i)); return; }
  fs.readFile(path.join(WWW, p), (e, d) => { if (e){ r.statusCode = 404; r.end(); } else r.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch(), pg = await b.newPage(); pg.on("pageerror", e => console.log("ERR", e.message.slice(0, 140)));
  await pg.goto(`http://localhost:${srv.address().port}/sim.html`); await pg.waitForTimeout(1500);
  for (const c of LIST){ const r = await pg.evaluate(([c, YEARS, NEEDS, NT]) => {
      const X = Object.create(SIM), S = () => SIM.S; if (NT) X.act = (a, b) => a === "trade" ? 0 : SIM.act(a, b); X.newGame(c); if (NT) Object.values(S().countries).forEach(x => { x.trade = false; }); X.ui.speed = 0; X.ui.tab = "army"; const g0 = X.me().gdp, out = [], why = {}, seen = {}; let spent = 0, net = 0, mon = 0;
      const others = () => Object.values(S().countries).filter(x => !x.owner && x.id !== c && !S().wars.some(w => w.enemy === x.id));
      const row = y => { const g = X.me().gdp, n = Object.values(S().countries).filter(x => x.trade && !x.owner).length, cov = X.NEEDS.map(n => `${n[0].slice(0, 4)} ${Math.round(X.needCov(n[0])*100)}`).join(" ");
        out.push(`${y}г ВВП ${Math.round(g)} (×${(g/g0).toFixed(1)}) казна ${S().treasury.toFixed(1)} (${(S().treasury/g*100).toFixed(1)}%) долг ${(S().debt/g*100).toFixed(0)}% | сальдо/год ${(mon ? net/mon*12/g*100 : X.budget().net*12/g*100).toFixed(2)}% ВВП, программы ${(mon ? spent/mon*12/g*100 : 0).toFixed(2)}% | ${cov} | волн ${Math.round(S().unrest||0)} | договоров ${n}, рост ${(X.growthMonthly()*1200).toFixed(1)}%, техи ${((0.00125*X.tech("ai") + 0.0004*X.tech("fusion") + 0.00025*X.tech("gene"))*1200).toFixed(1)}%`); spent = net = mon = 0; };
      row(0);
      for (let day = 1; day <= YEARS*360 && !S().over; day++){
        if (S().day === 1){ mon++; net += X.budget().net || 0;
          if (NEEDS) X.NEEDS.forEach(n => Object.keys(X.FAC).filter(id => n[2].includes(X.FAC[id].cat) && !X.FAC[id].mil).forEach(id => {
            if (X.facCov(id)/X.facNorm(id) >= 1 || (S().progs||[]).some(p => p.id === id)) return; const k = X.facCanStart(id), cost = X.facProgCost(id);
            if (!k.ok){ const w = (k.why||"?").slice(0, 28); why[w] = (why[w]||0) + 1; return; } if (S().treasury < cost*1.1){ why.money = (why.money||0) + 1; return; } X.startProg(id); spent += cost; }));
          simEcon(X, others, seen); }
        S().pendingEvent = null; document.querySelectorAll(".modal").forEach(m => m.remove()); S().approval = Math.max(S().approval, 55); S().stability = Math.max(S().stability, 50); S().electionIn = 48;
        S().day = (S().day||1) + 1; X.dayTick(); if (S().day > X.daysIn(S().month, S().year)) X.nextMonth();
        if (day % 1800 === 0) row(day/360); }
      const B = X.budget(), G = X.me().gdp/12, P = k => `${k} ${(B[k]/G*100).toFixed(1)}`; out.push("доходы % ВВП: " + ["taxes","trade","objects","commod","arms","tourism","other"].map(P).join(" ") + " | всего " + (B.income/G*100).toFixed(1) + " | расходы: " + ["sectors","army","pens","wages","upkeep","interest","science","imports"].map(P).join(" ") + " | всего " + (B.spend/G*100).toFixed(1));
      return {c, out, why:JSON.stringify(why).replace(/"/g, ""), seen:JSON.stringify(seen).replace(/"/g, ""), over:S().over ? (S().overTitle || "конец") : ""}; }, [c, YEARS, NEEDS, NOTRADE]);
    console.log(r.c, NEEDS ? "с программами" : "без программ", NOTRADE ? "без договоров" : "", r.over); r.out.forEach(l => console.log(" ", l)); console.log("  отказы", r.why.slice(0, 200)); console.log("  стройка", r.seen.slice(0, 200)); }
  await b.close(); srv.close(); });
