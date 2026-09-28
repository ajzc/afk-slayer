from w1_proposed import *
import json, sys, itertools
base = json.loads(sys.argv[1])
for hs, ms in itertools.product([1.0, 1.4, 1.8], [1.0, 1.5]):
    p = json.loads(json.dumps(base))
    p['hp'] = p['hp'][:5] + [h*hs for h in p['hp'][5:]]
    p['meters'] = p['meters'][:5] + [m*ms for m in p['meters'][5:]]
    p['gate_sp'] = p['gate_sp']*ms
    s = Sim(build(p)).run(max_hours=12)
    tm = {r['sl']: round(r['t']/60) for r in s.sl_rows}
    d = dead_zones(s)
    print(hs, ms, {k: tm.get(k) for k in (10,15,16,17,18,19,20)}, 'prest', [(round(t/60), sl) for t, sl, g in getattr(s, 'prestige_log', [])],
          'dead', [(round(a/60), round((b-a)/60)) for a, b in d])
