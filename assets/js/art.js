// Sleeve art and the small animated drawings used around the library.
const TAU = Math.PI * 2;
function lum(hex) { const n = parseInt(hex.slice(1), 16); return ((n >> 16 & 255) * .3 + (n >> 8 & 255) * .59 + (n & 255) * .11) / 255; }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function hash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Mid-century sleeve art, generated from the record itself. */
export function drawCover(cv, c, opts = {}) {
  const d = Math.min(devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
  const size = Math.max(40, Math.round((r.width || opts.size || 200) * d));
  cv.width = size; cv.height = size;
  const g = cv.getContext('2d'), s = size, R = rng(hash(c.id));
  const [bg, fg, ac] = c.palette || ['#E9DDC2', '#7C2B22', '#271D14'];
  g.fillStyle = bg; g.fillRect(0, 0, s, s);
  const u = s / 100;
  g.save();
  switch (c.art) {
    case 'grid': { for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) { const on = (x * 3 + y * 7) % 5 === 1; g.fillStyle = (x === 3 && y === 1) ? ac : fg; g.globalAlpha = on || (x === 3 && y === 1) ? 1 : .18;
        g.beginPath(); g.arc(18 * u + x * 16 * u, 16 * u + y * 12 * u, 4.6 * u, 0, TAU); g.fill(); } g.globalAlpha = 1; break; }
    case 'bars': { for (let i = 0; i < 16; i++) { const h = (18 + Math.abs(Math.sin(i * .9)) * 44 + R() * 8) * u; g.fillStyle = i === 11 ? ac : fg; g.fillRect(10 * u + i * 5 * u, 70 * u - h, 3 * u, h); } g.fillStyle = ac; g.fillRect(10 * u, 72 * u, 80 * u, .8 * u); break; }
    case 'circles': { [[36, 40, 28, fg], [58, 46, 22, ac], [44, 58, 12, bg]].forEach(([x, y, rr, col], i) => { g.fillStyle = col; g.globalAlpha = i === 1 ? .88 : 1; g.beginPath(); g.arc(x * u, y * u, rr * u, 0, TAU); g.fill(); }); g.globalAlpha = 1; break; }
    case 'sunburst': { for (let i = 0; i < 14; i++) { const a0 = Math.PI + i / 14 * Math.PI; g.fillStyle = i % 2 ? fg : ac; g.beginPath(); g.moveTo(50 * u, 66 * u); g.arc(50 * u, 66 * u, 80 * u, a0, a0 + Math.PI / 14); g.fill(); }
      g.fillStyle = bg; g.fillRect(0, 66 * u, s, s); g.fillStyle = fg; g.beginPath(); g.arc(50 * u, 66 * u, 14 * u, Math.PI, 0); g.fill(); break; }
    case 'horizon': { const grd = g.createLinearGradient(0, 18 * u, 0, 62 * u); grd.addColorStop(0, ac); grd.addColorStop(1, fg); g.fillStyle = grd; g.beginPath(); g.arc(50 * u, 50 * u, 28 * u, Math.PI, 0); g.fill();
      g.fillStyle = bg; for (let k = 0; k < 5; k++) g.fillRect(20 * u, (32 + k * 4.2) * u, 60 * u, (0.8 + k * .5) * u);
      g.strokeStyle = fg; g.globalAlpha = .7; g.lineWidth = .6 * u; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(0, (52 + k * k * .9) * u); g.lineTo(s, (52 + k * k * .9) * u); g.stroke(); }
      for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(50 * u + k * 3 * u, 52 * u); g.lineTo(50 * u + k * 18 * u, 80 * u); g.stroke(); } g.globalAlpha = 1; break; }
    case 'shards': { for (let k = 0; k < 7; k++) { g.fillStyle = k % 3 === 0 ? fg : ac; g.globalAlpha = .55 + R() * .45; g.beginPath(); const x = R() * 80 * u + 10 * u, y = R() * 50 * u + 8 * u; g.moveTo(x, y); g.lineTo(x + (R() * 40 - 10) * u, y + R() * 30 * u); g.lineTo(x - R() * 20 * u, y + (20 + R() * 20) * u); g.fill(); } g.globalAlpha = 1; break; }
    case 'window': { g.fillStyle = fg; g.fillRect(24 * u, 12 * u, 52 * u, 50 * u); g.fillStyle = bg; g.fillRect(27 * u, 15 * u, 21 * u, 21 * u); g.fillRect(52 * u, 15 * u, 21 * u, 21 * u); g.fillRect(27 * u, 39 * u, 21 * u, 20 * u); g.fillRect(52 * u, 39 * u, 21 * u, 20 * u);
      g.fillStyle = ac; g.beginPath(); g.arc(62 * u, 25 * u, 5 * u, 0, TAU); g.fill(); g.fillStyle = fg; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse((32 + k * 3) * u, 58 * u, 2 * u, 7 * u, (k - 2) * .35, 0, TAU); g.fill(); } break; }
    case 'stripes': { g.save(); g.translate(50 * u, 40 * u); g.rotate(-.5); for (let k = -8; k < 8; k++) { g.fillStyle = k % 3 === 0 ? ac : fg; g.fillRect(k * 9 * u, -70 * u, 4.5 * u, 140 * u); } g.restore(); g.fillStyle = bg; g.fillRect(0, 66 * u, s, s); break; }
    case 'waves': { for (let k = 0; k < 9; k++) { g.strokeStyle = k === 4 ? ac : fg; g.lineWidth = 2.2 * u; g.beginPath(); for (let x = 0; x <= 100; x += 2) { const y = 16 + k * 6 + Math.sin(x * .12 + k * .7) * 3; x ? g.lineTo(x * u, y * u) : g.moveTo(0, y * u); } g.stroke(); } g.fillStyle = bg; g.fillRect(0, 70 * u, s, s); break; }
    case 'bloom': { for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.fillStyle = k % 2 ? fg : ac; g.globalAlpha = .82; g.beginPath(); g.arc(50 * u + Math.cos(a) * 15 * u, 38 * u + Math.sin(a) * 15 * u, 14 * u, 0, TAU); g.fill(); }
      g.globalAlpha = 1; g.fillStyle = bg; g.beginPath(); g.arc(50 * u, 38 * u, 7 * u, 0, TAU); g.fill(); break; }
    case 'monolith': { const grd = g.createRadialGradient(50 * u, 40 * u, 2 * u, 50 * u, 40 * u, 40 * u); grd.addColorStop(0, fg); grd.addColorStop(1, bg); g.fillStyle = grd; g.fillRect(0, 0, s, s);
      g.fillStyle = bg; g.fillRect(40 * u, 12 * u, 20 * u, 56 * u); g.strokeStyle = ac; g.lineWidth = .8 * u; g.strokeRect(40 * u, 12 * u, 20 * u, 56 * u); break; }
    case 'moon': { const grd = g.createRadialGradient(50 * u, 38 * u, 10 * u, 50 * u, 38 * u, 45 * u); grd.addColorStop(0, fg); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, s, s);
      g.fillStyle = bg; g.beginPath(); g.arc(50 * u, 38 * u, 20 * u, 0, TAU); g.fill(); g.fillStyle = ac; g.globalAlpha = .25; g.fillRect(0, 60 * u, s, .8 * u); g.globalAlpha = 1; break; }
    case 'keys': { for (let k = 0; k < 11; k++) { g.fillStyle = bg; g.fillRect((6 + k * 8) * u, 18 * u, 7.2 * u, 46 * u); g.strokeStyle = fg; g.lineWidth = .5 * u; g.strokeRect((6 + k * 8) * u, 18 * u, 7.2 * u, 46 * u); }
      g.fillStyle = fg; [0, 1, 3, 4, 5, 7, 8, 10].forEach(k => g.fillRect((11 + k * 8) * u, 18 * u, 4.6 * u, 28 * u)); g.fillStyle = ac; g.fillRect((6 + 5 * 8) * u, 50 * u, 7.2 * u, 14 * u); break; }
    case 'rays': { for (let k = 0; k < 12; k++) { g.fillStyle = k % 2 ? fg : ac; g.globalAlpha = .7; g.beginPath(); g.moveTo(50 * u, -6 * u); g.lineTo((k * 9 - 4) * u, 80 * u); g.lineTo((k * 9 + 1) * u, 80 * u); g.fill(); } g.globalAlpha = 1; g.fillStyle = bg; g.fillRect(0, 66 * u, s, s); break; }
    case 'pixels': { for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { if (R() < .72) continue; g.fillStyle = R() < .2 ? ac : fg; g.fillRect((14 + x * 6) * u + (y % 3 === 0 ? 3 * u : 0), (8 + y * 5) * u, 5 * u, 3.6 * u); } break; }
    case 'checker': { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) { g.fillStyle = fg; g.fillRect((18 + x * 8) * u, (6 + y * 8) * u, 8 * u, 8 * u); }
      g.fillStyle = ac; [[3, 2], [4, 2], [2, 3], [5, 3], [2, 4], [5, 4], [3, 5], [4, 5]].forEach(([x, y]) => g.fillRect((18 + x * 8) * u, (6 + y * 8) * u, 8 * u, 8 * u)); break; }
    case 'clock': { g.strokeStyle = fg; g.lineWidth = 2.4 * u; g.beginPath(); g.arc(50 * u, 38 * u, 24 * u, 0, TAU); g.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.beginPath(); g.moveTo(50 * u + Math.cos(a) * 19 * u, 38 * u + Math.sin(a) * 19 * u); g.lineTo(50 * u + Math.cos(a) * 22 * u, 38 * u + Math.sin(a) * 22 * u); g.stroke(); }
      g.strokeStyle = ac; g.beginPath(); g.moveTo(50 * u, 38 * u); g.lineTo(50 * u, 20 * u); g.moveTo(50 * u, 38 * u); g.lineTo(62 * u, 44 * u); g.stroke(); break; }
    case 'arches': { [[34, fg], [26, ac], [18, fg], [10, bg]].forEach(([rr, col]) => { g.fillStyle = col; g.beginPath(); g.arc(50 * u, 64 * u, rr * u, Math.PI, 0); g.fill(); }); break; }
    case 'zigzag': { for (let k = 0; k < 6; k++) { g.strokeStyle = k % 2 ? fg : ac; g.lineWidth = 3.4 * u; g.beginPath(); for (let x = 0; x <= 100; x += 10) g.lineTo(x * u, (14 + k * 9 + ((x / 10) % 2 ? 5 : 0)) * u); g.stroke(); } g.fillStyle = bg; g.fillRect(0, 68 * u, s, s); break; }
    case 'stock': { const grd = g.createLinearGradient(0, 0, 0, s); grd.addColorStop(0, '#E4E0D6'); grd.addColorStop(1, '#BDB7AA'); g.fillStyle = grd; g.fillRect(0, 0, s, s);
      g.strokeStyle = fg; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(22 * u, 58 * u); g.lineTo(40 * u, 40 * u); g.lineTo(52 * u, 50 * u); g.lineTo(74 * u, 22 * u); g.stroke(); g.beginPath(); g.moveTo(66 * u, 22 * u); g.lineTo(75 * u, 21 * u); g.lineTo(74 * u, 30 * u); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `600 ${7 * u}px Georgia, serif`; g.textAlign = 'center'; g.save(); g.translate(50 * u, 40 * u); g.rotate(-.5); for (let k = -2; k <= 2; k++) g.fillText('SAMPLE', k * 22 * u, k * 10 * u); g.restore(); break; }
    default: { g.fillStyle = fg; g.beginPath(); g.arc(50 * u, 40 * u, 22 * u, 0, TAU); g.fill(); }
  }
  g.restore();
  // print texture and ring wear
  for (let k = 0; k < s * 1.2; k++) { g.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${R() * .05})`; g.fillRect(R() * s, R() * s, u * .6, u * .6); }
  g.strokeStyle = lum(bg) > .5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)'; g.lineWidth = 3 * u; g.beginPath(); g.arc(50 * u, 50 * u, 44 * u, 0, TAU); g.stroke();
  if (opts.bare) return;
  // typography
  const light = lum(bg) < .45, ink = light ? 'rgba(245,236,218,.92)' : 'rgba(30,21,14,.88)';
  g.fillStyle = ink; g.textBaseline = 'alphabetic';
  g.font = `400 ${4.6 * u}px "Courier Prime", monospace`; g.textAlign = 'left'; g.fillText(c.no ? 'CL–' + String(c.no).padStart(2, '0') : 'CL', 7 * u, 9.5 * u);
  g.textAlign = 'right'; g.fillText(c.bpm + ' BPM', 93 * u, 9.5 * u);
  g.textAlign = 'left'; g.font = `italic 500 ${9.6 * u}px "Cormorant Garamond", Georgia, serif`;
  const words = c.title.split(' '); let line = '', lines = [];
  for (const w of words) { const test = line ? line + ' ' + w : w; if (g.measureText(test).width > 84 * u && line) { lines.push(line); line = w; } else line = test; } lines.push(line);
  lines = lines.slice(-2); lines.forEach((ln, i) => g.fillText(ln, 7 * u, (92 - (lines.length - 1 - i) * 9.5) * u));
  g.font = `600 ${3.4 * u}px "Cormorant Garamond", Georgia, serif`; g.globalAlpha = .75;
  g.fillText((c.key || '').toUpperCase().split('').join(String.fromCharCode(8202)), 7 * u, (lines.length > 1 ? 72 : 81.5) * u); g.globalAlpha = 1;
}

/* ---------- small animated drawings (inline SVG) ---------- */
const B = '#D6B26A', CR = '#EFE4CC', OX = '#7C2B22', DK = '#1A100A';
export const ART = {
  wall: () => `<svg viewBox="0 0 220 130">
    ${[['#C9A25A', 20, 0], ['#8FA9B8', 80, 1], ['#B8694D', 140, 2]].map(([c, x, i]) => `<g class="${i === 1 ? 'lift' : ''}"><circle cx="${x + 44}" cy="${58}" r="27" fill="${DK}" class="${i === 1 ? 'slide' : ''}"/><rect x="${x}" y="${30}" width="58" height="58" rx="2" fill="${c}"/><circle cx="${x + 29}" cy="${56}" r="${10 + i * 3}" fill="${i === 1 ? OX : CR}" opacity=".8"/></g>`).join('')}
    <rect x="8" y="92" width="204" height="7" rx="2" fill="#5A3620"/><rect x="8" y="92" width="204" height="1.5" fill="#E6C98A" opacity=".5"/>
    <style>.lift{animation:lift 3.2s var(--ease) infinite}.slide{animation:slide 3.2s var(--ease) infinite}@keyframes lift{0%,20%,100%{transform:translateY(0)}40%,75%{transform:translateY(-14px)}}@keyframes slide{0%,25%,100%{transform:translateX(0)}45%,72%{transform:translateX(22px)}}</style></svg>`,
  booth: () => `<svg viewBox="0 0 220 130"><rect x="10" y="44" width="200" height="44" rx="22" fill="#1A100A" stroke="${B}" stroke-opacity=".5"/>
    <g class="a-reel" style="--d:1.6s"><circle cx="34" cy="66" r="15" fill="#0E0C0B"/><circle cx="34" cy="66" r="11" fill="none" stroke="#2A2521"/><circle cx="34" cy="66" r="5" fill="${OX}"/><rect x="33" y="52" width="2" height="5" fill="${CR}" opacity=".5"/></g>
    <rect x="58" y="58" width="60" height="5" rx="2" fill="${CR}" opacity=".85"/><rect x="58" y="68" width="40" height="4" rx="2" fill="${B}" opacity=".6"/>
    ${[0, 1, 2, 3, 4, 5].map(i => `<rect class="a-grow" style="--d:${.6 + i * .13}s;animation-delay:${i * .1}s" x="${130 + i * 7}" y="54" width="4" height="24" rx="1.5" fill="${['#E27B58', '#B99DE2', '#7FC6B2', '#EAC46C', '#9FC5DF', '#E27B58'][i]}"/>`).join('')}
    <circle cx="190" cy="66" r="12" fill="${B}"/><path d="M186 60v12l10-6z" fill="${DK}"/>
    <path d="M60 30 q50 -18 100 0" fill="none" stroke="${B}" stroke-dasharray="3 4" opacity=".6"/><path d="M154 24l6 6-8 2" fill="none" stroke="${B}" opacity=".6"/></svg>`,
  cutting: () => `<svg viewBox="0 0 220 130"><defs><clipPath id="fs"><rect x="6" y="34" width="208" height="56"/></clipPath></defs>
    <g clip-path="url(#fs)"><g class="a-sweep" style="--d:4s;--sx:-44px">${Array.from({ length: 7 }, (_, i) => `<rect x="${6 + i * 44}" y="34" width="44" height="56" fill="#1A120C"/><rect x="${12 + i * 44}" y="44" width="32" height="36" fill="${['#3E6F95', '#B8694D', '#7FC6B2', '#EAC46C', '#6D51A0', '#3E6F95', '#B8694D'][i]}" opacity=".75"/>${[0, 1, 2, 3].map(k => `<rect x="${10 + i * 44 + k * 10}" y="36" width="5" height="4" rx="1" fill="${CR}" opacity=".5"/><rect x="${10 + i * 44 + k * 10}" y="84" width="5" height="4" rx="1" fill="${CR}" opacity=".5"/>`).join('')}`).join('')}</g></g>
    <path d="M118 26 v76" stroke="#E27B58" stroke-width="3" stroke-linecap="round"/><text x="118" y="116" text-anchor="middle" font-family="Courier Prime,monospace" font-size="10" fill="#E27B58">REVEAL</text>
    <path d="M186 26 v76" stroke="#EAC46C" stroke-width="3" stroke-linecap="round"/><text x="186" y="18" text-anchor="middle" font-family="Courier Prime,monospace" font-size="10" fill="#EAC46C">END CARD</text>
    <circle class="a-pulse" style="--d:2s" cx="118" cy="62" r="8" fill="none" stroke="#E27B58" stroke-width="2"/></svg>`,
  slip: () => `<svg viewBox="0 0 220 130"><g class="a-carriage"><rect x="66" y="6" width="88" height="54" fill="${CR}"/>${[0, 1, 2, 3].map(k => `<rect x="74" y="${16 + k * 9}" width="${[62, 48, 70, 30][k]}" height="3" fill="#271D14" opacity=".55"/>`).join('')}<rect x="54" y="52" width="112" height="8" rx="4" fill="#2A1B10"/></g>
    <path d="M40 66 h140 l18 44 H22z" fill="#2E1C11" stroke="${B}" stroke-opacity=".45"/>
    ${Array.from({ length: 3 }, (_, r) => Array.from({ length: 9 - r }, (_, k) => `<circle class="a-type" style="--d:${1.2 + ((k * 7 + r * 3) % 5) * .23}s;--dl:${((k + r) % 4) * .2}s" cx="${54 + r * 7 + k * 14}" cy="${78 + r * 10}" r="4.6" fill="${CR}" stroke="#1A100A"/>`).join('')).join('')}
    <rect x="80" y="104" width="60" height="5" rx="2.5" fill="${CR}" opacity=".7"/></svg>`,
  typewriter: () => ART.slip(),
  sax: () => `<svg viewBox="0 0 360 200"><g fill="none" stroke="${B}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(120 10)">
    <path d="M60 8 l14 -6 l4 7 l-14 7"/><path d="M66 12 C58 26 48 40 44 58 C38 84 38 110 38 130 C38 160 22 178 2 178 C-20 178 -32 162 -32 144 L-32 132"/>
    <path d="M-32 132 C-44 128 -52 118 -54 106 L-10 106 C-12 118 -20 128 -32 132Z" fill="rgba(214,178,106,.12)"/>
    ${[70, 88, 106, 124, 142].map(y => `<circle cx="48" cy="${y}" r="4" fill="rgba(214,178,106,.2)"/>`).join('')}</g>
    ${[0, 1, 2, 3].map(i => `<g class="a-rise" style="--d:3.6s;--dl:${i * .9}s"><ellipse cx="${80 - i * 12}" cy="${110 - i * 6}" rx="6" ry="4.6" transform="rotate(-20 ${80 - i * 12} ${110 - i * 6})" fill="${B}"/><path d="M${86 - i * 12} ${109 - i * 6} v-22" stroke="${B}" stroke-width="1.8"/></g>`).join('')}
    <path d="M40 188 H320" stroke="${B}" stroke-opacity=".35"/></svg>`,
};
export function mountArt(root = document) { root.querySelectorAll('[data-art]').forEach(el => { const f = ART[el.dataset.art]; if (f && !el.dataset.done) { el.innerHTML = f(); el.dataset.done = 1; } }); }
