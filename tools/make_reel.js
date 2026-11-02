#!/usr/bin/env node
// Record reel/index.html to an Instagram-ready vertical video.
//
//   npm install playwright && npx playwright install chromium   (once)
//   node tools/make_reel.js [out.mp4]              Instagram version ("link in bio")
//   node tools/make_reel.js out.mp4 --linkedin     LinkedIn version (shows the URL instead)
//   node tools/make_reel.js out.mp4 --story        the full project story in chapters, for a voiceover
//                                                  (add --music=0 for no music)
//
// Needs ffmpeg on your PATH for the final H.264/AAC encode. Also writes
// out.timeline.json with when each moment happens, for lining up a voiceover.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// serve the repo over http: recording from a file:// page produces an empty video
function serve(root) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
  const srv = http.createServer((req, res) => {
    const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

(async () => {
  const args = process.argv.slice(2);
  const linkedin = args.includes('--linkedin');
  const story = args.includes('--story');           // the full project story, paced for a voiceover
  const music = (args.find((a) => a.startsWith('--music=')) || '').split('=')[1];
  const out = path.resolve(args.find((a) => !a.startsWith('--')) || 'doodle-libs-reel.mp4');
  const srv = await serve(path.resolve(__dirname, '..'));
  const q = new URLSearchParams();
  if (linkedin) q.set('cta', 'linkedin');
  if (story) q.set('cut', 'story');
  if (music != null) q.set('music', music);
  const page = `http://127.0.0.1:${srv.address().port}/reel/index.html${q.toString() ? '?' + q : ''}`;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await browser.newPage({ viewport: { width: 700, height: 1000 } });
  p.on('pageerror', (e) => console.error('page error:', e.message));
  await p.goto(page);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  console.log('recording (this takes as long as the video)…');
  const res = await p.evaluate(async () => {
    const { blob, type, timeline } = await Reel.record();
    const b64 = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result.slice(fr.result.indexOf('base64,') + 7)); fr.readAsDataURL(blob); });
    return { b64, type, timeline };
  });
  await browser.close();
  srv.close();
  const raw = out.replace(/\.mp4$/, '') + (res.type.includes('mp4') ? '.raw.mp4' : '.raw.webm');
  fs.writeFileSync(raw, Buffer.from(res.b64, 'base64'));
  fs.writeFileSync(out.replace(/\.mp4$/, '') + '.timeline.json', JSON.stringify(res.timeline, null, 1));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', 'scale=1080:1920:out_range=tv,fps=30', '-color_range', 'tv', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out], { stdio: 'inherit' });
  fs.unlinkSync(raw);
  console.log('saved', out);
  for (const e of res.timeline) console.log(String(e.t).padStart(5), ' ', e.label);
})().catch((e) => { console.error(e); process.exit(1); });
