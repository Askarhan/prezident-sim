// War length test: plays wars day by day in the real game code (headless Chromium) and prints how long they last.
// node tools/sim/warsim.js [max days] [runs per war]        (serves www/ itself; needs playwright)
// Each war is played several times (the game is random); the table shows the median and the range.
const { chromium } = require("playwright"), http = require("http"), fs = require("fs"), path = require("path");
const WWW = path.resolve(__dirname, "../../www"), MAX = +(process.argv[2] || 1000), REPS = +(process.argv[3] || 3);
// attacker, defender, label
const WARS = process.env.WARS ? JSON.parse(process.env.WARS) : [["ru", "kz", "большая против маленькой"], ["us", "mx", "большая против маленькой"], ["ru", "by", "большая против маленькой"],
  ["br", "ar", "большая против средней"], ["in", "pk", "большая против средней"], ["az", "kg", "маленькие"], ["uz", "kg", "маленькие"], ["kz", "kg", "маленькие, горы"],
  ["kr", "jp", "перевес в 2 раза"], ["fr", "de", "почти равные"], ["cn", "in", "Гималаи"]];
const HOOK = "window.SIM = {newGame, startWar, dayTick, nextMonth, daysIn, get S(){ return S; }, get ui(){ return ui; }};\n";
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/sim.html";
  if (p === "/sim.html"){ const s = fs.readFileSync(path.join(WWW, "index.html"), "utf8"), i = s.lastIndexOf("netGate();\n})();"); res.end(s.slice(0, i) + HOOK + s.slice(i)); return; }
  fs.readFile(path.join(WWW, p), (e, d) => { if (e){ res.statusCode = 404; res.end(); } else res.end(d); });
}).listen(0, async () => {
  const port = server.address().port, b = await chromium.launch(), pg = await b.newPage();
  await pg.goto(`http://localhost:${port}/sim.html`); await pg.waitForTimeout(1500);
  console.log("| Война | Тип | Просит мира | Итог |\n|---|---|---|---|");
  const fmt = n => n == null ? "—" : n < 60 ? `${n} дн.` : `${n} дн. (${(n/30).toFixed(1)} мес.)`;
  const med = a => { const v = a.filter(x => x != null).sort((x, y) => x - y); return v.length ? v[Math.floor(v.length/2)] : null; };
  for (const [a, d, label] of WARS){
    const runs = [];
    for (let k = 0; k < REPS; k++) runs.push(await pg.evaluate(([a, d, MAX, RAIL]) => {
      const X = SIM; X.newGame(a); X.ui.speed = 0; X.ui.tab = "army";
      const C = X.S.countries; if (!C[d]) return {err:"no " + d};
      if (RAIL) X.S.rails[d] = {left:0, total:360, done:true};
      const w = X.startWar(d, true); w.mode = "attack"; let offer = null, end = null, diff30 = null;
      for (let i = 0; i < MAX && !end; i++){
        X.S.pendingEvent = null; X.S.pendingVictory = null;
        X.S.day = (X.S.day||1) + 1; X.dayTick(); if (X.S.day > X.daysIn(X.S.month, X.S.year)) X.nextMonth();
        document.querySelectorAll(".modal").forEach(m => m.remove());
        if (w.offer && offer == null) offer = w.days; w.offer = false;
        if (w.days === 30) diff30 = w.fronts.map(f => +(f.diff || 0).toFixed(2));
        if (!X.S.wars.includes(w)) end = w.progress >= 100 ? "победа" : "поражение";
      }
      return {days:w.days, offer, end, p:w.fronts.map(f => Math.round(f.p)), diff30, col:w.colLost||0, hits:w.colHits||0, trip:w.trip};
    }, [a, d, MAX, !!process.env.RAIL]));
    if (runs[0].err){ console.log(`| ${a}—${d} | ${label} | ${runs[0].err} | |`); continue; }
    const ends = runs.map(r => r.end || "идёт"), wins = runs.filter(r => r.end === "победа").map(r => r.days);
    const range = v => v.length > 1 ? ` [${Math.min(...v)}–${Math.max(...v)}]` : "";
    const res = wins.length ? `победа ${wins.length}/${runs.length}, медиана ${fmt(med(wins))}${range(wins)}` : `${[...new Set(ends)].join("/")} (${runs.map(r => r.p.join("/")).join("; ")})`;
    console.log(`| ${a.toUpperCase()} — ${d.toUpperCase()} | ${label} | ${fmt(med(runs.map(r => r.offer)))} | ${res} |` + ` дорога ${runs[0].trip} дн., ударов ${runs.map(r => r.hits).join("/")}, потеряно ${runs.map(r => r.col).join("/")}` + (process.env.DIFF ? "  diff@30 " + JSON.stringify(runs[0].diff30) : ""));
  }
  await b.close(); server.close();
});
