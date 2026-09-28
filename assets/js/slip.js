// Room IV: the call slip. Everything gathered, typed up as a brief.
import { L, $, esc, fmt2, toast, copyText, saved, persist, reduce, LANE_NAME } from './lib.js?v=3';
import { headingText, compassState } from './wall.js?v=3';

const S = saved.slip || (saved.slip = { film: 'launch film', len: '16 seconds', what: '', feel: '', record: '10-future-bass', timings: null, words: [], no: 1000 + Math.floor(Math.random() * 8999) });
let tab = 'ai', typing = 0, hooks = {};
export function onSlip(name, fn) { hooks[name] = fn; }
export const isPinned = k => S.words.includes(k);
export function filmType() { return S.film; }

export function initSlip() {
  $('slipNo').textContent = 'No. ' + String(S.no).padStart(4, '0');
  $('sFilm').value = S.film; $('sLen').value = S.len; $('sWhat').value = S.what; $('sFeel').value = S.feel;
  ['sFilm', 'sLen', 'sWhat', 'sFeel'].forEach(id => $(id).addEventListener('input', () => { S.film = $('sFilm').value; S.len = $('sLen').value; S.what = $('sWhat').value; S.feel = $('sFeel').value; persist(); render(false); }));
  document.querySelector('.out-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.out; document.querySelectorAll('.out-tabs button').forEach(x => x.setAttribute('aria-selected', x === b)); render(true); });
  $('sWords').addEventListener('click', e => { const b = e.target.closest('[data-unpin]'); if (b) togglePin(b.dataset.unpin); });
  $('sRecord').addEventListener('click', e => { if (e.target.closest('[data-goto]')) document.getElementById('wall').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); });
  $('slipCopy').addEventListener('click', () => copyText(text(), tab === 'ai' ? 'Prompt' : 'Brief'));
  $('slipDownload').addEventListener('click', () => { const blob = new Blob([text()], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = tab === 'ai' ? 'music-prompt.txt' : 'music-brief.txt'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
  $('slipClear').addEventListener('click', () => { S.words = []; S.timings = null; S.what = ''; S.feel = ''; $('sWhat').value = ''; $('sFeel').value = ''; persist(); render(true); hooks.pinsChanged && hooks.pinsChanged(); toast('The slip is clear'); });
  new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting && !typed) { typed = true; render(true); } }), { threshold: .25 }).observe($('slipCard'));
  render(false);
}
let typed = false;
export function togglePin(k) {
  const i = S.words.indexOf(k); if (i >= 0) S.words.splice(i, 1); else S.words.push(k);
  persist(); render(false); hooks.pinsChanged && hooks.pinsChanged();
  toast(i >= 0 ? `“${L.GLOSS[k].title}” removed from the slip` : `“${L.GLOSS[k].title}” pinned to the slip`);
}
export function setRecord(c) { if (!c || c.kind !== 'style') { toast('Examples are for listening; pin a record from the wall'); return; } S.record = c.id; S.timings = null; persist(); render(false); toast(`${c.title} pinned to the slip`); }
export function setTimings(t, c) { if (c) S.record = c.id; S.timings = t; if (t && t.len) { S.len = `${t.len} seconds`; $('sLen').value = S.len; } persist(); render(true); document.getElementById('slip').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); toast('Timings sent to the call slip'); }
export function count() { return S.words.length + (S.timings ? 1 : 0); }

function render(animate) {
  const c = L.byId[S.record];
  $('sRecord').innerHTML = c ? `${esc(c.title)} · ${c.bpm} BPM · ${esc(c.key)} <em>(<button type="button" data-goto style="background:none;border:0;padding:0;font:inherit;color:#7C2B22;cursor:pointer;text-decoration:underline">change</button>)</em>` : '<em>Pin a record from the wall</em>';
  const t = S.timings;
  $('sTimes').innerHTML = t ? `${t.bpm} BPM${t.reveal != null ? ` · drop ${fmt2(t.reveal)}` : ''}${t.end != null ? ` · final chord ${fmt2(t.end)}` : ''}${t.cuts && t.cuts.length ? ` · ${t.cuts.length} cut${t.cuts.length > 1 ? 's' : ''}` : ''}` : '<em>Fit the record in the cutting room to add exact timings</em>';
  $('sWords').innerHTML = S.words.length ? S.words.map(k => `<span class="chip">${esc(L.GLOSS[k].title)}<button type="button" data-unpin="${k}" aria-label="Remove ${esc(L.GLOSS[k].title)}">×</button></span>`).join('') : '<em style="font-family:var(--serif);color:var(--faded)">Pin words from the lexicon</em>';
  const n = $('slipCount'); const k = count(); n.hidden = !k; n.textContent = k;
  typeOut(text(), animate && !reduce);
}
function wordPhrases() {
  const map = { 'stop-down': 'a one-beat stop-down just before the drop', sidechain: 'sidechain pumping on the pads', riser: 'a riser that ends exactly on the drop', button: 'a button ending: one final chord, left to ring', 'half-time': 'a half-time feel in the drop', swing: 'a gentle swing', 'filter-sweep': 'a filter sweep opening through the build', drone: 'a low drone underneath', 'four-on-the-floor': 'a four-on-the-floor kick', 'voice-band': 'a clear mid-range for voice-over', breakdown: 'a breakdown with the drums out' };
  return S.words.map(k => map[k] || L.GLOSS[k].title.toLowerCase().replace(/\s*\/.*$/, '').replace(/\s*\(.*\)$/, ''));
}
export function text() {
  const c = L.byId[S.record], t = S.timings, words = wordPhrases();
  const feel = S.feel.trim() || (c ? c.mood : 'confident');
  const bpm = t ? Math.round(t.bpm) : c ? c.bpm : 120;
  if (tab === 'ai') {
    const parts = [];
    parts.push(`Instrumental ${c ? c.title.toLowerCase().replace(/\s*\(.*\)/, '') : 'cue'} for a ${S.film}, ${S.len || 'about 30 seconds'}.`);
    parts.push(`${bpm} BPM${c ? ', ' + c.key : ''}.`);
    if (c) parts.push(c.prompt.replace(/^Instrumental [^,.]*[,.]\s*\d+ BPM[^,.]*,\s*[^.]*\.\s*/i, '').replace(/\s*No vocals\.?/i, '').trim());
    parts.push(`Feeling: ${feel}.`);
    if (compassState.touched) parts.push(`Character: ${headingText()}.`);
    if (t) { const sh = []; if (t.start > .1) sh.push(`music enters at ${fmt2(t.start)}`); if (t.reveal != null) sh.push(`build to a drop exactly at ${fmt2(t.reveal)}`); if (t.end != null) sh.push(`one final chord at ${fmt2(t.end)}, left to ring`); if (sh.length) parts.push(`Shape: ${sh.join('; ')}.`); }
    if (words.length) parts.push(`Include ${words.join(', ')}.`);
    if (S.what.trim()) parts.push(`On screen: ${S.what.trim()}.`);
    parts.push('No vocals, no stock claps, no fade-out.');
    return parts.join(' ').replace(/\.\./g, '.').replace(/\s+/g, ' ');
  }
  const L1 = ['MUSIC BRIEF', '', `Film       ${cap(S.film)}, ${S.len || 'length to confirm'}`];
  if (S.what.trim()) L1.push(`On screen  ${S.what.trim()}`);
  L1.push(`Feeling    ${feel}`);
  if (c) L1.push(`Reference  ${c.title} (The Cue Library, CL-${String(c.no).padStart(2, '0')}): ${c.mood}`);
  L1.push(`Tempo      ${bpm} BPM, 4/4${c ? `    Key  ${c.key}` : ''}`);
  if (t) { L1.push('', 'Timings'); if (t.start > .1) L1.push(`  ${fmt2(t.start)}  music in`); if (t.reveal != null) L1.push(`  ${fmt2(t.reveal)}  reveal: the drop lands here`); if (t.end != null) L1.push(`  ${fmt2(t.end)}  end card: one final chord, left to ring`); if (t.cuts && t.cuts.length) L1.push(`  cuts on   ${t.cuts.map(fmt2).join(', ')}`); }
  if (c) L1.push('', `Parts      ${c.lanes.map(l => LANE_NAME[l.id].toLowerCase()).join(', ')}`, `Craft      ${c.craft.join(', ')}`);
  if (words.length) L1.push(`Also       ${words.join('; ')}`);
  L1.push('', 'Avoid      vocals, crash cymbals, stock claps, fade-outs', 'Deliver    WAV, 48 kHz; stems for drums, bass, chords, melody and effects; mastered near -14 LUFS');
  return L1.join('\n');
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function typeOut(str, animate) {
  const out = $('slipOut'); cancelAnimationFrame(typing);
  if (!animate) { out.textContent = str; return; }
  let i = 0; const per = Math.max(3, Math.ceil(str.length / 70));
  const stepF = () => { i = Math.min(str.length, i + per); out.innerHTML = esc(str.slice(0, i)) + (i < str.length ? '<span class="caret"></span>' : ''); if (i < str.length) typing = requestAnimationFrame(stepF); };
  stepF();
}
