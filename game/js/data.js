/** Contract Board — static content (original IP) */
window.CB_DATA = {
  SAVE_KEY: 'contractBoard_v1',
  TICK_MS: 500,

  /* OSRS names = private playtest only. Set USE_OSRS_NAMES false before public release. */
  USE_OSRS_NAMES: true,
  BUILD_ID: 'iom7',
  NAMES: {
    /* Systems & currencies */
    slayer_level: { osrs: 'Slayer level', standIn: 'Hunt Rank' },
    slayer_points: { osrs: 'Slayer points', standIn: 'Mark Chips' },
    slayer_reward_points: { osrs: 'Slayer reward points', standIn: 'Crest Marks' },
    prayer_points: { osrs: 'Prayer points', standIn: 'Vow Sparks' },
    slayer_master: { osrs: 'Slayer Master', standIn: 'Hunt Broker' },
    turael: { osrs: 'Turael', standIn: 'Ashen Tutor' },
    mazchna: { osrs: 'Mazchna', standIn: 'Mist Warden' },
    vannaka: { osrs: 'Vannaka', standIn: 'Iron Tutor' },
    tier_test: { osrs: 'Tier Test', standIn: 'Apex Trial' },
    slayer_task: { osrs: 'Slayer task', standIn: 'Hunt Assignment' },
    prayer: { osrs: 'Prayer', standIn: 'Vow Board' },
    smithing: { osrs: 'Smithing', standIn: 'Anvil' },
    scrapwork: { osrs: 'Scrapwork', standIn: 'Scrap Bench' },
    cannon: { osrs: 'Cannon', standIn: 'Bolt Battery' },
    chain_cannon: { osrs: 'Chain Cannon', standIn: 'Ripple Battery' },
    auto_cannon: { osrs: 'Auto-Cannon', standIn: 'Auto-Battery' },
    hired_helpers: { osrs: 'Hired helpers', standIn: 'Company' },
    combat_rank: { osrs: 'Combat rank', standIn: 'Field Rank' },
    turaels_cave: { osrs: "Turael's Cave", standIn: 'Ashen Hollow' },
    mazchnas_crypt: { osrs: "Mazchna's Crypt", standIn: 'Mistvault' },
    /* Upgrades */
    idle_power: { osrs: 'Idle Power', standIn: 'Steady Hand' },
    unlock_crits: { osrs: 'Unlock Crits', standIn: 'Lucky Hits' },
    crit_power: { osrs: 'Crit Power', standIn: 'Heavy Crits' },
    special_cadence: { osrs: 'Special Cadence', standIn: 'Battery Tempo' },
    hunter_power: { osrs: 'Hunter Power', standIn: 'Company Power' },
    hunter_damage: { osrs: 'Bigger Hits', standIn: 'Heavier Swings' },
    hunter_atk_speed: { osrs: 'Faster Attacks', standIn: 'Quicker Strikes' },
    offline_cap: { osrs: 'Offline Cap', standIn: 'Longer Watch' },
    prey_chip: { osrs: 'Boss Meter Focus', standIn: 'Trial Focus' },
    tempered_edge: { osrs: 'Tempered Edge', standIn: 'Tempered Edge' },
    sharp_eye: { osrs: 'Sharp Eye', standIn: 'Keen Eye' },
    thick_hide: { osrs: 'Thick Hide', standIn: 'Hard Swing' },
    easy_assignments: { osrs: 'Easy Assignments', standIn: 'Soft Quotas' },
    restful_sleep: { osrs: 'Restful Sleep', standIn: 'Deep Rest' },
    /* Helpers */
    warrior: { osrs: 'Hired Warrior', standIn: 'Thornblade' },
    archer: { osrs: 'Hired Archer', standIn: 'Quillshot' },
    berserker: { osrs: 'Hired Berserker', standIn: 'Mosshew' },
    mage: { osrs: 'Hired Mage', standIn: 'Emberstaff' },
    briar: { osrs: 'Hired Warrior', standIn: 'Thornblade' },
    quill: { osrs: 'Hired Archer', standIn: 'Quillshot' },
    moss: { osrs: 'Hired Berserker', standIn: 'Mosshew' },
    ember: { osrs: 'Hired Mage', standIn: 'Emberstaff' },
    /* Monsters — Turael W1 (art remapped from bears short-term) */
    crawling_hand: { osrs: 'Crawling Hand', standIn: 'Gripkin' },
    gripkin: { osrs: 'Crawling Hand', standIn: 'Gripkin' },
    cave_crawler: { osrs: 'Cave Crawler', standIn: 'Cave Skitter' },
    cave_skitter: { osrs: 'Cave Crawler', standIn: 'Cave Skitter' },
    banshee: { osrs: 'Banshee', standIn: 'Wailshade' },
    wailshade: { osrs: 'Banshee', standIn: 'Wailshade' },
    rockslug: { osrs: 'Rockslug', standIn: 'Stone Slug' },
    infernal_mage: { osrs: 'Infernal Mage', standIn: 'Cinder Adept' },
    tier_test_1: { osrs: 'Crawling Hand Champion', standIn: 'Gripkin Elder' },
    gripkin_elder: { osrs: 'Crawling Hand Champion', standIn: 'Gripkin Elder' },
    tier_test_2: { osrs: 'Cave Crawler Matron', standIn: 'Skitter Matron' },
    tier_test_3: { osrs: 'Screaming Banshee', standIn: 'Wail Matron' },
    /* Parked for later masters — keep data/art */
    ashfang_pup: { osrs: 'Ashfang Pup', standIn: 'Ashfang Pup' },
    ashfang_wolf: { osrs: 'Ashfang Wolf', standIn: 'Ashfang Wolf' },
    dire_ashfang: { osrs: 'Dire Ashfang', standIn: 'Dire Ashfang' },
    ashfang_alpha: { osrs: 'Ashfang Alpha', standIn: 'Ashfang Alpha' },
    silkling: { osrs: 'Silkling', standIn: 'Silkling' },
    webfen_widow: { osrs: 'Webfen Widow', standIn: 'Webfen Widow' },
    brood_matron: { osrs: 'Brood Matron', standIn: 'Brood Matron' },
    nightweave: { osrs: 'Nightweave', standIn: 'Nightweave' },
  },

  /** Resolve a NAMES key to the active display string. */
  nameOf: function (key) {
    const n = this.NAMES && this.NAMES[key];
    if (!n) return key;
    return this.USE_OSRS_NAMES ? n.osrs : n.standIn;
  },

  /* Shared IOM run-upgrade cost curve (levels 1–10: Base×N; 11+: Base×1.3^(N-10)×N). N = level being bought (1-indexed). */
  SHARED_CURVE_IDS: {
    idle_power: true,
    crit_power: true,
    special_cadence: true,
    hunter_power: true,
    hunter_damage: true,
    hunter_atk_speed: true,
    briar_blade: true,
    briar_strength: true,
    quill_focus: true,
    quill_cadence: true,
    quill_arrow_speed: true,
  },

  /* Prayer stub skills (unlock board at Slayer level 6) */
  prayerSkills: [
    { id: 'sharp_eye', nameKey: 'sharp_eye', emoji: '👁️', cost: 1, desc: '+5% crit chance, +15% crit damage', effect: { critChance: 0.05, critDmg: 0.15 } },
    { id: 'thick_hide', nameKey: 'thick_hide', emoji: '🛡️', cost: 1, desc: '+20% weapon damage', effect: { killMult: 0.20 } },
  ],

  /* Slayer-level unlock gates (resource costs still apply; no time gates) */
  SLAYER_UNLOCKS: {
    1: ['hunt', 'bronze', 'idle_power'],
    2: ['smithing'],
    3: ['cannon', 'unlock_specials'],
    4: ['hire_warrior', 'hunter_briar'],
    6: ['prayer'],
    7: ['unlock_crits'],
    8: ['hunter_quill'],
  },


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
    { id: 'sewers', name: 'Level 1', emoji: '1️⃣', unlock: true, mult: 1.0, order: 0, codexSubtitle: "Turael's Cave" },
    { id: 'mistwood', name: 'Level 2', emoji: '2️⃣', unlock: false, mult: 1.35, order: 1, codexSubtitle: 'Ashfang pack' },
    { id: 'crypt', name: 'Level 3', emoji: '3️⃣', unlock: false, mult: 1.8, order: 2, codexSubtitle: 'Nightweave' },
    /* Internal only — kept for old saves; never primary chrome */
    { id: 'ashrim', name: 'Level 4', emoji: '4️⃣', unlock: false, mult: 2.5, order: 3, codexSubtitle: 'Coming later', hidden: true },
  ],

  hunters: [
    { id: 'briar', name: 'Briar', nameKey: 'warrior', emoji: '🗡️', idle: 1.0, unlock: false, role: 'melee', weapon: 'sword' },
    { id: 'quill', name: 'Quill', nameKey: 'archer', emoji: '🏹', idle: 0.85, unlock: false, role: 'ranged', weapon: 'bow' },
    { id: 'moss', name: 'Moss', nameKey: 'berserker', emoji: '🪓', idle: 1.15, unlock: false, role: 'melee', weapon: 'axe' },
    { id: 'ember', name: 'Ember', nameKey: 'mage', emoji: '🔥', idle: 1.4, unlock: false, role: 'mage', weapon: 'staff' },
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
    /* —— Level 1 · Turael set (OSRS names via NAMES map; art remapped from bears) —— */
    {
      id: 'bristle_cub', name: 'Crawling Hand', nameKey: 'gripkin', areaId: 'sewers', emoji: '🖐️', visual: 'gripkin',
      displayLevel: 8,
      miniDesc: 'Tiny early task — teaches aim. · Lv 8',
      killQuota: 8, pointsPerKill: 1.5, finishBonus: 18,
      goldMin: 4, goldMax: 7, scrapChance: 0.28, rareChance: 0.02,
      mult: 1.0, foodPerKill: 0.35, tutorial: true,
      combat: {
        hpMult: 0.70, moveMult: 1.40, spawnMult: 1.25, wanderAmp: 1.2,
        aimAssistMod: 4, hitWidthMult: 1.1,
      },
      masteryPerks: [
        { at: 3, scrapChance: 0.05, text: '+5% global scrap chance' },
        { at: 6, scrapChance: 0.08, text: '+8% global scrap chance' },
        { at: 10, scrapChance: 0.12, text: '+12% global scrap chance' },
      ],
    },
    {
      id: 'thornpelt_bear', name: 'Cave Crawler', nameKey: 'cave_skitter', areaId: 'sewers', emoji: '🐛', visual: 'cave_skitter',
      displayLevel: 18,
      miniDesc: 'Adult mid task — tanky. · Lv 18',
      killQuota: 12, pointsPerKill: 2.0, finishBonus: 35,
      goldMin: 5, goldMax: 9, scrapChance: 0.22, rareChance: 0.03,
      mult: 1.1, foodPerKill: 0.45,
      combat: {
        hpMult: 1.50, moveMult: 0.50, spawnMult: 0.65, wanderAmp: 0.50,
        aimAssistMod: 2, hitWidthMult: 1.35,
      },
      signatureDrop: { id: 'pelt_scrap', chance: 0.12 },
      masteryPerks: [
        { at: 3, scrapChance: 0.04, text: '+4% global scrap chance' },
        { at: 6, offlineCapMin: 15, text: '+15 min offline cap' },
        { at: 10, scrapChance: 0.06, offlineCapMin: 20, text: '+6% scrap · +20 min offline cap' },
      ],
    },
    {
      id: 'dire_thornpelt', name: 'Banshee', nameKey: 'wailshade', areaId: 'sewers', emoji: '👻', visual: 'wailshade',
      displayLevel: 26,
      miniDesc: 'Elite — Slayer-point lean. · Lv 26',
      killQuota: 24, pointsPerKill: 2.4, finishBonus: 55,
      goldMin: 6, goldMax: 11, scrapChance: 0.16, rareChance: 0.04,
      mult: 1.2, foodPerKill: 0.5, foodDropChance: 0.18, foodDropAmt: 2,
      combat: {
        hpMult: 1.20, moveMult: 1.45, spawnMult: 1.05, wanderAmp: 1.25,
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
        hpMult: 0.55, moveMult: 1.55, spawnMult: 1.35, wanderAmp: 1.4,
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
        hpMult: 0.70, moveMult: 1.15, spawnMult: 1.35, wanderAmp: 0.85,
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
        hpMult: 1.35, hpMultNoPierce: 1.25, moveMult: 0.95, spawnMult: 1.1,
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
  /*
   * iom7 — Equip gear ladder (design/visual-gear-ladder.md). Armor lives OUTSIDE upgrades:
   * each tier's stat is what that tier gives (not additive), so only EQUIPPED items count.
   * Cost = slotBase × 1.3^(3t), rounded like the brief table (10 / 50 / 100).
   * Metal tier (1–7) may not exceed the owned weapon tier; Leather (0) is exempt.
   */
  ARMOR_SLOTS: {
    legs: { label: 'Legs', minSlayerLevel: 5, base: 40, stat: 'killMult', statLabel: 'weapon dmg',
      values: [0.02, 0.04, 0.08, 0.12, 0.17, 0.22, 0.28, 0.36],
      names: ['Leather chaps', 'Bronze platelegs', 'Iron platelegs', 'Steel platelegs', 'Mithril platelegs', 'Adamant platelegs', 'Rune platelegs', 'Dragon platelegs'] },
    body: { label: 'Body', minSlayerLevel: 7, base: 90, stat: 'lootGold', statLabel: 'loot gold',
      values: [0.03, 0.05, 0.10, 0.16, 0.22, 0.30, 0.38, 0.50],
      names: ['Leather body', 'Bronze platebody', 'Iron platebody', 'Steel platebody', 'Mithril platebody', 'Adamant platebody', 'Rune platebody', 'Dragon chainbody'] },
    helm: { label: 'Helm', minSlayerLevel: 9, base: 150, stat: 'critChance', statLabel: 'crit',
      values: [0.01, 0.02, 0.03, 0.04, 0.06, 0.08, 0.10, 0.12],
      names: ['Leather coif', 'Bronze med helm', 'Iron med helm', 'Steel med helm', 'Mithril full helm', 'Adamant full helm', 'Rune full helm', 'Dragon med helm'] },
  },
  ARMOR_METALS: ['leather', 'bronze', 'iron', 'steel', 'mithril', 'adamant', 'rune', 'dragon'],
  /* Earned (not bought) — kept through prestige. Hooks: CB_STATE.grantEarnedGear */
  EARNED_GEAR: {
    helm_slayer: { id: 'helm_slayer', slot: 'helm', name: 'Slayer helm', earned: true,
      trigger: 'Clear the SL20 Mazchna gate', effect: { critChance: 0.12, pointsMult: 0.10 },
      desc: '+12% crit · +10% Slayer points' },
    cape_slayer: { id: 'cape_slayer', slot: 'cape', name: 'Slayer cape', earned: true,
      trigger: 'First prestige (trim +1 per later prestige, max 3)', effect: { offlineCap: 0.10 }, trimOfflineCap: 0.05, maxTrim: 3,
      desc: '+10% offline cap (+5% per trim)' },
  },

  markedPrey: [
    {
      id: 'sewer_king', areaId: 'sewers', name: 'Crawling Hand Champion', nameKey: 'gripkin_elder', emoji: '🖐️',
      displayLevel: 30, visual: 'gripkin_elder',
      bossCost: 120, threshold: 120, chipPerKill: 0, /* threshold alias for legacy UI */
      combat: { hpMult: 4.0, moveMult: 0.65, wanderAmp: 0.45, aimAssistMod: 2, hitWidthMult: 1.3 },
      relicId: 'rat_tooth', unlockAreaId: 'mistwood',
      rewardPoints: 100, rewardGold: 200,
    },
    {
      id: 'mist_wraith', areaId: 'mistwood', name: 'Ashfang Alpha', nameKey: 'ashfang_alpha', emoji: '🐺',
      displayLevel: 69, visual: 'ashfang_alpha',
      bossCost: 280, threshold: 280, chipPerKill: 0,
      combat: { hpMult: 5.6, moveMult: 1.15, wanderAmp: 1.1, aimAssistMod: -2, hitWidthMult: 1.1 },
      relicId: 'fog_lens', unlockAreaId: 'crypt',
      rewardPoints: 250, rewardGold: 500,
    },
    {
      id: 'crypt_lord', areaId: 'crypt', name: 'Nightweave', nameKey: 'nightweave', emoji: '🕷️',
      displayLevel: 720, visual: 'nightweave',
      bossCost: 600, threshold: 600, chipPerKill: 0,
      combat: { hpMult: 7.8, moveMult: 1.05, wanderAmp: 0.9, aimAssistMod: 0, hitWidthMult: 1.15, clump: false },
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
      id: 'idle_power', name: 'Idle Power', nameKey: 'idle_power', emoji: '⚡',
      desc: '+12% kill rate',
      baseCost: 25, costMult: 1.55, maxLevel: 40,
      costCurrency: 'gold', sharedCurve: true,
      minSlayerLevel: 1,
      effect: { idlePower: 0.12 },
    },

    /* Metal gear ladder — resource costs (former time targets → gold/points; see design/time-gates-to-costs.md) */
    {
      id: 'gear_bronze', name: 'Bronze Blade', emoji: '🗡️',
      desc: 'Starter metal · +8% kill rate',
      baseCost: 0, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      effect: { idlePower: 0.08 },
      gearTier: 1, requiresUpgrade: null,
    },
    {
      id: 'gear_iron', name: 'Iron Blade', emoji: '🗡️',
      desc: 'Iron tier · +12% kill rate',
      baseCost: 55, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      minSlayerLevel: 1,
      effect: { idlePower: 0.12 },
      gearTier: 2, requiresUpgrade: 'gear_bronze',
    },
    {
      id: 'gear_steel', name: 'Steel Blade', emoji: '⚔️',
      desc: 'Steel tier · +16% kill rate',
      baseCost: 450, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      effect: { idlePower: 0.16 },
      gearTier: 3, requiresUpgrade: 'gear_iron',
    },
    {
      id: 'gear_mithril', name: 'Mithril Blade', emoji: '⚔️',
      desc: 'Mithril tier · +22% kill rate',
      baseCost: 320, costMult: 1, maxLevel: 1,
      costCurrency: 'points',
      effect: { idlePower: 0.22 },
      gearTier: 4, requiresUpgrade: 'gear_steel',
    },
    {
      id: 'gear_adamant', name: 'Adamant Blade', emoji: '🛡️',
      desc: 'Adamant tier · +28% kill rate',
      baseCost: 700, costMult: 1, maxLevel: 1,
      costCurrency: 'points',
      effect: { idlePower: 0.28 },
      gearTier: 5, requiresUpgrade: 'gear_mithril',
    },
    {
      id: 'gear_rune', name: 'Rune Blade', emoji: '✨',
      desc: 'Rune tier · +35% kill rate',
      baseCost: 1500, costMult: 1, maxLevel: 1,
      costCurrency: 'points',
      effect: { idlePower: 0.35 },
      gearTier: 6, requiresUpgrade: 'gear_adamant',
    },
    {
      id: 'gear_dragon', name: 'Dragon Blade', emoji: '🐉',
      desc: 'Dragon tier · +50% kill rate',
      baseCost: 3500, costMult: 1, maxLevel: 1,
      costCurrency: 'points',
      effect: { idlePower: 0.5 },
      gearTier: 7, requiresUpgrade: 'gear_rune',
    },

    /* Combat feature unlocks */
    {
      id: 'unlock_crits', name: 'Unlock Crits', nameKey: 'unlock_crits', emoji: '💥',
      desc: 'Enable critical hits',
      baseCost: 250, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      minSlayerLevel: 7,
      effect: { feature: 'crits' },
    },
    {
      id: 'unlock_specials', name: 'Cannon', nameKey: 'cannon', emoji: '💥',
      desc: 'Dwarf multicannon · 30s recharge · ~4× bolt chip on tasks (0 dmg on Tier Tests)',
      baseCost: 50, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      minSlayerLevel: 3,
      effect: { feature: 'specials' },
    },
    {
      id: 'beam_focus', name: 'Bolt Focus', emoji: '🔆',
      desc: '+bolt visual tier & +5% bolt feel',
      baseCost: 90, costMult: 1.8, maxLevel: 3,
      costCurrency: 'gold',
      effect: { beamFocus: 1 },
    },
    {
      id: 'crit_power', name: 'Crit Power', nameKey: 'crit_power', emoji: '💢',
      desc: '+4% crit chance (requires Unlock Crits)',
      baseCost: 300, costMult: 1.7, maxLevel: 10,
      costCurrency: 'gold', sharedCurve: true,
      minSlayerLevel: 7,
      effect: { critChance: 0.04 },
      requiresUpgrade: 'unlock_crits',
    },
    {
      id: 'special_cadence', name: 'Special Cadence', nameKey: 'special_cadence', emoji: '⏱️',
      desc: 'Cannon recharges faster',
      baseCost: 80, costMult: 1.75, maxLevel: 5,
      costCurrency: 'gold', sharedCurve: true,
      minSlayerLevel: 3,
      effect: { specialCadence: 0.12 },
      requiresUpgrade: 'unlock_specials',
    },
    {
      id: 'bolt_pierce', name: 'Bolt Pierce', emoji: '➡️',
      desc: 'Bolts keep going through foes; later hits deal less (60% then 35%). Cap 1, then 2.',
      baseCost: 180, costMult: 2.2, maxLevel: 2,
      costCurrency: 'gold',
      effect: { boltPierce: 1 },
    },
    {
      id: 'bolt_bounce', name: 'Bolt Bounce', emoji: '↩️',
      desc: 'On hit, bolt ricochets to a nearby foe; bounce hits deal 50% then 25%. Cap 1, then 2.',
      baseCost: 250, costMult: 2.2, maxLevel: 2,
      costCurrency: 'gold',
      effect: { boltBounce: 1 },
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

    /* Company hires — resource costs; none start unlocked */
    {
      id: 'hunter_briar', name: 'Hire Warrior', nameKey: 'warrior', emoji: '🗡️',
      desc: 'First hired helper · melee · starts slow',
      baseCost: 140, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      minSlayerLevel: 4,
      effect: { unlockHunter: 'briar' },
    },
    {
      id: 'hunter_quill', name: 'Hire Archer', nameKey: 'archer', emoji: '🏹',
      desc: 'Ranged helper · turret archer',
      baseCost: 900, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      minSlayerLevel: 8,
      effect: { unlockHunter: 'quill' },
    },
    {
      id: 'hunter_moss', name: 'Hire Berserker', nameKey: 'berserker', emoji: '🪓',
      desc: 'Melee helper · heavy axe',
      baseCost: 2000, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      minSlayerLevel: 13,
      effect: { unlockHunter: 'moss' },
    },
    {
      id: 'hunter_ember', name: 'Hire Mage', nameKey: 'mage', emoji: '🔥',
      desc: 'Mage helper · staff bolts',
      baseCost: 4200, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      minSlayerLevel: 13,
      effect: { unlockHunter: 'ember' },
    },
    {
      id: 'hunter_power', name: 'Hunter Power', emoji: '💪',
      desc: '+30%/lv overall hunter output (live chips × AFK idle · stacks with Bigger Hits · not your bolts)',
      baseCost: 250, costMult: 1.65, maxLevel: 20,
      costCurrency: 'gold',
      sharedCurve: true,
      effect: { hunterPower: 0.30 },
      requiresUpgrade: 'hunter_briar',
    },
    {
      id: 'hunter_damage', name: 'Bigger Hits', emoji: '🗡️',
      desc: '+40%/lv per-hit damage only (swings/arrows · not walk speed · not your bolts)',
      baseCost: 300, costMult: 1.7, maxLevel: 15,
      costCurrency: 'gold',
      sharedCurve: true,
      effect: { hunterDmg: 0.40 },
      requiresUpgrade: 'hunter_briar',
    },
    {
      id: 'hunter_atk_speed', name: 'Faster Attacks', emoji: '⏱️',
      desc: '+30%/lv attack speed — swing/shoot faster · not walk speed · not your bolts',
      baseCost: 320, costMult: 1.75, maxLevel: 12,
      costCurrency: 'gold',
      sharedCurve: true,
      effect: { hunterAtkSpeed: 0.30 },
      requiresUpgrade: 'hunter_briar',
    },
    {
      id: 'hunter_swift_step', name: 'Swift Walk', emoji: '👟',
      desc: '+55% melee walk/chase — Briar / melee only (not Quill · not attack rate)',
      baseCost: 160, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      effect: { hunterMoveSpeed: 0.55 },
      requiresUpgrade: 'hunter_briar',
    },
    {
      id: 'hunter_pace', name: 'Faster Chase', emoji: '🏃',
      desc: '+70% melee walk/chase — Briar / melee only (stacks with Swift Walk · not Quill)',
      baseCost: 360, costMult: 1, maxLevel: 1,
      costCurrency: 'gold',
      effect: { hunterMoveSpeed: 0.70 },
      requiresUpgrade: 'hunter_swift_step',
    },
    {
      id: 'hunter_charge', name: 'Hard Charge', emoji: '⚡',
      desc: '+90% melee walk/chase speed — Briar / melee only (not attack rate · not Quill)',
      baseCost: 400, costMult: 1, maxLevel: 1,
      costCurrency: 'points',
      effect: { hunterMoveSpeed: 0.90 },
      requiresUpgrade: 'hunter_pace',
    },
    {
      id: 'briar_blade', name: 'Briar Blade', emoji: '⚔️',
      desc: '+40%/lv Briar-only sword damage (not Quill · not shared Bigger Hits)',
      baseCost: 250, costMult: 1.7, maxLevel: 5,
      costCurrency: 'gold',
      effect: { briarDmg: 0.40 },
      requiresUpgrade: 'hunter_briar',
    },
    {
      id: 'briar_strength', name: 'Briar Strength', emoji: '💪',
      desc: '+35%/lv Briar-only damage (stacks with Briar Blade · not Quill · not Bigger Hits)',
      baseCost: 300, costMult: 1.75, maxLevel: 5,
      costCurrency: 'gold',
      effect: { briarDmg: 0.35 },
      requiresUpgrade: 'hunter_briar',
    },
    {
      id: 'quill_focus', name: 'Quill Focus', emoji: '🎯',
      desc: '+40%/lv Quill-only arrow damage (stacks with Bigger Hits · turret Quill)',
      baseCost: 450, costMult: 1.7, maxLevel: 12,
      costCurrency: 'gold',
      effect: { quillDmg: 0.40 },
      requiresUpgrade: 'hunter_quill',
    },
    {
      id: 'quill_cadence', name: 'Quill Cadence', emoji: '🏹',
      desc: '+30%/lv Quill-only attack speed (stacks with Faster Attacks · turret Quill)',
      baseCost: 480, costMult: 1.75, maxLevel: 10,
      costCurrency: 'gold',
      effect: { quillAtkSpeed: 0.30 },
      requiresUpgrade: 'hunter_quill',
    },
    {
      id: 'quill_arrow_speed', name: 'Quill Arrow Speed', emoji: '💨',
      desc: '+25%/lv faster Quill arrows (lower flight time · turret Quill)',
      baseCost: 450, costMult: 1.7, maxLevel: 8,
      costCurrency: 'gold',
      effect: { quillProjSpeed: 0.25 },
      requiresUpgrade: 'hunter_quill',
    },
    {
      id: 'quill_multishot', name: 'Quill Multishot', emoji: '➶',
      desc: 'Extra arrows per shot: Lv1 = 2 arrows (~12° spread), Lv2 = 3. Extras deal ~85% damage. Need Quill Focus or Cadence first.',
      baseCost: 400, costMult: 1.85, maxLevel: 2,
      costCurrency: 'points',
      effect: { quillMultishot: 1 },
      requiresAnyUpgrade: ['quill_focus', 'quill_cadence'],
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


    /* Smithing stub — permanent (prestige-keep); board unlocks at Slayer level 2 */
    {
      id: 'tempered_edge', name: 'Tempered Edge', nameKey: 'tempered_edge', emoji: '🔨',
      desc: '+3% weapon damage per level (Smithing)',
      baseCost: 60, costMult: 1.45, maxLevel: 42,
      costCurrency: 'gold',
      minSlayerLevel: 2,
      prestigeKeep: true,
      effect: { killMult: 0.03 },
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
      id: 'forge_echo', name: 'Fang Charm', emoji: '🦷',
      desc: '+12 min offline cap (Ashfang specialist)',
      baseCost: 0, costMult: 1, maxLevel: 1,
      costCurrency: 'mats',
      costMats: { ashfang_fang: 10 },
      prestigeKeep: true,
      effect: { offlineCapMin: 12 },
    },
    {
      id: 'forge_cinder', name: 'Thread Tip', emoji: '🧵',
      desc: '+4% bolt kill power (Silk specialist)',
      baseCost: 0, costMult: 1, maxLevel: 1,
      costCurrency: 'mats',
      costMats: { silk_thread: 10 },
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
      { id: 'c_crits', label: 'Unlock Crits', kind: 'unlock', requires: ['c_start'], upgradeId: 'unlock_crits', feature: 'crits' },
      { id: 'c_specials', label: 'Cannon', kind: 'unlock', requires: ['c_start'], upgradeId: 'unlock_specials', feature: 'specials' },
      { id: 'c_beam', label: 'Bolt Focus', kind: 'unlock', requires: ['c_start'], upgradeId: 'beam_focus' },
      { id: 'c_crit_pwr', label: 'Crit Power', kind: 'upgrade', requires: ['c_crits'], upgradeId: 'crit_power' },
      { id: 'c_spec_cad', label: 'Special Cadence', kind: 'upgrade', requires: ['c_specials'], upgradeId: 'special_cadence' },
      { id: 'c_beam2', label: 'Bolt Focus II+', kind: 'upgrade', requires: ['c_beam'], upgradeId: 'beam_focus' },
      { id: 'c_pierce', label: 'Bolt Pierce', kind: 'unlock', requires: ['c_beam'], upgradeId: 'bolt_pierce' },
      { id: 'c_bounce', label: 'Bolt Bounce', kind: 'unlock', requires: ['c_beam'], upgradeId: 'bolt_bounce' },
      { id: 'c_pierce2', label: 'Pierce II', kind: 'upgrade', requires: ['c_pierce'], upgradeId: 'bolt_pierce' },
      { id: 'c_bounce2', label: 'Bounce II', kind: 'upgrade', requires: ['c_bounce'], upgradeId: 'bolt_bounce' },
      { id: 'c_field', label: 'Field Ready', kind: 'milestone', requires: ['c_crits', 'c_beam'] },
      { id: 'c_idle', label: 'Idle Power', kind: 'upgrade', requires: ['c_field'], upgradeId: 'idle_power' },
      { id: 'c_final', label: 'Combat Mastery', kind: 'milestone', requires: ['c_specials', 'c_crit_pwr', 'c_idle'] },
    ],
    gear: [
      { id: 'g_start', label: 'Start · Bronze', kind: 'milestone', requires: [], upgradeId: 'gear_bronze' },
      { id: 'g_iron', label: 'Iron Blade', kind: 'unlock', requires: ['g_start'], upgradeId: 'gear_iron' },
      { id: 'g_steel', label: 'Steel Blade', kind: 'unlock', requires: ['g_iron'], upgradeId: 'gear_steel' },
      { id: 'g_mith', label: 'Mithril Blade', kind: 'unlock', requires: ['g_steel'], upgradeId: 'gear_mithril' },
      { id: 'g_adam', label: 'Adamant Blade', kind: 'unlock', requires: ['g_mith'], upgradeId: 'gear_adamant' },
      { id: 'g_rune', label: 'Rune Blade', kind: 'unlock', requires: ['g_adam'], upgradeId: 'gear_rune' },
      { id: 'g_drag', label: 'Dragon Blade', kind: 'unlock', requires: ['g_rune'], upgradeId: 'gear_dragon' },
      { id: 'g_final', label: 'Full Dragon', kind: 'milestone', requires: ['g_drag'] },
    ],
    company: [
      { id: 'co_start', label: 'Start · Solo', kind: 'milestone', requires: [] },
      { id: 'co_briar', label: 'Hire Warrior', kind: 'unlock', requires: ['co_start'], upgradeId: 'hunter_briar' },
      { id: 'co_swift', label: 'Swift Walk · melee', kind: 'upgrade', requires: ['co_briar'], upgradeId: 'hunter_swift_step' },
      { id: 'co_pace', label: 'Faster Chase · melee', kind: 'upgrade', requires: ['co_swift'], upgradeId: 'hunter_pace' },
      { id: 'co_charge', label: 'Hard Charge · melee', kind: 'upgrade', requires: ['co_pace'], upgradeId: 'hunter_charge' },
      { id: 'co_hp1', label: 'Hunter Power', kind: 'upgrade', requires: ['co_briar'], upgradeId: 'hunter_power' },
      { id: 'co_hdmg', label: 'Bigger Hits', kind: 'upgrade', requires: ['co_briar'], upgradeId: 'hunter_damage' },
      { id: 'co_hcad', label: 'Faster Attacks', kind: 'upgrade', requires: ['co_briar'], upgradeId: 'hunter_atk_speed' },
      { id: 'co_briar_blade', label: 'Briar Blade', kind: 'upgrade', requires: ['co_briar'], upgradeId: 'briar_blade' },
      { id: 'co_briar_str', label: 'Briar Strength', kind: 'upgrade', requires: ['co_briar'], upgradeId: 'briar_strength' },
      { id: 'co_quill', label: 'Hire Archer', kind: 'unlock', requires: ['co_briar'], upgradeId: 'hunter_quill' },
      { id: 'co_quill_dmg', label: 'Quill Focus', kind: 'upgrade', requires: ['co_quill'], upgradeId: 'quill_focus' },
      { id: 'co_quill_spd', label: 'Quill Cadence', kind: 'upgrade', requires: ['co_quill'], upgradeId: 'quill_cadence' },
      { id: 'co_quill_proj', label: 'Quill Arrow Speed', kind: 'upgrade', requires: ['co_quill'], upgradeId: 'quill_arrow_speed' },
      { id: 'co_quill_multi', label: 'Quill Multishot', kind: 'upgrade', requires: ['co_quill_dmg', 'co_quill_spd'], requiresAny: true, upgradeId: 'quill_multishot' },
      { id: 'co_moss', label: 'Hire Berserker', kind: 'unlock', requires: ['co_quill'], upgradeId: 'hunter_moss' },
      { id: 'co_ember', label: 'Hire Mage', kind: 'unlock', requires: ['co_moss'], upgradeId: 'hunter_ember' },
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
      id: 'forge_grip_rush', name: 'Claw Rush', emoji: '🐾',
      desc: '10 min: +25% scrap chance',
      durationMs: 600000,
      costMats: { dire_claw: 3 },
      scrapChanceBonus: 0.25,
    },
    {
      id: 'forge_wail_focus', name: 'Pack Focus', emoji: '🧥',
      desc: '10 min: +15% Slayer points',
      durationMs: 600000,
      costMats: { pack_hide: 3 },
      pointsMult: 1.15,
    },
    {
      id: 'forge_ember_barrage', name: 'Venom Barrage', emoji: '🧪',
      desc: '10 min: +10% bolt kill power',
      durationMs: 600000,
      costMats: { venom_sac: 3 },
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
      body: "Level 1 (Turael): Crawling Hand → Cave Crawler → Banshee → Crawling Hand Champion (Tier Test). Wolves/spiders are parked for later Slayer masters. Finish Tasks to unlock the next hunt target.",
    },
    {
      id: 'area_boss',
      ico: '👑',
      title: 'Tier Test',
      body: 'Earn Slayer points to fill the Tier Test meter. When full, tap Fight for a 45–90s sit-down. Helpers and Cannon are muted — weapon only. Win raises Slayer level. Leave fight resets HP but keeps access.',
    },
    {
      id: 'elder_thornpelt',
      ico: '🖐️',
      title: 'Crawling Hand Champion · Lv 30',
      body: 'Tier Test 1. Fill the Slayer-point meter (120), then Fight. Helpers & Cannon deal 0 — weapon bolts only. Relic + Slayer level on kill.',
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
      body: 'Secondary loot from kills. Spend in Camp → Scrapwork. Signature mats craft in Camp → Forge: Pelt Scrap, Dire Claw, Ashfang Fang, Pack Hide, Silk Thread, Venom Sac.',
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
