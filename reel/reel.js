// reel.js — renders a vertical "Human or AI?" Instagram Reel with the Doodle Libs engine.
// Edit ROUNDS to make a different video. Each round plays the first few sentences of a
// Fun Libs story, filled in either by a real human player or by the AI.
(function () {
  const ROUNDS = [
    { story: 'hot-air-balloons', source: 'human', filler: 'India', steps: 2 },
    { story: 'golf', source: 'ai', ai: 0, steps: 2 },
    { story: 'zombies', source: 'human', filler: 'US', steps: 2 },
  ];
  const URL_TEXT = 'ghanemja.github.io/madlibs';

  const W = 1080, H = 1920;
  const FONT = '"Patrick Hand", "Comic Sans MS", cursive';
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
  function rr(x, y, w, h, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw || 6; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function text(str, x, y, size, color, o) {
    o = o || {};
    ctx.font = `${o.weight || 'bold'} ${size}px ${FONT}`;
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
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
    for (let size = 58; size >= 30; size -= 2) {
      ctx.font = `${size}px ${FONT}`;
      const lh = size * 1.32, lines = [[]];
      let lw = 0;
      const sp = ctx.measureText(' ').width;
      for (const wd of words) {
        ctx.font = `${wd.hl ? 'bold ' : ''}${size}px ${FONT}`;
        const ww = ctx.measureText(wd.t).width;
        const add = (wd.gap && lw ? sp : 0) + ww;
        if (lw + add > w && lines[lines.length - 1].length) { lines.push([]); lw = 0; }
        lines[lines.length - 1].push({ ...wd, ww, lead: wd.gap && lw ? sp : 0 }); lw += lw ? add : ww;
      }
      if (lines.length * lh > h && size > 30) continue;
      const top = y + (h - lines.length * lh) / 2;
      lines.forEach((ln, i) => {
        let cx = x, cy = top + i * lh + lh / 2;
        for (const wd of ln) {
          cx += wd.lead;
          if (wd.hl) { ctx.fillStyle = MARK; ctx.fillRect(cx - 4, cy - size * 0.05, wd.ww + 8, size * 0.5); }
          ctx.font = `${wd.hl ? 'bold ' : ''}${size}px ${FONT}`;
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

  // ---------------------------------------------------------------- frame
  function frame() {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.06)';
    for (let y = 20; y < H; y += 40) for (let x = 20; x < W; x += 40) ctx.fillRect(x, y, 3, 3);

    text('DOODLE LIBS  ·  MAD LIBS TURING TEST', 540, 262, 34, '#7a7466', { weight: '' });

    // title zone
    if (ui.phase === 'intro') { text('Can you tell who wrote it?', 540, 335, 62, INK); text('HUMAN or AI?', 540, 420, 96, PINK, { outline: 10 }); }
    else if (ui.phase === 'play' || ui.phase === 'ask') { text(`ROUND ${ui.round} of ${ROUNDS.length}`, 540, 335, 58, INK); text(ui.phase === 'ask' ? 'Comment your guess!' : 'Who filled in the blanks?', 540, 415, 70, PINK, { outline: 8 }); }
    else if (ui.phase === 'reveal') {
      text(ui.truth === 'human' ? 'It was a HUMAN!' : 'It was the AI!', 540, 345, 92, ui.truth === 'human' ? BLUE : ORANGE, { outline: 10 });
      text(ui.detail, 540, 425, 40, INK, { weight: '' });
    } else if (ui.phase === 'end') { text('How many did you get?', 540, 335, 70, INK); text('Comment your score!', 540, 420, 80, PINK, { outline: 10 }); }

    // the cartoon
    rr(STAGE.x + 10, STAGE.y + 12, STAGE.w, STAGE.h, 28, 'rgba(0,0,0,.18)');
    ctx.save(); ctx.beginPath(); ctx.roundRect(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 28); ctx.clip();
    ctx.drawImage(S.canvas, STAGE.x, STAGE.y, STAGE.w, STAGE.h);
    ctx.restore();
    rr(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 28, null, INK, 7);

    // story card
    rr(52, 1085, 990, 340, 26, 'rgba(0,0,0,.12)');
    rr(40, 1075, 1000, 340, 26, PAPER, INK, 6);
    rich(ui.segs, 80, 1093, 920, 304);

    // bottom zone
    if (ui.phase === 'play' || ui.phase === 'ask' || ui.phase === 'reveal') choiceButtons(ui.phase);
    if (ui.phase === 'intro') { rr(140, 1460, 800, 140, 30, PINK, INK, 6); text('Play along!', 540, 1532, 76, '#fff'); }
    if (ui.phase === 'end') { rr(90, 1450, 900, 160, 30, BLUE, INK, 6); text('Play it yourself: link in bio', 540, 1501, 52, '#fff'); text(URL_TEXT, 540, 1565, 44, '#fff', { weight: '' }); }
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

  async function round(cfg, i) {
    const st = stories[cfg.story];
    let words, detail;
    if (cfg.source === 'human') {
      const h = st.human.filter((x) => !cfg.filler || x.filler === cfg.filler).sort((a, b) => (b.funny || 0) - (a.funny || 0))[0];
      words = h.words;
      detail = `A real player from ${h.filler === 'US' ? 'the US' : h.filler}. Judges rated it ${h.funny.toFixed(1)}/3 funny.`;
    } else {
      words = AI_FILLS.fills.filter((f) => f.story === cfg.story)[cfg.ai || 0].words;
      detail = 'The words were picked by an AI.';
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

  async function outro() {
    ui.phase = 'end'; mark('outro');
    ui.segs = [{ t: 'Answers: ', hl: false }, ...ROUNDS.map((r, i) => [{ t: r.source === 'human' ? 'HUMAN' : 'AI', hl: true }, { t: i < ROUNDS.length - 1 ? ', ' : '.', hl: false }]).flat(), { t: ' Real Mad Libs data from a published humor study. Can you beat a coin flip?', hl: false }];
    S.reset('party'); S.crowdLimit = null;
    const p = S.add('p', 'person', { x: 330 }), r = S.add('r', 'robot', { x: 640, dir: -1 });
    p.alive = r.alive = true;
    S.confetti(480, 100, 80); Sfx.play('ding');
    await Promise.all([S.act(p, 'dance'), S.act(r, 'dance')]);
    await S.wait(1.2);
  }

  async function run() {
    t0 = performance.now(); timeline.length = 0;
    await intro();
    for (let i = 0; i < ROUNDS.length; i++) await round(ROUNDS[i], i);
    await outro();
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
