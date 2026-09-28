"""
W1 progression audit sim (design tool only — does not touch game code).

Models a typical ENGAGED (active, holding-to-fire) player from a new save to SL20.
Approach reused from design/AFK_Slayer_Play_Sheet.xlsx: kill time = HP / DPS,
player DPS = perfect bolt DPS x aim (hit) uptime, helper DPS = chip x hits/s x chase uptime,
Tier Test TTK = boss HP / bolt-only DPS (helpers + Cannon muted), soft patience 120 s.
Bolt math updated to the live iom6c absolute-chip formula in js/arena.js.

Run:  python3 w1_progression_sim.py            (current code + early-quota-cut)
      python3 w1_progression_sim.py proposed   (after proposed fixes)
"""
import math, sys, json, copy, csv, os

# ---------------------------------------------------------------- CODE CONSTANTS
MONSTER_VISUAL_HP = 150          # data.js
BASE_BOLT_CHIP = 10              # arena.js
BOLT_TICK_MS = 600               # arena.js boltIntervalMs
LEGACY_INTERVAL_MS = 135 * (1 + (40 - 1) * 0.2)   # arena.js legacyBoltIntervalMs (=1188)
START_GOLD = 50                  # state.js defaultState
CANNON_PERIOD_S = 30             # arena.js maybeSpecialPulse
CANNON_MULT = 4.0                # arena.js
HOLD_HUNTER_INTERVAL = 0.85      # arena.js hunterIntervalMs while holding
EARLY_QUOTA_MULT, EARLY_FLOOR, EARLY_REWARD_MULT = 0.2, 2, 5   # early-quota-cut.md (locked)

# ---------------------------------------------------------------- MODEL ASSUMPTIONS (labelled "model")
BASE_HIT = 0.75        # share of bolts that land on a task mob for a typical player (aim assist 16deg)
BOSS_HIT_BONUS = 0.08  # single big target is easier
KILL_OVERHEAD_S = 0.8  # respawn 220 ms + walk-in + retarget (3 mobs on screen)
TASK_SWITCH_S = 4      # pick next task manually
BOSS_SETUP_S = 6
SAVE_HORIZON_MIN = 4   # player saves for a pending unlock only if it is within ~4 min of income
SHOP_EVERY_S = 30      # player opens the shop about every 30 s (and after each task / fight)
PATIENCE_S = 90       # player fights once expected TTK <= 90 s (top of the locked 45-90 s band; code has no timer)
BOUNCE_NEAR_P = 0.6    # chance another mob is within bounce range
PIERCE_LINE_P = 0.25   # chance a second mob is on the aim ray

def hit_rate(combat, boss=False):
    h = BASE_HIT + 0.01 * combat.get('aimAssistMod', 0) + 0.25 * (combat.get('hitWidthMult', 1) - 1) \
        - 0.10 * max(0, combat.get('moveMult', 1) - 1)
    if boss: h += BOSS_HIT_BONUS
    return max(0.35, min(0.95, h))

# ---------------------------------------------------------------- CONTENT (from js/data.js)
def T(id, name, area, quota, ppk, fin, gmin, gmax, hp, move=1, assist=0, width=1, mperk=None, **kw):
    d = dict(id=id, name=name, area=area, quota=quota, ppk=ppk, fin=fin, gavg=(gmin+gmax)/2,
             combat=dict(hpMult=hp, moveMult=move, aimAssistMod=assist, hitWidthMult=width), mperk=mperk)
    d.update(kw); return d

CODE_TASKS = [
    T('hand','Crawling Hand','L1', 8,1.5,18, 4,7, 0.70,1.40, 4,1.10),
    T('crawler','Cave Crawler','L1',12,2.0,35, 5,9, 1.50,0.50, 2,1.35),
    T('banshee','Banshee','L1',     24,2.4,55, 6,11,1.20,1.45,-2,0.95, mperk='pts'),
    T('pup','Ashfang Pup','L2',     80,2.0,80, 4,10,0.55,1.55, 2,1.05),
    T('wolf','Ashfang Wolf','L2',  120,2.5,120,6,14,1.20,1.35,-6,0.78, mperk='pts'),
    T('dire','Dire Ashfang','L2',  150,3.0,160,8,18,1.35,1.20, 0,1.00, mperk='gold'),
    T('silk','Silkling','L3',      140,3.5,200,10,22,0.70,1.15, 2,1.05),
    T('widow','Webfen Widow','L3', 180,4.0,280,14,28,1.25,1.45,-8,0.72, mperk='pts'),
    T('brood','Brood Matron','L3', 220,5.0,350,18,36,1.35,0.95, 0,1.00, mperk='gold', hpNoPierce=1.25),
]
def B(id, name, area, cost, hp, rpts, rgold, relic, unlock, move=1, assist=0, width=1):
    return dict(id=id, name=name, area=area, cost=cost, combat=dict(hpMult=hp, moveMult=move, aimAssistMod=assist, hitWidthMult=width),
                rpts=rpts, rgold=rgold, relic=relic, unlock=unlock)
CODE_BOSSES = [
    B('tt1','Crawling Hand Champion','L1',120,4.0,100,200,'rat_tooth','L2',0.65, 2,1.30),
    B('tt2','Ashfang Alpha','L2',        280,5.6,250,500,'fog_lens','L3', 1.15,-2,1.10),
    B('tt3','Nightweave','L3',           600,7.8,500,1200,'bone_seal',None,1.05,0,1.15),
]
AREA_ORDER = ['L1','L2','L3']

# upgrades: id: (currency, base, mult, max, shared, minSL, requires, kind)
CODE_UPGRADES = {
    'idle_power':      ('gold', 25, 1.55, 40, True, 1, None),
    'gear_iron':       ('gold', 55, 1, 1, False, 1, None),
    'gear_steel':      ('gold', 450, 1, 1, False, 1, 'gear_iron'),
    'gear_mithril':    ('points', 320, 1, 1, False, 1, 'gear_steel'),
    'gear_adamant':    ('points', 700, 1, 1, False, 1, 'gear_mithril'),
    'gear_rune':       ('points', 1500, 1, 1, False, 1, 'gear_adamant'),
    'gear_dragon':     ('points', 3500, 1, 1, False, 1, 'gear_rune'),
    'unlock_crits':    ('gold', 250, 1, 1, False, 7, None),
    'unlock_specials': ('gold', 50, 1, 1, False, 3, None),
    'crit_power':      ('gold', 300, 1.7, 10, True, 7, 'unlock_crits'),
    'special_cadence': ('gold', 80, 1.75, 5, True, 3, 'unlock_specials'),
    'bolt_pierce':     ('gold', 180, 2.2, 2, False, 1, None),
    'bolt_bounce':     ('gold', 250, 2.2, 2, False, 1, None),
    'loot_luck':       ('gold', 70, 1.65, 20, False, 1, None),
    'auto_accept':     ('points', 150, 1, 1, False, 1, None),
    'prey_chip':       ('points', 100, 1.75, 15, False, 1, None),
    'hunter_briar':    ('gold', 140, 1, 1, False, 4, None),
    'hunter_quill':    ('gold', 900, 1, 1, False, 8, 'hunter_briar'),
    'hunter_moss':     ('gold', 2000, 1, 1, False, 13, 'hunter_briar'),
    'hunter_ember':    ('gold', 4200, 1, 1, False, 13, 'hunter_briar'),
    'hunter_power':    ('gold', 250, 1.65, 20, True, 1, 'hunter_briar'),
    'hunter_damage':   ('gold', 300, 1.7, 15, True, 1, 'hunter_briar'),
    'hunter_atk_speed':('gold', 320, 1.75, 12, True, 1, 'hunter_briar'),
    'hunter_swift_step':('gold',160, 1, 1, False, 1, 'hunter_briar'),
    'hunter_pace':     ('gold', 360, 1, 1, False, 1, 'hunter_swift_step'),
    'hunter_charge':   ('points', 400, 1, 1, False, 1, 'hunter_pace'),
    'briar_blade':     ('gold', 250, 1.7, 5, True, 1, 'hunter_briar'),
    'briar_strength':  ('gold', 300, 1.75, 5, True, 1, 'hunter_briar'),
    'quill_focus':     ('gold', 450, 1.7, 12, True, 1, 'hunter_quill'),
    'quill_cadence':   ('gold', 480, 1.75, 10, True, 1, 'hunter_quill'),
    'quill_multishot': ('points', 400, 1.85, 2, False, 1, 'hunter_quill'),
    'tempered_edge':   ('gold', 60, 1.45, 42, False, 2, None),
}
# one-shot "new system" buys the player always prioritises (saves for them)
PRIORITY = ['gear_iron','unlock_specials','hunter_briar','hunter_swift_step','unlock_crits',
            'hunter_quill','gear_steel','hunter_moss','hunter_ember']
SP_PRIORITY = ['auto_accept','gear_mithril','hunter_charge','gear_adamant','quill_multishot','gear_rune','gear_dragon']

# SL gates that exist in code (data.js SLAYER_UNLOCKS + minSlayerLevel)
CODE_SL_UNLOCKS = {1:'Hunt, Bronze, Idle Power, Iron', 2:'Smithing (Tempered Edge)', 3:'Cannon + Special Cadence',
                   4:'Hire Warrior (+ helper ladders)', 6:'Prayer board (Sharp Eye, Thick Hide)', 7:'Unlock Crits + Crit Power',
                   8:'Hire Archer', 13:'Hire Berserker + Hire Mage'}
REDESIGN_SL = {1:'Hunt/Bronze/Idle Power',2:'Smithing',3:'Cannon',4:'Hire Warrior',5:'Chain Cannon, Legs slot',6:'Prayer',
               7:'Crits, Body slot',8:'Hire Archer',9:'Prayer Chronokeeper-twin, Helm slot',10:'First prestige soft-open',
               11:'Special damage ladder',12:'Challenges-lite',13:'Hire Berserker',14:'Artifact T2 / Smithing cap',
               15:'Task Cards-lite',16:'Cannon recharge ladder',17:'(pets skipped)',18:'Helper food bump',
               19:'World-2 prep',20:'Mazchna gate'}

CONFIG_CURRENT = dict(
    name='current', tasks=CODE_TASKS, bosses=CODE_BOSSES, upgrades=CODE_UPGRADES, sl_unlocks=CODE_SL_UNLOCKS,
    early_cut=True, crit_fix=False, armor=False, extra_sl=None, chain_cannon=False,
)

# visual-gear-ladder.md (design, not yet in code): costs per tier Leather..Dragon, stat after owning n tiers
ARMOR = {
    'legs': ([40, 90, 190, 420, 930, 2050, 4500, 9900],     [0, .02, .04, .08, .12, .17, .22, .28, .36]),   # killMult
    'body': ([90, 200, 430, 950, 2100, 4600, 10100, 22200], [0, .03, .05, .10, .16, .22, .30, .38, .50]),   # loot gold
    'helm': ([150, 330, 720, 1600, 3500, 7700, 16900, 37100], [0, .01, .02, .03, .04, .06, .08, .10, .12]), # crit
}

# ---------------------------------------------------------------- SIM
def upg_cost(cfg, uid, lv):
    if uid.startswith('armor_'):
        return ARMOR[uid[6:]][0][lv]
    cur, base, mult, mx, shared, minsl, req = cfg['upgrades'][uid][:7]
    N = lv + 1
    if shared:
        return math.floor(base * N) if N <= 10 else math.floor(base * 1.3 ** (N - 10) * N)
    return math.floor(base * mult ** lv)

class Sim:
    def __init__(self, cfg, hit_scale=1.0):
        self.cfg = cfg; self.hit_scale = hit_scale
        self.t = 0.0; self.gold = START_GOLD; self.pts = 0.0; self.sl = 1; self.pp = 0
        self.up = {k: 0 for k in cfg['upgrades']}
        self.prayers = set(); self.relics = set()
        self.areas = {'L1'}; self.done = {}   # task completions
        self.unlocked_tasks = {cfg['tasks'][0]['id']}
        self.meter = {a: 0.0 for a in AREA_ORDER}
        self.boss_done = set(); self.access = set()
        self.events = []; self.minute_rows = []; self.sl_rows = []
        self.target = None; self.next_minute = 0
        self.total_completions = 0; self.area_completions = {a: 0 for a in AREA_ORDER}
        self.last_new = 0.0
        self.sl_meta = {}

    # ---- bonuses
    def early(self): return self.cfg['early_cut'] and self.up['hunter_briar'] == 0
    def P(self):
        p = 1.08 + 0.12*self.up['idle_power'] + 0.12*self.up['gear_iron'] + 0.16*self.up['gear_steel'] \
            + 0.22*self.up['gear_mithril'] + 0.28*self.up['gear_adamant'] + 0.35*self.up['gear_rune'] + 0.5*self.up['gear_dragon']
        if 'rat_tooth' in self.relics: p += 0.08
        return p
    def K(self):
        k = (1 + 0.03*self.up['tempered_edge']) * (1 + 0.10*getattr(self, 'artifacts', 0))
        if 'thick_hide' in self.prayers: k *= 1.2
        k *= 1 + 0.10*self.up.get('weapon_pct_1', 0) + 0.15*self.up.get('weapon_pct_2', 0) + 0.20*self.up.get('weapon_pct_3', 0)
        if self.cfg['armor']: k *= (1 + ARMOR['legs'][1][self.up.get('armor_legs', 0)])
        return k
    def loot(self):
        l = 1 + 0.1*self.up['loot_luck'] + (0.12 if 'fog_lens' in self.relics else 0)
        if self.cfg['armor']: l += ARMOR['body'][1][self.up.get('armor_body', 0)]
        return l
    def crit_mult(self):
        if not self.up['unlock_crits']: return 1.0
        add = 0.04*self.up['crit_power'] + (0.05 if 'sharp_eye' in self.prayers else 0)
        if self.cfg['armor']: add += ARMOR['helm'][1][self.up.get('armor_helm', 0)]
        if self.cfg['crit_fix']: c = 0.08 + add + 0.05
        else: c = (0.08 + 0.04) if add <= 0 else add + 0.05
        c = min(0.65, c); cd = 1.15 if 'sharp_eye' in self.prayers else 1.0
        return 1 + c * (2*cd - 1)
    def chip(self): return BASE_BOLT_CHIP * self.P() * self.K() * BOLT_TICK_MS / LEGACY_INTERVAL_MS
    def bolt_dps(self): return self.chip() / (BOLT_TICK_MS/1000) * self.crit_mult() * (1 + 0.02*self.up.get('attack_speed', 0))

    def hunter_dps(self):
        u = self.up; tot = 0
        hp = 1 + 0.3*u['hunter_power']; hd = 1 + 0.4*u['hunter_damage']; hs = 1 + 0.3*u['hunter_atk_speed']
        move = 1 + 0.55*u['hunter_swift_step'] + 0.7*u['hunter_pace'] + 0.9*u['hunter_charge']
        melee_up = min(0.95, 0.72*math.sqrt(move))
        spec = [('hunter_briar', 11, 1900, True, 1 + 0.4*u['briar_blade'] + 0.35*u['briar_strength'], 1),
                ('hunter_quill', 4, 1200, False, 1 + 0.4*u['quill_focus'], 1 + 0.3*u['quill_cadence']),
                ('hunter_moss', 13, 2100, True, 1, 1), ('hunter_ember', 5, 1300, False, 1, 1)]
        for uid, dmg, iv, melee, own, own_spd in spec:
            if not u[uid]: continue
            if self.cfg.get('helper_additive'):
                chip = max(1, round(dmg*(hp + hd + own - 2)))
            else:
                chip = max(1, round(dmg*hp*hd*own))
            interval = min(2800, max(500, round(iv*HOLD_HUNTER_INTERVAL/max(0.35, hs*own_spd))))
            volley = 1 + 0.85*u['quill_multishot'] if uid == 'hunter_quill' else 1
            tot += chip*volley*1000/interval*(melee_up if melee else 1)
        return tot

    def task_hp(self, t):
        m = t['combat']['hpMult']
        if t.get('hpNoPierce') and self.up['bolt_pierce'] < 1: m = t['hpNoPierce']
        return max(40, round(MONSTER_VISUAL_HP*m*self.cfg.get('area_hp', {}).get(t['area'], 1)))
    def task_dps(self, t):
        h = hit_rate(t['combat'])*self.hit_scale
        multi = 1 + (0.5*BOUNCE_NEAR_P if self.up['bolt_bounce'] >= 1 else 0) + (0.25*BOUNCE_NEAR_P if self.up['bolt_bounce'] >= 2 else 0) \
              + (0.6*PIERCE_LINE_P if self.up['bolt_pierce'] >= 1 else 0) + (0.35*0.1 if self.up['bolt_pierce'] >= 2 else 0)
        d = self.bolt_dps()*min(0.97, h)*multi
        if self.up['unlock_specials']:
            cad = 1 + 0.12*self.up['special_cadence'] + 0.01*self.up.get('cannon_recharge', 0)
            period = CANNON_PERIOD_S/cad
            if self.cfg.get('chain_cannon') and self.sl >= 5: d += self.chip()*2.2*4/60  # 4 pulses / 60 s (proposed)
            d += self.chip()*CANNON_MULT/period*(1 + 0.2*self.up.get('special_damage', 0))
        return d + self.hunter_dps()
    def kill_time(self, t): return self.task_hp(t)/self.task_dps(t) + KILL_OVERHEAD_S
    def quota(self, t):
        q = t['quota']
        if 'easy_assignments' in self.prayers: q = q*0.9
        if self.early(): return max(EARLY_FLOOR, round(q*EARLY_QUOTA_MULT))
        return max(self.cfg.get('quota_floor', 5), math.floor(q))
    def boss_hp(self, b): return max(40, round(MONSTER_VISUAL_HP*b['combat']['hpMult']))
    def boss_dps(self, b): return self.bolt_dps()*min(0.97, hit_rate(b['combat'], True)*self.hit_scale)
    def boss_ttk(self, b): return self.boss_hp(b)/self.boss_dps(b)
    def mastery(self, tid): return min(10, self.done.get(tid, 0)//3)
    def pts_mult(self, t):
        m = 1.0 + (0.2 if 'easy_assignments' in self.prayers else 0)
        for tt in self.cfg['tasks']:
            if tt.get('mperk') == 'pts' and tt['id'] in self.unlocked_tasks:
                ms = self.mastery(tt['id']); m += 0.10 if ms >= 10 else 0.06 if ms >= 6 else 0.04 if ms >= 3 else 0
        return m
    def gold_luck_bonus(self):
        g = 0
        for tt in self.cfg['tasks']:
            if tt.get('mperk') == 'gold' and tt['id'] in self.unlocked_tasks:
                ms = self.mastery(tt['id']); g += 0.10 if ms >= 10 else 0.06 if ms >= 6 else 0.04 if ms >= 3 else 0
        return g
    def gold_per_kill(self, t):
        return t['gavg']*(self.loot()+self.gold_luck_bonus())*(1+0.05*self.mastery(t['id']))*(EARLY_REWARD_MULT if self.early() else 1)
    def gpm(self, t):
        kt = self.kill_time(t); q = self.quota(t)
        fin_gold = t['fin']*0.5*(self.loot()+self.gold_luck_bonus())*(1+0.05*self.mastery(t['id']))
        return (self.gold_per_kill(t) + fin_gold/q)*60/kt

    # ---- availability
    def sl_ok(self, uid): return self.sl >= self.cfg['upgrades'][uid][5]
    def avail(self, uid):
        spec = self.cfg['upgrades'][uid]
        if self.up[uid] >= spec[3]: return False
        if not self.sl_ok(uid): return False
        req = spec[6]
        if req and self.up.get(req, 0) < 1: return False
        if self.cfg['armor'] and uid.startswith('armor_'):
            slot = uid[6:]; nxt = self.up[uid]   # next tier index
            if nxt >= 1 and nxt > self.weapon_tier(): return False   # metal tier <= weapon tier (Leather exempt)
        return True
    def weapon_tier(self):
        return 1 + sum(self.up[g] for g in ['gear_iron','gear_steel','gear_mithril','gear_adamant','gear_rune','gear_dragon'])

    def log(self, kind, text, new=True):
        self.events.append((self.t, self.sl, kind, text))
        if new: self.last_new = self.t

    def buy(self, uid):
        cur = self.cfg['upgrades'][uid][0]; c = upg_cost(self.cfg, uid, self.up[uid])
        if cur == 'gold': self.gold -= c
        else: self.pts -= c
        first = self.up[uid] == 0
        self.up[uid] += 1
        self.log('buy', f"{uid} -> lv{self.up[uid]} ({c} {cur})", new=first or uid.startswith('armor_') or uid.startswith('gear_'))

    def objective(self):
        """What the player is trying to speed up right now."""
        b = self.ready_boss(ignore_ttk=True)
        if b and self.boss_ttk(b) > PATIENCE_S:
            return lambda: self.boss_dps(b)
        t = self.target or self.pick_target()
        return lambda: self.task_dps(t) * (self.loot()**0.35)

    def shop(self):
        for _ in range(200):
            bought = False
            # prayers
            if self.sl >= 6:
                costs = {'thick_hide': 1, 'sharp_eye': 1, 'easy_assignments': 3, 'restful_sleep': 5}
                for pr in (['thick_hide', 'sharp_eye'] if self.up['unlock_crits'] else ['thick_hide']) + self.cfg.get('extra_prayers', []):
                    if pr not in self.prayers and self.pp >= costs[pr]:
                        self.pp -= costs[pr]; self.prayers.add(pr); self.log('prayer', pr); bought = True
                    if pr not in self.prayers: break
            # priority unlocks (save gold for them)
            pending = None
            for uid in PRIORITY + self.cfg.get('extra_priority', []):
                if uid in self.cfg['upgrades'] and self.avail(uid):
                    c = upg_cost(self.cfg, uid, self.up[uid])
                    if pending and c * 5 > upg_cost(self.cfg, pending, self.up[pending]): continue
                    if self.gold >= c: self.buy(uid); bought = True; break
                    pending = pending or uid
            if bought: continue
            # Sp spends (separate wallet; meter is not drained by spending)
            g = self.cfg.get('gate')
            saving_sp = bool(g and self.sl >= g['at_sl'] - 1)
            for uid in ([] if saving_sp else SP_PRIORITY):
                if self.avail(uid):
                    c = upg_cost(self.cfg, uid, self.up[uid])
                    if self.pts >= c: self.buy(uid); bought = True
                    break
            b = self.ready_boss(ignore_ttk=True)
            if b and self.boss_ttk(b) > PATIENCE_S and self.avail('prey_chip') is False: pass
            if bought: continue
            # ratio buys (gold)
            obj = self.objective(); base = obj()
            best = None
            for uid, spec in self.cfg['upgrades'].items():
                if spec[0] != 'gold' or uid in PRIORITY or not self.avail(uid): continue
                c = upg_cost(self.cfg, uid, self.up[uid])
                if c <= 0: continue
                self.up[uid] += 1; gain = obj()/base - 1; self.up[uid] -= 1
                if gain <= 1e-6: continue
                score = gain/c
                if best is None or score > best[0]: best = (score, uid, c)
            if best:
                reserve = upg_cost(self.cfg, pending, self.up[pending]) if pending else 0
                if pending and self.target is not None:
                    # a typical player only saves for an unlock that is < SAVE_HORIZON_MIN of income away
                    if (reserve - self.gold) / max(1e-6, self.gpm(self.target)) > SAVE_HORIZON_MIN: reserve = 0
                if self.gold - best[2] >= reserve or (pending and best[2] < 0.15*reserve and self.gold >= best[2]):
                    if self.gold >= best[2]: self.buy(best[1]); bought = True
            if not bought: return

    # ---- target selection
    def tasks_avail(self): return [t for t in self.cfg['tasks'] if t['area'] in self.areas and t['id'] in self.unlocked_tasks]
    def current_boss(self, area):
        return next((b for b in self.cfg['bosses'] if b['area'] == area and b['id'] not in self.boss_done), None)
    def boss_gate_ok(self, b):
        a = b.get('after')
        if not a: return True
        return self.done.get(a, 0) > 0 or a in self.boss_done
    def ready_boss(self, ignore_ttk=False):
        for area in AREA_ORDER:
            if area not in self.areas: continue
            b = self.current_boss(area)
            if b and self.boss_gate_ok(b) and self.meter[area] >= b['cost'] - 1e-9:
                if '_ttk_at_ready' not in b: b['_ttk_at_ready'] = self.boss_ttk(b); b['_ready_t'] = self.t
                if ignore_ttk or self.boss_ttk(b) <= PATIENCE_S: return b
        return None
    def pick_target(self):
        ts = self.tasks_avail()
        unc = [t for t in ts if self.done.get(t['id'], 0) == 0]
        if unc: return min(unc, key=lambda t: self.quota(t)*self.kill_time(t))
        # need meter somewhere?
        for area in AREA_ORDER:
            b = self.current_boss(area) if area in self.areas else None
            if b and self.boss_gate_ok(b) and self.meter[area] < b['cost']:
                cand = [t for t in ts if t['area'] == area]
                return max(cand, key=lambda t: (t['ppk'] + t['fin']/self.quota(t))/self.kill_time(t))
        # extra SL sources (proposed) handled by cfg hook
        if self.cfg.get('farm_pick'): return self.cfg['farm_pick'](self, ts)
        return max(ts, key=lambda t: self.gpm(t))

    # ---- SL
    def sl_up(self, why, source):
        self.sl += 1
        self.log('SL', f"SL{self.sl}: {why}")
        self.sl_meta[self.sl] = dict(t=self.t, why=why, source=source)
        un = self.cfg['sl_unlocks'].get(self.sl)
        if un: self.log('unlock', f"SL{self.sl} unlock: {un}")
        # snapshot
        bn = getattr(self, 'pending_bn', None) or ('kills (quota)' if source == 'task' else 'Slayer points' if source == 'gate' else '')
        self.pending_bn = None
        aff = [f"{u} {c}{'g' if cur=='gold' else 'Sp'}" for u, c, cur, ok in affordable(self) if ok]
        self.sl_rows.append(dict(sl=self.sl, t=self.t, why=why, source=source, gold=self.gold, pts=self.pts,
                                 bottleneck=bn, bolt_dps=self.bolt_dps(), afford=aff))

    def complete(self, t):
        self.done[t['id']] = self.done.get(t['id'], 0) + 1
        self.total_completions += 1; self.area_completions[t['area']] += 1
        m_before = self.mastery(t['id'])
        pm = self.pts_mult(t); bonus = t['fin']*pm
        self.pts += bonus; self.add_meter(t['area'], bonus)
        self.gold += t['fin']*0.5*(self.loot()+self.gold_luck_bonus())*(1+0.05*self.mastery(t['id']))
        m_after = self.mastery(t['id'])
        if m_after > m_before and m_after in (3, 6, 10):
            self.log('mastery', f"{t['name']} mastery {m_after} perk unlocked")
        if self.done[t['id']] == 1:
            self.pending_bn = f"kills ({self.quota(t)} x {self.kill_time(t):.1f}s)"
            self.sl_up(f"first clear {t['name']}", 'task')
            # unlock next in area
            lst = [x for x in self.cfg['tasks'] if x['area'] == t['area']]
            i = lst.index(t)
            if i+1 < len(lst) and lst[i+1]['id'] not in self.unlocked_tasks:
                self.unlocked_tasks.add(lst[i+1]['id']); self.log('unlock', f"task {lst[i+1]['name']}")
        if self.cfg.get('extra_sl'): self.cfg['extra_sl'](self, 'complete', t)
        self.t += TASK_SWITCH_S

    def add_meter(self, area, pts):
        b = self.current_boss(area)
        if not b or b['id'] in self.access: return
        mult = 1 + 0.15*self.up['prey_chip']
        before = self.meter[area]
        self.meter[area] = min(b['cost'], self.meter[area] + pts*mult)
        if before < b['cost'] <= self.meter[area] + 1e-9:
            self.log('meter', f"{b['name']} meter full", new=False)
            b['_full_t'] = self.t

    def fight(self, b):
        ttk = self.boss_ttk(b)
        self.t += ttk + BOSS_SETUP_S
        self.boss_done.add(b['id']); self.access.add(b['id']); self.meter[b['area']] = 0.0
        self.pts += b['rpts']; self.gold += b['rgold']; self.pp += 1
        if b.get('relic'): self.relics.add(b['relic'])
        self.fight_log = getattr(self, 'fight_log', []) + [(b['name'], self.t, ttk)]
        start = self.t - ttk - BOSS_SETUP_S
        full_t = b.get('_full_t', start); a = b.get('after')
        gate_t = self.sl_meta.get(self.sl, {}).get('t', 0)   # time of the previous SL event
        ready_t = max(full_t, gate_t)
        if start - ready_t > 60: bn = f"boss TTK (bolt power; waited {(start-ready_t)/60:.0f} min buying damage)"
        elif full_t > gate_t + 30: bn = f"Slayer points (meter {b['cost']:.0f})"
        else: bn = 'kills (meter already full)'
        self.pending_bn = bn
        self.sl_up(f"Tier Test {b['name']} (TTK {ttk:.0f}s)", 'tier_test')
        if b.get('unlock'):
            self.areas.add(b['unlock'])
            first = [x for x in self.cfg['tasks'] if x['area'] == b['unlock']]
            if first: self.unlocked_tasks.add(first[0]['id'])
            self.log('unlock', f"area {b['unlock']}")
        if self.cfg.get('extra_sl'): self.cfg['extra_sl'](self, 'boss', b)

    def prestige(self):
        pc = self.cfg['prestige']
        pts_gain = max(1, self.sl - pc['points_offset'])
        self.artifacts = getattr(self, 'artifacts', 0) + pts_gain
        keep = {u for u, spec in self.cfg['upgrades'].items() if u.startswith('hunter_') and spec[1] >= 140 and spec[3] == 1 and u not in ('hunter_swift_step','hunter_pace','hunter_charge')}
        keep |= {'tempered_edge'}
        for u in self.up:
            if u not in keep: self.up[u] = 0
        self.up['gear_iron'] = 0
        self.gold = 40; self.pts = 0
        self.prestiges = getattr(self, 'prestiges', 0) + 1
        self.last_prestige_sl = self.sl
        self.prestige_log = getattr(self, 'prestige_log', []) + [(self.t, self.sl, pts_gain)]
        self.log('prestige', f"PRESTIGE #{self.prestiges} at SL{self.sl}: +{pts_gain} reward points -> artifacts {self.artifacts} (+{10*self.artifacts}% weapon dmg); run upgrades reset")
        self.t += 20

    def snapshot_minutes(self):
        while self.next_minute*60 <= self.t:
            t = self.target
            self.minute_rows.append(dict(minute=self.next_minute, sl=self.sl, gold=round(self.gold), sp=round(self.pts),
                target=t['name'] if t else '-', dps=round(self.task_dps(t),1) if t else 0,
                kill_s=round(self.kill_time(t),1) if t else 0, bolt_boss_dps=round(self.bolt_dps(),1),
                meter=' '.join(f"{a}:{self.meter[a]:.0f}" for a in self.meter if a in self.areas)))
            self.next_minute += 1

    def run(self, max_hours=12, stop_sl=20):
        self.shop()
        progress = 0
        last_shop = 0.0
        while self.t < max_hours*3600 and self.sl < stop_sl:
            g = self.cfg.get('gate')
            if g and self.sl == g['at_sl'] - 1 and self.pts >= g['sp'] and self.gold >= g['gold']:
                self.pts -= g['sp']; self.gold -= g['gold']; self.sl_up('Mazchna gate paid (World-2 marker)', 'gate'); continue
            pc = self.cfg.get('prestige')
            if pc:
                bb = self.ready_boss(ignore_ttk=True)
                if bb and self.boss_ttk(bb) > PATIENCE_S:
                    self.blocked_since = getattr(self, 'blocked_since', None) or self.t
                    if (self.t - self.blocked_since >= pc['blocked_min']*60 and self.sl >= pc['min_sl']
                            and self.sl - getattr(self, 'last_prestige_sl', 0) >= pc['gap_sl']):
                        self.prestige(); self.blocked_since = None; self.shop(); continue
                else:
                    self.blocked_since = None
            b = self.ready_boss() if getattr(self, 'progress', 0) == 0 else None   # finish the current task first
            if b:
                self.fight(b); self.shop(); last_shop = self.t; continue
            if self.target is None:
                self.target = self.pick_target()
                if self.target['id'] not in getattr(self, '_seen', set()):
                    self._seen = getattr(self, '_seen', set()) | {self.target['id']}
            t = self.target
            self.t += self.kill_time(t)
            pm = self.pts_mult(t); e = EARLY_REWARD_MULT if self.early() else 1
            self.gold += self.gold_per_kill(t)
            p = t['ppk']*pm*e; self.pts += p; self.add_meter(t['area'], p)
            self.progress = getattr(self, 'progress', 0) + 1
            if self.progress >= self.quota(t):
                self.progress = 0; self.complete(t); self.target = None
            if self.target is None or self.t - last_shop >= SHOP_EVERY_S:
                self.shop(); last_shop = self.t
            self.snapshot_minutes()
        self.snapshot_minutes()
        return self

# ---------------------------------------------------------------- REPORT HELPERS
def fmt_t(s):
    m = s/60
    return f"{m:.1f} min" if m < 90 else f"{m/60:.2f} h"

def affordable(sim):
    out = []
    for uid in sim.cfg['upgrades']:
        if sim.avail(uid):
            c = upg_cost(sim.cfg, uid, sim.up[uid]); cur = sim.cfg['upgrades'][uid][0]
            have = sim.gold if cur == 'gold' else sim.pts if cur == 'points' else 0
            out.append((uid, c, cur, have >= c))
    return out

def dead_zones(sim, thresh_min=10, new_only=True):
    ev = [e for e in sim.events if (e[2] in ('SL','unlock','prayer','mastery','prestige') or (e[2]=='buy' and (not new_only or 'lv1 ' in e[3] or 'armor_' in e[3] or 'gear_' in e[3])))]
    times = [0.0] + [e[0] for e in ev] + [sim.t]
    zones = []
    for a, b2 in zip(times, times[1:]):
        if (b2 - a)/60 >= thresh_min: zones.append((a, b2))
    return zones

if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'current'
    if mode == 'current':
        s = Sim(copy.deepcopy(CONFIG_CURRENT)).run()
        for e in s.events:
            if e[2] in ('SL','unlock','meter','prayer') or 'lv1 ' in e[3] or 'gear' in e[3]:
                print(f"{fmt_t(e[0]):>10}  SL{e[1]:<2} {e[2]:6} {e[3]}")
        print('end', fmt_t(s.t), 'SL', s.sl, 'gold', round(s.gold), 'sp', round(s.pts))
        print('fights', [(n, fmt_t(t), round(k)) for n,t,k in s.fight_log])
        print('dead zones (new):', [(fmt_t(a), fmt_t(b), round((b-a)/60)) for a,b in dead_zones(s)])
        print('dead zones (any buy):', [(fmt_t(a), fmt_t(b), round((b-a)/60)) for a,b in dead_zones(s, new_only=False)])
