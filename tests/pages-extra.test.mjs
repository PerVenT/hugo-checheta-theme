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
