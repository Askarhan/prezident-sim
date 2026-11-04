// A player who does nothing: no buildings, no sales, no laws. Shows what money still flows by itself and which budget lines cause it.
// node tools/sim/idle.js [years] [countries]. INDEX=path tests another build. Money per day in millions.
const { chromium } = require("playwright"), http = require("http"), fs = require("fs"), path = require("path");
const WWW = path.resolve(__dirname, "../../www"), YEARS = +(process.argv[2] || 10), LIST = (process.argv[3] || "kg,de").split(",");
const HOOK = "window.SIM = {newGame, dayTick, nextMonth, daysIn, budget, mg, get S(){ return S; }, get ui(){ return ui; }, me};\n";
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/sim.html";
  if (p === "/sim.html"){ const s = fs.readFileSync(process.env.INDEX || path.join(WWW, "index.html"), "utf8"), i = s.lastIndexOf("netGate();\n})();"); r.setHeader("content-type", "text/html"); r.end(s.slice(0, i) + HOOK + s.slice(i)); return; }
  fs.readFile(path.join(WWW, p), (e, d) => { if (e){ r.statusCode = 404; r.end(); } else r.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch(), pg = await b.newPage(); pg.on("pageerror", e => console.log("ERR", e.message.slice(0, 140)));
  await pg.goto(`http://localhost:${srv.address().port}/sim.html`); await pg.waitForTimeout(1500);
  for (const c of LIST){ const out = await pg.evaluate(([c, YEARS]) => { const X = SIM, S = () => X.S, out = []; X.newGame(c); X.ui.speed = 0; let B0 = X.budget();
      const day = v => Math.round(v*1000/30*10)/10;
      const row = y => { const B = X.budget(), ch = Object.keys(B).filter(k => typeof B[k] === "number" && !["income","spend","net"].includes(k) && Math.abs(day(B[k]) - day(B0[k])) >= 2).map(k => `${k} ${day(B0[k])}→${day(B[k])}`).join(", ");
        out.push(`${y}г казна ${S().treasury.toFixed(2)} долг ${S().debt.toFixed(0)} экон ${Math.round(X.mg())} в день ${day(B.net)} | ${ch}`); };
      row(0);
      for (let d = 1; d <= YEARS*360 && !S().over; d++){ S().pendingEvent = null; document.querySelectorAll(".modal").forEach(m => m.remove()); S().approval = Math.max(S().approval, 55); S().stability = Math.max(S().stability, 50); S().electionIn = 48;
        S().day = (S().day||1) + 1; X.dayTick(); if (S().day > X.daysIn(S().month, S().year)) X.nextMonth(); if ([30, 180, 360, 1800, 3600].includes(d)) row(d/360); }
      if (S().over) out.push("конец: " + (S().overTitle || "")); return out; }, [c, YEARS]);
    console.log(c); out.forEach(l => console.log(" ", l.slice(0, 330))); }
  await b.close(); srv.close(); });
