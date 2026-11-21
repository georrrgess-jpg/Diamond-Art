// Collection 2: curves, fractals, symmetric packings, carpets and the Master tier.
// Everything is deterministic (seeded PRNG), so socket ids stay stable.
import { Builder, ring, fillRings, fold, inDisc, polar, GEMS, CATALOG, LEVEL, SQ3, square } from './artworks.js';

const TAU = Math.PI * 2;

Object.assign(GEMS, {
  gold: { name: 'Gold', hex: '#d6a737' },
  pearl: { name: 'Pearl', hex: '#efe6ea', tones: ['#7f7079', '#b9aab3', '#e8dde3', '#f8f2f5', '#ffffff'] },
  indigo: { name: 'Indigo', hex: '#3b3fa0' },
  fuchsia: { name: 'Fuchsia', hex: '#c8307c' },
  lime: { name: 'Lime', hex: '#96c63c' },
});

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Place gems along a parametric curve at even arc-length spacing, aligned to the tangent.
export function alongCurve(b, f, t0, t1, step, shape, w, h, pal, { force = false, gap = 0.3, samples = 6000 } = {}) {
  let [px, py] = f(t0), acc = step, i = 0;
  for (let k = 1; k <= samples; k++) {
    const t = t0 + ((t1 - t0) * k) / samples;
    const [x, y] = f(t);
    const dx = x - px, dy = y - py;
    acc += Math.hypot(dx, dy);
    if (acc >= step) {
      acc = 0;
      const p = pal(t, i++, x, y);
      if (p != null) b.add(shape, x, y, w, h, Math.atan2(dx, -dy), p, { force, gap });
    }
    px = x; py = y;
  }
}

// Gems along the edges of a closed polygon.
export function alongPoly(b, pts, step, shape, w, h, p, opts = {}) {
  for (let e = 0; e < pts.length; e++) {
    const [ax, ay] = pts[e], [bx, by] = pts[(e + 1) % pts.length];
    const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      b.add(shape, ax + (bx - ax) * t, ay + (by - ay) * t, w, h, Math.atan2(bx - ax, -(by - ay)), p, { gap: 0.3, ...opts });
    }
  }
}

// Round gems on a hexagonal packing; fn(x, y) returns a palette index or null.
export function hexPack(b, pitch, N, size, fn, opts = {}) {
  const rowH = pitch * SQ3 / 2;
  for (let r = -N; r <= N; r++) for (let q = -N - Math.ceil(r / 2); q <= N - Math.floor(r / 2); q++) {
    const x = pitch * (q + r / 2), y = rowH * r;
    const p = fn(x, y);
    if (p != null) b.add('round', x, y, size, size, Math.atan2(x, -y), p, { force: true, ...opts });
  }
}

// Dihedral (k-fold, mirrored) greedy packing: each accepted gem is placed with its
// whole orbit of 2k copies, so the result is perfectly symmetric.
export function orbitPack(b, { k, R, sizes, tries, seed, shapeOf, color, gap = 0.6 }) {
  const rand = rng(seed), half = Math.PI / k;
  sizes.forEach((size, si) => {
    const n = tries[si];
    for (let t = 0; t < n; t++) {
      const r = Math.sqrt(rand()) * R, th = rand() * half;
      const { shape, w, h } = shapeOf(size, rand, r);
      if (r + Math.max(w, h) / 2 > R) continue;
      const orbit = [];
      for (let j = 0; j < k; j++) for (const m of [1, -1]) {
        const tt = m * th + (j * TAU) / k;
        const [x, y] = polar(r, tt);
        orbit.push([x, y, tt]);
      }
      const circ = orbit.map(([x, y, tt]) => b.circlesOf(shape, x, y, w, h, tt));
      if (b.collides(circ[0], gap)) continue;
      let bad = false;
      for (let o = 1; o < circ.length && !bad; o++)
        for (const [x1, y1, r1] of circ[0]) for (const [x2, y2, r2] of circ[o])
          if (Math.hypot(x1 - x2, y1 - y2) < r1 + r2 + gap) { bad = true; break; }
      if (bad) continue;
      const p = color(r, th, size, shape, rand);
      for (const [x, y, tt] of orbit) b.add(shape, x, y, w, h, tt, p, { force: true });
    }
  });
}

export function pascalMod(n, p) {
  const T = [[1]];
  for (let r = 1; r <= n; r++) {
    const row = [1];
    for (let q = 1; q < r; q++) row.push((T[r - 1][q - 1] + T[r - 1][q]) % p);
    row.push(1); T.push(row);
  }
  return T;
}

export const hexPlate = (R) => [0, 1, 2, 3, 4, 5].map((k) => [R * Math.cos((k * TAU) / 6), R * Math.sin((k * TAU) / 6)]);

// ---------------------------------------------------------------- Beginner
function petalClock() {
  const b = new Builder();
  const P = { sun: 0, cit: 1, coral: 2, cream: 3, honey: 4, cry: 5 };
  b.add('round', 0, 0, 60, 60, 0, P.cit, { force: true });
  ring(b, 96, 12, 'teardrop', 34, 60, P.sun);
  ring(b, 70, 12, 'round', 14, 14, P.cream, { phase: 0.5, force: false, gap: 0.4 });
  ring(b, 168, 24, 'marquise', 16, 44, P.coral);
  ring(b, 148, 24, 'round', 12, 12, P.cream, { phase: 0.5, force: false, gap: 0.4 });
  ring(b, 214, 48, 'round', 18, 18, (i) => (i % 2 ? P.honey : P.cit));
  ring(b, 258, 12, 'oval', 26, 44, P.sun);
  ring(b, 258, 12, 'rhombus', 18, 30, P.coral, { phase: 0.5 });
  ring(b, 258, 24, 'round', 10, 10, P.cry, { phase: 0.25, force: false, gap: 0.4 });
  return { b, palette: ['sunset', 'citrine', 'coral', 'cream', 'honey', 'crystal'], plate: { type: 'circle', r: 292 } };
}

function seedOfLife() {
  const b = new Builder();
  const P = { sky: 0, royal: 1, ice: 2, cry: 3, gold: 4 };
  b.add('round', 0, 0, 30, 30, 0, P.gold, { force: true });
  const centers = [[0, 0], ...[0, 1, 2, 3, 4, 5].map((k) => polar(80, (k * TAU) / 6))];
  centers.forEach(([cx, cy], c) => alongCurve(b, (t) => [cx + 80 * Math.cos(t), cy + 80 * Math.sin(t)], 0, TAU, 14.5, 'round', 12, 12,
    () => (c === 0 ? P.gold : c % 2 ? P.sky : P.royal)));
  ring(b, 46, 6, 'marquise', 14, 34, P.ice, { phase: 0.5, force: false, gap: 0.3 });
  ring(b, 120, 6, 'marquise', 14, 34, P.ice, { force: false, gap: 0.3 });
  ring(b, 138, 6, 'round', 14, 14, P.cry, { phase: 0.5, force: false, gap: 0.3 });
  ring(b, 196, 24, 'teardrop', 18, 32, (i) => (i % 2 ? P.gold : P.royal));
  ring(b, 226, 48, 'round', 12, 12, (i) => (i % 2 ? P.ice : P.cry), { force: false, gap: 0.4 });
  return { b, palette: ['sky', 'royal', 'ice', 'crystal', 'gold'], plate: { type: 'circle', r: 250 } };
}

// ---------------------------------------------------------------- Medium
function truchet() {
  const b = new Builder();
  const P = { em: 0, jade: 1, mint: 2, gold: 3, cream: 4 };
  const T = 90, n = 6, h = (T * n) / 2, rand = rng(7);
  const base = []; for (let k = 0; k < 9; k++) base.push(rand() < 0.5 ? 0 : 1);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const ii = Math.min(i, n - 1 - i), jj = Math.min(j, n - 1 - j);
    const o = base[ii * 3 + jj] ^ (i >= n / 2 ? 1 : 0) ^ (j >= n / 2 ? 1 : 0);
    const x0 = i * T - h, y0 = j * T - h;
    const corners = o ? [[x0 + T, y0], [x0, y0 + T]] : [[x0, y0], [x0 + T, y0 + T]];
    corners.forEach(([cx, cy], a) => {
      const sx = cx === x0 ? 1 : -1, sy = cy === y0 ? 1 : -1;
      for (let k = 0; k < 5; k++) {
        const ph = ((k + 0.5) / 5) * (Math.PI / 2);
        const x = cx + sx * (T / 2) * Math.cos(ph), y = cy + sy * (T / 2) * Math.sin(ph);
        b.add('round', x, y, 12, 12, 0, ((i + j + a) & 1) ? P.em : P.jade, { force: true });
      }
    });
    b.add('round', x0 + T / 2, y0 + T / 2, 14, 14, 0, P.mint, { force: true });
  }
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) b.add('square', i * T - h, j * T - h, 18, 18, Math.PI / 4, P.gold, { force: true });
  // small accents in the open quarter of each tile (away from the arcs)
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const ii = Math.min(i, n - 1 - i), jj = Math.min(j, n - 1 - j);
    const o = base[ii * 3 + jj] ^ (i >= n / 2 ? 1 : 0) ^ (j >= n / 2 ? 1 : 0);
    const x0 = i * T - h, y0 = j * T - h, free = o ? [[x0 + 14, y0 + 14], [x0 + T - 14, y0 + T - 14]] : [[x0 + T - 14, y0 + 14], [x0 + 14, y0 + T - 14]];
    for (const [x, y] of free) b.add('round', x, y, 10, 10, 0, P.cream, { gap: 0.3 });
  }
  return { b, palette: ['emerald', 'jade', 'mint', 'gold', 'cream'], plate: { type: 'poly', pts: square(h + 16) } };
}

function starQuilt() {
  const b = new Builder();
  const P = { ruby: 0, rose: 1, mid: 2, sky: 3, gold: 4, cream: 5 };
  const T = 110, n = 5, h = (T * n) / 2;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const cx = (i - 2) * T, cy = (j - 2) * T, pair = (i + j) & 1 ? [P.mid, P.sky] : [P.ruby, P.rose];
    ring(b, 26, 8, 'rhombus', 21, 52, (k) => pair[k % 2], { cx, cy });
    ring(b, 46, 8, 'round', 9, 9, P.cream, { cx, cy, phase: 0.5, force: false, gap: 0.3 });
  }
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) b.add('square', i * T - h, j * T - h, 26, 26, Math.PI / 4, P.gold, { force: true });
  for (let i = 0; i <= n; i++) for (let j = 0; j < n; j++) {
    b.add('round', i * T - h, j * T - h + T / 2, 18, 18, 0, P.cream, { force: true });
    b.add('round', j * T - h + T / 2, i * T - h, 18, 18, 0, P.cream, { force: true });
  }
  return { b, palette: ['ruby', 'rose', 'midnight', 'sky', 'gold', 'cream'], plate: { type: 'poly', pts: square(h + 20) } };
}

function twistedSquares() {
  const b = new Builder();
  const P = { ind: 0, royal: 1, sky: 2, ice: 3, cry: 4, fu: 5 };
  b.add('round', 0, 0, 34, 34, 0, P.fu, { force: true });
  const seq = [P.fu, P.ind, P.royal, P.sky, P.ice, P.cry, P.ice, P.sky, P.royal];
  for (let k = 0; k < 9; k++) {
    const hh = 30 + 26 * k, a = (k * 7.5 * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const pts = [[-hh, -hh], [hh, -hh], [hh, hh], [-hh, hh]].map(([x, y]) => [x * c - y * s, x * s + y * c]);
    alongPoly(b, pts, 20, 'square', 13, 13, seq[k]);
  }
  ring(b, 352, 64, 'round', 12, 12, (i) => (i % 2 ? P.fu : P.ind), { force: false, gap: 0.4 });
  return { b, palette: ['indigo', 'royal', 'sky', 'ice', 'crystal', 'fuchsia'], plate: { type: 'circle', r: 372 } };
}

// ---------------------------------------------------------------- Intricate
function spirograph() {
  const b = new Builder();
  const P = { royal: 0, aqua: 1, violet: 2, gold: 3, cry: 4, mid: 5 };
  b.add('round', 0, 0, 40, 40, 0, P.gold, { force: true });
  const hypo = (R, r, d, sc) => (t) => [sc * ((R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t)), sc * ((R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t))];
  const epi = (R, r, d, sc) => (t) => [sc * ((R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t)), sc * ((R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t))];
  alongCurve(b, epi(6, 1, 2, 14), 0, TAU, 13, 'round', 12, 12, () => P.violet, { samples: 3000 });
  alongCurve(b, hypo(8, 3, 3, 28), 0, 6 * Math.PI, 15, 'oval', 12, 20, () => P.aqua, { samples: 12000 });
  alongCurve(b, hypo(10, 3, 5, 27), 0, 6 * Math.PI, 16, 'oval', 12, 21, (t, i) => (i % 7 === 0 ? P.gold : P.royal), { samples: 16000 });
  alongCurve(b, hypo(12, 5, 7, 23), 0, 10 * Math.PI, 15, 'round', 11, 11, () => P.mid, { samples: 20000 });
  // soft crystal ground between the lines
  for (let r = 30; r < 330; r += 14) {
    const n = Math.floor((TAU * r) / 15);
    for (let i = 0; i < n; i++) { const [x, y] = polar(r, ((i + (r % 28 ? 0.5 : 0)) * TAU) / n); b.add('round', x, y, 8, 8, 0, P.cry, { gap: 1.2 }); }
  }
  ring(b, 352, 72, 'round', 12, 12, (i) => (i % 2 ? P.cry : P.mid), { force: false, gap: 0.4 });
  ring(b, 376, 36, 'teardrop', 14, 24, P.royal, { force: false, gap: 0.4 });
  return { b, palette: ['royal', 'aqua', 'violet', 'gold', 'crystal', 'midnight'], plate: { type: 'circle', r: 398 } };
}

function roseCurve() {
  const b = new Builder();
  const P = { garnet: 0, rose: 1, blush: 2, gold: 3, violet: 4, cream: 5 };
  const A = 285, A2 = 175;
  b.add('round', 0, 0, 30, 30, 0, P.gold, { force: true });
  alongCurve(b, (t) => [A * Math.cos(4 * t) * Math.cos(t), A * Math.cos(4 * t) * Math.sin(t)], 0, TAU, 13, 'round', 11, 11, () => P.garnet, { samples: 20000 });
  hexPack(b, 15, 22, 13, (x, y) => {
    const rho = Math.hypot(x, y), ph = Math.atan2(y, x);
    if (rho < 22 || rho > A - 6) return null;
    const lim = A * Math.abs(Math.cos(4 * ph));
    if (rho < lim - 9) { const f = rho / lim; return f < 0.35 ? P.gold : f < 0.7 ? P.rose : P.blush; }
    const lim2 = A2 * Math.abs(Math.cos(4 * (ph - Math.PI / 8)));
    if (rho < lim2 - 4 && rho > lim + 9) return rho < lim2 - 22 ? P.violet : P.cream;
    return null;
  }, { force: false, gap: 0.3 });
  ring(b, 300, 64, 'round', 12, 12, (i) => (i % 2 ? P.rose : P.gold), { force: false, gap: 0.4 });
  return { b, palette: ['garnet', 'rose', 'blush', 'gold', 'violet', 'cream'], plate: { type: 'circle', r: 318 } };
}

function shatteredPrism() {
  const b = new Builder();
  const P = { fu: 0, violet: 1, sky: 2, aqua: 3, gold: 4, cry: 5, ind: 6 };
  b.add('round', 0, 0, 56, 56, 0, P.cry, { force: true });
  orbitPack(b, {
    k: 8, R: 330, seed: 11,
    sizes: [48, 38, 30, 24, 19, 15, 12], tries: [40, 90, 200, 400, 800, 1400, 2400],
    shapeOf: (sz, rand) => sz >= 30 ? (rand() < 0.5 ? { shape: 'marquise', w: sz * 0.5, h: sz } : { shape: 'round', w: sz * 0.8, h: sz * 0.8 })
      : sz >= 19 ? (rand() < 0.4 ? { shape: 'teardrop', w: sz * 0.62, h: sz } : { shape: 'round', w: sz, h: sz }) : { shape: 'round', w: sz, h: sz },
    color: (r, th, sz) => sz >= 38 ? P.fu : sz >= 30 ? P.violet : sz >= 24 ? (r < 200 ? P.sky : P.aqua) : sz >= 19 ? P.gold : sz >= 15 ? (r < 210 ? P.cry : P.ind) : P.aqua,
  });
  ring(b, 342, 64, 'round', 12, 12, (i) => (i % 2 ? P.fu : P.ind), { force: false, gap: 0.4 });
  return { b, palette: ['fuchsia', 'violet', 'sky', 'aqua', 'gold', 'crystal', 'indigo'], plate: { type: 'circle', r: 362 } };
}

function nautilus() {
  const b = new Builder();
  const P = { teal: 0, aqua: 1, sand: 2, coral: 3, cream: 4, cry: 5 };
  b.add('round', 0, 0, 40, 40, 0, P.coral, { force: true });
  const GA = Math.PI * (3 - Math.sqrt(5));
  for (let i = 3; i < 800; i++) {
    const r = 3.2 * Math.pow(i, 0.75);
    if (r > 330) break;
    const size = 0.8 * Math.sqrt(48.25 * Math.sqrt(i));
    const p = i % 34 < 3 ? P.coral : i % 21 < 2 ? P.teal : i % 13 === 0 ? P.cry : r < 110 ? P.aqua : r < 220 ? P.sand : P.cream;
    const [x, y] = polar(r, i * GA);
    b.add('round', x, y, size, size, i * GA, p, { gap: 0.5, limit: inDisc(338) });
  }
  ring(b, 352, 48, 'teardrop', 16, 28, (i) => (i % 2 ? P.teal : P.coral), { force: false, gap: 0.4 });
  return { b, palette: ['teal', 'aqua', 'sand', 'coral', 'cream', 'crystal'], plate: { type: 'circle', r: 374 } };
}

// ---------------------------------------------------------------- Expert
function apollonian() {
  const b = new Builder();
  const P = { sap: 0, royal: 1, sky: 2, aqua: 3, ice: 4, pearl: 5, gold: 6, sil: 7 };
  b.add('round', 0, 0, 100, 100, 0, P.sap, { force: true });
  orbitPack(b, {
    k: 6, R: 380, seed: 3,
    sizes: [78, 60, 47, 38, 31, 26, 22, 18.5, 15.5, 13, 11.5, 10],
    tries: [60, 120, 240, 400, 700, 1000, 1500, 2200, 3000, 4000, 5000, 6000],
    shapeOf: (sz) => ({ shape: 'round', w: sz, h: sz }),
    color: (r, th, sz) => sz >= 60 ? P.royal : sz >= 47 ? P.sky : sz >= 38 ? P.aqua : sz >= 31 ? P.ice : sz >= 26 ? P.pearl : sz >= 22 ? P.gold : sz >= 15 ? (r < 250 ? P.pearl : P.sky) : r < 200 ? P.sil : P.ice,
  });
  return { b, palette: ['sapphire', 'royal', 'sky', 'aqua', 'ice', 'pearl', 'gold', 'silver'], plate: { type: 'circle', r: 398 } };
}

function sierpinski() {
  const b = new Builder();
  const P = { cream: 0, mid: 1, gold: 2, fu: 3, coral: 4, violet: 5 };
  const n = 48, s = 8.5, T = pascalMod(n, 4);
  const gw = SQ3 * s * 0.92, gh = 2 * s * 0.92, y0 = -1.5 * s * (n - 1) / 2;
  for (let r = 0; r < n; r++) for (let q = 0; q <= r; q++) {
    const v = T[r][q], band = Math.floor(r / 12) % 2;
    const p = v === 0 ? P.cream : v === 2 ? P.mid : v === 1 ? (band ? P.fu : P.gold) : (band ? P.violet : P.coral);
    b.add('hexagon', s * SQ3 * (q - r / 2), y0 + 1.5 * s * r, gw, gh, 0, p, { force: true });
  }
  const top = y0 - 2.2 * s, bot = y0 + 1.5 * s * (n - 1) + 1.6 * s, half = (bot - top) / SQ3;
  return { b, palette: ['cream', 'midnight', 'gold', 'fuchsia', 'coral', 'violet'], plate: { type: 'poly', pts: [[0, top], [half, bot], [-half, bot]] } };
}

// Persian-style carpet on a square grid of square-cut gems (4-fold mirror symmetric).
function carpet(n, rich) {
  const b = new Builder();
  const P = { ruby: 0, mid: 1, gold: 2, cream: 3, teal: 4, garnet: 5, sky: 6 };
  const pitch = 15, size = 13.6, B = rich ? 9 : 7, F = n / 2 - B, M = F * 0.62;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const u = i - (n - 1) / 2, v = j - (n - 1) / 2, a = Math.abs(u), c = Math.abs(v);
    const m = Math.min(i, j, n - 1 - i, n - 1 - j);
    let p;
    if (m < B) {
      const t = m === Math.min(i, n - 1 - i) ? Math.min(j, n - 1 - j) : Math.min(i, n - 1 - i);
      if (m === 0 || m === B - 1) p = P.mid;
      else if (m === 1 || m === B - 2) p = P.gold;
      else p = (t + m) % 4 < 2 ? P.teal : (rich && (t - m) % 6 === 0 ? P.gold : P.cream);
    } else {
      const L1 = a + c, Linf = Math.max(a, c), cl = (F - a) + (F - c);
      const rho = Math.hypot(a, c), ph = Math.atan2(c, a);
      if (L1 <= M) {
        if (L1 < 2) p = P.gold;
        else if (Math.round(L1) % 5 === 0) p = P.mid;
        else if (Math.round(Linf) % 3 === 0) p = P.teal;
        else p = Math.floor(L1 / 5) % 2 ? P.cream : P.garnet;
      } else if (L1 <= M + 1.2) p = P.gold;
      else if (rich && rho < M * 1.02 + M * 0.22 * Math.abs(Math.cos(4 * ph))) p = rho > M * 0.98 + M * 0.22 * Math.abs(Math.cos(4 * ph)) ? P.gold : P.sky;
      else if (cl <= M * 0.5) p = Math.round(cl) % 3 === 0 ? P.gold : P.garnet;
      else if (cl <= M * 0.5 + 1.2) p = P.teal;
      else {
        const dm = Math.abs((Math.round(a) % 8) - 4) + Math.abs((Math.round(c) % 8) - 4);
        p = dm === 0 ? P.gold : dm === 1 ? P.cream : P.ruby;
      }
    }
    b.add('square', u * pitch, v * pitch, size, size, 0, p, { force: true });
  }
  return { b, palette: ['ruby', 'midnight', 'gold', 'cream', 'teal', 'garnet', 'sky'], plate: { type: 'poly', pts: square((n * pitch) / 2 + 10) } };
}

function interference() {
  const b = new Builder();
  const P = { sap: 0, royal: 1, sky: 2, cream: 3, sand: 4, champ: 5, mid: 6 };
  const lam = 46;
  hexPack(b, 16, 24, 14.6, (x, y) => {
    if (Math.hypot(x, y) > 330) return null;
    const d1 = Math.hypot(x + 80, y), d2 = Math.hypot(x - 80, y);
    const v = Math.floor((d1 + d2) / lam), w = Math.floor((d1 - d2) / lam);
    const idx = ((v % 3) + 3) % 3;
    return ((v + w) & 1) ? [P.sap, P.royal, P.sky][idx] : [P.cream, P.sand, P.champ][idx];
  });
  ring(b, 348, 72, 'round', 13, 13, P.mid, { force: false, gap: 0.4 });
  return { b, palette: ['sapphire', 'royal', 'sky', 'cream', 'sand', 'champagne', 'midnight'], plate: { type: 'circle', r: 366 } };
}

// ---------------------------------------------------------------- Master
function cathedralRose() {
  const b = new Builder();
  const P = { ruby: 0, royal: 1, gold: 2, em: 3, mid: 4, cry: 5, garnet: 6, sky: 7 };
  b.add('round', 0, 0, 70, 70, 0, P.gold, { force: true });
  ring(b, 62, 12, 'teardrop', 22, 38, P.ruby);
  ring(b, 92, 24, 'round', 12, 12, P.cry);
  ring(b, 132, 24, 'marquise', 16, 48, P.royal);
  ring(b, 122, 24, 'round', 10, 10, P.gold, { phase: 0.5, force: false, gap: 0.3 });
  const sats = [];
  for (let k = 0; k < 12; k++) {
    const st = (k * TAU) / 12, [cx, cy] = polar(262, st); sats.push([cx, cy]);
    b.add('round', cx, cy, 26, 26, 0, P.cry, { force: true });
    ring(b, 28, 8, 'marquise', 10, 26, k % 2 ? P.em : P.ruby, { cx, cy, start: st });
    ring(b, 46, 12, 'round', 10, 10, P.gold, { cx, cy, start: st });
  }
  ring(b, 262, 12, 'teardrop', 20, 36, P.sky, { phase: 0.5 });
  ring(b, 190, 12, 'round', 18, 18, P.garnet, { phase: 0.5 });
  ring(b, 342, 12, 'round', 20, 20, P.garnet, { phase: 0.5 });
  const glass = (r, th) => {
    const [x, y] = polar(r, th);
    if (Math.min(...sats.map(([cx, cy]) => Math.hypot(x - cx, y - cy))) < 58) return P.mid;
    if (r < 205) return fold(th, 24) > 0.55 ? P.royal : P.mid;
    if (r < 330) { const f = fold(th, 12); return f > 0.7 ? P.sky : f > 0.45 ? P.royal : P.mid; }
    if (r < 362) return P.gold;
    if (r < 480) { const f2 = fold(th, 24), e = (r - 362) / 140; return f2 > e ? P.ruby : f2 > e - 0.12 ? P.gold : P.mid; }
    if (r < 500) return P.mid;
    return P.garnet;
  };
  fillRings(b, 150, 526, 14, glass, { limit: inDisc(526), sym: 12 });
  ring(b, 546, 96, 'teardrop', 12, 22, (i) => (i % 2 ? P.gold : P.ruby), { force: false, gap: 0.3 });
  return { b, palette: ['ruby', 'royal', 'gold', 'emerald', 'midnight', 'crystal', 'garnet', 'sky'], plate: { type: 'circle', r: 566 } };
}

function grandLotus() {
  const b = new Builder();
  const P = { rose: 0, blush: 1, fu: 2, mint: 3, em: 4, gold: 5, cream: 6, cry: 7 };
  b.add('round', 0, 0, 62, 62, 0, P.gold, { force: true });
  ring(b, 64, 8, 'marquise', 24, 54, P.fu);
  ring(b, 118, 16, 'marquise', 26, 70, P.rose, { phase: 0.5 });
  ring(b, 190, 16, 'marquise', 34, 92, P.blush);
  ring(b, 176, 16, 'marquise', 22, 60, P.fu, { phase: 0.5 });
  ring(b, 272, 32, 'marquise', 22, 72, (i) => (i % 2 ? P.rose : P.blush));
  ring(b, 346, 32, 'teardrop', 26, 48, P.em, { orient: 'in' });
  ring(b, 340, 32, 'round', 12, 12, P.gold, { phase: 0.5, force: false, gap: 0.3 });
  fillRings(b, 36, 378, 12, (r) => (r < 100 ? P.gold : r < 240 ? P.cream : P.mint), { limit: inDisc(378), sym: 16, gap: 1.08 });
  fillRings(b, 384, 548, 16, (r, th) => {
    const f = fold(th, 16), rr = (r - 384) / 164, hc = 0.15 + 0.7 * Math.sin((f * Math.PI) / 2);
    if (rr < hc - 0.14) return P.rose;
    if (rr < hc) return P.gold;
    return rr > 0.86 ? P.em : P.mint;
  }, { limit: inDisc(548), sym: 16 });
  ring(b, 564, 64, 'marquise', 12, 30, P.rose, { force: false, gap: 0.3 });
  return { b, palette: ['rose', 'blush', 'fuchsia', 'mint', 'emerald', 'gold', 'cream', 'crystal'], plate: { type: 'circle', r: 586 } };
}

function infiniteKaleidoscope() {
  const b = new Builder();
  const P = { ind: 0, sap: 1, sky: 2, aqua: 3, mint: 4, gold: 5, fu: 6, cry: 7 };
  b.add('round', 0, 0, 80, 80, 0, P.cry, { force: true });
  orbitPack(b, {
    k: 12, R: 560, seed: 29,
    sizes: [56, 44, 34, 27, 22, 18, 15, 12.5, 11, 9.5], tries: [60, 120, 260, 500, 900, 1600, 2600, 4000, 5500, 7000],
    shapeOf: (sz, rand) => {
      if (sz >= 34) { const q = rand(); return q < 0.35 ? { shape: 'marquise', w: sz * 0.48, h: sz } : q < 0.7 ? { shape: 'teardrop', w: sz * 0.6, h: sz } : { shape: 'round', w: sz * 0.85, h: sz * 0.85 }; }
      if (sz >= 22) return rand() < 0.3 ? { shape: 'rhombus', w: sz * 0.6, h: sz } : { shape: 'round', w: sz, h: sz };
      return { shape: 'round', w: sz, h: sz };
    },
    color: (r, th, sz, shape) => {
      if (sz >= 44) return shape === 'round' ? P.gold : P.fu;
      if (sz >= 34) return P.sap;
      if (sz >= 27) return r < 300 ? P.aqua : P.sky;
      if (sz >= 22) return shape === 'rhombus' ? P.fu : P.mint;
      if (sz >= 18) return P.gold;
      if (sz >= 15) return r < 260 ? P.cry : P.sky;
      return Math.floor(r / 90) % 2 ? P.ind : P.aqua;
    },
  });
  ring(b, 574, 112, 'round', 12, 12, (i) => (i % 2 ? P.gold : P.ind), { force: false, gap: 0.3 });
  return { b, palette: ['indigo', 'sapphire', 'sky', 'aqua', 'mint', 'gold', 'fuchsia', 'crystal'], plate: { type: 'circle', r: 594 } };
}

function pascalSnowflake() {
  const b = new Builder();
  const P = { mid: 0, sky: 1, aqua: 2, gold: 3, fu: 4, cry: 5 };
  const N = 32, s = 8, T = pascalMod(N, 5);
  const gw = SQ3 * s * 0.92, gh = 2 * s * 0.92;
  for (let r = -N; r <= N; r++) for (let q = -N; q <= N; q++) {
    const cs = [q, r, -q - r], abs = cs.map(Math.abs), d = Math.max(...abs);
    if (d > N) continue;
    const ci = abs.indexOf(d), a = abs[(ci + 1) % 3];
    const v = d === 0 ? 5 : T[d][a];
    const p = v === 5 ? P.cry : [P.mid, P.sky, P.aqua, P.gold, P.fu][v];
    b.add('hexagon', s * SQ3 * (q + r / 2), s * 1.5 * r, gw, gh, 0, p, { force: true });
  }
  return { b, palette: ['midnight', 'sky', 'aqua', 'gold', 'fuchsia', 'crystal'], plate: { type: 'poly', pts: hexPlate(s * SQ3 * N + s * 1.9) } };
}

// ---------------------------------------------------------------- register
CATALOG.push(
  { id: 'petal-clock', version: 1, name: 'Petal Clock', category: 'mandala', difficulty: 'Beginner', build: petalClock },
  { id: 'seed-of-life', version: 1, name: 'Seed of Life', category: 'geometric', difficulty: 'Medium', build: seedOfLife },
  { id: 'truchet', version: 1, name: 'Truchet Garden', category: 'geometric', difficulty: 'Medium', build: truchet },
  { id: 'star-quilt', version: 1, name: 'Star Quilt', category: 'geometric', difficulty: 'Medium', build: starQuilt },
  { id: 'twisted-squares', version: 1, name: 'Twisted Squares', category: 'geometric', difficulty: 'Medium', build: twistedSquares },
  { id: 'spirograph', version: 1, name: 'Spirograph', category: 'geometric', difficulty: 'Expert', build: spirograph },
  { id: 'rose-curve', version: 1, name: 'Rose Curve', category: 'mandala', difficulty: 'Intricate', build: roseCurve },
  { id: 'shattered-prism', version: 1, name: 'Shattered Prism', category: 'mandala', difficulty: 'Intricate', build: shatteredPrism },
  { id: 'nautilus', version: 1, name: 'Golden Nautilus', category: 'mandala', difficulty: 'Intricate', build: nautilus },
  { id: 'apollonian', version: 1, name: 'Apollonian Pearls', category: 'geometric', difficulty: 'Intricate', build: apollonian },
  { id: 'sierpinski', version: 1, name: 'Sierpinski Triangle', category: 'geometric', difficulty: 'Expert', build: sierpinski },
  { id: 'persian-medallion', version: 1, name: 'Persian Medallion', category: 'geometric', difficulty: 'Expert', build: () => carpet(36, false) },
  { id: 'interference', version: 1, name: 'Interference', category: 'geometric', difficulty: 'Expert', build: interference },
  { id: 'cathedral-rose', version: 1, name: 'Cathedral Rose', category: 'mandala', difficulty: 'Master', build: cathedralRose },
  { id: 'grand-lotus', version: 1, name: 'Grand Lotus', category: 'mandala', difficulty: 'Master', build: grandLotus },
  { id: 'infinite-kaleidoscope', version: 1, name: 'Infinite Kaleidoscope', category: 'mandala', difficulty: 'Master', build: infiniteKaleidoscope },
  { id: 'pascal-snowflake', version: 1, name: 'Pascal Snowflake', category: 'geometric', difficulty: 'Master', build: pascalSnowflake },
  { id: 'grand-carpet', version: 1, name: 'Grand Carpet', category: 'geometric', difficulty: 'Master', build: () => carpet(56, true) },
);
CATALOG.sort((a, c) => LEVEL[a.difficulty] - LEVEL[c.difficulty]);

export const COLLECTION_SIZE = CATALOG.length;
