
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation

wb = Workbook()
thin = Border(left=Side(style='thin', color='CCCCCC'), right=Side(style='thin', color='CCCCCC'),
              top=Side(style='thin', color='CCCCCC'), bottom=Side(style='thin', color='CCCCCC'))
header_fill = PatternFill('solid', fgColor='1F2937')
header_font = Font(bold=True, color='FFFFFF', size=11)
title_font = Font(bold=True, size=16, color='111827')
section_font = Font(bold=True, size=13, color='1F2937')
input_fill = PatternFill('solid', fgColor='FEF3C7')
calc_fill = PatternFill('solid', fgColor='EFF6FF')
ok_fill = PatternFill('solid', fgColor='D1FAE5')
bad_fill = PatternFill('solid', fgColor='FEE2E5')
green_font = Font(color='065F46', bold=True)
red_font = Font(color='991B1B', bold=True)
wrap = Alignment(wrap_text=True, vertical='top')

def style_header(ws, row, cols):
    for c in range(1, cols+1):
        cell = ws.cell(row, c)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(wrap_text=True, horizontal='center', vertical='center')

def autosize(ws, widths):
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

MONSTER_VISUAL_HP = 150
BOLT_TTK_SEC = 12
RAW_N = 1/1.25
PERFECT_BOLT_TTK = BOLT_TTK_SEC / RAW_N
PLAYER_BASE_IDLE = 0.75
ACTIVE_MULT = 1.4
BASE_KILL_RATE = 2.5
BASE_OFFLINE_CAP = 360
BASE_FOOD_REGEN = 1.2
BASE_FOOD_CAP = 100
START_GOLD = 50
START_FOOD = 80
BOSS_PATIENCE_SEC = 120
DEFAULT_AIM_UPTIME = 0.25

areas = [
    dict(id='sewers', name='Level 1', mult=1.0),
    dict(id='mistwood', name='Level 2', mult=1.35),
    dict(id='crypt', name='Level 3', mult=1.8),
]
area_mult = {a['id']: a['mult'] for a in areas}

monsters = [
    dict(id='bristle_cub', name='Bristle Cub', level=1, area='sewers', display=8, quota=25, ppk=1.2, finish=20, gmin=1, gmax=2, scrap=0.28, hp_mult=0.70, mult=1.0, food=0.35, mat='', mat_chance=0, note='Tutorial frail/fast'),
    dict(id='thornpelt_bear', name='Thornpelt Bear', level=1, area='sewers', display=18, quota=60, ppk=2.0, finish=40, gmin=2, gmax=4, scrap=0.22, hp_mult=1.50, mult=1.1, food=0.45, mat='Pelt Scrap', mat_chance=0.12, note='Tanky slow'),
    dict(id='dire_thornpelt', name='Dire Thornpelt', level=1, area='sewers', display=26, quota=100, ppk=2.2, finish=60, gmin=4, gmax=9, scrap=0.16, hp_mult=1.20, mult=1.2, food=0.5, mat='Dire Claw', mat_chance=0.10, note='Charger'),
    dict(id='ashfang_pup', name='Ashfang Pup', level=2, area='mistwood', display=22, quota=80, ppk=2, finish=80, gmin=4, gmax=10, scrap=0.22, hp_mult=0.55, mult=1.25, food=0.6, mat='', mat_chance=0, note='Fast packling'),
    dict(id='ashfang_wolf', name='Ashfang Wolf', level=2, area='mistwood', display=42, quota=120, ppk=2.5, finish=120, gmin=6, gmax=14, scrap=0.18, hp_mult=1.2, mult=1.4, food=0.7, mat='Ashfang Fang', mat_chance=0.10, note='Evasive'),
    dict(id='dire_ashfang', name='Dire Ashfang', level=2, area='mistwood', display=58, quota=150, ppk=3, finish=160, gmin=8, gmax=18, scrap=0.28, hp_mult=1.35, mult=1.5, food=0.75, mat='Pack Hide', mat_chance=0.10, note='Pack rush'),
    dict(id='silkling', name='Silkling', level=3, area='crypt', display=180, quota=140, ppk=3.5, finish=200, gmin=10, gmax=22, scrap=0.3, hp_mult=0.70, mult=1.6, food=0.8, mat='', mat_chance=0, note='Clump swarm'),
    dict(id='webfen_widow', name='Webfen Widow', level=3, area='crypt', display=420, quota=180, ppk=4, finish=280, gmin=14, gmax=28, scrap=0.22, hp_mult=1.25, mult=1.8, food=0.9, mat='Silk Thread', mat_chance=0.10, note='Evasive'),
    dict(id='brood_matron', name='Brood Matron', level=3, area='crypt', display=600, quota=220, ppk=5, finish=350, gmin=18, gmax=36, scrap=0.28, hp_mult=1.35, mult=2.0, food=1.0, mat='Venom Sac', mat_chance=0.10, note='Clump; hpMultNoPierce 1.25 until Pierce'),
]
bosses = [
    dict(id='sewer_king', name='Elder Thornpelt', level=1, area='sewers', display=30, cost=120, hp_mult=1.85, reward_pts=100, reward_gold=200, note='No hard timer; design 45-90s solo'),
    dict(id='mist_wraith', name='Ashfang Alpha', level=2, area='mistwood', display=69, cost=280, hp_mult=2.6, reward_pts=250, reward_gold=500, note='Same fight rules'),
    dict(id='crypt_lord', name='Nightweave', level=3, area='crypt', display=720, cost=600, hp_mult=3.6, reward_pts=500, reward_gold=1200, note='Same fight rules'),
]
upgrades = [
    ('Combat','Idle Power','gold',40,1.55,40,'+12% kill rate per level','idlePower',0.12,''),
    ('Combat','Unlock Crits','gold',250,1,1,'Enable critical hits','feature:crits',1,''),
    ('Combat','Unlock Specials','gold',360,1,1,'Periodic heavy bolt pulse','feature:specials',1,''),
    ('Combat','Bolt Focus','gold',90,1.8,3,'+bolt visual tier','beamFocus',1,''),
    ('Combat','Crit Power','gold',300,1.7,10,'+4% crit chance','critChance',0.04,'Unlock Crits'),
    ('Combat','Special Cadence','points',220,1.75,5,'Specials more often','specialCadence',0.12,'Unlock Specials'),
    ('Combat','Bolt Pierce','gold',180,2.2,2,'Bolts pierce','boltPierce',1,'Bolt Focus'),
    ('Combat','Bolt Bounce','gold',250,2.2,2,'Bolt ricochets','boltBounce',1,'Bolt Focus'),
    ('Gear','Bronze Blade','gold',0,1,1,'+8% kill rate (starter owned)','idlePower',0.08,''),
    ('Gear','Iron Blade','gold',180,1,1,'+12% kill rate','idlePower',0.12,'Bronze Blade'),
    ('Gear','Steel Blade','gold',450,1,1,'+16% kill rate','idlePower',0.16,'Iron Blade'),
    ('Gear','Mithril Blade','points',320,1,1,'+22% kill rate','idlePower',0.22,'Steel Blade'),
    ('Gear','Adamant Blade','points',700,1,1,'+28% kill rate','idlePower',0.28,'Mithril Blade'),
    ('Gear','Rune Blade','points',1500,1,1,'+35% kill rate','idlePower',0.35,'Adamant Blade'),
    ('Gear','Dragon Blade','points',3500,1,1,'+50% kill rate','idlePower',0.5,'Rune Blade'),
    ('Company','Hire Briar','gold',140,1,1,'Unlock Briar','unlockHunter:briar',1,''),
    ('Company','Hire Quill','gold',3650,1,1,'Unlock Quill','unlockHunter:quill',1,'Hire Briar'),
    ('Company','Hire Moss','points',4850,1,1,'Unlock Moss','unlockHunter:moss',1,'Hire Quill'),
    ('Company','Hire Ember','points',12200,1,1,'Unlock Ember','unlockHunter:ember',1,'Hire Moss'),
    ('Company','Hunter Power','gold',250,1.65,20,'+30%/lv hunter output','hunterPower',0.30,'Hire Briar'),
    ('Company','Bigger Hits','gold',300,1.7,15,'+40%/lv hunter hit dmg','hunterDmg',0.40,'Hire Briar'),
    ('Company','Faster Attacks','gold',320,1.75,12,'+30%/lv hunter atk speed','hunterAtkSpeed',0.30,'Hire Briar'),
    ('Company','Swift Walk','gold',160,1,1,'+55% melee chase','hunterMoveSpeed',0.55,'Hire Briar'),
    ('Company','Faster Chase','gold',360,1,1,'+70% melee chase','hunterMoveSpeed',0.70,'Swift Walk'),
    ('Company','Hard Charge','points',400,1,1,'+90% melee chase','hunterMoveSpeed',0.90,'Faster Chase'),
    ('Company','Briar Blade','gold',250,1.7,5,'+40%/lv Briar dmg','briarDmg',0.40,'Hire Briar'),
    ('Company','Briar Strength','gold',300,1.75,5,'+35%/lv Briar dmg','briarDmg',0.35,'Hire Briar'),
    ('Company','Quill Focus','gold',800,1.7,12,'+40%/lv Quill dmg','quillDmg',0.40,'Hire Quill'),
    ('Company','Quill Cadence','gold',850,1.75,10,'+30%/lv Quill speed','quillAtkSpeed',0.30,'Hire Quill'),
    ('Company','Quill Arrow Speed','gold',800,1.7,8,'+25%/lv Quill flight','quillProjSpeed',0.25,'Hire Quill'),
    ('Company','Quill Multishot','points',900,1.85,2,'Extra arrows','quillMultishot',1,'Quill Focus or Cadence'),
    ('Camp','Offline Cap','gold',80,1.7,20,'+30 min offline cap','offlineCapMin',30,''),
    ('Camp','Food Efficiency','gold',50,1.6,25,'+8% food efficiency','foodEff',0.08,''),
    ('Camp','Bigger Food Stock','gold',35,1.5,30,'+25 food cap & +0.4/min','foodCap',25,''),
    ('Camp','Auto-Accept','points',150,1,1,'Auto-pick next Task','autoAccept',1,''),
    ('Camp','Loot Luck','gold',70,1.65,20,'+10% gold from kills','lootLuck',0.1,''),
    ('Camp','Boss Meter Focus','points',100,1.75,15,'+15% meter fill','preyChip',0.15,''),
    ('Scrapwork','Scrap Magnet','scraps',30,1.60,10,'+4% scrap chance','scrapChance',0.04,''),
    ('Scrapwork','Scrap Larder','scraps',25,1.55,12,'+20 food cap & +0.2/min','foodCap',20,''),
    ('Scrapwork','Wick Wire','scraps',45,1.65,8,'+5 min offline cap','offlineCapMin',5,''),
    ('Scrapwork','Gild Dust','scraps',60,1.70,6,'+3% gold loot','lootLuck',0.03,''),
    ('Forge','Pelt Guard','mats',0,1,1,'+6% scrap (10 Pelt Scrap)','scrapChance',0.06,'10 Pelt Scrap'),
    ('Forge','Fang Charm','mats',0,1,1,'+12 min offline (10 Ashfang Fang)','offlineCapMin',12,'10 Ashfang Fang'),
    ('Forge','Thread Tip','mats',0,1,1,'+4% bolt power (10 Silk Thread)','killMult',0.04,'10 Silk Thread'),
]
hunters = [
    dict(name='Briar', dmg=11, interval=1900, idle=1.0, role='melee'),
    dict(name='Quill', dmg=4, interval=1200, idle=0.85, role='ranged'),
    dict(name='Moss', dmg=13, interval=2100, idle=1.15, role='melee'),
    dict(name='Ember', dmg=5, interval=1300, idle=1.4, role='mage'),
]


# --- Lists ---
wsL = wb.active
wsL.title = 'Lists'
actions = ['Hunt','Buy upgrade','Hire hunter','Fight boss','Forge/Scrapwork buy','Go AFK']
targets = []
for x in [m['name'] for m in monsters] + [b['name'] for b in bosses] + [u[1] for u in upgrades] + [h['name'] for h in hunters]:
    if x not in targets: targets.append(x)
wsL['A1']='Actions'
for i,a in enumerate(actions,2): wsL[f'A{i}']=a
wsL['B1']='Targets'
for i,t in enumerate(targets,2): wsL[f'B{i}']=t
wsL.sheet_state='hidden'

# --- Rules & Formulas ---
wsR = wb.create_sheet('Rules & Formulas',0)
wsR['A1']='Rules & Formulas — editable constants (Play tab reads these)'
wsR['A1'].font=title_font
wsR.merge_cells('A1:D1')
wsR['A3']='Constant'; wsR['B3']='Value'; wsR['C3']='Plain English'; wsR['D3']='Code source'
style_header(wsR,3,4)
constants=[
('Base kills per minute',BASE_KILL_RATE,'Base rate before power and labor','state.js killRatePerMin'),
('Player base labor',PLAYER_BASE_IDLE,'Solo contribution with no hunters','data.js PLAYER_BASE_IDLE'),
('Active hold multiplier',ACTIVE_MULT,'Hunt-only kill-rate bonus while holding; NOT used AFK','data.js ACTIVE_MULT'),
('Monster visual HP base',MONSTER_VISUAL_HP,'Arena HP = MAX(40, ROUND(base × hpMult))','data.js / arena.js getMonsterVisualHp'),
('Bolt target TTK (sec)',BOLT_TTK_SEC,'Chip scale target','arena.js BOLT_TTK_SEC'),
('Bolt raw divisor',1.25,'chip uses raw/1.25 (raw=1 → 0.8)','arena.js boltHpChipRaw'),
('Perfect-aim bolt TTK (sec)',PERFECT_BOLT_TTK,'15s if every bolt hits the Task-sized chip','derived'),
('Aim uptime (new player)',DEFAULT_AIM_UPTIME,'Share of perfect DPS a new player lands — EDIT ME','sheet approx'),
('Boss patience limit (sec)',BOSS_PATIENCE_SEC,'Soft WIN/LOSE rule; CODE has no hard timer','design polish; arena flee-boss'),
('Base offline cap (min)',BASE_OFFLINE_CAP,'Away progress cap before Camp/Scrapwork/Forge','state.js offlineCapMin=360'),
('Base food regen /min',BASE_FOOD_REGEN,'Food refill rate','state.js'),
('Base food cap',BASE_FOOD_CAP,'Max food','state.js'),
('Start gold',START_GOLD,'New save','state.js defaultState'),
('Start food',START_FOOD,'New save','state.js defaultState'),
('Briar base dmg chip',11,'HP per Briar hit at hire','data.js HUNTER_COMBAT'),
('Briar interval ms',1900,'Ms between Briar hits','data.js'),
('Briar chase uptime base',0.72,'Melee uptime; ×√moveSpeed capped 0.95','arena.js hunterChaseUptime'),
]
const_cells={}
for i,(label,val,plain,src) in enumerate(constants,4):
    wsR[f'A{i}']=label; wsR[f'B{i}']=val; wsR[f'B{i}'].fill=input_fill
    wsR[f'C{i}']=plain; wsR[f'C{i}'].alignment=wrap; wsR[f'D{i}']=src
    const_cells[label]=f"'Rules & Formulas'!B{i}"
C_BASE_RATE=const_cells['Base kills per minute']
C_PLAYER_LABOR=const_cells['Player base labor']
C_ACTIVE=const_cells['Active hold multiplier']
C_PERFECT_TTK=const_cells['Perfect-aim bolt TTK (sec)']
C_AIM=const_cells['Aim uptime (new player)']
C_BOSS_LIMIT=const_cells['Boss patience limit (sec)']
C_OFF_CAP=const_cells['Base offline cap (min)']
C_FOOD_REGEN=const_cells['Base food regen /min']
C_FOOD_CAP=const_cells['Base food cap']
C_START_GOLD=const_cells['Start gold']
C_START_FOOD=const_cells['Start food']
C_BRIAR_DMG=const_cells['Briar base dmg chip']
C_BRIAR_INT=const_cells['Briar interval ms']
C_BRIAR_UP=const_cells['Briar chase uptime base']

wsR['A23']='Formulas in plain English'; wsR['A23'].font=section_font
for i,line in enumerate([
'Kill rate AFK/min = BaseRate × IdlePower × (PlayerLabor + HunterLabor) × AreaMult × MonsterMult',
'Kill rate Hunt/min = AFK rate × Active hold multiplier',
'IdlePower starts at 1.00 + Bronze +0.08 + Idle Power/gear bonuses',
'HunterLabor = sum(hired idle × Hunter Power). Briar 1.0, Quill 0.85, Moss 1.15, Ember 1.4',
'Gold/kill ≈ avg(goldMin,goldMax) × LootLuck; Sp/kill = pointsPerKill; meter += Sp × Boss Meter Focus',
'Task finish adds finishBonus Sp to wallet+meter and gold ≈ finishBonus×0.5×LootLuck',
'Arena HP = MAX(40, ROUND(VisualHPBase × hpMult))',
'Player bolt DPS = (CurrentTaskHP / PerfectBoltTTK) × AimUptime — CODE sizes bolts from the Task, not the boss',
'Briar DPS ≈ chip × (1000/interval) × chaseUptime',
'Boss TTK = BossHP / (PlayerDPS + HunterDPS); WIN if TTK ≤ patience (soft rule)',
'Go AFK: counted min = MIN(Hours×60, OfflineCap). Food regenerates for counted window first, then kills spend food; empty food stops kills',
'Sheet AFK assumes continuous hunting of Target (like Auto-Accept). Real code without Auto-Accept stops after the current Task',
],24):
    wsR[f'A{i}']=line; wsR.merge_cells(f'A{i}:D{i}'); wsR[f'A{i}'].alignment=wrap; wsR.row_dimensions[i].height=28
autosize(wsR,[28,12,55,50])

# --- Monsters ---
wsM=wb.create_sheet('Monsters')
wsM['A1']='Monsters & Bosses (live code)'; wsM['A1'].font=title_font
mh=['Name','Kind','Level','Display Lv','Arena HP','HP mult','Gold/kill avg','Slayer pts/kill','Scrap chance','Signature mat','Mat chance','Task quota','Finish bonus Sp','Food/kill','Contract mult','Area mult','Notes']
for i,h in enumerate(mh,1): wsM.cell(3,i,h)
style_header(wsM,3,len(mh))
row=4
for m in monsters:
    hp=max(40,round(MONSTER_VISUAL_HP*m['hp_mult']))
    vals=[m['name'],'Hunt',m['level'],m['display'],hp,m['hp_mult'],(m['gmin']+m['gmax'])/2,m['ppk'],m['scrap'],m['mat'] or '—',m['mat_chance'],m['quota'],m['finish'],m['food'],m['mult'],area_mult[m['area']],m['note']]
    for i,v in enumerate(vals,1):
        wsM.cell(row,i,v); wsM.cell(row,i).fill=calc_fill
    row+=1
for b in bosses:
    hp=max(40,round(MONSTER_VISUAL_HP*b['hp_mult']))
    vals=[b['name'],'Boss',b['level'],b['display'],hp,b['hp_mult'],b['reward_gold'],b['reward_pts'],'—','—',0,f"Meter {b['cost']}",0,0,1,area_mult[b['area']],b['note']]
    for i,v in enumerate(vals,1):
        wsM.cell(row,i,v); wsM.cell(row,i).fill=PatternFill('solid', fgColor='FCE7F3')
    row+=1
# lookup T-AH
headers_l=['LOOKUP_NAME','HP','GAVG','PPK','SCRAP','QUOTA','FINISH','FOOD','CMULT','AMULT','LEVEL','MAT','MATC','KIND','BOSSCOST']
for i,h in enumerate(headers_l,20):
    wsM.cell(3,i,h); wsM.cell(3,i).fill=header_fill; wsM.cell(3,i).font=header_font
r=4
for m in monsters:
    hp=max(40,round(MONSTER_VISUAL_HP*m['hp_mult']))
    for i,v in enumerate([m['name'],hp,(m['gmin']+m['gmax'])/2,m['ppk'],m['scrap'],m['quota'],m['finish'],m['food'],m['mult'],area_mult[m['area']],m['level'],m['mat'],m['mat_chance'],'Hunt',0],20):
        wsM.cell(r,i,v)
    r+=1
for b in bosses:
    hp=max(40,round(MONSTER_VISUAL_HP*b['hp_mult']))
    for i,v in enumerate([b['name'],hp,b['reward_gold'],b['reward_pts'],0,0,0,0,1,area_mult[b['area']],b['level'],'','','Boss',b['cost']],20):
        wsM.cell(r,i,v)
    r+=1
lookup_last=r-1
autosize(wsM,[18,8,8,10,10,10,12,12,12,14,10,12,12,10,10,10,40])

# --- Upgrades ---
wsU=wb.create_sheet('Upgrades')
wsU['A1']='Upgrades / Hires / Scrapwork / Forge (code: resource costs, no time gates)'; wsU['A1'].font=title_font
uh=['Tab','Name','Currency','Base cost','Cost mult','Max level','Effect (plain)','Effect key','Per level','Prerequisite','Notes']
for i,h in enumerate(uh,1): wsU.cell(3,i,h)
style_header(wsU,3,len(uh))
for i,u in enumerate(upgrades,4):
    tab,name,cur,base,mult,mx,plain,key,val,pre=u
    for c,v in enumerate([tab,name,cur,base,mult,mx,plain,key,val,pre,'Was time-gated; now resource cost' if base>0 else 'Starter/mat'],1):
        wsU.cell(i,c,v); wsU.cell(i,c).fill=calc_fill
for i,h in enumerate(['LOOKUP_NAME','CURRENCY','BASE','MULT','MAX','EKEY','EVAL'],14):
    wsU.cell(3,i,h); wsU.cell(3,i).fill=header_fill; wsU.cell(3,i).font=header_font
for i,u in enumerate(upgrades,4):
    tab,name,cur,base,mult,mx,plain,key,val,pre=u
    for c,v in enumerate([name,cur,base,mult,mx,key,val],14):
        wsU.cell(i,c,v)
up_last=3+len(upgrades)
autosize(wsU,[12,20,10,10,10,10,40,18,10,22,36])


# --- Start Here ---
wsS=wb.create_sheet('Start Here',0)
wsS['A1']='AFK Slayer — Play Sheet'; wsS['A1'].font=title_font
wsS['A2']='A spreadsheet you can play like the game. Yellow cells are inputs; blue cells recalculate. Built from the live game code (not design docs).'
wsS['A2'].alignment=wrap; wsS.merge_cells('A2:B2'); wsS.row_dimensions[2].height=36
wsS['A4']='What the game is'; wsS['A4'].font=section_font
wsS['A5']=('AFK Slayer is an idle hunt game. You take a Task (a kill quota) on a monster, fire bolts while you play, '
'and hire hunters who keep fighting when you step away. Kills earn gold, Slayer points, scraps, and signature mats. '
'Slayer points fill a boss meter. When it is full you Fight the Level boss. Win and the next Level unlocks.')
wsS['A5'].alignment=wrap; wsS.merge_cells('A5:B5'); wsS.row_dimensions[5].height=56
wsS['A7']='The loop (7 steps)'; wsS['A7'].font=section_font
for i,s in enumerate([
'1. Take a Task on a Level 1 hunt monster (start with Bristle Cub).',
'2. Hunt — hold to fire bolts. Kills give gold + Slayer points + sometimes scraps/mats.',
'3. Spend gold (and later Slayer points / scraps / mats) on Progress upgrades: Combat, Gear, Company, Camp.',
'4. Hire Briar when you can — hunters add their own damage, separate from your bolts.',
'5. Fill the Level boss meter with Slayer points (Level 1 needs 120).',
'6. Tap Fight boss. Beat Elder Thornpelt to unlock Level 2 (then Ashfang Alpha → Level 3 → Nightweave).',
'7. Go AFK when you leave — offline progress runs on the AFK kill rate up to your away cap, and stops if food runs out.',
],8):
    wsS[f'A{i}']=s; wsS.merge_cells(f'A{i}:B{i}')
wsS['A16']='Currencies'; wsS['A16'].font=section_font
wsS['A17']='Currency'; wsS['B17']='What it does'; style_header(wsS,17,2)
for i,(a,b) in enumerate([
('Gold','Buy most upgrades, gear, and Briar/Quill. Earned every kill.'),
('Slayer points','Fill the boss meter; also buy some late upgrades (Mithril+, Moss/Ember).'),
('Scraps','Camp Scrapwork side path. Chance drop on kills.'),
('Signature mats','Per-family drops (Pelt Scrap, Dire Claw, …). Spend at the Forge.'),
('Food','Hunters eat food while AFK. Empty food stops offline kills. Buy more for 10 gold → +40 food.'),
],18):
    wsS[f'A{i}']=a; wsS[f'B{i}']=b; wsS[f'B{i}'].alignment=wrap
wsS['A24']='Active play vs AFK'; wsS['A24'].font=section_font
for i,s in enumerate([
'Active Hunt: you hold to fire. Kill rate gets the active hold bonus (×1.4). Boss fights only happen while you play.',
'Go AFK: uses the idle kill-rate formula with NO active bonus. Progress only counts up to your away cap (starts at 6 hours = 360 minutes; Camp Offline Cap, Scrapwork Wick Wire, and Forge Fang Charm add more).',
'Anything beyond the away cap is lost. Food regenerates during the counted window, then kills spend food — if food runs out, hunting stops even if cap time remains.',
'In the Play tab, set Action = Go AFK and put hours in the Min or Hrs column. The sheet shows how many hours actually counted.',
],25):
    wsS[f'A{i}']=s; wsS.merge_cells(f'A{i}:B{i}'); wsS[f'A{i}'].alignment=wrap; wsS.row_dimensions[i].height=40
wsS['A30']='How to use the Play tab'; wsS['A30'].font=section_font
for i,s in enumerate([
'Each row is one step. Yellow cells are your inputs: Action, Target, Min or Hrs (minutes for Hunt, hours for Go AFK).',
'Pick Action from the dropdown, Target from the list (monster / upgrade / hunter / boss name).',
'Blue cells are the running game state after that step: gold, meter, scraps, mats, food, DPS, kills, boss result.',
'Green Status = OK (applied). Red Status = Can’t — the step did not spend or earn (read the Message).',
'About 20 example rows are prefilled to a first Elder Thornpelt fight (including one 8-hour AFK). Keep playing in the empty rows below.',
'Edit Aim uptime and Boss patience on the Rules & Formulas tab if you want different fight fairness assumptions.',
],31):
    wsS[f'A{i}']=s; wsS.merge_cells(f'A{i}:B{i}'); wsS[f'A{i}'].alignment=wrap; wsS.row_dimensions[i].height=28
autosize(wsS,[22,80])

# --- Boss Check ---
cub_hp=max(40,round(MONSTER_VISUAL_HP*0.70))
elder_hp=max(40,round(MONSTER_VISUAL_HP*1.85))
alpha_hp=max(40,round(MONSTER_VISUAL_HP*2.6))
night_hp=max(40,round(MONSTER_VISUAL_HP*3.6))
wsB=wb.create_sheet('Boss Check')
wsB['A1']='Boss Check — can you kill the Level boss?'; wsB['A1'].font=title_font
wsB['A2']='Yellow = inputs. Code has NO hard fight timer; patience is the soft design rule (see Rules).'
wsB['A2'].alignment=wrap; wsB.merge_cells('A2:F2')
wsB['A4']='Shared inputs'; wsB['A4'].font=section_font
rows_in=[
('Aim uptime',f'={C_AIM}','Linked to Rules'),
('Patience limit (sec)',f'={C_BOSS_LIMIT}',''),
('Bolt sized from Task HP (code)',cub_hp,'Bristle Cub HP — bolts use current Task, not boss'),
('Briar hired? (0/1)',0,'Example first fight at meter-fill = 0'),
('Hunter Power lv',0,''),
('Bigger Hits lv',0,''),
('Swift Walk? (0/1)',0,''),
]
for i,(a,b,c) in enumerate(rows_in,5):
    wsB[f'A{i}']=a; wsB[f'B{i}']=b; wsB[f'B{i}'].fill=input_fill; wsB[f'C{i}']=c

def boss_block(sr, name, hp, cost, assumption):
    wsB[f'A{sr}']=name; wsB[f'A{sr}'].font=section_font
    wsB[f'A{sr+1}']='Assumption'; wsB[f'B{sr+1}']=assumption; wsB.merge_cells(f'B{sr+1}:F{sr+1}')
    wsB[f'A{sr+2}']='Boss HP'; wsB[f'B{sr+2}']=hp
    wsB[f'A{sr+3}']='Meter cost (Sp)'; wsB[f'B{sr+3}']=cost
    wsB[f'A{sr+4}']='Player bolt DPS'; wsB[f'B{sr+4}']=f'=$B$7/{C_PERFECT_TTK}*$B$5'
    wsB[f'A{sr+5}']='Briar DPS'
    wsB[f'B{sr+5}']=('=IF($B$8<1,0,MAX(1,ROUND(11*(1+0.3*$B$9)*(1+0.4*$B$10),0))'
                      '*(1000/1900)*MIN(0.95,0.72*SQRT(1+0.55*($B$11>=1))))')
    wsB[f'A{sr+6}']='Total DPS'; wsB[f'B{sr+6}']=f'=B{sr+4}+B{sr+5}'
    wsB[f'A{sr+7}']='TTK (sec)'; wsB[f'B{sr+7}']=f'=IF(B{sr+6}<=0,9999,B{sr+2}/B{sr+6})'
    wsB[f'A{sr+8}']='Result'; wsB[f'B{sr+8}']=f'=IF(B{sr+7}<=$B$6,"WIN","LOSE")'
    wsB[f'A{sr+9}']='Min DPS to WIN'; wsB[f'B{sr+9}']=f'=B{sr+2}/$B$6'
    wsB[f'A{sr+10}']='DPS shortfall'; wsB[f'B{sr+10}']=f'=MAX(0,B{sr+9}-B{sr+6})'
    for rr in range(sr+2,sr+11): wsB[f'B{rr}'].fill=calc_fill

boss_block(13,'Elder Thornpelt (Level 1)',elder_hp,120,
 'Play example at first Fight: no Briar, bolts sized from Cub Task, aim from Rules.')
boss_block(26,'Ashfang Alpha (Level 2)',alpha_hp,280,
 'Assumption: set Briar hired=1. Still Cub/Pup-tier bolt sizing.')
boss_block(39,'Nightweave (Level 3)',night_hp,600,
 'Assumption: Briar only in this block — underestimates real late DPS.')

wsB['A52']='Active 1 hour vs AFK 1 hour (Level 1 Cub, Bronze only)'; wsB['A52'].font=section_font
for i,(a,b) in enumerate([
('IdlePower',1.08),('Hunter labor',0),('Cub mults',1.0),
],53):
    wsB[f'A{i}']=a; wsB[f'B{i}']=b; wsB[f'B{i}'].fill=input_fill
wsB['A56']='AFK kills/min'; wsB['B56']=f'={C_BASE_RATE}*B53*({C_PLAYER_LABOR}+B54)*B55'
wsB['A57']='Active kills/min'; wsB['B57']=f'=B56*{C_ACTIVE}'
wsB['A58']='Gold/kill avg'; wsB['B58']=1.5
wsB['A59']='Sp/kill'; wsB['B59']=1.2
wsB['A60']='Active 1h gold'; wsB['B60']='=B57*60*B58'
wsB['A61']='Active 1h Slayer pts'; wsB['B61']='=B57*60*B59'
wsB['A62']='AFK 1h gold'; wsB['B62']='=B56*60*B58'
wsB['A63']='AFK 1h Sp'; wsB['B63']='=B56*60*B59'
wsB['A64']='Active/AFK gold ratio'; wsB['B64']='=B60/B62'
for rr in range(56,65): wsB[f'B{rr}'].fill=calc_fill
wsB['A66']='Proposed Elder fix (if first fight is mistuned)'; wsB['A66'].font=section_font
wsB['A67']=('If LOSE without Briar is unintended: (1) size bolts from boss HP during boss fights '
'(arena.js boltHpChipRaw uses currentContract — mismatch vs boss HP), or (2) lower Elder hpMult 1.85 → ~1.2, '
'or (3) require Briar before Fight boss, or (4) raise early aim assist. If LOSE is an intentional wall, gate Fight behind Hire Briar.')
wsB['A67'].alignment=wrap; wsB.merge_cells('A67:F67'); wsB.row_dimensions[67].height=60
autosize(wsB,[32,14,70,12,12,12])

# --- Notes ---
wsN=wb.create_sheet('Notes')
wsN['A1']='Notes — code vs docs, simplifications, sources'; wsN['A1'].font=title_font
wsN['A3']='Type'; wsN['B3']='Topic'; wsN['C3']='Note'; wsN['D3']='Source'; style_header(wsN,3,4)
notes=[
('Code vs doc','Time gates','Docs once described minPlayMs unlocks. Live code: no time gates; resource costs only. Sheet follows CODE.','data.js; time-gates-to-costs.md'),
('Code vs doc','Boss timer','Design wants 45–90s Elder solo. CODE has no fail timer — leave resets HP. Sheet soft patience 120s.','arena.js; overnight-levels-polish.md'),
('Code quirk','Bolt chip vs boss','boltHpChipRaw uses current Task HP, not boss HP. Elder while on Cub = weaker bolts. Sheet models this.','arena.js:2544-2551'),
('Code vs doc','Area names','Live chrome is Level 1/2/3 (not Undercroft).','data.js areas'),
('Simplification','Aiming','Aim uptime cell approximates hit rate.','Rules tab'),
('Simplification','AFK multi-Task','Code without Auto-Accept stops after current Task. Sheet assumes continuous Target hunting.','state.js applyIdle'),
('Simplification','Active food','Food enforced on Go AFK only in sheet.','state.js'),
('Simplification','Points wallet','Meter ≠ spendable Sp wallet. Points-currency buys show Can’t.','state.js'),
('Simplification','Crits/specials/chests','Omitted from DPS/economy.','—'),
('Economy flag','Hire Quill 3650g','Former 90m gate → 3650g; long sink vs early gpm.','data.js hunter_quill'),
('Economy flag','Moss 4850 Sp / Ember 12200 Sp','Huge vs boss meters 280/600.','data.js'),
('Economy flag','Crits 250g / Specials 360g','Compete with Iron/Briar early.','time-gates-to-costs.md'),
('Source','Kill rate / bonuses / offline','killRatePerMin, getBonuses, applyIdle','state.js'),
('Source','Boss access','bossCost, addBossMeter, startBossFight','data.js / state.js'),
('Source','Arena HP / bolts / hunters','getMonsterVisualHp, boltHpChipRaw, hunterSustainedDps','arena.js'),
('Active vs AFK','1h compare','Boss Check rows 52–64. Active ≈ AFK × 1.4 when within food/cap.','Rules ACTIVE_MULT'),
]
for i,(a,b,c,d) in enumerate(notes,4):
    wsN[f'A{i}']=a; wsN[f'B{i}']=b; wsN[f'C{i}']=c; wsN[f'C{i}'].alignment=wrap; wsN[f'D{i}']=d
    wsN.row_dimensions[i].height=34
autosize(wsN,[14,22,88,36])


# --- Play tab ---
wsP=wb.create_sheet('Play',1)
wsP['A1']=('PLAY — each row is a step. Yellow=inputs. Blue=calculated. '
'Prefill=new-player path to Elder (includes Go AFK 8h). Min or Hrs = minutes for Hunt, hours for Go AFK.')
wsP['A1'].font=Font(bold=True,size=11); wsP.merge_cells('A1:Z1')

play_headers=['Step','Action','Target','Min or Hrs','Status','Message','Level','Gold','Meter Sp','Scraps','Pelt','DireClaw','Food',
'IdlePower','HunterLabor','Rate Active','Rate AFK','Kills','PlayerDPS','HunterDPS','TotalDPS','Boss ready?','Boss TTK s','Boss result','AFK counted h','OffCap min',
'OwnIdle','OwnIron','OwnSteel','OwnBriar','OwnHuntPwr','OwnBigger','OwnSwift','OwnLoot','OwnOffCap','OwnFoodStock','OwnFoodEff']
for i,h in enumerate(play_headers,1): wsP.cell(2,i,h)
style_header(wsP,2,len(play_headers))
wsP.row_dimensions[2].height=34
wsP.freeze_panes='E3'

dv_action=DataValidation(type='list',formula1='Lists!$A$2:$A$7',allow_blank=True)
dv_target=DataValidation(type='list',formula1='Lists!$B$2:$B$80',allow_blank=True)
wsP.add_data_validation(dv_action); wsP.add_data_validation(dv_target)
FIRST=3; LAST=220
dv_action.add(f'B{FIRST}:B{LAST}'); dv_target.add(f'C{FIRST}:C{LAST}')

prefill=[
('Hunt','Bristle Cub',28),
('Buy upgrade','Iron Blade',None),
('Go AFK','Bristle Cub',8),
('Buy upgrade','Idle Power',None),
('Buy upgrade','Loot Luck',None),
('Buy upgrade','Bigger Food Stock',None),
('Buy upgrade','Idle Power',None),
('Hunt','Bristle Cub',5),
('Fight boss','Elder Thornpelt',None),
('Hire hunter','Briar',None),
('Buy upgrade','Swift Walk',None),
('Fight boss','Elder Thornpelt',None),
('Hunt','Thornpelt Bear',12),
('Buy upgrade','Hunter Power',None),
('Buy upgrade','Idle Power',None),
('Go AFK','Thornpelt Bear',4),
('Hunt','Thornpelt Bear',8),
('Buy upgrade','Offline Cap',None),
('Buy upgrade','Food Efficiency',None),
('Buy upgrade','Bigger Hits',None),
]

cub_hp=max(40,round(MONSTER_VISUAL_HP*0.70))
elder_hp=max(40,round(MONSTER_VISUAL_HP*1.85))

def VL(cell, idx):
    return f'IFERROR(VLOOKUP({cell},Monsters!$T$4:$AH${lookup_last},{idx},FALSE),0)'

def VU(cell, idx):
    return f'IFERROR(VLOOKUP({cell},Upgrades!$N$4:$T${up_last},{idx},FALSE),0)'

def cnt(r, action, target):
    return f'COUNTIFS($B$3:$B{r},"{action}",$C$3:$C{r},"{target}")'

for r in range(FIRST, LAST+1):
    prev=r-1
    wsP.cell(r,1,r-FIRST+1)
    # ownership through this row
    wsP.cell(r,27,f'={cnt(r,"Buy upgrade","Idle Power")}')
    wsP.cell(r,28,f'={cnt(r,"Buy upgrade","Iron Blade")}')
    wsP.cell(r,29,f'={cnt(r,"Buy upgrade","Steel Blade")}')
    wsP.cell(r,30,f'={cnt(r,"Hire hunter","Briar")}+{cnt(r,"Buy upgrade","Hire Briar")}')
    wsP.cell(r,31,f'={cnt(r,"Buy upgrade","Hunter Power")}')
    wsP.cell(r,32,f'={cnt(r,"Buy upgrade","Bigger Hits")}')
    wsP.cell(r,33,f'={cnt(r,"Buy upgrade","Swift Walk")}')
    wsP.cell(r,34,f'={cnt(r,"Buy upgrade","Loot Luck")}')
    wsP.cell(r,35,f'={cnt(r,"Buy upgrade","Offline Cap")}')
    wsP.cell(r,36,f'={cnt(r,"Buy upgrade","Bigger Food Stock")}')
    wsP.cell(r,37,f'={cnt(r,"Buy upgrade","Food Efficiency")}')

    # prev refs
    if r==FIRST:
        pG,pI,pJ,pK,pL,pM,pLv = C_START_GOLD,'0','0','0','0',C_START_FOOD,'1'
        pN,pO = '(1+0.08)','0'
        pLoot,pOff,pFE,pFC,pFR = '1',C_OFF_CAP,'1',C_FOOD_CAP,C_FOOD_REGEN
        pBriar,pHP,pBg,pSw = '0','0','0','0'
        pIdleCnt=pIron=pFS='0'
    else:
        pG,pI,pJ,pK,pL,pM,pLv = f'H{prev}',f'I{prev}',f'J{prev}',f'K{prev}',f'L{prev}',f'M{prev}',f'G{prev}'
        pN,pO = f'N{prev}',f'O{prev}'
        pLoot=f'(1+0.1*AH{prev})'
        pOff=f'Z{prev}'
        pFE=f'(1+0.08*AK{prev})'
        pFC=f'({C_FOOD_CAP}+25*AJ{prev})'
        pFR=f'({C_FOOD_REGEN}+0.4*AJ{prev})'
        pBriar,pHP,pBg,pSw = f'AD{prev}',f'AE{prev}',f'AF{prev}',f'AG{prev}'
        pIdleCnt,pIron,pFS = f'AA{prev}',f'AB{prev}',f'AJ{prev}'

    # After-row power (includes this row purchases via Own cols)
    idle_after=f'(1+0.08+0.12*AA{r}+0.12*AB{r}+0.16*AC{r})'
    labor_after=f'((AD{r}>=1)*1*(1+0.3*AE{r}))'
    off_after=f'({C_OFF_CAP}+30*AI{r})'
    loot_after=f'(1+0.1*AH{r})'
    fe_after=f'(1+0.08*AK{r})'
    fc_after=f'({C_FOOD_CAP}+25*AJ{r})'
    fr_after=f'({C_FOOD_REGEN}+0.4*AJ{r})'

    hp=VL(f'C{r}',2); gavg=VL(f'C{r}',3); ppk=VL(f'C{r}',4); scrap=VL(f'C{r}',5)
    quota=VL(f'C{r}',6); finish=VL(f'C{r}',7); foodpk=VL(f'C{r}',8)
    cmult=VL(f'C{r}',9); amult=VL(f'C{r}',10); bosscost=VL(f'C{r}',15)

    rate_afk=f'({C_BASE_RATE}*{pN}*({C_PLAYER_LABOR}+{pO})*{amult}*{cmult})'
    rate_act=f'({rate_afk}*{C_ACTIVE})'

    # costs
    up_base=VU(f'C{r}',3); up_mult=VU(f'C{r}',4); up_cur=VU(f'C{r}',2)
    if r==FIRST:
        up_lv='0'
    else:
        up_lv=f'COUNTIFS($B$3:$B{prev},"Buy upgrade",$C$3:$C{prev},C{r})+COUNTIFS($B$3:$B{prev},"Hire hunter",$C$3:$C{prev},C{r})+COUNTIFS($B$3:$B{prev},"Forge/Scrapwork buy",$C$3:$C{prev},C{r})'
    up_cost=f'IFERROR(FLOOR({up_base}*({up_mult}^({up_lv})),1),0)'
    hire_cost=f'IF(C{r}="Briar",140,IF(C{r}="Quill",3650,IF(C{r}="Moss",4850,IF(C{r}="Ember",12200,0))))'

    # Hunt gains
    hk=f'IF(B{r}="Hunt",{rate_act}*IF(D{r}="",0,D{r}),0)'
    hfin=f'IF(OR(B{r}<>"Hunt",{quota}=0),0,FLOOR(({hk})/MAX(1,{quota}),1))'
    hgold=f'({hk})*({gavg})*{pLoot}+({hfin})*({finish})*0.5*{pLoot}'
    hmeter=f'(({hk})*({ppk})+({hfin})*({finish}))'
    hscrap=f'({hk})*({scrap})'
    hpelt=f'IF(C{r}="Thornpelt Bear",({hk})*0.12,0)'
    hclaw=f'IF(C{r}="Dire Thornpelt",({hk})*0.1,0)'

    # AFK
    afk_h=f'IF(B{r}="Go AFK",IF(D{r}="",0,D{r}),0)'
    afk_c=f'MIN({afk_h},{pOff}/60)'
    afk_m=f'({afk_c}*60)'
    food_ar=f'MIN({pFC},{pM}+{pFR}*{afk_m})'
    fpk=f'IF(({foodpk})=0,0.35,{foodpk})/{pFE}'
    ak=f'IF(B{r}="Go AFK",MIN(IF(({fpk})<=0,999999,FLOOR({food_ar}/({fpk}),1)),{rate_afk}*{afk_m}),0)'
    afin=f'IF(OR(B{r}<>"Go AFK",{quota}=0),0,FLOOR(({ak})/MAX(1,{quota}),1))'
    agold=f'({ak})*({gavg})*{pLoot}+({afin})*({finish})*0.5*{pLoot}'
    ameter=f'(({ak})*({ppk})+({afin})*({finish}))'
    ascrap=f'({ak})*({scrap})'
    apelt=f'IF(C{r}="Thornpelt Bear",({ak})*0.12,0)'
    aclaw=f'IF(C{r}="Dire Thornpelt",({ak})*0.1,0)'
    afood_use=f'({ak})*({fpk})'

    # Fight DPS (bolt from Cub HP — code quirk)
    pdps=f'({cub_hp}/{C_PERFECT_TTK})*{C_AIM}'
    bchip=f'MAX(1,ROUND({C_BRIAR_DMG}*(1+0.3*{pHP})*(1+0.4*{pBg}),0))'
    bdps=f'IF({pBriar}>=1,({bchip})*(1000/{C_BRIAR_INT})*MIN(0.95,{C_BRIAR_UP}*SQRT(1+0.55*({pSw}>=1))),0)'
    tdps=f'({pdps}+{bdps})'
    bttk=f'IF(({tdps})<=0,9999,{elder_hp}/({tdps}))'  # for Elder; generalize below
    # generalize boss hp from lookup
    bttk=f'IF(({tdps})<=0,9999,({hp})/({tdps}))'
    need=f'IF(({bosscost})=0,120,{bosscost})'
    win=f'({bttk}<={C_BOSS_LIMIT})'

    # Status
    status=(
        f'IF(B{r}="","",'
        f'IF(OR(B{r}="Hunt",B{r}="Go AFK"),IF(C{r}="","Can\'t","OK"),'
        f'IF(B{r}="Fight boss",IF({pI}<{need},"Can\'t","OK"),'
        f'IF(B{r}="Hire hunter",IF({pBriar}>=1,IF(C{r}="Briar","Can\'t",'
        f'IF({pG}<{hire_cost},"Can\'t","OK")),IF({pG}<{hire_cost},"Can\'t","OK")),'
        f'IF(OR(B{r}="Buy upgrade",B{r}="Forge/Scrapwork buy"),'
        f'IF({up_cur}="points","Can\'t",'
        f'IF({up_cur}="gold",IF({pG}<{up_cost},"Can\'t","OK"),'
        f'IF({up_cur}="scraps",IF({pJ}<{up_cost},"Can\'t","OK"),'
        f'IF({up_cur}="mats","Can\'t","OK")))),'
        f'"Check")))))'
    )
    # Fix hire already logic - simplify
    status=(
        f'IF(B{r}="","",'
        f'IF(OR(B{r}="Hunt",B{r}="Go AFK"),IF(C{r}="","Can\'t","OK"),'
        f'IF(B{r}="Fight boss",IF({pI}<{need},"Can\'t","OK"),'
        f'IF(B{r}="Hire hunter",IF(AND(C{r}="Briar",{pBriar}>=1),"Can\'t",IF({pG}<{hire_cost},"Can\'t","OK")),'
        f'IF(OR(B{r}="Buy upgrade",B{r}="Forge/Scrapwork buy"),'
        f'IF({up_cur}="points","Can\'t",IF({up_cur}="gold",IF({pG}<{up_cost},"Can\'t","OK"),IF({up_cur}="scraps",IF({pJ}<{up_cost},"Can\'t","OK"),IF({up_cur}="mats","Can\'t","OK")))),'
        f'"Check")))))'
    )
    msg=(
        f'IF(B{r}="","",'
        f'IF(AND(B{r}="Fight boss",{pI}<{need}),"Can\'t — need "&TEXT({need}-{pI},"0.0")&" more Slayer points on the meter",'
        f'IF(AND(B{r}="Hire hunter",C{r}="Briar",{pBriar}>=1),"Can\'t — already hired",'
        f'IF(AND(B{r}="Hire hunter",{pG}<{hire_cost}),"Can\'t — need "&TEXT({hire_cost}-{pG},"0")&" more gold",'
        f'IF(AND(OR(B{r}="Buy upgrade",B{r}="Forge/Scrapwork buy"),{up_cur}="points"),"Can\'t — Sp-wallet spends not tracked here",'
        f'IF(AND(OR(B{r}="Buy upgrade",B{r}="Forge/Scrapwork buy"),{up_cur}="gold",{pG}<{up_cost}),"Can\'t — need "&TEXT({up_cost}-{pG},"0")&" more gold",'
        f'IF(AND(OR(B{r}="Buy upgrade",B{r}="Forge/Scrapwork buy"),{up_cur}="scraps",{pJ}<{up_cost}),"Can\'t — need "&TEXT({up_cost}-{pJ},"0")&" more scraps",'
        f'IF(AND(B{r}="Fight boss",E{r}="OK",{win}),"WIN — boss down, next Level unlocks",'
        f'IF(AND(B{r}="Fight boss",E{r}="OK"),"LOSE — TTK "&TEXT({bttk},"0")&"s > patience "&TEXT({C_BOSS_LIMIT},"0")&"s (leave resets HP)",'
        f'IF(B{r}="Go AFK","AFK resolved (see AFK counted h)","Applied")))))))))'
    )
    ok=f'(E{r}="OK")'

    gold=(
        f'=MAX(0,{pG}'
        f'+IF(AND({ok},B{r}="Hunt"),{hgold},0)'
        f'+IF(AND({ok},B{r}="Go AFK"),{agold},0)'
        f'+IF(AND({ok},B{r}="Fight boss",{win}),{gavg},0)'
        f'-IF(AND({ok},OR(B{r}="Buy upgrade",B{r}="Forge/Scrapwork buy"),{up_cur}="gold"),{up_cost},0)'
        f'-IF(AND({ok},B{r}="Hire hunter"),{hire_cost},0))'
    )
    meter=(
        f'=IF(AND({ok},B{r}="Fight boss",{win}),0,'
        f'MIN(IF({pLv}<=1,120,IF({pLv}=2,280,600)),{pI}+IF(AND({ok},B{r}="Hunt"),{hmeter},0)+IF(AND({ok},B{r}="Go AFK"),{ameter},0)))'
    )
    scraps=f'=MAX(0,{pJ}+IF(AND({ok},B{r}="Hunt"),{hscrap},0)+IF(AND({ok},B{r}="Go AFK"),{ascrap},0)-IF(AND({ok},OR(B{r}="Buy upgrade",B{r}="Forge/Scrapwork buy"),{up_cur}="scraps"),{up_cost},0))'
    pelt=f'=MAX(0,{pK}+IF(AND({ok},B{r}="Hunt"),{hpelt},0)+IF(AND({ok},B{r}="Go AFK"),{apelt},0))'
    claw=f'=MAX(0,{pL}+IF(AND({ok},B{r}="Hunt"),{hclaw},0)+IF(AND({ok},B{r}="Go AFK"),{aclaw},0))'
    food=f'=IF(AND({ok},B{r}="Go AFK"),MAX(0,{food_ar}-{afood_use}),MIN({fc_after},{pM}))'
    level=f'=IF(AND({ok},B{r}="Fight boss",{win},C{r}="Elder Thornpelt"),2,IF(AND({ok},B{r}="Fight boss",{win},C{r}="Ashfang Alpha"),3,{pLv}))'

    wsP.cell(r,5).value=f'={status}'
    wsP.cell(r,6).value=f'={msg}'
    wsP.cell(r,7).value=level
    wsP.cell(r,8).value=gold
    wsP.cell(r,9).value=meter
    wsP.cell(r,10).value=scraps
    wsP.cell(r,11).value=pelt
    wsP.cell(r,12).value=claw
    wsP.cell(r,13).value=food
    wsP.cell(r,14).value=f'={idle_after}'
    wsP.cell(r,15).value=f'={labor_after}'
    wsP.cell(r,16).value=f'=IF(OR(B{r}="Hunt",B{r}="Go AFK"),{rate_act},"")'
    wsP.cell(r,17).value=f'=IF(OR(B{r}="Hunt",B{r}="Go AFK"),{rate_afk},"")'
    wsP.cell(r,18).value=f'=IF(AND({ok},B{r}="Hunt"),{hk},IF(AND({ok},B{r}="Go AFK"),{ak},0))'
    wsP.cell(r,19).value=f'={pdps}'
    wsP.cell(r,20).value=f'={bdps}'
    wsP.cell(r,21).value=f'=S{r}+T{r}'
    wsP.cell(r,22).value=f'=IF({pI}>={need},"YES","no")'
    wsP.cell(r,23).value=f'=IF(AND(B{r}="Fight boss",E{r}="OK"),{bttk},"")'
    wsP.cell(r,24).value=f'=IF(AND(B{r}="Fight boss",E{r}="OK"),IF({win},"WIN","LOSE"),"")'
    wsP.cell(r,25).value=f'=IF(B{r}="Go AFK",{afk_c},"")'
    wsP.cell(r,26).value=f'={off_after}'

    for col in range(5,27): wsP.cell(r,col).fill=calc_fill
    for col in (2,3,4): wsP.cell(r,col).fill=input_fill

for i,(a,t,d) in enumerate(prefill):
    r=FIRST+i
    wsP.cell(r,2,a); wsP.cell(r,3,t)
    if d is not None: wsP.cell(r,4,d)

wsP.conditional_formatting.add(f'E{FIRST}:E{LAST}', FormulaRule(formula=[f'E{FIRST}="OK"'], fill=ok_fill, font=green_font))
wsP.conditional_formatting.add(f'E{FIRST}:E{LAST}', FormulaRule(formula=[f'E{FIRST}="Can\'t"'], fill=bad_fill, font=red_font))
wsP.conditional_formatting.add(f'X{FIRST}:X{LAST}', FormulaRule(formula=[f'X{FIRST}="WIN"'], fill=ok_fill, font=green_font))
wsP.conditional_formatting.add(f'X{FIRST}:X{LAST}', FormulaRule(formula=[f'X{FIRST}="LOSE"'], fill=bad_fill, font=red_font))

autosize(wsP,[6,16,18,10,8,48,8,9,9,8,7,8,7,9,10,10,9,8,9,9,9,10,9,10,10,9]+[8]*12)

# reorder
order=['Start Here','Play','Monsters','Upgrades','Rules & Formulas','Boss Check','Notes','Lists']
for i,name in enumerate(order):
    wb.move_sheet(name, offset=i-wb.sheetnames.index(name))

out='/workspace/contract-board/design/AFK_Slayer_Play_Sheet.xlsx'
wb.save(out)
print('Wrote', out)
print('Elder HP', elder_hp, 'Cub HP', cub_hp)
print('Solo TTK aim0.25', elder_hp/((cub_hp/PERFECT_BOLT_TTK)*DEFAULT_AIM_UPTIME))
