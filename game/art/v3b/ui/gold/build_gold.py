#!/usr/bin/env python3
"""
AFK Slayer — Original pixel-art gold coin icon set builder.
Procedural PIL/numpy drawing. No external sprites. Nearest-neighbor only.
Re-runnable: python3 build_gold.py
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Locked palette
# ---------------------------------------------------------------------------
OUTLINE = (0x2A, 0x1A, 0x05, 255)
DEEP = (0x7A, 0x4A, 0x0A, 255)
MID = (0xC8, 0x90, 0x1A, 255)
BASE = (0xF0, 0xC0, 0x20, 255)
LIGHT = (0xFF, 0xE0, 0x60, 255)
RIM = (0xFF, 0xF6, 0xB0, 255)
TRANSPARENT = (0, 0, 0, 0)

PALETTE = {
    "outline": "#2A1A05",
    "deep_shadow": "#7A4A0A",
    "mid_gold": "#C8901A",
    "base_gold": "#F0C020",
    "light": "#FFE060",
    "rim_highlight": "#FFF6B0",
}

ICON_KEYS = [
    "coins_1",
    "coins_2",
    "coins_3",
    "coins_4",
    "coins_5",
    "coins_25",
    "coins_100",
    "coins_250",
    "coins_1000",
]


def new_canvas(w: int, h: int) -> Image.Image:
    return Image.new("RGBA", (w, h), TRANSPARENT)


def put(px, x: int, y: int, color, w: int, h: int):
    if 0 <= x < w and 0 <= y < h:
        px[x, y] = color


def hard_alpha(img: Image.Image) -> Image.Image:
    arr = np.array(img)
    a = arr[:, :, 3]
    arr[:, :, 3] = np.where(a >= 128, 255, 0).astype(np.uint8)
    mask = arr[:, :, 3] == 0
    arr[mask, 0:3] = 0
    return Image.fromarray(arr, "RGBA")


def nearest_scale(img: Image.Image, scale: int) -> Image.Image:
    w, h = img.size
    return img.resize((w * scale, h * scale), Image.NEAREST)


def clear_corners(img: Image.Image, margin: int = 0) -> Image.Image:
    """Force corner pixels (and optional margin) transparent."""
    arr = np.array(img)
    h, w = arr.shape[:2]
    for y in range(0, 1 + margin):
        for x in range(0, 1 + margin):
            arr[y, x] = (0, 0, 0, 0)
            arr[y, w - 1 - x] = (0, 0, 0, 0)
            arr[h - 1 - y, x] = (0, 0, 0, 0)
            arr[h - 1 - y, w - 1 - x] = (0, 0, 0, 0)
    return Image.fromarray(arr, "RGBA")


# ---------------------------------------------------------------------------
# Solid ellipse (no skipped pixels)
# ---------------------------------------------------------------------------
def ellipse_pixels(cx: float, cy: float, rx: float, ry: float) -> set[tuple[int, int]]:
    pts: set[tuple[int, int]] = set()
    if rx < 0.5 or ry < 0.5:
        pts.add((int(round(cx)), int(round(cy))))
        return pts
    x0 = int(math.floor(cx - rx))
    x1 = int(math.ceil(cx + rx))
    y0 = int(math.floor(cy - ry))
    y1 = int(math.ceil(cy + ry))
    rx2 = rx * rx
    ry2 = ry * ry
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            dx = x - cx
            dy = y - cy
            if (dx * dx) / rx2 + (dy * dy) / ry2 <= 1.001:
                pts.add((x, y))
    return pts


def exterior_outline(body: set[tuple[int, int]]) -> set[tuple[int, int]]:
    outline: set[tuple[int, int]] = set()
    for x, y in body:
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            n = (x + dx, y + dy)
            if n not in body:
                outline.add(n)
    return outline


# ---------------------------------------------------------------------------
# Single coin: elliptical face + cylindrical edge band with stripes
# ---------------------------------------------------------------------------
def draw_coin(
    canvas: Image.Image,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    edge_h: int = 3,
    *,
    stack_shade: float = 0.0,
):
    """
    cy = center of the TOP FACE ellipse.
    Edge band hangs edge_h pixels below the bottom of the face.
    """
    px = canvas.load()
    w, h = canvas.size

    face = ellipse_pixels(cx, cy, rx, ry)
    if not face:
        return canvas

    # Per-column face y-range
    col_ymin: dict[int, int] = {}
    col_ymax: dict[int, int] = {}
    for x, y in face:
        if x not in col_ymin or y < col_ymin[x]:
            col_ymin[x] = y
        if x not in col_ymax or y > col_ymax[x]:
            col_ymax[x] = y

    # Edge band under face
    edge: set[tuple[int, int]] = set()
    for x, yb in col_ymax.items():
        for k in range(1, edge_h + 1):
            edge.add((x, yb + k))

    body = face | edge
    outline = exterior_outline(body)

    # Paint outline
    for x, y in outline:
        put(px, x, y, OUTLINE, w, h)

    # Edge stripes (horizontal bands)
    for x, y in edge:
        yb = col_ymax[x]
        depth = y - yb  # 1..edge_h
        side = (x - cx) / max(rx, 1.0)
        # darker on the right / deeper
        if depth % 2 == 1:
            c = DEEP if side > -0.1 else MID
        else:
            c = MID if side > 0.2 else BASE
        if stack_shade > 0.35:
            c = DEEP
        elif stack_shade > 0.2 and depth % 2 == 1:
            c = DEEP
        put(px, x, y, c, w, h)

    # Face fill — smooth regions of flat tones (no holes)
    for x, y in face:
        nx = (x - cx) / max(rx, 1.0)
        ny = (y - cy) / max(ry, 1.0)
        # light from upper-left
        shade = -0.40 * nx - 0.55 * ny
        if stack_shade > 0:
            shade -= stack_shade * 0.55

        dist = math.sqrt(nx * nx + ny * ny)
        near_rim_top = dist > 0.70 and ny < -0.10

        if near_rim_top and shade > 0.0:
            c = RIM
        elif shade > 0.30:
            c = LIGHT
        elif shade > 0.00:
            c = BASE
        elif shade > -0.30:
            c = MID
        else:
            c = DEEP
        put(px, x, y, c, w, h)

    # Small glint on brighter coins
    if stack_shade < 0.25 and rx >= 3.5:
        gx = int(round(cx - rx * 0.28))
        gy = int(round(cy - ry * 0.40))
        if (gx, gy) in face:
            put(px, gx, gy, RIM, w, h)
            if rx >= 5.5 and (gx + 1, gy) in face:
                put(px, gx + 1, gy, LIGHT, w, h)

    return canvas


# ---------------------------------------------------------------------------
# Stack helper
# ---------------------------------------------------------------------------
def stack_column(img, cx, base_cy, rx, ry, levels, edge_h=2, step=None):
    """Bottom-to-top stack. Top coin drawn last (brightest)."""
    if step is None:
        step = max(2, edge_h)
    for i in range(levels):
        cy = base_cy - i * step
        # lower coins slightly darker
        shade = max(0.0, 0.28 - i * 0.06)
        draw_coin(img, cx, cy, rx, ry, edge_h=edge_h, stack_shade=shade)


# ---------------------------------------------------------------------------
# 32×32 compositions
# ---------------------------------------------------------------------------
def make_coins_1() -> Image.Image:
    img = new_canvas(32, 32)
    draw_coin(img, 15.5, 13.5, 10.0, 6.0, edge_h=4)
    return clear_corners(hard_alpha(img))


def make_coins_2() -> Image.Image:
    img = new_canvas(32, 32)
    draw_coin(img, 11.0, 12.5, 8.0, 4.8, edge_h=3, stack_shade=0.12)
    draw_coin(img, 19.5, 16.0, 8.5, 5.0, edge_h=3, stack_shade=0.0)
    return clear_corners(hard_alpha(img))


def make_coins_3() -> Image.Image:
    img = new_canvas(32, 32)
    draw_coin(img, 9.5, 11.5, 7.0, 4.2, edge_h=3, stack_shade=0.18)
    draw_coin(img, 21.0, 12.0, 7.0, 4.2, edge_h=3, stack_shade=0.12)
    draw_coin(img, 15.5, 17.5, 8.0, 4.8, edge_h=3, stack_shade=0.0)
    return clear_corners(hard_alpha(img))


def make_coins_4() -> Image.Image:
    img = new_canvas(32, 32)
    draw_coin(img, 10.0, 10.0, 6.5, 3.9, edge_h=3, stack_shade=0.22)
    draw_coin(img, 21.0, 10.5, 6.5, 3.9, edge_h=3, stack_shade=0.18)
    draw_coin(img, 9.5, 17.0, 6.8, 4.0, edge_h=3, stack_shade=0.08)
    draw_coin(img, 20.5, 18.0, 7.0, 4.2, edge_h=3, stack_shade=0.0)
    return clear_corners(hard_alpha(img))


def make_coins_5() -> Image.Image:
    img = new_canvas(32, 32)
    draw_coin(img, 15.5, 9.0, 6.0, 3.6, edge_h=2, stack_shade=0.25)
    draw_coin(img, 8.5, 13.0, 6.0, 3.6, edge_h=3, stack_shade=0.15)
    draw_coin(img, 22.5, 13.5, 6.0, 3.6, edge_h=3, stack_shade=0.12)
    draw_coin(img, 11.0, 19.0, 6.5, 3.9, edge_h=3, stack_shade=0.04)
    draw_coin(img, 19.5, 19.5, 6.5, 3.9, edge_h=3, stack_shade=0.0)
    return clear_corners(hard_alpha(img))


def make_coins_25() -> Image.Image:
    img = new_canvas(32, 32)
    stack_column(img, 10.5, 19.5, 6.5, 3.8, 4, edge_h=2, step=2)
    stack_column(img, 21.0, 18.5, 6.0, 3.6, 3, edge_h=2, step=2)
    draw_coin(img, 16.0, 22.0, 5.5, 3.3, edge_h=2, stack_shade=0.0)
    return clear_corners(hard_alpha(img))


def make_coins_100() -> Image.Image:
    img = new_canvas(32, 32)
    stack_column(img, 9.5, 20.5, 6.0, 3.5, 5, edge_h=2, step=2)
    stack_column(img, 17.5, 19.5, 6.5, 3.7, 6, edge_h=2, step=2)
    stack_column(img, 24.5, 21.0, 5.2, 3.1, 4, edge_h=2, step=2)
    draw_coin(img, 13.5, 24.0, 5.0, 3.0, edge_h=2, stack_shade=0.0)
    return clear_corners(hard_alpha(img))


def make_coins_250() -> Image.Image:
    img = new_canvas(32, 32)
    stack_column(img, 7.0, 21.5, 5.2, 3.1, 5, edge_h=2, step=2)
    stack_column(img, 13.5, 20.5, 5.5, 3.3, 7, edge_h=2, step=2)
    stack_column(img, 20.0, 20.0, 5.5, 3.3, 8, edge_h=2, step=2)
    stack_column(img, 25.5, 21.5, 4.8, 2.9, 5, edge_h=2, step=2)
    draw_coin(img, 9.5, 24.5, 4.5, 2.7, edge_h=2, stack_shade=0.05)
    draw_coin(img, 23.5, 25.0, 4.5, 2.7, edge_h=2, stack_shade=0.0)
    return clear_corners(hard_alpha(img))


def make_coins_1000() -> Image.Image:
    img = new_canvas(32, 32)
    # Keep inset from edges so corners stay clear
    stack_column(img, 6.5, 22.0, 4.8, 2.9, 6, edge_h=2, step=2)
    stack_column(img, 11.5, 21.0, 5.0, 3.0, 8, edge_h=2, step=2)
    stack_column(img, 16.5, 20.0, 5.5, 3.2, 10, edge_h=2, step=2)
    stack_column(img, 21.5, 20.5, 5.0, 3.0, 9, edge_h=2, step=2)
    stack_column(img, 26.0, 22.0, 4.5, 2.7, 6, edge_h=2, step=2)
    draw_coin(img, 14.0, 8.0, 4.8, 2.9, edge_h=2, stack_shade=0.08)
    draw_coin(img, 19.5, 7.0, 5.0, 3.0, edge_h=2, stack_shade=0.0)
    draw_coin(img, 8.5, 25.0, 4.2, 2.5, edge_h=2, stack_shade=0.05)
    draw_coin(img, 24.5, 25.5, 4.2, 2.5, edge_h=2, stack_shade=0.0)
    draw_coin(img, 16.5, 25.5, 4.5, 2.7, edge_h=2, stack_shade=0.0)
    return clear_corners(hard_alpha(img), margin=0)


MAKERS = {
    "coins_1": make_coins_1,
    "coins_2": make_coins_2,
    "coins_3": make_coins_3,
    "coins_4": make_coins_4,
    "coins_5": make_coins_5,
    "coins_25": make_coins_25,
    "coins_100": make_coins_100,
    "coins_250": make_coins_250,
    "coins_1000": make_coins_1000,
}


# ---------------------------------------------------------------------------
# Hand-simplified 16×16
# ---------------------------------------------------------------------------
def make_16_coins_1() -> Image.Image:
    img = new_canvas(16, 16)
    draw_coin(img, 7.5, 6.5, 5.2, 3.2, edge_h=3)
    return clear_corners(hard_alpha(img))


def make_16_coins_2() -> Image.Image:
    img = new_canvas(16, 16)
    draw_coin(img, 5.5, 6.0, 4.0, 2.4, edge_h=2, stack_shade=0.12)
    draw_coin(img, 9.5, 8.5, 4.2, 2.5, edge_h=2)
    return clear_corners(hard_alpha(img))


def make_16_coins_3() -> Image.Image:
    img = new_canvas(16, 16)
    draw_coin(img, 4.5, 5.5, 3.5, 2.1, edge_h=2, stack_shade=0.18)
    draw_coin(img, 10.5, 5.5, 3.5, 2.1, edge_h=2, stack_shade=0.12)
    draw_coin(img, 7.5, 9.5, 4.0, 2.4, edge_h=2)
    return clear_corners(hard_alpha(img))


def make_16_coins_4() -> Image.Image:
    img = new_canvas(16, 16)
    draw_coin(img, 4.5, 4.5, 3.2, 1.9, edge_h=2, stack_shade=0.2)
    draw_coin(img, 10.5, 4.5, 3.2, 1.9, edge_h=2, stack_shade=0.15)
    draw_coin(img, 4.5, 9.5, 3.4, 2.0, edge_h=2, stack_shade=0.08)
    draw_coin(img, 10.0, 10.0, 3.5, 2.1, edge_h=2)
    return clear_corners(hard_alpha(img))


def make_16_coins_5() -> Image.Image:
    img = new_canvas(16, 16)
    draw_coin(img, 7.5, 3.5, 3.0, 1.8, edge_h=2, stack_shade=0.25)
    draw_coin(img, 4.0, 7.0, 3.0, 1.8, edge_h=2, stack_shade=0.12)
    draw_coin(img, 11.0, 7.0, 3.0, 1.8, edge_h=2, stack_shade=0.1)
    draw_coin(img, 5.5, 11.0, 3.2, 1.9, edge_h=2)
    draw_coin(img, 10.0, 11.5, 3.2, 1.9, edge_h=2)
    return clear_corners(hard_alpha(img))


def stack16(img, cx, base_cy, rx, ry, levels, edge_h=1, step=1):
    for i in range(levels):
        cy = base_cy - i * step
        shade = max(0.0, 0.25 - i * 0.06)
        draw_coin(img, cx, cy, rx, ry, edge_h=edge_h, stack_shade=shade)


def make_16_coins_25() -> Image.Image:
    img = new_canvas(16, 16)
    stack16(img, 5.0, 10.5, 3.3, 2.0, 3, edge_h=1, step=2)
    stack16(img, 10.5, 10.0, 3.1, 1.9, 2, edge_h=1, step=2)
    draw_coin(img, 7.5, 12.5, 2.8, 1.6, edge_h=1)
    return clear_corners(hard_alpha(img))


def make_16_coins_100() -> Image.Image:
    img = new_canvas(16, 16)
    stack16(img, 4.0, 11.0, 3.0, 1.8, 3, edge_h=1, step=2)
    stack16(img, 8.5, 10.5, 3.2, 1.9, 4, edge_h=1, step=2)
    stack16(img, 12.0, 11.5, 2.6, 1.6, 2, edge_h=1, step=2)
    return clear_corners(hard_alpha(img))


def make_16_coins_250() -> Image.Image:
    img = new_canvas(16, 16)
    stack16(img, 3.5, 11.5, 2.5, 1.5, 3, edge_h=1, step=2)
    stack16(img, 7.0, 10.5, 2.8, 1.7, 4, edge_h=1, step=2)
    stack16(img, 10.5, 10.0, 2.8, 1.7, 5, edge_h=1, step=2)
    stack16(img, 13.0, 11.5, 2.3, 1.4, 3, edge_h=1, step=2)
    return clear_corners(hard_alpha(img))


def make_16_coins_1000() -> Image.Image:
    img = new_canvas(16, 16)
    stack16(img, 3.5, 11.5, 2.3, 1.4, 4, edge_h=1, step=2)
    stack16(img, 6.5, 10.5, 2.5, 1.5, 5, edge_h=1, step=2)
    stack16(img, 9.5, 9.5, 2.6, 1.6, 5, edge_h=1, step=2)
    stack16(img, 12.5, 10.5, 2.4, 1.5, 4, edge_h=1, step=2)
    draw_coin(img, 8.0, 3.5, 2.4, 1.4, edge_h=1)
    draw_coin(img, 5.0, 13.0, 2.2, 1.3, edge_h=1)
    draw_coin(img, 11.5, 13.0, 2.2, 1.3, edge_h=1)
    return clear_corners(hard_alpha(img))


MAKERS_16 = {
    "coins_1": make_16_coins_1,
    "coins_2": make_16_coins_2,
    "coins_3": make_16_coins_3,
    "coins_4": make_16_coins_4,
    "coins_5": make_16_coins_5,
    "coins_25": make_16_coins_25,
    "coins_100": make_16_coins_100,
    "coins_250": make_16_coins_250,
    "coins_1000": make_16_coins_1000,
}


# ---------------------------------------------------------------------------
# 20px cleanup from 32
# ---------------------------------------------------------------------------
def cleanup_downscale(src32: Image.Image, size: int) -> Image.Image:
    img = src32.resize((size, size), Image.NEAREST)
    img = hard_alpha(img)
    arr = np.array(img)
    h, w = arr.shape[:2]
    opaque = arr[:, :, 3] == 255
    outline_c = np.array(OUTLINE, dtype=np.uint8)
    new_arr = arr.copy()
    for y in range(h):
        for x in range(w):
            if opaque[y, x]:
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and opaque[ny, nx]:
                    new_arr[y, x] = outline_c
                    break
    return clear_corners(hard_alpha(Image.fromarray(new_arr, "RGBA")))


# ---------------------------------------------------------------------------
# coin_pop strip
# ---------------------------------------------------------------------------
def make_coin_pop_frames(frame_size: int = 16, n_frames: int = 8) -> list[Image.Image]:
    frames = []
    for i in range(n_frames):
        img = new_canvas(frame_size, frame_size)
        phase = (i / n_frames) * 2 * math.pi
        width_scale = max(0.12, abs(math.cos(phase)))

        cx = (frame_size - 1) / 2.0
        cy = (frame_size - 1) / 2.0 - 0.5
        base_rx = frame_size * 0.34
        base_ry = frame_size * 0.20
        rx = base_rx * width_scale
        ry = base_ry
        edge_h = 2 if frame_size >= 16 else 1

        if width_scale < 0.28:
            px = img.load()
            w, h = img.size
            x0 = int(round(cx))
            y_top = int(round(cy - ry))
            y_bot = int(round(cy + ry + edge_h))
            for y in range(y_top - 1, y_bot + 2):
                for dx in (-1, 0, 1):
                    put(px, x0 + dx, y, OUTLINE, w, h)
            for y in range(y_top, y_bot + 1):
                c = BASE if ((y - y_top) % 2 == 0) else MID
                put(px, x0, y, c, w, h)
            put(px, x0, y_top, RIM, w, h)
        else:
            draw_coin(img, cx, cy, rx, ry, edge_h=edge_h)

        # Sparkle on first and last (pop) frames
        if i in (0, n_frames - 1):
            px = img.load()
            w, h = img.size
            sx = int(cx + base_rx * 0.85)
            sy = int(cy - base_ry - 1)
            spark = RIM
            for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1), (-2, 0), (2, 0), (0, -2), (0, 2)):
                put(px, sx + dx, sy + dy, spark, w, h)

        frames.append(clear_corners(hard_alpha(img)))
    return frames


def pack_strip(frames: list[Image.Image]) -> Image.Image:
    fw, fh = frames[0].size
    strip = new_canvas(fw * len(frames), fh)
    for i, f in enumerate(frames):
        strip.paste(f, (i * fw, 0), f)
    return hard_alpha(strip)


# ---------------------------------------------------------------------------
# Number formatting + tiny bitmap text for preview
# ---------------------------------------------------------------------------
def format_gold(n: int) -> tuple[str, str]:
    if n < 100_000:
        return f"{n:,}", "#FFFF00"
    if n < 10_000_000:
        return f"{n // 1000}K", "#FFFFFF"
    return f"{n // 1_000_000}M", "#00FF80"


def render_pixel_text(text: str, color_hex: str, scale: int = 2) -> Image.Image:
    GLYPHS = {
        "0": ["111", "101", "101", "101", "111"],
        "1": ["010", "110", "010", "010", "111"],
        "2": ["111", "001", "111", "100", "111"],
        "3": ["111", "001", "111", "001", "111"],
        "4": ["101", "101", "111", "001", "001"],
        "5": ["111", "100", "111", "001", "111"],
        "6": ["111", "100", "111", "101", "111"],
        "7": ["111", "001", "010", "010", "010"],
        "8": ["111", "101", "111", "101", "111"],
        "9": ["111", "101", "111", "001", "111"],
        "K": ["101", "110", "100", "110", "101"],
        "M": ["101", "111", "111", "101", "101"],
        ",": ["000", "000", "000", "010", "100"],
        " ": ["000", "000", "000", "000", "000"],
    }
    color = tuple(int(color_hex[i : i + 2], 16) for i in (1, 3, 5)) + (255,)
    shadow = (0, 0, 0, 255)
    gw, gh, gap = 3, 5, 1
    width = len(text) * (gw + gap) - gap + 1
    height = gh + 1
    base = new_canvas(width, height)
    px = base.load()
    x = 0
    for ch in text:
        g = GLYPHS.get(ch, GLYPHS[" "])
        for row, line in enumerate(g):
            for col, bit in enumerate(line):
                if bit == "1":
                    put(px, x + col + 1, row + 1, shadow, width, height)
        for row, line in enumerate(g):
            for col, bit in enumerate(line):
                if bit == "1":
                    put(px, x + col, row, color, width, height)
        x += gw + gap
    if scale != 1:
        base = nearest_scale(base, scale)
    return hard_alpha(base)


# ---------------------------------------------------------------------------
# Preview sheet
# ---------------------------------------------------------------------------
def build_preview(
    icons32: dict[str, Image.Image],
    icons16: dict[str, Image.Image],
    icons20: dict[str, Image.Image],
    pop16: Image.Image,
    pop32: Image.Image,
) -> Image.Image:
    BG = (0x1B, 0x23, 0x30, 255)
    PANEL = (0xCD, 0xBE, 0x9C, 255)
    BAR = (0x12, 0x18, 0x22, 255)
    LABEL = (0xE8, 0xE0, 0xC8, 255)
    MUTED = (0x8A, 0x92, 0xA0, 255)

    W, H = 720, 640
    sheet = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(sheet)

    def blit(im, x, y):
        sheet.paste(im, (x, y), im)

    def label(text, x, y, fill=LABEL):
        draw.text((x, y), text, fill=fill)

    label("AFK Slayer — Gold Coin Icon Set (original procedural pixel art)", 16, 10)
    label("Nearest-neighbor only · palette locked · transparent RGBA", 16, 28, MUTED)

    label("(a) Stack set @ 3x (from 32px native)", 16, 52)
    amounts_for_keys = {
        "coins_1": "1",
        "coins_2": "2",
        "coins_3": "3",
        "coins_4": "4",
        "coins_5": "5-24",
        "coins_25": "25-99",
        "coins_100": "100-249",
        "coins_250": "250-999",
        "coins_1000": "1000+",
    }
    x0, y0 = 16, 72
    for i, key in enumerate(ICON_KEYS):
        zoom = nearest_scale(icons32[key], 3)
        bx = x0 + i * 76
        draw.rectangle([bx - 2, y0 - 2, bx + 96 + 2, y0 + 96 + 18], fill=PANEL)
        blit(zoom, bx, y0)
        label(amounts_for_keys[key], bx + 4, y0 + 98, (0x2A, 0x1A, 0x05, 255))

    label("(b) Inline 16px / 20px @ 1x & 2x + amount text colors", 16, 210)
    samples = [
        (47, "coins_5"),
        (1250, "coins_1000"),
        (380_000, "coins_1000"),
        (12_000_000, "coins_1000"),
    ]
    draw.rectangle([16, 230, 700, 340], fill=PANEL)
    draw.rectangle([16, 342, 700, 430], fill=BG)

    x = 28
    for n, key in samples:
        text, col = format_gold(n)
        blit(icons16[key], x, 242)
        blit(render_pixel_text(text, col, scale=2), x + 18, 244)
        label("16@1x", x, 262, (0x2A, 0x1A, 0x05, 255))

        blit(nearest_scale(icons16[key], 2), x, 280)
        blit(render_pixel_text(text, col, scale=2), x + 36, 286)
        label("16@2x", x, 316, (0x2A, 0x1A, 0x05, 255))

        blit(icons20[key], x, 350)
        blit(render_pixel_text(text, col, scale=2), x + 22, 354)
        label("20@1x", x, 374, MUTED)

        blit(nearest_scale(icons20[key], 2), x, 390)
        blit(render_pixel_text(text, col, scale=2), x + 44, 398)
        label("20@2x", x, 414, MUTED)
        x += 170

    label("(c) HUD mockup — 32px coin + amount", 16, 440)
    draw.rectangle([16, 458, 700, 510], fill=BAR)
    blit(icons32["coins_1000"], 28, 468)
    hud_text, hud_col = format_gold(1_250_000)  # 1250K white
    blit(render_pixel_text(hud_text, hud_col, scale=3), 68, 476)
    label("Top bar · image-rendering: pixelated", 300, 478, MUTED)
    blit(icons32["coins_5"], 500, 468)
    blit(render_pixel_text("47", "#FFFF00", scale=3), 538, 476)

    label("(d) coin_pop — 8 frames x 16x16 (shown @3x) + 32 strip @1x", 16, 524)
    pop_zoom = nearest_scale(pop16, 3)
    blit(pop_zoom, 16, 544)
    label("frame 16x16  count=8  suggest 10-12 fps", 16 + pop_zoom.size[0] + 12, 560, MUTED)
    blit(pop32, 16, 544 + pop_zoom.size[1] + 6)

    return hard_alpha(sheet)


# ---------------------------------------------------------------------------
# QA
# ---------------------------------------------------------------------------
def qa_image(path: Path) -> list[str]:
    issues = []
    img = Image.open(path).convert("RGBA")
    arr = np.array(img)
    alphas = set(np.unique(arr[:, :, 3]).tolist())
    bad = alphas - {0, 255}
    if bad:
        issues.append(f"{path.name}: non-binary alpha values {sorted(bad)[:8]}")
    h, w = arr.shape[:2]
    for name, (y, x) in {
        "TL": (0, 0),
        "TR": (0, w - 1),
        "BL": (h - 1, 0),
        "BR": (h - 1, w - 1),
    }.items():
        if arr[y, x, 3] != 0:
            issues.append(f"{path.name}: corner {name} not transparent")
    if not (arr[:, :, 3] == 255).any():
        issues.append(f"{path.name}: fully transparent (empty)")
    outline_rgb = np.array(OUTLINE[:3])
    opaque = arr[:, :, 3] == 255
    if opaque.any():
        match = opaque & np.all(arr[:, :, :3] == outline_rgb, axis=2)
        if not match.any():
            issues.append(f"{path.name}: no outline pixels found")
    return issues


def build_integration_md() -> str:
    return f"""# AFK Slayer — Gold Coin Icons (v3b)

Original procedural pixel art. Built by `build_gold.py` (PIL/numpy).
**Do not** replace with Jagex/OSRS ripped sprites.

## Palette (locked)

| Role | Hex | RGBA |
|------|-----|------|
| Outline | `{PALETTE['outline']}` | `42,26,5,255` |
| Deep shadow | `{PALETTE['deep_shadow']}` | `122,74,10,255` |
| Mid gold | `{PALETTE['mid_gold']}` | `200,144,26,255` |
| Base gold | `{PALETTE['base_gold']}` | `240,192,32,255` |
| Light | `{PALETTE['light']}` | `255,224,96,255` |
| Rim highlight | `{PALETTE['rim_highlight']}` | `255,246,176,255` |

Flat 2–3 tone shading, 1px dark outline, warm yellow-gold. No antialiasing / no blur. Alpha is strictly 0 or 255.

## File list

### Build
- `build_gold.py` — re-runnable generator
- `INTEGRATION.md` — this file
- `_qa_summary.txt` — QA log
- `gold_preview.png` — review sheet

### Stack icons (9 amounts × 4 sizes)

For each `N` in `1, 2, 3, 4, 5, 25, 100, 250, 1000`:

- `coins_{{N}}_32.png` — **native HUD** (32×32)
- `coins_{{N}}_16.png` — inline (hand-simplified redraw)
- `coins_{{N}}_20.png` — inline (cleanup downsample from 32)
- `coins_{{N}}_64.png` — retina / 2× (nearest from 32)

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
function goldIconKey(amount) {{
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
}}
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
.gold-icon {{
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  -ms-interpolation-mode: nearest-neighbor;
}}
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
.gold-amount {{
  font-family: 'Press Start 2P', 'Silkscreen', monospace;
  font-size: 12px;
  color: #FFFF00;           /* override per tier */
  text-shadow: 1px 1px 0 #000000;
  -webkit-font-smoothing: none;
  font-smooth: never;
  image-rendering: pixelated;
}}
.gold-amount.tier-k {{ color: #FFFFFF; }}
.gold-amount.tier-m {{ color: #00FF80; }}
```

### JS formatter (reference only)

```js
function formatGold(n) {{
  n = Math.floor(Math.max(0, n));
  if (n < 100000) {{
    return {{ text: n.toLocaleString('en-US'), color: '#FFFF00', tier: 'raw' }};
  }}
  if (n < 10000000) {{
    return {{ text: Math.floor(n / 1000) + 'K', color: '#FFFFFF', tier: 'k' }};
  }}
  return {{ text: Math.floor(n / 1e6) + 'M', color: '#00FF80', tier: 'm' }};
}}
```

## Rebuild

```bash
cd /workspace/contract-board/art/v3b/ui/gold
python3 build_gold.py
```

All outputs land in this folder. Does not touch game JS or other art trees.
"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    icons32: dict[str, Image.Image] = {}
    icons16: dict[str, Image.Image] = {}
    icons20: dict[str, Image.Image] = {}

    print("Drawing 32×32 natives…")
    for key, fn in MAKERS.items():
        icons32[key] = fn()
        icons32[key].save(OUT / f"{key}_32.png")
        print(f"  wrote {key}_32.png")

    print("Drawing hand-simplified 16×16…")
    for key, fn in MAKERS_16.items():
        icons16[key] = fn()
        icons16[key].save(OUT / f"{key}_16.png")
        print(f"  wrote {key}_16.png")

    print("Building 20×20 (cleanup downsample)…")
    for key in ICON_KEYS:
        icons20[key] = cleanup_downscale(icons32[key], 20)
        icons20[key].save(OUT / f"{key}_20.png")
        print(f"  wrote {key}_20.png")

    print("Building 64×64 (nearest ×2 from 32)…")
    for key in ICON_KEYS:
        nearest_scale(icons32[key], 2).save(OUT / f"{key}_64.png")
        print(f"  wrote {key}_64.png")

    print("Building coin_pop strips…")
    frames16 = make_coin_pop_frames(16, 8)
    frames32 = make_coin_pop_frames(32, 8)
    pop16 = pack_strip(frames16)
    pop32 = pack_strip(frames32)
    pop16.save(OUT / "coin_pop_16.png")
    pop32.save(OUT / "coin_pop_32.png")
    for i, f in enumerate(frames16):
        f.save(OUT / f"coin_pop_16_f{i}.png")
    print("  wrote coin_pop_16.png (8×16×16 strip)")
    print("  wrote coin_pop_32.png (8×32×32 strip)")

    print("Building gold_preview.png…")
    preview = build_preview(icons32, icons16, icons20, pop16, pop32)
    preview.save(OUT / "gold_preview.png")
    print("  wrote gold_preview.png")

    (OUT / "INTEGRATION.md").write_text(build_integration_md(), encoding="utf-8")
    print("  wrote INTEGRATION.md")

    print("Running QA…")
    all_issues = []
    expected = []
    for key in ICON_KEYS:
        for sz in (16, 20, 32, 64):
            expected.append(OUT / f"{key}_{sz}.png")
    expected += [
        OUT / "coin_pop_16.png",
        OUT / "coin_pop_32.png",
        OUT / "gold_preview.png",
        OUT / "build_gold.py",
        OUT / "INTEGRATION.md",
    ]
    for p in expected:
        if not p.exists():
            all_issues.append(f"MISSING: {p.name}")

    for key in ICON_KEYS:
        for sz in (16, 20, 32, 64):
            all_issues.extend(qa_image(OUT / f"{key}_{sz}.png"))
    all_issues.extend(qa_image(OUT / "coin_pop_16.png"))
    all_issues.extend(qa_image(OUT / "coin_pop_32.png"))

    weak_notes = [
        "coins_1_16 / coins_2_16: clearest — single/dual ellipse reads well.",
        "coins_3_16 / coins_4_16 / coins_5_16: busy but still read as 'several coins'.",
        "coins_25_16: short stacks readable as small piles.",
        "coins_100_16: silhouette of multi-stack OK; inner coin faces merge.",
        "coins_250_16 / coins_1000_16: at 16px individual coins merge into a gold mound; outline + edge stripes still sell 'big pile'. Weakest for counting coins, fine for 'lots of gold' affordance.",
    ]

    summary_lines = [
        "AFK Slayer gold icon QA summary",
        "================================",
        f"Output dir: {OUT}",
        f"Icons: {len(ICON_KEYS)} keys × 4 sizes = {len(ICON_KEYS)*4} PNGs",
        f"coin_pop: 8 frames, 16×16 (strip {pop16.size[0]}×{pop16.size[1]}) and 32×32 strip",
        "",
        "Palette:",
    ]
    for k, v in PALETTE.items():
        summary_lines.append(f"  {k}: {v}")
    summary_lines.append("")
    summary_lines.append("Issues:" if all_issues else "Issues: none")
    summary_lines.extend(f"  - {x}" for x in all_issues)
    summary_lines.append("")
    summary_lines.append("16px readability notes:")
    summary_lines.extend(f"  - {x}" for x in weak_notes)
    summary_lines.append("")
    summary_lines.append("Corners transparent: checked.")
    summary_lines.append("Alpha binary 0/255: checked.")
    summary_lines.append("Outlines present: checked.")

    (OUT / "_qa_summary.txt").write_text("\n".join(summary_lines) + "\n", encoding="utf-8")
    print("  wrote _qa_summary.txt")
    if all_issues:
        print("QA ISSUES:")
        for i in all_issues:
            print(" ", i)
    else:
        print("QA clean.")
    print("Done.")


if __name__ == "__main__":
    main()
