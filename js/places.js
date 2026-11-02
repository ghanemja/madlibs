// places.js — backdrops. Drawn in a lighter ink so the actors pop.
(function () {
  const S = Sk;
  const W = 960, H = 540, G = 450;
  const PI = Math.PI;
  const PLACES = {};
  function place(key, o) { o.key = key; o.aliases = o.aliases || []; PLACES[key] = o; }

  function sky(top, bottom) {
    const c = S.ctx;
    const g = c.createLinearGradient(0, 0, 0, G);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function ground(fill, edge) {
    S.ctx.fillStyle = fill; S.ctx.fillRect(0, G, W, H - G);
    S.path([[-10, G], [240, G - 2], [480, G + 1], [720, G - 1], [970, G]], null, false, { ink: edge || S.ink, lw: 2.5 });
  }
  function clouds(t, n, color) {
    for (let i = 0; i < (n || 3); i++) {
      const x = ((i * 340 + t * (8 + i * 3)) % (W + 300)) - 150, y = 70 + i * 38;
      S.path([[x - 50, y], [x - 42, y - 22], [x - 14, y - 34], [x + 18, y - 30], [x + 44, y - 16], [x + 50, y + 4]], color || '#fff', true, { lw: 2 });
    }
  }
  function hills(color, y) {
    S.path([[-20, G], [-20, y], [120, y - 60], [300, y - 10], [470, y - 70], [660, y - 20], [820, y - 75], [990, y - 10], [990, G]], color, true, { lw: 2 });
  }
  function sunBg(x, y, r) {
    S.circle(x, y, r, '#fbe38a', { lw: 2 });
  }
  function bgTree(x, y, s, fill) {
    S.line(x, y, x, y - 50 * s, { lw: 4 });
    S.circle(x, y - 70 * s, 32 * s, fill, { lw: 2 });
  }

  place('park', {
    aliases: ['the park', 'playground', 'backyard', 'yard', 'garden', 'field', 'meadow', 'outside', 'picnic', 'zoo', 'camp', 'campsite', 'woods'],
    draw(t) {
      sky('#bfe4fb', '#eaf7ff');
      sunBg(820, 90, 44);
      clouds(t, 3);
      hills('#bfe3a6', G - 30);
      bgTree(110, G - 10, 1, '#a6d68e'); bgTree(870, G - 6, 1.2, '#a6d68e');
      ground('#9fd17f');
      for (let i = 0; i < 14; i++) { const x = 30 + i * 68; S.line(x, G + 30 + (i % 3) * 18, x + 4, G + 22 + (i % 3) * 18, { lw: 1.5, ink: '#5f9a48' }); }
    },
  });
  place('beach', {
    aliases: ['the beach', 'seaside', 'shore', 'coast', 'island', 'hawaii', 'florida', 'tropics', 'tropical island'],
    draw(t) {
      sky('#9fd8fb', '#f3fbff');
      sunBg(140, 90, 46);
      clouds(t, 2);
      const c = S.ctx;
      c.fillStyle = '#5bb2e6'; c.fillRect(0, G - 90, W, 92);
      for (let i = 0; i < 6; i++) { const y = G - 80 + i * 14, o = Math.sin(t * 1.5 + i) * 20; S.path([[0 + o, y], [160 + o, y - 4], [320 + o, y + 2], [480 + o, y - 3], [640 + o, y + 2], [800 + o, y - 3], [980 + o, y]], null, false, { ink: '#bfe6fa', lw: 2 }); }
      ground('#f4dfa4');
      // palm
      S.path([[860, G], [868, G - 80], [880, G - 160]], null, false, { lw: 7, ink: '#9a7550' });
      for (let i = 0; i < 5; i++) { const a = PI * (1.05 + i * 0.22); S.path([[880, G - 160], [880 + Math.cos(a) * 40, G - 160 + Math.sin(a) * 30 - 10], [880 + Math.cos(a) * 80, G - 160 + Math.sin(a) * 30 + 20]], null, false, { lw: 5, ink: '#5fae5a' }); }
    },
  });
  place('space', {
    dark: true,
    aliases: ['outer space', 'the moon', 'moon', 'mars', 'planet', 'another planet', 'jupiter', 'saturn', 'venus', 'pluto', 'the stars', 'galaxy', 'the galaxy', 'universe', 'space station', 'alien planet', 'neptune', 'mercury', 'uranus'],
    draw(t) {
      sky('#141a3a', '#2c2f5e');
      for (let i = 0; i < 70; i++) { const x = (i * 137) % W, y = (i * 71) % (G - 40); const tw = 0.5 + 0.5 * Math.sin(t * 3 + i); S.dot(x, y, 1 + tw * 1.4, `rgba(255,255,230,${0.4 + tw * 0.6})`); }
      S.circle(170, 120, 46, '#5aa4e8', { ink: '#cfd8ff', lw: 2 });
      S.path([[150, 95], [175, 105], [160, 130], [185, 150]], null, false, { ink: '#7cc36a', lw: 6 });
      S.circle(760, 90, 26, '#e8a36a', { ink: '#cfd8ff', lw: 2 }); S.ellipse(760, 90, 44, 9, null, { ink: '#f4d6a6', lw: 2 });
      S.ctx.fillStyle = '#8c8c98'; S.ctx.fillRect(0, G, W, H - G);
      S.path([[-10, G], [300, G - 3], [600, G + 2], [970, G]], null, false, { ink: '#e8e8f4', lw: 2.5 });
      [[140, 480, 30], [520, 500, 22], [800, 476, 36], [330, 470, 14]].forEach(([x, y, r]) => S.ellipse(x, y, r, r * 0.35, '#77778a', { ink: '#c8c8d8', lw: 2 }));
    },
  });
  place('city', {
    aliases: ['the city', 'town', 'downtown', 'new york', 'nyc', 'paris', 'london', 'tokyo', 'mall', 'the mall', 'store', 'the store', 'street', 'supermarket', 'grocery store', 'restaurant', 'airport', 'hospital', 'office', 'work', 'bank', 'library', 'museum'],
    draw(t) {
      sky('#d4e6f7', '#f4f8fc');
      clouds(t, 2);
      const b = [[20, 180], [110, 260], [190, 150], [280, 300], [370, 200], [460, 330], [560, 220], [650, 280], [740, 170], [830, 250], [900, 190]];
      b.forEach(([x, h], i) => {
        S.rect(x, G - h, 80, h, ['#c8cfdb', '#b7c0cf', '#d6dbe4'][i % 3], { ink: '#7d8796', lw: 2 });
        for (let wy = G - h + 20; wy < G - 30; wy += 34) for (let wx = x + 12; wx < x + 70; wx += 24) S.ctx.fillStyle = (wx + wy + i) % 3 ? '#f5f8fb' : '#fbe9a6', S.ctx.fillRect(wx, wy, 12, 16);
      });
      ground('#9a9aa2');
      for (let i = 0; i < 10; i++) S.ctx.fillStyle = '#f4f4f4', S.ctx.fillRect(i * 110 + 20, G + 42, 54, 6);
    },
  });
  place('forest', {
    aliases: ['the forest', 'the woods', 'woods', 'jungle', 'the jungle', 'rainforest', 'swamp', 'enchanted forest'],
    draw(t) {
      sky('#cfe9d4', '#eef8ef');
      for (let i = 0; i < 12; i++) { const x = i * 88 + 20; S.poly([[x - 40, G - 20], [x, G - 200 - (i % 3) * 40], [x + 40, G - 20]], i % 2 ? '#8cc489' : '#a3d29d', { lw: 2, ink: '#5a8a56' }); }
      for (let i = 0; i < 6; i++) S.path([[i * 170 + 40, 0], [i * 170 + 50 + Math.sin(t + i) * 8, 60], [i * 170 + 40, 110]], null, false, { ink: '#4c9a3a', lw: 3 });
      ground('#7fb86a');
    },
  });
  place('desert', {
    aliases: ['the desert', 'egypt', 'sahara', 'arizona', 'texas', 'the wild west', 'wild west', 'canyon'],
    draw(t) {
      sky('#fbd9a0', '#fff2d6');
      sunBg(800, 100, 56);
      S.poly([[520, G - 30], [620, G - 170], [720, G - 30]], '#e8c37a', { lw: 2 });
      hills('#f1cf8b', G - 20);
      ground('#f0c97c');
      S.path([[120, G], [120, G - 90], [132, G - 100], [144, G - 90], [144, G]], '#7cb86a', true, { lw: 2 });
    },
  });
  place('ocean', {
    underwater: true,
    aliases: ['underwater', 'the ocean', 'under the sea', 'the sea', 'sea', 'lake', 'river', 'pool', 'swimming pool', 'aquarium', 'atlantis', 'the bottom of the ocean', 'pond', 'bathtub'],
    draw(t) {
      sky('#4e9fd8', '#1f5f9a');
      for (let i = 0; i < 6; i++) { const a = PI * 0.4 + i * 0.12; S.ctx.fillStyle = 'rgba(255,255,255,.06)'; S.ctx.beginPath(); S.ctx.moveTo(200 + i * 120, 0); S.ctx.lineTo(200 + i * 120 + Math.cos(a) * 600, 600); S.ctx.lineTo(260 + i * 120 + Math.cos(a) * 600, 600); S.ctx.lineTo(240 + i * 120, 0); S.ctx.fill(); }
      for (let i = 0; i < 9; i++) { const x = 40 + i * 110; S.path([[x, G], [x + Math.sin(t * 2 + i) * 12, G - 50], [x - Math.sin(t * 2 + i) * 10, G - 100], [x + Math.sin(t * 2 + i) * 8, G - 140 - (i % 3) * 20]], null, false, { ink: '#3f9a5a', lw: 6 }); }
      for (let i = 0; i < 12; i++) S.circle((i * 97 + Math.sin(t + i) * 10) % W, G - ((t * 40 + i * 80) % G), 4 + (i % 3) * 2, null, { ink: 'rgba(255,255,255,.6)', lw: 1.5 });
      ground('#e8d6a0', '#a08a5a');
    },
  });
  place('arctic', {
    aliases: ['the arctic', 'north pole', 'the north pole', 'south pole', 'antarctica', 'alaska', 'snow', 'iceland', 'canada', 'winter wonderland', 'ski resort', 'the mountains', 'mountains', 'mountain', 'mount everest', 'everest', 'igloo'],
    draw(t) {
      sky('#d6e8f7', '#f4f9fd');
      S.poly([[80, G], [260, G - 230], [440, G]], '#e4eef7', { lw: 2, ink: '#9ab0c4' });
      S.poly([[380, G], [600, G - 280], [820, G]], '#dbe7f2', { lw: 2, ink: '#9ab0c4' });
      ground('#fbfdff', '#9ab0c4');
      for (let i = 0; i < 50; i++) { const x = (i * 83 + Math.sin(t + i) * 20) % W, y = (t * 30 + i * 47) % H; S.dot(x, y, 2 + (i % 3), '#fff'); }
      S.path([[760, G], [760, G - 50], [800, G - 70], [840, G - 50], [840, G]], '#fff', true, { lw: 2, ink: '#9ab0c4' });
    },
  });
  place('volcano', {
    aliases: ['a volcano', 'the volcano', 'lava land', 'hell', 'the sun', 'dragon lair', 'cave', 'a cave', 'the cave'],
    draw(t) {
      sky('#f7b98a', '#fde1c6');
      S.poly([[420, G], [580, G - 260], [660, G - 260], [820, G]], '#a0806a', { lw: 2, ink: '#7a5a4a' });
      S.path([[580, G - 260], [600, G - 230], [620, G - 250], [640, G - 226], [660, G - 260]], '#f6913b', true, { lw: 2 });
      for (let i = 0; i < 4; i++) { const k = (t * 0.3 + i / 4) % 1; S.circle(620 + Math.sin(k * 6) * 20, G - 280 - k * 200, 20 + k * 30, `rgba(150,150,150,${0.6 - k * 0.6})`, { lw: 0.01, noStroke: true }); }
      ground('#9b7b62');
    },
  });
  place('kitchen', {
    indoor: true,
    aliases: ['the kitchen', 'a kitchen', 'bakery', 'cafeteria', 'diner', 'cafe', 'pizza place'],
    draw(t) {
      const c = S.ctx;
      c.fillStyle = '#fbf3e4'; c.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 40) for (let y = 220; y < 330; y += 40) S.rect(x, y, 40, 40, (x / 40 + y / 40) % 2 ? '#e7f1f8' : '#fff', { lw: 1, ink: '#c9d6e0' });
      S.rect(30, 330, 560, 120, '#c99a6a', { ink: '#8a6a4a' });
      S.rect(20, 316, 580, 16, '#e8dccb', { ink: '#8a6a4a' });
      S.rect(80, 120, 120, 80, '#cfeaff', { ink: '#8a9aa8' }); S.line(140, 120, 140, 200, { ink: '#8a9aa8', lw: 2 });
      S.rect(740, 140, 170, 310, '#f4f6f8', { ink: '#8a9aa8' }); S.line(740, 260, 910, 260, { ink: '#8a9aa8' });
      S.line(760, 180, 760, 230, { ink: '#8a9aa8', lw: 4 }); S.line(760, 290, 760, 340, { ink: '#8a9aa8', lw: 4 });
      c.fillStyle = '#d9cbb4'; c.fillRect(0, G, W, H - G);
      S.line(0, G, W, G, { ink: '#8a6a4a', lw: 2 });
    },
  });
  place('party', {
    indoor: true,
    aliases: ['home', 'house', 'my house', 'the house', 'living room', 'bedroom', 'a party', 'the party', 'birthday party', 'disco', 'dance party', 'club', 'grandma\'s house', 'his house', 'her house', 'their house', 'basement', 'attic', 'hotel'],
    draw(t) {
      const c = S.ctx;
      c.fillStyle = '#fff4f0'; c.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 60) S.line(x, 0, x, G, { ink: '#f6dfe0', lw: 2 });
      S.path([[0, 40], [120, 80], [240, 40], [360, 80], [480, 40], [600, 80], [720, 40], [840, 80], [960, 40]], null, false, { ink: '#999', lw: 1.5 });
      for (let i = 0; i < 16; i++) { const x = 30 + i * 60, y = 50 + (i % 2) * 22; S.poly([[x - 12, y], [x + 12, y], [x, y + 26]], ['#ff7eb6', '#f6d743', '#4c9be8', '#72c25a'][i % 4], { lw: 1.5 }); }
      S.rect(380, 130, 200, 150, '#cfeaff', { ink: '#a8a0a0' }); S.line(480, 130, 480, 280, { ink: '#a8a0a0', lw: 2 });
      [[90, 180, '#e8466b'], [130, 200, '#4c9be8'], [860, 170, '#f6d743']].forEach(([x, y, col]) => { S.ellipse(x, y + Math.sin(t * 2 + x) * 4, 22, 28, col, { lw: 1.8 }); S.line(x, y + 28, x + 4, y + 120, { lw: 1, ink: '#999' }); });
      c.fillStyle = '#d6b896'; c.fillRect(0, G, W, H - G);
      S.line(0, G, W, G, { ink: '#8a6a4a', lw: 2 });
    },
  });
  place('school', {
    indoor: true,
    aliases: ['the school', 'class', 'classroom', 'the classroom', 'math class', 'gym', 'gym class', 'college', 'university', 'science lab', 'lab'],
    draw(t) {
      const c = S.ctx;
      c.fillStyle = '#f3efe2'; c.fillRect(0, 0, W, H);
      S.rect(220, 80, 520, 230, '#355e4a', { ink: '#7a5a3a', lw: 6 });
      c.save(); c.globalAlpha = 0.8; S.text('2 + 2 = fish', 480, 170, 40, '#f4f4ea'); S.text('no running!', 480, 240, 30, '#f4f4ea'); c.restore();
      S.circle(860, 110, 40, '#fff', { ink: '#8a8a8a' }); S.line(860, 110, 860, 84, { ink: '#666' }); S.line(860, 110, 860 + Math.cos(t) * 22, 110 + Math.sin(t) * 22, { ink: '#666' });
      c.fillStyle = '#c9b18a'; c.fillRect(0, G, W, H - G);
      S.line(0, G, W, G, { ink: '#8a6a4a', lw: 2 });
    },
  });
  place('castle', {
    aliases: ['the castle', 'a castle', 'kingdom', 'the kingdom', 'palace', 'fairyland', 'fairy land', 'medieval times', 'dungeon'],
    draw(t) {
      sky('#d8d0f2', '#f6f2ff');
      clouds(t, 2);
      S.rect(330, G - 220, 300, 220, '#d7d0c4', { ink: '#8a8296', lw: 2 });
      S.rect(290, G - 290, 80, 290, '#d7d0c4', { ink: '#8a8296', lw: 2 }); S.rect(590, G - 290, 80, 290, '#d7d0c4', { ink: '#8a8296', lw: 2 });
      S.poly([[280, G - 288], [330, G - 370], [380, G - 288]], '#b6a6e8', { ink: '#8a8296', lw: 2 }); S.poly([[580, G - 288], [630, G - 370], [680, G - 288]], '#b6a6e8', { ink: '#8a8296', lw: 2 });
      S.path([[330, G - 370], [330, G - 400], [356 + Math.sin(t * 4) * 4, G - 392], [330, G - 384]], '#e8466b', true, { lw: 1.5 });
      ground('#a6d68e');
    },
  });
  place('farm', {
    aliases: ['the farm', 'a farm', 'barn', 'the barn', 'ranch', 'countryside', 'the countryside', 'village'],
    draw(t) {
      sky('#cfe8fb', '#f3fbff');
      sunBg(120, 90, 40);
      clouds(t, 2);
      hills('#c8e3a6', G - 30);
      S.rect(640, G - 170, 190, 170, '#d9524a', { ink: '#8a3a32', lw: 2 }); S.poly([[624, G - 168], [735, G - 250], [846, G - 168]], '#b33b33', { ink: '#8a3a32', lw: 2 });
      S.rect(700, G - 90, 70, 90, '#fff', { ink: '#8a3a32', lw: 2 }); S.line(700, G - 90, 770, G, { ink: '#8a3a32', lw: 2 }); S.line(770, G - 90, 700, G, { ink: '#8a3a32', lw: 2 });
      for (let i = 0; i < 8; i++) S.line(20 + i * 60, G - 50, 20 + i * 60, G, { ink: '#a07a50' }); S.line(10, G - 40, 460, G - 40, { ink: '#a07a50' }); S.line(10, G - 20, 460, G - 20, { ink: '#a07a50' });
      ground('#a6cf7f');
    },
  });
  place('candy', {
    aliases: ['candy land', 'candyland', 'candy world', 'chocolate factory', 'the chocolate factory', 'gingerbread house', 'dessert land', 'cotton candy land', 'sweets'],
    draw(t) {
      sky('#ffd6ec', '#fff2f8');
      clouds(t, 3, '#fff0fa');
      hills('#ffb6d9', G - 30);
      [[120, 200, '#ff7eb6'], [300, 170, '#8fd1e8'], [700, 210, '#f6d743'], [860, 180, '#b6a6e8']].forEach(([x, h, col]) => { S.line(x, G, x, G - h, { lw: 5, ink: '#fff' }); S.line(x, G, x, G - h, { lw: 2, ink: '#c9a' }); S.circle(x, G - h - 30, 32, col, { lw: 2 }); S.arc(x, G - h - 30, 18, 0, PI * 1.6, { lw: 2, ink: '#fff' }); });
      ground('#a87048');
    },
  });

  // Fallback: any unknown place renders as the park with a hand-painted sign.
  function signFor(name) {
    return {
      key: 'sign:' + name,
      draw(t) {
        PLACES.park.draw(t);
        S.line(120, G + 10, 120, G - 110, { lw: 6, ink: '#7a5230' });
        const txt = name.length > 18 ? name.slice(0, 18) + '…' : name;
        const w = Math.max(160, txt.length * 14 + 40);
        S.rect(120 - w / 2, G - 190, w, 80, '#f4e0b8', { ink: '#7a5230' });
        S.text('Welcome to', 120, G - 168, 18, '#7a5230');
        S.text(txt, 120, G - 136, 28, '#5a3a1a', { weight: 'bold' });
      },
    };
  }

  window.PLACES = PLACES;
  window.Places = { signFor, W, H, G };
})();
