// director.js — turns story steps + the words people typed into stage actions.
(function () {
  const { W, G } = Places;
  const { rand, pick } = Util;
  const P = Stage.prototype;

  // ---------------------------------------------------------------- stage verbs
  P.act = async function (A, key, o) {
    o = o || {};
    if (!A) return;
    if (A.gone && key !== 'vanish') await this.reappear(A);
    A.alive = true;
    if (key !== 'sleep') A.statuses.delete('asleep');
    if (key !== 'freeze' && A.statuses.has('frozen')) {
      A.statuses.delete('frozen');
      Sfx.play('freeze');
      for (let i = 0; i < 14; i++) this.particle({ kind: 'debris', x: A.cx + rand(-A.w / 2, A.w / 2), y: A.cy + rand(-A.h / 2, A.h / 2), vx: rand(-250, 250), vy: rand(-300, -50), g: 900, max: 1, size: rand(6, 12), color: 'rgba(190,225,250,.9)', vr: rand(-8, 8), ground: true });
      this.text(A.cx, A.top - 20, 'CRACK!', { size: 34, color: '#4c9be8' });
    }
    if (key !== 'melt') A.statuses.delete('melted');
    const v = VERBS[key] || VERBS._unknown;
    if (v.run) return v.run(A, this, o);
    const spec = Object.assign({}, v, { dur: (v.dur || 1.6) / (o.speed || 1) });
    return this.anim(A, spec, o);
  };

  P.spawn = async function (id, text, o) {
    o = o || {};
    const n = Lex.noun(text);
    const def = THINGS[n.key];
    const count = o.plural || (n.plural && o.plural !== false && o.allowPlural) ? 3 : 1;
    const base = (o.scale || 1) * (count > 1 ? 0.6 : 1);
    // keep long stories readable: poof away the oldest props when the stage gets crowded
    if (this.crowdLimit) {
      const props = () => this.actors.filter((a) => a.id !== 'hero' && !a.gone && !a.def.sky).sort((a, b) => a.z - b.z);
      let list = props();
      while (list.length && list.length + count > this.crowdLimit) {
        const old = list.shift();
        this.poof(old.cx, old.cy, 6);
        this.actors.splice(this.actors.indexOf(old), 1);
      }
    }
    let x0 = o.x != null ? o.x : 640;
    if (o.autoX) {
      // pick the open spot farthest from everyone already on stage
      const taken = this.actors.filter((a) => !a.gone && !a.def.sky).map((a) => a.x);
      let best = 640, bestD = -1;
      for (let x = 380; x <= 860; x += 40) {
        const d = taken.length ? Math.min(...taken.map((t) => Math.abs(t - x))) : 999;
        if (d > bestD) { bestD = d; best = x; }
      }
      x0 = best;
    }
    const gap = Math.max(60, def.w * base * 0.95);
    if (count > 1) x0 = Math.max(gap + 40, Math.min(W - gap - 40, x0));
    const actors = [];
    // replacing an existing actor with this id? clear its group
    delete this.groups[id];
    for (let i = 0; i < count; i++) {
      const aid = i ? `${id}#${i}` : id;
      const x = x0 + (i - (count - 1) / 2) * gap;
      const A = this.add(aid, n.key, {
        x, word: n.label, scale: base, alt: o.alt,
        label: i === Math.floor(count / 2) && (n.known || base < 0.8) ? n.label : '',
        labelFor: this.time + 5,
        dir: x > W / 2 ? -1 : 1,
      });
      if (o.alive) A.alive = true;
      actors.push(A);
    }
    if (count > 1) this.groups[id] = actors;

    const from = o.from || 'pop';
    const entrances = actors.map(async (A, i) => {
      await this.wait(i * 0.15);
      if (from === 'sky') {
        const a1 = A.alt; A.alt = 640;
        Sfx.play('whoosh');
        await this.anim(A, {
          dur: 0.9,
          update(A, p) { A.alt = a1 + (640 - a1) * (1 - p * p); A.rot = (1 - p) * 2; A.expr = 'scream'; },
          end(A, S2) { A.alt = a1; S2.shake = 10; Sfx.play('thud'); S2.text(A.cx, G - 30, 'THUD!', { size: 34 }); for (let k = 0; k < 6; k++) S2.particle({ kind: 'dust', x: A.cx + rand(-30, 30), y: G - 4, vx: rand(-90, 90), vy: rand(-50, -10), max: 0.7, size: 10 }); },
        });
      } else if (from === 'left' || from === 'right') {
        const tx = A.x;
        A.x = from === 'left' ? -A.w : W + A.w;
        await this.walkTo(A, tx);
        A.dir = tx > W / 2 ? -1 : 1;
      } else {
        A.scale = 0.01;
        this.poof(A.cx, G - def.h * base / 2, 8);
        Sfx.play('pop');
        await this.wait(0.5);
      }
    });
    await Promise.all(entrances);

    const adjKeys = [...n.adjs];
    let adjLabel = '';
    if (o.adjText) { const a = Lex.adj(o.adjText); adjKeys.push(...a.keys); adjLabel = a.label; if (!a.keys.length) actors.forEach((A) => Actions.applyAdj(A, this, [], adjLabel)); }
    if (adjKeys.length) actors.forEach((A) => Actions.applyAdj(A, this, adjKeys, adjLabel));
    if (!n.known) actors.forEach((A) => { A.alive = true; });
    await this.wait(0.5);
    return actors;
  };

  const baseResolve = P.resolve;
  P.resolve = function (id) {
    if (Array.isArray(id)) return [...new Set(id.flatMap((i) => baseResolve.call(this, i)))];
    return baseResolve.call(this, id);
  };

  P.doVerb = async function (who, text, o) {
    o = o || {};
    const v = Lex.verb(text);
    const actors = this.resolve(who);
    if (!actors.length) return;
    let speed = 1;
    for (const a of v.advs) speed *= ADVERBS[a].speed || 1;
    if (!v.key && v.adjs.length) {
      actors.forEach((A) => Actions.applyAdj(A, this, v.adjs, v.label));
      await this.wait(1.4);
      return;
    }
    const T = o.target ? this.resolve(o.target)[0] : null;
    await Promise.all(actors.map((A, i) => this.wait(i * 0.12).then(() => this.act(A, v.key || '_unknown', { label: v.label, target: T && T !== A ? T : null, speed }))));
  };

  P.doAdj = async function (who, text) {
    const a = Lex.adj(text);
    const actors = this.resolve(who);
    if (!a.keys.length && a.verbs.length) { // they typed a verb into an adjective slot — just do it
      await Promise.all(actors.map((A) => this.act(A, a.verbs[0], { label: a.label })));
      return;
    }
    for (const A of actors) Actions.applyAdj(A, this, a.keys, a.label);
    await this.wait(1.3);
  };

  P.say = async function (who, text, o) {
    o = o || {};
    const str = String(text).trim() || '…';
    const A = this.resolve(who)[0];
    const shout = o.shout || /!|^[A-Z\s]+$/.test(str) || str.length < 10;
    if (!A || A.gone) return this.doBurst(str);
    A.alive = true;
    this.bubble(A, o.quote === false ? str : (shout ? str.toUpperCase() + '!' : str), 2.4);
    Sfx.play('hey');
    if (shout) this.shake = 5;
    await this.anim(A, { dur: 1.2, update(A, p, t) { A.expr = 'scream'; A.dy = -Math.abs(Math.sin(t * 12)) * 6; } });
    await this.wait(0.6);
  };

  P.doBurst = async function (text) {
    const str = String(text).trim().toUpperCase().replace(/!*$/, '!');
    this.burst(str);
    this.shake = 12;
    const lc = str.toLowerCase();
    if (/boom|bang|blam|pow|crash|kaboom/.test(lc)) { Sfx.play('boom'); this.flash = 0.6; }
    else if (/boing|bounce|sproing/.test(lc)) Sfx.play('boing');
    else if (/zap|zing|bzz/.test(lc)) Sfx.play('zap');
    else if (/splash|splish|splat|sploosh/.test(lc)) Sfx.play('splash');
    else if (/toot|pfft|fart|brap/.test(lc)) Sfx.play('fart');
    else if (/moo|woof|meow|oink|quack|roar|neigh/.test(lc)) Sfx.play('hey');
    else Sfx.play('pop');
    await this.wait(1.6);
  };

  P.doPlace = async function (text) {
    const p = Lex.place(text);
    this.setPlace(p.key || Places.signFor(p.label));
    await this.wait(1.1);
    if (PLACES.ocean === this.place) for (let i = 0; i < 20; i++) this.particle({ kind: 'bubble', x: rand(0, W), y: G, vy: -rand(60, 160), max: 2.5, size: rand(4, 10) });
  };

  P.become = async function (who, text) {
    const n = Lex.noun(text);
    const actors = this.resolve(who);
    for (const A of actors) {
      this.poof(A.cx, A.cy, 18);
      for (let i = 0; i < 10; i++) this.particle({ kind: 'spark', x: A.cx + rand(-60, 60), y: A.cy + rand(-60, 60), max: 1, size: 10 });
      Sfx.play('magic');
      const name = A.id === 'hero' ? A.label : '';
      A.def = THINGS[n.key];
      A.word = n.label; A.label = name || (n.known ? n.label : '');
      A.labelUntil = name ? Infinity : this.time + 5;
      A.alive = true; A.statuses.clear(); A.color = null; A.acc.clear(); A.sx0 = A.sy0 = 1; A.flipY = false;
      A.alt = A.def.sky ? 160 : 0;
      A.scale = 0.2;
      if (n.adjs.length) Actions.applyAdj(A, this, n.adjs, '');
    }
    await this.wait(1.3);
  };

  P.setName = async function (who, text) {
    const A = this.resolve(who)[0];
    if (!A) return;
    const name = String(text).trim() || 'Nobody';
    A.label = name.length > 22 ? name.slice(0, 22) + '…' : name;
    A.labelUntil = Infinity;
    // "Pirate Pete" gets a pirate hat, "Queen Bee" a crown…
    const n = Lex.noun(name);
    if (n.known && THINGS[n.key].kind === 'person') A.def = THINGS[n.key];
    const a = Lex.adj(name);
    if (a.keys.length) Actions.applyAdj(A, this, a.keys, '');
    this.text(A.cx, A.top - 30, '✨', { size: 34 });
    Sfx.play('ding');
    await this.anim(A, { dur: 0.9, update(A, p) { A.dy = -Actions.bump(p) * 40; A.expr = 'happy'; } });
  };

  // ---------------------------------------------------------------- stories
  const BLANK_RE = /\[([a-z' ]+?)(?::(\w+))?\]/gi;

  function normType(t) {
    t = t.toLowerCase().trim();
    if (/^(name|person|friend|celebrity|someone|character|.*name)$/.test(t)) return 'name';
    if (/plural/.test(t) || t === 'nouns' || t === 'things') return 'plural';
    if (/animal|creature|pet/.test(t)) return 'animal';
    if (/food|snack|dessert|fruit|vegetable|drink|meal/.test(t)) return 'food';
    if (/^(noun|thing|object|item|vehicle|toy|body part|liquid)$/.test(t)) return 'noun';
    if (/adverb/.test(t)) return 'adverb';
    if (/verb|action/.test(t)) return 'verb';
    if (/colou?r/.test(t)) return 'color';
    if (/adj|describ|feeling|emotion|mood/.test(t)) return 'adjective';
    if (/place|location|planet|city|country|where/.test(t)) return 'place';
    if (/sound|noise|exclamation|interjection|silly word|catchphrase|shout/.test(t)) return 'sound';
    if (/number/.test(t)) return 'number';
    return 'word';
  }
  const NOUNISH = ['noun', 'animal', 'food', 'plural'];

  function parseTemplate(text) {
    const tokens = [];
    let last = 0;
    const re = /\[([a-z' ]+?)(?::(\w+))?\]|\{(\w+)\}/gi;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) tokens.push({ t: 'text', v: text.slice(last, m.index) });
      if (m[3]) tokens.push({ t: 'ref', key: m[3] });
      else tokens.push({ t: 'blank', type: normType(m[1]), raw: m[1], key: m[2] || null });
      last = re.lastIndex;
    }
    if (last < text.length) tokens.push({ t: 'text', v: text.slice(last) });
    return tokens;
  }

  // Build a playable story from free text like:
  //   "[name] found a [adjective] [noun] in the [place]. It started to [verb]!"
  function compileCustom(src, title) {
    let n = 0;
    const sentences = String(src).replace(/\r/g, '').split(/\n+|(?<=[.!?])\s+(?=[A-Z"“\[{])/).map((s) => s.trim()).filter(Boolean);
    const steps = [];
    let lastActor = 'hero';
    let spawnIdx = 0;
    const xs = [650, 480, 800, 380, 720, 560];
    const named = {};
    const actorKeys = new Set();
    for (const sentence of sentences) {
      const toks = parseTemplate(sentence);
      const ops = [];
      let text = '';
      let pendingAdj = null;
      const all = /\b(everyone|everybody|they all|all of them|together|we all)\b/i.test(sentence);
      for (let i = 0; i < toks.length; i++) {
        const tk = toks[i];
        if (tk.t === 'text') { text += tk.v; continue; }
        if (tk.t === 'ref') {
          text += `{${tk.key}}`;
          if (tk.key === named.hero) lastActor = 'hero';
          else if (actorKeys.has(tk.key)) lastActor = tk.key;
          continue;
        }
        const key = tk.key || `w${++n}`;
        text += `[${tk.raw}:${key}]`;
        const next = toks[i + 1], next2 = toks[i + 2];
        const adjacentNoun = (next && next.t === 'blank' && NOUNISH.includes(next.type)) || (next && next.t === 'text' && /^\s*$/.test(next.v) && next2 && next2.t === 'blank' && NOUNISH.includes(next2.type));
        switch (tk.type) {
          case 'name':
            if (!named.hero) { named.hero = key; ops.push({ op: 'name', who: 'hero', key }); lastActor = 'hero'; }
            else { ops.push({ op: 'spawnPerson', id: key, key, x: xs[spawnIdx++ % xs.length] }); lastActor = key; actorKeys.add(key); }
            break;
          case 'noun': case 'animal': case 'food': case 'plural':
            ops.push({ op: 'spawn', id: key, key, adj: pendingAdj || undefined, autoX: true, plural: tk.type === 'plural', from: tk.type === 'animal' ? pick(['left', 'right', 'sky', 'pop']) : 'pop' });
            pendingAdj = null; lastActor = key; actorKeys.add(key);
            break;
          case 'color': case 'adjective':
            if (adjacentNoun) pendingAdj = key;
            else ops.push({ op: 'mod', who: all ? 'all' : lastActor, key });
            break;
          case 'verb':
            ops.push({ op: 'act', who: all ? 'all' : lastActor, key });
            break;
          case 'adverb':
            break;
          case 'place':
            ops.push({ op: 'place', key });
            break;
          case 'sound':
            ops.push(lastActor && i > 0 ? { op: 'say', who: lastActor, key } : { op: 'burst', key });
            break;
          default:
            ops.push({ op: 'burst', key });
        }
      }
      steps.push({ text: text.trim(), ops });
    }
    return {
      id: 'custom', title: title || 'My Story', custom: src, place: 'park', crowd: 4,
      setup: [{ op: 'add', id: 'hero', thing: 'person', x: -60 }, { op: 'walk', who: 'hero', x: 250 }],
      steps,
    };
  }

  // Runs one step's ops as their words arrive. Ops run in order and an op
  // waits until every blank it needs has been filled.
  class StepRunner {
    constructor(stage, step, answers) {
      this.S = stage; this.step = step; this.answers = answers; this.i = 0;
      this.blankKeys = parseTemplate(step.text).filter((t) => t.t === 'blank').map((t) => t.key);
    }
    deps(op) {
      const keys = [op.key, op.adj, op.after];
      if (op.ops) op.ops.forEach((o) => keys.push(o.key, o.adj, o.after));
      return keys.filter((k) => k && this.blankKeys.includes(k));
    }
    ready(op) { return this.deps(op).every((k) => this.answers[k] != null); }
    async run() {
      const ops = this.step.ops || [];
      while (this.i < ops.length && this.ready(ops[this.i])) {
        const op = ops[this.i++];
        try { await runOp(this.S, op, this.answers); } catch (e) { console.error('op failed', op, e); }
      }
    }
    get done() { return this.i >= (this.step.ops || []).length; }
  }

  async function runOp(S, op, ans) {
    const word = op.key ? ans[op.key] : undefined;
    switch (op.op) {
      case 'add': {
        const A = S.add(op.id, op.thing, { x: op.x, alt: op.alt, scale: op.scale, label: op.label || '', dir: op.dir });
        if (op.alive) A.alive = true;
        if (op.color) A.color = op.color;
        if (op.hat) A.hat = op.hat;
        if (op.scenery) A.scenery = true;
        if (op.pop) { A.scale = 0.01; S.poof(A.cx, G - 40, 8); await S.wait(0.4); }
        return;
      }
      case 'spawnPerson': {
        const A = S.add(op.id, 'person', { x: op.x, dir: -1 });
        A.x = W + 60; await S.walkTo(A, op.x); A.dir = -1;
        await S.setName(op.id, word);
        return;
      }
      case 'name': return S.setName(op.who || 'hero', word);
      case 'walk': { const A = S.resolve(op.who)[0]; if (A) { if (A.gone) await S.reappear(A); await S.walkTo(A, op.x, op.speed); if (op.face) A.dir = op.face; } return; }
      case 'spawn': return S.spawn(op.id || op.key, word, { autoX: op.autoX, x: op.x, alt: op.alt, from: op.from, adjText: op.adj ? ans[op.adj] : null, plural: op.plural, scale: op.scale, alive: op.alive, allowPlural: op.allowPlural });
      case 'act': return S.doVerb(op.who, word, { target: op.target });
      case 'verb': {
        const actors = S.resolve(op.who);
        const targets = op.target ? S.resolve(op.target) : [null];
        for (const T of targets) await Promise.all(actors.map((A) => S.act(A, op.verb, { target: T, label: op.verb, say: op.say })));
        return;
      }
      case 'par': return Promise.all(op.ops.map((o) => runOp(S, o, ans)));
      case 'acc': S.resolve(op.who).forEach((A) => { A.acc.add(op.acc); A.alive = true; }); return;
      case 'mod': return S.doAdj(op.who, word);
      case 'say': return S.say(op.who, word);
      case 'bubble': { const A = S.resolve(op.who)[0]; if (A) S.bubble(A, fill(op.text, ans), op.dur || 2.2); await S.wait(op.wait != null ? op.wait : 1); return; }
      case 'burst': return S.doBurst(word != null ? word : op.text);
      case 'place': return S.doPlace(word != null ? word : op.place);
      case 'become': return S.become(op.who, word);
      case 'wait': return S.wait(op.s || 1);
      case 'hide': S.resolve(op.who).forEach((A) => { A.gone = true; }); return;
      case 'show': S.resolve(op.who).forEach((A) => { A.gone = false; A.alpha = 1; if (op.x != null) A.x = op.x; }); return;
      case 'move': S.resolve(op.who).forEach((A) => { if (op.x != null) A.x = op.x; if (op.alt != null) A.alt = op.alt; }); return;
      case 'confetti': S.confetti(op.x || W / 2, op.y || 200, 60); Sfx.play('ding'); return S.wait(0.6);
      case 'status': S.resolve(op.who).forEach((A) => op.remove ? A.statuses.delete(op.status) : A.statuses.add(op.status)); return;
      case 'launch': {
        const R = S.resolve(op.who)[0]; if (!R) return;
        Sfx.play('boom'); S.shake = 14;
        const up = op.dir !== 'down';
        R.thrust = true;
        await S.anim(R, {
          dur: 2,
          start(R) { R.statuses.delete('flying'); },
          update(R, p, t, dt, S2, st) {
            R.alt = up ? Math.pow(p, 2.2) * 700 : Math.pow(1 - p, 2) * 700;
            R.dx = Math.sin(t * 50) * 2;
            if (Math.random() < 0.5) S2.particle({ kind: 'smoke', x: R.cx + rand(-20, 20), y: R.y - R.alt + 20, vx: rand(-60, 60), vy: 60, max: 1.2, size: rand(12, 22) });
          },
          end(R) { R.thrust = false; R.alt = up ? 700 : 0; if (up) R.gone = true; },
        });
        if (!up) { S.shake = 10; Sfx.play('thud'); }
        return;
      }
    }
  }

  // fill {refs} for plain-text output
  function fill(text, ans) {
    return renderTokens(parseTemplate(text), ans, (v) => v, (b) => '____');
  }

  // Render tokens, fixing "a" → "an" before vowel-sounding answers.
  function renderTokens(tokens, ans, wrapFilled, wrapBlank, wrapText) {
    wrapText = wrapText || ((s) => s);
    let out = '';
    for (let i = 0; i < tokens.length; i++) {
      const tk = tokens[i];
      if (tk.t === 'text') {
        let v = tk.v;
        const nx = tokens[i + 1];
        const nextWord = nx && nx.t !== 'text' ? ans[nx.key] : null;
        if (nextWord && /\b([aA]) $/.test(v) && /^[aeiou]/i.test(nextWord.trim()) && !/^(uni|use|one|eu)/i.test(nextWord.trim())) v = v.replace(/\b([aA]) $/, '$1n ');
        out += wrapText(v);
      } else {
        const val = ans[tk.key];
        out += val != null ? wrapFilled(val, tk) : wrapBlank(tk);
      }
    }
    return out;
  }

  window.Director = { parseTemplate, compileCustom, StepRunner, runOp, renderTokens, fill, normType };
})();
