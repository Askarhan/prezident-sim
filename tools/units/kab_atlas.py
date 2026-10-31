
import numpy as np, os, math
exec(bpy.data.texts["kab_render"].as_string())
sc.render.use_freestyle = False
FR = os.path.join(ROOT, "frames"); os.makedirs(FR, exist_ok=True)
TMP = os.path.join(ROOT, "_tmp.png")
def down(path, f=4):
    im = bpy.data.images.load(path, check_existing=False); w, h = im.size
    a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4); bpy.data.images.remove(im)
    rgb = a[..., :3]*a[..., 3:4]                      # premultiplied, so edges do not get dark halos
    al = a[..., 3]
    rgb = rgb.reshape(h//f, f, w//f, f, 3).mean(axis=(1,3)); al = al.reshape(h//f, f, w//f, f).mean(axis=(1,3))
    out = np.zeros((h//f, w//f, 4), np.float32); nz = al > 1e-4
    out[..., :3][nz] = rgb[nz]/al[nz][:, None]; out[..., 3] = al
    return out
def save_np(arr, path):
    h, w = arr.shape[:2]; im = bpy.data.images.new("np_tmp", w, h, alpha=True)
    im.pixels = arr.ravel(); im.filepath_raw = path; im.file_format = 'PNG'; im.save(); bpy.data.images.remove(im)
def frames_for(name, res=384, f=4, elev=40):
    for d in range(8):
        az = -90 - d*45
        shoot(name, az, TMP, elev_deg=elev, res=res)
        save_np(down(TMP, f), os.path.join(FR, f"{name}_{d}.png"))
