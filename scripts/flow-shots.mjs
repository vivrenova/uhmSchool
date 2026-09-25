// Скріни шляху оплати на iPhone (WebKit): node scripts/flow-shots.mjs <outDir> [baseUrl]
import { webkit, chromium, devices } from '@playwright/test';

const out = process.argv[2] ?? 'shots';
const base = process.argv[3] ?? 'http://localhost:4322';

async function run(engine, ctxOpts, prefix) {
  const browser = await engine.launch();
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (name, full = false) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${prefix}-${name}.png`, fullPage: full });
  };

  await page.goto(`${base}/checkout?group=tt-1930&plan=two`, { waitUntil: 'networkidle' });
  await shot('1-checkout');
  const form = page.locator('form.co__form');
  await form.getByRole('button', { name: /Перейти до оплати/ }).click();
  await form.getByLabel('Email').fill('olena@gmial.com');
  await form.getByLabel('Телефон').fill('06712');
  await form.getByLabel('Телефон').blur();
  await form.getByLabel('Email').scrollIntoViewIfNeeded();
  await shot('2-errors');
  await form.getByRole('button', { name: /Можливо/ }).click();
  await form.getByLabel('Телефон').fill('0671234567');
  await form.getByRole('button', { name: /Перейти до оплати/ }).click();
  await page.waitForURL(/\/pay/);
  await shot('3-pay');
  await page.getByRole('button', { name: /4242 4242/ }).click();
  await page.getByRole('button', { name: /^Сплатити/ }).click();
  await page.getByLabel('Код з SMS').waitFor();
  await page.getByLabel('Код з SMS').fill('1234');
  await shot('4-otp');
  await page.getByRole('button', { name: 'Підтвердити' }).click();
  await page.waitForURL(/\/success/, { timeout: 15000 });
  await page.waitForTimeout(600);
  await shot('5-success', true);
  await page.getByRole('link', { name: 'Подивитися лист' }).click();
  await page.waitForURL(/\/mail/);
  await shot('6-mail', true);
  await page.goto(`${base}/learn`, { waitUntil: 'networkidle' });
  await shot('7-learn', true);
  await page.goto(`${base}/admin`, { waitUntil: 'networkidle' });
  await shot('8-admin', true);
  console.log(prefix, errors.length ? errors : 'no errors');
  await browser.close();
}

await run(webkit, { ...devices['iPhone 13'], deviceScaleFactor: 2 }, 'm');
await run(chromium, { viewport: { width: 1440, height: 900 } }, 'd');
