
(async () => {
const DATA = await (await fetch('/data/library.json')).json();
const CLIPS = DATA.clips, GLOSS = DATA.glossary;
const byId = Object.fromEntries(CLIPS.map(c => [c.id, c]));
const STYLES = CLIPS.filter(c => c.kind === 'style');
const LCOL = {}; const css = getComputedStyle(document.documentElement);
['drums','bass','chords','melody','fx'].forEach(k => LCOL[k] = css.getPropertyValue('--' + k).trim());
const BRASS = css.getPropertyValue('--brass-2').trim(), IVORY = '#EFE6D2';
// darker versions of each part colour for text printed on paper
const PCOL = { drums: '#A5412A', bass: '#6A4E9C', chords: '#2E7766', melody: '#8E6212', fx: '#3D6D93' };
const SLEEVES = ['#C9A25A','#8FA9B8','#B8694D','#93A88A','#D9C49C','#9C3F4E','#D8B35F','#6F8BA3','#C98A5E','#A895C4','#B64A36','#8EB5A5','#E0CFA9','#8A3A2E','#5F7F95','#CFA24A','#A5503C','#76967F','#B9A9D6','#857C70'];
STYLES.forEach((c, i) => c.sleeve = SLEEVES[i % SLEEVES.length]);
const EFFCOL = { drop: LCOL.drums, silence: IVORY, button: BRASS, riser: LCOL.fx, hit: LCOL.drums, note: BRASS };
const TAGS = [['all','All records'],['launch','Launch films'],['teaser','Teasers'],['demo','Demos'],['reel','Reels'],['story','Founder stories'],['devtool','Dev tools'],['avoid','Reference: avoid']];
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = t => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(msg){ const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 1700); }
function hexA(hex, a){ const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

/* ---------------- audio engine ---------------- */
let ctx = null, master = null;
const cache = new Map();
let clip = null, lanesState = {}, sources = [], playing = false, startAt = 0, offset = 0;
function ensureCtx(){
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .12;
  master = ctx.createGain(); master.gain.value = .95; master.connect(lim); lim.connect(ctx.destination); return ctx;
}
async function loadBuffers(c){
  if (cache.has(c.id)) return cache.get(c.id);
  ensureCtx(); const out = {};
  await Promise.all(c.lanes.map(async l => { const r = await fetch(l.audio); const ab = await r.arrayBuffer(); out[l.id] = await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)); }));
  cache.set(c.id, out); return out;
}
function wireLanes(){
  for (const l of clip.lanes) { const st = lanesState[l.id]; if (st.gain) continue;
    st.gain = ctx.createGain(); st.analyser = ctx.createAnalyser(); st.analyser.fftSize = 2048; st.analyser.smoothingTimeConstant = .72;
    st.gain.connect(st.analyser); st.analyser.connect(master); st.freq = new Float32Array(st.analyser.frequencyBinCount); st.td = new Float32Array(st.analyser.fftSize); }
  applyMix();
}
function applyMix(){
  const anySolo = Object.values(lanesState).some(s => s.solo);
  for (const [k, st] of Object.entries(lanesState)) { const on = anySolo ? st.solo : !st.mute; st.on = on;
    if (st.gain && ctx) st.gain.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .015);
    const el = document.querySelector(`.strip[data-lane="${k}"]`); if (el) el.classList.toggle('off', !on); }
}
function now(){ return playing ? Math.min(ctx.currentTime - startAt + offset, clip.dur) : offset; }
function stopSources(){ sources.forEach(s => { try { s.onended = null; s.stop(); } catch {} }); sources = []; }
function setPlaying(v){ playing = v; document.body.classList.toggle('playing', v); $('play').setAttribute('aria-label', v ? 'Pause' : 'Play'); }
async function play(from){
  ensureCtx(); if (ctx.state === 'suspended') await ctx.resume();
  const btn = $('play'); if (!cache.has(clip.id)) btn.classList.add('loading');
  const want = clip.id; let bufs;
  try { bufs = await loadBuffers(clip); } catch { btn.classList.remove('loading'); toast('The record would not load. Try again.'); return; }
  btn.classList.remove('loading'); if (want !== clip.id) return;
  wireLanes(); stopSources();
  offset = from != null ? from : (offset >= clip.dur - .05 ? 0 : offset);
  const t0 = ctx.currentTime + .06;
  for (const l of clip.lanes) { const s = ctx.createBufferSource(); s.buffer = bufs[l.id]; s.connect(lanesState[l.id].gain); s.start(t0, Math.min(offset, s.buffer.duration - .01)); sources.push(s); }
  startAt = t0; setPlaying(true); resetCaptions(offset);
}
function pause(){ if (!playing) return; offset = now(); stopSources(); setPlaying(false); }
function seek(t){ t = Math.max(0, Math.min(clip.dur - .05, t)); if (playing) play(t); else { offset = t; resetCaptions(t); } }

/* ---------------- selecting a record ---------------- */
function selectClip(id){
  const c = byId[id]; if (!c) return;
  if (playing) pause();
  clip = c; offset = 0; lanesState = {};
  c.lanes.forEach(l => lanesState[l.id] = { mute: false, solo: false, on: true, level: 0 });
  const isStyle = c.kind === 'style';
  const no = isStyle ? STYLES.indexOf(c) + 1 : null;
  $('nowCat').textContent = isStyle ? `Now playing · record no. ${String(no).padStart(2, '0')} · ${c.key}` : `Now playing · an example from the catalogue`;
  $('nowTitle').textContent = c.title;
  $('nowDesc').textContent = isStyle ? `${cap(c.mood)}. Use it for ${lc(c.use)}. Avoid it for ${lc(c.avoid)}.` : c.body;
  $('nowFacts').innerHTML = [`<span><b>${c.bpm}</b> BPM</span>`, `<span><b>${c.music}</b> bars + ending</span>`, `<span><b>${fmt(c.dur)}</b> long</span>`, `<span><b>${c.lanes.length}</b> parts</span>`].join('');
  const sl = c.sleeve || '#8E3B32'; $('labelDisc').style.setProperty('--sleeve', sl);
  $('labelTitle').textContent = c.title.replace(/\s*\(.*\)$/, ''); $('labelSub').textContent = `${c.bpm} BPM`;
  $('strips').innerHTML = c.lanes.map(l => `<div class="strip" data-lane="${l.id}" style="--c:${LCOL[l.id]}"><span class="dot"></span>
    <span class="nm">${esc(l.name)}<span class="meter"><i></i></span></span>
    <span class="ms"><button type="button" data-act="solo" aria-pressed="false" aria-label="Solo ${esc(l.name)}">S</button><button type="button" data-act="mute" aria-pressed="false" aria-label="Mute ${esc(l.name)}">M</button></span></div>`).join('');
  $('tracks').innerHTML = c.moments.map((m, i) => `<li><button type="button" data-i="${i}"><span class="no">${side(i)}</span><span class="tm">${fmt(m.t)}</span><span><span class="tt">${esc(m.title)}</span><span class="sub">${esc(m.text)}</span></span></button></li>`).join('');
  const lanesTxt = c.lanes.map(l => l.name.toLowerCase()).join(', ');
  if (isStyle) {
    $('ladder').innerHTML = `<div class="rung"><span class="lab">How people describe it</span><div class="val">${esc(cap(c.mood))}</div></div>
      <div class="rung"><span class="lab">What musicians call it</span><div class="pills">${c.craft.map(x => { const k = termKey(x); return k ? `<button class="pill" type="button" data-term="${k}">${esc(x)}</button>` : `<span class="pill">${esc(x)}</span>`; }).join('')}</div></div>
      <div class="rung"><span class="lab">What you write in a brief</span><div class="val typed">${c.bpm} BPM · ${esc(c.key)} · ${c.music} bars + a button ending · ${esc(lanesTxt)}</div></div>
      <div class="rung"><span class="lab">Prompt for an AI music tool</span><p class="prompt" id="promptTxt">${esc(c.prompt)}</p></div>`;
    $('actions').innerHTML = `<button class="btn pri" type="button" id="copyPrompt">Copy the prompt</button><button class="btn" type="button" id="copySpec">Copy the brief</button><a class="btn" href="${c.url}" target="_blank" rel="noopener">Open in Strudel ↗</a>`;
  } else {
    const terms = [...new Set(c.moments.map(m => m.term))];
    $('ladder').innerHTML = `<div class="rung"><span class="lab">Words in this example</span><div class="pills">${terms.map(k => `<button class="pill" type="button" data-term="${k}">${esc(GLOSS[k].title)}</button>`).join('')}</div></div>`;
    $('actions').innerHTML = `<a class="btn" href="${c.url}" target="_blank" rel="noopener">Open in Strudel ↗</a>`;
  }
  $('code').textContent = c.code;
  document.querySelectorAll('.sleeve').forEach(el => { const on = el.dataset.id === id; el.classList.toggle('cur', on); const st = el.querySelector('.callno span:last-child'); if (st && !el.classList.contains('avoid')) st.textContent = on ? 'On the turntable' : 'Available'; });
  resetCaptions(0); drawTimeline(); drawSpectrum(true); updateCounter(0);
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const lc = s => s.charAt(0).toLowerCase() + s.slice(1);
const side = i => String(i + 1).padStart(2, '0') + '.';
function termKey(label){
  const l = label.toLowerCase();
  const map = [['lydian','lydian'],['dorian','dorian'],['phrygian','phrygian'],['four-on-the-floor','four-on-the-floor'],['4/4','four-on-the-floor'],['half-time','half-time'],['2-step','two-step'],
    ['swing','swing'],['syncopation','syncopation'],['sidechain','sidechain'],['supersaw','supersaw'],['808','808'],['arpeggio','arpeggio'],['broken chords','arpeggio'],['ostinato','ostinato'],['pulse','ostinato'],
    ['riser','riser'],['stop-down','stop-down'],['drop','drop'],['build','build'],['drone','drone'],['braam','drone'],['reverb','reverb'],['delay','delay'],['pad','pad'],['distort','distortion'],['bitcrush','distortion'],
    ['9th','seventh'],['7th','seventh'],['maj7','seventh'],['add9','seventh'],['filter','filter-sweep'],['motif','motif'],['cowbell','motif'],['hi-hat','hi-hats'],['tick','hi-hats'],['glitch','texture'],['texture','texture'],
    ['bleeps','melody'],['square','waveform'],['i–v–vi–iv','progression'],['vamp','progression'],['claps','backbeat'],['retro 80s drums','backbeat'],['dusty drums','swing'],['lazy snare','swing'],
    ['minor','major-minor'],['major','major-minor'],['bass','bass'],['impact','impact'],['restraint','pad'],['harmony','chords'],['octave','bass'],['stabs','chords'],['glockenspiel','melody'],['4/4','four-on-the-floor'],['pounding','four-on-the-floor']];
  for (const [k, v] of map) if (l.includes(k)) return v;
  return null;
}
function briefText(c){
  const moments = c.moments.map(m => `${fmt(m.t)} ${m.title}`).join('; ');
  return `Music brief: ${c.title} (${c.mood})\nTempo: ${c.bpm} BPM, 4/4\nKey / mode: ${c.key}\nLength: ${c.music} bars + a button ending (${fmt(c.dur)})\nParts: ${c.lanes.map(l => l.name.toLowerCase()).join(', ')}\nCraft: ${c.craft.join(', ')}\nShape: ${moments}\nPrompt: ${c.prompt}`;
}
async function copy(text, label){
  try { await navigator.clipboard.writeText(text); toast(label + ' copied'); }
  catch { const r = document.createRange(); r.selectNodeContents($('promptTxt') || $('code')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Selected. Press Ctrl or Cmd + C'); }
}

/* ---------------- captions & effects ---------------- */
let shownUpTo = -1, capEls = [];
function colorFor(m){ return m.lane ? LCOL[m.lane] : (EFFCOL[m.effect] || BRASS); }
function inkFor(m){ return m.lane ? PCOL[m.lane] : ({ drop: '#7C2B22', silence: '#271D14', button: '#8A6420', riser: '#3D6D93', hit: '#7C2B22' }[m.effect] || '#7C2B22'); }
function resetCaptions(t){
  $('captions').innerHTML = ''; capEls = []; shownUpTo = -1; if (!clip) return;
  clip.moments.forEach((m, i) => { if (m.t <= t - .05) shownUpTo = i; });
  if (shownUpTo >= 0) pushCaption(clip.moments.filter(m => Math.abs(m.t - clip.moments[shownUpTo].t) < .02), true);
  else { const el = document.createElement('div'); el.className = 'cap in'; el.style.setProperty('--c', 'var(--faded)');
    const up = clip.moments.map(m => m.title.toLowerCase()).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
    el.innerHTML = `<div class="t">Coming up</div><div class="x">${esc(up.length ? cap(up.join(', ')) + '.' : 'Press play.')}</div><div class="w">Each moment is named here the instant it happens.</div>`;
    $('captions').appendChild(el); capEls.push(el); }
  markTrack();
}
function pushCaption(ms, quiet){
  const main = ms.find(m => ['drop','silence','button','hit'].includes(m.effect)) || ms[0];
  const el = document.createElement('div'); el.className = 'cap'; el.style.setProperty('--c', inkFor(main));
  el.innerHTML = `<div class="t">${esc(main.title)}</div><div class="x">${ms.map(m => (m === main ? '' : `<b style="color:${inkFor(m)}">${esc(m.title)}.</b> `) + esc(m.text)).join(' ')}</div><div class="w">${esc(main.why)}</div>`;
  capEls.forEach(o => { o.classList.remove('in'); o.classList.add('out'); setTimeout(() => o.remove(), 200); });
  capEls = [el]; $('captions').appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  if (!quiet) ms.forEach(fireEffect);
}
let fx = { ring: null, flashLane: null, flashT: 0 };
function word(txt, col){ const w = $('bigword'); w.textContent = txt; w.style.color = col; w.classList.remove('go'); void w.offsetWidth; w.classList.add('go'); }
function fireEffect(m){
  if (reduce) return;
  if (['drop','hit','button'].includes(m.effect)) {
    const f = $('ff'); f.style.setProperty('--fc', colorFor(m)); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    fx.ring = { t: performance.now(), color: colorFor(m), big: m.effect !== 'button' };
    word(m.effect === 'drop' ? 'the drop' : m.effect === 'button' ? 'logo here' : 'hit', colorFor(m));
  }
  if (m.effect === 'silence') { const d = $('dim'); d.classList.add('on'); word('silence', IVORY); setTimeout(() => d.classList.remove('on'), 60000 / clip.bpm * .95); }
  if (m.effect === 'riser') word('rising', LCOL.fx);
  const lanes = m.lanes || (m.lane ? [m.lane] : []);
  lanes.forEach(k => { const el = document.querySelector(`.strip[data-lane="${k}"]`); if (el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); } });
  if (lanes.length) { fx.flashLane = lanes; fx.flashT = performance.now(); }
}
function markTrack(){ document.querySelectorAll('#tracks button').forEach((b, i) => b.classList.toggle('cur', i === shownUpTo)); }

/* ---------------- drawing ---------------- */
const TL = $('timeline'), SP = $('spectrum');
function fit(cv){ const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); const w = Math.round(r.width * d), h = Math.round(r.height * d);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } return [w, h, d]; }
function rr(g, x, y, w, h, r){ r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawTimeline(){
  if (!clip) return;
  const [W, H, d] = fit(TL); const g = TL.getContext('2d');
  const t = now(), spb = 240 / clip.bpm, beat = spb / 4, pps = W / (4.2 * spb), px = W * .24, X = tt => px + (tt - t) * pps;
  g.clearRect(0, 0, W, H);
  const top = 34 * d, bot = H - 12 * d, lanes = clip.lanes, lh = (bot - top) / lanes.length;
  g.font = `500 ${10.5 * d}px "Courier Prime", monospace`;
  for (const [label, a, b] of clip.seg) {
    const x0 = X((a - 1) * spb), x1 = X(b * spb); if (x1 < 0 || x0 > W) continue;
    const hot = /DROP|HIT|logo/.test(label);
    g.fillStyle = hot ? hexA(LCOL.drums, .07) : 'rgba(240,231,214,.018)'; g.fillRect(x0, top - 8 * d, x1 - x0 - 2 * d, bot - top + 8 * d);
    g.fillStyle = hot ? LCOL.drums : 'rgba(240,231,214,.5)'; g.fillText(label.toUpperCase(), Math.max(x0 + 8 * d, 6 * d), 20 * d);
  }
  const b0 = Math.floor((t - px / pps) / beat) - 1, b1 = Math.ceil((t + (W - px) / pps) / beat) + 1;
  for (let k = Math.max(0, b0); k <= b1; k++) { const x = X(k * beat), isBar = k % 4 === 0;
    g.fillStyle = isBar ? 'rgba(240,231,214,.12)' : 'rgba(240,231,214,.04)'; g.fillRect(x, top, d, bot - top);
    if (isBar) { g.fillStyle = 'rgba(169,156,136,.8)'; g.fillText(String(k / 4 + 1), x + 4 * d, top + 12 * d); } }
  const flashAge = (performance.now() - fx.flashT) / 900;
  lanes.forEach((l, i) => {
    const y0 = top + i * lh, st = lanesState[l.id], col = LCOL[l.id], on = st.on !== false;
    g.fillStyle = hexA(col, .025 + Math.min(.1, (st.level || 0) * .2)); g.fillRect(0, y0 + d, W, lh - 2 * d);
    if (fx.flashLane && fx.flashLane.includes(l.id) && flashAge < 1) { const sweep = W - (W - px) * Math.min(1, flashAge * 1.6);
      const gr = g.createLinearGradient(sweep, 0, W, 0); gr.addColorStop(0, hexA(col, .3 * (1 - flashAge))); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(sweep, y0, W - sweep, lh); }
    for (const e of l.events) {
      const [et, ed, row, vel] = e, x = X(et), w = Math.max(3 * d, ed * pps - d); if (x > W || x + w < 0) continue;
      const y = y0 + lh * (1 - row), past = et + ed < t, active = et <= t && t < et + Math.max(ed, .12);
      g.fillStyle = hexA(col, on ? (past ? .25 : .92) * (.5 + .5 * vel) : .1);
      if (active && on) { g.shadowColor = col; g.shadowBlur = 14 * d; } else g.shadowBlur = 0;
      if (l.id === 'drums') { const r = (active ? 5.5 : 3.8) * d * (.75 + .45 * vel); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
      else if (l.id === 'fx') { const hh = Math.max(3 * d, (lh - 12 * d) * vel); g.fillRect(x, y0 + lh - 5 * d - hh, Math.max(2 * d, w * .8), hh); }
      else { const hh = (active ? 8 : 5) * d; rr(g, x, y - hh / 2, w, hh, 2.5 * d); g.fill(); }
      if (on && t - et >= 0 && t - et < .2) { const k = (t - et) / .2; g.shadowBlur = 0; g.strokeStyle = hexA(col, .7 * (1 - k)); g.lineWidth = 1.5 * d; g.beginPath(); g.arc(px, y, (5 + 16 * k) * d, 0, Math.PI * 2); g.stroke(); }
    }
    g.shadowBlur = 0; g.fillStyle = hexA(col, on ? .95 : .4); g.font = `500 ${14 * d}px "EB Garamond", Georgia, serif`; g.fillText(l.name, 10 * d, y0 + 16 * d);
  });
  clip.moments.forEach(m => { const x = X(m.t); if (x < -40 || x > W + 10) return; const col = colorFor(m);
    g.strokeStyle = hexA(col, .6); g.setLineDash([3 * d, 5 * d]); g.lineWidth = d; g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke(); g.setLineDash([]);
    if (m.effect === 'silence') { g.fillStyle = 'rgba(240,231,214,.05)'; g.fillRect(x, top, beat * pps, bot - top); }
    if (x > px + 2) { const lbl = m.title; g.font = `italic ${14 * d}px "IM Fell English", Georgia, serif`; const tw = g.measureText(lbl).width + 14 * d;
      g.fillStyle = hexA(col, .95); rr(g, x, bot - 22 * d, tw, 19 * d, 9.5 * d); g.fill(); g.fillStyle = '#12100C'; g.fillText(lbl, x + 7 * d, bot - 8.5 * d); } });
  g.fillStyle = IVORY; g.fillRect(px - d, top - 8 * d, 2 * d, bot - top + 8 * d);
  if (fx.ring) { const k = (performance.now() - fx.ring.t) / 850; if (k > 1) fx.ring = null; else {
    g.strokeStyle = hexA(fx.ring.color, .85 * (1 - k)); g.lineWidth = (6 - 5 * k) * d; g.beginPath(); g.arc(px, (top + bot) / 2, (18 + (fx.ring.big ? 500 : 220) * k) * d, 0, Math.PI * 2); g.stroke(); } }
  if (!playing && t < .01) { g.fillStyle = 'rgba(240,231,214,.75)'; g.font = `italic ${19 * d}px "IM Fell English", Georgia, serif`; g.fillText('Drop the needle. Notes scroll through the line.', px + 16 * d, top + 36 * d); }
}
const NB = 40, FMIN = 30, FMAX = 16000;
const edges = Array.from({ length: NB + 1 }, (_, i) => FMIN * Math.pow(FMAX / FMIN, i / NB));
let spec = new Float32Array(NB), peaks = new Float32Array(NB), shares = Array.from({ length: NB }, () => ({}));
function drawSpectrum(reset){
  const [W, H, d] = fit(SP); const g = SP.getContext('2d'); g.clearRect(0, 0, W, H);
  if (reset) { spec.fill(0); peaks.fill(0); }
  const base = H - 26 * d, top = 22 * d, bw = W / NB, f2x = f => Math.log(f / FMIN) / Math.log(FMAX / FMIN) * W;
  const vx0 = f2x(300), vx1 = f2x(3000);
  g.fillStyle = 'rgba(214,178,106,.06)'; g.fillRect(vx0, top - 12 * d, vx1 - vx0, base - top + 12 * d);
  g.fillStyle = 'rgba(214,178,106,.85)'; g.font = `italic ${14 * d}px "IM Fell English", Georgia, serif`; g.fillText('where a voice lives', vx0 + 8 * d, top + 2 * d);
  const live = playing && ctx;
  if (live) {
    const ny = ctx.sampleRate / 2, per = {};
    for (const l of clip.lanes) { const st = lanesState[l.id]; if (!st.analyser) continue;
      st.analyser.getFloatFrequencyData(st.freq); st.analyser.getFloatTimeDomainData(st.td);
      let rms = 0; for (let i = 0; i < st.td.length; i += 4) rms += st.td[i] * st.td[i]; st.level = Math.min(1, Math.sqrt(rms / (st.td.length / 4)) * 4.5);
      const arr = new Float32Array(NB), n = st.freq.length;
      for (let b = 0; b < NB; b++) { const i0 = Math.floor(edges[b] / ny * n), i1 = Math.max(i0 + 1, Math.floor(edges[b + 1] / ny * n)); let s = 0;
        for (let i = i0; i < i1 && i < n; i++) s += Math.pow(10, st.freq[i] / 20); arr[b] = s / (i1 - i0); }
      per[l.id] = arr; }
    for (let b = 0; b < NB; b++) { let tot = 0; for (const k in per) tot += per[k][b];
      const v = Math.max(0, Math.min(1, (20 * Math.log10(tot + 1e-9) + 88) / 66));
      spec[b] = v > spec[b] ? v : spec[b] * .9 + v * .1; peaks[b] = Math.max(peaks[b] - .005, spec[b]);
      const sh = {}; for (const k in per) sh[k] = tot > 0 ? per[k][b] / tot : 0; shares[b] = sh; }
  } else { for (let b = 0; b < NB; b++) { spec[b] *= .9; peaks[b] = Math.max(0, peaks[b] - .01); } for (const l of clip.lanes) lanesState[l.id].level = (lanesState[l.id].level || 0) * .85; }
  const seg = 5 * d, gap = 2 * d;                       // LED-style blocks
  for (let b = 0; b < NB; b++) {
    const h = spec[b] * (base - top), x = b * bw + 2 * d, w = bw - 4 * d, nseg = Math.floor(h / (seg + gap));
    const order = clip.lanes.map(l => l.id); let acc = 0; const cut = order.map(k => (acc += (shares[b][k] || 0)));
    for (let s = 0; s < nseg; s++) { const frac = (s + .5) / Math.max(1, nseg); const idx = cut.findIndex(c => frac <= c + 1e-6); const k = order[idx < 0 ? order.length - 1 : idx];
      g.fillStyle = LCOL[k]; g.fillRect(x, base - (s + 1) * (seg + gap) + gap, w, seg); }
    if (nseg < 1) { g.fillStyle = 'rgba(240,231,214,.07)'; g.fillRect(x, base - seg, w, seg); }
    g.fillStyle = BRASS; g.fillRect(x, base - peaks[b] * (base - top) - 3 * d, w, 1.5 * d);
  }
  const bands = [['sub', 30], ['bass', 60], ['low-mid', 250], ['mid', 500], ['presence', 2000], ['air', 6000]];
  g.font = `${10 * d}px "Courier Prime", monospace`; g.fillStyle = 'rgba(169,156,136,.85)';
  bands.forEach(([n, a]) => g.fillText(n.toUpperCase(), f2x(a) + 4 * d, base + 18 * d));
  if (!live && spec.every(v => v < .01)) { g.fillStyle = 'rgba(240,231,214,.55)'; g.font = `italic ${16 * d}px "IM Fell English", Georgia, serif`; g.fillText('Low notes on the left, high on the right. Each colour is one part of the band.', 14 * d, base - 34 * d); }
  for (const l of clip.lanes) { const el = document.querySelector(`.strip[data-lane="${l.id}"] .meter i`); if (el) el.style.width = Math.round((lanesState[l.id].level || 0) * 100) + '%'; }
}
let lastBeat = -1;
function updateCounter(t){
  const beat = 60 / clip.bpm, k = Math.floor(t / beat + 1e-6), bar = Math.floor(k / 4) + 1, bi = k % 4;
  $('barN').textContent = String(bar).padStart(2, '0'); $('beatN').textContent = bi + 1; $('clock').textContent = fmt(t);
  if (k !== lastBeat) { lastBeat = k; document.querySelectorAll('#beats i').forEach((el, i) => el.classList.toggle('on', i === bi && (playing || t > 0))); }
}
function tick(){
  if (clip) { const t = now();
    if (playing) { const due = []; while (shownUpTo + 1 < clip.moments.length && clip.moments[shownUpTo + 1].t <= t) { shownUpTo++; due.push(clip.moments[shownUpTo]); }
      if (due.length) { const lastT = due[due.length - 1].t; pushCaption(due.filter(m => lastT - m.t < .3)); markTrack(); }
      if (t >= clip.dur - .02) { pause(); offset = clip.dur; } }
    drawTimeline(); drawSpectrum(); updateCounter(t); }
  requestAnimationFrame(tick);
}

/* ---------------- the crate ---------------- */
let filter = 'all';
function coverArt(cv, c){
  const d = Math.min(devicePixelRatio || 1, 2), r = cv.getBoundingClientRect(); cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d);
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.fillStyle = 'rgba(21,17,13,.9)';
  const y0 = H * .2, y1 = H * .56, lanes = c.lanes, lh = (y1 - y0) / lanes.length;
  lanes.forEach((l, i) => { for (const e of l.events) { if (e[3] <= 0) continue; const x = W * .1 + e[0] / c.dur * W * .8, w = Math.max(d * 1.2, e[1] / c.dur * W * .8);
    const y = y0 + i * lh + lh * (1 - e[2]) * .75; g.globalAlpha = .25 + .6 * e[3]; g.fillRect(x, y, l.id === 'drums' ? d * 1.4 : w, Math.max(d * 1.2, lh * .1)); } });
  g.globalAlpha = 1; g.fillRect(W * .1, y1 + H * .04, W * .8, d);
}
function renderCrate(){
  $('crate').innerHTML = STYLES.map((c, i) => `<button class="sleeve${c.tags.includes('avoid') ? ' avoid' : ''}" type="button" data-id="${c.id}" data-tags="${c.tags.join(' ')}" style="--sl:${c.sleeve}">
    <span class="art"><span class="disc"></span><span class="cover"><canvas aria-hidden="true"></canvas><span class="no">CL–${String(i + 1).padStart(2, '0')}</span><span class="bpm">${c.bpm} BPM</span><span class="ttl">${esc(c.title)}</span></span></span>
    <span class="callno"><span>781.64 ${esc(c.title.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase())}</span><span>${c.tags.includes('avoid') ? 'Reference only' : (clip && clip.id === c.id ? 'On the turntable' : 'Available')}</span></span>
    <span class="m">${esc(cap(c.mood))}</span></button>`).join('');
  $('crate').querySelectorAll('.sleeve').forEach(el => { coverArt(el.querySelector('canvas'), byId[el.dataset.id]); el.classList.toggle('cur', clip && el.dataset.id === clip.id); });
  applyFilter();
}
function renderFilters(){ $('filters').innerHTML = TAGS.map(([k, v]) => `<button type="button" data-f="${k}" aria-pressed="${k === filter}"><span>${v}</span></button>`).join(''); }
function applyFilter(){ document.querySelectorAll('.sleeve').forEach(el => el.hidden = !(filter === 'all' || el.dataset.tags.split(' ').includes(filter))); }
function flyRecord(fromEl, then){
  if (reduce) return then();
  const a = fromEl.getBoundingClientRect(), b = $('record').getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'flyer'; f.style.setProperty('--sl', fromEl.closest('.sleeve').style.getPropertyValue('--sl'));
  Object.assign(f.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
  document.body.appendChild(f);
  const dx = b.left - a.left, dy = b.top - a.top, s = b.width / a.width;
  const anim = f.animate([{ transform: 'translate(0,0) scale(1) rotate(0deg)' }, { transform: `translate(${dx}px,${dy}px) scale(${s}) rotate(220deg)` }],
    { duration: 850, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' });
  anim.onfinish = () => { f.remove(); then(); };
}

/* ---------------- events ---------------- */
document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('#play')) { playing ? pause() : play(); return; }
  if (t.closest('#restart')) { seek(0); if (!playing) play(0); return; }
  const sl = t.closest('.sleeve'); if (sl) { const id = sl.dataset.id; $('booth').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (playing) pause(); setTimeout(() => flyRecord(sl.querySelector('.disc'), () => { selectClip(id); play(0); }), reduce ? 0 : 380); return; }
  const fb = t.closest('#filters button'); if (fb) { filter = fb.dataset.f; renderFilters(); applyFilter(); return; }
  const ms = t.closest('.strip .ms button'); if (ms) { const k = ms.closest('.strip').dataset.lane, st = lanesState[k]; st[ms.dataset.act] = !st[ms.dataset.act]; ms.setAttribute('aria-pressed', st[ms.dataset.act]); applyMix(); return; }
  const tr = t.closest('#tracks button'); if (tr) { const m = clip.moments[+tr.dataset.i]; const at = Math.max(0, m.t - 1.2); playing ? seek(at) : play(at); return; }
  const hr = t.closest('[data-hear]'); if (hr) { $('booth').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); selectClip(hr.dataset.hear); play(Math.max(0, +hr.dataset.t - 1.5)); return; }
  const tp = t.closest('[data-term]'); if (tp) { showTerm(tp.dataset.term); return; }
  const ch = t.closest('#chapters button'); if (ch) { setChapter(ch.dataset.ch); return; }
  if (t.closest('#copyPrompt')) { copy(clip.prompt, 'Prompt'); return; }
  if (t.closest('#copySpec')) { copy(briefText(clip), 'Brief'); return; }
});
TL.addEventListener('click', e => { const r = TL.getBoundingClientRect(), spb = 240 / clip.bpm, pps = r.width / (4.2 * spb); seek(now() + (e.clientX - r.left - r.width * .24) / pps); });
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,textarea,[contenteditable]')) return;
  if (e.code === 'Space' && !(e.target.closest && e.target.closest('button,a,summary'))) { e.preventDefault(); playing ? pause() : play(); }
  if (e.key === 'ArrowRight') seek(now() + 240 / clip.bpm);
  if (e.key === 'ArrowLeft') seek(now() - 240 / clip.bpm);
});
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(renderCrate, 150); });
/* ---------------- the words: animated, illustrated glossary ---------------- */
const INK = '#1E150E';
const C = { d: '#B8472F', b: '#6D51A0', c: '#2F7A69', m: '#B98A2A', f: '#3E6F95', brass: '#9A7430', iv: '#2A2018', muted: '#7A6A55', oxblood: '#7C2B22' };
const CHAPTERS = [
  ['rhythm', 'Rhythm', ['bpm', 'bar', 'downbeat', 'kick', 'four-on-the-floor', 'backbeat', 'half-time', 'two-step', 'hi-hats', 'swing', 'syncopation']],
  ['harmony', 'Harmony', ['major-minor', 'lydian', 'dorian', 'phrygian', 'mixolydian', 'chords', 'seventh', 'sus', 'progression', 'arpeggio', 'ostinato', 'melody', 'motif', 'bass']],
  ['sound', 'Sound', ['waveform', 'pluck', 'pad', 'supersaw', '808', 'distortion', 'filter-sweep', 'reverb', 'delay', 'sidechain', 'drone', 'texture']],
  ['moves', 'Video moves', ['intro', 'build', 'riser', 'stop-down', 'drop', 'impact', 'breakdown', 'button', 'voice-band']],
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
const txt = (x, y, s, col = C.iv, size = 11, anchor = 'middle', italic = false) => `<text x="${x}" y="${y}" fill="${col}" font-size="${size}" text-anchor="${anchor}" font-family="${italic ? 'Bodoni Moda, Georgia, serif' : 'DM Mono, monospace'}" ${italic ? 'font-style="italic"' : ''}>${s}</text>`;

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
  'motif': () => [0, 1, 2].map(i => `<g class="a-hit" style="--d:2.4s;--dl:${i * .35}s">${note(70 + i * 34, 90 - [0, 18, 8][i], C.brass)}</g>`).join('') + `<circle class="a-pulse" style="--d:2.4s;--dl:1.1s" cx="190" cy="74" r="14" fill="none" stroke="${C.brass}" stroke-width="2"/><text x="190" y="79" text-anchor="middle" font-family="Bodoni Moda, Georgia, serif" font-style="italic" font-size="14" fill="${C.brass}">logo</text>`,
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
  'button': () => `<rect class="a-blink" style="--d:1.4s" x="60" y="34" width="120" height="76" rx="8" fill="none" stroke="${C.brass}" stroke-width="2" stroke-dasharray="10 6"/>` + txt(120, 80, 'your logo', C.brass, 20, 'middle', true) + `<circle class="a-pulse" style="--d:1.4s" cx="120" cy="72" r="20" fill="none" stroke="${C.brass}"/>` + txt(120, 136, 'one last chord, then ring', C.iv, 10),
  'voice-band': () => Array.from({ length: 20 }, (_, i) => `<rect class="a-grow" style="--d:1.2s;animation-delay:${((i * 7) % 10) * .1}s" x="${20 + i * 10}" y="${60}" width="6" height="${50 - Math.abs(i - 9.5) * 2}" rx="2" fill="${i >= 6 && i <= 13 ? C.brass : C.iv}" opacity="${i >= 6 && i <= 13 ? 1 : .25}"/>`).join('') + `<rect x="78" y="38" width="84" height="80" rx="6" fill="none" stroke="${C.brass}" stroke-dasharray="4 4"/>` + txt(120, 136, 'keep this part clear for a voice', C.iv, 10),
};

function hearFor(k){
  const out = [];
  for (const c of [...STYLES, ...CLIPS.filter(c => c.kind === 'lesson')]) {
    const m = c.moments.find(m => m.term === k);
    if (m && !out.some(x => x[0] === c.id)) out.push([c.id, m.t, c.kind === 'style' ? c.title : 'Example']);
    if (out.length >= 2) break;
  }
  return out;
}
let chapter = 'rhythm';
function renderChapters(){ $('chapters').innerHTML = CHAPTERS.map(([k, n], i) => `<button type="button" role="tab" data-ch="${k}" aria-selected="${k === chapter}"><span class="holder">${'ABCD'[i]} · ${n}</span><span class="pull"></span></button>`).join(''); }
function renderWords(){
  renderChapters();
  const list = CHAPTERS.find(c => c[0] === chapter)[2];
  const letter = 'ABCD'[CHAPTERS.findIndex(c => c[0] === chapter)];
  $('wordgrid').innerHTML = list.map((k, i) => { const g = GLOSS[k]; const hear = hearFor(k); const rot = (((i * 37) % 7) - 3) * .18;
    return `<article class="icard" id="term-${k}" style="--r:${rot.toFixed(2)}deg"><div class="plate"><svg viewBox="0 0 240 150" role="img" aria-label="${esc(g.title)}, illustrated">${ILL[k] ? ILL[k]() : ''}</svg></div>
      <div class="body"><div class="head"><h4>${esc(g.title)}</h4><span class="catno">${letter}–${String(i + 1).padStart(2, '0')}</span></div><p class="def">${esc(g.def)}</p><p class="why">${esc(g.why)}</p>
      ${hear.length ? `<div class="hear">${hear.map(([id, t, title]) => `<button type="button" data-hear="${id}" data-t="${t}">${esc(title)} · ${fmt(t)}</button>`).join('')}</div>` : ''}</div><span class="hole"></span></article>`; }).join('');
  const cards = [...$('wordgrid').children];
  cards.forEach((el, i) => setTimeout(() => el.classList.add('in'), reduce ? 0 : 40 + i * 55));
}
function setChapter(k){
  if (k === chapter) return; chapter = k;
  const cards = [...$('wordgrid').children]; cards.forEach(el => el.classList.remove('in'));
  setTimeout(renderWords, reduce ? 0 : 260);
}
function showTerm(k){
  const ch = CHAPTERS.find(c => c[2].includes(k)); if (!ch) return;
  const go = () => { const el = $('term-' + k); if (!el) return; el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); };
  if (ch[0] !== chapter) { chapter = ch[0]; [...$('wordgrid').children].forEach(el => el.classList.remove('in')); setTimeout(() => { renderWords(); setTimeout(go, 120); }, 260); }
  else go();
}

renderFilters();
const start = (location.hash || '').slice(1);
selectClip(byId[start] ? start : '10-future-bass');
renderCrate(); renderWords();
requestAnimationFrame(tick);
})();
