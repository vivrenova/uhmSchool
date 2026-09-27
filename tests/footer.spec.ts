import { expect, test } from '@playwright/test';

const PAGES = ['/', '/checkout', '/success', '/mail', '/learn', '/admin'];

test.describe('Футер і сторінки демо', () => {
  for (const path of PAGES) {
    test(`${path}: швидкий перехід, контакти розробника, без вигаданих контактів`, async ({ page }) => {
      await page.goto(path);
      const nav = page.getByRole('navigation', { name: 'Сторінки демо' }).last();
      await expect(nav.getByRole('link')).toHaveCount(7);
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
      const footer = page.locator('footer.footer');
      await expect(footer).toContainText('Контакти розробника');
      await expect(footer.getByRole('link', { name: 'Telegram' })).toHaveAttribute('href', 'https://t.me/vivrenova');
      const html = await page.content();
      expect(html).not.toContain('uhm_school');
      expect(html).not.toContain('uhm.school');
    });
  }

  test('«Оплату отримано» без оплати показує приклад', async ({ page }) => {
    await page.goto('/success');
    await expect(page.getByRole('heading', { name: 'Оплату отримано' })).toBeVisible();
    await expect(page.getByText('Приклад сторінки')).toBeVisible();
  });

  test('«Лист учню» без оплати показує приклад', async ({ page }) => {
    await page.goto('/mail');
    await expect(page.getByRole('heading', { name: /Ви в групі/ })).toBeVisible();
    await expect(page.getByText('Це приклад')).toBeVisible();
  });
});
