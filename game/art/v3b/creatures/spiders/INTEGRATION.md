# AFK Slayer — Level 3 spider family (integration)

**Locked look:** `art/v3/target/option_c_locked.png` (Option C).
**Status:** LIVE Level 3 ladder art; original-IP spider names.
**Paths:** strips in `art/v3b/anim/sprites/`; cutouts/concepts/previews in `art/v3b/creatures/spiders/`.

## Silhouette language

Low-wide arthropods: bodies stay close to the floor with long, splayed legs and broad horizontal reads. Do not stretch these into upright mammals.
Silkling is pale silk white/cream; Webfen Widow is violet-grey; Brood Matron is broad and darker violet with an egg-sack hint; Nightweave is the near-black violet-web apex boss.
Each render has transparent corners, no green matte/fringe, and a soft cool-black oval floor shadow. Frame height is **156**; scale is relative to Bristle Cub content (~72px).

## Scale ladder

| Id | Role | Relative to Bristle Cub | displayLevel | Strips | Content h |
|---|---|---:|---:|---|---:|
| `silkling` | A · Silkling | 0.70× | 180 | idle / walk / attack (6) | 49 |
| `webfen_widow` | B · Webfen Widow | 1.10× | 420 | idle / walk / attack (6) | 79 |
| `brood_matron` | C · Brood Matron | 1.40× | 600 | idle / walk / attack (6) | 101 |
| `nightweave` | Boss · Nightweave | 1.85× | 720 | idle / attack (6) | 133 |

## Frame table

| File | Frames | Frame size (w×h) | Content h |
|---|---:|---|---:|
| `anim/sprites/silkling_idle.png` | 6 | 130×156 | 49 |
| `anim/sprites/silkling_walk.png` | 6 | 130×156 | 50 |
| `anim/sprites/silkling_attack.png` | 6 | 130×156 | 50 |
| `anim/sprites/webfen_widow_idle.png` | 6 | 170×156 | 79 |
| `anim/sprites/webfen_widow_walk.png` | 6 | 170×156 | 79 |
| `anim/sprites/webfen_widow_attack.png` | 6 | 170×156 | 79 |
| `anim/sprites/brood_matron_idle.png` | 6 | 210×156 | 101 |
| `anim/sprites/brood_matron_walk.png` | 6 | 210×156 | 101 |
| `anim/sprites/brood_matron_attack.png` | 6 | 210×156 | 101 |
| `anim/sprites/nightweave_idle.png` | 6 | 260×156 | 133 |
| `anim/sprites/nightweave_attack.png` | 6 | 260×156 | 133 |

## New Bot wiring notes

1. Map visual ids directly: `silkling_*`, `webfen_widow_*`, `brood_matron_*`, and `nightweave_*`.
2. `displayLevel` values are 180 / 420 / 600 / 720 in that order; `nightweave` is the boss.
3. Select idle, walk, or attack strips by action. Nightweave intentionally has idle + attack only; there is no walk strip.
4. Use transparent PNGs directly; do not place a solid CSS background behind a sprite.
5. Preserve these original-IP names and identifiers. Do not substitute Jagex or archived creature names.
6. Keep player/companion pilot art and all other level systems wiring unchanged; this deliverable is art-only.

## QA and regeneration

`lineup_preview.png` shows the low-wide A/B/C/boss lineup on checkerboard; `strips_qa_preview.png` shows all six-frame strips.
`_qa_summary.txt` records exact strip dimensions, per-frame corner alpha, content heights, and residual green checks.

```bash
/workspace/.venv-art/bin/python art/v3b/creatures/spiders/build_spiders.py
```

The source sheets were split by the four largest connected non-green blobs ordered left-to-right. Border-connected lime and #00b140-ish chroma plus green-dominant fringe were removed while violet, cream and purple body colors were protected.
