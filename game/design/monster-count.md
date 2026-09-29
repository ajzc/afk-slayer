# Design Brief: Monsters on screen (one target until you can hit more)

**Status:** Ready to implement (Alex via New Bot, 2026-09-28).

## 1. Goal (player feeling)
Early on it's you, one bolt, and one monster: a clean duel. More monsters show up only when you get something that can hit them, like a helper or a bolt that splits. So each new attacker makes the screen feel busier, and you can see it's earned.

## 2. Rule
**Monsters on screen = 1 + number of hired helpers + 1 if you own any multi-hit bolt, capped at 3 in World 1.**

- **Helpers** (each counts 1): Hire Warrior (`hunter_briar`, SL4), Hire Archer (`hunter_quill`, SL8), Hire Berserker (`hunter_moss`, SL13), Hire Mage (`hunter_ember`, SL13).
- **Multi-hit bolts** (any one counts once): Bolt Pierce (`bolt_pierce` ≥ 1), Bolt Bounce (`bolt_bounce` ≥ 1), Quill Multishot (`quill_multishot` ≥ 1).
- **Cannon doesn't count.** In code it's a single-target 4× bolt with 0 splash, so a second monster gives it nothing to hit. The only splash is Bomb Barrage, a 45s chest buff, and it's excluded because it's temporary.
- **Cap:** 3 (the current `WAVE_SIZE`). World 2+ can raise it; that's out of scope.
- The count is computed from owned items only, with no timers and no Slayer-level milestones. Prestige resets that remove hires lower it back down, which is correct.
- **Tier Tests stay at 1** (they already hide the other slots).

### Stages this produces on the normal path
| Stage | Trigger | On screen |
|---|---|---|
| Start | New game (SL1 to SL3, including after Cannon at SL3) | **1** |
| First helper | Hire Warrior (SL4) | **2** |
| Split shot or second helper | First of Bolt Pierce / Bolt Bounce (any SL, 180g / 250g) or Hire Archer (SL8) | **3 (cap)** |

## 3. Respawn (no dead time with 1 monster)
Today a killed monster is replaced after 220 ms and walks in over 2 to 3 s (`beginWalkIn`, min 0.55 s). With 3 on screen that's hidden, because another target is already there. With 1 it would be about 2.5 s of empty screen per kill.

**When 1 monster is on screen:**
- Next monster appears **150 ms** after the kill (was 220).
- Walk-in lasts **0.6 s**, entering from the nearer side edge, not off-screen. It's hittable from the first frame (already true: `livingMobs` includes entering mobs).
- Aim focus moves to it immediately, so a held fire button keeps shooting.
- **Target gap: about 0.75 s from kill to the next hittable monster**, which is just over one bolt tick (0.6 s).

**When 2 or 3 are on screen:** keep today's 220 ms plus 2 to 3 s walk-in.

The gold coin still lands 0.65 s after the kill (feel1). That overlaps the respawn, so the coin lands as the next monster arrives.

## 4. Benchmarks check
Numbers are from `w1-progression-audit.md` [model] and the code:
- **Solo kills per minute hold.** Your bolt hits one monster at a time in both setups. The audit models 0.8 s overhead per kill (walk and retarget). The new solo gap is about 0.75 s, so kill time stays about the same. Crawling Hand is about 15.7 s per kill at start, so that's roughly 3.6 kills a minute either way.
- **Income holds.** Gold and Slayer points per kill are unchanged, and kills per minute are unchanged, so gold per minute is unchanged. The early quota cut (quota ×0.2, rewards ×5 until the Warrior) is unaffected.
- **Helpers aren't starved.** From the Warrior on, each helper gets its own monster (1 + helpers), so helper damage isn't wasted piling onto one target.
- **AFK/offline is unaffected.** It uses `killRatePerMin`, not the arena.
- **One risk to measure:** with 3 monsters, a missed bolt can still hit another monster along the aim line. With 1, a miss is a miss. The size of that effect isn't in the model. Playtest should compare kills per minute at SL1 before and after. **If solo kills per minute drop more than 10%,** give the solo stage +2 `aimAssistMod` rather than adding monsters back.

## 5. Player copy
- When the count goes up: toast "More to hunt: your Warrior needs a target." (or "…your bolts can split now.")
- No count UI. The screen shows it.

## 6. What New Bot implements
1. `mobCountFor(state)` in state.js using the rule in §2, capped at `WAVE_SIZE` (3).
2. Arena: build `WAVE_SIZE` slots as today, but only show and activate the first `mobCountFor(state)`. Re-check on purchase. When the count rises, walk the new slot in right away. It never drops mid-task, only on load or prestige.
3. Solo respawn: 150 ms delay and 0.6 s edge walk-in, with immediate focus (§3).
4. Toast copy (§5).
5. Leave Tier Tests, Cannon, and offline math alone.

## 7. Game Artist and Game Audio
Nothing new.

## 8. Out of scope
Raising the cap above 3, temporary extra monsters during Bomb Barrage or Venom Barrage, and World 2+ spawn patterns.
