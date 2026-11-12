import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { build } from '../scripts/build-tools.mjs';

const reports = resolve('artifacts/quality');
let sandbox;
let content;
let output;

const example = [
  '---',
  'status: publicado',
  'origin: autorizado',
  'title: Caso de control sintético',
  'summary: Contenido desechable creado por las pruebas.',
  'client: Cliente ficticio de prueba',
  'category: Integración PMS',
  'publishedOn: "2026-11-11"',
  'blocks:',
  '  - type: texto',
  'cover:',
  '  file: recepcion-ilustrativa-768.webp',
  '  alt: Mostrador de una recepción ficticia',
  '  width: 768',
  '  height: 512',
].join('\n');

const body = '\n---\n\n## Contexto y desafío\n\nTexto de control.\n\n## Solución\n\nTexto de control.\n';
const index = () => readFileSync(join(output, 'casos-de-exito/index.html'), 'utf8');

function fixture(name, header, markdown = body) {
  writeFileSync(join(content, name + '.md'), header + markdown);
}

function run(mode = 'production') {
  return build(mode, output, sandbox);
}

function expectInvalid(name, header, error, markdown = body) {
  fixture(name, header.replace('Caso de control sintético', 'Caso de validación ' + name), markdown);
  try {
    const result = run();
    assert.notEqual(result.status, 0, result.log);
    assert.match(result.log, error);
  } finally {
    rmSync(join(content, name + '.md'), { force: true });
  }
}

before(() => {
  mkdirSync(reports, { recursive: true });
  sandbox = mkdtempSync(join(reports, 'contenido-'));
  for (const path of ['astro.config.mjs', 'package.json', 'tsconfig.json', 'src', 'public']) {
    cpSync(path, join(sandbox, path), {
      recursive: true,
      filter: (entry) => resolve(entry) !== resolve('src/content/casos'),
    });
  }
  content = join(sandbox, 'src/content/casos');
  mkdirSync(content, { recursive: true });
  symlinkSync(resolve('node_modules'), join(sandbox, 'node_modules'), 'junction');
  output = join(sandbox, 'dist');
});

after(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

test('un borrador y una demo producen un catálogo público vacío y sin imágenes', () => {
  fixture('borrador', example.replace('publicado', 'borrador').replace('recepcion-ilustrativa-768.webp', 'borrador-control.webp'));
  fixture('demostracion', example.replace('publicado', 'demostracion'));
  const result = run();
  assert.equal(result.status, 0, result.log);
  assert.match(index(), /Los casos se publicarán aquí/);
  for (const path of ['borrador/index.html', 'demostracion/index.html', 'media/borrador-control.webp', 'media/recepcion-ilustrativa-768.webp']) {
    assert.equal(existsSync(join(output, 'casos-de-exito', path)), false, path);
  }
});

test('un artículo publicado aparece en el índice y genera HTML y portada', () => {
  fixture('caso-control', example + '\nrelated:\n  - borrador');
  const result = run();
  assert.equal(result.status, 0, result.log);
  assert.match(index(), /caso-control\//);
  assert.doesNotMatch(index(), /demostracion\/|borrador\//);
  const article = readFileSync(join(output, 'casos-de-exito/caso-control/index.html'), 'utf8');
  assert.match(article, /<h1[^>]*>Caso de control sintético<\/h1>/);
  assert.doesNotMatch(article, /Casos relacionados<\/h2>/);
  assert.equal(existsSync(join(output, 'casos-de-exito/media/recepcion-ilustrativa-768.webp')), true);
});

test('la revisión renderiza los bloques completos y mantiene el borrador fuera', () => {
  const fields = [
    'cardImage:',
    '  file: recepcion-ilustrativa-768.webp',
    '  alt: Mostrador de madera',
    '  width: 768',
    '  height: 512',
    'facts:',
    '  establishment: Hotel de prueba',
    '  rooms: 20',
    '  implementedOn: Prueba editorial',
    '  website: https://example.org/',
    '  logo:',
    '    file: hotel-referencia-720.webp',
    '    alt: Recurso de prueba del espacio de logotipo',
    '    width: 720',
    '    height: 480',
    'seo:',
    '  title: Metadatos de prueba',
    '  description: Ejemplo de metadatos personalizados.',
    '  image:',
    '    file: hotel-referencia-720.webp',
    '    alt: Imagen de prueba social',
    '    width: 720',
    '    height: 480',
  ].join('\n');
  const testimony = [
    '  - type: testimonio',
    '    quote:',
    '      text: Cita ficticia para comprobaciones de plantilla.',
    '      author: Personaje ficticio',
    '      role: Recepcionista de prueba',
    '      establishment: Hotel de prueba',
    '      photo:',
    '        file: hotel-referencia-720.webp',
    '        alt: Recurso de prueba del espacio de retrato',
    '        width: 720',
    '        height: 480',
  ].join('\n');
  fixture('demostracion', example.replace('publicado', 'demostracion').replace('  - type: texto', '  - type: texto\n' + testimony) + '\n' + fields);
  const result = run('revision');
  assert.equal(result.status, 0, result.log);
  assert.match(index(), /caso-control\//);
  assert.match(index(), /demostracion\//);
  const html = readFileSync(join(output, 'casos-de-exito/demostracion/index.html'), 'utf8');
  for (const text of ['Ficha del establecimiento', 'Personaje ficticio', 'Metadatos de prueba', 'Recurso de prueba del espacio de retrato', 'noindex, nofollow']) {
    assert.ok(html.includes(text), text);
  }
  assert.equal(existsSync(join(output, 'casos-de-exito/media/borrador-control.webp')), false);
});

test('rechaza el slug duplicado', () => {
  expectInvalid('otro-nombre', example + '\nslug: caso-control', /slug duplicado.*caso-control/);
});

test('rechaza el slug inválido', () => {
  expectInvalid('slug-incorrecto', example + '\nslug: "Con espacios"', /Usa minúsculas, números y guiones/);
});

test('rechaza el recurso inexistente', () => {
  expectInvalid('imagen-inexistente', example.replace('recepcion-ilustrativa-768.webp', 'no-existe.webp'), /falta el recurso.*no-existe/);
});

test('rechaza un testimonio sin autor', () => {
  expectInvalid('cita-incompleta', example.replace('  - type: texto', '  - type: texto\n  - type: testimonio\n    quote:\n      text: Texto de prueba.'), /quote\.author/);
});

test('rechaza relaciones a casos inexistentes', () => {
  expectInvalid('enlace-invalido', example + '\nrelated:\n  - no-existe', /relación inválida.*no-existe/);
});

test('rechaza una métrica sin fuente', () => {
  expectInvalid('metrica-sin-fuente', example.replace('  - type: texto', '  - type: texto\n  - type: resultados\n    results:\n      - type: cuantitativo\n        value: "2"\n        description: Medición de prueba'), /results\.0\.source|results\.0/);
});

test('rechaza un H1 en el cuerpo del artículo', () => {
  expectInvalid('encabezado-invalido', example, /el Markdown debe comenzar en H2/, '\n---\n\n# Segundo H1\n\nTexto de prueba.\n');
});


test('rechaza títulos publicados duplicados', () => {
  fixture('duplicado', example);
  try {
    const result = run();
    assert.notEqual(result.status, 0, result.log);
    assert.match(result.log, /el título de un caso publicado debe ser único/);
  } finally {
    rmSync(join(content, 'duplicado.md'), { force: true });
  }
});

test('relacionados prioriza curación y afinidad, respeta estados y escala a cien casos', () => {
  const outputArticle = (slug) => readFileSync(join(output, 'casos-de-exito', slug, 'index.html'), 'utf8');
  const related = (slug) => {
    const section = outputArticle(slug).match(/<section[^>]*aria-labelledby="related-title"[\s\S]*?<\/section>/)?.[0] ?? '';
    return [...section.matchAll(/href="\/casos-de-exito\/([^"/]+)\/"/g)].map((match) => match[1]);
  };

  fixture('catalogo-1', example.replace('Caso de control sintético', 'Caso de catálogo 1'));
  let result = run();
  assert.equal(result.status, 0, result.log);
  assert.deepEqual(related('catalogo-1'), ['caso-control']);

  const original = readFileSync(join(content, 'caso-control.md'), 'utf8');
  fixture('caso-control', example + '\nsolutions: [Entrada]\ntopics: [Relevo]\nrelated: [demostracion, borrador, catalogo-30, catalogo-30]');
  try {
    for (let count = 2; count <= 99; count++) {
      let entry = example.replace('Caso de control sintético', 'Caso de catálogo ' + count);
      if (count === 77) entry += '\nsolutions: [entrada, Entrada]';
      if (count === 78) entry += '\ntopics: [RELEVO]';
      if (count === 97) entry = entry.replace('2026-11-11', '2026-11-12');
      fixture('catalogo-' + count, entry);
    }
    result = run();
    assert.equal(result.status, 0, result.log);
    assert.equal([...index().matchAll(/href="\/casos-de-exito\/catalogo-\d+\/"/g)].length, 99);
    assert.equal(existsSync(join(output, 'casos-de-exito/catalogo-99/index.html')), true);
    assert.deepEqual(related('caso-control'), ['catalogo-30', 'catalogo-77', 'catalogo-78']);
    assert.deepEqual(related('catalogo-1'), ['catalogo-97', 'caso-control', 'catalogo-10']);
    assert.equal(existsSync(join(output, 'casos-de-exito/media/borrador-control.webp')), false);
  } finally {
    writeFileSync(join(content, 'caso-control.md'), original);
    for (let count = 1; count <= 99; count++) rmSync(join(content, 'catalogo-' + count + '.md'), { force: true });
  }
});

test('una entrada autorizada sin portada genera tarjeta y hero sin medios', () => {
  fixture('sin-portada', example
    .replace('Caso de control sintético', 'Una historia sin portada')
    .replace(/\ncover:[\s\S]+$/, '') + '\nfeatured: true');
  const result = run();
  assert.equal(result.status, 0, result.log);
  const article = readFileSync(join(output, 'casos-de-exito/sin-portada/index.html'), 'utf8');
  assert.match(article, /Una historia sin portada/);
  assert.doesNotMatch(article, /class="hero-media/);
  assert.match(index(), /class="featured-case"[\s\S]*?href="\/casos-de-exito\/sin-portada\/"/);
  assert.match(index(), /caso-control\//);
});

test('cambiar el estado de un contenido sintético no permite publicarlo', () => {
  expectInvalid('sintetico-publicado', example.replace('origin: autorizado', 'origin: sintetico'),
    /Publicar requiere procedencia autorizada/);
});

test('rechaza usar una variante de la misma foto como otra imagen de la galería', () => {
  const gallery = [
    '  - type: galeria',
    '    images:',
    '      - { file: arcilla-entrada-750.webp, alt: Acceso, width: 750, height: 500, small: { file: arcilla-entrada-420.webp, width: 420, height: 280 } }',
    '      - { file: arcilla-entrada-420.webp, alt: Otra vista, width: 420, height: 280 }',
  ].join('\n');
  expectInvalid('foto-repetida', example.replace('  - type: texto', '  - type: texto\n' + gallery),
    /Usa cada foto y sus variantes una sola vez/);
});
