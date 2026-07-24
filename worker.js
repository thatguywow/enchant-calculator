/* Scan worker: owns its own WebAssembly instance and reports survivors. */
importScripts('kernel.js');

const OBS_PTR = 0, BUF_A = 4096;
let ex = null;

async function ready() {
  if (!ex) {
    ex = await self.ECKernel.load();
    // warm the kernel up so the JIT tiers it up before the real work starts
    const mem = new Int32Array(ex.memory.buffer);
    mem[0] = 0; mem[1] = 1; mem[2] = 1; mem[3] = 1;
    ex.scan(0, 1 << 20, OBS_PTR, 1, BUF_A, 1 << 10);
  }
  return ex;
}

self.onmessage = async (ev) => {
  const { cmd, start, count, obs, cap } = ev.data;
  if (cmd === 'ping') { self.postMessage({ pong: true }); return; }
  if (cmd !== 'scan') return;
  const k = await ready();
  const need = BUF_A + cap * 4;
  if (k.memory.buffer.byteLength < need) k.memory.grow(Math.ceil((need - k.memory.buffer.byteLength) / 65536));
  const mem = new Int32Array(k.memory.buffer);
  obs.forEach((o, i) => {
    mem[i * 4] = o.bookshelves; mem[i * 4 + 1] = o.c1; mem[i * 4 + 2] = o.c2; mem[i * 4 + 3] = o.c3;
  });
  const n = k.scan(start, count, OBS_PTR, obs.length, BUF_A, cap);
  if (n < 0) { self.postMessage({ overflow: true }); return; }
  const seeds = new Int32Array(k.memory.buffer, BUF_A, n).slice();
  self.postMessage({ seeds }, [seeds.buffer]);
};
