import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSite, readOut } from './helpers.mjs';

test('webinar form has fields, consent, honeypot and fallback', async () => {
  await buildSite();
  const html = readOut('products/webinar/index.html');
  // An open webinar gets its registration form from the template, no shortcode needed.
  assert.equal((html.match(/<form /g) ?? []).length, 1);
  const form = html.match(/<form[^]*?<\/form>/)[0];
  assert.match(form, /data-form="webinar"/);
  assert.match(form, /data-product="vebinar-rys"/);
  assert.match(form, /data-endpoint=""/);
  for (const name of ['name', 'email', 'telegram', 'consent']) assert.match(form, new RegExp(`name="${name}"`));
  assert.match(form, /<input[^>]*name="email"[^>]*required|<input[^>]*required[^>]*name="email"/);
  assert.match(form, /<input[^>]*name="website"[^>]*tabindex="-1"[^>]*autocomplete="off"/);
  assert.match(form, /data-form-fallback[^>]*hidden/);
  assert.match(form, /href="https:\/\/t\.me\/zviri_example"/);
  assert.match(form, /data-form-success[^>]*hidden/);
});

test('waitlist form renders on waitlist product', async () => {
  await buildSite();
  const form = readOut('products/game/index.html').match(/<form[^]*?<\/form>/)[0];
  assert.match(form, /data-form="waitlist"/);
  assert.match(form, /<input[^>]*name="email"[^>]*type="email"[^>]*required/);
  assert.match(form, /<input[^>]*name="telegram"/);
  assert.doesNotMatch(form, /name="contact"/);
});

test('lesson form asks for email and optional telegram', async () => {
  await buildSite();
  const form = readOut('lessons/urok-1/index.html').match(/<form[^]*?<\/form>/)[0];
  assert.match(form, /data-form="lesson"/);
  assert.match(form, /<input[^>]*name="email"[^>]*type="email"[^>]*required/);
  assert.match(form, /<input[^>]*name="telegram"/);
  assert.doesNotMatch(form, /name="contact"/);
});

test('webinar success shows calendar links in UTC with the page duration', async () => {
  await buildSite();
  const form = readOut('products/webinar/index.html').match(/<form[^]*?<\/form>/)[0];
  const success = form.match(/<div class="form__success"[^]*?<\/div>/)[0];
  // 2099-09-13 19:00 +03:00, duration 90 min.
  assert.match(success, /href="https:\/\/calendar\.google\.com\/calendar\/render\?[^"]*dates=20990913T160000Z%2f20990913T173000Z/i);
  const ics = success.match(/href="([^"]+\.ics)"/)[1];
  const cal = readOut(ics.replace(/^\//, ''));
  assert.match(cal, /^BEGIN:VCALENDAR\r\n/);
  assert.match(cal, /DTSTART:20990913T160000Z\r\n/);
  assert.match(cal, /DTEND:20990913T173000Z\r\n/);
  assert.match(cal, /SUMMARY:Вебінар «Рись — тінь Карпат»\r\n/);
  assert.match(success, /<a[^>]*data-form-telegram[^>]*hidden/);
});

test('form carries the bot username for the Telegram button', async () => {
  await buildSite();
  const form = readOut('products/webinar/index.html').match(/<form[^]*?<\/form>/)[0];
  assert.match(form, /data-bot=""/);
});

test('products without a start get no calendar links', async () => {
  await buildSite();
  const form = readOut('products/game/index.html').match(/<form[^]*?<\/form>/)[0];
  assert.doesNotMatch(form, /calendar\.google\.com|\.ics"/);
});

test('umami script only when configured; gtag absent when empty', async () => {
  await buildSite();
  const html = readOut('index.html');
  assert.match(html, /<script defer src="https:\/\/umami\.example\/script\.js" data-website-id="test-site-id"><\/script>/);
  assert.doesNotMatch(html, /googletagmanager/);
});

test('on wide screens the form spans the actions row and lays fields out in a line', async () => {
  await buildSite();
  const html = readOut('products/game/index.html');
  const css = readOut(html.match(/<link rel="stylesheet" href="([^"]+)"/)[1].slice(1));
  assert.match(css, /\.product__actions>\.form\{[^}]*grid-column:1\/-1/);
  assert.match(css, /\.product__hero:not\(:has\(\.product__media\)\)\{[^}]*grid-template-columns:1fr/);
  assert.match(css, /@media\(min-width:640px\)\{\.form__fields\{grid-template-columns:1fr 1fr/);
});
