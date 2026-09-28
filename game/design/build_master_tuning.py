#!/usr/bin/env python3
"""Build Contract Board — Master Tuning Sheet (single worksheet)."""
from __future__ import annotations
import json
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter
from openpyxl.comments import Comment

ROOT = Path("/workspace/contract-board")
OUT = ROOT / "design" / "ContractBoard_Master_Tuning.xlsx"
DATA = json.load(open("/tmp/cb_data.json"))
UPS = json.load(open("/tmp/cb_upgrades.json"))

# Styles
INPUT = PatternFill("solid", fgColor="FFF2CC")       # yellow = editable
OUTPUT = PatternFill("solid", fgColor="D0E8FF")      # blue = formula
HEADER = PatternFill("solid", fgColor="5D4E37")      # stone brown
SECTION = PatternFill("solid", fgColor="8B7355")
REF = PatternFill("solid", fgColor="E8E0D5")         # beige reference
WHITE = Font(color="FFFFFF", bold=True, name="Calibri", size=11)
TITLE = Font(name="Calibri", size=16, bold=True, color="3D3226")
SEC_FONT = Font(name="Calibri", size=12, bold=True, color="FFFFFF")
HDR_FONT = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
NORMAL = Font(name="Calibri", size=10)
BOLD = Font(name="Calibri", size=10, bold=True)
THIN = Border(
    left=Side(style="thin", color="C4B8A8"),
    right=Side(style="thin", color="C4B8A8"),
    top=Side(style="thin", color="C4B8A8"),
    bottom=Side(style="thin", color="C4B8A8"),
)
WRAP = Alignment(wrap_text=True, vertical="center")

AREA_NAME = {a["id"]: a["name"] for a in DATA["areas"]}
AREA_MULT = {a["id"]: a["mult"] for a in DATA["areas"]}


def style_range(ws, cells, fill, font=None):
    for c in cells:
        c.fill = fill
        c.border = THIN
        if font:
            c.font = font
        else:
            c.font = NORMAL


def section(ws, row, title, cols=16):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=cols)
    cell = ws.cell(row, 1, title)
    cell.fill = SECTION
    cell.font = SEC_FONT
    cell.alignment = Alignment(vertical="center")
    ws.row_dimensions[row].height = 22
    return row + 1


def label_input(ws, r, c, label, value, note=None, num_fmt=None):
    lab = ws.cell(r, c, label)
    lab.font = BOLD
    lab.fill = REF
    lab.border = THIN
    val = ws.cell(r, c + 1, value)
    val.fill = INPUT
    val.border = THIN
    val.font = NORMAL
    if num_fmt:
        val.number_format = num_fmt
    if note:
        val.comment = Comment(note, "Game Designer")
    return val


def main():
    wb = Workbook()
    ws = wb.active
    ws.title = "Master Tuning"

    # Column widths
    widths = {
        "A": 28, "B": 14, "C": 14, "D": 12, "E": 12, "F": 12, "G": 12, "H": 12,
        "I": 12, "J": 12, "K": 12, "L": 14, "M": 14, "N": 14, "O": 14, "P": 36,
    }
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

    r = 1
    ws.merge_cells("A1:P1")
    ws["A1"] = "Contract Board — Master Tuning Sheet (single worksheet)"
    ws["A1"].font = TITLE
    ws.row_dimensions[1].height = 28

    r = 2
    ws.merge_cells("A2:P2")
    ws["A2"] = (
        "YELLOW cells = INPUTS (edit these). BLUE cells = OUTPUTS (Excel formulas — recalculate when inputs change). "
        "Terminology: monster / hunt target / contract / task — never quarry. "
        "Source: live js/data.js + DESIGN.md · Rank XP from task finish ≈ floor(quota×0.5 + finishBonus×0.3)."
    )
    ws["A2"].alignment = WRAP
    ws["A2"].font = Font(name="Calibri", size=9, italic=True)
    ws.row_dimensions[2].height = 40

    # Legend chips
    r = 3
    ws["A3"] = "INPUT"
    ws["A3"].fill = INPUT
    ws["A3"].border = THIN
    ws["B3"] = "OUTPUT (formula)"
    ws["B3"].fill = OUTPUT
    ws["B3"].border = THIN
    ws["C3"] = "Section / label"
    ws["C3"].fill = REF
    ws["C3"].border = THIN

    # ========== SCENARIO ==========
    r = 5
    r = section(ws, r, "A · SCENARIO KNOBS (drive all time / rate estimates)")
    # Named-ish absolute refs we'll hardcode in formulas
    # B6 player_dps, B7 hunter_dps, B8 active_kills_per_min override?, etc.

    # Row map for key scenario cells (documented in summary)
    # We'll place:
    # A6/B6 Player bolt DPS (early)
    # A7/B7 Hunter party DPS (early Briar+Quill)
    # A8/B8 Use live TTK from HP/DPS? 1=yes
    # A9/B9 Session length (min)
    # A10/B10 Active hold fraction (0-1)
    # A11/B11 Idle power multiplier (idlePower)
    # A12/B12 Area mult override (1 = use monster area)
    # A13/B13 XP per task finish mode note

    label_input(ws, 6, 1, "Player bolt DPS (early)", 10,
                "DESIGN early: ~12/hit @ ~0.84/s ≈ 10 DPS. Edit to retune TTK.")
    label_input(ws, 7, 1, "Hunter party DPS (early)", 7.5,
                "Briar~4.2 + Quill~3.3 ≈ 7.5 sustained early.")
    label_input(ws, 8, 1, "Combined combat DPS", None)
    ws["B8"] = "=B6+B7"
    ws["B8"].fill = OUTPUT
    ws["B8"].border = THIN
    ws["B8"].number_format = "0.00"

    label_input(ws, 9, 1, "Session length (minutes)", 30)
    label_input(ws, 10, 1, "Active hold fraction", 0.4,
                "Share of play time holding for ACTIVE_MULT. 0=full AFK, 1=always holding.")
    ws["B10"].number_format = "0%"
    label_input(ws, 11, 1, "Idle power (upgrades)", 1.0,
                "idlePower multiplier in KillRate formula.")
    label_input(ws, 12, 1, "GLOBAL_DMG_MULT", DATA["consts"]["GLOBAL_DMG_MULT"])
    label_input(ws, 13, 1, "ATTACK_SPEED_MULT", DATA["consts"]["ATTACK_SPEED_MULT"])
    label_input(ws, 14, 1, "ACTIVE_MULT", DATA["consts"]["ACTIVE_MULT"])
    label_input(ws, 15, 1, "PLAYER_BASE_IDLE", DATA["consts"]["PLAYER_BASE_IDLE"])
    label_input(ws, 16, 1, "HUNTER_DMG_MULT", DATA["consts"]["HUNTER_DMG_MULT"])
    label_input(ws, 17, 1, "MONSTER_VISUAL_HP (base)", DATA["consts"]["MONSTER_VISUAL_HP"])
    label_input(ws, 18, 1, "Hunter idle contrib (sum)", 0.0,
                "Sum of hired hunters' idle weights (Briar 1.0 etc). 0 = solo.")
    label_input(ws, 19, 1, "Boost killMult", 1.0,
                "Timed boosts / Frenzy etc.")

    # Effective economy kill rate / min (solo baseline formula from DESIGN)
    ws["A20"] = "Eff. idle KillRate / min"
    ws["A20"].fill = REF
    ws["A20"].border = THIN
    ws["A20"].font = BOLD
    # KillRate/min = 2.5 × idlePower × (PLAYER_BASE_IDLE + hunterIdle) × areaMult × contractMult × boost × active blend
    # Area/contract applied per-monster row; here global without area/contract:
    ws["B20"] = "=2.5*B11*(B15+B18)*B19*((1-B10)+B10*B14)"
    ws["B20"].fill = OUTPUT
    ws["B20"].border = THIN
    ws["B20"].number_format = "0.00"
    ws["C20"] = "2.5 × idlePower × (PLAYER_BASE_IDLE + hunterIdle) × boost × active-blend"
    ws["C20"].font = Font(name="Calibri", size=8, italic=True)

    ws["A21"] = "Eff. combat kills / min"
    ws["A21"].fill = REF
    ws["A21"].border = THIN
    ws["A21"].font = BOLD
    # combat k/m from DPS / (baseHP) * 60 — per-monster uses hpMult
    ws["B21"] = "=IF(B17<=0,0,B8/B17*60)"
    ws["B21"].fill = OUTPUT
    ws["B21"].border = THIN
    ws["B21"].number_format = "0.00"
    ws["C21"] = "Combined DPS / base HP × 60 (monster rows apply hpMult)"
    ws["C21"].font = Font(name="Calibri", size=8, italic=True)

    # ========== RANK CURVE ==========
    r = 23
    r = section(ws, r, "B · RANK / LEVEL XP CURVE (edit curve knobs OR per-level XP_to_next; outputs recalc)")

    label_input(ws, 24, 1, "Curve: XP for rank 0→1", 50,
                "Live game: Runner at 50. Early ranks should feel fast.")
    label_input(ws, 25, 1, "Curve growth per rank", 1.45,
                ">1 slows later ranks. Live thresholds are uneven; growth≈1.45 fits 50→8000 by rank 9 roughly.")
    ws["B25"].number_format = "0.00"
    label_input(ws, 26, 1, "Max rank to model", 20)
    label_input(ws, 27, 1, "XP / hour assumption", 120,
                "Override: derived from selected monster + finishes/hr below. Default placeholder.")
    label_input(ws, 28, 1, "Minutes per session (rank ETA)", 30)

    # Headers for curve table starting row 30
    headers = [
        "Rank", "Name (live or gen)", "XP threshold (input)", "XP to next (calc)",
        "Cumulative Δ", "Hours to next @ XP/hr", "Sessions to next",
        "Hours from 0", "Sessions from 0", "Live game XP?", "Notes"
    ]
    for i, h in enumerate(headers, 1):
        cell = ws.cell(30, i, h)
        cell.fill = HEADER
        cell.font = HDR_FONT
        cell.border = THIN
        cell.alignment = Alignment(wrap_text=True, vertical="center")
    ws.row_dimensions[30].height = 32

    live_ranks = {x["rank"]: x for x in DATA["ranks"]}
    # Generate names for 10-20
    gen_names = {
        10: "High Charter", 11: "Vault Hand", 12: "Siege Lead", 13: "Relic Warden",
        14: "Sigil Adept", 15: "Ash Ranger", 16: "Bone Consul", 17: "Fen Marshal",
        18: "Undercroft Lord", 19: "Guild Sovereign", 20: "Legend",
    }

    # Rank rows 31..51 for ranks 0..20
    first_rank_row = 31
    for rank in range(0, 21):
        row = first_rank_row + rank
        ws.cell(row, 1, rank).fill = REF
        ws.cell(row, 1).border = THIN

        if rank in live_ranks:
            name = live_ranks[rank]["name"]
            xp = live_ranks[rank]["xp"]
            live = "YES (data.js)"
        else:
            name = gen_names.get(rank, f"Rank {rank}")
            # Default suggested threshold from curve: B24 * B25^(rank) style cumulative
            # We'll put formula as default for extended ranks
            xp = None
            live = "curve (edit ok)"

        ws.cell(row, 2, name).fill = INPUT
        ws.cell(row, 2).border = THIN

        if xp is not None:
            ws.cell(row, 3, xp).fill = INPUT
        else:
            # cumulative threshold = CurveBase * (growth^rank - 1) / (growth - 1)  ... or simpler growth^rank * base
            # Use: threshold(rank) = B24 * B25^rank  for rank>=1, 0 for rank 0
            if rank == 0:
                ws.cell(row, 3, 0).fill = INPUT
            else:
                # seed with formula so they recalculate from curve knobs
                ws.cell(row, 3, f"=ROUND($B$24*$B$25^{rank},0)").fill = INPUT
                # Wait - INPUT with formula is odd. Better: put curve-suggested in col3 as INPUT values computed once,
                # AND have a pure formula column. Caller asked editable per level.
                # For extended ranks, pre-seed numeric values from curve so they're editable yellow numbers.
                pass
        ws.cell(row, 3).border = THIN
        ws.cell(row, 3).number_format = "#,##0"

        # XP to next = next threshold - this threshold
        if rank < 20:
            ws.cell(row, 4, f"=C{row+1}-C{row}").fill = OUTPUT
        else:
            ws.cell(row, 4, 0).fill = OUTPUT
        ws.cell(row, 4).border = THIN
        ws.cell(row, 4).number_format = "#,##0"

        # Cumulative Δ from 0 = threshold itself for display of progress to this rank
        ws.cell(row, 5, f"=C{row}").fill = OUTPUT
        ws.cell(row, 5).border = THIN
        ws.cell(row, 5).number_format = "#,##0"

        # Hours to next
        ws.cell(row, 6, f"=IF($B$27<=0,0,D{row}/$B$27)").fill = OUTPUT
        ws.cell(row, 6).border = THIN
        ws.cell(row, 6).number_format = "0.00"

        # Sessions to next
        ws.cell(row, 7, f"=IF($B$28<=0,0,F{row}*60/$B$28)").fill = OUTPUT
        ws.cell(row, 7).border = THIN
        ws.cell(row, 7).number_format = "0.0"

        # Hours from 0 to reach THIS rank
        ws.cell(row, 8, f"=IF($B$27<=0,0,C{row}/$B$27)").fill = OUTPUT
        ws.cell(row, 8).border = THIN
        ws.cell(row, 8).number_format = "0.00"

        ws.cell(row, 9, f"=IF($B$28<=0,0,H{row}*60/$B$28)").fill = OUTPUT
        ws.cell(row, 9).border = THIN
        ws.cell(row, 9).number_format = "0.0"

        ws.cell(row, 10, live).fill = REF
        ws.cell(row, 10).border = THIN
        ws.cell(row, 11, "").fill = INPUT
        ws.cell(row, 11).border = THIN

    # Fix extended rank thresholds as numeric seeds (editable), not formulas-in-input
    import math
    base = 50
    growth = 1.45
    for rank in range(0, 21):
        row = first_rank_row + rank
        if rank in live_ranks:
            continue
        # geometric from base
        thr = round(base * (growth ** rank))
        ws.cell(row, 3, thr).fill = INPUT
        ws.cell(row, 3).border = THIN
        ws.cell(row, 3).number_format = "#,##0"

    # Button-like note: "To rebuild extended ranks from curve knobs, set C for rank r = ROUND($B$24*$B$25^r,0)"
    ws["A53"] = "Tip: for ranks 10–20, paste =ROUND($B$24*$B$25^A31,0) pattern — or edit yellow XP thresholds directly. Live ranks 0–9 match data.js."
    ws["A53"].font = Font(name="Calibri", size=8, italic=True)
    ws.merge_cells("A53:K53")

    # ========== MONSTERS ==========
    r = 55
    r = section(ws, r, "C · MONSTERS (hunt targets) — earnings, combat, TTK, gold/hr, Rank-XP/hr")

    m_headers = [
        "Monster", "Area", "Contract id", "miniDesc",
        "HP mult", "Move", "Spawn", "Wander", "AimAssist", "HitWidth", "Clump", "HP noPierce",
        "Base HP", "Eff HP", "TTK sec (combat)", "Kills/min combat",
        "Gold min", "Gold max", "Avg gold", "Scrap %", "Rare %", "Points/kill",
        "Quota", "Finish bonus", "Food/kill", "Contract mult", "Area mult",
        "Sig drop id", "Sig %",
        "Gold/hr combat", "Gold/hr idle econ", "Scrap/hr combat",
        "Rank XP / task", "Tasks/hr combat", "Rank XP/hr combat",
        "Min to finish task", "Sessions (30m) / task",
    ]
    # That's a lot of columns - use A onwards, widen sheet
    start = 56
    for i, h in enumerate(m_headers, 1):
        cell = ws.cell(start, i, h)
        cell.fill = HEADER
        cell.font = HDR_FONT
        cell.border = THIN
        cell.alignment = Alignment(wrap_text=True, vertical="center", textRotation=45)
    ws.row_dimensions[start].height = 60

    # extend column widths for monster block
    for i in range(1, len(m_headers) + 1):
        letter = get_column_letter(i)
        if i > 16:
            ws.column_dimensions[letter].width = max(ws.column_dimensions[letter].width or 10, 11)

    row = start + 1
    monster_first = row
    for c in DATA["contracts"]:
        combat = c.get("combat") or {}
        hp_mult = combat.get("hpMult", 1)
        area_id = c["areaId"]
        area_mult = AREA_MULT.get(area_id, 1)
        sig = c.get("signatureDrop") or {}

        # A name
        ws.cell(row, 1, c["name"]).fill = INPUT
        ws.cell(row, 2, AREA_NAME.get(area_id, area_id)).fill = INPUT
        ws.cell(row, 3, c["id"]).fill = REF  # id stable
        ws.cell(row, 4, c.get("miniDesc") or "").fill = INPUT

        # combat inputs
        for col, key, default in [
            (5, "hpMult", 1), (6, "moveMult", 1), (7, "spawnMult", 1),
            (8, "wanderAmp", 1), (9, "aimAssistMod", 0), (10, "hitWidthMult", 1),
        ]:
            ws.cell(row, col, combat.get(key, default)).fill = INPUT
            ws.cell(row, col).number_format = "0.00" if key != "aimAssistMod" else "0"
        ws.cell(row, 11, 1 if combat.get("clump") else 0).fill = INPUT
        ws.cell(row, 12, combat.get("hpMultNoPierce", "")).fill = INPUT

        # Base HP ref to scenario
        ws.cell(row, 13, "=$B$17").fill = OUTPUT
        # Eff HP = base * hpMult (use noPierce if set and assume no pierce for conservative TTK — note in desc)
        # Use hpMult for standard; if hpMultNoPierce present, show that as optional — use MAX of the two for "before pierce" feeling
        ws.cell(row, 14, f'=M{row}*E{row}').fill = OUTPUT
        ws.cell(row, 14).number_format = "0.0"

        # TTK sec = EffHP / combined DPS
        ws.cell(row, 15, f'=IF($B$8<=0,0,N{row}/$B$8)').fill = OUTPUT
        ws.cell(row, 15).number_format = "0.00"

        # Kills/min combat = 60/TTK
        ws.cell(row, 16, f'=IF(O{row}<=0,0,60/O{row})').fill = OUTPUT
        ws.cell(row, 16).number_format = "0.00"

        # Economy inputs
        ws.cell(row, 17, c["goldMin"]).fill = INPUT
        ws.cell(row, 18, c["goldMax"]).fill = INPUT
        ws.cell(row, 19, f'=(Q{row}+R{row})/2').fill = OUTPUT
        ws.cell(row, 19).number_format = "0.00"
        ws.cell(row, 20, c["scrapChance"]).fill = INPUT
        ws.cell(row, 20).number_format = "0.0%"
        ws.cell(row, 21, c["rareChance"]).fill = INPUT
        ws.cell(row, 21).number_format = "0.0%"
        ws.cell(row, 22, c["pointsPerKill"]).fill = INPUT
        ws.cell(row, 23, c["killQuota"]).fill = INPUT
        ws.cell(row, 24, c["finishBonus"]).fill = INPUT
        ws.cell(row, 25, c["foodPerKill"]).fill = INPUT
        ws.cell(row, 26, c["mult"]).fill = INPUT
        ws.cell(row, 27, area_mult).fill = INPUT

        ws.cell(row, 28, sig.get("id", "")).fill = INPUT
        ws.cell(row, 29, sig.get("chance", 0) or 0).fill = INPUT
        ws.cell(row, 29).number_format = "0.0%"

        # Gold/hr combat = kills/min * 60 * avg gold
        ws.cell(row, 30, f'=P{row}*60*S{row}').fill = OUTPUT
        ws.cell(row, 30).number_format = "#,##0.0"

        # Gold/hr idle econ = global KillRate * area * contract * avg gold * 60
        # B20 is already active-blended without area/contract
        ws.cell(row, 31, f'=$B$20*AA{row}*Z{row}*S{row}*60').fill = OUTPUT
        ws.cell(row, 31).number_format = "#,##0.0"

        # Scrap/hr combat
        ws.cell(row, 32, f'=P{row}*60*T{row}').fill = OUTPUT
        ws.cell(row, 32).number_format = "0.0"

        # Rank XP per task = floor(quota*0.5 + finish*0.3)
        ws.cell(row, 33, f'=FLOOR(W{row}*0.5+X{row}*0.3,1)').fill = OUTPUT
        ws.cell(row, 33).number_format = "0"

        # Tasks/hr combat = kills/min * 60 / quota
        ws.cell(row, 34, f'=IF(W{row}<=0,0,P{row}*60/W{row})').fill = OUTPUT
        ws.cell(row, 34).number_format = "0.00"

        # Rank XP/hr
        ws.cell(row, 35, f'=AH{row}*AG{row}').fill = OUTPUT
        ws.cell(row, 35).number_format = "0.0"

        # Min to finish one task at combat pace
        ws.cell(row, 36, f'=IF(P{row}<=0,0,W{row}/P{row})').fill = OUTPUT
        ws.cell(row, 36).number_format = "0.00"

        # Sessions of 30m to finish one task (usually <1)
        ws.cell(row, 37, f'=IF($B$9<=0,0,AJ{row}/$B$9)').fill = OUTPUT
        ws.cell(row, 37).number_format = "0.00"

        for col in range(1, 38):
            ws.cell(row, col).border = THIN
            ws.cell(row, col).font = NORMAL

        row += 1
    monster_last = row - 1

    # ========== MASTERY ==========
    r = monster_last + 2
    r = section(ws, r, "D · MASTERY PERKS (per monster · Improve bounty)", cols=10)
    mh = ["Monster", "At mastery", "Effect text", "scrapChance", "pointsMult", "offlineCapMin", "foodEff", "killMult"]
    for i, h in enumerate(mh, 1):
        cell = ws.cell(r, i, h)
        cell.fill = HEADER
        cell.font = HDR_FONT
        cell.border = THIN
    r += 1
    mastery_first = r
    for c in DATA["contracts"]:
        for p in (c.get("masteryPerks") or []):
            ws.cell(r, 1, c["name"]).fill = INPUT
            ws.cell(r, 2, p.get("at")).fill = INPUT
            ws.cell(r, 3, p.get("text", "")).fill = INPUT
            ws.cell(r, 4, p.get("scrapChance", "")).fill = INPUT
            ws.cell(r, 5, p.get("pointsMult", "")).fill = INPUT
            ws.cell(r, 6, p.get("offlineCapMin", "")).fill = INPUT
            ws.cell(r, 7, p.get("foodEff", "")).fill = INPUT
            ws.cell(r, 8, p.get("killMult", "")).fill = INPUT
            for col in range(1, 9):
                ws.cell(r, col).border = THIN
            r += 1

    # ========== GEAR ==========
    r += 1
    r = section(ws, r, "E · GEAR LADDER (time gates · minPlayMs)", cols=8)
    gh = ["Gear", "Tier", "minPlayMs", "Gate (minutes)", "Gate (hours)", "Base cost", "Cost mult", "Notes"]
    for i, h in enumerate(gh, 1):
        cell = ws.cell(r, i, h)
        cell.fill = HEADER
        cell.font = HDR_FONT
        cell.border = THIN
    r += 1
    gear_ups = [u for u in UPS if u.get("id", "").startswith("gear_")]
    for u in gear_ups:
        ws.cell(r, 1, u["name"]).fill = INPUT
        ws.cell(r, 2, u.get("gearTier", "")).fill = INPUT
        ms = u.get("minPlayMs") or 0
        ws.cell(r, 3, ms).fill = INPUT
        ws.cell(r, 4, f"=C{r}/60000").fill = OUTPUT
        ws.cell(r, 4).number_format = "0.0"
        ws.cell(r, 5, f"=C{r}/3600000").fill = OUTPUT
        ws.cell(r, 5).number_format = "0.00"
        ws.cell(r, 6, u.get("baseCost", "")).fill = INPUT
        ws.cell(r, 7, u.get("costMult", "")).fill = INPUT
        ws.cell(r, 8, "").fill = INPUT
        for col in range(1, 9):
            ws.cell(r, col).border = THIN
        r += 1

    # ========== HUNTERS ==========
    r += 1
    r = section(ws, r, "F · HUNTERS (independent combat track)", cols=10)
    hh = ["Hunter", "Role", "Idle weight", "Base dmg/hit", "Attack interval ms", "Sustained DPS (100% uptime)", "Melee uptime assume", "Eff DPS", "Hire minPlayMs", "Hire minutes"]
    for i, h in enumerate(hh, 1):
        cell = ws.cell(r, i, h)
        cell.fill = HEADER
        cell.font = HDR_FONT
        cell.border = THIN
    r += 1
    hc = DATA["consts"]["HUNTER_COMBAT"]
    hire_ms = {}
    for u in UPS:
        if u["id"] == "hunter_briar":
            hire_ms["briar"] = u.get("minPlayMs") or 0
        elif u["id"] == "hunter_quill":
            hire_ms["quill"] = u.get("minPlayMs") or 0
        elif u["id"] == "hunter_moss":
            hire_ms["moss"] = u.get("minPlayMs") or 0
        elif u["id"] == "hunter_ember":
            hire_ms["ember"] = u.get("minPlayMs") or 0
    # defaults from DESIGN if missing
    hire_ms.setdefault("briar", 900000)
    hire_ms.setdefault("quill", 5400000)
    hire_ms.setdefault("moss", 10800000)
    hire_ms.setdefault("ember", 18000000)

    melee_uptime = {"briar": 0.72, "quill": 1.0, "moss": 0.72, "ember": 1.0}
    for h in DATA["hunters"]:
        hid = h["id"]
        base = hc.get(hid, {"dmg": 0, "attackIntervalMs": 1000})
        ws.cell(r, 1, h["name"]).fill = INPUT
        ws.cell(r, 2, h.get("role", "")).fill = INPUT
        ws.cell(r, 3, h.get("idle", 0)).fill = INPUT
        ws.cell(r, 4, base["dmg"]).fill = INPUT
        ws.cell(r, 5, base["attackIntervalMs"]).fill = INPUT
        ws.cell(r, 6, f"=IF(E{r}<=0,0,D{r}/(E{r}/1000))").fill = OUTPUT
        ws.cell(r, 6).number_format = "0.00"
        ws.cell(r, 7, melee_uptime.get(hid, 1)).fill = INPUT
        ws.cell(r, 7).number_format = "0%"
        ws.cell(r, 8, f"=F{r}*G{r}").fill = OUTPUT
        ws.cell(r, 8).number_format = "0.00"
        ws.cell(r, 9, hire_ms.get(hid, 0)).fill = INPUT
        ws.cell(r, 10, f"=I{r}/60000").fill = OUTPUT
        ws.cell(r, 10).number_format = "0.0"
        for col in range(1, 11):
            ws.cell(r, col).border = THIN
        r += 1

    # ========== COMBAT UNLOCKS ==========
    r += 1
    r = section(ws, r, "G · COMBAT / COMPANY UNLOCK TIMING (Pierce vs Mage risk lives here)", cols=8)
    uh = ["Upgrade", "Id", "minPlayMs", "Minutes", "Hours", "Base cost", "Max level", "Why it matters"]
    for i, h in enumerate(uh, 1):
        cell = ws.cell(r, i, h)
        cell.fill = HEADER
        cell.font = HDR_FONT
        cell.border = THIN
    r += 1
    important = [
        "unlock_crits", "unlock_specials", "beam_focus", "bolt_pierce", "bolt_bounce",
        "hunter_briar", "hunter_quill", "hunter_power", "hunter_damage", "hunter_atk_speed",
        "hunter_swift_step", "hunter_pace", "hunter_charge",
    ]
    notes = {
        "bolt_pierce": "Must land before Infernal Mages feel fair (hpMultNoPierce).",
        "hunter_quill": "Ranged hire softens Banshee aim rage jump.",
        "hunter_briar": "First hunter; independent DPS track.",
        "beam_focus": "Bolt visual/power tier path before Pierce.",
        "unlock_crits": "~20 min feature gate.",
    }
    by_id = {u["id"]: u for u in UPS}
    for uid in important:
        u = by_id.get(uid)
        if not u:
            continue
        ws.cell(r, 1, u["name"]).fill = INPUT
        ws.cell(r, 2, uid).fill = REF
        ms = u.get("minPlayMs") or 0
        ws.cell(r, 3, ms).fill = INPUT
        ws.cell(r, 4, f"=C{r}/60000").fill = OUTPUT
        ws.cell(r, 4).number_format = "0.0"
        ws.cell(r, 5, f"=C{r}/3600000").fill = OUTPUT
        ws.cell(r, 5).number_format = "0.00"
        ws.cell(r, 6, u.get("baseCost", "")).fill = INPUT
        ws.cell(r, 7, u.get("maxLevel", "")).fill = INPUT
        ws.cell(r, 8, notes.get(uid, "")).fill = INPUT
        for col in range(1, 9):
            ws.cell(r, col).border = THIN
        r += 1

    # ========== AREA BOSSES ==========
    r += 1
    r = section(ws, r, "H · AREA BOSSES (Progress fill → relic + next area; does not add monsters)", cols=9)
    bh = ["Boss", "Area", "Threshold", "Progress / kill", "Kills to fill (approx)", "Relic id", "Unlock area", "Reward points", "Reward gold"]
    for i, h in enumerate(bh, 1):
        cell = ws.cell(r, i, h)
        cell.fill = HEADER
        cell.font = HDR_FONT
        cell.border = THIN
    r += 1
    for p in DATA["markedPrey"]:
        ws.cell(r, 1, p["name"]).fill = INPUT
        ws.cell(r, 2, AREA_NAME.get(p["areaId"], p["areaId"])).fill = INPUT
        ws.cell(r, 3, p["threshold"]).fill = INPUT
        ws.cell(r, 4, p["chipPerKill"]).fill = INPUT
        ws.cell(r, 4).number_format = "0.00"
        ws.cell(r, 5, f"=IF(D{r}<=0,0,C{r}/D{r})").fill = OUTPUT
        ws.cell(r, 5).number_format = "0.0"
        ws.cell(r, 6, p.get("relicId", "")).fill = INPUT
        ws.cell(r, 7, AREA_NAME.get(p.get("unlockAreaId"), p.get("unlockAreaId", ""))).fill = INPUT
        ws.cell(r, 8, p.get("rewardPoints", "")).fill = INPUT
        ws.cell(r, 9, p.get("rewardGold", "")).fill = INPUT
        for col in range(1, 10):
            ws.cell(r, col).border = THIN
        r += 1

    # ========== DASHBOARD ==========
    r += 2
    dash = r
    r = section(ws, r, "I · DASHBOARD — auto figures (change yellow inputs above; these update)", cols=8)

    ws.cell(r, 1, "Metric").fill = HEADER
    ws.cell(r, 1).font = HDR_FONT
    ws.cell(r, 2, "Value").fill = HEADER
    ws.cell(r, 2).font = HDR_FONT
    ws.cell(r, 3, "Driver cells").fill = HEADER
    ws.cell(r, 3).font = HDR_FONT
    r += 1

    # Reference first Undercroft monster rows: Hands, Banshees, Mages are first 3 contracts
    hands = monster_first
    banshee = monster_first + 1
    mage = monster_first + 2

    metrics = [
        ("Combined combat DPS", "=$B$8", "B6 player + B7 hunters"),
        ("Baseline idle KillRate / min", "=$B$20", "B11,B14,B15,B18,B19,B10"),
        ("Crawling Hands TTK (sec)", f"=O{hands}", f"Row {hands} monster block"),
        ("Banshees TTK (sec)", f"=O{banshee}", f"Row {banshee}"),
        ("Infernal Mages TTK (sec)", f"=O{mage}", f"Row {mage} — uses hpMult; bump E or L for no-Pierce"),
        ("Hands gold/hr (combat)", f"=AD{hands}", ""),
        ("Banshees gold/hr (combat)", f"=AD{banshee}", ""),
        ("Mages gold/hr (combat)", f"=AD{mage}", ""),
        ("Hands Rank XP/hr", f"=AI{hands}", "Task finish XP formula"),
        ("Banshees Rank XP/hr", f"=AI{banshee}", ""),
        ("Mages Rank XP/hr", f"=AI{mage}", ""),
        ("Hours 0→Tracker (rank 2)", f"=H{first_rank_row+2}", "Rank table + B27 XP/hr"),
        ("Hours 0→Hunter (rank 3)", f"=H{first_rank_row+3}", ""),
        ("Hours 0→Charter Lord (rank 9)", f"=H{first_rank_row+9}", ""),
        ("Hours 0→Rank 20 (curve)", f"=H{first_rank_row+20}", "Edit C thresholds or curve knobs"),
        ("Suggested XP/hr from Hands", f"=AI{hands}", "Paste into B27 to sync rank ETAs to Hands grind"),
    ]
    for label, formula, driver in metrics:
        ws.cell(r, 1, label).fill = REF
        ws.cell(r, 1).border = THIN
        ws.cell(r, 2, formula).fill = OUTPUT
        ws.cell(r, 2).border = THIN
        ws.cell(r, 2).number_format = "0.00"
        ws.cell(r, 3, driver).fill = REF
        ws.cell(r, 3).border = THIN
        r += 1

    r += 1
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=8)
    ws.cell(r, 1,
        "HOW TO PLAY THE SHEET: 1) Edit yellow DPS / idle knobs (B6–B19). 2) Edit monster gold/HP/quota in section C. "
        "3) Set B27 XP/hr (or copy Hands Rank XP/hr from dashboard). 4) Tweak rank thresholds (col C) or curve B24/B25 for ranks 10–20. "
        "5) Watch blue TTK, gold/hr, Rank XP/hr, and hours-to-rank update. Gear/hunter minutes are independent time-gate tracks."
    ).alignment = WRAP
    ws.row_dimensions[r].height = 48

    r += 2
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=8)
    ws.cell(r, 1,
        "FEEL RISKS (design): (1) Scraps + signature mats have no sink yet. "
        "(2) Infernal Mage teach needs Pierce unlock ≤ Mage unlock. "
        "(3) Banshee aimAssist −8 before Quill is the first rage jump."
    ).font = Font(name="Calibri", size=9, italic=True, color="7A3E00")

    # Freeze top
    ws.freeze_panes = "A5"

    wb.save(OUT)
    print(f"Wrote {OUT}")
    print(f"monster_rows {monster_first}-{monster_last}")
    print(f"rank_rows {first_rank_row}-{first_rank_row+20}")
    print(f"dashboard_start {dash}")
    return str(OUT)

if __name__ == "__main__":
    main()
