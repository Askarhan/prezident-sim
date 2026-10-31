# props for the battlefield: trees, houses, rocks, fortifications. Run inside Blender after kab_lib.py.
# Every prop is named u_p_<id>, origin at its ground centre, 1 unit = 1 metre.
import bpy, bmesh, math, random
from mathutils import Vector
exec(open(r"D:\Projects\kabinet_units\scripts\kab_lib.py", encoding="utf-8").read())
realistic()
R = random.Random(7)
PM = dict(
    leaf=real_mat("p_leaf", (0.032, 0.062, 0.018), 0.85, 0.45), leaf2=real_mat("p_leaf2", (0.055, 0.085, 0.025), 0.85, 0.45),
    pine=real_mat("p_pine", (0.016, 0.04, 0.022), 0.85, 0.4), bark=real_mat("p_bark", (0.05, 0.035, 0.022), 0.9, 0.3),
    palm=real_mat("p_palm", (0.07, 0.085, 0.03), 0.8, 0.4), dry=real_mat("p_dry", (0.12, 0.1, 0.05), 0.9, 0.4),
    plaster=real_mat("p_plaster", (0.42, 0.39, 0.33), 0.85, 0.18), plaster2=real_mat("p_plaster2", (0.33, 0.3, 0.26), 0.85, 0.2),
    concrete=real_mat("p_concrete", (0.2, 0.2, 0.19), 0.9, 0.22), roof=real_mat("p_roof", (0.22, 0.055, 0.03), 0.8, 0.25),
    roof2=real_mat("p_roof2", (0.07, 0.075, 0.08), 0.7, 0.2), metal=real_mat("p_metal", (0.16, 0.18, 0.18), 0.5, 0.25, 0.3),
    win=real_mat("p_win", (0.015, 0.022, 0.03), 0.25, 0.1), wood=real_mat("p_wood", (0.11, 0.065, 0.032), 0.85, 0.3),
    mud=real_mat("p_mud", (0.3, 0.2, 0.11), 0.95, 0.2), bag=real_mat("p_bag", (0.26, 0.22, 0.14), 0.95, 0.25),
    rock=real_mat("p_rock", (0.15, 0.14, 0.13), 0.95, 0.35), hay=real_mat("p_hay", (0.36, 0.28, 0.1), 0.95, 0.3),
    burnt=real_mat("p_burnt", (0.018, 0.016, 0.014), 0.95, 0.3), rubble=real_mat("p_rubble", (0.19, 0.18, 0.17), 0.95, 0.35),
    steel=bpy.data.materials["u_steel"])

def blob(name, r, loc, m, sub=2, jit=0.18, sq=1.0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    ob = link(bpy.context.active_object); ob.name = name
    for v in ob.data.vertices: v.co *= 1 + R.uniform(-jit, jit); v.co.z *= sq
    ob.data.materials.append(m); return ob
def finish(parts, name):
    ob = join(parts, "u_p_" + name)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return ob

# ---- vegetation ----
def tree_pine(name, h=10):
    p = [cyl("t", 0.22, h*0.35, (0, 0, h*0.17), m=PM["bark"], verts=7)]
    for k, (z, r) in enumerate([(0.32, 2.3), (0.52, 1.8), (0.7, 1.3), (0.86, 0.75)]):
        c = cyl("c", r, h*0.3, (R.uniform(-.1, .1), R.uniform(-.1, .1), h*z), m=PM["pine"], verts=9, r2=0.05)
        for v in c.data.vertices: v.co.x *= 1 + R.uniform(-.12, .12); v.co.y *= 1 + R.uniform(-.12, .12)
        p.append(c)
    return finish(p, name)
def tree_leaf(name, h=8, m="leaf"):
    p = [cyl("t", 0.28, h*0.5, (0, 0, h*0.25), m=PM["bark"], verts=7)]
    for k in range(5):
        a = k*2.4; d = 0 if k == 0 else 1.3
        p.append(blob("b", R.uniform(1.6, 2.3), (math.cos(a)*d, math.sin(a)*d, h*0.62 + R.uniform(-.5, .9)), PM[m if k % 2 else "leaf2"]))
    return finish(p, name)
def bush(name):
    p = [blob("b", R.uniform(0.9, 1.3), (R.uniform(-.8, .8), R.uniform(-.8, .8), 0.6), PM["leaf" if k else "leaf2"], 1, 0.22, 0.75) for k in range(3)]
    return finish(p, name)
def palm(name, h=9):
    p = []; x = 0
    for k in range(6):
        z = h*k/6; x2 = (k/6)**2*1.4
        p.append(cyl("s", 0.25 - k*0.02, h/6 + 0.1, ((x + x2)/2, 0, z + h/12), (0, math.atan2(x2 - x, h/6), 0), PM["bark"], 7)); x = x2
    for k in range(9):
        a = k*2*math.pi/9; L = R.uniform(3.2, 4.2)
        lf = box("l", (L, 0.75, 0.06), (x + math.cos(a)*L*0.45, math.sin(a)*L*0.45, h - 0.3), PM["palm"], (0, 0.35, a))
        p.append(lf)
    return finish(p, name)
def tree_dead(name, h=7):
    p = [cyl("t", 0.25, h, (0, 0, h/2), m=PM["burnt"], verts=7, r2=0.06)]
    for k in range(4):
        a = R.uniform(0, 6.28); z = h*R.uniform(0.4, 0.8); L = R.uniform(1.2, 2.2)
        p.append(cyl("b", 0.08, L, (math.cos(a)*L*0.4, math.sin(a)*L*0.4, z + L*0.3), (0.9*math.sin(a), -0.9*math.cos(a), 0), PM["burnt"], 5))
    return finish(p, name)
def rock(name, s=1.6):
    p = [blob("r", s*R.uniform(0.7, 1.0), (R.uniform(-s, s)*0.5, R.uniform(-s, s)*0.5, s*0.3), PM["rock"], 1, 0.3, 0.6) for k in range(3)]
    return finish(p, name)
def haystack(name):
    p = [cyl("h", 1.6, 2.0, (0, 0, 1.0), m=PM["hay"], verts=14), blob("t", 1.6, (0, 0, 2.0), PM["hay"], 2, 0.05, 0.6)]
    return finish(p, name)

# ---- buildings ----
def windows_on(p, w, d, h, floors, m=None, step=3.0, wy=1.2, wz=1.3, z0=0.9):
    m = m or PM["win"]
    for side in (-1, 1):
        n = max(1, int(w/step))
        for f in range(floors):
            for i in range(n):
                x = -w/2 + (i + 0.5)*w/n
                p.append(box("w", (wy, 0.12, wz), (x, side*d/2, z0 + f*(h/floors)), m))
        n = max(1, int(d/step))
        for f in range(floors):
            for i in range(n):
                y = -d/2 + (i + 0.5)*d/n
                p.append(box("w", (0.12, wy, wz), (side*w/2, y, z0 + f*(h/floors)), m))
def house(name, w=8, d=6, h=3, roofm="roof", wallm="plaster"):
    p = [box("wall", (w, d, h), (0, 0, h/2), PM[wallm])]
    rh = d*0.42
    p.append(prism("roof", [(-d/2 - 0.5, 0), (d/2 + 0.5, 0), (0, rh)], w + 0.8, PM[roofm]))
    p[-1].rotation_euler = (0, 0, math.pi/2); p[-1].location = (0, 0, h)
    p.append(box("chim", (0.6, 0.6, 1.4), (w*0.25, d*0.15, h + rh*0.8), PM["plaster2"]))
    windows_on(p, w, d, h, 1, step=2.6, z0=1.6)
    p.append(box("door", (1.0, 0.14, 2.0), (-w*0.2, -d/2, 1.0), PM["wood"]))
    return finish(p, name)
def barn(name):
    w, d, h = 12, 7, 3.6
    p = [box("wall", (w, d, h), (0, 0, h/2), PM["wood"]), box("door", (3, 0.14, 3), (0, -d/2, 1.5), PM["dry"])]
    r = prism("roof", [(-d/2 - 0.4, 0), (d/2 + 0.4, 0), (0, 2.6)], w + 0.6, PM["metal"]); r.rotation_euler = (0, 0, math.pi/2); r.location = (0, 0, h); p.append(r)
    return finish(p, name)
def block(name, w=30, d=12, floors=5, wallm="plaster2"):
    h = floors*3
    p = [box("wall", (w, d, h), (0, 0, h/2), PM[wallm]), box("roof", (w + 0.3, d + 0.3, 0.5), (0, 0, h + 0.1), PM["roof2"])]
    for s in (-1, 1): p.append(box("par", (w + 0.3, 0.25, 0.8), (0, s*(d/2), h + 0.5), PM["concrete"])); p.append(box("par", (0.25, d + 0.3, 0.8), (s*w/2, 0, h + 0.5), PM["concrete"]))
    for k in range(3): p.append(box("hut", (2.2, 2.2, 1.6), (-w/3 + k*w/3, 0, h + 0.9), PM["concrete"]))
    for k in range(4): p.append(box("ent", (2.0, 1.4, 0.3), (-w*0.375 + k*w/4, -d/2 - 0.7, 2.6), PM["concrete"]))
    windows_on(p, w, d, h, floors, step=3.0, wy=1.5, wz=1.4, z0=1.5)
    return finish(p, name)
def ruin(name, w=24, d=12, floors=4):
    h = floors*3; p = []
    n = 8
    for i in range(n):
        x = -w/2 + (i + 0.5)*w/n; hh = h*R.uniform(0.25, 1.0)
        p.append(box("fw", (w/n, 0.4, hh), (x, -d/2, hh/2), PM["plaster2" if i % 3 else "burnt"]))
        hh2 = h*R.uniform(0.1, 0.8); p.append(box("bw", (w/n, 0.4, hh2), (x, d/2, hh2/2), PM["plaster2"]))
        for f in range(int(hh/3)):
            p.append(box("w", (1.4, 0.5, 1.3), (x, -d/2, 1.5 + f*3), PM["burnt"]))
    for s in (-1, 1):
        hh = h*R.uniform(0.3, 0.9); p.append(box("sw", (0.4, d, hh), (s*w/2, 0, hh/2), PM["plaster2"]))
    p.append(box("floor", (w*0.6, d*0.8, 0.4), (-w*0.15, 0, h*0.45), PM["concrete"], (0.12, 0.05, 0)))
    for k in range(10): p.append(blob("rb", R.uniform(1.0, 2.2), (R.uniform(-w/2, w/2), R.uniform(-d/2 - 2, d/2), 0.2), PM["rubble"], 1, 0.35, 0.45))
    return finish(p, name)
def mudhouse(name, w=7, d=7):
    h = 3.0
    p = [box("wall", (w, d, h), (0, 0, h/2), PM["mud"]), box("roof", (w + 0.2, d + 0.2, 0.25), (0, 0, h), PM["mud"])]
    for s in (-1, 1): p.append(box("par", (w + 0.2, 0.25, 0.5), (0, s*d/2, h + 0.3), PM["mud"])); p.append(box("par", (0.25, d + 0.2, 0.5), (s*w/2, 0, h + 0.3), PM["mud"]))
    p.append(box("w2", (3.2, 3.2, 2.2), (w*0.6, d*0.25, 1.1), PM["mud"]))
    windows_on(p, w, d, h, 1, step=3.0, wy=0.8, wz=0.8, z0=1.9)
    p.append(box("door", (1.0, 0.14, 2.0), (0, -d/2, 1.0), PM["wood"]))
    return finish(p, name)
def garage(name):
    p = [box("wall", (6, 4.5, 3), (0, 0, 1.5), PM["concrete"]), box("roof", (6.3, 4.8, 0.2), (0, 0, 3.05), PM["metal"]), box("door", (4.2, 0.12, 2.4), (0, -2.25, 1.2), PM["metal"])]
    return finish(p, name)

# ---- fortifications ----
def sandbags(name, L=5.0):
    p = []
    for row in range(3):
        n = int(L/0.62)
        for i in range(n):
            a = (i/(n - 1) - 0.5)*1.0; x = math.sin(a)*L/1.6 + (0.3 if row % 2 else 0)*math.cos(a); y = (1 - math.cos(a))*L/3.2
            b = box("s", (0.6, 0.38, 0.24), (x, y, 0.12 + row*0.24), PM["bag"], (0, 0, -a)); bevel(b, 0.08, 2); p.append(b)
    return finish(p, name)
def teeth(name):
    p = [cyl("t", 0.7, 1.1, (i*1.8 - 3.6, (i % 2)*0.9, 0.55), m=PM["concrete"], verts=4, r2=0.12) for i in range(5)]
    return finish(p, name)
def hedgehog(name):
    p = []
    for k, rot in enumerate([(0.95, 0, 0), (0, 0.95, 0), (0.95, 0, 1.57)]):
        p.append(box("h", (0.15, 0.15, 2.0), (0, 0, 0.7), PM["steel"], rot))
    return finish(p, name)
def bunker(name):
    p = [box("b", (5, 4, 1.5), (0, 0, 0.75), PM["concrete"]), box("slit", (3, 0.2, 0.35), (0, -2, 1.0), PM["win"]), box("top", (5.6, 4.6, 0.3), (0, 0, 1.6), PM["concrete"])]
    for k in range(6): b = box("s", (0.6, 0.38, 0.26), (-1.8 + k*0.7, -2.5, 0.2), PM["bag"]); bevel(b, 0.08, 2); p.append(b)
    return finish(p, name)

BUILD = dict(pine=lambda n: tree_pine(n), pine2=lambda n: tree_pine(n, 13), oak=lambda n: tree_leaf(n), oak2=lambda n: tree_leaf(n, 10),
    bush=bush, palm=palm, dead=tree_dead, rock=lambda n: rock(n), rock2=lambda n: rock(n, 2.6), hay=haystack,
    house=lambda n: house(n), house2=lambda n: house(n, 10, 7, 3.2, "roof2", "plaster2"), barn=barn,
    block=lambda n: block(n), block9=lambda n: block(n, 36, 13, 9, "concrete"), ruin=lambda n: ruin(n), mud=lambda n: mudhouse(n), garage=garage,
    bags=sandbags, teeth=teeth, hedgehog=hedgehog, bunker=bunker)
def build_all(only=None):
    for o in [o for o in sc.collection.objects if o.name.startswith("u_p_")]:
        if only is None or o.name[4:] in only: bpy.data.objects.remove(o, do_unlink=True)
    out = []
    for i, (k, f) in enumerate(BUILD.items()):
        if only and k not in only: continue
        ob = f(k); ob.location = (i*45.0, -400.0, 0); out.append(ob.name)
    return out

# ---- rendering at a fixed scale: RPPM pixels per metre (the game downsamples ×4) ----
RPPM = 48
def render_prop(name, path, el_deg=40, az_deg=-90):
    from bpy_extras.object_utils import world_to_camera_view
    for o in sc.collection.objects:
        if o.type == "MESH": o.hide_render = (o.name != name)
    o = bpy.data.objects[name]; cam = bpy.data.objects["u_cam"]; sun = bpy.data.objects["u_sun"]
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]; cen = sum(pts, Vector())/8; r = max((p - cen).length for p in pts)
    az, el = math.radians(az_deg), math.radians(el_deg)
    d = Vector((math.cos(el)*math.cos(az), math.cos(el)*math.sin(az), math.sin(el)))
    cam.location = cen + d*120; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    size = r*2.04; cam.data.ortho_scale = size; cam.data.clip_end = 400
    # light always from the upper left of the screen
    L = Vector((-1.0, 0.6, 1.5)).normalized(); sun.rotation_euler = (-L).to_track_quat('-Z', 'Y').to_euler()
    res = int(math.ceil(size*RPPM/4))*4
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)
    bpy.context.view_layer.update()
    a = world_to_camera_view(sc, cam, o.matrix_world.translation)
    return {"res": res, "ax": a.x*res, "ay": (1 - a.y)*res}
