// verbs.js — what happens when a word lands on an actor.
//   VERBS:   actions ("explode", "dance", "eat")
//   ADJS:    lasting changes ("purple", "giant", "angry", "stinky")
//   Effects: how lasting statuses look every frame (flames, ice, Zzz, rain cloud…)
(function () {
  const { W, H, G } = Places;
  const S = Sk;
  const PI = Math.PI;
  const { lerp, rand, pick } = Util;
  const bump = (p) => Math.sin(PI * Math.min(1, Math.max(0, p)));
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const easeIn = (p) => p * p * p;
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const every = (st, key, sec, t) => { st[key] = st[key] || 0; if (t >= st[key]) { st[key] = t + sec; return true; } return false; };

  function addStatus(A, name, dur) {
    A.statuses.add(name);
    A.timers = A.timers || {};
    if (dur) A.timers[name] = performance.now() + dur * 1000; else delete A.timers[name];
  }
  const ARMS_UP = { la: -2.6, ra: 2.6, le: 0, re: 0 };

  // ------------------------------------------------------------------ VERBS
  const VERBS = {
    explode: {
      dur: 1.5, sfx: 'boom',
      aliases: ['blow up', 'blew up', 'blow', 'burst', 'kaboom', 'boom', 'detonate', 'combust', 'pop', 'erupt', 'implode', 'go boom', 'nuke', 'bang', 'shatter', 'kablam', 'self-destruct', 'self destruct', 'go kaboom', 'go off', 'crash', 'break'],
      start(A, S2, st) {
        S2.flash = 1; S2.shake = 24; S2.debris(A, 32);
        for (let i = 0; i < 14; i++) { const a = rand(0, PI * 2); S2.particle({ kind: 'smoke', x: A.cx, y: A.cy, vx: Math.cos(a) * rand(80, 260), vy: Math.sin(a) * rand(80, 200), max: rand(0.7, 1.3), size: rand(16, 34) }); }
        for (let i = 0; i < 10; i++) S2.particle({ kind: 'flame', x: A.cx + rand(-30, 30), y: A.cy + rand(-30, 30), vx: rand(-200, 200), vy: rand(-300, -60), max: rand(0.4, 0.8), size: rand(12, 22) });
        S2.burst(pick(['KA-BOOM!', 'BOOM!', 'KABLAM!', 'BLAMMO!']), A.cx, Math.max(100, Math.min(260, A.top)));
        st.tough = A.isPerson || A.def.kind === 'animal' || A.def.kind === 'creature';
        if (st.tough) { A.statuses.add('singed'); A.color = A.isPerson ? '#9a9a9a' : '#7a7a7a'; addStatus(A, 'dizzy', 3); }
        else A.gone = true;
      },
      update(A, p, t, dt, S2, st) { if (st.tough) { A.dy = -bump(p) * 120; A.rot = easeOut(p) * PI * 2; A.expr = 'surprised'; } },
    },
    jump: {
      dur: 1.6, sfx: 'boing',
      aliases: ['hop', 'leap', 'bounce around', 'spring', 'pounce', 'jump around', 'jumping jack', 'trampoline', 'skip'],
      update(A, p) {
        const k = (p * 3) % 1;
        A.dy = -bump(k) * 90;
        if (k < 0.12 || k > 0.88) { A.sy = 0.8; A.sx = 1.15; }
        if (A.isPerson) A.pose = k > 0.15 && k < 0.85 ? Object.assign({ ll: -0.5, rl: 0.5, lk: 0.6, rk: 0.6 }, ARMS_UP) : null;
        A.expr = 'happy';
      },
    },
    dance: {
      dur: 2.6, sfx: 'music',
      aliases: ['boogie', 'groove', 'twerk', 'disco', 'shimmy', 'tango', 'waltz', 'breakdance', 'moonwalk', 'floss', 'cha cha', 'salsa', 'jiggle', 'shake it', 'party', 'ballet', 'dab', 'conga', 'do the macarena', 'macarena', 'hula', 'tap dance', 'do the worm'],
      update(A, p, t, dt, S2, st) {
        A.rot = Math.sin(t * 7) * 0.22;
        A.dx = Math.sin(t * 3.5) * 26;
        A.dy = -Math.abs(Math.sin(t * 7)) * 14;
        A.expr = 'happy';
        if (A.isPerson) A.pose = { la: -2.2 + Math.sin(t * 7) * 0.8, ra: 2.2 + Math.sin(t * 7) * 0.8, le: 0.4, re: -0.4, ll: -0.2 + Math.max(0, Math.sin(t * 7)) * 0.9, rl: 0.2 - Math.max(0, -Math.sin(t * 7)) * 0.9, lk: 0.4, rk: 0.4 };
        if (every(st, 'n', 0.3, t)) S2.particle({ kind: 'note', text: pick(['♪', '♫', '♬']), x: A.cx + rand(-30, 30), y: A.top, vy: -60, vx: rand(-30, 30), max: 1.2, size: 30 });
      },
    },
    spin: {
      dur: 1.5, sfx: 'whoosh',
      aliases: ['twirl', 'rotate', 'whirl', 'pirouette', 'turn around', 'spin around', 'tornado', 'cartwheel', 'roll', 'roll around', 'somersault', 'tumble', 'barrel roll'],
      update(A, p) { A.rot = easeInOut(p) * PI * 4; A.dy = -bump(p) * 30; A.expr = 'dizzy'; if (A.isPerson) A.pose = ARMS_UP; },
      end(A) { addStatus(A, 'dizzy', 2); },
    },
    fly: {
      dur: 2, sfx: 'up',
      aliases: ['soar', 'take off', 'blast off', 'flap', 'hover', 'glide', 'levitate', 'fly away', 'launch', 'go up', 'rise', 'zoom off'],
      start(A, S2, st) { st.a0 = A.alt; st.a1 = A.def.sky ? A.alt + 60 : 190; A.statuses.add('flying'); },
      update(A, p, t, dt, S2, st) {
        A.alt = lerp(st.a0, st.a1, easeInOut(p));
        A.dx = Math.sin(p * PI * 2) * 40; A.rot = Math.sin(t * 3) * 0.15;
        A.expr = 'happy';
        if (every(st, 'w', 0.12, t)) S2.particle({ kind: 'dust', x: A.cx + rand(-20, 20), y: A.y - A.alt + 10, vy: 80, max: 0.6, size: 6 });
      },
    },
    fall: {
      dur: 1.8, sfx: 'down',
      aliases: ['fall down', 'fall over', 'trip', 'tumble down', 'slip', 'crash down', 'drop', 'plummet', 'topple', 'fall off', 'land', 'sit', 'sit down', 'lie down', 'flop', 'collapse', 'wipe out'],
      start(A, S2, st) { st.a0 = A.alt; st.sky = A.alt > 20 && !A.def.sky; A.statuses.delete('flying'); },
      update(A, p, t, dt, S2, st) {
        if (st.sky) {
          const q = Math.min(1, p / 0.55);
          A.alt = st.a0 * (1 - easeIn(q)); A.expr = 'scream'; A.rot = q * 0.6;
          if (q >= 1 && !st.thud) { st.thud = true; S2.shake = 12; Sfx.play('thud'); S2.text(A.cx, A.y - 20, 'THUD!', { size: 38 }); for (let i = 0; i < 8; i++) S2.particle({ kind: 'dust', x: A.cx + rand(-40, 40), y: G - 5, vx: rand(-80, 80), vy: rand(-60, -10), max: 0.8, size: 10 }); }
          if (q >= 1) { A.rot = 0; A.sy = 1 - bump((p - 0.55) / 0.45) * 0.4; A.expr = 'dizzy'; }
        } else {
          A.pivot = 'bottom';
          const tip = p < 0.25 ? easeIn(p / 0.25) : p < 0.75 ? 1 : 1 - easeInOut((p - 0.75) / 0.25);
          A.rot = tip * (PI / 2) * A.dir; A.expr = p < 0.25 ? 'surprised' : 'dizzy';
          if (p > 0.25 && !st.thud) { st.thud = true; S2.shake = 8; Sfx.play('thud'); S2.text(A.cx + A.dir * 60, G - 40, pick(['THUD!', 'OOF!', 'BONK!']), { size: 34 }); }
        }
      },
      end(A) { A.alt = A.def.sky ? A.alt : 0; addStatus(A, 'dizzy', 2.5); },
    },
    melt: {
      dur: 2.2, sfx: 'sizzle',
      aliases: ['dissolve', 'liquefy', 'turn to goo', 'drip', 'ooze', 'goo', 'puddle', 'turn into a puddle', 'deflate', 'squish', 'splat'],
      update(A, p, t, dt, S2, st) {
        A.sy = 1 - easeIn(p) * 0.82; A.sx = 1 + easeIn(p) * 0.8; A.expr = 'worried';
        if (every(st, 'd', 0.12, t)) S2.particle({ kind: 'drop', x: A.cx + rand(-A.w / 2, A.w / 2), y: A.cy, vy: 60, g: 300, max: 0.6, size: 6, color: A.color || A.def.fill });
      },
      end(A) { A.statuses.add('melted'); },
    },
    grow: {
      dur: 1.3, sfx: 'up',
      aliases: ['get bigger', 'expand', 'inflate', 'swell', 'puff up', 'grow up', 'get huge', 'balloon', 'enlarge', 'supersize', 'level up', 'mutate', 'evolve', 'hulk out'],
      start(A) { A.targetScale = Math.min(3.2, A.targetScale * 1.7); },
      update(A, p) { A.sx = 1 + Math.sin(p * PI * 4) * 0.08 * (1 - p); A.sy = 1 - Math.sin(p * PI * 4) * 0.08 * (1 - p); A.expr = 'surprised'; },
    },
    shrink: {
      dur: 1.3, sfx: 'down',
      aliases: ['get smaller', 'get tiny', 'shrivel', 'contract', 'shrink down', 'get small', 'minimize'],
      start(A) { A.targetScale = Math.max(0.22, A.targetScale * 0.5); },
      update(A) { A.expr = 'surprised'; },
      end(A, S2) { S2.text(A.cx, A.top - 10, 'squeak!', { size: 22 }); Sfx.play('squeak'); },
    },
    run: {
      dur: 2.6, sfx: 'whoosh',
      aliases: ['sprint', 'dash', 'race', 'jog', 'zoom', 'flee', 'run away', 'scurry', 'escape', 'rush', 'hurry', 'gallop', 'speed', 'run around', 'drive', 'ride', 'skate', 'ski', 'charge', 'stampede', 'scramble', 'bolt', 'skedaddle'],
      start(A, S2, st) { st.x0 = A.x; },
      update(A, p, t, dt, S2, st) {
        const right = W + A.w;
        A.moving = true;
        if (p < 0.5) { A.dir = 1; A.x = lerp(st.x0, right, easeIn(p / 0.5)); }
        else { A.dir = 1; A.x = lerp(-A.w, st.x0, easeOut((p - 0.5) / 0.5)); }
        if (!A.isPerson && !A.def.legs) A.dy = -Math.abs(Math.sin(t * 16)) * 14;
        A.rot = 0.12; A.expr = 'happy';
        if (every(st, 'd', 0.06, t)) S2.particle({ kind: 'dust', x: A.x - A.w / 2, y: G - 6, vx: -60, vy: -20, max: 0.5, size: rand(5, 11) });
      },
      end(A, S2, st) { A.x = st.x0; },
    },
    walk: {
      dur: 2.4,
      aliases: ['stroll', 'wander', 'march', 'tiptoe', 'stomp', 'strut', 'waddle', 'sneak', 'creep', 'pace', 'parade', 'shuffle', 'limp', 'crawl', 'go', 'travel', 'explore', 'hike', 'climb'],
      start(A, S2, st) { st.x0 = A.x; },
      update(A, p, t) {
        A.moving = true;
        const off = Math.sin(p * PI * 2) * 140;
        A.dir = Math.cos(p * PI * 2) >= 0 ? 1 : -1;
        A.dx = off;
        if (!A.isPerson && !A.def.legs) A.dy = -Math.abs(Math.sin(t * 9)) * 10;
      },
    },
    sleep: {
      dur: 2.2,
      aliases: ['nap', 'snooze', 'doze', 'fall asleep', 'snore', 'rest', 'hibernate', 'take a nap', 'pass out', 'dream', 'go to bed', 'go to sleep', 'relax', 'chill', 'yawn'],
      start(A, S2) { A.statuses.add('asleep'); S2.text(A.cx, A.top - 20, pick(['*yawn*', 'so sleepy…', 'night night']), { size: 24 }); },
      update(A, p) { A.expr = 'sleep'; },
    },
    burn: {
      dur: 2.4, sfx: 'sizzle',
      aliases: ['catch fire', 'catch on fire', 'burst into flames', 'go up in flames', 'ignite', 'flame', 'blaze', 'set on fire', 'light on fire', 'scorch', 'sizzle', 'smoke', 'roast', 'toast', 'fry', 'cook', 'heat up', 'bake', 'grill', 'char', 'flambe', 'breathe fire', 'spit fire'],
      start(A, S2) { A.statuses.delete('frozen'); A.statuses.add('burning'); S2.text(A.cx, A.top - 20, pick(['HOT HOT HOT!', 'YOWCH!', 'FWOOSH!']), { size: 32, color: '#d9524a' }); },
      update(A, p, t) {
        if (A.isPerson || A.def.legs || A.def.kind === 'animal') { A.moving = true; A.dx = Math.sin(t * 5) * 90; A.dir = Math.cos(t * 5) > 0 ? 1 : -1; A.dy = -Math.abs(Math.sin(t * 14)) * 10; }
        else { A.dx = Math.sin(t * 40) * 3; }
        A.expr = 'scream';
        if (A.isPerson) A.pose = ARMS_UP;
      },
    },
    freeze: {
      dur: 1.4, sfx: 'freeze',
      aliases: ['turn to ice', 'turn into ice', 'freeze solid', 'chill out', 'ice', 'freeze up', 'get frozen', 'turn to stone', 'stop', 'pause', 'statue', 'petrify'],
      start(A, S2) {
        A.statuses.delete('burning');
        for (let i = 0; i < 16; i++) S2.particle({ kind: 'snow', x: A.cx + rand(-A.w, A.w), y: A.cy + rand(-A.h, A.h) * 0.6, vx: rand(-30, 30), vy: rand(-30, 30), max: 1, size: 12 });
        S2.text(A.cx, A.top - 30, 'brrrr…', { size: 30, color: '#4c9be8' });
      },
      update(A, p) { A.dx = Math.sin(p * 80) * 4 * (1 - p); A.expr = 'surprised'; },
      end(A) { A.statuses.add('frozen'); },
    },
    shake: {
      dur: 1.3, sfx: 'zap',
      aliases: ['shiver', 'tremble', 'vibrate', 'quiver', 'rattle', 'wobble', 'wiggle', 'jiggle', 'twitch', 'wriggle', 'squirm', 'shake it off', 'quake', 'rumble', 'buzz', 'glitch'],
      update(A, p, t) { A.dx = Math.sin(t * 70) * 7; A.rot = Math.sin(t * 50) * 0.06; A.sx = 1 + Math.sin(t * 30) * 0.06; A.sy = 1 - Math.sin(t * 30) * 0.06; A.expr = 'worried'; },
    },
    laugh: {
      dur: 2.2, sfx: 'laugh',
      aliases: ['giggle', 'chuckle', 'cackle', 'snicker', 'chortle', 'lol', 'guffaw', 'smile', 'grin', 'crack up', 'lmao', 'haha'],
      update(A, p, t, dt, S2, st) {
        A.dy = -Math.abs(Math.sin(t * 16)) * 10; A.rot = Math.sin(t * 8) * 0.08; A.expr = 'laugh';
        if (A.isPerson) A.pose = { la: 0.9, ra: -0.9, le: -1.6, re: 1.6 };
        if (every(st, 'h', 0.4, t)) S2.text(A.cx + rand(-60, 60), A.top - rand(0, 30), pick(['HA!', 'HA HA!', 'hee hee', 'HAHA', 'ho ho']), { size: 26 });
      },
    },
    cry: {
      dur: 2.4, sfx: 'sad',
      aliases: ['weep', 'sob', 'wail', 'bawl', 'whimper', 'pout', 'sulk', 'boohoo', 'tear up', 'blubber', 'mope', 'whine'],
      update(A, p, t, dt, S2, st) {
        A.expr = 'cry'; A.dy = Math.sin(t * 20) * 1.5;
        if (A.isPerson) A.pose = { la: -0.2, ra: 0.2, le: -2.4, re: 2.4 };
        const [fx, fy, fs] = A.def.face;
        const ex = A.cx + fx * A.scale * A.dir, ey = A.y - A.alt + fy * A.scale;
        if (every(st, 't', 0.08, t)) { const s = Math.random() < 0.5 ? -1 : 1; S2.particle({ kind: 'drop', x: ex + s * fs * 0.35 * A.scale, y: ey, vx: s * rand(60, 140), vy: rand(-140, -60), g: 600, max: 0.8, size: 6 }); }
        if (every(st, 'w', 0.9, t)) S2.text(A.cx, A.top - 20, pick(['WAAAAH', 'boo hoo', 'sniff…']), { size: 26, color: '#4c7fbf' });
      },
    },
    sing: {
      dur: 2.6, sfx: 'music',
      aliases: ['hum', 'rap', 'yodel', 'whistle', 'chant', 'serenade', 'beatbox', 'karaoke', 'perform', 'croon', 'opera', 'play music', 'play guitar', 'play the guitar', 'play the drums', 'play piano', 'make music'],
      update(A, p, t, dt, S2, st) {
        A.expr = 'sing'; A.rot = Math.sin(t * 3) * 0.1;
        if (A.isPerson) A.pose = { la: -1.6, ra: 1.6, le: -0.3, re: 0.3 };
        if (every(st, 'n', 0.25, t)) S2.particle({ kind: 'note', text: pick(['♪', '♫', '♬']), x: A.cx + A.dir * A.w * 0.4, y: A.top + 10, vx: A.dir * rand(40, 90), vy: rand(-60, -20), max: 1.4, size: rand(24, 36) });
      },
    },
    scream: {
      dur: 1.8, sfx: 'hey',
      aliases: ['yell', 'shout', 'shriek', 'holler', 'screech', 'roar', 'howl', 'bark', 'meow', 'moo', 'growl', 'squeal', 'squawk', 'panic', 'freak out', 'scream and shout', 'oink', 'neigh', 'quack', 'honk', 'hiss', 'boo', 'scare'],
      start(A, S2) { S2.shake = 6; S2.text(A.cx, Math.max(60, A.top - 40), A.def.kind === 'animal' ? pick(['ROAAAR!', 'RAAAWR!', 'AWOOOO!']) : pick(['AAAAAAH!', 'EEEEEK!', 'YAAAAH!']), { size: 46, color: '#d9524a', max: 1.6 }); },
      update(A, p, t) { A.expr = 'scream'; A.dx = Math.sin(t * 60) * 3; A.sy = 1 + bump(p) * 0.15; if (A.isPerson) A.pose = ARMS_UP; },
    },
    sneeze: {
      dur: 1.8, sfx: 'sneeze',
      aliases: ['achoo', 'cough', 'hiccup', 'burp', 'belch', 'sniffle', 'gag', 'choke', 'spit', 'puke', 'barf', 'vomit', 'throw up', 'hurl'],
      update(A, p, t, dt, S2, st) {
        if (p < 0.55) { A.rot = -easeIn(p / 0.55) * 0.3 * A.dir; A.expr = 'worried'; if (every(st, 'a', 0.35, t)) S2.text(A.cx - 20, A.top - 10, 'ah…', { size: 22 }); }
        else {
          if (!st.done) { st.done = true; S2.shake = 10; S2.text(A.cx + A.dir * 80, A.top, st.o.label && /burp|belch/.test(st.o.label) ? 'BUUURP!' : 'ACHOO!', { size: 44 }); for (let i = 0; i < 18; i++) S2.particle({ kind: 'drop', x: A.cx + A.dir * A.w * 0.4, y: A.top + A.h * 0.2, vx: A.dir * rand(150, 420), vy: rand(-120, 60), g: 400, max: 0.8, size: 4, color: '#9ad6a0' }); }
          const q = (p - 0.55) / 0.45; A.rot = (0.35 - q * 0.35) * A.dir; A.dx = -A.dir * bump(q) * 30; A.expr = 'surprised';
        }
      },
    },
    wave: {
      dur: 1.8, sfx: 'hey',
      aliases: ['say hi', 'say hello', 'greet', 'wave hello', 'salute', 'high five', 'point', 'clap', 'cheer', 'celebrate', 'bow', 'nod', 'wink', 'thumbs up'],
      start(A, S2) { S2.bubble(A, pick(['Hi there!', 'Hello!', 'Hey!!', 'Yoo-hoo!', 'Howdy!']), 1.8); },
      update(A, p, t) { A.expr = 'happy'; if (A.isPerson) A.pose = { ra: 2.5 + Math.sin(t * 12) * 0.4, re: -0.5 }; else A.rot = Math.sin(t * 8) * 0.15; },
    },
    swim: {
      dur: 2.6, sfx: 'splash',
      aliases: ['paddle', 'dive', 'splash', 'snorkel', 'surf', 'float on water', 'go swimming', 'bathe', 'take a bath', 'shower', 'scuba dive', 'backstroke', 'doggy paddle'],
      start(A, S2) { A.statuses.delete('burning'); },
      update(A, p, t, dt, S2, st) {
        A.statuses.add('swimming');
        A.dx = Math.sin(p * PI * 2) * 100; A.dir = Math.cos(p * PI * 2) >= 0 ? 1 : -1; A.dy = Math.sin(t * 6) * 5 + 20; A.rot = 0.1 * A.dir;
        A.expr = 'happy';
        if (A.isPerson) A.pose = { la: Math.sin(t * 8) * 2.5, ra: Math.cos(t * 8) * 2.5, ll: -0.3, rl: 0.3 };
        if (every(st, 'b', 0.15, t)) S2.particle({ kind: 'bubble', x: A.cx + rand(-30, 30), y: A.y - 20, vy: -60, max: 1, size: rand(3, 8) });
      },
      end(A) { A.statuses.delete('swimming'); A.statuses.add('wet'); },
    },
    float: {
      dur: 2.4, sfx: 'magic',
      aliases: ['drift', 'bob', 'hover around', 'float away', 'levitate', 'sparkle', 'glow', 'shine', 'shimmer', 'twinkle', 'glitter'],
      start(A, S2, st) { st.a0 = A.alt; },
      update(A, p, t, dt, S2, st) {
        A.alt = st.a0 + bump(p) * 70; A.rot = Math.sin(t * 2) * 0.1; A.expr = 'happy';
        if (every(st, 's', 0.1, t)) S2.particle({ kind: 'spark', x: A.cx + rand(-A.w / 2, A.w / 2), y: A.cy + rand(-A.h / 2, A.h / 2), vy: -30, max: 0.8, size: rand(5, 10) });
      },
      end(A, S2, st) { A.alt = st.a0; addStatus(A, 'sparkly', 3); },
    },
    bounce: {
      dur: 1.8, sfx: 'boing',
      aliases: ['boing', 'bound', 'pogo', 'ricochet', 'bob up and down', 'bop', 'boop', 'squash', 'squeeze', 'stretch'],
      update(A, p, t) {
        const k = (p * 4) % 1; A.dy = -bump(k) * 70;
        const sq = k < 0.1 || k > 0.9; A.sy = sq ? 0.65 : 1.15; A.sx = sq ? 1.3 : 0.9; A.expr = 'happy';
      },
    },
    flip: {
      dur: 1.3, sfx: 'whoosh',
      aliases: ['backflip', 'front flip', 'frontflip', 'flip out', 'do a flip', 'do a backflip', 'handstand', 'kickflip', 'parkour', 'do tricks', 'gymnastics', 'stunt'],
      update(A, p) { A.dy = -bump(p) * 140; A.rot = -easeInOut(p) * PI * 2 * A.dir; A.expr = 'happy'; if (A.isPerson) A.pose = { ll: -0.9, rl: -0.6, lk: 1.4, rk: 1.4, la: 1.4, ra: 1.8 }; },
    },
    vanish: {
      dur: 0.8,
      aliases: ['disappear', 'go away', 'leave', 'poof', 'evaporate', 'fade away', 'fade', 'go invisible', 'turn invisible', 'hide', 'escape', 'exit', 'abracadabra', 'die', 'perish', 'get lost', 'go home'],
      start(A, S2) { S2.poof(A.cx, A.cy, 18); S2.text(A.cx, A.cy, 'POOF!', { size: 40 }); A.gone = true; },
    },
    teleport: {
      dur: 1.4, sfx: 'magic',
      aliases: ['warp', 'beam up', 'time travel', 'blink', 'zap', 'transport', 'portal', 'beam me up', 'apparate', 'pop over'],
      start(A, S2, st) { st.x1 = A.x < W / 2 ? rand(W * 0.6, W - 120) : rand(120, W * 0.4); S2.poof(A.cx, A.cy, 12); st.gone = true; A.alpha = 0; },
      update(A, p, t, dt, S2, st) {
        if (p > 0.5 && st.gone) { st.gone = false; A.x = st.x1; S2.poof(A.x, A.cy, 12); S2.text(A.x, A.top - 20, 'ZAP!', { size: 36, color: '#8a5fd0' }); A.alpha = 1; }
        if (st.gone) A.alpha = 0;
        A.expr = 'surprised';
      },
    },
    clone: {
      dur: 1.2, sfx: 'magic',
      aliases: ['multiply', 'duplicate', 'copy', 'split', 'clone itself', 'make copies', 'reproduce', 'have babies', 'divide'],
      start(A, S2) {
        const n = S2.actors.filter((a) => a.id.startsWith(A.id + '~')).length;
        if (n < 4) {
          [-1, 1].forEach((side, i) => {
            const x = Math.max(60, Math.min(W - 60, A.x + side * (A.w * 0.9 + 30)));
            const c = S2.add(A.id + '~' + (n + i), A.def.key, { x, word: A.word, scale: A.targetScale * 0.8, alt: A.alt });
            c.color = A.color; c.statuses = new Set(A.statuses); c.acc = new Set(A.acc); c.alive = A.alive; c.dir = side; c.mood = A.mood;
            S2.poof(x, A.cy, 8);
          });
        }
        S2.text(A.cx, A.top - 20, 'Double trouble!', { size: 28 });
      },
      update(A, p) { A.sx = 1 + bump(p) * 0.3; A.expr = 'surprised'; },
    },
    toot: {
      dur: 1.6, sfx: 'fart',
      aliases: ['fart', 'poot', 'pass gas', 'break wind', 'tooted', 'fluff', 'stink', 'poop', 'pee', 'smell'],
      start(A, S2) {
        for (let i = 0; i < 10; i++) S2.particle({ kind: 'smoke', x: A.cx - A.dir * A.w * 0.4, y: A.y - A.alt - A.h * 0.3, vx: -A.dir * rand(30, 120), vy: rand(-40, 10), max: rand(1, 1.6), size: rand(10, 20), color: 'rgba(170,210,120,.8)' });
        S2.text(A.cx - A.dir * 90, A.y - A.alt - A.h * 0.5, pick(['PFFFT!', 'TOOT!', 'BRAAAP!']), { size: 36, color: '#5f9a48' });
        addStatus(A, 'stinky', 3);
      },
      update(A, p) { A.expr = p < 0.3 ? 'surprised' : 'blush'; A.dy = -bump(p * 2) * 20; },
    },
    eat: {
      aliases: ['chomp', 'munch', 'gobble', 'devour', 'nibble', 'swallow', 'bite', 'lick', 'slurp', 'gulp', 'chew', 'eat up', 'gobble up', 'consume', 'snack', 'feast', 'drink', 'taste', 'nom', 'inhale', 'vacuum'],
      async run(A, S2, o) {
        const T = o.target;
        if (T && !T.gone && T !== A) {
          const side = T.x >= A.x ? 1 : -1;
          await S2.walkTo(A, T.x - side * (A.w / 2 + T.w * 0.2));
          A.dir = side;
          await S2.anim(A, {
            dur: 1.6, sfx: 'chomp',
            start(A, S3, st) { st.s0 = T.targetScale; },
            update(A, p, t, dt, S3, st) {
              A.expr = Math.sin(t * 18) > 0 ? 'scream' : 'happy'; A.sx = 1 + Math.sin(t * 18) * 0.06;
              T.targetScale = st.s0 * (1 - p); T.scale = T.targetScale;
              if (every(st, 'c', 0.3, t)) { S3.text(A.cx + side * 40, A.top - 10, pick(['CHOMP!', 'NOM!', 'MUNCH!', 'GULP!']), { size: 30 }); Sfx.play('chomp'); for (let i = 0; i < 4; i++) S3.particle({ kind: 'debris', x: T.cx, y: T.cy, vx: rand(-120, 120), vy: rand(-200, -50), g: 700, max: 0.8, size: 5, color: T.color || T.def.fill, ground: true }); }
            },
            end(A, S3, st) { T.gone = true; T.targetScale = T.scale = st.s0; A.targetScale = Math.min(3, A.targetScale * 1.15); S3.text(A.cx, A.top - 30, '*BURP*', { size: 30 }); },
          });
          return;
        }
        await S2.anim(A, {
          dur: 1.8, sfx: 'chomp',
          update(A, p, t, dt, S3, st) {
            A.expr = Math.sin(t * 18) > 0 ? 'scream' : 'happy'; A.sy = 1 + Math.sin(t * 18) * 0.05;
            if (every(st, 'c', 0.4, t)) { S3.text(A.cx + A.dir * 50, A.top, pick(['NOM NOM', 'CHOMP', 'MUNCH']), { size: 28 }); Sfx.play('chomp'); }
          },
        });
      },
    },
    kick: {
      aliases: ['punch', 'hit', 'smack', 'whack', 'bonk', 'bop on the head', 'slap', 'karate chop', 'chop', 'fight', 'attack', 'tackle', 'push', 'shove', 'throw', 'toss', 'launch', 'fling', 'yeet', 'bump', 'headbutt', 'body slam', 'wrestle', 'poke', 'tickle', 'boot', 'smash', 'squash', 'stomp on', 'karate', 'kung fu', 'box', 'spank', 'bump into'],
      async run(A, S2, o) {
        const T = o.target;
        const tickle = o.label && /tickl|poke/.test(o.label);
        if (T && !T.gone && T !== A) {
          const side = T.x >= A.x ? 1 : -1;
          await S2.walkTo(A, T.x - side * (A.w / 2 + T.w / 2 + 6), 300);
          A.dir = side;
          await S2.anim(A, {
            dur: 0.5,
            update(A, p) { A.dx = side * bump(p) * 20; if (A.isPerson) A.pose = { rl: 1.4 * bump(p), ra: 1.4 }; A.expr = 'angry'; },
            end(A, S3) { S3.shake = 14; Sfx.play('thud'); S3.burst(tickle ? 'TEE HEE!' : pick(['POW!', 'BAM!', 'WHAM!', 'BONK!', 'KAPOW!']), (A.cx + T.cx) / 2, Math.max(90, T.top), { size: 48 }); },
          });
          if (tickle) { await S2.act(T, 'laugh'); return; }
          const x0 = T.x, a0 = T.alt;
          await S2.anim(T, {
            dur: 1.6, sfx: 'whoosh',
            update(T, p) { T.x = x0 + side * p * 900; T.alt = a0 + Math.sin(p * PI * 0.9) * 360; T.rot = p * PI * 6; T.expr = 'dizzy'; },
            end(T, S3) { T.gone = true; T.x = x0; T.alt = a0; S3.text(side > 0 ? W - 80 : 80, 120, '✦ ding ✦', { size: 26 }); Sfx.play('ding'); },
          });
          return;
        }
        await S2.anim(A, {
          dur: 1.4,
          update(A, p, t, dt, S3, st) {
            A.expr = 'angry'; A.dx = Math.sin(t * 10) * 10;
            if (A.isPerson) A.pose = p < 0.5 ? { rl: 1.6, ra: -2, la: 1.2 } : { la: 1.6, ra: -1.4, ll: -1.5 };
            if (every(st, 'h', 0.5, t)) { S3.text(A.cx + A.dir * 70, A.top, pick(['HI-YAH!', 'WHAM!', 'POW!']), { size: 34 }); Sfx.play('thud'); }
          },
        });
      },
    },
    hug: {
      aliases: ['kiss', 'cuddle', 'snuggle', 'love', 'squeeze', 'embrace', 'smooch', 'befriend', 'marry', 'pet', 'high-five', 'adopt', 'make friends with', 'hold hands', 'hold', 'carry', 'protect', 'help', 'save', 'rescue', 'thank'],
      async run(A, S2, o) {
        const T = o.target;
        const spec = {
          dur: 1.8, sfx: 'magic',
          update(X, p, t, dt, S3, st) { X.expr = 'love'; X.sx = 1 + Math.sin(t * 8) * 0.04; if (X.isPerson) X.pose = { la: 1.3, ra: 1.5, le: 1.2, re: 1.0 }; if (every(st, 'h', 0.2, t)) S3.particle({ kind: 'heart', x: X.cx + rand(-30, 30), y: X.top, vy: -50, vx: rand(-20, 20), max: 1.2, size: rand(7, 12) }); },
        };
        if (T && !T.gone && T !== A) {
          const side = T.x >= A.x ? 1 : -1;
          await S2.walkTo(A, T.x - side * (A.w / 2 + T.w / 2 - 6));
          A.dir = side; T.dir = -side;
          await Promise.all([S2.anim(A, spec), S2.anim(T, Object.assign({}, spec, { sfx: null }))]);
        } else await S2.anim(A, spec);
        addStatus(A, 'love', 3);
      },
    },
    chase: {
      aliases: ['follow', 'hunt', 'pursue', 'track', 'run after', 'chase after', 'stalk', 'catch', 'tag', 'play tag', 'play with', 'race against', 'play'],
      async run(A, S2, o) {
        const T = o.target;
        if (T && !T.gone && T !== A) {
          A.dir = 1; T.dir = 1;
          const ax = A.x, tx = T.x;
          const loop = (X, x0, lag) => ({
            dur: 2.8, sfx: lag ? null : 'whoosh',
            update(X, p, t, dt, S3, st) {
              const q = Math.max(0, Math.min(1, p * 1.1 - lag));
              X.moving = true; X.dir = 1;
              X.x = q < 0.5 ? lerp(x0, W + 150, easeIn(q * 2)) : lerp(-150, x0, easeOut((q - 0.5) * 2));
              X.expr = lag ? 'angry' : 'scream';
              if (!X.isPerson && !X.def.legs) X.dy = -Math.abs(Math.sin(t * 16)) * 14;
            },
            end(X) { X.x = x0; },
          });
          await Promise.all([S2.anim(T, loop(T, tx, 0)), S2.anim(A, loop(A, ax, 0.1))]);
          return;
        }
        return S2.act(A, 'run', o);
      },
    },
    faint: {
      dur: 2.4, sfx: 'down',
      aliases: ['pass out', 'black out', 'keel over', 'play dead', 'drop dead', 'swoon', 'conk out', 'get knocked out'],
      update(A, p, t, dt, S2, st) {
        A.pivot = 'bottom';
        const tip = p < 0.2 ? easeIn(p / 0.2) : p < 0.8 ? 1 : 1 - easeInOut((p - 0.8) / 0.2);
        A.rot = -tip * (PI / 2) * A.dir; A.expr = p < 0.8 ? 'x' : 'dizzy';
        if (p > 0.2 && !st.t) { st.t = 1; Sfx.play('thud'); S2.text(A.cx, A.top - 20, '@#*!', { size: 30 }); }
      },
    },
    rain: {
      dur: 2.4, sfx: 'splash',
      aliases: ['storm', 'pour', 'snow', 'hail', 'thunder', 'lightning', 'make it rain', 'drizzle', 'flood', 'rain down'],
      start(A, S2, st) { st.snow = st.o.label && /snow|hail/.test(st.o.label); },
      update(A, p, t, dt, S2, st) {
        A.expr = 'worried';
        if (every(st, 'r', 0.03, t)) S2.particle({ kind: st.snow ? 'snow' : 'drop', x: A.cx + rand(-70, 70), y: A.top - 50, vy: 300, g: 200, max: 0.6, size: st.snow ? 12 : 5 });
      },
      end(A) { A.statuses.delete('burning'); A.statuses.add('wet'); },
    },
    talk: {
      dur: 2.2, sfx: 'hey',
      aliases: ['say', 'speak', 'chat', 'gossip', 'whisper', 'mumble', 'babble', 'argue', 'complain', 'brag', 'lecture', 'tell a joke', 'tell jokes', 'joke', 'gossip', 'ask', 'pray', 'rant', 'talk', 'blabber', 'flirt', 'sell'],
      start(A, S2, st) { S2.bubble(A, st.o.say || pick(['Blah blah blah…', 'And THEN…', 'Guess what?!', 'Yadda yadda…']), 2.2); },
      update(A, p, t) { A.expr = Math.sin(t * 14) > 0 ? 'surprised' : 'smile'; if (A.isPerson) A.pose = { ra: 1.6 + Math.sin(t * 5) * 0.4, re: -0.8 }; },
    },
    think: {
      dur: 2.2,
      aliases: ['wonder', 'ponder', 'study', 'read', 'learn', 'think hard', 'meditate', 'plan', 'imagine', 'calculate', 'do math', 'do homework', 'write', 'draw', 'paint'],
      start(A, S2) { S2.bubble(A, pick(['Hmmm…', '🤔 …', 'I wonder…', '2+2 = fish?']), 2.2); },
      update(A, p, t, dt, S2, st) { A.expr = 'meh'; if (A.isPerson) A.pose = { ra: -0.2, re: -2.6 }; if (every(st, 'q', 0.6, t)) S2.text(A.cx + rand(-30, 30), A.top - 20, '?', { size: 34 }); },
    },
    transform: {
      dur: 1.2, sfx: 'magic',
      aliases: ['change', 'morph', 'shapeshift', 'transform', 'turn into something', 'become', 'magic', 'cast a spell', 'do magic'],
      start(A, S2) { S2.poof(A.cx, A.cy, 16); for (let i = 0; i < 12; i++) S2.particle({ kind: 'spark', x: A.cx + rand(-60, 60), y: A.cy + rand(-60, 60), max: 1, size: 10 }); A.color = `hsl(${rand(0, 360)},70%,65%)`; },
      update(A, p) { A.rot = p * PI * 2; A.sx = 1 - bump(p) * 0.5; },
    },
    laser: {
      dur: 1.8, sfx: 'zap',
      aliases: ['shoot lasers', 'shoot laser', 'shoot', 'lasers', 'laser beam', 'zap everything', 'pew pew', 'blast', 'fire lasers', 'shoot fire', 'shoot webs', 'use the force', 'cast a fireball', 'shoot lightning'],
      update(A, p, t, dt, S2, st) {
        A.expr = 'angry';
        if (A.isPerson) A.pose = { ra: PI / 2, re: 0 };
        const [fx, fy] = A.def.face;
        const ex = A.cx + fx * A.scale * A.dir, ey = A.y - A.alt + A.dy + fy * A.scale;
        if (every(st, 'z', 0.12, t)) {
          Sfx.play('zap');
          for (let i = 0; i < 3; i++) S2.particle({ kind: 'text', text: '━', x: ex + A.dir * (30 + i * 40), y: ey + rand(-4, 4), vx: A.dir * 900, vy: 0, max: 0.5, size: 40, color: pick(['#e8463b', '#ff5aa8']), outline: 0, rot: 0 });
          S2.particle({ kind: 'spark', x: A.dir > 0 ? W - 10 : 10, y: ey + rand(-30, 30), max: 0.4, size: 14, color: '#f6913b' });
        }
        if (every(st, 'p', 0.6, t)) S2.text(A.cx, A.top - 20, 'PEW PEW!', { size: 30, color: '#e8463b' });
      },
    },
    // fallback for words we don't recognise: do a happy wiggle-hop and show the word
    _unknown: {
      dur: 2,
      start(A, S2, st) {
        const w = st.o.label || '???';
        S2.text(A.cx, Math.max(60, A.top - 34), '*' + w + '*', { size: 36, color: '#8a5fd0', max: 2, vy: -14 });
        for (let i = 0; i < 8; i++) S2.particle({ kind: 'spark', x: A.cx + rand(-A.w, A.w) * 0.6, y: A.cy + rand(-A.h, A.h) * 0.5, max: 1, size: rand(6, 10) });
        Sfx.play('boing');
      },
      update(A, p, t) {
        A.dy = -Math.abs(Math.sin(t * 9)) * 26; A.rot = Math.sin(t * 9) * 0.18; A.sx = 1 + Math.sin(t * 18) * 0.06;
        A.expr = 'silly';
        if (A.isPerson) A.pose = { la: -2 + Math.sin(t * 9), ra: 2 - Math.sin(t * 9), ll: -0.4, rl: 0.4 };
      },
    },
  };

  // ------------------------------------------------------------------ ADVERBS
  const ADVERBS = {
    fast: { speed: 1.7, aliases: ['quickly', 'quick', 'rapidly', 'speedily', 'super fast', 'swiftly', 'hastily'] },
    slow: { speed: 0.55, aliases: ['slowly', 'lazily', 'carefully', 'gently', 'in slow motion'] },
    loud: { speed: 1, loud: true, aliases: ['loudly', 'wildly', 'crazily', 'angrily', 'violently', 'dramatically', 'enthusiastically', 'like crazy'] },
  };

  // ------------------------------------------------------------------ ADJECTIVES
  const COLORS = {
    red: ['#e8463b', ['crimson', 'scarlet', 'ruby', 'cherry red', 'maroon']],
    orange: ['#f6913b', ['tangerine', 'peach', 'pumpkin']],
    yellow: ['#f6d743', ['golden yellow', 'lemon', 'blonde', 'mustard']],
    green: ['#5fbf4f', ['lime', 'emerald', 'olive', 'mint', 'neon green']],
    blue: ['#4c9be8', ['navy', 'sky blue', 'azure', 'teal', 'turquoise', 'cyan', 'aqua', 'cobalt', 'baby blue']],
    purple: ['#8a5fd0', ['violet', 'lavender', 'lilac', 'magenta', 'indigo', 'plum', 'mauve']],
    pink: ['#ff8ec0', ['hot pink', 'rose', 'fuchsia', 'salmon', 'bubblegum']],
    brown: ['#9a6a3a', ['chocolate', 'tan', 'beige', 'bronze', 'muddy', 'dirty', 'coffee']],
    black: ['#3b3f4a', ['dark', 'shadowy', 'ebony', 'midnight']],
    white: ['#fbfbf7', ['pale', 'snowy', 'ivory', 'pearly', 'clean']],
    gray: ['#9a9aa2', ['grey', 'silver', 'silvery', 'metal', 'metallic', 'steel']],
    gold: ['#e8b923', ['golden', 'gold-plated', 'shiny gold', 'rich', 'fancy', 'expensive', 'royal']],
  };

  const ADJS = {
    rainbow: { aliases: ['colorful', 'colourful', 'multicolored', 'psychedelic', 'tie-dye', 'tie dye', 'groovy'], apply(A) { A.statuses.add('rainbow'); } },
    big: { aliases: ['huge', 'giant', 'gigantic', 'enormous', 'massive', 'humongous', 'ginormous', 'large', 'colossal', 'mega', 'jumbo', 'titanic', 'monstrous', 'immense', 'bigger', 'biggest', 'super-sized', 'supersized', 'gargantuan', 'mighty', 'vast'], apply(A, S2) { A.targetScale = Math.min(3, A.targetScale * 1.6); Sfx.play('up'); } },
    tiny: { aliases: ['small', 'little', 'mini', 'teeny', 'teeny-tiny', 'itty-bitty', 'itty bitty', 'miniature', 'microscopic', 'baby', 'smol', 'petite', 'wee', 'pocket-sized', 'puny'], apply(A, S2) { A.targetScale = Math.max(0.25, A.targetScale * 0.55); Sfx.play('squeak'); } },
    tall: { aliases: ['long', 'lanky', 'stretchy', 'stretched', 'skinny', 'thin', 'noodly'], apply(A) { A.sy0 = 1.55; A.sx0 = 0.8; } },
    wide: { aliases: ['fat', 'round', 'chubby', 'chonky', 'thicc', 'plump', 'pudgy', 'tubby', 'squat', 'stout', 'chunky', 'bloated', 'puffy', 'stuffed'], apply(A) { A.sx0 = 1.5; A.sy0 = 0.85; } },
    flat: { aliases: ['squished', 'squashed', 'flattened', 'pancake', 'two-dimensional', 'paper-thin'], apply(A) { A.sy0 = 0.35; A.sx0 = 1.4; } },
    happy: { aliases: ['joyful', 'cheerful', 'glad', 'excited', 'jolly', 'merry', 'delighted', 'ecstatic', 'thrilled', 'giddy', 'overjoyed', 'pleased', 'proud', 'smiley', 'bubbly', 'peppy', 'perky', 'good', 'nice', 'friendly', 'kind', 'awesome', 'great', 'amazing', 'wonderful', 'fantastic'], apply(A) { A.mood = 'happy'; A.statuses.add('happy'); } },
    sad: { aliases: ['unhappy', 'gloomy', 'depressed', 'miserable', 'down', 'sorrowful', 'grumpy', 'moody', 'lonely', 'heartbroken', 'upset', 'bored', 'boring', 'tired of everything', 'emo'], apply(A) { A.mood = 'sad'; A.statuses.add('sad'); } },
    angry: { aliases: ['mad', 'furious', 'cranky', 'annoyed', 'grouchy', 'enraged', 'livid', 'fuming', 'irritated', 'mean', 'rude', 'evil', 'wicked', 'nasty', 'villainous', 'bad', 'naughty', 'fierce', 'ferocious', 'savage', 'rabid', 'hangry'], apply(A) { A.mood = 'angry'; A.statuses.add('angry'); } },
    scared: { aliases: ['afraid', 'frightened', 'terrified', 'nervous', 'anxious', 'worried', 'spooked', 'panicked', 'shy', 'timid', 'jumpy', 'cowardly', 'startled'], apply(A) { A.mood = 'worried'; A.statuses.add('scared'); } },
    love: { aliases: ['in love', 'lovely', 'loving', 'romantic', 'cute', 'adorable', 'sweet', 'cuddly', 'lovable', 'kawaii', 'precious', 'beautiful', 'pretty', 'gorgeous', 'handsome', 'charming', 'darling'], apply(A) { A.mood = 'love'; A.statuses.add('love'); } },
    sleepy: { aliases: ['tired', 'drowsy', 'exhausted', 'lazy', 'sluggish', 'snoozy', 'bored', 'dozy', 'asleep', 'yawning'], apply(A) { A.statuses.add('asleep'); } },
    silly: { aliases: ['goofy', 'funny', 'wacky', 'zany', 'ridiculous', 'crazy', 'bonkers', 'nutty', 'loopy', 'weird', 'strange', 'bizarre', 'odd', 'hilarious', 'derpy', 'dorky', 'clumsy', 'wild', 'random', 'kooky', 'quirky', 'absurd', 'insane', 'chaotic'], apply(A) { A.mood = 'silly'; A.statuses.add('wobbly'); } },
    dizzy: { aliases: ['confused', 'woozy', 'spinning', 'loopy', 'puzzled', 'baffled', 'lost', 'dazed'], apply(A) { A.statuses.add('dizzy'); } },
    hot: { aliases: ['fiery', 'flaming', 'burning', 'blazing', 'spicy', 'on fire', 'scorching', 'boiling', 'sizzling', 'molten', 'lava', 'toasty', 'sweaty', 'steamy', 'flaming hot', 'flamin hot', 'smoking'], apply(A) { A.statuses.delete('frozen'); A.statuses.add('burning'); Sfx.play('sizzle'); } },
    cold: { aliases: ['frozen', 'icy', 'freezing', 'chilly', 'frosty', 'frostbitten', 'arctic', 'wintry', 'ice-cold', 'ice cold', 'cool as ice'], apply(A, S2) { A.statuses.delete('burning'); A.statuses.add('chilly'); A.color = A.color || '#bfe0f6'; Sfx.play('freeze'); } },
    wet: { aliases: ['soggy', 'soaked', 'damp', 'drippy', 'drippy', 'moist', 'watery', 'sweaty', 'juicy', 'dripping', 'drenched', 'leaky', 'rainy'], apply(A) { A.statuses.delete('burning'); A.statuses.add('wet'); } },
    slimy: { aliases: ['gross', 'disgusting', 'gooey', 'sticky', 'icky', 'yucky', 'gloopy', 'oozy', 'sludgy', 'mucky', 'nasty', 'snotty', 'sick', 'ill', 'toxic', 'radioactive', 'mutant', 'zombie', 'rotten', 'moldy', 'mouldy'], apply(A) { A.statuses.add('slimy'); if (!A.color) A.color = '#a8d672'; } },
    stinky: { aliases: ['smelly', 'stinking', 'funky', 'musty', 'pungent', 'reeking', 'putrid', 'farty', 'cheesy', 'garlicky', 'fishy'], apply(A) { A.statuses.add('stinky'); } },
    sparkly: { aliases: ['shiny', 'glittery', 'magical', 'magic', 'enchanted', 'twinkly', 'glowing', 'glowy', 'shimmering', 'dazzling', 'brilliant', 'bright', 'fabulous', 'fancy', 'sparkling', 'gleaming', 'majestic', 'mystical', 'radiant', 'glamorous', 'elegant', 'heavenly', 'holy', 'angelic', 'divine', 'legendary', 'epic', 'perfect'], apply(A) { A.statuses.add('sparkly'); } },
    invisible: { aliases: ['ghostly', 'see-through', 'transparent', 'see through', 'faded', 'clear', 'hidden', 'secret', 'sneaky', 'ghost'], apply(A) { A.statuses.add('invisible'); } },
    fast: { aliases: ['speedy', 'quick', 'zippy', 'rapid', 'turbo', 'hyper', 'energetic', 'zoomy', 'hyperactive', 'caffeinated', 'sugary', 'restless'], apply(A) { A.statuses.add('speedy'); } },
    electric: { aliases: ['electrified', 'shocking', 'zappy', 'sparky', 'charged', 'robotic', 'electronic', 'buzzing', 'static', 'lightning'], apply(A) { A.statuses.add('electric'); Sfx.play('zap'); } },
    fuzzy: { aliases: ['furry', 'fluffy', 'hairy', 'shaggy', 'woolly', 'wooly', 'soft', 'fuzzy wuzzy', 'bushy', 'scruffy', 'feathery', 'poofy'], apply(A) { A.statuses.add('fuzzy'); } },
    spiky: { aliases: ['pointy', 'prickly', 'thorny', 'sharp', 'spiny', 'jagged', 'punk', 'edgy'], apply(A) { A.statuses.add('spiky'); } },
    wobbly: { aliases: ['jiggly', 'jello', 'bouncy', 'squishy', 'rubbery', 'floppy', 'bendy', 'wiggly', 'jelly', 'gelatinous', 'drunk', 'shaky', 'unstable'], apply(A) { A.statuses.add('wobbly'); } },
    upsidedown: { aliases: ['upside down', 'upside-down', 'flipped', 'backwards', 'inside out', 'topsy-turvy', 'topsy turvy', 'reversed'], apply(A) { A.flipY = !A.flipY; } },
    cool: { aliases: ['awesome', 'rad', 'radical', 'groovy', 'chill', 'stylish', 'trendy', 'hip', 'swag', 'fresh', 'slick', 'suave', 'fashionable', 'famous', 'popular', 'confident', 'sassy', 'fly', 'dope', 'sick', 'epic', 'badass', 'tough', 'brave', 'heroic', 'bold'], apply(A) { A.acc.add('sunglasses'); A.alive = true; A.mood = 'smile'; } },
    smart: { aliases: ['clever', 'genius', 'nerdy', 'brainy', 'wise', 'intelligent', 'geeky', 'brilliant', 'scientific', 'educated', 'old', 'ancient', 'elderly', 'boring'], apply(A) { A.acc.add('glasses'); A.alive = true; } },
    royal: { aliases: ['regal', 'noble', 'kingly', 'queenly', 'princely', 'majestic', 'rich', 'wealthy', 'posh', 'bossy', 'important'], apply(A) { A.acc.add('crown'); } },
    party: { aliases: ['festive', 'partying', 'birthday', 'celebratory'], apply(A) { A.acc.add('party'); } },
    spooky: { aliases: ['scary', 'creepy', 'haunted', 'eerie', 'sinister', 'devilish', 'demonic', 'cursed', 'frightening', 'terrifying', 'monstrous', 'horrible', 'dangerous', 'deadly', 'undead', 'hairy-scary'], apply(A) { A.acc.add('horns'); A.mood = 'angry'; A.statuses.add('spooky'); } },
    angelic: { aliases: ['saintly', 'innocent', 'pure', 'blessed', 'polite', 'helpful', 'gentle', 'well-behaved'], apply(A) { A.acc.add('halo'); A.mood = 'happy'; } },
    hungry: { aliases: ['starving', 'famished', 'peckish', 'greedy', 'ravenous', 'snacky', 'thirsty'], apply(A, S2) { A.mood = 'surprised'; S2.bubble(A, pick(['FEED ME!', 'Snack time?', 'So… hungry…']), 2.2); } },
    loud: { aliases: ['noisy', 'roaring', 'booming', 'thunderous', 'rowdy', 'obnoxious', 'screaming', 'shouting', 'annoying'], apply(A, S2) { S2.bubble(A, 'HELLOOOO!!!', 2); S2.shake = 6; } },
    quiet: { aliases: ['silent', 'shy', 'calm', 'peaceful', 'mellow', 'sleepy-eyed', 'serene', 'zen'], apply(A, S2) { A.mood = 'meh'; S2.bubble(A, 'shhhh…', 2); } },
  };
  for (const [k, [hex, al]] of Object.entries(COLORS)) {
    ADJS[k] = { color: hex, aliases: al, apply(A, S2) { A.statuses.delete('rainbow'); A.color = hex; for (let i = 0; i < 10; i++) S2.particle({ kind: 'drop', x: A.cx + rand(-A.w / 2, A.w / 2), y: A.top, vx: rand(-90, 90), vy: rand(-200, -80), g: 500, max: 0.9, size: 7, color: hex }); Sfx.play('splash'); } };
  }

  // apply an adjective (or unknown word) to an actor with a small flourish
  function applyAdj(A, S2, keys, label) {
    if (!A) return;
    if (A.gone) { A.gone = false; A.alpha = 1; }
    A.alive = true;
    if (!keys.length) {
      // unknown adjective: show the word and give it a deterministic little twist
      S2.text(A.cx, Math.max(50, A.top - 30), 'so ' + label + '!', { size: 34, color: '#8a5fd0', max: 2.2, vy: -10 });
      const h = Color.hashStr(label);
      const twist = ['sparkly', 'wobbly', 'happy', 'silly', 'fuzzy', 'rainbow'][h % 6];
      ADJS[twist].apply(A, S2);
      for (let i = 0; i < 10; i++) S2.particle({ kind: 'spark', x: A.cx + rand(-A.w, A.w) * 0.6, y: A.cy + rand(-A.h, A.h) * 0.6, max: 1, size: rand(6, 10) });
      return;
    }
    for (const k of keys) ADJS[k] && ADJS[k].apply(A, S2);
    for (let i = 0; i < 6; i++) S2.particle({ kind: 'spark', x: A.cx + rand(-A.w, A.w) * 0.5, y: A.cy + rand(-A.h, A.h) * 0.5, max: 0.8, size: rand(5, 9) });
  }

  // ------------------------------------------------------------------ status rendering
  const Effects = {
    statusExpr(A) {
      const s = A.statuses;
      if (s.has('asleep')) return 'sleep';
      if (s.has('burning')) return 'scream';
      if (s.has('dizzy')) return 'dizzy';
      if (s.has('melted') || s.has('chilly') || s.has('scared')) return 'worried';
      if (s.has('love')) return 'love';
      if (s.has('angry') || s.has('spooky')) return 'angry';
      if (s.has('sad')) return 'sad';
      if (s.has('happy')) return 'happy';
      return null;
    },
    statusTick(A, S2, dt) {
      const s = A.statuses, t = S2.time, e = A.emit;
      if (A.timers) { const now = performance.now(); for (const k in A.timers) if (now > A.timers[k]) { s.delete(k); delete A.timers[k]; } }
      const due = (k, sec) => { if (!e[k] || t >= e[k]) { e[k] = t + sec * rand(0.7, 1.3); return true; } return false; };
      if (s.has('flying') && !A.anim) { A.dy = Math.sin(t * 3 + A.z) * 8; }
      if (s.has('asleep')) {
        if (A.isPerson && !A.anim) { A.pivot = 'bottom'; A.rot = -1.45 * A.dir; }
        else if (!A.anim) A.rot = 0.08 * Math.sin(t);
        if (due('z', 0.9)) S2.particle({ kind: 'zzz', x: A.cx + 20, y: A.isPerson ? A.y - A.alt - 30 : A.top, vx: 20, vy: -30, max: 2, size: rand(18, 28) });
      }
      if (s.has('melted')) { A.sy *= 0.18; A.sx *= 1.8; }
      if (s.has('burning')) {
        if (due('f', 0.04)) S2.particle({ kind: 'flame', x: A.cx + rand(-A.w / 2, A.w / 2) * 0.8, y: A.cy + rand(-A.h / 2, A.h / 3), vx: rand(-15, 15), vy: rand(-140, -70), max: rand(0.4, 0.7), size: rand(8, 16) });
        if (due('fs', 0.3)) S2.particle({ kind: 'smoke', x: A.cx + rand(-10, 10), y: A.top, vy: -40, max: 1.2, size: 10, color: 'rgba(120,120,120,.5)' });
      }
      if (s.has('sparkly') && due('sp', 0.15)) S2.particle({ kind: 'spark', x: A.cx + rand(-A.w / 2, A.w / 2), y: A.cy + rand(-A.h / 2, A.h / 2), vy: -10, max: 0.8, size: rand(5, 10) });
      if (s.has('stinky') && due('st', 0.25)) S2.particle({ kind: 'stink', x: A.cx + rand(-A.w / 2, A.w / 2), y: A.top + 10, vy: -40, max: 1.3, size: 10 });
      if (s.has('sad') && due('r', 0.07)) S2.particle({ kind: 'drop', x: A.cx + rand(-30, 30), y: A.top - 38, vy: 260, max: 0.25, size: 4 });
      if (s.has('angry') && due('an', 0.25)) S2.particle({ kind: 'puff', x: A.cx + rand(-14, 14), y: A.top, vx: rand(-40, 40), vy: -90, max: 0.7, size: 7, color: 'rgba(255,255,255,.9)' });
      if (s.has('love') && due('lv', 0.4)) S2.particle({ kind: 'heart', x: A.cx + rand(-20, 20), y: A.top, vy: -40, max: 1.3, size: rand(6, 10) });
      if (s.has('scared')) { A.dx += Math.sin(t * 60) * 2; if (due('sw', 0.5)) S2.particle({ kind: 'drop', x: A.cx + rand(-A.w / 2, A.w / 2), y: A.top + 10, vx: rand(-40, 40), vy: -60, g: 400, max: 0.7, size: 5 }); }
      if (s.has('chilly')) { A.dx += Math.sin(t * 50) * 1.5; if (due('ch', 0.2)) S2.particle({ kind: 'snow', x: A.cx + rand(-A.w, A.w) * 0.6, y: A.top - 10, vy: 50, max: 1, size: 10 }); }
      if (s.has('wet') && due('w', 0.18)) S2.particle({ kind: 'drop', x: A.cx + rand(-A.w / 2, A.w / 2), y: A.cy + A.h * 0.3, vy: 40, g: 500, max: 0.5, size: 4 });
      if (s.has('slimy') && due('sl', 0.25)) S2.particle({ kind: 'drop', x: A.cx + rand(-A.w / 2, A.w / 2), y: A.cy + A.h * 0.2, vy: 20, g: 300, max: 0.7, size: 6, color: '#9ad65a' });
      if (s.has('electric')) { A.dx += rand(-1.5, 1.5); if (due('el', 0.1)) S2.particle({ kind: 'zap', x: A.cx + rand(-A.w / 2, A.w / 2), y: A.cy + rand(-A.h / 2, A.h / 2), max: 0.15, size: rand(10, 18), rot: rand(0, 6) }); }
      if (s.has('speedy')) { A.dx += Math.sin(t * 40) * 2; if (due('sd', 0.08)) S2.particle({ kind: 'text', text: '—', x: A.cx - A.w / 2 - 20, y: A.cy + rand(-A.h / 3, A.h / 3), vx: -200, vy: 0, max: 0.3, size: 26, color: '#999', outline: 0, rot: 0 }); }
      if (s.has('wobbly') && !A.anim) { A.sx *= 1 + Math.sin(t * 9) * 0.07; A.sy *= 1 - Math.sin(t * 9) * 0.07; A.rot += Math.sin(t * 4.5) * 0.06; }
      if (s.has('dizzy') && !A.anim) A.rot += Math.sin(t * 5) * 0.05;
      if (s.has('happy') && !A.anim) A.dy -= Math.abs(Math.sin(t * 5)) * 4;
      if (s.has('rainbow')) A.color = `hsl(${(t * 140 + A.z * 50) % 360},80%,65%)`;
      if (s.has('spooky') && due('gh', 0.5)) S2.particle({ kind: 'smoke', x: A.cx + rand(-A.w / 2, A.w / 2), y: A.y - A.alt - 10, vy: -30, max: 1.2, size: 10, color: 'rgba(140,90,200,.35)' });
    },
    drawBehind(A, S2) {
      const c = S2.ctx;
      if (A.statuses.has('sparkly') || A.statuses.has('spooky')) {
        const R = Math.max(A.w, A.h) * 0.8;
        const g = c.createRadialGradient(0, -A.h / 2, 4, 0, -A.h / 2, R);
        g.addColorStop(0, A.statuses.has('spooky') ? 'rgba(140,90,200,.35)' : 'rgba(255,240,150,.55)'); g.addColorStop(1, 'rgba(255,240,150,0)');
        c.fillStyle = g; c.fillRect(-R, -A.h / 2 - R, R * 2, R * 2);
      }
      if (A.statuses.has('swimming')) {
        c.fillStyle = 'rgba(91,178,230,.45)';
        c.fillRect(-A.w, -26, A.w * 2, 30);
      }
    },
    drawLocal(A, S2, P) {
      const d = A.def, s = A.statuses;
      const w = d.w, h = d.h;
      if (s.has('fuzzy')) {
        const pts = [];
        for (let i = 0; i < 28; i++) { const a = (i / 28) * PI * 2, r = i % 2 ? 1.0 : 1.12; pts.push([Math.cos(a) * w * 0.55 * r, -h / 2 + Math.sin(a) * h * 0.55 * r]); }
        S.poly(pts, null, { lw: 2, ink: Color.shade(typeof P.fill === 'string' && P.fill[0] === '#' ? P.fill : '#999999', -0.3) });
      }
      if (s.has('spiky')) for (let i = 0; i < 7; i++) { const x = -w * 0.4 + i * (w * 0.8 / 6); S.poly([[x - 7, -h * 0.92], [x, -h * 1.12], [x + 7, -h * 0.92]], '#bbb', { lw: 2 }); }
      if (s.has('frozen')) {
        S.rect(-w / 2 - 10, -h - 10, w + 20, h + 14, 'rgba(170,215,245,.55)', { ink: '#6aa8d8', lw: 3 });
        S.line(-w / 2, -h * 0.8, -w / 2 + 16, -h * 0.95, { ink: '#fff', lw: 3 });
        S.line(-w / 2 + 6, -h * 0.6, -w / 2 + 26, -h * 0.82, { ink: '#fff', lw: 2 });
      }
      if (s.has('melted')) S.ellipse(0, -2, w * 0.6, 10, P.fill, { lw: 2 });
    },
    drawWorld(A, S2) {
      const s = A.statuses, t = S2.time;
      if (s.has('sad')) {
        const x = A.cx, y = A.top - 46;
        S.path([[x - 40, y + 10], [x - 42, y - 6], [x - 20, y - 16], [x, y - 22], [x + 22, y - 16], [x + 40, y - 4], [x + 36, y + 12]], '#a8b2c0', true, { lw: 2 });
      }
      if (s.has('dizzy')) {
        for (let i = 0; i < 3; i++) { const a = t * 5 + i * (PI * 2 / 3); S.star(A.cx + Math.cos(a) * 26, A.top - 6 + Math.sin(a) * 8, 7, '#f6d743'); }
      }
    },
  };

  window.VERBS = VERBS;
  window.ADJS = ADJS;
  window.ADVERBS = ADVERBS;
  window.Effects = Effects;
  window.Actions = { applyAdj, addStatus, easeOut, easeInOut, bump };
})();
