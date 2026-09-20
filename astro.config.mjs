// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';


import { SITE } from './src/site.config.ts';
const SITE_URL = SITE.url;

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
});
