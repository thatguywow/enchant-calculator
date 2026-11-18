/* =====================================================================
 *  data.js — item & enchantment tables
 *
 *  Direct port of Earthcomputer/EnchantmentCracker:
 *    src/enchcracker/Items.java, Enchantments.java, Versions.java
 *  Checked against the original Java during development (see README);
 *  tests/run.js guards it against regressions.
 * ===================================================================== */
(function (root) {
  'use strict';

  /* ---------------- versions (ordinals must match Versions.java) --------- */
  const VERSIONS = [
    { id: 'V1_8',     name: '1.8 – 1.8.9' },
    { id: 'V1_9',     name: '1.9 – 1.10.2' },
    { id: 'V1_11',    name: '1.11' },
    { id: 'V1_11_1',  name: '1.11.1 – 1.12.2' },
    { id: 'V1_13',    name: '1.13 – 1.13.2' },
    { id: 'V1_14',    name: '1.14 – 1.14.2' },
    { id: 'V1_14_3',  name: '1.14.3 – 1.15.2' },
    { id: 'V1_16',    name: '1.16 – 1.20.6' },
    { id: 'V1_21',    name: '1.21 – 1.21.8' },
    { id: 'V1_21_9',  name: '1.21.9 – 1.21.10' },
    { id: 'V1_21_11', name: '1.21.11 – latest' }
  ];
  const V = {};
  VERSIONS.forEach((v, i) => { V[v.id] = i; });

  /* ---------------- items ------------------------------------------------ */
  const MATERIALS = ['netherite', 'diamond', 'gold', 'iron', 'copper', 'chain', 'stone', 'leather'];

  const ARMOR_PREFIXES = ['leather', 'iron', 'chainmail', 'golden', 'diamond', 'turtle', 'netherite', 'copper'];
  const TOOL_PREFIXES  = ['wooden', 'stone', 'iron', 'golden', 'diamond', 'netherite', 'copper'];

  const ARMOR_PIECES = ['helmet', 'chestplate', 'leggings', 'boots'];
  const TOOL_KINDS   = ['pickaxe', 'axe', 'shovel', 'hoe'];

  const ARMOR = new Set();
  ARMOR_PREFIXES.forEach(p => ARMOR_PIECES.forEach(s => {
    if (p === 'turtle' && s !== 'helmet') return;
    ARMOR.add(p + '_' + s);
  }));

  const SWORDS = new Set(['wooden', 'stone', 'iron', 'golden', 'diamond', 'netherite', 'copper'].map(p => p + '_sword'));
  const SPEARS = new Set(['wooden', 'stone', 'iron', 'golden', 'diamond', 'netherite', 'copper'].map(p => p + '_spear'));
  const AXES   = new Set(TOOL_PREFIXES.map(p => p + '_axe'));
  const TOOLS  = new Set();
  TOOL_PREFIXES.forEach(p => TOOL_KINDS.forEach(k => TOOLS.add(p + '_' + k)));

  const I = {
    BOOK: 'book', BOW: 'bow', FISHING_ROD: 'fishing_rod', TRIDENT: 'trident', CROSSBOW: 'crossbow',
    MACE: 'mace', ELYTRA: 'elytra', SHIELD: 'shield', SHEARS: 'shears', PUMPKIN: 'pumpkin',
    SKULL: 'skull', CARROT_ON_A_STICK: 'carrot_on_a_stick', FLINT_AND_STEEL: 'flint_and_steel'
  };

  const isArmor      = it => ARMOR.has(it);
  const isHelmet     = it => ARMOR.has(it) && it.endsWith('_helmet');
  const isChestplate = it => ARMOR.has(it) && it.endsWith('_chestplate');
  const isBoots      = it => ARMOR.has(it) && it.endsWith('_boots');
  const isSword      = it => SWORDS.has(it);
  const isSpear      = it => SPEARS.has(it);
  const isAxe        = it => AXES.has(it);
  const isTool       = it => TOOLS.has(it);

  function hasDurability(it) {
    return isArmor(it) || isTool(it) || isSword(it) || isSpear(it) ||
      it === I.BOW || it === I.CARROT_ON_A_STICK || it === I.ELYTRA || it === I.FISHING_ROD ||
      it === I.FLINT_AND_STEEL || it === I.SHEARS || it === I.SHIELD || it === I.TRIDENT ||
      it === I.CROSSBOW || it === I.MACE;
  }

  function getEnchantability(it) {
    if (isArmor(it)) {
      if (it.startsWith('leather_'))   return 15;
      if (it.startsWith('iron_'))      return 9;
      if (it.startsWith('chainmail_')) return 12;
      if (it.startsWith('golden_'))    return 25;
      if (it.startsWith('diamond_'))   return 10;
      if (it.startsWith('turtle_'))    return 9;
      if (it.startsWith('netherite_')) return 15;
      if (it.startsWith('copper_'))    return 8;
    }
    if (isSword(it) || isSpear(it) || isTool(it)) {
      if (it.startsWith('wooden_'))    return 15;
      if (it.startsWith('stone_'))     return 5;
      if (it.startsWith('iron_'))      return 14;
      if (it.startsWith('golden_'))    return 22;
      if (it.startsWith('diamond_'))   return 10;
      if (it.startsWith('netherite_')) return 15;
      if (it.startsWith('copper_'))    return 13;
    }
    if (it === I.BOW || it === I.FISHING_ROD || it === I.TRIDENT || it === I.CROSSBOW || it === I.BOOK) return 1;
    if (it === I.MACE) return 15;
    return 0;
  }

  function itemIntroduced(it) {
    if (it === I.ELYTRA || it === I.SHIELD) return V.V1_9;
    if (it === I.TRIDENT || it === 'turtle_helmet') return V.V1_13;
    if (it === I.CROSSBOW) return V.V1_14;
    if (it.startsWith('netherite_') && !it.endsWith('_spear')) return V.V1_16;
    if (it === I.MACE) return V.V1_21;
    if (it.startsWith('copper_') && !it.endsWith('_spear')) return V.V1_21_9;
    if (isSpear(it)) return V.V1_21_11;
    return V.V1_8;
  }

  /* ---------------- enchantments ----------------------------------------- */
  const E = {
    PROTECTION: 'protection', FIRE_PROTECTION: 'fire_protection', FEATHER_FALLING: 'feather_falling',
    BLAST_PROTECTION: 'blast_protection', PROJECTILE_PROTECTION: 'projectile_protection',
    RESPIRATION: 'respiration', AQUA_AFFINITY: 'aqua_affinity', THORNS: 'thorns',
    DEPTH_STRIDER: 'depth_strider', SHARPNESS: 'sharpness', SMITE: 'smite',
    BANE_OF_ARTHROPODS: 'bane_of_arthropods', KNOCKBACK: 'knockback', FIRE_ASPECT: 'fire_aspect',
    LOOTING: 'looting', EFFICIENCY: 'efficiency', SILK_TOUCH: 'silk_touch', UNBREAKING: 'unbreaking',
    FORTUNE: 'fortune', POWER: 'power', PUNCH: 'punch', FLAME: 'flame', INFINITY: 'infinity',
    LUCK_OF_THE_SEA: 'luck_of_the_sea', LURE: 'lure', FROST_WALKER: 'frost_walker', MENDING: 'mending',
    BINDING_CURSE: 'binding_curse', VANISHING_CURSE: 'vanishing_curse', SWEEPING: 'sweeping',
    LOYALTY: 'loyalty', IMPALING: 'impaling', RIPTIDE: 'riptide', CHANNELING: 'channeling',
    MULTISHOT: 'multishot', QUICK_CHARGE: 'quick_charge', PIERCING: 'piercing', SOUL_SPEED: 'soul_speed',
    DENSITY: 'density', BREACH: 'breach', WIND_BURST: 'wind_burst', LUNGE: 'lunge'
  };

  // registry order matters: it decides tie-breaking inside weightedRandom
  const TABLE_ENCHANTMENTS = [
    E.PROTECTION, E.FIRE_PROTECTION, E.FEATHER_FALLING, E.BLAST_PROTECTION, E.PROJECTILE_PROTECTION,
    E.RESPIRATION, E.AQUA_AFFINITY, E.THORNS, E.DEPTH_STRIDER, E.SHARPNESS, E.SMITE,
    E.BANE_OF_ARTHROPODS, E.KNOCKBACK, E.FIRE_ASPECT, E.LOOTING, E.SWEEPING, E.EFFICIENCY,
    E.SILK_TOUCH, E.UNBREAKING, E.FORTUNE, E.POWER, E.PUNCH, E.FLAME, E.INFINITY,
    E.LUCK_OF_THE_SEA, E.LURE, E.LOYALTY, E.IMPALING, E.RIPTIDE, E.CHANNELING, E.MULTISHOT,
    E.QUICK_CHARGE, E.PIERCING, E.DENSITY, E.BREACH, E.LUNGE
  ];

  const PRETTY = {
    protection: 'Protection', fire_protection: 'Fire Protection', feather_falling: 'Feather Falling',
    blast_protection: 'Blast Protection', projectile_protection: 'Projectile Protection',
    respiration: 'Respiration', aqua_affinity: 'Aqua Affinity', thorns: 'Thorns',
    depth_strider: 'Depth Strider', sharpness: 'Sharpness', smite: 'Smite',
    bane_of_arthropods: 'Bane of Arthropods', knockback: 'Knockback', fire_aspect: 'Fire Aspect',
    looting: 'Looting', sweeping: 'Sweeping Edge', efficiency: 'Efficiency', silk_touch: 'Silk Touch',
    unbreaking: 'Unbreaking', fortune: 'Fortune', power: 'Power', punch: 'Punch', flame: 'Flame',
    infinity: 'Infinity', luck_of_the_sea: 'Luck of the Sea', lure: 'Lure', frost_walker: 'Frost Walker',
    mending: 'Mending', binding_curse: 'Curse of Binding', vanishing_curse: 'Curse of Vanishing',
    loyalty: 'Loyalty', impaling: 'Impaling', riptide: 'Riptide', channeling: 'Channeling',
    multishot: 'Multishot', quick_charge: 'Quick Charge', piercing: 'Piercing', soul_speed: 'Soul Speed',
    density: 'Density', breach: 'Breach', wind_burst: 'Wind Burst', lunge: 'Lunge'
  };

  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
  const roman = n => (n >= 1 && n <= 5 ? ROMAN[n] : String(n));

  function enchIntroduced(e) {
    switch (e) {
      case E.FROST_WALKER: case E.MENDING: return V.V1_9;
      case E.BINDING_CURSE: case E.VANISHING_CURSE: return V.V1_11;
      case E.SWEEPING: return V.V1_11_1;
      case E.LOYALTY: case E.IMPALING: case E.RIPTIDE: case E.CHANNELING: return V.V1_13;
      case E.MULTISHOT: case E.QUICK_CHARGE: case E.PIERCING: return V.V1_14;
      case E.SOUL_SPEED: return V.V1_16;
      case E.DENSITY: case E.BREACH: case E.WIND_BURST: return V.V1_21;
      case E.LUNGE: return V.V1_21_11;
      default: return V.V1_8;
    }
  }

  function canApply(e, item, primary) {
    if (item === I.BOOK) return true;
    switch (e) {
      case E.PROTECTION: case E.FIRE_PROTECTION: case E.BLAST_PROTECTION: case E.PROJECTILE_PROTECTION:
        return isArmor(item);
      case E.THORNS:
        return primary ? isChestplate(item) : isArmor(item);
      case E.FEATHER_FALLING: case E.DEPTH_STRIDER: case E.FROST_WALKER: case E.SOUL_SPEED:
        return isBoots(item);
      case E.RESPIRATION: case E.AQUA_AFFINITY:
        return isHelmet(item);
      case E.BINDING_CURSE:
        return isArmor(item) || item === I.PUMPKIN || item === I.ELYTRA || item === I.SKULL;
      case E.SHARPNESS: case E.SMITE: case E.BANE_OF_ARTHROPODS:
        return isSword(item) || isSpear(item) || (!primary && (isAxe(item) || item === I.MACE));
      case E.FIRE_ASPECT:
        return isSword(item) || isSpear(item) || (!primary && item === I.MACE);
      case E.KNOCKBACK: case E.LOOTING:
        return isSword(item) || isSpear(item);
      case E.SWEEPING:
        return isSword(item);
      case E.EFFICIENCY:
        return isTool(item) || (!primary && item === I.SHEARS);
      case E.SILK_TOUCH: case E.FORTUNE:
        return isTool(item);
      case E.POWER: case E.PUNCH: case E.FLAME: case E.INFINITY:
        return item === I.BOW;
      case E.LUCK_OF_THE_SEA: case E.LURE:
        return item === I.FISHING_ROD;
      case E.UNBREAKING: case E.MENDING:
        return hasDurability(item);
      case E.VANISHING_CURSE:
        return hasDurability(item) || item === I.PUMPKIN || item === I.SKULL;
      case E.LOYALTY: case E.IMPALING: case E.RIPTIDE: case E.CHANNELING:
        return item === I.TRIDENT;
      case E.MULTISHOT: case E.QUICK_CHARGE: case E.PIERCING:
        return item === I.CROSSBOW;
      case E.DENSITY: case E.BREACH: case E.WIND_BURST:
        return item === I.MACE;
      case E.LUNGE:
        return isSpear(item);
      default: throw new Error('Unknown enchantment: ' + e);
    }
  }

  function maxLevel(e) {
    switch (e) {
      case E.SHARPNESS: case E.SMITE: case E.BANE_OF_ARTHROPODS: case E.EFFICIENCY:
      case E.POWER: case E.IMPALING: case E.DENSITY: return 5;
      case E.PROTECTION: case E.FIRE_PROTECTION: case E.BLAST_PROTECTION:
      case E.PROJECTILE_PROTECTION: case E.FEATHER_FALLING: case E.PIERCING: case E.BREACH: return 4;
      case E.THORNS: case E.DEPTH_STRIDER: case E.RESPIRATION: case E.LOOTING: case E.SWEEPING:
      case E.FORTUNE: case E.LUCK_OF_THE_SEA: case E.LURE: case E.UNBREAKING: case E.LOYALTY:
      case E.RIPTIDE: case E.QUICK_CHARGE: case E.SOUL_SPEED: case E.WIND_BURST: case E.LUNGE: return 3;
      case E.FROST_WALKER: case E.KNOCKBACK: case E.FIRE_ASPECT: case E.PUNCH: return 2;
      default: return 1;
    }
  }

  function minPower(e, l) {
    switch (e) {
      case E.PROTECTION: return 1 + (l - 1) * 11;
      case E.FIRE_PROTECTION: return 10 + (l - 1) * 8;
      case E.FEATHER_FALLING: return 5 + (l - 1) * 6;
      case E.BLAST_PROTECTION: return 5 + (l - 1) * 8;
      case E.PROJECTILE_PROTECTION: return 3 + (l - 1) * 6;
      case E.RESPIRATION: return l * 10;
      case E.AQUA_AFFINITY: return 1;
      case E.THORNS: return 10 + (l - 1) * 20;
      case E.DEPTH_STRIDER: return l * 10;
      case E.FROST_WALKER: return l * 10;
      case E.BINDING_CURSE: return 25;
      case E.SHARPNESS: return 1 + (l - 1) * 11;
      case E.SMITE: return 5 + (l - 1) * 8;
      case E.BANE_OF_ARTHROPODS: return 5 + (l - 1) * 8;
      case E.KNOCKBACK: return 5 + (l - 1) * 20;
      case E.FIRE_ASPECT: return 10 + (l - 1) * 20;
      case E.LOOTING: return 15 + (l - 1) * 9;
      case E.SWEEPING: return 5 + (l - 1) * 9;
      case E.EFFICIENCY: return 1 + (l - 1) * 10;
      case E.SILK_TOUCH: return 15;
      case E.UNBREAKING: return 5 + (l - 1) * 8;
      case E.FORTUNE: return 15 + (l - 1) * 9;
      case E.POWER: return 1 + (l - 1) * 10;
      case E.PUNCH: return 12 + (l - 1) * 20;
      case E.FLAME: return 20;
      case E.INFINITY: return 20;
      case E.LUCK_OF_THE_SEA: return 15 + (l - 1) * 9;
      case E.LURE: return 15 + (l - 1) * 9;
      case E.MENDING: return 25;
      case E.VANISHING_CURSE: return 25;
      case E.LOYALTY: return 5 + l * 7;
      case E.IMPALING: return 1 + (l - 1) * 8;
      case E.RIPTIDE: return 10 + l * 7;
      case E.CHANNELING: return 25;
      case E.MULTISHOT: return 20;
      case E.QUICK_CHARGE: return 12 + (l - 1) * 20;
      case E.PIERCING: return 1 + (l - 1) * 10;
      case E.SOUL_SPEED: return l * 10;
      case E.DENSITY: return 5 + (l - 1) * 8;
      case E.BREACH: return 15 + (l - 1) * 9;
      case E.WIND_BURST: return 15 + (l - 1) * 9;
      case E.LUNGE: return 5 + (l - 1) * 8;
      default: throw new Error('Unknown enchantment: ' + e);
    }
  }

  function maxPower(e, l) {
    switch (e) {
      case E.PROTECTION: return 1 + l * 11;
      case E.FIRE_PROTECTION: return 10 + l * 8;
      case E.FEATHER_FALLING: return 5 + l * 6;
      case E.BLAST_PROTECTION: return 5 + l * 8;
      case E.PROJECTILE_PROTECTION: return 3 + l * 6;
      case E.RESPIRATION: return 30 + l * 10;
      case E.AQUA_AFFINITY: return 41;
      case E.THORNS: return 40 + l * 20;
      case E.DEPTH_STRIDER: return 15 + l * 10;
      case E.FROST_WALKER: return 15 + l * 10;
      case E.BINDING_CURSE: return 50;
      case E.SHARPNESS: return 21 + (l - 1) * 11;
      case E.SMITE: return 25 + (l - 1) * 8;
      case E.BANE_OF_ARTHROPODS: return 25 + (l - 1) * 8;
      case E.KNOCKBACK: return 55 + (l - 1) * 20;
      case E.FIRE_ASPECT: return 40 + l * 20;
      case E.LOOTING: return 65 + (l - 1) * 9;
      case E.SWEEPING: return 20 + (l - 1) * 9;
      case E.EFFICIENCY: return 50 + l * 10;
      case E.SILK_TOUCH: return 65;
      case E.UNBREAKING: return 55 + (l - 1) * 8;
      case E.FORTUNE: return 65 + (l - 1) * 9;
      case E.POWER: return 16 + (l - 1) * 10;
      case E.PUNCH: return 37 + (l - 1) * 20;
      case E.FLAME: return 50;
      case E.INFINITY: return 50;
      case E.LUCK_OF_THE_SEA: return 65 + (l - 1) * 9;
      case E.LURE: return 65 + (l - 1) * 9;
      case E.MENDING: return 75;
      case E.VANISHING_CURSE: return 50;
      case E.LOYALTY: return 50;
      case E.IMPALING: return 21 + (l - 1) * 8;
      case E.RIPTIDE: return 50;
      case E.CHANNELING: return 50;
      case E.MULTISHOT: return 50;
      case E.QUICK_CHARGE: return 50;
      case E.PIERCING: return 50;
      case E.SOUL_SPEED: return 15 + l * 10;
      case E.DENSITY: return 25 + (l - 1) * 8;
      case E.BREACH: return 65 + (l - 1) * 9;
      case E.WIND_BURST: return 65 + (l - 1) * 9;
      case E.LUNGE: return 25 + (l - 1) * 8;
      default: throw new Error('Unknown enchantment: ' + e);
    }
  }

  function weight(e, version) {
    const nerf = version === V.V1_14;
    switch (e) {
      case E.PROTECTION: case E.SHARPNESS: case E.EFFICIENCY: case E.POWER: case E.PIERCING:
        return nerf ? 30 : 10;
      case E.FIRE_PROTECTION: case E.FEATHER_FALLING: case E.PROJECTILE_PROTECTION: case E.SMITE:
      case E.BANE_OF_ARTHROPODS: case E.KNOCKBACK: case E.UNBREAKING: case E.LOYALTY:
      case E.QUICK_CHARGE: case E.DENSITY: case E.LUNGE:
        return nerf ? 10 : 5;
      case E.BLAST_PROTECTION: case E.RESPIRATION: case E.AQUA_AFFINITY: case E.DEPTH_STRIDER:
      case E.FROST_WALKER: case E.FIRE_ASPECT: case E.LOOTING: case E.SWEEPING: case E.FORTUNE:
      case E.PUNCH: case E.FLAME: case E.LUCK_OF_THE_SEA: case E.LURE: case E.MENDING:
      case E.IMPALING: case E.RIPTIDE: case E.MULTISHOT: case E.BREACH: case E.WIND_BURST:
        return nerf ? 3 : 2;
      case E.THORNS: case E.BINDING_CURSE: case E.SILK_TOUCH: case E.INFINITY:
      case E.VANISHING_CURSE: case E.CHANNELING: case E.SOUL_SPEED:
        return 1;
      default: throw new Error('Unknown enchantment: ' + e);
    }
  }

  const DAMAGE_ENCH = new Set([E.SHARPNESS, E.SMITE, E.BANE_OF_ARTHROPODS, E.DENSITY, E.BREACH]);
  const PROT_ENCH = new Set([E.PROTECTION, E.BLAST_PROTECTION, E.FIRE_PROTECTION, E.PROJECTILE_PROTECTION]);

  function oneWayCompatible(a, b, version) {
    if (a === b) return false;
    if (!(version < V.V1_11_1) && a === E.INFINITY && b === E.MENDING) return false;
    if (DAMAGE_ENCH.has(a) && DAMAGE_ENCH.has(b)) return false;
    if (a === E.DEPTH_STRIDER && b === E.FROST_WALKER) return false;
    if (a === E.SILK_TOUCH && (b === E.LOOTING || b === E.FORTUNE || b === E.LUCK_OF_THE_SEA)) return false;
    if (a === E.RIPTIDE && (b === E.LOYALTY || b === E.CHANNELING)) return false;
    if (a === E.MULTISHOT && b === E.PIERCING) return false;
    if (version !== V.V1_14 && PROT_ENCH.has(a) && PROT_ENCH.has(b)) return false;
    return true;
  }
  const areCompatible = (a, b, version) => oneWayCompatible(a, b, version) && oneWayCompatible(b, a, version);

  /* -------- items offered in the picker, grouped ------------------------- */
  const ITEM_GROUPS = [
    { label: 'Swords',   items: ['netherite_sword', 'diamond_sword', 'iron_sword', 'golden_sword', 'stone_sword', 'wooden_sword', 'copper_sword'] },
    { label: 'Tools',    items: ['netherite_pickaxe', 'diamond_pickaxe', 'iron_pickaxe', 'golden_pickaxe', 'stone_pickaxe', 'wooden_pickaxe', 'copper_pickaxe',
                                 'netherite_axe', 'diamond_axe', 'iron_axe', 'golden_axe', 'stone_axe', 'wooden_axe', 'copper_axe',
                                 'netherite_shovel', 'diamond_shovel', 'iron_shovel', 'golden_shovel', 'stone_shovel', 'wooden_shovel', 'copper_shovel',
                                 'netherite_hoe', 'diamond_hoe', 'iron_hoe', 'golden_hoe', 'stone_hoe', 'wooden_hoe', 'copper_hoe'] },
    { label: 'Armour',   items: ['netherite_helmet', 'netherite_chestplate', 'netherite_leggings', 'netherite_boots',
                                 'diamond_helmet', 'diamond_chestplate', 'diamond_leggings', 'diamond_boots',
                                 'iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots',
                                 'golden_helmet', 'golden_chestplate', 'golden_leggings', 'golden_boots',
                                 'chainmail_helmet', 'chainmail_chestplate', 'chainmail_leggings', 'chainmail_boots',
                                 'leather_helmet', 'leather_chestplate', 'leather_leggings', 'leather_boots',
                                 'copper_helmet', 'copper_chestplate', 'copper_leggings', 'copper_boots', 'turtle_helmet'] },
    { label: 'Ranged',   items: ['bow', 'crossbow', 'trident', 'mace'] },
    { label: 'Spears',   items: ['netherite_spear', 'diamond_spear', 'iron_spear', 'golden_spear', 'stone_spear', 'wooden_spear', 'copper_spear'] },
    { label: 'Other',    items: ['book', 'fishing_rod'] }
  ];

  const itemLabel = it => it.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

  root.ECData = {
    V, VERSIONS, MATERIALS, E, I, TABLE_ENCHANTMENTS, PRETTY, roman, ITEM_GROUPS, itemLabel,
    isArmor, isHelmet, isChestplate, isBoots, isSword, isSpear, isAxe, isTool, hasDurability,
    getEnchantability, itemIntroduced, enchIntroduced, canApply, maxLevel, minPower, maxPower,
    weight, areCompatible
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ECData;
})(typeof globalThis !== 'undefined' ? globalThis : this);
