// The studio room: a painted, living background drawn entirely with canvas.
// Static layers are painted once per resize; light, rain, dust, steam and the
// turntable are animated on top and react to whatever is playing.

const DW = 1600, DH = 1000;              // design space
const TAU = Math.PI * 2;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function lin(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function rad(g, x, y, r0, r1, stops, x1 = x, y1 = y) { const gr = g.createRadialGradient(x, y, r0, x1, y1, r1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function rrect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* ---------- textures ---------- */
function woodPattern(base, dark, light, w = 420, h = 120, seed = 7) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const R = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const y = R() * h, amp = 1 + R() * 4, f = .004 + R() * .01, ph = R() * TAU;
    g.strokeStyle = R() < .6 ? dark : light; g.globalAlpha = .08 + R() * .18; g.lineWidth = .6 + R() * 2.2;
    g.beginPath(); for (let x = 0; x <= w; x += 6) { const yy = y + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph) * amp * .3; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke();
  }
  for (let i = 0; i < 3; i++) { // knots
    const x = R() * w, y = R() * h; g.globalAlpha = .18; g.strokeStyle = dark;
    for (let k = 1; k < 6; k++) { g.beginPath(); g.ellipse(x, y, k * 5, k * 1.8, 0, 0, TAU); g.stroke(); }
  }
  g.globalAlpha = 1; return c;
}
function damask(color, alpha) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 88; const g = c.getContext('2d');
  g.globalAlpha = alpha; g.fillStyle = color; g.strokeStyle = color; g.lineWidth = 1.2;
  const motif = (x, y, s) => { g.beginPath(); g.moveTo(x, y - 14 * s); g.bezierCurveTo(x + 9 * s, y - 6 * s, x + 9 * s, y + 6 * s, x, y + 14 * s); g.bezierCurveTo(x - 9 * s, y + 6 * s, x - 9 * s, y - 6 * s, x, y - 14 * s); g.fill();
    g.beginPath(); g.arc(x, y - 20 * s, 2.2 * s, 0, TAU); g.fill(); g.beginPath(); g.arc(x, y + 20 * s, 2.2 * s, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(x - 14 * s, y); g.quadraticCurveTo(x - 7 * s, y - 5 * s, x - 3 * s, y); g.moveTo(x + 14 * s, y); g.quadraticCurveTo(x + 7 * s, y - 5 * s, x + 3 * s, y); g.stroke(); };
  motif(32, 44, 1); motif(0, 0, .7); motif(64, 0, .7); motif(0, 88, .7); motif(64, 88, .7);
  return c;
}

/* ---------- the painter ---------- */
export function startRoom(canvas, audio) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, S = 1, OX = 0, OY = 0; // cover transform
  const layers = { far: null, mid: null, near: null, grade: null };
  const R = rng(42);
  const woodDark = woodPattern('#2A1810', '#140A05', '#4A2C1A', 420, 120, 3);
  const woodMid = woodPattern('#4A2A17', '#23110A', '#7A4A2A', 420, 120, 11);
  const woodFloor = woodPattern('#2E1B10', '#150B06', '#503020', 600, 60, 23);
  const paper = damask('#D9A86A', .09);

  // static scene data (seeded so the room is always the same room)
  const city = []; { let x = 118; while (x < 470) { const w = 18 + R() * 42, h = 40 + R() * 120, far = R() < .45; city.push({ x, w, h, far }); x += w * (far ? .6 : 1) + 2; } }
  const litWins = []; city.forEach(b => { if (b.far) return; for (let yy = 600 - b.h + 10; yy < 590; yy += 12) for (let xx = b.x + 5; xx < b.x + b.w - 6; xx += 9) if (R() < .22) litWins.push({ x: xx, y: yy, p: R() * TAU, s: .2 + R() * .8, warm: R() < .8 }); });
  const stars = Array.from({ length: 26 }, () => ({ x: 125 + R() * 330, y: 160 + R() * 200, r: .5 + R() * 1.1, p: R() * TAU }));
  const spines = []; {
    const pal = ['#7C2B22', '#1E3A2F', '#B38B45', '#D9C49C', '#2C4A5A', '#8A3A2E', '#5F7F6E', '#C98A5E', '#3A2A1E', '#6D51A0', '#A3342A', '#E0CFA9', '#243039', '#9A7430'];
    const rows = [[160, 272], [292, 412], [432, 552]];
    rows.forEach(([top, bot], ri) => { let x = 622; while (x < 1036) {
      if (R() < .09 && x < 990) { spines.push({ face: true, x, y: bot - 96, w: 96, h: 96, c: pal[(R() * pal.length) | 0], c2: pal[(R() * pal.length) | 0], art: (R() * 3) | 0 }); x += 100; continue; }
      if (R() < .05) { x += 18; continue; }
      const w = 5 + R() * 5, h = (bot - top) - 6 - R() * 12, lean = R() < .06 ? (R() - .5) * .25 : 0;
      spines.push({ x, y: bot - h, w, h, c: pal[(R() * pal.length) | 0], lean, band: R() < .4 }); x += w + .6; } });
  }
  const motes = Array.from({ length: 80 }, () => ({ x: R() * DW, y: 80 + R() * 820, z: .4 + R() * .9, vx: (R() - .5) * 4, vy: -1 - R() * 3, p: R() * TAU }));
  const drops = Array.from({ length: 70 }, () => ({ x: 120 + R() * 340, y: 150 + R() * 450, v: 380 + R() * 380, l: 8 + R() * 16 }));
  const beads = Array.from({ length: 14 }, () => ({ x: 125 + R() * 330, y: 160 + R() * 420, v: 6 + R() * 18, r: 1.2 + R() * 1.8 }));

  function inWindow(x, y) { // panes: arch + rectangle
    if (x < 128 || x > 452 || y > 592) return false;
    if (y >= 330) return true; const dx = x - 290, dy = y - 330; return dx * dx + dy * dy < 162 * 162;
  }
  function windowPath(g) { g.beginPath(); g.moveTo(128, 592); g.lineTo(128, 330); g.arc(290, 330, 162, Math.PI, 0); g.lineTo(452, 592); g.closePath(); }

  /* ---- far layer: wall, window, shelf, poster, floor, rug ---- */
  function paintFar(g) {
    // wall
    g.fillStyle = lin(g, 0, 0, 0, 760, [[0, '#1C110B'], [.35, '#34201A'], [.7, '#3A2319'], [1, '#27170F']]); g.fillRect(-40, -40, DW + 80, 820);
    g.save(); g.fillStyle = g.createPattern(paper, 'repeat'); g.fillRect(-40, 120, DW + 80, 440); g.restore();
    // picture rail and crown shadow
    g.fillStyle = lin(g, 0, 0, 0, 120, [[0, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(-40, -40, DW + 80, 160);
    g.fillStyle = '#20130C'; g.fillRect(-40, 112, DW + 80, 10); g.fillStyle = 'rgba(214,178,106,.18)'; g.fillRect(-40, 112, DW + 80, 1.5);
    // wainscot
    g.save(); g.fillStyle = g.createPattern(woodDark, 'repeat'); g.fillRect(-40, 560, DW + 80, 210); g.restore();
    g.fillStyle = '#1A0E07'; g.fillRect(-40, 556, DW + 80, 14); g.fillStyle = 'rgba(230,190,120,.22)'; g.fillRect(-40, 556, DW + 80, 2);
    for (let x = -20; x < DW + 40; x += 150) { // raised panels
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 3; g.strokeRect(x + 14, 590, 122, 150);
      g.strokeStyle = 'rgba(230,180,110,.10)'; g.lineWidth = 1.5; g.strokeRect(x + 17, 593, 116, 144);
    }
    g.fillStyle = '#140A05'; g.fillRect(-40, 752, DW + 80, 16);
    // floor
    g.save(); g.beginPath(); g.rect(-40, 766, DW + 80, 280); g.clip();
    g.fillStyle = g.createPattern(woodFloor, 'repeat'); g.fillRect(-40, 766, DW + 80, 280);
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; const vx = 800, vy = 380;
    for (let i = -24; i <= 24; i++) { const xb = 800 + i * 95; g.beginPath(); g.moveTo(xb, 1040); g.lineTo(vx + (xb - vx) * ((766 - vy) / (1040 - vy)), 766); g.stroke(); }
    g.fillStyle = lin(g, 0, 766, 0, 1040, [[0, 'rgba(0,0,0,.55)'], [.4, 'rgba(0,0,0,.15)'], [1, 'rgba(0,0,0,.35)']]); g.fillRect(-40, 766, DW + 80, 280);
    g.restore();
    // window light falling on floor
    g.fillStyle = lin(g, 0, 770, 0, 1000, [[0, 'rgba(150,170,210,.10)'], [1, 'rgba(150,170,210,0)']]);
    g.beginPath(); g.moveTo(150, 770); g.lineTo(440, 770); g.lineTo(700, 1000); g.lineTo(260, 1000); g.fill();
    // rug
    g.save(); g.beginPath(); g.moveTo(470, 832); g.lineTo(1250, 832); g.lineTo(1420, 1010); g.lineTo(300, 1010); g.closePath(); g.clip();
    g.fillStyle = '#4A1A15'; g.fillRect(280, 820, 1160, 200);
    const band = (inset, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(470 + inset * 1.5, 832 + inset); g.lineTo(1250 - inset * 1.5, 832 + inset); g.lineTo(1420 - inset * 2.4, 1010 + inset); g.lineTo(300 + inset * 2.4, 1010 + inset); g.closePath(); g.stroke(); };
    band(6, '#1F2A3A', 10); band(16, '#B38B45', 2); band(28, '#1F2A3A', 14);
    for (let k = 0; k < 18; k++) { const t = k / 17, x = 520 + t * 690, y = 848; g.fillStyle = '#B38B45'; g.globalAlpha = .55; g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 7, y); g.lineTo(x, y + 5); g.lineTo(x - 7, y); g.fill(); }
    g.globalAlpha = .5; g.fillStyle = '#8C3A2A'; g.beginPath(); g.ellipse(860, 930, 220, 44, 0, 0, TAU); g.fill(); g.fillStyle = '#1F2A3A'; g.beginPath(); g.ellipse(860, 930, 120, 22, 0, 0, TAU); g.fill();
    g.globalAlpha = 1; g.fillStyle = lin(g, 0, 832, 0, 1010, [[0, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,.05)']]); g.fillRect(280, 820, 1160, 200); g.restore();

    // window: sky
    g.save(); windowPath(g); g.clip();
    g.fillStyle = lin(g, 0, 160, 0, 600, [[0, '#0E1624'], [.35, '#232A45'], [.62, '#5B3F57'], [.82, '#B8684A'], [1, '#E0924F']]); g.fillRect(120, 150, 340, 450);
    g.fillStyle = rad(g, 290, 590, 10, 260, [[0, 'rgba(255,170,90,.45)'], [1, 'rgba(255,170,90,0)']]); g.fillRect(120, 150, 340, 450);
    g.fillStyle = rad(g, 372, 232, 10, 90, [[0, 'rgba(255,240,210,.35)'], [1, 'rgba(255,240,210,0)']]); g.fillRect(120, 150, 340, 450);
    g.fillStyle = '#F4EAD2'; g.beginPath(); g.arc(372, 232, 20, 0, TAU); g.fill(); g.fillStyle = '#232A45'; g.globalAlpha = .9; g.beginPath(); g.arc(381, 227, 18, 0, TAU); g.fill(); g.globalAlpha = 1;
    city.filter(b => b.far).forEach(b => { g.fillStyle = '#3A2B3C'; g.fillRect(b.x, 600 - b.h * .8 - 20, b.w, b.h * .8 + 20); });
    city.filter(b => !b.far).forEach(b => { g.fillStyle = '#150F16'; g.fillRect(b.x, 600 - b.h, b.w, b.h);
      if (b.h > 110) { g.fillRect(b.x + b.w / 2 - 1, 600 - b.h - 18, 2, 18); } });
    g.restore();
    // curtains' shadow on wall, window reveal, frame
    g.fillStyle = 'rgba(0,0,0,.35)'; windowPath(g); g.save(); g.translate(8, 10); g.fill(); g.restore();
    g.lineWidth = 16; g.strokeStyle = '#1B100A'; windowPath(g); g.stroke();
    g.lineWidth = 3; g.strokeStyle = 'rgba(214,178,106,.25)'; windowPath(g); g.stroke();
    g.fillStyle = '#1B100A'; g.fillRect(284, 170, 12, 424); g.fillRect(128, 324, 324, 11); g.fillRect(128, 458, 324, 9);
    g.fillStyle = 'rgba(214,178,106,.18)'; g.fillRect(284, 170, 2, 424); g.fillRect(128, 324, 324, 1.5);
    // sill
    g.fillStyle = '#2C1A10'; g.fillRect(100, 594, 380, 16); g.fillStyle = 'rgba(230,190,120,.25)'; g.fillRect(100, 594, 380, 2); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(104, 610, 372, 8);
    // a little plant on the sill
    g.fillStyle = '#6E3B26'; g.beginPath(); g.moveTo(392, 594); g.lineTo(430, 594); g.lineTo(424, 566); g.lineTo(398, 566); g.fill();
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * .28; g.strokeStyle = i % 2 ? '#2F4A34' : '#3F6044'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(411, 568); g.quadraticCurveTo(411 + Math.cos(a) * 20, 560 + Math.sin(a) * 30, 411 + Math.cos(a) * 34, 566 + Math.sin(a) * 40); g.stroke(); }
    // curtains
    const curtain = (x0, x1, dir) => {
      g.save(); g.beginPath(); g.moveTo(x0, 118); g.lineTo(x1, 118);
      g.bezierCurveTo(x1 - dir * 10, 380, x1 + dir * 30, 520, x1 + dir * 4, 740); g.lineTo(x0, 740); g.closePath(); g.clip();
      g.fillStyle = '#4E1712'; g.fillRect(x0 - 40, 110, (x1 - x0) + 80, 640);
      const n = 7; for (let i = 0; i < n; i++) { const fx = x0 + (i + .5) / n * (x1 - x0);
        g.fillStyle = lin(g, fx - 16, 0, fx + 16, 0, [[0, 'rgba(0,0,0,.35)'], [.45, 'rgba(255,160,120,.14)'], [1, 'rgba(0,0,0,.35)']]); g.fillRect(fx - 16, 110, 32, 640); }
      g.fillStyle = lin(g, 0, 110, 0, 740, [[0, 'rgba(0,0,0,.5)'], [.3, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.45)']]); g.fillRect(x0 - 40, 110, (x1 - x0) + 80, 640);
      g.restore();
    };
    curtain(52, 170, 1); curtain(410, 528, -1);
    // rod
    g.fillStyle = lin(g, 0, 104, 0, 116, [[0, '#E6C98A'], [.5, '#9A7430'], [1, '#4A3414']]); rrect(g, 36, 104, 510, 10, 5); g.fill();
    [36, 546].forEach(x => { g.fillStyle = '#C9A25A'; g.beginPath(); g.arc(x, 109, 10, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,240,200,.6)'; g.beginPath(); g.arc(x - 3, 106, 3, 0, TAU); g.fill(); });

    // bookcase of records
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(612, 146, 460, 630);
    g.save(); g.fillStyle = g.createPattern(woodMid, 'repeat'); g.fillRect(600, 136, 452, 628); g.restore();
    g.fillStyle = '#1A0D07'; g.fillRect(618, 156, 418, 600);
    g.fillStyle = lin(g, 618, 0, 1036, 0, [[0, 'rgba(0,0,0,.5)'], [.2, 'rgba(0,0,0,.1)'], [.8, 'rgba(0,0,0,.1)'], [1, 'rgba(0,0,0,.5)']]); g.fillRect(618, 156, 418, 600);
    spines.forEach(s => {
      if (s.face) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(s.x + 3, s.y + 3, s.w, s.h); g.fillStyle = s.c; g.fillRect(s.x, s.y, s.w, s.h);
        g.fillStyle = s.c2; if (s.art === 0) { g.beginPath(); g.arc(s.x + s.w * .5, s.y + s.h * .45, s.w * .3, 0, TAU); g.fill(); }
        else if (s.art === 1) { for (let k = 0; k < 5; k++) g.fillRect(s.x + 10, s.y + 14 + k * 14, s.w - 20, 6); }
        else { g.beginPath(); g.moveTo(s.x, s.y + s.h); g.lineTo(s.x + s.w, s.y + s.h * .25); g.lineTo(s.x + s.w, s.y + s.h); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(s.x, s.y, s.w, s.h * .4); return; }
      g.save(); g.translate(s.x, s.y + s.h); g.rotate(s.lean);
      g.fillStyle = s.c; g.fillRect(0, -s.h, s.w, s.h);
      g.fillStyle = 'rgba(255,240,210,.14)'; g.fillRect(0, -s.h, 1, s.h); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(s.w - 1, -s.h, 1, s.h);
      if (s.band) { g.fillStyle = 'rgba(230,200,140,.35)'; g.fillRect(0, -s.h * .7, s.w, 3); }
      g.restore();
    });
    [272, 412, 552].forEach(y => { g.fillStyle = '#3A2012'; g.fillRect(612, y, 430, 14); g.fillStyle = 'rgba(240,200,140,.22)'; g.fillRect(612, y, 430, 2); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(618, y + 14, 418, 10); });
    g.fillStyle = '#3A2012'; g.fillRect(600, 136, 452, 22); g.fillStyle = 'rgba(240,200,140,.25)'; g.fillRect(600, 136, 452, 2);
    g.fillStyle = '#2A170D'; g.fillRect(600, 136, 18, 628); g.fillRect(1034, 136, 18, 628);
    // a small brass bust / trophy on the top
    g.fillStyle = '#B38B45'; rrect(g, 940, 106, 40, 30, 4); g.fill(); g.fillStyle = '#6E5020'; g.fillRect(946, 130, 28, 6);
    g.beginPath(); g.fillStyle = lin(g, 930, 0, 990, 0, [[0, '#7A5A24'], [.5, '#E8CC8A'], [1, '#7A5A24']]); g.moveTo(944, 106); g.bezierCurveTo(944, 70, 976, 70, 976, 106); g.fill();

    // poster, right wall
    const px = 1180, py = 168, pw = 220, ph = 300;
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(px + 10, py + 12, pw, ph);
    g.fillStyle = lin(g, px, py, px + pw, py + ph, [[0, '#8A6424'], [.3, '#E6C98A'], [.6, '#9A7430'], [1, '#5A3E14']]); g.fillRect(px - 10, py - 10, pw + 20, ph + 20);
    g.fillStyle = '#16302C'; g.fillRect(px, py, pw, ph);
    g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip();
    for (let i = 0; i < 18; i++) { const a = Math.PI + (i / 17) * Math.PI; g.fillStyle = i % 2 ? '#E9D9B4' : '#C9A25A'; g.globalAlpha = .9;
      g.beginPath(); g.moveTo(px + pw / 2, py + ph * .62); g.arc(px + pw / 2, py + ph * .62, 260, a, a + Math.PI / 17); g.fill(); }
    g.globalAlpha = 1; g.fillStyle = '#16302C'; g.beginPath(); g.arc(px + pw / 2, py + ph * .62, 62, 0, TAU); g.fill();
    g.fillStyle = '#7C2B22'; g.beginPath(); g.arc(px + pw / 2, py + ph * .62, 44, 0, TAU); g.fill();
    g.fillStyle = '#16302C'; g.fillRect(px, py + ph * .76, pw, ph * .24);
    g.restore();
    // poster type and a sax figure drawn in the poster
    g.strokeStyle = 'rgba(233,217,180,.35)'; g.lineWidth = 1; for (let k = 1; k < 5; k++) { g.beginPath(); g.arc(px + pw / 2, py + ph * .62, 44 - k * 7, 0, TAU); g.stroke(); }
    g.fillStyle = '#E9D9B4'; g.beginPath(); g.arc(px + pw / 2, py + ph * .62, 5, 0, TAU); g.fill();
    g.strokeStyle = '#C9A25A'; g.lineWidth = 1.5; [-1, 1].forEach(d => { g.beginPath(); g.moveTo(px + pw / 2 + d * 70, py + ph * .40); g.lineTo(px + pw / 2 + d * 70, py + ph * .74); g.stroke(); });
    g.fillStyle = '#E9D9B4'; g.textAlign = 'center';
    g.font = `600 22px "Cormorant Garamond", Georgia, serif`; g.fillText('MIDNIGHT', px + pw / 2, py + ph * .86);
    g.font = `italic 15px "Cormorant Garamond", Georgia, serif`; g.fillText('sessions · no. 7', px + pw / 2, py + ph * .93);
    g.font = `600 11px "Cormorant Garamond", Georgia, serif`; g.fillText('LE SALON DU DISQUE', px + pw / 2, py + 22);
    // small framed record above the window side
    const fx = 1084, fy = 190; g.save(); g.translate(fx, fy); g.scale(.72, .72); g.translate(-fx, -fy);
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(fx + 6, fy + 8, 110, 110);
    g.fillStyle = '#20130B'; g.fillRect(fx - 6, fy - 6, 122, 122); g.fillStyle = '#E9DCC0'; g.fillRect(fx, fy, 110, 110);
    g.fillStyle = rad(g, fx + 55, fy + 55, 2, 44, [[0, '#E8CC8A'], [.35, '#C9A25A'], [.36, '#1a1612'], [1, '#0d0b09']]); g.beginPath(); g.arc(fx + 55, fy + 55, 44, 0, TAU); g.fill();
    g.fillStyle = '#7C2B22'; g.beginPath(); g.arc(fx + 55, fy + 55, 13, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(fx + 40, fy + 38, 26, 10, -.7, 0, TAU); g.fill(); g.restore();
  }

  /* ---- mid layer: gramophone, lamp, armchair, saxophone on its stand ---- */
  function drawSax(g, x, y, s, col, silhouette) {
    g.save(); g.translate(x, y); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round';
    const body = new Path2D('M40 -170 C30 -150 18 -120 12 -80 C6 -40 6 0 6 60 C6 110 -20 140 -58 140 C-96 140 -118 112 -118 80 L-118 58');
    const neck = new Path2D('M40 -170 C48 -186 62 -196 84 -202');
    if (silhouette) { g.strokeStyle = col; g.lineWidth = 30; g.stroke(body); g.lineWidth = 9; g.stroke(neck);
      g.fillStyle = col; g.beginPath(); g.moveTo(-118, 60); g.bezierCurveTo(-150, 52, -168, 34, -170, 12); g.lineTo(-70, 12); g.bezierCurveTo(-72, 34, -88, 52, -118, 60); g.fill(); g.restore(); return; }
    g.strokeStyle = '#4A3210'; g.lineWidth = 34; g.stroke(body);
    g.strokeStyle = '#A57A2E'; g.lineWidth = 26; g.stroke(body);
    g.strokeStyle = '#D9B560'; g.lineWidth = 12; g.save(); g.translate(-4, -2); g.stroke(body); g.restore();
    g.strokeStyle = 'rgba(255,245,210,.85)'; g.lineWidth = 3; g.save(); g.translate(-7, -3); g.stroke(body); g.restore();
    g.strokeStyle = '#8A6424'; g.lineWidth = 10; g.stroke(neck); g.strokeStyle = '#E6C98A'; g.lineWidth = 3; g.stroke(neck);
    g.strokeStyle = '#141010'; g.lineWidth = 9; g.beginPath(); g.moveTo(84, -202); g.lineTo(104, -208); g.stroke();
    // bell
    g.fillStyle = lin(g, -170, 0, -70, 0, [[0, '#6B4A1C'], [.35, '#E6C98A'], [.6, '#B38B45'], [1, '#6B4A1C']]);
    g.beginPath(); g.moveTo(-104, 64); g.bezierCurveTo(-140, 58, -164, 36, -170, 6); g.lineTo(-66, 6); g.bezierCurveTo(-72, 36, -88, 56, -132, 64); g.fill();
    g.fillStyle = '#2A1B08'; g.beginPath(); g.ellipse(-118, 6, 52, 9, 0, 0, TAU); g.fill();
    g.strokeStyle = '#F2DDA0'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(-118, 6, 52, 9, 0, Math.PI, TAU); g.stroke();
    // key cups
    [[-2, -110], [-4, -80], [-6, -48], [-6, -16], [-6, 16], [-4, 46], [-14, 86]].forEach(([kx, ky], i) => {
      g.fillStyle = '#6B4A1C'; g.beginPath(); g.arc(kx + 18, ky, 8, 0, TAU); g.fill();
      g.fillStyle = i % 2 ? '#EFE3C4' : '#E4D3A6'; g.beginPath(); g.arc(kx + 18, ky, 5.5, 0, TAU); g.fill(); });
    g.strokeStyle = '#8A6424'; g.lineWidth = 2; g.beginPath(); g.moveTo(30, -120); g.lineTo(30, 50); g.stroke();
    g.restore();
  }
  function paintMid(g) {
    // gramophone on a side table, left
    const tx = 160, ty = 700;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(tx + 110, 918, 150, 16, 0, 0, TAU); g.fill();
    g.fillStyle = '#2A170D'; [tx + 10, tx + 200].forEach(x => g.fillRect(x, ty + 40, 12, 175));
    g.save(); g.fillStyle = g.createPattern(woodMid, 'repeat'); g.fillRect(tx - 12, ty + 22, 246, 22); g.restore();
    g.fillStyle = 'rgba(240,200,140,.25)'; g.fillRect(tx - 12, ty + 22, 246, 2);
    g.save(); g.fillStyle = g.createPattern(woodMid, 'repeat'); g.fillRect(tx + 30, ty - 38, 160, 60); g.restore();
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.strokeRect(tx + 36, ty - 32, 148, 48);
    g.fillStyle = 'rgba(240,200,140,.18)'; g.fillRect(tx + 30, ty - 38, 160, 2);
    g.fillStyle = '#B38B45'; g.fillRect(tx + 190, ty - 16, 22, 5); g.beginPath(); g.arc(tx + 214, ty - 13, 6, 0, TAU); g.fill();
    g.fillStyle = '#0E0C0B'; g.beginPath(); g.ellipse(tx + 110, ty - 42, 70, 9, 0, 0, TAU); g.fill();
    // horn
    g.save(); g.translate(tx + 150, ty - 50);
    g.strokeStyle = '#6B4A1C'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(10, -60, -20, -110); g.stroke();
    g.fillStyle = lin(g, -200, -300, -20, -100, [[0, '#E6C98A'], [.35, '#B38B45'], [.7, '#7A5A24'], [1, '#3A2708']]);
    g.beginPath(); g.moveTo(-14, -104); g.bezierCurveTo(-40, -150, -110, -210, -190, -250); g.bezierCurveTo(-150, -300, -60, -300, -40, -230); g.bezierCurveTo(-34, -170, -20, -130, -14, -104); g.fill();
    g.strokeStyle = 'rgba(60,40,10,.6)'; g.lineWidth = 1.5; for (let k = 1; k < 6; k++) { const t = k / 6; g.beginPath(); g.moveTo(-14, -104); g.quadraticCurveTo(-60 - t * 60, -160 - t * 20, -190 + t * 150, -250 - Math.sin(t * Math.PI) * 45); g.stroke(); }
    g.fillStyle = '#2A1B08'; g.beginPath(); g.ellipse(-116, -272, 80, 30, -.55, 0, TAU); g.fill();
    g.strokeStyle = '#F2DDA0'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(-116, -272, 80, 30, -.55, Math.PI * .9, Math.PI * 1.95); g.stroke();
    g.restore();

    // armchair (chesterfield), right
    const cx = 1190, cy = 560;
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(cx + 150, 918, 200, 22, 0, 0, TAU); g.fill();
    g.fillStyle = lin(g, cx, cy, cx + 300, cy + 300, [[0, '#6A2A1E'], [.5, '#4E1C14'], [1, '#2E0F0A']]);
    rrect(g, cx + 20, cy, 270, 250, 40); g.fill();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { const bx = cx + 52 + c * 42 + (r % 2) * 21, by = cy + 36 + r * 40; if (bx > cx + 270) continue;
      g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(bx, by, 3.2, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,190,150,.10)'; g.beginPath(); g.arc(bx - 1, by - 2, 7, 0, TAU); g.fill(); }
    g.fillStyle = lin(g, 0, cy + 170, 0, cy + 270, [[0, '#7A3222'], [1, '#3A140E']]); rrect(g, cx + 30, cy + 170, 250, 90, 22); g.fill();
    [[cx - 10, 1], [cx + 250, -1]].forEach(([ax]) => { g.fillStyle = lin(g, ax, 0, ax + 70, 0, [[0, '#3A140E'], [.45, '#8A3A28'], [1, '#3A140E']]); rrect(g, ax, cy + 110, 70, 200, 30); g.fill();
      g.fillStyle = 'rgba(255,200,160,.12)'; g.beginPath(); g.ellipse(ax + 35, cy + 124, 28, 12, 0, 0, TAU); g.fill(); });
    g.fillStyle = '#1A0B06'; rrect(g, cx - 4, cy + 300, 300, 34, 8); g.fill();
    [cx + 10, cx + 270].forEach(x => { g.fillStyle = '#140905'; g.fillRect(x, cy + 330, 14, 30); g.fillStyle = '#B38B45'; g.fillRect(x, cy + 352, 14, 6); });
    // a cushion and a folded throw
    g.fillStyle = '#C9A25A'; g.save(); g.translate(cx + 90, cy + 150); g.rotate(-.12); rrect(g, 0, 0, 90, 60, 18); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.stroke(); g.restore();

    // floor lamp
    const lx = 1510;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(lx, 912, 60, 10, 0, 0, TAU); g.fill();
    g.fillStyle = lin(g, lx - 40, 0, lx + 40, 0, [[0, '#4A3414'], [.5, '#D9B560'], [1, '#4A3414']]); g.beginPath(); g.ellipse(lx, 902, 44, 10, 0, 0, TAU); g.fill();
    g.fillStyle = lin(g, lx - 4, 0, lx + 4, 0, [[0, '#6B4A1C'], [.5, '#E6C98A'], [1, '#6B4A1C']]); g.fillRect(lx - 3.5, 250, 7, 652);
    // shade: glowing fabric
    g.beginPath(); g.moveTo(lx - 48, 150); g.lineTo(lx + 48, 150); g.lineTo(lx + 88, 262); g.lineTo(lx - 88, 262); g.closePath();
    g.fillStyle = lin(g, 0, 150, 0, 262, [[0, '#C98A4A'], [.6, '#F1C27A'], [1, '#FFE2A8']]); g.fill();
    g.strokeStyle = 'rgba(90,50,20,.35)'; g.lineWidth = 1.5; for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(lx + k * 11, 150); g.lineTo(lx + k * 20, 262); g.stroke(); }
    g.fillStyle = '#7A4A1C'; g.fillRect(lx - 90, 260, 180, 4);
    for (let k = -88; k <= 88; k += 6) { g.strokeStyle = '#B38B45'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(lx + k, 264); g.lineTo(lx + k, 276 + (k % 12 ? 0 : 3)); g.stroke(); }

    // saxophone on its stand, beside the chair
    const sx = 1318, sy = 760;
    g.strokeStyle = '#141010'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(sx, sy + 90); g.lineTo(sx - 40, 906); g.moveTo(sx, sy + 90); g.lineTo(sx + 44, 904); g.moveTo(sx, sy + 90); g.lineTo(sx + 4, 914); g.moveTo(sx, sy + 90); g.lineTo(sx, sy - 10); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(sx, 912, 70, 10, 0, 0, TAU); g.fill();
    drawSax(g, sx + 26, sy - 20, .78, null, false);
  }

  /* ---- near layer: the console with turntable, tube amp and records ---- */
  const TT = { x: 700, y: 612, rx: 92, ry: 20 };  // platter centre (design space)
  const AMP = { x: 880, y: 560 };
  function paintNear(g) {
    const x0 = 500, x1 = 1100, top = 640;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.ellipse((x0 + x1) / 2, 912, 340, 26, 0, 0, TAU); g.fill();
    // legs
    [[x0 + 30, 1], [x1 - 44, -1]].forEach(([x, d]) => { g.fillStyle = lin(g, x, 0, x + 16, 0, [[0, '#1A0D07'], [.5, '#4A2A17'], [1, '#1A0D07']]);
      g.beginPath(); g.moveTo(x, 800); g.lineTo(x + 16, 800); g.lineTo(x + 12 + d * 10, 908); g.lineTo(x + 6 + d * 10, 908); g.fill();
      g.fillStyle = '#B38B45'; g.fillRect(x + 5 + d * 10, 900, 9, 8); });
    // body
    g.save(); g.fillStyle = g.createPattern(woodMid, 'repeat'); g.fillRect(x0, top, x1 - x0, 165); g.restore();
    g.fillStyle = lin(g, 0, top, 0, top + 165, [[0, 'rgba(255,200,140,.12)'], [.2, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.45)']]); g.fillRect(x0, top, x1 - x0, 165);
    g.fillStyle = '#3A2012'; g.fillRect(x0 - 12, top - 14, x1 - x0 + 24, 16); g.fillStyle = 'rgba(255,215,160,.35)'; g.fillRect(x0 - 12, top - 14, x1 - x0 + 24, 2);
    // doors: speaker grille cloth and record slots
    g.fillStyle = '#2A1A10'; rrect(g, x0 + 24, top + 22, 250, 120, 8); g.fill();
    g.save(); rrect(g, x0 + 30, top + 28, 238, 108, 6); g.clip(); g.fillStyle = '#6E5A3E'; g.fillRect(x0 + 30, top + 28, 238, 108);
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1; for (let k = 0; k < 60; k++) { g.beginPath(); g.moveTo(x0 + 30 + k * 4, top + 28); g.lineTo(x0 + 30 + k * 4, top + 136); g.stroke(); }
    for (let k = 0; k < 30; k++) { g.beginPath(); g.moveTo(x0 + 30, top + 28 + k * 4); g.lineTo(x0 + 268, top + 28 + k * 4); g.stroke(); }
    g.fillStyle = rad(g, x0 + 150, top + 82, 10, 110, [[0, 'rgba(255,220,160,.12)'], [1, 'rgba(0,0,0,.35)']]); g.fillRect(x0 + 30, top + 28, 238, 108); g.restore();
    g.fillStyle = '#20130B'; rrect(g, x0 + 300, top + 22, 276, 120, 8); g.fill();
    for (let k = 0; k < 26; k++) { const cols = ['#7C2B22', '#1E3A2F', '#B38B45', '#D9C49C', '#2C4A5A', '#C98A5E', '#3A2A1E']; g.fillStyle = cols[k % cols.length]; g.fillRect(x0 + 312 + k * 10, top + 34 + (k * 7) % 6, 7, 102 - (k * 7) % 6); g.fillStyle = 'rgba(255,240,210,.1)'; g.fillRect(x0 + 312 + k * 10, top + 34, 1, 100); }
    g.fillStyle = '#B38B45'; [x0 + 288].forEach(x => { g.beginPath(); g.arc(x, top + 82, 4, 0, TAU); g.fill(); });

    // turntable plinth
    const { x, y, rx, ry } = TT;
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(x + 10, top - 4, 150, 12, 0, 0, TAU); g.fill();
    g.fillStyle = '#2E1A0F'; g.beginPath(); g.moveTo(x - 140, y - 4); g.lineTo(x + 140, y - 4); g.lineTo(x + 150, top - 12); g.lineTo(x - 150, top - 12); g.closePath(); g.fill();
    g.fillStyle = lin(g, 0, top - 32, 0, top - 12, [[0, '#5A3620'], [1, '#2A170D']]); g.fillRect(x - 150, top - 32, 300, 20);
    g.fillStyle = 'rgba(255,215,160,.3)'; g.fillRect(x - 150, top - 32, 300, 1.5);
    g.fillStyle = '#B38B45'; g.beginPath(); g.arc(x - 120, top - 22, 4, 0, TAU); g.fill(); g.beginPath(); g.arc(x - 104, top - 22, 4, 0, TAU); g.fill();
    // platter + record (static base; highlights animate)
    g.fillStyle = '#6B6B68'; g.beginPath(); g.ellipse(x, y + 3, rx + 4, ry + 3, 0, 0, TAU); g.fill();
    g.fillStyle = '#0D0C0B'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; for (let k = 1; k < 9; k++) { g.beginPath(); g.ellipse(x, y, rx * (1 - k * .07), ry * (1 - k * .07), 0, 0, TAU); g.stroke(); }
    // tonearm base
    g.fillStyle = '#9A9A94'; g.beginPath(); g.ellipse(x + 118, y - 6, 12, 5, 0, 0, TAU); g.fill();

    // tube amplifier
    const ax = AMP.x, ay = AMP.y;
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(ax + 6, ay + 72, 176, 10);
    g.fillStyle = lin(g, 0, ay + 30, 0, ay + 80, [[0, '#3A3632'], [1, '#1A1816']]); rrect(g, ax, ay + 30, 176, 50, 4); g.fill();
    g.fillStyle = '#C9A25A'; rrect(g, ax + 6, ay + 36, 164, 38, 3); g.fill(); g.fillStyle = '#1A1816'; rrect(g, ax + 9, ay + 39, 158, 32, 2); g.fill();
    // VU window
    g.fillStyle = lin(g, 0, ay + 42, 0, ay + 68, [[0, '#F3D9A0'], [1, '#D8A860']]); rrect(g, ax + 64, ay + 42, 48, 26, 3); g.fill();
    [ax + 24, ax + 44, ax + 132, ax + 152].forEach(kx => { g.fillStyle = '#0E0D0C'; g.beginPath(); g.arc(kx, ay + 55, 7, 0, TAU); g.fill(); g.fillStyle = '#B38B45'; g.beginPath(); g.arc(kx, ay + 55, 2, 0, TAU); g.fill(); });
    // tube bases
    [ax + 40, ax + 88, ax + 136].forEach(tx => { g.fillStyle = '#141210'; rrect(g, tx - 11, ay + 22, 22, 10, 2); g.fill(); });
    // records leaning at the end
    for (let k = 0; k < 5; k++) { g.save(); g.translate(1068 + k * 6, top - 14); g.rotate(-.16 + k * .035); g.fillStyle = ['#C9A25A', '#1E3A2F', '#7C2B22', '#D9C49C', '#2C4A5A'][k]; g.fillRect(-2, -118, 8, 118); g.restore(); }
    // coffee cup and saucer
    g.fillStyle = '#E9E0CC'; g.beginPath(); g.ellipse(560, top - 16, 30, 6, 0, 0, TAU); g.fill();
    g.fillStyle = lin(g, 540, 0, 580, 0, [[0, '#CFC4AE'], [.4, '#F4ECDA'], [1, '#B7AC96']]); g.beginPath(); g.moveTo(542, top - 50); g.lineTo(578, top - 50); g.lineTo(574, top - 20); g.quadraticCurveTo(560, top - 14, 546, top - 20); g.closePath(); g.fill();
    g.strokeStyle = '#E9E0CC'; g.lineWidth = 4; g.beginPath(); g.arc(582, top - 38, 8, -1.2, 1.2); g.stroke();
    g.fillStyle = '#2A170D'; g.beginPath(); g.ellipse(560, top - 50, 18, 3.5, 0, 0, TAU); g.fill();
  }

  /* ---- grade: vignette and warm tone on top of everything ---- */
  function paintGrade(g) {
    g.fillStyle = rad(g, DW * .55, DH * .52, 200, 1050, [[0, 'rgba(0,0,0,0)'], [.6, 'rgba(10,5,2,.25)'], [1, 'rgba(8,4,2,.82)']]); g.fillRect(-60, -60, DW + 120, DH + 120);
    g.fillStyle = lin(g, 0, 0, 0, DH, [[0, 'rgba(10,5,2,.55)'], [.18, 'rgba(10,5,2,0)'], [.85, 'rgba(10,5,2,0)'], [1, 'rgba(10,5,2,.5)']]); g.fillRect(-60, -60, DW + 120, DH + 120);
  }

  /* ================= watercolour pass =================
     The crisp painting is re-rendered as pigment on paper: edges wobble like a
     loaded brush, colour pools at the rims of each wash, pigment granulates in
     the paper tooth, and faint tide lines bloom where washes dried unevenly. */
  function valueNoise(w, h, cell, seed) {
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, R2 = rng(seed), grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = R2();
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { const gy = y / cell, y0 = gy | 0; let fy = gy - y0; fy = fy * fy * (3 - 2 * fy);
      for (let x = 0; x < w; x++) { const gx = x / cell, x0 = gx | 0; let fx = gx - x0; fx = fx * fx * (3 - 2 * fx);
        const a = grid[y0 * gw + x0], b = grid[y0 * gw + x0 + 1], c = grid[(y0 + 1) * gw + x0], d = grid[(y0 + 1) * gw + x0 + 1];
        out[y * w + x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; } }
    return out;
  }
  function boxBlur(src, w, h, r) { // separable box blur on a single channel, run three times ~ gaussian
    let a = src, b = new Float32Array(w * h);
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y < h; y++) { let acc = 0; const row = y * w; for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
        for (let x = 0; x < w; x++) { b[row + x] = acc / (2 * r + 1); acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; } }
      for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (let y = 0; y < h; y++) { a === src && (a = new Float32Array(w * h)); a[y * w + x] = acc / (2 * r + 1); acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; } }
    }
    return a;
  }
  function watercolour(src) {
    const w = src.width, h = src.height, g = src.getContext('2d');
    const img = g.getImageData(0, 0, w, h), px = img.data, n = w * h;
    // 1. wobble: displace every pixel along a smooth noise field
    const amp = Math.max(2.2, w / 300);
    const nx1 = valueNoise(w, h, 46, 11), ny1 = valueNoise(w, h, 46, 29), nx2 = valueNoise(w, h, 9, 5), ny2 = valueNoise(w, h, 9, 17);
    const disp = new Uint8ClampedArray(px.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x;
      const fx = Math.min(w - 1.001, Math.max(0, x + ((nx1[i] - .5) * 2 + (nx2[i] - .5) * .22) * amp));
      const fy = Math.min(h - 1.001, Math.max(0, y + ((ny1[i] - .5) * 2 + (ny2[i] - .5) * .22) * amp));
      const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0, j00 = (y0 * w + x0) * 4, j10 = j00 + 4, j01 = j00 + w * 4, j11 = j01 + 4, o = i * 4;
      for (let c = 0; c < 3; c++) { const top = px[j00 + c] + (px[j10 + c] - px[j00 + c]) * ax, bot = px[j01 + c] + (px[j11 + c] - px[j01 + c]) * ax; disp[o + c] = top + (bot - top) * ay; } }
    // 2. softened colour (small blur) and wide luminance (for edge pooling)
    const ch = [0, 1, 2].map(c => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = disp[i * 4 + c]; return boxBlur(a, w, h, 1); });
    const lum = new Float32Array(n); for (let i = 0; i < n; i++) lum[i] = ch[0][i] * .3 + ch[1][i] * .59 + ch[2][i] * .11;
    const wide = boxBlur(lum, w, h, Math.max(4, Math.round(w / 170)));
    // 3. pigment textures
    const tide = valueNoise(w, h, 70, 71), tide2 = valueNoise(w, h, 28, 83), gran = valueNoise(w, h, 4, 97), wash = valueNoise(w, h, 140, 101);
    const hue = [valueNoise(w, h, 190, 131), valueNoise(w, h, 230, 137), valueNoise(w, h, 170, 139)];
    const R3 = rng(1234);
    const P = [243, 234, 216], HUEW = [.2, .1, .22];                       // cold-press paper
    for (let i = 0; i < n; i++) {
      const e = Math.max(-.28, Math.min(.5, (wide[i] - lum[i]) / 255 * 2.4));     // + inside a darker wash near its rim
      const t = tide[i] * .7 + tide2[i] * .3;
      const rim = Math.exp(-Math.pow((t - .5) / .012, 2)) + Math.exp(-Math.pow((t - .34) / .01, 2)) * .6;
      const gr = (gran[i] - .5) * .16 + (R3() - .5) * .02;
      const unevenWash = .84 + wash[i] * .3;
      const L = lum[i] / 255, sat = .9;
      for (let c = 0; c < 3; c++) {
        let col = ch[c][i]; col = col * sat + lum[i] * (1 - sat);
        let d = 1 - col / 255;                                     // pigment density
        d *= unevenWash * (1 + e * 1.35) * (1 + rim * .065) * (1 + gr * (0.3 + d * .6)) * (1 + (hue[c][i] - .5) * HUEW[c]);
        d = Math.min(.9, Math.max(0, Math.pow(d, 1.04) * .88 + .01)); // dreamy: luminous, never black
        px[i * 4 + c] = P[c] * (1 - d);
      }
      px[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // 4. splatter and a few bleeding blooms, as if the brush was flicked
    g.globalCompositeOperation = 'multiply';
    const R4 = rng(77), cols = ['124,43,34', '44,58,90', '179,139,69', '30,58,47'];
    for (let k = 0; k < 7; k++) { const cx = R4() * w, cy = R4() * h, col = cols[(R4() * cols.length) | 0];
      for (let s = 0; s < 26; s++) { const r = Math.pow(R4(), 2.2) * w * .006 + .6, a = R4() * TAU, dd = Math.pow(R4(), .7) * w * .05;
        g.fillStyle = `rgba(${col},${.12 + R4() * .25})`; g.beginPath(); g.arc(cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, r, 0, TAU); g.fill(); } }
    for (let k = 0; k < 5; k++) { const cx = R4() * w, cy = R4() * h * .8, r = w * (.06 + R4() * .08), col = cols[(R4() * cols.length) | 0];
      g.fillStyle = rad(g, cx, cy, r * .2, r, [[0, `rgba(${col},0)`], [.82, `rgba(${col},.05)`], [.9, `rgba(${col},.13)`], [1, `rgba(${col},0)`]]); g.fillRect(cx - r, cy - r, r * 2, r * 2); }
    g.globalCompositeOperation = 'source-over';
    return src;
  }
  function paperTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const im = g.createImageData(256, 256);
    const nb = valueNoise(256, 256, 3.5, 3), nf = valueNoise(256, 256, 1.2, 9), R5 = rng(5);
    for (let i = 0; i < 256 * 256; i++) { const v = 238 + nb[i] * 14 + nf[i] * 6 - (R5() < .004 ? 30 : 0); im.data[i * 4] = v; im.data[i * 4 + 1] = v - 2; im.data[i * 4 + 2] = v - 6; im.data[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0);
    g.strokeStyle = 'rgba(120,100,70,.10)'; for (let k = 0; k < 40; k++) { g.lineWidth = .5 + R5(); g.beginPath(); const x = R5() * 256, y = R5() * 256; g.moveTo(x, y); g.quadraticCurveTo(x + R5() * 20 - 10, y + R5() * 20 - 10, x + R5() * 30 - 15, y + R5() * 30 - 15); g.stroke(); }
    return c;
  }
  const paperTex = paperTexture();

  // things in front of the window, so rain and city lights stay behind them
  const hornPath = new Path2D(); { const hx = 310, hy = 650; hornPath.moveTo(hx - 14, hy - 104); hornPath.bezierCurveTo(hx - 40, hy - 150, hx - 110, hy - 210, hx - 190, hy - 250); hornPath.bezierCurveTo(hx - 220, hy - 300, hx - 60, hy - 330, hx - 40, hy - 230); hornPath.bezierCurveTo(hx - 34, hy - 170, hx - 10, hy - 110, hx + 6, hy - 60); hornPath.lineTo(hx + 20, hy); hornPath.lineTo(hx - 10, hy); hornPath.closePath(); }
  const hit = document.createElement('canvas').getContext('2d');
  const behindHorn = (x, y) => hit.isPointInPath(hornPath, x, y) || (x > 150 && x < 360 && y > 555);
  litWins.forEach(w => w.hidden = behindHorn(w.x, w.y));

  const stats = window.__room = { layout: 0, frame: 0 };
  const BLEED = 30;
  let stat = null, fxA = null, fxN = null, Q = .62;
  function layout() {
    const T0 = performance.now();
    W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    S = Math.max(W / DW, H / DH) * 1.04;
    const focusX = W < 700 ? .47 : .55;
    OX = W / 2 - DW * focusX * S; OX = Math.min(0, Math.max(W - DW * S, OX));
    OY = H - DH * S; OY = Math.min(0, OY * .6);
    Q = W < 700 ? .9 : W > 1800 ? .5 : .62;               // painting resolution: soft on purpose
    const pw = Math.ceil((W + BLEED * 2) * Q), ph = Math.ceil((H + BLEED * 2) * Q);
    const src = document.createElement('canvas'); src.width = pw; src.height = ph;
    const g = src.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#1A0F09'; g.fillRect(0, 0, pw, ph);
    g.setTransform(S * Q, 0, 0, S * Q, (OX + BLEED) * Q, (OY + BLEED) * Q);
    paintFar(g); paintMid(g); paintNear(g); paintGrade(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
    watercolour(src);
    stat = document.createElement('canvas'); stat.width = Math.ceil((W + BLEED * 2) * dpr); stat.height = Math.ceil((H + BLEED * 2) * dpr);
    const o = stat.getContext('2d'); o.imageSmoothingQuality = 'high'; o.drawImage(src, 0, 0, stat.width, stat.height);
    // a soft dreamy glow (the Orton effect): a blurred copy screened over the painting
    const tiny = document.createElement('canvas'); tiny.width = Math.max(8, pw >> 4); tiny.height = Math.max(8, ph >> 4);
    const tg = tiny.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(src, 0, 0, tiny.width, tiny.height);
    o.globalCompositeOperation = 'screen'; o.globalAlpha = .2; o.drawImage(tiny, 0, 0, stat.width, stat.height);
    o.globalCompositeOperation = 'soft-light'; o.globalAlpha = .35; o.drawImage(tiny, 0, 0, stat.width, stat.height);
    o.globalAlpha = .55; o.globalCompositeOperation = 'multiply'; o.fillStyle = o.createPattern(paperTex, 'repeat'); o.fillRect(0, 0, stat.width, stat.height);
    o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
    const mk = () => { const c = document.createElement('canvas'); c.width = pw; c.height = ph; return c; };
    fxA = mk(); fxN = mk();
    stats.layout = Math.round(performance.now() - T0);
  }

  /* ---- animation: the moving parts are painted at the same soft resolution ---- */
  let mx = 0, my = 0, tx = 0, ty = 0, last = performance.now(), rot = 0, glow = 0, needle = 0, scrollDark = 0;
  addEventListener('pointermove', e => { tx = (e.clientX / W - .5) * 2; ty = (e.clientY / H - .5) * 2; }, { passive: true });
  const toDesign = g => g.setTransform(S * Q, 0, 0, S * Q, (OX + BLEED) * Q, (OY + BLEED) * Q);
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
    const a = audio(); const level = a.playing ? a.level : 0, bass = a.playing ? a.bass : 0;
    mx += (tx - mx) * .035; my += (ty - my) * .035; glow += ((.6 + level * .8) - glow) * .1; needle += ((a.playing ? level : 0) - needle) * .18;
    if (a.playing) rot += dt * TAU * (33.3 / 60);
    const dx = (-mx * 9 + Math.sin(t * .11) * 4 - BLEED) * dpr, dy = (-my * 6 + Math.cos(t * .13) * 3 - BLEED) * dpr;
    const g = ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(stat, dx, dy);

    // ---- light, drawn additively ----
    const A = fxA.getContext('2d'); A.setTransform(1, 0, 0, 1, 0, 0); A.clearRect(0, 0, fxA.width, fxA.height); toDesign(A);
    const flick = 1 + Math.sin(t * 7.1) * .012 + Math.sin(t * 13.7) * .008, L = glow * flick;
    A.fillStyle = rad(A, 1510, 240, 20, 760, [[0, `rgba(255,196,120,${.36 * L})`], [.4, `rgba(255,150,90,${.13 * L})`], [1, 'rgba(255,140,70,0)']]); A.fillRect(600, -200, 1200, 1250);
    A.fillStyle = rad(A, 1510, 150, 5, 280, [[0, `rgba(255,226,170,${.3 * L})`], [1, 'rgba(255,200,140,0)']]); A.fillRect(1220, -150, 580, 440);
    A.fillStyle = lin(A, 0, 262, 0, 930, [[0, `rgba(255,205,140,${.26 * L})`], [1, 'rgba(255,200,130,0)']]);
    A.beginPath(); A.moveTo(1422, 262); A.lineTo(1598, 262); A.lineTo(1790, 930); A.lineTo(1140, 930); A.closePath(); A.fill();
    A.fillStyle = rad(A, 1510, 262, 2, 90, [[0, `rgba(255,245,222,${.8 * L})`], [1, 'rgba(255,230,180,0)']]); A.fillRect(1410, 180, 200, 180);
    // dreamy drifting colour: slow washes of rose, amber and teal light
    [[.18, 380, '255,150,170', 520], [.12, 1150, '255,190,120', 600], [.09, 820, '130,190,200', 480]].forEach(([s, bx, col, r], k) => {
      const cx = bx + Math.sin(t * s + k * 2) * 160, cy = 420 + Math.cos(t * s * .8 + k) * 120;
      A.fillStyle = rad(A, cx, cy, 10, r, [[0, `rgba(${col},.07)`], [1, `rgba(${col},0)`]]); A.fillRect(cx - r, cy - r, r * 2, r * 2); });
    // window: moonlight shafts, twinkling city, rain
    A.save(); windowPath(A); A.clip();
    stars.forEach(s => { A.globalAlpha = .3 + .3 * Math.sin(t * 1.3 + s.p); A.fillStyle = '#FFF4DC'; A.beginPath(); A.arc(s.x, s.y, s.r * 1.3, 0, TAU); A.fill(); });
    litWins.forEach(w => { if (w.hidden) return; const v = .25 + .35 * Math.sin(t * w.s + w.p); A.globalAlpha = Math.max(0, v); A.fillStyle = w.warm ? '#FFC070' : '#CFE0F0'; A.fillRect(w.x - 1, w.y - 1, 6, 7); });
    A.globalAlpha = .22; A.strokeStyle = '#DCE6F2'; A.lineWidth = 1.4;
    drops.forEach(d => { d.y += d.v * dt; d.x -= d.v * dt * .12; if (d.y > 600) { d.y = 150 + Math.random() * 40; d.x = 130 + Math.random() * 340; }
      if (behindHorn(d.x, d.y)) return; A.beginPath(); A.moveTo(d.x, d.y); A.lineTo(d.x + d.l * .12, d.y - d.l); A.stroke(); });
    A.globalAlpha = .45; beads.forEach(b => { b.y += b.v * dt * (Math.sin(t * 2 + b.x) > .3 ? 1 : .15); if (b.y > 596) { b.y = 160 + Math.random() * 200; b.x = 130 + Math.random() * 320; }
      if (behindHorn(b.x, b.y)) return; A.fillStyle = 'rgba(225,235,248,.6)'; A.beginPath(); A.arc(b.x, b.y, b.r * 1.2, 0, TAU); A.fill(); });
    A.restore(); A.globalAlpha = 1;
    A.fillStyle = lin(A, 300, 300, 700, 1000, [[0, 'rgba(190,210,240,.07)'], [1, 'rgba(190,210,240,0)']]);
    A.beginPath(); A.moveTo(150, 330); A.lineTo(450, 300); A.lineTo(900, 1000); A.lineTo(250, 1000); A.closePath(); A.fill();
    // dust and pollen in the light, soft like bokeh
    if (!reduce) motes.forEach(m => { m.x += (m.vx + Math.sin(t * .6 + m.p) * 3) * dt * m.z; m.y += m.vy * dt * m.z; if (m.y < 60) { m.y = 900; m.x = Math.random() * DW; }
      const inBeam = Math.max(0, 1 - Math.hypot((m.x - 1500) / 400, (m.y - 520) / 500)), inWin = Math.max(0, 1 - Math.hypot((m.x - 330) / 320, (m.y - 700) / 280)) * .6;
      const al = (inBeam * .6 + inWin * .45 + .05) * (.5 + .5 * Math.sin(t * 2 + m.p)); if (al < .03) return;
      A.fillStyle = rad(A, m.x, m.y, 0, 3.4 * m.z + 1.5, [[0, `rgba(255,236,196,${al})`], [1, 'rgba(255,236,196,0)']]); A.fillRect(m.x - 6, m.y - 6, 12, 12); });
    // valves glow with the music, and the turntable is lit when it plays
    const ax = AMP.x, ay = AMP.y;
    [ax + 40, ax + 88, ax + 136].forEach((x2, i) => { const gl = .45 + needle * .9 + Math.sin(t * 9 + i) * .03;
      A.fillStyle = rad(A, x2, ay + 6, 1, 38, [[0, `rgba(255,176,90,${.95 * gl})`], [.3, `rgba(255,120,40,${.35 * gl})`], [1, 'rgba(255,100,30,0)']]); A.fillRect(x2 - 40, ay - 34, 80, 80); });
    A.fillStyle = rad(A, TT.x, 590, 10, 280, [[0, `rgba(255,190,120,${.05 + bass * .14})`], [1, 'rgba(255,190,120,0)']]); A.fillRect(400, 300, 620, 560);
    if (!reduce) { A.lineCap = 'round'; for (let i = 0; i < 3; i++) { const ph = t * .7 + i * 2.1; A.strokeStyle = `rgba(250,240,225,${.12 + .05 * Math.sin(ph)})`; A.lineWidth = 4;
      A.beginPath(); A.moveTo(556 + i * 5, 588); A.bezierCurveTo(548 + Math.sin(ph) * 10, 560, 570 + Math.sin(ph + 1) * 12, 540, 556 + Math.sin(ph + 2) * 8, 506 - i * 6); A.stroke(); } }

    // ---- solid moving parts: record label, sheen, tonearm, the amp's needle ----
    const N = fxN.getContext('2d'); N.setTransform(1, 0, 0, 1, 0, 0); N.clearRect(0, 0, fxN.width, fxN.height); toDesign(N);
    const { x, y, rx, ry } = TT;
    N.save(); N.translate(x, y); N.scale(1, ry / rx);
    N.fillStyle = a.color || '#7C2B22'; N.globalAlpha = .92; N.beginPath(); N.arc(0, 0, rx * .32, 0, TAU); N.fill(); N.globalAlpha = 1;
    N.fillStyle = 'rgba(243,234,216,.55)'; N.beginPath(); N.arc(Math.cos(rot) * rx * .2, Math.sin(rot) * rx * .2, 5, 0, TAU); N.fill();
    N.fillStyle = 'rgba(255,240,215,.14)'; for (const off of [0, Math.PI]) { N.beginPath(); N.moveTo(0, 0); N.arc(0, 0, rx * .98, rot * .15 + off - .25, rot * .15 + off + .25); N.fill(); }
    N.restore();
    const armA = a.playing ? -.38 - (a.progress || 0) * .18 : .05;
    N.save(); N.translate(x + 118, y - 6); N.rotate(armA); N.strokeStyle = 'rgba(214,206,190,.85)'; N.lineWidth = 3.4; N.lineCap = 'round';
    N.beginPath(); N.moveTo(0, 0); N.lineTo(-10, 38); N.lineTo(-62, 52); N.stroke(); N.fillStyle = '#2A2420'; N.fillRect(-72, 48, 14, 7); N.restore();
    N.save(); N.beginPath(); rrect(N, ax + 64, ay + 42, 48, 26, 3); N.clip(); N.strokeStyle = '#2A2420'; N.lineWidth = 1.6;
    const na = -1.05 + needle * 2.0; N.beginPath(); N.moveTo(ax + 88, ay + 72); N.lineTo(ax + 88 + Math.sin(na) * 24, ay + 72 - Math.cos(na) * 24); N.stroke(); N.restore();

    const sw = stat.width, sh = stat.height;
    g.imageSmoothingQuality = 'high';
    g.drawImage(fxN, dx, dy, sw, sh);
    g.globalCompositeOperation = 'screen'; g.drawImage(fxA, dx, dy, sw, sh); g.globalCompositeOperation = 'source-over';
    // page scroll dims the painting so the paper in front reads well
    const sd = Math.min(1, scrollY / (H * .9)); scrollDark += (sd - scrollDark) * .15;
    if (scrollDark > .01) { g.fillStyle = `rgba(20,11,6,${scrollDark * .45})`; g.fillRect(0, 0, canvas.width, canvas.height); }
  }
  let raf = 0, lastDraw = 0;
  function loop(now) { raf = requestAnimationFrame(loop); if (document.hidden) return; const fps = audio().playing ? 40 : 30; if (now - lastDraw < 1000 / fps - 2) return; lastDraw = now; const f0 = performance.now(); frame(now); stats.frame = stats.frame * .9 + (performance.now() - f0) * .1; }
  let rz, lastW = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (Math.abs(innerWidth - lastW) < 2 && Math.abs(innerHeight - H) < 120) return; lastW = innerWidth; layout(); frame(performance.now()); }, 160); });
  layout(); lastW = W;
  if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(() => { layout(); });
  if (reduce) { frame(performance.now()); addEventListener('scroll', () => frame(performance.now()), { passive: true }); }
  else raf = requestAnimationFrame(loop);
  return { redraw: () => frame(performance.now()) };
}
