// Small synthesized sound palette (no audio files). Created on first gesture.
let ac = null, master = null, enabled = true, lastPlace = 0, voices = 0;
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];

export function setSound(on) { enabled = on; }
export function unlock() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
  } catch { ac = null; }
}
function tone(freq, t0, dur, gain, type = 'sine') {
  if (voices > 8) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
  voices++; o.onended = () => voices--;
}
const ok = () => enabled && ac && ac.state === 'running';

export function place(seq = 0) {
  if (!ok()) return;
  const now = ac.currentTime;
  if (now - lastPlace < 0.045) return;
  lastPlace = now;
  const f = 880 * Math.pow(2, PENTA[seq % PENTA.length] / 12);
  tone(f, now, 0.18, 0.07);
  tone(f * 2.76, now, 0.07, 0.018);
}
export function select() { if (ok()) { const n = ac.currentTime; tone(660, n, 0.08, 0.035, 'triangle'); } }
export function wrong() { if (ok()) { const n = ac.currentTime; tone(300, n, 0.12, 0.04, 'sine'); } }
export function paletteDone() {
  if (!ok()) return;
  const n = ac.currentTime;
  [0, 4, 7].forEach((s, i) => tone(784 * Math.pow(2, s / 12), n + i * 0.07, 0.4, 0.05));
}
export function complete() {
  if (!ok()) return;
  const n = ac.currentTime;
  [0, 4, 7, 11, 14].forEach((s, i) => tone(523 * Math.pow(2, s / 12), n + i * 0.11, 1.4, 0.045));
}
