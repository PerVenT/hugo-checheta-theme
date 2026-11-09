import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openWidget, successTarget } from '../../assets/js/pay.mjs';

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
