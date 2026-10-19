import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSite, readOut, outExists } from './helpers.mjs';

async function page() {
  await buildSite();
  const html = readOut('upcoming-check/index.html');
  const upcoming = html.slice(html.indexOf('data-upcoming'), html.indexOf('data-bare'));
  const bare = html.slice(html.indexOf('data-bare'));
  const cards = upcoming.split('<article').slice(1);
  return { upcoming, bare, cards };
}

test('upcoming excludes past and closed: pinned first, then by start, then by weight', async () => {
  const { cards } = await page();
  const ids = cards.map((c) => c.match(/data-product="([^"]+)"/)?.[1]);
  assert.deepEqual(ids, ['slidopyt-6-tyzhniv', 'vebinar-rys', 'slidy-na-snihu', 'kvest-holos-sovy']);
  assert.ok(outExists('products/webinar-past/index.html'), 'past product page still exists');
});

test('mentorship card shows label, bonus, three chips in one row', async () => {
  const { cards } = await page();
  const card = cards.find((c) => c.includes('slidopyt-6-tyzhniv'));
  assert.match(card, /Старт 25 вересня/);
  assert.match(card, /class="card__bonus"[^>]*>(<svg[^]*?<\/svg>)?\s*Польовий зошит у подарунок</);
  const chips = card.match(/class="chips"[^]*?<\/ul>/)[0];
  assert.equal((chips.match(/class="chip"/g) ?? []).length, 3);
  assert.match(card, /href="\/products\/mentorship\/"/);
});

test('card image is responsive webp and lazy', async () => {
  const { cards } = await page();
  const card = cards.find((c) => c.includes('slidopyt-6-tyzhniv'));
  const img = card.match(/<div class="card__media">\s*<img[^>]*>/)[0];
  assert.match(img, /srcset="[^"]*\.webp/);
  assert.match(img, /loading="lazy"/);
  assert.match(img, /width="\d+" height="\d+"|height="\d+" width="\d+"/);
});

test('waitlist product shows waitlist label instead of a date', async () => {
  const { cards } = await page();
  const card = cards.find((c) => c.includes('kvest-holos-sovy'));
  assert.match(card, /class="card__label"[^>]*>Скоро новий набір</);
});

test('bare product renders without empty optional elements', async () => {
  const { bare } = await page();
  assert.match(bare, /<article/);
  assert.doesNotMatch(bare, /<img|class="chips"|card__bonus|card__label|card__media/);
  assert.doesNotMatch(bare, /<(p|span|div|ul)[^>]*>\s*<\/\1>/);
});

test('pinned product carries the debossed favicon mark on its card and /links button', async () => {
  const { cards } = await page();
  const pin = /<span class="pin" title="Закріплено"><img src="\/favicon\.svg"[^>]*alt="Закріплено"><\/span>/;
  assert.match(cards.find((c) => c.includes('slidopyt-6-tyzhniv')), pin);
  assert.doesNotMatch(cards.find((c) => c.includes('vebinar-rys')), /class="pin"/);
  const links = readOut('links/index.html');
  assert.equal((links.match(/class="pin"/g) ?? []).length, 1);
  assert.match(links, new RegExp(`links__btn" href="/products/mentorship/"[^>]*>${pin.source}`));
  const css = readOut(links.match(/<link rel="stylesheet" href="([^"]+)"/)[1].slice(1));
  assert.match(css, /\.pin::after\{[^}]*box-shadow:inset 0 2px 4px/);
});
