import { expect, test } from '@playwright/test';
import { cases, galleryScreenshot, longCase, noHorizontalScroll, shortCase } from './helpers';

const mirador = cases + 'flujo-editorial-hotel-mirador/';
const viewports = [[320, 568], [375, 667], [390, 844], [768, 1024], [1024, 768], [1440, 900]] as const;

test('los casos comparten hasta tres tarjetas válidas con una selección reproducible', async ({ page, request }) => {
  await page.route(/\.(mp4|webm)$/, (route) => route.abort());
  await page.goto(cases);
  const paths = await page.locator('.featured-case a[href], .case-card a[href]').evaluateAll((links) =>
    [...new Set(links.map((link) => link.getAttribute('href')!))],
  );
  const expected = Math.min(3, Math.max(0, paths.length - 1));
  for (const path of paths) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const cards = page.getByRole('region', { name: 'Casos relacionados' }).locator('.case-card');
    await expect(cards).toHaveCount(expected);
    await expect(cards.locator('h3')).toHaveCount(expected);
    await expect(cards.locator('.case-summary')).toHaveCount(expected);
    await expect(cards.locator('img:not([alt])')).toHaveCount(0);
    const links = cards.getByRole('link', { name: /Leer caso de/ });
    const hrefs = () => links.evaluateAll((elements) => elements.map((link) => link.getAttribute('href')!));
    const initial = await hrefs();
    expect(initial).not.toContain(path);
    expect(new Set(initial).size).toBe(expected);
    expect(initial.every((link) => paths.includes(link))).toBe(true);
    for (const link of initial) expect((await request.get(link)).status()).toBe(200);
    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(await hrefs()).toEqual(initial);
  }
  await page.goto(shortCase);
  const first = page.getByRole('region', { name: 'Casos relacionados' }).getByRole('link').first();
  await expect(first).toHaveAttribute('href', mirador);
  await page.keyboard.press('Tab');
  await first.focus();
  await expect(first).toHaveCSS('outline-width', '3px');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(mirador);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('relacionados se adapta a seis tamaños y conserva una sola fila en escritorio', async ({ page }) => {
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.goto(shortCase);
    const region = page.getByRole('region', { name: 'Casos relacionados' });
    const grid = region.locator('.case-grid');
    const columns = width < 688 ? 1 : width < 1120 ? 2 : 3;
    expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(/\s+/).length)).toBe(columns);
    await noHorizontalScroll(page);
    if (width === 390 || width === 1440) await galleryScreenshot(region, 'relacionados-bruma-' + width);
  }
  await page.goto(longCase);
  await galleryScreenshot(page.getByRole('region', { name: 'Casos relacionados' }), 'relacionados-arcilla-1440');
});
