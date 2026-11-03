# Handoff: where the 3D battlefield work stands

Read this first in a new session. Finished stages (aviation, strikes from the field, sound, performance, fuel, delivery, model batches 1–7, resource balance, balance, peaceful path, people and needs, economy notes) are in `docs/HISTORY.md`.

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


## Now: flat economy stage (user's decisions, 03.11.2026)
Replaces prices in percent of GDP. Nothing of this is in the game yet. Go group by group, short and in plain words, one example at a time (he does not read wide tables well), and show him the numbers before building. Discuss the plan first: this is the base of the game.
- Same start for every country: 15 000 money, wood and steel for 3 buildings. Same building prices in tonnes everywhere. Buildings cost materials only, no money.
- Sawmill and steelworks give 5.5 a day (user's decision 04.11, stays as it was). Other output buildings: set them with him, group by group.
- Start buildings of big countries only cover that country's own needs and spending. Free materials come only from buildings the player built. Giants get +30% of the free flow (`GIANT_K`, user's decision; giants = `S.gdp0` ≥ 1500, the assistant's line, 15 countries). So a conquered land mostly feeds itself and stops being quick profit.
- Every next building of the same type costs 2% more materials (`MAT_UP`, user's decision, only player-built ones count). No build limits.
- Oil, rare earths, uranium are flat (`FLAT_R`, `S.uq` = 1, user's decision 04.11): a rig or mine gives 5.5 a day × deposit (`depositK`) × tech (`techK`), −7% for each next one, start oil only feeds the country. Bonuses work only on the first 5 buildings (`BONUS_FIRST`, user's decision): a deposit above 1 and the giants' +30% (wood and steel only). Barrel price is untouched: until the money step one rig earns Kyrgyzstan about 3× its yearly income.
- Energy is a separate stage (user's decision 04.11). `uranMonthly` keeps its old ratio to a mine until then (about 13 t per plant a month).
- Flat money, done 04.11 (user's decisions): 1 unit = 1 million $, start 15 billion (`START_MONEY`) and debt 400 for everyone. Money counts from `mg()` = `FLAT_GDP` (1000 a year) × own growth; `me().gdp` stays the real size for comparing countries and strength. Taxes ≈ 382 a day, ordinary spending about the same, `S.budFix` leaves +10 a day (`FREE_MONTH`). Buildings cost 0 money (`buildCost`). Start army is paid for: `armyUpkeepMonthly` counts only what is above `S.army0`, soldiers at `PAY_PC`. Oil is in thousand tonnes at $550/t (`OIL_T`), fuel too: full US attack 3.7 a day. UI: «Доход в день» is the treasury's real income for the player, others show «Экономика»; percents read «экономики». Old saves are not converted.
- Peace check after this (budget.js, Kyrgyzstan 10 years): surplus about 1.8% of `mg()` a year, treasury 15 → 179, inside the target 1.3–3.5%.
- Still on real GDP, broken until the war group: tribute, contribution, `rebuildCost`, union tax (`e.gdp`, `x.gdp`, `o.gdpFull` money flows). Annexed land adds 0 money (`mg` subtracts `o.added`): set a share at rule 4. Long wars cut real GDP ×0.2, so `mg()` falls and the bots default (8-year runs: Kyrgyzstan 4.8 years, US 2.9): fix with rule 7.
- Done 04.11: the word ВВП is gone from the UI (the number is `gdp/365`, percents read «годового дохода»); start stock 1500 + 1500; free wood and steel only from built ones (`civOf` = output of `S.mills0`, the need no longer grows with the economy, `S.civ0` is unused); `bonusN` counts built ones. The 15 000 money waits for the money step: money is in billions today, so 15 000 would be 15 trillion for Kyrgyzstan.
- Research: a point raises a building type's daily output by about 2%, counted only for buildings the player built.
- Money comes from taxes on the population and from selling resources and goods. It goes to the army, research and building upkeep.
- The word ВВП leaves the UI at once, «Доход в день» replaces it. `gdp` is on 191 code lines, `ВВП` on 72: remove the internal number step by step (taxes, `gdppc` in army upkeep, `buildCost`, `plantOne`, `objUpkeep`, default at 160%, `fearK`, unions, AI).
- Cancelled by this: prices in percent of GDP, the money price tables, the «fixed sums» question, buildings adding GDP (old rule 1), object payback, the highway question.
- Already in the game and useful: `builtN(id)` (owned minus start), `S.civ0`, `civOf`, `prodOf`, `startMills`. Pitfall: `bonusN` counts all of `S.buildings`; switch it to built ones or big countries get the full bonus at the start.
- Income buildings keep their one-at-a-time jobs after this (chem, auto done). Assistant's proposal for the electronics plant, not answered: −4% time per plant for aviation, helicopter and SAM plants, −3% research time. Then port, airport, highway, bridge, metro.

## War rules that stay (equal money does not fix conquest: the US army starts 370× stronger than Kyrgyzstan's)
Proposed order: 2–3, then 4–6, then 7. He accepted the set in discussion and chose the soft pretext; restate them in the first plan. Experimental code for 2–4 and 6: `tools/sim/proto-rules.py`.
- 2. Market limit a year per country: about 120 tanks, 200 IFV/APC, 60 SPH, 40 MLRS, 24 fighters, attack aircraft, helicopters, 6 bombers, 30 others (`orderUnits` has no limit today: a bot bought 8.4 million tanks). The rest only from own plants and steel.
- 3. War cost by forces: in `budget`, on top of upkeep, 2 × (`w.men` × 0.004 × `gdppc()` + `unitsUpkeepYear(warUnits(w))`)/12 instead of the flat 1.2% of GDP a year per war.
- 4. Occupation: `integ` +0.013 a month (rebuild) or +0.009, was 0.065 and 0.045, about 8–11 years instead of 2. Income 15% + 85% × `integ`, was 30% + 70%.
- 5. Soft pretext for war: preparation 12 months + 6 per not integrated country, one at a time. Attacking without it stays possible: infamy ×3, approval −15. Tested only as a hard gate.
- 6. Giant's duties: `guardK` = share of world GDP, max 0.4, stays home: cuts `freeArmy` and `warFight` (US about 30%).
- 7. Damage cap, not tested: one missile is −0.15% of GDP (−40 bln for the US), a lost war −15%. Make them capped sums.
- 8. Raw materials must earn real money, on the resource step below: Saudi Arabia lives on oil, Japan buys. Today free oil is about 0 everywhere: `oilCiv` takes all above 20% of the army's need.
- Check the puppet tribute: the text promises 10% of its GDP a year, the payment line was not found (a test run had treasury 958 at GDP 644, cause unknown).

## Measured on build ee778fe (one run each, approval forced unless noted)
Tools: `tools/sim/speedrun.js` (flags in its first line), `tools/sim/proto-rules.py`, `tools/sim/budget.js`. Use one country per process. With several wars at once the bot does not split machines, so `PAR=1`.
- Peace, 15 years, now: objects 33–37% of GDP against taxes 15.5%, surplus 20–25%, treasury 61–96% of GDP (Kyrgyzstan 4%, 6.5%, 21%). With buildings adding GDP (cancelled) surplus was 1.3–3.5%: use that as the target for the flat economy, money must stay scarce.
- Speed now: Russia 5 countries in 2.6 years, US 3 in 1.5; both lost the election in year 4 with approval not forced. Forced, 5 years: US 6, Russia 5, France 2–4.
- GDP in long wars now falls to ×0.1–0.25. France, 20 years, log loss: lost wars 0.97, missiles 0.84, uprisings 0.55. Objects kept paying 857 at GDP 272.
- Rules 1–6 with a 12 + 6 month gap, 20 years: US 7, Russia 7, France 6, about one country in 3 years; France GDP ×1.8, Russia ×2.3, US ×1.25 at year 15 and ×0.8 at 20 (two lost wars). Without the gap conquest stayed fast: weak countries fall in about 6 months at any budget, so the pretext does the most. Each rule was not measured alone. Kazakhstan without the gap 3 in 20 years, Kyrgyzstan 0–1. Peace path almost the same, 4–9 countries in 15 years, first at year 11–14.
- Assistant's estimate: full victory 40–60 years, 8–12 hours at top speed.

## Open with the user
- Other systems proposed, none chosen or tested: living rivals (AI arms itself and conquers; search found no AI armies or AI wars today), development tiers and big projects, workforce (army and plants take people, today army size does not touch GDP growth), economic cycles, governance limit. Advised order: after rules 2–7, workforce and cycles, then tiers and governance, rivals last.
- Resource step after the flat start: oil, rare earths, uranium by the same rule, then the stock limit, money and coins.

## Later
- Peaceful path done, see `docs/HISTORY.md`. Smallest countries: no change (user's decision): the 60% rule stays with no exception, a person develops the economy first. Kyrgyzstan's slow start (ladder at ~year 21, ~10 hours of play at 2×) can be looked at after the user plays it.
- Order after delivery (assistant's proposal, the user said it still has to be discussed): phone test by the user, then UI and polish, models, preview, map, final test and release. Real speed: `SPEED_MS` 15 / 5 / 2 s per game day.
- **Map upgrade waits for a file from the user:** the chat shrinks images (his Blue Marble came as 2576×1288, worse than the current 5400×2700 source; a January one, with snow; the assistant advised July). Needs the original 21600×10800 from https://visibleearth.nasa.gov/images/73751/july-blue-marble-next-generation-w-topography-and-bathymetry/73765l , the shell cannot reach NASA. Ways: a GitHub release `map-source` on this repo (`gh release download`, not tested through the proxy), or `D:\Projects\kabinet_units` with this chat open in the desktop app. Then: level 16384 in `SAT_LEVELS` and `build_sat.py` (colour source there is `bmng.jpg`), no ocean tiles at that level, colour grade. APK about 15–25 MB bigger (rough guess).
- **User's decision (02.11.2026), corrected: no brand-new ideas for now, but everything already planned stays and must be finished, and existing features can be improved.** Planned list: the next model batches, the web preview. **UI and polish stage (user's plan, 02.11.2026):** finish what is in the game rather than rebuild it: too much information on screen, high mental load; simplify the settings; finish the design across the game. Discuss screen by screen with the user first. Then a phone test, bugs, release. Ask the user the order.
- Possible next model batches (≤3 at a time, ask the user first): Switchblade 600, HQ-16 (none found on Sketchfab 01.11), EC-37B Compass Call; check whether transports and ships are drawn on the field before modelling them. The A-10 keeps small low-visibility US markings (grey on grey): they could not be separated from panel lines automatically.
- Before each big new feature, discuss the plan with the user first.
