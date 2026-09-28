# AFK Slayer (working dir: contract-board) — Core Cue Sheet

Wire targets for New Bot. Generate under `audio/sfx/`, `audio/ui/`, `audio/loops/`.

## P0 — Core combat

| ID | When it fires | Max len | Loudness | Style | File | Gain |
|---|---|---|---|---|---|---|
| `bolt_fire` | Player bolt leaves avatar (hold fire) | 80–120 ms | Mid | Dry metal-scrap zip + soft magic tip | `sfx/bolt_fire_{a,b,c}.ogg` | 0.55 |
| `bolt_hit` | Bolt HP chip lands (real splat) | 100–160 ms | High | Short flesh/stone thud + tiny spark | `sfx/bolt_hit_{a,b,c}.ogg` | 0.75 |
| `briar_swing` | Briar melee attack connects (or swing start if no separate hit) | 140–220 ms | Mid-high | Blade whoosh → metal bite | `sfx/briar_swing.ogg` | 0.65 |
| `quill_arrow_fire` | Quill fires arrow | 80–120 ms | Mid-low | Wood string release | `sfx/quill_arrow_fire.ogg` | 0.5 |
| `quill_arrow_hit` | Quill arrow chip | 100–150 ms | Mid | Dry pierce thunk | `sfx/quill_arrow_hit.ogg` | 0.7 |
| `mob_death` | Arena monster dies | 180–280 ms | High | Crisp collapse / dust; readable under clutter | `sfx/mob_death_{a,b}.ogg` | 0.85 |

Soft/spark cosmetic hits: **silent** (design: cosmetic only).

## P1 — Feedback / rewards

| ID | When it fires | Max len | Loudness | Style | File | Gain |
|---|---|---|---|---|---|---|
| `task_complete` | Contract quota finished (dock reward) | 350–450 ms | High | Satisfying metal + soft gold chime (2-note max) | `sfx/task_complete.ogg` | 0.9 |
| `monster_unlock` | New monster unlocked on Slayer Master / mastery | 300–400 ms | Mid-high | Stone reveal + short bright tick | `sfx/monster_unlock.ogg` | 0.85 |
| `rare_drop` | Signature / rare mat toast | 400–500 ms | High | Magic shimmer (dry), memorable | `sfx/rare_drop.ogg` | 0.9 |
| `casket_open` | Player opens ready Relic or Loot casket | 280–380 ms | High | Latch click → soft contents | `sfx/casket_open.ogg` | 0.85 |
| `upgrade_purchase` | Progress node bought | 200–280 ms | Mid | Coin/metal confirm | `sfx/upgrade_purchase.ogg` | 0.75 |

## P2 — UI

| ID | When it fires | Max len | Loudness | Style | File | Gain |
|---|---|---|---|---|---|---|
| `tab_switch` | Main tab change (Hunt / Slayer Master / …) | 40–80 ms | Very low | Soft stone tick | `ui/tab_switch.ogg` | 0.35 |
| `intro_step_complete` | Intro Tasks step Complete (replaces oscillator chime) | 200–280 ms | Mid | Clean rising confirm (less neon than current sine) | `ui/intro_step_complete.ogg` | 0.55 |
| `empty_task_nudge` | Empty contract dock pulse (subtle) | 120–180 ms | Very low | Soft wood knock; **cooldown ≥ 8 s** | `ui/empty_task_nudge.ogg` | 0.25 |

## P3 — AFK

| ID | When it fires | Max len | Loudness | Style | File | Gain |
|---|---|---|---|---|---|---|
| `afk_bed` | Hunt screen ambient while playing / AFK | ≤ 8 s seamless loop | Very low | Dry cool stone + distant scrap hush (Undercroft-safe) | `loops/afk_bed.ogg` | 0.2 |
| `afk_accent` (optional) | Rare (~45–90 s) under bed | ≤ 1.2 s | Tiny | Soft ember tick or grit; must not announce | `loops/afk_accent.ogg` | 0.15 |

## Intentionally silent

- Casket **jiggle** (~5 s ready pulse)
- Kill-coin float / multi-kill stagger VFX
- Bolt-aim tutorial hint
- Soft/spark non-HP hits
- Event ticker lines
- Rank XP (no dock)
- Food low / auto-hunting spam (already removed from UI)

## Fire-order notes for New Bot

1. Unlock AudioContext on first pointer/touch.
2. Preload P0 + `task_complete` + `tab_switch` + `intro_step_complete`.
3. Map: `arena` bolt spawn → `bolt_fire`; real chip → `bolt_hit`; death → `mob_death`; hunter attacks → Briar/Quill cues; intro `playChime` → `intro_step_complete`.
4. Enforce voice budget + bolt_fire cooldown before polish.
