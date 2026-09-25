import { defineConfig, devices } from '@playwright/test';

// Тести ганяємо в WebKit з профілем iPhone (найближче до Safari на iOS без справжнього телефона)
// і в Chromium на десктопі.
export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4322',
    locale: 'uk-UA',
    timezoneId: 'Europe/Kyiv',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  // Тестуємо продакшн-збірку (npm test спершу збирає сайт): швидкість гідратації — як у відвідувачів.
  webServer: {
    command: 'npm run preview -- --port 4322',
    url: 'http://localhost:4322',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
