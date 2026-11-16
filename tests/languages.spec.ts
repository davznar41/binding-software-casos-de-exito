import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const es = '/casos-de-exito/';
const en = '/en/casos-de-exito/';
const arcilla = en + 'hotel-arcilla-front-desk/';
const mirador = en + 'hotel-mirador-arrivals/';

test('changes the catalogue and its equivalent articles, then keeps English through related links and reload', async ({ page }) => {
  await page.goto(es);
  await page.getByRole('link', { name: 'EN · English', exact: true }).click();
  await expect(page).toHaveURL(en);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Case studies');
  await page.getByRole('link', { name: /Read case study about Hotel Arcilla/ }).click();
  await expect(page).toHaveURL(arcilla);
  await expect(page.getByRole('heading', { name: 'Property details' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Before and after' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Testimonial' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'The arrival journey at Arcilla' }).locator('figure img')).toHaveCount(4);
  await page.getByRole('link', { name: 'ES · Español', exact: true }).click();
  await expect(page).toHaveURL(es + 'recepcion-hotel-arcilla/');
  await page.getByRole('link', { name: 'EN · English', exact: true }).click();
  await page.getByRole('region', { name: 'Related case studies' }).getByRole('link', { name: /Apartamentos Alcor/ }).click();
  await expect(page).toHaveURL(en + 'arrivals-at-apartamentos-alcor/');
  await expect(page.getByRole('heading', { name: 'After-hours support' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to case studies' }).click();
  await page.reload();
  await expect(page).toHaveURL(en);
  await page.getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: 'Accessibility' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Accessibility');
  await page.getByRole('link', { name: 'ES · Español', exact: true }).click();
  await expect(page).toHaveURL('/accesibilidad/');
});

test('localizes the header and verifies the English case videos and captions', async ({ page }, testInfo) => {
  const response = await page.goto(mirador);
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
  const main = page.getByRole('navigation', { name: 'Main', exact: true });
  const links = [['Home','/en/'],['Why Binding','/en/why-binding/'],['R&I','/en/ri/'],['Comparator 360º','/en/check-in-360/'],['Contact','/en/contact/']];
  for (const [label,path] of links) await expect(main.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', 'https://bindingsoftware.com' + path);
  await expect(main.getByRole('link', { name: 'Login' })).toHaveAttribute('href', 'https://app.bindingid.com/login');
  await expect(main.getByRole('link', { name: 'Success Stories' })).toHaveAttribute('aria-current', 'location');
  await expect(page.locator('video')).toHaveCount(2);
  const track = page.locator('track[srclang="en"]');
  await expect(track).toHaveAttribute('label', 'English');
  expect(await (await page.request.get((await track.getAttribute('src'))!)).text()).toContain('Arrival recorded');
  await expect(page.getByText('Transcript and description', { exact: false })).toHaveCount(2);
  await expect(page.getByRole('heading', { name: /The incoming team.s check/ })).toBeVisible();
  if (testInfo.project.use.browserName === 'chromium' || !testInfo.project.use.browserName) {
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
    expect(axe.violations).toEqual([]);
  }
});

test('mobile keyboard navigation and text reflow at 320px and 200%', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(en + 'cetina-hotels-binding-identity/');
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  await page.evaluate(() => document.fonts.ready);
  const nativeMenu = page.locator('.mobile-navigation summary');
  await nativeMenu.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.keyboard.press('Escape');
  await expect(nativeMenu).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  await page.keyboard.press('Enter');
  const switchLanguage = page.getByRole('link', { name: 'ES · Español', exact: true });
  await switchLanguage.focus();
  await expect(switchLanguage).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(es + 'cetina-hotels-binding-identity/');
});

test('changes language through native links even with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, baseURL });
  try {
    const page = await context.newPage();
    await page.goto(es + 'hotel-bruma-turnos/');
    await page.locator('.mobile-navigation summary').click();
    await page.getByRole('link', { name: 'EN · English', exact: true }).click();
    await expect(page).toHaveURL(en + 'hotel-bruma-shift-handover/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('One arrival record for two shifts');
  } finally {
    await context.close();
  }
});

test('public build exposes neither review translations nor their exclusive captions', async ({ request }) => {
  const production = 'http://127.0.0.1:4336';
  expect((await request.get(production + en)).status()).toBe(200);
  for (const path of [mirador, es + 'media/modular-llegada-en.vtt']) {
    expect((await request.get(production + path)).status()).toBe(404);
  }
  expect((await request.get(en + 'missing-case/')).status()).toBe(404);
});


test('desktop header preserves one row and the seven-link order at its breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  for (const { url, navigation, order, language, alternate } of [
    { url: es, navigation: 'Principal', order: ['Inicio', 'Por qué Binding', 'I+D+i', 'Comparador 360º', 'Contacto', 'Casos de éxito', 'Login'], language: 'ES', alternate: 'EN · English' },
    { url: en, navigation: 'Main', order: ['Home', 'Why Binding', 'R&I', 'Comparator 360º', 'Contact', 'Success Stories', 'Login'], language: 'EN', alternate: 'ES · Español' },
  ]) {
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    const links = page.getByRole('navigation', { name: navigation, exact: true }).getByRole('link');
    await expect(links).toHaveText(order);
    await expect(links.nth(5)).toHaveAttribute('aria-current', 'page');
    const rows = await links.evaluateAll(items => [...new Set(items.map(item => item.getBoundingClientRect().top))]);
    expect(rows).toHaveLength(1);
    const group = page.locator('.desktop-navigation .languages');
    await expect(group.locator('[aria-current="true"]')).toContainText(language);
    const target = await group.getByRole('link', { name: alternate, exact: true }).boundingBox();
    expect(target?.height).toBeGreaterThanOrEqual(44);
    expect(target?.width).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1024);
  }
});

test('touch opens the landscape menu and its language selector stays reachable through scroll', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 680, height: 280 }, baseURL });
  try {
    const page = await context.newPage();
    await page.goto(en + 'cetina-hotels-binding-identity/');
    const menu = page.locator('.mobile-navigation');
    await menu.locator('summary').tap();
    await expect(menu).toHaveAttribute('open', '');
    const active = menu.getByRole('link', { name: 'Success Stories', exact: true });
    await expect(active).toHaveAttribute('aria-current', 'location');
    const switchLanguage = menu.getByRole('link', { name: 'ES · Español', exact: true });
    await switchLanguage.scrollIntoViewIfNeeded();
    expect(await menu.locator('.mobile-panel').evaluate(panel => panel.scrollTop)).toBeGreaterThan(0);
    await switchLanguage.tap();
    await expect(page).toHaveURL(es + 'cetina-hotels-binding-identity/');
  } finally {
    await context.close();
  }
});

for (const route of [es, en]) {
  test('catalogue reflows at 320 px with 200% text in ' + route, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 750 });
    await page.goto(route);
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await page.evaluate(() => document.fonts.ready);
    const measurements = await page.evaluate(() => {
      const rect = (element: Element) => element.getBoundingClientRect();
      const controls = [...document.querySelectorAll('.featured-action, .cases-contact-inner > .button')];
      return {
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        header: document.querySelector('.site-header')!.scrollWidth,
        controls: controls.map(control => {
          const parent = rect(control.parentElement!);
          const bounds = rect(control);
          const walker = document.createTreeWalker(control, NodeFilter.SHOW_TEXT);
          const textRects: DOMRect[] = [];
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.textContent?.trim() || node.parentElement?.closest('.sr-only')) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            textRects.push(...range.getClientRects());
          }
          return {
            withinParent: bounds.left >= parent.left && bounds.right <= parent.right,
            textFits: textRects.length > 0 && textRects.every(part =>
              part.left >= bounds.left - 1 && part.right <= bounds.right + 1 &&
              part.top >= bounds.top - 1 && part.bottom <= bounds.bottom + 1),
            target: bounds.height,
          };
        }),
      };
    });
    expect(measurements).toMatchObject({ viewport: 320, document: 320, header: 320 });
    expect(measurements.controls).toHaveLength(2);
    for (const control of measurements.controls) {
      expect(control).toMatchObject({ withinParent: true, textFits: true });
      expect(control.target).toBeGreaterThanOrEqual(44);
    }
  });
}

test('the header reveals the hero, darkens on scroll and preserves focus and geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(es);
  const header = page.locator('.site-header');
  const hero = page.locator('.corporate-hero');
  const media = hero.locator('.hero-media');
  await expect(header).toHaveAttribute('data-scrolled', 'false');
  const initial = await header.boundingBox();
  expect(initial?.height).toBe(89);
  expect((await media.boundingBox())?.y).toBeCloseTo(0, 1);
  expect((await hero.boundingBox())?.y).toBe(89);
  await expect(header).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.evaluate(() => scrollTo(0, 300));
  await expect(header).toHaveAttribute('data-scrolled', 'true');
  await expect(header).toHaveCSS('background-color', 'rgba(28, 20, 36, 0.96)');
  expect(await header.boundingBox()).toEqual(initial);
  await page.keyboard.press('Tab');
  await page.evaluate(() => scrollTo(0, 300));
  const contact = header.getByRole('link', { name: 'Contacto', exact: true });
  await contact.evaluate((link: HTMLElement) => link.focus({ preventScroll: true }));
  await expect(contact).toBeFocused();
  await expect(contact).toHaveCSS('outline-style', 'solid');
  await expect(contact).toHaveCSS('opacity', '1');
  const focus = await contact.boundingBox();
  expect(focus!.y).toBeGreaterThanOrEqual(0);
  expect(focus!.y + focus!.height).toBeLessThanOrEqual(initial!.height);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(header).toHaveAttribute('data-scrolled', 'false');
  expect(await header.boundingBox()).toEqual(initial);
});
