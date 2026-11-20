// Visual themes. Each theme sets the interface tokens (CSS custom properties)
// and the board's canvas colours (plate, sockets, labels). Backdrops are CSS
// gradients behind a transparent canvas, so they cost nothing per frame.

const light = (o) => ({
  '--shadow-1': '0 1px 2px rgba(70,50,20,.06), 0 4px 14px rgba(70,50,20,.08)',
  '--shadow-2': '0 2px 6px rgba(70,50,20,.08), 0 18px 40px rgba(70,50,20,.16)',
  '--toast-bg': 'rgba(30,24,18,.92)', '--toast-ink': '#fff', '--ok-soft': '#e4f1e7', '--danger': '#b23b3b',
  ...o,
});
const dark = (o) => ({
  '--shadow-1': '0 1px 2px rgba(0,0,0,.3), 0 6px 18px rgba(0,0,0,.28)',
  '--shadow-2': '0 4px 10px rgba(0,0,0,.35), 0 22px 48px rgba(0,0,0,.45)',
  '--toast-bg': 'rgba(245,245,255,.95)', '--toast-ink': '#14121c', '--ok-soft': 'rgba(95,211,154,.15)', '--danger': '#ff6b6b',
  ...o,
});

export const THEMES = [
  {
    id: 'ivory', name: 'Ivory Atelier', dark: false, dots: ['#1d4fb8', '#c0122f', '#0d8a55', '#dc8418', '#7d3fc0'],
    css: light({
      '--bg': '#f5f0e6', '--bg-2': '#efe8db', '--surface': '#fffdf9', '--surface-2': 'rgba(255,253,249,.94)',
      '--ink': '#2a241c', '--ink-2': '#6b6152', '--ink-3': '#9c907d', '--line': '#e5dccb', '--line-2': '#d8ccb6',
      '--gold': '#b8893b', '--gold-2': '#e3c27c', '--gold-ink': '#7d5a1f', '--gold-soft': '#f3e7cf', '--ok': '#2f7a4b',
      '--hover': 'rgba(60,40,10,.05)', '--track': '#ece3d3', '--header-bg': 'rgba(250,246,238,.94)',
      '--gallery-bg': 'radial-gradient(1200px 500px at 85% -10%, #fbf1dc 0%, transparent 60%), radial-gradient(900px 400px at -10% 10%, #efe7da 0%, transparent 60%), #f5f0e6',
      '--stage-bg': 'radial-gradient(circle at 50% 40%, #faf6ee, #efe8dc 85%)',
      '--chip-on': '#2a241c', '--chip-on-ink': '#fff', '--sel-bg': '#fff', '--scrim': 'rgba(42,36,28,.28)',
      '--thumb-bg': 'radial-gradient(circle at 50% 45%, #fffdf8, #f5efe3)',
    }),
    canvas: { plateIn: '#fffdf9', plateOut: '#f7f1e5', rim: '#e6dccb', plateShadow: 'rgba(90,70,40,0.2)', socket: '#efe8dc', socketShade: 'rgba(120,96,62,0.42)', socketEdge: 'rgba(160,138,104,0.55)', label: '#8a7e6c', labelDim: 'rgba(130,116,96,0.7)', exportBg: '#f8f4ec', hint: '196,150,60' },
  },
  {
    id: 'midnight', name: 'Midnight Velvet', dark: true, dots: ['#e2b25a', '#8fc6f2', '#ec5f8c', '#37bfc8', '#c3a3ec'],
    css: dark({
      '--bg': '#0d1229', '--bg-2': '#161d3d', '--surface': '#1a2246', '--surface-2': 'rgba(24,31,66,.94)',
      '--ink': '#eef0ff', '--ink-2': '#aab2d8', '--ink-3': '#7680ad', '--line': '#2a3463', '--line-2': '#39457d',
      '--gold': '#e2b25a', '--gold-2': '#f6d892', '--gold-ink': '#f1cd84', '--gold-soft': 'rgba(226,178,90,.16)', '--ok': '#5fd39a',
      '--hover': 'rgba(255,255,255,.06)', '--track': '#2a3361', '--header-bg': 'rgba(13,18,41,.92)',
      '--gallery-bg': 'radial-gradient(1000px 500px at 80% -10%, #2c3274 0%, transparent 60%), radial-gradient(800px 500px at 0% 20%, #1b2b5e 0%, transparent 60%), #0d1229',
      '--stage-bg': 'radial-gradient(circle at 50% 35%, #1f285a, #0a0f24 75%)',
      '--chip-on': '#e2b25a', '--chip-on-ink': '#1a1406', '--sel-bg': '#252e5e', '--scrim': 'rgba(5,8,20,.6)',
      '--thumb-bg': 'radial-gradient(circle at 50% 45%, #1f2852, #131938)',
    }),
    canvas: { plateIn: '#202a58', plateOut: '#131a3b', rim: '#3a467f', plateShadow: 'rgba(0,0,0,0.5)', socket: '#29336a', socketShade: 'rgba(0,0,0,0.6)', socketEdge: 'rgba(160,175,255,0.24)', label: '#b3bcec', labelDim: 'rgba(170,180,230,0.55)', exportBg: '#0d1229', hint: '242,200,110' },
  },
  {
    id: 'aurora', name: 'Aurora', dark: true, dots: ['#5ef0c8', '#b7a4ff', '#37bfc8', '#5fa8ee', '#9fe0c0'],
    css: dark({
      '--bg': '#071d24', '--bg-2': '#0d2a33', '--surface': '#0f2e37', '--surface-2': 'rgba(12,40,48,.94)',
      '--ink': '#e9fffb', '--ink-2': '#9fd2cb', '--ink-3': '#6aa39b', '--line': '#1c4651', '--line-2': '#26606d',
      '--gold': '#5ef0c8', '--gold-2': '#b7a4ff', '--gold-ink': '#7ff5d6', '--gold-soft': 'rgba(94,240,200,.14)', '--ok': '#5ef0c8',
      '--hover': 'rgba(255,255,255,.06)', '--track': '#1c434d', '--header-bg': 'rgba(7,29,36,.9)',
      '--gallery-bg': 'radial-gradient(900px 420px at 15% -5%, rgba(64,224,170,.38), transparent 60%), radial-gradient(900px 500px at 95% 10%, rgba(150,90,255,.38), transparent 60%), radial-gradient(800px 500px at 50% 115%, rgba(40,140,255,.28), transparent 60%), #071d24',
      '--stage-bg': 'radial-gradient(700px 420px at 8% 0%, rgba(64,224,170,.3), transparent 60%), radial-gradient(700px 520px at 100% 100%, rgba(150,90,255,.32), transparent 60%), #08202a',
      '--chip-on': '#5ef0c8', '--chip-on-ink': '#052019', '--sel-bg': '#143c46', '--scrim': 'rgba(0,10,14,.6)',
      '--thumb-bg': 'radial-gradient(circle at 50% 45%, #133640, #0a242c)',
    }),
    canvas: { plateIn: '#153a44', plateOut: '#0b242c', rim: '#2b6c78', plateShadow: 'rgba(30,200,170,0.22)', socket: '#1c4853', socketShade: 'rgba(0,0,0,0.55)', socketEdge: 'rgba(140,255,225,0.24)', label: '#a4ecdf', labelDim: 'rgba(150,230,215,0.5)', exportBg: '#071d24', hint: '94,240,200' },
  },
  {
    id: 'neon', name: 'Neon Synth', dark: true, dots: ['#ff3ea5', '#22e1ff', '#b26bff', '#ffd23e', '#3dfcb0'],
    css: dark({
      '--bg': '#10051d', '--bg-2': '#1b0a2e', '--surface': '#1f0e35', '--surface-2': 'rgba(30,11,50,.94)',
      '--ink': '#fdf0ff', '--ink-2': '#cba9e8', '--ink-3': '#9473b5', '--line': '#3a1c5c', '--line-2': '#542b82',
      '--gold': '#ff3ea5', '--gold-2': '#22e1ff', '--gold-ink': '#ff86c9', '--gold-soft': 'rgba(255,62,165,.16)', '--ok': '#3dfcb0',
      '--hover': 'rgba(255,255,255,.07)', '--track': '#35195a', '--header-bg': 'rgba(16,5,29,.9)',
      '--gallery-bg': 'radial-gradient(800px 420px at 92% -5%, rgba(255,62,165,.5), transparent 60%), radial-gradient(900px 520px at -10% 30%, rgba(34,225,255,.3), transparent 60%), radial-gradient(900px 520px at 50% 120%, rgba(140,60,255,.4), transparent 60%), #10051d',
      '--stage-bg': 'radial-gradient(700px 460px at 100% 0%, rgba(255,62,165,.32), transparent 60%), radial-gradient(700px 520px at 0% 100%, rgba(34,225,255,.24), transparent 60%), #12061f',
      '--chip-on': '#ff3ea5', '--chip-on-ink': '#fff', '--sel-bg': '#2b1248', '--scrim': 'rgba(5,0,12,.62)',
      '--thumb-bg': 'radial-gradient(circle at 50% 45%, #26113f, #150726)',
    }),
    canvas: { plateIn: '#26123f', plateOut: '#150827', rim: '#7a35c0', plateShadow: 'rgba(255,62,165,0.3)', socket: '#311858', socketShade: 'rgba(0,0,0,0.6)', socketEdge: 'rgba(255,150,230,0.28)', label: '#e4bcff', labelDim: 'rgba(224,179,255,0.5)', exportBg: '#10051d', hint: '34,225,255' },
  },
  {
    id: 'sunset', name: 'Sunset Glow', dark: false, dots: ['#ff5e62', '#ffb347', '#c58cff', '#ec5f8c', '#f4c22c'],
    css: light({
      '--bg': '#fff3ea', '--bg-2': '#ffe4d4', '--surface': '#fffaf6', '--surface-2': 'rgba(255,250,246,.94)',
      '--ink': '#3a1a12', '--ink-2': '#8c4a35', '--ink-3': '#b9806a', '--line': '#f6d2bf', '--line-2': '#efb79c',
      '--gold': '#ff5e62', '--gold-2': '#ffb347', '--gold-ink': '#c8322f', '--gold-soft': '#ffe1d6', '--ok': '#2f8a5b',
      '--hover': 'rgba(255,94,98,.08)', '--track': '#fadccb', '--header-bg': 'rgba(255,245,238,.94)',
      '--gallery-bg': 'linear-gradient(165deg, #ffc49c 0%, #ff9fb0 38%, #d9a3ff 72%, #a9c3ff 100%)',
      '--stage-bg': 'linear-gradient(165deg, #ffcfae, #ffb0c0 45%, #dcb2ff)',
      '--chip-on': '#ff5e62', '--chip-on-ink': '#fff', '--sel-bg': '#fff', '--scrim': 'rgba(58,26,18,.3)',
      '--thumb-bg': 'radial-gradient(circle at 50% 45%, #fffaf6, #ffeee4)',
    }),
    canvas: { plateIn: '#fffbf7', plateOut: '#ffeee3', rim: '#f6c4ab', plateShadow: 'rgba(150,40,60,0.28)', socket: '#fbe8dd', socketShade: 'rgba(170,80,50,0.35)', socketEdge: 'rgba(200,120,90,0.5)', label: '#b26a52', labelDim: 'rgba(178,106,82,0.65)', exportBg: '#fff3ea', hint: '255,94,98' },
  },
  {
    id: 'sakura', name: 'Sakura', dark: false, dots: ['#e0457b', '#ff9ec0', '#c3a3ec', '#9fe0c0', '#f6b3c6'],
    css: light({
      '--bg': '#fff1f5', '--bg-2': '#ffe3ec', '--surface': '#fffafc', '--surface-2': 'rgba(255,250,252,.94)',
      '--ink': '#3b1426', '--ink-2': '#8a4a66', '--ink-3': '#b57c95', '--line': '#f6cfdd', '--line-2': '#eeb3c8',
      '--gold': '#e0457b', '--gold-2': '#ff9ec0', '--gold-ink': '#b82f63', '--gold-soft': '#ffe0ea', '--ok': '#2f8a5b',
      '--hover': 'rgba(224,69,123,.07)', '--track': '#f8d7e3', '--header-bg': 'rgba(255,243,247,.94)',
      '--gallery-bg': 'radial-gradient(900px 420px at 90% -10%, #ffc8dc, transparent 60%), radial-gradient(800px 420px at 0% 15%, #ffe6d2, transparent 60%), radial-gradient(800px 500px at 60% 110%, #e9d6ff, transparent 60%), #fff1f5',
      '--stage-bg': 'radial-gradient(circle at 50% 40%, #fff7fa, #ffdbe7 80%)',
      '--chip-on': '#e0457b', '--chip-on-ink': '#fff', '--sel-bg': '#fff', '--scrim': 'rgba(60,20,38,.26)',
      '--thumb-bg': 'radial-gradient(circle at 50% 45%, #fffafc, #ffedf3)',
    }),
    canvas: { plateIn: '#fffcfd', plateOut: '#fff0f5', rim: '#f4c4d5', plateShadow: 'rgba(160,40,90,0.18)', socket: '#fbe5ee', socketShade: 'rgba(170,60,100,0.35)', socketEdge: 'rgba(200,110,145,0.5)', label: '#b06683', labelDim: 'rgba(176,102,131,0.65)', exportBg: '#fff1f5', hint: '224,69,123' },
  },
  {
    id: 'ocean', name: 'Lagoon', dark: false, dots: ['#0a84c9', '#34d1bf', '#5fa8ee', '#22b2a4', '#8fc6f2'],
    css: light({
      '--bg': '#eaf7ff', '--bg-2': '#d6efff', '--surface': '#f8fdff', '--surface-2': 'rgba(248,253,255,.94)',
      '--ink': '#0b2a3f', '--ink-2': '#3f6a86', '--ink-3': '#7a9db4', '--line': '#c9e5f5', '--line-2': '#a8d4ee',
      '--gold': '#0a84c9', '--gold-2': '#34d1bf', '--gold-ink': '#086aa2', '--gold-soft': '#d8f0ff', '--ok': '#138a63',
      '--hover': 'rgba(10,132,201,.07)', '--track': '#d2e9f7', '--header-bg': 'rgba(240,250,255,.94)',
      '--gallery-bg': 'radial-gradient(900px 450px at 85% -10%, #9fe3f5, transparent 60%), radial-gradient(900px 450px at 0% 20%, #bfe0ff, transparent 60%), linear-gradient(180deg, #dff4ff, #f3fbff)',
      '--stage-bg': 'radial-gradient(circle at 50% 30%, #f3fbff, #bfe6fa 85%)',
      '--chip-on': '#0a84c9', '--chip-on-ink': '#fff', '--sel-bg': '#fff', '--scrim': 'rgba(5,30,50,.3)',
      '--thumb-bg': 'radial-gradient(circle at 50% 45%, #fbfeff, #e6f5ff)',
    }),
    canvas: { plateIn: '#fbfeff', plateOut: '#eaf6fd', rim: '#b6daee', plateShadow: 'rgba(20,80,130,0.22)', socket: '#e2f0f8', socketShade: 'rgba(40,100,150,0.35)', socketEdge: 'rgba(90,150,190,0.5)', label: '#5b8aa8', labelDim: 'rgba(91,138,168,0.65)', exportBg: '#eaf7ff', hint: '10,132,201' },
  },
  {
    id: 'forest', name: 'Emerald Grove', dark: true, dots: ['#e6c56b', '#4fae7a', '#9fe0c0', '#f08a3c', '#f4e4bf'],
    css: dark({
      '--bg': '#0c1f17', '--bg-2': '#133024', '--surface': '#15352a', '--surface-2': 'rgba(18,46,36,.94)',
      '--ink': '#eefaf1', '--ink-2': '#a7cdb5', '--ink-3': '#74a086', '--line': '#24503d', '--line-2': '#30684f',
      '--gold': '#e6c56b', '--gold-2': '#f3e2a6', '--gold-ink': '#f0d58d', '--gold-soft': 'rgba(230,197,107,.15)', '--ok': '#7fdca0',
      '--hover': 'rgba(255,255,255,.06)', '--track': '#22493a', '--header-bg': 'rgba(12,31,23,.92)',
      '--gallery-bg': 'radial-gradient(900px 420px at 85% -10%, rgba(230,197,107,.22), transparent 60%), radial-gradient(800px 500px at 0% 30%, #1f5039 0%, transparent 60%), #0c1f17',
      '--stage-bg': 'radial-gradient(circle at 50% 35%, #1c4534, #0a1913 75%)',
      '--chip-on': '#e6c56b', '--chip-on-ink': '#1d1607', '--sel-bg': '#1e4736', '--scrim': 'rgba(0,8,4,.6)',
      '--thumb-bg': 'radial-gradient(circle at 50% 45%, #1b4232, #102a20)',
    }),
    canvas: { plateIn: '#1d4736', plateOut: '#102e22', rim: '#33705a', plateShadow: 'rgba(0,0,0,0.5)', socket: '#25563f', socketShade: 'rgba(0,0,0,0.55)', socketEdge: 'rgba(180,255,210,0.2)', label: '#acdfc0', labelDim: 'rgba(169,220,189,0.5)', exportBg: '#0c1f17', hint: '230,197,107' },
  },
];

export function themeById(id) { return THEMES.find((t) => t.id === id) || THEMES[0]; }
