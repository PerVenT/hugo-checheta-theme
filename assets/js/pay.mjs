export const WIDGET_SRC = 'https://secure.wayforpay.com/server/pay-widget.js?ref=button';

// Opens the WayForPay widget over the page; false when its script is not loaded yet.
export function openWidget(win, url) {
  if (typeof win.Wayforpay !== 'function') return false;
  new win.Wayforpay().invoice(url);
  return true;
}

// Pay links with data-wfp-widget: the widget script loads in the background and a click opens the payment
// over the page. Until it loads (or if it is blocked) the click is a plain link to the same button page.
export function initPay() {
  const links = document.querySelectorAll('a[data-wfp-widget]');
  if (!links.length) return;
  if (!document.getElementById('widget-wfp-script')) {
    const script = document.createElement('script');
    script.id = 'widget-wfp-script';
    script.src = WIDGET_SRC;
    script.async = true;
    document.head.appendChild(script);
  }
  for (const link of links) {
    link.addEventListener('click', (event) => {
      try {
        if (openWidget(window, link.href)) event.preventDefault();
      } catch {
        // A broken widget must never block payment: the link stays.
      }
    });
  }
}
