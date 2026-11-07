// Headless check of own buildings on the WebGL map: zoom on the own country, shot d.png, tap a picture (opens its sheet), a new one grows in.
// Run: node tools/sim/map-buildings.js [shot dir|-] [country=ru] [zoom=3.6]
const { chromium } = require("playwright"), http = require("http"), fs = require("fs"), path = require("path");
const WWW = path.resolve(__dirname, "../../www"), OUT = process.argv[2] && process.argv[2] !== "-" ? process.argv[2] : "/tmp/kab-shots"; fs.mkdirSync(OUT, {recursive:true});
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/sim.html";
  if (p === "/sim.html"){ const s = fs.readFileSync(path.join(WWW, "index.html"), "utf8"), i = s.lastIndexOf("netGate();\n})();"); r.setHeader("content-type", "text/html; charset=utf-8"); r.end(s.slice(0, i) + "\nwindow.EV = s => eval(s);\n" + s.slice(i)); return; }
  fs.readFile(path.join(WWW, p), (e, d) => { if (e){ r.statusCode = 404; r.end(); return; } const T = {js:"text/javascript", json:"application/json", svg:"image/svg+xml", webp:"image/webp", png:"image/png", jpg:"image/jpeg", glb:"model/gltf-binary", ogg:"audio/ogg", css:"text/css"}[p.split(".").pop()]; if (T) r.setHeader("content-type", T); r.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg = await b.newPage({viewport:{width:844, height:390}}), errs = new Set(), miss = new Set(), log = [];
  pg.on("pageerror", e => errs.add("ERR " + String(e.message).slice(0, 130))); pg.on("console", m => { if (m.type() === "error" && !/404|Failed to load/.test(m.text())) errs.add("CON " + m.text().slice(0, 130)); });
  pg.on("response", r => { if (r.status() >= 400) miss.add(r.url().replace(/^http:\/\/localhost:\d+/, "")); });
  const url = `http://localhost:${srv.address().port}/sim.html`, ev = c => pg.evaluate(c => EV(c), c), wait = ms => pg.waitForTimeout(ms);
  const prep = () => pg.addStyleTag({content:"#tut-layer{display:none!important}"}).then(() => pg.evaluate(() => { window._ov = () => { const W = innerWidth, bad = [];
    for (const el of document.querySelectorAll("body *")){ const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.right <= W + 2 || getComputedStyle(el).visibility === "hidden") continue;
      let p = el.parentElement, clip = false; while (p && p !== document.body){ if (getComputedStyle(p).overflowX !== "visible" && p.getBoundingClientRect().right <= W + 2){ clip = true; break; } p = p.parentElement; }
      if (!clip) bad.push(String(el.className || el.tagName).slice(0, 24)); } return [...new Set(bad)].slice(0, 3).join("|"); }; }));
  const tabs = async tag => { const T = await pg.evaluate(() => [...new Set([...document.querySelectorAll("[data-tab]")].map(e => e.dataset.tab))]); const bad = [];
    for (const t of T){ await ev(`ui.tab = ${JSON.stringify(t)}; render();`); await wait(250); const o = await pg.evaluate(() => _ov()); if (o) bad.push(t + ": " + o); }
    log.push(tag + " tabs " + T.length + (bad.length ? " overflow " + bad.join("; ") : " ok")); };
  const days = n => ev(`for (let k = 0; k < ${n}; k++){ S.day = (S.day||1) + 1; dayTick(); if (S.day > daysIn(S.month, S.year)) nextMonth(); }`);
  await pg.goto(url); await wait(1500); await prep();
  await ev(`newGame(${JSON.stringify(process.argv[3] || "ru")}); ui.tab = "map"; ui.mapFocus = S.player; render();`); await wait(3000);
  await ev(`typeof closeModal === "function" && closeModal(); document.querySelectorAll(".modal").forEach(m => m.remove());`);
  const K = +(process.argv[4] || 3.6);
  for (let i = 0; i < 24; i++){ const k = await ev(`ui.map.k`); if (k >= K) break; const c = await pg.evaluate(() => { const r = document.querySelector(`#worldmap path[data-iso="${EV("S.player")}"]`).getBoundingClientRect(); return [Math.min(800, Math.max(40, r.left + r.width/2)), Math.min(360, Math.max(40, r.top + r.height/2))]; }); await pg.mouse.move(c[0], c[1]); await pg.mouse.wheel(0, -240); await wait(300); }
  await wait(3000);
  const info = await ev(`JSON.stringify({k: +ui.map.k.toFixed(2), gl: mgOn(), bd: document.querySelectorAll("#map-fx .fx-bd").length, mabd: (MA.bd||[]).length, cv: Object.keys(BD.cv).length})`);
  await pg.screenshot({path: OUT + "/d.png"});
  const r = await pg.evaluate(() => { const v = [...document.querySelectorAll("#map-fx .fx-bd .fx-hit")].map(c => c.getBoundingClientRect()).filter(r => r.width && r.left > 80 && r.right < 760 && r.top > 70 && r.bottom < 320); return v[0] ? {x: v[0].left + v[0].width/2, y: v[0].top + v[0].height/2, n: v.length, w: Math.round(v[0].width)} : null; });
  let tap = "no decal in view";
  if (r){ await pg.mouse.click(r.x, r.y); await wait(900); tap = await pg.evaluate(() => { const s = document.querySelector(".sheet"); return s ? s.textContent.replace(/\s+/g, " ").slice(0, 50) : "no sheet"; }); }
  await ev(`typeof closeModal === "function" && closeModal(); document.querySelectorAll(".modal").forEach(m => m.remove()); ui.pins.born[Object.keys(ui.pins.at)[0]] = performance.now(); const fx = document.getElementById("map-fx"); fx.innerHTML = fxMarkup(); updateLabels(); mgKick();`);
  await wait(250); const a1 = await ev(`[document.querySelectorAll("#map-fx [data-born]").length, MA.bdAnim]`); await wait(1500); const a2 = await ev(`MA.bdAnim`);
  console.log("grow", JSON.stringify(a1), a2);
  console.log(info, JSON.stringify(r), tap); console.log("errors " + errs.size + (errs.size ? "\n" + [...errs].slice(0, 4).join("\n") : ""));
  await b.close(); srv.close(); });
