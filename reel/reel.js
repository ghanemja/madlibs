// reel.js — renders a vertical "Human or AI?" Instagram Reel with the Doodle Libs engine.
// Edit ROUNDS to make a different video. Each round plays the first few sentences of a
// Fun Libs story, filled in either by a real human player or by the AI.
(function () {
  const ROUNDS = [
    { story: 'baseball', source: 'human', filler: 'India', steps: 2 },
    { story: 'golf', source: 'ai', aiSource: 'anthropic:claude-sonnet-5-5', ai: 0, steps: 2 },
    { story: 'scuba-diving', source: 'human', filler: 'US', steps: 2 },
  ];
  const URL_TEXT = 'ghanemja.github.io/madlibs';
  const LESSONS_ON_LINKEDIN = false;
  // lesson 3: what loading the humanplease writing skill did (see research/REPORT.md)
  const LESSON3 = {
    title: 'A style guide helps. A little.',
    segs: (st) => [{ t: 'With my humanplease writing skill loaded, the AI matched itself ', hl: false }, { t: pctTxt(st.hp), hl: true }, { t: ' of the time instead of ' + pctTxt(st.ai) + '. People: ' + pctTxt(st.human) + '. Better style, same instincts.', hl: false }],
  };
  const TAKEAWAY = {
    title: 'Sound like YOU, not "funny"',
    segs: [{ t: 'AI says the most likely funny thing. People say the thing only', hl: false }, { t: ' they ', hl: true }, { t: 'would think of. Specific beats clever.', hl: false }],
    foot: 'Real data: Fun Libs (Microsoft Research) + Claude',
  };
  // ?cta=linkedin swaps Instagram's "link in bio" for the URL itself (links live in the post there)
  const PARAMS = new URLSearchParams(location.search);
  const LINKEDIN = PARAMS.get('cta') === 'linkedin';
  // ?cut=story: the full project story in chapters, paced for a voiceover
  const CUT = PARAMS.get('cut') || '';
  const SHOW_URL = LINKEDIN || CUT === 'story';
  // ?music=0 for no music; the story cut defaults to a quiet bed under the voice
  const MUSIC = PARAMS.has('music') ? Number(PARAMS.get('music')) : (CUT === 'story' ? 0.14 : 0.3);

  const W = 1080, H = 1920;
  // the story cut is drawn like a sketchbook page: handwriting, wobbly ink, tape, hatching
  const SKETCH = CUT === 'story';
  const FONT = SKETCH ? 'Caveat, "Patrick Hand", cursive' : '"Patrick Hand", "Comic Sans MS", cursive';
  const BRUSH = '"Caveat Brush", Caveat, cursive';
  const INK = '#1b1530', PAPER = '#fffdf6', BG = '#f4efe2', MARK = '#ffe26a', BLUE = '#2a78d6', ORANGE = '#eb6834', PINK = '#e8466b';
  const STAGE = { x: 40, y: 480, w: 1000, h: 563 }; // keeps clear of Instagram's top bar and bottom caption area

  const cv = document.getElementById('reel');
  const ctx = cv.getContext('2d');
  Lex.init(VERBS, ADJS, ADVERBS);
  const S = new Stage(document.getElementById('stage'));
  S.fixedWidth = 1080; S.resize();
  const stories = Object.fromEntries(FUNLIBS.stories.map((s) => [s.id, s]));

  // what the overlay shows right now
  const ui = { phase: 'intro', round: 0, segs: [], count: 0, truth: null, detail: '', pressed: 0 };
  const timeline = [];
  let t0 = performance.now();
  const mark = (label) => timeline.push({ t: +((performance.now() - t0) / 1000).toFixed(1), label });

  // ---------------------------------------------------------------- drawing helpers
  // ---- hand-drawn ink (sketch style). Lines "boil": the wobble re-rolls ~8 times a second, like the cartoon.
  const boil = () => Math.floor(performance.now() / 125) % 3;
  function rng(seed) { let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  function inkLine(x1, y1, x2, y2, color, lw, seed, amp) {
    const R = rng(seed * 31 + boil() * 977), j = () => (R() - 0.5) * 2 * (amp == null ? 3 : amp);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / len, uy = (y2 - y1) / len, over = 5 + R() * 6;
    const ax = x1 - ux * over * R() + j(), ay = y1 - uy * over * R() + j(), bx = x2 + ux * over * R() + j(), by = y2 + uy * over * R() + j();
    const mx = (ax + bx) / 2 - uy * j() * 2, my = (ay + by) / 2 + ux * j() * 2;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
  }
  function inkBox(x, y, w, h, fill, stroke, lw, seed) {
    const R = rng(seed + boil() * 131), j = () => (R() - 0.5) * 6;
    if (fill) { ctx.beginPath(); ctx.moveTo(x + j(), y + j()); ctx.lineTo(x + w + j(), y + j()); ctx.lineTo(x + w + j(), y + h + j()); ctx.lineTo(x + j(), y + h + j()); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { const l = lw || 5; inkLine(x, y, x + w, y, stroke, l, seed + 1); inkLine(x + w, y, x + w, y + h, stroke, l, seed + 2); inkLine(x + w, y + h, x, y + h, stroke, l, seed + 3); inkLine(x, y + h, x, y, stroke, l, seed + 4); }
  }
  function hatch(x, y, w, h, color, seed) {        // diagonal pen hatching instead of a flat fill
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (let d = -h; d < w; d += 14) inkLine(x + d, y + h, x + d + h, y, color, 4, seed + d, 1.5);
    ctx.restore();
  }
  function scribble(x, y, w, color, seed) {          // a quick underline swoosh
    const R = rng(seed + boil() * 53);
    ctx.beginPath(); ctx.moveTo(x - 6, y + R() * 4);
    ctx.bezierCurveTo(x + w * 0.3, y + 8 + R() * 4, x + w * 0.7, y - 6 + R() * 4, x + w + 10, y + 2 + R() * 4);
    ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
  }
  function loop(cx, cy, rx, ry, color, seed) {       // a loose hand-drawn circle around something
    const R = rng(seed + boil() * 71), a0 = -2.2 + R() * 0.4;
    ctx.beginPath();
    for (let i = 0; i <= 44; i++) { const a = a0 + (i / 40) * Math.PI * 2, k = 1 + (R() - 0.5) * 0.05 + i * 0.002; const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
  }
  function arrowTo(x1, y1, x2, y2, color, seed) {    // a curvy hand arrow
    const mx = (x1 + x2) / 2 + (y2 - y1) * 0.25, my = (y1 + y2) / 2 - (x2 - x1) * 0.25;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    const a = Math.atan2(y2 - my, x2 - mx);
    for (const s of [-0.5, 0.5]) inkLine(x2, y2, x2 - Math.cos(a + s) * 26, y2 - Math.sin(a + s) * 26, color, 5, seed + s * 10, 1);
  }
  function tape(x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = 'rgba(236, 222, 170, .82)'; ctx.fillRect(-70, -22, 140, 44);
    ctx.fillStyle = 'rgba(0,0,0,.05)'; for (let i = -70; i < 70; i += 9) ctx.fillRect(i, -22, 1.5, 44); ctx.restore();
  }
  function hand(str, x, y, size, color, o) {          // handwriting, optionally tilted
    o = o || {};
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
    ctx.font = `${o.weight || 700} ${size}px ${o.brush ? BRUSH : FONT}`; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color; ctx.fillText(str, 0, 0);
    const wdt = ctx.measureText(str).width; ctx.restore(); return wdt;
  }

  function rr(x, y, w, h, r, fill, stroke, lw) {
    if (SKETCH) {                                    // sketchbook: no drop shadows, wobbly ink boxes
      if (!stroke) return;
      inkBox(x, y, w, h, fill, stroke, Math.min(lw || 6, 6), x * 7 + y * 3 + w);
      return;
    }
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw || 6; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function text(str, x, y, size, color, o) {
    o = o || {};
    ctx.font = `${o.weight || 'bold'} ${size}px ${FONT}`;
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
    if (SKETCH) { size *= 1.12; o = Object.assign({}, o, { outline: 0, weight: o.weight === '' ? '500' : '700' }); ctx.font = `${o.weight} ${size}px ${FONT}`; }
    if (o.outline) { ctx.lineWidth = o.outline; ctx.strokeStyle = o.outlineColor || '#fff'; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  // wrapped text where some words get a yellow marker highlight; shrinks to fit the box
  function rich(segs, x, y, w, h) {
    // split into words; a word glued to the previous one (like "." after a blank) gets no space
    const words = [];
    let gap = false;
    for (const s of segs) for (const part of s.t.split(/(\s+)/)) {
      if (!part) continue;
      if (!part.trim()) { gap = true; continue; }
      words.push({ t: part, hl: s.hl, gap: gap || !words.length });
      gap = false;
    }
    const ALIGN_LEFT_TOP = SKETCH && ui.phase === 'chap';
    for (let size = SKETCH ? (ui.phase === 'chap' ? 76 : 68) : 58; size >= 30; size -= 2) {
      ctx.font = `${size}px ${FONT}`;
      const lh = size * 1.32, lines = [[]];
      let lw = 0;
      const sp = ctx.measureText(' ').width;
      for (const wd of words) {
        ctx.font = `${wd.hl ? 'bold ' : SKETCH ? '500 ' : ''}${size}px ${FONT}`;
        const ww = ctx.measureText(wd.t).width;
        const add = (wd.gap && lw ? sp : 0) + ww;
        if (lw + add > w && lines[lines.length - 1].length) { lines.push([]); lw = 0; }
        lines[lines.length - 1].push({ ...wd, ww, lead: wd.gap && lw ? sp : 0 }); lw += lw ? add : ww;
      }
      if (lines.length * lh > h && size > 30) continue;
      const top = ALIGN_LEFT_TOP ? y : y + (h - lines.length * lh) / 2;
      lines.forEach((ln, i) => {
        let cx = x, cy = top + i * lh + lh / 2;
        for (const wd of ln) {
          cx += wd.lead;
          if (wd.hl && !SKETCH) { ctx.fillStyle = MARK; ctx.fillRect(cx - 4, cy - size * 0.05, wd.ww + 8, size * 0.5); }
          if (wd.hl && SKETCH) scribble(cx, cy + size * 0.42, wd.ww, PINK, cx + cy);
          ctx.font = `${wd.hl ? 'bold ' : SKETCH ? '500 ' : ''}${size}px ${FONT}`;
          ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(wd.t, cx, cy);
          cx += wd.ww;
        }
      });
      return;
    }
  }
  function choiceButtons(state) {
    const btn = (x, label, color, key) => {
      let scale = 1, alpha = 1;
      if (state === 'reveal') { if (ui.truth === key) scale = 1.08 + Math.sin(performance.now() / 120) * 0.02; else alpha = 0.3; }
      if (state === 'play') alpha = 0.55;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.translate(x + 210, 1530); ctx.scale(scale, scale);
      rr(-210 + 8, -75 + 10, 420, 150, 30, 'rgba(0,0,0,.25)');
      rr(-210, -75, 420, 150, 30, color, INK, 6);
      text(label, 0, 2, 84, '#fff', { outline: 0 });
      ctx.restore();
    };
    btn(80, 'HUMAN', BLUE, 'human');
    btn(580, 'AI', ORANGE, 'ai');
    if (state === 'ask' && ui.count > 0) {
      const k = 1 + Math.max(0, 0.35 - ((performance.now() - ui.pressed) / 1000)) ;
      ctx.save(); ctx.translate(540, 1530); ctx.scale(k, k);
      ctx.beginPath(); ctx.arc(0, 0, 84, 0, Math.PI * 2); ctx.fillStyle = MARK; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
      text(String(ui.count), 0, 6, 110, INK);
      ctx.restore();
    }
  }

  // HUMAN vs AI bars for the lessons: [{ label, value, color, text }]
  function drawBars(rows) {
    const x0 = 300, w = 600, k = Math.min(1, (performance.now() - ui.barsAt) / 700);
    rows.forEach((r, i) => {
      const gap = rows.length > 2 ? 72 : 92, y = 1462 + i * gap;
      text(r.label, x0 - 24, y + 4, 44, INK, { align: 'right' });
      rr(x0, y - 30, w, 60, 14, 'rgba(0,0,0,.06)');
      const bw = Math.max(16, w * r.value * k);
      rr(x0, y - 30, bw, 60, 14, r.color, INK, 4);
      text(r.text, Math.min(x0 + bw + 14, x0 + w - 90), y + 4, 42, INK, { align: 'left' });
    });
  }

  // charts drawn into the cartoon window (story cut), in pen
  const GREY = '#7a7466', SOFT = '#b5ad9c';
  function drawChart(ch) {
    const { x, y, w, h } = STAGE, el = (performance.now() - ch.at) / 1000;
    ctx.fillStyle = PAPER; ctx.fillRect(x, y, w, h);
    if (ch.type === 'opt') {
      const rounds = (window.SKILL_OPT || []).filter((e) => e.split === 'tune' && e.verdict !== 'replication');
      const L = x + 120, R = x + w - 70, T = y + 70, B = y + h - 100, max = 0.5;
      const X = (i) => L + (R - L) * i / (rounds.length - 1), Y = (v) => B - (B - T) * Math.min(v, max) / max;
      inkLine(L - 20, B, R + 20, B, INK, 4, 11, 2); inkLine(L - 20, B + 10, L - 20, T - 20, INK, 4, 12, 2);
      hand('50%', L - 34, Y(0.5), 40, GREY, { align: 'right', weight: 500 }); hand('25%', L - 34, Y(0.25), 40, GREY, { align: 'right', weight: 500 }); hand('0', L - 34, B, 40, GREY, { align: 'right', weight: 500 });
      const ppl = rounds[0].people.same_blank;
      for (let xx = L; xx < R; xx += 46) inkLine(xx, Y(ppl), xx + 24, Y(ppl), BLUE, 5, xx, 1.5);
      hand('people', R - 210, Y(ppl) - 60, 52, BLUE, { rot: -0.05 }); arrowTo(R - 120, Y(ppl) - 42, R - 70, Y(ppl) - 10, BLUE, 5);
      const shown = Math.min(rounds.length, Math.floor(el / 0.55) + 1);
      const best = []; let b = rounds[0].same_blank;
      rounds.forEach((e, i) => { if (i <= 1 || (e.verdict || '').startsWith('kept')) b = e.same_blank; best.push(b); });
      for (let i = 1; i < shown; i++) { inkLine(X(i - 1), Y(best[i - 1]), X(i), Y(best[i - 1]), ORANGE, 7, i * 3, 2); if (best[i] !== best[i - 1]) inkLine(X(i), Y(best[i - 1]), X(i), Y(best[i]), ORANGE, 7, i * 5, 2); }
      for (let i = 0; i < shown; i++) {
        const e = rounds[i], kept = i <= 1 || (e.verdict || '').startsWith('kept');
        if (kept) { ctx.beginPath(); ctx.arc(X(i), Y(e.same_blank), 15, 0, 7); ctx.fillStyle = ORANGE; ctx.fill(); }
        else loop(X(i), Y(e.same_blank), 14, 14, SOFT, i * 17);
      }
      hand('45%', X(0) + 20, Y(best[0]) - 40, 54, ORANGE, { rot: -0.04 });
      if (shown === rounds.length) { const ex = X(shown - 1), ey = Y(best[shown - 1]); loop(ex - 40, ey - 125, 70, 44, PINK, 9); hand('14%', ex - 40, ey - 125, 62, ORANGE, { align: 'center' }); arrowTo(ex - 20, ey - 80, ex - 4, ey - 20, PINK, 13); }
      hand('● kept   ○ tried, didn\'t help', L - 40, B + 56, 42, INK, { weight: 500 });
    } else if (ch.type === 'held') {
      const by = (n) => (window.SKILL_OPT || []).find((e) => e.name === n);
      const rows = [['no skill', by('test-base'), ORANGE], ['style guide', by('test-v00'), ORANGE], ['optimized', by('test-v10'), ORANGE]].filter((r) => r[1]).map(([l, e, c]) => [l, e.same_blank, c]);
      if (by('test-v10')) rows.push(['people', by('test-v10').people.same_blank, BLUE]);
      const L = x + 300, maxW = w - 480;
      rows.forEach(([l, v, c], i) => {
        const k = Math.min(1, Math.max(0, (el - i * 0.5) / 0.7)), yy = y + 92 + i * 126;
        hand(l, L - 30, yy, 64, c === BLUE ? BLUE : INK, { align: 'right' });
        if (!k) return;
        const bw = Math.max(18, maxW * (v / 0.5) * k);
        hatch(L, yy - 36, bw, 72, c, i * 100);
        inkBox(L, yy - 36, bw, 72, null, INK, 4, i * 40 + 7);
        hand(Math.round(v * 100) + '%', L + bw + 22, yy, 66, c === BLUE ? BLUE : INK);
      });
    }
  }

  // story cut: big handwritten numbers with a loop drawn around them
  function drawTiles(tiles) {
    const n = tiles.length, k = Math.min(1, (performance.now() - ui.barsAt) / 900);
    tiles.forEach((t, i) => {
      const cx = n === 1 ? 540 : 270 + i * 540, cy = 1440 + (i % 2) * 24, rot = i % 2 ? 0.04 : -0.03;
      const v = Math.round(t.value * 100 * k);
      hand(v + '%', cx, cy, 190, t.color, { align: 'center', brush: true, rot });
      if (k >= 1) loop(cx, cy + 6, 190, 115, t.color, i * 29 + 3);
      hand(t.label, cx, cy + 170, 66, INK, { align: 'center', rot: -rot });
      if (i < n - 1 && t.arrow) arrowTo(cx + 210, cy - 40, cx + 330, cy - 40, INK, 77);
    });
  }
  // a handwritten checklist, ticked off one at a time
  function drawChips(chips) {
    chips.forEach((c, i) => {
      const k = ((performance.now() - ui.barsAt) / 1000 - 1.2 - i * 0.9);
      if (k < 0) return;
      const y = 1380 + i * 108, x = 90 + (i % 2) * 14;
      inkBox(x, y - 30, 58, 58, null, INK, 4, i * 13 + 5);
      inkLine(x + 8, y, x + 24, y + 22, PINK, 7, i * 7, 1); inkLine(x + 24, y + 22, x + 64, y - 36, PINK, 7, i * 9, 1);
      hand(c, x + 96, y, 66, INK);
    });
  }

  // ---------------------------------------------------------------- frame
  function frame() {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    if (SKETCH) { ctx.fillStyle = 'rgba(70,110,170,.10)'; for (let y = 96; y < H; y += 64) ctx.fillRect(0, y, W, 2); }   // notebook paper
    else { ctx.fillStyle = 'rgba(0,0,0,.06)'; for (let y = 20; y < H; y += 40) for (let x = 20; x < W; x += 40) ctx.fillRect(x, y, 3, 3); }

    if (SKETCH) { /* no header strip on a sketchbook page */ } else text('DOODLE LIBS  ·  MAD LIBS TURING TEST', 540, 262, 34, '#7a7466', { weight: '' });

    // title zone
    if (ui.phase === 'intro') { text('Can you tell who wrote it?', 540, 335, 62, INK); text('HUMAN or AI?', 540, 420, 96, PINK, { outline: 10 }); }
    else if (ui.phase === 'chap') {
      hand(ui.t1, 66, 292, 52, GREY, { weight: 500, rot: -0.02 });
      const hw = hand(ui.t2, 60, 392, ui.t2.length > 24 ? 84 : 104, INK, { brush: true, rot: -0.015 });
      scribble(70, 446, Math.min(hw, 940), PINK, ui.chapNo * 13);
    }
    else if (ui.phase === 'question') {
      hand('A 2026 Turing test, with Mad Libs', 66, 285, 62, GREY, { weight: 500, rot: -0.02 });
      const hw = hand('Could you tell?', 56, 392, 136, INK, { brush: true, rot: -0.03 });
      scribble(70, 452, hw, PINK, 5);
    }
    else if (ui.phase === 'story') { text(ui.t1, 540, 335, 58, INK); text(ui.t2, 540, 420, ui.t2.length > 22 ? 70 : 86, PINK, { outline: 10 }); }
    else if (ui.phase === 'lesson') { text(ui.t1, 540, 335, 50, '#7a7466'); text(ui.t2, 540, 420, ui.t2.length > 26 ? 62 : ui.t2.length > 20 ? 72 : 84, PINK, { outline: 10 }); }
    else if (ui.phase === 'play' || ui.phase === 'ask') { text(`ROUND ${ui.round} of ${ui.total || ROUNDS.length}`, 540, 335, 58, INK); text(ui.phase === 'ask' ? 'Comment your guess!' : 'Who filled in the blanks?', 540, 415, 70, PINK, { outline: 8 }); }
    else if (ui.phase === 'reveal') {
      text(ui.truth === 'human' ? 'It was a HUMAN!' : 'It was the AI!', 540, 345, 92, ui.truth === 'human' ? BLUE : ORANGE, { outline: 10 });
      text(ui.detail, 540, 425, 40, INK, { weight: '' });
    } else if (ui.phase === 'end') { text('How many did you get?', 540, 335, 70, INK); text('Comment your score!', 540, 420, 80, PINK, { outline: 10 }); }

    // the cartoon (sketch style: a slightly crooked photo taped into the notebook)
    if (SKETCH) {
      ctx.save(); ctx.translate(STAGE.x + STAGE.w / 2, STAGE.y + STAGE.h / 2); ctx.rotate(-0.012); ctx.translate(-(STAGE.x + STAGE.w / 2), -(STAGE.y + STAGE.h / 2));
      ctx.fillStyle = 'rgba(0,0,0,.10)'; ctx.fillRect(STAGE.x - 10, STAGE.y - 8, STAGE.w + 26, STAGE.h + 26);
      ctx.fillStyle = '#fff'; ctx.fillRect(STAGE.x - 16, STAGE.y - 16, STAGE.w + 32, STAGE.h + 32);
      ctx.drawImage(S.canvas, STAGE.x, STAGE.y, STAGE.w, STAGE.h);
      if (ui.chart) drawChart(ui.chart);
      ctx.restore();
      tape(STAGE.x + 70, STAGE.y - 6, -0.5); tape(STAGE.x + STAGE.w - 60, STAGE.y - 10, 0.45);
    } else {
    rr(STAGE.x + 10, STAGE.y + 12, STAGE.w, STAGE.h, 28, 'rgba(0,0,0,.18)');
    ctx.save(); ctx.beginPath(); ctx.roundRect(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 28); ctx.clip();
    ctx.drawImage(S.canvas, STAGE.x, STAGE.y, STAGE.w, STAGE.h);
    ctx.restore();
    if (ui.chart) { ctx.save(); ctx.beginPath(); ctx.roundRect(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 28); ctx.clip(); drawChart(ui.chart); ctx.restore(); }
    rr(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 28, null, INK, 7);
    }

    // story card (the opening question keeps the screen simple: no card)
    if (ui.phase === 'chap') {
      if (ui.segs && ui.segs.length) rich(ui.segs, 70, 1095, 940, 230);
    } else if (ui.phase !== 'question') {
    rr(52, 1085, 990, 340, 26, 'rgba(0,0,0,.12)');
    rr(40, 1075, 1000, 340, 26, PAPER, INK, 6);
    rich(ui.segs, 80, 1093, 920, 304);
    } else {
      hand('a human?', 120, 1250, 76, BLUE, { rot: -0.05 }); arrowTo(250, 1185, 345, 985, BLUE, 3);
      hand('an AI?', 740, 1250, 76, ORANGE, { rot: 0.04 }); arrowTo(790, 1185, 690, 985, ORANGE, 4);
    }

    // bottom zone
    if (ui.phase === 'play' || ui.phase === 'ask' || ui.phase === 'reveal') choiceButtons(ui.phase);
    if (ui.phase === 'intro') { rr(140, 1460, 800, 140, 30, PINK, INK, 6); text('Play along!', 540, 1532, 76, '#fff'); }
    if (ui.phase === 'story' && ui.foot) ui.foot.forEach((l, i) => text(l, 540, 1478 + i * 52, 38, '#7a7466', { weight: '' }));
    if (ui.phase === 'lesson' && ui.bars) drawBars(ui.bars);
    if (ui.phase === 'chap' && ui.tiles) drawTiles(ui.tiles);
    if (ui.phase === 'chap' && ui.chips) drawChips(ui.chips);
    if (ui.phase === 'chap' && ui.foot) hand(ui.foot, 70, 1330, 40, GREY, { weight: 500 });
    if (ui.phase === 'lesson' && ui.foot) text(ui.foot, 540, 1530, 44, INK);
    if (ui.phase === 'end') {
      rr(90, 1450, 900, 160, 30, BLUE, INK, 6);
      if (SHOW_URL) { text('Try it yourself:', 540, 1497, 46, '#fff'); text(URL_TEXT, 540, 1562, 56, '#fff'); }
      else { text('Play it yourself: link in bio', 540, 1501, 52, '#fff'); text(URL_TEXT, 540, 1565, 44, '#fff', { weight: '' }); }
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- the show
  function segsFrom(step, answers) {
    const raw = Director.renderTokens(Director.parseTemplate(step.text), answers, (v) => '\u0001' + v + '\u0002', () => '____');
    return raw.split(/(\u0001[^\u0002]*\u0002)/).filter(Boolean).map((p) => (p[0] === '\u0001' ? { t: p.slice(1, -1), hl: true } : { t: p, hl: false }));
  }

  async function intro() {
    ui.phase = 'intro'; mark('intro');
    ui.segs = [{ t: 'Real people and an AI filled in the same Mad Libs. The cartoon acts out every word. Guess who chose them!', hl: false }];
    S.reset('city'); S.crowdLimit = null;
    const p = S.add('p', 'person', { x: 300, label: 'human?', dir: 1 });
    const r = S.add('r', 'robot', { x: 700, label: 'AI?', dir: -1 });
    p.alive = r.alive = true;
    await S.wait(0.6);
    await Promise.all([S.act(p, 'wave'), S.act(r, 'wave')]);
    await S.wait(0.6);
  }

  async function round(cfg, i, total) {
    ui.total = total || ROUNDS.length;
    const st = stories[cfg.story];
    let words, detail;
    if (cfg.source === 'human') {
      const h = st.human.filter((x) => !cfg.filler || x.filler === cfg.filler).sort((a, b) => (b.funny || 0) - (a.funny || 0))[0];
      words = h.words;
      detail = `A real player from ${h.filler === 'US' ? 'the US' : h.filler}. Judges rated it ${h.funny.toFixed(1)}/3 funny.`;
    } else {
      words = AI_FILLS.fills.filter((f) => f.story === cfg.story && (!cfg.aiSource || f.source === cfg.aiSource))[cfg.ai || 0].words;
      detail = cfg.aiSource === 'anthropic:claude-sonnet-5-5' ? 'The words were picked by Claude Sonnet 5.5.' : 'The words were picked by an AI.';
    }
    const answers = Object.fromEntries(words.map((w, k) => ['b' + (k + 1), w]));
    const story = Director.compileCustom(st.template, st.title);
    ui.phase = 'play'; ui.round = i + 1; ui.truth = cfg.source; ui.detail = detail; ui.segs = [];
    mark(`round ${i + 1} starts (${st.title})`);
    S.reset('park'); S.crowdLimit = 4;
    for (const op of story.setup) await Director.runOp(S, op, answers);
    const shown = [];
    for (let k = 0; k < Math.min(cfg.steps, story.steps.length); k++) {
      const step = story.steps[k];
      shown.push(...(k ? [{ t: ' ', hl: false }] : []), ...segsFrom(step, answers));
      ui.segs = shown.slice();
      mark(`round ${i + 1} sentence ${k + 1}: ${Director.renderTokens(Director.parseTemplate(step.text), answers, (v) => v.toUpperCase(), () => '___')}`);
      await new Director.StepRunner(S, step, answers).run();
      await S.wait(0.7);
    }
    ui.phase = 'ask'; mark(`round ${i + 1} countdown`);
    for (let c = 3; c >= 1; c--) { ui.count = c; ui.pressed = performance.now(); Sfx.play('pop'); await S.wait(1); }
    ui.count = 0; ui.phase = 'reveal'; mark(`round ${i + 1} reveal: ${cfg.source.toUpperCase()}`);
    Sfx.play('ding'); S.confetti(480, 120, 50);
    await S.wait(3);
  }

  // LinkedIn version: how the project happened, before the game
  async function story() {
    const beat = (t1, t2, segs, foot) => { ui.phase = 'story'; ui.t1 = t1; ui.t2 = t2; ui.segs = segs; ui.foot = foot || null; mark(`story: ${t1} ${t2}`); };
    // 1. the toy
    S.reset('park'); S.crowdLimit = null;
    const me = S.add('me', 'person', { x: 280, dir: 1 }); me.alive = true;
    const tree = S.add('tree', 'tree', { x: 700, scale: 1.2, label: 'tree', labelFor: S.time + 99 }); tree.alive = true;
    beat('It started as a toy:', 'Mad Libs that draw themselves', [{ t: 'Type a word into the blank and a stick figure acts it out. “The tree began to ', hl: false }, { t: 'dance', hl: true }, { t: '.”', hl: false }]);
    await S.wait(1.6);
    await Promise.all([S.act(tree, 'dance'), S.act(me, 'laugh')]);
    await S.wait(2.2);
    // 2. the friend
    S.reset('park');
    const a = S.add('me', 'person', { x: 330, dir: 1, label: 'me', labelFor: S.time + 99 });
    const f = S.add('friend', 'person', { x: 640, dir: -1, label: 'my friend', labelFor: S.time + 99 });
    a.alive = f.alive = true; f.hat = 'party';
    beat('Then I gave it to a friend…', 'Could I tell if an AI wrote it?', [{ t: 'Their answers were so weird that I wondered: if an ', hl: false }, { t: 'AI', hl: true }, { t: ' filled in the blanks instead, would I be able to tell?', hl: false }]);
    S.bubble(f, 'A type of… SANDWICH!', 2.6);
    await S.act(f, 'laugh');
    await S.act(a, 'think');
    await S.wait(1.4);
    // 3. the data
    S.reset('school');
    const r = S.add('me', 'person', { x: 360, dir: 1 }); r.alive = true;
    const bk = S.add('book', 'book', { x: 600, scale: 1.4, label: 'Fun Libs', labelFor: S.time + 99 }); bk.alive = true;
    beat('So I went looking for data:', 'Microsoft Research\'s Fun Libs', [
      { t: '50 Mad Libs built from Wikipedia, plus ', hl: false }, { t: '300 real human answers', hl: true }, { t: ' from players in the US and India, each rated for funniness by five judges.', hl: false },
    ], ['Hossain et al., EMNLP 2017 · YodaLib, Garimella et al., COLING 2020']);
    await S.act(bk, 'float');
    await S.act(r, 'jump');
    await S.wait(1.8);
    // 4. the game
    S.reset('city');
    const p = S.add('p', 'person', { x: 300, label: 'human?', dir: 1 });
    const rb = S.add('r', 'robot', { x: 700, label: 'AI?', dir: -1 });
    p.alive = rb.alive = true;
    ui.phase = 'intro'; mark('now you try');
    ui.segs = [{ t: 'Now you try. Three real stories: some filled in by people, some by an AI. Guess before the reveal!', hl: false }];
    await Promise.all([S.act(p, 'wave'), S.act(rb, 'wave')]);
    await S.wait(0.4);
  }

  // ---------------------------------------------------------------- lessons learned
  const norm = (w) => String(w).toLowerCase().trim().replace(/\s+/g, ' ');
  function sameBlank(fillsByStory) {           // chance two answers to the same blank are identical
    let same = 0, pairs = 0;
    for (const sets of Object.values(fillsByStory)) {
      for (let i = 0; i < sets[0].length; i++) for (let a = 0; a < sets.length; a++) for (let b = a + 1; b < sets.length; b++) { pairs++; if (norm(sets[a][i]) === norm(sets[b][i])) same++; }
    }
    return pairs ? same / pairs : 0;
  }
  function topShare(fills) {                   // share of answers taken by the 10 favourite words
    const c = new Map(); let n = 0;
    for (const ws of fills) for (const w of ws) { c.set(norm(w), (c.get(norm(w)) || 0) + 1); n++; }
    const top = [...c.entries()].sort((a, b) => b[1] - a[1]);
    return { share: top.slice(0, 10).reduce((s, [, k]) => s + k, 0) / n, top: top.slice(0, 5).map(([w]) => w) };
  }
  function stats() {
    const by = (src) => { const o = {}; for (const f of AI_FILLS.fills) if (f.source === src) (o[f.story] = o[f.story] || []).push(f.words); return o; };
    const humans = {}; for (const st of FUNLIBS.stories) humans[st.id] = st.human.map((h) => h.words);
    const son = by('anthropic:claude-sonnet-5-5'), hp = by('anthropic:claude-sonnet-5-5+humanplease');
    return {
      human: sameBlank(humans), ai: sameBlank(son), hp: Object.keys(hp).length ? sameBlank(hp) : null,
      humanTop: topShare(Object.values(humans).flat()), aiTop: topShare(Object.values(son).flat()),
      hpTop: Object.keys(hp).length ? topShare(Object.values(hp).flat()) : null,
    };
  }
  const pctTxt = (v) => (v < 0.095 ? (v * 100).toFixed(1) : Math.round(v * 100)) + '%';

  async function lessons() {
    const st = stats();
    const lesson = (t2, segs, bars, foot) => { ui.phase = 'lesson'; ui.t1 = 'LESSONS LEARNED'; ui.t2 = t2; ui.segs = segs; ui.bars = bars; ui.foot = foot || null; ui.barsAt = performance.now(); mark(`lesson: ${t2}`); };
    const bars = (h, a, max) => [
      { label: 'People', value: h / max, color: BLUE, text: pctTxt(h) },
      { label: 'AI', value: a / max, color: ORANGE, text: pctTxt(a) },
    ];
    // 1. people surprise; the AI agrees with itself
    S.reset('park'); S.crowdLimit = null;
    const said = ['magnets!', 'Idaho!', 'coconut!'];
    const people = said.map((w, i) => { const p = S.add('p' + i, 'person', { x: 110 + i * 130, dir: 1 }); p.alive = true; return p; });
    const bots = [0, 1, 2].map((i) => { const r = S.add('r' + i, 'robot', { x: 590 + i * 130, dir: -1, scale: 0.85 }); r.alive = true; return r; });
    lesson('People surprise. AI agrees.', [
      { t: 'Give two people the same blank and they almost never pick the same word. Ask the AI twice and it often gives the', hl: false }, { t: ' exact same answer', hl: true }, { t: '.', hl: false },
    ], bars(st.human, st.ai, Math.max(st.ai, 0.01)));
    people.forEach((p, i) => setTimeout(() => S.bubble(p, said[i], 3.4), i * 250));
    bots.forEach((r, i) => setTimeout(() => S.bubble(r, 'PICKLES!', 3.4), 900 + i * 250));
    await S.wait(4.6);
    // 2. the AI reaches for the safely funny word
    S.reset('kitchen');
    const bot = S.add('bot', 'robot', { x: 640, dir: -1 }); bot.alive = true;
    ['pickles', 'sandwich', 'toaster'].forEach((w, i) => S.add('f' + i, w === 'toaster' ? 'tv' : w === 'pickles' ? 'carrot' : 'burger', { x: 330 + i * 120, alt: 134, scale: 0.5 }));
    lesson('AI picks the "safe" funny word', [
      { t: 'Its favourites: ', hl: false }, ...st.aiTop.top.map((w, i, a) => [{ t: w, hl: true }, { t: i < a.length - 1 ? ', ' : '.', hl: false }]).flat(),
      { t: ' People\'s funniest answers were specific and personal: magnets, Idaho, coconut.', hl: false },
    ], [{ label: 'People', value: st.humanTop.share / Math.max(st.aiTop.share, 0.01), color: BLUE, text: pctTxt(st.humanTop.share) }, { label: 'AI', value: 1, color: ORANGE, text: pctTxt(st.aiTop.share) }]);
    ui.foot = null;
    await S.act(bot, 'think');
    await S.wait(2.6);
    // 3. polishing the style doesn't change the word choice (filled in from the humanplease run)
    if (st.hp != null) {
      S.reset('school');
      const r = S.add('r', 'robot', { x: 640, dir: -1 }); r.alive = true; r.acc.add('glasses');
      const mx = Math.max(st.ai, st.hp, 0.01);
      lesson(LESSON3.title, LESSON3.segs(st), [
        { label: 'People', value: st.human / mx, color: BLUE, text: pctTxt(st.human) },
        { label: 'AI', value: st.ai / mx, color: ORANGE, text: pctTxt(st.ai) },
        { label: '+skill', value: st.hp / mx, color: '#8a5fd0', text: pctTxt(st.hp) },
      ]);
      await S.act(r, 'think');
      await S.wait(2.8);
    }
    // the takeaway
    S.reset('park');
    const a = S.add('a', 'person', { x: 330, dir: 1 }), b = S.add('b', 'robot', { x: 650, dir: -1 });
    a.alive = b.alive = true;
    lesson(TAKEAWAY.title, TAKEAWAY.segs, null, TAKEAWAY.foot);
    S.bubble(a, 'nine MAGNETS!', 3.5);
    await S.act(a, 'laugh');
    await S.wait(3.2);
  }

  // ---------------------------------------------------------------- the full story cut (for a voiceover)
  async function storyCut() {
    const st = stats();
    const say = (t, hl) => t.split('*').map((x, i) => ({ t: x, hl: i % 2 === 1 })).filter((x) => x.t);   // *word* = highlighted
    const chapter = (no, t1, t2, cap, extra) => {
      extra = extra || {};
      Object.assign(ui, { phase: no ? 'chap' : 'question', chapNo: no, t1, t2, segs: cap ? say(cap) : [], tiles: extra.tiles || null, chips: extra.chips || null, foot: extra.foot || null, bars: null, barsAt: performance.now() });
      ui.chart = extra.chart ? { type: extra.chart, at: performance.now() } : null;
      mark(`${no} ${t1} | ${t2}`);
    };
    // 0. the question
    S.reset('park'); S.crowdLimit = null;
    const q1 = S.add('p', 'person', { x: 330, dir: 1 }), q2 = S.add('r', 'robot', { x: 670, dir: -1 });
    q1.alive = q2.alive = true;
    chapter(0, '', '');
    S.bubble(q1, '?', 4.4); setTimeout(() => S.bubble(q2, '?', 4), 500);
    await S.wait(5.2);
    // 1. the toy
    S.reset('park');
    const me = S.add('me', 'person', { x: 280, dir: 1 }); me.alive = true;
    const tree = S.add('tree', 'tree', { x: 700, scale: 1.2 }); tree.alive = true;
    chapter(1, '1 · THE TOY', 'Mad Libs that draw themselves', 'Type a word. Watch a stick figure *do it*.');
    await S.wait(1.4);
    await Promise.all([S.act(tree, 'dance'), S.act(me, 'laugh')]);
    await S.wait(1.6);
    // 2. the question
    S.reset('park');
    const a = S.add('me', 'person', { x: 330, dir: 1, label: 'me', labelFor: S.time + 99 });
    const f = S.add('friend', 'person', { x: 640, dir: -1, label: 'my friend', labelFor: S.time + 99 });
    a.alive = f.alive = true; f.acc.add('party');
    chapter(2, '2 · THE QUESTION', 'Could an AI fake this?', 'My friend\'s answers were so weird. Would I know if an *AI* wrote them?');
    S.bubble(f, 'nine MAGNETS!', 3);
    await S.act(f, 'laugh');
    await S.act(a, 'think');
    await S.wait(1.4);
    // 3. the data
    S.reset('school');
    const rd = S.add('me', 'person', { x: 360, dir: 1 }); rd.alive = true;
    const bk = S.add('book', 'book', { x: 600, scale: 1.4, label: 'Fun Libs', labelFor: S.time + 99 }); bk.alive = true;
    chapter(3, '3 · THE DATA', 'Real answers, real people', 'Microsoft Research\'s *Fun Libs*: 50 Mad Libs, *300 human answers*.',
      { foot: 'Hossain et al., EMNLP 2017 · Garimella et al., COLING 2020' });
    await S.act(bk, 'float');
    await S.wait(2.6);
    // 4. the test
    S.reset('park');
    const tp = S.add('p', 'person', { x: 330, dir: 1 }), tr = S.add('r', 'robot', { x: 670, dir: -1 });
    tp.alive = tr.alive = true;
    chapter(4, '4 · THE TEST', 'Your turn!', 'One story by a person. One by an AI. *Guess!*');
    await S.wait(2.8);
    ui.chart = null;
    for (let i = 0; i < 2; i++) await round(ROUNDS[i], i, 2);
    ui.chapNo = 4;
    // 5. what I found
    S.reset('park');
    const said = ['magnets!', 'Idaho!', 'coconut!'];
    const people = said.map((w, i) => { const p = S.add('p' + i, 'person', { x: 110 + i * 130, dir: 1 }); p.alive = true; return p; });
    const bots = [0, 1, 2].map((i) => { const r = S.add('r' + i, 'robot', { x: 590 + i * 130, dir: -1, scale: 0.85 }); r.alive = true; return r; });
    chapter(5, '5 · WHAT I FOUND', 'The AI repeats itself', 'Same blank, asked twice: how often is it the *same word*?',
      { tiles: [{ value: st.human, label: 'people', color: BLUE }, { value: st.ai, label: 'AI', color: ORANGE }] });
    people.forEach((p, i) => setTimeout(() => S.bubble(p, said[i], 4), i * 250));
    bots.forEach((r, i) => setTimeout(() => S.bubble(r, 'PICKLES!', 4), 900 + i * 250));
    await S.wait(6.2);
    // 6. can a style guide fix it?
    S.reset('school');
    const sg = S.add('r', 'robot', { x: 640, dir: -1 }); sg.alive = true; sg.acc.add('glasses');
    chapter(6, '6 · TRY A STYLE GUIDE', 'It barely helped', 'My *humanplease* writing skill, loaded into Claude:',
      st.hp != null ? { tiles: [{ value: st.ai, label: 'AI', color: ORANGE, arrow: true }, { value: st.hp, label: 'AI + skill', color: '#8a5fd0' }] } : {});
    await S.act(sg, 'think');
    await S.wait(3.6);
    // 7. the optimization loop
    S.reset('park');
    chapter(7, '7 · SO I OPTIMIZED IT', 'One rule at a time', 'Change one rule. Test it. *Keep only what works.*',
      { chart: 'opt', chips: ['be a specific person', 'ban the stock funny words', 'randomize the person'] });
    await S.wait(9.5);
    // 8. the result
    chapter(8, '8 · THE RESULT', '49% → 14%', 'On stories it never saw. People: *1%*. Closer, *not human*.', { chart: 'held' });
    await S.wait(6.8);
    // 9. the takeaway
    ui.chart = null;
    S.reset('park');
    const ta = S.add('a', 'person', { x: 330, dir: 1 }), tb = S.add('b', 'robot', { x: 650, dir: -1 });
    ta.alive = tb.alive = true;
    chapter(9, '9 · THE TAKEAWAY', 'Specific beats clever', 'AI says the *likely* funny thing. People say *their* thing.');
    S.bubble(ta, 'nine MAGNETS!', 3.5);
    setTimeout(() => S.bubble(tb, 'pickles?', 3), 1200);
    await S.act(ta, 'laugh');
    await S.wait(3.4);
    ui.chapNo = 10;
  }

  async function outro() {
    ui.phase = 'end'; mark('outro');
    ui.chart = null; ui.bars = null;
    if (CUT === 'story') ui.segs = [{ t: 'Play the 2026 Mad Libs Turing Test yourself. Every experiment and all the data are on the site.', hl: false }];
    else ui.segs = [{ t: 'Answers: ', hl: false }, ...ROUNDS.map((r, i) => [{ t: r.source === 'human' ? 'HUMAN' : 'AI', hl: true }, { t: i < ROUNDS.length - 1 ? ', ' : '.', hl: false }]).flat(), { t: LINKEDIN ? ' Stories: Microsoft Research\'s Fun Libs (EMNLP 2017). Human answers: YodaLib (COLING 2020).' : ' Real Mad Libs data from a published humor study. Can you beat a coin flip?', hl: false }];
    S.reset('party'); S.crowdLimit = null;
    const p = S.add('p', 'person', { x: 330 }), r = S.add('r', 'robot', { x: 640, dir: -1 });
    p.alive = r.alive = true;
    S.confetti(480, 100, 80); Sfx.play('ding');
    await Promise.all([S.act(p, 'dance'), S.act(r, 'dance')]);
    await S.wait(1.2);
  }

  async function run() {
    t0 = performance.now(); timeline.length = 0;
    if (MUSIC > 0) Sfx.music.start(MUSIC);
    if (CUT === 'story') await storyCut();
    else {
      if (LINKEDIN) await story(); else await intro();
      for (let i = 0; i < ROUNDS.length; i++) await round(ROUNDS[i], i);
      if (!LINKEDIN || LESSONS_ON_LINKEDIN) await lessons();
    }
    await outro();
    Sfx.music.stop(1.2);
    await S.wait(1.3);                          // let the music fade out on the end card
    mark('end');
    return timeline;
  }

  // record the canvas (and sound effects) to a video
  async function record() {
    Sfx.ctx();
    const stream = cv.captureStream(30);
    const audio = Sfx.streamTrack(); if (audio) stream.addTrack(audio);
    const type = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8000000 });
    const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start(250);
    await run();
    rec.stop(); await done;
    return { blob: new Blob(chunks, { type }), type, timeline: timeline.slice() };
  }

  window.Reel = { run, record, timeline };
  const status = document.getElementById('status');
  document.getElementById('play').onclick = async () => { Sfx.ctx(); status.textContent = 'playing…'; await run(); status.textContent = 'done'; };
  document.getElementById('rec').onclick = async () => {
    status.textContent = 'recording… keep this tab open';
    const { blob, type } = await record();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'doodle-libs-reel.' + (type.includes('mp4') ? 'mp4' : 'webm'); a.click();
    status.textContent = 'saved';
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { ui.segs = [{ t: 'Press Preview or Record.', hl: false }]; frame(); });
})();
