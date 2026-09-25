// Шукає елементи, що вилазять за ширину екрана на мобільному.
import { webkit, devices } from '@playwright/test';
const url = process.argv[2] ?? 'http://localhost:4321/';
const browser = await webkit.launch();
const page = await browser.newPage({ ...devices['iPhone 13'] });
await page.goto(url, { waitUntil: 'networkidle' });
const res = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.right > vw + 1) {
      // пропускаємо дітей горизонтальних скролерів
      let p = el.parentElement, inScroller = false;
      while (p) { const s = getComputedStyle(p); if (s.overflowX === 'auto' || s.overflowX === 'scroll' || s.overflowX === 'hidden' || s.overflowX === 'clip') { inScroller = p !== document.body && p !== document.documentElement; if (inScroller) break; } p = p.parentElement; }
      if (!inScroller) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
    }
  }
  return { vw, scrollW: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth, out: out.slice(0, 20) };
});
console.log(JSON.stringify(res, null, 1));
await browser.close();
