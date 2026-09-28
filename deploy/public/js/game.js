/** Main loop, boot, visibility/offline handling */
(function () {
  let state = null;
  let tickTimer = null;
  let saveTimer = null;
  let currentTab = 'hunt';
  let pendingClaim = false;
  let lastTickGains = null;

  /** One-line purchase feedback for Company combat upgrades (not a blocking modal). */
  function companyUpgradeToast(upgradeId) {
    const u = window.CB_DATA && window.CB_DATA.upgrades.find(x => x.id === upgradeId);
    if (!u || !u.effect) return null;
    const e = u.effect;
    const who = 'Briar & Quill';
    if (e.hunterDmg) return who + ': +' + Math.round(e.hunterDmg * 100) + '% bigger hits';
    if (e.hunterAtkSpeed) return who + ': +' + Math.round(e.hunterAtkSpeed * 100) + '% faster attacks';
    if (e.hunterPower) return who + ': +' + Math.round(e.hunterPower * 100) + '% overall power';
    if (e.hunterMoveSpeed) return 'Melee walk/chase (Briar): +' + Math.round(e.hunterMoveSpeed * 100) + '% speed';
    if (e.quillDmg) return 'Quill: +' + Math.round(e.quillDmg * 100) + '% arrow damage';
    if (e.quillAtkSpeed) return 'Quill: +' + Math.round(e.quillAtkSpeed * 100) + '% attack speed';
    if (e.quillMultishot) return 'Quill Multishot: +' + e.quillMultishot + ' arrow(s) per shot';
    if (e.quillProjSpeed) return 'Quill: +' + Math.round(e.quillProjSpeed * 100) + '% arrow speed';
    if (e.briarDmg) {
      if (upgradeId === 'briar_blade') return 'Briar Blade: +' + Math.round(e.briarDmg * 100) + '% Briar-only damage';
      if (upgradeId === 'briar_strength') return 'Briar Strength: +' + Math.round(e.briarDmg * 100) + '% Briar-only damage';
      return 'Briar: +' + Math.round(e.briarDmg * 100) + '% Briar-only damage';
    }
    if (e.unlockHunter) {
      const h = window.CB_DATA.hunters.find(x => x.id === e.unlockHunter);
      return h ? ('Hired ' + h.name + '!') : 'Hunter hired!';
    }
    if (e.scrapChance) return u.name + ': +' + Math.round(e.scrapChance * 100) + '% scrap chance';
    if (e.killMult) return u.name + ': +' + Math.round(e.killMult * 100) + '% bolt kill power';
    if (e.offlineCapMin && u.costCurrency === 'scraps') return u.name + ': +' + e.offlineCapMin + ' min offline';
    if (e.foodCap && u.costCurrency === 'scraps') return u.name + ': +' + e.foodCap + ' food cap · +' + (e.foodRegen || 0) + '/min';
    if (e.lootLuck && u.costCurrency === 'scraps') return u.name + ': +' + Math.round(e.lootLuck * 100) + '% gold loot';
    if (e.offlineCapMin && u.costMats) return u.name + ': +' + e.offlineCapMin + ' min offline';
    return null;
  }


  function watchNavHeight() {
    const nav = document.querySelector('.nav');
    const hud = document.getElementById('top-hud') || document.querySelector('.header');
    const apply = () => {
      if (nav) {
        const h = Math.ceil(nav.getBoundingClientRect().height || 0);
        if (h > 0) document.documentElement.style.setProperty('--nav-h', h + 'px');
      }
      if (hud) {
        const hh = Math.ceil(hud.getBoundingClientRect().height || 0);
        if (hh > 0) document.documentElement.style.setProperty('--hud-h', hh + 'px');
      }
    };
    apply();
    if (typeof ResizeObserver !== 'undefined') {
      try {
        const ro = new ResizeObserver(apply);
        if (nav) ro.observe(nav);
        if (hud) ro.observe(hud);
      } catch (e) { /* soft */ }
    }
    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('orientationchange', apply, { passive: true });
  }

  function boot() {
    state = window.CB_STATE.load();
    state.holding = false;
    if (window.CB_CHESTS) window.CB_CHESTS.ensure(state);
    if (!state.settings) {
      state.settings = { masterVol: 100, sfxVol: 70, musicVol: 100, muted: false, reduceMotion: false };
    }
    if (window.CB_AUDIO && window.CB_AUDIO.applyPrefs) {
      try { window.CB_AUDIO.applyPrefs(state.settings); } catch (e) { /* soft */ }
    }
    if (window.CB_UI && window.CB_UI.applyMotionPref) {
      try { window.CB_UI.applyMotionPref(state); } catch (e) { /* soft */ }
    }
    // Ensure food cap synced
    const b = window.CB_STATE.getBonuses(state);
    state.foodCap = b.foodCap;

    if (window.CB_ARENA) {
      window.CB_ARENA.bind({
        getState: () => state,
        onHoldChange: () => {
          // Immediate soft refresh so rates jump while holding
          if (currentTab === 'hunt') window.CB_UI.renderHunt(state, { soft: true });
        },
      });
    }

    window.CB_UI.bindGlobal(onAction);
    applyOfflineOnBoot();

    // Fresh / tutorial onboarding: land on action immediately
    maybeAutoTutorial();

    window.CB_UI.renderAll(state, currentTab);
    document.body.classList.toggle('tab-hunt', currentTab === 'hunt');
    watchNavHeight();
    if (window.CB_AUTH && window.CB_AUTH.boot) {
      try { window.CB_AUTH.boot(); } catch (e) { /* soft — static hosts */ }
    }
    if (window.CB_ARENA) window.CB_ARENA.startLoop();
    if (window.CB_AUDIO && window.CB_AUDIO.setHuntActive) {
      try { window.CB_AUDIO.setHuntActive(currentTab === 'hunt'); } catch (e) { /* soft */ }
    }

    startTick();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', () => persist());
    window.addEventListener('beforeunload', () => persist());

    // Expose for debugging / offline simulation
    window.CB_GAME = {
      getState: () => state,
      persist,
      simulateAway,
      onClaimClosed,
      forceTick: () => tick(true),
      setPlayMs: (ms) => {
        state.playMs = Math.max(0, Number(ms) || 0);
        persist();
        window.CB_UI?.renderAll?.(state, currentTab);
        return state.playMs;
      },
      fillChests: () => {
        if (!window.CB_CHESTS) return null;
        const c = window.CB_CHESTS.fillChests(state);
        persist();
        if (window.CB_CHESTS.syncOverlay) window.CB_CHESTS.syncOverlay(state);
        // Ready caskets jiggle on the left — no toast spam
        return c;
      },
      resetIntro: () => {
        if (!window.CB_INTRO) return null;
        return window.CB_INTRO.resetIntro(state);
      },
      
      grantScraps: (n) => {
        state.scraps = (state.scraps || 0) + (Number(n) || 0);
        persist();
        window.CB_UI?.renderAll?.(state, currentTab);
        return state.scraps;
      },
      grantMats: (id, n) => {
        if (!state.mats) state.mats = {};
        const key = id || 'pelt_scrap';
        state.mats[key] = (state.mats[key] || 0) + (Number(n) || 0);
        persist();
        window.CB_UI?.renderAll?.(state, currentTab);
        return state.mats;
      },
      scrapChanceNow: () => {
        const b = window.CB_STATE.getBonuses(state);
        const c = state.currentContractId && window.CB_STATE.getContract(state.currentContractId);
        if (!c) return { scrapChanceMult: b.scrapChanceMult, capped: null };
        const raw = c.scrapChance * b.scrapChanceMult;
        return { scrapChanceMult: b.scrapChanceMult, raw, capped: Math.min(0.95, raw) };
      },
getTab: () => currentTab,
    };

    // First-run intro overlay
    if (window.CB_INTRO) {
      window.CB_INTRO.migrate(state);
      window.CB_INTRO.refresh(state);
      window.CB_INTRO.startLoop();
    }
  }

  function maybeAutoTutorial() {
    if (state.currentContractId) return;
    if ((state.totalKills || 0) > 0) return;
    const r = window.CB_STATE.acceptContract(state, 'bristle_cub');
    if (r.ok) {
      persist();
      // Hold tip is the arena coach only — no toast (avoids covering monster chip)
    }
  }

  function applyOfflineOnBoot() {
    const now = Date.now();
    const elapsed = Math.max(0, now - (state.lastTickAt || now));
    state.lastTickAt = now;
    if (elapsed < 2000) {
      persist();
      return;
    }
    const gains = window.CB_STATE.applyIdle(state, elapsed);
    state.stats.offlineClaims = (state.stats.offlineClaims || 0) + 1;
    persist();
    pendingClaim = true;
    // Slight delay so DOM is ready
    setTimeout(() => window.CB_UI.showClaimModal(gains), 120);
  }

  function onClaimClosed() {
    pendingClaim = false;
    window.CB_UI.renderAll(state, currentTab);
  }

  function onVisibility() {
    if (document.hidden) {
      state.holding = false;
      if (window.CB_ARENA) window.CB_ARENA.setHolding(false);
      persist();
      stopTick();
      if (window.CB_ARENA) window.CB_ARENA.stopLoop();
      return;
    }
    // Returning
    const now = Date.now();
    const elapsed = Math.max(0, now - (state.lastTickAt || now));
    state.lastTickAt = now;
    if (elapsed >= 2000) {
      const gains = window.CB_STATE.applyIdle(state, elapsed);
      persist();
      if (gains.kills >= 0.5 || gains.gold >= 1) {
        pendingClaim = true;
        window.CB_UI.showClaimModal(gains);
      }
    }
    window.CB_UI.renderAll(state, currentTab);
    startTick();
    if (window.CB_ARENA) window.CB_ARENA.startLoop();
  }

  function startTick() {
    stopTick();
    tickTimer = setInterval(() => tick(false), window.CB_DATA.TICK_MS);
  }

  function stopTick() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
  }

  function tick(force) {
    if (document.hidden && !force) return;
    const now = Date.now();
    const elapsed = Math.max(0, now - (state.lastTickAt || now));
    state.lastTickAt = now;
    // Sync hold into economy
    if (window.CB_ARENA) {
      state.holding = window.CB_ARENA.isHolding();
    }
    // Cap single visible tick to avoid huge catch-up mid-session without modal
    const ms = Math.min(elapsed, window.CB_DATA.TICK_MS * 3);
    let gains = null;
    if (ms > 0) {
      state.playMs = (state.playMs || 0) + ms;
      gains = window.CB_STATE.applyIdle(state, ms);
      lastTickGains = gains;
    }
    // Soft autosave
    if (!saveTimer) {
      saveTimer = setTimeout(() => {
        persist();
        saveTimer = null;
      }, 2500);
    }
    // Lightweight UI: header + soft hunt (no full HTML rebuild)
    window.CB_UI.renderTop(state);
    if (currentTab === 'hunt') {
      window.CB_UI.renderHunt(state, { soft: true, gains });
    }
    // Unlock celebrations + bounty chest toasts from this tick
    if (gains) {
      if (window.CB_UI.flushUnlockToasts) window.CB_UI.flushUnlockToasts(state);
      if (gains.bountyChests && gains.bountyChests.length) {
        gains.bountyChests.forEach(() => {
          window.CB_UI.toast('🎁 Bounty chest!', { celebrate: true });
        });
        if (window.CB_CHESTS && window.CB_CHESTS.syncOverlay) {
          window.CB_CHESTS.syncOverlay(state);
        }
      }
    }
  }

  function persist() {
    state.lastTickAt = Date.now();
    window.CB_STATE.save(state);
  }

  /** Dev helper: rewind lastTickAt and trigger visibility claim */
  function simulateAway(minutes) {
    state.lastTickAt = Date.now() - minutes * 60000;
    window.CB_STATE.save(state);
    const elapsed = minutes * 60000;
    const gains = window.CB_STATE.applyIdle(state, elapsed);
    state.lastTickAt = Date.now();
    persist();
    window.CB_UI.showClaimModal(gains);
    window.CB_UI.renderAll(state, currentTab);
    return gains;
  }

  function onAction(action, id, el) {
    const S = window.CB_STATE;
    switch (action) {
      case 'tab':
        if (id !== currentTab && window.CB_AUDIO && window.CB_AUDIO.tabSwitch) {
          try { window.CB_AUDIO.tabSwitch(); } catch (e) { /* soft */ }
        }
        currentTab = id;
        window.CB_UI.renderAll(state, currentTab);
        if (id === 'hunt' && window.CB_ARENA) {
          window.CB_ARENA.markDirty();
          window.CB_ARENA.render(state);
        }
        if (window.CB_AUDIO && window.CB_AUDIO.setHuntActive) {
          try { window.CB_AUDIO.setHuntActive(id === 'hunt'); } catch (e) { /* soft */ }
        }
        if (window.CB_INTRO) window.CB_INTRO.note('tab', id);
        break;
      case 'goto-board':
        currentTab = 'board';
        window.CB_UI.setTab('board');
        window.CB_UI.renderAll(state, 'board');
        if (window.CB_INTRO) window.CB_INTRO.note('tab', 'board');
        break;
      case 'accept': {
        const r = S.acceptContract(state, id);
        if (!r.ok) window.CB_UI.toast(r.reason);
        else {
          window.CB_UI.toast('Contract accepted');
          persist();
          currentTab = 'hunt';
          window.CB_UI.setTab('hunt');
          if (window.CB_ARENA) window.CB_ARENA.markDirty();
          window.CB_UI.renderAll(state, 'hunt');
          if (window.CB_INTRO) window.CB_INTRO.note('accept', id);
        }
        break;
      }
      case 'buy-upgrade': {
        const wasEarly = !!(S.inEarlyWindow && S.inEarlyWindow(state));
        const r = S.buyUpgrade(state, id);
        if (!r.ok) window.CB_UI.toast(r.reason || 'Cannot buy');
        else {
          if (id === 'hunter_briar' && wasEarly && S.inEarlyWindow) {
            S.inEarlyWindow(state); // closes the early window for good
            window.CB_UI.toast("Your Warrior hunts while you're away. Tasks are back to full size.", { ms: 4200 });
          } else {
            window.CB_UI.toast(companyUpgradeToast(id) || 'Upgraded!');
          }
          if (window.CB_AUDIO) {
            try { window.CB_AUDIO.play('upgrade_purchase'); } catch (e) { /* soft */ }
          }
          persist();
          if (window.CB_ARENA) window.CB_ARENA.markDirty();
          window.CB_UI.renderAll(state, currentTab);
          if (window.CB_INTRO) window.CB_INTRO.refresh(state);
        }
        break;
      }
      case 'buy-armor': {
        const r = S.buyArmor(state, id);
        if (!r.ok) window.CB_UI.toast(r.reason || 'Cannot buy');
        else {
          // Equip toast only — no sound (brief)
          window.CB_UI.toast('Equipped: ' + r.item.name);
          persist();
          window.CB_UI.renderAll(state, currentTab);
          if (window.CB_INTRO) window.CB_INTRO.refresh(state);
        }
        break;
      }
      case 'equip-armor': {
        const r = S.equipGear(state, id);
        if (!r.ok) window.CB_UI.toast(r.reason || 'Cannot equip');
        else {
          window.CB_UI.toast('Equipped: ' + r.item.name);
          persist();
          window.CB_UI.renderAll(state, currentTab);
        }
        break;
      }
      case 'buy-prayer': {
        const r = S.buyPrayer(state, id);
        if (!r.ok) window.CB_UI.toast(r.reason || 'Cannot learn');
        else {
          const nm = (r.skill && r.skill.nameKey && window.CB_DATA.nameOf)
            ? window.CB_DATA.nameOf(r.skill.nameKey) : (id || 'Prayer');
          window.CB_UI.toast('Learned ' + nm);
          persist();
          window.CB_UI.renderAll(state, currentTab);
        }
        break;
      }
      
      case 'buy-forge-boost': {
        const r = S.buyForgeBoost(state, id);
        if (!r.ok) window.CB_UI.toast(r.reason || 'Cannot craft');
        else {
          const b = r.boost;
          window.CB_UI.toast((b.emoji || '⚒️') + ' ' + (b.name || 'Forge boost') + ' — 10 min');
          if (window.CB_AUDIO) {
            try { window.CB_AUDIO.play('upgrade_purchase'); } catch (e) { /* soft */ }
          }
          persist();
          if (window.CB_ARENA) window.CB_ARENA.markDirty();
          window.CB_UI.renderAll(state, currentTab);
        }
        break;
      }
case 'buy-sigil': {
        const r = S.buySigil(state, id);
        if (!r.ok) window.CB_UI.toast(r.reason || 'Cannot buy');
        else {
          window.CB_UI.toast('Sigil inscribed');
          persist();
          window.CB_UI.renderAll(state, currentTab);
        }
        break;
      }
      case 'finish-prey': {
        // Legacy Claim removed — redirect to Fight boss
        window.CB_UI.toast('Use Fight boss on the Level boss card');
        break;
      }
      case 'fight-boss': {
        const r = S.startBossFight(state, id);
        if (!r.ok) window.CB_UI.toast(r.reason || 'Cannot fight boss');
        else {
          window.CB_UI.toast('Fight boss · ' + (S.bossDisplayName(r.prey) || r.prey.name));
          persist();
          if (window.CB_ARENA) window.CB_ARENA.markDirty();
          window.CB_UI.renderAll(state, 'hunt');
          currentTab = 'hunt';
          window.CB_UI.setTab('hunt');
          if (window.CB_INTRO) window.CB_INTRO.note('fight-boss', id);
        }
        break;
      }
      case 'flee-boss': {
        S.clearBossFight(state);
        window.CB_UI.toast('Left the fight — boss HP resets, access kept');
        persist();
        if (window.CB_ARENA) window.CB_ARENA.markDirty();
        currentTab = 'hunt';
        window.CB_UI.setTab('hunt');
        window.CB_UI.renderAll(state, 'hunt');
        break;
      }
      case 'buy-food': {
        const r = S.buyFood(state);
        if (!r.ok) window.CB_UI.toast(r.reason || 'Cannot buy food');
        else {
          persist();
          window.CB_UI.renderTop(state);
          if (currentTab === 'hunt') window.CB_UI.renderHunt(state, { soft: true });
          else window.CB_UI.renderAll(state, currentTab);
          if (window.CB_INTRO) window.CB_INTRO.note('buy-food');
        }
        break;
      }
      case 'toggle-auto':
        if (S.getUpgradeLevel(state, 'auto_accept') >= 1) {
          state.autoAccept = !!el.checked;
          persist();
          window.CB_UI.toast(state.autoAccept ? 'Auto-accept on' : 'Auto-accept off');
        }
        break;
      case 'prestige': {
        if (!confirm('Rewrite the guild charter? Run upgrades reset. Relics & hunters kept.')) break;
        const r = S.doPrestige(state);
        if (!r.ok) window.CB_UI.toast(r.reason);
        else {
          let capeMsg = '';
          if (r.cape && r.cape.ok) capeMsg = r.cape.trimAdded ? ' · Slayer cape trim ' + r.cape.capeTrim : (state.prestigeCount === 1 ? ' · Equipped: Slayer cape' : '');
          window.CB_UI.toast(`Charter rewritten · +${r.sigilsEarned} Sigils` + capeMsg);
          persist();
          maybeAutoTutorial();
          if (window.CB_ARENA) window.CB_ARENA.markDirty();
          window.CB_UI.renderAll(state, currentTab);
        }
        break;
      }
      case 'reset-save': {
        if (!confirm('Delete ALL progress? This cannot be undone.')) break;
        localStorage.removeItem(window.CB_DATA.SAVE_KEY);
        state = S.defaultState();
        state.holding = false;
        maybeAutoTutorial();
        persist();
        window.CB_UI.toast('Hold toward a monster to fire bolts', { ms: 3800 });
        if (window.CB_ARENA) window.CB_ARENA.markDirty();
        window.CB_UI.renderAll(state, 'hunt');
        currentTab = 'hunt';
        window.CB_UI.setTab('hunt');
        if (window.CB_INTRO) {
          window.CB_INTRO.migrate(state);
          window.CB_INTRO.refresh(state);
        }
        break;
      }
      case 'claim-chest': {
        if (!window.CB_CHESTS) break;
        const kind = id;
        const result = kind === 'boost'
          ? window.CB_CHESTS.claimBoost(state)
          : window.CB_CHESTS.claimPermanent(state);
        if (!result.ok) {
          window.CB_UI.toast(result.reason || 'Not ready');
          break;
        }
        if (window.CB_AUDIO) {
          try { window.CB_AUDIO.play('chest_open'); } catch (e) { /* soft */ }
        }
        persist();
        window.CB_CHESTS.syncOverlay(state);
        window.CB_CHESTS.showClaimResult(result);
        window.CB_UI.renderTop(state);
        if (currentTab === 'hunt') window.CB_UI.renderHunt(state, { soft: true });
        if (window.CB_INTRO) window.CB_INTRO.note('claim-chest', kind);
        break;
      }
      case 'improve-mastery': {
        const r = S.improveMastery(state, id);
        if (!r.ok) window.CB_UI.toast(r.reason || 'Cannot improve');
        else {
          window.CB_UI.toast(
            'Bounty mastery ' + r.mastery + '/10 · chest ' + (r.chestChance * 100).toFixed(2) + '%',
            { celebrate: true }
          );
          persist();
          window.CB_UI.renderAll(state, currentTab);
          if (window.CB_INTRO) window.CB_INTRO.note('improve-mastery', id);
        }
        break;
      }
      case 'settings-vol': {
        if (!state.settings) state.settings = { masterVol: 100, sfxVol: 70, musicVol: 100, muted: false, reduceMotion: false };
        const v = Math.max(0, Math.min(100, Number(el && el.value) || 0));
        if (id === 'set-master') state.settings.masterVol = v;
        else if (id === 'set-sfx') {
          state.settings.sfxVol = v;
          state.settings.sfxUserSet = true; // explicit player choice — never overridden
          if (window.CB_AUDIO && window.CB_AUDIO.setSfxEnabled) window.CB_AUDIO.setSfxEnabled(v > 0);
        }
        else if (id === 'set-music') state.settings.musicVol = v;
        if (window.CB_AUDIO && window.CB_AUDIO.applyPrefs) window.CB_AUDIO.applyPrefs(state.settings);
        persist();
        break;
      }
      case 'settings-mute': {
        if (!state.settings) state.settings = { masterVol: 100, sfxVol: 70, musicVol: 100, muted: false, reduceMotion: false };
        state.settings.muted = !!(el && el.checked);
        if (window.CB_AUDIO && window.CB_AUDIO.applyPrefs) window.CB_AUDIO.applyPrefs(state.settings);
        persist();
        break;
      }
      case 'settings-motion': {
        if (!state.settings) state.settings = { masterVol: 100, sfxVol: 70, musicVol: 100, muted: false, reduceMotion: false };
        state.settings.reduceMotion = !!(el && el.checked);
        if (window.CB_UI && window.CB_UI.applyMotionPref) window.CB_UI.applyMotionPref(state);
        persist();
        break;
      }
      case 'open-auth': {
        if (window.CB_AUTH && window.CB_AUTH.openModal) window.CB_AUTH.openModal();
        break;
      }
      case 'auth-logout': {
        if (window.CB_AUTH && window.CB_AUTH.onLogout) window.CB_AUTH.onLogout();
        window.CB_UI.renderSettings(state);
        break;
      }
      case 'reset-intro': {
        if (window.CB_INTRO && window.CB_INTRO.resetIntro) {
          window.CB_INTRO.resetIntro(state);
          window.CB_UI.toast('Intro tutorial reset');
          persist();
          currentTab = 'hunt';
          window.CB_UI.setTab('hunt');
          window.CB_UI.renderAll(state, 'hunt');
        }
        break;
      }
      case 'export-save': {
        try {
          const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'afk-slayer-save.json';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
          window.CB_UI.toast('Save exported');
        } catch (e) {
          window.CB_UI.toast('Export failed');
        }
        break;
      }
      case 'wipe-save': {
        const btn = el || document.getElementById('wipe-save-btn');
        if (!btn || !btn.dataset.confirmWipe) {
          if (btn) {
            btn.dataset.confirmWipe = '1';
            btn.textContent = 'Tap again to confirm wipe';
            setTimeout(() => {
              if (btn.dataset.confirmWipe) {
                delete btn.dataset.confirmWipe;
                btn.textContent = 'Wipe save…';
              }
            }, 4000);
          }
          window.CB_UI.toast('Tap Wipe again to confirm', { ms: 2500 });
          break;
        }
        localStorage.removeItem(window.CB_DATA.SAVE_KEY);
        state = S.defaultState();
        state.holding = false;
        maybeAutoTutorial();
        persist();
        if (window.CB_AUDIO && window.CB_AUDIO.applyPrefs) window.CB_AUDIO.applyPrefs(state.settings);
        window.CB_UI.toast('Save wiped — fresh start');
        if (window.CB_ARENA) window.CB_ARENA.markDirty();
        currentTab = 'hunt';
        window.CB_UI.setTab('hunt');
        window.CB_UI.renderAll(state, 'hunt');
        if (window.CB_INTRO) {
          window.CB_INTRO.migrate(state);
          window.CB_INTRO.refresh(state);
        }
        break;
      }
      case 'target-up': {
        if (window.CB_STATE.isBossFightActive && window.CB_STATE.isBossFightActive(state)) {
          window.CB_UI.toast('Leave the boss fight first');
          break;
        }
        const r = S.stepHuntTarget(state, +1);
        if (window.CB_ARENA && window.CB_ARENA.applyTargetSwitchResult) {
          window.CB_ARENA.applyTargetSwitchResult(r, +1);
        }
        if (r && r.ok) persist();
        break;
      }
      case 'target-down': {
        if (window.CB_STATE.isBossFightActive && window.CB_STATE.isBossFightActive(state)) {
          window.CB_UI.toast('Leave the boss fight first');
          break;
        }
        const r = S.stepHuntTarget(state, -1);
        if (window.CB_ARENA && window.CB_ARENA.applyTargetSwitchResult) {
          window.CB_ARENA.applyTargetSwitchResult(r, -1);
        }
        if (r && r.ok) persist();
        break;
      }
      case 'target-auto': {
        if (window.CB_STATE.isBossFightActive && window.CB_STATE.isBossFightActive(state)) {
          window.CB_UI.toast('Leave the boss fight first');
          break;
        }
        const on = !state.targetAuto;
        S.setTargetAuto(state, on);
        if (window.CB_ARENA && window.CB_ARENA.updateTargetSwitcher) {
          window.CB_ARENA.updateTargetSwitcher(state);
        }
        window.CB_UI.toast(on ? 'Auto target ON' : 'Auto target OFF', { ms: 1800 });
        persist();
        break;
      }
      default:
        break;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
