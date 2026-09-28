from w1_proposed import *
import json
ORDER = ['pup','wolf','tt_pack','dire','tt2','silk','widow','tt_matr','brood','tt3','g1','g2','g3','g4']   # SL6..SL19
TARGET = [10,17,27,40,60,80,100,125,150,180,215,255,300,350]
BIDS = ['tt1','tt_pack','tt2','tt_matr','tt3','g1','g2','g3','g4']
base_hp = {t['id']: t['combat']['hpMult'] for t in CODE_TASKS}
p = dict(task_hp={k: base_hp[k] for k in ['pup','wolf','dire','silk','widow','brood']},
         meters=[120, 250, 400, 700, 1000, 1500, 2200, 3000, 4000],
         hp=[4.0, 7, 10, 14, 18, 24, 30, 38, 48], gate_sp=10**9)
def times(s):
    return {r['sl']: r['t']/60 for r in s.sl_rows}
for it in range(40):
    s = Sim(build(p)).run(max_hours=14, stop_sl=19)
    tm = times(s)
    prev = 5.5 if 5 not in tm else tm[5]
    fl = {n: k for n, t, k in s.fight_log}
    for i, key in enumerate(ORDER):
        sl = 6 + i
        t_prev = tm.get(sl-1, None); t_now = tm.get(sl, None)
        tgt_gap = TARGET[i] - (TARGET[i-1] if i else 5)
        if t_prev is None: break
        gap = (t_now - t_prev) if t_now is not None else 14*60 - t_prev
        r = max(0.5, min(2.0, (tgt_gap / max(0.3, gap)) ** 0.6))
        if key in p['task_hp']:
            p['task_hp'][key] *= r
        else:
            bi = BIDS.index(key)
            p['meters'][bi] *= r
    # boss HP: aim TTK at fill ~ 100 s  (player must upgrade a little, then fights at <= 90 s)
    for bi, bid in enumerate(BIDS):
        if bi == 0: continue
        b = next(b for b in s.cfg['bosses'] if b['id'] == bid)
        if '_full_t' in b:
            pass
    if it % 5 == 4:
        print(it, [(sl, round(tm.get(sl, -1))) for sl in range(5, 20)])
json.dump(p, open('tuned.json', 'w'), indent=1)
print(json.dumps(p))
print([(n, round(k)) for n, t, k in s.fight_log])
