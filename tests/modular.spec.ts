import { expect, test } from '@playwright/test';
import { accessible, cases, galleryGeometry, galleryScreenshot, staticGallery, noHorizontalScroll, screenshot } from './helpers';

const variants = [
  ['modular-texto-extenso', ['texto']],
  ['modular-diez-fotos', ['imagen', 'texto', 'galeria', 'imagen', 'imagen', 'texto', 'galeria', 'imagen']],
  ['modular-video-inicio', ['video', 'texto']],
  ['modular-dos-videos', ['texto', 'video', 'texto', 'video', 'texto']],
  ['modular-voz-resultados', ['testimonio', 'resultados', 'resultados']],
  ['modular-breve', ['texto']],
  ['flujo-editorial-hotel-mirador', ['video', 'texto', 'imagen', 'comparacion', 'texto', 'video', 'testimonio', 'resultados', 'galeria']],
] as const;

for (const [slug, expected] of variants) {
  test(slug + ' conserva orden, navegación, ritmo y accesibilidad', async ({ page }) => {
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(cases + slug + '/');
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      const blocks = page.locator('[data-editorial-block]');
      expect(await blocks.evaluateAll((elements) => elements.map((node) => node.getAttribute('data-editorial-block')))).toEqual([...expected]);
      expect(await blocks.evaluateAll((elements) => elements.every((node) => node.childElementCount > 0 && node.getBoundingClientRect().height > 0))).toBe(true);
      expect(await page.locator('[id]').evaluateAll((nodes) => new Set(nodes.map((node) => node.id)).size === nodes.length)).toBe(true);
      await noHorizontalScroll(page);
      await accessible(page);
      const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' });
      await expect(crumbs.getByRole('link', { name: 'Casos de éxito' })).toHaveAttribute('href', cases);
      await expect(page.getByRole('link', { name: 'Volver a Casos de éxito' })).toHaveAttribute('href', cases);
    }

    if (slug === 'modular-diez-fotos') {
      const photos = page.locator('.editorial-flow img');
      await expect(photos).toHaveCount(10);
      await expect(page.locator('[data-editorial-block="galeria"]')).toHaveCount(2);
      expect(await photos.evaluateAll((images) => new Set(images.map((image) => image.getAttribute('src'))).size)).toBe(10);
    }
    if (slug === 'modular-texto-extenso') {
      await expect(page.locator('.article-prose h2')).toHaveCount(6);
    }
    await page.getByRole('link', { name: 'Volver a Casos de éxito' }).click();
    await expect(page).toHaveURL(cases);
  });
}

test('MP4 y WebM se reproducen, WebVTT se carga y la transcripción se abre', async ({ page, request }) => {
  const videoRequests: string[] = [];
  page.on('request', (request) => {
    if (/\.(?:mp4|webm)$/.test(request.url())) videoRequests.push(request.url());
  });
  await page.goto(cases + 'modular-dos-videos/');
  expect(videoRequests).toEqual([]);
  const videos = page.locator('video');
  await expect(videos).toHaveCount(2);
  for (const [index, extension, mime] of [[0, 'mp4', 'video/mp4'], [1, 'webm', 'video/webm']] as const) {
    const video = videos.nth(index);
    await expect(video).toHaveAttribute('preload', 'none');
    await expect(video).toHaveAttribute('controls', '');
    await expect(video).not.toHaveAttribute('autoplay');
    await expect(video.locator('source')).toHaveAttribute('src', new RegExp(extension + '$'));
    await expect(video.locator('source')).toHaveAttribute('type', mime);
    await video.evaluate(async (element) => {
      const media = element as HTMLVideoElement;
      media.muted = true;
      await media.play();
    });
    await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  }
  const track = videos.first().locator('track');
  await expect(track).toHaveAttribute('kind', 'captions');
  const vtt = await request.get((await track.getAttribute('src'))!);
  expect(vtt.ok()).toBe(true);
  expect(await vtt.text()).toMatch(/^WEBVTT/);
  await expect.poll(() => videos.first().evaluate((element) =>
    (element as HTMLVideoElement).textTracks[0].cues?.length ?? 0,
  )).toBeGreaterThan(0);
  const transcript = page.locator('.video-transcript').first();
  await transcript.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(transcript).toHaveAttribute('open', '');
  await expect(transcript.locator('p')).toContainText('tono breve');
});

test('cada proveedor externo solo carga tras activación', async ({ page, browser, baseURL }) => {
  const calls: string[] = [];
  await page.route(/youtube-nocookie\.com|player\.vimeo\.com/, async (route) => {
    calls.push(route.request().url());
    await route.fulfill({ contentType: 'text/html', body: '<title>Reproductor de control</title>' });
  });
  await page.goto(cases + 'modular-proveedores/');
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(calls).toEqual([]);
  const youtube = page.getByRole('button', { name: /Cargar vídeo de YouTube/ });
  await youtube.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('iframe')).toHaveCount(1);
  await expect(page.locator('iframe')).toBeFocused();
  await expect(page.locator('iframe')).toHaveAttribute('title', 'Reproductor externo de control');
  await expect.poll(() => calls.length).toBe(1);
  expect(calls[0]).toContain('youtube-nocookie.com/embed/');
  await page.getByRole('button', { name: /Cargar vídeo de Vimeo/ }).click();
  await expect.poll(() => calls.length).toBe(2);
  expect(calls[1]).toContain('player.vimeo.com/video/');
  const noScript = await browser.newPage({ baseURL, javaScriptEnabled: false });
  try {
    await noScript.goto(cases + 'modular-proveedores/');
    await expect(noScript.getByRole('link', { name: /en YouTube/ })).toBeVisible();
    await expect(noScript.locator('iframe')).toHaveCount(0);
  } finally {
    await noScript.close();
  }
});

test('capturas del catálogo y del artículo completo en escritorio y móvil', async ({ browser, baseURL }) => {
  for (const [width, label] of [[1440, 'escritorio'], [390, 'movil']] as const) {
    for (const [name, route] of [['catalogo', cases], ['articulo', cases + 'flujo-editorial-hotel-mirador/']]) {
      const page = await browser.newPage({ baseURL, viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      try {
        await page.goto(route);
        await screenshot(page, 'modular-' + name + '-' + label);
      } finally {
        await page.close();
      }
    }
  }
});

test('galerías de 1, 2, 3, 4 y 6 fotos se ajustan al ancho y conservan su geometría', async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(cases + 'modular-galerias/');
    await expect(page.locator('[data-gallery]')).toHaveCount(5);
    for (const count of [1, 2, 3, 4, 6]) {
      const gallery = page.locator('[data-gallery][data-count="' + count + '"]');
      const columns = count === 1 || width < 768 ? 1 : width === 1440 && (count === 3 || count === 6) ? 3 : 2;
      await staticGallery(gallery, count);
      await expect(gallery.locator('figcaption')).toHaveCount(0);
      const { rects } = await galleryGeometry(gallery, count, columns);
      expect(rects[0].fit).toBe(count === 1 ? 'contain' : 'cover');
      const sources = await gallery.locator('img').evaluateAll((images) => images.map((image) => image.getAttribute('src')));
      expect(new Set(sources).size).toBe(count);
      if (width === 1440) await galleryScreenshot(gallery, 'galeria-estatica-geometria-' + count);
    }
    await noHorizontalScroll(page);
    await accessible(page);
    await expect(page.getByRole('link', { name: 'Volver a Casos de éxito' })).toHaveAttribute('href', cases);
  }
});

test('diez fotos y varias galerías mantienen su composición con JavaScript deshabilitado', async ({ browser, baseURL }) => {
  const page = await browser.newPage({ baseURL, javaScriptEnabled: false });
  try {
    for (const viewport of [390, 768, 1440]) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await page.goto(cases + 'modular-galerias-modos/');
      const galleries = page.locator('[data-gallery]');
      await expect(galleries).toHaveCount(3);
      const columns = viewport === 390 ? 1 : 2;
      for (const [index, count, tracks] of [[0, 10, viewport === 1440 ? 3 : columns], [1, 2, columns], [2, 3, columns]]) {
        const gallery = galleries.nth(index);
        await staticGallery(gallery, count);
        await galleryGeometry(gallery, count, tracks);
      }
      await noHorizontalScroll(page);
      if (viewport === 1440) await galleryScreenshot(galleries.first(), 'galeria-estatica-geometria-10');
    }
  } finally {
    await page.close();
  }
});
