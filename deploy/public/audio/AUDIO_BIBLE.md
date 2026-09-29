# AFK Slayer (working dir: contract-board) — Audio Bible

## Active audio set (2026-09-24)

Normal mix and ducking (below) are restored. Active assets:

- **v3 clean tonal SFX pack** — every combat / reward / UI cue is built from pure tones only (sines, soft harmonics, bell/wood partials, short pitch sweeps, <5 ms sine clicks). **No noise sources of any kind.** HP 150 Hz, peak −1 dBFS, mono 44.1 kHz, pitched in C/F major. Generator: `audio/synthesize_clean_sfx_v3.py`. `mob_death_a|b` stay on the v2 clean tonal build (`synthesize_core_pack.py`).
- **v3 brighter AFK bed** — warm major-jazz chillhop (Fmaj9 · G6/9 · Em7 · Cmaj9), EP/bell keys, friendly bell motif, round bass HP ~90 Hz, feather-light tonal rim + hat, **no kick / no low thump / no vinyl hiss**. 82 BPM, 4 bars, 11.71 s seamless mono loop, peak −12.5 dBFS. Generator: `audio/synthesize_chillhop_bed_v3.py`.

---

Original IP. OSRS-*flavored* energy only — no Jagex samples, titles, or trademarked cue names in files.

Phone-first. Clear on a tinny speaker. Prefer short readable hits over dense layers.

## Goals

1. **Hunt reads** — bolt fire, hit, and kill stay readable with ~10 park mobs and hunters overlapping.
2. **Rewards land** — task done, rare drop, casket open, upgrade buy feel earned without toast spam.
3. **AFK stays kind** — one soft loop bed; no fatigue after long sessions; never drown UI speech.
4. **UI is quiet** — soft ticks, never naggy.

## Mix / ducking

| Bus | Role | Relative loudness | Notes |
|---|---|---|---|
| **Combat one-shots** | Bolt fire/hit, swings, arrows, death | 0 dB ref | Highest priority when hunting |
| **Reward** | Task complete, rare, casket, upgrade | −2 to 0 dB | Slightly above UI; duck AFK −6 dB for ~400 ms |
| **UI** | Tab, intro step, empty-task nudge | −8 to −12 dB | Soft; never compete with combat |
| **AFK bed** | Loop under Hunt when idle / holding gently | −18 to −22 dB | Always under everything; mute option later |

**Max simultaneous SFX:** 6 voices. Prefer dropping oldest bolt-fire / scrap ticks before killing hit/death/reward.

**Duck AFK bed** −6 dB for 350–500 ms on reward cues and intro-step complete.

**Mute rules (engine):**
- Master mute kills all.
- Separate toggles later: SFX / Music (AFK bed counts as Music).
- First user gesture unlocks AudioContext (replace intro oscillator with real assets).

**Phone assumptions:** mono-compatible stereo; no sub-80 Hz content (phone speakers trash it); peak normalize one-shots to ≈ −1 dBFS; leave AFK bed peaking ≈ −12 dBFS so it sits under.

## Format & paths

| Kind | Path | Format | Sample rate |
|---|---|---|---|
| One-shots | `audio/sfx/*.ogg` (+ `.wav` masters) | Ogg Vorbis ~96–128 kbps | 44.1 kHz mono preferred |
| UI | `audio/ui/*.ogg` | same | 44.1 kHz mono |
| Loops | `audio/loops/*.ogg` | same, loop-safe | 44.1 kHz stereo ok if quiet |

Filenames: lowercase `snake_case`, original names only (`bolt_fire`, `briar_swing`, not RS skill names).

Suggested default gains (engine multiply after asset normalize):

| Cue family | Gain |
|---|---|
| Bolt fire | 0.55 |
| Bolt hit | 0.75 |
| Melee swing (briar) | 0.65 |
| Quill arrow fire / hit | 0.5 / 0.7 |
| Mob death | 0.85 |
| Task / rare / casket / monster unlock | 0.9 |
| Upgrade purchase | 0.75 |
| UI ticks (tab switch) | 0.35 |
| Intro step complete | 0.55 |
| Empty-task nudge | 0.25 |
| AFK bed | 0.2 |

## Anti-spam

| Cue | Rule |
|---|---|
| `bolt_fire` | Pool 3 variants; cooldown ≥ 45 ms between plays; drop if voice budget full |
| `bolt_hit` | Pool 3; coalesce same-frame multi-hits to 1 play + optional quiet spark |
| `quill_arrow_fire` | Same as bolt_fire but softer (−3 dB) |
| `mob_death` | Always play (budget: steal from fire pool) |
| `scrap_tick` (future) | ≥ 200 ms cooldown; max 2/s |
| Casket jiggle | Visual only — **no audio** on the ~5 s jiggle |
| Kill-coin float | Silent (visual already busy) |
| Top feed / toasts | No per-line SFX |

## Material language

Aligned with art: cool slate arena, stone UI, Undercroft scrap / wail / ember.

| Material | Used for |
|---|---|
| **Stone / grit** | UI panels, tab ticks, AFK bed base |
| **Metal / scrap** | Bolt fire body, casket latch, upgrade purchase |
| **Wood / string** | Quill release |
| **Flesh / wet thud** | Generic hit (keep short, not gore) |
| **Magic / violet sheen** | Player bolt tip, rare/signature drop sparkle (dry-ish, not choir) |
| **Wail / air** | Banshee death flavor (subtle; area pack later) |
| **Ember / glass** | Infernal Mage death / Ember Core (area pack later) |

Core pack stays **dry-leaning** (short decay, little reverb) so phone stays clear. Wet tails only on rare drop and AFK accents.

## Out of scope (this bible)

- Voiceover / narration
- Licensed App Store music beds
- Jagex / Obelisk rips or trademarked filenames
- Systems code, sprites, Kat Chapman RN work
- Per-area beds before core pack locks (Undercroft scrap/wail/ember after)

## Version

v1 — core bible + cue sheet.
v3 (2026-09-24) — bed-only override removed; v3 clean tonal SFX pack + brighter v3 bed active.
