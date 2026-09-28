#!/usr/bin/env python3
"""AFK Slayer Level 3 spider art builder.

Self-contained greenscreen split/cutout pipeline.  It reads the three supplied
four-up spider sheets, keys only green chroma, orders the largest subjects
left-to-right, and writes only Level 3 spider art under art/v3b.
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

ROOT = Path("/workspace/contract-board/art/v3b")
SPIDER_DIR = ROOT / "creatures" / "spiders"
GEN = SPIDER_DIR / "_gen"
CUTOUTS = SPIDER_DIR / "cutouts"
SPRITES = ROOT / "anim" / "sprites"
FRAME_H = 156
BASELINE = 146
NOMINAL_BRISTLE_H = 72
RATIOS = {
    "silkling": 0.70,
    "webfen_widow": 1.10,
    "brood_matron": 1.40,
    "nightweave": 1.85,
}
DISPLAY_LEVEL = {
    "silkling": 180,
    "webfen_widow": 420,
    "brood_matron": 600,
    "nightweave": 720,
}
# Extra width is intentional: the family is low and wide, with long legs.
FRAME_W = {
    "silkling": 130,
    "webfen_widow": 170,
    "brood_matron": 210,
    "nightweave": 260,
}
ACTIONS = {
    "silkling": ("idle", "walk", "attack"),
    "webfen_widow": ("idle", "walk", "attack"),
    "brood_matron": ("idle", "walk", "attack"),
    "nightweave": ("idle", "attack"),
}
SOURCES = {
    "idle": GEN / "spiders_idle_gs.png",
    "walk": GEN / "spiders_walk_gs.png",
    "attack": GEN / "spiders_attack_gs.png",
}

for directory in (SPIDER_DIR, CUTOUTS, SPRITES):
    directory.mkdir(parents=True, exist_ok=True)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def green_mask(rgb: np.ndarray) -> np.ndarray:
    """Key lime/#00b140 chroma while preserving violet, cream and purple."""
    r, g, b = [rgb[:, :, i].astype(np.int16) for i in range(3)]
    near_lime = (g >= 145) & (g > r + 28) & (g > b + 28)
    broad_green = (g >= 75) & (g > r + 20) & (g > b + 20)
    # Protect warm cream/gold accents and eyes; never key purple merely for hue.
    warm = (r >= 125) & (g >= 90) & (b <= g - 8) & (np.abs(r - g) <= 80)
    return (near_lime | broad_green) & ~warm


def flood_border(mask: np.ndarray) -> np.ndarray:
    labels, n = ndimage.label(mask, structure=np.ones((3, 3), dtype=np.uint8))
    if n == 0:
        return np.zeros_like(mask, dtype=bool)
    border_labels = np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
    ]))
    border_labels = border_labels[border_labels != 0]
    return np.isin(labels, border_labels)


def clean_rgba(rgb: np.ndarray, component: np.ndarray) -> Image.Image:
    """Crop one connected subject to RGBA and remove green-dominant fringe."""
    gm = green_mask(rgb)
    border_green = flood_border(gm)
    keep = component & ~gm & ~border_green
    r, g, b = [rgb[:, :, i].astype(np.int16) for i in range(3)]
    fringe = (g > r + 10) & (g > b + 10) & (g > 95)
    warm = (r >= 125) & (g >= 90) & (b <= g - 8) & (np.abs(r - g) <= 80)
    keep &= ~(fringe & ~warm)
    ys, xs = np.where(keep)
    if len(xs) == 0:
        raise RuntimeError("empty spider subject after chroma key")
    x0, x1 = max(0, int(xs.min()) - 2), min(rgb.shape[1], int(xs.max()) + 3)
    y0, y1 = max(0, int(ys.min()) - 2), min(rgb.shape[0], int(ys.max()) + 3)
    out = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    out[:, :, :3] = rgb[y0:y1, x0:x1]
    out[:, :, 3] = keep[y0:y1, x0:x1].astype(np.uint8) * 255
    return Image.fromarray(out, "RGBA")


def split_subjects(path: Path) -> List[Image.Image]:
    """Split four largest non-green subject blobs ordered from left to right."""
    rgb = np.array(Image.open(path).convert("RGB"))
    gm = green_mask(rgb)
    border_green = flood_border(gm)
    foreground = ~(gm | border_green)
    labels, n = ndimage.label(foreground, structure=np.ones((3, 3), dtype=np.uint8))
    candidates = []
    for idx in range(1, n + 1):
        ys, xs = np.where(labels == idx)
        if len(xs) >= 250:
            candidates.append((len(xs), float(xs.mean()), idx))
    if len(candidates) < 4:
        raise RuntimeError(f"{path.name}: found only {len(candidates)} subject blobs")
    chosen = sorted(candidates, reverse=True)[:4]
    chosen.sort(key=lambda item: item[1])
    return [clean_rgba(rgb, labels == idx) for _, _, idx in chosen]


def alpha_bbox(im: Image.Image) -> Tuple[int, int, int, int]:
    bbox = im.getchannel("A").getbbox()
    if bbox is None:
        raise RuntimeError("transparent image has no alpha bbox")
    return bbox


def subject_scale(im: Image.Image, target_h: int) -> Image.Image:
    crop = im.crop(alpha_bbox(im))
    factor = target_h / crop.height
    return crop.resize((max(1, round(crop.width * factor)), target_h), Image.Resampling.LANCZOS)


def lean_warp(im: Image.Image, lean: float) -> Image.Image:
    """Tiny top shear for an attack lean; keeps a low-wide spider silhouette."""
    if abs(lean) < 0.05:
        return im
    w, h = im.size
    pad = int(math.ceil(abs(lean) + 4))
    coeff = (1.0, lean / max(1, h), -lean + pad, 0.0, 1.0, 0.0)
    out = im.transform((w + 2 * pad, h), Image.Transform.AFFINE, coeff,
                       resample=Image.Resampling.BICUBIC)
    bbox = out.getchannel("A").getbbox()
    return out.crop(bbox) if bbox else im


def shadow_layer(size: Tuple[int, int], cx: float, subject_width: float) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rx = max(12.0, subject_width * 0.31)
    ry = max(2.2, subject_width * 0.055)
    cy = BASELINE + 1.0
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(10, 15, 23, 128))
    return layer.filter(ImageFilter.GaussianBlur(radius=2.2))


def scrub_green_rgba(im: Image.Image) -> Image.Image:
    """Kill any resampling-created green edge pixels without touching purples."""
    arr = np.array(im.convert("RGBA"))
    rgb = arr[:, :, :3].astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    green = (g > r + 9) & (g > b + 9) & (g > 90)
    warm = (r >= 125) & (g >= 90) & (b <= g - 8) & (np.abs(r - g) <= 80)
    arr[green & ~warm, 3] = 0
    return Image.fromarray(arr, "RGBA")


def render_frame(subject: Image.Image, tier: str, target_h: int,
                 phase: int, action: str) -> Image.Image:
    scaled = subject_scale(subject, target_h)
    if action == "idle":
        # Slight vertical bob and small lateral drift; feet remain grounded.
        bob = (0.0, -0.7, -1.0, -0.3, 0.7, 0.2)[phase]
        lateral = (0.0, 0.5, 0.8, 0.2, -0.5, -0.1)[phase]
        lean = 0.0
        stretch = (1.000, 0.996, 0.992, 1.000, 1.004, 1.000)[phase]
    elif action == "walk":
        # Walk is deliberately tiny: spiders stay low and wide rather than mammal-like.
        bob = (0.0, -0.8, -1.2, -0.2, 0.8, 0.3)[phase]
        lateral = (-2.0, -1.0, 0.5, 2.0, 1.0, -0.8)[phase]
        lean = 0.0
        stretch = (0.992, 1.000, 1.006, 1.012, 1.004, 0.996)[phase]
    else:
        # Source attack pose raises front legs; add a restrained forward lean.
        bob = (0.0, -0.4, -0.8, -0.2, 0.4, 0.1)[phase]
        lateral = (0.0, 0.3, 0.8, 1.3, 0.7, 0.2)[phase]
        lean = (0.0, 1.0, 2.4, 4.0, 2.3, 0.6)[phase]
        stretch = (1.000, 1.008, 1.015, 1.022, 1.012, 1.004)[phase]
    if abs(stretch - 1.0) > 0.001:
        scaled = scaled.resize((scaled.width, max(1, round(scaled.height * stretch))), Image.Resampling.BICUBIC)
    scaled = lean_warp(scaled, lean)
    scaled = scaled.resize((max(1, round(scaled.width * target_h / scaled.height)), target_h), Image.Resampling.LANCZOS)
    frame_w = FRAME_W[tier]
    canvas = Image.new("RGBA", (frame_w, FRAME_H), (0, 0, 0, 0))
    x = round((frame_w - scaled.width) / 2 + lateral)
    y = round(BASELINE - scaled.height + bob)
    canvas = Image.alpha_composite(canvas, shadow_layer(canvas.size, frame_w / 2 + lateral, scaled.width))
    canvas.alpha_composite(scaled, (x, y))
    return scrub_green_rgba(canvas)


def checker(size: Tuple[int, int], cell: int = 14) -> Image.Image:
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(out)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            colour = (55, 59, 66, 255) if ((x // cell + y // cell) % 2 == 0) else (38, 42, 48, 255)
            draw.rectangle((x, y, x + cell, y + cell), fill=colour)
    return out


def build() -> Dict[str, dict]:
    pose_sets = {action: split_subjects(path) for action, path in SOURCES.items()}
    target_total = {tier: round(NOMINAL_BRISTLE_H * ratio) for tier, ratio in RATIOS.items()}
    # Shadow blur contributes roughly ten pixels to bbox, so body target is total minus ten.
    target_body = {tier: max(20, target_total[tier] - 10) for tier in RATIOS}
    meta: Dict[str, dict] = {}
    rendered: Dict[Tuple[str, str], List[Image.Image]] = {}
    for index, tier in enumerate(RATIOS):
        for action in ACTIONS[tier]:
            subject = pose_sets[action][index]
            frames = [render_frame(subject, tier, target_body[tier], phase, action) for phase in range(6)]
            strip = Image.new("RGBA", (FRAME_W[tier] * 6, FRAME_H), (0, 0, 0, 0))
            for phase, frame in enumerate(frames):
                strip.alpha_composite(frame, (phase * FRAME_W[tier], 0))
            output = SPRITES / f"{tier}_{action}.png"
            strip.save(output)
            rendered[(tier, action)] = frames
            bbox = frames[0].getchannel("A").getbbox()
            content_h = bbox[3] - bbox[1] if bbox else 0
            meta[f"{tier}_{action}.png"] = {
                "frames": 6, "frame_w": FRAME_W[tier], "frame_h": FRAME_H,
                "content_h": content_h, "display_level": DISPLAY_LEVEL[tier], "action": action,
            }
            # Framed cutout and concept use the clean first idle pose with cool-black oval shadow.
        cutout = rendered[(tier, "idle")][0]
        cutout.save(CUTOUTS / f"{tier}.png")
        cutout.save(SPIDER_DIR / f"{tier}_concept.png")
    return meta


def build_lineup() -> None:
    tiers = list(RATIOS)
    labels = ["A · Silkling", "B · Webfen Widow", "C · Brood Matron", "Boss · Nightweave"]
    gap = 20
    height = FRAME_H + 66
    width = sum(FRAME_W[tier] for tier in tiers) + gap * (len(tiers) + 1)
    out = checker((width, height))
    draw = ImageDraw.Draw(out)
    small, title = load_font(12), load_font(15)
    x = gap
    for tier, label in zip(tiers, labels):
        frame = Image.open(SPRITES / f"{tier}_idle.png").convert("RGBA").crop((0, 0, FRAME_W[tier], FRAME_H))
        out.alpha_composite(frame, (x, 31))
        draw.text((x + 3, 8), label, font=small, fill=(255, 246, 206, 255))
        draw.text((x + 3, height - 23), f"{FRAME_W[tier]}×{FRAME_H} · {round(NOMINAL_BRISTLE_H * RATIOS[tier])}h",
                  font=small, fill=(192, 199, 205, 255))
        x += FRAME_W[tier] + gap
    draw.text((gap, height - 45), "AFK Slayer · Level 3 spider family · Option C · transparent QA",
              font=title, fill=(224, 177, 91, 255))
    out.save(SPIDER_DIR / "lineup_preview.png")


def build_strip_preview(meta: Dict[str, dict]) -> None:
    scale = 0.52
    rows = []
    for filename in meta:
        im = Image.open(SPRITES / filename).convert("RGBA")
        rows.append((filename, im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)))
    label_h, row_h = 22, 112
    width = max(im.width for _, im in rows) + 180
    height = sum(max(row_h, im.height + label_h) for _, im in rows) + 18
    out = checker((width, height), 12)
    draw = ImageDraw.Draw(out)
    font = load_font(11)
    y = 9
    for filename, im in rows:
        draw.text((8, y + 4), filename[:-4], font=font, fill=(255, 246, 206, 255))
        out.alpha_composite(im, (160, y))
        y += max(row_h, im.height + label_h)
    out.save(SPIDER_DIR / "strips_qa_preview.png")


def write_docs(meta: Dict[str, dict]) -> None:
    rows = []
    for tier in RATIOS:
        rows.append(f"| `{tier}` | {('A · Silkling' if tier == 'silkling' else 'B · Webfen Widow' if tier == 'webfen_widow' else 'C · Brood Matron' if tier == 'brood_matron' else 'Boss · Nightweave')} | {RATIOS[tier]:.2f}× | {DISPLAY_LEVEL[tier]} | {' / '.join(ACTIONS[tier])} (6) | {meta[tier + '_idle.png']['content_h']} |")
    frame_rows = [f"| `anim/sprites/{filename}` | {info['frames']} | {info['frame_w']}×{info['frame_h']} | {info['content_h']} |" for filename, info in meta.items()]
    text = [
        "# AFK Slayer — Level 3 spider family (integration)", "",
        "**Locked look:** `art/v3/target/option_c_locked.png` (Option C).",
        "**Status:** LIVE Level 3 ladder art; original-IP spider names.",
        "**Paths:** strips in `art/v3b/anim/sprites/`; cutouts/concepts/previews in `art/v3b/creatures/spiders/`.", "",
        "## Silhouette language", "",
        "Low-wide arthropods: bodies stay close to the floor with long, splayed legs and broad horizontal reads. Do not stretch these into upright mammals.",
        "Silkling is pale silk white/cream; Webfen Widow is violet-grey; Brood Matron is broad and darker violet with an egg-sack hint; Nightweave is the near-black violet-web apex boss.",
        "Each render has transparent corners, no green matte/fringe, and a soft cool-black oval floor shadow. Frame height is **156**; scale is relative to Bristle Cub content (~72px).", "",
        "## Scale ladder", "",
        "| Id | Role | Relative to Bristle Cub | displayLevel | Strips | Content h |",
        "|---|---|---:|---:|---|---:|",
        *rows, "",
        "## Frame table", "",
        "| File | Frames | Frame size (w×h) | Content h |", "|---|---:|---|---:|",
        *frame_rows, "",
        "## New Bot wiring notes", "",
        "1. Map visual ids directly: `silkling_*`, `webfen_widow_*`, `brood_matron_*`, and `nightweave_*`.",
        "2. `displayLevel` values are 180 / 420 / 600 / 720 in that order; `nightweave` is the boss.",
        "3. Select idle, walk, or attack strips by action. Nightweave intentionally has idle + attack only; there is no walk strip.",
        "4. Use transparent PNGs directly; do not place a solid CSS background behind a sprite.",
        "5. Preserve these original-IP names and identifiers. Do not substitute Jagex or archived creature names.",
        "6. Keep player/companion pilot art and all other level systems wiring unchanged; this deliverable is art-only.", "",
        "## QA and regeneration", "",
        "`lineup_preview.png` shows the low-wide A/B/C/boss lineup on checkerboard; `strips_qa_preview.png` shows all six-frame strips.",
        "`_qa_summary.txt` records exact strip dimensions, per-frame corner alpha, content heights, and residual green checks.", "",
        "```bash", "/workspace/.venv-art/bin/python art/v3b/creatures/spiders/build_spiders.py", "```", "",
        "The source sheets were split by the four largest connected non-green blobs ordered left-to-right. Border-connected lime and #00b140-ish chroma plus green-dominant fringe were removed while violet, cream and purple body colors were protected.",
    ]
    (SPIDER_DIR / "INTEGRATION.md").write_text("\n".join(text) + "\n")


def qa(meta: Dict[str, dict]) -> List[str]:
    issues: List[str] = []
    lines = ["AFK Slayer Level 3 spider art QA", "frame_h=156; all strips have six frames", ""]
    for filename, info in meta.items():
        path = SPRITES / filename
        image = Image.open(path).convert("RGBA")
        arr = np.array(image)
        if image.height != FRAME_H or image.width != info["frame_w"] * 6:
            issues.append(f"{filename}: wrong strip dimensions")
        frame_heights = []
        residual_total = 0
        bad_corners = []
        for frame_index in range(6):
            frame = arr[:, frame_index * info["frame_w"]:(frame_index + 1) * info["frame_w"]]
            alpha = frame[:, :, 3]
            corners = [int(alpha[0, 0]), int(alpha[0, -1]), int(alpha[-1, 0]), int(alpha[-1, -1])]
            if any(c != 0 for c in corners):
                bad_corners.append(f"f{frame_index}:{corners}")
            bbox = Image.fromarray(frame).getchannel("A").getbbox()
            frame_heights.append((bbox[3] - bbox[1]) if bbox else 0)
            rgb = frame[:, :, :3].astype(np.int16)
            r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
            green = (g > r + 10) & (g > b + 10) & (g > 95)
            warm = (r >= 125) & (g >= 90) & (b <= g - 8) & (np.abs(r - g) <= 80)
            residual_total += int((green & ~warm & (alpha > 0)).sum())
        if bad_corners:
            issues.append(f"{filename}: nontransparent frame corners {bad_corners}")
        if residual_total:
            issues.append(f"{filename}: residual green pixels {residual_total}")
        lines.append(f"{filename}: size={image.width}x{image.height}; frame={info['frame_w']}x{FRAME_H}; content_h={frame_heights[0]}; frame_content_h={frame_heights}; corner_alpha=0; residual_green_opaque={residual_total}")
    for tier in RATIOS:
        for path in (CUTOUTS / f"{tier}.png", SPIDER_DIR / f"{tier}_concept.png"):
            image = Image.open(path).convert("RGBA")
            arr = np.array(image)
            alpha = arr[:, :, 3]
            corners = [int(alpha[0, 0]), int(alpha[0, -1]), int(alpha[-1, 0]), int(alpha[-1, -1])]
            if any(c != 0 for c in corners):
                issues.append(f"{path.name}: nontransparent corners {corners}")
            rgb = arr[:, :, :3].astype(np.int16)
            r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
            green = (g > r + 10) & (g > b + 10) & (g > 95)
            warm = (r >= 125) & (g >= 90) & (b <= g - 8) & (np.abs(r - g) <= 80)
            residual = int((green & ~warm & (alpha > 0)).sum())
            if residual:
                issues.append(f"{path.name}: residual green fringe {residual}")
    lines.extend(["", "issues=" + ("; ".join(issues) if issues else "CLEAN")])
    (SPIDER_DIR / "_qa_summary.txt").write_text("\n".join(lines) + "\n")
    print("QA " + ("CLEAN" if not issues else "ISSUES"))
    for line in lines:
        print(line)
    return issues


def main() -> None:
    print("=== build AFK Slayer Level 3 spider cutouts and strips ===")
    meta = build()
    build_lineup()
    build_strip_preview(meta)
    write_docs(meta)
    issues = qa(meta)
    if issues:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
