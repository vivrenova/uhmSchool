import { expect, test } from '@playwright/test';

test.describe('Сторінка курсу', () => {
  test('перший екран: офер, старт, місця, ціна, кнопка', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Розмовна англійська');
    const offer = page.locator('.offer');
    await expect(offer.locator('.facts')).toContainText('Старт');
    await expect(offer.locator('.seats')).toHaveAttribute('aria-label', /Вільно 3 місця з 8/);
    await expect(offer.locator('.price__now')).toContainText('5 900');
    await expect(offer.getByRole('link', { name: 'Забронювати місце' })).toHaveAttribute('href', '/checkout?group=tt-1930');
    expect(errors).toEqual([]);
  });

  test('сторінка не ширша за екран', async ({ page }) => {
    await page.goto('/');
    const [scroll, client] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scroll).toBeLessThanOrEqual(client);
  });

  test('група без місць → лист очікування', async ({ page }) => {
    await page.goto('/');
    await page.locator('.offer .chip', { hasText: 'Пн/Ср 08:00' }).click();
    await page.getByRole('button', { name: 'Записатися в лист очікування' }).first().click();
    const dialog = page.getByRole('dialog', { name: /Лист очікування/ });
    await expect(dialog).toBeVisible();

    // порожня форма — зрозумілі помилки
    await dialog.getByRole('button', { name: 'Записатися' }).click();
    await expect(dialog.getByText('Як до вас звертатися?')).toBeVisible();
    await expect(dialog.getByText('Вкажіть телефон')).toBeVisible();

    await dialog.getByLabel('Ім’я').fill('Тарас');
    await dialog.getByLabel('Телефон').fill('0671234567');
    await expect(dialog.getByLabel('Телефон')).toHaveValue('+380 67 123 45 67');
    await dialog.getByRole('button', { name: 'Записатися' }).click();
    await expect(page.getByText('Тарас, ви в листі очікування')).toBeVisible();
    await expect(page.locator('.wl__num')).toContainText('4');
  });

  test('без анімацій правки в домашці видно одразу', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('[data-hw]')).toHaveClass(/is-on/);
    await ctx.close();
  });

  test('усі тап-зони кнопок і посилань ≥ 44px', async ({ page }) => {
    await page.goto('/');
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('main a, main button, header a, .sticky-cta a')]
        .filter((el) => el.offsetParent !== null && !el.closest('[aria-hidden="true"]'))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { text: (el.textContent || '').trim().slice(0, 30), h: Math.round(r.height), w: Math.round(r.width) };
        })
        .filter((r) => r.h < 44 && r.w > 0),
    );
    expect(small).toEqual([]);
  });
});
