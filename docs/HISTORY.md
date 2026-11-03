# History: finished stages of the 3D battlefield work

Moved out of HANDOFF.md on 02.11.2026 to keep it short. Look things up here by grep when a detail is needed.

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

## Ground models, batch 3 (01.11.2026)
- HQ-9 (42manako, hull only, launcher canisters lie flat), «Красуха-4» shown by the P-18 radar on a Ural (xFORTUNAx, user's choice: no CC BY Krasukha exists; the antenna array is the turret, pivot set on the mast axis by hand), HQ-17 (42manako, Tor-like, `hull+turret`, no gun). All CC BY, in `credits3d.json`, each with `_lo`.
- No CC BY model exists for the S-500 or the Krasukha-4 on Sketchfab (searched 01.11). S-500 → `BF3D_LIKE` s400.
- HQ-17 import was 271k faces: deleted the 8 internal vertical missiles (`Object_26..33`), pre-decimated every part to 1/4, renamed the turret parts to `turretx_*` and ran `sf_make(..., turret_key="turretx", gun=False)`. `hq17_lo` stays heavy (5.8k tris, 580 KB), like `iskander_lo`.
- Pitfall: `sf_build(drop=...)` matches the mesh object's own name, not its parent's: Sketchfab glTF meshes are `Object_N` under named empties (`guy_wires_3`), so delete such parts by hand before `sf_build`.
- Pitfall: the device folder request from the assistant was refused by the auto-mode classifier; the user added `D:\Projects\kabinet_units\glb` via «+» → «Add folder».
- Check: the six files load in headless GLTFLoader (three from the `apk` branch); not looked at on the field.

## Batch 4 (01.11.2026)
- Su-57 (andertan, nose −X, no gear in the import) and F-35A (andertan, nose −Y; gear and hanging doors dropped with `sf_loose`, predicate on part size: `mn.z<1.25 and len<2 and width<1`, or thin `width<0.3` parts below the fuselage). Both in `BF3D_MODELS`, removed from `BF3D_LIKE`. Accent = top 30% of the rear 30% (fins).
- The first Su-57 export had lost half a wing and a tail plane (95k → 6k decimation collapsed one side; the user noticed). Fixed: `sf_decimate(ob, target, sym=None)` can decimate symmetrically, and `sf_make_air` now decimates the airframe with `sym="Y"`. The PC copy in `D:\\Projects\\kabinet_units\\scripts` is patched too (old one kept as `kab_sf.py.bak`). Checked L/R area of the other batch models: F-35, HQ-9, HQ-17 even; IRIS-T uneven, but the import itself is (side equipment).
- IRIS-T SLS is shown by the IRIS-T SLM **radar** truck (TRML-4D, KojfDiscord War Thunder, 293k): hull only, every part pre-decimated to 1/5. `irist_sls_lo` is heavy (5.6k tris, 550 KB).
- `sf_box` returns lists, not Vectors: `drop(mn, mx, c)` predicates index `mn[2]`, not `mn.z` (the `accent` callback does get Vectors).
- Checked: the six files load in headless GLTFLoader.

## Batch 5: J-20, Z-10, Wing Loong (01.11.2026)
- J-20 (Void.com, 15k faces), Z-10 (42manako, 9k), Wing Loong I (KojfDiscord, War Thunder, 93k). All CC BY, in `credits3d.json`, each with `_lo`; removed from `BF3D_LIKE`, added to `BF3D_MODELS` and `HAS_LO`. Lengths: J-20 20.4 m, Z-10 hull 14.1 m, Wing Loong kept at import scale (span 14 m).
- The J-20 import sits in a banked, yawed display pose. Fixed by PCA on the main body (`J20_39`): longest axis = length, shortest = up; nose sign from the cockpit, up sign from the fins; then `root.matrix_world = R @ T(-c) @ root.matrix_world`. Dropped gear (`wheels`), open bay doors (`DB`) and missile racks (`MRack*`). Red star markings kept.
- Z-10: three meshes (body, tail rotor `Object_6`, main rotor `Object_8`), nose −Y. Main rotor hub = mean of its vertices; rotors `y,z`.
- Wing Loong: meshes merged by material, so `sf_loose` first (938 parts); pusher prop = parts with `mn.y > 3.99` (3 blades + spinner), axis `x`, nose −Y. The object under the nose is the sensor ball, kept.
- Pitfall: `sf_make_air` parks every result at `x = len(id)*20`, so two 3-letter ids land on top of each other; and moving the parts by name also moves the rotor children (their local x gets overwritten). Move only the hull (no parent) when arranging a picture.
- Check: Node + GLTFLoader with a DOM stub (`document.createElementNS` image whose `src` setter fires `load`), three taken from the APK on the `apk` branch (`assets/public/lib/three/*` → `www/lib/three`, gitignored). npm registry and raw.githubusercontent are blocked in the sandbox; headless Chrome printed nothing here. All six files parse: rotors `y,z` / `x` found.

## Batch 6: J-10, F-15EX, AH-1Z (01.11.2026)
- J-10 shown by the J-10S two-seater (MirzaArrafiERV_45, 74k), F-15EX by the F-15E (Spark_Customs, 205k; same airframe), AH-1Z (DevPoly3D, 125k). All CC BY, each with `_lo`; `BF3D_LIKE` now holds only bmp3, phl03, s500.
- J-10: nose +Y; `sf_loose`, then every part with `mx.z < -0.85` dropped (gear, ventral tank, pylons).
- F-15E import is banked like the J-20: PCA alignment on all vertices; nose = the narrow end (lateral spread), up = the side the fins stick out in the tail third.
- **Big pitfall (decimation stalls):** welding (`sf_loose`, and `sf_world_copy` inside `sf_make_air`) leaves edges with 3+ faces in dense imports; the Decimate modifier then barely reduces anything (78k → 36k instead of 6k) and forcing it (split those edges) wrecked the F-15. What works: copy each import mesh to world space **without welding** (`me = o.data.copy(); me.transform(o.matrix_world)`, new object under a fresh empty), pre-decimate each with `sf_decimate(ob, n//16, sym=<lateral axis>)` (unwelded meshes decimate fine), then `sf_make_air` on that empty. Used for F-15 (→12.7k → 6k) and AH-1Z (→15.9k, lateral axis X). Worth turning into a `sf_predecimate(root, div, sym)` helper in kab_sf.py.
- AH-1Z: nose −Y, main rotor `Cube.007`, hub (0, 0.4, 3.7); tail rotor `pCube98.001` (left of the fin), hub (0.6, 9.25, 2.9); import scale kept (17.8 m with rotors).
- `f15ex_lo` is heavy (3.7k tris, 476 KB). Check: all six parse in the Node GLTFLoader check.

## Batch 7: Lancet, Tu-22M3, B-1B (01.11.2026)
- «Ланцет-3» (flightclubua, 38k, real 1.65 m like the game's real-scale Shahed), Tu-22M3 shown by «TU26» (manilov.ap, 38k; Tu-26 = Tu-22M), B-1B («B1», manilov.ap, 10k, wings spread). All CC BY, each with `_lo`. They were not in `BF3D_LIKE`: before, lancet flew as the Shahed (`BF3D_AIR_MODEL.loiter`) and both bombers as the Su-34.
- Lancet: the pusher prop is welded to the body by `sf_loose`; cut it off in edit mode (faces with world `y < -0.695` → `separate SELECTED`), then rotor `x`, nose +Y. `sf_make_air` deletes the import root, so inspect/split before calling it (each retry = a new import).
- Tu-22M3: the import is yawed 151° in the ground plane with gear down; gear groups have names (`stoika_lef/rig/nos`, `stvorka*`, `Line45`) and were deleted. Aligned by rotating about Z along the fin-top → cockpit line, copied unwelded to world space, pre-decimated /3 with `sym="Y"`.
- Device calls can time out after 60 s while Blender keeps working (a Sketchfab import did): check the scene for `Sketchfab_model` instead of importing again.
- Heavy bombers are shown smaller than life (user: the B-1B looked too big): `AIR_SCALE` in bf3d.js, b1b 0.55 (→ 24 m), tu22 0.6 (→ 25 m).
- Still on fallbacks (no CC BY model found or not tried): Switchblade 600 (→ Shahed; nothing on Sketchfab), HQ-16 (procedural), Compass Call (ew), transports Il-76/C-130/Y-20 (not drawn on the field?), stand-ins bmp3/phl03/s500.

## Economy notes up to 03.11.2026 (before the flat economy stage; prices and plans here are superseded, measurements stay valid for build ee778fe)
- **Latest, 03.11.2026, overrides the rework item below if the user confirms:** user now leans to keeping money prices in percent of GDP (big country = big obligations), so the full rework may be dropped, and the «fixed sums» rule with it: both still need his yes. `tools/sim/budget.js [years] [countries]` (economy bot holding needs at norm, no wars, `NEEDS=0` without programs) shows the treasury is nearly free: programs cost under 0.5% of GDP a year, surplus 7–9%, treasury 50–70% of GDP after 15 years, in every country. US programs stop around year 10 for lack of steel (the bot does not buy it). Open: raise object upkeep so needs eat about 4% of GDP (assistant's proposal, not approved); measure how much growth comes from trade deals (0.0003 a month each), suspected main source.
- Machine plant (`factory`) removed from the game (user's decision, 03.11.2026): it gave income and growth, not tanks. Tanks come from military plants, sold through the export switch. `migrate` deletes it from old saves and the queue; the investor event now gives a chem plant.
- Measured with `budget.js` (`NOTRADE=1`), 15 years: US ×5.5 with 30 trade deals, ×1.5 without; Kyrgyzstan ×9.3 and ×2.4. Each deal is +0.36% growth a year with no cap. Surplus comes from `trade` (5–8% of GDP, exporting resource surplus) and `objects` (`objIncome` follows current GDP with no cap: 5.6% of GDP with deals, 42.8% for the US without them, a money machine). Proposed, not approved: cap deals at +2% a year in total, cap object income at 5% of GDP.
- Trade deals no longer give growth or money (user's decision, 03.11.2026): only the +10% in `premium_` and relations. Gone with them: `minorTradeIncome`, `orgDealBonus`, the `deal` fields, their texts. `objEarned(id)` fixes a building's income when it appears (`S.objInc`, lazy, old saves take the current price once); `objIncome` is now only the price of the next one. Test, 15 years: US ×1.5, France ×1.5, Kyrgyzstan ×2.5; RU–KZ 139 days, US–IR 344 (same); conquest bot France 16, Russia 14 countries (not slowed); Kyrgyzstan peace bot 30 years ×4.7, ladder never opens, 0 joined (was year 21). Still open: objects give 31–36% of GDP at year 15 for US and France, because `roi` is paid monthly and on the full price, so the money part pays back in about 15 months. Proposed, not approved: payback of about 10 years.
- Income buildings get a real job, one at a time, with the user (03.11.2026). His rule: no penalty without the building, only a bonus when it is built. First `BONUS_MAX` 5 count (`bonusN`). Production bonus is time, not output (user's choice): −4% each, −20% at 5, `fasterK(id)` = 1/(1 − 0.04n), the same money. Chem done: +2 food points each, ammo time (`ammoPlantOut(true)` is the paid part). Auto done: road trips from home and back −3% each (inside `railTrip`), tank plant time. Next: electronics plant, then port, airport, highway, bridge, metro.
- Highway gives no GDP growth (user's choice, 03.11.2026): income and supply +2 stay. GDP growth from roads comes only from the state programs `road` and `rail`, capped by coverage.
- **Now, first: full rework of building data from scratch (user's decision, 03.11.2026).** He rejected the money price tables (the 94 bln vs 50 mln factory is absurd, and the tables that followed did not suit him) and wants every building's numbers worked out again, with him, before code changes: role of each type, money price, materials, build time, output, power, upkeep, start set by country size. Go type group by type group, short and in plain words, one example at a time, he does not read wide tables well. What he asked for along the way and did not take back: same price logic for all countries, money and materials for 2–3 / 3–4 first buildings at the start, no build limits, no idle waiting for a small country. Start money as a floor or equal for all is still undecided. User's rule (03.11.2026): no effect adds GDP in percent («ВВП +0,3% в год» goes away), effects give fixed sums; percent is only a way to measure and show. Buildings for sure; ask him whether objects, laws, tech and the base growth trend fall under the same rule. Current numbers in the game stay until the new set is agreed, so the game keeps working.
- **Then: resource stage continues. Next step: every country starts with buildings of all 30 types by its size, output comes from them (oil, rare earths, uranium by the wood/steel rule), then the stock limit, money and coins. Show the user the start table before building it. See «People, needs, unrest, flat prices».**

## People, needs, unrest, flat prices (03.11.2026)
User's complaint: wood and steel were balanced only against sawmills and steelworks; buildings, objects and population were never worked out. User's decisions: norm grows with wealth, population gives a small GDP plus (not the main source) and draft reserve, protests by stages, six needs, same tonnes everywhere, no build limits, materials for 2–3 buildings at the start.
- Needs, block before `facCov`: `NEEDS` groups FAC cats (housing, health, edu, order = justice + police, leisure = sport, roads = infra). `needNorm(pc)` 0.55 + 0.45×min(2, pc/30), `wealthK()` = now / start (`S.norm0`, lazy), `facNorm(id)` = `facBase` × that; `facR`, `facCatCov`, `facCard` use it. `needCov(key)` is the group's coverage. The tab's chips show it; defense objects stay in Army → bases.
- Population: `popRate()`, pop fx doubled. `popGdp()`: `POP_GDP_K` 0.25 × difference from `POP_BASE`, plus only with education and jobs. `popJobs()` adds unemployment when GDP per person falls under the start (`S.jobs0`). `draftCap()`: max(1.2 × start army, pop × `DRAFT_K` 20, ×1.5 with conscription); only `recruit` is capped, mobilization is not. Idle 10 years: needs 100 → ~85, housing 76–81, object approval about −10.
- No epidemic event exists in the game; nothing added for it.
- Unrest, block before `facMonth`: `S.unrest` moves 12% a month to `unrestTarget()` (weighted shortfall under 0.9, `UNREST_W`, ×46, low approval, `S.unrestMad`). `UNREST_AT` 25/45/65/85 = ропот, митинги, забастовки, беспорядки; `unrestAppr/Stab/Growth`. `unrestMonth` runs after the random event, asks from stage 2 (event id `unrest`, pushed to the end of `EVENTS` so indexes stay; cooldown 6 months, repeats from stage 3). Options: money (0.2% of GDP, worst need +3%, −20), talk (−12), force (−30, `S.unrestMad` 14). Pitfall: event text is read from `S.pendingEvent.text`, not `ev.text`.
- Flat tonnes: wood and steel for buildings = base × `MAT_T` 4.13 (factory 498 steel, 220 wood; all same in every country), `resTierK` still applies to oilrig, raremine, uranmine. Rare and uranium stay scaled by `U` until the resource step. `MILL_PRICE` 500 each, no growth with count. `RAIL_MAT` 430/650. Object programs: n × price × `FAC_T` 0.34 tonnes (`facProgMat`). Money parts unchanged.
- Start: stock of wood and steel at least `START_MAT` 1500. Kyrgyzstan's real limit is wood, 132 free a month.
- Build limits removed: `maxSlots` and `maxProgs` are gone. Physical limits stay (rivers, coast, tech, metro by population, `max`).
- Test: `node tools/sim/needs.js [years] [countries]`. With `ECON=1` peacebot, 15 years, one run: France 10 joined, Kyrgyzstan 0 (GDP 14 → 58 in 10 years); `SMART=1 ECON=1` conquest France 10 years ran; no page errors. Bots do not build objects, so unrest under real play and mill spam are not measured. Save check: the new fields removed from a running game, 24 months without errors; a real old save file was not loaded.
- Web preview still needs republishing (see Build and ship).

## Delivery done (02.11.2026)
The base delivery is in `docs/HISTORY.md` (`w.road`, `w.eroad`, `roadDays`, `roadDay`, `roadSend`, `roadRecall`). Added, block before `dateIn`:
- Railway: `hasRail(w)`, `railTrip` (`RAIL_K` 0.6). Applied in `roadSend` only to trips from home and back (`days == null || back`), not to moves between directions; `warTrip` itself stays the road time. Ground machines and troops only, aircraft and airlift unchanged, the enemy gets nothing from it. `roadLine` shows «по ж/д N дней», the rail button's title says so too.
- Enemy strikes our columns: `colHitDay` from the daily war step, `colOk` + last `COL_TAIL` 40% of a trip. Chance `colChance` = `COL_DAY` 0.15 × (1 − `w.air`) × its strike aviation/(that + our AD + 20). `w.colLost`, `w.colHits` count it. 2–8% of one column weighted by size (`colPick`, `colLoss`), real losses, a `warEvent`.
- We strike its columns: `STRIKES.convoy`, 100 bombs, cooldown 7 days, shown only while `eCols(w)` has anything, same `colLoss`. Needs 2 fighters/attack/bombers at the war; losses by `w.air` and its AD. Any point of the road, because enemy columns have no `tot`.
- Machines only, on both sides: troop columns are not hit (the enemy's are a share of its army, no clean way to take a loss from them).
- `tools/sim/warsim.js` now takes `WARS='[["ru","kz","x"]]'` and `RAIL=1` and prints the trip, hits and road losses. 7 runs, median win before/after: RU–KZ 137/137 days, US–IR 343/341. Road losses 0–2 hits near, 0–5 far (17–79 machines). With rail RU–KZ 132 days. RAIL on US–IR (343 → 251) is not a real case, far countries have no railway. Button checked headless, no page errors. The bot does not press it, so its effect on a war is not measured.
- Web preview still needs republishing (see Build and ship).

## Resource balance: wood and steel from buildings (02.11.2026)
User's complaint: oil, money, coins, steel and wood are not balanced. His decision: no resource comes from nowhere, no building no output, and no payback system. Slot limit (at most ×3 of the start, assistant's proposal), oil, rare earths, uranium, coins, money and factories are the next steps, ask him first. Catch-up ideas (grants, foreign investor, cheaper tech) are parked; the user's «no new ideas» decision applies unless he says otherwise.
- `baseOut0` gives nothing for wood and steel. Sawmill and steelworks (`flat:1`) give 165 a month (5.5 a day) in every country, not scaled by `U`; steel still halves when ore is below 60% (`outMult`). Their `scale`, `dscale`, `decay` are gone, `resTierK` no longer touches them.
- `startMills(x, g)`: 300 × (GDP/27000)^0.6 × profile (wood `woodProf`/1.3, steel `prof.metal`/0.9), at least 1. US 300/300, China 181/392, Russia 100/115, France 62/45, Kazakhstan 7/37, Kyrgyzstan 1/4. Stored in `S.mills0`, added to `S.buildings` in `migrate`, so old saves get them too and keep their stock. A new game (`!s.turn`) starts with 3 months of output in stock.
- `builtN(id)` = owned minus start: starting ones need no power and no upkeep (`powerUse`, `selfSuff`, `budget`). Pitfall: forgetting `powerUse` cut growth by 2 points and ended idle games, because 300 steelworks ate the grid. Any new count over `S.buildings` must use `builtN` if it costs something.
- Price of the next one: `MILL_PRICE` 230 wood and 230 steel × owned + queued (`mat` getter), money part as before.
- Tanks and ammunition: steel = table value × `STEEL_FLAT` 90 for everybody (540 a tank). Other buildings stay scaled by `U`.
- Occupation: `occupy` adds the land's mills by `startMills(e, e.gdp)` × share to `S.buildings` and `S.mills0` (`o.mills`); `occMillsOff` takes them away on `occFree` and uprising. Not a share of war damage.
- `resTierK` (≥1500 ×1.4, ≥300 ×1, below ×0.6) stays for oilrig, raremine, uranmine; oilrig `out` 4.56.
- The country's own use, block after `prodOf`: `civShare()` 0.2 (GDP 100 and below) to 0.85 (27000) on a log scale, France 0.59, Russia 0.55, Kazakhstan 0.31. `S.civ0` is fixed once from the output at the start, `civOf(r)` = that × √`demandK()`. `prodOf` is what is left, the market panel shows it. New buildings go entirely to the free part. `civMonth`: a shortfall comes out of the stock; an empty stock gives approval −1.5 and stability −1 for 2 months, stacking, and a warning every 6 months.
- Export limit: `EXPORT_K` 3% of GDP a year, spread by the month (`expLeft`, `expRoom`, `expUse`), shared by manual sales, auto-sale and contracts, wood and steel only. Kyrgyzstan selling everything for a year: +0.43 bln instead of about 5.
- Free steel for machines at the start: US 7.4 thousand a month (13 tanks), Russia 8.5, Kazakhstan 4.2, France 1.5, Kyrgyzstan 528.
- Checked: war length the same (RU–KZ 136, US–IR 347 days), bots' GDP the same, no page errors, old save migrates. Not checked: tank output in real play, a real shortage, bots do not build mills. The stock has no limit, idle 5 years US 565 thousand of each (was 3.2 million). Small countries still hold relatively much: Kyrgyzstan 528 free steel a month, was 5; the export limit stops that from turning into money.

## Balance stage done (02.11.2026)
User's answers: conquest must be fairly hard, not extreme, because a small country must be able to do it too; a coalition may fall apart, with small consequences; the nuclear answer is predictable; fuel amounts stay, but production only covers the country.
- Oil: `prodGross(r)` is the output, `prodOf("oil")` is what is left after `oilCiv()` (the country's own use, base output × `S.oilK`, fixed once so the rest covers `OIL_SPARE` 20% of the whole army attacking, `armyOil()`). Stock starts at 0. `fuelDay` buys at most `oilSpotMax()` a day from the market, shared by all wars: 25% of the army's need, 45% for a country with no oil, ×0.7 under single sanctions, 0 under world sanctions. Auto-sale leaves `OIL_KEEP` 60 days of full war in stock. Contracts draw on the civil flow first, the rest of it is sold at home, so money is as before (Russia 1.47 a month checked). Wells and imports are how a player prepares. The enemy's fuel rule (`enemyFuelDay`) is unchanged on purpose: halving defenders would make conquest easier.
- World's answer, block before `infamyAdd`, on the existing `S.infamy` (`S.aggr` is something else, the coldwar scenario's AI aggression): `llMonth(w)` from `LL_MIN` 30 sends the enemy 1–6% of OUR machines at that war a month, in its mix, 25 days on the road. `coalitionForm` above `COAL_MIN` 50 (5% a month + 1% per point, `S.coalCd` 18 months): strongest countries that fit under `COAL_K` 1.2 × our power (0.7 of that with our deterrent), 2–5 of them by empire size, none if they would be under 0.35 of us. That scaling is what keeps a small country's conquest possible. `coalitionEnd` under `COAL_END` 35: `w.coal` wars end, relations stay ≤ −30, approval −2, `S.infamyFloor` +3 (max 15, infamy cannot decay under it). `occFree(iso)`, button in `occCard`: land back, infamy −8…−16, approval −3, floor +1.
- Empire: `occCount()`; `empireK` takes 2% of fighting machines per occupied country (max 25%, in `warFight`), partisans +0.25 per country after the second (max 3), garrison +4% per country (max +50%). Sea supply needed nothing new: `farWar` already makes those trips 30–180 days.
- Nuclear: `NUKE_POWERS`, `nukeRisk(w)`: 0 below `NUKE_LINE` 45 (progress, or front ×0.8), then ((p−45)/50)², ×0.7 with our deterrent; shown on the war card (`nukeLine`), warned once. `nukeMonth`: 35% of machines on the directions and men, fronts −30, approval −20, stability −15, GDP −6%, world sanctions 36 months; next possible after 12 months.
- Home: `conquestMood(w)` from day 90 of a war of ours adds weariness by empire size; weariness ≥ 85 with approval < 30 warns, then 6% a month «Военный переворот» (`endGame`).
- `settings.worldHard` (Settings → Игра, «Мир сопротивляется»): infamy gain ×1.35, lend-lease ×1.3. Difficulty labels already existed on the country cards.
- Test: `tools/sim/conquest.js [years] [runs] [countries]`, bot takes the weakest country and annexes it, holding approval and elections (`INDEX=path` tests another build). It does not run the economy, so default ends its runs. Old build: Russia 9 countries in 4.6 years, US 5 in 4.3. New: Russia 10 in 12 years, US 6 in 6, France 4, Kazakhstan 1. One run each. Pitfall fixed: `warsim.js` never advanced `S.day`, so months did not pass in it.
- Small countries (user asked, same day): `fearK()` scales infamy gains by the share of world GDP (0.35–1.3: Kazakhstan ~0.45, Russia ~0.65, US 1.3), growing with the empire; the panel says when the world does not fear us yet. `puppetAid(w)` from `startWar`: each satellite, once a year, gives a quarter of its machines and men for good, weakening itself (loyalty −4). Annexation trophies already existed (30% of the enemy's machines, 20% of its men), nothing added. `oilSpotMax` ramps up: over `OIL_RAMP` 120 days of war the market grows to the army's whole need, so oil limits the start of a war, not all of it.
- `SMART=1 node tools/sim/conquest.js`: the bot buys tanks, keeps 6 months of deficit, attacks only reachable countries it beats 1.6×, takes puppets above infamy 40. 15 years, one run each: France 11, US 9, Kazakhstan 6, Kyrgyzstan 0 (Russia 12 before the market ramp). No page errors. The bot never attacks allies (Kazakhstan's first war only at year 9, Kyrgyzstan is its ally), does not grow the economy, and Kyrgyzstan (power 38, neighbours from 41, income ~0) never gets going: if the user wants the smallest countries playable, that is the next thing to look at.
- Not measured: a human small-country conquest. `nukeMonth` and `llMonth` ran without errors, but with the war's machines still on the road, so their machine losses were not seen in the test.
- Web preview still needs republishing (see Build and ship).

## Peaceful path done (02.11.2026)
User's choices: a ladder (alliance → union state → referendum), a country over 60% of our GDP can only be an ally until we outgrow it, a separate ending «Объединитель народов».
- Influence, block before `aiTurn`: `x.inf` 0–100. `infParts(x)` lists what ties the country to us and gives the target `infTarget`; `infMonth` (in `aiTurn`) moves towards it, 4% a month up × GDP ratio 0.5–1.25, 3% down. `INF_BUMP`: one-off pushes from gestures in `dipAct`, `improve`, the influence op; they fade. Old saves: `infOf` starts at 60% of the target. `infRow` in `countryBanner` (bar, white mark = target, reasons). Map mode `inf`.
- Ladder: `unionGate`, `refGate`, `refParts`, `refChance`. `x.union`, `x.unionT`, card `act:"union"` / `"ref"` in `dipAct` (dip tab). Union: ally, influence ≥ 50, relations ≥ 60, `peaceFit`, costs 1% of their GDP, pays `UN_TAX` 4% of their GDP a year, base relations 75, map class `m-union`. Ends if influence < 25 or the alliance ends; a war on the country ends it too.
- Referendum: 12 months after the union (a satellite can run one too), influence ≥ 65, costs 2% of their GDP, 6 months in `S.refs[iso]`, poll at 3 months. `refEnd`: fail → influence −15, relations −15, approval −2, `x.refT` 24 months. `peaceJoin`: `occupy` then already `o.referendum` with no damage or garrison, half their army and machines, relations −3 in the region, no infamy, `S.peaceJ` +1.
- Rivals: `infRival` = strongest country of another bloc that is not tied to us. `rivalMonth`: counter-campaign (`r.pen`, up to −20, answered from the same card for half the cost), slow recruiting, a coup on a union under influence 60.
- Ending: `worldUnited` counts unions. `winFinal`: joined + unions ≥ 70% of countries → «Объединитель народов»; «Легенда человечества» stays first.
- Test: `tools/sim/peace.js <dir>` (t.html as in Testing) checks gates, fail, win, exits, rivals. `node tools/sim/peacebot.js [years] [runs] [countries]`: 15 years, one run each, joined + union states: Russia 9+2, France 6+2, US 4+0, Kazakhstan 2, Kyrgyzstan 0 (war bot: 12, 11, 9, 6, 0). First join after 2.3–6 years. No page errors.
- `ECON=1 node tools/sim/peacebot.js`: the bot also develops the economy (trade deals, research, buildings, education, infrastructure). One run each, approval held by force. Kyrgyzstan: GDP 14 → 28 (5 years) → 56 (10) → 95 (15) → 227 (25); the ladder opens at year 27, first join at year 29, so a person can do it without an exception. Before the fix France got 23 joined + 4 unions in 20 years, Russia 20 + 3: too fast. Fix (user's choice): one referendum at a time, each joined country −`REF_WARY` 4% on the next ones. By the formula much of the growth is `0.0003` a month per trade deal in `growthMonthly` (30 deals ≈ +10.8% a year); left as it is.
- With the economy on both bots (`ECON=1`, `SMART=1 ECON=1 node tools/sim/conquest.js`, shared `econ-bot.js`), 20 years, one run each: peace France 13 + 4 (GDP ×6.7), Russia 12 + 4 (×9.5); war France 19, Russia 18 (GDP ×1.2 and ×0.9, infamy ~45). Kyrgyzstan in peace, 30 years: 3 + 1, ladder from year 21, first join at 24, a failed referendum.
