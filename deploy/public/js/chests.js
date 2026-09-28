/** Dual chest tubes — charge, claim, overlay sync */
(function () {
  const D = () => window.CB_DATA;

  function ensure(state) {
    if (!state.chests) {
      state.chests = {
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
      };
    }
    const c = state.chests;
    if (!c.permanentBonuses) {
      c.permanentBonuses = {
        idlePower: 0, lootLuck: 0, critChance: 0,
        offlineCapMin: 0, foodEff: 0, chestSpeed: 0,
      };
    }
    ['idlePower', 'lootLuck', 'critChance', 'offlineCapMin', 'foodEff', 'chestSpeed'].forEach(k => {
      if (typeof c.permanentBonuses[k] !== 'number') c.permanentBonuses[k] = 0;
    });
    if (typeof c.permanentCharge !== 'number') c.permanentCharge = 0;
    if (typeof c.boostCharge !== 'number') c.boostCharge = 0;
    return c;
  }

  function fillSpeedMult(state) {
    const c = ensure(state);
    // Stacking: permanent claims + chestSpeed bonus from legendaries
    const claimBoost = Math.min(0.5, (c.permanentClaims || 0) * 0.015);
    const speed = c.permanentBonuses.chestSpeed || 0;
    return 1 + claimBoost + speed;
  }

  /** Charge both tubes during hunting / offline idle windows. Mutates state. */
  function charge(state, elapsedMs) {
    if (!elapsedMs || elapsedMs <= 0) return;
    const c = ensure(state);
    const cfg = D().chests;
    if (!cfg) return;
    const speed = fillSpeedMult(state);
    const holding = !!state.holding;

    if (!c.permanentReady) {
      const beam = holding ? (cfg.permanent.beamBonus || 1) : 1;
      const rate = speed * beam;
      c.permanentCharge = Math.min(1, c.permanentCharge + (elapsedMs / cfg.permanent.fillMs) * rate);
      if (c.permanentCharge >= 1) {
        c.permanentCharge = 1;
        c.permanentReady = true;
      }
    }

    if (!c.boostReady) {
      const beam = holding ? (cfg.boost.beamBonus || 1) : 1;
      const rate = speed * beam;
      c.boostCharge = Math.min(1, c.boostCharge + (elapsedMs / cfg.boost.fillMs) * rate);
      if (c.boostCharge >= 1) {
        c.boostCharge = 1;
        c.boostReady = true;
      }
    }

    // Expire timed boosts
    tickBoost(state);
  }

  function tickBoost(state) {
    const c = ensure(state);
    const ab = c.activeBoost;
    if (!ab) return null;
    if (ab.endsAt && Date.now() >= ab.endsAt) {
      c.activeBoost = null;
      return null;
    }
    return ab;
  }

  function getActiveBoost(state) {
    return tickBoost(state);
  }

  function pickWeighted(rarities) {
    const total = rarities.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * total;
    for (const r of rarities) {
      roll -= r.weight;
      if (roll <= 0) return r;
    }
    return rarities[rarities.length - 1];
  }

  function rollStat(pool) {
    const v = pool.min + Math.random() * (pool.max - pool.min);
    if (pool.flat) return Math.round(v * 10) / 10;
    return Math.round(v * 10000) / 10000;
  }

  function formatBonus(stat, value, flat) {
    if (stat === 'offlineCapMin' || flat) return '+' + value + ' min';
    return '+' + (Math.round(value * 1000) / 10) + '%';
  }

  /** Claim permanent chest. Returns result object or { ok:false }. */
  function claimPermanent(state) {
    const c = ensure(state);
    if (!c.permanentReady) return { ok: false, reason: 'Not ready' };
    const cfg = D().chests.permanent;
    const rarity = pickWeighted(cfg.rarities);
    const pool = rarity.pools[Math.floor(Math.random() * rarity.pools.length)];
    const value = rollStat(pool);

    c.permanentBonuses[pool.stat] = (c.permanentBonuses[pool.stat] || 0) + value;
    c.permanentReady = false;
    c.permanentCharge = 0;
    c.permanentClaims = (c.permanentClaims || 0) + 1;

    const result = {
      ok: true,
      kind: 'permanent',
      rarity: rarity.id,
      rarityLabel: rarity.label,
      color: rarity.color,
      stat: pool.stat,
      label: pool.label,
      value,
      flat: !!pool.flat,
      text: formatBonus(pool.stat, value, pool.flat) + ' ' + pool.label,
      emoji: cfg.emoji,
    };
    c.lastPermanent = {
      rarity: rarity.id,
      label: pool.label,
      value,
      at: Date.now(),
    };
    return result;
  }

  /** Claim boost chest — auto-applies one random boost. */
  function claimBoost(state) {
    const c = ensure(state);
    if (!c.boostReady) return { ok: false, reason: 'Not ready' };
    const catalog = D().chests.boost.catalog;
    const pick = catalog[Math.floor(Math.random() * catalog.length)];

    c.boostReady = false;
    c.boostCharge = 0;
    c.boostClaims = (c.boostClaims || 0) + 1;

    let applied = null;
    if (pick.foodGain) {
      const b = window.CB_STATE.getBonuses(state);
      state.food = Math.min(b.foodCap, state.food + pick.foodGain);
      applied = {
        id: pick.id,
        name: pick.name,
        emoji: pick.emoji,
        desc: pick.desc,
        durationMs: 0,
        foodGain: pick.foodGain,
      };
      // Instant Feast — leave any timed boost running
    } else {
      applied = {
        id: pick.id,
        name: pick.name,
        emoji: pick.emoji,
        desc: pick.desc,
        durationMs: pick.durationMs || 0,
        endsAt: pick.durationMs ? Date.now() + pick.durationMs : 0,
        killMult: pick.killMult || 1,
        goldMult: pick.goldMult || 1,
        critBonus: pick.critBonus || 0,
        visualBomb: !!pick.visualBomb,
        offlineCapBonus: pick.offlineCapBonus || 0,
      };
      c.activeBoost = applied;
    }

    const result = {
      ok: true,
      kind: 'boost',
      boost: applied,
      color: '#2dd4bf',
      emoji: pick.emoji,
      text: pick.desc,
    };
    c.lastBoost = { id: pick.id, name: pick.name, at: Date.now() };
    return result;
  }

  /** QA helper — fill both tubes instantly. */
  function fillChests(state) {
    const c = ensure(state);
    c.permanentCharge = 1;
    c.permanentReady = true;
    c.boostCharge = 1;
    c.boostReady = true;
    return c;
  }

  function overlayHtml() {
    return `
      <div class="chest-rails" id="chest-rails" aria-label="Chest charge bars">
        <button type="button" class="chest-tube permanent" id="chest-perm" data-action="claim-chest" data-id="permanent"
          title="Permanent Relic Casket — fills while you hunt. Tap when full for a lasting power upgrade (common→legendary RNG).">
          <div class="chest-tube-glass">
            <div class="chest-fill" id="chest-perm-fill" style="height:0%"></div>
            <div class="chest-bubbles"></div>
          </div>
          <span class="chest-ico">💜</span>
          <span class="chest-kind">PERM</span>
          <span class="chest-ready-tag">TAP</span>
        </button>
        <button type="button" class="chest-tube boost" id="chest-boost" data-action="claim-chest" data-id="boost"
          title="Loot Casket — fills while you hunt. Tap when full for a short timed boost (frenzy, luck, etc.).">
          <div class="chest-tube-glass">
            <div class="chest-fill" id="chest-boost-fill" style="height:0%"></div>
            <div class="chest-bubbles"></div>
          </div>
          <span class="chest-ico">💎</span>
          <span class="chest-kind">BOOST</span>
          <span class="chest-ready-tag">TAP</span>
        </button>
      </div>
      <div class="boost-pill hidden" id="boost-pill"></div>
    `;
  }

  function syncOverlay(state) {
    const c = ensure(state);
    tickBoost(state);

    const perm = document.getElementById('chest-perm');
    const boost = document.getElementById('chest-boost');
    const pf = document.getElementById('chest-perm-fill');
    const bf = document.getElementById('chest-boost-fill');
    if (pf) pf.style.height = (Math.min(1, c.permanentCharge) * 100) + '%';
    if (bf) bf.style.height = (Math.min(1, c.boostCharge) * 100) + '%';
    if (perm) {
      perm.classList.toggle('ready', !!c.permanentReady);
      perm.classList.toggle('charging', !c.permanentReady && c.permanentCharge > 0);
      perm.disabled = !c.permanentReady;
    }
    if (boost) {
      boost.classList.toggle('ready', !!c.boostReady);
      boost.classList.toggle('charging', !c.boostReady && c.boostCharge > 0);
      boost.disabled = !c.boostReady;
    }

    const pill = document.getElementById('boost-pill');
    if (pill) {
      const ab = c.activeBoost;
      if (ab && ab.endsAt && Date.now() < ab.endsAt) {
        const left = Math.max(0, Math.ceil((ab.endsAt - Date.now()) / 1000));
        pill.classList.remove('hidden');
        pill.innerHTML = `<strong>${ab.name}</strong> <em>${left}s</em>`;
      } else if (ab && ab.foodGain && !ab.endsAt) {
        pill.classList.add('hidden');
      } else {
        if (ab && ab.endsAt && Date.now() >= ab.endsAt) c.activeBoost = null;
        pill.classList.add('hidden');
      }
    }
  }

  function showClaimResult(result) {
    if (!result || !result.ok) return;
    const modal = document.getElementById('claim-modal');
    const body = document.getElementById('claim-body');
    if (!modal || !body) {
      window.CB_UI?.toast?.(result.text || 'Chest claimed');
      return;
    }

    if (result.kind === 'permanent') {
      body.innerHTML = `
        <h2>💜 Relic Casket</h2>
        <p class="chest-rarity" style="color:${result.color}">${result.rarityLabel}</p>
        <p class="chest-reward-big">${result.emoji || ''} <strong>${result.text}</strong></p>
        <p class="muted tiny">Permanent — stacks forever</p>
        <button class="btn primary large" id="chest-claim-ok">Nice</button>
      `;
    } else {
      const b = result.boost || {};
      const dur = b.durationMs
        ? Math.round(b.durationMs / 1000) + 's'
        : (b.foodGain ? 'instant' : '');
      body.innerHTML = `
        <h2>💎 Loot Casket</h2>
        <p class="chest-reward-big">${b.emoji || ''} <strong>${b.name || 'Boost'}</strong></p>
        <p class="muted">${b.desc || result.text || ''}</p>
        ${dur ? `<p class="tiny">Duration: <strong>${dur}</strong></p>` : ''}
        <button class="btn primary large" id="chest-claim-ok">Got it</button>
      `;
    }
    modal.classList.add('open');
    const btn = document.getElementById('chest-claim-ok');
    if (btn) {
      btn.onclick = () => {
        modal.classList.remove('open');
        window.CB_GAME?.onClaimClosed?.();
      };
    }
  }

  window.CB_CHESTS = {
    ensure,
    charge,
    claimPermanent,
    claimBoost,
    fillChests,
    getActiveBoost,
    overlayHtml,
    syncOverlay,
    showClaimResult,
    formatBonus,
    fillSpeedMult,
  };
})();
