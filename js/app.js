import { CATALOG, getArtwork, sessionLabel, LEVEL, GEMS } from './artworks.js';
import { META } from './meta.js';
import { COLLECTION_SIZE } from './collection2.js';
import { ENTRIES as C3 } from './collection3.js';
import { ENTRIES as C4 } from './collection4.js';
import { ENTRIES as C5 } from './collection5.js';
import { ENTRIES as C6 } from './collection6.js';
import { ENTRIES as C7 } from './collection7.js';
import { ENTRIES as C8 } from './collection8.js';
import { Board, renderThumb, exportPNG, tonesFor, fitCamera, setCanvasTheme } from './board.js';
import { THEMES, themeById } from './themes.js';
import { paintGem, rgbStr } from './gems.js';
import * as store from './store.js';
import * as sfx from './audio.js';

const $ = (s) => document.querySelector(s);
const svg = (body, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;
const ICON = {
  back: svg('<path d="M15 5l-7 7 7 7"/>', 'stroke-width="2.2"'),
  menu: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>',
  paint: svg('<path d="M12 3l7 6-7 12L5 9z"/><path d="M5 9h14M9 9l3-6 3 6-3 12z"/>'),
  pan: svg('<path d="M8 13V5.5a1.5 1.5 0 013 0V11m0-1V4.5a1.5 1.5 0 013 0V11m0-5.5a1.5 1.5 0 013 0V11m0-3.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1.5a6 6 0 01-4.6-2.2L4.6 15a1.6 1.6 0 012.4-2.1L8 14"/>'),
  zin: svg('<circle cx="11" cy="11" r="6.5"/><path d="M11 8v6M8 11h6M16 16l4 4"/>'),
  zout: svg('<circle cx="11" cy="11" r="6.5"/><path d="M8 11h6M16 16l4 4"/>'),
  fit: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  find: svg('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.3 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.9 3.6 4.5 7.3-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>',
  heartO: svg('<path d="M12 20.5s-7.5-4.6-9.3-9.2C1.3 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.9 3.6 4.5 7.3-1.8 4.6-9.3 9.2-9.3 9.2z"/>'),
  undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="3.2"'),
  play: '<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7 4.5v15l13-7.5z"/></svg>',
  palette: svg('<circle cx="6" cy="17" r="2.5"/><circle cx="12" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M12 4l4 4-4 5-4-5z"/>'),
  tap: svg('<path d="M9 11V5.5a1.5 1.5 0 013 0V11l4.6.9a2 2 0 011.6 2.2l-.7 5a2 2 0 01-2 1.9H11a2 2 0 01-1.6-.8L6 15.5a1.5 1.5 0 012.2-2L9 14"/><path d="M5 5.5a5 5 0 018-3"/>'),
};
const LEVEL_INFO = {
  Beginner: 'Bold shapes and a handful of colours',
  Medium: 'Richer patterns for a relaxing evening',
  Intricate: 'Fine detail that rewards zooming in',
  Expert: 'Dense mosaics of over a thousand gems',
  Master: 'Grand works of 2,000 to 3,000+ gems, made to savour over many sittings',
};
const PIPS = (d) => '◆'.repeat(LEVEL[d] + 1) + '◇'.repeat(4 - LEVEL[d]);
const fmtN = (n) => n.toLocaleString('en-US');
const fmtTime = (ms) => { const m = Math.round(ms / 60000); return m < 1 ? 'under a minute' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };

// ---------------------------------------------------------------- state
const S = {
  settings: { sound: true, autoAdvance: true, reduced: null, vibe: true, coached: false, theme: 'ivory', hideDone: true, streak: 0, lastDay: '' },
  favorites: new Set(),
  summary: {}, // artId -> {count,total,completed,updated,time}
  filters: { status: 'all', diff: 'all', cat: 'all', q: '' },
  expanded: new Set(),
  cur: null,
};
const sysReduced = matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = () => (S.settings.reduced === null ? sysReduced.matches : S.settings.reduced);

// ---------------------------------------------------------------- persistence
let saveT = null;
function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(flushSave, 600); }
function flushSave() {
  clearTimeout(saveT); saveT = null;
  const c = S.cur; if (!c || !c.dirty) return;
  c.dirty = false;
  const ids = []; for (let i = 0; i < c.filled.length; i++) if (c.filled[i]) ids.push(i);
  const rec = {
    schema: store.SCHEMA, art: c.art.id, version: c.art.version, mode: 'number',
    filled: ids, camera: c.camera, sel: c.sel, updated: Date.now(), completed: c.completed, time: Math.round(c.time),
  };
  S.summary[c.art.id] = { count: ids.length, total: c.art.sockets.length, completed: c.completed, updated: rec.updated, time: rec.time };
  return store.set(store.progressKey(c.art.id), rec);
}
const saveSettings = () => store.set('settings', { schema: store.SCHEMA, ...S.settings });
const saveFavs = () => store.set('favorites', [...S.favorites]);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
window.addEventListener('pagehide', flushSave);

// ---------------------------------------------------------------- gallery
const thumbCache = new Map(); // key -> canvas (bounded below)
function thumbKey(id) { const s = S.summary[id]; return s && s.count && !s.completed ? `${id}:${s.count}` : `${id}:full`; }
async function thumbFor(id, size) {
  const key = thumbKey(id) + ':' + size;
  if (thumbCache.has(key)) return thumbCache.get(key);
  const art = getArtwork(id), s = S.summary[id];
  let filled = null;
  if (s && s.count && !s.completed) {
    const rec = store.sanitizeProgress(await store.get(store.progressKey(id)), art);
    filled = rec ? rec.filled : null;
  }
  const c = renderThumb(art, size, filled);
  thumbCache.set(key, c);
  if (thumbCache.size > 90) thumbCache.delete(thumbCache.keys().next().value);
  return c;
}
function paintInto(target, src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  target.replaceChildren(c);
  target.classList.remove('loading');
}
// Thumbnails render lazily as cards scroll into view, one per idle slice.
const thumbQueue = [];
let thumbBusy = false;
function pumpThumbs() {
  if (thumbBusy || S.cur) return; // never compete with gameplay for the main thread
  const job = thumbQueue.shift(); if (!job) return;
  if (!job.el.isConnected) { pumpThumbs(); return; }
  thumbBusy = true;
  thumbFor(job.id, job.size).then((c) => { if (job.el.isConnected) paintInto(job.el, c); }).catch(() => {}).finally(() => {
    thumbBusy = false;
    setTimeout(pumpThumbs, 0);
  });
}
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) {
    io.unobserve(e.target);
    thumbQueue.push({ el: e.target, id: e.target.dataset.id, size: +e.target.dataset.size || 300 });
  }
  pumpThumbs();
}, { rootMargin: '400px' });

function statusOf(id) {
  const s = S.summary[id];
  if (!s) return 'new';
  if (s.completed) return 'done';
  return s.count ? 'progress' : 'new';
}

// Card metadata without generating the artwork (precomputed; falls back to generating).
function metaOf(m) {
  const x = META[m.id];
  if (x && x.v === m.version) return x;
  const a = getArtwork(m.id);
  return (META[m.id] = { v: m.version, n: a.sockets.length, pal: a.palette.map((p) => p.key) });
}
function swatchHTML(meta) {
  return meta.pal.slice(0, 8).map((k) => `<i style="background:${rgbStr(tonesFor({ key: k, ...GEMS[k] })[2])}"></i>`).join('');
}

function cardHTML(m) {
  const meta = metaOf(m), n = meta.n, st = statusOf(m.id), sum = S.summary[m.id];
  const pct = sum ? Math.floor((sum.count / n) * 100) : 0;
  const fav = S.favorites.has(m.id);
  const label = `${m.name}. ${m.difficulty}, ${fmtN(n)} gems${st === 'done' ? ', finished' : st === 'progress' ? `, ${pct}% placed` : ''}`;
  return `
    <button class="open" aria-label="${label}">
      <div class="thumb loading" data-id="${m.id}"></div>
      ${st === 'done' ? `<span class="tag done">${ICON.check} Finished</span>` : st === 'progress' ? `<span class="tag">${pct}% placed</span>` : ''}
      <div class="info">
        <h3 class="name">${m.name}</h3>
        <div class="meta"><i class="pips" data-pips="${PIPS(m.difficulty)}"></i><span>${fmtN(n)} gems</span></div>
        ${st === 'progress' ? `<div class="bar"><i style="width:${pct}%"></i></div>` : `<div class="foot"><div class="swatches">${swatchHTML(meta)}</div><span class="time">${sessionLabel(n)}</span></div>`}
      </div>
    </button>
    <button class="fav" aria-pressed="${fav}" aria-label="Favorite ${m.name}">${fav ? ICON.heart : ICON.heartO}</button>`;
}

function renderGallery() {
  const f = S.filters, box = $('#sections');
  box.innerHTML = '';
  thumbQueue.length = 0;
  const q = f.q.trim().toLowerCase();
  const list = CATALOG.filter((m) =>
    (f.cat === 'all' || m.category === f.cat) && (f.diff === 'all' || m.difficulty === f.diff) &&
    (f.status === 'all' || (f.status === 'fav' ? S.favorites.has(m.id) : statusOf(m.id) === f.status)) &&
    (!q || m.name.toLowerCase().includes(q)));
  const browsing = f.diff === 'all' && f.status === 'all' && !q;
  const perRow = Math.max(2, Math.floor((box.clientWidth || 1000) / 248));
  $('#empty').hidden = list.length > 0;
  const levels = [...new Set(list.map((m) => m.difficulty))];
  for (const lv of levels) {
    const all = list.filter((m) => m.difficulty === lv);
    const limit = perRow * 2;
    const collapsed = browsing && all.length > limit + 1 && !S.expanded.has(lv);
    const items = collapsed ? all.slice(0, limit) : all;
    const done = all.filter((m) => statusOf(m.id) === 'done').length;
    const sec = document.createElement('section');
    sec.className = 'level';
    sec.innerHTML = `<div class="level-head"><h2>${lv}</h2><i class="pips" data-pips="${PIPS(lv)}"></i><p>${LEVEL_INFO[lv]}</p><span class="level-count">${done}/${all.length} finished</span></div><div class="grid"></div>`;
    const grid = sec.querySelector('.grid');
    if (collapsed) {
      const more = document.createElement('div'); more.className = 'more';
      more.innerHTML = `<button>Show all ${all.length} ${lv} artworks</button>`;
      more.firstChild.onclick = () => { S.expanded.add(lv); renderGallery(); };
      sec.appendChild(more);
    }
    for (const m of items) {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = cardHTML(m);
      card.querySelector('.open').onclick = () => openArt(m.id);
      const fav = card.querySelector('.fav');
      fav.onclick = () => {
        if (S.favorites.has(m.id)) S.favorites.delete(m.id); else S.favorites.add(m.id);
        saveFavs();
        const on = S.favorites.has(m.id);
        fav.setAttribute('aria-pressed', on); fav.innerHTML = on ? ICON.heart : ICON.heartO;
        if (S.filters.status === 'fav') renderGallery();
      };
      grid.appendChild(card);
      io.observe(card.querySelector('.thumb'));
    }
    box.appendChild(sec);
  }
  renderRail();
  renderStats();
  renderFeatured();
}

// A featured artwork that changes daily, plus the play streak.
function today() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function dayNumber() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }
function featuredPick() {
  const pool = CATALOG.filter((m) => statusOf(m.id) !== 'done' && m.difficulty !== 'Master');
  const src = pool.length ? pool : CATALOG;
  let h = dayNumber() * 2654435761 >>> 0;
  return src[h % src.length];
}
function renderFeatured() {
  const box = $('#featured');
  if (S.filters.q || S.filters.status !== 'all' || S.filters.diff !== 'all') { box.innerHTML = ''; return; }
  const m = featuredPick(), meta = metaOf(m), st = statusOf(m.id), sum = S.summary[m.id];
  const streak = S.settings.lastDay && (S.settings.lastDay === today() || S.settings.lastDay === yesterday()) ? S.settings.streak : 0;
  box.innerHTML = `<button class="feat-card" aria-label="Today's pick: ${m.name}, ${m.difficulty}, ${fmtN(meta.n)} gems">
    <div><div class="eyebrow">Today's pick${streak > 1 ? `<span class="streak">${ICON.check.replace('<svg', '<svg width="12" height="12"')}${streak}-day streak</span>` : ''}</div>
    <h2>${m.name}</h2><p>${m.difficulty} · ${fmtN(meta.n)} gems · ${sessionLabel(meta.n)}</p>
    <span class="cta">${ICON.play}${st === 'progress' ? `Continue · ${Math.floor((sum.count / meta.n) * 100)}%` : 'Play now'}</span></div>
    <div class="feat-thumb thumb loading" data-id="${m.id}" data-size="420"></div></button>`;
  box.firstElementChild.onclick = () => openArt(m.id);
  io.observe(box.querySelector('.feat-thumb'));
}
function yesterday() { const d = new Date(Date.now() - 86400000); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function markPlayedToday() {
  const t = today(), st = S.settings;
  if (st.lastDay === t) return;
  st.streak = st.lastDay === yesterday() ? st.streak + 1 : 1;
  st.lastDay = t; saveSettings();
}

function renderStats() {
  const done = Object.values(S.summary).filter((s) => s.completed).length;
  const gems = Object.values(S.summary).reduce((a, s) => a + (s.count || 0), 0);
  $('#st-done').textContent = `${done} / ${CATALOG.length}`;
  $('#st-gems').textContent = fmtN(gems);
}

function renderRail() {
  const recent = Object.entries(S.summary).filter(([id, s]) => s.count && !s.completed && CATALOG.some((m) => m.id === id))
    .sort((a, b) => b[1].updated - a[1].updated);
  $('#rail').hidden = !recent.length;
  const track = $('#rail-track'); track.innerHTML = '';
  for (const [id, s] of recent) {
    const m = CATALOG.find((c) => c.id === id);
    const pct = Math.floor((s.count / s.total) * 100);
    const b = document.createElement('button');
    b.className = 'rail-card';
    b.setAttribute('aria-label', `Continue ${m.name}, ${pct}% placed`);
    b.innerHTML = `<div class="thumb loading" data-id="${id}" data-size="184" style="width:92px;height:92px;border-radius:14px;flex:none;overflow:hidden"></div>
      <div class="rc-body"><div class="rc-name">${m.name}</div>
      <div class="rc-meta">${pct}% · ${fmtN(s.total - s.count)} gems left</div>
      <span class="go">${ICON.play}Resume</span></div>`;
    b.onclick = () => openArt(id);
    track.appendChild(b);
    io.observe(b.querySelector('.thumb'));
  }
}

document.querySelectorAll('.filters [data-group]').forEach((g) => {
  g.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    g.querySelectorAll('button').forEach((c) => c.setAttribute('aria-pressed', c === b));
    S.filters[g.dataset.group] = b.dataset.v;
    renderGallery();
  });
});
let searchT;
$('#search').addEventListener('input', (e) => { clearTimeout(searchT); searchT = setTimeout(() => { S.filters.q = e.target.value; renderGallery(); }, 120); });
document.querySelectorAll('.chips .pips').forEach((p) => { p.dataset.pips = '◆'.repeat(+p.dataset.n); });

// ---------------------------------------------------------------- play
let lastVibe = 0;
const board = new Board($('#cv'), {
  onPlace(i) {
    const c = S.cur, g = c.art.sockets[i];
    c.remaining[g.p]--;
    c.placed++; board.placedCount = c.placed;
    c.dirty = true; c.lastInput = performance.now(); scheduleSave();
    markPlayedToday();
    sfx.place(c.placed);
    if (S.settings.vibe && navigator.vibrate && performance.now() - lastVibe > 70) { lastVibe = performance.now(); try { navigator.vibrate(4); } catch {} }
    updatePalItem(g.p); updateProgress(); mmDirty();
    if (c.remaining[g.p] === 0) paletteComplete(g.p);
  },
  onWrong(p) {
    sfx.wrong();
    toast(`That spot needs gem ${p + 1} · ${S.cur.art.palette[p].name}`);
    const el = palEls[p]; if (el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
  },
  onTooSmall(isTap) { toast(isTap ? 'Zooming in so you can place gems' : 'Zoom in to place these gems'); },
  onUndoStroke(ids) {
    const c = S.cur;
    for (const i of ids) if (c.filled[i]) { c.filled[i] = 0; c.remaining[c.art.sockets[i].p]++; c.placed--; board.anims.delete(i); }
    c.dirty = true; scheduleSave();
    refreshPalette(); updateProgress(); board.invalidate(); mmDirty();
  },
  onPick(p, i) {
    if (S.cur.sel !== p) selectPal(p, true);
    board.hint = { i, t: performance.now() }; board.render();
    toast(`Picked gem ${p + 1} · ${S.cur.art.palette[p].name}`);
    if (S.settings.vibe && navigator.vibrate) try { navigator.vibrate(12); } catch {}
  },
  onStrokeEnd(ids) {
    const c = S.cur; if (!c || c.completed) return;
    c.undo.push(ids.slice()); if (c.undo.length > 100) c.undo.shift();
    updateUndo();
  },
  onCamera(cam) { if (S.cur) { S.cur.camera = cam; S.cur.dirty = true; scheduleSave(); } },
  onFrame() { updateMinimapView(); },
});

let palEls = [];
function buildPalette() {
  const c = S.cur, box = $('#palette');
  box.innerHTML = ''; palEls = [];
  c.art.palette.forEach((entry, p) => {
    const b = document.createElement('button');
    b.className = 'pal'; b.setAttribute('role', 'radio');
    b.innerHTML = `<span class="gem"><svg viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="23" class="track"/><circle cx="25" cy="25" r="23" class="fill"/></svg></span>
      <span class="num">${p + 1}</span><span class="left"></span><span class="check">${ICON.check}</span>`;
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, devicePixelRatio || 1), sz = 38;
    cv.width = cv.height = sz * dpr;
    const x = cv.getContext('2d');
    x.scale(dpr, dpr); x.translate(sz / 2, sz / 2 - 1);
    paintGem(x, 'round', 30, 30, 0, tonesFor(entry), p % 2);
    b.querySelector('.gem').appendChild(cv);
    b.onclick = () => selectPal(p, true);
    box.appendChild(b); palEls.push(b);
  });
  c.totals = c.art.palette.map(() => 0);
  c.art.sockets.forEach((s) => c.totals[s.p]++);
  refreshPalette();
}
function updatePalItem(p) {
  const c = S.cur, el = palEls[p]; if (!el) return;
  const left = c.remaining[p], total = c.totals[p];
  el.classList.toggle('done', left === 0);
  if (left > 0 || !S.settings.hideDone || c.completed) el.classList.remove('gone');
  else if (!el.classList.contains('gone') && p !== c.sel) el.classList.add('gone');
  el.querySelector('.left').textContent = left === 0 ? 'Done' : `${fmtN(left)} left`;
  el.querySelector('.fill').style.strokeDashoffset = String(144.5 * (left / total));
  el.setAttribute('aria-label', `Gem ${p + 1}, ${c.art.palette[p].name}, ${left === 0 ? 'complete' : left + ' left'}`);
  el.setAttribute('aria-checked', String(p === c.sel));
  el.tabIndex = p === c.sel ? 0 : -1;
  if (p === c.sel) updateSelPill();
}
function updateSelPill() {
  const c = S.cur, p = c.sel, e = c.art.palette[p], left = c.remaining[p];
  $('#sel-pill').innerHTML = `<i style="background:${rgbStr(tonesFor(e)[2])}"></i><b>${p + 1} · ${e.name}</b><span>${left ? `${fmtN(left)} to place` : 'all placed'}</span>`;
}
function refreshPalette() { S.cur.art.palette.forEach((_, p) => updatePalItem(p)); }
function selectPal(p, user) {
  const c = S.cur; if (!c) return;
  if (user) sfx.select();
  const prev = c.sel;
  c.sel = p; board.setSelected(p); refreshPalette();
  if (S.settings.hideDone && c.remaining[prev] === 0 && palEls[prev]) palEls[prev].classList.add('gone');
  palEls[p].scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  c.dirty = true; scheduleSave();
}
function paletteComplete(p) {
  const c = S.cur, el = palEls[p];
  if (el) { el.classList.remove('cheer'); void el.offsetWidth; el.classList.add('cheer'); }
  if (c.placed === c.art.sockets.length) { finish(); return; }
  if (S.settings.hideDone) setTimeout(() => { if (S.cur === c && c.remaining[p] === 0 && c.sel !== p) el.classList.add('gone'); }, 900);
  sfx.paletteDone();
  toast(`${c.art.palette[p].name} complete`);
  if (S.settings.autoAdvance) {
    const n = c.art.palette.length;
    for (let k = 1; k < n; k++) { const q = (p + k) % n; if (c.remaining[q] > 0) { setTimeout(() => S.cur === c && c.sel === p && selectPal(q), 380); break; } }
  }
}
function updateProgress() {
  const c = S.cur, total = c.art.sockets.length, f = c.placed / total;
  $('#prog-arc').style.strokeDashoffset = String(113.1 * (1 - f));
  $('#prog-txt').textContent = `${Math.floor(f * 100)}%`;
  $('#prog').setAttribute('aria-label', `${c.placed} of ${total} gems placed`);
  $('#art-sub').textContent = c.placed === total ? `All ${fmtN(total)} gems placed` : `${fmtN(total - c.placed)} of ${fmtN(total)} gems left`;
}

// ---------------- minimap
const mm = { canvas: $('#mm'), box: $('#minimap'), view: $('#mm-view'), dirty: true, t: 0, size: 0 };
function mmDirty() { mm.dirty = true; }
function updateMinimapView() {
  const c = S.cur; if (!c) return;
  const show = board.zoomRatio > 1.7;
  if (mm.box.hidden === show) mm.box.hidden = !show;
  if (!show) return;
  const size = mm.box.clientWidth || 112;
  const now = performance.now();
  if ((mm.dirty && now - mm.t > 1500) || mm.size !== size) {
    mm.dirty = false; mm.t = now; mm.size = size;
    renderThumb(c.art, size, c.filled, mm.canvas);
  }
  const ft = fitCamera(c.art, size, size, 0.03), cam = board.cam;
  const x0 = (-cam.x / cam.s) * ft.s + ft.x, y0 = (-cam.y / cam.s) * ft.s + ft.y;
  const w = (board.W / cam.s) * ft.s, h = (board.H / cam.s) * ft.s;
  const cl = (v) => Math.max(-2, Math.min(size + 2, v));
  const L = cl(x0), T = cl(y0), R = cl(x0 + w), B = cl(y0 + h);
  const st = mm.view.style;
  st.left = L + 'px'; st.top = T + 'px'; st.width = Math.max(6, R - L) + 'px'; st.height = Math.max(6, B - T) + 'px';
}
function mmJump(e, animate) {
  const c = S.cur; if (!c) return;
  const r = mm.box.getBoundingClientRect(), size = r.width;
  const ft = fitCamera(c.art, size, size, 0.03);
  board.centerOn((e.clientX - r.left - ft.x) / ft.s, (e.clientY - r.top - ft.y) / ft.s, animate && !reducedMotion());
}
mm.box.addEventListener('pointerdown', (e) => { e.preventDefault(); try { mm.box.setPointerCapture(e.pointerId); } catch {} mmJump(e, true); });
mm.box.addEventListener('pointermove', (e) => { if (e.buttons) mmJump(e, false); });

// ---------------- open / leave
async function openArt(id) {
  sfx.unlock();
  const art = getArtwork(id);
  let rec = null;
  try { rec = store.sanitizeProgress(await store.get(store.progressKey(id)), art); } catch {}
  const filled = rec ? rec.filled : new Uint8Array(art.sockets.length);
  const remaining = art.palette.map(() => 0);
  let placed = 0;
  art.sockets.forEach((s, i) => { if (filled[i]) placed++; else remaining[s.p]++; });
  let sel = rec ? Math.min(rec.sel, art.palette.length - 1) : 0;
  if (remaining[sel] === 0) { const q = remaining.findIndex((r) => r > 0); if (q >= 0) sel = q; }
  const prevTime = (S.summary[id] && S.summary[id].time) || 0;
  S.cur = { art, filled, remaining, placed, sel, camera: rec && rec.camera, completed: placed === art.sockets.length, dirty: false, time: prevTime, lastInput: performance.now(), undo: [] };
  board.placedCount = placed;
  $('#art-name').textContent = art.name;
  document.title = `${art.name} · Lustra`;
  show('play');
  board.reduced = reducedMotion();
  setMode('paint');
  mm.size = 0; mm.box.hidden = true;
  board.load(art, filled, sel, rec && rec.camera);
  buildPalette(); updateProgress(); mmDirty(); updateUndo();
  palEls[sel] && palEls[sel].scrollIntoView({ inline: 'center', block: 'nearest' });
  if (S.cur.completed) setTimeout(() => completionPanel(true), 300);
  else if (!S.settings.coached) showCoach();
}

function leave() {
  flushSave();
  closeMenu(); closeModal(); $('#coach').hidden = true;
  board.unload();
  S.cur = null;
  document.title = 'Lustra Gem Mosaics';
  show('gallery');
  renderGallery();
}
function show(which) {
  for (const id of ['gallery', 'play']) {
    const el = $('#' + id), on = id === which;
    if (on && el.hidden && !reducedMotion()) { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
    el.hidden = !on;
  }
}

// Active play time: counts while the tab is visible and the player touched it in the last minute.
setInterval(() => {
  const c = S.cur;
  if (c && !c.completed && !document.hidden && performance.now() - c.lastInput < 60000) c.time += 1000;
}, 1000);
document.addEventListener('pointerdown', () => { if (S.cur) S.cur.lastInput = performance.now(); }, { capture: true, passive: true });

function updateUndo() { const c = S.cur; $('#t-undo').disabled = !c || c.completed || !c.undo.length; }
function undo() {
  const c = S.cur; if (!c || c.completed || !c.undo.length) return;
  const ids = c.undo.pop();
  for (const i of ids) if (c.filled[i]) { c.filled[i] = 0; c.remaining[c.art.sockets[i].p]++; c.placed--; board.anims.delete(i); }
  board.placedCount = c.placed;
  c.dirty = true; scheduleSave();
  refreshPalette(); updateProgress(); board.invalidate(); mmDirty(); updateUndo();
  sfx.select();
  toast(ids.length === 1 ? 'Removed the last gem' : `Removed ${ids.length} gems`);
}

function finish() {
  const c = S.cur;
  updateUndo();
  c.completed = true; c.dirty = true; flushSave();
  setTimeout(() => {
    if (S.cur !== c) return;
    sfx.complete();
    board.celebrate();
    setTimeout(() => S.cur === c && completionPanel(false), reducedMotion() ? 200 : 2300);
  }, 350);
}

function completionPanel(revisit) {
  const c = S.cur; if (!c) return;
  const idx = CATALOG.findIndex((m) => m.id === c.art.id);
  const next = CATALOG.slice(idx + 1).concat(CATALOG.slice(0, idx)).find((m) => statusOf(m.id) !== 'done');
  openModal(`
    <div class="eyebrow">${revisit ? 'In your collection' : 'Artwork complete'}</div>
    <h3 id="modal-title">${c.art.name}</h3>
    <div class="done-stats">
      <div><b>${fmtN(c.art.sockets.length)}</b><span>gems placed</span></div>
      <div><b>${c.art.palette.length}</b><span>gem colours</span></div>
      ${c.time > 30000 ? `<div><b>${fmtTime(c.time)}</b><span>of play</span></div>` : ''}
    </div>
    <div class="actions">
      <button class="btn" data-a="admire">Admire</button>
      <button class="btn" data-a="export">Save image</button>
      <button class="btn" data-a="gallery">Gallery</button>
      ${next ? `<button class="btn primary" data-a="next">Next: ${next.name}</button>` : ''}
    </div>`, {
    admire: closeModal, export: doExport, gallery: leave,
    next: () => { closeModal(); leave(); openArt(next.id); },
  }, true);
}

function doExport() {
  const c = S.cur; if (!c) return;
  toast('Preparing image…');
  setTimeout(() => {
    const cv = exportPNG(c.art, c.filled, 2000);
    cv.toBlob((blob) => {
      if (!blob) { toast('Could not create the image'); return; }
      const url = URL.createObjectURL(blob);
      const back = c.completed ? () => completionPanel(true) : closeModal;
      openModal(`
        <h3 id="modal-title">${c.art.name}</h3>
        <img class="export-img" src="${url}" alt="${c.art.name}, rendered at 2000 by 2000 pixels">
        <p>Press and hold the image (or right-click it) and choose Save Image.</p>
        <div class="actions"><button class="btn primary" data-a="done">Done</button></div>`, {
        done: () => { URL.revokeObjectURL(url); back(); },
      });
    }, 'image/png');
  }, 30);
}

// ---------------------------------------------------------------- modal / menu / toast / coach
let modalActions = null, modalReturn = null;
function openModal(html, actions, clear = false) {
  const m = $('#modal'), sh = m.querySelector('.sheet');
  modalReturn = document.activeElement;
  sh.innerHTML = html; modalActions = actions;
  m.classList.toggle('clear', clear);
  m.hidden = false;
  const first = sh.querySelector('.btn.primary') || sh.querySelector('.btn');
  first && first.focus();
}
function closeModal() { const sh = document.querySelector('#modal .sheet'); sh.classList.remove('wide'); sh.onclick = null; $('#modal').hidden = true; modalActions = null; modalReturn && modalReturn.focus && modalReturn.focus(); }
$('#modal').addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]');
  if (b && modalActions && modalActions[b.dataset.a]) modalActions[b.dataset.a]();
  else if (e.target === $('#modal')) closeModal();
});

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800);
}

function showCoach() { $('#coach').hidden = false; $('#coach-ok').focus(); }
$('#coach-ok').onclick = () => { $('#coach').hidden = true; S.settings.coached = true; saveSettings(); };
document.querySelectorAll('.step-ico').forEach((el) => { el.innerHTML = { palette: ICON.palette, tap: ICON.tap, zoom: ICON.zin, find: ICON.find }[el.dataset.ico]; });

function openMenu() {
  $('#menu').hidden = false; $('#btn-menu').setAttribute('aria-expanded', 'true');
  $('#opt-sound').checked = S.settings.sound;
  $('#opt-vibe').checked = S.settings.vibe;
  $('#opt-auto').checked = S.settings.autoAdvance;
  $('#opt-hide').checked = S.settings.hideDone;
  $('#opt-motion').checked = reducedMotion();
  $('#opt-sound').focus();
}
function closeMenu() { if ($('#menu').hidden) return; $('#menu').hidden = true; $('#btn-menu').setAttribute('aria-expanded', 'false'); }
$('#btn-menu').onclick = (e) => { e.stopPropagation(); $('#menu').hidden ? openMenu() : closeMenu(); };
document.addEventListener('pointerdown', (e) => { if (!$('#menu').hidden && !e.target.closest('#menu') && !e.target.closest('#btn-menu')) closeMenu(); });
$('#opt-sound').onchange = (e) => { S.settings.sound = e.target.checked; sfx.setSound(S.settings.sound); saveSettings(); };
$('#opt-vibe').onchange = (e) => { S.settings.vibe = e.target.checked; saveSettings(); };
$('#opt-auto').onchange = (e) => { S.settings.autoAdvance = e.target.checked; saveSettings(); };
$('#opt-hide').onchange = (e) => { S.settings.hideDone = e.target.checked; saveSettings(); if (S.cur) { palEls.forEach((el) => el.classList.remove('gone')); refreshPalette(); } };
$('#opt-motion').onchange = (e) => { S.settings.reduced = e.target.checked; applyMotion(); saveSettings(); };
$('#m-help').onclick = () => { closeMenu(); showCoach(); };
$('#m-export').onclick = () => { closeMenu(); doExport(); };
$('#m-restart').onclick = () => {
  closeMenu();
  const c = S.cur;
  openModal(`<h3 id="modal-title">Restart ${c.art.name}?</h3><p>All ${fmtN(c.placed)} placed gems on this artwork will be removed. Your other artworks are not affected.</p>
    <div class="actions"><button class="btn" data-a="no">Keep my progress</button><button class="btn danger" data-a="yes">Restart</button></div>`, {
    no: closeModal,
    yes: () => {
      closeModal();
      c.filled.fill(0); c.placed = 0; c.completed = false; c.time = 0;
      c.remaining = c.art.palette.map(() => 0); c.art.sockets.forEach((s) => c.remaining[s.p]++);
      c.sel = 0; c.camera = null; c.dirty = true; c.undo = []; flushSave(); updateUndo(); board.placedCount = 0;
      board.load(c.art, c.filled, 0, null);
      refreshPalette(); updateProgress(); mmDirty();
      toast('Artwork restarted');
    },
  });
};
function applyMotion() { board.reduced = reducedMotion(); document.documentElement.classList.toggle('reduced', reducedMotion()); }

// ---------------------------------------------------------------- themes
function applyTheme(id, rerender = true) {
  const t = themeById(id), root = document.documentElement;
  for (const [k, v] of Object.entries(t.css)) root.style.setProperty(k, v);
  root.style.colorScheme = t.dark ? 'dark' : 'light';
  root.dataset.skin = t.id;
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = t.css['--bg'];
  setCanvasTheme(t.id, t.canvas);
  thumbCache.clear();
  if (!rerender) return;
  if (S.cur) { board.invalidate(); mmDirty(); mm.size = 0; }
  if (!$('#gallery').hidden) renderGallery();
}
function gemDot(c) { return `radial-gradient(circle at 34% 30%, rgba(255,255,255,.95) 0 14%, ${c} 46%, ${c} 66%, rgba(0,0,0,.45) 100%)`; }
function themeTile(t) {
  const dots = t.dots.concat(t.dots).slice(0, 8).map((c, k) => {
    const a = (k / 8) * Math.PI * 2, r = 22;
    return `<i style="left:${33 + r * Math.cos(a)}px;top:${33 + r * Math.sin(a)}px;background:${gemDot(c)}"></i>`;
  }).join('') + `<i style="left:33px;top:33px;width:16px;height:16px;margin:-8px 0 0 -8px;background:${gemDot(t.dots[0])}"></i>`;
  const on = S.settings.theme === t.id;
  return `<button class="theme-tile" data-theme="${t.id}" aria-pressed="${on}">
    <span class="tp" style="background:${t.css['--stage-bg']}">
      <span class="plate" style="background:radial-gradient(circle at 50% 35%, ${t.canvas.plateIn}, ${t.canvas.plateOut});box-shadow:0 4px 14px ${t.canvas.plateShadow}, inset 0 0 0 1.5px ${t.canvas.rim}">${dots}</span>
      <span class="ui" style="background:${t.css['--surface']};box-shadow:inset 22px 0 0 ${t.css['--gold']}"></span>
    </span>
    <b>${t.name}${on ? ICON.check : ''}</b></button>`;
}
function openThemes() {
  const render = () => `
    <h3 id="modal-title">Choose a theme</h3>
    <p>Themes change the menus and the board your gems sit on. Gem colours stay true to their numbers.</p>
    <div class="themes">${THEMES.map(themeTile).join('')}</div>
    <div class="actions"><button class="btn primary" data-a="done">Done</button></div>`;
  openModal(render(), { done: closeModal });
  const sheet = document.querySelector('#modal .sheet');
  sheet.classList.add('wide');
  sheet.onclick = (e) => {
    const b = e.target.closest('.theme-tile'); if (!b) return;
    S.settings.theme = b.dataset.theme; saveSettings();
    applyTheme(b.dataset.theme);
    sfx.select();
    sheet.querySelector('.themes').innerHTML = THEMES.map(themeTile).join('');
    sheet.querySelector(`.theme-tile[data-theme="${b.dataset.theme}"]`).focus();
  };
}
$('#btn-theme').onclick = openThemes;
$('#m-theme').onclick = () => { closeMenu(); openThemes(); };

// ---------------------------------------------------------------- tools / keys
function setMode(m) {
  board.mode = m;
  $('#t-paint').setAttribute('aria-pressed', String(m === 'paint'));
  $('#t-pan').setAttribute('aria-pressed', String(m === 'pan'));
}
$('#btn-back').innerHTML = ICON.back; $('#btn-menu').innerHTML = ICON.menu;
$('#t-paint').innerHTML = ICON.paint; $('#t-pan').innerHTML = ICON.pan;
$('#t-zin').innerHTML = ICON.zin; $('#t-zout').innerHTML = ICON.zout; $('#t-fit').innerHTML = ICON.fit; $('#t-hint').innerHTML = ICON.find; $('#t-undo').innerHTML = ICON.undo;
$('#t-undo').onclick = undo;
$('#btn-back').onclick = leave;
$('#t-paint').onclick = () => setMode('paint');
$('#t-pan').onclick = () => setMode('pan');
$('#t-zin').onclick = () => board.zoomBy(1.6);
$('#t-zout').onclick = () => board.zoomBy(1 / 1.6);
$('#t-fit').onclick = () => board.fit(true);
$('#t-hint').onclick = () => { if (S.cur && !board.showHint()) toast('Every gem of this number is placed'); };

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!$('#coach').hidden) $('#coach-ok').click(); else if (!$('#modal').hidden) closeModal(); else closeMenu(); return; }
  if (!S.cur || !$('#modal').hidden || !$('#coach').hidden || e.target.closest('input, #menu')) return;
  if (e.code === 'Space' && (e.target === document.body || e.target.id === 'cv')) { board.space = true; e.preventDefault(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { undo(); e.preventDefault(); return; }
  if (e.key === '+' || e.key === '=') board.zoomBy(1.4);
  else if (e.key === '-') board.zoomBy(1 / 1.4);
  else if (e.key === '0') board.fit(true);
  else if (e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'f') $('#t-hint').click();
  else if (e.key === ']' || e.key === '[' || (e.target.closest('.palette') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft'))) {
    const n = S.cur.art.palette.length, d = e.key === ']' || e.key === 'ArrowRight' ? 1 : -1;
    selectPal((S.cur.sel + d + n) % n, true);
    if (e.target.closest('.palette')) palEls[S.cur.sel].focus();
    e.preventDefault();
  } else if (/^[1-9]$/.test(e.key) && +e.key <= S.cur.art.palette.length) selectPal(+e.key - 1, true);
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') board.space = false; });
window.addEventListener('blur', () => { board.space = false; });
['pointerdown', 'touchend'].forEach((t) => document.addEventListener(t, () => sfx.unlock(), { capture: true, passive: true }));
['gesturestart', 'gesturechange'].forEach((t) => document.addEventListener(t, (e) => e.preventDefault()));
document.addEventListener('dblclick', (e) => { if (e.target.closest('#play')) e.preventDefault(); });
sysReduced.addEventListener && sysReduced.addEventListener('change', applyMotion);

// ---------------------------------------------------------------- boot
(async function boot() {
  try {
    const st = await store.get('settings');
    if (st && typeof st === 'object') for (const k of ['sound', 'autoAdvance', 'reduced', 'vibe', 'coached', 'hideDone']) if (typeof st[k] === 'boolean') S.settings[k] = st[k];
    if (Number.isInteger(st.streak)) S.settings.streak = st.streak;
    if (typeof st.lastDay === 'string') S.settings.lastDay = st.lastDay;
    if (st && typeof st.theme === 'string') S.settings.theme = themeById(st.theme).id;
    const fv = await store.get('favorites');
    if (Array.isArray(fv)) S.favorites = new Set(fv.filter((x) => typeof x === 'string'));
    await Promise.all(CATALOG.map(async (m) => {
      const rec = await store.get(store.progressKey(m.id));
      if (!rec || !Array.isArray(rec.filled)) return;
      const total = metaOf(m).n;
      const count = rec.filled.filter((i) => Number.isInteger(i) && i >= 0 && i < total).length;
      S.summary[m.id] = { count, total, completed: !!rec.completed && count === total, updated: rec.updated || 0, time: +rec.time || 0 };
    }));
  } catch (err) { console.warn('Lustra: could not read saved data', err); }
  sfx.setSound(S.settings.sound);
  applyMotion();
  applyTheme(S.settings.theme, false);
  renderGallery();
  requestAnimationFrame(() => setTimeout(() => $('#splash').classList.add('out'), 250));
})();

// test hook
window.__lustra = { S, board, getArtwork, CATALOG };
