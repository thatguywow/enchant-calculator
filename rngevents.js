/* =====================================================================
 *  rngevents.js — what touches the player RNG, and by how much
 *
 *  Ported verbatim from clientcommands' PlayerRandCracker.java (the
 *  RNGCallType handlers). These are the ONLY things that advance or reset
 *  the player's Random between two enchantments. This is what determines
 *  whether two cracked XP seeds are a consecutive pair.
 *
 *  Call counts are version-sensitive; protocol thresholds match
 *  MultiVersionCompat:  1.16=735 1.17=755 1.18.2=758 1.20.6=766 1.21=767 1.21.2=768
 * ===================================================================== */
(function (root) {
  'use strict';

  // Map our version enum (index) to the protocol numbers clientcommands checks.
  // We only need coarse thresholds, so approximate each bracket's protocol.
  const PROTO = {
    V1_8: 47, V1_9: 107, V1_11: 315, V1_11_1: 316, V1_13: 393, V1_14: 477,
    V1_14_3: 490, V1_16: 735, V1_21: 767, V1_21_9: 770, V1_21_11: 772
  };

  // Each entry: how many nextInt()/nextFloat() calls the action spends.
  // `calls` may be a function of the protocol version; a `reset:true` entry
  // means the action wipes the RNG entirely (no maintaining it).
  const EVENTS = [
    {
      id: 'dropItem', label: 'Dropping an item', icon: '↓',
      calls: () => 4,
      note: 'Each item you drop with Q spends 4 calls (its throw velocity). This is the manipulation primitive — planned throws use exactly this.'
    },
    {
      id: 'enchanting', label: 'Enchanting (the roll)', icon: '✦',
      calls: () => 1,
      note: 'Clicking a slot spends 1 call, which becomes your next XP seed. The dummy enchant in the plan is this.'
    },
    {
      id: 'equipItem', label: 'Equipping armour', icon: '🛡',
      calls: p => p >= PROTO.V1_16 ? 2 : 0,
      note: '2 calls from 1.20.6 onward (equip sound). Nothing on older versions.'
    },
    {
      id: 'anvil', label: 'Using an anvil', icon: '⚒',
      calls: () => 1, note: '1 call.'
    },
    {
      id: 'crossbow', label: 'Firing a crossbow', icon: '🏹',
      calls: p => p <= PROTO.V1_16 ? 2 : 1,
      note: '1 call (2 on 1.18.2 and earlier).'
    },
    {
      id: 'food', label: 'Eating food', icon: '🍖',
      calls: () => null,
      note: '3 calls plus 3 per eat-particle — the particle count is not fixed, so treat eating as unrecoverable. Just do not eat mid-process.'
    },
    {
      id: 'baneOfArthropods', label: 'Bane of Arthropods hit', icon: '🗡',
      calls: p => p < PROTO.V1_21 ? 1 : 0,
      note: '1 call before 1.21 (slowness duration). None from 1.21.'
    },
    {
      id: 'unbreaking', label: 'Unbreaking durability tick', icon: '🔧',
      calls: () => null,
      note: 'Variable, and resets on armour. Avoid using an Unbreaking item mid-process (pre-1.21 only calls RNG at all).'
    },
    // ---- the reset-only events: these DESTROY the pairing ----
    { id: 'xp', reset: true, label: 'Picking up an XP orb', icon: '🟢',
      note: 'From 1.17 this wipes the RNG completely — the #1 cause of a failed pair. Bank your levels before you start.' },
    { id: 'recreated', reset: true, label: 'Relog / death / dimension change', icon: '⟳',
      note: 'Loading any level builds a brand-new player Random. A seed cracked before a relog can never pair with one after it.' },
    { id: 'playerHurt', reset: true, label: 'Taking damage', icon: '💥',
      note: 'Resets the RNG. Stand somewhere safe.' },
    { id: 'sprint', reset: true, label: 'Sprinting', icon: '🏃',
      note: 'Resets the RNG (sprint particles). Walk, do not sprint.' },
    { id: 'swim', reset: true, label: 'Swimming / entering water', icon: '🌊',
      note: 'Resets the RNG.' },
    { id: 'fallFlying', reset: true, label: 'Elytra flight', icon: '🪶', note: 'Resets the RNG.' },
    { id: 'frostWalker', reset: true, label: 'Frost Walker', icon: '❄', note: 'Resets the RNG.' },
    { id: 'soulSpeed', reset: true, label: 'Soul Speed', icon: '👣', note: 'Resets the RNG.' },
    { id: 'mending', reset: true, label: 'Mending repairing gear', icon: '💚',
      note: 'Resets the RNG. Take Mending gear off first.' },
    { id: 'shoulderParrot', reset: true, label: 'A shoulder parrot', icon: '🦜', note: 'Periodically resets the RNG.' },
    { id: 'advancement', reset: true, label: 'Earning an advancement', icon: '🏆', note: 'Resets the RNG.' },
    { id: 'shield', reset: true, label: 'Shield use', icon: '🛡', note: 'Resets the RNG.' },
    { id: 'potion', reset: true, label: 'Splash/lingering potion effects', icon: '⚗', note: 'Resets the RNG.' }
  ];

  function protoFor(version) {
    const key = Object.keys(root.ECData.V).find(k => root.ECData.V[k] === version);
    return PROTO[key] != null ? PROTO[key] : 772;
  }

  // Advancing events (finite, non-reset) usable to explain a gap, for the version.
  function advancingEvents(version) {
    const p = protoFor(version);
    return EVENTS.filter(e => !e.reset && typeof e.calls === 'function' && e.calls(p) != null)
      .map(e => ({ id: e.id, label: e.label, icon: e.icon, calls: e.calls(p), note: e.note }))
      .filter(e => e.calls > 0);
  }

  function resetEvents() { return EVENTS.filter(e => e.reset); }

  root.ECRngEvents = { EVENTS, advancingEvents, resetEvents, protoFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ECRngEvents;
})(typeof globalThis !== 'undefined' ? globalThis : this);
