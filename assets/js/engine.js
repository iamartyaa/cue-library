// One audio engine for the whole site. Every record is a set of stems
// (drums, bass, chords, melody, fx) played in lock-step, so each part can be
// soloed, muted, metered and drawn on its own.

export const bus = new EventTarget();
export const emit = (type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }));
export const on = (type, fn) => bus.addEventListener(type, e => fn(e.detail));

let ctx = null, master = null, limiter = null;
const cache = new Map();
export const state = { clip: null, playing: false, lanes: {}, rate: 1, loading: false };
let sources = [], startAt = 0, offset = 0, pendingToken = 0;

export function audioCtx() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = .002; limiter.release.value = .12;
  master = ctx.createGain(); master.gain.value = .95; master.connect(limiter); limiter.connect(ctx.destination);
  return ctx;
}

async function loadBuffers(c) {
  if (cache.has(c.id)) return cache.get(c.id);
  const p = (async () => {
    audioCtx(); const out = {};
    await Promise.all(c.lanes.map(async l => {
      const r = await fetch('/' + l.audio.replace(/^\//, '')); if (!r.ok) throw new Error('fetch ' + l.audio);
      const ab = await r.arrayBuffer(); out[l.id] = await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej));
    }));
    return out;
  })();
  cache.set(c.id, p);
  try { return await p; } catch (e) { cache.delete(c.id); throw e; }
}
export function preload(c) { if (c) loadBuffers(c).catch(() => {}); }

function wire() {
  for (const l of state.clip.lanes) {
    const st = state.lanes[l.id]; if (st.gain) continue;
    st.gain = ctx.createGain(); st.analyser = ctx.createAnalyser(); st.analyser.fftSize = 2048; st.analyser.smoothingTimeConstant = .72;
    st.gain.connect(st.analyser); st.analyser.connect(master);
    st.freq = new Float32Array(st.analyser.frequencyBinCount); st.td = new Float32Array(st.analyser.fftSize);
  }
  applyMix();
}
export function applyMix() {
  const anySolo = Object.values(state.lanes).some(s => s.solo);
  for (const st of Object.values(state.lanes)) {
    st.on = anySolo ? st.solo : !st.mute;
    if (st.gain && ctx) st.gain.gain.setTargetAtTime(st.on ? 1 : 0, ctx.currentTime, .015);
  }
  emit('mix', state.lanes);
}
export function toggleLane(id, what) { const st = state.lanes[id]; if (!st) return; st[what] = !st[what]; applyMix(); }

/** Current position inside the record, in record seconds. */
export function now() {
  if (!state.clip) return 0;
  if (!state.playing || !ctx) return offset;
  const dt = ctx.currentTime - startAt; if (dt < 0) return offset;
  return Math.min(offset + dt * state.rate, state.clip.dur);
}
function stopSources() { sources.forEach(s => { try { s.onended = null; s.stop(); } catch {} }); sources = []; }

export function select(c) {
  if (!c || (state.clip && state.clip.id === c.id)) return;
  pause(); stopSources();
  state.clip = c; offset = 0; state.rate = 1; state.lanes = {};
  c.lanes.forEach(l => state.lanes[l.id] = { mute: false, solo: false, on: true, level: 0 });
  emit('clip', c);
}

/** Play the current record. from: record time; rate: speed (1 = as recorded); delay: seconds of silence first. */
export async function play({ from, rate, delay = 0 } = {}) {
  const c = state.clip; if (!c) return;
  audioCtx(); if (ctx.state === 'suspended') await ctx.resume();
  const token = ++pendingToken;
  let bufs;
  state.loading = true; emit('loading', true);
  try { bufs = await loadBuffers(c); } catch { state.loading = false; emit('loading', false); emit('error', 'The record would not load. Please try again.'); return; }
  state.loading = false; emit('loading', false);
  if (token !== pendingToken || state.clip !== c) return;
  wire(); stopSources();
  if (rate) state.rate = rate;
  let pos = from != null ? from : (offset >= c.dur - .05 ? 0 : offset);
  pos = Math.max(0, Math.min(c.dur - .01, pos));
  const t0 = ctx.currentTime + .05 + Math.max(0, delay);
  for (const l of c.lanes) {
    const s = ctx.createBufferSource(); s.buffer = bufs[l.id]; s.playbackRate.value = state.rate;
    s.connect(state.lanes[l.id].gain); s.start(t0, Math.min(pos, s.buffer.duration - .01)); sources.push(s);
  }
  startAt = t0; offset = pos;
  state.playing = true; document.documentElement.classList.add('is-playing');
  emit('play', { from: pos, delay });
}
export function pause() {
  pendingToken++;
  if (!state.playing) return;
  offset = Math.max(0, now()); stopSources(); state.playing = false; document.documentElement.classList.remove('is-playing');
  emit('pause', offset);
}
export function toggle() { state.playing ? pause() : play(); }
export function seek(t) {
  if (!state.clip) return;
  t = Math.max(0, Math.min(state.clip.dur - .05, t));
  if (state.playing) play({ from: t }); else { offset = t; emit('seek', t); }
}
export function stopAtEnd() { if (state.playing && now() >= state.clip.dur - .02) { pause(); offset = state.clip.dur; emit('ended'); } }
/** seconds until playback actually starts (for delayed starts) */
export function waiting() { return state.playing && ctx ? Math.max(0, startAt - ctx.currentTime) : 0; }

/* ---------- metering ---------- */
export const meter = { level: 0, bass: 0, lanes: {} };
export function measure() {
  if (!state.clip || !ctx || !state.playing) {
    meter.level *= .9; meter.bass *= .9; for (const k in state.lanes) state.lanes[k].level = (state.lanes[k].level || 0) * .85; return meter;
  }
  let tot = 0;
  for (const l of state.clip.lanes) {
    const st = state.lanes[l.id]; if (!st.analyser) continue;
    st.analyser.getFloatTimeDomainData(st.td);
    let s = 0; for (let i = 0; i < st.td.length; i += 4) s += st.td[i] * st.td[i];
    const v = st.on ? Math.min(1, Math.sqrt(s / (st.td.length / 4)) * 4.5) : 0;
    st.level = v > st.level ? v : st.level * .82 + v * .18; tot += st.level * st.level;
  }
  const lv = Math.min(1, Math.sqrt(tot) * .9); meter.level = lv > meter.level ? lv : meter.level * .85 + lv * .15;
  const b = (state.lanes.bass?.level || 0) * .6 + (state.lanes.drums?.level || 0) * .5; meter.bass = b > meter.bass ? b : meter.bass * .8 + b * .2;
  return meter;
}
export function sampleRate() { return ctx ? ctx.sampleRate : 48000; }
