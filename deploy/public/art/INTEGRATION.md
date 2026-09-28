# Hunt sprite integration notes

Pilot pack is ready under `art/sprites/`. **Do not apply until Alex asks** — this doc only.

## Asset table

| File | Frame size | Frames | Suggested fps | Notes |
|---|---|---|---|---|
| `player_idle.png` | 32×48 | 4 | 4–6 | Subtle breathe |
| `player_attack.png` | 32×48 | 4 | 10–12 | windup → cast → release → recover |
| `briar_idle.png` | 32×48 | 4 | 4–6 | |
| `briar_walk.png` | 32×48 | 4 | 8–10 | Loop while `.drone.walking` |
| `briar_attack.png` | 32×48 | 4 | 10–12 | Short swing; play once on `.drone.swinging` |
| `quill_idle.png` | 32×48 | 4 | 4–6 | Stationary |
| `quill_shoot.png` | 32×48 | 4 | 10–12 | draw → full → release → recover |
| `quill_turret.png` | 32×24 | 1 | — | Static; Quill feet sit on top edge |
| `crawling_hands_idle.png` | 32×48 | 4 | 5–6 | Content bottom-aligned (~32×24) |
| `crawling_hands_walk.png` | 32×48 | 4 | 8–10 | |
| `crawling_hands_die.png` | 32×48 | 4 | 8–10 | Play once on `.mob.dying` |
| `arrow.png` | 24×8 | 1 | — | Quill projectile |
| `bolt.png` | 16×8 | 1 | — | Player bolt |

All character strips: **horizontal**, no gaps, face **right**. Anchor: **bottom-center** (`transform-origin: 50% 100%`). Display scale: **2×** with `image-rendering: pixelated` (optional 3× on large phones). Facing left: `transform: scaleX(-1)` via existing `--face`.

## Still on old CSS figures

Until sprites exist, keep `hunterFigHtml` / `mobFigHtml` CSS parts for:

- Hunters: **Moss**, **Ember**
- Undercroft: **Banshees** (`spectre`), **Infernal Mages** (`mage`), Area Boss
- Fenwatch / Bonevault / Ash Warrens: all mobs (`swirl`, `gargoyle`, `aberrant`, `beast`, `boneguard`, `imp`, `demon`)

Pilot swap targets only: **Player**, **Briar**, **Quill** (+ turret), **Crawling Hands** (`visual: crawler`), **arrow**, **bolt**.

## Wiring map (existing code)

| Current | Swap to |
|---|---|
| `hunterFigHtml` → `.fig.fig-hunter` | `<div class="spr spr-briar-idle">` (class by hunter id + state) |
| Player inline `.fig.fig-hunter.fig-player` in `buildShell` | `.spr.spr-player-idle` / `-attack` when `.player-avatar.firing` |
| `mobFigHtml('crawler')` → `.fig.fig-mob-crawler` | `.spr.spr-crawler-idle` / `-walk` / `-die` |
| `.drone-stand` / `.ds-plinth` / `.ds-post` | `<img class="quill-turret" src="art/sprites/quill_turret.png">` under Quill |
| `.proj.player-bolt` CSS gradient | `background-image: url(art/sprites/bolt.png)` |
| `.proj.arrow` CSS gradient | `background-image: url(art/sprites/arrow.png)` |

Keep `%` positioning, `.drone-scale` / `.mob` scale (consider bumping toward 1.0 once 2× sprites land — today's `0.864` was for tiny CSS figs).

## Ready-to-paste CSS

```css
/* --- Contract Board pilot sprites --- */
.spr {
  width: 32px;
  height: 48px;
  background-repeat: no-repeat;
  background-position: 0 0;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  transform-origin: 50% 100%;
  /* display at 2× via parent scale or: */
  /* transform: scale(2); — prefer scaling parent .drone-scale / .mob-body */
}
.spr-player-idle {
  background-image: url("../art/sprites/player_idle.png");
  animation: spr-strip-4 0.8s steps(4) infinite;
}
.spr-player-attack {
  background-image: url("../art/sprites/player_attack.png");
  animation: spr-strip-4 0.35s steps(4) forwards;
}
.spr-briar-idle {
  background-image: url("../art/sprites/briar_idle.png");
  animation: spr-strip-4 0.8s steps(4) infinite;
}
.spr-briar-walk {
  background-image: url("../art/sprites/briar_walk.png");
  animation: spr-strip-4 0.45s steps(4) infinite;
}
.spr-briar-attack {
  background-image: url("../art/sprites/briar_attack.png");
  animation: spr-strip-4 0.35s steps(4) forwards;
}
.spr-quill-idle {
  background-image: url("../art/sprites/quill_idle.png");
  animation: spr-strip-4 0.8s steps(4) infinite;
}
.spr-quill-shoot {
  background-image: url("../art/sprites/quill_shoot.png");
  animation: spr-strip-4 0.4s steps(4) forwards;
}
.spr-crawler-idle {
  background-image: url("../art/sprites/crawling_hands_idle.png");
  animation: spr-strip-4 0.7s steps(4) infinite;
}
.spr-crawler-walk {
  background-image: url("../art/sprites/crawling_hands_walk.png");
  animation: spr-strip-4 0.45s steps(4) infinite;
}
.spr-crawler-die {
  background-image: url("../art/sprites/crawling_hands_die.png");
  animation: spr-strip-4 0.4s steps(4) forwards;
}
@keyframes spr-strip-4 {
  from { background-position: 0 0; }
  to   { background-position: -128px 0; } /* 4 × 32 */
}

.quill-turret {
  display: block;
  width: 32px;
  height: 24px;
  image-rendering: pixelated;
  margin: 0 auto;
  /* Place so top edge meets Quill feet (sprite row ~45–46) */
}

/* Projectiles — replace fills */
.proj.player-bolt {
  width: 16px;
  height: 8px;
  margin-left: -8px;
  margin-top: -4px;
  background: url("../art/sprites/bolt.png") center / contain no-repeat;
  background-color: transparent;
  border: none;
  box-shadow: none;
  image-rendering: pixelated;
}
.proj.arrow {
  width: 24px;
  height: 8px;
  margin-left: -12px;
  margin-top: -4px;
  background: url("../art/sprites/arrow.png") center / contain no-repeat;
  background-color: transparent;
  border: none;
  box-shadow: 0 0 3px rgba(0, 160, 60, 0.25);
  clip-path: none; /* kill old CSS arrow polygon */
  image-rendering: pixelated;
}
.proj.arrow::before,
.proj.arrow::after { content: none; display: none; }
```

### State class hooks (arena.js)

- Briar: `.drone.idle` → `spr-briar-idle`; `.drone.walking` → `spr-briar-walk`; `.drone.swinging` → `spr-briar-attack`
- Quill: `.drone.idle` → `spr-quill-idle`; `.drone.firing` → `spr-quill-shoot`
- Player: `#player-avatar.firing` → swap idle→attack strip
- Mob: `.mob.walking-in` / moving → walk; `.mob.alive` idle; `.mob.dying` → die strip then remove

Paths above assume CSS at `css/styles.css` (`url("../art/sprites/...")`). Adjust if inlined elsewhere.

## Preview references

- `art/preview_pilot.png` — all strips at 3× NN on `#141820`
- `art/preview_phone.png` — cast at 2× on 390px-wide mock arena
