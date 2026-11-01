# Handoff: where the 3D battlefield work stands

Read this first in a new session. Finished stages (aviation, strikes from the field, sound, performance, fuel, delivery, model batches 1–7) are in `docs/HISTORY.md`.

## Build and ship
- Game source is `src/game.html`; edit only that file. Build with `python3 scripts/build-www.py src/game.html`, which writes `www/index.html` (never edit `www/index.html` by hand: the build wraps the source in a page head).
- After changing `tools/units/credits3d.json`, run `python3 tools/units/gencredits.py` before building.
- Pushing to `main` builds the APK in GitHub Actions. The APK lands at https://github.com/Askarhan/prezident-sim/raw/apk/kabinet-prezidenta-debug.apk
- Web preview is the artifact https://claude.ai/artifact/35wSnfwnyDNc895xgEe7xG (build of 01.11.2026, so it has none of the commanded battle work of 02.11: republish when the user asks; the old ND3zG4d9… link is left on an older build). It loads models as base64 `field/models/<id>.glb.txt`, because the host does not serve `.glb`.
- Republishing the preview: stage `www` in the scratchpad with every `.glb` as `base64 -w0` → `.glb.txt`, sfx with `contentType audio/ogg`; publish to the same artifact in parts (limits: 255 files and 64 MB per publish), e.g. page + bf3d.js + sfx + icons + photos + world.js + units + props; then sat + half the models; then the rest. `lib/three` is not in git: copy it server side with `{artifact, path}` from the existing artifact. Updating an artifact from another chat requires reading its whole 800 KB page first (too costly): either publish from the same chat or make a new artifact and change the link here.
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
- Models converted so far (63, with Lancet, Tu-22M3, B-1B, HQ-9, Krasukha, HQ-17, Su-57, F-35, IRIS-T, J-20, Z-10, Wing Loong, J-10, F-15EX, AH-1Z): tanks, IFVs/APCs, artillery, Gepard, Buk, Patriot, S-400 (also used for S-300), THAAD, NASAMS; aircraft Su-25, Ka-52, TB2, A-10, Su-34, Mi-24, MiG-29, Su-35, F-16, Apache, Reaper, Shahed-136; Iskander, Tor, Pantsir; Tochka-U, M270, ZSL-92 (WZ-551).
- Stand-ins (`BF3D_LIKE`, user's choice: no CC BY model exists): bmp3 → bmp2, phl03 → tornado (Smerch); their procedural .glb were deleted.
- Still procedural: hq16 (no CC BY model found). S-500 borrows the S-400 (`BF3D_LIKE`, user's choice, its procedural .glb deleted).

## Next
- Next stage to discuss with the user: infantry from `w.men` (phone load), or variety part 2 (city battle, enemy doctrine, mid-battle events, rewards), then the BALANCE STAGE below.
- Possible next model batches (≤3 at a time, ask the user first): Switchblade 600, HQ-16 (none found on Sketchfab 01.11), EC-37B Compass Call; check whether transports and ships are drawn on the field before modelling them. The A-10 keeps small low-visibility US markings (grey on grey): they could not be separated from panel lines automatically.
- Before each big new feature, discuss the plan with the user first.
- Delivery ideas not built: losses on the road (strikes on columns), a railway (`S.rails`) speeding up the trip.

## NEXT STAGE (agreed 02.11.2026): commanded field battle
The user found the field boring: it only shows what the map already decided, and ~30 s after opening a banner says the position fell. New rule: while a commanded battle is open, the field decides the outcome. Build it in stages, discuss details with the user before each.

Rules agreed with the user:
- One commanded battle per war every 15 **game** days (`w.bfCd`), on any one direction. Cooldown in game days on purpose: speed 1×/3× changes only real-time waiting, not the balance (the user asked; explained). During the cooldown the field opens only to watch, the old way, no pause.
- Before the battle the player picks the strike group with a slider: at most **33%** of the direction's machines. Only that group can die; the rest hold the front.
- The map is paused during the battle. On exit, days passed = minutes of battle (1–5); the game fast-forwards those days everywhere except this direction, which takes the field's result (losses and the line taken/held). Leaving early: the rest is auto-resolved the old way.
- No retreats: the battle runs to the end. Win banner «Мы уничтожили позицию врага! Победа!» (the line falls), loss «Враг уничтожил нашу армию».
- Damage model (the user's idea): each field unit is a squad of N real machines (e.g. 70 Armata vs 67 Abrams → 3 squads each, 24+23+23 vs 23+22+22). Squad HP = N × machine HP (from armour). A squad's shot hits with the strength of all its machines × an attacker/target class factor (tank vs tank full, autocannon vs tank weak, ATGM strong); equal squads die in ~4–5 hits, bigger and better squads win faster. Lost HP ÷ machine HP = machines destroyed; label «Армата ×24 → ×17»; these are the war's real losses.
- AI: squads spread across the flanks with intervals (not bunched in the centre), take cover behind walls, ruins, houses, berms (the props), fire only with a clear line of fire (raycast against props/relief a few times a second, not every frame, for phones), move cover to cover, try flanking; a damaged squad looks for better cover.
- Drive: HP bars, «не пробил / рикошет», burning hulks stay, turrets can blow off, kill feed («Т-90М уничтожил Abrams»), loss score, day timer, camera shake on near blasts. Air/heli/drone strikes inside the battle with cooldowns in seconds, spending real ammunition.
- Variety (so battles don't bore): first version has two battle types, **assault** (take the line) and **defence** (hold N minutes against waves), and terrain by country. Later stages, 1–2 at a time: breakthrough, ambush on a supply column, city battle, night/fog/rain, enemy doctrine by its real force mix, mid-battle events, rewards (trophies, morale, veteran squads).
- Infantry (from `w.men`): a separate stage after the core battle (phone load), the assistant's recommendation.

### Step 1 done (02.11.2026): rules in `game.html`, outcome still a stub
- Code block `/* ---- a commanded field battle` (before the 3D field part): `CB_CD` 15, `CB_MAX` 0.33, `CB_EMAX` 0.4 (user: the enemy answers with our share ×40/33, at most 40% of its machines on the direction, `w.eu × f.share`).
- Type is automatic (user): `f.lastD ≥ 0` → assault (`atk`), else defence (`def`). Win: atk takes the position (`f.p` → next `POS_STEP`), def → enemy `regroupT = REGROUP_LINE`. Loss: atk → our `f.pause` 3 days, def → our position falls.
- Flow: `openBattle` → `cbOffer` (card with slider 1–33%, both groups, «перевес»; during the cooldown only `bfMsg`). «В бой» → `w.cb = cbPlan(...)`, `w.bfCd = w.days + 15`, root class `cmd` hides `.bf-pos` and strikes, `.bf-cmdhud` shows timer and «Мы ×N → ×M». `tick()` returns while `BF.open.cb` (map paused).
- **Stub**: `cbPlan` decides win/losses/duration (1–5 min from the edge) at the start; `cbTick` (the 1 s `tickBar`) applies losses gradually through `depTake` / `w.eu` + `lossTh`, so the field shows them via `api.hit`. Step 2 replaces `cbPlan`/`cbTick` with the real squad battle from `bf3d.js` (keep `cbApply`-style recording and `cbEnd`).
- `cbEnd(st, early, stay)`: full losses, `cbOutcome` (uses `frontMoved`, extracted from `frontsDay`), then fast-forwards `round(dur/60)` days with `w.bfLock = i` (that direction skipped in `frontsDay` and `warPush`). Early exit («Досчитать бой» or the X) = same plan resolved at once. A save with `w.cb` is resolved on `load()` by `cbOrphans()` (no days pass; the cooldown stays spent).
- Tested headless (2D fallback, no three): offer, pause, HUD, win banner, cooldown message, early exit, orphan on reload; no page errors.

### Step 2 done (02.11.2026): the real battle in `bf3d.js`
- Game: «В бой» on a WebGL device sets `cb.real` and `bf3dRestart` rebuilds the field (`st.g3` token drops a stale import) with `bf3dBattle(st, w, i)`: only `cb.g` / `cb.e`, squads by model (slots high 8 / mid 6 / low 4, arty 2, ≥3 machines per squad), front width `CB_WIDTH` by terrain (p 120, d 140, f 80, u 60, m 50), the rest as `reserve` chunks. Defence battle: the enemy's front comes in waves (now 60% + the rest at 45 s, see step 3). No `tick3d` in battle. 2D fallback (or a failed import) keeps the step-1 stub.
- `ctx.battle` = `{type, stats{id:{ga,df,kind}}, reserve, total, defSide, atkSide, defK 1.25, limit 300, hold 180, onLoss(side,id,n) → cbLoss, onEnd({win,t}) → cbEnd}`; `api.battle()` gives `{t, lost, total, ended, win}` for the HUD (now at the bottom).
- Field (`const B` in `start`): squad hp = machines × df (defender ×1.25); `bShot` decides miss / «рикошет» / «не пробил» / hit (acc by distance, ×0.55 target in cover, ×0.75 moving), damage = live machines × ga × 0.25 × `CLS[att][tgt]` × 2ga/(ga+df), carried as `t.pend` so the old shell visuals make the hit. `bDamage` turns hp into machines lost → `onLoss`, floats «−N», label «Abrams ×5 → ×3», kill feed, reserve squad comes in. Mines for the attacker's moving squads in the first 90 s. Camera shake on near big blasts.
- End (`bStep`, every 0.5 s): a side with nothing alive (squads, reserve, arriving) loses; assault at 300 s → the side with the larger loss share pulls back (user); defence held 180 s → win. Losers drive off the field.
- Cover/AI: 16–24 covers (wall/ruin/berm/rock by terrain) between the lines, each with spots behind it per side; `bLos` (cover circles + 5 relief samples) per target every ~0.6 s; no fire without line of fire (front only, artillery is indirect). `bPlan`: attacker cover to cover 5–32 m forward until ~34 m from the enemy, defender best cover near its lane, outermost squads flank (lane ±25 m), a squad under 45% hp falls back once («отходит в укрытие»), blind >5 s → moves.
- Player orders (user asked): tap our squad («куда? тапни точку или врага»), then tap ground → moves there (ring marker, holds 25 s) or an enemy → forced target. Not tested with real taps headless.
- Early exit / stuck (>420 s) / reload: `cbRest` resolves the rest from what is alive.
- Tested headless with three from the apk branch (`git fetch --depth 1 origin apk`, unzip `assets/public/lib/three` into `www/lib`, not in git): RU–KZ assault won in 20 s, FR–DE defence ~19 vs 33 losses at 70 s, no page errors. Balance (defence may be easy because of waves) → step 3 with `warsim`.

### Step 3 done (02.11.2026): strikes inside the battle and balance
- Agreed with the user: target by a tap (second tap on the button = auto target), small portions of ammo, an «Артудар» button, the enemy strikes too (assistant's choice).
- `CB_STRIKES` in `game.html` (after `cbTick`): air 40 bombs / 60 s, heli 20 ATGMs / 40 s, drones 10 loitering munitions / 30 s, arty a salvo (0.2 thousand shells if the direction has SPHs, else 40 MLRS rockets) / 45 s. Cooldowns are in battle seconds (`cb.sk`, enemy `cb.ske` ×1.6, enemy at most one strike per 12 s from 20 s on, `cbFoe` in `cbTick`). Needs machines on the direction (`w.dep[i]`; enemy `w.eu × cbFs`) and ammo (enemy `w.ea` only if it keeps that key).
- `cbFire(st, type, side, p)`: kills in machines (air 1.5–5 by air superiority, heli 3, drones 10×(1−jam)×0.35, arty 2.5; scaled by how many such machines there are), `down` 0–2 aircraft by the other side's AD (real losses: `depTake`/`w.eu`), jam by the other side's EW. Spent drones are not losses (`lossF` undone like `fieldStrike`).
- Field: `api.strike(side, type, {x, z, kills, down, jam, n, model})` → `cstrike` in `bf3d.js`: targets within R of the point (densest enemy group when no point), damage = kills × target `hpPer` as `pendAir`; temp aircraft (`tempAir`, `a.aim`) bring it; the last `down` of the group get `pend = 1` so MANPADS/AD shoot them. Arty = 6 arcing shells per target from the own edge, damage on the last one. Kill feed credits «Авиаудар уничтожил …». `api.aim(fn)`: the next tap on the field (enemy squad or ground point, red ring) goes to `fn`.
- UI: `.bf-cbsk` bar above the HUD (`cbSkBar`, buttons built once and updated in place: rebuilding every second swallowed taps); in battle `.bf-msg` moves to the top.
- Balance (headless, `tools/sim/fieldbattle.js`, see Testing): the field used to be much bloodier than the auto-calculation (loser always 100%) and defence far too easy (attacker in 3 waves). Now: a side down to 35% of what it brought (alive + arriving + reserve, `B.cn`) breaks and pulls back («враг отступает» / «наши отходят»); defence waves 60% at once + the rest at 45 s; direct fire factor 0.25 → 0.13 (battles ~80–120 s instead of ~40 s). Result for FR–DE, DE–PL, IT–FR assault/defence: same winner as `cbPlan` in 6 of 7 runs, loser loses ~0.65, winner ~0.3–0.6 (auto: ~0.6 / ~0.35). Strikes are the player's bonus on top.
- Loitering scale fix: dedicated loiter models (Lancet) now fly at scale 1 (was 0.26, meant only for the TB2 stand-in).
- Not done: the preview artifact was not republished (needs the whole www upload). Ideas: show strike cooldowns as a ring; enemy strike warning a few seconds ahead; strikes into `warsim.js`.

### Variety stage, part 1 done (02.11.2026): weather, ambush, breakthrough
- User chose all three; weather by season and latitude (assistant's choice, the user did not answer).
- `cbWeather(w, f, type)` in `cbOffer` → `st.wx` → `cb.wx` → `ctx.wx` (commanded battles only; watch mode has no weather). Latitude of the land fought over (`CAPITALS[...][1]`: enemy on attack, ours on defence), `S.month` is 0-based, southern hemisphere flips. Snow only at |lat| ≥ 40 in winter (60%) or ≥ 48 in Nov/Mar (30%); rain 20% (winter 8%), fog 10%, desert terrain almost always clear; night 25%. The card shows `wxText(wx)`.
- Field (`bf3d.js`, after the lights): sky/haze colours, `FOG` offsets follow the camera distance in `placeCamera` (clear keeps the old fixed 160/430). Night: dim blue light + 2 parachute flares (`FL`, lights made up front). Rain streaks / snowflakes (`PREC`, 500/900/1400 by graphics level). Snow whitens the ground texture in `buildGround`.
- Battle effects: `B.vis` (night 75 m, fog 55, night+fog 45, rain 130, snow 110; a flare ×1.5) in `bLos`; `B.acc` (night 0.75, fog 0.8, rain/snow 0.9) in `bShot`. Strikes: `wxStrike` (air ×0.5 fog, ×0.65 rain, ×0.8 snow/night, cooldown ×1.4 in rain/fog; heli ×0.7 fog; drones +0.15 jam in rain/snow; arty ×0.85 fog/night).
- Types: `CB_TYPES` (name, card text, HUD, banners, time limit) and `cbPick(f)`: on the attack 60% assault, 20% `brk`, 20% `amb`; on defence 75% defence, 25% `amb`. `cbGroups`/`cbPlan` take the type; `cbDefUs` (def, amb) / `cbDefThem` (atk, brk) decide `DEF_K` and `defSide`.
- Ambush (`amb`, 240 s): the enemy front (its artillery too) is a column on a road (`B.road` z = −8, a drawn strip; no covers or props on it) coming from x < −FIELD/2 at 5 m/s; nobody fires until `bAlert` (lead past x −10, 90 s, a player order or strike, or contact < 22 m). Then half the column dashes for the far edge (escaped machines `B.esc`, ≥ 40% of the column = loss), the rest attacks. No mines, no `defK` (1). Win: enemy `regroupT` + a little push; loss: our `f.pause` 1 day. Enemy strikes only after the alert.
- Breakthrough (`brk`, 180 s): red zone (`B.zone`, r 15, in the enemy rear at z −90, camera starts there); our front bounds 22–32 m straight for it (`bPlan` override, holds 3–5 s); win when ×`B.need` (30% of the group) machines stand inside; time out = loss. Win takes the position and puts the enemy in `regroupT`.
- Test (`tools/sim/fieldtypes.js`, forces `st.cbt`/`st.wx` on the offer card): FR–DE ambush in rain won 35 vs 49 losses in 169 s; breakthrough at night lost 43 vs 28; assault in fog lost 43 vs 23 (the auto-calculation also loses FR–DE assaults). One run each: tune with more runs if the user finds a type too easy or hard.
- Next variety ideas (not built): city battle, enemy doctrine by its force mix, mid-battle events, rewards (trophies, morale, veteran squads).

### AI and cover rework done (02.11.2026)
- User: tanks drove head-on and shot point-blank; covers were all alike. Assistant's choice of fix (user: «делай как считаешь правильным»).
- Battle lines now start further apart (`DEPTH` when `ctx.battle` and not ambush: front 36–50, arty 64–80, ad 86–100; ambush keeps the old depth).
- `bPlan` rewritten: fighting distance by class (`bBand`: tank 44/62/88, IFV 34/48/66, APC 28/40/56, capped by `B.vis`); the attacker closes in (`bClose`) only after 62% of the time limit or when the enemy lost 45%. Bounding overwatch (`BOUND` 9 s, `u.grp` alternates by x): one attacker group moves while the other holds (`bMayMove`). Spot score: distance band, line of fire, enemy's side in view (`bFace`, flankers ×2, lane ±40), −18 near a mate (spread), defender keeps to `home` z. No cover → a point at the ideal distance on its own lane, max 22 m bound.
- Side/rear armour in `bShot`: side ×1.6, rear ×2.2 (float «в борт!»/«в корму!»), ricochets only on frontal hits. Holding squads turn the hull to the target; moves backward under 45 m away from the enemy go in reverse at 3 m/s.
- Cover: `COVER` (16 kinds: wall, ruin, berm, rock, house, barn, hay, trench, blocks, container, wreck, car/bus, trees, logs, boulders, dune), placed as groups `COVER_SETS` (farm, treeline, trenches, village, ruins, yard, checkpoint, street, logyard, rocks, ridge, dunes, fort…) picked by terrain from `COVER_MIX`; 18/28 pieces (low/other). LOS points are spread along the length (one per ~5 m); spots stand `dep + 2.4` behind.
- Test (one run each): same winner as `cbPlan` in 4 of 6 (FR–DE assault and IT–FR defence won by the player where auto mostly loses), losses ~0.3–0.7, battles 57–81 s. Defence may now be a bit easy; tune with more runs if the user notices.
- Pitfall: `houseGeo` sits right after `coverGeo`; a replace of the cover block removed it once (the field then silently waits; check page errors beyond the flag 404s).

### Force ratio cap (02.11.2026, user's report: our 33% = ~1000 tanks vs the enemy's 103)
- `cbGroups`: outnumbered by more than 1.3×, the enemy raises its share (up to 100% of the direction when it defends, 60% otherwise); then each side brings at most `CB_RATIO` 3× the other's group (floor 12); the rest hold the front. The card adds «Больше брать нет смысла…» when our group is capped (`G.capped`).
- Check: RU–KZ 27 vs 9, US–MX assault 742 vs 372 (Mexico all in), KZ–RU 3 vs 10, FR–DE unchanged 105 vs 115.

### Testing the field headless
- three: `git fetch --depth 1 origin apk:refs/remotes/origin/apk`, `git show origin/apk:kabinet-prezidenta-debug.apk > k.apk`, unzip `assets/public/lib/three/*` into `www/lib/three` (ignored by git).
- The built page wraps the game in `(function(){ ... })();`, so tests cannot call game functions. Make an unwrapped copy `www/t.html` (drop the first `(function(){` line and the last `})();` before `</script>`), serve `www` with `python3 -m http.server 8765`, delete `t.html` before committing.
- `api.ff(sec)` (test hook in `bf3d.js`) runs the field ahead without drawing. `tools/sim/fieldbattle.js '[["fr","de","atk",0.33],...]'` (run with `NODE_PATH=$(npm root -g)`) prints `cbPlan` averages vs one field battle per run. Chromium flags: `--use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. A Playwright `click` on «В бой» hangs (heavy sync handler): click from `evaluate` with `setTimeout`.

Order (all three done): 1) rules in `game.html` (cooldown, strike group slider, pause, days on exit, applying results, auto-resolve on early exit); 2) battle in `bf3d.js` (HP, damage, cover AI, end conditions, HUD); 3) in-battle strikes + balance with `tools/sim/warsim.js` (a field battle should average about what the auto-calculation gives, plus a bonus for good strikes).

## BALANCE STAGE (agreed 02.11.2026, do at the very end, after the battle stages)
Problem (user): the US, Russia and China are unbeatable; a player can take the US and conquer the world. The commanded battle makes it worse (test: Russia 665 machines vs Kazakhstan 26). Don't weaken the battle itself (a superpower should beat a small neighbour); stop world conquest with the mechanisms below. What exists today: occupation and partisans (`occupy`, `occupationTurn`), sanctions, war weariness (`wearyAdd`); a coalition is only a warning text (around «соседи могут собрать коалицию»), nothing really forms.
All approved by the user, in this order of effect:
1. **Coalition and lend-lease.** Every conquest adds «aggression». Above a threshold, neighbours and other powers first send machines to the player's enemy (lend-lease into `w.eu`), then join the war themselves. A US world conquest meets China, Russia and Europe together. The main lever.
2. **The empire slows itself.** Each occupied country needs a garrison (machines and men leave the front); partisans grow with the empire's size; overseas wars only through sea supply (ties into delivery `w.road`).
3. **Nuclear deterrence.** Attacking a nuclear power is allowed, but with a risk of a nuclear answer: huge losses, collapse of approval, world sanctions. Superpowers cannot calmly swallow each other.
4. **Home politics.** A long war of conquest drops approval faster → protests, lost elections, a coup.
5. **Difficulty at country choice.** US/China/Russia «Легко», small countries «Сложно»; plus a «Мир сопротивляется» setting (coalitions form faster).
In the commanded battle (build with battle step 2, part of the same mechanics):
- **Front width:** at most N machines fight at once, N by terrain (plain more, mountains/city less); the rest of the strike group is a reserve that replaces the dead.
- **Defence bonus:** the defender gets fortifications and mines; later infantry with ATGMs from `w.men`.
Check balance with `tools/sim/warsim.js` (add multi-war/conquest runs for the big three).

Fuel (deferred by the user to the very end, after the battle stages): the user conquered Mexico in a test with no fuel trouble. Fuel is implemented (`fuelDay`), but the amounts are realistic (a tank 4 bbl/day), so an army burns a tiny share of an oil country's output; it only bites without oil, under sanctions or with an empty treasury. Ask the user whether to make it harsher (losses in transport, front money) or to make delivery the bottleneck (strikes on columns).
