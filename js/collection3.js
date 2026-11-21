// Collection 3: radial mandalas
// Authored artworks registered into the shared catalog. Deterministic only.
import { Builder, ring, fillRings, fold, inDisc, polar, GEMS, CATALOG, LEVEL, SQ3, square } from './artworks.js';
import { rng, alongCurve, alongPoly, hexPack, orbitPack, pascalMod, hexPlate } from './collection2.js';

const TAU = Math.PI * 2;
const PI = Math.PI;

// ---------------------------------------------------------------- helpers
// fillRings clipped to the outer radius with k-fold row counts.
const band = (b, R0, R1, size, fn, k, o = {}) => fillRings(b, R0, R1, size, fn, { limit: inDisc(R1), sym: k, rowGap: 1.09, ...o });
// angular distance from th to the nearest axis rot + j * TAU / n (0 .. PI / n)
const off = (th, n, rot = 0) => { const s = TAU / n, t = ((((th - rot) % s) + s) % s); return Math.min(t, s - t); };
// boundary radius of an n-pointed star (points at rot + j * TAU / n) along direction th
function starR(th, n, Ro, Ri, rot = 0) {
  const phi = off(th, n, rot), a = PI / n;
  const x2 = Ri * Math.cos(a), y2 = Ri * Math.sin(a);
  return (Ro * y2) / (y2 * Math.cos(phi) - (x2 - Ro) * Math.sin(phi));
}
const starPts = (n, Ro, Ri, rot = 0) => Array.from({ length: 2 * n }, (_, k) => polar(k % 2 ? Ri : Ro, rot + (k * PI) / n));
const polyPts = (n, R, rot = 0) => Array.from({ length: n }, (_, k) => polar(R, rot + (k * TAU) / n));
// regular polygon boundary radius (vertices at rot + j * TAU / n)
const polyR = (th, n, R, rot = 0) => (R * Math.cos(PI / n)) / Math.cos(PI / n - off(th, n, rot));
// Draw one sector (axis pointing up, along -y) and repeat it k times round the centre.
function rotK(b, k, draw, start = 0) {
  for (let j = 0; j < k; j++) {
    const a = start + (j * TAU) / k, c = Math.cos(a), s = Math.sin(a);
    draw((shape, x, y, w, h, r, p, o) => b.add(shape, x * c - y * s, x * s + y * c, w, h, r + a, p, o), j);
  }
}
// n gems evenly along a circular arc round (cx, cy), angles a0..a1 in polar convention.
function arc(put, cx, cy, rad, a0, a1, n, shape, w, h, p, o = {}, turn = 0) {
  for (let i = 0; i < n; i++) {
    const a = n === 1 ? (a0 + a1) / 2 : a0 + ((a1 - a0) * i) / (n - 1);
    const [dx, dy] = polar(rad, a);
    put(shape, cx + dx, cy + dy, w, h, a + turn, typeof p === 'function' ? p(i) : p, o);
  }
}
const alt = (a, c) => (i) => (i % 2 ? c : a);
const lo = { force: false, gap: 0.4 };

// ================================================================ Beginner
function saffronChakra() {
  const b = new Builder();
  const P = { tan: 0, cit: 1, honey: 2, cream: 3, garnet: 4, amber: 5 };
  b.add('round', 0, 0, 60, 60, 0, P.garnet, { force: true });
  ring(b, 50, 10, 'teardrop', 16, 28, P.cit);
  ring(b, 47, 10, 'round', 12, 12, P.cream, { phase: 0.5, ...lo });
  rotK(b, 10, (put) => {
    [[88, 18, 30, P.amber], [122, 16, 28, P.honey], [154, 16, 26, P.amber], [185, 14, 24, P.honey]]
      .forEach(([r, w, h, p]) => put('rhombus', 0, -r, w, h, 0, p, { force: true }));
  });
  ring(b, 130, 10, 'teardrop', 30, 58, P.tan, { phase: 0.5 });
  ring(b, 86, 10, 'round', 14, 14, P.cream, { phase: 0.5, ...lo });
  ring(b, 180, 10, 'round', 18, 18, P.cit, { phase: 0.5, ...lo });
  ring(b, 218, 40, 'round', 20, 20, alt(P.cit, P.garnet), lo);
  ring(b, 252, 20, 'teardrop', 22, 40, alt(P.amber, P.tan), lo);
  ring(b, 250, 20, 'round', 12, 12, P.cream, { phase: 0.5, ...lo });
  ring(b, 288, 60, 'round', 16, 16, alt(P.garnet, P.honey), lo);
  return { b, palette: ['tangerine', 'citrine', 'honey', 'cream', 'garnet', 'amber'], plate: { type: 'circle', r: 308 } };
}

function heptagonBloom() {
  const b = new Builder();
  const P = { plum: 0, violet: 1, orch: 2, lav: 3, cit: 4, pearl: 5 };
  b.add('round', 0, 0, 54, 54, 0, P.cit, { force: true });
  ring(b, 46, 7, 'teardrop', 20, 34, P.orch);
  ring(b, 44, 7, 'round', 12, 12, P.pearl, { phase: 0.5, ...lo });
  ring(b, 100, 7, 'marquise', 30, 66, P.violet, { phase: 0.5 });
  ring(b, 92, 7, 'teardrop', 22, 40, P.lav);
  ring(b, 126, 7, 'round', 14, 14, P.pearl, lo);
  ring(b, 158, 28, 'round', 18, 18, alt(P.cit, P.plum), lo);
  alongPoly(b, polyPts(7, 210), 17, 'round', 14, 14, P.orch);
  ring(b, 240, 7, 'teardrop', 26, 46, P.violet);
  ring(b, 222, 7, 'round', 20, 20, P.lav, { phase: 0.5, ...lo });
  ring(b, 280, 56, 'round', 18, 18, alt(P.plum, P.lav), lo);
  return { b, palette: ['plum', 'violet', 'orchid', 'lavender', 'citrine', 'pearl'], plate: { type: 'circle', r: 300 } };
}

function peridotPentad() {
  const b = new Builder();
  const P = { forest: 0, per: 1, lime: 2, olive: 3, gold: 4 };
  b.add('round', 0, 0, 50, 50, 0, P.gold, { force: true });
  ring(b, 70, 5, 'rhombus', 36, 84, P.per);
  ring(b, 64, 5, 'rhombus', 24, 56, P.forest, { phase: 0.5 });
  ring(b, 120, 10, 'round', 14, 14, P.olive, { phase: 0.5, ...lo });
  ring(b, 128, 5, 'round', 18, 18, P.gold, lo);
  ring(b, 103, 5, 'round', 14, 14, P.gold, { phase: 0.5, ...lo });
  ring(b, 180, 5, 'teardrop', 30, 54, P.per);
  alongPoly(b, starPts(5, 228, 140), 18, 'round', 14, 14, P.lime);
  ring(b, 200, 5, 'marquise', 22, 46, P.olive, { phase: 0.5, ...lo });
  ring(b, 262, 50, 'round', 20, 20, alt(P.forest, P.lime), lo);
  return { b, palette: ['forest', 'peridot', 'lime', 'olive', 'gold'], plate: { type: 'circle', r: 284 } };
}

function coralScallop() {
  const b = new Builder();
  const P = { teal: 0, tq: 1, coral: 2, peach: 3, cream: 4 };
  b.add('round', 0, 0, 56, 56, 0, P.coral, { force: true });
  ring(b, 48, 9, 'teardrop', 18, 30, P.peach);
  ring(b, 50, 9, 'round', 12, 12, P.cream, { phase: 0.5, ...lo });
  ring(b, 98, 9, 'marquise', 24, 56, P.tq, { phase: 0.5 });
  ring(b, 86, 9, 'round', 18, 18, P.teal);
  rotK(b, 9, (put) => {
    put('round', 0, -168, 26, 26, 0, P.coral, { force: true });
    for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6, [dx, dy] = polar(30, a); put('teardrop', dx, -168 + dy, 14, 24, a, P.peach, { force: true }); }
    arc(put, 0, -168, 54, -1.45, 1.45, 11, 'round', 14, 14, P.teal, { force: true });
  });
  ring(b, 210, 9, 'teardrop', 16, 28, P.tq, { phase: 0.5, ...lo });
  ring(b, 132, 9, 'round', 14, 14, P.cream, { phase: 0.5, ...lo });
  return { b, palette: ['teal', 'turquoise', 'coral', 'peach', 'cream'], plate: { type: 'circle', r: 246 } };
}

function cobaltFacetRings() {
  const b = new Builder();
  const P = { onyx: 0, sil: 1, cob: 2, ice: 3, cry: 4, sky: 5 };
  const D = PI / 4;
  b.add('round', 0, 0, 40, 40, 0, P.cob, { force: true });
  ring(b, 44, 16, 'square', 12, 12, P.ice);
  ring(b, 74, 16, 'square', 20, 20, alt(P.cob, P.onyx));
  ring(b, 106, 16, 'square', 22, 22, P.cry, { twist: D });
  ring(b, 140, 32, 'square', 18, 18, alt(P.sky, P.cob));
  ring(b, 174, 32, 'square', 18, 18, alt(P.onyx, P.sil), { twist: D });
  ring(b, 214, 32, 'square', 26, 26, alt(P.cry, P.cob), { twist: D });
  ring(b, 250, 64, 'square', 17, 17, (i) => (i % 4 === 0 ? P.sil : i % 2 ? P.cob : P.onyx), lo);
  ring(b, 286, 32, 'square', 22, 22, alt(P.sky, P.onyx), { twist: D, ...lo });
  return { b, palette: ['onyx', 'silver', 'cobalt', 'ice', 'crystal', 'sky'], plate: { type: 'circle', r: 318 } };
}

// ================================================================ Medium
function pearlDoily() {
  const b = new Builder();
  const P = { plum: 0, pearl: 1, blush: 2, mauve: 3, rose: 4 };
  b.add('round', 0, 0, 44, 44, 0, P.rose, { force: true });
  ring(b, 40, 18, 'round', 11, 11, P.pearl);
  ring(b, 76, 18, 'marquise', 14, 40, P.blush);
  rotK(b, 18, (put) => {
    put('round', 0, -126, 14, 14, 0, P.rose, { force: true });
    arc(put, 0, -126, 16, -1.9, 1.9, 6, 'round', 9, 9, P.mauve, { force: true });
  });
  ring(b, 162, 36, 'teardrop', 12, 22, alt(P.rose, P.mauve));
  rotK(b, 18, (put) => {
    put('teardrop', 0, -214, 16, 28, 0, P.blush, { force: true });
    arc(put, 0, -210, 30, -1.65, 1.65, 10, 'round', 9.5, 9.5, P.plum, { force: true });
  }, PI / 18);
  ring(b, 194, 18, 'round', 12, 12, P.rose, lo);
  ring(b, 258, 72, 'round', 10, 10, alt(P.rose, P.pearl), lo);
  rotK(b, 36, (put) => arc(put, 0, -274, 13, -1.6, 1.6, 4, 'round', 9, 9, P.plum, { force: true }), PI / 36);
  return { b, palette: ['plum', 'pearl', 'blush', 'mauve', 'rose'], plate: { type: 'circle', r: 306 } };
}

function chevronCrown() {
  const b = new Builder();
  const P = { sap: 0, gold: 1, cream: 2, mid: 3, sky: 4 };
  b.add('round', 0, 0, 50, 50, 0, P.gold, { force: true });
  ring(b, 44, 14, 'teardrop', 14, 26, P.cream);
  ring(b, 70, 14, 'round', 12, 12, P.sky, { phase: 0.5 });
  band(b, 86, 198, 18, (r, th) => {
    const u = (r - 86) / 112, f = fold(th, 7);
    const h = 0.12 + 0.8 * f;
    if (Math.abs(u - h) < 0.12) return P.sky;
    return u < h ? P.gold : P.mid;
  }, 14);
  ring(b, 214, 28, 'round', 14, 14, alt(P.sap, P.cream));
  band(b, 226, 282, 16, (r, th) => {
    const v = (r - 226) / 56, g = fold(th + PI / 7, 7);
    if (Math.abs(v - g) < 0.2) return P.cream;
    return v < g ? P.sap : P.mid;
  }, 14);
  ring(b, 300, 28, 'teardrop', 18, 34, alt(P.gold, P.sap), lo);
  ring(b, 298, 28, 'round', 10, 10, P.cream, { phase: 0.5, ...lo });
  ring(b, 330, 56, 'round', 14, 14, alt(P.mid, P.gold), lo);
  return { b, palette: ['sapphire', 'gold', 'cream', 'midnight', 'sky'], plate: { type: 'circle', r: 350 } };
}

// Checker band with radially aligned cells: each row has cells * m gems.
function checkerBand(b, R0, R1, size, cells, rows, colour, shape = 'round') {
  for (let r = R0 + size / 2, j = 0; r <= R1 - size / 2 + 0.01; r += size * 1.06, j++) {
    const m = Math.max(1, Math.floor((TAU * r) / (cells * size * 1.08))), n = cells * m;
    for (let i = 0; i < n; i++) {
      const th = ((i + 0.5) / n) * TAU, [x, y] = polar(r, th);
      b.add(shape, x, y, size, size, th, colour((Math.floor(i / m) + Math.floor(j / rows)) % 2, j, i % m, m), { force: true });
    }
  }
}

function checkeredHalo() {
  const b = new Builder();
  const P = { onyx: 0, cry: 1, ruby: 2, garnet: 3, champ: 4, sil: 5 };
  b.add('round', 0, 0, 56, 56, 0, P.ruby, { force: true });
  ring(b, 54, 20, 'teardrop', 12, 24, P.champ);
  ring(b, 86, 20, 'round', 14, 14, alt(P.cry, P.garnet));
  checkerBand(b, 100, 180, 18, 20, 2, (c) => (c ? P.onyx : P.sil), 'square');
  ring(b, 196, 40, 'round', 14, 14, alt(P.ruby, P.champ));
  checkerBand(b, 208, 284, 17, 40, 2, (c) => (c ? P.garnet : P.champ), 'square');
  ring(b, 296, 40, 'teardrop', 16, 30, P.ruby, lo);
  ring(b, 294, 40, 'round', 10, 10, P.onyx, { phase: 0.5, ...lo });
  ring(b, 328, 60, 'round', 14, 14, alt(P.onyx, P.sil), lo);
  return { b, palette: ['onyx', 'crystal', 'ruby', 'garnet', 'champagne', 'silver'], plate: { type: 'circle', r: 346 } };
}

function topazCorona() {
  const b = new Builder();
  const P = { topaz: 0, amber: 1, honey: 2, cream: 3, choc: 4, cit: 5 };
  b.add('round', 0, 0, 48, 48, 0, P.cit, { force: true });
  ring(b, 44, 11, 'teardrop', 14, 26, P.amber);
  ring(b, 46, 11, 'round', 10, 10, P.cream, { phase: 0.5, ...lo });
  ring(b, 84, 11, 'teardrop', 24, 44, P.topaz, { phase: 0.5 });
  ring(b, 80, 11, 'round', 12, 12, P.honey, lo);
  ring(b, 116, 22, 'round', 14, 14, alt(P.choc, P.cit), lo);
  ring(b, 148, 22, 'teardrop', 20, 38, alt(P.topaz, P.amber), lo);
  ring(b, 182, 44, 'round', 12, 12, alt(P.choc, P.cit), lo);
  ring(b, 216, 33, 'teardrop', 22, 42, (i) => (i % 3 === 0 ? P.amber : P.topaz), lo);
  ring(b, 212, 33, 'round', 10, 10, P.choc, { phase: 0.5, ...lo });
  ring(b, 250, 66, 'round', 13, 13, alt(P.honey, P.cit), lo);
  ring(b, 282, 44, 'teardrop', 20, 38, alt(P.choc, P.amber), lo);
  ring(b, 278, 44, 'round', 10, 10, P.cit, { phase: 0.5, ...lo });
  ring(b, 316, 88, 'round', 13, 13, alt(P.choc, P.topaz), lo);
  return { b, palette: ['topaz', 'amber', 'honey', 'cream', 'chocolate', 'citrine'], plate: { type: 'circle', r: 336 } };
}

function jadeConstellation() {
  const b = new Builder();
  const P = { jade: 0, forest: 1, mint: 2, gold: 3, cream: 4, teal: 5 };
  b.add('round', 0, 0, 50, 50, 0, P.gold, { force: true });
  ring(b, 46, 10, 'marquise', 14, 34, P.jade);
  ring(b, 68, 10, 'round', 12, 12, P.cream, { phase: 0.5, ...lo });
  ring(b, 92, 10, 'teardrop', 18, 34, P.teal, { phase: 0.5 });
  ring(b, 86, 10, 'round', 12, 12, P.mint, lo);
  for (let k = 0; k < 5; k++) {
    const st = (k * TAU) / 5, [cx, cy] = polar(206, st);
    b.add('round', cx, cy, 30, 30, 0, P.gold, { force: true });
    ring(b, 30, 8, 'marquise', 12, 30, P.jade, { cx, cy, start: st });
    ring(b, 50, 16, 'round', 12, 12, alt(P.forest, P.mint), { cx, cy, start: st });
    ring(b, 70, 16, 'teardrop', 13, 24, P.teal, { cx, cy, start: st, phase: 0.5 });
  }
  ring(b, 160, 5, 'teardrop', 26, 48, P.gold, { phase: 0.5 });
  ring(b, 128, 5, 'round', 16, 16, P.cream, { phase: 0.5, ...lo });
  ring(b, 232, 5, 'marquise', 20, 46, P.forest, { phase: 0.5, ...lo });
  ring(b, 304, 60, 'round', 16, 16, alt(P.forest, P.mint), lo);
  ring(b, 326, 30, 'teardrop', 16, 28, P.jade, lo);
  return { b, palette: ['jade', 'forest', 'mint', 'gold', 'cream', 'teal'], plate: { type: 'circle', r: 352 } };
}

function honeycombBloom() {
  const b = new Builder();
  const P = { honey: 0, amber: 1, cit: 2, cream: 3, choc: 4, lemon: 5 };
  const N = 3, s = 17, gw = SQ3 * s * 0.92, gh = 2 * s * 0.92;
  for (let r = -N; r <= N; r++) for (let q = -N; q <= N; q++) {
    const z = -q - r, d = Math.max(Math.abs(q), Math.abs(r), Math.abs(z)), m = Math.min(Math.abs(q), Math.abs(r), Math.abs(z));
    if (d > N) continue;
    const p = d === 0 ? P.cit : d === 1 ? P.amber : d === 2 ? P.cream : m === 0 ? P.choc : P.honey;
    b.add('hexagon', s * SQ3 * (q + r / 2), s * 1.5 * r, gw, gh, 0, p, { force: true });
  }
  ring(b, 140, 12, 'rhombus', 26, 60, alt(P.amber, P.choc));
  ring(b, 124, 12, 'round', 14, 14, P.lemon, { phase: 0.5, ...lo });
  ring(b, 202, 24, 'marquise', 18, 48, alt(P.cit, P.amber), lo);
  ring(b, 196, 24, 'round', 12, 12, P.choc, { phase: 0.5, ...lo });
  ring(b, 250, 36, 'hexagon', 22, 26, (i) => (i % 3 === 0 ? P.choc : P.honey), lo);
  ring(b, 284, 72, 'round', 14, 14, alt(P.cream, P.amber), lo);
  return { b, palette: ['honey', 'amber', 'citrine', 'cream', 'chocolate', 'lemon'], plate: { type: 'circle', r: 304 } };
}

// ================================================================ Intricate
function marquiseFans() {
  const b = new Builder();
  const P = { teal: 0, tq: 1, aqua: 2, gold: 3, mid: 4, cream: 5 };
  b.add('round', 0, 0, 56, 56, 0, P.gold, { force: true });
  ring(b, 52, 12, 'marquise', 16, 40, P.aqua);
  ring(b, 54, 12, 'round', 10, 10, P.cream, { phase: 0.5, ...lo });
  rotK(b, 12, (put) => {
    put('round', 0, -92, 16, 16, 0, P.gold, { force: true });
    for (const a of [-0.5, 0, 0.5]) { const [dx, dy] = polar(40, a); put('marquise', dx, -92 + dy, 15, 56, a, a ? P.tq : P.cream, { force: true }); }
  });
  rotK(b, 24, (put) => {
    put('round', 0, -214, 13, 13, 0, P.gold, { force: true });
    for (const a of [-0.45, 0, 0.45]) { const [dx, dy] = polar(30, a); put('marquise', dx, -214 + dy, 12, 44, a, a ? P.teal : P.aqua, { force: true }); }
  }, PI / 24);
  band(b, 30, 312, 13, (r, th) => {
    if (r > 290) return P.mid;
    if (r < 176) return fold(th, 12) > 0.5 ? P.mid : P.teal;
    return r < 196 ? P.cream : P.mid;
  }, 24);
  ring(b, 330, 48, 'teardrop', 16, 30, alt(P.gold, P.tq), lo);
  ring(b, 328, 48, 'round', 10, 10, P.cream, { phase: 0.5, ...lo });
  ring(b, 360, 96, 'round', 12, 12, alt(P.mid, P.aqua), lo);
  return { b, palette: ['teal', 'turquoise', 'aqua', 'gold', 'midnight', 'cream'], plate: { type: 'circle', r: 380 } };
}

function sunsetDome() {
  const b = new Builder();
  const P = { burg: 0, scar: 1, tan: 2, cit: 3, cream: 4, choc: 5, peach: 6 };
  b.add('round', 0, 0, 60, 60, 0, P.cit, { force: true });
  ring(b, 52, 10, 'teardrop', 18, 32, P.cream);
  ring(b, 54, 10, 'round', 12, 12, P.scar, { phase: 0.5, ...lo });
  const dome = (th, R, ph) => R + 40 * Math.sqrt(Math.max(0, 1 - (1 - fold(th + ph, 10)) ** 2));
  const fills = [P.peach, P.scar, P.cit, P.burg, P.tan, P.choc];
  const lines = [P.burg, P.cream, P.burg, P.cream, P.burg];
  band(b, 76, 340, 17, (r, th) => {
    const bs = [dome(th, 84, 0), dome(th, 140, PI / 10), dome(th, 196, 0), dome(th, 252, PI / 10), 318];
    for (let k = 0; k < bs.length; k++) {
      if (r < bs[k] - 7) return fills[k];
      if (r < bs[k] + 7) return lines[k];
    }
    return fills[5];
  }, 10, { gap: 1.1 });
  ring(b, 360, 40, 'teardrop', 18, 32, alt(P.tan, P.scar), lo);
  ring(b, 358, 40, 'round', 10, 10, P.cream, { phase: 0.5, ...lo });
  ring(b, 390, 80, 'round', 13, 13, alt(P.choc, P.cit), lo);
  return { b, palette: ['burgundy', 'scarlet', 'tangerine', 'citrine', 'cream', 'chocolate', 'peach'], plate: { type: 'circle', r: 410 } };
}

function turquoiseArcade() {
  const b = new Builder();
  const P = { tq: 0, teal: 1, cream: 2, sand: 3, copper: 4, mid: 5 };
  b.add('round', 0, 0, 54, 54, 0, P.copper, { force: true });
  ring(b, 48, 12, 'marquise', 12, 30, P.tq);
  ring(b, 76, 24, 'round', 12, 12, alt(P.cream, P.copper));
  // arch: s = lateral offset from the arch axis (0..1 of half a bay)
  const arch = (s, r, w, r0, spring, crown) => {
    if (r < r0 || s > w) return 0;
    const top = spring + (crown - spring) * Math.sqrt(Math.max(0, 1 - (s / w) ** 2));
    if (r > top + 8) return 0;
    return r > top - 8 || s > w - 0.16 ? 2 : 1;
  };
  band(b, 90, 344, 17, (r, th) => {
    if (r > 330) return P.copper;
    const s1 = 1 - fold(th + PI / 12, 12), s2 = 1 - fold(th, 24);
    const a1 = arch(s1, r, 0.72, 92, 168, 236), a2 = arch(s2, r, 0.7, 258, 290, 322);
    if (a1 === 2 || a2 === 2) return P.copper;
    if (a1 === 1) return r < 130 ? P.sand : r < 180 ? P.tq : P.teal;
    if (a2 === 1) return P.sand;
    if (r > 242 && r < 256) return P.tq;
    return P.mid;
  }, 24);
  ring(b, 360, 48, 'teardrop', 16, 28, alt(P.tq, P.sand), lo);
  ring(b, 386, 96, 'round', 12, 12, alt(P.mid, P.copper), lo);
  return { b, palette: ['turquoise', 'teal', 'cream', 'sand', 'copper', 'midnight'], plate: { type: 'circle', r: 406 } };
}

function rhombusCrown() {
  const b = new Builder();
  const P = { tanz: 0, peri: 1, lav: 2, ind: 3, cry: 4, mid: 5, gold: 6 };
  b.add('round', 0, 0, 34, 34, 0, P.gold, { force: true });
  ring(b, 62, 10, 'rhombus', 24, 70, P.cry);
  ring(b, 112, 10, 'rhombus', 30, 80, P.lav, { phase: 0.5 });
  ring(b, 168, 20, 'rhombus', 24, 66, alt(P.peri, P.cry), { phase: 0.5 });
  ring(b, 230, 20, 'rhombus', 28, 74, alt(P.lav, P.tanz));
  ring(b, 296, 40, 'rhombus', 18, 52, alt(P.peri, P.lav), { phase: 0.5 });
  const ground = (r) => (r < 200 ? P.mid : P.ind);
  band(b, 20, 322, 13, ground, 10);
  band(b, 20, 322, 8.5, ground, 10, { gap: 1.12 });
  ring(b, 336, 40, 'teardrop', 16, 30, alt(P.gold, P.tanz), lo);
  ring(b, 334, 40, 'round', 10, 10, P.cry, { phase: 0.5, ...lo });
  ring(b, 364, 80, 'round', 13, 13, alt(P.ind, P.lav), lo);
  return { b, palette: ['tanzanite', 'periwinkle', 'lavender', 'indigo', 'crystal', 'midnight', 'gold'], plate: { type: 'circle', r: 384 } };
}

function jadeDiamondWheel() {
  const b = new Builder();
  const P = { forest: 0, em: 1, jade: 2, mint: 3, gold: 4, cream: 5 };
  b.add('round', 0, 0, 56, 56, 0, P.gold, { force: true });
  ring(b, 50, 12, 'teardrop', 14, 26, P.mint);
  const k = 12, c = k / TAU;
  band(b, 72, 330, 17, (r, th) => {
    const u = th * c, v = Math.log(r / 72) * c, a = u + v, w = u - v;
    const da = Math.abs(a - Math.round(a)), dw = Math.abs(w - Math.round(w));
    const cell = (r / c) * 0.7; // world size of one lattice unit (approx)
    if (Math.min(da, dw) * cell < 5) return P.gold;
    const ring = Math.floor(a) + Math.floor(w);
    const level = Math.floor(v + 0.5);
    if ((ring & 1) === 0) return level < 1 ? P.em : P.forest;
    return level < 1 ? P.jade : P.mint;
  }, 12);
  ring(b, 350, 48, 'teardrop', 16, 30, alt(P.gold, P.em), lo);
  ring(b, 348, 48, 'round', 10, 10, P.cream, { phase: 0.5, ...lo });
  ring(b, 380, 96, 'round', 12, 12, alt(P.forest, P.jade), lo);
  return { b, palette: ['forest', 'emerald', 'jade', 'mint', 'gold', 'cream'], plate: { type: 'circle', r: 400 } };
}

// ================================================================ Expert
function heptagramRose() {
  const b = new Builder();
  const P = { ruby: 0, garnet: 1, gold: 2, cream: 3, rose: 4, mid: 5, blush: 6 };
  b.add('round', 0, 0, 52, 52, 0, P.gold, { force: true });
  ring(b, 46, 7, 'teardrop', 18, 32, P.ruby);
  ring(b, 50, 7, 'round', 12, 12, P.cream, { phase: 0.5, ...lo });
  ring(b, 80, 14, 'round', 12, 12, alt(P.blush, P.gold));
  band(b, 92, 328, 14, (r, th) => {
    if (r > 314) return P.garnet;
    const dA = starR(th, 7, 312, 150) - r;
    if (dA >= 0) return dA < 13 ? P.gold : r < 150 ? P.garnet : P.ruby;
    const dB = starR(th, 7, 282, 196, PI / 7) - r;
    if (dB >= 0) return dB < 13 ? P.gold : P.rose;
    return P.mid;
  }, 7);
  ring(b, 346, 42, 'teardrop', 16, 30, alt(P.gold, P.ruby), lo);
  ring(b, 344, 42, 'round', 10, 10, P.cream, { phase: 0.5, ...lo });
  ring(b, 374, 84, 'round', 12, 12, alt(P.garnet, P.blush), lo);
  return { b, palette: ['ruby', 'garnet', 'gold', 'cream', 'rose', 'midnight', 'blush'], plate: { type: 'circle', r: 394 } };
}

function roseChakra() {
  const b = new Builder();
  const P = { rose: 0, fu: 1, blush: 2, gold: 3, plum: 4, cream: 5, burg: 6 };
  b.add('round', 0, 0, 64, 64, 0, P.gold, { force: true });
  ring(b, 56, 20, 'teardrop', 12, 22, P.fu);
  ring(b, 84, 20, 'round', 14, 14, P.cream);
  band(b, 96, 228, 14, (r, th) => {
    const f = fold(th, 10), u = (r - 96) / 132;
    if (f < 0.12) return P.gold;
    const h = 0.95 * Math.sin(PI * f) ** 0.7;
    if (u < h - 0.14) return u < 0.5 ? P.rose : P.blush;
    if (u < h) return P.gold;
    return P.burg;
  }, 20);
  ring(b, 239, 60, 'round', 16, 16, alt(P.gold, P.plum), lo);
  band(b, 250, 382, 15, (r, th) => {
    const f = fold(th + PI / 20, 20), u = (r - 250) / 132;
    const h = 0.15 + 0.8 * Math.sqrt(1 - (1 - f) ** 2);
    if (u < h - 0.13) return u < 0.45 ? P.fu : P.rose;
    if (u < h) return P.blush;
    return P.plum;
  }, 20);
  ring(b, 400, 40, 'teardrop', 18, 32, alt(P.gold, P.rose), lo);
  ring(b, 398, 40, 'round', 10, 10, P.cream, { phase: 0.5, ...lo });
  ring(b, 430, 80, 'round', 14, 14, alt(P.plum, P.blush), lo);
  return { b, palette: ['rose', 'fuchsia', 'blush', 'gold', 'plum', 'cream', 'burgundy'], plate: { type: 'circle', r: 450 } };
}

function byzantineDome() {
  const b = new Builder();
  const P = { gold: 0, sap: 1, mid: 2, cream: 3, teal: 4, ruby: 5, sky: 6 };
  b.add('round', 0, 0, 60, 60, 0, P.gold, { force: true });
  ring(b, 54, 18, 'marquise', 12, 32, P.sky);
  ring(b, 80, 18, 'round', 12, 12, P.cream, { phase: 0.5 });
  band(b, 90, 132, 13, (r, th) => (fold(th, 18) > 0.5 ? P.sky : P.sap), 18);
  ring(b, 144, 36, 'round', 14, 14, alt(P.gold, P.ruby));
  band(b, 154, 262, 13, (r, th) => {
    const s = 1 - fold(th, 18);
    const top = 206 + 44 * Math.sqrt(Math.max(0, 1 - (s / 0.8) ** 2));
    if (s > 0.8) return r > 250 ? P.mid : P.gold;
    if (r > top + 7) return P.mid;
    if (r > top - 7 || s > 0.66) return P.gold;
    return r < 190 ? P.teal : P.sap;
  }, 18);
  ring(b, 276, 72, 'round', 11, 11, alt(P.gold, P.ruby));
  // pendant scallops hanging from the rim
  band(b, 288, 392, 14, (r, th) => {
    if (r > 378) return P.gold;
    const s = 1 - fold(th + PI / 18, 18);
    const bot = 372 - 64 * Math.sqrt(Math.max(0, 1 - s * s));
    if (r < bot - 7) return P.mid;
    if (r < bot + 7) return P.gold;
    return r > 348 ? P.sap : P.sky;
  }, 36);
  ring(b, 416, 36, 'teardrop', 18, 34, P.ruby, lo);
  ring(b, 410, 36, 'round', 12, 12, P.sap, { phase: 0.5, ...lo });
  return { b, palette: ['gold', 'sapphire', 'midnight', 'cream', 'teal', 'ruby', 'sky'], plate: { type: 'circle', r: 454 } };
}

function lapisLacework() {
  const b = new Builder();
  const P = { cob: 0, mid: 1, ice: 2, cry: 3, sky: 4, gold: 5 };
  b.add('round', 0, 0, 50, 50, 0, P.gold, { force: true });
  ring(b, 44, 12, 'marquise', 12, 30, P.ice);
  const cups = [];
  const lace = (k, R, rad, span, n, sz, st, inner) => {
    for (let j = 0; j < k; j++) cups.push([...polar(R, st + (j * TAU) / k), rad]);
    rotK(b, k, (put) => { inner(put); arc(put, 0, -R, rad, -span, span, n, 'round', sz, sz, P.cry, { force: true }); }, st);
  };
  lace(12, 110, 22, 2.3, 9, 11, 0, (put) => put('round', 0, -110, 16, 16, 0, P.gold, { force: true }));
  lace(12, 200, 40, 1.8, 13, 11, PI / 12, (put) => {
    put('teardrop', 0, -206, 18, 32, 0, P.sky, { force: true });
    put('round', 0, -178, 12, 12, 0, P.ice, { force: true });
  });
  lace(24, 296, 30, 1.62, 10, 10, 0, (put) => put('round', 0, -296, 14, 14, 0, P.gold, { force: true }));
  band(b, 30, 336, 12, (r, th) => {
    const [x, y] = polar(r, th);
    if (cups.some(([cx, cy, rad]) => Math.hypot(x - cx, y - cy) < rad)) return P.cob;
    return r > 322 ? P.ice : P.mid;
  }, 24);
  ring(b, 352, 48, 'teardrop', 14, 26, alt(P.ice, P.gold), lo);
  ring(b, 378, 96, 'round', 12, 12, alt(P.mid, P.cry), lo);
  return { b, palette: ['cobalt', 'midnight', 'ice', 'crystal', 'sky', 'gold'], plate: { type: 'circle', r: 398 } };
}

// ================================================================ Master
function nineMoonRosette() {
  const b = new Builder();
  const P = { amber: 0, cit: 1, garnet: 2, cream: 3, teal: 4, mid: 5, gold: 6, honey: 7 };
  b.add('round', 0, 0, 70, 70, 0, P.gold, { force: true });
  ring(b, 60, 18, 'teardrop', 14, 26, P.garnet);
  ring(b, 92, 18, 'marquise', 14, 40, P.cit, { phase: 0.5 });
  ring(b, 90, 18, 'round', 12, 12, P.cream, lo);
  const sats = [];
  for (let k = 0; k < 9; k++) {
    const st = (k * TAU) / 9, [cx, cy] = polar(300, st); sats.push([cx, cy]);
    b.add('round', cx, cy, 34, 34, 0, P.garnet, { force: true });
    ring(b, 34, 9, 'teardrop', 14, 26, P.cit, { cx, cy, start: st });
    ring(b, 34, 9, 'round', 10, 10, P.cream, { cx, cy, start: st, phase: 0.5, ...lo });
    ring(b, 58, 18, 'marquise', 11, 28, alt(P.amber, P.gold), { cx, cy, start: st });
    ring(b, 80, 36, 'round', 11, 11, alt(P.cream, P.teal), { cx, cy, start: st });
  }
  band(b, 112, 540, 14, (r, th) => {
    const [x, y] = polar(r, th);
    const d = Math.min(...sats.map(([cx, cy]) => Math.hypot(x - cx, y - cy)));
    if (d < 104) return d < 92 ? P.mid : P.gold;
    if (r < 200) { const f = fold(th, 18); return f > 0.66 ? P.amber : f > 0.4 ? P.honey : P.garnet; }
    if (r < 412) return fold(th + PI / 9, 9) > 0.8 ? P.cit : P.teal;
    if (r < 424) return P.gold;
    if (r < 524) {
      const u = (r - 424) / 100, f = fold(th, 36);
      if (Math.abs(u - f) < 0.16) return P.cream;
      return u < f ? P.amber : P.garnet;
    }
    return P.mid;
  }, 18);
  ring(b, 558, 72, 'teardrop', 16, 30, alt(P.gold, P.garnet), lo);
  ring(b, 556, 72, 'round', 10, 10, P.cream, { phase: 0.5, ...lo });
  ring(b, 588, 144, 'round', 12, 12, alt(P.mid, P.amber), lo);
  return { b, palette: ['amber', 'citrine', 'garnet', 'cream', 'teal', 'midnight', 'gold', 'honey'], plate: { type: 'circle', r: 608 } };
}

function imperialDecagon() {
  const b = new Builder();
  const P = { mid: 0, tanz: 1, peri: 2, ice: 3, gold: 4, cry: 5, violet: 6, cob: 7 };
  b.add('round', 0, 0, 64, 64, 0, P.gold, { force: true });
  ring(b, 56, 10, 'teardrop', 20, 36, P.violet);
  ring(b, 58, 10, 'round', 12, 12, P.cry, { phase: 0.5, ...lo });
  ring(b, 96, 20, 'marquise', 14, 40, alt(P.peri, P.ice));
  band(b, 120, 520, 14, (r, th) => {
    // decagram core
    const dA = starR(th, 10, 300, 168) - r;
    if (r < 300 && dA >= 0) {
      if (dA < 13) return P.gold;
      const dB = polyR(th, 10, 200, PI / 10) - r;
      if (dB >= 0) return dB < 13 ? P.cry : (fold(th, 20) > 0.5 ? P.tanz : P.violet);
      return P.peri;
    }
    if (r < 318) return P.mid;
    if (r < 330) return P.gold;
    // lancet arches (20)
    if (r < 452) {
      const s = 1 - fold(th + PI / 20, 20);
      if (s > 0.74) return P.cob;
      const top = 390 + 50 * Math.sqrt(Math.max(0, 1 - (s / 0.74) ** 1.4));
      if (r > top + 7) return P.mid;
      if (r > top - 7 || s > 0.6) return P.ice;
      return r < 372 ? P.peri : P.tanz;
    }
    if (r < 462) return P.gold;
    return (Math.floor((th * 40) / TAU) + Math.floor((r - 462) / 26)) % 2 ? P.mid : P.cry;
  }, 20);
  ring(b, 540, 40, 'teardrop', 22, 40, alt(P.gold, P.violet), lo);
  ring(b, 536, 40, 'round', 12, 12, P.cry, { phase: 0.5, ...lo });
  ring(b, 576, 120, 'round', 13, 13, alt(P.mid, P.ice), lo);
  return { b, palette: ['midnight', 'tanzanite', 'periwinkle', 'ice', 'gold', 'crystal', 'violet', 'cobalt'], plate: { type: 'circle', r: 596 } };
}

export const ENTRIES = [
  { id: 'saffron-chakra', version: 1, name: 'Saffron Chakra', category: 'mandala', difficulty: 'Beginner', build: saffronChakra },
  { id: 'heptagon-bloom', version: 1, name: 'Heptagon Bloom', category: 'mandala', difficulty: 'Beginner', build: heptagonBloom },
  { id: 'peridot-pentad', version: 1, name: 'Peridot Pentad', category: 'mandala', difficulty: 'Beginner', build: peridotPentad },
  { id: 'coral-scallop', version: 1, name: 'Coral Scallop', category: 'mandala', difficulty: 'Beginner', build: coralScallop },
  { id: 'cobalt-facet-rings', version: 1, name: 'Cobalt Facet Rings', category: 'mandala', difficulty: 'Beginner', build: cobaltFacetRings },
  { id: 'pearl-doily', version: 1, name: 'Pearl Doily', category: 'mandala', difficulty: 'Medium', build: pearlDoily },
  { id: 'chevron-crown', version: 1, name: 'Chevron Crown', category: 'mandala', difficulty: 'Medium', build: chevronCrown },
  { id: 'checkered-halo', version: 1, name: 'Checkered Halo', category: 'mandala', difficulty: 'Medium', build: checkeredHalo },
  { id: 'topaz-corona', version: 1, name: 'Topaz Corona', category: 'mandala', difficulty: 'Medium', build: topazCorona },
  { id: 'jade-constellation', version: 1, name: 'Jade Constellation', category: 'mandala', difficulty: 'Medium', build: jadeConstellation },
  { id: 'honeycomb-bloom', version: 1, name: 'Honeycomb Bloom', category: 'mandala', difficulty: 'Medium', build: honeycombBloom },
  { id: 'marquise-fans', version: 1, name: 'Marquise Fans', category: 'mandala', difficulty: 'Intricate', build: marquiseFans },
  { id: 'sunset-dome', version: 1, name: 'Sunset Dome', category: 'mandala', difficulty: 'Intricate', build: sunsetDome },
  { id: 'turquoise-arcade', version: 1, name: 'Turquoise Arcade', category: 'mandala', difficulty: 'Intricate', build: turquoiseArcade },
  { id: 'rhombus-crown', version: 1, name: 'Tanzanite Crown', category: 'mandala', difficulty: 'Intricate', build: rhombusCrown },
  { id: 'jade-diamond-wheel', version: 1, name: 'Jade Diamond Wheel', category: 'mandala', difficulty: 'Intricate', build: jadeDiamondWheel },
  { id: 'heptagram-rose', version: 1, name: 'Heptagram Rose', category: 'mandala', difficulty: 'Expert', build: heptagramRose },
  { id: 'rose-chakra', version: 1, name: 'Rose Chakra', category: 'mandala', difficulty: 'Expert', build: roseChakra },
  { id: 'byzantine-dome', version: 1, name: 'Byzantine Dome', category: 'mandala', difficulty: 'Expert', build: byzantineDome },
  { id: 'lapis-lacework', version: 1, name: 'Lapis Lacework', category: 'mandala', difficulty: 'Expert', build: lapisLacework },
  { id: 'nine-moon-rosette', version: 1, name: 'Nine Moon Rosette', category: 'mandala', difficulty: 'Master', build: nineMoonRosette },
  { id: 'imperial-decagon', version: 1, name: 'Imperial Decagon', category: 'mandala', difficulty: 'Master', build: imperialDecagon },
];

CATALOG.push(...ENTRIES);
CATALOG.sort((a, c) => LEVEL[a.difficulty] - LEVEL[c.difficulty]);
