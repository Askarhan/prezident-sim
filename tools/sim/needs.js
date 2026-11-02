// Idle country for N years: population, the six needs, approval, unemployment. node tools/sim/needs.js [years] [countries]. INDEX=path tests another build.
const { chromium } = require("playwright"), http = require("http"), fs = require("fs"), path = require("path");
const WWW = path.resolve(__dirname, "../../www"), YEARS = +(process.argv[2] || 10), LIST = (process.argv[3] || "us,ru,fr,kz,kg").split(",");
const HOOK = "window.SIM = {newGame, dayTick, nextMonth, daysIn, get S(){ return S; }, get ui(){ return ui; }, me, NEEDS, needCov, popRate, draftCap, wealthK, approvalTarget: typeof approvalTarget !== 'undefined' ? approvalTarget : null, facFx};\n";
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/sim.html";
  if (p === "/sim.html"){ const s = fs.readFileSync(process.env.INDEX || path.join(WWW, "index.html"), "utf8"), i = s.lastIndexOf("netGate();\n})();"); r.setHeader("content-type", "text/html"); r.end(s.slice(0, i) + HOOK + s.slice(i)); return; }
  fs.readFile(path.join(WWW, p), (e, d) => { if (e){ r.statusCode = 404; r.end(); } else r.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch(), pg = await b.newPage(); pg.on("pageerror", e => console.log("ERR", e.message.slice(0, 140)));
  await pg.goto(`http://localhost:${srv.address().port}/sim.html`); await pg.waitForTimeout(1500);
  for (const c of LIST){ const r = await pg.evaluate(([c, Y]) => { const X = SIM, S = () => X.S; X.newGame(c); X.ui.speed = 0; const out = [], p0 = X.me().pop, g0 = X.me().gdp, a0 = X.me().army; const row = y => out.push(`y${y} pop${(X.me().pop/p0).toFixed(2)} gdp${(X.me().gdp/g0).toFixed(2)} K${X.wealthK().toFixed(2)} appr${Math.round(S().approval)} st${Math.round(S().stability)} u${(S().unemp||0).toFixed(1)} fxA${X.facFx("appr").toFixed(1)} ` + X.NEEDS.map(n => n[0].slice(0,2) + Math.round(X.needCov(n[0])*100)).join(" "));
      row(0); for (let m = 1; m <= Y*12; m++){ for (let d = 0; d < 31 && !S().gameOver; d++){ S().pendingEvent = null; document.querySelectorAll(".modal").forEach(e => e.remove()); S().electionIn = 48; S().approval = Math.max(S().approval, 40); S().stability = Math.max(S().stability, 40); S().day = (S().day||1) + 1; X.dayTick(); if (S().day > X.daysIn(S().month, S().year)) X.nextMonth(); } if (m % 60 === 0) row(m/12); }
      return {c, army:Math.round(a0), cap:Math.round(X.draftCap()), out}; }, [c, YEARS]); console.log(c, "army", r.army, "cap", r.cap); r.out.forEach(l => console.log(" ", l)); }
  await b.close(); srv.close(); });
