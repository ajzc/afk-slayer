#!/usr/bin/env python3
"""
AFK Slayer — bright, warm chillhop AFK bed (v3).

Original work: invented harmony (Fmaj9 | G6/9 | Em7 | Cmaj9 in C major) and an
invented bell motif. No third-party melodies, samples, or trademarked titles.

v3 changes vs v2 (user feedback: "low drum noise, too eerie and dull"):
  * NO kick, NO toms, nothing percussive under ~150 Hz.
  * Drums = very soft tonal wood-rim on 2 & 4 + a faint tonal (sine-cluster) hat.
    No noise sources anywhere in the file.
  * Warm, hopeful MAJOR jazz voicings instead of the minor loop.
  * Brighter: electric-piano/bell chord tone (sine + soft 2nd/3rd harmonics,
    quick attack, gentle decay), pad lowpass ~4.5 kHz, gentle 1.5–3 kHz presence.
  * Friendly bell lead a bit more present.
  * Round bass, soft attack, high-passed ~90 Hz (no boom, never reads as a drum).
  * Vinyl/tape hiss removed entirely.
  * 82 BPM, 4 bars, rendered circularly (note tails wrap) → sample-exact seamless
    loop with no crossfade. Mono 44.1 kHz, peak −12.5 dBFS.
"""
from __future__ import annotations

import math
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 82.0
BARS = 4
BEATS_PER_BAR = 4
BEAT = 60.0 / BPM
DURATION = BARS * BEATS_PER_BAR * BEAT  # ≈ 11.707 s
N = int(round(DURATION * SR))

OUT_DIR = Path(__file__).resolve().parent / "loops"
WAV_PATH = OUT_DIR / "afk_bed.wav"
OGG_PATH = OUT_DIR / "afk_bed.ogg"


def midi_to_hz(m: float) -> float:
    return 440.0 * (2.0 ** ((m - 69.0) / 12.0))


# ---------------------------------------------------------------- filters ---
def one_pole_lp(x: np.ndarray, cutoff_hz: float) -> np.ndarray:
    """Circular one-pole LP via FFT (loop-safe)."""
    a = 1.0 - math.exp(-2.0 * math.pi * cutoff_hz / SR)
    m = min(len(x), max(64, int(SR / max(cutoff_hz, 1.0) * 10)))
    h = a * ((1.0 - a) ** np.arange(m, dtype=np.float64))
    return np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(h, n=len(x)), n=len(x))


def one_pole_hp(x: np.ndarray, cutoff_hz: float) -> np.ndarray:
    return x - one_pole_lp(x, cutoff_hz)


def presence(x: np.ndarray, lo: float = 1500.0, hi: float = 3000.0, gain: float = 0.35) -> np.ndarray:
    """Gentle upper-mid lift: add back a soft 1.5–3 kHz band."""
    band = one_pole_lp(one_pole_hp(x, lo), hi)
    return x + gain * band


# ---------------------------------------------------------------- helpers ---
def place_wrapped(buf: np.ndarray, sig: np.ndarray, start: int) -> None:
    """Add sig at start; anything past the end wraps to the loop head."""
    idx = (start + np.arange(len(sig))) % len(buf)
    np.add.at(buf, idx, sig)


def exp_env(n: int, attack_s: float, decay_s: float) -> np.ndarray:
    t = np.arange(n) / SR
    na = max(1, int(attack_s * SR))
    env = np.exp(-t / decay_s)
    env[:na] *= 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, na))
    # guarantee a smooth zero at the tail
    nr = min(n // 3, int(0.03 * SR))
    env[-nr:] *= np.linspace(1.0, 0.0, nr)
    return env


def beat_to_sample(b: float) -> int:
    return int(round(b * BEAT * SR))


# ---------------------------------------------------------------- harmony ---
# Warm, hopeful major-leaning jazz voicings (C major). One chord per bar.
CHORDS = [
    [53, 57, 60, 64, 67],  # Fmaj9  (F A C E G)
    [55, 59, 62, 64, 69],  # G6/9   (G B D E A)
    [52, 55, 59, 62, 67],  # Em7    (E G B D + G on top)
    [48, 55, 59, 62, 64],  # Cmaj9  (C G B D E)  → resolves back to Fmaj9
]
BASS_ROOTS = [41, 43, 40, 48]  # F2 G2 E2 C3


def ep_note(freq: float, dur_s: float, amp: float) -> np.ndarray:
    """Soft electric-piano / bell tone: sine + soft 2nd/3rd harmonics."""
    n = int(dur_s * SR)
    t = np.arange(n) / SR
    ph = 2 * math.pi * freq * t
    sig = (np.sin(ph)
           + 0.22 * np.sin(2 * ph) * np.exp(-t / 0.35)   # brighter at onset
           + 0.07 * np.sin(3 * ph) * np.exp(-t / 0.18)
           + 0.03 * np.sin(2 * math.pi * freq * 4.0 * t) * np.exp(-t / 0.06))
    return sig * exp_env(n, 0.006, 0.9) * amp


def make_keys() -> np.ndarray:
    """Comped EP chords: long hit on beat 1, soft push on the 'and' of 2."""
    out = np.zeros(N)
    for bi, chord in enumerate(CHORDS):
        b0 = bi * BEATS_PER_BAR
        for off, amp, dur in ((0.0, 1.0, 2.6), (2.5, 0.55, 1.8)):
            for vi, m in enumerate(chord):
                strum = vi * 0.008  # tiny roll
                sig = ep_note(midi_to_hz(m), dur * BEAT + 0.4, amp / (1 + 0.12 * vi))
                place_wrapped(out, sig, beat_to_sample(b0 + off) + int(strum * SR))
    return one_pole_lp(out, 5000.0) * 0.060


def make_pad() -> np.ndarray:
    """Soft sustained warmth under the keys (sines, slight detune), LP ~4.5 kHz."""
    out = np.zeros(N)
    bar = beat_to_sample(BEATS_PER_BAR)
    xf = int(0.35 * SR)
    for bi, chord in enumerate(CHORDS):
        n = bar + xf
        t = np.arange(n) / SR
        env = np.ones(n)
        env[:xf] = np.linspace(0, 1, xf)
        env[-xf:] = np.linspace(1, 0, xf)
        v = np.zeros(n)
        for vi, m in enumerate(chord):
            f = midi_to_hz(m + 12 if vi >= 3 else m)
            v += np.sin(2 * math.pi * f * t) + 0.5 * np.sin(2 * math.pi * f * 1.003 * t)
            v += 0.12 * np.sin(2 * math.pi * 2 * f * t)
        place_wrapped(out, v * env, bi * bar - xf // 2)
    return one_pole_lp(one_pole_lp(out, 4500.0), 6000.0) * 0.010


def make_lead() -> np.ndarray:
    """Friendly original bell motif (C major pentatonic-ish, invented)."""
    events = [  # (beat, midi, amp)
        (0.0, 76, 1.0), (1.0, 79, 0.85), (1.5, 81, 0.9), (2.5, 79, 0.8),
        (4.0, 74, 0.95), (5.0, 76, 0.8), (5.5, 79, 0.85), (6.5, 81, 0.75), (7.25, 83, 0.55),
        (8.0, 79, 0.95), (9.0, 76, 0.8), (9.5, 74, 0.8), (10.5, 71, 0.7),
        (12.0, 72, 0.9), (13.0, 74, 0.8), (13.5, 76, 0.85), (14.5, 79, 0.7), (15.25, 74, 0.5),
    ]
    out = np.zeros(N)
    for beat, m, amp in events:
        f = midi_to_hz(m)
        n = int(1.4 * SR)
        t = np.arange(n) / SR
        ph = 2 * math.pi * f * t
        sig = (np.sin(ph)
               + 0.18 * np.sin(2 * ph) * np.exp(-t / 0.25)
               + 0.05 * np.sin(3 * ph) * np.exp(-t / 0.12))
        sig *= exp_env(n, 0.004, 0.42)
        place_wrapped(out, sig * amp, beat_to_sample(beat))
    # small tonal echo (dotted-eighth) for air, circular
    echo = np.roll(out, beat_to_sample(0.75)) * 0.22
    return one_pole_lp(out + echo, 4800.0) * 0.095


def make_bass() -> np.ndarray:
    """Round, soft-attack bass; HP ~90 Hz (2-pole) so it never booms or thumps."""
    out = np.zeros(N)
    for bi, root in enumerate(BASS_ROOTS):
        b0 = bi * BEATS_PER_BAR
        for off, interval, dur_b, amp in ((0.0, 0, 1.9, 1.0), (2.0, 7, 1.0, 0.7), (3.0, 12, 0.9, 0.55)):
            f = midi_to_hz(root + interval)
            n = int((dur_b * BEAT + 0.15) * SR)
            t = np.arange(n) / SR
            ph = 2 * math.pi * f * t
            sig = np.sin(ph) + 0.45 * np.sin(2 * ph) + 0.10 * np.sin(3 * ph)
            env = np.ones(n)
            na = int(0.030 * SR)  # soft 30 ms swell — no percussive onset
            env[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, na))
            nr = int(0.12 * SR)
            env[-nr:] *= np.linspace(1, 0, nr)
            env *= np.exp(-t / 1.6)
            place_wrapped(out, sig * env * amp, beat_to_sample(b0 + off))
    out = one_pole_hp(one_pole_hp(one_pole_hp(out, 92.0), 92.0), 92.0)
    return one_pole_lp(out, 900.0) * 0.085


def make_drums() -> np.ndarray:
    """Very soft tonal rim on 2 & 4 + faint tonal hat. No noise, nothing < 150 Hz."""
    out = np.zeros(N)

    def rim() -> np.ndarray:
        n = int(0.06 * SR)
        t = np.arange(n) / SR
        s = (np.sin(2 * math.pi * 1180 * t) * np.exp(-t / 0.012)
             + 0.6 * np.sin(2 * math.pi * 1790 * t) * np.exp(-t / 0.008)
             + 0.3 * np.sin(2 * math.pi * 2630 * t) * np.exp(-t / 0.005))
        s[:88] *= np.linspace(0, 1, 88)  # 2 ms
        return s

    def hat() -> np.ndarray:
        n = int(0.035 * SR)
        t = np.arange(n) / SR
        s = sum(a * np.sin(2 * math.pi * f * t) for f, a in
                ((5210, 1.0), (6370, 0.8), (7130, 0.6), (8020, 0.4)))
        s *= np.exp(-t / 0.009)
        s[:44] *= np.linspace(0, 1, 44)
        return s

    r, h = rim(), hat()
    swing = 0.07
    for bar in range(BARS):
        b0 = bar * BEATS_PER_BAR
        place_wrapped(out, r * 0.9, beat_to_sample(b0 + 1.0))
        place_wrapped(out, r * 0.8, beat_to_sample(b0 + 3.0))
        for i, off in enumerate((0.5, 1.5, 2.5, 3.5)):
            place_wrapped(out, h * (0.5 if i % 2 else 0.35), beat_to_sample(b0 + off + swing))
    out = one_pole_hp(one_pole_hp(out, 300.0), 300.0)
    return one_pole_lp(out, 7000.0) * 0.032


def normalize_peak(x: np.ndarray, target_dbfs: float = -12.5) -> np.ndarray:
    return x * ((10.0 ** (target_dbfs / 20.0)) / (float(np.max(np.abs(x))) + 1e-12))


def write_wav_mono(path: Path, x: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.round(np.clip(x, -1.0, 1.0) * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def encode_ogg(wav: Path, ogg: Path) -> None:
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav),
                    "-c:a", "libvorbis", "-q:a", "5", "-ar", str(SR), "-ac", "1", str(ogg)],
                   check=True)


def main() -> None:
    print(f"v3 bright chillhop bed @ {BPM} BPM, {DURATION:.3f}s, mono {SR}")
    keys, pad, lead, bass, drums = make_keys(), make_pad(), make_lead(), make_bass(), make_drums()
    for name, s in (("keys", keys), ("pad", pad), ("lead", lead), ("bass", bass), ("drums", drums)):
        print(f"  {name:6s} rms={20*math.log10(np.sqrt(np.mean(s**2))+1e-12):6.1f} dB")
    mix = keys + pad + lead + bass + drums
    mix = presence(mix, 1500.0, 3000.0, 0.6)
    mix = one_pole_hp(mix, 80.0)
    mix = one_pole_lp(mix, 9000.0)
    mix = np.tanh(mix * 2.0) / 2.0  # gentle glue (levels are low; barely engages)
    mix = normalize_peak(mix, -12.5)

    peak = 20 * math.log10(np.max(np.abs(mix)))
    rms = 20 * math.log10(np.sqrt(np.mean(mix ** 2)))
    seam = abs(mix[0] - mix[-1])
    typ = float(np.mean(np.abs(np.diff(mix))))
    mx = float(np.max(np.abs(np.diff(mix))))
    print(f"dur={len(mix)/SR:.3f}s peak={peak:.2f} rms={rms:.2f}")
    print(f"seam_jump={seam:.6f} typ_jump={typ:.6f} max_jump={mx:.6f}")
    write_wav_mono(WAV_PATH, mix)
    encode_ogg(WAV_PATH, OGG_PATH)
    print(f"Wrote {WAV_PATH} and {OGG_PATH}")


if __name__ == "__main__":
    main()
