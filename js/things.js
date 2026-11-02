// things.js — the doodle library. Every drawable noun lives here.
// Each thing is drawn facing right, with its origin at bottom-center (feet on
// the ground, y negative = up). `w`/`h` are its rough size in px at scale 1.
(function () {
  const THINGS = {};
  const S = Sk;
  const PI = Math.PI;

  function def(key, o) {
    o.key = key;
    o.aliases = o.aliases || [];
    o.face = o.face || [0, -o.h * 0.55, Math.min(o.w, o.h) * 0.32];
    THINGS[key] = o;
    return o;
  }

  // ---------------------------------------------------------------- people
  const ROLES = {
    person: { aliases: ['man', 'woman', 'guy', 'lady', 'kid', 'boy', 'girl', 'friend', 'human', 'dude', 'stranger', 'neighbor', 'neighbour', 'buddy', 'pal', 'mom', 'mum', 'dad', 'mother', 'father', 'brother', 'sister', 'uncle', 'aunt', 'cousin', 'student', 'kid', 'child', 'people', 'person', 'farmer', 'teacher', 'doctor', 'nurse', 'boss', 'mailman', 'scientist', 'superhero', 'hero', 'villain', 'dancer', 'singer'] },
    king: { hat: 'crown', aliases: ['queen', 'prince', 'princess', 'emperor', 'royal'] },
    pirate: { hat: 'pirate', aliases: ['captain'] },
    wizard: { hat: 'wizard', aliases: ['witch', 'magician', 'sorcerer', 'mage', 'elf'] },
    cowboy: { hat: 'cowboy', aliases: ['cowgirl', 'sheriff'] },
    chef: { hat: 'chef', aliases: ['cook', 'baker'] },
    ninja: { hat: 'ninja', aliases: ['spy', 'robber', 'thief', 'burglar'] },
    astronaut: { hat: 'astronaut', aliases: ['spaceman', 'cosmonaut'] },
    clown: { hat: 'clown', aliases: ['jester'] },
    grandma: { hat: 'bun', aliases: ['granny', 'grandmother', 'nana', 'grandpa', 'grandfather', 'old man', 'old lady'] },
    baby: { hat: 'curl', small: 0.6, aliases: ['toddler', 'infant'] },
    alien: { hat: 'antennae', color: '#8fd16a', aliases: ['martian', 'extraterrestrial'] },
    zombie: { color: '#a3c48a', expr: 'meh', aliases: ['mummy'] },
    vampire: { hat: 'vampire', aliases: ['dracula'] },
  };

  function personPose(A, P) {
    const t = P.t;
    let pose = { la: -0.35, ra: 0.35, le: 0.15, re: -0.15, ll: -0.14, rl: 0.14, lk: 0, rk: 0, lean: 0 };
    if (P.moving) {
      const s = Math.sin(P.walk);
      pose.ll = -0.12 + s * 0.55; pose.rl = 0.12 - s * 0.55;
      pose.lk = Math.max(0, s) * 0.5; pose.rk = Math.max(0, -s) * 0.5;
      pose.la = -0.3 - s * 0.5; pose.ra = 0.3 + s * 0.5;
      pose.lean = 0.08;
    } else {
      pose.la += Math.sin(t * 2) * 0.04; pose.ra -= Math.sin(t * 2) * 0.04;
    }
    if (A.statuses.has('flying')) {
      const f = Math.sin(t * 18) * 0.5;
      pose.la = -2.0 + f; pose.ra = 2.0 - f; pose.le = 0; pose.re = 0;
    }
    if (P.pose) Object.assign(pose, P.pose);
    return pose;
  }

  function limb(x, y, a, bend, l1, l2, opts) {
    const x2 = x + Math.sin(a) * l1, y2 = y + Math.cos(a) * l1;
    const a2 = a + bend;
    const x3 = x2 + Math.sin(a2) * l2, y3 = y2 + Math.cos(a2) * l2;
    S.path([[x, y], [x2, y2], [x3, y3]], null, false, opts);
    return [x3, y3];
  }

  function drawHat(type, hx, hy, r) {
    switch (type) {
      case 'crown':
        S.poly([[hx - r * 0.8, hy - r * 0.7], [hx - r * 0.8, hy - r * 1.6], [hx - r * 0.4, hy - r * 1.1], [hx, hy - r * 1.8], [hx + r * 0.4, hy - r * 1.1], [hx + r * 0.8, hy - r * 1.6], [hx + r * 0.8, hy - r * 0.7]], '#f6c945');
        S.dot(hx, hy - r * 1.25, r * 0.12, '#e8466b');
        break;
      case 'pirate':
        S.poly([[hx - r * 1.5, hy - r * 0.6], [hx, hy - r * 1.9], [hx + r * 1.5, hy - r * 0.6], [hx, hy - r * 0.9]], '#333');
        S.line(hx - r * 0.9, hy - r * 0.6, hx + r * 0.8, hy + r * 0.1, { lw: 2 });
        S.dot(hx + r * 0.4, hy - r * 0.1, r * 0.25);
        break;
      case 'wizard':
        S.poly([[hx - r * 1.3, hy - r * 0.6], [hx + r * 0.3, hy - r * 3], [hx + r * 1.3, hy - r * 0.6]], '#6a5acd');
        S.star(hx + r * 0.1, hy - r * 1.4, r * 0.3, '#f6c945');
        break;
      case 'cowboy':
        S.path([[hx - r * 1.7, hy - r * 0.6], [hx - r * 0.7, hy - r * 0.8], [hx - r * 0.6, hy - r * 1.6], [hx + r * 0.6, hy - r * 1.6], [hx + r * 0.7, hy - r * 0.8], [hx + r * 1.7, hy - r * 0.6], [hx, hy - r * 0.5]], '#b07a43', true);
        break;
      case 'chef':
        S.rect(hx - r * 0.7, hy - r * 1.4, r * 1.4, r * 0.6, '#fff');
        S.path([[hx - r * 0.9, hy - r * 1.4], [hx - r * 1.1, hy - r * 2.1], [hx - r * 0.4, hy - r * 2.5], [hx + r * 0.4, hy - r * 2.5], [hx + r * 1.1, hy - r * 2.1], [hx + r * 0.9, hy - r * 1.4]], '#fff', true);
        break;
      case 'ninja':
        S.rect(hx - r * 1.05, hy - r * 0.35, r * 2.1, r * 0.55, '#333');
        S.line(hx - r, hy - r * 0.1, hx - r * 1.8, hy + r * 0.4, { lw: 2.5 });
        break;
      case 'astronaut':
        S.circle(hx, hy, r * 1.55, 'rgba(180,220,255,.35)');
        break;
      case 'clown':
        S.dot(hx + r * 0.15, hy + r * 0.1, r * 0.28, '#e8463b');
        S.circle(hx - r * 1.1, hy - r * 0.6, r * 0.5, '#ff8f3b');
        S.circle(hx + r * 1.1, hy - r * 0.6, r * 0.5, '#ff8f3b');
        break;
      case 'bun':
        S.circle(hx - r * 0.2, hy - r * 1.25, r * 0.5, '#ddd');
        break;
      case 'curl':
        S.arc(hx, hy - r * 1.3, r * 0.3, PI * 0.5, PI * 2.2, { lw: 2 });
        break;
      case 'antennae':
        S.line(hx - r * 0.4, hy - r * 0.9, hx - r * 0.8, hy - r * 1.9, { lw: 2 });
        S.line(hx + r * 0.4, hy - r * 0.9, hx + r * 0.8, hy - r * 1.9, { lw: 2 });
        S.dot(hx - r * 0.8, hy - r * 1.9, r * 0.2, '#e8466b'); S.dot(hx + r * 0.8, hy - r * 1.9, r * 0.2, '#e8466b');
        break;
      case 'vampire':
        S.poly([[hx - r * 1.8, hy + r * 1.4], [hx - r * 1.2, hy + r * 0.2], [hx + r * 1.2, hy + r * 0.2], [hx + r * 1.8, hy + r * 1.4]], '#7a1f2b');
        break;
      case 'party':
        S.poly([[hx - r * 0.6, hy - r * 0.8], [hx, hy - r * 2.3], [hx + r * 0.6, hy - r * 0.8]], '#ff7eb6');
        S.dot(hx, hy - r * 2.3, r * 0.2, '#f6c945');
        break;
      case 'frazzled':
        for (let i = -3; i <= 3; i++) S.line(hx + i * r * 0.25, hy - r * 0.9, hx + i * r * 0.45, hy - r * 1.7 - Math.abs(i % 2) * r * 0.3, { lw: 2 });
        break;
    }
  }

  function drawPerson(A, P) {
    const role = ROLES[A.def.role] || ROLES.person;
    const pose = personPose(A, P);
    const hipY = -44, torso = 44, headR = 15;
    const neckY = hipY - torso;
    const line = A.color ? { ink: Color.shade(A.color, -0.45), lw: 3.5 } : undefined;
    // legs
    limb(-2, hipY, pose.ll, pose.lk, 23, 23, line);
    limb(2, hipY, pose.rl, -pose.rk, 23, 23, line);
    const c = S.ctx;
    c.save();
    c.translate(0, hipY); c.rotate(pose.lean); c.translate(0, -hipY);
    S.line(0, hipY, 0, neckY, line);
    if (A.def.role === 'vampire' || role.hat === 'vampire') drawHat('vampire', 0, neckY, headR);
    limb(0, neckY + 7, pose.la, pose.le, 20, 18, line);
    limb(0, neckY + 7, pose.ra, pose.re, 20, 18, line);
    const hx = 0, hy = neckY - headR + 1;
    const headFill = A.color || role.color || '#fffdf6';
    S.circle(hx, hy, headR, headFill);
    if (A.def.role !== 'ninja') S.face(hx + 3, hy, headR * 1.6, P.expr);
    else { drawHat('ninja', hx, hy, headR); S.dot(hx - 2, hy - 1, 2); S.dot(hx + 8, hy - 1, 2); }
    if (A.statuses.has('singed')) drawHat('frazzled', hx, hy, headR);
    else if (role.hat && role.hat !== 'ninja' && role.hat !== 'vampire') drawHat(role.hat, hx, hy, headR);
    else if (A.hat) drawHat(A.hat, hx, hy, headR);
    c.restore();
  }

  for (const k in ROLES) {
    def(k, { kind: 'person', role: k, w: 40, h: 118, small: ROLES[k].small, aliases: ROLES[k].aliases, selfFace: true, draw: drawPerson, face: [3, -103, 24] });
  }

  // ---------------------------------------------------------------- animals
  // generic four-legged animal
  function quad(o) {
    return function (A, P) {
      const bw = o.bw, bh = o.bh, leg = o.leg, hr = o.hr;
      const by = -leg - bh / 2;
      const fill = P.fill, f2 = P.fill2;
      const sw = P.moving ? Math.sin(P.walk) * 0.55 : 0;
      // tail
      const tx = -bw / 2 + 2, ty = by - bh * 0.15;
      if (o.tail === 'curl') S.path([[tx, ty], [tx - 14, ty - 10], [tx - 12, ty - 26], [tx - 4, ty - 22]], null, false);
      else if (o.tail === 'tuft') { S.line(tx, ty, tx - 16, ty + 10); S.circle(tx - 18, ty + 12, 4, f2); }
      else if (o.tail === 'fluffy') S.ellipse(tx - 10, ty - 6, 12, 7, f2);
      else if (o.tail === 'long') S.path([[tx, ty], [tx - bw * 0.4, ty + 5], [tx - bw * 0.7, ty + bh * 0.5]], null, false, { lw: 5 });
      else if (o.tail === 'stub') S.circle(tx - 3, ty, 6, '#fff');
      else if (o.tail !== 'none') S.path([[tx, ty], [tx - 14, ty - 8], [tx - 20, ty - 18 + Math.sin(P.t * 8) * 4]], null, false);
      // legs
      const lx = [-bw * 0.32, -bw * 0.2, bw * 0.22, bw * 0.34];
      lx.forEach((x, i) => {
        const a = (i % 2 ? sw : -sw);
        const top = by + bh * 0.25;
        S.line(x, top, x + Math.sin(a) * leg, top + leg + bh * 0.25 - 2, { lw: o.legW || 3 });
      });
      // body
      S.ellipse(0, by, bw / 2, bh / 2, fill);
      if (o.spots) for (let i = 0; i < 4; i++) S.ellipse(-bw * 0.25 + i * bw * 0.17, by - bh * 0.1 + (i % 2) * bh * 0.2, bw * 0.06, bh * 0.12, o.spotColor || '#333', { lw: 1 });
      if (o.stripes) for (let i = 0; i < 4; i++) S.line(-bw * 0.25 + i * bw * 0.16, by - bh * 0.42, -bw * 0.22 + i * bw * 0.16, by + bh * 0.3, { lw: 3.5 });
      if (o.wings) {
        const f = Math.sin(P.t * (A.statuses.has('flying') ? 16 : 3)) * 0.4;
        S.poly([[-bw * 0.05, by - bh * 0.3], [-bw * 0.35, by - bh * 1.4 - f * 20], [-bw * 0.1, by - bh * 1.0 - f * 20], [bw * 0.15, by - bh * 1.3 - f * 20], [bw * 0.1, by - bh * 0.3]], f2);
      }
      if (o.spikes) for (let i = 0; i < 5; i++) { const x = -bw * 0.35 + i * bw * 0.16; S.poly([[x - 6, by - bh * 0.42], [x, by - bh * 0.42 - 14], [x + 6, by - bh * 0.42]], '#e8a33b', { lw: 2 }); }
      // neck + head
      let hx = bw / 2 + hr * 0.3, hy = by - bh * 0.35;
      if (o.neck) {
        const nx = bw * 0.42, ny = by - bh * 0.2;
        hx = nx + o.neck * 0.35; hy = ny - o.neck;
        S.line(nx, ny, hx, hy + hr * 0.5, { lw: o.neckW || 10, ink: S.ink });
        S.line(nx, ny, hx, hy + hr * 0.5, { lw: (o.neckW || 10) - 5, ink: fill });
        if (o.spots) S.dot((nx + hx) / 2, (ny + hy) / 2, 3, o.spotColor || '#7a4a1a');
      }
      if (o.mane) S.circle(hx - 2, hy, hr * 1.55, o.mane, { lw: 2 });
      // ears
      if (o.ears === 'pointy') { S.poly([[hx - hr * 0.7, hy - hr * 0.5], [hx - hr * 0.55, hy - hr * 1.5], [hx - hr * 0.05, hy - hr * 0.85]], fill); S.poly([[hx + hr * 0.15, hy - hr * 0.85], [hx + hr * 0.55, hy - hr * 1.5], [hx + hr * 0.75, hy - hr * 0.45]], fill); }
      if (o.ears === 'long') { S.ellipse(hx - hr * 0.35, hy - hr * 1.6, hr * 0.28, hr * 0.9, fill); S.ellipse(hx + hr * 0.3, hy - hr * 1.6, hr * 0.28, hr * 0.9, fill); }
      if (o.ears === 'round') { S.circle(hx - hr * 0.7, hy - hr * 0.75, hr * 0.38, fill); S.circle(hx + hr * 0.6, hy - hr * 0.8, hr * 0.38, fill); }
      if (o.ears === 'big') S.ellipse(hx - hr * 0.6, hy + hr * 0.1, hr * 0.7, hr * 0.95, f2);
      if (o.horns) { S.path([[hx - hr * 0.4, hy - hr * 0.8], [hx - hr * 0.9, hy - hr * 1.4], [hx - hr * 0.6, hy - hr * 1.6]], null, false); S.path([[hx + hr * 0.4, hy - hr * 0.8], [hx + hr * 0.9, hy - hr * 1.4], [hx + hr * 0.6, hy - hr * 1.6]], null, false); }
      S.circle(hx, hy, hr, fill);
      if (o.ears === 'floppy') { S.ellipse(hx - hr * 0.75, hy + hr * 0.1, hr * 0.32, hr * 0.7, f2); }
      if (o.horn) S.poly([[hx - hr * 0.15, hy - hr * 0.85], [hx + hr * 0.3, hy - hr * 2.3], [hx + hr * 0.45, hy - hr * 0.8]], '#f6c945', { lw: 2 });
      if (o.trunk) S.path([[hx + hr * 0.7, hy + hr * 0.1], [hx + hr * 1.3, hy + hr * 0.6], [hx + hr * 1.3, hy + hr * 1.4], [hx + hr * 1.6, hy + hr * 1.7]], null, false, { lw: 6 });
      if (o.snout) { S.ellipse(hx + hr * 0.75, hy + hr * 0.25, hr * 0.42, hr * 0.32, o.snoutColor || f2, { lw: 2 }); S.dot(hx + hr * 1.0, hy + hr * 0.15, 2.2); }
      if (o.whiskers) { S.line(hx + hr * 0.6, hy + hr * 0.3, hx + hr * 1.5, hy + hr * 0.15, { lw: 1 }); S.line(hx + hr * 0.6, hy + hr * 0.4, hx + hr * 1.5, hy + hr * 0.55, { lw: 1 }); }
      if (o.teeth) for (let i = 0; i < 3; i++) S.poly([[hx + hr * 0.2 + i * 5, hy + hr * 0.5], [hx + hr * 0.2 + i * 5 + 2.5, hy + hr * 0.85], [hx + hr * 0.2 + i * 5 + 5, hy + hr * 0.5]], '#fff', { lw: 1 });
      S.face(hx + hr * 0.2, hy - hr * 0.05, hr * 1.05, P.expr);
    };
  }
  function animal(key, o, extra) {
    const h = o.leg + o.bh + (o.neck || 0) + o.hr * 1.5;
    def(key, Object.assign({ kind: 'animal', w: o.bw + o.hr * 2, h, fill: o.fill, fill2: o.fill2, selfFace: true, legs: true, draw: quad(o) }, extra || {}));
  }
  animal('dog', { bw: 70, bh: 32, leg: 24, hr: 17, ears: 'floppy', snout: true, fill: '#d9a066', fill2: '#a8743f' }, { aliases: ['puppy', 'doggy', 'doggo', 'pup', 'hound', 'poodle', 'wolf', 'fox', 'coyote'] });
  animal('cat', { bw: 58, bh: 26, leg: 20, hr: 15, ears: 'pointy', tail: 'curl', whiskers: true, fill: '#a9a9b8', fill2: '#888' }, { aliases: ['kitty', 'kitten', 'kittycat', 'meow'] });
  animal('cow', { bw: 96, bh: 46, leg: 30, hr: 20, ears: 'round', horns: true, spots: true, snout: true, snoutColor: '#f4b6c2', tail: 'tuft', fill: '#fbfbf7', fill2: '#f4b6c2' }, { aliases: ['bull', 'ox', 'calf', 'buffalo', 'bison', 'moo'] });
  animal('pig', { bw: 70, bh: 38, leg: 16, hr: 18, ears: 'pointy', snout: true, snoutColor: '#f39cb0', tail: 'curl', fill: '#f8b9c6', fill2: '#f39cb0' }, { aliases: ['piggy', 'hog', 'piglet', 'boar'] });
  animal('horse', { bw: 90, bh: 38, leg: 42, hr: 16, neck: 30, ears: 'pointy', snout: true, tail: 'long', fill: '#a0703f', fill2: '#6f4a26' }, { aliases: ['pony', 'donkey', 'stallion', 'mule', 'camel', 'llama', 'alpaca', 'deer', 'reindeer', 'moose'] });
  animal('unicorn', { bw: 90, bh: 38, leg: 42, hr: 16, neck: 30, ears: 'pointy', snout: true, horn: true, tail: 'long', mane: '#ff9de0', fill: '#ffffff', fill2: '#f3e1ff' }, { aliases: ['pegasus'] });
  animal('zebra', { bw: 90, bh: 38, leg: 42, hr: 16, neck: 30, ears: 'pointy', snout: true, stripes: true, tail: 'tuft', fill: '#fff', fill2: '#ddd' });
  animal('giraffe', { bw: 80, bh: 38, leg: 60, hr: 14, neck: 90, neckW: 12, ears: 'pointy', horns: true, spots: true, spotColor: '#a8641f', tail: 'tuft', fill: '#f2c45a', fill2: '#d8a13a' });
  animal('elephant', { bw: 120, bh: 66, leg: 32, hr: 30, ears: 'big', trunk: true, tail: 'line', legW: 8, fill: '#b9bfc9', fill2: '#9aa1ad' }, { aliases: ['mammoth', 'rhino', 'rhinoceros', 'hippo', 'hippopotamus'] });
  animal('lion', { bw: 86, bh: 38, leg: 28, hr: 18, ears: 'round', mane: '#c97a2b', tail: 'tuft', whiskers: true, fill: '#e8b44a', fill2: '#c97a2b' }, { aliases: ['tiger', 'cheetah', 'leopard', 'panther', 'jaguar', 'cougar'] });
  animal('bear', { bw: 92, bh: 52, leg: 24, hr: 24, ears: 'round', snout: true, tail: 'stub', legW: 6, fill: '#8b5a2b', fill2: '#c08a55' }, { aliases: ['grizzly', 'panda', 'koala', 'teddy', 'teddy bear', 'polar bear', 'gorilla'] });
  animal('sheep', { bw: 70, bh: 42, leg: 20, hr: 14, ears: 'floppy', tail: 'fluffy', fill: '#f4f4ee', fill2: '#ddd' }, { aliases: ['lamb', 'goat', 'llama'] });
  animal('mouse', { bw: 34, bh: 18, leg: 7, hr: 10, ears: 'round', tail: 'long', whiskers: true, fill: '#b5b5bd', fill2: '#f4b6c2' }, { aliases: ['rat', 'hamster', 'gerbil', 'guinea pig', 'squirrel', 'mice'] });
  animal('bunny', { bw: 46, bh: 30, leg: 10, hr: 15, ears: 'long', tail: 'stub', whiskers: true, fill: '#f4f0ea', fill2: '#f4b6c2' }, { aliases: ['rabbit', 'hare', 'kangaroo'] });
  animal('dinosaur', { bw: 120, bh: 50, leg: 34, hr: 18, neck: 70, neckW: 16, tail: 'long', spikes: true, fill: '#7cc36a', fill2: '#5ea24d' }, { aliases: ['dino', 't-rex', 'trex', 'tyrannosaurus', 'brontosaurus', 'raptor', 'velociraptor', 'stegosaurus', 'godzilla', 'lizard', 'crocodile', 'alligator', 'iguana'] });
  animal('dragon', { bw: 110, bh: 48, leg: 30, hr: 22, neck: 30, horns: true, wings: true, spikes: true, tail: 'long', teeth: true, fill: '#d9524a', fill2: '#ef8d4a' }, { aliases: ['wyvern', 'drake'] });
  animal('monster', { bw: 90, bh: 80, leg: 20, hr: 28, horns: true, teeth: true, tail: 'none', legW: 7, fill: '#9b6ad6', fill2: '#7a4bb8' }, { aliases: ['beast', 'creature', 'troll', 'ogre', 'yeti', 'bigfoot', 'goblin', 'gremlin', 'werewolf', 'boogeyman'] });

  // birds
  function bird(o) {
    return function (A, P) {
      const fill = P.fill, f2 = P.fill2;
      const by = -o.leg - o.bh / 2;
      const flying = A.statuses.has('flying');
      if (o.leg > 4) { S.line(-5, by + o.bh * 0.4, -6, 0, { lw: 2 }); S.line(5, by + o.bh * 0.4, 6, 0, { lw: 2 }); }
      S.ellipse(0, by, o.bw / 2, o.bh / 2, fill);
      if (o.belly) S.ellipse(o.bw * 0.08, by + o.bh * 0.08, o.bw * 0.3, o.bh * 0.38, o.belly, { lw: 1.5 });
      const hx = o.upright ? 0 : o.bw * 0.4, hy = o.upright ? by - o.bh * 0.45 : by - o.bh * 0.5;
      if (!o.upright) S.circle(hx, hy, o.hr, fill);
      if (o.comb) S.path([[hx - 6, hy - o.hr], [hx - 3, hy - o.hr - 8], [hx, hy - o.hr - 3], [hx + 4, hy - o.hr - 9], [hx + 6, hy - o.hr]], '#e8463b', true, { lw: 2 });
      // beak
      const bx = hx + (o.upright ? o.hr * 0.4 : o.hr * 0.85);
      if (o.flatBeak) S.ellipse(bx + 6, hy + 3, 9, 4, '#f6a53b', { lw: 2 });
      else S.poly([[bx, hy - 3], [bx + 11, hy + 1], [bx, hy + 5]], '#f6a53b', { lw: 2 });
      const f = Math.sin(P.t * (flying ? 18 : 2)) * (flying ? 0.9 : 0.15);
      S.poly([[-o.bw * 0.25, by - 2], [-o.bw * 0.05, by - o.bh * 0.3 - f * 22], [o.bw * 0.2, by - 2]], f2, { lw: 2 });
      S.poly([[-o.bw / 2 + 2, by], [-o.bw / 2 - 14, by - 10], [-o.bw / 2 - 12, by + 6]], f2, { lw: 2 });
      S.face(hx + 2, hy - 2, o.hr * (o.bigEyes ? 1.5 : 1.1), P.expr);
    };
  }
  function birdDef(key, o, aliases) {
    const h = o.leg + o.bh + o.hr * 1.4;
    def(key, { kind: 'animal', w: o.bw + 20, h, fill: o.fill, fill2: o.fill2, selfFace: true, legs: true, wings: true, aliases: aliases || [], draw: bird(o) });
  }
  birdDef('bird', { bw: 40, bh: 28, leg: 10, hr: 12, fill: '#6bb6ea', fill2: '#3d8ccf' }, ['birdie', 'robin', 'sparrow', 'bluebird', 'pigeon', 'crow', 'raven', 'seagull', 'eagle', 'hawk', 'falcon', 'bat', 'tweety']);
  birdDef('duck', { bw: 46, bh: 30, leg: 6, hr: 13, flatBeak: true, fill: '#f6d743', fill2: '#e6b923' }, ['duckling', 'goose', 'geese', 'swan', 'ducky', 'rubber duck']);
  birdDef('chicken', { bw: 44, bh: 36, leg: 12, hr: 12, comb: true, fill: '#fbfbf7', fill2: '#ddd' }, ['hen', 'rooster', 'chick', 'turkey']);
  birdDef('penguin', { bw: 40, bh: 60, leg: 3, hr: 12, upright: true, belly: '#fff', fill: '#3b3f4a', fill2: '#23262d' }, ['puffin']);
  birdDef('owl', { bw: 44, bh: 50, leg: 4, hr: 14, upright: true, bigEyes: true, belly: '#e6cfa6', fill: '#9a7550', fill2: '#6f5235' }, []);
  birdDef('parrot', { bw: 38, bh: 34, leg: 10, hr: 12, fill: '#4cc36a', fill2: '#e8463b' }, ['parakeet', 'toucan', 'flamingo', 'peacock']);

  // sea creatures
  function fish(o) {
    return function (A, P) {
      const fill = P.fill, f2 = P.fill2;
      const by = -o.bh / 2 - 6;
      const wag = Math.sin(P.t * 8) * 6;
      S.poly([[-o.bw / 2 + 4, by], [-o.bw / 2 - o.bh * 0.5, by - o.bh * 0.45 + wag], [-o.bw / 2 - o.bh * 0.4, by + o.bh * 0.45 + wag]], f2);
      if (o.dorsal) S.poly([[-o.bw * 0.1, by - o.bh * 0.4], [o.bw * 0.02, by - o.bh * 1.0], [o.bw * 0.15, by - o.bh * 0.42]], f2);
      S.ellipse(0, by, o.bw / 2, o.bh / 2, fill);
      if (o.belly) S.ellipse(o.bw * 0.05, by + o.bh * 0.2, o.bw * 0.36, o.bh * 0.22, o.belly, { lw: 1.2 });
      if (o.teeth) for (let i = 0; i < 4; i++) S.poly([[o.bw * 0.22 + i * 6, by + o.bh * 0.12], [o.bw * 0.22 + i * 6 + 3, by + o.bh * 0.3], [o.bw * 0.22 + i * 6 + 6, by + o.bh * 0.12]], '#fff', { lw: 1 });
      if (o.spout && Math.sin(P.t * 2) > 0.3) { S.line(o.bw * 0.15, by - o.bh / 2, o.bw * 0.15, by - o.bh / 2 - 26, { ink: '#6bb6ea' }); S.arc(o.bw * 0.15, by - o.bh / 2 - 20, 10, PI, PI * 2, { ink: '#6bb6ea' }); }
      S.poly([[0, by + 2], [-12, by + o.bh * 0.3], [6, by + o.bh * 0.15]], f2, { lw: 2 });
      S.face(o.bw * 0.28, by - o.bh * 0.08, o.bh * 0.5, P.expr);
    };
  }
  function fishDef(key, o, aliases) {
    def(key, { kind: 'animal', w: o.bw + o.bh, h: o.bh * (o.dorsal ? 1.6 : 1.1) + 6, fill: o.fill, fill2: o.fill2, selfFace: true, swims: true, aliases: aliases || [], draw: fish(o) });
  }
  fishDef('fish', { bw: 50, bh: 30, fill: '#f6913b', fill2: '#e86a1f' }, ['goldfish', 'tuna', 'salmon', 'nemo', 'guppy', 'trout', 'clownfish', 'piranha', 'fishy']);
  fishDef('shark', { bw: 120, bh: 44, dorsal: true, teeth: true, belly: '#f3f3f3', fill: '#8a99a8', fill2: '#6c7c8c' }, ['jaws', 'megalodon']);
  fishDef('whale', { bw: 170, bh: 80, spout: true, belly: '#cfe2f3', fill: '#4f7fbf', fill2: '#3b65a0' }, ['orca', 'humpback']);
  fishDef('dolphin', { bw: 100, bh: 36, dorsal: true, belly: '#eaf2fb', fill: '#7fa8d0', fill2: '#5f8ab4' }, ['porpoise', 'seal', 'walrus', 'otter']);

  def('octopus', {
    kind: 'animal', w: 80, h: 80, fill: '#e87ab6', selfFace: true, aliases: ['squid', 'kraken', 'jellyfish'],
    draw(A, P) {
      for (let i = 0; i < 6; i++) {
        const x = -30 + i * 12, w = Math.sin(P.t * 4 + i) * 6;
        S.path([[x, -30], [x + w, -16], [x - w + (i - 2.5) * 4, -2]], null, false, { lw: 6, ink: S.ink });
        S.path([[x, -30], [x + w, -16], [x - w + (i - 2.5) * 4, -2]], null, false, { lw: 2.5, ink: P.fill });
      }
      S.ellipse(0, -50, 34, 30, P.fill);
      S.face(4, -50, 30, P.expr);
    },
  });
  def('snake', {
    kind: 'animal', w: 110, h: 34, fill: '#7cc36a', selfFace: true, aliases: ['serpent', 'python', 'cobra', 'worm', 'caterpillar', 'eel', 'noodle'],
    draw(A, P) {
      const pts = [];
      for (let i = 0; i <= 10; i++) pts.push([-55 + i * 10, -8 - Math.sin(i * 0.9 + P.t * 4) * 7]);
      S.path(pts, null, false, { lw: 14 });
      S.path(pts, null, false, { lw: 9, ink: P.fill });
      const hx = 58, hy = -10 - Math.sin(10 * 0.9 + P.t * 4) * 7;
      S.ellipse(hx, hy, 13, 10, P.fill);
      S.line(hx + 12, hy + 3, hx + 22, hy + 3 + Math.sin(P.t * 12) * 3, { ink: '#e8463b', lw: 2 });
      S.face(hx + 2, hy - 1, 14, P.expr);
    },
  });
  def('frog', {
    kind: 'animal', w: 56, h: 46, fill: '#72c25a', selfFace: true, legs: true, aliases: ['toad', 'tadpole', 'turtle', 'tortoise'],
    draw(A, P) {
      S.ellipse(-20, -8, 14, 9, P.fill); S.ellipse(20, -8, 14, 9, P.fill);
      S.ellipse(0, -20, 28, 20, P.fill);
      S.circle(-12, -40, 9, P.fill); S.circle(12, -40, 9, P.fill);
      S.dot(-12, -40, 3); S.dot(12, -40, 3);
      S.arc(0, -30, 14, PI * 0.15, PI * 0.85, { lw: 2 });
    },
  });
  def('spider', {
    kind: 'animal', w: 70, h: 44, fill: '#3b3f4a', selfFace: true, legs: true, aliases: ['tarantula', 'bug', 'ant', 'beetle', 'cockroach', 'scorpion', 'crab', 'lobster', 'tick'],
    draw(A, P) {
      for (let i = 0; i < 4; i++) {
        const k = Math.sin(P.t * 10 + i) * (P.moving ? 4 : 1);
        S.path([[-6, -20], [-22 - i * 4, -34 + i * 6 + k], [-30 - i * 3, -2]], null, false, { lw: 2 });
        S.path([[6, -20], [22 + i * 4, -34 + i * 6 - k], [30 + i * 3, -2]], null, false, { lw: 2 });
      }
      S.ellipse(0, -22, 20, 15, P.fill);
      S.ink = '#fff'; S.face(2, -24, 22, P.expr); S.ink = '#2a2a2a';
    },
  });
  def('bee', {
    kind: 'animal', w: 44, h: 40, fill: '#f6d743', selfFace: true, sky: true, wings: true, aliases: ['bumblebee', 'wasp', 'hornet', 'butterfly', 'moth', 'fly', 'mosquito', 'ladybug', 'firefly', 'dragonfly'],
    draw(A, P) {
      const f = Math.sin(P.t * 30) * 6;
      S.ellipse(-4, -34 - f * 0.5, 9, 14, 'rgba(200,230,255,.7)', { lw: 1.5 });
      S.ellipse(6, -34 + f * 0.5, 9, 14, 'rgba(200,230,255,.7)', { lw: 1.5 });
      S.ellipse(0, -18, 20, 14, P.fill);
      S.line(-6, -31, -8, -6, { lw: 4 }); S.line(4, -31, 3, -5, { lw: 4 });
      S.poly([[-20, -18], [-28, -16], [-20, -14]], '#333', { lw: 1 });
      S.face(10, -19, 16, P.expr);
    },
  });
  def('ghost', {
    kind: 'creature', w: 64, h: 90, fill: '#fbfbff', selfFace: true, sky: true, aliases: ['spirit', 'phantom', 'specter', 'spectre', 'poltergeist', 'boo'],
    draw(A, P) {
      const w = Math.sin(P.t * 6) * 4;
      S.path([[-30, -10], [-30, -60], [-18, -86], [18, -86], [30, -60], [30, -10], [20, -2 + w], [10, -12], [0, -2 - w], [-10, -12], [-20, -2 + w]], P.fill, true);
      S.face(0, -56, 34, P.expr === 'smile' ? 'surprised' : P.expr);
    },
  });
  def('robot', {
    kind: 'creature', w: 64, h: 120, fill: '#c4ccd6', selfFace: true, legs: true, aliases: ['android', 'cyborg', 'droid', 'bot', 'machine', 'transformer'],
    draw(A, P) {
      const s = P.moving ? Math.sin(P.walk) * 6 : 0;
      S.rect(-18 + s, -34, 10, 34, P.fill2); S.rect(8 - s, -34, 10, 34, P.fill2);
      S.rect(-28, -82, 56, 50, P.fill);
      S.rect(-16, -72, 32, 18, '#8fd1e8', { lw: 2 });
      S.dot(-8, -46, 4, '#e8463b'); S.dot(4, -46, 4, '#4cc36a');
      const a = Math.sin(P.t * 3) * 0.4;
      S.line(-28, -76, -44, -50 + a * 20); S.line(28, -76, 44, -50 - a * 20);
      S.rect(-20, -116, 40, 32, P.fill);
      S.line(0, -116, 0, -128); S.dot(0, -130, 4, Math.sin(P.t * 6) > 0 ? '#e8463b' : '#f6c945');
      S.face(0, -100, 26, P.expr);
    },
  });

  // ---------------------------------------------------------------- objects
  def('tree', {
    kind: 'object', w: 120, h: 180, fill: '#7cc36a', fill2: '#8b5a2b', face: [0, -120, 50], aliases: ['oak', 'pine', 'forest', 'bush', 'shrub', 'christmas tree', 'maple', 'willow', 'palm', 'palm tree', 'plant'],
    draw(A, P) {
      S.poly([[-12, 0], [-9, -80], [9, -80], [12, 0]], P.fill2);
      S.line(0, -60, -22, -84); S.line(2, -70, 24, -92);
      S.path([[-50, -100], [-58, -132], [-32, -166], [0, -178], [34, -166], [58, -134], [52, -100], [26, -84], [-24, -84]], P.fill, true);
    },
  });
  def('flower', {
    kind: 'object', w: 50, h: 80, fill: '#ff7eb6', face: [0, -62, 22], aliases: ['rose', 'daisy', 'tulip', 'sunflower', 'lily', 'flowers', 'bouquet', 'dandelion'],
    draw(A, P) {
      S.path([[0, 0], [3, -30], [0, -55]], null, false, { ink: '#4c9a3a' });
      S.ellipse(10, -24, 10, 5, '#7cc36a');
      for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2 + P.t * 0.3; S.circle(Math.cos(a) * 14, -62 + Math.sin(a) * 14, 9, P.fill); }
      S.circle(0, -62, 11, '#f6d743');
    },
  });
  def('cactus', {
    kind: 'object', w: 70, h: 110, fill: '#5fae5a', face: [0, -80, 26], aliases: ['cacti', 'succulent'],
    draw(A, P) {
      S.path([[-14, 0], [-14, -96], [0, -108], [14, -96], [14, 0]], P.fill, true);
      S.path([[-14, -50], [-32, -54], [-32, -80], [-24, -84]], null, false, { lw: 8 });
      S.path([[14, -40], [30, -46], [30, -72]], null, false, { lw: 8 });
    },
  });
  def('mushroom', {
    kind: 'object', w: 60, h: 64, fill: '#e8463b', face: [0, -20, 18], aliases: ['toadstool', 'fungus', 'shroom'],
    draw(A, P) {
      S.rect(-12, -34, 24, 34, '#f4ead6');
      S.path([[-32, -32], [-26, -56], [0, -64], [26, -56], [32, -32]], P.fill, true);
      S.dot(-12, -48, 4, '#fff'); S.dot(10, -52, 5, '#fff'); S.dot(20, -40, 3, '#fff');
    },
  });
  def('house', {
    kind: 'object', w: 160, h: 170, fill: '#f6d9a6', fill2: '#d9524a', face: [0, -60, 50], aliases: ['home', 'cabin', 'cottage', 'hut', 'building', 'barn', 'shed', 'school', 'church', 'mansion', 'igloo', 'tent'],
    draw(A, P) {
      S.rect(-70, -100, 140, 100, P.fill);
      S.poly([[-84, -98], [0, -168], [84, -98]], P.fill2);
      S.rect(-14, -50, 28, 50, '#a0703f');
      S.rect(-56, -80, 26, 24, '#cfeaff'); S.rect(30, -80, 26, 24, '#cfeaff');
      S.rect(40, -160, 16, 34, '#a0703f');
    },
  });
  def('castle', {
    kind: 'object', w: 200, h: 210, fill: '#cfc8bd', fill2: '#6a5acd', face: [0, -90, 50], aliases: ['palace', 'fort', 'fortress', 'tower', 'sandcastle', 'sand castle'],
    draw(A, P) {
      S.rect(-70, -120, 140, 120, P.fill);
      S.rect(-96, -160, 40, 160, P.fill); S.rect(56, -160, 40, 160, P.fill);
      S.poly([[-100, -158], [-76, -204], [-52, -158]], P.fill2); S.poly([[52, -158], [76, -204], [100, -158]], P.fill2);
      for (let i = 0; i < 5; i++) S.rect(-66 + i * 28, -134, 16, 14, P.fill);
      S.path([[-18, 0], [-18, -40], [0, -54], [18, -40], [18, 0]], '#7a5230', true);
    },
  });
  def('car', {
    kind: 'vehicle', w: 150, h: 72, fill: '#e8463b', face: [52, -40, 26], legs: true, aliases: ['truck', 'van', 'jeep', 'taxi', 'bus', 'race car', 'racecar', 'tractor', 'police car', 'firetruck', 'fire truck', 'ambulance', 'limo', 'motorcycle', 'vehicle', 'auto', 'automobile', 'minivan', 'suv', 'monster truck'],
    draw(A, P) {
      const sp = P.moving ? P.walk * 2 : 0;
      S.path([[-72, -20], [-72, -42], [-34, -46], [-18, -70], [28, -70], [44, -46], [72, -40], [72, -20]], P.fill, true);
      S.poly([[-12, -64], [-26, -46], [6, -46], [6, -64]], '#cfeaff', { lw: 2 });
      S.poly([[12, -64], [12, -46], [38, -46], [26, -64]], '#cfeaff', { lw: 2 });
      [-42, 44].forEach((x) => { S.circle(x, -16, 16, '#444'); S.circle(x, -16, 6, '#ccc'); S.line(x, -16, x + Math.cos(sp) * 14, -16 + Math.sin(sp) * 14, { lw: 2, ink: '#ddd' }); });
      S.dot(70, -34, 4, '#f6d743');
    },
  });
  def('rocket', {
    kind: 'vehicle', w: 80, h: 190, fill: '#f4f4f4', fill2: '#e8463b', face: [0, -110, 34], aliases: ['rocket ship', 'rocketship', 'spaceship', 'space ship', 'missile', 'shuttle', 'space shuttle'],
    draw(A, P) {
      S.poly([[-26, -40], [-48, 0], [-22, -10]], P.fill2); S.poly([[26, -40], [48, 0], [22, -10]], P.fill2);
      S.path([[-26, -10], [-28, -110], [0, -186], [28, -110], [26, -10]], P.fill, true);
      S.circle(0, -110, 14, '#8fd1e8');
      S.poly([[-8, -10], [0, 4], [8, -10]], P.fill2, { lw: 2 });
      if (A.statuses.has('flying') || A.thrust) for (let i = 0; i < 3; i++) S.poly([[-16, -8], [0, 30 + Math.random() * 40], [16, -8]], i ? '#f6d743' : '#f6913b', { lw: 2 });
    },
  });
  def('ufo', {
    kind: 'vehicle', w: 140, h: 70, fill: '#b9bfc9', face: [0, -30, 22], sky: true, aliases: ['flying saucer', 'saucer', 'spacecraft'],
    draw(A, P) {
      S.ellipse(0, -46, 30, 26, 'rgba(160,220,255,.6)');
      S.ellipse(0, -30, 70, 16, P.fill);
      for (let i = 0; i < 5; i++) S.dot(-48 + i * 24, -28, 4, (Math.floor(P.t * 6) + i) % 2 ? '#f6d743' : '#e8466b');
    },
  });
  def('boat', {
    kind: 'vehicle', w: 150, h: 140, fill: '#a0703f', face: [0, -20, 22], aliases: ['ship', 'sailboat', 'canoe', 'kayak', 'yacht', 'raft', 'pirate ship', 'submarine', 'titanic'],
    draw(A, P) {
      S.poly([[-74, -36], [74, -36], [52, 0], [-52, 0]], P.fill);
      S.line(0, -36, 0, -138);
      S.poly([[4, -132], [60, -48], [4, -48]], '#fbfbf7');
      S.poly([[0, -138], [-24, -130], [0, -122]], '#e8463b', { lw: 2 });
    },
  });
  def('bike', {
    kind: 'vehicle', w: 110, h: 70, fill: '#4c9be8', legs: true, aliases: ['bicycle', 'scooter', 'skateboard', 'unicycle', 'tricycle'],
    draw(A, P) {
      const sp = P.moving ? P.walk * 2 : 0;
      [-36, 36].forEach((x) => { S.circle(x, -24, 22, null); S.line(x, -24, x + Math.cos(sp) * 20, -24 + Math.sin(sp) * 20, { lw: 1.5 }); });
      S.poly([[-36, -24], [-6, -24], [20, -54], [-14, -54]], null, { ink: P.fill, lw: 5 });
      S.line(20, -54, 36, -24, { ink: P.fill, lw: 5 }); S.line(18, -54, 24, -66); S.line(16, -66, 30, -66);
      S.line(-14, -54, -16, -62); S.line(-24, -62, -8, -62, { lw: 5 });
    },
  });
  def('sun', {
    kind: 'object', w: 110, h: 110, fill: '#f6d743', face: [0, -55, 50], sky: true, aliases: ['sunshine', 'star sun'],
    draw(A, P) {
      for (let i = 0; i < 10; i++) { const a = (i / 10) * PI * 2 + P.t * 0.4; S.line(Math.cos(a) * 42, -55 + Math.sin(a) * 42, Math.cos(a) * 58, -55 + Math.sin(a) * 58, { ink: '#e8a33b' }); }
      S.circle(0, -55, 34, P.fill);
    },
  });
  def('moon', {
    kind: 'object', w: 90, h: 90, fill: '#f4f0d0', face: [0, -45, 40], sky: true, aliases: ['planet', 'earth', 'mars', 'jupiter', 'saturn', 'globe', 'asteroid', 'meteor', 'comet'],
    draw(A, P) {
      S.circle(0, -45, 40, P.fill);
      S.circle(-14, -60, 7, Color.shade(P.fill, -0.12), { lw: 1.5 }); S.circle(16, -34, 9, Color.shade(P.fill, -0.12), { lw: 1.5 }); S.circle(-10, -26, 5, Color.shade(P.fill, -0.12), { lw: 1.5 });
    },
  });
  def('star', {
    kind: 'object', w: 80, h: 80, fill: '#f6d743', face: [0, -38, 28], sky: true, aliases: ['stars', 'starfish', 'superstar'],
    draw(A, P) { S.star(0, -40, 40, P.fill); },
  });
  def('cloud', {
    kind: 'object', w: 130, h: 70, fill: '#ffffff', face: [0, -36, 30], sky: true, aliases: ['rain cloud', 'raincloud', 'storm', 'fog', 'smoke', 'tornado'],
    draw(A, P) {
      S.path([[-60, -16], [-64, -36], [-40, -50], [-24, -68], [10, -70], [30, -52], [56, -54], [66, -30], [52, -12]], P.fill, true);
    },
  });
  def('rainbow', {
    kind: 'object', w: 200, h: 110, fill: '#e8463b', face: [0, -86, 22], sky: true, aliases: [],
    draw(A, P) {
      ['#e8463b', '#f6913b', '#f6d743', '#72c25a', '#4c9be8', '#8a5fd0'].forEach((c, i) => S.arc(0, 0, 100 - i * 9, PI, PI * 2, { ink: c, lw: 9 }));
    },
  });
  def('rock', {
    kind: 'object', w: 90, h: 60, fill: '#9a9a9a', face: [0, -28, 30], aliases: ['stone', 'boulder', 'pebble', 'rocks', 'mountain', 'hill', 'brick', 'diamond', 'gem', 'crystal', 'gold', 'treasure'],
    draw(A, P) { S.path([[-44, 0], [-40, -34], [-14, -56], [20, -54], [42, -30], [46, 0]], P.fill, true); S.line(-10, -40, 4, -30, { lw: 1.5 }); },
  });
  def('volcano', {
    kind: 'object', w: 220, h: 160, fill: '#8b6a4a', face: [0, -60, 50], aliases: ['lava', 'magma'],
    draw(A, P) {
      S.poly([[-110, 0], [-30, -150], [30, -150], [110, 0]], P.fill);
      S.path([[-30, -150], [-20, -126], [-6, -140], [8, -120], [20, -138], [30, -150]], '#f6913b', true);
      if (Math.sin(P.t * 2) > 0) for (let i = 0; i < 3; i++) S.circle(-10 + i * 12, -170 - i * 14 - (P.t * 20 % 20), 10 + i * 3, '#bbb', { lw: 2 });
    },
  });
  def('snowman', {
    kind: 'object', w: 80, h: 150, fill: '#ffffff', face: [0, -122, 28], selfFace: false, aliases: ['snowmen', 'frosty', 'snowball'],
    draw(A, P) {
      S.circle(0, -34, 34, P.fill); S.circle(0, -86, 24, P.fill); S.circle(0, -124, 18, P.fill);
      S.poly([[2, -122], [22, -118], [2, -114]], '#f6913b', { lw: 1.5 });
      S.dot(0, -86, 3); S.dot(0, -72, 3); S.line(-22, -88, -48, -108); S.line(22, -88, 48, -108);
      S.dot(-6, -130, 2.5); S.dot(8, -130, 2.5);
    },
  });

  // food
  def('cake', {
    kind: 'food', w: 100, h: 100, fill: '#ff9dc4', fill2: '#fff3e0', face: [0, -36, 30], aliases: ['birthday cake', 'cupcake', 'cheesecake', 'pie', 'muffin', 'dessert', 'brownie', 'pudding'],
    draw(A, P) {
      S.rect(-46, -60, 92, 60, P.fill2);
      S.path([[-48, -58], [-48, -66], [48, -66], [48, -58], [36, -48], [24, -58], [10, -46], [-6, -58], [-20, -46], [-34, -58]], P.fill, true);
      [-24, 0, 24].forEach((x) => { S.rect(x - 3, -88, 6, 22, '#8fd1e8', { lw: 1.5 }); S.ellipse(x, -96 + Math.sin(P.t * 12 + x) * 1.5, 4, 7, '#f6913b', { lw: 1.5 }); });
    },
  });
  def('pizza', {
    kind: 'food', w: 90, h: 100, fill: '#f6c95a', face: [0, -50, 26], aliases: ['pizza slice', 'slice', 'pepperoni', 'nachos', 'quesadilla'],
    draw(A, P) {
      S.poly([[-42, -92], [42, -92], [0, 0]], P.fill);
      S.path([[-46, -96], [46, -96], [42, -84], [-42, -84]], '#d99a4a', true);
      S.dot(-16, -70, 7, '#d9524a'); S.dot(14, -64, 7, '#d9524a'); S.dot(0, -36, 6, '#d9524a');
    },
  });
  def('banana', {
    kind: 'food', w: 100, h: 60, fill: '#f6d743', face: [0, -26, 24], aliases: ['bananas', 'plantain'],
    draw(A, P) {
      S.path([[-48, -48], [-30, -12], [0, -2], [30, -12], [48, -48], [30, -26], [0, -18], [-30, -26]], P.fill, true);
      S.line(-48, -48, -52, -56, { lw: 4 });
    },
  });
  def('apple', {
    kind: 'food', w: 70, h: 80, fill: '#e8463b', face: [0, -34, 30], aliases: ['apples', 'tomato', 'cherry', 'peach', 'orange', 'plum', 'lemon', 'grape', 'grapes', 'fruit', 'pear', 'meatball', 'strawberry', 'blueberry', 'berry'],
    draw(A, P) {
      S.path([[0, -58], [-26, -64], [-36, -36], [-22, -4], [0, -8], [22, -4], [36, -36], [26, -64]], P.fill, true);
      S.line(0, -58, 4, -74, { lw: 3 }); S.ellipse(14, -70, 10, 5, '#7cc36a');
    },
  });
  def('donut', {
    kind: 'food', w: 80, h: 80, fill: '#ff9dc4', fill2: '#e3a96a', face: [0, -40, 30], aliases: ['doughnut', 'bagel', 'cookie', 'cookies', 'pancake', 'pancakes', 'waffle', 'cracker', 'biscuit'],
    draw(A, P) {
      S.circle(0, -40, 38, P.fill2); S.circle(0, -40, 32, P.fill, { lw: 2 }); S.circle(0, -40, 11, '#fffaf0');
      for (let i = 0; i < 7; i++) { const a = i * 0.9; S.line(Math.cos(a) * 22, -40 + Math.sin(a) * 22, Math.cos(a) * 22 + 5, -40 + Math.sin(a) * 22 + 2, { lw: 2.5, ink: ['#4c9be8', '#f6d743', '#72c25a'][i % 3] }); }
    },
  });
  def('ice cream', {
    kind: 'food', w: 60, h: 110, fill: '#ff9dc4', fill2: '#e3a96a', face: [0, -78, 26], aliases: ['icecream', 'ice-cream', 'ice cream cone', 'popsicle', 'sundae', 'gelato', 'frozen yogurt', 'cone', 'milkshake', 'smoothie'],
    draw(A, P) {
      S.poly([[-24, -60], [24, -60], [0, 0]], P.fill2);
      S.line(-12, -44, 8, -20, { lw: 1.5 }); S.line(12, -44, -8, -20, { lw: 1.5 });
      S.circle(0, -78, 26, P.fill);
      S.dot(0, -108, 6, '#e8463b');
    },
  });
  def('burger', {
    kind: 'food', w: 100, h: 80, fill: '#e3a96a', face: [0, -54, 26], aliases: ['hamburger', 'cheeseburger', 'sandwich', 'sub', 'hotdog', 'hot dog', 'taco', 'burrito', 'sushi', 'pickle', 'potato', 'fries', 'french fries', 'chicken nugget', 'nugget', 'nuggets', 'meat', 'steak', 'bacon', 'food', 'lunch', 'dinner', 'breakfast'],
    draw(A, P) {
      S.path([[-46, -10], [-46, -2], [46, -2], [46, -10]], P.fill, true);
      S.rect(-48, -24, 96, 14, '#7a4a2a');
      S.path([[-50, -24], [-40, -30], [-24, -24], [-8, -30], [8, -24], [24, -30], [40, -24], [50, -24]], '#72c25a', true);
      S.path([[-46, -30], [-40, -64], [0, -76], [40, -64], [46, -30]], P.fill, true);
      S.dot(-14, -56, 2, '#fff'); S.dot(8, -62, 2, '#fff'); S.dot(20, -50, 2, '#fff');
    },
  });
  def('cheese', {
    kind: 'food', w: 90, h: 60, fill: '#f6d743', face: [0, -28, 26], aliases: ['cheddar', 'butter', 'tofu', 'jello', 'jelly'],
    draw(A, P) { S.poly([[-44, 0], [-44, -40], [44, -60], [44, 0]], P.fill); S.circle(-20, -24, 6, Color.shade(P.fill, -0.15), { lw: 1.5 }); S.circle(18, -18, 8, Color.shade(P.fill, -0.15), { lw: 1.5 }); },
  });
  def('carrot', {
    kind: 'food', w: 40, h: 100, fill: '#f6913b', face: [0, -60, 18], aliases: ['carrots', 'broccoli', 'vegetable', 'veggie', 'veggies', 'corn', 'cucumber', 'celery', 'pepper', 'onion'],
    draw(A, P) { S.poly([[-16, -80], [16, -80], [0, 0]], P.fill); S.line(-4, -80, -10, -100, { ink: '#4c9a3a', lw: 4 }); S.line(4, -80, 10, -100, { ink: '#4c9a3a', lw: 4 }); },
  });
  def('egg', {
    kind: 'food', w: 54, h: 70, fill: '#fbf6ea', face: [0, -30, 26], aliases: ['eggs', 'omelet', 'potato', 'peanut', 'bean', 'jellybean'],
    draw(A, P) { S.path([[0, -70], [-24, -50], [-27, -18], [0, 0], [27, -18], [24, -50]], P.fill, true); },
  });

  // stuff
  def('ball', {
    kind: 'object', w: 60, h: 60, fill: '#e8463b', face: [0, -30, 26], aliases: ['soccer ball', 'football', 'basketball', 'baseball', 'beach ball', 'beachball', 'bowling ball', 'marble', 'bubble', 'orb', 'blob'],
    draw(A, P) { S.circle(0, -30, 29, P.fill); S.arc(0, -30, 20, PI * 1.1, PI * 1.5, { ink: '#fff', lw: 3 }); },
  });
  def('balloon', {
    kind: 'object', w: 50, h: 120, fill: '#e8466b', face: [0, -88, 26], sky: true, aliases: ['balloons', 'hot air balloon', 'kite'],
    draw(A, P) {
      S.path([[0, -64], [4, -40], [-4, -20], [2, 0]], null, false, { lw: 1.5 });
      S.path([[0, -64], [-24, -86], [-20, -112], [0, -118], [20, -112], [24, -86]], P.fill, true);
      S.poly([[-4, -60], [0, -66], [4, -60]], P.fill, { lw: 1.5 });
    },
  });
  def('present', {
    kind: 'object', w: 80, h: 90, fill: '#4c9be8', fill2: '#f6d743', face: [0, -36, 28], aliases: ['gift', 'box', 'package', 'parcel', 'crate', 'chest', 'treasure chest'],
    draw(A, P) {
      S.rect(-36, -64, 72, 64, P.fill); S.rect(-40, -76, 80, 14, P.fill);
      S.rect(-6, -76, 12, 76, P.fill2, { lw: 2 });
      S.ellipse(-14, -86, 14, 9, P.fill2, { lw: 2 }); S.ellipse(14, -86, 14, 9, P.fill2, { lw: 2 });
    },
  });
  def('bomb', {
    kind: 'object', w: 70, h: 90, fill: '#3b3f4a', face: [0, -34, 28], aliases: ['dynamite', 'firework', 'fireworks', 'cannonball', 'tnt'],
    draw(A, P) {
      S.circle(0, -34, 32, P.fill); S.rect(-8, -72, 16, 10, '#666');
      S.path([[0, -72], [8, -82], [16, -80]], null, false, { lw: 2 });
      S.star(17, -82 + Math.sin(P.t * 20) * 2, 6 + Math.sin(P.t * 30) * 2, '#f6d743');
    },
  });
  def('toilet', {
    kind: 'object', w: 70, h: 100, fill: '#ffffff', face: [0, -70, 24], aliases: ['potty', 'bathtub', 'tub', 'sink'],
    draw(A, P) {
      S.rect(-30, -100, 34, 50, P.fill);
      S.poly([[-30, -54], [34, -54], [24, -30], [10, -26], [12, 0], [-22, 0], [-20, -26]], P.fill);
      S.ellipse(4, -54, 30, 7, '#dfeef8', { lw: 2 });
    },
  });
  def('chair', {
    kind: 'object', w: 60, h: 100, fill: '#a0703f', face: [0, -70, 22], aliases: ['couch', 'sofa', 'bench', 'throne', 'stool', 'bed', 'table', 'desk'],
    draw(A, P) {
      S.line(-22, -50, -24, 0, { lw: 5 }); S.line(22, -50, 24, 0, { lw: 5 });
      S.rect(-28, -54, 56, 10, P.fill); S.rect(-28, -100, 10, 50, P.fill); S.rect(-28, -100, 52, 12, P.fill);
    },
  });
  def('tv', {
    kind: 'object', w: 110, h: 100, fill: '#3b3f4a', face: [0, -54, 34], aliases: ['television', 'computer', 'laptop', 'phone', 'cellphone', 'iphone', 'tablet', 'ipad', 'video game', 'xbox', 'playstation', 'nintendo', 'screen', 'monitor'],
    draw(A, P) {
      S.line(-20, -20, -30, 0); S.line(20, -20, 30, 0);
      S.rect(-52, -96, 104, 76, P.fill);
      S.rect(-42, -88, 84, 58, `hsl(${(P.t * 80) % 360},70%,75%)`, { lw: 2 });
    },
  });
  def('guitar', {
    kind: 'object', w: 60, h: 130, fill: '#d98a3b', face: [0, -30, 22], aliases: ['violin', 'ukulele', 'banjo', 'cello', 'instrument', 'drum', 'drums', 'trumpet', 'piano', 'tuba', 'saxophone'],
    draw(A, P) {
      S.rect(-5, -128, 10, 80, '#7a4a2a', { lw: 2 });
      S.path([[0, -64], [-22, -66], [-24, -46], [-28, -18], [0, -2], [28, -18], [24, -46], [22, -66]], P.fill, true);
      S.circle(0, -38, 8, '#3b2a1a', { lw: 2 });
    },
  });
  def('book', {
    kind: 'object', w: 80, h: 70, fill: '#4c9be8', face: [0, -34, 26], aliases: ['books', 'notebook', 'homework', 'magazine', 'newspaper', 'letter', 'map', 'paper', 'comic', 'diary'],
    draw(A, P) { S.rect(-34, -64, 68, 64, P.fill); S.rect(-28, -58, 54, 56, '#fffaf0', { lw: 1.5 }); S.line(-18, -46, 16, -46, { lw: 1.5 }); },
  });
  def('hat', {
    kind: 'object', w: 80, h: 60, fill: '#3b3f4a', face: [0, -30, 22], aliases: ['top hat', 'cap', 'helmet', 'crown', 'sombrero', 'wig'],
    draw(A, P) { S.ellipse(0, -6, 40, 7, P.fill); S.rect(-24, -58, 48, 52, P.fill); S.rect(-24, -20, 48, 9, '#e8463b', { lw: 2 }); },
  });
  def('shoe', {
    kind: 'object', w: 90, h: 50, fill: '#e8463b', face: [10, -24, 20], legs: true, aliases: ['shoes', 'boot', 'boots', 'sneaker', 'sneakers', 'sock', 'socks', 'slipper', 'sandal', 'pants', 'shirt', 'underwear', 'diaper'],
    draw(A, P) { S.path([[-40, 0], [-40, -44], [-14, -44], [-12, -24], [30, -22], [44, -10], [44, 0]], P.fill, true); S.line(-40, -6, 44, -6, { lw: 2 }); },
  });
  def('umbrella', {
    kind: 'object', w: 100, h: 110, fill: '#8a5fd0', face: [0, -70, 22], aliases: ['parasol'],
    draw(A, P) { S.path([[0, -84], [2, -6], [10, 0], [16, -8]], null, false); S.path([[-50, -76], [-36, -104], [0, -112], [36, -104], [50, -76], [25, -84], [0, -76], [-25, -84]], P.fill, true); },
  });
  def('lamp', {
    kind: 'object', w: 60, h: 110, fill: '#f6d743', face: [0, -82, 20], aliases: ['light', 'lightbulb', 'light bulb', 'candle', 'flashlight', 'lantern', 'torch'],
    draw(A, P) { S.ellipse(0, -4, 22, 5, '#666'); S.line(0, -4, 0, -70); S.poly([[-26, -66], [-14, -104], [14, -104], [26, -66]], P.fill); },
  });
  def('bucket', {
    kind: 'object', w: 60, h: 60, fill: '#4c9be8', face: [0, -26, 22], aliases: ['pail', 'cup', 'mug', 'bowl', 'pot', 'jar', 'trash can', 'garbage can', 'bottle', 'can', 'soda', 'juice', 'coffee', 'milk', 'tea'],
    draw(A, P) { S.poly([[-28, -52], [28, -52], [20, 0], [-20, 0]], P.fill); S.arc(0, -52, 26, PI, PI * 2, { lw: 2 }); },
  });
  def('sword', {
    kind: 'object', w: 40, h: 120, fill: '#d6dde6', face: [0, -80, 14], aliases: ['knife', 'spoon', 'fork', 'spatula', 'stick', 'wand', 'magic wand', 'broom', 'mop', 'bat', 'baseball bat', 'frying pan', 'pan', 'hammer', 'shovel', 'axe', 'lightsaber', 'pencil', 'pen', 'crayon', 'toothbrush'],
    draw(A, P) { S.rect(-4, -26, 8, 26, '#7a4a2a', { lw: 2 }); S.rect(-16, -30, 32, 6, '#7a4a2a', { lw: 2 }); S.poly([[-7, -32], [-7, -106], [0, -120], [7, -106], [7, -32]], P.fill); },
  });
  def('flag', {
    kind: 'object', w: 60, h: 110, fill: '#e8463b', face: [22, -86, 20], aliases: ['flags', 'banner', 'sign', 'pole', 'trophy', 'medal'],
    draw(A, P) {
      S.line(-20, 0, -20, -108, { lw: 4 });
      const w = Math.sin(P.t * 5) * 5;
      S.path([[-20, -106], [10, -110 + w], [40, -102], [30 - w, -86], [40, -70], [10, -74 - w], [-20, -70]], P.fill, true);
    },
  });
  def('wave', {
    kind: 'object', w: 220, h: 140, fill: '#6bb6ea', face: [20, -60, 34], aliases: ['tsunami', 'water', 'flood', 'ocean wave', 'splash'],
    draw(A, P) {
      const w = Math.sin(P.t * 4) * 6;
      S.path([[-110, 0], [-90, -50], [-40, -110], [20, -136 + w], [70, -120], [90, -90], [60, -96], [40, -80], [60, -60], [100, -40], [110, 0]], P.fill, true);
      S.path([[-60, -70], [-20, -100], [20, -116]], null, false, { ink: '#fff', lw: 3 });
    },
  });

  // fallback: a googly-eyed mystery blob with the word written on it
  def('blob', {
    kind: 'blob', w: 110, h: 90, fill: '#ffd36e', face: [0, -62, 30], alwaysFace: true,
    draw(A, P) {
      const w = Math.sin(P.t * 3) * 3;
      S.line(-24, -14, -28, 0, { lw: 3 }); S.line(24, -14, 28, 0, { lw: 3 });
      S.path([[-52, -14], [-56, -50 + w], [-40, -84], [0, -90 - w], [40, -84], [56, -50 + w], [52, -14], [0, -10]], P.fill, true);
      const label = (A.word || '?').slice(0, 14);
      const size = label.length > 9 ? 15 : 20;
      S.text(label, 0, -34, size, S.ink, { weight: 'bold' });
    },
  });

  // ---- shared accessories drawn on top of any actor ----
  function drawAccessory(type, A, P) {
    const d = A.def;
    const [fx, fy, fs] = d.face;
    switch (type) {
      case 'sunglasses':
        S.rect(fx - fs * 0.55, fy - fs * 0.22, fs * 0.45, fs * 0.28, '#222', { lw: 2 });
        S.rect(fx + fs * 0.1, fy - fs * 0.22, fs * 0.45, fs * 0.28, '#222', { lw: 2 });
        S.line(fx - fs * 0.1, fy - fs * 0.14, fx + fs * 0.1, fy - fs * 0.14, { lw: 2 });
        break;
      case 'glasses':
        S.circle(fx - fs * 0.32, fy - fs * 0.1, fs * 0.2, 'rgba(255,255,255,.3)', { lw: 2 });
        S.circle(fx + fs * 0.32, fy - fs * 0.1, fs * 0.2, 'rgba(255,255,255,.3)', { lw: 2 });
        S.line(fx - fs * 0.12, fy - fs * 0.12, fx + fs * 0.12, fy - fs * 0.12, { lw: 2 });
        break;
      case 'halo':
        S.ellipse(0, -d.h - 14, 20, 6, null, { ink: '#e8b923', lw: 4 });
        break;
      case 'horns':
        S.poly([[-16, -d.h + 6], [-22, -d.h - 18], [-6, -d.h + 2]], '#d9524a', { lw: 2 });
        S.poly([[16, -d.h + 6], [22, -d.h - 18], [6, -d.h + 2]], '#d9524a', { lw: 2 });
        break;
      case 'crown': case 'party': case 'wizard': case 'cowboy': case 'pirate': case 'chef':
        if (d.kind === 'person') { A.hat = type; return; }
        drawHat(type, 0, -d.h + 6, Math.max(10, d.w * 0.14));
        break;
      case 'cape':
        break;
    }
  }

  window.THINGS = THINGS;
  window.Doodle = { drawAccessory, drawHat, ROLES };
})();
