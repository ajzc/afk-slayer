# AFK Slayer — Gold Coin Icons (v3b)

Original procedural pixel art. Built by `build_gold.py` (PIL/numpy).
**Do not** replace with Jagex/OSRS ripped sprites.

## Palette (locked)

| Role | Hex | RGBA |
|------|-----|------|
| Outline | `#2A1A05` | `42,26,5,255` |
| Deep shadow | `#7A4A0A` | `122,74,10,255` |
| Mid gold | `#C8901A` | `200,144,26,255` |
| Base gold | `#F0C020` | `240,192,32,255` |
| Light | `#FFE060` | `255,224,96,255` |
| Rim highlight | `#FFF6B0` | `255,246,176,255` |

Flat 2–3 tone shading, 1px dark outline, warm yellow-gold. No antialiasing / no blur. Alpha is strictly 0 or 255.

## File list

### Build
- `build_gold.py` — re-runnable generator
- `INTEGRATION.md` — this file
- `_qa_summary.txt` — QA log
- `gold_preview.png` — review sheet

### Stack icons (9 amounts × 4 sizes)

For each `N` in `1, 2, 3, 4, 5, 25, 100, 250, 1000`:

- `coins_{N}_32.png` — **native HUD** (32×32)
- `coins_{N}_16.png` — inline (hand-simplified redraw)
- `coins_{N}_20.png` — inline (cleanup downsample from 32)
- `coins_{N}_64.png` — retina / 2× (nearest from 32)

### Kill-coin float
- `coin_pop_16.png` — horizontal strip, **8 frames × 16×16** (strip 128×16)
- `coin_pop_32.png` — 2× strip, **8 frames × 32×32** (strip 256×32)
- `coin_pop_16_f0.png` … `coin_pop_16_f7.png` — individual frames (optional)

## Amount → icon mapping

| Amount range | Icon key |
|--------------|----------|
| 1 | `coins_1` |
| 2 | `coins_2` |
| 3 | `coins_3` |
| 4 | `coins_4` |
| 5 – 24 | `coins_5` |
| 25 – 99 | `coins_25` |
| 100 – 249 | `coins_100` |
| 250 – 999 | `coins_250` |
| 1000+ | `coins_1000` |

```js
function goldIconKey(amount) {
  const n = Math.max(0, Math.floor(amount));
  if (n <= 1) return 'coins_1';
  if (n === 2) return 'coins_2';
  if (n === 3) return 'coins_3';
  if (n === 4) return 'coins_4';
  if (n < 25) return 'coins_5';
  if (n < 100) return 'coins_25';
  if (n < 250) return 'coins_100';
  if (n < 1000) return 'coins_250';
  return 'coins_1000';
}
```

## Which size where

| Context | Size | File suffix |
|---------|------|-------------|
| HUD / inventory slot | 32px native | `_32` |
| Dense inline lists / chat | 16px | `_16` |
| Slightly larger inline / tooltips | 20px | `_20` |
| Retina / crisp zoom | 64px (2× of 32) | `_64` |

CSS (keep pixels chunky):

```css
.gold-icon {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  -ms-interpolation-mode: nearest-neighbor;
}
```

## coin_pop (kill float)

| Property | Value |
|----------|-------|
| Frame size | **16×16** (also 32×32 2× strip) |
| Frame count | **8** |
| Strip layout | Horizontal, left → right = frame 0…7 |
| Strip dims | 128×16 (`coin_pop_16.png`), 256×32 (`coin_pop_32.png`) |
| Suggested FPS | **10–12 fps** (play-once on kill ≈ 0.67–0.8s) |
| Motion | Ellipse width narrows (edge-on) and opens (face-on); sparkle on pop frames |

```js
// draw frame i from strip
const FRAME = 16, COUNT = 8;
ctx.imageSmoothingEnabled = false;
ctx.drawImage(strip, i * FRAME, 0, FRAME, FRAME, dx, dy, FRAME, FRAME);
```

## Number text color (OSRS-style convention)

| Amount | Display | Color |
|--------|---------|-------|
| `< 100_000` | raw number (e.g. `47`, `1,250`) | yellow `#FFFF00` |
| `100_000` – `9_999_999` | `floor(n/1000) + 'K'` (e.g. `380K`) | white `#FFFFFF` |
| `≥ 10_000_000` | `floor(n/1e6) + 'M'` (e.g. `12M`) | green `#00FF80` |

Treatment: **bold pixel font**, **1px black `#000000` drop shadow** at offset `(+1, +1)`. No outline blur.

### Suggested font
- **Press Start 2P** or **Silkscreen** (Google Fonts, free)
- Disable font smoothing; keep pixelated rendering

```html
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
```

```css
.gold-amount {
  font-family: 'Press Start 2P', 'Silkscreen', monospace;
  font-size: 12px;
  color: #FFFF00;           /* override per tier */
  text-shadow: 1px 1px 0 #000000;
  -webkit-font-smoothing: none;
  font-smooth: never;
  image-rendering: pixelated;
}
.gold-amount.tier-k { color: #FFFFFF; }
.gold-amount.tier-m { color: #00FF80; }
```

### JS formatter (reference only)

```js
function formatGold(n) {
  n = Math.floor(Math.max(0, n));
  if (n < 100000) {
    return { text: n.toLocaleString('en-US'), color: '#FFFF00', tier: 'raw' };
  }
  if (n < 10000000) {
    return { text: Math.floor(n / 1000) + 'K', color: '#FFFFFF', tier: 'k' };
  }
  return { text: Math.floor(n / 1e6) + 'M', color: '#00FF80', tier: 'm' };
}
```

## Rebuild

```bash
cd /workspace/contract-board/art/v3b/ui/gold
python3 build_gold.py
```

All outputs land in this folder. Does not touch game JS or other art trees.
