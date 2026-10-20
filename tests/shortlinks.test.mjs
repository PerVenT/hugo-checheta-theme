import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite, readOut, exampleSite } from './helpers.mjs';

// Builds exampleSite with extra params; returns hugo's stderr ('' on success).
function buildWithParams(yaml) {
  const dir = mkdtempSync(join(tmpdir(), 'theme-links-'));
  try {
    writeFileSync(join(dir, 'extra.yml'), `params:\n${yaml}\n`);
    execFileSync('hugo', ['--source', exampleSite, '--config', `hugo.yml,${join(dir, 'extra.yml')}`, '--destination', join(dir, 'public')], { stdio: 'pipe' });
    return '';
  } catch (err) {
    return err.stderr?.toString() ?? err.message;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('short link redirects to a page of the site with UTM tags kept, without tracking', async () => {
  await buildSite();
  const html = readOut('ig/index.html');
  assert.match(html, /<meta http-equiv="refresh" content="0; url=https:\/\/example\.org\/links\/\?utm_source=instagram&amp;utm_medium=social&amp;utm_campaign=bio">/);
  assert.match(html, /location\.replace\("https:\/\/example\.org\/links\/\?utm_source=instagram\\u0026utm_medium=social\\u0026utm_campaign=bio"\)/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(html, /umami/);
});

test('outlink lives under /go/, sends the Umami event before leaving and skips bots', async () => {
  await buildSite();
  const html = readOut('go/instagram/index.html');
  assert.match(html, /var to = "https:\/\/instagram\.com\/zviri_example"/);
  assert.match(html, /umami\.track\('outlink-click', \{ link: "instagram" \}\)/);
  assert.match(html, /data-auto-track', 'false'/);
  assert.match(html, /navigator\.webdriver \|\| bot\.test\(navigator\.userAgent\)/);
  assert.match(html, /<noscript><meta http-equiv="refresh" content="0; url=https:\/\/instagram\.com\/zviri_example"><\/noscript>/);
});

test('redirect pages stay out of the sitemap; robots.txt closes /go/', async () => {
  await buildSite();
  assert.doesNotMatch(readOut('sitemap.xml'), /\/ig\/|\/yt\/|\/go\//);
  assert.match(readOut('robots.txt'), /Disallow: \/go\//);
});

test('each list accepts only its kind of target', () => {
  assert.match(buildWithParams('  shortlinks:\n    x: https://instagram.com/a'), /shortlinks: «x» — лише сторінки цього сайту/);
  assert.match(buildWithParams('  outlinks:\n    x: /links/'), /outlinks: «x» — лише інші сайти/);
  assert.match(buildWithParams('  outlinks:\n    my insta: https://instagram.com/a'), /outlinks: «my insta» — лише малі латинські літери/);
});
