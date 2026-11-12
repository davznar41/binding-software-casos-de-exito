import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build, testEnv } from './build-tools.mjs';

const fixtures = resolve('tests/fixtures/modular');
const reports = resolve('artifacts/quality');
const revision = join(reports, 'modular-revision');
const publicBuild = join(reports, 'modular-publica');
const invalidBuild = join(reports, 'modular-invalida');
const fixturesOnly = process.argv.includes('--solo-revision');

function sourceManifest() {
  const sources = readdirSync('src', { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
  const files = [...sources, 'astro.config.mjs', 'package.json', 'pnpm-lock.yaml'];
  return files.sort().map((file) => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]);
}

function compile(mode, output, cwd, label, expectedError) {
  const { status, log } = build(mode, output, cwd);
  writeFileSync(join(reports, 'modular-' + label + '.log'), log);
  if (expectedError) {
    assert.notEqual(status, 0, 'El build debía rechazar «' + label + '».');
    assert.match(log, expectedError);
  } else {
    assert.equal(status, 0, log);
  }
}

function html(outDir, slug = '') {
  return join(outDir, 'casos-de-exito', slug, 'index.html');
}

mkdirSync(reports, { recursive: true });
const sandbox = mkdtempSync(join(reports, 'modular-fuentes-'));
const baseline = sourceManifest();
try {
  for (const path of ['astro.config.mjs', 'package.json', 'tsconfig.json', 'src', 'public']) {
    cpSync(path, join(sandbox, path), { recursive: true });
  }
  symlinkSync(resolve('node_modules'), join(sandbox, 'node_modules'), 'junction');
  for (const [source, target] of [
    ['casos', 'src/content/casos'],
    ['textos', 'src/content/textos'],
    ['media', 'src/assets/casos'],
  ]) {
    cpSync(join(fixtures, source), join(sandbox, target), { recursive: true });
  }
  compile('revision', revision, sandbox, 'revision');

  const slugs = [
    ...readdirSync(join(fixtures, 'casos')).filter((name) => name.endsWith('.md')).map((name) => name.slice(0, -3)),
    'flujo-editorial-hotel-mirador',
  ];
  for (const slug of slugs) {
    assert.ok(existsSync(html(revision, slug)), 'Falta HTML de ' + slug);
    assert.ok(readFileSync(html(revision), 'utf8').includes('/' + slug + '/'), 'Falta enlace a ' + slug);
  }
  if (!fixturesOnly) {
    const caseFolder = join(sandbox, 'src/content/casos');
    const brief = join(caseFolder, 'modular-breve.md');
    const original = readFileSync(brief, 'utf8');
    writeFileSync(brief, original.replace('status: demostracion', 'status: publicado\norigin: autorizado\npublishedOn: "2026-11-11"'));
    compile('production', publicBuild, sandbox, 'publicacion');
    assert.ok(existsSync(html(publicBuild, 'modular-breve')));
    for (const slug of [...slugs.filter((slug) => slug !== 'modular-breve'), 'borrador-control']) {
      assert.ok(!existsSync(html(publicBuild, slug)), 'Se publicó contenido de revisión: ' + slug);
      assert.ok(!readFileSync(html(publicBuild), 'utf8').includes('/' + slug + '/'));
    }
    for (const file of ['modular-llegada.mp4', 'modular-relevo.webm', 'modular-llegada-es.vtt', 'modular-llegada-poster.webp', 'modular-foto-1.webp']) {
      assert.ok(!existsSync(join(publicBuild, 'casos-de-exito/media', file)), 'Se publicó el recurso ' + file);
    }
    writeFileSync(brief, original);
    const invalid = join(caseFolder, 'modular-invalido.md');
    const invalidExample = readFileSync(join(fixtures, 'invalid/modular-invalido.md'), 'utf8');
    for (const [label, content, expectedError] of [
      ['subtitulos', invalidExample, /Añade subtítulos WebVTT/],
      ['proveedor', invalidExample.replace('provider: local', 'provider: iframe'), /blocks\.0\.video\.provider|No matching discriminator/],
      ['fragmento', original.replace('  - type: texto', '  - type: texto\n    file: inexistente').replace(/Una prueba ficticia.*/, ''), /Falta el fragmento Markdown.*inexistente/],
      ['html', original.replace('Una prueba ficticia', '<div style="color:red">Estilo fuera del modelo</div>\n\nUna prueba ficticia'), /Usa Markdown de texto/],
      ['doble-modelo', original.replace('blocks:', 'results:\n  - type: cualitativo\n    description: Resultado de control.\nblocks:'), /Unrecognized key.*results|Clave no reconocida.*results/],
    ]) {
      writeFileSync(invalid, content.replace('title: Una nota para confirmar la llegada', 'title: Prueba inválida ' + label));
      compile('revision', invalidBuild, sandbox, label, expectedError);
    }
    rmSync(invalid);

    const browser = spawnSync(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test'], {
      env: { ...testEnv, BINDING_MODULAR_OUT_DIR: 'artifacts/quality/modular-revision' },
      stdio: 'inherit',
    });
    if (browser.error) throw browser.error;
    assert.equal(browser.status, 0, 'Falló Playwright en la revisión modular.');
  }

  assert.deepEqual(sourceManifest(), baseline);
  console.log('Revisión modular estática generada. Los casos se añadieron exclusivamente en la copia de prueba.');
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}




