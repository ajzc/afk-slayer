# Audio Brief — Core Pack (approve to generate)

## 1. Goal (player feeling)
Hunt feels like a real idle guild fight: clean bolt zips, solid hits, crisp deaths, and rewarding task/loot beats — without fatiguing AFK or nagging UI.

## 2. Cue list
See `audio/CUE_SHEET.md`. Ship order: P0 combat → P1 rewards → P2 UI → P3 AFK bed.

Key timings: most SFX ≤ ~400 ms; AFK loop ≤ ~8 s seamless. Bolt fire pooled + ≥45 ms cooldown.

## 3. Style notes
- Materials: stone UI, scrap/metal bolts, wood Quill, short flesh/stone hits, dry magic tip on player bolt / rare.
- Dry over wet (phone clarity). Mild wet only on rare_drop + optional AFK accent.
- Cool slate / gold UI language (matches art bible) — no neon choir, no licensed music bed.

## 4. Files New Bot should wire
Paths in cue sheet under `contract-board/audio/{sfx,ui,loops}/`. Ogg for runtime; wav masters kept beside. Gains listed per cue.

## 5. What stays silent
Casket jiggle, kill-coin floats, soft/spark hits, ticker spam, bolt-aim hint.

## 6. Out of scope
Area flavor beds (Undercroft scrap/wail/ember), Moss/Ember hunter SFX until hired-in-core, VO, App Store music licensing, any Jagex/Obelisk audio.
