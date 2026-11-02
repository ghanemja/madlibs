// research.js — "Human or AI?": a Mad Libs Turing test built on the Fun Libs dataset.
//   Guess mode: watch a filled-in research story and guess whether a human or an AI wrote the words.
//   Play mode:  fill in a research story yourself, then compare with human players, AI and the original.
// Everything stays in the browser (localStorage) until you download it.
(function () {
  const $ = (id) => document.getElementById(id);
  const FL = window.FUNLIBS;
  // the one-pass demo set ("claude-seed") is only used until independently sampled AI answers exist
  const AI_RAW = window.AI_FILLS || { fills: [] };
  const AI_LIVE = AI_RAW.fills.filter((f) => f.source !== 'claude-seed');
  const AI = { ...AI_RAW, fills: AI_LIVE.length ? AI_LIVE : AI_RAW.fills };
  if (!FL || !window.App) { const lab = $('lab'); if (lab) lab.hidden = true; return; }
  const { esc } = App;
  const { parseTemplate, renderTokens, compileCustom } = Director;
  const pick = Util.pick;

  const stories = FL.stories;
  const byId = Object.fromEntries(stories.map((s) => [s.id, s]));
  const aiBy = {};
  for (const f of AI.fills) (aiBy[f.story] = aiBy[f.story] || []).push(f);

  // ---------------------------------------------------------------- saved records
  const KEY = 'doodlelibs.research';
  let records = [];
  try { records = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { records = []; }
  function record(r) {
    records.push(Object.assign({ ts: new Date().toISOString() }, r));
    try { localStorage.setItem(KEY, JSON.stringify(records)); } catch (e) { /* storage off: keep in memory */ }
    updateCount();
  }
  function updateCount() {
    $('labCount').textContent = records.length;
    const g = records.filter((r) => r.type === 'guess');
    const right = g.filter((r) => r.correct).length;
    const acc = g.length ? right / g.length : 0;
    $('meterFill').style.width = (g.length ? Math.max(2, acc * 100) : 0) + '%';
    $('scorebox').classList.toggle('has', g.length > 0);
    $('labScore').innerHTML = g.length
      ? `You've spotted <b>${right} of ${g.length}</b> (${Math.round(acc * 100)}%). ${acc > 0.5 ? 'Better than a coin flip!' : acc === 0.5 ? 'Exactly a coin flip.' : 'The AI is fooling you…'}`
      : 'Play a few rounds to see how good you are at spotting the AI.';
  }
  window.Research = { records: () => records.slice() };

  // ---------------------------------------------------------------- helpers
  function toStory(st) {
    const s = compileCustom(st.template, st.title);
    s.id = 'funlib:' + st.id;
    s.funlib = st.id;
    return s;
  }
  const answersFrom = (words) => Object.fromEntries(words.map((w, i) => ['b' + (i + 1), w]));
  function storyText(st, words, mark) {
    const ans = answersFrom(words);
    return renderTokens(parseTemplate(st.template), ans, (v, tk) => `<span class="w ${mark || ''}" title="${esc(tk.raw)}">${esc(v)}</span>`, () => '____', esc)
      .split('\n').map((l) => `<p>${l}</p>`).join('');
  }
  const sourceName = (src) => (src === 'claude-seed' ? 'Claude (seed set)' : src === 'claude-agents' ? 'Claude, via independent agents' : src === 'anthropic:claude-sonnet-5-5' ? 'Claude Sonnet 5.5' : src.replace(/^anthropic:/, '').replace(/^openai:/, ''));

  // ---------------------------------------------------------------- guess game
  const game = { round: 0, right: 0, guessed: 0, item: null, funny: null, recent: [] };

  function pickItem() {
    const pool = stories.filter((s) => !game.recent.includes(s.id));
    const st = pick(pool.length ? pool : stories);
    game.recent = [st.id, ...game.recent].slice(0, 12);
    const ais = aiBy[st.id] || [];
    if (ais.length && Math.random() < 0.5) {
      const f = pick(ais);
      return { st, truth: 'ai', words: f.words, source: f.source, id: `${f.source}:${st.id}:${ais.indexOf(f)}` };
    }
    const h = pick(st.human);
    return { st, truth: 'human', words: h.words, source: 'human-' + h.filler, id: h.id, human: h };
  }

  function startGuess() {
    game.round = 0; game.right = 0; game.guessed = 0;
    nextRound();
  }

  function nextRound() {
    const item = (game.item = pickItem());
    game.funny = null; game.done = false; game.round++;
    renderGuess();
    App.startStory(toStory(item.st), answersFrom(item.words), { guess: true, onDone: () => { $('gReplay').hidden = false; } });
  }

  function renderGuess() {
    const it = game.item;
    $('gRound').textContent = `Round ${game.round}` + (game.guessed ? ` · ${game.right} / ${game.guessed} right` : '');
    $('gTitle').textContent = it.st.title;
    $('gText').innerHTML = storyText(it.st, it.words);
    $('gResult').hidden = true; $('gNext').hidden = true; $('gReplay').hidden = true;
    $('gButtons').hidden = false;
    $('gOrig').hidden = true;
    document.querySelectorAll('#gFunny button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    $('guess').scrollTop = 0;
  }

  function guess(g) {
    if (game.done) return;
    game.done = true;
    const it = game.item;
    const correct = g === it.truth;
    game.guessed++; if (correct) game.right++;
    record({ type: 'guess', story: it.st.id, item: it.id, truth: it.truth, source: it.source, guess: g, correct, myFunny: game.funny, judgesFunny: it.human ? it.human.funny : null, words: it.words });
    let who;
    if (it.truth === 'human') {
      const f = it.human.filler === 'US' ? 'the US' : it.human.filler;
      who = `🧑 <b>A human</b> filled this in: a Mechanical Turk player from ${esc(f)}.` + (it.human.funny != null ? ` Five judges rated it <b>${it.human.funny.toFixed(1)} / 3</b> for funniness.` : '');
    } else {
      who = `🤖 <b>An AI</b> filled this in (${esc(sourceName(it.source))}).`;
    }
    $('gResult').innerHTML = `<p class="verdict ${correct ? 'ok' : 'no'}">${correct ? '✅ You got it!' : '❌ Fooled you!'}</p><p>${who}</p><p class="muted small">This session: ${game.right} / ${game.guessed} right.</p>`;
    $('gResult').hidden = false;
    $('gButtons').hidden = true;
    $('gNext').hidden = false;
    $('gOrig').hidden = false;
    $('gRound').textContent = `Round ${game.round} · ${game.right} / ${game.guessed} right`;
    Sfx.play(correct ? 'ding' : 'boing');
    if (correct) App.S.confetti(480, 140, 40);
  }

  // ---------------------------------------------------------------- play mode + comparison
  function startPlay(id) {
    const st = id ? byId[id] : pick(stories);
    App.startStory(toStory(st));
  }

  App.onFinish = (state) => {
    const box = $('compare');
    box.innerHTML = '';
    const id = state.story && state.story.funlib;
    if (!id) return;
    const st = byId[id];
    const mine = st.blanks.map((_, i) => state.answers['b' + (i + 1)] || '');
    record({ type: 'play', story: id, words: mine });
    const h = pick(st.human);
    const ai = pick(aiBy[id] || [{ words: [], source: '' }]);
    const rows = st.blanks.map((b, i) => `<tr><td class="muted">${esc(b.label)}</td><td><b>${esc(mine[i])}</b></td><td>${esc(h.words[i] || '')}</td><td>${esc(ai.words[i] || '')}</td><td class="muted">${esc(b.original)}</td></tr>`).join('');
    box.innerHTML = `<h3>How did everyone else fill it in?</h3>
      <div class="tbl"><table><thead><tr><th>blank</th><th>you</th><th>a human player (${esc(h.filler)})</th><th>AI</th><th>original text</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="muted small">That human player's story was rated ${h.funny != null ? h.funny.toFixed(1) : '?'} / 3 funny by five judges. Your answers were saved for your research download.</p>`;
  };

  // ---------------------------------------------------------------- export
  function exportData() {
    const g = records.filter((r) => r.type === 'guess');
    const payload = {
      app: 'Doodle Libs: Human or AI?',
      exported: new Date().toISOString(),
      dataset: FL.source,
      summary: { guesses: g.length, correct: g.filter((r) => r.correct).length, plays: records.filter((r) => r.type === 'play').length },
      records,
    };
    App.saveBlob(new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' }), `doodle-libs-research-${new Date().toISOString().slice(0, 10)}.json`);
  }

  // ---------------------------------------------------------------- wire up
  const sel = $('labPick');
  sel.innerHTML = '<option value="">Random story</option>' + stories.map((s) => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('');
  $('labGuess').onclick = () => { Sfx.ctx(); startGuess(); };
  $('labPlay').onclick = () => { Sfx.ctx(); startPlay(sel.value); };
  $('labExport').onclick = exportData;
  $('labClear').onclick = () => {
    if (!confirm('Delete all your saved guesses and answers from this browser?')) return;
    records = []; try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    updateCount();
  };
  $('gHuman').onclick = () => guess('human');
  $('gAI').onclick = () => guess('ai');
  $('gNext').onclick = nextRound;
  $('gReplay').onclick = () => { $('gReplay').hidden = true; const it = game.item; App.startStory(toStory(it.st), answersFrom(it.words), { guess: true, onDone: () => { $('gReplay').hidden = false; } }); };
  $('gQuit').onclick = () => { App.stop(); $('guess').hidden = true; App.show('labView'); };
  $('gOrig').onclick = () => {
    const it = game.item;
    $('gText').innerHTML = storyText(it.st, it.st.blanks.map((b) => b.original), 'orig');
    $('gOrig').hidden = true;
  };
  document.querySelectorAll('#gFunny button').forEach((b) => {
    b.onclick = () => {
      game.funny = Number(b.dataset.v);
      document.querySelectorAll('#gFunny button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    };
  });
  if ($('pathLabMeta')) $('pathLabMeta').textContent = `${stories.length} stories · ${stories.reduce((n, s) => n + s.human.length, 0)} real human answers · your score saved`;
  $('labMeta').textContent = `${stories.length} stories · ${stories.reduce((n, s) => n + s.human.length, 0)} human fill-ins · ${AI.fills.length} AI fill-ins`;
  $('gQuit').title = 'Back to the home page';
  // a live "spoiler" from the data on the Turing Test page
  (function teaser() {
    const box = $('teaser'); if (!box) return;
    const top = (lists) => { const c = new Map(); for (const ws of lists) for (const w of ws) { const k = w.toLowerCase().trim(); c.set(k, (c.get(k) || 0) + 1); } return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w); };
    const hum = top(stories.flatMap((s) => s.human.map((h) => h.words)));
    const ai = top(AI.fills.map((f) => f.words));
    const chip = (w, cls) => `<span class="chip ${cls}">${esc(w)}</span>`;
    box.innerHTML = `<h4>Spoiler from the data</h4>
      <p>Humans' favorite words: ${hum.map((w) => chip(w, 'h')).join(' ')}</p>
      <p>The AI's favorite words: ${ai.map((w) => chip(w, 'a')).join(' ')}</p>
      <button class="linkbtn" id="teaserData">📊 See all the charts →</button>`;
    $('teaserData').onclick = () => App.show('data');
  })();
  updateCount();
})();
