# Enchantment Seed Cracker

A browser port of [Earthcomputer's EnchantmentCracker](https://github.com/Earthcomputer/EnchantmentCracker).
Type in what Minecraft's enchanting table shows you, and it works out the hidden
XP seed behind it — then tells you how many items to throw and how many
bookshelves to block to get the enchantment you actually want.

No install, no mod, no server. A static site: drop it on GitHub Pages and it runs.

## How it works

Three stages, exactly as in the original:

1. **XP seed.** Every player carries a hidden 32-bit `xpSeed`. The three level
   costs shown by the table come from `Random.setSeed(xpSeed)` followed by
   `nextInt(8) + 1 + (shelves >> 1) + nextInt(shelves + 1)`, mapped per slot; the
   enchantments behind each slot come from a *separate* reseed at `xpSeed + slot`.
   Each reading gives away a few bits, so enough of them leave one surviving seed
   out of 4,294,967,296. That sweep runs in a hand-written WebAssembly kernel
   across a pool of web workers — about 26 s of single-threaded work, so a few
   seconds on a normal machine.
2. **Player RNG.** `xpSeed` is drawn with `player.random.nextInt()`, which hands
   over 32 of the generator's 48 state bits. A second consecutive draw pins the
   remaining 16 by brute force. Crack, enchant once, crack again — that's it.
3. **Manipulation.** Dropping an item spends exactly four steps of that generator
   (the item's velocity), and enchanting spends one — and that one *becomes* the
   next XP seed. So "throw n items, do a throwaway enchantment, set b bookshelves,
   click slot s" is fully computable.

## Running it

Any static host works. For GitHub Pages: push the repository, then
**Settings → Pages → Deploy from branch → `main` / root**. Nothing here starts with an underscore, so Jekyll leaves it alone and no `.nojekyll` file is needed.

Locally you need a server, because the workers are separate files:

```
python3 -m http.server 8000     # then open http://localhost:8000
```

Opening `index.html` straight off disk still works — the WebAssembly kernel is
embedded as base64 rather than fetched — but browsers block workers on `file://`,
so the sweep falls back to a single thread and takes about half a minute.

## Testing

```
node tests/run.js                          # regression tests, no dependencies
npm i --no-save jsdom && node tests/e2e.js # drives the real page in a headless DOM
```

`tests/golden.json` was captured from the code *before* the hint picker and planner changes (60 table outcomes, 40 planner runs, 6 player-RNG recoveries); the current code has to reproduce all of it exactly. `run.js` also checks the planner against the original quadratic algorithm on 200 random cases, the type-ahead matching, and the zero-value handling of the number fields. `e2e.js` types through the keyboard flow on the actual page.

## Verifying it

The simulation is a port, checked against Earthcomputer's Java while it was built. The reference checks below ran in the author's development setup; the scripts and the compiled reference data are **not** part of this repository.

| script                | what it proves                                                                                                                                                        |
|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `verify.js`           | costs, full enchantment lists and GUI clues match Earthcomputer's `Enchantments.java` — **4745 / 4745** random cases across all 11 version brackets and 21 item types |
| `verify-plan.js`      | the throw planner matches `EnchCrackerWindow`'s calculate loop — **349 / 349**                                                                                        |
| `verify-kernel.js`    | the WebAssembly kernel agrees with the JS engine on 100k cost cases; full sweeps recover the target seed; player-state recovery **5000 / 5000**                       |
| `verify-fullcrack.js` | readings in, one correct seed out, through the real `Cracker` class                                                                                                   |

The reference data comes from compiling the upstream Java directly:

```
git clone https://github.com/Earthcomputer/EnchantmentCracker
cp EnchantmentCracker/src/enchcracker/{Enchantments,Items,Versions,Materials}.java oracle/enchcracker/
javac -d out oracle/enchcracker/*.java && java -cp out enchcracker.Oracle > ref.txt
```

`kernel.js` was generated from a hand-written WebAssembly build script that is also not included here.

## Layout

```
index.html
style.css
data.js       item + enchantment tables (port of Items.java, Enchantments.java)
enchant.js    java.util.Random and the enchanting table simulation
rngevents.js  what advances or resets the player RNG
kernel.js     WebAssembly brute-force kernel, base64 embedded
cracker.js    worker pool, sweep orchestration, player RNG recovery
planner.js    throw / bookshelf / slot search
worker.js     scan worker
hintpicker.js type-ahead picker for the enchantment hints
ui.js         the interface
tests/        run.js, e2e.js, golden.json
```

Every file above except `tests/` lives at the repository root and is required.

## What it will not do

Enchanting has to be vanilla. Plugins, mods or datapacks that touch enchantment
tags will make the numbers disagree and the search will come back empty. Version
matters too — 1.14 shipped both an enchantment nerf and a bug that let the four
protection enchantments stack, and both are modelled, so pick the right bracket.

Anything else that uses your player's randomness desynchronises the throw count:
XP orbs, damage, food, anvils, equipping armour, Unbreaking ticking, crossbows,
Mending, Frost Walker, Soul Speed, sprinting, swimming, a shoulder parrot, an
advancement. If a later crack disagrees with the prediction the tool drops the RNG
state instead of lying about it.

## Credit

The method, the reverse engineering and every table here are the work of
**Earthcomputer**, with speed and UI work by **Hexicube**:

- [EnchantmentCracker](https://github.com/Earthcomputer/EnchantmentCracker) — the desktop tool this ports
- [clientcommands](https://github.com/Earthcomputer/clientcommands) — the same thing as a client-side mod, via `/cenchant`

If you are willing to run a mod, use clientcommands instead. It reads the numbers
itself, so there is nothing to mistype.
