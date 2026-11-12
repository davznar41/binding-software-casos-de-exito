import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { accessible, cases, galleryGeometry, galleryScreenshot, longCase, mediumCase, noHorizontalScroll, publicUrl, screenshot, shortCase, staticGallery, widths } from './helpers';

test('el catálogo público coincide con las rutas emitidas y excluye el borrador de control', async ({ page, request }) => {
  const root = 'dist/casos-de-exito';
  const emitted = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, 'index.html')))
    .map((entry) => cases + entry.name + '/')
    .sort();
  await page.goto(publicUrl + cases);
  const links = page.locator('main .featured-action, main .card-action');
  const listed = await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')).sort());
  expect(listed).toEqual(emitted);
  for (const path of emitted) expect((await request.get(publicUrl + path)).status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Contactar con Binding' })).toHaveAttribute('href', 'https://bindingsoftware.com/contacto/');
  for (const path of ['borrador-control/', 'media/borrador-control.webp']) {
    expect((await request.get(publicUrl + cases + path)).status()).toBe(404);
  }
  await accessible(page);
});


test('destacado, tarjeta, migas, casos relacionados y regreso', async ({ page }) => {
  await page.goto(cases);
  await expect(page.locator('.featured-case')).toHaveCount(1);
  await expect(page.locator('.case-card')).not.toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  const featured = page.locator('.featured-action');
  const destination = await featured.getAttribute('href');
  await featured.click();
  await expect(page).toHaveURL(destination!);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto(longCase);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Ruta de navegación' }).locator('[aria-current="page"]')).toHaveText('Una recepción preparada para las horas punta');
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Casos de éxito' })).toHaveAttribute('aria-current', 'location');
  for (const name of ['Ficha del establecimiento', 'Antes y después', 'Resultados', 'Testimonio', 'El recorrido de una llegada en Arcilla', 'Casos relacionados']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await page.getByRole('region', { name: 'Casos relacionados' }).getByRole('link', { name: /Apartamentos Alcor/ }).click();
  await expect(page).toHaveURL(mediumCase);
  await expect(page.getByRole('heading', { name: 'Atención fuera de horario' })).toBeVisible();
  await page.getByRole('region', { name: 'Casos relacionados' }).getByRole('link', { name: /Hotel Bruma/ }).click();
  await expect(page).toHaveURL(shortCase);
  await expect(page.getByRole('heading', { name: 'Ficha del establecimiento' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Testimonio' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Volver a Casos de éxito' }).click();
  await expect(page).toHaveURL(cases);
});

test('enlaces corporativos, orden de cabecera y acceso al pie', async ({ page }) => {
  await page.goto(cases);
  const header = page.getByRole('navigation', { name: 'Principal' });
  await expect(header.getByRole('link')).toHaveText([
    'Inicio', 'Por qué Binding', 'I+D+i', 'Comparador 360º', 'Contacto', 'Casos de éxito', 'Login',
  ]);
  await expect(header.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', 'https://bindingsoftware.com/');
  await expect(header.getByRole('link', { name: 'Casos de éxito' })).toHaveAttribute('aria-current', 'page');
  await expect(header.getByRole('link', { name: 'Login' })).toHaveAttribute('href', 'https://app.bindingid.com/login');
  await page.getByRole('navigation', { name: 'Pie de página' }).getByRole('link', { name: 'Accesibilidad' }).click();
  await expect(page).toHaveURL('/accesibilidad/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Accesibilidad');
  await accessible(page);

  await page.goto(cases);
  await page.setViewportSize({ width: 961, height: 900 });
  await expect(page.locator('summary')).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(page.locator('summary')).toBeHidden();
  const rows = await header.getByRole('link').evaluateAll((links) =>
    [...new Set(links.map((link) => Math.round(link.getBoundingClientRect().top)))],
  );
  expect(rows).toHaveLength(1);
});

test('teclado, salto al contenido, foco y cierre con Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(cases);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Saltar al contenido' });
  await expect(skip).toBeFocused();
  expect(await skip.evaluate((node) => getComputedStyle(node).outlineWidth)).toBe('3px');
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const menu = page.locator('summary');
  await menu.focus();
  await page.keyboard.press('Enter');
  const links = page.getByRole('navigation', { name: 'Principal' });
  await expect(links).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(links.getByRole('link', { name: 'Inicio' })).toBeFocused();
  await noHorizontalScroll(page);
  await accessible(page);
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(links).toHaveCount(0);
});

test('menú móvil y contenido funcionan sin JavaScript', async ({ browser }) => {
  const page = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 650 },
  });
  await page.goto('http://127.0.0.1:4337' + cases);
  await page.locator('summary').click();
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
  const cetina = cases + 'cetina-hotels-binding-identity/';
  await page.locator('main a[href="' + cetina + '"]').click();
  await expect(page).toHaveURL('http://127.0.0.1:4337' + cetina);
  await expect(page.getByRole('heading', { name: 'El reto de la llegada' })).toBeVisible();
  await page.close();
});

for (const width of widths) {
  for (const [label, path] of [['índice', cases], ['artículo largo', longCase], ['artículo corto', shortCase]]) {
    test(label + ' sin desbordamiento a ' + width + ' px', async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await noHorizontalScroll(page);
      await accessible(page);
      const isMobile = width < 1024;
      await expect(page.locator('summary')).toBeVisible({ visible: isMobile });
    });
  }
}

test('ampliación de texto al 200 %, reflujo y movimiento reducido', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 850 });
  await page.goto(longCase);
  await page.addStyleTag({ content: 'html { font-size: 200% }' });
  await noHorizontalScroll(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const heading = page.locator('.hero-copy h1');
  expect(await heading.evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await heading.evaluate((node) => getComputedStyle(node).animationName)).toBe('editorial-entry');
});

test('capturas del índice y de ambas longitudes', async ({ browser, baseURL }) => {
  for (const [width, label] of [[1440, 'escritorio'], [768, 'tablet'], [390, 'movil']] as const) {
    for (const [path, name] of [[cases, 'listado'], [longCase, 'articulo-largo'], [shortCase, 'articulo-corto'], [mediumCase, 'auditoria-alcor']]) {
      const page = await browser.newPage({
        baseURL,
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
      });
      try {
        await page.goto(path);
        await screenshot(page, name + '-' + label);
      } finally {
        await page.close();
      }
    }
  }
});

test('CTA destacado y enlaces secundarios son distinguibles y tienen foco', async ({ page }) => {
  await page.goto(cases);
  const primary = page.locator('.featured-case').getByRole('link', { name: /Leer caso/ });
  const secondary = page.locator('.case-card').first().getByRole('link', { name: /Leer caso/ });
  await expect(primary).toHaveCSS('background-color', 'rgb(229, 185, 238)');
  await expect(secondary).toHaveCSS('text-decoration-line', 'underline');
  await secondary.focus();
  await expect(secondary).toBeFocused();
  await expect(secondary).toHaveCSS('outline-width', '3px');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Ruta de navegación' })).toBeVisible();
});



const viewportMatrix = [[320,250],[320,568],[375,667],[390,844],[768,1024],[1024,768],[1440,900]];

test('hero, contenido y navegación en las siete resoluciones de entrega', async ({ page }) => {
  for (const [width, height] of viewportMatrix) {
    await page.setViewportSize({ width, height });
    for (const path of [cases, longCase, cases + 'flujo-editorial-hotel-mirador/']) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const geometry = await page.evaluate(() => {
        const header = document.querySelector('.site-header')!.getBoundingClientRect();
        const hero = document.querySelector('.corporate-hero')!.getBoundingClientRect();
        const next = document.querySelector('.catalog, .article-contents')!.getBoundingClientRect();
        const title = document.querySelector('h1')!.getBoundingClientRect();
        return { header: header.bottom, start: hero.top, end: next.top, title: title.bottom };
      });
      expect(Math.abs(geometry.start - geometry.header)).toBeLessThan(1);
      expect(geometry.end).toBeGreaterThanOrEqual(height - 1);
      expect(geometry.title).toBeLessThan(geometry.end);
      if ((path === cases && height >= 568) || height >= 844) {
        expect(Math.abs(geometry.end - height)).toBeLessThan(2);
      }
      await noHorizontalScroll(page);
      await accessible(page);
      await expect(page.locator('body')).not.toContainText(/Vista de revisión|Ejemplo editorial|Hotel ficticio|Imagen generada|Contenido simulado/i);
    }
  }
});

test('la entrada por scroll sucede una vez y el hover escala solo la fotografía', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    document.addEventListener('animationstart', (event) => {
      if (event.animationName !== 'editorial-reveal' || !(event.target instanceof HTMLElement)) return;
      event.target.dataset.starts = String(Number(event.target.dataset.starts ?? 0) + 1);
    });
  });
  await page.goto(cases);
  const featured = page.locator('.featured-case');
  await featured.scrollIntoViewIfNeeded();
  await expect(featured).toHaveClass(/entry-settled/);
  await expect(featured).toHaveAttribute('data-starts', '1');
  await page.evaluate(() => window.scrollTo(0, 0));
  await featured.scrollIntoViewIfNeeded();
  await expect(featured).toHaveAttribute('data-starts', '1');
  const photoCard = page.locator(':is(.featured-case, .case-card):has(.case-photo-crop)').first();
  const image = photoCard.locator('.case-photo-crop img');
  await photoCard.hover();
  await expect(image).toHaveCSS('transform', 'matrix(1.03, 0, 0, 1.03, 0, 0)');
  await expect(photoCard.locator('.case-photo-crop')).toHaveCSS('overflow', 'hidden');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(image).toHaveCSS('transform', 'none');
  await expect(page.locator('.hero-copy h1')).toHaveCSS('animation-name', 'none');
});

test('Chromium conserva la lectura al ampliar la escala visual al 200 %', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(longCase);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(2);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await noHorizontalScroll(page);
  await cdp.detach();
});

test('Cetina conserva atribución, cifras y medios de su galería estática', async ({ page }) => {
  const path = cases + 'cetina-hotels-binding-identity/';
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cetina Hotels');
  await expect(page.getByText('SIHOT.PMS', { exact: false }).first()).toBeVisible();
  for (const value of ['Más de 40.000', 'Unos 20 segundos', 'Unos 5 segundos', 'Cerca del 100 %']) {
    await expect(page.getByText(value, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('Javier Nicolás Torres', { exact: true })).toBeVisible();
  await staticGallery(page.getByRole('region', { name: 'Casa de las Telas' }).locator('[data-gallery]'), 2);
});

test('Arcilla mantiene cuatro fotografías distintas y una cuadrícula equilibrada', async ({ page, request }) => {
  for (const [width, columns] of [[320, 1], [375, 1], [390, 1], [768, 2], [1024, 2], [1440, 2]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(longCase);
    const gallery = page.locator('[data-gallery="uniforme"]');
    await staticGallery(gallery, 4);
    await expect(gallery.locator('figcaption')).toHaveCount(4);
    const { width: galleryWidth, left } = await galleryGeometry(gallery, 4, columns);
    await noHorizontalScroll(page);
    if (width === 390 || width === 1440) {
      await galleryScreenshot(gallery.locator('..'), 'galeria-estatica-arcilla-' + width);
    }
    if (width === 1440) {
      const facts = await page.locator('.case-facts').boundingBox();
      const prose = await page.locator('.article-prose').boundingBox();
      expect(left).toBeGreaterThanOrEqual(facts!.x + facts!.width);
      expect(galleryWidth).toBeGreaterThan(prose!.width);
      const urls = await gallery.locator('img').evaluateAll((images) => images.map((image) => (image as HTMLImageElement).src));
      const hashes = new Set<string>();
      for (const url of urls) {
        const response = await request.get(url);
        expect(response.ok()).toBe(true);
        hashes.add(createHash('sha256').update(await response.body()).digest('hex'));
      }
      expect(hashes.size).toBe(4);
      const photo = gallery.locator('img').first();
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await photo.hover();
      await expect(photo).toHaveCSS('cursor', 'auto');
      await expect(photo).toHaveCSS('transform', 'none');
      await photo.click();
      await expect(page).toHaveURL(longCase);
      await expect(page.locator('dialog')).toHaveCount(0);
    }
  }
});

test('Mirador conserva la foto principal y dos secundarias en móvil, tablet y escritorio', async ({ page }) => {
  for (const [viewport, columns] of [[320, 1], [375, 1], [390, 1], [768, 2], [1024, 2], [1440, 2]]) {
    await page.setViewportSize({ width: viewport, height: 900 });
    await page.goto(cases + 'flujo-editorial-hotel-mirador/');
    const gallery = page.locator('[data-gallery="destacada"]');
    await staticGallery(gallery, 3);
    await expect(gallery.locator('figcaption')).toHaveCount(3);
    const { width, rects } = await galleryGeometry(gallery, 3, columns);
    expect(rects[0].width).toBeCloseTo(width, 0);
    expect(rects[1].top).toBeGreaterThan(rects[0].top);
    if (columns === 2) expect(rects[1].top).toBeCloseTo(rects[2].top, 0);
    await noHorizontalScroll(page);
    if (viewport === 390 || viewport === 1440) {
      await galleryScreenshot(gallery.locator('..'), 'galeria-estatica-mirador-' + viewport);
    }
    if (viewport === 768) {
      await page.addStyleTag({ content: 'html { font-size: 200% }' });
      await noHorizontalScroll(page);
      await accessible(page);
    }
  }
});


test('Alcor combina formatos y Bruma conserva su lectura breve', async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(mediumCase);
    const blocks = page.locator('[data-editorial-block]');
    expect(await blocks.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-editorial-block'))))
      .toEqual(['texto', 'imagen', 'comparacion', 'texto', 'testimonio', 'resultados']);
    await expect(blocks.locator('img')).toHaveCount(1);
    await noHorizontalScroll(page);
    await accessible(page);
  }
  await page.goto(shortCase);
  await expect(page.locator('[data-editorial-block]')).toHaveCount(2);
  await expect(page.locator('[data-gallery]')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Casos relacionados' }).getByRole('link')).toHaveCount(3);
});

test('cabecera móvil refluye a 320 px con texto al 200 % y conserva el foco', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(cases + 'cetina-hotels-binding-identity/', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  await page.evaluate(() => document.fonts.ready);
  await noHorizontalScroll(page);
  const logo = page.locator('.site-header .brand img');
  const menu = page.locator('.mobile-navigation summary');
  for (const element of [logo, menu]) {
    await expect(element).toBeVisible();
    const bounds = (await element.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  }
  const box = (await logo.boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(await logo.evaluate((img: HTMLImageElement) =>
    img.naturalWidth / img.naturalHeight,
  ), 1);
  await menu.focus();
  await page.keyboard.press('Enter');
  const links = page.getByRole('navigation', { name: 'Principal' });
  await expect(links).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(links.getByRole('link', { name: 'Inicio' })).toBeFocused();
  await noHorizontalScroll(page);
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(links).toHaveCount(0);
  await accessible(page);
  await page.screenshot({ path: 'artifacts/cierre-hallazgos/cabecera-320-texto-200-despues.png' });
});

test('Bruma selecciona la portada de 648 px en móvil y conserva la original en escritorio', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(shortCase);
  const cover = page.locator('.hero-media img');
  await expect(cover).toHaveAttribute('sizes', '100vw');
  await expect(cover).toHaveAttribute('srcset', /mostrador-turnos-648\.webp 648w, .*mostrador-turnos-1200\.webp 1200w/);
  await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/mostrador-turnos-648\.webp$/);
  await expect(cover).toHaveAttribute('fetchpriority', 'high');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/mostrador-turnos-1200\.webp$/);
});
