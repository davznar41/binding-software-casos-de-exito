import { defineConfig } from '@playwright/test';

const publicUrl = 'http://127.0.0.1:4336';
const reviewUrl = 'http://127.0.0.1:4337';
const acceptanceDir = process.env.BINDING_ACCEPTANCE_OUT_DIR;
const modularDir = process.env.BINDING_MODULAR_OUT_DIR;
const reviewDir = modularDir ?? acceptanceDir;
const requestedBrowser = process.env.BINDING_TEST_BROWSER;
const browserName = requestedBrowser === 'firefox' || requestedBrowser === 'webkit' ? requestedBrowser : 'chromium';
const suite = modularDir ? 'modular' : acceptanceDir ? 'plantilla' : 'site';

export default defineConfig({
  testDir: './tests',
  testMatch: suite === 'site' ? ['site.spec.ts', 'interactions.spec.ts', 'links.spec.ts', 'languages.spec.ts'] : suite + '.spec.ts',
  workers: 1,
  timeout: 30_000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'artifacts/quality/playwright-' + suite + '.json' }],
  ],
  use: {
    baseURL: reviewUrl,
    browserName,
    viewport: { width: 1440, height: 960 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: [
    ...(reviewDir ? [] : [{
      command: 'pnpm preview --port 4336',
      url: publicUrl + '/casos-de-exito/',
      timeout: 30_000,
    }]),
    {
      command: reviewDir
        ? 'pnpm preview --port 4337 --outDir "' + reviewDir + '"'
        : 'pnpm preview:revision --port 4337',
      url: reviewUrl + '/casos-de-exito/',
      timeout: 30_000,
    },
  ],
});
