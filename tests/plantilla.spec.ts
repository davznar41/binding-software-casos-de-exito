import { expect, test } from '@playwright/test';
import { accessible, cases, noHorizontalScroll, screenshot, widths } from './helpers';

const slug = process.env.BINDING_ACCEPTANCE_SLUG!;
const path = cases + slug + '/';

test('un Markdown nuevo genera ruta, hero y medios con el orden editorial', async ({ page, request }) => {
  await page.goto(cases);
  const link = page.locator('main a[href="' + path + '"]');
  await expect(link).toHaveAccessibleName(/Leer caso de Hotel Linde/);
  await link.click();
  await expect(page).toHaveURL(path);
  const title = page.getByRole('heading', { level: 1 });
  await expect(title).toHaveText('Una recepción coordinada antes de la llegada');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect.poll(() => page.locator('.corporate-hero img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  expect(await page.locator('[data-editorial-block]').evaluateAll(elements =>
    elements.map(element => element.getAttribute('data-editorial-block')),
  )).toEqual(['texto', 'galeria', 'video', 'comparacion', 'imagen', 'resultados', 'testimonio']);
  for (const media of await page.locator('.editorial-flow img, video source').evaluateAll(elements =>
    elements.map(element => element.getAttribute('src')).filter((url): url is string => Boolean(url)),
  )) expect((await request.get(media)).status()).toBe(200);
  const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' });
  await expect(crumbs.locator('[aria-current=page]')).toHaveText('Una recepción coordinada antes de la llegada');
  await crumbs.getByRole('link', { name: 'Casos de éxito' }).click();
  await expect(page).toHaveURL(cases);
});

test('plantilla nueva en seis anchuras, con axe y capturas', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, route] of [['listado', cases], ['articulo', path]]) {
      await page.goto(route);
      await noHorizontalScroll(page);
      await accessible(page);
      if (process.env.BINDING_ACCEPTANCE_CAPTURE === '1' && (width === 390 || width === 1440)) {
        await screenshot(page, 'refinamiento-plantilla-' + name + '-' + (width === 390 ? 'movil' : 'escritorio'));
      }
    }
  }
});

