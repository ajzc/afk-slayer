#!/usr/bin/env python3
"""
Original soft chillhop / lo-fi AFK bed for Contract Board.

Invented harmony (Am9–Fmaj7–Cmaj7–Em9) + original flute-like motif.
No third-party melodies, samples, or trademarked titles.
"""
from __future__ import annotations

import math
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 75.0
BARS = 4
BEATS_PER_BAR = 4
DURATION = BARS * BEATS_PER_BAR * (60.0 / BPM)  # 12.8 s pre-crossfade
N = int(round(DURATION * SR))

OUT_DIR = Path(__file__).resolve().parent / "loops"
WAV_PATH = OUT_DIR / "afk_bed.wav"
OGG_PATH = OUT_DIR / "afk_bed.ogg"


def midi_to_hz(m: float) -> float:
    return 440.0 * (2.0 ** ((m - 69.0) / 12.0))


def soft_clip(x: np.ndarray, drive: float = 1.10) -> np.ndarray:
    return (np.tanh(x * drive) / math.tanh(drive)).astype(np.float64)


def one_pole_lp(x: np.ndarray, cutoff_hz: float) -> np.ndarray:
    """Circular one-pole LP via FFT IR (loop-friendly, fast)."""
    a = 1.0 - math.exp(-2.0 * math.pi * cutoff_hz / SR)
    m = min(len(x), max(64, int(SR / max(cutoff_hz, 1.0) * 10)))
    h = a * ((1.0 - a) ** np.arange(m, dtype=np.float64))
    return np.fft.irfft(
        np.fft.rfft(x) * np.fft.rfft(h, n=len(x)), n=len(x)
    ).real.astype(np.float64)


def one_pole_hp(x: np.ndarray, cutoff_hz: float) -> np.ndarray:
    return (x - one_pole_lp(x, cutoff_hz)).astype(np.float64)


def apply_wow_flutter(x: np.ndarray, depth: float = 0.0012) -> np.ndarray:
    n = len(x)
    t = np.arange(n, dtype=np.float64) / SR
    dur = n / SR
    # Integer cycles over buffer → phase-continuous at wrap
    r1 = 4.0 / dur
    r2 = 1.0 / dur
    mod = depth * SR * np.sin(2.0 * math.pi * r1 * t)
    mod += (depth * 0.4 * SR) * np.sin(2.0 * math.pi * r2 * t + 1.7)
    idx = np.mod(np.arange(n, dtype=np.float64) - mod, n)
    i0 = np.floor(idx).astype(np.int64)
    i1 = (i0 + 1) % n
    frac = idx - i0
    return ((1.0 - frac) * x[i0] + frac * x[i1]).astype(np.float64)


def adsr(n: int, a: float, d: float, s: float, r: float) -> np.ndarray:
    env = np.zeros(n, dtype=np.float64)
    na, nd, nr = max(1, int(a * SR)), max(1, int(d * SR)), max(1, int(r * SR))
    ns = max(0, n - na - nd - nr)
    i = 0
    env[i : i + na] = np.linspace(0.0, 1.0, na, endpoint=False)
    i += na
    env[i : i + nd] = np.linspace(1.0, s, nd, endpoint=False)
    i += nd
    if ns:
        env[i : i + ns] = s
        i += ns
    remain = n - i
    if remain > 0:
        env[i:] = np.linspace(s if (ns or nd) else 1.0, 0.0, remain)
    return env


def make_pad() -> np.ndarray:
    """Warm jazz-ish pad. Original progression: Am9 | Fmaj7 | Cmaj7 | Em9."""
    chords = [
        [45, 48, 52, 55, 59],  # Am9
        [41, 45, 48, 52],  # Fmaj7
        [48, 52, 55, 59],  # Cmaj7
        [40, 43, 47, 50, 54],  # Em9
    ]
    out = np.zeros(N, dtype=np.float64)
    bar_len = int(round((BEATS_PER_BAR * 60.0 / BPM) * SR))
    t_global = np.arange(N, dtype=np.float64) / SR

    for bi, chord in enumerate(chords):
        start = bi * bar_len
        end = N if bi == BARS - 1 else (bi + 1) * bar_len
        n = end - start
        t = np.arange(n, dtype=np.float64) / SR
        fade = 0.55
        env = np.ones(n, dtype=np.float64)
        nf = int(fade * SR)
        env[:nf] *= np.linspace(0.0, 1.0, nf)
        env[-nf:] *= np.linspace(1.0, 0.0, nf)

        voice = np.zeros(n, dtype=np.float64)
        for mi, m in enumerate(chord):
            f = midi_to_hz(m)
            phase = 2.0 * math.pi * f * t
            sine = np.sin(phase)
            tri = sine - 0.12 * np.sin(3 * phase) / 3 + 0.04 * np.sin(5 * phase) / 5
            saw = sine + sum((0.18 / h) * np.sin(h * phase) for h in range(2, 6))
            mix = 0.55 * sine + 0.30 * tri + 0.15 * saw
            f2 = f * (1.0012 if mi % 2 == 0 else 0.9988)
            mix += 0.22 * np.sin(2.0 * math.pi * f2 * t)
            voice += mix / (1.0 + 0.18 * mi)

        voice /= max(1.0, len(chord) * 0.55)
        out[start:end] += voice * env * 0.30

    # Soft Am glue drone so the loop seam stays tonal
    drone = np.zeros(N, dtype=np.float64)
    for m, amp in ((45, 0.08), (52, 0.05), (59, 0.03)):
        drone += amp * np.sin(2.0 * math.pi * midi_to_hz(m) * t_global)
    out += drone
    out = one_pole_lp(one_pole_lp(out, 1700.0), 1300.0)
    breath = 0.94 + 0.06 * np.sin(2.0 * math.pi * (1.0 / DURATION) * t_global)
    return out * breath


def make_lead() -> np.ndarray:
    """Quiet original flute-like motif (invented notes only)."""
    out = np.zeros(N, dtype=np.float64)
    events = [
        (0.0, 76, 0.55, 0.11),
        (0.75, 74, 0.40, 0.09),
        (1.5, 71, 0.70, 0.10),
        (2.5, 69, 0.90, 0.095),
        (4.5, 71, 0.45, 0.07),
        (5.75, 67, 0.55, 0.065),
        (8.0, 77, 0.50, 0.10),
        (8.75, 76, 0.40, 0.09),
        (9.5, 72, 0.65, 0.095),
        (10.5, 69, 0.85, 0.09),
        (12.0, 71, 0.50, 0.08),
        (13.25, 67, 0.70, 0.07),
        (14.5, 64, 0.90, 0.075),
    ]
    beat_sec = 60.0 / BPM
    for beat, midi, dur_beats, amp in events:
        start = int(round(beat * beat_sec * SR))
        n = int(round(dur_beats * beat_sec * SR))
        if start >= N:
            continue
        n = min(n, N - start)
        t = np.arange(n, dtype=np.float64) / SR
        f = midi_to_hz(midi)
        sig = (
            0.72 * np.sin(2.0 * math.pi * f * t)
            + 0.18 * np.sin(2.0 * math.pi * 2 * f * t)
            + 0.08 * np.sin(2.0 * math.pi * 3 * f * t)
        )
        env = adsr(n, 0.025, 0.08, 0.55, max(0.08, dur_beats * beat_sec * 0.45))
        vib = 1.0 + 0.004 * np.sin(2.0 * math.pi * 5.2 * t) * np.clip(t / 0.15, 0, 1)
        out[start : start + n] += sig * env * vib * amp
    return one_pole_lp(out, 3200.0) * 0.145


def make_bass() -> np.ndarray:
    """Warm walking roots; energy kept usable above ~80–90 Hz for phones."""
    roots = [45, 41, 48, 40]  # A2, F2, C3, E2
    out = np.zeros(N, dtype=np.float64)
    bar_len = int(round((BEATS_PER_BAR * 60.0 / BPM) * SR))
    beat_len = int(round((60.0 / BPM) * SR))
    for bi, root in enumerate(roots):
        start = bi * bar_len
        for beat_off, midi, dur_b, amp in (
            (0.0, root, 1.6, 1.0),
            (2.0, root + 7, 1.4, 0.75),
            (3.0, root - 2, 0.85, 0.55),
        ):
            f = midi_to_hz(midi)
            while f < 82.0:
                midi += 12
                f = midi_to_hz(midi)
            s = start + int(round(beat_off * beat_len))
            n = int(round(dur_b * (60.0 / BPM) * SR))
            if s >= N:
                continue
            n = min(n, N - s)
            t = np.arange(n, dtype=np.float64) / SR
            phase = 2.0 * math.pi * f * t
            sig = 0.85 * np.sin(phase) + 0.12 * np.sin(3 * phase) / 3.0
            env = adsr(n, 0.015, 0.14, 0.72, max(0.18, dur_b * 0.28))
            out[s : s + n] += sig * env * amp
    return one_pole_hp(one_pole_lp(out, 280.0), 85.0) * 0.34


def make_drums() -> np.ndarray:
    """Soft swung boom-bap — stays under the pad."""
    out = np.zeros(N, dtype=np.float64)
    beat_sec = 60.0 / BPM
    rng = np.random.default_rng(42)

    def place(sig: np.ndarray, at_beat: float, amp: float) -> None:
        s = int(round(at_beat * beat_sec * SR))
        if s >= N:
            return
        n = min(len(sig), N - s)
        out[s : s + n] += sig[:n] * amp

    def kick() -> np.ndarray:
        n = int(0.22 * SR)
        t = np.arange(n, dtype=np.float64) / SR
        f = 95.0 * (0.55 ** (t / 0.22))
        phase = 2.0 * math.pi * np.cumsum(f) / SR
        body = np.sin(phase) * np.exp(-t * 14.0)
        click = np.exp(-t * 120.0) * 0.35 * np.sin(2.0 * math.pi * 180 * t)
        return one_pole_lp(body + click, 400.0)

    def snare_rim() -> np.ndarray:
        n = int(0.14 * SR)
        t = np.arange(n, dtype=np.float64) / SR
        noise = one_pole_lp(one_pole_hp(rng.normal(0, 1, n), 1200.0), 4500.0)
        body = np.sin(2.0 * math.pi * 180 * t) * np.exp(-t * 28.0) * 0.35
        return noise * np.exp(-t * 38.0) * 0.55 + body

    def hihat(open_: bool = False) -> np.ndarray:
        n = int((0.045 if not open_ else 0.09) * SR)
        t = np.arange(n, dtype=np.float64) / SR
        noise = one_pole_lp(one_pole_hp(rng.normal(0, 1, n), 6000.0), 12000.0)
        return noise * np.exp(-t * (55.0 if not open_ else 28.0))

    k, sn, hh, hho = kick(), snare_rim(), hihat(False), hihat(True)
    swing = 0.08
    for bar in range(BARS):
        b0 = bar * BEATS_PER_BAR
        place(k, b0 + 0.0, 0.50)
        place(k, b0 + 2.0 + swing * 0.3, 0.26)
        place(sn, b0 + 1.0, 0.28)
        place(sn, b0 + 3.0, 0.25)
        for i, off in enumerate([0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5]):
            tbeat = b0 + off + (swing if (i % 2 == 1) else 0.0)
            tbeat += float(rng.uniform(-0.012, 0.012))
            place(hho if i == 5 else hh, tbeat, 0.11 if i % 2 == 0 else 0.065)
    # v2 AFK polish: thin kick/snare/hat energy to 58% of v1.
    return one_pole_hp(one_pole_lp(out, 8000.0), 70.0) * 0.20 * 0.58


def make_vinyl(n: int) -> np.ndarray:
    """Whisper crackle + tiny hiss — must not read as a noise bed."""
    rng = np.random.default_rng(7)
    hiss = one_pole_lp(one_pole_hp(rng.normal(0, 1, n).astype(np.float64), 2000.0), 9000.0)
    hiss *= 0.0038
    crackle = np.zeros(n, dtype=np.float64)
    for _ in range(int((n / SR) * 4.0)):
        pos = int(rng.integers(0, n - 40))
        width = int(rng.integers(2, 7))
        amp = float(rng.uniform(0.006, 0.022))
        crackle[pos : pos + width] += (
            amp * np.exp(-np.arange(width) / 1.8) * rng.choice([-1.0, 1.0])
        )
    # v2 AFK polish: whisper-only vinyl/tape layer at 50% of v1.
    return (hiss + crackle) * 0.50


def loop_crossfade(x: np.ndarray, fade_ms: float = 80.0) -> np.ndarray:
    """Shorten-style seamless loop: blend tail→head, drop duplicate tail."""
    n_fade = int(fade_ms * 0.001 * SR)
    fade_in = np.linspace(0.0, 1.0, n_fade)
    fade_out = 1.0 - fade_in
    head = x[:n_fade] * fade_in + x[-n_fade:] * fade_out
    return np.concatenate([head, x[n_fade:-n_fade]])


def soft_compress(x: np.ndarray, thresh: float = 0.14, ratio: float = 1.6) -> np.ndarray:
    ax = np.abs(x)
    over = np.maximum(ax, 1e-12)
    g = np.where(ax > thresh, (thresh / over) * ((over / thresh) ** (1.0 / ratio)), 1.0)
    return x * one_pole_lp(g, 30.0)


def normalize_peak(x: np.ndarray, target_dbfs: float = -12.5) -> np.ndarray:
    peak = float(np.max(np.abs(x))) + 1e-12
    return x * ((10.0 ** (target_dbfs / 20.0)) / peak)


def write_wav_mono(path: Path, x: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1.0, 1.0) * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def encode_ogg(wav: Path, ogg: Path) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner",
            "-i", str(wav),
            "-c:a", "libvorbis", "-b:a", "112k",
            "-ar", str(SR), "-ac", "1",
            str(ogg),
        ],
        check=True,
        capture_output=True,
    )


def main() -> None:
    print(f"Synthesizing chillhop bed @ {BPM} BPM, {DURATION:.3f}s pre-xfade, mono {SR}")
    mix = make_pad() + make_lead() + make_bass() + make_drums() + make_vinyl(N)
    mix = soft_clip(mix)
    mix = apply_wow_flutter(mix)
    mix = one_pole_hp(mix, 80.0)
    mix = one_pole_lp(mix, 10000.0)
    mix = soft_compress(mix)
    mix = loop_crossfade(mix, 80.0)
    mix = normalize_peak(mix, -12.5)

    peak = 20.0 * math.log10(float(np.max(np.abs(mix))) + 1e-12)
    mean = 20.0 * math.log10(float(np.mean(np.abs(mix))) + 1e-12)
    rms = 20.0 * math.log10(float(np.sqrt(np.mean(mix ** 2))) + 1e-12)
    joined = np.concatenate([mix, mix])
    n = len(mix)
    seam_jump = float(np.abs(joined[n] - joined[n - 1]))
    typ_jump = float(np.mean(np.abs(np.diff(mix))))
    print(f"dur={n/SR:.3f}s peak={peak:.2f} mean_abs={mean:.2f} rms={rms:.2f}")
    print(f"seam_jump={seam_jump:.6f} typ_jump={typ_jump:.6f} (ok if seam≲typ)")

    write_wav_mono(WAV_PATH, mix)
    encode_ogg(WAV_PATH, OGG_PATH)
    print(f"Wrote {WAV_PATH} ({WAV_PATH.stat().st_size} bytes)")
    print(f"Wrote {OGG_PATH} ({OGG_PATH.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
