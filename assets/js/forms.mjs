const HONEYPOT = 'website';

export function buildPayload(form, fields, { productId, page, utm, now }) {
  const clean = { ...fields };
  delete clean[HONEYPOT];
  return {
    form,
    product_id: productId,
    fields: clean,
    utm,
    page,
    ts: now.toISOString(),
  };
}

// Resolves "ok" only for a 2xx answer; anything else means the visitor should be offered Telegram.
export async function submitForm(endpoint, payload, { fetch: doFetch = globalThis.fetch, timeoutMs = 8000 } = {}) {
  if (!endpoint) return 'fallback';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await Promise.race([
      doFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }),
      new Promise((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('timeout')))),
    ]);
    return res?.ok ? 'ok' : 'fallback';
  } catch {
    return 'fallback';
  } finally {
    clearTimeout(timer);
  }
}

function track(event, data) {
  try {
    window.umami?.track(event, data);
  } catch {
    // Analytics must never break the form.
  }
}

export function initForms(utm) {
  for (const form of document.querySelectorAll('form[data-form]')) {
    const part = (name) => form.querySelector(`[data-form-${name}]`);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const type = form.dataset.form;
      const fields = Object.fromEntries(new FormData(form));
      if (fields[HONEYPOT]) {
        part('fields')?.setAttribute('hidden', '');
        part('success')?.removeAttribute('hidden');
        return;
      }
      const button = form.querySelector('[type="submit"]');
      if (button) button.disabled = true;
      const payload = buildPayload(type, fields, {
        productId: form.dataset.product || null,
        page: location.pathname,
        utm,
        now: new Date(),
      });
      const result = await submitForm(form.dataset.endpoint, payload);
      if (button) button.disabled = false;
      track('form-submit', { form: type, result });
      if (result === 'ok') {
        part('fields')?.setAttribute('hidden', '');
        part('fallback')?.setAttribute('hidden', '');
        part('success')?.removeAttribute('hidden');
      } else {
        // Typed values stay in the fields so the visitor can copy them into Telegram.
        part('fallback')?.removeAttribute('hidden');
      }
    });
  }
}
