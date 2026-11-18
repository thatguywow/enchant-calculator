/* End-to-end DOM test of the real page (keyboard flow, mobile settings, planner fields).
 *   npm i --no-save jsdom && node tests/e2e.js
 * Serves the repo root on a random local port; no browser needed. */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
let BASE = '';
const { JSDOM, VirtualConsole } = require('jsdom');
let errors = [], pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) pass++; else { fail++; console.log('FAIL', n, d || ''); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function load({ width = 1200, store = {} } = {}) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented|Could not load link|Could not load stylesheet/.test(e.message)) errors.push(e.message); });
  vc.on('error', m => errors.push(String(m)));
  const dom = await JSDOM.fromURL(BASE, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      Object.entries(store).forEach(([k, v]) => w.localStorage.setItem(k, JSON.stringify(v)));
      w.matchMedia = q => ({ matches: q.includes('max-width: 900px') ? width <= 900 : false, addEventListener() {}, addListener() {} });
      w.scrollBy = () => {};
      Object.defineProperty(w, 'innerHeight', { value: 900 });
    }
  });
  await sleep(900);
  return dom;
}
const key = (w, el, k, extra) => {
  const ev = new w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra));
  el.dispatchEvent(ev); return ev;
};
const type = (w, el, text) => { el.value = text; el.dispatchEvent(new w.Event('input', { bubbles: true })); };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  BASE = 'http://127.0.0.1:' + server.address().port + '/';
  /* ---------- desktop: keyboard flow ---------- */
  let dom = await load();
  let w = dom.window, d = w.document;
  ok('page boots with no script errors', errors.length === 0, errors.join(' | '));
  ok('three pickers installed', d.querySelectorAll('.hp').length === 3);
  ok('native selects hidden', ['in-h1','in-h2','in-h3'].every(i => d.getElementById(i).hidden));
  ok('tab order interleaves cost/hint', (() => {
    const f = [...d.querySelectorAll('#reading-form input, #reading-form select, #reading-form button')].filter(e => !e.hidden && e.tabIndex >= 0);
    const ids = f.map(e => e.id).filter(Boolean);
    return ids.indexOf('in-c1') < ids.indexOf('in-h1-text') && ids.indexOf('in-h1-text') < ids.indexOf('in-c2') && ids.indexOf('in-c2') < ids.indexOf('in-h2-text');
  })(), 'order check');
  ok('default shelves start at 15', d.getElementById('in-shelves').value === '15');

  const item = d.getElementById('in-item'); item.value = 'fishing_rod'; item.dispatchEvent(new w.Event('change'));
  const n1 = d.getElementById('in-h1-text'), l1 = d.getElementById('in-h1-level'), sel1 = d.getElementById('in-h1'), list1 = d.getElementById('in-h1-list');
  n1.focus(); n1.dispatchEvent(new w.Event('focus'));
  type(w, n1, 'l');
  const shown = [...list1.querySelectorAll('.hp-opt-name')].map(x => x.textContent);
  ok('typing "l" narrows list', shown.join('|') === 'Luck of the Sea|Lure', shown.join('|'));
  ok('list is not hidden / opens downward', !list1.hidden && !list1.classList.contains('is-up'));
  type(w, n1, 'lur');
  key(w, n1, 'Enter');
  ok('Enter picks Lure and shows level box', !l1.hidden && d.activeElement === l1 && n1.value === 'Lure');
  ok('pending (amber) until level set', n1.parentNode.classList.contains('is-pending'));
  key(w, l1, '2');
  ok('digit sets lure:2', sel1.value === 'lure:2', sel1.value);
  key(w, l1, 'Enter');
  ok('Enter on level moves to middle cost', d.activeElement === d.getElementById('in-c2'));

  const n2 = d.getElementById('in-h2-text'), sel2 = d.getElementById('in-h2');
  n2.focus(); type(w, n2, 'luck of the sea ii'); key(w, n2, 'Enter');
  ok('"luck of the sea ii" commits in one Enter', sel2.value === 'luck_of_the_sea:2', sel2.value);
  ok('...and advances to bottom cost', d.activeElement === d.getElementById('in-c3'));

  // half-entered hint blocks submit
  const n3 = d.getElementById('in-h3-text'), sel3 = d.getElementById('in-h3');
  ['in-c1','in-c2','in-c3'].forEach((id, i) => d.getElementById(id).value = [10, 20, 30][i]);
  n3.focus(); type(w, n3, 'lure'); key(w, n3, 'Tab');
  ok('Tab accepts top match, level pending', d.getElementById('in-h3').value === '' && !d.getElementById('in-h3-level').hidden);
  d.getElementById('reading-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
  ok('submit blocked while a level is missing', d.querySelectorAll('.reading').length === 0 || d.querySelector('.reading') === null, d.querySelectorAll('.reading').length);
  ok('focus sent to the missing level', d.activeElement === d.getElementById('in-h3-level'));
  key(w, d.getElementById('in-h3-level'), '3');
  ok('bottom hint lure:3', sel3.value === 'lure:3');
  key(w, d.getElementById('in-h3-level'), 'Enter');      // advance -> submits the form
  await sleep(50);
  const rows = d.querySelectorAll('.reading');
  ok('Enter after bottom slot adds the reading', rows.length === 1, rows.length);
  ok('reading shows 3 hints', /\+3 hints/.test(rows[0] ? rows[0].textContent : ''));
  ok('hints and costs reset', sel1.value === '' && sel2.value === '' && sel3.value === '' && d.getElementById('in-c1').value === '');
  ok('picker text reset', n1.value === '' && n2.value === '' && n3.value === '');
  ok('focus returns to first cost', d.activeElement === d.getElementById('in-c1'));
  ok('shelves auto-step to 14', d.getElementById('in-shelves').value === '14', d.getElementById('in-shelves').value);
  const saved = JSON.parse(w.localStorage.getItem('readings'));
  ok('saved reading keeps ench:level clues', saved[0].clues.map(c => c.ench + ':' + c.level).join() === 'lure:2,luck_of_the_sea:2,lure:3', JSON.stringify(saved[0].clues));

  // clear + empty Enter on hint 3 submits (no hints)
  n1.focus(); type(w, n1, 'lure 3'); key(w, n1, 'Enter');
  ok('"lure 3" commits and clears via x', sel1.value === 'lure:3');
  d.querySelector('#in-h1').parentNode.querySelector('.hp-clear').click();
  ok('clear button empties the hint', sel1.value === '' && n1.value === '');

  /* ---- reported issues: Tab walks matches, Enter on costs, editing, level label ---- */
  ok('level box placeholder is not "lvl" (read as 1v1)', l1.placeholder === 'Level', l1.placeholder);
  d.getElementById('in-c1').focus();
  const evc = key(w, d.getElementById('in-c1'), 'Enter');
  ok('Enter on a cost moves to that slot\'s hint, no submit', evc.defaultPrevented && d.activeElement === n1 && d.querySelectorAll('.reading').length === 1);
  const evc3 = key(w, d.getElementById('in-c3'), 'Enter');
  ok('Enter on bottom cost goes to bottom hint', d.activeElement === n3 && evc3.defaultPrevented);

  const itm = d.getElementById('in-item'); itm.value = 'book'; itm.dispatchEvent(new w.Event('change'));
  n1.focus(); n1.dispatchEvent(new w.Event('focus'));
  type(w, n1, 'fire');
  const fire = () => [...list1.querySelectorAll('.hp-opt')].map(o => o.textContent.replace(/[IV]+/g, '').trim() + (o.getAttribute('aria-selected') === 'true' ? '*' : ''));
  ok('"fire" lists Fire Protection (highlighted) then Fire Aspect', fire().join('|') === 'Fire Protection*|Fire Aspect', fire().join('|'));
  const t1 = key(w, n1, 'Tab');
  ok('Tab steps to the 2nd match instead of accepting the 1st', t1.defaultPrevented && fire().join('|') === 'Fire Protection|Fire Aspect*' && sel1.value === '' && !list1.hidden, fire().join('|') + ' / ' + sel1.value);
  key(w, n1, 'Tab');
  ok('Tab wraps around', fire()[0].endsWith('*'));
  key(w, n1, 'Tab', { shiftKey: true });
  ok('Shift+Tab steps back', fire()[1].endsWith('*'));
  key(w, n1, 'Enter');
  ok('Enter then picks the highlighted Fire Aspect', n1.value === 'Fire Aspect' && d.activeElement === l1);
  key(w, l1, '2');
  ok('level 2 -> fire_aspect:2', sel1.value === 'fire_aspect:2', sel1.value);
  d.querySelector('#in-h1').parentNode.querySelector('.hp-clear').click();

  // empty field never traps Tab; a typed unique match is still accepted by Tab
  n1.focus(); n1.dispatchEvent(new w.Event('focus'));
  ok('Tab on an empty hint is not intercepted', key(w, n1, 'Tab').defaultPrevented === false);
  type(w, n1, 'silk'); key(w, n1, 'Tab');
  ok('Tab accepts a single match (Silk Touch, max level 1 -> complete)', sel1.value === 'silk_touch:1', sel1.value);
  d.querySelector('#in-h1').parentNode.querySelector('.hp-clear').click();
  itm.value = 'fishing_rod'; itm.dispatchEvent(new w.Event('change'));

  // editing
  const editBtn = () => [...d.querySelectorAll('.reading .btn')].find(b => /^Edit/.test(b.textContent));
  editBtn().click();
  ok('Edit loads costs', d.getElementById('in-c1').value === '10' && d.getElementById('in-c2').value === '20' && d.getElementById('in-c3').value === '30');
  ok('Edit loads all three hints', sel1.value === 'lure:2' && sel2.value === 'luck_of_the_sea:2' && sel3.value === 'lure:3', [sel1.value, sel2.value, sel3.value].join());
  ok('Edit shows hints in the pickers', n1.value === 'Lure' && d.getElementById('in-h1-level').value === '2' && d.getElementById('in-h2-text').value === 'Luck of the Sea');
  ok('Edit restores item and shelf count', d.getElementById('in-item').value === 'fishing_rod' && d.getElementById('in-shelves').value === '15', d.getElementById('in-shelves').value);
  ok('banner + Save changes shown', !d.getElementById('edit-banner').hidden && d.getElementById('btn-add-reading').textContent === 'Save changes');
  d.getElementById('in-c1').value = '12'; sel2.value = ''; n2.value = ''; 
  d.getElementById('in-h2-text').dispatchEvent(new w.Event('input', { bubbles: true }));     // user wipes the middle hint
  d.getElementById('reading-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
  await sleep(30);
  const after = JSON.parse(w.localStorage.getItem('readings'));
  ok('saving replaces, not appends', after.length === 1 && after[0].c1 === 12 && after[0].c2 === 20, JSON.stringify(after));
  ok('edited hints saved (middle one removed)', after[0].clues[0].ench === 'lure' && after[0].clues[1] === null && after[0].clues[2].level === 3, JSON.stringify(after[0].clues));
  ok('edit state cleared afterwards', d.getElementById('edit-banner').hidden && d.getElementById('btn-add-reading').textContent === 'Add reading' && d.getElementById('in-c1').value === '');

  editBtn().click(); d.getElementById('btn-edit-cancel').click();
  ok('cancel leaves the reading untouched and clears the form', JSON.parse(w.localStorage.getItem('readings')).length === 1 && d.getElementById('in-c1').value === '' && d.getElementById('edit-banner').hidden);
  editBtn().click(); [...d.querySelectorAll('.reading .btn-danger')][0].click();
  ok('removing the reading being edited ends the edit', d.querySelectorAll('.reading').length === 0 && d.getElementById('edit-banner').hidden && d.getElementById('in-c1').value === '');
  dom.window.close();

  /* ---------- narrow screen: settings strip is reachable ---------- */
  dom = await load({ width: 600 }); w = dom.window; d = w.document;
  ok('mobile: version select moved into page', d.getElementById('mobile-settings').contains(d.getElementById('version')));
  ok('mobile: XP level + pills moved too', d.getElementById('mobile-settings').contains(d.getElementById('player-level')) && d.getElementById('mobile-settings').contains(d.getElementById('pill-seed')));
  ok('mobile: still not in the bottom rail', !d.querySelector('.rail').contains(d.getElementById('version')));
  dom.window.close();
  dom = await load({ width: 1200 }); d = dom.window.document;
  ok('desktop: settings stay in the sidebar', d.querySelector('.rail').contains(d.getElementById('version')));
  dom.window.close();

  /* ---------- plan + outcomes with a known seed ---------- */
  dom = await load({ store: { xpSeed: 123456789, picks: { lunge: 3, sharpness: 5 }, planItem: 'diamond_sword', outItem: 'diamond_sword' } });
  w = dom.window; d = w.document;
  ok('stale pick (lunge on a sword) pruned from storage', !('lunge' in JSON.parse(w.localStorage.getItem('picks'))), w.localStorage.getItem('picks'));
  ok('unreachable level capped to what the table can offer (Sharpness 5 -> 4)', JSON.parse(w.localStorage.getItem('picks')).sharpness === 4, w.localStorage.getItem('picks'));
  d.querySelector('[data-view=outcomes]').click();
  ok('outcomes tags one hint per visible slot', d.querySelectorAll('#outcomes-body .clue-mark').length >= 10, d.querySelectorAll('#outcomes-body .clue-mark').length);
  d.querySelector('[data-view=plan]').click();
  w.localStorage.setItem('picks', '{}');
  d.getElementById('plan-maxshelves').value = '0';
  d.getElementById('plan-maxthrows').value = '0';
  d.getElementById('plan-item').value = 'diamond_sword';
  d.getElementById('btn-plan-clear').click();
  d.getElementById('btn-plan').click();
  const cards = [...d.querySelectorAll('#plan-result .plan-card')];
  const boxes = cards.map(c => [...c.querySelectorAll('.step-box')].find(b => /Bookshelves/.test(b.textContent)).querySelector('.step-v').textContent);
  ok('0 bookshelves is honoured (not turned into 15)', cards.length > 0 && boxes.every(b => b === '0'), boxes.join());
  dom.window.close();

  console.log(`\nDOM tests: ${pass} passed, ${fail} failed; page errors: ${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 5));
  server.close(); process.exit(fail || errors.length ? 1 : 0);
})();
