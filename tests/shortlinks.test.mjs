import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSite, readOut } from './helpers.mjs';

test('short link redirects to its target with UTM tags kept', async () => {
  await buildSite();
  const html = readOut('ig/index.html');
  assert.match(html, /<meta http-equiv="refresh" content="0; url=https:\/\/example\.org\/links\/\?utm_source=instagram&amp;utm_medium=social&amp;utm_campaign=bio">/);
  assert.match(html, /location\.replace\("https:\/\/example\.org\/links\/\?utm_source=instagram\\u0026utm_medium=social\\u0026utm_campaign=bio"\)/);
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(html, /umami/);
});

test('absolute targets are kept as is', async () => {
  await buildSite();
  assert.match(readOut('yt/index.html'), /url=https:\/\/example\.org\/products\/\?utm_source=youtube/);
});

test('short links stay out of the sitemap', async () => {
  await buildSite();
  assert.doesNotMatch(readOut('sitemap.xml'), /\/ig\/|\/yt\//);
});
