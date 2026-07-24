/* =====================================================================
 *  planner.js — "what do I do to get the enchantment I want?"
 *
 *  Port of EnchCrackerWindow's calculator loop and clientcommands'
 *  EnchantmentCracker.manipulateEnchantments:
 *
 *    every thrown item advances the player's RNG by exactly 4 steps
 *    (Player#drop -> 4 nextFloat calls for the item's velocity), and a
 *    dummy enchantment consumes exactly one nextInt() — which becomes the
 *    next XP seed. So: throws -> XP seed -> the three slots' enchantments.
 * ===================================================================== */
(function (root) {
  'use strict';
  const D = root.ECData || require('./data.js');
  const EC = root.ECEnchant || require('./enchant.js');

  const NO_DUMMY = -1;

  /** Highest level of an enchantment an enchanting table can ever produce. */
  function maxLevelInTable(ench, item, version) {
    const ench_ability = D.getEnchantability(item);
    if (!ench_ability || version < D.itemIntroduced(item) || version < D.enchIntroduced(ench)) return 0;
    if (D.TABLE_ENCHANTMENTS.indexOf(ench) < 0 || !D.canApply(ench, item, true)) return 0;
    let level = 30 + 1 + (ench_ability >> 2) + (ench_ability >> 2);
    level += Math.round(level * 0.15);
    for (let l = D.maxLevel(ench); l >= 1; l--) if (level >= D.minPower(ench, l)) return l;
    return 0;
  }

  /** Everything the table could offer for this item at this version. */
  function offerable(item, version) {
    const out = [];
    for (const e of D.TABLE_ENCHANTMENTS) {
      const m = maxLevelInTable(e, item, version);
      if (m > 0) out.push({ ench: e, max: m });
    }
    return out;
  }

  /** Grid of outcomes for one XP seed: rows = bookshelf counts. */
  function outcomes(xpSeed, item, version, minShelves, maxShelves) {
    const rows = [];
    for (let b = minShelves; b <= maxShelves; b++) {
      rows.push(Object.assign({ bookshelves: b }, EC.tableOutcome(xpSeed, b, item, version)));
    }
    return rows;
  }

  function matches(list, wanted, unwanted) {
    for (const w of wanted) {
      let found = false;
      for (const got of list) {
        if (got.ench !== w.ench) continue;
        if (got.level < w.level) return false;      // present, but too weak
        found = true; break;
      }
      if (!found) return false;
    }
    for (const u of unwanted) for (const got of list) if (got.ench === u) return false;
    return true;
  }

  /**
   * Search for a way to get what you want.
   *
   * opts = { xpSeed, playerState, item, version, wanted[], unwanted[],
   *          minShelves, maxShelves, maxSlot, playerLevel, maxThrows, maxResults }
   *
   * A result with throws === -1 means "no manipulation needed, enchant now".
   */
  function plan(opts) {
    const {
      item, version, wanted = [], unwanted = [],
      minShelves = 0, maxShelves = 15, maxSlot = 3,
      playerLevel = 30, maxThrows = 512, maxResults = 12
    } = opts;

    const results = [];
    const knowPlayer = opts.playerState !== null && opts.playerState !== undefined;
    const knowSeed = opts.xpSeed !== null && opts.xpSeed !== undefined;
    if (!knowSeed && !knowPlayer) return { results, searched: 0 };

    const rand = new EC.JavaRandom();
    let state = knowPlayer ? opts.playerState : null;
    let searched = 0;

    const first = knowSeed ? NO_DUMMY : 0;
    const last = knowPlayer ? maxThrows : NO_DUMMY;

    for (let throws = first; throws <= last; throws++) {
      let xpSeed;
      if (throws === NO_DUMMY) {
        xpSeed = opts.xpSeed;
      } else {
        // throws items thrown (4 steps each) then the dummy enchantment (1 step)
        xpSeed = EC.stateToInt(EC.lcgAdvance(state, throws * 4 + 1));
      }
      const dummyLevels = throws === NO_DUMMY ? 0 : 1;

      for (let b = minShelves; b <= maxShelves; b++) {
        const costs = EC.costs(xpSeed, b, rand);
        searched++;
        for (let slot = 0; slot < maxSlot; slot++) {
          const cost = costs[slot];
          if (cost === 0) continue;
          if (playerLevel - dummyLevels < cost) continue;      // can't afford to click it
          if (playerLevel - dummyLevels < slot + 1) continue;
          const list = EC.enchantmentsInTable(rand, xpSeed, item, slot, cost, version);
          if (!list.length) continue;
          if (!matches(list, wanted, unwanted)) continue;
          results.push({
            throws, bookshelves: b, slot, cost, xpSeed,
            enchantments: list.slice(),
            levelsSpent: dummyLevels + slot + 1,
            levelsAfter: playerLevel - dummyLevels - (slot + 1)
          });
          if (results.length >= maxResults) return { results, searched };
        }
      }
    }
    return { results, searched };
  }

  /**
   * Apply a plan to the tracked state, exactly like the desktop tool's
   * "Done" button: items thrown (4 steps each), the dummy enchant, then the
   * real enchant — each enchantment consuming one nextInt() for the new seed.
   */
  function applyPlan(playerState, res) {
    if (playerState === null || playerState === undefined) return null;
    let s = playerState;
    if (res.throws !== NO_DUMMY) s = EC.lcgAdvance(s, res.throws * 4 + 1);
    s = EC.lcgNext(s);
    return { playerState: s, xpSeed: EC.stateToInt(s) };
  }

  const API = { NO_DUMMY, maxLevelInTable, offerable, outcomes, matches, plan, applyPlan };
  root.ECPlanner = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
