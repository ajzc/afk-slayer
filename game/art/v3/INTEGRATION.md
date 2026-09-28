# Hunt Option C (v3) — integration notes

Low-poly **pre-rendered** sprites. Display with **smooth** scaling (LANCZOS / CSS default) — do **not** use `image-rendering: pixelated`.

## Assets (`art/v3/sprites/`)

| File | Canvas | Frames | Suggested fps |
|---|---|---|---|
| `player_idle.png` | 160×192 | 8 | 6–8 (relentless bob) |
| `player_attack.png` | 160×192 | 6 | 10–12 |
| `briar_idle.png` | 160×192 | 8 | 6–8 |
| `briar_walk.png` | 160×192 | 8 | 8–10 |
| `briar_attack.png` | 160×192 | 6 | 10–12 |
| `quill_idle.png` | 160×192 | 8 | 6–8 |
| `quill_shoot.png` | 160×192 | 6 | 10–12 |
| `quill_turret.png` | 160×128 | 1 | — |
| `crawling_hands_idle.png` | 160×192 | 8 | 6–8 |
| `crawling_hands_attack.png` | 160×192 | 6 | 10–12 |
| `arrow.png` | 128×48 | 1 | — |
| `bolt.png` | 96×48 | 1 | — |

Anchor: bottom-center. Face right; flip with `scaleX(-1)`. Phone display height **~64–80px** (scale ≈ 0.35–0.45).

## Wiring (existing Hunt DOM)

Replace CSS figure markup from `hunterFigHtml` / `mobFigHtml` / player `.fig` with `<img>` or `background-image` strips. Keep `%` positioning on `.drone` / `.mob`.

- Briar: `.drone.idle` → idle; `.drone.walking` → walk; `.drone.swinging` → attack
- Quill: idle / firing → shoot; place `quill_turret.png` in `.drone-stand`
- Crawler mob (`visual: crawler`): idle / walk-in / attack; dying can reuse attack or later die strip
- `.proj.player-bolt` → `bolt.png`; `.proj.arrow` → `arrow.png`
- Hit sparkles + floating damage numbers: **engine VFX only** (see `preview_phone.png`) — not in character PNGs

## Still CSS until sprites exist

Moss, Ember, non-crawler Undercroft mobs, Fenwatch / Bonevault / Ash Warrens casts.

## CSS sketch

```css
.spr-v3 {
  width: 160px; height: 192px;
  background-repeat: no-repeat;
  transform-origin: 50% 100%;
  /* parent scales to ~70px tall: transform: scale(0.4); */
}
.spr-v3-briar-idle {
  background-image: url("../art/v3/sprites/briar_idle.png");
  animation: spr8 1.0s steps(8) infinite;
}
.spr-v3-briar-walk {
  background-image: url("../art/v3/sprites/briar_walk.png");
  animation: spr8 0.7s steps(8) infinite;
}
@keyframes spr8 {
  from { background-position: 0 0; }
  to   { background-position: -1280px 0; } /* 8×160 */
}
@keyframes spr6 {
  from { background-position: 0 0; }
  to   { background-position: -960px 0; } /* 6×160 */
}
```

## Regenerate

```bash
blender -b -P art/v3/src/render_all.py
/workspace/.venv-art/bin/python art/v3/src/compose.py
```
