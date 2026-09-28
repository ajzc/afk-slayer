# Design Brief — Bed-only audio (no SFX)

**Status:** Locked for implement (Alex 2026-09-23)  
**Game:** AFK Slayer  
**Owner:** Game Audio (loop + mute SFX assets/routing) · New Bot (engine defaults / prefs)

---

## 1. Goal (player feeling)

The game should feel calm and AFK-friendly: **one nice background loop only**. No bolt spam, deaths, UI nudges, or reward stingers for now. Audio supports hanging out on Hunt, not arcade feedback.

---

## 2. Rules

| Bus | State |
|---|---|
| **AFK bed** (`loops/afk_bed.ogg`) | **ON** whenever Hunt (or game) has audio unlocked. Comfortable under-speech level: engine gain **~0.18–0.22** (bible −18 to −22 dB feel). Loop seamless. |
| **All combat SFX** | **OFF** (bolt fire/hit, swings, arrows, mob death) — do not play |
| **All reward SFX** | **OFF** (task complete, unlock, signature, chest, upgrade) |
| **All UI SFX** | **OFF** (empty-task nudge, tabs, intro ticks) |

**Defaults (new + migrate existing saves for this pass):**
- `musicVol` = 100 (or leave user music slider controlling bed only)
- `sfxVol` = **0**
- Prefer also a hard flag `CB_AUDIO.sfxEnabled = false` (or skip `play()` for every non-bed cue) so future files don’t leak if someone bumps sfxVol.

**Settings UI:** Keep Master + Music (bed). SFX slider can stay but default 0 and label optional “SFX (off for now)”. Or hide SFX until a later pass — New Bot’s call; Music must clearly control the bed.

**Ducking:** none needed while SFX are dead.

**afk_bed gain in manifest:** currently `0` (temp). Set to **0.2** (or Music-scaled).

---

## 3. Plain language

- Bed should feel: soft stone Undercroft ambience — low grit, no melody earworm, no percussion spam. Phone-safe (no muddy sub-bass).
- If current `afk_bed.ogg` is thin/ugly, Game Audio replaces it; keep path `audio/loops/afk_bed.ogg`.

---

## 4. What to implement

**Game Audio**
1. Confirm/replace `audio/loops/afk_bed.ogg` as the one “nice” bed.
2. Update AUDIO_BIBLE.md: temporary **bed-only mix**Mode (Alex request).
3. Hand New Bot any gain notes.

**New Bot**
1. Manifest / play path: bed loops; all other `play(cue)` no-ops (or sfx bus gain forced 0).
2. Default prefs: sfxVol 0; bed audible.
3. Bump `AUDIO_CACHE` when bed file changes.
4. Deploy to Alex Mac `8765` when ready.

---

## 5. Game Artist

None.

---

## 6. Out of scope

- Bringing SFX back (later pass)
- Per-monster stingers
- Voice / music with vocals
