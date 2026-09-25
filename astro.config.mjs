// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  // Замініть на реальну адресу після деплою (Cloudflare Pages дає *.pages.dev).
  site: 'https://uhm-demo.pages.dev',
  integrations: [preact()],
  build: {
    // CSS невеликий — вбудовуємо в HTML, щоб не блокувати перший рендер окремим запитом.
    inlineStylesheets: 'always',
  },
  devToolbar: { enabled: false },
});
