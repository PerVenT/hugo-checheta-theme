import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPayload, submitForm } from '../../assets/js/forms.mjs';

const ctx = { productId: 'webinar-4-kroky', page: '/products/webinar/', utm: { utm_source: 'ig' }, now: new Date('2026-10-18T10:00:00Z') };

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
  assert.equal(r, 'fallback');
  assert.equal(called, false);
});

test('network error, non-2xx and timeout fall back', async () => {
  assert.equal(await submitForm('https://h', {}, { fetch: () => Promise.reject(new Error('net')) }), 'fallback');
  assert.equal(await submitForm('https://h', {}, { fetch: async () => ({ ok: false, status: 500 }) }), 'fallback');
  const hang = (_u, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('abort'))));
  assert.equal(await submitForm('https://h', {}, { fetch: hang, timeoutMs: 20 }), 'fallback');
});

test('2xx is ok and posts JSON', async () => {
  let seen;
  const r = await submitForm('https://h/hook', { a: 1 }, { fetch: async (url, init) => { seen = { url, init }; return { ok: true, status: 200 }; } });
  assert.equal(r, 'ok');
  assert.equal(seen.url, 'https://h/hook');
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(seen.init.body), { a: 1 });
});
