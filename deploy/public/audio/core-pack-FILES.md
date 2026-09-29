# AFK Slayer (contract-board) — Core Pack Files

**v3 (2026-09-24): clean tonal SFX pack + brighter AFK bed.** Original procedural synthesis (numpy + wave → ffmpeg Ogg Vorbis q5).
Masters: 44.1 kHz mono WAV alongside OGG (same basename).
One-shots: **tonal sources only (no white/pink noise, no filtered-noise whooshes)**, 2nd-order HP 150 Hz (phone speakers), ≥3 ms fade-in / ≥15 ms fade-out, peak-normalized −1 dBFS.
AFK bed peaks −12.5 dBFS (sits under); engine gain 0.2.
Flatness = spectral flatness (Welch PSD, 150 Hz–16 kHz; 0 = pure tone, 1 = white noise). Target < 0.2.

| ID | Path (ogg) | WAV | Duration (ms) | Peak dBFS (wav) | Peak dBFS (ogg) | Flatness | Engine gain | Recipe |
|---|---|---|---:|---:|---:|---:|---:|---|
| `bolt_fire_a` | `sfx/bolt_fire_a.ogg` | `sfx/bolt_fire_a.wav` | 85.0 | -1.0 | -1.0 | 3.4e-05 | 0.55 | soft downward sine blip (pew), C6 → ×0.62 |
| `bolt_fire_b` | `sfx/bolt_fire_b.ogg` | `sfx/bolt_fire_b.wav` | 85.0 | -1.0 | -0.9 | 1.8e-06 | 0.55 | soft downward sine blip (pew), A5 → ×0.62 |
| `bolt_fire_c` | `sfx/bolt_fire_c.ogg` | `sfx/bolt_fire_c.wav` | 85.0 | -1.0 | -1.2 | 1.3e-05 | 0.55 | soft downward sine blip (pew), G5 → ×0.62 |
| `bolt_hit_a` | `sfx/bolt_hit_a.ogg` | `sfx/bolt_hit_a.wav` | 115.0 | -1.0 | -1.0 | 2.0e-06 | 0.75 | sine thock ~254 Hz gliding ×0.8 + 2nd partial + 2.5 ms sine click |
| `bolt_hit_b` | `sfx/bolt_hit_b.ogg` | `sfx/bolt_hit_b.wav` | 115.0 | -1.0 | -1.1 | 1.1e-06 | 0.75 | sine thock ~230 Hz gliding ×0.8 + 2nd partial + 2.5 ms sine click |
| `bolt_hit_c` | `sfx/bolt_hit_c.ogg` | `sfx/bolt_hit_c.wav` | 115.0 | -1.0 | -0.9 | 4.9e-07 | 0.75 | sine thock ~284 Hz gliding ×0.8 + 2nd partial + 2.5 ms sine click |
| `briar_swing` | `sfx/briar_swing.ogg` | `sfx/briar_swing.wav` | 170.0 | -1.0 | -1.1 | 2.1e-05 | 0.65 | soft thud 230→180 Hz + C6 metallic ping (1 / 2.76 / 5.4 partials) |
| `quill_arrow_fire` | `sfx/quill_arrow_fire.ogg` | `sfx/quill_arrow_fire.wav` | 95.0 | -1.0 | -1.3 | 4.4e-08 | 0.5 | additive plucked string G4, tiny pitch settle |
| `quill_arrow_hit` | `sfx/quill_arrow_hit.ogg` | `sfx/quill_arrow_hit.wav` | 110.0 | -1.0 | -1.0 | 4.7e-08 | 0.7 | dry wood-block tock 640 Hz + 300 Hz body |
| `mob_death_a` | `sfx/mob_death_a.ogg` | `sfx/mob_death_a.wav` | 216.4 | -1.0 | -0.9 | 9.3e-05 | 0.85 | v2 clean tonal (unchanged) |
| `mob_death_b` | `sfx/mob_death_b.ogg` | `sfx/mob_death_b.wav` | 226.0 | -1.0 | -1.0 | 6.5e-05 | 0.85 | v2 clean tonal (unchanged) |
| `task_complete` | `sfx/task_complete.ogg` | `sfx/task_complete.wav` | 430.0 | -1.0 | -1.0 | 1.9e-08 | 0.9 | two-note rising bell C5 → G5 |
| `monster_unlock` | `sfx/monster_unlock.ogg` | `sfx/monster_unlock.wav` | 370.0 | -1.0 | -1.2 | 5.9e-08 | 0.9 | three-note bell arpeggio F5 · A5 · C6 |
| `signature_drop` | `sfx/signature_drop.ogg` | `sfx/signature_drop.wav` | 490.0 | -1.0 | -0.9 | 1.0e-06 | 0.9 | sparkly bell arpeggio C5 E5 G5 C6 E6 + G6/C7 shimmer |
| `chest_open` | `sfx/chest_open.ogg` | `sfx/chest_open.wav` | 330.0 | -1.0 | -1.1 | 8.0e-08 | 0.9 | wood click 900 Hz → chime F5 → C6 |
| `upgrade_purchase` | `sfx/upgrade_purchase.ogg` | `sfx/upgrade_purchase.wav` | 245.0 | -1.0 | -1.1 | 2.3e-05 | 0.75 | coin double ping E6 → A6 |
| `coin_land_a` | `sfx/coin_land_a.ogg` | `sfx/coin_land_a.wav` | 90.0 | -1.0 | -1.0 | 1.4e-06 | 0.4 | coin tink D6, inharmonic partials 1 / 2.43 / 3.86 + sub 0.5, ~19 ms decay + tiny bounce at 26 ms |
| `coin_land_b` | `sfx/coin_land_b.ogg` | `sfx/coin_land_b.wav` | 90.0 | -1.0 | -1.1 | 2.8e-06 | 0.4 | coin tink F6, partials 1 / 2.56 / 4.07 + sub 0.5, ~12 ms decay + bounce at 23 ms |
| `coin_land_c` | `sfx/coin_land_c.ogg` | `sfx/coin_land_c.wav` | 90.0 | -1.0 | -1.0 | 3.1e-06 | 0.4 | coin tink G6, partials 1 / 2.34 / 3.71 + sub 0.5, ~14 ms decay + bounce at 29 ms |
| `gold_countup_tick` | `sfx/gold_countup_tick.ogg` | `sfx/gold_countup_tick.wav` | 30.0 | -1.0 | -0.7 | 1.2e-07 | 0.15 | barely-there tick: C7 sine (5 ms decay) over soft C6 |
| `boss_death` | `sfx/boss_death.ogg` | `sfx/boss_death.wav` | 1050.0 | -1.0 | -0.9 | 5.4e-05 | 1.0 | harmonic sine impact 120→58 Hz (harmonics to 600 Hz) + 262→170 Hz thud → C5 E5 G5 C6 bell+brass arpeggio bloom + C4 root + G6/C7/E7 shimmer tail; gentle tanh soft-knee |
| `crit_hit` | `sfx/crit_hit.ogg` | `sfx/crit_hit.wav` | 130.0 | -1.0 | -1.3 | 1.1e-05 | 0.5 | layer on bolt_hit: 2 ms sine click + 2000→700 Hz tonal snap + G6 metal ring (1 / 2.76 / 5.4) + 180→135 Hz harmonic punch |
| `ui_denied` | `sfx/ui_denied.ogg` | `sfx/ui_denied.wav` | 125.0 | -1.0 | -1.1 | 5.5e-07 | 0.4 | friendly nope: soft triangle bumps E4 → C4 (~330 → ~262 Hz), each gliding slightly down |
| `empty_task_nudge` | `ui/empty_task_nudge.ogg` | `ui/empty_task_nudge.wav` | 140.0 | -1.0 | -0.9 | 2.6e-08 | 0.25 | very soft wood knock 480 Hz |
| `tab_switch` | `ui/tab_switch.ogg` | `ui/tab_switch.wav` | 55.0 | -1.0 | -1.1 | 7.5e-08 | 0.35 | tiny soft tick 1760 + 880 Hz |
| `intro_step_complete` | `ui/intro_step_complete.ogg` | `ui/intro_step_complete.wav` | 240.0 | -1.0 | -1.0 | 5.8e-08 | 0.55 | soft rising confirm G5 → C6 |
| `afk_bed` | `loops/afk_bed.ogg` | `loops/afk_bed.wav` | 11707.3 | -12.5 | -12.5 | 6.0e-06 | 0.2 | v3 bright chillhop loop |

## Notes

- **v3 clean tonal SFX** (all cues except `mob_death_*`): generator `audio/synthesize_clean_sfx_v3.py`. Sines, soft 2nd/3rd harmonics, gentle inharmonic bell/wood partials, short exponential pitch sweeps, <5 ms Hann-windowed sine clicks. No random/noise sources anywhere. Pitched in C / F major to sit with the v3 bed.
- **feel-1 add-on (2026-09-28)**: `coin_land_a|b|c`, `gold_countup_tick`, `boss_death`, `crit_hit`, `ui_denied` (all in `sfx/`). Generator `audio/synthesize_feel1_sfx.py` reuses the v3 helpers and finalize(). Same rules: tonal only, no noise. Max spectral flatness over loud slices ≤ 1.7e-4 (boss_death); every other cue is ≤ 1.5e-5. Wiring rules (round-robin, throttles, the boss duck −8 dB / 1.2 s, and crit layered on bolt_hit in the same frame at 0.5 for headroom) are in `sfx/README.md`.
- `tab_switch` and `intro_step_complete` are **new** in v3 (`ui/`).
- `mob_death_a` / `mob_death_b`: **v2 clean tonal — unchanged** (soft sine thud + mid triangle + reward tick + sine click). Synth: `audio/synthesize_core_pack.py`.
- `afk_bed`: **v3 bright chillhop (2026-09-24)** — 82 BPM, 4 bars, 11.707 s seamless mono loop (rendered circularly, no crossfade; seam jump < typical sample step). Warm major-jazz voicings Fmaj9 · G6/9 · Em7 · Cmaj9 on soft EP/bell keys (sine + soft 2nd/3rd harmonics, 6 ms attack), sine pad LP ~4.5 kHz, gentle 1.5–3 kHz presence lift, friendly original bell motif, round bass (soft 30 ms swell, 3-pole HP ~92 Hz), feather-light tonal rim on 2 & 4 + faint tonal hat. **No kick, no toms, no low thump, no vinyl/tape hiss, no noise.** Peak −12.5 dBFS, ffmpeg mean_volume ≈ −27 dB; energy < 60 Hz ≈ −50 dB rel. Engine gain 0.2. Synth: `audio/synthesize_chillhop_bed_v3.py`.
- Normal mix + ducking restored (bed-only override removed from AUDIO_BIBLE.md).
- Backups: previous bed → `_bak_chillhop_v2_20260924/`; 50 ms silent placeholders → `_bak_placeholders_20260924/`.
- All content original; no copyrighted samples or third-party melodies.
- Gains from `AUDIO_BIBLE.md`.
