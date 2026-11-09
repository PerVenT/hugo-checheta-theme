import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite, readOut, exampleSite } from './helpers.mjs';

// Builds exampleSite with extra config or a throwaway content dir; returns {out, err}.
function buildVariant({ config, content } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'theme-variant-'));
  const args = ['--source', exampleSite, '--destination', join(dir, 'public')];
  if (config) {
    writeFileSync(join(dir, 'extra.yml'), config);
    args.push('--config', `${join(exampleSite, 'hugo.yml')},${join(dir, 'extra.yml')}`);
  }
  if (content) {
    for (const [path, body] of Object.entries(content)) {
      mkdirSync(join(dir, 'content', path, '..'), { recursive: true });
      writeFileSync(join(dir, 'content', path), body);
    }
    args.push('--contentDir', join(dir, 'content'));
  }
  try {
    execFileSync('hugo', args, { stdio: 'pipe' });
    return { read: (p) => readFileSync(join(dir, 'public', p), 'utf8'), err: '', cleanup: () => rmSync(dir, { recursive: true, force: true }) };
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
    return { err: e.stderr?.toString() ?? e.message };
  }
}

test('lessons list: lite players (no iframe), one lesson form per video, ids from youtu.be links too', async () => {
  await buildSite();
  const html = readOut('lessons/index.html');
  assert.doesNotMatch(html, /<iframe/);
  const players = [...html.matchAll(/<a class="yt" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})" data-youtube="\1"/g)].map((m) => m[1]);
  assert.deepEqual(players, ['M7lc1UVf-VE', 'aqz-KE-bpKQ']);
  assert.match(html, /<img src="https:\/\/i\.ytimg\.com\/vi\/M7lc1UVf-VE\/hqdefault\.jpg" width="480" height="360" alt="" loading="lazy"/);
  const forms = [...html.matchAll(/<form class="form" data-form="lesson" data-product="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(forms, ['lesson-1', 'lesson-2']);
});

test('lesson page has its own player and form', async () => {
  await buildSite();
  const html = readOut('lessons/urok-1/index.html');
  assert.match(html, /data-youtube="M7lc1UVf-VE"/);
  assert.match(html, /data-form="lesson" data-product="lesson-1"/);
});

test('lesson with offer: product block with pay button between video and form, on the list and the lesson page', async () => {
  await buildSite();
  for (const page of ['lessons/index.html', 'lessons/urok-1/index.html']) {
    const html = readOut(page);
    const offer = html.match(/<aside class="offer"[^]*?<\/aside>/)[0];
    assert.match(offer, /<a href="\/products\/mini\/">Міні-курс «Сліди на снігу»<\/a>/);
    assert.match(offer, /href="https:\/\/secure\.wayforpay\.com\/button\/b1111111111" data-umami-event="pay-click" data-umami-event-product="slidy-na-snihu"/);
    assert.ok(html.indexOf('class="offer"') > html.indexOf('class="yt"'));
    assert.ok(html.indexOf('class="offer"') < html.indexOf('data-form="lesson" data-product="lesson-1"'));
  }
  assert.equal([...readOut('lessons/index.html').matchAll(/class="offer"/g)].length, 1);
});

test('lesson offer: closed product shows no block, unknown path stops the build', () => {
  const lesson = (offer) => `---\ntitle: X\nid: x\nyoutube_id: M7lc1UVf-VE\noffer: ${offer}\n---\n`;
  const closed = buildVariant({ content: { 'lessons/x.md': lesson('/products/bare/'), 'products/bare.md': '---\ntitle: B\nid: bare\nstatus: close\n---\n' } });
  assert.doesNotMatch(closed.read('lessons/x/index.html'), /class="offer"/);
  closed.cleanup();
  const { err } = buildVariant({ content: { 'lessons/x.md': lesson('/products/nema/') } });
  assert.match(err, /«offer» — немає сторінки «\/products\/nema\/»/);
});

test('thanks page with youtube_id shows the video; without it — none', async () => {
  await buildSite();
  assert.match(readOut('thanks-access/index.html'), /<div class="thanks__video"><a class="yt" href="https:\/\/www\.youtube\.com\/watch\?v=aqz-KE-bpKQ"/);
  assert.doesNotMatch(readOut('thanks-payment/index.html'), /thanks__video/);
});

test('checkout mode with api endpoint: widget link with endpoint, product and access page; button URL stays the fallback', () => {
  const v = buildVariant({ config: 'params:\n  api:\n    endpoint: https://api.example/checkout\n' });
  const pay = v.read('products/checkout-fallback/index.html').match(/<a[^>]*data-umami-event="pay-click"[^>]*>/)[0];
  v.cleanup();
  assert.match(pay, /href="https:\/\/secure\.wayforpay\.com\/button\/b2222222222"/);
  assert.match(pay, /data-checkout="https:\/\/api\.example\/checkout"/);
  assert.match(pay, /data-wfp-widget/);
  assert.match(pay, /data-product="checkout-fallback"/);
  assert.match(pay, /data-success="\/thanks-access\/"/);
});

test('unrecognisable youtube_id stops the build', () => {
  const { err } = buildVariant({ content: { 'lessons/x.md': '---\ntitle: X\nid: x\nyoutube_id: not a video\n---\n' } });
  assert.match(err, /«youtube_id» — не вдалося розпізнати відео «not a video»/);
});

test('thanks for payment: noindex, Telegram CTA, no bot block until bot is configured', async () => {
  await buildSite();
  const html = readOut('thanks-payment/index.html');
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(readOut('sitemap.xml'), /thanks-/);
  assert.match(readOut('sitemap.xml'), /\/lessons\//);
  assert.match(html, /<a class="btn" href="https:\/\/t\.me\/zviri_example"/);
  assert.doesNotMatch(html, /id="tg-confirm"/);
  const withBot = buildVariant({ config: 'params:\n  bot:\n    username: zviri_example_bot\n' });
  assert.equal(withBot.err, '');
  assert.match(withBot.read('thanks-payment/index.html'), /<div id="tg-confirm"[^]*href="https:\/\/t\.me\/zviri_example_bot"/);
  withBot.cleanup();
});

test('thanks for registration points to the Telegram channel', async () => {
  await buildSite();
  assert.match(readOut('thanks-registration/index.html'), /<a class="btn" href="https:\/\/t\.me\/zviri_example_channel"/);
});

test('legal draft shows a banner; about page has photo and text', async () => {
  await buildSite();
  assert.match(readOut('offer/index.html'), /<p class="legal-draft" role="note">/);
  const about = readOut('about/index.html');
  assert.match(about, /<h1>Про клуб<\/h1>/);
  assert.match(about, /class="about__media"[^]*<img/);
});

test('products list shows the card grid', async () => {
  await buildSite();
  const html = readOut('products/index.html');
  assert.match(html, /<h1>Програми<\/h1>/);
  assert.match(html, /<div class="grid">[^]*class="card"/);
});

const product = (fm) => `---\n${fm}\n---\n`;

test('pinned product goes first and stays after its start date; others keep their order', () => {
  const site = buildVariant({ content: {
    'products/_index.md': product('title: Програми'),
    'products/a.md': product('title: A\nid: a\nstatus: open\nstart: 2099-03-01'),
    'products/b.md': product('title: B\nid: b\nstatus: open\nstart: 2099-02-01'),
    'products/old.md': product('title: Old\nid: old\nstatus: open\nstart: 2020-01-01\npinned: true'),
    'products/past.md': product('title: Past\nid: past\nstatus: open\nstart: 2020-01-01'),
  } });
  assert.equal(site.err, '');
  const ids = (html) => [...html.matchAll(/<article class="card" data-product="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids(site.read('index.html')), ['old', 'b', 'a']);
  assert.deepEqual(ids(site.read('products/index.html')), ['old', 'b', 'a']);
  site.cleanup();
});

test('a closed pinned product is hidden', () => {
  const site = buildVariant({ content: {
    'products/a.md': product('title: A\nid: a\nstatus: open\nstart: 2099-03-01'),
    'products/old.md': product('title: Old\nid: old\nstatus: closed\npinned: true'),
  } });
  assert.doesNotMatch(site.read('index.html'), /data-product="old"/);
  site.cleanup();
});

test('only one product can be pinned', () => {
  const { err } = buildVariant({ content: {
    'products/a.md': product('title: A\nid: a\nstatus: open\npinned: true'),
    'products/b.md': product('title: B\nid: b\nstatus: open\npinned: true'),
  } });
  assert.match(err, /закріпити можна лише один продукт, зараз закріплено 2: products[\\/]a\.md, products[\\/]b\.md/);
});

test('product image is found by id (light and -dark); front matter image overrides it', async () => {
  await buildSite();
  const html = readOut('products/mentorship/index.html');
  const media = html.match(/<div class="product__media">[^]*?<\/div>/)?.[0] ?? '';
  assert.match(media, /<img src="\/images\/products\/slidopyt-6-tyzhniv_[^"]+"[^>]*class="only-light"/);
  assert.match(media, /<img src="\/images\/products\/slidopyt-6-tyzhniv-dark_[^"]+"[^>]*class="only-dark"/);
  const site = buildVariant({ content: {
    'products/a.md': product('title: A\nid: slidopyt-6-tyzhniv\nstatus: open\nimage: images/avatar.jpg'),
    'products/b.md': product('title: B\nid: no-such-image\nstatus: open'),
  } });
  assert.equal(site.err, '');
  const a = site.read('products/a/index.html').match(/<div class="product__media">[^]*?<\/div>/)[0];
  assert.match(a, /<img src="\/images\/avatar_[^"]+"[^>]*class="only-light"/);
  assert.match(a, /slidopyt-6-tyzhniv-dark_/);
  assert.doesNotMatch(site.read('products/b/index.html'), /product__media/);
  site.cleanup();
});

test('site in a subfolder (GitHub Pages): every local link and font stays under baseURL', () => {
  const sub = buildVariant({ config: 'baseURL: https://example.org/demo/\n' });
  assert.equal(sub.err, '');
  for (const page of ['index.html', 'links/index.html', 'products/webinar/index.html', 'lessons/index.html', '404.html']) {
    const html = sub.read(page);
    const local = [...html.matchAll(/\s(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
    assert.ok(local.length > 0, page);
    assert.deepEqual(local.filter((u) => !u.startsWith('/demo/')), [], page);
  }
  const css = sub.read(sub.read('index.html').match(/<link rel="stylesheet" href="\/demo\/([^"]+)"/)[1]);
  assert.doesNotMatch(css, /url\(\/fonts\//);
  sub.cleanup();
});
