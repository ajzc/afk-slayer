#!/usr/bin/env python3
"""
AFK Slayer — "feel 1" SFX add-on (original synthesis, matches the v3 clean pack).

New cues: coin_land_a|b|c, gold_countup_tick, boss_death, crit_hit, ui_denied.

HARD RULE (same as v3): no white/pink/filtered noise, no noise whooshes, no random
sources. Only sines, soft harmonics, inharmonic bell/metal partials (pure tones),
soft additive brass-like tones, short exponential pitch slides and <3 ms sine clicks.
Pitches sit in C / F major to match the v3 chillhop bed and the other chimes.

Every file: >=3 ms raised-cosine fade-in, >=15 ms fade-out (first/last sample = 0),
2nd-order HP 150 Hz, peak -1 dBFS, mono 44.1 kHz WAV + Ogg Vorbis q5.
Reuses the primitives + finalize() from synthesize_clean_sfx_v3.py.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from synthesize_clean_sfx_v3 import (  # noqa: E402  (reuse v3 helpers / aesthetic)
    SFX, SR, bell, buf, click, env, finalize, hz, partials, place, sweep, t_axis,
)


# ------------------------------------------------------------ extra tonal primitives ---
def harm_sweep(f0: float, f1: float, ms: float, decay_ms: float, amps, attack_ms: float = 2.0,
               glide_ms: float | None = None, spread_phase: bool = False) -> np.ndarray:
    """Exponential pitch glide with a stack of harmonics (amps[k-1] for harmonic k).
    Harmonic k decays a little faster than the fundamental. Tonal only.
    spread_phase: Schroeder-style fixed phase offsets per harmonic (lower crest factor)."""
    n = int(ms * 0.001 * SR)
    t = t_axis(n)
    g = (glide_ms or ms) * 0.001
    f = f0 * (f1 / f0) ** np.minimum(t / g, 1.0)
    ph = 2 * math.pi * np.cumsum(f) / SR
    out = np.zeros(n)
    for k, a in enumerate(amps, start=1):
        if a == 0 or f0 * k > SR * 0.45:
            continue
        phi = math.pi * k * (k - 1) / len(amps) if spread_phase else 0.0
        out += a * np.sin(k * ph + phi) * env(n, attack_ms, decay_ms / (1 + 0.35 * (k - 1)))
    return out


def brass(freq: float, ms: float, decay_ms: float, attack_ms: float = 7.0,
          bright: float = 1.0) -> np.ndarray:
    """Soft brass-like horn tone: harmonics ~1/k^1.4, slightly slower attack, and a tiny
    upward pitch 'lip' settle (starts ~25 cents flat). Additive, tonal only."""
    n = int(ms * 0.001 * SR)
    t = t_axis(n)
    fcur = freq * (1 - 0.0145 * np.exp(-t / 0.018))
    ph = 2 * math.pi * np.cumsum(fcur) / SR
    out = np.zeros(n)
    for k in range(1, 8):
        if freq * k > 7000:
            break
        a = (1.0 / k ** 1.4) * (bright if k > 1 else 1.0)
        # higher harmonics bloom a touch later (brass 'opening up') then decay faster
        e = env(n, attack_ms + 2.5 * (k - 1), decay_ms / (1 + 0.3 * (k - 1)))
        out += a * np.sin(k * ph) * e
    return out


def triangle_tone(f0: float, f1: float, ms: float, decay_ms: float, attack_ms: float = 4.0) -> np.ndarray:
    """Soft band-limited triangle (odd harmonics 1, 1/9, 1/25, 1/49) with a gentle glide."""
    n = int(ms * 0.001 * SR)
    t = t_axis(n)
    f = f0 * (f1 / f0) ** (t / (ms * 0.001))
    ph = 2 * math.pi * np.cumsum(f) / SR
    out = np.zeros(n)
    for i, k in enumerate((1, 3, 5, 7)):
        out += ((-1) ** i) / k ** 2 * np.sin(k * ph)
    return out * env(n, attack_ms, decay_ms)


# ------------------------------------------------------------------ cues ---
# Coin partial sets are deliberately different from upgrade_purchase's (1 / 2 / 2.72):
# no octave partial, a small low "body" partial, and a tiny second bounce so the cue
# reads as a single coin landing instead of a two-note confirm.
COIN_SPECS = {
    "a": (hz("D6"), [(1.0, 1.0, 19), (2.43, 0.30, 9), (3.86, 0.09, 5), (0.5, 0.10, 12)]),
    "b": (hz("F6"), [(1.0, 1.0, 12), (2.56, 0.26, 8), (4.07, 0.07, 5), (0.5, 0.10, 11)]),
    "c": (hz("G6"), [(1.0, 1.0, 14), (2.34, 0.24, 8), (3.71, 0.06, 4), (0.5, 0.10, 10)]),
}


def coin_land(var: str) -> np.ndarray:
    """Small bright coin tink: fast-decay inharmonic metal partials + tiny second bounce."""
    f, spec = COIN_SPECS[var]
    out = buf(90)
    place(out, partials(f, 90, spec, attack_ms=0.8), 0, 1.0)
    bounce_at = {"a": 26, "b": 23, "c": 29}[var]
    place(out, partials(f * 1.004, 60, [(r, a, d * 0.7) for r, a, d in spec], attack_ms=0.8),
          bounce_at, 0.32)
    place(out, click(3200, 1.5), 0, 0.08)
    return out


def gold_countup_tick() -> np.ndarray:
    """Barely-there soft tick: C7 sine with very fast decay over a softer C6 body."""
    out = buf(30)
    place(out, partials(hz("C7"), 30, [(1.0, 1.0, 5.0)], attack_ms=1.0), 0, 1.0)
    place(out, partials(hz("C6"), 30, [(1.0, 1.0, 6.0)], attack_ms=1.0), 0, 0.45)
    return out


def soft_sat(x: np.ndarray, drive: float = 1.5) -> np.ndarray:
    """Gentle deterministic tanh soft-knee (tames chord crest peaks so the cue can sit
    louder at the same -1 dBFS peak). Adds only low-level tonal harmonics."""
    x = x / (np.max(np.abs(x)) + 1e-12)
    return np.tanh(drive * x) / math.tanh(drive)


def boss_death() -> np.ndarray:
    """Big tonal payoff: deep pitch-dropping harmonic sine impact + mid thud,
    then a rising C5-E5-G5-C6 bell/brass arpeggio that blooms into a chord,
    with a soft G6/C7/E7 shimmer tail. No noise."""
    out = buf(1050)
    # 1) deep impact: 120 -> 58 Hz body; harmonics 2..5 (240-600 Hz) carry it on phones
    place(out, harm_sweep(120, 58, 620, 240, [0.6, 0.85, 0.7, 0.5, 0.32],
                          attack_ms=2.5, glide_ms=380, spread_phase=True), 0, 0.95)
    # 2) mid thud (~262 -> 170 Hz) + short wood-ish knock to give the hit definition
    # (layers staggered by a few ms so their first crests don't pile onto one sample)
    place(out, harm_sweep(262, 170, 220, 60, [1.0, 0.45, 0.2], attack_ms=1.5), 3.0, 0.6)
    place(out, partials(520, 90, [(1.0, 1.0, 24), (2.32, 0.35, 12)], attack_ms=1.0), 5.5, 0.34)
    place(out, click(2400, 2.0), 1.0, 0.14)
    # 3) triumphant rising arpeggio -> chord bloom (C major), bell + soft brass per note
    notes = ("C5", "E5", "G5", "C6")
    start, step = 120, 70
    for i, n in enumerate(notes):
        at = start + step * i
        ln = 1050 - at
        place(out, brass(hz(n), ln, 460 - 30 * i), at, 0.30 + 0.03 * i)
        place(out, bell(hz(n), ln, 400, sparkle=0.8), at, 0.34 + 0.04 * i)
    # low C4 root swells under the bloom for weight (brass only)
    place(out, brass(hz("C4"), 1050 - 330, 460, attack_ms=25), 330, 0.22)
    # 4) shimmer tail: soft G6/C7/E7 with gentle tremolo, pure sines
    shn = int(0.66 * SR)
    t = t_axis(shn)
    trem = 0.72 + 0.28 * np.sin(2 * math.pi * 14 * t)
    sh = (np.sin(2 * math.pi * hz("G6") * t) + 0.75 * np.sin(2 * math.pi * hz("C7") * t)
          + 0.4 * np.sin(2 * math.pi * hz("E7") * t)) * trem
    sh *= env(shn, 70, 300)
    place(out, sh, 360, 0.15)
    return soft_sat(out, 2.0)


def crit_hit() -> np.ndarray:
    """Crit layer (plays with bolt_hit): sine-click + fast tonal snap, bright metal ring
    around G6 and a ~180 Hz harmonic sine punch. Punch starts 4 ms late so its first
    crest doesn't stack on bolt_hit's first crest."""
    out = buf(130)
    place(out, click(3400, 2.0), 0, 0.30)
    place(out, sweep(2000, 700, 14, 5, attack_ms=0.6), 0, 0.42)             # tonal snap
    ring = partials(hz("G6"), 125, [(1.0, 1.0, 34), (2.76, 0.28, 16), (5.40, 0.07, 8)],
                    attack_ms=0.8)
    place(out, ring, 2, 0.46)
    place(out, harm_sweep(180, 135, 110, 30, [1.0, 0.55, 0.3], attack_ms=2.0), 4, 0.70)
    return out


def ui_denied() -> np.ndarray:
    """Friendly soft 'nope': two gentle triangle bumps E4 -> C4 (~330 -> ~262 Hz)."""
    out = buf(125)
    place(out, triangle_tone(hz("E4"), hz("E4") * 0.97, 60, 26, attack_ms=4.0), 0, 0.9)
    place(out, triangle_tone(hz("C4"), hz("C4") * 0.96, 70, 30, attack_ms=4.0), 55, 1.0)
    return out


CUES = {
    SFX / "coin_land_a": lambda: coin_land("a"),
    SFX / "coin_land_b": lambda: coin_land("b"),
    SFX / "coin_land_c": lambda: coin_land("c"),
    SFX / "gold_countup_tick": gold_countup_tick,
    SFX / "boss_death": boss_death,
    SFX / "crit_hit": crit_hit,
    SFX / "ui_denied": ui_denied,
}

FADES = {  # (fade_in_ms, fade_out_ms)
    "coin_land_a": (3, 18), "coin_land_b": (3, 18), "coin_land_c": (3, 18),
    "gold_countup_tick": (3, 15), "boss_death": (3, 80), "crit_hit": (3, 20),
    "ui_denied": (4, 20),
}


def main() -> None:
    for stem, fn in CUES.items():
        fi, fo = FADES[stem.name]
        meta = finalize(fn(), stem, fade_in_ms=fi, fade_out_ms=fo)
        print(f"{stem.relative_to(SFX.parent)}  {meta['ms']} ms")


if __name__ == "__main__":
    main()
