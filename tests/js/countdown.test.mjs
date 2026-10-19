import { test } from 'node:test';
import assert from 'node:assert/strict';
import { msUntil, formatCountdown, inCountdownWindow } from '../../assets/js/countdown.mjs';

test('formatCountdown splits ms into days, hours, minutes', () => {
  assert.deepEqual(formatCountdown(90061000), { d: 1, h: 1, m: 1 });
  assert.deepEqual(formatCountdown(0), { d: 0, h: 0, m: 0 });
});

test('msUntil is never negative', () => {
  const now = new Date('2026-01-02T00:00:00Z');
  assert.equal(msUntil(new Date('2026-01-01T00:00:00Z'), now), 0);
  assert.equal(msUntil(new Date('2026-01-02T00:01:00Z'), now), 60000);
});

test('countdown shows only within the last 7 days', () => {
  const day = 86400000;
  assert.equal(inCountdownWindow(7 * day), true);
  assert.equal(inCountdownWindow(7 * day + 1), false);
  assert.equal(inCountdownWindow(0), false);
});
