# Lustra — Gem Mosaics

A calm gem-by-number game for the browser. Choose a geometric mandala, pick a numbered gemstone, and place faceted gems into matching sockets until the pale pattern turns into a finished mosaic.

## Run

There's no build step and there are no dependencies. Serve the folder over HTTP (ES modules don't load from `file://`):

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Controls

| | Desktop | Touch |
|---|---|---|
| Place a gem | Click | Tap |
| Place several | Click and drag | Drag with one finger |
| Zoom | Mouse wheel / trackpad pinch, `+` `-`, toolbar | Pinch, toolbar |
| Pan | Space + drag, middle or right drag, Pan tool | Two fingers, Pan tool |
| Fit | `0`, toolbar | Toolbar |
| Hint | `H`, toolbar | Toolbar |
| Change gem | `[` `]`, arrow keys in the palette | Tap the palette |

## Architecture (`js/`)

- `gems.js`: gem and socket rendering. There are 7 shapes (round, oval, teardrop, marquise, square, rhombus, hexagon). Round, oval, teardrop, marquise and rhombus use a brilliant-cut facet layout; square and hexagon use a step cut. Lighting is computed in world space, so every gem shares one light direction. An LRU sprite cache keys each sprite by shape, aspect, size bucket, rotation bucket, colour and variant, and is capped by total pixel count.
- `artworks.js`: deterministic generators (`ring`, `fillRings` with symmetric row counts, hex lattice, a collision grid built from circle approximations) and the catalog of 6 artworks. Socket id = generation index; each artwork has a `version`.
- `board.js`: camera, culling, rendering, hit testing (spatial grid plus a point-in-polygon test on the shape outline), pointer and gesture state machine, placement animations, sparkles, hint, completion shimmer, thumbnail and PNG export.
- `app.js`: gallery (filters, favorites, continue card), palette, progress, settings, completion panel, autosave.
- `store.js`: IndexedDB key-value store (falls back to localStorage). Progress records are versioned and validated on load.
- `audio.js`: quiet synthesized WebAudio sounds, started on the first user gesture.

## Deferred / not yet built

- Free Color mode (recolouring, undo, separate progress). `store.progressKey(id, mode)` already supports a separate mode key.
- More artworks: there are 6 now; the target collection is 24.
- No nonvisual (screen reader) way to play on the canvas. Menus and controls are keyboard and screen-reader labelled.
