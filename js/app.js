import { CATALOG, getArtwork, sessionLabel } from './artworks.js';
import { Board, renderThumb, exportPNG, tonesFor } from './board.js';
import { paintGem } from './gems.js';
import * as store from './store.js';
import * as sfx from './audio.js';

const $ = (s) => document.querySelector(s);
const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  pan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5.5a1.5 1.5 0 013 0V11m0-1V4.5a1.5 1.5 0 013 0V11m0-5.5a1.5 1.5 0 013 0V11m0-3.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1.5a6 6 0 01-4.6-2.2L4.6 15a1.6 1.6 0 012.4-2.1L8 14"/></svg>',
  paint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l7 6-7 12L5 9z"/><path d="M5 9h14M9 9l3-6 3 6-3 12z"/></svg>',
  zin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M11 8v6M8 11h6M16 16l4 4"/></svg>',
  zout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M8 11h6M16 16l4 4"/></svg>',
  fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  hint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.3 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.9 3.6 4.5 7.3-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>',
  heartO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.3 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.9 3.6 4.5 7.3-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};

// ---------------------------------------------------------------- state
const S = {
  settings: { sound: true, autoAdvance: true, reduced: null },
  favorites: new Set(),
  summary: {}, // artId -> {count,total,completed,updated}
  filters: { cat: 'all', diff: 'all', status: 'all' },
  cur: null, // {art, filled, sel, remaining, camera, completed}
};
const thumbs = new Map();
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
    filled: ids, camera: c.camera, sel: c.sel, updated: Date.now(), completed: c.completed,
  };
  S.summary[c.art.id] = { count: ids.length, total: c.art.sockets.length, completed: c.completed, updated: rec.updated };
  return store.set(store.progressKey(c.art.id), rec);
}
const saveSettings = () => store.set('settings', { schema: store.SCHEMA, ...S.settings });
const saveFavs = () => store.set('favorites', [...S.favorites]);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
window.addEventListener('pagehide', flushSave);

// ---------------------------------------------------------------- gallery
function thumbFor(id) {
  if (!thumbs.has(id)) thumbs.set(id, renderThumb(getArtwork(id), 300));
  return thumbs.get(id);
}
function copyCanvas(src, cls) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  if (cls) c.className = cls;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}
function statusOf(id) {
  const s = S.summary[id];
  if (!s || !s.count) return s && s.completed ? 'done' : 'new';
  return s.completed ? 'done' : 'progress';
}

function renderGallery() {
  const grid = $('#grid'); grid.innerHTML = '';
  const f = S.filters;
  const list = CATALOG.filter((m) =>
    (f.cat === 'all' || m.category === f.cat) && (f.diff === 'all' || m.difficulty === f.diff) &&
    (f.status === 'all' || (f.status === 'fav' ? S.favorites.has(m.id) : statusOf(m.id) === f.status)));
  $('#empty').hidden = list.length > 0;
  const pending = [];
  for (const m of list) {
    const art = getArtwork(m.id), sum = S.summary[m.id], st = statusOf(m.id);
    const n = art.sockets.length;
    const pct = sum ? Math.floor((sum.count / n) * 100) : 0;
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <button class="open" aria-label="${m.name}, ${m.difficulty}, ${n} gems${st === 'done' ? ', completed' : st === 'progress' ? `, ${pct}% complete` : ''}">
        <div class="thumb"></div>
        <div class="info">
          <h3 class="name">${m.name}</h3>
          <div class="meta"><span>${m.difficulty}</span><span class="dot">·</span><span>${n} gems</span></div>
          <div class="state">${st === 'done' ? `<span class="badge done">${ICON.check.replace('<svg', '<svg width="11" height="11"')} Completed</span>`
            : st === 'progress' ? `<div class="bar"><i style="width:${pct}%"></i></div><span>${pct}%</span>`
            : `<span>${sessionLabel(n)}</span>`}</div>
        </div>
      </button>
      <button class="fav" aria-pressed="${S.favorites.has(m.id)}" aria-label="Favorite ${m.name}">${S.favorites.has(m.id) ? ICON.heart : ICON.heartO}</button>`;
    card.querySelector('.open').onclick = () => openArt(m.id);
    const fav = card.querySelector('.fav');
    fav.onclick = () => {
      if (S.favorites.has(m.id)) S.favorites.delete(m.id); else S.favorites.add(m.id);
      saveFavs();
      fav.setAttribute('aria-pressed', S.favorites.has(m.id));
      fav.innerHTML = S.favorites.has(m.id) ? ICON.heart : ICON.heartO;
      if (S.filters.status === 'fav') renderGallery();
    };
    grid.appendChild(card);
    pending.push([card.querySelector('.thumb'), m.id]);
  }
  // render thumbnails progressively so the gallery appears instantly
  const step = () => {
    const job = pending.shift(); if (!job) return;
    job[0].appendChild(copyCanvas(thumbFor(job[1])));
    setTimeout(step, 0);
  };
  step();
  renderContinue();
}

function renderContinue() {
  const box = $('#continue');
  const recent = Object.entries(S.summary).filter(([, s]) => s.count && !s.completed).sort((a, b) => b[1].updated - a[1].updated)[0];
  if (!recent) { box.hidden = true; return; }
  const [id, s] = recent, m = CATALOG.find((c) => c.id === id);
  if (!m) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'continue';
  btn.setAttribute('aria-label', `Continue ${m.name}`);
  btn.appendChild(copyCanvas(thumbFor(id)));
  const pct = Math.floor((s.count / s.total) * 100);
  btn.insertAdjacentHTML('beforeend', `<div><div class="eyebrow">Continue</div><div class="ct">${m.name}</div><div class="cm">${pct}% complete · ${s.total - s.count} gems left</div></div><span class="go">Resume</span>`);
  btn.onclick = () => openArt(id);
  box.appendChild(btn);
}

document.querySelectorAll('.chips').forEach((g) => {
  g.addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    g.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === b));
    S.filters[g.dataset.group] = b.dataset.v;
    renderGallery();
  });
});

// ---------------------------------------------------------------- play
const board = new Board($('#cv'), {
  onPlace(i) {
    const c = S.cur, g = c.art.sockets[i];
    c.remaining[g.p]--;
    c.placed++;
    c.dirty = true; scheduleSave();
    sfx.place(c.placed);
    updatePalItem(g.p); updateProgress();
    if (c.remaining[g.p] === 0) paletteComplete(g.p);
  },
  onWrong(p) {
    sfx.wrong();
    toast(`That socket takes gem ${p + 1}`);
    const el = palEls[p]; if (el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
  },
  onTooSmall() { toast('Zoom in for detail'); },
  onUndoStroke(ids) {
    const c = S.cur;
    for (const i of ids) if (c.filled[i]) { c.filled[i] = 0; c.remaining[c.art.sockets[i].p]++; c.placed--; board.anims.delete(i); }
    c.dirty = true; scheduleSave();
    refreshPalette(); updateProgress(); board.render();
  },
  onCamera(cam) { if (S.cur) { S.cur.camera = cam; S.cur.dirty = true; scheduleSave(); } },
});

let palEls = [];
function buildPalette() {
  const c = S.cur, box = $('#palette');
  box.innerHTML = ''; palEls = [];
  c.art.palette.forEach((entry, p) => {
    const b = document.createElement('button');
    b.className = 'pal'; b.setAttribute('role', 'radio');
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, devicePixelRatio || 1), sz = 44;
    cv.width = cv.height = sz * dpr;
    const x = cv.getContext('2d');
    x.scale(dpr, dpr); x.translate(sz / 2, sz / 2 - 1);
    paintGem(x, 'round', 34, 34, 0, tonesFor(entry), p % 3);
    b.appendChild(cv);
    b.insertAdjacentHTML('beforeend', `<span class="num">${p + 1}</span><span class="left"></span><span class="check">${ICON.check}</span>`);
    b.onclick = () => selectPal(p, true);
    box.appendChild(b); palEls.push(b);
  });
  refreshPalette();
}
function updatePalItem(p) {
  const c = S.cur, el = palEls[p]; if (!el) return;
  const left = c.remaining[p];
  el.classList.toggle('done', left === 0);
  el.querySelector('.left').textContent = left === 0 ? 'Done' : `${left} left`;
  el.setAttribute('aria-label', `Gem ${p + 1}, ${c.art.palette[p].name}, ${left === 0 ? 'complete' : left + ' remaining'}`);
  el.setAttribute('aria-checked', String(p === c.sel));
  el.tabIndex = p === c.sel ? 0 : -1;
}
function refreshPalette() { S.cur.art.palette.forEach((_, p) => updatePalItem(p)); }
function selectPal(p, user) {
  const c = S.cur; if (!c) return;
  if (user) sfx.select();
  c.sel = p; board.setSelected(p); refreshPalette();
  palEls[p].scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  c.dirty = true; scheduleSave();
}
function paletteComplete(p) {
  const c = S.cur;
  const el = palEls[p];
  if (el) { el.classList.remove('cheer'); void el.offsetWidth; el.classList.add('cheer'); }
  if (c.placed === c.art.sockets.length) { finish(); return; }
  sfx.paletteDone();
  toast(`${c.art.palette[p].name} complete`);
  if (S.settings.autoAdvance) {
    const n = c.art.palette.length;
    for (let k = 1; k < n; k++) { const q = (p + k) % n; if (c.remaining[q] > 0) { setTimeout(() => S.cur === c && c.sel === p && selectPal(q), 350); break; } }
  }
}
function updateProgress() {
  const c = S.cur, total = c.art.sockets.length;
  const pct = (c.placed / total) * 100;
  $('#prog-fill').style.width = pct + '%';
  $('#prog-txt').textContent = `${Math.floor(pct)}%`;
  $('#prog-txt').setAttribute('aria-label', `${c.placed} of ${total} gems placed`);
}

async function openArt(id) {
  sfx.unlock();
  const art = getArtwork(id);
  const rec = store.sanitizeProgress(await store.get(store.progressKey(id)), art);
  const filled = rec ? rec.filled : new Uint8Array(art.sockets.length);
  const remaining = art.palette.map(() => 0);
  let placed = 0;
  art.sockets.forEach((s, i) => { if (filled[i]) placed++; else remaining[s.p]++; });
  let sel = rec ? Math.min(rec.sel, art.palette.length - 1) : 0;
  if (remaining[sel] === 0) { const q = remaining.findIndex((r) => r > 0); if (q >= 0) sel = q; }
  S.cur = { art, filled, remaining, placed, sel, camera: rec && rec.camera, completed: placed === art.sockets.length, dirty: false };
  $('#art-name').textContent = art.name;
  document.title = `${art.name} — Lustra`;
  show('play');
  board.reduced = reducedMotion();
  setMode('paint');
  board.load(art, filled, sel, rec && rec.camera);
  buildPalette(); updateProgress();
  palEls[sel] && palEls[sel].scrollIntoView({ inline: 'center', block: 'nearest' });
  if (S.cur.completed) setTimeout(() => completionPanel(true), 300);
}

function leave() {
  flushSave();
  closeMenu(); closeModal();
  board.unload();
  S.cur = null;
  document.title = 'Lustra — Gem Mosaics';
  show('gallery');
  renderGallery();
}
function show(which) {
  $('#gallery').hidden = which !== 'gallery';
  $('#play').hidden = which !== 'play';
}

function finish() {
  const c = S.cur;
  c.completed = true; c.dirty = true; flushSave();
  thumbs.delete(c.art.id + ':p');
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
    <div class="eyebrow">${revisit ? 'Completed piece' : 'Artwork complete'}</div>
    <h3 id="modal-title">${c.art.name}</h3>
    <p>${c.art.sockets.length} gems placed. ${revisit ? 'It lives in your completed collection.' : 'Added to your completed collection.'}</p>
    <div class="actions">
      <button class="btn" data-a="admire">Admire</button>
      <button class="btn" data-a="export">Save PNG</button>
      <button class="btn" data-a="gallery">Gallery</button>
      ${next ? `<button class="btn primary" data-a="next">Next: ${next.name}</button>` : ''}
    </div>`, {
    admire: closeModal, export: doExport, gallery: leave,
    next: () => { closeModal(); leave(); openArt(next.id); },
  }, true);
}

function doExport() {
  const c = S.cur; if (!c) return;
  const cv = exportPNG(c.art, c.filled, 2400);
  cv.toBlob((blob) => {
    if (!blob) { toast('Could not create image'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lustra-${c.art.id}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Image saved');
  }, 'image/png');
}

// ---------------------------------------------------------------- modal / menu / toast
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
function closeModal() { $('#modal').hidden = true; modalActions = null; modalReturn && modalReturn.focus && modalReturn.focus(); }
$('#modal').addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]');
  if (b && modalActions && modalActions[b.dataset.a]) modalActions[b.dataset.a]();
  else if (e.target === $('#modal')) closeModal();
});

let toastT;
function toast(msg) {
  const t = $('#toast');
  if (t.textContent === msg && t.classList.contains('show')) { clearTimeout(toastT); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1600);
}

function openMenu() {
  $('#menu').hidden = false; $('#btn-menu').setAttribute('aria-expanded', 'true');
  $('#opt-sound').checked = S.settings.sound;
  $('#opt-auto').checked = S.settings.autoAdvance;
  $('#opt-motion').checked = reducedMotion();
  $('#opt-sound').focus();
}
function closeMenu() { if ($('#menu').hidden) return; $('#menu').hidden = true; $('#btn-menu').setAttribute('aria-expanded', 'false'); }
$('#btn-menu').onclick = (e) => { e.stopPropagation(); $('#menu').hidden ? openMenu() : closeMenu(); };
document.addEventListener('pointerdown', (e) => { if (!$('#menu').hidden && !e.target.closest('#menu') && !e.target.closest('#btn-menu')) closeMenu(); });
$('#opt-sound').onchange = (e) => { S.settings.sound = e.target.checked; sfx.setSound(S.settings.sound); saveSettings(); };
$('#opt-auto').onchange = (e) => { S.settings.autoAdvance = e.target.checked; saveSettings(); };
$('#opt-motion').onchange = (e) => { S.settings.reduced = e.target.checked; applyMotion(); saveSettings(); };
$('#m-export').onclick = () => { closeMenu(); doExport(); };
$('#m-restart').onclick = () => {
  closeMenu();
  const c = S.cur;
  openModal(`<h3 id="modal-title">Restart ${c.art.name}?</h3><p>All ${c.placed} placed gems on this artwork will be removed. Your other artworks are not affected.</p>
    <div class="actions"><button class="btn" data-a="no">Keep my progress</button><button class="btn danger" data-a="yes">Restart</button></div>`, {
    no: closeModal,
    yes: () => {
      closeModal();
      c.filled.fill(0); c.placed = 0; c.completed = false;
      c.remaining = c.art.palette.map(() => 0); c.art.sockets.forEach((s) => c.remaining[s.p]++);
      c.sel = 0; c.camera = null; c.dirty = true; flushSave();
      board.load(c.art, c.filled, 0, null);
      refreshPalette(); updateProgress();
      toast('Artwork restarted');
    },
  });
};
function applyMotion() { board.reduced = reducedMotion(); document.documentElement.classList.toggle('reduced', reducedMotion()); }

// ---------------------------------------------------------------- tools / keys
function setMode(m) {
  board.mode = m;
  const b = $('#t-mode');
  b.innerHTML = m === 'pan' ? ICON.pan : ICON.paint;
  b.setAttribute('aria-pressed', String(m === 'pan'));
  b.setAttribute('aria-label', m === 'pan' ? 'Pan mode on — tap to switch to placing gems' : 'Place mode — tap to switch to pan');
  b.title = m === 'pan' ? 'Pan (drag moves the canvas)' : 'Place gems (switch to pan)';
}
$('#btn-back').innerHTML = ICON.back; $('#btn-menu').innerHTML = ICON.menu;
$('#t-zin').innerHTML = ICON.zin; $('#t-zout').innerHTML = ICON.zout; $('#t-fit').innerHTML = ICON.fit; $('#t-hint').innerHTML = ICON.hint;
['t-zin', 't-zout', 't-fit', 't-hint'].forEach((id) => { $('#' + id).title = $('#' + id).getAttribute('aria-label'); });
$('#btn-back').onclick = leave;
$('#t-mode').onclick = () => setMode(board.mode === 'pan' ? 'paint' : 'pan');
$('#t-zin').onclick = () => board.zoomBy(1.5);
$('#t-zout').onclick = () => board.zoomBy(1 / 1.5);
$('#t-fit').onclick = () => board.fit(true);
$('#t-hint').onclick = () => { if (S.cur && !board.showHint()) toast('All gems of this number are placed'); };

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else closeMenu(); return; }
  if (!S.cur || !$('#modal').hidden || e.target.closest('input, #menu')) return;
  if (e.code === 'Space' && !e.repeat && e.target === document.body || e.code === 'Space' && e.target.id === 'cv') { board.space = true; e.preventDefault(); return; }
  if (e.key === '+' || e.key === '=') board.zoomBy(1.4);
  else if (e.key === '-') board.zoomBy(1 / 1.4);
  else if (e.key === '0') board.fit(true);
  else if (e.key.toLowerCase() === 'h') $('#t-hint').click();
  else if (e.key === ']' || e.key === '[' || (e.target.closest('.palette') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft'))) {
    const n = S.cur.art.palette.length, d = e.key === ']' || e.key === 'ArrowRight' ? 1 : -1;
    selectPal((S.cur.sel + d + n) % n, true);
    if (e.target.closest('.palette')) palEls[S.cur.sel].focus();
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') board.space = false; });
window.addEventListener('blur', () => { board.space = false; });
document.addEventListener('pointerdown', () => sfx.unlock(), { capture: true });
sysReduced.addEventListener && sysReduced.addEventListener('change', applyMotion);

// ---------------------------------------------------------------- boot
(async function boot() {
  try {
    const st = await store.get('settings');
    if (st && typeof st === 'object') {
      if (typeof st.sound === 'boolean') S.settings.sound = st.sound;
      if (typeof st.autoAdvance === 'boolean') S.settings.autoAdvance = st.autoAdvance;
      if (typeof st.reduced === 'boolean') S.settings.reduced = st.reduced;
    }
    const fv = await store.get('favorites');
    if (Array.isArray(fv)) S.favorites = new Set(fv.filter((x) => typeof x === 'string'));
    await Promise.all(CATALOG.map(async (m) => {
      const rec = await store.get(store.progressKey(m.id));
      if (!rec) return;
      const art = getArtwork(m.id), p = store.sanitizeProgress(rec, art);
      if (!p) return;
      const count = p.filled.reduce((a, b) => a + b, 0);
      S.summary[m.id] = { count, total: art.sockets.length, completed: p.completed && count === art.sockets.length, updated: p.updated };
    }));
  } catch (err) { console.warn('Lustra: could not read saved data', err); }
  sfx.setSound(S.settings.sound);
  applyMotion();
  renderGallery();
})();

// test hook
window.__lustra = { S, board, getArtwork, CATALOG };
