// Shared by peacebot.js and conquest.js (ECON=1): one month of developing the economy like a person. Runs in the page; X is the game hook.
const BM = id => (window.SIM_B[id] || {}).mat || {};
window.simPlants = X => ["sawmill", "steelworks"].every(id => X.objCount(id) - ((X.S.mills0||{})[id]||0) >= 3);   // SELL=1: state programs wait for these, they eat the wood
window.simEcon = (X, others, seen) => { const s = X.S, net = X.budget().net || 0;
        ["egov", "automation", "smartgrid", "fintech", "ai"].forEach(id => { const t = X.TECH_BY[id], lv = X.tlv(id) + 1; if (lv > t.max || X.researching(id) || (s.rq||[]).length >= X.researchSlots()) return; if (!X.techReqFail(t, lv) && s.rp >= X.techCostLv(t, lv)) X.startResearch(id); });
        const lift = net > 0.0002*X.me().gdp/12; ["edu", "infra"].forEach(k => { s.sectors[k] = lift ? Math.min(1.25, s.sectors[k] + .05) : Math.max(1, s.sectors[k] - .05); });
        others().forEach(x => { if (x.rel >= 20 && !x.trade && !x.sanction) X.act("trade", x.id); });
        others().filter(x => !x.trade && x.rel > -30).sort((a, b) => b.rel - a.rel).slice(0, 3).forEach(x => { if (!x.emb) X.dipAct("emb", x.id); X.dipAct("visit", x.id); X.dipAct("cult", x.id); });
        if (window.SIM_SELL) ["wood", "steel"].forEach(r => { const q = s.stock[r] - 1000, t = s.treasury; if (q > 50){ X.act("sell", r + ":" + (q/s.stock[r]).toFixed(3)); window.SIM_SOLD = (window.SIM_SOLD||0) + s.treasury - t; } });   // SELL=1: keeps 1000 for the next buildings and sells the rest, like a person
        const want = []; if (X.powerBalance() < 0){ want.push("hydro"); if (X.objCount("solar") < 12) want.push("solar"); want.push("power"); } [["metal", "mine"], ["food", "farm"], ["oil", "oil"]].forEach(([r, b]) => { if (X.selfSuff(r) < 95) want.push(b); });
        { const m0 = s.mills0 || {}; ["sawmill", "steelworks"].forEach(id => { if (X.objCount(id) - (m0[id] || 0) < 3) want.unshift(id); }); }   // materials come only from what the player built
        if (X.objCount("institute") < 3) want.push("institute"); want.push("highway", "airport", "bridge", "port", "chem", "auto", "chips"); if (window.SIM_SELL) want.push("metro");
        for (let n = 0; n < 2; n++){ let done = false; for (const id of want){ if (s.treasury < X.buildCost(id)*1.2) continue; const k = X.canBuild(id);
          if (k.ok){ X.act("build", id); seen[id] = (seen[id] || 0) + 1; done = true; break; } if (k.mat){ if (window.SIM_SELL) continue; if (s.treasury > 0.3) X.act("ordermat", id); break; } } if (!done) break; } };
