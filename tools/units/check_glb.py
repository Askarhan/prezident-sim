# sanity check of game models: the gun must sit high on the turret and point forward; pivots at the turret ring and trunnions
import json, struct, sys
def check(path):
    b = open(path, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20+n])
    nodes = {nd['name'].split('_')[-1]: nd for nd in j['nodes']}
    def box(nd):
        acc = j['accessors'][j['meshes'][nd['mesh']]['primitives'][0]['attributes']['POSITION']]; return acc['min'], acc['max']
    T = lambda nd: nd.get('translation', [0, 0, 0])
    hull, tur, gun = nodes['hull'], nodes['turret'], nodes['gun']
    ht = box(hull)[1][1]; tt = T(tur); gt = [tt[i] + T(gun)[i] for i in range(3)]
    gmin, gmax = box(gun)
    gun_y = gt[1] + (gmin[1] + gmax[1])/2; gun_x0 = gt[0] + gmin[0]; gun_x1 = gt[0] + gmax[0]
    errs = []
    if not (ht - 0.2 < gun_y < ht + 1.2): errs.append(f"gun height {gun_y:.2f} vs hull top {ht:.2f}")
    if abs(gmin[0]) > 0.4: errs.append(f"gun pivot not at the breech (barrel starts {gmin[0]:.2f} from pivot)")
    if gun_x1 < box(hull)[1][0]: errs.append("barrel does not reach past the hull front")
    if abs(tt[1] - ht) > 0.5: errs.append(f"turret pivot height {tt[1]:.2f} vs hull top {ht:.2f}")
    print(("OK  " if not errs else "BAD ") + path, f"turret pivot {[round(v,2) for v in tt]} gun pivot {[round(v,2) for v in gt]} barrel x {gun_x0:.2f}..{gun_x1:.2f} y {gun_y:.2f}", "; ".join(errs))
    return not errs
ok = all([check(p) for p in sys.argv[1:]]); sys.exit(0 if ok else 1)
