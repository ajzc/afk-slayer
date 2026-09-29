# audio/sfx — one-shot SFX

All files: original procedural synthesis, **tonal sources only (no noise of any kind)**, mono 44.1 kHz, WAV master + Ogg Vorbis q5 (same basename), HP 150 Hz, peak −1 dBFS, ≥3 ms fade-in / ≥15 ms fade-out. Play the `.ogg`; `.wav` is the master.
Generators: `../synthesize_clean_sfx_v3.py` (v3 pack), `../synthesize_core_pack.py` (`mob_death_*`), `../synthesize_feel1_sfx.py` (feel-1 cues, marked **new**).

| File (`.ogg` + `.wav`) | When it fires | ms | Engine gain | Notes |
|---|---|---:|---:|---|
| `bolt_fire_a` / `_b` / `_c` | Player bolt leaves the avatar | 85 | 0.55 | Round-robin; cooldown ≥ 45 ms |
| `bolt_hit_a` / `_b` / `_c` | Bolt HP chip lands | 115 | 0.75 | Round-robin; coalesce same-frame multi-hits |
| `briar_swing` | Briar melee attack connects | 170 | 0.65 | |
| `quill_arrow_fire` | Quill fires an arrow | 95 | 0.5 | |
| `quill_arrow_hit` | Quill arrow chip lands | 110 | 0.7 | |
| `mob_death_a` / `_b` | Arena monster dies | 216 / 226 | 0.85 | Always play (steal a voice from the fire pool) |
| `task_complete` | Contract quota finished | 430 | 0.9 | Duck bed −6 dB ~400 ms |
| `monster_unlock` | New monster unlocked | 370 | 0.9 | Duck bed −6 dB ~400 ms |
| `signature_drop` | Signature / rare drop toast | 490 | 0.9 | Duck bed −6 dB ~400 ms |
| `chest_open` | Player opens a ready casket/chest | 330 | 0.9 | Duck bed −6 dB ~400 ms |
| `upgrade_purchase` | Progress node / upgrade bought | 245 | 0.75 | |
| **new** `coin_land_a` / `_b` / `_c` | A gold coin lands / is collected (up to ~1.7×/s) | 90 | **0.4** | Round-robin a→b→c. If several land within ~60 ms, play one and drop the rest. Max 3 simultaneous |
| **new** `gold_countup_tick` | Gold counter ticks up | 30 | **0.15** | Throttle to at most one play every 80 ms |
| **new** `boss_death` | Boss dies (with the burst VFX, screen shake and banner) | 1050 | **1.0** | Always play. Duck `afk_bed` −8 dB for ~1.2 s |
| **new** `crit_hit` | Critical hit. A **layer** on top of `bolt_hit`, never a replacement | 130 | **0.5** | Start it on the same frame as the `bolt_hit` voice |
| **new** `ui_denied` | Tap on a locked or invalid control | 125 | **0.4** | Cooldown ~250 ms |

## Why these gains (feel-1 cues)

Levels were compared by max short-term (50 ms) A-weighted RMS × engine gain, against the existing cues:

- `coin_land` at 0.4 comes out at ≈ −20 dB. That puts it level with `bolt_hit` at 0.75 (−21) and ~9 dB under `upgrade_purchase` (−11), so it stays light at 1.7/s and never reads as a purchase. The three variants are within 0.8 dB of each other. Their different pitches (D6 / F6 / G6, single note + tiny bounce) keep them apart from the E6→A6 purchase ping.
- `gold_countup_tick` at 0.15 is ≈ −32 dB, which is barely there.
- `boss_death` at 1.0 is ≈ −9.4 dB short-term. That's on par with the loudest reward chimes, but it lasts 1 s and has a low body, so with the −8 dB bed duck it's the biggest cue in the game.
- `crit_hit` was **lowered from the suggested 0.6 to 0.5** for headroom. With `bolt_hit` at 0.75, crit at 0.6 summed to −0.5 dBFS on the same sample and could go slightly over 0 dBFS (+0.3) if the two voices started 0–20 ms apart. At 0.5, the worst same-frame peak is −1.0 dBFS and the worst misaligned peak is −0.5 dBFS (no clipping), and it still adds +2.3…+3.4 dB of perceived punch over `bolt_hit` alone.
- `ui_denied` at 0.4 is ≈ −24 dB, about the same as `tab_switch` (0.35). It's audible but not naggy.

AFK bed: `../loops/afk_bed.ogg`, gain 0.2. UI ticks: `../ui/` (tab_switch 0.35, intro_step_complete 0.55, empty_task_nudge 0.25).
