import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openWidget } from '../../assets/js/pay.mjs';

test('openWidget returns false until the widget script is loaded', () => {
  assert.equal(openWidget({}, 'https://secure.wayforpay.com/button/b1'), false);
});

test('openWidget opens the button url as a widget invoice', () => {
  const calls = [];
  const win = { Wayforpay: function () { this.invoice = (url) => calls.push(url); } };
  assert.equal(openWidget(win, 'https://secure.wayforpay.com/button/b1'), true);
  assert.deepEqual(calls, ['https://secure.wayforpay.com/button/b1']);
});
