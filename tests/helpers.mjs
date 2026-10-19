import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const exampleSite = join(root, 'exampleSite');
// Each test process builds into its own directory: node --test runs files in parallel.
export const out = mkdtempSync(join(tmpdir(), 'theme-test-'));
process.on('exit', () => rmSync(out, { recursive: true, force: true }));

let built;

// Builds exampleSite once per test process.
export async function buildSite() {
  if (built) return built;
  built = new Promise((resolve, reject) => {
    try {
      execFileSync('hugo', ['--source', exampleSite, '--destination', out, '--cleanDestinationDir'], {
        stdio: 'pipe',
        env: { ...process.env, HUGO_ENVIRONMENT: 'test' },
      });
      resolve();
    } catch (err) {
      reject(new Error(`hugo build failed:\n${err.stderr?.toString() ?? err.message}`));
    }
  });
  return built;
}

export function readOut(path) {
  return readFileSync(join(out, path), 'utf8');
}

export function outExists(path) {
  return existsSync(join(out, path));
}
