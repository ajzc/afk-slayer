"""Targeted re-renders after first pack pass."""
import sys, math
from pathlib import Path
SRC = Path(__file__).resolve().parent
sys.path.insert(0, str(SRC))
import bpy
from mathutils import Euler
from common import clear_scene, setup_world, setup_lights, setup_camera, setup_render, count_tris
from models import build_player, build_quill, build_arrow, build_turret
from render_all import (
    reset_for_char, render_strip_frames, render_to, clear_anim, key_rot, key_loc, set_frame,
    CHAR_W, CHAR_H, FRAMES, POLY_REPORT
)

def anim_player_idle_strong(parts, n=6):
    piv = parts["staff_pivot"]
    hood = parts["hood"]
    torso = parts["torso"]
    for i in range(n):
        f = i + 1
        t = i / max(n - 1, 1)
        s = math.sin(t * math.pi * 2)
        key_loc(hood, f, (0.05, 0, 2.15 + s * 0.06))
        key_loc(torso, f, (0, 0, 1.55 + s * 0.04))
        key_rot(piv, f, Euler((math.radians(s * 10), math.radians(s * 4), 0)))

def anim_quill_shoot_strong(parts, n=6):
    bow = parts["bow_pivot"]
    hand = parts["hand_r"]
    # Parent a temp arrow to arrow_hold for draw frames
    hold = parts["arrow_hold"]
    # build tiny arrow mesh parented
    from common import cylinder, cone, cube
    shaft = cylinder("tmp_arrow", (0.35, 0, 0), 0.03, 0.9, "wood", hold, verts=5, rot=(0, math.radians(90), 0))
    head = cone("tmp_head", (0.85, 0, 0), 0.06, 0.18, "t4", hold, verts=5)
    head.rotation_euler = Euler((0, math.radians(90), 0))
    poses_hand = [
        (0.45, 0.05, 1.2),
        (0.25, -0.1, 1.25),
        (0.05, -0.25, 1.28),
        (0.6, 0.2, 1.18),
        (0.55, 0.12, 1.2),
        (0.5, 0.1, 1.2),
    ]
    for i in range(n):
        f = i + 1
        key_loc(hand, f, poses_hand[i])
        if i < 3:
            key_rot(bow, f, Euler((0, math.radians(-10 - i * 3), 0)))
            key_loc(hold, f, (-0.15 - i * 0.08, 0, 0))
            shaft.hide_render = False
            head.hide_render = False
        else:
            key_rot(bow, f, Euler((0, math.radians(8 if i == 3 else 2), 0)))
            key_loc(hold, f, (0.8 if i == 3 else 1.5, 0, 0))
            # hide after release
            shaft.hide_render = i >= 4
            head.hide_render = i >= 4
        shaft.keyframe_insert(data_path="hide_render", frame=f)
        head.keyframe_insert(data_path="hide_render", frame=f)

def anim_quill_idle_strong(parts, n=6):
    hood = parts["hood"]
    torso = parts["torso"]
    bow = parts["bow_pivot"]
    for i in range(n):
        f = i + 1
        t = i / max(n - 1, 1)
        s = math.sin(t * math.pi * 2)
        key_loc(hood, f, (0.05, 0, 1.85 + s * 0.045))
        key_loc(torso, f, (0, 0, 1.2 + s * 0.03))
        key_rot(bow, f, Euler((0, 0, math.radians(s * 5))))

def main():
    # player idle
    reset_for_char(3.5, 1.1)
    root, parts = build_player()
    anim_player_idle_strong(parts, 6)
    render_strip_frames("player_idle", 6, CHAR_W, CHAR_H)

    # quill idle + shoot
    reset_for_char(3.4, 1.05)
    root, parts = build_quill()
    anim_quill_idle_strong(parts, 6)
    render_strip_frames("quill_idle", 6, CHAR_W, CHAR_H)

    reset_for_char(3.4, 1.05)
    root, parts = build_quill()
    anim_quill_shoot_strong(parts, 6)
    render_strip_frames("quill_shoot", 6, CHAR_W, CHAR_H)

    # cooler arena floor — bigger, cooler, softer gold ring
    clear_scene(); setup_world(); setup_lights()
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.name == "KeyLight":
            o.data.energy = 280
            o.data.color = (0.95, 0.95, 1.0)
        if o.type == "LIGHT" and o.name == "RimLight":
            o.data.energy = 100
    setup_camera(ortho_scale=9.0, elev_deg=33, yaw_deg=32, target=(0, 0, 0))
    from common import cube, cylinder
    cube("floor", (0, 0, -0.08), (10, 10, 0.12), "arena0")
    cube("pad", (0, 0, 0.0), (5, 5, 0.04), "arena1")
    pool = cylinder("pool", (0, 0, 0.04), 2.4, 0.03, "arena2", verts=32)
    ring = cylinder("ring", (0, 0, 0.05), 2.55, 0.02, "gold", verts=32)
    # hollow-ish: scale ring thin by using another darker inner — skip
    render_to(FRAMES / "arena_floor.png", 780, 520)
    print("rerender fixes done")

if __name__ == "__main__":
    main()
