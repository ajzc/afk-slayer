/** Contract Board — static content (original IP) */
window.CB_DATA = {
  SAVE_KEY: 'contractBoard_v1',
  TICK_MS: 500,

  /* Pacing / combat intensity */
  GLOBAL_DMG_MULT: 0.12,      // bolt chip scale ref (bolts size via boltHpChip)
  ATTACK_SPEED_MULT: 40,      // intervals dampened in arena (not raw ×40)
  HUNTER_SPEED_MULT: 25,      // legacy pacing key (unused by live hunter cadence)
  HUNTER_DMG_MULT: 1.0,       // global hunter-chip scale (hunter track only)
  BEAM_POWER_MULT: 0.015,     // bolt power (legacy key; same DPS ballpark)
  ACTIVE_MULT: 1.4,           // holding economy boost
  PLAYER_BASE_IDLE: 0.75,     // solo kill-rate contrib (no hunters yet)
  MONSTER_VISUAL_HP: 150,     // arena monster HP pool (integer chips)

  /*
   * Independent hunter combat (NOT derived from player bolt DPS).
   * Starting bases were tuned once so early Briar+Quill sustained DPS
   * (Briar chase uptime ~72%, Quill full) ≈ 75% of early player bolt DPS.
   * That 75% is a one-time balance target only — upgrades diverge the tracks.
   * dmg = integer HP chip per hit at hire; attackIntervalMs = base ms between attacks.
   */
  HUNTER_COMBAT: {
    briar: { dmg: 11, attackIntervalMs: 1900 },
    quill: { dmg: 4,  attackIntervalMs: 1200 },
    moss:  { dmg: 13, attackIntervalMs: 2100 },
    ember: { dmg: 5,  attackIntervalMs: 1300 },
  },


  areas: [
    { id: 'sewers', name: 'Level 1', emoji: '1️⃣', unlock: true, mult: 1.0, order: 0, codexSubtitle: 'Bear den' },
    { id: 'mistwood', name: 'Level 2', emoji: '2️⃣', unlock: false, mult: 1.35, order: 1, codexSubtitle: 'Ashfang pack' },
    { id: 'crypt', name: 'Level 3', emoji: '3️⃣', unlock: false, mult: 1.8, order: 2, codexSubtitle: 'Nightweave' },
    /* Internal only — kept for old saves; never primary chrome */
    { id: 'ashrim', name: 'Level 4', emoji: '4️⃣', unlock: false, mult: 2.5, order: 3, codexSubtitle: 'Coming later', hidden: true },
  ],

  hunters: [
    { id: 'briar', name: 'Briar', emoji: '🗡️', idle: 1.0, unlock: false, role: 'melee', weapon: 'sword' },
    { id: 'quill', name: 'Quill', emoji: '🏹', idle: 0.85, unlock: false, role: 'ranged', weapon: 'bow' },
    { id: 'moss', name: 'Moss', emoji: '🪓', idle: 1.15, unlock: false, role: 'melee', weapon: 'axe' },
    { id: 'ember', name: 'Ember', emoji: '🔥', idle: 1.4, unlock: false, role: 'mage', weapon: 'staff' },
  ],

  /* Signature mats — Hands-era ids migrate → these (see state.js migrateCreatureFamilies) */
  signatureMats: {
    pelt_scrap: { id: 'pelt_scrap', name: 'Pelt Scrap', emoji: '🩹', desc: 'Tough hide scraps from Thornpelt Bears.' },
    dire_claw: { id: 'dire_claw', name: 'Dire Claw', emoji: '🐾', desc: 'Curved claw from Dire Thornpelts.' },
    ashfang_fang: { id: 'ashfang_fang', name: 'Ashfang Fang', emoji: '🦷', desc: 'Ash-stained fang from Ashfang Wolves.' },
    pack_hide: { id: 'pack_hide', name: 'Pack Hide', emoji: '🧥', desc: 'Thick pack hide from Dire Ashfangs.' },
    silk_thread: { id: 'silk_thread', name: 'Silk Thread', emoji: '🧵', desc: 'Sticky silk from Webfen Widows.' },
    venom_sac: { id: 'venom_sac', name: 'Venom Sac', emoji: '🧪', desc: 'Venom gland from Brood Matrons.' },
    /* Legacy aliases (display only if orphaned mid-migrate) */
    grip_scrap: { id: 'grip_scrap', name: 'Pelt Scrap', emoji: '🩹', desc: 'Legacy id — migrates to Pelt Scrap.' },
    wail_shard: { id: 'wail_shard', name: 'Dire Claw', emoji: '🐾', desc: 'Legacy id — migrates to Dire Claw.' },
    ember_core: { id: 'ember_core', name: 'Ashfang Fang', emoji: '🦷', desc: 'Legacy id — migrates to Ashfang Fang.' },
  },

  contracts: [
    /* —— Level 1 · Bears —— */
    {
      id: 'bristle_cub', name: 'Bristle Cub', areaId: 'sewers', emoji: '🐻', visual: 'bristle_cub',
      displayLevel: 8,
      miniDesc: 'Soft-furred cubs that tumble in fast and fold quick. · Lv 8',
      killQuota: 25, pointsPerKill: 1, finishBonus: 15,
      goldMin: 1, goldMax: 2, scrapChance: 0.28, rareChance: 0.02,
      mult: 1.0, foodPerKill: 0.35, tutorial: true,
      combat: {
        hpMult: 0.85, moveMult: 1.25, spawnMult: 1.15, wanderAmp: 1.1,
        aimAssistMod: 4, hitWidthMult: 1.1,
      },
      masteryPerks: [
        { at: 3, scrapChance: 0.05, text: '+5% global scrap chance' },
        { at: 6, scrapChance: 0.08, text: '+8% global scrap chance' },
        { at: 10, scrapChance: 0.12, text: '+12% global scrap chance' },
      ],
    },
    {
      id: 'thornpelt_bear', name: 'Thornpelt Bear', areaId: 'sewers', emoji: '🐻', visual: 'thornpelt_bear',
      displayLevel: 18,
      miniDesc: 'Tanky den adults — slow, wide, soak bolts. · Lv 18',
      killQuota: 60, pointsPerKill: 1.8, finishBonus: 35,
      goldMin: 2, goldMax: 4, scrapChance: 0.22, rareChance: 0.03,
      mult: 1.1, foodPerKill: 0.45,
      combat: {
        hpMult: 1.45, moveMult: 0.55, spawnMult: 0.7, wanderAmp: 0.55,
        aimAssistMod: 2, hitWidthMult: 1.2,
      },
      signatureDrop: { id: 'pelt_scrap', chance: 0.12 },
      masteryPerks: [
        { at: 3, scrapChance: 0.04, text: '+4% global scrap chance' },
        { at: 6, offlineCapMin: 15, text: '+15 min offline cap' },
        { at: 10, scrapChance: 0.06, offlineCapMin: 20, text: '+6% scrap · +20 min offline cap' },
      ],
    },
    {
      id: 'dire_thornpelt', name: 'Dire Thornpelt', areaId: 'sewers', emoji: '🐻‍❄️', visual: 'dire_thornpelt',
      displayLevel: 26,
      miniDesc: 'Elite chargers — short rush, Slayer-point lean. · Lv 26',
      killQuota: 100, pointsPerKill: 2.2, finishBonus: 60,
      goldMin: 4, goldMax: 9, scrapChance: 0.16, rareChance: 0.04,
      mult: 1.2, foodPerKill: 0.5, foodDropChance: 0.18, foodDropAmt: 2,
      combat: {
        hpMult: 1.15, moveMult: 1.35, spawnMult: 1.05, wanderAmp: 1.2,
        aimAssistMod: -2, hitWidthMult: 0.95, charger: true,
      },
      signatureDrop: { id: 'dire_claw', chance: 0.10 },
      masteryPerks: [
        { at: 3, pointsMult: 0.04, text: '+4% Slayer points' },
        { at: 6, pointsMult: 0.06, text: '+6% Slayer points' },
        { at: 10, pointsMult: 0.10, text: '+10% Slayer points' },
      ],
    },
    /* —— Level 2 · Wolves —— */
    {
      id: 'ashfang_pup', name: 'Ashfang Pup', areaId: 'mistwood', emoji: '🐺', visual: 'ashfang_pup',
      displayLevel: 22,
      miniDesc: 'Fast packlings with low HP. · Lv 22',
      killQuota: 80, pointsPerKill: 2, finishBonus: 80,
      goldMin: 4, goldMax: 10, scrapChance: 0.22, rareChance: 0.05,
      mult: 1.25, foodPerKill: 0.6,
      combat: {
        hpMult: 0.9, moveMult: 1.4, spawnMult: 1.25, wanderAmp: 1.3,
        aimAssistMod: 2, hitWidthMult: 1.05,
      },
      masteryPerks: [
        { at: 3, scrapChance: 0.04, text: '+4% scrap chance' },
        { at: 6, scrapChance: 0.06, text: '+6% scrap chance' },
        { at: 10, scrapChance: 0.10, text: '+10% scrap chance' },
      ],
    },
    {
      id: 'ashfang_wolf', name: 'Ashfang Wolf', areaId: 'mistwood', emoji: '🐺', visual: 'ashfang_wolf',
      displayLevel: 42,
      miniDesc: 'Flanking strafe — aim pressure. · Lv 42',
      killQuota: 120, pointsPerKill: 2.5, finishBonus: 120,
      goldMin: 6, goldMax: 14, scrapChance: 0.18, rareChance: 0.06,
      mult: 1.4, foodPerKill: 0.7,
      combat: {
        hpMult: 1.2, moveMult: 1.35, spawnMult: 1.15, wanderAmp: 1.5,
        aimAssistMod: -6, hitWidthMult: 0.78,
      },
      signatureDrop: { id: 'ashfang_fang', chance: 0.10 },
      masteryPerks: [
        { at: 3, pointsMult: 0.04, text: '+4% Slayer points' },
        { at: 6, pointsMult: 0.06, text: '+6% Slayer points' },
        { at: 10, pointsMult: 0.10, text: '+10% Slayer points' },
      ],
    },
    {
      id: 'dire_ashfang', name: 'Dire Ashfang', areaId: 'mistwood', emoji: '🐺', visual: 'dire_ashfang',
      displayLevel: 58,
      miniDesc: 'Pack rush — short burst move, gold lean. · Lv 58',
      killQuota: 150, pointsPerKill: 3, finishBonus: 160,
      goldMin: 8, goldMax: 18, scrapChance: 0.28, rareChance: 0.07,
      mult: 1.5, foodPerKill: 0.75,
      combat: {
        hpMult: 1.35, moveMult: 1.2, spawnMult: 1.1, wanderAmp: 1.15,
        aimAssistMod: 0, hitWidthMult: 1.0, charger: true,
      },
      signatureDrop: { id: 'pack_hide', chance: 0.10 },
      masteryPerks: [
        { at: 3, lootLuck: 0.04, text: '+4% gold loot' },
        { at: 6, lootLuck: 0.06, text: '+6% gold loot' },
        { at: 10, lootLuck: 0.10, text: '+10% gold loot' },
      ],
    },
    /* —— Level 3 · Spiders —— */
    {
      id: 'silkling', name: 'Silkling', areaId: 'crypt', emoji: '🕷️', visual: 'silkling',
      displayLevel: 180,
      miniDesc: 'Swarm/clump small hits. · Lv 180',
      killQuota: 140, pointsPerKill: 3.5, finishBonus: 200,
      goldMin: 10, goldMax: 22, scrapChance: 0.3, rareChance: 0.08,
      mult: 1.6, foodPerKill: 0.8,
      combat: {
        hpMult: 1.0, moveMult: 1.1, spawnMult: 1.2, wanderAmp: 0.9,
        aimAssistMod: 2, hitWidthMult: 1.05, clump: true,
      },
      masteryPerks: [
        { at: 3, scrapChance: 0.04, text: '+4% scrap chance' },
        { at: 6, offlineCapMin: 15, text: '+15 min offline cap' },
        { at: 10, scrapChance: 0.08, offlineCapMin: 20, text: '+8% scrap · +20 min offline' },
      ],
    },
    {
      id: 'webfen_widow', name: 'Webfen Widow', areaId: 'crypt', emoji: '🕸️', visual: 'webfen_widow',
      displayLevel: 420,
      miniDesc: 'Evasive strafe — Slayer-point lean. · Lv 420',
      killQuota: 180, pointsPerKill: 4, finishBonus: 280,
      goldMin: 14, goldMax: 28, scrapChance: 0.22, rareChance: 0.09,
      mult: 1.8, foodPerKill: 0.9,
      combat: {
        hpMult: 1.25, moveMult: 1.45, spawnMult: 1.2, wanderAmp: 1.6,
        aimAssistMod: -8, hitWidthMult: 0.72,
      },
      signatureDrop: { id: 'silk_thread', chance: 0.10 },
      masteryPerks: [
        { at: 3, pointsMult: 0.04, text: '+4% Slayer points' },
        { at: 6, pointsMult: 0.06, text: '+6% Slayer points' },
        { at: 10, pointsMult: 0.10, text: '+10% Slayer points' },
      ],
    },
    {
      id: 'brood_matron', name: 'Brood Matron', areaId: 'crypt', emoji: '🕷️', visual: 'brood_matron',
      displayLevel: 600,
      miniDesc: 'Clump nest; Pierce teaches. · Lv 600',
      killQuota: 220, pointsPerKill: 5, finishBonus: 350,
      goldMin: 18, goldMax: 36, scrapChance: 0.28, rareChance: 0.1,
      mult: 2.0, foodPerKill: 1.0,
      combat: {
        hpMult: 1.4, hpMultNoPierce: 1.7, moveMult: 0.95, spawnMult: 1.1,
        wanderAmp: 0.8, aimAssistMod: 0, hitWidthMult: 1.0, clump: true,
      },
      signatureDrop: { id: 'venom_sac', chance: 0.10 },
      masteryPerks: [
        { at: 3, lootLuck: 0.04, text: '+4% gold loot' },
        { at: 6, killMult: 0.04, text: '+4% bolt focus feel' },
        { at: 10, lootLuck: 0.06, killMult: 0.06, text: '+6% gold · +6% bolt focus' },
      ],
    },
  ],

  /*
   * Level bosses — Slayer-point access → Fight boss (live arena).
   * bossCost replaces old chip threshold. Keep prey ids for save migration.
   * Bosses are NOT idle hunt targets until Fight boss.
   */
  markedPrey: [
    {
      id: 'sewer_king', areaId: 'sewers', name: 'Elder Thornpelt', emoji: '🐻',
      displayLevel: 30, visual: 'elder_thornpelt',
      bossCost: 120, threshold: 120, chipPerKill: 0, /* threshold alias for legacy UI */
      combat: { hpMult: 1.8, moveMult: 0.7, wanderAmp: 0.5, aimAssistMod: 2, hitWidthMult: 1.25 },
      relicId: 'rat_tooth', unlockAreaId: 'mistwood',
      rewardPoints: 100, rewardGold: 200,
    },
    {
      id: 'mist_wraith', areaId: 'mistwood', name: 'Ashfang Alpha', emoji: '🐺',
      displayLevel: 69, visual: 'ashfang_alpha',
      bossCost: 280, threshold: 280, chipPerKill: 0,
      combat: { hpMult: 2.5, moveMult: 1.15, wanderAmp: 1.1, aimAssistMod: -2, hitWidthMult: 1.1 },
      relicId: 'fog_lens', unlockAreaId: 'crypt',
      rewardPoints: 250, rewardGold: 500,
    },
    {
      id: 'crypt_lord', areaId: 'crypt', name: 'Nightweave', emoji: '🕷️',
      displayLevel: 720, visual: 'nightweave',
      bossCost: 600, threshold: 600, chipPerKill: 0,
      combat: { hpMult: 3.6, moveMult: 1.05, wanderAmp: 0.9, aimAssistMod: 0, hitWidthMult: 1.15, clump: false },
      relicId: 'bone_seal', unlockAreaId: null,
      rewardPoints: 500, rewardGold: 1200,
    },
    /* Legacy L4 — hidden; finished state preserved if present */
    {
      id: 'ash_tyrant', areaId: 'ashrim', name: 'Ash Abyssal', emoji: '🐲',
      displayLevel: 0, visual: 'demon',
      bossCost: 99999, threshold: 220, chipPerKill: 0.04,
      relicId: 'ember_crest', unlockAreaId: null,
      rewardPoints: 1000, rewardGold: 3000, hidden: true,
    },
  ],

  relics: {
    rat_tooth: { id: 'rat_tooth', name: 'Rat Tooth Charm', emoji: '🦷', desc: '+8% idle power', idlePower: 0.08 },
    fog_lens: { id: 'fog_lens', name: 'Fog Lens', emoji: '🔎', desc: '+12% loot gold', lootGold: 0.12 },
    bone_seal: { id: 'bone_seal', name: 'Bone Seal', emoji: '🔏', desc: '+15% offline cap', offlineCap: 0.15 },
    ember_crest: { id: 'ember_crest', name: 'Ember Crest', emoji: '🏅', desc: '+10% food efficiency', foodEff: 0.10 },
  },

  upgrades: [
    {
      id: 'idle_power', name: 'Idle Power', emoji: '⚡',
      desc: '+12% kill rate',
      baseCost: 40, costMult: 1.55, maxLevel: 40,
      costCurrency: 'gold',
      effect: { idlePower: 0.12 },
    },

    /* Metal gear ladder — time gates authoritative; costs retuned so gold isn't trivial before gate */
    {
      id: 'gear_bronze', name: 'Bronze Blade', emoji: '🗡️',
      desc: 'Starter metal · +8% kill rate',
      baseCost: 0, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      effect: { idlePower: 0.08 },
      gearTier: 1, requiresUpgrade: null, minPlayMs: 0,
    },
    {
      id: 'gear_iron', name: 'Iron Blade', emoji: '🗡️',
      desc: 'Iron tier · +12% kill rate · 10 min play',
      baseCost: 180, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      effect: { idlePower: 0.12 },
      gearTier: 2, requiresUpgrade: 'gear_bronze', minPlayMs: 600000,
    },
    {
      id: 'gear_steel', name: 'Steel Blade', emoji: '⚔️',
      desc: 'Steel tier · +16% kill rate · 15 min play',
      baseCost: 450, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      effect: { idlePower: 0.16 },
      gearTier: 3, requiresUpgrade: 'gear_iron', minPlayMs: 900000,
    },
    {
      id: 'gear_mithril', name: 'Mithril Blade', emoji: '⚔️',
      desc: 'Mithril tier · +22% kill rate · 22.5 min play',
      baseCost: 320, costMult: 1, maxLevel: 1,
      costCurrency: 'points',
      effect: { idlePower: 0.22 },
      gearTier: 4, requiresUpgrade: 'gear_steel', minPlayMs: 1350000,
    },
    {
      id: 'gear_adamant', name: 'Adamant Blade', emoji: '🛡️',
      desc: 'Adamant tier · +28% kill rate · ~34 min play',
      baseCost: 700, costMult: 1, maxLevel: 1,
      costCurrency: 'points',
      effect: { idlePower: 0.28 },
      gearTier: 5, requiresUpgrade: 'gear_mithril', minPlayMs: 2025000,
    },
    {
      id: 'gear_rune', name: 'Rune Blade', emoji: '✨',
      desc: 'Rune tier · +35% kill rate · ~51 min play',
      baseCost: 1500, costMult: 1, maxLevel: 1,
      costCurrency: 'points',
      effect: { idlePower: 0.35 },
      gearTier: 6, requiresUpgrade: 'gear_adamant', minPlayMs: 3037500,
    },
    {
      id: 'gear_dragon', name: 'Dragon Blade', emoji: '🐉',
      desc: 'Dragon tier · +50% kill rate · ~76 min play',
      baseCost: 3500, costMult: 1, maxLevel: 1,
      costCurrency: 'points',
      effect: { idlePower: 0.5 },
      gearTier: 7, requiresUpgrade: 'gear_rune', minPlayMs: 4556250,
    },

    /* Combat feature unlocks */
    {
      id: 'unlock_crits', name: 'Unlock Crits', emoji: '💥',
      desc: 'Enable critical hits',
      baseCost: 120, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      effect: { feature: 'crits' },
      minPlayMs: 1200000,
    },
    {
      id: 'unlock_specials', name: 'Unlock Specials', emoji: '✴️',
      desc: 'Periodic heavy bolt pulse',
      baseCost: 200, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      effect: { feature: 'specials' },
      minPlayMs: 1500000,
    },
    {
      id: 'beam_focus', name: 'Bolt Focus', emoji: '🔆',
      desc: '+bolt visual tier & +5% bolt feel',
      baseCost: 90, costMult: 1.8, maxLevel: 3,
      costCurrency: 'gold',
      effect: { beamFocus: 1 },
      minPlayMs: 480000,
    },
    {
      id: 'crit_power', name: 'Crit Power', emoji: '💢',
      desc: '+4% crit chance (requires Unlock Crits)',
      baseCost: 150, costMult: 1.7, maxLevel: 10,
      costCurrency: 'gold',
      effect: { critChance: 0.04 },
      requiresUpgrade: 'unlock_crits',
      minPlayMs: 1320000,
    },
    {
      id: 'special_cadence', name: 'Special Cadence', emoji: '⏱️',
      desc: 'Specials fire more often',
      baseCost: 220, costMult: 1.75, maxLevel: 5,
      costCurrency: 'points',
      effect: { specialCadence: 0.12 },
      requiresUpgrade: 'unlock_specials',
      minPlayMs: 1800000,
    },
    {
      id: 'bolt_pierce', name: 'Bolt Pierce', emoji: '➡️',
      desc: 'Bolts keep going through foes; later hits deal less (60% then 35%). Cap 1, then 2.',
      baseCost: 180, costMult: 2.2, maxLevel: 2,
      costCurrency: 'gold',
      effect: { boltPierce: 1 },
      minPlayMs: 900000,
    },
    {
      id: 'bolt_bounce', name: 'Bolt Bounce', emoji: '↩️',
      desc: 'On hit, bolt ricochets to a nearby foe; bounce hits deal 50% then 25%. Cap 1, then 2.',
      baseCost: 200, costMult: 2.2, maxLevel: 2,
      costCurrency: 'gold',
      effect: { boltBounce: 1 },
      minPlayMs: 1200000,
    },

    {
      id: 'offline_cap', name: 'Offline Cap', emoji: '🌙',
      desc: '+30 min offline progress',
      baseCost: 80, costMult: 1.7, maxLevel: 20,
      costCurrency: 'gold',
      effect: { offlineCapMin: 30 },
    },
    {
      id: 'food_eff', name: 'Food Efficiency', emoji: '🍞',
      desc: '+8% food efficiency',
      baseCost: 50, costMult: 1.6, maxLevel: 25,
      costCurrency: 'gold',
      effect: { foodEff: 0.08 },
    },
    {
      id: 'food_cap', name: 'Bigger Food Stock', emoji: '📦',
      desc: '+25 food capacity & +0.4 food/min refill',
      baseCost: 35, costMult: 1.5, maxLevel: 30,
      costCurrency: 'gold',
      effect: { foodCap: 25, foodRegen: 0.4 },
    },
    {
      id: 'auto_accept', name: 'Auto-Accept', emoji: '📋',
      desc: 'Auto-pick next contract in unlocked areas',
      baseCost: 150, costMult: 1, maxLevel: 1,
      costCurrency: 'points',
      effect: { autoAccept: true },
    },

    /* Company hires — time gated; none start unlocked */
    {
      id: 'hunter_briar', name: 'Hire Briar', emoji: '🗡️',
      desc: 'First hunter · melee · starts slow · 15 min play',
      baseCost: 80, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      effect: { unlockHunter: 'briar' },
      minPlayMs: 900000,
    },
    {
      id: 'hunter_quill', name: 'Hire Quill', emoji: '🏹',
      desc: 'Ranged hunter · 1.5 h play',
      baseCost: 200, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      effect: { unlockHunter: 'quill' },
      minPlayMs: 5400000,
    },
    {
      id: 'hunter_moss', name: 'Hire Moss', emoji: '🪓',
      desc: 'Melee hunter · 3 h play',
      baseCost: 400, costMult: 1, maxLevel: 1,
      costCurrency: 'points',
      effect: { unlockHunter: 'moss' },
      minPlayMs: 10800000,
    },
    {
      id: 'hunter_ember', name: 'Hire Ember', emoji: '🔥',
      desc: 'Mage hunter · 5 h play',
      baseCost: 1200, costMult: 1, maxLevel: 1,
      costCurrency: 'points',
      effect: { unlockHunter: 'ember' },
      minPlayMs: 18000000,
    },
    {
      id: 'hunter_power', name: 'Hunter Power', emoji: '💪',
      desc: '+30%/lv overall hunter output (live chips × AFK idle · stacks with Bigger Hits · not your bolts)',
      baseCost: 100, costMult: 1.65, maxLevel: 20,
      costCurrency: 'gold',
      effect: { hunterPower: 0.30 },
      requiresUpgrade: 'hunter_briar',
      minPlayMs: 1200000,
    },
    {
      id: 'hunter_damage', name: 'Bigger Hits', emoji: '🗡️',
      desc: '+40%/lv per-hit damage only (swings/arrows · not walk speed · not your bolts)',
      baseCost: 140, costMult: 1.7, maxLevel: 15,
      costCurrency: 'gold',
      effect: { hunterDmg: 0.40 },
      requiresUpgrade: 'hunter_briar',
      minPlayMs: 1320000,
    },
    {
      id: 'hunter_atk_speed', name: 'Faster Attacks', emoji: '⏱️',
      desc: '+30%/lv attack speed — swing/shoot faster · not walk speed · not your bolts',
      baseCost: 160, costMult: 1.75, maxLevel: 12,
      costCurrency: 'gold',
      effect: { hunterAtkSpeed: 0.30 },
      requiresUpgrade: 'hunter_briar',
      minPlayMs: 1440000,
    },
    {
      id: 'hunter_swift_step', name: 'Swift Walk', emoji: '👟',
      desc: '+55% melee walk/chase — Briar / melee only (not Quill · not attack rate)',
      baseCost: 120, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      effect: { hunterMoveSpeed: 0.55 },
      requiresUpgrade: 'hunter_briar',
      minPlayMs: 1080000,
    },
    {
      id: 'hunter_pace', name: 'Faster Chase', emoji: '🏃',
      desc: '+70% melee walk/chase — Briar / melee only (stacks with Swift Walk · not Quill)',
      baseCost: 220, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      effect: { hunterMoveSpeed: 0.70 },
      requiresUpgrade: 'hunter_swift_step',
      minPlayMs: 1500000,
    },
    {
      id: 'hunter_charge', name: 'Hard Charge', emoji: '⚡',
      desc: '+90% melee walk/chase speed — Briar / melee only (not attack rate · not Quill)',
      baseCost: 400, costMult: 1, maxLevel: 1,
      costCurrency: 'points',
      effect: { hunterMoveSpeed: 0.90 },
      requiresUpgrade: 'hunter_pace',
      minPlayMs: 2100000,
    },
    {
      id: 'briar_blade', name: 'Briar Blade', emoji: '⚔️',
      desc: '+40%/lv Briar-only sword damage (not Quill · not shared Bigger Hits)',
      baseCost: 150, costMult: 1.7, maxLevel: 5,
      costCurrency: 'gold',
      effect: { briarDmg: 0.40 },
      requiresUpgrade: 'hunter_briar',
      minPlayMs: 1200000,
    },
    {
      id: 'briar_strength', name: 'Briar Strength', emoji: '💪',
      desc: '+35%/lv Briar-only damage (stacks with Briar Blade · not Quill · not Bigger Hits)',
      baseCost: 180, costMult: 1.75, maxLevel: 5,
      costCurrency: 'gold',
      effect: { briarDmg: 0.35 },
      requiresUpgrade: 'hunter_briar',
      minPlayMs: 1320000,
    },
    {
      id: 'quill_focus', name: 'Quill Focus', emoji: '🎯',
      desc: '+40%/lv Quill-only arrow damage (stacks with Bigger Hits · turret Quill)',
      baseCost: 180, costMult: 1.7, maxLevel: 12,
      costCurrency: 'gold',
      effect: { quillDmg: 0.40 },
      requiresUpgrade: 'hunter_quill',
      minPlayMs: 5400000,
    },
    {
      id: 'quill_cadence', name: 'Quill Cadence', emoji: '🏹',
      desc: '+30%/lv Quill-only attack speed (stacks with Faster Attacks · turret Quill)',
      baseCost: 200, costMult: 1.75, maxLevel: 10,
      costCurrency: 'gold',
      effect: { quillAtkSpeed: 0.30 },
      requiresUpgrade: 'hunter_quill',
      minPlayMs: 5400000,
    },
    {
      id: 'quill_arrow_speed', name: 'Quill Arrow Speed', emoji: '💨',
      desc: '+25%/lv faster Quill arrows (lower flight time · turret Quill)',
      baseCost: 190, costMult: 1.7, maxLevel: 8,
      costCurrency: 'gold',
      effect: { quillProjSpeed: 0.25 },
      requiresUpgrade: 'hunter_quill',
      minPlayMs: 5400000,
    },
    {
      id: 'quill_multishot', name: 'Quill Multishot', emoji: '➶',
      desc: 'Extra arrows per shot: Lv1 = 2 arrows (~12° spread), Lv2 = 3. Extras deal ~85% damage. Need Quill Focus or Cadence first.',
      baseCost: 320, costMult: 1.85, maxLevel: 2,
      costCurrency: 'points',
      effect: { quillMultishot: 1 },
      requiresAnyUpgrade: ['quill_focus', 'quill_cadence'],
      minPlayMs: 6000000,
    },

    {
      id: 'loot_luck', name: 'Loot Luck', emoji: '🍀',
      desc: '+10% gold from kills',
      baseCost: 70, costMult: 1.65, maxLevel: 20,
      costCurrency: 'gold',
      effect: { lootLuck: 0.1 },
    },
    {
      id: 'prey_chip', name: 'Boss Meter Focus', emoji: '🎯',
      desc: '+15% Slayer-point boss meter fill per kill',
      baseCost: 100, costMult: 1.75, maxLevel: 15,
      costCurrency: 'points',
      effect: { preyChip: 0.15 },
    },
    /* Scrapwork — scraps currency (Camp side path; prestige-keep) */
    {
      id: 'scrap_magnet', name: 'Scrap Magnet', emoji: '🧲',
      desc: '+4% scrap chance per level',
      baseCost: 30, costMult: 1.60, maxLevel: 10,
      costCurrency: 'scraps',
      prestigeKeep: true,
      effect: { scrapChance: 0.04 },
    },
    {
      id: 'scrap_larder', name: 'Scrap Larder', emoji: '🗄️',
      desc: '+20 food cap & +0.2 food/min refill per level',
      baseCost: 25, costMult: 1.55, maxLevel: 12,
      costCurrency: 'scraps',
      prestigeKeep: true,
      effect: { foodCap: 20, foodRegen: 0.2 },
    },
    {
      id: 'scrap_wick', name: 'Wick Wire', emoji: '🕯️',
      desc: '+5 min offline cap per level',
      baseCost: 45, costMult: 1.65, maxLevel: 8,
      costCurrency: 'scraps',
      prestigeKeep: true,
      effect: { offlineCapMin: 5 },
    },
    {
      id: 'scrap_gild', name: 'Gild Dust', emoji: '✨',
      desc: '+3% gold loot per level',
      baseCost: 60, costMult: 1.70, maxLevel: 6,
      costCurrency: 'scraps',
      prestigeKeep: true,
      effect: { lootLuck: 0.03 },
    },

    /* Forge permanents — signature mats (once each; prestige-keep) */
    {
      id: 'forge_knuckle', name: 'Pelt Guard', emoji: '🩹',
      desc: '+6% global scrap chance (Bear specialist)',
      baseCost: 0, costMult: 1, maxLevel: 1,
      costCurrency: 'mats',
      costMats: { pelt_scrap: 10 },
      prestigeKeep: true,
      effect: { scrapChance: 0.06 },
    },
    {
      id: 'forge_echo', name: 'Claw Charm', emoji: '🐾',
      desc: '+12 min offline cap (Dire Thornpelt specialist)',
      baseCost: 0, costMult: 1, maxLevel: 1,
      costCurrency: 'mats',
      costMats: { dire_claw: 10 },
      prestigeKeep: true,
      effect: { offlineCapMin: 12 },
    },
    {
      id: 'forge_cinder', name: 'Fang Tip', emoji: '🦷',
      desc: '+4% bolt kill power (Ashfang specialist)',
      baseCost: 0, costMult: 1, maxLevel: 1,
      costCurrency: 'mats',
      costMats: { ashfang_fang: 10 },
      prestigeKeep: true,
      effect: { killMult: 0.04 },
    },
  ],

  sigilShop: [
    { id: 'sigil_idle', name: 'Charter: Idle', emoji: '📜', desc: '+5% permanent idle power', cost: 1, effect: { idlePower: 0.05 } },
    { id: 'sigil_cap', name: 'Charter: Cap', emoji: '⏳', desc: '+20 min permanent offline cap', cost: 1, effect: { offlineCapMin: 20 } },
    { id: 'sigil_loot', name: 'Charter: Loot', emoji: '💰', desc: '+6% permanent gold loot', cost: 1, effect: { lootLuck: 0.06 } },
  ],

  prestigeModifiers: [
    'Bounty Boost: +10% Slayer points this charter',
    'Lean Hunt: −8% food per kill this charter',
    'Lucky Scraps: +20% scrap chance this charter',
    'Swift Quotas: −10% kill quotas this charter',
    'Gold Rush: +12% gold from kills this charter',
  ],

  ranks: [
    { rank: 0, name: 'Recruit', xp: 0 },
    { rank: 1, name: 'Runner', xp: 50 },
    { rank: 2, name: 'Tracker', xp: 150 },
    { rank: 3, name: 'Hunter', xp: 350 },
    { rank: 4, name: 'Veteran', xp: 700 },
    { rank: 5, name: 'Warden', xp: 1300 },
    { rank: 6, name: 'Guildhand', xp: 2200 },
    { rank: 7, name: 'Marshal', xp: 3600 },
    { rank: 8, name: 'Archivist', xp: 5500 },
    { rank: 9, name: 'Charter Lord', xp: 8000 },
  ],

  /* Progression flowchart maps (Progress tab) */
  progressionMaps: {
    combat: [
      { id: 'c_start', label: 'Start · Bolts Only', kind: 'milestone', requires: [] },
      { id: 'c_crits', label: 'Unlock Crits', kind: 'unlock', requires: ['c_start'], upgradeId: 'unlock_crits', feature: 'crits', minPlayMs: 1200000 },
      { id: 'c_specials', label: 'Unlock Specials', kind: 'unlock', requires: ['c_start'], upgradeId: 'unlock_specials', feature: 'specials', minPlayMs: 1500000 },
      { id: 'c_beam', label: 'Bolt Focus', kind: 'unlock', requires: ['c_start'], upgradeId: 'beam_focus', minPlayMs: 480000 },
      { id: 'c_crit_pwr', label: 'Crit Power', kind: 'upgrade', requires: ['c_crits'], upgradeId: 'crit_power', minPlayMs: 1320000 },
      { id: 'c_spec_cad', label: 'Special Cadence', kind: 'upgrade', requires: ['c_specials'], upgradeId: 'special_cadence', minPlayMs: 1800000 },
      { id: 'c_beam2', label: 'Bolt Focus II+', kind: 'upgrade', requires: ['c_beam'], upgradeId: 'beam_focus', minPlayMs: 480000 },
      { id: 'c_pierce', label: 'Bolt Pierce', kind: 'unlock', requires: ['c_beam'], upgradeId: 'bolt_pierce', minPlayMs: 900000 },
      { id: 'c_bounce', label: 'Bolt Bounce', kind: 'unlock', requires: ['c_beam'], upgradeId: 'bolt_bounce', minPlayMs: 1200000 },
      { id: 'c_pierce2', label: 'Pierce II', kind: 'upgrade', requires: ['c_pierce'], upgradeId: 'bolt_pierce', minPlayMs: 900000 },
      { id: 'c_bounce2', label: 'Bounce II', kind: 'upgrade', requires: ['c_bounce'], upgradeId: 'bolt_bounce', minPlayMs: 1200000 },
      { id: 'c_field', label: 'Field Ready', kind: 'milestone', requires: ['c_crits', 'c_beam'] },
      { id: 'c_idle', label: 'Idle Power', kind: 'upgrade', requires: ['c_field'], upgradeId: 'idle_power' },
      { id: 'c_final', label: 'Combat Mastery', kind: 'milestone', requires: ['c_specials', 'c_crit_pwr', 'c_idle'] },
    ],
    gear: [
      { id: 'g_start', label: 'Start · Bronze', kind: 'milestone', requires: [], upgradeId: 'gear_bronze' },
      { id: 'g_iron', label: 'Iron (10m)', kind: 'unlock', requires: ['g_start'], upgradeId: 'gear_iron', minPlayMs: 600000 },
      { id: 'g_steel', label: 'Steel (15m)', kind: 'unlock', requires: ['g_iron'], upgradeId: 'gear_steel', minPlayMs: 900000 },
      { id: 'g_mith', label: 'Mithril (22.5m)', kind: 'unlock', requires: ['g_steel'], upgradeId: 'gear_mithril', minPlayMs: 1350000 },
      { id: 'g_adam', label: 'Adamant (~34m)', kind: 'unlock', requires: ['g_mith'], upgradeId: 'gear_adamant', minPlayMs: 2025000 },
      { id: 'g_rune', label: 'Rune (~51m)', kind: 'unlock', requires: ['g_adam'], upgradeId: 'gear_rune', minPlayMs: 3037500 },
      { id: 'g_drag', label: 'Dragon (~76m)', kind: 'unlock', requires: ['g_rune'], upgradeId: 'gear_dragon', minPlayMs: 4556250 },
      { id: 'g_final', label: 'Full Dragon', kind: 'milestone', requires: ['g_drag'] },
    ],
    company: [
      { id: 'co_start', label: 'Start · Solo', kind: 'milestone', requires: [] },
      { id: 'co_briar', label: 'Hire Briar (15m)', kind: 'unlock', requires: ['co_start'], upgradeId: 'hunter_briar', minPlayMs: 900000 },
      { id: 'co_swift', label: 'Swift Walk · melee', kind: 'upgrade', requires: ['co_briar'], upgradeId: 'hunter_swift_step', minPlayMs: 1080000 },
      { id: 'co_pace', label: 'Faster Chase · melee', kind: 'upgrade', requires: ['co_swift'], upgradeId: 'hunter_pace', minPlayMs: 1500000 },
      { id: 'co_charge', label: 'Hard Charge · melee', kind: 'upgrade', requires: ['co_pace'], upgradeId: 'hunter_charge', minPlayMs: 2100000 },
      { id: 'co_hp1', label: 'Hunter Power', kind: 'upgrade', requires: ['co_briar'], upgradeId: 'hunter_power', minPlayMs: 1200000 },
      { id: 'co_hdmg', label: 'Bigger Hits', kind: 'upgrade', requires: ['co_briar'], upgradeId: 'hunter_damage', minPlayMs: 1320000 },
      { id: 'co_hcad', label: 'Faster Attacks', kind: 'upgrade', requires: ['co_briar'], upgradeId: 'hunter_atk_speed', minPlayMs: 1440000 },
      { id: 'co_briar_blade', label: 'Briar Blade', kind: 'upgrade', requires: ['co_briar'], upgradeId: 'briar_blade', minPlayMs: 1200000 },
      { id: 'co_briar_str', label: 'Briar Strength', kind: 'upgrade', requires: ['co_briar'], upgradeId: 'briar_strength', minPlayMs: 1320000 },
      { id: 'co_quill', label: 'Hire Quill (1.5h)', kind: 'unlock', requires: ['co_briar'], upgradeId: 'hunter_quill', minPlayMs: 5400000 },
      { id: 'co_quill_dmg', label: 'Quill Focus', kind: 'upgrade', requires: ['co_quill'], upgradeId: 'quill_focus', minPlayMs: 5400000 },
      { id: 'co_quill_spd', label: 'Quill Cadence', kind: 'upgrade', requires: ['co_quill'], upgradeId: 'quill_cadence', minPlayMs: 5400000 },
      { id: 'co_quill_proj', label: 'Quill Arrow Speed', kind: 'upgrade', requires: ['co_quill'], upgradeId: 'quill_arrow_speed', minPlayMs: 5400000 },
      { id: 'co_quill_multi', label: 'Quill Multishot', kind: 'upgrade', requires: ['co_quill_dmg', 'co_quill_spd'], requiresAny: true, upgradeId: 'quill_multishot', minPlayMs: 6000000 },
      { id: 'co_moss', label: 'Hire Moss (3h)', kind: 'unlock', requires: ['co_quill'], upgradeId: 'hunter_moss', minPlayMs: 10800000 },
      { id: 'co_ember', label: 'Hire Ember (5h)', kind: 'unlock', requires: ['co_moss'], upgradeId: 'hunter_ember', minPlayMs: 18000000 },
      { id: 'co_final', label: 'Full Company', kind: 'milestone', requires: ['co_ember'] },
    ],
    /* Camp = everyday support (food/offline/luck) — not a second gear list */
    camp: [
      { id: 'ca_start', label: 'Camp Basics', kind: 'milestone', requires: [] },
      { id: 'ca_larder', label: 'Food Stock', kind: 'upgrade', requires: ['ca_start'], upgradeId: 'food_cap' },
      { id: 'ca_food', label: 'Food Efficiency', kind: 'upgrade', requires: ['ca_start'], upgradeId: 'food_eff' },
      { id: 'ca_offline', label: 'Offline Cap', kind: 'upgrade', requires: ['ca_start'], upgradeId: 'offline_cap' },
      { id: 'ca_luck', label: 'Loot Luck', kind: 'upgrade', requires: ['ca_start'], upgradeId: 'loot_luck' },
      { id: 'ca_auto', label: 'Auto-Accept', kind: 'unlock', requires: ['ca_start'], upgradeId: 'auto_accept' },
      { id: 'ca_prey', label: 'Boss Meter Focus', kind: 'upgrade', requires: ['ca_start'], upgradeId: 'prey_chip' },
      { id: 'ca_ready', label: 'Camp Stocked', kind: 'milestone', requires: ['ca_larder', 'ca_food', 'ca_offline'] },
    ],
  },

  /* Dual chest tubes (Idle Obelisk–style left meters) */
  chests: {
    permanent: {
      id: 'permanent',
      name: 'Relic Casket',
      emoji: '💜',
      fillMs: 10 * 60 * 1000,
      beamBonus: 1.35,
      rarities: [
        {
          id: 'common', weight: 70, label: 'Common', color: '#a8b0bc',
          pools: [
            { stat: 'idlePower', min: 0.005, max: 0.01, label: 'Idle Power' },
            { stat: 'lootLuck', min: 0.005, max: 0.01, label: 'Gold Loot' },
          ],
        },
        {
          id: 'uncommon', weight: 22, label: 'Uncommon', color: '#4ade80',
          pools: [
            { stat: 'idlePower', min: 0.01, max: 0.02, label: 'Idle Power' },
            { stat: 'lootLuck', min: 0.01, max: 0.02, label: 'Gold Loot' },
            { stat: 'critChance', min: 0.005, max: 0.015, label: 'Crit Chance' },
          ],
        },
        {
          id: 'rare', weight: 7, label: 'Rare', color: '#60a5fa',
          pools: [
            { stat: 'idlePower', min: 0.02, max: 0.04, label: 'Idle Power' },
            { stat: 'lootLuck', min: 0.02, max: 0.035, label: 'Gold Loot' },
            { stat: 'offlineCapMin', min: 5, max: 12, label: 'Offline Cap (min)', flat: true },
            { stat: 'foodEff', min: 0.015, max: 0.03, label: 'Food Efficiency' },
          ],
        },
        {
          id: 'legendary', weight: 1, label: 'Legendary', color: '#fbbf24',
          pools: [
            { stat: 'idlePower', min: 0.05, max: 0.08, label: 'Idle Power' },
            { stat: 'lootLuck', min: 0.05, max: 0.08, label: 'Gold Loot' },
            { stat: 'critChance', min: 0.03, max: 0.05, label: 'Crit Chance' },
            { stat: 'offlineCapMin', min: 20, max: 40, label: 'Offline Cap (min)', flat: true },
            { stat: 'chestSpeed', min: 0.04, max: 0.08, label: 'Chest Charge Speed' },
          ],
        },
      ],
    },
    boost: {
      id: 'boost',
      name: 'Loot Casket',
      emoji: '💎',
      fillMs: 4 * 60 * 1000,
      beamBonus: 1.25,
      catalog: [
        {
          id: 'frenzy', name: 'Frenzy', emoji: '⚡',
          durationMs: 60000, killMult: 2,
          desc: '60s: bolts hit harder & fire faster (also speeds AFK kills)',
        },
        {
          id: 'lucky', name: 'Lucky Hunt', emoji: '🍀',
          durationMs: 90000, goldMult: 1.75,
          desc: '+75% gold for 90s',
        },
        {
          id: 'crit_surge', name: 'Crit Surge', emoji: '💥',
          durationMs: 75000, critBonus: 0.25, killMult: 1.15,
          desc: '75s: +25% crit · bolts a bit stronger/faster (+15% AFK kills)',
        },
        {
          id: 'bomb_barrage', name: 'Bomb Barrage', emoji: '💣',
          durationMs: 45000, killMult: 1.5, visualBomb: true,
          desc: '45s: bolts hit harder & fire faster (also speeds AFK kills); occasional splash',
        },
        {
          id: 'feast', name: 'Feast', emoji: '🍖',
          durationMs: 0, foodGain: 50,
          desc: '+50 food instantly',
        },
        {
          id: 'cap_stretch', name: 'Longer Away Time', emoji: '⏳',
          durationMs: 600000, offlineCapBonus: 45,
          desc: '+45 min to how long offline progress can build up, for the next 10 min',
        },
      ],
    },
  },


  /* Forge timed boosts — 10 min; replace activeBoost like Loot Casket Frenzy */
  forgeBoosts: [
    {
      id: 'forge_grip_rush', name: 'Pelt Rush', emoji: '🩹',
      desc: '10 min: +25% scrap chance',
      durationMs: 600000,
      costMats: { pelt_scrap: 3 },
      scrapChanceBonus: 0.25,
    },
    {
      id: 'forge_wail_focus', name: 'Claw Focus', emoji: '🐾',
      desc: '10 min: +15% Slayer points',
      durationMs: 600000,
      costMats: { dire_claw: 3 },
      pointsMult: 1.15,
    },
    {
      id: 'forge_ember_barrage', name: 'Fang Barrage', emoji: '🦷',
      desc: '10 min: +10% bolt kill power',
      durationMs: 600000,
      costMats: { ashfang_fang: 3 },
      killMult: 1.10,
    },
  ],

  codex: [
    {
      id: 'relic_casket',
      ico: '💜',
      title: 'Relic Casket',
      body: 'Fills while you hunt. Tap when ready for a lasting power upgrade. Stacks forever.',
    },
    {
      id: 'loot_casket',
      ico: '💎',
      title: 'Loot Casket',
      body: 'Fills while you hunt. Tap when ready for a short timed boost. Spend it before the timer ends.',
    },
    {
      id: 'larder',
      ico: '🍞',
      title: 'Food',
      body: 'Hunters eat Food while AFK. Empty stock slows or stops the hunt — buy more or wait for refill.',
    },
    {
      id: 'solo_beam',
      ico: '🔆',
      title: 'Your bolts (early game)',
      body: 'Hold toward a monster to fire bolts. Hire hunters later on Progress → Company. Crits on Combat; Camp covers Food, offline, and luck.',
    },
    {
      id: 'monster_mastery',
      ico: '📜',
      title: 'Monsters & mastery',
      body: 'Each Level starts with one monster. Finish a Task to unlock the next. Improve bounty raises mastery for more gold, unique perks, and a small finish-chest chance.',
    },

    {
      id: 'level_creatures',
      ico: '🐻',
      title: 'Level creature families',
      body: 'Level 1 bears: Bristle Cub → Thornpelt Bear → Dire Thornpelt → Elder Thornpelt (boss Lv 30). Level 2 wolves / Level 3 spiders follow the same A→B→C→boss ladder. Finish Tasks to unlock the next hunt target.',
    },
    {
      id: 'area_boss',
      ico: '👑',
      title: 'Fight boss',
      body: 'Earn Slayer points on a Level to fill the boss meter. When full, tap Fight boss for a live arena duel. Beat it for a relic and the next Level. Fleeing resets boss HP but keeps access.',
    },
    {
      id: 'elder_thornpelt',
      ico: '🐻',
      title: 'Elder Thornpelt · Lv 30',
      body: 'Level 1 apex bear. Fill the Slayer-point meter (120), then Fight boss. Relic + Level 2 unlock on kill.',
    },
    {
      id: 'slayer_points',
      ico: '⭐',
      title: 'Slayer points',
      body: 'Earned from kills and Task finishes. Spent as progress toward each Level boss meter. Also buy some Progress unlocks. Save key stays points.',
    },
    {
      id: 'scraps',
      ico: '🔩',
      title: 'Scraps',
      body: 'Secondary loot from kills. Spend in Camp → Scrapwork. Signature mats (Pelt Scrap, Dire Claw, Ashfang Fang, Pack Hide, Silk Thread, Venom Sac) craft in Camp → Forge.',
    },
    {
      id: 'hunter_pace_codex',
      ico: '👟',
      title: 'Briar walk speed',
      body: 'Briar starts slow on foot. Progress → Company: Swift Walk → Faster Chase → Hard Charge are Briar / melee only (not Quill). Briar Blade / Briar Strength are Briar-only damage (not Quill · not shared Bigger Hits). Faster Attacks is separate (swing/shoot rate). Bigger Hits = shared per-hit; Hunter Power = overall chips + idle.',
    },
    {
      id: 'quill_turret_codex',
      ico: '🏹',
      title: 'Quill turret path',
      body: 'Quill stays on the turret — walk/chase upgrades do nothing for her. After Hire Quill, buy Quill Focus (damage), Quill Cadence (attack speed), Quill Arrow Speed (faster flights), and Quill Multishot (2–3 arrows with ~12° spread) on Progress → Company.',
    },

    {
      id: 'bolt_pierce_bounce',
      ico: '➡️',
      title: 'Pierce & Bounce',
      body: 'Pierce: bolt keeps traveling along the aim ray through foes (2nd hit 60%, 3rd 35%). Bounce: after the last pierce (or first hit if no pierce targets left), ricochet to the nearest other living mob (50% then 25%). Pierce resolves first; bounce only when no more pierce targets along the ray.',
    },
    {
      id: 'rank_xp',
      ico: '⭐',
      title: 'Rank XP',
      body: 'Rank XP rises in the background while you hunt. Ranks are account milestones — not gold and not your Task bar.',
    },
    {
      id: 'longer_away',
      ico: '⏳',
      title: 'Longer Away Time',
      body: 'Timed boost from a Loot Casket. For 10 minutes it adds +45 min to how long offline progress can build up (your offline cap).',
    },

  ]

};
