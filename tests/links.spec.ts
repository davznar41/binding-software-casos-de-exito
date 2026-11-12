import { readFile, readdir } from 'node:fs/promises';
import { posix, resolve, sep } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const buildOrigin = 'https://build.invalid';
type HtmlPage = { base: string | null; links: string[]; anchors: string[] };

async function parseHtml(page: Page, html: string): Promise<HtmlPage> {
  return page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, 'text/html');
    return {
      base: doc.querySelector('base[href]')?.getAttribute('href') ?? null,
      links: Array.from(doc.querySelectorAll('a[href],area[href]'), (node) => node.getAttribute('href')!),
      anchors: Array.from(doc.querySelectorAll('[id],a[name]')).flatMap((node) =>
        [node.id, node.matches('a') ? node.getAttribute('name') : null].filter((value): value is string => Boolean(value)),
      ),
    };
  }, html);
}

function documentUrl(file: string) {
  const route = file === 'index.html' ? '' : file.replace(/\/index\.html$/, '/');
  return new URL('/' + route.split('/').map(encodeURIComponent).join('/'), buildOrigin);
}

function linkProblems(build: string, files: Set<string>, pages: Map<string, HtmlPage>) {
  const problems: string[] = [];

  for (const [file, doc] of pages) {
    const source = documentUrl(file);
    const base = doc.base === null ? source : new URL(doc.base, source);
    for (const href of doc.links) {
      let problem: string;
      try {
        const url = new URL(href, base);
        if (url.origin !== buildOrigin) continue;
        const pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
        const index = posix.join(pathname, 'index.html');
        const target = files.has(pathname) ? pathname : index;
        const anchor = decodeURIComponent(url.hash.slice(1).split(':~:text=')[0]);
        if (!files.has(target)) {
          problem = 'destino ausente de este build';
        } else if (anchor && anchor.toLowerCase() !== 'top' && pages.has(target) && !pages.get(target)!.anchors.includes(anchor)) {
          problem = 'ancla inexistente «#' + anchor + '»';
        } else {
          continue;
        }
      } catch {
        problem = 'URL o codificación inválida';
      }
      problems.push(build + ' · ' + source.pathname + ' → ' + JSON.stringify(href) + ' · ' + problem);
    }
  }

  return problems;
}

for (const build of ['dist', 'dist-revision']) {
  test('integridad de enlaces y anclas en ' + build, async ({ page }) => {
    const root = resolve(build);
    const files = new Set((await readdir(root, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => resolve(entry.parentPath, entry.name).slice(root.length + 1).split(sep).join('/')));
    const pages = new Map<string, HtmlPage>();
    for (const file of files) {
      if (file.endsWith('.html')) pages.set(file, await parseHtml(page, await readFile(resolve(root, file), 'utf8')));
    }
    expect(pages.size).toBeGreaterThan(0);
    const problems = linkProblems(build, files, pages);
    expect(problems, problems.join('\n')).toEqual([]);
  });
}

test('distingue destinos excluidos y anclas ausentes de enlaces válidos', async ({ page }) => {
  const source = 'casos-de-exito/origen/index.html';
  const target = 'casos-de-exito/revision/index.html';
  const asset = 'casos-de-exito/media/descarga.vtt';
  const pages = new Map([
    [source, await parseHtml(page, [
      '<h2 id="solución">Solución</h2>',
      '<a href="#soluci%C3%B3n">Ancla codificada</a>',
      '<a href="#top">Arriba</a>',
      '<a href="../origen?modo=lectura#soluci%C3%B3n">URL relativa con parámetros</a>',
      '<a href="/casos-de-exito/media/descarga.vtt">Archivo</a>',
      '<a href="https://bindingsoftware.com/contacto/">Externo</a>',
      '<a href="../revision/#detalle">Solo en revisión</a>',
      '<a href="#no-existe">Ancla ausente</a>',
      '<a href="../no-existe/">Página ausente</a>',
    ].join(''))],
  ]);
  const files = new Set([source, asset]);
  const publicProblems = linkProblems('dist', files, pages);
  expect(publicProblems).toEqual([
    'dist · /casos-de-exito/origen/ → "../revision/#detalle" · destino ausente de este build',
    'dist · /casos-de-exito/origen/ → "#no-existe" · ancla inexistente «#no-existe»',
    'dist · /casos-de-exito/origen/ → "../no-existe/" · destino ausente de este build',
  ]);
  files.add(target);
  pages.set(target, await parseHtml(page, '<h2 id="detalle">Detalle</h2>'));
  expect(linkProblems('dist-revision', files, pages)).toEqual([
    'dist-revision · /casos-de-exito/origen/ → "#no-existe" · ancla inexistente «#no-existe»',
    'dist-revision · /casos-de-exito/origen/ → "../no-existe/" · destino ausente de este build',
  ]);
});

