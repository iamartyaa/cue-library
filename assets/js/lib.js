// Shared data and helpers.
export const L = { CLIPS: [], GLOSS: {}, byId: {}, STYLES: [], LESSONS: [] };
export const LANE_COL = { drums: '#E27B58', bass: '#B99DE2', chords: '#7FC6B2', melody: '#EAC46C', fx: '#9FC5DF' };
export const LANE_INK = { drums: '#A5412A', bass: '#6A4E9C', chords: '#2E7766', melody: '#8E6212', fx: '#3D6D93' };
export const LANE_NAME = { drums: 'Drums', bass: 'Bass', chords: 'Chords', melody: 'Melody', fx: 'Effects' };
export const EFF_COL = { drop: '#E27B58', silence: '#EFE6D2', button: '#D6B26A', riser: '#9FC5DF', hit: '#E27B58', note: '#D6B26A', enter: '#D6B26A' };
export const EFF_INK = { drop: '#7C2B22', silence: '#271D14', button: '#8A6420', riser: '#3D6D93', hit: '#7C2B22' };
export const TAGS = [['all', 'All records'], ['launch', 'Launch films'], ['teaser', 'Teasers'], ['demo', 'Demos'], ['reel', 'Reels'], ['story', 'Founder stories'], ['devtool', 'Developer tools'], ['avoid', 'Cautionary']];
export const $ = id => document.getElementById(id);
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
export const lc = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
export const fmt = t => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
export const fmt2 = t => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export async function loadLibrary() {
  const r = await fetch('/data/library.json'); const d = await r.json();
  L.CLIPS = d.clips; L.GLOSS = d.glossary; L.byId = Object.fromEntries(d.clips.map(c => [c.id, c]));
  L.STYLES = d.clips.filter(c => c.kind === 'style'); L.LESSONS = d.clips.filter(c => c.kind === 'lesson');
  L.STYLES.forEach((c, i) => { c.no = i + 1; c.labelCol = c.palette[1]; });
  L.LESSONS.forEach(c => { c.palette = ['#E9DDC2', '#7C2B22', '#271D14']; c.labelCol = '#7C2B22'; });
  return L;
}

let toastT;
export function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1900); }
export async function copyText(text, label) {
  try { await navigator.clipboard.writeText(text); toast(label + ' copied'); return true; }
  catch { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {} ta.remove(); toast(ok ? label + ' copied' : 'Select the text and copy it by hand'); return ok; }
}

/** The anchor moments of a record: where its drop lands and where its final chord lands. */
export function anchors(c) {
  const ms = c.moments;
  const drop = ms.find(m => m.effect === 'drop') || ms.find(m => m.effect === 'hit') || null;
  const button = [...ms].reverse().find(m => m.effect === 'button') || [...ms].reverse().find(m => m.effect === 'hit') || null;
  const spb = 240 / c.bpm;
  const dropT = drop ? drop.t : (c.seg.find(s => /groove|drop|full/i.test(s[0])) ? (c.seg.find(s => /groove|drop|full/i.test(s[0]))[1] - 1) * spb : null);
  return { drop: dropT, button: button ? button.t : Math.max(0, c.dur - spb), dropKind: drop ? drop.effect : 'groove' };
}

/** Brief text for a record (used by the island and the call slip). */
export function recordBrief(c) {
  const moments = c.moments.filter(m => ['drop', 'silence', 'button', 'hit', 'riser'].includes(m.effect) || m.effect === 'enter').map(m => `${fmt(m.t)} ${m.title}`);
  return `Music brief: ${c.title}\nFeeling: ${c.mood}\nTempo: ${c.bpm} BPM, 4/4\nKey: ${c.key}\nLength: ${c.music} bars and a button ending (${fmt(c.dur)})\nParts: ${c.lanes.map(l => LANE_NAME[l.id].toLowerCase()).join(', ')}\nCraft: ${c.craft.join(', ')}\nShape: ${moments.join('; ')}\nPrompt: ${c.prompt}`;
}

/* ---- saved state: the call slip survives a reload ---- */
const KEY = 'cue-library:v3';
export const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
export function persist() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {} }
