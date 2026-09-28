# AFK Slayer — World 1 Turael creatures (integration)

**Locked look:** `design/iom-style-redesign.md` (Phase 1 approved 2026-09-24).
**Status:** LIVE Level 1 ladder art replacing bear placeholders; stand-in ids only in filenames.
**Paths:** strips in `art/v3b/anim/sprites/`; cutouts/concepts/previews in `art/v3b/creatures/turael_w1/`.

## Id mapping

| New id | Replaces placeholder | Private display name | Stand-in public name |
|---|---|---|---|
| `gripkin` | `bristle_cub` | Crawling Hand | Gripkin |
| `cave_skitter` | `thornpelt_bear` | Cave Crawler | Cave Skitter |
| `wailshade` | `dire_thornpelt` | Banshee | Wailshade |
| `gripkin_elder` | `elder_thornpelt` | Crawling Hand Champion | Gripkin Elder |

**Public release uses the stand-in names** (Gripkin / Cave Skitter / Wailshade / Gripkin Elder).
Private-playtest OSRS-style names must never appear in art filenames or game ids.

## Silhouette language

Cool grey-blue faceted stone creatures (Gripkin family + Cave Skitter) and a pale blue-grey floating robe ghost (Wailshade).
Gold runes, clasps, crawler trim, amber crystal spikes and leg bands are protected through chroma key.
Soft cool-black oval floor shadows; Wailshade hovers with a ~8px gap above its shadow.
Frame height is **156**; framing matches measured bear strips (bottom-aligned baseline).

## Scale / framing (matched to bear set)

| Id | Role | Bear frame match | displayLevel | Strips | Target content h |
|---|---|---|---:|---|---:|
| `gripkin` | A · small | bristle_cub 115×156 | 8 | idle / walk / attack (6) | 72 |
| `cave_skitter` | B · adult | thornpelt_bear 119×156 → **widened** | 18 | idle / walk / attack (6) | 100 |
| `wailshade` | C · elite | dire_thornpelt 142×156 | 26 | idle / walk / attack (6) | 124 |
| `gripkin_elder` | Boss | elder_thornpelt 170×156 | 30 | idle / attack (6) — no walk | 148 |

### Frame width deviation

`cave_skitter` uses **frame_w=154** (not bear `thornpelt_bear` 119).
It is a wide, low crawler; fitting target content_h ~100 inside 119px would crush the silhouette.
frame_h stays 156; bottom baseline matches bears.

## Frame table

| File | Frames | Frame size (w×h) | Content h |
|---|---:|---|---:|
| `anim/sprites/gripkin_idle.png` | 6 | 115×156 | 72 |
| `anim/sprites/gripkin_walk.png` | 6 | 115×156 | 72 |
| `anim/sprites/gripkin_attack.png` | 6 | 115×156 | 72 |
| `anim/sprites/cave_skitter_idle.png` | 6 | 154×156 | 100 |
| `anim/sprites/cave_skitter_walk.png` | 6 | 154×156 | 100 |
| `anim/sprites/cave_skitter_attack.png` | 6 | 154×156 | 100 |
| `anim/sprites/wailshade_idle.png` | 6 | 142×156 | 124 |
| `anim/sprites/wailshade_walk.png` | 6 | 142×156 | 124 |
| `anim/sprites/wailshade_attack.png` | 6 | 142×156 | 124 |
| `anim/sprites/gripkin_elder_idle.png` | 6 | 170×156 | 148 |
| `anim/sprites/gripkin_elder_attack.png` | 6 | 170×156 | 148 |

## New Bot wiring notes

1. Swap META / visual ids from bear placeholders to these stand-in ids:
   - `bristle_cub_*` → `gripkin_*`
   - `thornpelt_bear_*` → `cave_skitter_*`
   - `dire_thornpelt_*` → `wailshade_*`
   - `elder_thornpelt_*` → `gripkin_elder_*`
2. Use transparent PNGs directly; do **not** place a solid CSS background-color behind a sprite.
3. Select idle / walk / attack by action. **Boss `gripkin_elder` has no walk strip** (same as `elder_thornpelt`).
4. `displayLevel` values stay 8 / 18 / 26 / 30 (same ladder as the bear placeholders).
5. Keep player / companion pilot art and wolf / spider / bear source files unchanged; this deliverable is art-only under `creatures/turael_w1/` + new strips in `anim/sprites/`.
6. Public-facing copy must use stand-in names; private OSRS names are playtest-only.

## Previews

- `lineup_preview.png` — A/B/C/boss on checkerboard (file id + private name)
- `strips_qa_preview.png` — all six-frame strips
- `arena_sit_preview.png` — idle frame 0 on tiled `env/floor_tile.png`
- `{id}_concept.png` + `cutouts/{id}.png` — idle frame with oval shadow

## QA and regeneration

`_qa_summary.txt` records strip size, frame size, content_h, corner alpha, residual green, and `issues=CLEAN` when all pass.

```bash
/workspace/.venv-art/bin/python art/v3b/creatures/turael_w1/build_turael_w1.py
```

Source sheets (`_gen/w1_{idle,walk,attack}_gs.png`) are split by the four largest connected non-green blobs ordered left-to-right.
Border-connected lime / #00b140-ish chroma and green-dominant fringe are removed; gold accents and pale robe/eyes are protected; mild green edge spill is desaturated.
