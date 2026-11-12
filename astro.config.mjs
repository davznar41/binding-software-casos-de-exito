import { defineConfig, passthroughImageService } from 'astro/config';
import { editorialMarkdown } from './src/lib/editorial-markdown.mjs';

export default defineConfig({
  output: 'static',
  cacheDir: './.astro/cache',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  image: { service: passthroughImageService() },
  markdown: { remarkPlugins: [editorialMarkdown] },
});

