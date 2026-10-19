import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureUtm } from '../../assets/js/utm.mjs';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m };
};

test('captures only utm_* params and stores them', () => {
  const s = memory();
  assert.deepEqual(captureUtm('?utm_source=ig&utm_medium=bio&x=1', s), { utm_source: 'ig', utm_medium: 'bio' });
  assert.equal(JSON.parse(s.m.get('utm')).utm_source, 'ig');
});

test('returns stored values when URL has none', () => {
  const s = memory();
  captureUtm('?utm_source=tiktok', s);
  assert.deepEqual(captureUtm('', s), { utm_source: 'tiktok' });
});

test('broken storage still returns URL values', () => {
  const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  assert.deepEqual(captureUtm('?utm_campaign=sept', broken), { utm_campaign: 'sept' });
  assert.deepEqual(captureUtm('', broken), {});
});

test('corrupted stored json is ignored', () => {
  const s = memory();
  s.setItem('utm', '{not json');
  assert.deepEqual(captureUtm('', s), {});
});
