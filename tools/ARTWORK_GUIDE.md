# Authoring Lustra artworks

Lustra is a gem-by-number game: each artwork is a list of gem "sockets" (shape, position, size, rotation, palette number). Players fill sockets with faceted gems. Artworks must be **abstract geometric**: mandalas, rosettes, tilings, lattices, polygons, curves, spirals, packings, fractals. Never figurative (no animals, people, plants drawn as pictures, objects, jewelry, letters, logos, religious symbols).

## Where things live

- `js/artworks.js`: core toolkit + collection 1. Exports `Builder, ring, fillRings, fold, inDisc, polar, GEMS, CATALOG, LEVEL, SQ3, square`.
- `js/collection2.js`: more helpers + collection 2. Exports `rng, alongCurve, alongPoly, hexPack, orbitPack, pascalMod, hexPlate`. **Read it**: it has 18 complete, good examples (`petalClock`, `truchet`, `spirograph`, `roseCurve`, `shatteredPrism`, `sierpinski`, `carpet`, `cathedralRose`, `pascalSnowflake`, ...). Collection 1 examples are in `artworks.js` (`frostRosette`, `rubyTeardrop`, `emeraldMosaic`, `tumblingBlocks`, `seaGlass`, `vortex`, `roseWindow`, `kaleidoscope`, ...).
- `js/collection3.js`, `collection4.js`, `collection5.js`: new collections. Each defines generator functions and fills `export const ENTRIES = [...]`, which it pushes into `CATALOG`.

## Coordinates and shapes

- World units, origin (0, 0) at the artwork centre. Typical artwork radius 250 to 600. y points down.
- `polar(R, th)` uses th = 0 at the top, clockwise.
- Shapes: `round, oval, teardrop, marquise, square, rhombus, hexagon`. `w, h` are the bounding box of the unrotated gem; the long axis / teardrop tip points to local -y (up). `rot` rotates it clockwise (radians). For round use w = h. Hexagon is pointy-top; a regular hexagon has `w = h * 0.866`.
- `b.add(shape, x, y, w, h, rot, p, { force, gap, limit })`: adds a socket unless it collides with existing ones (circle approximation). `force: true` skips the collision test; use it **only** when you computed the layout to be non-overlapping (lattices, carefully spaced rings). `limit(x, y, r)` must return true to accept (e.g. `inDisc(R)`).
- `ring(b, R, n, shape, w, h, pal, { phase, orient: 'out'|'in'|'tan', force=true, twist, cx, cy, start })`: n gems evenly round a circle; `pal` is a number or `(i, th) => p`. Teardrops with `orient: 'out'` point outward.
- `fillRings(b, R0, R1, size, colorFn(r, th, row, i, n), { shape, gap, rowGap, limit, sym })`: concentric staggered rows filling an annulus, skipping collisions. **Always pass `sym: k`** (the symmetry order) so every row's gem count is a multiple of k; otherwise the lattice creates moiré and symmetric colour patterns look broken.
- `fold(th, k)`: 0 at sector edges, 1 at sector middle. Use it for k-fold mirrored colour patterns.
- `hexPack(b, pitch, N, size, fn(x, y) => p|null)`: round gems on a hex packing (forced). `alongCurve(b, f(t)=>[x,y], t0, t1, step, shape, w, h, pal(t,i,x,y))`: gems at even arc length along a curve, tangent-aligned, skipping collisions. `alongPoly(b, pts, step, shape, w, h, p)`. `orbitPack(b, {k, R, sizes, tries, seed, shapeOf, color})`: dihedral-symmetric greedy packing. `pascalMod(n, p)`: Pascal triangle mod p. `rng(seed)`: seeded PRNG. Never use `Math.random`.
- Plates: return `{ b, palette: [...gem keys], plate }` where plate is `{ type: 'circle', r }` or `{ type: 'poly', pts: [[x, y], ...] }` (e.g. `square(h)`, `hexPlate(R)`). The plate must enclose every gem with a margin of about 10 to 25 units.
- Palette: an array of **4 to 8** keys from `GEMS` (see the top of `artworks.js` and collection2: sapphire, royal, ice, aqua, midnight, crystal, silver, ruby, garnet, rose, blush, violet, emerald, forest, teal, mint, champagne, amethyst, lavender, plum, orchid, amber, citrine, coral, cream, honey, peach, copper, turquoise, sand, jade, sky, sunset, gold, pearl, indigo, fuchsia, lime, tangerine, lemon, olive, cobalt, periwinkle, mauve, burgundy, chocolate, slate, topaz, morganite, tanzanite, peridot, scarlet, opal, onyx). The palette index `p` you pass to `add` is the index into that array. Do **not** add new GEMS entries.

## Registering

```js
export const ENTRIES = [
  { id: 'unique-kebab-id', version: 1, name: 'Two Or Three Words', category: 'mandala' | 'geometric', difficulty: 'Beginner'|'Medium'|'Intricate'|'Expert'|'Master', build: myGenerator },
];
```

`category`: `mandala` for radial designs, `geometric` for lattices, tilings, curves and fractals that are not radial mandalas. Names must be unique across the whole catalog and evocative but plain (e.g. "Saffron Chakra", "Basalt Honeycomb"); no numbers like "Mandala 7".

## Gem-count ranges (enforced by the checker)

| Difficulty | Gems |
|---|---|
| Beginner | 80–260 (bold, few colours, big gems; smallest gem at least ~12) |
| Medium | 200–650 |
| Intricate | 450–1,100 |
| Expert | 900–1,900 |
| Master | 1,900–3,800 |

The smallest gem dimension must be at least 8 world units. Gem sizes within one artwork should form a clear hierarchy (feature gems, medium gems, fill gems), not random sizes.

## Quality bar (what reviewers look for)

1. **Reads at thumbnail size**: a strong, clear motif (star, rosette, rings, rays, lattice pattern) visible at 200 px. Avoid noise: colour bands must be at least 2 to 3 gems wide; avoid patterns that alias against the row lattice.
2. **Symmetry and order**: radial designs must be exactly symmetric (use `sym` in `fillRings`, mirrored colour functions, `ring`). Lattices must be centred.
3. **Dense and finished**: no large accidental empty patches or ragged gaps; negative space only when deliberate. Outer edges finished (a border ring or frame).
4. **Colour**: a coherent palette (one family plus accents), good value contrast between neighbouring regions, light and dark gems both present. Each palette colour should be used by a meaningful number of gems (at least about 8).
5. **Distinctness**: every artwork has a genuinely different structure from the others in the catalog (not a recolour or a small parameter tweak of another).
6. **Performance**: generation under ~300 ms (the checker flags over 400 ms).

## Verify

```bash
node tools/check.mjs collection3          # counts, overlaps, palette size, build time; "all ok" required
python3 -m http.server 8300 &             # pick your own port
node tools/sheet-shot.cjs 8300 collection3 /tmp/sheet3.png   # contact sheet of finished previews
```

Look at the contact sheet image (Read the PNG) and fix anything ugly, sparse, noisy, asymmetric or too similar. Iterate until every piece passes both the checker and your visual review.
