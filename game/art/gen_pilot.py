#!/usr/bin/env python3
"""Contract Board — palette + pilot sprites v2 (stronger silhouettes)."""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ART = Path("/workspace/contract-board/art")
SPR = ART / "sprites"
SPR.mkdir(parents=True, exist_ok=True)

OUT = (14, 16, 24)
TRANSPARENT = (0, 0, 0, 0)
ARENA_BG = (20, 24, 32)
SHADE = (26, 36, 56)
GOLD = (201, 162, 39)
GOLD2 = (232, 197, 71)
CREAM = (255, 255, 160)
SKIN = (232, 192, 144)
SKIN_S = (196, 156, 116)
WHITE = (255, 255, 255)

P0, P1, P2, P3 = (42, 26, 72), (61, 42, 106), (90, 74, 138), (138, 120, 192)
P_BOLT = (255, 255, 102)

B0, B1, B2, B3 = (30, 34, 48), (58, 66, 88), (102, 112, 138), (168, 178, 200)
LEATHER, LEATHER_S = (90, 58, 40), (60, 38, 28)

Q0, Q1, Q2 = (20, 40, 24), (26, 72, 32), (42, 138, 40)
WOOD, WOOD2, FLETCH = (106, 74, 40), (168, 120, 72), (216, 176, 96)

H0, H1, H2, H3, H4 = (42, 48, 40), (74, 86, 70), (122, 138, 112), (176, 188, 160), (216, 220, 200)
WOUND = (128, 32, 32)

T0, T1, T2, T3, T4 = (26, 30, 40), (42, 48, 64), (67, 76, 96), (106, 116, 136), (154, 164, 184)

A_SHAFT, A_HEAD, A_DARK = (138, 90, 40), (154, 164, 184), (26, 16, 8)
BOLT_CORE, BOLT_MID, BOLT_EDGE, BOLT_GOLD = (255, 255, 255), (255, 255, 102), (138, 120, 192), (201, 162, 39)

RAMPS = [
    ("OUTLINE / ARENA", [
        ("#0e1018", "outline"), ("#141820", "floor0"), ("#1c2430", "floor1"),
        ("#1a2438", "shade"), ("#243048", "shade2"),
        ("#c9a227", "gold"), ("#e8c547", "gold2"), ("#ffffa0", "cream"),
        ("#3e3e34", "stoneUI"),
    ]),
    ("PLAYER", [
        ("#2a1a48", "p0"), ("#3d2a6a", "p1"), ("#5a4a8a", "p2"),
        ("#8a78c0", "p3"), ("#e8c090", "skin"), ("#ffff66", "bolt"),
    ]),
    ("BRIAR", [
        ("#1e2230", "b0"), ("#3a4258", "b1"), ("#66708a", "b2"),
        ("#a8b2c8", "b3"), ("#5a3a28", "strap"), ("#e8c090", "skin"), ("#e8c547", "accent"),
    ]),
    ("QUILL", [
        ("#142818", "q0"), ("#1a4820", "q1"), ("#2a8a28", "q2"),
        ("#6a4a28", "wood"), ("#a87848", "wood2"), ("#d8b060", "fletch"),
    ]),
    ("CRAWLING HANDS", [
        ("#2a3028", "h0"), ("#4a5646", "h1"), ("#7a8a70", "h2"),
        ("#b0bca0", "h3"), ("#d8dcc8", "h4"), ("#802020", "wound"),
    ]),
    ("TURRET", [
        ("#1a1e28", "t0"), ("#2a3040", "t1"), ("#434c60", "t2"),
        ("#6a7488", "t3"), ("#9aa4b8", "t4"),
    ]),
    ("ARROW", [
        ("#1a1008", "a0"), ("#2a8a28", "fletch"), ("#8a5a28", "shaft"),
        ("#9aa4b8", "head"), ("#d8b060", "nock"),
    ]),
    ("BOLT", [
        ("#5a4a8a", "edge"), ("#8a78c0", "mid"), ("#ffff66", "core"),
        ("#ffffff", "hot"), ("#c9a227", "gold"),
    ]),
]


def hex_to_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def write_palette():
    order = []
    for _, cols in RAMPS:
        for hx, _ in cols:
            if hx not in order:
                order.append(hx)
    (ART / "palette.hex").write_text("\n".join(order) + "\n")
    cell, label_h, pad, gap = 56, 22, 16, 6
    row_h = cell + label_h + 28
    cols_max = max(len(c) for _, c in RAMPS)
    W = pad * 2 + cols_max * (cell + gap) - gap
    H = pad * 2 + 36 + len(RAMPS) * row_h
    img = Image.new("RGB", (W, H), ARENA_BG)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 9)
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
    except Exception:
        font = font_sm = font_title = ImageFont.load_default()
    draw.text((pad, pad), "Contract Board — Hunt Master Palette", fill=CREAM, font=font_title)
    draw.text((pad, pad + 18), "cool · no neon yellow · steel Briar · corpse Hands", fill=(160, 154, 112), font=font_sm)
    y = pad + 40
    for title, colors in RAMPS:
        draw.text((pad, y), title, fill=GOLD, font=font)
        y += 18
        x = pad
        for hx, name in colors:
            rgb = hex_to_rgb(hx)
            draw.rectangle([x, y, x + cell - 1, y + cell - 1], fill=rgb, outline=OUT)
            draw.text((x + 2, y + cell + 2), hx, fill=CREAM, font=font_sm)
            draw.text((x + 2, y + cell + 12), name, fill=(160, 154, 112), font=font_sm)
            x += cell + gap
        y += cell + label_h + 10
    img.save(ART / "palette.png")


class Canvas:
    def __init__(self, w=32, h=48):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    def set(self, x, y, c):
        if c is not None and 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[y][x]
        return None

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, c)

    def paint(self, ox, oy, rows, cmap):
        """Paint string grid. rows are strings; cmap char->color; '.' = empty; ' ' ignored width."""
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch in ('.', ' '):
                    continue
                col = cmap.get(ch)
                if col is not None:
                    self.set(ox + i, oy + j, col)

    def shift_rows(self, dy):
        if dy == 0:
            return
        new = [[None] * self.w for _ in range(self.h)]
        for y in range(self.h):
            ny = y + dy
            if 0 <= ny < self.h:
                new[ny] = self.px[y][:]
        self.px = new

    def shift_cols(self, dx):
        if dx == 0:
            return
        new = [[None] * self.w for _ in range(self.h)]
        for y in range(self.h):
            for x in range(self.w):
                nx = x + dx
                if 0 <= nx < self.w:
                    new[y][nx] = self.px[y][x]
        self.px = new

    def outline(self, color=OUT):
        solid = {(x, y) for y in range(self.h) for x in range(self.w) if self.px[y][x] is not None}
        add = []
        for x, y in solid:
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < self.w and 0 <= ny < self.h and (nx, ny) not in solid:
                    add.append((nx, ny))
        for x, y in add:
            if self.px[y][x] is None:
                self.px[y][x] = color

    def to_image(self):
        im = Image.new("RGBA", (self.w, self.h), TRANSPARENT)
        for y in range(self.h):
            for x in range(self.w):
                c = self.px[y][x]
                if c is not None:
                    im.putpixel((x, y), c if len(c) == 4 else c + (255,))
        return im


# Color maps for grids
# Common: K outline not painted (auto), . empty
PM = {  # player
    '0': P0, '1': P1, '2': P2, '3': P3,
    's': SKIN, 'd': SKIN_S, 'e': OUT,
    'w': WOOD, 'u': WOOD2, 'g': GOLD, 'G': GOLD2,
    'b': B0, 'B': B1, 'f': P_BOLT, 'W': WHITE,
}
BM = {  # briar
    '0': B0, '1': B1, '2': B2, '3': B3,
    's': SKIN, 'd': SKIN_S, 'e': OUT,
    'l': LEATHER, 'L': LEATHER_S, 'g': GOLD, 'G': GOLD2,
    'c': CREAM, 'S': SHADE,
}
QM = {
    '0': Q0, '1': Q1, '2': Q2,
    's': SKIN, 'd': SKIN_S, 'e': OUT,
    'w': WOOD, 'u': WOOD2, 'f': FLETCH, 'g': GOLD,
    'a': A_SHAFT, 'h': A_HEAD, 'n': CREAM, 'z': (200, 200, 180),
}
HM = {
    '0': H0, '1': H1, '2': H2, '3': H3, '4': H4,
    'r': WOUND, 'e': OUT,
}
TM = {
    '0': T0, '1': T1, '2': T2, '3': T3, '4': T4, 'g': GOLD,
}


def player_base():
    """Connected hooded caster, 3/4 right, staff on right. Feet ~45."""
    # 20 cols starting at x=6
    body = [
        # y relative; we'll place at oy
        "......333.........",
        "....332223........",
        "...32211123.......",
        "...3211ss123......",
        "...321sse123......",
        "...3221ss123......",
        "...133222331......",
        "....1222221.......",
        "...112222211......",
        "..11233332211.....",
        "..12333333221.....",
        "..12322222221.....",
        "..12222222221.....",
        "..d1222222221.....",
        ".dd1222222221.....",
        "..11222222211.....",
        "...122222221......",
        "...122222221......",
        "...112222211......",
        "...011111110......",
        "...011111110......",
        "...001111100......",
        "....0011100.......",
        "....bb...bb.......",
        "....bb...bb.......",
        "....bb...bb.......",
    ]
    # staff separate overlay
    return body


def draw_player(pose="idle", n=0):
    c = Canvas()
    by = [0, 0, -1, 0][n % 4] if pose == "idle" else 0
    ox, oy = 5, 12 + by

    body = player_base()
    # attack morphs: adjust arm / lean via overlays
    c.paint(ox, oy, body, PM)

    # connect neck already in grid; deepen hood peak
    # staff: default vertical at right of hand
    # Find hand-ish: around ox+1 area left arm was d's; right hand near ox+2
    # Staff along right side
    staff_x = ox + 15
    staff_top = oy - 2
    staff_bot = oy + 24
    tip_extra = []

    if pose == "attack":
        if n == 0:  # windup — staff tilted back
            staff_x = ox + 13
            staff_top = oy - 4
            # pull arm back hint
            c.rect(ox + 1, oy + 12, ox + 2, oy + 16, SKIN_S)
        elif n == 1:  # cast up
            staff_x = ox + 16
            staff_top = oy - 8
            staff_bot = oy + 18
            c.rect(ox + 14, oy + 10, ox + 16, oy + 14, SKIN)
        elif n == 2:  # release forward
            staff_x = ox + 18
            staff_top = oy - 3
            staff_bot = oy + 16
            tip_extra = True
            c.rect(ox + 15, oy + 11, ox + 18, oy + 14, SKIN)
        else:
            staff_x = ox + 16
            staff_top = oy - 2

    for y in range(staff_top, staff_bot + 1):
        c.set(staff_x, y, WOOD if y > staff_top + 6 else WOOD2)
        c.set(staff_x + 1, y, WOOD)
    # gold tip
    for dy in range(-1, 3):
        c.set(staff_x, staff_top + dy, GOLD2 if dy < 1 else GOLD)
        c.set(staff_x + 1, staff_top + dy, GOLD)
    if pose == "attack" and n == 2:
        # bolt spark at tip
        for dx, dy, col in [
            (2, 0, P_BOLT), (3, 0, WHITE), (4, 0, P_BOLT),
            (3, -1, P3), (3, 1, P3), (5, 0, GOLD2),
        ]:
            c.set(staff_x + dx, staff_top + dy, col)

    # ensure feet on baseline 45
    # boots already in grid near bottom; force baseline pixels
    for x in range(ox + 4, ox + 8):
        c.set(x, 45, B0)
    for x in range(ox + 10, ox + 14):
        c.set(x, 45, B0)

    c.outline()
    return c


def draw_briar(pose="idle", n=0):
    c = Canvas()
    by = [0, 0, -1, 0][n % 4] if pose == "idle" else 0
    legL = legR = arm = 0
    if pose == "walk":
        by = [0, -1, 0, -1][n % 4]
        legL, legR, arm = [(-2, 2, 1), (0, 0, 0), (2, -2, -1), (0, 0, 0)][n % 4]
    body = [
        "......GGG.........",
        ".....33333........",
        "....3322233.......",
        "....321ss233......",
        "....321ee233......",
        "....322ss233......",
        "....33333333......",
        "...333....333.....",
        "..3333....3333....",
        "..333222222333....",
        "..332222222233....",
        "..332222222233....",
        "..s3222222223.....",
        "..ss222222223.....",
        "...3222ll2223.....",
        "...3222lG2223.....",
        "...3222222223.....",
        "...3222222223.....",
        "...2222222222.....",
        "...2222..2222.....",
    ]
    ox, oy = 5, 10 + by
    c.paint(ox, oy, body, BM)
    shield = [".222.", "22122", "21G12", "22122", "22222", ".222.", "..1.."]
    c.paint(ox - 1, oy + 10, shield, BM)
    for i, y in enumerate(range(oy + 20, oy + 31)):
        offL = legL if i > 4 else legL // 2
        offR = legR if i > 4 else legR // 2
        for dx, col in ((0, B1), (1, B2), (2, B3), (3, B1)):
            c.set(ox + 4 + offL + dx, y, col)
        for dx, col in ((0, B1), (1, B3), (2, B2), (3, B1)):
            c.set(ox + 10 + offR + dx, y, col)
    for x in range(ox + 4, ox + 8):
        c.set(x + (legL if pose == "walk" else 0), 44, B0)
        c.set(x + (legL if pose == "walk" else 0), 45, B0)
    for x in range(ox + 10, ox + 14):
        c.set(x + (legR if pose == "walk" else 0), 44, B0)
        c.set(x + (legR if pose == "walk" else 0), 45, B0)
    sx = ox + 16 + arm
    sy = oy + 2
    if pose == "attack":
        if n == 0:
            sx, sy = ox + 14, oy - 2
            for i in range(12):
                c.set(sx - i // 4, sy + i, CREAM if 2 < i < 9 else B3)
                c.set(sx - i // 4 + 1, sy + i, B2)
        elif n == 1:
            sx, sy = ox + 17, oy - 4
            for i in range(12):
                c.set(sx + i // 5, sy + i, CREAM if 2 < i < 9 else B3)
                c.set(sx + i // 5 + 1, sy + i, B2)
        elif n == 2:
            sy = oy + 10
            sx = ox + 14
            for i in range(14):
                c.set(sx + i, sy, CREAM if i < 10 else B3)
                c.set(sx + i, sy + 1, B2)
            c.set(sx + 13, sy, WHITE)
            c.rect(sx - 1, sy, sx + 1, sy + 2, SKIN)
            c.rect(sx - 2, sy + 1, sx, sy + 1, LEATHER)
        else:
            sx, sy = ox + 16, oy + 2
            for i in range(12):
                c.set(sx, sy + i, CREAM if 2 < i < 9 else B3)
                c.set(sx + 1, sy + i, B2)
    else:
        for i in range(13):
            c.set(sx, sy + i, CREAM if 2 < i < 10 else B3)
            c.set(sx + 1, sy + i, B2)
        c.rect(sx - 2, sy + 11, sx + 3, sy + 11, LEATHER)
        c.set(sx, sy + 10, GOLD)
        c.set(sx + 1, sy + 12, LEATHER_S)
        c.set(sx - 1, sy + 12, SKIN)
        c.set(sx + 2, sy + 12, SKIN)
    if pose == "attack" and n != 2:
        c.rect(sx - 2, sy + 10, sx + 3, sy + 10, LEATHER)
        c.set(sx - 1, sy + 11, SKIN)
    c.outline()
    return c


def draw_quill(pose="idle", n=0):
    c = Canvas()
    by = [0, 0, -1, 0][n % 4] if pose == "idle" else 0
    draw_amt = arm = 0
    if pose == "shoot":
        draw_amt, arm = [(1, -1), (4, -3), (0, 2), (0, 0)][n]

    body = [
        ".....2222.........",
        "....221122........",
        "...22100122.......",
        "...210ss012.......",
        "...210se012.......",
        "...2210ss12.......",
        "....122221........",
        "...11222211.......",
        "..1122222211......",
        "..1222222221......",
        ".d1222222221......",
        ".dd122222221......",
        "..1122ww2221......",
        "...122wG2221......",
        "...122222221......",
        "...112222211......",
        "...011111110......",
        "...011..0110......",
    ]
    ox, oy = 5, 12 + by
    c.paint(ox, oy, body, QM)

    # legs / boots
    for y in range(oy + 18, oy + 28):
        c.set(ox + 5, y, Q0); c.set(ox + 6, y, Q1)
        c.set(ox + 10, y, Q0); c.set(ox + 11, y, Q1)
    for x in (ox + 5, ox + 6, ox + 10, ox + 11):
        c.set(x, 44, WOOD); c.set(x, 45, WOOD)

    # bow arm forward
    c.rect(ox + 13, oy + 10, ox + 15, oy + 15, Q1)
    c.set(ox + 15, oy + 14, SKIN); c.set(ox + 16, oy + 14, SKIN)

    # string arm back
    rax = ox + 2 + arm
    c.rect(rax, oy + 10, rax + 2, oy + 15, Q1)
    c.set(rax, oy + 14, SKIN); c.set(rax - 1, oy + 14, SKIN)

    # longbow — tall, distinctive
    bx = ox + 17
    for i, y in enumerate(range(oy - 2, oy + 26)):
        curve = -1 if (i < 6 or i > 20) else 0
        c.set(bx + curve, y, WOOD2)
        c.set(bx + 1 + curve, y, WOOD)
    c.set(bx - 2, oy - 2, WOOD2)
    c.set(bx - 2, oy + 25, WOOD2)

    # string
    sx = bx - 2 - draw_amt
    for y in range(oy, oy + 24):
        c.set(sx, y, CREAM if draw_amt else (210, 210, 190))

    # arrow when drawing
    if pose == "shoot" and n in (0, 1):
        ay = oy + 12
        for x in range(sx, bx):
            c.set(x, ay, A_SHAFT)
        c.set(bx, ay, A_HEAD)
        c.set(sx - 1, ay - 1, Q2)
        c.set(sx - 1, ay + 1, Q2)
        c.set(sx - 1, ay, FLETCH)
    if pose == "shoot" and n == 2:
        ay = oy + 12
        for x in range(bx + 1, min(bx + 7, 30)):
            c.set(x, ay, A_SHAFT)
        c.set(min(bx + 7, 30), ay, A_HEAD)

    c.outline()
    return c


def hand_stamp(c, cx, cy, open_=0, wound=True):
    palm = [
        ".44333..",
        "4443332.",
        "44433321",
        "4433321.",
        "4333211.",
        ".rr1100." if wound else ".221100.",
        "..1100..",
    ]
    fingers = [
        "4.4.4.4.",
        "4343434.",
        "3232323.",
    ]
    if open_:
        fingers = [
            "4.4.4.4.",
            "4.4.4.4.",
            "4343434.",
            "323232..",
        ]
    c.paint(cx, cy - 3 - open_, fingers, HM)
    c.paint(cx, cy, palm, HM)
    c.set(cx + 7, cy + 2, H3)
    c.set(cx + 7, cy + 3, H4)


def draw_hands(pose="idle", n=0):
    c = Canvas()
    bob = [0, -1, 0, 1][n % 4] if pose == "idle" else 0
    crawl = 0
    if pose == "walk":
        crawl = [0, 2, 0, -2][n % 4]
        bob = [0, -1, 0, -1][n % 4]
    if pose == "die":
        if n >= 3:
            for j, row in enumerate([
                "..223=======....",
                ".233444r433221..",
                "233444334332211.",
                "13322r22111000..",
                ".11000110000....",
            ]):
                for i, ch in enumerate(row.replace("=", "2")):
                    if ch in HM:
                        c.set(7 + i, 39 + j, HM[ch])
        else:
            scatter = n * 2
            hand_stamp(c, 2 + scatter, 30 + n, n, True)
            hand_stamp(c, 12, 28 + n, n, False)
            hand_stamp(c, 18 + scatter // 2, 33 + n, max(0, n - 1), True)
            if n < 2:
                hand_stamp(c, 8, 37 + n, 0, True)
        c.outline()
        return c
    open_ = [0, 1, 0, 1][n % 4]
    hand_stamp(c, 2 + crawl // 2, 29 + bob, 0, True)
    hand_stamp(c, 11 + crawl, 24 + bob, open_, False)
    hand_stamp(c, 20 + crawl, 30 + bob, 1 if pose == "walk" else 0, True)
    hand_stamp(c, 7 + crawl // 2, 36 + bob, 0, True)
    if pose == "walk":
        for x in range(27 + crawl, 31 + crawl):
            if x < 31:
                c.set(x, 32 + bob, H4)
                c.set(x, 33 + bob, H3)
    for x in range(3, 29):
        if c.get(x, 43) is not None:
            c.set(x, 44, H0)
    for x in (6, 12, 18, 24):
        c.set(x, 45, H0)
    c.outline()
    return c


def draw_turret():
    c = Canvas(32, 24)
    rows = [
        "..444444444444444444444444..",
        ".43333333333333333333333334.",
        ".43222222222222222222222234.",
        "..422222222222222222222224..",
        "..422211122221112222111224..",
        "..4222111222g1112222111224..",
        "..422222222222222222222224..",
        "..422222222222222222222224..",
        "..421111222222222221111224..",
        "..422222222222222222222224..",
        "..4222222222g2222222222224..",
        "..422222222222222222222224..",
        "..421111222222222221111224..",
        "..422222222222222222222224..",
        "..422222222222222222222224..",
        ".14222222222222222222222241.",
        ".11222222222222222222222211.",
        ".11111111111111111111111111.",
        "0111111111111111111111111110",
        "0000000000000000000000000000",
        ".00000000000000000000000000.",
    ]
    # trim to 32 wide — rows above are 28ish; center
    for j, row in enumerate(rows):
        # pad to 32
        if len(row) < 32:
            pad = (32 - len(row)) // 2
            row = ('.' * pad) + row + ('.' * (32 - pad - len(row)))
        c.paint(0, j, [row[:32]], TM)
    c.outline()
    return c


def draw_arrow():
    c = Canvas(24, 8)
    # fletch | shaft | head
    rows = [
        ".2......................",
        "22f.................4...",
        "2fwaaaaaaaaaaaaaaa44W4..",
        "2fwaaaaaaaaaaaaaaa4444..",
        "22f.................4...",
        ".2......................",
    ]
    am = {'2': Q2, 'f': FLETCH, 'w': WOOD, 'a': A_SHAFT, '4': A_HEAD, 'W': WHITE, '1': Q1}
    c.paint(0, 1, rows, am)
    c.outline()
    return c


def draw_bolt():
    c = Canvas(16, 8)
    rows = [
        "...33...........",
        "..3fffG.........",
        ".3fWWfGGC.......",
        ".3fWWfGGC.......",
        "..3fffG.........",
        "...33...........",
    ]
    bm = {
        '3': P3, 'f': P_BOLT, 'W': WHITE, 'G': GOLD, 'C': CREAM,
        '2': P2, '8': BOLT_EDGE,
    }
    c.paint(1, 1, rows, bm)
    c.outline()
    return c


def strip(frames):
    w, h = frames[0].w, frames[0].h
    out = Image.new("RGBA", (w * len(frames), h), TRANSPARENT)
    for i, fr in enumerate(frames):
        im = fr.to_image()
        out.paste(im, (i * w, 0), im)
    return out


def gen_sprites():
    strip([draw_player("idle", i) for i in range(4)]).save(SPR / "player_idle.png")
    strip([draw_player("attack", i) for i in range(4)]).save(SPR / "player_attack.png")
    strip([draw_briar("idle", i) for i in range(4)]).save(SPR / "briar_idle.png")
    strip([draw_briar("walk", i) for i in range(4)]).save(SPR / "briar_walk.png")
    strip([draw_briar("attack", i) for i in range(4)]).save(SPR / "briar_attack.png")
    strip([draw_quill("idle", i) for i in range(4)]).save(SPR / "quill_idle.png")
    strip([draw_quill("shoot", i) for i in range(4)]).save(SPR / "quill_shoot.png")
    draw_turret().to_image().save(SPR / "quill_turret.png")
    strip([draw_hands("idle", i) for i in range(4)]).save(SPR / "crawling_hands_idle.png")
    strip([draw_hands("walk", i) for i in range(4)]).save(SPR / "crawling_hands_walk.png")
    strip([draw_hands("die", i) for i in range(4)]).save(SPR / "crawling_hands_die.png")
    draw_arrow().to_image().save(SPR / "arrow.png")
    draw_bolt().to_image().save(SPR / "bolt.png")
    print("sprites ok")


def font_pair():
    try:
        return (
            ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11),
            ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13),
        )
    except Exception:
        f = ImageFont.load_default()
        return f, f


def preview_pilot():
    font, font_b = font_pair()
    scale = 3
    labels = [
        ("player_idle.png", "player idle ×4"),
        ("player_attack.png", "player attack ×4"),
        ("briar_idle.png", "briar idle ×4"),
        ("briar_walk.png", "briar walk ×4"),
        ("briar_attack.png", "briar attack ×4"),
        ("quill_idle.png", "quill idle ×4"),
        ("quill_shoot.png", "quill shoot ×4"),
        ("crawling_hands_idle.png", "crawling_hands idle ×4"),
        ("crawling_hands_walk.png", "crawling_hands walk ×4"),
        ("crawling_hands_die.png", "crawling_hands die ×4"),
    ]
    row_imgs = []
    max_w = 0
    for fname, label in labels:
        im = Image.open(SPR / fname).convert("RGBA")
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        row_imgs.append((label, im))
        max_w = max(max_w, im.width)

    tur = Image.open(SPR / "quill_turret.png").convert("RGBA")
    frame = Image.open(SPR / "quill_idle.png").convert("RGBA").crop((0, 0, 32, 48))
    comp = Image.new("RGBA", (36, 68), TRANSPARENT)
    comp.paste(frame, (2, 0), frame)
    comp.paste(tur, (2, 45), tur)  # turret top ~y=0 of turret meets feet ~45
    comp_s = comp.resize((comp.width * scale, comp.height * scale), Image.NEAREST)
    row_imgs.append(("quill on turret", comp_s))
    max_w = max(max_w, comp_s.width)

    arr = Image.open(SPR / "arrow.png").convert("RGBA")
    bol = Image.open(SPR / "bolt.png").convert("RGBA")
    proj = Image.new("RGBA", (120, 24), TRANSPARENT)
    proj.paste(arr, (4, 8), arr)
    proj.paste(bol, (50, 8), bol)
    proj_s = proj.resize((proj.width * scale, proj.height * scale), Image.NEAREST)
    row_imgs.append(("arrow + bolt", proj_s))
    max_w = max(max_w, proj_s.width)

    pad, label_h = 12, 18
    total_h = pad + sum(im.height + label_h + 10 for _, im in row_imgs) + pad
    sheet = Image.new("RGB", (max_w + pad * 2 + 40, total_h), ARENA_BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((pad, 4), "Contract Board — Pilot Pack Preview (3× NN)", fill=CREAM, font=font_b)
    y = pad + 8
    for label, im in row_imgs:
        draw.text((pad, y), label, fill=GOLD2, font=font)
        y += label_h
        sheet.paste(im, (pad, y), im)
        y += im.height + 10
    sheet.save(ART / "preview_pilot.png")
    print("preview_pilot", sheet.size)


def preview_phone():
    font, font_b = font_pair()
    W, H, scale = 390, 220, 2
    img = Image.new("RGB", (W, H), ARENA_BG)
    draw = ImageDraw.Draw(img)
    for y in range(150, H):
        shade = max(10, 18 - (y - 150) // 6)
        draw.line([(0, y), (W, y)], fill=(shade, shade + 2, shade + 6))
    draw.rectangle([0, 0, W - 1, H - 1], outline=OUT)
    draw.text((8, 6), "Hunt arena mock · 390px · sprites 2×", fill=CREAM, font=font)

    def place(path, x, feet_y, fi=0, fw=32, fh=48):
        im = Image.open(SPR / path).convert("RGBA")
        fr = im.crop((fi * fw, 0, fi * fw + fw, fh)).resize((fw * scale, fh * scale), Image.NEAREST)
        img.paste(fr, (x, feet_y - fh * scale), fr)

    place("player_idle.png", 28, 190, 0)
    place("briar_walk.png", 95, 188, 1)
    place("crawling_hands_idle.png", 175, 190, 0)
    place("crawling_hands_walk.png", 235, 185, 2)

    tur = Image.open(SPR / "quill_turret.png").convert("RGBA").resize((64, 48), Image.NEAREST)
    qi = Image.open(SPR / "quill_idle.png").convert("RGBA").crop((0, 0, 32, 48)).resize((64, 96), Image.NEAREST)
    tx, feet = 310, 190
    img.paste(qi, (tx, feet - 96), qi)
    img.paste(tur, (tx, feet - 2), tur)

    bol = Image.open(SPR / "bolt.png").convert("RGBA").resize((32, 16), Image.NEAREST)
    arr = Image.open(SPR / "arrow.png").convert("RGBA").resize((48, 16), Image.NEAREST)
    img.paste(bol, (110, 100), bol)
    img.paste(arr, (260, 95), arr)
    draw.text((8, H - 16), "player · briar · crawling hands · quill+turret · bolt/arrow", fill=(160, 154, 112), font=font)
    img.save(ART / "preview_phone.png")
    print("preview_phone", img.size)


if __name__ == "__main__":
    write_palette()
    gen_sprites()
    preview_pilot()
    preview_phone()
