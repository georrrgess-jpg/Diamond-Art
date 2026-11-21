// Collection 8: expert and master curves, spirals, packings and fractals
// Authored artworks registered into the shared catalog. Deterministic only.
import { Builder, ring, fillRings, fold, inDisc, polar, GEMS, CATALOG, LEVEL, SQ3, square } from './artworks.js';
import { rng, alongCurve, alongPoly, hexPack, orbitPack, pascalMod, hexPlate } from './collection2.js';

const TAU = Math.PI * 2;

export const ENTRIES = [
];

CATALOG.push(...ENTRIES);
CATALOG.sort((a, c) => LEVEL[a.difficulty] - LEVEL[c.difficulty]);
