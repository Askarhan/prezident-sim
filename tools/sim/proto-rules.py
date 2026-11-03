# Scratch copy of the game with the experimental rules of 03.11.2026, plus GDP loss tracing. usage: proto-rules.py out.html [OBJ MKT WAR OCC GUARD]. Strings match build ee778fe.
import sys
out, on = sys.argv[1], set(sys.argv[2:])
s = open(__import__('os').path.join(__import__('os').path.dirname(__file__), '../../www/index.html'), encoding='utf8').read()
def R(a, b):
    global s
    assert s.count(a) >= 1, a[:50]
    s = s.replace(a, b)
R('me().gdp *= 1 - 0.0015*hits;', 'me().gdp *= 1 - 0.0015*hits; window.__mh = (window.__mh||0) + hits;')
R('meC.gdp = Math.max(meC.gdp*0.5, meC.gdp - o.added); occMillsOff(o);', '{ const g0 = meC.gdp; meC.gdp = Math.max(meC.gdp*0.5, meC.gdp - o.added); (window.__ls = window.__ls||{}).revolt = (window.__ls.revolt||0) + Math.log(g0/meC.gdp); } occMillsOff(o);')
R('me().gdp *= 0.94;', 'me().gdp *= 0.94; (window.__ls = window.__ls||{}).nuke = (window.__ls.nuke||0) + 0.062;')
R('meC.gdp *= 0.85; S.treasury', '(window.__ls = window.__ls||{}).lost = (window.__ls.lost||0) + 0.1625; meC.gdp *= 0.85; S.treasury')
R('c.gdp *= (1+g); c.pop *= popRate();', '(window.__ls = window.__ls||{}).growth = (window.__ls.growth||0) - Math.log(1+g); c.gdp *= (1+g); c.pop *= popRate();')
if 'OBJ' in on:   # new buildings add a fixed sum to GDP (taxed), no direct profit
    R('const n = objCount(id), r = S.objInc[id] || (S.objInc[id] = {n:0, v:0}); if (n > r.n) r.v += (n - r.n)*objIncome(id); else if',
      'const n = objCount(id); let r = S.objInc[id]; if (!r){ r = S.objInc[id] = {n, v:n*objIncome(id)}; return r.v; } if (n > r.n) me().gdp *= 1 + (n - r.n)*BUILDINGS[id].cost*0.65; else if')
if 'MKT' in on:   # market sells a limited number of machines a year
    R('const cost = chk.price*qty; if (S.treasury < cost) return toast("Не хватает денег в бюджете.");',
      'if (!S.mkt || S.mkt.y !== S.year) S.mkt = {y:S.year}; { const lim = ({tank:120, ifv:200, apc:200, sph:60, mlrs:40, fighter:24, attack:24, heli:24, bomber:6})[m.kind] || 30; qty = Math.min(qty, lim - (S.mkt[m.kind]||0)); if (qty <= 0) return; } const cost = chk.price*qty; if (S.treasury < cost) return toast("Не хватает денег в бюджете."); S.mkt[m.kind] = (S.mkt[m.kind]||0) + qty;')
if 'WAR' in on:   # a war costs by the forces in the field
    R('const war = m * 0.012 * S.wars.length;',
      'let war = 0; S.wars.forEach(w => { war += 2*((w.men||0)*0.004*gdppc() + unitsUpkeepYear(warUnits(w)))/12; });')
if 'OCC' in on:   # conquered land integrates in 8-11 years, not 2
    R('o.integ = Math.min(1, o.integ + (pol === "rebuild" ? 0.065 : 0.045)*(1 - o.damage*0.5));',
      'o.integ = Math.min(1, o.integ + (pol === "rebuild" ? 0.013 : 0.009)*(1 - o.damage*0.5));')
    R('return o.gdpFull*(0.3 + 0.7*o.integ)*', 'return o.gdpFull*(0.15 + 0.85*o.integ)*')
if 'GUARD' in on: # giants keep part of the forces at home
    R('function freeArmy(){ return Math.max(me().army*0.1, me().army - garrisonTotal() - abroadTotal()); }',
      'function guardK(){ const all = Object.values(C()).reduce((a, x) => a + (!x.owner || x.id === S.player ? x.gdp : 0), 0); return clamp(me().gdp/Math.max(1, all), 0, 0.4); }\nfunction freeArmy(){ return Math.max(me().army*0.1, me().army*(1 - guardK()) - garrisonTotal() - abroadTotal()); }')
    R('const U = warUnits(w), k = (w.fuel ?? 1)*empireK();', 'const U = warUnits(w), k = (w.fuel ?? 1)*empireK()*(1 - guardK());')
open(out, 'w', encoding='utf8').write(s)
