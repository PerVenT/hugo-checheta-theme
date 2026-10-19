import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSite, readOut } from './helpers.mjs';

const buttons = (html) => ({
  pay: html.match(/<a[^>]*data-umami-event="pay-click"[^>]*>/)?.[0],
  talk: html.match(/<a[^>]*data-umami-event="talk-click"[^>]*>/)?.[0],
});

test('mentorship page has pay and talk buttons; pay opens in same window', async () => {
  await buildSite();
  const html = readOut('products/mentorship/index.html');
  const { pay, talk } = buttons(html);
  assert.ok(pay && talk);
  assert.doesNotMatch(pay, /target=/);
  assert.match(pay, /href="https:\/\/secure\.wayforpay\.com\/button\/b0000000000"/);
  assert.match(pay, /data-umami-event-product="slidopyt-6-tyzhniv"/);
  assert.match(talk, /href="https:\/\/t\.me\/zviri_example"/);
});

test('mentorship page renders sections and countdown', async () => {
  await buildSite();
  const html = readOut('products/mentorship/index.html');
  for (const cls of ['program', 'audience', 'results', 'testimonials', 'faq']) assert.match(html, new RegExp(`class="section section--${cls}"`));
  // One date only: the countdown targets the start (Kyiv midnight) and stays hidden until the final week.
  assert.match(html, /<p class="countdown" hidden data-countdown="2099-09-24T21:00:00Z"/);
  assert.match(html, /<strong data-countdown-value><\/strong>/);
});

test('lead from front matter sits under the title, body text goes below the hero', async () => {
  await buildSite();
  const html = readOut('products/mentorship/index.html');
  const intro = html.match(/<div class="product__intro">[^]*?<div class="product__actions">/)?.[0] ?? '';
  assert.match(intro, /<h1>[^]*<p class="product__lead">Шість тижнів із провідником[^<]*<\/p>/);
  assert.doesNotMatch(intro, /Курс поєднує/);
  assert.match(html, /<\/header>[^]*<div class="prose">\s*<p>Курс поєднує[^]*<\/div>/);
  assert.match(html, /<meta name="description" content="Шість тижнів із провідником[^"]*">/);
});

test('mini product has pay but no talk button', async () => {
  await buildSite();
  const { pay, talk } = buttons(readOut('products/mini/index.html'));
  assert.ok(pay);
  assert.equal(talk, undefined);
});

test('product without payment renders no pay button', async () => {
  await buildSite();
  assert.equal(buttons(readOut('products/bare/index.html')).pay, undefined);
});

test('widget mode marks the pay link for the WayForPay widget; link mode does not', async () => {
  await buildSite();
  const { pay } = buttons(readOut('products/mentorship/index.html'));
  assert.match(pay, /href="https:\/\/secure\.wayforpay\.com\/button\/b0000000000"/);
  assert.match(pay, /data-wfp-widget/);
  assert.doesNotMatch(buttons(readOut('products/mini/index.html')).pay, /data-wfp-widget/);
});

test('checkout mode without api endpoint falls back to link', async () => {
  await buildSite();
  const { pay } = buttons(readOut('products/checkout-fallback/index.html'));
  assert.match(pay, /href="https:\/\/secure\.wayforpay\.com\/button\/b2222222222"/);
  assert.doesNotMatch(pay, /data-checkout/);
});

test('waitlist product shows waitlist form slot instead of pay', async () => {
  await buildSite();
  const html = readOut('products/game/index.html');
  assert.equal(buttons(html).pay, undefined);
  assert.match(html, /data-form="waitlist"/);
});

test('program weeks are collapsible with item lists', async () => {
  await buildSite();
  const html = readOut('products/mentorship/index.html');
  const weeks = html.match(/<details class="week"[^]*?<\/details>/g) ?? [];
  assert.equal(weeks.length, 6);
  assert.match(weeks[0], /<summary[^>]*>[^]*Тиждень 1\. Перший вихід[^]*<\/summary>/);
  assert.equal((weeks[0].match(/<li>/g) ?? []).length, 2);
});

test('testimonials are screenshots only, same card size on every screen, no scrollbar', async () => {
  await buildSite();
  const html = readOut('products/mentorship/index.html');
  const shots = html.match(/<ul class="shots"[^]*?<\/ul>/)?.[0] ?? '';
  assert.equal((shots.match(/<img/g) ?? []).length, 4);
  assert.doesNotMatch(html, /<blockquote/);
  const css = readOut(html.match(/<link rel="stylesheet" href="([^"]+)"/)[1].slice(1));
  assert.match(css, /\.shot img\{[^}]*aspect-ratio:21\/10[^}]*object-fit:cover/);
  assert.match(css, /\.shots\{[^}]*scrollbar-width:none/);
  assert.match(css, /\.shots::-webkit-scrollbar\{display:none\}/);
  assert.deepEqual(css.match(/\.shot\{[^}]*\}/g)?.map((r) => /flex:0 0 320px/.test(r)), [true]);
});

test('bonus line carries a gift icon', async () => {
  await buildSite();
  const html = readOut('products/mentorship/index.html');
  assert.match(html, /class="card__bonus"[^>]*><svg[^>]*class="icon icon--gift"/);
});

test('expandable headers have no focus frame, keyboard focus underlines the title', async () => {
  await buildSite();
  const html = readOut('products/mentorship/index.html');
  const css = readOut(html.match(/<link rel="stylesheet" href="([^"]+)"/)[1].slice(1));
  assert.match(css, /\.week__head:focus-visible,\.faq summary:focus-visible\{outline:none\}/);
  assert.match(css, /\.week__head:focus-visible \.week__title,\.faq summary:focus-visible\{text-decoration:underline/);
});

test('top of the page asks "questions?" and scrolls to the FAQ; the talk button waits below it', async () => {
  await buildSite();
  const html = readOut('products/mentorship/index.html');
  const top = html.match(/<div class="product__actions">[^]*?<\/div>/)[0];
  assert.match(top, /<a class="btn btn--block btn--ghost" href="#faq" data-umami-event="ask-click"[^>]*>Є питання\?<\/a>/);
  assert.doesNotMatch(top, /talk-click/);
  assert.equal((html.match(/data-umami-event="talk-click"/g) ?? []).length, 1);
  assert.match(html, /<section class="section section--faq" id="faq">[^]*<div class="container product__actions product__actions--bottom" id="talk">[^]*talk-click/);
});
