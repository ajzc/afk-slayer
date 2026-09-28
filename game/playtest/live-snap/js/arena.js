/** Live Hunt arena — directional bolt combat + AFK hunters */
(function () {
  // Floor art: CSS tiled art/v3b/env/floor_tile.png (cool slate). bg = fallback only.
  const AREA_THEMES = {
    sewers: {
      bg: '#1c2228',
      accent: '#6a8a9a', name: 'Level 1', floor: '#1c2228',
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
  const BOLT_TTK_SEC = 12; // bolt-only early-mob target feel (was beam)

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
    return Math.max(4, BOLT_AIM_ASSIST_DEG + mod);
  }

  let shellBuilt = false;
  let holding = false;
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
  let specialAcc = 0;
  let boltHintShots = 0;
  let boltHintHoldMs = 0;
  let boltHintFading = false;

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
    const fallback = { sewers: 'bristle_cub', mistwood: 'ashfang_pup', crypt: 'silkling', ashrim: 'bristle_cub' };
    return fallback[area] || 'bristle_cub';
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
  const SPAWN_SLOTS = [
    { x: 22, y: 20 }, { x: 38, y: 18 }, { x: 54, y: 20 }, { x: 72, y: 19 },
    { x: 26, y: 36 }, { x: 44, y: 32 }, { x: 62, y: 36 }, { x: 76, y: 34 },
    { x: 34, y: 50 }, { x: 56, y: 52 },
  ];

  function slotPos(i) {
    return SPAWN_SLOTS[i % SPAWN_SLOTS.length];
  }

  function pickDistinctSlotIndices(n, preferClump) {
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
    const monsterName = bossActive
      ? (window.CB_STATE.bossDisplayName(bossActive))
      : (contract ? (window.CB_STATE && window.CB_STATE.displayName ? window.CB_STATE.displayName(contract) : contract.name) : 'No contract');
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
          <div class="player-ring"></div>
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

        <div class="task-dock${(bossActive || contract) ? '' : ' need-task'}" id="task-dock">
          <div class="task-row">
            <span class="task-name" id="hp-label">${bossActive ? ('Boss · ' + (window.CB_STATE.bossDisplayName(bossActive))) : (contract ? 'Task · 0 / — kills' : 'Pick a task at Slayer Master')}</span>
            <span class="task-reward${contract ? '' : ' hidden'}" id="task-reward-inline">Finish: —</span>
            <button type="button" class="task-pick-btn${contract ? ' hidden' : ''}" id="task-pick-btn" data-action="goto-board">Slayer Master</button>
          </div>
          <div class="hp-bar-wrap" title="Contract kill quota for this task">
            <div class="hp-bar" id="hp-bar" style="width:0%"></div>
          </div>
        </div>
        <div class="monster-name${contract ? '' : ' hidden'}" id="monster-name">${contract ? monsterName : ''}</div>
      </div>

      <div class="hunter-contrib quiet-contrib" id="hunter-contrib"></div>

      <div class="card compact-card stone-panel" id="hunt-side">
        <div class="row-between">
          <div>
            <strong>🍞 Food</strong>
            <p class="muted tiny" id="food-meta-regen">—</p>
            <p class="muted tiny" id="food-meta-eff">—</p>
          </div>
          <button type="button" class="btn small" data-action="buy-food">+40 food · 10 gold</button>
        </div>
        <div class="bar-wrap food">
          <div class="bar" id="food-bar" style="width:0%"></div>
        </div>
      </div>
      <div id="prey-panel"></div>
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
    slots.forEach((el, i) => {
      if (bossMode && i > 0) {
        el.style.display = 'none';
        el.classList.add('hidden');
        return;
      }
      el.style.display = '';
      el.classList.remove('hidden');
      const si = parkIdx[i] != null ? parkIdx[i] : (i % SPAWN_SLOTS.length);
      const slot = SPAWN_SLOTS[si];
      const body = el.querySelector('.mob-body');
      if (body) body.innerHTML = mobFigHtml(vis);
      el.dataset.visual = vis;
      if (bossMode) el.classList.add('is-boss');
      else el.classList.remove('is-boss');
      const fill = el.querySelector('.mob-hp-fill');
      if (fill) fill.style.width = '100%';
      el.classList.remove('dying', 'focus', 'hit', 'telegraph', 'attacking', 'spawn', 'alive', 'on-target');
      el.style.setProperty('--wx', '0px');
      el.style.setProperty('--jig', '0px');
      el.style.removeProperty('--track');
      const baseEnter = 2.0 + Math.random() * 1.0;
      const mob = {
        id: i,
        slotIndex: si,
        hp: hp,
        maxHp: hp,
        el,
        emoji: bossMode && boss ? boss.emoji : emoji,
        visual: vis,
        isBoss: bossMode,
        bossPreyId: bossMode && boss ? boss.id : null,
        baseX: slot.x,
        baseY: slot.y,
        liveX: slot.x,
        liveY: slot.y,
        wanderPhase: Math.random() * 12,
        telegraphUntil: 0,
        state: 'entering',
        enterFrom: (i % 2 === 0) ? 'left' : 'right',
        enterT: 0,
        enterDur: Math.max(0.55, baseEnter / spawnMult),
      };
      // Start off-screen
      const startX = mob.enterFrom === 'left' ? -8 : 108;
      mob.liveX = startX;
      el.style.left = startX + '%';
      el.style.top = slot.y + '%';
      el.classList.add('entering');
      el.classList.remove('alive');
      wave.push(mob);
    });
    setFocus(0);
  }

  function beginWalkIn(mob) {
    if (!mob || !mob.el) return;
    mob.state = 'entering';
    mob.enterT = 0;
    const spawnMult = (combatOf().spawnMult != null && combatOf().spawnMult > 0)
      ? Number(combatOf().spawnMult) : 1;
    mob.enterDur = Math.max(0.55, (2.0 + Math.random() * 1.0) / spawnMult);
    mob.enterFrom = Math.random() < 0.5 ? 'left' : 'right';
    const startX = mob.enterFrom === 'left' ? -8 : 108;
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

    const start = (e) => {
      if (e.type === 'mousedown' && e.button !== 0) return;
      if (e.type === 'pointerdown' && e.button != null && e.button !== 0) return;
      // Ignore if clicking a chest tube
      if (e.target && e.target.closest && e.target.closest('.chest-tube, .chest-rails, .boost-pill')) return;
      e.preventDefault();
      const p = storePointerPct(e);
      const tapped = pickMobNearPointer(p, 14);
      if (tapped) setFocus(tapped.id);
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

    if (!holdWired) {
      holdWired = true;
      window.addEventListener('mouseup', end);
      window.addEventListener('pointerup', end);
      window.addEventListener('touchend', end);
      window.addEventListener('touchcancel', end);
      window.addEventListener('blur', () => { ptrDownMeta = null; setHolding(false); });
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
    if (boltAimTaught(st) || boltHintFading) {
      el.classList.add('hint-gone');
      el.classList.remove('hint-fade');
      return;
    }
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
      // Fire first bolt promptly, then pace
      boltTickAcc = boltIntervalMs() * 0.92;
    } else {
      clearTrackUi();
      boltTickAcc = 0;
    }
    if (onHoldChange) onHoldChange(v);
  }

  function playerOriginPct() {
    // Player avatar sits bottom-center of arena
    return { x: 50, y: 82 };
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
      const pos = mobPosPct(m);
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

  function spawnPlayerBolt(origin, dirX, dirY, hit, flightMs) {
    if (!els.projLayer || !els.arena) return;
    const a = els.arena.getBoundingClientRect();
    const x0 = (origin.x / 100) * a.width;
    const y0 = (origin.y / 100) * a.height;
    const travel = hit ? hit.dist : Math.min(72, BOLT_RANGE * 0.7);
    const x1 = ((origin.x + dirX * travel) / 100) * a.width;
    const y1 = ((origin.y + dirY * travel) / 100) * a.height;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const st = getState ? getState() : null;
    const tier = (st && st.features && st.features.beamTier) || 0;
    const p = document.createElement('div');
    p.className = 'proj player-bolt bolt-tier-' + Math.min(3, tier);
    p.style.left = x0 + 'px';
    p.style.top = y0 + 'px';
    p.style.setProperty('--proj-color', '#ffff66');
    p.style.setProperty('--proj-dx', dx + 'px');
    p.style.setProperty('--proj-dy', dy + 'px');
    p.style.setProperty('--proj-angle', angle + 'deg');
    p.style.setProperty('--proj-dur', flightMs + 'ms');
    if (window.CB_SPRITES) {
      try { window.CB_SPRITES.applyProjSprite(p, 'bolt'); } catch (e) { /* soft */ }
    }
    els.projLayer.appendChild(p);
    setTimeout(() => p.remove(), flightMs + 40);
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
      const cur = next.costCurrency === 'points' ? '⭐' : '🪙';
      nextHint = 'Next: ' + next.name.replace(' Blade', '') + ' ' + window.CB_FMT.num(cost) + cur;
      const gate = S.playGateOk(state, next);
      if (!gate.ok) nextHint += ' · 🔒 ' + (gate.reason || 'time locked');
    }
    return { tier, info, next, nextHint };
  }

  function updateGearStrip(state) {
    const g = getGearInfo(state);
    if (els.gearWeapon) els.gearWeapon.textContent = g.info.emoji + ' ' + g.info.weapon;
    if (els.gearArmor) els.gearArmor.textContent = '🛡️ ' + g.info.armor;
    if (els.gearNext) {
      els.gearNext.textContent = g.nextHint;
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
        els.spReward.textContent = 'Finish reward: 🪙 ' + F.num(rew.gold, 0) + ' gold · ⭐ ' + F.num(rew.points, 0) + ' Sp' + chestTxt;
        if (els.taskRewardInline) els.taskRewardInline.textContent = 'Finish: 🪙 ' + F.num(rew.gold, 0) + ' · ⭐ ' + F.num(rew.points, 0);
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
        toastMsg = 'Task complete! Claimed 🪙 ' + F.num(r.gold, 0) + ' gold · ⭐ ' + F.num(r.points, 0) + ' Slayer points';
        if (r.signatureMat && r.signatureMat.total > 0) {
          toastMsg += ' · ' + (r.signatureMat.emoji || '') + ' ' + r.signatureMat.name + ' ×' + r.signatureMat.total;
        }
      } else if (finC) {
        const r = finishRewardPreview(state, finC);
        toastMsg = 'Task complete! Claimed 🪙 ' + F.num(r.gold, 0) + ' gold · ⭐ ' + F.num(r.points, 0) + ' Slayer points';
      }
      if (window.CB_UI && window.CB_UI.toast) window.CB_UI.toast(toastMsg);
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


  function syncBossHud(state) {
    if (!window.CB_STATE || !window.CB_STATE.isBossFightActive(state)) return false;
    const boss = window.CB_STATE.getActiveBoss(state);
    if (!boss) return false;
    const F = window.CB_FMT;
    const living = wave.filter(m => m && m.isBoss && m.hp > 0 && m.el && !m.el.classList.contains('dying'));
    const mob = living[0] || wave.find(m => m && m.isBoss);
    const maxHp = getMonsterVisualHp(boss);
    const hp = mob ? Math.max(0, mob.hp) : 0;
    const pct = Math.min(100, (hp / Math.max(1, maxHp)) * 100);
    if (els.hpBar) els.hpBar.style.width = pct + '%';
    if (els.hpLabel) els.hpLabel.textContent = 'Boss · ' + F.num(hp, 0) + ' / ' + F.num(maxHp, 0) + ' HP';
    if (els.monsterName) {
      els.monsterName.textContent = window.CB_STATE.bossDisplayName(boss);
      els.monsterName.classList.remove('hidden');
    }
    if (els.taskDock) els.taskDock.classList.remove('need-task');
    if (els.taskRewardInline) {
      els.taskRewardInline.textContent = 'Kill for relic';
      els.taskRewardInline.classList.remove('hidden');
    }
    if (els.taskPickBtn) els.taskPickBtn.classList.add('hidden');
    return true;
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
          ? `<p class="success tiny">${lvl} cleared · Relic claimed</p>`
          : fighting
            ? `<p class="tiny accent">Fighting — boss HP resets if you leave</p>
               <button type="button" class="btn ghost small" data-action="flee-boss" data-id="${p.id}">Leave fight</button>`
            : canFight
              ? `<button type="button" class="btn primary glow" data-action="fight-boss" data-id="${p.id}">Fight boss</button>
                 <p class="muted tiny">${st.accessUnlocked ? 'Access unlocked — fight until you win.' : 'Meter full — start the live boss fight.'}</p>`
              : `<p class="muted tiny">Earn Slayer points on ${lvl} Tasks to fill the boss meter. Then Fight boss for a relic + next Level.</p>`
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
      // Do not soft-swap visuals mid-boss
    } else if (contract) {
      const quota = S.effectiveQuota(state, contract);
      const kills = Math.min(Math.floor(state.contractProgress || 0), quota);
      const pct = Math.min(100, (kills / Math.max(1, quota)) * 100);
      if (els.hpBar) els.hpBar.style.width = pct + '%';
      if (els.hpLabel) els.hpLabel.textContent = `Task · ${kills} / ${quota} kills`;
      if (els.taskDock) els.taskDock.classList.remove('need-task');
      if (els.taskPickBtn) els.taskPickBtn.classList.add('hidden');
      if (els.taskRewardInline) els.taskRewardInline.classList.remove('hidden');
      if (els.monsterName) {
        els.monsterName.textContent = S.displayName ? S.displayName(contract) : contract.name;
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
        if ((ready && !elFight && !fighting && !st.finished) || (fighting && !els.preyPanel.querySelector('.fighting'))) {
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

  function visualTick(now, dt) {
    const state = getState ? getState() : null;
    if (!state || !els.arena) return;

    const huntScreen = document.getElementById('screen-hunt');
    if (!huntScreen || !huntScreen.classList.contains('active')) return;

    const contract = state.currentContractId
      ? window.CB_STATE.getContract(state.currentContractId)
      : null;

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
        const startX = m.enterFrom === 'left' ? -8 : 108;
        m.liveX = startX + (m.baseX - startX) * ease;
        m.liveY = m.baseY + Math.sin(ease * Math.PI) * 1.2;
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
      const wanderAmp = (combat.wanderAmp != null && combat.wanderAmp > 0) ? Number(combat.wanderAmp) : 1;
      m.wanderPhase = (m.wanderPhase || 0) + dtSec * 0.85 * moveMult;
      // Subtle % drift — amp/speed vary per monster identity
      const driftX = (Math.sin(m.wanderPhase) * 2.2 + Math.sin(m.wanderPhase * 0.37 + i) * 0.8) * wanderAmp;
      const driftY = (Math.cos(m.wanderPhase * 0.9 + i * 0.7) * 1.5) * wanderAmp;
      m.liveX = m.baseX + driftX;
      m.liveY = m.baseY + driftY;
      syncMobEl(m);
      const jig = Math.sin(patrolPhase * 1.4 + i * 2) * 1.2;
      if (!m.el.classList.contains('hit')) {
        m.el.style.setProperty('--wx', '0px');
        m.el.style.setProperty('--jig', jig.toFixed(1) + 'px');
      }
      // Ambient telegraph lean toward focus
      if (now > (m.telegraphUntil || 0) && Math.random() < 0.008) {
        m.telegraphUntil = now + 280;
        m.el.classList.add('telegraph');
        setTimeout(() => m.el && m.el.classList.remove('telegraph'), 280);
      }
      // Face roughly toward arena center / player
      const faceRight = (m.liveX || m.baseX || 50) < 50;
      m.el.classList.toggle('face-left', !faceRight);
      m.el.classList.toggle('face-right', faceRight);
    });

    // Melee pathing every frame + attack timers
    const D = window.CB_DATA;
    const unlocked = D.hunters.filter(h => state.hunters[h.id]?.unlocked);
    unlocked.forEach((h, i) => {
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
    if (holding) {
      boltTickAcc += dt;
      noteBoltAimHold(dt);
      const interval = boltIntervalMs();
      while (boltTickAcc >= interval) {
        boltTickAcc -= interval;
        fireBolt(contract);
      }
      maybeSpecialPulse(state, contract, dt);
      // Mild shake only while actively firing (no whiff shake)
      const st = getState ? getState() : state;
      const tier = (st && st.features && st.features.beamTier) || 0;
      const ampBase = bombActive() ? 3 : (0.6 + tier * 0.5);
      els.arena.style.setProperty('--shake-x', ((Math.random() - 0.5) * ampBase) + 'px');
      els.arena.style.setProperty('--shake-y', ((Math.random() - 0.5) * ampBase) + 'px');
    } else {
      boltTickAcc = 0;
      specialAcc = 0;
      els.arena.style.setProperty('--shake-x', '0px');
      els.arena.style.setProperty('--shake-y', '0px');
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
          if (m.el.classList.contains('walking-in') || m.state === 'entering') st = 'walk';
          else if (m.el.classList.contains('attacking') || m.el.classList.contains('telegraph')) st = 'attack';
          window.CB_SPRITES.syncMobAnim(m.el, st);
        });
        window.CB_SPRITES.tick(els.arena, dt || 50);
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

  function critChanceNow() {
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

  function boltIntervalMs() {
    // Base cadence; killMult (Frenzy/Bomb/etc.) speeds live bolts too
    let base = 135;
    const km = liveKillMult();
    if (km > 1) base = base / km;
    // Bomb Barrage: extra snap so it clearly feels faster than Frenzy-scaled alone
    if (bombActive()) base = Math.min(base, 78);
    const spd = 1 + (Math.max(1, SPEED()) - 1) * 0.2; // SPEED 40 → ~8.8×
    return Math.max(36, base * spd);
  }

  /** Fractional bolt chip (internal). Public boltHpChip rounds to integer HP. */
  function boltHpChipRaw(raw) {
    const interval = boltIntervalMs();
    const hp = getMonsterVisualHp(currentContract());
    const baseChip = (hp / BOLT_TTK_SEC) * (interval / 1000);
    const rawN = (raw || 1) / 1.25;
    let chip = Math.max(0.05, baseChip * rawN * (DMG() / DMG_REF) * (BOLT_PWR() / BEAM_REF));
    chip *= liveKillMult();
    return chip;
  }

  /** Integer HP chip for player bolts — splat shows this exact amount. */
  function boltHpChip(raw) {
    return Math.max(1, Math.round(boltHpChipRaw(raw)));
  }

  /** All living mobs along aim ray, nearest-first. */
  function pickBoltTargetsAlongRay(origin, dirX, dirY, excludeIds) {
    const ex = excludeIds || new Set();
    const hits = [];
    const hitW = boltHitWidth();
    livingMobs().forEach((m) => {
      if (ex.has(m.id)) return;
      if (!m || m.hp <= 0 || !m.el || m.el.classList.contains('dying')) return;
      const pos = mobPosPct(m);
      const vx = pos.x - origin.x;
      const vy = pos.y - origin.y;
      const along = vx * dirX + vy * dirY;
      if (along < 3 || along > BOLT_RANGE) return;
      const latX = vx - dirX * along;
      const latY = vy - dirY * along;
      const lateral = Math.sqrt(latX * latX + latY * latY);
      if (lateral > hitW) return;
      hits.push({ mob: m, dist: along, pos });
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
      applyVisualHitToMob(mob, contract, {
        soft: false,
        source: 'bolt',
        dmg,
        crit,
        color,
        singleSplat: true,
      });
      if (window.CB_AUDIO) {
        try { window.CB_AUDIO.play('bolt_hit'); } catch (e) { /* soft */ }
      }
      const st = getState ? getState() : null;
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
  function fireBolt(contract) {
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

    let delayAcc = 0;
    let lastOrigin = aim.o;
    let lastDirX = aim.x;
    let lastDirY = aim.y;
    let lastMob = null;
    let lastDmg = baseDmg;

    pierceHits.forEach((hit, idx) => {
      const mult = PIERCE_FALLOFF[Math.min(idx, PIERCE_FALLOFF.length - 1)];
      const dmg = baseDmg * mult;
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
    const b = window.CB_STATE.getBonuses(state);
    const cadence = b.specialCadence || 1;
    const period = (8000 / Math.max(0.5, cadence)) * SPEED();
    specialAcc += dt;
    if (specialAcc < period) return;
    specialAcc = 0;
    const aim = assistedAimDir();
    const hit = pickBoltTarget(aim.o, aim.x, aim.y);
    const flightMs = hit ? Math.max(140, Math.min(400, 120 + (hit.dist || 40) * 4)) : 320;
    spawnPlayerBolt(aim.o, aim.x, aim.y, hit, flightMs);
    const raw = 4 + Math.floor(Math.random() * 3);
    const dmg = Math.max(1, Math.round(boltHpChip(raw) * 2.2));
    setTimeout(() => {
      const mob = hit && hit.mob && hit.mob.hp > 0 ? hit.mob : getFocusMob();
      if (!mob) return;
      applyVisualHitToMob(mob, contract, {
        soft: false,
        source: 'bolt',
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
    mob.el.classList.remove('hit');
    void mob.el.offsetWidth;
    mob.el.style.setProperty('--hit-scale', (1.12 * intensity).toFixed(2));
    mob.el.classList.add('hit');
    // Brief red flash on figure
    const fig = mob.el.querySelector('.fig-mob');
    if (fig) {
      fig.classList.remove('flash');
      void fig.offsetWidth;
      fig.classList.add('flash');
    }
  }

  function killCoinAmount(contract) {
    if (!contract) return 1;
    const avg = (Number(contract.goldMin) + Number(contract.goldMax)) / 2;
    const tier = Number(contract.mult) || 1;
    // Small burst every kill; scales lightly with area/monster tier
    const roll = 0.85 + Math.random() * 0.35;
    return Math.max(1, Math.round((1 + avg * 0.3 * tier) * roll));
  }

  function awardKillCoins(mob, contract) {
    const state = getState ? getState() : null;
    const coins = killCoinAmount(contract);
    // VFX only — real gold already credited via creditContractKills on death
    if (state) lastGold = state.gold;
    const goldEl = document.getElementById('res-gold');
    if (goldEl && state) {
      goldEl.textContent = window.CB_FMT.num(state.gold);
      goldEl.classList.remove('flash-gold');
      void goldEl.offsetWidth;
      goldEl.classList.add('flash-gold');
    }
    if (mob && mob.el) {
      const now = performance.now();
      if (now > killCoinStaggerUntil) killCoinStaggerN = 0;
      const delay = Math.min(killCoinStaggerN, 6) * 90;
      killCoinStaggerN++;
      killCoinStaggerUntil = now + 700;
      const el = mob.el;
      setTimeout(() => {
        if (!el || !el.isConnected) return;
        spawnLocalLoot(el, '+' + coins + ' coins', 'gold kill-coin');
        spawnLootFly(el, contract, coins);
      }, delay);
    }
    return coins;
  }

  function killMob(mob, contract) {
    if (!mob.el) return;
    mob.el.classList.add('dying');
    if (window.CB_AUDIO) {
      try { window.CB_AUDIO.play('mob_death'); } catch (e) { /* soft */ }
    }
    spawnKillBurst(mob.el);
    // Boss fight kill → clear Level, relic, unlock next (no Task credit)
    try {
      const st = getState ? getState() : null;
      if (st && mob.isBoss && mob.bossPreyId && window.CB_STATE) {
        const r = window.CB_STATE.finishMarkedPrey(st, mob.bossPreyId);
        if (r && r.ok) {
          let msg = (r.levelCleared || 'Level') + ' cleared!';
          if (r.relic) msg += ' ' + (r.relic.emoji || '') + ' ' + (r.relic.name || '');
          if (r.unlockLevelName) msg += ' · ' + r.unlockLevelName + ' unlocked';
          if (window.CB_UI && window.CB_UI.toast) window.CB_UI.toast(msg, { ms: 4200 });
          if (window.CB_INTRO) {
            try { window.CB_INTRO.note('boss-kill', mob.bossPreyId); } catch (e) { /* soft */ }
          }
          // Leave boss mode; HP/wave reset on next shell
          if (window.CB_GAME && window.CB_GAME.persist) {
            try { window.CB_GAME.persist(); } catch (e3) { /* soft */ }
          }
          markDirty();
          if (window.CB_UI && window.CB_UI.renderAll && window.CB_GAME) {
            try {
              const tab = window.CB_GAME.getTab ? window.CB_GAME.getTab() : 'hunt';
              window.CB_UI.renderAll(st, tab);
            } catch (e2) { /* soft */ }
          }
        }
        awardKillCoins(mob, contract);
        return;
      }
    } catch (e) { /* soft */ }
    // Task bar: +1 kill toward quota (arena death is the source of truth on Hunt)
    try {
      const st = getState ? getState() : null;
      if (st && contract && window.CB_STATE && typeof window.CB_STATE.creditContractKills === 'function') {
        window.CB_STATE.creditContractKills(st, contract, 1); // full kill economy (gold/points/scraps)
        // Snap Task UI immediately (don't wait for the next soft tick)
        const S = window.CB_STATE;
        const F = window.CB_FMT;
        const quota = S.effectiveQuota(st, contract);
        const kills = Math.min(Math.floor(st.contractProgress || 0), quota);
        const pct = Math.min(100, (kills / Math.max(1, quota)) * 100);
        if (els.hpBar) els.hpBar.style.width = pct + '%';
        if (els.hpLabel) els.hpLabel.textContent = `Task · ${kills} / ${quota} kills`;
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
    awardKillCoins(mob, contract);
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
        beginWalkIn(mob);
      }
    }, 220);
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

  function spawnLootFly(fromEl, contract, forcedAmt) {
    if (!els.floatLayer || !els.arena) return;
    const avgGold = contract
      ? ((contract.goldMin + contract.goldMax) / 2)
      : 1;
    const goldAmt = forcedAmt != null
      ? forcedAmt
      : Math.max(1, Math.round(avgGold * 0.3));
    const text = '+' + window.CB_FMT.num(goldAmt, goldAmt < 10 ? 1 : 0) + '🪙';

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
    el.textContent = text;
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
      spawnLocalLoot(fromEl, '+' + window.CB_FMT.num(contract.pointsPerKill, 0) + '⭐', 'pts');
    }

    setTimeout(() => {
      el.remove();
      if (goldEl) {
        goldEl.classList.remove('flash-gold');
        void goldEl.offsetWidth;
        goldEl.classList.add('flash-gold');
      }
    }, 1600);
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

  function spawnKillBurst(atEl) {
    if (!els.particles || !els.arena) return;
    const a = els.arena.getBoundingClientRect();
    const m = atEl.getBoundingClientRect();
    const cx = ((m.left + m.width / 2 - a.left) / a.width) * 100;
    const cy = ((m.top + m.height / 2 - a.top) / a.height) * 100;
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('div');
      s.className = 'spark burst';
      s.style.left = cx + '%';
      s.style.top = cy + '%';
      const ang = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
      const dist = 28 + Math.random() * 36;
      s.style.setProperty('--sx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--sy', Math.sin(ang) * dist + 'px');
      s.style.background = i % 2 ? '#ff981f' : '#ffff00';
      els.particles.appendChild(s);
      setTimeout(() => s.remove(), 480);
    }
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
      if (curr > prev + 0.01) {
        el.classList.remove('flash-gold', 'flash-green');
        void el.offsetWidth;
        el.classList.add(kind);
        el.textContent = id === 'res-food'
          ? window.CB_FMT.num(state.food) + '/' + window.CB_FMT.num(window.CB_STATE.getBonuses(state).foodCap)
          : window.CB_FMT.num(curr);
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

  window.CB_ARENA = {
    get ACTIVE_MULT() { return getConfiguredActiveMult(); },
    bind,
    render,
    update,
    markDirty,
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
