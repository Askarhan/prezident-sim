# Handoff: where the 3D battlefield work stands

Read this first in a new session.

## Build and ship
- Game source is `src/game.html`; edit only that file. Build with `python3 scripts/build-www.py src/game.html`, which writes `www/index.html` (never edit `www/index.html` by hand: the build wraps the source in a page head).
- After changing `tools/units/credits3d.json`, run `python3 tools/units/gencredits.py` before building.
- Pushing to `main` builds the APK in GitHub Actions. The APK lands at https://github.com/Askarhan/prezident-sim/raw/apk/kabinet-prezidenta-debug.apk
- Web preview is the artifact https://claude.ai/artifact/ND3zG4d9MyEn23a7am5Hpm. It loads models as base64 `field/models/<id>.glb.txt`, because the host does not serve `.glb`.
- Commits use the author `Askarhan <drakula199821@gmail.com>`.

## 3D field (`www/field/bf3d.js`, three.js r170 loaded on demand)
- Models are `www/field/models/<id>.glb`, with nodes `g_<id>_hull`, `g_<id>_turret` and `g_<id>_gun` (front is +X, glTF Y up). Material `accent` takes the side colour.
- Light copies are `<id>_lo.glb`, listed in `HAS_LO` in bf3d.js. Far units and the low graphics level use them.
- Graphics levels are in `QL` (high, mid, low). Auto mode (`ctx.auto`) measures FPS and steps down below ~27. The game stores the level in `settings.gfxAuto`. The selector is under Settings → «Графика поля боя».
- The game bridge (bf.js part of index.html) builds `ctx` and calls `api.hit` / `api.sync` every 1.5 s, so the field follows real losses.

## Blender pipeline (user's PC, Blender MCP; scripts in `tools/units`, copied to `D:\Projects\kabinet_units\scripts`)
- `kab_sf.py` imports Sketchfab models (CC BY only, never NonCommercial):
  - `sf_info()` and `sf_parts()` inspect an import.
  - `sf_group(root, pred)` groups turret parts under `turret_grp`.
  - `sf_make(root, id, front, turret_key=..., gun=..., gun_cross=..., targets=...)` splits, bakes and exports `<id>.glb`, plus `sf_lod(id)` → `<id>_lo.glb`.
- Run it as: `G={}; exec(kab_glb.py, G); exec(kab_sf.py, G)`.
- Credits are in `tools/units/credits3d.json`. A script regenerates `CREDITS3D` in the game from it, and the list is shown on the sources screen.
- Models converted so far (30): tanks, IFVs/APCs, artillery, Gepard, Buk, Patriot, S-400 (also used for S-300), THAAD, NASAMS.
- Still procedural: bmp3, zsl92, m270, phl03, tochka, iskander, tor, pantsir, hq17, hq16, hq9, s500, irist_sls, krasukha.

## Next stage: aviation over the field (agreed with the user)
- Aircraft fly on their own by battle logic. Command buttons (bombing, helicopters, drones) come as the stage after.
- Limits: up to 4 planes, 3 helicopters and 4 drones per side.
  - Planes pass over the field for 10–20 s.
  - Helicopters hover behind their own lines and fire ATGMs.
  - Drones loiter or dive.
- Air defence on the field shoots at them. Kills come off the real air fleet.
- Work in batches of at most 3 models at a time. First batch: Su-25 (attack), Ka-52 (heli), Bayraktar TB2 (drone). Other aircraft use the nearest of these until their turn.
- Before each big new feature, discuss the plan with the user first.
