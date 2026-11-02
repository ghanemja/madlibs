#!/usr/bin/env node
// Render reel/cover.html to PNG covers for posts.
//   node tools/make_cover.js [outdir]
// Writes cover-story.png (1080x1920), cover-feed.png (1080x1350) and cover-link.png (1200x627).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const SIZES = { story: [1080, 1920], feed: [1080, 1350], link: [1200, 627] };
const root = path.resolve(__dirname, '..');
const srv = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript' }[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  const out = path.resolve(process.argv[2] || '.');
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  for (const [name, [w, h]] of Object.entries(SIZES)) {
    const p = await browser.newPage({ viewport: { width: w + 40, height: h + 40 } });
    p.on('pageerror', (e) => console.error('page error:', e.message));
    await p.goto(`http://127.0.0.1:${srv.address().port}/reel/cover.html?size=${name}`);
    await p.evaluate(() => window.coverReady);
    const file = path.join(out, `cover-${name}.png`);
    await p.locator('#cover').screenshot({ path: file });
    console.log('saved', file, `${w}x${h}`);
    await p.close();
  }
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
