#!/usr/bin/env python3
"""Build Idle Obelisk Miner vs AFK Slayer comparison workbook."""
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

OUT = "/workspace/contract-board/design/Idle_Obelisk_Miner_vs_AFK_Slayer.xlsx"

HEADERS = [
    "System/Item",
    "Obelisk Miner value",
    "OM Source (URL)",
    "OM Confidence",
    "AFK Slayer equivalent",
    "AFK Slayer value",
    "AFK Source (file + symbol)",
    "AFK Confidence",
    "Notes",
]

# Confidence tallies (updated as rows added)
COUNTS = {"exact": 0, "community calc": 0, "estimate": 0, "unknown": 0}

def conf(c):
    key = c.lower().strip()
    if key.startswith("exact"):
        COUNTS["exact"] += 1
    elif "community" in key or "calc" in key:
        COUNTS["community calc"] += 1
    elif key.startswith("estimate") or key.startswith("approx"):
        COUNTS["estimate"] += 1
    else:
        COUNTS["unknown"] += 1
    return c

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

def style_sheet(ws, freeze=True):
    for i, w in enumerate(COL_WIDTHS, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    if freeze:
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
    # values: 9 fields; OM conf at idx 3, AFK conf at idx 7
    for c, v in enumerate(values, 1):
        cell = ws.cell(row, c, v)
        cell.alignment = wrap
        cell.border = thin
        cell.font = Font(name="Calibri", size=10)
    if row % 2 == 0:
        for c in range(1, 10):
            if ws.cell(row, c).fill.fgColor is None or ws.cell(row, c).fill.fgColor.rgb == "00000000":
                ws.cell(row, c).fill = alt_fill
    # highlight confidence cols
    for conf_col in (4, 8):
        val = str(values[conf_col - 1]).lower()
        if val.startswith("exact"):
            ws.cell(row, conf_col).fill = exact_fill
        elif "estimate" in val or "approx" in val:
            ws.cell(row, conf_col).fill = est_fill
        elif "unknown" in val:
            ws.cell(row, conf_col).fill = unk_fill
    ws.row_dimensions[row].height = 60
    # tally OM confidence
    conf(str(values[3]))
    return row + 1

WIKI = "https://shminer.miraheze.org/wiki/"
AFK = "AFK Slayer"

wb = Workbook()

# ========== ABOUT ==========
ws = wb.active
ws.title = "About"
about_lines = [
    ("Idle Obelisk Miner vs AFK Slayer — Comparison Spreadsheet", True),
    ("", False),
    ("Purpose", True),
    ("Side-by-side systems comparison to inform AFK Slayer pacing and structure. Built 2026-09-24 from live AFK Slayer code under /workspace/contract-board and Idle Obelisk Miner fan wiki + community tools.", False),
    ("", False),
    ("How to read each tab", True),
    ("Each data tab uses columns: System/Item | Obelisk Miner value | OM Source | OM Confidence | AFK Slayer equivalent | AFK Slayer value | AFK Source | AFK Confidence | Notes.", False),
    ("One OM source URL is cited per row. AFK sources use file path + symbol (constant/function name).", False),
    ("Player-facing AFK copy never uses the word 'quarry' (see design/quarry-rename.md).", False),
    ("", False),
    ("Confidence labels", True),
    ("exact — number/formula taken verbatim from wiki (OM, marked up-to-date v2.2.23 where noted) or from AFK source files.", False),
    ("community calc — derived via published community formula/spreadsheet (e.g. wiki cost equations, ObeliskFarm tools) rather than a single in-game dump.", False),
    ("estimate / APPROX — community report or design target; not a hard code constant. Always explained in Notes.", False),
    ("unknown — value not found in sourced material; left blank of invention. Why noted in Notes.", False),
    ("", False),
    ("Games", True),
    ("Idle Obelisk Miner (OM): mobile idle miner by Checkbox; progression via floors → Obelisk bosses → prestige artifacts → side systems (drones, pets, cards, fishing, archaeology, stargazing, construct, arcanist).", False),
    ("AFK Slayer: Alex's idle hunting game (live https://afk-slayer.ajchapman20.workers.dev). Levels 1–3 with Slayer-point boss meters; bolt combat + company hunters; no L4+ / prestige loop shipped yet.", False),
    ("", False),
    ("Important corrections vs common assumptions", True),
    ("OM Skill Tree is named permanent skill nodes (Auto-Bomber, Chronokeeper, etc.) — NOT traditional RPG attributes STR/AGI/PER/INT/LCK. Those attributes do not appear on the Skill-Tree or Stats pages.", False),
    ("OM 'Stats' page is a bonus breakdown UI, not a character attribute sheet.", False),
    ("AFK Nightweave '720' is displayLevel, not HP. HP = MONSTER_VISUAL_HP(150) × hpMult(3.6) = 540.", False),
    ("AFK Elder HP = 150 × 1.85 = 277.5 → 278 integer chips (design/elder-thornpelt-tuning.md).", False),
    ("", False),
    ("Sources that worked", True),
    ("WebFetch succeeded for: Upgrades, Bombs, Obelisk, Floors, Skill-Tree, Prestige, Stats, Workshop, External_Resources, Drones, Pets, Cards, Guides/Progression_Guide.", False),
    ("ObeliskFarm GitHub README fetched via raw.githubusercontent.com (freebie/arch/stargazing EV tools; data note: based on OB32). GitHub API was rate-limited; source formulas for pickaxe/obelisk HP taken from wiki instead.", False),
    ("AFK: js/data.js, js/state.js, js/arena.js + design/*.md.", False),
    ("", False),
    ("Hard rule", True),
    ("No invented numbers. Missing values are 'unknown' or labeled estimate with reason.", False),
]
ws.column_dimensions["A"].width = 120
for i, (text, bold) in enumerate(about_lines, 1):
    cell = ws.cell(i, 1, text)
    cell.alignment = wrap
    cell.font = title_font if (bold and i == 1) else (section_font if bold else Font(name="Calibri", size=11))
    ws.row_dimensions[i].height = 18 if text else 8

# ========== 1 Damage & Upgrades ==========
ws = wb.create_sheet("1. Damage & Upgrades")
add_header(ws)
r = 2
rows = [
    ["Upgrade Pickaxe (base damage)",
     "Base damage = (Level+1)×(Level+2)/2. Max level 171 (incl. cap bumps). Unlock: Level 1. Cost: bars/gold varies.",
     WIKI + "Upgrades", conf("exact"),
     "Bolt damage (boltHpChip)",
     "Chip sized so early mob TTK ≈ BOLT_TTK_SEC=12s: baseChip=(hp/12)×(interval/1000), × rawN × (GLOBAL_DMG_MULT/0.12) × (BEAM_POWER_MULT/0.015) × liveKillMult. Rounded ≥1.",
     "js/arena.js boltHpChipRaw; BOLT_TTK_SEC; GLOBAL_DMG_MULT 0.12; BEAM_POWER_MULT 0.015",
     conf("exact"),
     "OM pickaxe is the only way to damage Obelisks. AFK bolts are the player damage track."],
    ["World Upgrade: Pickaxe Radius",
     "+8%/lv, max 16, unlock Level 4",
     WIKI + "Upgrades", conf("exact"),
     "Bolt hit width / aim",
     "BOLT_HIT_WIDTH=10.2% arena lateral; BOLT_AIM_ASSIST_DEG=16. Not a purchasable upgrade ladder.",
     "js/arena.js BOLT_HIT_WIDTH, BOLT_AIM_ASSIST_DEG",
     conf("exact"),
     "AFK has fixed aim assist, not an upgrade tree."],
    ["World Upgrade: Pickaxe Crit Chance (early)",
     "+2%/lv, max 16, unlock Level 8 (also later +2% at Lv44, Lv85)",
     WIKI + "Upgrades", conf("exact"),
     "Unlock Crits + Crit Power",
     "Unlock Crits: 250 gold, max 1 → enables crits (base 8% once unlocked). Crit Power: +4% crit chance/lv, max 10, baseCost 300, costMult 1.7, gold.",
     "js/data.js unlock_crits, crit_power; js/state.js getBonuses critChance base 0.08",
     conf("exact"),
     "OM crits are multi-tier (crit→super→ultra→omega). AFK is single-tier crit."],
    ["World Upgrade: Pickaxe Crit Damage",
     "+5%/lv max 11 unlock Lv28; +6%/lv max 11 unlock Lv56",
     WIKI + "Upgrades", conf("exact"),
     "Crit damage multiplier",
     "Crits use visual/crit path; hunter crit chip ×1.75. Player bolt crit path via applyVisualHit (crit flag).",
     "js/arena.js hunterHpChip (×1.75); critChanceNow",
     conf("exact"),
     "AFK has no separate purchasable crit-damage %. Hunter crit is ×1.75."],
    ["World Upgrade: Pickaxe Damage % ladders",
     "+10% Lv32; +15% Lv48; +20% Lv62; +28% Lv78; +35% Lv88 (maxes 16–21); later ×0.02/0.04/0.1 multipliers at high levels",
     WIKI + "Upgrades", conf("exact"),
     "Idle Power + metal gear ladder",
     "Idle Power: +12%/lv kill rate, max 40, baseCost 40, costMult 1.55 gold. Gear: Bronze +8% (free) → Iron +12% (180g) → Steel +16% (450g) → Mithril +22% (320 Sp) → Adamant +28% (700 Sp) → Rune +35% (1500 Sp) → Dragon +50% (3500 Sp). Each maxLevel 1.",
     "js/data.js idle_power, gear_bronze…gear_dragon",
     conf("exact"),
     "AFK 'damage' upgrades mostly raise kill-rate (idlePower), not raw bolt chip % — bolts auto-scale to target HP."],
    ["World Upgrade: Pickaxe Attack Speed",
     "+2%/lv, max 16, unlock Level 52 (and again Lv72)",
     WIKI + "Upgrades", conf("exact"),
     "Bolt fire interval",
     "boltIntervalMs() drives fire rate; not a direct player-purchased attack-speed ladder for bolts.",
     "js/arena.js boltIntervalMs",
     conf("exact"),
     "Hunter Faster Attacks is separate (+30%/lv, max 12)."],
    ["World Upgrade cost curve",
     "Levels 1–10: Cost = Base×N. Level 11+: Cost = Base×1.3^(N-10)×N",
     WIKI + "Upgrades", conf("exact"),
     "Upgrade cost curve",
     "Most repeatable upgrades: cost = baseCost × costMult^(level) pattern via buy path; listed baseCost/costMult/maxLevel per upgrade in data.js. No shared 1.3^ formula.",
     "js/data.js upgrades[]; js/state.js buy/upgrade helpers",
     conf("exact"),
     "OM world upgrades use one published curve; AFK uses per-upgrade baseCost/costMult."],
    ["Workshop: Pickaxe Damage (permanent)",
     "+3%/lv, max 42, unlock Obelisk 6 (persists through prestige)",
     WIKI + "Workshop", conf("exact"),
     "Forge / Scrapwork permanents",
     "prestigeKeep upgrades: scrap_*, forge_knuckle (+6% scrap), forge_echo (+12 min offline), forge_cinder (+4% killMult). Not pickaxe-% style.",
     "js/data.js prestigeKeep; forge_*; scrap_*",
     conf("exact"),
     "OM Workshop survives prestige; AFK Scrapwork/Forge keep across prestige() if used."],
    ["Artifact T1 Pickaxe Damage",
     "+10%/lv, max 32; always first artifact in tier; bought with Prestige Points",
     WIKI + "Prestige", conf("exact"),
     "Sigil shop (Charter)",
     "sigil_idle: +5% permanent idle power, cost 1 Sigil. Prestige scaffolding exists in code.",
     "js/data.js sigilShop; js/state.js doPrestige",
     conf("exact"),
     "Player-facing prestige loop still 'none yet' for L4+ (see Prestige tab)."],
    ["Hire / labor: Drones (damage)",
     "Drone Damage = % of Pickaxe Damage (upgrade +20%/lv max 10). Drones disabled on Obelisk. Unlock OB2+.",
     WIKI + "Drones", conf("exact"),
     "Company hunters",
     "Independent combat track (NOT derived from bolt DPS). Bases: Briar dmg11/1900ms; Quill 4/1200; Moss 13/2100; Ember 5/1300. Hires: Briar 140g, Quill 900g, Moss 2000g, Ember 4200g. Hunter Power +30%/lv max20; Bigger Hits +40%/lv max15; Faster Attacks +30%/lv max12.",
     "js/data.js HUNTER_COMBAT; hunter_briar…hunter_ember; hunter_power/damage/atk_speed",
     conf("exact"),
     "Early design target: Briar+Quill ≈75% of early bolt DPS (one-time balance note)."],
    ["Bolt Pierce / Bounce (AFK-only depth)",
     "no equivalent world-upgrade pair (OM has radius/crit ladders instead)",
     WIKI + "Upgrades", conf("exact"),
     "Bolt Pierce / Bolt Bounce",
     "Pierce: max 2, baseCost 180, costMult 2.2 gold; later hits 60% then 35%. Bounce: max 2, baseCost 250, costMult 2.2; bounce 50% then 25%.",
     "js/data.js bolt_pierce, bolt_bounce",
     conf("exact"),
     "AFK multi-target bolt tech has no direct OM pickaxe twin."],
    ["ACTIVE / holding multiplier",
     "Holding screen deals pickaxe damage continuously; attack speed upgrades apply",
     WIKI + "Stats", conf("exact"),
     "ACTIVE_MULT while holding",
     "ACTIVE_MULT=1.4 multiplies kill-rate economy while holding. PLAYER_BASE_IDLE=0.75 solo contrib.",
     "js/data.js ACTIVE_MULT, PLAYER_BASE_IDLE; js/state.js killsPerMinute",
     conf("exact"),
     "Both reward active play; AFK factor is explicit 1.4×."],
]
for row in rows:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 2 Bombs ==========
ws = wb.create_sheet("2. Bombs")
add_header(ws)
r = 2
rows = [
    ["Bombs vs Obelisk",
     "Bombs deal NO damage to Obelisk; drones also disabled during fight",
     WIKI + "Bombs", conf("exact"),
     "Specials / hunters in boss fight",
     "Boss fight uses same bolt combat in arena; hunters can contribute. Specials = periodic heavy bolt pulse (×2.2 chip) if unlocked.",
     "js/arena.js specials path; design/elder-thornpelt-tuning.md",
     conf("exact"),
     "OM forces pickaxe-only boss DPS. AFK keeps full combat kit."],
    ["Basic Bomb",
     "Default; damages all rocks; base cooldown 30s",
     WIKI + "Bombs", conf("exact"),
     "no equivalent",
     "no equivalent",
     "—",
     conf("exact"),
     "Closest AFK feel: auto hunter chips / specials, not AOE bombs."],
    ["Chain Bomb",
     "Default; fires 1.25s apart; base cooldown 60s",
     WIKI + "Bombs", conf("exact"),
     "no equivalent",
     "no equivalent",
     "—",
     conf("exact"),
     ""],
    ["Bomb of Plenty / Exp / Transmuter / etc.",
     "Utility bombs: ore marks, exp marks, bar marks, gem chance, cherry free-charge, battery refill, D20 refill, veinmorpher. Cooldowns 110–570s base. Workshop/Store/Skill unlocks.",
     WIKI + "Bombs", conf("exact"),
     "Forge / loot / specials (loose)",
     "Unlock Specials 360g; Special Cadence +0.12/lv max5 (220 Sp base). Crits 250g. No bomb inventory system.",
     "js/data.js unlock_specials, special_cadence, unlock_crits",
     conf("exact"),
     "OM bombs are a whole economy. AFK specials are one pulse mechanic."],
    ["Bomb Damage World Upgrades",
     "+20% Lv20; +40% Lv65; +25% Lv105 (max 50); later ×0.02/0.04/0.1 ladders",
     WIKI + "Upgrades", conf("exact"),
     "Special pulse damage",
     "Special dmg = round(boltHpChip×2.2), period driven by specialCadence",
     "js/arena.js specials (~line 2781)",
     conf("exact"),
     ""],
    ["Bomb Recharge Rate",
     "World upgrade +1%/lv max16 unlock Lv60; divides base cooldown",
     WIKI + "Bombs", conf("exact"),
     "Special Cadence",
     "+12% cadence per level (effect.specialCadence 0.12), max 5",
     "js/data.js special_cadence",
     conf("exact"),
     "Analogous 'fires more often' lever, much shallower ladder."],
    ["Auto-Bomber (Skill)",
     "Select bomb to auto-fire every 1.25s; cost 10 Skill Points; Skill-Tree",
     WIKI + "Skill-Tree", conf("exact"),
     "Company hunters (auto DPS)",
     "Hunters attack on their attackIntervalMs automatically once hired",
     "js/data.js HUNTER_COMBAT; js/arena.js hunter loop",
     conf("exact"),
     "Both provide AFK damage; OM via bombs, AFK via hunters."],
    ["Golden bombs",
     "Late unlocks via Fishing tributes / Construct / Black Hole; double effects",
     WIKI + "Bombs", conf("exact"),
     "no equivalent",
     "no equivalent",
     "—",
     conf("exact"),
     ""],
]
for row in rows:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 3 Obelisk & Floors ==========
ws = wb.create_sheet("3. Obelisk & Floors")
add_header(ws)
r = 2
rows = [
    ["Obelisk HP formula (≤OB60)",
     "Base Health = round(100000 × 2.8^(Level-1)). OB1=100k, OB10=1.05b, OB25=5.39q, OB50=814sp",
     WIKI + "Obelisk", conf("exact"),
     "Monster/boss HP pool",
     "HP = MONSTER_VISUAL_HP(150) × combat.hpMult (integer chips)",
     "js/data.js MONSTER_VISUAL_HP; contracts[].combat.hpMult; markedPrey[].combat.hpMult; js/arena.js getMonsterVisualHp",
     conf("exact"),
     "OM uses astronomical exponential HP; AFK uses small visual pools."],
    ["Obelisk Armor formula (≤OB60)",
     "Base Armor = round(10 × 2.8^(Level-1)). OB1=5, OB10=105k. Must exceed armor with base pickaxe before crits.",
     WIKI + "Obelisk", conf("exact"),
     "no armor gate",
     "no equivalent armor threshold — any bolt chip ≥1 damages",
     "js/arena.js applyVisualHit / boltHpChip",
     conf("exact"),
     "OM armor creates hard DPS walls; AFK has no analog."],
    ["Obelisk fight rules",
     "Fight duration starts 30s; damage persists across attempts; cooldown starts 20 min (artifact reducible). Pickaxe-only.",
     WIKI + "Obelisk", conf("exact"),
     "Level boss fight",
     "Live arena Fight boss; leave resets boss HP; access stays paid once meter spent. Same bolt combat.",
     "design/level-boss-progression.md; js/state.js boss access; js/arena.js",
     conf("exact"),
     "OM accumulates damage over many short attempts; AFK is one sit-down fight (HP resets on leave)."],
    ["Obelisk rewards",
     "OB level +1; level cap +5; gems = 40+10×OB level (≤60), then (OB-60)×25000",
     WIKI + "Obelisk", conf("exact"),
     "Boss kill rewards",
     "Elder: +100 Sp +200 gold + relic rat_tooth; Alpha: +250 Sp +500g + fog_lens; Nightweave: +500 Sp +1200g + bone_seal; unlocks next Level",
     "js/data.js markedPrey rewardPoints/rewardGold/relicId/unlockAreaId",
     conf("exact"),
     ""],
    ["Key unlock Obelisk levels",
     "OB1 Workshop; OB2 Drones; OB4 Skill-Tree; OB10 Challenges; OB12 Contracts; OB15 Cards; OB17 Pets; OB18 Drone Fuel; OB19 Construct; OB23 Stargazing; OB30 Archaeology; OB37 Fishing; OB70 Arcanist",
     WIKI + "Obelisk", conf("exact"),
     "Level ladder unlocks",
     "Level 1→2→3 via boss clears. Features unlock via resource-cost upgrades (no time gates). L4+ hidden/not shipped.",
     "js/data.js areas; markedPrey; design/time-gates-to-costs.md",
     conf("exact"),
     "OM uses Obelisk level as global content gate; AFK uses Level bosses + gold/Sp costs."],
    ["Floor clear requirement",
     "W1: clears needed = floor×5 (ex F1→2 needs 5). W2×15, W3×35, W4×105. Reduced by Floor Clear Requirement stat.",
     WIKI + "Floors", conf("exact"),
     "Task kill quotas",
     "killQuota per monster: Cub 25, Thornpelt 60, Dire 100, Pup 80, Wolf 120, Dire Ashfang 150, Silkling 140, Widow 180, Matron 220",
     "js/data.js contracts[].killQuota",
     conf("exact"),
     "Both gate forward progress on repeated clears."],
    ["Floor count / worlds",
     "132 floors across 4 worlds; special floor multis (Golden×5, Rainbow×50, Galactic×10, Prismatic×1 base)",
     WIKI + "Floors", conf("exact"),
     "3 playable Levels",
     "areas: Level1 mult1.0, Level2 mult1.35, Level3 mult1.8 (Level4 hidden mult2.5)",
     "js/data.js areas[]",
     conf("exact"),
     ""],
    ["L1 boss Elder Thornpelt",
     "n/a (OM bosses are Obelisks, not animal apexes)",
     WIKI + "Obelisk", conf("exact"),
     "Elder Thornpelt",
     "displayLevel 30; bossCost 120 Sp; hpMult 1.85 → HP≈278; reward 100 Sp + 200g + Rat Tooth (+8% idle)",
     "js/data.js markedPrey sewer_king; design/elder-thornpelt-tuning.md",
     conf("exact"),
     ""],
    ["L2 boss Ashfang Alpha",
     "n/a",
     WIKI + "Obelisk", conf("exact"),
     "Ashfang Alpha",
     "displayLevel 69; bossCost 280 Sp; hpMult 2.6 → HP=390; reward 250 Sp + 500g + Fog Lens",
     "js/data.js markedPrey mist_wraith",
     conf("exact"),
     ""],
    ["L3 boss Nightweave",
     "n/a",
     WIKI + "Obelisk", conf("exact"),
     "Nightweave",
     "displayLevel 720; bossCost 600 Sp; hpMult 3.6 → HP=540; reward 500 Sp + 1200g + Bone Seal (+15% offline cap)",
     "js/data.js markedPrey crypt_lord",
     conf("exact"),
     "720 is displayLevel only, not HP."],
    ["Sample monster HP (AFK)",
     "n/a",
     "—",
     conf("exact"),
     "Monster hpMult → HP",
     "Cub 0.70→105; Thornpelt 1.50→225; Dire 1.20→180; Pup 0.55→82.5; Wolf 1.2→180; Dire Ashfang 1.35→202.5; Silkling 0.70→105; Widow 1.25→187.5; Matron 1.35→202.5 (1.25 without pierce)",
     "js/data.js contracts[].combat.hpMult × 150",
     conf("exact"),
     "Computed = 150×hpMult; arena rounds for chips."],
    ["Boss bolt sizing bug/fix",
     "n/a",
     "—",
     conf("exact"),
     "boltHpChipRaw during boss",
     "Applied fix: size chips from getActiveBoss() HP during boss fights (was Task HP → ~Cub damage vs Elder). Elder solo TTK target 45–90s; post-fix sim ≈60s.",
     "js/arena.js boltHpChipRaw; design/elder-thornpelt-tuning.md",
     conf("exact"),
     "Was a real wall (~159s solo) before fix."],
]
for row in rows:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 4 Skill Tree ==========
ws = wb.create_sheet("4. Skill Tree")
add_header(ws)
r = 2
rows = [
    ["Skill Tree existence / unlock",
     "Unlocks at Obelisk 4. Permanent through prestige. Spent with Skill Points (10 bits→1 SP; 125 gems/SP; codes/events).",
     WIKI + "Skill-Tree", conf("exact"),
     "Progression maps / upgrades",
     "No separate SP tree. Unlocks via gold/Sp upgrade purchase + progressionMaps feature graph.",
     "js/data.js upgrades; progressionMaps",
     conf("exact"),
     "OM Skill Tree ≠ RPG attributes."],
    ["Traditional RPG stats STR/AGI/PER/INT/LCK",
     "NOT PRESENT. Skill-Tree uses named skills (Lucky Strikes, Auto-Bomber, Chronokeeper…). Stats page = bonus breakdown UI.",
     WIKI + "Skill-Tree", conf("exact"),
     "no attribute sheet",
     "no STR/AGI/PER/INT/LCK. Bonuses come from upgrades, relics, mastery, sigils, prestige mod.",
     "js/state.js getBonuses; js/data.js",
     conf("exact"),
     "Common misconception — do not design AFK attributes just because OM has a 'Skill-Tree' name."],
    ["Early S-tier skills (guide)",
     "Recommended early: Gems & Chests (2 SP), Easy Progressor (3), Just Wait Faster (4), Chronokeeper (5), Auto-Bomber (10), Free? That's a great price (12), Gem Bomb (5), Stonks (22 @OB17)",
     WIKI + "Skill-Tree", conf("exact"),
     "Early AFK purchases",
     "Typical early buys: Idle Power, Iron (180g), Briar (140g), Bolt Focus (90g), Offline Cap, Unlock Crits (250g) / Specials (360g)",
     "js/data.js; design/time-gates-to-costs.md",
     conf("exact"),
     ""],
    ["Lucky Strikes",
     "Pickaxe Crit Chance +5%, Crit Damage +15%; cost 1 SP",
     WIKI + "Skill-Tree", conf("exact"),
     "Unlock Crits",
     "Enables crits at base 8%; Crit Power adds +4%/lv",
     "js/data.js unlock_crits, crit_power",
     conf("exact"),
     ""],
    ["Swing Harder / Super Damage / Tons of Damage",
     "Swing Harder +20% pickaxe dmg (1 SP); Super Damage +40%/+20% crit dmg/+15% radius (4 SP); Tons of Damage ×2 pickaxe +15% ultra crit +100% exp (36 SP, OB23)",
     WIKI + "Skill-Tree", conf("exact"),
     "Idle Power / gear / killMult",
     "Idle Power +12%/lv; gear ladder up to +50%; forge_cinder +4% killMult",
     "js/data.js idle_power, gear_*, forge_cinder",
     conf("exact"),
     ""],
    ["Auto-Bomber",
     "Auto-fire selected bomb every 1.25s; 10 SP",
     WIKI + "Skill-Tree", conf("exact"),
     "Hire hunters",
     "Auto DPS via Briar/Quill/Moss/Ember once hired",
     "js/data.js hunter_*",
     conf("exact"),
     ""],
    ["Chronokeeper",
     "Offline items & relics doubled; banked freebie +1; bomb cap +10; 5 SP",
     WIKI + "Skill-Tree", conf("exact"),
     "Offline Cap upgrades",
     "Base offlineCapMin=360; Offline Cap upgrade +30 min/lv max20; scraps Wick Wire +5 min; mastery/relic/sigil adds",
     "js/state.js getBonuses offlineCapMin base 360; js/data.js offline_cap",
     conf("exact"),
     "Both care about offline banking; OM freebies vs AFK hunt progress."],
    ["Easy Progressor",
     "Floor Clear Req -10%; PP gain 1.2×; Ore sell 1.2×; 3 SP",
     WIKI + "Skill-Tree", conf("exact"),
     "Boss Meter Focus / quotas",
     "prey_chip +15%/lv meter fill max15 (100 Sp base). Kill quotas fixed per monster.",
     "js/data.js prey_chip; contracts killQuota",
     conf("exact"),
     ""],
    ["Total SP to max tree",
     "189081 SP for all skills (18714 excluding 4 ultra-late skills)",
     WIKI + "Skill-Tree", conf("exact"),
     "Upgrade max levels sum",
     "Dozens of upgrades with maxLevel 1–40; no single SP currency",
     "js/data.js upgrades[].maxLevel",
     conf("exact"),
     "OM SP sink is enormous endgame; AFK is shallower gold/Sp sinks."],
    ["Mastery (AFK)",
     "no equivalent pet/mastery hybrid on Skill-Tree",
     "—",
     conf("exact"),
     "Per-monster mastery 0–10",
     "Gold mult = 1+0.05×mastery; chest chance 0 at m0 else 0.5%+(m-1)×0.5% cap 5%; auto +1 every 3 completions; gold buy via masteryImproveCost",
     "js/state.js masteryGoldMult, masteryChestChance, maybeMasteryFromCompletions",
     conf("exact"),
     "AFK mastery is the closest 'permanent character investment' per target."],
]
for row in rows:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 5 Prestige ==========
ws = wb.create_sheet("5. Prestige")
add_header(ws)
r = 2
rows = [
    ["Prestige availability",
     "Min level 20 to prestige. Core loop forever.",
     WIKI + "Prestige", conf("exact"),
     "Prestige / L4+",
     "none yet (planned L4+). Code has doPrestige + Sigils but design marks L4+/prestige loop out of scope for current Levels 1–3.",
     "design/level-boss-progression.md §After Level 3; js/state.js doPrestige; user brief",
     conf("exact"),
     "Scaffolding exists; player-facing loop not shipped."],
    ["What resets",
     "Player level, gold, ores, bars, contract completions/points, all World Upgrades",
     WIKI + "Prestige", conf("exact"),
     "doPrestige resets (if used)",
     "Resets gold (back to 40), food(100), non-keep upgrades; keeps relics, bestiary, hunter unlocks, prestigeKeep ups, scraps, mats, areas, prey finished, sigils, 25% guild XP, features, playMs",
     "js/state.js doPrestige",
     conf("exact"),
     "Documented for future; not the current L1–3 goal."],
    ["What persists",
     "Relics, artifacts, veins, drone points, bomb charges, challenge progress, items, Skill-Tree, Workshop, Cards (gild costs PP), Construct progress, etc.",
     WIKI + "Prestige", conf("exact"),
     "Keep set (code)",
     "relics, bestiary, hunters/hire ups, prestigeKeep (scrap/forge), scraps, mats, areas, prey, sigils, chests permanent bonuses, features",
     "js/state.js doPrestige keep*",
     conf("exact"),
     ""],
    ["Prestige currency",
     "Prestige Points. Below Lv200: PP = 12 × 1.084^(level-10) × PP Gain Multi. Above 200 adds (1+0.05×(level-200)) factor.",
     WIKI + "Prestige", conf("exact"),
     "Sigils",
     "sigilsEarned = 1 + floor(prestigeCount×0.5) + (any prey finished ? 1 : 0). Spent in sigilShop (Idle/Cap/Loot charters, 1 each).",
     "js/state.js doPrestige; js/data.js sigilShop",
     conf("exact"),
     ""],
    ["Artifacts",
     "T1 tutorial; T2@OB8; T3@OB14; T4@OB19. First unlock in tier always Pickaxe Damage. Unlock cost doubles per artifact in tier.",
     WIKI + "Prestige", conf("exact"),
     "Relics from bosses",
     "One relic per Level boss (rat_tooth, fog_lens, bone_seal). Fixed bonuses, not a PP shop ladder.",
     "js/data.js relics; markedPrey.relicId",
     conf("exact"),
     "OM artifacts are the deep permanent damage ladder."],
    ["Level cap gating",
     "Start cap 30; +5 per Obelisk beaten (OB10→cap80; OB50→cap280)",
     WIKI + "Prestige", conf("exact"),
     "no XP level cap for prestige",
     "Guild ranks exist (xp thresholds) but not an OB-style level cap for prestiging",
     "js/data.js guild ranks; js/state.js canPrestige (boss clear OR Tracker rank)",
     conf("exact"),
     "canPrestige: any Level boss finished OR guild rank≥2."],
    ["Auto-Prestige",
     "Skill 'Take it back now y'all' (OB30, 65 SP) enables 10s–10min auto prestige intervals (online only)",
     WIKI + "Prestige", conf("exact"),
     "no equivalent",
     "no equivalent",
     "—",
     conf("exact"),
     ""],
]
for row in rows:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 6 Early Pacing ==========
ws = wb.create_sheet("6. Early Pacing")
add_header(ws)
r = 2
rows = [
    ["Time to Obelisk 10 (APPROX)",
     "APPROX: early OBs often feel fast then slow; OB10 unlocks Challenges and is a known armor/HP choke for new players. No authoritative hour count on wiki. Community: idle game — days between later OBs common.",
     WIKI + "Guides/Progression_Guide", conf("estimate"),
     "Time to Level 1 boss access",
     "Design target: first boss fight access ≈20–40 min engaged (fill 120 Sp meter)",
     "design/level-boss-progression.md boss access costs",
     conf("exact"),
     "OM early hours undocumented precisely — labeled estimate. AFK target is design-locked."],
    ["Time to Obelisk 25 (APPROX)",
     "APPROX: unknown exact hours. Reddit: at OB24 some players prestige-clear W1 in <30 min but still take ~a week on current OB. Progression Guide: Construct@19 is first major wall.",
     "https://www.reddit.com/r/IdleObeliskMiner/comments/1popv9l/tips_for_beginners/", conf("estimate"),
     "Level 2 access (after Elder)",
     "Requires Elder clear (120 Sp meter + fight). Instant Level 2 unlock on kill. No separate time gate.",
     "js/data.js markedPrey unlockAreaId mistwood; design/time-gates-to-costs.md",
     conf("exact"),
     ""],
    ["Time to Obelisk 50 (APPROX)",
     "APPROX: unknown. Far past Construct/Stargazing/Archaeology unlocks (OB19/23/30). Multi-week+ for typical idle play — no sourced hour figure found.",
     WIKI + "Guides/Progression_Guide", conf("unknown"),
     "Level 3 / Nightweave path",
     "L2 meter 280 Sp; L3 meter 600 Sp. Hire costs now gold (Quill 900 / Moss 2000 / Ember 4200) so Sp not competed away from meters.",
     "js/data.js bossCost; design/elder-thornpelt-tuning.md hire retune",
     conf("exact"),
     "OM OB50 time left unknown rather than invent hours."],
    ["First prestige timing (APPROX)",
     "APPROX: possible from level 20 (cap starts 30). Community: prestige when damage slows / need PP for artifacts; early game often short runs. No single 'X hours to first prestige' in wiki.",
     WIKI + "Prestige", conf("estimate"),
     "Prestige",
     "none yet for shipped L1–3 loop",
     "design/level-boss-progression.md; user brief",
     conf("exact"),
     ""],
    ["Obelisk fight attempt cadence",
     "30s fight window; 20 min cooldown base (artifact -3%/lv T1 max17)",
     WIKI + "Obelisk", conf("exact"),
     "Boss fight sit time",
     "Design Elder solo TTK target 45–90s. Code post-fix sim ≈60s meter-fill solo; with Briar+Swift Walk ~40s (tuning doc).",
     "design/elder-thornpelt-tuning.md",
     conf("exact"),
     "OM spreads boss DPS over many attempts; AFK wants one short fight."],
    ["Offline banking early",
     "Generous offline (community emphasizes idle). Chronokeeper doubles offline items/relics.",
     WIKI + "Skill-Tree", conf("estimate"),
     "Offline cap",
     "Base 360 min cap in getBonuses; upgrade Offline Cap +30 min/lv max20; more from mastery/scraps/relics/sigils",
     "js/state.js getBonuses offlineCapMin=360; js/data.js offline_cap",
     conf("exact"),
     "AFK hard-caps away time at bonuses.offlineCapMin."],
    ["AFK L1 Sp earn (calibration)",
     "n/a",
     "—",
     conf("exact"),
     "Staged earn rates used for cost conversion",
     "~8–10 min solo: 7–8 g/min, ~3 Sp/min; ~15–25 min +Briar: 10–16 g/min, 4–6.5 Sp/min; ~50–90 min: 28–45 g, 12–20 Sp; ~3–5h: 70–100 g, 30–45 Sp",
     "design/time-gates-to-costs.md earn-rate basis",
     conf("estimate"),
     "Design calibration rates (mixed live+AFK), not live telemetry dump."],
    ["Points to fill L1 meter",
     "n/a",
     "—",
     conf("exact"),
     "120 Sp @ ~3–6.5 Sp/min",
     "At ~3 Sp/min ≈40 min; at ~6.5 ≈18 min — brackets the 20–40 min design target",
     "bossCost 120; time-gates earn table",
     conf("community calc"),
     "Arithmetic from design rates × bossCost."],
]
for row in rows:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 7 Side Systems ==========
ws = wb.create_sheet("7. Side Systems")
add_header(ws)
r = 2
rows = [
    ["Drones",
     "Auto-mine using % of pickaxe damage; suits unlock by OB level (Bear@2, Chain@4, Midas@6, Frogger@8, Veinseeker@19, Starburst/Elixir/Void@23, Angler@37, Prism@64, Minotaur@70). Fuel @OB18.",
     WIKI + "Drones", conf("exact"),
     "Company hunters",
     "Briar/Quill/Moss/Ember hires + per-hunter upgrades. Always-on once hired (food economy applies).",
     "js/data.js hunters, hunter_*",
     conf("exact"),
     "Both = AFK labor. OM drones scale off pickaxe; AFK hunters are independent."],
    ["Pets",
     "Unlock OB17; gem purchase + total pet level gates; level via gameplay actions; skins/quests later",
     WIKI + "Pets", conf("exact"),
     "no pets",
     "no equivalent",
     "—",
     conf("exact"),
     ""],
    ["Cards",
     "Unlock OB15; ore/bar/bomb/drone/pet/vein/star/misc cards; gild with PP+gold+gems; poly/infernal later",
     WIKI + "Cards", conf("exact"),
     "no card binder",
     "no equivalent (relics are few fixed boss drops)",
     "js/data.js relics",
     conf("exact"),
     ""],
    ["Fishing",
     "Unlock OB37; docks, drones, notices, legendary fish tributes → main-game multis",
     WIKI + "Guides/Progression_Guide", conf("exact"),
     "no fishing",
     "no equivalent",
     "—",
     conf("exact"),
     ""],
    ["Archaeology",
     "Unlock OB30; stages/blocks/idols feeding main-game buffs",
     WIKI + "Guides/Progression_Guide", conf("exact"),
     "no archaeology",
     "no equivalent",
     "—",
     conf("exact"),
     ""],
    ["Stargazing",
     "Unlock OB23; stars/super stars on floors; telescope upgrades; Black Hole later",
     WIKI + "Guides/Progression_Guide", conf("exact"),
     "no stargazing",
     "no equivalent",
     "—",
     conf("exact"),
     ""],
    ["Construct / Statues",
     "Unlock OB19; veins research + statues (gild/plat) — major wall / bar sink",
     WIKI + "Guides/Progression_Guide", conf("exact"),
     "Forge (mats)",
     "Signature mats → one-time forge crafts (Pelt Guard, Fang Charm, Thread Tip). Scrapwork side path.",
     "js/data.js forge_*; scrap_*; design/forge-mat-retarget.md",
     conf("exact"),
     "AFK forge is tiny vs OM Construct."],
    ["Contracts (OM)",
     "Unlock OB12; spend bars for contract points → permanent contract upgrades (reset on prestige unless refund skills)",
     WIKI + "Prestige", conf("exact"),
     "Tasks / contracts (AFK)",
     "Hunt Tasks with killQuota; earn gold + Sp; unlock next monster in family via finishes",
     "js/data.js contracts[]; js/state.js task flow",
     conf("exact"),
     "Same word, different systems."],
    ["Challenges",
     "Unlock OB10; permanent challenge upgrades; some require many prestiges",
     WIKI + "Guides/Progression_Guide", conf("exact"),
     "no challenge board",
     "no equivalent yet",
     "—",
     conf("exact"),
     ""],
    ["Freebies / Store gems",
     "Freebie pack ~10 min base; major early gem source; banked cap upgrades",
     WIKI + "Stats", conf("exact"),
     "Chests",
     "Permanent + boost chest meters charge from hunting time (incl. offline)",
     "js/state.js chests; js/chests.js",
     conf("exact"),
     ""],
    ["Arcanist",
     "Unlock OB70; spells/mana/essence/runes — late game",
     WIKI + "Obelisk", conf("exact"),
     "no arcanist",
     "no equivalent",
     "—",
     conf("exact"),
     ""],
    ["World speed debuffs",
     "W3 game speed -30%; W4 -80% (mitigated by world quests)",
     WIKI + "Floors", conf("exact"),
     "Area mult",
     "Level mult 1.0 / 1.35 / 1.8 (harder monsters via hpMult + quotas, not global slowdown)",
     "js/data.js areas[].mult",
     conf("exact"),
     ""],
]
for row in rows:
    r = add_row(ws, r, row)
style_sheet(ws)

# ========== 8 Takeaways ==========
ws = wb.create_sheet("8. Takeaways")
add_header(ws)
# For takeaways, use a simpler 3-col layout but keep same headers with lesson in col1
r = 2
takeaways = [
    ["T1. Armor gates create real walls — AFK should stay armor-free",
     "OM Obelisk Armor (round(10×2.8^(L-1))) can zero all damage until pickaxe base exceeds it; crits cannot help if base < armor (Obelisk tab).",
     WIKI + "Obelisk", conf("exact"),
     "AFK has no armor gate",
     "Keep bolt chips always ≥1; walls should be HP/TTK/meter, not zero-damage softlocks.",
     "js/arena.js boltHpChip",
     conf("exact"),
     "Lesson: never ship a 'deal 0 forever' boss check."],
    ["T2. Persist boss progress across attempts OR keep fights short",
     "OM saves Obelisk damage across 30s attempts with 20 min cooldown — long HP bars are OK because progress banks.",
     WIKI + "Obelisk", conf("exact"),
     "AFK resets boss HP on leave; design TTK 45–90s",
     "Elder post-fix ~60s solo — correct for non-persistent HP. Don't raise boss HP without either banking damage or accepting leave-frustration.",
     "design/elder-thornpelt-tuning.md; level-boss-progression.md",
     conf("exact"),
     "Tied to Obelisk & Floors + Early Pacing rows."],
    ["T3. Size player damage from the thing you're fighting",
     "OM pickaxe is absolute; AFK bolts scale to current target HP pool.",
     WIKI + "Upgrades", conf("exact"),
     "boltHpChipRaw must use boss HP in boss fights",
     "Bug was sizing from Task HP (Cub 105) vs Elder 278 → ~38% intended dmg / ~159s TTK. Fix applied.",
     "js/arena.js boltHpChipRaw; elder-thornpelt-tuning.md",
     conf("exact"),
     "Regression-test Ashfang/Nightweave the same way."],
    ["T4. Separate spend currencies from boss meters",
     "OM spends bars/gold/PP/gems/SP — Obelisk 'cost' is damage, not a shared meter currency.",
     WIKI + "Upgrades", conf("exact"),
     "Slayer points were competing with hires",
     "Hire Moss/Ember moved off Sp → gold (2000/4200) so meters 120/280/600 stay the Sp sink.",
     "design/elder-thornpelt-tuning.md; time-gates-to-costs.md",
     conf("exact"),
     "Don't price hires in the same currency as boss access."],
    ["T5. Content unlock milestones beat raw number go-up",
     "OM paces via Obelisk unlock menu (Workshop@1, Drones@2, Skill-Tree@4, Challenges@10, Cards@15, Pets@17, Construct@19…).",
     WIKI + "Obelisk", conf("exact"),
     "AFK Level bosses unlock next Level + relic",
     "Only 3 Levels shipped. Plan L4+ as unlock milestones (systems), not just bigger hpMult.",
     "js/data.js areas; markedPrey; Prestige tab 'none yet'",
     conf("exact"),
     "Side Systems tab shows how much OM hides behind OB gates."],
    ["T6. Permanent (prestige-proof) ladders sustain long idle lives",
     "Skill-Tree + Workshop + Artifacts + Challenges persist; World Upgrades reset — creates invest/reset rhythm.",
     WIKI + "Prestige", conf("exact"),
     "prestigeKeep scrap/forge + relics + hunters",
     "When L4+ prestige ships, keep a juicy permanent ladder (already sketched: sigils, forge, scrapwork) and reset a readable run ladder (gear/idle_power).",
     "js/state.js doPrestige; js/data.js prestigeKeep",
     conf("exact"),
     "Tied to Prestige + Skill Tree tabs."],
    ["T7. Auto-labor should be a first-class early unlock",
     "OM: drones tutorial/OB2; Auto-Bomber skill (10 SP) is called out as early priority.",
     WIKI + "Drones", conf("exact"),
     "Briar at 140g (~15 min old time target)",
     "Keep first hunter cheap vs L1 meter (120 Sp). Current 140g aligns with early gold rates.",
     "js/data.js hunter_briar; time-gates-to-costs.md",
     conf("exact"),
     "AFK already matches this lesson — protect it."],
    ["T8. Offline cap is a tunable product lever",
     "OM community treats offline as core; Chronokeeper doubles offline loot.",
     WIKI + "Skill-Tree", conf("exact"),
     "Base 360 min + purchasable +30 min/lv",
     "360 min ≈ overnight. Scrap/forge/mastery/sigil can extend. Be explicit in UX about the cap.",
     "js/state.js offlineCapMin=360",
     conf("exact"),
     "Tied to Early Pacing offline row."],
    ["T9. Don't invent RPG attributes because OM has a 'Skill Tree'",
     "OM Skill-Tree is named permanent skills, not STR/AGI/PER/INT/LCK (confirmed absent on wiki Skill-Tree + Stats).",
     WIKI + "Skill-Tree", conf("exact"),
     "Use mastery + upgrades + relics",
     "AFK mastery 0–10 per monster already supplies long-tail investment without an attribute sheet.",
     "js/state.js mastery*; Skill Tree tab",
     conf("exact"),
     "Avoid cargo-culting attribute pages."],
    ["T10. Deep side systems come AFTER the core damage loop is fun",
     "OM Progression Guide: Construct@19 is the first major wall — players should fill menus they already have before rushing World 2.",
     WIKI + "Guides/Progression_Guide", conf("exact"),
     "AFK side systems today: Scrapwork, Forge, Chests, Company",
     "Expand side systems only after L1–3 boss TTKs and meter times feel right (Elder ~60s, meter 20–40 min).",
     "Side Systems tab; elder-thornpelt-tuning.md",
     conf("exact"),
     "Resist adding fishing/cards clones before core loop polish."],
]
TAKEAWAY_TEXT = []
for row in takeaways:
    TAKEAWAY_TEXT.append(row[0])
    r = add_row(ws, r, row)
style_sheet(ws)

# Write counts onto About
ws_about = wb["About"]
ws_about.cell(len(about_lines) + 2, 1, "Row confidence tallies (OM Confidence column across data tabs)").font = section_font
ws_about.cell(len(about_lines) + 3, 1,
    f"exact={COUNTS['exact']}; community calc={COUNTS['community calc']}; estimate/APPROX={COUNTS['estimate']}; unknown={COUNTS['unknown']}")

wb.save(OUT)
print("Wrote", OUT)
print("COUNTS", COUNTS)
print("TAKEAWAYS:")
for t in TAKEAWAY_TEXT:
    print("-", t)
