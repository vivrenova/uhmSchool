import { expect, test, type Page } from '@playwright/test';

// На сторінці є ще приховане вікно листа очікування зі своїм «Телефоном» — шукаємо в формі.
const form = (page: Page) => page.locator('form.co__form');

async function fillContacts(page: Page, email = 'olena.test@gmail.com', phone = '671234567') {
  await form(page).getByLabel('Email').fill(email);
  await form(page).getByLabel('Телефон').fill(phone);
}

async function payWithCard(page: Page, card: '4242' | '4000') {
  await page.getByRole('button', { name: card === '4242' ? /4242 4242 4242 4242/ : /4000 0000 0000 0002/ }).click();
  await page.getByRole('button', { name: /^Сплатити/ }).click();
  const otp = page.getByRole('dialog', { name: 'Підтвердження від банку' });
  await expect(otp).toBeVisible();
  await otp.getByLabel('Код з SMS').fill('1234');
  await otp.getByRole('button', { name: 'Підтвердити' }).click();
}

test.describe('Чекаут і тестова оплата', () => {
  test('помилки форми зрозумілі, маска й підказка працюють', async ({ page }) => {
    await page.goto('/checkout?group=tt-1930&plan=full');
    await page.getByRole('button', { name: /Перейти до оплати/ }).click();
    await expect(page.getByText('Вкажіть email')).toBeVisible();
    await expect(form(page).getByText('Вкажіть телефон')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeFocused();

    await page.getByLabel('Email').fill('olena@gmial.com');
    await page.getByRole('button', { name: /Можливо, olena@gmail.com/ }).click();
    await expect(page.getByLabel('Email')).toHaveValue('olena@gmail.com');

    const phone = form(page).getByLabel('Телефон');
    await phone.fill('+38 (067) 12-34');
    await expect(phone).toHaveValue('+380 67 123 4');
    await phone.blur();
    await expect(page.getByText('Не вистачає 3 цифр')).toBeVisible();
    await phone.fill('380671234567');
    await expect(phone).toHaveValue('+380 67 123 45 67');

    // атрибути для автозаповнення й правильної клавіатури на iOS
    await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'email');
    await expect(phone).toHaveAttribute('autocomplete', 'tel');
    await expect(phone).toHaveAttribute('inputmode', 'tel');
    const fontSize = await phone.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test('оплата карткою → доступ, лист, рядок у кабінеті власника', async ({ page }) => {
    await page.goto('/checkout?group=mw-1930&plan=two');
    await expect(page.locator('.co__total')).toContainText('2 950');
    await fillContacts(page);
    await page.getByRole('button', { name: /Перейти до оплати · 2 950/ }).click();

    await expect(page).toHaveURL(/\/pay\?order=UHM-/);
    await expect(page.getByText('Тестовий режим.')).toBeVisible();
    await payWithCard(page, '4242');

    await expect(page).toHaveURL(/\/success\?order=UHM-/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Оплату отримано' })).toBeVisible();
    await expect(page.getByText('Картка •• 4242').first()).toBeVisible();
    await expect(page.getByText('olena.test@gmail.com').first()).toBeVisible();
    await expect(page.getByText(/Друга частина 2\s950/)).toBeVisible();

    await page.getByRole('link', { name: 'Подивитися лист' }).click();
    await expect(page.getByRole('heading', { name: /Ви в групі Пн\/Ср 19:30/ })).toBeVisible();

    await page.goto('/admin');
    const row = page.locator('tr.is-new');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('olena.test@gmail.com');
    await expect(row).toContainText('2 950');
    await expect(page.locator('.adm__botlist .bot').first()).toContainText('Нова оплата');

    // місце списалось: у групі Пн/Ср 19:30 було 6 вільних
    await page.goto('/');
    await expect(page.locator('.offer .chip', { hasText: 'Пн/Ср 19:30' })).toContainText('5 місць');
  });

  test('відмова банку: гроші не списано, власник бачить невдалу спробу', async ({ page }) => {
    await page.goto('/checkout?group=tt-1930&plan=full');
    await fillContacts(page, 'declined@gmail.com');
    await page.getByRole('button', { name: /Перейти до оплати/ }).click();
    await payWithCard(page, '4000');
    await expect(page.getByRole('alert')).toContainText('Банк відхилив оплату');
    await expect(page).toHaveURL(/\/pay/);
    await page.goto('/admin');
    await expect(page.locator('.adm__botlist .bot').first()).toContainText('Оплата не пройшла');
    await expect(page.locator('tr.is-new')).toHaveCount(0);
  });

  test('Apple Pay (симуляція)', async ({ page }) => {
    await page.goto('/checkout?group=tt-1930&plan=full');
    await fillContacts(page, 'apple@icloud.com');
    await page.getByRole('button', { name: /Перейти до оплати/ }).click();
    await expect(page).toHaveURL(/\/pay\?order=/);
    await page.goto(page.url() + '&wallet=apple');
    await page.getByRole('button', { name: 'Оплатити через Apple Pay' }).click();
    await page.getByRole('button', { name: 'Підтвердити Face ID' }).click();
    await expect(page).toHaveURL(/\/success/, { timeout: 10_000 });
    await expect(page.getByText('Apple Pay').first()).toBeVisible();
  });

  test('кабінет власника оновлюється сам, без перезавантаження', async ({ context }) => {
    const admin = await context.newPage();
    await admin.goto('/admin');
    await expect(admin.locator('.adm__table tbody tr').first()).toBeVisible();
    const before = await admin.locator('.adm__table tbody tr').count();

    const buyer = await context.newPage();
    await buyer.goto('/checkout?group=tt-1930&plan=full');
    await fillContacts(buyer, 'live@gmail.com');
    await buyer.getByRole('button', { name: /Перейти до оплати/ }).click();
    await payWithCard(buyer, '4242');
    await expect(buyer).toHaveURL(/\/success/, { timeout: 10_000 });

    await expect(admin.locator('.adm__table tbody tr')).toHaveCount(before + 1);
    await expect(admin.getByRole('status').filter({ hasText: 'Нова оплата' })).toBeVisible();
  });
});
