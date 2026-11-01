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
- Models converted so far (48): tanks, IFVs/APCs, artillery, Gepard, Buk, Patriot, S-400 (also used for S-300), THAAD, NASAMS; aircraft Su-25, Ka-52, TB2, A-10, Su-34, Mi-24, MiG-29, Su-35, F-16, Apache, Reaper, Shahed-136; Iskander, Tor, Pantsir; Tochka-U, M270, ZSL-92 (WZ-551).
- Stand-ins (`BF3D_LIKE`, user's choice: no CC BY model exists): bmp3 → bmp2, phl03 → tornado (Smerch); their procedural .glb were deleted.
- Still procedural: hq17, hq16, hq9, s500, irist_sls, krasukha.

## Aviation over the field (stage 1 done 01.11.2026)
- Models: `su25`, `ka52`, `tb2` (Sketchfab, CC BY, credits in `credits3d.json`), each with `_lo`. Nodes: `g_<id>_hull` (origin at the centre of the airframe, nose +X) and `g_<id>_rotor`, `g_<id>_rotor2` that spin; the hull's glTF extras `rotors` give each rotor's axis (`"y,y"` for the Ka-52, `"x"` for the TB2 propeller).
- Batch 2 (01.11): `a10`, `su34`, `mi24`. The Mi-24 has a main rotor (`y`) and a tail rotor (`z`, sideways axis).
- Blender: `sf_make_air(root, id, front, rotors=[(pred, axis, hub)], accent=fn, targets=..., length=..., scrub=False)` in `kab_sf.py`. Axes: `y` main rotor, `x` propeller, `z` tail rotor. `scrub=True` paints red markings out of the baked texture. Joined meshes keep their vertex colours (the Su-34 import is coloured that way); `sf_loose(root, drop)` splits an import into loose parts and drops landing gear. The Ka-52 import had only blur discs for rotors: its blades are simple boxes added in Blender.
- Game bridge (`src/game.html`): `BF3D_ROLE` maps fighter/attack/bomber → `plane`, heli → `heli`, drone/loiter → `drone`; `BF3D_SLOTS` allows 4 / 3 / 4 squads a side (2 / 2 / 2 on the low graphics level). Models of their own: su25, a10, su34, ka52, mi24, tb2, mig29, su35, f16, apache, reaper, shahed. `bf3dModel()` picks by machine id (not by country): first `BF3D_LIKE` (nearest silhouette, user's choice): su57, f15ex, j20 → su35; f35, j10 → f16; ah1z, z10 → apache; wingloong → reaper. Then `BF3D_AIR_MODEL` by kind: fighter → f16, attack → su25, bomber → su34, heli → ka52, drone → tb2, loiter → shahed. Loitering munitions: the Shahed model is life-size (scale 1), Lancet/Switchblade borrow it at 0.6 (`spawn` in bf3d.js); a TB2 stand-in would still be 0.26.
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

## Sound on the field (01.11.2026)
- Recordings from Freesound, cut by `tools/sfx/build_sfx.py <sources>` into `www/field/sfx/*.ogg` (304 KB):

  | Sound | File(s) |
  |---|---|
  | Tank guns | `tank1`–`tank5` |
  | Autocannon | `autocannon` |
  | Artillery | `arty` |
  | Explosions | `boom` |
  | Helicopter loop | `heli_loop` |
  | Engine loop | `engine_loop` |

  Rocket and SAM launches are synthesised.
- Sources (Freesound ids): 854186, 189344, 239135 (qubodup); 448002 (kneeling); 423118 (ogsoundfx); 49483 (lorenzosu); 186934 (readeonly). Their licences are not checked yet (the user is checking them): anything CC BY-NC must be replaced before release, CC BY goes to the credits.
- `makeSound(on, sharedAudioContext)` in `bf3d.js`. Every sound is placed relative to the camera: gain, low-pass and delay by distance, stereo pan. It uses the game's `AC` and `settings.sound`, and goes silent when the app is hidden.
- The user found jet and drone sounds too busy, so they were removed; only helicopters keep a loop.
- Test hooks: `api.soundInfo()`, `api.soundRecord(sec)` (webm of the mix), `api.bench(n)` (ms per frame: step / sound / render / HUD).

## Performance (01.11.2026)
- The user reported slow motion on a phone, even on low graphics. Cause: the frame time was capped at 0.05 s, so below 20 FPS the battle itself slowed down. It now keeps real time, using up to two sub-steps per frame (dt up to 0.1 s).
- The low level is lighter: relief has 110×110 segments instead of 160, and there are 55% of the trees (~117k triangles instead of ~185k).
- The user's phone is a Black Shark 4 (Snapdragon 870), so the slowness is not raw power.
- The field shows a readout in the top-right corner: FPS, graphics level, and ms per frame for the frame, the battle, sound, render (CPU side) and labels.
- Tapping the readout switches off, in turn: sound, labels, aircraft, smoke and fire, then all of these together. This finds on the phone what slows it down.
- The labels' 2D canvas now draws at 1× pixel density (1.5× on high). A full-screen 2× canvas cleared every frame is costly on phones.
- The user saw ~26–27 FPS on every graphics level, and switching parts off changed nothing. So the frame is limited by something outside the field.
- While the field is open (`body.bf-open`), the game screen under it is now taken out of rendering (`#app`, advisor and float layers get `display:none`). The game day ticks on, but nothing redraws the hidden map: no `updateWarMap`, `battleLoop`, `render`, `updateLive` or clock. On close it renders once.
- The readout shows "кадр N мс, из них поле M": the frame time against our own code's time. If M is small and N is ~33 ms, the phone caps the frame rate (battery saver or the phone's game mode).

## War length, balance, battle for a position (01.11.2026)
- See the last section of `docs/war-design.md` for the rules and the test table.
- `tools/sim/warsim.js [days] [runs]` plays the test wars in headless Chromium through the real game code. The run takes seconds; rerun it after any war change.
- `tools/sim/balance.py` prints the stat/price proposal per model. The numbers it produced are already applied to `MODEL_ROWS`.
- Field: the speed is ×1 while the field is open (restored on close). `bfPos`/`bfPosDone` in `src/game.html`, `api.posTaken(dir)` in `bf3d.js`.
- Aircraft speeds in `bf3d.js` `SPEC`: jets 75 m/s, helicopters 18, drones 26, loitering munitions 50 (dive 75). The user found the old speeds "like a biplane".

## Fuel, war logistics, captured reserves (stage done 01.11.2026)
- `src/game.html`, block «war logistics» before `warShare`:
  - `FUEL_BBL` (barrels a day per deployed machine), `FUEL_MODE` (defend 0.5, hold 0.75, attack 1, all 1.5), `FRONT_COST` (0.08% of a machine's price a day, times the mode).
  - `fuelOf(units, mode)` → `{oil` (million bbl/day), `cost` (bn $/day)`}`; `fuelNeed(w)` sums `w.dep`; `fuelOutlook()` gives all wars' need against own production and days of stock.
  - `fuelDay(w)` runs at the start of `warDay`: pays the front's money, burns `S.stock.oil`, buys the shortfall on the market (not under sanctions, only as much as the treasury allows). `w.fuel` (0–1) is the fuelled share. The old upkeep-based fuel and its `warPush(-0.3)` are gone.
  - `warFight(w)` = `warUnits(w)` with deployed machines × `w.fuel`; `warDay` and `takeLossesW` use it, so unfuelled machines neither fight nor die. `fsBlock` says «нет топлива» when the fuelled planes/helicopters/drones fall below the minimum.
  - `enemyFuelDay(w)`: enemy oil = `4*prof.oil/30` + 1% of GDP a year spent on imports (×0.3 under our blockade, ×0.6 under our sanctions). The share it cannot fuel moves daily between `w.eu` and the reserve `w.er` (smoothed). `warMonth` restocking and `enemyLoss` count `w.er` as present.
  - `posBreak(w, i, dir)` from `frontsDay` only when a line («рубеж», `LINES`) falls (the user's choice): the loser loses 2% of the direction's **ground** machines (GROUND_K), half destroyed, half captured (ours go to `w.dep[i]`, `w.trophies`; theirs to `w.eu`). `f.posEv.line` marks it.
  - `trophyReserve(w, k)` in `settleVictory`: 70% of `w.er` on annexation, 35% otherwise (on top of the old 30% / 15% of `w.eu`).
  - UI: deployment window line `depFuelLine` (this direction's barrels and money a day, all fronts, days of stock); HQ «Топливо» shows the fuelled %, the front's money spent and the enemy's unfuelled reserve.
- Field (`bf3d.js`): `api.fuel(side, k)` marks the share of ground squads without fuel (`u.nofuel`: `think` skips them, orange «нет топлива» label). The bridge calls it every 1.5 s. `api.posTaken(dir)` on any position fall: the losers' front squads blow up one by one over ~2.5 s (`u.boomT`), 3–4 random ones (at most half) survive and pull back. The bridge skips its loss sync while a position event is pending and resets `st.lost0` after the banner, so nothing explodes twice.
- Machines without fuel (01.11.2026, user agreed): they do not fight but are not safe. `IDLE_LOSS = 0.5`: our idle share (`w.dep × (1 − w.fuel)`, in `takeLossesW`, acc `w.accMyI`) and the enemy's `w.er` (in `warDay`, acc `w.accThI`) take half the normal losses. `IDLE_CAPTURE = 0.10`: when a line falls, the loser also abandons 10% of its idle ground machines in that direction to the winner (ours from `w.dep[i] × (1 − fuel)` go to `w.eu`; the enemy's from `w.er × share` become our trophies), the event says «брошены без топлива». Field: the enemy's idle ground machines (`w.er`) are now on the field (`eAll` in the bridge, grounded aircraft stay off) and marked by `api.fuel(1, k)`; in `bf3d.js` units prefer targets that fire back (`nofuel` +150 to distance; artillery skips nofuel when it can).
- **Balance:** on every position (first try) long wars got ~2× shorter; limited to lines, lines only, the war lengths are back near the design table: KZ—KG 10.4 mo, KR—JP ~2.6 yr, CN—IN not finished in 1000 days (as before the stage).
- Pitfalls: the sim/test server must send `.js` as `text/javascript` (module import); `www/lib/three` is not in git (CI copies it): in a session without npm, take it from the APK on the `apk` branch (`assets/public/lib/three`). Headless Chromium has WebGL with `--use-angle=swiftshader --enable-unsafe-swiftshader`.
- The user's working rules for the assistant (save tokens: short tool output, few images, batches of ≤3 models, short reports, update this file and suggest a new chat at the end of a stage) were given in chat. Ask the user to paste them again in a new chat.

## Delivery to the front (stage done 01.11.2026)
- `src/game.html`, block «delivery to the front» after `depAll`. New wars (`startWar` creates `road:[]`, `men:0`) use it; old saves without `w.road` keep instant deployment until the player sends something.
  - Trip `warTrip(w)` (= `roadDays(enemy)`, kept in `w.trip`): near war (`!farWar`) `5 + dist*0.15`, max 30 days; far war `20 + dist*0.32`, 30–180 days (dist between `LABELS` centres; without LABELS 14 / 90). KZ—KG 9, CN—IN 15, US—RU 180.
  - Transport aviation (`planesFree()` = `airliftCap()` minus planes busy on trade and on `w.road`): a plane takes 10 light machines (`AIRLIFT_KINDS`: ifv, apc, mlrs, shorad, mrsam, ew, loiter) or 1 thousand men, trip `/3.5` (min 2). Aircraft, helicopters, drones (`SELF_FLY`) fly in `2 + trip/60`, 2–5 days. Tanks, SPGs, SRBM, LRSAM go by land only.
  - `w.road = [{i, id, n, left, tot, air, planes, back}]`; `MEN = "_men"` = troops (thousands, per war, not per direction). `depCommitted` counts the road, so the reserve excludes it. `roadSend`, `roadSplit`, `roadTo(w, i, id)`, `roadRecall`, `turnBack` (way back = days already travelled), `depSet` (slider = at the front + on the way; lowering it turns the latest on the road back first, then the front sends machines home with the full trip), `menSet`, `menReserve`, `menFix` (called in `depFix`).
  - Oil: `roadOil(w)` (machine ½ of `FUEL_BBL`, self-flying aircraft full, plane 600 bbl/day, 1 thousand men 5 bbl/day) is added to `fuelNeed`; `roadDay(w)` moves the road by `w.fuel` (no oil → the column stands). Arrival → `w.dep[i]` (a taken direction → spread over the others) or `w.men`, event «Прибыло подкрепление», `w.arrD[i] = {day, n}`.
  - Troops: `myTroops = w.men` (was `freeArmy()*warShare`); losses reduce `w.men`. `startWar` sends the free reserve; with other wars on, it takes up to an even share from their `w.men`.
  - Plan presets (`depPreset`) and a taken direction move machines in a quarter of the trip (`shiftDays`, min 3).
  - Enemy: `initWar` (new wars) puts all its `depOk` machines and its troops (`w.emen`, share 0–1) on `w.eroad`; its transport planes lift light kinds and troops. `thTroops = e.army*w.emen`. `warMonth` restock goes on the road; `enemyLoss` and the restock gap count `w.eroad`; `enemyFuelDay` adds `eroadOil`. The unfuelled reserve `w.er` is unchanged (it stands at the front, it does not travel).
  - The «mob» phase lasts `max(10, w.trip)` days.
  - UI: deploy window: road line (days by land / by air / flying, free planes, en route here, arrival date via `dateIn`), buttons «Вернуть технику/войска с дороги» (`data-deprecall`), «Личный состав» slider (`data-depmen`), rows show «в пути». Fronts panel: «в пути N, через X дн.». Reserve panel: reserve troops, «В пути на фронт» with the nearest date, trip length.
  - Field: the bridge shows a small banner «Подкрепление прибыло» (`bfArrive`) when `w.arrD[st.i]` changes; the squads come in through the usual `api.sync`.
- **Balance** (headless sim, 1000 days, several runs, old vs new): KZ—KG 218–244 vs 227–237 days; KR—JP varies widely in both (59–76% after 1000 days, or a loss); CN—IN ~85% unfinished in both; US—RU 219 vs 378 days.
- Pitfalls: the game script is one IIFE, nothing is global. For headless tests copy `www/index.html` to a temp file, inject `window.__T={newGame,startWar,dayTick,...}` before the last `})();`, serve `www` with `python3 -m http.server`; never commit the copy. Game modals can replace the deploy window during a test: reopen it with `showDeploy` before clicking. The 3D banner was not checked in a browser (no `www/lib/three` in this session).

## Aircraft models, batches 3–4 (stage done 01.11.2026)
- MiG-29 (Carlos.Maciel), Su-35 and F-16 (andertan), Apache (MirzaArrafiERV_45), MQ-9 (IProZenoN), Shahed-136 (faintastic); all CC BY, in `credits3d.json`, each with `_lo`. Apache rotors `y,z` (main + tail), Reaper and Shahed pusher propellers `x`.
- Checked headless (three from the `apk` branch): all six .glb load on the field, no page errors. The arrival banner (lives 2.6 s) and the canvas «нет топлива» labels are still not seen by eye: ask the user about the APK.
- The Reaper keeps small US markings (white star roundels): no red to scrub.
- Blender pitfalls (fresh Blender 5.2):
  - The glTF importer and Cycles may be off: `addon_utils.enable("io_scene_gltf2")` / `("cycles")` before import / bake (bake fails with «CYCLES not found»).
  - `kab_models.py` needs the text block `kab_lib`: `bpy.data.texts.new("kab_lib").from_string(open(...kab_lib.py).read())` before `exec(kab_glb.py)`.
  - Keep the namespace across calls: `import builtins; builtins.KG = G`.
  - Imports can come rotated (the MQ-9 lay on its side, then upside down): the Sketchfab root is in QUATERNION mode, so rotate `rotation_quaternion`, not `rotation_euler`, and check with `sf_parts` (gear and fins show which way is up).
  - A gear filter in `sf_loose` can drop a whole wing when the wing is welded to the gear legs (Su-35): test the part's width too, e.g. `mn z < -0.9 and width < 3`.
  - Hubs for `rotors=[(pred, axis, hub)]` are given in import coordinates; `sf_make_air` turns them with the model.
- Getting the .glb into the repo: the user grants `D:\Projects\kabinet_units\glb` (device folder access), then `device_stage_files` → `/mnt/user-data/uploads/glb/`.

## Ground models, batch 1 (01.11.2026)
- Iskander (42manako, Chinese camo; the raised missile was laid flat onto the launcher in Blender), Tor-M2 (Chenzoss), Pantsir-S1 (maddex88, its near-black texture recoloured olive). All CC BY, in `credits3d.json`, each with `_lo`.
- Nodes match the old procedural models: iskander `hull+gun` (gun = missile, pivot at its rear, `srbm` code raises it), tor `hull+turret`, pantsir `hull+turret` (no gun node; bf3d.js treats gun as optional). `check_glb.py` fails on models without a turret (KeyError), that is the script, not the model.
- Headless check: all six files load with GLTFLoader; on the RU—KZ field the Tor shows up; the arrival banner and «нет топлива» labels now seen working (screenshot).
- `iskander_lo` stays heavy (8.1k tris, 630 KB): the import is ~1300 loose parts and `sf_lod` decimation barely reduces them. Fix later by joining/remeshing before the LOD if it matters.
- Blender helpers used (not yet in kab_sf.py, written inline in the session): pre-decimate every loose part before `sf_make` for 500k+ imports (Pantsir), cut the turret off a single welded mesh with `bisect_plane` (Tor), remove wire edges after decimation (stray lines in the bake).

## Ground models, batch 2 (01.11.2026)
- Tochka-U (42manako, `hull+gun`, the missile and its cradle are the gun; the missile sits under the roof and rises through it), M270 (KojfDiscord, «War Thunder April AF» but a normal M270; pod = turret), ZSL-92 shown by the WZ-551 120mm (MirzaArrafiERV_45, same 6×6 hull, `hull+turret+gun`). All CC BY, each with `_lo`.
- The big «Free M270» (DaHoon, 531k faces) was tried and dropped: decimation wrecked it. Prefer imports under ~50k faces.
- Blender pitfall: `sf_group` on a deep glTF hierarchy (root → GLTF_SceneRootNode with scale) scaled the grouped parts ~4×. Safer: `sf_world_copy` the turret parts and the rest into two world-space meshes, put them under a new empty with a `turret_grp` child, then `sf_make` (helper `regroup` in the session; worth adding to kab_sf.py).
- Strays far from the vehicle (cameras, loose bits) shift the centre: drop parts outside the hull's width before `sf_make`.
- Headless 404s on `flags/*.svg` and the Google font are the sandbox, not the game.

## Next
- Possible next model batches (≤3 at a time, ask the user first): Su-57 / F-35 / J-20 (now stand-ins), Lancet, Wing Loong, Z-10; or the procedural ground list above. The A-10 keeps small low-visibility US markings (grey on grey): they could not be separated from panel lines automatically.
- The web preview artifact is several builds behind (the user chose to skip it for now): republish `www/index.html`, `field/bf3d.js` and every new `field/models/*.glb.txt` (base64) when asked.
- Before each big new feature, discuss the plan with the user first.
- Delivery ideas not built: losses on the road (strikes on columns), a railway (`S.rails`) speeding up the trip.
