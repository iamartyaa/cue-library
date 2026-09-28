// Room II: the cutting room. Bring a film, mark its moments, and fit a record to them.
import * as E from './engine.js?v=3';
import { L, $, esc, fmt, fmt2, clamp, hexA, reduce, anchors, copyText, toast, LANE_COL } from './lib.js?v=3';
import { drawCover } from './art.js?v=3';
import { compassState } from './wall.js?v=3';

const MARK = { reveal: { col: '#E27B58', name: 'Reveal' }, end: { col: '#EAC46C', name: 'End card' }, cut: { col: '#9FC5DF', name: 'Cut' } };
const RMIN = .88, RMAX = 1.14;
const st = { recId: '10-future-bass', len: 16, marks: [{ type: 'reveal', t: 7.0 }, { type: 'end', t: 13.7 }, { type: 'cut', t: 3.3 }, { type: 'cut', t: 10.35 }], video: false, thumbs: [], playing: false, vt: 0, p0: 0, t0: 0, fit: null };
let pick = () => {}, hooks = {}, inView = false;
export const cutState = st;
export function onCutting(name, fn) { hooks[name] = fn; }

const V = () => $('film');
const filmDur = () => st.video && V().duration && isFinite(V().duration) ? V().duration : st.len;
const filmNow = () => st.video ? V().currentTime : (st.playing ? Math.min(filmDur(), st.t0 + (performance.now() - st.p0) / 1000) : st.vt);
const rec = () => L.byId[st.recId];

/* ---------- the fit ---------- */
export function computeFit(c, marks = st.marks, len = filmDur()) {
  const a = anchors(c), R = marks.find(m => m.type === 'reveal')?.t, En = marks.find(m => m.type === 'end')?.t;
  let rate = 1, s = 0, mode = 'start', notes = [], quality = 0;
  if (R != null && En != null && a.drop != null && En > R && a.button > a.drop) {
    const want = (a.button - a.drop) / (En - R);
    if (want >= RMIN && want <= RMAX) { rate = want; s = R - a.drop / rate; mode = 'both'; }
    else { rate = 1; s = R - a.drop; mode = 'drop'; const land = s + a.button; notes.push({ warn: true, text: `At this record's natural pace its final chord lands at ${fmt2(land)}, ${Math.abs(land - En).toFixed(1)} s ${land > En ? 'after' : 'before'} your end card. ${land > En ? 'Hold the end card longer, or choose a faster record.' : 'Trim the film, or choose a slower record.'}` }); quality += 2; }
  } else if (R != null && a.drop != null) { s = R - a.drop; mode = 'drop'; }
  else if (En != null) { s = En - a.button; mode = 'button'; }
  if (R != null && a.drop == null) notes.push({ warn: true, text: 'This record has no drop, so the reveal rides on its groove. Pick a record with a drop for a harder landing.' });
  const recLen = c.dur / rate, endAt = s + recLen;
  if (s > .25) notes.push({ text: `The film opens in silence for ${s.toFixed(1)} s, then the music begins.` });
  if (s < -.25) notes.push({ text: `The record's first ${(-s * rate).toFixed(1)} s are trimmed so its drop lands on time.` });
  if (endAt < len - .4) { notes.push({ warn: true, text: `The music ends ${(len - endAt).toFixed(1)} s before the film does. Let the final chord ring over the tail, or trim it.` }); quality += .5; }
  quality += Math.abs(1 - rate) * 6 + (mode === 'both' ? 0 : mode === 'start' ? 1.5 : .6);
  return { rate, s, mode, notes, quality, bpm: c.bpm * rate, a, R, En, endAt };
}
function beatInfo(t, f, c) { // where does film time t fall on the fitted beat grid?
  const beat = 60 / (c.bpm * f.rate), k = (t - f.s) / beat, nearest = Math.round(k), off = (k - nearest) * beat;
  const bar = Math.floor(nearest / 4) + 1, bi = ((nearest % 4) + 4) % 4 + 1; return { bar, bi, off, at: f.s + nearest * beat };
}

/* ---------- ui ---------- */
export function initCutting(onPick) {
  pick = onPick;
  fromHash();
  const sel = document.createElement('select'); sel.id = 'recSel'; sel.setAttribute('aria-label', 'Choose the record');
  sel.innerHTML = L.STYLES.map(c => `<option value="${c.id}">${String(c.no).padStart(2, '0')} · ${esc(c.title)} · ${c.bpm} BPM</option>`).join('');
  $('fitPick').innerHTML = `<span class="mini"><canvas></canvas></span><div style="flex:1;min-width:0"><b id="fpTitle"></b><span id="fpSub"></span></div>`; $('fitPick').after(sel);
  sel.addEventListener('change', () => setRecord(sel.value));
  $('filmLen').value = st.len; $('filmLen').addEventListener('change', e => { st.len = clamp(parseFloat(e.target.value) || 16, 4, 180); e.target.value = st.len; st.marks.forEach(m => m.t = Math.min(m.t, st.len - .1)); refresh(); });
  document.querySelectorAll('.mk').forEach(b => b.addEventListener('click', () => addMark(b.dataset.mark)));
  $('cutPlay').addEventListener('click', togglePlay);
  $('suggest').addEventListener('click', suggest);
  $('suggestions').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setRecord(b.dataset.id); });
  $('copyCue').addEventListener('click', () => copyText(cueSheet(), 'Cue sheet'));
  $('copyLink').addEventListener('click', () => { const url = location.origin + location.pathname + '#cut=' + hashOf(); history.replaceState(null, '', '#cut=' + hashOf()); copyText(url, 'Link'); });
  $('toSlip').addEventListener('click', () => hooks.toSlip && hooks.toSlip(slipTimings(), rec()));
  // film loading
  const screen = $('screen');
  $('filePick').addEventListener('change', e => { const f = e.target.files[0]; if (f) loadFilm(f); });
  screen.addEventListener('dragover', e => { e.preventDefault(); screen.classList.add('dragover'); });
  screen.addEventListener('dragleave', () => screen.classList.remove('dragover'));
  screen.addEventListener('drop', e => { e.preventDefault(); screen.classList.remove('dragover'); const f = [...e.dataTransfer.files].find(f => f.type.startsWith('video/')); if (f) loadFilm(f); else toast('That file is not a video'); });
  screen.addEventListener('click', e => { if (e.target.closest('.drop-hint')) return; togglePlay(); });
  const v = V();
  v.addEventListener('play', () => { st.playing = true; syncMusic(true); setPlayBtn(); });
  v.addEventListener('pause', () => { st.playing = false; if (ownsEngine()) E.pause(); setPlayBtn(); });
  v.addEventListener('seeked', () => { if (st.playing) syncMusic(true); });
  v.addEventListener('ended', () => { st.playing = false; if (ownsEngine()) E.pause(); setPlayBtn(); });
  initBed(); initTempo();
  new IntersectionObserver(es => es.forEach(en => inView = en.isIntersecting), { threshold: .2 }).observe($('cutting'));
  document.addEventListener('keydown', e => {
    if (!inView || (e.target.closest && e.target.closest('input,textarea,select'))) return;
    const k = e.key.toLowerCase(); if (k === 'r') addMark('reveal'); else if (k === 'e') addMark('end'); else if (k === 'c') addMark('cut');
  });
  E.on('clip', c => { if (c.kind === 'style' && c.id !== st.recId && !st.playing) setRecord(c.id, true); });
  setRecord(st.recId, true);
  requestAnimationFrame(loop);
}
function ownsEngine() { return E.state.clip && E.state.clip.id === st.recId; }
export function setRecord(id, quiet) {
  const c = L.byId[id]; if (!c) return;
  const was = st.playing; if (was) pause();
  st.recId = id; $('recSel').value = id;
  $('fpTitle').textContent = c.title; $('fpSub').textContent = `${c.bpm} BPM · ${c.key}`;
  const cv = $('fitPick').querySelector('canvas'); requestAnimationFrame(() => drawCover(cv, c, { bare: true, size: 64 }));
  refresh();
  if (!quiet) pick(id, { play: false, quiet: true });
}
function addMark(type) {
  const t = +filmNow().toFixed(2);
  if (type !== 'cut') st.marks = st.marks.filter(m => m.type !== type);
  st.marks.push({ type, t: clamp(t, 0, filmDur() - .05) });
  st.marks.sort((a, b) => a.t - b.t); refresh();
  toast(`${MARK[type].name} marked at ${fmt2(t)}`);
}
function refresh() {
  const c = rec(); if (!c) return;
  st.fit = computeFit(c); const f = st.fit;
  $('fitBpm').textContent = f.bpm.toFixed(f.rate === 1 ? 0 : 1);
  $('fitRate').textContent = f.rate === 1 ? 'as recorded' : `${(f.rate * 100).toFixed(1)}% of ${c.bpm}`;
  const lines = [];
  if (f.R != null) lines.push(`<li><i style="--c:${MARK.reveal.col}"></i><span><b>Reveal ${fmt2(f.R)}.</b> ${f.a.drop != null ? `The ${f.a.dropKind === 'drop' ? 'drop' : f.a.dropKind === 'hit' ? 'impact' : 'full groove'} lands ${f.mode === 'button' ? 'at ' + fmt2(f.s + f.a.drop / f.rate) : 'exactly here'}.` : ''}</span></li>`);
  if (f.En != null) lines.push(`<li><i style="--c:${MARK.end.col}"></i><span><b>End card ${fmt2(f.En)}.</b> ${f.mode === 'both' || f.mode === 'button' ? 'The final chord lands exactly here.' : `The final chord lands at ${fmt2(f.s + f.a.button / f.rate)}.`}</span></li>`);
  st.marks.filter(m => m.type === 'cut').forEach((m, i) => { const b = beatInfo(m.t, f, c); const on = Math.abs(b.off) < .04;
    lines.push(`<li><i style="--c:${MARK.cut.col}"></i><span><b>Cut ${i + 1} ${fmt2(m.t)}.</b> ${on ? `On beat ${b.bi} of bar ${b.bar}.` : `${Math.abs(b.off).toFixed(2)} s ${b.off > 0 ? 'late' : 'early'} for beat ${b.bi} of bar ${b.bar}. Nudge it to ${fmt2(b.at)} <button type="button" class="linkish snap" data-snap="${i}" style="background:none;border:0;padding:0;font:inherit;color:#7C2B22;cursor:pointer">snap</button>.`}</span></li>`); });
  f.notes.forEach(n => lines.push(`<li class="${n.warn ? 'warn' : ''}"><i style="--c:${n.warn ? '#7C2B22' : '#B38B45'}"></i><span>${esc(n.text)}</span></li>`));
  if (!lines.length) lines.push(`<li><i></i><span>Mark the reveal and the end card, and the record will be fitted to land on both.</span></li>`);
  $('fitLines').innerHTML = lines.join('');
  $('fitLines').querySelectorAll('[data-snap]').forEach(b => b.addEventListener('click', () => { const cuts = st.marks.filter(m => m.type === 'cut'); const m = cuts[+b.dataset.snap]; m.t = +beatInfo(m.t, f, c).at.toFixed(2); refresh(); }));
  drawBed();
  if (st.playing) syncMusic(true);
}
function hashOf() { const r = st.marks.find(m => m.type === 'reveal')?.t ?? '', e = st.marks.find(m => m.type === 'end')?.t ?? ''; return [st.recId, st.video ? +filmDur().toFixed(2) : st.len, r, e, ...st.marks.filter(m => m.type === 'cut').map(m => m.t)].join(','); }
function fromHash() {
  const h = decodeURIComponent(location.hash || ''); if (!h.startsWith('#cut=')) return;
  const [id, len, r, e, ...cuts] = h.slice(5).split(','); if (!L.byId[id]) return;
  st.recId = id; st.len = clamp(parseFloat(len) || 16, 4, 180); st.marks = [];
  if (r !== '' && !isNaN(+r)) st.marks.push({ type: 'reveal', t: +r }); if (e !== '' && !isNaN(+e)) st.marks.push({ type: 'end', t: +e });
  cuts.filter(x => x !== '' && !isNaN(+x)).forEach(x => st.marks.push({ type: 'cut', t: +x }));
  st.fromLink = true;
}
export function cameFromLink() { return !!st.fromLink; }
export function slipTimings() {
  const f = st.fit, c = rec(); if (!f) return null;
  const out = { bpm: +f.bpm.toFixed(1), len: +filmDur().toFixed(1), start: +f.s.toFixed(2) };
  if (f.R != null) out.reveal = f.R; if (f.En != null) out.end = f.En; out.cuts = st.marks.filter(m => m.type === 'cut').map(m => m.t); out.record = c.id;
  return out;
}
function cueSheet() {
  const c = rec(), f = st.fit;
  const L1 = [`CUE SHEET · The Cue Library`, `Film length: ${fmt2(filmDur())}`, `Record: ${c.title} (CL-${String(c.no).padStart(2, '0')}), ${c.key}`,
    `Tempo: ${f.bpm.toFixed(1)} BPM${f.rate !== 1 ? ` (recorded at ${c.bpm}, played at ${(f.rate * 100).toFixed(1)}%)` : ''}`,
    f.s >= 0 ? `Music starts: ${fmt2(f.s)} into the film` : `Music starts: ${(-f.s * f.rate).toFixed(2)} s into the record, on the first frame`];
  if (f.R != null) L1.push(`Reveal ${fmt2(f.R)}: the drop lands here`);
  if (f.En != null) L1.push(`End card ${fmt2(f.En)}: ${f.mode === 'both' || f.mode === 'button' ? 'the final chord lands here' : 'final chord at ' + fmt2(f.s + f.a.button / f.rate)}`);
  st.marks.filter(m => m.type === 'cut').forEach((m, i) => { const b = beatInfo(m.t, f, c); L1.push(`Cut ${i + 1} ${fmt2(m.t)}: beat ${b.bi} of bar ${b.bar}${Math.abs(b.off) >= .04 ? ` (${Math.abs(b.off).toFixed(2)} s ${b.off > 0 ? 'late' : 'early'})` : ''}`); });
  L1.push('', `For a composer: ${Math.round(f.bpm)} BPM in ${c.key}${f.R != null ? `, a drop at ${fmt2(f.R)}` : ''}${f.En != null ? `, one final chord on ${fmt2(f.En)} left to ring` : ''}. Reference: ${c.title}.`);
  return L1.join('\n');
}

/* ---------- playback ---------- */
function togglePlay() { st.playing ? pause() : play(); }
function play() {
  if (st.video) { if (V().ended || V().currentTime >= filmDur() - .05) V().currentTime = 0; V().play().catch(() => {}); return; }
  if (st.vt >= filmDur() - .05) st.vt = 0;
  st.t0 = st.vt; st.p0 = performance.now(); st.playing = true; syncMusic(true); setPlayBtn();
}
function pause() {
  if (st.video) { V().pause(); return; }
  st.vt = filmNow(); st.playing = false; if (ownsEngine()) E.pause(); setPlayBtn();
}
function seekFilm(t) {
  t = clamp(t, 0, filmDur());
  if (st.video) { V().currentTime = t; return; }
  st.vt = t; if (st.playing) { st.t0 = t; st.p0 = performance.now(); syncMusic(true); }
}
function setPlayBtn() { $('cutPlay').classList.toggle('on', st.playing); $('screen').classList.toggle('running', st.playing); }
function syncMusic(force) {
  const c = rec(), f = st.fit; if (!c || !f) return;
  if (!ownsEngine()) { E.select(c); }
  const ft = filmNow(), pos = (ft - f.s) * f.rate;
  if (pos >= c.dur - .02) { E.pause(); return; }
  if (pos < 0) E.play({ from: 0, rate: f.rate, delay: -pos / f.rate });
  else E.play({ from: pos, rate: f.rate });
}
let lastSync = 0;
function loop(now) {
  if (st.playing) {
    const ft = filmNow();
    if (!st.video && ft >= filmDur() - .001) { st.vt = filmDur(); st.playing = false; if (ownsEngine()) E.pause(); setPlayBtn(); }
    else if (now - lastSync > 400 && ownsEngine() && E.state.playing && !E.waiting()) {
      lastSync = now; const f = st.fit, want = (ft - f.s) * f.rate;
      if (want > 0 && want < rec().dur - .1 && Math.abs(E.now() - want) > .07) syncMusic(true);
    }
    if (st.playing && ownsEngine() && !E.state.playing && !E.state.loading) { const f = st.fit, want = (ft - f.s) * f.rate; if (want < rec().dur - .1) syncMusic(true); }
  }
  if (inView) { drawBed(); drawLeader(now); $('tc').textContent = timecode(filmNow()); }
  requestAnimationFrame(loop);
}
const timecode = t => { const s = Math.floor(t), fr = Math.floor((t - s) * 24); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(fr).padStart(2, '0')}`; };
export function momentStamp(m) {
  if (!st.playing || !ownsEngine() || reduce) return;
  const word = { drop: 'The drop', button: 'The button', silence: 'Silence', hit: 'Impact' }[m.effect]; if (!word) return;
  const s = $('stampFx'); s.textContent = word; s.style.setProperty('--c', { drop: '#E27B58', button: '#EAC46C', silence: '#EFE6D2', hit: '#E27B58' }[m.effect]);
  s.classList.remove('go'); void s.offsetWidth; s.classList.add('go');
}

/* ---------- film loading and thumbnails ---------- */
function loadFilm(file) {
  const url = URL.createObjectURL(file), v = V();
  if (st.playing) pause();
  v.src = url; st.video = true; $('screen').classList.add('has-film');
  v.addEventListener('loadedmetadata', () => {
    const d = v.duration; st.marks = st.marks.filter(m => m.t < d);
    if (!st.marks.some(m => m.type === 'end')) st.marks.push({ type: 'end', t: +(d - Math.min(2, d * .12)).toFixed(2) });
    if (!st.marks.some(m => m.type === 'reveal')) st.marks.push({ type: 'reveal', t: +(d * .42).toFixed(2) });
    st.marks.sort((a, b) => a.t - b.t); refresh(); makeThumbs(url, d);
    toast('Film loaded. Mark the reveal and the end card.');
  }, { once: true });
}
async function makeThumbs(url, d) {
  const v = document.createElement('video'); v.src = url; v.muted = true; v.playsInline = true; v.preload = 'auto';
  await new Promise(r => v.addEventListener('loadeddata', r, { once: true }));
  const n = 14; st.thumbs = [];
  for (let i = 0; i < n; i++) {
    v.currentTime = Math.min(d - .05, (i + .5) / n * d);
    await new Promise(r => v.addEventListener('seeked', r, { once: true }));
    const c = document.createElement('canvas'); c.height = 60; c.width = Math.round(60 * (v.videoWidth / v.videoHeight || 16 / 9)); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); st.thumbs.push(c);
    drawBed();
  }
}

/* ---------- the flatbed: film on top, music below, one beat grid ---------- */
let drag = null;
function bedGeom() { const cv = $('bed'), r = cv.getBoundingClientRect(); return { r, pad: 14, x: t => 14 + t / filmDur() * (r.width - 28), t: x => (x - 14) / (r.width - 28) * filmDur() }; }
function initBed() {
  const cv = $('bed');
  cv.addEventListener('pointerdown', e => {
    const G = bedGeom(), x = e.clientX - G.r.left;
    const m = st.marks.map(m => ({ m, dx: Math.abs(G.x(m.t) - x) })).filter(o => o.dx < 10).sort((a, b) => a.dx - b.dx)[0];
    if (m) { drag = m.m; cv.setPointerCapture(e.pointerId); } else seekFilm(G.t(x));
  });
  cv.addEventListener('pointermove', e => {
    const G = bedGeom(), x = e.clientX - G.r.left;
    if (drag) { drag.t = +clamp(G.t(x), 0, filmDur() - .05).toFixed(2); refresh(); return; }
    cv.style.cursor = st.marks.some(m => Math.abs(G.x(m.t) - x) < 10) ? 'ew-resize' : 'pointer';
  });
  const up = () => { if (drag) { st.marks.sort((a, b) => a.t - b.t); drag = null; refresh(); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('dblclick', e => { const G = bedGeom(), x = e.clientX - G.r.left; const i = st.marks.findIndex(m => Math.abs(G.x(m.t) - x) < 10); if (i >= 0) { const [m] = st.marks.splice(i, 1); toast(`${MARK[m.type].name} removed`); refresh(); } });
}
function drawBed() {
  const cv = $('bed'); if (!cv) return; const c = rec(), f = st.fit; if (!c || !f) return;
  const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2), W = Math.round(r.width * d), H = Math.round(r.height * d);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g = cv.getContext('2d'); g.clearRect(0, 0, W, H);
  const len = filmDur(), P = 14 * d, X = t => P + t / len * (W - 2 * P);
  const rulerH = 22 * d, filmY = rulerH + 4 * d, filmH = 58 * d, musY = filmY + filmH + 10 * d, musH = H - musY - 10 * d;
  // ruler
  g.fillStyle = 'rgba(214,178,106,.7)'; g.font = `${10 * d}px "Courier Prime", monospace`;
  const step = len > 60 ? 10 : len > 24 ? 5 : len > 10 ? 2 : 1;
  for (let s = 0; s <= len + .001; s += step) { const x = X(s); g.fillRect(x, rulerH - 7 * d, d, 7 * d); g.fillText(fmt(s).replace(/\.0$/, ''), x + 3 * d, rulerH - 9 * d); }
  // beat grid across both tracks
  const beat = 60 / f.bpm; const k0 = Math.ceil((0 - f.s) / beat), k1 = Math.floor((len - f.s) / beat);
  for (let k = k0; k <= k1; k++) { const x = X(f.s + k * beat), isBar = k % 4 === 0; g.fillStyle = isBar ? 'rgba(240,231,214,.16)' : 'rgba(240,231,214,.05)'; g.fillRect(x, filmY, d, H - filmY - 6 * d);
    if (isBar && k >= 0) { g.fillStyle = 'rgba(214,178,106,.6)'; g.fillText(String(k / 4 + 1), x + 2 * d, musY - 2 * d); } }
  // film strip
  g.fillStyle = '#0D0907'; g.fillRect(P, filmY, W - 2 * P, filmH);
  if (st.thumbs.length) { const n = st.thumbs.length, tw = (W - 2 * P) / n; st.thumbs.forEach((th, i) => { g.globalAlpha = .85; g.drawImage(th, P + i * tw, filmY + 8 * d, tw - d, filmH - 16 * d); }); g.globalAlpha = 1; }
  else { const n = Math.max(6, Math.round(len / 1.2)), tw = (W - 2 * P) / n; for (let i = 0; i < n; i++) { const gr = g.createLinearGradient(0, filmY, 0, filmY + filmH); gr.addColorStop(0, i % 2 ? '#2A1D14' : '#261A12'); gr.addColorStop(1, '#17100B'); g.fillStyle = gr; g.fillRect(P + i * tw + d, filmY + 8 * d, tw - 2 * d, filmH - 16 * d); } }
  g.fillStyle = 'rgba(240,231,214,.35)'; for (let x = P + 4 * d; x < W - P - 4 * d; x += 12 * d) { g.fillRect(x, filmY + 2 * d, 5 * d, 3.5 * d); g.fillRect(x, filmY + filmH - 5.5 * d, 5 * d, 3.5 * d); }
  g.fillStyle = 'rgba(240,231,214,.55)'; g.font = `italic 600 ${12 * d}px "Cormorant Garamond", Georgia, serif`; g.fillText(st.video ? 'Your film' : 'Your film (set its length, or drop a video above)', P + 8 * d, filmY + filmH / 2 + 4 * d);
  // music track: the record's parts, placed where they will play
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(P, musY, W - 2 * P, musH);
  const rx = t => X(f.s + t / f.rate);
  const x0 = Math.max(P, rx(0)), x1 = Math.min(W - P, rx(c.dur));
  g.fillStyle = hexA(c.palette[1], .16); g.fillRect(x0, musY, Math.max(0, x1 - x0), musH);
  const lh = musH / c.lanes.length;
  c.lanes.forEach((l, i) => { g.fillStyle = hexA(LANE_COL[l.id], .85); for (const e of l.events) { if (e[3] <= 0) continue; const x = rx(e[0]); if (x < P || x > W - P) continue; const w = Math.max(1.5 * d, e[1] / f.rate / len * (W - 2 * P));
    g.globalAlpha = .35 + .6 * e[3]; g.fillRect(x, musY + i * lh + lh * (1 - e[2]) * .7 + 1.5 * d, l.id === 'drums' ? 2 * d : Math.min(w, W - P - x), Math.max(1.5 * d, lh * .18)); } });
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(240,231,214,.6)'; g.font = `italic 600 ${12 * d}px "Cormorant Garamond", Georgia, serif`; g.fillText(c.title, Math.max(P, x0) + 8 * d, musY + 14 * d);
  // anchors on the music
  const anc = [[f.a.drop, MARK.reveal.col, 'drop'], [f.a.button, MARK.end.col, 'button']];
  anc.forEach(([t, col, n]) => { if (t == null) return; const x = rx(t); if (x < P || x > W - P) return; g.fillStyle = col; g.beginPath(); g.moveTo(x, musY + musH - 12 * d); g.lineTo(x + 6 * d, musY + musH - 6 * d); g.lineTo(x, musY + musH); g.lineTo(x - 6 * d, musY + musH - 6 * d); g.fill();
    g.font = `${9.5 * d}px "Courier Prime", monospace`; g.fillText(n.toUpperCase(), x + 8 * d, musY + musH - 3 * d); });
  // grease-pencil marks
  st.marks.forEach(m => { const x = X(m.t), col = MARK[m.type].col; g.strokeStyle = col; g.lineWidth = 3 * d; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, filmY - 2 * d); g.lineTo(x + Math.sin(m.t * 7) * 1.5 * d, H - 8 * d); g.stroke();
    g.fillStyle = col; g.font = `700 ${10 * d}px "Courier Prime", monospace`; const lbl = MARK[m.type].name.toUpperCase(); const tw = g.measureText(lbl).width;
    const lx = Math.min(W - P - tw - 8 * d, x + 5 * d); g.fillStyle = 'rgba(13,9,7,.8)'; g.fillRect(lx - 3 * d, filmY + 10 * d, tw + 6 * d, 14 * d); g.fillStyle = col; g.fillText(lbl, lx, filmY + 21 * d); });
  // playhead
  const px = X(filmNow()); g.fillStyle = '#F3E9D2'; g.fillRect(px - d, filmY - 6 * d, 2 * d, H - filmY); g.beginPath(); g.moveTo(px - 6 * d, filmY - 8 * d); g.lineTo(px + 6 * d, filmY - 8 * d); g.lineTo(px, filmY - 1 * d); g.fill();
}

/* ---------- the film leader (shown until a film is loaded) ---------- */
function drawLeader(now) {
  if (st.video) return; const cv = $('leader'); const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 1.5), W = Math.round(r.width * d), H = Math.round(r.height * d);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g = cv.getContext('2d'), cx = W / 2, cy = H / 2, R = Math.min(W, H) * .36, c = rec(), f = st.fit;
  const bg = g.createRadialGradient(cx, cy, R * .2, cx, cy, W * .7); bg.addColorStop(0, '#E9DDC2'); bg.addColorStop(1, '#8C7B5C'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const ft = filmNow();
  if (!st.playing && ft < .01) { // countdown leader
    const t = (now / 1000) % 8, n = 8 - Math.floor(t), sweep = (t % 1) * Math.PI * 2;
    g.fillStyle = 'rgba(40,30,20,.25)'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R * 1.6, -Math.PI / 2, -Math.PI / 2 + sweep); g.closePath(); g.fill();
    g.strokeStyle = '#2A2016'; g.lineWidth = 3 * d; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(cx, cy, R * .82, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1.5 * d; g.beginPath(); g.moveTo(0, cy); g.lineTo(W, cy); g.moveTo(cx, 0); g.lineTo(cx, H); g.stroke();
    g.fillStyle = '#2A2016'; g.font = `600 ${R * 1.1}px "Cormorant Garamond", Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), cx, cy + R * .06);
    g.font = `${11 * d}px "Courier Prime", monospace`; g.fillText('PRESS PLAY TO RUN THE FILM WITH ITS MUSIC', cx, H - 26 * d);
  } else { // slate while the virtual film plays
    g.fillStyle = '#1A1410'; g.fillRect(0, 0, W, H);
    const v = g.createRadialGradient(cx, cy, 10, cx, cy, W * .6); v.addColorStop(0, 'rgba(214,178,106,.14)'); v.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#F3E9D2'; g.font = `500 ${H * .2}px "Cormorant Garamond", Georgia, serif`; g.fillText(fmt(ft), cx, cy - H * .06);
    if (f) { const b = beatInfo(ft - 1e-3, f, c), beatLen = 60 / f.bpm, ph = ((ft - f.s) / beatLen) % 1;
      g.font = `${13 * d}px "Courier Prime", monospace`; g.fillStyle = 'rgba(214,178,106,.9)';
      g.fillText(ft < f.s ? `MUSIC IN ${(f.s - ft).toFixed(1)} S` : `BAR ${Math.floor(((ft - f.s) / beatLen) / 4) + 1} · BEAT ${Math.floor((ft - f.s) / beatLen) % 4 + 1} · ${f.bpm.toFixed(1)} BPM`, cx, cy + H * .1);
      for (let k = 0; k < 4; k++) { const on = ft >= f.s && Math.floor((ft - f.s) / beatLen) % 4 === k; g.fillStyle = on ? (k === 0 ? '#FF8A64' : '#D6B26A') : 'rgba(240,231,214,.15)'; g.beginPath(); g.arc(cx + (k - 1.5) * 26 * d, cy + H * .2, (on ? 7 - ph * 3 : 5) * d, 0, Math.PI * 2); g.fill(); } }
    const nextM = st.marks.filter(m => m.t > ft).sort((a, b) => a.t - b.t)[0];
    if (nextM) { g.font = `italic ${15 * d}px "Cormorant Garamond", Georgia, serif`; g.fillStyle = MARK[nextM.type].col; g.fillText(`${MARK[nextM.type].name} in ${(nextM.t - ft).toFixed(1)} s`, cx, H - 30 * d); }
  }
  // scratches and dust on the celluloid
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = d; const sx = (Math.sin(now / 370) * .5 + .5) * W; g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx + 3, H); g.stroke();
  for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .25})`; g.fillRect(Math.random() * W, Math.random() * H, 2 * d, 2 * d); }
}

/* ---------- suggestions ---------- */
function suggest() {
  const film = hooks.filmType ? hooks.filmType() : null;
  const tagFor = { 'launch film': 'launch', teaser: 'teaser', 'product demo': 'demo', 'social reel': 'reel', 'founder story': 'story', explainer: 'demo' }[film];
  const res = L.STYLES.filter(c => !c.tags.includes('avoid')).map(c => { const f = computeFit(c); let score = f.quality;
    if (tagFor && !c.tags.includes(tagFor)) score += 1.2;
    if (compassState.touched) score += Math.hypot(c.energy - compassState.x, c.machine - compassState.y) * 3;
    return { c, f, score }; }).sort((a, b) => a.score - b.score).slice(0, 4);
  $('suggestions').innerHTML = res.map(({ c, f }) => `<li><button type="button" data-id="${c.id}"><span class="sw" style="background:${c.palette[1]}"></span><span>${esc(c.title)}</span><span class="fitq">${f.mode === 'both' ? `lands both · ${(f.rate * 100).toFixed(0)}%` : f.mode === 'drop' ? 'drop on reveal' : 'fits'}</span></button></li>`).join('');
}

/* ---------- the tempo desk ---------- */
function initTempo() {
  const taps = []; const pend = $('pendulum');
  $('tap').addEventListener('click', () => {
    const t = performance.now(); if (taps.length && t - taps[taps.length - 1] > 2000) taps.length = 0; taps.push(t); if (taps.length > 9) taps.shift();
    const b = $('tap'); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
    if (taps.length < 3) { $('tapBpm').textContent = '…'; return; }
    const iv = (taps[taps.length - 1] - taps[0]) / (taps.length - 1), bpm = 60000 / iv; $('tapBpm').textContent = Math.round(bpm);
    pend.style.animation = reduce ? 'none' : `metro ${(60 / bpm).toFixed(3)}s ease-in-out infinite alternate`;
    const bar = 240 / bpm, len = filmDur();
    const near = L.STYLES.filter(c => !c.tags.includes('avoid')).map(c => ({ c, d: Math.min(Math.abs(c.bpm - bpm), Math.abs(c.bpm / 2 - bpm) + 3, Math.abs(c.bpm * 2 - bpm) + 3) })).sort((a, b) => a.d - b.d).slice(0, 3);
    $('tempoNote').innerHTML = `At <b>${Math.round(bpm)} BPM</b> a bar lasts <b>${bar.toFixed(2)} s</b>; your ${len.toFixed(0)} s film is <b>${(len / bar).toFixed(1)} bars</b>. Records near this pace: ${near.map(n => `<button type="button" data-rec="${n.c.id}">${esc(n.c.title)}</button> (${n.c.bpm})`).join(', ')}.`;
  });
  $('tempoNote').addEventListener('click', e => { const b = e.target.closest('[data-rec]'); if (b) setRecord(b.dataset.rec); });
  const style = document.createElement('style'); style.textContent = '@keyframes metro{from{transform:rotate(-22deg)}to{transform:rotate(22deg)}}'; document.head.appendChild(style);
}
