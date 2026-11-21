// Validate artworks: node tools/check.mjs [collection3|collection4|...|all]
// Prints gem counts, palette sizes, overlap count and build time; flags problems.
globalThis.document = {};
const root = new URL('../js/', import.meta.url);
const A = await import(new URL('artworks.js', root));
const mods = {};
for (const c of ['collection2', 'collection3', 'collection4', 'collection5']) mods[c] = await import(new URL(c + '.js', root));
const which = process.argv[2] || 'all';
const RANGE = { Beginner: [80, 260], Medium: [200, 650], Intricate: [450, 1100], Expert: [900, 1900], Master: [1900, 3800] };
const ids = new Map();
for (const m of A.CATALOG) ids.set(m.id, (ids.get(m.id) || 0) + 1);
const dup = [...ids].filter(([, n]) => n > 1).map(([id]) => id);
if (dup.length) console.log('DUPLICATE IDS:', dup.join(', '));
const names = new Map(); for (const m of A.CATALOG) names.set(m.name, (names.get(m.name) || 0) + 1);
const dupN = [...names].filter(([, n]) => n > 1).map(([n]) => n);
if (dupN.length) console.log('DUPLICATE NAMES:', dupN.join(', '));
const list = which === 'all' ? A.CATALOG : mods[which].ENTRIES;
let problems = 0;
for (const c of list) {
  const t0 = performance.now(); const a = A.getArtwork(c.id); const dt = performance.now() - t0;
  const S = a.sockets; let ov = 0;
  const g = new Map(); S.forEach((s, i) => { const k = Math.floor(s.x / 30) + ',' + Math.floor(s.y / 30); (g.get(k) || g.set(k, []).get(k)).push(i); });
  S.forEach((s, i) => { const gx = Math.floor(s.x / 30), gy = Math.floor(s.y / 30); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of g.get((gx + dx) + ',' + (gy + dy)) || []) if (j > i) { const o = S[j]; if (Math.hypot(s.x - o.x, s.y - o.y) < 0.35 * (Math.min(s.w, s.h) + Math.min(o.w, o.h))) ov++; } });
  const bad = [];
  const [lo, hi] = RANGE[c.difficulty] || [0, 1e9];
  if (S.length < lo || S.length > hi) bad.push(`count outside ${lo}-${hi}`);
  if (ov) bad.push(`${ov} overlaps`);
  if (a.palette.length < 4 || a.palette.length > 9) bad.push(`palette ${a.palette.length}`);
  if (dt > 400) bad.push(`slow ${dt.toFixed(0)}ms`);
  if (a.minDim < 7.5) bad.push(`tiny gems ${a.minDim.toFixed(1)}`);
  if (!['mandala', 'geometric'].includes(c.category)) bad.push('bad category');
  if (bad.length) problems++;
  console.log(`${bad.length ? 'XX' : 'ok'} ${c.difficulty.padEnd(9)} ${c.id.padEnd(26)} ${String(S.length).padStart(5)} gems  pal ${a.palette.length}  ${dt.toFixed(0).padStart(4)}ms  ${bad.join('; ')}`);
}
const tiers = {}; for (const c of list) tiers[c.difficulty] = (tiers[c.difficulty] || 0) + 1;
console.log('entries:', list.length, JSON.stringify(tiers), 'catalog total:', A.CATALOG.length, problems ? `PROBLEMS: ${problems}` : 'all ok');
