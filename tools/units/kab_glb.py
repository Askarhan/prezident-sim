# game-ready 3D models for the battlefield: separate hull / turret / gun, baked camouflage, grime and AO, exported as GLB.
# Run inside Blender: exec(open(r"D:\Projects\kabinet_units\scripts\kab_glb.py").read())
import bpy, bmesh, math, os
from mathutils import Vector, Matrix
NS = {"bpy": bpy, "bmesh": bmesh, "math": math, "Vector": Vector, "Matrix": Matrix}
exec(open(r"D:\Projects\kabinet_units\scripts\kab_models.py", encoding="utf-8").read(), NS)
globals().update({k: v for k, v in NS.items() if not k.startswith("__")})
OUT = r"D:\Projects\kabinet_units\glb"; os.makedirs(OUT, exist_ok=True)

def group_join(parts, name):
    ob = join(parts, name)
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    try: bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
    except Exception: pass
    return ob
def set_origin(ob, p):
    ob.data.transform(Matrix.Translation(-Vector(p))); ob.location = Vector(p)

def tank_glb(name, tur="ru", L=7.0, nw=6, gun=4.6, era=True, era_turret=True, skirts=5, rws=False, slats=False, drums=True, bustle=True, hullH=1.6, width=2.2):
    """the same tank as m_tank_v, split into hull, turret and gun with pivots at the turret ring and the trunnions"""
    ph, pt, pg = [], [], []
    p = ph
    hull = prism("hull", [(-L/2+0.1,0.55),(L/2-0.5,0.55),(L/2,1.05),(L/2-0.4,hullH-0.05),(-L/2+0.2,hullH),(-L/2,1.2)], width, M["olive"]); bevel(hull, 0.05); p.append(hull)
    p.append(box("fenders", (L-0.1, width+1.3, 0.08), (0, 0, 1.2), M["olive2"]))
    for s in (-1, 1):
        track_full(p, L, s*(width/2+0.32), 1.12, 0.62, nw)
        for k in range(skirts): p.append(box("skirt", (L*0.75/skirts, 0.07, 0.48), (-L*0.38 + (k+0.5)*L*0.75/skirts, s*(width/2+0.67), 0.98), M["olive2"]))
        p.append(box("toolbox", (1.6, 0.4, 0.35), (-L*0.26, s*(width/2+0.4), 1.4), M["olive2"]))
        p.append(cyl("light", 0.1, 0.12, (L/2-0.45, s*(width/2+0.1), hullH-0.1), (0,math.pi/2,0), M["glass"], 8))
        p.append(cyl("cable", 0.035, L*0.55, (-0.2, s*(width/2+0.18), 1.3), (0, math.pi/2, 0), M["dark"], 6))
        for k in range(3): p.append(box("spare", (0.14, 0.6, 0.06), (L*0.12 + k*0.22, s*(width/2+0.05), hullH-0.25), M["dark"], (0, 0.5, 0)))
        if slats: p.append(box("slat", (1.2, 0.05, 0.9), (-L/2+0.5, s*(width/2+0.7), 1.6), M["dark"]))
    if era: era_grid(p, L/2-0.45, -0.9, 1.33, 1, 5, 0.5, 0.45, 0.14, (0, -0.95, 0))
    p.append(box("grille", (1.2, 1.8, 0.06), (-L/2+0.8, 0, hullH+0.02), M["dark"]))
    for k in range(6): p.append(box("slat", (0.06, 1.7, 0.08), (-L/2+0.3 + k*0.2, 0, hullH+0.06), M["steel"]))
    p.append(cyl("hatch_d", 0.3, 0.06, (L/2-1.2, 0, hullH+0.02), (0,0,0), M["olive"], 12))
    if drums:
        for s in (-1, 1): p.append(cyl("drum", 0.3, 1.0, (-L/2-0.35, s*0.6, 1.45), (math.pi/2,0,0), M["olive2"], 12))
    # turret
    p = pt
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
    p.append(cyl("hatch", 0.28, 0.06, (-0.8 + tx, -0.55, tz + 0.03), (0,0,0), M["olive"], 12))
    if rws:
        p.append(box("rws", (0.6, 0.45, 0.4), (-0.6 + tx, 0.6, tz + 0.42), M["olive"]))
        p.append(cyl("rwsgun", 0.04, 1.2, (0.1 + tx, 0.6, tz + 0.45), (0,math.pi/2,0), M["dark"], 6))
    else: p.append(cyl("mg", 0.04, 1.1, (-0.3 + tx, 0.6, tz + 0.3), (0,math.pi/2,0), M["dark"], 6))
    p.append(box("sight", (0.4, 0.3, 0.3), (0.5 + tx, -0.6, tz + 0.12), M["olive"]))
    p.append(box("sightglass", (0.05, 0.24, 0.18), (0.71 + tx, -0.6, tz + 0.12), M["glass"]))
    for yy in (0.9, -0.9): p.append(cyl("antenna", 0.015, 1.3, (-1.9 + tx, yy, tz + 0.65), (0,0,0), M["dark"], 4))
    gz = hullH + T["h"]*0.5
    p.append(box("mantlet", (0.55, 0.8, 0.55), (1.45 + tx + (0.4 if tur == "arrow" else 0), 0, gz), M["olive"]))
    k = (1 + T["top"])/2*1.03; cx0 = sum(x for x, y in out)/len(out); cy0 = sum(y for x, y in out)/len(out)
    p.append(loft("acc", [(cx0 + (x-cx0)*k + tx, cy0 + (y-cy0)*k) for x, y in out], hullH + T["h"]*0.42, 0.14, 1.0, acc_m()))
    # gun
    p = pg
    gx0 = 1.6 + tx + (0.4 if tur == "arrow" else 0)
    p.append(cyl("gun", 0.12, gun, (gx0 + gun/2, 0, gz), (0, math.pi/2, 0), M["steel"], 14))
    p.append(cyl("evac", 0.17, 0.8, (gx0 + gun*0.45, 0, gz), (0, math.pi/2, 0), M["steel"], 14))
    p.append(cyl("muzzle", 0.14, 0.25, (gx0 + gun - 0.1, 0, gz), (0, math.pi/2, 0), M["steel"], 14))
    p.append(cyl("sleeve", 0.16, 0.6, (gx0 + 0.3, 0, gz), (0, math.pi/2, 0), M["olive"], 14))
    H = group_join(ph, name + "_hull"); Tt = group_join(pt, name + "_turret"); G = group_join(pg, name + "_gun")
    zmin = min((H.matrix_world @ Vector(c)).z for c in H.bound_box)
    set_origin(H, (0, 0, zmin)); set_origin(Tt, (tx, 0, hullH)); set_origin(G, (gx0, 0, gz))
    for o, par in ((Tt, H), (G, Tt)):
        mw = o.matrix_world.copy(); o.parent = par; o.matrix_world = mw
    H["muzzle"] = gun
    return H, Tt, G

# ---- baking: camouflage, grime, edge wear and ambient occlusion into one colour texture per part ----
CAMO = {"green": [(0.030, 0.040, 0.018), (0.060, 0.068, 0.030), (0.020, 0.017, 0.012)],
        "desert": [(0.36, 0.27, 0.15), (0.26, 0.19, 0.10), (0.42, 0.34, 0.21)]}
def node(nt, t, **kw):
    n = nt.nodes.new(t)
    for k, v in kw.items(): setattr(n, k, v)
    return n
def bake_material(src, img, camo, olive):
    m = src.copy(); m.name = "bk_" + src.name; nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    base_in = next(s for s in b.inputs if s.identifier == "Base Color")
    base_src = base_in.links[0].from_socket if base_in.links else None
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    tc = node(nt, "ShaderNodeTexCoord")
    col = base_src
    if col is None:
        rgb = node(nt, "ShaderNodeRGB"); rgb.outputs[0].default_value = base_in.default_value; col = rgb.outputs[0]
    if olive:
        nz = node(nt, "ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.42; nz.inputs["Detail"].default_value = 3; nz.inputs["Roughness"].default_value = 0.55
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        cr = node(nt, "ShaderNodeValToRGB"); cr.color_ramp.interpolation = "CONSTANT"
        e = cr.color_ramp.elements; e[0].position = 0.0; e[0].color = (*CAMO[camo][0], 1); e[1].position = 0.47; e[1].color = (*CAMO[camo][1], 1)
        e3 = e.new(0.6); e3.color = (*CAMO[camo][2], 1)
        nt.links.new(nz.outputs["Fac"], cr.inputs["Fac"])
        # keep the fine noise of the original material on top of the camouflage
        mx = node(nt, "ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "OVERLAY"; mx.inputs[0].default_value = 0.35
        nt.links.new(cr.outputs["Color"], mx.inputs[6]); nt.links.new(col, mx.inputs[7]); col = mx.outputs[2]
    # edge wear: worn paint on sharp edges
    geo = node(nt, "ShaderNodeNewGeometry")
    er = node(nt, "ShaderNodeValToRGB"); er.color_ramp.elements[0].position = 0.52; er.color_ramp.elements[1].position = 0.6
    nt.links.new(geo.outputs["Pointiness"], er.inputs["Fac"])
    light = node(nt, "ShaderNodeMix"); light.data_type = "RGBA"; light.blend_type = "SCREEN"
    nt.links.new(er.outputs["Color"], light.inputs[0]); nt.links.new(col, light.inputs[6]); light.inputs[7].default_value = (0.075, 0.07, 0.06, 1)
    col = light.outputs[2]
    # dust and mud low on the vehicle
    sep = node(nt, "ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    mr = node(nt, "ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 1.4; mr.inputs["From Max"].default_value = 0.2; mr.inputs["To Min"].default_value = 0; mr.inputs["To Max"].default_value = 0.42
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    nz2 = node(nt, "ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 4.0; nz2.inputs["Detail"].default_value = 6
    nt.links.new(tc.outputs["Object"], nz2.inputs["Vector"])
    mm = node(nt, "ShaderNodeMath"); mm.operation = "MULTIPLY"; nt.links.new(mr.outputs[0], mm.inputs[0]); nt.links.new(nz2.outputs["Fac"], mm.inputs[1])
    mm2 = node(nt, "ShaderNodeMath"); mm2.operation = "MULTIPLY"; mm2.inputs[1].default_value = 1.6; nt.links.new(mm.outputs[0], mm2.inputs[0]); mm2.use_clamp = True
    dust = node(nt, "ShaderNodeMix"); dust.data_type = "RGBA"
    nt.links.new(mm2.outputs[0], dust.inputs[0]); nt.links.new(col, dust.inputs[6]); dust.inputs[7].default_value = ((0.16, 0.13, 0.09, 1) if camo == "green" else (0.42, 0.34, 0.22, 1))
    col = dust.outputs[2]
    # ambient occlusion
    ao = node(nt, "ShaderNodeAmbientOcclusion"); ao.samples = 16; ao.inputs["Distance"].default_value = 0.9
    aor = node(nt, "ShaderNodeMapRange"); aor.inputs["To Min"].default_value = 0.32; aor.inputs["To Max"].default_value = 1.0
    nt.links.new(ao.outputs["AO"], aor.inputs["Value"])
    mul = node(nt, "ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs[0].default_value = 1.0
    nt.links.new(col, mul.inputs[6]); nt.links.new(aor.outputs[0], mul.inputs[7]); col = mul.outputs[2]
    em = node(nt, "ShaderNodeEmission"); nt.links.new(col, em.inputs["Color"]); nt.links.new(em.outputs[0], out.inputs["Surface"])
    it = node(nt, "ShaderNodeTexImage"); it.image = img; nt.nodes.active = it; it.select = True
    return m
def bake_part(ob, size, camo="green", samples=24):
    sc0 = bpy.context.scene
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.01); bpy.ops.object.mode_set(mode='OBJECT')
    img = bpy.data.images.get(ob.name + "_" + camo)
    if img: bpy.data.images.remove(img)
    img = bpy.data.images.new(ob.name + "_" + camo, size, size)
    orig = [s.material for s in ob.material_slots]
    acc_idx = [i for i, m in enumerate(orig) if m and m.name.startswith("u_accent")]
    for i, m in enumerate(orig):
        if i in acc_idx: continue
        ob.material_slots[i].material = bake_material(m, img, camo, m.name.startswith("u_olive"))
    if acc_idx:   # the accent keeps its own material; bake it as a plain light colour so the texture has no holes
        ob.material_slots[acc_idx[0]].material = bake_material(orig[acc_idx[0]], img, camo, False)
    sc0.render.engine = "CYCLES"; sc0.cycles.samples = samples; sc0.cycles.use_denoising = False
    try: sc0.cycles.device = "GPU"
    except Exception: pass
    sc0.render.bake.margin = 4
    bpy.ops.object.bake(type="EMIT")
    for i, m in enumerate(orig):
        bk = ob.material_slots[i].material; ob.material_slots[i].material = m
        if bk and bk.name.startswith("bk_"): bpy.data.materials.remove(bk)
    img.filepath_raw = os.path.join(OUT, img.name + ".png"); img.file_format = "PNG"; img.save()
    return img, acc_idx
def finalize_part(ob, img, acc_idx, rough=0.72, metal=0.15):
    """one textured body material + the side-colour accent material"""
    body = bpy.data.materials.get("g_" + img.name) or bpy.data.materials.new("g_" + img.name)
    body.use_nodes = True; nt = body.node_tree; b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    for n in [n for n in nt.nodes if n.type == "TEX_IMAGE"]: nt.nodes.remove(n)
    it = nt.nodes.new("ShaderNodeTexImage"); it.image = img
    nt.links.new(it.outputs["Color"], next(s for s in b.inputs if s.identifier == "Base Color"))
    next(s for s in b.inputs if s.identifier == "Roughness").default_value = rough
    next(s for s in b.inputs if s.identifier == "Metallic").default_value = metal
    acc = bpy.data.materials.get("accent") or mat("accent", (0.8, 0.8, 0.8), 0.5)
    idx = [1 if poly.material_index in acc_idx else 0 for poly in ob.data.polygons]
    ob.data.materials.clear(); ob.data.materials.append(body); ob.data.materials.append(acc)
    for poly, k in zip(ob.data.polygons, idx): poly.material_index = k
def export_glb(objs, path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_image_format="JPEG", export_image_quality=86,
                              export_apply=True, export_animations=False, export_yup=True, export_extras=True, use_active_scene=True)
