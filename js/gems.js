// Gemstone + socket rendering. Gems are drawn once into small cached sprites
// (keyed by shape, aspect, pixel size, rotation bucket, colour, variant) and
// blitted onto the board. Lighting is computed in world space so every gem on
// the board shares one light direction (top-left).

const TAU = Math.PI * 2;
const LIGHT = norm3(-0.5, -0.72, 0.62);

function norm3(x, y, z) { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; }

// ---------------------------------------------------------------- colours
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function mixRgb(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
export function rgbStr(c, a = 1) {
  return a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}

// Build a 5-stop tonal ramp for a gem colour. Entries may override stops
// (used for clear crystal so it stays readable on ivory).
export function makeTones(entry) {
  if (entry.tones) return entry.tones.map(hexToRgb);
  const [h, s, l] = rgbToHsl(hexToRgb(entry.hex));
  return [
    hslToRgb(h, Math.min(1, s * 1.05), l * 0.3),
    hslToRgb(h, Math.min(1, s * 1.02), l * 0.62),
    hexToRgb(entry.hex),
    hslToRgb(h, s * 0.85, l + (1 - l) * 0.5),
    hslToRgb(h, s * 0.5, 0.96),
  ];
}
function ramp(t, b) {
  b = clamp01(b);
  const stops = [0, 0.3, 0.55, 0.8, 1];
  for (let i = 0; i < 4; i++) {
    if (b <= stops[i + 1]) return mixRgb(t[i], t[i + 1], (b - stops[i]) / (stops[i + 1] - stops[i]));
  }
  return t[4];
}

// ---------------------------------------------------------------- shapes
// Outlines are in unit box [-0.5,0.5]^2, y down, "tip"/long axis toward -y,
// clockwise on screen.
function normaliseBox(pts) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, sx = x1 - x0, sy = y1 - y0;
  return pts.map(([x, y]) => [(x - cx) / sx, (y - cy) / sy]);
}

function outlineFor(shape) {
  const pts = [];
  switch (shape) {
    case 'round': case 'oval':
      for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + i * TAU / 16; pts.push([Math.cos(a), Math.sin(a)]); }
      break;
    case 'marquise':
      for (let i = 0; i < 16; i++) {
        const t = i * TAU / 16, y = -Math.cos(t);
        pts.push([Math.sign(Math.sin(t)) * Math.pow(Math.max(0, 1 - y * y), 0.78), y]);
      }
      break;
    case 'teardrop':
      for (let i = 0; i < 16; i++) {
        // denser sampling near the round end
        const u = i / 16, t = u * TAU;
        pts.push([Math.sin(t) * Math.pow(Math.sin(t / 2), 1.15), -Math.cos(t)]);
      }
      break;
    case 'rhombus':
      pts.push([0, -1], [0.5, -0.5], [1, 0], [0.5, 0.5], [0, 1], [-0.5, 0.5], [-1, 0], [-0.5, -0.5]);
      break;
    case 'square': {
      const c = 0.1;
      pts.push([-1 + c, -1], [1 - c, -1], [1, -1 + c], [1, 1 - c], [1 - c, 1], [-1 + c, 1], [-1, 1 - c], [-1, -1 + c]);
      break;
    }
    case 'hexagon':
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6; pts.push([Math.cos(a), Math.sin(a)]); }
      break;
  }
  return normaliseBox(pts);
}

const BRILLIANT = { round: 1, oval: 1, marquise: 1, teardrop: 1, rhombus: 1 };

// Facet layout per shape, in unit coords. Each facet: {pts, kind, i}
function facetsFor(shape, outline) {
  const facets = [];
  let center = [0, 0];
  if (shape === 'teardrop') center = [0, 0.14];
  const lerp = (p, t) => [center[0] + (p[0] - center[0]) * t, center[1] + (p[1] - center[1]) * t];
  let table;
  if (BRILLIANT[shape]) {
    const n = outline.length, m = n / 2;
    const tScale = shape === 'rhombus' ? 0.46 : shape === 'marquise' ? 0.5 : 0.54;
    const sScale = shape === 'rhombus' ? 0.74 : 0.8;
    const T = [], S = [];
    for (let j = 0; j < m; j++) { T.push(lerp(outline[2 * j], tScale)); S.push(lerp(outline[2 * j + 1], sScale)); }
    // Marquise / teardrop: pull table tips in so the table stays a softer lozenge
    for (let j = 0; j < m; j++) {
      const a = T[j], b = T[(j + 1) % m], sj = S[j], o0 = outline[2 * j], o1 = outline[2 * j + 1], o2 = outline[(2 * j + 2) % n];
      facets.push({ pts: [a, b, sj], kind: 'star', i: j });
      facets.push({ pts: [o0, o1, sj], kind: 'girdle', i: 2 * j });
      facets.push({ pts: [o1, o2, sj], kind: 'girdle', i: 2 * j + 1 });
    }
    for (let j = 0; j < m; j++) {
      const prev = S[(j - 1 + m) % m];
      facets.push({ pts: [T[j], prev, outline[2 * j], S[j]], kind: 'kite', i: j });
    }
    table = T;
  } else {
    // step cut: concentric bands
    const bands = shape === 'hexagon' ? [1, 0.74, 0.5] : [1, 0.8, 0.6, 0.42];
    const n = outline.length;
    for (let b = 0; b < bands.length - 1; b++) {
      const A = outline.map((p) => lerp(p, bands[b])), Bv = outline.map((p) => lerp(p, bands[b + 1]));
      for (let i = 0; i < n; i++) {
        facets.push({ pts: [A[i], A[(i + 1) % n], Bv[(i + 1) % n], Bv[i]], kind: 'step' + b, i });
      }
    }
    table = outline.map((p) => lerp(p, bands[bands.length - 1]));
  }
  return { facets, table, center };
}

export const SHAPE_NAMES = ['round', 'oval', 'teardrop', 'marquise', 'square', 'rhombus', 'hexagon'];
export const SHAPES = {};
for (const s of SHAPE_NAMES) {
  const outline = outlineFor(s);
  SHAPES[s] = { outline, ...facetsFor(s, outline) };
}
// rotational period of the facet layout (for sprite rotation bucketing)
const PERIOD = { round: TAU / 8, oval: Math.PI, marquise: Math.PI, rhombus: Math.PI, square: Math.PI / 2, hexagon: TAU / 6, teardrop: TAU };

// Half-width of a unit outline at a given unit y (used for collision circles)
export function halfWidthAt(shape, yu) {
  const o = SHAPES[shape].outline; let best = 0;
  for (let i = 0; i < o.length; i++) {
    const a = o[i], b = o[(i + 1) % o.length];
    if ((a[1] - yu) * (b[1] - yu) <= 0 && a[1] !== b[1]) {
      const t = (yu - a[1]) / (b[1] - a[1]);
      best = Math.max(best, Math.abs(a[0] + (b[0] - a[0]) * t));
    }
  }
  return best;
}

// Point-in-gem test in unit coordinates
export function insideUnit(shape, ux, uy) {
  if (ux < -0.5 || ux > 0.5 || uy < -0.5 || uy > 0.5) return false;
  const o = SHAPES[shape].outline; let inside = false;
  for (let i = 0, j = o.length - 1; i < o.length; j = i++) {
    const [xi, yi] = o[i], [xj, yj] = o[j];
    if ((yi > uy) !== (yj > uy) && ux < ((xj - xi) * (uy - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Trace outline into ctx at (x,y) with size w,h and rotation (any coord space)
export function traceOutline(ctx, shape, x, y, w, h, rot, grow = 0) {
  const o = SHAPES[shape].outline, c = Math.cos(rot), s = Math.sin(rot);
  const gw = w + grow * 2, gh = h + grow * 2;
  ctx.beginPath();
  for (let i = 0; i < o.length; i++) {
    const lx = o[i][0] * gw, ly = o[i][1] * gh;
    const px = x + lx * c - ly * s, py = y + lx * s + ly * c;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

function hash(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- painting
function poly(ctx, pts, W, H) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0] * W, y = pts[i][1] * H;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// Paint a gem centered at origin of ctx (ctx pre-translated), W,H pixels.
export function paintGem(ctx, shape, W, H, rot, tones, variant = 0, withShadow = true) {
  const S = Math.max(W, H), sh = SHAPES[shape];
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const small = S < 14;

  if (withShadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(80,58,30,0.34)';
    ctx.shadowBlur = Math.max(1, S * 0.09);
    ctx.shadowOffsetX = S * 0.035; ctx.shadowOffsetY = S * 0.075;
    ctx.rotate(rot);
    poly(ctx, sh.outline, W, H);
    ctx.fillStyle = rgbStr(tones[1]);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.rotate(rot);
  poly(ctx, sh.outline, W, H);
  ctx.fillStyle = rgbStr(tones[1]);
  ctx.fill();
  ctx.save();
  ctx.clip();

  const cx = sh.center[0] * W, cy = sh.center[1] * H, maxR = S * 0.5;
  // facets
  let best = null, bestB = -1;
  for (let f = 0; f < sh.facets.length; f++) {
    const fc = sh.facets[f];
    let mx = 0, my = 0;
    for (const p of fc.pts) { mx += p[0] * W; my += p[1] * H; }
    mx /= fc.pts.length; my /= fc.pts.length;
    let dx = mx - cx, dy = my - cy; const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const slope = 0.35 + 0.9 * Math.min(1, d / maxR);
    // rotate facet direction into world space
    const wx = dx * cr - dy * sr, wy = dx * sr + dy * cr;
    const n = norm3(wx * slope, wy * slope, 1);
    const diff = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
    const back = Math.max(0, -(wx * LIGHT[0] + wy * LIGHT[1]));
    let b = 0.08 + 0.95 * (diff - 0.25);
    // internal reflections: alternating bright/dark facets give the brilliant "fire"
    const alt = (fc.i % 2 === 0) ? 1 : -1;
    if (fc.kind === 'star') b += 0.16 + 0.12 * alt;
    else if (fc.kind === 'kite') b += 0.04 * alt + 0.28 * back * (alt > 0 ? 1 : 0.2);
    else if (fc.kind === 'girdle') b += 0.12 * alt + 0.2 * back * (alt < 0 ? 1 : 0);
    else if (fc.kind === 'step0') b += 0.06 * alt - 0.02;
    else if (fc.kind === 'step1') b += 0.14 - 0.1 * alt + 0.15 * back;
    else if (fc.kind === 'step2') b += 0.18 + 0.08 * alt;
    b += (hash(variant + 7, f) - 0.5) * 0.2;
    b = clamp01(b);
    poly(ctx, fc.pts, W, H);
    ctx.fillStyle = rgbStr(ramp(tones, b));
    ctx.fill();
    if (fc.kind !== 'girdle' && b > bestB) { bestB = b; best = fc; }
  }

  // table: glassy gradient along light direction (world) + subtle pavilion arrows
  const lx = LIGHT[0] * cr + LIGHT[1] * sr, ly = -LIGHT[0] * sr + LIGHT[1] * cr; // light in local
  const tr = S * 0.32;
  const g = ctx.createLinearGradient(cx + lx * tr, cy + ly * tr, cx - lx * tr, cy - ly * tr);
  g.addColorStop(0, rgbStr(ramp(tones, 0.86)));
  g.addColorStop(0.55, rgbStr(ramp(tones, 0.56)));
  g.addColorStop(1, rgbStr(ramp(tones, 0.4)));
  poly(ctx, sh.table, W, H);
  ctx.fillStyle = g; ctx.fill();
  if (!small) {
    const T = sh.table;
    for (let j = 0; j < T.length; j++) {
      const a = T[j], bb = T[(j + 1) % T.length];
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(a[0] * W, a[1] * H); ctx.lineTo(bb[0] * W, bb[1] * H); ctx.closePath();
      const v = (j % 2 ? 0.09 : -0.06) + (hash(variant + 3, j) - 0.5) * 0.08;
      ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : rgbStr(tones[0], -v * 1.6);
      ctx.fill();
    }
  }

  // facet edges
  if (!small) {
    ctx.lineWidth = Math.max(0.5, S * 0.011);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineJoin = 'round';
    for (const fc of sh.facets) { poly(ctx, fc.pts, W, H); ctx.stroke(); }
    poly(ctx, sh.table, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.stroke();
  }

  // depth vignette
  const rg = ctx.createRadialGradient(cx, cy, S * 0.15, 0, 0, S * 0.62);
  rg.addColorStop(0, 'rgba(0,0,0,0)');
  rg.addColorStop(1, rgbStr(tones[0], 0.28));
  ctx.fillStyle = rg;
  ctx.fillRect(-S, -S, S * 2, S * 2);

  // specular: soft highlight on the brightest crown facet + table corner
  if (best && S >= 10) {
    let mx = 0, my = 0;
    for (const p of best.pts) { mx += p[0] * W; my += p[1] * H; }
    mx /= best.pts.length; my /= best.pts.length;
    ctx.save();
    ctx.translate(mx, my); ctx.scale(0.45, 0.45); ctx.translate(-mx, -my);
    poly(ctx, best.pts, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    ctx.restore();
  }
  const hx = cx + lx * S * 0.2, hy = cy + ly * S * 0.2;
  const hr = Math.max(1, S * 0.09);
  const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
  hg.addColorStop(0, 'rgba(255,255,255,0.95)');
  hg.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
  ctx.restore(); // clip

  // bevel rim: light upper-left, dark lower-right
  const bg = ctx.createLinearGradient(lx * S * 0.5, ly * S * 0.5, -lx * S * 0.5, -ly * S * 0.5);
  bg.addColorStop(0, 'rgba(255,255,255,0.85)');
  bg.addColorStop(0.45, rgbStr(tones[3], 0.35));
  bg.addColorStop(1, rgbStr(tones[0], 0.85));
  poly(ctx, sh.outline, W, H);
  ctx.lineWidth = Math.max(0.6, S * 0.035);
  ctx.strokeStyle = bg; ctx.stroke();
  ctx.restore();
}

// Empty recessed socket
export function paintSocket(ctx, shape, W, H, rot) {
  const S = Math.max(W, H), sh = SHAPES[shape];
  ctx.save();
  ctx.rotate(rot);
  poly(ctx, sh.outline, W, H);
  ctx.fillStyle = '#efe8dc';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.rotate(-rot);
  ctx.shadowColor = 'rgba(120,96,62,0.42)';
  ctx.shadowBlur = Math.max(1, S * 0.14);
  ctx.shadowOffsetX = S * 0.035; ctx.shadowOffsetY = S * 0.06;
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.rect(-S * 2, -S * 2, S * 4, S * 4);
  const o = sh.outline;
  ctx.moveTo(o[0][0] * W, o[0][1] * H);
  for (let i = o.length - 1; i >= 0; i--) ctx.lineTo(o[i][0] * W, o[i][1] * H);
  ctx.closePath();
  ctx.fillStyle = '#efe8dc';
  ctx.fill();
  ctx.restore();
  poly(ctx, sh.outline, W, H);
  ctx.lineWidth = Math.max(0.6, S * 0.03);
  ctx.strokeStyle = 'rgba(160,138,104,0.55)';
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- sprite cache
const LOGB = Math.log(1.12);
export class SpriteCache {
  constructor(budgetPx = 14e6) { this.map = new Map(); this.px = 0; this.budget = budgetPx; }
  _get(key, make) {
    let e = this.map.get(key);
    if (e) { this.map.delete(key); this.map.set(key, e); return e; }
    e = make();
    this.map.set(key, e);
    this.px += e.canvas.width * e.canvas.height;
    while (this.px > this.budget && this.map.size > 1) {
      const k = this.map.keys().next().value;
      const old = this.map.get(k); this.map.delete(k);
      this.px -= old.canvas.width * old.canvas.height;
    }
    return e;
  }
  // returns {canvas, px, rot}; px = rendered max dimension
  get(kind, shape, w, h, devPx, rot, tones, colorKey, variant) {
    const bucket = Math.max(10, Math.min(52, Math.round(Math.log(Math.max(3, devPx)) / LOGB)));
    const bpx = Math.pow(1.12, bucket);
    const period = PERIOD[shape];
    // fine rotation buckets (~2.25deg) so sprites can be drawn without per-gem rotation
    const steps = shape === 'round' ? 6 : Math.max(4, Math.round(period / (TAU / 160)));
    let rr = ((rot % period) + period) % period;
    const rb = Math.round(rr / period * steps) % steps;
    const rbAngle = rb * period / steps;
    const asp = Math.round((w / h) * 40);
    const key = `${kind}|${shape}|${asp}|${bucket}|${rb}|${colorKey}|${variant}`;
    const e = this._get(key, () => {
      const ar = asp / 40;
      const W = ar >= 1 ? bpx : bpx * ar, H = ar >= 1 ? bpx / ar : bpx;
      const pad = Math.ceil(bpx * 0.2) + 2;
      const D = Math.ceil(Math.hypot(W, H)) + pad * 2;
      const c = document.createElement('canvas');
      c.width = c.height = D;
      const x = c.getContext('2d');
      x.translate(D / 2, D / 2);
      if (kind === 'g') paintGem(x, shape, W, H, rbAngle, tones, variant);
      else paintSocket(x, shape, W, H, rbAngle);
      return { canvas: c, px: bpx, rot: rbAngle, period };
    });
    return e;
  }
}

export function gemVariant(id) { return Math.floor(hash(id, 99) * 3); }
