// app.js — the game flow: pick a story, fill blanks, watch, replay, share.
(function () {
  const $ = (id) => document.getElementById(id);
  const { parseTemplate, compileCustom, StepRunner, runOp, renderTokens } = Director;
  Lex.init(VERBS, ADJS, ADVERBS);

  const S = new Stage($('stage'));
  window.stage = S; // handy for poking around in the console

  const state = { story: null, answers: {}, i: -1, runner: null, blanks: [], bi: 0, busy: false, used: new Set(), mode: 'play' };
  const prefs = { secret: false, voice: false, sound: true };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem('doodlelibs.prefs') || '{}')); } catch (e) { /* private mode */ }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------- views
  function show(view) {
    for (const v of ['menu', 'editor', 'play']) $(v).hidden = v !== view;
    if (view === 'play') requestAnimationFrame(() => S.resize());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------------------------------------------------------------- toggles
  function syncToggles() {
    $('tSecret').setAttribute('aria-pressed', prefs.secret);
    $('tVoice').setAttribute('aria-pressed', prefs.voice);
    $('tSound').setAttribute('aria-pressed', prefs.sound);
    Sfx.on = prefs.sound;
    try { localStorage.setItem('doodlelibs.prefs', JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  }
  $('tSecret').onclick = () => { prefs.secret = !prefs.secret; syncToggles(); renderSentence(); };
  $('tVoice').onclick = () => { prefs.voice = !prefs.voice; if (!prefs.voice && window.speechSynthesis) speechSynthesis.cancel(); syncToggles(); };
  $('tSound').onclick = () => { prefs.sound = !prefs.sound; syncToggles(); if (prefs.sound) Sfx.play('ding'); };
  $('ff').onclick = () => { const on = S.speedMul === 1; S.speedMul = on ? 2.5 : 1; $('ff').setAttribute('aria-pressed', on); };
  syncToggles();

  function speak(text) {
    if (!prefs.voice || !window.speechSynthesis) return Promise.resolve();
    return new Promise((res) => {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[“”"]/g, ''));
      u.rate = 1.02; u.pitch = 1.1;
      u.onend = u.onerror = res;
      speechSynthesis.speak(u);
      setTimeout(res, 12000);
    });
  }

  // ---------------------------------------------------------------- menu
  function drawThumb(cv, story) {
    const ctx = cv.getContext('2d');
    const k = cv.width / Places.W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    Sk.begin(ctx, story.title.length);
    const place = PLACES[story.place] || PLACES.park;
    Sk.ink = place.dark ? '#c8c8de' : '#9a9a9a';
    place.draw(3);
    Sk.ink = place.dark ? '#f4f1e8' : '#2a2a2a';
    const fake = (key) => ({ def: THINGS[key], statuses: new Set(), acc: new Set(), color: null });
    const drawAt = (key, x, sc, expr) => {
      const def = THINGS[key];
      ctx.save(); ctx.translate(x, Places.G); ctx.scale(sc, sc); Sk.unit = sc;
      const P = { t: 1, walk: 0, moving: false, fill: def.fill || '#ddd', fill2: def.fill2 || Color.shade(def.fill || '#dddddd', -0.2), expr };
      def.draw(fake(key), P);
      if (!def.selfFace) { const [fx, fy, fs] = def.face; Sk.circle(fx - fs * 0.32, fy - fs * 0.12, fs * 0.2, '#fff', { lw: 1.5 }); Sk.circle(fx + fs * 0.32, fy - fs * 0.12, fs * 0.2, '#fff', { lw: 1.5 }); Sk.face(fx, fy, fs, expr); }
      ctx.restore(); Sk.unit = 1;
    };
    drawAt('person', 300, 1.5, 'happy');
    drawAt(story.icon || 'blob', 640, 1.35, 'surprised');
    Sk.ink = '#2a2a2a';
  }

  function buildMenu() {
    const box = $('cards');
    box.innerHTML = '';
    for (const st of STORIES) {
      const b = document.createElement('button');
      b.className = 'card';
      b.innerHTML = `<canvas width="480" height="270"></canvas><h3>${esc(st.title)}</h3><p>${esc(st.blurb)}</p>`;
      b.onclick = () => startStory(st);
      box.appendChild(b);
      drawThumb(b.querySelector('canvas'), st);
    }
    const r = document.createElement('button');
    r.className = 'card special';
    r.innerHTML = `<div class="big">🎲</div><h3>Surprise me</h3><p>A random story. No peeking.</p>`;
    r.onclick = () => startStory(Util.pick(STORIES));
    box.appendChild(r);
    const c = document.createElement('button');
    c.className = 'card special';
    c.innerHTML = `<div class="big">✍️</div><h3>Write your own</h3><p>Type any story with [noun] [verb] blanks and it animates itself.</p>`;
    c.onclick = openEditor;
    box.appendChild(c);
  }
  // redraw thumbnails once the handwriting font arrives
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildMenu);
  buildMenu();

  // ---------------------------------------------------------------- editor
  function openEditor() {
    show('editor');
    if (!$('cText').value) $('cText').value = CUSTOM_EXAMPLE;
    $('cErr').hidden = true;
  }
  const chipTypes = ['name', 'noun', 'animal', 'food', 'plural noun', 'verb', 'adjective', 'color', 'place', 'sound'];
  for (const t of chipTypes) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = `[${t}]`;
    b.onclick = () => {
      const ta = $('cText');
      const s = ta.selectionStart, e = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + `[${t}]` + ta.value.slice(e);
      ta.focus(); ta.selectionStart = ta.selectionEnd = s + t.length + 2;
    };
    $('chips').appendChild(b);
  }
  $('cBack').onclick = () => show('menu');
  $('cGo').onclick = () => {
    const src = $('cText').value.trim();
    const story = compileCustom(src, $('cTitle').value.trim() || 'My Story');
    const blanks = story.steps.flatMap((s) => parseTemplate(s.text).filter((t) => t.t === 'blank'));
    if (!blanks.length) { $('cErr').textContent = 'Add at least one blank in [square brackets], like [noun] or [verb].'; $('cErr').hidden = false; return; }
    startStory(story);
  };

  // ---------------------------------------------------------------- play
  $('home').onclick = () => { S.reset('park'); show('menu'); };

  async function runSetup(story) {
    S.reset(story.place);
    for (const op of story.setup || []) await runOp(S, op, state.answers);
  }

  async function startStory(story, answers) {
    state.story = story; state.answers = {}; state.i = -1; state.used = new Set(); state.mode = 'play';
    show('play');
    $('storyTitle').textContent = story.title;
    $('end').hidden = true; $('prompt').hidden = false;
    $('sentence').innerHTML = ''; $('steps').innerHTML = '';
    setBusy(true);
    await runSetup(story);
    if (answers) { state.answers = answers; return replay(); }
    nextStep();
  }

  function setBusy(b) {
    state.busy = b;
    $('form').hidden = b;
    $('watching').hidden = !b;
    if (!b) setTimeout(() => $('word').focus({ preventScroll: true }), 30);
  }

  function renderSteps() {
    const n = state.story.steps.length;
    $('steps').innerHTML = Array.from({ length: n }, (_, k) => `<i class="${k < state.i ? 'done' : k === state.i ? 'now' : ''}"></i>`).join('');
  }

  function stepTokens(step) { return parseTemplate(step.text); }

  function renderSentence() {
    if (!state.story || state.i < 0 || state.i >= state.story.steps.length) return;
    const step = state.story.steps[state.i];
    const toks = stepTokens(step);
    const cur = state.blanks[state.bi];
    const allFilled = state.blanks.every((b) => state.answers[b.key] != null);
    const hide = prefs.secret && !allFilled && state.mode === 'play';
    $('sentence').innerHTML = renderTokens(toks, state.answers,
      (v) => `<span class="w">${esc(v)}</span>`,
      (b) => `<span class="blank ${cur && b.key === cur.key ? 'now' : ''}">${esc((TYPES[b.type] || TYPES.word).ask.replace(/^an? /, ''))}</span>`,
      (t) => (hide ? `<span class="hide">${esc(t)}</span>` : esc(t)));
  }

  function plainSentence(step) {
    return renderTokens(stepTokens(step), state.answers, (v) => v, () => '____');
  }

  async function nextStep() {
    state.i++;
    const steps = state.story.steps;
    if (state.i >= steps.length) return finish();
    const step = steps[state.i];
    state.runner = new StepRunner(S, step, state.answers);
    // a blank whose key was already answered (repeated key) counts as filled
    state.blanks = stepTokens(step).filter((t) => t.t === 'blank' && state.answers[t.key] == null);
    state.blanks = state.blanks.filter((b, k, arr) => arr.findIndex((x) => x.key === b.key) === k);
    state.bi = 0;
    renderSteps(); renderSentence();
    setBusy(true);
    await state.runner.run();
    if (!state.blanks.length) {
      await Promise.all([speak(plainSentence(step)), S.wait(1.2)]);
      return nextStep();
    }
    askBlank();
  }

  function askBlank() {
    const b = state.blanks[state.bi];
    const T = TYPES[b.type] || TYPES.word;
    const raw = b.raw && Director.normType(b.raw) === b.type && !/^(noun|verb|adjective|name|place|sound|animal|food|color|plural noun|plural)$/i.test(b.raw.trim()) ? b.raw.trim() : null;
    $('ask').innerHTML = `Give me ${raw ? 'a <b>' + esc(raw.toUpperCase()) + '</b>' : T.ask.replace(/([A-Z][A-Z ]+)/, '<b>$1</b>')}`;
    $('hint').textContent = T.hint;
    $('word').value = '';
    renderSentence();
    setBusy(false);
  }

  $('dice').onclick = () => {
    const b = state.blanks[state.bi]; if (!b) return;
    const ideas = (TYPES[b.type] || TYPES.word).ideas.filter((w) => !state.used.has(w));
    $('word').value = Util.pick(ideas.length ? ideas : TYPES[b.type].ideas);
    $('word').focus();
  };

  $('form').onsubmit = async (e) => {
    e.preventDefault();
    if (state.busy) return;
    const word = $('word').value.trim();
    if (!word) { $('word').animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 250 }); return; }
    Sfx.ctx(); // unlock audio on first user gesture
    const b = state.blanks[state.bi];
    state.answers[b.key] = word;
    state.used.add(word);
    state.bi++;
    renderSentence();
    setBusy(true);
    const step = state.story.steps[state.i];
    const done = state.bi >= state.blanks.length;
    const talk = done ? speak(plainSentence(step)) : Promise.resolve();
    await state.runner.run();
    if (!done) { askBlank(); return; }
    await Promise.all([talk, S.wait(0.8)]);
    nextStep();
  };

  function storyHtml() {
    return state.story.steps.map((st) => `<p>${renderTokens(stepTokens(st), state.answers, (v) => `<span class="w">${esc(v)}</span>`, () => '____', esc)}</p>`).join('');
  }

  function finish() {
    state.i = state.story.steps.length;
    renderSteps();
    $('prompt').hidden = true;
    $('end').hidden = false;
    $('toast').hidden = true;
    $('storyText').innerHTML = storyHtml();
    $('end').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function replay() {
    state.mode = 'replay';
    $('end').hidden = true; $('prompt').hidden = false;
    setBusy(true);
    $('watching').textContent = '🎬 now playing…';
    await runSetup(state.story);
    for (let i = 0; i < state.story.steps.length; i++) {
      state.i = i; state.blanks = []; renderSteps();
      const step = state.story.steps[i];
      renderSentence();
      const talk = speak(plainSentence(step));
      const r = new StepRunner(S, step, state.answers);
      await r.run();
      await Promise.all([talk, S.wait(1)]);
    }
    $('watching').textContent = '✏️ drawing…';
    state.mode = 'play';
    finish();
  }

  $('replay').onclick = replay;
  $('again').onclick = () => startStory(state.story);
  $('newStory').onclick = () => { S.reset('park'); show('menu'); };

  // ---------------------------------------------------------------- sharing
  const b64e = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64d = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

  $('share').onclick = async () => {
    const st = state.story;
    const data = st.custom ? { c: st.custom, t: st.title, a: state.answers } : { s: st.id, a: state.answers };
    const url = location.href.split('#')[0] + '#p=' + b64e(JSON.stringify(data));
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch (e) { /* clipboard blocked */ }
    if (!ok) { history.replaceState(null, '', url); }
    $('toast').textContent = ok ? 'Link copied! Send it to a friend and they\'ll see your cartoon.' : 'Copy the link from your address bar to share!';
    $('toast').hidden = false;
  };

  function fromHash() {
    const m = location.hash.match(/#p=([\w-]+)/);
    if (!m) return false;
    try {
      const d = JSON.parse(b64d(m[1]));
      const story = d.c ? compileCustom(d.c, d.t) : STORIES.find((s) => s.id === d.s);
      if (!story || !d.a) return false;
      history.replaceState(null, '', location.href.split('#')[0]);
      startStory(story, d.a);
      return true;
    } catch (e) { return false; }
  }
  if (!fromHash()) show('menu');
})();
