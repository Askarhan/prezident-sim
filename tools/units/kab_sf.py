# Sketchfab models (CC-BY) for the battlefield: split into hull / turret / gun, lighten, bake one texture per part, export GLB.
# exec(open(r"D:\Projects\kabinet_units\scripts\kab_sf.py").read()) after kab_glb.py has been executed in the same namespace.
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

def sf_meshes(root):
    return [o for o in root.children_recursive if o.type == "MESH"]
def sf_world_copy(objs, name):
    """one mesh in world space from several objects (materials kept)"""
    bm_all = []; mats = []; out = bpy.data.meshes.new(name); bm = bmesh.new()
    for o in objs:
        me = o.data.copy(); me.transform(o.matrix_world)
        base = len(mats)
        for m in me.materials:
            if m not in mats: mats.append(m)
        idx = [mats.index(m) for m in me.materials]
        for p in me.polygons: p.material_index = idx[p.material_index] if idx else 0
        bm.from_mesh(me); bpy.data.meshes.remove(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)   # imported meshes come split per face: weld them so islands and decimation work
    bm.to_mesh(out); bm.free()
    for m in mats: out.materials.append(m)
    ob = bpy.data.objects.new(name, out); bpy.context.scene.collection.objects.link(ob); return ob
def sf_rotate_front(objs, front):
    """turn the model so that its front looks along +X"""
    ang = {"+X": 0, "-Y": math.pi/2, "-X": math.pi, "+Y": -math.pi/2}[front]
    R = Matrix.Rotation(ang, 4, "Z")
    for o in objs: o.data.transform(R)
def sf_bounds(objs):
    pts = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    return Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
def sf_split_gun(tur, min_len=0.8, max_cross=0.45):
    """the barrel: loose parts of the turret that are long along X and thin across, ahead of the turret centre"""
    bm = bmesh.new(); bm.from_mesh(tur.data); bm.verts.ensure_lookup_table()
    cx = sum(v.co.x for v in bm.verts)/len(bm.verts)
    seen = set(); gun_faces = []; info = []
    for f in bm.faces:
        if f.index in seen: continue
        stack = [f]; part = []; seen.add(f.index)
        while stack:
            g = stack.pop(); part.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen: seen.add(h.index); stack.append(h)
        vs = {v for g in part for v in g.verts}
        xs = [v.co.x for v in vs]; ys = [v.co.y for v in vs]; zs = [v.co.z for v in vs]
        L = max(xs) - min(xs); C = max(max(ys) - min(ys), max(zs) - min(zs))
        info.append((part, min(xs), max(xs), (max(ys) + min(ys))/2, (max(zs) + min(zs))/2, L, C))
        if L >= min_len and C <= max_cross and (max(xs) + min(xs))/2 > cx: gun_faces += part
    if not gun_faces: bm.free(); return None
    # sleeves, fume extractor, muzzle brake: thin parts sitting on the same axis
    gv = {v for g in gun_faces for v in g.verts}
    y0 = sum(v.co.y for v in gv)/len(gv); z0 = sum(v.co.z for v in gv)/len(gv); gx0 = min(v.co.x for v in gv)
    got = {g.index for g in gun_faces}
    for part, x0, x1, py, pz, L, C in info:
        if part[0].index in got: continue
        if C <= max_cross and abs(py - y0) < 0.12 and abs(pz - z0) < 0.12 and x0 > gx0 - 1.2 and (x0 + x1)/2 > cx: gun_faces += part
    # move the barrel faces into a new mesh
    gb = bm.copy(); keep = {f.index for f in gun_faces}
    bmesh.ops.delete(gb, geom=[f for f in gb.faces if f.index not in keep], context="FACES")
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index in keep], context="FACES")
    gme = bpy.data.meshes.new(tur.name.replace("_turret", "_gun")); gb.to_mesh(gme); gb.free(); bm.to_mesh(tur.data); bm.free()
    for m in tur.data.materials: gme.materials.append(m)
    g = bpy.data.objects.new(gme.name, gme); bpy.context.scene.collection.objects.link(g); return g
def sf_decimate(ob, target):
    n = len(ob.data.polygons)
    if n <= target: return n
    vs = [v.co for v in ob.data.vertices]; pad = 0.03   # local space: the bmesh below works on local coordinates
    mn = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))); mx = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    md = ob.modifiers.new("dec", "DECIMATE"); md.ratio = max(0.05, target/n)
    bpy.context.view_layer.objects.active = ob; bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True)
    bpy.ops.object.modifier_apply(modifier=md.name)
    # collapsing welded, non-manifold meshes can throw spikes outside the model: cut them
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bad = [v for v in bm.verts if any(v.co[i] < mn[i] - pad or v.co[i] > mx[i] + pad for i in range(3))]
    if bad: bmesh.ops.delete(bm, geom=bad, context="VERTS"); bm.to_mesh(ob.data)
    bm.free(); return len(ob.data.polygons)
def sf_accent(tur, objs_list):
    """the side colour: a band across the turret roof — the battlefield camera looks from above"""
    mn, mx = sf_bounds([tur]); acc = bpy.data.materials.get("u_accent")
    # the turret body seen from above: a grid of rays straight down; thin barrels, antennas and sights catch few of them
    bpy.context.view_layer.update(); hits = []; N = 28
    for i in range(N):
        for j in range(N):
            x = mn.x + (i + 0.5)/N*(mx.x - mn.x); y = mn.y + (j + 0.5)/N*(mx.y - mn.y)
            ok, loc, nrm, fi = tur.ray_cast(Vector((x, y, mx.z + 1)), Vector((0, 0, -1)))
            if ok: hits.append(loc.copy())
    if not hits: hits = [Vector(((mn.x + mx.x)/2, (mn.y + mx.y)/2, mx.z))]
    med = lambda a: sorted(a)[len(a)//2]; pc = lambda a, q: sorted(a)[int(q*(len(a) - 1))]
    cx = med([h.x for h in hits]); cy = med([h.y for h in hits])
    W = pc([h.y for h in hits], 0.9) - pc([h.y for h in hits], 0.1)
    near = [h.z for h in hits if abs(h.x - cx) < 0.5 and abs(h.y - cy) < W*0.3] or [h.z for h in hits]
    z = pc(near, 0.8)   # on top of reactive armour bricks and hatches rather than between them
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, z + 0.03)); b = bpy.context.active_object
    b.scale = (0.22, W*0.6, 0.05); bpy.ops.object.transform_apply(scale=True); b.data.materials.append(acc)
    for c in list(b.users_collection): c.objects.unlink(b)
    bpy.context.scene.collection.objects.link(b)
    bpy.ops.object.select_all(action="DESELECT"); b.select_set(True); tur.select_set(True); bpy.context.view_layer.objects.active = tur; bpy.ops.object.join()
    return tur
def sf_build(root_name, mid, front, turret_key="turret", drop=(), length=None, targets=(9000, 4000, 900), gun=True, accent=True, gun_cross=0.45):
    """root: the imported Sketchfab empty. Returns hull, turret, gun objects at the origin, front along +X"""
    root = bpy.data.objects[root_name]; root.location = (0, 0, 0); bpy.context.view_layer.update()
    meshes = [o for o in sf_meshes(root) if not any(d in o.name.lower() for d in drop)]
    def chain(o):
        out = []
        while o: out.append(o); o = o.parent
        return out
    keys = (turret_key,) if isinstance(turret_key, str) else tuple(turret_key or ())
    is_tur = lambda o: any(k.lower() in a.name.lower() for a in chain(o) for k in keys)
    tur_objs = [o for o in meshes if is_tur(o)]; hull_objs = [o for o in meshes if not is_tur(o)]
    H = sf_world_copy(hull_objs, "g_" + mid + "_hull"); T = sf_world_copy(tur_objs, "g_" + mid + "_turret") if tur_objs else None
    objs = [o for o in (H, T) if o]
    sf_rotate_front(objs, front)
    mn, mx = sf_bounds(objs); k = (length/(mx.x - mn.x)) if length else 1.0
    c = Vector(((mn.x + mx.x)/2, (mn.y + mx.y)/2, mn.z))
    for o in objs: o.data.transform(Matrix.Scale(k, 4) @ Matrix.Translation(-c))
    G = sf_split_gun(T, max_cross=gun_cross) if (T and gun) else None
    # pivots: turret ring at the bottom centre of the turret, gun at the breech
    if T:
        tmn, tmx = sf_bounds([T]); tp = Vector(((tmn.x + tmx.x)/2 - (tmx.x - tmn.x)*0.1 if G is None else (tmn.x + tmx.x)/2, (tmn.y + tmx.y)/2, tmn.z))
    if G:
        gmn, gmx = sf_bounds([G]); gp = Vector((gmn.x, (gmn.y + gmx.y)/2, (gmn.z + gmx.z)/2))
        tmn, tmx = sf_bounds([T]); tp = Vector(((tmn.x + min(tmx.x, gmn.x))/2, (tmn.y + tmx.y)/2, tmn.z))
    # remove the import
    for o in list(root.children_recursive) + [root]: bpy.data.objects.remove(o, do_unlink=True)
    for o, t in zip((H, T, G), targets):
        if o: sf_decimate(o, t)
    if T and accent: sf_accent(T, None)
    elif accent: sf_accent(H, None)   # launchers without a turret carry the side colour on the roof of the hull
    for o in (H, T, G):
        if o: bpy.context.view_layer.objects.active = o; bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40)) if hasattr(bpy.ops.object, "shade_smooth_by_angle") else None
    if T: set_origin(T, tp)
    if G: set_origin(G, gp)
    bpy.context.view_layer.update()
    if T: mw = T.matrix_world.copy(); T.parent = H; T.matrix_world = mw
    if G: mw = G.matrix_world.copy(); G.parent = T or H; G.matrix_world = mw
    if G: H["muzzle"] = gmx.x - gmn.x
    return [o for o in (H, T, G) if o]

def sf_bake_material(src, img):
    """emission = the model's own base colour × ambient occlusion"""
    m = src.copy(); m.name = "bk_" + src.name; nt = m.node_tree
    b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None); out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    if b:
        base_in = next(s for s in b.inputs if s.identifier == "Base Color"); col = base_in.links[0].from_socket if base_in.links else None
        if col is None: rgb = nt.nodes.new("ShaderNodeRGB"); rgb.outputs[0].default_value = base_in.default_value; col = rgb.outputs[0]
    else:
        rgb = nt.nodes.new("ShaderNodeRGB"); rgb.outputs[0].default_value = (0.2, 0.2, 0.2, 1); col = rgb.outputs[0]
    ao = nt.nodes.new("ShaderNodeAmbientOcclusion"); ao.samples = 16; ao.inputs["Distance"].default_value = 0.8
    rr = nt.nodes.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.4; nt.links.new(ao.outputs["AO"], rr.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs[0].default_value = 1.0
    nt.links.new(col, mul.inputs[6]); nt.links.new(rr.outputs[0], mul.inputs[7])
    em = nt.nodes.new("ShaderNodeEmission"); nt.links.new(mul.outputs[2], em.inputs["Color"]); nt.links.new(em.outputs[0], out.inputs["Surface"])
    it = nt.nodes.new("ShaderNodeTexImage"); it.image = img; nt.nodes.active = it
    return m
def sf_bake_part(ob, size, samples=16):
    me = ob.data
    uv = me.uv_layers.new(name="bake"); me.uv_layers.active = uv     # bake target UV; the old one stays the render UV for the source textures
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.002, area_weight=1.0)
    try: bpy.ops.uv.pack_islands(rotate=True, margin=0.002)
    except Exception: pass
    bpy.ops.object.mode_set(mode="OBJECT")
    img = bpy.data.images.get(ob.name + "_sf")
    if img: bpy.data.images.remove(img)
    img = bpy.data.images.new(ob.name + "_sf", size, size)
    orig = [s.material for s in ob.material_slots]
    acc_idx = [i for i, m in enumerate(orig) if m and m.name.startswith("u_accent")]
    for i, m in enumerate(orig):
        if m is None: continue
        ob.material_slots[i].material = bake_material(m, img, "green", False) if i in acc_idx else sf_bake_material(m, img)
    sc0 = bpy.context.scene; sc0.render.engine = "CYCLES"; sc0.cycles.samples = samples; sc0.cycles.use_denoising = False; sc0.cycles.device = "GPU"; sc0.render.bake.margin = 4
    bpy.ops.object.bake(type="EMIT")
    for i, m in enumerate(orig):
        bk = ob.material_slots[i].material; ob.material_slots[i].material = m
        if bk and bk.name.startswith("bk_"): bpy.data.materials.remove(bk)
    # only the baked UV goes to the game
    for l in [l for l in me.uv_layers if l.name != "bake"]: me.uv_layers.remove(l)
    img.filepath_raw = os.path.join(OUT, img.name + ".png"); img.file_format = "PNG"; img.save()
    return img, acc_idx
def sf_make(root_name, mid, front, **kw):
    for suf in ("_hull", "_turret", "_gun"):
        for o in [o for o in bpy.data.objects if o.name.split('.')[0] == "g_" + mid + suf]: bpy.data.objects.remove(o, do_unlink=True)
    objs = sf_build(root_name, mid, front, **kw)
    for o, suf in zip(objs, ("_hull", "_turret", "_gun")): o.name = "g_" + mid + suf   # the game finds parts by these exact names
    res = []
    for o, size in zip(objs, (1024, 512, 256)):
        img, acc = sf_bake_part(o, size); res.append((o, img, acc))
    for o, img, acc in res: finalize_part(o, img, acc, metal=0.4 if o.name.endswith("gun") else 0.1, rough=0.6 if o.name.endswith("gun") else 0.78)
    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    objs[0].location = (0, 0, 0)
    path = os.path.join(OUT, mid + ".glb"); export_glb(objs, path)
    objs[0].location = (len(mid)*20, 820, 0)
    return {"file": os.path.getsize(path), "faces": [len(o.data.polygons) for o in objs], "lo": sf_lod(mid)}

def sf_lod(mid, targets=(1700, 900, 120), tex_div=2):
    """the far / weak-phone copy: <mid>_lo.glb with the same node names, fewer triangles, smaller textures"""
    src = [bpy.data.objects.get("g_" + mid + s) for s in ("_hull", "_turret", "_gun")]
    src = [o for o in src if o]
    copies = {}
    for o in src:
        c = o.copy(); c.data = o.data.copy(); bpy.context.scene.collection.objects.link(c); copies[o] = c
    for o, c in copies.items():
        if o.parent in copies: c.parent = copies[o.parent]; c.matrix_parent_inverse = o.matrix_parent_inverse.copy()
    made = []
    for (o, c), t in zip(copies.items(), targets):
        # after baking, collapse stalls on the many tiny open pieces: weld near vertices first (UVs live on loops and survive)
        bm = bmesh.new(); bm.from_mesh(c.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.015); bm.to_mesh(c.data); bm.free()
        sf_decimate(c, t)
        for i, m in enumerate(c.data.materials):
            if not m or m.name == "accent": continue
            m2 = m.copy(); m2.name = m.name + "_lo"; made.append(m2)
            for n in m2.node_tree.nodes:
                if n.type == "TEX_IMAGE" and n.image:
                    im = n.image.copy(); im.name = n.image.name + "_lo"
                    im.scale(max(64, n.image.size[0]//tex_div), max(64, n.image.size[1]//tex_div)); n.image = im
            c.data.materials[i] = m2
    # swap names so the exported nodes keep the names the game looks for
    names = {o: o.name for o in copies}
    for o in copies: o.name = o.name + "_hi"
    for o, c in copies.items(): c.name = names[o]
    root = copies[src[0]]; loc = src[0].location.copy(); root.location = (0, 0, 0)
    path = os.path.join(OUT, mid + "_lo.glb"); export_glb(list(copies.values()), path)
    tris = sum(sum(len(p.vertices) - 2 for p in c.data.polygons) for c in copies.values())
    for c in copies.values(): bpy.data.objects.remove(c, do_unlink=True)
    for o in copies: o.name = names[o]
    src[0].location = loc
    for m2 in made:
        for n in m2.node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image and n.image.name.endswith("_lo"): bpy.data.images.remove(n.image)
        bpy.data.materials.remove(m2)
    return {"file": os.path.getsize(path), "tris": tris}

def sf_info(root_name="Sketchfab_model", depth=3, min_faces=200):
    """what an import consists of: named nodes with their mesh face counts and world boxes"""
    root = bpy.data.objects[root_name]; root.location = (0, 0, 0); bpy.context.view_layer.update(); out = []
    def box(objs):
        pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
        return [round(min(p[i] for p in pts), 2) for i in range(3)], [round(max(p[i] for p in pts), 2) for i in range(3)]
    def walk(o, d):
        sub = [x for x in [o] + list(o.children_recursive) if x.type == "MESH" and len(x.data.polygons)]
        if not sub: return
        n = sum(len(x.data.polygons) for x in sub)
        if n < min_faces and d > 1: return
        mn, mx = box(sub); out.append("  "*d + f"{o.name} [{len(sub)} meshes, {n} f] {mn} {mx}")
        if d < depth and len(o.children) > 1 or (d < depth and o.type != "MESH"):
            for c in o.children: walk(c, d + 1)
    walk(root, 0); return "\n".join(out)

def sf_group(root_name, pred, weld=True, split=True):
    """break merged meshes into loose parts and put the parts pred(mn, mx, centre) accepts under an empty named turret_grp"""
    root = bpy.data.objects[root_name]; root.location = (0, 0, 0); bpy.context.view_layer.update()
    meshes = [o for o in root.children_recursive if o.type == "MESH" and len(o.data.polygons)]
    par = meshes[0].parent
    grp = bpy.data.objects.new("turret_grp", None); bpy.context.scene.collection.objects.link(grp)
    grp.parent = par; bpy.context.view_layer.update(); grp.matrix_world = par.matrix_world.copy() if par else grp.matrix_world
    if split:
        for o in meshes:
            k = o.matrix_world.to_scale()[0] or 1
            if weld:
                bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001/k); bm.to_mesh(o.data); bm.free()
            o.hide_set(False); bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
            bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.separate(type="LOOSE"); bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.view_layer.update(); n = 0
    for p in [x for x in root.children_recursive if x.type == "MESH" and x.parent != grp and len(x.data.vertices)]:
        pts = [p.matrix_world @ v.co for v in p.data.vertices]
        mn = [min(q[i] for q in pts) for i in range(3)]; mx = [max(q[i] for q in pts) for i in range(3)]; c = [(mn[i] + mx[i])/2 for i in range(3)]
        if pred(mn, mx, c): mw = p.matrix_world.copy(); p.parent = grp; p.matrix_world = mw; n += 1
    return n

def sf_parts(root_name="Sketchfab_model", top=25):
    """the biggest loose parts after welding (without changing the import): to find the turret box"""
    root = bpy.data.objects[root_name]; root.location = (0, 0, 0); bpy.context.view_layer.update(); parts = []
    for o in [x for x in root.children_recursive if x.type == "MESH" and len(x.data.polygons)]:
        bm = bmesh.new(); bm.from_mesh(o.data); bm.transform(o.matrix_world); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
        bm.faces.ensure_lookup_table(); seen = set()
        for f in bm.faces:
            if f.index in seen: continue
            st = [f]; seen.add(f.index); pf = []
            while st:
                g = st.pop(); pf.append(g)
                for e in g.edges:
                    for h in e.link_faces:
                        if h.index not in seen: seen.add(h.index); st.append(h)
            vs = {v for g in pf for v in g.verts}
            parts.append((len(pf), o.name, [round(min(v.co[i] for v in vs), 2) for i in range(3)], [round(max(v.co[i] for v in vs), 2) for i in range(3)]))
        bm.free()
    parts.sort(key=lambda p: -p[0]); return "\n".join(f"{n} {nm} {a} {b}" for n, nm, a, b in parts[:top])
