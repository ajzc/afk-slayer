#!/usr/bin/env python3
"""Compose horizontal strips + preview_sheet/phone from _frames/."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

V2 = Path(__file__).resolve().parents[1]
FR, SP = V2 / "_frames", V2 / "sprites"
SP.mkdir(exist_ok=True)
GOLD, CREAM = (232, 197, 71), (255, 255, 160)

def load(p): return Image.open(p).convert("RGBA")

def strip(d, name):
    frames = [load(p) for p in sorted((FR / d).glob("*.png"))]
    w, h = frames[0].size
    out = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        out.paste(fr, (i * w, 0), fr)
    out.save(SP / name)
    print(name, out.size)

def main():
    for d, name in [
        ("player_idle", "player_idle.png"),
        ("player_attack", "player_attack.png"),
        ("briar_idle", "briar_idle.png"),
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
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        font_b = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
        font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
    except Exception:
        font = font_b = font_sm = ImageFont.load_default()

    floor = load(FR / "arena_floor.png").convert("RGB")
    avg = (28, 34, 48)
    labels = [
        "player_idle.png", "player_attack.png", "briar_idle.png", "briar_attack.png",
        "quill_idle.png", "quill_shoot.png", "crawling_hands_idle.png", "crawling_hands_attack.png",
    ]
    rows, max_w = [], 0
    for name in labels:
        im = load(SP / name)
        rows.append((name.replace(".png", ""), im))
        max_w = max(max_w, im.width)

    tur, qi = load(SP / "quill_turret.png"), load(SP / "quill_idle.png").crop((0, 0, 160, 192))
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
    q_feet, t_top = last_opaque(qi), first_opaque(tur)
    comp = Image.new("RGBA", (170, q_feet + (tur.height - t_top) + 8), (0, 0, 0, 0))
    comp.paste(tur, (5, q_feet - t_top), tur)
    comp.paste(qi, (5, 0), qi)
    rows.append(("quill on turret", comp))
    max_w = max(max_w, comp.width)
    proj = Image.new("RGBA", (280, 64), (0, 0, 0, 0))
    proj.paste(load(SP / "arrow.png"), (10, 8), load(SP / "arrow.png"))
    proj.paste(load(SP / "bolt.png"), (160, 8), load(SP / "bolt.png"))
    rows.append(("arrow + bolt", proj))

    pad, lh = 16, 22
    H = pad + sum(im.height + lh + 12 for _, im in rows) + pad
    sheet = Image.new("RGB", (max_w + pad * 2 + 20, H), avg)
    draw = ImageDraw.Draw(sheet)
    draw.text((pad, 6), "Contract Board — Hunt v2 Low-Poly Pack (full render size)", fill=CREAM, font=font_b)
    y = pad + 14
    for label, im in rows:
        draw.text((pad, y), label, fill=GOLD, font=font)
        y += lh
        sheet.paste(im, (pad, y), im)
        y += im.height + 12
    sheet.save(V2 / "preview_sheet.png")

    W, H = 390, 280
    bg = ImageEnhance.Brightness(floor.resize((W, H), Image.Resampling.LANCZOS)).enhance(0.9)
    phone = bg.convert("RGBA")
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vig)
    for i in range(36):
        vd.rectangle([i, i, W - 1 - i, H - 1 - i], outline=(0, 0, 0, int(i * 2.5)))
    phone = Image.alpha_composite(phone, vig)
    draw = ImageDraw.Draw(phone)
    draw.text((10, 8), "Hunt arena · 390px · ~70px cast · smooth scale", fill=CREAM, font=font_sm)

    def place(path, x, feet_y, th=72, fi=0, fw=160, fh=192):
        im = load(path)
        if im.height == fh and im.width >= fw:
            im = im.crop((fi * fw, 0, fi * fw + fw, fh))
        sc = th / im.height
        im2 = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.Resampling.LANCZOS)
        phone.paste(im2, (x, feet_y - im2.height), im2)

    place(SP / "player_idle.png", 20, 215, 74, 1)
    place(SP / "briar_attack.png", 95, 212, 76, 3)
    place(SP / "crawling_hands_idle.png", 175, 220, 56, 2)
    scale = 70 / 192
    qi_s = qi.resize((int(160 * scale), 70), Image.Resampling.LANCZOS)
    tur_s = tur.resize((int(tur.width * scale), int(tur.height * scale)), Image.Resampling.LANCZOS)
    q_feet_s, t_top_s = int(q_feet * scale), int(t_top * scale)
    qx, feet = 300, 215
    phone.paste(tur_s, (qx, feet - (tur_s.height - t_top_s)), tur_s)
    phone.paste(qi_s, (qx, feet - q_feet_s), qi_s)
    phone.paste(load(SP / "bolt.png").resize((46, 23), Image.Resampling.LANCZOS), (125, 100), load(SP / "bolt.png").resize((46, 23), Image.Resampling.LANCZOS))
    phone.paste(load(SP / "arrow.png").resize((60, 22), Image.Resampling.LANCZOS), (235, 92), load(SP / "arrow.png").resize((60, 22), Image.Resampling.LANCZOS))
    draw.rectangle([0, 0, W - 1, H - 1], outline=(14, 16, 24))
    draw.text((10, H - 18), "player · briar · crawling hands · quill+turret · bolt/arrow", fill=(160, 154, 112), font=font_sm)
    phone.convert("RGB").save(V2 / "preview_phone.png")
    print("previews written")

if __name__ == "__main__":
    main()
