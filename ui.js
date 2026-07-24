/* =====================================================================
 *  ui.js — the interface
 * ===================================================================== */
(function () {
  'use strict';
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
    playerLevel: store.get('playerLevel', 30),
    outItem: store.get('outItem', 'diamond_sword'),
    planItem: store.get('planItem', 'diamond_sword'),
    picks: store.get('picks', {}),          // ench -> level, or -1 for "refuse"
    freshCrack: false
  };
  const save = () => {
    store.set('version', S.version); store.set('readings', S.readings);
    store.set('xpSeed', S.xpSeed); store.set('playerState', S.playerState);
    store.set('seedLog', S.seedLog); store.set('playerLevel', S.playerLevel);
    store.set('outItem', S.outItem); store.set('planItem', S.planItem); store.set('picks', S.picks);
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
      renderOutcomes(); renderChips();
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
      costs.innerHTML = [r.c1, r.c2, r.c3].map(c => c === 0 ? '<em>—</em>' : c).join(' &nbsp;/&nbsp; ');
      row.appendChild(costs);
      const del = el('button', 'btn btn-ghost btn-sm btn-danger', 'Remove');
      del.addEventListener('click', () => { S.readings.splice(i, 1); afterReadingsChange(); });
      row.appendChild(del);
      box.appendChild(row);
    });

    const hint = $('#readings-hint'); hint.innerHTML = '';
    const distinct = new Set(S.readings.map(r => r.bookshelves)).size;
    if (S.readings.length && distinct < S.readings.length) {
      hint.appendChild(mkNotice('warn', 'Two readings share a bookshelf count. The table always shows the same numbers for the same seed and the same shelves, so a repeat teaches this nothing — change the shelf count between readings.'));
    } else if (distinct && distinct < 3) {
      hint.appendChild(mkNotice('', 'Three readings cuts four billion seeds to a few thousand; six or seven normally leave exactly one. Block a bookshelf — a torch in the gap will do — and read the table again.'));
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
    S.readings.push({ bookshelves: b, c1, c2, c3 });
    ['#in-c1', '#in-c2', '#in-c3'].forEach(s => $(s).value = '');
    afterReadingsChange();
    $('#in-shelves').focus();
  });

  $('#btn-reset').addEventListener('click', () => {
    S.readings = []; S.candidates = null; S.xpSeed = null; S.playerState = null; S.seedLog = [];
    afterReadingsChange(); renderStatus(); renderSeedLog(); $('#rng-result').innerHTML = '';
  });

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
    S.candidates = res.seeds;
    renderReadings();
    renderCrackResult(res);
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
      return;
    }
    box.appendChild(mkNotice('', '<strong>' + n.toLocaleString() + ' candidate' + (n===1?'':'s') + ' left.</strong> Change the bookshelf count, read the table again and add it below. Narrowing is instant from here — no second sweep.'));
    const form = el('form', 'row'); form.style.marginTop = '12px';
    form.innerHTML =
      '<label class="field row-fixed" style="flex:0 0 130px"><span class="field-label">Bookshelves</span><input type="number" min="0" max="15" id="nx-b"></label>' +
      '<label class="field"><span class="field-label">Top</span><input type="number" min="0" max="30" id="nx-1"></label>' +
      '<label class="field"><span class="field-label">Middle</span><input type="number" min="0" max="30" id="nx-2"></label>' +
      '<label class="field"><span class="field-label">Bottom</span><input type="number" min="0" max="30" id="nx-3"></label>' +
      '<div class="row-fixed"><button class="btn btn-primary" type="submit">Narrow it down</button></div>';
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const r = { bookshelves: +$('#nx-b').value, c1: +$('#nx-1').value, c2: +$('#nx-2').value, c3: +$('#nx-3').value };
      if ([r.bookshelves, r.c1, r.c2, r.c3].some(isNaN)) return;
      S.readings.push(r); save();
      S.candidates = cracker.filter(S.candidates, [r]);
      renderReadings();
      renderCrackResult({ ms: 0, seeds: S.candidates });
    });
    box.appendChild(form);
  }

  /* -------------------------------------------------- seeds & the RNG */
  function recordSeed(seed) {
    if (S.seedLog.length && S.seedLog[S.seedLog.length - 1].seed === seed) return;
    S.seedLog.push({ seed, at: Date.now() });
    if (S.seedLog.length > 8) S.seedLog.shift();
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

  function renderSeedLog() {
    const box = $('#seed-log'); box.innerHTML = '';
    if (!S.seedLog.length) { box.appendChild(el('div', 'empty', 'Seeds you crack are listed here.')); }
    else {
      const list = el('div', 'readings');
      S.seedLog.forEach((s, i) => {
        const row = el('div', 'reading');
        row.appendChild(el('span', 'reading-shelves', 'draw ' + (i + 1)));
        row.appendChild(el('span', 'reading-costs', hex8(s.seed)));
        row.appendChild(el('span', 'seed-side', i === S.seedLog.length - 1 ? 'current' : ''));
        list.appendChild(row);
      });
      box.appendChild(list);
    }
    $('#btn-rng').disabled = S.seedLog.length < 2;
  }

  $('#btn-rng').addEventListener('click', () => {
    const n = S.seedLog.length;
    const a = S.seedLog[n - 2].seed, b = S.seedLog[n - 1].seed;
    const state = cracker.playerSeedFrom(a, b);
    const box = $('#rng-result'); box.innerHTML = '';
    if (state === null) {
      box.appendChild(mkNotice('bad', '<strong>Those two draws are not consecutive.</strong> Between the two enchantments something else used your player\u2019s randomness — most often a dropped item, a hit taken, eating, or an anvil. Enchant once more with nothing else going on, crack the seed again and retry.'));
      return;
    }
    S.playerState = state; S.xpSeed = b; save(); renderStatus();
    box.appendChild(mkNotice('good', '<strong>Player RNG locked on.</strong> Internal state <code>' + hex12(state) + '</code>. Every future seed is now predictable, so you can throw items to choose one.'));
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
    <p>So: crack the seed, enchant once, crack it again. Two consecutive draws are enough to recover the generator's entire 48-bit state. From then on this can tell you how many items to drop so that the <em>next</em> seed is the one you want.</p>
    <p>The plan comes out as: throw <em>n</em> items, spend one level on a throwaway enchantment to roll the new seed, set the bookshelves, click the slot.</p>

    <h3>Things that break the tracking</h3>
    <p>Anything else that touches your player's randomness will desynchronise the count. Between the two enchantments you use to learn the RNG — and between a plan and carrying it out — avoid:</p>
    <ul class="kbd-list">
      <li>picking up XP orbs</li>
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

  /* ------------------------------------------------------------- boot */
  (async () => {
    fillVersions();
    fillItems($('#out-item'), S.outItem);
    fillItems($('#plan-item'), S.planItem);
    $('#player-level').value = S.playerLevel;
    renderReadings(); renderStatus(); renderSeedLog(); renderChips();
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
