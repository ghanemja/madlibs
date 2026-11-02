// app.js — the game flow: pick a story, fill blanks, watch, replay, share.
(function () {
  const $ = (id) => document.getElementById(id);
  const { parseTemplate, compileCustom, StepRunner, runOp, renderTokens } = Director;
  Lex.init(VERBS, ADJS, ADVERBS);

  const S = new Stage($('stage'));
  window.stage = S; // handy for poking around in the console

  const state = { story: null, answers: {}, i: -1, runner: null, blanks: [], bi: 0, busy: false, used: new Set(), mode: 'play', run: 0, opts: {} };
  const prefs = { secret: false, voice: false, sound: true, style: 'toon' };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem('doodlelibs.prefs') || '{}')); } catch (e) { /* private mode */ }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------- views
  function show(view) {
    for (const v of ['menu', 'editor', 'play', 'data']) $(v).hidden = v !== view;
    if (window.App && App.onShow) App.onShow(view);
    document.body.classList.toggle('playing', view === 'play');
    if (view === 'play') requestAnimationFrame(() => S.resize());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------------------------------------------------------------- toggles
  function syncToggles() {
    $('tSecret').setAttribute('aria-pressed', prefs.secret);
    $('tVoice').setAttribute('aria-pressed', prefs.voice);
    $('tSound').setAttribute('aria-pressed', prefs.sound);
    Sk.toon = prefs.style !== 'doodle';
    $('tStyle').innerHTML = Sk.toon ? '🎨<span> Toon</span>' : '✏️<span> Doodle</span>';
    $('tStyle').setAttribute('aria-pressed', 'true');
    Sfx.on = prefs.sound;
    try { localStorage.setItem('doodlelibs.prefs', JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  }
  $('tStyle').onclick = () => { prefs.style = Sk.toon ? 'doodle' : 'toon'; syncToggles(); buildMenu(); };
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
    Sk.lw = Sk.toon ? 2.6 : 3;
    cv.style.filter = Sk.toon ? 'saturate(1.3) contrast(1.05)' : 'none';
    place.draw(3);
    Sk.ink = place.dark ? '#f4f1e8' : (Sk.toon ? '#1b1530' : '#2a2a2a');
    const fake = (key) => ({ def: THINGS[key], statuses: new Set(), acc: new Set(), color: null });
    const drawAt = (key, x, sc, expr) => {
      const def = THINGS[key];
      ctx.save(); ctx.translate(x, Places.G); ctx.scale(sc, sc); Sk.unit = sc;
      const P = { t: 1, walk: 0, moving: false, fill: def.fill || '#ddd', fill2: def.fill2 || Color.shade(def.fill || '#dddddd', -0.2), expr };
      Sk.shade = true; Sk.lw = Sk.toon ? 4.4 : 3;
      def.draw(fake(key), P);
      Sk.shade = false;
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
  }
  $('mkWrite').onclick = openEditor;
  $('mkRandom').onclick = () => startStory(Util.pick(STORIES));
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
  $('home').onclick = () => { state.run++; S.caption = null; S.reset('park'); show('menu'); };

  async function runSetup(story) {
    S.reset(story.place);
    S.crowdLimit = story.crowd || null;
    for (const op of story.setup || []) await runOp(S, op, state.answers);
  }

  // opts.guess: research guessing game — play the filled-in story without the word card
  async function startStory(story, answers, opts) {
    opts = opts || {};
    const run = ++state.run;
    state.story = story; state.answers = {}; state.i = -1; state.used = new Set(); state.mode = 'play';
    state.opts = opts;
    show('play');
    $('storyTitle').textContent = story.title;
    $('end').hidden = true; $('prompt').hidden = !!opts.guess;
    if ($('guess')) $('guess').hidden = !opts.guess;
    $('sentence').innerHTML = ''; $('steps').innerHTML = '';
    setBusy(true);
    if (answers) { state.answers = answers; return replay(opts.guess ? { quiet: true, onDone: opts.onDone } : {}); }
    await runSetup(story);
    if (run !== state.run) return;
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
    const run = state.run;
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
    if (run !== state.run) return;
    if (!state.blanks.length) {
      await Promise.all([speak(plainSentence(step)), S.wait(1.2)]);
      if (run !== state.run) return;
      return nextStep();
    }
    askBlank();
  }

  function askBlank() {
    const b = state.blanks[state.bi];
    const T = TYPES[b.type] || TYPES.word;
    const raw = b.raw && Director.normType(b.raw) === b.type && !/^(noun|verb|adjective|name|place|sound|animal|food|color|plural noun|plural)$/i.test(b.raw.trim()) ? b.raw.trim() : null;
    $('ask').innerHTML = `Give me ${raw ? (/^[aeiou]/i.test(raw) ? 'an' : 'a') + ' <b>' + esc(raw.toUpperCase()) + '</b>' : T.ask.replace(/([A-Z][A-Z ]+)/, '<b>$1</b>')}`;
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
    const run = state.run;
    const step = state.story.steps[state.i];
    const done = state.bi >= state.blanks.length;
    const talk = done ? speak(plainSentence(step)) : Promise.resolve();
    await state.runner.run();
    if (run !== state.run) return;
    if (!done) { askBlank(); return; }
    await Promise.all([talk, S.wait(0.8)]);
    if (run !== state.run) return;
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
    $('end').scrollTop = 0;
    if (window.App && App.onFinish) App.onFinish(state);
  }

  // opts.record: burn captions in for video; opts.quiet: leave the cards alone (guess game)
  async function replay(opts) {
    opts = opts || {};
    const run = ++state.run;
    const live = () => run === state.run;
    state.mode = 'replay';
    if (!opts.quiet) {
      $('end').hidden = true; $('prompt').hidden = false;
      setBusy(true);
      $('watching').textContent = opts.record ? '🎬 recording your video… keep this tab open' : '🎬 now playing…';
    }
    if (opts.record) { S.titleCard = state.story.title; S.caption = S.titleCard; }
    await runSetup(state.story);
    if (!live()) return;
    if (opts.record) { await S.wait(1.2); S.caption = null; }
    for (let i = 0; i < state.story.steps.length; i++) {
      state.i = i; state.blanks = [];
      const step = state.story.steps[i];
      if (!opts.quiet) { renderSteps(); renderSentence(); }
      if (opts.record || opts.quiet) S.caption = plainSentence(step);
      const talk = opts.record ? Promise.resolve() : speak(plainSentence(step));
      const r = new StepRunner(S, step, state.answers);
      await r.run();
      if (!live()) return;
      await Promise.all([talk, S.wait(opts.record ? 1.4 : 1)]);
      if (!live()) return;
    }
    if (opts.record) { S.caption = S.titleCard = 'THE END'; await S.wait(1.6); }
    S.caption = null;
    $('watching').textContent = '✏️ drawing…';
    state.mode = 'play';
    if (opts.onDone) opts.onDone(); else finish();
  }

  // ---------------------------------------------------------------- downloads
  const slug = () => (state.story.title || 'cartoon').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cartoon';
  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function toast(msg) { $('toast').textContent = msg; $('toast').hidden = false; }

  $('snap').onclick = () => {
    $('stage').toBlob((b) => { if (b) saveBlob(b, `${slug()}.png`); toast('Picture saved!'); }, 'image/png');
  };

  $('video').onclick = async () => {
    const cv = $('stage');
    if (!window.MediaRecorder || !cv.captureStream) { toast('Your browser can\'t record video. Try Chrome, Edge or Firefox, or save a picture instead.'); return; }
    const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const mime = types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    const speed = S.speedMul;
    S.speedMul = 1;
    S.fixedWidth = 1280; S.resize();
    const stream = cv.captureStream(30);
    const audio = Sfx.streamTrack();
    if (audio) stream.addTrack(audio);
    const chunks = [];
    let rec;
    try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 5000000 } : undefined); }
    catch (e) { S.fixedWidth = null; S.resize(); S.speedMul = speed; toast('Couldn\'t start recording in this browser.'); return; }
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((r) => { rec.onstop = r; });
    $('recBadge').hidden = false;
    rec.start(250);
    try { await replay({ record: true }); } finally {
      rec.stop();
      await stopped;
      stream.getVideoTracks().forEach((t) => t.stop());
      $('recBadge').hidden = true;
      S.fixedWidth = null; S.resize(); S.speedMul = speed;
    }
    saveBlob(new Blob(chunks, { type: mime || 'video/webm' }), `${slug()}.${ext}`);
    toast(`Video saved as ${slug()}.${ext}!`);
  };

  $('replay').onclick = () => replay();
  $('again').onclick = () => startStory(state.story);
  $('newStory').onclick = () => { state.run++; S.reset('park'); show('menu'); };

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
  // small API for js/research.js
  window.App = Object.assign(window.App || {}, { startStory, show, S, state, esc, saveBlob, buildMenu, storyHtml, stop: () => { state.run++; S.caption = null; } });
  if (!fromHash()) show('menu');
})();
