# T-72B1 (42manako, CC-BY) from SketchUp: paint out national markings, collect turret parts under one empty
import bpy, bmesh, numpy as np
r=bpy.data.objects['Sketchfab_model']; par=bpy.data.objects['Collada visual scene group']
def box(a, r):
    c=np.cumsum(np.cumsum(np.pad(a,((r+1,r),(r+1,r))+((0,0),)*(a.ndim-2),mode='edge'),0),1)
    return c[2*r+1:,2*r+1:]-c[:-2*r-1,2*r+1:]-c[2*r+1:,:-2*r-1]+c[:-2*r-1,:-2*r-1]
imgs=set()
for o in r.children_recursive:
    if o.type=='MESH':
        for m in o.data.materials:
            for n in m.node_tree.nodes:
                if n.type=='TEX_IMAGE' and n.image and 'C485' in n.image.name: imgs.add(n.image)
for im in imgs:
    w,h=im.size; px=np.array(im.pixels[:],dtype=np.float32).reshape(h,w,4)
    rgb=px[...,:3]; mx=rgb.max(-1); mn=rgb.min(-1)
    m=((mn>0.55)&(mx-mn<0.15)) | ((rgb[...,0]>0.35)&(rgb[...,0]>rgb[...,1]*2.0)&(rgb[...,0]>rgb[...,2]*1.6))
    mf=(box(m.astype(np.float32),2)>0).astype(np.float32)
    keep=1-mf; fill=box(rgb*keep[...,None],9)/np.maximum(box(keep,9)[...,None],1e-3)
    px[...,:3]=np.where(mf[...,None]>0, fill, rgb); im.pixels[:]=px.ravel(); im.update()
grp=bpy.data.objects.new('turret_grp', None); bpy.context.scene.collection.objects.link(grp); grp.parent=par; bpy.context.view_layer.update(); grp.matrix_world=par.matrix_world.copy()
for name in ['Material2','Material2.002']:
    o=bpy.data.objects[name]; o.hide_set(False); k=o.matrix_world.to_scale()[0]
    bm=bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001/k); bm.to_mesh(o.data); bm.free()
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
bpy.context.view_layer.update()
for p in [x for x in r.children_recursive if x.type=='MESH' and x.parent!=grp]:
    if not p.data.vertices: continue
    pts=[p.matrix_world@v.co for v in p.data.vertices]
    mn=[min(q[i] for q in pts) for i in range(3)]; mx=[max(q[i] for q in pts) for i in range(3)]; c=[(mn[i]+mx[i])/2 for i in range(3)]
    if mn[2]>=1.3 and ((c[0]**2+(c[1]-0.2)**2)<1.45**2 or (abs(c[0])<0.35 and c[1]<-1.0)):
        mw=p.matrix_world.copy(); p.parent=grp; p.matrix_world=mw
