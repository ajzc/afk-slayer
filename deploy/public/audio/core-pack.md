# AFK Slayer (working dir: contract-board) — Core Pack Cue Sheet

Await Alex lock on style before generating audio files. Do not wire JS from this doc.

Original IP only. OSRS-*flavored* energy — no Jagex samples or trademarked filenames.

Full mix rules: `AUDIO_BIBLE.md`. Detail sheet also at `CUE_SHEET.md`.

## Style options (pick one)

| Option | Feel | Best for |
|---|---|---|
| **A — Dry stone / metal scrap** (recommended) | Cool slate grit, short scrap/metal bolts, wood Quill, crisp deaths. Phone-clear, low fatigue. | Undercroft pilot + long AFK |
| **B — Soft magic pad** | Warmer pad under hits; softer AFK bed with violet sheen. Cozier, less “scrap yard.” | If Hunt should feel more mage-guild than dungeon |

**Recommendation: A.** Matches art bible (cool slate / gold) and Undercroft scrap/wail/ember roadmap. Magic tip stays as a short dry sparkle on player bolt + rare drop only.

## Cues to generate after lock

| ID | When | Max len | Rel. loudness | Material | Path (planned) | Gain |
|---|---|---|---|---|---|---|
| `bolt_fire` | Player bolt leaves avatar | 80–120 ms | Mid | Scrap zip + dry magic tip | `sfx/bolt_fire_{a,b,c}.ogg` | 0.55 |
| `bolt_hit` | Real HP chip splat | 100–160 ms | High | Flesh/stone thud + spark | `sfx/bolt_hit_{a,b,c}.ogg` | 0.75 |
| `briar_swing` | Briar melee attack | 140–220 ms | Mid-high | Whoosh → metal bite | `sfx/briar_swing.ogg` | 0.65 |
| `quill_arrow_fire` | Quill fires | 80–120 ms | Mid-low | Wood string | `sfx/quill_arrow_fire.ogg` | 0.5 |
| `quill_arrow_hit` | Quill arrow chip | 100–150 ms | Mid | Dry pierce thunk | `sfx/quill_arrow_hit.ogg` | 0.7 |
| `mob_death` | Arena monster dies | 180–280 ms | High | Crisp collapse/dust | `sfx/mob_death_{a,b}.ogg` | 0.85 |
| `task_complete` | Contract quota done | 350–450 ms | High | Metal + soft 2-note gold | `sfx/task_complete.ogg` | 0.9 |
| `monster_unlock` | New monster unlocked | 300–400 ms | Mid-high | Stone reveal + tick | `sfx/monster_unlock.ogg` | 0.85 |
| `signature_drop` | Signature / rare mat | 400–500 ms | High | Dry magic shimmer | `sfx/signature_drop.ogg` | 0.9 |
| `chest_open` | Relic or Loot casket open | 280–380 ms | High | Latch → soft contents | `sfx/chest_open.ogg` | 0.85 |
| `upgrade_purchase` | Progress node bought | 200–280 ms | Mid | Coin/metal confirm | `sfx/upgrade_purchase.ogg` | 0.75 |
| `empty_task_nudge` | Empty contract dock pulse | 120–180 ms | Very low | Soft wood knock; cooldown ≥8 s | `ui/empty_task_nudge.ogg` | 0.25 |
| `afk_bed` | Hunt ambient loop | ≤8 s seamless | Very low | A: dry stone+scrap · B: soft magic pad | `loops/afk_bed.ogg` | 0.2 |

Also in bible (optional / UI): `tab_switch`, `intro_step_complete` (replace oscillator), optional `afk_accent`.

## Anti-spam (must ship with pack)

- `bolt_fire`: pool 3; ≥45 ms between plays; drop first if voice budget full
- Max simultaneous SFX: 6
- Casket **jiggle**, kill-coin floats, soft/spark hits: **silent**

## Out of scope

Game JS/CSS wiring, area flavor beds, Moss/Ember SFX, VO, licensed music.
