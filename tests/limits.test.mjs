import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exampleSite } from './helpers.mjs';

// Builds exampleSite against a throwaway content dir with one product; returns hugo's stderr ('' on success).
function buildWith(frontMatter) {
  const dir = mkdtempSync(join(tmpdir(), 'theme-limits-'));
  try {
    mkdirSync(join(dir, 'content', 'products'), { recursive: true });
    writeFileSync(join(dir, 'content', 'products', 'x.md'), `---\n${frontMatter}\n---\n`);
    execFileSync('hugo', ['--source', exampleSite, '--contentDir', join(dir, 'content'), '--destination', join(dir, 'public')], { stdio: 'pipe' });
    return '';
  } catch (err) {
    return err.stderr?.toString() ?? err.message;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const W = (n) => 'Ш'.repeat(n);

test('limits count characters, not bytes: Cyrillic exactly at the limit builds', () => {
  assert.equal(buildWith(`title: ${W(55)}\nlead: ${W(160)}\nchips: [${W(10)}, ${W(10)}, ${W(10)}]`), '');
});

test('one character over the limit stops the build and names file and field', () => {
  const err = buildWith(`title: ${W(56)}`);
  assert.match(err, /products[\\/]x\.md/);
  assert.match(err, /«title» — 56 символів, максимум 55/);
});

test('list items are checked one by one with their index', () => {
  assert.match(buildWith(`program:\n  - title: Тиждень 1\n    items: [ок, ${W(161)}]`), /«program\[0\]\.items\[1\]» — 161 символів, максимум 160/);
  assert.match(buildWith(`faq:\n  - q: ${W(81)}\n    a: так`), /«faq\[0\]\.q» — 81/);
});

test('chips: more than 3 or too long together stop the build', () => {
  assert.match(buildWith('chips: [а, б, в, г]'), /«chips» — 4 шт\., максимум 3/);
  assert.match(buildWith(`chips: [${W(14)}, ${W(14)}, ${W(3)}]`), /«chips» — разом 31 символів, максимум 30/);
});
