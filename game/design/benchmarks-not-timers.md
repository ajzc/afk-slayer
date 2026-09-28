# Benchmarks are not timers (locked with iom2)

**Alex 2026-09-24:** No fight or milestone may take a fixed amount of time.

## Rule

Pacing figures in the brief (first weapon ~1 min, Cannon ~5 min, Warrior ~10 min, Tier Test fight 45–90s, meter fill 20–40 min) are **internal balance benchmarks** for a typical player at the expected power for that point in the ladder.

Actual elapsed time always comes from the player’s **real stats**:

- Weapon / gear power (Idle Power + metal ladder)
- Attack speed / bolt cadence
- Crit chance & crit damage
- Cannon (tasks only; 0 on Tier Tests)
- Helper damage & speed (tasks only; muted on Tier Tests)
- Smithing / Prayer / other upgrades

## Forbidden

- Sizing bolt (or helper) chips from `targetHP / constantSeconds` so TTK is the same regardless of gear
- Hard `minPlayMs` / countdown gates (already removed in gates1)
- Any live formula that “aims” at a wall-clock duration and cancels out player power

## Required

- **Absolute** combat damage from weapon stats and upgrades
- Tune **enemy HP** (and rewards / meter costs) so the *expected* loadout at that milestone lands near the benchmark
- Stronger loadouts clear faster; weaker ones take longer — prove it in sims (e.g. 0.7× / 1× / 1.5× weapon DPS)

## Code pointers

- `js/arena.js` `boltHpChipRaw` / `BASE_BOLT_CHIP` / `weaponPowerNow()` — absolute chips
- `js/data.js` `markedPrey[].combat.hpMult` — Tier Test HP tuned to expected power
- Economy `killRatePerMin` stays power-scaled (not time-normalized)

Supersedes the “size chips from boss HP to force ~60s” shortcut in `elder-thornpelt-tuning.md` (that fixed TTK across gear levels).
