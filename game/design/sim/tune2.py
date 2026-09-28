from w1_proposed import *
import json, math
STEPS = [('pup',6),('wolf',7),('tt_pack',8),('dire',9),('tt2',10),('silk',11),('widow',12),('tt_matr',13),('brood',14),('tt3',15),
         ('g1',16),('g2',17),('g3',18),('g4',19),('gate',20)]
TARGET = {6:10,7:18,8:28,9:40,10:55,11:70,12:85,13:100,14:118,15:140,16:180,17:225,18:270,19:315,20:360}
TTK_READY = {'tt_pack':80,'tt2':100,'tt_matr':80,'tt3':100,'g1':220,'g2':100,'g3':100,'g4':110}
BIDS = ['tt1','tt_pack','tt2','tt_matr','tt3','g1','g2','g3','g4']
p = dict(task_hp={'pup':0.7,'wolf':1.5,'dire':1.8,'silk':1.6,'widow':2.4,'brood':2.8},
         meters=[120,400,700,1200,1800,2000,3000,4500,6500], hp=[4,8,12,16,22,30,42,58,80], gate_sp=20000)
def sim(p, stop):
    s = Sim(build(p)).run(max_hours=14, stop_sl=stop)
    return s
def tsl(s, sl):
    for r in s.sl_rows:
        if r['sl'] == sl: return r['t']/60
    return 14*60
def getk(p, key):
    if key in p['task_hp']: return p['task_hp'][key]
    if key == 'gate': return p['gate_sp']
    return p['meters'][BIDS.index(key)]
def setk(p, key, v):
    if key in p['task_hp']: p['task_hp'][key] = v
    elif key == 'gate': p['gate_sp'] = v
    else: p['meters'][BIDS.index(key)] = v
for key, sl in STEPS:
    for rep in range(3):
        # HP for tests: TTK at ready
        if key in TTK_READY:
            for _ in range(4):
                s = sim(p, sl)
                b = next(b for b in s.cfg['bosses'] if b['id'] == key)
                if '_ttk_at_ready' not in b: break
                bi = BIDS.index(key)
                p['hp'][bi] *= TTK_READY[key] / b['_ttk_at_ready']
        # bisection on knob (log space) for time target
        lo, hi = getk(p, key) / 8, getk(p, key) * 8
        for _ in range(14):
            mid = math.sqrt(lo*hi); setk(p, key, mid)
            t = tsl(sim(p, sl), sl)
            if t < TARGET[sl]: lo = mid
            else: hi = mid
        setk(p, key, math.sqrt(lo*hi))
    s = sim(p, sl)
    print(key, sl, round(getk(p, key), 2), 'time', round(tsl(s, sl), 1), 'target', TARGET[sl],
          'hp' if key in TTK_READY else '', round(p['hp'][BIDS.index(key)], 1) if key in TTK_READY else '')
json.dump(p, open('tuned.json', 'w'), indent=1)
print(json.dumps(p))
