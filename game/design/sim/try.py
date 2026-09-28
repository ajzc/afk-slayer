from w1_proposed import *
import json, sys
def show(p, hrs=12, detail=False):
    s = Sim(build(p)).run(max_hours=hrs)
    for r in s.sl_rows: print(f"SL{r['sl']:<2} {r['t']/60:6.1f}m  {r['why'][:60]:60} | {r['bottleneck'][:55]:55} | bolt {r['bolt_dps']:.0f}")
    print('dead(new>=10m):', [(round(a/60), round((b-a)/60)) for a, b in dead_zones(s)])
    return s
if __name__ == '__main__':
    p = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    show(p)
