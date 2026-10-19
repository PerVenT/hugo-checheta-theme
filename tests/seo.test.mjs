import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSite, readOut, outExists } from './helpers.mjs';

test('no Google Fonts requests and exactly two font preloads', async () => {
  await buildSite();
  const html = readOut('index.html');
  assert.doesNotMatch(html, /fonts\.(googleapis|gstatic)\.com/);
  const preloads = html.match(/<link rel="preload"[^>]*as="font"[^>]*>/g) ?? [];
  assert.equal(preloads.length, 2);
  for (const p of preloads) {
    assert.match(p, /type="font\/woff2"/);
    assert.match(p, /crossorigin/);
  }
});

test('fonts are self-hosted with font-display swap', async () => {
  await buildSite();
  const html = readOut('index.html');
  const href = html.match(/<link rel="stylesheet" href="([^"]+)"/)[1];
  const css = readOut(href.slice(1));
  assert.match(css, /@font-face\{[^}]*font-family:"?Cormorant Garamond"?/i);
  assert.match(css, /@font-face\{[^}]*font-family:"?Manrope"?/i);
  assert.match(css, /font-display:swap/);
  assert.ok(outExists(html.match(/<link rel="preload"[^>]*href="([^"]+)"/)[1].slice(1)), 'preloaded font file exists');
});

test('SEO basics on home page', async () => {
  await buildSite();
  const html = readOut('index.html');
  assert.match(html, /<meta property="og:title" content="[^"]+"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/example\.org\/"/);
  assert.match(html, /<meta name="description" content="[^"]+"/);
});

test('og:image: product image cropped for previews, lesson YouTube cover, home hero elsewhere', async () => {
  await buildSite();
  const og = (path) => readOut(path).match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  assert.match(og('products/mentorship/index.html'), /^https:\/\/example\.org\/images\/products\/slidopyt-6-tyzhniv_hu_[^"]+\.jpg$/);
  const hero = /^https:\/\/example\.org\/images\/hero-light_hu_[^"]+\.jpg$/;
  assert.match(og('products/bare/index.html'), hero);
  assert.match(og('contacts/index.html'), hero);
  assert.match(og('index.html'), hero);
  assert.equal(og('lessons/urok-1/index.html'), 'https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg');
  assert.equal(og('lessons/urok-2/index.html'), 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg');
});

test('robots.txt and 404 are built', async () => {
  await buildSite();
  assert.match(readOut('robots.txt'), /Sitemap: https:\/\/example\.org\/sitemap\.xml/);
  assert.ok(outExists('404.html'));
});

test('date-short renders day and genitive month', async () => {
  await buildSite();
  assert.match(readOut('date-check/index.html'), /data-date-check="25 вересня"/);
});

test('favicon svg and apple touch icon are linked and built', async () => {
  await buildSite();
  const head = readOut('index.html').split('</head>')[0];
  assert.match(head, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml">/);
  assert.match(head, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png">/);
  assert.match(readOut('favicon.svg'), /<svg/);
});
