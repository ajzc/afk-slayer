/** Live Hunt arena — directional bolt combat + AFK hunters */
(function () {
  // Floor art: CSS tiled art/v3b/env/floor_tile.png (cool slate). bg = fallback only.
  const AREA_THEMES = {
    sewers: {
      bg: '#1c2228',
      accent: '#6a8a9a', name: 'Level 1', floor: '#1c2228', subtitle: "Turael's Cave",
    },
    mistwood: {
      bg: '#1c2228',
      accent: '#5a7a90', name: 'Level 2', floor: '#1c2228',
    },
    crypt: {
      bg: '#1c2228',
      accent: '#8a7a90', name: 'Level 3', floor: '#1c2228',
    },
    ashrim: {
      bg: '#1c2228',
      accent: '#c07050', name: 'Level 4', floor: '#1c2228',
    },
  };

  // Intervals: ATTACK_SPEED_MULT for everyone; HUNTER_SPEED_MULT stacks on hunters only
  const SPEED = () => (window.CB_DATA && window.CB_DATA.ATTACK_SPEED_MULT) || 40;
  const HUNTER_SPD = () => (window.CB_DATA && window.CB_DATA.HUNTER_SPEED_MULT) || 25;
  const DMG = () => (window.CB_DATA && window.CB_DATA.GLOBAL_DMG_MULT) || 0.12;
  const BEAM_PWR = () => (window.CB_DATA && window.CB_DATA.BEAM_POWER_MULT) || 0.015;
  const BOLT_PWR = BEAM_PWR; // alias — keep DPS ballpark of former beam
  // Visual/FX only — combat dmg & cadence live in CB_DATA.HUNTER_COMBAT (independent of player bolts)
  const HUNTER_FX = {
    briar: { color: '#ffff00', projectile: null, role: 'melee', weapon: 'sword' },
    quill: { color: '#00c800', projectile: 'arrow', role: 'ranged', weapon: 'bow' },
    moss:  { color: '#c8a050', projectile: null, role: 'melee', weapon: 'axe' },
    ember: { color: '#ff981f', projectile: 'fire', role: 'mage', weapon: 'staff' },
  };
  // Global hunter-chip scale (hunter track only — never reads player bolt DPS)
  const HUNTER_DMG = () => (window.CB_DATA && window.CB_DATA.HUNTER_DMG_MULT != null)
    ? window.CB_DATA.HUNTER_DMG_MULT : 1.0;
  /** Design-default pacing refs — bolt HP chip scales relative to these */
  const DMG_REF = 0.12;
  const BEAM_REF = 0.015;
  /* Bolt chips are ABSOLUTE from weapon power — never sized from target HP to force a TTK.
   * Benchmarks (e.g. ~60s Tier Test) are tuning targets only; see design/benchmarks-not-timers.md */
  const BASE_BOLT_CHIP = 10; // chip at idlePower=1, raw=1.25, no killMult

  const MELEE_RANGE = 12; // % of arena — reach vs 0.864 sprite scale
  // Base deliberately sluggish; Company pace upgrades multiply via hunterMoveSpeed
  const MELEE_SPEED = 28; // % per second at hire (~28%/s — frustratingly slow, not frozen)
  const MELEE_SPEED_MAX = 92; // soft cap after Swift Walk / Faster Chase / Hard Charge (was 58 — Charge was almost wasted)
  const GEAR_TINTS = [
    '#6a5a40', '#b87333', '#8a8a8a', '#c8c8d0',
    '#5a8aaa', '#2d8a4e', '#3a6ec9', '#c03020',
  ];

  function getConfiguredActiveMult() {
    return (window.CB_DATA && window.CB_DATA.ACTIVE_MULT != null) ? window.CB_DATA.ACTIVE_MULT : 1.4;
  }
  const ACTIVE_MULT = getConfiguredActiveMult(); // economy holding boost (was 3.5)
  const WAVE_SIZE = 3;
  const VISUAL_FPS = 30;
  const VISUAL_MS = 1000 / VISUAL_FPS;
  /** Visual hits per economy-kill equivalent (Obelisk laser subdivision) */
  const VISUAL_SUBDIV = 14;
  function getMonsterVisualHp(contractOrBoss) {
    const base = (window.CB_DATA && window.CB_DATA.MONSTER_VISUAL_HP) || 150;
    const st = getState ? getState() : null;
    let c = contractOrBoss;
    if (!c && st && window.CB_STATE && window.CB_STATE.isBossFightActive(st)) {
      c = window.CB_STATE.getActiveBoss(st);
    }
    if (!c) c = currentContract();
    const combat = (c && c.combat) || {};
    let mult = (combat.hpMult != null) ? Number(combat.hpMult) : 1;
    if (combat.hpMultNoPierce != null) {
      const pierce = (st && window.CB_STATE)
        ? (window.CB_STATE.getBonuses(st).boltPierce || 0)
        : 0;
      if (pierce < 1) mult = Number(combat.hpMultNoPierce);
    }
    return Math.max(40, Math.round(base * mult));
  }

  function currentContract() {
    const st = getState ? getState() : null;
    if (!st || !st.currentContractId || !window.CB_STATE) return null;
    return window.CB_STATE.getContract(st.currentContractId);
  }

  function combatOf(contract) {
    const c = contract || currentContract();
    return (c && c.combat) || {};
  }

  function boltHitWidth(contract) {
    const mult = Number(combatOf(contract).hitWidthMult);
    return BOLT_HIT_WIDTH * (mult > 0 ? mult : 1);
  }

  function aimAssistDeg(contract) {
    const mod = Number(combatOf(contract).aimAssistMod) || 0;
    const solo = activeMobCount === 1 && wave.length === 1 && !(wave[0] && wave[0].isBoss);
    return Math.max(4, BOLT_AIM_ASSIST_DEG + mod + (solo ? SOLO_AIM_ASSIST_BONUS : 0));
  }

  let shellBuilt = false;
  let holding = false;
  // feel2: monsters on screen (design/monster-count.md)
  let activeMobCount = 0;      // slots live this task (never drops mid-task)
  let activeMobKey = '';       // task key the count belongs to
  let lastKnownMobCount = null; // null until first build after load → no toast on load
  let lastMobParts = null;
  let waveCarry = null;        // same-task rebuild (e.g. a hire) keeps living monsters' HP/positions
  let growCheckAt = 0;
  const TAP_SNAP_PCT = 14;       // xp1: tap within this arena-% radius of a monster = aim at it
  let arenaKeyFocus = false;     // xp1 (retest d): W/S/arrows only after the arena was last pressed
  let soloSnap = null;         // { mobId, px, py } held aim follows the solo respawn until the finger moves
  let lastPtrPct = null;
  const SOLO_RESPAWN_MS = 150;
  const SOLO_WALKIN_S = 0.6;
  const SOLO_AIM_ASSIST_BONUS = 0; // +2 if solo SL1 kills/min drops >10% (spec §4) — see feel2 report
  let aimX = 50; // pointer aim % — bolt fires from player toward this
  let aimY = 35;
  let lockedMobId = null; // optional focus (tap); bolts aim by direction, not lock
  let ptrDownMeta = null; // {t, x, y, onMob} for tap-vs-hold / clear-lock
  let lastSplatAt = {}; // mobId -> timestamp for 180ms splat cap
  const SPLAT_GAP_MS = 180;
  const BOLT_HIT_WIDTH = 10.2; // % arena lateral hit tolerance (~35% wider than 7.5)
  const BOLT_AIM_ASSIST_DEG = 16; // soft snap toward nearest mob within this angle
  const BOLT_RANGE = 100;
  let dirtyKey = '';
  let lastVisual = 0;
  let rafId = 0;
  let sparkQueue = 0;
  let lastGold = 0;
  let lastPoints = 0;
  let lastScraps = 0;
  let lastFood = 0;
  let hunterTimers = {};
  let hunterRuntime = {}; // id -> {x,y,homeX,homeY,targetId,facing,swingUntil,pauseUntil}
  let patrolPhase = 0;
  let getState = null;
  let onHoldChange = null;
  let boltTickAcc = 0;
  let chestJiggleAcc = 0;
  let floatCap = 0;
  let killCoinStaggerUntil = 0;
  let killCoinStaggerN = 0;
  let wave = []; // { id, hp, maxHp, el, emoji }
  let focusIdx = 0;
  let visualKillAcc = 0;
  let lastGpm = 0;

  // Information spectacle (text/UI)
  let sessionXp = 0;
  let lifetimeXpBase = 0;
  let displayXp = 0;
  let splatCap = 0;
  let splatStack = 0;
  let tickerIdx = 0;
  let tickerAcc = 0;
  let lastTickerKey = '';
  let taskStreak = 0;
  let lastContractsDone = 0;
  let sessionStartKills = null;
  let lastCounterSnap = {};
  let xpDropCap = 0;
  let visualDpsWindow = []; // {t, dmg}
  let sessionTaskKills = 0;
  let recentKillMs = [];
  let autoEvalCooldownUntil = 0;
  let switcherLockHintUntil = 0;
  let specialAcc = 0;
  let boltHintShots = 0;
  let boltHintHoldMs = 0;
  let boltHintFading = false;
  let huntSheetOpen = false;
  const BOSS_MOMENT_MS = 1100; // feel1: boss death beat before the next Level loads
  let bossMomentUntil = 0; // feel1: Hunters · Food · Bosses panel state across rebuilds

  const GEAR_ARMOR = [
    { tier: 0, weapon: 'Unarmed', armor: 'Rags', emoji: '🥋' },
    { tier: 1, weapon: 'Bronze Blade', armor: 'Bronze Plate', emoji: '🗡️' },
    { tier: 2, weapon: 'Iron Blade', armor: 'Iron Plate', emoji: '🗡️' },
    { tier: 3, weapon: 'Steel Blade', armor: 'Steel Plate', emoji: '⚔️' },
    { tier: 4, weapon: 'Mithril Blade', armor: 'Mithril Plate', emoji: '⚔️' },
    { tier: 5, weapon: 'Adamant Blade', armor: 'Adamant Plate', emoji: '🛡️' },
    { tier: 6, weapon: 'Rune Blade', armor: 'Rune Plate', emoji: '✨' },
    { tier: 7, weapon: 'Dragon Blade', armor: 'Dragon Plate', emoji: '🐉' },
  ];

  const els = {};

  function isHolding() {
    return holding;
  }

  function getActiveMult() {
    return holding ? getConfiguredActiveMult() : 1;
  }

  function bind(opts) {
    getState = opts.getState;
    onHoldChange = opts.onHoldChange || null;
  }

  function markDirty() {
    dirtyKey = '';
    shellBuilt = false;
  }

  function ensureShell(state) {
    const panel = document.getElementById('hunt-body');
    if (!panel) return false;

    const contract = state.currentContractId
      ? window.CB_STATE.getContract(state.currentContractId)
      : null;
    const hunterKey = window.CB_DATA.hunters
      .filter(h => state.hunters[h.id]?.unlocked)
      .map(h => h.id)
      .join(',');
    const bossKey = (state.bossFight && state.bossFight.active && state.bossFight.preyId)
      ? ('boss:' + state.bossFight.preyId) : 'noboss';
    const key = (contract?.id || 'none') + '|' + hunterKey + '|' + (contract?.areaId || 'sewers') + '|' + bossKey;

    if (shellBuilt && dirtyKey === key && panel.querySelector('.arena')) {
      return true;
    }
    // feel1: keep the old arena on screen during the boss death beat
    if (performance.now() < bossMomentUntil && panel.querySelector('.arena')) return true;

    // feel2: a rebuild inside the same task (hire, etc.) keeps the monsters where they were
    const taskKey = (contract?.id || 'none') + '|' + bossKey;
    waveCarry = (activeMobKey === taskKey && bossKey === 'noboss' && wave.length)
      ? wave.map(m => (m && m.hp > 0 && m.el && !m.el.classList.contains('dying'))
        ? { hp: m.hp, maxHp: m.maxHp, baseX: m.baseX, baseY: m.baseY, liveX: m.liveX, liveY: m.liveY, slotIndex: m.slotIndex, state: m.state, enterFrom: m.enterFrom, enterStartX: m.enterStartX, enterT: m.enterT, enterDur: m.enterDur }
        : null)
      : null;
    dirtyKey = key;
    shellBuilt = true;
    hunterTimers = {};
    hunterRuntime = {};
    buildShell(panel, state, contract);
    wireHold(panel);
    return true;
  }


  function getGearTier(state) {
    return getGearInfo(state).tier;
  }

  function gearTint(state) {
    return GEAR_TINTS[Math.min(getGearTier(state), GEAR_TINTS.length - 1)] || GEAR_TINTS[0];
  }

  function hunterFigHtml(hunter, fx, tint) {
    // Option C strips for Briar / Quill; CSS stick-fig fallback for Moss/Ember
    if (window.CB_SPRITES && window.CB_SPRITES.hasHunter(hunter.id)) {
      const html = window.CB_SPRITES.hunterHtml(hunter.id);
      if (html) return html;
    }
    const weapon = fx.weapon || hunter.weapon || 'sword';
    const role = fx.role || hunter.role || 'melee';
    return `<div class="fig fig-hunter" data-weapon="${weapon}" data-role="${role}" style="--gear-color:${tint};--accent:${fx.color}">
      <span class="fh-shadow"></span>
      <span class="fh-leg fh-leg-l"></span>
      <span class="fh-leg fh-leg-r"></span>
      <span class="fh-torso"></span>
      <span class="fh-arm fh-arm-l"></span>
      <span class="fh-swing">
        <span class="fh-arm fh-arm-r"></span>
        <span class="fh-weapon fh-weapon-${weapon}"></span>
      </span>
      <span class="fh-head"></span>
    </div>`;
  }

  function mobVisualKey(contract) {
    if (contract && contract.visual) return contract.visual;
    const area = contract?.areaId || 'sewers';
    const fallback = { sewers: 'gripkin', mistwood: 'ashfang_pup', crypt: 'silkling', ashrim: 'gripkin' };
    return fallback[area] || 'gripkin';
  }

  function mobFigHtml(visual) {
    const v = visual || 'crawler';
    if (window.CB_SPRITES && window.CB_SPRITES.hasMob(v)) {
      const html = window.CB_SPRITES.mobHtml(v);
      if (html) return html;
    }
    // Chunky original-IP silhouettes — CSS paints the parts
    return `<div class="fig fig-mob fig-mob-${v}" data-visual="${v}">
      <span class="fm-shadow"></span>
      <span class="fm-limb fm-l1"></span>
      <span class="fm-limb fm-l2"></span>
      <span class="fm-body"></span>
      <span class="fm-head"></span>
      <span class="fm-accent"></span>
    </div>`;
  }

  function distPct(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function mobPosPct(mob) {
    if (!mob || !mob.el) return { x: 50, y: 40 };
    // Prefer live (wander) position; fall back to slot base
    const x = mob.liveX != null ? mob.liveX : (mob.baseX != null ? mob.baseX : 50);
    const y = mob.liveY != null ? mob.liveY : (mob.baseY != null ? mob.baseY : 40);
    return { x, y };
  }

  /** ~10 park/spawn spots across the arena (left/right/depth). WAVE_SIZE mobs pick from these. */
  /* Left inset keeps mobs clear of PERM/BOOST tubes (~10%+ of arena width) */
  const SPAWN_SLOTS = [
    { x: 32, y: 20 }, { x: 46, y: 18 }, { x: 60, y: 20 }, { x: 76, y: 19 },
    // feel1: was {x:80,y:34} — sat under the target switcher (x≥80.5%, y 33–56%)
    { x: 34, y: 36 }, { x: 50, y: 32 }, { x: 66, y: 36 }, { x: 72, y: 46 },
    { x: 40, y: 50 }, { x: 58, y: 52 },
  ];

  /** feel1: arena-% box mobs may not park/wander into (switcher is right:8px, top≈46%). */
  const SWITCHER_LANE = { x0: 73, y0: 28, y1: 62 };

  function slotPos(i) {
    return SPAWN_SLOTS[i % SPAWN_SLOTS.length];
  }

  /** feel2: park slot hidden under an open overlay (intro panel / switcher)? */
  function slotBlocked(i) {
    const sl = SPAWN_SLOTS[i];
    if (!sl) return false;
    wanderBlocksAt = 0;
    refreshWanderBlocks(performance.now());
    return wanderBlocks.some(bl => sl.x > bl.x0 && sl.x < bl.x1 && sl.y > bl.y0 && sl.y < bl.y1);
  }
  function unblockedFirst(list) {
    const ok = list.filter(i => !slotBlocked(i));
    return ok.length ? ok.concat(list.filter(i => ok.indexOf(i) < 0)) : list;
  }

  function pickDistinctSlotIndices(n, preferClump) {
    return unblockedFirst(pickDistinctSlotIndicesRaw(SPAWN_SLOTS.length, preferClump)).slice(0, Math.min(n, SPAWN_SLOTS.length));
  }
  function pickDistinctSlotIndicesRaw(n, preferClump) {
    const idx = SPAWN_SLOTS.map((_, i) => i);
    if (preferClump) {
      // Prefer central mid-row slots (indices 4–7) so pierce chains feel good
      idx.sort((a, b) => {
        const score = (i) => {
          const s = SPAWN_SLOTS[i];
          const dx = s.x - 50;
          const dy = s.y - 34;
          return dx * dx + dy * dy;
        };
        return score(a) - score(b) + (Math.random() - 0.5) * 8;
      });
      return idx.slice(0, Math.min(n, idx.length));
    }
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    return idx.slice(0, Math.min(n, idx.length));
  }

  function pickFreeParkSlot(excludeMobId, preferClump) {
    const occupied = new Set();
    wave.forEach((m) => {
      if (!m || m.id === excludeMobId) return;
      if (m.hp > 0 && m.slotIndex != null) occupied.add(m.slotIndex);
    });
    const free = [];
    for (let i = 0; i < SPAWN_SLOTS.length; i++) {
      if (!occupied.has(i)) free.push(i);
    }
    let pool = free.length ? free : SPAWN_SLOTS.map((_, i) => i);
    { const clear = pool.filter(i => !slotBlocked(i)); if (clear.length) pool = clear; } // feel2
    if (preferClump && pool.length > 1) {
      pool = pool.slice().sort((a, b) => {
        const score = (i) => {
          const s = SPAWN_SLOTS[i];
          const dx = s.x - 50;
          const dy = s.y - 34;
          return dx * dx + dy * dy;
        };
        return score(a) - score(b);
      });
      // Bias toward first 3 closest free slots
      const top = pool.slice(0, Math.min(3, pool.length));
      return top[Math.floor(Math.random() * top.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function buildShell(panel, state, contract) {
    const areaId = contract?.areaId || 'sewers';
    const theme = AREA_THEMES[areaId] || AREA_THEMES.sewers;
    const D = window.CB_DATA;
    const unlocked = D.hunters.filter(h => state.hunters[h.id]?.unlocked);
    const positions = placeHunters(unlocked.length);

    const tint = gearTint(state);
    const huntersHtml = unlocked.map((h, i) => {
      const p = positions[i];
      const fx = HUNTER_FX[h.id] || HUNTER_FX.briar;
      const role = fx.role || h.role || 'melee';
      hunterTimers[h.id] = performance.now() + 120 + i * 140;
      hunterRuntime[h.id] = {
        x: p.x, y: p.y, homeX: p.x, homeY: p.y,
        targetId: null, facing: p.x < 50 ? 1 : -1,
        swingUntil: 0, pauseUntil: 0, role,
      };
      const projAttr = fx.projectile ? ` data-proj="${fx.projectile}"` : ' data-proj=""';
      const stationed = h.id === 'quill';
      const useSprite = window.CB_SPRITES && window.CB_SPRITES.hasHunter(h.id);
      const standHtml = (stationed && !useSprite)
        ? '<div class="drone-stand" aria-hidden="true"><span class="ds-plinth"></span><span class="ds-post"></span></div>'
        : '';
      return `<div class="drone drone-${role}${stationed ? ' drone-stationed' : ''}${useSprite ? ' drone-sprite' : ''}" data-hunter="${h.id}" data-role="${role}"${projAttr}
        style="left:${p.x}%;top:${p.y}%;--drone-color:${fx.color};--gear-color:${tint}" title="${h.name}">
        ${standHtml}
        <div class="drone-scale">
          <span class="drone-glow"></span>
          ${hunterFigHtml(h, fx, tint)}
        </div>
        <span class="drone-tag">${h.name}</span>
      </div>`;
    }).join('');

    const bossActive = window.CB_STATE && window.CB_STATE.getActiveBoss
      ? window.CB_STATE.getActiveBoss(state) : null;
    const monsterEmoji = bossActive ? bossActive.emoji : (contract ? contract.emoji : '🪨');
    function monsterChipLabel(c, boss) {
      function withLv(n, lv) {
        if (!n) return '';
        if (!lv) return n;
        if (/\bLv\s*\d+/i.test(n)) return n;
        return n + ' · Lv ' + lv;
      }
      if (boss) {
        return withLv(window.CB_STATE.bossDisplayName(boss), boss.displayLevel || boss.level);
      }
      if (!c) return '';
      const n = window.CB_STATE && window.CB_STATE.displayName ? window.CB_STATE.displayName(c) : c.name;
      return withLv(n, c.displayLevel || c.level);
    }
    const monsterName = monsterChipLabel(contract, bossActive) || 'No contract';
    const monsterVisual = bossActive
      ? (bossActive.visual || 'elder_thornpelt')
      : mobVisualKey(contract);

    // Column of rock/monster targets (positions set by initWave / walk-in)
    let waveHtml = '';
    for (let i = 0; i < WAVE_SIZE; i++) {
      const slot = slotPos(i);
      waveHtml += `<div class="mob entering" data-slot="${i}" data-visual="${monsterVisual}" style="left:-8%;top:${slot.y}%;">
        <div class="mob-body">${mobFigHtml(monsterVisual)}</div>
        <div class="mob-hp"><div class="mob-hp-fill" style="width:100%"></div></div>
      </div>`;
    }

    panel.innerHTML = `
      <!-- Soft sync targets (hidden): keep update loops happy without clutter -->
      <div class="hunt-sync-hidden" aria-hidden="true">
        <div class="gear-strip" id="gear-strip">
          <span class="gs-label">Gear</span>
          <span class="gear-badge weapon" id="gear-weapon">🥋 Unarmed</span>
          <span class="gear-badge armor" id="gear-armor">🥋 Rags</span>
          <span class="gear-next" id="gear-next">Next: —</span>
        </div>
        <div class="slayer-panel" id="slayer-panel">
          <div class="sp-head">
            <span class="sp-emoji" id="sp-emoji">${monsterEmoji}</span>
            <div>
              <div class="sp-title" id="sp-title">${monsterName}</div>
              <div class="sp-flavor" id="sp-flavor">Assigned by Guild Master</div>
            </div>
          </div>
          <div class="sp-row">
            <span class="sp-quota" id="sp-quota">0 / —</span>
            <span class="sp-streak" id="sp-streak">Streak ×0</span>
          </div>
          <div class="sp-bar"><div class="sp-bar-fill" id="sp-bar-fill" style="width:0%"></div></div>
          <div class="sp-reward" id="sp-reward">Finish reward: —</div>
        </div>
        <div class="live-stats dense slim" id="live-stats">
          <div class="ls-chip"><span class="ls-l">DPS</span><span class="ls-v" id="ls-dps">0</span></div>
          <div class="ls-chip"><span class="ls-l">Gold/h</span><span class="ls-v" id="ls-gph">0</span></div>
          <div class="ls-chip"><span class="ls-l">Chest</span><span class="ls-v" id="ls-chest">0%</span></div>
          <div class="ls-chip"><span class="ls-l">Boost</span><span class="ls-v" id="ls-boost">—</span></div>
          <div class="ls-chip active-chip hidden" id="ls-active"><span class="ls-l">BOLT</span><span class="ls-v" id="ls-bonus">×${getConfiguredActiveMult()}</span></div>
          <div class="ls-chip hidden"><span class="ls-v" id="ls-taskk">0</span></div>
          <div class="ls-chip hidden"><span class="ls-v" id="ls-gpm">0</span></div>
          <div class="ls-chip hidden"><span class="ls-v" id="ls-kpm">0</span></div>
          <div class="ls-chip hidden"><span class="ls-v" id="ls-kph">0</span></div>
          <div class="ls-chip hidden"><span class="ls-v" id="ls-foodeta">—</span></div>
          <div class="ls-chip hidden"><span class="ls-v" id="ls-comp">0%</span></div>
          <div class="ls-chip hidden"><span class="ls-v" id="ls-kills">0</span></div>
          <div class="ls-chip hidden"><span class="ls-v" id="ls-prey">—</span></div>
        </div>
      </div>

      <div class="arena area-${areaId}" id="arena" style="--arena-accent:${theme.accent}">
        <div id="intro-dock" class="intro-dock" hidden></div>
        <div class="arena-vignette"></div>
        <div class="arena-floor"></div>
        <div class="event-ticker quiet" id="event-ticker"><span class="et-line empty" id="et-line"></span></div>
        <div class="active-badge hidden" id="active-badge">Bolts ×${getConfiguredActiveMult()}</div>

        ${window.CB_CHESTS ? window.CB_CHESTS.overlayHtml() : ''}

        <div class="arena-particles" id="arena-particles"></div>
        <div class="proj-layer" id="proj-layer"></div>
        <div class="float-layer" id="float-layer"></div>
        <div class="splat-layer" id="splat-layer"></div>

        <div class="wave-column" id="wave-column">${waveHtml}</div>

        <div class="drones" id="drone-layer">${huntersHtml}</div>

        <div class="player-avatar player-sprite" id="player-avatar">
          <div class="player-emoji player-fig">
            ${(window.CB_SPRITES && window.CB_SPRITES.hasPlayer && window.CB_SPRITES.hasPlayer())
              ? window.CB_SPRITES.playerHtml()
              : `<div class="fig fig-hunter fig-player" data-weapon="staff" data-role="mage" style="--gear-color:#5a4a8a;--accent:#ffff00">
              <span class="fh-shadow"></span>
              <span class="fh-leg fh-leg-l"></span>
              <span class="fh-leg fh-leg-r"></span>
              <span class="fh-torso"></span>
              <span class="fh-arm fh-arm-l"></span>
              <span class="fh-swing">
                <span class="fh-arm fh-arm-r"></span>
                <span class="fh-weapon fh-weapon-staff"></span>
              </span>
              <span class="fh-head"></span>
            </div>`}
          </div>
        </div>
        <div class="arena-hint${(state.hints && state.hints.boltAim) ? ' hint-gone' : ''}" id="player-hint">hold toward a monster to fire bolts</div>

        <div class="hold-zone" id="hold-zone" aria-label="Hold toward a monster to fire bolts"></div>

        <div class="monster-name${(bossActive || contract) ? '' : ' hidden'}" id="monster-name">${bossActive ? (window.CB_STATE.bossDisplayName(bossActive)) : (contract ? monsterName : '')}</div>

        <div class="boss-hp-overlay${bossActive ? ' show' : ''}" id="boss-hp-overlay">
          <div class="boss-hp-lab" id="boss-hp-lab">Boss HP</div>
          <div class="boss-hp-wrap"><div class="boss-hp-fill" id="boss-hp-fill" style="width:0%"></div></div>
        </div>

        <div class="target-switcher${bossActive ? ' hidden' : ''}" id="target-switcher" aria-label="Hunt target">
          <button type="button" class="ts-btn ts-up" id="ts-up" data-action="target-up" title="Tougher monster" aria-label="Tougher monster">▲</button>
          <div class="ts-chip" id="ts-chip" title="Current hunt target">—</div>
          <button type="button" class="ts-btn ts-down" id="ts-down" data-action="target-down" title="Easier monster" aria-label="Easier monster">▼</button>
          <button type="button" class="ts-btn ts-auto" id="ts-auto" data-action="target-auto" title="Auto: pick toughest target your setup clears well" aria-pressed="false">Auto</button>
        </div>

        <div class="task-dock${(bossActive || contract) ? '' : ' need-task'}${bossActive ? ' boss-fight' : ''}" id="task-dock">
          <div class="task-row">
            <span class="task-name" id="hp-label">${bossActive ? ('Boss fight') : (contract ? 'Task · 0 / — kills' : 'Pick a task at Slayer Master')}</span>
            <span class="task-reward${contract && !bossActive ? '' : ' hidden'}" id="task-reward-inline">Finish: —</span>
            <button type="button" class="task-pick-btn${contract || bossActive ? ' hidden' : ''}" id="task-pick-btn" data-action="goto-board">Slayer Master</button>
            <button type="button" class="btn ghost small boss-leave-btn${bossActive ? '' : ' hidden'}" id="boss-leave-btn" data-action="flee-boss" data-id="${bossActive ? bossActive.id : ''}" title="Exit fight — boss HP resets, access kept">Leave fight</button>
          </div>
          <div class="hp-bar-wrap" title="Contract kill quota for this task">
            <div class="hp-bar" id="hp-bar" style="width:0%"></div>
          </div>
        </div>
      </div>

      <div class="hunt-sheet${huntSheetOpen ? ' open' : ''}" id="hunt-sheet">
        <button type="button" class="hunt-sheet-toggle" id="hunt-sheet-toggle" aria-expanded="${huntSheetOpen ? 'true' : 'false'}">
          <span>Hunters · Food · Bosses</span>
          <span class="sheet-chev" aria-hidden="true">▾</span>
        </button>
        <div class="hunt-sheet-body">
          <div class="hunter-contrib quiet-contrib" id="hunter-contrib"></div>
          <div class="card compact-card stone-panel" id="hunt-side">
            <div class="row-between">
              <div>
                <strong>🍞 Food</strong>
                <p class="muted tiny" id="food-meta-regen">—</p>
                <p class="muted tiny" id="food-meta-eff">—</p>
              </div>
              <button type="button" class="btn small" data-action="buy-food">+40 food · ${(window.CB_FMT && window.CB_FMT.goldChipHtml) ? window.CB_FMT.goldChipHtml(10) : '10 gold'}</button>
            </div>
            <div class="bar-wrap food">
              <div class="bar" id="food-bar" style="width:0%"></div>
            </div>
          </div>
          <div id="prey-panel"></div>
        </div>
      </div>
        `;

    els.arena = document.getElementById('arena');
    els.monsterName = document.getElementById('monster-name');
    els.hpBar = document.getElementById('hp-bar');
    els.hpLabel = document.getElementById('hp-label');
    els.taskRewardInline = document.getElementById('task-reward-inline');
    els.floatLayer = document.getElementById('float-layer');
    els.splatLayer = document.getElementById('splat-layer');
    els.particles = document.getElementById('arena-particles');
    els.projLayer = document.getElementById('proj-layer');
    els.holdZone = document.getElementById('hold-zone');
    els.activeBadge = document.getElementById('active-badge');
    els.lsActive = document.getElementById('ls-active');
    els.taskDock = document.getElementById('task-dock');
    els.taskPickBtn = document.getElementById('task-pick-btn');
    els.bossLeaveBtn = document.getElementById('boss-leave-btn');
    els.bossHpOverlay = document.getElementById('boss-hp-overlay');
    els.bossHpFill = document.getElementById('boss-hp-fill');
    els.bossHpLab = document.getElementById('boss-hp-lab');
    els.targetSwitcher = document.getElementById('target-switcher');
    els.tsUp = document.getElementById('ts-up');
    els.tsDown = document.getElementById('ts-down');
    els.tsChip = document.getElementById('ts-chip');
    els.tsAuto = document.getElementById('ts-auto');
    const sheetToggle = document.getElementById('hunt-sheet-toggle');
    const sheet = document.getElementById('hunt-sheet');
    if (sheetToggle && sheet && !sheetToggle._wired) {
      sheetToggle._wired = true;
      sheetToggle.addEventListener('click', () => {
        const open = sheet.classList.toggle('open');
        huntSheetOpen = open; // feel1: survives arena rebuilds (target switch, boss, new task)
        sheetToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) revealHuntSheet(sheet);
      });
    }
    els.droneLayer = document.getElementById('drone-layer');
    els.hunterContrib = document.getElementById('hunter-contrib');
    els.preyPanel = document.getElementById('prey-panel');
    els.foodBar = document.getElementById('food-bar');
    els.foodMetaRegen = document.getElementById('food-meta-regen');
    els.foodMetaEff = document.getElementById('food-meta-eff');
    els.lsGpm = document.getElementById('ls-gpm');
    els.lsKpm = document.getElementById('ls-kpm');
    els.lsKph = document.getElementById('ls-kph');
    els.lsKills = document.getElementById('ls-kills');
    els.lsPrey = document.getElementById('ls-prey');
    els.lsBonus = document.getElementById('ls-bonus');
    els.lsDps = document.getElementById('ls-dps');
    els.lsTaskk = document.getElementById('ls-taskk');
    els.lsGph = document.getElementById('ls-gph');
    els.lsFoodeta = document.getElementById('ls-foodeta');
    els.lsChest = document.getElementById('ls-chest');
    els.lsBoost = document.getElementById('ls-boost');
    els.lsComp = document.getElementById('ls-comp');
    els.waveColumn = document.getElementById('wave-column');
    els.player = document.getElementById('player-avatar');
    els.beam = null; // beam removed — directional bolts
    els.playerHint = document.getElementById('player-hint');
    els.etLine = document.getElementById('et-line');
    els.gearWeapon = document.getElementById('gear-weapon');
    els.gearArmor = document.getElementById('gear-armor');
    els.gearNext = document.getElementById('gear-next');
    els.spEmoji = document.getElementById('sp-emoji');
    els.spTitle = document.getElementById('sp-title');
    els.spFlavor = document.getElementById('sp-flavor');
    els.spQuota = document.getElementById('sp-quota');
    els.spStreak = document.getElementById('sp-streak');
    els.spBarFill = document.getElementById('sp-bar-fill');
    els.spReward = document.getElementById('sp-reward');
    els.spBar = document.querySelector('.slayer-panel .sp-bar');

    lastGold = state.gold;
    lastPoints = state.points;
    lastScraps = state.scraps;
    lastFood = state.food;
    sparkQueue = 0;
    boltTickAcc = 0;
    visualKillAcc = 0;
    focusIdx = 0;
    lockedMobId = null;
    ptrDownMeta = null;
    lastSplatAt = {};
    chestJiggleAcc = 0;
    splatCap = 0;
    splatStack = 0;
    tickerAcc = 0;
    if (sessionStartKills === null) sessionStartKills = state.totalKills || 0;
    lifetimeXpBase = state.guildXp || 0;
    displayXp = lifetimeXpBase + sessionXp;
    lastContractsDone = state.totalContracts || 0;
    syncXpDock(true);
    updateGearStrip(state);
    syncBeamTier(state);
    specialAcc = 0;

    initWave(monsterEmoji, monsterVisual);

    if (holding && els.arena) {
      els.arena.classList.add('holding');
      if (els.activeBadge) els.activeBadge.classList.remove('hidden');
      if (els.lsActive) els.lsActive.classList.remove('hidden');
      if (els.playerHint) els.playerHint.classList.add('hidden');
      if (els.player) els.player.classList.add('firing');
    }

    updatePreyPanel(state);
    updateHunterContrib(state, contract);
  }

  function initWave(emoji, visual) {
    wave = [];
    if (!els.waveColumn) return;
    const st0 = getState ? getState() : null;
    const boss = (st0 && window.CB_STATE && window.CB_STATE.getActiveBoss)
      ? window.CB_STATE.getActiveBoss(st0) : null;
    const vis = (boss && boss.visual) || visual || 'bristle_cub';
    const slots = els.waveColumn.querySelectorAll('.mob');
    const contract = currentContract();
    const combat = boss ? (boss.combat || {}) : combatOf(contract);
    const parkIdx = pickDistinctSlotIndices(slots.length, !!combat.clump);
    const hp = getMonsterVisualHp(boss || contract);
    const spawnMult = (combat.spawnMult != null && combat.spawnMult > 0) ? Number(combat.spawnMult) : 1;
    const bossMode = !!boss;
    // feel2: only the first mobCountFor(state) slots are live; Tier Tests stay at 1
    const taskKey = (contract ? contract.id : 'none') + '|' + (bossMode && boss ? 'boss:' + boss.id : 'noboss');
    let n = 1;
    if (!bossMode) {
      const want = desiredMobCount(st0);
      n = (taskKey === activeMobKey) ? Math.max(activeMobCount, want) : want;
      n = Math.max(1, Math.min(WAVE_SIZE, slots.length, n));
      announceMobGrowth(n, st0);
      activeMobCount = n;
      activeMobKey = taskKey;
    }
    const carry = (!bossMode && waveCarry) ? waveCarry : null;
    waveCarry = null;
    slots.forEach((el, i) => {
      if (i >= n) {
        el.style.display = 'none';
        el.classList.add('hidden');
        return;
      }
      const si = parkIdx[i] != null ? parkIdx[i] : (i % SPAWN_SLOTS.length);
      const mob = makeMob(el, i, si, { vis, emoji, hp, boss: bossMode ? boss : null, spawnMult });
      const c = carry && carry[i];
      if (c) {
        // Same task, rebuilt shell: keep HP + place, no re-walk
        Object.assign(mob, { hp: c.hp, maxHp: c.maxHp, baseX: c.baseX, baseY: c.baseY, liveX: c.liveX, liveY: c.liveY, slotIndex: c.slotIndex });
        const fill = el.querySelector('.mob-hp-fill');
        if (fill) fill.style.width = Math.max(0, Math.min(100, (c.hp / Math.max(1, c.maxHp)) * 100)) + '%';
        if (c.state === 'entering') {
          Object.assign(mob, { enterFrom: c.enterFrom, enterStartX: c.enterStartX, enterT: c.enterT, enterDur: c.enterDur });
          syncMobEl(mob);
        } else {
          finishWalkIn(mob);
          mob.liveX = c.liveX; mob.liveY = c.liveY;
          syncMobEl(mob);
        }
      }
      wave.push(mob);
    });
    setFocus(0);
  }

  /** One monster slot → wave entry, starting off-screen and walking in. */
  function makeMob(el, i, si, o) {
    const slot = SPAWN_SLOTS[si];
    el.style.display = '';
    el.classList.remove('hidden');
    const body = el.querySelector('.mob-body');
    if (body) body.innerHTML = mobFigHtml(o.vis);
    el.dataset.visual = o.vis;
    el.classList.toggle('is-boss', !!o.boss);
    const fill = el.querySelector('.mob-hp-fill');
    if (fill) fill.style.width = '100%';
    el.classList.remove('dying', 'focus', 'hit', 'hit-flash', 'telegraph', 'attacking', 'spawn', 'alive', 'on-target', 'wandering');
    el.style.setProperty('--wx', '0px');
    el.style.setProperty('--jig', '0px');
    el.style.removeProperty('--track');
    const baseEnter = 2.0 + Math.random() * 1.0;
    const mob = {
      id: i,
      slotIndex: si,
      hp: o.hp,
      maxHp: o.hp,
      el,
      emoji: o.boss ? o.boss.emoji : o.emoji,
      visual: o.vis,
      isBoss: !!o.boss,
      bossPreyId: o.boss ? o.boss.id : null,
      baseX: slot.x,
      baseY: slot.y,
      liveX: slot.x,
      liveY: slot.y,
      wanderPhase: Math.random() * 12,
      telegraphUntil: 0,
      state: 'entering',
      enterFrom: (i % 2 === 0) ? 'left' : 'right',
      enterStartX: null,
      enterT: 0,
      enterDur: Math.max(0.55, baseEnter / (o.spawnMult || 1)),
      spawnAt: performance.now(),
      wander: null,
      vx: 0,
      vy: 0,
    };
    const startX = mob.enterFrom === 'left' ? -8 : 108;
    mob.liveX = startX;
    el.style.left = startX + '%';
    el.style.top = slot.y + '%';
    el.classList.add('entering');
    el.classList.remove('alive');
    return mob;
  }

  function desiredMobCount(state) {
    if (!state || !window.CB_STATE || !window.CB_STATE.mobCountFor) return WAVE_SIZE;
    return Math.max(1, Math.min(WAVE_SIZE, window.CB_STATE.mobCountFor(state)));
  }

  /** Toast when the count goes up (§5). Silent on load. */
  function announceMobGrowth(n, state) {
    const parts = (state && window.CB_STATE && window.CB_STATE.mobCountParts) ? window.CB_STATE.mobCountParts(state) : null;
    const prevParts = lastMobParts;
    const prev = lastKnownMobCount;
    lastKnownMobCount = Math.max(prev || 0, n);
    lastMobParts = parts;
    if (prev == null || n <= prev || !parts) return;
    let msg = 'More to hunt: your bolts can split now.';
    const newHelper = parts.helpers.find(h => !(prevParts && prevParts.helpers.indexOf(h) >= 0));
    if (newHelper) {
      const D = window.CB_DATA;
      const h = D && D.hunters && D.hunters.find(x => x.id === newHelper);
      const role = { warrior: 'Warrior', archer: 'Archer', berserker: 'Berserker', mage: 'Mage' }[h && h.nameKey] || (h && h.name) || 'helper';
      msg = 'More to hunt: your ' + role + ' needs a target.';
    }
    if (window.CB_UI && window.CB_UI.toast) {
      setTimeout(() => { try { window.CB_UI.toast(msg, { ms: 2600 }); } catch (e) { /* soft */ } }, 250);
    }
  }

  /** Re-check on purchase: a new slot walks in right away (never removes one mid-task). */
  function maybeGrowWave(state, now) {
    if (now < growCheckAt) return;
    growCheckAt = now + 250;
    if (!state || !els.waveColumn || !wave.length) return;
    if (wave.some(m => m && m.isBoss)) return;
    if (performance.now() < bossMomentUntil) return;
    const contract = currentContract();
    const taskKey = (contract ? contract.id : 'none') + '|noboss';
    if (taskKey !== activeMobKey) return;
    const want = desiredMobCount(state);
    if (want <= wave.length) return;
    const slots = els.waveColumn.querySelectorAll('.mob');
    const vis = contract ? mobVisualKey(contract) : 'bristle_cub';
    const hp = getMonsterVisualHp(contract);
    const combat = combatOf(contract);
    const spawnMult = (combat.spawnMult != null && combat.spawnMult > 0) ? Number(combat.spawnMult) : 1;
    for (let i = wave.length; i < Math.min(want, slots.length); i++) {
      const si = pickFreeParkSlot(-1, !!combat.clump);
      const mob = makeMob(slots[i], i, si, { vis, emoji: contract ? contract.emoji : '🪨', hp, boss: null, spawnMult });
      mob.enterDur = 1.2; // walks in right away
      wave.push(mob);
    }
    announceMobGrowth(wave.length, state);
    activeMobCount = wave.length;
  }

  function beginWalkIn(mob, opts) {
    if (!mob || !mob.el) return;
    opts = opts || {};
    mob.state = 'entering';
    mob.enterT = 0;
    mob.wander = null;
    mob.vx = 0;
    mob.vy = 0;
    const spawnMult = (combatOf().spawnMult != null && combatOf().spawnMult > 0)
      ? Number(combatOf().spawnMult) : 1;
    let startX;
    if (opts.solo) {
      // feel2 solo stage: 0.6s walk-in from the nearer side edge, already on screen
      mob.enterDur = SOLO_WALKIN_S;
      mob.enterFrom = mob.baseX < 50 ? 'left' : 'right';
      startX = mob.enterFrom === 'left' ? 6 : 94;
      mob.enterStartX = startX;
    } else {
      mob.enterDur = Math.max(0.55, (2.0 + Math.random() * 1.0) / spawnMult);
      mob.enterFrom = Math.random() < 0.5 ? 'left' : 'right';
      startX = mob.enterFrom === 'left' ? -8 : 108;
      mob.enterStartX = null;
    }
    mob.liveX = startX;
    mob.liveY = mob.baseY;
    mob.el.classList.add('entering', 'walking-in');
    mob.el.classList.remove('alive', 'dying', 'spawn', 'hit');
    mob.el.style.left = startX + '%';
    mob.el.style.top = mob.baseY + '%';
    mob.el.style.setProperty('--wx', '0px');
    mob.el.style.setProperty('--jig', '0px');
  }

  function finishWalkIn(mob) {
    if (!mob) return;
    mob.state = 'alive';
    mob.vx = 0;
    mob.vy = 0;
    mob.wander = { walking: false, idleUntil: performance.now() + wanderIdleMs() };
    mob.liveX = mob.baseX;
    mob.liveY = mob.baseY;
    if (mob.el) {
      mob.el.classList.remove('entering', 'walking-in');
      mob.el.classList.add('alive');
      mob.el.style.left = mob.baseX + '%';
      mob.el.style.top = mob.baseY + '%';
    }
  }

  function syncMobEl(mob) {
    if (!mob || !mob.el) return;
    mob.el.style.left = (mob.liveX != null ? mob.liveX : mob.baseX) + '%';
    mob.el.style.top = (mob.liveY != null ? mob.liveY : mob.baseY) + '%';
  }

  function setFocus(idx) {
    if (!wave.length) {
      focusIdx = 0;
      lockedMobId = null;
      return;
    }
    focusIdx = ((idx % wave.length) + wave.length) % wave.length;
    lockedMobId = focusIdx;
    wave.forEach((m, i) => {
      if (m.el) m.el.classList.toggle('focus', i === focusIdx);
    });
  }

  function clearLock() {
    lockedMobId = null;
    wave.forEach((m) => { if (m.el) m.el.classList.remove('focus'); });
  }

  function hasValidLock() {
    if (lockedMobId == null || !wave.length) return false;
    const m = wave[lockedMobId];
    return !!(m && m.hp > 0 && m.el && !m.el.classList.contains('dying'));
  }

  function clearTrackUi() {
    wave.forEach((m) => {
      if (!m.el) return;
      m.el.classList.remove('on-target');
      m.el.style.removeProperty('--track');
    });
  }

  function placeHunters(n) {
    const spots = [
      { x: 10, y: 48 }, { x: 90, y: 48 },
      { x: 14, y: 68 }, { x: 86, y: 68 },
      { x: 8, y: 32 }, { x: 92, y: 32 },
      { x: 22, y: 80 }, { x: 78, y: 80 },
    ];
    return spots.slice(0, Math.max(n, 0));
  }

  let holdWired = false;

  function pointerArenaPct(e) {
    const arena = els.arena || document.getElementById('arena');
    if (!arena) return null;
    const a = arena.getBoundingClientRect();
    let cx, cy;
    if (e.touches && e.touches.length) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length) {
      cx = e.changedTouches[0].clientX;
      cy = e.changedTouches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }
    if (cx == null || a.width <= 0 || a.height <= 0) return null;
    return {
      x: Math.max(0, Math.min(100, ((cx - a.left) / a.width) * 100)),
      y: Math.max(0, Math.min(100, ((cy - a.top) / a.height) * 100)),
    };
  }

  function storePointerPct(e) {
    const p = pointerArenaPct(e);
    if (!p) return null;
    lastPtrPct = p;
    if (soloSnap && holding) {
      const moved = Math.hypot(p.x - soloSnap.px, p.y - soloSnap.py);
      if (moved < 7) return p; // finger still where the last kill was → keep aiming at the new monster
      soloSnap = null;
    }
    aimX = p.x;
    aimY = p.y;
    return p;
  }

  /** Living mob nearest to arena % point (optional max radius). */
  function pickMobNearPointer(p, maxDist) {
    if (!p) return null;
    const living = livingMobs();
    if (!living.length) return null;
    let best = null;
    let bestD = Infinity;
    living.forEach((m) => {
      const pos = mobPosPct(m);
      const d = distPct(pos.x, pos.y, p.x, p.y);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    });
    if (maxDist != null && bestD > maxDist) return null;
    return best;
  }

  /** xp1 (retest b): the opened sheet slides into view (it opens below the fold on phones). */
  function revealHuntSheet(sheet) {
    requestAnimationFrame(() => {
      const body = sheet.querySelector('.hunt-sheet-body') || sheet;
      const nav = document.querySelector('nav.nav, .tab-bar, .bottom-nav');
      const limit = nav ? nav.getBoundingClientRect().top : window.innerHeight;
      const r = body.getBoundingClientRect();
      const overflow = r.bottom - limit + 8;
      if (overflow <= 0) return;
      const st = getState ? getState() : null;
      const smooth = !(st && st.settings && st.settings.reduceMotion);
      // scroll the nearest scrolling ancestor (the page on desktop, .main on phones)
      let sc = sheet.parentElement;
      while (sc && sc !== document.body) {
        const cs = getComputedStyle(sc);
        if (/(auto|scroll)/.test(cs.overflowY) && sc.scrollHeight > sc.clientHeight + 1) break;
        sc = sc.parentElement;
      }
      const toggle = sheet.querySelector('.hunt-sheet-toggle');
      const topRoom = toggle ? toggle.getBoundingClientRect().top - 60 : overflow;
      const by = Math.max(0, Math.min(overflow, topRoom));
      if (sc && sc !== document.body) sc.scrollBy({ top: by, behavior: smooth ? 'smooth' : 'auto' });
      else window.scrollBy({ top: by, behavior: smooth ? 'smooth' : 'auto' });
    });
  }

  function wireHold(panel) {
    const zone = document.getElementById('hold-zone');
    if (!zone) return;

    // Chest tubes sit above hold-zone; stop pointer from starting beam
    const rails = document.getElementById('chest-rails');
    if (rails && !rails.dataset.wired) {
      rails.dataset.wired = '1';
      const stop = (e) => { e.stopPropagation(); };
      rails.addEventListener('mousedown', stop);
      rails.addEventListener('touchstart', stop, { passive: true });
      rails.addEventListener('pointerdown', stop);
    }
    const pill = document.getElementById('boost-pill');
    if (pill && !pill.dataset.wired) {
      pill.dataset.wired = '1';
      pill.addEventListener('mousedown', (e) => e.stopPropagation());
      pill.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    }
    const tsw = document.getElementById('target-switcher');
    if (tsw && !tsw.dataset.wired) {
      tsw.dataset.wired = '1';
      const stop = (e) => { e.stopPropagation(); };
      tsw.addEventListener('mousedown', stop);
      tsw.addEventListener('pointerdown', stop);
      tsw.addEventListener('touchstart', stop, { passive: true });
    }

    const start = (e) => {
      if (e.type === 'mousedown' && e.button !== 0) return;
      if (e.type === 'pointerdown' && e.button != null && e.button !== 0) return;
      // Ignore if clicking a chest tube or a target-switcher button (the name chip between ▲/▼ is part of the hold area)
      if (e.target && e.target.closest && e.target.closest('.chest-tube, .chest-rails, .boost-pill, .ts-btn, .hunt-sheet, .task-dock button')) return;
      if (e.target && e.target.closest && e.target.closest('.target-switcher') && !e.target.closest('.ts-chip')) return;
      e.preventDefault();
      const p = storePointerPct(e);
      pressFeedback(p);
      const tapped = pickMobNearPointer(p, TAP_SNAP_PCT);
      if (tapped) {
        setFocus(tapped.id);
        // xp1 (retest c): a tap near a wandering monster aims at it (bigger tap target);
        // the aim lets go as soon as the finger moves away (same rule as the solo respawn snap)
        if (p) {
          const mp = mobPosPct(tapped);
          if (Math.hypot(mp.x - p.x, mp.y - p.y) > 1.5) {
            aimX = mp.x; aimY = mp.y;
            soloSnap = { mobId: tapped.id, px: p.x, py: p.y };
          }
        }
      }
      ptrDownMeta = {
        t: performance.now(),
        x: p ? p.x : aimX,
        y: p ? p.y : aimY,
        onMob: !!tapped,
      };
      // Directional bolts: hold anywhere to fire toward pointer
      setHolding(true);
    };
    const end = (e) => {
      const meta = ptrDownMeta;
      ptrDownMeta = null;
      setHolding(false);
      // Short tap on empty space clears focus highlight
      if (!meta || meta.onMob) return;
      const p = storePointerPct(e) || { x: meta.x, y: meta.y };
      const dt = performance.now() - meta.t;
      const moved = distPct(meta.x, meta.y, p.x, p.y);
      if (dt < 280 && moved < 4 && !pickMobNearPointer(p, 14)) {
        clearLock();
      }
    };
    // While holding: update aim direction for bolts
    const move = (e) => {
      if (!holding) return;
      e.preventDefault();
      storePointerPct(e);
    };

    // Fresh listeners each rebuild — zone is new DOM
    zone.addEventListener('pointerdown', start);
    zone.addEventListener('mousedown', start);
    zone.addEventListener('touchstart', start, { passive: false });
    zone.addEventListener('pointermove', move);
    zone.addEventListener('mousemove', move);
    zone.addEventListener('touchmove', move, { passive: false });
    zone.addEventListener('contextmenu', (e) => e.preventDefault());
    // xp1 (#5 retest): a touch-hold that starts on the target-name chip fires like the arena.
    // Touch/pointer moves stay bound to the element they started on, so the chip needs move too.
    const chip = document.getElementById('ts-chip');
    if (chip && !chip.dataset.holdWired) {
      chip.dataset.holdWired = '1';
      const chipStart = (e) => { start(e); e.stopPropagation(); };
      chip.addEventListener('pointerdown', chipStart);
      chip.addEventListener('mousedown', chipStart);
      chip.addEventListener('touchstart', chipStart, { passive: false });
      chip.addEventListener('pointermove', move);
      chip.addEventListener('mousemove', move);
      chip.addEventListener('touchmove', move, { passive: false });
      chip.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    if (!holdWired) {
      holdWired = true;
      window.addEventListener('mouseup', end);
      window.addEventListener('pointerup', end);
      window.addEventListener('touchend', end);
      window.addEventListener('touchcancel', end);
      window.addEventListener('blur', () => { ptrDownMeta = null; setHolding(false); });
    }
    if (!window._cbArenaFocusWired) {
      window._cbArenaFocusWired = true;
      document.addEventListener('pointerdown', (e) => {
        const a = e.target && e.target.closest && e.target.closest('#arena');
        arenaKeyFocus = !!(a && !(e.target.closest('.hunt-sheet, .intro-dock, button, input, select, textarea')));
      }, true);
      window.addEventListener('blur', () => { arenaKeyFocus = false; });
    }
    if (!window._cbTargetKeys) {
      window._cbTargetKeys = true;
      window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
        if (e.target && e.target.isContentEditable) return;
        const ae = document.activeElement;
        if (ae && ae !== document.body && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName || '')) return;
        // xp1 (retest d): only when the arena has focus (last press was in the arena, Hunt tab showing)
        if (!arenaKeyFocus || !document.body.classList.contains('tab-hunt')) return;
        const st = getState ? getState() : null;
        if (!st || !window.CB_STATE) return;
        if (window.CB_STATE.isBossFightActive && window.CB_STATE.isBossFightActive(st)) return;
        const k = e.key;
        if (k === 'ArrowUp' || k === 'w' || k === 'W') {
          e.preventDefault();
          applyTargetSwitchResult(window.CB_STATE.stepHuntTarget(st, +1), +1);
          if (window.CB_GAME && window.CB_GAME.persist) window.CB_GAME.persist();
        } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
          e.preventDefault();
          applyTargetSwitchResult(window.CB_STATE.stepHuntTarget(st, -1), -1);
          if (window.CB_GAME && window.CB_GAME.persist) window.CB_GAME.persist();
        }
      });
    }
  }

  function boltAimTaught(state) {
    return !!(state && state.hints && state.hints.boltAim);
  }

  function markBoltAimTaught() {
    const st = getState ? getState() : null;
    if (!st) return;
    if (!st.hints) st.hints = { boltAim: false };
    if (st.hints.boltAim) return;
    st.hints.boltAim = true;
    if (window.CB_STATE && window.CB_STATE.save) {
      try { window.CB_STATE.save(st); } catch (e) { /* soft */ }
    }
  }

  function syncBoltAimHint(isHolding) {
    const el = els.playerHint;
    if (!el) return;
    const st = getState ? getState() : null;
    const bossOn = !!(st && window.CB_STATE && window.CB_STATE.isBossFightActive && window.CB_STATE.isBossFightActive(st));
    if (boltAimTaught(st) || boltHintFading || bossOn) {
      el.classList.add('hint-gone');
      el.classList.add('boss-hide');
      el.classList.remove('hint-fade', 'hint-holding');
      return;
    }
    el.classList.remove('boss-hide');
    // While holding, tuck the tip so it does not cover the fight
    el.classList.toggle('hint-holding', !!isHolding);
  }

  function beginBoltAimFade() {
    const el = els.playerHint;
    if (!el || boltHintFading || boltAimTaught(getState ? getState() : null)) return;
    boltHintFading = true;
    el.classList.remove('hint-holding');
    el.classList.add('hint-fade');
    markBoltAimTaught();
    setTimeout(() => {
      el.classList.add('hint-gone');
      el.classList.remove('hint-fade');
    }, 700);
  }

  function noteBoltAimShot() {
    if (boltHintFading) return;
    const st = getState ? getState() : null;
    if (boltAimTaught(st)) return;
    boltHintShots++;
    if (boltHintShots >= 4 || boltHintHoldMs >= 2000) beginBoltAimFade();
  }

  function noteBoltAimHold(dt) {
    if (boltHintFading) return;
    const st = getState ? getState() : null;
    if (boltAimTaught(st)) return;
    boltHintHoldMs += dt;
    if (boltHintHoldMs >= 2000 || boltHintShots >= 4) beginBoltAimFade();
  }

  let bufferedShotTimer = 0;
  function cancelBufferedShot() {
    if (bufferedShotTimer) clearTimeout(bufferedShotTimer);
    bufferedShotTimer = 0;
  }
  function scheduleBufferedShot(waitMs) {
    // Held-fire accumulator stays parked until the buffered shot lands, so the
    // two paths can never double-fire inside one interval.
    boltTickAcc = -1e9;
    if (bufferedShotTimer) return; // one buffered shot max
    bufferedShotTimer = setTimeout(() => {
      bufferedShotTimer = 0;
      const hunt = document.getElementById('screen-hunt');
      if (!els.arena || !hunt || !hunt.classList.contains('active') || document.hidden) { boltTickAcc = 0; return; }
      if (performance.now() - lastBoltAt < boltIntervalMs() - 2) { boltTickAcc = 0; return; }
      try { fireBolt(currentContract()); } catch (e) { /* soft */ }
      boltTickAcc = 0; // held fire continues on the normal 0.6s cadence from here
    }, Math.max(0, Math.ceil(waitMs)));
  }

  /** feel1: every touch gets a same-frame response (ripple at the finger + staff glow). */
  let lastPressFxAt = -1e9;
  function pressFeedback(p) {
    const now = performance.now();
    if (now - lastPressFxAt < 60) return; // pointerdown + touchstart + mousedown of one touch
    lastPressFxAt = now;
    if (els.arena && p) {
      const r = document.createElement('div');
      r.className = 'touch-ripple';
      r.style.left = p.x + '%';
      r.style.top = p.y + '%';
      els.arena.appendChild(r);
      setTimeout(() => r.remove(), 320);
    }
    if (els.player) {
      els.player.classList.remove('press-glow');
      void els.player.offsetWidth;
      els.player.classList.add('press-glow');
      clearTimeout(pressFeedback._t);
      pressFeedback._t = setTimeout(() => els.player && els.player.classList.remove('press-glow'), 180);
      // Wind-up frame straight away so the hero visibly reacts even during the cooldown
      if (window.CB_SPRITES && window.CB_SPRITES.playerAttack) {
        try { window.CB_SPRITES.playerAttack(els.player, 0, true); } catch (e) { /* soft */ }
      }
    }
  }

  function setHolding(v) {
    if (holding === v) return;
    holding = v;
    if (getState) getState().holding = v;
    document.body.classList.toggle('arena-holding', v);
    if (els.arena) els.arena.classList.toggle('holding', v);
    if (els.activeBadge) els.activeBadge.classList.toggle('hidden', !v);
    if (els.lsActive) els.lsActive.classList.toggle('hidden', !v);
    syncBoltAimHint(v);
    if (els.player) {
      els.player.classList.toggle('beaming', v);
      els.player.classList.toggle('firing', v);
    }
    if (v) {
      // First bolt NOW so hold-to-attack is obvious (playtest: no bolts / delayed feedback)
      boltTickAcc = 0;
      try {
        // Tick gate: re-pressing can't fire faster than one shot per interval
        const nowMs = performance.now();
        const interval = boltIntervalMs();
        const since = nowMs - lastBoltAt;
        if (since >= interval) {
          cancelBufferedShot();
          fireBolt(currentContract());
          boltTickAcc = 0;
        } else {
          // feel1 input buffer: a press during the cooldown fires the moment the
          // cooldown ends (not a full interval later). Same 0.6s gate → same DPS.
          scheduleBufferedShot(interval - since);
        }
      } catch (e) { /* soft */ }
    } else {
      soloSnap = null;
      clearTrackUi();
      // A tap released during the cooldown keeps its buffered shot.
      if (!bufferedShotTimer) boltTickAcc = 0;
    }
    if (onHoldChange) onHoldChange(v);
  }

  function playerOriginPct() {
    // Player avatar sits bottom-center of arena (body/chest anchor)
    return { x: 50, y: 82 };
  }

  /** Muzzle = staff/hand — a bit forward along aim from the body, not chest center. */
  function playerMuzzlePct(dirX, dirY) {
    const o = playerOriginPct();
    const dx = dirX || 0;
    const dy = dirY || -1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    // Perpendicular for staff held to the character's right
    const px = -ny;
    const py = nx;
    return {
      x: o.x + nx * 4.2 + px * 1.6,
      y: o.y + ny * 4.2 + py * 1.6,
    };
  }

  /** Aim unit vector from player toward current pointer (defaults upward). */
  function aimDirFromPlayer() {
    const o = playerOriginPct();
    let dx = aimX - o.x;
    let dy = aimY - o.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) return { x: 0, y: -1, o };
    return { x: dx / len, y: dy / len, o };
  }

  /**
   * Soft aim assist: if a living mob sits within BOLT_AIM_ASSIST_DEG of the
   * pointer aim, nudge the fire direction toward that mob (still hold-to-aim).
   */
  function assistedAimDir() {
    const base = aimDirFromPlayer();
    const living = livingMobs();
    if (!living.length) return base;
    const maxRad = (aimAssistDeg() * Math.PI) / 180;
    let best = null;
    living.forEach((m) => {
      if (!m || m.hp <= 0 || !m.el || m.el.classList.contains('dying')) return;
      const pos = (m.vx || m.vy) ? mobLeadPos(m, 0.25) : mobPosPct(m); // feel2: lead walkers slightly
      const vx = pos.x - base.o.x;
      const vy = pos.y - base.o.y;
      const dist = Math.sqrt(vx * vx + vy * vy);
      if (dist < 3 || dist > BOLT_RANGE) return;
      const nx = vx / dist;
      const ny = vy / dist;
      const dot = Math.max(-1, Math.min(1, nx * base.x + ny * base.y));
      const ang = Math.acos(dot);
      if (ang > maxRad) return;
      if (!best || ang < best.ang || (ang === best.ang && dist < best.dist)) {
        best = { ang, dist, x: nx, y: ny };
      }
    });
    if (!best) return base;
    // Blend toward mob (~70% assist) so aim stays directional but forgiving
    const ax = base.x * 0.3 + best.x * 0.7;
    const ay = base.y * 0.3 + best.y * 0.7;
    const al = Math.sqrt(ax * ax + ay * ay) || 1;
    return { x: ax / al, y: ay / al, o: base.o, assisted: true };
  }

  /** First living mob along the aim ray within lateral width. */
  function pickBoltTarget(origin, dirX, dirY) {
    const living = livingMobs();
    const hitW = boltHitWidth();
    let best = null;
    living.forEach((m) => {
      const pos = mobPosPct(m);
      const vx = pos.x - origin.x;
      const vy = pos.y - origin.y;
      const along = vx * dirX + vy * dirY;
      if (along < 3 || along > BOLT_RANGE) return;
      const latX = vx - dirX * along;
      const latY = vy - dirY * along;
      const lateral = Math.sqrt(latX * latX + latY * latY);
      if (lateral > hitW) return;
      if (!best || along < best.dist) best = { mob: m, dist: along };
    });
    return best;
  }

  /* —— iom6c bolt FX — artist strips in art/v3b/fx (README anchors), pooled nodes —— */
  const FX_BASE = 'art/v3b/fx/';
  const FX_HI = (window.devicePixelRatio || 1) >= 1.5;
  const FX = {
    bolt:   { w: 48, h: 16, frames: 1 },
    trail:  { w: 48, h: 16, frames: 4 },
    impact: { w: 48, h: 48, frames: 4 },
    muzzle: { w: 32, h: 32, frames: 3 },
  };
  // Artist file names (art/v3b/fx/README): bolt, bolt_trail, bolt_impact, muzzle
  const FX_FILE = { bolt: 'bolt', trail: 'bolt_trail', impact: 'bolt_impact', muzzle: 'muzzle' };
  function fxSrc(name) {
    return FX_BASE + (FX_FILE[name] || name) + (FX_HI ? '%402x' : '') + '.png?v=iom7'; // %40 = '@' (avoids CF 307)
  }
  // iom7: bolts leave the BLADE TIP of the plain hunter (CB_GEARVIS.bladeTip, frame px of the
  // 142×156 strip; thrust frames 2–4 ≈ (135–139, 68)). Fallback = attack f2 tip.
  const TIP_FALLBACK = [135, 68];
  const reduceMotionOn = () => document.body.classList.contains('reduce-motion');

  function fxScale(arenaW) {
    // Character scale: ~72px sprite on phone → bolt ≈ 40px; full 48px on wide arenas
    return arenaW < 480 ? 0.84 : 1;
  }

  const boltPool = [];
  const impactPool = [];
  const muzzlePool = [];
  const sparkPool = [];

  function makeStrip(cls, name, s) {
    const f = FX[name];
    const el = document.createElement('div');
    el.className = cls;
    el.style.width = (f.w * s) + 'px';
    el.style.height = (f.h * s) + 'px';
    el.style.backgroundImage = "url('" + fxSrc(name) + "')";
    el.style.backgroundSize = (f.w * f.frames * s) + 'px ' + (f.h * s) + 'px';
    el.style.backgroundRepeat = 'no-repeat';
    return el;
  }
  function stripAnim(el, name, s, ms, iterations) {
    const f = FX[name];
    if (f.frames < 2) return null;
    return el.animate(
      [{ backgroundPosition: '0px 0px' }, { backgroundPosition: (-f.w * f.frames * s) + 'px 0px' }],
      { duration: ms, easing: 'steps(' + f.frames + ', end)', iterations: iterations || 1, fill: 'forwards' }
    );
  }
  function takeNode(pool, build, s) {
    let n = pool.pop();
    if (!n || n._s !== s) n = build(s);
    return n;
  }
  function releaseNode(pool, n, ms) {
    setTimeout(() => {
      if (n.parentNode) n.parentNode.removeChild(n);
      if (n._anims) { n._anims.forEach((an) => { try { an.cancel(); } catch (e) { /* soft */ } }); n._anims = null; }
      if (pool.length < 24) pool.push(n);
    }, ms);
  }

  function buildBolt(s) {
    // 0×0 wrapper sits at the TIP; trail + bolt extend left at 0°, rotated by atan2
    const w = document.createElement('div');
    w.className = 'pbolt';
    const glow = document.createElement('div');
    glow.className = 'pbolt-glow';
    glow.style.width = (58 * s) + 'px';
    glow.style.height = (22 * s) + 'px';
    glow.style.left = (-54 * s) + 'px';
    glow.style.top = (-11 * s) + 'px';
    const trail = makeStrip('pbolt-trail', 'trail', s);
    trail.style.left = (-(FX.bolt.w + FX.trail.w) * s + 2 * s) + 'px'; // right edge on bolt tail
    trail.style.top = (-FX.trail.h * s / 2) + 'px';
    const bolt = makeStrip('pbolt-core', 'bolt', s);
    bolt.style.left = (-FX.bolt.w * s) + 'px';
    bolt.style.top = (-FX.bolt.h * s / 2) + 'px';
    w.appendChild(glow); w.appendChild(trail); w.appendChild(bolt);
    w._trail = trail; w._s = s;
    return w;
  }
  function buildImpact(s) {
    const el = makeStrip('pbolt-impact', 'impact', s);
    el.style.marginLeft = (-FX.impact.w * s / 2) + 'px';
    el.style.marginTop = (-FX.impact.h * s / 2) + 'px';
    el._s = s;
    return el;
  }
  function buildMuzzle(s) {
    const el = makeStrip('pbolt-muzzle', 'muzzle', s);
    el.style.marginTop = (-FX.muzzle.h * s / 2) + 'px'; // left-center on the orb
    el._s = s;
    return el;
  }
  function buildSpark() {
    const el = document.createElement('div');
    el.className = 'pbolt-spark';
    el._s = 1;
    return el;
  }

  /** Staff-orb position in arena px (reads the live sprite box + current frame). */
  function staffOrbPx(arenaRect) {
    const body = els.player && (els.player.querySelector('.cb-body') || els.player);
    if (!body) return null;
    const r = body.getBoundingClientRect();
    if (!r.width) return null;
    const frame = Number(body.dataset.frame || 0) | 0;
    const gv = window.CB_GEARVIS;
    const tip = (gv && gv.bladeTip) ? gv.bladeTip(body.dataset.anim, frame) : TIP_FALLBACK;
    // rect already includes the feet-anchor translate (--p-ax)
    return {
      x: r.left - arenaRect.left + r.width * (tip[0] / 142),
      y: r.top - arenaRect.top + r.height * (tip[1] / 156),
    };
  }

  /** Muzzle flash on the staff orb, burst reading along the aim angle. */
  function spawnMuzzleFlash(orb, angleDeg) {
    if (!els.projLayer || !els.arena) return;
    const a = els.arena.getBoundingClientRect();
    const s = fxScale(a.width);
    const o = orb || staffOrbPx(a);
    if (!o) return;
    const el = takeNode(muzzlePool, buildMuzzle, s);
    el.style.left = o.x + 'px';
    el.style.top = o.y + 'px';
    el.style.transform = 'rotate(' + (angleDeg == null ? -90 : angleDeg) + 'deg)';
    els.projLayer.appendChild(el);
    el._anims = [stripAnim(el, 'muzzle', s, 60)];
    releaseNode(muzzlePool, el, 70);
  }

  function playerBoltRecoil(dirX, dirY) {
    if (!els.player || reduceMotionOn()) return;
    const actor = els.player.querySelector('.cb-actor') || els.player;
    actor.style.translate = (-(dirX || 0) * 3).toFixed(1) + 'px ' + (-(dirY || -1) * 3).toFixed(1) + 'px';
    clearTimeout(playerBoltRecoil._t);
    playerBoltRecoil._t = setTimeout(() => { actor.style.translate = ''; }, 90);
    // feel1: squash on every shot (individual `scale` so sprite flips/translate are untouched)
    try {
      if (actor._sq) actor._sq.cancel();
      actor.style.transformOrigin = '50% 100%';
      actor._sq = actor.animate(
        [{ scale: '1 1' }, { scale: '1.1 0.9', offset: 0.3 }, { scale: '0.96 1.05', offset: 0.65 }, { scale: '1 1' }],
        { duration: 150, easing: 'cubic-bezier(.2,.8,.3,1)' });
    } catch (e) { /* soft — older browsers skip the squash */ }
  }

  function spawnBoltImpactAt(xPx, yPx, crit) {
    if (!els.projLayer || !els.arena) return;
    const s = fxScale(els.arena.getBoundingClientRect().width) * (crit ? 1.3 : 1);
    const el = takeNode(impactPool, buildImpact, s);
    el.style.left = xPx + 'px';
    el.style.top = yPx + 'px';
    els.projLayer.appendChild(el);
    el._anims = [stripAnim(el, 'impact', s, 200)];
    releaseNode(impactPool, el, 210);
    const n = crit ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const sp = takeNode(sparkPool, buildSpark, 1);
      const ang = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 12;
      sp.style.left = xPx + 'px';
      sp.style.top = yPx + 'px';
      els.projLayer.appendChild(sp);
      sp._anims = [sp.animate(
        [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
         { transform: 'translate(' + (Math.cos(ang) * dist).toFixed(1) + 'px,' + (Math.sin(ang) * dist).toFixed(1) + 'px) scale(0.3)', opacity: 0 }],
        { duration: 240, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' })];
      releaseNode(sparkPool, sp, 250);
    }
  }

  function samePt(a, b) { return a && b && Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01; }

  function spawnPlayerBolt(origin, dirX, dirY, hit, flightMs) {
    if (!els.projLayer || !els.arena) return;
    const a = els.arena.getBoundingClientRect();
    const s = fxScale(a.width);
    const travel = hit ? hit.dist : Math.min(72, BOLT_RANGE * 0.7);
    // End point is unchanged combat geometry (aim ray from body anchor → target)
    const x1 = ((origin.x + dirX * travel) / 100) * a.width;
    const y1 = ((origin.y + dirY * travel) / 100) * a.height;
    // First segment leaves from the staff orb; pierce/bounce segments leave from the previous mob
    const fromPlayer = samePt(origin, playerOriginPct());
    const orb = fromPlayer ? staffOrbPx(a) : null;
    const x0 = orb ? orb.x : (origin.x / 100) * a.width;
    const y0 = orb ? orb.y : (origin.y / 100) * a.height;
    const angle = Math.atan2(y1 - y0, x1 - x0) * (180 / Math.PI);
    const w = takeNode(boltPool, buildBolt, s);
    const st = getState ? getState() : null;
    const tier = (st && st.features && st.features.beamTier) || 0;
    w.className = 'pbolt bolt-tier-' + Math.min(3, tier);
    els.projLayer.appendChild(w);
    const rot = ' rotate(' + angle.toFixed(1) + 'deg)';
    // Tip starts just past the orb so the crystal emerges from it
    const lead = FX.bolt.w * s * 0.5;
    const rad = angle * Math.PI / 180;
    const sx = x0 + Math.cos(rad) * lead;
    const sy = y0 + Math.sin(rad) * lead;
    w._anims = [
      w.animate(
        [{ transform: 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px)' + rot, opacity: 0.4 },
         { transform: 'translate(' + (sx + (x1 - sx) * 0.12).toFixed(1) + 'px,' + (sy + (y1 - sy) * 0.12).toFixed(1) + 'px)' + rot, opacity: 1, offset: 0.12 },
         { transform: 'translate(' + x1.toFixed(1) + 'px,' + y1.toFixed(1) + 'px)' + rot, opacity: 1 }],
        { duration: flightMs, easing: 'linear', fill: 'forwards' }),
      stripAnim(w._trail, 'trail', s, 200, Math.max(1, Math.ceil(flightMs / 200))),
    ];
    if (fromPlayer) {
      spawnMuzzleFlash(orb, angle);
      playerBoltRecoil(dirX, dirY);
    }
    releaseNode(boltPool, w, flightMs + 20);
  }

  function triggerCritShake(isBoss, ampOverride) {
    if (!els.arena || reduceMotionOn()) return;
    // feel1: the boss-death shake is never cut short by a same-frame crit/boss-hit shake
    if (!ampOverride && performance.now() < (triggerCritShake._bigUntil || 0)) return;
    if (ampOverride) triggerCritShake._bigUntil = performance.now() + 360;
    const amp = ampOverride || (isBoss ? 3 : 2);
    const seq = ampOverride
      ? [[amp, -amp * 0.5], [-amp * 0.9, amp * 0.6], [amp * 0.6, -amp * 0.3], [-amp * 0.35, amp * 0.2], [amp * 0.15, 0], [0, 0]]
      : [[amp, -amp * 0.5], [-amp, amp * 0.5], [amp * 0.5, 0], [0, 0]];
    clearTimeout(triggerCritShake._t);
    let i = 0;
    const step = () => {
      if (!els.arena) return;
      const [x, y] = seq[i];
      els.arena.style.setProperty('--shake-x', x + 'px');
      els.arena.style.setProperty('--shake-y', y + 'px');
      i++;
      if (i < seq.length) triggerCritShake._t = setTimeout(step, 40);
    };
    step();
  }

  function getGearInfo(state) {
    const D = window.CB_DATA;
    const S = window.CB_STATE;
    const gearUps = D.upgrades.filter(u => u.gearTier).sort((a, b) => a.gearTier - b.gearTier);
    let tier = 0;
    let next = gearUps[0] || null;
    for (const u of gearUps) {
      if (S.getUpgradeLevel(state, u.id) >= 1) {
        tier = u.gearTier;
        next = gearUps.find(g => g.gearTier === tier + 1) || null;
      } else {
        next = u;
        break;
      }
    }
    if (tier >= 7) next = null;
    const info = GEAR_ARMOR[tier] || GEAR_ARMOR[0];
    let nextHint = 'MAXED · Dragon';
    if (next) {
      const cost = S.upgradeCost(next, 0);
      if (next.costCurrency === 'points') {
        nextHint = 'Next: ' + next.name.replace(' Blade', '') + ' ' + window.CB_FMT.num(cost) + '⭐';
      } else if (window.CB_FMT.goldChipHtml) {
        nextHint = 'Next: ' + next.name.replace(' Blade', '') + ' ' + window.CB_FMT.goldChipHtml(cost);
      } else {
        nextHint = 'Next: ' + next.name.replace(' Blade', '') + ' ' + window.CB_FMT.num(cost) + ' gold';
      }
    }
    return { tier, info, next, nextHint };
  }

  function updateGearStrip(state) {
    const g = getGearInfo(state);
    if (els.gearWeapon) els.gearWeapon.textContent = g.info.emoji + ' ' + g.info.weapon;
    if (els.gearArmor) els.gearArmor.textContent = '🛡️ ' + g.info.armor;
    if (els.gearNext) {
      if (g.nextHint && g.nextHint.indexOf('<') >= 0) els.gearNext.innerHTML = g.nextHint;
      else els.gearNext.textContent = g.nextHint;
      els.gearNext.classList.toggle('maxed', !g.next);
    }
    const tint = GEAR_TINTS[Math.min(g.tier, GEAR_TINTS.length - 1)] || GEAR_TINTS[0];
    if (els.droneLayer) {
      els.droneLayer.querySelectorAll('.drone').forEach(d => {
        d.style.setProperty('--gear-color', tint);
        const fig = d.querySelector('.fig-hunter');
        if (fig) fig.style.setProperty('--gear-color', tint);
      });
    }
  }

  /** Combat feed removed — important events use toasts instead */
  function pushFeed(_kind, _msg, _force) { /* no-op */ }

  function syncBeamTier(state) {
    // Beam element removed; tier still styles player bolts via data-attr
    if (!els.arena) return;
    const b = window.CB_STATE.getBonuses(state);
    const tier = Math.min(3, Math.max(0, (b.beamTier | 0)));
    els.arena.dataset.boltTier = String(tier);
  }

  function syncXpDock(_force) {
    // Rank XP dock removed from Hunt UI — still track session totals in memory
    displayXp = Math.floor(lifetimeXpBase + sessionXp);
  }

  function gainXp(amount, _towardEl) {
    amount = Math.max(1, Math.round(amount));
    sessionXp += amount;
    syncXpDock(true);
    // No Hunt floats / dock — Rank XP is background-only now
  }

  function spawnXpDrop(_amount) {
    // no-op: Rank XP dock & floats removed from Hunt
  }

  function spawnHitSplat(atEl, amount, opts) {
    opts = opts || {};
    if (!els.splatLayer || !els.arena || !atEl || splatCap > 36) return;
    // Cap: never more than 1 splat on a mob within ~180ms
    const mobKey = opts.mobId != null ? String(opts.mobId) : (atEl.dataset && atEl.dataset.slot != null ? atEl.dataset.slot : atEl);
    const now = performance.now();
    if (lastSplatAt[mobKey] && now - lastSplatAt[mobKey] < SPLAT_GAP_MS) return;
    lastSplatAt[mobKey] = now;
    splatCap++;
    splatStack = (splatStack + 1) % 7;
    const a = els.arena.getBoundingClientRect();
    const m = atEl.getBoundingClientRect();
    const stackX = ((splatStack % 3) - 1) * 10;
    const stackY = -Math.floor(splatStack / 3) * 9;
    const x = ((m.left + m.width / 2 - a.left) / a.width) * 100;
    const y = ((m.top + m.height * 0.35 - a.top) / a.height) * 100;

    let cls = 'red';
    if (opts.crit) cls = 'yellow';
    else if (opts.source === 'hunter') cls = 'blue';
    else if (opts.source === 'beam' || opts.source === 'bolt') cls = 'red';
    else if (opts.soft) cls = Math.random() < 0.35 ? 'blue' : 'red';

    const el = document.createElement('div');
    el.className = 'hit-splat ' + cls + (amount <= 0 ? ' zero' : '');
    el.textContent = window.CB_FMT.num(Math.max(1, Math.round(Number(amount) || 0)));
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.style.marginLeft = stackX + 'px';
    el.style.marginTop = stackY + 'px';
    el.style.zIndex = String(10 + splatStack);
    els.splatLayer.appendChild(el);
    setTimeout(() => {
      el.remove();
      splatCap = Math.max(0, splatCap - 1);
    }, 900);
  }

  function twitchCounter(el, text) {
    if (!el) return;
    const key = el.id || '';
    if (lastCounterSnap[key] === text) return;
    lastCounterSnap[key] = text;
    el.textContent = text;
    const chip = el.closest('.ls-chip');
    if (chip) {
      chip.classList.remove('twitch');
      void chip.offsetWidth;
      chip.classList.add('twitch');
    }
  }

  function recordVisualDps(dmg) {
    const now = performance.now();
    visualDpsWindow.push({ t: now, dmg: dmg || 1 });
    // keep ~3s
    while (visualDpsWindow.length && now - visualDpsWindow[0].t > 3000) {
      visualDpsWindow.shift();
    }
  }

  function currentVisualDps() {
    const now = performance.now();
    let sum = 0;
    let oldest = now;
    visualDpsWindow.forEach(e => {
      sum += e.dmg;
      if (e.t < oldest) oldest = e.t;
    });
    const span = Math.max(0.5, (now - oldest) / 1000);
    if (!visualDpsWindow.length) return 0;
    return sum / span;
  }

  function updateEventTicker(state, contract, dt) {
    if (!els.etLine) return;
    tickerAcc += dt || 0;
    // Slow, high-signal only — no auto-hunt / food / casket spam
    const rotateEvery = 3800;
    if (tickerAcc < rotateEvery && lastTickerKey) return;
    tickerAcc = 0;

    const lines = [];
    const boost = window.CB_CHESTS && window.CB_CHESTS.getActiveBoost
      ? window.CB_CHESTS.getActiveBoost(state)
      : (state.chests && state.chests.activeBoost);
    if (boost && (boost.endsAt == null || Date.now() < boost.endsAt)) {
      const name = (boost.name || boost.id || 'Boost').toString();
      let effect = '';
      if (boost.visualBomb || boost.id === 'bomb_barrage') effect = ' · bolts +50%';
      else if (boost.killMult && boost.killMult > 1) effect = ' · bolts +' + Math.round((boost.killMult - 1) * 100) + '%';
      const sec = boost.endsAt ? Math.ceil(Math.max(0, boost.endsAt - Date.now()) / 1000) : 0;
      lines.push({ t: name + effect + (sec ? ' · ' + sec + 's' : ''), cls: 'frenzy' });
    }

    if (contract) {
      const quota = window.CB_STATE.effectiveQuota(state, contract);
      const prog = Math.min(state.contractProgress || 0, quota);
      lines.push({ t: 'TASK ' + Math.floor(prog) + ' / ' + quota + ' kills', cls: '' });
    } else {
      lines.push({ t: 'NO CONTRACT', cls: '' });
    }

    if (!lines.length) {
      els.etLine.textContent = '';
      els.etLine.className = 'et-line empty';
      lastTickerKey = '';
      return;
    }

    tickerIdx = (tickerIdx + 1) % lines.length;
    const pick = lines[tickerIdx] || lines[0];
    lastTickerKey = pick.t;
    els.etLine.textContent = pick.t;
    els.etLine.className = 'et-line' + (pick.cls ? ' ' + pick.cls : '');
  }

  function finishRewardPreview(state, contract) {
    if (!contract) return { gold: 0, points: 0 };
    const b = window.CB_STATE.getBonuses(state);
    const best = window.CB_STATE.ensureBestiaryEntry(state, contract.id);
    const mGold = window.CB_STATE.masteryGoldMult(best.mastery);
    const points = contract.finishBonus * (b.pointsMult || 1);
    const gold = contract.finishBonus * 0.5 * (b.lootLuck || 1) * mGold;
    return { gold, points, finishBonus: contract.finishBonus, chestChance: window.CB_STATE.masteryChestChance(best.mastery) };
  }

  function updateSlayerPanel(state, contract) {
    const F = window.CB_FMT;
    const S = window.CB_STATE;
    if (contract) {
      const quota = S.effectiveQuota(state, contract);
      const prog = Math.min(state.contractProgress || 0, quota);
      const pct = Math.min(100, (prog / Math.max(1, quota)) * 100);
      if (els.spEmoji) els.spEmoji.textContent = contract.emoji;
      if (els.spTitle) els.spTitle.textContent = contract.name;
      if (els.spFlavor) els.spFlavor.textContent = 'Assigned by Guild Master · ' + (S.levelLabel ? S.levelLabel(contract.areaId) : (S.getArea(contract.areaId)?.name || 'Guild grounds'));
      if (els.spQuota) els.spQuota.textContent = Math.floor(prog) + ' / ' + quota + ' kills';
      if (els.spBarFill) {
        els.spBarFill.style.width = pct + '%';
        els.spBarFill.classList.toggle('near', pct >= 80);
      }
      if (els.spBar) els.spBar.classList.toggle('near', pct >= 80);
      const rew = finishRewardPreview(state, contract);
      if (els.spReward) {
        const chestTxt = rew.chestChance > 0 ? (' · 🎁 ' + (rew.chestChance * 100).toFixed(2) + '%') : '';
        const goldFin = F.goldChipHtml ? F.goldChipHtml(rew.gold) : (F.num(rew.gold, 0) + ' gold');
        els.spReward.innerHTML = 'Finish reward: ' + goldFin + ' · ⭐ ' + F.num(rew.points, 0) + ' Sp' + chestTxt;
        if (els.taskRewardInline) els.taskRewardInline.innerHTML = 'Finish: ' + goldFin + ' · ⭐ ' + F.num(rew.points, 0);
        els.spReward.classList.remove('hidden');
      }
    } else {
      if (els.spEmoji) els.spEmoji.textContent = '📋';
      if (els.spTitle) els.spTitle.textContent = 'No slayer task';
      if (els.spFlavor) els.spFlavor.textContent = 'Visit the Slayer Master';
      if (els.spQuota) els.spQuota.textContent = '— / —';
      if (els.spBarFill) {
        els.spBarFill.style.width = '0%';
        els.spBarFill.classList.remove('near');
      }
      if (els.spBar) els.spBar.classList.remove('near');
      if (els.spReward) els.spReward.textContent = 'Finish reward: —';
      if (els.taskRewardInline) els.taskRewardInline.textContent = 'Finish: —';
    }
    // Streak from completed contracts this save (rising)
    const done = state.totalContracts || 0;
    if (done > lastContractsDone) {
      const gained = done - lastContractsDone;
      taskStreak += gained;
      lastContractsDone = done;
      pushFeed('task', 'Task complete! Streak ×' + taskStreak);
      if (window.CB_AUDIO) {
        try { window.CB_AUDIO.play('task_complete'); } catch (e) { /* soft */ }
      }
      // Celebration toast with finish reward (use last known / board contract if cleared)
      const finishedId = state._lastFinishedContractId;
      const finC = finishedId ? S.getContract(finishedId) : null;
      // Approximate from gains if available via preview of previous contract on panel
      let toastMsg = 'Task complete!';
      if (state._lastFinishReward) {
        const r = state._lastFinishReward;
        toastMsg = 'Task complete! Claimed ' + (F.goldChipHtml ? F.goldChipHtml(r.gold) : (F.num(r.gold, 0) + ' gold')) + ' · ⭐ ' + F.num(r.points, 0) + ' Slayer points';
        if (r.signatureMat && r.signatureMat.total > 0) {
          toastMsg += ' · ' + (r.signatureMat.emoji || '') + ' ' + r.signatureMat.name + ' ×' + r.signatureMat.total;
        }
        if (r.firstClearXp > 0) {
          const xpLab = (window.CB_DATA.nameOf && window.CB_DATA.nameOf('slayer_xp')) || 'Slayer XP';
          toastMsg += ' · +' + F.num(r.firstClearXp, 0) + ' ' + xpLab + ' (first clear)';
        }
      } else if (finC) {
        const r = finishRewardPreview(state, finC);
        toastMsg = 'Task complete! Claimed ' + (F.goldChipHtml ? F.goldChipHtml(r.gold) : (F.num(r.gold, 0) + ' gold')) + ' · ⭐ ' + F.num(r.points, 0) + ' Slayer points';
      }
      if (window.CB_UI && window.CB_UI.toast) window.CB_UI.toast(toastMsg, { html: !!(state._lastFinishReward || finC) });
      if (state._lastFinishReward && state._lastFinishReward.chest && window.CB_UI) {
        window.CB_UI.toast('🎁 Bounty chest!', { celebrate: true });
      }
      if (window.CB_UI && window.CB_UI.flushUnlockToasts) window.CB_UI.flushUnlockToasts(state);
      // Brief panel flash
      const panel = document.getElementById('slayer-panel');
      if (panel) {
        panel.classList.remove('celebrate');
        void panel.offsetWidth;
        panel.classList.add('celebrate');
        setTimeout(() => panel.classList.remove('celebrate'), 1200);
      }
    } else if (done < lastContractsDone) {
      lastContractsDone = done;
    }
    if (els.spStreak) els.spStreak.textContent = 'Streak ×' + taskStreak;
  }

  function updateDenseCounters(state, contract) {
    const F = window.CB_FMT;
    const S = window.CB_STATE;
    const b = S.getBonuses(state);
    const rate = contract ? S.killRatePerMin(state, contract) : 0;
    const avgGold = contract ? ((contract.goldMin + contract.goldMax) / 2) * b.lootLuck : 0;
    const gpm = rate * avgGold;
    const dps = currentVisualDps();

    twitchCounter(els.lsDps, F.num(dps, 1));
    twitchCounter(els.lsGpm, F.num(gpm, 1));
    twitchCounter(els.lsGph, F.num(gpm * 60, 0));
    twitchCounter(els.lsKpm, F.num(rate, 1));
    twitchCounter(els.lsKph, F.num(rate * 60, 1));
    twitchCounter(els.lsKills, F.num(state.totalKills));

    if (contract) {
      const quota = S.effectiveQuota(state, contract);
      const prog = Math.min(state.contractProgress || 0, quota);
      twitchCounter(els.lsTaskk, String(Math.floor(prog)));
    } else {
      twitchCounter(els.lsTaskk, '0');
    }

    // Food countdown — minutes until empty at current burn
    const burnPerMin = rate > 0 ? Math.max(0.05, rate * 0.15 / Math.max(0.2, b.foodEff || 1)) : 0;
    if (burnPerMin > 0 && state.food > 0) {
      const mins = state.food / burnPerMin;
      twitchCounter(els.lsFoodeta, mins >= 60 ? F.num(mins / 60, 1) + 'h' : F.num(mins, 0) + 'm');
    } else if (state.food <= 0) {
      twitchCounter(els.lsFoodeta, 'EMPTY');
    } else {
      twitchCounter(els.lsFoodeta, '∞');
    }

    const c = state.chests || {};
    const fill = Math.max(c.permanentCharge || 0, c.boostCharge || 0);
    twitchCounter(els.lsChest, Math.floor(fill * 100) + '%');

    const boost = window.CB_CHESTS && window.CB_CHESTS.getActiveBoost
      ? window.CB_CHESTS.getActiveBoost(state)
      : c.activeBoost;
    if (boost && boost.endsAt) {
      const left = Math.max(0, boost.endsAt - Date.now());
      const sec = Math.ceil(left / 1000);
      const name = (boost.name || boost.id || 'Boost').toString();
      let effect = '';
      if (boost.visualBomb || boost.id === 'bomb_barrage') effect = ' · bolts +50%';
      else if (boost.killMult && boost.killMult > 1) {
        effect = ' · bolts +' + Math.round((boost.killMult - 1) * 100) + '%';
      } else if (boost.goldMult && boost.goldMult > 1) {
        effect = ' · gold +' + Math.round((boost.goldMult - 1) * 100) + '%';
      } else if (boost.critBonus) {
        effect = ' · crit +' + Math.round(boost.critBonus * 100) + '%';
      }
      twitchCounter(els.lsBoost, name + effect + ' · ' + sec + 's');
    } else {
      twitchCounter(els.lsBoost, '—');
    }

    const comp = S.completionPct(state);
    twitchCounter(els.lsComp, F.pct(comp, 0));

    // Prey chip already handled elsewhere; keep sync
    if (contract && els.lsPrey) {
      const prey = S.getMarkedPrey(contract.areaId);
      if (prey && !state.prey[prey.id]?.finished) {
        const st = state.prey[prey.id] || { chip: 0 };
        const pct = Math.min(100, (st.chip / prey.threshold) * 100);
        twitchCounter(els.lsPrey, F.pct(pct / 100, 0));
      } else if (prey?.id && state.prey[prey.id]?.finished) {
        twitchCounter(els.lsPrey, 'Done');
      } else {
        twitchCounter(els.lsPrey, '—');
      }
    }
  }



  function shortTargetName(contract) {
    if (!contract) return '—';
    const S = window.CB_STATE;
    let n = S.displayName ? S.displayName(contract) : contract.name;
    // Keep "Name · Lv N" if short enough; else name only
    if (n.length > 18) {
      n = (S.resolveNameKey && contract.nameKey)
        ? (S.resolveNameKey(contract.nameKey, contract.name) || contract.name)
        : contract.name;
      const lv = contract.displayLevel || contract.level;
      if (lv) n = n + ' · Lv ' + lv;
    }
    return n;
  }

  function updateTargetSwitcher(state) {
    if (!els.targetSwitcher) return;
    const S = window.CB_STATE;
    const bossOn = !!(S.isBossFightActive && S.isBossFightActive(state));
    els.targetSwitcher.classList.toggle('hidden', bossOn);
    if (bossOn) return;
    const ladder = S.huntTargetLadder ? S.huntTargetLadder() : [];
    const curId = state.currentContractId;
    let idx = ladder.findIndex(c => c.id === curId);
    const cur = curId ? S.getContract(curId) : null;
    if (els.tsChip) {
      if (performance.now() < switcherLockHintUntil && els.tsChip.dataset.lockHint) {
        els.tsChip.textContent = '🔒 ' + els.tsChip.dataset.lockHint;
        els.tsChip.classList.add('ts-locked');
      } else {
        els.tsChip.textContent = shortTargetName(cur);
        els.tsChip.classList.remove('ts-locked');
        delete els.tsChip.dataset.lockHint;
      }
    }
    // Dim ends: no unlocked neighbor
    function canStep(dir) {
      if (idx < 0) return ladder.some(c => S.isContractUnlocked(state, c.id));
      const j = idx + dir;
      if (j < 0 || j >= ladder.length) return false;
      return S.isContractUnlocked(state, ladder[j].id);
    }
    const upOk = canStep(+1);
    const downOk = canStep(-1);
    if (els.tsUp) {
      els.tsUp.disabled = !upOk && idx >= ladder.length - 1;
      els.tsUp.classList.toggle('dim', !upOk);
      // If next exists but locked, keep clickable to show Need hint
      const nextLocked = idx >= 0 && idx < ladder.length - 1 && !S.isContractUnlocked(state, ladder[idx + 1].id);
      if (nextLocked) { els.tsUp.disabled = false; els.tsUp.classList.add('dim'); }
      if (idx >= ladder.length - 1) { els.tsUp.disabled = true; els.tsUp.classList.add('dim'); }
    }
    if (els.tsDown) {
      const prevLocked = idx > 0 && !S.isContractUnlocked(state, ladder[idx - 1].id);
      els.tsDown.disabled = idx <= 0;
      els.tsDown.classList.toggle('dim', idx <= 0 || prevLocked);
    }
    if (els.tsAuto) {
      const on = !!state.targetAuto;
      els.tsAuto.classList.toggle('on', on);
      els.tsAuto.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function applyTargetSwitchResult(r, dir) {
    const st = getState ? getState() : null;
    if (!st) return;
    if (r && r.ok) {
      switcherLockHintUntil = 0;
      if (els.tsChip) delete els.tsChip.dataset.lockHint;
      markDirty();
      if (window.CB_UI && window.CB_UI.renderAll) {
        try { window.CB_UI.renderAll(st, 'hunt'); } catch (e) { /* soft */ }
      } else {
        render(st);
      }
      updateTargetSwitcher(st);
      return;
    }
    if (window.CB_AUDIO && window.CB_AUDIO.denied) {
      try { window.CB_AUDIO.denied(); } catch (e) { /* soft */ } // feel1: locked/invalid switcher press
    }
    if (r && r.locked && r.need) {
      if (els.tsChip) {
        els.tsChip.dataset.lockHint = r.need;
        els.tsChip.textContent = '🔒 ' + r.need;
        els.tsChip.classList.add('ts-locked');
      }
      switcherLockHintUntil = performance.now() + 1600;
      if (window.CB_UI && window.CB_UI.toast) {
        window.CB_UI.toast('🔒 ' + r.need, { ms: 2200 });
      }
      return;
    }
    updateTargetSwitcher(st);
  }

  function recordKillTimeMs(ms) {
    if (!(ms > 0) || ms > 120000) return;
    recentKillMs.push(ms);
    if (recentKillMs.length > 10) recentKillMs.shift();
  }

  function avgRecentKillMs() {
    if (!recentKillMs.length) return 0;
    let s = 0;
    recentKillMs.forEach(v => { s += v; });
    return s / recentKillMs.length;
  }

  function maybeRunTargetAuto(state) {
    if (!state || !state.targetAuto) return;
    if (!window.CB_STATE || !window.CB_STATE.evaluateTargetAuto) return;
    if (performance.now() < autoEvalCooldownUntil) return;
    const avg = avgRecentKillMs();
    const r = window.CB_STATE.evaluateTargetAuto(state, avg, recentKillMs.length);
    if (r && r.ok) {
      autoEvalCooldownUntil = performance.now() + 8000; // hysteresis dwell
      recentKillMs = []; // fresh sample on new target
      applyTargetSwitchResult(r, r.action === 'up' ? 1 : -1);
      if (window.CB_UI && window.CB_UI.toast) {
        const nm = r.contract ? shortTargetName(r.contract) : '';
        window.CB_UI.toast('Auto → ' + nm, { ms: 1800 });
      }
    } else {
      autoEvalCooldownUntil = performance.now() + 2500;
    }
  }

  function syncBossHud(state) {
    if (!window.CB_STATE || !window.CB_STATE.isBossFightActive(state)) {
      if (els.bossLeaveBtn) {
        els.bossLeaveBtn.classList.add('hidden');
        els.bossLeaveBtn.removeAttribute('data-id');
      }
      if (els.taskDock) els.taskDock.classList.remove('boss-fight');
      if (els.bossHpOverlay) els.bossHpOverlay.classList.remove('show');
      if (els.targetSwitcher) els.targetSwitcher.classList.remove('hidden');
      return false;
    }
    const boss = window.CB_STATE.getActiveBoss(state);
    if (!boss) return false;
    const F = window.CB_FMT;
    const living = wave.filter(m => m && m.isBoss && m.hp > 0 && m.el && !m.el.classList.contains('dying'));
    const mob = living[0] || wave.find(m => m && m.isBoss);
    const maxHp = getMonsterVisualHp(boss);
    const hp = mob ? Math.max(0, mob.hp) : 0;
    const pct = Math.min(100, (hp / Math.max(1, maxHp)) * 100);
    // Boss HP lives in the top overlay; task strip stays thin for Leave
    if (els.bossHpOverlay) els.bossHpOverlay.classList.add('show');
    if (els.bossHpFill) els.bossHpFill.style.width = pct + '%';
    if (els.playerHint) {
      els.playerHint.classList.add('hint-gone', 'boss-hide');
    }
    if (els.targetSwitcher) els.targetSwitcher.classList.add('hidden');
    if (els.bossHpLab) {
      els.bossHpLab.textContent = 'Boss · ' + F.num(hp, 0) + ' / ' + F.num(maxHp, 0) + ' HP';
    }
    if (els.hpBar) els.hpBar.style.width = pct + '%';
    if (els.hpLabel) els.hpLabel.textContent = 'Tier Test';
    if (els.monsterName) {
      let bn = window.CB_STATE.bossDisplayName(boss);
      const blv = boss.displayLevel || boss.level;
      if (blv && !/\bLv\s*\d+/i.test(bn)) bn = bn + ' · Lv ' + blv;
      els.monsterName.textContent = bn;
      els.monsterName.classList.remove('hidden');
    }
    if (els.taskDock) {
      els.taskDock.classList.remove('need-task');
      els.taskDock.classList.add('boss-fight');
    }
    if (els.taskRewardInline) {
      els.taskRewardInline.textContent = 'Kill for relic';
      els.taskRewardInline.classList.remove('hidden');
    }
    if (els.taskPickBtn) els.taskPickBtn.classList.add('hidden');
    if (els.bossLeaveBtn) {
      els.bossLeaveBtn.classList.remove('hidden');
      els.bossLeaveBtn.setAttribute('data-id', boss.id);
      els.bossLeaveBtn.setAttribute('data-action', 'flee-boss');
    }
    return true;
  }


  /** During intro "Finish Bristle Cub Task", mirror one kill goal (avoid dual 15 vs 25). */
  function syncIntroTaskDock(state, contract, kills, quota) {
    if (!els.hpLabel) return false;
    try {
      const I = window.CB_INTRO;
      if (!I || !I.isActive || !I.isActive(state) || !I.currentTask) return false;
      const task = I.currentTask(state);
      if (!task || task.id !== 'finish_bristle') return false;
      const q = quota || 25;
      const k = Math.min(q, Math.floor(kills || 0));
      els.hpLabel.textContent = 'Task · ' + k + ' / ' + q + ' kills';
      if (els.taskRewardInline) {
        els.taskRewardInline.textContent = 'Intro: fill this bar';
        els.taskRewardInline.classList.remove('hidden');
      }
      // Hide arena hold tip while intro instr covers it
      if (els.playerHint) els.playerHint.classList.add('hint-gone');
      return true;
    } catch (e) { return false; }
  }

  function updatePreyPanel(state) {
    if (!els.preyPanel) return;
    const S = window.CB_STATE;
    const F = window.CB_FMT;
    const D = window.CB_DATA;
    let html = `<h3 class="section-title">Level bosses</h3>`;
    D.markedPrey.forEach(p => {
      if (p.hidden) return;
      if (!state.areas[p.areaId]?.unlocked && !state.prey[p.id]?.finished) return;
      const st = S.ensurePreyEntry(state, p.id);
      const cost = S.bossCostOf(p);
      const meter = st.meter || 0;
      const pct = Math.min(100, (meter / Math.max(1, cost)) * 100);
      const fighting = S.isBossFightActive(state) && state.bossFight.preyId === p.id;
      const canFight = !st.finished && (st.accessUnlocked || meter >= cost);
      const lvl = S.levelLabel(p.areaId);
      const chip = S.levelChipHtml ? S.levelChipHtml(p.areaId) : `<span class="level-chip">${lvl}</span>`;
      const title = S.bossDisplayName(p);
      html += `<div class="card prey-card ${st.finished ? 'done' : ''} ${canFight ? 'ready' : ''} ${fighting ? 'fighting' : ''}" data-prey-card="${p.id}">
        <div class="card-head">
          <span class="emoji">${p.emoji}</span>
          <div>
            <h3>${title}</h3>
            <p class="muted tiny">${chip} · apex fight</p>
          </div>
        </div>
        <p class="tiny prey-progress" data-prey-id="${p.id}">Slayer points ${F.num(meter, 0)} / ${cost}</p>
        <div class="bar-wrap prey"><div class="bar" style="width:${pct}%"></div></div>
        ${st.finished
          ? `<p class="success tiny">${lvl} cleared — next Level unlocked</p>`
          : fighting
            ? `<p class="tiny accent">Fighting — leave anytime (HP resets, access kept)</p>
               <button type="button" class="btn ghost boss-leave-btn" data-action="flee-boss" data-id="${p.id}">Leave fight</button>`
            : `<button type="button" class="btn ${canFight ? 'primary glow' : 'ghost'} ${canFight ? '' : 'locked'}" data-action="fight-boss" data-id="${p.id}" ${canFight ? 'title="Start live boss fight"' : 'disabled aria-disabled="true"'} aria-label="${canFight ? 'Start live boss fight' : ('Need ' + F.num(meter, 0) + ' of ' + cost + ' Slayer points')}">Fight boss</button>
                 <p class="muted tiny">${canFight
                   ? (st.accessUnlocked ? 'Access unlocked — fight until you win.' : 'Meter full — Fight boss for a relic + next Level.')
                   : ('Slayer points ' + F.num(meter, 0) + ' / ' + cost + ' — earn on ' + lvl + ' Tasks.')}</p>`
        }
      </div>`;
    });
    els.preyPanel.innerHTML = html;
  }

  /**
   * Melee chase uptime estimate (Briar/Moss). Design baseline ~72% at hire;
   * scales mildly with hunterMoveSpeed so Swift Walk / Faster Chase / Hard Charge read on chips.
   * Ranged/mage (Quill/Ember) use full uptime.
   */
  function hunterChaseUptime(hunterId) {
    const fx = HUNTER_FX[hunterId] || HUNTER_FX.briar;
    const role = fx.role || 'melee';
    if (role !== 'melee') return 1;
    const move = Math.max(1, hunterMoveMult());
    return Math.min(0.95, 0.72 * Math.sqrt(move));
  }

  /**
   * Expected integer chip (no RNG jitter / no crit) — same mult path as hunterHpChip.
   */
  function hunterExpectedChip(hunterId) {
    const stats = hunterCombatStats(hunterId);
    let chip = stats.dmg;
    chip *= HUNTER_DMG();
    chip *= hunterPowerMult();
    chip *= hunterDmgMult();
    if (hunterId === 'quill') chip *= quillDmgMult();
    if (hunterId === 'briar') chip *= briarDmgMult();
    return Math.max(1, Math.round(chip));
  }

  /**
   * Sustained DPS from HUNTER_COMBAT × hunter dmg / atk-speed / power, × chase uptime.
   * Uses non-holding cadence (no active pep) so chips match AFK-watching combat.
   * Does NOT include player bolts.
   */
  function hunterSustainedDps(hunterId) {
    const stats = hunterCombatStats(hunterId);
    const chip = hunterExpectedChip(hunterId);
    const spd = Math.max(0.35, hunterAtkSpeedMultFor(hunterId));
    const intervalMs = Math.min(2800, Math.max(500, Math.round(stats.attackIntervalMs / spd)));
    const hitsPerSec = 1000 / intervalMs;
    // Quill Multishot: 1 + bonus arrows; extras at ~0.85 falloff in estimate
    let volley = 1;
    if (hunterId === 'quill') {
      const extra = quillMultishotBonus();
      volley = 1 + extra * 0.85;
    }
    return chip * volley * hitsPerSec * hunterChaseUptime(hunterId);
  }

  /** Estimated kills/min for this hunter vs a mob HP pool (combat DPS, not idle labor). */
  function hunterEstKillsPerMin(hunterId, mobMaxHp) {
    const hp = (mobMaxHp > 0) ? mobMaxHp : getMonsterVisualHp();
    return (hunterSustainedDps(hunterId) / hp) * 60;
  }

  function formatHunterContribChip(hunterId, F, mobHp) {
    const dmg = hunterExpectedChip(hunterId);
    const kpm = hunterEstKillsPerMin(hunterId, mobHp || getMonsterVisualHp());
    return F.num(dmg, 0) + ' dmg · ~' + F.num(kpm, 1) + ' k/m';
  }

  /**
   * Hunt contrib chips = real combat estimate per unlocked hunter.
   * NOT idle h.idle share of killRatePerMin (that AFK labor model lied about live fight power).
   */
  function updateHunterContrib(state, contract) {
    if (!els.hunterContrib) return;
    const F = window.CB_FMT;
    const D = window.CB_DATA;
    // Prefer current contract HP pool (per-monster combat.hpMult)
    const mobHp = getMonsterVisualHp(contract);
    const cid = (contract && contract.id) || 'none';

    const unlocked = D.hunters.filter(h => state.hunters[h.id]?.unlocked);
    // Include Company combat bonuses so chips rebuild/jump immediately after purchase
    const b = window.CB_STATE ? window.CB_STATE.getBonuses(state) : null;
    const bonusKey = b
      ? [b.hunterPower, b.hunterDmg, b.hunterAtkSpeed, b.hunterMoveSpeed, b.quillDmg, b.quillAtkSpeed, b.quillMultishot, b.quillProjSpeed, b.briarDmg]
          .map(x => Number(x || 0).toFixed(3)).join(',')
      : '1';
    const key = 'combat:' + unlocked.map(h => h.id).join(',') + ':' + cid + ':hp' + mobHp + ':b' + bonusKey;
    if (els.hunterContrib.dataset.key !== key) {
      els.hunterContrib.dataset.key = key;
      let html = '';
      unlocked.forEach(h => {
        html += '<div class="contrib-chip" data-hid="' + h.id + '"><span>' + h.emoji + ' ' + h.name
          + '</span><span class="cv" title="Combat estimate: chip · kills/min vs current monster HP">'
          + formatHunterContribChip(h.id, F, mobHp) + '</span></div>';
      });
      els.hunterContrib.innerHTML = html || '<p class="muted tiny">No hunters hired</p>';
      return;
    }
    unlocked.forEach(h => {
      const chip = els.hunterContrib.querySelector('[data-hid="' + h.id + '"] .cv');
      if (!chip) return;
      const next = formatHunterContribChip(h.id, F, mobHp);
      if (chip.textContent !== next) chip.textContent = next;
    });
  }

  function update(state, gainsHint) {
    if (!ensureShell(state)) return;
    if (performance.now() < bossMomentUntil) return; // boss death beat: freeze HUD swaps

    const S = window.CB_STATE;
    const F = window.CB_FMT;
    const contract = state.currentContractId ? S.getContract(state.currentContractId) : null;
    const b = S.getBonuses(state);

    state.holding = holding;
    syncBoltAimHint(holding);

    const rate = contract ? S.killRatePerMin(state, contract) : 0;
    const avgGold = contract
      ? ((contract.goldMin + contract.goldMax) / 2) * b.lootLuck
      : 0;
    const gpm = rate * avgGold;
    lastGpm = gpm;

    // Header gold rate chip
    const rateEl = document.getElementById('res-gold-rate');
    if (rateEl) rateEl.textContent = '+' + F.num(gpm, 1) + '/m';

    lifetimeXpBase = state.guildXp || 0;
    updateDenseCounters(state, contract);
    updateSlayerPanel(state, contract);
    updateGearStrip(state);
    syncBeamTier(state);
    syncXpDock(false);

    if (S.isBossFightActive && S.isBossFightActive(state)) {
      syncBossHud(state);
      updateTargetSwitcher(state);
      // Do not soft-swap visuals mid-boss
    } else if (contract) {
      if (els.bossLeaveBtn) els.bossLeaveBtn.classList.add('hidden');
      if (els.taskDock) els.taskDock.classList.remove('boss-fight');
      const quota = S.effectiveQuota(state, contract);
      const kills = Math.min(Math.floor(state.contractProgress || 0), quota);
      const pct = Math.min(100, (kills / Math.max(1, quota)) * 100);
      if (els.hpBar) els.hpBar.style.width = pct + '%';
      if (els.hpLabel) els.hpLabel.textContent = `Task · ${kills} / ${quota} kills`;
      if (els.taskDock) els.taskDock.classList.remove('need-task');
      if (els.taskPickBtn) els.taskPickBtn.classList.add('hidden');
      if (els.taskRewardInline) els.taskRewardInline.classList.remove('hidden');
      if (els.monsterName) {
        let n = S.displayName ? S.displayName(contract) : contract.name;
        const lv = contract.displayLevel || contract.level;
        if (lv && !/\bLv\s*\d+/i.test(n)) n = n + ' · Lv ' + lv;
        els.monsterName.textContent = n;
        els.monsterName.classList.remove('hidden');
      }
      // Soft-update wave visuals if contract changed mid-shell (shouldn't often)
      const vis = mobVisualKey(contract);
      wave.forEach(m => {
        if (m.el && !m.isBoss) {
          if (m.visual !== vis) {
            const body = m.el.querySelector('.mob-body');
            if (body) body.innerHTML = mobFigHtml(vis);
            m.el.dataset.visual = vis;
            m.visual = vis;
          }
          m.emoji = contract.emoji;
        }
      });
    } else {
      if (els.bossLeaveBtn) els.bossLeaveBtn.classList.add('hidden');
      if (els.taskDock) els.taskDock.classList.remove('boss-fight');
      if (els.hpBar) els.hpBar.style.width = '0%';
      if (els.hpLabel) els.hpLabel.textContent = 'Pick a task at Slayer Master';
      if (els.taskDock) els.taskDock.classList.add('need-task');
      if (window.CB_AUDIO && typeof window.CB_AUDIO.nudgeEmptyTask === 'function') {
        try { window.CB_AUDIO.nudgeEmptyTask(); } catch (e) { /* soft */ }
      }
      if (els.taskPickBtn) els.taskPickBtn.classList.remove('hidden');
      if (els.taskRewardInline) {
        els.taskRewardInline.textContent = '';
        els.taskRewardInline.classList.add('hidden');
      }
      if (els.monsterName) {
        els.monsterName.textContent = '';
        els.monsterName.classList.add('hidden');
      }
    }

    if (els.foodBar) {
      els.foodBar.style.width = Math.min(100, (state.food / b.foodCap) * 100) + '%';
    }
    if (els.foodMetaRegen) {
      els.foodMetaRegen.textContent = `Refills: ${F.num(b.foodRegen, 1)} / min`;
    }
    if (els.foodMetaEff) {
      const eff = b.foodEff || 1;
      if (eff <= 1.001) {
        els.foodMetaEff.textContent = 'Efficiency: normal';
      } else {
        const savePct = Math.round((1 - 1 / eff) * 100);
        els.foodMetaEff.textContent = `Efficiency: −${savePct}% food per kill`;
      }
    }

    if (els.preyPanel) {
      let needPreyRebuild = false;
      const S = window.CB_STATE;
      window.CB_DATA.markedPrey.forEach(p => {
        if (p.hidden) return;
        if (!state.areas[p.areaId]?.unlocked && !state.prey[p.id]?.finished) return;
        const st = S.ensurePreyEntry(state, p.id);
        const cost = S.bossCostOf(p);
        const ready = !st.finished && (st.accessUnlocked || (st.meter || 0) >= cost);
        const elFight = els.preyPanel.querySelector(`[data-action="fight-boss"][data-id="${p.id}"]`);
        const fighting = S.isBossFightActive(state) && state.bossFight.preyId === p.id;
        const fightDisabled = !!(elFight && elFight.disabled);
        if ((ready && !fighting && !st.finished && (!elFight || fightDisabled))
            || (!ready && elFight && !fightDisabled && !st.finished && !fighting)
            || (fighting && !els.preyPanel.querySelector('.fighting'))) {
          needPreyRebuild = true;
        }
      });
      if (needPreyRebuild) {
        updatePreyPanel(state);
      } else {
        const F = window.CB_FMT;
        window.CB_DATA.markedPrey.forEach(p => {
          if (p.hidden) return;
          if (!state.areas[p.areaId]?.unlocked && !state.prey[p.id]?.finished) return;
          const st = S.ensurePreyEntry(state, p.id);
          const cost = S.bossCostOf(p);
          const pct = Math.min(100, ((st.meter || 0) / Math.max(1, cost)) * 100);
          const root = els.preyPanel.querySelector(`[data-prey-card="${p.id}"]`);
          if (root) {
            const bar = root.querySelector('.bar-wrap.prey .bar');
            if (bar) bar.style.width = pct + '%';
            const prog = root.querySelector('.prey-progress');
            if (prog) prog.textContent = 'Slayer points ' + F.num(st.meter || 0, 0) + ' / ' + cost;
          }
        });
      }
    }

    // Economy kills: tiny cosmetic spark nudge only (never HP — see soft path)
    if (gainsHint && gainsHint.kills > 0) {
      sparkQueue += Math.min(2, gainsHint.kills * 0.25);
    }
    // Cache rate for per-frame chatter in visualTick
    state._visualRate = rate;

    updateTargetSwitcher(state);
    if (!syncBossHud(state)) updateHunterContrib(state, contract);
    else updateHunterContrib(state, contract);

    if (window.CB_CHESTS) window.CB_CHESTS.syncOverlay(state);

    // Economy kills → feed + XP tick (AFK busy)
    if (gainsHint && gainsHint.kills > 0 && contract) {
      const gk = Math.floor(gainsHint.kills);
      if (gk >= 1) {
        pushFeed('kill', 'Task progress ' + F.num(Math.min(state.contractProgress, S.effectiveQuota(state, contract)), 0)
          + '/' + F.num(S.effectiveQuota(state, contract)));
        if (gainsHint.gold > 0) pushFeed('loot', 'Loot: +' + F.num(gainsHint.gold, 1) + ' gold');
        gainXp(gk * (4 + Math.floor(Math.random() * 6)));
      }
    }
  }

  function startLoop() {
    stopLoop();
    lastVisual = performance.now();
    const frame = (now) => {
      rafId = requestAnimationFrame(frame);
      if (now - lastVisual < VISUAL_MS) return;
      const dt = now - lastVisual;
      lastVisual = now;
      visualTick(now, dt);
    };
    rafId = requestAnimationFrame(frame);
  }

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* —— feel2: random wander —— */
  const WANDER_BOUNDS = { x0: 16, x1: 84, y0: 14, y1: 64 }; // clear of HUD tubes (left), task strip + player (bottom)
  const WANDER_SPEED = 9; // % of arena per second at moveMult 1
  const PLAYER_CLEAR_R = 26;
  function wanderIdleMs() { return 400 + Math.random() * 1100; }
  // Overlays that hide monsters (open intro-task panel, target switcher), in arena %, refreshed ~2×/s
  let wanderBlocks = [];
  let wanderBlocksAt = 0;
  function refreshWanderBlocks(now) {
    if (now < wanderBlocksAt || !els.arena) return;
    wanderBlocksAt = now + 500;
    const a = els.arena.getBoundingClientRect();
    if (a.width <= 0 || a.height <= 0) return;
    const out = [];
    ['intro-dock', 'target-switcher'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el || el.hidden || el.classList.contains('hidden') || el.offsetParent === null) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      out.push({ x0: (r.left - a.left) / a.width * 100 - 7, x1: (r.right - a.left) / a.width * 100 + 7, y0: (r.top - a.top) / a.height * 100 - 4, y1: (r.bottom - a.top) / a.height * 100 + 6 });
    });
    wanderBlocks = out;
  }
  function wanderSpotOk(x, y, self) {
    if (x < WANDER_BOUNDS.x0 || x > WANDER_BOUNDS.x1 || y < WANDER_BOUNDS.y0 || y > WANDER_BOUNDS.y1) return false;
    const o = playerOriginPct();
    if (Math.hypot(x - o.x, y - o.y) < PLAYER_CLEAR_R) return false;
    const swOn = !(els.targetSwitcher && els.targetSwitcher.classList.contains('hidden'));
    if (swOn && x > SWITCHER_LANE.x0 - 3 && y > SWITCHER_LANE.y0 - 4 && y < SWITCHER_LANE.y1 + 4) return false;
    for (const bl of wanderBlocks) {
      if (x > bl.x0 && x < bl.x1 && y > bl.y0 && y < bl.y1) return false;
    }
    for (const m of wave) {
      if (!m || m === self || m.hp <= 0) continue;
      const tx = m.wander && m.wander.walking ? m.wander.toX : m.liveX;
      const ty = m.wander && m.wander.walking ? m.wander.toY : m.liveY;
      if (Math.hypot(x - tx, y - ty) < 12) return false;
    }
    return true;
  }
  function pickWanderTarget(m) {
    const rm = reduceMotionOn();
    const rMin = rm ? 4 : 8;
    const rMax = rm ? 13 : 26;
    for (let k = 0; k < 14; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = rMin + Math.random() * (rMax - rMin);
      const x = m.liveX + Math.cos(a) * r;
      const y = m.liveY + Math.sin(a) * r * 0.8;
      if (wanderSpotOk(x, y, m)) return { x, y };
    }
    for (let k = 0; k < 12; k++) {
      const x = WANDER_BOUNDS.x0 + Math.random() * (WANDER_BOUNDS.x1 - WANDER_BOUNDS.x0);
      const y = WANDER_BOUNDS.y0 + Math.random() * (WANDER_BOUNDS.y1 - WANDER_BOUNDS.y0);
      if (Math.hypot(x - m.liveX, y - m.liveY) <= (rm ? 20 : 40) && wanderSpotOk(x, y, m)) return { x, y };
    }
    // Fallback: drift back toward a park slot that is clear
    const s0 = SPAWN_SLOTS[m.slotIndex != null ? m.slotIndex : 5];
    return wanderSpotOk(s0.x, s0.y, m) ? { x: s0.x, y: s0.y } : null;
  }
  function wanderStep(m, combat, moveMult, now, dtSec) {
    refreshWanderBlocks(now);
    if (!m.wander) m.wander = { walking: false, idleUntil: now + wanderIdleMs() };
    const w = m.wander;
    if (!w.walking) {
      m.vx = 0; m.vy = 0;
      m.el.classList.remove('wandering');
      if (now >= w.idleUntil) {
        const tgt = pickWanderTarget(m);
        if (!tgt) { w.idleUntil = now + wanderIdleMs(); return; }
        const dist = Math.hypot(tgt.x - m.liveX, tgt.y - m.liveY);
        const speed = WANDER_SPEED * moveMult * (combat.charger ? 1.3 : 1) * (reduceMotionOn() ? 0.5 : 1);
        Object.assign(w, { walking: true, fromX: m.liveX, fromY: m.liveY, toX: tgt.x, toY: tgt.y, t: 0, dur: Math.max(0.7, Math.min(4, dist / Math.max(1, speed))) });
        m.el.classList.add('wandering');
        const right = tgt.x >= m.liveX;
        m.el.classList.toggle('face-right', right);
        m.el.classList.toggle('face-left', !right);
      }
      return;
    }
    w.t += dtSec;
    const t = Math.min(1, w.t / w.dur);
    const e = 0.5 - 0.5 * Math.cos(Math.PI * t); // ease in-out
    const px = m.liveX, py = m.liveY;
    m.liveX = w.fromX + (w.toX - w.fromX) * e;
    m.liveY = w.fromY + (w.toY - w.fromY) * e;
    m.baseX = m.liveX; m.baseY = m.liveY;
    if (dtSec > 0) { m.vx = (m.liveX - px) / dtSec; m.vy = (m.liveY - py) / dtSec; }
    if (t >= 1) {
      w.walking = false;
      w.idleUntil = now + wanderIdleMs();
      m.vx = 0; m.vy = 0;
      m.el.classList.remove('wandering');
    }
  }
  /** Where a moving mob will be `sec` from now (bolts lead slightly so hits land on walkers). */
  function mobLeadPos(m, sec) {
    const p = mobPosPct(m);
    const k = Math.max(0, Math.min(0.6, sec || 0));
    return { x: p.x + (m.vx || 0) * k, y: p.y + (m.vy || 0) * k };
  }

  function visualTick(now, dt) {
    const state = getState ? getState() : null;
    if (!state || !els.arena) return;

    const huntScreen = document.getElementById('screen-hunt');
    if (!huntScreen || !huntScreen.classList.contains('active')) return;

    const contract = state.currentContractId
      ? window.CB_STATE.getContract(state.currentContractId)
      : null;

    maybeGrowWave(state, performance.now()); // feel2: purchase can add a monster slot mid-task
    // Continuous bob / wander
    patrolPhase += 0.12;
    const dtSec = Math.min(0.05, (dt || VISUAL_MS) / 1000);

    // Walk-in + subtle idle wander (live % so aim/melee must re-track)
    wave.forEach((m, i) => {
      if (!m.el || m.el.classList.contains('dying')) return;

      if (m.state === 'entering') {
        m.enterT = (m.enterT || 0) + dtSec;
        const t = Math.min(1, m.enterT / Math.max(0.2, m.enterDur || 2.5));
        // Ease-out toward slot
        const ease = 1 - Math.pow(1 - t, 2.2);
        const startX = m.enterStartX != null ? m.enterStartX : (m.enterFrom === 'left' ? -8 : 108);
        const px = m.liveX, py = m.liveY;
        m.liveX = startX + (m.baseX - startX) * ease;
        m.liveY = m.baseY + Math.sin(ease * Math.PI) * 1.2;
        if (dtSec > 0 && px != null) { m.vx = (m.liveX - px) / dtSec; m.vy = (m.liveY - py) / dtSec; }
        syncMobEl(m);
        m.el.classList.add('walking-in');
        // Face toward slot
        m.el.classList.toggle('face-right', m.enterFrom === 'left');
        m.el.classList.toggle('face-left', m.enterFrom === 'right');
        if (t >= 1) finishWalkIn(m);
        return;
      }

      const combat = combatOf(contract);
      const moveMult = (combat.moveMult != null && combat.moveMult > 0) ? Number(combat.moveMult) : 1;
      if (m.isBoss) {
        // Bosses / Tier Tests: stay near their spot with the old slow, small drift (reads as "planted")
        const wanderAmp = (combat.wanderAmp != null && combat.wanderAmp > 0) ? Number(combat.wanderAmp) : 1;
        m.wanderPhase = (m.wanderPhase || 0) + dtSec * 0.85 * moveMult * (reduceMotionOn() ? 0.5 : 1);
        const k = wanderAmp * (reduceMotionOn() ? 0.5 : 1);
        m.liveX = m.baseX + (Math.sin(m.wanderPhase) * 2.2 + Math.sin(m.wanderPhase * 0.37 + i) * 0.8) * k;
        m.liveY = m.baseY + (Math.cos(m.wanderPhase * 0.9 + i * 0.7) * 1.5) * k;
        m.vx = 0; m.vy = 0;
        syncMobEl(m);
        const faceRightB = (m.liveX || m.baseX || 50) < 50;
        m.el.classList.toggle('face-left', !faceRightB);
        m.el.classList.toggle('face-right', faceRightB);
        return;
      }
      // feel2: random wander — pick a point in the hunt area, walk there (walk strip, eased), idle 0.4–1.5s, repeat
      wanderStep(m, combat, moveMult, now, dtSec);
      syncMobEl(m);
      const jig = m.wander && m.wander.walking ? 0 : Math.sin(patrolPhase * 1.4 + i * 2) * 1.2;
      if (!m.el.classList.contains('hit')) {
        m.el.style.setProperty('--wx', '0px');
        m.el.style.setProperty('--jig', jig.toFixed(1) + 'px');
      }
      // Ambient telegraph lean (idle only)
      if (!(m.wander && m.wander.walking) && now > (m.telegraphUntil || 0) && Math.random() < 0.006) {
        m.telegraphUntil = now + 280;
        m.el.classList.add('telegraph');
        setTimeout(() => m.el && m.el.classList.remove('telegraph'), 280);
      }
    });

    // feel2: held aim follows the solo respawn until the finger moves
    if (soloSnap && holding) {
      const sm = wave.find(x => x && x.id === soloSnap.mobId && x.hp > 0 && x.el && !x.el.classList.contains('dying'));
      if (sm) { const sp = mobPosPct(sm); aimX = sp.x; aimY = sp.y; } else soloSnap = null;
    }

    // Melee pathing every frame + attack timers
    // Tier Test / boss: helpers muted (weapon-only skill check — IOM drones-off-obelisk twin)
    const D = window.CB_DATA;
    const bossMute = !!(window.CB_STATE && window.CB_STATE.isBossFightActive && window.CB_STATE.isBossFightActive(state));
    const unlocked = D.hunters.filter(h => state.hunters[h.id]?.unlocked);
    unlocked.forEach((h, i) => {
      if (bossMute) {
        // Keep drones visible but idle — no pathing damage
        const fx = HUNTER_FX[h.id] || HUNTER_FX.briar;
        const role = fx.role || h.role || 'melee';
        if (hunterRuntime[h.id]) {
          const rt = hunterRuntime[h.id];
          syncDroneEl(h.id, rt);
          const drone = els.droneLayer && els.droneLayer.querySelector('[data-hunter="' + h.id + '"]');
          if (drone) {
            drone.classList.add('boss-muted', 'idle');
            drone.classList.remove('walking', 'swinging', 'firing');
          }
        }
        return;
      }

      const fx = HUNTER_FX[h.id] || HUNTER_FX.briar;
      const role = fx.role || h.role || 'melee';
      if (!hunterRuntime[h.id]) {
        const spots = placeHunters(unlocked.length);
        const p = spots[i] || { x: 10, y: 48 };
        hunterRuntime[h.id] = {
          x: p.x, y: p.y, homeX: p.x, homeY: p.y,
          targetId: null, facing: 1, swingUntil: 0, pauseUntil: 0, role,
        };
      }
      const rt = hunterRuntime[h.id];
      updateHunterMotion(h, fx, role, rt, now, dtSec, i);

      if (!hunterTimers[h.id]) hunterTimers[h.id] = now + i * 100;
      const interval = hunterIntervalMs(h.id);
      if (now >= hunterTimers[h.id] && now >= (rt.pauseUntil || 0) && now >= (rt.swingUntil || 0)) {
        const acted = tryHunterAttack(h, fx, role, rt, contract, now);
        if (acted) {
          hunterTimers[h.id] = now + interval * (0.85 + Math.random() * 0.3);
        } else {
          // Retry soon while closing distance — stay aggressive
          hunterTimers[h.id] = now + 55;
        }
      }
    });

    // Hold → paced directional bolts (aim = pointer direction from player)
    if (holding && now < bossMomentUntil) {
      boltTickAcc = 0; // boss death beat: nothing left to shoot
    } else if (holding) {
      boltTickAcc += dt;
      noteBoltAimHold(dt);
      const interval = boltIntervalMs();
      // iom7: wind-up (attack f0–1, 2 frames @11fps ≈ 182ms) so the thrust lands on the shot
      if (boltTickAcc < interval && boltTickAcc >= interval - 182 && window.CB_SPRITES && window.CB_SPRITES.playerAttack) {
        try { window.CB_SPRITES.playerAttack(els.player, 0, true); } catch (e) { /* soft */ }
      }
      while (boltTickAcc >= interval) {
        boltTickAcc -= interval;
        fireBolt(contract);
      }
      maybeSpecialPulse(state, contract, dt);
      // Screen shake only on crit / boss hits (see triggerCritShake) — not every shot
    } else {
      boltTickAcc = 0;
      specialAcc = 0;
    }

    // Soft spark chatter — COSMETIC ONLY; disabled during hold (splat hygiene)
    if (!holding) {
      const sparkPerSec = 1.5;
      sparkQueue += sparkPerSec * (dt / 1000);
      let drained = 0;
      const maxDrain = 1;
      while (sparkQueue >= 1 && drained < maxDrain) {
        sparkQueue -= 1;
        drained++;
        applyVisualHit(contract, { soft: true, source: 'spark' });
      }
      if (sparkQueue > 4) sparkQueue = 4;
    } else {
      sparkQueue = 0;
    }

    // Ready casket bars: jiggle every ~5s (no toast spam)
    chestJiggleAcc += dt;
    if (chestJiggleAcc >= 5000) {
      chestJiggleAcc = 0;
      nudgeReadyChests(state);
    }

    // Event ticker rotation + dense counter twitch (AFK motion)
    updateEventTicker(state, contract, dt);
    if (Math.random() < 0.08) updateDenseCounters(state, contract);

    // Soft XP drip while watching
    if (Math.random() < 0.02) gainXp(1 + Math.floor(Math.random() * 3));

    // Keep XP dock in sync; hunter contrib numbers update quietly (no twitch)
    syncXpDock(false);

    pulseResources(state);

    // Option C sprite frame advance + state sync
    if (window.CB_SPRITES) {
      try {
        if (els.player) {
          window.CB_SPRITES.syncPlayerAnim(els.player, !!holding);
        }
        if (els.droneLayer) {
          els.droneLayer.querySelectorAll('.drone[data-hunter]').forEach((d) => {
            window.CB_SPRITES.syncHunterAnim(d, d.dataset.hunter);
          });
        }
        wave.forEach((m) => {
          if (!m.el) return;
          let st = 'idle';
          if (m.el.classList.contains('walking-in') || m.state === 'entering' || (m.wander && m.wander.walking)) st = 'walk';
          else if (m.el.classList.contains('attacking') || m.el.classList.contains('telegraph')) st = 'attack';
          window.CB_SPRITES.syncMobAnim(m.el, st);
        });
        window.CB_SPRITES.tick(els.arena, dt || 50);
        // iom7: equipped-gear overlays ride the player anchor + frame
        if (window.CB_GEARVIS && els.player) window.CB_GEARVIS.tick(els.player, state);
      } catch (e) { /* soft */ }
    }
  }

  function getFocusMob() {
    if (!wave.length) return null;
    // Prefer locked living mob; else wrap from focusIdx to next alive
    const start = (lockedMobId != null) ? lockedMobId : focusIdx;
    for (let n = 0; n < wave.length; n++) {
      const i = (start + n) % wave.length;
      if (wave[i] && wave[i].hp > 0 && !wave[i].el?.classList.contains('dying')) {
        if (i !== focusIdx || lockedMobId !== i) setFocus(i);
        return wave[i];
      }
    }
    lockedMobId = null;
    return null;
  }

  function livingMobs() {
    // Damageable while walking in; exclude only dying / empty HP
    return wave.filter(m => m && m.hp > 0 && m.el && !m.el.classList.contains('dying'));
  }

  function pickMeleeTarget(hunterId, preferIdx) {
    const living = livingMobs();
    if (!living.length) return null;
    const rt = hunterRuntime[hunterId];
    // Stick to current living target — don't teleport-hit across the arena
    if (rt && rt.targetId != null) {
      const cur = living.find(m => m.id === rt.targetId);
      if (cur) return cur;
    }
    // Prefer nearest free living mob; claims only soft-tiebreak
    const claims = {};
    Object.keys(hunterRuntime).forEach(hid => {
      if (hid === hunterId) return;
      const ort = hunterRuntime[hid];
      if (!ort || ort.role !== 'melee') return;
      if (ort.targetId != null) claims[ort.targetId] = (claims[ort.targetId] || 0) + 1;
    });
    const scored = living.map((m) => {
      const pos = mobPosPct(m);
      const d = rt ? distPct(rt.x, rt.y, pos.x, pos.y) : 0;
      const claim = claims[m.id] || 0;
      const slotBias = (preferIdx != null && living.length)
        ? ((m.id === living[preferIdx % living.length].id) ? -1.5 : 0)
        : 0;
      // Distance-primary (was claim*40 — caused cross-arena chase)
      return { mob: m, score: d + claim * 4 + slotBias };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored[0].mob;
  }

  function ensureDroneDom(hunter, fx, role, rt) {
    if (!els.droneLayer || !rt) return null;
    let drone = els.droneLayer.querySelector(`[data-hunter="${hunter.id}"]`);
    if (drone) return drone;
    // Recreate missing drone so Briar never freezes with no DOM
    const st = getState ? getState() : null;
    const tint = st ? gearTint(st) : '#8a8a8a';
    const projAttr = fx.projectile ? ` data-proj="${fx.projectile}"` : ' data-proj=""';
    const wrap = document.createElement('div');
    const stationed = hunter.id === 'quill';
    wrap.className = 'drone drone-' + role + (stationed ? ' drone-stationed' : '');
    wrap.dataset.hunter = hunter.id;
    wrap.dataset.role = role;
    if (fx.projectile) wrap.dataset.proj = fx.projectile;
    else wrap.dataset.proj = '';
    wrap.style.left = rt.x + '%';
    wrap.style.top = rt.y + '%';
    wrap.style.setProperty('--drone-color', fx.color);
    wrap.style.setProperty('--gear-color', tint);
    wrap.title = hunter.name;
    const useSprite = window.CB_SPRITES && window.CB_SPRITES.hasHunter(hunter.id);
    if (useSprite) wrap.classList.add('drone-sprite');
    const standHtml = (stationed && !useSprite)
      ? '<div class="drone-stand" aria-hidden="true"><span class="ds-plinth"></span><span class="ds-post"></span></div>'
      : '';
    wrap.innerHTML = `${standHtml}<div class="drone-scale">
          <span class="drone-glow"></span>
          ${hunterFigHtml(hunter, fx, tint)}
        </div>
        <span class="drone-tag">${hunter.name}</span>`;
    els.droneLayer.appendChild(wrap);
    return wrap;
  }

  function syncDroneEl(hunterId, rt) {
    const drone = els.droneLayer && els.droneLayer.querySelector(`[data-hunter="${hunterId}"]`);
    if (!drone || !rt) return drone;
    drone.style.left = rt.x.toFixed(2) + '%';
    drone.style.top = rt.y.toFixed(2) + '%';
    drone.classList.toggle('face-left', rt.facing < 0);
    drone.classList.toggle('face-right', rt.facing >= 0);
    return drone;
  }

  function updateHunterMotion(hunter, fx, role, rt, now, dtSec, idx) {
    // Unstick absurd swingUntil (tab sleep / clock skew) so melee never freezes
    if (rt.swingUntil && rt.swingUntil > now + 2500) rt.swingUntil = 0;
    if (rt.pauseUntil && rt.pauseUntil > now + 2500) rt.pauseUntil = 0;
    let drone = ensureDroneDom(hunter, fx, role, rt);
    drone = syncDroneEl(hunter.id, rt);
    if (!drone) return;

    if (now < (rt.swingUntil || 0)) {
      drone.classList.add('swinging');
      drone.classList.remove('walking', 'idle');
      return;
    }
    drone.classList.remove('swinging', 'firing');

    if (role === 'melee') {
      const target = pickMeleeTarget(hunter.id, idx);
      if (!target) {
        // Idle patrol near home
        rt.targetId = null;
        const ang = patrolPhase * 0.35 + idx * 1.7;
        const tx = rt.homeX + Math.cos(ang) * 4;
        const ty = rt.homeY + Math.sin(ang) * 3;
        stepHunterToward(rt, tx, ty, dtSec * 0.35);
        const moving = distPct(rt.x, rt.y, tx, ty) > 0.6;
        drone.classList.toggle('walking', moving);
        drone.classList.toggle('idle', !moving);
        syncDroneEl(hunter.id, rt);
        return;
      }
      rt.targetId = target.id;
      const pos = mobPosPct(target);
      const d = distPct(rt.x, rt.y, pos.x, pos.y);
      if (d > MELEE_RANGE) {
        // Chase at current pace (slow at hire; Company upgrades raise speed)
        stepHunterToward(rt, pos.x, pos.y, dtSec);
        drone.classList.add('walking');
        drone.classList.remove('idle');
      } else {
        // Stay glued inside melee band; keep facing prey
        if (d > MELEE_RANGE * 0.45) {
          stepHunterToward(rt, pos.x, pos.y, dtSec * 0.5);
        }
        if (pos.x !== rt.x) rt.facing = pos.x >= rt.x ? 1 : -1;
        drone.classList.remove('walking');
        drone.classList.add('idle');
      }
      syncDroneEl(hunter.id, rt);
      return;
    }

    // Quill: fixed turret post — no sway / walk
    if (hunter.id === 'quill') {
      rt.x = rt.homeX;
      rt.y = rt.homeY;
      const focusQ = pickMeleeTarget(hunter.id, idx) || getFocusMob();
      if (focusQ) {
        const pos = mobPosPct(focusQ);
        rt.facing = pos.x >= rt.x ? 1 : -1;
        rt.targetId = focusQ.id;
      }
      drone.classList.add('drone-stationed', 'idle');
      drone.classList.remove('walking');
      syncDroneEl(hunter.id, rt);
      return;
    }

    // Other ranged / mage: hold near home with light sway; retarget living mob
    const swayX = rt.homeX + Math.sin(patrolPhase * 0.5 + idx) * 1.8;
    const swayY = rt.homeY + Math.cos(patrolPhase * 0.4 + idx * 0.9) * 1.4;
    stepHunterToward(rt, swayX, swayY, dtSec, Math.min(28, MELEE_SPEED * 1.1));
    const focus = pickMeleeTarget(hunter.id, idx) || getFocusMob();
    if (focus) {
      const pos = mobPosPct(focus);
      rt.facing = pos.x >= rt.x ? 1 : -1;
      rt.targetId = focus.id;
    }
    drone.classList.remove('walking');
    drone.classList.add('idle');
    syncDroneEl(hunter.id, rt);
  }

  function hunterMoveMult() {
    const st = getState ? getState() : null;
    if (!st || !window.CB_STATE) return 1;
    const b = window.CB_STATE.getBonuses(st);
    const m = b && b.hunterMoveSpeed;
    return (typeof m === 'number' && m > 0) ? m : 1;
  }

  function meleeWalkSpeed() {
    return Math.min(MELEE_SPEED_MAX, MELEE_SPEED * hunterMoveMult());
  }

  function stepHunterToward(rt, tx, ty, dtSec, speedOverride) {
    const d = distPct(rt.x, rt.y, tx, ty);
    if (d < 0.15) return;
    const dx = tx - rt.x;
    const dy = ty - rt.y;
    if (Math.abs(dx) > 0.05) rt.facing = dx >= 0 ? 1 : -1;
    const spd = speedOverride != null ? speedOverride : meleeWalkSpeed();
    const step = spd * dtSec;
    const t = Math.min(1, step / d);
    rt.x += dx * t;
    rt.y += dy * t;
    // Clamp to arena
    rt.x = Math.max(4, Math.min(96, rt.x));
    rt.y = Math.max(12, Math.min(88, rt.y));
  }

  /** @returns {boolean} whether an attack was performed */
  function tryHunterAttack(hunter, fx, role, rt, contract, now) {
    let drone = ensureDroneDom(hunter, fx, role, rt);
    if (!drone) drone = els.droneLayer && els.droneLayer.querySelector(`[data-hunter="${hunter.id}"]`);
    if (!drone || !els.arena) return false;

    if (role === 'melee') {
      const target = pickMeleeTarget(hunter.id);
      if (!target || !target.el) return false;
      rt.targetId = target.id;
      const pos = mobPosPct(target);
      const d = distPct(rt.x, rt.y, pos.x, pos.y);
      // No damage / no swing until inside tight melee radius
      if (d > MELEE_RANGE) return false;

      // Melee swing — NO projectile; unmistakable weapon arc on .fh-swing
      rt.facing = pos.x >= rt.x ? 1 : -1;
      syncDroneEl(hunter.id, rt);
      drone.classList.remove('walking', 'idle', 'firing');
      drone.classList.add('swinging');
      if (window.CB_AUDIO) {
        try { window.CB_AUDIO.play(hunter.id === 'briar' ? 'briar_swing' : 'briar_swing'); } catch (e) { /* soft */ }
      }
      const swingMs = 420;
      rt.swingUntil = now + swingMs;
      rt.pauseUntil = now + 90;

      const impactMob = target;
      const hunterRt = rt;
      const hunterRef = hunter;
      // Clean weapon swing only — no neon slash flash
      setTimeout(() => {
        if (!impactMob || impactMob.hp <= 0 || !impactMob.el) return;
        if (impactMob.el.classList.contains('dying')) return;
        // Re-check adjacency at impact — never chip a far mob
        const p2 = mobPosPct(impactMob);
        if (distPct(hunterRt.x, hunterRt.y, p2.x, p2.y) > MELEE_RANGE + 1.5) return;
        applyVisualHitToMob(impactMob, contract, {
          soft: false,
          source: 'hunter',
          hunter: hunterRef,
          crit: Math.random() < critChanceNow(),
          color: fx.color,
        });
        try {
          if (window.CB_INTRO && typeof window.CB_INTRO.onHunterMeleeHit === 'function') {
            window.CB_INTRO.onHunterMeleeHit(hunterRef.id);
          }
        } catch (e) { /* soft */ }
      }, 120);
      setTimeout(() => {
        if (drone && drone.classList) drone.classList.remove('swinging');
        // Clear swing lock even if CSS class was lost on rebuild
        if (hunterRt && hunterRt.swingUntil && performance.now() >= hunterRt.swingUntil - 30) {
          hunterRt.swingUntil = 0;
        }
      }, swingMs);
      return true;
    }

    // Ranged / mage: pick a living target; Quill stays at range (no walk-in)
    const mob = pickMeleeTarget(hunter.id) || getFocusMob();
    if (!mob || !mob.el) return false;
    rt.targetId = mob.id;
    const rpos = mobPosPct(mob);
    rt.facing = rpos.x >= rt.x ? 1 : -1;
    syncDroneEl(hunter.id, rt);

    drone.classList.remove('swinging', 'walking');
    drone.classList.add('firing', 'idle');
    setTimeout(() => drone.classList.remove('firing'), 280);

    // Quill: always fire a visible arrow even if FX table glitches
    const projKind = fx.projectile || (hunter.id === 'quill' ? 'arrow' : null);
    let flightMs = projKind === 'arrow' ? 720 : 320;
    if (projKind === 'arrow' && hunter.id === 'quill') {
      flightMs = Math.round(720 / (1 + quillProjSpeedBonus()));
      flightMs = Math.max(320, Math.min(720, flightMs));
    }
    const isQuill = hunter.id === 'quill';
    const arrowCount = isQuill && projKind === 'arrow' ? (1 + quillMultishotBonus()) : 1;
    const spreadDeg = 12; // ~12° between adjacent arrows

    if (projKind) {
      const mid = (arrowCount - 1) / 2;
      for (let i = 0; i < arrowCount; i++) {
        const offsetDeg = arrowCount <= 1 ? 0 : (i - mid) * spreadDeg;
        spawnProjectile(drone, mob.el, Object.assign({}, fx, { projectile: projKind }), flightMs, offsetDeg);
        if (isQuill && window.CB_AUDIO) {
          try { window.CB_AUDIO.play('quill_arrow_fire'); } catch (e) { /* soft */ }
        }
      }
    }

    // Damage on arrival for projectiles; near-instant for staff boltless feel
    const hitMob = mob;
    const delay = projKind ? flightMs - 30 : 40;
    const hunterRef = hunter;
    const fxColor = fx.color;
    const centerIdx = Math.floor((arrowCount - 1) / 2);
    for (let i = 0; i < arrowCount; i++) {
      const falloff = (arrowCount <= 1 || i === centerIdx) ? 1 : 0.85;
      setTimeout(() => {
        if (!hitMob || hitMob.hp <= 0 || !hitMob.el || hitMob.el.classList.contains('dying')) return;
        let dmg = hunterHpChip(hunterRef.id, Math.random() < critChanceNow());
        if (falloff < 1) dmg = Math.max(1, Math.round(dmg * falloff));
        applyVisualHitToMob(hitMob, contract, {
          soft: false,
          source: 'hunter',
          hunter: hunterRef,
          dmg,
          color: fxColor,
        });
        if (isQuill && window.CB_AUDIO) {
          try { window.CB_AUDIO.play('quill_arrow_hit'); } catch (e) { /* soft */ }
        }
      }, Math.max(40, delay) + i * 18);
    }
    return true;
  }

  /** Soft/spark cosmetic splat only (1–2). Real hits use applied HP. */
  function shownHitNumber(opts) {
    opts = opts || {};
    if (opts.soft || opts.source === 'spark') return 1 + Math.floor(Math.random() * 2);
    if (opts.crit) return 3 + Math.floor(Math.random() * 4);
    return 1 + Math.floor(Math.random() * 3);
  }

  function hunterPowerMult() {
    const st = getState ? getState() : null;
    if (!st || !window.CB_STATE) return 1;
    const b = window.CB_STATE.getBonuses(st);
    return (b && typeof b.hunterPower === 'number' && b.hunterPower > 0) ? b.hunterPower : 1;
  }

  function hunterDmgMult() {
    const st = getState ? getState() : null;
    if (!st || !window.CB_STATE) return 1;
    const b = window.CB_STATE.getBonuses(st);
    return (b && typeof b.hunterDmg === 'number' && b.hunterDmg > 0) ? b.hunterDmg : 1;
  }

  function hunterAtkSpeedMult() {
    const st = getState ? getState() : null;
    if (!st || !window.CB_STATE) return 1;
    const b = window.CB_STATE.getBonuses(st);
    return (b && typeof b.hunterAtkSpeed === 'number' && b.hunterAtkSpeed > 0) ? b.hunterAtkSpeed : 1;
  }

  function quillDmgMult() {
    const st = getState ? getState() : null;
    if (!st || !window.CB_STATE) return 1;
    const b = window.CB_STATE.getBonuses(st);
    return (b && typeof b.quillDmg === 'number' && b.quillDmg > 0) ? b.quillDmg : 1;
  }

  function quillAtkSpeedMult() {
    const st = getState ? getState() : null;
    if (!st || !window.CB_STATE) return 1;
    const b = window.CB_STATE.getBonuses(st);
    return (b && typeof b.quillAtkSpeed === 'number' && b.quillAtkSpeed > 0) ? b.quillAtkSpeed : 1;
  }

  function briarDmgMult() {
    const st = getState ? getState() : null;
    if (!st || !window.CB_STATE) return 1;
    const b = window.CB_STATE.getBonuses(st);
    return (b && typeof b.briarDmg === 'number' && b.briarDmg > 0) ? b.briarDmg : 1;
  }

  /** Additive Quill projectile speed bonus (0.25/lv). Higher = shorter flightMs. */
  function quillProjSpeedBonus() {
    const st = getState ? getState() : null;
    if (!st || !window.CB_STATE) return 0;
    const b = window.CB_STATE.getBonuses(st);
    return Math.max(0, (b && typeof b.quillProjSpeed === 'number') ? b.quillProjSpeed : 0);
  }

  /** Extra arrows from Quill Multishot (0 / 1 / 2 → total arrows 1 / 2 / 3). */
  function quillMultishotBonus() {
    const st = getState ? getState() : null;
    if (!st || !window.CB_STATE) return 0;
    const b = window.CB_STATE.getBonuses(st);
    return Math.min(2, Math.max(0, (b && b.quillMultishot) | 0));
  }

  function hunterAtkSpeedMultFor(hunterId) {
    let spd = hunterAtkSpeedMult();
    if (hunterId === 'quill') spd *= quillAtkSpeedMult();
    return spd;
  }

  /** Per-hunter base combat stats from data.js (independent of player bolts). */
  function hunterCombatStats(hunterId) {
    const id = hunterId || 'briar';
    const table = (window.CB_DATA && window.CB_DATA.HUNTER_COMBAT) || {};
    const row = table[id] || table.briar || { dmg: 11, attackIntervalMs: 1900 };
    return {
      dmg: Math.max(1, row.dmg | 0),
      attackIntervalMs: Math.max(400, row.attackIntervalMs | 0),
    };
  }

  /**
   * Integer HP chip for a hunter hit — from that hunter's base dmg × hunter-only mults.
   * Does NOT read player bolt DPS, killMult, or bolt interval.
   */
  function hunterHpChip(hunterId, crit) {
    const stats = hunterCombatStats(hunterId);
    let chip = stats.dmg;
    chip *= HUNTER_DMG();
    chip *= hunterPowerMult();
    chip *= hunterDmgMult();
    if (hunterId === 'quill') chip *= quillDmgMult();
    if (hunterId === 'briar') chip *= briarDmgMult();
    if (crit) chip *= 1.75;
    chip *= 0.94 + Math.random() * 0.12; // ±6% feel
    return Math.max(1, Math.round(chip));
  }

  /** Apply hit to a specific mob (melee retarget) without stealing global focus permanently */
  function applyVisualHitToMob(mob, contract, opts) {
    opts = opts || {};
    if (!mob || !mob.el) {
      if (!opts.soft) spawnLooseFloat(contract, opts);
      return;
    }
    // Soft/spark: cosmetic only — never reduce HP; no numbers during hold
    if (opts.soft || opts.source === 'spark') {
      // Cosmetic only — no numeric splat (splat numbers always equal HP removed)
      pulseMob(mob, 0.55);
      return;
    }
    // Real damage — splat number === integer HP removed (same units for player & hunters)
    let dmg;
    if (opts.dmg != null) {
      dmg = opts.dmg;
    } else if (opts.source === 'hunter') {
      dmg = hunterHpChip(opts.hunter && opts.hunter.id, !!opts.crit);
    } else {
      dmg = (opts.crit ? 2 : 1) * DMG();
    }
    dmg = Math.max(1, Math.round(dmg));
    mob.hp -= dmg;
    pulseMob(mob, holding ? 1.2 : 1);

    const shown = dmg;
    spawnHitSplat(mob.el, shown, Object.assign({}, opts, { mobId: mob.id }));
    if (opts.crit) spawnDmgFloat(mob.el, shown, true, opts.color);
    recordVisualDps(shown);
    const xpAmt = opts.crit ? (8 + Math.floor(Math.random() * 10)) : (1 + Math.floor(Math.random() * 4));
    gainXp(xpAmt * (holding ? 1.2 : 1));

    if (Math.random() < 0.2) {
      const mon = contract ? contract.name : 'prey';
      const who = opts.hunter ? opts.hunter.name
        : ((opts.source === 'beam' || opts.source === 'bolt') ? 'You' : 'Hunter');
      if (opts.crit) pushFeed('crit', who + ': critical! ' + shown + ' on ' + mon);
      else pushFeed('hit', who + ' hits ' + mon + ' for ' + shown);
    }

    const fill = mob.el.querySelector('.mob-hp-fill');
    if (fill) {
      const pct = Math.max(0, (mob.hp / mob.maxHp) * 100);
      fill.style.width = pct + '%';
    }
    const bar = mob.el.querySelector('.mob-hp');
    if (bar && opts.source === 'hunter') {
      bar.classList.remove('hp-knock');
      void bar.offsetWidth;
      bar.classList.add('hp-knock');
    }

    if (mob.hp <= 0) {
      killMob(mob, contract);
    }
  }

  let debugCritChance = null; // feel1 verification hook (CB_ARENA_DEBUG.setCritChance)
  function critChanceNow() {
    if (debugCritChance != null) return debugCritChance;
    const st = getState ? getState() : null;
    if (!st) return 0;
    if (!st.features || !st.features.crits) return 0;
    const b = window.CB_STATE.getBonuses(st);
    const base = typeof b.critChance === 'number' ? b.critChance : 0;
    if (base <= 0) return Math.min(0.65, 0.08 + (holding ? 0.04 : 0)); // unlocked but no chest/upgrades yet
    return Math.min(0.65, base + (holding ? 0.05 : 0));
  }

  function bombActive() {
    const st = getState ? getState() : null;
    if (!st) return false;
    const b = window.CB_STATE.getBonuses(st);
    return !!b.visualBomb;
  }

  /** Active boost killMult — also drives live bolt damage & fire rate. */
  function liveKillMult() {
    const st = getState ? getState() : null;
    if (!st) return 1;
    const b = window.CB_STATE.getBonuses(st);
    const km = b && b.killMult;
    return (typeof km === 'number' && km > 0) ? km : 1;
  }

  function boltPierceLevel() {
    const st = getState ? getState() : null;
    if (!st) return 0;
    const b = window.CB_STATE.getBonuses(st);
    return Math.min(2, Math.max(0, (b && b.boltPierce) | 0));
  }

  function boltBounceLevel() {
    const st = getState ? getState() : null;
    if (!st) return 0;
    const b = window.CB_STATE.getBonuses(st);
    return Math.min(2, Math.max(0, (b && b.boltBounce) | 0));
  }

  const PIERCE_FALLOFF = [1, 0.6, 0.35];
  const BOUNCE_FALLOFF = [0.5, 0.25];
  const BOUNCE_RANGE = 32; // % arena

  /**
   * Hunter cadence from HUNTER_COMBAT.attackIntervalMs × hunterAtkSpeed.
   * Independent of player bolt interval / killMult / ATTACK_SPEED_MULT.
   */
  function hunterIntervalMs(hunterId) {
    const stats = hunterCombatStats(hunterId);
    let base = stats.attackIntervalMs;
    if (holding) base *= 0.85; // mild pep while player is actively hunting
    const spd = Math.max(0.35, hunterAtkSpeedMultFor(hunterId));
    // Higher atk-speed → shorter interval; soft floor so hits stay readable
    return Math.min(2800, Math.max(500, Math.round(base / spd)));
  }

  /** Legacy cadence used only to preserve DPS when retuning fire rate (iom6c). */
  function legacyBoltIntervalMs() {
    let base = 135;
    const km = liveKillMult();
    if (km > 1) base = base / km;
    if (bombActive()) base = Math.min(base, 78);
    const spd = 1 + (Math.max(1, SPEED()) - 1) * 0.2; // SPEED 40 → ~8.8×
    return Math.max(36, base * spd);
  }

  /** OSRS-tick feel: ~1 shot / 0.6s. Weapon/frenzy speed shortens from this base. */
  const BOLT_TICK_MS = 600;
  function boltIntervalMs() {
    let interval = BOLT_TICK_MS;
    const km = liveKillMult();
    // Frenzy / bomb: more shots from the 0.6s base (chip scales so DPS stays)
    if (km > 1) interval = interval / Math.min(km, 2.2);
    if (bombActive()) interval = Math.min(interval, BOLT_TICK_MS * 0.55);
    // Optional attack-speed bonus from upgrades (shots per tick)
    const st = getState ? getState() : null;
    if (st && window.CB_STATE) {
      const b = window.CB_STATE.getBonuses(st);
      const shots = Math.max(1, (b && b.boltShotsPerTick) || 1);
      interval = interval / shots;
    }
    return Math.max(220, Math.round(interval));
  }

  /** Active boss def if in a Level boss fight; else null. */
  function activeBossTarget() {
    const st = getState ? getState() : null;
    if (!st || !window.CB_STATE || !window.CB_STATE.isBossFightActive(st)) return null;
    return window.CB_STATE.getActiveBoss(st);
  }

  /**
   * Absolute bolt chip from weapon stats / upgrades — NOT from target HP.
   * Weapon power ≈ getBonuses.idlePower (gear ladder + Idle Power buys).
   * killMult covers Smithing / Prayer / boosts / mastery.
   * Higher player power ⇒ faster kills; boss HP is tuned so *expected* power ≈ 45–90s.
   */
  function weaponPowerNow() {
    const st = getState ? getState() : null;
    if (!st || !window.CB_STATE) return 1;
    const b = window.CB_STATE.getBonuses(st);
    return Math.max(0.25, (b && b.idlePower) || 1);
  }

  function boltHpChipRaw(raw) {
    const rawN = (raw || 1) / 1.25;
    let chip = BASE_BOLT_CHIP * rawN * weaponPowerNow() * liveKillMult();
    chip *= (DMG() / DMG_REF) * (BOLT_PWR() / BEAM_REF);
    // Keep DPS identical to pre-iom6c cadence: dmg/shot = oldDPS × currentInterval
    chip *= boltIntervalMs() / legacyBoltIntervalMs();
    return Math.max(0.05, chip);
  }

  /** Integer HP chip for player bolts — splat shows this exact amount. */
  function boltHpChip(raw) {
    // Stochastic rounding: splat is an integer but expected dmg/shot equals the raw chip,
    // so DPS matches the pre-tick cadence exactly (no rounding drift at small chips).
    const v = boltHpChipRaw(raw);
    const f = Math.floor(v);
    return Math.max(1, f + (Math.random() < (v - f) ? 1 : 0));
  }

  /** All living mobs along aim ray, nearest-first. */
  function pickBoltTargetsAlongRay(origin, dirX, dirY, excludeIds) {
    const ex = excludeIds || new Set();
    const hits = [];
    const hitW = boltHitWidth();
    livingMobs().forEach((m) => {
      if (ex.has(m.id)) return;
      if (!m || m.hp <= 0 || !m.el || m.el.classList.contains('dying')) return;
      // feel2: test the current spot and where a walking mob will be when the bolt arrives
      const cur = mobPosPct(m);
      const d0 = Math.hypot(cur.x - origin.x, cur.y - origin.y);
      const lead = (m.vx || m.vy) ? mobLeadPos(m, Math.max(140, Math.min(520, 120 + d0 * 5)) / 1000) : cur;
      let best = null;
      [lead, cur].forEach((pos) => {
        const vx = pos.x - origin.x;
        const vy = pos.y - origin.y;
        const along = vx * dirX + vy * dirY;
        if (along < 3 || along > BOLT_RANGE) return;
        const latX = vx - dirX * along;
        const latY = vy - dirY * along;
        const lateral = Math.sqrt(latX * latX + latY * latY);
        if (lateral > hitW) return;
        if (!best || lateral < best.lateral - 0.5) best = { along, lateral, pos };
      });
      if (!best) return;
      hits.push({ mob: m, dist: best.along, pos: lead });
    });
    hits.sort((a, b) => a.dist - b.dist);
    return hits;
  }

  function pickBounceTarget(fromMob, excludeIds) {
    const ex = excludeIds || new Set();
    const from = mobPosPct(fromMob);
    let best = null;
    livingMobs().forEach((m) => {
      if (!m || m.id === fromMob.id || ex.has(m.id)) return;
      if (m.hp <= 0 || !m.el || m.el.classList.contains('dying')) return;
      const pos = mobPosPct(m);
      const dx = pos.x - from.x;
      const dy = pos.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2 || dist > BOUNCE_RANGE) return;
      if (!best || dist < best.dist) best = { mob: m, dist, pos, dx, dy };
    });
    return best;
  }

  function scheduleBoltImpact(mob, contract, dmg, crit, color, flightMs, bomb) {
    setTimeout(() => {
      if (!mob || mob.hp <= 0) return;
      if (!mob.el || mob.el.classList.contains('dying')) return;
      setFocus(mob.id);
      // Impact burst centered on the hit + white flash + 2–3px knockback (visual only)
      const bodyEl = mob.el.querySelector('.mob-body') || mob.el;
      try {
        const r = bodyEl.getBoundingClientRect();
        const ar = els.arena.getBoundingClientRect();
        spawnBoltImpactAt(r.left + r.width / 2 - ar.left, r.top + r.height * 0.5 - ar.top, !!crit);
      } catch (e) { /* soft */ }
      // feel1: white flash now comes only from pulseMob (.hit-flash) — no second inline filter.
      if (!reduceMotionOn()) {
        const pos = mobPosPct(mob);
        const o = playerOriginPct();
        let kx = pos.x - o.x;
        let ky = pos.y - o.y;
        const kl = Math.sqrt(kx * kx + ky * ky) || 1;
        const kb = crit ? 6 : 4.5; // feel1: 4–6px knockback (was 2.5px)
        bodyEl.style.translate = (kx / kl * kb).toFixed(1) + 'px ' + (ky / kl * kb).toFixed(1) + 'px';
      }
      clearTimeout(bodyEl._hitT);
      bodyEl._hitT = setTimeout(() => {
        bodyEl.style.translate = '';
      }, 80);
      applyVisualHitToMob(mob, contract, {
        soft: false,
        source: 'bolt',
        dmg,
        crit,
        color,
        singleSplat: true,
      });
      // SFX respects mute / default-off prefs inside CB_AUDIO
      if (window.CB_AUDIO) {
        try {
          window.CB_AUDIO.play('bolt_hit');
          if (crit) window.CB_AUDIO.play('crit_hit'); // feel1: layer on the same frame, never a replacement
        } catch (e) { /* soft */ }
      }
      const st = getState ? getState() : null;
      const bossOn = !!(st && window.CB_STATE && window.CB_STATE.isBossFightActive && window.CB_STATE.isBossFightActive(st));
      if (crit || bossOn) triggerCritShake(bossOn);
      const tier = (st && st.features && st.features.beamTier) || 0;
      if (tier >= 2 && Math.random() < 0.1) spawnBoltImpactSpark(mob.el);
      if (bomb && Math.random() < 0.35) spawnKillBurst(mob.el);
    }, Math.max(40, flightMs - 28));
  }

  /** Optional Bomb Barrage splash: one nearby mob takes reduced chip. */
  function maybeBombSplash(primaryMob, contract, baseDmg, color) {
    if (!bombActive() || !primaryMob) return;
    if (Math.random() > 0.45) return;
    const splash = pickBounceTarget(primaryMob, new Set([primaryMob.id]));
    if (!splash || !splash.mob) return;
    const splashDmg = baseDmg * 0.35;
    const from = mobPosPct(primaryMob);
    const dirX = splash.dist > 0.01 ? splash.dx / splash.dist : 0;
    const dirY = splash.dist > 0.01 ? splash.dy / splash.dist : -1;
    const flightMs = Math.max(100, Math.min(280, 80 + splash.dist * 4));
    spawnPlayerBolt(from, dirX, dirY, { dist: splash.dist }, flightMs);
    scheduleBoltImpact(splash.mob, contract, splashDmg, false, color || '#ff981f', flightMs, true);
  }

  /**
   * Directional bolt with optional Pierce then Bounce.
   * Rule: resolve pierce along the aim ray first (up to pierce level).
   * When no further pierce targets remain on the ray, bounce to nearest
   * other living mob (up to bounce level) with bounce falloff.
   */
  let lastBoltAt = -1e9;
  function fireBolt(contract) {
    lastBoltAt = performance.now();
    cancelBufferedShot();
    // iom7: shot = thrust frame of the attack strip (bolt spawns from the blade tip)
    if (window.CB_SPRITES && window.CB_SPRITES.playerAttack && els.player) {
      try { window.CB_SPRITES.playerAttack(els.player, 2); } catch (e) { /* soft */ }
    }
    noteBoltAimShot();
    if (window.CB_AUDIO) {
      try { window.CB_AUDIO.play('bolt_fire'); } catch (e) { /* soft */ }
    }
    const aim = assistedAimDir();
    const pierceLv = boltPierceLevel();
    const bounceLv = boltBounceLevel();
    const bomb = bombActive();
    let raw = 1 + (Math.random() < 0.25 ? 1 : 0) + (bomb ? 1 : 0);
    const baseDmg = boltHpChip(raw);
    const crit = Math.random() < critChanceNow();
    const color = bomb ? '#ff981f' : (crit ? '#ffe066' : '#ffff00');

    const hitIds = new Set();
    const along = pickBoltTargetsAlongRay(aim.o, aim.x, aim.y, hitIds);
    const pierceCount = Math.min(along.length, 1 + pierceLv); // first hit + pierces
    const pierceHits = along.slice(0, pierceCount);

    if (!pierceHits.length) {
      // Miss — still show a bolt flying out
      spawnPlayerBolt(aim.o, aim.x, aim.y, null, 420);
      return;
    }

    // One-time coach: first successful bolt dismisses forever
    beginBoltAimFade();

    let delayAcc = 0;
    let lastOrigin = aim.o;
    let lastDirX = aim.x;
    let lastDirY = aim.y;
    let lastMob = null;
    let lastDmg = baseDmg;

    pierceHits.forEach((hit, idx) => {
      const mult = PIERCE_FALLOFF[Math.min(idx, PIERCE_FALLOFF.length - 1)];
      let dmg = baseDmg * mult;
      if (idx === 0 && crit) {
        const stC = getState ? getState() : null;
        const bC = stC && window.CB_STATE ? window.CB_STATE.getBonuses(stC) : null;
        const critDmg = (bC && bC.critDmg) || 1;
        dmg *= 2 * critDmg;
      }
      const flightMs = Math.max(140, Math.min(520, 120 + hit.dist * 5));
      // Segment from last origin toward this hit
      const segOrigin = idx === 0 ? aim.o : lastOrigin;
      const dx = hit.pos.x - segOrigin.x;
      const dy = hit.pos.y - segOrigin.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const dirX = dx / len;
      const dirY = dy / len;
      const segDist = Math.sqrt(dx * dx + dy * dy);
      setTimeout(() => {
        spawnPlayerBolt(segOrigin, dirX, dirY, { dist: segDist }, flightMs);
      }, delayAcc);
      const impactAt = delayAcc + flightMs;
      setTimeout(() => {
        scheduleBoltImpact(hit.mob, contract, dmg, idx === 0 ? crit : false, color, 40, bomb);
      }, Math.max(0, impactAt - 40));
      hitIds.add(hit.mob.id);
      lastOrigin = hit.pos;
      lastDirX = dirX;
      lastDirY = dirY;
      lastMob = hit.mob;
      lastDmg = dmg;
      delayAcc = impactAt;
    });

    // Bounce only after pierce chain ends (or sole hit if no further pierce targets)
    let bounceDelay = delayAcc;
    let bounceFrom = lastMob;
    for (let b = 0; b < bounceLv; b++) {
      if (!bounceFrom) break;
      const nxt = pickBounceTarget(bounceFrom, hitIds);
      if (!nxt) break;
      const mult = BOUNCE_FALLOFF[Math.min(b, BOUNCE_FALLOFF.length - 1)];
      const dmg = baseDmg * mult;
      const flightMs = Math.max(120, Math.min(360, 100 + nxt.dist * 5));
      const fromPos = mobPosPct(bounceFrom);
      const dirX = nxt.dist > 0.01 ? nxt.dx / nxt.dist : 0;
      const dirY = nxt.dist > 0.01 ? nxt.dy / nxt.dist : -1;
      const capturedFrom = fromPos;
      const capturedNxt = nxt;
      const capturedDmg = dmg;
      const capturedFlight = flightMs;
      setTimeout(() => {
        spawnPlayerBolt(capturedFrom, dirX, dirY, { dist: capturedNxt.dist }, capturedFlight);
      }, bounceDelay);
      const impactAt = bounceDelay + flightMs;
      setTimeout(() => {
        scheduleBoltImpact(capturedNxt.mob, contract, capturedDmg, false, color, 40, bomb);
      }, Math.max(0, impactAt - 40));
      hitIds.add(nxt.mob.id);
      bounceFrom = nxt.mob;
      bounceDelay = impactAt;
      lastDmg = dmg;
    }

    // Bomb splash off the first impact (separate short arc; one splat on splash target)
    if (bomb && pierceHits[0]) {
      const first = pierceHits[0];
      const firstFlight = Math.max(140, Math.min(520, 120 + first.dist * 5));
      setTimeout(() => {
        maybeBombSplash(first.mob, contract, baseDmg, color);
      }, firstFlight);
    }
  }

  function nudgeReadyChests(state) {
    if (!state || !state.chests) return;
    const c = state.chests;
    const shake = (id, ready) => {
      const el = document.getElementById(id);
      if (!el || !ready) return;
      el.classList.remove('jiggle');
      void el.offsetWidth;
      el.classList.add('jiggle');
    };
    shake('chest-perm', !!c.permanentReady);
    shake('chest-boost', !!c.boostReady);
  }

  function maybeSpecialPulse(state, contract, dt) {
    if (!state || !state.features || !state.features.specials) return;
    if (!holding) return;
    // Cannon deals 0 to Tier Tests (IOM bombs vs Obelisk)
    if (window.CB_STATE && window.CB_STATE.isBossFightActive && window.CB_STATE.isBossFightActive(state)) {
      return;
    }
    const b = window.CB_STATE.getBonuses(state);
    const cadence = b.specialCadence || 1;
    // Cannon base recharge ~30s (IOM Basic Bomb); cadence upgrades shorten
    const period = (30000 / Math.max(0.5, cadence));
    specialAcc += dt;
    if (specialAcc < period) return;
    specialAcc = 0;
    const aim = assistedAimDir();
    const hit = pickBoltTarget(aim.o, aim.x, aim.y);
    const flightMs = hit ? Math.max(140, Math.min(400, 120 + (hit.dist || 40) * 4)) : 320;
    spawnPlayerBolt(aim.o, aim.x, aim.y, hit, flightMs);
    // Cannon chip ≈ 4× bolt (brief §3.5)
    const dmg = Math.max(1, Math.round(boltHpChip(1) * 4.0));
    setTimeout(() => {
      const mob = hit && hit.mob && hit.mob.hp > 0 ? hit.mob : getFocusMob();
      if (!mob) return;
      applyVisualHitToMob(mob, contract, {
        soft: false,
        source: 'special',
        dmg,
        crit: true,
        color: '#ff60ff',
        singleSplat: true,
      });
      spawnKillBurst(mob.el);
    }, Math.max(40, flightMs - 28));
  }

  function applyVisualHit(contract, opts) {
    opts = opts || {};
    // Bolts use applyVisualHitToMob directly; this path is hunters / soft / focus
    let mob = getFocusMob();
    if (!mob || !mob.el) {
      if (!opts.soft && opts.source !== 'bolt') spawnLooseFloat(contract, opts);
      return;
    }

    // Soft/spark path: cosmetic ONLY — never numbers during hold; no HP
    if (opts.soft || opts.source === 'spark') {
      if (holding) return; // splat hygiene
      // Cosmetic only — no numeric splat (splat numbers always equal HP removed)
      if (Math.random() < 0.15) pulseMob(mob, 0.5);
      return;
    }

    let dmg;
    if (opts.dmg != null) {
      dmg = opts.dmg;
    } else if (opts.source === 'hunter') {
      dmg = hunterHpChip(opts.hunter && opts.hunter.id, !!opts.crit);
    } else {
      dmg = (opts.crit ? 2 : 1) * DMG();
    }
    dmg = Math.max(1, Math.round(dmg));
    mob.hp -= dmg;

    pulseMob(mob, holding ? 1.25 : 1);

    const shown = dmg;
    spawnHitSplat(mob.el, shown, Object.assign({}, opts, { mobId: mob.id }));
    if (opts.source !== 'bolt' && (opts.crit || opts.heavy || Math.random() < 0.18)) {
      spawnDmgFloat(mob.el, shown, opts.crit, opts.color);
    }
    recordVisualDps(shown);
    const xpAmt = opts.crit ? (8 + Math.floor(Math.random() * 10)) : (1 + Math.floor(Math.random() * 4));
    gainXp(xpAmt * (holding ? 1.2 : 1));

    if (Math.random() < 0.22) {
      const mon = contract ? contract.name : 'prey';
      const who = opts.hunter ? opts.hunter.name
        : ((opts.source === 'beam' || opts.source === 'bolt') ? 'You' : 'Hunter');
      if (opts.crit) pushFeed('crit', who + ': critical! ' + shown + ' on ' + mon);
      else pushFeed('hit', who + ' hits ' + mon + ' for ' + shown);
    }

    const fill = mob.el.querySelector('.mob-hp-fill');
    if (fill) {
      const pct = Math.max(0, (mob.hp / mob.maxHp) * 100);
      fill.style.width = pct + '%';
    }
    const bar = mob.el.querySelector('.mob-hp');
    if (bar && opts.source === 'hunter') {
      bar.classList.remove('hp-knock');
      void bar.offsetWidth;
      bar.classList.add('hp-knock');
    }

    if (mob.hp <= 0) {
      killMob(mob, contract);
    }
  }

  function pulseMob(mob, intensity) {
    if (!mob.el) return;
    // feel1: squash & stretch (not a uniform pop) + ONE white flash on real hits.
    const k = Math.max(0.3, Math.min(1.4, intensity || 1));
    const el = mob.el;
    el.classList.remove('hit', 'hit-flash');
    void el.offsetWidth;
    el.style.setProperty('--sq-x', (1 + 0.18 * k).toFixed(3));
    el.style.setProperty('--sq-y', (1 - 0.18 * k).toFixed(3));
    el.style.setProperty('--st-x', (1 - 0.07 * k).toFixed(3));
    el.style.setProperty('--st-y', (1 + 0.10 * k).toFixed(3));
    el.classList.add('hit');
    if (k >= 0.9) el.classList.add('hit-flash'); // cosmetic idle pulses don't flash
    clearTimeout(el._hitT);
    el._hitT = setTimeout(() => el.classList.remove('hit', 'hit-flash'), 170);
  }

  function killCoinAmount(contract) {
    if (!contract) return 1;
    const avg = (Number(contract.goldMin) + Number(contract.goldMax)) / 2;
    const tier = Number(contract.mult) || 1;
    // Small burst every kill; scales lightly with area/monster tier
    const roll = 0.85 + Math.random() * 0.35;
    return Math.max(1, Math.round((1 + avg * 0.3 * tier) * roll));
  }

  const COIN_FLIGHT_MS = 650; // feel1: was ~1600ms

  function awardKillCoins(mob, contract, gained, xpInfo) {
    const state = getState ? getState() : null;
    const F = window.CB_FMT;
    let coins = killCoinAmount(contract);
    if (state && window.CB_STATE && window.CB_STATE.earlyRewardMult) coins *= window.CB_STATE.earlyRewardMult(state);
    // feel1: the coin carries the real gold of this kill (already credited to state);
    // the HUD holds it back until the coin lands, then counts up + pops.
    const realAmt = gained > 0 ? gained : 0;
    const label = realAmt > 0 ? realAmt : coins;
    if (state) lastGold = state.gold;
    let delay = 0;
    if (mob && mob.el) {
      const now = performance.now();
      if (now > killCoinStaggerUntil) killCoinStaggerN = 0;
      delay = Math.min(killCoinStaggerN, 6) * 90;
      killCoinStaggerN++;
      killCoinStaggerUntil = now + 700;
    }
    const hold = (realAmt > 0 && F && F.holdGold)
      ? F.holdGold(realAmt, performance.now() + delay + COIN_FLIGHT_MS + 450) // self-expires if the coin is lost
      : null;
    if (state && F && F.setGoldHud) F.setGoldHud(state.gold);
    // xp1: Slayer XP bar (and any level-up toast) moves on the same beat as the gold
    const UI = window.CB_UI;
    const xpTok = (xpInfo && UI && UI.holdXpHud)
      ? UI.holdXpHud(xpInfo.prev, performance.now() + delay + COIN_FLIGHT_MS + 450)
      : null;
    if (xpTok && state && UI.renderSlayerXpHud) UI.renderSlayerXpHud(state);
    let landed = false;
    if (xpTok) setTimeout(() => { if (!landed) land(); }, delay + COIN_FLIGHT_MS + 500); // coin lost → still land
    const land = () => {
      if (landed) return;
      landed = true;
      if (xpTok && UI.landXpHud) UI.landXpHud(xpTok, xpInfo.levels);
      if (F && F.landGold) F.landGold(hold);
      if (window.CB_AUDIO) {
        try { window.CB_AUDIO.play('coin_land'); } catch (e) { /* soft */ }
      }
    };
    if (mob && mob.el) {
      const el = mob.el;
      setTimeout(() => {
        if (!el || !el.isConnected) { land(); return; }
        spawnCoinPopFloat(el, label);
        spawnLootFly(el, contract, label, land);
      }, delay);
    } else {
      land();
    }
    return coins;
  }

  function killMob(mob, contract) {
    if (!mob.el) return;
    const goldBeforeKill = (getState && getState()) ? (getState().gold || 0) : 0;
    // xp1: HUD shows the pre-kill Slayer XP until this kill's coin lands
    const st00 = getState ? getState() : null;
    const xpBefore = st00 ? { sl: (window.CB_STATE.getSlayerLevel(st00)), xp: st00.slayerXp || 0 } : null;
    const goldGained = () => { const st0 = getState ? getState() : null; return st0 ? Math.max(0, (st0.gold || 0) - goldBeforeKill) : 0; };
    if (!mob.isBoss && mob.spawnAt) {
      recordKillTimeMs(performance.now() - mob.spawnAt);
      const stAuto = getState ? getState() : null;
      if (stAuto) maybeRunTargetAuto(stAuto);
    }
    const isBossKill = !!(mob.isBoss && mob.bossPreyId);
    mob.el.classList.add('dying');
    if (isBossKill) mob.el.classList.add('boss-dying');
    // feel1: boss_death SFX, big burst and the one big shake all start on the same frame
    if (window.CB_AUDIO) {
      try { window.CB_AUDIO.play(isBossKill ? 'boss_death' : 'mob_death'); } catch (e) { /* soft */ }
    }
    spawnKillBurst(mob.el, isBossKill ? { big: true } : null);
    if (isBossKill) triggerCritShake(true, 6); // skipped under reduce-motion
    // Boss fight kill → clear Level, relic, unlock next (no Task credit)
    try {
      const st = getState ? getState() : null;
      if (st && isBossKill && window.CB_STATE) {
        // feel1: economy + save happen NOW; only the visual transition waits (~1.1s)
        const r = window.CB_STATE.finishMarkedPrey(st, mob.bossPreyId);
        if (r && r.ok) {
          bossMomentUntil = performance.now() + BOSS_MOMENT_MS;
          // Exact Designer copy: "Level N cleared — Level N+1 unlocked"
          const title = (r.levelCleared || 'Level') + ' cleared';
          let sub = r.unlockLevelName ? (r.unlockLevelName + ' unlocked') : '';
          if (r.relic) sub += (sub ? ' · ' : '') + (r.relic.emoji || '') + ' ' + (r.relic.name || '');
          // xp1: guaranteed +1 SL — banner sub-line suffix; level toast waits for the boss moment
          if (r.slayerLevelGained > 0) {
            const slLab = (window.CB_DATA.nameOf && window.CB_DATA.nameOf('slayer_level')) || 'Slayer level';
            sub += (sub ? ' · ' : '') + slLab + ' ' + r.slayerLevel;
            if (window.CB_UI && window.CB_UI.holdXpHud && xpBefore) {
              const tok = window.CB_UI.holdXpHud(xpBefore, performance.now() + BOSS_MOMENT_MS + 400);
              setTimeout(() => window.CB_UI.landXpHud(tok, [r.slayerLevel]), BOSS_MOMENT_MS);
            }
          }
          setTimeout(() => showBossBanner(title, sub), 320); // boss_death (1.05s) carries the whole beat
          if (window.CB_INTRO) {
            try { window.CB_INTRO.note('boss-kill', mob.bossPreyId); } catch (e) { /* soft */ }
          }
          if (window.CB_GAME && window.CB_GAME.persist) {
            try { window.CB_GAME.persist(); } catch (e3) { /* soft */ }
          }
          // Leave boss mode after the death moment; HP/wave reset on the next shell
          clearTimeout(killMob._bossT);
          killMob._bossT = setTimeout(() => {
            bossMomentUntil = 0;
            markDirty();
            if (window.CB_UI && window.CB_UI.renderAll && window.CB_GAME) {
              try {
                const tab = window.CB_GAME.getTab ? window.CB_GAME.getTab() : 'hunt';
                window.CB_UI.renderAll(getState ? getState() : st, tab);
              } catch (e2) { /* soft */ }
            }
          }, BOSS_MOMENT_MS);
        }
        awardKillCoins(mob, contract, goldGained());
        return;
      }
    } catch (e) { /* soft */ }
    // Task bar: +1 kill toward quota (arena death is the source of truth on Hunt)
    let killXpInfo = null;
    try {
      const st = getState ? getState() : null;
      if (st && contract && window.CB_STATE && typeof window.CB_STATE.creditContractKills === 'function') {
        const kg = window.CB_STATE.creditContractKills(st, contract, 1); // full kill economy (gold/points/scraps)
        if (kg && xpBefore && (kg.slayerXp > 0 || (kg.slayerLevels && kg.slayerLevels.length))) {
          killXpInfo = { prev: xpBefore, levels: kg.slayerLevels || [] };
        }
        // Snap Task UI immediately (don't wait for the next soft tick)
        const S = window.CB_STATE;
        const F = window.CB_FMT;
        const quota = S.effectiveQuota(st, contract);
        const kills = Math.min(Math.floor(st.contractProgress || 0), quota);
        const pct = Math.min(100, (kills / Math.max(1, quota)) * 100);
        if (els.hpBar) els.hpBar.style.width = pct + '%';
        if (!syncIntroTaskDock(st, contract, kills, quota)) {
          if (els.hpLabel) els.hpLabel.textContent = `Task · ${kills} / ${quota} kills`;
        }
        if (els.spQuota) els.spQuota.textContent = kills + ' / ' + quota + ' kills';
        if (els.spBarFill) {
          els.spBarFill.style.width = pct + '%';
          els.spBarFill.classList.toggle('near', pct >= 80);
        }
        if (els.spBar) els.spBar.classList.toggle('near', pct >= 80);
        if (els.lsTaskk) els.lsTaskk.textContent = String(kills);
        updateSlayerPanel(st, contract);
      }
    } catch (e) { /* soft */ }
    awardKillCoins(mob, contract, goldGained(), killXpInfo);
    sessionTaskKills++;
    // Rare signature-mat toast (flushed from creditContractKills)
    try {
      const st = getState ? getState() : null;
      if (st && st._pendingSigToasts && st._pendingSigToasts.length && window.CB_UI && window.CB_UI.toast) {
        // Show at most one per kill, rarely celebrate
        const msg = st._pendingSigToasts.shift();
        st._pendingSigToasts = [];
        if (msg && Math.random() < 0.85) {
          window.CB_UI.toast(msg, { ms: 2600 });
          if (window.CB_AUDIO) {
            try { window.CB_AUDIO.play('signature_drop'); } catch (e) { /* soft */ }
          }
        }
      }
    } catch (e) { /* soft */ }
    try {
      if (window.CB_INTRO && typeof window.CB_INTRO.onArenaKill === 'function') {
        window.CB_INTRO.onArenaKill(contract && contract.id, mob);
      }
    } catch (e) { /* soft */ }
    const mon = contract ? contract.name : 'foe';
    pushFeed('kill', 'Slain: ' + mon + '!');
    gainXp(18 + Math.floor(Math.random() * 22));

    // Advance focus to next
    const next = (mob.id + 1) % wave.length;
    setFocus(next);

    // Respawn: walk in from a side — park at a free slot from the ~10-spot pool
    const emoji = contract ? contract.emoji : (mob.emoji || '🪨');
    const vis = contract ? mobVisualKey(contract) : (mob.visual || 'crawler');
    const clump = !!(contract && contract.combat && contract.combat.clump);
    const si = pickFreeParkSlot(mob.id, clump);
    const slot = SPAWN_SLOTS[si];
    mob.slotIndex = si;
    mob.baseX = slot.x + (Math.random() - 0.5) * (clump ? 1.2 : 3);
    mob.baseY = slot.y + (Math.random() - 0.5) * (clump ? 1.0 : 2.5);
    // feel2: solo stage → 150ms respawn, 0.6s edge walk-in, focus + held aim snap to it
    const soloRespawn = !mob.isBoss && wave.length === 1;
    setTimeout(() => {
      const hp = getMonsterVisualHp(contract);
      mob.hp = hp;
      mob.maxHp = hp;
      mob.emoji = emoji;
      mob.visual = vis;
      mob.wanderPhase = Math.random() * 12;
      if (mob.el) {
        mob.el.classList.remove('dying', 'hit', 'telegraph', 'attacking', 'spawn', 'alive', 'on-target');
        mob.el.dataset.visual = vis;
        const body = mob.el.querySelector('.mob-body');
        if (body) body.innerHTML = mobFigHtml(vis);
        const fill = mob.el.querySelector('.mob-hp-fill');
        if (fill) fill.style.width = '100%';
        beginWalkIn(mob, { solo: soloRespawn });
        if (soloRespawn) {
          setFocus(mob.id);
          if (holding) {
            soloSnap = { mobId: mob.id, px: lastPtrPct ? lastPtrPct.x : aimX, py: lastPtrPct ? lastPtrPct.y : aimY };
            const pos = mobPosPct(mob);
            aimX = pos.x; aimY = pos.y;
          }
        }
      }
    }, soloRespawn ? SOLO_RESPAWN_MS : 220);
  }

  function spawnProjectile(fromEl, toEl, fx, flightMs, angleOffsetDeg) {
    if (!els.projLayer || !els.arena) return;
    const dur = flightMs || (fx.projectile === 'arrow' ? 720 : 320);
    const a = els.arena.getBoundingClientRect();
    const f = fromEl.getBoundingClientRect();
    const t = toEl.getBoundingClientRect();
    const x0 = f.left + f.width / 2 - a.left;
    const y0 = f.top + f.height / 2 - a.top;
    const x1 = t.left + t.width / 2 - a.left;
    const y1 = t.top + t.height / 2 - a.top;
    let dx = x1 - x0;
    let dy = y1 - y0;
    if (angleOffsetDeg) {
      const rad = angleOffsetDeg * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rdx = dx * cos - dy * sin;
      const rdy = dx * sin + dy * cos;
      dx = rdx;
      dy = rdy;
    }
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const p = document.createElement('div');
    p.className = 'proj ' + (fx.projectile || 'arrow');
    p.style.left = x0 + 'px';
    p.style.top = y0 + 'px';
    p.style.setProperty('--proj-color', fx.color || '#fff');
    p.style.setProperty('--proj-dx', dx + 'px');
    p.style.setProperty('--proj-dy', dy + 'px');
    p.style.setProperty('--proj-angle', angle + 'deg');
    p.style.setProperty('--proj-dur', dur + 'ms');
    if (window.CB_SPRITES && ((fx.projectile || 'arrow') === 'arrow')) {
      try { window.CB_SPRITES.applyProjSprite(p, 'arrow'); } catch (e) { /* soft */ }
    }
    els.projLayer.appendChild(p);
    setTimeout(() => p.remove(), dur + 40);
  }


  function spawnDmgFloat(atEl, amount, crit, color) {
    if (!els.floatLayer || !els.arena || floatCap > 48) return;
    floatCap++;
    const a = els.arena.getBoundingClientRect();
    const m = atEl.getBoundingClientRect();
    const x = ((m.left + m.width / 2 - a.left) / a.width) * 100 + (Math.random() - 0.5) * 14;
    const y = ((m.top - a.top) / a.height) * 100 + (Math.random() - 0.5) * 8;

    const el = document.createElement('div');
    el.className = 'float-txt dmg bounce' + (crit ? ' crit' : '');
    el.textContent = window.CB_FMT.num(amount);
    el.style.left = x + '%';
    el.style.top = y + '%';
    if (color) el.style.color = color;
    el.style.setProperty('--bx', ((Math.random() - 0.5) * 40) + 'px');
    el.style.setProperty('--by', (-40 - Math.random() * 50) + 'px');
    el.style.setProperty('--brot', ((Math.random() - 0.5) * 24) + 'deg');
    els.floatLayer.appendChild(el);
    setTimeout(() => {
      el.remove();
      floatCap = Math.max(0, floatCap - 1);
    }, 700);
  }

  function spawnLooseFloat(contract, opts) {
    if (!els.floatLayer || floatCap > 48) return;
    floatCap++;
    const amount = Math.max(1, Math.round((opts?.crit ? 40 : 8) * (holding ? 1.5 : 1)));
    const el = document.createElement('div');
    el.className = 'float-txt dmg bounce' + (opts?.crit ? ' crit' : '');
    el.textContent = window.CB_FMT.num(amount);
    el.style.left = (40 + Math.random() * 20) + '%';
    el.style.top = (25 + Math.random() * 30) + '%';
    el.style.setProperty('--bx', ((Math.random() - 0.5) * 40) + 'px');
    el.style.setProperty('--by', (-40 - Math.random() * 40) + 'px');
    els.floatLayer.appendChild(el);
    setTimeout(() => {
      el.remove();
      floatCap = Math.max(0, floatCap - 1);
    }, 700);
  }

  function goldPopInnerHtml(goldAmt) {
    const F = window.CB_FMT;
    const g = F && F.formatGold ? F.formatGold(goldAmt) : { text: String(goldAmt), color: '#FFFF00', tier: 'raw' };
    return '<span class="coin-pop" aria-hidden="true"></span>'
      + '<span class="gold-amount tier-' + g.tier + '" style="color:' + g.color + '">+' + g.text + '</span>';
  }

  /** Local kill-coin float using coin_pop strip; keeps slowed bounce timing. */
  function spawnCoinPopFloat(fromEl, goldAmt) {
    if (!els.floatLayer || !els.arena || !fromEl) return;
    const a = els.arena.getBoundingClientRect();
    const m = fromEl.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'float-txt gold kill-coin bounce';
    el.innerHTML = goldPopInnerHtml(goldAmt);
    el.style.left = (((m.left - a.left) / a.width) * 100 + 5 + (Math.random() - 0.5) * 4) + '%';
    el.style.top = (((m.top - a.top) / a.height) * 100) + '%';
    el.style.setProperty('--bx', ((Math.random() - 0.5) * 24) + 'px');
    el.style.setProperty('--by', (-70 - Math.random() * 20) + 'px');
    els.floatLayer.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }

  function spawnLootFly(fromEl, contract, forcedAmt, onLand) {
    if (!els.floatLayer || !els.arena) return;
    const avgGold = contract
      ? ((contract.goldMin + contract.goldMax) / 2)
      : 1;
    const goldAmt = forcedAmt != null
      ? forcedAmt
      : Math.max(1, Math.round(avgGold * 0.3));

    const a = els.arena.getBoundingClientRect();
    const m = fromEl.getBoundingClientRect();
    const startX = m.left + m.width / 2;
    const startY = m.top + m.height / 2;

    // Target: header gold
    const goldEl = document.getElementById('res-gold');
    let tx = a.left + a.width / 2;
    let ty = a.top - 40;
    if (goldEl) {
      const g = goldEl.getBoundingClientRect();
      tx = g.left + g.width / 2;
      ty = g.top + g.height / 2;
    }

    const el = document.createElement('div');
    el.className = 'float-txt gold fly-header kill-coin';
    el.innerHTML = goldPopInnerHtml(goldAmt);
    // Position in viewport coords via fixed
    el.style.position = 'fixed';
    el.style.left = startX + 'px';
    el.style.top = startY + 'px';
    el.style.zIndex = '100';
    document.body.appendChild(el);

    const dx = tx - startX;
    const dy = ty - startY;
    el.style.setProperty('--fly-x', dx + 'px');
    el.style.setProperty('--fly-y', dy + 'px');

    // Also a points pop sometimes
    if (contract && Math.random() < 0.35) {
      const stE = getState ? getState() : null;
      const eM = (stE && window.CB_STATE && window.CB_STATE.earlyRewardMult) ? window.CB_STATE.earlyRewardMult(stE) : 1;
      spawnLocalLoot(fromEl, '+' + window.CB_FMT.num(contract.pointsPerKill * eM, 0) + '⭐', 'pts');
    }

    el.style.setProperty('--fly-ms', COIN_FLIGHT_MS + 'ms');
    setTimeout(() => {
      el.remove();
      // feel1: gold is added to the HUD exactly when the coin arrives (pop comes from setGoldHud)
      if (typeof onLand === 'function') onLand();
      else if (goldEl) {
        goldEl.classList.remove('flash-gold');
        void goldEl.offsetWidth;
        goldEl.classList.add('flash-gold');
      }
    }, COIN_FLIGHT_MS);
  }

  function spawnLocalLoot(fromEl, text, cls) {
    if (!els.floatLayer || !els.arena) return;
    const a = els.arena.getBoundingClientRect();
    const m = fromEl.getBoundingClientRect();
    const el = document.createElement('div');
    const isCoin = (cls || '').includes('kill-coin') || (cls || '').includes('gold');
    el.className = 'float-txt ' + cls + ' bounce';
    el.textContent = text;
    el.style.left = (((m.left - a.left) / a.width) * 100 + 5 + (Math.random() - 0.5) * 4) + '%';
    el.style.top = (((m.top - a.top) / a.height) * 100) + '%';
    el.style.setProperty('--bx', ((Math.random() - 0.5) * 24) + 'px');
    el.style.setProperty('--by', (isCoin ? -70 - Math.random() * 20 : -50) + 'px');
    els.floatLayer.appendChild(el);
    setTimeout(() => el.remove(), isCoin ? 1700 : 800);
  }

  function spawnKillBurst(atEl, opts) {
    if (!els.particles || !els.arena) return;
    const big = !!(opts && opts.big);
    const a = els.arena.getBoundingClientRect();
    const m = atEl.getBoundingClientRect();
    const cx = ((m.left + m.width / 2 - a.left) / a.width) * 100;
    const cy = ((m.top + m.height / 2 - a.top) / a.height) * 100;
    if (big) {
      // feel1: critical event → big bang (shockwave ring + 3x sparks), per the video
      const ring = document.createElement('div');
      ring.className = 'boss-shockwave';
      ring.style.left = cx + '%';
      ring.style.top = cy + '%';
      els.particles.appendChild(ring);
      setTimeout(() => ring.remove(), 760);
    }
    const n = big ? 30 : 10;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'spark burst' + (big ? ' big' : '');
      s.style.left = cx + '%';
      s.style.top = cy + '%';
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const dist = big ? (60 + Math.random() * 90) : (28 + Math.random() * 36);
      s.style.setProperty('--sx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--sy', Math.sin(ang) * dist + 'px');
      s.style.background = big ? (i % 3 === 0 ? '#ffffff' : (i % 2 ? '#ff981f' : '#ffff00')) : (i % 2 ? '#ff981f' : '#ffff00');
      els.particles.appendChild(s);
      setTimeout(() => s.remove(), big ? 760 : 480);
    }
  }

  /** feel1: centered victory banner over the arena (survives the shell rebuild). */
  function showBossBanner(title, sub) {
    let b = document.getElementById('boss-banner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'boss-banner';
      b.className = 'boss-banner';
      b.setAttribute('role', 'status');
      b.innerHTML = '<div class="bb-kicker">BOSS DEFEATED</div><div class="bb-title"></div><div class="bb-sub"></div>';
      document.body.appendChild(b);
    }
    b.querySelector('.bb-title').textContent = title || 'Level cleared';
    const subEl = b.querySelector('.bb-sub');
    subEl.textContent = sub || '';
    subEl.hidden = !sub;
    const ar = els.arena ? els.arena.getBoundingClientRect() : null;
    b.style.left = (ar ? ar.left + ar.width / 2 : window.innerWidth / 2) + 'px';
    b.style.top = (ar ? ar.top + ar.height * 0.42 : window.innerHeight / 2) + 'px';
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(showBossBanner._t);
    showBossBanner._t = setTimeout(() => b.classList.remove('show'), 2600);
  }

  function spawnBoltImpactSpark(atEl) {
    if (!els.particles || !els.arena || !atEl) return;
    const a = els.arena.getBoundingClientRect();
    const m = atEl.getBoundingClientRect();
    const s = document.createElement('div');
    s.className = 'spark beam-spark';
    s.style.left = (((m.left + m.width / 2 - a.left) / a.width) * 100 + (Math.random() - 0.5) * 6) + '%';
    s.style.top = (((m.top + m.height / 2 - a.top) / a.height) * 100 + (Math.random() - 0.5) * 6) + '%';
    s.style.setProperty('--sx', ((Math.random() - 0.5) * 30) + 'px');
    s.style.setProperty('--sy', ((Math.random() - 0.5) * 30) + 'px');
    els.particles.appendChild(s);
    setTimeout(() => s.remove(), 350);
  }

  function pulseResources(state) {
    const flash = (id, curr, prev, kind) => {
      const el = document.getElementById(id);
      if (!el) return curr;
      if (id === 'res-gold' && window.CB_FMT.setGoldHud) {
        // feel1: gold goes through the HUD controller (count-up + pop on coin land)
        window.CB_FMT.setGoldHud(curr);
        return curr;
      }
      if (curr > prev + 0.01) {
        el.classList.remove('flash-gold', 'flash-green');
        void el.offsetWidth;
        el.classList.add(kind);
        if (id === 'res-food') {
          el.textContent = window.CB_FMT.num(state.food) + '/' + window.CB_FMT.num(window.CB_STATE.getBonuses(state).foodCap);
        } else if (id === 'res-gold' && window.CB_FMT.applyGoldHud) {
          window.CB_FMT.applyGoldHud(curr);
        } else {
          el.textContent = window.CB_FMT.num(curr);
        }
      }
      return curr;
    };
    lastGold = flash('res-gold', state.gold, lastGold, 'flash-gold');
    lastPoints = flash('res-points', state.points, lastPoints, 'flash-green');
    lastScraps = flash('res-scraps', state.scraps, lastScraps, 'flash-gold');
    if (state.food !== lastFood) {
      const el = document.getElementById('res-food');
      if (el) {
        const b = window.CB_STATE.getBonuses(state);
        el.textContent = window.CB_FMT.num(state.food) + '/' + window.CB_FMT.num(b.foodCap);
      }
      lastFood = state.food;
    }
  }

  function render(state) {
    shellBuilt = false;
    dirtyKey = '';
    ensureShell(state);
    update(state);
    updatePreyPanel(state);
  }

  /** True when Hunt arena is the kill-progress owner (visible Hunt tab). */
  function ownsKillProgress() {
    if (typeof document !== 'undefined' && document.hidden) return false;
    const hunt = document.getElementById('screen-hunt');
    return !!(hunt && hunt.classList.contains('active') && shellBuilt);
  }

  window.CB_ARENA_DEBUG = {
    spawnSlots: () => SPAWN_SLOTS.map(sl => ({ x: sl.x, y: sl.y })),
    switcherLane: () => Object.assign({}, SWITCHER_LANE),
    boltIntervalMs: () => boltIntervalMs(),
    legacyBoltIntervalMs: () => legacyBoltIntervalMs(),
    boltHpChipRaw: (raw) => boltHpChipRaw(raw),
    // test hook (feel1 verification): scale the living boss's HP so the death moment can be probed quickly
    setCritChance: (p) => { debugCritChance = (p == null ? null : Math.max(0, Math.min(1, +p))); return debugCritChance; },
    scaleMobHp: (frac) => { let n = 0; wave.forEach(m => { if (m && !m.isBoss && m.hp > 0) { m.hp = Math.max(1, Math.round(m.hp * frac)); n++; } }); return n; },
    mobCount: () => ({ active: wave.length, activeMobCount, want: getState ? desiredMobCount(getState()) : null, visible: wave.filter(m => m && m.el && m.el.style.display !== 'none').length }),
    wanderInfo: () => wave.map(m => ({ id: m.id, x: +(+m.liveX).toFixed(1), y: +(+m.liveY).toFixed(1), walking: !!(m.wander && m.wander.walking), vx: +(m.vx || 0).toFixed(2), vy: +(m.vy || 0).toFixed(2), state: m.state })),
    aim: () => ({ x: +aimX.toFixed(1), y: +aimY.toFixed(1), holding }),
    scaleBossHp: (frac) => { const m = wave.find(x => x && x.isBoss && x.hp > 0); if (!m) return null; m.hp = Math.max(1, Math.round(m.hp * frac)); return m.hp; },
  };
  window.CB_ARENA = {
    get ACTIVE_MULT() { return getConfiguredActiveMult(); },
    bind,
    render,
    update,
    markDirty,
    updateTargetSwitcher,
    applyTargetSwitchResult,
    startLoop,
    stopLoop,
    isHolding,
    getActiveMult,
    setHolding,
    updatePreyPanel,
    syncBeamTier,
    getSessionTaskKills: () => sessionTaskKills,
    getMeleeSpeed: () => MELEE_SPEED,
    ownsKillProgress,
  };
})();
