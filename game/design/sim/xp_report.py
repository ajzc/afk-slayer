"""All numbers for design/slayer-xp.md.  python3 xp_report.py > xp_report_out.txt
Everything below the Retune section uses the Sep 28 retune (CURVE early 100/120/180, Crawling Hand hpMult 0.40)."""
import copy, slayer_xp_sim as X, w1_progression_sim as W

def tm(s): return {r['sl']: r['t'] / 60 for r in s.sl_rows}

def pre():   # xp1 as live in js/ on 2026-09-28 (before the retune)
    return X.XPSim(X.current_cfg(retune=False), curve=X.CURVE_PRE_SEP28)

class IntroGold(X.XPSim):
    """Bracket: intro.js 'Finish a Crawling Hand Task' onComplete tops gold up to 200 (the sim ignores intro top-ups otherwise)."""
    def complete(self, t):
        first = t['id'] == 'hand' and self.done.get('hand', 0) == 0
        super().complete(t)
        if first: self.gold = max(self.gold, 200)

def early_rows(s, upto_min=6):
    out = []
    for e in s.events:
        if e[0] > upto_min * 60: break
        if e[2] in ('SL', 'first', 'meter') or (e[2] == 'buy' and 'lv1 ' in e[3]):
            out.append(f"  {e[0]:6.1f}s  SL{e[1]:<2} {e[2]:5} {e[3]}")
    return out

print('== RETUNE SEP 28: faster SL4 (pre = xp1 live code, post = proposed)')
sp = pre(); hand = [t for t in sp.cfg['tasks'] if t['id'] == 'hand'][0]; crawler = [t for t in sp.cfg['tasks'] if t['id'] == 'crawler'][0]
sq = X.XPSim(X.current_cfg()); hand2 = [t for t in sq.cfg['tasks'] if t['id'] == 'hand'][0]
print(f"Crawling Hand at start: HP {sp.task_hp(hand)} -> {sq.task_hp(hand2)}, kill time {sp.kill_time(hand):.1f}s -> {sq.kill_time(hand2):.1f}s (bolt DPS {sp.bolt_dps():.2f}, hit {W.hit_rate(hand['combat']):.3f})")
print('toNext SL1-4 pre', [X.xp_to_next(L, X.CURVE_PRE_SEP28) for L in range(1, 5)], 'post', [X.xp_to_next(L) for L in range(1, 5)])
sp.run(); sq.run()
Tp, Tq = {r['sl']: r['t'] / 60 for r in sp.sl_rows}, {r['sl']: r['t'] / 60 for r in sq.sl_rows}
print('SL | pre min | post min | post source')
for r in sq.sl_rows:
    if r['sl'] <= 13 or r['sl'] == 20:
        print(f"SL{r['sl']:>2} | {Tp[r['sl']]:6.2f} | {Tq[r['sl']]:6.2f} | {r['why'][:46]:46} | {X.vs(r['sl'], Tq[r['sl']])}")
print('fights pre ', [(n, round(t / 60, 2), round(k)) for n, t, k in sp.fight_log])
print('fights post', [(n, round(t / 60, 2), round(k)) for n, t, k in sq.fight_log])
print('first early events PRE:'); print('\n'.join(early_rows(sp, 4)))
print('first early events POST:'); print('\n'.join(early_rows(sq, 4)))
ig = IntroGold(X.current_cfg()).run(stop_sl=6)
print('post + intro gold top-up (200 after Hand clear):', {r['sl']: round(r['t'] / 60, 2) for r in ig.sl_rows},
      'Warrior bought', [round(e[0]) for e in ig.events if e[2] == 'buy' and e[3].startswith('hunter_briar')])
for d in (0.7, 1.5):
    a = X.XPSim(X.current_cfg(retune=False), curve=X.CURVE_PRE_SEP28, dps_scale=d).run(stop_sl=10)
    b = X.XPSim(X.current_cfg(), dps_scale=d).run(stop_sl=10)
    print(f"DPS x{d}: pre", {k: round(v, 2) for k, v in tm(a).items()}, '| post', {k: round(v, 2) for k, v in tm(b).items()})
alt = dict(X.CURVE, early=(100, 120, 180, 690, 1400))
v = X.XPSim(X.current_cfg(), curve=alt).run(stop_sl=14)
print('optional hold-the-bands variant (also SL5->6 1150 -> 1400):', {k: round(v2, 2) for k, v2 in tm(v).items()})
print('dead zones post', [(round(a / 60), round((b - a) / 60)) for a, b in W.dead_zones(sq)], 'pre', [(round(a / 60), round((b - a) / 60)) for a, b in W.dead_zones(sp)])
print()

def run(**kw):
    return X.XPSim(X.current_cfg(), **kw).run()

def tm(s): return {r['sl']: r['t'] / 60 for r in s.sl_rows}

print('== per-kill XP / first clear / early task XP')
for t in W.CODE_TASKS:
    k = X.xp_per_kill(t); q = t['quota']; qc = max(2, round(q * 0.2))
    print(f"{t['name']:14} xp/kill {k:3}  full task {q*k:6}  cut task (x5) {qc*k*5 if t['area']=='L1' else '-':>6}  first-clear chunk {X.first_clear_xp(t):6.0f}")

print('\n== curve')
tot = 0
for L in range(1, 20):
    n = X.xp_to_next(L); tot += n
    print(f"SL{L}->{L+1}: {n:7}   cumulative to SL{L+1}: {tot}")

s = run()
T = tm(s)
print('\n== timeline (1.0x)')
for r in s.sl_rows:
    m = r['t'] / 60
    print(f"SL{r['sl']:>2} {m:6.1f}  {r['why'][:44]:44} | {r['bottleneck'][:38]:38} | {X.vs(r['sl'], m)}")
print('fights', [(n, round(t / 60, 1), round(k)) for n, t, k in s.fight_log])
print('xp src', {k: round(v) for k, v in s.xp_by_src.items()}, 'minutes at cap', round(s.cap_minutes, 1))
print('dead zones', [(round(a / 60), round((b - a) / 60)) for a, b in W.dead_zones(s)])
print('buy firsts', [(round(e[0] / 60, 1), e[3].split(' ')[0]) for e in s.events if e[2] == 'buy' and 'lv1 ' in e[3]][:30])
print('xp/min samples', [(m, sl, xpm) for m, sl, xp, xpm in s.xp_log if m in (1, 3, 5, 10, 20, 30, 45, 60, 90, 120, 180, 240, 300)])

print('\n== sensitivity (weapon DPS x, per benchmarks-not-timers.md)')
for d in (0.7, 1.5):
    ss = run(dps_scale=d); tt = tm(ss)
    print(d, {k: round(v, 1) for k, v in tt.items()}, 'cap min', round(ss.cap_minutes, 1), 'fights', [(n[:10], round(t / 60, 1), round(k)) for n, t, k in ss.fight_log])

print('\n== no x5 XP in early window')
ss = run(early_xp=False); tt = tm(ss); print({k: round(v, 1) for k, v in tt.items() if k <= 6})

print('\n== no Fix C (quota snaps back when Warrior is hired mid-task)')
c = X.current_cfg(); c['fix_c'] = False
ss = X.XPSim(c).run(); tt = tm(ss); print({k: round(v, 1) for k, v in tt.items() if k <= 7})

print('\n== alt: first clears as guaranteed level-ups (no chunk)')
class Alt(X.XPSim):
    def complete(self, t):
        first = self.done.get(t['id'], 0) == 0
        old = self.first_mult; self.first_mult = 0
        super().complete(t); self.first_mult = old
        if first and self.sl < X.MAX_SL:
            self.sl_up(f"first clear {t['name']} (guaranteed)", 'task'); self.xp = min(self.xp, X.xp_to_next(self.sl) - 1)
ss = Alt(X.current_cfg()).run(); tt = tm(ss); print({k: round(v, 1) for k, v in tt.items()})

print('\n== offline: one 360-min absence at 50% XP (code killRatePerMin + food), at each SL reached')
for sl in (3, 4, 5, 6, 8, 9, 12, 13, 16, 19):
    ss = X.XPSim(X.current_cfg()).run(stop_sl=sl)
    o = X.offline_xp(ss)
    print(f"at SL{sl} ({ss.t/60:.0f} min): {o['task']:14} kills {o['kills']:5.0f} food-bound {o['food_bound']} raw XP {o['raw']:6.0f} (= {o['raw']/max(1,o['active_xpm']):.0f} active min, {o['raw']/o['need']:.2f} of level) -> after 1-level cap {o['xp']:6.0f} -> SL{o['sl_after']} capped-by-test {o['capped']}")
