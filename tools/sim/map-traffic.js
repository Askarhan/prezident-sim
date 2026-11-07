// Headless check of life on the WebGL map, batch 3: sea lanes, carriers, trains, smoke at a front, background ships and planes. Shots e.png (world) and f.png (closer).
// Run: node tools/sim/map-traffic.js [shot dir|-] [country=ru] [foe=kz]
const { chromium } = require("playwright"), http = require("http"), fs = require("fs"), path = require("path");
const WWW = path.resolve(__dirname, "../../www"), OUT = process.argv[2] && process.argv[2] !== "-" ? process.argv[2] : "/tmp/kab-shots"; fs.mkdirSync(OUT, {recursive:true});
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/sim.html";
  if (p === "/sim.html"){ const s = fs.readFileSync(path.join(WWW, "index.html"), "utf8"), i = s.lastIndexOf("netGate();\n})();"); r.setHeader("content-type", "text/html; charset=utf-8"); r.end(s.slice(0, i) + "\nwindow.EV = s => eval(s);\n" + s.slice(i)); return; }
  fs.readFile(path.join(WWW, p), (e, d) => { if (e){ r.statusCode = 404; r.end(); return; } const T = {js:"text/javascript", json:"application/json", svg:"image/svg+xml", webp:"image/webp", png:"image/png", jpg:"image/jpeg", glb:"model/gltf-binary", ogg:"audio/ogg", css:"text/css"}[p.split(".").pop()]; if (T) r.setHeader("content-type", T); r.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg = await b.newPage({viewport:{width:844, height:390}}), errs = new Set();
  pg.on("pageerror", e => errs.add("ERR " + String(e.message).slice(0, 130))); pg.on("console", m => { if (m.type() === "error" && !/404|Failed to load/.test(m.text())) errs.add("CON " + m.text().slice(0, 130)); });
  const url = `http://localhost:${srv.address().port}/sim.html`, ev = c => pg.evaluate(c => EV(c), c), wait = ms => pg.waitForTimeout(ms);
  const me = process.argv[3] || "ru", foe = process.argv[4] || "kz";
  await pg.goto(url); await wait(1500); await pg.addStyleTag({content:"#tut-layer{display:none!important}"});
  await ev(`newGame(${JSON.stringify(me)}); startWar(${JSON.stringify(foe)}, true); for (let k = 0; k < 12; k++){ S.day = (S.day||1) + 1; dayTick(); if (S.day > daysIn(S.month, S.year)) nextMonth(); } S.rails.cn = {left:0, total:360, done:true}; ui.tab = "map"; ui.speed = 1; render();
    [["us", 30, 12], ["br", 40, 10], ["jp", 20, 9], ["fr", 10, 6, true]].forEach(([f, T, l, air]) => S.shipments.push({id:shipId(), from:f, to:S.player, r:"oil", qty:5, left:l, total:T, dir:"in", air:!!air}));
    S.shipments.push({id:shipId(), from:S.player, to:"in", r:"oil", qty:5, left:15, total:25, dir:"out"});`);
  await wait(2500); await ev(`typeof closeModal === "function" && closeModal(); document.querySelectorAll(".modal").forEach(m => m.remove()); const fx = document.getElementById("map-fx"); fx.innerHTML = fxMarkup(); updateLabels(); ui.speed = 1; mgKick();`);
  const zoom = async (iso, K, out) => { for (let i = 0; i < 30; i++){ const k = await ev(`ui.map.k`); if (out ? k <= K : k >= K) break;
    const c = await pg.evaluate(iso => { const r = document.querySelector(`#worldmap path[data-iso="${iso}"]`).getBoundingClientRect(); return {x:r.x + r.width/2, y:r.y + r.height/2}; }, iso);
    await pg.mouse.move(Math.max(5, Math.min(839, c.x)), Math.max(5, Math.min(385, c.y))); await pg.mouse.wheel(0, out ? 300 : -240); await wait(140); } };
  await zoom(me, 1.05, true); await wait(2500);
  const info = await ev(`(() => { const t0 = performance.now(); SEA.path.clear(); TR.mk = null; let n = 0; do { trPrep(); n++; } while (TR.lanes.size < new Set(TR_SEA).size && n < 60);
    return JSON.stringify({k:+ui.map.k.toFixed(2), gl:mgOn(), grid:[SEA.W, SEA.H, SEA.ms], lanes:[...TR.lanes.values()].filter(Boolean).length + "/" + TR.lanes.size, laneMs:Math.round(performance.now() - t0),
      dead:[...TR.lanes].filter(e => !e[1]).map(e => e[0]), planes:TR.planes.filter(p => p.r).length, rails:(MA.rails||[]).length, cargo:MA.cargo.map(q => { const r = q.rt, p = routeAt(r, 1 - q.x.left/q.x.total); return q.x.from + ":" + r.m + ":" + (r.len|0) + "/" + (r.s0|0) + "-" + (r.s1|0) + "@" + p.m + "(" + (p.x|0) + "," + (p.y|0) + ")"; }).join(" "), ms:trMs(), gfx:gfxLevel(), speed:ui.speed}); })()`);
  await wait(800); await pg.screenshot({path: OUT + "/e.png"});
  await zoom(foe, 2.4); await wait(3000); await pg.screenshot({path: OUT + "/f.png"});
  console.log(info); console.log("errors " + errs.size + (errs.size ? "\n" + [...errs].slice(0, 4).join("\n") : ""));
  await b.close(); srv.close(); });
