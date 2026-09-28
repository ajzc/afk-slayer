# Design Brief: Equip Gear Ladder (what you wear is what makes you stronger)

**Status:** Ready to build. Revised 2026-09-24 per Alex (via New Bot). Milestone cosmetics are cut. Everything shown is equipped. The cape and Slayer helm are earned items with real stats. Pairs with `iom-style-redesign.md`.

## 1. Goal (player feeling)
You start plain. Every visible piece on your hunter is a real item you bought to get stronger, and it shows on the Hunt screen the moment you equip it. A glance at your hunter tells you how strong you are.

## 2. Rules
- **Slots:** Weapon, Legs, Body, Helm, plus Cape (an earned reward). No shield.
- **Every visible piece is an item you own and equip.** Buying (or earning) it auto-equips the best tier in that slot. The Hunt-screen and arena sprite update right away. The visual always reads equipped items, never Slayer level.
- **Armor tiers per slot:** Leather (tier 0), then Bronze, Iron, Steel, Mithril, Adamant, Rune, Dragon (tiers 1 to 7). The weapon keeps its existing ladder and prices.
- **A metal armor tier can't exceed your weapon tier.** Leather is always allowed.
- **Slots open by Slayer level** (purchase availability only, and you still have to buy): Legs at SL5, Body at SL7, Helm at SL9. **The hunter is plain through SL4**, with only the blade changing.
- **Armor costs** are gold, bought in the **Smithing** panel, on the shared 1.3 curve: tier t costs `slotBase × 1.3^(3 × t)`, t = 0..7. That makes each tier about 2.2 times the last.
- **Stats** use existing effect keys. The listed values are what that tier gives, not added on top of the tier below. Armor stat values are proposed, so tune them in playtest.
- **Earned rewards with real stats:** the Slayer cape (first prestige, with a trim for each later prestige, max 3) and the Slayer helm (clearing the SL20 Mazchna gate). Both are kept through prestige.
- **Prestige:** bought gear follows the existing `prestigeKeep` rules. If it resets, the sprite goes back to plain, which is correct because the visual always equals what's equipped.
- No timers and no cosmetic-only items.

## 3. Item list

### Weapon (existing, `data.js` gear ladder, stat `idlePower` kill rate)
| id | Tier | Cost | Stat | Visual |
|---|---|---|---|---|
| gear_bronze | 1 Bronze | free (starter) | +8% kill rate | Short dull orange-brown blade, plain wooden grip |
| gear_iron | 2 Iron | 55 gold | +12% | Dark grey blade, slightly longer, leather-wrapped grip |
| gear_steel | 3 Steel | 450 gold | +16% | Bright light-grey longsword, crossguard |
| gear_mithril | 4 Mithril | 320 Sp | +22% | Blue-violet blade with a faint sheen |
| gear_adamant | 5 Adamant | 700 Sp | +28% | Deep green broad blade |
| gear_rune | 6 Rune | 1500 Sp | +35% | Cyan blade, sharp tip, gold-trim guard |
| gear_dragon | 7 Dragon | 3500 Sp | +50% | Red curved blade, ornate hilt |

### Legs (opens SL5, stat `killMult` weapon damage, base 40 gold)
| id | Tier | Cost (gold) | Stat | Visual |
|---|---|---|---|---|
| legs_leather | Leather | 40 | +2% weapon dmg | Brown leather chaps over the trousers |
| legs_bronze | Bronze | 90 | +4% | Bronze platelegs (orange-brown) |
| legs_iron | Iron | 190 | +8% | Iron platelegs (dark grey) |
| legs_steel | Steel | 420 | +12% | Steel platelegs (light grey) |
| legs_mithril | Mithril | 930 | +17% | Mithril platelegs (blue-violet) |
| legs_adamant | Adamant | 2050 | +22% | Adamant platelegs (green) |
| legs_rune | Rune | 4500 | +28% | Rune platelegs (cyan, gold trim) |
| legs_dragon | Dragon | 9900 | +36% | Dragon platelegs (red, ornate) |

### Body (opens SL7, stat `lootGold` gold per kill, base 90 gold)
| id | Tier | Cost (gold) | Stat | Visual |
|---|---|---|---|---|
| body_leather | Leather | 90 | +3% loot gold | Brown leather body replacing the linen shirt |
| body_bronze | Bronze | 200 | +5% | Bronze platebody |
| body_iron | Iron | 430 | +10% | Iron platebody |
| body_steel | Steel | 950 | +16% | Steel platebody |
| body_mithril | Mithril | 2100 | +22% | Mithril platebody |
| body_adamant | Adamant | 4600 | +30% | Adamant platebody |
| body_rune | Rune | 10100 | +38% | Rune platebody, gold trim |
| body_dragon | Dragon | 22200 | +50% | Dragon chainbody, red, scaled |

### Helm (opens SL9, after Crits at SL7, stat `critChance`, base 150 gold)
| id | Tier | Cost (gold) | Stat | Visual |
|---|---|---|---|---|
| helm_leather | Leather | 150 | +1% crit | Brown leather coif |
| helm_bronze | Bronze | 330 | +2% | Bronze med helm (open face) |
| helm_iron | Iron | 720 | +3% | Iron med helm |
| helm_steel | Steel | 1600 | +4% | Steel med helm |
| helm_mithril | Mithril | 3500 | +6% | Mithril full helm (closed visor) |
| helm_adamant | Adamant | 7700 | +8% | Adamant full helm |
| helm_rune | Rune | 16900 | +10% | Rune full helm, gold trim |
| helm_dragon | Dragon | 37100 | +12% | Dragon med helm, red with a crest fin |
| helm_slayer | Slayer helm (earned) | Clear the SL20 Mazchna gate | +12% crit and +10% Slayer points (proposed; add a Slayer-points gain key if none exists) | Black-and-grey Slayer helmet, face mask, glowing eye slits |

The Slayer helm is a helm-slot item. It auto-equips when earned. Players can switch helms in Smithing.

### Cape (earned, prestige, stat `offlineCap`)
| id | Trigger | Stat | Visual |
|---|---|---|---|
| cape_slayer | First prestige | +10% offline cap | Plain dark cape, hangs behind the body |
| cape_slayer (trim 1 to 3) | Each later prestige, max 3 | +5% offline cap per trim | Add 1 to 3 gold stripes along the hem |

The starter look is a plain linen shirt, brown cloth trousers, a bare head, and the Bronze blade. That lasts through SL4, apart from blade swaps.

## 4. Names
The OSRS metal and piece names are used for the private playtest. For a public release, swap them to stand-ins using the metal map in `iom-style-redesign.md` §4: Ash, Ember, Tide, Mist, Ironbark, Runemark, Drake. The pieces become Greaves, Cuirass, and Helm. Leather becomes Hide. The Slayer helm becomes Hunter's Visor, and the Slayer cape becomes Crest Cloak.

## 5. What New Bot implements
1. Add the 24 bought armor items above (plus `helm_slayer` and `cape_slayer` as earned items) to `data.js`. Each has a `slot` (legs, body, helm, or cape), `gearTier`, `minSlayerLevel`, `requiresUpgrade` (the previous tier in its slot), plus a rule that metal `gearTier` must be at or below the owned weapon tier (Leather is exempt). All are gold costs.
2. Buying an item equips it, and the highest owned tier per slot is the one equipped.
3. `visibleGear(state)` (alias `equippedGear`) reads equipped items and returns `{ weapon, legs, body, helm, cape, capeTrim }`. It never reads Slayer level. The Hunt-screen hunter and the arena hunter render the base sprite plus overlays from it. They update on purchase, with a short "Equipped: Iron platelegs" toast and no sound.
4. Show them in Smithing: three slot rows showing the next tier, its cost, and its stat, greyed out with a reason ("Needs Steel blade" or "Slayer level 5").
5. The cape is granted on first prestige and adds a trim on each later prestige. The Slayer helm is granted on clearing the Mazchna gate. Both are kept through prestige.
6. Remove any SL-milestone or `bestSlayerLevel` cosmetic logic from the earlier version of this brief.

## 6. What Game Artist needs
Overlays drawn on the **plain starter sprite**, lined up to its idle, attack, and walk frames:
- Weapon: 7 blades as described.
- Legs: leather chaps and 1 plate-legs overlay.
- Body: leather body, 1 platebody overlay, and a separate Dragon chainbody.
- Helm: leather coif, med helm, full helm, the Dragon med helm with fin, and the Slayer helmet.
- Cape: a plain dark cape, plus 3 gold hem-stripe overlays.
- Draw the armor in neutral grey and palette-swap it to the 7 metals: Bronze orange-brown, Iron dark grey, Steel light grey, Mithril blue-violet, Adamant green, Rune cyan with gold trim, Dragon red.
- Layer order, back to front: cape, body base, legs, body armor, helm, weapon.

## 7. Out of scope
Shield, boots, gloves, amulets, cosmetics shop, dyes, World 2+ gear, helper outfits, sounds.
