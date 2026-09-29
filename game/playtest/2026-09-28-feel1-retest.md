# feel1 retest — 2026-09-28 (live ?v=feel1)

| # | Fix | Desktop 1280 | Phone 390 touch |
|---|-----|--------------|-----------------|
| 1 | HP/Hunters kept across tabs/buys | PASS | PASS |
| 2 | Tap buffer + ripples | PASS | PASS (1 extra tap buffered, 3rd dropped) |
| 3 | Gold on coin land, count-up | PASS (~663ms) | PASS (~900ms) |
| 4 | Boss death + BOSS DEFEATED | PASS (banner; beat too short to frame) | PASS |
| 5 | Switcher: no spawns under it; hold in gap fires | PASS | FAIL: real touch-hold in gap (Silkling chip) does not fire, no ripple |
| 6 | Toasts top + merge | FAIL: merged toast covers Intro Tasks header | PASS merge; covers left of arena title / Guild header |
| 7 | Squash, single flash, knockback, crit-only shake | PASS | Could not check (sprites too small at 20fps); not seen failing |

Console: no 'xb' error either size. favicon.ico 404; apple-mobile-web-app-capable deprecation warning.
Bonus: L3 Silkling spiders show as pixel-art sprites — PASS.
Clunky: Hunters sheet opens below fold, no scroll-into-view; phone hold-zone steals taps on the "Hunters · Food · Bosses" bar; small wandering hitboxes miss clicks; W/S/arrow keys change hunt target and can replace wave; buy-while-food-full toast invisible if arena top is off screen.
Shots: feel1-desktop/, feel1-390/
