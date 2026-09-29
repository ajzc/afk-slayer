"""
Slayer XP sim (design tool only; never touches game code). Brief: design/slayer-xp.md

Reuses the audit model (w1_progression_sim.py: kill time = HP / DPS + overhead, Play Sheet method)
and swaps "first clear = +1 SL" for per-kill Slayer XP:
  * every task kill gives xpPerKill (x5 inside the early window), arena kills 100 %
  * first clear of a task gives a one-off XP chunk
  * each Tier Test win is a guaranteed +1 SL
  * a Tier Test with gateLevel G caps XP at 99 % of level G-1 until it is won
Content = the code as of 2026-09-28 (xp1 build: Slayer XP live; 3 Tier Tests, armor SL5/7/9 live, early cut live, crit quirk,
multiplicative helper damage, monster count 1 + helpers + multi-hit, cap 3).

Retune Sep 28 (faster SL4): CURVE['early'] = 100/120/180 and TASK_HP_SEP28 (Crawling Hand hpMult 0.40).
Pre-retune = XPSim(current_cfg(retune=False), curve=CURVE_PRE_SEP28).

Run: python3 slayer_xp_sim.py            -> timeline + checks
"""
import copy, math, sys
import w1_progression_sim as W
from w1_progression_sim import Sim, CONFIG_CURRENT, upg_cost, EARLY_REWARD_MULT, KILL_OVERHEAD_S, CANNON_PERIOD_S, CANNON_MULT, hit_rate

# ------------------------------------------------------------------ PROPOSED NUMBERS
AREA_MULT = {'L1': 1.0, 'L2': 1.35, 'L3': 1.8}                       # code: data.js areas[].mult
TASK_MULT = {'hand': 1.0, 'crawler': 1.1, 'banshee': 1.2, 'pup': 1.25, 'wolf': 1.4, 'dire': 1.5,
             'silk': 1.6, 'widow': 1.8, 'brood': 2.0}                # code: data.js contracts[].mult
XP_BASE = 10                                                          # proposed

def xp_per_kill(t):                                                   # proposed formula
    return round(XP_BASE * AREA_MULT[t['area']] * TASK_MULT[t['id']])

FULL_QUOTA = {t['id']: t['quota'] for t in W.CODE_TASKS}              # code: killQuota
FIRST_CLEAR_MULT = 1.0                                                # proposed: chunk = one full-size run

def first_clear_xp(t):
    return FIRST_CLEAR_MULT * FULL_QUOTA[t['id']] * xp_per_kill(t)

def nice(v):
    if v < 1000: return int(round(v / 10) * 10)
    if v < 10000: return int(round(v / 50) * 50)
    if v < 100000: return int(round(v / 500) * 500)
    return int(round(v / 5000) * 5000)

CURVE_PRE_SEP28 = dict(a=150, r1=1.66, split=14, r2=1.2)              # xp1 as shipped (toNext 150/250/410/...)
# Retune Sep 28 (faster SL4): hand-set SL1->2, 2->3, 3->4 = 100/120/180 (was 150/250/410); SL4+ unchanged
CURVE = dict(CURVE_PRE_SEP28, early=(100, 120, 180))
def xp_to_next(L, c=None):
    """Two-phase curve: x r1 per level up to SL(split-1), then x r2 per level (late XP/min is flat).
    c['early'] (optional) overrides the first len(early) levels with hand-set values."""
    c = c or CURVE
    if c.get('early') and L <= len(c['early']): return c['early'][L - 1]
    if L < c['split']: return nice(c['a'] * c['r1'] ** (L - 1))
    return nice(c['a'] * c['r1'] ** (c['split'] - 2) * c['r2'] ** (L - c['split'] + 1))

# Retune Sep 28 (faster SL4): Crawling Hand combat.hpMult 0.70 -> 0.40 (105 -> 60 HP; ~15.7 s -> ~9.3 s per kill at start)
TASK_HP_SEP28 = {'hand': 0.40}

GATES = {'tt1': 5, 'tt2': 9, 'tt3': 13}                               # proposed: markedPrey[].gateLevel
CAP_FRAC = 0.99                                                       # proposed
MAX_SL = 20
OFFLINE_XP_MULT = 0.5                                                 # proposed
OFFLINE_MAX_LEVELS = 1                                                # proposed: per applyIdle claim, XP <= one xp_to_next(current SL)

TARGETS = {  # SL: (label, lo_min, hi_min, source)  -- doc = iom-style-redesign 3.1, audit = w1 audit Fix I
    # (SL2-4 retargeted Sep 28; pre-retune bands were SL2 <=1.5, SL3 1.5-3, SL4 3-5, SL5 4-8 min)
    2: ('Smithing', 0, 0.75, 'Alex Sep 28 retune: distinct beat before SL3, first weapon buy <= 1 min'),
    3: ('Cannon', 0.5, 1.0, 'Alex Sep 28 retune: distinct beat between SL2 and SL4'),
    4: ('Hire Warrior', 1.0, 1.35, 'Alex Sep 28 retune: ~1/3 of the 3.5 min xp1 time (60-80 s)'),
    5: ('Legs armor (via Tier Test 1)', 3, 8, 'audit Fix I 4-8 (Alex Sep 28: may pull slightly earlier)'),
    6: ('Prayer', 8, 15, 'audit band'),
    7: ('Body armor + Crits', 12, 25, 'audit band'),
    8: ('Hire Archer', 15, 30, 'audit band'),
    9: ('Helm armor (via Tier Test 2)', 25, 40, 'audit band'),
    10: ('Prestige soft-open (doc)', 40, 60, 'audit Fix I'),
    13: ('Berserker + Mage (via Tier Test 3)', 55, 90, 'audit band'),
    20: ('Mazchna gate', 240, 480, 'audit Fix I 4-8 h (doc 6-12 h)'),
}

# ------------------------------------------------------------------ SIM
class XPSim(Sim):
    def __init__(self, cfg, curve=None, gates=None, dps_scale=1.0, early_xp=True, first_mult=None, hit_scale=1.0):
        super().__init__(cfg, hit_scale=hit_scale)
        self.curve = curve or CURVE; self.gates = GATES if gates is None else gates
        self.dps_scale = dps_scale; self.early_xp = early_xp
        self.first_mult = FIRST_CLEAR_MULT if first_mult is None else first_mult
        self.xp = 0.0; self.xp_log = []; self.capped_since = None; self.cap_minutes = 0.0
        self.xp_by_src = {'kills': 0.0, 'first': 0.0, 'lost_to_cap': 0.0}

    # --- code-accurate details that changed since the audit
    def crit_mult(self):
        if not self.up['unlock_crits']: return 1.0
        s = 0.04 * self.up['crit_power'] + (0.05 if 'sharp_eye' in self.prayers else 0)
        c = (s if s > 0 else 0.08) + W.ARMOR['helm'][1][self.up.get('armor_helm', 0)] + 0.05   # getBonuses + arena holding
        c = min(0.65, c); cd = 1.15 if 'sharp_eye' in self.prayers else 1.0
        return 1 + c * (2 * cd - 1)
    def bolt_dps(self): return super().bolt_dps() * self.dps_scale
    def mobs(self):   # monster-count.md
        helpers = sum(1 for u in ('hunter_briar', 'hunter_quill', 'hunter_moss', 'hunter_ember') if self.up[u])
        multi = any(self.up[u] for u in ('bolt_pierce', 'bolt_bounce', 'quill_multishot'))
        return max(1, min(3, 1 + helpers + (1 if multi else 0)))
    def task_dps(self, t):
        h = hit_rate(t['combat']) * self.hit_scale
        k = (self.mobs() - 1) / 2   # bounce / pierce only find a 2nd target when one is on screen
        multi = 1 + k * ((0.5 * W.BOUNCE_NEAR_P if self.up['bolt_bounce'] >= 1 else 0) + (0.25 * W.BOUNCE_NEAR_P if self.up['bolt_bounce'] >= 2 else 0)
                         + (0.6 * W.PIERCE_LINE_P if self.up['bolt_pierce'] >= 1 else 0) + (0.035 if self.up['bolt_pierce'] >= 2 else 0))
        d = self.bolt_dps() * min(0.97, h) * multi
        if self.up['unlock_specials']:
            period = CANNON_PERIOD_S / (1 + 0.12 * self.up['special_cadence'])
            d += self.chip() * self.dps_scale * CANNON_MULT / period
        return d + self.hunter_dps()

    # --- XP
    def gate_for(self, level):
        for b in self.cfg['bosses']:
            if self.gates.get(b['id']) == level and b['id'] not in self.boss_done: return b
        return None
    def add_xp(self, amt, src):
        if self.sl >= MAX_SL: return
        self.xp_by_src[src] += amt
        self.xp += amt
        while self.sl < MAX_SL:
            need = xp_to_next(self.sl, self.curve)
            g = self.gate_for(self.sl + 1)
            if g is not None:
                cap = math.floor(CAP_FRAC * need)
                if self.xp >= cap:
                    self.xp_by_src['lost_to_cap'] += self.xp - cap
                    self.xp = cap
                    if self.capped_since is None: self.capped_since = self.t; self.log('cap', f"XP full at SL{self.sl}: needs {g['name']}", new=False)
                return
            if self.xp < need: return
            self.xp -= need
            self.pending_bn = getattr(self, 'pending_bn', None) or f"XP ({self.target['name'] if self.target else '-'})"
            self.sl_up(f"XP ({src})", 'xp')
            self.shop_now = True      # the level-up toast sends the player to the shop (e.g. Cannon, Warrior)
    def quota(self, t):
        # Fix C (audit, required here): a task started inside the early window keeps its cut quota
        if self.cfg.get('fix_c', True) and getattr(self, 'cut_task', None) == t['id'] and t is self.target:
            q = t['quota']
            return max(W.EARLY_FLOOR, round(q * W.EARLY_QUOTA_MULT))
        return super().quota(t)
    def xp_kill(self, t):
        return xp_per_kill(t) * (EARLY_REWARD_MULT if (self.early_xp and self.early()) else 1)

    def complete(self, t):   # copy of base, with the XP chunk instead of +1 SL
        self.done[t['id']] = self.done.get(t['id'], 0) + 1
        self.total_completions += 1; self.area_completions[t['area']] += 1
        pm = self.pts_mult(t); bonus = t['fin'] * pm
        self.pts += bonus; self.add_meter(t['area'], bonus)
        self.gold += t['fin'] * 0.5 * (self.loot() + self.gold_luck_bonus()) * (1 + 0.05 * self.mastery(t['id']))
        if self.done[t['id']] == 1:
            self.log('first', f"first clear {t['name']} (+{first_clear_xp(t)*self.first_mult/FIRST_CLEAR_MULT if FIRST_CLEAR_MULT else 0:.0f} XP)")
            self.pending_bn = f"first clear {t['name']}"
            self.add_xp(self.first_mult * FULL_QUOTA[t['id']] * xp_per_kill(t), 'first')
            self.pending_bn = None
            lst = [x for x in self.cfg['tasks'] if x['area'] == t['area']]
            i = lst.index(t)
            if i + 1 < len(lst) and lst[i + 1]['id'] not in self.unlocked_tasks:
                self.unlocked_tasks.add(lst[i + 1]['id']); self.log('unlock', f"task {lst[i+1]['name']}")
        self.t += W.TASK_SWITCH_S

    def fight(self, b):
        was_capped = self.capped_since is not None
        if was_capped: self.cap_minutes += (self.t - self.capped_since) / 60
        self.capped_since = None
        super().fight(b)                      # guaranteed +1 SL via sl_up
        self.xp = min(self.xp, xp_to_next(self.sl, self.curve) - 1)   # never 2 levels from one win

    def pick_target(self):
        ts = self.tasks_avail()
        unc = [t for t in ts if self.done.get(t['id'], 0) == 0]
        if unc: return min(unc, key=lambda t: self.quota(t) * self.kill_time(t))
        for area in W.AREA_ORDER:
            b = self.current_boss(area) if area in self.areas else None
            if b and self.boss_gate_ok(b) and self.meter[area] < b['cost']:
                cand = [t for t in ts if t['area'] == area]
                return max(cand, key=lambda t: (t['ppk'] + t['fin'] / self.quota(t)) / self.kill_time(t))
        return max(ts, key=lambda t: self.xp_kill(t) / self.kill_time(t))

    def run(self, max_hours=12, stop_sl=MAX_SL):
        self.shop(); last_shop = 0.0
        while self.t < max_hours * 3600 and self.sl < stop_sl:
            b = self.ready_boss()     # code keeps task progress per target, so a Tier Test can be fought mid-task
            if b:
                self.fight(b); self.shop(); last_shop = self.t; continue
            if self.target is None:
                self.target = self.pick_target()
                self.cut_task = self.target['id'] if self.early() else None
            t = self.target
            self.t += self.kill_time(t)
            pm = self.pts_mult(t); e = EARLY_REWARD_MULT if self.early() else 1
            self.gold += self.gold_per_kill(t)
            p = t['ppk'] * pm * e; self.pts += p; self.add_meter(t['area'], p)
            self.add_xp(self.xp_kill(t), 'kills')
            self.progress = getattr(self, 'progress', 0) + 1
            if self.progress >= self.quota(t):
                self.progress = 0; self.complete(t); self.target = None; self.cut_task = None
            if not getattr(self, 'shop_now', False):   # a pending new-system unlock is bought the moment it is affordable
                for uid in W.PRIORITY + self.cfg.get('extra_priority', []):
                    if uid in self.cfg['upgrades'] and self.avail(uid) and self.gold >= upg_cost(self.cfg, uid, self.up[uid]):
                        self.shop_now = True; break
            if self.target is None or self.t - last_shop >= W.SHOP_EVERY_S or getattr(self, 'shop_now', False):
                self.shop(); last_shop = self.t; self.shop_now = False
            self.snapshot_minutes()
            if self.next_minute and (not self.xp_log or self.xp_log[-1][0] != self.next_minute - 1):
                self.xp_log.append((self.next_minute - 1, self.sl, round(self.xp), round(self.xp_kill(t) * 60 / self.kill_time(t))))
        return self

def current_cfg(retune=True):
    """Live code (xp1). retune=True applies the Sep 28 task-HP change (pair it with CURVE; pre = CURVE_PRE_SEP28)."""
    c = copy.deepcopy(CONFIG_CURRENT)
    if retune:
        for t in c['tasks']:
            if t['id'] in TASK_HP_SEP28: t['combat']['hpMult'] = TASK_HP_SEP28[t['id']]
    c['armor'] = True          # armor is live in code now (state.js armorList, SL5/7/9)
    c['extra_priority'] = ['armor_legs', 'armor_body', 'armor_helm']
    for s in ('legs', 'body', 'helm'):
        c['upgrades']['armor_' + s] = ('gold', 0, 1, 8, False, {'legs': 5, 'body': 7, 'helm': 9}[s], None)
    return c

# ------------------------------------------------------------------ OFFLINE CHECK (code killRatePerMin + food)
def offline_xp(sim, minutes=360):
    """XP from one capped absence at the sim's current state, following applyIdle (not holding)."""
    t = sim.target or sim.pick_target()
    u = sim.up
    P = sim.P()
    hunters = {'hunter_briar': 1.0, 'hunter_quill': 0.85, 'hunter_moss': 1.15, 'hunter_ember': 1.4}   # code: hunters[].idle
    hp = 1 + 0.3 * u['hunter_power']
    labor = 0.75 + sum(v for k, v in hunters.items() if u[k]) * hp
    rate = 2.5 * P * labor * AREA_MULT[t['area']] * TASK_MULT[t['id']] * sim.K()   # killRatePerMin
    food_pk = {'hand': .35, 'crawler': .45, 'banshee': .5, 'pup': .6, 'wolf': .7, 'dire': .75, 'silk': .8, 'widow': .9, 'brood': 1.0}[t['id']]
    kills_food = (100 + 1.2 * minutes) / food_pk      # full stock + regen (no food upgrades)
    kills = min(rate * minutes, kills_food)
    if not u['auto_accept']: kills = min(kills, sim.quota(t))     # applyIdle stops at task end without Auto-Accept
    xp = kills * xp_per_kill(t) * OFFLINE_XP_MULT * (EARLY_REWARD_MULT if sim.early() else 1)
    import copy as _c
    raw = xp
    if OFFLINE_MAX_LEVELS: xp = min(xp, OFFLINE_MAX_LEVELS * xp_to_next(sim.sl, sim.curve))
    s2 = _c.deepcopy(sim); sl0 = s2.sl; s2.add_xp(xp, 'kills')
    return dict(raw=raw, sl_after=s2.sl, capped=s2.capped_since is not None, task=t['name'], rate=rate, kills=kills, food_bound=kills_food < rate * minutes, xp=xp,
                need=xp_to_next(sim.sl, sim.curve), active_xpm=sim.xp_kill(t) * 60 / sim.kill_time(t))

def timeline(sim):
    rows = []
    for r in sim.sl_rows:
        rows.append((r['sl'], r['t'] / 60, r['why'], r['bottleneck']))
    return rows

def vs(sl, m):
    if sl not in TARGETS: return '-'
    lab, lo, hi, src = TARGETS[sl]
    if m < lo: return f"early by {lo-m:.1f} min"
    if m > hi: return f"late by {m-hi:.1f} min"
    return 'on target'

if __name__ == '__main__':
    s = XPSim(current_cfg()).run()
    print('curve', [xp_to_next(L) for L in range(1, 20)], 'total', sum(xp_to_next(L) for L in range(1, 20)))
    for sl, m, why, bn in timeline(s):
        print(f"SL{sl:>2} {m:7.1f} min  {why:45} {bn:40} {vs(sl, m)}")
    print('fights', [(n, round(t / 60, 1), round(k)) for n, t, k in s.fight_log])
    print('xp sources', {k: round(v) for k, v in s.xp_by_src.items()}, 'cap min', round(s.cap_minutes, 1))
    print('dead zones', [(round(a / 60), round((b - a) / 60)) for a, b in W.dead_zones(s)])
