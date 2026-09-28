// Room I: the record wall, the compass, and the flight of a record to the booth.
import { L, $, esc, cap, TAGS, reduce, clamp } from './lib.js';
import { drawCover } from './art.js';
import { discRect, peek } from './island.js';

let filter = 'all', pick = () => {}, heading = { x: .6, y: .5, touched: false };
export const compassState = heading;

export function initWall(onPick) {
  pick = onPick;
  renderFilters(); renderCrate(); initCompass();
  $('filters').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; filter = b.dataset.f; renderFilters(); applyFilter(); });
  const crate = $('crate');
  crate.addEventListener('click', e => { const s = e.target.closest('.sleeve'); if (!s) return; fly(s, () => pick(s.dataset.id, { play: true, from: 0 })); });
  crate.addEventListener('pointermove', e => { const s = e.target.closest('.sleeve'); if (!s) return; const r = s.getBoundingClientRect(); s.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 14 + 'deg'); });
  crate.addEventListener('pointerleave', () => crate.querySelectorAll('.sleeve').forEach(s => s.style.removeProperty('--ry')), true);
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { crate.querySelectorAll('.sleeve canvas').forEach(cv => drawCover(cv, L.byId[cv.closest('.sleeve').dataset.id])); drawPad(); }, 200); });
  if (document.fonts) document.fonts.ready.then(() => crate.querySelectorAll('.sleeve canvas').forEach(cv => drawCover(cv, L.byId[cv.closest('.sleeve').dataset.id])));
}
function renderFilters() { $('filters').innerHTML = TAGS.map(([k, v]) => `<button type="button" data-f="${k}" aria-pressed="${k === filter}">${v}</button>`).join(''); }
function applyFilter() {
  const sl = [...document.querySelectorAll('.sleeve')];
  sl.forEach(el => { const show = filter === 'all' || el.dataset.tags.split(' ').includes(filter); el.hidden = !show; });
}
function renderCrate() {
  $('crate').innerHTML = L.STYLES.map(c => `<button class="sleeve${c.tags.includes('avoid') ? ' avoid' : ''}" type="button" data-id="${c.id}" data-tags="${c.tags.join(' ')}" style="--lab:${c.labelCol}" aria-label="Play ${esc(c.title)}, ${c.bpm} BPM">
      <span class="art"><span class="disc"></span><span class="cover"><canvas aria-hidden="true"></canvas><span class="wear"></span></span></span>
      <span class="meta"><span class="ttl">${esc(c.title)}</span><span class="sub">${esc(cap(c.mood))}</span><span class="no"><span>CL–${String(c.no).padStart(2, '0')}</span><span>${c.bpm} BPM · ${esc(c.key)}</span></span></span></button>`).join('');
  requestAnimationFrame(() => {
    document.querySelectorAll('.sleeve').forEach(s => { drawCover(s.querySelector('canvas'), L.byId[s.dataset.id]); s.style.setProperty('--meta-h', s.querySelector('.meta').offsetHeight + 'px'); });
  });
  applyFilter();
}
export function markCurrent(id) { document.querySelectorAll('.sleeve').forEach(s => s.classList.toggle('cur', s.dataset.id === id)); }

/* ---------- the flight: disc slides out of its sleeve and arcs down into the booth ---------- */
function fly(sleeve, then) {
  const disc = sleeve.querySelector('.disc');
  if (reduce) { then(); peek(); return; }
  const a = disc.getBoundingClientRect(), b = discRect();
  const lab = getComputedStyle(sleeve).getPropertyValue('--lab');
  const f = document.createElement('div'); f.className = 'flyer'; f.style.setProperty('--lab', lab);
  Object.assign(f.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
  const sh = document.createElement('div'); sh.className = 'flyshadow';
  Object.assign(sh.style, { left: a.left + 'px', top: (a.top + a.height * .85) + 'px', width: a.width + 'px', height: a.height * .3 + 'px' });
  document.body.append(sh, f); disc.style.visibility = 'hidden';
  const x0 = 0, y0 = 0, x2 = b.left + b.width / 2 - (a.left + a.width / 2), y2 = b.top + b.height / 2 - (a.top + a.height / 2);
  const x1 = x2 * .5 + (x2 > 0 ? -60 : 60), y1 = Math.min(y0, y2) - Math.max(140, Math.abs(y2) * .35);
  const s2 = b.width / a.width, dist = Math.hypot(x2, y2), dur = clamp(620 + dist * .45, 700, 1150);
  const kf = [], ks = [], N = 28;
  for (let i = 0; i <= N; i++) {
    const p = i / N, e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * x1 + e * e * x2, y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * y1 + e * e * y2;
    const s = 1 + (s2 - 1) * e + Math.sin(p * Math.PI) * .12, r = 40 + e * 680;
    kf.push({ transform: `translate(${x}px,${y}px) scale(${s}) rotate(${r}deg)`, offset: p });
    const lift = Math.sin(p * Math.PI);
    ks.push({ transform: `translate(${x}px,${y2 * e + 40 * lift}px) scale(${(1 + (s2 - 1) * e) * (1 - lift * .3)})`, opacity: .9 - lift * .6, offset: p });
  }
  // first a short pull out of the sleeve, then the arc
  disc.style.visibility = 'hidden';
  const pull = f.animate([{ transform: 'translateX(0) rotate(0deg)' }, { transform: `translateX(${a.width * .38}px) rotate(40deg)` }], { duration: 260, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
  sleeve.classList.add('pulling');
  pull.onfinish = () => {
    kf.forEach(k => k.transform = k.transform.replace('translate(', `translate(${a.width * .38}px,0) translate(`));
    const anim = f.animate(kf, { duration: dur, easing: 'linear', fill: 'forwards' });
    sh.animate(ks, { duration: dur, easing: 'linear', fill: 'forwards' });
    anim.onfinish = () => {
      f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).onfinish = () => { f.remove(); sh.remove(); };
      disc.style.visibility = ''; sleeve.classList.remove('pulling'); peek(); then();
    };
  };
}

/* ---------- the compass: steer by feeling ---------- */
const CORNERS = {
  hh: ['intimate', 'honest', 'cozy', 'unhurried'],       // hushed, played by hand
  hm: ['calm', 'spacious', 'precise', 'glassy'],          // hushed, built by machine
  ch: ['joyful', 'warm', 'bouncy', 'epic'],               // charged, played by hand
  cm: ['electric', 'euphoric', 'aggressive', 'neon'],     // charged, built by machine
};
function headingWords(x, y) {
  const w = { hh: (1 - x) * (1 - y), hm: (1 - x) * y, ch: x * (1 - y), cm: x * y };
  const ranked = Object.entries(w).sort((a, b) => b[1] - a[1]);
  const words = [CORNERS[ranked[0][0]][0], CORNERS[ranked[0][0]][1], ranked[1][1] > .2 ? CORNERS[ranked[1][0]][0] : CORNERS[ranked[0][0]][2]];
  if (Math.abs(x - .5) < .14 && Math.abs(y - .5) < .14) return ['confident', 'modern', 'balanced'];
  return [...new Set(words)];
}
export function headingText() { const w = headingWords(heading.x, heading.y); return `${w.join(', ')}; energy ${Math.round(heading.x * 9 + 1)}/10, ${heading.y > .6 ? 'synthetic' : heading.y < .4 ? 'organic' : 'part played, part programmed'}`; }
export function nearest(x = heading.x, y = heading.y, n = 3) {
  return L.STYLES.filter(c => !c.tags.includes('avoid')).map(c => ({ c, d: Math.hypot(c.energy - x, c.machine - y) })).sort((a, b) => a.d - b.d).slice(0, n);
}
let padEl, needleEl, dimT;
function initCompass() {
  padEl = $('pad'); needleEl = $('needle');
  const set = (cx, cy, fromUser) => {
    const r = padEl.getBoundingClientRect();
    heading.x = clamp((cx - r.left) / r.width, .02, .98); heading.y = clamp(1 - (cy - r.top) / r.height, .02, .98);
    if (fromUser) heading.touched = true; update(fromUser);
  };
  padEl.addEventListener('pointerdown', e => { padEl.setPointerCapture(e.pointerId); padEl.classList.add('drag'); set(e.clientX, e.clientY, true); });
  padEl.addEventListener('pointermove', e => { if (padEl.hasPointerCapture(e.pointerId)) set(e.clientX, e.clientY, true); });
  const end = () => { padEl.classList.remove('drag'); clearTimeout(dimT); dimT = setTimeout(() => document.querySelectorAll('.sleeve.dim').forEach(s => s.classList.remove('dim')), 1800); };
  padEl.addEventListener('pointerup', end); padEl.addEventListener('pointercancel', end);
  padEl.addEventListener('keydown', e => { const k = { ArrowLeft: [-.05, 0], ArrowRight: [.05, 0], ArrowUp: [0, .05], ArrowDown: [0, -.05] }[e.key]; if (!k) return; e.preventDefault();
    heading.x = clamp(heading.x + k[0], .02, .98); heading.y = clamp(heading.y + k[1], .02, .98); heading.touched = true; update(true); end(); });
  $('closest').addEventListener('click', e => { const b = e.target.closest('button'); if (b) pick(b.dataset.id, { play: true, from: 0 }); });
  $('playClosest').addEventListener('click', () => { const n = nearest()[0]; if (n) pick(n.c.id, { play: true, from: 0 }); });
  drawPad(); update(false);
}
function update(fromUser) {
  needleEl.style.left = heading.x * 100 + '%'; needleEl.style.top = (1 - heading.y) * 100 + '%';
  const words = headingWords(heading.x, heading.y); $('headingWords').textContent = cap(words.join(', '));
  padEl.setAttribute('aria-valuetext', words.join(', '));
  const ns = nearest();
  $('closest').innerHTML = ns.map(({ c, d }) => `<li><button type="button" data-id="${c.id}"><span class="sw" style="background:${c.palette[1]}"></span>${esc(c.title)}<span class="d">${c.bpm} BPM</span></button></li>`).join('');
  if (fromUser) {
    const ids = new Set(ns.map(n => n.c.id));
    document.querySelectorAll('.sleeve').forEach(s => { s.classList.toggle('near', ids.has(s.dataset.id)); s.classList.toggle('dim', !ids.has(s.dataset.id)); });
  }
  drawPad();
}
function drawPad() {
  const cv = $('padCanvas'); if (!cv) return; const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d); const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  // parchment chart
  const bg = g.createRadialGradient(W / 2, H / 2, W * .1, W / 2, H / 2, W * .75); bg.addColorStop(0, '#F1E6CC'); bg.addColorStop(1, '#D9C8A2'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // warm and cool washes in the quadrants
  [[0, 1, '232,160,120'], [1, 1, '160,120,200'], [0, 0, '200,170,110'], [1, 0, '120,170,190']].forEach(([qx, qy, col]) => { const gx = qx * W, gy = qy * H; const gr = g.createRadialGradient(gx, gy, 0, gx, gy, W * .7); gr.addColorStop(0, `rgba(${col},.28)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  g.strokeStyle = 'rgba(39,29,20,.12)'; g.lineWidth = d; for (let k = 1; k < 8; k++) { g.beginPath(); g.moveTo(k * W / 8, 0); g.lineTo(k * W / 8, H); g.moveTo(0, k * H / 8); g.lineTo(W, k * H / 8); g.stroke(); }
  g.strokeStyle = 'rgba(39,29,20,.35)'; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
  // compass rose
  g.save(); g.translate(W / 2, H / 2); g.strokeStyle = 'rgba(124,43,34,.35)'; g.fillStyle = 'rgba(124,43,34,.12)';
  for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, 0); g.lineTo(W * .02, -W * (k % 2 ? .07 : .13)); g.lineTo(-W * .02, -W * (k % 2 ? .07 : .13)); g.closePath(); g.fill(); g.stroke(); }
  g.beginPath(); g.arc(0, 0, W * .18, 0, Math.PI * 2); g.stroke(); g.restore();
  // quadrant words
  g.font = `italic ${13 * d}px "Cormorant Garamond", Georgia, serif`; g.fillStyle = 'rgba(39,29,20,.5)';
  g.textAlign = 'left'; g.fillText('intimate', 30 * d, H - 30 * d); g.fillText('precise', 30 * d, 36 * d);
  g.textAlign = 'right'; g.fillText('joyful', W - 30 * d, H - 30 * d); g.fillText('electric', W - 30 * d, 36 * d);
  // the records as little vinyls on the chart
  const near = new Set(nearest().map(n => n.c.id));
  L.STYLES.forEach(c => { const x = c.energy * W, y = (1 - c.machine) * H, rr = (near.has(c.id) ? 8.5 : 6) * d, avoid = c.tags.includes('avoid');
    if (near.has(c.id)) { g.strokeStyle = 'rgba(124,43,34,.5)'; g.setLineDash([2 * d, 3 * d]); g.beginPath(); g.moveTo(heading.x * W, (1 - heading.y) * H); g.lineTo(x, y); g.stroke(); g.setLineDash([]); }
    g.globalAlpha = avoid ? .35 : 1; g.fillStyle = '#15110E'; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill();
    g.fillStyle = c.palette[1]; g.beginPath(); g.arc(x, y, rr * .45, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    if (near.has(c.id)) { g.font = `600 ${11 * d}px "Cormorant Garamond", Georgia, serif`; g.fillStyle = '#271D14'; g.textAlign = x > W * .6 ? 'right' : 'left'; g.fillText(c.title.replace(/\s*\/.*$/, ''), x + (x > W * .6 ? -12 : 12) * d, y + 4 * d); }
  });
}
