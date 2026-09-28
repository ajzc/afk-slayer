# AFK Slayer — Level 1 Bear family (integration)

**Locked look:** `art/v3/target/option_c_locked.png` (Option C)
**Status:** LIVE ladder for Level 1 hunt (replaces Undercroft hands/spectres/mages as active targets).
**Path:** `art/v3b/anim/sprites/` (strips) · concepts `art/v3b/creatures/bears/`

## Silhouette language

Original IP thorned / bristled brown-grey bears (painterly faceted low-poly).
Soft oval floor shadows baked in. Gold tip accents on dire/elder thorns — not neon.
Readable ~48–72px tall on phone. `frame_h` = **156** (matches pilot strips).

## Scale ladder (boss = 100%)

| Id | Role | Scale | displayLevel | Strips |
|---|---|---:|---:|---|
| `bristle_cub` | A · cub | ~55% | 8 | idle / walk / attack (6) |
| `thornpelt_bear` | B · adult | ~75% | 18 | idle / walk / attack (6) |
| `dire_thornpelt` | C · elite | ~90% | 26 | idle / walk / attack (6) |
| `elder_thornpelt` | Boss | 100% | 30 | idle / attack (6) — no walk |

## Frame table

| File | Frames | Frame size (w×h) | Content h | Notes |
|---|---:|---|---:|---|
| `sprites/bristle_cub_idle.png` | 6 | 119×156 | 72 | transparent RGBA |
| `sprites/bristle_cub_walk.png` | 6 | 119×156 | 72 | transparent RGBA |
| `sprites/bristle_cub_attack.png` | 6 | 119×156 | 72 | transparent RGBA |
| `sprites/thornpelt_bear_idle.png` | 6 | 121×156 | 100 | transparent RGBA |
| `sprites/thornpelt_bear_walk.png` | 6 | 121×156 | 100 | transparent RGBA |
| `sprites/thornpelt_bear_attack.png` | 6 | 121×156 | 100 | transparent RGBA |
| `sprites/dire_thornpelt_idle.png` | 6 | 142×156 | 124 | transparent RGBA |
| `sprites/dire_thornpelt_walk.png` | 6 | 142×156 | 124 | transparent RGBA |
| `sprites/dire_thornpelt_attack.png` | 6 | 142×156 | 124 | transparent RGBA |
| `sprites/elder_thornpelt_idle.png` | 6 | 170×156 | 148 | transparent RGBA |
| `sprites/elder_thornpelt_attack.png` | 6 | 170×156 | 148 | transparent RGBA |

Display ~70–90px for adult; scale cub/dire/boss from content_h ratios. Soft shadows baked.

## New Bot wiring notes

1. Map contracts / visual ids:
   - Bristle Cub → `bristle_cub_*`
   - Thornpelt Bear → `thornpelt_bear_*`
   - Dire Thornpelt → `dire_thornpelt_*`
   - Elder Thornpelt (boss fight) → `elder_thornpelt_*`
2. Do **not** use archived Undercroft ladder sprites (`spectre_*`, `undercroft_mage_*`, `undercroft_overseer_*`, `crawling_hands_*`) for Level 1–3 hunt.
3. Player / Briar / Quill pilot strips stay live unchanged.
4. CSS: no solid `background-color` behind sprite; use transparent PNG only.
5. Level chrome chips: `art/v3b/ui/level_badge_{1,2,3}.png` — text exactly `Level N`.
6. Boss access via Slayer points → Fight boss (see `design/level-boss-progression.md`).

## Previews

- `creatures/bears/lineup_preview.png` — A/B/C/boss scale on checkerboard
- `ui/level_badges_preview.png` — Level chips QA
- Per-tier concepts under `creatures/bears/` and `_gen/`

## Art method

Flat chroma green (#00b140) paint → border flood-fill chroma key → soft oval shadow → strips.
Strips rebuilt from GenerateImage Option C greenscreen lineup (parent polish pass). Motion still bob/lean transforms — articulated attack poses can come later.

## Regen

```bash
/workspace/.venv-art/bin/python art/v3b/creatures/bears/build_bears_and_badges.py
```
