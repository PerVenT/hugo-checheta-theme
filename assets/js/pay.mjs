export const WIDGET_SRC = 'https://secure.wayforpay.com/server/pay-widget.js?ref=button';

// Opens the WayForPay widget over the page; false when its script is not loaded yet.
export function openWidget(win, url) {
  if (typeof win.Wayforpay !== 'function') return false;
  new win.Wayforpay().invoice(url);
  return true;
}

// Opens an order signed by the checkout endpoint in the widget; onApproved runs after a successful payment.
export function runOrder(win, order, onApproved) {
  if (typeof win.Wayforpay !== 'function') return false;
  new win.Wayforpay().run(order, onApproved, () => {}, () => {});
  return true;
}

// Asks the checkout endpoint for a signed order of this product, with the visitor's UTM tags. null on any failure or
// after timeoutMs, so the caller falls back to the pay button: an outage of the endpoint must never block a sale.
export async function fetchOrder(fetchFn, endpoint, productId, utm, timeoutMs = 3000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchFn(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, utm }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const order = await res.json();
    return order?.merchantSignature ? order : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const WFP_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*wayforpay\.com$/;

// The widget reports the result to the page by postMessage; only an approved payment leads to the access page.
export function successTarget(event, url) {
  if (!url || !WFP_ORIGIN.test(event.origin ?? '')) return null;
  return event.data === 'WfpWidgetEventApproved' ? url : null;
}

// Pay links with data-wfp-widget: the widget script loads in the background and a click opens the payment
// over the page. Until it loads (or if it is blocked) the click is a plain link to the same button page.
// data-checkout: first ask that endpoint for an order carrying the UTM tags, and open the button only if that fails.
// data-success of the clicked link: where to go after an approved payment.
export function initPay(utm = {}) {
  const links = document.querySelectorAll('a[data-wfp-widget]');
  if (!links.length) return;
  if (!document.getElementById('widget-wfp-script')) {
    const script = document.createElement('script');
    script.id = 'widget-wfp-script';
    script.src = WIDGET_SRC;
    script.async = true;
    document.head.appendChild(script);
  }
  let opened = null;
  const success = () => {
    if (opened?.dataset.success) window.location.assign(opened.dataset.success);
  };
  const openButton = (link) => {
    try {
      if (openWidget(window, link.href)) return;
    } catch {
      // A broken widget must never block payment: go to the button page.
    }
    window.location.assign(link.href);
  };
  for (const link of links) {
    link.addEventListener('click', async (event) => {
      if (typeof window.Wayforpay !== 'function') return;
      event.preventDefault();
      opened = link;
      if (!link.dataset.checkout) return openButton(link);
      if (link.dataset.busy) return;
      link.dataset.busy = '1';
      const order = await fetchOrder(window.fetch.bind(window), link.dataset.checkout, link.dataset.product, utm);
      delete link.dataset.busy;
      try {
        if (order && runOrder(window, order, success)) return;
      } catch {
        // Fall back to the pay button below.
      }
      openButton(link);
    });
  }
  window.addEventListener('message', (event) => {
    const url = successTarget(event, opened?.dataset.success);
    if (url) window.location.assign(url);
  });
}
