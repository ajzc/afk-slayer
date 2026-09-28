/** Number / time / gold formatting helpers */
window.CB_FMT = {
  suffixes: ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'],

  GOLD_ICON_BASE: 'art/v3b/ui/gold/',

  num(n, digits = 1) {
    if (n == null || !isFinite(n)) return '0';
    const sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    if (n < 1000) {
      if (n < 10 && digits > 0 && n !== Math.floor(n)) return sign + n.toFixed(digits);
      return sign + Math.floor(n).toString();
    }
    let i = 0;
    while (n >= 1000 && i < this.suffixes.length - 1) {
      n /= 1000;
      i++;
    }
    const d = n >= 100 ? 0 : n >= 10 ? 1 : digits;
    return sign + n.toFixed(d) + this.suffixes[i];
  },

  pct(n, digits = 0) {
    return (n * 100).toFixed(digits) + '%';
  },

  time(ms) {
    if (ms < 0) ms = 0;
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ' + (s % 60) + 's';
    const h = Math.floor(m / 60);
    if (h < 48) return h + 'h ' + (m % 60) + 'm';
    const d = Math.floor(h / 24);
    return d + 'd ' + (h % 24) + 'h';
  },

  rate(killsPerMin) {
    const kph = killsPerMin * 60;
    return this.num(kph, 1) + '/h';
  },

  /** Stack icon key for a gold amount (INTEGRATION.md). */
  goldIconKey(amount) {
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (n <= 1) return 'coins_1';
    if (n === 2) return 'coins_2';
    if (n === 3) return 'coins_3';
    if (n === 4) return 'coins_4';
    if (n < 25) return 'coins_5';
    if (n < 100) return 'coins_25';
    if (n < 250) return 'coins_100';
    if (n < 1000) return 'coins_250';
    return 'coins_1000';
  },

  /**
   * OSRS-style gold amount: text + color + tier.
   * <100K yellow commas · 100K–10M white NNNK · ≥10M green NNM
   */
  formatGold(n) {
    n = Math.floor(Math.max(0, Number(n) || 0));
    if (n < 100000) {
      return { text: n.toLocaleString('en-US'), color: '#FFFF00', tier: 'raw' };
    }
    if (n < 10000000) {
      return { text: Math.floor(n / 1000) + 'K', color: '#FFFFFF', tier: 'k' };
    }
    return { text: Math.floor(n / 1e6) + 'M', color: '#00FF80', tier: 'm' };
  },

  /** Pixel size for icons: hud=32, inline 16 (20 when amount ≥250). */
  goldIconPx(amount, context) {
    if (context === 'hud') return 32;
    if (context === 'pop') return 16;
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    return n >= 250 ? 20 : 16;
  },

  goldIconSrc(amount, context) {
    const key = this.goldIconKey(amount);
    const px = this.goldIconPx(amount, context);
    return this.GOLD_ICON_BASE + key + '_' + px + '.png';
  },

  /** <img> for a gold stack icon. */
  goldIconHtml(amount, context) {
    const px = this.goldIconPx(amount, context || 'inline');
    const src = this.goldIconSrc(amount, context || 'inline');
    const key = this.goldIconKey(amount);
    return '<img class="gold-icon" src="' + src + '" width="' + px + '" height="' + px
      + '" alt="" data-gold-key="' + key + '" aria-hidden="true">';
  },

  /** Icon + formatted amount chip (for buttons, rewards, HUD label companions). */
  goldChipHtml(amount, opts) {
    opts = opts || {};
    const g = this.formatGold(amount);
    const ctx = opts.hud ? 'hud' : (opts.context || 'inline');
    const icon = opts.hideIcon ? '' : this.goldIconHtml(amount, ctx);
    const prefix = opts.prefix || '';
    const suffix = opts.suffix != null ? opts.suffix : '';
    const amt = opts.hideAmount ? ''
      : ('<span class="gold-amount tier-' + g.tier + '" style="color:' + g.color + '">'
        + prefix + g.text + suffix + '</span>');
    return '<span class="gold-chip">' + icon + amt + '</span>';
  },

  /** Plain text for toasts / titles that cannot use HTML icons. */
  goldText(amount, opts) {
    opts = opts || {};
    const g = this.formatGold(amount);
    return (opts.prefix || '') + g.text + (opts.suffix != null ? opts.suffix : ' gold');
  },

  /**
   * Apply OSRS gold formatting + stack icon to the HUD chip.
   * Call whenever state.gold changes.
   */
  applyGoldHud(amount) {
    const el = typeof document !== 'undefined' ? document.getElementById('res-gold') : null;
    const ico = typeof document !== 'undefined' ? document.getElementById('res-gold-ico') : null;
    const g = this.formatGold(amount);
    if (el) {
      el.textContent = g.text;
      el.style.color = g.color;
      el.classList.add('gold-amount');
      el.classList.remove('tier-raw', 'tier-k', 'tier-m');
      el.classList.add('tier-' + g.tier);
    }
    if (ico) {
      const key = this.goldIconKey(amount);
      if (ico.dataset.goldKey !== key) {
        ico.src = this.GOLD_ICON_BASE + key + '_32.png';
        ico.dataset.goldKey = key;
      }
    }
    return g;
  },
};
