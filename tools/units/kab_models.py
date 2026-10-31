
exec(bpy.data.texts["kab_lib"].as_string())
def finish(parts, name, loc):
    ob = join(parts, name)
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    # origin to bottom centre, then place
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    ob.location = loc; return ob
def acc_m(): return bpy.data.materials.get("u_accent") or mat("u_accent", (0.1,0.45,0.95), 0.5)
def wheels(parts, xs, y, z, r, w, m=None):
    for x in xs:
        parts.append(cyl("wh", r, w, (x, y, z), (math.pi/2,0,0), m or M["track"], 10))
        parts.append(cyl("hub", r*0.45, w+0.02, (x, y, z), (math.pi/2,0,0), M["steel"], 8))
def tracks(parts, L, y, h=1.0, wd=0.6, nwheel=5):
    tr = prism("track", [(-L/2,0.15),(L/2-0.3,0.15),(L/2+0.1,0.5),(L/2-0.2,h),(-L/2+0.1,h),(-L/2-0.15,0.5)], wd, M["track"]); tr.location.y = y; bevel(tr, 0.05)
    parts.append(tr)
    for i in range(nwheel): parts.append(cyl("rw", 0.32, wd+0.04, (-L/2+0.6 + i*(L-1.2)/(nwheel-1), y, 0.45), (math.pi/2,0,0), M["steel"], 10))

def m_ifv(loc):
    p = []
    hull = prism("hull", [(-3.0,0.5),(2.4,0.5),(3.2,1.1),(2.6,1.85),(-3.0,1.85)], 2.6, M["olive"]); bevel(hull, 0.05); p.append(hull)
    for s in (-1,1): tracks(p, 6.0, s*1.45, 1.05, 0.55, 6)
    tur = prism("tur", [(-0.9,1.85),(0.8,1.85),(1.1,2.2),(0.6,2.55),(-1.0,2.55)], 1.7, M["olive2"]); bevel(tur, 0.05); p.append(tur)
    p.append(cyl("cannon", 0.07, 2.8, (2.3,0,2.3), (0,math.pi/2,0), M["steel"], 8))
    p.append(box("atgm", (1.2,0.25,0.25), (0.1,1.0,2.45), M["olive"]))
    p.append(box("acc", (1.8,1.72,0.12), (-0.1,0,2.2), acc_m()))
    p.append(box("hatch", (0.9,0.9,0.08), (-2.0,0.6,1.88), M["olive2"]))
    return finish(p, "ifv", loc)
def m_apc(loc):
    p = []
    hull = prism("hull", [(-3.6,0.75),(2.8,0.75),(3.7,1.3),(3.0,2.05),(-3.5,2.05),(-3.7,1.4)], 2.6, M["olive"]); bevel(hull, 0.06); p.append(hull)
    for s in (-1,1): wheels(p, [-2.4,-1.0,1.0,2.4], s*1.25, 0.6, 0.6, 0.45)
    p.append(cyl("tur", 0.5, 0.45, (0.4,0,2.27), (0,0,0), M["olive2"], 10))
    p.append(cyl("mg", 0.05, 1.6, (1.3,0,2.35), (0,math.pi/2,0), M["steel"], 6))
    p.append(box("acc", (0.12,2.62,0.2), (-1.6,0,1.9), acc_m()))
    return finish(p, "apc", loc)
def m_spg(loc):
    p = []
    hull = prism("hull", [(-3.4,0.5),(2.8,0.5),(3.4,1.05),(3.0,1.5),(-3.4,1.5)], 2.8, M["olive"]); bevel(hull, 0.05); p.append(hull)
    for s in (-1,1): tracks(p, 6.8, s*1.55, 1.0, 0.6, 7)
    tur = prism("tur", [(-3.0,1.5),(0.8,1.5),(1.4,2.0),(1.0,2.9),(-3.1,2.9)], 2.7, M["olive2"]); bevel(tur, 0.06); p.append(tur)
    p.append(cyl("gun", 0.15, 5.5, (3.9,0,2.25), (0,math.pi/2,0), M["steel"], 10))
    p.append(cyl("brake", 0.22, 0.5, (6.5,0,2.25), (0,math.pi/2,0), M["steel"], 10))
    p.append(box("acc", (3.0,2.72,0.16), (-1.0,0,2.6), acc_m()))
    return finish(p, "spg", loc)
def truck(p, L=7.5, cab=2.2, col=None):
    col = col or M["olive"]
    p.append(prism("cab", [(L/2-cab,0.8),(L/2,0.8),(L/2,1.9),(L/2-0.4,2.7),(L/2-cab,2.7)], 2.4, col))
    p.append(box("win", (0.06,2.0,0.55), (L/2-0.22,0,2.25), M["glass"], (0,-0.45,0)))
    p.append(box("frame", (L,1.8,0.3), (0,0,0.8), M["dark"]))
    for s in (-1,1): wheels(p, [L/2-1.0, -L/2+2.4, -L/2+1.0], s*1.1, 0.55, 0.55, 0.4)
    for s in (-1,1): p.append(box("acc", (1.2,0.06,0.28), (L/2-1.1, s*1.21, 1.75), acc_m()))
def m_mlrs(loc):
    p = []; truck(p)
    p.append(box("bed", (4.5,2.3,0.35), (-1.3,0,1.1), M["olive"]))
    pack = box("pack", (3.6,2.1,1.2), (-1.6,0,2.0), M["olive2"], (0,-0.3,0)); bevel(pack, 0.05); p.append(pack)
    for i in range(4):
        for j in range(3): p.append(cyl("tube", 0.2, 0.06, (0.17 - 1.6 + 1.75, -0.75 + i*0.5, 1.55 + j*0.38 + 0.5), (0,math.pi/2-0.3,0), M["dark"], 8))
    return finish(p, "mlrs", loc)
def m_sam(loc):
    p = []; truck(p, 8.0)
    p.append(box("bed", (5.0,2.3,0.35), (-1.3,0,1.1), M["olive"]))
    for i in range(2):
        for j in range(2):
            c = cyl("can", 0.42, 5.2, (-1.4, -0.48 + i*0.96, 2.2 + j*0.9), (0, math.pi/2-0.75, 0), M["olive2"], 12); p.append(c)
    return finish(p, "sam_launcher", loc)
def m_radar(loc):
    p = []; truck(p, 7.0)
    p.append(box("bed", (4.5,2.3,0.35), (-1.0,0,1.1), M["olive"]))
    p.append(cyl("mast", 0.15, 1.6, (-1.2,0,2.1), (0,0,0), M["steel"], 8))
    pan = box("panel", (0.25,3.6,2.4), (-1.2,0,3.6), M["olive2"], (0,0.35,0)); bevel(pan, 0.05); p.append(pan)
    p.append(box("grid", (0.06,3.2,2.0), (-1.05,0,3.65), M["dark"], (0,0.35,0)))
    return finish(p, "radar", loc)
def m_truck(loc):
    p = []; truck(p)
    tarp = prism("tarp", [(-3.75,1.0),(1.5,1.0),(1.5,2.6),(1.2,2.9),(-3.45,2.9),(-3.75,2.6)], 2.4, M["olive2"]); bevel(tarp, 0.08); p.append(tarp)
    return finish(p, "truck", loc)

def fuselage(p, L, r, z, m, nose=2.0, tail=1.0, tail_r=0.35):
    p.append(cyl("fus", r, L, (0,0,z), (0,math.pi/2,0), m, 12))
    p.append(cyl("nose", r, nose, (L/2+nose/2,0,z), (0,math.pi/2,0), m, 12, r2=0.03))
    p.append(cyl("tail", r, tail, (-L/2-tail/2,0,z), (0,-math.pi/2,0), m, 12, r2=tail_r))
def m_bomber(loc):
    g = M["grey"]; g2 = M["grey2"]; p = []
    fuselage(p, 17, 0.9, 2.0, g2, 4.0, 2.5, 0.3)
    p.append(plan("wing", [(3.0,0.6),(-4.5,10.5),(-6.0,10.5),(-4.0,0.6),(-4.0,-0.6),(-6.0,-10.5),(-4.5,-10.5),(3.0,-0.6)], 0.22, g, 1.85))
    p.append(plan("glove", [(7.0,0.5),(3.0,2.2),(-1.0,2.2),(-1.0,-2.2),(3.0,-2.2),(7.0,-0.5)], 0.3, g2, 1.8))
    p.append(plan("stab", [(-8.0,0.4),(-10.2,4.0),(-11.2,4.0),(-10.8,0.4),(-10.8,-0.4),(-11.2,-4.0),(-10.2,-4.0),(-8.0,-0.4)], 0.14, g, 2.0))
    p.append(prism("fin", [(-7.5,2.6),(-10.0,6.0),(-11.3,6.0),(-11.0,2.6)], 0.2, g2))
    for s in (-1,1):
        for e in (1.4, 2.6): p.append(cyl("eng", 0.45, 3.4, (-3.0, s*e, 1.25), (0,math.pi/2,0), M["dark"], 10))
        p.append(plan("acc", [(-5.0,s*9.0),(-5.6,s*9.0),(-5.95,s*10.4),(-4.6,s*10.4)][::s], 0.06, acc_m(), 2.09))
    p.append(cyl("cock", 0.5, 2.0, (9.4,0,2.65), (0,math.pi/2,0), M["glass"], 10))
    return finish(p, "bomber", loc)
def m_attack(loc):
    g = M["olive"]; g2 = M["olive2"]; p = []
    fuselage(p, 10, 0.6, 1.8, g2, 2.2, 1.0, 0.25)
    p.append(plan("wing", [(1.2,0.4),(0.4,7.2),(-1.0,7.2),(-1.2,0.4),(-1.2,-0.4),(-1.0,-7.2),(0.4,-7.2),(1.2,-0.4)], 0.2, g, 1.55))
    p.append(plan("stab", [(-4.3,0.3),(-5.0,2.6),(-5.8,2.6),(-5.8,0.3),(-5.8,-0.3),(-5.8,-2.6),(-5.0,-2.6),(-4.3,-0.3)], 0.12, g, 1.9))
    p.append(prism("fin", [(-4.0,2.3),(-5.3,4.1),(-6.0,4.1),(-6.0,2.3)], 0.14, g2))
    for s in (-1,1):
        p.append(cyl("eng", 0.55, 3.2, (-1.2, s*1.05, 1.9), (0,math.pi/2,0), M["dark"], 10))
        for k in (2.5, 4.0, 5.5): p.append(cyl("bomb", 0.16, 1.2, (-0.1, s*k, 1.25), (0,math.pi/2,0), M["dark"], 8))
        p.append(plan("acc", [(0.3,s*6.0),(-1.05,s*6.0),(-1.0,s*7.2),(0.4,s*7.2)][::s], 0.05, acc_m(), 1.76))
    p.append(cyl("cock", 0.42, 1.5, (3.3,0,2.3), (0,math.pi/2,0), M["glass"], 10))
    p.append(cyl("gun", 0.06, 1.4, (6.3,0,1.6), (0,math.pi/2,0), M["steel"], 6))
    return finish(p, "attack_plane", loc)
def m_transport(loc):
    g = M["grey"]; g2 = M["grey2"]; p = []
    fuselage(p, 17, 1.6, 2.6, g2, 3.0, 4.5, 0.4)
    p.append(plan("wing", [(1.5,0.6),(-2.5,12.0),(-4.0,12.0),(-2.6,0.6),(-2.6,-0.6),(-4.0,-12.0),(-2.5,-12.0),(1.5,-0.6)], 0.25, g, 4.0))
    p.append(prism("fin", [(-9.0,3.6),(-11.8,8.4),(-13.0,8.4),(-12.6,3.6)], 0.3, g2))
    p.append(plan("stab", [(-11.2,0.3),(-12.4,4.6),(-13.4,4.6),(-13.2,0.3),(-13.2,-0.3),(-13.4,-4.6),(-12.4,-4.6),(-11.2,-0.3)], 0.15, g, 8.3))
    for s in (-1,1):
        for e in (4.2, 8.0): p.append(cyl("eng", 0.55, 2.8, (0.6 - e*0.33, s*e, 3.4), (0,math.pi/2,0), M["dark"], 10))
        p.append(plan("acc", [(-2.0,s*10.6),(-3.5,s*10.6),(-4.0,s*12.0),(-2.5,s*12.0)][::s], 0.05, acc_m(), 4.24))
    p.append(cyl("cock", 0.9, 1.2, (9.6,0,3.5), (0,math.pi/2,0), M["glass"], 10))
    return finish(p, "transport", loc)
def m_heli(loc):
    g = M["olive"]; g2 = M["olive2"]; p = []
    body = prism("body", [(-1.8,0.9),(2.6,0.9),(3.6,1.6),(3.2,2.4),(1.0,2.9),(-2.0,2.7),(-2.4,1.8)], 1.4, g2); bevel(body, 0.12); p.append(body)
    p.append(prism("glass", [(1.4,2.1),(3.1,1.7),(3.3,2.35),(1.2,2.85)], 1.3, M["glass"]))
    p.append(prism("boom", [(-2.2,1.9),(-8.5,2.3),(-8.6,2.6),(-2.1,2.6)], 0.5, g))
    p.append(prism("tfin", [(-7.6,2.4),(-8.9,4.0),(-9.5,4.0),(-9.1,2.4)], 0.18, g))
    p.append(plan("stub", [(0.6,0.7),(0.2,2.6),(-0.8,2.6),(-0.6,0.7),(-0.6,-0.7),(-0.8,-2.6),(0.2,-2.6),(0.6,-0.7)], 0.12, g, 1.5))
    for s in (-1,1):
        for k in (1.6, 2.4): p.append(cyl("rkt", 0.16, 1.3, (0,s*k,1.32), (0,math.pi/2,0), M["dark"], 8))
    p.append(cyl("mast", 0.18, 0.7, (0.2,0,3.2), (0,0,0), M["steel"], 8))
    for a in range(4):
        bl = box("blade", (7.5,0.38,0.05), (0.2,0,3.55), M["dark"], (0,0,a*math.pi/2 + 0.3)); bl.location = (0.2 + 3.75*math.cos(a*math.pi/2+0.3), 3.75*math.sin(a*math.pi/2+0.3), 3.55); p.append(bl)
    p.append(cyl("trotor", 0.9, 0.06, (-9.0,0.35,3.4), (math.pi/2,0,0), M["dark"], 12))
    p.append(cyl("gun", 0.05, 1.2, (3.9,0,1.0), (0,math.pi/2,0), M["steel"], 6))
    p.append(box("acc", (1.6,1.42,0.12), (-0.5,0,2.65), acc_m()))
    return finish(p, "heli_attack", loc)
def m_ucav(loc):
    g = M["grey2"]; p = []
    fuselage(p, 4.6, 0.32, 1.5, g, 1.0, 1.2, 0.12)
    p.append(plan("wing", [(0.5,0.25),(0.2,6.0),(-0.4,6.0),(-0.4,0.25),(-0.4,-0.25),(-0.4,-6.0),(0.2,-6.0),(0.5,-0.25)], 0.08, g, 1.62))
    for s in (-1,1):
        f = prism("vtail", [(-2.4,1.5),(-3.1,2.5),(-3.5,2.5),(-3.3,1.5)], 0.06, g); f.location.y = s*0.15; f.rotation_euler.x = s*0.6; p.append(f)
        p.append(plan("acc", [(0.25,s*5.0),(-0.4,s*5.0),(-0.4,s*6.0),(0.2,s*6.0)][::s], 0.04, acc_m(), 1.71))
        p.append(cyl("bomb", 0.08, 0.9, (0.0, s*2.0, 1.45), (0,math.pi/2,0), M["dark"], 8))
    for a in range(2):
        p.append(box("prop", (0.06,1.4,0.12), (-3.1,0,1.5), M["dark"], (a*math.pi/2,0,0)))
    p.append(cyl("sensor", 0.18, 0.3, (1.5,0,1.18), (0,0,0), M["glass"], 10))
    return finish(p, "drone_ucav", loc)
def m_loiter(loc):
    g = M["grey"]; p = []
    p.append(plan("delta", [(2.2,0.0),(-1.4,1.7),(-1.6,1.4),(-1.6,-1.4),(-1.4,-1.7)], 0.16, g, 1.0))
    p.append(cyl("body", 0.22, 3.0, (0.3,0,1.12), (0,math.pi/2,0), M["grey2"], 10))
    p.append(cyl("nose", 0.22, 0.6, (2.1,0,1.12), (0,math.pi/2,0), M["grey2"], 10, r2=0.03))
    for s in (-1,1): p.append(prism("winglet", [(-1.2,1.0),(-1.6,1.6),(-1.8,1.6),(-1.7,1.0)], 0.05, g)); p[-1].location.y = s*1.6
    p.append(box("prop", (0.05,1.1,0.1), (-1.5,0,1.12), M["dark"]))
    p.append(plan("acc", [(1.4,0),(0.6,0.5),(0.6,-0.5)], 0.03, acc_m(), 1.17))
    return finish(p, "drone_loiter", loc)

def navy(): return bpy.data.materials.get("u_navy") or mat("u_navy", (0.30, 0.33, 0.37), 0.55)
def deckm(): return bpy.data.materials.get("u_deck") or mat("u_deck", (0.20, 0.22, 0.24), 0.8)
def hull_ship(p, L, B, H):
    pts = [(L/2, 0), (L*0.32, B/2), (-L/2, B/2*0.92), (-L/2, -B/2*0.92), (L*0.32, -B/2)]
    h = plan("hull", pts, H, navy(), 0); bevel(h, 0.15); p.append(h)
    p.append(plan("deck", pts, 0.05, deckm(), H))
    p.append(plan("wl", [(x*1.0, y*1.0) for x, y in pts], 0.35, M["red"], 0))
def m_ship(loc, name, L, B, H, guns=1, vls=1, sup=1.0, heli=False):
    p = []; hull_ship(p, L, B, H)
    s1 = box("sup", (L*0.22*sup, B*0.55, 2.2), (L*0.02, 0, H+1.1), M["grey2"]); bevel(s1, 0.1); p.append(s1)
    s2 = box("sup2", (L*0.12*sup, B*0.42, 1.6), (L*0.0, 0, H+3.0), M["grey2"]); bevel(s2, 0.1); p.append(s2)
    p.append(cyl("mast", 0.18, 4.0, (-L*0.03,0,H+5.2), (0,0,0), M["dark"], 6))
    p.append(box("radar", (0.3,1.8,0.9), (-L*0.03,0,H+6.6), M["dark"]))
    p.append(cyl("funnel", B*0.13, 2.4, (-L*0.13,0,H+1.6), (0,0,0), M["grey2"], 10))
    for g in range(guns):
        gx = L*0.36 - g*L*0.62
        p.append(cyl("turret", B*0.13, 0.7, (gx,0,H+0.4), (0,0,0), M["grey2"], 10))
        p.append(cyl("barrel", 0.09, 2.2, (gx + (1.2 if g == 0 else -1.2), 0, H+0.55), (0,math.pi/2,0), M["dark"], 6))
    for v in range(vls): p.append(box("vls", (L*0.07, B*0.45, 0.15), (L*0.22 - v*L*0.3, 0, H+0.08), M["dark"]))
    if heli: p.append(box("hpad", (L*0.16, B*0.8, 0.06), (-L*0.38,0,H+0.04), M["white"]))
    p.append(box("acc", (L*0.22*sup+0.05, B*0.55+0.05, 0.3), (L*0.02,0,H+1.7), acc_m()))
    return finish(p, name, loc)
def m_carrier(loc):
    p = []; L, B, H = 32, 6.0, 2.6
    hull_ship(p, L, B*0.75, H)
    p.append(plan("flight", [(L/2+1,0.8),(L/2-2,3.6),(-L/2,3.6),(-L/2,-3.6),(L/2-2,-3.2),(L/2+1,-0.8)], 0.5, deckm(), H))
    for k in range(5): p.append(box("line", (L*0.9/5*0.6, 0.12, 0.02), (-L/2+3 + k*L*0.9/5, -0.3, H+0.51), M["white"]))
    isl = box("island", (4.0,1.2,3.2), (-2.0,2.9,H+2.1), M["grey2"]); bevel(isl, 0.08); p.append(isl)
    p.append(cyl("mast", 0.15, 2.4, (-2.0,2.9,H+4.9), (0,0,0), M["dark"], 6))
    for k in range(3):
        jx = 6 - k*7; p.append(plan("jet", [(jx+1.4,0),(jx-0.6,1.2),(jx-1.0,1.2),(jx-1.0,-1.2),(jx-0.6,-1.2)], 0.12, M["grey"], H+0.55))
    p.append(box("acc", (4.05,1.25,0.35), (-2.0,2.9,H+3.0), acc_m()))
    return finish(p, "carrier", loc)
def m_sub(loc):
    p = []; m = mat("u_sub", (0.08,0.09,0.1), 0.6)
    b = cyl("body", 1.2, 18, (0,0,1.2), (0,math.pi/2,0), m, 14); b.scale = (1,1,1); p.append(b)
    p.append(cyl("bow", 1.2, 3.0, (10.5,0,1.2), (0,math.pi/2,0), m, 14, r2=0.25))
    p.append(cyl("stern", 1.2, 4.0, (-11,0,1.2), (0,-math.pi/2,0), m, 14, r2=0.1))
    sail = box("sail", (3.2,0.8,2.0), (3.5,0,3.2), m); bevel(sail, 0.2); p.append(sail)
    p.append(plan("fins", [(-11.5,0.0),(-12.4,2.2),(-13.0,2.2),(-12.6,0),(-13.0,-2.2),(-12.4,-2.2)], 0.1, m, 1.15))
    p.append(box("acc", (3.25,0.85,0.25), (3.5,0,3.7), acc_m()))
    return finish(p, "submarine", loc)
def m_ballistic(loc):
    p = []; w = mat("u_olivemis", (0.25,0.30,0.15), 0.6)
    p.append(cyl("body", 0.45, 5.5, (0,0,1), (0,math.pi/2,0), w, 14))
    p.append(cyl("nose", 0.45, 1.8, (3.65,0,1), (0,math.pi/2,0), w, 14, r2=0.04))
    for a in range(4):
        f = plan("fin", [(-2.2,0.4),(-2.75,1.05),(-2.75,0.4)], 0.05, M["dark"], -0.025); f.location = (0,0,1); f.rotation_euler = (a*math.pi/2 + math.pi/4,0,0); p.append(f)
    p.append(cyl("flame", 0.32, 1.6, (-3.55,0,1), (0,-math.pi/2,0), M["flame"], 10, r2=0.0))
    p.append(cyl("acc", 0.46, 0.35, (1.6,0,1), (0,math.pi/2,0), acc_m(), 14))
    return finish(p, "missile_ballistic", loc)
def m_interceptor(loc):
    p = []; w = M["white"]
    p.append(cyl("body", 0.2, 4.6, (0,0,1), (0,math.pi/2,0), w, 12))
    p.append(cyl("nose", 0.2, 0.9, (2.75,0,1), (0,math.pi/2,0), w, 12, r2=0.02))
    for a in range(4):
        f = plan("fin", [(-1.7,0.18),(-2.3,0.75),(-2.3,0.18)], 0.04, M["grey2"], -0.02); f.location = (0,0,1); f.rotation_euler = (a*math.pi/2,0,0); p.append(f)
        g = plan("canard", [(1.6,0.18),(1.3,0.5),(1.1,0.18)], 0.03, M["grey2"], -0.015); g.location = (0,0,1); g.rotation_euler = (a*math.pi/2,0,0); p.append(g)
    p.append(cyl("flame", 0.15, 1.1, (-2.85,0,1), (0,-math.pi/2,0), M["flame"], 10, r2=0.0))
    p.append(cyl("acc", 0.21, 0.3, (0.8,0,1), (0,math.pi/2,0), acc_m(), 12))
    return finish(p, "missile_sam", loc)

def track_full(p, L, y, h=1.12, wd=0.62, nw=6, sprocket=True):
    tr = prism("track", [(-L/2,0.15),(L/2-0.4,0.15),(L/2,0.55),(L/2-0.3,h),(-L/2+0.15,h),(-L/2-0.2,0.55)], wd, M["track"]); tr.location.y = y; bevel(tr, 0.05); p.append(tr)
    # track links on top run
    n = int(L/0.32)
    for i in range(n): p.append(box("link", (0.12, wd+0.04, 0.05), (-L/2+0.3 + i*(L-0.7)/n, y, h+0.02), M["dark"]))
    for i in range(nw): p.append(cyl("rw", 0.36, wd+0.06, (-L/2+0.75 + i*(L-1.6)/(nw-1), y, 0.5), (math.pi/2,0,0), M["steel"], 12))
    for i in range(3): p.append(cyl("ret", 0.12, wd*0.5, (-L/2+1.3 + i*(L-2.4)/2, y, h-0.12), (math.pi/2,0,0), M["steel"], 8))
    if sprocket:
        p.append(cyl("spr", 0.42, wd+0.1, (-L/2+0.05, y, 0.66), (math.pi/2,0,0), M["steel"], 14))
        p.append(cyl("idl", 0.36, wd+0.08, (L/2-0.25, y, 0.62), (math.pi/2,0,0), M["steel"], 12))
def era_grid(p, x0, y0, z0, nx, ny, sx, sy, sz, rot=(0,0,0), m=None):
    for i in range(nx):
        for j in range(ny):
            p.append(box("era", (sx*0.9, sy*0.9, sz), (x0 + i*sx, y0 + j*sy, z0), m or M["olive"], rot))
def m_tank(loc, name="tank_mbt"):
    p = []
    hull = prism("hull", [(-3.4,0.55),(3.0,0.55),(3.5,1.05),(3.1,1.55),(-3.3,1.6),(-3.5,1.2)], 2.2, M["olive"]); bevel(hull, 0.05); p.append(hull)
    p.append(box("fenders", (6.9, 3.5, 0.08), (0, 0, 1.2), M["olive2"]))
    for s in (-1, 1):
        track_full(p, 7.0, s*1.42)
        for k in range(5): p.append(box("skirt", (1.0, 0.07, 0.48), (-2.0 + k*1.05, s*1.77, 0.98), M["olive2"]))
        p.append(box("toolbox", (1.6, 0.4, 0.35), (-1.8, s*1.5, 1.4), M["olive2"]))
        p.append(cyl("light", 0.1, 0.12, (3.05, s*1.2, 1.5), (0,math.pi/2,0), M["glass"], 8))
    # glacis ERA rows
    era_grid(p, 3.05, -0.9, 1.33, 1, 5, 0.5, 0.45, 0.14, (0, -0.95, 0))
    # rear: exhaust grille and fuel drums
    p.append(box("grille", (1.2, 1.8, 0.06), (-2.6, 0, 1.62), M["dark"]))
    for k in range(6): p.append(box("slat", (0.06, 1.7, 0.08), (-3.1 + k*0.2, 0, 1.66), M["steel"]))
    for s in (-1, 1): p.append(cyl("drum", 0.3, 1.0, (-3.75, s*0.6, 1.45), (math.pi/2,0,0), M["olive2"], 12))
    # turret
    tur = prism("turret", [(-1.9,1.6),(1.2,1.6),(1.9,1.85),(1.4,2.35),(-1.6,2.4),(-2.1,2.0)], 2.5, M["olive2"]); bevel(tur, 0.06); tur.location.x = -0.3; p.append(tur)
    for s in (-1, 1):
        era_grid(p, 1.0, s*0.75 - 0.25, 2.38, 2, 2, 0.45, 0.45, 0.16, (0, 0.25, s*0.3))
        for k in range(4): p.append(cyl("smoke", 0.07, 0.35, (0.6 - k*0.18, s*1.3, 2.25), (0, 1.1, 0), M["dark"], 8))
    p.append(box("bustle", (1.2, 2.3, 0.5), (-2.6, 0, 2.05), M["olive"]))
    p.append(cyl("cupola", 0.34, 0.28, (-0.9, 0.6, 2.52), (0,0,0), M["olive"], 12))
    p.append(cyl("mg", 0.04, 1.1, (-0.4, 0.6, 2.75), (0,math.pi/2,0), M["dark"], 6))
    p.append(box("sight", (0.4, 0.3, 0.3), (0.3, -0.6, 2.55), M["olive"]))
    p.append(box("sightglass", (0.05, 0.24, 0.18), (0.51, -0.6, 2.56), M["glass"]))
    p.append(cyl("hatch", 0.3, 0.08, (-0.7, -0.5, 2.43), (0,0,0), M["olive"], 12))
    for yy in (0.9, -0.9): p.append(cyl("antenna", 0.015, 1.3, (-2.1, yy, 2.95), (0,0,0), M["dark"], 4))
    # gun
    p.append(box("mantlet", (0.55, 0.8, 0.6), (1.65, 0, 2.05), M["olive"]))
    p.append(cyl("gun", 0.12, 4.6, (3.6, 0, 2.05), (0, math.pi/2, 0), M["steel"], 12))
    p.append(cyl("evac", 0.17, 0.8, (3.3, 0, 2.05), (0, math.pi/2, 0), M["steel"], 12))
    p.append(cyl("muzzle", 0.14, 0.25, (5.8, 0, 2.05), (0, math.pi/2, 0), M["steel"], 12))
    p.append(box("acc", (2.4, 2.52, 0.14), (-0.6, 0, 2.02), acc_m()))
    return finish(p, name, loc)

def m_ifv(loc):
    p = []
    hull = prism("hull", [(-3.0,0.5),(2.4,0.5),(3.2,1.1),(2.6,1.85),(-3.0,1.85)], 2.6, M["olive"]); bevel(hull, 0.05); p.append(hull)
    for s in (-1,1):
        track_full(p, 6.2, s*1.45, 1.05, 0.55, 6)
        p.append(box("fender", (6.0, 0.6, 0.06), (0, s*1.45, 1.12), M["olive2"]))
        for k in range(3): p.append(box("port", (0.25, 0.06, 0.18), (-1.8 + k*0.9, s*1.31, 1.5), M["dark"]))
        p.append(cyl("light", 0.09, 0.1, (2.75, s*1.0, 1.55), (0,math.pi/2,0), M["glass"], 8))
    tur = prism("tur", [(-0.9,1.85),(0.8,1.85),(1.1,2.2),(0.6,2.55),(-1.0,2.55)], 1.7, M["olive2"]); bevel(tur, 0.05); p.append(tur)
    p.append(cyl("cannon", 0.07, 2.8, (2.3,0,2.3), (0,math.pi/2,0), M["steel"], 8))
    p.append(cyl("cannon_m", 0.1, 0.35, (3.6,0,2.3), (0,math.pi/2,0), M["steel"], 8))
    p.append(cyl("atgm", 0.13, 1.3, (0.1,1.0,2.45), (0,math.pi/2,0), M["olive"], 10))
    for s in (-1,1):
        for k in range(3): p.append(cyl("smoke", 0.06, 0.3, (0.6 - k*0.16, s*0.9, 2.3), (0, 1.1, 0), M["dark"], 8))
    p.append(box("sight", (0.35,0.3,0.3), (-0.2,-0.6,2.68), M["olive"])); p.append(box("sglass", (0.05,0.22,0.16), (-0.02,-0.6,2.7), M["glass"]))
    p.append(box("acc", (1.8,1.72,0.12), (-0.1,0,2.2), acc_m()))
    for xx in (-1.6, -2.5):
        for s in (-1,1): p.append(box("hatch", (0.75,0.6,0.07), (xx, s*0.5, 1.88), M["olive2"]))
    p.append(cyl("antenna", 0.015, 1.4, (-0.8, 0.7, 3.2), (0,0,0), M["dark"], 4))
    return finish(p, "ifv", loc)
def m_apc(loc):
    p = []
    hull = prism("hull", [(-3.6,0.75),(2.8,0.75),(3.7,1.3),(3.0,2.05),(-3.5,2.05),(-3.7,1.4)], 2.6, M["olive"]); bevel(hull, 0.06); p.append(hull)
    for s in (-1,1):
        wheels(p, [-2.4,-1.0,1.0,2.4], s*1.25, 0.6, 0.6, 0.45)
        p.append(box("door", (1.0, 0.05, 0.75), (-0.2, s*1.31, 1.45), M["olive2"]))
        for k in range(4): p.append(box("vision", (0.2, 0.06, 0.12), (-2.6 + k*0.7, s*1.3, 1.9), M["glass"]))
        p.append(cyl("light", 0.09, 0.1, (3.05, s*1.05, 1.75), (0,math.pi/2,0), M["glass"], 8))
        p.append(box("exhaust", (0.7, 0.12, 0.2), (-2.8, s*1.3, 1.25), M["dark"]))
    p.append(cyl("tur", 0.5, 0.45, (0.4,0,2.27), (0,0,0), M["olive2"], 12))
    p.append(cyl("hmg", 0.05, 1.8, (1.4,0,2.36), (0,math.pi/2,0), M["steel"], 6))
    p.append(cyl("mg2", 0.035, 1.0, (1.0,0.2,2.3), (0,math.pi/2,0), M["steel"], 6))
    for xx in (-1.2, -2.3):
        for s in (-1,1): p.append(box("hatch", (0.7,0.55,0.07), (xx, s*0.55, 2.08), M["olive2"]))
    p.append(box("acc", (0.12,2.62,0.2), (-1.6,0,1.9), acc_m()))
    p.append(cyl("antenna", 0.015, 1.4, (-3.0, 0.9, 2.75), (0,0,0), M["dark"], 4))
    return finish(p, "apc", loc)
def m_spg(loc):
    p = []
    hull = prism("hull", [(-3.4,0.5),(2.8,0.5),(3.4,1.05),(3.0,1.5),(-3.4,1.5)], 2.8, M["olive"]); bevel(hull, 0.05); p.append(hull)
    for s in (-1,1):
        track_full(p, 7.0, s*1.55, 1.0, 0.6, 7)
        p.append(box("fender", (6.9, 0.65, 0.06), (0, s*1.55, 1.07), M["olive2"]))
        p.append(box("box", (1.4, 0.35, 0.45), (-2.2, s*1.25, 1.75), M["olive2"]))
    tur = prism("tur", [(-3.0,1.5),(0.8,1.5),(1.4,2.0),(1.0,2.9),(-3.1,2.9)], 2.7, M["olive2"]); bevel(tur, 0.06); p.append(tur)
    p.append(cyl("gun", 0.15, 5.5, (3.9,0,2.25), (0,math.pi/2,0), M["steel"], 12))
    p.append(cyl("evac", 0.2, 0.9, (3.2,0,2.25), (0,math.pi/2,0), M["steel"], 12))
    p.append(cyl("brake", 0.24, 0.55, (6.5,0,2.25), (0,math.pi/2,0), M["steel"], 12))
    p.append(cyl("cupola", 0.32, 0.25, (-1.0,0.7,3.0), (0,0,0), M["olive"], 12))
    p.append(cyl("hmg", 0.04, 1.2, (-0.4,0.7,3.2), (0,math.pi/2,0), M["dark"], 6))
    p.append(cyl("hatch", 0.3, 0.07, (-1.0,-0.7,2.93), (0,0,0), M["olive"], 12))
    p.append(box("rack", (0.6, 2.6, 0.6), (-3.4, 0, 2.2), M["olive"]))
    for s in (-1,1):
        for k in range(4): p.append(cyl("smoke", 0.06, 0.3, (0.3 - k*0.16, s*1.3, 2.6), (0, 1.1, 0), M["dark"], 8))
    p.append(box("acc", (3.0,2.72,0.16), (-1.0,0,2.6), acc_m()))
    p.append(cyl("antenna", 0.015, 1.4, (-2.6, 1.0, 3.6), (0,0,0), M["dark"], 4))
    return finish(p, "spg", loc)
def m_mlrs(loc):
    p = []; truck(p)
    p.append(box("bed", (4.5,2.3,0.35), (-1.3,0,1.1), M["olive"]))
    pack = box("pack", (3.6,2.1,1.2), (-1.6,0,2.0), M["olive2"], (0,-0.3,0)); bevel(pack, 0.03); p.append(pack)
    # the tube mouths on the front face of the pack (tilted with it)
    for i in range(5):
        for j in range(3):
            cx, cz = 0.18, 2.0 - 0.36 + j*0.36
            x = -1.6 + 1.8*math.cos(0.3) + 0.02; z = 2.0 + 1.8*math.sin(0.3) - 0.38 + j*0.38*math.cos(0.3)
            p.append(cyl("tube", 0.15, 0.08, (x - j*0.38*math.sin(0.3)*0 , -0.8 + i*0.4, z), (0, math.pi/2-0.3, 0), M["dark"], 10))
    p.append(cyl("antenna", 0.015, 1.4, (2.6, 0.9, 3.4), (0,0,0), M["dark"], 4))
    return finish(p, "mlrs", loc)

def m_fighter(loc):
    g = M["grey"]; g2 = M["grey2"]; p = []
    p.append(cyl("fus", 0.55, 9.0, (0,0,1.6), (0, math.pi/2, 0), g, 14))
    p.append(cyl("nose", 0.55, 2.6, (5.8,0,1.6), (0, math.pi/2, 0), g2, 14, r2=0.04))
    p.append(cyl("pitot", 0.02, 0.8, (7.4,0,1.6), (0, math.pi/2, 0), M["dark"], 4))
    p.append(cyl("tailcone", 0.55, 1.2, (-5.1,0,1.6), (0, -math.pi/2, 0), M["dark"], 12, r2=0.42))
    can = cyl("canopy", 0.38, 1.9, (3.4,0,2.05), (0, math.pi/2, 0), M["glass"], 12); can.scale = (1, 0.85, 1); p.append(can)
    p.append(box("frame", (0.06, 0.7, 0.3), (3.0,0,2.3), M["dark"]))
    p.append(plan("wing", [(1.6,0.4),(-2.6,5.0),(-3.6,5.0),(-3.4,0.4),(-3.4,-0.4),(-3.6,-5.0),(-2.6,-5.0),(1.6,-0.4)], 0.14, g, 1.45))
    p.append(plan("lerx", [(4.2,0.3),(1.6,1.1),(1.6,-1.1),(4.2,-0.3)], 0.1, g, 1.5))
    p.append(plan("stab", [(-3.6,0.4),(-5.0,2.6),(-5.7,2.6),(-5.6,0.4),(-5.6,-0.4),(-5.7,-2.6),(-5.0,-2.6),(-3.6,-0.4)], 0.1, g, 1.5))
    p.append(cyl("droptank", 0.28, 3.0, (0.2,0,0.85), (0, math.pi/2, 0), g2, 12))
    for s in (-1, 1):
        fin = prism("fin", [(-3.0,2.0),(-4.4,3.9),(-5.2,3.9),(-5.3,2.0)], 0.12, g2); fin.location.y = s*0.85; fin.rotation_euler.x = s*0.18; p.append(fin)
        intake = box("intake", (2.6, 0.7, 0.75), (0.8, s*0.95, 1.25), g); bevel(intake, 0.08); p.append(intake)
        p.append(box("mouth", (0.06, 0.55, 0.6), (2.12, s*0.95, 1.25), M["dark"]))
        p.append(cyl("nozzle", 0.42, 0.9, (-5.2, s*0.55, 1.45), (0, math.pi/2, 0), M["dark"], 12))
        for k, yy in enumerate((2.0, 3.0, 4.2)):
            p.append(box("pylon", (0.9, 0.06, 0.18), (-1.4 - k*0.2, s*yy, 1.33), g2))
            p.append(cyl("aam", 0.09, 2.2 if k < 2 else 2.0, (-1.4 - k*0.2, s*yy, 1.18), (0, math.pi/2, 0), M["white"], 8))
        p.append(plan("acc", [(-2.75,s*4.3),(-3.55,s*4.3),(-3.6,s*5.0),(-2.6,s*5.0)][::s], 0.05, acc_m(), 1.6))
        p.append(prism("finacc", [(-4.3,3.4),(-4.7,3.9),(-5.2,3.9),(-5.25,3.4)], 0.13, acc_m())); p[-1].location.y = s*0.85; p[-1].rotation_euler.x = s*0.18
    return finish(p, "jet_fighter", loc)
def m_heli(loc):
    g = M["olive"]; g2 = M["olive2"]; p = []
    body = prism("body", [(-1.8,0.9),(2.6,0.9),(3.6,1.6),(3.2,2.4),(1.0,2.9),(-2.0,2.7),(-2.4,1.8)], 1.5, g2); bevel(body, 0.12); p.append(body)
    p.append(prism("glass", [(1.4,2.1),(3.1,1.7),(3.3,2.35),(1.2,2.85)], 1.4, M["glass"]))
    p.append(prism("boom", [(-2.2,1.9),(-8.0,2.3),(-8.1,2.6),(-2.1,2.6)], 0.55, g))
    p.append(prism("tfin", [(-7.2,2.4),(-8.4,4.0),(-9.0,4.0),(-8.6,2.4)], 0.18, g))
    p.append(plan("tstab", [(-7.0,0.2),(-7.5,1.3),(-8.0,1.3),(-8.0,-1.3),(-7.5,-1.3),(-7.0,-0.2)], 0.08, g, 2.35))
    p.append(plan("stub", [(0.6,0.75),(0.2,2.7),(-0.8,2.7),(-0.6,0.75),(-0.6,-0.75),(-0.8,-2.7),(0.2,-2.7),(0.6,-0.75)], 0.12, g, 1.5))
    for s in (-1,1):
        pod = cyl("pod", 0.26, 1.5, (0, s*1.7, 1.25), (0,math.pi/2,0), g, 12); p.append(pod)
        p.append(cyl("podface", 0.22, 0.04, (0.76, s*1.7, 1.25), (0,math.pi/2,0), M["dark"], 12))
        for k in range(2): p.append(cyl("atgm", 0.09, 1.4, (0, s*(2.25 + k*0.22), 1.3), (0,math.pi/2,0), M["olive2"], 8))
        p.append(cyl("exh", 0.18, 0.7, (-1.6, s*0.6, 2.7), (0,math.pi/2,0), M["dark"], 10))
        p.append(cyl("wheel", 0.25, 0.15, (1.6, s*0.8, 0.35), (math.pi/2,0,0), M["track"], 10))
        p.append(box("strut", (0.08, 0.08, 0.6), (1.6, s*0.75, 0.65), M["steel"]))
    p.append(cyl("sensor", 0.3, 0.4, (3.55, 0, 1.15), (0,0,0), M["glass"], 12))
    p.append(cyl("mast", 0.2, 0.8, (0.2,0,3.2), (0,0,0), M["steel"], 8))
    p.append(cyl("hub", 0.35, 0.25, (0.2,0,3.6), (0,0,0), M["dark"], 10))
    for a in range(4):
        ang = a*math.pi/2 + 0.4
        p.append(box("blade", (5.6,0.36,0.05), (0.2 + 2.95*math.cos(ang), 2.95*math.sin(ang), 3.68), M["dark"], (0,0,ang)))
    p.append(cyl("trotor", 0.9, 0.06, (-8.6,0.35,3.3), (math.pi/2,0,0), M["dark"], 14))
    p.append(cyl("gun", 0.05, 1.3, (3.4,0,0.75), (0,math.pi/2,0), M["steel"], 6))
    p.append(box("acc", (1.6,1.52,0.12), (-0.5,0,2.65), acc_m()))
    return finish(p, "heli_attack", loc)

def m_ship(loc, name, L, B, H, guns=1, vls=1, sup=1.0, heli=False):
    p = []; hull_ship(p, L, B, H)
    s1 = box("sup", (L*0.22*sup, B*0.55, 2.2), (L*0.02, 0, H+1.1), M["grey2"]); bevel(s1, 0.1); p.append(s1)
    s2 = box("sup2", (L*0.12*sup, B*0.42, 1.6), (L*0.0, 0, H+3.0), M["grey2"]); bevel(s2, 0.1); p.append(s2)
    p.append(box("bridgewin", (0.05, B*0.4, 0.3), (L*0.06*sup + 0.02, 0, H+3.3), M["glass"]))
    p.append(cyl("mast", 0.18, 4.0, (-L*0.03,0,H+5.2), (0,0,0), M["dark"], 6))
    p.append(box("yard", (0.12, 2.2, 0.1), (-L*0.03,0,H+5.8), M["dark"]))
    p.append(box("radar", (0.3,1.8,0.9), (-L*0.03,0,H+6.6), M["dark"]))
    p.append(cyl("dome", 0.45, 0.6, (L*0.02 - L*0.11*sup, B*0.2, H+2.5), (0,0,0), M["white"], 12))
    p.append(cyl("funnel", B*0.13, 2.4, (-L*0.13,0,H+1.6), (0,0,0), M["grey2"], 12))
    p.append(cyl("funtop", B*0.13+0.02, 0.2, (-L*0.13,0,H+2.85), (0,0,0), M["dark"], 12))
    for g in range(guns):
        gx = L*0.36 - g*L*0.62
        p.append(cyl("turret", B*0.13, 0.7, (gx,0,H+0.4), (0,0,0), M["grey2"], 12))
        p.append(cyl("barrel", 0.09, 2.2, (gx + (1.2 if g == 0 else -1.2), 0, H+0.55), (0,math.pi/2,0), M["dark"], 6))
    for v in range(vls):
        vx = L*0.22 - v*L*0.3; p.append(box("vls", (L*0.07, B*0.45, 0.15), (vx, 0, H+0.08), M["dark"]))
        for i in range(3):
            for j in range(2): p.append(box("cell", (L*0.015, B*0.15, 0.04), (vx - L*0.025 + i*L*0.025, -B*0.1 + j*B*0.2, H+0.17), M["grey2"]))
    for s in (-1,1):
        p.append(box("canisters", (1.6, 0.5, 0.45), (-L*0.2, s*B*0.28, H+0.45), M["grey2"], (0, -0.35, 0)))
        boat = cyl("boat", 0.28, 1.4, (-L*0.06, s*B*0.36, H+1.2), (0,math.pi/2,0), M["white"], 10); boat.scale = (1,1,0.7); p.append(boat)
        p.append(cyl("ciws", 0.3, 0.5, (L*0.15, s*B*0.25, H+2.3), (0,0,0), M["white"], 10))
    if heli: p.append(box("hpad", (L*0.16, B*0.8, 0.06), (-L*0.38,0,H+0.04), M["white"]))
    p.append(box("acc", (L*0.22*sup+0.05, B*0.55+0.05, 0.3), (L*0.02,0,H+1.7), acc_m()))
    return finish(p, name, loc)
def m_carrier(loc):
    p = []; L, B, H = 32, 6.0, 2.6
    hull_ship(p, L, B*0.75, H)
    p.append(plan("flight", [(L/2+1,0.8),(L/2-2,3.6),(-L/2,3.6),(-L/2,-3.6),(L/2-2,-3.2),(L/2+1,-0.8)], 0.5, deckm(), H))
    for k in range(6): p.append(box("line", (L*0.9/6*0.55, 0.12, 0.02), (-L/2+2.5 + k*L*0.9/6, -0.3, H+0.51), M["white"]))
    p.append(box("angled", (14, 0.1, 0.02), (-4, 0.8, H+0.51), M["white"], (0,0,0.15)))
    p.append(box("elev", (2.6, 2.0, 0.03), (-6, -3.2, H+0.51), M["grey"]))
    isl = box("island", (4.0,1.2,3.2), (-2.0,2.9,H+2.1), M["grey2"]); bevel(isl, 0.08); p.append(isl)
    p.append(box("islwin", (0.05, 1.0, 0.3), (0.02,2.9,H+3.3), M["glass"]))
    p.append(cyl("mast", 0.15, 2.6, (-2.0,2.9,H+5.0), (0,0,0), M["dark"], 6))
    p.append(box("radar", (0.25,1.4,0.7), (-2.0,2.9,H+5.9), M["dark"]))
    p.append(cyl("dome", 0.4, 0.5, (-3.4,2.9,H+3.9), (0,0,0), M["white"], 10))
    for k, (jx, jy) in enumerate([(9,-1.8),(5.5,-2.2),(-9,1.6),(-12,-1.5),(-1,-2.0)]):
        p.append(plan("jfus", [(jx+1.3,jy),(jx+0.6,jy+0.2),(jx-1.2,jy+0.2),(jx-1.2,jy-0.2),(jx+0.6,jy-0.2)], 0.25, M["grey"], H+0.52))
        p.append(plan("jwing", [(jx+0.2,jy),(jx-0.6,jy+1.1),(jx-0.9,jy+1.1),(jx-0.9,jy-1.1),(jx-0.6,jy-1.1)], 0.08, M["grey"], H+0.6))
    p.append(box("acc", (4.05,1.25,0.35), (-2.0,2.9,H+3.0), acc_m()))
    return finish(p, "carrier", loc)

def loft(name, outline, z0, h, top=0.75, m=None, shift=(0,0)):
    """plan outline at z0, the same outline scaled by `top` (and shifted) at z0+h: turrets, superstructures"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    cx = sum(x for x, y in outline)/len(outline); cy = sum(y for x, y in outline)/len(outline)
    v1 = [bm.verts.new((x, y, z0)) for x, y in outline]
    v2 = [bm.verts.new((cx + (x-cx)*top + shift[0], cy + (y-cy)*top + shift[1], z0+h)) for x, y in outline]
    bm.faces.new(v1); bm.faces.new(v2[::-1]); n = len(outline)
    for i in range(n):
        j = (i+1) % n; bm.faces.new((v1[j], v1[i], v2[i], v2[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); ob.data.materials.append(m or M["olive2"]); return ob
def rnd_outline(rx, ry, n=10, cx=0, front=1.0):
    return [(cx + rx*math.cos(a)*(front if math.cos(a) > 0 else 1), ry*math.sin(a)) for a in [i*2*math.pi/n for i in range(n)]]
TURRETS = {
  "ru":   dict(out=lambda: rnd_outline(1.75, 1.3, 12, -0.4, 1.1), h=0.75, top=0.7),
  "t90":  dict(out=lambda: [(1.5,0.0),(1.1,1.25),(-1.6,1.3),(-2.3,0.9),(-2.3,-0.9),(-1.6,-1.3),(1.1,-1.25)], h=0.8, top=0.8),
  "west": dict(out=lambda: [(1.7,0.6),(1.2,1.65),(-2.3,1.65),(-2.6,1.2),(-2.6,-1.2),(-2.3,-1.65),(1.2,-1.65),(1.7,-0.6)], h=0.72, top=0.9),
  "arrow":dict(out=lambda: [(2.2,0.0),(1.0,1.5),(-2.2,1.5),(-2.5,1.0),(-2.5,-1.0),(-2.2,-1.5),(1.0,-1.5)], h=0.78, top=0.88),
  "armata":dict(out=lambda: [(1.3,0.5),(0.9,1.2),(-1.5,1.2),(-1.7,0.8),(-1.7,-0.8),(-1.5,-1.2),(0.9,-1.2),(1.3,-0.5)], h=0.7, top=0.85),
}
def m_tank_v(loc, name, tur="ru", L=7.0, nw=6, gun=4.6, era=True, era_turret=True, skirts=5, rws=False, slats=False, drums=True, bustle=True, hullH=1.6, width=2.2):
    p = []
    hull = prism("hull", [(-L/2+0.1,0.55),(L/2-0.5,0.55),(L/2,1.05),(L/2-0.4,hullH-0.05),(-L/2+0.2,hullH),(-L/2,1.2)], width, M["olive"]); bevel(hull, 0.05); p.append(hull)
    p.append(box("fenders", (L-0.1, width+1.3, 0.08), (0, 0, 1.2), M["olive2"]))
    for s in (-1, 1):
        track_full(p, L, s*(width/2+0.32), 1.12, 0.62, nw)
        for k in range(skirts): p.append(box("skirt", (L*0.75/skirts, 0.07, 0.48), (-L*0.38 + (k+0.5)*L*0.75/skirts, s*(width/2+0.67), 0.98), M["olive2"]))
        p.append(box("toolbox", (1.6, 0.4, 0.35), (-L*0.26, s*(width/2+0.4), 1.4), M["olive2"]))
        p.append(cyl("light", 0.1, 0.12, (L/2-0.45, s*(width/2+0.1), hullH-0.1), (0,math.pi/2,0), M["glass"], 8))
        if slats: p.append(box("slat", (1.2, 0.05, 0.9), (-L/2+0.5, s*(width/2+0.7), 1.6), M["dark"]))
    if era: era_grid(p, L/2-0.45, -0.9, 1.33, 1, 5, 0.5, 0.45, 0.14, (0, -0.95, 0))
    p.append(box("grille", (1.2, 1.8, 0.06), (-L/2+0.8, 0, hullH+0.02), M["dark"]))
    for k in range(6): p.append(box("slat", (0.06, 1.7, 0.08), (-L/2+0.3 + k*0.2, 0, hullH+0.06), M["steel"]))
    if drums:
        for s in (-1, 1): p.append(cyl("drum", 0.3, 1.0, (-L/2-0.35, s*0.6, 1.45), (math.pi/2,0,0), M["olive2"], 12))
    T = TURRETS[tur]; out = T["out"]()
    tx = -0.3 if tur != "armata" else -0.6
    p.append(loft("turret", [(x+tx, y) for x, y in out], hullH, T["h"], T["top"], M["olive2"]))
    tz = hullH + T["h"]
    if era_turret:
        for s in (-1, 1): era_grid(p, 0.7, s*0.75 - 0.25, hullH+0.45, 2, 2, 0.45, 0.45, 0.16, (0, 0.25, s*0.35))
    for s in (-1, 1):
        for k in range(4): p.append(cyl("smoke", 0.07, 0.35, (0.4 - k*0.18 + tx, s*1.35, hullH+0.5), (0, 1.1, 0), M["dark"], 8))
    if bustle and tur != "armata": p.append(box("bustle", (1.0, 2.3, 0.5), (-2.9 + tx + 0.3, 0, hullH+0.4), M["olive"]))
    p.append(cyl("cupola", 0.32, 0.26, (-0.8 + tx, 0.6, tz + 0.1), (0,0,0), M["olive"], 12))
    if rws:
        p.append(box("rws", (0.6, 0.45, 0.4), (-0.6 + tx, 0.6, tz + 0.42), M["olive"]))
        p.append(cyl("rwsgun", 0.04, 1.2, (0.1 + tx, 0.6, tz + 0.45), (0,math.pi/2,0), M["dark"], 6))
    else: p.append(cyl("mg", 0.04, 1.1, (-0.3 + tx, 0.6, tz + 0.3), (0,math.pi/2,0), M["dark"], 6))
    p.append(box("sight", (0.4, 0.3, 0.3), (0.5 + tx, -0.6, tz + 0.12), M["olive"]))
    p.append(box("sightglass", (0.05, 0.24, 0.18), (0.71 + tx, -0.6, tz + 0.12), M["glass"]))
    for yy in (0.9, -0.9): p.append(cyl("antenna", 0.015, 1.3, (-1.9 + tx, yy, tz + 0.65), (0,0,0), M["dark"], 4))
    gz = hullH + T["h"]*0.5
    p.append(box("mantlet", (0.55, 0.8, 0.55), (1.45 + tx + (0.4 if tur == "arrow" else 0), 0, gz), M["olive"]))
    gx0 = 1.6 + tx + (0.4 if tur == "arrow" else 0)
    p.append(cyl("gun", 0.12, gun, (gx0 + gun/2, 0, gz), (0, math.pi/2, 0), M["steel"], 12))
    p.append(cyl("evac", 0.17, 0.8, (gx0 + gun*0.45, 0, gz), (0, math.pi/2, 0), M["steel"], 12))
    p.append(cyl("muzzle", 0.14, 0.25, (gx0 + gun - 0.1, 0, gz), (0, math.pi/2, 0), M["steel"], 12))
    # side-colour band around the turret (sticks out of its walls a little)
    k = (1 + T["top"])/2*1.03; cx0 = sum(x for x, y in out)/len(out); cy0 = sum(y for x, y in out)/len(out)
    p.append(loft("acc", [(cx0 + (x-cx0)*k + tx, cy0 + (y-cy0)*k) for x, y in out], hullH + T["h"]*0.42, 0.14, 1.0, acc_m()))
    return finish(p, name, loc)

TANK_SPECS = {'t72': {'tur': 'ru', 'L': 6.9, 'nw': 6, 'gun': 4.4}, 't90': {'tur': 't90', 'L': 7.0, 'nw': 6, 'gun': 4.6}, 'armata': {'tur': 'armata', 'L': 8.6, 'nw': 7, 'gun': 5.0, 'era': False, 'era_turret': False, 'slats': True, 'drums': False, 'hullH': 1.8, 'rws': True}, 'm1a1': {'tur': 'west', 'L': 7.9, 'nw': 7, 'gun': 4.8, 'era': False, 'era_turret': False, 'skirts': 6, 'drums': False, 'width': 2.5}, 'abrams': {'tur': 'west', 'L': 7.9, 'nw': 7, 'gun': 4.8, 'era': False, 'era_turret': False, 'skirts': 6, 'drums': False, 'width': 2.5, 'rws': True, 'slats': True}, 'leo': {'tur': 'arrow', 'L': 7.7, 'nw': 7, 'gun': 5.0, 'era': False, 'era_turret': False, 'skirts': 6, 'drums': False, 'width': 2.4}, 'type96': {'tur': 'ru', 'L': 6.8, 'nw': 6, 'gun': 4.4, 'drums': False}, 'ztz99': {'tur': 'arrow', 'L': 7.3, 'nw': 6, 'gun': 4.8, 'era': True, 'era_turret': True, 'drums': False}}

def m_ifv_v(loc, name, L=6.6, H=1.85, W=2.6, tur="small", gun=2.6, atgm=True, big=False, nw=6, tall=False, tow=False):
    p = []
    hh = H + (0.5 if tall else 0)
    hull = prism("hull", [(-L/2,0.5),(L/2-0.8,0.5),(L/2,1.1),(L/2-0.6,hh),(-L/2,hh)], W, M["olive"]); bevel(hull, 0.05); p.append(hull)
    for s in (-1,1):
        track_full(p, L-0.2, s*(W/2+0.15), 1.05, 0.55, nw)
        p.append(box("fender", (L-0.4, 0.6, 0.06), (0, s*(W/2+0.15), 1.12), M["olive2"]))
        for k in range(3): p.append(box("port", (0.25, 0.06, 0.18), (-L*0.28 + k*0.9, s*(W/2+0.01), hh-0.35), M["dark"]))
        p.append(cyl("light", 0.09, 0.1, (L/2-0.45, s*1.0, hh-0.3), (0,math.pi/2,0), M["glass"], 8))
    tx = 0.2 if not tall else -0.2
    if tur == "small": out = rnd_outline(0.95, 0.85, 10, tx); th = 0.6
    elif tur == "box": out = [(tx+0.9,0.5),(tx+0.6,0.95),(tx-1.0,0.95),(tx-1.0,-0.95),(tx+0.6,-0.95),(tx+0.9,-0.5)]; th = 0.7
    else: out = rnd_outline(1.1, 0.95, 10, tx, 1.15); th = 0.65
    p.append(loft("tur", out, hh, th, 0.78, M["olive2"]))
    gz = hh + th*0.5
    p.append(cyl("cannon", 0.07, gun, (tx+0.9+gun/2,0.2 if big else 0,gz), (0,math.pi/2,0), M["steel"], 8))
    if big: p.append(cyl("gun100", 0.13, 1.8, (tx+1.8,-0.15,gz), (0,math.pi/2,0), M["steel"], 10))
    if atgm: p.append(cyl("atgm", 0.13, 1.3, (tx,1.0,gz+0.15), (0,math.pi/2,0), M["olive"], 10))
    if tow: p.append(box("tow", (1.2,0.4,0.45), (tx-0.1,-1.15,gz+0.1), M["olive"]))
    for s in (-1,1):
        for k in range(3): p.append(cyl("smoke", 0.06, 0.3, (tx+0.5 - k*0.16, s*0.95, gz), (0, 1.1, 0), M["dark"], 8))
    p.append(box("sight", (0.35,0.3,0.3), (tx-0.3,-0.55,hh+th+0.12), M["olive"])); p.append(box("sglass", (0.05,0.22,0.16), (tx-0.12,-0.55,hh+th+0.12), M["glass"]))
    for xx in (-L*0.25, -L*0.38):
        for s in (-1,1): p.append(box("hatch", (0.7,0.55,0.07), (xx, s*0.5, hh+0.03), M["olive2"]))
    p.append(cyl("antenna", 0.015, 1.3, (tx-0.9, 0.7, hh+1.2), (0,0,0), M["dark"], 4))
    k = 1.03*(1+0.78)/2; cx0 = sum(x for x, y in out)/len(out)
    p.append(loft("acc", [(cx0+(x-cx0)*k, y*k) for x, y in out], hh+th*0.4, 0.13, 1.0, acc_m()))
    return finish(p, name, loc)
def m_apc_v(loc, name, L=7.4, W=2.6, H=2.05, nwh=4, tur="mg", boat=False, tall=False):
    p = []
    hh = H + (0.35 if tall else 0)
    prof = [(-L/2,0.75),(L/2-0.9,0.75),(L/2,1.3),(L/2-0.7,hh),(-L/2+0.1,hh),(-L/2,1.4)] if not boat else [(-L/2,0.75),(L/2-1.4,0.75),(L/2,1.5),(L/2-0.5,hh),(-L/2+0.2,hh),(-L/2,1.3)]
    hull = prism("hull", prof, W, M["olive"]); bevel(hull, 0.06); p.append(hull)
    xs = [(-L/2+1.3) + i*(L-2.6)/(nwh-1) for i in range(nwh)]
    for s in (-1,1):
        wheels(p, xs, s*(W/2-0.05), 0.6, 0.6, 0.45)
        p.append(box("door", (1.0, 0.05, 0.7), (-0.2, s*(W/2+0.01), hh-0.6), M["olive2"]))
        for k in range(4): p.append(box("vision", (0.2, 0.06, 0.12), (-L*0.35 + k*0.7, s*(W/2), hh-0.15), M["glass"]))
        p.append(cyl("light", 0.09, 0.1, (L/2-0.65, s*1.0, hh-0.3), (0,math.pi/2,0), M["glass"], 8))
    if tur == "mg":
        p.append(cyl("tur", 0.5, 0.45, (0.6,0,hh+0.22), (0,0,0), M["olive2"], 12))
        p.append(cyl("hmg", 0.05, 1.8, (1.6,0,hh+0.32), (0,math.pi/2,0), M["steel"], 6))
    else:
        p.append(box("rws", (0.8,0.6,0.45), (0.6,0,hh+0.25), M["olive2"]))
        p.append(cyl("rwsgun", 0.05, 1.5, (1.5,0,hh+0.3), (0,math.pi/2,0), M["steel"], 6))
        p.append(box("rwscam", (0.3,0.25,0.25), (0.6,0.4,hh+0.55), M["dark"]))
    for xx in (-L*0.2, -L*0.33):
        for s in (-1,1): p.append(box("hatch", (0.7,0.55,0.07), (xx, s*0.55, hh+0.03), M["olive2"]))
    for sd in (-1,1): p.append(box("acc", (L*0.55, 0.05, 0.16), (-L*0.08, sd*(W/2+0.02), hh-0.45), acc_m()))
    p.append(cyl("antenna", 0.015, 1.3, (-L/2+0.6, 0.9, hh+0.7), (0,0,0), M["dark"], 4))
    return finish(p, name, loc)
def m_sph_v(loc, name, L=7.0, gun=5.5, turL=4.0, turH=1.4, nw=7, brake=True, wheeled=False):
    p = []
    hull = prism("hull", [(-L/2,0.5),(L/2-0.6,0.5),(L/2,1.05),(L/2-0.4,1.5),(-L/2,1.5)], 2.8, M["olive"]); bevel(hull, 0.05); p.append(hull)
    for s in (-1,1):
        track_full(p, L, s*1.55, 1.0, 0.6, nw)
        p.append(box("fender", (L-0.1, 0.65, 0.06), (0, s*1.55, 1.07), M["olive2"]))
        p.append(box("box", (1.4, 0.35, 0.45), (-L*0.3, s*1.25, 1.75), M["olive2"]))
    tx = -L/2 + turL/2 + 0.2
    out = [(tx+turL/2,0.9),(tx+turL/2-0.5,1.35),(tx-turL/2,1.35),(tx-turL/2,-1.35),(tx+turL/2-0.5,-1.35),(tx+turL/2,-0.9)]
    p.append(loft("tur", out, 1.5, turH, 0.9, M["olive2"]))
    gz = 1.5 + turH*0.55; gx = tx + turL/2
    p.append(cyl("gun", 0.15, gun, (gx + gun/2,0,gz), (0,math.pi/2,0), M["steel"], 12))
    p.append(cyl("evac", 0.2, 0.9, (gx + gun*0.3,0,gz), (0,math.pi/2,0), M["steel"], 12))
    if brake: p.append(cyl("brake", 0.24, 0.55, (gx + gun,0,gz), (0,math.pi/2,0), M["steel"], 12))
    p.append(cyl("cupola", 0.32, 0.25, (tx-0.4,0.7,1.5+turH+0.1), (0,0,0), M["olive"], 12))
    p.append(cyl("hmg", 0.04, 1.2, (tx+0.2,0.7,1.5+turH+0.3), (0,math.pi/2,0), M["dark"], 6))
    p.append(cyl("hatch", 0.3, 0.07, (tx-0.4,-0.7,1.5+turH+0.03), (0,0,0), M["olive"], 12))
    p.append(box("acc", (turL*0.9+0.05, 2.74, 0.16), (tx,0,1.5+turH*0.75), acc_m()))
    p.append(cyl("antenna", 0.015, 1.3, (tx-turL/2+0.4, 1.0, 1.5+turH+0.65), (0,0,0), M["dark"], 4))
    return finish(p, name, loc)

IFV_SPECS = {'bmp2': {'tur': 'small', 'gun': 2.8}, 'bmp3': {'tur': 'round', 'gun': 2.2, 'big': True, 'atgm': False, 'L': 7.0}, 'marder': {'tur': 'box', 'tall': True, 'gun': 2.4, 'L': 6.9}, 'bradley': {'tur': 'box', 'tall': True, 'gun': 2.0, 'atgm': False, 'tow': True, 'L': 6.6, 'W': 2.9}, 'zbd04': {'tur': 'round', 'big': True, 'atgm': False, 'gun': 2.2, 'L': 7.0}}
APC_SPECS = {'btr82': {'boat': True, 'tur': 'mg'}, 'patria': {'tall': True, 'tur': 'rws', 'L': 7.8, 'W': 2.8}, 'stryker': {'tall': True, 'tur': 'rws', 'L': 7.0, 'W': 2.7, 'boat': False}, 'zsl92': {'nwh': 3, 'L': 6.6, 'tur': 'mg', 'boat': True}}
SPH_SPECS = {'akacia': {'gun': 4.6, 'turL': 3.4, 'turH': 1.3}, 'msta': {'gun': 6.2, 'turL': 4.2, 'turH': 1.5, 'nw': 6}, 'paladin': {'gun': 5.2, 'turL': 4.0, 'turH': 1.35, 'brake': True}, 'pzh': {'gun': 6.8, 'turL': 4.6, 'turH': 1.4, 'L': 7.6}, 'plz05': {'gun': 6.0, 'turL': 4.2, 'turH': 1.45}}

def chassis(p, L=8.0, axles=3, cab=2.2, tracked=False, W=2.4, col=None):
    """vehicle base: truck with cab at the front, or a tracked chassis; returns deck height"""
    col = col or M["olive"]
    if tracked:
        hull = prism("hull", [(-L/2,0.5),(L/2-0.6,0.5),(L/2,1.0),(L/2-0.3,1.45),(-L/2,1.45)], W+0.2, col); bevel(hull, 0.05); p.append(hull)
        for s in (-1,1): track_full(p, L, s*(W/2+0.4), 1.0, 0.55, max(5, int(L/1.1)))
        p.append(box("cabT", (1.6, W, 0.7), (L/2-1.2, 0, 1.8), col))
        p.append(box("winT", (0.05, W*0.8, 0.3), (L/2-0.38, 0, 1.9), M["glass"]))
        return 1.45
    p.append(prism("cab", [(L/2-cab,0.8),(L/2,0.8),(L/2,1.9),(L/2-0.4,2.7),(L/2-cab,2.7)], W, col))
    p.append(box("win", (0.06,W*0.83,0.55), (L/2-0.22,0,2.25), M["glass"], (0,-0.45,0)))
    p.append(box("frame", (L,W*0.75,0.3), (0,0,0.8), M["dark"]))
    xs = [L/2-1.0] + [-L/2+1.0 + i*1.35 for i in range(axles-1)]
    for s in (-1,1):
        wheels(p, xs, s*(W/2-0.1), 0.55, 0.55, 0.4)
        p.append(box("acc", (1.2,0.06,0.28), (L/2-1.1, s*(W/2+0.01), 1.75), acc_m()))
        p.append(box("tank", (0.9,0.3,0.4), (L/2-cab-0.6, s*(W/2-0.05), 1.0), M["olive2"]))
    p.append(box("bed", (L-cab-0.2, W, 0.3), (-cab/2, 0, 1.1), col))
    return 1.25
def tube_pack(p, x, z, nx, ny, r, Lt, tilt, ycen=0, sp=None, m=None, mouths=True):
    sp = sp or r*2.1
    for i in range(nx):
        for j in range(ny):
            yy = ycen - (nx-1)*sp/2 + i*sp; zz = z + j*sp
            p.append(cyl("tube", r, Lt, (x, yy, zz), (0, math.pi/2 - tilt, 0), m or M["olive2"], 10))
            if mouths:
                fx = x + Lt/2*math.cos(tilt); fz = zz + Lt/2*math.sin(tilt)
                p.append(cyl("mouth", r*0.8, 0.04, (fx, yy, fz), (0, math.pi/2 - tilt, 0), M["dark"], 10))
def m_mlrs_v(loc, name, L=8.0, axles=3, tracked=False, nx=8, ny=5, r=0.13, Lt=3.0, tilt=0.35, pod=False, pods=1):
    p = []; dz = chassis(p, L, axles, tracked=tracked)
    if pod:
        for k in range(pods):
            b = box("pod", (Lt, 1.0, 0.9), (-L*0.12, (k - (pods-1)/2)*1.1, dz + 1.1), M["olive2"], (0, -tilt, 0)); bevel(b, 0.04); p.append(b)
            for i in range(3):
                for j in range(2): p.append(cyl("cell", 0.14, 0.04, (-L*0.12 + Lt/2*math.cos(tilt) + 0.02, (k-(pods-1)/2)*1.1 - 0.3 + i*0.3, dz + 1.1 + Lt/2*math.sin(tilt) - 0.2 + j*0.38), (0, math.pi/2 - tilt, 0), M["dark"], 8))
    else:
        tube_pack(p, -L*0.15, dz + 0.9, nx, ny, r, Lt, tilt)
    p.append(cyl("antenna", 0.015, 1.3, (L/2-1.6, 0.9, 3.3), (0,0,0), M["dark"], 4))
    return finish(p, name, loc)
def m_srbm_v(loc, name, L=9.0, axles=4, n=1, r=0.45, Lm=6.0):
    p = []; dz = chassis(p, L, axles, cab=2.6, W=2.7)
    for k in range(n):
        y = (k - (n-1)/2)*1.1
        p.append(cyl("mis", r, Lm, (-L*0.12, y, dz + 0.9), (0, math.pi/2, 0), bpy.data.materials.get("u_olivemis") or M["olive2"], 14))
        p.append(cyl("misnose", r, 1.4, (-L*0.12 + Lm/2 + 0.7, y, dz + 0.9), (0, math.pi/2, 0), M["olive2"], 14, r2=0.04))
        p.append(box("cradle", (Lm*0.8, 0.3, 0.3), (-L*0.12, y, dz + 0.35), M["dark"]))
    return finish(p, name, loc)
def m_sam_v(loc, name, L=8.0, axles=3, tracked=False, n=4, r=0.42, Lc=5.2, tilt=0.75, radar=None, rows=2, box_launch=False, guns=False, turret=False):
    p = []; dz = chassis(p, L, axles, tracked=tracked)
    if turret:
        tb = box("turret", (2.6, 2.2, 1.4), (-L*0.15, 0, dz + 0.75), M["olive2"]); bevel(tb, 0.08); p.append(tb)
        if guns:
            for s in (-1,1): p.append(cyl("aa", 0.08, 2.8, (-L*0.15 + 1.9, s*1.25, dz + 1.0), (0, math.pi/2 - 0.3, 0), M["steel"], 8))
        for s in (-1,1):
            for j in range(2): p.append(cyl("tube", 0.14, 2.2, (-L*0.15, s*(1.2 + j*0.3), dz + 1.4), (0, math.pi/2 - 0.3, 0), M["olive"], 8))
        p.append(box("rad", (0.2, 1.6, 1.0), (-L*0.15 - 1.0, 0, dz + 2.0), M["dark"], (0, 0.3, 0)))
        p.append(cyl("dish", 0.55, 0.12, (-L*0.15 + 0.7, 0, dz + 1.6), (0, math.pi/2 - 0.5, 0), M["dark"], 12))
    elif box_launch:
        b = box("launcher", (Lc, 2.2, 1.6), (-L*0.15, 0, dz + 1.3), M["olive2"], (0, -tilt, 0)); bevel(b, 0.05); p.append(b)
        for i in range(2):
            for j in range(2): p.append(box("lid", (0.05, 0.95, 0.7), (-L*0.15 + Lc/2*math.cos(tilt) + 0.03, -0.5 + i*1.0, dz + 1.3 + Lc/2*math.sin(tilt) - 0.38 + j*0.76), M["dark"], (0, -tilt, 0)))
    else:
        # canisters hinge at their lower end; steep ones stand at the rear of the deck like on the real launchers
        per = max(1, n // rows); bx = -L/2 + 0.9 if tilt > 1.0 else -L*0.12 - Lc*0.45*math.cos(tilt)
        dxv, dzv = math.cos(tilt), math.sin(tilt)
        for i in range(per):
            for j in range(rows):
                cz = dz + 0.45 + r + j*r*2.15; cx = bx + Lc/2*dxv - j*r*2.15*dzv*0.0
                p.append(cyl("can", r, Lc, (cx, -(per-1)*r*1.15 + i*r*2.3, cz + Lc/2*dzv), (0, math.pi/2 - tilt, 0), M["olive2"], 12))
                p.append(cyl("cap", r*0.85, 0.05, (cx + Lc/2*dxv, -(per-1)*r*1.15 + i*r*2.3, cz + Lc*dzv), (0, math.pi/2 - tilt, 0), M["dark"], 12))
        p.append(box("hinge", (0.6, per*r*2.3, 0.4), (bx, 0, dz + 0.4), M["dark"]))
    if radar == "dish": p.append(cyl("dish", 0.9, 0.15, (L/2-2.8, 0, dz + 2.2), (0, -0.6, 0), M["dark"], 14))
    if radar == "panel": p.append(box("panel", (0.25, 2.2, 1.6), (L/2-2.7, 0, dz + 2.1), M["olive2"], (0, 0.35, 0)))
    return finish(p, name, loc)
def m_ew_v(loc, name):
    p = []; dz = chassis(p, 8.5, 4)
    p.append(box("shelter", (4.2, 2.4, 1.6), (-1.6, 0, dz + 0.95), M["olive2"]))
    dish = cyl("dish", 2.0, 0.2, (-1.8, 0, dz + 3.2), (0, math.pi/2 - 0.6, 0), M["olive"], 18); p.append(dish)
    p.append(cyl("feed", 0.08, 1.4, (-1.0, 0, dz + 3.6), (0, math.pi/2 - 0.6, 0), M["dark"], 6))
    p.append(cyl("mast", 0.2, 1.4, (-2.4, 0, dz + 2.2), (0,0,0), M["steel"], 8))
    return finish(p, name, loc)

MLRS_SPECS = {'grad': {'L': 7.6, 'nx': 8, 'ny': 5, 'r': 0.12, 'Lt': 3.0}, 'tornado': {'L': 9.6, 'axles': 4, 'nx': 6, 'ny': 2, 'r': 0.2, 'Lt': 7.0, 'tilt': 0.3}, 'm270': {'L': 7.0, 'tracked': True, 'pod': True, 'pods': 2, 'Lt': 4.0, 'tilt': 0.25}, 'himars': {'L': 7.0, 'axles': 3, 'pod': True, 'pods': 1, 'Lt': 4.2, 'tilt': 0.25}, 'phl03': {'L': 9.6, 'axles': 4, 'nx': 4, 'ny': 3, 'r': 0.2, 'Lt': 7.0, 'tilt': 0.3}}
SRBM_SPECS = {'tochka': {'L': 8.5, 'axles': 3, 'n': 1, 'r': 0.4, 'Lm': 5.6}, 'iskander': {'L': 10.0, 'axles': 4, 'n': 2, 'r': 0.45, 'Lm': 6.0}}
AD_SPECS = {'tor': {'tracked': True, 'L': 7.0, 'turret': True}, 'pantsir': {'L': 9.0, 'axles': 4, 'turret': True, 'guns': True}, 'gepard': {'tracked': True, 'L': 7.4, 'turret': True, 'guns': True}, 'irist_sls': {'L': 7.0, 'n': 4, 'r': 0.25, 'Lc': 3.4, 'tilt': 0.6}, 'hq17': {'tracked': True, 'L': 7.0, 'turret': True}, 'buk': {'tracked': True, 'L': 8.0, 'n': 4, 'r': 0.3, 'Lc': 5.0, 'tilt': 0.5, 'rows': 1}, 'nasams': {'L': 7.5, 'n': 6, 'r': 0.25, 'Lc': 4.0, 'tilt': 0.5, 'rows': 2}, 'hq16': {'L': 9.0, 'axles': 4, 'n': 6, 'r': 0.35, 'Lc': 6.0, 'tilt': 0.9, 'rows': 2}, 's300': {'L': 10, 'axles': 4, 'n': 4, 'r': 0.45, 'Lc': 7.0, 'tilt': 1.2, 'rows': 1}, 's400': {'L': 10, 'axles': 4, 'n': 4, 'r': 0.47, 'Lc': 7.5, 'tilt': 1.2, 'rows': 1, 'radar': 'panel'}, 's500': {'L': 11, 'axles': 4, 'n': 4, 'r': 0.5, 'Lc': 8.2, 'tilt': 1.2, 'rows': 1}, 'patriot': {'L': 10, 'axles': 4, 'box_launch': True, 'Lc': 5.5, 'tilt': 0.6}, 'thaad': {'L': 10, 'axles': 4, 'box_launch': True, 'Lc': 6.0, 'tilt': 0.4}, 'hq9': {'L': 10, 'axles': 4, 'n': 4, 'r': 0.45, 'Lc': 7.0, 'tilt': 1.2, 'rows': 1}}

AD_SPECS = {'tor': {'tracked': True, 'L': 7.0, 'turret': True}, 'pantsir': {'L': 9.0, 'axles': 4, 'turret': True, 'guns': True}, 'gepard': {'tracked': True, 'L': 7.4, 'turret': True, 'guns': True}, 'irist_sls': {'L': 7.0, 'n': 4, 'r': 0.25, 'Lc': 3.4, 'tilt': 0.6}, 'hq17': {'tracked': True, 'L': 7.0, 'turret': True}, 'buk': {'tracked': True, 'L': 8.0, 'n': 4, 'r': 0.3, 'Lc': 5.0, 'tilt': 0.5, 'rows': 1}, 'nasams': {'L': 7.5, 'n': 6, 'r': 0.25, 'Lc': 4.0, 'tilt': 0.5, 'rows': 2}, 'hq16': {'L': 9.0, 'axles': 4, 'n': 6, 'r': 0.35, 'Lc': 6.0, 'tilt': 0.9, 'rows': 2}, 's300': {'L': 10, 'axles': 4, 'n': 4, 'r': 0.45, 'Lc': 7.0, 'tilt': 1.45, 'rows': 1}, 's400': {'L': 10, 'axles': 4, 'n': 4, 'r': 0.47, 'Lc': 7.5, 'tilt': 1.45, 'rows': 1, 'radar': 'panel'}, 's500': {'L': 11, 'axles': 4, 'n': 4, 'r': 0.5, 'Lc': 8.2, 'tilt': 1.45, 'rows': 1}, 'patriot': {'L': 10, 'axles': 4, 'box_launch': True, 'Lc': 5.5, 'tilt': 0.6}, 'thaad': {'L': 10, 'axles': 4, 'box_launch': True, 'Lc': 6.0, 'tilt': 0.4}, 'hq9': {'L': 10, 'axles': 4, 'n': 4, 'r': 0.45, 'Lc': 7.0, 'tilt': 1.45, 'rows': 1}}

def m_fighter_v(loc, name, L=9.0, tails=2, cant=0.18, intake="side", canards=False, delta=False, stealth=False, engines=2, span=5.0, big=1.0, flatnose=False):
    g = M["grey"]; g2 = M["grey2"]; p = []; k = big
    r = 0.55*k
    if stealth:
        f = loft("fus", [(L*0.5*k,0),(L*0.25*k,0.9*k),(-L*0.5*k,1.0*k),(-L*0.5*k,-1.0*k),(L*0.25*k,-0.9*k)], 1.2, 0.75*k, 0.7, g); p.append(f)
    else:
        p.append(cyl("fus", r, L*k, (0,0,1.6), (0, math.pi/2, 0), g, 14))
    nose_l = 2.6*k
    if flatnose: p.append(loft("nose", [(L*0.5*k + nose_l,0),(L*0.5*k,0.75*k),(L*0.5*k,-0.75*k)], 1.25, 0.6*k, 0.5, g2))
    else: p.append(cyl("nose", r, nose_l, (L*0.5*k + nose_l/2,0,1.6), (0, math.pi/2, 0), g2, 14, r2=0.04))
    can = cyl("canopy", 0.38*k, 1.9*k, (L*0.38*k,0,1.6 + r*0.8), (0, math.pi/2, 0), M["glass"], 12); can.scale = (1, 0.85, 1); p.append(can)
    if delta: wing = [(L*0.15*k,0.4),(-L*0.42*k,span*k),(-L*0.48*k,span*k),(-L*0.48*k,0.4)]
    else: wing = [(L*0.18*k,0.4),(-L*0.29*k,span*k),(-L*0.4*k,span*k),(-L*0.38*k,0.4)]
    full = wing + [(x, -y) for x, y in wing[::-1]]
    p.append(plan("wing", full, 0.14*k, g, 1.45))
    if canards: p.append(plan("canard", [(L*0.33*k,0.4),(L*0.22*k,1.8*k),(L*0.16*k,1.8*k),(L*0.18*k,0.4),(L*0.18*k,-0.4),(L*0.16*k,-1.8*k),(L*0.22*k,-1.8*k),(L*0.33*k,-0.4)], 0.08, g, 1.6))
    if not delta: p.append(plan("stab", [(-L*0.4*k,0.4),(-L*0.55*k,2.6*k),(-L*0.63*k,2.6*k),(-L*0.62*k,0.4),(-L*0.62*k,-0.4),(-L*0.63*k,-2.6*k),(-L*0.55*k,-2.6*k),(-L*0.4*k,-0.4)], 0.1, g, 1.5))
    fin_prof = [(-L*0.33*k,2.0),(-L*0.49*k,2.0+1.9*k),(-L*0.58*k,2.0+1.9*k),(-L*0.59*k,2.0)]
    for t_ in range(tails):
        sd = 0 if tails == 1 else (1 if t_ == 0 else -1)
        f = prism("fin", fin_prof, 0.12, g2); f.location.y = sd*0.85*k; f.rotation_euler.x = sd*cant; p.append(f)
    if intake == "side":
        for s in (-1,1):
            b = box("intake", (2.6*k, 0.7*k, 0.75*k), (L*0.09*k, s*0.95*k, 1.25), g); bevel(b, 0.08); p.append(b)
            p.append(box("mouth", (0.06, 0.55*k, 0.6*k), (L*0.09*k + 1.32*k, s*0.95*k, 1.25), M["dark"]))
    elif intake == "belly":
        p.append(box("intake", (3.0*k, 1.0*k, 0.6*k), (L*0.05*k, 0, 1.0), g)); p.append(box("mouth", (0.06, 0.85*k, 0.5*k), (L*0.05*k + 1.52*k, 0, 1.0), M["dark"]))
    else:
        for s in (-1,1):
            p.append(box("intake", (3.2*k, 0.75*k, 0.7*k), (L*0.02*k, s*0.6*k, 0.95), g)); p.append(box("mouth", (0.06, 0.6*k, 0.55*k), (L*0.02*k + 1.62*k, s*0.6*k, 0.95), M["dark"]))
    for e in range(engines):
        yy = 0 if engines == 1 else (0.55*k if e == 0 else -0.55*k)
        p.append(cyl("nozzle", 0.42*k, 0.9*k, (-L*0.55*k, yy, 1.45), (0, math.pi/2, 0), M["dark"], 12))
    for s in (-1,1):
        for kk, yy in enumerate((2.0, 3.0)):
            if yy*k < span*k - 0.5: p.append(cyl("aam", 0.09, 2.2, (-L*0.15*k - kk*0.2, s*yy*k, 1.2), (0, math.pi/2, 0), M["white"], 8))
        tip = [w for w in wing if abs(w[1] - span*k) < 0.01]
        p.append(plan("acc", [(tip[0][0], s*(span*k - 0.6)), (tip[1][0], s*(span*k - 0.6)), (tip[1][0], s*span*k), (tip[0][0], s*span*k)][::s], 0.05, acc_m(), 1.6))
    return finish(p, name, loc)
def m_a10(loc):
    g = M["grey"]; g2 = M["grey2"]; p = []
    p.append(cyl("fus", 0.65, 11, (0,0,1.8), (0,math.pi/2,0), g, 14)); p.append(cyl("nose", 0.65, 1.6, (6.3,0,1.8), (0,math.pi/2,0), g2, 14, r2=0.15))
    p.append(cyl("gun", 0.08, 1.2, (7.4,0,1.55), (0,math.pi/2,0), M["dark"], 8))
    p.append(plan("wing", [(1.4,0.5),(0.8,8.5),(-0.8,8.5),(-1.2,0.5),(-1.2,-0.5),(-0.8,-8.5),(0.8,-8.5),(1.4,-0.5)], 0.22, g, 1.3))
    p.append(plan("stab", [(-5.0,0.3),(-5.3,3.0),(-6.3,3.0),(-6.3,0.3),(-6.3,-0.3),(-6.3,-3.0),(-5.3,-3.0),(-5.0,-0.3)], 0.12, g, 2.0))
    for s in (-1,1):
        p.append(cyl("eng", 0.6, 2.6, (-3.2, s*1.25, 2.8), (0,math.pi/2,0), M["dark"], 12))
        f = prism("fin", [(-5.3,1.9),(-5.6,4.0),(-6.5,4.0),(-6.6,1.9)], 0.14, g2); f.location.y = s*3.0; p.append(f)
        for kk in (2.5, 4.0, 5.5, 7.0): p.append(cyl("bomb", 0.16, 1.2, (0.2, s*kk, 1.0), (0,math.pi/2,0), M["dark"], 8))
        p.append(plan("acc", [(0.85,s*7.6),(-0.85,s*7.6),(-0.8,s*8.5),(0.8,s*8.5)][::s], 0.05, acc_m(), 1.53))
    p.append(cyl("cock", 0.42, 1.4, (4.6,0,2.4), (0,math.pi/2,0), M["glass"], 10))
    return finish(p, "a10", loc)
def m_transport_v(loc, name, props=False, ttail=True, L=17, span=12, engines=4, ew=False):
    g = M["grey"]; g2 = M["grey2"]; p = []
    fuselage(p, L, 1.6, 2.6, g2, 3.0, 4.5, 0.4)
    p.append(plan("wing", [(1.5,0.6),(-1.5 if props else -2.5,span),(-3.0 if props else -4.0,span),(-2.6,0.6),(-2.6,-0.6),(-3.0 if props else -4.0,-span),(-1.5 if props else -2.5,-span),(1.5,-0.6)], 0.25, g, 4.0))
    if ttail:
        p.append(prism("fin", [(-L/2,3.6),(-L/2-2.8,8.4),(-L/2-4,8.4),(-L/2-3.6,3.6)], 0.3, g2))
        p.append(plan("stab", [(-L/2-2.7,0.3),(-L/2-3.9,4.6),(-L/2-4.9,4.6),(-L/2-4.7,0.3),(-L/2-4.7,-0.3),(-L/2-4.9,-4.6),(-L/2-3.9,-4.6),(-L/2-2.7,-0.3)], 0.15, g, 8.3))
    else:
        p.append(prism("fin", [(-L/2,3.6),(-L/2-2.8,8.0),(-L/2-4,8.0),(-L/2-3.6,3.6)], 0.3, g2))
        p.append(plan("stab", [(-L/2-2.0,0.3),(-L/2-3.2,4.4),(-L/2-4.2,4.4),(-L/2-4.0,0.3),(-L/2-4.0,-0.3),(-L/2-4.2,-4.4),(-L/2-3.2,-4.4),(-L/2-2.0,-0.3)], 0.15, g, 3.4))
    for s in (-1,1):
        for e in ((4.2, 8.0) if engines == 4 else (5.5,)):
            ex = 0.6 - e*(0.15 if props else 0.33)
            if props:
                p.append(cyl("nac", 0.45, 2.6, (ex, s*e, 3.7), (0,math.pi/2,0), g, 10))
                for a in range(2): p.append(box("prop", (0.06, 3.0, 0.2), (ex + 1.35, s*e, 3.7), M["dark"], (a*math.pi/2 + 0.4, 0, 0)))
            else: p.append(cyl("eng", 0.55, 2.8, (ex, s*e, 3.4), (0,math.pi/2,0), M["dark"], 10))
        p.append(plan("acc", [(-1.2 if props else -2.0, s*(span-1.4)), (-2.7 if props else -3.5, s*(span-1.4)), (-3.0 if props else -4.0, s*span), (-1.5 if props else -2.5, s*span)][::s], 0.05, acc_m(), 4.24))
    if ew:
        for kk in range(4): p.append(box("ant", (0.4, 0.1, 0.9), (4 - kk*2.2, 0, 4.6), M["dark"]))
        p.append(cyl("pod", 0.5, 3.0, (-2.0, 0, 1.1), (0,math.pi/2,0), M["dark"], 10))
    p.append(cyl("cock", 0.9, 1.2, (L/2+1.1,0,3.5), (0,math.pi/2,0), M["glass"], 10))
    return finish(p, name, loc)
def m_heli_v(loc, name, blades=4, coax=False, wings=2.7, tandem=True, slim=1.0, radar=False, big=1.0):
    g = M["olive"]; g2 = M["olive2"]; p = []; k = big
    body = prism("body", [(-1.8*k,0.9),(2.6*k,0.9),(3.6*k,1.6),(3.2*k,2.4),(1.0*k,2.9),(-2.0*k,2.7),(-2.4*k,1.8)], 1.5*slim*k, g2); bevel(body, 0.12); p.append(body)
    p.append(prism("glass", [(1.4*k,2.1),(3.1*k,1.7),(3.3*k,2.35),(1.2*k,2.85)], 1.4*slim*k, M["glass"]))
    p.append(prism("boom", [(-2.2*k,1.9),(-8.0*k,2.3),(-8.1*k,2.6),(-2.1*k,2.6)], 0.55, g))
    if coax:
        for s in (-1,1): f = prism("tfin", [(-7.2*k,1.8),(-7.8*k,3.4),(-8.4*k,3.4),(-8.2*k,1.8)], 0.15, g); f.location.y = s*1.3; p.append(f)
        p.append(plan("tstab", [(-7.0*k,0.2),(-7.4*k,1.4),(-8.2*k,1.4),(-8.2*k,-1.4),(-7.4*k,-1.4),(-7.0*k,-0.2)], 0.08, g, 2.3))
    else:
        p.append(prism("tfin", [(-7.2*k,2.4),(-8.4*k,4.0),(-9.0*k,4.0),(-8.6*k,2.4)], 0.18, g))
        p.append(plan("tstab", [(-7.0*k,0.2),(-7.5*k,1.3),(-8.0*k,1.3),(-8.0*k,-1.3),(-7.5*k,-1.3),(-7.0*k,-0.2)], 0.08, g, 2.35))
        p.append(cyl("trotor", 0.9, 0.06, (-8.6*k,0.35,3.3), (math.pi/2,0,0), M["dark"], 14))
    p.append(plan("stub", [(0.6,0.75),(0.2,wings),(-0.8,wings),(-0.6,0.75),(-0.6,-0.75),(-0.8,-wings),(0.2,-wings),(0.6,-0.75)], 0.12, g, 1.5))
    for s in (-1,1):
        p.append(cyl("pod", 0.26, 1.5, (0, s*(wings-1.0), 1.25), (0,math.pi/2,0), g, 12))
        p.append(cyl("podface", 0.22, 0.04, (0.76, s*(wings-1.0), 1.25), (0,math.pi/2,0), M["dark"], 12))
        p.append(cyl("atgm", 0.09, 1.4, (0, s*(wings-0.4), 1.3), (0,math.pi/2,0), M["olive2"], 8))
        p.append(cyl("exh", 0.18, 0.7, (-1.6*k, s*0.6, 2.7), (0,math.pi/2,0), M["dark"], 10))
        p.append(cyl("wheel", 0.25, 0.15, (1.6*k, s*0.8, 0.35), (math.pi/2,0,0), M["track"], 10))
    p.append(cyl("sensor", 0.3, 0.4, (3.55*k, 0, 1.15), (0,0,0), M["glass"], 12))
    p.append(cyl("mast", 0.2, 1.4 if coax else 0.8, (0.2,0,3.4 if coax else 3.2), (0,0,0), M["steel"], 8))
    if radar: p.append(cyl("mmr", 0.55, 0.45, (0.2,0,4.1), (0,0,0), M["olive2"], 14))
    for lev, zz in enumerate([3.68] + ([4.3] if coax else [])):
        for a in range(blades):
            ang = a*2*math.pi/blades + 0.4 + lev*0.5
            p.append(box("blade", (5.6*k,0.36,0.05), (0.2 + 2.95*k*math.cos(ang), 2.95*k*math.sin(ang), zz), M["dark"], (0,0,ang)))
    p.append(cyl("gun", 0.05, 1.3, (3.4*k,0,0.75), (0,math.pi/2,0), M["steel"], 6))
    p.append(box("acc", (1.6,1.52*slim*k,0.12), (-0.5,0,2.65), acc_m()))
    return finish(p, name, loc)
def m_drone_v(loc, name, L=4.6, span=6.0, vt="up", big=1.0):
    g = M["grey2"]; p = []; k = big
    fuselage(p, L*k, 0.32*k, 1.5, g, 1.0*k, 1.2*k, 0.12)
    p.append(plan("wing", [(0.5,0.25),(0.2,span*k),(-0.4,span*k),(-0.4,0.25),(-0.4,-0.25),(-0.4,-span*k),(0.2,-span*k),(0.5,-0.25)], 0.08, g, 1.62))
    for s in (-1,1):
        rot = s*0.6 if vt == "up" else s*(math.pi - 0.6)
        f = prism("vtail", [(-L*k/2-0.1,1.5),(-L*k/2-0.8,2.5),(-L*k/2-1.2,2.5),(-L*k/2-1.0,1.5)], 0.06, g); f.location.y = s*0.15; f.rotation_euler.x = rot
        if vt != "up": f.location.z = 3.0
        p.append(f)
        p.append(plan("acc", [(0.25,s*(span*k-1.0)),(-0.4,s*(span*k-1.0)),(-0.4,s*span*k),(0.2,s*span*k)][::s], 0.04, acc_m(), 1.71))
        for kk in range(2 if big > 1 else 1): p.append(cyl("bomb", 0.08, 0.9, (0.0, s*(2.0 + kk*1.2), 1.45), (0,math.pi/2,0), M["dark"], 8))
    for a in range(2): p.append(box("prop", (0.06,1.4*k,0.12), (-L*k/2-0.8,0,1.5), M["dark"], (a*math.pi/2,0,0)))
    p.append(cyl("sensor", 0.18*k, 0.3, (L*k/2*0.65,0,1.18), (0,0,0), M["glass"], 10))
    return finish(p, name, loc)
def m_lancet(loc):
    p = []; g = M["grey2"]
    p.append(cyl("body", 0.15, 1.6, (0,0,1), (0,math.pi/2,0), g, 10)); p.append(cyl("nose", 0.15, 0.4, (1.0,0,1), (0,math.pi/2,0), g, 10, r2=0.03))
    for xx in (0.4, -0.6):
        for a in range(4):
            w = plan("xw", [(xx+0.15,0.1),(xx-0.05,0.9),(xx-0.25,0.9),(xx-0.2,0.1)], 0.03, g, -0.015); w.location = (0,0,1); w.rotation_euler = (a*math.pi/2 + math.pi/4,0,0); p.append(w)
    p.append(box("prop", (0.04,0.7,0.06), (-0.85,0,1), M["dark"]))
    p.append(cyl("acc", 0.16, 0.12, (0.0,0,1), (0,math.pi/2,0), acc_m(), 10))
    return finish(p, "lancet", loc)
def m_switchblade(loc):
    p = []; g = M["olive2"]
    p.append(cyl("body", 0.12, 1.3, (0,0,1), (0,math.pi/2,0), g, 10)); p.append(cyl("nose", 0.12, 0.3, (0.8,0,1), (0,math.pi/2,0), g, 10, r2=0.03))
    p.append(plan("w1", [(0.4,0.0),(0.35,0.9),(0.2,0.9),(0.25,0),(0.2,-0.9),(0.35,-0.9)], 0.02, g, 1.1))
    p.append(plan("w2", [(-0.3,0.0),(-0.35,0.8),(-0.5,0.8),(-0.45,0),(-0.5,-0.8),(-0.35,-0.8)], 0.02, g, 0.9))
    p.append(box("prop", (0.04,0.5,0.05), (-0.7,0,1), M["dark"]))
    p.append(cyl("acc", 0.13, 0.1, (0.2,0,1), (0,math.pi/2,0), acc_m(), 10))
    return finish(p, "switchblade", loc)

FIG_SPECS = {'mig29': {'L': 9.0, 'intake': 'under', 'span': 5.0}, 'su35': {'L': 10.5, 'intake': 'under', 'span': 5.6, 'big': 1.05}, 'su57': {'L': 10.5, 'intake': 'under', 'stealth': True, 'cant': 0.5, 'span': 5.8}, 'f16': {'L': 8.8, 'tails': 1, 'intake': 'belly', 'engines': 1, 'span': 4.6}, 'f15ex': {'L': 10.0, 'intake': 'side', 'cant': 0.0, 'span': 5.8}, 'f35': {'L': 8.6, 'tails': 2, 'cant': 0.45, 'intake': 'side', 'engines': 1, 'stealth': True, 'span': 4.8}, 'j10': {'L': 9.2, 'tails': 1, 'intake': 'belly', 'engines': 1, 'canards': True, 'delta': True, 'span': 4.6}, 'j20': {'L': 11.5, 'tails': 2, 'cant': 0.45, 'intake': 'side', 'canards': True, 'delta': True, 'stealth': True, 'span': 5.4}, 'su34': {'L': 12.0, 'intake': 'under', 'span': 6.2, 'big': 1.15, 'flatnose': True}, 'tu22': {'L': 17.0, 'tails': 1, 'intake': 'side', 'span': 9.0, 'big': 1.35, 'cant': 0.0}}

def m_ship_v(loc, name, L, B, H, guns=1, vls=1, sup=1.0, heli=True, mast="lattice", stealth=False):
    p = []; hull_ship(p, L, B, H)
    top = 0.82 if stealth else 0.95
    s1 = loft("sup", [(L*0.12*sup, B*0.27),(-L*0.12*sup, B*0.27),(-L*0.12*sup, -B*0.27),(L*0.12*sup, -B*0.27)], H, 2.2, top, M["grey2"]); p.append(s1)
    p.append(box("bridgewin", (0.05, B*0.4, 0.3), (L*0.12*sup*top + 0.03, 0, H+1.8), M["glass"]))
    if mast == "pyramid":
        p.append(loft("tower", [(L*0.06,B*0.22),(-L*0.06,B*0.22),(-L*0.06,-B*0.22),(L*0.06,-B*0.22)], H+2.2, 4.2, 0.45, M["grey2"]))
        for s in (-1,1): p.append(box("panel", (0.06, B*0.22, 1.0), (L*0.045, s*0.0, H+3.6), M["dark"], (0, -0.25, 0)))
        p.append(cyl("mtop", 0.12, 1.4, (0,0,H+7.0), (0,0,0), M["dark"], 6))
    else:
        s2 = box("sup2", (L*0.12*sup, B*0.42, 1.6), (0, 0, H+3.0), M["grey2"]); bevel(s2, 0.1); p.append(s2)
        p.append(cyl("mast", 0.18, 4.0, (-L*0.03,0,H+5.2), (0,0,0), M["dark"], 6))
        p.append(box("yard", (0.12, 2.2, 0.1), (-L*0.03,0,H+5.8), M["dark"])); p.append(box("radar", (0.3,1.8,0.9), (-L*0.03,0,H+6.6), M["dark"]))
    p.append(cyl("funnel", B*0.13, 2.4, (-L*0.15,0,H+1.6), (0,0,0), M["grey2"], 12))
    for g in range(guns):
        gx = L*0.36 - g*L*0.62
        p.append(cyl("turret", B*0.13, 0.7, (gx,0,H+0.4), (0,0,0), M["grey2"], 12))
        p.append(cyl("barrel", 0.09, 2.2, (gx + (1.2 if g == 0 else -1.2), 0, H+0.55), (0,math.pi/2,0), M["dark"], 6))
    for v in range(vls):
        vx = L*0.22 - v*L*0.32; p.append(box("vls", (L*0.08, B*0.45, 0.15), (vx, 0, H+0.08), M["dark"]))
        for i in range(4):
            for j in range(2): p.append(box("cell", (L*0.013, B*0.15, 0.04), (vx - L*0.03 + i*L*0.02, -B*0.1 + j*B*0.2, H+0.17), M["grey2"]))
    for s in (-1,1):
        p.append(box("canisters", (1.6, 0.5, 0.45), (-L*0.22, s*B*0.28, H+0.45), M["grey2"], (0, -0.35, 0)))
        boat = cyl("boat", 0.28, 1.4, (-L*0.07, s*B*0.36, H+1.2), (0,math.pi/2,0), M["white"], 10); boat.scale = (1,1,0.7); p.append(boat)
        p.append(cyl("ciws", 0.3, 0.5, (L*0.16, s*B*0.25, H+2.3), (0,0,0), M["white"], 10))
    if heli: p.append(box("hpad", (L*0.16, B*0.8, 0.06), (-L*0.38,0,H+0.04), M["white"]))
    kk = 1 - (1 - top)*0.68
    p.append(box("acc", (L*0.24*sup*kk+0.06, B*0.54*kk+0.06, 0.3), (0,0,H+1.5), acc_m()))
    return finish(p, name, loc)
def m_sub_v(loc, name, L=18, r=1.2, sail_x=0.2, hump=False, xtail=False):
    p = []; m = bpy.data.materials.get("u_sub") or mat("u_sub", (0.02,0.022,0.025))
    p.append(cyl("body", r, L, (0,0,r), (0,math.pi/2,0), m, 16))
    p.append(cyl("bow", r, 3.0*r/1.2, (L/2 + 1.5*r/1.2,0,r), (0,math.pi/2,0), m, 16, r2=0.25))
    p.append(cyl("stern", r, 4.0*r/1.2, (-L/2 - 2*r/1.2,0,r), (0,-math.pi/2,0), m, 16, r2=0.1))
    sx = L*sail_x
    sail = box("sail", (3.2*r/1.2,0.8,2.0), (sx,0,2*r+0.8), m); bevel(sail, 0.2); p.append(sail)
    p.append(plan("sailfin", [(sx+0.6,0.2),(sx+0.1,1.6),(sx-0.5,1.6),(sx-0.5,-1.6),(sx+0.1,-1.6),(sx+0.6,-0.2)], 0.08, m, 2*r+1.2))
    for k in range(2): p.append(cyl("peri", 0.06, 1.2, (sx-0.4+k*0.5, 0, 2*r+2.2), (0,0,0), M["dark"], 6))
    if hump: p.append(box("hump", (L*0.25, r*1.2, 0.5), (sx - L*0.18, 0, 2*r), m))
    tx = -L/2 - 3.4*r/1.2
    for a in range(4 if xtail else 2):
        rot = (a*math.pi/2 + (math.pi/4 if xtail else 0), 0, 0)
        f = plan("fin", [(tx+0.8,0.0),(tx+0.2,1.8),(tx-0.4,1.8),(tx-0.3,0)], 0.1, m, -0.05); f.location = (0,0,r); f.rotation_euler = rot; p.append(f)
    p.append(box("acc", (3.25*r/1.2,0.85,0.25), (sx,0,2*r+1.5), acc_m()))
    return finish(p, name, loc)

SHIP_SPECS = {'k20380': {'L': 14, 'B': 2.6, 'H': 1.6, 'guns': 1, 'vls': 1, 'sup': 0.9, 'heli': False, 'stealth': True}, 'type056': {'L': 13, 'B': 2.5, 'H': 1.6, 'guns': 1, 'vls': 0, 'sup': 0.85, 'heli': True, 'stealth': True}, 'gorshkov': {'L': 19, 'B': 3.2, 'H': 2.0, 'guns': 1, 'vls': 2, 'sup': 1.0, 'mast': 'pyramid', 'stealth': True}, 'fremm': {'L': 19.5, 'B': 3.1, 'H': 2.0, 'guns': 1, 'vls': 2, 'sup': 1.05, 'mast': 'pyramid', 'stealth': True}, 'type054a': {'L': 18.5, 'B': 3.2, 'H': 2.0, 'guns': 1, 'vls': 2, 'sup': 1.0}, 'burke': {'L': 24, 'B': 3.8, 'H': 2.3, 'guns': 1, 'vls': 2, 'sup': 1.1, 'mast': 'pyramid'}, 'type055': {'L': 27, 'B': 4.0, 'H': 2.5, 'guns': 1, 'vls': 2, 'sup': 1.15, 'mast': 'pyramid', 'stealth': True}}
SUB_SPECS = {'kilo': {'L': 13, 'r': 1.5, 'sail_x': 0.15}, 'type214': {'L': 12, 'r': 1.2, 'sail_x': 0.2, 'xtail': True}, 'yasen': {'L': 22, 'r': 1.6, 'sail_x': 0.25, 'hump': True}, 'virginia': {'L': 22, 'r': 1.5, 'sail_x': 0.28}}

GAME_ATLAS = ['t72', 't90', 'armata', 'm1a1', 'leo', 'abrams', 'type96', 'ztz99', 'bmp2', 'bmp3', 'marder', 'bradley', 'zbd04', 'btr82', 'patria', 'stryker', 'zsl92', 'akacia', 'msta', 'paladin', 'pzh', 'plz05', 'grad', 'tornado', 'm270', 'himars', 'phl03', 'tochka', 'iskander', 'mig29', 'su35', 'su57', 'f16', 'f15ex', 'f35', 'j10', 'j20', 'su25', 'a10', 'su34', 'tu22', 'b1b', 'mi24', 'ka52', 'ah1z', 'apache', 'z10', 'tb2', 'reaper', 'wingloong', 'shahed', 'lancet', 'switchblade', 'il76', 'c130', 'y20', 'tor', 'pantsir', 'gepard', 'irist_sls', 'hq17', 'buk', 'nasams', 'hq16', 's300', 's400', 's500', 'patriot', 'thaad', 'hq9', 'krasukha', 'compass', 'k20380', 'type056', 'gorshkov', 'fremm', 'type054a', 'burke', 'type055', 'kilo', 'type214', 'yasen', 'virginia', 'nimitz', 'fujian', 'missile_cruise', 'missile_ballistic', 'missile_sam', 'truck']
