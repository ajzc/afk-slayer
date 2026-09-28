# Elder Thornpelt fight tuning (2026-09-24)

**Source:** AFK Slayer Play Sheet (Boss Check) built from live code; matches Alex's real run (meter full, couldn't kill Elder).

## Finding
- Elder HP 278 (150 × hpMult 1.85).
- In boss fights, bolt chip is sized from the *Task* monster HP (Cub 105) via `boltHpChipRaw(currentContract())`, not the boss HP. So each bolt does about 38% of intended damage.
- Player DPS when meter fills (no Briar): ~1.75, which gives TTK ~159s. That's past what a player will sit through (~120s), so it reads as a wall.
- With Briar + Swift Walk: ~6.9 DPS, TTK ~40s.

## Fix (recommend #1 only, then retest)
1. **Size bolt chips from the boss's HP pool during a boss fight** (same rule as normal monsters). Effect: about ×2.65 bolt damage, so solo TTK is ~60s. That's inside the locked 45–90s target, and Elder hpMult stays 1.85.
2. Only if #1 still tests slow: Elder hpMult 1.85 to 1.5.
3. Do not require Briar to fight. Keep the Leave fight button (HP resets, access stays paid).

Apply the same bolt sizing to Ashfang Alpha and Nightweave.

## Price flags from time-gates-to-costs
Hire Quill 3650 gold, Hire Moss 4850 Slayer points, and Hire Ember 12200 Slayer points look far too high next to boss meters of 120/280/600. Spending Slayer points on hires competes with boss access. Recommend moving hires to gold, or pricing them at 1–2 boss meters' worth. Unlock Crits 250g / Specials 360g compete with Iron/Briar early; fine if Iron+Briar are reachable first.


## Applied (boss1)
- `boltHpChipRaw` sizes from `getActiveBoss()` HP during any Level boss fight (Elder / Alpha / Nightweave).
- Elder `hpMult` left at **1.85**. Simulated meter-fill solo TTK ≈ **60s** (was ~159s).
- Hires moved to gold: Quill 900 · Moss 2000 · Ember 4200. Leave fight unchanged.


## Superseded by iom2 (benchmarks ≠ timers)
Alex 2026-09-24: do **not** size bolt chips from boss HP / constantSeconds (that fixed TTK across gear). Absolute weapon chips + higher Tier Test `hpMult` (4.0) so *expected* power lands ~45–90s. See `design/benchmarks-not-timers.md`.
