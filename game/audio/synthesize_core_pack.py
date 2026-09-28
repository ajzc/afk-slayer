#!/usr/bin/env python3
"""
Contract Board — Style A core pack synthesizer
Original procedural audio: dry stone / metal scrap.
numpy + wave only; ffmpeg for Ogg Vorbis.
"""
from __future__ import annotations

import math
import os
import struct
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 44100
ROOT = Path("/workspace/contract-board/audio")
SFX = ROOT / "sfx"
UI = ROOT / "ui"
LOOPS = ROOT / "loops"

# ---------------------------------------------------------------------------
# DSP primitives
# ---------------------------------------------------------------------------

def db_to_lin(db: float) -> float:
    return 10.0 ** (db / 20.0)


def peak_dbfs(x: np.ndarray) -> float:
    p = float(np.max(np.abs(x))) + 1e-12
    return 20.0 * math.log10(p)


def normalize_peak(x: np.ndarray, target_db: float = -1.0) -> np.ndarray:
    p = float(np.max(np.abs(x))) + 1e-12
    return x * (db_to_lin(target_db) / p)


def highpass(x: np.ndarray, cutoff: float = 80.0, order: int = 2) -> np.ndarray:
    """Simple cascaded one-pole highpass (approx Butterworth-ish)."""
    # bilinear-ish one-pole HP
    rc = 1.0 / (2.0 * math.pi * cutoff)
    dt = 1.0 / SR
    a = rc / (rc + dt)
    y = np.zeros_like(x)
    prev_x = 0.0
    prev_y = 0.0
    for _ in range(order):
        for i in range(len(x)):
            y[i] = a * (prev_y + x[i] - prev_x)
            prev_x = x[i]
            prev_y = y[i]
        x = y.copy()
        prev_x = 0.0
        prev_y = 0.0
    return y


def lowpass(x: np.ndarray, cutoff: float = 4000.0) -> np.ndarray:
    rc = 1.0 / (2.0 * math.pi * cutoff)
    dt = 1.0 / SR
    a = dt / (rc + dt)
    y = np.zeros_like(x)
    prev = 0.0
    for i in range(len(x)):
        prev = prev + a * (x[i] - prev)
        y[i] = prev
    return y


def bandpass(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return lowpass(highpass(x, lo, order=1), hi)


def env_exp(n: int, attack: float, decay: float, sustain: float = 0.0) -> np.ndarray:
    """attack/decay in seconds. sustain is level after attack before decay if decay covers rest."""
    e = np.zeros(n, dtype=np.float64)
    a_n = max(1, int(attack * SR))
    d_n = max(1, int(decay * SR))
    a_n = min(a_n, n)
    for i in range(a_n):
        e[i] = i / a_n
    rem = n - a_n
    if rem <= 0:
        return e
    # exponential decay from 1 (or sustain start)
    # use tau so ~exp(-5) at end of decay window
    tau = max(d_n, 1) / 5.0
    for i in range(rem):
        e[a_n + i] = math.exp(-i / tau) * (1.0 if sustain == 0 else sustain + (1 - sustain))
    # if decay shorter than rem, zero after
    if d_n < rem:
        for i in range(d_n, rem):
            e[a_n + i] = e[a_n + d_n - 1] * math.exp(-(i - d_n + 1) / max(tau * 0.5, 1))
    return e


def env_adsr(n: int, a: float, d: float, s: float, r: float) -> np.ndarray:
    ea = max(1, int(a * SR))
    ed = max(1, int(d * SR))
    er = max(1, int(r * SR))
    es = max(0, n - ea - ed - er)
    e = np.zeros(n, dtype=np.float64)
    i = 0
    for k in range(min(ea, n)):
        e[i] = k / ea
        i += 1
    peak = 1.0
    for k in range(min(ed, n - i)):
        e[i] = peak + (s - peak) * (k / ed)
        i += 1
    for k in range(min(es, n - i)):
        e[i] = s
        i += 1
    start = e[i - 1] if i > 0 else s
    for k in range(n - i):
        e[i] = start * math.exp(-5.0 * k / max(er, 1))
        i += 1
    return e


def noise(n: int, rng: np.random.Generator) -> np.ndarray:
    return rng.uniform(-1.0, 1.0, n)


def tone(n: int, freq: float, phase0: float = 0.0) -> np.ndarray:
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t + phase0)


def fm_tone(n: int, carrier: float, mod_ratio: float, index: float, env_mod: np.ndarray | None = None) -> np.ndarray:
    t = np.arange(n) / SR
    mod = np.sin(2 * np.pi * carrier * mod_ratio * t)
    if env_mod is not None:
        mod = mod * env_mod
    return np.sin(2 * np.pi * carrier * t + index * mod)


def chirp(n: int, f0: float, f1: float) -> np.ndarray:
    t = np.arange(n) / SR
    # linear chirp phase
    k = (f1 - f0) / max(t[-1], 1e-9)
    phase = 2 * np.pi * (f0 * t + 0.5 * k * t * t)
    return np.sin(phase)


def early_reflection(x: np.ndarray, delay_ms: float = 28.0, gain_db: float = -20.0) -> np.ndarray:
    d = int(delay_ms * 0.001 * SR)
    g = db_to_lin(gain_db)
    y = x.copy()
    if d < len(x):
        y[d:] += g * x[: len(x) - d]
    return y


def mix(*parts: np.ndarray, length: int | None = None) -> np.ndarray:
    if length is None:
        length = max(len(p) for p in parts)
    out = np.zeros(length, dtype=np.float64)
    for p in parts:
        out[: len(p)] += p
    return out


def place(src: np.ndarray, dest: np.ndarray, at_ms: float, gain: float = 1.0) -> None:
    i = int(at_ms * 0.001 * SR)
    end = min(len(dest), i + len(src))
    if end > i:
        dest[i:end] += gain * src[: end - i]


def soft_clip(x: np.ndarray, drive: float = 1.2) -> np.ndarray:
    return np.tanh(x * drive) / math.tanh(drive)


# ---------------------------------------------------------------------------
# Writers
# ---------------------------------------------------------------------------

def write_wav(path: Path, x: np.ndarray) -> None:
    x = np.clip(x, -1.0, 1.0)
    pcm = (x * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def wav_to_ogg(wav_path: Path, ogg_path: Path, bitrate: str = "112k") -> None:
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(wav_path),
            "-c:a", "libvorbis", "-b:a", bitrate,
            str(ogg_path),
        ],
        check=True,
    )


def finalize(x: np.ndarray, path_stem: Path, target_db: float = -1.0, tiny_er: bool = True) -> dict:
    """HP, optional tiny ER, normalize, write wav+ogg. Returns meta."""
    x = highpass(x, 85.0, order=2)
    if tiny_er:
        x = early_reflection(x, delay_ms=26.0, gain_db=-22.0)
    x = soft_clip(x, 1.15)
    # fade edges before normalize so peak target sticks
    fade = max(1, int(0.002 * SR))
    if len(x) > fade * 2:
        x[-fade:] *= np.linspace(1, 0, fade)
        x[:fade] *= np.linspace(0, 1, fade)
    x = normalize_peak(x, target_db)
    wav_p = path_stem.with_suffix(".wav")
    ogg_p = path_stem.with_suffix(".ogg")
    write_wav(wav_p, x)
    wav_to_ogg(wav_p, ogg_p)
    dur_ms = 1000.0 * len(x) / SR
    return {
        "path": str(ogg_p.relative_to(ROOT)),
        "wav": str(wav_p.relative_to(ROOT)),
        "dur_ms": round(dur_ms, 1),
        "peak_dbfs": round(peak_dbfs(x), 2),
        "samples": len(x),
    }


# ---------------------------------------------------------------------------
# Sound designers
# ---------------------------------------------------------------------------

def make_bolt_fire(seed: int, variant: str) -> np.ndarray:
    rng = np.random.default_rng(seed)
    dur = 0.09 + rng.uniform(0, 0.025)  # 90–115 ms
    n = int(dur * SR)
    # scrap zip: bandpassed noise chirp + metallic FM
    nz = noise(n, rng)
    nz = bandpass(nz, 1800 + rng.integers(-200, 200), 7000)
    zip_env = env_exp(n, 0.002, 0.055)
    # pitch-ish modulation of amplitude via chirp carrier
    f0 = 2200 + rng.uniform(-150, 200)
    f1 = 4800 + rng.uniform(-300, 400)
    zip = nz * zip_env * (0.55 + 0.45 * (0.5 + 0.5 * chirp(n, f0, f1)))
    # metal bolt body short
    body_n = int(0.045 * SR)
    body = fm_tone(body_n, 900 + rng.uniform(-80, 120), 2.7, 1.8 + rng.uniform(0, 0.6),
                   env_exp(body_n, 0.001, 0.04))
    body *= env_exp(body_n, 0.001, 0.04) * 0.35
    body = highpass(body, 400)
    # dry magic tip — very short bright tick at end-ish
    tip_start = int(0.04 * SR)
    tip_n = int(0.035 * SR)
    tip = fm_tone(tip_n, 3200 + rng.uniform(-200, 300), 5.1, 0.9,
                  env_exp(tip_n, 0.0005, 0.025))
    tip *= env_exp(tip_n, 0.0005, 0.028) * 0.28
    tip = bandpass(tip, 2500, 9000)
    out = mix(zip * 0.9, length=n)
    place(body, out, 0, 1.0)
    place(tip, out, tip_start * 1000 / SR, 1.0)
    return out


def make_bolt_hit(seed: int, variant: str) -> np.ndarray:
    rng = np.random.default_rng(seed)
    dur = 0.11 + rng.uniform(0, 0.045)  # 110–155
    n = int(dur * SR)
    # flesh/stone thud: low-mid noise burst + damped sine
    thud_n = int(0.07 * SR)
    thud_nz = bandpass(noise(thud_n, rng), 120, 900)
    thud_nz *= env_exp(thud_n, 0.0015, 0.055) * 0.7
    f = 180 + rng.uniform(-30, 40)
    thud_tone = tone(thud_n, f) * env_exp(thud_n, 0.001, 0.06) * 0.55
    thud_tone2 = tone(thud_n, f * 1.7) * env_exp(thud_n, 0.001, 0.04) * 0.25
    # spark
    spark_n = int(0.05 * SR)
    spark = bandpass(noise(spark_n, rng), 3000, 10000)
    spark *= env_exp(spark_n, 0.0005, 0.03) * 0.45
    tick = fm_tone(spark_n, 2400 + rng.uniform(-200, 200), 3.2, 2.0) * env_exp(spark_n, 0.0004, 0.025) * 0.2
    out = mix(thud_nz, thud_tone, thud_tone2, length=n)
    place(spark + tick, out, 8, 1.0)
    return out


def make_briar_swing() -> np.ndarray:
    rng = np.random.default_rng(42)
    dur = 0.18
    n = int(dur * SR)
    # whoosh: filtered noise with rising then falling cutoff feel via envelope shaping
    whoosh_n = int(0.12 * SR)
    wh = bandpass(noise(whoosh_n, rng), 400, 4500)
    # Doppler-ish: multiply by chirp amp
    wh *= (0.4 + 0.6 * np.abs(chirp(whoosh_n, 200, 900)))
    wh *= env_adsr(whoosh_n, 0.015, 0.04, 0.5, 0.05) * 0.55
    # metal bite at ~90ms
    bite_n = int(0.08 * SR)
    bite_nz = bandpass(noise(bite_n, rng), 2000, 8000) * env_exp(bite_n, 0.001, 0.045) * 0.5
    bite_m = fm_tone(bite_n, 1100, 2.3, 3.5) * env_exp(bite_n, 0.0008, 0.05) * 0.4
    bite_m = highpass(bite_m, 600)
    out = np.zeros(n)
    place(wh, out, 0, 1.0)
    place(bite_nz + bite_m, out, 85, 1.0)
    return out


def make_quill_arrow_fire() -> np.ndarray:
    rng = np.random.default_rng(77)
    dur = 0.10
    n = int(dur * SR)
    # wood string: short pitched pluck + soft noise
    pluck_n = int(0.08 * SR)
    # Karplus-ish: noise burst into decaying resonant filter (sim with decaying harmonics)
    f = 420
    pluck = (
        tone(pluck_n, f) * 0.5
        + tone(pluck_n, f * 2.01) * 0.25
        + tone(pluck_n, f * 3.1) * 0.12
        + bandpass(noise(pluck_n, rng), 800, 5000) * 0.35
    )
    pluck *= env_exp(pluck_n, 0.0008, 0.07)
    # release click
    click = bandpass(noise(int(0.015 * SR), rng), 1500, 6000) * env_exp(int(0.015 * SR), 0.0003, 0.01) * 0.4
    out = mix(pluck * 0.85, length=n)
    place(click, out, 0, 1.0)
    return out


def make_quill_arrow_hit() -> np.ndarray:
    rng = np.random.default_rng(88)
    dur = 0.125
    n = int(dur * SR)
    # dry pierce thunk
    thunk_n = int(0.09 * SR)
    f = 260
    thunk = tone(thunk_n, f) * env_exp(thunk_n, 0.001, 0.055) * 0.5
    thunk += tone(thunk_n, f * 2.4) * env_exp(thunk_n, 0.001, 0.035) * 0.22
    pierce = bandpass(noise(int(0.04 * SR), rng), 2500, 9000) * env_exp(int(0.04 * SR), 0.0004, 0.025) * 0.4
    wood = bandpass(noise(thunk_n, rng), 400, 2000) * env_exp(thunk_n, 0.002, 0.05) * 0.35
    out = mix(thunk, wood, length=n)
    place(pierce, out, 5, 1.0)
    return out


def make_mob_death(seed: int) -> np.ndarray:
    """v2 clean tonal kill-confirm — NO noise beds / hiss / grit washes."""
    rng = np.random.default_rng(seed)
    # A/B: tiny pitch + duration drift ≤3%
    pitch = 1.0 + rng.uniform(-0.025, 0.025)
    dur = 0.20 + rng.uniform(0.0, 0.05)  # ~200–250 ms
    n = int(dur * SR)
    out = np.zeros(n, dtype=np.float64)

    # 1) Soft low thud — decaying sine ~140–165 Hz, ~100 ms, mild downward chirp
    thud_n = int((0.095 + rng.uniform(0, 0.02)) * SR)
    f0 = (155.0 + rng.uniform(-12, 12)) * pitch
    f1 = f0 * 0.78
    thud = chirp(thud_n, f0, f1) * env_exp(thud_n, 0.002, 0.085) * 0.92
    # gentle 2nd partial for body (still tonal, not noise)
    thud += tone(thud_n, f0 * 2.0) * env_exp(thud_n, 0.0015, 0.055) * 0.18
    place(thud, out, 0.0, 1.0)

    # 2) Mid body — quieter triangle-ish ~250–290 Hz, shorter
    mid_n = int((0.055 + rng.uniform(0, 0.012)) * SR)
    mid_f = (265.0 + rng.uniform(-20, 20)) * pitch
    t = np.arange(mid_n) / SR
    # soft triangle via odd harmonics (no noise)
    mid = (
        np.sin(2 * np.pi * mid_f * t)
        - (1.0 / 9.0) * np.sin(2 * np.pi * mid_f * 3 * t)
    )
    mid *= env_exp(mid_n, 0.0015, 0.045) * 0.38
    place(mid, out, 4.0 + rng.uniform(0, 3), 1.0)

    # 3) Reward tick — short high sine + fifth partial ~1.4–1.6 kHz, ~35–45 ms
    tick_n = int((0.035 + rng.uniform(0, 0.012)) * SR)
    tick_f = (1480.0 + rng.uniform(-80, 80)) * pitch
    tick = (
        tone(tick_n, tick_f) * 0.55
        + tone(tick_n, tick_f * 1.5) * 0.28
        + tone(tick_n, tick_f * 2.0) * 0.12
    )
    tick *= env_exp(tick_n, 0.0008, 0.028) * 0.22
    place(tick, out, 28.0 + rng.uniform(0, 8), 1.0)

    # 4) Tiny definition click — 1–2 ms pure sine half-burst (NOT a noise burst)
    click_n = max(2, int((0.0012 + rng.uniform(0, 0.0006)) * SR))
    click_f = 3200.0 * pitch
    click = tone(click_n, click_f) * env_exp(click_n, 0.00005, 0.0010) * 0.55
    place(click, out, 0.0, 1.0)

    return out


def make_task_complete() -> np.ndarray:
    rng = np.random.default_rng(101)
    dur = 0.40
    n = int(dur * SR)
    # metal confirm
    metal_n = int(0.12 * SR)
    metal = (
        fm_tone(metal_n, 880, 2.0, 1.5) * 0.35
        + bandpass(noise(metal_n, rng), 2000, 6000) * 0.25
        + tone(metal_n, 1320) * 0.2
    )
    metal *= env_exp(metal_n, 0.002, 0.09)
    # soft 2-note gold chime (not neon) — warm fifth-ish, short
    # A4-ish 440 then E5 660 — gold, dry
    note1_n = int(0.22 * SR)
    note2_n = int(0.28 * SR)
    n1 = (
        tone(note1_n, 523.25) * 0.4  # C5
        + tone(note1_n, 523.25 * 2) * 0.08
        + tone(note1_n, 523.25 * 3) * 0.04
    ) * env_exp(note1_n, 0.004, 0.18)
    n2 = (
        tone(note2_n, 659.25) * 0.38  # E5
        + tone(note2_n, 659.25 * 2) * 0.07
    ) * env_exp(note2_n, 0.004, 0.22)
    # gentle shimmer grit
    shimmer = bandpass(noise(int(0.15 * SR), rng), 3000, 8000) * env_exp(int(0.15 * SR), 0.01, 0.1) * 0.12
    out = np.zeros(n)
    place(metal, out, 0, 1.0)
    place(n1, out, 40, 0.85)
    place(n2, out, 110, 0.8)
    place(shimmer, out, 50, 1.0)
    return out


def make_monster_unlock() -> np.ndarray:
    rng = np.random.default_rng(202)
    dur = 0.35
    n = int(dur * SR)
    # stone reveal: rumble grit opening
    stone_n = int(0.22 * SR)
    stone = bandpass(noise(stone_n, rng), 100, 800) * env_adsr(stone_n, 0.02, 0.06, 0.4, 0.1) * 0.55
    stone += bandpass(noise(stone_n, rng), 600, 2500) * env_exp(stone_n, 0.015, 0.15) * 0.3
    # short bright tick
    tick_n = int(0.08 * SR)
    tick = (
        fm_tone(tick_n, 1800, 3.5, 1.2) * 0.35
        + tone(tick_n, 2400) * 0.2
        + bandpass(noise(tick_n, rng), 4000, 10000) * 0.2
    ) * env_exp(tick_n, 0.001, 0.055)
    out = np.zeros(n)
    place(stone, out, 0, 1.0)
    place(tick, out, 180, 1.0)
    return out


def make_signature_drop() -> np.ndarray:
    rng = np.random.default_rng(303)
    dur = 0.45
    n = int(dur * SR)
    # dry magic shimmer — memorable, not choir
    # cascading short FM sparks + filtered noise veil
    out = np.zeros(n)
    base_freqs = [740, 880, 1110, 1480, 1760]
    t0 = 20
    for i, f in enumerate(base_freqs):
        sn = int((0.12 - i * 0.012) * SR)
        spark = fm_tone(sn, f, 4.0 + i * 0.3, 1.5 - i * 0.15) * env_exp(sn, 0.002, 0.08 - i * 0.008)
        spark *= 0.28 - i * 0.03
        place(spark, out, t0 + i * 35, 1.0)
    veil_n = int(0.35 * SR)
    veil = bandpass(noise(veil_n, rng), 2000, 9000) * env_adsr(veil_n, 0.03, 0.08, 0.35, 0.18) * 0.22
    # soft root tone
    root_n = int(0.3 * SR)
    root = tone(root_n, 370) * env_exp(root_n, 0.01, 0.25) * 0.18
    place(veil, out, 30, 1.0)
    place(root, out, 10, 1.0)
    return out


def make_chest_open() -> np.ndarray:
    rng = np.random.default_rng(404)
    dur = 0.33
    n = int(dur * SR)
    # latch click
    click_n = int(0.06 * SR)
    click = (
        bandpass(noise(click_n, rng), 2500, 9000) * 0.5
        + fm_tone(click_n, 1600, 2.8, 2.5) * 0.35
        + tone(click_n, 900) * 0.15
    ) * env_exp(click_n, 0.0005, 0.04)
    # soft contents
    cont_n = int(0.22 * SR)
    cont = bandpass(noise(cont_n, rng), 400, 3000) * env_exp(cont_n, 0.01, 0.15) * 0.35
    # soft coin-ish
    coin_n = int(0.1 * SR)
    coin = tone(coin_n, 1200) * env_exp(coin_n, 0.001, 0.08) * 0.15
    coin2_n = int(0.08 * SR)
    coin2 = tone(coin2_n, 1800) * env_exp(coin2_n, 0.001, 0.06) * 0.1
    out = np.zeros(n)
    place(click, out, 0, 1.0)
    place(cont, out, 55, 1.0)
    place(coin, out, 90, 1.0)
    place(coin2, out, 105, 1.0)
    return out


def make_upgrade_purchase() -> np.ndarray:
    rng = np.random.default_rng(505)
    dur = 0.24
    n = int(dur * SR)
    # coin / metal confirm
    c1_n = int(0.08 * SR)
    c1 = (
        tone(c1_n, 1400) * 0.4
        + tone(c1_n, 2100) * 0.25
        + bandpass(noise(c1_n, rng), 3000, 9000) * 0.3
    ) * env_exp(c1_n, 0.0008, 0.055)
    c2_n = int(0.1 * SR)
    c2 = (
        tone(c2_n, 1680) * 0.35
        + tone(c2_n, 2520) * 0.2
        + bandpass(noise(c2_n, rng), 3500, 10000) * 0.22
    ) * env_exp(c2_n, 0.0008, 0.07)
    body = bandpass(noise(int(0.06 * SR), rng), 800, 3000) * env_exp(int(0.06 * SR), 0.002, 0.04) * 0.25
    out = np.zeros(n)
    place(body, out, 0, 1.0)
    place(c1, out, 8, 1.0)
    place(c2, out, 55, 0.9)
    return out


def make_empty_task_nudge() -> np.ndarray:
    rng = np.random.default_rng(606)
    dur = 0.15
    n = int(dur * SR)
    # soft wood knock — quiet character
    knock_n = int(0.12 * SR)
    knock = (
        tone(knock_n, 220) * 0.35
        + tone(knock_n, 440) * 0.15
        + bandpass(noise(knock_n, rng), 300, 1800) * 0.4
    ) * env_exp(knock_n, 0.0015, 0.09)
    knock = lowpass(knock, 3500)
    out = np.zeros(n)
    place(knock, out, 5, 1.0)
    return out


def make_afk_bed() -> np.ndarray:
    """Seamless 7s loop: dry cool stone + distant scrap hush. Peak ~-1 dBFS.

    Louder mid grit for phone speakers; engine gain 0.2 still ducks under SFX.
    Processing (HP/LP/clip/normalize) happens BEFORE overlap-add so the seam stays clean.
    """
    rng = np.random.default_rng(707)
    dur = 7.0
    xf_sec = 0.35
    n = int(dur * SR)
    xf = int(xf_sec * SR)
    n_gen = n + xf
    t = np.arange(n_gen) / SR

    # Modulators with periods that divide `dur` so phase is continuous across seam
    breath = 0.55 + 0.45 * np.sin(2 * np.pi * (1.0 / dur) * t + 0.3)
    breath2 = 0.70 + 0.30 * np.sin(2 * np.pi * (2.0 / dur) * t + 1.1)
    scrap_mod = 0.45 + 0.55 * (0.5 + 0.5 * np.sin(2 * np.pi * (1.0 / dur) * t + 2.0))
    drone_mod = 0.80 + 0.20 * np.sin(2 * np.pi * t / dur)
    grit_mod = 0.65 + 0.35 * np.sin(2 * np.pi * (3.0 / dur) * t + 0.7)

    # Cool stone bed — denser than before so mean stays audible after gain 0.2
    base = bandpass(noise(n_gen, rng), 120, 1100) * breath * breath2 * 0.34

    # Mid grit layer (~700–2800 Hz) — phone-speaker presence without becoming melodic
    mid_grit = bandpass(noise(n_gen, rng), 700, 2800) * grit_mod * breath2 * 0.22

    # Distant scrap hush + soft ticks (kept off the seam)
    scrap = bandpass(noise(n_gen, rng), 1600, 5800)
    scrap_env = np.full(n_gen, 0.14, dtype=np.float64)
    for k in range(5):
        frac = 0.15 + 0.70 * (k / 4.0)
        center = int(frac * n)
        width = int(0.09 * SR)
        for j in range(-width, width):
            idx = center + j
            if 0 <= idx < n_gen:
                scrap_env[idx] += 0.16 * math.exp(-(j / (width * 0.35)) ** 2)
            idx2 = center + j + n
            if 0 <= idx2 < n_gen:
                scrap_env[idx2] += 0.16 * math.exp(-(j / (width * 0.35)) ** 2)
    scrap *= scrap_mod * scrap_env

    drone1 = tone(n_gen, 110.0) * 0.035 * drone_mod
    drone2 = tone(n_gen, 165.0) * 0.022 * (0.8 + 0.2 * np.sin(2 * np.pi * t / dur + 1.5))
    dust = bandpass(noise(n_gen, rng), 3500, 9000) * 0.05 * breath

    raw = base + mid_grit + scrap + drone1 + drone2 + dust
    # Process FULL buffer before OLA
    raw = highpass(raw, 85.0, order=2)
    raw = lowpass(raw, 7500)
    raw = soft_clip(raw, 1.08)
    # Peak-normalize the loop body region (approx) to one-shot level
    body_peak = float(np.max(np.abs(raw[:n]))) + 1e-12
    raw = raw * (db_to_lin(-1.0) / body_peak)

    # Overlap-add seamless loop:
    # out[0:xf] = raw[0:xf]*sin + raw[n:n+xf]*cos  so out[0]≈raw[n], continuous from raw[n-1]
    fi = np.sin(0.5 * np.pi * np.linspace(0.0, 1.0, xf))
    fo = np.cos(0.5 * np.pi * np.linspace(0.0, 1.0, xf))
    out = raw[:n].copy()
    out[:xf] = raw[:xf] * fi + raw[n:n + xf] * fo
    # Re-peak after OLA (crossfade can nudge peak slightly)
    out = normalize_peak(out, -1.0)
    return out


def finalize_loop(x: np.ndarray, path_stem: Path) -> dict:
    """AFK bed already loop-safe + leveled; just write wav+ogg."""
    wav_p = path_stem.with_suffix(".wav")
    ogg_p = path_stem.with_suffix(".ogg")
    write_wav(wav_p, x)
    wav_to_ogg(wav_p, ogg_p, bitrate="128k")
    dur_ms = 1000.0 * len(x) / SR
    return {
        "path": str(ogg_p.relative_to(ROOT)),
        "wav": str(wav_p.relative_to(ROOT)),
        "dur_ms": round(dur_ms, 1),
        "peak_dbfs": round(peak_dbfs(x), 2),
        "samples": len(x),
    }



def main():
    SFX.mkdir(parents=True, exist_ok=True)
    UI.mkdir(parents=True, exist_ok=True)
    LOOPS.mkdir(parents=True, exist_ok=True)

    metas = []
    gains = {
        "bolt_fire": 0.55,
        "bolt_hit": 0.75,
        "briar_swing": 0.65,
        "quill_arrow_fire": 0.5,
        "quill_arrow_hit": 0.7,
        "mob_death": 0.85,
        "task_complete": 0.9,
        "monster_unlock": 0.85,
        "signature_drop": 0.9,
        "chest_open": 0.85,
        "upgrade_purchase": 0.75,
        "empty_task_nudge": 0.25,
        "afk_bed": 0.2,
    }

    print("Synthesizing bolt_fire variants...")
    for i, v in enumerate("abc"):
        m = finalize(make_bolt_fire(1000 + i * 17, v), SFX / f"bolt_fire_{v}")
        m["gain"] = gains["bolt_fire"]
        m["id"] = f"bolt_fire_{v}"
        metas.append(m)

    print("Synthesizing bolt_hit variants...")
    for i, v in enumerate("abc"):
        m = finalize(make_bolt_hit(2000 + i * 19, v), SFX / f"bolt_hit_{v}")
        m["gain"] = gains["bolt_hit"]
        m["id"] = f"bolt_hit_{v}"
        metas.append(m)

    print("Synthesizing briar_swing...")
    m = finalize(make_briar_swing(), SFX / "briar_swing")
    m["gain"] = gains["briar_swing"]
    m["id"] = "briar_swing"
    metas.append(m)

    print("Synthesizing quill_arrow_fire...")
    m = finalize(make_quill_arrow_fire(), SFX / "quill_arrow_fire")
    m["gain"] = gains["quill_arrow_fire"]
    m["id"] = "quill_arrow_fire"
    metas.append(m)

    print("Synthesizing quill_arrow_hit...")
    m = finalize(make_quill_arrow_hit(), SFX / "quill_arrow_hit")
    m["gain"] = gains["quill_arrow_hit"]
    m["id"] = "quill_arrow_hit"
    metas.append(m)

    print("Synthesizing mob_death variants...")
    for i, v in enumerate("ab"):
        m = finalize(make_mob_death(3000 + i * 23), SFX / f"mob_death_{v}")
        m["gain"] = gains["mob_death"]
        m["id"] = f"mob_death_{v}"
        metas.append(m)

    print("Synthesizing task_complete...")
    m = finalize(make_task_complete(), SFX / "task_complete")
    m["gain"] = gains["task_complete"]
    m["id"] = "task_complete"
    metas.append(m)

    print("Synthesizing monster_unlock...")
    m = finalize(make_monster_unlock(), SFX / "monster_unlock")
    m["gain"] = gains["monster_unlock"]
    m["id"] = "monster_unlock"
    metas.append(m)

    print("Synthesizing signature_drop...")
    m = finalize(make_signature_drop(), SFX / "signature_drop")
    m["gain"] = gains["signature_drop"]
    m["id"] = "signature_drop"
    metas.append(m)

    print("Synthesizing chest_open...")
    m = finalize(make_chest_open(), SFX / "chest_open")
    m["gain"] = gains["chest_open"]
    m["id"] = "chest_open"
    metas.append(m)

    print("Synthesizing upgrade_purchase...")
    m = finalize(make_upgrade_purchase(), SFX / "upgrade_purchase")
    m["gain"] = gains["upgrade_purchase"]
    m["id"] = "upgrade_purchase"
    metas.append(m)

    print("Synthesizing empty_task_nudge...")
    m = finalize(make_empty_task_nudge(), UI / "empty_task_nudge", tiny_er=False)
    m["gain"] = gains["empty_task_nudge"]
    m["id"] = "empty_task_nudge"
    metas.append(m)

    print("Synthesizing afk_bed loop...")
    m = finalize_loop(make_afk_bed(), LOOPS / "afk_bed")
    m["gain"] = gains["afk_bed"]
    m["id"] = "afk_bed"
    metas.append(m)

    # Write FILES.md
    md_path = ROOT / "core-pack-FILES.md"
    lines = [
        "# Contract Board — Core Pack Files",
        "",
        "Style **A**: dry stone / metal scrap. Original procedural synthesis (numpy).",
        "Masters: 44.1 kHz mono WAV + Ogg Vorbis (~96–128 kbps).",
        "One-shots and AFK bed peak-normalized ≈ −1 dBFS; engine gain 0.2 still applies to afk_bed.",
        "",
        "| ID | Path (ogg) | WAV | Duration (ms) | Peak dBFS | Engine gain |",
        "|---|---|---|---:|---:|---:|",
    ]
    for m in metas:
        lines.append(
            f"| `{m['id']}` | `{m['path']}` | `{m['wav']}` | {m['dur_ms']} | {m['peak_dbfs']} | {m['gain']} |"
        )
    lines.extend([
        "",
        "## Notes",
        "",
        "- All content original; no copyrighted samples.",
        "- Mobile-friendly: highpassed ≈ 85 Hz.",
        "- Dry aesthetic: short decays, optional tiny early reflection (~26 ms @ −22 dB) on one-shots.",
        "- `afk_bed`: 7.0 s seamless loop (overlap-add); peak −1.0 dBFS; engine gain 0.2 still applies.",
        "- Gains from `core-pack.md` / `AUDIO_BIBLE.md`.",
        "",
    ])
    md_path.write_text("\n".join(lines) + "\n")
    print(f"Wrote {md_path}")
    print(f"Generated {len(metas)} cues.")
    for m in metas:
        print(f"  {m['id']}: {m['dur_ms']} ms, peak {m['peak_dbfs']} dBFS")


if __name__ == "__main__":
    main()
