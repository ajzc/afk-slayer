# iom1 save migration (Phase 1)

Save key stays `contractBoard_v1`. Schema version bump to 4.

## What we keep
- Gold, points, scraps, mats, relics, bestiary kills/completions/mastery, gear levels, hunter hires, prey finished flags, areas unlocked, chests/sigils, settings, intro progress.

## What we add / derive
- `slayerLevel`: derived on first load if missing = `1 + min(8, totalContracts) + finished Tier Tests`. Also raised to satisfy owned unlocks (specials→≥3, Warrior→≥4, crits→≥7, Archer→≥8) so gates never soft-lock old saves.
- `prayerPoints` / `prayers`: default 0 / `{}`.
- `_iom1Migrated: true` one-shot flag.

## Display-only remap (no id wipe)
- Level 1 contract ids stay `bristle_cub` / `thornpelt_bear` / `dire_thornpelt` / prey `sewer_king`.
- Player-facing names come from `CB_DATA.NAMES` + `nameKey` (OSRS for private playtest).

## Price changes
- New costs apply to **future** buys only; owned upgrade levels are kept.
