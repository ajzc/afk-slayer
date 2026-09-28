# Time gates → resource costs (build gates1)

Alex: unlocks were hard-locked by play time; those times were pacing targets, not real locks. Players must earn the resource, not wait.

## Earn-rate basis

From `DESIGN.md` / `js/data.js`:

`KillRate/min = 2.5 × idlePower × (PLAYER_BASE_IDLE + hunterIdle) × areaMult × contractMult`  
(`PLAYER_BASE_IDLE = 0.75`; × `ACTIVE_MULT 1.4` while holding.)

Staged **expected** rates used for calibration (mixed live + AFK, Level 1→2 progression):

| Play window | gold/min | points/min | Notes |
|---|---:|---:|---|
| ~8–10 min solo | 7–8 | ~3 | Cubs/bears, bolts |
| ~15–25 min + Briar | 10–16 | 4–6.5 | Company online |
| ~50–90 min | 28–45 | 12–20 | Mid gear / Quill window |
| ~3–5 h | 70–100 | 30–45 | Moss / Ember window |

Target cost ≈ `rate × old_minutes × 0.9` (0.9 = focused play). If the **old** cost already met or exceeded that target, it was **kept** (already a resource sink). Post-hire Quill upgrades that shared the hire’s 90m gate use a **modest post-hire sink** (~15–20 min of gold), not another full 90m tax.

## Conversion table

| Node | Old time target | Currency | Old cost | New cost | Reasoning |
|---|---:|---|---:|---:|---|
| gear_iron | 10m | gold | 180 | **180** | Already ≥ ~72 target |
| gear_steel | 15m | gold | 450 | **450** | Already ≥ ~135 |
| gear_mithril | 22.5m | points | 320 | **320** | Already ≥ ~122 |
| gear_adamant | 33.8m | points | 700 | **700** | Already ≥ ~228 |
| gear_rune | 50.6m | points | 1500 | **1500** | Already ≥ ~546 |
| gear_dragon | 75.9m | points | 3500 | **3500** | Already ≥ ~820 |
| beam_focus | 8m | gold | 90 | **90** | Already ≥ ~50 |
| bolt_pierce | 15m | gold | 180 | **180** | Already ≥ ~135 |
| special_cadence | 30m | points | 220 | **220** | Already ≥ ~202 |
| hunter_charge | 35m | points | 400 | **400** | Already ≥ ~268 |
| unlock_crits | 20m | gold | 120 | **250** | ~14g/min × 20 × 0.9 |
| unlock_specials | 25m | gold | 200 | **360** | ~16g/min × 25 × 0.9 |
| crit_power | 22m | gold | 150 | **300** | ~15g/min × 22 × 0.9 |
| bolt_bounce | 20m | gold | 200 | **250** | ~14g/min × 20 × 0.9 |
| hunter_briar | 15m | gold | 80 | **140** | ~10g/min × 15 × 0.9 |
| hunter_quill | 90m | gold | 200 | **900** (boss1) | Gold only; ~25–30 min mid-game · was 3650 (too high vs L1 meter) |
| hunter_moss | 180m | gold | 400 pts | **2000 gold** (boss1) | Moved off Sp (competed with L2 meter 280) · ~40 min L2 gold |
| hunter_ember | 300m | gold | 1200 pts | **4200 gold** (boss1) | Moved off Sp (competed with L3 meter 600) · ~45–55 min L3 gold |
| hunter_power | 20m | gold | 100 | **250** | Early company branch |
| hunter_damage | 22m | gold | 140 | **300** | |
| hunter_atk_speed | 24m | gold | 160 | **320** | |
| hunter_swift_step | 18m | gold | 120 | **160** | |
| hunter_pace | 25m | gold | 220 | **360** | |
| briar_blade | 20m | gold | 150 | **250** | |
| briar_strength | 22m | gold | 180 | **300** | |
| quill_focus | 90m (w/ hire) | gold | 180 | **450** (boss1) | Post-hire sink after cheaper Quill |
| quill_cadence | 90m (w/ hire) | gold | 200 | **480** (boss1) | Post-hire sink |
| quill_arrow_speed | 90m (w/ hire) | gold | 190 | **450** (boss1) | Post-hire sink |
| quill_multishot | 100m | points | 320 | **400** (boss1) | Soften vs L2 boss meter |

`forge_cinder` / other mat crafts had no standalone time UI lock in practice after this pass (mats only).

## Code changes

- Removed every `minPlayMs` from `js/data.js` upgrades + `progressionMaps`.
- `playGateOk()` always `{ ok: true }` (saves that already own nodes stay owned via `state.upgrades` levels).
- Progress UI: no ⏱ / “unlocks in X min”; buttons show cost and enable when affordable.
- Intro copy no longer mentions waived time gates.
- Footer: `build gates1`.

## Save migration

No schema bump. Existing `state.upgrades[id] >= 1` remains authoritative. `playMs` still ticks (intro experienced-save heuristics, prestige keep) but never gates purchases.


## boss1 hire retune (2026-09-24)

Designer (`elder-thornpelt-tuning.md`): Quill 3650g / Moss 4850 Sp / Ember 12200 Sp were far too high; Slayer-point hires competed with boss meters (120 / 280 / 600).

**Policy:** all company hires in **gold** (Briar already was). Price ≈ mid-game earn for ~25–55 focused minutes at that stage — roughly 1–2 boss-meters of *pressure* without draining Sp.

| Hire | Was | Now | Notes |
|---|---:|---:|---|
| Quill | 3650 gold | **900 gold** | After Briar / mid L1 |
| Moss | 4850 points | **2000 gold** | After Quill / L2 |
| Ember | 12200 points | **4200 gold** | After Moss / L3 |
| Quill Focus/Cadence/Arrow | 800–850g | **450–480g** | Post-hire sinks |
| Quill Multishot | 900 Sp | **400 Sp** | Less Sp vs L2 meter |
