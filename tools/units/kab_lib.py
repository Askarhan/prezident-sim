
import bpy, bmesh, math
from mathutils import Vector, Matrix
sc = bpy.data.scenes.get("units")
def bsdf(m):
    return next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
def sock(node, ident):
    return next(s for s in node.inputs if s.identifier == ident)
def mat(name, rgb, rough=0.6, metal=0.0):
    m = bpy.data.materials.get(name)
    if m and m.get("kab_locked"): return m
    if not m:
        m = bpy.data.materials.new(name)
        try: m.use_nodes = True
        except Exception: pass
    b = bsdf(m)
    sock(b, "Base Color").default_value = (*rgb, 1)
    sock(b, "Roughness").default_value = rough
    sock(b, "Metallic").default_value = metal
    m.diffuse_color = (*rgb, 1)
    return m
def link(ob):
    for c in list(ob.users_collection): c.objects.unlink(ob)
    sc.collection.objects.link(ob); return ob
def prism(name, profile, width, m, axis="Y"):
    """profile (x,z) closed outline extruded along Y by width, centred"""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); hw = width/2
    v1 = [bm.verts.new((x, -hw, z)) for x, z in profile]; v2 = [bm.verts.new((x, hw, z)) for x, z in profile]
    bm.faces.new(v1); bm.faces.new(v2[::-1])
    n = len(profile)
    for i in range(n):
        j = (i+1) % n; bm.faces.new((v1[j], v1[i], v2[i], v2[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); ob.data.materials.append(m); return ob
def plan(name, outline, thick, m, z=0):
    """outline (x,y) in plan, extruded up by thick"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    v1 = [bm.verts.new((x, y, z)) for x, y in outline]; v2 = [bm.verts.new((x, y, z+thick)) for x, y in outline]
    bm.faces.new(v1); bm.faces.new(v2[::-1]); n = len(outline)
    for i in range(n):
        j = (i+1) % n; bm.faces.new((v1[j], v1[i], v2[i], v2[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); ob.data.materials.append(m); return ob
def cyl(name, r, depth, loc, rot=(0,0,0), m=None, verts=12, r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    else: bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot)
    ob = link(bpy.context.active_object); ob.name = name
    if m: ob.data.materials.append(m)
    return ob
def box(name, size, loc, m, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    ob = link(bpy.context.active_object); ob.name = name; ob.scale = size
    bpy.ops.object.transform_apply(scale=True); ob.data.materials.append(m); return ob
def bevel(ob, w=0.04, seg=2, ang=40):
    md = ob.modifiers.new("bev", "BEVEL"); md.width = w; md.segments = seg; md.limit_method = 'ANGLE'; md.angle_limit = math.radians(ang); return ob
def join(objs, name):
    for o in objs:
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); ob = bpy.context.active_object; ob.name = name
    bpy.ops.object.shade_flat(); return ob
def clear():
    for o in list(sc.collection.all_objects): bpy.data.objects.remove(o, do_unlink=True)
M = {}
def mats():
    M.update(olive=mat("u_olive", (0.20, 0.26, 0.11)), olive2=mat("u_olive2", (0.30, 0.36, 0.17)),
         track=mat("u_track", (0.05, 0.05, 0.05), 0.9), steel=mat("u_steel", (0.16, 0.16, 0.18), 0.45, 0.5),
         grey=mat("u_grey", (0.38, 0.41, 0.46)), grey2=mat("u_grey2", (0.52, 0.55, 0.6)), glass=mat("u_glass", (0.04, 0.10, 0.20), 0.08, 0.2),
         white=mat("u_white", (0.82, 0.82, 0.78)), red=mat("u_red", (0.65, 0.07, 0.05)), dark=mat("u_dark", (0.09, 0.09, 0.1)),
         flame=mat("u_flame", (1.0, 0.45, 0.05)))
mats()

def real_mat(name, rgb, rough=0.75, noise=0.35, metal=0.0):
    m = bpy.data.materials.get(name) or mat(name, rgb, rough)
    nt = m.node_tree; b = bsdf(m)
    for n in [n for n in nt.nodes if n.name.startswith("wx_")]: nt.nodes.remove(n)
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.name = "wx_tc"
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.name = "wx_noise"; nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 6
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.name = "wx_ramp"
    ramp.color_ramp.elements[0].color = (*[c*(1-noise) for c in rgb], 1); ramp.color_ramp.elements[1].color = (*[min(1, c*(1+noise*0.6)) for c in rgb], 1)
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"]); nt.links.new(nz.outputs["Fac"], ramp.inputs["Fac"]); nt.links.new(ramp.outputs["Color"], sock(b, "Base Color"))
    sock(b, "Roughness").default_value = rough; sock(b, "Metallic").default_value = metal
    m.diffuse_color = (*rgb, 1); m["kab_locked"] = 1; return m
def realistic():
    real_mat("u_olive", (0.045, 0.055, 0.025)); real_mat("u_olive2", (0.06, 0.07, 0.033))
    real_mat("u_track", (0.025, 0.022, 0.02), 0.95, 0.2); real_mat("u_steel", (0.05, 0.05, 0.05), 0.5, 0.2, 0.3)
    real_mat("u_grey", (0.12, 0.13, 0.15), 0.6, 0.25); real_mat("u_grey2", (0.17, 0.18, 0.2), 0.6, 0.25)
    real_mat("u_navy", (0.11, 0.12, 0.13), 0.6, 0.2); real_mat("u_deck", (0.05, 0.055, 0.06), 0.85, 0.2)
    real_mat("u_dark", (0.02, 0.02, 0.022), 0.7, 0.15); real_mat("u_white", (0.55, 0.55, 0.52), 0.5, 0.12)
    real_mat("u_olivemis", (0.06, 0.075, 0.035), 0.6, 0.2); real_mat("u_sub", (0.02, 0.022, 0.025), 0.6, 0.15)
    real_mat("u_red", (0.35, 0.03, 0.02), 0.6, 0.15)
