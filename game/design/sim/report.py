"""Builds the tables used in design/w1-progression-audit.md and per-minute CSVs."""
import copy, csv, sys
from w1_progression_sim import *
import w1_proposed as WP

DOC_TARGET = {2: 'first buy <= 1 min', 3: 'Cannon ~5 min', 4: 'Warrior ~10 min', 5: 'first Tier Test 20-40 min',
              10: 'first prestige 2-4 h (proposed)', 20: 'World-2 marker 6-12 h (proposed)'}
PROP_BAND = {2:(0,2),3:(1,5),4:(2,6),5:(3,8),6:(6,15),7:(12,25),8:(15,30),9:(25,40),10:(35,60),11:(40,70),12:(50,80),
             13:(55,90),14:(60,100),15:(75,120),16:(100,170),17:(130,200),18:(160,240),19:(200,300),20:(240,360)}

def md_time(m): return f"{m:.1f}" if m < 90 else f"{m:.0f} ({m/60:.1f} h)"

def vs_target(sl, m, first_tt, cfgname):
    if sl == 5 and cfgname == 'current': pass
    t = DOC_TARGET.get(sl, '')
    rng = {2: (0, 1), 3: (3, 7), 4: (7, 13), 5: (20, 40), 10: (120, 240), 20: (360, 720)}.get(sl)
    if rng:
        if m < rng[0]: return f"{t}: EARLY by {rng[0]-m:.0f} min"
        if m > rng[1]: return f"{t}: LATE by {m-rng[1]:.0f} min"
        return f"{t}: on target"
    return '-'

def run(cfg, hrs=12, hs=1.0):
    return Sim(cfg, hit_scale=hs).run(max_hours=hrs)

def table(s, cfgname):
    rows = []
    for r in s.sl_rows:
        m = r['t']/60
        un = s.cfg['sl_unlocks'].get(r['sl'], '(nothing new unlocks at this SL)')
        aff = ', '.join(r['afford'][:4]) or 'nothing affordable (saving)'
        rows.append(f"| {r['sl']} | {md_time(m)} | {r['why']} | {un} | {aff} | {r['bottleneck']} | {vs_target(r['sl'], m, None, cfgname)} |")
    return '\n'.join(rows)

def buy_order(s, n=40):
    out = []
    for e in s.events:
        if e[2] == 'buy' and ('lv1 ' in e[3]) or e[2] == 'prayer':
            out.append(f"{e[0]/60:.1f}m {e[3].split(' (')[0].replace(' -> lv1','')}")
    return out[:n]

def minutes_csv(s, path):
    with open(path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(s.minute_rows[0].keys())); w.writeheader(); w.writerows(s.minute_rows)

if __name__ == '__main__':
    cur = run(copy.deepcopy(CONFIG_CURRENT))
    pro = run(WP.build())
    minutes_csv(cur, '../w1-progression-minutes-current.csv')
    minutes_csv(pro, '../w1-progression-minutes-proposed.csv')
    print('## CURRENT'); print(table(cur, 'current'))
    print('fights', [(n, round(t/60, 1), round(k)) for n, t, k in cur.fight_log])
    print('dead new', [(round(a/60), round(b/60), round((b-a)/60)) for a, b in dead_zones(cur)])
    print('dead anybuy', [(round(a/60), round(b/60), round((b-a)/60)) for a, b in dead_zones(cur, new_only=False)][:6])
    print('buy order', buy_order(cur))
    print('\n## PROPOSED'); print(table(pro, 'proposed'))
    print('fights', [(n, round(t/60, 1), round(k)) for n, t, k in pro.fight_log])
    print('prestige', getattr(pro, 'prestige_log', []))
    print('dead new', [(round(a/60), round(b/60), round((b-a)/60)) for a, b in dead_zones(pro)])
    print('buy order', buy_order(pro, 60))
    for hs in (0.73, 1.25):
        for nm, c in (('current', copy.deepcopy(CONFIG_CURRENT)), ('proposed', WP.build())):
            s = run(c, hs=hs); tm = {r['sl']: round(r['t']/60) for r in s.sl_rows}
            print('sens', nm, hs, tm, 'dead', len(dead_zones(s)))
