// Collection 6: expert and master radial mandalas
// Authored artworks registered into the shared catalog. Deterministic only.
import { Builder, ring, fillRings, fold, inDisc, polar, GEMS, CATALOG, LEVEL, SQ3, square } from './artworks.js';
import { rng, alongCurve, alongPoly, hexPack, orbitPack, pascalMod, hexPlate } from './collection2.js';

const TAU = Math.PI * 2;
const PI = Math.PI;

// ---------------------------------------------------------------- helpers
// Like fillRings, but each row's count is rounded to the nearest multiple of k
// (never tighter than touching), so high symmetry orders do not thin the rows.
function band(b, R0, R1, size, fn, k, { gap = 1.07, rowGap = 1.09 } = {}) {
  const limit = inDisc(R1);
  for (let r = R0 + size / 2, row = 0; r <= R1 - size / 2 + 0.01; r += size * rowGap, row++) {
    const n0 = (TAU * r) / (size * gap), nMax = Math.floor((TAU * r) / (size + 0.9));
    let n = Math.max(k, Math.round(n0 / k) * k);
    if (n > nMax) n = Math.max(k, Math.floor(n0 / k) * k);
    const ph = (row % 2) * 0.5;
    for (let i = 0; i < n; i++) {
      const th = ((i + ph) / n) * TAU, p = fn(r, th, row, i, n);
      if (p == null) continue;
      const [x, y] = polar(r, th);
      b.add('round', x, y, size, size, th, p, { limit });
    }
  }
}
// angular distance from th to the nearest axis rot + j * TAU / n (0 .. PI / n)
const off = (th, n, rot = 0) => { const s = TAU / n, t = ((((th - rot) % s) + s) % s); return Math.min(t, s - t); };
// signed angular offset from the nearest axis (-PI / n .. PI / n)
const soff = (th, n, rot = 0) => { const s = TAU / n, t = ((((th - rot) % s) + s) % s); return t < s / 2 ? t : t - s; };
// boundary radius of an n-pointed star (points at rot + j * TAU / n) along direction th
function starR(th, n, Ro, Ri, rot = 0) {
  const phi = off(th, n, rot), a = PI / n;
  const x2 = Ri * Math.cos(a), y2 = Ri * Math.sin(a);
  return (Ro * y2) / (y2 * Math.cos(phi) - (x2 - Ro) * Math.sin(phi));
}
// regular polygon boundary radius (vertices at rot + j * TAU / n)
const polyR = (th, n, R, rot = 0) => (R * Math.cos(PI / n)) / Math.cos(PI / n - off(th, n, rot));
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
const alt = (a, c) => (i) => (i % 2 ? c : a);
// Plug the gaps of a local rosette at (cx, cy) with small gems on concentric trial rings.
function plug(b, cx, cy, st, r0, r1, size, p) {
  for (let r = r0; r <= r1; r += size * 0.5) {
    const n = Math.max(1, Math.floor((TAU * r) / (size * 1.15)));
    for (const ph of [0, 0.5]) ring(b, r, n, 'round', size, size, p, { cx, cy, start: st, phase: ph, force: false, gap: 0.6 });
  }
}
const lo = { force: false, gap: 0.4 };
// local petal coordinates: along the axis at angle a (u) and lateral (v)
const local = (r, th, a) => { let d = th - a; d -= TAU * Math.round(d / TAU); return [r * Math.cos(d), r * Math.sin(d)]; };
// point inside a lens (vesica) spanning radius r0..r1 on axis a with half-width W
function inLens(r, th, a, r0, r1, W) {
  const [u0, v] = local(r, th, a), L = (r1 - r0) / 2, u = u0 - (r0 + r1) / 2;
  const rho = (L * L + W * W) / (2 * W), c = rho - W;
  return Math.hypot(u, Math.abs(v) + c) < rho;
}

// Twelve overlapping circles; overlap parity paints interlaced vesica petals.
function vesicaCrown() {
  const b = new Builder();
  const P = { pearl: 0, ice: 1, sky: 2, royal: 3, mid: 4, gold: 5, sap: 6 };
  const k = 12;
  b.add('round', 0, 0, 44, 44, 0, P.gold, { force: true });
  ring(b, 38, k, 'teardrop', 11, 20, P.sap);
  const cs = Array.from({ length: k }, (_, j) => polar(170, (j * TAU) / k)), rc = 120;
  ring(b, 150, 12, 'marquise', 18, 62, P.sky);
  ring(b, 226, 12, 'teardrop', 18, 34, P.royal, { phase: 0.5 });
  band(b, 48, 300, 12, (r, th) => {
    if (r > 290) return P.mid;
    const [x, y] = polar(r, th);
    let c = 0;
    for (const [cx, cy] of cs) if (Math.hypot(x - cx, y - cy) < rc) c++;
    if (c === 0) return r < 100 ? P.gold : P.ice;
    if (c % 2) return c > 2 ? P.mid : P.royal;
    return c > 2 ? P.sky : P.pearl;
  }, k);
  ring(b, 308, 48, 'teardrop', 14, 26, alt(P.gold, P.sky), lo);
  ring(b, 306, 48, 'round', 9, 9, P.royal, { phase: 0.5, ...lo });
  ring(b, 336, 24, 'round', 18, 18, P.royal);
  ring(b, 336, 72, 'round', 11, 11, (i) => (i % 3 ? P.pearl : null), { phase: 0, ...lo });
  ring(b, 336, 24, 'round', 10, 10, P.gold, { phase: 0.5, ...lo });
  ring(b, 366, 96, 'round', 13, 13, alt(P.mid, P.ice), lo);
  return { b, palette: ['pearl', 'ice', 'sky', 'royal', 'midnight', 'gold', 'sapphire'], plate: { type: 'circle', r: 386 } };
}

// Eight long, eight medium and sixteen short split rays on a night ground.
function nightCompass() {
  const b = new Builder();
  const P = { onyx: 0, sil: 1, ice: 2, gold: 3, sap: 4, mid: 5, cry: 6, champ: 7 };
  b.add('round', 0, 0, 40, 40, 0, P.gold, { force: true });
  ring(b, 32, 12, 'round', 10, 10, P.cry);
  band(b, 42, 300, 12.5, (r, th) => {
    if (r > 290) return P.gold;
    if (r < starR(th, 8, 296, 92)) return soff(th, 8) > 0 ? P.gold : P.champ;
    if (r < starR(th, 8, 226, 92, PI / 8)) return soff(th, 8, PI / 8) > 0 ? P.cry : P.sil;
    if (r < starR(th, 16, 166, 88, PI / 16)) return soff(th, 16, PI / 16) > 0 ? P.ice : P.sap;
    if (r > 196 && r < 210) return P.mid;
    return P.onyx;
  }, 16);
  ring(b, 318, 64, 'marquise', 9, 26, alt(P.gold, P.sil), lo);
  ring(b, 318, 64, 'round', 9, 9, P.ice, { phase: 0.5, ...lo });
  ring(b, 348, 96, 'round', 13, 13, alt(P.onyx, P.champ), lo);
  return { b, palette: ['onyx', 'slate', 'ice', 'gold', 'sapphire', 'midnight', 'crystal', 'honey'], plate: { type: 'circle', r: 368 } };
}

// Concentric bands, each a different motif: rays, beads, checkers, zigzags, lancets.
function spiceSampler() {
  const b = new Builder();
  const P = { garnet: 0, amber: 1, cit: 2, cream: 3, choc: 4, teal: 5, copper: 6 };
  b.add('round', 0, 0, 44, 44, 0, P.cit, { force: true });
  ring(b, 36, 12, 'teardrop', 12, 22, P.garnet);
  band(b, 46, 108, 12, (r, th) => (fold(th, 12) > 0.55 ? P.amber : P.garnet), 12);
  ring(b, 122, 24, 'round', 16, 16, P.cream);
  ring(b, 122, 24, 'round', 9, 9, P.teal, { phase: 0.5, ...lo });
  checkerBand(b, 136, 190, 13, 24, 2, (c) => (c ? P.choc : P.cream), 'square');
  ring(b, 202, 48, 'round', 12, 12, alt(P.teal, P.cit), lo);
  band(b, 212, 272, 13, (r, th) => {
    const u = (r - 212) / 60, v = u * 2 + fold(th, 24) * 0.9;
    return [P.garnet, P.amber, P.cream][Math.floor(v * 2) % 3];
  }, 24);
  ring(b, 284, 48, 'teardrop', 12, 22, alt(P.copper, P.teal), lo);
  band(b, 294, 354, 13, (r, th) => {
    const s = 1 - fold(th + PI / 24, 24);
    if (r > 344) return P.copper;
    if (s > 0.7) return P.choc;
    const top = 318 + 26 * Math.sqrt(Math.max(0, 1 - (s / 0.7) ** 1.5));
    if (r > top + 6) return P.choc;
    return r > top - 8 || s > 0.5 ? P.cream : P.teal;
  }, 24);
  ring(b, 372, 48, 'teardrop', 16, 28, alt(P.garnet, P.amber), lo);
  ring(b, 370, 48, 'round', 10, 10, P.cream, { phase: 0.5, ...lo });
  ring(b, 400, 96, 'round', 13, 13, alt(P.choc, P.cit), lo);
  return { b, palette: ['garnet', 'amber', 'citrine', 'cream', 'chocolate', 'teal', 'copper'], plate: { type: 'circle', r: 420 } };
}

// Eighteen crescents swirling one way round a gold heart.
function crescentHalo() {
  const b = new Builder();
  const P = { plum: 0, violet: 1, lav: 2, orch: 3, gold: 4, pearl: 5, mid: 6 };
  const k = 18;
  b.add('round', 0, 0, 52, 52, 0, P.gold, { force: true });
  ring(b, 44, 9, 'teardrop', 16, 28, P.orch);
  ring(b, 46, 9, 'round', 11, 11, P.pearl, { phase: 0.5, ...lo });
  const A = Array.from({ length: k }, (_, j) => polar(170, (j * TAU) / k));
  const B = Array.from({ length: k }, (_, j) => polar(170, (j * TAU) / k + 0.3));
  band(b, 60, 300, 12, (r, th) => {
    if (r > 288) return P.gold;
    const [x, y] = polar(r, th);
    let c = 0, w = 0;
    for (let j = 0; j < k; j++) if (Math.hypot(x - A[j][0], y - A[j][1]) < 104 && Math.hypot(x - B[j][0], y - B[j][1]) > 104) { c++; w = j; }
    if (c === 0) return r < 120 ? P.gold : P.pearl;
    if (c > 1) return P.pearl;
    if (w % 2) return r < 170 ? P.orch : P.lav;
    return r < 170 ? P.violet : P.plum;
  }, k);
  ring(b, 316, 36, 'teardrop', 16, 30, alt(P.violet, P.orch), lo);
  ring(b, 314, 36, 'round', 10, 10, P.pearl, { phase: 0.5, ...lo });
  ring(b, 346, 108, 'round', 12, 12, alt(P.mid, P.lav), lo);
  return { b, palette: ['plum', 'violet', 'lavender', 'orchid', 'gold', 'pearl', 'midnight'], plate: { type: 'circle', r: 366 } };
}

// Blue-and-white porcelain: an eleven-petal flower, hanging tongues and a zigzag frieze.
function delftMedallion() {
  const b = new Builder();
  const P = { pearl: 0, cob: 1, sap: 2, ice: 3, mid: 4, sky: 5 };
  const k = 22;
  b.add('round', 0, 0, 40, 40, 0, P.cob, { force: true });
  ring(b, 34, 11, 'round', 11, 11, P.ice);
  ring(b, 90, 11, 'marquise', 32, 92, P.cob);
  ring(b, 90, 11, 'marquise', 12, 46, P.ice, { force: false, gap: 0 });
  ring(b, 82, 11, 'teardrop', 18, 34, P.sky, { phase: 0.5, orient: 'in', ...lo });
  ring(b, 124, 11, 'round', 13, 13, P.sap, { phase: 0.5, ...lo });
  band(b, 42, 150, 10, (r) => (r > 138 ? P.mid : P.pearl), 22);
  ring(b, 162, 22, 'round', 16, 16, P.cob);
  ring(b, 162, 22, 'round', 10, 10, P.sky, { phase: 0.5, ...lo });
  band(b, 172, 250, 12, (r, th) => {
    if (r > 240) return P.cob;
    const s = 1 - fold(th, k);
    const bot = 230 - 52 * Math.sqrt(Math.max(0, 1 - (s / 0.8) ** 2));
    if (s < 0.8 && r > bot) return r > bot + 12 && s < 0.5 ? P.sky : P.cob;
    const [x, y] = polar(r, th), [cx, cy] = polar(196, Math.round((th * k) / TAU - 0.5) * (TAU / k) + PI / k);
    return Math.hypot(x - cx, y - cy) < 14 ? P.sap : P.pearl;
  }, k);
  band(b, 252, 316, 12, (r, th) => {
    if (r > 306) return P.mid;
    const u = (r - 252) / 54, f = fold(th, k);
    if (Math.abs(u - 0.1 - 0.8 * f) < 0.2) return P.pearl;
    return P.cob;
  }, k);
  ring(b, 330, 44, 'teardrop', 14, 26, alt(P.cob, P.sky), lo);
  ring(b, 328, 44, 'round', 9, 9, P.mid, { phase: 0.5, ...lo });
  ring(b, 356, 110, 'round', 12, 12, alt(P.mid, P.ice), lo);
  return { b, palette: ['pearl', 'cobalt', 'sapphire', 'ice', 'midnight', 'sky'], plate: { type: 'circle', r: 376 } };
}

// The {12/5} star polygon drawn in gold lines; regions shaded by depth.
function gildedDodecagram() {
  const b = new Builder();
  const P = { onyx: 0, garnet: 1, ruby: 2, gold: 3, champ: 4, cream: 5, teal: 6 };
  const n = 12, m = 5, R = 300, a = R * Math.cos((PI * m) / n);
  const N = Array.from({ length: n }, (_, i) => polar(1, ((i + m / 2) * TAU) / n));
  b.add('round', 0, 0, 40, 40, 0, P.gold, { force: true });
  ring(b, 236, 12, 'marquise', 18, 56, P.cream);
  band(b, 24, 312, 12, (r, th) => {
    const [x, y] = polar(r, th);
    let c = 0, line = false;
    for (const [nx, ny] of N) { const d = x * nx + y * ny; if (d > a) c++; if (Math.abs(d - a) < 5.5 && r < R) line = true; }
    if (line) return P.gold;
    if (r > 296) return P.gold;
    return [P.cream, P.champ, P.ruby, P.onyx, P.teal, P.garnet][Math.min(c, 5)];
  }, n);
  ring(b, 324, 48, 'teardrop', 14, 26, alt(P.gold, P.ruby), lo);
  ring(b, 322, 48, 'round', 9, 9, P.cream, { phase: 0.5, ...lo });
  ring(b, 352, 96, 'round', 13, 13, alt(P.garnet, P.champ), lo);
  return { b, palette: ['onyx', 'garnet', 'ruby', 'gold', 'champagne', 'cream', 'teal'], plate: { type: 'circle', r: 372 } };
}

// Four overlapping twelve-petal layers on a midnight ground.
function moonlitLotus() {
  const b = new Builder();
  const P = { ind: 0, peri: 1, lav: 2, opal: 3, gold: 4, mid: 5, tanz: 6, cit: 7 };
  b.add('round', 0, 0, 50, 50, 0, P.gold, { force: true });
  ring(b, 42, 12, 'teardrop', 13, 24, P.cit);
  ring(b, 44, 12, 'round', 10, 10, P.opal, { phase: 0.5, ...lo });
  // layers back to front: [count, phase, base, tip, max half-width, edge, base fill, tip fill]
  const layers = [
    [12, 0.5, 140, 410, 62, P.mid, P.tanz, P.peri],
    [12, 0, 110, 340, 62, P.ind, P.peri, P.lav],
    [12, 0.5, 80, 256, 50, P.tanz, P.lav, P.opal],
    [12, 0, 56, 184, 38, P.peri, P.opal, P.opal],
  ];
  ring(b, 124, 12, 'marquise', 18, 62, P.cit);
  ring(b, 196, 12, 'marquise', 20, 70, P.opal, { phase: 0.5 });
  ring(b, 262, 12, 'marquise', 20, 70, P.lav);
  ring(b, 340, 12, 'teardrop', 24, 50, P.peri, { phase: 0.5 });
  band(b, 56, 420, 12, (r, th) => {
    if (r > 410) return P.gold;
    let col = r < 90 ? P.cit : P.mid;
    for (const [cnt, ph, r0, tip, W, edge, fill, tipF] of layers) {
      const a = (Math.round((th * cnt) / TAU - ph) + ph) * (TAU / cnt);
      const [u, v] = local(r, th, a);
      if (u < r0 || u > tip) continue;
      const t = (u - r0) / (tip - r0), hw = W * Math.sin(PI * (0.15 + 0.85 * t)) ** 0.8 * Math.min(1, t * 10);
      if (Math.abs(v) < hw) col = Math.abs(v) > hw - 12 ? edge : t > 0.55 ? tipF : fill;
    }
    return col;
  }, 12);
  ring(b, 436, 48, 'teardrop', 16, 30, alt(P.gold, P.lav), lo);
  ring(b, 434, 48, 'round', 10, 10, P.opal, { phase: 0.5, ...lo });
  ring(b, 464, 120, 'round', 13, 13, alt(P.mid, P.peri), lo);
  return { b, palette: ['indigo', 'periwinkle', 'lavender', 'opal', 'gold', 'midnight', 'tanzanite', 'citrine'], plate: { type: 'circle', r: 484 } };
}

// Six satellite rosettes and six buds round a central flower, on a turquoise ground.
function hexadGarden() {
  const b = new Builder();
  const P = { cream: 0, teal: 1, tq: 2, coral: 3, peach: 4, choc: 5, gold: 6 };
  b.add('round', 0, 0, 46, 46, 0, P.coral, { force: true });
  ring(b, 40, 12, 'teardrop', 12, 22, P.gold);
  ring(b, 72, 12, 'marquise', 14, 36, P.teal, { phase: 0.5 });
  ring(b, 70, 12, 'round', 10, 10, P.peach, lo);
  ring(b, 100, 24, 'round', 12, 12, alt(P.choc, P.gold), lo);
  const sats = [];
  for (let j = 0; j < 6; j++) {
    const st = (j * TAU) / 6, [cx, cy] = polar(218, st); sats.push([cx, cy, 92]);
    b.add('round', cx, cy, 32, 32, 0, P.coral, { force: true });
    ring(b, 30, 8, 'teardrop', 13, 24, P.gold, { cx, cy, start: st });
    ring(b, 32, 8, 'round', 9, 9, P.cream, { cx, cy, start: st, phase: 0.5, ...lo });
    ring(b, 56, 12, 'marquise', 12, 30, alt(P.teal, P.tq), { cx, cy, start: st });
    ring(b, 54, 12, 'round', 9, 9, P.peach, { cx, cy, start: st, phase: 0.5, ...lo });
    ring(b, 78, 24, 'round', 11, 11, alt(P.choc, P.coral), { cx, cy, start: st, ...lo });
    const st2 = st + PI / 6, [dx, dy] = polar(262, st2); sats.push([dx, dy, 44]);
    b.add('round', dx, dy, 22, 22, 0, P.gold, { force: true });
    ring(b, 22, 8, 'teardrop', 10, 18, P.coral, { cx: dx, cy: dy, start: st2 });
    ring(b, 38, 12, 'round', 10, 10, alt(P.teal, P.peach), { cx: dx, cy: dy, start: st2, ...lo });
  }
  band(b, 110, 336, 12, (r, th) => {
    if (r > 324) return P.choc;
    const [x, y] = polar(r, th);
    for (const [cx, cy, rad] of sats) { const d = Math.hypot(x - cx, y - cy); if (d < rad + 14) return d < rad ? P.cream : P.choc; }
    if (r < 124) return P.cream;
    if (r < 140) return P.choc;
    return fold(th, 6) > 0.5 ? P.teal : P.tq;
  }, 6);
  ring(b, 352, 36, 'teardrop', 16, 30, alt(P.coral, P.teal), lo);
  ring(b, 350, 36, 'round', 10, 10, P.gold, { phase: 0.5, ...lo });
  ring(b, 380, 96, 'round', 13, 13, alt(P.choc, P.peach), lo);
  return { b, palette: ['cream', 'teal', 'turquoise', 'coral', 'peach', 'chocolate', 'gold'], plate: { type: 'circle', r: 400 } };
}

// Two interlaced chains of gem links (eight and sixteen) passing over and under.
function celticChains() {
  const b = new Builder();
  const P = { forest: 0, em: 1, gold: 2, cream: 3, garnet: 4, mint: 5, ruby: 6 };
  b.add('round', 0, 0, 44, 44, 0, P.ruby, { force: true });
  ring(b, 38, 8, 'teardrop', 14, 24, P.gold);
  ring(b, 40, 8, 'round', 10, 10, P.cream, { phase: 0.5, ...lo });
  // chain: [links, centre distance, link radius, gems per link, link colour, bead colour, inner fill]
  const chains = [[8, 118, 56, 14, P.gold, P.cream, P.forest], [16, 254, 50, 12, P.ruby, P.cream, P.cream]];
  for (const [k, d, rc, n, col, bead] of chains) {
    const C = Array.from({ length: k }, (_, j) => polar(d, (j * TAU) / k));
    const top = (a, c, r) => { const ahead = c === (a + 1) % k ? c : a; return r < d ? ahead : ahead === c ? a : c; };
    const under = (j, x, y, w) => [(j + 1) % k, (j + k - 1) % k].some((c) => Math.abs(Math.hypot(x - C[c][0], y - C[c][1]) - rc) < w && top(j, c, Math.hypot(x, y)) === c);
    for (let j = 0; j < k; j++) {
      const [cx, cy] = C[j], st = (j * TAU) / k;
      for (let i = 0; i < n; i++) {
        const a = st + ((i + 0.5) * TAU) / n, [dx, dy] = polar(rc, a);
        if (!under(j, cx + dx, cy + dy, 22)) b.add('oval', cx + dx, cy + dy, 13, 24, a + PI / 2, col, { force: true });
      }
    }
  }
  const inside = (x, y, k, d, rc) => { let c = 0; for (let j = 0; j < k; j++) { const [cx, cy] = polar(d, (j * TAU) / k); if (Math.hypot(x - cx, y - cy) < rc) c++; } return c; };
  const ground = (r, th) => {
    if (r > 306) return P.gold;
    const [x, y] = polar(r, th);
    for (const [k, d, rc, , , , fill] of chains) { const c = inside(x, y, k, d, rc); if (c) return c > 1 ? P.mint : fill; }
    if (r < 62) return P.cream;
    return P.em;
  };
  band(b, 48, 318, 12, ground, 8);
  band(b, 48, 318, 9, ground, 8, { gap: 1.12 });
  ring(b, 334, 32, 'teardrop', 16, 30, alt(P.gold, P.garnet), lo);
  ring(b, 332, 32, 'round', 10, 10, P.cream, { phase: 0.5, ...lo });
  ring(b, 362, 96, 'round', 13, 13, alt(P.forest, P.mint), lo);
  return { b, palette: ['forest', 'emerald', 'gold', 'cream', 'garnet', 'mint', 'ruby'], plate: { type: 'circle', r: 382 } };
}

// Five nested sixteen-point stars, alternately turned, each with a bright rim.
function sixteenStarNest() {
  const b = new Builder();
  const P = { mid: 0, tanz: 1, ame: 2, orch: 3, lav: 4, gold: 5, pearl: 6, plum: 7 };
  b.add('round', 0, 0, 56, 56, 0, P.gold, { force: true });
  ring(b, 48, 16, 'teardrop', 11, 20, P.pearl);
  const stars = [
    [16, 440, 300, 0, P.plum, P.gold],
    [16, 384, 250, PI / 16, P.lav, P.pearl],
    [16, 316, 200, 0, P.tanz, P.gold],
    [16, 246, 150, PI / 16, P.orch, P.pearl],
    [8, 176, 96, 0, P.ame, P.gold],
  ];
  ring(b, 398, 16, 'marquise', 14, 52, P.gold);
  ring(b, 336, 16, 'marquise', 14, 48, P.pearl, { phase: 0.5 });
  ring(b, 270, 16, 'teardrop', 16, 32, P.lav);
  band(b, 62, 456, 13, (r, th) => {
    let col = r > 446 ? P.gold : P.mid;
    for (const [n, Ro, Ri, rot, fill, edge] of stars) {
      const d = starR(th, n, Ro, Ri, rot) - r;
      if (d >= 0) col = d < 12 ? edge : fill;
    }
    if (r < 96) col = P.lav;
    return col;
  }, 16);
  ring(b, 474, 64, 'teardrop', 14, 26, alt(P.gold, P.orch), lo);
  ring(b, 472, 64, 'round', 9, 9, P.pearl, { phase: 0.5, ...lo });
  ring(b, 500, 128, 'round', 13, 13, alt(P.mid, P.lav), lo);
  return { b, palette: ['midnight', 'tanzanite', 'amethyst', 'orchid', 'lavender', 'gold', 'pearl', 'plum'], plate: { type: 'circle', r: 520 } };
}

// A simple rosette inside an elaborate border: an interlaced guilloche ribbon pair.
function guillocheMedallion() {
  const b = new Builder();
  const P = { mid: 0, sap: 1, gold: 2, champ: 3, sil: 4, ruby: 5, ice: 6, cry: 7 };
  b.add('round', 0, 0, 60, 60, 0, P.ruby, { force: true });
  ring(b, 52, 8, 'teardrop', 22, 40, P.gold);
  ring(b, 52, 8, 'round', 14, 14, P.cry, { phase: 0.5, ...lo });
  ring(b, 100, 16, 'marquise', 16, 44, alt(P.ice, P.sap));
  ring(b, 94, 16, 'round', 12, 12, P.champ, { phase: 0.5, ...lo });
  ring(b, 150, 32, 'teardrop', 14, 26, alt(P.ruby, P.gold), lo);
  band(b, 70, 196, 12, (r) => (r > 184 ? P.gold : P.mid), 16);
  const n = 16, Rm = 300, A = 58;
  band(b, 196, 420, 12, (r, th) => {
    if (r > 408) return P.gold;
    if (r < 208) return P.champ;
    const s = Math.sin(n * th), ra = Rm + A * s, rb = Rm - A * s;
    const inA = Math.abs(r - ra) < 15, inB = Math.abs(r - rb) < 15;
    const top = Math.floor((n * th) / PI + 0.5) % 2;
    if (inA && inB) return top ? P.gold : P.sil;
    if (inA) return Math.abs(r - ra) < 6 ? P.champ : P.gold;
    if (inB) return Math.abs(r - rb) < 6 ? P.cry : P.sil;
    if (r > Math.min(ra, rb) && r < Math.max(ra, rb)) return P.sap;
    return P.mid;
  }, 16);
  checkerBand(b, 420, 470, 12, 64, 2, (c) => (c ? P.ruby : P.champ), 'square');
  ring(b, 486, 64, 'teardrop', 16, 30, alt(P.gold, P.sap), lo);
  ring(b, 484, 64, 'round', 10, 10, P.cry, { phase: 0.5, ...lo });
  ring(b, 514, 128, 'round', 13, 13, alt(P.mid, P.gold), lo);
  return { b, palette: ['midnight', 'sapphire', 'gold', 'champagne', 'silver', 'ruby', 'ice', 'crystal'], plate: { type: 'circle', r: 534 } };
}

// Twenty-four jewelled rosettes in two orbits round a great flower on an onyx ground.
function nightGarden() {
  const b = new Builder();
  const P = { onyx: 0, em: 1, jade: 2, mint: 3, gold: 4, ruby: 5, champ: 6, forest: 7 };
  b.add('round', 0, 0, 60, 60, 0, P.ruby, { force: true });
  ring(b, 52, 12, 'teardrop', 16, 30, P.gold);
  ring(b, 54, 12, 'round', 11, 11, P.champ, { phase: 0.5, ...lo });
  ring(b, 98, 12, 'marquise', 28, 62, P.em, { phase: 0.5 });
  ring(b, 92, 12, 'marquise', 16, 40, P.jade);
  ring(b, 124, 12, 'round', 14, 14, P.mint);
  ring(b, 144, 24, 'teardrop', 18, 32, alt(P.gold, P.ruby), lo);
  ring(b, 132, 24, 'round', 11, 11, P.champ, { phase: 0.5, ...lo });
  plug(b, 0, 0, 0, 30, 150, 9, P.onyx);
  const sats = [];
  const rosette = (R, st, big) => {
    const [cx, cy] = polar(R, st), o = { cx, cy, start: st }, ol = { ...o, ...lo };
    sats.push([cx, cy, big ? 80 : 58]);
    if (big) {
      b.add('round', cx, cy, 26, 26, 0, P.ruby, { force: true });
      ring(b, 25, 10, 'teardrop', 13, 22, P.gold, o);
      ring(b, 50, 16, 'marquise', 15, 34, P.em, o);
      ring(b, 40, 16, 'round', 9, 9, P.mint, { ...ol, phase: 0.5 });
      ring(b, 58, 16, 'round', 11, 11, P.gold, { ...ol, phase: 0.5 });
      ring(b, 73, 24, 'round', 13, 13, alt(P.jade, P.champ), ol);
      plug(b, cx, cy, st, 14, 76, 9, P.onyx);
    } else {
      b.add('round', cx, cy, 22, 22, 0, P.gold, { force: true });
      ring(b, 21, 9, 'teardrop', 11, 18, P.ruby, o);
      ring(b, 38, 12, 'marquise', 13, 26, P.jade, o);
      ring(b, 31, 12, 'round', 9, 9, P.mint, { ...ol, phase: 0.5 });
      ring(b, 51, 18, 'round', 12, 12, alt(P.em, P.champ), ol);
      plug(b, cx, cy, st, 12, 54, 9, P.onyx);
    }
  };
  for (let j = 0; j < 12; j++) {
    rosette(250, (j * TAU) / 12, j % 2 === 0);
    rosette(400, ((j + 0.5) * TAU) / 12, true);
  }
  band(b, 66, 506, 12, (r, th) => {
    if (r > 494) return P.gold;
    const [x, y] = polar(r, th);
    for (const [cx, cy, rad] of sats) { const d = Math.hypot(x - cx, y - cy); if (d < rad + 14) return d < rad ? null : P.forest; }
    if (r < 170) return P.onyx;
    return fold(th + PI / 12, 12) > 0.85 ? P.forest : P.onyx;
  }, 12);
  ring(b, 522, 72, 'teardrop', 14, 26, alt(P.em, P.gold), lo);
  ring(b, 520, 72, 'round', 9, 9, P.ruby, { phase: 0.5, ...lo });
  ring(b, 548, 144, 'round', 12, 12, alt(P.onyx, P.mint), lo);
  return { b, palette: ['onyx', 'emerald', 'jade', 'mint', 'gold', 'ruby', 'champagne', 'forest'], plate: { type: 'circle', r: 568 } };
}

// Three orbits of gem-built stars (six-, five- and four-pointed) on a dusk gradient.
function constellationWheel() {
  const b = new Builder();
  const P = { mid: 0, ind: 1, sap: 2, sky: 3, ice: 4, gold: 5, cit: 6, cry: 7 };
  b.add('round', 0, 0, 50, 50, 0, P.cit, { force: true });
  ring(b, 42, 8, 'teardrop', 16, 28, P.gold);
  // orbits: [count, distance, points, ray length, ray width, core size, offset]
  const orbits = [[8, 150, 6, 50, 16, 24, 0], [16, 290, 5, 42, 14, 18, 0.5], [24, 412, 4, 36, 12, 14, 0]];
  const stars = [];
  for (const [k, d, pts, L, W, core, ph] of orbits) for (let j = 0; j < k; j++) {
    const st = ((j + ph) * TAU) / k, [cx, cy] = polar(d, st); stars.push([cx, cy, L + 14]);
    b.add('round', cx, cy, core, core, 0, P.cit, { force: true });
    ring(b, core / 2 + L / 2 - 2, pts, 'marquise', W, L, P.gold, { cx, cy, start: st });
    ring(b, core / 2 + 6, pts, 'round', 9, 9, P.cry, { cx, cy, start: st, phase: 0.5, ...lo });
    ring(b, L * 0.8 + 4, pts, 'round', 9, 9, P.ice, { cx, cy, start: st, phase: 0.5, ...lo });
  }
  const ground = (r, th) => {
    if (r > 454) return P.gold;
    const [x, y] = polar(r, th);
    for (const [cx, cy, R] of stars) if (Math.hypot(x - cx, y - cy) < R) return P.sap;
    if (r < 76) return P.sap;
    if (r > 216 && r < 228) return P.sky;
    if (r > 354 && r < 366) return P.sky;
    return r < 221 ? P.ind : r < 358 ? P.mid : P.ind;
  };
  band(b, 54, 466, 12, ground, 8);
  band(b, 54, 466, 9, ground, 8, { gap: 1.1 });
  ring(b, 472, 48, 'teardrop', 16, 30, alt(P.gold, P.sky), lo);
  ring(b, 470, 48, 'round', 10, 10, P.cry, { phase: 0.5, ...lo });
  ring(b, 500, 120, 'round', 13, 13, alt(P.mid, P.ice), lo);
  return { b, palette: ['midnight', 'indigo', 'sapphire', 'sky', 'ice', 'gold', 'citrine', 'crystal'], plate: { type: 'circle', r: 520 } };
}

// Thirteen pointed lancets with roundel heads, leaded like stained glass.
function thirteenLancets() {
  const b = new Builder();
  const P = { onyx: 0, ruby: 1, sap: 2, gold: 3, em: 4, ice: 5, garnet: 6, royal: 7 };
  const k = 13, sec = TAU / k;
  b.add('round', 0, 0, 50, 50, 0, P.gold, { force: true });
  ring(b, 40, 13, 'round', 12, 12, P.ruby);
  band(b, 48, 470, 13, (r, th) => {
    if (r > 458) return P.onyx;
    if (r < 90) return r > 80 ? P.onyx : fold(th, 13) > 0.5 ? P.ice : P.royal;
    const s = 1 - fold(th, k); // 0 on lancet axis
    // lancet from 100 up to a pointed head
    const W = 0.78, spring = 300, crown = 370;
    if (s < W) {
      const top = spring + (crown - spring) * (1 - (s / W) ** 1.25);
      if (r < 100 || r > top + 1) { /* outside */ } else {
        if (r < 108 || r > top - 10 || s > W - 0.12) return P.onyx;
        const [u, v] = local(r, th, Math.round(th / sec) * sec);
        if (Math.hypot(u - 316, v) < 30) return Math.hypot(u - 316, v) < 20 ? P.gold : P.onyx;
        if (Math.abs(v) < 6) return P.onyx;
        if (u > 230 && u < 242) return P.onyx;
        if (u < 160 && u > 150) return P.onyx;
        return u < 155 ? P.ice : u < 236 ? (v < 0 ? P.sap : P.royal) : P.ruby;
      }
    }
    // spandrels with roundels between lancet heads
    const [u, v] = local(r, th, Math.round(th / sec - 0.5) * sec + sec / 2);
    const dr = Math.hypot(u - 402, v);
    if (dr < 40) return dr < 30 ? (dr < 14 ? P.gold : P.em) : P.onyx;
    if (r > 430 && r < 442) return P.gold;
    return r > 442 ? P.garnet : P.garnet;
  }, k);
  ring(b, 486, 52, 'teardrop', 16, 30, alt(P.gold, P.ruby), lo);
  ring(b, 484, 52, 'round', 10, 10, P.ice, { phase: 0.5, ...lo });
  ring(b, 514, 130, 'round', 12, 12, alt(P.onyx, P.gold), lo);
  return { b, palette: ['onyx', 'ruby', 'sapphire', 'gold', 'emerald', 'ice', 'garnet', 'royal'], plate: { type: 'circle', r: 534 } };
}

// Thirty-two layered petal rings built from feature gems on white porcelain.
function porcelainChrysanthemum() {
  const b = new Builder();
  const P = { pearl: 0, ruby: 1, rose: 2, blush: 3, gold: 4, forest: 5, burg: 6, jade: 7 };
  b.add('round', 0, 0, 50, 50, 0, P.gold, { force: true });
  ring(b, 44, 12, 'round', 14, 14, P.burg);
  ring(b, 74, 16, 'marquise', 13, 40, P.ruby);
  ring(b, 72, 16, 'round', 9, 9, P.gold, { phase: 0.5, ...lo });
  ring(b, 118, 16, 'marquise', 18, 52, P.rose, { phase: 0.5 });
  ring(b, 112, 16, 'marquise', 11, 34, P.burg, lo);
  ring(b, 172, 32, 'marquise', 14, 48, alt(P.rose, P.blush));
  ring(b, 164, 32, 'round', 9, 9, P.ruby, { phase: 0.5, ...lo });
  ring(b, 232, 32, 'marquise', 16, 58, P.blush, { phase: 0.5 });
  ring(b, 222, 32, 'round', 10, 10, P.rose, lo);
  ring(b, 300, 32, 'marquise', 18, 64, alt(P.ruby, P.rose));
  ring(b, 290, 32, 'round', 11, 11, P.gold, { phase: 0.5, ...lo });
  ring(b, 368, 64, 'teardrop', 14, 34, alt(P.jade, P.forest), lo);
  band(b, 20, 400, 11, (r, th) => {
    if (r > 386) return P.forest;
    const f = fold(th, 32);
    if (r > 262) return P.burg;
    if (r > 200) return f > 0.5 ? P.blush : P.pearl;
    if (r > 140) return P.burg;
    return P.pearl;
  }, 32);
  ring(b, 416, 64, 'teardrop', 16, 30, alt(P.ruby, P.gold), lo);
  ring(b, 414, 64, 'round', 10, 10, P.blush, { phase: 0.5, ...lo });
  ring(b, 444, 128, 'round', 13, 13, alt(P.burg, P.pearl), lo);
  return { b, palette: ['pearl', 'ruby', 'rose', 'blush', 'gold', 'forest', 'burgundy', 'jade'], plate: { type: 'circle', r: 464 } };
}

// Three generations of six turned triangles; overlap parity cuts nested eighteen-point stars.
function trigonCascade() {
  const b = new Builder();
  const P = { mid: 0, teal: 1, aqua: 2, mint: 3, gold: 4, cry: 5, cob: 6, peri: 7 };
  const gens = [[440, 0], [214, PI / 18], [104, 0]];
  b.add('round', 0, 0, 40, 40, 0, P.gold, { force: true });
  band(b, 22, 450, 12.5, (r, th) => {
    if (r > 440) return P.gold;
    for (let g = 0; g < 3; g++) {
      const [R, base] = gens[g];
      if (r > R + 6) { return g === 0 ? P.mid : g === 1 ? P.mid : P.cob; }
      if (r < R * 0.5 - 2 && g < 2) continue;
      let c = 0;
      for (let q = 0; q < 6; q++) if (r < polyR(th, 3, R, base + (q * TAU) / 18)) c++;
      const odd = c % 2;
      return [[P.mid, P.peri], [P.teal, P.cry], [P.cob, P.gold]][g][odd];
    }
    return P.gold;
  }, 18);
  ring(b, 466, 54, 'teardrop', 16, 30, alt(P.gold, P.aqua), lo);
  ring(b, 464, 54, 'round', 10, 10, P.cry, { phase: 0.5, ...lo });
  ring(b, 494, 126, 'round', 13, 13, alt(P.mid, P.mint), lo);
  return { b, palette: ['midnight', 'teal', 'aqua', 'mint', 'gold', 'crystal', 'cobalt', 'periwinkle'], plate: { type: 'circle', r: 514 } };
}

// Ten great nested mandorlas with ten smaller ones between their tips.
function mandorlaWheel() {
  const b = new Builder();
  const P = { burg: 0, scar: 1, tan: 2, cit: 3, cream: 4, choc: 5, peach: 6, gold: 7 };
  const k = 10, sec = TAU / k;
  b.add('round', 0, 0, 56, 56, 0, P.cit, { force: true });
  ring(b, 46, 10, 'teardrop', 16, 28, P.scar);
  ring(b, 250, 10, 'marquise', 32, 110, P.cream);
  ring(b, 250, 10, 'marquise', 16, 56, P.gold, { force: false, gap: 0 });
  ring(b, 360, 10, 'marquise', 20, 70, P.gold, { phase: 0.5 });
  band(b, 56, 470, 12.5, (r, th) => {
    if (r > 458) return P.choc;
    const a1 = Math.round(th / sec) * sec, a2 = Math.round(th / sec - 0.5) * sec + sec / 2;
    const L1 = [[1, P.burg], [0.82, P.scar], [0.64, P.tan], [0.46, P.cit], [0.28, P.cream]];
    for (let i = L1.length - 1; i >= 0; i--) {
      const [t, col] = L1[i], mid = 250, hl = 190 * t, hw = 74 * t;
      if (inLens(r, th, a1, mid - hl, mid + hl, hw)) return col;
    }
    const L2 = [[1, P.choc], [0.72, P.peach], [0.44, P.gold]];
    for (let i = L2.length - 1; i >= 0; i--) {
      const [t, col] = L2[i], mid = 360, hl = 92 * t, hw = 44 * t;
      if (inLens(r, th, a2, mid - hl, mid + hl, hw)) return col;
    }
    if (r < 90) return P.tan;
    return r > 430 ? P.burg : P.cream;
  }, 10);
  ring(b, 476, 60, 'teardrop', 14, 26, alt(P.gold, P.scar), lo);
  ring(b, 474, 60, 'round', 9, 9, P.cream, { phase: 0.5, ...lo });
  ring(b, 502, 120, 'round', 13, 13, alt(P.choc, P.cit), lo);
  return { b, palette: ['burgundy', 'scarlet', 'tangerine', 'citrine', 'cream', 'chocolate', 'peach', 'gold'], plate: { type: 'circle', r: 522 } };
}

// Thirty-fold tiers, each a different cut, alternating with dense ground bands and six bright spokes.
function facetWheel() {
  const b = new Builder();
  const P = { onyx: 0, sil: 1, cry: 2, aqua: 3, teal: 4, gold: 5, sap: 6, ice: 7 };
  const D = PI / 4;
  // colour by position relative to six spokes: m gems per spoke sector
  const sp = (m, axis, near, base) => (i) => { const q = ((i % m) + m) % m; return q === 0 ? axis : q === 1 || q === m - 1 ? near : base; };
  b.add('round', 0, 0, 56, 56, 0, P.gold, { force: true });
  ring(b, 46, 12, 'teardrop', 14, 26, P.cry);
  ring(b, 108, 30, 'rhombus', 16, 36, sp(5, P.cry, P.ice, P.aqua));
  ring(b, 104, 30, 'round', 10, 10, P.gold, { phase: 0.5, ...lo });
  ring(b, 176, 60, 'marquise', 15, 52, sp(10, P.gold, P.aqua, P.teal));
  ring(b, 244, 60, 'hexagon', 19, 22, sp(10, P.gold, P.cry, P.sil));
  ring(b, 244, 60, 'round', 9, 9, P.onyx, { phase: 0.5, ...lo });
  ring(b, 296, 30, 'teardrop', 26, 48, sp(5, P.cry, P.ice, P.aqua), { phase: 0.5 });
  ring(b, 296, 30, 'marquise', 16, 44, P.gold, lo);
  ring(b, 358, 90, 'square', 15, 15, sp(15, P.gold, P.gold, P.cry), { twist: D });
  ring(b, 358, 90, 'round', 9, 9, P.sap, { phase: 0.5, ...lo });
  ring(b, 414, 60, 'marquise', 20, 64, sp(10, P.cry, P.ice, P.ice), { phase: 0.5 });
  ring(b, 410, 60, 'teardrop', 13, 30, sp(10, P.gold, P.aqua, P.aqua), lo);
  ring(b, 470, 60, 'teardrop', 16, 34, sp(10, P.gold, P.cry, P.aqua), { phase: 0.5 });
  ring(b, 466, 60, 'round', 10, 10, P.ice, lo);
  const ground = (r, th) => {
    if (r > 490) return P.gold;
    if (r > 452) return P.onyx;
    const f = fold(th, 6);
    if (r < 84) return f > 0.75 ? P.teal : P.onyx;
    if (r < 136) return P.onyx;
    if (r < 146) return P.gold;
    if (r < 212) return f > 0.9 ? P.ice : P.sap;
    if (r < 266) return P.onyx;
    if (r < 330) return f > 0.9 ? P.ice : P.teal;
    if (r < 386) return P.onyx;
    return f > 0.9 ? P.ice : P.sap;
  };
  band(b, 24, 500, 12, ground, 6);
  band(b, 24, 500, 9, ground, 6, { gap: 1.12 });
  ring(b, 516, 60, 'teardrop', 14, 26, alt(P.gold, P.aqua), lo);
  ring(b, 514, 60, 'round', 9, 9, P.cry, { phase: 0.5, ...lo });
  ring(b, 542, 120, 'round', 13, 13, alt(P.onyx, P.cry), lo);
  return { b, palette: ['onyx', 'silver', 'crystal', 'aqua', 'teal', 'gold', 'sapphire', 'ice'], plate: { type: 'circle', r: 562 } };
}

export const ENTRIES = [
  { id: 'vesica-crown', version: 1, name: 'Vesica Crown', category: 'mandala', difficulty: 'Expert', build: vesicaCrown },
  { id: 'night-compass', version: 1, name: 'Night Compass', category: 'mandala', difficulty: 'Expert', build: nightCompass },
  { id: 'spice-sampler', version: 1, name: 'Spice Sampler', category: 'mandala', difficulty: 'Expert', build: spiceSampler },
  { id: 'crescent-halo', version: 1, name: 'Crescent Halo', category: 'mandala', difficulty: 'Expert', build: crescentHalo },
  { id: 'delft-medallion', version: 1, name: 'Delft Medallion', category: 'mandala', difficulty: 'Expert', build: delftMedallion },
  { id: 'gilded-dodecagram', version: 1, name: 'Gilded Dodecagram', category: 'mandala', difficulty: 'Expert', build: gildedDodecagram },
  { id: 'moonlit-lotus', version: 1, name: 'Moonlit Lotus', category: 'mandala', difficulty: 'Master', build: moonlitLotus },
  { id: 'hexad-garden', version: 1, name: 'Hexad Garden', category: 'mandala', difficulty: 'Expert', build: hexadGarden },
  { id: 'celtic-chains', version: 1, name: 'Celtic Chains', category: 'mandala', difficulty: 'Expert', build: celticChains },
  { id: 'sixteen-star-nest', version: 1, name: 'Sixteen Star Nest', category: 'mandala', difficulty: 'Master', build: sixteenStarNest },
  { id: 'guilloche-medallion', version: 1, name: 'Guilloche Medallion', category: 'mandala', difficulty: 'Master', build: guillocheMedallion },
  { id: 'night-garden', version: 1, name: 'Night Garden', category: 'mandala', difficulty: 'Master', build: nightGarden },
  { id: 'constellation-wheel', version: 1, name: 'Constellation Wheel', category: 'mandala', difficulty: 'Master', build: constellationWheel },
  { id: 'thirteen-lancets', version: 1, name: 'Thirteen Lancets', category: 'mandala', difficulty: 'Master', build: thirteenLancets },
  { id: 'porcelain-chrysanthemum', version: 1, name: 'Porcelain Chrysanthemum', category: 'mandala', difficulty: 'Expert', build: porcelainChrysanthemum },
  { id: 'trigon-cascade', version: 1, name: 'Trigon Cascade', category: 'mandala', difficulty: 'Master', build: trigonCascade },
  { id: 'mandorla-wheel', version: 1, name: 'Mandorla Wheel', category: 'mandala', difficulty: 'Master', build: mandorlaWheel },
  { id: 'facet-wheel', version: 1, name: 'Thirty Facet Wheel', category: 'mandala', difficulty: 'Master', build: facetWheel },
];

CATALOG.push(...ENTRIES);
CATALOG.sort((a, c) => LEVEL[a.difficulty] - LEVEL[c.difficulty]);
