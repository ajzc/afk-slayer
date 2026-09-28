# AFK Slayer — Level 2 Ashfang wolf family (integration)

**Locked look:** `art/v3/target/option_c_locked.png` (Option C).
**Status:** LIVE Level 2 ladder art; original-IP Ashfang names.
**Paths:** strips in `art/v3b/anim/sprites/`; cutouts/concepts/previews in `art/v3b/creatures/wolves/`.

## Silhouette language

Cool ash-grey, faceted low-poly wolves with lean forward-facing mammal silhouettes, pointed ears, snouts, spikes and soft oval cool-black floor shadows.
Burnt-orange ear-tip accents are retained; Ashfang Alpha adds ember eyes and mane fringe. No neon-green matte or square floor is baked in.
Frame height is **156**; scale lock is relative to the measured Bristle Cub pilot (~72px visual content), not relative to the boss.

## Scale ladder

| Id | Role | Relative to Bristle Cub | displayLevel | Strips | Content h |
|---|---|---:|---:|---|---:|
| `ashfang_pup` | A · pup | 0.85× | 22 | idle / walk / attack (6) | 65 |
| `ashfang_wolf` | B · adult | 1.15× | 42 | idle / walk / attack (6) | 88 |
| `dire_ashfang` | C · elite | 1.35× | 58 | idle / walk / attack (6) | 102 |
| `ashfang_alpha` | Boss | 1.70× | 69 | idle / attack (6) — no walk | 127 |

## Frame table

| File | Frames | Frame size (w×h) | Content h |
|---|---:|---|---:|
| `anim/sprites/ashfang_pup_idle.png` | 6 | 112×156 | 65 |
| `anim/sprites/ashfang_pup_walk.png` | 6 | 112×156 | 65 |
| `anim/sprites/ashfang_pup_attack.png` | 6 | 112×156 | 66 |
| `anim/sprites/ashfang_wolf_idle.png` | 6 | 148×156 | 88 |
| `anim/sprites/ashfang_wolf_walk.png` | 6 | 148×156 | 88 |
| `anim/sprites/ashfang_wolf_attack.png` | 6 | 148×156 | 88 |
| `anim/sprites/dire_ashfang_idle.png` | 6 | 174×156 | 102 |
| `anim/sprites/dire_ashfang_walk.png` | 6 | 174×156 | 102 |
| `anim/sprites/dire_ashfang_attack.png` | 6 | 174×156 | 102 |
| `anim/sprites/ashfang_alpha_idle.png` | 6 | 220×156 | 127 |
| `anim/sprites/ashfang_alpha_attack.png` | 6 | 220×156 | 127 |

## New Bot wiring notes

1. Map visual ids directly: `ashfang_pup_*`, `ashfang_wolf_*`, `dire_ashfang_*`, and `ashfang_alpha_*`.
2. `displayLevel` values are 22 / 42 / 58 / 69 in that order; boss is `ashfang_alpha`.
3. Select idle, walk, or attack strips by action. The boss intentionally has no walk strip.
4. Use transparent PNGs directly; do not place a solid CSS background behind a sprite.
5. Keep player/companion pilot art and all other level systems wiring unchanged; this deliverable is art-only.
6. Preserve these original-IP Ashfang identifiers and do not substitute archived creature names.

## QA and regeneration

`lineup_preview.png` shows A/B/C/boss on checkerboard; `strips_qa_preview.png` shows all six-frame strips.
`_qa_summary.txt` records exact strip dimensions, corner alpha, opaque-region mean alpha, content heights, and residual green checks.

```bash
/workspace/.venv-art/bin/python art/v3b/creatures/wolves/build_wolves.py
```

The source sheets were split by the four largest connected non-green blobs ordered left-to-right. Border-connected lime and #00b140-ish chroma plus green-dominant fringe were removed; yellow/gold eyes, claws and accents were protected.
