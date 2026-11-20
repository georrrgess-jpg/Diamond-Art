// Deterministic, data-driven artwork generation. Each artwork is built from
// authored parameters with reusable geometric generators. Socket ids are the
// stable index in generation order; bump `version` if a layout changes.
import { halfWidthAt } from './gems.js';

const TAU = Math.PI * 2;

export const GEMS = {
  sapphire: { name: 'Sapphire', hex: '#1d4fb8' },
  royal: { name: 'Royal Blue', hex: '#2f6fe0' },
  ice: { name: 'Ice Blue', hex: '#8fc6f2' },
  aqua: { name: 'Aquamarine', hex: '#37bfc8' },
  midnight: { name: 'Midnight', hex: '#1b2a68' },
  crystal: { name: 'Crystal', hex: '#e4ebf3', tones: ['#5a6d88', '#9aaec6', '#dce5f0', '#f5f8fc', '#ffffff'] },
  silver: { name: 'Silver', hex: '#b9c2cf', tones: ['#4b5566', '#808b9c', '#b6bfcc', '#e3e8ef', '#ffffff'] },
  ruby: { name: 'Ruby', hex: '#c0122f' },
  garnet: { name: 'Garnet', hex: '#7a0f28' },
  rose: { name: 'Rose', hex: '#ec5f8c' },
  blush: { name: 'Blush', hex: '#f6b3c6' },
  violet: { name: 'Violet', hex: '#7c3aa8' },
  emerald: { name: 'Emerald', hex: '#0d8a55' },
  forest: { name: 'Forest', hex: '#0b5640' },
  teal: { name: 'Teal', hex: '#11929a' },
  mint: { name: 'Mint', hex: '#9fe0c0' },
  champagne: { name: 'Champagne', hex: '#e8cf9c' },
  amethyst: { name: 'Amethyst', hex: '#7d3fc0' },
  lavender: { name: 'Lavender', hex: '#c3a3ec' },
  plum: { name: 'Plum', hex: '#4b1d74' },
  orchid: { name: 'Orchid', hex: '#d77fd3' },
  amber: { name: 'Amber', hex: '#dc8418' },
  citrine: { name: 'Citrine', hex: '#f4c22c' },
  coral: { name: 'Coral', hex: '#ef7a58' },
  cream: { name: 'Cream', hex: '#f4e4bf' },
  honey: { name: 'Honey', hex: '#9b5810' },
  peach: { name: 'Peach', hex: '#f5ad86' },
};

// ---------------------------------------------------------------- builder
class Builder {
  constructor() { this.s = []; this.cell = 30; this.grid = new Map(); this.circ = []; }
  circlesOf(shape, x, y, w, h, rot) {
    const out = [], c = Math.cos(rot), s = Math.sin(rot);
    const ratio = h / w;
    if (ratio <= 1.25) {
      const r = 0.5 * Math.max(w, h) * (shape === 'square' ? 1.1 : shape === 'rhombus' ? 0.82 : 1);
      out.push([x, y, r]);
      return out;
    }
    const n = Math.ceil(ratio * 1.4) + 1;
    for (let k = 0; k < n; k++) {
      const yu = -0.5 + (k + 0.5) / n;
      const r = Math.max(halfWidthAt(shape, yu) * w, (h / n) * 0.5);
      const ly = yu * h;
      out.push([x - ly * s, y + ly * c, r]);
    }
    return out;
  }
  collides(cs, gap) {
    for (const [x, y, r] of cs) {
      const gx0 = Math.floor((x - r - 40) / this.cell), gx1 = Math.floor((x + r + 40) / this.cell);
      const gy0 = Math.floor((y - r - 40) / this.cell), gy1 = Math.floor((y + r + 40) / this.cell);
      for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
        const list = this.grid.get(gx + ',' + gy); if (!list) continue;
        for (const ci of list) {
          const [ox, oy, or] = this.circ[ci];
          if (Math.hypot(ox - x, oy - y) < r + or + gap) return true;
        }
      }
    }
    return false;
  }
  add(shape, x, y, w, h, rot, p, { force = false, gap = 0.8, limit = null } = {}) {
    const cs = this.circlesOf(shape, x, y, w, h, rot);
    if (limit && !cs.every(([cx, cy, r]) => limit(cx, cy, r))) return false;
    if (!force && this.collides(cs, gap)) return false;
    for (const cc of cs) {
      const ci = this.circ.push(cc) - 1;
      const k = Math.floor(cc[0] / this.cell) + ',' + Math.floor(cc[1] / this.cell);
      let l = this.grid.get(k); if (!l) this.grid.set(k, (l = [])); l.push(ci);
    }
    this.s.push({ id: this.s.length, shape, x: +x.toFixed(2), y: +y.toFixed(2), w, h, rot: +rot.toFixed(4), p });
    return true;
  }
}

// angle convention: theta = 0 at top, clockwise
const polar = (R, th) => [R * Math.sin(th), -R * Math.cos(th)];

// Ring of n gems. orient: 'out' (tip points outward), 'in', 'tan'
function ring(b, R, n, shape, w, h, pal, { phase = 0, orient = 'out', force = true, gap, limit, twist = 0 } = {}) {
  for (let i = 0; i < n; i++) {
    const th = (i + phase) / n * TAU;
    const [x, y] = polar(R, th);
    let rot = th + twist;
    if (orient === 'in') rot += Math.PI;
    else if (orient === 'tan') rot += Math.PI / 2;
    const p = typeof pal === 'function' ? pal(i, th) : pal;
    if (p == null) continue;
    b.add(shape, x, y, w, h, rot, p, { force, gap, limit });
  }
}

// Concentric staggered rows of gems filling an annulus. color(r, theta, row)
function fillRings(b, R0, R1, size, color, { shape = 'round', gap = 1.07, rowGap = 1.05, limit, aspect = 1, orient = 'out', sym = 1 } = {}) {
  let row = 0;
  const w = size, h = size * aspect;
  for (let r = R0 + h / 2; r <= R1 - h / 2 + 0.01; r += h * rowGap, row++) {
    let n = Math.max(1, Math.floor(TAU * r / (w * gap)));
    if (sym > 1) n = Math.max(sym, Math.floor(n / sym) * sym);
    const ph = (row % 2) * 0.5;
    for (let i = 0; i < n; i++) {
      const th = (i + ph) / n * TAU;
      const p = color(r, th, row, i, n);
      if (p == null) continue;
      const [x, y] = polar(r, th);
      b.add(shape, x, y, w, h, th + (orient === 'tan' ? Math.PI / 2 : 0), p, { limit });
    }
  }
}

// Mirror-folded position inside a k-fold sector: 0 at sector edge, 1 at middle
function fold(th, k) {
  const sec = TAU / k;
  const t = (((th % sec) + sec) % sec) / sec;
  return 1 - Math.abs(t * 2 - 1);
}
const inDisc = (R) => (x, y, r) => Math.hypot(x, y) + r <= R;

// ---------------------------------------------------------------- artworks
function frostRosette() {
  // eightfold icy rosette — beginner
  const b = new Builder();
  const P = { sap: 0, ice: 1, aqua: 2, cry: 3, mid: 4 };
  b.add('round', 0, 0, 74, 74, 0, P.sap, { force: true });
  ring(b, 37 + 26, 8, 'teardrop', 30, 50, P.ice, { orient: 'out' });
  ring(b, 62, 8, 'round', 16, 16, P.cry, { phase: 0.5 });
  ring(b, 128, 8, 'marquise', 32, 76, P.aqua, { orient: 'out' });
  ring(b, 112, 8, 'rhombus', 26, 40, P.sap, { phase: 0.5, orient: 'out' });
  ring(b, 152, 8, 'round', 20, 20, P.cry, { phase: 0.5 });
  ring(b, 192, 16, 'round', 30, 30, (i) => (i % 2 ? P.ice : P.mid), { phase: 0.25 });
  ring(b, 246, 8, 'teardrop', 44, 70, P.sap, { orient: 'in' });
  ring(b, 240, 8, 'oval', 26, 46, P.aqua, { phase: 0.5, orient: 'out' });
  ring(b, 228, 16, 'round', 15, 15, P.cry, { phase: 0.25 + 0.0, force: false, gap: 1 });
  ring(b, 298, 32, 'round', 22, 22, (i) => (i % 4 === 0 ? P.mid : i % 2 ? P.cry : P.ice), { phase: 0, force: false, gap: 0.8 });
  ring(b, 278, 16, 'rhombus', 16, 24, P.mid, { phase: 0.5, orient: 'out', force: false, gap: 0.8 });
  return { b, palette: ['sapphire', 'ice', 'aqua', 'crystal', 'midnight'], plate: { type: 'circle', r: 330 } };
}

function rubyTeardrop() {
  // twelvefold ruby teardrop mandala — medium
  const b = new Builder();
  const P = { ruby: 0, rose: 1, blush: 2, violet: 3, cry: 4, garnet: 5 };
  b.add('round', 0, 0, 56, 56, 0, P.cry, { force: true });
  ring(b, 44, 12, 'teardrop', 16, 26, P.ruby, { orient: 'out' });
  ring(b, 86, 12, 'teardrop', 26, 46, P.rose, { orient: 'in' });
  ring(b, 76, 12, 'round', 14, 14, P.violet, { phase: 0.5 });
  ring(b, 104, 12, 'round', 12, 12, P.blush, { phase: 0.5 });
  ring(b, 150, 12, 'teardrop', 38, 70, P.ruby, { orient: 'in' });
  ring(b, 140, 12, 'marquise', 16, 44, P.blush, { phase: 0.5, orient: 'out' });
  ring(b, 176, 12, 'round', 16, 16, P.cry, { phase: 0.5 });
  const rubyBand = (r, th) => {
    const f = fold(th, 12);
    const rr = (r - 186) / 76;
    if (rr < 0.3) return f > 0.5 ? P.garnet : P.rose;
    if (f > 0.75 - rr * 0.4) return P.violet;
    return rr > 0.7 ? P.blush : P.rose;
  };
  fillRings(b, 186, 262, 17, rubyBand, { limit: inDisc(262), sym: 12 });
  fillRings(b, 186, 262, 10, rubyBand, { limit: inDisc(262), gap: 1.1, sym: 12 });
  ring(b, 294, 24, 'teardrop', 24, 46, (i) => (i % 2 ? P.ruby : P.violet), { orient: 'in' });
  ring(b, 290, 24, 'round', 12, 12, P.cry, { phase: 0.5, force: false, gap: 0.6 });
  ring(b, 333, 48, 'round', 16, 16, (i) => (i % 2 ? P.blush : P.garnet), { force: false, gap: 0.6 });
  ring(b, 333, 24, 'rhombus', 12, 18, P.rose, { phase: 0.25, force: false, gap: 0.5 });
  return { b, palette: ['ruby', 'rose', 'blush', 'violet', 'crystal', 'garnet'], plate: { type: 'circle', r: 362 } };
}

function emeraldMosaic() {
  // hexagonal polygon mosaic — medium
  const b = new Builder();
  const P = { em: 0, teal: 1, mint: 2, champ: 3, forest: 4, cry: 5 };
  const N = 10, s = 21; // cell circumradius
  const gw = Math.sqrt(3) * s * 0.92, gh = 2 * s * 0.92;
  for (let r = -N; r <= N; r++) for (let q = -N; q <= N; q++) {
    const z = -q - r;
    if (Math.abs(z) > N) continue;
    const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(z));
    const m = Math.min(Math.abs(q), Math.abs(r), Math.abs(z));
    const x = s * Math.sqrt(3) * (q + r / 2), y = s * 1.5 * r;
    let p;
    if (d === 0) p = P.champ;
    else if (d <= 2) p = d === 1 ? P.em : P.mint;
    else if (d === N) p = (m % 2 === 0) ? P.forest : P.em;
    else if (d === 5 || d === 6) p = m === 0 ? P.champ : (d === 5 ? P.forest : P.teal);
    else if (m === 0) p = P.em;
    else if (d - m <= 2 && d > 6) p = P.mint;
    else if (m === Math.floor(d / 2) && d < 5) p = P.champ;
    else if (d < 5) p = P.teal;
    else if ((d + m) % 3 === 0) p = P.cry;
    else p = d % 2 ? P.mint : P.teal;
    b.add('hexagon', x, y, gw, gh, 0, p, { force: true });
  }
  const R = s * Math.sqrt(3) * N + s * 1.9;
  const pts = []; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; pts.push([R * Math.cos(a), R * Math.sin(a)]); }
  return { b, palette: ['emerald', 'teal', 'mint', 'champagne', 'forest', 'crystal'], plate: { type: 'poly', pts } };
}

function sapphireInterlace() {
  // interlocking circles (sevenfold "flower") — intricate
  const b = new Builder();
  const P = { sap: 0, royal: 1, ice: 2, aqua: 3, cry: 4, mid: 5, silver: 6 };
  const Rc = 118;
  const centers = [[0, 0]];
  for (let i = 0; i < 6; i++) centers.push(polar(Rc, i * TAU / 6));
  // circle lines in small silver ovals
  for (const [cx, cy] of centers) {
    const n = 34;
    for (let i = 0; i < n; i++) {
      const th = i / n * TAU;
      const x = cx + Rc * Math.sin(th), y = cy - Rc * Math.cos(th);
      b.add('oval', x, y, 10, 18, th + Math.PI / 2, P.silver, { gap: 0.4 });
    }
  }
  // outer bounding circle line
  ring(b, 2 * Rc + 2, 80, 'oval', 10, 18, P.silver, { orient: 'tan', force: false, gap: 0.4 });
  b.add('round', 0, 0, 30, 30, 0, P.cry, { force: false });
  const count = (x, y) => centers.reduce((a, [cx, cy]) => a + (Math.hypot(x - cx, y - cy) < Rc ? 1 : 0), 0);
  const lace = (r, th) => {
    const [x, y] = polar(r, th);
    const k = count(x, y);
    if (k >= 3) return P.aqua;
    if (k === 2) return P.ice;
    if (k === 1) return r < Rc * 0.45 ? P.royal : P.sap;
    return P.mid;
  };
  fillRings(b, 0, 2 * Rc - 6, 13, lace, { gap: 1.08, limit: inDisc(2 * Rc - 4), sym: 6 });
  // outer band of alternating teardrops and fill
  ring(b, 2 * Rc + 30, 36, 'teardrop', 22, 38, (i) => (i % 3 === 0 ? P.cry : P.sap), { orient: 'out', force: false, gap: 0.6 });
  fillRings(b, 2 * Rc + 10, 2 * Rc + 64, 12, (r, th) => (fold(th, 36) > 0.6 ? P.ice : P.mid), { limit: inDisc(2 * Rc + 64), sym: 36 });
  ring(b, 2 * Rc + 76, 72, 'round', 14, 14, (i) => (i % 2 ? P.royal : P.cry), { force: false, gap: 0.5 });
  return { b, palette: ['sapphire', 'royal', 'ice', 'aqua', 'crystal', 'midnight', 'silver'], plate: { type: 'circle', r: 2 * Rc + 98 } };
}

function amethystStar() {
  // eight-pointed star mandala with layered marquise petals — intricate
  const b = new Builder();
  const P = { am: 0, lav: 1, mid: 2, sil: 3, plum: 4, orch: 5, cry: 6 };
  b.add('round', 0, 0, 52, 52, 0, P.cry, { force: true });
  ring(b, 50, 8, 'marquise', 20, 44, P.orch, { orient: 'out' });
  ring(b, 50, 8, 'round', 12, 12, P.sil, { phase: 0.5 });
  ring(b, 96, 8, 'marquise', 28, 66, P.am, { orient: 'out', phase: 0.5 });
  ring(b, 92, 8, 'marquise', 20, 50, P.lav, { orient: 'out' });
  ring(b, 132, 16, 'rhombus', 18, 28, (i) => (i % 2 ? P.plum : P.mid), { orient: 'out', phase: 0.25 });
  // two interleaved eight-pointed stars
  const star = (th) => 172 + 146 * Math.pow(fold(th, 8), 1.7);
  const star2 = (th) => 172 + 78 * Math.pow(fold(th + TAU / 16, 8), 1.7);
  const starColor = (r, th) => {
    if (r > 322) return P.plum;
    const d = star(th) - r;
    if (d >= 0) return d < 13 ? P.sil : (r < 186 ? P.orch : P.am);
    const d2 = star2(th) - r;
    if (d2 >= 0) return d2 < 13 ? P.orch : P.lav;
    return P.mid;
  };
  fillRings(b, 150, 330, 15, starColor, { limit: inDisc(330), sym: 8 });
  ring(b, 352, 32, 'marquise', 14, 34, (i) => (i % 4 === 0 ? P.orch : P.lav), { orient: 'out', force: false, gap: 0.5 });
  ring(b, 350, 32, 'round', 10, 10, P.sil, { phase: 0.5, force: false, gap: 0.5 });
  ring(b, 384, 64, 'round', 12, 12, (i) => (i % 2 ? P.plum : P.am), { force: false, gap: 0.5 });
  return { b, palette: ['amethyst', 'lavender', 'midnight', 'silver', 'plum', 'orchid', 'crystal'], plate: { type: 'circle', r: 404 } };
}

function amberSunburst() {
  // 24-ray sunburst with layered rays — expert
  const b = new Builder();
  const P = { amb: 0, cit: 1, cor: 2, cream: 3, honey: 4, cry: 5, peach: 6 };
  b.add('round', 0, 0, 70, 70, 0, P.cit, { force: true });
  ring(b, 54, 12, 'teardrop', 18, 32, P.amb, { orient: 'out' });
  ring(b, 56, 12, 'round', 10, 10, P.cry, { phase: 0.5 });
  ring(b, 96, 16, 'teardrop', 22, 46, (i) => (i % 2 ? P.cor : P.cit), { orient: 'out', phase: 0.5 });
  ring(b, 150, 24, 'marquise', 16, 62, P.amb, { orient: 'out' });
  ring(b, 150, 24, 'marquise', 11, 40, P.cream, { orient: 'out', phase: 0.5 });
  ring(b, 190, 48, 'round', 12, 12, (i) => (i % 2 ? P.honey : P.cit), { force: false, gap: 0.5 });
  const sun = (r, th) => {
    const rr = (r - 198) / 242;
    const f = fold(th, 12), g = fold(th + TAU / 24, 12);
    const w = 0.66 - 0.42 * rr;
    if (rr > 0.9) return P.honey;
    if (f > 1 - w * 0.5) return P.cit;
    if (f > 1 - w) return P.amb;
    if (f > 1 - w - 0.13) return P.honey;
    if (g > 0.78 + rr * 0.05) return rr < 0.45 ? P.cor : P.peach;
    return P.cream;
  };
  fillRings(b, 198, 440, 17, sun, { limit: inDisc(440), sym: 12 });
  ring(b, 462, 48, 'teardrop', 18, 34, (i) => (i % 2 ? P.amb : P.cit), { orient: 'out', force: false, gap: 0.5 });
  ring(b, 460, 48, 'round', 10, 10, P.cry, { phase: 0.5, force: false, gap: 0.5 });
  ring(b, 494, 96, 'round', 13, 13, (i) => (i % 3 === 0 ? P.cor : P.honey), { force: false, gap: 0.5 });
  return { b, palette: ['amber', 'citrine', 'coral', 'cream', 'honey', 'crystal', 'peach'], plate: { type: 'circle', r: 514 } };
}

export const CATALOG = [
  { id: 'frost-rosette', version: 1, name: 'Frost Rosette', category: 'mandala', difficulty: 'Beginner', build: frostRosette },
  { id: 'ruby-teardrop', version: 1, name: 'Ruby Teardrop', category: 'mandala', difficulty: 'Medium', build: rubyTeardrop },
  { id: 'emerald-mosaic', version: 1, name: 'Emerald Mosaic', category: 'geometric', difficulty: 'Medium', build: emeraldMosaic },
  { id: 'sapphire-interlace', version: 1, name: 'Sapphire Interlace', category: 'geometric', difficulty: 'Intricate', build: sapphireInterlace },
  { id: 'amethyst-star', version: 1, name: 'Amethyst Star', category: 'mandala', difficulty: 'Intricate', build: amethystStar },
  { id: 'amber-sunburst', version: 1, name: 'Amber Sunburst', category: 'mandala', difficulty: 'Expert', build: amberSunburst },
];

const cache = new Map();
export function getArtwork(id) {
  if (cache.has(id)) return cache.get(id);
  const meta = CATALOG.find((c) => c.id === id);
  if (!meta) return null;
  const { b, palette, plate } = meta.build();
  // drop palette entries that ended up unused and renumber densely
  const used = [...new Set(b.s.map((s) => s.p))].sort((a, c) => a - c);
  const remap = new Map(used.map((p, i) => [p, i]));
  const sockets = b.s.map((s) => ({ ...s, p: remap.get(s.p) }));
  const pal = used.map((p) => ({ key: palette[p], ...GEMS[palette[p]] }));
  let R = 0;
  for (const s of sockets) R = Math.max(R, Math.hypot(s.x, s.y) + Math.max(s.w, s.h) / 2);
  if (plate.type === 'circle') R = Math.max(R, plate.r);
  else for (const [x, y] of plate.pts) R = Math.max(R, Math.hypot(x, y));
  let minDim = Infinity; for (const s of sockets) minDim = Math.min(minDim, Math.min(s.w, s.h));
  const art = { ...meta, sockets, palette: pal, plate, R, minDim };
  cache.set(id, art);
  return art;
}

export function sessionLabel(n) {
  if (n < 200) return 'Short session';
  if (n < 500) return 'Relaxed session';
  if (n < 1000) return 'Long session';
  return 'Epic session';
}
