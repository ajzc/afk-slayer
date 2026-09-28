/** AFK Slayer — Google sign-in + cloud save. Guests keep localStorage. */
(function () {
  let googleClientId = null;
  let googleReady = false;
  let gsiLoaded = false;
  let me = { signedIn: false, email: null };
  let syncTimer = null;
  let mergePrompted = false;
  let pendingCredential = null;

  function progressScore(state) {
    if (!state) return 0;
    const gold = Number(state.gold) || 0;
    const points = Number(state.points) || 0;
    const playMs = Number(state.playMs) || 0;
    const kills = (state.stats && Number(state.stats.totalKills)) || 0;
    const ups = state.upgrades && typeof state.upgrades === 'object'
      ? Object.values(state.upgrades).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
    return playMs / 60000 + gold / 100 + points / 10 + kills + ups * 5;
  }

  async function api(path, opts) {
    const o = opts || {};
    const res = await fetch(path, Object.assign({
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
    }, o));
    let data = null;
    try { data = await res.json(); } catch (_) { data = null; }
    return { status: res.status, data };
  }

  function loadGsiScript() {
    return new Promise((resolve, reject) => {
      if (gsiLoaded && window.google && window.google.accounts) {
        resolve();
        return;
      }
      const existing = document.querySelector('script[data-gsi]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', reject);
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.dataset.gsi = '1';
      s.onload = () => { gsiLoaded = true; resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function refreshMe() {
    try {
      const st = await api('/api/status');
      if (st.data && st.data.ok) {
        googleClientId = st.data.googleClientId || null;
        googleReady = !!st.data.googleReady && !!googleClientId;
      }
    } catch (_) { /* static host */ }
    try {
      const { data } = await api('/api/me');
      if (data && data.ok) {
        me = { signedIn: !!data.signedIn, email: data.email || null };
        if (data.googleReady != null) googleReady = !!data.googleReady && !!googleClientId;
      }
    } catch (_) { /* offline */ }
    updateChip();
    return me;
  }

  function updateChip() {
    const chip = document.getElementById('account-chip');
    if (!chip) return;
    if (me.signedIn) {
      chip.classList.remove('coming-soon');
      const short = (me.email || 'Signed in').split('@')[0];
      chip.textContent = short;
      chip.title = 'Signed in as ' + me.email;
      return;
    }
    if (!googleReady) {
      chip.textContent = 'Sign in · soon';
      chip.classList.add('coming-soon');
      chip.title = 'Sign in with Google — waiting for Client ID';
      return;
    }
    chip.classList.remove('coming-soon');
    chip.textContent = 'Sign in';
    chip.title = 'Sign in with Google';
  }

  function ensureModal() {
    let modal = document.getElementById('auth-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="modal-sheet auth-sheet stone-panel">
        <h2 id="auth-title">Account</h2>
        <p class="muted tiny" id="auth-blurb">Sign in with Google so your save follows you across devices.</p>
        <div id="auth-body"></div>
        <p class="tiny muted" id="auth-msg" style="margin-top:8px"></p>
        <div class="settings-actions" style="margin-top:10px">
          <button type="button" class="btn ghost" id="auth-close">Close</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    modal.querySelector('#auth-close').addEventListener('click', closeModal);
    return modal;
  }

  function renderGoogleButton(container) {
    if (!container || !googleReady || !googleClientId) return;
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'gsi-btn-wrap';
    wrap.id = 'gsi-btn-' + Math.random().toString(36).slice(2, 8);
    container.appendChild(wrap);
    loadGsiScript().then(() => {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: onGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.renderButton(wrap, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 280,
        });
      } catch (e) {
        wrap.textContent = 'Google button failed to load.';
      }
    }).catch(() => {
      wrap.textContent = 'Could not load Google sign-in.';
    });
  }

  async function onGoogleCredential(response) {
    const msg = document.getElementById('auth-msg');
    if (msg) msg.textContent = 'Signing in…';
    const credential = response && response.credential;
    if (!credential) {
      if (msg) msg.textContent = 'No credential from Google.';
      return;
    }
    pendingCredential = credential;
    const { status, data } = await api('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    if (!data || !data.ok) {
      if (msg) msg.textContent = (data && (data.error || data.message)) || ('Failed (' + status + ')');
      return;
    }
    me = { signedIn: true, email: data.email };
    updateChip();
    if (msg) msg.textContent = 'Signed in as ' + data.email;
    await afterSignInMerge(data);
    closeModal();
    startCloudSync();
    if (window.CB_UI && window.CB_GAME) {
      try { window.CB_UI.renderSettings(window.CB_GAME.getState()); } catch (_) {}
    }
  }

  async function afterSignInMerge(verifyData) {
    if (mergePrompted) return;
    const local = window.CB_STATE ? window.CB_STATE.load() : null;
    const localScore = progressScore(local);
    const cloudScore = Number(verifyData.cloudProgress) || 0;
    const hasCloud = !!verifyData.hasCloudSave;

    if (!hasCloud && local) {
      await pushSave(local, true);
      if (window.CB_UI && window.CB_UI.toast) window.CB_UI.toast('Cloud save created from this device.');
      return;
    }
    if (hasCloud && (!local || localScore < 1)) {
      await pullAndApply();
      return;
    }
    if (hasCloud && local) {
      mergePrompted = true;
      if (cloudScore > localScore + 1) {
        if (window.confirm('Cloud save has more progress. Load cloud save on this device?')) {
          await pullAndApply();
        } else if (window.confirm('Keep local and overwrite cloud?')) {
          await pushSave(local, true);
        } else {
          if (window.CB_UI && window.CB_UI.toast) {
            window.CB_UI.toast('Kept local save. Cloud was not changed.');
          }
        }
      } else if (localScore > cloudScore + 1) {
        if (window.confirm('This device has more progress. Upload to cloud?')) {
          await pushSave(local, true);
        } else if (window.confirm('Load the older cloud save instead?')) {
          await pullAndApply();
        }
      } else {
        await pushSave(local, true);
      }
    }
  }

  async function pullAndApply() {
    const { data } = await api('/api/save');
    if (!data || !data.ok || !data.save) return;
    try {
      // If either local or cloud finished/skipped intro, keep introDone
      let local = null;
      try { local = JSON.parse(localStorage.getItem(window.CB_DATA.SAVE_KEY) || 'null'); } catch (_) {}
      if (window.CB_INTRO && window.CB_INTRO.stickyIntroDone) {
        window.CB_INTRO.stickyIntroDone(local, data.save);
      }
      localStorage.setItem(window.CB_DATA.SAVE_KEY, JSON.stringify(data.save));
      if (window.CB_UI && window.CB_UI.toast) window.CB_UI.toast('Loaded cloud save.');
      location.reload();
    } catch (e) {
      console.warn('cloud pull failed', e);
    }
  }

  async function pushSave(state, force) {
    if (!me.signedIn) return { ok: false };
    // Sticky introDone from cloud before overwrite
    try {
      const { data: cloudData } = await api('/api/save');
      if (cloudData && cloudData.save && window.CB_INTRO && window.CB_INTRO.stickyIntroDone) {
        window.CB_INTRO.stickyIntroDone(cloudData.save, state);
      }
    } catch (_) { /* soft — still push */ }
    const payload = JSON.stringify({ save: state, force: !!force });
    const { status, data } = await api('/api/save', { method: 'PUT', body: payload });
    if (data && data.ok) return { ok: true };
    return { ok: false, status, data };
  }

  function startCloudSync() {
    stopCloudSync();
    if (!me.signedIn) return;
    syncTimer = setInterval(() => {
      try {
        const st = window.CB_GAME && window.CB_GAME.getState && window.CB_GAME.getState();
        if (st) pushSave(st, false);
      } catch (_) {}
    }, 45000);
    document.addEventListener('visibilitychange', onVis);
  }

  function stopCloudSync() {
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = null;
    document.removeEventListener('visibilitychange', onVis);
  }

  function onVis() {
    if (document.visibilityState === 'hidden' && me.signedIn) {
      try {
        const st = window.CB_GAME && window.CB_GAME.getState && window.CB_GAME.getState();
        if (st) pushSave(st, false);
      } catch (_) {}
    }
  }

  async function onLogout() {
    await api('/api/logout', { method: 'POST', body: '{}' });
    me = { signedIn: false, email: null };
    stopCloudSync();
    updateChip();
    closeModal();
    if (window.CB_UI && window.CB_GAME) {
      try { window.CB_UI.renderSettings(window.CB_GAME.getState()); } catch (_) {}
    }
  }

  function openModal() {
    const modal = ensureModal();
    const body = modal.querySelector('#auth-body');
    const blurb = modal.querySelector('#auth-blurb');
    const title = modal.querySelector('#auth-title');
    const msg = modal.querySelector('#auth-msg');
    msg.textContent = '';

    if (me.signedIn) {
      title.textContent = 'Account';
      blurb.textContent = 'Cloud autosave is on for this Google account.';
      body.innerHTML = `
        <p class="tiny">Signed in as <strong>${me.email}</strong></p>
        <div class="settings-actions" style="margin-top:10px">
          <button type="button" class="btn ghost" id="auth-logout-btn">Sign out</button>
        </div>`;
      body.querySelector('#auth-logout-btn').addEventListener('click', onLogout);
    } else if (!googleReady) {
      title.textContent = 'Sign in';
      blurb.textContent = 'Sign in with Google is almost ready.';
      body.innerHTML = `<p class="tiny">Coming soon — waiting for a Google Client ID. Guest local play works now.</p>`;
    } else {
      title.textContent = 'Sign in';
      blurb.textContent = 'Use Google so your save follows this account across devices. Guests keep local saves.';
      body.innerHTML = `<div class="gsi-stone"><div id="auth-gsi-slot"></div></div>`;
      renderGoogleButton(body.querySelector('#auth-gsi-slot'));
    }
    modal.classList.add('open');
  }

  function closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('open');
  }

  function bindChip() {
    const chip = document.getElementById('account-chip');
    if (!chip) return;
    chip.addEventListener('click', openModal);
  }

  function settingsAccountCard(state) {
    if (me.signedIn) {
      return `<div class="card settings-card">
        <h4 class="settings-group">Account</h4>
        <p class="tiny muted pad">Signed in as <strong>${me.email}</strong> · Sign out below. Cloud autosave every ~45s.</p>
        <div class="settings-actions">
          <button type="button" class="btn ghost" data-action="auth-logout">Sign out</button>
        </div>
      </div>`;
    }
    if (!googleReady) {
      return `<div class="card settings-card">
        <h4 class="settings-group">Account</h4>
        <p class="tiny muted pad">Sign in with Google — <strong>coming soon</strong>. Guest local play works now.</p>
        <div class="settings-actions">
          <button type="button" class="btn ghost" data-action="open-auth" disabled>Sign in · soon</button>
        </div>
      </div>`;
    }
    return `<div class="card settings-card">
      <h4 class="settings-group">Account</h4>
      <p class="tiny muted pad">Sign in with Google so your save follows you. Guests keep local saves.</p>
      <div class="gsi-stone settings-gsi" id="settings-gsi-slot"></div>
      <div class="settings-actions" style="margin-top:8px">
        <button type="button" class="btn ghost" data-action="open-auth">Open sign-in</button>
      </div>
    </div>`;
  }

  function mountSettingsGoogleButton() {
    const slot = document.getElementById('settings-gsi-slot');
    if (slot && googleReady && !me.signedIn) renderGoogleButton(slot);
  }

  function boot() {
    bindChip();
    refreshMe().then(() => {
      if (me.signedIn) startCloudSync();
      mountSettingsGoogleButton();
    });
  }

  window.CB_AUTH = {
    boot,
    openModal,
    refreshMe,
    settingsAccountCard,
    mountSettingsGoogleButton,
    pushSave,
    progressScore,
    getMe: () => me,
    onLogout,
    isGoogleReady: () => googleReady,
  };
})();
