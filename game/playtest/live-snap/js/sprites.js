/** Option C anim pack (art/v3b/anim) — strip blit helpers. Fail soft if images missing. */
(function () {
  // Alex: square matte/floor scraps — disabled until Game Artist CLEAN CUTOUTS READY
  const ENABLED = true; // clean cutouts READY
  const BASE = 'art/v3b/anim/sprites/';
  const DISPLAY_H = 80; // ~70–90px tall

  // Pilot cast + Level 1 bears. Undercroft (crawling_hands/spectre/mage/overseer) archived — not in META.
  // Frame sizes from art/v3b/anim/_meta.json. content_h scales display ladder (adult=100 → DISPLAY_H).
  const META = {
    player_idle: { frame_w: 142, frame_h: 156, frames: 6, fps: 7, loop: true },
    player_attack: { frame_w: 142, frame_h: 156, frames: 6, fps: 11, loop: false },
    briar_idle: { frame_w: 185, frame_h: 156, frames: 6, fps: 7, loop: true },
    briar_walk: { frame_w: 185, frame_h: 156, frames: 8, fps: 9, loop: true },
    briar_attack: { frame_w: 185, frame_h: 156, frames: 6, fps: 11, loop: false },
    quill_idle: { frame_w: 140, frame_h: 156, frames: 6, fps: 7, loop: true },
    quill_shoot: { frame_w: 140, frame_h: 156, frames: 6, fps: 11, loop: false },
    quill_turret: { frame_w: 119, frame_h: 156, frames: 1, fps: 1, loop: true },
    bristle_cub_idle: { frame_w: 115, frame_h: 156, frames: 6, fps: 7, loop: true, content_h: 72 },
    bristle_cub_walk: { frame_w: 115, frame_h: 156, frames: 6, fps: 9, loop: true, content_h: 72 },
    bristle_cub_attack: { frame_w: 115, frame_h: 156, frames: 6, fps: 11, loop: false, content_h: 72 },
    thornpelt_bear_idle: { frame_w: 119, frame_h: 156, frames: 6, fps: 7, loop: true, content_h: 100 },
    thornpelt_bear_walk: { frame_w: 119, frame_h: 156, frames: 6, fps: 9, loop: true, content_h: 100 },
    thornpelt_bear_attack: { frame_w: 119, frame_h: 156, frames: 6, fps: 11, loop: false, content_h: 100 },
    dire_thornpelt_idle: { frame_w: 142, frame_h: 156, frames: 6, fps: 7, loop: true, content_h: 124 },
    dire_thornpelt_walk: { frame_w: 142, frame_h: 156, frames: 6, fps: 9, loop: true, content_h: 124 },
    dire_thornpelt_attack: { frame_w: 142, frame_h: 156, frames: 6, fps: 11, loop: false, content_h: 124 },
    elder_thornpelt_idle: { frame_w: 170, frame_h: 156, frames: 6, fps: 6, loop: true, content_h: 148 },
    elder_thornpelt_attack: { frame_w: 170, frame_h: 156, frames: 6, fps: 10, loop: false, content_h: 148 },
    arrow: { frame_w: 63, frame_h: 44, frames: 1, fps: 1, loop: true },
    bolt: { frame_w: 78, frame_h: 43, frames: 1, fps: 1, loop: true },
  };

  function displayHFor(meta) {
    if (meta && meta.content_h) {
      // Adult content_h=100 → DISPLAY_H; cub/dire/boss ladder from ratios
      return Math.max(40, Math.round(DISPLAY_H * (meta.content_h / 100)));
    }
    return DISPLAY_H;
  }

  function scaleFor(meta) {
    return displayHFor(meta) / meta.frame_h;
  }

  function displayFrameW(meta) {
    return meta.frame_w * scaleFor(meta);
  }

  function stripUrl(key) {
    return BASE + key + '.png';
  }

  /** Build a single-cell sprite div. data-anim = META key. */
  function spriteHtml(key, extraClass) {
    const meta = META[key];
    if (!meta) return '';
    const sc = scaleFor(meta);
    const dw = displayFrameW(meta);
    const dh = displayHFor(meta);
    const stripW = meta.frame_w * meta.frames * sc;
    const stripH = meta.frame_h * sc;
    const cls = 'cb-sprite' + (extraClass ? ' ' + extraClass : '');
    return `<div class="${cls}" data-anim="${key}" data-frame="0"
      style="--sw:${dw.toFixed(2)}px;--sh:${dh}px;--strip-w:${stripW.toFixed(2)}px;--strip-h:${stripH.toFixed(2)}px;width:${dw.toFixed(2)}px;height:${dh}px;background-image:url('${stripUrl(key)}');background-size:${stripW.toFixed(2)}px ${stripH.toFixed(2)}px;background-position:0 0;"></div>`;
  }

  /** Player avatar markup (sprite only). */
  function playerHtml() {
    return `<div class="cb-actor cb-player" data-actor="player">
      ${spriteHtml('player_idle', 'cb-body')}
    </div>`;
  }

  /** Hunter markup. Quill = turret underlay + archer overlay. */
  function hunterHtml(hunterId) {
    if (hunterId === 'quill') {
      const t = META.quill_turret;
      const sc = scaleFor(t);
      const tw = t.frame_w * sc;
      const th = displayHFor(t);
      return `<div class="cb-actor cb-quill" data-actor="quill">
        <div class="cb-turret" style="width:${tw.toFixed(2)}px;height:${th}px;background-image:url('${stripUrl('quill_turret')}');background-size:${tw.toFixed(2)}px ${th}px;background-repeat:no-repeat;"></div>
        <div class="cb-quill-archer">
          ${spriteHtml('quill_idle', 'cb-body')}
        </div>
      </div>`;
    }
    if (hunterId === 'briar') {
      return `<div class="cb-actor cb-briar" data-actor="briar">${spriteHtml('briar_idle', 'cb-body')}</div>`;
    }
    // Moss / Ember: no Option C strips yet — caller falls back to CSS fig
    return null;
  }

  /**
   * Level 1 bears live in META. Wolves/spiders (ashfang_*, silkling_*, …) stay geometric
   * until packs land. Undercroft crawler/spectre/mage/overseer archived — not mapped.
   * Boss elder_thornpelt: idle + attack only (no walk strip).
   */
  const MOB_SPRITE_PREFIX = {
    bristle_cub: 'bristle_cub',
    thornpelt_bear: 'thornpelt_bear',
    dire_thornpelt: 'dire_thornpelt',
    elder_thornpelt: 'elder_thornpelt',
    ashfang_pup: 'ashfang_pup',
    ashfang_wolf: 'ashfang_wolf',
    dire_ashfang: 'dire_ashfang',
    ashfang_alpha: 'ashfang_alpha',
    silkling: 'silkling',
    webfen_widow: 'webfen_widow',
    brood_matron: 'brood_matron',
    nightweave: 'nightweave',
  };

  function mobHasStrip(visual) {
    const prefix = MOB_SPRITE_PREFIX[visual];
    if (!prefix) return false;
    // PNG drop-in: META must include prefix_idle (and walk/attack). Until then → geometric.
    return !!(META[prefix + '_idle']);
  }

  function mobHtml(visual) {
    const prefix = MOB_SPRITE_PREFIX[visual];
    if (!prefix || !META[prefix + '_idle']) return null;
    return `<div class="cb-actor cb-mob" data-actor="${prefix}">${spriteHtml(prefix + '_idle', 'cb-body')}</div>`;
  }

  function setFrame(el, frame) {
    if (!el) return;
    const key = el.dataset.anim;
    const meta = META[key];
    if (!meta) return;
    const f = ((frame % meta.frames) + meta.frames) % meta.frames;
    el.dataset.frame = String(f);
    const dw = displayFrameW(meta);
    el.style.backgroundPosition = (-f * dw).toFixed(2) + 'px 0';
  }

  function setAnim(actorRoot, animName) {
    if (!actorRoot) return;
    const body = actorRoot.querySelector('.cb-body') || actorRoot;
    const meta = META[animName];
    if (!meta || !body) return;
    if (body.dataset.anim === animName) return; // don't restart same strip (preserves oneshot)
    const sc = scaleFor(meta);
    const dw = displayFrameW(meta);
    const dh = displayHFor(meta);
    const stripW = meta.frame_w * meta.frames * sc;
    const stripH = meta.frame_h * sc;
    body.dataset.anim = animName;
    body.dataset.frame = '0';
    body.dataset.accum = '0';
    body.dataset.oneshot = meta.loop ? '0' : '1';
    body.dataset.returnIdle = meta.loop ? '' : idleKeyFor(animName);
    body.style.width = dw.toFixed(2) + 'px';
    body.style.height = dh + 'px';
    body.style.setProperty('--sw', dw.toFixed(2) + 'px');
    body.style.setProperty('--sh', dh + 'px');
    body.style.backgroundImage = "url('" + stripUrl(animName) + "')";
    body.style.backgroundSize = stripW.toFixed(2) + 'px ' + stripH.toFixed(2) + 'px';
    body.style.backgroundPosition = '0 0';
  }

  function idleKeyFor(animName) {
    if (animName.indexOf('player_') === 0) return 'player_idle';
    if (animName.indexOf('briar_') === 0) return 'briar_idle';
    if (animName.indexOf('quill_') === 0) return 'quill_idle';
    // Family strips: prefix_attack → prefix_idle
    const m = animName && animName.match(/^(.*)_(attack|walk|shoot)$/);
    if (m && META[m[1] + '_idle']) return m[1] + '_idle';
    if (animName.indexOf('crawling_hands_') === 0) return 'crawling_hands_idle'; // archived
    return animName;
  }

  /** Advance all .cb-sprite under root by dtMs. */
  function tick(root, dtMs) {
    if (!root) return;
    const sprites = root.querySelectorAll('.cb-sprite');
    for (let i = 0; i < sprites.length; i++) {
      const el = sprites[i];
      const key = el.dataset.anim;
      const meta = META[key];
      if (!meta || meta.frames <= 1) continue;
      const fps = meta.fps || 8;
      let accum = Number(el.dataset.accum || 0) + dtMs;
      const frameMs = 1000 / fps;
      let frame = Number(el.dataset.frame || 0);
      while (accum >= frameMs) {
        accum -= frameMs;
        frame += 1;
        if (frame >= meta.frames) {
          if (el.dataset.oneshot === '1') {
            const back = el.dataset.returnIdle || idleKeyFor(key);
            // Switch back to idle strip
            const actor = el.closest('.cb-actor') || el.parentElement;
            if (actor) setAnim(actor, back);
            else {
              frame = meta.frames - 1;
            }
            accum = 0;
            break;
          }
          frame = 0;
        }
      }
      el.dataset.accum = String(accum);
      if (el.dataset.anim === key) setFrame(el, frame);
    }
  }

  function oneshotPlaying(actor) {
    const body = actor && actor.querySelector('.cb-body');
    return !!(body && body.dataset.oneshot === '1');
  }

  /** Map hunter class states → anim keys. */
  function syncHunterAnim(droneEl, hunterId) {
    if (!droneEl) return;
    const actor = droneEl.querySelector('.cb-actor');
    if (!actor) return;
    if (oneshotPlaying(actor)) return; // finish attack/shoot before idle/walk
    if (hunterId === 'quill') {
      if (droneEl.classList.contains('firing') || droneEl.classList.contains('swinging')) {
        setAnim(actor, 'quill_shoot');
      } else {
        setAnim(actor, 'quill_idle');
      }
      return;
    }
    if (hunterId === 'briar') {
      if (droneEl.classList.contains('swinging')) setAnim(actor, 'briar_attack');
      else if (droneEl.classList.contains('walking')) setAnim(actor, 'briar_walk');
      else setAnim(actor, 'briar_idle');
    }
  }

  function syncPlayerAnim(playerEl, isFiring) {
    if (!playerEl) return;
    const actor = playerEl.querySelector('.cb-actor') || playerEl;
    if (oneshotPlaying(actor)) {
      // Allow re-trigger attack while holding after oneshot ends only
      if (!isFiring) return;
      // if still oneshot attack, keep it
      return;
    }
    if (isFiring) setAnim(actor, 'player_attack');
    else setAnim(actor, 'player_idle');
  }

  function syncMobAnim(mobEl, state) {
    if (!mobEl) return;
    const actor = mobEl.querySelector('.cb-actor');
    if (!actor) return;
    const prefix = actor.dataset.actor;
    if (!prefix || !META[prefix + '_idle']) return;
    if (oneshotPlaying(actor) && state !== 'attack') return;
    if (state === 'attack' || mobEl.classList.contains('attacking') || mobEl.classList.contains('telegraph')) {
      if (META[prefix + '_attack']) setAnim(actor, prefix + '_attack');
    } else if (state === 'walk' || mobEl.classList.contains('walking-in') || mobEl.classList.contains('entering')) {
      if (META[prefix + '_walk']) setAnim(actor, prefix + '_walk');
      else setAnim(actor, prefix + '_idle');
    } else {
      setAnim(actor, prefix + '_idle');
    }
  }

  function applyProjSprite(el, kind) {
    if (!el) return;
    const key = kind === 'arrow' ? 'arrow' : (kind === 'bolt' || kind === 'player-bolt' ? 'bolt' : null);
    if (!key || !META[key]) return;
    const meta = META[key];
    const sc = 0.55; // projectiles smaller
    const w = meta.frame_w * sc;
    const h = meta.frame_h * sc;
    el.classList.add('cb-proj');
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.backgroundImage = "url('" + stripUrl(key) + "')";
    el.style.backgroundSize = w + 'px ' + h + 'px';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.borderRadius = '0';
    el.style.boxShadow = 'none';
  }

  window.CB_SPRITES = {
    ENABLED,
    META,
    DISPLAY_H,
    spriteHtml,
    playerHtml: ENABLED ? playerHtml : null,
    hunterHtml: ENABLED ? hunterHtml : function () { return null; },
    mobHtml: ENABLED ? mobHtml : function () { return null; },
    setAnim,
    setFrame,
    tick: ENABLED ? tick : function () {},
    syncHunterAnim: ENABLED ? syncHunterAnim : function () {},
    syncPlayerAnim: ENABLED ? syncPlayerAnim : function () {},
    syncMobAnim: ENABLED ? syncMobAnim : function () {},
    applyProjSprite: ENABLED ? applyProjSprite : function () {},
    hasHunter: function (id) { return ENABLED && (id === 'briar' || id === 'quill'); },
    hasMob: function (visual) { return ENABLED && mobHasStrip(visual); },
    hasPlayer: function () { return !!ENABLED; },
  };
})();
