// The listening booth, floating at the foot of every page.
import * as E from './engine.js?v=3';
import { L, $, esc, cap, fmt, hexA, reduce, LANE_COL, LANE_NAME, EFF_COL, EFF_INK, LANE_INK, copyText, recordBrief, toast } from './lib.js?v=3';

const IVORY = '#EFE6D2', BRASS = '#D6B26A';
const icon = {
  play: '<svg class="ip" viewBox="0 0 16 16"><path d="M4.5 2.5v11l9-5.5z"/></svg><svg class="ipa" viewBox="0 0 16 16"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>',
  prev: '<svg viewBox="0 0 16 16"><path d="M3 2.5h2v11H3zM14 2.5v11L6 8z"/></svg>', next: '<svg viewBox="0 0 16 16"><path d="M11 2.5h2v11h-2zM2 2.5v11L10 8z"/></svg>',
  up: '<svg viewBox="0 0 16 16"><path d="M3 10.5 8 5.5l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pin: '<svg viewBox="0 0 16 16"><path d="M9.5 1.5l5 5-2 1-2.5 2.5.5 3-1.5 1.5-3-3-3.5 3.5-.8-.8 3.5-3.5-3-3L4 5.2l3 .5L9.5 3.2z"/></svg>',
};
let el = {}, open = false, pinned = false, closeT = 0, openT = 0, shownUpTo = -1, lastBeat = -1, hooks = {};
export function onIsland(name, fn) { hooks[name] = fn; }

export function buildIsland() {
  const root = $('island');
  root.innerHTML = `
  <div class="isl-bento" id="bento" aria-hidden="true">
    <div class="tile baize t-deck"><div class="tt" id="tt"><div class="plat"><div class="rec"><div class="lab"><b id="ttLab"></b></div></div></div><div class="strobe"></div>
      <div class="arm"><svg viewBox="0 0 60 180"><circle cx="42" cy="16" r="12" fill="#2A2420" stroke="#9A948A"/><circle cx="42" cy="16" r="4" fill="#D6B26A"/><path d="M42 16 L42 118 L22 160" stroke="#E4DED2" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="10" y="154" width="20" height="12" rx="2" transform="rotate(28 20 160)" fill="#1A1816"/></svg></div>
      <div class="knob"><i></i><i></i></div><span class="speed">33⅓</span></div></div>
    <div class="tile walnut t-now"><span class="label">Now playing</span><span class="np-cat" id="npCat"></span><h4 class="np-title" id="npTitle"></h4><p class="np-note" id="npNote"></p>
      <div class="np-row"><div><div class="facts" id="npFacts"></div><div class="counter"><span>BAR <b id="barN">01</b> · BEAT <b id="beatN">1</b> · <span id="clock">0:00.0</span></span><span class="beats" id="beats"><i></i><i></i><i></i><i></i></span></div></div>
        <div class="vus">${['Level', 'Low end'].map((n, i) => `<div class="vu"><svg viewBox="0 0 84 56"><path d="M10 40 A36 36 0 0 1 74 40" fill="none" stroke="#3A2A14" stroke-width="1"/><path d="M58 22 A36 36 0 0 1 74 40" fill="none" stroke="#9C3122" stroke-width="3"/>${Array.from({ length: 9 }, (_, k) => { const a = (-48 + k * 12) * Math.PI / 180; return `<path d="M${42 + Math.sin(a) * 30} ${60 - Math.cos(a) * 30} L${42 + Math.sin(a) * 35} ${60 - Math.cos(a) * 35}" stroke="#3A2A14" stroke-width="${k % 2 ? .8 : 1.4}"/>`; }).join('')}<g class="ndl" id="vu${i}"><path d="M42 60 L42 16" stroke="#7C2B22" stroke-width="1.8" stroke-linecap="round"/></g><circle cx="42" cy="60" r="6" fill="#2A1B0C"/></svg><span>${n}</span></div>`).join('')}</div></div></div>
    <div class="tile cream t-moment"><span class="label">This moment</span><div class="mcard" id="mcard"></div></div>
    <div class="tile baize t-score" id="scoreTile"><span class="label">The score · each row is one part of the band</span><canvas id="timeline" aria-label="Every note, one row per part, scrolling through the playhead"></canvas><div class="dimmer" id="dim"></div><div class="flash" id="ff"></div><div class="bigword" id="bigword"></div></div>
    <div class="tile walnut t-mixer"><span class="label">The mixing desk</span><div class="strips" id="strips"></div><p class="mix-hint">S plays a part alone · M silences it</p></div>
    <div class="tile glass t-spec"><span class="label">The spectrum · low notes left, high notes right</span><canvas id="spectrum" aria-label="Equaliser, each colour is one part"></canvas></div>
    <div class="tile walnut t-order"><span class="label">Running order</span><ol class="order" id="order"></ol></div>
    <div class="tile walnut t-take"><span class="label">Take it away</span><div class="take" id="take"></div></div>
  </div>
  <div class="isl-bar" id="islBar">
    <span class="isl-hint">Hover to open the listening booth</span>
    <span class="mini-disc" id="miniDisc"></span>
    <div class="mini-t"><b id="miniTitle">The Cue Library</b><span id="miniSub">Choose a record</span></div>
    <div class="ticker" id="ticker"><div class="tk" id="tk"></div></div>
    <canvas class="mini-eq" id="miniEq" aria-hidden="true"></canvas>
    <button class="tbtn prev" type="button" data-isl="prev" aria-label="Previous record">${icon.prev}</button>
    <button class="play" type="button" id="play" aria-label="Play">${icon.play}</button>
    <button class="tbtn next" type="button" data-isl="next" aria-label="Next record">${icon.next}</button>
    <button class="tbtn pin" type="button" data-isl="pin" aria-pressed="false" aria-label="Keep the booth open">${icon.pin}</button>
    <button class="tbtn expander" type="button" data-isl="toggle" aria-label="Open the listening booth" aria-expanded="false">${icon.up}</button>
    <div class="isl-prog" id="prog"><div class="bar"></div></div>
  </div>`;
  ['bento', 'npCat', 'npTitle', 'npNote', 'npFacts', 'barN', 'beatN', 'clock', 'beats', 'mcard', 'timeline', 'spectrum', 'dim', 'ff', 'bigword', 'strips', 'order', 'take', 'miniDisc', 'miniTitle', 'miniSub', 'tk', 'miniEq', 'play', 'prog', 'tt', 'ttLab', 'vu0', 'vu1'].forEach(k => el[k] = $(k));
  el.root = root;

  // open on hover, close when the pointer leaves (unless pinned)
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) {
    root.addEventListener('mouseenter', () => { clearTimeout(closeT); openT = setTimeout(() => setOpen(true), 110); });
    root.addEventListener('mouseleave', () => { clearTimeout(openT); if (!pinned) closeT = setTimeout(() => setOpen(false), 420); });
  }
  root.addEventListener('focusin', () => { clearTimeout(closeT); });
  root.addEventListener('click', e => {
    const b = e.target.closest('button,a');
    if (!b) { if (e.target.closest('#islBar')) setOpen(!open); return; }
    if (b.id === 'play') { if (!E.state.clip) return; E.toggle(); return; }
    const a = b.dataset.isl;
    if (a === 'toggle') { setOpen(!open); if (!open) pinned = false; return; }
    if (a === 'pin') { pinned = !pinned; b.setAttribute('aria-pressed', pinned); toast(pinned ? 'The booth stays open' : 'The booth closes when you leave it'); return; }
    if (a === 'prev' || a === 'next') { step(a === 'next' ? 1 : -1); return; }
    const ms = b.closest('.strip .ms button'); if (ms) { const k = ms.closest('.strip').dataset.lane; E.toggleLane(k, ms.dataset.act); return; }
    const ob = b.closest('#order button'); if (ob) { const m = E.state.clip.moments[+ob.dataset.i]; const at = Math.max(0, m.t - 1.2); E.state.playing ? E.seek(at) : E.play({ from: at }); return; }
    if (b.dataset.term) { setOpen(false); pinned = false; hooks.showTerm && hooks.showTerm(b.dataset.term); return; }
    const t = b.dataset.take;
    if (t === 'prompt') copyText(E.state.clip.prompt || recordBrief(E.state.clip), 'Prompt');
    if (t === 'brief') copyText(recordBrief(E.state.clip), 'Brief');
    if (t === 'slip') hooks.pinRecord && hooks.pinRecord(E.state.clip);
    if (t === 'fit') { setOpen(false); pinned = false; hooks.fitRecord && hooks.fitRecord(E.state.clip); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && open) { pinned = false; setOpen(false); }
    if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (e.code === 'Space' && !(e.target.closest && e.target.closest('button,a,summary,[role=slider]'))) { e.preventDefault(); if (E.state.clip) E.toggle(); }
    if (!E.state.clip) return;
    if (e.key === 'ArrowRight' && open) E.seek(E.now() + 240 / E.state.clip.bpm);
    if (e.key === 'ArrowLeft' && open) E.seek(E.now() - 240 / E.state.clip.bpm);
  });
  el.timeline.addEventListener('click', e => { const c = E.state.clip; if (!c) return; const r = el.timeline.getBoundingClientRect(), spb = 240 / c.bpm, pps = r.width / (4.2 * spb); E.seek(E.now() + (e.clientX - r.left - r.width * .24) / pps); });

  E.on('clip', renderClip); E.on('mix', renderMix);
  E.on('play', () => { resetMoments(E.now()); el.tt.style.setProperty('--arm', '-4deg'); });
  E.on('pause', () => el.tt.style.setProperty('--arm', '18deg'));
  E.on('seek', t => resetMoments(t));
  E.on('loading', v => el.play.classList.toggle('loading', v));
  E.on('error', msg => toast(msg));
  E.on('ended', () => { el.tt.style.setProperty('--arm', '18deg'); });
  requestAnimationFrame(tick);
}

export function setOpen(v) {
  if (v === open) return; open = v;
  el.root.dataset.state = v ? 'open' : 'mini';
  el.root.querySelector('[data-isl="toggle"]').setAttribute('aria-expanded', v);
  el.bento.setAttribute('aria-hidden', !v);
  if (v) setTimeout(() => { drawTimeline(); drawSpectrum(true); }, 60);
}
export function isOpen() { return open; }
export function peek() { el.root.classList.remove('peek'); void el.root.offsetWidth; el.root.classList.add('peek'); el.miniDisc.classList.remove('land'); void el.miniDisc.offsetWidth; el.miniDisc.classList.add('land'); setTimeout(() => el.root.classList.remove('peek'), 1400); }
export function discRect() { return el.miniDisc.getBoundingClientRect(); }

function step(d) {
  const list = L.STYLES; const c = E.state.clip; let i = list.indexOf(c);
  i = i < 0 ? 0 : (i + d + list.length) % list.length;
  hooks.select ? hooks.select(list[i].id, { play: true }) : (E.select(list[i]), E.play({ from: 0 }));
}

/* ---------- a record arrives ---------- */
function renderClip(c) {
  const isStyle = c.kind === 'style';
  el.root.style.setProperty('--lab', c.labelCol);
  el.tt.style.setProperty('--lab', c.labelCol);
  el.ttLab.textContent = c.title.replace(/\s*\(.*\)$/, '');
  el.miniTitle.textContent = c.title;
  el.miniSub.textContent = `${c.bpm} BPM · ${c.key || 'an example'} · ${fmt(c.dur)}`;
  el.npCat.textContent = isStyle ? `Record no. ${String(c.no).padStart(2, '0')} · ${c.key}` : `From the lexicon · an example`;
  el.npTitle.textContent = c.title;
  el.npNote.textContent = isStyle ? c.note : c.body;
  el.npFacts.innerHTML = `<b>${c.bpm}</b> BPM · <b>${c.music}</b> bars + ending · <b>${c.lanes.length}</b> parts`;
  el.strips.innerHTML = c.lanes.map(l => `<div class="strip" data-lane="${l.id}" style="--c:${LANE_COL[l.id]}"><div class="meter"><i></i></div><span class="nm">${LANE_NAME[l.id]}</span>
    <span class="ms"><button type="button" data-act="solo" aria-pressed="false" aria-label="Play ${LANE_NAME[l.id]} alone">S</button><button type="button" data-act="mute" aria-pressed="false" aria-label="Silence ${LANE_NAME[l.id]}">M</button></span></div>`).join('');
  el.order.innerHTML = c.moments.map((m, i) => `<li><button type="button" data-i="${i}"><span class="tm">${fmt(m.t)}</span><span>${esc(m.title)}</span></button></li>`).join('');
  el.take.innerHTML = (isStyle ? `<button class="pri" type="button" data-take="prompt">Copy the AI prompt</button><button type="button" data-take="brief">Copy the full brief</button>` : '') +
    `<button type="button" data-take="slip">Pin to the call slip</button>` + (isStyle ? `<button type="button" data-take="fit">Fit it to my film</button>` : '') +
    `<a href="${c.url}" target="_blank" rel="noopener">Open the score in Strudel ↗</a>`;
  el.prog.querySelectorAll('i').forEach(n => n.remove());
  c.moments.filter(m => ['drop', 'silence', 'button', 'hit'].includes(m.effect)).forEach(m => { const i = document.createElement('i'); i.style.left = (m.t / c.dur * 100) + '%'; i.style.setProperty('--c', EFF_COL[m.effect]); el.prog.appendChild(i); });
  resetMoments(0); drawTimeline(); drawSpectrum(true); updateCounter(0);
  renderMix(E.state.lanes);
}
function renderMix(lanes) {
  for (const [k, st] of Object.entries(lanes)) {
    const s = el.strips.querySelector(`.strip[data-lane="${k}"]`); if (!s) continue;
    s.classList.toggle('off', !st.on);
    s.querySelector('[data-act="solo"]').setAttribute('aria-pressed', !!st.solo);
    s.querySelector('[data-act="mute"]').setAttribute('aria-pressed', !!st.mute);
  }
}

/* ---------- moments: named the instant they happen ---------- */
const colorFor = m => m.lane ? LANE_COL[m.lane] : (EFF_COL[m.effect] || BRASS);
const inkFor = m => m.lane ? LANE_INK[m.lane] : (EFF_INK[m.effect] || '#7C2B22');
function resetMoments(t) {
  const c = E.state.clip; if (!c) return;
  shownUpTo = -1; c.moments.forEach((m, i) => { if (m.t <= t - .05) shownUpTo = i; });
  if (shownUpTo >= 0) showMoment(c.moments.filter(m => Math.abs(m.t - c.moments[shownUpTo].t) < .02), true);
  else {
    const up = [...new Set(c.moments.map(m => m.title.toLowerCase()))].slice(0, 4);
    setCard(`<span class="mstamp">${fmt(0)}</span><h5 style="--mc:#8A7A64">Coming up</h5><p>${esc(cap(up.join(', ')))}.</p><p class="why">Each moment is named here the instant it happens.</p>`);
    setTicker(`<b style="--tc:${BRASS}">${esc(c.title)}.</b>${esc(c.kind === 'style' ? c.note : 'Press play to hear the example.')}`);
  }
  markOrder();
}
function setCard(html) {
  const card = el.mcard; card.classList.add('out');
  setTimeout(() => { card.innerHTML = html; card.classList.remove('out'); card.classList.add('pre'); void card.offsetWidth; card.classList.remove('pre'); }, reduce ? 0 : 160);
}
function setTicker(html) {
  const tk = el.tk; tk.classList.add('out');
  setTimeout(() => { tk.innerHTML = html; tk.classList.remove('out'); tk.classList.add('pre'); void tk.offsetWidth; tk.classList.remove('pre'); }, reduce ? 0 : 200);
}
function showMoment(ms, quiet) {
  const main = ms.find(m => ['drop', 'silence', 'button', 'hit'].includes(m.effect)) || ms[0];
  const extra = ms.filter(m => m !== main);
  setCard(`<span class="mstamp">${fmt(main.t)}</span><h5 style="--mc:${inkFor(main)}">${esc(main.title)}</h5><p>${esc(main.text)}${extra.map(m => ` <b style="color:${inkFor(m)}">${esc(m.title)}.</b> ${esc(m.text)}`).join('')}</p><p class="why">${esc(main.why)}</p>${main.term && L.GLOSS[main.term] ? `<button class="look" type="button" data-term="${main.term}">Look it up in the lexicon →</button>` : ''}`);
  setTicker(`<b style="--tc:${colorFor(main)}">${esc(main.title)}</b>${esc(main.text)}`);
  markOrder();
  if (!quiet) { ms.forEach(fire); hooks.moment && hooks.moment(main); }
}
let fx = { ring: null, flashLane: null, flashT: 0 };
function word(txt, col) { const w = el.bigword; w.textContent = txt; w.style.color = col; w.classList.remove('go'); void w.offsetWidth; w.classList.add('go'); }
function fire(m) {
  if (reduce) return;
  if (['drop', 'hit', 'button'].includes(m.effect)) {
    const f = el.ff; f.style.setProperty('--fc', colorFor(m)); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    fx.ring = { t: performance.now(), color: colorFor(m), big: m.effect !== 'button' };
    word(m.effect === 'drop' ? 'the drop' : m.effect === 'button' ? 'the button' : 'impact', colorFor(m));
  }
  if (m.effect === 'silence') { el.dim.classList.add('on'); word('silence', IVORY); setTimeout(() => el.dim.classList.remove('on'), 60000 / E.state.clip.bpm * .95); }
  if (m.effect === 'riser') word('rising', LANE_COL.fx);
  const lanes = m.lanes || (m.lane ? [m.lane] : []);
  lanes.forEach(k => { const s = el.strips.querySelector(`.strip[data-lane="${k}"]`); if (s) { s.classList.remove('pulse'); void s.offsetWidth; s.classList.add('pulse'); } });
  if (lanes.length) { fx.flashLane = lanes; fx.flashT = performance.now(); }
}
function markOrder() { el.order.querySelectorAll('button').forEach((b, i) => b.classList.toggle('cur', i === shownUpTo)); const cur = el.order.querySelector('.cur'); if (cur && open) cur.scrollIntoView({ block: 'nearest' }); }

/* ---------- drawing ---------- */
function fit(cv) { const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } return [w, h, d]; }
function rr(g, x, y, w, h, r) { if (w <= 0 || h <= 0) { g.beginPath(); return; } r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawTimeline() {
  const c = E.state.clip; if (!c) return; const TL = el.timeline;
  const [W, H, d] = fit(TL); const g = TL.getContext('2d');
  const t = E.now(), spb = 240 / c.bpm, beat = spb / 4, pps = W / (4.2 * spb), px = W * .24, X = tt => px + (tt - t) * pps;
  g.clearRect(0, 0, W, H);
  const top = 58 * d, bot = H - 14 * d, lanes = c.lanes, lh = (bot - top) / lanes.length;
  g.font = `600 ${10.5 * d}px "Cormorant Garamond", Georgia, serif`;
  for (const [label, a, b] of c.seg) {
    const x0 = X((a - 1) * spb), x1 = X(b * spb); if (x1 < 0 || x0 > W) continue;
    const hot = /drop|hit|button/i.test(label);
    g.fillStyle = hot ? hexA(LANE_COL.drums, .07) : 'rgba(240,231,214,.02)'; g.fillRect(x0, top - 8 * d, x1 - x0 - 2 * d, bot - top + 8 * d);
    g.fillStyle = hot ? LANE_COL.drums : 'rgba(240,231,214,.55)'; g.fillText(label.toUpperCase().split('').join(' '), Math.max(x0 + 8 * d, 6 * d), 46 * d);
  }
  const b0 = Math.floor((t - px / pps) / beat) - 1, b1 = Math.ceil((t + (W - px) / pps) / beat) + 1;
  g.font = `${10 * d}px "Courier Prime", monospace`;
  for (let k = Math.max(0, b0); k <= b1; k++) { const x = X(k * beat), isBar = k % 4 === 0;
    g.fillStyle = isBar ? 'rgba(240,231,214,.13)' : 'rgba(240,231,214,.045)'; g.fillRect(x, top, d, bot - top);
    if (isBar) { g.fillStyle = 'rgba(214,178,106,.7)'; g.fillText(String(k / 4 + 1), x + 4 * d, top + 11 * d); } }
  const flashAge = (performance.now() - fx.flashT) / 900;
  lanes.forEach((l, i) => {
    const y0 = top + i * lh, st = E.state.lanes[l.id], col = LANE_COL[l.id], on = st.on !== false;
    g.fillStyle = hexA(col, .03 + Math.min(.1, (st.level || 0) * .2)); g.fillRect(0, y0 + d, W, lh - 2 * d);
    if (fx.flashLane && fx.flashLane.includes(l.id) && flashAge < 1) { const sweep = W - (W - px) * Math.min(1, flashAge * 1.6);
      const gr = g.createLinearGradient(sweep, 0, W, 0); gr.addColorStop(0, hexA(col, .3 * (1 - flashAge))); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(sweep, y0, W - sweep, lh); }
    for (const e of l.events) {
      const [et, ed, row, vel] = e, x = X(et), w = Math.max(3 * d, ed * pps - d); if (x > W || x + w < 0) continue;
      const y = y0 + lh * (1 - row) * .86 + lh * .07, past = et + ed < t, active = et <= t && t < et + Math.max(ed, .12);
      g.fillStyle = hexA(col, on ? (past ? .22 : .92) * (.5 + .5 * vel) : .1);
      if (active && on) { g.shadowColor = col; g.shadowBlur = 14 * d; } else g.shadowBlur = 0;
      if (l.id === 'drums') { const r = (active ? 5.5 : 3.8) * d * (.75 + .45 * vel); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
      else if (l.id === 'fx') { const hh = Math.max(3 * d, (lh - 12 * d) * vel); g.fillRect(x, y0 + lh - 5 * d - hh, Math.max(2 * d, w * .8), hh); }
      else { const hh = (active ? 8 : 5) * d; rr(g, x, y - hh / 2, w, hh, 2.5 * d); g.fill(); }
      if (on && t - et >= 0 && t - et < .2) { const k = (t - et) / .2; g.shadowBlur = 0; g.strokeStyle = hexA(col, .7 * (1 - k)); g.lineWidth = 1.5 * d; g.beginPath(); g.arc(px, y, (5 + 16 * k) * d, 0, Math.PI * 2); g.stroke(); }
    }
    g.shadowBlur = 0; g.fillStyle = hexA(col, on ? .95 : .4); g.font = `italic 600 ${14 * d}px "Cormorant Garamond", Georgia, serif`; g.fillText(LANE_NAME[l.id], 12 * d, y0 + 16 * d);
  });
  const rows = [-1e9, -1e9, -1e9];
  c.moments.forEach(m => { const x = X(m.t); if (x < -40 || x > W + 10) return; const col = colorFor(m);
    g.strokeStyle = hexA(col, .55); g.setLineDash([3 * d, 5 * d]); g.lineWidth = d; g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke(); g.setLineDash([]);
    if (m.effect === 'silence') { g.fillStyle = 'rgba(240,231,214,.05)'; g.fillRect(x, top, beat * pps, bot - top); }
    if (x > px + 2) { const lbl = m.title; g.font = `italic 600 ${14 * d}px "Cormorant Garamond", Georgia, serif`; const tw = g.measureText(lbl).width + 14 * d;
      let r = rows.findIndex(end => x > end + 4 * d); if (r < 0) return; rows[r] = x + tw; const yb = bot - 22 * d - r * 22 * d;
      g.fillStyle = hexA(col, .95); rr(g, x, yb, tw, 19 * d, 9.5 * d); g.fill(); g.fillStyle = '#12100C'; g.fillText(lbl, x + 7 * d, yb + 14 * d); } });
  g.fillStyle = IVORY; g.fillRect(px - d, top - 8 * d, 2 * d, bot - top + 8 * d);
  if (fx.ring) { const k = (performance.now() - fx.ring.t) / 850; if (k > 1) fx.ring = null; else {
    g.strokeStyle = hexA(fx.ring.color, .85 * (1 - k)); g.lineWidth = (6 - 5 * k) * d; g.beginPath(); g.arc(px, (top + bot) / 2, (18 + (fx.ring.big ? 500 : 220) * k) * d, 0, Math.PI * 2); g.stroke(); } }
  if (!E.state.playing && t < .01) { g.fillStyle = 'rgba(240,231,214,.78)'; g.font = `italic ${19 * d}px "Cormorant Garamond", Georgia, serif`; g.fillText('Press play. The notes scroll through this line.', px + 16 * d, top + 38 * d); }
}
const NB = 40, FMIN = 30, FMAX = 16000;
const edges = Array.from({ length: NB + 1 }, (_, i) => FMIN * Math.pow(FMAX / FMIN, i / NB));
let spec = new Float32Array(NB), peaks = new Float32Array(NB), shares = Array.from({ length: NB }, () => ({}));
function analyse() {
  const c = E.state.clip; if (!c) return;
  const live = E.state.playing;
  if (live) {
    const ny = E.sampleRate() / 2, per = {};
    for (const l of c.lanes) { const st = E.state.lanes[l.id]; if (!st.analyser) continue;
      st.analyser.getFloatFrequencyData(st.freq); const arr = new Float32Array(NB), n = st.freq.length;
      for (let b = 0; b < NB; b++) { const i0 = Math.floor(edges[b] / ny * n), i1 = Math.max(i0 + 1, Math.floor(edges[b + 1] / ny * n)); let s = 0;
        for (let i = i0; i < i1 && i < n; i++) s += Math.pow(10, st.freq[i] / 20); arr[b] = st.on ? s / (i1 - i0) : 0; }
      per[l.id] = arr; }
    for (let b = 0; b < NB; b++) { let tot = 0; for (const k in per) tot += per[k][b];
      const v = Math.max(0, Math.min(1, (20 * Math.log10(tot + 1e-9) + 88) / 66));
      spec[b] = v > spec[b] ? v : spec[b] * .9 + v * .1; peaks[b] = Math.max(peaks[b] - .005, spec[b]);
      const sh = {}; for (const k in per) sh[k] = tot > 0 ? per[k][b] / tot : 0; shares[b] = sh; }
  } else { for (let b = 0; b < NB; b++) { spec[b] *= .9; peaks[b] = Math.max(0, peaks[b] - .01); } }
}
function drawSpectrum(reset) {
  const c = E.state.clip; if (!c) return; const SP = el.spectrum;
  const [W, H, d] = fit(SP); const g = SP.getContext('2d'); g.clearRect(0, 0, W, H);
  if (reset) { spec.fill(0); peaks.fill(0); }
  const base = H - 22 * d, top = 34 * d, bw = W / NB, f2x = f => Math.log(f / FMIN) / Math.log(FMAX / FMIN) * W;
  const vx0 = f2x(300), vx1 = f2x(3000);
  g.fillStyle = 'rgba(214,178,106,.06)'; g.fillRect(vx0, top - 6 * d, vx1 - vx0, base - top + 6 * d);
  g.fillStyle = 'rgba(214,178,106,.8)'; g.font = `italic ${12.5 * d}px "Cormorant Garamond", Georgia, serif`; g.fillText('where a voice lives', vx0 + 6 * d, top + 6 * d);
  const seg = 4 * d, gap = 2 * d;
  for (let b = 0; b < NB; b++) {
    const h = spec[b] * (base - top), x = b * bw + 2 * d, w = bw - 3 * d, nseg = Math.floor(h / (seg + gap));
    const order = c.lanes.map(l => l.id); let acc = 0; const cut = order.map(k => (acc += (shares[b][k] || 0)));
    for (let s = 0; s < nseg; s++) { const frac = (s + .5) / Math.max(1, nseg); const idx = cut.findIndex(cc => frac <= cc + 1e-6); const k = order[idx < 0 ? order.length - 1 : idx];
      g.fillStyle = LANE_COL[k]; g.fillRect(x, base - (s + 1) * (seg + gap) + gap, w, seg); }
    if (nseg < 1) { g.fillStyle = 'rgba(240,231,214,.07)'; g.fillRect(x, base - seg, w, seg); }
    g.fillStyle = BRASS; g.fillRect(x, base - peaks[b] * (base - top) - 3 * d, w, 1.5 * d);
  }
  g.font = `${9.5 * d}px "Courier Prime", monospace`; g.fillStyle = 'rgba(169,156,136,.85)';
  [['SUB', 30], ['BASS', 60], ['LOW-MID', 250], ['MID', 500], ['PRESENCE', 2000], ['AIR', 6000]].forEach(([n, a]) => g.fillText(n, f2x(a) + 3 * d, base + 15 * d));
}
function drawMiniEq() {
  if (!el.miniEq.offsetWidth) return;
  const c = E.state.clip; const [W, H, d] = fit(el.miniEq); const g = el.miniEq.getContext('2d'); g.clearRect(0, 0, W, H);
  const n = 14, bw = W / n;
  for (let i = 0; i < n; i++) { const b = Math.floor(i / n * NB * .85); const v = Math.max(.06, spec[b]); const h = v * H;
    let col = BRASS; if (c) { const sh = shares[b] || {}; let best = 0; for (const k in sh) if (sh[k] > best) { best = sh[k]; col = LANE_COL[k]; } }
    g.fillStyle = col; g.globalAlpha = .9; rr(g, i * bw + d, H - h, bw - 2 * d, h, 1.5 * d); g.fill(); }
  g.globalAlpha = 1;
}
let vu = [0, 0];
function updateCounter(t) {
  const c = E.state.clip; if (!c) return;
  const beat = 60 / c.bpm, k = Math.floor(t / beat + 1e-6), bar = Math.floor(k / 4) + 1, bi = k % 4;
  el.barN.textContent = String(bar).padStart(2, '0'); el.beatN.textContent = bi + 1; el.clock.textContent = fmt(t);
  if (k !== lastBeat) { lastBeat = k; el.beats.querySelectorAll('i').forEach((n, i) => n.classList.toggle('on', i === bi && (E.state.playing || t > 0))); }
}
function tick() {
  const c = E.state.clip;
  if (c) {
    const m = E.measure(); const t = E.now();
    if (E.state.playing) {
      const due = []; while (shownUpTo + 1 < c.moments.length && c.moments[shownUpTo + 1].t <= t) { shownUpTo++; due.push(c.moments[shownUpTo]); }
      if (due.length) { const lastT = due[due.length - 1].t; showMoment(due.filter(x => lastT - x.t < .3)); }
      E.stopAtEnd();
    }
    analyse(); drawMiniEq();
    el.prog.style.setProperty('--p', Math.min(1, t / c.dur));
    if (open) {
      drawTimeline(); drawSpectrum(); updateCounter(t);
      vu[0] += (m.level - vu[0]) * .22; vu[1] += (m.bass - vu[1]) * .18;
      el.vu0.style.transform = `rotate(${-48 + Math.min(1, vu[0] * 1.15) * 96}deg)`; el.vu1.style.transform = `rotate(${-48 + Math.min(1, vu[1] * 1.1) * 96}deg)`;
      for (const l of c.lanes) { const s = el.strips.querySelector(`.strip[data-lane="${l.id}"] .meter i`); if (s) s.style.setProperty('--lv', Math.min(1, E.state.lanes[l.id].level || 0).toFixed(3)); }
      if (E.state.playing) el.tt.style.setProperty('--arm', `${-4 - Math.min(1, t / c.dur) * 14}deg`);
    }
  }
  requestAnimationFrame(tick);
}
