// Room III: the lexicon. Forty-six illustrated cards, each one playable and pinnable.
import { L, $, esc, fmt, reduce } from './lib.js';

const INK = '#1E150E';
const C = { d: '#B8472F', b: '#6D51A0', c: '#2F7A69', m: '#B98A2A', f: '#3E6F95', brass: '#9A7430', iv: '#2A2018', muted: '#7A6A55', oxblood: '#7C2B22' };
export const CHAPTERS = [
  ['rhythm', 'Rhythm', ['bpm', 'bar', 'downbeat', 'kick', 'four-on-the-floor', 'backbeat', 'half-time', 'two-step', 'hi-hats', 'swing', 'syncopation']],
  ['harmony', 'Harmony', ['major-minor', 'lydian', 'dorian', 'phrygian', 'mixolydian', 'chords', 'seventh', 'sus', 'progression', 'arpeggio', 'ostinato', 'melody', 'motif', 'bass']],
  ['sound', 'Sound', ['waveform', 'pluck', 'pad', 'supersaw', '808', 'distortion', 'filter-sweep', 'reverb', 'delay', 'sidechain', 'drone', 'texture']],
  ['moves', 'Structure', ['intro', 'build', 'riser', 'stop-down', 'drop', 'impact', 'breakdown', 'button', 'voice-band']],
];
/* faces and characters (original cartoon cast) */
function face(cx, cy, r, mood){
  const e = r * .32, ey = cy - r * .12, ew = r * .11;
  let eyes = `<circle cx="${cx - e}" cy="${ey}" r="${ew}" fill="${INK}"/><circle cx="${cx + e}" cy="${ey}" r="${ew}" fill="${INK}"/>`;
  let mouth = `<path d="M${cx - r * .3} ${cy + r * .22} Q${cx} ${cy + r * .52} ${cx + r * .3} ${cy + r * .22}" stroke="${INK}" stroke-width="${r * .09}" fill="none" stroke-linecap="round"/>`;
  if (mood === 'cool') eyes = `<rect x="${cx - r * .62}" y="${ey - r * .16}" width="${r * 1.24}" height="${r * .3}" rx="${r * .12}" fill="${INK}"/>`;
  if (mood === 'calm' || mood === 'sleepy') eyes = `<path d="M${cx - e - ew * 1.6} ${ey} q${ew * 1.6} ${ew * 1.4} ${ew * 3.2} 0 M${cx + e - ew * 1.6} ${ey} q${ew * 1.6} ${ew * 1.4} ${ew * 3.2} 0" stroke="${INK}" stroke-width="${r * .08}" fill="none" stroke-linecap="round"/>`;
  if (mood === 'wow') mouth = `<ellipse cx="${cx}" cy="${cy + r * .32}" rx="${r * .14}" ry="${r * .18}" fill="${INK}"/>`;
  if (mood === 'menace') { eyes += `<path d="M${cx - e - ew * 2} ${ey - ew * 2.6} l${ew * 3.4} ${ew * 1.6} M${cx + e + ew * 2} ${ey - ew * 2.6} l${-ew * 3.4} ${ew * 1.6}" stroke="${INK}" stroke-width="${r * .08}" stroke-linecap="round"/>`;
    mouth = `<path d="M${cx - r * .26} ${cy + r * .36} L${cx + r * .26} ${cy + r * .3}" stroke="${INK}" stroke-width="${r * .09}" stroke-linecap="round"/>`; }
  if (mood === 'smirk') mouth = `<path d="M${cx - r * .24} ${cy + r * .3} Q${cx + r * .1} ${cy + r * .42} ${cx + r * .32} ${cy + r * .16}" stroke="${INK}" stroke-width="${r * .09}" fill="none" stroke-linecap="round"/>`;
  if (mood === 'shh') mouth = `<circle cx="${cx}" cy="${cy + r * .32}" r="${r * .08}" fill="${INK}"/><rect x="${cx - r * .05}" y="${cy + r * .05}" width="${r * .1}" height="${r * .5}" rx="${r * .05}" fill="${INK}"/>`;
  return eyes + mouth;
}
const kickC = (x, y, r, mood = 'happy', cls = 'a-bob', d = '.5s') => `<g class="${cls}" style="--d:${d}"><circle cx="${x}" cy="${y}" r="${r}" fill="${C.d}"/><circle cx="${x}" cy="${y}" r="${r * .82}" fill="none" stroke="${INK}" stroke-opacity=".25" stroke-width="${r * .06}"/>${face(x, y, r * .8, mood)}</g>`;
const snareC = (x, y, s, mood = 'happy', cls = 'a-bob', d = '1s') => `<g class="${cls}" style="--d:${d}"><rect x="${x - s}" y="${y - s * .6}" width="${s * 2}" height="${s * 1.2}" rx="${s * .25}" fill="#F2E6CC" stroke="#2A2018" stroke-width="1.2"/><path d="M${x - s} ${y - s * .25} h${s * 2}" stroke="${INK}" stroke-opacity=".25"/>${face(x, y + s * .1, s * .7, mood)}</g>`;
const hatC = (x, y, s, cls = 'a-bob', d = '.25s') => `<g class="${cls}" style="--d:${d}"><path d="M${x} ${y + s * .2} v${s * 1.4}" stroke="${C.iv}" stroke-opacity=".5" stroke-width="2"/><ellipse cx="${x}" cy="${y}" rx="${s}" ry="${s * .28}" fill="${C.brass}"/><ellipse cx="${x}" cy="${y + s * .3}" rx="${s}" ry="${s * .28}" fill="${C.brass}" opacity=".8"/>
  <circle cx="${x - s * .3}" cy="${y - s * .05}" r="${s * .09}" fill="${INK}"/><circle cx="${x + s * .3}" cy="${y - s * .05}" r="${s * .09}" fill="${INK}"/></g>`;
const saxC = (x, y, s, cls = 'a-bob', d = '1s') => `<g class="${cls}" style="--d:${d}" transform="translate(${x} ${y}) scale(${s})"><path d="M16 -38 l8 -5 l3 5 l-8 5 M20 -36 C14 -24 10 -14 10 0 L10 22 C10 34 2 40 -8 40 C-18 40 -24 32 -24 24 L-24 16" stroke="${C.brass}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M-24 16 C-30 14 -34 10 -35 4 L-13 4 C-14 10 -18 14 -24 16Z" fill="${C.brass}"/><circle cx="4" cy="-6" r="2.5" fill="${C.brass}"/><circle cx="4" cy="4" r="2.5" fill="${C.brass}"/><circle cx="4" cy="14" r="2.5" fill="${C.brass}"/>
  <circle cx="-28" cy="-2" r="2.4" fill="${C.iv}"/><circle cx="-20" cy="-2" r="2.4" fill="${C.iv}"/><circle cx="-27.4" cy="-2.3" r="1.1" fill="${INK}"/><circle cx="-19.4" cy="-2.3" r="1.1" fill="${INK}"/></g>`;
const bassC = (x, y, s, mood = 'happy', cls = 'a-bob', d = '1s') => `<g class="${cls}" style="--d:${d}"><path d="M${x} ${y - s * 2.3} v${s * .9}" stroke="${C.iv}" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/>
  <path d="M${x} ${y - s * 1.45} c${-s * .75} 0 ${-s * .8} ${s * .6} ${-s * .45} ${s * .85} c${-s * .75} ${s * .15} ${-s * .85} ${s * 1.5} 0 ${s * 1.55} c${s * .85} ${-s * .05} ${s * .75} ${-s * 1.4} 0 ${-s * 1.55} c${s * .35} ${-s * .25} ${s * .3} ${-s * .85} ${-s * .45} ${-s * .85}z" fill="${C.b}"/>
  ${face(x, y + s * .25, s * .45, mood)}</g>`;
const cloudC = (x, y, s, mood = 'calm', cls = 'a-float') => `<g class="${cls}"><path d="M${x - s} ${y + s * .4} a${s * .45} ${s * .45} 0 0 1 ${s * .2} ${-s * .85} a${s * .55} ${s * .55} 0 0 1 ${s * .95} ${-s * .25} a${s * .5} ${s * .5} 0 0 1 ${s * .85} ${s * .45} a${s * .4} ${s * .4} 0 0 1 0 ${s * .65}z" fill="${C.c}"/>${face(x + s * .05, y + s * .05, s * .42, mood)}</g>`;
const note = (x, y, col, cls = '', st = '') => `<g class="${cls}" style="${st}"><ellipse cx="${x}" cy="${y}" rx="6.5" ry="5" transform="rotate(-20 ${x} ${y})" fill="${col}"/><path d="M${x + 6} ${y - 1} v-24" stroke="${col}" stroke-width="2"/></g>`;
const staff = (x0 = 20, x1 = 220, y0 = 45) => Array.from({ length: 5 }, (_, i) => `<path d="M${x0} ${y0 + i * 12} H${x1}" stroke="${C.iv}" stroke-opacity=".16"/>`).join('');
const txt = (x, y, s, col = C.iv, size = 11, anchor = 'middle', italic = false) => `<text x="${x}" y="${y}" fill="${col}" font-size="${size}" text-anchor="${anchor}" font-family="${italic ? 'Cormorant Garamond, Georgia, serif' : 'Courier Prime, monospace'}" ${italic ? 'font-style="italic"' : ''}>${s}</text>`;

/* a 16-step sequencer lane with characters */
function grid(rows, dur = 2, opts = {}){
  const X0 = 58, STEP = 10.6, top = 150 / 2 - rows.length * 17 + 8;
  let s = '';
  rows.forEach((r, i) => {
    const y = top + i * 34;
    s += r.char(34, y);
    for (let k = 0; k < 16; k++) {
      const off = opts.swing && k % 2 === 1 ? STEP * .38 : 0, x = X0 + k * STEP + off;
      const hit = r.steps.includes(k);
      s += hit ? `<circle class="a-hit" style="--d:${dur}s;--dl:${(k * dur / 16 + (off ? dur / 16 * .38 : 0)).toFixed(3)}s" cx="${x}" cy="${y}" r="4.3" fill="${r.col}"/>`
               : `<circle cx="${x}" cy="${y}" r="1.4" fill="${C.iv}" opacity="${k % 4 === 0 ? .35 : .14}"/>`;
    }
  });
  s += `<rect class="a-sweep" style="--d:${dur}s;--sx:${STEP * 16}px" x="${X0 - 5}" y="${top - 16}" width="1.5" height="${rows.length * 34}" fill="${C.iv}" opacity=".5"/>`;
  if (opts.label) s += txt(X0 + STEP * 8, 142, opts.label, C.iv, 10);
  return s;
}
const K = (steps) => ({ char: (x, y) => kickC(x, y, 12, 'happy', 'a-bob', '.5s'), steps, col: C.d });
const S = (steps) => ({ char: (x, y) => snareC(x, y, 12, 'happy', 'a-bob', '1s'), steps, col: '#8A7458' });
const Hh = (steps) => ({ char: (x, y) => hatC(x, y - 2, 12, 'a-bob', '.25s'), steps, col: C.brass });
const bars = (n, x0, w, gap, hmax, col, cls, dur, stagger) => Array.from({ length: n }, (_, i) =>
  `<rect class="${cls}" style="--d:${dur}s;--dl:${(i * stagger).toFixed(2)}s;animation-delay:${(i * stagger).toFixed(2)}s" x="${x0 + i * (w + gap)}" y="${120 - hmax * (i + 1) / n}" width="${w}" height="${hmax * (i + 1) / n}" rx="2" fill="${col}"/>`).join('');
const wave = (kind, x0, y, w, amp, cycles = 2) => { let d = `M${x0} ${y}`; const n = 80;
  for (let i = 1; i <= n; i++) { const p = i / n, ph = (p * cycles) % 1, x = x0 + p * w; let v;
    if (kind === 'sine') v = Math.sin(ph * 2 * Math.PI); else if (kind === 'tri') v = 1 - 4 * Math.abs(ph - .5); else if (kind === 'sq') v = ph < .5 ? 1 : -1; else if (kind === 'saw') v = 1 - 2 * ph; else v = (Math.sin(ph * 2 * Math.PI) > 0 ? 1 : -1) * Math.min(1, Math.abs(Math.sin(ph * 2 * Math.PI)) * 3);
    d += ` L${x.toFixed(1)} ${(y - v * amp).toFixed(1)}`; } return d; };

const ILL = {
  'bpm': () => `<g transform="translate(120 78)"><path d="M-30 50 L-14 -44 L14 -44 L30 50Z" fill="#2C241D" stroke="${C.brass}" stroke-width="1.5"/><g class="a-swing" style="--d:.5s"><path d="M0 40 L0 -34" stroke="${C.iv}" stroke-width="2.5" stroke-linecap="round"/><rect x="-6" y="-12" width="12" height="9" rx="2" fill="${C.brass}"/></g><circle cx="0" cy="40" r="4" fill="${C.brass}"/></g>${txt(190, 64, '120', C.brass, 26, 'middle', true)}${txt(190, 82, 'BPM', C.iv, 10)}`,
  'bar': () => { let s = ''; for (let b = 0; b < 2; b++) { const x0 = 30 + b * 96; s += `<rect x="${x0}" y="52" width="88" height="46" rx="8" fill="none" stroke="${C.iv}" stroke-opacity=".25"/>` + txt(x0 + 44, 118, `bar ${b + 1}`, C.iv, 10);
      for (let k = 0; k < 4; k++) s += `<circle class="a-hit" style="--d:4s;--dl:${((b * 4 + k) * .5).toFixed(1)}s" cx="${x0 + 14 + k * 20}" cy="75" r="${k === 0 ? 7 : 5}" fill="${k === 0 ? C.brass : C.iv}"/>` + txt(x0 + 14 + k * 20, 48, k + 1, C.muted || '#A99C88', 9); } return s; },
  'downbeat': () => { let s = ''; for (let k = 0; k < 4; k++) s += `<circle cx="${60 + k * 40}" cy="80" r="${k === 0 ? 14 : 6}" fill="${k === 0 ? C.brass : C.iv}" opacity="${k === 0 ? 1 : .35}"/>`;
      return s + `<circle class="a-pulse" style="--d:2s" cx="60" cy="80" r="14" fill="none" stroke="${C.brass}" stroke-width="2"/>` + txt(60, 122, 'ONE', C.brass, 10) + txt(140, 122, 'two  three  four', C.iv, 10); },
  'kick': () => kickC(120, 78, 34, 'wow', 'a-bob', '.5s') + `<circle class="a-pulse" style="--d:.5s" cx="120" cy="78" r="36" fill="none" stroke="${C.d}" stroke-width="2"/>`,
  'four-on-the-floor': () => grid([K([0, 4, 8, 12])], 2, { label: '1 · 2 · 3 · 4' }),
  'backbeat': () => grid([K([0, 8]), S([4, 12])], 2, { label: 'kick 1 & 3 · snare 2 & 4' }),
  'half-time': () => grid([K([0, 10]), S([8]), Hh([0, 2, 4, 6, 8, 10, 12, 14])], 2),
  'two-step': () => grid([K([0, 10]), S([4, 12])], 2, { label: 'the kick skips' }),
  'hi-hats': () => grid([Hh([...Array(16).keys()])], 2, { label: 'sixteen ticks a bar' }),
  'swing': () => grid([Hh([...Array(16).keys()])], 2, { swing: true, label: 'every second tick arrives late' }),
  'syncopation': () => grid([K([0, 4, 8, 12]), { char: (x, y) => `<g class="a-bob" style="--d:1s">${`<rect x="${x - 12}" y="${y - 9}" width="24" height="18" rx="3" fill="${C.c}"/>`}${face(x, y, 8, 'smirk')}</g>`, steps: [2, 5, 10, 13], col: C.c }], 2, { label: 'hits between the beats' }),
  'major-minor': () => `<g class="a-bob" style="--d:1.2s"><circle cx="72" cy="70" r="30" fill="${C.brass}"/>${face(72, 70, 30, 'happy')}</g><g class="a-bob" style="--d:1.2s;animation-delay:.6s"><circle cx="168" cy="70" r="30" fill="${C.b}"/>${face(168, 70, 30, 'cool')}</g>` + txt(72, 124, 'major: bright', C.brass, 11, 'middle', true) + txt(168, 124, 'minor: cool, serious', C.b, 11, 'middle', true),
  'lydian': () => `<g class="a-float"><path d="M120 94 C118 108 124 116 120 130" stroke="${C.iv}" stroke-opacity=".4" fill="none"/><circle cx="120" cy="66" r="28" fill="${C.c}"/>${face(120, 66, 28, 'wow')}</g>` + [40, 190, 70, 170].map((x, i) => `<path class="a-blink" style="--d:1.6s;--dl:${i * .4}s" d="M${x} ${40 + i * 14} l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3z" fill="${C.brass}"/>`).join('') + txt(120, 142, 'the raised 4th floats', C.iv, 10),
  'dorian': () => `<g class="a-bob" style="--d:1.4s"><circle cx="120" cy="70" r="32" fill="${C.b}"/>${face(120, 70, 32, 'cool')}</g>` + txt(120, 130, 'minor, but hopeful', C.iv, 11, 'middle', true),
  'phrygian': () => `<g class="a-shake"><circle cx="120" cy="70" r="32" fill="${C.oxblood || '#8E3B32'}"/>${face(120, 70, 32, 'menace')}</g>` + txt(120, 130, 'one half-step of menace', C.iv, 11, 'middle', true),
  'mixolydian': () => `<g class="a-bob" style="--d:.8s"><circle cx="120" cy="74" r="30" fill="${C.m}"/>${face(120, 74, 30, 'smirk')}<path d="M88 50 h64 l-10 -20 h-44z" fill="${INK}" transform="rotate(-12 120 45)"/></g>` + txt(120, 132, 'major, with swagger', C.iv, 11, 'middle', true),
  'chords': () => staff() + [0, 1, 2].map(i => note(118, 93 - i * 12, C.c)).join('') + `<rect class="a-blink" style="--d:1s" x="104" y="60" width="32" height="42" rx="6" fill="none" stroke="${C.c}"/>` + txt(120, 128, 'three notes at once', C.iv, 10),
  'seventh': () => staff() + [0, 1, 2].map(i => note(118, 93 - i * 12, C.c)).join('') + note(118, 57, C.brass, 'a-blink', '--d:2.4s;--dl:.6s') + note(118, 45, C.m, 'a-blink', '--d:2.4s;--dl:1.2s') + txt(120, 128, 'stack more notes: dreamy, then lush', C.iv, 10),
  'sus': () => staff() + note(100, 93, C.c) + note(100, 69, C.c) + `<g class="a-bob" style="--d:2.4s">${note(100, 75, C.brass)}</g>`  + `<path d="M132 80 h34 m-6 -5 l6 5 l-6 5" stroke="${C.iv}" stroke-opacity=".5" fill="none"/>` + note(185, 93, C.c) + note(185, 81, C.m) + note(185, 69, C.c) + txt(100, 128, 'a question', C.iv, 10) + txt(185, 128, 'the answer', C.m, 10),
  'progression': () => ['I', 'V', 'vi', 'IV'].map((r, i) => `<g class="a-hit" style="--d:3.2s;--dl:${i * .8}s"><rect x="${28 + i * 48}" y="52" width="40" height="46" rx="8" fill="${[C.brass, C.c, C.b, C.m][i]}"/>${txt(48 + i * 48, 82, r, INK, 17, 'middle', true)}</g>`).join('') + txt(120, 124, 'a loop of chords', C.iv, 10),
  'arpeggio': () => [0, 1, 2, 3, 4, 5].map(i => `<g class="a-hit" style="--d:2.4s;--dl:${(i * .3).toFixed(1)}s">${note(52 + i * 26, 106 - i * 12, C.m)}</g>`).join('') + [0, 1, 2, 3, 4, 5].map(i => `<path d="M${40 + i * 26} ${112 - i * 12} h26" stroke="${C.iv}" stroke-opacity=".18"/>`).join('') + txt(120, 136, 'a chord, one note at a time', C.iv, 10),
  'ostinato': () => `<g class="a-spin" style="--d:2s"><circle cx="120" cy="75" r="40" fill="none" stroke="${C.iv}" stroke-opacity=".25" stroke-dasharray="8 6"/></g>` + [0, 1, 2, 3].map(i => { const a = i * Math.PI / 2 - Math.PI / 2; return `<circle class="a-hit" style="--d:1s;--dl:${i * .25}s" cx="${120 + Math.cos(a) * 40}" cy="${75 + Math.sin(a) * 40}" r="7" fill="${C.m}"/>`; }).join('') + txt(120, 80, 'again', C.iv, 12, 'middle', true),
  'melody': () => saxC(96, 82, 1.35, 'a-bob', '1.2s') + [0, 1, 2].map(i => `<g class="a-rise" style="--d:2.4s;--dl:${i * .8}s">${note(150 + i * 14, 90 - i * 6, C.m)}</g>`).join(''),
  'motif': () => [0, 1, 2].map(i => `<g class="a-hit" style="--d:2.4s;--dl:${i * .35}s">${note(56 + i * 30, 90 - [0, 18, 8][i], C.brass)}</g>`).join('') + `<path d="M140 76 h22 m-6 -5 l6 5 l-6 5" stroke="${C.iv}" stroke-opacity=".4" fill="none"/>` + [0, 1, 2].map(i => `<g class="a-hit" style="--d:2.4s;--dl:${1.2 + i * .35}s">${note(176 + i * 18, 90 - [0, 18, 8][i], C.oxblood)}</g>`).join('') + txt(120, 136, 'the same idea, returning', C.iv, 10),
  'bass': () => bassC(90, 90, 34, 'happy', 'a-bob', '.5s') + `<path class="a-draw" style="--len:260;--d:2s" d="${wave('sine', 140, 92, 80, 18, 1.5)}" stroke="${C.b}" stroke-width="3" fill="none"/>`,
  'waveform': () => ['sine', 'tri', 'sq', 'saw'].map((k, i) => `<path class="a-draw" style="--len:200;--d:3s;animation-delay:${i * .25}s" d="${wave(k, 20 + (i % 2) * 110, 52 + Math.floor(i / 2) * 50, 90, 14, 2)}" stroke="${[C.c, C.f, C.m, C.d][i]}" stroke-width="2.5" fill="none"/>` + txt(65 + (i % 2) * 110, 80 + Math.floor(i / 2) * 50, ['sine', 'triangle', 'square', 'sawtooth'][i], C.iv, 9.5)).join(''),
  'pluck': () => `<path class="a-draw" style="--len:320;--d:1.4s" d="M24 112 L40 112 L44 36 C60 90 80 108 120 112 L216 112" stroke="${C.m}" stroke-width="3" fill="none"/>` + txt(120, 136, 'instant start, quick fade', C.iv, 10),
  'pad': () => cloudC(70, 70, 34) + `<path class="a-draw" style="--len:300;--d:3.2s" d="M120 116 C150 116 160 44 200 44 L224 44" stroke="${C.c}" stroke-width="3" fill="none"/>` + txt(172, 136, 'slow swell, long tail', C.iv, 10),
  'supersaw': () => [0, 1, 2, 3, 4].map(i => `<path class="a-shake" d="${wave('saw', 22 + i * 2, 78 + i * 2 - 4, 196, 26, 4)}" stroke="${C.m}" stroke-opacity="${.25 + i * .15}" stroke-width="2" fill="none"/>`).join('') + txt(120, 134, 'many saws, slightly out of tune', C.iv, 10),
  '808': () => kickC(64, 72, 30, 'wow', 'a-bob', '1s') + `<path class="a-draw" style="--len:400;--d:2s" d="M100 72 Q130 22 150 72 T190 72 T222 72" stroke="${C.d}" stroke-width="4" fill="none"/>` + txt(160, 130, 'a boom you can tune', C.iv, 10),
  'distortion': () => `<path class="a-shake" d="${wave('dist', 24, 76, 192, 30, 3)}" stroke="${C.d}" stroke-width="3" fill="none"/>` + txt(120, 130, 'clean wave, pushed until it breaks up', C.iv, 10),
  'filter-sweep': () => Array.from({ length: 18 }, (_, i) => `<rect class="a-grow" style="--d:3s;animation-delay:${(i * .09).toFixed(2)}s" x="${20 + i * 11}" y="${50 + i * 1.8}" width="7" height="${70 - i * 1.8}" rx="2" fill="${i < 6 ? C.b : i < 12 ? C.c : C.f}"/>`).join('') + txt(120, 138, 'muffled → bright', C.iv, 10),
  'reverb': () => `<rect x="30" y="26" width="180" height="104" rx="10" fill="none" stroke="${C.iv}" stroke-opacity=".18"/>` + saxC(120, 80, .9, '', '') + [0, 1, 2].map(i => `<circle class="a-pulse" style="--d:2.4s;--dl:${i * .8}s" cx="120" cy="78" r="20" fill="none" stroke="${C.c}" stroke-width="1.5"/>`).join(''),
  'delay': () => [0, 1, 2, 3, 4].map(i => `<circle class="a-fade" style="--d:2s;--dl:${i * .3}s" cx="${40 + i * 40}" cy="76" r="${14 - i * 2}" fill="${C.f}" opacity="${1 - i * .18}"/>`).join('') + txt(120, 124, 'each note echoes, softer each time', C.iv, 10),
  'sidechain': () => kickC(50, 80, 22, 'happy', 'a-bob', '.5s') + Array.from({ length: 8 }, (_, i) => `<rect class="a-duck" style="--d:.5s" x="${92 + i * 16}" y="44" width="11" height="74" rx="3" fill="${C.c}" opacity="${.5 + i * .06}"/>`).join('') + txt(150, 138, 'the pad ducks on every kick', C.iv, 10),
  'drone': () => `<rect x="24" y="68" width="192" height="16" rx="8" fill="${C.b}" opacity=".85"/><rect class="a-blink" style="--d:3s" x="24" y="68" width="192" height="16" rx="8" fill="${C.iv}" opacity=".12"/>` + cloudC(120, 44, 18, 'sleepy', '') + txt(120, 118, 'one low note that never lets go', C.iv, 10),
  'texture': () => `<g class="a-spin" style="--d:1.8s"><circle cx="120" cy="76" r="50" fill="#0E0C0B"/><circle cx="120" cy="76" r="40" fill="none" stroke="#2A2521"/><circle cx="120" cy="76" r="30" fill="none" stroke="#2A2521"/><circle cx="120" cy="76" r="15" fill="${C.oxblood || '#8E3B32'}"/></g>` + Array.from({ length: 9 }, (_, i) => `<circle class="a-blink" style="--d:.9s;--dl:${(i * .11).toFixed(2)}s" cx="${70 + (i * 37) % 100}" cy="${40 + (i * 23) % 70}" r="1.8" fill="${C.iv}"/>`).join(''),
  'intro': () => `<rect x="40" y="30" width="160" height="92" rx="8" fill="none" stroke="${C.iv}" stroke-opacity=".3"/><path d="M110 58 v34 l28 -17z" fill="${C.brass}"/>` + `<g class="a-rise" style="--d:2s">${note(170, 60, C.m)}</g>` + txt(120, 140, 'the first second sets the tone', C.iv, 10),
  'build': () => bars(8, 30, 18, 6, 80, C.c, 'a-grow', 2.4, .12) + `<path d="M36 36 L206 30" stroke="${C.brass}" stroke-width="2" stroke-dasharray="4 4"/>` + txt(120, 140, 'more, brighter, denser', C.iv, 10),
  'riser': () => `<path class="a-draw" style="--len:300;--d:2.2s" d="M24 118 C110 116 170 90 214 30" stroke="${C.f}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M204 30 L216 28 L212 40" stroke="${C.f}" stroke-width="3" fill="none"/>` + txt(80, 90, 'up… up… up…', C.f, 12, 'middle', true),
  'stop-down': () => bars(5, 24, 16, 6, 70, C.d, '', 1, 0) + `<rect x="138" y="30" width="44" height="92" rx="6" fill="${C.iv}" opacity=".05"/>` + `<g class="a-bob" style="--d:1.6s"><circle cx="160" cy="72" r="18" fill="#F2E6CC" stroke="#2A2018" stroke-width="1.2"/>${face(160, 72, 18, 'shh')}</g>` + `<rect x="194" y="40" width="18" height="80" rx="2" fill="${C.d}"/>` + txt(160, 138, 'one beat of silence', C.iv, 10),
  'drop': () => bars(5, 20, 14, 6, 50, C.c, '', 1, 0) + `<g class="a-pulse" style="--d:1.6s"><path d="M170 74 l6 -26 l6 26 l24 6 l-24 6 l-6 26 l-6 -26 l-24 -6z" fill="${C.d}"/></g><path d="M170 74 l6 -26 l6 26 l24 6 l-24 6 l-6 26 l-6 -26 l-24 -6z" fill="${C.d}"/>` + txt(176, 136, 'everything arrives', C.iv, 10),
  'impact': () => Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return `<path class="a-pulse" style="--d:1.2s" d="M${120 + Math.cos(a) * 16} ${76 + Math.sin(a) * 16} L${120 + Math.cos(a) * 34} ${76 + Math.sin(a) * 34}" stroke="${C.d}" stroke-width="4" stroke-linecap="round"/>`; }).join('') + kickC(120, 76, 14, 'wow', '', ''),
  'breakdown': () => [0, 1, 2, 3].map(i => `<circle class="a-fade" style="--d:3s;--dl:${i * .2}s" cx="${40 + i * 22}" cy="60" r="7" fill="${C.d}"/>`).join('') + cloudC(160, 84, 32) + txt(120, 140, 'drums step out, harmony stays', C.iv, 10),
  'button': () => bars(6, 26, 14, 6, 60, C.c, '', 1, 0) + `<g class="a-pulse" style="--d:2.4s"><circle cx="176" cy="76" r="18" fill="none" stroke="${C.brass}" stroke-width="2"/></g><rect x="160" y="50" width="32" height="52" rx="4" fill="${C.brass}"/><path d="M200 76 C212 60 212 92 224 76" class="a-draw" style="--len:60;--d:2.4s" stroke="${C.brass}" stroke-width="2" fill="none"/>` + txt(120, 136, 'one last chord, left to ring', C.iv, 10),
  'voice-band': () => Array.from({ length: 20 }, (_, i) => `<rect class="a-grow" style="--d:1.2s;animation-delay:${((i * 7) % 10) * .1}s" x="${20 + i * 10}" y="${60}" width="6" height="${50 - Math.abs(i - 9.5) * 2}" rx="2" fill="${i >= 6 && i <= 13 ? C.brass : C.iv}" opacity="${i >= 6 && i <= 13 ? 1 : .25}"/>`).join('') + `<rect x="78" y="38" width="84" height="80" rx="6" fill="none" stroke="${C.brass}" stroke-dasharray="4 4"/>` + txt(120, 136, 'keep this part clear for a voice', C.iv, 10),
};

/* ---------- the catalogue ---------- */
let chapter = 'rhythm', query = '', hooks = {};
export function onLexicon(name, fn) { hooks[name] = fn; }
function hearFor(k) {
  const out = [];
  for (const c of [...L.STYLES, ...L.LESSONS]) { const m = c.moments.find(m => m.term === k); if (m && !out.some(x => x[0] === c.id)) out.push([c.id, m.t, c.kind === 'style' ? c.title : 'an example']); if (out.length >= 2) break; }
  return out;
}
const pinIcon = '<svg viewBox="0 0 12 12"><path d="M7 1l4 4-1.5.8L7.6 7.7 8 10l-1 1-2.3-2.3L2 11.4 1.4 10.8l2.7-2.7L1.8 5.8l1-1 2.3.4L7 3.3z" fill="currentColor"/></svg>';
const playIcon = '<svg viewBox="0 0 12 12"><path d="M3 1.5v9l7-4.5z" fill="currentColor"/></svg>';
export function initLexicon() {
  renderChapters(); renderWords();
  $('chapters').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; $('lexSearch').value = ''; query = ''; setChapter(b.dataset.ch); });
  $('lexSearch').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); renderWords(); });
  $('wordgrid').addEventListener('click', e => {
    const h = e.target.closest('[data-hear]'); if (h) { hooks.hear && hooks.hear(h.dataset.hear, +h.dataset.t); return; }
    const p = e.target.closest('[data-pin]'); if (p) { hooks.pin && hooks.pin(p.dataset.pin); return; }
  });
}
function renderChapters() { $('chapters').innerHTML = CHAPTERS.map(([k, n], i) => `<button type="button" role="tab" data-ch="${k}" aria-selected="${!query && k === chapter}">${'ABCD'[i]} · ${n}</button>`).join(''); }
export function refreshPins() { document.querySelectorAll('#wordgrid [data-pin]').forEach(b => { const on = hooks.isPinned && hooks.isPinned(b.dataset.pin); b.setAttribute('aria-pressed', on); b.lastChild.textContent = on ? ' Pinned' : ' Pin to slip'; }); }
function renderWords() {
  renderChapters();
  let list;
  if (query) list = CHAPTERS.flatMap(([k, , ks], ci) => ks.map((w, i) => [w, ci, i])).filter(([w]) => { const g = L.GLOSS[w]; return (g.title + ' ' + g.def + ' ' + g.why).toLowerCase().includes(query); });
  else { const ci = CHAPTERS.findIndex(c => c[0] === chapter); list = CHAPTERS[ci][2].map((w, i) => [w, ci, i]); }
  if (!list.length) { $('wordgrid').innerHTML = `<p class="lex-empty">No card by that name yet. Try “drop”, “swing” or “pad”.</p>`; return; }
  $('wordgrid').innerHTML = list.map(([k, ci, i], n) => { const g = L.GLOSS[k]; const hear = hearFor(k); const rot = (((n * 37) % 7) - 3) * .16; const on = hooks.isPinned && hooks.isPinned(k);
    return `<article class="icard paper" id="term-${k}" style="--r:${rot.toFixed(2)}deg"><div class="plate"><svg viewBox="0 0 240 150" role="img" aria-label="${esc(g.title)}, illustrated">${ILL[k] ? ILL[k]() : ''}</svg></div>
      <div class="body"><div class="head"><h4>${esc(g.title)}</h4><span class="catno">${'ABCD'[ci]}–${String(i + 1).padStart(2, '0')}</span></div><p class="def">${esc(g.def)}</p><p class="why">${esc(g.why)}</p>
      <div class="foot">${hear.map(([id, t, title]) => `<button type="button" data-hear="${id}" data-t="${t}">${playIcon} Hear it in ${esc(title)}</button>`).join('')}<button type="button" class="pin" data-pin="${k}" aria-pressed="${on}">${pinIcon}<span> ${on ? 'Pinned' : 'Pin to slip'}</span></button></div></div></article>`; }).join('');
  [...$('wordgrid').children].forEach((el, i) => setTimeout(() => el.classList.add('in'), reduce ? 0 : 40 + i * 50));
}
function setChapter(k) { if (k === chapter && !query) return; chapter = k; [...$('wordgrid').children].forEach(el => el.classList.remove('in')); setTimeout(renderWords, reduce ? 0 : 240); }
export function showTerm(k) {
  const ch = CHAPTERS.find(c => c[2].includes(k)); if (!ch) return;
  const go = () => { const el = $('term-' + k); if (!el) return; el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };
  if (ch[0] !== chapter || query) { query = ''; $('lexSearch').value = ''; chapter = ch[0]; renderWords(); setTimeout(go, 120); } else go();
}
