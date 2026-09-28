/** Game state, save/load, offline & tick formulas */
(function () {
  const D = () => window.CB_DATA;

  function defaultState() {
    const areas = {};
    D().areas.forEach(a => { areas[a.id] = { unlocked: !!a.unlock }; });
    const hunters = {};
    D().hunters.forEach(h => { hunters[h.id] = { unlocked: !!h.unlock }; });
    const upgrades = {};
    D().upgrades.forEach(u => { upgrades[u.id] = 0; });
    const prey = {};
    D().markedPrey.forEach(p => {
      prey[p.id] = { chip: 0, finished: false };
    });
    const bestiary = {};
    D().contracts.forEach(c => {
      bestiary[c.id] = { kills: 0, completions: 0, unlocked: false, mastery: 0 };
    });
    const sigils = {};
    D().sigilShop.forEach(s => { sigils[s.id] = 0; });

    // Starter gear owned
    upgrades.gear_bronze = 1;

    const state = {
      version: 3,
      gold: 50,
      scraps: 0,
      points: 0,
      food: 80,
      foodCap: 100,
      guildXp: 0,
      sigilCurrency: 0,
      prestigeCount: 0,
      prestigeMod: null,
      lastTickAt: Date.now(),
      playMs: 0,
      currentContractId: null,
      contractProgress: 0,
      autoAccept: false,
      features: { crits: false, specials: false, beamTier: 0 },
      hints: { boltAim: false },
      areas,
      hunters,
      upgrades,
      prey,
      relics: {},
      bestiary,
      sigils,
      mats: {},
      totalKills: 0,
      totalContracts: 0,
      stats: { offlineClaims: 0 },
      chests: {
        permanentCharge: 0,
        boostCharge: 0,
        permanentReady: false,
        boostReady: false,
        permanentBonuses: {
          idlePower: 0,
          lootLuck: 0,
          critChance: 0,
          offlineCapMin: 0,
          foodEff: 0,
          chestSpeed: 0,
        },
        permanentClaims: 0,
        boostClaims: 0,
        lastPermanent: null,
        lastBoost: null,
        activeBoost: null,
      },
      intro: {
        completed: false,
        index: 0,
        seen: true,
        objectiveMet: false,
        stats: {},
      },
      settings: {
        masterVol: 100,
        sfxVol: 0,
        musicVol: 100,
        muted: false,
        reduceMotion: false,
      },
    };
    seedContractUnlocks(state);
    if (window.CB_INTRO && window.CB_INTRO.ensure) window.CB_INTRO.ensure(state);
    return state;
  }

  function load() {
    try {
      const raw = localStorage.getItem(D().SAVE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      // Merge carefully
      const s = Object.assign(base, parsed);
      s.areas = Object.assign(base.areas, parsed.areas || {});
      s.hunters = Object.assign(base.hunters, parsed.hunters || {});
      s.upgrades = Object.assign(base.upgrades, parsed.upgrades || {});
      s.prey = Object.assign(base.prey, parsed.prey || {});
      s.relics = Object.assign({}, parsed.relics || {});
      s.bestiary = Object.assign(base.bestiary, parsed.bestiary || {});
      s.sigils = Object.assign(base.sigils, parsed.sigils || {});
      s.mats = Object.assign({}, base.mats || {}, parsed.mats || {});
      s.stats = Object.assign(base.stats, parsed.stats || {});
      s.chests = Object.assign(base.chests, parsed.chests || {});
      s.chests.permanentBonuses = Object.assign(
        base.chests.permanentBonuses,
        (parsed.chests && parsed.chests.permanentBonuses) || {}
      );
      // playMs migrate
      if (typeof parsed.playMs === 'number' && parsed.playMs >= 0) s.playMs = parsed.playMs;
      else s.playMs = 0;
      // features migrate
      s.features = Object.assign({ crits: false, specials: false, beamTier: 0 }, parsed.features || {});
      // Settings migrate
      s.settings = Object.assign({
        masterVol: 100, sfxVol: 0, musicVol: 100, muted: false, reduceMotion: false,
      }, parsed.settings || {});
      s.settings.masterVol = Math.max(0, Math.min(100, Number(s.settings.masterVol) || 100));
      s.settings.sfxVol = Math.max(0, Math.min(100, Number(s.settings.sfxVol) || 0));
      // Bed-only audio pass (Alex): force SFX off once
      if (!s.settings.bedOnlySfxOff) {
        s.settings.sfxVol = 0;
        s.settings.bedOnlySfxOff = true;
      }
      s.settings.musicVol = Math.max(0, Math.min(100, Number(s.settings.musicVol) || 100));
      s.settings.muted = !!s.settings.muted;
      s.settings.reduceMotion = !!s.settings.reduceMotion;
      // UI hints migrate — teach-once bolt aim
      s.hints = Object.assign({ boltAim: false }, parsed.hints || {});
      if (parsed.hints == null) {
        // Experienced saves already know bolts — don't re-show the center tip
        const experienced = (s.playMs || 0) >= 30000
          || (s.totalKills || 0) > 0
          || (s.guildXp || 0) > 5
          || (s.totalContracts || 0) > 0;
        if (experienced) s.hints.boltAim = true;
      }
      // Intro tasks migrate — skip for existing/experienced saves
      if (parsed.intro) {
        s.intro = Object.assign({
          completed: false, index: 0, seen: true, objectiveMet: false, stats: {},
        }, parsed.intro);
        if (!s.intro.stats) s.intro.stats = {};
      } else if (window.CB_INTRO && window.CB_INTRO.migrate) {
        window.CB_INTRO.migrate(s);
      } else {
        const expIntro = (s.playMs || 0) > 5 * 60 * 1000
          || (s.totalKills || 0) > 0
          || (s.totalContracts || 0) > 0
          || (s.scraps || 0) > 0;
        s.intro = expIntro
          ? { completed: true, index: 20, seen: true, objectiveMet: false, stats: {} }
          : { completed: false, index: 0, seen: true, objectiveMet: false, stats: {} };
      }
      // Sync feature flags from owned upgrades (safe re-apply)
      if (getUpgradeLevel(s, 'unlock_crits') >= 1) s.features.crits = true;
      if (getUpgradeLevel(s, 'unlock_specials') >= 1) s.features.specials = true;
      const bf = getUpgradeLevel(s, 'beam_focus');
      s.features.beamTier = Math.min(3, Math.max(s.features.beamTier || 0, bf));
      // Ensure bronze starter
      if (!s.upgrades.gear_bronze) s.upgrades.gear_bronze = 1;
      // Hunter pacing migrate:
      // - If hire upgrade owned → unlocked
      // - If unlocked without hire (prestige keep / legacy) → grant hire upgrade so it persists
      // - Else locked (no free starters)
      D().hunters.forEach(h => {
        if (!s.hunters[h.id]) s.hunters[h.id] = { unlocked: false };
        const hireId = 'hunter_' + h.id;
        const hireDef = D().upgrades.find(u => u.id === hireId);
        const hired = getUpgradeLevel(s, hireId) >= 1;
        if (hired) {
          s.hunters[h.id].unlocked = true;
        } else if (s.hunters[h.id].unlocked && hireDef) {
          // Persist unlock via hire upgrade (prestige / mid-session)
          s.upgrades[hireId] = 1;
        } else if (h.unlock && hireDef) {
          // Legacy data.unlock=true starters → strip free unlock under new pacing
          // Only auto-strip if playMs is fresh-ish OR never hired and was data-default
          s.hunters[h.id].unlocked = false;
        } else {
          s.hunters[h.id].unlocked = false;
        }
      });
      // One-shot: old saves that had free briar (no hire_briar upgrade ever) lose briar
      if (!s._hunterPaceMigrated) {
        D().hunters.forEach(h => {
          const hireId = 'hunter_' + h.id;
          if (getUpgradeLevel(s, hireId) < 1) {
            s.hunters[h.id].unlocked = false;
          }
        });
        s._hunterPaceMigrated = true;
      }
      // Bestiary unlock/mastery migrate
      D().contracts.forEach(c => {
        if (!s.bestiary[c.id]) s.bestiary[c.id] = { kills: 0, completions: 0, unlocked: false, mastery: 0 };
        const b = s.bestiary[c.id];
        if (typeof b.kills !== 'number') b.kills = 0;
        if (typeof b.completions !== 'number') b.completions = 0;
        if (typeof b.mastery !== 'number') b.mastery = 0;
        b.mastery = Math.max(0, Math.min(10, b.mastery | 0));
        if (typeof b.unlocked !== 'boolean') {
          // Legacy: any progress = unlocked; else seed later
          b.unlocked = (b.kills > 0 || b.completions > 0);
        }
      });
      seedContractUnlocks(s);
      migrateCreatureFamilies(s);
      seedContractUnlocks(s);
      return s;
    } catch (e) {
      console.warn('Save load failed, fresh start', e);
      return defaultState();
    }
  }

  function save(state) {
    try {
      const holding = state.holding;
      delete state.holding;
      localStorage.setItem(D().SAVE_KEY, JSON.stringify(state));
      if (holding) state.holding = true;
    } catch (e) {
      console.warn('Save failed', e);
    }
  }

  function getUpgradeLevel(state, id) {
    return state.upgrades[id] || 0;
  }

  function upgradeCost(upgrade, level) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, level));
  }

  function getContract(id) {
    return D().contracts.find(c => c.id === id);
  }

  function getArea(id) {
    return D().areas.find(a => a.id === id);
  }

  function getMarkedPrey(areaId) {
    return D().markedPrey.find(p => p.areaId === areaId);
  }


  /** Player-facing Level label (never Undercroft / Fenwatch / etc.) */
  function levelLabel(areaOrId) {
    const area = typeof areaOrId === 'string' ? getArea(areaOrId) : areaOrId;
    if (!area) return 'Level ?';
    if (area.name && /^Level\s+\d+/i.test(area.name)) return area.name;
    const n = (area.order != null ? area.order : 0) + 1;
    return 'Level ' + n;
  }

  /** Level 1–3 stone badge PNG (art/v3b/ui/); falls back to text chip. */
  function levelChipHtml(areaOrIdOrLabel) {
    let label;
    if (typeof areaOrIdOrLabel === 'string' && /^Level\s+\d+/i.test(areaOrIdOrLabel)) {
      label = areaOrIdOrLabel;
    } else if (typeof areaOrIdOrLabel === 'number') {
      label = 'Level ' + areaOrIdOrLabel;
    } else {
      label = levelLabel(areaOrIdOrLabel);
    }
    const m = String(label).match(/Level\s*(\d+)/i);
    const n = m ? Number(m[1]) : 0;
    if (n >= 1 && n <= 3) {
      return '<img class="level-chip level-badge" src="art/v3b/ui/level_badge_' + n + '.png" alt="Level ' + n + '" width="75" height="32" decoding="async" />';
    }
    return '<span class="level-chip">' + label + '</span>';
  }

  function displayName(contract) {
    if (!contract) return '';
    if (contract.displayLevel != null) return contract.name + ' · Lv ' + contract.displayLevel;
    return contract.name;
  }

  function bossDisplayName(prey) {
    if (!prey) return '';
    if (prey.displayLevel != null) return prey.name + ' · Lv ' + prey.displayLevel;
    return prey.name;
  }

  function bossCostOf(prey) {
    if (!prey) return 120;
    return prey.bossCost != null ? prey.bossCost : (prey.threshold || 120);
  }

  function ensurePreyEntry(state, preyId) {
    if (!state.prey[preyId]) {
      state.prey[preyId] = { chip: 0, meter: 0, accessUnlocked: false, finished: false };
    }
    const p = state.prey[preyId];
    if (typeof p.meter !== 'number') p.meter = typeof p.chip === 'number' ? p.chip : 0;
    if (typeof p.chip !== 'number') p.chip = p.meter;
    if (typeof p.accessUnlocked !== 'boolean') p.accessUnlocked = false;
    if (typeof p.finished !== 'boolean') p.finished = false;
    return p;
  }

  /**
   * Migration table (Hands-era → creature families). Non-destructive merge.
   * cave_rats→bristle_cub, tunnel_bats→thornpelt_bear, drain_leeches→dire_thornpelt,
   * mistwood trio→ashfang line, crypt duo→silkling/webfen_widow (brood_matron fresh),
   * mats: grip_scrap→pelt_scrap, wail_shard→dire_claw, ember_core→ashfang_fang.
   * Current contract ids remapped. Prey chip/threshold → meter/bossCost; full chip → accessUnlocked.
   */
  const CONTRACT_ID_MAP = {
    cave_rats: 'bristle_cub',
    tunnel_bats: 'thornpelt_bear',
    drain_leeches: 'dire_thornpelt',
    bog_slimes: 'ashfang_pup',
    mist_wolves: 'ashfang_wolf',
    thorn_sprites: 'dire_ashfang',
    grave_beetles: 'silkling',
    bone_rattlers: 'webfen_widow',
    // ash_imps / cinder_hounds: L4 archived — bestiary entries kept under old keys if present
  };
  const MAT_ID_MAP = {
    grip_scrap: 'pelt_scrap',
    wail_shard: 'dire_claw',
    ember_core: 'ashfang_fang',
  };

  function mergeBestiary(dst, src) {
    if (!src) return dst;
    dst.kills = Math.max(dst.kills || 0, src.kills || 0);
    dst.completions = Math.max(dst.completions || 0, src.completions || 0);
    dst.mastery = Math.max(dst.mastery || 0, src.mastery || 0);
    dst.unlocked = !!(dst.unlocked || src.unlocked);
    return dst;
  }

  function migrateCreatureFamilies(state) {
    if (state._creatureFamiliesMigrated) return state;
    // Bestiary remaps
    const best = state.bestiary || {};
    Object.keys(CONTRACT_ID_MAP).forEach((oldId) => {
      const newId = CONTRACT_ID_MAP[oldId];
      if (!best[oldId]) return;
      if (!best[newId]) best[newId] = { kills: 0, completions: 0, unlocked: false, mastery: 0 };
      mergeBestiary(best[newId], best[oldId]);
      // Keep old key for safety but prefer new
    });
    state.bestiary = best;
    // Current contract
    if (state.currentContractId && CONTRACT_ID_MAP[state.currentContractId]) {
      state.currentContractId = CONTRACT_ID_MAP[state.currentContractId];
    }
    // Mats
    if (!state.mats) state.mats = {};
    Object.keys(MAT_ID_MAP).forEach((oldId) => {
      const newId = MAT_ID_MAP[oldId];
      const n = state.mats[oldId] || 0;
      if (n > 0) {
        state.mats[newId] = (state.mats[newId] || 0) + n;
        delete state.mats[oldId];
      }
    });
    // Prey: chip → meter; if was claimable, grant accessUnlocked (no wipe)
    D().markedPrey.forEach((preyDef) => {
      const st = ensurePreyEntry(state, preyDef.id);
      const cost = bossCostOf(preyDef);
      const oldThresh = preyDef.threshold || cost;
      // If legacy chip used old scale, rescale into meter
      if (st.meter === 0 && st.chip > 0 && oldThresh > 0) {
        st.meter = Math.min(cost, (st.chip / oldThresh) * cost);
      }
      if (st.chip >= oldThresh || st.meter >= cost) {
        st.accessUnlocked = st.accessUnlocked || (!st.finished && (st.chip >= oldThresh || st.meter >= cost));
        st.meter = Math.max(st.meter, Math.min(cost, st.meter || cost));
      }
      if (st.finished) st.accessUnlocked = true;
      st.chip = st.meter; // keep chip mirrored for any legacy readers
    });
    state._creatureFamiliesMigrated = true;
    return state;
  }

  function addBossMeter(state, areaId, pointsGained, preyChipMult) {
    const prey = getMarkedPrey(areaId);
    if (!prey || prey.hidden) return 0;
    const st = ensurePreyEntry(state, prey.id);
    if (st.finished || st.accessUnlocked) return 0;
    const cost = bossCostOf(prey);
    const mult = preyChipMult != null ? preyChipMult : 1;
    const add = Math.max(0, pointsGained) * mult;
    const before = st.meter || 0;
    st.meter = Math.min(cost, before + add);
    st.chip = st.meter;
    return st.meter - before;
  }

  function canFightBoss(state, preyId) {
    const preyDef = D().markedPrey.find(p => p.id === preyId);
    if (!preyDef || preyDef.hidden) return { ok: false, reason: 'Unknown boss' };
    if (!state.areas[preyDef.areaId]?.unlocked) return { ok: false, reason: 'Level locked' };
    const st = ensurePreyEntry(state, preyId);
    if (st.finished) return { ok: false, reason: 'Already cleared' };
    if (st.accessUnlocked) return { ok: true, access: true };
    const cost = bossCostOf(preyDef);
    if ((st.meter || 0) < cost) {
      return { ok: false, reason: 'Need ' + cost + ' Slayer points on this Level', meter: st.meter, cost };
    }
    return { ok: true, access: false, meter: st.meter, cost };
  }

  /** Unlock access (spend meter) and/or start live boss fight. */
  function startBossFight(state, preyId) {
    const check = canFightBoss(state, preyId);
    if (!check.ok) return check;
    const preyDef = D().markedPrey.find(p => p.id === preyId);
    const st = ensurePreyEntry(state, preyId);
    const cost = bossCostOf(preyDef);
    if (!st.accessUnlocked) {
      // Pay access: meter must be full; mark unlocked permanently until beaten
      if ((st.meter || 0) < cost) return { ok: false, reason: 'Boss meter not full' };
      st.accessUnlocked = true;
      // Meter stays full for UI until kill; design: access paid
    }
    state.bossFight = {
      preyId: preyId,
      active: true,
      // HP is ephemeral — arena computes from combat.hpMult; reset on leave
    };
    return { ok: true, prey: preyDef, state: st };
  }

  function clearBossFight(state, keepAccess) {
    if (!state.bossFight) return;
    state.bossFight.active = false;
    state.bossFight = null;
    // accessUnlocked untouched
  }

  function isBossFightActive(state) {
    return !!(state.bossFight && state.bossFight.active && state.bossFight.preyId);
  }

  function getActiveBoss(state) {
    if (!isBossFightActive(state)) return null;
    return D().markedPrey.find(p => p.id === state.bossFight.preyId) || null;
  }


  function getGuildRank(xp) {
    const ranks = D().ranks;
    let current = ranks[0];
    for (const r of ranks) {
      if (xp >= r.xp) current = r;
    }
    return current;
  }

  function nextRankXp(xp) {
    const ranks = D().ranks;
    for (const r of ranks) {
      if (r.xp > xp) return r.xp;
    }
    return ranks[ranks.length - 1].xp;
  }


  /** Contracts in an area, stable board order */
  function contractsInArea(areaId) {
    return D().contracts.filter(c => c.areaId === areaId);
  }

  function ensureBestiaryEntry(state, contractId) {
    if (!state.bestiary[contractId]) {
      state.bestiary[contractId] = { kills: 0, completions: 0, unlocked: false, mastery: 0 };
    }
    const b = state.bestiary[contractId];
    if (typeof b.mastery !== 'number') b.mastery = 0;
    b.mastery = Math.max(0, Math.min(10, b.mastery | 0));
    if (typeof b.unlocked !== 'boolean') b.unlocked = false;
    if (typeof b.kills !== 'number') b.kills = 0;
    if (typeof b.completions !== 'number') b.completions = 0;
    return b;
  }

  /** First contract in each unlocked area starts unlocked; never lock already-unlocked. */
  function seedContractUnlocks(state) {
    D().areas.forEach(area => {
      const list = contractsInArea(area.id);
      if (!list.length) return;
      const areaOpen = !!(state.areas[area.id]?.unlocked);
      list.forEach((c, i) => {
        const b = ensureBestiaryEntry(state, c.id);
        if (areaOpen && i === 0) b.unlocked = true;
      });
    });
  }

  function isContractUnlocked(state, contractId) {
    const b = ensureBestiaryEntry(state, contractId);
    return !!b.unlocked;
  }

  /** Unlock next monster in area order. Returns { unlocked: [...contracts] } */
  function unlockNextInArea(state, fromContractId) {
    const from = getContract(fromContractId);
    if (!from) return { unlocked: [] };
    const list = contractsInArea(from.areaId);
    const idx = list.findIndex(c => c.id === fromContractId);
    if (idx < 0 || idx >= list.length - 1) return { unlocked: [] };
    const next = list[idx + 1];
    const b = ensureBestiaryEntry(state, next.id);
    if (b.unlocked) return { unlocked: [] };
    b.unlocked = true;
    if (!state._pendingUnlocks) state._pendingUnlocks = [];
    state._pendingUnlocks.push({ id: next.id, name: next.name, emoji: next.emoji, miniDesc: next.miniDesc || '' });
    return { unlocked: [next] };
  }

  /**
   * After progress on a contract: unlock next if completed once OR kills >= quota (1 full task worth).
   */
  function maybeUnlockFromProgress(state, contract) {
    if (!contract) return { unlocked: [] };
    const b = ensureBestiaryEntry(state, contract.id);
    if (!b.unlocked) return { unlocked: [] };
    const quota = Math.max(5, contract.killQuota || 25);
    if (b.completions >= 1 || b.kills >= quota) {
      return unlockNextInArea(state, contract.id);
    }
    return { unlocked: [] };
  }

  /** Mastery 0–10. Gold mult = 1 + 0.05 * mastery. Chest chance: 0 at m0; 0.5%+(m-1)*0.5% capped 5%. */
  function masteryGoldMult(mastery) {
    const m = Math.max(0, Math.min(10, mastery | 0));
    return 1 + 0.05 * m;
  }

  function masteryChestChance(mastery) {
    const m = Math.max(0, Math.min(10, mastery | 0));
    if (m < 1) return 0;
    return Math.min(0.05, 0.005 + (m - 1) * 0.005);
  }

  function masteryImproveCost(mastery) {
    const m = Math.max(0, Math.min(10, mastery | 0));
    // Gold primary; scales up
    return Math.floor(40 * Math.pow(1.55, m));
  }

  /** Spend gold to raise mastery +1 (cap 10). */
  function improveMastery(state, contractId) {
    const c = getContract(contractId);
    if (!c) return { ok: false, reason: 'Unknown' };
    if (!state.areas[c.areaId]?.unlocked) return { ok: false, reason: 'Area locked' };
    const b = ensureBestiaryEntry(state, contractId);
    if (!b.unlocked) return { ok: false, reason: 'Monster locked' };
    if (b.mastery >= 10) return { ok: false, reason: 'Max mastery' };
    const cost = masteryImproveCost(b.mastery);
    if (state.gold < cost) return { ok: false, reason: 'Need ' + cost + ' gold' };
    state.gold -= cost;
    b.mastery += 1;
    return {
      ok: true,
      mastery: b.mastery,
      cost,
      chestChance: masteryChestChance(b.mastery),
      goldMult: masteryGoldMult(b.mastery),
    };
  }

  /** Auto +1 mastery every 3 completions (small drip). */
  function maybeAutoMastery(state, contractId) {
    const b = ensureBestiaryEntry(state, contractId);
    if (b.mastery >= 10) return false;
    if (b.completions > 0 && b.completions % 3 === 0) {
      b.mastery = Math.min(10, b.mastery + 1);
      return true;
    }
    return false;
  }

  /** On finish: roll bounty chest → fill a tube charge (boost preferred if empty-ish). */
  function rollBountyChest(state, contract) {
    const b = ensureBestiaryEntry(state, contract.id);
    const chance = masteryChestChance(b.mastery);
    if (chance <= 0 || Math.random() >= chance) return null;
    if (!state.chests) {
      if (window.CB_CHESTS) window.CB_CHESTS.ensure(state);
    }
    const c = state.chests;
    if (!c) return null;
    // Prefer filling boost tube, else permanent; if both ready, bump permanent charge leftover feel via toast-only gold
    let kind = 'boost';
    if (!c.boostReady && c.boostCharge < 1) {
      c.boostCharge = Math.min(1, (c.boostCharge || 0) + 0.45);
      if (c.boostCharge >= 1) { c.boostCharge = 1; c.boostReady = true; }
      kind = 'boost';
    } else if (!c.permanentReady && c.permanentCharge < 1) {
      c.permanentCharge = Math.min(1, (c.permanentCharge || 0) + 0.35);
      if (c.permanentCharge >= 1) { c.permanentCharge = 1; c.permanentReady = true; }
      kind = 'permanent';
    } else {
      // Both full — small gold sprinkle
      const bonus = 15 + b.mastery * 8;
      state.gold += bonus;
      kind = 'gold';
      return { kind, gold: bonus, chance };
    }
    return { kind, chance, boostCharge: c.boostCharge, permanentCharge: c.permanentCharge };
  }

  /** Aggregate multipliers from upgrades, relics, sigils, prestige mod */
  /** Highest unlocked mastery perk text for a contract (or null). */
  function activeMasteryPerkText(state, contractId) {
    const c = getContract(contractId);
    if (!c || !c.masteryPerks || !c.masteryPerks.length) return null;
    const best = ensureBestiaryEntry(state, contractId);
    let text = null;
    c.masteryPerks.forEach((p) => {
      if (best.mastery >= (p.at | 0)) text = p.text || text;
    });
    return text;
  }

  /** Next locked perk text for UI (or null if maxed). */
  function nextMasteryPerkText(state, contractId) {
    const c = getContract(contractId);
    if (!c || !c.masteryPerks || !c.masteryPerks.length) return null;
    const best = ensureBestiaryEntry(state, contractId);
    for (let i = 0; i < c.masteryPerks.length; i++) {
      const p = c.masteryPerks[i];
      if (best.mastery < (p.at | 0)) return 'M' + p.at + ': ' + (p.text || '');
    }
    return null;
  }

  /** Apply signature / food-mat drops for N kills. Returns { mats: {id:n}, food: n, toasts: [] }. */
  function rollSignatureLoot(state, contract, kills, gains) {
    const out = { mats: {}, food: 0, toasts: [] };
    if (!state || !contract || kills <= 0) return out;
    if (!state.mats) state.mats = {};
    // Signature mat (expected value for idle; per-kill roll for arena kills===1)
    const sig = contract.signatureDrop;
    if (sig && sig.id) {
      let drops = 0;
      const chance = Math.max(0, Math.min(1, Number(sig.chance) || 0));
      if (kills === 1) {
        if (Math.random() < chance) drops = 1;
      } else {
        drops = Math.floor(chance * kills + Math.random()); // expected + jitter
      }
      if (drops > 0) {
        state.mats[sig.id] = (state.mats[sig.id] || 0) + drops;
        out.mats[sig.id] = (out.mats[sig.id] || 0) + drops;
        if (gains) {
          if (!gains.mats) gains.mats = {};
          gains.mats[sig.id] = (gains.mats[sig.id] || 0) + drops;
        }
        const meta = (D().signatureMats && D().signatureMats[sig.id]) || { name: sig.id, emoji: '✨' };
        out.toasts.push((meta.emoji || '✨') + ' ' + (meta.name || sig.id) + (drops > 1 ? (' ×' + drops) : ''));
      }
    }
    // Occasional food mat restore (Infernal Mages pilot)
    if (contract.foodDropChance > 0 && contract.foodDropAmt > 0) {
      let foodGained = 0;
      const fc = Math.max(0, Math.min(1, Number(contract.foodDropChance) || 0));
      const amt = Number(contract.foodDropAmt) || 0;
      if (kills === 1) {
        if (Math.random() < fc) foodGained = amt;
      } else {
        foodGained = Math.floor(fc * kills) * amt;
      }
      if (foodGained > 0) {
        const b = getBonuses(state);
        const before = state.food;
        state.food = Math.min(b.foodCap, state.food + foodGained);
        const real = state.food - before;
        out.food += real;
        if (gains) gains.foodGained = (gains.foodGained || 0) + real;
      }
    }
    return out;
  }

  function getBonuses(state) {
    let idlePower = 1;
    let offlineCapMin = 360;
    let foodEff = 1;
    let foodCapBonus = 0;
    let foodRegen = 1.2; // base food/min
    let lootLuck = 1;
    let preyChip = 1;
    let pointsMult = 1;
    let foodPerKillMult = 1;
    let scrapChanceMult = 1;
    let quotaMult = 1;
    let critChance = 0; // unlocked via features.crits / unlock_crits
    let killMult = 1;
    let visualBomb = false;
    let hunterPower = 1;
    let hunterDmg = 1;       // hunter damage-per-hit mult (independent of player bolts)
    let hunterAtkSpeed = 1;  // hunter attack-speed mult (independent of player bolts)
    let hunterMoveSpeed = 1; // melee chase mult — Briar/Moss start at 1.0 (sluggish base)
    let quillDmg = 1;        // Quill-only damage mult (on top of hunterDmg)
    let quillAtkSpeed = 1;   // Quill-only attack-speed mult (on top of hunterAtkSpeed)
    let quillMultishot = 0;  // extra arrows: 0→1 base, +1/lv → lv1=2, lv2=3
    let quillProjSpeed = 0;  // additive Quill arrow flight speed (0.25/lv)
    let briarDmg = 1;        // Briar-only damage mult (on top of hunterDmg)
    let specialCadence = 1;
    let beamFocusLv = 0;
    let boltPierce = 0;
    let boltBounce = 0;

    D().upgrades.forEach(u => {
      const lv = getUpgradeLevel(state, u.id);
      if (!lv) return;
      const e = u.effect;
      if (e.idlePower) idlePower += e.idlePower * lv;
      if (e.offlineCapMin) offlineCapMin += e.offlineCapMin * lv;
      if (e.foodEff) foodEff += e.foodEff * lv;
      if (e.foodCap) foodCapBonus += e.foodCap * lv;
      if (e.foodRegen) foodRegen += e.foodRegen * lv;
      if (e.lootLuck) lootLuck += e.lootLuck * lv;
      if (e.scrapChance) scrapChanceMult += e.scrapChance * lv;
      if (e.killMult) killMult *= (1 + e.killMult * lv);
      if (e.preyChip) preyChip += e.preyChip * lv;
      if (e.autoAccept && lv) state.autoAccept = true;
      if (e.hunterPower) hunterPower += e.hunterPower * lv;
      if (e.hunterDmg) hunterDmg += e.hunterDmg * lv;
      if (e.hunterAtkSpeed) hunterAtkSpeed += e.hunterAtkSpeed * lv;
      if (e.hunterMoveSpeed) hunterMoveSpeed += e.hunterMoveSpeed * lv;
      if (e.quillDmg) quillDmg += e.quillDmg * lv;
      if (e.quillAtkSpeed) quillAtkSpeed += e.quillAtkSpeed * lv;
      if (e.quillMultishot) quillMultishot += e.quillMultishot * lv;
      if (e.quillProjSpeed) quillProjSpeed += e.quillProjSpeed * lv;
      if (e.briarDmg) briarDmg += e.briarDmg * lv;
      if (e.specialCadence) specialCadence += e.specialCadence * lv;
      if (e.beamFocus) beamFocusLv += e.beamFocus * lv;
      if (e.boltPierce) boltPierce += e.boltPierce * lv;
      if (e.boltBounce) boltBounce += e.boltBounce * lv;
      if (e.critChance) critChance += e.critChance * lv;
      if (e.feature && lv) {
        if (!state.features) state.features = { crits: false, specials: false, beamTier: 0 };
        state.features[e.feature] = true;
      }
    });

    Object.keys(state.relics).forEach(rid => {
      if (!state.relics[rid]) return;
      const r = D().relics[rid];
      if (!r) return;
      if (r.idlePower) idlePower += r.idlePower;
      if (r.lootGold) lootLuck += r.lootGold;
      if (r.offlineCap) offlineCapMin *= (1 + r.offlineCap);
      if (r.foodEff) foodEff += r.foodEff;
    });

    D().sigilShop.forEach(s => {
      const lv = state.sigils[s.id] || 0;
      if (!lv) return;
      if (s.effect.idlePower) idlePower += s.effect.idlePower * lv;
      if (s.effect.offlineCapMin) offlineCapMin += s.effect.offlineCapMin * lv;
      if (s.effect.lootLuck) lootLuck += s.effect.lootLuck * lv;
    });

    // Prestige modifier flavor
    if (state.prestigeMod) {
      const m = state.prestigeMod;
      if (m.includes('Bounty')) pointsMult *= 1.1;
      if (m.includes('Lean')) foodPerKillMult *= 0.92;
      if (m.includes('Lucky')) scrapChanceMult *= 1.2;
      if (m.includes('Swift')) quotaMult *= 0.9;
      if (m.includes('Gold')) lootLuck *= 1.12;
    }

    // Permanent chest bonuses
    const pb = state.chests && state.chests.permanentBonuses;
    if (pb) {
      if (pb.idlePower) idlePower += pb.idlePower;
      if (pb.lootLuck) lootLuck += pb.lootLuck;
      if (pb.critChance && state.features && state.features.crits) critChance += pb.critChance;
      if (pb.offlineCapMin) offlineCapMin += pb.offlineCapMin;
      if (pb.foodEff) foodEff += pb.foodEff;
    }

    // Active boost chest
    let activeBoost = null;
    if (window.CB_CHESTS) {
      activeBoost = window.CB_CHESTS.getActiveBoost(state);
    } else if (state.chests && state.chests.activeBoost) {
      activeBoost = state.chests.activeBoost;
      if (activeBoost.endsAt && Date.now() >= activeBoost.endsAt) {
        state.chests.activeBoost = null;
        activeBoost = null;
      }
    }
    if (activeBoost) {
      if (activeBoost.killMult) killMult *= activeBoost.killMult;
      if (activeBoost.goldMult) lootLuck *= activeBoost.goldMult;
      if (activeBoost.critBonus && state.features && state.features.crits) critChance += activeBoost.critBonus;
      if (activeBoost.offlineCapBonus) offlineCapMin += activeBoost.offlineCapBonus;
      if (activeBoost.visualBomb) visualBomb = true;
      if (activeBoost.scrapChanceBonus) scrapChanceMult += activeBoost.scrapChanceBonus;
      if (activeBoost.pointsMult) pointsMult *= activeBoost.pointsMult;
    }

    const hunterCount = D().hunters.filter(h => state.hunters[h.id]?.unlocked).length;
    let hunterIdle = D().hunters
      .filter(h => state.hunters[h.id]?.unlocked)
      .reduce((sum, h) => sum + h.idle, 0);
    hunterIdle *= hunterPower;

    // Feature gate: crits require unlock (small base once unlocked)
    if (!state.features) state.features = { crits: false, specials: false, beamTier: 0 };
    if (!state.features.crits) critChance = 0;
    else if (critChance <= 0) critChance = 0.08;

    // Beam visual tier from beam_focus upgrades (0–3)
    const beamTier = Math.min(3, Math.max(0, beamFocusLv | 0));
    state.features.beamTier = beamTier;

    // Per-monster mastery perks (Undercroft pilot): highest unlocked tier per monster;
    // different monsters still stack with each other.
    D().contracts.forEach((c) => {
      if (!c.masteryPerks || !c.masteryPerks.length) return;
      const be = state.bestiary && state.bestiary[c.id];
      if (!be || !be.unlocked) return;
      const m = be.mastery | 0;
      let best = null;
      c.masteryPerks.forEach((p) => {
        if (m >= (p.at | 0)) best = p;
      });
      if (!best) return;
      if (best.scrapChance) scrapChanceMult += best.scrapChance;
      if (best.pointsMult) pointsMult += best.pointsMult;
      if (best.offlineCapMin) offlineCapMin += best.offlineCapMin;
      if (best.foodEff) foodEff += best.foodEff;
      if (best.killMult) killMult *= (1 + best.killMult);
      if (best.lootLuck) lootLuck += best.lootLuck;
    });

    return {
      idlePower,
      offlineCapMin,
      foodEff,
      foodCap: 100 + foodCapBonus,
      foodRegen,
      lootLuck,
      preyChip,
      pointsMult,
      foodPerKillMult,
      scrapChanceMult,
      quotaMult,
      hunterCount,
      hunterIdle,
      hunterPower,
      hunterDmg,
      hunterAtkSpeed,
      hunterMoveSpeed,
      quillDmg,
      quillAtkSpeed,
      quillMultishot: Math.max(0, quillMultishot | 0),
      quillProjSpeed: Math.max(0, quillProjSpeed),
      briarDmg,
      critChance,
      killMult,
      visualBomb,
      activeBoost,
      specialCadence,
      beamTier,
      boltPierce: Math.min(2, Math.max(0, boltPierce | 0)),
      boltBounce: Math.min(2, Math.max(0, boltBounce | 0)),
      features: state.features,
    };
  }

  /** kills per minute with current contract (× ACTIVE_MULT while holding) */
  function killRatePerMin(state, contract) {
    if (!contract) return 0;
    const b = getBonuses(state);
    const area = getArea(contract.areaId);
    const areaMult = area ? area.mult : 1;
    const baseRate = 2.5; // base kills/min at power 1
    // Solo beam era: PLAYER_BASE_IDLE always contributes; hunters add on top
    const playerBase = (D().PLAYER_BASE_IDLE != null) ? D().PLAYER_BASE_IDLE : 0.75;
    const labor = playerBase + (b.hunterIdle || 0);
    let rate = baseRate * b.idlePower * labor * areaMult * contract.mult;
    if (b.killMult && b.killMult !== 1) rate *= b.killMult;
    if (state.holding) {
      const mult = (D().ACTIVE_MULT != null)
        ? D().ACTIVE_MULT
        : ((window.CB_ARENA && window.CB_ARENA.ACTIVE_MULT) || 1.4);
      rate *= mult;
    }
    return rate;
  }

  function effectiveQuota(state, contract) {
    const b = getBonuses(state);
    return Math.max(5, Math.floor(contract.killQuota * b.quotaMult));
  }

  /**
   * Simulate idle for `elapsedMs`. Mutates a copy of gains; returns gains object.
   * Also mutates state for persistent progress.
   */
  function applyIdle(state, elapsedMs) {
    const b = getBonuses(state);
    const elapsedMinutes = elapsedMs / 60000;
    const effectiveMinutes = Math.min(elapsedMinutes, b.offlineCapMin);

    const gains = {
      kills: 0,
      gold: 0,
      scraps: 0,
      points: 0,
      chips: {},
      contractsFinished: 0,
      foodConsumed: 0,
      foodGained: 0,
      elapsedMs,
      effectiveMinutes,
      capped: elapsedMinutes > b.offlineCapMin,
    };

    if (effectiveMinutes <= 0) {
      // Still charge chests for tiny windows? skip
      return gains;
    }

    // Chest tubes charge from hunting time (incl. AFK/offline)
    if (window.CB_CHESTS) {
      window.CB_CHESTS.charge(state, effectiveMinutes * 60000);
    }

    // Food regen first (partial)
    const foodGen = b.foodRegen * effectiveMinutes;
    state.food = Math.min(b.foodCap, state.food + foodGen);
    state.foodCap = b.foodCap;
    gains.foodGained = foodGen;

    // When Hunt arena is live, Task progress comes from real mob deaths (killMob).
    // Idle still regenerates food / charges chests above; skip rate-based kill accrual.
    const arenaOwns = !!(window.CB_ARENA && typeof window.CB_ARENA.ownsKillProgress === 'function'
      && window.CB_ARENA.ownsKillProgress());

    let minutesLeft = effectiveMinutes;
    let guard = 0;

    while (minutesLeft > 0.001 && guard++ < 500) {
      if (arenaOwns) break;
      // Ensure we have a contract
      if (!state.currentContractId) {
        if (!tryAutoAccept(state)) break;
      }
      const contract = getContract(state.currentContractId);
      if (!contract) break;
      if (!state.areas[contract.areaId]?.unlocked) {
        state.currentContractId = null;
        continue;
      }

      const rate = killRatePerMin(state, contract); // /min
      if (rate <= 0) break;

      const foodPerKill = contract.foodPerKill * b.foodPerKillMult / b.foodEff;
      const maxByFood = foodPerKill > 0 ? Math.floor(state.food / foodPerKill) : Infinity;
      const maxByTime = rate * minutesLeft;
      const quota = effectiveQuota(state, contract);
      const need = Math.max(0, quota - state.contractProgress);
      if (need <= 0) {
        checkContractFinish(state, contract, gains, b);
        if (!state.currentContractId) continue;
        break;
      }
      const killsWanted = Math.min(maxByFood, maxByTime, need);

      if (killsWanted < 0.01) {
        // Out of food — spend remaining time regenerating only (already applied)
        break;
      }

      // Bank fractional kills — Task bar only advances on whole kills (no timer drip)
      state._killBank = (state._killBank || 0) + killsWanted;
      const kills = Math.floor(state._killBank);
      if (kills <= 0) {
        // Consume the time slice without filling the Task bar
        const frac = Math.min(killsWanted, need || killsWanted);
        if (frac <= 0) break;
        const tUsed = frac / rate;
        minutesLeft -= tUsed;
        // Tiny food drip proportional to banked effort (keeps AFK food pacing honest)
        const foodUse = frac * foodPerKill;
        if (foodUse > 0) {
          state.food = Math.max(0, state.food - foodUse);
          gains.foodConsumed += foodUse;
        }
        break; // wait for a whole kill
      }
      state._killBank -= kills;

      const tUsed = kills / rate;
      const foodUse = kills * foodPerKill;
      state.food = Math.max(0, state.food - foodUse);
      gains.foodConsumed += foodUse;
      state.contractProgress += kills;
      gains.kills += kills;
      applyKillRewards(state, contract, kills, gains, b);
      minutesLeft -= tUsed;
      checkContractFinish(state, contract, gains, b);
    }

    state.totalKills += Math.floor(gains.kills);
    return gains;
  }

  function applyKillRewards(state, contract, kills, gains, b) {
    // Gold (mastery bounty %)
    const best = ensureBestiaryEntry(state, contract.id);
    const avgGold = ((contract.goldMin + contract.goldMax) / 2) * b.lootLuck * masteryGoldMult(best.mastery);
    const gold = avgGold * kills;
    state.gold += gold;
    gains.gold += gold;

    // Scraps (probabilistic expected)
    const scrapChance = Math.min(0.95, contract.scrapChance * b.scrapChanceMult);
    const scraps = scrapChance * kills;
    state.scraps += scraps;
    gains.scraps += scraps;

    // Points
    const pts = contract.pointsPerKill * kills * b.pointsMult;
    state.points += pts;
    gains.points += pts;

    // Signature mats / food chips (Undercroft pilot)
    const sig = rollSignatureLoot(state, contract, kills, gains);
    if (sig.toasts && sig.toasts.length) {
      if (!gains.sigToasts) gains.sigToasts = [];
      gains.sigToasts.push.apply(gains.sigToasts, sig.toasts);
      // Ephemeral for arena kill toast (cleared by UI)
      if (!state._pendingSigToasts) state._pendingSigToasts = [];
      state._pendingSigToasts.push.apply(state._pendingSigToasts, sig.toasts);
    }

    // Bestiary
    const be = ensureBestiaryEntry(state, contract.id);
    be.kills += kills;
    maybeUnlockFromProgress(state, contract);

    // Level boss meter — fill from Slayer points earned on this kill
    const ptsForMeter = contract.pointsPerKill * kills * b.pointsMult;
    const meterAdd = addBossMeter(state, contract.areaId, ptsForMeter, b.preyChip || 1);
    if (meterAdd > 0) {
      const prey = getMarkedPrey(contract.areaId);
      if (prey) gains.chips[prey.id] = (gains.chips[prey.id] || 0) + meterAdd;
    }
  }

  /**
   * Credit whole contract kills (arena deaths or idle whole-kills).
   * Advances Task bar strictly by kill count. opts.skipGold: leave gold to VFX path.
   */
  function creditContractKills(state, contract, kills, opts) {
    opts = opts || {};
    kills = Math.floor(Number(kills) || 0);
    if (!state || !contract || kills <= 0) return null;
    const b = getBonuses(state);
    const gains = {
      kills: 0, gold: 0, scraps: 0, points: 0, chips: {},
      contractsFinished: 0, foodConsumed: 0,
    };
    // Food (same as idle path)
    const foodPerKill = contract.foodPerKill * b.foodPerKillMult / b.foodEff;
    const foodUse = kills * foodPerKill;
    if (foodPerKill > 0) {
      const maxByFood = Math.floor(state.food / foodPerKill);
      if (maxByFood <= 0) {
        // Still allow the kill to count toward the Task (player earned the death);
        // food starvation only throttles idle — arena already spent the effort.
      } else if (kills > maxByFood) {
        kills = maxByFood;
      }
    }
    if (kills <= 0) return null;
    if (foodUse > 0) {
      const use = kills * foodPerKill;
      state.food = Math.max(0, state.food - use);
      gains.foodConsumed += use;
    }
    state.contractProgress = (state.contractProgress || 0) + kills;
    gains.kills += kills;
    state.totalKills = (state.totalKills || 0) + kills;
    if (opts.skipGold) {
      // Points / scraps / bestiary / prey — no gold (arena coin VFX handles gold)
      const best = ensureBestiaryEntry(state, contract.id);
      const scrapChance = Math.min(0.95, contract.scrapChance * b.scrapChanceMult);
      const scraps = scrapChance * kills;
      state.scraps += scraps;
      gains.scraps += scraps;
      const pts = contract.pointsPerKill * kills * b.pointsMult;
      state.points += pts;
      gains.points += pts;
      const sig = rollSignatureLoot(state, contract, kills, gains);
      if (sig.toasts && sig.toasts.length) {
        if (!gains.sigToasts) gains.sigToasts = [];
        gains.sigToasts.push.apply(gains.sigToasts, sig.toasts);
        if (!state._pendingSigToasts) state._pendingSigToasts = [];
        state._pendingSigToasts.push.apply(state._pendingSigToasts, sig.toasts);
      }
      best.kills += kills;
      maybeUnlockFromProgress(state, contract);
      const ptsForMeter = contract.pointsPerKill * kills * b.pointsMult;
      const meterAdd = addBossMeter(state, contract.areaId, ptsForMeter, b.preyChip || 1);
      if (meterAdd > 0) {
        const prey = getMarkedPrey(contract.areaId);
        if (prey) gains.chips[prey.id] = (gains.chips[prey.id] || 0) + meterAdd;
      }
    } else {
      applyKillRewards(state, contract, kills, gains, b);
    }
    checkContractFinish(state, contract, gains, b);
    return gains;
  }

  function checkContractFinish(state, contract, gains, b) {
    const quota = effectiveQuota(state, contract);
    if (state.contractProgress < quota) return;
    // Finish
    const best = ensureBestiaryEntry(state, contract.id);
    const bonus = contract.finishBonus * b.pointsMult;
    const goldBonus = contract.finishBonus * 0.5 * b.lootLuck * masteryGoldMult(best.mastery);
    state.points += bonus;
    gains.points += bonus;
    const finishMeter = addBossMeter(state, contract.areaId, bonus, b.preyChip || 1);
    if (finishMeter > 0) {
      const prey = getMarkedPrey(contract.areaId);
      if (prey) gains.chips[prey.id] = (gains.chips[prey.id] || 0) + finishMeter;
    }
    state.guildXp += Math.floor(quota * 0.5 + bonus * 0.3);
    state.gold += goldBonus;
    gains.gold += goldBonus;

    best.completions += 1;
    state.totalContracts += 1;
    gains.contractsFinished += 1;
    const autoM = maybeAutoMastery(state, contract.id);
    const unlockRes = maybeUnlockFromProgress(state, contract);
    const chestDrop = rollBountyChest(state, contract);
    // For Hunt panel celebration toast (ephemeral, not saved)
    state._lastFinishedContractId = contract.id;
    const matId = contract.signatureDrop && contract.signatureDrop.id;
    const matCount = (matId && state.mats && state.mats[matId]) || 0;
    const matMeta = matId && D().signatureMats && D().signatureMats[matId];
    state._lastFinishReward = {
      gold: goldBonus, points: bonus, name: contract.name,
      chest: chestDrop, autoMastery: autoM,
      unlocked: (unlockRes.unlocked || []).map(c => c.name),
      signatureMat: matMeta ? { id: matId, name: matMeta.name, emoji: matMeta.emoji, total: matCount } : null,
      perkText: activeMasteryPerkText(state, contract.id),
    };
    if (!gains.finishRewards) gains.finishRewards = [];
    gains.finishRewards.push({
      id: contract.id, gold: goldBonus, points: bonus, name: contract.name,
      chest: chestDrop, unlocked: unlockRes.unlocked,
    });
    if (chestDrop) {
      if (!gains.bountyChests) gains.bountyChests = [];
      gains.bountyChests.push(chestDrop);
    }

    state.contractProgress = 0;
    state.currentContractId = null;

    try {
      if (window.CB_INTRO && typeof window.CB_INTRO.note === 'function') {
        window.CB_INTRO.note('contract-finish', contract && contract.id);
      }
    } catch (e) { /* soft */ }

    tryAutoAccept(state);
  }

  function tryAutoAccept(state) {
    if (!state.autoAccept && getUpgradeLevel(state, 'auto_accept') < 1) {
      // Manual only — but for offline we still need something: auto-accept first available if none selected and tutorial done? 
      // Spec: auto-accept when unlocked. Without it, offline only continues current contract.
      return false;
    }
    const next = pickNextContract(state);
    if (!next) return false;
    state.currentContractId = next.id;
    state.contractProgress = 0;
    return true;
  }

  function pickNextContract(state) {
    const unlocked = D().contracts.filter(c =>
      state.areas[c.areaId]?.unlocked && isContractUnlocked(state, c.id)
    );
    if (!unlocked.length) return null;
    // Prefer unfinished-feeling: rotate by least completions
    unlocked.sort((a, b) => {
      const ca = state.bestiary[a.id]?.completions || 0;
      const cb = state.bestiary[b.id]?.completions || 0;
      if (ca !== cb) return ca - cb;
      return a.killQuota - b.killQuota;
    });
    return unlocked[0];
  }

  function acceptContract(state, contractId) {
    const c = getContract(contractId);
    if (!c) return { ok: false, reason: 'Unknown contract' };
    if (!state.areas[c.areaId]?.unlocked) return { ok: false, reason: 'Area locked' };
    ensureBestiaryEntry(state, contractId);
    if (!isContractUnlocked(state, contractId)) return { ok: false, reason: 'Monster locked — finish prior contract' };
    state.currentContractId = contractId;
    state.contractProgress = 0;
    return { ok: true };
  }

  function formatPlayLock(minPlayMs, playMs) {
    const need = Math.max(0, (minPlayMs || 0) - (playMs || 0));
    if (need <= 0) return null;
    const mins = need / 60000;
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = Math.ceil(mins % 60);
      return m ? (h + 'h ' + m + 'm left') : (h + 'h left');
    }
    if (mins >= 1) return Math.ceil(mins) + 'm left';
    return Math.ceil(need / 1000) + 's left';
  }

  function playGateOk(state, u) {
    if (!u || !u.minPlayMs) return { ok: true };
    if ((state.playMs || 0) >= u.minPlayMs) return { ok: true };
    // Intro waiver — Iron / Bolt Focus / pierce|bounce / Briar buyable during tutorial
    if (u.id && window.CB_INTRO && window.CB_INTRO.shouldWaivePlayGate
        && window.CB_INTRO.shouldWaivePlayGate(state, u.id)) {
      return { ok: true, waived: true };
    }
    return { ok: false, reason: 'Play time: ' + formatPlayLock(u.minPlayMs, state.playMs) };
  }

  function buyUpgrade(state, upgradeId) {
    const u = D().upgrades.find(x => x.id === upgradeId);
    if (!u) return { ok: false, reason: 'Unknown' };
    const lv = getUpgradeLevel(state, upgradeId);
    if (lv >= u.maxLevel) return { ok: false, reason: 'Maxed' };
    if (u.requiresUpgrade && getUpgradeLevel(state, u.requiresUpgrade) < 1) {
      const req = D().upgrades.find(x => x.id === u.requiresUpgrade);
      return { ok: false, reason: 'Need ' + (req ? req.name : u.requiresUpgrade) + ' first' };
    }
    if (u.requiresAnyUpgrade && u.requiresAnyUpgrade.length) {
      const anyOk = u.requiresAnyUpgrade.some(id => getUpgradeLevel(state, id) >= 1);
      if (!anyOk) {
        const names = u.requiresAnyUpgrade.map(id => {
          const r = D().upgrades.find(x => x.id === id);
          return r ? r.name : id;
        });
        return { ok: false, reason: 'Need ' + names.join(' or ') + ' first' };
      }
    }
    const gate = playGateOk(state, u);
    if (!gate.ok) return gate;
    const cost = upgradeCost(u, lv);
    const cur = u.costCurrency === 'points' ? 'points'
      : u.costCurrency === 'scraps' ? 'scraps'
      : u.costCurrency === 'mats' ? null
      : 'gold';
    if (u.costMats) {
      if (!state.mats) state.mats = {};
      for (const matId of Object.keys(u.costMats)) {
        const need = u.costMats[matId] | 0;
        if ((state.mats[matId] || 0) < need) {
          const meta = (D().signatureMats && D().signatureMats[matId]) || { name: matId };
          return { ok: false, reason: 'Need ' + need + ' ' + (meta.name || matId) };
        }
      }
    }
    if (cur) {
      if ((state[cur] || 0) < cost) return { ok: false, reason: 'Need ' + cost + ' ' + cur };
    }
    if (u.costMats) {
      for (const matId of Object.keys(u.costMats)) {
        state.mats[matId] = (state.mats[matId] || 0) - (u.costMats[matId] | 0);
      }
    }
    if (cur && cost > 0) state[cur] -= cost;
    state.upgrades[upgradeId] = lv + 1;

    if (u.effect.unlockHunter) {
      const hid = u.effect.unlockHunter;
      if (!state.hunters[hid]) state.hunters[hid] = { unlocked: false };
      state.hunters[hid].unlocked = true;
    }
    if (u.effect.autoAccept) state.autoAccept = true;
    if (u.effect.feature) {
      if (!state.features) state.features = { crits: false, specials: false, beamTier: 0 };
      state.features[u.effect.feature] = true;
    }
    if (u.effect.beamFocus) {
      if (!state.features) state.features = { crits: false, specials: false, beamTier: 0 };
      state.features.beamTier = Math.min(3, getUpgradeLevel(state, 'beam_focus'));
    }

    // Refresh food cap + features
    const b = getBonuses(state);
    state.foodCap = b.foodCap;
    if (state.food > state.foodCap) state.food = state.foodCap;

    return { ok: true, cost };
  }

  function finishMarkedPrey(state, preyId) {
    const preyDef = D().markedPrey.find(p => p.id === preyId);
    if (!preyDef) return { ok: false, reason: 'Unknown' };
    const st = ensurePreyEntry(state, preyId);
    if (st.finished) return { ok: false, reason: 'Already done' };
    // Boss must be fought (access unlocked) — kill credits finish
    if (!st.accessUnlocked && (st.meter || 0) < bossCostOf(preyDef)) {
      return { ok: false, reason: 'Fight the boss first' };
    }

    st.finished = true;
    st.accessUnlocked = true;
    st.meter = 0;
    st.chip = 0;
    state.points += preyDef.rewardPoints;
    state.gold += preyDef.rewardGold;
    state.guildXp += Math.floor(preyDef.rewardPoints * 0.5);
    state.relics[preyDef.relicId] = true;
    clearBossFight(state);

    let unlockName = null;
    if (preyDef.unlockAreaId) {
      if (!state.areas[preyDef.unlockAreaId]) state.areas[preyDef.unlockAreaId] = { unlocked: false };
      state.areas[preyDef.unlockAreaId].unlocked = true;
      seedContractUnlocks(state);
      unlockName = levelLabel(preyDef.unlockAreaId);
    }

    return {
      ok: true,
      relic: D().relics[preyDef.relicId],
      unlockAreaId: preyDef.unlockAreaId,
      unlockLevelName: unlockName,
      gold: preyDef.rewardGold,
      points: preyDef.rewardPoints,
      levelCleared: levelLabel(preyDef.areaId),
    };
  }

  function canPrestige(state) {
    const anyPrey = Object.values(state.prey).some(p => p.finished);
    const rank = getGuildRank(state.guildXp);
    return anyPrey || rank.rank >= 2;
  }

  function doPrestige(state) {
    if (!canPrestige(state)) return { ok: false, reason: 'Clear a Level boss or reach Tracker rank' };

    const sigilsEarned = 1 + Math.floor(state.prestigeCount * 0.5) + (Object.values(state.prey).filter(p => p.finished).length > 0 ? 1 : 0);
    state.sigilCurrency += Math.max(1, sigilsEarned);
    state.prestigeCount += 1;

    const mods = D().prestigeModifiers;
    state.prestigeMod = mods[Math.floor(Math.random() * mods.length)];

    // Keep: relics, bestiary, hunter unlocks, sigils, areas unlocked, prey finished, guild xp soft keep half?
    // Spec: KEEP relics, bestiary, hunter unlocks, prestige currency Sigils
    // Reset: gold, food, current gear multipliers that are "run" based (= upgrades)
    const keepHunters = JSON.parse(JSON.stringify(state.hunters));
    const keepHireUps = {};
    const keepPrestigeUps = {};
    D().upgrades.forEach(u => {
      if (u.effect && u.effect.unlockHunter && (state.upgrades[u.id] || 0) >= 1) {
        keepHireUps[u.id] = state.upgrades[u.id];
      }
      if (u.prestigeKeep && (state.upgrades[u.id] || 0) >= 1) {
        keepPrestigeUps[u.id] = state.upgrades[u.id];
      }
    });
    const keepScraps = state.scraps || 0;
    const keepMats = Object.assign({}, state.mats || {});
    const keepRelics = Object.assign({}, state.relics);
    const keepBestiary = JSON.parse(JSON.stringify(state.bestiary));
    const keepPrey = JSON.parse(JSON.stringify(state.prey));
    const keepAreas = JSON.parse(JSON.stringify(state.areas));
    const keepSigils = Object.assign({}, state.sigils);
    const keepSigilCurrency = state.sigilCurrency;
    const keepPrestige = state.prestigeCount;
    const keepMod = state.prestigeMod;
    const keepXp = Math.floor(state.guildXp * 0.25);
    const keepChests = {
      permanentCharge: state.chests?.permanentCharge || 0,
      boostCharge: 0,
      permanentReady: !!state.chests?.permanentReady,
      boostReady: false,
      permanentBonuses: Object.assign({}, (state.chests && state.chests.permanentBonuses) || {}),
      permanentClaims: state.chests?.permanentClaims || 0,
      boostClaims: state.chests?.boostClaims || 0,
      lastPermanent: state.chests?.lastPermanent || null,
      lastBoost: null,
      activeBoost: null,
    };

    const keepPlayMs = state.playMs || 0;
    const keepFeatures = Object.assign({ crits: false, specials: false, beamTier: 0 }, state.features || {});

    const fresh = defaultState();
    Object.assign(state, fresh);
    state.hunters = keepHunters;
    Object.keys(keepHireUps).forEach(id => { state.upgrades[id] = keepHireUps[id]; });
    state.relics = keepRelics;
    state.bestiary = keepBestiary;
    state.prey = keepPrey;
    state.areas = keepAreas;
    state.sigils = keepSigils;
    state.sigilCurrency = keepSigilCurrency;
    state.prestigeCount = keepPrestige;
    state.prestigeMod = keepMod;
    state.guildXp = keepXp;
    state.chests = keepChests;
    state.playMs = keepPlayMs;
    state.features = keepFeatures;
    Object.keys(keepPrestigeUps).forEach(id => { state.upgrades[id] = keepPrestigeUps[id]; });
    state.scraps = keepScraps;
    state.mats = keepMats;
    state.lastTickAt = Date.now();
    state.gold = 40;
    state.food = 100;

    return { ok: true, sigilsEarned: Math.max(1, sigilsEarned), mod: keepMod };
  }

  
  function matsOwned(state, costMats) {
    if (!costMats) return true;
    if (!state.mats) state.mats = {};
    return Object.keys(costMats).every(id => (state.mats[id] || 0) >= (costMats[id] | 0));
  }

  function spendMats(state, costMats) {
    if (!costMats) return;
    if (!state.mats) state.mats = {};
    Object.keys(costMats).forEach(id => {
      state.mats[id] = (state.mats[id] || 0) - (costMats[id] | 0);
    });
  }

  /** Forge timed boost — replaces activeBoost slot (same as Loot Casket Frenzy). */
  function buyForgeBoost(state, boostId) {
    const list = D().forgeBoosts || [];
    const b = list.find(x => x.id === boostId);
    if (!b) return { ok: false, reason: 'Unknown' };
    if (!matsOwned(state, b.costMats)) {
      const matId = Object.keys(b.costMats || {})[0];
      const meta = (D().signatureMats && D().signatureMats[matId]) || { name: matId };
      return { ok: false, reason: 'Need ' + b.costMats[matId] + ' ' + (meta.name || matId) };
    }
    spendMats(state, b.costMats);
    if (!state.chests) state.chests = {};
    const applied = {
      id: b.id,
      name: b.name,
      emoji: b.emoji,
      desc: b.desc,
      durationMs: b.durationMs || 600000,
      endsAt: Date.now() + (b.durationMs || 600000),
      killMult: b.killMult || 1,
      goldMult: b.goldMult || 1,
      critBonus: b.critBonus || 0,
      visualBomb: !!b.visualBomb,
      offlineCapBonus: b.offlineCapBonus || 0,
      scrapChanceBonus: b.scrapChanceBonus || 0,
      pointsMult: b.pointsMult || 1,
    };
    state.chests.activeBoost = applied;
    return { ok: true, boost: applied };
  }

    function scrapsHeaderVisible(state) {
    if ((state.scraps || 0) >= 1) return true;
    const hands = state.bestiary && (state.bestiary.bristle_cub || state.bestiary.cave_rats);
    return !!(hands && ((hands.completions || 0) >= 1));
  }

  function scrapworkVisible(state) {
    return (state.scraps || 0) >= 1;
  }

  function forgeVisible(state) {
    const mats = state.mats || {};
    return Object.keys(mats).some(id => (mats[id] || 0) >= 1);
  }

  function buySigil(state, sigilId) {
    const s = D().sigilShop.find(x => x.id === sigilId);
    if (!s) return { ok: false, reason: 'Unknown' };
    if (state.sigilCurrency < s.cost) return { ok: false, reason: 'Need Sigils' };
    state.sigilCurrency -= s.cost;
    state.sigils[sigilId] = (state.sigils[sigilId] || 0) + 1;
    return { ok: true };
  }

  function completionPct(state) {
    let score = 0;
    let total = 0;
    D().contracts.forEach(c => {
      total += 2;
      const b = state.bestiary[c.id];
      if (b?.kills > 0) score += 1;
      if (b?.completions > 0) score += 1;
    });
    D().markedPrey.forEach(p => {
      total += 1;
      if (state.prey[p.id]?.finished) score += 1;
    });
    Object.keys(D().relics).forEach(rid => {
      total += 1;
      if (state.relics[rid]) score += 1;
    });
    return total ? score / total : 0;
  }

  function buyFood(state) {
    const cost = 10;
    const amount = 40;
    if (state.gold < cost) return { ok: false };
    const b = getBonuses(state);
    if (state.food >= b.foodCap) return { ok: false, reason: 'Full' };
    state.gold -= cost;
    state.food = Math.min(b.foodCap, state.food + amount);
    return { ok: true };
  }

  window.CB_STATE = {
    defaultState,
    load,
    save,
    getUpgradeLevel,
    upgradeCost,
    getContract,
    getArea,
    getMarkedPrey,
    levelLabel,
    levelChipHtml,
    displayName,
    bossDisplayName,
    bossCostOf,
    ensurePreyEntry,
    canFightBoss,
    startBossFight,
    clearBossFight,
    isBossFightActive,
    getActiveBoss,
    addBossMeter,
    migrateCreatureFamilies,
    getGuildRank,
    nextRankXp,
    getBonuses,
    killRatePerMin,
    effectiveQuota,
    applyIdle,
    creditContractKills,
    acceptContract,
    buyUpgrade,
    finishMarkedPrey,
    canPrestige,
    doPrestige,
    buySigil,
    buyForgeBoost,
    scrapsHeaderVisible,
    scrapworkVisible,
    forgeVisible,
    matsOwned,
    completionPct,
    buyFood,
    pickNextContract,
    tryAutoAccept,
    formatPlayLock,
    playGateOk,
    ensureBestiaryEntry,
    seedContractUnlocks,
    isContractUnlocked,
    unlockNextInArea,
    maybeUnlockFromProgress,
    masteryGoldMult,
    masteryChestChance,
    masteryImproveCost,
    improveMastery,
    contractsInArea,
    activeMasteryPerkText,
    nextMasteryPerkText,
    rollSignatureLoot,
  };
})();
