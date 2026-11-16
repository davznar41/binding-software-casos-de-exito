import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build, testEnv } from './build-tools.mjs';

const save = process.argv.includes('--guardar');
const permanentSlug = 'llegada-hotel-linde';
const permanent = 'src/content/casos/' + permanentSlug + '.md';
const slug = existsSync(permanent) ? permanentSlug + '-prueba' : permanentSlug;
const path = 'src/content/casos/' + slug + '.md';
const reports = 'artifacts/quality';
const revision = reports + '/plantilla-revision';
const publicBuild = reports + '/plantilla-publica';

function sourceHashes(directory) {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && resolve(entry.parentPath, entry.name) !== resolve(path))
    .map((entry) => join(entry.parentPath, entry.name)).sort()
    .map((file) => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]);
}

function compile(mode, output) {
  const result = build(mode, output);
  writeFileSync(join(reports, 'plantilla-' + mode + '.log'), result.log);
  assert.equal(result.status, 0, result.log);
}

function page(output, route = '') {
  return join(output, 'casos-de-exito', route, 'index.html');
}

const template = readFileSync('tests/fixtures/editorial/plantilla.md', 'utf8');
const example = template
  .replace('status: borrador', 'status: demostracion').replace('# origin: autorizado', 'origin: sintetico')
  .replace('title: Titular del caso', 'title: Una recepción coordinada antes de la llegada')
  .replace('summary: Resumen breve del desafío y la solución.', 'summary: El Hotel Linde reúne las indicaciones de llegada y comparte su estado entre los equipos de recepción.')
  .replace('client: Nombre del establecimiento', 'client: Hotel Linde')
  .replace(/# publishedOn:[\s\S]+?(?=\r?\n---)/, [
    'publishedOn: "2026-11-11"',
    'cover:',
    '  file: mostrador-turnos-1200.webp',
    '  alt: Mostrador de madera con equipo de check-in y un cuaderno',
    '  width: 1200',
    '  height: 800',
    'blocks:',
    '  - type: texto',
    '  - type: galeria',
    '    title: Vistas del alojamiento',
    '    images:',
    '      - file: hotel-referencia-1440.webp',
    '        alt: Zona de piscina y edificio hotelero',
    '        width: 1440',
    '        height: 960',
    '      - file: modular-jardin-ilustrativo.webp',
    '        alt: Banco de piedra en un jardín',
    '        width: 500',
    '        height: 296',
    '  - type: video',
    '    video:',
    '      provider: local',
    '      title: Cambio de turno en recepción',
    '      audio: sin-audio',
    '      sources: [modular-relevo.webm]',
    '      transcript: La pantalla muestra «Relevo confirmado» mientras avanza una línea.',
    '  - type: comparacion',
    '    comparison:',
    '      before: [Cada turno guardaba sus propias notas.]',
    '      after: [Ambos turnos consultan la misma reserva.]',
    '  - type: imagen',
    '    variant: destacada',
    '    image:',
    '      file: modular-mostrador-ilustrativo.webp',
    '      alt: Una tableta sobre el mostrador de recepción',
    '      width: 500',
    '      height: 296',
    '  - type: resultados',
    '    results:',
    '      - type: cualitativo',
    '        description: El equipo identifica las reservas que necesitan atención.',
    '  - type: testimonio',
    '    quote:',
    '      text: El siguiente turno encuentra la tarea pendiente en la misma reserva.',
    '      author: Equipo de recepción',
  ].join('\n'))
  .replace('Presenta el establecimiento y explica qué necesitaba resolver.', 'La recepción del Hotel Linde necesitaba una forma de identificar las llegadas que seguían abiertas al cambiar de turno.')
  .replace('Describe cómo se aplicó la solución y qué cambió en la operativa.', 'El equipo reunió en la reserva el estado del documento, la firma y la tarea que debía completar el siguiente turno.');

const baseline = sourceHashes('src');
const configs = ['astro.config.mjs', 'package.json', 'pnpm-lock.yaml', 'playwright.config.ts', 'tsconfig.json'];
const configBaseline = configs.map((file) => readFileSync(file));
let completed = false;
mkdirSync(reports, { recursive: true });
writeFileSync(path, example, { flag: 'wx' });
try {
  compile('revision', revision);
  assert.match(readFileSync(page(revision), 'utf8'), new RegExp('/casos-de-exito/' + slug + '/'));
  assert.match(readFileSync(page(revision, slug), 'utf8'), /Una recepción coordinada antes de la llegada/);
  assert.equal(existsSync(page(revision, 'borrador-control')), false);

  compile('production', publicBuild);
  const html = readFileSync(page(publicBuild), 'utf8');
  assert.ok(!html.includes('/' + slug + '/'));
  assert.ok(!html.includes('borrador-control'));
  assert.equal(existsSync(page(publicBuild, slug)), false);
  assert.equal(existsSync(page(publicBuild, 'borrador-control')), false);
  assert.equal(existsSync(join(publicBuild, 'casos-de-exito/media/borrador-control.webp')), false);

  const result = spawnSync(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test'], {
    env: {
      ...testEnv,
      BINDING_ACCEPTANCE_SLUG: slug,
      BINDING_ACCEPTANCE_OUT_DIR: revision,
      BINDING_ACCEPTANCE_CAPTURE: path === permanent ? '1' : '0',
    },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, 'La comprobación en Chromium falló.');
  assert.deepEqual(sourceHashes('src'), baseline, 'La prueba debe modificar solo un archivo Markdown.');
  for (const [index, file] of configs.entries()) {
    assert.deepEqual(readFileSync(file), configBaseline[index], 'Cambió la configuración ' + file);
  }
  completed = true;
  console.log('Plantilla maestra verificada: listado y detalle estáticos, borradores y demo excluidos de la salida publicable.');
} finally {
  if (!save || !completed || path !== permanent) rmSync(path, { force: true });
}





