/* Regression tests — run with:  node tests/run.js
 *
 * golden.json was captured from the ORIGINAL code (before the hint picker /
 * planner changes): 60 table outcomes, 40 planner runs and 6 player-RNG
 * recoveries. The new code must reproduce all of it exactly. */
'use strict';
global.window = global;
const path = require('path'), fs = require('fs');
const root = path.join(__dirname, '..');
const D = require(path.join(root, 'data.js'));
const EC = require(path.join(root, 'enchant.js'));
const P = require(path.join(root, 'planner.js'));
const CR = require(path.join(root, 'cracker.js'));
const HP = require(path.join(root, 'hintpicker.js'));
const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden.json'), 'utf8'));

let pass = 0, fail = 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function check(name, ok, detail) {
  if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (detail ? '\n      ' + detail : '')); }
}

/* ---- enchanting table simulation (unchanged code, guarded anyway) ---- */
golden.table.forEach((g, i) => check('table #' + i, same(EC.tableOutcome(g.seed, g.shelves, g.item, g.version), g.res)));

/* ---- planner: results AND search counts identical to the old one ---- */
golden.plan.forEach((g, i) => check('plan #' + i, same(P.plan(g.opts), g.res)));

/* ---- player RNG recovery ---- */
const cr = new CR.Cracker();
golden.pair.forEach((g, i) => check('pair #' + i, same(cr.playerSeedFromPair(g.s1, g.s2, g.gapMax), g.res)));

/* ---- planner is linear but must still equal the quadratic reference ---- */
function planReference(opts) {            // the original algorithm, kept here as an oracle
  const { item, version, wanted = [], unwanted = [], minShelves = 0, maxShelves = 15, maxSlot = 3, playerLevel = 30, maxThrows = 512, maxResults = 12 } = opts;
  const results = [], rand = new EC.JavaRandom();
  const knowPlayer = opts.playerState != null, knowSeed = opts.xpSeed != null;
  if (!knowSeed && !knowPlayer) return { results, searched: 0 };
  let searched = 0;
  const first = knowSeed ? P.NO_DUMMY : 0, last = knowPlayer ? maxThrows : P.NO_DUMMY;
  for (let throws = first; throws <= last; throws++) {
    const xpSeed = throws === P.NO_DUMMY ? opts.xpSeed : EC.stateToInt(EC.lcgAdvance(opts.playerState, throws * 4 + 1));
    const dummy = throws === P.NO_DUMMY ? 0 : 1;
    for (let b = minShelves; b <= maxShelves; b++) {
      const costs = EC.costs(xpSeed, b, rand); searched++;
      for (let slot = 0; slot < maxSlot; slot++) {
        const cost = costs[slot];
        if (cost === 0 || playerLevel - dummy < cost || playerLevel - dummy < slot + 1) continue;
        const list = EC.enchantmentsInTable(rand, xpSeed, item, slot, cost, version);
        if (!list.length || !P.matches(list, wanted, unwanted)) continue;
        results.push({ throws, bookshelves: b, slot, cost, xpSeed, enchantments: list.slice(), levelsSpent: dummy + slot + 1, levelsAfter: playerLevel - dummy - (slot + 1) });
        if (results.length >= maxResults) return { results, searched };
      }
    }
  }
  return { results, searched };
}
{
  const r = new EC.JavaRandom(99);
  const pool = { diamond_sword: ['sharpness', 'mending', 'unbreaking', 'looting'], book: ['mending', 'protection', 'sharpness'], bow: ['power', 'flame', 'infinity'], iron_chestplate: ['protection', 'thorns'] };
  const names = Object.keys(pool);
  let ok = 0, n = 200;
  for (let i = 0; i < n; i++) {
    const item = names[i % names.length], e = pool[item];
    const o = { xpSeed: r.nextInt(), playerState: ((r.nextInt() >>> 0) * 65536) + r.nextInt(65536), item, version: D.V.V1_21_11,
      wanted: [{ ench: e[r.nextInt(e.length)], level: 1 + r.nextInt(2) }], unwanted: [], maxShelves: 15, playerLevel: 30, maxThrows: 700, maxResults: 6 };
    if (same(P.plan(o), planReference(o))) ok++;
  }
  check('planner == quadratic reference (200 random cases)', ok === n, ok + '/' + n);
}

/* ---- zero must stay zero (old `+value || default` bug) ---- */
check('clampInt 0 shelves', P.clampInt('0', 15, 0, 15) === 0);
check('clampInt 0 throws', P.clampInt('0', 512, 0, 4096) === 0);
check('clampInt blank -> default', P.clampInt('', 15, 0, 15) === 15 && P.clampInt('  ', 15, 0, 15) === 15 && P.clampInt(null, 7, 0, 9) === 7);
check('clampInt garbage -> default', P.clampInt('abc', 15, 0, 15) === 15);
check('clampInt clamps', P.clampInt('99', 15, 0, 15) === 15 && P.clampInt('-5', 15, 0, 15) === 0 && P.clampInt('5000', 512, 0, 4096) === 4096);
check('clampInt truncates decimals', P.clampInt('3.9', 15, 0, 15) === 3);

/* ---- hint picker matching ---- */
const entriesFor = item => P.offerable(item, D.V.V1_21_11).map(o => ({ ench: o.ench, name: D.PRETTY[o.ench], max: o.max }));
{
  const rod = entriesFor('fishing_rod');
  const names = q => HP.rank(q, rod).map(e => e.name);
  check('rank: "l" lists luck/lure', same(names('l'), ['Luck of the Sea', 'Lure']), JSON.stringify(names('l')));
  check('rank: "lu" keeps registry order', same(names('lu'), ['Luck of the Sea', 'Lure']));
  check('rank: "lur" -> Lure', same(names('lur'), ['Lure']));
  check('rank: empty query lists all', names('').length === rod.length);

  const spear = entriesFor('diamond_spear');
  check('rank: Lunge exists on spears; "lu" -> Lunge', same(HP.rank('lu', spear).map(e => e.name), ['Lunge']));

  const sword = entriesFor('diamond_sword');
  check('rank: word-start "arth" -> Bane of Arthropods', same(HP.rank('arth', sword).map(e => e.name), ['Bane of Arthropods']));
  check('rank: "fire" -> Fire Aspect', same(HP.rank('fire', sword).map(e => e.name), ['Fire Aspect']));
  const armour = entriesFor('diamond_chestplate');
  check('rank: "p" prefers Protection/Projectile first', HP.rank('p', armour)[0].name === 'Protection');
  check('rank: "fire p" -> Fire Protection only', same(HP.rank('fire p', armour).map(e => e.name), ['Fire Protection']));
  check('rank: no match', HP.rank('zzz', sword).length === 0);

  const q = (t, es) => HP.parseQuery(t, es);
  check('parse "lure 2"', same(q('lure 2', rod), { name: 'lure', level: 2 }));
  check('parse "lure2"', same(q('lure2', rod), { name: 'lure', level: 2 }));
  check('parse "lure ii"', same(q('lure ii', rod), { name: 'lure', level: 2 }));
  check('parse "Lure III"', same(q('Lure III', rod), { name: 'lure', level: 3 }));
  check('parse "lure" has no level', same(q('lure', rod), { name: 'lure', level: null }));
  check('parse "i" alone is a name, not a level', same(q('i', entriesFor('bow')), { name: 'i', level: null }));
  check('parse "infinity" is not split', same(q('infinity', entriesFor('bow')), { name: 'infinity', level: null }));
  check('parse "sharpness 5"', same(q('sharpness 5', sword), { name: 'sharpness', level: 5 }));
  check('parse "bane of arthropods iv"', same(q('bane of arthropods iv', sword), { name: 'bane of arthropods', level: 4 }));
  check('parse "xyz 2" falls back to whole text', same(q('xyz 2', sword), { name: 'xyz 2', level: null }));

  // "ench:level" option lists group back into entries
  const opts = []; rod.forEach(e => { for (let l = 1; l <= e.max; l++) opts.push({ value: e.ench + ':' + l }); });
  opts.unshift({ value: '' });
  const back = HP.entriesFromOptions(opts);
  check('entriesFromOptions round-trips', same(back.map(e => [e.ench, e.max]), rod.map(e => [e.ench, e.max])));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
