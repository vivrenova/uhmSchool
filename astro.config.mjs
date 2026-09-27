// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  // Адреса на Cloudflare. Якщо підключите свій домен — замініть тут.
  site: 'https://uhmschool.bodiastorozh.workers.dev',
  integrations: [preact()],
  build: {
    // CSS невеликий — вбудовуємо в HTML, щоб не блокувати перший рендер окремим запитом.
    inlineStylesheets: 'always',
    // checkout.html замість checkout/index.html: /checkout віддається без редиректу на /checkout/.
    format: 'file',
  },
  devToolbar: { enabled: false },
});
