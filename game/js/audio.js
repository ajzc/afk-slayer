/** Style A core audio pack — lazy AudioContext, anti-spam, AFK bed. Fail soft if blocked. */
(function () {
  const BASE = 'audio/';
  const AUDIO_CACHE = '20260928feel1'; // feel1: + coin_land / gold_countup_tick / boss_death / crit_hit / ui_denied (Game Audio)
  const MAX_VOICES = 6;
  const BOLT_FIRE_GAP_MS = 45;
  const EMPTY_NUDGE_GAP_MS = 8000;
  const AFK_DUCK_DB = -6;
  const AFK_DUCK_MS = 400;
  // SFX back on (owner 2026-09-24, Game Audio v3 clean pack). Settings SFX slider 0 = off.
  let sfxEnabled = true;
  const PITCH_JITTER = 0.05; // ±2.5% playbackRate on pooled variants (keeps 0.6s bolts from sounding robotic)

  const MANIFEST = {
    bolt_fire_a: { path: 'sfx/bolt_fire_a.ogg', gain: 0.55, pool: 'bolt_fire' },
    bolt_fire_b: { path: 'sfx/bolt_fire_b.ogg', gain: 0.55, pool: 'bolt_fire' },
    bolt_fire_c: { path: 'sfx/bolt_fire_c.ogg', gain: 0.55, pool: 'bolt_fire' },
    bolt_hit_a: { path: 'sfx/bolt_hit_a.ogg', gain: 0.75, pool: 'bolt_hit' },
    bolt_hit_b: { path: 'sfx/bolt_hit_b.ogg', gain: 0.75, pool: 'bolt_hit' },
    bolt_hit_c: { path: 'sfx/bolt_hit_c.ogg', gain: 0.75, pool: 'bolt_hit' },
    briar_swing: { path: 'sfx/briar_swing.ogg', gain: 0.65 },
    quill_arrow_fire: { path: 'sfx/quill_arrow_fire.ogg', gain: 0.5 },
    quill_arrow_hit: { path: 'sfx/quill_arrow_hit.ogg', gain: 0.7 },
    mob_death_a: { path: 'sfx/mob_death_a.ogg', gain: 0.85, pool: 'mob_death' },
    mob_death_b: { path: 'sfx/mob_death_b.ogg', gain: 0.85, pool: 'mob_death' },
    task_complete: { path: 'sfx/task_complete.ogg', gain: 0.9, reward: true },
    monster_unlock: { path: 'sfx/monster_unlock.ogg', gain: 0.9, reward: true },
    signature_drop: { path: 'sfx/signature_drop.ogg', gain: 0.9, reward: true },
    chest_open: { path: 'sfx/chest_open.ogg', gain: 0.9, reward: true },
    upgrade_purchase: { path: 'sfx/upgrade_purchase.ogg', gain: 0.75, reward: true },
    empty_task_nudge: { path: 'ui/empty_task_nudge.ogg', gain: 0.25 },
    tab_switch: { path: 'ui/tab_switch.ogg', gain: 0.35 },
    intro_step_complete: { path: 'ui/intro_step_complete.ogg', gain: 0.55, reward: true }, // ducks bed (bible)
    // feel1 cues (Game Audio, audio/sfx/README.md)
    coin_land_a: { path: 'sfx/coin_land_a.ogg', gain: 0.4, pool: 'coin_land' },
    coin_land_b: { path: 'sfx/coin_land_b.ogg', gain: 0.4, pool: 'coin_land' },
    coin_land_c: { path: 'sfx/coin_land_c.ogg', gain: 0.4, pool: 'coin_land' },
    gold_countup_tick: { path: 'sfx/gold_countup_tick.ogg', gain: 0.15 },
    boss_death: { path: 'sfx/boss_death.ogg', gain: 1.0, duckDb: -8, duckMs: 1200 },
    crit_hit: { path: 'sfx/crit_hit.ogg', gain: 0.5 },
    ui_denied: { path: 'sfx/ui_denied.ogg', gain: 0.4 },
    afk_bed: { path: 'loops/afk_bed.ogg', gain: 0.3, loop: true },
  };

  const POOLS = {
    bolt_fire: ['bolt_fire_a', 'bolt_fire_b', 'bolt_fire_c'],
    bolt_hit: ['bolt_hit_a', 'bolt_hit_b', 'bolt_hit_c'],
    mob_death: ['mob_death_a', 'mob_death_b'],
    coin_land: ['coin_land_a', 'coin_land_b', 'coin_land_c'],
  };
  const NO_JITTER_POOLS = { coin_land: true }; // variants are already pitched D6/F6/G6
  const COIN_WINDOW_MS = 60;
  const COIN_MAX_VOICES = 3;
  const GOLD_TICK_GAP_MS = 80;
  const UI_DENIED_GAP_MS = 250;

  // Priority: higher = keep when voice budget full. Fire is lowest (drop first).
  const PRIORITY = {
    bolt_fire: 1,
    quill_arrow_fire: 1,
    bolt_hit: 3,
    quill_arrow_hit: 3,
    briar_swing: 3,
    mob_death: 5,
    task_complete: 6,
    monster_unlock: 6,
    signature_drop: 6,
    chest_open: 6,
    upgrade_purchase: 5,
    empty_task_nudge: 2,
    tab_switch: 2,
    intro_step_complete: 4,
    coin_land: 3,
    gold_countup_tick: 1,
    boss_death: 8,
    crit_hit: 4,
    ui_denied: 2,
  };

  let ctx = null;
  let masterGain = null;
  let sfxGain = null;
  let bedGain = null;
  let duckGain = null;
  let unlocked = false;
  let muted = false;
  let masterVol = 1; // 0..1
  let sfxVol = 1;
  let musicVol = 1;
  let buffers = {};
  let loading = {};
  let activeVoices = []; // { stop, priority, kind, startedAt }
  let poolIdx = { bolt_fire: 0, bolt_hit: 0, mob_death: 0, coin_land: 0 };
  let lastBoltFireAt = 0;
  let lastQuillFireAt = 0;
  let lastBoltHitAt = 0;
  let lastEmptyNudgeAt = 0;
  let lastCoinAt = -1e9;
  let lastGoldTickAt = -1e9;
  let lastDeniedAt = -1e9;
  let limiter = null;
  let bedSource = null;
  let bedWanted = false;
  let duckTimer = 0;
  let duckUntil = 0;
  const cueLog = []; // QA: cues actually started (read via CB_AUDIO.cueLog())

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : masterVol;
      sfxGain = ctx.createGain();
      sfxGain.gain.value = sfxVol;
      duckGain = ctx.createGain();
      duckGain.gain.value = 1;
      bedGain = ctx.createGain();
      bedGain.gain.value = MANIFEST.afk_bed.gain * musicVol;
      sfxGain.connect(masterGain);
      duckGain.connect(masterGain);
      bedGain.connect(duckGain);
      // feel1: master limiter on the output bus (catches stacked crit+hit+coin+boss peaks)
      try {
        limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 6;
        limiter.ratio.value = 12;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.15;
        masterGain.connect(limiter);
        limiter.connect(ctx.destination);
      } catch (e2) {
        limiter = null;
        masterGain.connect(ctx.destination);
      }
      return ctx;
    } catch (e) {
      return null;
    }
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    const c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') {
      c.resume().catch(function () { /* soft */ });
    }
    // Kick preload of core one-shots
    Object.keys(MANIFEST).forEach(function (id) {
      preload(id);
    });
    // If already on Hunt (or bed requested), start AFK bed after gesture unlock
    try {
      const hunt = document.getElementById('screen-hunt');
      if (hunt && hunt.classList.contains('active')) bedWanted = true;
    } catch (e) { /* soft */ }
    if (bedWanted) startBed();
  }

  function onFirstGesture() {
    unlock();
  }

  function bindGestures() {
    const once = function () {
      onFirstGesture();
      document.removeEventListener('pointerdown', once, true);
      document.removeEventListener('touchstart', once, true);
      document.removeEventListener('keydown', once, true);
    };
    document.addEventListener('pointerdown', once, true);
    document.addEventListener('touchstart', once, true);
    document.addEventListener('keydown', once, true);
  }

  function preload(id) {
    const meta = MANIFEST[id];
    if (!meta || buffers[id] || loading[id]) return loading[id] || Promise.resolve(null);
    const c = ensureCtx();
    if (!c) return Promise.resolve(null);
    loading[id] = fetch(BASE + meta.path + '?v=' + AUDIO_CACHE)
      .then(function (r) {
        if (!r.ok) throw new Error('audio ' + id + ' ' + r.status);
        return r.arrayBuffer();
      })
      .then(function (ab) {
        return c.decodeAudioData(ab.slice(0));
      })
      .then(function (buf) {
        buffers[id] = buf;
        delete loading[id];
        return buf;
      })
      .catch(function () {
        delete loading[id];
        return null;
      });
    return loading[id];
  }

  function resolveId(cue) {
    if (POOLS[cue]) {
      const list = POOLS[cue];
      const i = poolIdx[cue] || 0;
      poolIdx[cue] = (i + 1) % list.length;
      return list[i];
    }
    if (MANIFEST[cue]) return cue;
    return null;
  }

  function pruneVoices() {
    const now = performance.now();
    activeVoices = activeVoices.filter(function (v) {
      return v && !v.done && (now - v.startedAt) < 5000;
    });
  }

  function stealVoice(incomingPriority) {
    pruneVoices();
    if (activeVoices.length < MAX_VOICES) return true;
    // Drop oldest lowest-priority (prefer fire pool)
    activeVoices.sort(function (a, b) {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.startedAt - b.startedAt;
    });
    const victim = activeVoices[0];
    if (!victim || victim.priority > incomingPriority) return false;
    try { if (victim.stop) victim.stop(); } catch (e) { /* soft */ }
    victim.done = true;
    activeVoices.shift();
    return true;
  }

  function duckBed(db, ms) {
    if (!duckGain || !ctx) return;
    db = typeof db === 'number' ? db : AFK_DUCK_DB;
    ms = typeof ms === 'number' ? ms : AFK_DUCK_MS;
    // A longer/deeper duck already running wins (boss −8 dB 1.2s isn't cut short by a chime)
    const nowMs = performance.now();
    if (nowMs < duckUntil && ms <= (duckUntil - nowMs) && db >= (duckBed._db || 0)) return;
    const now = ctx.currentTime;
    const mult = Math.pow(10, db / 20);
    try {
      duckGain.gain.cancelScheduledValues(now);
      duckGain.gain.setValueAtTime(duckGain.gain.value, now);
      duckGain.gain.linearRampToValueAtTime(mult, now + 0.04);
      duckGain.gain.setValueAtTime(mult, now + Math.max(0.05, ms / 1000 - 0.25));
      duckGain.gain.linearRampToValueAtTime(1, now + ms / 1000);
    } catch (e) { /* soft */ }
    duckUntil = nowMs + ms;
    duckBed._db = db;
  }

  function play(cue, opts) {
    opts = opts || {};
    if (!sfxEnabled) return false; // Settings SFX slider at 0
    if (muted) return false;
    if (!unlocked) return false;
    const c = ensureCtx();
    if (!c) return false;
    if (c.state === 'suspended') c.resume().catch(function () {});

    // Anti-spam
    const now = performance.now();
    if (cue === 'bolt_fire') {
      if (now - lastBoltFireAt < BOLT_FIRE_GAP_MS) return false;
      lastBoltFireAt = now;
    }
    if (cue === 'quill_arrow_fire') {
      if (now - lastQuillFireAt < BOLT_FIRE_GAP_MS) return false;
      lastQuillFireAt = now;
    }
    if (cue === 'bolt_hit') {
      // Coalesce same-frame multi-hits
      if (now - lastBoltHitAt < 16) return false;
      lastBoltHitAt = now;
    }
    if (cue === 'quill_arrow_hit') {
      if (now - lastBoltHitAt < 12) return false;
      lastBoltHitAt = now;
    }
    if (cue === 'coin_land') {
      // feel1: several coins landing within ~60ms → play one, drop the rest; max 3 coin voices
      if (now - lastCoinAt < COIN_WINDOW_MS) return false;
      pruneVoices();
      if (activeVoices.filter(function (v) { return v.kind === 'coin_land'; }).length >= COIN_MAX_VOICES) return false;
      lastCoinAt = now;
    }
    if (cue === 'gold_countup_tick') {
      if (now - lastGoldTickAt < GOLD_TICK_GAP_MS) return false;
      lastGoldTickAt = now;
    }
    if (cue === 'ui_denied') {
      if (now - lastDeniedAt < UI_DENIED_GAP_MS) return false;
      lastDeniedAt = now;
    }

    const id = resolveId(cue);
    if (!id) return false;
    const meta = MANIFEST[id];
    if (!meta) return false;

    const pri = PRIORITY[cue] || PRIORITY[id] || 2;
    if (!stealVoice(pri)) return false;

    const buf = buffers[id];
    if (!buf) {
      preload(id);
      return false;
    }

    try {
      const src = c.createBufferSource();
      src.buffer = buf;
      {
        const baseRate = (opts.rate != null ? opts.rate : meta.rate) || 1;
        const jitter = (PITCH_JITTER > 0 && POOLS[cue] && !NO_JITTER_POOLS[cue]) ? (1 + (Math.random() - 0.5) * PITCH_JITTER) : 1;
        if (baseRate !== 1 || jitter !== 1) {
          try { src.playbackRate.value = baseRate * jitter; } catch (e) { /* soft */ }
        }
      }
      const g = c.createGain();
      g.gain.value = (opts.gain != null ? opts.gain : meta.gain) || 0.5;
      src.connect(g);
      g.connect(sfxGain);
      const voice = {
        stop: function () {
          try { src.stop(0); } catch (e) { /* soft */ }
          voice.done = true;
        },
        priority: pri,
        kind: cue,
        startedAt: now,
        done: false,
      };
      src.onended = function () { voice.done = true; };
      activeVoices.push(voice);
      src.start(0);
      if (meta.duckDb != null) duckBed(meta.duckDb, meta.duckMs);
      else if (meta.reward) duckBed();
      cueLog.push({ cue: cue, id: id, t: Math.round(now) });
      if (cueLog.length > 200) cueLog.shift();
      return true;
    } catch (e) {
      return false;
    }
  }

  function startBed() {
    bedWanted = true;
    if (!unlocked || muted) return;
    const c = ensureCtx();
    if (!c) return;
    if (bedSource) return;
    const id = 'afk_bed';
    const go = function (buf) {
      if (!buf || bedSource || !bedWanted) return;
      try {
        const src = c.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(bedGain);
        // Soft ~1.1s gain ramp kills seek/start click (Game Audio overnight)
        const target = MANIFEST.afk_bed.gain * musicVol;
        try {
          const now = c.currentTime;
          bedGain.gain.cancelScheduledValues(now);
          bedGain.gain.setValueAtTime(0, now);
          bedGain.gain.linearRampToValueAtTime(target, now + 1.1);
        } catch (e2) {
          bedGain.gain.value = target;
        }
        src.start(0);
        bedSource = src;
        src.onended = function () { bedSource = null; };
      } catch (e) { /* soft */ }
    };
    if (buffers[id]) go(buffers[id]);
    else preload(id).then(go);
  }

  function stopBed() {
    bedWanted = false;
    if (bedSource) {
      try { bedSource.stop(0); } catch (e) { /* soft */ }
      bedSource = null;
    }
  }

  function setHuntActive(on) {
    if (on) startBed();
    else stopBed();
  }

  function nudgeEmptyTask() {
    const now = performance.now();
    if (now - lastEmptyNudgeAt < EMPTY_NUDGE_GAP_MS) return;
    lastEmptyNudgeAt = now;
    play('empty_task_nudge');
  }

  function setMuted(on) {
    muted = !!on;
    syncGains();
    if (muted) {
      if (bedSource) {
        try { bedSource.stop(0); } catch (e) { /* soft */ }
        bedSource = null;
      }
    } else if (bedWanted) {
      startBed();
    }
  }

  function syncGains() {
    if (masterGain) masterGain.gain.value = muted ? 0 : masterVol;
    if (sfxGain) sfxGain.gain.value = sfxVol;
    if (bedGain) bedGain.gain.value = MANIFEST.afk_bed.gain * musicVol;
  }

  /** Apply persisted settings: vols 0–100, muted bool. */
  function applyPrefs(prefs) {
    prefs = prefs || {};
    if (typeof prefs.masterVol === 'number') masterVol = Math.max(0, Math.min(1, prefs.masterVol / 100));
    if (typeof prefs.sfxVol === 'number') sfxVol = Math.max(0, Math.min(1, prefs.sfxVol / 100));
    if (typeof prefs.musicVol === 'number') musicVol = Math.max(0, Math.min(1, prefs.musicVol / 100));
    if (typeof prefs.muted === 'boolean') muted = prefs.muted;
    // SFX on by default; Settings SFX slider 0 turns combat/UI cues off
    sfxEnabled = sfxVol > 0.001;
    syncGains();
    if (muted) {
      if (bedSource) {
        try { bedSource.stop(0); } catch (e) { /* soft */ }
        bedSource = null;
      }
    } else if (bedWanted) {
      startBed();
    }
  }

  /** Quiet UI tick for intro step complete (prefer over loud task_complete). */
  function introStep() {
    play('intro_step_complete');
  }

  /** Main nav tab change tick (soft UI bus). */
  function tabSwitch() {
    play('tab_switch');
  }

  bindGestures();

  window.CB_AUDIO = {
    get sfxEnabled() { return sfxEnabled; },
    setSfxEnabled: function (on) { sfxEnabled = !!on; },
    play,
    unlock,
    preload,
    setHuntActive,
    nudgeEmptyTask,
    setMuted,
    applyPrefs,
    introStep,
    tabSwitch,
    duckBed,
    /** Invalid / locked tap (250ms cooldown). */
    denied: function () { return play('ui_denied'); },
    hasLimiter: function () { return !!limiter; },
    cueLog: function () { return cueLog.slice(); },
    isUnlocked: function () { return unlocked; },
  };
})();
