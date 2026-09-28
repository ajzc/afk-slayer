#!/usr/bin/env python3
"""Compose v3 strips + phone preview matched to locked Option C board."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
import math

V3 = Path(__file__).resolve().parents[1]
FR, SP = V3 / "_frames", V3 / "sprites"
SP.mkdir(exist_ok=True)
TARGET = V3 / "target" / "option_c_locked.png"
GOLD, CREAM = (232, 197, 71), (255, 255, 160)
PURPLE_DMG = (200, 140, 255)

def load(p): return Image.open(p).convert("RGBA")

def strip(d, name):
    frames = [load(p) for p in sorted((FR / d).glob("*.png"))]
    w, h = frames[0].size
    out = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        out.paste(fr, (i * w, 0), fr)
    out.save(SP / name)
    print(name, out.size, "n=", len(frames))

def sparkle(draw, cx, cy, r=7, color=(255, 220, 100, 230)):
    pts = []
    for i in range(8):
        ang = i * math.pi / 4
        rad = r if i % 2 == 0 else r * 0.32
        pts.append((cx + math.cos(ang) * rad, cy + math.sin(ang) * rad))
    draw.polygon(pts, fill=color)
    draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(255, 255, 255, 255))

def last_opaque(im):
    a = im.split()[-1]
    for y in range(im.height - 1, -1, -1):
        if a.crop((0, y, im.width, y + 1)).getbbox():
            return y
    return im.height - 1

def first_opaque(im):
    a = im.split()[-1]
    for y in range(im.height):
        if a.crop((0, y, im.width, y + 1)).getbbox():
            return y
    return 0

def main():
    for d, name in [
        ("player_idle", "player_idle.png"),
        ("player_attack", "player_attack.png"),
        ("briar_idle", "briar_idle.png"),
        ("briar_walk", "briar_walk.png"),
        ("briar_attack", "briar_attack.png"),
        ("quill_idle", "quill_idle.png"),
        ("quill_shoot", "quill_shoot.png"),
        ("crawling_hands_idle", "crawling_hands_idle.png"),
        ("crawling_hands_attack", "crawling_hands_attack.png"),
    ]:
        strip(d, name)
    for src in ("quill_turret.png", "bolt.png", "arrow.png"):
        load(FR / src).save(SP / src)

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
        font_b = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
        font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
        font_dmg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
    except Exception:
        font = font_b = font_sm = font_dmg = ImageFont.load_default()

    floor = load(FR / "arena_floor.png").convert("RGB")
    avg = (28, 32, 40)

    # --- sheet ---
    labels = [
        "player_idle.png", "player_attack.png",
        "briar_idle.png", "briar_walk.png", "briar_attack.png",
        "quill_idle.png", "quill_shoot.png",
        "crawling_hands_idle.png", "crawling_hands_attack.png",
    ]
    rows, max_w = [], 0
    for name in labels:
        im = load(SP / name)
        rows.append((name.replace(".png", ""), im))
        max_w = max(max_w, im.width)
    tur = load(SP / "quill_turret.png")
    qi0 = load(SP / "quill_idle.png").crop((0, 0, 160, 192))
    q_feet, t_top = last_opaque(qi0), first_opaque(tur)
    comp = Image.new("RGBA", (180, q_feet + (tur.height - t_top) + 10), (0, 0, 0, 0))
    comp.paste(tur, (10, q_feet - t_top), tur)
    comp.paste(qi0, (10, 0), qi0)
    rows.append(("quill on turret", comp))
    max_w = max(max_w, comp.width)
    proj = Image.new("RGBA", (300, 70), (0, 0, 0, 0))
    proj.paste(load(SP / "arrow.png"), (10, 12), load(SP / "arrow.png"))
    proj.paste(load(SP / "bolt.png"), (170, 12), load(SP / "bolt.png"))
    rows.append(("arrow + bolt", proj))
    pad, lh = 16, 22
    H = pad + sum(im.height + lh + 12 for _, im in rows) + pad
    sheet = Image.new("RGB", (max_w + pad * 2 + 20, H), avg)
    draw = ImageDraw.Draw(sheet)
    draw.text((pad, 6), "Contract Board v3 — locked Option C pack", fill=CREAM, font=font_b)
    y = pad + 14
    for label, im in rows:
        draw.text((pad, y), label, fill=GOLD, font=font)
        y += lh
        sheet.paste(im, (pad, y), im)
        y += im.height + 12
    sheet.save(V3 / "preview_sheet.png")
    print("sheet", sheet.size)

    # --- phone preview: clean, match board composition ---
    W, H = 420, 300
    bg = floor.resize((W, H), Image.Resampling.LANCZOS)
    bg = ImageEnhance.Brightness(bg).enhance(0.92)
    bg = ImageEnhance.Color(bg).enhance(0.9)
    phone = bg.convert("RGBA")
    # vignette
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vig)
    for i in range(48):
        vd.rectangle([i, i, W - 1 - i, H - 1 - i], outline=(0, 0, 0, min(220, int(i * 3.2))))
    phone = Image.alpha_composite(phone, vig)

    def place(path, x, feet_y, th=78, fi=0, fw=160, fh=192):
        im = load(path)
        if im.height == fh and im.width >= fw:
            im = im.crop((fi * fw, 0, fi * fw + fw, fh))
        sc = th / im.height
        im2 = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.Resampling.LANCZOS)
        phone.paste(im2, (int(x), int(feet_y - im2.height)), im2)
        return im2.size

    # layout similar to locked board L→R
    place(SP / "player_idle.png", 28, 230, 82, 2)
    place(SP / "briar_idle.png", 115, 228, 84, 1)
    place(SP / "crawling_hands_idle.png", 205, 235, 62, 2)

    # quill ON turret
    scale = 72 / 192
    qi_s = qi0.resize((int(160 * scale), 72), Image.Resampling.LANCZOS)
    tur_s = tur.resize((int(tur.width * scale), int(tur.height * scale)), Image.Resampling.LANCZOS)
    q_feet_s, t_top_s = int(q_feet * scale), int(t_top * scale)
    qx, feet = 310, 230
    phone.paste(tur_s, (qx, feet - (tur_s.height - t_top_s)), tur_s)
    phone.paste(qi_s, (qx, feet - q_feet_s), qi_s)

    bolt = load(SP / "bolt.png").resize((48, 24), Image.Resampling.LANCZOS)
    arrow = load(SP / "arrow.png").resize((60, 22), Image.Resampling.LANCZOS)
    phone.paste(bolt, (130, 108), bolt)
    phone.paste(arrow, (270, 100), arrow)

    # sparkles + damage 9 (preview only)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    sparkle(od, 235, 185, r=8)
    sparkle(od, 300, 108, r=6)
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        od.text((288 + dx, 78 + dy), "9", fill=(20, 12, 40, 220), font=font_dmg)
    od.text((288, 78), "9", fill=PURPLE_DMG + (255,), font=font_dmg)
    phone = Image.alpha_composite(phone, overlay)
    phone.convert("RGB").save(V3 / "preview_phone.png")
    print("phone", (W, H))

    # --- side-by-side vs locked target ---
    tgt = Image.open(TARGET).convert("RGB")
    # crop chrome if present — use full board scaled to same height as phone
    ph = phone.convert("RGB")
    th = ph.height
    tw = int(tgt.width * (th / tgt.height))
    tgt_s = tgt.resize((tw, th), Image.Resampling.LANCZOS)
    # match widths roughly for comparison panel
    gap = 12
    label_h = 28
    panel_w = tw + gap + ph.width + 24
    panel_h = th + label_h + 16
    panel = Image.new("RGB", (panel_w, panel_h), (20, 24, 32))
    d = ImageDraw.Draw(panel)
    d.text((12, 6), "LOCKED TARGET (Option C board)", fill=GOLD, font=font_sm)
    d.text((tw + gap + 12, 6), "NEW phone preview", fill=CREAM, font=font_sm)
    panel.paste(tgt_s, (8, label_h))
    panel.paste(ph, (tw + gap + 8, label_h))
    panel.save(V3 / "preview_vs_target.png")
    print("vs_target", panel.size)

if __name__ == "__main__":
    main()
