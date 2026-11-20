// Headless checks and screenshots. Run from the demo folder:
// NODE_PATH=<dir with playwright-core> node tools/shoot.cjs
// Prints sideways scroll, text under 14px, tap targets under 40px, console errors and outside requests.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const http = require('http');

const dir = path.resolve(__dirname, '..'), out = path.join(dir, 'shots');
const types = { '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const file = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

async function audit(page) {
  return page.evaluate(() => {
    const probs = [];
    const ov = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (ov > 0) probs.push('sideways scroll ' + ov + 'px');
    for (const el of document.querySelectorAll('body *')) {
      if (!el.childNodes.length || el.closest('svg') || el.closest('[hidden]')) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const cs = getComputedStyle(el);
      if (own && cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.fontSize) < 14) probs.push('small text ' + cs.fontSize + ': ' + el.textContent.trim().slice(0, 30));
    }
    for (const el of document.querySelectorAll('button, a')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.height < 40) probs.push('target ' + Math.round(r.height) + 'px: ' + el.textContent.trim().slice(0, 30));
    }
    return [...new Set(probs)].slice(0, 12);
  });
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({ headless: true });
  const sizes = [['phone', 390, 844], ['phone320', 320, 700], ['desktop', 1280, 800]];
  for (const [tag, width, height] of sizes) for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: 'reduce', isMobile: tag !== 'desktop', hasTouch: tag !== 'desktop' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:')) errors.push('network: ' + u); });
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    if (tag !== 'phone320') await page.screenshot({ path: path.join(out, `${tag}-${scheme}.png`) });
    const closed = await audit(page);
    const rows = await page.$$('[data-row]');
    const first = await page.$('.group:nth-child(1) [data-row]');
    await first.click(); await page.waitForTimeout(150);
    if (tag !== 'phone320') {
      await page.evaluate(() => { const el = document.querySelector('.group:nth-child(1) [data-row]'); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 12); });
      await page.screenshot({ path: path.join(out, `${tag}-${scheme}-open.png`) });
    }
    const openA = await audit(page);
    const act = await page.$('[data-list], [data-approve], [data-accept]');
    if (act) { await act.click(); await page.waitForTimeout(250); }
    if (tag === 'phone' && scheme === 'light') {
      await page.evaluate(() => { const el = document.querySelector('.approve-row.done, .ok-line, .accepted'); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 420); });
      await page.screenshot({ path: path.join(out, `${tag}-${scheme}-after-action.png`) });
      const q = await page.$('.quote, .src-btn');
      if (q) { await q.click(); await page.waitForTimeout(700); await page.screenshot({ path: path.join(out, `${tag}-${scheme}-record.png`) }); }
    }
    console.log(tag, scheme, rows.length + ' rows', [...errors, ...closed, ...openA].join(' | ') || 'clean');
    await ctx.close();
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(base); await page.evaluate(() => document.fonts.ready);
  const words = await page.evaluate(() => {
    let n = 0;
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const t = walk.currentNode; if (!t.textContent.trim() || t.parentElement.closest('[hidden]')) continue;
      const r = document.createRange(); r.selectNodeContents(t); const b = r.getBoundingClientRect();
      if (b.top < 844 && b.height) n += t.textContent.trim().split(/\s+/).length;
    }
    return n;
  });
  console.log('words above the fold at 390x844:', words);
  await browser.close(); server.close();
})();
