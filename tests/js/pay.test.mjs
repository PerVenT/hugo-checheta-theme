import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openWidget, successTarget, fetchOrder, runOrder } from '../../assets/js/pay.mjs';

const order = { orderReference: 'CHK-1', amount: 300, merchantSignature: 'abc' };
const reply = (status, body) => async () => ({ ok: status < 300, status, json: async () => body });

test('fetchOrder posts the product and UTM, returns the signed order', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push([url, init.method, JSON.parse(init.body), init.headers['Content-Type']]);
    return reply(200, order)();
  };
  assert.deepEqual(await fetchOrder(fetchFn, 'https://api.example/checkout', 'trening', { utm_source: 'instagram' }), order);
  assert.deepEqual(calls, [['https://api.example/checkout', 'POST', { product_id: 'trening', utm: { utm_source: 'instagram' } }, 'application/json']]);
});

test('fetchOrder gives null on an error status, an unsigned answer, a network error or a timeout', async () => {
  assert.equal(await fetchOrder(reply(404, { ok: false }), 'u', 'p', {}), null);
  assert.equal(await fetchOrder(reply(200, { amount: 1 }), 'u', 'p', {}), null);
  assert.equal(await fetchOrder(async () => { throw new Error('down'); }, 'u', 'p', {}), null);
  const hang = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  assert.equal(await fetchOrder(hang, 'u', 'p', {}, 20), null);
});

test('runOrder opens the signed order in the widget; false until the widget is loaded', () => {
  assert.equal(runOrder({}, order, () => {}), false);
  const calls = [];
  let approved = null;
  const win = { Wayforpay: function () { this.run = (params, ok) => { calls.push(params); approved = ok; }; } };
  let done = false;
  assert.equal(runOrder(win, order, () => { done = true; }), true);
  assert.deepEqual(calls, [order]);
  approved({ transactionStatus: 'Approved' });
  assert.equal(done, true);
});

test('successTarget: only an approved payment from WayForPay leads to the access page', () => {
  const ok = { origin: 'https://secure.wayforpay.com', data: 'WfpWidgetEventApproved' };
  assert.equal(successTarget(ok, '/thanks/x/'), '/thanks/x/');
  assert.equal(successTarget({ ...ok, data: 'WfpWidgetEventDeclined' }, '/thanks/x/'), null);
  assert.equal(successTarget({ ...ok, data: 'WfpWidgetEventClose' }, '/thanks/x/'), null);
  assert.equal(successTarget({ ...ok, origin: 'https://evil.example' }, '/thanks/x/'), null);
  assert.equal(successTarget({ ...ok, origin: 'https://secure.wayforpay.com.evil.example' }, '/thanks/x/'), null);
  assert.equal(successTarget(ok, ''), null);
  assert.equal(successTarget(ok, undefined), null);
});

test('openWidget returns false until the widget script is loaded', () => {
  assert.equal(openWidget({}, 'https://secure.wayforpay.com/button/b1'), false);
});

test('openWidget opens the button url as a widget invoice', () => {
  const calls = [];
  const win = { Wayforpay: function () { this.invoice = (url) => calls.push(url); } };
  assert.equal(openWidget(win, 'https://secure.wayforpay.com/button/b1'), true);
  assert.deepEqual(calls, ['https://secure.wayforpay.com/button/b1']);
});
