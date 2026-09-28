// The Cue Library: wiring the rooms together.
import * as E from './engine.js?v=3';
import { L, $, loadLibrary, reduce } from './lib.js?v=3';
import { startRoom } from './room.js?v=3';
import { buildIsland, onIsland, setOpen, peek } from './island.js?v=3';
import { initWall, markCurrent } from './wall.js?v=3';
import { initCutting, onCutting, setRecord as cutRecord, momentStamp, cameFromLink } from './cutting.js?v=3';
import { initLexicon, onLexicon, showTerm, refreshPins } from './lexicon.js?v=3';
import { initSlip, onSlip, togglePin, isPinned, setRecord as slipRecord, setTimings, filmType } from './slip.js?v=3';
import { mountArt } from './art.js?v=3';

function selectRecord(id, { play = false, from = 0 } = {}) {
  const c = L.byId[id]; if (!c) return;
  E.select(c);
  if (play) E.play({ from, rate: 1 });
}

(async () => {
  await loadLibrary();
  mountArt();
  buildIsland();
  E.on('clip', c => markCurrent(c.id));
  initWall(selectRecord);
  initLexicon();
  initSlip();
  initCutting((id, o) => selectRecord(id, o));
  selectRecord(L.byId['10-future-bass'] ? '10-future-bass' : L.STYLES[0].id);

  onIsland('select', (id, o) => selectRecord(id, o));
  onIsland('showTerm', k => showTerm(k));
  onIsland('pinRecord', c => slipRecord(c));
  onIsland('fitRecord', c => { cutRecord(c.id); $('cutting').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); });
  onIsland('moment', m => momentStamp(m));
  onLexicon('hear', (id, t) => { selectRecord(id, { play: true, from: Math.max(0, t - 1.5) }); peek(); });
  onLexicon('pin', k => togglePin(k));
  onLexicon('isPinned', k => isPinned(k));
  onSlip('pinsChanged', () => refreshPins());
  onCutting('toSlip', (t, c) => setTimings(t, c));
  onCutting('filmType', () => filmType());

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]'); if (!a) return;
    if (a.dataset.action === 'needle') { selectRecord('10-future-bass', { play: true, from: 0 }); setOpen(true); }
    if (a.dataset.action === 'open-booth') { if (!E.state.playing) E.play({ from: 0 }); setOpen(true); }
  });
  // warm the first record as soon as the visitor touches the page
  addEventListener('pointerdown', () => E.preload(E.state.clip), { once: true });

  // top bar, section highlight and gentle reveals
  const bar = $('topbar'); const onScroll = () => bar.classList.toggle('solid', scrollY > 40); onScroll(); addEventListener('scroll', onScroll, { passive: true });
  ['wall', 'cutting', 'lexicon', 'slip'].forEach(id => sectionObs.observe($(id)));
  const rv = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); rv.unobserve(en.target); } }), { threshold: .12 });
  document.querySelectorAll('.sec-head,.letter,.about-side .card,.room-tile,.compass,.screen-tile,.fit-col>*,.slip,.slip-tips,.colophon>*').forEach(el => { el.classList.add('rv'); rv.observe(el); });
  if (cameFromLink()) setTimeout(() => $('cutting').scrollIntoView(), 300);

  // paint the room once the page has settled, then fade it in
  const paint = () => {
    const cv = $('room');
    startRoom(cv, () => ({ playing: E.state.playing, level: E.meter.level, bass: E.meter.bass, color: E.state.clip ? E.state.clip.labelCol : '#7C2B22', progress: E.state.clip ? E.now() / E.state.clip.dur : 0 }));
    setTimeout(() => cv.classList.add('painted'), 30);
  };
  ('requestIdleCallback' in window) ? requestIdleCallback(paint, { timeout: 600 }) : setTimeout(paint, 120);
})();
const sectionObs = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) document.querySelectorAll('.links a').forEach(l => l.classList.toggle('cur', l.getAttribute('href') === '#' + en.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
