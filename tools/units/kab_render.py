
import bpy, math, os
from mathutils import Vector
sc = bpy.data.scenes["units"]; cam = bpy.data.objects["u_cam"]
ROOT = r"D:\Projects\kabinet_units"
def models(): return [o.name for o in sc.collection.objects if o.type == "MESH" and not o.name.startswith("u_")]
def shoot(name, az_deg, path, elev_deg=35, res=512):
    for m in models(): bpy.data.objects[m].hide_render = (m != name)
    o = bpy.data.objects[name]
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]; cen = sum(pts, Vector())/8; r = max((p - cen).length for p in pts)
    az, el = math.radians(az_deg), math.radians(elev_deg)
    d = Vector((math.cos(el)*math.cos(az), math.cos(el)*math.sin(az), math.sin(el)))
    cam.location = cen + d*40; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = r*2.05; cam.data.clip_end = 120
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)
def sheet(paths, out, cell=512, bgc=(0.12,0.15,0.2)):
    imgs = [bpy.data.images.load(p, check_existing=False) for p in paths]
    W = sum(i.size[0] for i in imgs); H = max(i.size[1] for i in imgs)
    px = [bgc[0], bgc[1], bgc[2], 1.0]*(W*H); x0 = 0
    for im in imgs:
        w, h = im.size; p = im.pixels[:]
        for y in range(h):
            for x in range(w):
                a = p[(y*w+x)*4+3]
                if a > 0:
                    i = (y*W + x0 + x)*4
                    for c in range(3): px[i+c] = p[(y*w+x)*4+c]*a + px[i+c]*(1-a)
        x0 += w; bpy.data.images.remove(im)
    s = bpy.data.images.new("sheet_tmp", W, H, alpha=True); s.pixels = px; s.filepath_raw = out; s.file_format = 'PNG'; s.save(); bpy.data.images.remove(s)
