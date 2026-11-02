// stage.js — the animation engine: actors, particles, speech bubbles, camera shake.
(function () {
  const { W, H, G } = Places;
  const S = Sk;
  const PI = Math.PI;
  const lerp = (a, b, k) => a + (b - a) * k;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const SKY_ALT = { sun: 300, moon: 300, star: 290, cloud: 280, rainbow: 190, ufo: 220, balloon: 90, bee: 110, ghost: 40 };

  class Actor {
    constructor(id, def, o) {
      this.id = id; this.def = def;
      this.word = o.word || ''; this.label = o.label || '';
      this.labelUntil = o.labelFor != null ? o.labelFor : Infinity;
      this.x = o.x != null ? o.x : W / 2; this.y = G;
      this.alt = o.alt != null ? o.alt : (def.sky ? (SKY_ALT[def.key] || 200) : 0);
      this.scale = this.targetScale = (o.scale || 1) * (def.small || 1);
      this.sx0 = 1; this.sy0 = 1; this.flipY = false;
      this.color = o.color || null; this.alpha = 1; this.alphaTarget = 1;
      this.dir = o.dir || 1;
      this.statuses = new Set(); this.acc = new Set();
      this.mood = 'smile';
      this.alive = !!(def.selfFace || def.alwaysFace);
      this.walk = 0; this.gone = false; this.anim = null; this.z = o.z || 0;
      this.emit = {};
      this.resetT();
    }
    resetT() { this.dx = 0; this.dy = 0; this.rot = 0; this.sx = 1; this.sy = 1; this.pose = null; this.expr = null; this.pivot = 'center'; this.moving = false; }
    get w() { return this.def.w * this.scale * this.sx0; }
    get h() { return this.def.h * this.scale * this.sy0; }
    get top() { return this.y - this.alt + this.dy - this.h; }
    get cx() { return this.x + this.dx; }
    get cy() { return this.y - this.alt + this.dy - this.h / 2; }
    get isPerson() { return this.def.kind === 'person'; }
  }

  class Stage {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.actors = []; this.fx = []; this.bubbles = []; this.groups = {};
      this.time = 0; this.seed = 1; this.shake = 0; this.flash = 0; this.zc = 0;
      this.place = PLACES.park; this.oldPlace = null; this.fade = 1;
      this.speedMul = 1;
      this.resize();
      window.addEventListener('resize', () => this.resize());
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        this.tick(dt * this.speedMul); this.draw();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = this.canvas.getBoundingClientRect();
      const w = Math.max(320, r.width || W);
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(w * (H / W) * dpr);
      this.pxScale = this.canvas.width / W;
    }

    // ------------------------------------------------------------ scene
    reset(placeKey) {
      for (const a of this.actors) if (a.anim) a.anim.res();
      this.actors = []; this.fx = []; this.bubbles = []; this.groups = {};
      this.place = this.placeFor(placeKey || 'park'); this.oldPlace = null; this.fade = 1;
    }
    placeFor(key) {
      if (typeof key === 'object') return key;
      return PLACES[key] || Places.signFor(key);
    }
    setPlace(key) {
      const p = this.placeFor(key);
      if (p.key === this.place.key) return;
      this.oldPlace = this.place; this.place = p; this.fade = 0;
      Sfx.play('whoosh');
    }

    add(id, thingKey, o) {
      o = o || {};
      const def = THINGS[thingKey] || THINGS.blob;
      const a = new Actor(id, def, o);
      a.z = ++this.zc;
      const old = this.actors.findIndex((x) => x.id === id);
      if (old >= 0) this.actors.splice(old, 1);
      this.actors.push(a);
      return a;
    }
    get(id) {
      return this.actors.find((a) => a.id === id) || null;
    }
    resolve(id) {
      if (!id) return [];
      if (id === 'all') return this.actors.filter((a) => !a.gone && !a.def.sky && !a.scenery);
      if (this.groups[id]) return this.groups[id].filter((a) => this.actors.includes(a));
      const a = this.get(id);
      return a ? [a] : [];
    }
    wait(sec) { return new Promise((r) => setTimeout(r, (sec * 1000) / this.speedMul)); }

    // ------------------------------------------------------------ animation
    anim(A, spec, o) {
      return new Promise((res) => {
        if (A.anim) this._end(A);
        const st = { o: o || {} };
        A.anim = { spec, t: 0, dur: Math.max(0.05, spec.dur || 1), st, res };
        if (spec.sfx) Sfx.play(spec.sfx);
        if (spec.start) spec.start(A, this, st);
      });
    }
    _end(A) {
      const a = A.anim; if (!a) return;
      A.anim = null;
      if (a.spec.end) a.spec.end(A, this, a.st);
      a.res();
    }

    walkTo(A, x, speed) {
      speed = speed || 230;
      const x0 = A.x;
      const d = Math.abs(x - x0);
      if (d < 4) return Promise.resolve();
      A.dir = x > x0 ? 1 : -1;
      const legs = A.isPerson || A.def.legs || A.def.kind === 'animal';
      return this.anim(A, {
        dur: d / speed,
        update(A, p, t) {
          A.x = lerp(x0, x, p); A.moving = true;
          if (!legs) { A.dy = -Math.abs(Math.sin(t * 10)) * 12; A.rot = Math.sin(t * 10) * 0.08; }
          if (A.def.swims) { A.dy = Math.sin(t * 6) * 6; }
        },
      });
    }

    // fade a gone actor back in (so later sentences can still use it)
    async reappear(A, x) {
      A.gone = false; A.statuses.clear(); A.alpha = 0; A.alphaTarget = 1;
      if (x != null) A.x = x;
      if (A.x < 40 || A.x > W - 40) A.x = rand(200, W - 200);
      if (!A.def.sky) A.alt = 0;
      this.poof(A.cx, A.cy, 10);
      await this.wait(0.3);
    }

    // ------------------------------------------------------------ effects
    particle(p) {
      p.life = 0; p.max = p.max || 1; p.vx = p.vx || 0; p.vy = p.vy || 0; p.g = p.g || 0; p.rot = p.rot || 0; p.vr = p.vr || 0; p.size = p.size || 8;
      this.fx.push(p);
      return p;
    }
    text(x, y, str, o) {
      o = o || {};
      return this.particle({ kind: 'text', x, y, text: str, size: o.size || 30, color: o.color || '#2a2a2a', vy: o.vy != null ? o.vy : -30, max: o.max || 1.4, rot: o.rot != null ? o.rot : rand(-0.15, 0.15), vx: o.vx || 0, pop: true, outline: o.outline != null ? o.outline : 6 });
    }
    burst(str, x, y, o) {
      o = o || {};
      this.particle({ kind: 'burst', x: x != null ? x : W / 2, y: y != null ? y : H * 0.38, text: str, size: o.size || 64, max: o.max || 1.8, color: o.color || '#e8463b', fill: o.fill || '#f6d743', rot: rand(-0.12, 0.12) });
    }
    poof(x, y, n) {
      Sfx.play('poof');
      for (let i = 0; i < (n || 12); i++) { const a = rand(0, PI * 2), s = rand(40, 140); this.particle({ kind: 'smoke', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, max: rand(0.5, 0.9), size: rand(12, 24) }); }
    }
    confetti(x, y, n) {
      for (let i = 0; i < (n || 40); i++) this.particle({ kind: 'confetti', x, y, vx: rand(-260, 260), vy: rand(-420, -120), g: 500, max: rand(1.4, 2.4), size: rand(5, 9), color: pick(['#e8466b', '#f6d743', '#4c9be8', '#72c25a', '#ff9de0', '#f6913b']), vr: rand(-10, 10) });
    }
    bubble(A, str, dur) {
      this.bubbles = this.bubbles.filter((b) => b.A !== A);
      this.bubbles.push({ A, text: str, until: this.time + (dur || 2.2), born: this.time });
    }
    debris(A, n) {
      const fill = A.color || A.def.fill || '#ccc';
      for (let i = 0; i < (n || 26); i++) {
        const a = rand(0, PI * 2), s = rand(150, 520);
        this.particle({ kind: 'debris', x: A.cx + rand(-A.w / 3, A.w / 3), y: A.cy + rand(-A.h / 3, A.h / 3), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 200, g: 900, max: rand(1, 1.8), size: rand(6, 16), color: pick([fill, Color.shade(fill, -0.3), '#f6913b', '#3b3f4a']), vr: rand(-12, 12), ground: true });
      }
    }

    // ------------------------------------------------------------ update
    tick(dt) {
      this.time += dt;
      const ns = Math.floor(this.time / 0.11);
      if (ns !== this.seed) this.seed = ns;
      this.shake *= Math.pow(0.02, dt);
      this.flash = Math.max(0, this.flash - dt * 2.5);
      if (this.fade < 1) this.fade = Math.min(1, this.fade + dt * 1.6);

      for (const A of this.actors) {
        A.resetT();
        A.scale = lerp(A.scale, A.targetScale, Math.min(1, dt * 6));
        A.alpha = lerp(A.alpha, A.statuses.has('invisible') ? 0.18 : A.alphaTarget, Math.min(1, dt * 4));
        if (A.gone) { if (A.anim) this._tickAnim(A, dt); continue; }
        Effects.statusTick(A, this, dt);
        if (A.anim) this._tickAnim(A, dt);
        if (A.moving) A.walk += dt * 13;
        if (A.statuses.has('frozen')) { A.dx = 0; A.dy = 0; A.sx = 1; A.sy = 1; A.pose = null; A.moving = false; A.expr = 'surprised'; }
      }
      for (const p of this.fx) {
        p.life += dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.ground && p.y > G + 30) { p.y = G + 30; p.vy *= -0.3; p.vx *= 0.6; p.vr *= 0.5; }
        if (p.kind === 'smoke' || p.kind === 'puff') { p.vx *= Math.pow(0.05, dt); p.vy *= Math.pow(0.05, dt); p.size += dt * 20; }
      }
      this.fx = this.fx.filter((p) => p.life < p.max);
      this.bubbles = this.bubbles.filter((b) => b.until > this.time && this.actors.includes(b.A) && !b.A.gone);
    }
    _tickAnim(A, dt) {
      const a = A.anim;
      a.t += dt;
      const p = Math.min(1, a.t / a.dur);
      if (a.spec.update) a.spec.update(A, p, a.t, dt, this, a.st);
      if (p >= 1 && A.anim === a) this._end(A);
    }

    // ------------------------------------------------------------ draw
    draw() {
      const c = this.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, this.canvas.width, this.canvas.height);
      c.setTransform(this.pxScale, 0, 0, this.pxScale, 0, 0);
      if (this.shake > 0.5) c.translate(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake);
      S.begin(c, this.seed);
      const dark = !!this.place.dark;

      const toon = S.toon;
      S.lw = toon ? 2.6 : 3; S.amp = toon ? 0.9 : 1.4;
      const css = toon ? 'saturate(1.3) contrast(1.05)' : 'none';
      if (this.canvas.style.filter !== css) this.canvas.style.filter = css;
      // backdrop, cross-fading between places
      S.ink = '#9a9a9a';
      if (this.oldPlace && this.fade < 1) {
        S.ink = this.oldPlace.dark ? '#c8c8de' : '#9a9a9a';
        this.oldPlace.draw(this.time);
        c.globalAlpha = this.fade;
      }
      S.ink = dark ? '#c8c8de' : '#9a9a9a';
      this.place.draw(this.time);
      c.globalAlpha = 1;
      if (toon) {
        // soften the backdrop so the bold actors pop
        c.fillStyle = dark ? 'rgba(10,8,40,.18)' : 'rgba(255,250,240,.12)';
        c.fillRect(0, 0, W, H);
      }
      S.ink = dark ? '#f4f1e8' : (toon ? '#1b1530' : '#2a2a2a');
      S.lw = toon ? 4.4 : 3;

      const list = this.actors.filter((a) => !a.gone).sort((a, b) => (a.def.sky ? 0 : 1) - (b.def.sky ? 0 : 1) || a.z - b.z);
      // shadows
      for (const A of list) {
        if (A.def.sky && A.alt > 100) continue;
        const k = Math.max(0.15, 1 - (A.alt - A.dy * -1) / 400);
        c.fillStyle = `rgba(0,0,0,${0.12 * k * A.alpha})`;
        c.beginPath(); c.ellipse(A.cx, G + 4, (A.w / 2) * k * 0.9, 7 * k, 0, 0, PI * 2); c.fill();
      }
      for (const A of list) this.drawActor(A);
      for (const p of this.fx) this.drawParticle(p);
      for (const b of this.bubbles) this.drawBubble(b);
      if (toon) this.drawFinish(c);
      if (this.flash > 0) { c.fillStyle = `rgba(255,250,220,${this.flash * 0.8})`; c.fillRect(-20, -20, W + 40, H + 40); }
    }

    // toon finish: vignette + a little paper grain
    drawFinish(c) {
      if (!this._vig) {
        const g = c.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.5, W * 0.7);
        g.addColorStop(0, 'rgba(20,10,50,0)'); g.addColorStop(1, 'rgba(20,10,50,.28)');
        this._vig = g;
        const n = document.createElement('canvas'); n.width = n.height = 128;
        const nc = n.getContext('2d'); const img = nc.createImageData(128, 128);
        for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 22; }
        nc.putImageData(img, 0, 0);
        this._grain = c.createPattern(n, 'repeat');
      }
      c.fillStyle = this._vig; c.fillRect(-20, -20, W + 40, H + 40);
      c.fillStyle = this._grain; c.fillRect(-20, -20, W + 40, H + 40);
    }

    drawActor(A) {
      const c = this.ctx, def = A.def;
      const s = A.scale;
      const sx = s * A.sx0 * A.sx, sy = s * A.sy0 * A.sy;
      const h = def.h * sy;
      c.save();
      c.globalAlpha = A.alpha;
      c.translate(A.x + A.dx, A.y - A.alt + A.dy);
      Effects.drawBehind(A, this);
      if (A.pivot === 'center') { c.translate(0, -h / 2); c.rotate(A.rot); c.translate(0, h / 2); }
      else c.rotate(A.rot);
      if (A.flipY) { c.translate(0, -h); c.scale(1, -1); }
      c.scale(sx * A.dir, sy);
      S.unit = Math.max(0.3, (Math.abs(sx) + Math.abs(sy)) / 2);
      const P = {
        t: this.time + A.z, walk: A.walk, moving: A.moving, pose: A.pose,
        fill: A.color || def.fill || '#ddd',
        fill2: A.color ? Color.shade(A.color, -0.2) : (def.fill2 || Color.shade(def.fill || '#dddddd', -0.2)),
        expr: A.expr || Effects.statusExpr(A) || A.mood,
      };
      S.shade = true;
      def.draw(A, P);
      if (!def.selfFace && (A.alive || def.alwaysFace)) {
        const [fx, fy, fs] = def.face;
        if (def.key === 'blob') S.face(fx, fy, fs, P.expr);
        else { S.circle(fx - fs * 0.32, fy - fs * 0.12, fs * 0.2, '#fff', { lw: 1.5 }); S.circle(fx + fs * 0.32, fy - fs * 0.12, fs * 0.2, '#fff', { lw: 1.5 }); S.face(fx, fy, fs, P.expr); }
      }
      for (const acc of A.acc) Doodle.drawAccessory(acc, A, P);
      S.shade = false;
      Effects.drawLocal(A, this, P);
      S.unit = 1;
      c.restore();
      Effects.drawWorld(A, this);
      // word label
      const showLabel = A.label && (this.time < A.labelUntil || A.labelUntil === Infinity);
      if (showLabel) {
        const fadeK = A.labelUntil === Infinity ? 1 : Math.min(1, (A.labelUntil - this.time) / 0.6);
        c.save(); c.globalAlpha = Math.max(0, fadeK) * Math.max(0.3, A.alpha);
        const ly = Math.min(H - 14, A.y - A.alt + 26);
        S.text(A.label, A.x + A.dx, ly, A.labelUntil === Infinity ? 22 : 19, this.place.dark ? '#fff' : '#2a2a2a', { outline: 5, outlineColor: this.place.dark ? '#2c2f5e' : 'rgba(255,255,255,.9)', weight: 'bold' });
        c.restore();
      }
    }

    drawParticle(p) {
      const c = this.ctx;
      const k = p.life / p.max;
      c.save();
      c.translate(p.x, p.y); c.rotate(p.rot);
      c.globalAlpha = Math.max(0, Math.min(1, (1 - k) * 2));
      const ink = S.ink;
      switch (p.kind) {
        case 'debris': S.poly([[-p.size / 2, -p.size / 3], [p.size / 2, -p.size / 2], [p.size / 3, p.size / 2], [-p.size / 2, p.size / 3]], p.color, { lw: 2 }); break;
        case 'smoke': case 'puff': S.circle(0, 0, p.size, p.color || 'rgba(230,230,230,.95)', { lw: 2, ink: '#aaa' }); break;
        case 'spark': S.star(0, 0, p.size, p.color || '#f6d743'); break;
        case 'confetti': c.fillStyle = p.color; c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); break;
        case 'note': S.text(p.text || '♪', 0, 0, p.size, p.color || ink); break;
        case 'heart': S.heart(0, 0, p.size, '#e8466b'); break;
        case 'zzz': S.text('Z', 0, 0, p.size, ink, { weight: 'bold' }); break;
        case 'drop': S.path([[0, -p.size], [-p.size * 0.6, p.size * 0.2], [0, p.size * 0.7], [p.size * 0.6, p.size * 0.2]], p.color || '#6bb6ea', true, { lw: 1.5 }); break;
        case 'flame': {
          const s = p.size * (1 - k * 0.6);
          S.path([[0, -s * 1.4], [-s * 0.7, 0], [0, s * 0.6], [s * 0.7, 0]], k < 0.4 ? '#f6d743' : '#f6913b', true, { lw: 1.5, ink: '#d9524a' });
          break;
        }
        case 'bubble': S.circle(0, 0, p.size, 'rgba(255,255,255,.25)', { lw: 1.5, ink: '#9ad' }); break;
        case 'stink': S.path([[0, 0], [5, -6], [-3, -14], [4, -22]], null, false, { ink: p.color || '#7ab648', lw: 2.5 }); break;
        case 'dust': S.circle(0, 0, p.size, 'rgba(210,190,160,.7)', { lw: 1, ink: '#bba' }); break;
        case 'zap': S.poly([[0, -p.size], [p.size * 0.4, -p.size * 0.1], [0, 0], [p.size * 0.5, p.size]], null, { ink: '#f6d743', lw: 3 }); break;
        case 'snow': S.dot(0, 0, p.size / 3, '#fff'); break;
        case 'leaf': S.ellipse(0, 0, p.size, p.size / 2, p.color || '#7cc36a', { lw: 1.5 }); break;
        case 'text': {
          const pop = p.pop ? Math.min(1, p.life / 0.15) * (1 + Math.max(0, 0.3 - p.life) ) : 1;
          c.scale(pop, pop);
          S.text(p.text, 0, 0, p.size, p.color, { weight: 'bold', outline: p.outline, outlineColor: '#fff' });
          break;
        }
        case 'burst': {
          const pop = Math.min(1, p.life / 0.12) * (1 + 0.25 * Math.max(0, 1 - p.life / 0.3));
          c.globalAlpha = Math.max(0, Math.min(1, (1 - k) * 4));
          c.scale(pop, pop);
          c.font = `bold ${p.size}px ${S.font}`;
          const tw = Math.min(800, c.measureText(p.text).width);
          const r = tw / 2 + 50, pts = [];
          for (let i = 0; i < 22; i++) { const a = (i / 22) * PI * 2, rr = i % 2 ? r * 0.82 : r; pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.5]); }
          const keep = S.ink; S.ink = '#2a2a2a';
          S.poly(pts, p.fill, { lw: 4 });
          S.ink = keep;
          c.save(); if (tw >= 800) c.scale(800 / c.measureText(p.text).width, 1);
          S.text(p.text, 0, 4, p.size, p.color, { weight: 'bold', outline: 8, outlineColor: '#fff' });
          c.restore();
          break;
        }
      }
      c.restore();
    }

    drawBubble(b) {
      const c = this.ctx, A = b.A;
      const age = this.time - b.born;
      const pop = Math.min(1, age / 0.15);
      c.save();
      c.font = `bold 24px ${S.font}`;
      const txt = b.text.length > 40 ? b.text.slice(0, 40) + '…' : b.text;
      const tw = c.measureText(txt).width;
      const bw = tw + 36, bh = 50;
      let x = A.cx + 30 * A.dir, y = Math.max(bh / 2 + 6, A.top - 40);
      x = Math.max(bw / 2 + 6, Math.min(W - bw / 2 - 6, x));
      c.translate(x, y); c.scale(pop, pop);
      const keep = S.ink; S.ink = '#2a2a2a';
      const tx = Math.max(-bw / 2 + 12, Math.min(bw / 2 - 12, A.cx - x));
      S.poly([[tx - 10, bh / 2 - 4], [tx + Math.sign(A.cx - x || 1) * 2, bh / 2 + 22], [tx + 12, bh / 2 - 4]], '#fff', { lw: 2.5 });
      S.path([[-bw / 2, -bh / 2], [bw / 2, -bh / 2], [bw / 2, bh / 2], [-bw / 2, bh / 2]], '#fff', true, { lw: 2.5 });
      S.ink = keep;
      S.text(txt, 0, 1, 24, '#2a2a2a', { weight: 'bold' });
      c.restore();
    }
  }

  window.Stage = Stage;
  window.Util = { lerp, rand, pick };
})();
