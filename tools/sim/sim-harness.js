// Harness: serves the build with an eval bridge inside the game closure. run(async pg => ...) ; pg.ev(code, arg)
const { chromium } = require("playwright"), http = require("http"), fs = require("fs"), path = require("path");
const WWW = path.resolve(__dirname, "../../www");
module.exports = (fn) => new Promise(done => {
  const idx = process.env.INDEX || path.join(WWW, "index.html");
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split("?")[0]); if (p === "/") p = "/sim.html";
    if (p === "/sim.html"){ const s = fs.readFileSync(idx, "utf8"), i = s.lastIndexOf("netGate();\n})();"); r.setHeader("content-type", "text/html; charset=utf-8"); r.end(s.slice(0, i) + fs.readFileSync(path.join(__dirname, "econ-bot.js"), "utf8") + "\nwindow.SIM_B = BUILDINGS; window.EV = s => eval(s);\n" + s.slice(i)); return; }
    fs.readFile(path.join(WWW, p), (e, d) => { if (e){ r.statusCode = 404; r.end(); } else r.end(d); }); }).listen(0, async () => {
    const b = await chromium.launch(), pg = await b.newPage(); pg.on("pageerror", e => console.log("ERR", e.message.slice(0, 140)));
    await pg.goto(`http://localhost:${srv.address().port}/sim.html`); await pg.waitForTimeout(1500);
    pg.ev = (code) => pg.evaluate(c => EV(c), code);
    await fn(pg); await b.close(); srv.close(); done(); });
});
