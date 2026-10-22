import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSite, readOut } from './helpers.mjs';

const ids = (html) => [...html.matchAll(/data-product="([^"]+)"/g)].map((m) => m[1]);

test('home lists the pinned product first, then upcoming by start', async () => {
  await buildSite();
  const html = readOut('index.html');
  assert.deepEqual(ids(html), ['slidopyt-6-tyzhniv', 'vebinar-rys', 'slidy-na-snihu', 'kvest-holos-sovy']);
  assert.match(html, /<h1[^>]*>Ліс говорить із тими, хто вміє <em>слухати<\/em><\/h1>/);
});

test('home has no header; inner pages have only a link back home', async () => {
  await buildSite();
  const home = readOut('index.html');
  assert.doesNotMatch(home, /class="site-header"/);
  assert.doesNotMatch(home, /<nav/);
  const product = readOut('products/mentorship/index.html');
  const header = product.match(/<header class="site-header">[^]*?<\/header>/)?.[0] ?? '';
  assert.match(header, /<a class="site-header__home" href="\/">На головну<\/a>/);
  const nav = header.match(/<nav class="site-nav"[^]*?<\/nav>/)?.[0] ?? '';
  assert.deepEqual([...nav.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => `${m[2]} ${m[1]}`), ['Програми /products/', 'Уроки /lessons/', 'Контакти /contacts/', 'Про клуб /about/']);
  assert.doesNotMatch(header, /data-theme-toggle/);
  // The current section is marked in the menu.
  assert.match(readOut('lessons/index.html'), /<a href="\/lessons\/" aria-current="page">Уроки<\/a>/);
});

test('links page offers an about button', async () => {
  await buildSite();
  assert.match(readOut('links/index.html'), /<a class="btn btn--block btn--ghost links__btn" href="\/about\/"[^>]*>Про клуб<\/a>/);
});

test('footer links home; one floating theme toggle on every page', async () => {
  await buildSite();
  for (const page of ['index.html', 'products/mentorship/index.html', 'links/index.html']) {
    const html = readOut(page);
    assert.equal((html.match(/data-theme-toggle/g) ?? []).length, 1, page);
    assert.match(html, /<button type="button" class="theme-toggle theme-toggle--float" data-theme-toggle/, page);
    const footer = html.match(/<footer class="site-footer">[^]*?<\/footer>/)?.[0] ?? '';
    assert.doesNotMatch(footer, /data-theme-toggle/, page);
  }
  const footerOf = (page) => readOut(page).match(/<footer class="site-footer">[^]*?<\/footer>/)[0];
  // Brand name appears once (the copyright); the home link says where it goes and is skipped on home itself.
  assert.match(footerOf('products/mentorship/index.html'), /<li><a href="\/">На головну<\/a><\/li>/);
  assert.equal((footerOf('products/mentorship/index.html').match(/Лісові звірі Карпат/g) ?? []).length, 1);
  assert.doesNotMatch(footerOf('index.html'), /На головну/);
  const html = readOut('index.html');
  const css = readOut(html.match(/<link rel="stylesheet" href="([^"]+)"/)[1].slice(1));
  assert.match(css, /\.theme-toggle--float\{position:fixed;[^}]*right:calc\(16px \+ env\(safe-area-inset-right\)\);bottom:calc\(16px \+ env\(safe-area-inset-bottom\)\)/);
});

test('home hero preloads the active theme image with srcset', async () => {
  await buildSite();
  const head = readOut('index.html').split('</head>')[0];
  assert.match(head, /imagesrcset/);
  assert.match(readOut('index.html'), /class="hero__img only-dark"/);
});

test('links page has big tracked buttons and no nav', async () => {
  await buildSite();
  const html = readOut('links/index.html');
  const links = html.match(/<a[^>]*data-umami-event="links-click"/g) ?? [];
  assert.ok(links.length >= 3, `got ${links.length}`);
  assert.doesNotMatch(html, /<nav/);
  assert.match(html, /href="https:\/\/t\.me\/zviri_example_channel"/);
  assert.match(html, /<img[^>]*class="links__avatar"/);
});

test('links profile: avatar beside a large name with the role under it', async () => {
  await buildSite();
  const html = readOut('links/index.html');
  const profile = html.match(/<header class="links__profile">[^]*?<\/header>/)?.[0] ?? '';
  assert.match(profile, /<a class="links__home" href="\/"[^>]*>\s*<img[^>]*class="links__avatar"[^>]*>\s*<\/a>/);
  assert.match(profile, /<img[^>]*class="links__avatar"[^]*<h1 class="links__name">Лісові звірі Карпат<\/h1>[^]*<p class="links__role">Клуб спостерігачів за звірами<\/p>/);
  const css = readOut(html.match(/<link rel="stylesheet" href="([^"]+)"/)[1].slice(1));
  assert.match(css, /\.links__profile\{display:flex;align-items:center;justify-content:center/);
  assert.match(css, /\.links__role\{[^}]*font:italic (400 )?21px\/1\.2 var\(--font-serif\)/);
});

test('footer has legal menu', async () => {
  await buildSite();
  assert.match(readOut('index.html'), /<footer[^]*href="\/offer\/"/);
});

test('layout css has 640 and 960 breakpoints', async () => {
  await buildSite();
  const html = readOut('index.html');
  const css = readOut(html.match(/<link rel="stylesheet" href="([^"]+)"/)[1].slice(1));
  assert.match(css, /min-width:\s*640px/);
  assert.match(css, /min-width:\s*960px/);
  assert.match(css, /\.container\{[^}]*max-width:1040px/);
  assert.match(css, /\.grid\{[^}]*align-items:start/);
});

test('footer links: about and contacts on every page, legal after them', async () => {
  await buildSite();
  for (const page of ['index.html', 'products/mentorship/index.html']) {
    const footer = readOut(page).match(/<footer class="site-footer">[^]*?<\/footer>/)[0];
    const labels = [...footer.matchAll(/<li><a href="[^"]+">([^<]+)<\/a><\/li>/g)].map((m) => m[1]).filter((l) => l !== 'На головну');
    assert.deepEqual(labels, ['Про клуб', 'Контакти', 'Оферта', 'Конфіденційність'], page);
  }
});

test('contacts page: Telegram, channel and email buttons, then requisites', async () => {
  await buildSite();
  const html = readOut('contacts/index.html');
  assert.match(html, /<h1>Контакти<\/h1>/);
  assert.match(html, /<a class="btn btn--block" href="https:\/\/t\.me\/zviri_example"[^>]*>Написати в Telegram<\/a>/);
  assert.match(html, /<a class="btn btn--block btn--ghost" href="https:\/\/t\.me\/zviri_example_channel"/);
  assert.match(html, /<a class="btn btn--block btn--ghost" href="mailto:hello@example\.org"[^>]*>hello@example\.org<\/a>/);
  assert.match(html, /ФОП Приклад/);
  // Shortcodes in the page body take email and Telegram from hugo.yml.
  const prose = html.match(/<div class="prose section">[^]*?<\/div>/)?.[0] ?? '';
  assert.match(prose, /<a href="mailto:hello@example\.org">hello@example\.org<\/a>/);
  assert.match(prose, /<a href="https:\/\/t\.me\/zviri_example">@zviri_example<\/a>/);
});

test('without photos: hero gets top spacing, links profile text is centred', async () => {
  await buildSite();
  const html = readOut('index.html');
  const css = readOut(html.match(/<link rel="stylesheet" href="([^"]+)"/)[1].slice(1));
  assert.match(css, /\.hero:not\(:has\(\.hero__media\)\)\{padding-top:var\(--space-10\)\}/);
  assert.match(css, /\.links__profile:not\(:has\(\.links__avatar\)\) \.links__who\{text-align:center\}/);
});
