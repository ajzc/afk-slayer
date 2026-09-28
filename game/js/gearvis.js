/**
 * iom7 — Player gear layers on the Hunt arena (design/visual-gear-ladder.md,
 * art/v3b/player_plain/README.md). Reads ONLY CB_STATE.equippedGear(state).
 *
 * Layer order back→front: cape | plain body (.cb-body) | legs | body armour | helm | weapon | glint.
 * Every real-art layer is a 6×142×156 strip drawn with the SAME frame index and box as the body
 * (all per-frame transforms are baked into the strips, so no extra offsets).
 *
 * Real art lookup (one table, GEAR_ART):
 *   - weapons: player_gear_weapon_{metal}_{idle|walk|attack}.png (shipped).
 *   - armour: player_gear_{legs|body|helm}_{metal}_{anim}.png — resolved from
 *     art/v3b/anim/sprites/gear_manifest.json (written by sync_deploy.sh from the files present),
 *     so dropping the strips in + deploying swaps them in automatically. Until then a tinted SVG
 *     placeholder (fitted to the plain body's idle + thrust poses) is drawn.
 * Anchor: plain strips put the feet at x=44 (walk 68) of 142; the actor box is shifted so the feet
 * sit on the avatar centre (HP bar / labels stay centred on the hunter).
 */
(function () {
  const FRAME_W = 142;
  const FRAME_H = 156;
  const ART_BASE = 'art/v3b/anim/sprites/';
  const METALS = ['bronze', 'iron', 'steel', 'mithril', 'adamant', 'rune', 'dragon'];

  const GEAR_ART = {};
  METALS.forEach((m) => { GEAR_ART['gear_' + m] = { prefix: 'player_gear_weapon_' + m }; });
  ['legs', 'body', 'helm'].forEach((slot) => {
    ['leather'].concat(METALS).forEach((m) => { GEAR_ART[slot + '_' + m] = 'auto'; });
  });
  GEAR_ART.helm_slayer = 'auto';
  GEAR_ART.cape_slayer = null;
  /* Edge glint (frames 2–4 of the attack). The gear-ladder brief has no tempered_edge hook, so it
   * stays off; set enabled:true (or give an upgrade id in `whenUpgrade`) to layer it on. */
  const GLINT = { prefix: 'player_gear_weapon_glint', enabled: false, whenUpgrade: null };

  let manifest = null; // Set of strip basenames present on the server
  function loadManifest() {
    if (!window.fetch) return;
    const v = (window.CB_DATA && window.CB_DATA.BUILD_ID) || 'iom7';
    fetch(ART_BASE + 'gear_manifest.json?v=' + v).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (!j || !Array.isArray(j.files)) return;
      manifest = new Set(j.files.map((f) => String(f).replace(/\.png$/, '')));
      document.querySelectorAll('.cb-player .cb-actor').forEach((a) => { a.dataset.gearKey = ''; });
    }).catch(() => { /* placeholders stay */ });
  }

  function prefixFor(id) {
    const a = GEAR_ART[id];
    if (!a) return null;
    if (a !== 'auto') return a.prefix || null;
    if (!manifest) return null;
    const pre = 'player_gear_' + id; // e.g. player_gear_legs_iron
    return (manifest.has(pre + '_idle') && manifest.has(pre + '_attack')) ? pre : null;
  }

  function animShort(anim) {
    if (/_attack$/.test(anim)) return 'attack';
    if (/_walk$/.test(anim)) return 'walk';
    return 'idle';
  }
  // Placeholder pose + sway per frame (from _meta_player_plain.json frames_spec)
  const POSE = { idle: 'iiiiii', walk: 'iiiiii', attack: 'iiaaai' };
  const PDX = { idle: [0, 0, 0, 0, 0, 0], walk: [0, 0, 0, 0, 0, 0], attack: [0, -2, 0, 3, -1.5, 0] };

  const METAL = {
    leather: { base: '#7a5230', hi: '#a8774a', lo: '#4a2f1a' },
    bronze: { base: '#b87333', hi: '#e0a060', lo: '#6e4018' },
    iron: { base: '#5c6068', hi: '#8a9098', lo: '#34373d' },
    steel: { base: '#b8bec6', hi: '#e8ecf0', lo: '#747a82' },
    mithril: { base: '#6c63b8', hi: '#a49ce8', lo: '#3a3478' },
    adamant: { base: '#3f7f4a', hi: '#6fb87a', lo: '#23492a' },
    rune: { base: '#3fb6c9', hi: '#8fe6f2', lo: '#1f6a78', trim: '#f0c020' },
    dragon: { base: '#b8322a', hi: '#ec6a58', lo: '#6a1612', trim: '#f0c020' },
    slayer: { base: '#2a2c30', hi: '#5a5e66', lo: '#101114' },
  };
  function metalOf(item) {
    if (!item) return null;
    if (item.id === 'helm_slayer') return 'slayer';
    if (item.metal && METAL[item.metal]) return item.metal;
    const m = String(item.id || '').split('_')[1];
    return METAL[m] ? m : 'iron';
  }
  function grad(id, c) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.hi}"/><stop offset="0.55" stop-color="${c.base}"/><stop offset="1" stop-color="${c.lo}"/></linearGradient>`;
  }
  const OUT = '#1a1426';
  const G = (o, extra) => `<g opacity="${o}" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"${extra || ''}>`;
  const poses = (i, a) => `<g class="gv-pi">${i}</g><g class="gv-pa">${a}</g>`;

  /* Shapes in plain-body frame px. Idle: head 25–63 × 10–48, tunic 22–62 × 50–100,
   * trousers 21–63 × 100–140 (feet 44). Thrust (attack f2): head ≈ (58,36), torso 30–70 × 56–108,
   * back leg (32,108)→(10,142), front leg (60,108)→(80,144), arms out to x≈94 at y≈76. */
  function legsSvg(item) {
    const m = metalOf(item); const c = METAL[m]; const f = 'url(#gv-legs)';
    const leather = m === 'leather';
    const o = leather ? 0.92 : 0.95;
    const knees = (pts) => leather ? '' : pts.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5.5" ry="4" fill="${c.hi}" opacity="0.9"/>`).join('');
    const trimI = c.trim ? `<path d="M24 106h16M44 106h17" stroke="${c.trim}" stroke-width="2"/>` : '';
    const trimA = c.trim ? `<path d="M33 111h14M53 111h14" stroke="${c.trim}" stroke-width="2"/>` : '';
    const idle = `<path d="M23 102 L41 102 L40 139 L25 139 Z" fill="${f}"/><path d="M43 102 L62 102 L61 139 L45 139 Z" fill="${f}"/>${knees([[32, 120], [53, 120]])}${trimI}`;
    const atk = `<path d="M32 107 L49 109 L23 142 L10 139 Z" fill="${f}"/><path d="M52 107 L68 107 L82 142 L69 144 Z" fill="${f}"/>${knees([[28, 125], [66, 125]])}${trimA}`;
    return `<defs>${grad('gv-legs', c)}</defs>${G(o)}${poses(idle, atk)}</g>`;
  }
  function bodySvg(item) {
    const m = metalOf(item); const c = METAL[m]; const f = 'url(#gv-body)';
    const leather = m === 'leather';
    const chain = item && item.id === 'body_dragon';
    const detail = (x0, y0, x1) => leather
      ? `<path d="M${(x0 + x1) / 2} ${y0 + 2} V${y0 + 42}" stroke="${c.lo}" stroke-width="1.3"/>`
      : (chain ? [10, 20, 30].map((d) => `<path d="M${x0 + 3} ${y0 + d}H${x1 - 3}" stroke="${c.lo}" stroke-width="1.1" stroke-dasharray="2 2"/>`).join('')
        : `<path d="M${x0 + 8} ${y0 + 9} Q${(x0 + x1) / 2} ${y0 + 5} ${x1 - 8} ${y0 + 9}" fill="none" stroke="${c.hi}" stroke-width="1.5"/>`);
    const pads = (a, b) => leather ? '' : `<circle cx="${a[0]}" cy="${a[1]}" r="6.5" fill="${f}"/><circle cx="${b[0]}" cy="${b[1]}" r="6.5" fill="${f}"/>`;
    const trim = (d) => c.trim ? `<path d="${d}" fill="none" stroke="${c.trim}" stroke-width="2"/>` : '';
    const idle = `<path d="M25 54 Q42 48 59 54 L60 96 Q42 101 24 96 Z" fill="${f}"/>${detail(25, 52, 59)}${pads([25, 57], [58, 57])}${trim('M26 55 Q42 50 58 55')}`;
    const atk = `<path d="M35 59 Q51 54 67 59 L67 104 Q49 110 31 104 Z" fill="${f}"/>${detail(35, 57, 67)}${pads([37, 61], [66, 62])}${trim('M36 60 Q51 55 66 60')}`;
    return `<defs>${grad('gv-body', c)}</defs>${G(leather ? 0.92 : 0.95)}${poses(idle, atk)}</g>`;
  }
  function helmSvg(item) {
    const m = metalOf(item); const c = METAL[m]; const f = 'url(#gv-helm)';
    const id = (item && item.id) || '';
    // Hunter faces right → face/visor on the right side of the head
    const one = (cx, top, faceY) => {
      const l = cx - 20; const r = cx + 20;
      if (m === 'leather') return `<path d="M${l} ${top + 26} Q${l} ${top} ${cx} ${top - 1} Q${r} ${top} ${r - 1} ${top + 18} L${r - 6} ${top + 16} Q${cx} ${top + 10} ${l + 4} ${top + 28} Z" fill="${f}"/>`;
      if (id === 'helm_slayer') {
        return `<path d="M${l} ${top + 30} Q${l} ${top - 1} ${cx} ${top - 2} Q${r + 2} ${top} ${r + 2} ${top + 30} L${r} ${top + 40} Q${cx + 4} ${top + 44} ${l + 6} ${top + 38} Z" fill="${f}"/>
          <path d="M${cx + 6} ${faceY} L${r} ${faceY - 1}" stroke="#ff4a3a" stroke-width="2.6" stroke-linecap="round"/>`;
      }
      const full = /mithril|adamant|rune/.test(id);
      const fin = id === 'helm_dragon' ? `<path d="M${cx - 2} ${top} Q${cx - 10} ${top - 12} ${cx - 22} ${top - 6} Q${cx - 12} ${top - 2} ${cx - 10} ${top + 6} Z" fill="${c.hi}"/>` : '';
      const visor = full ? `<path d="M${cx + 2} ${top + 18} L${r + 2} ${top + 18} L${r + 1} ${top + 34} L${cx + 4} ${top + 34} Z" fill="${f}"/><path d="M${cx + 5} ${faceY}H${r}" stroke="${OUT}" stroke-width="2"/>` : '';
      const trim = c.trim ? `<path d="M${l + 1} ${top + 20} Q${cx} ${top + 13} ${r - 1} ${top + 20}" fill="none" stroke="${c.trim}" stroke-width="2"/>` : '';
      return `${fin}<path d="M${l} ${top + 24} Q${l} ${top} ${cx} ${top - 1} Q${r} ${top} ${r} ${top + 24} Q${cx} ${top + 17} ${l} ${top + 24} Z" fill="${f}"/>
        <path d="M${cx} ${top + 1} V${top + 18}" stroke="${c.hi}" stroke-width="1.3"/>${visor}${trim}`;
    };
    return `<defs>${grad('gv-helm', c)}</defs>${G(0.96)}${poses(one(45, 9, 32), one(58, 19, 41))}</g>`;
  }
  function capeSvg(item, trim) {
    if (!item) return '';
    const stripes = (pts) => {
      let s = '';
      for (let i = 0; i < Math.min(3, trim | 0); i++) s += `<path d="${pts(i)}" fill="none" stroke="#f0c020" stroke-width="2"/>`;
      return s;
    };
    // Hangs from the shoulders, flaring behind (left of) the right-facing hunter
    const idle = `<path d="M28 52 Q44 46 60 52 Q58 96 54 140 Q30 146 10 136 Q18 92 28 52 Z" fill="#26222e"/>
      <path d="M30 58 Q22 98 16 132" fill="none" stroke="#3a3446" stroke-width="1.3"/>${stripes((i) => `M${12 + i * 2} ${132 - i * 5} Q32 ${141 - i * 5} ${53 - i} ${136 - i * 5}`)}`;
    const atk = `<path d="M38 58 Q52 52 64 58 Q56 98 44 138 Q20 142 2 128 Q18 90 38 58 Z" fill="#26222e"/>
      <path d="M40 64 Q26 98 10 126" fill="none" stroke="#3a3446" stroke-width="1.3"/>${stripes((i) => `M${4 + i * 2} ${125 - i * 5} Q24 ${137 - i * 5} ${43 - i} ${134 - i * 5}`)}`;
    return `${G(1)}${poses(idle, atk)}</g>`;
  }

  function layerHtml(slot, item, extra) {
    if (!item) return '';
    const pre = slot === 'cape' ? prefixFor(item.id) : prefixFor(item.id);
    if (pre) return `<div class="gv-layer gv-${slot} gv-art" data-slot="${slot}" data-id="${item.id}" data-prefix="${pre}"></div>`;
    if (slot === 'weapon') return ''; // every ladder weapon has real art
    let inner = '';
    if (slot === 'legs') inner = legsSvg(item);
    else if (slot === 'body') inner = bodySvg(item);
    else if (slot === 'helm') inner = helmSvg(item);
    else if (slot === 'cape') inner = capeSvg(item, extra);
    return `<svg class="gv-layer gv-${slot} gv-ph" data-slot="${slot}" data-id="${item.id}" viewBox="0 0 ${FRAME_W} ${FRAME_H}" preserveAspectRatio="none" aria-hidden="true">${inner}</svg>`;
  }
  function glintOn(state) {
    if (!GLINT.enabled) return false;
    if (!GLINT.whenUpgrade) return true;
    return !!(window.CB_STATE && window.CB_STATE.getUpgradeLevel(state, GLINT.whenUpgrade) >= 1);
  }
  function glintHtml() {
    return `<div class="gv-layer gv-glint gv-art" data-slot="glint" data-id="glint" data-prefix="${GLINT.prefix}"></div>`;
  }

  function gearKey(g, glint) {
    return [g.weapon && g.weapon.id, g.legs && g.legs.id, g.body && g.body.id,
      g.helm && g.helm.id, g.cape && g.cape.id, g.capeTrim, glint ? 'g' : ''].join('|');
  }
  function ensureContainers(actor) {
    let back = actor.querySelector(':scope > .gv-back');
    let front = actor.querySelector(':scope > .gv-front');
    if (!back) {
      back = document.createElement('div');
      back.className = 'gv-wrap gv-back';
      actor.insertBefore(back, actor.firstChild);
    }
    if (!front) {
      front = document.createElement('div');
      front.className = 'gv-wrap gv-front';
      actor.appendChild(front);
    }
    return { back, front };
  }

  const lastFrameSig = new WeakMap();

  /** Build/refresh layers from equippedGear(state). Cheap when unchanged. */
  function sync(playerEl, state) {
    if (!playerEl || !state || !window.CB_STATE || !window.CB_STATE.equippedGear) return;
    const actor = playerEl.querySelector('.cb-actor');
    if (!actor) return;
    const g = window.CB_STATE.equippedGear(state);
    const glint = glintOn(state);
    const key = gearKey(g, glint) + (manifest ? '|m' : '');
    if (actor.dataset.gearKey === key) return;
    const hadKey = !!actor.dataset.gearKey;
    const prevIds = {};
    actor.querySelectorAll('.gv-layer').forEach((el) => { prevIds[el.dataset.slot] = el.dataset.id; });
    actor.dataset.gearKey = key;
    const { back, front } = ensureContainers(actor);
    back.innerHTML = layerHtml('cape', g.cape, g.capeTrim);
    front.innerHTML = layerHtml('legs', g.legs) + layerHtml('body', g.body)
      + layerHtml('helm', g.helm) + layerHtml('weapon', g.weapon) + (glint ? glintHtml() : '');
    if (hadKey) {
      actor.querySelectorAll('.gv-layer').forEach((el) => {
        if (prevIds[el.dataset.slot] !== el.dataset.id) el.classList.add('gv-pop');
      });
    }
    playerEl.classList.toggle('gear-plain', !g.legs && !g.body && !g.helm && !g.cape);
    playerEl.dataset.gear = key;
    lastFrameSig.delete(actor);
  }

  /** Per frame: anchor shift, placeholder pose/sway, real-art strip frames (same index as body). */
  function frame(playerEl) {
    if (!playerEl) return;
    const actor = playerEl.querySelector('.cb-actor');
    const body = actor && actor.querySelector('.cb-body');
    if (!body) return;
    const anim = body.dataset.anim || '';
    const f = Number(body.dataset.frame || 0) | 0;
    const w = parseFloat(body.style.width) || body.offsetWidth || 72;
    const h = parseFloat(body.style.height) || body.offsetHeight || 80;
    const sig = anim + ':' + f + ':' + w.toFixed(1) + ':' + (actor.dataset.gearKey || '');
    if (lastFrameSig.get(actor) === sig) return;
    lastFrameSig.set(actor, sig);
    const sc = w / FRAME_W;
    const meta = window.CB_SPRITES && window.CB_SPRITES.META && window.CB_SPRITES.META[anim];
    const feet = meta && meta.feet_x != null ? meta.feet_x : FRAME_W / 2;
    actor.style.setProperty('--p-ax', ((FRAME_W / 2 - feet) * sc).toFixed(2) + 'px');
    const a = animShort(anim);
    const pose = (POSE[a] || POSE.idle)[f] || 'i';
    const pdx = ((PDX[a] || PDX.idle)[f] || 0) * sc;
    const frames = (meta && meta.frames) || 6;
    actor.querySelectorAll(':scope > .gv-wrap').forEach((wrap) => {
      wrap.style.width = w + 'px';
      wrap.style.height = h + 'px';
      wrap.dataset.pose = pose;
      wrap.style.setProperty('--gv-dx', pdx.toFixed(2) + 'px');
    });
    actor.querySelectorAll('.gv-art').forEach((el) => {
      const src = ART_BASE + el.dataset.prefix + '_' + a + '.png';
      if (el.dataset.src !== src) {
        el.dataset.src = src;
        el.style.backgroundImage = "url('" + src + "')";
      }
      el.style.backgroundSize = (w * frames).toFixed(2) + 'px ' + h + 'px';
      el.style.backgroundPosition = (-f * w).toFixed(2) + 'px 0';
    });
  }

  function tick(playerEl, state) {
    try { sync(playerEl, state); frame(playerEl); } catch (e) { /* soft */ }
  }

  /** Blade tip (frame px) for the current body frame — same for every ladder metal (measured). */
  const TIP = {
    idle: [[58, 130], [58, 130], [58, 130], [58, 130], [58, 130], [58, 130]],
    walk: [[58, 130], [58, 130], [58, 130], [58, 130], [58, 130], [58, 130]],
    attack: [[58, 130], [55, 130], [135, 68], [139, 68], [133, 68], [58, 130]],
  };
  function bladeTip(anim, f) {
    const t = TIP[animShort(anim || '')] || TIP.idle;
    return t[(f | 0) % 6];
  }

  loadManifest();
  window.CB_GEARVIS = { GEAR_ART, GLINT, sync, frame, tick, gearKey, bladeTip, prefixFor, FRAME_W, FRAME_H };
})();
