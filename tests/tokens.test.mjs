import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildSite, readOut, out } from './helpers.mjs';

function css() {
  const html = readOut('index.html');
  const href = html.match(/<link rel="stylesheet" href="([^"]+)"/)?.[1];
  assert.ok(href, 'stylesheet link present');
  return readOut(href.replace(/^\//, ''));
}

// Minifier may drop attribute quotes, so selectors are matched as regexes.
function block(source, selector) {
  const m = source.match(selector);
  assert.ok(m, `selector ${selector} present`);
  return source.slice(m.index, source.indexOf('}', m.index));
}

test('tokens emitted for light and dark', async () => {
  await buildSite();
  const c = css();
  const root = block(c, /:root\{/);
  const dark = block(c, /:root\[data-theme="?dark"?\]\{/);
  assert.match(root, /--c-surface:\s*#F4E9D7/i);
  assert.match(dark, /--c-surface:\s*#0D2418/i);
  assert.match(dark, /--card-bg:\s*#12301F/i);
  assert.match(dark, /--btn-bg:\s*var\(--c-gold-light\)/);
  assert.match(root, /--btn-bg:\s*var\(--c-emerald\)/);
  assert.match(root, /--c-focus-ring:\s*var\(--c-gold\)/);
  assert.doesNotMatch(c, /\{gold\}/);
  assert.match(c, /@media ?\(prefers-color-scheme:\s*dark\)\{:root:not\(\[data-theme="?light"?\]\)\{[^}]*--c-surface:\s*#0D2418/i);
  assert.match(root, /--space-4:\s*16px/);
  assert.match(root, /--radius-md:\s*14px/);
});
