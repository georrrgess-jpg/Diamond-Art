// Collection 8: expert and master curves, spirals, packings and fractals
// Authored artworks registered into the shared catalog. Deterministic only.
import { Builder, ring, fillRings, fold, inDisc, polar, GEMS, CATALOG, LEVEL, SQ3, square } from './artworks.js';
import { rng, alongCurve, alongPoly, hexPack, orbitPack, pascalMod, hexPlate } from './collection2.js';

const TAU = Math.PI * 2;
const PI = Math.PI;

// ---------------------------------------------------------------- helpers
// rectangular grid of square gems, fn(i, j, u, v) -> palette index or null (u, v centred cell coords)
function grid(b, nx, ny, pitch, size, fn, rot = 0) {
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const u = i - (nx - 1) / 2, v = j - (ny - 1) / 2, p = fn(i, j, u, v);
    if (p != null) b.add('square', u * pitch, v * pitch, size, size, rot, p, { force: true });
  }
}
const rect = (hx, hy) => [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]];
// positions of concentric staggered rows (same lattice as fillRings) -> [[r, th, row, i, n]]
function ringSlots(R0, R1, size, { gap = 1.07, rowGap = 1.09, sym = 1 } = {}) {
  const out = [];
  let row = 0;
  for (let r = R0 + size / 2; r <= R1 - size / 2 + 0.01; r += size * rowGap, row++) {
    let n = Math.max(1, Math.floor((TAU * r) / (size * gap)));
    if (sym > 1) n = Math.max(sym, Math.floor(n / sym) * sym);
    const ph = (row % 2) * 0.5;
    for (let i = 0; i < n; i++) out.push([r, ((i + ph) / n) * TAU, row, i, n]);
  }
  return out;
}
// Bessel function of the first kind (integer order) by Bessel's integral
function besselJ(n, x) {
  const N = 48;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const t = (PI * i) / N, w = i === 0 || i === N ? 0.5 : 1;
    s += w * Math.cos(n * t - x * Math.sin(t));
  }
  return s / N;
}
function besselZero(n, k) {
  let found = 0, prev = besselJ(n, 0.5);
  for (let x = 0.5 + 0.05; x < 60; x += 0.05) {
    const cur = besselJ(n, x);
    if (prev * cur < 0) {
      let lo = x - 0.05, hi = x;
      for (let it = 0; it < 30; it++) { const m = (lo + hi) / 2; if (besselJ(n, lo) * besselJ(n, m) <= 0) hi = m; else lo = m; }
      if (++found === k) return (lo + hi) / 2;
    }
    prev = cur;
  }
  return 1;
}

// ---------------------------------------------------------------- Expert
// Golden rectangle cut into Fibonacci squares on a 55 x 34 grid; each square holds a quarter
// disc of six concentric bands, and the arcs join into one continuous gold spiral.
function fibonacciPanels() {
  const b = new Builder();
  const P = { mid: 0, cob: 1, sky: 2, ice: 3, gold: 4, honey: 5, champ: 6, cream: 7 };
  const W = 55, H = 34, pitch = 10.9, size = 10;
  const sq = [];
  let x = 0, y = 0, w = W, h = H, dir = 0;
  while (w > 0 && h > 0) {
    const s = Math.min(w, h);
    let X, Y, cx, cy;
    if (dir === 0) { X = x; Y = y; cx = X + s; cy = Y + s; x += s; w -= s; }
    else if (dir === 1) { X = x; Y = y; cx = X; cy = Y + s; y += s; h -= s; }
    else if (dir === 2) { X = x + w - s; Y = y; cx = X; cy = Y; w -= s; }
    else { X = x; Y = y + h - s; cx = X + s; cy = Y; h -= s; }
    sq.push({ X, Y, s, cx, cy, k: sq.length });
    dir = (dir + 1) % 4;
  }
  const cool = [P.cob, P.ice, P.sky, P.cob, P.ice, P.cream], warm = [P.honey, P.cream, P.champ, P.honey, P.cream, P.ice];
  grid(b, W, H, pitch, size, (i, j) => {
    const px = i + 0.5, py = j + 0.5;
    const q = sq.find((o) => px > o.X && px < o.X + o.s && py > o.Y && py < o.Y + o.s);
    const d = Math.hypot(px - q.cx, py - q.cy);
    if (Math.abs(d - q.s) < 0.62 || q.s <= 2) return P.gold;
    if (d > q.s) return q.k % 2 ? P.honey : P.mid;
    if (q.s >= 5 && (px - q.X < 1 || py - q.Y < 1 || q.X + q.s - px < 1 || q.Y + q.s - py < 1)) return q.k % 2 ? P.honey : P.mid;
    const fam = q.k % 2 ? warm : cool;
    return fam[Math.min(5, Math.floor(6 * (1 - d / q.s)))];
  });
  const hx = (W * pitch) / 2, hy = (H * pitch) / 2;
  return { b, palette: ['midnight', 'cobalt', 'sky', 'ice', 'gold', 'honey', 'champagne', 'cream'], plate: { type: 'poly', pts: rect(hx + 16, hy + 16) } };
}

// Chladni figure of a free square plate: sand-gold nodal lines on dark vibrating lobes.
function chladniPlate() {
  const b = new Builder();
  const P = { onyx: 0, plum: 1, ind: 2, tanz: 3, gold: 4, cream: 5, lav: 6 };
  const H = 286, n = 3, m = 7;
  hexPack(b, 14.6, 23, 13.2, (x, y) => {
    if (Math.abs(x) > H - 6 || Math.abs(y) > H - 6) return null;
    const X = (x / H + 1) / 2, Y = (y / H + 1) / 2;
    const f = (Math.cos(n * PI * X) * Math.cos(m * PI * Y) + Math.cos(m * PI * X) * Math.cos(n * PI * Y)) / 2;
    const a = Math.abs(f);
    if (a < 0.085) return P.cream;
    if (a < 0.19) return P.gold;
    if (f > 0) return a < 0.45 ? P.tanz : a < 0.75 ? P.ind : P.lav;
    return a < 0.45 ? P.plum : P.onyx;
  });
  alongPoly(b, square(H + 6), 15, 'square', 11, 11, P.gold, { force: true });
  return { b, palette: ['onyx', 'plum', 'indigo', 'tanzanite', 'gold', 'cream', 'lavender'], plate: { type: 'poly', pts: square(H + 22) } };
}

// Euler (Cornu) spiral: an S-curve whose curvature grows steadily until it coils into two eyes.
// Bands of constant distance from the curve shade warm on one side and cool on the other.
function cornuSpiral() {
  const b = new Builder();
  const P = { mid: 0, cob: 1, sky: 2, ice: 3, gold: 4, coral: 5, peach: 6, garnet: 7 };
  const H = 288, T = 3.7, N = 3000, sc = 330;
  const pts = [];
  // integrate from the centre outwards in both directions (the curve is point-symmetric)
  let x = 0, y = 0;
  const half = [[0, 0]];
  for (let i = 1; i <= N; i++) {
    const t0 = (T * (i - 1)) / N, t1 = (T * i) / N, tm = (t0 + t1) / 2, dt = t1 - t0;
    x += Math.cos(tm * tm) * dt; y += Math.sin(tm * tm) * dt;
    half.push([x, y]);
  }
  const rot = ([u, v]) => [u * sc, -v * sc];
  for (let i = N; i > 0; i--) { const [u, v] = half[i]; pts.push(rot([-u, -v])); }
  for (let i = 0; i <= N; i++) pts.push(rot(half[i]));
  // spatial buckets for nearest-point queries
  const cell = 24, buck = new Map();
  pts.forEach(([px, py], i) => { const k = Math.floor(px / cell) + ',' + Math.floor(py / cell); (buck.get(k) || buck.set(k, []).get(k)).push(i); });
  const nearest = (qx, qy) => {
    let bi = -1, bd = Infinity;
    for (let rad = 1; rad <= 12 && (bi < 0 || bd > (rad - 1) * cell); rad++) {
      const gx = Math.floor(qx / cell), gy = Math.floor(qy / cell);
      for (let a = gx - rad; a <= gx + rad; a++) for (let e = gy - rad; e <= gy + rad; e++) {
        for (const i of buck.get(a + ',' + e) || []) { const d = Math.hypot(pts[i][0] - qx, pts[i][1] - qy); if (d < bd) { bd = d; bi = i; } }
      }
    }
    return [bi, bd];
  };
  const warm = [P.peach, P.coral, P.garnet, P.coral], cool = [P.ice, P.sky, P.cob, P.sky];
  hexPack(b, 14.9, 23, 13.5, (qx, qy) => {
    if (Math.abs(qx) > H - 6 || Math.abs(qy) > H - 6) return null;
    const [i, d] = nearest(qx, qy);
    if (d < 8) return P.gold;
    const j = Math.min(pts.length - 2, i), tx = pts[j + 1][0] - pts[j][0], ty = pts[j + 1][1] - pts[j][1];
    const side = tx * (qy - pts[j][1]) - ty * (qx - pts[j][0]) > 0;
    const k = Math.floor((d - 8) / 22);
    return (side ? warm : cool)[k % 4];
  });
  alongPoly(b, square(H + 7), 15, 'square', 11, 11, P.gold, { force: true });
  return { b, palette: ['midnight', 'cobalt', 'sky', 'ice', 'gold', 'coral', 'peach', 'garnet'], plate: { type: 'poly', pts: square(H + 23) } };
}

// Doyle spiral generators a, b (as complex numbers, with a^p = b^q): circles at a^m b^n of radius
// rho |a^m b^n| are tangent to their six neighbours. Grid search, then Newton refinement.
function doyleSolve(p, q) {
  const F = (A, al) => {
    const B = Math.pow(A, p / q), be = (p * al + TAU) / q;
    const ax = A * Math.cos(al), ay = A * Math.sin(al), bx = B * Math.cos(be), by = B * Math.sin(be);
    const rho = Math.hypot(ax - 1, ay) / (1 + A);
    return { e: [Math.hypot(bx - 1, by) - rho * (1 + B), Math.hypot(bx - ax, by - ay) - rho * (A + B)], rho, ax, ay, bx, by };
  };
  let best = null, bv = Infinity;
  for (let A = 1.01; A < 3; A += 0.01) for (let al = -PI; al < PI; al += 0.02) {
    const { e } = F(A, al), v = Math.abs(e[0]) + Math.abs(e[1]);
    if (v < bv) { bv = v; best = [A, al]; }
  }
  let [A, al] = best;
  for (let it = 0; it < 40; it++) {
    const f0 = F(A, al).e, hh = 1e-7;
    const fa = F(A + hh, al).e, fb = F(A, al + hh).e;
    const j11 = (fa[0] - f0[0]) / hh, j12 = (fb[0] - f0[0]) / hh, j21 = (fa[1] - f0[1]) / hh, j22 = (fb[1] - f0[1]) / hh;
    const det = j11 * j22 - j12 * j21;
    if (!det) break;
    A -= (j22 * f0[0] - j12 * f0[1]) / det; al -= (-j21 * f0[0] + j11 * f0[1]) / det;
  }
  return F(A, al);
}
// Doyle spiral: every circle touches six others and the sizes grow logarithmically outward
// along two opposed families of spiral arms; the larger circles are set as bezels.
function doyleSpiral() {
  const b = new Builder();
  const P = { mid: 0, tanz: 1, peri: 2, lav: 3, pearl: 4, gold: 5, fu: 6, ind: 7 };
  const p = -13, q = 21, D = doyleSolve(p, q), rho = D.rho, R = 330;
  const cmul = (u, v) => [u[0] * v[0] - u[1] * v[1], u[0] * v[1] + u[1] * v[0]];
  const cpow = (z, n) => { const r = Math.pow(Math.hypot(z[0], z[1]), n), t = Math.atan2(z[1], z[0]) * n; return [r * Math.cos(t), r * Math.sin(t)]; };
  const a = [D.ax, D.ay], bb = [D.bx, D.by], circles = [];
  for (let n = 0; n < q; n++) for (let m = -150; m <= 150; m++) {
    const z = cmul(cpow(a, m), cpow(bb, n)), mod = Math.hypot(z[0], z[1]);
    const rr = rho * mod * R, cx = z[0] * R, cy = z[1] * R;
    if (Math.hypot(cx, cy) + rr > R || rr * 2 * 0.92 < 8.4) continue;
    circles.push({ x: cx, y: cy, r: rr, m, n });
  }
  // seven neighbouring arms of one family form a shaded band; three bands sweep round
  const band = [P.gold, P.pearl, P.lav, P.peri, P.tanz, P.ind, P.peri];
  const lite = { [P.gold]: P.pearl, [P.pearl]: P.lav, [P.lav]: P.pearl, [P.peri]: P.lav, [P.tanz]: P.peri, [P.ind]: P.tanz };
  for (const c of circles) {
    const p0 = band[((c.n % 7) + 7) % 7], th = Math.atan2(c.x, -c.y);
    if (c.r >= 21) {
      const rr = c.r - 4.9, nG = Math.floor((TAU * rr) / 10.2);
      ring(b, rr, nG, 'round', 8.6, 8.6, p0, { cx: c.x, cy: c.y, start: th, orient: 'tan' });
      const ir = (c.r - 10.2) * 2 * 0.95;
      b.add('round', c.x, c.y, ir, ir, th, lite[p0], { force: true });
    } else b.add('round', c.x, c.y, c.r * 2 * 0.92, c.r * 2 * 0.92, th, p0, { force: true });
  }
  let rin = Infinity; for (const c of circles) rin = Math.min(rin, Math.hypot(c.x, c.y) - c.r);
  const rc = (rin - 1) * 2 * 0.9;
  b.add('round', 0, 0, rc, rc, 0, P.gold, { force: true });
  fillRings(b, R - 40, R, 9, (r, th) => (r > R - 14 ? P.ind : P.mid), { limit: inDisc(R), gap: 1.1, rowGap: 1.09 });
  ring(b, R + 11, 112, 'round', 13, 13, (i) => (i % 2 ? P.gold : P.tanz), { force: false, gap: 0.3 });
  return { b, palette: ['midnight', 'tanzanite', 'periwinkle', 'lavender', 'pearl', 'gold', 'fuchsia', 'indigo'], plate: { type: 'circle', r: R + 30 } };
}

// Filled Julia set of the period-three bulb (c = -0.123 + 0.745i) on a twofold polar lattice:
// interior basins take the colour of the attracting cycle point they settle on, and smooth
// escape-time bands ring the filigree.
function juliaFiligree() {
  const b = new Builder();
  const P = { mid: 0, ind: 1, tanz: 2, peri: 3, lav: 4, coral: 5, gold: 6, fu: 7 };
  const R = 318, S = 1.42 / R, cr = -0.123, ci = 0.745, N = 240;
  // attracting 3-cycle
  let cx = 0, cy = 0;
  for (let i = 0; i < 3000; i++) { const t = cx * cx - cy * cy + cr; cy = 2 * cx * cy + ci; cx = t; }
  const cyc = [];
  for (let k = 0; k < 3; k++) { cyc.push([cx, cy]); const t = cx * cx - cy * cy + cr; cy = 2 * cx * cy + ci; cx = t; }
  const inner = [P.gold, P.fu, P.coral];
  b.add('round', 0, 0, 15, 15, 0, P.gold, { force: true });
  fillRings(b, 8, R, 12.2, (r, th) => {
    const [px, py] = polar(r, th);
    let x = px * S, y = -py * S, i = 0;
    for (; i < N && x * x + y * y < 64; i++) { const t = x * x - y * y + cr; y = 2 * x * y + ci; x = t; }
    if (i === N) {
      let k = 0, bd = Infinity;
      cyc.forEach(([u, v], j) => { const d = Math.hypot(x - u, y - v); if (d < bd) { bd = d; k = j; } });
      return inner[k];
    }
    const nu = i + 1 - Math.log2(Math.log(Math.hypot(x, y)));
    return nu < 2.6 ? P.mid : nu < 3.6 ? P.ind : nu < 5 ? P.tanz : nu < 7.5 ? P.peri : P.lav;
  }, { limit: inDisc(R), sym: 2, rowGap: 1.09, gap: 1.09 });
  ring(b, R + 12, 96, 'round', 14, 14, (i) => (i % 2 ? P.gold : P.ind), { force: false, gap: 0.3 });
  return { b, palette: ['midnight', 'indigo', 'tanzanite', 'periwinkle', 'lavender', 'coral', 'gold', 'fuchsia'], plate: { type: 'circle', r: R + 32 } };
}

// Times-table caustic: chords from angle t to angle 7t fill the disc. The density of chords
// through each point is shaded in bands and their six-cusped envelope is traced in gold.
function causticCrown() {
  const b = new Builder();
  const P = { mid: 0, sap: 1, royal: 2, sky: 3, ice: 4, cry: 5, gold: 6, cit: 7 };
  const R = 300, M = 7, NS = 900;
  const A = [], B = [];
  for (let k = 0; k < NS; k++) { const t = (TAU * k) / NS; A.push(polar(R, t)); B.push(polar(R, M * t)); }
  const dens = (x, y) => {
    let s = 0, prev = null;
    for (let k = 0; k <= NS; k++) {
      const i = k % NS, [ax, ay] = A[i], [bx, by] = B[i], L = Math.hypot(bx - ax, by - ay) || 1e-9;
      const d = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / L;
      if (prev != null && prev * d <= 0 && Math.abs(prev - d) < R) s += 1 / Math.max(Math.abs(d - prev) * NS / TAU, 4);
      prev = d;
    }
    return s;
  };
  const slots = ringSlots(14, R - 2, 12, { sym: 6, gap: 1.09, rowGap: 1.09 });
  const vals = slots.map(([r, th]) => { const [x, y] = polar(r, th); return dens(x, y); });
  const sorted = [...vals].sort((u, v) => u - v), qn = (f) => sorted[Math.floor(f * (sorted.length - 1))];
  const T = [qn(0.22), qn(0.42), qn(0.6), qn(0.76), qn(0.88), qn(0.96)];
  const seq = [P.mid, P.sap, P.royal, P.sky, P.ice, P.cry, P.cry];
  b.add('round', 0, 0, 20, 20, 0, P.gold, { force: true });
  // the envelope itself: E(t) = (M A(t) + B(t)) / (M + 1), a six-cusped epicycloid
  alongCurve(b, (t) => { const [ax, ay] = polar(R, t), [bx, by] = polar(R, M * t); return [(M * ax + bx) / (M + 1), (M * ay + by) / (M + 1)]; },
    0, TAU, 11.6, 'round', 10.4, 10.4, () => P.gold, { samples: 12000, gap: 0.6 });
  slots.forEach(([r, th], i) => {
    let t = 0; while (t < T.length && vals[i] > T[t]) t++;
    const [x, y] = polar(r, th);
    b.add('round', x, y, 12, 12, th, seq[t], { limit: inDisc(R) });
  });
  ring(b, R + 12, 96, 'round', 14, 14, (i) => (i % 2 ? P.gold : P.sap), { force: false, gap: 0.3 });
  ring(b, R + 12, 96, 'rhombus', 8, 12, P.cit, { phase: 0.5, force: false, gap: 0.2 });
  return { b, palette: ['midnight', 'sapphire', 'royal', 'sky', 'ice', 'crystal', 'gold', 'citrine'], plate: { type: 'circle', r: R + 32 } };
}

// Vibrating drumhead: two superposed Bessel modes of a circular membrane, nodal lines in pearl.
function drumheadModes() {
  const b = new Builder();
  const P = { forest: 0, em: 1, jade: 2, mint: 3, pearl: 4, gold: 5, teal: 6, mid: 7 };
  const R = 310;
  const k6 = besselZero(6, 2), k0 = besselZero(0, 3);
  const J6 = [], J0 = [], NS = 400;
  for (let i = 0; i <= NS; i++) { J6.push(besselJ(6, (k6 * i) / NS)); J0.push(besselJ(0, (k0 * i) / NS)); }
  const look = (T, s) => { const f = s * NS, i = Math.min(NS - 1, Math.floor(f)), t = f - i; return T[i] * (1 - t) + T[i + 1] * t; };
  const f = (r, th) => { const s = Math.min(1, r / R); return 2.2 * look(J6, s) * Math.cos(6 * th) + 1.1 * look(J0, s); };
  b.add('round', 0, 0, 24, 24, 0, P.gold, { force: true });
  fillRings(b, 12, R, 12.2, (r, th) => {
    const v = f(r, th), a = Math.abs(v);
    if (a < 0.06) return P.pearl;
    if (a < 0.12) return P.gold;
    if (v > 0) return a < 0.3 ? P.mint : a < 0.55 ? P.jade : P.em;
    return a < 0.3 ? P.teal : a < 0.55 ? P.forest : P.mid;
  }, { limit: inDisc(R), sym: 12, rowGap: 1.09, gap: 1.09 });
  ring(b, R + 12, 96, 'round', 14, 14, (i) => (i % 2 ? P.gold : P.forest), { force: false, gap: 0.3 });
  return { b, palette: ['forest', 'emerald', 'jade', 'mint', 'pearl', 'gold', 'teal', 'midnight'], plate: { type: 'circle', r: R + 32 } };
}

// T-square fractal: squares of half size centred on every corner, four levels deep; each
// square is framed in gold and the deepest square shows on top.
function tSquareCascade() {
  const b = new Builder();
  const P = { mid: 0, burg: 1, ruby: 2, coral: 3, peach: 4, cream: 5, gold: 6, slate: 7 };
  const n = 41, pitch = 14.4, sqs = [];
  const rec = (cx, cy, hh, lvl) => {
    sqs.push([cx, cy, hh, lvl]);
    if (lvl === 3) return;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) rec(cx + sx * hh, cy + sy * hh, hh / 2, lvl + 1);
  };
  rec(0, 0, 10, 0);
  sqs.sort((a, c) => a[3] - c[3]);
  grid(b, n, n, pitch, 13.1, (i, j, u, v) => {
    let top = null;
    for (const s of sqs) if (Math.abs(u - s[0]) <= s[2] && Math.abs(v - s[1]) <= s[2]) top = s;
    if (!top) return Math.max(Math.abs(u), Math.abs(v)) === (n - 1) / 2 ? P.slate : P.mid;
    const [cx, cy, hh, lvl] = top;
    const e = hh - Math.max(Math.abs(u - cx), Math.abs(v - cy));
    if (e < 0.5) return P.gold;
    if (lvl < 2 && Math.abs(e - hh / 2) < 0.5) return P.cream;
    return [P.burg, P.ruby, P.coral, P.peach][lvl];
  });
  const E = (n * pitch) / 2;
  return { b, palette: ['midnight', 'burgundy', 'ruby', 'coral', 'peach', 'cream', 'gold', 'slate'], plate: { type: 'poly', pts: square(E + 14) } };
}

// ---------------------------------------------------------------- Master
// Gosper flowsnake of order 4: its 2,402 vertices are hexagon gems on a triangular lattice.
// The seven order-3 islands and their seven sub-islands are shaded to show the self-similarity.
function flowsnakeIsland() {
  const b = new Builder();
  const P = { mid: 0, cob: 1, sky: 2, coral: 3, teal: 4, aqua: 5, gold: 6, cream: 7 };
  const rules = { A: 'A-B--B+A++AA+B-', B: '+A-BB--B-A++A+B' };
  let s = 'A';
  for (let k = 0; k < 4; k++) s = [...s].map((c) => rules[c] || c).join('');
  const d = 11.6;
  let qa = 0, ra = 0, dir = 0;
  const AX = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const pts = [[0, 0]];
  for (const c of s) {
    if (c === '+') dir = (dir + 1) % 6;
    else if (c === '-') dir = (dir + 5) % 6;
    else { qa += AX[dir][0]; ra += AX[dir][1]; pts.push([qa, ra]); }
  }
  const xy = ([q, r]) => [d * (q + r / 2), d * r * SQ3 / 2];
  let mx = 0, my = 0;
  for (const p of pts) { const [x, y] = xy(p); mx += x; my += y; }
  mx /= pts.length; my /= pts.length;
  const cen = (i0, n) => { let sx = 0, sy = 0; for (let i = i0; i < i0 + n; i++) { const [x, y] = xy(pts[i]); sx += x; sy += y; } return [sx / n, sy / n]; };
  const middle = (i0, n) => {
    const [cx, cy] = cen(i0, n * 7);
    let best = 0, bd = Infinity;
    for (let k = 0; k < 7; k++) { const [x, y] = cen(i0 + k * n, n), dd = Math.hypot(x - cx, y - cy); if (dd < bd) { bd = dd; best = k; } }
    return best;
  };
  const top = middle(0, 343), sub = [], sub2 = [];
  for (let k = 0; k < 7; k++) { sub.push(middle(k * 343, 49)); for (let j = 0; j < 7; j++) sub2.push(middle(k * 343 + j * 49, 7)); }
    const fam = [[P.sky, P.cob, P.cream], [P.aqua, P.teal, P.cream]];
  const w = d * 0.95, h = w / 0.866, used = new Set();
  // outer islands alternate families in angular order round the centre island
  const [tx, ty] = cen(top * 343, 343), famOf = [];
  const order = [0, 1, 2, 3, 4, 5, 6].filter((k) => k !== top).map((k) => { const [x, y] = cen(k * 343, 343); return [Math.atan2(y - ty, x - tx), k]; }).sort((u, v) => u[0] - v[0]);
  famOf[top] = -1;
  order.forEach(([, k], i) => { famOf[k] = i % 2; });
  pts.forEach(([q, r], i) => {
    const key = q + ',' + r;
    if (used.has(key)) return;
    used.add(key);
    const k = Math.min(6, Math.floor(i / 343)), j = Math.min(6, Math.floor((i % 343) / 49)), l = Math.min(6, Math.floor((i % 49) / 7));
    const f = famOf[k] < 0 ? [P.gold, P.coral, P.cream] : fam[famOf[k]];
    const p = j === sub[k] ? f[2] : l === sub2[k * 7 + j] ? f[1] : f[0];
    const [x, y] = xy([q, r]);
    b.add('hexagon', x - mx, y - my, w, h, 0, p, { force: true });
  });
  // convex hull of the island, lattice cells inside it become a dark setting
  const P2 = pts.map((p) => { const [x, y] = xy(p); return [x - mx, y - my]; }).sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  const cross = (o, a, c) => (a[0] - o[0]) * (c[1] - o[1]) - (a[1] - o[1]) * (c[0] - o[0]);
  const lo = [], hi = [];
  for (const p of P2) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of [...P2].reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  const hull = lo.slice(0, -1).concat(hi.slice(0, -1));
  const inHull = (x, y, m) => hull.every((a, i) => { const c = hull[(i + 1) % hull.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); return cross(a, c, [x, y]) / L >= -m; });
  for (let q = -90; q <= 90; q++) for (let r = -90; r <= 90; r++) {
    const [x0, y0] = xy([q, r]), x = x0 - mx, y = y0 - my;
    if (Math.hypot(x, y) > 420 || used.has(q + ',' + r) || !inHull(x, y, 2)) continue;
    b.add('hexagon', x, y, w, h, 0, P.mid, { force: true });
  }
  const plate = hull.map(([x, y]) => { const L = Math.hypot(x, y); return [x * (1 + 22 / L), y * (1 + 22 / L)]; });
  return { b, palette: ['midnight', 'cobalt', 'sky', 'coral', 'teal', 'aqua', 'gold', 'cream'], plate: { type: 'poly', pts: plate } };
}

// Mandelbrot set on a hexagonal lattice: interior components coloured by the period of their
// attracting cycle, the outside in smooth escape-time bands.
function mandelbrotBands() {
  const b = new Builder();
  const P = { mid: 0, sap: 1, royal: 2, sky: 3, ice: 4, gold: 5, tang: 6, cream: 7 };
  const HX = 330, HY = 272, sc = 1.5 / HX, x0 = -0.72;
  const period = (cr, ci) => {
    let x = 0, y = 0;
    for (let i = 0; i < 600; i++) { const t = x * x - y * y + cr; y = 2 * x * y + ci; x = t; if (x * x + y * y > 16) return { esc: i, x, y }; }
    const sx = x, sy = y;
    for (let p = 1; p <= 40; p++) { const t = x * x - y * y + cr; y = 2 * x * y + ci; x = t; if (Math.hypot(x - sx, y - sy) < 1e-5) return { per: p }; }
    return { per: 99 };
  };
  hexPack(b, 11.3, 32, 10.3, (x, y) => {
    if (Math.abs(x) > HX - 5 || Math.abs(y) > HY - 5) return null;
    const res = period(x0 + x * sc, y * sc);
    if (res.per) return res.per === 1 ? P.gold : res.per === 2 ? P.tang : P.cream;
    const nu = res.esc + 1 - Math.log2(Math.log(Math.hypot(res.x, res.y)));
    return nu < 3.2 ? P.mid : nu < 5 ? P.sap : nu < 8 ? P.royal : nu < 13 ? P.sky : nu < 24 ? P.ice : P.cream;
  });
  alongPoly(b, rect(HX + 8, HY + 8), 16, 'square', 12, 12, P.gold, { force: true });
  return { b, palette: ['midnight', 'sapphire', 'royal', 'sky', 'ice', 'gold', 'tangerine', 'cream'], plate: { type: 'poly', pts: rect(HX + 24, HY + 24) } };
}

// Farey tessellation of the hyperbolic plane in the Poincare disc: ideal triangles coloured by
// their distance from the central triangle, with the first geodesic arcs set in gold.
function fareyDisc() {
  const b = new Builder();
  const P = { mid: 0, plum: 1, am: 2, orch: 3, lav: 4, pearl: 5, gold: 6, ind: 7 };
  const R = 330, rx = 0.5, ry = SQ3 / 2;
  // world (x, y) -> upper half plane via the disc (centre = triangle 0, 1, inf)
  const toH = (x, y) => {
    const wx = -y / R, wy = -x / R; // rotate so that the ideal point at infinity sits at the top
    // z = (w * conj(rho) - rho) / (w - 1)
    const nx = wx * rx + wy * ry - rx, ny = wy * rx - wx * ry - ry, dx = wx - 1, dy = wy;
    const den = dx * dx + dy * dy;
    return [(nx * dx + ny * dy) / den, (ny * dx - nx * dy) / den];
  };
  const toW = (zx, zy) => { // inverse: w = (z - rho) / (z - conj(rho))
    const nx = zx - rx, ny = zy - ry, dx = zx - rx, dy = zy + ry, den = dx * dx + dy * dy;
    const wx = (nx * dx + ny * dy) / den, wy = (ny * dx - nx * dy) / den;
    return [-wy * R, -wx * R];
  };
  const depth = (x, y) => {
    const n = Math.floor(x);
    let dd = n >= 0 ? n : -n;
    if ((x - n - 0.5) ** 2 + y * y >= 0.25) return dd;
    let a = n, bq = 1, c = n + 1, e = 1;
    dd++;
    for (let it = 0; it < 16; it++) {
      const m = (a + c) / (bq + e), l = a / bq, r = c / e;
      if ((x - (l + m) / 2) ** 2 + y * y < ((m - l) / 2) ** 2) { c = a + c; e = bq + e; dd++; }
      else if ((x - (m + r) / 2) ** 2 + y * y < ((r - m) / 2) ** 2) { a = a + c; bq = bq + e; dd++; }
      else break;
    }
    return dd;
  };
  // geodesic edges of depth <= 3 around the central triangle
  const edges = [];
  const sb = (a, bq, c, e, lvl) => { edges.push([a / bq, c / e]); if (lvl < 4) { sb(a, bq, a + c, bq + e, lvl + 1); sb(a + c, bq + e, c, e, lvl + 1); } };
  for (let n = -3; n <= 3; n++) edges.push([n, Infinity]);
  for (let n = -3; n <= 2; n++) sb(n, 1, n + 1, 1, Math.abs(n + 0.5) - 0.5 + 1);
  for (const [u, v] of edges) {
    const f = v === Infinity ? (t) => toW(u, Math.tan((t * PI) / 2)) : (t) => toW((u + v) / 2 + ((v - u) / 2) * Math.cos(PI * t), ((v - u) / 2) * Math.sin(PI * t));
    alongCurve(b, f, 0.002, 0.998, 11.5, 'round', 9.4, 9.4, (t, i, x, y) => (Math.hypot(x, y) < R - 14 ? P.gold : null), { samples: 3000 });
  }
  const seq = [P.pearl, P.lav, P.orch, P.am, P.plum, P.ind];
  b.add('round', 0, 0, 14, 14, 0, P.gold, { force: true });
  fillRings(b, 7, R, 10, (r, th) => {
    const [x, y] = polar(r, th);
    if (r > R - 13) return P.ind;
    const [zx, zy] = toH(x, y);
    return seq[Math.min(5, depth(zx, zy))];
  }, { limit: inDisc(R), sym: 6, rowGap: 1.09, gap: 1.1 });
  ring(b, R + 11, 108, 'round', 13, 13, (i) => (i % 2 ? P.gold : P.plum), { force: false, gap: 0.3 });
  return { b, palette: ['midnight', 'plum', 'amethyst', 'orchid', 'lavender', 'pearl', 'gold', 'indigo'], plate: { type: 'circle', r: R + 30 } };
}

// Torus knot T(3, 7) as a three-lane ribbon of gems: the higher strand always passes over and
// the lower one breaks around it, so the crossings weave; the regions enclosed by the knot are
// shaded by winding number.
function torusKnot() {
  const b = new Builder();
  const P = { mid: 0, ind: 1, plum: 2, ruby: 3, coral: 4, peach: 5, gold: 6, cream: 7 };
  const p = 3, q = 7, R0 = 196, A = 100, R = 330, step = 11.2, gs = 10.4;
  const f = (ph) => { const r = R0 + A * Math.cos((q * ph) / p); return [...polar(r, ph), Math.sin((q * ph) / p)]; };
  const T = TAU * p, NS = 24000, cand = [];
  let [px, py] = f(0), acc = step;
  for (let k = 1; k <= NS; k++) {
    const ph = (T * k) / NS, [x, y, z] = f(ph), dx = x - px, dy = y - py, L = Math.hypot(dx, dy);
    acc += L;
    if (acc >= step) {
      acc -= step;
      const nx = -dy / L, ny = dx / L, rot = Math.atan2(dx, -dy);
      for (const o of [-1, 0, 1]) cand.push({ x: x + nx * o * step * 0.98, y: y + ny * o * step * 0.98, z, o, ph, rot });
    }
    px = x; py = y;
  }
  cand.sort((u, v) => v.z - u.z || Math.abs(u.o) - Math.abs(v.o));
  const placed = new Map(), cell = 30;
  const near = (x, y, fn) => {
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    for (let a = gx - 1; a <= gx + 1; a++) for (let e = gy - 1; e <= gy + 1; e++) for (const g of placed.get(a + ',' + e) || []) if (fn(g)) return true;
    return false;
  };
  for (const c of cand) {
    const blocked = near(c.x, c.y, (g) => {
      const d = Math.hypot(g.x - c.x, g.y - c.y);
      let dp = Math.abs(g.ph - c.ph) % T; dp = Math.min(dp, T - dp);
      return d < gs + 0.3 || (dp > 0.35 && d < gs + 7);
    });
    if (blocked) continue;
    const k = Math.floor(c.x / cell) + ',' + Math.floor(c.y / cell);
    (placed.get(k) || placed.set(k, []).get(k)).push(c);
    const t = (c.z + 1) / 2;
    const p0 = c.o === 0 ? (t > 0.6 ? P.cream : t > 0.3 ? P.peach : P.coral) : (t > 0.45 ? P.gold : P.ruby);
    b.add('round', c.x, c.y, gs, gs, c.rot, p0, { force: true });
  }
  const poly = Array.from({ length: 1800 }, (_, i) => f((T * i) / 1800));
  const wind = (x, y) => {
    let w = 0;
    for (let i = 0, n = poly.length; i < n; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % n];
      const cr = (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1);
      if (y1 <= y) { if (y2 > y && cr > 0) w++; } else if (y2 <= y && cr < 0) w--;
    }
    return Math.abs(w);
  };
  const seq = [P.mid, P.ind, P.plum, P.ind];
  b.add('round', 0, 0, 22, 22, 0, P.gold, { force: false });
  fillRings(b, 0, R, 9.6, (r, th) => { const [x, y] = polar(r, th); return seq[Math.min(3, wind(x, y))]; }, { limit: inDisc(R), sym: 7, rowGap: 1.09, gap: 1.1 });
  ring(b, R + 11, 112, 'round', 13, 13, (i) => (i % 2 ? P.gold : P.ruby), { force: false, gap: 0.3 });
  return { b, palette: ['midnight', 'indigo', 'plum', 'ruby', 'coral', 'peach', 'gold', 'cream'], plate: { type: 'circle', r: R + 30 } };
}

// Newton's method for z^3 = -i: three basins of attraction meet in a chain of ever smaller
// beads; shades count the steps taken to converge.
function newtonBasins() {
  const b = new Builder();
  const P = { mid: 0, sap: 1, sky: 2, am: 3, lav: 4, teal: 5, mint: 6, gold: 7 };
  const R = 330, S = 2.4 / R;
  const roots = [0, 1, 2].map((k) => [Math.cos(PI / 2 + (k * TAU) / 3), Math.sin(PI / 2 + (k * TAU) / 3)]);
  const fam = [[P.sky, P.sap], [P.lav, P.am], [P.mint, P.teal]];
  b.add('round', 0, 0, 14, 14, 0, P.gold, { force: true });
  fillRings(b, 7, R, 10.8, (r, th) => {
    const [px, py] = polar(r, th);
    let x = px * S, y = -py * S, n = 0;
    for (; n < 60; n++) {
      const x2 = x * x - y * y, y2 = 2 * x * y, x3 = x2 * x - y2 * y, y3 = x2 * y + y2 * x;
      const fx = x3, fy = y3 + 1, dx = 3 * x2, dy = 3 * y2, den = dx * dx + dy * dy;
      if (den < 1e-12) break;
      x -= (fx * dx + fy * dy) / den; y -= (fy * dx - fx * dy) / den;
      const k = roots.findIndex(([u, v]) => (x - u) ** 2 + (y - v) ** 2 < 1e-4);
      if (k >= 0) {
        if (r > R - 12) return fam[k][1];
        return n < 9 ? fam[k][n % 2] : n < 12 ? P.gold : P.mid;
      }
    }
    return P.mid;
  }, { limit: inDisc(R), sym: 6, rowGap: 1.09, gap: 1.09 });
  ring(b, R + 11, 108, 'round', 13, 13, (i) => [P.sap, P.am, P.teal][i % 3] ?? P.gold, { force: false, gap: 0.3 });
  return { b, palette: ['midnight', 'sapphire', 'sky', 'amethyst', 'lavender', 'teal', 'mint', 'gold'], plate: { type: 'circle', r: R + 30 } };
}

// Ford circles: every fraction p/q in [0, 1] owns a circle of radius 1/(2q^2) resting on the
// line. Friezes stand on the bottom edge and hang from the top; the two unit circles are fans.
function fordCircles() {
  const b = new Builder();
  const P = { mid: 0, forest: 1, em: 2, jade: 3, mint: 4, cream: 5, gold: 6, coral: 7 };
  const H = 300, S = 2 * H;
  const gcd = (u, v) => (v ? gcd(v, u % v) : u);
  const qCol = [null, null, P.em, P.coral, P.jade, P.gold, P.mint, P.cream, P.em, P.coral];
  const circle = (cx, cy, r, q) => {
    if (r >= 26) {
      let k = 0;
      for (let rr = r - 6; rr > 9; rr -= 11.4, k++) {
        const n = Math.floor((TAU * rr) / 11.4);
        ring(b, rr, n, 'round', 9.8, 9.8, k % 2 ? P.cream : qCol[q], { cx, cy, start: 0, orient: 'tan' });
      }
      b.add('round', cx, cy, 14, 14, 0, P.gold, { force: true });
    } else if (r * 2 * 0.92 >= 8.4) b.add('round', cx, cy, r * 2 * 0.92, r * 2 * 0.92, 0, qCol[q] ?? P.cream, { force: true });
  };
  for (let q = 2; q <= 12; q++) for (let p = 1; p < q; p++) {
    if (gcd(p, q) !== 1) continue;
    const r = S / (2 * q * q), x = -H + S * p / q;
    circle(x, H - r, r, q);
    circle(x, -H + r, r, q);
  }
  // the two unit circles: half-disc fans on the left and right
  for (const sx of [-1, 1]) {
    let k = 0;
    for (let rr = H - 6; rr > 12; rr -= 11.2, k++) {
      const n = Math.floor((PI * rr) / 11.2);
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n) * PI, x = sx * (H - rr * Math.sin(a)), y = -rr * Math.cos(a);
        const sec = Math.floor(((i + 0.5) / n) * 12), band = Math.floor(k / 3);
        const p0 = band % 2 ? (sec % 2 ? P.forest : P.mid) : (sec % 2 ? P.jade : P.em);
        b.add('round', x, y, 9.8, 9.8, a, k % 3 === 0 ? (k % 6 === 0 ? P.gold : P.mint) : p0, { force: false, gap: 0.3 });
      }
    }
    b.add('round', sx * (H - 6), 0, 12, 12, 0, P.gold, { force: false, gap: 0.3 });
  }
  hexPack(b, 10.2, 31, 8.6, (x, y) => (Math.abs(x) < H - 5 && Math.abs(y) < H - 5 ? P.mid : null), { force: false, gap: 0.5 });
  alongPoly(b, square(H + 9), 16, 'square', 12, 12, P.gold, { force: true });
  return { b, palette: ['midnight', 'forest', 'emerald', 'jade', 'mint', 'cream', 'gold', 'coral'], plate: { type: 'poly', pts: square(H + 25) } };
}

// Symmetric chaos: a Field-Golubitsky icon map with sixfold symmetry iterated 300,000 times.
// The visit density, smoothed and averaged over the twelve symmetries, is shaded from deep
// plum to white gold on a polar lattice.
function chaosIcon() {
  const b = new Builder();
  const P = { mid: 0, plum: 1, violet: 2, fu: 3, rose: 4, blush: 5, gold: 6, cream: 7 };
  const R = 330, size = 10.6, lam = -2.42, al = 1, be = -0.04, ga = 0.14, n = 6;
  const G = 140, H = new Float64Array(G * G), pts = [];
  let x = 0.01, y = 0.003, ext = 0;
  for (let i = 0; i < 300000; i++) {
    const zz = x * x + y * y;
    let pr = x, pi = y;
    for (let k = 1; k < n - 1; k++) { const t = pr * x - pi * y; pi = pr * y + pi * x; pr = t; }
    const p0 = lam + al * zz + be * (x * pr - y * pi);
    const nx = p0 * x + ga * pr, ny = p0 * y - ga * pi;
    x = nx; y = ny;
    if (i > 1000) { pts.push(x, y); ext = Math.max(ext, Math.hypot(x, y)); }
  }
  const sc = (R - 16) / ext, cellW = (2 * R) / G;
  for (let i = 0; i < pts.length; i += 2) {
    const gx = Math.floor((pts[i] * sc + R) / cellW), gy = Math.floor((-pts[i + 1] * sc + R) / cellW);
    if (gx >= 0 && gy >= 0 && gx < G && gy < G) H[gy * G + gx]++;
  }
  // two passes of a 3 x 3 box blur
  for (let pass = 0; pass < 2; pass++) {
    const Hc = H.slice();
    for (let j = 1; j < G - 1; j++) for (let i = 1; i < G - 1; i++) {
      let s = 0; for (let a = -1; a <= 1; a++) for (let e = -1; e <= 1; e++) s += Hc[(j + a) * G + i + e];
      H[j * G + i] = s / 9;
    }
  }
  const at = (X, Y) => {
    const fx = (X + R) / cellW - 0.5, fy = (Y + R) / cellW - 0.5, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    if (i < 0 || j < 0 || i >= G - 1 || j >= G - 1) return 0;
    return H[j * G + i] * (1 - u) * (1 - v) + H[j * G + i + 1] * u * (1 - v) + H[(j + 1) * G + i] * (1 - u) * v + H[(j + 1) * G + i + 1] * u * v;
  };
  const slots = ringSlots(13, R, size, { sym: 2 * n, gap: 1.1, rowGap: 1.09 });
  b.add('round', 0, 0, 22, 22, 0, P.gold, { force: true });
  const vals = slots.map(([r, th]) => {
    let s = 0;
    for (let k = 0; k < n; k++) for (const m of [1, -1]) { const [X, Y] = polar(r, m * th + (k * TAU) / n); s += at(X, Y); }
    return s;
  });
  const sorted = vals.filter((v) => v > 1e-9).sort((u, v) => u - v), qn = (f) => sorted[Math.floor(f * (sorted.length - 1))];
  const T = [qn(0.2), qn(0.42), qn(0.62), qn(0.8), qn(0.93)];
  const seq = [P.plum, P.violet, P.fu, P.rose, P.blush, P.cream];
  slots.forEach(([r, th], i) => {
    const v = vals[i];
    let t = -1;
    if (v > 1e-9) { t = 0; while (t < T.length && v > T[t]) t++; }
    const [X, Y] = polar(r, th);
    b.add('round', X, Y, size, size, th, t < 0 ? P.mid : seq[t], { limit: inDisc(R) });
  });
  ring(b, R + 11, 110, 'round', 13, 13, (i) => (i % 2 ? P.gold : P.plum), { force: false, gap: 0.3 });
  return { b, palette: ['midnight', 'plum', 'violet', 'fuchsia', 'rose', 'blush', 'gold', 'cream'], plate: { type: 'circle', r: R + 30 } };
}

// Loxodromic double spiral: a log-polar checkerboard pulled through a Moebius map, so its
// spiral cells stream out of one pole and wind into the other; warm cells belong to the left
// pole, cool cells to the right.
function loxodrome() {
  const b = new Builder();
  const P = { mid: 0, ind: 1, cob: 2, sky: 3, ice: 4, gold: 5, coral: 6, cream: 7 };
  const R = 330, a = 150, m = 6, pole = 34;
  hexPack(b, 12.3, 28, 11.2, (x, y) => {
    const rr = Math.hypot(x, y);
    if (rr > R - 6) return null;
    if (Math.hypot(x - a, y) < pole + 6 || Math.hypot(x + a, y) < pole + 6) return null;
    if (rr > R - 18) return P.ind;
    // M(w) = (w - a) / (w + a)
    const nx = x - a, dx = x + a, den = dx * dx + y * y;
    const mx = (nx * dx + y * y) / den, my = (y * dx - nx * y) / den;
    const lr = Math.log(Math.hypot(mx, my)), ph = Math.atan2(my, mx);
    const u = (m * (ph + 1.6 * lr)) / TAU, fu = Math.floor(u), f = u - fu;
    if (fu % 2 === 0) return f > 0.12 && f < 0.88 ? P.mid : P.ind;
    if (lr < -1.5) return P.cream;
    if (lr < -0.75) return P.gold;
    if (lr < 0) return P.coral;
    if (lr < 0.75) return P.cob;
    return lr < 1.5 ? P.sky : P.ice;
  });
  for (const sx of [-1, 1]) {
    const cx = sx * a, warm = sx > 0;
    b.add('round', cx, 0, 30, 30, 0, warm ? P.gold : P.sky, { force: true });
    ring(b, 26, 12, 'teardrop', 11, 17, warm ? P.coral : P.cob, { cx, cy: 0, orient: 'out' });
    ring(b, 26, 12, 'round', 8, 8, P.cream, { cx, cy: 0, phase: 0.5, force: false, gap: 0.2 });
  }
  ring(b, R + 10, 112, 'round', 13, 13, (i) => (i % 2 ? P.gold : P.ind), { force: false, gap: 0.3 });
  return { b, palette: ['midnight', 'indigo', 'cobalt', 'sky', 'ice', 'gold', 'coral', 'cream'], plate: { type: 'circle', r: R + 30 } };
}

// ---------------------------------------------------------------- register
export const ENTRIES = [
  { id: 'fibonacci-panels', version: 1, name: 'Fibonacci Panels', category: 'geometric', difficulty: 'Expert', build: fibonacciPanels },
  { id: 'chladni-plate', version: 1, name: 'Chladni Plate', category: 'geometric', difficulty: 'Expert', build: chladniPlate },
  { id: 'cornu-spiral', version: 1, name: 'Cornu Spiral', category: 'geometric', difficulty: 'Expert', build: cornuSpiral },
  { id: 'doyle-spiral', version: 1, name: 'Doyle Spiral', category: 'mandala', difficulty: 'Expert', build: doyleSpiral },
  { id: 'julia-filigree', version: 1, name: 'Julia Filigree', category: 'mandala', difficulty: 'Expert', build: juliaFiligree },
  { id: 'caustic-crown', version: 1, name: 'Caustic Crown', category: 'mandala', difficulty: 'Expert', build: causticCrown },
  { id: 'drumhead-modes', version: 1, name: 'Drumhead Modes', category: 'mandala', difficulty: 'Expert', build: drumheadModes },
  { id: 't-square-cascade', version: 1, name: 'T-Square Cascade', category: 'geometric', difficulty: 'Expert', build: tSquareCascade },
  { id: 'flowsnake-island', version: 1, name: 'Flowsnake Island', category: 'geometric', difficulty: 'Master', build: flowsnakeIsland },
  { id: 'mandelbrot-bands', version: 1, name: 'Mandelbrot Bands', category: 'geometric', difficulty: 'Master', build: mandelbrotBands },
  { id: 'farey-disc', version: 1, name: 'Farey Disc', category: 'mandala', difficulty: 'Master', build: fareyDisc },
  { id: 'torus-knot', version: 1, name: 'Torus Knot', category: 'mandala', difficulty: 'Master', build: torusKnot },
  { id: 'newton-basins', version: 1, name: 'Newton Basins', category: 'mandala', difficulty: 'Master', build: newtonBasins },
  { id: 'ford-circles', version: 1, name: 'Ford Circles', category: 'geometric', difficulty: 'Master', build: fordCircles },
  { id: 'loxodrome', version: 1, name: 'Loxodrome', category: 'geometric', difficulty: 'Master', build: loxodrome },
  { id: 'chaos-icon', version: 1, name: 'Chaos Icon', category: 'mandala', difficulty: 'Master', build: chaosIcon },
];

CATALOG.push(...ENTRIES);
CATALOG.sort((a, c) => LEVEL[a.difficulty] - LEVEL[c.difficulty]);
