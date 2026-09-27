// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  // Замініть на реальну адресу після першого деплою (Cloudflare дає *.workers.dev).
  site: 'https://uhmschool.workers.dev',
  integrations: [preact()],
  build: {
    // CSS невеликий — вбудовуємо в HTML, щоб не блокувати перший рендер окремим запитом.
    inlineStylesheets: 'always',
    // checkout.html замість checkout/index.html: /checkout віддається без редиректу на /checkout/.
    format: 'file',
  },
  devToolbar: { enabled: false },
});
