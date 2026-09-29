import sys, json, slayer_xp_sim as X
def go(c, g=None, **kw):
    s = X.XPSim(X.current_cfg(), curve=c, gates=g, **kw).run()
    tm = {r['sl']: r['t']/60 for r in s.sl_rows}
    return s, tm
if __name__ == '__main__':
    c = json.loads(sys.argv[1])
    s, tm = go(c)
    print([X.xp_to_next(L, c) for L in range(1, 20)])
    print(' '.join(f"{k}:{v:.1f}" for k, v in tm.items()))
    print('fights', [(n[:12], round(t/60,1), round(k)) for n,t,k in s.fight_log], 'cap', round(s.cap_minutes,1))
    print('offtarget', {k: X.vs(k, v) for k, v in tm.items() if X.vs(k, v) not in ('on target', '-')})
