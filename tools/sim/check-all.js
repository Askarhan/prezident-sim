// Headless check: all tabs at 844x390 (elements sticking out), 4 sheets, two old save formats with their research migration, a 3D battle (a.png science, b.png build sheet, c.png field).
// Needs www/lib/three (not in git): unzip assets/public/lib/three/* from the APK on branch apk. Run: node tools/sim/check-all.js [foe=kz] [shot dir]
const { chromium } = require("playwright"), http = require("http"), fs = require("fs"), path = require("path");
const WWW = path.resolve(__dirname, "../../www"), OUT = process.argv[3] || "/tmp/kab-shots", FOE = process.argv[2] || "kz"; fs.mkdirSync(OUT, {recursive:true});
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
  // 1. fresh game, all tabs and sheets
  await pg.goto(url); await wait(1500); await prep();
  await ev(`newGame("kg"); ui.tab = "map"; typeof closeModal === "function" && closeModal(); render();`); await wait(1500);
  await tabs("kg");
  await ev(`ui.tab = "science"; render();`); await wait(400); await pg.screenshot({path: OUT + "/a.png"});
  const sheets = ['showTech("ai")', 'showLabs()', 'showBuild("sawmill")', 'showFac(Object.keys(FAC)[0])'], sb = [];
  for (const s of sheets){ await ev(s); await wait(500); const o = await pg.evaluate(() => _ov()); if (o) sb.push(s + ": " + o); if (s.startsWith("showBuild")) await pg.screenshot({path: OUT + "/b.png"}); await ev(`typeof closeModal === "function" && closeModal();`); }
  log.push("sheets " + (sb.length ? sb.join("; ") : "ok"));
  await days(60); log.push("kg 60 days ok");
  // 2. old saves: rlv with agro and aviation, then the older research.done format
  for (const [tag, fix] of [["old-rlv", `s.rlv = {agro:2, aviation:2, geo:1, egov:1};`], ["old-done", `delete s.rlv; delete s.rq; s.research = {current:null, done:{egov:1, agro:1, aviation:1, geo:1}, prog:{}};`]]){
    await ev(`newGame("ru"); save(); const s = JSON.parse(storageGet()); ${fix} ["mkt","pretext","pretextReady","misY","budFix"].forEach(k => delete s[k]); storageSet(JSON.stringify(s)); S = null;`);
    await pg.goto(url); await wait(1800); await prep();
    const r = await ev(`JSON.stringify({ship: tlv("shipbuild"), agro: S.rlv.agro, avia: tlv("aviation"), rp: Math.round(S.rp)})`); await tabs(tag); await days(60); log.push(tag + " " + r + " 60 days ok"); }
  // 3. field battle with three.js
  await ev(`newGame("ru"); startWar(${JSON.stringify(FOE)}, true); ui.tab = "map"; render();`); await days(40);
  await ev(`const w = S.wars[0], i = w.fronts.reduce((bi, f, j) => (w.fronts[bi].p >= 100 || f.p < 100 && cbCount(w.dep[j]) > cbCount(w.dep[bi])) ? j : bi, 0); w.bfCd = 0; openBattle(${JSON.stringify(FOE)}, i);`); await wait(1500);
  await pg.evaluate(() => { const g = document.querySelector("[data-cbgo]"); if (g) g.click(); });
  const ok = await pg.waitForFunction(() => window.EV && EV("typeof BF !== 'undefined' && BF.open && BF.open.api && BF.open.api.ff && BF.open.cb && BF.open.cb.real"), null, {timeout:120000}).then(() => true, () => false);
  if (ok){ await wait(4000); await ev(`BF.open.api.ff(5)`); await wait(1500); await pg.screenshot({path: OUT + "/c.png"}); log.push("field ok " + await ev(`JSON.stringify({units: (BF.open.api.count && BF.open.api.count()) || null, t: Math.round(BF.open.cb.t||0)})`)); } else log.push("field did not open");
  console.log(log.join("\n")); console.log("errors " + errs.size + (errs.size ? "\n" + [...errs].slice(0, 6).join("\n") : "")); const nf = [...miss].filter(u => !u.startsWith("/flags/")); console.log("missing " + miss.size + ", not flags " + nf.length + " " + nf.slice(0, 4).join(" "));
  await b.close(); srv.close(); });
