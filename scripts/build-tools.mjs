import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const astro = resolve('node_modules/astro/bin/astro.mjs');
export const testEnv = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', NO_COLOR: '1' };

export function build(mode, directory, cwd = process.cwd()) {
  const result = spawnSync(process.execPath, [astro, 'build', '--mode', mode, '--outDir', directory], {
    cwd,
    env: testEnv,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return { status: result.status, log: result.stdout + result.stderr };
}


