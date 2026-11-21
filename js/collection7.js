// Collection 7: expert and master lattices, tilings and polygons
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
const rect = (hx, hy) => [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]];
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
// distance from (x, y) to the outline of a closed polygon
function edgeDist(pts, x, y) {
  let d = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    d = Math.min(d, segDist(x, y, ax, ay, bx, by));
  }
  return d;
}
function segDist(x, y, ax, ay, bx, by) {
  const ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey)));
  return Math.hypot(x - ax - t * ex, y - ay - t * ey);
}
const key = (x, y) => Math.round(x * 10) + ',' + Math.round(y * 10);
const mod = (a, n) => ((a % n) + n) % n;
// fill leftover gaps inside a box with small gems (several offset passes, collision-checked)
function fillGaps(b, R, size, pitch, col, limit, shape = 'round', passes = 6) {
  for (const [ox, oy] of [[0, 0], [0.5, 0.5], [0.5, 0], [0, 0.5], [0.25, 0.75], [0.75, 0.25]].slice(0, passes))
    for (let x = -R + ox * pitch; x <= R; x += pitch) for (let y = -R + oy * pitch; y <= R; y += pitch) {
      const p = col(x, y);
      if (p != null) b.add(shape, x, y, size, size, 0, p, { gap: 0.4, limit });
    }
}
// hexagonal raster of round gems centred on the origin (mirror-symmetric rows)
function hexFill(b, hx, hy, pitch, size, col, { cx = 0, cy = 0, ...opts } = {}) {
  const dy = pitch * 0.866, rows = Math.floor(hy / dy);
  for (let r = -rows; r <= rows; r++) {
    const y = r * dy, sh = mod(r, 2) ? pitch / 2 : 0;
    for (let x = sh - Math.floor(hx / pitch + 1) * pitch; x <= hx + 0.01; x += pitch) {
      if (Math.abs(x) > hx) continue;
      const p = col(cx + x, cy + y);
      if (p != null) b.add('round', cx + x, cy + y, size, size, 0, p, { gap: 0.3, ...opts });
    }
  }
}
// a closed band of gems on the outline of rect(hx, hy), corners included; col(k, corner)
function rectBand(b, hx, hy, step, size, col, shape = 'square', rot = 0) {
  const nx = Math.max(2, 2 * Math.round(hx / step)), ny = Math.max(2, 2 * Math.round(hy / step));
  const pts = [];
  for (let i = 0; i < nx; i++) pts.push([-hx + (2 * hx * i) / nx, -hy, i === 0]);
  for (let j = 0; j < ny; j++) pts.push([hx, -hy + (2 * hy * j) / ny, j === 0]);
  for (let i = 0; i < nx; i++) pts.push([hx - (2 * hx * i) / nx, hy, i === 0]);
  for (let j = 0; j < ny; j++) pts.push([-hx, hy - (2 * hy * j) / ny, j === 0]);
  pts.forEach(([x, y, c], k) => { const p = col(k, c); if (p != null) b.add(shape, x, y, size, size, rot, p, { force: true }); });
}
// square raster nx * ny cells centred on the origin; fn(i, j, x, y) adds the gem itself
function grid(nx, ny, pitch, fn) {
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) fn(i, j, (i - (nx - 1) / 2) * pitch, (j - (ny - 1) / 2) * pitch);
}

// ---------------------------------------------------------------- Expert
// Cairo pentagonal pavement: pentagon pairs read as interlocking hexagons, a gold lozenge at the heart.
function cairoPavement() {
  const b = new Builder();
  const P = { mid: 0, cream: 1, sand: 2, teal: 3, tq: 4, gold: 5, copper: 6 };
  const a = 78, al = PI / 12, Pp = 2 * a * Math.cos(al), Rs = a / Math.SQRT2, half = 226;
  const squares = [];
  for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
    squares.push({ x: i * Pp, y: j * Pp, r: al });
    squares.push({ x: (i + 0.5) * Pp, y: (j + 0.5) * Pp, r: -al });
  }
  const verts = new Map();
  for (const s of squares) for (let k = 0; k < 4; k++) {
    const x = s.x + Rs * Math.cos(s.r + PI / 4 + (k * PI) / 2), y = s.y + Rs * Math.sin(s.r + PI / 4 + (k * PI) / 2);
    verts.set(key(x, y), [x, y]);
  }
  const V = [...verts.values()].filter(([x, y]) => Math.abs(x) < half + 2 * a && Math.abs(y) < half + 2 * a);
  const faces = squares.map((s) => [s.x, s.y]);
  const tri = new Map();
  for (const p of V) {
    const nb = V.filter((q) => q !== p && Math.abs(Math.hypot(q[0] - p[0], q[1] - p[1]) - a) < 0.5);
    for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) {
      if (Math.abs(Math.hypot(nb[i][0] - nb[j][0], nb[i][1] - nb[j][1]) - a) > 0.5) continue;
      const cx = (p[0] + nb[i][0] + nb[j][0]) / 3, cy = (p[1] + nb[i][1] + nb[j][1]) / 3;
      tri.set(key(cx, cy), [cx, cy]);
    }
  }
  faces.push(...tri.values());
  const box = square(half), lim = inPoly(box, 0);
  const pents = [];
  for (const v of V) {
    const f = faces.filter(([x, y]) => Math.hypot(x - v[0], y - v[1]) < a * 0.75);
    if (f.length !== 5) continue;
    f.sort((p, q) => Math.atan2(p[1] - v[1], p[0] - v[0]) - Math.atan2(q[1] - v[1], q[0] - v[0]));
    if (f.every(([x, y]) => Math.abs(x) > half + 4 || Math.abs(y) > half + 4)) continue;
    pents.push({ v, f });
  }
  const edges = new Map(), nodes = new Map();
  for (const pe of pents) {
    const { f } = pe;
    let cx = 0, cy = 0; for (const [x, y] of f) { cx += x / 5; cy += y / 5; }
    let bi = 0, bl = Infinity;
    f.forEach((p, k) => { const q = f[(k + 1) % 5], l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l < bl) { bl = l; bi = k; } edges.set(key((p[0] + q[0]) / 2, (p[1] + q[1]) / 2), [p, q]); nodes.set(key(...p), p); });
    const m = [(f[bi][0] + f[(bi + 1) % 5][0]) / 2, (f[bi][1] + f[(bi + 1) % 5][1]) / 2];
    const ux = m[0] - cx, uy = m[1] - cy, horiz = ux * uy > 0, side = horiz ? ux + uy > 0 : ux - uy > 0;
    const d = Math.abs(m[0]) + Math.abs(m[1]), z = Math.round((d - Pp * 0.61) / (Pp * 1.22));
    const pairs = [[P.gold, P.copper], [P.tq, P.teal], [P.cream, P.sand], [P.tq, P.teal], [P.cream, P.sand], [P.tq, P.teal], [P.cream, P.sand]];
    const p = pairs[Math.min(6, z)][side ? 0 : 1];
    Object.assign(pe, { cx, cy, p, horiz, d });
  }
  for (const [x, y] of nodes.values()) if (lim(x, y, 6)) b.add('round', x, y, 13, 13, 0, P.gold, { force: true });
  for (const [A, B] of edges.values()) seg(b, A, B, 10.5, 'round', 9, 9, P.mid, { force: false, gap: 0.2, limit: lim });
  for (const pe of pents) {
    const acc = pe.p === P.gold || pe.p === P.copper ? P.cream : pe.p === P.cream || pe.p === P.sand ? P.copper : P.gold;
    if (lim(pe.cx, pe.cy, 11)) { b.add('round', pe.cx, pe.cy, 20, 20, 0, acc, { force: true }); ring(b, 16, 8, 'round', 8, 8, pe.p === P.gold ? P.cream : P.mid, { cx: pe.cx, cy: pe.cy, force: false, gap: 0.3 }); }
    const pl = (x, y, r) => polyIn(pe.f, x, y) >= r + 4.6 && lim(x, y, r);
    for (const st of [10.2, 5.1]) for (let x = pe.cx - 62; x <= pe.cx + 62; x += st) for (let y = pe.cy - 62; y <= pe.cy + 62; y += st) b.add('round', x, y, 9.2, 9.2, 0, pe.p, { gap: 0.4, limit: pl });
    const pl2 = (x, y, r) => polyIn(pe.f, x, y) >= r + 4 && lim(x, y, r);
    for (let x = pe.cx - 62; x <= pe.cx + 62; x += 3.4) for (let y = pe.cy - 62; y <= pe.cy + 62; y += 3.4) b.add('round', x, y, 8.2, 8.2, 0, pe.p, { gap: 0.3, limit: pl2 });
  }
  rectBand(b, half + 12, half + 12, 17, 14, (k, c) => (c ? P.gold : P.mid));
  rectBand(b, half + 30, half + 30, 17, 14, (k, c) => (c ? P.gold : k % 2 ? P.teal : P.cream));
  rectBand(b, half + 48, half + 48, 17, 14, (k, c) => (c ? P.gold : P.mid));
  return { b, palette: ['midnight', 'cream', 'sand', 'teal', 'turquoise', 'gold', 'copper'], plate: { type: 'poly', pts: square(half + 66) } };
}

// Seigaiha: overlapping scallops of concentric arcs, a warm lozenge of waves in a cool sea.
function seigaihaTide() {
  const b = new Builder();
  const P = { mid: 0, sap: 1, sky: 2, ice: 3, cream: 4, coral: 5, gold: 6, ruby: 7 };
  const R = 62, dx = 2 * R, dy = R / 2, hx = 214, hy = 214;
  const radii = [0, 13, 26, 39, 51, 62];
  const box = rect(hx, hy), lim = inPoly(box, 0);
  const sc = [];
  for (let r = -16; r <= 16; r++) for (let c = -4; c <= 4; c++) {
    const x = c * dx + (mod(r, 2) ? R : 0), y = r * dy;
    if (Math.abs(x) > hx + R + 10 || y < -hy - R || y > hy + R + 10) continue;
    sc.push({ r, x, y });
  }
  sc.sort((p, q) => q.r - p.r);
  const hidden = (s, x, y) => sc.some((o) => o.r > s.r && o.r <= s.r + 3 && Math.hypot(x - o.x, y - o.y) < R + 1);
  const warmSeq = [P.cream, P.gold, P.gold, P.coral, P.coral, P.ruby];
  const coolSeq = [P.ice, P.ice, P.sky, P.sky, P.sap, P.mid];
  for (const s of sc) {
    const d = Math.abs(s.x) / 1.0 + Math.abs(s.y) * 2.0;
    const warm = d < 200 || (d > 330 && d < 380);
    const seq = warm ? warmSeq : coolSeq;
    radii.forEach((rad, k) => {
      if (k === 0) { if (!hidden(s, s.x, s.y)) b.add('round', s.x, s.y, 15, 15, 0, seq[0], { limit: lim, gap: 0.3 }); return; }
      const n = Math.max(6, Math.round((TAU * rad) / 12.2));
      for (let i = 0; i < n; i++) {
        const th = (i + 0.5 * (k % 2)) / n * TAU, [px, py] = polar(rad, th), x = s.x + px, y = s.y + py;
        if (hidden(s, x, y)) continue;
        b.add('round', x, y, 10, 10, 0, seq[k], { gap: 0.3, limit: lim });
      }
    });
  }
  rectBand(b, hx + 11, hy + 11, 12.5, 11, (k, c) => (c ? P.ruby : P.gold), 'round');
  rectBand(b, hx + 28, hy + 28, 17, 15, (k, c) => (c ? P.gold : k % 2 ? P.mid : P.sap), 'square', PI / 4);
  rectBand(b, hx + 45, hy + 45, 12.5, 11, (k, c) => (c ? P.ruby : P.coral), 'round');
  return { b, palette: ['midnight', 'sapphire', 'sky', 'ice', 'cream', 'coral', 'gold', 'ruby'], plate: { type: 'poly', pts: rect(hx + 60, hy + 60) } };
}

// Shippo-tsunagi: interlocking circles; lenses and four-point cushions glazed in a stepped medallion.
function shippoLattice() {
  const b = new Builder();
  const P = { plum: 0, violet: 1, lav: 2, cream: 3, gold: 4, rose: 5, fu: 6, mid: 7 };
  const d = 84, r = d / Math.SQRT2, half = 2.5 * d, box = square(half), lim = inPoly(box, 0);
  const K = 3;
  const rk = (i, j) => Math.max(Math.abs(i), Math.abs(j));
  const lensM = (lx, ly) => Math.floor(Math.max(Math.abs(lx), Math.abs(ly)));
  // knots where four circles meet
  for (let i = -K; i < K; i++) for (let j = -K; j < K; j++) {
    const x = (i + 0.5) * d, y = (j + 0.5) * d;
    if (lim(x, y, 7)) b.add('round', x, y, 14, 14, 0, P.gold, { force: true });
  }
  // circle strings
  for (let i = -K; i <= K; i++) for (let j = -K; j <= K; j++) {
    const n = 36;
    for (let k = 0; k < n; k++) {
      const th = ((k + 0.5) / n) * TAU, [px, py] = polar(r, th);
      b.add('round', i * d + px, j * d + py, 9, 9, 0, P.cream, { gap: 0.5, limit: lim });
    }
  }
  // lenses
  const lensCol = (m) => [P.fu, P.rose, P.violet, P.plum][Math.min(3, m)];
  for (let i = -K; i <= K; i++) for (let j = -K; j <= K; j++) for (const [di, dj] of [[1, 0], [0, 1]]) {
    const x = (i + di / 2) * d, y = (j + dj / 2) * d;
    const m = lensM(i + di / 2, j + dj / 2);
    b.add('marquise', x, y, 17, 50, di ? 0 : PI / 2, lensCol(m), { limit: lim, gap: 0.3 });
  }
  // cushions
  for (let i = -K; i <= K; i++) for (let j = -K; j <= K; j++) {
    const x = i * d, y = j * d, m = rk(i, j);
    if (!lim(x, y, 10)) continue;
    b.add('round', x, y, 21, 21, 0, m === 0 ? P.gold : m === 1 ? P.cream : m === 2 ? P.lav : P.cream, { force: true });
    ring4(b, x, y, m);
  }
  function ring4(b, x, y, m) {
    for (let k = 0; k < 4; k++) {
      const th = PI / 4 + (k * PI) / 2, [px, py] = polar(19, th);
      b.add('round', x + px, y + py, 8, 8, 0, m === 0 ? P.cream : P.gold, { gap: 0.2, limit: lim });
    }
  }
  // glaze the remaining lens and cushion area
  const region = (x, y) => {
    const i = Math.round(x / d), j = Math.round(y / d);
    const inside = [];
    for (let a = i - 1; a <= i + 1; a++) for (let c = j - 1; c <= j + 1; c++) if (Math.hypot(x - a * d, y - c * d) < r) inside.push([a, c]);
    if (inside.length >= 2) {
      const m = lensM((inside[0][0] + inside[1][0]) / 2, (inside[0][1] + inside[1][1]) / 2);
      return [P.rose, P.fu, P.plum, P.violet][Math.min(3, m)];
    }
    const m = rk(i, j);
    return m === 0 ? P.lav : m === 1 ? P.violet : m === 2 ? P.mid : P.violet;
  };
  fillGaps(b, half, 8.5, 9, region, lim);
  frame(b, square(half + 12), 20, 'square', 14, 14, (e, k) => (k % 2 ? P.gold : P.plum), { force: false });
  frame(b, square(half + 32), 20, 'square', 14, 14, (e, k) => (k % 2 ? P.lav : P.mid), { force: false });
  return { b, palette: ['plum', 'violet', 'lavender', 'cream', 'gold', 'rose', 'fuchsia', 'midnight'], plate: { type: 'poly', pts: square(half + 52) } };
}

// Snub hexagonal tiling (3.3.3.3.6): hexagons spun in a pinwheel of triangles.
function snubHexagonal() {
  const b = new Builder();
  const P = { mid: 0, royal: 1, sky: 2, ice: 3, gold: 4, coral: 5, pearl: 6, sap: 7 };
  const a = 27, R = 336, plate = hexPlate(R), lim = inPoly(plate, 4);
  const c1 = [a * 2.5, (a * SQ3) / 2], c2 = [c1[0] * 0.5 - c1[1] * 0.866025, c1[0] * 0.866025 + c1[1] * 0.5];
  const hexes = [], vh = new Map();
  for (let m = -9; m <= 9; m++) for (let n = -9; n <= 9; n++) {
    const x = m * c1[0] + n * c2[0], y = m * c1[1] + n * c2[1];
    if (Math.hypot(x, y) > R + 2 * a) continue;
    const V = Array.from({ length: 6 }, (_, k) => [x + a * Math.cos((k * PI) / 3), y + a * Math.sin((k * PI) / 3)]);
    const h = { x, y, V, d: Math.max(Math.abs(m), Math.abs(n), Math.abs(m + n)), ok: polyIn(plate, x, y) >= 21 };
    hexes.push(h);
    V.forEach((v, k) => vh.set(key(...v), [h, k, v]));
  }
  const allV = [...vh.values()];
  const tris = new Map();
  for (const [h0, , p] of allV) {
    const nb = allV.filter(([h1, , q]) => h1 !== h0 && Math.abs(Math.hypot(q[0] - p[0], q[1] - p[1]) - a) < 0.5);
    for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) {
      const q = nb[i][2], r = nb[j][2];
      if (Math.abs(Math.hypot(q[0] - r[0], q[1] - r[1]) - a) > 0.5) continue;
      const cx = (p[0] + q[0] + r[0]) / 3, cy = (p[1] + q[1] + r[1]) / 3;
      tris.set(key(cx, cy), [cx, cy, [vh.get(key(...p)), nb[i], nb[j]]]);
    }
  }
  const edges = new Map(), nodes = new Map();
  const use = (pts) => pts.forEach((v, k) => { nodes.set(key(...v), v); const w = pts[(k + 1) % pts.length]; edges.set(key((v[0] + w[0]) / 2, (v[1] + w[1]) / 2), [v, w]); });
  const hexCol = [P.gold, P.coral, P.royal, P.sap, P.royal, P.sap, P.royal];
  for (const h of hexes) {
    if (!h.ok) continue;
    b.add('hexagon', h.x, h.y, 40 * 0.866, 40, PI / 2, hexCol[h.d], { force: true });
  }
  for (const [cx, cy, T] of tris.values()) {
    const pts = T.map((t) => t[2]);
    if (polyIn(plate, cx, cy) < 11) continue;
    // a triangle on a hexagon edge has two vertices of one hexagon
    let p = P.gold;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (T[i][0] === T[j][0]) {
      const k = (T[i][1] + 1) % 6 === T[j][1] ? T[i][1] : T[j][1];
      const near = T[i][0].d <= 1;
      p = k % 2 ? (near ? P.pearl : P.ice) : (near ? P.coral : P.sky);
    }
    b.add('round', cx, cy, 13, 13, 0, p, { force: true });
  }
  for (const [, , [x, y]] of allV) b.add('round', x, y, 8, 8, 0, P.mid, { limit: lim, gap: 0.2 });
  fillGaps(b, R, 8.5, 8, () => P.mid, lim);
  frame(b, hexPlate(R + 2), 15, 'square', 12, 12, (e, k) => (k % 2 ? P.gold : P.mid), { force: false });
  frame(b, hexPlate(R + 22), 16, 'round', 13, 13, (e, k) => (k % 2 ? P.coral : P.royal), { force: false });
  return { b, palette: ['midnight', 'royal', 'sky', 'ice', 'gold', 'coral', 'pearl', 'sapphire'], plate: { type: 'poly', pts: hexPlate(R + 40) } };
}

// Azulejo panel: sixteen glazed tiles; quarter-rosettes meet at every tile corner.
function azulejoPanel() {
  const b = new Builder();
  const P = { cobalt: 0, royal: 1, sky: 2, pearl: 3, lemon: 4, mid: 5, ice: 6, amber: 7 };
  const T = 112, n = 4, half = (T * n) / 2, box = square(half), lim = inPoly(box, 0);
  // corner rosettes
  for (let I = 0; I <= n; I++) for (let J = 0; J <= n; J++) {
    const cx = -half + I * T, cy = -half + J * T, o = { cx, cy, limit: lim, force: false, gap: 0.3 };
    b.add('round', cx, cy, 18, 18, 0, P.amber, { limit: lim, gap: 0.3 });
    ring(b, 21, 8, 'teardrop', 13, 20, P.cobalt, o);
    ring(b, 20, 8, 'round', 8, 8, P.lemon, { ...o, phase: 0.5 });
    ring(b, 30, 16, 'round', 9, 9, (i) => (i % 2 ? P.lemon : P.amber), { ...o, phase: 0.25 });
    ring(b, 40, 24, 'round', 9, 9, P.cobalt, { ...o, phase: 0 });
  }
  // tile centres: eight-point stars
  for (let I = 0; I < n; I++) for (let J = 0; J < n; J++) {
    const cx = -half + (I + 0.5) * T, cy = -half + (J + 0.5) * T, o = { cx, cy, force: false, gap: 0.3 };
    b.add('round', cx, cy, 16, 16, 0, P.lemon, { force: true });
    ring(b, 20, 8, 'rhombus', 11, 24, P.royal, o);
    ring(b, 18, 8, 'round', 8, 8, P.sky, { ...o, phase: 0.5 });
    ring(b, 34, 8, 'teardrop', 10, 15, P.cobalt, o);
    ring(b, 30, 8, 'round', 9, 9, P.cobalt, { ...o, phase: 0.5 });
    // links to the tile edge midpoints
    for (let k = 0; k < 4; k++) {
      const [ux, uy] = polar(1, (k * PI) / 2);
      b.add('marquise', cx + ux * 52, cy + uy * 52, 10, 26, (k * PI) / 2, P.royal, { gap: 0.3, limit: lim });
      b.add('round', cx + ux * 37, cy + uy * 37, 8, 8, 0, P.sky, { gap: 0.3 });
    }
  }
  // glaze: pale field, blue grout lines, sky inside the corner rosettes
  const glaze = (x, y) => {
    const gx = mod(x + half, T), gy = mod(y + half, T);
    const dc = Math.hypot(Math.min(gx, T - gx), Math.min(gy, T - gy));
    if (dc < 47) return P.sky;
    if (Math.min(gx, T - gx, gy, T - gy) < 5) return P.ice;
    return P.pearl;
  };
  fillGaps(b, half, 8.6, 9.6, glaze, lim);
  rectBand(b, half + 11, half + 11, 16, 13, (k, c) => (c ? P.amber : k % 2 ? P.cobalt : P.lemon));
  rectBand(b, half + 28, half + 28, 16, 13, (k, c) => (c ? P.amber : P.mid));
  rectBand(b, half + 45, half + 45, 16, 13, (k, c) => (c ? P.amber : k % 2 ? P.royal : P.sky), 'round');
  return { b, palette: ['cobalt', 'royal', 'sky', 'pearl', 'lemon', 'midnight', 'ice', 'amber'], plate: { type: 'poly', pts: square(half + 60) } };
}

// Art Deco panel: a stepped ziggurat holds a rising sun and fanned rays, echoed by stepped outlines.
function decoSunrise() {
  const b = new Builder();
  const P = { onyx: 0, mid: 1, gold: 2, cit: 3, cream: 4, tang: 5, teal: 6, coral: 7 };
  const pitch = 11.6, nx = 35, ny = 45, hx = (nx * pitch) / 2, hy = (ny * pitch) / 2, ic = (nx - 1) / 2;
  const hz = 30; // horizon row (sun centre)
  const zw = (j) => (j < 5 ? -1 : 3 + 3 * Math.floor((j - 5) / 5)); // ziggurat half-width per row
  grid(nx, ny, pitch, (i, j, x, y) => {
    const ci = Math.min(i, nx - 1 - i), cj = Math.min(j, ny - 1 - j), m = Math.min(ci, cj);
    const u = Math.abs(i - ic);
    let p;
    if (m === 0) p = P.onyx;
    else if (m === 1) p = (i + j) % 2 ? P.gold : P.onyx;
    else if (m === 2) p = P.onyx;
    else if (j > hz) {
      // stepped base below the horizon
      const row = j - hz, w = 16 - 2 * Math.floor((row - 1) / 2);
      if (u <= w) p = [P.gold, P.teal, P.teal, P.cream, P.mid, P.mid, P.gold, P.teal, P.teal, P.cream, P.mid][row % 11];
      else p = row % 2 ? P.onyx : P.mid;
    } else {
      const w = zw(j);
      // stepped distance outside the ziggurat (Chebyshev to the stepped outline)
      let dz = Infinity;
      for (let jj = 3; jj <= hz; jj++) { const ww = zw(jj); if (ww < 0) continue; dz = Math.min(dz, Math.max(u - ww, Math.abs(jj - j))); }
      if (u <= w) {
        const dx = (i - ic), dy = hz + 0.5 - j, r = Math.hypot(dx, dy), ang = Math.atan2(dx, dy);
        if (r < 3) p = P.cream;
        else if (r < 4.5) p = P.cit;
        else if (r < 6) p = P.gold;
        else if (r < 7.4) p = P.tang;
        else if (r < 8.6) p = P.onyx;
        else {
          const k = Math.floor((ang + PI / 2) / (PI / 11));
          p = k % 2 ? (r < 15 ? P.coral : P.tang) : P.cream;
        }
      } else p = dz === 1 ? P.gold : dz % 3 === 0 ? P.teal : P.mid;
    }
    b.add('square', x, y, 10.4, 10.4, 0, p, { force: true });
  });
  return { b, palette: ['onyx', 'midnight', 'gold', 'citrine', 'cream', 'tangerine', 'teal', 'coral'], plate: { type: 'poly', pts: rect(hx + 14, hy + 14) } };
}

// Eye-dazzler weaving: serrated concentric diamonds on a diamond lattice.
function eyeDazzler() {
  const b = new Builder();
  const P = { onyx: 0, scarlet: 1, cream: 2, gold: 3, cobalt: 4, garnet: 5, sky: 6 };
  const pitch = 12, nx = 37, ny = 49, i0 = (nx - 1) / 2, j0 = (ny - 1) / 2, Rd = 12;
  const seqC = [P.gold, P.gold, P.scarlet, P.onyx, P.cream, P.scarlet, P.cobalt, P.cream];
  const seqO = [P.cream, P.cobalt, P.cobalt, P.onyx, P.sky, P.scarlet, P.garnet, P.cream];
  grid(nx, ny, pitch, (i, j, x, y) => {
    const ci = Math.min(i, nx - 1 - i), cj = Math.min(j, ny - 1 - j), m = Math.min(ci, cj);
    let p;
    if (m === 0) p = P.onyx;
    else if (m === 1) p = P.cream;
    else if (m === 2) { const t = ci === 2 ? j : i; p = mod(t, 4) < 2 ? P.scarlet : P.onyx; }
    else if (m === 3) p = P.cream;
    else {
      const a = i - i0, c = j - j0;
      // nearest diamond centre (L1 balls of radius Rd on the lattice u + v even)
      let best = null;
      for (let u = Math.floor(a / Rd) - 1; u <= Math.floor(a / Rd) + 2; u++) for (let v = Math.floor(c / Rd) - 1; v <= Math.floor(c / Rd) + 2; v++) {
        if (mod(u + v, 2)) continue;
        const D = Math.abs(a - u * Rd) + Math.abs(c - v * Rd);
        if (!best || D < best.D) best = { D, u, v };
      }
      const sx = Math.sign(a - best.u * Rd) || 1, sy = Math.sign(c - best.v * Rd) || 1;
      const serr = mod(sx * (a - best.u * Rd) - sy * (c - best.v * Rd), 2) ? 0.5 : 0;
      const band = Math.min(7, Math.floor((best.D + serr) / 1.6));
      const centre = best.u === 0 && best.v === 0, far = Math.abs(best.v) >= 2;
      p = (centre ? seqC : far ? seqC : seqO)[band];
      if (!centre && far && band < 2) p = P.cobalt;
    }
    b.add('square', x, y, 10.6, 10.6, 0, p, { force: true });
  });
  const hx = (nx * pitch) / 2, hy = (ny * pitch) / 2;
  return { b, palette: ['onyx', 'scarlet', 'cream', 'gold', 'cobalt', 'garnet', 'sky'], plate: { type: 'poly', pts: rect(hx + 14, hy + 14) } };
}

// Dovetail tiles: every tile locks into its neighbours, bevelled light and shade, a gold heart.
function interlockingKeys() {
  const b = new Builder();
  const P = { mid: 0, royal: 1, sky: 2, copper: 3, sand: 4, cream: 5, gold: 6, amber: 7 };
  const C = 8, nt = 5, pitch = 11.6, N = C * nt;
  // cells of a block taken by the tile above (a dovetail hanging down); transposed for the tile to the left
  const tab = new Set(['3,0', '4,0', '2,1', '3,1', '4,1', '5,1', '1,2', '2,2', '3,2', '4,2', '5,2', '6,2']);
  const owner = (gx, gy) => {
    const I = Math.floor(gx / C), J = Math.floor(gy / C), u = mod(gx, C), v = mod(gy, C);
    if (tab.has(u + ',' + v)) return [I, J - 1];
    if (tab.has(v + ',' + u)) return [I - 1, J];
    return [I, J];
  };
  const half = (N * pitch) / 2, off = 1; // shift so that tile bodies are centred
  for (let gx = -1; gx < N + 1; gx++) for (let gy = -1; gy < N + 1; gy++) {
    const x = (gx - (N - 1) / 2) * pitch, y = (gy - (N - 1) / 2) * pitch;
    let p;
    if (gx < 0 || gy < 0 || gx >= N || gy >= N) {
      p = mod(gx + gy, 2) ? P.mid : P.gold;
    } else {
      const own = (dx, dy) => owner(gx + dx + off, gy + dy + off);
      const [I, J] = own(0, 0), same = (o) => o[0] === I && o[1] === J;
      const shade = !same(own(1, 0)) || !same(own(0, 1)), light = !same(own(-1, 0)) || !same(own(0, -1));
      const ti = I - (nt - 1) / 2, tj = J - (nt - 1) / 2, rk = Math.max(Math.abs(ti), Math.abs(tj));
      const warm = mod(I + J, 2) === 0;
      const fam = rk === 0 ? [P.gold, P.amber, P.copper] : warm ? [P.cream, P.sand, P.copper] : [P.sky, P.royal, P.mid];
      p = shade ? fam[2] : light ? fam[0] : fam[1];
    }
    b.add('square', x, y, 10.2, 10.2, 0, p, { force: true });
  }
  return { b, palette: ['midnight', 'royal', 'sky', 'copper', 'sand', 'cream', 'gold', 'amber'], plate: { type: 'poly', pts: square(half + pitch + 14) } };
}

// ---------------------------------------------------------------- Master
// Lone Star quilt: eight points of 45-degree diamonds banded in rings, echo-quilted setting pieces.
function loneStar() {
  const b = new Builder();
  const P = { navy: 0, ruby: 1, rose: 2, blush: 3, cream: 4, gold: 5, garnet: 6, sand: 7 };
  const s = 14.6, n = 10, c8 = Math.cos(PI / 8), s8 = Math.sin(PI / 8);
  const tip = n * s * 2 * c8, half = Math.round(tip * c8) + 2;
  const seq = [P.gold, P.cream, P.blush, P.rose, P.ruby, P.garnet, P.navy, P.ruby, P.rose, P.gold];
  const centres = [];
  for (let k = 0; k < 8; k++) {
    const t1 = k * (PI / 4), t2 = t1 + PI / 4, [e1x, e1y] = polar(1, t1), [e2x, e2y] = polar(1, t2);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = ((i + 0.5) * e1x + (j + 0.5) * e2x) * s, y = ((i + 0.5) * e1y + (j + 0.5) * e2y) * s;
      b.add('rhombus', x, y, 2 * s * s8 * 0.88, 2 * s * c8 * 0.92, t1 + PI / 8, seq[Math.floor((i + j) / 2)], { force: true });
      centres.push([x, y]);
    }
  }
  const box = square(half), lim = inPoly(box, 0);
  // small feathered stars in the corner squares, fans in the side triangles
  const cs = (n * s) / 2 + 2;
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const cx = sx * (half - cs * Math.SQRT1_2 * 1.05), cy = sy * (half - cs * Math.SQRT1_2 * 1.05);
    b.add('round', cx, cy, 16, 16, 0, P.gold, { force: true });
    ring(b, 21, 8, 'rhombus', 10, 26, (i) => (i % 2 ? P.ruby : P.garnet), { cx, cy });
    ring(b, 22, 8, 'round', 9, 9, P.rose, { cx, cy, phase: 0.5, force: false, gap: 0.3 });
    ring(b, 39, 8, 'teardrop', 10, 16, P.navy, { cx, cy, force: false, gap: 0.3 });
  }
  for (let k = 0; k < 4; k++) {
    const [cx, cy] = polar(half - 34, (k * PI) / 2);
    b.add('round', cx, cy, 15, 15, 0, P.gold, { force: true });
    for (const d of [-1, 0, 1]) {
      const [ux, uy] = polar(24, (k * PI) / 2 + PI + d * 0.75);
      b.add('teardrop', cx + ux, cy + uy, 11, 19, (k * PI) / 2 + PI + d * 0.75, d ? P.rose : P.ruby, { gap: 0.3 });
    }
  }
  // echo quilting in the background
  const outline = Array.from({ length: 16 }, (_, k) => polar(k % 2 ? n * s : tip, (k * PI) / 8 + PI / 8));
  const echo = (x, y) => (Math.floor(edgeDist(outline, x, y) / 13) % 3 === 1 ? P.sand : P.cream);
  hexFill(b, half - 4, half - 4, 10.6, 9.4, echo, { limit: lim });
  fillGaps(b, half, 8.6, 6, echo, lim, 'round', 2);
  rectBand(b, half + 11, half + 11, 13, 13, (k, c) => (c ? P.gold : P.navy), 'square', PI / 4);
  rectBand(b, half + 26, half + 26, 13, 12, (k, c) => (c ? P.navy : k % 2 ? P.ruby : P.cream), 'square', PI / 4);
  rectBand(b, half + 42, half + 42, 13, 13, (k, c) => (c ? P.gold : P.navy));
  return { b, palette: ['midnight', 'ruby', 'rose', 'blush', 'cream', 'gold', 'garnet', 'sand'], plate: { type: 'poly', pts: square(half + 58) } };
}

// Interlaced strapwork panel: a sixteen-point star and eight-point stars, straps woven over and under.
function alhambraStrapwork() {
  const b = new Builder();
  const P = { mid: 0, em: 1, forest: 2, gold: 3, pearl: 4, cobalt: 5, sky: 6, amber: 7 };
  const H = 300, box = square(H), lim = inPoly(box, 0);
  const starOut = (cx, cy, nn, Ro, Ri, rot = 0) => Array.from({ length: 2 * nn }, (_, i) => { const [x, y] = polar(i % 2 ? Ri : Ro, rot + (i * PI) / nn); return [cx + x, cy + y]; });
  const D = 228;
  const strands = [starOut(0, 0, 16, 192, 150, 0), starOut(0, 0, 16, 104, 80, PI / 16)];
  const meta = [[0, 0, 192], [0, 0, 104]];
  for (const [cx, cy] of [[0, -D], [D, 0], [0, D], [-D, 0]]) { strands.push(starOut(cx, cy, 8, 104, 70, 0)); meta.push([cx, cy, 104]); }
  for (const [cx, cy] of [[D, D], [D, -D], [-D, D], [-D, -D]]) { strands.push(starOut(cx, cy, 8, 86, 58, PI / 8)); meta.push([cx, cy, 86]); }
  const wsum = (x, y) => strands.reduce((a, st, i) => a + (Math.hypot(x - meta[i][0], y - meta[i][1]) < meta[i][2] ? Math.abs(winding(st, x, y)) : 0), 0);
  // all crossings
  const segs = [];
  strands.forEach((st, si) => st.forEach((A, k) => segs.push({ si, k, A, B: st[(k + 1) % st.length] })));
  const cross = segs.map(() => []);
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const s1 = segs[i], s2 = segs[j];
    const [ax, ay] = s1.A, [bx, by] = s1.B, [cx, cy] = s2.A, [dx, dy] = s2.B;
    const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(den) < 1e-9) continue;
    const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
    if (t <= 1e-6 || t >= 1 - 1e-6 || u <= 1e-6 || u >= 1 - 1e-6) continue;
    const x = ax + t * (bx - ax), y = ay + t * (by - ay);
    const over = (sg) => { const L = Math.hypot(sg.B[0] - sg.A[0], sg.B[1] - sg.A[1]), ux = (sg.B[0] - sg.A[0]) / L, uy = (sg.B[1] - sg.A[1]) / L; return wsum(x + 2 * (ux - uy), y + 2 * (uy + ux)) % 2 === 1; };
    const o1 = over(s1);
    cross[i].push([x, y, o1]); cross[j].push([x, y, !o1]);
  }
  // straps: a pearl band edged in gold, broken where it passes under
  const strapPts = [];
  segs.forEach((sg, i) => {
    const [ax, ay] = sg.A, [bx, by] = sg.B, L = Math.hypot(bx - ax, by - ay), m = Math.max(1, Math.round(L / 10.5));
    for (let q = 0; q <= m; q++) {
      const x = ax + ((bx - ax) * q) / m, y = ay + ((by - ay) * q) / m;
      if (cross[i].some(([cx, cy, o]) => !o && Math.hypot(cx - x, cy - y) < 14)) continue;
      b.add('round', x, y, 10, 10, 0, P.pearl, { gap: 0.1, limit: lim });
    }
  });

  // the ground between the straps
  const col = (x, y) => {
    const ins = strands.map((st, i) => Math.hypot(x - meta[i][0], y - meta[i][1]) < meta[i][2] && winding(st, x, y) !== 0);
    if (ins[1]) return P.amber;
    if (ins[0]) return ins.slice(2).some(Boolean) ? P.gold : P.em;
    const k = ins.findIndex((v, i) => v && i >= 2);
    if (k >= 2) return k < 6 ? P.sky : P.amber;
    return Math.max(Math.abs(x), Math.abs(y)) > H - 24 ? P.forest : P.mid;
  };
  // centre rosette
  b.add('round', 0, 0, 26, 26, 0, P.gold, { force: true });
  ring(b, 26, 16, 'teardrop', 10, 18, P.em, { force: true });
  ring(b, 22, 16, 'round', 8, 8, P.pearl, { phase: 0.5, force: false, gap: 0.2 });
  ring(b, 42, 16, 'round', 10, 10, P.gold, { phase: 0.5, force: false, gap: 0.2 });
  for (const st of strands.slice(2)) {
    let cx = 0, cy = 0; for (const [x, y] of st) { cx += x / 16; cy += y / 16; }
    if (lim(cx, cy, 10)) { b.add('round', cx, cy, 20, 20, 0, P.gold, { force: true }); ring(b, 18, 8, 'round', 8, 8, P.pearl, { cx, cy, force: false, gap: 0.2 }); }
  }
  hexFill(b, H - 4, H - 4, 10.4, 9.2, col, { limit: lim });
  fillGaps(b, H, 8.2, 5.2, col, lim, 'round', 2);
  rectBand(b, H + 11, H + 11, 13, 12, (k, c) => (c ? P.gold : P.mid));
  rectBand(b, H + 25, H + 25, 13, 12, (k, c) => (c ? P.gold : k % 2 ? P.em : P.pearl), 'square', PI / 4);
  rectBand(b, H + 39, H + 39, 13, 12, (k, c) => (c ? P.gold : P.mid));
  return { b, palette: ['midnight', 'emerald', 'forest', 'gold', 'pearl', 'cobalt', 'sky', 'amber'], plate: { type: 'poly', pts: square(H + 54) } };
}

// Cosmatesque quincunx: porphyry roundels in a woven band, triangle mosaics and a twisted rope border.
function cosmatiQuincunx() {
  const b = new Builder();
  const P = { garnet: 0, forest: 1, pearl: 2, gold: 3, onyx: 4, ruby: 5, jade: 6, cream: 7 };
  const H = 300, box = square(H), lim = inPoly(box, 0);
  const R0 = 112, R1 = 58, C1 = 196, bw = 22;
  const rounds = [[0, 0, R0], [C1, C1, R1], [-C1, C1, R1], [C1, -C1, R1], [-C1, -C1, R1]];
  // porphyry and serpentine discs
  b.add('round', 0, 0, 74, 74, 0, P.garnet, { force: true });
  ring(b, 44, 24, 'round', 11, 11, P.pearl, { force: true });
  for (const [cx, cy] of rounds.slice(1)) { b.add('round', cx, cy, 50, 50, 0, P.forest, { force: true }); ring(b, 32, 16, 'round', 10, 10, P.pearl, { cx, cy }); }
  // woven bands round each roundel and along the diagonals
  const bandPath = [];
  for (const [cx, cy, r] of rounds) bandPath.push({ type: 'c', cx, cy, r: r + bw / 2 });
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const d0 = R0 + bw, d1 = C1 * Math.SQRT2 - R1 - bw;
    bandPath.push({ type: 'l', A: [sx * d0 * Math.SQRT1_2, sy * d0 * Math.SQRT1_2], B: [sx * d1 * Math.SQRT1_2, sy * d1 * Math.SQRT1_2] });
  }
  const inBand = (x, y) => {
    for (const [cx, cy, r] of rounds) { const d = Math.hypot(x - cx, y - cy); if (d > r - 1 && d < r + bw + 1) return { d: d - r, t: Math.atan2(y - cy, x - cx) * r }; }
    const u = (Math.abs(x) + Math.abs(y)) * 0, along = (x * Math.sign(x) + y * Math.sign(y)) * Math.SQRT1_2, perp = Math.abs(Math.abs(x) - Math.abs(y)) * Math.SQRT1_2;
    if (perp < bw / 2 + 1 && along > R0 && along < C1 * Math.SQRT2 - R1) return { d: perp + bw / 2, t: along + u };
    return null;
  };
  for (const pth of bandPath) {
    if (pth.type === 'c') {
      for (const [rr, sz, cl] of [[pth.r - bw / 2 + 4, 8, P.pearl], [pth.r + bw / 2 - 4, 8, P.pearl]]) ring(b, rr, Math.round((TAU * rr) / 10 / 4) * 4, 'round', sz, sz, cl, { cx: pth.cx, cy: pth.cy, force: false, gap: 0.2 });
      ring(b, pth.r, Math.round((TAU * pth.r) / 13 / 8) * 8, 'square', 10, 10, (i) => (i % 2 ? P.ruby : P.gold), { cx: pth.cx, cy: pth.cy, twist: PI / 4, force: false, gap: 0.2 });
    }
  }
  for (const pth of bandPath) if (pth.type === 'l') {
    const [ax, ay] = pth.A, [bx, by] = pth.B, L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L, ny = (bx - ax) / L;
    for (const off of [-bw / 2 + 4, bw / 2 - 4]) seg(b, [ax + nx * off, ay + ny * off], [bx + nx * off, by + ny * off], 10, 'round', 8, 8, P.pearl, { force: false, gap: 0.2 });
    seg(b, pth.A, pth.B, 13, 'square', 10, 10, (k) => (k % 2 ? P.ruby : P.gold), { force: false, gap: 0.2 });
  }
  // triangle mosaic inside the big roundel annulus; lozenges in the spandrels
  const tri = (x, y) => {
    const s = 26, v = y / (s * 0.866), u = x / s - v / 2;
    const fu = Math.floor(u), fv = Math.floor(v), up = u - fu + (v - fv) < 1;
    return up ? P.cream : P.onyx;
  };
  const col = (x, y) => {
    const r = Math.hypot(x, y);
    if (r < R0) return tri(x, y) === P.cream ? (r < 80 ? P.gold : P.cream) : P.garnet;
    for (const [cx, cy, rr] of rounds.slice(1)) if (Math.hypot(x - cx, y - cy) < rr) return tri(x - cx, y - cy) === P.cream ? P.jade : P.forest;
    const band = inBand(x, y);
    if (band) return P.onyx;
    const u = Math.floor((x + y) / 34), v = Math.floor((x - y) / 34);
    const edge = Math.max(Math.abs(x), Math.abs(y)) > H - 60 || (Math.abs(x) < 70 || Math.abs(y) < 70);
    return mod(u + v, 2) ? P.cream : (edge ? P.garnet : P.forest);
  };
  hexFill(b, H - 4, H - 4, 10.6, 9.4, col, { limit: lim });
  fillGaps(b, H, 8.4, 5.3, col, lim, 'round', 3);
  // twisted rope border: two strands crossing, gold eyes between
  const lam = 40, A = 9, rb = H + 22;
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.add('square', sx * rb, sy * rb, 22, 22, PI / 4, P.gold, { force: true });
  for (let side = 0; side < 4; side++) {
    const rot = (side * PI) / 2, cs = Math.cos(rot), sn = Math.sin(rot);
    const tf = (t, o) => { const x = t, y = -rb + o; return [x * cs - y * sn, x * sn + y * cs]; };
    const nper = Math.round((2 * rb) / lam);
    for (let k = 0; k < nper; k++) {
      const t0 = -rb + (k + 0.5) * ((2 * rb) / nper);
      const [ex, ey] = tf(t0, 0); b.add('round', ex, ey, 9, 9, 0, P.gold, { force: true });
    }
    for (const sgn of [1, -1]) for (let q = 0; q < nper * 4; q++) {
      const t = -rb + (q / (nper * 4)) * 2 * rb, ph = ((t + rb) / ((2 * rb) / nper)) * TAU;
      const [x, y] = tf(t, sgn * A * Math.sin(ph));
      const nearCross = Math.abs(Math.sin(ph)) < 0.5, k = Math.round(ph / PI);
      if (nearCross && mod(k + (sgn > 0 ? 0 : 1), 2) === 0) continue;
      b.add('round', x, y, 9, 9, 0, sgn > 0 ? P.ruby : P.forest, { gap: 0.1 });
    }
  }
  rectBand(b, H + 44, H + 44, 13, 12, (k, c) => (c ? P.gold : P.onyx));
  return { b, palette: ['garnet', 'forest', 'pearl', 'gold', 'onyx', 'ruby', 'jade', 'cream'], plate: { type: 'poly', pts: square(H + 60) } };
}

// Truncated trihexagonal tiling (4.6.12): dodecagon rosettes, hexagons and squares on a square floor.
function dodecagonMosaic() {
  const b = new Builder();
  const P = { mid: 0, teal: 1, tq: 2, mint: 3, gold: 4, cream: 5, coral: 6, choc: 7 };
  const a = 26, Rc = a / (2 * Math.sin(PI / 12)), D = a * (3 + SQ3), H = 304, box = square(H), lim = inPoly(box, 0);
  const dod = [];
  for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) {
    const x = D * (q + r / 2), y = (D * SQ3 * r) / 2;
    if (Math.abs(x) > H + Rc || Math.abs(y) > H + Rc) continue;
    dod.push({ x, y, d: Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)), q, r });
  }
  const outlines = [];
  // hexagons at the triangle centres of the dodecagon lattice
  const hexes = new Map();
  for (const o of dod) for (const sgn of [1, -1]) {
    const x = o.x, y = o.y + (sgn * D) / SQ3;
    hexes.set(key(x, y), [x, y]);
  }
  for (const o of dod) {
    const V = Array.from({ length: 12 }, (_, k) => { const t = PI / 12 + (k * PI) / 6; return [o.x + Rc * Math.cos(t), o.y + Rc * Math.sin(t)]; });
    outlines.push(V);
    const cx = o.x, cy = o.y, op = { cx, cy, force: false, gap: 0.3, limit: lim };
    const pal = o.d === 0 ? [P.gold, P.coral, P.cream, P.teal] : o.d % 2 ? [P.cream, P.teal, P.tq, P.mid] : [P.coral, P.gold, P.mint, P.teal];
    b.add('round', cx, cy, 20, 20, 0, pal[0], { limit: lim, gap: 0.3 });
    ring(b, 22, 12, 'marquise', 9, 22, pal[1], op);
    ring(b, 17, 12, 'round', 8, 8, pal[2], { ...op, phase: 0.5 });
    ring(b, 34, 12, 'round', 10, 10, pal[2], { ...op, phase: 0.5 });
    ring(b, 38, 12, 'teardrop', 9, 14, pal[3], op);
  }
  for (const [x, y] of hexes.values()) {
    const V = Array.from({ length: 6 }, (_, k) => { const t = (k * PI) / 3; return [x + a * Math.cos(t), y + a * Math.sin(t)]; });
    outlines.push(V);
    b.add('hexagon', x, y, 30 * 0.866, 30, 0, P.choc, { limit: lim, gap: 0.3 });
    ring(b, 18, 6, 'round', 8, 8, P.gold, { cx: x, cy: y, phase: 0.5, force: false, gap: 0.3, limit: lim });
  }
  // squares between neighbouring dodecagons
  for (const o of dod) for (const [dq, dr] of [[1, 0], [0, 1], [-1, 1]]) {
    const x = o.x + (D * (dq + dr / 2)) / 2, y = o.y + (D * SQ3 * dr) / 4;
    b.add('square', x, y, 17, 17, Math.atan2(dr * SQ3, 2 * dq + dr) , P.tq, { limit: lim, gap: 0.3 });
  }
  const edges = new Map();
  for (const V of outlines) V.forEach((v, k) => { const w = V[(k + 1) % V.length]; edges.set(key((v[0] + w[0]) / 2, (v[1] + w[1]) / 2), [v, w]); });
  for (const [A, B] of edges.values()) seg(b, A, B, 13, 'round', 8, 8, P.mid, { force: false, gap: 0.2, limit: lim });
  for (const [A] of edges.values()) b.add('round', A[0], A[1], 9, 9, 0, P.gold, { gap: 0.1, limit: lim });
  fillGaps(b, H, 8.4, 6, () => P.mid, lim, 'round', 4);
  rectBand(b, H + 11, H + 11, 13, 12, (k, c) => (c ? P.gold : P.mid));
  rectBand(b, H + 25, H + 25, 13, 12, (k, c) => (c ? P.gold : k % 2 ? P.coral : P.teal), 'round');
  rectBand(b, H + 39, H + 39, 13, 12, (k, c) => (c ? P.gold : P.mid));
  return { b, palette: ['midnight', 'teal', 'turquoise', 'mint', 'gold', 'cream', 'coral', 'chocolate'], plate: { type: 'poly', pts: square(H + 54) } };
}

// Meander pavement: nine polygon medallions set in running Greek-key bands.
function meanderPavement() {
  const b = new Builder();
  const P = { choc: 0, sand: 1, cream: 2, terra: 3, gold: 4, slate: 5, ochre: 6, mid: 7 };
  const pitch = 10.6, cp = 13, bw = 6, N = 3 * cp + 4 * bw, half = (N * pitch) / 2;
  // running meander on a band 6 cells tall, period 6
  const mk = ['111110', '100010', '101010', '101110', '100000', '111111'];
  const isBand = (g) => { const m = mod(g, cp + bw); return m < bw ? m : -1; };
  grid(N, N, pitch, (i, j, x, y) => {
    const bi = isBand(i), bj = isBand(j);
    let p = null;
    if (bi >= 0 && bj >= 0) p = (bi === 0 || bi === bw - 1 || bj === 0 || bj === bw - 1) ? P.choc : (bi + bj) % 2 ? P.gold : P.terra;
    else if (bj >= 0) { const r = bj, c = mod(i - bw, 6); p = mk[r][c] === '1' ? P.choc : P.cream }
    else if (bi >= 0) { const r = bi, c = mod(j - bw, 6); p = mk[5 - r][c] === '1' ? P.choc : P.cream; }
    if (p != null) b.add('square', x, y, 9.4, 9.4, 0, p, { force: true });
  });
  // the nine panels
  const step = (cp + bw) * pitch, inner = (cp * pitch) / 2 - 2;
  for (let I = -1; I <= 1; I++) for (let J = -1; J <= 1; J++) {
    const cx = I * step, cy = J * step, box = square(inner).map(([x, y]) => [cx + x, cy + y]), lim = inPoly(box, 0);
    const kind = I === 0 && J === 0 ? 0 : I && J ? 1 : 2;
    const o = { cx, cy, force: false, gap: 0.3, limit: lim };
    let poly;
    if (kind === 0) {
      poly = regPoly(8, 62, PI / 8).map(([x, y]) => [cx + x, cy + y]);
      b.add('round', cx, cy, 22, 22, 0, P.gold, { force: true });
      ring(b, 27, 8, 'marquise', 11, 26, P.terra, o);
      ring(b, 22, 8, 'round', 8, 8, P.cream, { ...o, phase: 0.5 });
    } else if (kind === 1) {
      poly = regPoly(4, 60, 0).map(([x, y]) => [cx + x, cy + y]);
      b.add('square', cx, cy, 22, 22, PI / 4, P.terra, { force: true });
      ring(b, 24, 4, 'teardrop', 12, 20, P.gold, o);
      ring(b, 22, 4, 'round', 10, 10, P.slate, { ...o, phase: 0.5 });
    } else {
      const rot = I ? PI / 2 : 0;
      poly = regPoly(6, 60, rot).map(([x, y]) => [cx + x, cy + y]);
      b.add('hexagon', cx, cy, 24 * 0.866, 24, rot, P.slate, { force: true });
      ring(b, 24, 6, 'teardrop', 12, 20, P.terra, { ...o, start: rot });
      ring(b, 22, 6, 'round', 9, 9, P.gold, { ...o, start: rot, phase: 0.5 });
    }
    frame(b, poly, 11, 'round', 9, 9, P.choc, { force: false, gap: 0.2 });
    const inner2 = poly.map(([x, y]) => [cx + (x - cx) * 0.62, cy + (y - cy) * 0.62]);
    const col = (x, y) => (Math.max(Math.abs(x - cx), Math.abs(y - cy)) > inner - 10 ? P.choc : winding(inner2, x, y) ? (kind === 0 ? P.cream : P.sand) : winding(poly, x, y) ? (kind === 0 ? P.mid : kind === 1 ? P.slate : P.terra) : P.sand);
    hexFill(b, inner, inner, 10.6, 9.2, col, { cx, cy, limit: lim });
    for (let x = cx - inner; x <= cx + inner; x += 4) for (let y = cy - inner; y <= cy + inner; y += 4) b.add('round', x, y, 8.4, 8.4, 0, col(x, y), { gap: 0.3, limit: lim });
  }
  rectBand(b, half + 10, half + 10, 13, 12, (k, c) => (c ? P.gold : k % 2 ? P.terra : P.cream), 'square', PI / 4);
  return { b, palette: ['chocolate', 'sand', 'cream', 'copper', 'gold', 'slate', 'amber', 'midnight'], plate: { type: 'poly', pts: square(half + 26) } };
}

// Pythagorean pavement: large and small squares in a pinwheel stagger, glazed as a stepped medallion.
function pythagoreanPavement() {
  const b = new Builder();
  const P = { mid: 0, plum: 1, orchid: 2, lav: 3, cream: 4, gold: 5, teal: 6, mint: 7 };
  const A = 96, Bs = 48, H = 300, box = square(H), lim = inPoly(box, 0);
  const u = [A, Bs], v = [-Bs, A];
  const big = [], small = [];
  for (let m = -5; m <= 5; m++) for (let n = -5; n <= 5; n++) {
    const ox = m * u[0] + n * v[0] - A / 2, oy = m * u[1] + n * v[1] - A / 2;
    big.push({ x: ox + A / 2, y: oy + A / 2, z: Math.max(Math.abs(m), Math.abs(n)) });
    small.push({ x: ox + A + Bs / 2, y: oy + Bs / 2 });
  }
  const fams = [[P.gold, P.cream, P.plum], [P.orchid, P.lav, P.plum], [P.teal, P.mint, P.mid], [P.plum, P.orchid, P.mid], [P.teal, P.mint, P.mid], [P.plum, P.orchid, P.mid]];
  for (const t of big) {
    if (Math.max(Math.abs(t.x), Math.abs(t.y)) > H + A / 2) continue;
    const [body, light, dark] = fams[Math.min(5, t.z)], o = { cx: t.x, cy: t.y, force: false, gap: 0.3, limit: lim };
    if (lim(t.x, t.y, 12)) b.add('square', t.x, t.y, 24, 24, PI / 4, light, { force: true });
    ring(b, 24, 4, 'teardrop', 12, 20, light, { ...o, phase: 0.5 });
    ring(b, 21, 4, 'round', 8, 8, P.gold, o);
    t.col = (x, y) => { const d = Math.max(Math.abs(x - t.x), Math.abs(y - t.y)); return d > A / 2 - 8 ? dark : d < 26 ? dark : body; };
  }
  for (const t of small) if (lim(t.x, t.y, 6)) { b.add('round', t.x, t.y, 18, 18, 0, P.gold, { force: true }); }
  const col = (x, y) => {
    for (const t of small) if (Math.abs(x - t.x) < Bs / 2 && Math.abs(y - t.y) < Bs / 2) return Math.max(Math.abs(x - t.x), Math.abs(y - t.y)) > Bs / 2 - 8 ? P.mid : P.cream;
    for (const t of big) if (Math.abs(x - t.x) < A / 2 && Math.abs(y - t.y) < A / 2) return t.col ? t.col(x, y) : P.mid;
    return P.mid;
  };
  hexFill(b, H - 4, H - 4, 10.4, 9.2, col, { limit: lim });
  fillGaps(b, H, 8.4, 5.2, col, lim, 'round', 2);
  rectBand(b, H + 11, H + 11, 13, 12, (k, c) => (c ? P.gold : P.mid));
  rectBand(b, H + 25, H + 25, 13, 12, (k, c) => (c ? P.gold : k % 2 ? P.orchid : P.teal), 'square', PI / 4);
  rectBand(b, H + 39, H + 39, 13, 12, (k, c) => (c ? P.gold : P.mid));
  return { b, palette: ['midnight', 'plum', 'orchid', 'lavender', 'cream', 'gold', 'teal', 'mint'], plate: { type: 'poly', pts: square(H + 54) } };
}

// Cubic space lattice: an isometric frame of beams receding in three directions, gold at the joints.
function cubicLattice() {
  const b = new Builder();
  const P = { mid: 0, pearl: 1, sky: 2, royal: 3, cream: 4, gold: 5, copper: 6, onyx: 7 };
  const u = 25.4, L = 6, S = 12, R = 318, plate = hexPlate(R).map(([x, y]) => [y, x]), lim = inPoly(plate, 0);
  const c30 = Math.cos(PI / 6);
  const solid = (i, j, k) => {
    if (i < 0 || j < 0 || k < 0 || i > S || j > S || k > S) return false;
    return (i % L === 0) + (j % L === 0) + (k % L === 0) >= 2;
  };
  const off = S / 2; // centre the cube on the origin
  const cast = (X, Y) => {
    // ray p0 + t(1,1,1) with p0 on z = 0; screen X = (x - y) c30 u, Y = ((x + y) / 2 - z) u
    const xm = X / (c30 * u), xp = (2 * Y) / u;
    let x = (xm + xp) / 2 + off, y = (xp - xm) / 2 + off, z = off;
    // march from the viewer side (large t) toward small t
    const T = 3 * S;
    x += T; y += T; z += T;
    let ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    let tx = x - ix, ty = y - iy, tz = z - iz, face = 2;
    for (let n = 0; n < 12 * S + 40; n++) {
      if (solid(ix, iy, iz)) return { face, ix, iy, iz };
      // next boundary going in -1 direction on each axis
      if (tx <= ty && tx <= tz) { ty -= tx; tz -= tx; tx = 1; ix--; face = 0; }
      else if (ty <= tz) { tx -= ty; tz -= ty; ty = 1; iy--; face = 1; }
      else { tx -= tz; ty -= tz; tz = 1; iz--; face = 2; }
      if (ix < -1 && iy < -1 && iz < -1) break;
    }
    return null;
  };
  const col = (X, Y) => {
    const h = cast(X, Y);
    if (!h) return P.onyx;
    const node = h.ix % L === 0 && h.iy % L === 0 && h.iz % L === 0;
    if (node) return [P.gold, P.copper, P.cream][h.face];
    return [P.sky, P.royal, P.pearl][h.face];
  };
  hexFill(b, R, R, 10.2, 9.2, col, { limit: inPoly(plate, 2) });
  fillGaps(b, R, 8.4, 5.1, col, inPoly(plate, 2), 'round', 2);
  frame(b, hexPlate(R + 12).map(([x, y]) => [y, x]), 16, 'square', 13, 13, (e, k) => (k % 2 ? P.gold : P.mid), { force: false });
  frame(b, hexPlate(R + 30).map(([x, y]) => [y, x]), 16, 'round', 13, 13, (e, k) => (k % 2 ? P.royal : P.copper), { force: false });
  return { b, palette: ['midnight', 'pearl', 'sky', 'royal', 'cream', 'gold', 'copper', 'onyx'], plate: { type: 'poly', pts: hexPlate(R + 46).map(([x, y]) => [y, x]) } };
}

// Leaded window: diamond quarries in lead cames, a jewelled lozenge medallion and a border of coloured panes.
function leadedQuarry() {
  const b = new Builder();
  const P = { slate: 0, pearl: 1, ice: 2, ruby: 3, sap: 4, gold: 5, em: 6, amber: 7 };
  const hx = 230, hy = 320, bw = 44, ix = hx - bw, iy = hy - bw, inner = rect(ix, iy), lim = inPoly(inner, 0);
  const ax = 46, ay = 64; // quarry half-diagonals
  // leads: two families of diagonal lines through the inner field
  const leads = [];
  for (let k = -12; k <= 12; k++) {
    for (const sg of [1, -1]) {
      // x / ax + sg * y / ay = k  -> clip to the field
      const pts = [];
      for (const y of [-iy, iy]) pts.push([(k - (sg * y) / ay) * ax, y]);
      leads.push(pts);
    }
  }
  for (const [A, B] of leads) seg(b, A, B, 10.5, 'round', 9, 9, P.slate, { force: false, gap: 0.1, limit: lim });
  const qid = (x, y) => [Math.floor(x / ax + y / ay + 0.5), Math.floor(x / ax - y / ay + 0.5)];
  const glass = (x, y) => {
    const [p, q] = qid(x, y), a = p + q, c = p - q; // a, c: quarry lattice coordinates (even/odd mix)
    const d = Math.abs(p) + Math.abs(q);
    if (d === 0) return P.gold;
    if (d === 1) return P.ruby;
    if (d === 2) return Math.abs(p) === Math.abs(q) ? P.amber : P.sap;
    if (d === 3) return P.em;
    if (Math.abs(p) === Math.abs(q) && d % 2 === 0) return P.ice;
    return P.pearl;
  };
  // painted rosettes in the plain quarries
  for (let p = -8; p <= 8; p++) for (let q = -8; q <= 8; q++) {
    const x = ((p + q) * ax) / 2, y = ((p - q) * ay) / 2;
    if (!lim(x, y, 16)) continue;
    const g = glass(x, y);
    b.add('round', x, y, 15, 15, 0, g === P.pearl || g === P.ice ? P.gold : g === P.gold ? P.ruby : P.pearl, { force: true });
    if (g === P.pearl) ring(b, 13, 4, 'round', 8, 8, P.ice, { cx: x, cy: y, phase: 0.5, force: false, gap: 0.3 });
  }
  hexFill(b, ix, iy, 10.4, 9.2, glass, { limit: lim });
  fillGaps(b, Math.max(ix, iy), 8.4, 5.2, glass, lim, 'round', 2);
  // border of coloured panes in lead
  frame(b, inner, 10.5, 'round', 9, 9, P.slate, { force: false, gap: 0.1 });
  frame(b, rect(hx, hy), 10.5, 'round', 9, 9, P.slate, { force: false, gap: 0.1 });
  const paneCol = [P.ruby, P.gold, P.sap, P.gold];
  const per = 2 * (2 * hx + 2 * hy), nP = 28;
  const along = (s2) => {
    s2 = mod(s2, per);
    if (s2 < 2 * hx) return [-hx + s2, -hy];
    s2 -= 2 * hx; if (s2 < 2 * hy) return [hx, -hy + s2];
    s2 -= 2 * hy; if (s2 < 2 * hx) return [hx - s2, hy];
    s2 -= 2 * hx; return [-hx, hy - s2];
  };
  const bandCol = (x, y) => {
    const m = Math.min(hx - Math.abs(x), hy - Math.abs(y));
    if (m > bw - 2) return null;
    let s2;
    if (hy - Math.abs(y) < hx - Math.abs(x)) s2 = y < 0 ? x + hx : 2 * hx + 2 * hy + (hx - x);
    else s2 = x > 0 ? 2 * hx + (y + hy) : 4 * hx + 2 * hy + (hy - y);
    const k = Math.floor((s2 / per) * nP + 0.5);
    const corner = Math.abs(x) > hx - bw && Math.abs(y) > hy - bw;
    return corner ? P.em : paneCol[mod(k, 4)];
  };
  for (let k = 0; k < nP; k++) {
    const [x0, y0] = along(((k + 0.5) * per) / nP);
    const m = Math.hypot(x0, y0); const dx = -x0 / m, dy = -y0 / m;
    const [ox, oy] = Math.abs(Math.abs(x0) - hx) < 1 ? [Math.sign(-x0), 0] : [0, Math.sign(-y0)];
    seg(b, [x0, y0], [x0 + ox * bw, y0 + oy * bw], 10.5, 'round', 9, 9, P.slate, { force: false, gap: 0.1 });
    void dx; void dy;
  }
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.add('round', sx * (hx - bw / 2), sy * (hy - bw / 2), 18, 18, 0, P.gold, { force: true });
  const outer = inPoly(rect(hx, hy), 0);
  hexFill(b, hx, hy, 10.4, 9.2, bandCol, { limit: outer });
  fillGaps(b, hy, 8.4, 5.2, bandCol, outer, 'round', 2);
  frame(b, rect(hx + 12, hy + 12), 14, 'square', 12, 12, (e, k) => (k % 2 ? P.gold : P.slate), { force: false });
  return { b, palette: ['slate', 'pearl', 'ice', 'ruby', 'sapphire', 'gold', 'emerald', 'amber'], plate: { type: 'poly', pts: rect(hx + 28, hy + 28) } };
}

export const ENTRIES = [
  { id: 'cairo-pavement', version: 1, name: 'Cairo Pavement', category: 'geometric', difficulty: 'Expert', build: cairoPavement },
  { id: 'seigaiha-tide', version: 1, name: 'Seigaiha Tide', category: 'geometric', difficulty: 'Expert', build: seigaihaTide },
  { id: 'shippo-lattice', version: 1, name: 'Shippo Lattice', category: 'geometric', difficulty: 'Expert', build: shippoLattice },
  { id: 'snub-hexagon-pinwheel', version: 1, name: 'Pinwheel Hexagons', category: 'geometric', difficulty: 'Expert', build: snubHexagonal },
  { id: 'azulejo-panel', version: 1, name: 'Azulejo Panel', category: 'geometric', difficulty: 'Expert', build: azulejoPanel },
  { id: 'deco-sunrise', version: 1, name: 'Deco Sunrise', category: 'geometric', difficulty: 'Expert', build: decoSunrise },
  { id: 'eye-dazzler', version: 1, name: 'Eye Dazzler Rug', category: 'geometric', difficulty: 'Expert', build: eyeDazzler },
  { id: 'interlocking-keys', version: 1, name: 'Interlocking Keys', category: 'geometric', difficulty: 'Expert', build: interlockingKeys },
  { id: 'lone-star-quilt', version: 1, name: 'Lone Star Quilt', category: 'geometric', difficulty: 'Master', build: loneStar },
  { id: 'alhambra-strapwork', version: 1, name: 'Alhambra Strapwork', category: 'geometric', difficulty: 'Master', build: alhambraStrapwork },
  { id: 'cosmati-quincunx', version: 1, name: 'Cosmati Quincunx', category: 'geometric', difficulty: 'Master', build: cosmatiQuincunx },
  { id: 'meander-pavement', version: 1, name: 'Meander Pavement', category: 'geometric', difficulty: 'Master', build: meanderPavement },
  { id: 'pythagorean-pavement', version: 1, name: 'Pythagorean Pavement', category: 'geometric', difficulty: 'Master', build: pythagoreanPavement },
  { id: 'cubic-lattice', version: 1, name: 'Cubic Space Lattice', category: 'geometric', difficulty: 'Master', build: cubicLattice },
  { id: 'leaded-quarry', version: 1, name: 'Leaded Quarry Window', category: 'geometric', difficulty: 'Master', build: leadedQuarry },
  { id: 'dodecagon-mosaic', version: 1, name: 'Dodecagon Mosaic', category: 'geometric', difficulty: 'Master', build: dodecagonMosaic },
];

CATALOG.push(...ENTRIES);
CATALOG.sort((a, c) => LEVEL[a.difficulty] - LEVEL[c.difficulty]);
