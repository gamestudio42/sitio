/**
 * Export the Sítio sprite sheet. With `--draw`, regenerate the .aseprite from
 * tools/art-sitio.lua first.
 *
 * The .aseprite file is the source of truth: live edits in Aseprite survive a
 * plain `pnpm art`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const draw = process.argv.includes('--draw');
const source = join(root, 'art/sitio/sitio.aseprite');
const aseprite =
  process.env.ASEPRITE_PATH ??
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Aseprite\\Aseprite.exe'
    : 'aseprite');

if (!existsSync(aseprite)) {
  console.error(`Aseprite not found at ${aseprite}. Set ASEPRITE_PATH.`);
  process.exit(1);
}

function run(args: string[]): void {
  execFileSync(aseprite, args, { cwd: root, stdio: 'inherit' });
}

function waitFor(path: string): void {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (existsSync(path)) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  throw new Error(`Aseprite did not write ${path}`);
}

if (draw) {
  run(['-b', '--script', 'tools/art-sitio.lua']);
  waitFor(source);
} else if (!existsSync(source)) {
  console.error(`Missing ${source}. Run 'pnpm art:draw' to create the first pass.`);
  process.exit(1);
}

run([
  '-b',
  'art/sitio/sitio.aseprite',
  '--sheet',
  'apps/web/public/art/sitio.png',
  '--data',
  'apps/web/public/art/sitio.json',
  '--format',
  'json-hash',
  '--list-slices',
]);
waitFor(join(root, 'apps/web/public/art/sitio.png'));
waitFor(join(root, 'apps/web/public/art/sitio.json'));

console.log('Sítio art exported to apps/web/public/art/');
