/** First-run Intro Tasks (1 of 20) — Obelisk-style dropdown on Hunt arena */
(function () {
  const TOTAL = 22;

  /** Upgrade ids whose minPlayMs is waived while intro is active */
  const INTRO_WAIVE = {
    gear_iron: true,
    beam_focus: true,
    bolt_pierce: true,
    bolt_bounce: true,
    hunter_briar: true,
  };

  function upLevel(state, id) {
    const S = window.CB_STATE;
    if (!S) return 0;
    if (typeof S.getUpgradeLevel === 'function') return S.getUpgradeLevel(state, id) || 0;
    return 0;
  }

  const TASKS = [
    {
      id: 'finish_bristle',
      icon: '🐻',
      title: 'Finish a Crawling Hand Task',
      instr: 'Hold toward Crawling Hands until the Task bar fills (same goal as Intro).',
      arrow: { sel: '#task-dock', tab: 'hunt' },
      check: (s, st) => (st.contractFinishes || 0) >= 1
        || ((s.bestiary && s.bestiary.bristle_cub && s.bestiary.bristle_cub.completions) || 0) >= 1
        || (s.currentContractId === 'bristle_cub' && (s.contractProgress || 0) >= (
          (window.CB_STATE && window.CB_STATE.effectiveQuota
            && window.CB_STATE.effectiveQuota(s, window.CB_STATE.getContract('bristle_cub'))) || 25)),
      progress: (s) => {
        const S = window.CB_STATE;
        const c = S && S.getContract && S.getContract('bristle_cub');
        const quota = (S && c && S.effectiveQuota) ? S.effectiveQuota(s, c) : 25;
        const kills = Math.min(quota, Math.floor(
          (s.currentContractId === 'bristle_cub' ? (s.contractProgress || 0) : 0)
          || ((s.bestiary && s.bestiary.bristle_cub && s.bestiary.bristle_cub.completions) ? quota : 0)
        ));
        return kills + ' / ' + quota;
      },
      onComplete: (s) => {
        if ((s.gold || 0) < 200) s.gold = Math.max(s.gold || 0, 200);
      },
    },
    {
      id: 'buy_food',
      icon: '🍖',
      title: 'Restock Food',
      instr: 'Spend gold on Food — stocking supplies for the hunt.',
      arrow: { sel: '[data-action="buy-food"]', tab: 'hunt' },
      check: (s, st) => (st.foodBuys || 0) >= 1,
    },
    {
      id: 'upgrade_weapon',
      icon: '🗡️',
      title: 'Upgrade your weapon',
      instr: 'Progress → Gear: buy Iron Blade.',
      arrow: { sel: '[data-prog-strip="gear"], [data-node="g_iron"]', tab: 'maps', strip: 'gear' },
      check: (s) => upLevel(s, 'gear_iron') >= 1,
      onEnter: (s) => ensureGold(s, 180),
    },
    {
      id: 'open_board',
      icon: '🧙',
      title: 'Open the Slayer Master',
      instr: 'Visit the Slayer Master tab to see Level hunt targets.',
      arrow: { sel: '.tab-btn[data-tab="board"]', tab: null },
      check: (s, st) => !!(st.boardVisits),
    },
    {
      id: 'unlock_quarry',
      icon: '🔓',
      title: 'Unlock Cave Crawler',
      instr: 'Finish Crawling Hand Tasks until Cave Crawler unlocks (Slayer Master silhouette).',
      arrow: { sel: '.tab-btn[data-tab="board"], .locked-monster, .contract-list', tab: 'board' },
      check: (s) => !!(s.bestiary && s.bestiary.thornpelt_bear && s.bestiary.thornpelt_bear.unlocked),
    },
    {
      id: 'switch_contract',
      icon: '📜',
      title: 'Accept Thornpelt Bear',
      instr: 'On Slayer Master, Accept Cave Crawler · Lv 18 (ladder: Hand → Crawler → Banshee → Champion).',
      arrow: { sel: '[data-action="accept"][data-id="thornpelt_bear"]', tab: 'board' },
      check: (s, st) => s.currentContractId === 'thornpelt_bear' || !!(st.switchedToThornpelt),
    },
    {
      id: 'earn_slayer',
      icon: '⭐',
      title: 'Earn Slayer points',
      instr: 'Hunt until you hold at least 25 Slayer points (header ⭐). They fill the Level boss meter.',
      arrow: { sel: '#res-points, .resources', tab: null },
      check: (s) => (s.points || 0) >= 25,
      progress: (s) => Math.min(25, Math.floor(s.points || 0)) + ' / 25',
    },
    {
      id: 'check_codex',
      icon: '📖',
      title: 'Check Codex',
      instr: 'Open Codex and read one entry (creature ladder / Fight boss).',
      arrow: { sel: '.tab-btn[data-tab="codex"]', tab: null },
      check: (s, st) => !!(st.codexOpens),
    },
    {
      id: 'claim_boost',
      icon: '📦',
      title: 'Claim a ready casket',
      instr: 'Tap the teal BOOST tube on the left when it jiggles / is ready.',
      arrow: { sel: '#chest-boost', tab: 'hunt' },
      check: (s, st) => (st.boostClaims || 0) >= 1,
      onEnter: (s) => {
        if (window.CB_CHESTS) {
          window.CB_CHESTS.ensure(s);
          if (s.chests) {
            s.chests.boostCharge = 1;
            s.chests.boostReady = true;
          }
          if (window.CB_CHESTS.syncOverlay) window.CB_CHESTS.syncOverlay(s);
        }
      },
    },
    {
      id: 'use_boost',
      icon: '⚡',
      title: 'Use a boost while hunting',
      instr: 'Have an active boost, or claim one and hold-fire for a few seconds.',
      arrow: { sel: '#boost-pill, #arena', tab: 'hunt' },
      check: (s, st) => {
        const boost = window.CB_CHESTS && window.CB_CHESTS.getActiveBoost
          ? window.CB_CHESTS.getActiveBoost(s) : (s.chests && s.chests.activeBoost);
        if (boost && (boost.endsAt == null || Date.now() < boost.endsAt)) return true;
        return (st.boostHoldMs || 0) >= 5000;
      },
    },
    {
      id: 'camp_food',
      icon: '🏕️',
      title: 'Buy Bigger Food Stock or Food Efficiency',
      instr: 'Progress → Camp: stock/craft supplies (Bigger Food Stock or Food Efficiency).',
      arrow: { sel: '[data-prog-strip="camp"], [data-action="buy-upgrade"][data-id="food_cap"], [data-action="buy-upgrade"][data-id="food_eff"]', tab: 'maps', strip: 'camp' },
      check: (s) => upLevel(s, 'food_cap') >= 1 || upLevel(s, 'food_eff') >= 1,
      onEnter: (s) => ensureGold(s, 55),
    },
    {
      id: 'improve_bounty',
      icon: '⬆',
      title: 'Improve a monster bounty',
      instr: 'Spend gold on Improve bounty on a Slayer Master card.',
      arrow: { sel: '[data-action="improve-mastery"]', tab: 'board' },
      check: (s, st) => (st.masteryImproves || 0) >= 1,
      onEnter: (s) => ensureGold(s, 50),
    },
    {
      id: 'watch_boss',
      icon: '🐻',
      title: 'Fill Level 1 boss meter',
      instr: 'Keep hunting Level 1 — fill Tier Test meter on Hunt (Slayer points toward 120).',
      arrow: { sel: '#prey-panel, .prey-card', tab: 'hunt' },
      check: (s) => {
        const stP = (s.prey && s.prey.sewer_king) || {};
        return (stP.meter || stP.chip || 0) >= 40 || !!stP.accessUnlocked || !!stP.finished;
      },
      progress: (s) => {
        const stP = (s.prey && s.prey.sewer_king) || {};
        const m = Math.floor(stP.meter || stP.chip || 0);
        return Math.min(40, m) + ' / 40';
      },
    },
    {
      id: 'unlock_boss',
      icon: '🔓',
      title: 'Unlock Level 1 boss',
      instr: 'Fill the boss meter to 120 Sp, then Fight boss unlocks.',
      arrow: { sel: '[data-action="fight-boss"], #prey-panel', tab: 'hunt' },
      check: (s) => {
        const stP = (s.prey && s.prey.sewer_king) || {};
        return !!stP.accessUnlocked || !!stP.finished || (stP.meter || 0) >= 120;
      },
      progress: (s) => {
        const stP = (s.prey && s.prey.sewer_king) || {};
        const m = Math.floor(stP.meter || 0);
        return Math.min(120, m) + ' / 120';
      },
    },
    {
      id: 'hire_briar', // xp1b: SL4 now comes from XP (~69 s), so hire before the Tier Test
      icon: '🧔',
      title: 'Hire Warrior',
      instr: 'Progress → Company: Hire Warrior.',
      arrow: { sel: '[data-prog-strip="company"], [data-node="co_briar"]', tab: 'maps', strip: 'company' },
      check: (s) => !!(s.hunters && s.hunters.briar && s.hunters.briar.unlocked)
        || upLevel(s, 'hunter_briar') >= 1,
      onEnter: (s) => ensureGold(s, 80),
    },
    {
      id: 'watch_briar',
      icon: '👀',
      title: 'Watch Briar chase and swing',
      instr: 'Survive on Hunt until Briar lands 3 melee hits.',
      arrow: { sel: '.drone[data-hunter="briar"], #drone-layer', tab: 'hunt' },
      check: (s, st) => (st.briarHits || 0) >= 3,
      progress: (s, st) => Math.min(3, st.briarHits || 0) + ' / 3',
    },
    {
      id: 'defeat_elder',
      icon: '👑',
      title: 'Defeat Crawling Hand Champion',
      instr: 'Tap Fight and slay Crawling Hand Champion · Lv 30 (weapon only — helpers muted).',
      arrow: { sel: '[data-action="fight-boss"], #arena', tab: 'hunt' },
      check: (s, st) => !!(s.prey && s.prey.sewer_king && s.prey.sewer_king.finished)
        || !!(st.bossKillsElder),
    },
    {
      id: 'earn_gold',
      icon: '<img class="gold-icon" src="art/v3b/ui/gold/coins_5_16.png" width="16" height="16" alt="">',
      title: 'Earn gold this run',
      instr: 'Hold 50+ gold or earn 100 this intro.',
      arrow: { sel: '#res-gold, .res-gold-wrap', tab: null },
      check: (s, st) => (s.gold || 0) >= 50 || (st.goldEarned || 0) >= 100,
    },
    {
      id: 'bolt_focus',
      icon: '🎯',
      title: 'Progress → Combat: Bolt Focus',
      instr: 'Buy Bolt Focus on the Combat map.',
      arrow: { sel: '[data-prog-strip="combat"], [data-node="c_beam"]', tab: 'maps', strip: 'combat' },
      check: (s) => upLevel(s, 'beam_focus') >= 1,
      onEnter: (s) => ensureGold(s, 90),
    },
    {
      id: 'pierce_bounce',
      icon: '💫',
      title: 'Learn pierce OR bounce',
      instr: 'Buy Bolt Pierce or Bolt Bounce on Combat.',
      arrow: { sel: '[data-node="c_pierce"], [data-node="c_bounce"]', tab: 'maps', strip: 'combat' },
      check: (s) => upLevel(s, 'bolt_pierce') >= 1 || upLevel(s, 'bolt_bounce') >= 1,
      onEnter: (s) => ensureGold(s, 200),
    },
    {
      id: 'claim_relic',
      icon: '💎',
      title: 'Claim Relic casket once',
      instr: 'Tap the purple Relic casket on the left when ready.',
      arrow: { sel: '#chest-perm', tab: 'hunt' },
      check: (s, st) => (st.relicClaims || 0) >= 1,
      onEnter: (s) => {
        if (window.CB_CHESTS) {
          window.CB_CHESTS.ensure(s);
          if (s.chests) {
            s.chests.permanentCharge = 1;
            s.chests.permanentReady = true;
          }
          if (window.CB_CHESTS.syncOverlay) window.CB_CHESTS.syncOverlay(s);
        }
      },
    },
    {
      id: 'graduate',
      icon: '🎓',
      title: 'Graduate',
      instr: 'You’re ready — keep hunting.',
      arrow: null,
      check: () => true,
    },
  ];

  function ensureGold(state, min) {
    if ((state.gold || 0) < min) state.gold = min;
  }

  function blankStats() {
    return {
      visualKillsBristleCub: 0,
      bossKillsElder: 0,
      foodBuys: 0,
      masteryImproves: 0,
      boardVisits: 0,
      codexOpens: 0,
      boostClaims: 0,
      relicClaims: 0,
      boostHoldMs: 0,
      preyViews: 0,
      goldEarned: 0,
      contractFinishes: 0,
      switchedToThornpelt: false,
      briarHits: 0,
      _goldBase: null,
    };
  }

  function defaultIntro() {
    return {
      completed: false,
      introDone: false,
      index: 0,
      seen: true,
      objectiveMet: false,
      stats: blankStats(),
    };
  }

  /** Permanent one-shot gate — once true, intro never auto-shows again. */
  function isIntroDone(state) {
    if (!state) return false;
    if (state.introDone) return true;
    const intro = state.intro;
    if (!intro) return false;
    if (intro.introDone || intro.completed) return true;
    if ((intro.index | 0) >= TOTAL) return true;
    return false;
  }

  function markIntroDone(state) {
    if (!state) return;
    state.introDone = true;
    const intro = ensure(state);
    intro.introDone = true;
    intro.completed = true;
    intro.index = Math.max(intro.index | 0, TOTAL);
    intro.objectiveMet = false;
  }

  /** If either save finished/skipped intro, both should keep that. */
  function stickyIntroDone(a, b) {
    if (isIntroDone(a) || isIntroDone(b)) {
      if (a) markIntroDone(a);
      if (b) markIntroDone(b);
      return true;
    }
    return false;
  }

  function pastTutorialHeuristic(state) {
    if (!state) return false;
    if (isIntroDone(state)) return true;
    const intro = state.intro;
    if (intro && (intro.index | 0) >= TOTAL) return true;
    // xp1b: SL4 now lands ~1 min in — an intro under way is never auto-skipped by the checks below
    if (intro && (intro.index | 0) > 0) return false;
    // First Tier Test / boss beaten
    if (state.prey) {
      for (const id of Object.keys(state.prey)) {
        if (state.prey[id] && state.prey[id].finished) return true;
      }
    }
    if ((state.slayerLevel | 0) >= 4) return true;
    if (state.hunters && state.hunters.briar && state.hunters.briar.unlocked) return true;
    if (state.upgrades && (state.upgrades.hunter_briar | 0) >= 1) return true;
    return false;
  }

  function ensure(state) {
    if (!state.intro) state.intro = defaultIntro();
    if (!state.intro.stats) state.intro.stats = blankStats();
    return state.intro;
  }

  /** Migrate existing saves — permanent introDone for anyone past the tutorial. */
  function migrate(state) {
    ensure(state);
    // Sticky: completed / index past end / explicit flag
    if (state.introDone || (state.intro && (state.intro.introDone || state.intro.completed || (state.intro.index | 0) >= TOTAL))) {
      markIntroDone(state);
      return;
    }
    if (pastTutorialHeuristic(state)) {
      markIntroDone(state);
      return;
    }
    // Legacy experienced saves with no intro object
    if (!state.intro || !state.intro.seen) {
      const playMs = state.playMs || 0;
      const experienced = playMs > 5 * 60 * 1000
        || (state.totalKills || 0) > 0
        || (state.totalContracts || 0) > 0
        || (state.scraps || 0) > 0
        || (state.guildXp || 0) > 5
        || ((state.gold || 0) > 50 && playMs > 30000);
      if (experienced) markIntroDone(state);
    }
  }

  function isActive(state) {
    if (!state) return false;
    if (isIntroDone(state)) return false;
    const intro = state.intro;
    return !!(intro && !intro.completed && !intro.introDone && intro.index < TOTAL);
  }

  function shouldWaivePlayGate(state, upgradeId) {
    if (!isActive(state)) return false;
    return !!INTRO_WAIVE[upgradeId];
  }

  function currentTask(state) {
    const intro = ensure(state);
    if (intro.completed || intro.index >= TOTAL) return null;
    return TASKS[intro.index] || null;
  }

  /* ---------- Obelisk-style Hunt dropdown ---------- */
  let rafHook = 0;
  let lastRenderKey = '';
  let dockExpanded = true; // start open so the objective is visible
  let dockEl = null;
  let lastKnownTab = null; // session-only; collapsed never persists across leaving Hunt

  function playChime() {
    try {
      if (window.CB_AUDIO) {
        if (typeof window.CB_AUDIO.unlock === 'function') window.CB_AUDIO.unlock();
        if (typeof window.CB_AUDIO.introStep === 'function') {
          window.CB_AUDIO.introStep();
          return;
        }
        if (typeof window.CB_AUDIO.play === 'function') {
          window.CB_AUDIO.play('upgrade_purchase');
          return;
        }
      }
    } catch (e) { /* soft */ }
  }

  function toast(msg, opts) {
    if (window.CB_UI && window.CB_UI.toast) window.CB_UI.toast(msg, opts || {});
  }

  function clearHighlight() {
    document.querySelectorAll('.intro-point').forEach((el) => el.classList.remove('intro-point'));
  }

  function placeHighlight(task) {
    clearHighlight();
    if (!task || !task.arrow) return;
    if (task.arrow.strip && window.CB_MAPS && typeof window.CB_MAPS.setStrip === 'function') {
      const st = window.CB_GAME && window.CB_GAME.getState && window.CB_GAME.getState();
      if (st) window.CB_MAPS.setStrip(task.arrow.strip, st);
    }
    const sels = String(task.arrow.sel || '').split(',').map((s) => s.trim()).filter(Boolean);
    let target = null;
    for (let i = 0; i < sels.length; i++) {
      target = document.querySelector(sels[i]);
      if (target) break;
    }
    if (!target) return;
    // Never outline the whole arena — covers gameplay
    if (target.id === 'arena' || target.classList.contains('arena')) return;
    target.classList.add('intro-point');
  }

  function parseProgress(task, state, stats, met) {
    if (typeof task.progress === 'function') {
      const raw = String(task.progress(state, stats) || '');
      const m = raw.match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        return { cur: +m[1], max: +m[2], label: m[1] + '/' + m[2] };
      }
    }
    return met
      ? { cur: 1, max: 1, label: '1/1' }
      : { cur: 0, max: 1, label: '0/1' };
  }

  function ensureDock() {
    let el = document.getElementById('intro-dock');
    if (!el) {
      const arena = document.getElementById('arena');
      if (!arena) return null;
      el = document.createElement('div');
      el.id = 'intro-dock';
      el.className = 'intro-dock';
      arena.insertBefore(el, arena.firstChild);
    }
    el.hidden = false;
    if (el.dataset.bound === '1') {
      dockEl = el;
      return el;
    }
    el.innerHTML = `
      <button type="button" class="intro-dock-head" id="intro-dock-toggle" aria-expanded="true">
        <span class="intro-dock-head-label" id="intro-dock-label">Intro Tasks (1/21)</span>
        <span class="intro-dock-chevron" aria-hidden="true">▾</span>
      </button>
      <div class="intro-dock-body" id="intro-dock-body">
        <div class="intro-dock-title" id="intro-dock-title"></div>
        <div class="intro-dock-instr" id="intro-dock-instr"></div>
        <div class="intro-dock-bar-row">
          <span class="intro-dock-gem" id="intro-dock-gem-l" aria-hidden="true"></span>
          <div class="intro-dock-bar">
            <div class="intro-dock-bar-fill" id="intro-dock-fill" style="width:0%"></div>
            <span class="intro-dock-bar-text" id="intro-dock-bar-text">0/1</span>
          </div>
          <span class="intro-dock-gem" id="intro-dock-gem-r" aria-hidden="true"></span>
        </div>
        <div class="intro-dock-actions">
          <button type="button" class="btn primary intro-dock-complete" id="intro-dock-complete" hidden>Complete Task</button>
          <button type="button" class="btn ghost small intro-dock-skip" id="intro-dock-skip" title="Skip for experienced players">Skip intro</button>
        </div>
      </div>
    `;
    el.querySelector('#intro-dock-toggle').addEventListener('click', () => {
      setDockExpanded(!dockExpanded);
    });
    el.querySelector('#intro-dock-complete').addEventListener('click', (e) => {
      e.stopPropagation();
      const st = window.CB_GAME && window.CB_GAME.getState && window.CB_GAME.getState();
      if (st) completeCurrent(st);
    });
    el.querySelector('#intro-dock-skip').addEventListener('click', (e) => {
      e.stopPropagation();
      const st = window.CB_GAME && window.CB_GAME.getState && window.CB_GAME.getState();
      if (st) skipIntro(st);
    });
    el.dataset.bound = '1';
    dockEl = el;
    return el;
  }

  function setDockExpanded(open) {
    dockExpanded = !!open;
    const el = dockEl || document.getElementById('intro-dock');
    if (!el) return;
    el.classList.toggle('collapsed', !dockExpanded);
    const toggle = el.querySelector('#intro-dock-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', dockExpanded ? 'true' : 'false');
  }

  /** Force-expand when user returns to Hunt (collapsed never persists across leave). */
  function onTabChange(name) {
    const prev = lastKnownTab;
    lastKnownTab = name;
    if (name === 'hunt' && prev != null && prev !== 'hunt') {
      const state = window.CB_GAME && window.CB_GAME.getState && window.CB_GAME.getState();
      if (state && isActive(state)) {
        // Only reopen dock if intro is still the active one-time tutorial
        setDockExpanded(true);
        softRefresh(state);
      } else {
        hideUi();
      }
    }
  }

  function hideUi() {
    clearHighlight();
    const el = document.getElementById('intro-dock');
    if (el) {
      el.hidden = true;
      el.classList.remove('ready', 'needs-attn');
    }
  }

  function refresh(state) {
    if (!state) return;
    migrate(state);
    const intro = ensure(state);
    if (!isActive(state)) {
      hideUi();
      return;
    }
    // Never cover Tier Test / boss — hide dock (and coach) while fighting
    if (window.CB_STATE && window.CB_STATE.isBossFightActive && window.CB_STATE.isBossFightActive(state)) {
      hideUi();
      return;
    }
    if (intro.stats._goldBase == null) intro.stats._goldBase = state.gold || 0;

    const task = currentTask(state);
    if (!task) {
      hideUi();
      return;
    }

    if (intro._entered !== intro.index) {
      intro._entered = intro.index;
      intro.objectiveMet = false;
      dockExpanded = true; // new step always opens the dock
      if (typeof task.onEnter === 'function') {
        try { task.onEnter(state, intro.stats); } catch (e) { /* soft */ }
      }
      if (window.CB_GAME && window.CB_GAME.persist) window.CB_GAME.persist();
    }

    const met = !!task.check(state, intro.stats);
    intro.objectiveMet = met;
    if (met && !dockExpanded) {
      // Soft nudge open when Complete is available
      dockExpanded = true;
    }

    const dock = ensureDock();
    if (!dock) return;
    dock.hidden = false;
    dock.classList.toggle('collapsed', !dockExpanded);
    dock.classList.toggle('ready', met);
    dock.classList.toggle('needs-attn', !met);

    const n = intro.index + 1;
    const label = dock.querySelector('#intro-dock-label');
    const title = dock.querySelector('#intro-dock-title');
    const instr = dock.querySelector('#intro-dock-instr');
    const fill = dock.querySelector('#intro-dock-fill');
    const barText = dock.querySelector('#intro-dock-bar-text');
    const completeBtn = dock.querySelector('#intro-dock-complete');
    const toggle = dock.querySelector('#intro-dock-toggle');

    const guideIcon = task.icon || '✦';
    if (label) label.textContent = 'Intro Tasks (' + n + '/' + TOTAL + ')';
    if (title) {
      if (typeof guideIcon === 'string' && guideIcon.indexOf('<') >= 0) title.innerHTML = guideIcon + ' ' + task.title;
      else title.textContent = guideIcon + ' ' + task.title;
    }
    if (instr) instr.textContent = task.instr || '';
    // Gems stay empty green dots (emoji looked like ✕/cancel in playtest)
    const gemL = dock.querySelector('#intro-dock-gem-l');
    const gemR = dock.querySelector('#intro-dock-gem-r');
    if (gemL) gemL.textContent = '';
    if (gemR) gemR.textContent = '';
    const prog = parseProgress(task, state, intro.stats, met);
    const pct = prog.max > 0 ? Math.min(100, Math.round((prog.cur / prog.max) * 100)) : 0;
    if (fill) fill.style.width = pct + '%';
    if (barText) barText.textContent = prog.label;
    if (completeBtn) completeBtn.hidden = !met;
    if (toggle) toggle.setAttribute('aria-expanded', dockExpanded ? 'true' : 'false');

    const key = intro.index + '|' + (task.arrow && task.arrow.sel) + '|' + met + '|' + prog.label;
    if (key !== lastRenderKey) {
      lastRenderKey = key;
      placeHighlight(task);
    } else {
      placeHighlight(task);
    }
  }

  function completeCurrent(state) {
    const intro = ensure(state);
    if (!isActive(state) || !intro.objectiveMet) return;
    const task = TASKS[intro.index];
    playChime();
    toast('Task done.', { ms: 1400 });
    if (task && typeof task.onComplete === 'function') {
      try { task.onComplete(state, intro.stats); } catch (e) { /* soft */ }
    }
    intro.index += 1;
    intro.objectiveMet = false;
    intro._entered = -1;
    dockExpanded = true;
    if (intro.index >= TOTAL) {
      markIntroDone(state);
      hideUi();
      toast('Intro complete — keep hunting!', { celebrate: true });
    }
    if (window.CB_GAME && window.CB_GAME.persist) window.CB_GAME.persist();
    refresh(state);
    if (window.CB_UI && window.CB_UI.renderTop) window.CB_UI.renderTop(state);
  }

  function skipIntro(state) {
    if (!state) state = window.CB_GAME && window.CB_GAME.getState && window.CB_GAME.getState();
    if (!state) return null;
    const alreadyDone = isIntroDone(state);
    markIntroDone(state);
    const intro = ensure(state);
    intro.seen = true;
    hideUi();
    // Only toast on the actual skip action — never again on reload / re-call
    if (!alreadyDone) toast('Intro skipped — hunt when ready', { ms: 2500 });
    if (window.CB_GAME && window.CB_GAME.persist) window.CB_GAME.persist();
    if (window.CB_UI && window.CB_UI.renderAll) {
      try {
        const tab = window.CB_GAME.getTab ? window.CB_GAME.getTab() : 'hunt';
        window.CB_UI.renderAll(state, tab);
      } catch (e) { /* soft */ }
    }
    return intro;
  }

  function resetIntro(state) {
    if (!state) state = window.CB_GAME && window.CB_GAME.getState && window.CB_GAME.getState();
    if (!state) return null;
    // Explicit Settings replay only — clears the permanent flag on purpose
    state.introDone = false;
    state.intro = defaultIntro();
    state.intro.stats._goldBase = state.gold || 0;
    dockExpanded = true;
    lastRenderKey = '';
    if (window.CB_GAME && window.CB_GAME.persist) window.CB_GAME.persist();
    refresh(state);
    return state.intro;
  }

  function onArenaKill(contractId) {
    const state = window.CB_GAME && window.CB_GAME.getState && window.CB_GAME.getState();
    if (!state || !isActive(state)) return;
    const intro = ensure(state);
    if (contractId === 'bristle_cub') {
      intro.stats.visualKillsBristleCub = (intro.stats.visualKillsBristleCub || 0) + 1;
    }
    intro.stats.goldEarned = Math.max(
      intro.stats.goldEarned || 0,
      (state.gold || 0) - (intro.stats._goldBase || 0)
    );
    softRefresh(state);
  }

  function onHunterMeleeHit(hunterId) {
    const state = window.CB_GAME && window.CB_GAME.getState && window.CB_GAME.getState();
    if (!state || !isActive(state)) return;
    const intro = ensure(state);
    if (hunterId === 'briar') {
      intro.stats.briarHits = (intro.stats.briarHits || 0) + 1;
      softRefresh(state);
    }
  }

  function note(action, detail) {
    const state = window.CB_GAME && window.CB_GAME.getState && window.CB_GAME.getState();
    if (!state || !isActive(state)) return;
    const intro = ensure(state);
    const st = intro.stats;
    switch (action) {
      case 'buy-food':
        st.foodBuys = (st.foodBuys || 0) + 1;
        break;
      case 'improve-mastery':
        st.masteryImproves = (st.masteryImproves || 0) + 1;
        break;
      case 'tab':
        if (detail === 'board') st.boardVisits = (st.boardVisits || 0) + 1;
        if (detail === 'codex') st.codexOpens = (st.codexOpens || 0) + 1;
        break;
      case 'claim-chest':
        if (detail === 'boost') st.boostClaims = (st.boostClaims || 0) + 1;
        if (detail === 'permanent') st.relicClaims = (st.relicClaims || 0) + 1;
        break;
      case 'boss-kill':
        st.bossKillsElder = (st.bossKillsElder || 0) + 1;
        break;
      case 'fight-boss':
        st.fightBossTaps = (st.fightBossTaps || 0) + 1;
        break;
      case 'accept':
        if (detail === 'thornpelt_bear') st.switchedToThornpelt = true;
        break;
      case 'contract-finish':
        st.contractFinishes = (st.contractFinishes || 0) + 1;
        break;
      case 'prey-view':
        st.preyViews = (st.preyViews || 0) + 1;
        break;
      default:
        break;
    }
    softRefresh(state);
  }

  function softRefresh(state) {
    if (softRefresh._t) return;
    softRefresh._t = setTimeout(() => {
      softRefresh._t = null;
      refresh(state);
    }, 80);
  }

  function tick(state, dtMs) {
    if (!state || !isActive(state)) return;
    const intro = ensure(state);
    const boost = window.CB_CHESTS && window.CB_CHESTS.getActiveBoost
      ? window.CB_CHESTS.getActiveBoost(state) : null;
    const holding = window.CB_ARENA && window.CB_ARENA.isHolding && window.CB_ARENA.isHolding();
    if (boost && holding) {
      intro.stats.boostHoldMs = (intro.stats.boostHoldMs || 0) + (dtMs || 0);
    }
    const prey = document.getElementById('prey-panel');
    const hunt = document.getElementById('screen-hunt');
    if (prey && hunt && hunt.classList.contains('active') && prey.getBoundingClientRect().height > 20) {
      if (!intro.stats.preyViews) intro.stats.preyViews = 1;
    }
    if (intro.stats._goldBase != null) {
      const delta = (state.gold || 0) - intro.stats._goldBase;
      if (delta > (intro.stats.goldEarned || 0)) intro.stats.goldEarned = delta;
    }
    softRefresh(state);
  }

  function startLoop() {
    if (rafHook) return;
    let last = performance.now();
    const frame = (now) => {
      rafHook = requestAnimationFrame(frame);
      const dt = Math.min(200, now - last);
      last = now;
      const state = window.CB_GAME && window.CB_GAME.getState && window.CB_GAME.getState();
      if (state) tick(state, dt);
    };
    rafHook = requestAnimationFrame(frame);
  }

  window.CB_INTRO = {
    TASKS,
    TOTAL,
    INTRO_WAIVE,
    ensure,
    migrate,
    isActive,
    isIntroDone,
    markIntroDone,
    stickyIntroDone,
    pastTutorialHeuristic,
    shouldWaivePlayGate,
    currentTask,
    refresh,
    softRefresh: typeof softRefresh === 'function' ? softRefresh : refresh,
    resetIntro,
    skipIntro,
    completeCurrent,
    onArenaKill,
    onHunterMeleeHit,
    note,
    tick,
    startLoop,
    playChime,
    onTabChange,
    setDockExpanded,
    hideUi,
  };
})();
