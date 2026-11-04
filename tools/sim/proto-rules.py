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
open(out, 'w', encoding='utf8').write(s)
