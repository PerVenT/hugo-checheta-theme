import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPayload, submitForm, telegramUrl } from '../../assets/js/forms.mjs';

const ctx = { productId: 'webinar-4-kroky', page: '/products/webinar/', utm: { utm_source: 'ig' }, now: new Date('2026-10-18T10:00:00Z') };
const fallback = { result: 'fallback', data: null };

test('buildPayload shapes the contract and drops the honeypot', () => {
  const p = buildPayload('webinar', { name: 'Оля', email: 'o@x.ua', website: 'spam' }, ctx);
  assert.deepEqual(p, {
    form: 'webinar',
    product_id: 'webinar-4-kroky',
    fields: { name: 'Оля', email: 'o@x.ua' },
    utm: { utm_source: 'ig' },
    page: '/products/webinar/',
    ts: '2026-10-18T10:00:00.000Z',
  });
});

test('empty endpoint falls back without calling fetch', async () => {
  let called = false;
  const r = await submitForm('', {}, { fetch: () => { called = true; } });
  assert.deepEqual(r, fallback);
  assert.equal(called, false);
});

test('network error, non-2xx and timeout fall back', async () => {
  assert.deepEqual(await submitForm('https://h', {}, { fetch: () => Promise.reject(new Error('net')) }), fallback);
  assert.deepEqual(await submitForm('https://h', {}, { fetch: async () => ({ ok: false, status: 500 }) }), fallback);
  const hang = (_u, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('abort'))));
  assert.deepEqual(await submitForm('https://h', {}, { fetch: hang, timeoutMs: 20 }), fallback);
});

test('2xx is ok, posts JSON and returns the parsed answer', async () => {
  let seen;
  const r = await submitForm('https://h/hook', { a: 1 }, {
    fetch: async (url, init) => {
      seen = { url, init };
      return { ok: true, status: 200, json: async () => ({ ok: true, tg_code: 'abc_DEF-1' }) };
    },
  });
  assert.deepEqual(r, { result: 'ok', data: { ok: true, tg_code: 'abc_DEF-1' } });
  assert.equal(seen.url, 'https://h/hook');
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(seen.init.body), { a: 1 });
});

test('2xx with a body that is not JSON is still ok', async () => {
  const r = await submitForm('https://h', {}, { fetch: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } }) });
  assert.deepEqual(r, { result: 'ok', data: null });
});

test('telegramUrl needs a bot and a safe code', () => {
  assert.equal(telegramUrl('checheta_bot', 'abc'), 'https://t.me/checheta_bot?start=abc');
  assert.equal(telegramUrl('', 'abc'), null);
  assert.equal(telegramUrl(undefined, 'abc'), null);
  assert.equal(telegramUrl('b', '<script>'), null);
  assert.equal(telegramUrl('b', undefined), null);
  assert.equal(telegramUrl('b', 'x'.repeat(65)), null);
});
