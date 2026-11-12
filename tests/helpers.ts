import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

export const cases = '/casos-de-exito/';
export const longCase = cases + 'recepcion-hotel-arcilla/';
export const mediumCase = cases + 'llegada-apartamentos-alcor/';
export const shortCase = cases + 'hotel-bruma-turnos/';
export const publicUrl = 'http://127.0.0.1:4336';
export const widths = [320, 375, 390, 768, 1024, 1440];

export async function noHorizontalScroll(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(page.viewportSize()!.width);
}

export async function accessible(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })))
    .toEqual([]);
}

export async function screenshot(page: Page, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const image of document.images) image.loading = 'eager';
    await Promise.all([...document.querySelectorAll('video[poster]')].map((video) => {
      const poster = new Image();
      poster.src = (video as HTMLVideoElement).poster;
      return poster.decode();
    }));
    await Promise.all([...document.images].map(async (image) => {
      await image.decode();
      if (!image.naturalWidth) throw new Error('Imagen no cargada: ' + image.currentSrc);
    }));
  });
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await page.screenshot({ path: 'artifacts/capturas/' + name + '.png', fullPage: true });
}

export async function galleryGeometry(gallery: Locator, count: number, columns: number) {
  await expect(gallery.locator('img')).toHaveCount(count);
  const measurement = await gallery.evaluate((element) => {
    const { width, left, right } = element.getBoundingClientRect();
    const rects = [...element.querySelectorAll('img')].map((image) => {
      const rect = image.getBoundingClientRect();
      return {
        width: rect.width, height: rect.height, top: rect.top, left: rect.left, right: rect.right,
        fit: getComputedStyle(image).objectFit,
      };
    });
    const tracks = getComputedStyle(element).gridTemplateColumns.split(/\s+/).length;
    return { width, left, right, rects, tracks };
  });
  expect(measurement.tracks).toBe(columns);
  const rows = Map.groupBy(measurement.rects, (rect) => Math.round(rect.top));
  for (const row of rows.values()) {
    for (const rect of row) {
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.width / rect.height).toBeCloseTo(1.5, 2);
      expect(rect.height).toBeCloseTo(row[0].height, 0);
      expect(rect.left).toBeGreaterThanOrEqual(measurement.left - 0.5);
      expect(rect.right).toBeLessThanOrEqual(measurement.right + 0.5);
      expect(['cover', 'contain']).toContain(rect.fit);
    }
  }
  return measurement;
}

export async function staticGallery(gallery: Locator, count: number) {
  await expect(gallery.locator(':scope > figure > img')).toHaveCount(count);
  await expect(gallery.locator('a, button, dialog, [tabindex], svg')).toHaveCount(0);
  const photos = await gallery.locator(':scope > figure').evaluateAll((figures) => figures.map((figure) => ({
    alt: figure.querySelector('img')?.alt.trim(),
    caption: figure.querySelector('figcaption')?.textContent?.trim(),
  })));
  for (const { alt, caption } of photos) {
    expect(alt).toBeTruthy();
    if (caption !== undefined) {
      expect(caption).toBeTruthy();
      expect(caption.toLocaleLowerCase('es')).not.toBe(alt?.toLocaleLowerCase('es'));
    }
  }
}

export async function galleryScreenshot(gallery: Locator, name: string) {
  await gallery.evaluate(async (element) => {
    await document.fonts.ready;
    const images = Array.from(element.querySelectorAll('img'));
    for (const image of images) image.loading = 'eager';
    await Promise.all(images.map((image) => image.decode()));
  });
  await gallery.screenshot({
    path: 'artifacts/capturas/' + name + '.png',
    style: '.site-header { visibility: hidden }',
  });
}

