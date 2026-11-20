// Board: camera, rendering, hit testing and pointer input for one artwork.
import { SpriteCache, makeTones, traceOutline, insideUnit, gemVariant, rgbStr } from './gems.js';

const TAU = Math.PI * 2;
const mainCache = new SpriteCache(16e6);
const toneCache = new Map();
export function tonesFor(entry) {
  let t = toneCache.get(entry.key);
  if (!t) toneCache.set(entry.key, (t = makeTones(entry)));
  return t;
}
const easeOutBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Draws the artwork. cam: {s, x, y} (CSS px). Used for screen, thumbnails, export.
export function drawArtwork(ctx, art, cam, W, H, dpr, o = {}) {
  const cache = o.cache || mainCache;
  const filled = o.filled, all = o.all, sel = o.sel ?? -1, now = o.now || 0;
  const skip = o.skip, fast = !!o.fast;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = o.bg || '#f6f1e8';
  ctx.fillRect(0, 0, W, H);
  const { s, x: ox, y: oy } = cam;

  // plate (soft shadow via gradient for circles: much cheaper than shadowBlur)
  ctx.save();
  const plateR = (art.plate.type === 'circle' ? art.plate.r : art.R) * s;
  const blur = Math.max(6, Math.min(36, plateR * 0.08));
  const sg = ctx.createRadialGradient(ox, oy + blur * 0.35, plateR * 0.96, ox, oy + blur * 0.35, plateR + blur);
  sg.addColorStop(0, 'rgba(90,70,40,0.16)');
  sg.addColorStop(1, 'rgba(90,70,40,0)');
  if (art.plate.type === 'circle') {
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(ox, oy + blur * 0.35, plateR + blur, 0, TAU); ctx.fill();
  } else {
    ctx.shadowColor = 'rgba(90,70,40,0.14)'; ctx.shadowBlur = blur * dpr; ctx.shadowOffsetY = blur * 0.35 * dpr;
  }
  ctx.beginPath();
  if (art.plate.type === 'circle') ctx.arc(ox, oy, art.plate.r * s, 0, TAU);
  else art.plate.pts.forEach(([px, py], i) => (i ? ctx.lineTo(ox + px * s, oy + py * s) : ctx.moveTo(ox + px * s, oy + py * s)));
  ctx.closePath();
  ctx.fillStyle = '#fdfbf7';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(0.8, 2 * s);
  ctx.strokeStyle = '#e8dfd0';
  ctx.stroke();
  ctx.restore();

  const vx0 = -ox / s, vy0 = -oy / s, vx1 = (W - ox) / s, vy1 = (H - oy) / s;
  const S = art.sockets, pal = art.palette;
  const gems = [], labels = [], hl = [];

  // pass 1: sockets
  for (let i = 0; i < S.length; i++) {
    const g = S[i];
    const ext = Math.max(g.w, g.h) * 0.75;
    if (g.x + ext < vx0 || g.x - ext > vx1 || g.y + ext < vy0 || g.y - ext > vy1) continue;
    const isFilled = all || (filled && filled[i] && !(skip && skip.has(i)));
    if (isFilled) { gems.push(i); continue; }
    const md = Math.max(g.w, g.h) * s;
    const sx = ox + g.x * s, sy = oy + g.y * s;
    const spr = cache.get('s', g.shape, g.w, g.h, md * dpr, g.rot, null, 0, 0, fast);
    const k = (md * dpr) / spr.px;
    ctx.setTransform(k, 0, 0, k, sx * dpr, sy * dpr);
    ctx.drawImage(spr.canvas, -spr.canvas.width / 2, -spr.canvas.height / 2);
    if (g.p === sel) hl.push(i);
    if (Math.min(g.w, g.h) * s >= 11) labels.push(i);
  }

  // highlights for selected number
  if (hl.length) {
    const t = tonesFor(pal[sel]);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = rgbStr(t[3], 0.62);
    ctx.strokeStyle = rgbStr(t[1], 0.95);
    for (const i of hl) {
      const g = S[i];
      const md = Math.min(g.w, g.h) * s;
      ctx.lineWidth = Math.max(1.2, Math.min(3, md * 0.07));
      traceOutline(ctx, g.shape, ox + g.x * s, oy + g.y * s, g.w * s, g.h * s, g.rot, -ctx.lineWidth * 0.5);
      ctx.fill(); ctx.stroke();
    }
  }

  // labels
  if (labels.length) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let lastFont = '';
    for (const i of labels) {
      const g = S[i];
      const md = Math.min(g.w, g.h) * s;
      const fs = Math.min(26, Math.max(8, md * (g.shape === 'teardrop' ? 0.4 : 0.46)));
      const isSel = g.p === sel;
      const font = `${isSel ? 700 : 600} ${fs.toFixed(1)}px ui-sans-serif, system-ui, sans-serif`;
      if (font !== lastFont) { ctx.font = font; lastFont = font; }
      ctx.fillStyle = isSel ? rgbStr(tonesFor(pal[g.p])[0]) : (sel >= 0 ? 'rgba(130,116,96,0.7)' : '#8a7e6c');
      let lx = 0, ly = 0;
      if (g.shape === 'teardrop') { ly = g.h * 0.14 * s; }
      const c = Math.cos(g.rot), sn = Math.sin(g.rot);
      ctx.fillText(String(g.p + 1), ox + g.x * s - ly * sn + lx, oy + g.y * s + ly * c + fs * 0.04);
    }
  }

  // pass 2: gems
  for (const i of gems) drawGem(ctx, art, i, cam, dpr, cache, 1, 0, 1, fast);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// One gem at socket i; sc/lift/alpha drive the placement animation.
export function drawGem(ctx, art, i, cam, dpr, cache = mainCache, sc = 1, lift = 0, alpha = 1, fast = false) {
  const g = art.sockets[i], pal = art.palette[g.p], s = cam.s;
  const md = Math.max(g.w, g.h) * s;
  const spr = cache.get('g', g.shape, g.w, g.h, md * dpr, g.rot, tonesFor(pal), pal.key, gemVariant(g.id), fast);
  const k = (md * dpr * sc) / spr.px;
  ctx.setTransform(k, 0, 0, k, (cam.x + g.x * s) * dpr, (cam.y + g.y * s - lift) * dpr);
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(spr.canvas, -spr.canvas.width / 2, -spr.canvas.height / 2);
  if (alpha < 1) ctx.globalAlpha = 1;
}

export function fitCamera(art, W, H, pad = 0.05) {
  const s = Math.min(W / (art.hx * 2 * (1 + pad)), H / (art.hy * 2 * (1 + pad)));
  return { s, x: W / 2, y: H / 2 };
}

// ---------------------------------------------------------------- Board
export class Board {
  constructor(canvas, hooks) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.h = hooks;
    this.mode = 'paint';
    this.pointers = new Map();
    this.gesture = null;
    this.anims = new Map();
    this.parts = [];
    this.space = false;
    this.reduced = false;
    this.dirty = false;
    this.camAnim = null;
    this.hint = null; this.wobble = null; this.shimmer = null;
    this.layer = null; this._lastCam = 0;
    this._bind();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement);
  }

  load(art, filled, sel, cam) {
    this.art = art;
    this.filled = filled;
    this.sel = sel;
    this.anims.clear(); this.parts.length = 0; this.hint = null; this.shimmer = null;
    this.invalidate();
    this._buildGrid();
    this.resize(true);
    if (cam && cam.s) { this.cam = { ...cam }; this._clamp(); } else this.fit(false);
    this.render();
    this._glintLoop();
  }
  unload() { this.art = null; clearTimeout(this._glintT); this.layer = null; }
  invalidate() { if (this.layer) this.layer.dirty = true; this.render(); }

  _buildGrid() {
    const C = (this.cell = 40), g = new Map();
    this.art.sockets.forEach((s, i) => {
      const e = Math.max(s.w, s.h) / 2;
      for (let gx = Math.floor((s.x - e) / C); gx <= Math.floor((s.x + e) / C); gx++)
        for (let gy = Math.floor((s.y - e) / C); gy <= Math.floor((s.y + e) / C); gy++) {
          const k = gx * 100003 + gy; let l = g.get(k); if (!l) g.set(k, (l = [])); l.push(i);
        }
    });
    this.grid = g;
  }

  hitTest(wx, wy) {
    const C = this.cell, l = this.grid.get(Math.floor(wx / C) * 100003 + Math.floor(wy / C));
    if (!l) return -1;
    for (const i of l) {
      const s = this.art.sockets[i];
      const dx = wx - s.x, dy = wy - s.y, c = Math.cos(-s.rot), sn = Math.sin(-s.rot);
      const lx = dx * c - dy * sn, ly = dx * sn + dy * c;
      if (insideUnit(s.shape, lx / s.w, ly / s.h)) return i;
    }
    return -1;
  }

  resize(force) {
    const r = this.cv.parentElement.getBoundingClientRect();
    const W = Math.max(1, r.width), H = Math.max(1, r.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!force && W === this.W && H === this.H && dpr === this.dpr) return;
    if (this.cam && this.W) { this.cam.x += (W - this.W) / 2; this.cam.y += (H - this.H) / 2; }
    this.W = W; this.H = H; this.dpr = dpr;
    this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
    this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
    if (this.cam && this.art) this._clamp();
    this.invalidate();
  }

  // ---------------- camera
  get fitScale() { return fitCamera(this.art, this.W, this.H).s; }
  get minScale() { return this.fitScale * 0.75; }
  get maxScale() { return Math.max(this.fitScale * 3, 64 / this.art.minDim); }
  _clamp() {
    const c = this.cam;
    c.s = Math.max(this.minScale, Math.min(this.maxScale, c.s));
    const R = this.art.R * c.s;
    const mx = Math.max(R, this.W * 0.25), my = Math.max(R, this.H * 0.25);
    c.x = Math.max(this.W / 2 - mx, Math.min(this.W / 2 + mx, c.x));
    c.y = Math.max(this.H / 2 - my, Math.min(this.H / 2 + my, c.y));
  }
  fit(animate = true) { this.animateTo(fitCamera(this.art, this.W, this.H), animate); }
  zoomAt(sx, sy, f) {
    const c = this.cam, ns = Math.max(this.minScale, Math.min(this.maxScale, c.s * f));
    const k = ns / c.s;
    c.x = sx - (sx - c.x) * k; c.y = sy - (sy - c.y) * k; c.s = ns;
    this._clamp(); this._camChanged();
  }
  zoomBy(f) { this.camAnim = null; this.zoomAt(this.W / 2, this.H / 2, f); }
  animateTo(target, animate = true) {
    if (!animate || this.reduced || !this.cam) { this.cam = { ...target }; this.camAnim = null; this._clamp(); this._camChanged(); return; }
    this.camAnim = { from: { ...this.cam }, to: target, t0: performance.now(), dur: 480 };
    this.render();
  }
  _camChanged() {
    this._lastCam = performance.now();
    this.render();
    clearTimeout(this._settleT);
    this._settleT = setTimeout(() => this.render(), 170);
    clearTimeout(this._camT);
    this._camT = setTimeout(() => this.h.onCamera && this.h.onCamera({ ...this.cam }), 400);
  }
  toWorld(sx, sy) { return [(sx - this.cam.x) / this.cam.s, (sy - this.cam.y) / this.cam.s]; }

  // ---------------- rendering
  render() {
    if (this.dirty) return;
    this.dirty = true;
    requestAnimationFrame((t) => this._frame(t));
  }
  _frame() {
    this.dirty = false;
    if (!this.art) return;
    const now = performance.now();
    let again = false;
    if (this.camAnim) {
      const a = this.camAnim, t = Math.min(1, (now - a.t0) / a.dur), e = easeInOut(t);
      // interpolate in log-scale around the world point at screen center
      const s = Math.exp(Math.log(a.from.s) + (Math.log(a.to.s) - Math.log(a.from.s)) * e);
      const fw = [(this.W / 2 - a.from.x) / a.from.s, (this.H / 2 - a.from.y) / a.from.s];
      const tw = [(this.W / 2 - a.to.x) / a.to.s, (this.H / 2 - a.to.y) / a.to.s];
      const wx = fw[0] + (tw[0] - fw[0]) * e, wy = fw[1] + (tw[1] - fw[1]) * e;
      this.cam = { s, x: this.W / 2 - wx * s, y: this.H / 2 - wy * s };
      if (t >= 1) { this.camAnim = null; this._clamp(); this._camChanged(); } else again = true;
    }
    const ctx = this.ctx, dpr = this.dpr, cam = this.cam;
    // --- cached board layer: one blit per frame while the camera moves
    let L = this.layer;
    const moving = !!this.camAnim || (this.gesture && this.gesture.type !== 'paint') || now - this._lastCam < 150;
    let need = !L || L.dirty;
    if (!need) {
      const k = cam.s / L.s, ox = cam.x - k * (L.cx + L.mx), oy = cam.y - k * (L.cy + L.my);
      const covers = ox <= 0.5 && oy <= 0.5 && ox + L.LW * k >= this.W - 0.5 && oy + L.LH * k >= this.H - 0.5;
      if (moving) need = (!covers || k < 0.6 || k > 1.8) && now - L.t > 200;
      else need = Math.abs(k - 1) > 1e-4 || !covers || Math.abs(ox + L.mx) > L.mx * 0.7 || Math.abs(oy + L.my) > L.my * 0.7;
    }
    if (need) L = this._buildLayer(now);
    {
      const k = cam.s / L.s;
      let ox = cam.x - k * (L.cx + L.mx), oy = cam.y - k * (L.cy + L.my);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#f6f1e8';
      ctx.fillRect(0, 0, this.cv.width, this.cv.height);
      if (Math.abs(k - 1) < 1e-4) { ox = Math.round(ox * dpr) / dpr; oy = Math.round(oy * dpr) / dpr; }
      ctx.setTransform(k, 0, 0, k, ox * dpr, oy * dpr);
      ctx.drawImage(L.cv, 0, 0);
    }
    // placement animations drawn on top, then committed into the layer
    for (const [i, st] of this.anims) {
      const t = Math.min(1, (now - st) / 260);
      if (t >= 1) { this.anims.delete(i); this._commitGem(i); drawGem(ctx, this.art, i, cam, dpr, mainCache, 1, 0, 1, true); continue; }
      drawGem(ctx, this.art, i, cam, dpr, mainCache, 0.55 + 0.45 * easeOutBack(t), (1 - t) * (1 - t) * 6, Math.min(1, t * 3), true);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.anims.size) again = true;
    if (this.wobble) {
      const t = (now - this.wobble.t) / 360;
      if (t >= 1 || this.filled[this.wobble.i]) this.wobble = null;
      else {
        const g = this.art.sockets[this.wobble.i];
        const md = Math.min(g.w, g.h) * cam.s;
        const dx = Math.sin(t * 24) * (1 - t) * Math.min(4, md * 0.12);
        traceOutline(ctx, g.shape, cam.x + g.x * cam.s + dx, cam.y + g.y * cam.s, g.w * cam.s, g.h * cam.s, g.rot);
        ctx.lineWidth = 2; ctx.strokeStyle = `rgba(184,84,70,${0.85 * (1 - t)})`; ctx.stroke();
        again = true;
      }
    }

    // hint pulse
    if (this.hint) {
      const t = (now - this.hint.t) / 1800;
      if (t >= 1 || this.filled[this.hint.i]) this.hint = null;
      else {
        const g = this.art.sockets[this.hint.i], s = this.cam.s;
        const r = Math.max(g.w, g.h) * s * 0.5;
        const ph = (t * 3) % 1;
        ctx.strokeStyle = `rgba(196,150,60,${0.9 * (1 - ph)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(this.cam.x + g.x * s, this.cam.y + g.y * s, r + 4 + ph * 18, 0, TAU); ctx.stroke();
        again = true;
      }
    }
    // shimmer
    if (this.shimmer) {
      const t = (now - this.shimmer.t) / 1900;
      if (t >= 1) { this.shimmer = null; }
      else {
        const R = this.art.R * this.cam.s, cx = this.cam.x, cy = this.cam.y;
        const p = -1.4 + t * 2.8;
        const gx = cx + p * R, gy = cy + p * R;
        const gr = ctx.createLinearGradient(gx - R * 0.35, gy - R * 0.35, gx + R * 0.35, gy + R * 0.35);
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(0.5, 'rgba(255,250,235,0.55)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
        ctx.restore();
        if (Math.random() < 0.5) {
          const i = (Math.random() * this.art.sockets.length) | 0, g = this.art.sockets[i];
          const sx = cx + g.x * this.cam.s, sy = cy + g.y * this.cam.s;
          if (Math.abs((sx - gx) + (sy - gy)) < R * 0.4) this.spark(g.x, g.y, 1, Math.max(g.w, g.h));
        }
        again = true;
      }
    }
    // sparkles
    if (this.parts.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = this.parts.length - 1; k >= 0; k--) {
        const p = this.parts[k], t = (now - p.t) / p.life;
        if (t >= 1) { this.parts.splice(k, 1); continue; }
        const sx = this.cam.x + p.x * this.cam.s, sy = this.cam.y + p.y * this.cam.s;
        const a = Math.sin(t * Math.PI), r = p.r * (0.6 + 0.6 * a);
        ctx.strokeStyle = `rgba(255,252,240,${0.9 * a})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx - r, sy); ctx.lineTo(sx + r, sy);
        ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy + r);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath(); ctx.arc(sx, sy, 1.3, 0, TAU); ctx.fill();
      }
      ctx.restore();
      again = true;
    }
    if (this.h.onFrame) this.h.onFrame();
    if (again) this.render();
  }
  centerOn(wx, wy, animate = false) {
    const s = this.cam.s;
    this.animateTo({ s, x: this.W / 2 - wx * s, y: this.H / 2 - wy * s }, animate);
  }
  get zoomRatio() { return this.cam.s / this.fitScale; }

  _buildLayer(now) {
    const W = this.W, H = this.H, dpr = this.dpr, cam = this.cam;
    const mx = Math.round(W * 0.25), my = Math.round(H * 0.25), LW = W + 2 * mx, LH = H + 2 * my;
    let L = this.layer;
    const pw = Math.round(LW * dpr), ph = Math.round(LH * dpr);
    if (!L || L.cv.width !== pw || L.cv.height !== ph) {
      const cv = (L && L.cv) || document.createElement('canvas');
      cv.width = pw; cv.height = ph;
      L = { cv, ctx: cv.getContext('2d') };
    }
    Object.assign(L, { s: cam.s, cx: cam.x, cy: cam.y, mx, my, LW, LH, t: now, dirty: false });
    drawArtwork(L.ctx, this.art, { s: cam.s, x: cam.x + mx, y: cam.y + my }, LW, LH, dpr, { filled: this.filled, sel: this.sel, skip: this.anims, fast: true });
    if (mainCache.pending.size) this._sharpen();
    this.layer = L;
    return L;
  }
  // Build queued crisp sprites in small slices, then rebuild the layer once.
  _sharpen() {
    if (this._sharpT) return;
    const step = () => {
      this._sharpT = 0;
      if (!this.art) { mainCache.pending.clear(); return; }
      const moving = this.camAnim || (this.gesture && this.gesture.type !== 'paint') || performance.now() - this._lastCam < 150;
      if (!moving) mainCache.drain(7);
      if (mainCache.pending.size) this._sharpT = requestAnimationFrame(step);
      else this.invalidate();
    };
    this._sharpT = requestAnimationFrame(step);
  }
  _commitGem(i) {
    const L = this.layer;
    if (!L || L.dirty) return;
    drawGem(L.ctx, this.art, i, { s: L.s, x: L.cx + L.mx, y: L.cy + L.my }, this.dpr, mainCache, 1, 0, 1, true);
  }

  spark(wx, wy, n, size) {
    if (this.reduced) return;
    for (let k = 0; k < n && this.parts.length < 40; k++) {
      const a = Math.random() * TAU, d = size * 0.25 * Math.random();
      this.parts.push({
        x: wx + Math.cos(a) * d - size * 0.12, y: wy + Math.sin(a) * d - size * 0.12,
        t: performance.now() + k * 60, life: 420 + Math.random() * 200,
        r: Math.min(12, Math.max(4, size * this.cam.s * 0.28)),
      });
    }
    this.render();
  }

  _glintLoop() {
    clearTimeout(this._glintT);
    this._glintT = setTimeout(() => {
      if (!this.art) return;
      if (!this.reduced && !document.hidden && !this.gesture) {
        const S = this.art.sockets;
        for (let tries = 0; tries < 12; tries++) {
          const i = (Math.random() * S.length) | 0, g = S[i];
          if (!this.filled[i]) continue;
          const sx = this.cam.x + g.x * this.cam.s, sy = this.cam.y + g.y * this.cam.s;
          if (sx < 0 || sy < 0 || sx > this.W || sy > this.H || Math.max(g.w, g.h) * this.cam.s < 14) continue;
          this.spark(g.x, g.y, 1, Math.max(g.w, g.h));
          break;
        }
      }
      this._glintLoop();
    }, 2200 + Math.random() * 2200);
  }

  // ---------------- placement
  setSelected(p) { this.sel = p; this.invalidate(); }
  tryPlace(i, isTap) {
    if (i < 0 || this.filled[i]) return false;
    const g = this.art.sockets[i];
    if (Math.min(g.w, g.h) * this.cam.s < (isTap ? 12 : 6)) {
      // too small to tap reliably: zoom in around the tapped gem instead
      if (isTap) {
        const c = this.cam, s = Math.min(this.maxScale, Math.max(c.s * 2.5, 30 / Math.min(g.w, g.h)));
        const sx = c.x + g.x * c.s, sy = c.y + g.y * c.s;
        this.animateTo({ s, x: sx - g.x * s, y: sy - g.y * s });
      }
      this.h.onTooSmall && this.h.onTooSmall(isTap);
      return false;
    }
    if (g.p !== this.sel) {
      if (isTap) { this.wobble = { i, t: performance.now() }; this.render(); this.h.onWrong && this.h.onWrong(g.p); }
      return false;
    }
    this.filled[i] = 1;
    if (!this.reduced) this.anims.set(i, performance.now()); else this._commitGem(i);
    if (this.stroke) this.stroke.push(i);
    this.spark(g.x, g.y, isTap ? 2 : 1, Math.max(g.w, g.h));
    this.render();
    this.h.onPlace(i);
    return true;
  }
  showHint() {
    const S = this.art.sockets, c = this.cam;
    const [cx, cy] = this.toWorld(this.W / 2, this.H / 2);
    let best = -1, bd = Infinity;
    for (let i = 0; i < S.length; i++) {
      if (this.filled[i] || S[i].p !== this.sel) continue;
      const d = Math.hypot(S[i].x - cx, S[i].y - cy);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return false;
    const g = S[best];
    const sx = c.x + g.x * c.s, sy = c.y + g.y * c.s;
    const need = Math.max(c.s, 30 / Math.min(g.w, g.h));
    const visible = sx > 40 && sy > 40 && sx < this.W - 40 && sy < this.H - 40;
    if (!visible || need > c.s * 1.01) {
      const s = Math.min(this.maxScale, need);
      this.animateTo({ s, x: this.W / 2 - g.x * s, y: this.H / 2 - g.y * s });
    }
    this.hint = { i: best, t: performance.now() };
    this.render();
    return true;
  }
  celebrate() {
    this.fit(true);
    setTimeout(() => { if (!this.reduced) { this.shimmer = { t: performance.now() }; this.render(); } }, this.reduced ? 0 : 500);
  }

  // ---------------- input
  _bind() {
    const cv = this.cv;
    cv.addEventListener('pointerdown', (e) => this._down(e));
    cv.addEventListener('pointermove', (e) => this._move(e));
    cv.addEventListener('pointerup', (e) => this._up(e));
    cv.addEventListener('pointercancel', (e) => this._up(e, true));
    cv.addEventListener('lostpointercapture', (e) => { if (this.pointers.has(e.pointerId)) this._up(e, true); });
    cv.addEventListener('wheel', (e) => {
      if (!this.art) return;
      e.preventDefault();
      this.camAnim = null;
      const r = cv.getBoundingClientRect();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018)));
    }, { passive: false });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  _pos(e) { const r = this.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  _down(e) {
    if (!this.art) return;
    this.camAnim = null;
    const [x, y] = this._pos(e);
    try { this.cv.setPointerCapture(e.pointerId); } catch {}
    this.pointers.set(e.pointerId, { x, y });
    if (this.pointers.size >= 2) {
      // second finger: cancel any paint stroke that just began
      if (this.gesture && this.gesture.type === 'paint' && performance.now() - this.gesture.t0 < 350 && this.stroke && this.stroke.length) {
        this.h.onUndoStroke && this.h.onUndoStroke(this.stroke.slice());
      }
      this.stroke = null;
      const [a, b] = [...this.pointers.values()];
      this.gesture = { type: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      return;
    }
    const panning = this.mode === 'pan' || this.space || e.button === 1 || e.button === 2;
    if (panning) { this.gesture = { type: 'pan', x, y }; this.cv.style.cursor = 'grabbing'; return; }
    if (e.button !== 0) return;
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      this.gesture = { type: 'paint', x, y, t0: performance.now() };
      this.stroke = [];
      this.tryPlace(this.hitTest(...this.toWorld(x, y)), true) || this._tapAssist(x, y, true);
    } else {
      this.gesture = { type: 'pending', x, y, sx: x, sy: y, t0: performance.now() };
    }
  }
  _tapAssist(x, y, isTap) {
    // forgiving taps: probe a few px around the touch point when it lands in a gap
    if (this.hitTest(...this.toWorld(x, y)) >= 0) return false;
    for (const [dx, dy] of [[5, 0], [-5, 0], [0, 5], [0, -5], [4, 4], [-4, -4], [4, -4], [-4, 4]]) {
      const i = this.hitTest(...this.toWorld(x + dx, y + dy));
      if (i >= 0) return this.tryPlace(i, isTap);
    }
    return false;
  }
  _sweep(x0, y0, x1, y1) {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(len / 3));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const i = this.hitTest(...this.toWorld(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t));
      if (i >= 0 && !this.filled[i]) this.tryPlace(i, false);
    }
  }
  _move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p || !this.gesture) {
      if (e.pointerType === 'mouse') this.cv.style.cursor = (this.mode === 'pan' || this.space) ? 'grab' : 'crosshair';
      return;
    }
    const [x, y] = this._pos(e);
    const g = this.gesture;
    const px = p.x, py = p.y;
    p.x = x; p.y = y;
    if (g.type === 'pinch') {
      if (this.pointers.size < 2) return;
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      this.cam.x += cx - g.cx; this.cam.y += cy - g.cy;
      this.zoomAt(cx, cy, d / (g.d || d));
      g.d = d; g.cx = cx; g.cy = cy;
    } else if (g.type === 'pan') {
      this.cam.x += x - g.x; this.cam.y += y - g.y; g.x = x; g.y = y;
      this._clamp(); this._camChanged();
    } else if (g.type === 'pending') {
      if (Math.hypot(x - g.sx, y - g.sy) > 7) {
        this.gesture = { type: 'paint', t0: g.t0 };
        this.stroke = [];
        this._sweep(g.sx, g.sy, g.sx, g.sy);
        this._sweep(g.sx, g.sy, x, y);
      }
    } else if (g.type === 'paint') {
      this._sweep(px, py, x, y);
    }
  }
  _up(e, cancel) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    const g = this.gesture;
    if (g && g.type === 'pending' && !cancel) {
      this.tryPlace(this.hitTest(...this.toWorld(p.x, p.y)), true) || this._tapAssist(p.x, p.y, true);
    }
    if (this.pointers.size === 0) {
      if (this.stroke && this.stroke.length && this.h.onStrokeEnd) this.h.onStrokeEnd(this.stroke);
      this.gesture = null; this.stroke = null;
      this.cv.style.cursor = '';
    } else if (g && g.type === 'pinch') {
      // remaining finger does nothing until all lifted (prevents accidental paint)
      this.gesture = { type: 'idle' };
    }
  }
}

export function renderThumb(art, size, filled, canvas) {
  const c = canvas || document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const px = Math.round(size * dpr);
  if (c.width !== px || c.height !== px) { c.width = px; c.height = px; }
  const ctx = c.getContext('2d');
  drawArtwork(ctx, art, fitCamera(art, size, size, 0.03), size, size, dpr, { all: !filled, filled, bg: '#fbf8f2', cache: thumbCache });
  return c;
}
const thumbCache = new SpriteCache(3e6);

export function exportPNG(art, filled, px = 2400) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const ctx = c.getContext('2d');
  drawArtwork(ctx, art, fitCamera(art, px, px, 0.06), px, px, 1, { filled, bg: '#f8f4ec', cache: new SpriteCache(40e6) });
  return c;
}
