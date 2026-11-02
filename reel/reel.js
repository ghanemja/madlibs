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
  const LINKEDIN = new URLSearchParams(location.search).get('cta') === 'linkedin';

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

  // ---------------------------------------------------------------- frame
  function frame() {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.06)';
    for (let y = 20; y < H; y += 40) for (let x = 20; x < W; x += 40) ctx.fillRect(x, y, 3, 3);

    text('DOODLE LIBS  ·  MAD LIBS TURING TEST', 540, 262, 34, '#7a7466', { weight: '' });

    // title zone
    if (ui.phase === 'intro') { text('Can you tell who wrote it?', 540, 335, 62, INK); text('HUMAN or AI?', 540, 420, 96, PINK, { outline: 10 }); }
    else if (ui.phase === 'story') { text(ui.t1, 540, 335, 58, INK); text(ui.t2, 540, 420, ui.t2.length > 22 ? 70 : 86, PINK, { outline: 10 }); }
    else if (ui.phase === 'lesson') { text(ui.t1, 540, 335, 50, '#7a7466'); text(ui.t2, 540, 420, ui.t2.length > 26 ? 62 : ui.t2.length > 20 ? 72 : 84, PINK, { outline: 10 }); }
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
    if (ui.phase === 'story' && ui.foot) ui.foot.forEach((l, i) => text(l, 540, 1478 + i * 52, 38, '#7a7466', { weight: '' }));
    if (ui.phase === 'lesson' && ui.bars) drawBars(ui.bars);
    if (ui.phase === 'lesson' && ui.foot) text(ui.foot, 540, 1530, 44, INK);
    if (ui.phase === 'end') {
      rr(90, 1450, 900, 160, 30, BLUE, INK, 6);
      if (LINKEDIN) { text('Try it yourself:', 540, 1497, 46, '#fff'); text(URL_TEXT, 540, 1562, 56, '#fff'); }
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

  async function round(cfg, i) {
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

  async function outro() {
    ui.phase = 'end'; mark('outro');
    ui.segs = [{ t: 'Answers: ', hl: false }, ...ROUNDS.map((r, i) => [{ t: r.source === 'human' ? 'HUMAN' : 'AI', hl: true }, { t: i < ROUNDS.length - 1 ? ', ' : '.', hl: false }]).flat(), { t: LINKEDIN ? ' Stories: Microsoft Research\'s Fun Libs (EMNLP 2017). Human answers: YodaLib (COLING 2020).' : ' Real Mad Libs data from a published humor study. Can you beat a coin flip?', hl: false }];
    S.reset('party'); S.crowdLimit = null;
    const p = S.add('p', 'person', { x: 330 }), r = S.add('r', 'robot', { x: 640, dir: -1 });
    p.alive = r.alive = true;
    S.confetti(480, 100, 80); Sfx.play('ding');
    await Promise.all([S.act(p, 'dance'), S.act(r, 'dance')]);
    await S.wait(1.2);
  }

  async function run() {
    t0 = performance.now(); timeline.length = 0;
    Sfx.music.start(0.3);
    if (LINKEDIN) await story(); else await intro();
    for (let i = 0; i < ROUNDS.length; i++) await round(ROUNDS[i], i);
    if (!LINKEDIN || LESSONS_ON_LINKEDIN) await lessons();
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
