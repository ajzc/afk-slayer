# iom3 notes

## Intro one-time
- Save flag `introDone` (also mirrored on `intro.introDone`) set on complete **and** Skip.
- `stickyIntroDone(a,b)` on cloud pull/push merge: if either side is done, both keep it.
- Migration: past end step, boss beaten, SL≥4, or Warrior hired → `introDone`.
- Settings "reset intro" still clears the flag for manual replay.
- Dock / coach hidden during boss / Tier Test fights.

## Gold square above arena hint
- Was `.player-ring` (legacy aim/target ring under the player avatar).
- Removed from arena DOM in iom3 (Option C sprites don't need it).

## Bottom tab bar
- Grid is 6 columns (was 5 → Settings wrapped).
- Labels shrink; Settings gear-only ≤480px; icon-only ≤380px.
- `ResizeObserver` sets `--nav-h`; `.main` padding-bottom = `--nav-h + safe-area + 20px`.
- Disabled Fight boss uses `aria-label` (no native `title` tooltip over the nav); need text stays in the muted line under the button.
