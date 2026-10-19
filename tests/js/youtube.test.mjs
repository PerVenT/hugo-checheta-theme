import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embedUrl, buildIframe } from '../../assets/js/youtube.mjs';

test('embedUrl uses youtube-nocookie with autoplay', () => {
  assert.equal(embedUrl('abc'), 'https://www.youtube-nocookie.com/embed/abc?autoplay=1');
});

test('buildIframe sets src, title and player permissions', () => {
  const doc = { createElement: (tag) => ({ tag, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }) };
  const f = buildIframe(doc, 'abc', 'Урок 1');
  assert.equal(f.tag, 'iframe');
  assert.deepEqual(f.attrs, {
    src: 'https://www.youtube-nocookie.com/embed/abc?autoplay=1',
    title: 'Урок 1',
    allow: 'autoplay; encrypted-media; picture-in-picture',
    allowfullscreen: '',
  });
});
