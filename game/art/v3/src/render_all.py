"""
Headless Blender pack renderer for Contract Board Hunt v2.
Usage: blender -b -P art/v2/src/render_all.py
"""
import sys
import os
import math
import json
from pathlib import Path

SRC = Path(__file__).resolve().parent
V2 = SRC.parent  # art/v3
FRAMES = V2 / "_frames"
SPRITES = V2 / "sprites"
FRAMES.mkdir(parents=True, exist_ok=True)
SPRITES.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(SRC))

import bpy
from mathutils import Euler
from common import (
    clear_scene, setup_world, setup_lights, setup_camera, setup_render,
    count_tris, PAL, contact_shadow, cube
)
from models import (
    build_player, build_briar, build_quill, build_turret,
    build_crawling_hands, build_bolt, build_arrow
)

POLY_REPORT = {}
CHAR_W, CHAR_H = 160, 192
PROJ_BOLT = (96, 48)
PROJ_ARROW = (128, 48)


def reset_for_char(ortho=3.4, target_z=1.05):
    clear_scene()
    setup_world()
    setup_lights()
    # yaw ~50: more front-3/4 so eyes, shield emblem, orb cage read like locked board
    setup_camera(ortho_scale=ortho, elev_deg=32, yaw_deg=50, target=(0, 0, target_z))


def render_to(path, w, h):
    setup_render(str(path), w=w, h=h)
    bpy.ops.render.render(write_still=True)


def clear_anim(obj):
    if obj.animation_data:
        obj.animation_data_clear()
    for c in obj.children_recursive:
        if c.animation_data:
            c.animation_data_clear()


def key_rot(obj, frame, euler):
    obj.rotation_euler = euler
    obj.keyframe_insert(data_path="rotation_euler", frame=frame)


def key_loc(obj, frame, loc):
    obj.location = loc
    obj.keyframe_insert(data_path="location", frame=frame)


def set_frame(f):
    bpy.context.scene.frame_set(f)


def render_strip_frames(tag, n_frames, w, h):
    out_dir = FRAMES / tag
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for i in range(n_frames):
        set_frame(i + 1)
        p = out_dir / f"{i:02d}.png"
        render_to(p, w, h)
        paths.append(p)
    return paths


# ---------- animations ----------

def anim_player_idle(parts, n=8):
    piv = parts["staff_pivot"]
    hood = parts["hood"]
    torso = parts["torso"]
    for i in range(n):
        f = i + 1
        tt = i / max(n - 1, 1)
        s = math.sin(tt * math.pi * 2)
        key_loc(hood, f, (0.02, 0, 2.1 + s * 0.08))
        key_loc(torso, f, (0, 0, 1.5 + s * 0.055))
        key_rot(piv, f, Euler((math.radians(s * 12), math.radians(s * 5), 0)))


def anim_player_attack(parts, n=6):
    piv = parts["staff_pivot"]
    tip = parts["tip2"]
    # windup, raise, thrust, glow, recover, settle
    poses = [
        Euler((math.radians(-25), math.radians(10), 0)),
        Euler((math.radians(-55), math.radians(5), 0)),
        Euler((math.radians(10), math.radians(-5), math.radians(15))),
        Euler((math.radians(25), math.radians(-10), math.radians(20))),
        Euler((math.radians(5), 0, math.radians(5))),
        Euler((0, 0, 0)),
    ]
    for i in range(n):
        f = i + 1
        key_rot(piv, f, poses[min(i, len(poses) - 1)])
        # glow pulse mid frames
        em = 4.0 if i in (2, 3) else 1.5
        if tip.data.materials:
            tip.data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = em


def anim_briar_idle(parts, n=8):
    torso = parts["torso"]
    for i in range(n):
        f = i + 1
        tt = i / max(n - 1, 1)
        s = math.sin(tt * math.pi * 2)
        key_loc(torso, f, (0, 0, 1.4 + s * 0.06))
        key_rot(parts["sword_pivot"], f, Euler((math.radians(s * 6), 0, math.radians(s * 8))))
        key_rot(parts["helm"], f, Euler((0, 0, math.radians(s * 3))))


def anim_briar_attack(parts, n=6):
    piv = parts["sword_pivot"]
    # windup back, raise, swing across, follow, recover, rest
    poses = [
        Euler((math.radians(-20), math.radians(30), math.radians(-40))),
        Euler((math.radians(-50), math.radians(10), math.radians(-20))),
        Euler((math.radians(10), math.radians(-40), math.radians(50))),
        Euler((math.radians(30), math.radians(-60), math.radians(80))),
        Euler((math.radians(10), math.radians(-20), math.radians(30))),
        Euler((0, 0, 0)),
    ]
    for i in range(n):
        key_rot(piv, i + 1, poses[i])


def anim_briar_walk(parts, n=8):
    """Weighty walk cycle — alternate legs, torso bob, arm swing."""
    for i in range(n):
        f = i + 1
        tt = i / max(n - 1, 1)
        phase = tt * math.pi * 2
        s = math.sin(phase)
        c = math.cos(phase)
        # legs
        key_loc(parts["thigh_l"], f, (-0.22, s * 0.12, 0.7))
        key_loc(parts["thigh_r"], f, (0.22, -s * 0.12, 0.7))
        key_loc(parts["shin_l"], f, (-0.22, s * 0.14, 0.32 + abs(s) * 0.04))
        key_loc(parts["shin_r"], f, (0.22, -s * 0.14, 0.32 + abs(c) * 0.04))
        key_loc(parts["boot_l"], f, (-0.22, 0.18 + s * 0.16, 0.1 + max(0, s) * 0.08))
        key_loc(parts["boot_r"], f, (0.22, 0.18 - s * 0.16, 0.1 + max(0, -s) * 0.08))
        key_loc(parts["torso"], f, (0, 0, 1.4 + abs(s) * 0.05))
        key_rot(parts["sword_pivot"], f, Euler((0, 0, math.radians(s * 15))))
        key_rot(parts["arm_l"], f, Euler((0, math.radians(15 - s * 20), 0)))


def anim_quill_idle(parts, n=8):
    hood = parts["hood"]
    torso = parts["torso"]
    for i in range(n):
        f = i + 1
        tt = i / max(n - 1, 1)
        s = math.sin(tt * math.pi * 2)
        key_loc(hood, f, (0.05, 0, 1.85 + s * 0.07))
        key_loc(torso, f, (0, 0, 1.2 + s * 0.045))
        key_rot(parts["bow_pivot"], f, Euler((0, 0, math.radians(s * 6))))


def anim_quill_shoot(parts, n=6):
    bow = parts["bow_pivot"]
    arm = parts["arm_r"]
    # draw, full draw, hold, release, follow, recover
    for i in range(n):
        f = i + 1
        if i == 0:
            key_rot(bow, f, Euler((0, math.radians(-5), 0)))
            key_loc(parts["hand_r"], f, (0.35, 0.0, 1.2))
        elif i == 1:
            key_rot(bow, f, Euler((0, math.radians(-8), 0)))
            key_loc(parts["hand_r"], f, (0.15, -0.15, 1.25))
        elif i == 2:
            key_rot(bow, f, Euler((0, math.radians(-8), 0)))
            key_loc(parts["hand_r"], f, (0.1, -0.2, 1.25))
        elif i == 3:
            key_rot(bow, f, Euler((0, math.radians(5), 0)))
            key_loc(parts["hand_r"], f, (0.55, 0.15, 1.2))
        elif i == 4:
            key_rot(bow, f, Euler((0, math.radians(2), 0)))
            key_loc(parts["hand_r"], f, (0.5, 0.1, 1.2))
        else:
            key_rot(bow, f, Euler((0, 0, 0)))
            key_loc(parts["hand_r"], f, (0.5, 0.1, 1.2))


def anim_hands_idle(parts, n=8):
    hands = parts["hands"]
    rests = [(h.location.x, h.location.y, h.location.z) for h in hands]
    for i in range(n):
        f = i + 1
        tt = i / max(n - 1, 1)
        for hi, h in enumerate(hands):
            phase = hi * 0.9
            bob = math.sin(tt * math.pi * 2 + phase) * 0.09
            rest = rests[hi]
            key_loc(h, f, (rest[0] + math.cos(tt * math.pi * 2 + phase) * 0.03, rest[1], rest[2] + bob))
            key_rot(h, f, Euler((math.radians(math.sin(tt * math.pi * 2 + phase) * 14), 0, math.radians(math.cos(tt * math.pi * 2 + phase) * 10))))


def anim_hands_attack(parts, n=6):
    hands = parts["hands"]
    rests = [(h.location.x, h.location.y, h.location.z) for h in hands]
    for i in range(n):
        f = i + 1
        for hi, h in enumerate(hands):
            rest = rests[hi]
            if i == 0:
                key_loc(h, f, rest)
                key_rot(h, f, Euler((0, 0, 0)))
            elif i == 1:  # rear up
                key_loc(h, f, (rest[0], rest[1] - 0.05, rest[2] + 0.35))
                key_rot(h, f, Euler((math.radians(-35), 0, 0)))
            elif i == 2:  # lunge
                key_loc(h, f, (rest[0] + 0.15, rest[1] + 0.35, rest[2] + 0.15))
                key_rot(h, f, Euler((math.radians(25), 0, math.radians(10))))
            elif i == 3:  # grab
                key_loc(h, f, (rest[0] + 0.2, rest[1] + 0.4, rest[2] + 0.05))
                key_rot(h, f, Euler((math.radians(40), 0, 0)))
            elif i == 4:
                key_loc(h, f, (rest[0] + 0.05, rest[1] + 0.1, rest[2] + 0.08))
                key_rot(h, f, Euler((math.radians(10), 0, 0)))
            else:
                key_loc(h, f, rest)
                key_rot(h, f, Euler((0, 0, 0)))


def job_player():
    reset_for_char(3.5, 1.1)
    root, parts = build_player()
    POLY_REPORT["player"] = count_tris(root)
    anim_player_idle(parts, 8)
    render_strip_frames("player_idle", 8, CHAR_W, CHAR_H)
    reset_for_char(3.5, 1.1)
    root, parts = build_player()
    anim_player_attack(parts, 6)
    render_strip_frames("player_attack", 6, CHAR_W, CHAR_H)


def job_briar():
    reset_for_char(3.7, 1.15)
    root, parts = build_briar()
    POLY_REPORT["briar"] = count_tris(root)
    anim_briar_idle(parts, 8)
    render_strip_frames("briar_idle", 8, CHAR_W, CHAR_H)
    reset_for_char(3.7, 1.15)
    root, parts = build_briar()
    anim_briar_walk(parts, 8)
    render_strip_frames("briar_walk", 8, CHAR_W, CHAR_H)
    reset_for_char(3.7, 1.15)
    root, parts = build_briar()
    anim_briar_attack(parts, 6)
    render_strip_frames("briar_attack", 6, CHAR_W, CHAR_H)


def job_quill():
    reset_for_char(3.4, 1.05)
    root, parts = build_quill()
    POLY_REPORT["quill"] = count_tris(root)
    anim_quill_idle(parts, 8)
    render_strip_frames("quill_idle", 8, CHAR_W, CHAR_H)
    reset_for_char(3.4, 1.05)
    root, parts = build_quill()
    # strong shoot with glowing-tip arrow
    from common import cylinder, cone
    from mathutils import Euler
    hold = parts["arrow_hold"]
    shaft = cylinder("tmp_arrow", (0.35, 0, 0), 0.03, 0.9, "wood", hold, verts=5, rot=(0, math.radians(90), 0))
    head = cone("tmp_head", (0.85, 0, 0), 0.07, 0.2, "porb", hold, verts=5, emission=3.5)
    head.rotation_euler = Euler((0, math.radians(90), 0))
    poses_hand = [
        (0.45, 0.05, 1.2), (0.25, -0.1, 1.25), (0.05, -0.25, 1.28),
        (0.6, 0.2, 1.18), (0.55, 0.12, 1.2), (0.5, 0.1, 1.2),
    ]
    bow = parts["bow_pivot"]
    hand = parts["hand_r"]
    for i in range(6):
        f = i + 1
        key_loc(hand, f, poses_hand[i])
        if i < 3:
            key_rot(bow, f, Euler((0, math.radians(-10 - i * 3), 0)))
            key_loc(hold, f, (-0.15 - i * 0.08, 0, 0))
            shaft.hide_render = False
            head.hide_render = False
        else:
            key_rot(bow, f, Euler((0, math.radians(8 if i == 3 else 2), 0)))
            key_loc(hold, f, (0.9 if i == 3 else 1.6, 0, 0))
            shaft.hide_render = i >= 4
            head.hide_render = i >= 4
        shaft.keyframe_insert(data_path="hide_render", frame=f)
        head.keyframe_insert(data_path="hide_render", frame=f)
    render_strip_frames("quill_shoot", 6, CHAR_W, CHAR_H)


def job_turret():
    reset_for_char(ortho=3.0, target_z=0.6)
    root, parts = build_turret()
    POLY_REPORT["quill_turret"] = count_tris(root)
    render_to(FRAMES / "quill_turret.png", CHAR_W, 128)


def job_hands():
    reset_for_char(ortho=3.8, target_z=0.45)
    root, parts = build_crawling_hands()
    POLY_REPORT["crawling_hands"] = count_tris(root)
    anim_hands_idle(parts, 8)
    render_strip_frames("crawling_hands_idle", 8, CHAR_W, CHAR_H)
    reset_for_char(ortho=3.8, target_z=0.45)
    root, parts = build_crawling_hands()
    anim_hands_attack(parts, 6)
    render_strip_frames("crawling_hands_attack", 6, CHAR_W, CHAR_H)


def job_projectiles():
    reset_for_char(ortho=2.2, target_z=0.0)
    # lift camera target
    clear_scene(); setup_world(); setup_lights()
    setup_camera(ortho_scale=2.0, elev_deg=20, yaw_deg=0, target=(0.3, 0, 0))
    build_bolt()
    render_to(FRAMES / "bolt.png", *PROJ_BOLT)

    clear_scene(); setup_world(); setup_lights()
    setup_camera(ortho_scale=2.4, elev_deg=20, yaw_deg=0, target=(0.2, 0, 0))
    build_arrow()
    render_to(FRAMES / "arrow.png", *PROJ_ARROW)


def job_arena_floor():
    """Dark cracked irregular slabs + THIN gold ring only + soft warm pool (no gold disc)."""
    clear_scene()
    setup_world()
    setup_lights()
    setup_camera(ortho_scale=9.5, elev_deg=33, yaw_deg=32, target=(0, 0, 0))
    from common import torus
    # base dark floor
    cube("floor", (0, 0, -0.12), (12, 12, 0.16), "arena0")
    # irregular cracked slabs (cooler slate)
    slabs = [
        (-2.2, -1.8, 2.4, 2.0), (0.3, -2.0, 2.2, 1.8), (2.4, -1.2, 1.8, 2.2),
        (-2.0, 0.6, 2.0, 2.4), (0.2, 0.3, 2.6, 2.2), (2.5, 0.8, 1.9, 2.0),
        (-1.5, 2.5, 2.2, 1.6), (1.0, 2.4, 2.4, 1.8), (-0.5, -0.5, 1.5, 1.4),
    ]
    for i, (x, y, sx, sy) in enumerate(slabs):
        key = "slate" if i % 3 == 0 else ("slate2" if i % 3 == 1 else "arena1")
        cube(f"slab_{i}", (x, y, 0.0), (sx, sy, 0.06), key)
    # crack lines
    for i, (x, y, sx, sy, rz) in enumerate([
        (0.2, -0.3, 4.5, 0.07, 18), (-0.8, 0.5, 3.8, 0.06, -55),
        (1.2, 0.8, 3.2, 0.06, 72), (-1.5, -1.2, 2.8, 0.05, 110),
    ]):
        c = cube(f"crack_{i}", (x, y, 0.04), (sx, sy, 0.025), "arena0")
        c.rotation_euler = Euler((0, 0, math.radians(rz)))
    # soft warm-lit center slabs (NOT gold) — slightly lighter slate under spotlight
    cube("pool_a", (0.1, 0.0, 0.02), (3.2, 3.0, 0.04), "slate_lit")
    cube("pool_b", (-0.8, 0.6, 0.025), (1.8, 1.6, 0.03), "slate2")
    # THIN gold ring only (torus)
    ring = torus("gold_ring", (0, 0, 0.055), major=2.6, minor=0.028, color_key="gold2", major_seg=64, minor_seg=12)
    render_to(FRAMES / "arena_floor.png", 780, 520)


def main():
    print("=== Contract Board v3 Option C render ===")
    job_player()
    job_briar()
    job_quill()
    job_turret()
    job_hands()
    job_projectiles()
    job_arena_floor()
    report = V2 / "poly_report.json"
    report.write_text(json.dumps(POLY_REPORT, indent=2))
    print("POLY", POLY_REPORT)
    print("frames done ->", FRAMES)


if __name__ == "__main__":
    main()
