/* =====================================================================
 *  cracker.js — searching the 2^32 XP seed space
 *
 *  The whole seed space is split into tasks handed out to a pool of web
 *  workers, each running the WebAssembly kernel. Every observation the
 *  player types in (bookshelf count + the three numbers on the table) is
 *  applied at once, so the space is only ever walked a single time.
 * ===================================================================== */
(function (root) {
  'use strict';

  const OBS_PTR = 0;                 // observation block lives at offset 0
  const BUF_A   = 4096;              // primary candidate buffer
  const CAP     = 1 << 20;           // 1M candidates per buffer (4 MiB)
  const BUF_B   = BUF_A + CAP * 4;
  const NEED_BYTES = BUF_B + CAP * 4;
  const TASK    = 1 << 26;           // 67M seeds per task -> 64 tasks total
  const TOTAL   = 4294967296;

  function growTo(ex, bytes) {
    const have = ex.memory.buffer.byteLength;
    if (have < bytes) ex.memory.grow(Math.ceil((bytes - have) / 65536));
  }

  function writeObs(ex, observations) {
    growTo(ex, NEED_BYTES);
    const mem = new Int32Array(ex.memory.buffer);
    observations.forEach((o, i) => {
      mem[i * 4] = o.bookshelves; mem[i * 4 + 1] = o.c1; mem[i * 4 + 2] = o.c2; mem[i * 4 + 3] = o.c3;
    });
    return mem;
  }

  /** Run one task range; returns an Int32Array of survivors or null on overflow. */
  function runTask(ex, start, count, observations) {
    writeObs(ex, observations);
    const n = ex.scan(start, count, OBS_PTR, observations.length, BUF_A, CAP);
    if (n < 0) return null;
    return new Int32Array(ex.memory.buffer, BUF_A, n).slice();
  }

  /** Filter an existing candidate list by more observations (instant). */
  function filterList(ex, list, observations) {
    if (!observations.length || !list.length) return list;
    growTo(ex, NEED_BYTES);
    let cur = list;
    // chunk so we never exceed CAP in one call
    const out = [];
    for (let off = 0; off < cur.length; off += CAP) {
      const part = cur.subarray(off, Math.min(off + CAP, cur.length));
      const mem = writeObs(ex, observations);
      mem.set(part, BUF_A / 4);
      const n = ex.filter(BUF_A, part.length, OBS_PTR, observations.length, BUF_B);
      const res = new Int32Array(ex.memory.buffer, BUF_B, n);
      for (let i = 0; i < n; i++) out.push(res[i]);
    }
    return Int32Array.from(out);
  }

  /* ------------------------------------------------------------------ */

  class Cracker {
    constructor() {
      this.ex = null;
      this.workers = [];
      this.useWorkers = true;
      this.workerError = null;
      this.cancelled = false;
    }

    async init(workerUrl) {
      this.ex = await root.ECKernel.load();
      if (workerUrl && this.useWorkers && typeof Worker !== 'undefined') {
        const n = Math.max(1, Math.min(16, (navigator.hardwareConcurrency || 4)));
        try {
          for (let i = 0; i < n; i++) this.workers.push(new Worker(workerUrl));
          // A missing or broken worker file fails asynchronously rather than
          // throwing, so prove one can answer before trusting the pool.
          await this._probe(this.workers[0]);
        } catch (e) {
          this.workerError = String(e && e.message || e);
          this.workers.forEach(w => { try { w.terminate(); } catch (e2) {} });
          this.workers = [];
        }
      }
      return this;
    }

    _probe(w, timeout) {
      return new Promise((resolve, reject) => {
        const done = (fn, arg) => { clearTimeout(timer); w.onmessage = null; w.onerror = null; fn(arg); };
        const timer = setTimeout(() => done(reject, new Error('worker did not respond')), timeout || 5000);
        w.onerror = () => done(reject, new Error('worker.js failed to load'));
        w.onmessage = ev => ev.data && ev.data.pong ? done(resolve) : done(reject, new Error('unexpected reply'));
        w.postMessage({ cmd: 'ping' });
      });
    }

    get threads() { return this.workers.length || 1; }

    cancel() { this.cancelled = true; }

    /**
     * Full 2^32 sweep.
     * @returns {Promise<{seeds:Int32Array, overflow:boolean, ms:number}>}
     */
    async scan(observations, onProgress) {
      this.cancelled = false;
      const t0 = performance.now();
      const tasks = [];
      for (let s = -2147483648; s < 2147483647; s += TASK) tasks.push(s);
      let done = 0, overflow = false;
      const results = [];

      const report = () => onProgress && onProgress(done / tasks.length);

      if (this.workers.length) {
        let next = 0;
        const runOne = (w) => new Promise(resolve => {
          const pump = () => {
            if (this.cancelled || overflow || next >= tasks.length) return resolve();
            const start = tasks[next++];
            w.onmessage = (ev) => {
              if (ev.data.overflow) overflow = true;
              else if (ev.data.seeds && ev.data.seeds.length) results.push(ev.data.seeds);
              done++; report();
              pump();
            };
            w.postMessage({ cmd: 'scan', start, count: TASK, obs: observations, cap: CAP });
          };
          pump();
        });
        await Promise.all(this.workers.map(runOne));
      } else {
        // single-threaded fallback (also used when workers are blocked on file://)
        for (const start of tasks) {
          if (this.cancelled || overflow) break;
          const r = runTask(this.ex, start, TASK, observations);
          if (r === null) { overflow = true; break; }
          if (r.length) results.push(r);
          done++; report();
          await new Promise(r2 => setTimeout(r2, 0));   // keep the UI alive
        }
      }

      let total = 0; results.forEach(r => total += r.length);
      const seeds = new Int32Array(total);
      let off = 0; results.forEach(r => { seeds.set(r, off); off += r.length; });
      seeds.sort();
      return { seeds, overflow, cancelled: this.cancelled, ms: performance.now() - t0 };
    }

    /** Narrow an existing candidate list — instantaneous, no sweep needed. */
    filter(seeds, observations) { return filterList(this.ex, seeds, observations); }

    /**
     * Second-stage filter: keep only candidates whose enchantment hints match
     * what the table showed. Run after the numeric sweep — it is JS, not WASM,
     * but the numeric stage has already cut millions down to thousands.
     *
     * observations: [{bookshelves, c1, c2, c3, item, clues:[{ench,level}|null x3]}]
     * A null clue means "not recorded" and is skipped; an entry for an empty
     * slot is ignored.
     */
    filterByClues(seeds, observations, version) {
      const EC = root.ECEnchant;
      const withClues = observations.filter(o => o.item && o.clues && o.clues.some(c => c));
      if (!withClues.length || !seeds.length) return seeds;
      const rand = new EC.JavaRandom();
      const out = [];
      outer: for (let i = 0; i < seeds.length; i++) {
        const seed = seeds[i];
        for (const o of withClues) {
          const costs = [o.c1, o.c2, o.c3];
          for (let slot = 0; slot < 3; slot++) {
            const want = o.clues[slot];
            if (!want || !costs[slot]) continue;
            const list = EC.enchantmentsInTable(rand, seed, o.item, slot, costs[slot], version);
            if (!list.length) continue outer;
            const clue = list[rand.nextInt(list.length)];
            if (clue.ench !== want.ench || clue.level !== want.level) continue outer;
          }
        }
        out.push(seed);
      }
      return Int32Array.from(out);
    }

    /**
     * Recover the player's 48-bit RNG state from two XP seeds that are NOT
     * necessarily adjacent draws.
     *
     * The first seed pins 32 of the 48 state bits; the low 16 are brute
     * forced. Rather than demanding the second seed be the very next draw,
     * this also allows up to maxGap unknown calls in between and reports how
     * many there were — so one stray item drop (4 calls) or a sip of a potion
     * no longer throws the whole session away.
     *
     * Returns { state, gap } — state being the value *after* the second
     * draw — or null if no explanation fits.
     */
    playerSeedFromPair(xp1, xp2, maxGap) {
      const EC = root.ECEnchant;
      const gapMax = maxGap === undefined ? 64 : maxGap;
      const hi = (xp1 >>> 0) * 65536;          // top 32 bits of the state
      const want = xp2 | 0;
      let best = null;
      for (let lo = 0; lo < 65536; lo++) {
        let st = hi + lo;
        for (let k = 0; k <= gapMax; k++) {
          st = EC.lcgNext(st);
          if (EC.stateToInt(st) === want) {
            if (!best || k < best.gap) best = { state: st, gap: k };
            break;
          }
        }
        if (best && best.gap === 0) break;     // adjacent draws: nothing beats it
      }
      return best;
    }

    /**
     * Strict version: the two draws must be adjacent. Kept because it is what
     * the desktop tool does, and it cannot report a false positive.
     */
    playerSeedFrom(xp1, xp2) {
      const ex = this.ex;
      growTo(ex, 65536);
      const ok = ex.playerSeed(xp1 | 0, xp2 | 0, 2048);
      if (!ok) return null;
      const mem = new Int32Array(ex.memory.buffer);
      const lo = mem[512] >>> 0, hi = mem[513] >>> 0;
      return hi * 4294967296 + lo;
    }
  }

  root.ECCracker = { Cracker, CAP, TASK, TOTAL };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ECCracker;
})(typeof globalThis !== 'undefined' ? globalThis : this);
