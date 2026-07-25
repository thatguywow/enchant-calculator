/* =====================================================================
 *  ui.js — the interface
 * ===================================================================== */
(function () {
  'use strict';
  const root = (typeof globalThis !== 'undefined') ? globalThis : window;
  const D = window.ECData, EC = window.ECEnchant, P = window.ECPlanner;
  const $ = s => document.querySelector(s);
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
  const hex8 = n => (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const hex12 = n => { const lo = (n % 4294967296) >>> 0, hi = Math.floor(n / 4294967296); return (hi.toString(16).toUpperCase().padStart(4, '0') + lo.toString(16).toUpperCase().padStart(8, '0')); };
  const enchName = e => (D.PRETTY[e.ench] || e.ench) + (D.maxLevel(e.ench) > 1 || e.level > 1 ? ' ' + D.roman(e.level) : '');

  /* ------------------------------------------------------------ store */
  const store = (() => {
    let mem = {};
    const ok = (() => { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return true; } catch (e) { return false; } })();
    return {
      get(k, d) { try { const v = ok ? localStorage.getItem(k) : mem[k]; return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
      set(k, v) { try { const s = JSON.stringify(v); if (ok) localStorage.setItem(k, s); else mem[k] = s; } catch (e) { /* nothing to do */ } }
    };
  })();

  /* ------------------------------------------------------------ state */
  const S = {
    version: store.get('version', D.V.V1_21_11),
    readings: store.get('readings', []),
    candidates: null,
    xpSeed: store.get('xpSeed', null),
    playerState: store.get('playerState', null),
    seedLog: store.get('seedLog', []),
    captured: store.get('captured', []),
    playerLevel: store.get('playerLevel', 30),
    outItem: store.get('outItem', 'diamond_sword'),
    readItem: store.get('readItem', 'book'),
    planItem: store.get('planItem', 'diamond_sword'),
    picks: store.get('picks', {}),          // ench -> level, or -1 for "refuse"
    freshCrack: false
  };
  const save = () => {
    store.set('version', S.version); store.set('readings', S.readings);
    store.set('xpSeed', S.xpSeed); store.set('playerState', S.playerState);
    store.set('seedLog', S.seedLog); store.set('captured', S.captured); store.set('playerLevel', S.playerLevel);
    store.set('outItem', S.outItem); store.set('readItem', S.readItem); store.set('planItem', S.planItem); store.set('picks', S.picks);
  };

  const cracker = new window.ECCracker.Cracker();
  let busy = false;

  /* ------------------------------------------------------- navigation */
  function show(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('is-active', v.id === 'view-' + view));
    document.querySelectorAll('.nav-item').forEach(b => b.setAttribute('aria-current', String(b.dataset.view === view)));
    if (view === 'outcomes') renderOutcomes();
    if (view === 'plan') renderChips();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));

  /* ---------------------------------------------------------- pickers */
  function fillVersions() {
    const sel = $('#version');
    D.VERSIONS.forEach((v, i) => { const o = el('option', null, v.name); o.value = i; sel.appendChild(o); });
    sel.value = S.version;
    sel.addEventListener('change', () => {
      S.version = +sel.value; save();
      fillItems($('#out-item'), S.outItem); fillItems($('#plan-item'), S.planItem);
      refreshReadingForm();
      renderOutcomes(); renderChips(); renderRngReference();
    });
  }

  function fillItems(sel, current) {
    sel.innerHTML = '';
    let firstOk = null;
    D.ITEM_GROUPS.forEach(g => {
      const og = el('optgroup'); og.label = g.label;
      g.items.forEach(it => {
        if (S.version < D.itemIntroduced(it)) return;
        if (!D.getEnchantability(it)) return;
        const o = el('option', null, D.itemLabel(it) + '  ·  enchantability ' + D.getEnchantability(it));
        o.value = it; og.appendChild(o); if (!firstOk) firstOk = it;
      });
      if (og.children.length) sel.appendChild(og);
    });
    sel.value = [...sel.options].some(o => o.value === current) ? current : firstOk;
    return sel.value;
  }

  function hintOptions(sel, item) {
    const prev = sel.value;
    sel.innerHTML = '<option value="">didn\u2019t note it</option>';
    // any enchantment the table can ever show for this item, every level
    P.offerable(item, S.version).forEach(o => {
      for (let l = 1; l <= o.max; l++) {
        const op = el('option', null, D.PRETTY[o.ench] + (o.max > 1 ? ' ' + D.roman(l) : ''));
        op.value = o.ench + ':' + l;
        sel.appendChild(op);
      }
    });
    if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
  }

  function refreshReadingForm() {
    const item = fillItems($('#in-item'), S.readItem || 'book');
    S.readItem = item;
    ['#in-h1', '#in-h2', '#in-h3'].forEach(sel => hintOptions($(sel), item));
  }
  $('#in-item') && $('#in-item').addEventListener('change', () => { S.readItem = $('#in-item').value; save(); refreshReadingForm(); });

  function fillShelves() {
    const sel = $('#in-shelves');
    sel.innerHTML = '';
    for (let i = 0; i <= 15; i++) {
      const used = S.readings.some(r => r.bookshelves === i);
      const o = el('option', null, i + (used ? '  (already read)' : ''));
      o.value = i; sel.appendChild(o);
    }
    const unused = [...Array(16).keys()].find(i => !S.readings.some(r => r.bookshelves === i));
    sel.value = unused === undefined ? 15 : unused;
  }

  /* --------------------------------------------------------- readings */
  function renderReadings() {
    const box = $('#readings'); box.innerHTML = '';
    if (!S.readings.length) {
      const e = el('div', 'empty', 'No readings yet. Add the first one above — then change the bookshelf count and add another.');
      box.appendChild(e);
    }
    S.readings.forEach((r, i) => {
      const dupe = S.readings.filter(x => x.bookshelves === r.bookshelves).length > 1;
      const row = el('div', 'reading' + (dupe ? ' is-dupe' : ''));
      const left = el('div');
      left.appendChild(el('span', 'reading-shelves', r.bookshelves + (r.bookshelves === 1 ? ' shelf' : ' shelves')));
      row.appendChild(left);
      const costs = el('div', 'reading-costs');
      const nClues = (r.clues || []).filter(Boolean).length;
      costs.innerHTML = [r.c1, r.c2, r.c3].map(c => c === 0 ? '<em>—</em>' : c).join(' &nbsp;/&nbsp; ') +
        (nClues ? ' <em>+' + nClues + ' hint' + (nClues > 1 ? 's' : '') + '</em>' : '');
      row.appendChild(costs);
      const del = el('button', 'btn btn-ghost btn-sm btn-danger', 'Remove');
      del.addEventListener('click', () => { S.readings.splice(i, 1); afterReadingsChange(); });
      row.appendChild(del);
      box.appendChild(row);
    });

    const hint = $('#readings-hint'); hint.innerHTML = '';
    const distinct = new Set(S.readings.map(r => r.bookshelves)).size;
    if (S.readings.length && distinct < S.readings.length) {
      hint.appendChild(mkNotice('warn', 'Two readings share a bookshelf count. Repeated numbers teach the search nothing — though hints still count if the item differs. Change the shelf count between readings where you can.'));
    } else if (distinct && distinct < 3) {
      hint.appendChild(mkNotice('', 'With hints filled in, two or three readings pin the seed — numbers alone need six or seven. A <strong>book</strong> makes the best reading item: its hints carry the most information. Block a bookshelf and read again.'));
    }
    $('#btn-crack').disabled = busy || distinct < 2;
    fillShelves();
  }

  function afterReadingsChange() { S.candidates = null; save(); renderReadings(); $('#crack-result').innerHTML = ''; }

  function mkNotice(kind, html) {
    const n = el('div', 'notice' + (kind ? ' notice-' + kind : ''));
    n.innerHTML = html; return n;
  }

  $('#reading-form').addEventListener('submit', ev => {
    ev.preventDefault();
    const b = +$('#in-shelves').value;
    const vals = ['#in-c1', '#in-c2', '#in-c3'].map(s => $(s).value.trim());
    if (vals.some(v => v === '')) { $('#in-c1').focus(); return; }
    const [c1, c2, c3] = vals.map(Number);
    if ([c1, c2, c3].some(c => isNaN(c) || c < 0 || c > 30)) return;
    const clues = ['#in-h1', '#in-h2', '#in-h3'].map(sel => {
      const v = $(sel).value;
      if (!v) return null;
      const [ench, level] = v.split(':');
      return { ench, level: +level };
    });
    const reading = { bookshelves: b, c1, c2, c3, item: $('#in-item').value, clues };
    S.readings.push(reading);
    ['#in-c1', '#in-c2', '#in-c3'].forEach(s => $(s).value = '');
    ['#in-h1', '#in-h2', '#in-h3'].forEach(s => $(s).value = '');
    if (S.candidates && S.candidates.length) {
      // a sweep has already run: narrow the survivors instantly
      S.candidates = cracker.filterByClues(cracker.filter(S.candidates, [reading]), [reading], S.version);
      save(); renderReadings();
      renderCrackResult({ ms: 0, seeds: S.candidates });
    } else {
      afterReadingsChange();
    }
    $('#in-shelves').focus();
  });

  $('#btn-reset').addEventListener('click', () => {
    S.readings = []; S.candidates = null; S.xpSeed = null; S.playerState = null; S.seedLog = [];
    S.captured = []; S.picks = {};
    afterReadingsChange(); renderStatus(); renderSeedLog(); renderChips();
    $('#rng-result').innerHTML = ''; $('#plan-result').innerHTML = '';
  });

  // Clears the readings so you can crack a NEW seed, but keeps everything you
  // have already captured (seed log, player state). This is the button that was
  // missing: cracking the second seed for the player RNG needs fresh readings
  // but must NOT wipe the first seed.
  function newReadingRound() {
    S.readings = []; S.candidates = null;
    save(); renderReadings(); $('#crack-result').innerHTML = '';
    const form = $('#reading-form');
    if (form && form.scrollIntoView) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#in-shelves') && $('#in-shelves').focus();
  }
  $('#btn-newround') && $('#btn-newround').addEventListener('click', newReadingRound);

  /* ------------------------------------------------------------ crack */
  async function runCrack() {
    if (busy) return;
    busy = true;
    const btn = $('#btn-crack'), cancel = $('#btn-cancel');
    btn.disabled = true; cancel.hidden = false;
    $('#progress').hidden = false; $('#progress-meta').hidden = false;
    $('#crack-result').innerHTML = '';
    const t0 = performance.now();

    const res = await cracker.scan(S.readings, p => {
      $('#progress-bar').style.width = (p * 100).toFixed(1) + '%';
      $('#progress-pct').textContent = (p * 100).toFixed(0) + '% of 4,294,967,296 seeds';
      const elapsed = (performance.now() - t0) / 1000;
      $('#progress-eta').textContent = p > 0.02 ? Math.max(0, elapsed / p - elapsed).toFixed(0) + 's left' : '';
    });

    busy = false; cancel.hidden = true;
    $('#progress-bar').style.width = '100%';
    $('#progress-eta').textContent = (res.ms / 1000).toFixed(1) + 's';
    S.candidates = cracker.filterByClues(res.seeds, S.readings, S.version);
    renderReadings();
    renderCrackResult({ ms: res.ms, cancelled: res.cancelled, overflow: res.overflow, seeds: S.candidates });
  }
  $('#btn-crack').addEventListener('click', runCrack);
  $('#btn-cancel').addEventListener('click', () => cracker.cancel());

  function renderCrackResult(res) {
    const box = $('#crack-result'); box.innerHTML = '';
    if (res.cancelled) { box.appendChild(mkNotice('', 'Search stopped.')); return; }
    if (res.overflow) {
      box.appendChild(mkNotice('warn', '<strong>Too many candidates to hold.</strong> Add another reading at a bookshelf count you have not used yet, then search again.'));
      return;
    }
    const n = S.candidates.length;
    if (n === 0) {
      box.appendChild(mkNotice('bad', '<strong>No seed produces those numbers.</strong> One of the readings is off. The usual causes: the bookshelf count is wrong (a shelf only counts with a clear gap between it and the table, and 15 is the maximum), a slot was left blank and should be entered as 0, or the readings came from different players.'));
      return;
    }
    if (n === 1) {
      S.xpSeed = S.candidates[0];
      recordSeed(S.xpSeed);
      S.freshCrack = true; save(); renderStatus(); renderSeedLog();
      const card = el('div', 'seed-card');
      const left = el('div');
      left.appendChild(el('div', 'field-label', 'XP seed'));
      left.appendChild(el('div', 'seed-value', hex8(S.xpSeed)));
      card.appendChild(left);
      const side = el('div', 'seed-side');
      side.innerHTML = 'signed decimal <b>' + S.xpSeed + '</b><br>found in ' + (res.ms / 1000).toFixed(1) + 's across ' + cracker.threads + ' thread' + (cracker.threads > 1 ? 's' : '');
      card.appendChild(side);
      const go = el('button', 'btn btn-primary', 'See what the table will offer');
      go.addEventListener('click', () => show('outcomes'));
      card.appendChild(go);
      box.appendChild(card);
      verifyPrediction(box);

      // Offer the obvious next action right here, so nobody has to hand-delete
      // readings to crack a second seed.
      const next = el('div', 'row'); next.style.marginTop = '14px';
      const nr = el('button', 'btn', 'Clear readings, crack another seed →');
      nr.title = 'Keeps this seed in the log; empties the readings so you can crack the next one';
      nr.addEventListener('click', newReadingRound);
      next.appendChild(nr);
      if (S.playerState === null) {
        const hint = el('span', 'seed-side');
        hint.style.alignSelf = 'center';
        hint.innerHTML = S.seedLog.length >= 2
          ? 'You have two seeds — head to <b>step 03</b> to lock the player RNG.'
          : 'For item-throwing: enchant a dummy item, then crack again.';
        next.appendChild(hint);
      }
      box.appendChild(next);
      return;
    }
    box.appendChild(mkNotice('',
      '<strong>' + n.toLocaleString() + ' candidate' + (n === 1 ? '' : 's') + ' left.</strong> ' +
      'Block a bookshelf, read the table again and add it in step 01 above \u2014 hints included. ' +
      'It narrows instantly from here; there is no second sweep.'));
    const up = el('button', 'btn btn-sm', 'Add another reading \u2191');
    up.style.marginTop = '10px';
    up.addEventListener('click', () => {
      const form = $('#reading-form');
      if (form.scrollIntoView) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('#in-shelves').focus();
    });
    box.appendChild(up);
  }

  /* -------------------------------------------------- seeds & the RNG */
  function recordSeed(seed) {
    if (!(S.seedLog.length && S.seedLog[S.seedLog.length - 1].seed === seed)) {
      S.seedLog.push({ seed, at: Date.now() });
      if (S.seedLog.length > 8) S.seedLog.shift();
    }
    // Auto-fill the next empty capture slot, so a straight run of
    // enchant/crack/enchant/crack just works without extra clicks.
    const cap = S.captured || (S.captured = []);
    if (cap[0] == null) cap[0] = seed;
    else if (cap[1] == null && seed !== cap[0]) cap[1] = seed;
  }

  function verifyPrediction(box) {
    if (S.playerState === null || S.seedLog.length < 2) return;
    const predicted = EC.stateToInt(S.playerState);
    if (predicted === S.xpSeed) box.appendChild(mkNotice('good', '<strong>Prediction confirmed.</strong> The seed matches what the tracked RNG said it would be, so the player RNG is still locked on.'));
    else {
      box.appendChild(mkNotice('warn', '<strong>That is not the seed the tracked RNG expected.</strong> Something else used your player\u2019s randomness — damage, food, an anvil, a picked-up XP orb. The player RNG has been forgotten; the XP seed itself is still good.'));
      S.playerState = null; save(); renderStatus();
    }
  }

  // The player-RNG panel is a guided two-slot capture. Slot 1 takes the seed
  // from your first post-enchant crack, slot 2 from the second. They must be
  // consecutive draws, so the panel spells out the exact procedure and only
  // fills a slot from a seed you actually cracked.
  function renderSeedLog() {
    const box = $('#seed-log'); box.innerHTML = '';
    const cap = S.captured || (S.captured = []);

    const wrap = el('div', 'capture');
    const slot = (idx) => {
      const cell = el('div', 'capture-slot' + (cap[idx] != null ? ' is-filled' : ''));
      cell.appendChild(el('div', 'field-label', idx === 0 ? 'First seed' : 'Second seed'));
      const val = el('div', 'capture-val');
      val.textContent = cap[idx] != null ? hex8(cap[idx]) : '\u2014';
      cell.appendChild(val);
      const act = el('div', 'capture-act');
      if (S.xpSeed != null && cap[idx] !== S.xpSeed) {
        const use = el('button', 'btn btn-sm', cap[idx] != null ? 'Replace with ' + hex8(S.xpSeed) : 'Use current seed ' + hex8(S.xpSeed));
        use.addEventListener('click', () => { cap[idx] = S.xpSeed; if (idx === 0 && cap[1] === S.xpSeed) cap[1] = null; save(); renderSeedLog(); });
        act.appendChild(use);
      }
      if (cap[idx] != null) {
        const clr = el('button', 'btn btn-sm btn-ghost btn-danger', 'Clear');
        clr.addEventListener('click', () => { cap[idx] = null; save(); renderSeedLog(); });
        act.appendChild(clr);
      }
      cell.appendChild(act);
      return cell;
    };
    wrap.appendChild(slot(0));
    const arrow = el('div', 'capture-arrow', '\u2192'); wrap.appendChild(arrow);
    wrap.appendChild(slot(1));
    box.appendChild(wrap);

    // guidance depends on how far along you are
    const have = cap.filter(x => x != null).length;
    const tip = el('div'); tip.style.marginTop = '12px';
    if (have === 0) {
      tip.appendChild(mkNotice('', '<strong>Do this in order.</strong> 1) Enchant a dummy item (slot 1 on a stone sword, 1 level). 2) Read the table and crack — press <em>Use current seed</em> for the first slot. 3) Enchant another dummy, nothing in between. 4) Crack again and fill the second slot. 5) Press <em>Work out the player RNG</em>.'));
    } else if (have === 1) {
      tip.appendChild(mkNotice('warn', '<strong>One to go.</strong> Enchant a second dummy item — <em>no XP pickup, no damage, no eating, no dropping items</em> — then crack again and fill the second slot with that seed.'));
    } else {
      tip.appendChild(mkNotice('good', '<strong>Both seeds captured.</strong> Press <em>Work out the player RNG</em>.'));
    }
    box.appendChild(tip);

    $('#btn-rng').disabled = have < 2;
  }

  $('#btn-rng').addEventListener('click', () => {
    const box = $('#rng-result'); box.innerHTML = '';
    const cap = S.captured || [];
    const a = cap[0], b = cap[1];
    if (a == null || b == null) return;
    if (a === b) {
      box.appendChild(mkNotice('bad', '<strong>Both slots hold the same seed.</strong> They must come from two <em>different</em> enchantments. Enchant a dummy item again, crack, and put that new seed in the second slot.'));
      return;
    }

    // Strict first.
    let r = cracker.playerSeedFromPair(a, b, 0);
    if (r) {
      S.playerState = r.state; S.xpSeed = b; save(); renderStatus();
      box.appendChild(mkNotice('good', '<strong>Player RNG locked on.</strong> Internal state <code>' + hex12(r.state) + '</code>. Every future seed is now predictable \u2014 go to <em>Plan a throw</em> to choose one.'));
      return;
    }

    // Not consecutive: try to name the culprit using known event costs.
    const events = (root.ECRngEvents ? root.ECRngEvents.advancingEvents(S.version) : []);
    const combos = [];
    // single events
    events.forEach(e => combos.push({ gap: e.calls, label: 'one \u201c' + e.label.toLowerCase() + '\u201d (' + e.calls + ' calls)' }));
    // a couple of the same (e.g. two accidental drops)
    events.forEach(e => { combos.push({ gap: e.calls * 2, label: 'two \u201c' + e.label.toLowerCase() + '\u201d (' + (e.calls * 2) + ' calls)' }); });
    combos.sort((x, y) => x.gap - y.gap);

    const guess = cracker.playerSeedExplained(a, b, combos);
    if (!guess) {
      box.appendChild(mkNotice('bad', '<strong>No player state fits these two seeds at all.</strong> Too much happened between them, or a seed was mis-cracked. Reliable recipe: bank your XP, stand somewhere safe and still, then enchant \u2192 crack \u2192 enchant \u2192 crack with nothing in between.'));
      const b2 = el('button', 'btn btn-sm'); b2.style.marginTop = '10px';
      b2.textContent = 'What breaks the RNG?';
      b2.addEventListener('click', () => show('guide'));
      box.appendChild(b2);
      return;
    }

    const cause = guess.label ? guess.label : guess.gap + ' hidden RNG call' + (guess.gap === 1 ? '' : 's');
    box.appendChild(mkNotice('warn',
      '<strong>Those seeds are not consecutive.</strong> Best explanation: <strong>' + cause + '</strong> happened between the two enchantments. ' +
      'I can lock on assuming exactly that \u2014 but if anything else random happened, it will be wrong.'));
    const use = el('button', 'btn btn-sm'); use.style.marginTop = '10px';
    use.textContent = 'Lock on assuming ' + (guess.label ? guess.label.split(' (')[0] : 'gap ' + guess.gap);
    use.addEventListener('click', () => {
      S.playerState = guess.state; S.xpSeed = b; save(); renderStatus();
      box.innerHTML = '';
      box.appendChild(mkNotice('good', '<strong>Locked on.</strong> Watch the first prediction closely; if the outcome is wrong, redo the capture with nothing happening between the two enchantments.'));
    });
    box.appendChild(use);
  });

  $('#btn-manual').addEventListener('click', () => { const m = $('#manual-box'); m.hidden = !m.hidden; });
  $('#btn-manual-apply').addEventListener('click', () => {
    const sTxt = $('#in-xpseed').value.trim(), pTxt = $('#in-state').value.trim();
    if (sTxt) { const v = parseInt(sTxt, 16); if (!isNaN(v)) { S.xpSeed = v | 0; recordSeed(S.xpSeed); } }
    if (pTxt) {
      const v = parseInt(pTxt, 16);
      if (!isNaN(v) && v >= 0 && v <= EC.MASK48) { S.playerState = v; S.xpSeed = EC.stateToInt(v); }
    }
    save(); renderStatus(); renderSeedLog();
  });

  function renderStatus() {
    const sp = $('#pill-seed'), sv = $('#pill-seed-v');
    if (S.xpSeed === null) { sp.classList.remove('is-known'); sv.textContent = 'unknown'; }
    else { sp.classList.add('is-known'); sv.textContent = hex8(S.xpSeed); }
    const rp = $('#pill-rng'), rv = $('#pill-rng-v');
    if (S.playerState === null) { rp.classList.remove('is-known'); rv.textContent = 'unknown'; }
    else { rp.classList.add('is-known'); rv.textContent = hex12(S.playerState); }
  }

  /* --------------------------------------------------------- outcomes */
  const GLYPHS = 'ᚠᚢᚦᚨᚱᚲᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ⌇⌁⍑⍜⋔';
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function decode(node, text, delay) {
    if (reduced) { node.textContent = text; return; }
    node.classList.add('is-decoding');
    let frame = 0;
    const steps = 9;
    const tick = () => {
      frame++;
      const shown = Math.floor((frame / steps) * text.length);
      let out = text.slice(0, shown);
      for (let i = shown; i < text.length; i++) out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      node.textContent = out;
      if (frame < steps) setTimeout(tick, 34);
      else { node.textContent = text; node.classList.remove('is-decoding'); }
    };
    setTimeout(tick, delay);
  }

  function renderOutcomes() {
    const body = $('#outcomes-body'); body.innerHTML = '';
    if (S.xpSeed === null) {
      body.appendChild(el('div', 'empty', 'Crack the seed first — then this fills in.'));
      return;
    }
    S.outItem = fillItems($('#out-item'), S.outItem);
    const item = S.outItem, version = S.version;
    const maxShelves = Math.max(0, Math.min(15, +$('#out-maxshelves').value || 15));

    // highlight picker
    const hi = $('#out-highlight'), prev = hi.value;
    hi.innerHTML = '<option value="">nothing in particular</option>';
    P.offerable(item, version).forEach(o => { const op = el('option', null, D.PRETTY[o.ench]); op.value = o.ench; hi.appendChild(op); });
    hi.value = [...hi.options].some(o => o.value === prev) ? prev : '';

    const rows = P.outcomes(S.xpSeed, item, version, 0, maxShelves).reverse();
    const table = el('table', 'grid');
    table.innerHTML = '<thead><tr><th>Bookshelves</th><th>Top slot</th><th>Middle slot</th><th>Bottom slot</th></tr></thead>';
    const tb = el('tbody');
    let animate = S.freshCrack, seq = 0;

    rows.forEach(row => {
      const tr = el('tr');
      const th = el('td', 'shelf-cell');
      th.innerHTML = '<span class="shelf-n">' + row.bookshelves + '</span>' +
        (row.bookshelves < maxShelves ? '<span class="shelf-block">block ' + (maxShelves - row.bookshelves) + '</span>' : '<span class="shelf-block">all exposed</span>');
      tr.appendChild(th);
      let hit = false;
      row.slots.forEach(slot => {
        const td = el('td');
        if (!slot.cost) { td.appendChild(el('span', 'dash', '—')); tr.appendChild(td); return; }
        const c = el('span', 'cost' + (S.playerLevel < slot.cost ? ' too-dear' : ''), slot.cost);
        c.title = S.playerLevel < slot.cost ? 'You need level ' + slot.cost + ' to click this' : 'Costs level ' + slot.cost + ' to click';
        td.appendChild(c);
        if (!slot.enchantments.length) td.appendChild(el('span', 'dash', 'nothing'));
        slot.enchantments.forEach(e => {
          const isHit = hi.value && e.ench === hi.value;
          if (isHit) hit = true;
          const n = el('span', 'ench' + (isHit ? ' is-hit' : ''));
          if (animate) decode(n, enchName(e), (seq++) * 16); else n.textContent = enchName(e);
          td.appendChild(n);
        });
        tr.appendChild(td);
      });
      if (hit) tr.classList.add('is-hit');
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    const scroll = el('div', 'grid-scroll'); scroll.appendChild(table);
    body.appendChild(scroll);
    body.appendChild(mkNotice('', 'A bookshelf only counts when the block between it and the table is clear — put a torch, slab or any block in the gap to take it out of the count. The number on the left of each slot is the level it costs to click; the slot itself takes 1, 2 or 3 levels and the same number of lapis.'));
    S.freshCrack = false;
    save();
  }
  ['#out-item', '#out-highlight', '#out-maxshelves'].forEach(s => $(s).addEventListener('change', () => { S.outItem = $('#out-item').value; renderOutcomes(); }));

  /* -------------------------------------------------------------- plan */
  function renderChips() {
    S.planItem = fillItems($('#plan-item'), S.planItem);
    const box = $('#plan-chips'); box.innerHTML = '';
    P.offerable(S.planItem, S.version).forEach(o => {
      const cur = S.picks[o.ench];
      const chip = el('button', 'chip' + (cur > 0 ? ' is-wanted' : cur === -1 ? ' is-unwanted' : ''));
      chip.type = 'button';
      chip.appendChild(el('span', null, D.PRETTY[o.ench]));
      const lvl = el('span', 'chip-lvl', cur > 0 ? D.roman(cur) : cur === -1 ? 'no' : '·');
      chip.appendChild(lvl);
      chip.addEventListener('click', () => {
        const c = S.picks[o.ench];
        if (c === undefined) S.picks[o.ench] = o.max;         // want it at the best level possible
        else if (c > 1) S.picks[o.ench] = c - 1;              // step down the level requirement
        else if (c === 1) S.picks[o.ench] = -1;               // refuse it
        else delete S.picks[o.ench];                          // don't care
        save(); renderChips();
      });
      box.appendChild(chip);
    });
    if (!box.children.length) box.appendChild(el('div', 'empty', 'The table offers nothing for this item on this version.'));
  }
  $('#plan-item').addEventListener('change', () => { S.planItem = $('#plan-item').value; S.picks = {}; save(); renderChips(); });
  $('#btn-plan-clear').addEventListener('click', () => { S.picks = {}; save(); renderChips(); });

  $('#btn-plan').addEventListener('click', () => {
    const box = $('#plan-result'); box.innerHTML = '';
    if (S.xpSeed === null && S.playerState === null) {
      box.appendChild(mkNotice('warn', '<strong>Nothing to plan with yet.</strong> Crack the seed first.'));
      return;
    }
    const wanted = [], unwanted = [];
    Object.keys(S.picks).forEach(e => { if (S.picks[e] === -1) unwanted.push(e); else wanted.push({ ench: e, level: S.picks[e] }); });

    const out = P.plan({
      xpSeed: S.xpSeed, playerState: S.playerState,
      item: S.planItem, version: S.version, wanted, unwanted,
      minShelves: 0, maxShelves: Math.max(0, Math.min(15, +$('#plan-maxshelves').value || 15)),
      maxSlot: 3, playerLevel: S.playerLevel,
      maxThrows: Math.max(0, Math.min(4096, +$('#plan-maxthrows').value || 512)),
      maxResults: 6
    });

    if (S.playerState === null) {
      box.appendChild(mkNotice('', 'The player RNG is not known, so this only checks what the table offers <strong>right now</strong>. Learn the RNG on the first page to unlock throwing.'));
    }
    if (!out.results.length) {
      box.appendChild(mkNotice('bad', '<strong>No combination found.</strong> Try fewer or weaker requirements, more bookshelves, a higher throw limit, or a higher XP level — a slot you cannot afford is skipped.'));
      return;
    }
    out.results.forEach((r, i) => box.appendChild(planCard(r, i === 0)));
  });

  function planCard(r, best) {
    const card = el('div', 'plan-card' + (best ? ' is-best' : ''));
    const steps = el('div', 'steps');
    const mk = (k, v, sub, accent) => {
      const b = el('div', 'step-box' + (accent ? ' accent' : ''));
      b.appendChild(el('div', 'step-k', k));
      const val = el('div', 'step-v'); val.textContent = v;
      if (sub) { const s = el('small'); s.textContent = ' ' + sub; val.appendChild(s); }
      b.appendChild(val); return b;
    };
    if (r.throws === P.NO_DUMMY) {
      steps.appendChild(mk('Throw', 'nothing', '', true));
      steps.appendChild(mk('Then', 'enchant now', ''));
    } else {
      const stacks = r.throws >= 64 ? Math.floor(r.throws / 64) + ' stacks + ' + (r.throws % 64) : '';
      steps.appendChild(mk('Throw', r.throws, stacks ? '(' + stacks + ')' : 'items', true));
      steps.appendChild(mk('Then', 'dummy enchant', '1 level'));
    }
    steps.appendChild(mk('Bookshelves', r.bookshelves, ''));
    steps.appendChild(mk('Click', 'slot ' + (r.slot + 1), 'level ' + r.cost));
    card.appendChild(steps);

    const foot = el('div', 'plan-foot');
    const list = el('div', 'plan-ench', r.enchantments.map(enchName).join(' · '));
    foot.appendChild(list);
    const right = el('div', 'row'); right.style.flex = '0 0 auto';
    right.appendChild(el('span', 'seed-side', 'seed ' + hex8(r.xpSeed) + ' · costs ' + r.levelsSpent + ' levels'));
    if (S.playerState !== null) {
      const done = el('button', 'btn btn-sm', 'I did this');
      done.addEventListener('click', () => {
        const next = P.applyPlan(S.playerState, r);
        S.playerState = next.playerState; S.xpSeed = next.xpSeed;
        S.playerLevel = Math.max(0, S.playerLevel - r.levelsSpent);
        $('#player-level').value = S.playerLevel;
        recordSeed(S.xpSeed); save(); renderStatus(); renderSeedLog();
        $('#plan-result').innerHTML = '';
        $('#plan-result').appendChild(mkNotice('good', '<strong>Tracked.</strong> New XP seed <code>' + hex8(S.xpSeed) + '</code>, predicted rather than cracked. The outcomes page has already moved on.'));
      });
      right.appendChild(done);
    }
    foot.appendChild(right);
    card.appendChild(foot);
    return card;
  }

  /* -------------------------------------------------------------- misc */
  $('#player-level').addEventListener('input', e => {
    S.playerLevel = Math.max(0, +e.target.value || 0); save();
    if ($('#view-outcomes').classList.contains('is-active')) renderOutcomes();
  });

  $('#guide-body').innerHTML = `
    <h3>What this actually does</h3>
    <p>Every player carries a hidden 32-bit number, the XP seed. When you open an enchanting table, that number and the bookshelf count decide the three level costs you see, and the enchantments hiding behind them. Nothing about it is random once you know the number.</p>
    <p>The three costs give away a few bits each. Feed in enough of them and only one of the 4,294,967,296 possible seeds survives — that search is what happens when you press <em>Crack the seed</em>.</p>

    <h3>Cracking, step by step</h3>
    <ol>
      <li>Build a table and count the bookshelves that actually reach it. A shelf counts only when the block between it and the table is empty, and 15 is the ceiling.</li>
      <li>Put any enchantable item in the table and write down the three numbers on the right. A greyed-out slot counts as 0.</li>
      <li>Block one bookshelf — a torch in the gap is enough — and read the table again. Repeat until the search returns a single seed. Six or seven readings normally do it.</li>
      <li>Take the item back out. Do not click an enchantment while you are collecting readings: enchanting rerolls the seed.</li>
    </ol>

    <h3>Throwing items to choose your seed</h3>
    <p>The XP seed is drawn from an ordinary Java random number generator attached to your player, and that generator is used for other things too. Dropping an item spends exactly four steps of it, working out the item's velocity. Enchanting spends one, and that one becomes your next seed.</p>
    <p>The procedure, straight from Earthcomputer's own tutorial \u2014 note it <em>starts</em> with an enchantment:</p>
    <ol>
      <li><strong>Enchant a dummy item</strong> \u2014 slot 1 on a throwaway stone sword costs 1 level. This rerolls the seed, so the one you crack next is fresh.</li>
      <li><strong>Crack the seed.</strong> This is draw one.</li>
      <li><strong>Enchant another dummy item.</strong> Nothing else in between \u2014 no XP, no damage, no food, no dropped items.</li>
      <li><strong>Crack again.</strong> This is draw two.</li>
      <li>Press <em>Work out the player RNG</em>.</li>
    </ol>
    <p>A seed cracked cold \u2014 hours after your last enchantment, or before you ever enchanted \u2014 was drawn at some unknown moment in the past and pairs with nothing. Fresh is the whole trick. From then on the planner can tell you how many items to drop so that the <em>next</em> seed is the one you want.</p>
    <p>The plan comes out as: throw <em>n</em> items, spend one level on a throwaway enchantment to roll the new seed, set the bookshelves, click the slot.</p>

    <h3>Things that break the tracking</h3>
    <p>Anything else that touches your player's randomness will desynchronise the count. Between the two enchantments you use to learn the RNG — and between a plan and carrying it out — avoid:</p>
    <ul class="kbd-list">
      <li><strong>picking up XP orbs</strong> \u2014 bank your levels first</li>
      <li>taking damage</li>
      <li>eating or drinking</li>
      <li>using an anvil</li>
      <li>equipping armour</li>
      <li>durability ticking on an Unbreaking item</li>
      <li>firing a crossbow</li>
      <li>Mending repairing something</li>
      <li>Frost Walker, Soul Speed, Depth Strider</li>
      <li>sprinting, swimming, entering water</li>
      <li>a shoulder parrot</li>
      <li>earning an advancement</li>
    </ul>
    <p>If a later crack disagrees with the prediction, this notices and drops the RNG state rather than lying to you. The XP seed itself stays valid.</p>

    <h3>Where it works</h3>
    <p>Vanilla servers and single-player. Anything that changes enchanting — plugins, mods, datapacks that alter enchantment tags — will make the numbers disagree. Pick your version at the bottom of the sidebar: 1.14 had both an enchantment nerf and a bug that let the four protection enchantments stack, and both are modelled here.</p>
    <p>Everything runs in your browser. Nothing is uploaded, and it works offline once loaded.</p>

    <h3>Credit</h3>
    <p>The method, the reverse engineering and the tables are <a href="https://github.com/Earthcomputer/EnchantmentCracker" target="_blank" rel="noopener">Earthcomputer's EnchantmentCracker</a> and <a href="https://github.com/Earthcomputer/clientcommands" target="_blank" rel="noopener">clientcommands</a>, with speed work by Hexicube. This is a browser port of that work; the simulation was checked line for line against the original Java. If you are willing to run a client-side mod, <code>/cenchant</code> in clientcommands does all of this automatically and is much harder to get wrong.</p>
  `;

  // Build the version-accurate "what touches the RNG" reference into the guide.
  function renderRngReference() {
    if (!root.ECRngEvents) return;
    const host = document.createElement('div');
    const adv = root.ECRngEvents.advancingEvents(S.version);
    const rst = root.ECRngEvents.resetEvents();
    let html = '<h3>What touches the player RNG</h3>' +
      '<p>These are the only things that move or reset your player\u2019s randomness between two enchantments \u2014 ported straight from clientcommands, and version-accurate for your selected version. If any of them happen between your two cracks, the seeds will not pair.</p>';
    html += '<p><strong>Spends calls (recoverable, but avoid):</strong></p><ul>';
    adv.forEach(e => { html += '<li>' + e.icon + ' <strong>' + e.label + '</strong> \u2014 ' + e.calls + ' call' + (e.calls === 1 ? '' : 's') + '. ' + e.note + '</li>'; });
    html += '</ul><p><strong>Wipes the RNG entirely (do not do these):</strong></p><ul>';
    rst.forEach(e => { html += '<li>' + e.icon + ' <strong>' + e.label + '</strong> \u2014 ' + e.note + '</li>'; });
    html += '</ul>';
    host.innerHTML = html;
    const guide = $('#guide-body');
    // remove a previous injection if the version changed
    const prev = guide.querySelector('.rng-ref');
    if (prev) prev.remove();
    host.className = 'rng-ref';
    guide.appendChild(host);
  }

  /* ------------------------------------------------------------- boot */
  (async () => {
    fillVersions();
    refreshReadingForm();
    fillItems($('#out-item'), S.outItem);
    fillItems($('#plan-item'), S.planItem);
    $('#player-level').value = S.playerLevel;
    renderReadings(); renderStatus(); renderSeedLog(); renderChips(); renderRngReference();
    await cracker.init('worker.js');
    const t = cracker.threads;
    if (t > 1) $('#threads-note').textContent = 'Searching on ' + t + ' threads — a few seconds.';
    else if (cracker.workerError) {
      $('#threads-note').textContent = 'Single-threaded — the sweep takes about half a minute.';
      $('#crack-result').appendChild(mkNotice('warn',
        '<strong>worker.js could not be loaded, so the search is running on one thread.</strong> ' +
        'It still works, it just takes about 30 seconds instead of a few. Check that worker.js sits next to index.html.'));
    } else $('#threads-note').textContent = 'Single-threaded — the sweep takes about half a minute. Serve the folder over http to use every core.';
    renderReadings();
  })();
})();
