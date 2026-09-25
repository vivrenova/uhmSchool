// Скріншоти сторінок для перевірки верстки: iPhone (WebKit) і десктоп (Chromium).
// node scripts/shots.mjs [url] [outDir] [--full]
import { chromium, webkit, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:4321/';
const out = process.argv[3] ?? 'shots';
const full = process.argv.includes('--full');
mkdirSync(out, { recursive: true });

const targets = [
  { name: 'iphone', engine: webkit, ctx: { ...devices['iPhone 13'], ...(full ? { deviceScaleFactor: 1 } : {}) } },
  { name: 'desktop', engine: chromium, ctx: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
];

for (const t of targets) {
  const browser = await t.engine.launch();
  const page = await browser.newPage(t.ctx);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (full) {
    // прокручуємо, щоб спрацювали lazy-картинки й острови client:visible
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
  }
  await page.waitForTimeout(1400);
  const file = `${out}/${t.name}${full ? '-full' : ''}.png`;
  await page.screenshot({ path: file, fullPage: full });
  console.log(t.name, file, errors.length ? `ERRORS: ${errors.join(' | ')}` : 'no errors');
  await browser.close();
}
