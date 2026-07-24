/* =====================================================================
 *  enchant.js — java.util.Random + the vanilla enchanting table
 *
 *  Ports:
 *    EnchantmentMenu#slotsChanged        -> costs()
 *    EnchantmentHelper#getEnchantmentCost-> tableBase()
 *    EnchantmentHelper#selectEnchantment -> addRandomEnchantments()
 *    EnchantmentMenu#getEnchantmentList  -> enchantmentsInTable()
 *  Cross-checked against Earthcomputer's Java on 4700+ random cases.
 * ===================================================================== */
(function (root) {
  'use strict';
  const D = root.ECData || require('./data.js');

  const TWO24 = 0x1000000;
  const M_HI = 0x5DE, M_LO = 0xECE66D;   // 0x5DEECE66D split into 24-bit halves

  /** Faithful java.util.Random (48-bit LCG) built on doubles. */
  class JavaRandom {
    constructor(seed) { this.seed = 0; if (seed !== undefined) this.setSeed(seed); }

    /** setSeed with an int argument, sign-extended exactly like Java's (long) cast. */
    setSeedInt(s) {
      s |= 0;
      const lo = (s >>> 0) ^ 0xDEECE66D;
      const hi = ((s < 0 ? 0xFFFF : 0) ^ 0x5);
      this.seed = hi * 4294967296 + (lo >>> 0);
      return this;
    }
    /** setSeed with a raw non-negative 48-bit value. */
    setSeed(v) {
      const lo = ((v % 4294967296) ^ 0xDEECE66D) >>> 0;
      const hi = (Math.floor(v / 4294967296) ^ 0x5) & 0xFFFF;
      this.seed = hi * 4294967296 + lo;
      return this;
    }
    setState(state) { this.seed = state; return this; }

    _advance() {
      const s = this.seed;
      const s0 = s % TWO24, s1 = (s - s0) / TWO24;
      let lo = s0 * M_LO + 11;
      const carry = Math.floor(lo / TWO24);
      lo -= carry * TWO24;
      let hi = (s1 * M_LO + s0 * M_HI + carry) % TWO24;
      this.seed = hi * TWO24 + lo;
      return this.seed;
    }
    next(bits) {
      const s = this._advance();
      return Math.floor(s / Math.pow(2, 48 - bits)) | 0;
    }
    nextInt(bound) {
      if (bound === undefined) return this.next(32);
      const m = bound - 1;
      if ((bound & m) === 0) return (bound * this.next(31)) / 2147483648 | 0;
      let u = this.next(31), r = u % bound;
      while (((u - r + m) | 0) < 0) { u = this.next(31); r = u % bound; }
      return r;
    }
    nextFloat() { return this.next(24) / 16777216; }
  }

  /* --------------------------- LCG helpers ------------------------------- */
  const MASK48 = 281474976710655;
  /** one LCG step on a raw 48-bit state */
  function lcgNext(state) {
    const s0 = state % TWO24, s1 = (state - s0) / TWO24;
    let lo = s0 * M_LO + 11;
    const carry = Math.floor(lo / TWO24);
    lo -= carry * TWO24;
    const hi = (s1 * M_LO + s0 * M_HI + carry) % TWO24;
    return hi * TWO24 + lo;
  }
  /** advance a raw state n times */
  function lcgAdvance(state, n) { for (let i = 0; i < n; i++) state = lcgNext(state); return state; }
  /** the int that nextInt() would return for a state (i.e. state >>> 16, signed) */
  const stateToInt = state => Math.floor(state / 65536) | 0;

  /* ----------------------- enchanting table ------------------------------ */

  /** EnchantmentHelper.getEnchantmentCost — the shared "base" roll. */
  function tableBase(rand, bookshelves) {
    return rand.nextInt(8) + 1 + (bookshelves >> 1) + rand.nextInt(bookshelves + 1);
  }

  /** Raw cost for a slot (before the "hidden if too low" rule). */
  function rawCost(base, slot, bookshelves) {
    if (slot === 0) return Math.max(Math.floor(base / 3), 1);
    if (slot === 1) return Math.floor(base * 2 / 3) + 1;
    return Math.max(base, bookshelves * 2);
  }

  /**
   * The three numbers the enchanting table GUI shows.
   * A slot whose cost is below slot+1 is empty in game -> reported as 0.
   */
  function costs(xpSeed, bookshelves, rand) {
    const r = rand || new JavaRandom();
    r.setSeedInt(xpSeed);
    const out = [0, 0, 0];
    for (let slot = 0; slot < 3; slot++) {
      const c = rawCost(tableBase(r, bookshelves), slot, bookshelves);
      out[slot] = c < slot + 1 ? 0 : c;
    }
    return out;
  }

  /**
   * Pre-computes everything about (item, version) that doesn't depend on the
   * roll: which enchantments apply, their weight, and each level's power band.
   * Registry order is preserved because it decides weightedRandom tie-breaks.
   */
  const tableCache = new Map();
  function applicableTable(item, version) {
    const key = item + '@' + version;
    let t = tableCache.get(key);
    if (t) return t;
    t = [];
    if (version >= D.itemIntroduced(item)) {
      for (const e of D.TABLE_ENCHANTMENTS) {
        if (version < D.enchIntroduced(e)) continue;
        if (!D.canApply(e, item, true)) continue;
        const bands = [];
        for (let l = D.maxLevel(e); l >= 1; l--) bands.push({ level: l, min: D.minPower(e, l), max: D.maxPower(e, l) });
        t.push({ ench: e, weight: D.weight(e, version), bands });
      }
    }
    tableCache.set(key, t);
    return t;
  }

  /** EnchantmentHelper.getAvailableEnchantmentResults */
  function highestAllowed(power, item, version) {
    const out = [];
    for (const entry of applicableTable(item, version)) {
      for (const b of entry.bands) {
        if (power >= b.min && power <= b.max) { out.push({ ench: entry.ench, level: b.level, w: entry.weight }); break; }
      }
    }
    return out;
  }

  function weightedRandom(rand, list, version) {
    let total = 0;
    for (const it of list) total += (it.w !== undefined ? it.w : D.weight(it.ench, version));
    if (total <= 0) return null;
    let w = rand.nextInt(total);
    for (const it of list) { w -= (it.w !== undefined ? it.w : D.weight(it.ench, version)); if (w < 0) return it; }
    return null;
  }

  /** EnchantmentHelper.selectEnchantment */
  function addRandomEnchantments(rand, item, level, version) {
    const enchantability = D.getEnchantability(item);
    const chosen = [];
    if (enchantability <= 0) return chosen;

    level = level + 1 + rand.nextInt((enchantability >> 2) + 1) + rand.nextInt((enchantability >> 2) + 1);
    const pct = (rand.nextFloat() + rand.nextFloat() - 1) * 0.15;
    level += Math.round(level * pct);
    if (level < 1) level = 1;

    let allowed = highestAllowed(level, item, version);
    if (allowed.length === 0) return chosen;

    chosen.push(weightedRandom(rand, allowed, version));

    while (rand.nextInt(50) <= level) {
      if (version === D.V.V1_14) {                      // 1.14 enchantment nerf
        level = Math.floor(level * 4 / 5) + 1;
        allowed = highestAllowed(level, item, version);
      }
      for (const picked of chosen) {
        allowed = allowed.filter(it => D.areCompatible(it.ench, picked.ench, version));
      }
      if (allowed.length === 0) break;
      chosen.push(weightedRandom(rand, allowed, version));
      level = Math.floor(level / 2);
    }
    return chosen;
  }

  /**
   * EnchantmentMenu.getEnchantmentList — what you actually receive.
   * NOTE: reseeds rand with xpSeed + slot, exactly like vanilla.
   */
  function enchantmentsInTable(rand, xpSeed, item, slot, cost, version) {
    rand.setSeedInt((xpSeed + slot) | 0);
    const list = addRandomEnchantments(rand, item, cost, version);
    if (item === D.I.BOOK && list.length > 1) list.splice(rand.nextInt(list.length), 1);
    return list;
  }

  /** The enchantment hint the GUI shows for a slot (generated right after the list). */
  function clueFor(rand, list) {
    if (!list.length) return null;
    return list[rand.nextInt(list.length)];
  }

  /**
   * Everything the table would show/give for one xpSeed + bookshelf count.
   * Returns { costs:[3], slots:[{cost, enchantments:[], clue}] }
   */
  function tableOutcome(xpSeed, bookshelves, item, version) {
    const rand = new JavaRandom();
    if (D.getEnchantability(item) === 0 || version < D.itemIntroduced(item)) {
      return { costs: [0, 0, 0], slots: [0, 1, 2].map(() => ({ cost: 0, enchantments: [], clue: null })) };
    }
    const c = costs(xpSeed, bookshelves, rand);
    const slots = [];
    for (let slot = 0; slot < 3; slot++) {
      if (c[slot] === 0) { slots.push({ cost: 0, enchantments: [], clue: null }); continue; }
      const list = enchantmentsInTable(rand, xpSeed, item, slot, c[slot], version);
      slots.push({ cost: c[slot], enchantments: list, clue: clueFor(rand, list) });
    }
    return { costs: c, slots };
  }

  /** Levels -> total XP, straight from Enchantments.levelsToXP */
  function levelsToXP(startLevel, numLevels) {
    let amt = 0;
    for (let level = startLevel; level > startLevel - numLevels; level--) {
      if (level > 30) amt += (9 * (level - 1)) - 158;
      else if (level > 15) amt += (5 * (level - 1)) - 38;
      else amt += (2 * (level - 1)) + 7;
    }
    return amt;
  }

  const API = {
    applicableTable,
    JavaRandom, lcgNext, lcgAdvance, stateToInt, MASK48,
    tableBase, rawCost, costs, highestAllowed, addRandomEnchantments,
    enchantmentsInTable, clueFor, tableOutcome, levelsToXP
  };
  root.ECEnchant = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
