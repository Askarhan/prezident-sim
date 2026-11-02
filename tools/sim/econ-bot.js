// Shared by peacebot.js and conquest.js (ECON=1): one month of developing the economy like a person. Runs in the page; X is the game hook.
const BM = id => (window.SIM_B[id] || {}).mat || {};
window.simEcon = (X, others, seen) => { const s = X.S, net = X.budget().net || 0;
        ["egov", "automation", "smartgrid", "fintech", "ai"].forEach(id => { const t = X.TECH_BY[id], lv = X.tlv(id) + 1; if (lv > t.max || X.researching(id) || (s.rq||[]).length >= X.researchSlots()) return; if (!X.techReqFail(t, lv) && s.rp >= X.techCostLv(t, lv)) X.startResearch(id); });
        const lift = net > 0.0002*X.me().gdp/12; ["edu", "infra"].forEach(k => { s.sectors[k] = lift ? Math.min(1.25, s.sectors[k] + .05) : Math.max(1, s.sectors[k] - .05); });
        others().forEach(x => { if (x.rel >= 20 && !x.trade && !x.sanction) X.act("trade", x.id); });
        others().filter(x => !x.trade && x.rel > -30).sort((a, b) => b.rel - a.rel).slice(0, 3).forEach(x => { if (!x.emb) X.dipAct("emb", x.id); X.dipAct("visit", x.id); X.dipAct("cult", x.id); });
        const want = []; if (X.powerBalance() < 0){ want.push("hydro"); if (X.objCount("solar") < 12) want.push("solar"); want.push("power"); } [["metal", "mine"], ["food", "farm"], ["oil", "oil"]].forEach(([r, b]) => { if (X.selfSuff(r) < 95) want.push(b); });
        if (X.objCount("institute") < 3) want.push("institute"); want.push("factory", "highway", "airport", "bridge", "port", "chem", "auto", "chips");
        for (let n = 0; n < 2 && s.queue.length < X.maxSlots(); n++){ let done = false; for (const id of want){ if (s.treasury < X.buildCost(id)*1.2) continue; const k = X.canBuild(id);
          if (k.ok){ X.act("build", id); seen[id] = (seen[id] || 0) + 1; done = true; break; } if (k.mat){ Object.keys((s.stock && BM(id)) || {}).forEach(r => { if (s.stock[r] < BM(id)[r] && s.treasury > 0) X.act("buy", r); }); break; } } if (!done) break; } };
