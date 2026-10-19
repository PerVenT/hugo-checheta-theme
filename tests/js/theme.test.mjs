import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, nextTheme, readStored, writeStored } from '../../assets/js/theme.mjs';

test('resolveTheme prefers stored valid value, else system', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('garbage', false), 'light');
});

test('nextTheme toggles', () => {
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
});

test('storage errors are swallowed', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(readStored(broken), null);
  assert.doesNotThrow(() => writeStored(broken, 'dark'));
  assert.equal(readStored(undefined), null);
});

test('storage round-trip uses key "theme"', () => {
  const mem = new Map();
  const s = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  writeStored(s, 'dark');
  assert.equal(mem.get('theme'), 'dark');
  assert.equal(readStored(s), 'dark');
});
