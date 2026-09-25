// Скріни окремих станів на iPhone (WebKit): node scripts/states.mjs <outDir>
import { webkit, devices } from '@playwright/test';

const out = process.argv[2] ?? 'shots';
const url = process.argv[3] ?? 'http://localhost:4321/';
const browser = await webkit.launch();
const page = await browser.newPage({ ...devices['iPhone 13'] });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/m-first.png` });

async function shotAt(selector, name, offset = -60, wait = 900) {
  await page.evaluate(
    ([sel, off]) => {
      const el = document.querySelector(sel);
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + off);
    },
    [selector, offset],
  );
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}/${name}.png` });
}

await shotAt('.zoom', 'm-zoom', -40);
await shotAt('.page__text', 'm-hw', -120, 3200);
await shotAt('.pcard', 'm-prices', -20, 1200);
await shotAt('.shots', 'm-reviews', -40);

console.log(errors.length ? errors : 'no errors');
await browser.close();
