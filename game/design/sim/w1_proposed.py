"""Proposed-fix config for the W1 progression sim. All numbers here are PROPOSED unless noted."""
import copy
from w1_progression_sim import *

GEAR_SL = {'gear_steel': 5, 'gear_mithril': 8, 'gear_adamant': 11, 'gear_rune': 14, 'gear_dragon': 17}

FINAL = {"task_hp": {"pup": 1.0, "wolf": 1.4, "dire": 2.2, "silk": 2.4, "widow": 3.2, "brood": 4.0},
         "meters": [120, 400, 900, 1400, 2400, 5000, 9000, 14000, 20000],
         "hp": [4, 9, 16, 20, 28, 80, 140, 220, 330], "gate_sp": 50000,
         "prestige": {"min_sl": 10, "blocked_min": 5, "gap_sl": 3, "points_offset": 9},
         "up_over": {"weapon_pct_1": ["gold", 400, 1, 16, True, 7, None],
                     "weapon_pct_2": ["gold", 5000, 1, 16, True, 11, None],
                     "weapon_pct_3": ["gold", 40000, 1, 16, True, 14, None]}}

def build(p=None):
    p = FINAL if p is None else p
    tasks = copy.deepcopy(CODE_TASKS)
    q = p.get('quotas', {'pup': 40, 'wolf': 50, 'dire': 60, 'silk': 60, 'widow': 70, 'brood': 80})
    hs = p.get('task_hp', {})
    for t in tasks:
        if t['id'] in q: t['quota'] = q[t['id']]
        if t['id'] in hs: t['combat']['hpMult'] = hs[t['id']]; t.pop('hpNoPierce', None)
    M = p.get('meters', [120, 250, 400, 700, 1000, 1500, 2200, 3000, 4000])
    H = p.get('hp', [4.0, 7.0, 10.0, 14.0, 18.0, 24.0, 30.0, 38.0, 48.0])
    R = p.get('rewards', [(100,200),(150,400),(250,500),(300,800),(500,1200),(600,2000),(800,3000),(1000,4500),(1200,6000)])
    bosses = [
        dict(B('tt1','Crawling Hand Champion','L1',M[0],H[0],*R[0],'rat_tooth','L2',0.65,2,1.30)),
        dict(B('tt_pack','Ashfang Packleader (new)','L2',M[1],H[1],*R[1],None,None,1.1,0,1.1), after='wolf'),
        dict(B('tt2','Ashfang Alpha','L2',M[2],H[2],*R[2],'fog_lens','L3',1.15,-2,1.10), after='dire'),
        dict(B('tt_matr','Webfen Matriarch (new)','L3',M[3],H[3],*R[3],None,None,1.1,-2,1.1), after='widow'),
        dict(B('tt3','Nightweave','L3',M[4],H[4],*R[4],'bone_seal',None,1.05,0,1.15), after='brood'),
        dict(B('g1','Gauntlet I: Crawling Hand Champion (rematch)','L3',M[5],H[5],*R[5],None,None,0.65,2,1.3), after='tt3'),
        dict(B('g2','Gauntlet II: Ashfang Alpha (rematch)','L3',M[6],H[6],*R[6],None,None,1.15,-2,1.1), after='g1'),
        dict(B('g3','Gauntlet III: Nightweave (rematch)','L3',M[7],H[7],*R[7],None,None,1.05,0,1.15), after='g2'),
        dict(B('g4','Gauntlet IV: Screaming Banshee','L3',M[8],H[8],*R[8],None,None,1.2,-2,1.0), after='g3'),
    ]
    ups = copy.deepcopy(CODE_UPGRADES)
    ups['armor_legs'] = ('gold', 0, 1, 8, False, 5, None)
    ups['armor_body'] = ('gold', 0, 1, 8, False, 7, None)
    ups['armor_helm'] = ('gold', 0, 1, 8, False, 9, None)
    ups['hunter_moss'] = ('gold', 2000, 1, 1, False, 13, 'hunter_briar')
    ups['hunter_ember'] = ('gold', p.get('ember_cost', 4200), 1, 1, False, p.get('ember_sl', 16), 'hunter_briar')
    # redesign §3.4/§3.5 ladders that are not in code yet (proposed bases)
    ups['weapon_pct_1']    = ('gold', 150, 1, 16, True, 7, None)     # +10% weapon dmg /lv
    ups['weapon_pct_2']    = ('gold', 1500, 1, 16, True, 11, None)   # +15% /lv
    ups['weapon_pct_3']    = ('gold', 12000, 1, 16, True, 14, None)  # +20% /lv
    ups['attack_speed']    = ('gold', 2500, 1, 16, True, 12, None)   # +2% bolt rate /lv
    ups['special_damage']  = ('gold', 800, 1, 16, True, 11, 'unlock_specials')   # +20% Cannon /lv (tasks only)
    ups['cannon_recharge'] = ('gold', 6000, 1, 16, True, 16, 'unlock_specials')  # +1% recharge /lv
    for k, v in p.get('up_over', {}).items(): ups[k] = tuple(v)
    sl_unlocks = {1:'Hunt, Bronze, Idle Power, Iron', 2:'Smithing (Tempered Edge)', 3:'Cannon',
        4:'Hire Warrior', 5:'Chain Cannon + Legs armor slot', 6:'Prayer board', 7:'Crits + Body armor slot',
        8:'Hire Archer', 9:'Helm armor slot + Easy Assignments prayer', 10:'First prestige soft-open',
        11:'Special damage ladder', 12:'Challenges-lite', 13:'Hire Berserker', 14:'Smithing cap bump',
        15:'Task Cards-lite', 16:'Hire Mage + Cannon recharge ladder', 17:'Restful Sleep prayer',
        18:'Helper food bump', 19:'World-2 prep (Mazchna gate visible)', 20:'Mazchna gate / World-2 marker'}
    cfg = dict(name='proposed', tasks=tasks, bosses=bosses, upgrades=ups, sl_unlocks=sl_unlocks,
        early_cut=True, crit_fix=True, armor=True, chain_cannon=True,
        helper_additive=p.get('helper_additive', True),
        extra_prayers=['easy_assignments', 'restful_sleep'],
        prestige=p.get('prestige', dict(min_sl=10, blocked_min=8, gap_sl=3, points_offset=5)),
        gate=dict(at_sl=20, sp=p.get('gate_sp', 8000), gold=p.get('gate_gold', 0)),
        extra_priority=['armor_legs', 'armor_body', 'armor_helm'] if p.get('armor_priority', True) else [])
    for uid, sl in p.get('gear_sl', GEAR_SL).items():
        spec = list(cfg['upgrades'][uid]); spec[5] = sl; cfg['upgrades'][uid] = tuple(spec)
    return cfg

def summarize(s):
    return [(r['sl'], round(r['t']/60, 1), r['source']) for r in s.sl_rows]

if __name__ == '__main__':
    s = Sim(build()).run(max_hours=16)
    for r in summarize(s): print(r)
    print('fights', [(n, fmt_t(t), round(k)) for n, t, k in s.fight_log])
    print('dead zones (new):', [(fmt_t(a), fmt_t(b), round((b-a)/60)) for a, b in dead_zones(s)])
    print(s.up)
