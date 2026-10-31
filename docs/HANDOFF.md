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
- Models converted so far (36): tanks, IFVs/APCs, artillery, Gepard, Buk, Patriot, S-400 (also used for S-300), THAAD, NASAMS; aircraft Su-25, Ka-52, TB2, A-10, Su-34, Mi-24.
- Still procedural: bmp3, zsl92, m270, phl03, tochka, iskander, tor, pantsir, hq17, hq16, hq9, s500, irist_sls, krasukha.

## Aviation over the field (stage 1 done 01.11.2026)
- Models: `su25`, `ka52`, `tb2` (Sketchfab, CC BY, credits in `credits3d.json`), each with `_lo`. Nodes: `g_<id>_hull` (origin at the centre of the airframe, nose +X) and `g_<id>_rotor`, `g_<id>_rotor2` that spin; the hull's glTF extras `rotors` give each rotor's axis (`"y,y"` for the Ka-52, `"x"` for the TB2 propeller).
- Batch 2 (01.11): `a10`, `su34`, `mi24`. The Mi-24 has a main rotor (`y`) and a tail rotor (`z`, sideways axis).
- Blender: `sf_make_air(root, id, front, rotors=[(pred, axis, hub)], accent=fn, targets=..., length=..., scrub=False)` in `kab_sf.py`. Axes: `y` main rotor, `x` propeller, `z` tail rotor. `scrub=True` paints red markings out of the baked texture. Joined meshes keep their vertex colours (the Su-34 import is coloured that way); `sf_loose(root, drop)` splits an import into loose parts and drops landing gear. The Ka-52 import had only blur discs for rotors: its blades are simple boxes added in Blender.
- Game bridge (`src/game.html`): `BF3D_ROLE` maps fighter/attack/bomber → `plane`, heli → `heli`, drone/loiter → `drone`; `BF3D_SLOTS` allows 4 / 3 / 4 squads a side (2 / 2 / 2 on the low graphics level). Models of their own: su25, a10, su34, ka52, mi24, tb2. `BF3D_AIR_MODEL` gives the rest the nearest one: fighters → Su-25, bombers → Su-34, other helicopters → Ka-52, drones and loitering munitions → TB2 (loitering munitions at quarter size).
- Field (`bf3d.js`, block «aviation»):
  - Planes come in from their own edge at 30–40 m, dive on a target, fire 8 rockets or drop 4 bombs, turn back and leave; a pass takes ~15 s, then a pause of 7–19 s.
  - Helicopters fly to a hover point behind their own front line at 12–18 m and fire ATGMs.
  - TB2-type drones circle over the enemy side at 44–54 m and drop a guided bomb now and then.
  - Loitering munitions fly in at ~30 m and dive into a target.
- Kills follow the war, not the other way round: real losses of an aircraft type arrive through `api.hit` as `pend`. The enemy air defence on the field then launches a homing missile at that aircraft, or a MANPADS from the front line does so if there is no air defence. The aircraft burns, falls and crashes; while its squad still has machines, a replacement flies in 18–32 s later. Air defence also fires the odd missile that misses (the aircraft drops flares).
- Strikes from the air carry the ground squads' pending losses like artillery does (`pend` → `inbound` → `damage`).
- Test hooks: `api.air()` lists aircraft states, `api.airFocus(i, dist)` points the camera at one.

## Strikes from the battlefield (stage 2 done 01.11.2026)
- Agreed with the user: strikes hit only the direction whose field is open, and they are ordered only from the field. «Авиаудар» and «Удар дронами» were removed from the HQ list.
- The bar at the bottom of the field has three buttons. Each direction keeps its own cooldowns in `f.cd`, which count down daily in `warDay`.

  | Button | Cost | Cooldown | Needs on the direction |
  |---|---|---|---|
  | Авиаудар | 100 bombs | 5 days | 2+ planes |
  | Вертолёты | 60 ATGMs | 3 days | 2+ helicopters |
  | Дроны | 30 loitering munitions | 3 days | 30+ of them |

- A blocked button says why: cooldown, no machines, or not enough ammunition.
- `FIELD_STRIKES`, `fsBlock`, `fieldStrike(w, i, type)` in `src/game.html`:
  - Enemy losses are taken from its forces in this direction's share and move only this front.
  - Our losses come off this direction's machines.
  - Air strike: damage and price depend on air superiority.
  - Helicopters: strong against armour; the risk grows with the enemy's short-range air defence.
  - Drones: spent, not lost; enemy electronic warfare jams a share of them.
- Field (`bf3d.js`):
  - `api.raid(type, {n, jam})` makes the strike visible: our planes make an extra bombing pass, helicopters move up to the front line for 3 ATGMs and return, and a swarm of 6–12 small drones flies in (jammed ones tumble down).
  - If there is no squad of that kind on the field, temporary aircraft fly the strike.
  - `api.hit(side, id, n, "air")` keeps the strike's kills for the aircraft (`pendAir`). If no aircraft brings them within 25 s, they go to the ground fire.
  - `api.consume(side, id, n)` shrinks squads by spent drones without showing shoot-downs.
- The close button and Android Back now leave the 3D field (the handler used to be bound only on the 2D path).

## Next
- Next model batches (≤3 at a time): fighters (MiG-29 / Su-35 / F-16), then Apache / Reaper / Shahed. The A-10 keeps small low-visibility US markings (grey on grey): they could not be separated from panel lines automatically.
- The web preview artifact still has the previous build: republish `www/index.html`, `field/bf3d.js` and `field/models/{su25,ka52,tb2}{,_lo}.glb.txt` (base64) to it.
- Before each big new feature, discuss the plan with the user first.
