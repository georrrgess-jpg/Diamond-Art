// Collection 4: lattices, tilings and polygons
// Authored artworks registered into the shared catalog. Deterministic only.
import { Builder, ring, fillRings, fold, inDisc, polar, GEMS, CATALOG, LEVEL, SQ3, square } from './artworks.js';
import { rng, alongCurve, alongPoly, hexPack, orbitPack, pascalMod, hexPlate } from './collection2.js';

const TAU = Math.PI * 2;
const PI = Math.PI;

// ---------------------------------------------------------------- helpers
// regular polygon, vertices at polar angles rot + k * TAU / n (0 = top, clockwise)
const regPoly = (n, R, rot = 0) => Array.from({ length: n }, (_, k) => polar(R, rot + (k * TAU) / n));
// rotation that points a gem's long axis along (dx, dy)
const dirRot = (dx, dy) => Math.atan2(dx, -dy);
const pick = (pal, ...a) => (typeof pal === 'function' ? pal(...a) : pal);
// n gems evenly spaced along a segment, aligned to it
function seg(b, [ax, ay], [bx, by], step, shape, w, h, pal, opts = {}) {
  const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / step));
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, p = pick(pal, k, n);
    if (p == null) continue;
    b.add(shape, ax + (bx - ax) * t, ay + (by - ay) * t, w, h, dirRot(bx - ax, by - ay), p, { gap: 0.3, ...opts });
  }
}
// gems along every edge of a closed polygon; pal(edge, k, n)
function frame(b, pts, step, shape, w, h, pal, opts = {}) {
  pts.forEach((a, e) => seg(b, a, pts[(e + 1) % pts.length], step, shape, w, h, (k, n) => pick(pal, e, k, n), opts));
}
// signed distance to the boundary of a convex polygon (positive inside)
function polyIn(pts, x, y) {
  let d = Infinity;
  const n = pts.length;
  let cx = 0, cy = 0; for (const [px, py] of pts) { cx += px / n; cy += py / n; }
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n];
    const ex = bx - ax, ey = by - ay, L = Math.hypot(ex, ey);
    const s = (q, r) => (ex * (r - ay) - ey * (q - ax)) / L;
    d = Math.min(d, s(x, y) * Math.sign(s(cx, cy)));
  }
  return d;
}
const inPoly = (pts, m = 0) => (x, y, r) => polyIn(pts, x, y) >= r + m;
// winding number of a closed path around (x, y)
function winding(pts, x, y) {
  let w = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    if (ay <= y) { if (by > y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) > 0) w++; }
    else if (by <= y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) < 0) w--;
  }
  return w;
}
const key = (x, y) => Math.round(x * 10) + ',' + Math.round(y * 10);
// fill leftover gaps inside a box with small gems (several offset passes, collision-checked)
function fillGaps(b, R, size, pitch, col, limit, shape = 'round') {
  for (const [ox, oy] of [[0, 0], [0.5, 0.5], [0.5, 0], [0, 0.5], [0.25, 0.75], [0.75, 0.25]])
    for (let x = -R + ox * pitch; x <= R; x += pitch) for (let y = -R + oy * pitch; y <= R; y += pitch) {
      const p = col(x, y);
      if (p != null) b.add(shape, x, y, size, size, 0, p, { gap: 0.4, limit });
    }
}

// ---------------------------------------------------------------- Beginner
// Plain basket weave: blocks of three ovals alternate horizontal and vertical.
function wickerBasket() {
  const b = new Builder();
  const P = { choc: 0, honey: 1, amber: 2, sand: 3, cream: 4, gold: 5 };
  const T = 64, n = 6, h = (T * n) / 2;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const cx = (i - (n - 1) / 2) * T, cy = (j - (n - 1) / 2) * T, horiz = (i + j) % 2 === 0;
    for (const k of [-1, 0, 1]) {
      const p = horiz ? (k ? P.sand : P.cream) : (k ? P.honey : P.amber);
      if (horiz) b.add('oval', cx, cy + k * 19, 16, 52, PI / 2, p, { force: true });
      else b.add('oval', cx + k * 19, cy, 16, 52, 0, p, { force: true });
    }
  }
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) b.add('round', i * T - h, j * T - h, 13, 13, 0, P.gold, { force: true });
  frame(b, square(h + 24), 24, 'square', 17, 17, (e, k) => (k % 2 ? P.choc : P.honey));
  return { b, palette: ['chocolate', 'honey', 'amber', 'sand', 'cream', 'gold'], plate: { type: 'poly', pts: square(h + 42) } };
}

// A single pinwheel quilt block of square gems with gold seams and a double border.
function pinwheelQuilt() {
  const b = new Builder();
  const P = { ruby: 0, coral: 1, cream: 2, gold: 3, garnet: 4, blush: 5 };
  const n = 10, pitch = 33, size = 29, half = n / 2;
  for (let i = -2; i < n + 2; i++) for (let j = -2; j < n + 2; j++) {
    let p;
    if (i < 0 || j < 0 || i >= n || j >= n) {
      const m = Math.min(i, j, n - 1 - i, n - 1 - j);
      p = m === -1 ? P.gold : ((i + j) % 2 ? P.blush : P.garnet);
    } else {
      // rotate the cell into the top-left quadrant, remembering the quadrant
      let a = i, c = j, q = 0;
      while (!(a < half && c < half)) { [a, c] = [c, n - 1 - a]; q++; }
      p = a === c ? P.garnet : a > c ? (q % 2 ? P.coral : P.ruby) : P.cream;
      if (a === c) { b.add('square', (i - (n - 1) / 2) * pitch, (j - (n - 1) / 2) * pitch, 22, 22, PI / 4, p, { force: true }); continue; }
    }
    b.add('square', (i - (n - 1) / 2) * pitch, (j - (n - 1) / 2) * pitch, size, size, 0, p, { force: true });
  }
  return { b, palette: ['ruby', 'coral', 'cream', 'gold', 'garnet', 'blush'], plate: { type: 'poly', pts: square(((n + 4) * pitch) / 2 + 12) } };
}

// Nested octagon frames round a small eight-petal heart.
function octagonLantern() {
  const b = new Builder();
  const P = { tq: 0, teal: 1, mid: 2, gold: 3, cream: 4, aqua: 5 };
  const oct = (R) => regPoly(8, R, TAU / 16);
  b.add('round', 0, 0, 40, 40, 0, P.gold, { force: true });
  ring(b, 47, 8, 'rhombus', 20, 38, P.tq);
  ring(b, 50, 8, 'round', 12, 12, P.cream, { phase: 0.5, force: false, gap: 0.3 });
  const f1 = oct(100);
  f1.forEach(([x, y], k) => b.add('square', x, y, 17, 17, TAU / 16 + (k * TAU) / 8 + PI / 4, P.gold, { force: true }));
  frame(b, f1, 36, 'oval', 13, 28, P.teal);
  ring(b, 142, 8, 'teardrop', 34, 58, P.aqua);
  ring(b, 146, 8, 'marquise', 22, 60, P.mid, { phase: 0.5 });
  ring(b, 78, 16, 'round', 15, 15, (i) => (i % 2 ? P.aqua : P.mid), { force: false, gap: 0.3 });
  ring(b, 120, 16, 'round', 16, 16, P.gold, { phase: 0.25, force: false, gap: 0.3 });
  ring(b, 174, 16, 'round', 17, 17, P.tq, { phase: 0.25, force: false, gap: 0.3 });
  const f2 = oct(196);
  f2.forEach(([x, y]) => b.add('round', x, y, 20, 20, 0, P.gold, { force: true }));
  frame(b, f2, 30, 'oval', 13, 26, P.mid);
  frame(b, oct(228), 26, 'square', 17, 17, (e, k, n) => (k === 0 || k === n - 1 ? P.gold : P.tq));
  frame(b, oct(258), 26, 'square', 17, 17, (e, k) => (k % 2 ? P.cream : P.teal));
  return { b, palette: ['turquoise', 'teal', 'midnight', 'gold', 'cream', 'aqua'], plate: { type: 'poly', pts: oct(284) } };
}

// A seven-pointed star polygon {7/3}, its overlap depth shown as nested colour.
function heptagramPlate() {
  const b = new Builder();
  const P = { mid: 0, royal: 1, sky: 2, ice: 3, gold: 4, cry: 5 };
  const R = 222, star = Array.from({ length: 7 }, (_, k) => polar(R, (k * 3 * TAU) / 7));
  const hept = regPoly(7, R + 34);
  frame(b, regPoly(7, R + 22), 26, 'square', 16, 16, (e, k, n) => (k === 0 ? P.gold : k % 2 ? P.royal : P.mid), { force: false });
  b.add('round', 0, 0, 34, 34, 0, P.gold, { force: true });
  fillRings(b, 24, R + 10, 23, (r, th) => {
    const [x, y] = polar(r, th);
    const w = Math.abs(winding(star, x, y));
    return [P.mid, P.sky, P.ice, P.royal][w];
  }, { limit: inPoly(regPoly(7, R + 12), 0), sym: 7, gap: 1.1 });
  return { b, palette: ['midnight', 'royal', 'sky', 'ice', 'gold', 'crystal'], plate: { type: 'poly', pts: hept } };
}

// ---------------------------------------------------------------- Medium
// Herringbone parquet of oval planks at 45 degrees, banded in zigzag rows.
function herringbone() {
  const b = new Builder();
  const P = { choc: 0, copper: 1, honey: 2, sand: 3, cream: 4, gold: 5, amber: 6 };
  const W = 21, half = 236, c45 = Math.SQRT1_2;
  const tf = (u, v) => [(u + v) * c45 * W, (v - u) * c45 * W];
  const lim = inPoly(square(half), 0);
  const cols = [[P.choc, P.honey], [P.copper, P.amber], [P.cream, P.sand], [P.copper, P.amber]];
  for (let a = -30; a <= 30; a++) for (let c = -12; c <= 12; c++) {
    const ox = a + 2 * c, oy = a - 2 * c;
    const band = cols[(((c % 4) + 4) % 4)];
    // horizontal plank [ox, ox+2] x [oy, oy+1], vertical plank [ox, ox+1] x [oy+1, oy+3]
    const [hx, hy] = tf(ox + 1, oy + 0.5), [vx, vy] = tf(ox + 0.5, oy + 2);
    b.add('oval', hx, hy, W * 0.78, W * 1.86, dirRot(c45, c45), band[0], { force: true, limit: lim });
    b.add('oval', vx, vy, W * 0.78, W * 1.86, dirRot(-c45, c45), band[1], { force: true, limit: lim });
  }
  // fill the ragged edge zone, then a frame
  const fr = half + 14;
  frame(b, square(fr), 22, 'square', 16, 16, (e, k) => (k % 2 ? P.gold : P.choc), { force: false });
  for (let x = -half; x <= half; x += 12) for (let y = -half; y <= half; y += 12) b.add('round', x, y, 10, 10, 0, P.choc, { gap: 1.2, limit: inPoly(square(half + 2), 0) });
  return { b, palette: ['chocolate', 'copper', 'honey', 'sand', 'cream', 'gold', 'amber'], plate: { type: 'poly', pts: square(fr + 22) } };
}

// A bevelled pentagram on a deep ground inside a pentagon frame.
function goldenPentagram() {
  const b = new Builder();
  const P = { mid: 0, royal: 1, cit: 2, amber: 3, cream: 4, champ: 5, gold: 6 };
  const Rt = 236, Ri = Rt * Math.cos((2 * PI) / 5) / Math.cos(PI / 5);
  const star = Array.from({ length: 10 }, (_, k) => polar(k % 2 ? Ri : Rt, (k * PI) / 5));
  const path = Array.from({ length: 5 }, (_, k) => polar(Rt, (k * 2 * TAU) / 5));
  frame(b, star, 15, 'round', 11, 11, P.gold, { force: false, gap: 0.5 });
  frame(b, regPoly(5, Rt + 50), 24, 'square', 16, 16, (e, k, n) => (k === 0 ? P.gold : P.royal), { force: false });
  b.add('round', 0, 0, 30, 30, 0, P.gold, { force: false });
  fillRings(b, 16, Rt + 40, 17, (r, th) => {
    const [x, y] = polar(r, th);
    const w = Math.abs(winding(path, x, y));
    const a = (((th % (TAU / 5)) + TAU / 5) % (TAU / 5));
    const light = a < TAU / 10;
    if (w === 2) return light ? P.cream : P.champ;
    if (w === 1) return light ? P.cit : P.amber;
    return P.mid;
  }, { limit: inPoly(regPoly(5, Rt + 38), 0), sym: 5, gap: 1.1 });
  return { b, palette: ['midnight', 'royal', 'citrine', 'amber', 'cream', 'champagne', 'gold'], plate: { type: 'poly', pts: regPoly(5, Rt + 72) } };
}

// Op-art checkerboard with a swelling bulge in the middle.
function warpedChecker() {
  const b = new Builder();
  const P = { onyx: 0, tanz: 1, pearl: 2, lav: 3, fu: 4, cry: 5 };
  const N = 19, U = 23, A = 0.65, S = 4.6, c0 = (N - 1) / 2;
  const map = (u, v) => { const m = 1 + A * Math.exp(-(u * u + v * v) / (S * S)); return [u * m * U, v * m * U]; };
  const e = 0.01;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const u = i - c0, v = j - c0;
    const [x, y] = map(u, v);
    const [xu, yu] = map(u + e, v), [xv, yv] = map(u, v + e);
    const r = { w: Math.hypot(xu - x, yu - y) / e, h: Math.hypot(xv - x, yv - y) / e, ang: 0 };
    const m = Math.hypot(u, v), dark = (i + j) % 2 === 0;
    const p = dark ? (m < 4.2 ? P.tanz : P.onyx) : (m < 4.2 ? P.lav : P.pearl);
    b.add('square', x, y, r.w * 0.88, r.h * 0.88, r.ang, p, { force: true });
  }
  const half = (c0 + 0.5) * U;
  frame(b, square(half + 14), 20, 'square', 14, 14, (e2, k) => (k % 2 ? P.fu : P.onyx), { force: false });
  return { b, palette: ['onyx', 'tanzanite', 'pearl', 'lavender', 'fuchsia', 'crystal'], plate: { type: 'poly', pts: square(half + 32) } };
}

// Trihexagonal (kagome) lattice: three families of lines, hexagon gems in the holes.
function kagomeWeave() {
  const b = new Builder();
  const P = { sap: 0, aqua: 1, ice: 2, gold: 3, mid: 4, cry: 5, royal: 6 };
  const e = 42, N = 3;
  const hexes = [];
  for (let q = -N; q <= N; q++) for (let r = -N; r <= N; r++) {
    if (Math.abs(q + r) > N) continue;
    hexes.push({ q, r, x: 2 * e * (q + r / 2), y: e * SQ3 * r, d: Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) });
  }
  const verts = new Map();
  for (const hx of hexes) {
    b.add('hexagon', hx.x, hx.y, 50 * 0.866, 50, PI / 6, [P.gold, P.royal, P.sap, P.mid][hx.d], { force: true });
    for (let k = 0; k < 6; k++) {
      const a0 = (k * PI) / 3, a1 = ((k + 1) * PI) / 3;
      const x0 = hx.x + e * Math.cos(a0), y0 = hx.y + e * Math.sin(a0), x1 = hx.x + e * Math.cos(a1), y1 = hx.y + e * Math.sin(a1);
      const fam = ((k % 3) + 3) % 3;
      b.add('oval', (x0 + x1) / 2, (y0 + y1) / 2, 12, 27, dirRot(x1 - x0, y1 - y0), [P.aqua, P.ice, P.cry][fam], { force: true });
      verts.set(key(x0, y0), [x0, y0]);
    }
  }
  for (const [x, y] of verts.values()) b.add('round', x, y, 12, 12, 0, P.mid, { force: true });
  // triangle holes between three mutually adjacent hexes
  const have = new Set(hexes.map((h) => h.q + ',' + h.r));
  for (const h of hexes) for (const [dq1, dr1, dq2, dr2] of [[1, 0, 0, 1], [1, -1, 1, 0]]) {
    if (!have.has(h.q + dq1 + ',' + (h.r + dr1)) || !have.has(h.q + dq2 + ',' + (h.r + dr2))) continue;
    const x = (h.x * 3 + 2 * e * (dq1 + dr1 / 2 + dq2 + dr2 / 2)) / 3, y = (h.y * 3 + e * SQ3 * (dr1 + dr2)) / 3;
    b.add('round', x, y, 9, 9, 0, P.gold, { force: true });
  }
  const R = 2 * e * N + e + 22;
  frame(b, hexPlate(R), 22, 'round', 13, 13, (ed, k) => (k % 2 ? P.royal : P.mid), { force: false });
  return { b, palette: ['sapphire', 'aqua', 'ice', 'gold', 'midnight', 'crystal', 'royal'], plate: { type: 'poly', pts: hexPlate(R + 18) } };
}

// Log cabin quilt blocks in a barn-raising layout with a double border.
function logCabin() {
  const b = new Builder();
  const P = { cream: 0, sand: 1, teal: 2, forest: 3, ruby: 4, gold: 5 };
  const pitch = 16, size = 14, n = 20, B = 2, tot = n + 2 * B;
  for (let i = 0; i < tot; i++) for (let j = 0; j < tot; j++) {
    const gi = i - B, gj = j - B;
    let p;
    if (gi < 0 || gj < 0 || gi >= n || gj >= n) {
      const m = Math.min(gi, gj, n - 1 - gi, n - 1 - gj);
      p = m === -1 ? P.ruby : ((i + j) % 2 ? P.gold : P.forest);
    } else {
      const I = Math.floor(gi / 5), J = Math.floor(gj / 5);
      let a = gi % 5, c = gj % 5;
      const sx = I < 2 ? -1 : 1, sy = J < 2 ? -1 : 1;
      const d = Math.abs(I - 1.5) + Math.abs(J - 1.5);
      const toward = d % 2 === 1;
      const dx = toward ? -sx : sx, dy = toward ? -sy : sy;
      if (dx < 0) a = 4 - a;
      if (dy < 0) c = 4 - c;
      const rr = Math.max(Math.abs(a - 2), Math.abs(c - 2));
      if (rr === 0) p = P.ruby;
      else {
        const light = a + c < 4 || (a + c === 4 && a < c);
        p = light ? (rr === 1 ? P.sand : P.cream) : (rr === 1 ? P.teal : P.forest);
      }
    }
    b.add('square', (i - (tot - 1) / 2) * pitch, (j - (tot - 1) / 2) * pitch, size, size, 0, p, { force: true });
  }
  return { b, palette: ['cream', 'sand', 'teal', 'forest', 'ruby', 'gold'], plate: { type: 'poly', pts: square((tot * pitch) / 2 + 12) } };
}

// Triangular plate: a trellis of light lines; the triangles grouped into hexagons.
function triangleTrellis() {
  const b = new Builder();
  const P = { cream: 0, rose: 1, garnet: 2, blush: 3, plum: 4, gold: 5, mauve: 6 };
  const S = 24, pitch = 19, side = S * pitch, H = (side * SQ3) / 2;
  const VA = [0, (-2 * H) / 3], VB = [-side / 2, H / 3], VC = [side / 2, H / 3];
  for (let a = 0; a <= S; a++) for (let bb = 0; bb <= S - a; bb++) {
    const c = S - a - bb;
    const x = (a * VA[0] + bb * VB[0] + c * VC[0]) / S, y = (a * VA[1] + bb * VB[1] + c * VC[1]) / S;
    const la = a % 4 === 0, lb = bb % 4 === 0, lc = c % 4 === 0, nl = la + lb + lc;
    let p, sz = 18;
    if (nl >= 2) {
      const i = a / 4, j = bb / 4, k = c / 4;
      p = (i - j) % 3 === 0 && (j - k) % 3 === 0 ? P.gold : P.mauve; sz = 15;
    } else if (nl === 1) { p = P.plum; sz = 14; }
    else {
      const A = Math.floor(a / 4), Bq = Math.floor(bb / 4), C = Math.floor(c / 4);
      const up = A + Bq + C === S / 4 - 1;
      // the hexagon this triangle belongs to: its class-0 corner
      const cand = up ? [[A + 1, Bq, C], [A, Bq + 1, C], [A, Bq, C + 1]] : [[A + 1, Bq + 1, C], [A + 1, Bq, C + 1], [A, Bq + 1, C + 1]];
      const [i, j, k] = cand.find(([i2, j2, k2]) => (i2 - j2) % 3 === 0 && (j2 - k2) % 3 === 0);
      const cls = i === 2 && j === 2 ? 0 : Math.min(i, j, k) > 0 ? 1 : 2;
      const fam = [[P.rose, P.garnet], [P.cream, P.blush], [P.blush, P.rose]][cls];
      p = fam[up ? 0 : 1];
    }
    b.add('round', x, y, sz, sz, 0, p, { force: true });
  }
  const m = 24, grow = (v) => [v[0] * (1 + (2 * m) / (H * 2 / 3)), v[1] * (1 + (2 * m) / (H * 2 / 3))];
  return { b, palette: ['cream', 'rose', 'garnet', 'blush', 'plum', 'gold', 'mauve'], plate: { type: 'poly', pts: [grow(VA), grow(VB), grow(VC)] } };
}

// ---------------------------------------------------------------- Intricate
// Asanoha (hemp leaf) screen: triangle lattice with spokes; leaves form six-point stars.
function asanoha() {
  const b = new Builder();
  const P = { indigo: 0, sap: 1, sky: 2, ice: 3, gold: 4, cream: 5, mid: 6 };
  const L = 96, M = 3;
  const pos = (q, r) => [L * (q + r / 2), (L * SQ3 * r) / 2];
  const inR = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= M;
  const cls = (q, r) => (((q - r) % 3) + 3) % 3;
  const tris = [];
  for (let q = -M; q <= M; q++) for (let r = -M; r <= M; r++) {
    const up = [[q, r], [q + 1, r], [q, r + 1]], dn = [[q + 1, r], [q, r + 1], [q + 1, r + 1]];
    for (const t of [up, dn]) if (t.every(([a, c]) => inR(a, c))) tris.push(t);
  }
  const edges = new Map();
  for (const t of tris) {
    const V = t.map(([a, c]) => pos(a, c));
    const g = [(V[0][0] + V[1][0] + V[2][0]) / 3, (V[0][1] + V[1][1] + V[2][1]) / 3];
    for (let k = 0; k < 3; k++) {
      const i = k, j = (k + 1) % 3, [ax, ay] = V[i], [bx, by] = V[j];
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const star = cls(...t[i]) === 0 ? t[i] : cls(...t[j]) === 0 ? t[j] : null;
      let p;
      if (star) { const d = Math.max(Math.abs(star[0]), Math.abs(star[1]), Math.abs(star[0] + star[1])); p = d === 0 ? P.gold : d <= 2 ? P.sky : P.sap; }
      else p = P.indigo;
      b.add('marquise', mx + 0.42 * (g[0] - mx), my + 0.42 * (g[1] - my), 13, 46, dirRot(bx - ax, by - ay), p, { force: true });
      edges.set(key(mx, my), [V[i], V[j]]);
      seg(b, g, V[k], 27, 'oval', 8, 15, P.cream, { force: true });
    }
    b.add('round', g[0], g[1], 10, 10, 0, P.ice, { force: true });
  }
  for (const [A, B] of edges.values()) seg(b, A, B, 24, 'oval', 8, 15, P.cream, { force: true });
  for (let q = -M; q <= M; q++) for (let r = -M; r <= M; r++) if (inR(q, r)) { const [x, y] = pos(q, r); b.add('round', x, y, 14, 14, 0, cls(q, r) === 0 ? P.gold : P.mid, { force: true }); }
  const R = M * L + 30;
  frame(b, hexPlate(R), 20, 'round', 13, 13, (e, k) => (k % 2 ? P.gold : P.indigo), { force: false });
  return { b, palette: ['indigo', 'sapphire', 'sky', 'ice', 'gold', 'cream', 'midnight'], plate: { type: 'poly', pts: hexPlate(R + 18) } };
}

// Honeycomb of dark gem walls; the cells glow from citrine at the heart to deep honey.
function basaltHoneycomb() {
  const b = new Builder();
  const P = { onyx: 0, slate: 1, cit: 2, topaz: 3, amber: 4, copper: 5, honey: 6, cream: 7 };
  const a = 40, N = 4;
  const cellCol = [P.cit, P.topaz, P.amber, P.copper, P.honey], ringCol = [P.cream, P.cream, P.cit, P.topaz, P.amber];
  const edges = new Map(), verts = new Map();
  for (let q = -N; q <= N; q++) for (let r = -N; r <= N; r++) {
    const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
    if (d > N) continue;
    const cx = SQ3 * a * (q + r / 2), cy = 1.5 * a * r;
    b.add('hexagon', cx, cy, 42 * 0.866, 42, 0, cellCol[d], { force: true });
    const V = [];
    for (let k = 0; k < 6; k++) { const t = PI / 6 + (k * PI) / 3; V.push([cx + a * Math.cos(t), cy + a * Math.sin(t)]); }
    V.forEach(([x, y], k) => {
      verts.set(key(x, y), [x, y]);
      const [x2, y2] = V[(k + 1) % 6];
      edges.set(key((x + x2) / 2, (y + y2) / 2), [[x, y], [x2, y2]]);
      b.add('round', cx + (x - cx) * 0.67, cy + (y - cy) * 0.67, 10, 10, 0, ringCol[d], { force: true });
    });
  }
  for (const [[x, y], [x2, y2]] of edges.values()) for (const t of [1 / 3, 2 / 3]) b.add('round', x + (x2 - x) * t, y + (y2 - y) * t, 11, 11, 0, P.onyx, { force: true });
  for (const [x, y] of verts.values()) b.add('round', x, y, 12, 12, 0, P.slate, { force: true });
  const R = N * SQ3 * a + a + 22;
  frame(b, hexPlate(R), 22, 'square', 15, 15, (e, k) => (k % 2 ? P.honey : P.onyx), { force: false });
  return { b, palette: ['onyx', 'slate', 'citrine', 'topaz', 'amber', 'copper', 'honey', 'cream'], plate: { type: 'poly', pts: hexPlate(R + 18) } };
}

// distance from (x, y) to the outline of a closed polygon
function edgeDist(pts, x, y) {
  let d = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    const ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey)));
    d = Math.min(d, Math.hypot(x - ax - t * ex, y - ay - t * ey));
  }
  return d;
}

// Star-and-cross lattice: eight-point stars with gold strapwork, crosses between.
function moorishLattice() {
  const b = new Builder();
  const P = { cobalt: 0, sky: 1, cream: 2, em: 3, forest: 4, gold: 5, mid: 6 };
  const T = 150, n = 3, Ro = T / 2 - 3, Ri = Ro * Math.cos(PI / 4) / Math.cos(PI / 8), half = (n * T) / 2;
  const stars = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) stars.push([(i - (n - 1) / 2) * T, (j - (n - 1) / 2) * T]);
  const starOf = (cx, cy) => Array.from({ length: 16 }, (_, k) => { const [x, y] = polar(k % 2 ? Ri : Ro, (k * PI) / 8); return [cx + x, cy + y]; });
  const outlines = stars.map(([cx, cy]) => starOf(cx, cy));
  for (const o of outlines) frame(b, o, 15, 'marquise', 9, 17, P.gold, { force: true });
  for (const [cx, cy] of stars) {
    const o = starOf(cx, cy);
    b.add('round', cx, cy, 30, 30, 0, P.gold, { force: true });
    ring(b, 33, 8, 'rhombus', 16, 34, P.cream, { cx, cy });
    ring(b, 31, 8, 'round', 11, 11, P.sky, { cx, cy, phase: 0.5, force: false, gap: 0.3 });
    ring(b, 44, 8, 'round', 14, 14, P.cobalt, { cx, cy, phase: 0.5, force: false, gap: 0.3 });
    ring(b, 58, 8, 'teardrop', 11, 17, P.cobalt, { cx, cy, force: false, gap: 0.3 });
    ring(b, 49, 16, 'round', 9, 9, P.cobalt, { cx, cy, phase: 0.25, force: false, gap: 0.3 });
    for (let r = 46; r < Ro; r += 10.5) {
      const m = Math.max(8, Math.round((TAU * r) / 11.6 / 8) * 8);
      for (let k = 0; k < m; k++) {
        const [dx, dy] = polar(r, ((k + 0.5) * TAU) / m), x = cx + dx, y = cy + dy;
        if (winding(o, x, y) === 0 || edgeDist(o, x, y) < 9.5) continue;
        b.add('round', x, y, 10, 10, 0, P.cobalt, { gap: 0.3 });
      }
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const cx = (i - (n - 1) / 2) * T + T / 2, cy = (j - (n - 1) / 2) * T + T / 2;
    if (Math.abs(cx) < half && Math.abs(cy) < half) b.add('square', cx, cy, 26, 26, PI / 4, P.gold, { force: true });
  }
  frame(b, square(half + 6), 18, 'square', 13, 13, (e, k) => (k % 2 ? P.gold : P.mid), { force: false });
  for (let x = -half; x <= half; x += 12) for (let y = -half; y <= half; y += 12) {
    if (outlines.some((o) => winding(o, x, y) !== 0)) continue;
    const d = Math.min(...outlines.map((o) => edgeDist(o, x, y)));
    if (d < 9.5) continue;
    b.add('round', x, y, 10.5, 10.5, 0, d < 22 ? P.forest : P.em, { gap: 0.25, limit: inPoly(square(half - 1), 0) });
  }
  return { b, palette: ['cobalt', 'sky', 'cream', 'emerald', 'forest', 'gold', 'midnight'], plate: { type: 'poly', pts: square(half + 22) } };
}

// Octagons and squares (4.8.8): each octagon glazed in concentric bands.
function octagonParquet() {
  const b = new Builder();
  const P = { burg: 0, ruby: 1, peach: 2, cream: 3, gold: 4, choc: 5, coral: 6 };
  const T = 100, n = 4, a = T / (1 + Math.SQRT2), Rc = a / (2 * Math.sin(PI / 8)), half = (n * T) / 2;
  const edges = new Map(), verts = new Map();
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const cx = (i - (n - 1) / 2) * T, cy = (j - (n - 1) / 2) * T, dark = (i + j) % 2 === 0;
    const oct = regPoly(8, Rc, PI / 8).map(([x, y]) => [cx + x, cy + y]);
    oct.forEach(([x, y], k) => { verts.set(key(x, y), [x, y]); const [x2, y2] = oct[(k + 1) % 8]; edges.set(key((x + x2) / 2, (y + y2) / 2), [[x, y], [x2, y2]]); });
    const lim = inPoly(oct, 5);
    for (let u = -4; u <= 4; u++) for (let v = -4; v <= 4; v++) {
      const x = cx + u * 13.5, y = cy + v * 13.5, m = Math.max(Math.abs(u), Math.abs(v), (Math.abs(u) + Math.abs(v)) * 0.75);
      const band = m < 0.5 ? 0 : m < 1.6 ? 1 : m < 2.4 ? 2 : m < 3.2 ? 3 : 2;
      const p = dark ? [P.gold, P.cream, P.ruby, P.burg][band] : [P.gold, P.burg, P.coral, P.peach][band];
      b.add('square', x, y, 11.5, 11.5, 0, p, { force: true, limit: lim });
    }
  }
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    const x = i * T - half, y = j * T - half;
    const edge = i === 0 || j === 0 || i === n || j === n;
    if (!edge) b.add('square', x, y, 28, 28, PI / 4, P.gold, { force: true });
  }
  for (const [A, B] of edges.values()) seg(b, A, B, 12, 'round', 9, 9, P.choc, { force: false, gap: 0.2 });
  for (const [x, y] of verts.values()) b.add('round', x, y, 9, 9, 0, P.choc, { force: false, gap: 0.2 });
  frame(b, square(half + 4), 20, 'square', 14, 14, (e, k) => (k % 2 ? P.gold : P.burg), { force: false });
  for (let x = -half; x <= half; x += 13) for (let y = -half; y <= half; y += 13) b.add('round', x, y, 10, 10, 0, P.peach, { gap: 0.8, limit: inPoly(square(half - 2), 0) });
  return { b, palette: ['burgundy', 'ruby', 'peach', 'cream', 'gold', 'chocolate', 'coral'], plate: { type: 'poly', pts: square(half + 20) } };
}

// Snub square tiling (3.3.4.3.4): tilted squares with paired triangles.
function snubSquare() {
  const b = new Builder();
  const P = { teal: 0, tq: 1, mint: 2, cream: 3, coral: 4, mid: 5, gold: 6 };
  const a = 44, al = PI / 12, Pp = 2 * a * Math.cos(al), Rs = a / Math.SQRT2, half = 268;
  const squares = [];
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
    squares.push({ x: i * Pp, y: j * Pp, r: al, A: true });
    squares.push({ x: (i + 0.5) * Pp, y: (j + 0.5) * Pp, r: -al, A: false });
  }
  const verts = new Map();
  const ok = (x, y) => Math.abs(x) <= half - 8 && Math.abs(y) <= half - 8;
  for (const s of squares) {
    s.V = [0, 1, 2, 3].map((k) => [s.x + Rs * Math.cos(s.r + PI / 4 + (k * PI) / 2), s.y + Rs * Math.sin(s.r + PI / 4 + (k * PI) / 2)]);
    for (const [x, y] of s.V) verts.set(key(x, y), [x, y]);
  }
  const V = [...verts.values()];
  const near = (p) => V.filter((q) => q !== p && Math.abs(Math.hypot(q[0] - p[0], q[1] - p[1]) - a) < 0.5);
  const tris = new Map();
  for (const p of V) {
    const nb = near(p);
    for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) {
      if (Math.abs(Math.hypot(nb[i][0] - nb[j][0], nb[i][1] - nb[j][1]) - a) > 0.5) continue;
      const cx = (p[0] + nb[i][0] + nb[j][0]) / 3, cy = (p[1] + nb[i][1] + nb[j][1]) / 3;
      tris.set(key(cx, cy), [cx, cy, [p, nb[i], nb[j]]]);
    }
  }
  const band = (x, y) => Math.max(Math.abs(x), Math.abs(y)) / half;
  const edges = new Map(), used = new Map();
  const use = (pts) => pts.forEach(([x, y], k) => { used.set(key(x, y), [x, y]); const [x2, y2] = pts[(k + 1) % pts.length]; edges.set(key((x + x2) / 2, (y + y2) / 2), [[x, y], [x2, y2]]); });
  for (const s of squares) {
    if (!s.V.every(([x, y]) => ok(x, y))) continue;
    const m = band(s.x, s.y);
    b.add('square', s.x, s.y, 25, 25, s.r, s.A ? (m < 0.4 ? P.coral : P.teal) : (m < 0.4 ? P.gold : P.tq), { force: true });
    use(s.V);
  }
  for (const [cx, cy, pts] of tris.values()) {
    if (!pts.every(([x, y]) => ok(x, y))) continue;
    b.add('round', cx, cy, 13, 13, 0, band(cx, cy) < 0.55 ? P.mid : P.teal, { force: true });
    use(pts);
  }
  for (const [A, B] of edges.values()) seg(b, A, B, 40, 'oval', 9, 24, P.cream, { force: true });
  for (const [x, y] of used.values()) b.add('round', x, y, 10, 10, 0, P.gold, { force: true });
  frame(b, square(half + 6), 20, 'square', 14, 14, (e, k) => (k % 2 ? P.gold : P.mid), { force: false });
  for (let x = -half; x <= half; x += 13) for (let y = -half; y <= half; y += 13) b.add('round', x, y, 10, 10, 0, P.mint, { gap: 0.8, limit: inPoly(square(half - 2), 0) });
  return { b, palette: ['teal', 'turquoise', 'mint', 'cream', 'coral', 'midnight', 'gold'], plate: { type: 'poly', pts: square(half + 22) } };
}

// ---------------------------------------------------------------- Expert
// Twelve-point stars on a hexagonal lattice, ruby strapwork, gold hexagons between.
function twelvePointGirih() {
  const b = new Builder();
  const P = { ruby: 0, garnet: 1, blush: 2, gold: 3, cream: 4, mid: 5, champ: 6 };
  const T = 132, M = 2, Ro = T * 0.45, Ri = Ro * 0.76;
  const stars = [];
  for (let q = -M; q <= M; q++) for (let r = -M; r <= M; r++) if (Math.abs(q + r) <= M) stars.push([T * (q + r / 2), (T * SQ3 * r) / 2, Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))]);
  const starOf = (cx, cy) => Array.from({ length: 24 }, (_, k) => { const [x, y] = polar(k % 2 ? Ri : Ro, (k * PI) / 12 + PI / 12 * 0 + PI / 2 * 0); return [cx + x, cy + y]; });
  // rotate so that tips point along the lattice directions (polar angle 90 deg = +x)
  const outlines = stars.map(([cx, cy]) => starOf(cx, cy));
  for (const o of outlines) frame(b, o, 14, 'oval', 8, 15, P.cream, { force: true });
  stars.forEach(([cx, cy, d], si) => {
    const o = outlines[si];
    b.add('round', cx, cy, 30, 30, 0, P.gold, { force: true });
    ring(b, 31, 12, 'rhombus', 12, 32, d === 0 ? P.gold : P.ruby, { cx, cy });
    ring(b, 27, 12, 'round', 8, 8, P.cream, { cx, cy, phase: 0.5, force: false, gap: 0.3 });
    ring(b, 36, 12, 'round', 9, 9, d === 0 ? P.ruby : P.blush, { cx, cy, phase: 0.5, force: false, gap: 0.3 });
    for (let r = 46; r < Ro; r += 10.5) {
      const m = Math.max(12, Math.round((TAU * r) / 11.4 / 12) * 12);
      for (let k = 0; k < m; k++) {
        const [dx, dy] = polar(r, ((k + 0.5) * TAU) / m), x = cx + dx, y = cy + dy;
        if (winding(o, x, y) === 0 || edgeDist(o, x, y) < 9) continue;
        b.add('round', x, y, 9.5, 9.5, 0, d === 0 ? P.ruby : r < 50 ? P.ruby : P.garnet, { gap: 0.3 });
      }
    }
  });
  // gold hexagons at the triangular gaps between three stars
  const have = new Set(stars.map(([x, y]) => key(x, y)));
  const gaps = [];
  for (const [cx, cy] of stars) for (const k of [0, 1]) {
    const a1 = k * PI / 3, a2 = a1 + PI / 3;
    const n1 = [cx + T * Math.cos(a1), cy + T * Math.sin(a1)], n2 = [cx + T * Math.cos(a2), cy + T * Math.sin(a2)];
    if (have.has(key(...n1)) && have.has(key(...n2))) gaps.push([(cx + n1[0] + n2[0]) / 3, (cy + n1[1] + n2[1]) / 3]);
  }
  for (const [x, y] of gaps) { b.add('hexagon', x, y, 22 * 0.866, 22, PI / 6, P.gold, { force: true }); ring(b, 17, 6, 'round', 8, 8, P.champ, { cx: x, cy: y, phase: 0.5, force: false, gap: 0.3 }); }
  const R = 2 * T + Ro + 44;
  const plate = hexPlate(R);
  const near = (x, y) => { let bi = 0, bd = Infinity; stars.forEach(([cx, cy], i) => { const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
  fillGaps(b, R, 9, 11, (x, y) => (winding(outlines[near(x, y)], x, y) !== 0 ? P.garnet : P.mid), inPoly(plate, 16));
  frame(b, hexPlate(R - 8), 18, 'square', 12, 12, (e, k) => (k % 2 ? P.gold : P.garnet), { force: false });
  return { b, palette: ['ruby', 'garnet', 'blush', 'gold', 'cream', 'midnight', 'champagne'], plate: { type: 'poly', pts: hexPlate(R + 10) } };
}

// Nine Ohio star quilt blocks of square gems with sashing and a border.
function ohioStars() {
  const b = new Builder();
  const P = { navy: 0, ruby: 1, cream: 2, gold: 3, sand: 4, sky: 5, garnet: 6 };
  const blk = 12, nb = 3, tot = nb * blk + (nb - 1) + 4, pitch = 13, size = 11.6;
  for (let i = 0; i < tot; i++) for (let j = 0; j < tot; j++) {
    const gi = i - 2, gj = j - 2, span = nb * blk + nb - 1;
    let p;
    if (gi < 0 || gj < 0 || gi >= span || gj >= span) { const m = Math.min(gi, gj, span - 1 - gi, span - 1 - gj); p = m === -1 ? P.gold : ((i + j) % 2 ? P.garnet : P.navy); }
    else {
      const si = gi % (blk + 1), sj = gj % (blk + 1);
      if (si === blk || sj === blk) p = si === blk && sj === blk ? P.gold : P.navy;
      else {
        const I = Math.floor(gi / (blk + 1)), J = Math.floor(gj / (blk + 1));
        const star = (I + J) % 2 ? P.navy : P.ruby, inner = (I + J) % 2 ? P.sky : P.sand;
        const pi = Math.floor(si / 4), pj = Math.floor(sj / 4), u = si % 4, v = sj % 4;
        if (pi !== 1 && pj !== 1) p = P.cream;
        else if (pi === 1 && pj === 1) p = (u === 1 || u === 2) && (v === 1 || v === 2) ? P.gold : inner;
        else {
          // quarter-square triangle unit; rotate so the outer side is the top
          let a = u, c = v;
          if (pj === 2) { a = 3 - u; c = 3 - v; } else if (pi === 0) { a = 3 - v; c = u; } else if (pi === 2) { a = v; c = 3 - u; }
          if ((a === 1 || a === 2) && c === 0) p = P.cream; // outer triangle
          else if ((a === 1 || a === 2) && c >= 2) p = inner; // inner triangle
          else p = star;
        }
      }
    }
    b.add('square', (i - (tot - 1) / 2) * pitch, (j - (tot - 1) / 2) * pitch, size, size, 0, p, { force: true });
  }
  return { b, palette: ['midnight', 'ruby', 'cream', 'gold', 'sand', 'sky', 'garnet'], plate: { type: 'poly', pts: square((tot * pitch) / 2 + 12) } };
}

// Rhombitrihexagonal tiling (3.4.6.4): lapis hexagons, pale squares, gold triangles.
function lapisTessellation() {
  const b = new Builder();
  const P = { cobalt: 0, royal: 1, sap: 2, ice: 3, gold: 4, cream: 5, mid: 6 };
  const a = 40, D = a * (1 + SQ3), M = 4;
  const hexes = [];
  for (let q = -M; q <= M; q++) for (let r = -M; r <= M; r++) if (Math.abs(q + r) <= M) hexes.push({ q, r, x: D * (q + r / 2), y: (D * SQ3 * r) / 2, d: Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) });
  const have = new Set(hexes.map((h) => h.q + ',' + h.r));
  for (const h of hexes) {
    b.add('hexagon', h.x, h.y, 46 * 0.866, 46, 0, h.d === 0 ? P.gold : h.d % 2 ? P.cobalt : P.royal, { force: true });
    ring(b, 31, 12, 'round', 9.5, 9.5, (i) => (i % 2 ? P.gold : (h.d === 0 ? P.cream : P.ice)), { cx: h.x, cy: h.y, phase: 0 });
    for (const [dq, dr] of [[1, 0], [0, 1], [-1, 1]]) {
      if (!have.has(h.q + dq + ',' + (h.r + dr))) continue;
      const nx = D * (h.q + dq + (h.r + dr) / 2), ny = (D * SQ3 * (h.r + dr)) / 2;
      b.add('square', (h.x + nx) / 2, (h.y + ny) / 2, 27, 27, Math.atan2(ny - h.y, nx - h.x), h.d + Math.max(Math.abs(h.q + dq), Math.abs(h.r + dr), Math.abs(h.q + dq + h.r + dr)) <= 1 ? P.gold : P.sap, { force: true });
    }
    for (const [dq1, dr1, dq2, dr2] of [[1, 0, 0, 1], [1, -1, 1, 0]]) {
      if (!have.has(h.q + dq1 + ',' + (h.r + dr1)) || !have.has(h.q + dq2 + ',' + (h.r + dr2))) continue;
      const x = h.x + (D * (dq1 + dr1 / 2 + dq2 + dr2 / 2)) / 3, y = h.y + (D * SQ3 * (dr1 + dr2)) / 6;
      b.add('round', x, y, 14, 14, 0, P.cream, { force: true });
    }
  }
  const R = M * D + a + 16;
  frame(b, hexPlate(R), 20, 'round', 12, 12, (e, k) => (k % 2 ? P.gold : P.mid), { force: false });
  return { b, palette: ['cobalt', 'royal', 'sapphire', 'ice', 'gold', 'cream', 'midnight'], plate: { type: 'poly', pts: hexPlate(R + 16) } };
}

// Bargello needlework: columns of upright stitches stepped into a mirrored flame.
function bargelloFlame() {
  const b = new Builder();
  const P = { burg: 0, ruby: 1, coral: 2, tang: 3, topaz: 4, plum: 5, cream: 6 };
  const cols = 47, cw = 11.5, Hs = 28, half = 262;
  const seq = [P.plum, P.burg, P.ruby, P.coral, P.tang, P.topaz, P.cream, P.topaz, P.tang, P.coral, P.ruby, P.burg];
  const shape = [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1];
  for (let c = 0; c < cols; c++) {
    const cc = Math.abs(c - (cols - 1) / 2);
    const x = (c - (cols - 1) / 2) * cw, w = -(Hs * 0.62) * shape[Math.round(cc) % shape.length] + 60;
    for (let k = -14; k <= 14; k++) {
      let y0 = w + k * Hs - Hs / 2 + 1.5, y1 = y0 + Hs - 3;
      y0 = Math.max(y0, -half); y1 = Math.min(y1, half);
      if (y1 - y0 < 12) continue;
      b.add('oval', x, (y0 + y1) / 2, 9.6, y1 - y0, 0, seq[((k % 12) + 12) % 12], { force: true });
    }
  }
  const hx = ((cols - 1) / 2) * cw + 18;
  frame(b, [[-hx, -half - 16], [hx, -half - 16], [hx, half + 16], [-hx, half + 16]], 22, 'square', 15, 15, (e, k) => (k % 2 ? P.topaz : P.burg), { force: false });
  return { b, palette: ['burgundy', 'ruby', 'coral', 'tangerine', 'topaz', 'plum', 'cream'], plate: { type: 'poly', pts: [[-hx - 18, -half - 34], [hx + 18, -half - 34], [hx + 18, half + 34], [-hx - 18, half + 34]] } };
}

// ---------------------------------------------------------------- Master
// Penrose rhombus tiling from de Bruijn's pentagrid, five-fold symmetric about the centre.
function penroseRhombs() {
  const b = new Builder();
  const P = { mid: 0, teal: 1, aqua: 2, gold: 3, cream: 4, sap: 5, ice: 6, cit: 7 };
  const a = 17, g = 0.2, K = 34, Rd = 470;
  const E = [0, 1, 2, 3, 4].map((j) => [Math.cos((j * TAU) / 5 - PI / 2), Math.sin((j * TAU) / 5 - PI / 2)]);
  const dec = regPoly(10, Rd, PI / 10), lim = (x, y) => polyIn(dec, x, y);
  for (let j = 0; j < 5; j++) for (let k = j + 1; k < 5; k++) {
    const [ejx, ejy] = E[j], [ekx, eky] = E[k], det = ejx * eky - ejy * ekx;
    const thick = k - j === 1 || k - j === 4;
    for (let nj = -K; nj <= K; nj++) for (let nk = -K; nk <= K; nk++) {
      const pj = nj - g, pk = nk - g;
      const x = (pj * eky - pk * ejy) / det, y = (ejx * pk - ekx * pj) / det;
      let cx = (nj + 0.5) * ejx + (nk + 0.5) * ekx, cy = (nj + 0.5) * ejy + (nk + 0.5) * eky;
      for (let i = 0; i < 5; i++) if (i !== j && i !== k) { const Ki = Math.ceil(x * E[i][0] + y * E[i][1] + g); cx += Ki * E[i][0]; cy += Ki * E[i][1]; }
      cx *= a; cy *= a;
      const r = Math.hypot(cx, cy);
      if (r > Rd) continue;
      const [lx, ly] = thick ? [ejx + ekx, ejy + eky] : [ejx - ekx, ejy - eky];
      const hl = Math.hypot(lx, ly), hs = thick ? 2 * Math.sin(PI / 5) : 2 * Math.sin(PI / 10);
      if (lim(cx, cy) < (hl * a) / 2) continue;
      const t = r / Rd, ring = Math.floor(t * 7);
      let p;
      if (thick) p = [P.gold, P.teal, P.aqua, P.teal, P.sap, P.teal, P.sap][ring];
      else p = ring === 0 ? P.cit : P.cream;
      b.add('rhombus', cx, cy, hs * a * 0.88, hl * a * 0.9, dirRot(lx, ly), p, { force: true });
    }
  }
  const dec2 = regPoly(10, Rd + 4, PI / 10);
  fillGaps(b, Rd + 4, 9, 10, (x, y) => (polyIn(dec, x, y) > 22 ? null : P.mid), (x, y, r) => polyIn(dec2, x, y) >= r + 1);
  frame(b, regPoly(10, Rd + 14, PI / 10), 20, 'square', 14, 14, (e, k, n) => (k === 0 ? P.gold : P.mid), { force: false });
  return { b, palette: ['midnight', 'teal', 'aqua', 'gold', 'cream', 'sapphire', 'ice', 'citrine'], plate: { type: 'poly', pts: regPoly(10, Rd + 36, PI / 10) } };
}

// A checkerboard wrapped onto a sphere: cells swell at the centre and crowd toward the rim.
function checkeredSphere() {
  const b = new Builder();
  const P = { mid: 0, cobalt: 1, royal: 2, cry: 3, ice: 4, sky: 5, gold: 6 };
  const rho = 29, Rm = 540, th = (65 * PI) / 180, sn = Math.sin(th);
  const map = (u, v) => { const r = Math.hypot(u, v); if (r < 1e-9) return [0, 0]; const s = (Rm * Math.sin((r / rho) * th)) / (sn * r); return [u * s, v * s]; };
  const N = 2 * rho + 2, e = 0.01;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const u = i - (N - 1) / 2, v = j - (N - 1) / 2, t = Math.hypot(u, v) / rho;
    if (t > 1) continue;
    const [x, y] = map(u, v), [xu, yu] = map(u + e, v), [xv, yv] = map(u, v + e);
    const w = Math.hypot(xu - x, yu - y) / e, h = Math.hypot(xv - x, yv - y) / e;
    const dark = (Math.floor(i / 2) + Math.floor(j / 2)) % 2 === 0;
    const p = dark ? (t < 0.5 ? P.cobalt : P.mid) : (t < 0.5 ? P.cry : t < 0.85 ? P.ice : P.sky);
    b.add('square', x, y, Math.max(8, w * 0.86), Math.max(8, h * 0.86), 0, p, { force: true });
  }
  ring(b, Rm + 16, 150, 'round', 14, 14, (k) => (k % 2 ? P.gold : P.mid), { force: false, gap: 0.3 });
  ring(b, Rm + 40, 120, 'teardrop', 16, 26, (k) => (k % 2 ? P.cobalt : P.sky), { force: false, gap: 0.3 });
  return { b, palette: ['midnight', 'cobalt', 'royal', 'crystal', 'ice', 'sky', 'gold'], plate: { type: 'circle', r: Rm + 64 } };
}

// Tartan woven in a 2/2 twill: each gem shows the warp or the weft thread colour.
function highlandTartan() {
  const b = new Builder();
  const P = { ruby: 0, mid: 1, forest: 2, cream: 3, gold: 4, garnet: 5 };
  const half = [[P.ruby, 5], [P.mid, 1], [P.ruby, 1], [P.forest, 7], [P.gold, 1], [P.mid, 7], [P.cream, 1], [P.ruby, 4]];
  const outw = []; for (const [p, n] of half) for (let k = 0; k < n; k++) outw.push(p);
  const N = 2 * outw.length - 1, c0 = outw.length - 1, pitch = 11.4;
  const col = (i) => outw[Math.abs(i - c0)];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const warp = (((i + j) % 4) + 4) % 4 < 2;
    b.add('oval', (i - c0) * pitch, (j - c0) * pitch, 9.4, 11.2, warp ? 0 : PI / 2, warp ? col(i) : col(j), { force: true });
  }
  const h = (N * pitch) / 2;
  frame(b, square(h + 9), 16, 'square', 12, 12, (e, k) => (k % 2 ? P.gold : P.garnet), { force: false });
  frame(b, square(h + 27), 17, 'square', 13, 13, P.mid, { force: false });
  return { b, palette: ['ruby', 'midnight', 'forest', 'cream', 'gold', 'garnet'], plate: { type: 'poly', pts: square(h + 46) } };
}

export const ENTRIES = [
  { id: 'wicker-basket', version: 1, name: 'Wicker Basketweave', category: 'geometric', difficulty: 'Beginner', build: wickerBasket },
  { id: 'pinwheel-quilt', version: 1, name: 'Pinwheel Quilt', category: 'geometric', difficulty: 'Beginner', build: pinwheelQuilt },
  { id: 'octagon-lantern', version: 1, name: 'Octagon Lantern', category: 'geometric', difficulty: 'Beginner', build: octagonLantern },
  { id: 'heptagram-plate', version: 1, name: 'Heptagram Plate', category: 'geometric', difficulty: 'Beginner', build: heptagramPlate },
  { id: 'herringbone-parquet', version: 1, name: 'Herringbone Parquet', category: 'geometric', difficulty: 'Medium', build: herringbone },
  { id: 'golden-pentagram', version: 1, name: 'Golden Pentagram', category: 'geometric', difficulty: 'Medium', build: goldenPentagram },
  { id: 'warped-checker', version: 1, name: 'Warped Checkerboard', category: 'geometric', difficulty: 'Medium', build: warpedChecker },
  { id: 'kagome-weave', version: 1, name: 'Kagome Weave', category: 'geometric', difficulty: 'Medium', build: kagomeWeave },
  { id: 'log-cabin', version: 1, name: 'Log Cabin Quilt', category: 'geometric', difficulty: 'Medium', build: logCabin },
  { id: 'triangle-trellis', version: 1, name: 'Triangle Trellis', category: 'geometric', difficulty: 'Medium', build: triangleTrellis },
  { id: 'asanoha-screen', version: 1, name: 'Asanoha Screen', category: 'geometric', difficulty: 'Intricate', build: asanoha },
  { id: 'basalt-honeycomb', version: 1, name: 'Basalt Honeycomb', category: 'geometric', difficulty: 'Intricate', build: basaltHoneycomb },
  { id: 'moorish-lattice', version: 1, name: 'Moorish Lattice', category: 'geometric', difficulty: 'Intricate', build: moorishLattice },
  { id: 'octagon-parquet', version: 1, name: 'Octagon Parquet', category: 'geometric', difficulty: 'Intricate', build: octagonParquet },
  { id: 'snub-square', version: 1, name: 'Snub Square Mosaic', category: 'geometric', difficulty: 'Intricate', build: snubSquare },
  { id: 'twelve-point-girih', version: 1, name: 'Twelve-Point Girih', category: 'geometric', difficulty: 'Expert', build: twelvePointGirih },
  { id: 'ohio-star-sampler', version: 1, name: 'Ohio Star Sampler', category: 'geometric', difficulty: 'Expert', build: ohioStars },
  { id: 'lapis-tessellation', version: 1, name: 'Lapis Tessellation', category: 'geometric', difficulty: 'Expert', build: lapisTessellation },
  { id: 'bargello-flame', version: 1, name: 'Bargello Flame', category: 'geometric', difficulty: 'Expert', build: bargelloFlame },
  { id: 'penrose-rhombs', version: 1, name: 'Penrose Rhombs', category: 'geometric', difficulty: 'Master', build: penroseRhombs },
  { id: 'checkered-sphere', version: 1, name: 'Checkered Sphere', category: 'geometric', difficulty: 'Master', build: checkeredSphere },
  { id: 'highland-tartan', version: 1, name: 'Highland Tartan', category: 'geometric', difficulty: 'Master', build: highlandTartan },
];

CATALOG.push(...ENTRIES);
CATALOG.sort((a, c) => LEVEL[a.difficulty] - LEVEL[c.difficulty]);
