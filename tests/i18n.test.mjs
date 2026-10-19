import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { root } from './helpers.mjs';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const layouts = walk(join(root, 'layouts'));
const dictionary = readFileSync(join(root, 'i18n', 'uk.yml'), 'utf8');
const keys = new Set([...dictionary.matchAll(/^([a-z0-9_]+):/gm)].map((m) => m[1]));

test('layouts contain no Cyrillic text', () => {
  const offenders = layouts.filter((f) => /[Ѐ-ӿ]/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders.map((f) => relative(root, f)), []);
});

test('every i18n key used in layouts exists in uk.yml', () => {
  const missing = [];
  for (const f of layouts) {
    for (const m of readFileSync(f, 'utf8').matchAll(/i18n\s+"([a-z0-9_]+)"/g)) {
      if (!keys.has(m[1])) missing.push(`${relative(root, f)}: ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('uk.yml has 12 genitive month names', () => {
  for (let m = 1; m <= 12; m++) assert.ok(keys.has(`month_genitive_${m}`), `month_genitive_${m}`);
  assert.match(dictionary, /^month_genitive_9: вересня$/m);
});
