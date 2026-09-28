#!/usr/bin/env python3
"""Idle Obelisk Miner (World 1) vs AFK Slayer — scoped to W1 through World 2 unlock."""
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

OUT = "/workspace/contract-board/design/Idle_Obelisk_Miner_World1_vs_AFK_Slayer.xlsx"
TITLE = "Idle Obelisk Miner (World 1) vs AFK Slayer"

HEADERS = [
    "System/Item",
    "Obelisk Miner (W1) value",
    "OM Source (URL)",
    "OM Confidence",
    "AFK Slayer equivalent",
    "AFK Slayer value",
    "AFK Source (file + symbol)",
    "AFK Confidence",
    "Notes",
]

hdr_fill = PatternFill("solid", fgColor="1F4E79")
hdr_font = Font(bold=True, color="FFFFFF", name="Calibri", size=11)
wrap = Alignment(wrap_text=True, vertical="top")
thin = Border(
    left=Side(style="thin", color="B0B0B0"),
    right=Side(style="thin", color="B0B0B0"),
    top=Side(style="thin", color="B0B0B0"),
    bottom=Side(style="thin", color="B0B0B0"),
)
alt_fill = PatternFill("solid", fgColor="F2F2F2")
exact_fill = PatternFill("solid", fgColor="E2EFDA")
est_fill = PatternFill("solid", fgColor="FFF2CC")
unk_fill = PatternFill("solid", fgColor="FCE4D6")
title_font = Font(bold=True, name="Calibri", size=14, color="1F4E79")
section_font = Font(bold=True, name="Calibri", size=11, color="1F4E79")
COL_WIDTHS = [28, 48, 42, 14, 28, 48, 42, 14, 40]
WIKI = "https://shminer.miraheze.org/wiki/"

def style_sheet(ws):
    for i, w in enumerate(COL_WIDTHS, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A2"
    ws.row_dimensions[1].height = 30
    for col in range(1, len(HEADERS) + 1):
        cell = ws.cell(1, col)
        cell.fill = hdr_fill
        cell.font = hdr_font
        cell.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
        cell.border = thin

def add_header(ws):
    for c, h in enumerate(HEADERS, 1):
        ws.cell(1, c, h)

def add_row(ws, row, values):
    for c, v in enumerate(values, 1):
        cell = ws.cell(row, c, v)
        cell.alignment = wrap
        cell.border = thin
        cell.font = Font(name="Calibri", size=10)
    if row % 2 == 0:
        for c in range(1, 10):
            ws.cell(row, c).fill = alt_fill
    for conf_col in (4, 8):
        val = str(values[conf_col - 1]).lower()
        if val.startswith("exact"):
            ws.cell(row, conf_col).fill = exact_fill
        elif "estimate" in val or "approx" in val:
            ws.cell(row, conf_col).fill = est_fill
        elif "unknown" in val:
            ws.cell(row, conf_col).fill = unk_fill
    ws.row_dimensions[row].height = 58
    return row + 1

wb = Workbook()

# ========== ABOUT ==========
ws = wb.active
ws.title = "About"
about = [
    (TITLE, True),
    ("", False),
    ("Scope (LOCKED per Alex 2026-09-24)", True),
    ("Idle Obelisk Miner side is WORLD 1 ONLY — floors 1–42, systems unlocked through Construct (Obelisk 19), ending at the World 2 monument unlock. World 2+ content is out of scope.", False),
    ("World 2 unlock marker: Construct monument costs 2,000 Gems + 2k Stone/Magma/Virtual Veins (wiki Construct). Guide recommends ~9 W1 statues + ~39 challenges first.", False),
    ("AFK Slayer focus of Takeaways: Level 1 → first boss (Elder) → into Level 2 feel.", False),
    ("", False),
    ("How to read", True),
    ("Columns: System/Item | OM (W1) value | OM Source | OM Confidence | AFK equivalent | AFK value | AFK Source | AFK Confidence | Notes.", False),
    ("Confidence: exact = wiki/code verbatim; community calc = published formula arithmetic; estimate/APPROX = community report with source; unknown = not sourced (never invented).", False),
    ("Player-facing AFK copy never says 'quarry'.", False),
    ("", False),
    ("Important corrections", True),
    ("OM Skill Tree = named permanent skills, NOT STR/AGI/PER/INT/LCK.", False),
    ("AFK Nightweave 720 = displayLevel; HP = 150×3.6 = 540. Elder HP = 150×1.85 ≈ 278.", False),
    ("First prestige (min level 20) happens inside World 1 — Prestige tab included.", False),
    ("", False),
    ("Sources that worked", True),
    ("Wiki WebFetch: Upgrades, Bombs, Obelisk, Floors, Skill-Tree, Prestige, Workshop, Drones, Construct, Guides/Progression_Guide, Pets, Cards, External_Resources.", False),
    ("Reddit: W1→W2 Construct wall / statue timing threads. ObeliskFarm GitHub README (freebie tools; formulas from wiki).", False),
    ("AFK: js/data.js, js/state.js, js/arena.js + design/*.md.", False),
]
ws.column_dimensions["A"].width = 118
for i, (text, bold) in enumerate(about, 1):
    cell = ws.cell(i, 1, text)
    cell.alignment = wrap
    cell.font = title_font if (bold and i == 1) else (section_font if bold else Font(name="Calibri", size=11))
    ws.row_dimensions[i].height = 18 if text else 8

# ========== 1 Damage & Upgrades ==========
ws = wb.create_sheet("1. Damage & Upgrades")
add_header(ws)
r = 2
for row in [
    ["Upgrade Pickaxe (base damage)",
     "Base damage = (Level+1)×(Level+2)/2. Max 171 (incl. later cap bumps — full max is late-game). Unlock Level 1. Bars/gold cost.",
     WIKI+"Upgrades", "exact",
     "Bolt damage (boltHpChip)",
     "Chip sized for early-mob TTK≈BOLT_TTK_SEC=12s: baseChip=(hp/12)×(interval/1000)×rawN×(GLOBAL_DMG_MULT/0.12)×(BEAM_POWER_MULT/0.015)×liveKillMult. Round ≥1.",
     "js/arena.js boltHpChipRaw; BOLT_TTK_SEC; GLOBAL_DMG_MULT 0.12", "exact",
     "W1 core: pickaxe is only Obelisk damage. AFK bolts auto-scale to target HP."],
    ["World Upgrade cost curve",
     "Lv1–10: Cost=Base×N. Lv11+: Cost=Base×1.3^(N-10)×N",
     WIKI+"Upgrades", "exact",
     "Per-upgrade baseCost × costMult^level",
     "Each upgrade lists own baseCost/costMult/maxLevel in data.js (no shared 1.3^ curve).",
     "js/data.js upgrades[]", "exact",
     ""],
    ["Early W1 Pickaxe Crit Chance",
     "+2%/lv max16 unlock player Level 8 (also later +2% ladders at Lv44/85 — still reachable as level cap rises with OBs inside W1).",
     WIKI+"Upgrades", "exact",
     "Unlock Crits + Crit Power",
     "Unlock Crits 250g → base 8% crits. Crit Power +4%/lv max10, baseCost 300, costMult 1.7 gold.",
     "js/data.js unlock_crits, crit_power; js/state.js critChance base 0.08", "exact",
     "OM multi-tier crits (super/ultra) appear mid W1 via upgrades/skills; AFK is single-tier."],
    ["Early W1 Pickaxe Damage %",
     "Within early/mid W1 unlock band: +10% @Lv32; +15% @Lv48; +20% @Lv62 (max 16 each). Higher ×0.02+ ladders need much higher levels — treat as late W1/out of early pacing.",
     WIKI+"Upgrades", "exact",
     "Idle Power + metal gear",
     "Idle Power +12%/lv max40 (40g×1.55). Gear: Bronze +8% free → Iron +12% 180g → Steel +16% 450g → Mithril +22% 320 Sp → Adamant +28% 700 Sp → Rune +35% 1500 Sp → Dragon +50% 3500 Sp.",
     "js/data.js idle_power, gear_bronze…gear_dragon", "exact",
     "AFK damage feel is mostly kill-rate (idlePower), not raw bolt %."],
    ["Pickaxe Radius / Attack Speed (W1)",
     "Radius +8%/lv max16 unlock Lv4. Attack Speed +2%/lv max16 unlock Lv52.",
     WIKI+"Upgrades", "exact",
     "Fixed bolt aim / interval",
     "BOLT_HIT_WIDTH=10.2%; BOLT_AIM_ASSIST_DEG=16. Fire rate via boltIntervalMs() — not a purchased ladder.",
     "js/arena.js BOLT_HIT_WIDTH, boltIntervalMs", "exact",
     ""],
    ["Workshop Pickaxe Damage (permanent)",
     "+3%/lv max42, unlock Obelisk 6. Persists through prestige.",
     WIKI+"Workshop", "exact",
     "Forge / Scrapwork keep",
     "prestigeKeep: scrap_*, forge_knuckle (+6% scrap), forge_echo (+12 min offline), forge_cinder (+4% killMult).",
     "js/data.js prestigeKeep forge_* scrap_*", "exact",
     "W1 Workshop is the permanent damage sink twin."],
    ["Artifact T1 Pickaxe Damage",
     "+10%/lv max32; first artifact in T1 (tutorial). Bought with Prestige Points. T2@OB8, T3@OB14, T4@OB19 — all still W1.",
     WIKI+"Prestige", "exact",
     "Sigil Charter: Idle",
     "+5% permanent idle power for 1 Sigil (scaffolding; L4+ loop not shipped).",
     "js/data.js sigilShop; js/state.js doPrestige", "exact",
     "W1 prestige artifacts are the main permanent pickaxe ladder."],
    ["Drones as labor DPS",
     "Unlock OB2 menu. Drone Damage = % of Pickaxe (+20%/lv max10). Disabled during Obelisk. Suits in W1: Bear@2, Chain@4, Midas@6, Frogger@8.",
     WIKI+"Drones", "exact",
     "Company hunters",
     "Independent track. Bases: Briar 11dmg/1900ms; Quill 4/1200; Moss 13/2100; Ember 5/1300. Hires: Briar 140g, Quill 900g, Moss 2000g, Ember 4200g. Hunter Power +30%/lv max20; Bigger Hits +40%/lv max15; Faster Attacks +30%/lv max12.",
     "js/data.js HUNTER_COMBAT; hunter_*", "exact",
     "Early Briar (~140g) is the AFK twin of early drones."],
    ["Bolt Pierce / Bounce",
     "no W1 pickaxe twin (OM uses radius/crit)",
     WIKI+"Upgrades", "exact",
     "Bolt Pierce / Bounce",
     "Pierce max2, 180g×2.2; Bounce max2, 250g×2.2.",
     "js/data.js bolt_pierce, bolt_bounce", "exact",
     ""],
    ["ACTIVE holding",
     "Hold-to-mine; attack speed upgrades apply",
     WIKI+"Stats", "exact",
     "ACTIVE_MULT",
     "ACTIVE_MULT=1.4 on kill-rate while holding; PLAYER_BASE_IDLE=0.75 solo.",
     "js/data.js ACTIVE_MULT, PLAYER_BASE_IDLE", "exact",
     ""],
    ["W2+ damage upgrades",
     "OUT OF SCOPE — high-level World Upgrades (Lv100+), W2–W4 Workshop damage, Minotaur suit, etc.",
     WIKI+"Upgrades", "exact",
     "—",
     "—",
     "—",
     "exact",
     "Explicitly excluded per World 1 scope."],
]:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 2 Bombs ==========
ws = wb.create_sheet("2. Bombs")
add_header(ws)
r = 2
for row in [
    ["Bombs vs Obelisk",
     "Bombs deal 0 damage to Obelisk; drones disabled in fight",
     WIKI+"Bombs", "exact",
     "Full kit in boss fight",
     "Boss uses same bolts; hunters help; Specials = heavy pulse ×2.2 chip if unlocked",
     "js/arena.js specials; elder-thornpelt-tuning.md", "exact",
     "OM forces pickaxe-only bosses — different from AFK."],
    ["Basic / Chain Bomb",
     "Default. Basic CD 30s; Chain CD 60s (fires 1.25s apart). Core early clear tools.",
     WIKI+"Bombs", "exact",
     "no bomb inventory",
     "Closest: hunter auto-chips + specials",
     "js/data.js HUNTER_COMBAT; unlock_specials", "exact",
     ""],
    ["W1 Workshop bomb unlocks",
     "OB1 Bomb of Plenty; OB2 Exp Bomb + Chain amount; OB3 Infinity + Plenty multi; OB5 Cherry; OB7 D20; OB8 Exp bonus; OB9 Megabomb dmg; OB10 D20 max charges; OB12 Cherry 3× chance; OB14 Infinity scaling; OB18 Transmuter multi",
     WIKI+"Workshop", "exact",
     "Unlock Specials / Crits",
     "Specials 360g; Cadence +0.12/lv max5 (220 Sp); Crits 250g",
     "js/data.js unlock_specials, special_cadence, unlock_crits", "exact",
     "W1 bombs are a whole economy; AFK has one pulse unlock."],
    ["Store / Skill bombs (W1)",
     "MEGABOMB, Transmuter, Battery (Store). Gem Bomb + Veinmorpher via Skill-Tree (Veinmorpher needs OB19).",
     WIKI+"Bombs", "exact",
     "no equivalent",
     "no equivalent",
     "—",
     "exact",
     "Battery/Cherry loop is the W1 bomb skill ceiling."],
    ["Bomb Damage / Recharge (W1 world ups)",
     "Bomb Damage +20% unlock Lv20; Recharge +1%/lv unlock Lv60. Later huge bomb ladders are post-W1 pacing.",
     WIKI+"Upgrades", "exact",
     "Special Cadence",
     "+12% fire rate/lv max5",
     "js/data.js special_cadence", "exact",
     ""],
    ["Auto-Bomber",
     "Skill-Tree: auto-fire selected bomb every 1.25s; 10 SP. Early priority skill.",
     WIKI+"Skill-Tree", "exact",
     "Hire Briar (auto DPS)",
     "Hunters attack on interval once hired",
     "js/data.js hunter_briar; HUNTER_COMBAT", "exact",
     "Both = AFK damage after a cheap early unlock."],
    ["Golden bombs / W2+ bomb ups",
     "OUT OF SCOPE (Fishing tributes, W2 Workshop bomb damage, etc.)",
     WIKI+"Bombs", "exact",
     "—",
     "—",
     "—",
     "exact",
     ""],
]:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 3 Obelisk & Floors ==========
ws = wb.create_sheet("3. Obelisk & Floors")
add_header(ws)
r = 2
for row in [
    ["W1 floor range",
     "Floors 1–42 across Stone/Magma/Virtual/Space/Cloud/Atomic zones. Clear req W1 = floor×5 (F1→2 needs 5 clears).",
     WIKI+"Floors", "exact",
     "Level 1–3 hunt ladders",
     "3 Levels (L4 hidden). Kill quotas: Cub25 → Matron220. Area mult 1.0 / 1.35 / 1.8",
     "js/data.js areas[]; contracts[].killQuota", "exact",
     "W2 floors 43+ OUT OF SCOPE."],
    ["Obelisk HP (≤OB60 formula)",
     "HP = round(100k × 2.8^(L-1)). OB1=100k; OB10=1.05b; OB19≈11.1t. Armor = round(10×2.8^(L-1)); must beat armor with base pickaxe.",
     WIKI+"Obelisk", "exact",
     "Monster/boss HP = 150 × hpMult",
     "Cub105; Thornpelt225; Elder≈278; Alpha390; Nightweave540",
     "js/data.js MONSTER_VISUAL_HP; combat.hpMult; markedPrey", "exact",
     "OM armor can zero damage — AFK has no armor gate."],
    ["Obelisk fight rules",
     "30s fight window; damage banks across attempts; 20 min cooldown base (T1 artifact −3%/lv). Pickaxe only.",
     WIKI+"Obelisk", "exact",
     "Fight boss (live arena)",
     "Leave resets HP; access stays paid. Design Elder solo TTK 45–90s (post-fix ~60s).",
     "design/level-boss-progression.md; elder-thornpelt-tuning.md", "exact",
     ""],
    ["W1 unlock milestones by OB",
     "OB1 Workshop; OB2 Drones; OB4 Skill-Tree; OB8 T2 Artifacts; OB10 Challenges; OB12 Contracts; OB14 T3 Artifacts; OB15 Cards; OB17 Pets; OB18 Drone Fuel; OB19 Construct + T4 Artifacts",
     WIKI+"Obelisk", "exact",
     "Level bosses unlock next Level",
     "Elder→L2; Alpha→L3; Nightweave→end card. Features via gold/Sp costs (no time gates).",
     "js/data.js markedPrey; design/time-gates-to-costs.md", "exact",
     "OB gates are OM's content schedule inside W1."],
    ["World 2 unlock (END MARKER)",
     "Build World 2 monument: 2,000 Gems + 2k Stone + 2k Magma + 2k Virtual Veins. Unlocks floors 43–72. Guide: ideally after 9 W1 statues + ~39 challenges.",
     WIKI+"Construct", "exact",
     "n/a (AFK has no W2)",
     "Comparison end = AFK L1 boss cleared + L2 opened",
     "design/level-boss-progression.md", "exact",
     "Everything past this monument is OUT OF SCOPE."],
    ["AFK L1 boss Elder",
     "n/a (OM bosses are Obelisks)",
     WIKI+"Obelisk", "exact",
     "Elder Thornpelt",
     "displayLv30; bossCost 120 Sp; hpMult 1.85 → HP≈278; rewards 100 Sp + 200g + Rat Tooth (+8% idle)",
     "js/data.js markedPrey sewer_king", "exact",
     ""],
    ["AFK L2 boss (into L2)",
     "n/a",
     "—",
     "exact",
     "Ashfang Alpha",
     "displayLv69; bossCost 280 Sp; hpMult 2.6 → HP=390",
     "js/data.js markedPrey mist_wraith", "exact",
     "Takeaways care about entering L2, not finishing Nightweave."],
    ["Boss bolt sizing",
     "n/a",
     "—",
     "exact",
     "boltHpChipRaw uses boss HP in boss fights",
     "Fix applied (was Task/Cub HP → ~159s Elder TTK). Post-fix ~60s solo.",
     "js/arena.js boltHpChipRaw; elder-thornpelt-tuning.md", "exact",
     "Critical for L1 boss feel."],
    ["OB61+ / W2+ floors",
     "OUT OF SCOPE",
     WIKI+"Floors", "exact",
     "—",
     "—",
     "—",
     "exact",
     ""],
]:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 4 Skill Tree ==========
ws = wb.create_sheet("4. Skill Tree")
add_header(ws)
r = 2
for row in [
    ["Unlock / currency",
     "Skill-Tree unlocks Obelisk 4. Permanent. Skill Points from 10 bits, 125 gems, codes/events.",
     WIKI+"Skill-Tree", "exact",
     "Upgrade purchases + progressionMaps",
     "No SP tree — gold/Sp unlocks",
     "js/data.js upgrades; progressionMaps", "exact",
     ""],
    ["No STR/AGI/PER/INT/LCK",
     "NOT PRESENT. Named skills only. Stats page = bonus breakdown UI.",
     WIKI+"Skill-Tree", "exact",
     "no attribute sheet",
     "Bonuses from upgrades, relics, mastery, sigils",
     "js/state.js getBonuses", "exact",
     "Do not cargo-cult RPG attributes for AFK early game."],
    ["Early W1 recommended skills",
     "Gems & Chests (2 SP); Easy Progressor (3); Just Wait Faster (4); Chronokeeper (5); Auto-Bomber (10); Free? That's a great price (12); Gem Bomb (5); Stonks (22, needs OB17)",
     WIKI+"Skill-Tree", "exact",
     "Early AFK buys",
     "Idle Power; Iron 180g; Briar 140g; Bolt Focus 90g; Offline Cap; Crits 250g / Specials 360g",
     "js/data.js; time-gates-to-costs.md", "exact",
     ""],
    ["Damage skills (W1-relevant)",
     "Lucky Strikes (1 SP): +5% crit / +15% crit dmg. Swing Harder (1): +20% pickaxe. Super Damage (4): +40% dmg / +20% crit dmg / +15% radius.",
     WIKI+"Skill-Tree", "exact",
     "Idle Power / gear / crits",
     "Idle Power +12%/lv; gear ladder; Unlock Crits",
     "js/data.js idle_power, gear_*, unlock_crits", "exact",
     "Tons of Damage (OB23) is past W2 unlock typically — out of early W1 focus."],
    ["Chronokeeper / Easy Progressor",
     "Chronokeeper (5 SP): offline items+relics doubled, freebie bank +1, bomb cap +10. Easy Progressor (3): floor clear −10%, PP 1.2×, ore sell 1.2×.",
     WIKI+"Skill-Tree", "exact",
     "Offline Cap / Boss Meter Focus",
     "Base offline 360 min; Offline Cap +30 min/lv max20. prey_chip +15%/lv meter fill max15.",
     "js/state.js offlineCapMin=360; js/data.js offline_cap, prey_chip", "exact",
     ""],
    ["Mastery (AFK)",
     "no Skill-Tree twin",
     "—",
     "exact",
     "Per-monster mastery 0–10",
     "Gold mult 1+0.05×m; chest chance; auto +1 / 3 completions",
     "js/state.js masteryGoldMult, masteryChestChance", "exact",
     "Best AFK long-tail per-target invest without attributes."],
    ["Late Skill-Tree (OB23+)",
     "OUT OF SCOPE for W1 sheet detail (Tons of Damage OB23, fishing skills OB37, void skills OB60+, etc.)",
     WIKI+"Skill-Tree", "exact",
     "—",
     "—",
     "—",
     "exact",
     ""],
]:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 5 Prestige ==========
ws = wb.create_sheet("5. Prestige")
add_header(ws)
r = 2
for row in [
    ["First prestige is IN World 1",
     "Min level 20. Level cap starts 30 (+5 per OB). Happens well before World 2 monument — core W1 loop for buying Artifacts.",
     WIKI+"Prestige", "exact",
     "Prestige / L4+",
     "none yet (planned L4+). Code has doPrestige + Sigils but not the shipped L1–3 goal.",
     "design/level-boss-progression.md; js/state.js doPrestige", "exact",
     "Included because first prestige is a W1 system."],
    ["What resets / persists (OM)",
     "Resets: level, gold, ores, bars, contracts, World Upgrades. Persists: relics, artifacts, Skill-Tree, Workshop, drones points, challenges, cards, items, veins…",
     WIKI+"Prestige", "exact",
     "doPrestige keep set (future)",
     "Keeps relics, bestiary, hunters, prestigeKeep scrap/forge, scraps, mats, areas, prey, sigils, 25% guild XP, features",
     "js/state.js doPrestige", "exact",
     ""],
    ["PP formula (W1 levels)",
     "Below Lv200: PP = 12 × 1.084^(level−10) × PP Gain Multi. Artifacts T1–T4 all unlockable by OB19 (still W1).",
     WIKI+"Prestige", "exact",
     "Sigils",
     "sigilsEarned = 1 + floor(prestigeCount×0.5) + (prey finished?1:0)",
     "js/state.js doPrestige; js/data.js sigilShop", "exact",
     ""],
    ["Community when-to-prestige (W1)",
     "APPROX: prestige when pickaxe damage stalls / need PP for artifacts; early OBs often short runs. Reddit: push toward ~OB15 then prestige more; no single hour figure.",
     "https://www.reddit.com/r/IdleObeliskMiner/comments/1scbw3h/new_player_question/", "estimate",
     "n/a yet",
     "none yet",
     "user brief / design docs", "exact",
     ""],
    ["Auto-Prestige skill",
     "Needs OB30 skill — typically after W2 unlock path; treat as OUT OF SCOPE detail",
     WIKI+"Prestige", "exact",
     "—",
     "—",
     "—",
     "exact",
     ""],
]:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 6 Early Pacing ==========
ws = wb.create_sheet("6. Early Pacing")
add_header(ws)
r = 2
for row in [
    ["KEY: Time to World 2 unlock (APPROX)",
     "APPROX: Construct unlocks at OB19 (exact). World 2 monument is optional after that. Guide: don't rush — build 9 W1 statues first. Reddit: players hit Construct and need 'a few days' of bar/vein grind; some reach OB27 before building W2; rule of thumb ≤1–2 days per statue when ready (else improve other tabs). No authoritative total-hours-from-install figure found.",
     WIKI+"Guides/Progression_Guide", "estimate",
     "Time to L1 boss access + enter L2",
     "Design: fill 120 Sp meter ≈20–40 min engaged → Fight Elder → L2 unlocks on kill",
     "design/level-boss-progression.md", "exact",
     "Primary OM pacing end-marker for this sheet."],
    ["World 2 monument cost (exact gate)",
     "2,000 Gems + 2,000 Stone Veins + 2,000 Magma Veins + 2,000 Virtual Veins",
     WIKI+"Construct", "exact",
     "Elder bossCost",
     "120 Slayer points to open Fight boss",
     "js/data.js markedPrey.bossCost", "exact",
     ""],
    ["Time to OB10 (APPROX)",
     "APPROX: early OBs feel fast; OB10 unlocks Challenges and is a known armor choke. No wiki hour count. Community: idle pace, later OBs measured in days.",
     WIKI+"Guides/Progression_Guide", "estimate",
     "L1 meter fill",
     "120 Sp @ design rates ~3 Sp/min ≈40 min; ~6.5 Sp/min ≈18 min → brackets 20–40 min target",
     "bossCost 120; time-gates-to-costs.md earn table", "community calc",
     ""],
    ["Construct wall @ OB19",
     "Exact unlock OB19. Guide calls it first major wall — shift from beating OBs to filling menus (veins, statues, prestige, pets, challenges).",
     WIKI+"Guides/Progression_Guide", "exact",
     "L1→L2 transition",
     "Should feel like a new creature family + higher meter (280 Sp), not a multi-day softlock",
     "design/level-boss-progression.md; creature-boss-families.md", "exact",
     "AFK should NOT copy Construct-length walls for first portion."],
    ["Elder fight sit time",
     "OM: many 30s attempts, damage banks, 20 min CD",
     WIKI+"Obelisk", "exact",
     "Elder TTK target",
     "45–90s design; code post-fix ~60s solo; Briar+Swift ~40s (tuning doc)",
     "elder-thornpelt-tuning.md", "exact",
     "One short fight > many banked attempts for AFK L1."],
    ["Offline early W1",
     "Offline is core; Chronokeeper doubles offline items/relics (5 SP)",
     WIKI+"Skill-Tree", "estimate",
     "Offline cap base 360 min",
     "getBonuses offlineCapMin=360; +30 min/lv Offline Cap max20",
     "js/state.js offlineCapMin; js/data.js offline_cap", "exact",
     "360 min ≈ overnight — good L1 product lever."],
    ["AFK L1 earn calibration",
     "n/a",
     "—",
     "exact",
     "Staged rates (design)",
     "~8–10m solo: 7–8g/min, ~3 Sp/min; +Briar 15–25m: 10–16g, 4–6.5 Sp",
     "design/time-gates-to-costs.md", "estimate",
     "Used to price Iron/Briar/Crits — not live telemetry."],
    ["OB50 / W3 / Fishing times",
     "OUT OF SCOPE",
     "—",
     "exact",
     "Nightweave deep endgame",
     "Out of Takeaways focus (first portion only)",
     "—",
     "exact",
     ""],
]:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 7 Side Systems ==========
ws = wb.create_sheet("7. Side Systems")
add_header(ws)
r = 2
for row in [
    ["Drones (W1)",
     "OB2+. Auto-mine off pickaxe %. W1 suits: Bear/Chain/Midas/Frogger. Fuel @OB18.",
     WIKI+"Drones", "exact",
     "Company hunters",
     "Briar→Ember hires + upgrades; food economy",
     "js/data.js hunters, hunter_*", "exact",
     ""],
    ["Workshop (W1)",
     "OB1. Permanent bomb unlocks + pickaxe/bomb multis through OB18 Transmuter",
     WIKI+"Workshop", "exact",
     "Forge / Scrapwork",
     "Mat crafts + scrap upgrades (prestigeKeep)",
     "js/data.js forge_*; scrap_*", "exact",
     ""],
    ["Challenges",
     "Unlock OB10. Permanent challenge upgrades. Some need many prestiges.",
     WIKI+"Guides/Progression_Guide", "exact",
     "no challenge board yet",
     "no equivalent",
     "—",
     "exact",
     ""],
    ["Contracts (OM)",
     "Unlock OB12. Bar sinks → contract points → upgrades (reset on prestige)",
     WIKI+"Prestige", "exact",
     "Hunt Tasks",
     "killQuota tasks; gold + Sp; unlock next monster in family",
     "js/data.js contracts[]", "exact",
     "Same word, different systems."],
    ["Cards",
     "Unlock OB15. Ore/bar/bomb/misc cards; gild with PP+gold+gems",
     WIKI+"Cards", "exact",
     "Boss relics (few)",
     "rat_tooth / fog_lens / bone_seal — fixed bonuses",
     "js/data.js relics", "exact",
     ""],
    ["Pets",
     "Unlock OB17. Gem buy + total pet level gates. Crab/Dwarf first.",
     WIKI+"Pets", "exact",
     "no pets",
     "no equivalent",
     "—",
     "exact",
     ""],
    ["Construct (W1 end)",
     "Unlock OB19. W1 veins (Stone→Atomic), 9 statues, World 2 monument. First major wall.",
     WIKI+"Construct", "exact",
     "Forge mats (tiny)",
     "Signature mats → 3 one-time forges",
     "js/data.js forge_*; forge-mat-retarget.md", "exact",
     "AFK forge ≪ OM Construct — don't inflate early."],
    ["Freebies / Chests",
     "Freebie pack ~10 min base — early gem source",
     WIKI+"Stats", "exact",
     "Chest meters",
     "Permanent + boost chests charge from hunt time (incl. offline)",
     "js/state.js chests; js/chests.js", "exact",
     ""],
    ["Later systems (OUT OF SCOPE)",
     "Stargazing OB23; Archaeology OB30; Platinized statues OB35; Fishing OB37; World 3/4 monuments; Arcanist OB70; Lootfrogs/Black Hole — all OUT OF SCOPE for this sheet.",
     WIKI+"Obelisk", "exact",
     "L3+/future",
     "Not in first-portion Takeaways",
     "—",
     "exact",
     "Single catch-all row as requested."],
]:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 8 Takeaways ==========
ws = wb.create_sheet("8. Takeaways")
add_header(ws)
r = 2
TAKEAWAYS = []
for row in [
    ["T1. Keep L1 boss as one short sit-down fight (45–90s), not a Construct wall",
     "OM banks Obelisk damage across 30s attempts with 20 min CD — long HP OK. Construct@19 is days of statues.",
     WIKI+"Obelisk", "exact",
     "Elder leave resets HP; target TTK 45–90s (~60s post-fix)",
     "Protect the short fight. Don't raise Elder HP without banking damage or players bounce.",
     "elder-thornpelt-tuning.md; Early Pacing tab", "exact",
     "First-portion lesson."],
    ["T2. Size bolts from the boss you're fighting",
     "OM pickaxe is absolute; AFK chips scale to target HP.",
     WIKI+"Upgrades", "exact",
     "boltHpChipRaw must use boss HP",
     "Cub-sized bolts vs Elder caused ~159s TTK. Fix applied — keep regression tests for Alpha.",
     "js/arena.js boltHpChipRaw", "exact",
     "L1 boss feel depends on this."],
    ["T3. Meter fill 20–40 min is the L1 'obelisk gate' — protect Sp from competing sinks",
     "OM Obelisk gate is damage, not shared spend currency.",
     WIKI+"Obelisk", "exact",
     "120 Sp meter; hires moved to gold",
     "Keep Briar/Quill/Moss/Ember on gold so Sp fills Elder/Alpha meters.",
     "time-gates-to-costs.md; elder-thornpelt-tuning.md", "exact",
     ""],
    ["T4. Cheap first auto-labor unlock (Briar ≈ early drones / Auto-Bomber)",
     "OM: drones OB2; Auto-Bomber 10 SP called early priority.",
     WIKI+"Drones", "exact",
     "Briar 140g",
     "Keep first hunter reachable before/around meter fill — currently aligned.",
     "js/data.js hunter_briar", "exact",
     ""],
    ["T5. Unlock milestones > raw number go-up for the first portion",
     "W1 paces via OB1 Workshop → OB2 Drones → OB4 Skills → OB10 Challenges → OB15 Cards → OB17 Pets → OB19 Construct.",
     WIKI+"Obelisk", "exact",
     "Elder clear → L2 + relic",
     "Entering L2 should teach a new family (wolves) + higher meter, not just bigger hpMult.",
     "level-boss-progression.md; creature-boss-families.md", "exact",
     ""],
    ["T6. Do NOT copy the Construct-length wall into L1→L2",
     "Guide + Reddit: OB19 Construct is the first major slowdown (days of veins/bars/statues before W2).",
     WIKI+"Guides/Progression_Guide", "exact",
     "L2 should open immediately on Elder kill",
     "Already true — keep it. Save long sinks for post-L3 / prestige.",
     "markedPrey unlockAreaId", "exact",
     ""],
    ["T7. Overnight offline cap (~360 min) is a feature for L1 retention",
     "OM treats offline as core; Chronokeeper doubles offline loot.",
     WIKI+"Skill-Tree", "exact",
     "Base offlineCapMin=360",
     "Show the cap clearly; let Offline Cap / scraps extend it — don't surprise-truncate first nights.",
     "js/state.js offlineCapMin=360", "exact",
     ""],
    ["T8. Skip RPG attributes; use mastery + a few relics for L1 depth",
     "OM Skill-Tree ≠ STR/AGI. W1 depth = skills + artifacts + mastery-like challenges.",
     WIKI+"Skill-Tree", "exact",
     "Mastery 0–10 + Rat Tooth relic",
     "Enough long-tail for L1→L2 without an attribute sheet.",
     "js/state.js mastery*; js/data.js relics", "exact",
     ""],
    ["T9. Permanent vs run upgrades — sketch now, ship prestige later",
     "W1 already teaches reset rhythm: World Ups reset, Workshop/Skills/Artifacts persist.",
     WIKI+"Prestige", "exact",
     "prestigeKeep scrap/forge + relics + hunters; gear/idle_power reset if prestige ships",
     "When L4+ lands, mirror that readability — don't invent it mid-L1.",
     "js/state.js doPrestige", "exact",
     ""],
    ["T10. Side systems after the L1 boss feels good",
     "W1 still adds Cards/Pets/Construct after the damage loop works. Guide: fill menus you have before rushing W2.",
     WIKI+"Guides/Progression_Guide", "exact",
     "Scrapwork / Forge / Chests / Company are enough for first portion",
     "Polish Elder ~60s + 20–40 min meter before adding card/pet clones.",
     "Side Systems tab; elder-thornpelt-tuning.md", "exact",
     ""],
]:
    TAKEAWAYS.append(row[0])
    r = add_row(ws, r, row)
style_sheet(ws)

# Confidence recount helper text on About
from openpyxl import load_workbook as _  # noqa — tallies after save via separate pass
wb.save(OUT)

# recount and patch About
from collections import Counter
wb2 = load_workbook(OUT)
om = Counter(); afk = Counter(); n = 0
for name in wb2.sheetnames:
    if name == "About":
        continue
    for row in wb2[name].iter_rows(min_row=2, values_only=True):
        if not row or not row[0]:
            continue
        n += 1
        def bucket(v):
            s = str(v or "").lower()
            if s.startswith("exact"): return "exact"
            if "community" in s: return "community calc"
            if "estimate" in s or "approx" in s: return "estimate"
            if "unknown" in s: return "unknown"
            return "other"
        om[bucket(row[3])] += 1
        afk[bucket(row[7])] += 1
ws = wb2["About"]
r = ws.max_row + 2
ws.cell(r, 1, "Row confidence tallies").font = section_font
ws.cell(r+1, 1, f"{n} data rows. OM Confidence: exact={om['exact']}; estimate/APPROX={om['estimate']}; community calc={om['community calc']}; unknown={om['unknown']}. AFK Confidence: exact={afk['exact']}; estimate={afk['estimate']}; community calc={afk['community calc']}; unknown={afk['unknown']}.")
wb2.save(OUT)
print("Wrote", OUT)
print("rows", n, "OM", dict(om), "AFK", dict(afk))
print("TAKEAWAYS:")
for t in TAKEAWAYS:
    print("-", t)
