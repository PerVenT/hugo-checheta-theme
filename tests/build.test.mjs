import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSite, readOut } from './helpers.mjs';

test('site builds and has html lang uk', async () => {
  await buildSite();
  assert.match(readOut('index.html'), /<html lang="uk"/);
});

test('theme init script runs in head before stylesheet', async () => {
  await buildSite();
  const html = readOut('index.html');
  const head = html.slice(0, html.indexOf('</head>'));
  const script = head.indexOf('<script>');
  const css = head.indexOf('<link rel="stylesheet"');
  assert.ok(script > 0 && css > 0 && script < css);
  assert.match(head, /dataset\.theme|data-theme/);
});

test('theme toggle button is labelled', async () => {
  await buildSite();
  assert.match(readOut('index.html'), /<button[^>]*data-theme-toggle[^>]*aria-label="[^"]+"/);
});
