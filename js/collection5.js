// Collection 5: curves, spirals, packings and fractals
// Authored artworks registered into the shared catalog. Deterministic only.
import { Builder, ring, fillRings, fold, inDisc, polar, GEMS, CATALOG, LEVEL, SQ3, square } from './artworks.js';
import { rng, alongCurve, alongPoly, hexPack, orbitPack, pascalMod, hexPlate } from './collection2.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- helpers
// even-odd point in polygon
function pip(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// winding number of a closed polygon around (x, y)
function winding(poly, x, y) {
  let w = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % n];
    const cr = (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1);
    if (y1 <= y) { if (y2 > y && cr > 0) w++; } else if (y2 <= y && cr < 0) w--;
  }
  return w;
}
const sampleCurve = (f, t0, t1, n) => Array.from({ length: n }, (_, i) => f(t0 + ((t1 - t0) * i) / n));
function shiftAll(b, dx, dy) { for (const s of b.s) { s.x = +(s.x + dx).toFixed(2); s.y = +(s.y + dy).toFixed(2); } }
function convexHull(pts) {
  const P = pts.slice().sort((a, c) => a[0] - c[0] || a[1] - c[1]);
  const cr = (o, a, c) => (a[0] - o[0]) * (c[1] - o[1]) - (a[1] - o[1]) * (c[0] - o[0]);
  const lo = [], hi = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
// square-gem grid of n x n cells, fn(i, j, u, v) -> palette index or null (u, v centred cell coords)
function grid(b, n, pitch, size, fn) {
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const u = i - (n - 1) / 2, v = j - (n - 1) / 2, p = fn(i, j, u, v);
    if (p != null) b.add('square', u * pitch, v * pitch, size, size, 0, p, { force: true });
  }
}
// Dihedral (k-fold mirrored) greedy packing inside any D_k-symmetric region.
function symPack(b, { k, region, inside, sizes, tries, seed, shapeOf, color, gap = 0.6 }) {
  const rand = rng(seed), sec = TAU / k;
  sizes.forEach((size, si) => {
    for (let t = 0; t < tries[si]; t++) {
      const x0 = (rand() * 2 - 1) * region, y0 = (rand() * 2 - 1) * region;
      const r = Math.hypot(x0, y0);
      let th = ((Math.atan2(x0, -y0) % sec) + sec) % sec;
      if (th > sec / 2) th = sec - th;
      const { shape, w, h, rot = 0 } = shapeOf(size, rand, r, th);
      const [x, y] = polar(r, th);
      const c0 = b.circlesOf(shape, x, y, w, h, th + rot);
      if (!c0.every(([cx, cy, cr]) => inside(cx, cy, cr))) continue;
      if (b.collides(c0, gap)) continue;
      const orbit = [];
      for (let j = 0; j < k; j++) for (const m of [1, -1]) {
        const tt = m * th + j * sec;
        const [px, py] = polar(r, tt);
        orbit.push([px, py, tt + m * rot]);
      }
      let bad = false;
      for (let o = 1; o < orbit.length && !bad; o++) {
        const co = b.circlesOf(shape, orbit[o][0], orbit[o][1], w, h, orbit[o][2]);
        for (const [x1, y1, r1] of c0) { for (const [x2, y2, r2] of co) if (Math.hypot(x1 - x2, y1 - y2) < r1 + r2 + gap) { bad = true; break; } if (bad) break; }
      }
      if (bad) continue;
      const p = color(r, th, size, shape, rand);
      for (const [px, py, tt] of orbit) b.add(shape, px, py, w, h, tt, p, { force: true });
    }
  });
}
// Descartes circles: { k, kx, ky } (curvature and curvature-weighted centre)
const dc = (k, x, y) => ({ k, kx: k * x, ky: k * y });
const dcFlip = (a, c, e, d) => ({ k: 2 * (a.k + c.k + e.k) - d.k, kx: 2 * (a.kx + c.kx + e.kx) - d.kx, ky: 2 * (a.ky + c.ky + e.ky) - d.ky });
const dcR = (c) => 1 / c.k, dcX = (c) => c.kx / c.k, dcY = (c) => c.ky / c.k;
// inscribed circle in the gap between three mutually tangent circles
function dcInner(a, c, e) {
  const k = a.k + c.k + e.k + 2 * Math.sqrt(Math.max(0, a.k * c.k + c.k * e.k + e.k * a.k));
  const z = [a, c, e].map((q) => [dcX(q), dcY(q)]);
  const mul = ([p, q], [s, t]) => [p * s - q * t, p * t + q * s];
  const kk = [a.k, c.k, e.k];
  let sx = 0, sy = 0;
  for (const [i, j] of [[0, 1], [1, 2], [2, 0]]) { const m = mul(z[i], z[j]); sx += kk[i] * kk[j] * m[0]; sy += kk[i] * kk[j] * m[1]; }
  const mod = Math.hypot(sx, sy), ang = Math.atan2(sy, sx) / 2, sq = [Math.sqrt(mod) * Math.cos(ang), Math.sqrt(mod) * Math.sin(ang)];
  const bx = kk[0] * z[0][0] + kk[1] * z[1][0] + kk[2] * z[2][0], by = kk[0] * z[0][1] + kk[1] * z[1][1] + kk[2] * z[2][1];
  let best = null, be = Infinity;
  for (const sgn of [1, -1]) {
    const x = (bx + 2 * sgn * sq[0]) / k, y = (by + 2 * sgn * sq[1]) / k, r = 1 / k;
    let err = 0;
    for (const q of [a, c, e]) { const rq = 1 / q.k; err += Math.abs(Math.hypot(x - dcX(q), y - dcY(q)) - Math.abs(rq + r)); }
    if (err < be) { be = err; best = { x, y, r }; }
  }
  return best;
}

// ---------------------------------------------------------------- Beginner
// Three-petal rose drawn as two nested outlines with bold accents between the petals.
function trefoilRose() {
  const b = new Builder();
  const P = { garnet: 0, ruby: 1, rose: 2, blush: 3, gold: 4, cream: 5 };
  const A = 226, rose = (s) => (t) => polar(s * A * Math.cos(3 * t), t);
  b.add('round', 0, 0, 40, 40, 0, P.gold, { force: true });
  alongCurve(b, rose(1), 0, Math.PI, 24, 'round', 21, 21, () => P.garnet, { samples: 6000 });
  hexPack(b, 23, 12, 20, (x, y) => {
    const rho = Math.hypot(x, y), th = Math.atan2(x, -y), lim = A * Math.cos(3 * th);
    if (rho < 26 || lim <= 0 || rho > lim - 14) return null;
    const f = rho / lim;
    return f < 0.42 ? P.gold : f < 0.74 ? P.rose : P.blush;
  }, { force: false, gap: 0.5 });
  ring(b, 168, 3, 'marquise', 34, 78, P.ruby, { phase: 0.5 });
  ring(b, 98, 3, 'round', 24, 24, P.garnet, { phase: 0.5, force: false, gap: 0.4 });
  ring(b, 226, 3, 'round', 22, 22, P.gold, { phase: 0.5, force: false, gap: 0.4 });
  ring(b, 200, 6, 'round', 16, 16, P.cream, { phase: 0.25, force: false, gap: 0.4 });
  ring(b, 262, 42, 'round', 20, 20, (i) => (i % 2 ? P.ruby : P.cream), { force: false, gap: 0.4 });
  return { b, palette: ['garnet', 'ruby', 'rose', 'blush', 'gold', 'cream'], plate: { type: 'circle', r: 286 } };
}

// Two interleaved Archimedean spiral arms of large round gems.
function twinCoil() {
  const b = new Builder();
  const P = { cob: 0, royal: 1, sky: 2, gold: 3, cit: 4, cream: 5 };
  const a = 9.6, tMax = 228 / a;
  b.add('round', 0, 0, 44, 44, 0, P.cream, { force: true });
  for (const arm of [0, 1]) {
    alongCurve(b, (t) => polar(a * t, t + arm * Math.PI), 3.3, tMax, 28, 'round', 25, 25, (t) => {
      const r = a * t;
      if (arm === 0) return r < 90 ? P.sky : r < 165 ? P.royal : P.cob;
      return r < 90 ? P.cit : r < 165 ? P.gold : P.cit;
    }, { samples: 8000 });
  }
  ring(b, 262, 42, 'round', 22, 22, (i) => (i % 2 ? P.cob : P.gold), { force: false, gap: 0.4 });
  return { b, palette: ['cobalt', 'royal', 'sky', 'gold', 'citrine', 'cream'], plate: { type: 'circle', r: 286 } };
}

// Vicsek box fractal (two levels) on a 9 x 9 grid of square gems, with a frame.
function vicsekCross() {
  const b = new Builder();
  const P = { mid: 0, sky: 1, ice: 2, cob: 3, gold: 4, cream: 5 };
  const cross = (a, c) => a === 1 || c === 1;
  grid(b, 9, 38, 34, (i, j) => {
    const I = Math.floor(i / 3), J = Math.floor(j / 3), a = i % 3, c = j % 3;
    if (!cross(I, J)) return cross(a, c) ? P.sky : P.mid;
    if (!cross(a, c)) return P.ice;
    return I === 1 && J === 1 ? P.gold : P.cob;
  });
  const H = 4.5 * 38 + 14;
  alongPoly(b, square(H), 20, 'square', 16, 16, P.cream, { force: true });
  return { b, palette: ['midnight', 'sky', 'ice', 'cobalt', 'gold', 'cream'], plate: { type: 'poly', pts: square(H + 18) } };
}

// ---------------------------------------------------------------- Medium
// Nested limaçons r = b + a cos(theta): banded egg-like rings with inner loops drawn as lines.
function limaconNest() {
  const b = new Builder();
  const P = { teal: 0, aqua: 1, mint: 2, cream: 3, forest: 4, gold: 5, jade: 6 };
  const a = 104, lim = (bb) => (t) => polar(bb + a * Math.cos(t), t), OUT = 168;
  const loopPoly = [30, 66].map((bb) => sampleCurve(lim(bb), Math.acos(-bb / a), TAU - Math.acos(-bb / a), 400));
  alongCurve(b, lim(OUT), 0, TAU, 15, 'round', 13, 13, (t, i) => (i % 2 ? P.gold : P.forest), { samples: 4000 });
  hexPack(b, 16.2, 18, 14.4, (x, y) => {
    const rho = Math.hypot(x, y), th = Math.atan2(x, -y), L = rho - a * Math.cos(th);
    if (L > OUT - 10) return null;
    if (pip(loopPoly[0], x, y)) return P.gold;
    if (pip(loopPoly[1], x, y)) return P.cream;
    return [P.forest, P.teal, P.aqua, P.mint, P.jade, P.forest][Math.max(0, Math.min(5, Math.floor((L + 20) / 32)))];
  }, { force: false, gap: 0.3 });
  let y0 = Infinity, y1 = -Infinity; for (const s of b.s) { y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y); }
  const dy = -(y0 + y1) / 2;
  shiftAll(b, 0, dy);
  const plate = sampleCurve((t) => { const [x, y] = polar(OUT + 22 + a * Math.cos(t), t); return [x, y + dy]; }, 0, TAU, 96);
  return { b, palette: ['teal', 'aqua', 'mint', 'cream', 'forest', 'gold', 'jade'], plate: { type: 'poly', pts: plate } };
}

// Sierpinski carpet of 27 x 27 cells; removed squares become feature gems.
function mengerWindow() {
  const b = new Builder();
  const P = { forest: 0, teal: 1, jade: 2, mint: 3, cream: 4, gold: 5 };
  const pitch = 16, n = 27, size = 14.6, c0 = (n - 1) / 2;
  const hole = (i, j) => { for (let d = 0, s = 9; d < 3; d++, s /= 3) if (Math.floor(i / s) % 3 === 1 && Math.floor(j / s) % 3 === 1) return d; return -1; };
  grid(b, n, pitch, size, (i, j) => {
    const h = hole(i, j);
    if (h === 0 || h === 1) return null;
    if (h === 2) return P.cream;
    return (Math.floor(i / 3) + Math.floor(j / 3)) % 2 ? P.teal : P.jade;
  });
  // level-1 holes: one round gem each
  for (let I = 0; I < 9; I++) for (let J = 0; J < 9; J++) {
    if (I % 3 !== 1 || J % 3 !== 1 || (I === 4 && J === 4)) continue;
    b.add('round', (I * 3 + 1 - c0) * pitch, (J * 3 + 1 - c0) * pitch, 44, 44, 0, P.gold, { force: true });
  }
  // central hole: a 3 x 3 echo
  for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) {
    if (u === 0 && v === 0) b.add('round', 0, 0, 44, 44, 0, P.gold, { force: true });
    else b.add('square', u * 48, v * 48, 44, 44, 0, (u + v) % 2 ? P.mint : P.forest, { force: true });
  }
  return { b, palette: ['forest', 'teal', 'jade', 'mint', 'cream', 'gold'], plate: { type: 'poly', pts: square((n * pitch) / 2 + 12) } };
}

// Koch snowflake on a hexagon-gem grid, coloured by construction depth.
function kochCrystal() {
  const b = new Builder();
  const P = { mid: 0, sap: 1, sky: 2, ice: 3, cry: 4, aqua: 5 };
  const N = 14, s = 11.2, gw = SQ3 * s * 0.92, gh = 2 * s * 0.92, Rt = 262;
  const tri = (off) => [0, 1, 2].map((k) => polar(Rt, off + (k * TAU) / 3));
  const step = (pts) => {
    const out = [];
    for (let e = 0; e < pts.length; e++) {
      const [ax, ay] = pts[e], [bx, by] = pts[(e + 1) % pts.length];
      const dx = (bx - ax) / 3, dy = (by - ay) / 3, c = Math.cos(Math.PI / 3), sn = Math.sin(Math.PI / 3);
      const p1 = [ax + dx, ay + dy], p2 = [ax + 2 * dx, ay + 2 * dy];
      let pk = [p1[0] + dx * c - dy * sn, p1[1] + dx * sn + dy * c];
      const alt = [p1[0] + dx * c + dy * sn, p1[1] - dx * sn + dy * c];
      if (Math.hypot(...alt) > Math.hypot(...pk)) pk = alt;
      out.push([ax, ay], p1, pk, p2);
    }
    return out;
  };
  const K0 = tri(Math.PI / 6), K0b = tri(Math.PI / 6 + Math.PI);
  const K = [K0]; for (let i = 0; i < 3; i++) K.push(step(K[K.length - 1]));
  for (let r = -N; r <= N; r++) for (let q = -N; q <= N; q++) {
    const z = -q - r; if (Math.abs(z) > N) continue;
    const x = s * SQ3 * (q + r / 2), y = s * 1.5 * r, d = Math.max(Math.abs(q), Math.abs(r), Math.abs(z));
    let p;
    if (pip(K0, x, y) && pip(K0b, x, y)) p = d <= 1 ? P.aqua : d % 3 === 2 ? P.sky : P.cry;
    else if (pip(K[1], x, y)) p = P.ice;
    else if (pip(K[3], x, y)) p = P.sap;
    else p = d === N ? P.aqua : P.mid;
    b.add('hexagon', x, y, gw, gh, 0, p, { force: true });
  }
  return { b, palette: ['midnight', 'sapphire', 'sky', 'ice', 'crystal', 'aqua'], plate: { type: 'poly', pts: hexPlate(s * SQ3 * N + s * 1.9) } };
}

// Cassini ovals: bands of constant product of distances to two foci, lemniscate outlined.
function cassiniOvals() {
  const b = new Builder();
  const P = { plum: 0, am: 1, orch: 2, lav: 3, pearl: 4, gold: 5, ind: 6 };
  const c = 104, Rd = 256, aa = c * Math.SQRT2;
  alongCurve(b, (t) => { const d = 1 + Math.sin(t) ** 2; return [aa * Math.cos(t) / d, aa * Math.sin(t) * Math.cos(t) / d]; }, 0, TAU, 14, 'round', 12, 12, () => P.gold, { samples: 4000 });
  for (const fx of [-c, c]) b.add('round', fx, 0, 20, 20, 0, P.gold, { force: false, gap: 0.3 });
  const seq = [P.pearl, P.lav, P.orch, P.am, P.plum];
  hexPack(b, 19, 16, 17, (x, y) => {
    const rho = Math.hypot(x, y);
    if (rho > Rd - 9) return null;
    if (rho > Rd - 30) return P.ind;
    const L = Math.sqrt(Math.hypot(x - c, y) * Math.hypot(x + c, y));
    if (L < c) return [P.am, P.orch, P.lav, P.pearl][Math.min(3, Math.floor((L / c) * 4))];
    return seq[Math.min(4, Math.floor((L - c) / 38))];
  }, { force: false, gap: 0.3 });
  ring(b, Rd + 2, 60, 'round', 13, 13, (i) => (i % 2 ? P.gold : P.plum), { force: false, gap: 0.3 });
  return { b, palette: ['plum', 'amethyst', 'orchid', 'lavender', 'pearl', 'gold', 'indigo'], plate: { type: 'circle', r: Rd + 24 } };
}

// Concentric rings of mutually tangent pearls shrinking geometrically toward the centre.
function pearlTunnel() {
  const b = new Builder();
  const P = { mid: 0, sap: 1, royal: 2, sky: 3, ice: 4, pearl: 5, gold: 6 };
  const n = 24, s = Math.sin(Math.PI / n), cs = Math.cos(Math.PI / n), Rb = 300;
  const A2 = 1 - s * s, B2 = -2 * (cs + s * s), q = (-B2 - Math.sqrt(B2 * B2 - 4 * A2 * A2)) / (2 * A2);
  const rho0 = Rb / (1 + s), rings = [];
  for (let j = 0; ; j++) {
    const rho = rho0 * q ** j, cr = rho * s;
    if (cr * 2 * 0.94 < 12) break;
    const row = [];
    for (let i = 0; i < n; i++) {
      const th = ((i + j / 2) * TAU) / n, [x, y] = polar(rho, th);
      const band = (Math.floor(i / 3) + Math.floor((i + j) / 3)) % 2;
      const p = j === 0 ? (band ? P.sap : P.royal) : band ? [P.sap, P.royal, P.sky, P.ice, P.sky, P.royal, P.sap, P.mid][j % 8] : P.pearl;
      b.add('round', x, y, cr * 2 * 0.94, cr * 2 * 0.94, th, p, { force: true });
      row.push(dc(1 / cr, x, y));
    }
    rings.push({ rho, cr, row });
  }
  const last = rings[rings.length - 1], rc = last.rho - last.cr;
  b.add('round', 0, 0, rc * 2 * 0.94, rc * 2 * 0.94, 0, P.gold, { force: true });
  const gem = (g, p) => { if (g && g.r * 2 * 0.9 >= 8.5) b.add('round', g.x, g.y, g.r * 2 * 0.9, g.r * 2 * 0.9, 0, p, { force: true }); };
  const outer = dc(-1 / Rb, 0, 0);
  for (let i = 0; i < n; i++) gem(dcInner(rings[0].row[i], rings[0].row[(i + 1) % n], outer), P.gold);
  for (let j = 0; j + 1 < rings.length; j++) for (let i = 0; i < n; i++) {
    const A = rings[j].row, B = rings[j + 1].row;
    gem(dcInner(A[i], A[(i + 1) % n], B[i]), P.gold);
    gem(dcInner(B[i], B[(i + n - 1) % n], A[i]), P.ice);
  }
  ring(b, Rb + 12, 72, 'round', 13, 13, (i) => (i % 2 ? P.gold : P.mid), { force: false, gap: 0.3 });
  return { b, palette: ['midnight', 'sapphire', 'royal', 'sky', 'ice', 'pearl', 'gold'], plate: { type: 'circle', r: Rb + 32 } };
}

// ---------------------------------------------------------------- Intricate
// Heighway dragon curve, 1024 edges, each edge a diamond; colour follows the path.
// Four Heighway dragon curves leaving the centre in four directions; each edge is a diamond.
function dragonPath() {
  const b = new Builder();
  const P = { ruby: 0, gold: 1, em: 2, sky: 3, mid: 4, cream: 5 };
  const D = [[1, 0], [0, 1], [-1, 0], [0, -1]], used = new Set(), NSEG = 128, L = 21, sz = (L / Math.SQRT2) * 0.93;
  let maxR = 0;
  for (let k = 0; k < 4; k++) {
    let x = 0, y = 0, dir = k;
    for (let i = 0; i < NSEG; i++) {
      const mx = x + D[dir][0] / 2, my = y + D[dir][1] / 2;
      used.add(mx * 2 + ',' + my * 2);
      maxR = Math.max(maxR, Math.hypot(mx, my));
      b.add('square', mx * L, my * L, sz, sz, Math.PI / 4, [P.ruby, P.gold, P.em, P.sky][k], { force: true });
      x += D[dir][0]; y += D[dir][1];
      const m = i + 1, turn = (((m & -m) << 1) & m) ? 1 : -1;
      dir = (dir + turn + 4) % 4;
    }
  }
  const RR = maxR + 0.9;
  for (let u = -Math.ceil(RR) * 2; u <= Math.ceil(RR) * 2; u++) for (let v = -Math.ceil(RR) * 2; v <= Math.ceil(RR) * 2; v++) {
    if (((u + v) & 1) === 0 || used.has(u + ',' + v)) continue;
    const mx = u / 2, my = v / 2;
    if (Math.hypot(mx, my) > RR) continue;
    b.add('square', mx * L, my * L, sz, sz, Math.PI / 4, P.mid, { force: true });
  }
  ring(b, RR * L + 18, 64, 'round', 16, 16, (i) => (i % 2 ? P.gold : P.cream), { force: false, gap: 0.3 });
  return { b, palette: ['ruby', 'gold', 'emerald', 'sky', 'midnight', 'cream'], plate: { type: 'circle', r: RR * L + 38 } };
}

// Rose curve r = cos(5t/2): ten overlapping petals, regions coloured by winding depth.
function wovenRose() {
  const b = new Builder();
  const P = { mid: 0, teal: 1, aqua: 2, mint: 3, gold: 4, cream: 5, forest: 6 };
  const A = 282, f = (t) => polar(A * Math.cos(2.5 * t), t);
  const poly = sampleCurve(f, 0, 4 * Math.PI, 3000);
  b.add('round', 0, 0, 22, 22, 0, P.gold, { force: true });
  alongCurve(b, f, 0, 4 * Math.PI, 12.5, 'round', 10.5, 10.5, () => P.gold, { samples: 24000 });
  fillRings(b, 10, A + 6, 14.5, (r, th) => {
    const [x, y] = polar(r, th), w = Math.abs(winding(poly, x, y));
    if (w === 0) return r > A - 10 ? null : P.mid;
    if (w === 1) return r < 150 ? P.teal : P.aqua;
    return r < 110 ? P.cream : P.mint;
  }, { limit: inDisc(A + 6), sym: 10, gap: 1.08 });
  ring(b, A + 18, 80, 'round', 13, 13, (i) => (i % 2 ? P.gold : P.forest), { force: false, gap: 0.3 });
  return { b, palette: ['midnight', 'teal', 'aqua', 'mint', 'gold', 'cream', 'forest'], plate: { type: 'circle', r: A + 38 } };
}

// Circle packing with fourfold mirror symmetry inside a square frame.
function pearlBox() {
  const b = new Builder();
  const P = { ruby: 0, rose: 1, blush: 2, pearl: 3, gold: 4, garnet: 5, morg: 6 };
  const H = 292;
  alongPoly(b, square(H + 8), 17, 'square', 13, 13, P.garnet, { force: true });
  b.add('round', 0, 0, 92, 92, 0, P.ruby, { force: true });
  symPack(b, {
    k: 4, region: H, seed: 17,
    inside: (x, y, r) => Math.abs(x) + r <= H - 4 && Math.abs(y) + r <= H - 4,
    sizes: [70, 54, 42, 33, 26, 21, 17, 14, 11.5, 9.5], tries: [80, 160, 300, 500, 800, 1200, 1800, 2600, 3400, 4200],
    shapeOf: (sz, rand) => (sz >= 33 && sz < 54 && rand() < 0.35 ? { shape: 'teardrop', w: sz * 0.66, h: sz } : { shape: 'round', w: sz, h: sz }),
    color: (r, th, sz, shape) => sz >= 54 ? P.rose : sz >= 42 ? (shape === 'teardrop' ? P.ruby : P.blush) : sz >= 33 ? (shape === 'teardrop' ? P.garnet : P.morg) : sz >= 26 ? P.gold : sz >= 21 ? P.pearl : sz >= 17 ? P.rose : sz >= 14 ? P.blush : sz >= 11.5 ? P.gold : P.pearl,
  });
  return { b, palette: ['ruby', 'rose', 'blush', 'pearl', 'gold', 'garnet', 'morganite'], plate: { type: 'poly', pts: square(H + 24) } };
}

// Chain of eight-cusped hypocycloid stars, each nested in the last and turned half a cusp.
function cuspStar() {
  const b = new Builder();
  const P = { plum: 0, am: 1, lav: 2, cry: 3, gold: 4, ind: 5, fu: 6 };
  const k = 8, hypo = (R, ph) => (t) => { const r = R / k; const x = (R - r) * Math.cos(t) + r * Math.cos((k - 1) * t), y = (R - r) * Math.sin(t) - r * Math.sin((k - 1) * t); const c = Math.cos(ph), s = Math.sin(ph); return [x * c - y * s, x * s + y * c]; };
  const R0 = 316, levels = [];
  for (let j = 0; j < 7; j++) levels.push({ R: R0 * 0.75 ** j, ph: -Math.PI / 2 + (j % 2) * (Math.PI / k) });
  const polys = levels.map(({ R, ph }) => sampleCurve(hypo(R, ph), 0, TAU, 1600));
  b.add('round', 0, 0, 36, 36, 0, P.gold, { force: true });
  const near = (poly, x, y, e) => { for (const [px, py] of poly) if (Math.abs(px - x) < e && Math.abs(py - y) < e && Math.hypot(px - x, py - y) < e) return true; return false; };
  const seq = [P.ind, P.plum, P.am, P.fu, P.lav, P.am, P.plum, P.lav];
  fillRings(b, 20, R0 + 4, 16, (r, th) => {
    const [x, y] = polar(r, th);
    for (let j = 0; j < 4; j++) if (near(polys[j], x, y, 8.2)) return j % 2 ? P.cry : P.gold;
    let d = -1; for (let j = 0; j < polys.length; j++) { if (pip(polys[j], x, y)) d = j; else break; }
    return seq[d + 1];
  }, { limit: inDisc(R0 + 4), sym: 16, gap: 1.06 });
  ring(b, R0 + 18, 80, 'round', 13, 13, (i) => (i % 2 ? P.gold : P.plum), { force: false, gap: 0.3 });
  return { b, palette: ['plum', 'amethyst', 'lavender', 'crystal', 'gold', 'indigo', 'fuchsia'], plate: { type: 'circle', r: R0 + 38 } };
}

// Hilbert curve of order 4 as a meandering path of square gems through dark walls.
function hilbertMeander() {
  const b = new Builder();
  const P = { mid: 0, teal: 1, aqua: 2, sky: 3, ice: 4, gold: 5, royal: 6 };
  const d2xy = (n, d) => {
    let x = 0, y = 0, t = d;
    for (let s = 1; s < n; s *= 2) {
      const rx = 1 & Math.floor(t / 2), ry = 1 & (t ^ rx);
      if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } [x, y] = [y, x]; }
      x += s * rx; y += s * ry; t = Math.floor(t / 4);
    }
    return [x, y];
  };
  const M = 33, cell = new Map(), seq = [P.aqua, P.ice, P.sky, P.gold];
  let prev = null;
  for (let d = 0; d < 256; d++) {
    const [hx, hy] = d2xy(16, d), gx = 2 * hx + 1, gy = 2 * hy + 1;
    const p = seq[Math.floor(d / 16) % 4];
    cell.set(gx + ',' + gy, p);
    if (prev) cell.set((prev[0] + gx) / 2 + ',' + (prev[1] + gy) / 2, p);
    prev = [gx, gy];
  }
  grid(b, M, 14.5, 13.2, (i, j) => {
    if (i === 0 || j === 0 || i === M - 1 || j === M - 1) return P.teal;
    return cell.get(i + ',' + j) ?? P.mid;
  });
  return { b, palette: ['midnight', 'teal', 'aqua', 'sky', 'ice', 'gold', 'royal'], plate: { type: 'poly', pts: square((M * 14.5) / 2 + 12) } };
}

// ---------------------------------------------------------------- Expert
// Superellipses whose exponent grows outward: a four-cusped star becoming a circle, then a square.
function squircleNest() {
  const b = new Builder();
  const P = { mid: 0, ind: 1, cob: 2, sky: 3, ice: 4, pearl: 5, gold: 6, peri: 7 };
  const A = 296, H = 300;
  const level = (x, y) => {
    const ax = Math.abs(x) / A, ay = Math.abs(y) / A;
    let lo = 0.001, hi = 2;
    for (let it = 0; it < 26; it++) {
      const s = (lo + hi) / 2, n = 0.6 * Math.pow(8.3, Math.min(s, 1.1));
      if (Math.pow(ax / s, n) + Math.pow(ay / s, n) > 1) lo = s; else hi = s;
    }
    return (lo + hi) / 2;
  };
  const seq = [P.gold, P.pearl, P.ind, P.ice, P.cob, P.sky, P.mid, P.peri, P.ind, P.pearl, P.mid, P.gold];
  hexPack(b, 15.5, 22, 14, (x, y) => {
    if (Math.abs(x) > H - 6 || Math.abs(y) > H - 6) return null;
    const s = level(x, y), band = Math.floor(s * 9);
    return seq[Math.min(seq.length - 1, band)];
  });
  alongPoly(b, square(H + 8), 16, 'square', 12, 12, P.gold, { force: true });
  return { b, palette: ['midnight', 'indigo', 'cobalt', 'sky', 'ice', 'pearl', 'gold', 'periwinkle'], plate: { type: 'poly', pts: square(H + 24) } };
}

// H-tree fractal: alternating bars halving every two levels, gem size falling with depth.
function hTree() {
  const b = new Builder();
  const P = { mid: 0, gold: 1, topaz: 2, copper: 3, coral: 4, aqua: 5, cream: 6, mint: 7 };
  const L = 340, depth = 7, segs = [], leaves = [];
  const rec = (x, y, len, lvl) => {
    if (lvl === depth) { leaves.push([x, y]); return; }
    const hor = lvl % 2 === 0, dx = hor ? len / 2 : 0, dy = hor ? 0 : len / 2;
    segs.push([x - dx, y - dy, x + dx, y + dy, lvl]);
    rec(x - dx, y - dy, len / Math.SQRT2, lvl + 1); rec(x + dx, y + dy, len / Math.SQRT2, lvl + 1);
  };
  rec(0, 0, L, 0);
  const sz = [19, 17, 16, 15, 14, 13, 12], col = [P.cream, P.gold, P.gold, P.topaz, P.topaz, P.coral, P.coral];
  b.add('round', 0, 0, 34, 34, 0, P.aqua, { force: true });
  for (const [x, y] of leaves) b.add('round', x, y, 16, 16, 0, P.aqua, { force: true });
  for (const [ax, ay, bx, by, lvl] of segs) {
    const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / (sz[lvl] + 2.4)));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      b.add(lvl < 3 ? 'square' : 'round', x, y, sz[lvl], sz[lvl], Math.PI / 4, col[lvl], { gap: 0.5 });
    }
  }
  let hx = 0, hy = 0; for (const s of b.s) { hx = Math.max(hx, Math.abs(s.x)); hy = Math.max(hy, Math.abs(s.y)); }
  hx += 16; hy += 16;
  for (let x = -hx + 6; x <= hx - 6; x += 13) for (let y = -hy + 6; y <= hy - 6; y += 13)
    b.add('round', x, y, 10.5, 10.5, 0, P.mid, { gap: 1.0 });
  const frame = [[-hx - 9, -hy - 9], [hx + 9, -hy - 9], [hx + 9, hy + 9], [-hx - 9, hy + 9]];
  alongPoly(b, frame, 17, 'square', 13, 13, P.gold, { force: true });
  return { b, palette: ['midnight', 'gold', 'topaz', 'copper', 'coral', 'aqua', 'cream', 'mint'], plate: { type: 'poly', pts: [[-hx - 26, -hy - 26], [hx + 26, -hy - 26], [hx + 26, hy + 26], [-hx - 26, hy + 26]] } };
}

// Pascal's triangle mod 3 mirrored into four quadrants; voids shaded by carry count (Kummer).
function ternaryQuilt() {
  const b = new Builder();
  const P = { ruby: 0, gold: 1, cream: 2, sand: 3, garnet: 4, mid: 5, teal: 6 };
  const n = 41, pitch = 15;
  const carries = (a, c) => { let k = 0, cr = 0; while (a || c || cr) { const s = (a % 3) + (c % 3) + cr; cr = s >= 3 ? 1 : 0; k += cr; a = Math.floor(a / 3); c = Math.floor(c / 3); } return k; };
  const T = pascalMod(40, 3);
  grid(b, n, pitch, 13.6, (i, j, u, v) => {
    const a = Math.abs(u), c = Math.abs(v), k = carries(a, c);
    if (k === 0) return T[a + c][a] === 1 ? P.ruby : P.gold;
    return [P.cream, P.sand, P.teal, P.mid][Math.min(3, k - 1)];
  });
  alongPoly(b, square((n * pitch) / 2 + 9), 16, 'square', 12, 12, P.garnet, { force: true });
  return { b, palette: ['ruby', 'gold', 'cream', 'sand', 'garnet', 'midnight', 'teal'], plate: { type: 'poly', pts: square((n * pitch) / 2 + 25) } };
}

// Quasicrystal: five superposed plane waves give a tenfold interference pattern.
function quasicrystal() {
  const b = new Builder();
  const P = { mid: 0, sap: 1, royal: 2, sky: 3, ice: 4, gold: 5, cry: 6 };
  const K = TAU / 74, dirs = [0, 1, 2, 3, 4].map((j) => [Math.cos((j * Math.PI) / 5), Math.sin((j * Math.PI) / 5)]);
  const R = 330;
  b.add('round', 0, 0, 24, 24, 0, P.gold, { force: true });
  fillRings(b, 12, R, 14, (r, th) => {
    const [x, y] = polar(r, th);
    let f = 0; for (const [dx, dy] of dirs) f += Math.cos(K * (x * dx + y * dy));
    return f > 3.2 ? P.gold : f > 1.6 ? P.cry : f > 0.4 ? P.ice : f > -0.6 ? P.sky : f > -1.8 ? P.royal : f > -3 ? P.sap : P.mid;
  }, { limit: inDisc(R), sym: 10 });
  ring(b, R + 14, 80, 'round', 14, 14, (i) => (i % 2 ? P.gold : P.mid), { force: false, gap: 0.3 });
  return { b, palette: ['midnight', 'sapphire', 'royal', 'sky', 'ice', 'gold', 'crystal'], plate: { type: 'circle', r: R + 34 } };
}

// ---------------------------------------------------------------- Master
// Lissajous 5:4 figure in gold over regions two-coloured by winding parity.
function lissajousTapestry() {
  const b = new Builder();
  const P = { ruby: 0, garnet: 1, cream: 2, sand: 3, gold: 4, mid: 5, rose: 6 };
  const A = 296, H = 318, f = (t) => [A * Math.sin(5 * t + Math.PI / 2), A * Math.sin(4 * t)];
  const poly = sampleCurve(f, 0, TAU, 1400);
  alongCurve(b, f, 0, TAU, 12.5, 'round', 10.5, 10.5, () => P.gold, { samples: 30000 });
  hexPack(b, 12.4, 30, 11, (x, y) => {
    if (Math.abs(x) > H - 6 || Math.abs(y) > H - 6) return null;
    const odd = winding(poly, x, y) & 1, m = Math.max(Math.abs(x), Math.abs(y));
    if (m > A + 4) return P.mid;
    if (odd) return m < 150 ? P.rose : m < 240 ? P.ruby : P.garnet;
    return m < 150 ? P.cream : P.sand;
  }, { force: false, gap: 0.3 });
  alongPoly(b, square(H + 8), 16, 'square', 12, 12, P.gold, { force: true });
  return { b, palette: ['ruby', 'garnet', 'cream', 'sand', 'gold', 'midnight', 'rose'], plate: { type: 'poly', pts: square(H + 24) } };
}

// Sixfold greedy packing of hexagons, teardrops and pearls inside a hexagonal plate.
function honeycombPearls() {
  const b = new Builder();
  const P = { honey: 0, amber: 1, cit: 2, gold: 3, cream: 4, choc: 5, topaz: 6, peach: 7 };
  const R = 540, hs = (R * SQ3) / 2;
  const inside = (x, y, r) => Math.abs(y) + r <= hs - 4 && (Math.abs(x) * SQ3) / 2 + Math.abs(y) / 2 + r <= hs - 4;
  b.add('hexagon', 0, 0, 90 * 0.866, 90, 0, P.cit, { force: true });
  symPack(b, {
    k: 6, region: R, seed: 41, inside,
    sizes: [50, 38, 30, 24, 19.5, 16, 13.5, 11.5, 10, 9, 8.2], tries: [80, 200, 400, 800, 1400, 2200, 3200, 4400, 6000, 8000, 9000],
    shapeOf: (sz, rand) => {
      if (sz >= 38) return { shape: 'hexagon', w: sz * 0.866, h: sz };
      if (sz >= 24) return rand() < 0.4 ? { shape: 'teardrop', w: sz * 0.64, h: sz } : { shape: 'hexagon', w: sz * 0.866, h: sz };
      return { shape: 'round', w: sz, h: sz };
    },
    color: (r, th, sz, shape) => {
      if (sz >= 50) return P.amber;
      if (sz >= 38) return P.gold;
      if (sz >= 24) return shape === 'teardrop' ? P.choc : P.topaz;
      if (sz >= 19.5) return P.cream;
      if (sz >= 16) return P.honey;
      if (sz >= 13.5) return P.cit;
      if (sz >= 11.5) return P.peach;
      if (sz >= 10) return P.choc;
      return r < 320 ? P.cream : P.amber;
    },
  });
  hexPack(b, 9.6, 60, 8.4, (x, y) => (inside(x, y, 5) ? (Math.hypot(x, y) < 320 ? P.cream : P.amber) : null), { force: false, gap: 0.5 });
  return { b, palette: ['honey', 'amber', 'citrine', 'gold', 'cream', 'chocolate', 'topaz', 'peach'], plate: { type: 'poly', pts: hexPlate(R + 18) } };
}

// Apollonian gasket by Descartes' theorem; the largest circles hold gaskets of their own.
function descartesGasket() {
  const b = new Builder();
  const P = { mid: 0, sap: 1, royal: 2, sky: 3, ice: 4, pearl: 5, gold: 6, aqua: 7 };
  const RMIN = 4.3, BIG = 20;
  const tier = (r) => r >= 40 ? P.gold : r >= 26 ? P.royal : r >= 17 ? P.sky : r >= 11.5 ? P.aqua : r >= 8 ? P.ice : r >= 6 ? P.pearl : P.sap;
  const emit = (c) => {
    const r = dcR(c), x = dcX(c), y = dcY(c);
    if (r > BIG) { gasket(x, y, r, Math.hypot(x, y) < 1 ? 0 : Math.atan2(x, -y)); return; }
    b.add('round', x, y, r * 2 * 0.93, r * 2 * 0.93, 0, tier(r), { force: true });
  };
  const fill = (c1, c2, c3, d) => {
    const e = dcFlip(c1, c2, c3, d);
    if (dcR(e) < RMIN) return;
    emit(e);
    fill(c1, c2, e, c3); fill(c2, c3, e, c1); fill(c3, c1, e, c2);
  };
  function gasket(cx, cy, R, rot) {
    const r1 = R / (1 + 2 / SQ3), O = dc(-1 / R, cx, cy);
    const C = [0, 1, 2].map((j) => { const [x, y] = polar(R - r1, rot + (j * TAU) / 3); return dc(1 / r1, cx + x, cy + y); });
    C.forEach(emit);
    fill(O, C[0], C[1], C[2]); fill(O, C[1], C[2], C[0]); fill(O, C[2], C[0], C[1]); fill(C[0], C[1], C[2], O);
  }
  const R = 560;
  gasket(0, 0, R, 0);
  ring(b, R + 10, 120, 'round', 14, 14, (i) => (i % 2 ? P.gold : P.mid), { force: false, gap: 0.3 });
  return { b, palette: ['midnight', 'sapphire', 'royal', 'sky', 'ice', 'pearl', 'gold', 'aqua'], plate: { type: 'circle', r: R + 30 } };
}

// Two-armed logarithmic spiral galaxy with a ringed bulge and scattered stars.
function spiralGalaxy() {
  const b = new Builder();
  const P = { mid: 0, ind: 1, tanz: 2, lav: 3, pearl: 4, cit: 5, cream: 6, peri: 7 };
  const R = 540, R0 = 64, bb = 1 / Math.tan((21 * Math.PI) / 180);
  const star = (i, row) => { const v = Math.sin(i * 12.9898 + row * 78.233) * 43758.5453; return v - Math.floor(v) < 0.035; };
  b.add('round', 0, 0, 50, 50, 0, P.cream, { force: true });
  fillRings(b, 26, R0 + 30, 15, (r) => (r < 50 ? P.cit : r < 74 ? P.cream : P.pearl), { sym: 2 });
  fillRings(b, R0 + 30, R, 15.5, (r, th, row, i, n) => {
    const arm = Math.log(r / R0) * bb;
    let d = ((th - arm) % Math.PI + Math.PI) % Math.PI; if (d > Math.PI / 2) d -= Math.PI;
    const dist = Math.abs(d) * r, w = 30 + 0.2 * r, lead = d > 0;
    if (dist < 0.32 * w) return P.pearl;
    if (dist < 0.68 * w) return P.lav;
    if (dist < w) return P.peri;
    if (dist < 1.3 * w) return lead ? P.tanz : P.ind;
    if (star(i % (n / 2), row)) return P.cream;
    return dist < 1.9 * w ? P.ind : P.mid;
  }, { limit: inDisc(R), sym: 2 });
  ring(b, R + 14, 120, 'round', 14, 14, (i) => (i % 2 ? P.lav : P.tanz), { force: false, gap: 0.3 });
  return { b, palette: ['midnight', 'indigo', 'tanzanite', 'lavender', 'pearl', 'citrine', 'cream', 'periwinkle'], plate: { type: 'circle', r: R + 34 } };
}

// ---------------------------------------------------------------- register
export const ENTRIES = [
  { id: 'trefoil-rose', version: 1, name: 'Trefoil Rose', category: 'mandala', difficulty: 'Beginner', build: trefoilRose },
  { id: 'twin-coil', version: 1, name: 'Twin Coil', category: 'mandala', difficulty: 'Beginner', build: twinCoil },
  { id: 'vicsek-cross', version: 1, name: 'Vicsek Cross', category: 'geometric', difficulty: 'Beginner', build: vicsekCross },
  { id: 'limacon-nest', version: 1, name: 'Limaçon Nest', category: 'geometric', difficulty: 'Medium', build: limaconNest },
  { id: 'menger-window', version: 1, name: 'Menger Window', category: 'geometric', difficulty: 'Medium', build: mengerWindow },
  { id: 'koch-crystal', version: 1, name: 'Koch Crystal', category: 'mandala', difficulty: 'Medium', build: kochCrystal },
  { id: 'cassini-ovals', version: 1, name: 'Cassini Ovals', category: 'geometric', difficulty: 'Medium', build: cassiniOvals },
  { id: 'pearl-tunnel', version: 1, name: 'Pearl Tunnel', category: 'mandala', difficulty: 'Medium', build: pearlTunnel },
  { id: 'dragon-path', version: 1, name: 'Dragon Path', category: 'geometric', difficulty: 'Intricate', build: dragonPath },
  { id: 'woven-rose', version: 1, name: 'Woven Rose', category: 'mandala', difficulty: 'Intricate', build: wovenRose },
  { id: 'pearl-box', version: 1, name: 'Pearl Box', category: 'geometric', difficulty: 'Intricate', build: pearlBox },
  { id: 'cusp-star', version: 1, name: 'Cusp Star', category: 'mandala', difficulty: 'Intricate', build: cuspStar },
  { id: 'hilbert-meander', version: 1, name: 'Hilbert Meander', category: 'geometric', difficulty: 'Intricate', build: hilbertMeander },
  { id: 'squircle-nest', version: 1, name: 'Squircle Nest', category: 'geometric', difficulty: 'Expert', build: squircleNest },
  { id: 'h-tree-circuit', version: 1, name: 'H-Tree Circuit', category: 'geometric', difficulty: 'Expert', build: hTree },
  { id: 'ternary-quilt', version: 1, name: 'Ternary Quilt', category: 'geometric', difficulty: 'Expert', build: ternaryQuilt },
  { id: 'quasicrystal-ripple', version: 1, name: 'Quasicrystal Ripple', category: 'mandala', difficulty: 'Expert', build: quasicrystal },
  { id: 'lissajous-tapestry', version: 1, name: 'Lissajous Tapestry', category: 'geometric', difficulty: 'Master', build: lissajousTapestry },
  { id: 'honeycomb-pearls', version: 1, name: 'Honeycomb Pearls', category: 'mandala', difficulty: 'Master', build: honeycombPearls },
  { id: 'descartes-gasket', version: 1, name: 'Descartes Gasket', category: 'mandala', difficulty: 'Master', build: descartesGasket },
  { id: 'spiral-galaxy', version: 1, name: 'Spiral Galaxy', category: 'mandala', difficulty: 'Master', build: spiralGalaxy },
];

CATALOG.push(...ENTRIES);
CATALOG.sort((a, c) => LEVEL[a.difficulty] - LEVEL[c.difficulty]);
