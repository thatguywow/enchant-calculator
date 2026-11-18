/* =====================================================================
 *  hintpicker.js — type-ahead picker for the enchantment hints
 *
 *  Upgrades the three hint <select>s in step 01 (issue #1). The <select>
 *  stays in the page, hidden, as the single source of truth: its value is
 *  still "ench:level" (e.g. "lure:2"), so the form handler, the saved
 *  readings and the cracker's clue filter are untouched. If anything here
 *  throws, ui.js leaves the plain <select> in place.
 *
 *  Keyboard:  type to filter  ·  Enter / Tab take the top match
 *             digit sets the level  ·  Enter moves on to the next slot
 *             "lure 2", "lure2" and "lure ii" all work in one go
 * ===================================================================== */
(function (root) {
  'use strict';
  const D = root.ECData || (typeof require === 'function' ? require('./data.js') : null);

  const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };

  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

  /**
   * Entries are { ench, name, max }. Names starting with the query come
   * first, then names where every typed word starts some word of the name
   * ("arth" finds Bane of Arthropods). Ties keep the original order, which
   * is the game's registry order.
   */
  function rank(query, entries) {
    const q = norm(query);
    if (!q) return entries.slice();
    const toks = q.split(' ');
    const hits = [];
    entries.forEach((e, idx) => {
      const n = norm(e.name), words = n.split(' ');
      let score = -1;
      if (n.startsWith(q)) score = 0;
      else if (toks.every(t => words.some(w => w.startsWith(t)))) score = 1;
      if (score >= 0) hits.push({ e, score, idx });
    });
    hits.sort((a, b) => a.score - b.score || a.idx - b.idx);
    return hits.map(h => h.e);
  }

  /** Split "lure 2" / "lure2" / "lure ii" into { name, level }. */
  function parseQuery(text, entries) {
    const t = String(text == null ? '' : text).trim().toLowerCase();
    const m = t.match(/^(.*\S)\s+(iii|ii|iv|i|v|[1-9])$/) || t.match(/^(.*[a-z])([1-9])$/);
    if (m && rank(m[1], entries).length) return { name: m[1], level: ROMAN[m[2]] || +m[2] };
    return { name: t, level: null };
  }

  /** Group a <select>'s "ench:level" options into picker entries. */
  function entriesFromOptions(options) {
    const byEnch = new Map();
    Array.prototype.forEach.call(options, o => {
      if (!o.value) return;
      const [ench, lv] = o.value.split(':');
      const level = +lv;
      const e = byEnch.get(ench) || { ench, name: (D && D.PRETTY[ench]) || ench, max: 0 };
      if (level > e.max) e.max = level;
      byEnch.set(ench, e);
    });
    return [...byEnch.values()];
  }

  /* ------------------------------------------------------------- the DOM */
  function enhance(select, opts) {
    opts = opts || {};
    const doc = select.ownerDocument, win = doc.defaultView;
    const id = select.id || ('hp' + Math.random().toString(36).slice(2, 7));
    const mk = (tag, cls, attrs) => {
      const n = doc.createElement(tag);
      if (cls) n.className = cls;
      if (attrs) Object.keys(attrs).forEach(k => n.setAttribute(k, attrs[k]));
      return n;
    };

    const host = mk('div', 'hp');
    const nameEl = mk('input', 'hp-name', {
      type: 'text', id: id + '-text', role: 'combobox', autocomplete: 'off', spellcheck: 'false',
      autocapitalize: 'off', 'aria-autocomplete': 'list', 'aria-expanded': 'false',
      'aria-controls': id + '-list', placeholder: 'didn\u2019t note it \u2014 type to search'
    });
    const levelEl = mk('input', 'hp-level', {
      type: 'text', id: id + '-level', inputmode: 'numeric', autocomplete: 'off', maxlength: '1',
      'aria-label': 'Level', placeholder: 'Level'
    });
    const clearBtn = mk('button', 'hp-clear', { type: 'button', 'aria-label': 'Clear this hint', title: 'Clear' });
    clearBtn.textContent = '\u00d7';
    const listEl = mk('ul', 'hp-list', { id: id + '-list', role: 'listbox' });
    listEl.hidden = true;
    levelEl.hidden = true; clearBtn.hidden = true;
    host.append(nameEl, levelEl, clearBtn, listEl);

    const labelId = select.getAttribute('aria-labelledby');
    if (labelId) nameEl.setAttribute('aria-labelledby', labelId);

    select.hidden = true;
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select.parentNode.insertBefore(host, select.nextSibling);

    let entries = [], matches = [], hi = 0, open = false;
    const state = { ench: null, level: null };
    const entryOf = ench => entries.find(e => e.ench === ench);

    /* -------------------------------------------------- value + view sync */
    function writeSelect() {
      const v = state.ench && state.level ? state.ench + ':' + state.level : '';
      if (select.value !== v) {
        select.value = v;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    function paint() {
      const e = state.ench && entryOf(state.ench);
      const needsLevel = !!(e && e.max > 1);
      levelEl.hidden = !needsLevel;
      if (needsLevel) levelEl.value = state.level ? String(state.level) : '';
      clearBtn.hidden = !(state.ench || nameEl.value);
      host.classList.toggle('is-pending', !!(e && needsLevel && !state.level));
      host.classList.toggle('is-set', !!(state.ench && state.level));
      levelEl.title = e ? 'Level 1 to ' + e.max : '';
    }

    function clearAll(keepText) {
      state.ench = null; state.level = null;
      if (!keepText) nameEl.value = '';
      writeSelect(); paint();
    }

    function choose(entry, level) {
      if (level == null && entry.ench === state.ench) level = state.level;   // re-picking the same one keeps its level
      if (level != null && level > entry.max) level = null;
      state.ench = entry.ench;
      state.level = entry.max === 1 ? 1 : (level || null);
      nameEl.value = entry.name;
      closeList(); writeSelect(); paint();
      return !!state.level;
    }

    const advance = () => { if (opts.onAdvance) opts.onAdvance(); };
    const afterChoose = complete => {
      if (complete) advance();
      else { levelEl.focus(); levelEl.select(); }
    };

    /* --------------------------------------------------------------- list */
    function currentMatches() {
      return rank(parseQuery(nameEl.value, entries).name, entries);
    }

    function renderList() {
      matches = currentMatches();
      if (hi >= matches.length) hi = Math.max(0, matches.length - 1);
      listEl.innerHTML = '';
      if (!matches.length) {
        const li = mk('li', 'hp-empty', { role: 'presentation' });
        li.textContent = entries.length ? 'No enchantment starts with \u201c' + nameEl.value.trim() + '\u201d' : 'Nothing to pick for this item';
        listEl.appendChild(li);
      }
      const typed = norm(parseQuery(nameEl.value, entries).name);
      matches.forEach((e, i) => {
        const li = mk('li', 'hp-opt', { role: 'option', id: id + '-o' + i, 'aria-selected': String(i === hi) });
        li.dataset.i = i;
        const label = mk('span', 'hp-opt-name');
        const lower = e.name.toLowerCase();
        if (typed && lower.startsWith(typed)) {
          const m = doc.createElement('mark'); m.textContent = e.name.slice(0, typed.length);
          label.append(m, doc.createTextNode(e.name.slice(typed.length)));
        } else label.textContent = e.name;
        li.appendChild(label);
        if (e.max > 1) {
          const lv = mk('span', 'hp-lvls');
          for (let l = 1; l <= e.max; l++) {
            const b = mk('span', 'hp-lvl', { 'data-level': l });
            b.textContent = D ? D.roman(l) : String(l);
            lv.appendChild(b);
          }
          li.appendChild(lv);
        }
        listEl.appendChild(li);
      });
      nameEl.setAttribute('aria-activedescendant', matches.length ? id + '-o' + hi : '');
      const cur = listEl.querySelector('[aria-selected="true"]');
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    }

    // Always try to open downwards. If the field is near the bottom of the
    // window, scroll the page a little to make room; only flip upwards if
    // there is genuinely no way to fit the list below.
    function placeList() {
      listEl.classList.remove('is-up');
      const chrome = win.matchMedia && win.matchMedia('(max-width: 900px)').matches ? 76 : 16;   // fixed bottom nav on small screens
      const need = Math.min(listEl.scrollHeight, 248) + 10;
      let r = nameEl.getBoundingClientRect();
      let avail = win.innerHeight - r.bottom - chrome;
      if (avail < need) {
        const dy = Math.min(need - avail, Math.max(0, r.top - 72));
        if (dy > 0) win.scrollBy(0, dy);
        r = nameEl.getBoundingClientRect();
        avail = win.innerHeight - r.bottom - chrome;
      }
      if (avail < Math.min(need, 120) && r.top > avail) listEl.classList.add('is-up');
    }

    function openList() {
      if (!entries.length) return;
      open = true; listEl.hidden = false;
      nameEl.setAttribute('aria-expanded', 'true');
      renderList(); placeList();
    }
    function closeList() {
      open = false; listEl.hidden = true;
      nameEl.setAttribute('aria-expanded', 'false');
      nameEl.removeAttribute('aria-activedescendant');
    }
    function move(d) {
      if (!matches.length) return;
      hi = (hi + d + matches.length) % matches.length;
      renderList();
    }

    /* ------------------------------------------------------------- events */
    nameEl.addEventListener('focus', () => { nameEl.select(); hi = 0; openList(); });
    nameEl.addEventListener('click', () => { if (!open) openList(); });

    nameEl.addEventListener('input', () => {
      if (state.ench) { state.ench = null; state.level = null; writeSelect(); }   // editing a chosen hint starts over
      hi = 0; paint(); openList();
    });

    nameEl.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); if (open) move(1); else openList(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (open) move(-1); else openList(); }
      else if (ev.key === 'Enter') {
        const text = nameEl.value.trim();
        if (!text) { ev.preventDefault(); closeList(); clearAll(); advance(); return; }
        if (!open && state.ench) { ev.preventDefault(); afterChoose(!!state.level); return; }
        const list = currentMatches();
        if (!list.length) { ev.preventDefault(); return; }
        ev.preventDefault();
        const e = list[Math.min(hi, list.length - 1)];
        const p = parseQuery(text, entries);
        afterChoose(choose(e, p.level));
      }
      else if (ev.key === 'Tab') {
        // While several matches are left, Tab / Shift+Tab step through them (Enter picks,
        // Esc closes the list so Tab can leave). A single match is accepted by Tab.
        // An empty field never traps Tab, so skipping a hint stays one keypress.
        if (!state.ench && open && nameEl.value.trim()) {
          const list = currentMatches();
          if (list.length > 1) { ev.preventDefault(); move(ev.shiftKey ? -1 : 1); }
          else if (list.length === 1 && !ev.shiftKey) choose(list[0], parseQuery(nameEl.value, entries).level);
        }
      }
      else if (ev.key === 'Escape') {
        if (open) { ev.preventDefault(); ev.stopPropagation(); closeList(); }
        else if (state.ench) nameEl.value = (entryOf(state.ench) || {}).name || '';
      }
    });

    listEl.addEventListener('mousedown', ev => ev.preventDefault());       // keep focus in the field
    listEl.addEventListener('click', ev => {
      const li = ev.target.closest('.hp-opt');
      if (!li) return;
      const e = matches[+li.dataset.i];
      if (!e) return;
      const chip = ev.target.closest('.hp-lvl');
      afterChoose(choose(e, chip ? +chip.dataset.level : null));
    });

    function setLevel(n) {
      const e = state.ench && entryOf(state.ench);
      if (!e || n < 1 || n > e.max) return false;
      state.level = n; writeSelect(); paint();
      return true;
    }
    levelEl.addEventListener('focus', () => levelEl.select());
    levelEl.addEventListener('keydown', ev => {
      const e = state.ench && entryOf(state.ench);
      if (/^[1-9]$/.test(ev.key)) { ev.preventDefault(); setLevel(+ev.key); }
      else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        const d = ev.key === 'ArrowUp' ? 1 : -1;
        setLevel(Math.max(1, Math.min(e ? e.max : 1, (state.level || (d > 0 ? 0 : (e ? e.max + 1 : 1))) + d)));
      }
      else if (ev.key === 'Enter') { ev.preventDefault(); if (state.level) advance(); }
      else if (ev.key === 'Backspace' || ev.key === 'Escape') { ev.preventDefault(); nameEl.focus(); }
    });
    levelEl.addEventListener('input', () => { levelEl.value = state.level ? String(state.level) : ''; });   // only digits via keydown

    clearBtn.addEventListener('click', () => { clearAll(); nameEl.focus(); });

    host.addEventListener('focusout', () => {
      setTimeout(() => {
        if (host.contains(doc.activeElement)) return;
        closeList();
        const e = state.ench && entryOf(state.ench);
        nameEl.value = e ? e.name : '';             // never leave stray text that is not a real choice
        paint();
      }, 0);
    });

    /* ----------------------------------------------------------- public */
    function refresh() {
      entries = entriesFromOptions(select.options);
      const [ench, lv] = (select.value || '').split(':');
      const e = ench && entryOf(ench);
      if (e && +lv >= 1 && +lv <= e.max) { state.ench = ench; state.level = +lv; nameEl.value = e.name; }
      else { state.ench = null; state.level = null; nameEl.value = ''; if (select.value) select.value = ''; }
      closeList(); paint();
    }
    refresh();

    return {
      refresh,
      focus: () => (state.ench && !state.level ? levelEl : nameEl).focus(),
      isPending: () => !!(state.ench && !state.level),
      host
    };
  }

  const API = { rank, parseQuery, norm, entriesFromOptions, enhance };
  root.ECHintPicker = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
