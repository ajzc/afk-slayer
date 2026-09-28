/** DOM rendering & interactions */
(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  let toastTimer = null;

  function toast(msg, opts) {
    opts = opts || {};
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    if (opts.html) t.innerHTML = msg;
    else t.textContent = msg;
    t.classList.toggle('celebrate', !!opts.celebrate);
    t.classList.add('show');
    clearTimeout(toastTimer);
    const ms = opts.ms || (opts.celebrate ? 3200 : 2500);
    toastTimer = setTimeout(() => {
      t.classList.remove('show', 'celebrate');
    }, ms);
  }

  /** Flush pending monster unlocks from state (toasts / brief modal). */
  function flushUnlockToasts(state) {
    const list = (state && state._pendingUnlocks) || [];
    if (!list.length) return;
    state._pendingUnlocks = [];
    list.forEach((u, i) => {
      setTimeout(() => {
        toast((u.emoji || '✨') + ' New monster unlocked: ' + u.name, { celebrate: true });
        if (window.CB_AUDIO) {
          try { window.CB_AUDIO.play('monster_unlock'); } catch (e) { /* soft */ }
        }
        showUnlockModal(u);
      }, i * 400);
    });
  }

  function showUnlockModal(u) {
    if (!u) return;
    let m = $('#unlock-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'unlock-modal';
      m.className = 'unlock-modal';
      m.innerHTML = '<div class="unlock-card"><div class="unlock-emoji"></div><h2></h2><p class="muted tiny"></p><button type="button" class="btn primary" data-unlock-dismiss>Hunt on!</button></div>';
      document.body.appendChild(m);
      m.addEventListener('click', (e) => {
        if (e.target === m || e.target.closest('[data-unlock-dismiss]')) m.classList.remove('open');
      });
    }
    const emoji = m.querySelector('.unlock-emoji');
    const h2 = m.querySelector('h2');
    const p = m.querySelector('p');
    if (emoji) emoji.textContent = u.emoji || '✨';
    if (h2) h2.textContent = 'New monster unlocked';
    if (p) p.textContent = (u.name || '') + (u.miniDesc ? (' — ' + u.miniDesc) : '');
    m.classList.add('open');
    setTimeout(() => m.classList.remove('open'), 2800);
  }

  function animateNum(el, from, to, dur = 600) {
    if (!el) return;
    const start = performance.now();
    const diff = to - from;
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = window.CB_FMT.num(from + diff * eased);
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = window.CB_FMT.num(to);
    }
    requestAnimationFrame(frame);
  }

  function setTab(name) {
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    document.body.classList.toggle('tab-hunt', name === 'hunt');
    // Intro dock: force-expand whenever Hunt is re-entered (collapsed does not persist)
    if (window.CB_INTRO && typeof window.CB_INTRO.onTabChange === 'function') {
      try { window.CB_INTRO.onTabChange(name); } catch (e) { /* soft */ }
    }
    if (window.CB_AUDIO && typeof window.CB_AUDIO.setHuntActive === 'function') {
      try { window.CB_AUDIO.setHuntActive(name === 'hunt'); } catch (e) { /* soft */ }
    }
  }

  function renderTop(state) {
    const b = window.CB_STATE.getBonuses(state);
    const F = window.CB_FMT;
    const S = window.CB_STATE;
    const set = (id, val) => {
      const el = $(id);
      if (el) el.textContent = val;
    };
    if (F.applyGoldHud) F.applyGoldHud(state.gold);
    else set('#res-gold', F.num(state.gold));
    set('#res-points', F.num(state.points));
    set('#res-food', F.num(state.food) + '/' + F.num(b.foodCap));
    set('#res-scraps', F.num(state.scraps));
    set('#res-prayer', F.num(state.prayerPoints || 0));

    const sl = (S.getSlayerLevel && S.getSlayerLevel(state)) || 1;
    const slChip = document.getElementById('slayer-level-chip');
    if (slChip) slChip.textContent = 'Slayer level ' + sl;

    // Progress toward next SL-raising milestone = current task kill quota
    // (first task completion / boss clear grants SL; no separate XP pool)
    const fill = document.getElementById('hud-sl-fill');
    if (fill) {
      let pct = 0;
      if (S.isBossFightActive && S.isBossFightActive(state)) {
        // During boss: leave bar as task progress if any, else pulse full-ish
        const c = state.currentContractId ? S.getContract(state.currentContractId) : null;
        if (c) {
          const quota = S.effectiveQuota(state, c);
          pct = Math.min(100, ((state.contractProgress || 0) / Math.max(1, quota)) * 100);
        }
      } else {
        const c = state.currentContractId ? S.getContract(state.currentContractId) : null;
        if (c) {
          const quota = S.effectiveQuota(state, c);
          pct = Math.min(100, ((state.contractProgress || 0) / Math.max(1, quota)) * 100);
        }
      }
      fill.style.width = pct + '%';
    }

    const prayerWrap = document.getElementById('res-prayer-wrap');
    if (prayerWrap) {
      const showP = (state.prayerPoints || 0) > 0 || sl >= 6;
      prayerWrap.classList.toggle('hidden', !showP);
    }
    const scrapsWrap = document.getElementById('res-scraps-wrap');
    if (scrapsWrap) {
      const show = S.scrapsHeaderVisible
        ? S.scrapsHeaderVisible(state)
        : ((state.scraps || 0) >= 1);
      scrapsWrap.classList.toggle('hidden', !show);
    }

    const contract = state.currentContractId ? S.getContract(state.currentContractId) : null;
    const rate = contract ? S.killRatePerMin(state, contract) : 0;
    const rateEl = document.getElementById('res-gold-rate');
    if (rateEl) {
      if (contract) {
        const earlyM = S.earlyRewardMult ? S.earlyRewardMult(state) : 1;
        const avgGold = ((contract.goldMin + contract.goldMax) / 2) * b.lootLuck * earlyM;
        rateEl.textContent = '+' + F.num(rate * avgGold, 1) + '/m';
      } else rateEl.textContent = '+0/m';
    }
    const spRate = document.getElementById('res-points-rate');
    if (spRate) {
      if (contract) {
        const ppm = rate * (contract.pointsPerKill || 0) * (b.pointsMult || 1) * (S.earlyRewardMult ? S.earlyRewardMult(state) : 1);
        spRate.textContent = '(+' + F.num(ppm, 1) + '/m)';
      } else spRate.textContent = '(+0/m)';
    }

    // Measure HUD height for arena calc
    const hud = document.getElementById('top-hud');
    if (hud) {
      const h = Math.ceil(hud.getBoundingClientRect().height || 60);
      document.documentElement.style.setProperty('--hud-h', h + 'px');
    }
  }

  function renderHunt(state, opts) {
    opts = opts || {};
    if (window.CB_ARENA) {
      if (opts.soft) {
        window.CB_ARENA.update(state, opts.gains);
      } else {
        window.CB_ARENA.render(state);
      }
      return;
    }
    // Fallback if arena missing
    const panel = $('#hunt-body');
    if (panel) panel.innerHTML = '<p class="muted">Arena loading…</p>';
  }

  function renderBoard(state) {
    const panel = $('#board-body');
    if (!panel) return;
    const S = window.CB_STATE;
    const F = window.CB_FMT;
    const D = window.CB_DATA;
    const autoUnlocked = S.getUpgradeLevel(state, 'auto_accept') >= 1;

    // Current Level chrome: "Level N · Hunt targets"
    let huntLevelLabel = 'Level 1';
    for (let i = 0; i < D.areas.length; i++) {
      const a = D.areas[i];
      if (a.hidden) continue;
      if (state.areas[a.id]?.unlocked) huntLevelLabel = S.levelLabel ? S.levelLabel(a) : a.name;
    }
    const masterName = (D.nameOf && D.nameOf('turael')) || 'Turael';
    const sl = (S.getSlayerLevel && S.getSlayerLevel(state)) || 1;
    const slLabel = (D.nameOf && D.nameOf('slayer_level')) || 'Slayer level';
    let html = `<div class="card"><h2 style="margin:0">Slayer Master · ${masterName}</h2><p class="muted tiny" style="margin:4px 0 0">${huntLevelLabel} · ${slLabel} ${sl} · Hunt targets</p></div>
    <div class="card row-between">
      <div>
        <strong>Auto-Accept</strong>
        <p class="muted tiny">${autoUnlocked ? 'Grab the next hunt when one finishes' : 'Unlock on Progress → Camp with Slayer points'}</p>
      </div>
      <label class="toggle ${autoUnlocked ? '' : 'disabled'}">
        <input type="checkbox" id="auto-accept-toggle" ${state.autoAccept ? 'checked' : ''} ${autoUnlocked ? '' : 'disabled'}>
        <span></span>
      </label>
    </div>`;

    // Level boss cards (Fight boss CTA — never Claim)
    html += `<h3 class="section-title">Tier Tests</h3>`;
    (D.markedPrey || []).forEach(p => {
      if (p.hidden) return;
      if (!state.areas[p.areaId]?.unlocked && !state.prey[p.id]?.finished) return;
      const st = S.ensurePreyEntry(state, p.id);
      const cost = S.bossCostOf(p);
      const meter = st.meter || 0;
      const pct = Math.min(100, (meter / Math.max(1, cost)) * 100);
      const canFight = !st.finished && (st.accessUnlocked || meter >= cost);
      const fighting = S.isBossFightActive && S.isBossFightActive(state) && state.bossFight && state.bossFight.preyId === p.id;
      const lvl = S.levelLabel(p.areaId);
      const chip = S.levelChipHtml ? S.levelChipHtml(p.areaId) : `<span class="level-chip">${lvl}</span>`;
      const title = S.bossDisplayName(p);
      html += `<div class="card prey-card ${st.finished ? 'done' : ''} ${canFight ? 'ready' : ''} ${fighting ? 'fighting' : ''}">
        <div class="card-head">
          <span class="emoji">${p.emoji}</span>
          <div class="grow">
            <h3>${title}</h3>
            <p class="muted tiny">${chip} · Tier Test · helpers muted</p>
            <p class="tiny">Slayer points ${F.num(meter, 0)} / ${cost}</p>
            <div class="bar-wrap prey"><div class="bar" style="width:${pct}%"></div></div>
          </div>
          <div class="col-actions">
            ${st.finished
              ? `<span class="success tiny">${lvl} cleared</span>`
              : fighting
                ? `<button type="button" class="btn ghost boss-leave-btn" data-action="flee-boss" data-id="${p.id}">Leave fight</button>`
                : `<button type="button" class="btn ${canFight ? 'primary glow' : 'ghost'} small ${canFight ? '' : 'locked'}" data-action="fight-boss" data-id="${p.id}" ${canFight ? 'title="Start live boss fight"' : 'disabled aria-disabled="true"'} aria-label="${canFight ? 'Fight boss' : ('Need ' + F.num(meter, 0) + ' of ' + cost + ' Slayer points')}">Fight boss</button>`}
          </div>
        </div>
      </div>`;
    });

    // Group by area
    D.areas.forEach(area => {
      if (area.hidden) return;
      const unlocked = state.areas[area.id]?.unlocked;
      const lvl = S.levelLabel ? S.levelLabel(area) : area.name;
      const chip = S.levelChipHtml ? S.levelChipHtml(area) : `<span class="level-chip">${lvl}</span>`;
      html += `<h3 class="section-title">${chip} ${unlocked ? '' : '🔒'}</h3>`;
      if (!unlocked) {
        html += `<p class="muted tiny pad">Defeat the previous Level boss to open this Level.</p>`;
        return;
      }
      D.contracts.filter(c => c.areaId === area.id).forEach(c => {
        const active = state.currentContractId === c.id;
        const best = S.ensureBestiaryEntry(state, c.id);
        const unlocked = !!best.unlocked;
        const quota = S.effectiveQuota(state, c);
        const chestPct = S.masteryChestChance(best.mastery);
        const goldMult = S.masteryGoldMult(best.mastery);
        const improveCost = S.masteryImproveCost(best.mastery);
        if (!unlocked) {
          html += `<div class="card contract-list locked-monster">
            <div class="card-head">
              <span class="emoji silhouette">❔</span>
              <div class="grow">
                <h3 class="silhouette-name">??? Locked monster</h3>
                <p class="muted tiny">Finish the previous hunt (or its kill quota) to unlock.</p>
              </div>
              <button class="btn ghost small" disabled>🔒 Locked</button>
            </div>
          </div>`;
          return;
        }
        const perkNow = S.activeMasteryPerkText ? S.activeMasteryPerkText(state, c.id) : null;
        const perkNext = S.nextMasteryPerkText ? S.nextMasteryPerkText(state, c.id) : null;
        const sig = c.signatureDrop && D.signatureMats && D.signatureMats[c.signatureDrop.id];
        const sigCount = (sig && state.mats && state.mats[sig.id]) || 0;
        const sigLine = sig
          ? `<p class="muted tiny">${sig.emoji} ${sig.name}${sigCount ? (' · owned ×' + F.num(sigCount)) : ' · rare drop'}</p>`
          : '';
        const perkLine = (perkNow || perkNext)
          ? `<p class="muted tiny">Mastery perk: ${perkNow || '—'} ${perkNext ? ('· next ' + perkNext) : ''}</p>`
          : '';
        html += `<div class="card contract-list ${active ? 'active' : ''}">
          <div class="card-head">
            <span class="emoji">${c.emoji}</span>
            <div class="grow">
              <h3>${S.displayName ? S.displayName(c) : c.name}</h3>
              <p class="muted tiny">${c.miniDesc || 'Hunt target.'}</p>
              <p class="muted tiny">Task ${quota} kills · ${F.num(c.pointsPerKill * (S.earlyRewardMult ? S.earlyRewardMult(state) : 1), 1)} Sp each · Finish bonus ${c.finishBonus} Sp</p>
              ${(S.inEarlyWindow && S.inEarlyWindow(state)) ? '<p class="tiny early-hunts">Early hunts: fewer kills until you hire your first helper.</p>' : ''}
              <p class="muted tiny">Done ×${best.completions} · Kills ${F.num(best.kills)} · Mastery ${best.mastery}/10 · Chest ${(chestPct * 100).toFixed(2)}% · Gold ×${F.num(goldMult, 2)}</p>
              ${sigLine}${perkLine}
            </div>
            <div class="col-actions">
              <button class="btn ${active ? 'ghost' : 'primary'} small" data-action="accept" data-id="${c.id}" ${active ? 'disabled' : ''}>
                ${active ? 'Active' : 'Accept'}
              </button>
              <button class="btn small ghost" data-action="improve-mastery" data-id="${c.id}" ${best.mastery >= 10 ? 'disabled' : ''} title="Spend gold to raise bounty mastery (better finish chests)">
                ${best.mastery >= 10 ? 'Max bounty' : ('Improve bounty · ' + (F.goldChipHtml ? F.goldChipHtml(improveCost) : (F.num(improveCost) + ' gold')))}
              </button>
            </div>
          </div>
        </div>`;
      });
    });

    panel.innerHTML = html;
  }

  function renderUpgrades(state) {
    // Upgrades tab removed from nav — support list lives under Progress → Camp
    const panel = $('#upgrades-body');
    if (!panel) return;
    panel.innerHTML = `<div class="card compact-card"><p class="tiny muted">Support upgrades moved to <strong>Progress → Camp</strong>. Gear, hunters, and combat unlocks are on the other Progress strips.</p></div>`;
  }

  function renderGuild(state) {
    const panel = $('#guild-body');
    if (!panel) return;
    const S = window.CB_STATE;
    const F = window.CB_FMT;
    const D = window.CB_DATA;
    const rank = S.getGuildRank(state.guildXp);
    const nextXp = S.nextRankXp(state.guildXp);
    const pct = nextXp > rank.xp ? ((state.guildXp - rank.xp) / (nextXp - rank.xp)) * 100 : 100;
    const comp = S.completionPct(state);

    let html = `<div class="card">
      <div class="card-head">
        <span class="emoji">🏛️</span>
        <div class="grow">
          <h2>${rank.name}</h2>
          <p class="muted tiny">Guild Rank ${rank.rank} · XP ${F.num(state.guildXp)} / ${F.num(nextXp)}</p>
        </div>
      </div>
      <div class="bar-wrap">
        <div class="bar" style="width:${Math.min(100, pct)}%"></div>
      </div>
      <p class="tiny">Completion <strong>${F.pct(comp, 1)}</strong> · Prestiges ${state.prestigeCount} · Total kills ${F.num(state.totalKills)}</p>
    </div>`;

    if (state.prestigeMod) {
      html += `<div class="card accent"><p class="tiny"><strong>Charter modifier:</strong> ${state.prestigeMod}</p></div>`;
    }

    // Relics
    html += `<h3 class="section-title">Relics</h3>`;
    const relicIds = Object.keys(D.relics);
    const owned = relicIds.filter(id => state.relics[id]);
    if (!owned.length) {
      html += `<p class="muted tiny pad">Clear Level bosses to earn permanent relics.</p>`;
    }
    relicIds.forEach(id => {
      const r = D.relics[id];
      const has = !!state.relics[id];
      html += `<div class="card relic ${has ? 'owned' : 'locked'}">
        <span class="emoji">${has ? r.emoji : '❓'}</span>
        <div><strong>${has ? r.name : 'Unknown Relic'}</strong>
        <p class="muted tiny">${has ? r.desc : '???'}</p></div>
      </div>`;
    });

    // Bestiary
    html += `<h3 class="section-title">Bestiary</h3>`;
    D.contracts.forEach(c => {
      const b = S.ensureBestiaryEntry(state, c.id);
      const unlocked = !!b.unlocked;
      const known = unlocked || b.kills > 0;
      const chestPct = S.masteryChestChance(b.mastery);
      const improveCost = S.masteryImproveCost(b.mastery);
      const perk = unlocked && S.activeMasteryPerkText ? S.activeMasteryPerkText(state, c.id) : null;
      const sig = c.signatureDrop && D.signatureMats && D.signatureMats[c.signatureDrop.id];
      const sigN = (sig && state.mats && state.mats[sig.id]) || 0;
      html += `<div class="bestiary-row ${unlocked ? '' : 'unknown locked'}">
        <span>${unlocked ? c.emoji : '❔'}</span>
        <span class="grow">${unlocked ? (S.displayName ? S.displayName(c) : c.name) : '???'}
          ${unlocked ? `<span class="muted tiny"> · M${b.mastery}/10 · chest ${(chestPct * 100).toFixed(2)}%</span>` : ''}
          ${unlocked && c.miniDesc ? `<div class="muted tiny">${c.miniDesc}</div>` : ''}
          ${unlocked && perk ? `<div class="muted tiny">Perk: ${perk}</div>` : ''}
          ${unlocked && sig ? `<div class="muted tiny">${sig.emoji} ${sig.name} ×${F.num(sigN)}</div>` : ''}
        </span>
        <span class="muted tiny">${known ? F.num(b.kills) + ' · ×' + b.completions : '—'}</span>
        ${unlocked && b.mastery < 10
          ? `<button type="button" class="btn tiny ghost" data-action="improve-mastery" data-id="${c.id}">Bounty ${F.goldChipHtml ? F.goldChipHtml(improveCost) : (F.num(improveCost) + ' gold')}</button>`
          : ''}
      </div>`;
    });

    // Prestige
    html += `<h3 class="section-title">Charter Rewrite</h3>
      <div class="card">
        <p class="tiny muted">Resets gold, food, and run upgrades. Keeps relics, bestiary, hunters, Levels, boss clears, and Sigils. Sigils give lasting charter bonuses.</p>
        <button class="btn danger" data-action="prestige" ${S.canPrestige(state) ? '' : 'disabled'}>
          Rewrite Charter
        </button>
        ${S.canPrestige(state) ? '' : '<p class="muted tiny">Requires a cleared Level boss or Tracker rank.</p>'}
      </div>`;

    html += `<div class="card danger-zone">
      <button class="btn ghost small" data-action="reset-save">Reset all progress</button>
    </div>`;

    panel.innerHTML = html;
  }

  function showClaimModal(gains) {
    const modal = $('#claim-modal');
    const body = $('#claim-body');
    const F = window.CB_FMT;
    if (!modal || !body) return;

    const meaningful = gains.kills >= 1 || gains.gold >= 1 || gains.points >= 1;
    if (!meaningful && gains.effectiveMinutes < 0.05) {
      modal.classList.remove('open');
      return;
    }

    let chipLines = '';
    Object.keys(gains.chips || {}).forEach(id => {
      const p = window.CB_DATA.markedPrey.find(x => x.id === id);
      if (p && gains.chips[id] > 0.01) {
        chipLines += `<li>${p.emoji} ${p.name} boss meter +${F.num(gains.chips[id], 2)} Sp</li>`;
      }
    });

    body.innerHTML = `
      <h2>While you were away…</h2>
      <p class="muted">${F.time(gains.elapsedMs)} away${gains.capped ? ' (capped)' : ''} · ${F.num(gains.effectiveMinutes, 1)} min counted</p>
      <ul class="claim-list">
        <li>⚔️ Kills <strong id="claim-kills">0</strong></li>
        <li><span class="gold-chip"><img class="gold-icon" src="art/v3b/ui/gold/coins_1_16.png" width="16" height="16" alt="" aria-hidden="true"> Gold</span> <strong id="claim-gold" class="gold-amount">0</strong></li>
        <li>⭐ Slayer points <strong id="claim-points">0</strong></li>
        ${gains.contractsFinished ? `<li>📋 Contracts finished <strong>${gains.contractsFinished}</strong></li>` : ''}
        ${chipLines}
      </ul>
      <button class="btn primary large" id="claim-btn">Claim</button>
    `;
    modal.classList.add('open');

    animateNum($('#claim-kills'), 0, gains.kills, 700);
    animateNum($('#claim-gold'), 0, gains.gold, 800);
    (function (g) {
      const el = $('#claim-gold');
      const ico = el && el.parentElement && el.parentElement.querySelector('.gold-icon');
      if (el && F.formatGold) {
        const fg = F.formatGold(g);
        // keep animating digits then snap style; apply final style immediately for color
        el.style.color = fg.color;
        el.classList.add('gold-amount', 'tier-' + fg.tier);
      }
      if (ico && F.goldIconSrc) {
        ico.src = F.goldIconSrc(g, g >= 250 ? 'inline' : 'inline');
        // force 20px for big stacks
        const px = F.goldIconPx(g, 'inline');
        ico.width = px; ico.height = px;
      }
    })(gains.gold);
    animateNum($('#claim-points'), 0, gains.points, 900);

    const btn = $('#claim-btn');
    btn.onclick = () => {
      modal.classList.remove('open');
      window.CB_GAME?.onClaimClosed?.();
    };
  }

  function bindGlobal(handlers) {
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      handlers(action, id, btn);
    });

    $$('.tab-btn').forEach(b => {
      b.addEventListener('click', () => {
        setTab(b.dataset.tab);
        handlers('tab', b.dataset.tab);
      });
    });

    document.body.addEventListener('change', (e) => {
      if (e.target.id === 'auto-accept-toggle') {
        handlers('toggle-auto', null, e.target);
      }
      if (e.target.id === 'set-mute') {
        handlers('settings-mute', null, e.target);
      }
      if (e.target.id === 'set-motion') {
        handlers('settings-motion', null, e.target);
      }
    });

    document.body.addEventListener('input', (e) => {
      const t = e.target;
      if (!t || t.type !== 'range') return;
      if (t.id === 'set-master' || t.id === 'set-sfx' || t.id === 'set-music') {
        const lab = document.getElementById(t.id + '-val');
        if (lab) lab.textContent = t.value + '%';
        handlers('settings-vol', t.id, t);
      }
    });
  }

  function renderCodex(state) {
    const panel = $('#codex-body');
    if (!panel) return;
    const entries = (window.CB_DATA && window.CB_DATA.codex) || [];
    let html = `<h3 class="section-title">📖 Guild Codex</h3>
      <p class="muted tiny pad">Short plain-English notes — what the Hunt toys actually do.</p>
      <div class="codex-list">`;
    entries.forEach(e => {
      html += `<div class="codex-card">
        <h3><span class="cx-ico">${e.ico || ''}</span>${e.title}</h3>
        <p>${e.body}</p>
      </div>`;
    });
    const mats = (state && state.mats) || {};
    const matDefs = (window.CB_DATA && window.CB_DATA.signatureMats) || {};
    Object.keys(matDefs).forEach(id => {
      const m = matDefs[id];
      const n = mats[id] || 0;
      html += `<div class="codex-card">
        <h3><span class="cx-ico">${m.emoji || ''}</span>${m.name}</h3>
        <p>${m.desc || ''} · owned ×${window.CB_FMT.num(n)}</p>
      </div>`;
    });
    html += `</div>
      <div class="card compact-card" style="margin-top:10px">
        <p class="tiny muted"><strong>Tip:</strong> Hold toward a monster to fire bolts. Finish a Task to unlock the next monster. Hire hunters and unlock crits on Progress. Camp grows Food, offline time, and luck. Ready caskets on the left jiggle — tap to claim.</p>
      </div>`;
    panel.innerHTML = html;
  }

  function defaultSettings() {
    return { masterVol: 100, sfxVol: 70, musicVol: 100, muted: false, reduceMotion: false };
  }

  function applyMotionPref(state) {
    const on = !!(state && state.settings && state.settings.reduceMotion);
    document.body.classList.toggle('reduce-motion', on);
  }

  function renderSettings(state) {
    const panel = $('#settings-body');
    if (!panel) return;
    const s = Object.assign(defaultSettings(), (state && state.settings) || {});
    applyMotionPref(state);
    const volRow = function (id, label, val) {
      return `<div class="settings-row">
        <label class="settings-label" for="${id}">${label}</label>
        <div class="settings-control">
          <input type="range" id="${id}" min="0" max="100" step="1" value="${val}"
            data-action="settings-vol" data-id="${id}" />
          <span class="settings-val" id="${id}-val">${val}%</span>
        </div>
      </div>`;
    };
    panel.innerHTML = `
      <h3 class="section-title">⚙️ Settings</h3>
      <div class="card settings-card">
        <h4 class="settings-group">Audio</h4>
        ${volRow('set-master', 'Master volume', s.masterVol)}
        ${volRow('set-sfx', 'SFX volume (0 = off)', s.sfxVol)}
        ${volRow('set-music', 'Music (AFK bed)', s.musicVol)}
        <div class="settings-row">
          <label class="settings-label" for="set-mute">Mute all</label>
          <div class="settings-control">
            <input type="checkbox" id="set-mute" data-action="settings-mute" ${s.muted ? 'checked' : ''} />
          </div>
        </div>
      </div>
      <div class="card settings-card">
        <h4 class="settings-group">Display</h4>
        <div class="settings-row">
          <label class="settings-label" for="set-motion">Reduce motion</label>
          <div class="settings-control">
            <input type="checkbox" id="set-motion" data-action="settings-motion" ${s.reduceMotion ? 'checked' : ''} />
          </div>
        </div>
        <p class="tiny muted pad">Dampens floaters and juice when on.</p>
      </div>
      ${window.CB_AUTH && window.CB_AUTH.settingsAccountCard ? window.CB_AUTH.settingsAccountCard(state) : ''}
      <div class="card settings-card">
        <h4 class="settings-group">Save &amp; tutorial</h4>
        <div class="settings-actions">
          <button type="button" class="btn ghost" data-action="reset-intro">Reset intro tutorial</button>
          <button type="button" class="btn ghost" data-action="export-save">Export save</button>
          <button type="button" class="btn danger" data-action="wipe-save" id="wipe-save-btn">Wipe save…</button>
        </div>
        <p class="tiny muted pad">Wipe needs a second tap to confirm. Export downloads a JSON backup.</p>
      </div>
      <p class="settings-footer muted tiny">AFK Slayer · build iom7 · <a class="settings-legal" href="/privacy" target="_blank" rel="noopener">Privacy</a> · <a class="settings-legal" href="/terms" target="_blank" rel="noopener">Terms</a></p>
    `;
    if (window.CB_AUTH && window.CB_AUTH.mountSettingsGoogleButton) {
      try { window.CB_AUTH.mountSettingsGoogleButton(); } catch (e) { /* soft */ }
    }
  }

  function renderMaps(state) {
    if (window.CB_MAPS) window.CB_MAPS.renderMaps(state);
  }

  function renderAll(state, tab) {
    renderTop(state);
    renderHunt(state);
    renderBoard(state);
    renderUpgrades(state);
    renderMaps(state);
    renderGuild(state);
    renderCodex(state);
    renderSettings(state);
    flushUnlockToasts(state);
    if (tab) setTab(tab);
    try {
      if (window.CB_INTRO && window.CB_INTRO.refresh) window.CB_INTRO.refresh(state);
    } catch (e) { /* soft */ }
  }

  window.CB_UI = {
    toast,
    setTab,
    renderAll,
    renderTop,
    renderHunt,
    renderMaps,
    renderCodex,
    renderSettings,
    showClaimModal,
    bindGlobal,
    animateNum,
    flushUnlockToasts,
    showUnlockModal,
    applyMotionPref,
  };
})();
