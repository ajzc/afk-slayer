# Design Brief: Early Kill Cut (until the first AFK helper)

**Status:** LOCKED 2026-09-24 (Alex: "lower the amount of monsters by 80% in the first few levels until we have an AFK helper").

## 1. Goal
The first few levels should feel quick and rewarding, not like a grind. You reach your first helper fast, and after that the normal idle pace takes over.

## 2. Rules and numbers
- **The window:** from a new game until **Hire Warrior** (`hunter_briar`) is owned. When the Warrior is hired, everything goes back to normal for good. It doesn't come back if you prestige later.
- **Task kill quotas are cut by 80%** during the window: `quota = max(2, round(killQuota × 0.2))`. The window has its own floor of 2 instead of the normal minimum of 5.
  - Crawling Hand: from 8 to 2
  - Cave Crawler: from 12 to 2
  - Banshee: from 24 to 5
  - To reach Slayer level 4 (the Warrior unlock), that's **9 kills instead of 44**.
- **Each task pays the same as before.** During the window, gold and Slayer points per kill are ×5, and finish bonuses stay the same. Without this, 80% fewer kills would mean 80% less gold, and you'd hit SL4 unable to afford Iron (55), Cannon (50), and the Warrior (140) and have to grind anyway.
- **The Tier Test meter (120) is unchanged.** It fills at the same rate per task because points per kill are ×5.
- Stacks with existing quota modifiers (Swift Quotas etc.) as a multiply, and the floor of 2 still applies.
- Save migration: if a live task's progress is already at or above the new quota, it completes on the next kill.

## 3. Player copy
- Task card during the window: "Early hunts: fewer kills until you hire your first helper."
- On hiring the Warrior: toast "Your Warrior hunts while you're away. Tasks are back to full size."

## 4. What New Bot implements
1. `inEarlyWindow(state)` returns true while `hunter_briar` isn't owned.
2. In `effectiveQuota`: during the window, use `max(2, round(killQuota × quotaMult × 0.2))`, otherwise keep the current rule.
3. In kill rewards (gold per kill, `pointsPerKill` toward both Slayer points and the Tier Test meter): during the window, multiply by 5. Offline/AFK kills in the window get the same multiplier, so the payout per task stays the same.
4. Add the two lines of copy above. The intro instructions that mention quota counts should read the effective quota, not a hardcoded number.

## 5. Game Artist
Nothing.

## 6. Out of scope
Level 2+ quotas, the Tier Test meter size, and hire prices (all tuned separately).
