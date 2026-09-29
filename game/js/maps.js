/** Progression maps — flowchart unlock UI (Progress tab) */
(function () {
  let activeStrip = 'combat'; // combat | gear | company | camp

  const STRIPS = [
    { id: 'combat', label: 'Combat', ico: '⚔️' },
    { id: 'gear', label: 'Gear', ico: '🗡️' },
    { id: 'company', label: 'Company', ico: '👥' },
    { id: 'smithing', label: 'Smithing', ico: '🔨', minSlayerLevel: 2 },
    { id: 'prayer', label: 'Prayer', ico: '🙏', minSlayerLevel: 6 },
    { id: 'camp', label: 'Camp', ico: '🏕️' },
  ];

  function nodeStatus(state, node, mapNodes) {
    const S = window.CB_STATE;
    const byId = {};
    mapNodes.forEach(n => { byId[n.id] = n; });

    function isOwned(n) {
      if (!n) return false;
      if (n.kind === 'milestone') {
        if (!n.requires || !n.requires.length) return true;
        return n.requires.every(rid => isOwned(byId[rid]));
      }
      if (!n.upgradeId) return false;
      const lv = S.getUpgradeLevel(state, n.upgradeId);
      // Progression: any purchase counts as owned for map flow
      return lv >= 1;
    }

    if (node.kind === 'milestone') {
      if (isOwned(node)) return 'owned';
      const anyParent = (node.requires || []).some(rid => isOwned(byId[rid]));
      return anyParent ? 'available' : 'locked';
    }

    // Unlock / upgrade nodes
    const reqs = node.requires || [];
    const parentsOk = !reqs.length ? true
      : (node.requiresAny
        ? reqs.some(rid => isOwned(byId[rid]))
        : reqs.every(rid => isOwned(byId[rid])));
    if (!parentsOk) return 'locked';

    if (node.upgradeId) {
      const u = window.CB_DATA.upgrades.find(x => x.id === node.upgradeId);
      if (!u) return 'locked';
      const lv = S.getUpgradeLevel(state, node.upgradeId);
      if (node.kind === 'unlock' && lv >= 1) return 'owned';
      if (lv >= u.maxLevel) return 'owned';
      // For upgrade nodes on multi-level (beam_focus II+): owned if maxed only;
      // still purchasable while lv < max
      if (node.kind === 'upgrade' && lv >= 1 && lv < u.maxLevel) {
        // show as available to buy more, but parents depending on this see isOwned true
      }
      if (u.requiresUpgrade && S.getUpgradeLevel(state, u.requiresUpgrade) < 1) return 'locked';
      if (u.requiresAnyUpgrade && u.requiresAnyUpgrade.length) {
        const anyOk = u.requiresAnyUpgrade.some(id => S.getUpgradeLevel(state, id) >= 1);
        if (!anyOk) return 'locked';
      }
      return 'available';
    }
    return 'available';
  }

  function formatGate(ms) {
    if (!ms) return '';
    const mins = ms / 60000;
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = Math.round(mins % 60);
      return m ? h + 'h ' + m + 'm' : h + 'h';
    }
    if (mins === Math.floor(mins)) return mins + 'm';
    return mins.toFixed(1) + 'm';
  }

  function renderMap(state, key, nodes) {
    const S = window.CB_STATE;
    const F = window.CB_FMT;
    // Layout: group into rows by dependency depth
    const depth = {};
    const byId = {};
    nodes.forEach(n => { byId[n.id] = n; });
    function dep(id, seen) {
      if (depth[id] != null) return depth[id];
      seen = seen || {};
      if (seen[id]) return 0;
      seen[id] = true;
      const n = byId[id];
      if (!n || !n.requires || !n.requires.length) {
        depth[id] = 0;
        return 0;
      }
      depth[id] = 1 + Math.max.apply(null, n.requires.map(r => dep(r, seen)));
      return depth[id];
    }
    nodes.forEach(n => dep(n.id));
    const maxD = Math.max.apply(null, [0].concat(nodes.map(n => depth[n.id] || 0)));
    const rows = [];
    for (let d = 0; d <= maxD; d++) {
      rows.push(nodes.filter(n => (depth[n.id] || 0) === d));
    }

    let html = `<div class="prog-map" data-map="${key}">`;
    rows.forEach((row, ri) => {
      if (ri > 0) html += `<div class="map-connector-row" aria-hidden="true"><span class="map-vline"></span></div>`;
      html += `<div class="map-row ${row.length > 1 ? 'branch' : 'single'}">`;
      row.forEach((node, ni) => {
        if (ni > 0) html += `<span class="map-hconnect" aria-hidden="true"></span>`;
        const st = nodeStatus(state, node, nodes);
        const kind = node.kind || 'unlock';
        let sub = '';
        let btn = '';
        if (node.upgradeId && st !== 'owned' && kind !== 'milestone') {
          const u = window.CB_DATA.upgrades.find(x => x.id === node.upgradeId);
          if (u) {
            const lv = S.getUpgradeLevel(state, node.upgradeId);
            const cost = S.upgradeCost(u, lv);
            const curKey = u.costCurrency === 'points' ? 'points' : u.costCurrency === 'scraps' ? 'scraps' : 'gold';
            const curEmoji = curKey === 'points' ? '⭐' : curKey === 'scraps' ? '🔩' : null;
            let cantAfford = false;
            if (u.costMats) {
              const mats = state.mats || {};
              cantAfford = Object.keys(u.costMats).some(id => (mats[id] || 0) < u.costMats[id]);
            } else {
              cantAfford = (state[curKey] || 0) < cost;
            }
            const slNeed = u.minSlayerLevel || 0;
            const slHave = (S.getSlayerLevel && S.getSlayerLevel(state)) || 1;
            const slLocked = slNeed > slHave;
            const disabled = st === 'locked' || cantAfford || slLocked;
            const lvTag = (u.maxLevel > 1 && lv > 0)
              ? `<span class="map-lv">Lv ${lv}/${u.maxLevel}</span>`
              : (u.maxLevel > 1 ? `<span class="map-lv muted">Lv 0/${u.maxLevel}</span>` : '');
            const affordClass = (!disabled && !cantAfford) ? 'primary' : 'ghost';
            let btnLabel = (st === 'locked') ? '🔒'
              : (curKey === 'gold' && F.goldChipHtml ? F.goldChipHtml(cost)
                : (F.num(cost) + (curEmoji || '')));
            if (slLocked) btnLabel = 'SL' + slNeed;
            btn = lvTag + (slLocked ? `<span class="map-lv muted">Need SL ${slNeed}</span>` : '') + `<button type="button" class="btn small ${disabled ? 'ghost' : 'primary'}${cantAfford && st !== 'locked' && !slLocked ? ' unaffordable' : ''}" data-action="buy-upgrade" data-id="${u.id}" ${disabled ? 'disabled' : ''}>${btnLabel}</button>`;
          }
        } else if (st === 'owned') {
          const u = node.upgradeId && window.CB_DATA.upgrades.find(x => x.id === node.upgradeId);
          const lv = u ? S.getUpgradeLevel(state, node.upgradeId) : 0;
          const lvTag = (u && u.maxLevel > 1) ? ` Lv ${lv}/${u.maxLevel}` : '';
          btn = `<span class="map-owned-tag">Owned${lvTag}</span>`;
        }
        const upAttr = node.upgradeId ? (' data-upgrade="' + node.upgradeId + '"') : '';
        let effectHint = '';
        if (node.upgradeId) {
          const uu = window.CB_DATA.upgrades.find(x => x.id === node.upgradeId);
          if (uu && uu.desc) {
            const esc = String(uu.desc)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/"/g, '&quot;');
            effectHint = '<div class="map-node-desc" title="' + esc + '">' + esc + '</div>';
          }
        } else if (node.desc) {
          const esc = String(node.desc)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
          effectHint = '<div class="map-node-desc" title="' + esc + '">' + esc + '</div>';
        }
        let displayLabel = node.label;
        if (node.upgradeId) {
          const uuLab = window.CB_DATA.upgrades.find(x => x.id === node.upgradeId);
          if (uuLab) {
            displayLabel = (uuLab.nameKey && window.CB_DATA.nameOf) ? window.CB_DATA.nameOf(uuLab.nameKey) : (uuLab.name || node.label);
          }
        }
        html += `<div class="map-node kind-${kind} status-${st}" data-node="${node.id}"${upAttr}>
          <div class="map-node-label">${displayLabel}</div>
          ${effectHint}
          ${sub}
          ${btn}
        </div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
    return html;
  }

  /** Camp = list of support upgrades + Sigil charter (was Upgrades tab) */
  function renderCampPanel(state) {
    const S = window.CB_STATE;
    const F = window.CB_FMT;
    const D = window.CB_DATA;
    const campIds = new Set([
      'food_cap', 'food_eff', 'offline_cap', 'loot_luck', 'auto_accept', 'prey_chip',
    ]);
    let html = `<div class="card compact-card"><p class="tiny muted">Everyday boosts — food, offline, luck. Gear, hunters, and combat unlocks are on the other Progress strips.</p></div>`;

    const maps = D.progressionMaps || {};
    if (maps.camp && maps.camp.length) {
      html += renderMap(state, 'camp', maps.camp);
    }

    D.upgrades.forEach(u => {
      if (!campIds.has(u.id)) return;
      // Already buyable via camp map nodes; skip duplicate cards when map present
      if (maps.camp && maps.camp.some(n => n.upgradeId === u.id)) return;
      const lv = S.getUpgradeLevel(state, u.id);
      const maxed = lv >= u.maxLevel;
      const cost = maxed ? 0 : S.upgradeCost(u, lv);
      const cur = u.costCurrency === 'points' ? 'points'
        : u.costCurrency === 'scraps' ? 'scraps'
        : u.costCurrency === 'mats' ? 'mats'
        : 'gold';
      const curEmoji = cur === 'points' ? '⭐' : cur === 'scraps' ? '🔩' : cur === 'mats' ? '🧰' : null;
      const reqOk = (!u.requiresUpgrade || S.getUpgradeLevel(state, u.requiresUpgrade) >= 1)
        && (!u.requiresAnyUpgrade || !u.requiresAnyUpgrade.length
          || u.requiresAnyUpgrade.some(id => S.getUpgradeLevel(state, id) >= 1));
      let afford = true;
      if (cur === 'mats' && u.costMats) {
        const mats = state.mats || {};
        afford = Object.keys(u.costMats).every(id => (mats[id] || 0) >= u.costMats[id]);
      } else {
        afford = (state[cur] || 0) >= cost;
      }
      const can = !maxed && reqOk && afford;
      let lockHint = '';
      if (!reqOk && u.requiresUpgrade) lockHint = ' · unlock requirement first';
      else if (!afford && !maxed) lockHint = ' · need more ' + (cur === 'mats' ? 'mats' : cur);
      const costLabel = maxed ? 'MAX' : (!reqOk ? '🔒'
        : (cur === 'gold' && F.goldChipHtml ? F.goldChipHtml(cost) : (F.num(cost) + (curEmoji || ''))));
      html += `<div class="card upgrade-card ${maxed ? 'maxed' : ''}${!afford && reqOk && !maxed ? ' unaffordable' : ''}">
        <div class="card-head">
          <span class="emoji">${u.emoji}</span>
          <div class="grow">
            <h3>${u.name} <span class="muted">Lv ${lv}/${u.maxLevel}</span></h3>
            <p class="muted tiny">${u.desc}${lockHint}</p>
          </div>
          <button class="btn ${can ? 'primary' : 'ghost'} small" data-action="buy-upgrade" data-id="${u.id}" ${maxed || !can ? 'disabled' : ''}>
            ${costLabel}
          </button>
        </div>
      </div>`;
    });


    /* Scrapwork — scraps currency */
    if (S.scrapworkVisible && S.scrapworkVisible(state)) {
      html += `<h3 class="section-title">🔩 Scrapwork</h3>`;
      html += `<div class="card compact-card"><p class="tiny muted">Spend Scraps on Camp junk that still helps.</p></div>`;
      const scrapIds = ['scrap_magnet','scrap_larder','scrap_wick','scrap_gild'];
      D.upgrades.filter(u => scrapIds.includes(u.id)).forEach(u => {
        const lv = S.getUpgradeLevel(state, u.id);
        const maxed = lv >= u.maxLevel;
        const cost = maxed ? 0 : S.upgradeCost(u, lv);
        const can = !maxed && (state.scraps || 0) >= cost;
        html += `<div class="card upgrade-card ${maxed ? 'maxed' : ''}">
          <div class="card-head">
            <span class="emoji">${u.emoji}</span>
            <div class="grow">
              <h3>${u.name} <span class="muted">Lv ${lv}/${u.maxLevel}</span></h3>
              <p class="muted tiny">${u.desc}</p>
            </div>
            <button class="btn ${can ? 'primary' : 'ghost'} small" data-action="buy-upgrade" data-id="${u.id}" ${maxed || !can ? 'disabled' : ''}>
              ${maxed ? 'MAX' : F.num(cost) + '🔩'}
            </button>
          </div>
        </div>`;
      });
    }

    /* Forge — signature mats */
    if (S.forgeVisible && S.forgeVisible(state)) {
      html += `<h3 class="section-title">⚒️ Forge</h3>`;
      html += `<div class="card compact-card"><p class="tiny muted">Turn monster trophies into charms and short hunts.</p>`;
      const matDefs = D.signatureMats || {};
      const mats = state.mats || {};
      const LEGACY_MATS = { grip_scrap:1, wail_shard:1, ember_core:1 };
      const matLine = Object.keys(matDefs).filter(id => !LEGACY_MATS[id]).map(id => {
        const m = matDefs[id];
        return `${m.emoji || ''} ${m.name} ×${F.num(mats[id] || 0)}`;
      }).join(' · ');
      html += `<p class="tiny">${matLine}</p></div>`;

      const forgePerm = ['forge_knuckle','forge_echo','forge_cinder'];
      D.upgrades.filter(u => forgePerm.includes(u.id)).forEach(u => {
        const lv = S.getUpgradeLevel(state, u.id);
        const maxed = lv >= u.maxLevel;
        const matsOk = !u.costMats || Object.keys(u.costMats).every(id => (mats[id] || 0) >= u.costMats[id]);
        const can = !maxed && matsOk;
        let costLabel = 'MAX';
        if (!maxed && u.costMats) {
          costLabel = Object.keys(u.costMats).map(id => {
            const meta = matDefs[id] || { emoji: '🧰', name: id };
            return (meta.emoji || '') + u.costMats[id];
          }).join(' ');
        }
        html += `<div class="card upgrade-card ${maxed ? 'maxed' : ''}">
          <div class="card-head">
            <span class="emoji">${u.emoji}</span>
            <div class="grow">
              <h3>${u.name}</h3>
              <p class="muted tiny">${u.desc}</p>
            </div>
            <button class="btn ${can ? 'primary' : 'ghost'} small" data-action="buy-upgrade" data-id="${u.id}" ${maxed || !can ? 'disabled' : ''}>
              ${costLabel}
            </button>
          </div>
        </div>`;
      });

      html += `<p class="muted tiny pad">Timed hunts (10 min · replaces active boost)</p>`;
      (D.forgeBoosts || []).forEach(b => {
        const matsOk = !b.costMats || Object.keys(b.costMats).every(id => (mats[id] || 0) >= b.costMats[id]);
        const costLabel = Object.keys(b.costMats || {}).map(id => {
          const meta = matDefs[id] || { emoji: '🧰' };
          return (meta.emoji || '') + b.costMats[id];
        }).join(' ');
        html += `<div class="card upgrade-card">
          <div class="card-head">
            <span class="emoji">${b.emoji}</span>
            <div class="grow">
              <h3>${b.name}</h3>
              <p class="muted tiny">${b.desc}</p>
            </div>
            <button class="btn ${matsOk ? 'primary' : 'ghost'} small" data-action="buy-forge-boost" data-id="${b.id}" ${matsOk ? '' : 'disabled'}>
              ${costLabel}
            </button>
          </div>
        </div>`;
      });
    }

    html += `<h3 class="section-title">📜 Sigil Charter (${F.num(state.sigilCurrency)} Sigils)</h3>`;
    if (state.prestigeCount === 0 && state.sigilCurrency === 0) {
      html += `<p class="muted tiny pad">Earn Sigils by rewriting the guild charter (prestige) on the Guild tab.</p>`;
    }
    (D.sigilShop || []).forEach(s => {
      const lv = state.sigils[s.id] || 0;
      const can = state.sigilCurrency >= s.cost;
      html += `<div class="card upgrade-card">
        <div class="card-head">
          <span class="emoji">${s.emoji}</span>
          <div class="grow">
            <h3>${s.name} <span class="muted">×${lv}</span></h3>
            <p class="muted tiny">${s.desc}</p>
          </div>
          <button class="btn ${can ? 'primary' : 'ghost'} small" data-action="buy-sigil" data-id="${s.id}" ${can ? '' : 'disabled'}>
            ${s.cost}◈
          </button>
        </div>
      </div>`;
    });
    return html;
  }


  /** iom7 — Armor rows (legs / body / helm): next tier, cost, stat; greyed with a reason. */
  function renderArmorRows(state) {
    const S = window.CB_STATE;
    const F = window.CB_FMT;
    const D = window.CB_DATA;
    if (!S.armorList || !D.ARMOR_SLOTS) return '';
    S.ensureGear(state);
    const eg = S.equippedGear(state);
    const b = S.getBonuses(state);
    const gb = S.gearBonuses(state);
    const pct = (v) => (Math.round(v * 1000) / 10) + '%';
    const statTxt = (it) => {
      if (!it || !it.effect) return '';
      const e = it.effect;
      const parts = [];
      if (e.killMult) parts.push('+' + pct(e.killMult) + ' weapon dmg');
      if (e.lootGold) parts.push('+' + pct(e.lootGold) + ' loot gold');
      if (e.critChance) parts.push('+' + pct(e.critChance) + ' crit');
      if (e.pointsMult) parts.push('+' + pct(e.pointsMult) + ' Slayer points');
      if (e.offlineCap) parts.push('+' + pct(e.offlineCap) + ' offline cap');
      return parts.join(' · ');
    };
    const wName = eg.weapon ? eg.weapon.name : 'None';
    const critOn = !!(state.features && state.features.crits);
    let html = `<div class="card armor-card" id="armor-summary">
      <h3>🛡️ Armor <span class="muted tiny">— what you wear shows on your hunter</span></h3>
      <p class="tiny armor-stats" id="armor-stats">
        <span>Weapon: <b>${wName}</b></span> ·
        <span>Weapon dmg <b data-stat="killMult">×${b.killMult.toFixed(2)}</b></span> ·
        <span>Loot gold <b data-stat="lootLuck">×${b.lootLuck.toFixed(2)}</b></span> ·
        <span>Crit <b data-stat="crit">${critOn ? pct(b.critChance) : 'locked'}</b></span>
      </p>
      <p class="muted tiny">From armor: +${pct(gb.killMult)} dmg · +${pct(gb.lootGold)} loot gold · +${pct(gb.critChance)} crit</p>
    </div>`;
    Object.keys(D.ARMOR_SLOTS).forEach((slot) => {
      const def = D.ARMOR_SLOTS[slot];
      const cur = eg[slot];
      const next = S.nextArmorFor(state, slot);
      let action = '';
      let reason = '';
      if (!next) {
        action = '<span class="success tiny">Maxed</span>';
      } else {
        const chk = S.armorBuyCheck(state, next.id);
        const cost = F.goldChipHtml ? F.goldChipHtml(next.cost) : (F.num(next.cost) + ' gold');
        const can = !!chk.ok;
        if (!can) reason = chk.reason || '';
        action = `<button type="button" class="btn ${can ? 'primary' : 'ghost'} small" data-action="buy-armor" data-id="${next.id}" ${can ? '' : 'disabled aria-disabled="true"'} title="${reason}">${cost}</button>`;
      }
      // Owned alternatives (e.g. Slayer helm vs metal helm)
      let swap = '';
      const g = state.gear || { owned: {} };
      const alts = [];
      if (slot === 'helm' && g.owned.helm_slayer) alts.push(S.getGearItem('helm_slayer'));
      if (slot === 'helm' && g.owned.helm_slayer) {
        let bestMetal = null;
        S.armorList().forEach((a) => { if (a.slot === 'helm' && g.owned[a.id]) bestMetal = a; });
        if (bestMetal) alts.push(bestMetal);
      }
      alts.forEach((it) => {
        if (!it || (cur && cur.id === it.id)) return;
        swap += ` <button type="button" class="btn ghost tiny" data-action="equip-armor" data-id="${it.id}">Equip ${it.name}</button>`;
      });
      const locked = (S.getSlayerLevel(state) < def.minSlayerLevel);
      html += `<div class="card armor-row${locked ? ' locked' : ''}" data-armor-slot="${slot}">
        <div class="card-head">
          <div class="grow">
            <h3>${def.label} <span class="muted tiny">· ${def.statLabel}</span></h3>
            <p class="tiny">Equipped: <b class="armor-equipped">${cur ? cur.name : 'Nothing'}</b>${cur ? ' <span class="muted">(' + statTxt(cur) + ')</span>' : ''}${swap}</p>
            ${next ? `<p class="muted tiny">Next: ${next.name} · ${statTxt(next)}${reason ? ' · <span class="armor-reason">' + reason + '</span>' : ''}</p>` : ''}
          </div>
          <div class="col-actions">${action}</div>
        </div>
      </div>`;
    });
    if (!critOn) html += `<p class="muted tiny pad">Helm crit applies once Crits are unlocked (Combat).</p>`;
    return html;
  }

  function renderSmithingPanel(state) {
    const S = window.CB_STATE;
    const F = window.CB_FMT;
    const D = window.CB_DATA;
    const sl = (S.getSlayerLevel && S.getSlayerLevel(state)) || 1;
    const title = (D.nameOf && D.nameOf('smithing')) || 'Smithing';
    let html = `<div class="card compact-card"><p class="tiny muted">${title} — armor (resets on prestige; earned Slayer cape/helm are kept) and Tempered Edge (survives prestige). Unlocks at Slayer level 2.</p></div>`;
    if (sl < 2) {
      html += `<div class="card"><p class="muted">Locked — reach Slayer level 2 (earn Slayer XP from kills).</p></div>`;
      return html;
    }
    html += renderArmorRows(state);
    const u = D.upgrades.find(x => x.id === 'tempered_edge');
    if (u) {
      const lv = S.getUpgradeLevel(state, u.id);
      const cost = S.upgradeCost(u, lv);
      const maxed = lv >= u.maxLevel;
      const can = !maxed && (state.gold || 0) >= cost;
      const nm = (u.nameKey && D.nameOf) ? D.nameOf(u.nameKey) : u.name;
      html += `<div class="card">
        <h3>${u.emoji || '🔨'} ${nm} <span class="muted">Lv ${lv}/${u.maxLevel}</span></h3>
        <p class="muted tiny">${u.desc}</p>
        <button type="button" class="btn ${can ? 'primary' : 'ghost'} small" data-action="buy-upgrade" data-id="${u.id}" ${can ? '' : 'disabled'}>${maxed ? 'Maxed' : (F.goldChipHtml ? F.goldChipHtml(cost) : (F.num(cost) + ' gold'))}</button>
      </div>`;
    }
    html += `<div class="card compact-card"><p class="tiny muted">Forge one-shots (Pelt Guard / Fang Charm / Thread Tip) stay under Camp → Forge.</p></div>`;
    return html;
  }

  function renderPrayerPanel(state) {
    const S = window.CB_STATE;
    const F = window.CB_FMT;
    const D = window.CB_DATA;
    const sl = (S.getSlayerLevel && S.getSlayerLevel(state)) || 1;
    const title = (D.nameOf && D.nameOf('prayer')) || 'Prayer';
    const ppLab = (D.nameOf && D.nameOf('prayer_points')) || 'Prayer points';
    let html = `<div class="card compact-card"><p class="tiny muted">${title} board — permanent named skills. ${ppLab}: ${F.num(state.prayerPoints || 0)}. Earn 1 per Tier Test clear.</p></div>`;
    if (sl < 6) {
      html += `<div class="card"><p class="muted">Locked — reach Slayer level 6.</p></div>`;
      return html;
    }
    (D.prayerSkills || []).forEach((sk) => {
      const owned = !!(state.prayers && state.prayers[sk.id]);
      const nm = (sk.nameKey && D.nameOf) ? D.nameOf(sk.nameKey) : sk.id;
      const can = !owned && (state.prayerPoints || 0) >= (sk.cost | 0);
      html += `<div class="card">
        <h3>${sk.emoji || '🙏'} ${nm}</h3>
        <p class="muted tiny">${sk.desc}</p>
        ${owned
          ? '<span class="success tiny">Learned</span>'
          : `<button type="button" class="btn ${can ? 'primary' : 'ghost'} small" data-action="buy-prayer" data-id="${sk.id}" ${can ? '' : 'disabled'}>${sk.cost} ${ppLab}</button>`}
      </div>`;
    });
    return html;
  }

  function setStrip(id, state) {
    if (!STRIPS.some(s => s.id === id)) return;
    activeStrip = id;
    if (state) renderMaps(state);
  }

  function bindStripToggles(panel, state) {
    panel.querySelectorAll('[data-prog-strip]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeStrip = btn.getAttribute('data-prog-strip') || 'combat';
        renderMaps(state);
      });
    });
  }

  function renderMaps(state) {
    const panel = document.getElementById('maps-body');
    if (!panel) return;
    const D = window.CB_DATA;
    const F = window.CB_FMT;
    const maps = D.progressionMaps || {};
    if (!STRIPS.some(s => s.id === activeStrip)) activeStrip = 'combat';

    let html = `<div class="card compact-card">
      <strong>Progress</strong>
      <p class="tiny muted">Slayer level gates systems; buy nodes when you can afford them — no time locks.</p>
      <p class="muted tiny">Camp is food/offline/luck — not a second gear list.</p>
    </div>`;

    const slNow = (window.CB_STATE.getSlayerLevel && window.CB_STATE.getSlayerLevel(state)) || 1;
    html += `<div class="prog-strips" role="tablist" aria-label="Progress strips">`;
    STRIPS.forEach(s => {
      const on = s.id === activeStrip;
      const locked = s.minSlayerLevel && slNow < s.minSlayerLevel;
      const lab = locked ? (s.label + ' 🔒') : s.label;
      html += `<button type="button" class="prog-strip-btn ${on ? 'active' : ''} ${locked ? 'locked' : ''}" data-prog-strip="${s.id}" role="tab" aria-selected="${on}">${s.ico} ${lab}</button>`;
    });
    html += `</div>`;

    html += `<div class="prog-strip-panel" data-active="${activeStrip}">`;
    if (activeStrip === 'camp') {
      html += `<h3 class="section-title">🏕️ Camp</h3>`;
      html += renderCampPanel(state);
    } else if (activeStrip === 'smithing') {
      const smName = (D.nameOf && D.nameOf('smithing')) || 'Smithing';
      html += `<h3 class="section-title">🔨 ${smName}</h3>`;
      html += renderSmithingPanel(state);
    } else if (activeStrip === 'prayer') {
      const prName = (D.nameOf && D.nameOf('prayer')) || 'Prayer';
      html += `<h3 class="section-title">🙏 ${prName}</h3>`;
      html += renderPrayerPanel(state);
    } else {
      const titles = { combat: '⚔️ Combat', gear: '🗡️ Gear', company: '👥 Company' };
      html += `<h3 class="section-title">${titles[activeStrip] || activeStrip}</h3>`;
      html += `<p class="muted tiny pad">Slayer level ${slNow} · gates unlock systems; costs are still gold / points.</p>`;
      html += renderMap(state, activeStrip, maps[activeStrip] || []);
    }
    html += `</div>`;

    panel.innerHTML = html;
    bindStripToggles(panel, state);
    try {
      if (window.CB_INTRO && window.CB_INTRO.refresh) window.CB_INTRO.refresh(state);
    } catch (e) { /* soft */ }
  }

  window.CB_MAPS = { renderMaps, nodeStatus, setStrip, getStrip: () => activeStrip };
})();
