export const WIDGET_SRC = 'https://secure.wayforpay.com/server/pay-widget.js?ref=button';

// Opens the WayForPay widget over the page; false when its script is not loaded yet.
export function openWidget(win, url) {
  if (typeof win.Wayforpay !== 'function') return false;
  new win.Wayforpay().invoice(url);
  return true;
}

const WFP_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*wayforpay\.com$/;

// The widget reports the result to the page by postMessage; only an approved payment leads to the access page.
export function successTarget(event, url) {
  if (!url || !WFP_ORIGIN.test(event.origin ?? '')) return null;
  return event.data === 'WfpWidgetEventApproved' ? url : null;
}

// Pay links with data-wfp-widget: the widget script loads in the background and a click opens the payment
// over the page. Until it loads (or if it is blocked) the click is a plain link to the same button page.
// data-success of the clicked link: where to go after an approved payment.
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
  let opened = null;
  for (const link of links) {
    link.addEventListener('click', (event) => {
      try {
        if (openWidget(window, link.href)) {
          event.preventDefault();
          opened = link;
        }
      } catch {
        // A broken widget must never block payment: the link stays.
      }
    });
  }
  window.addEventListener('message', (event) => {
    const url = successTarget(event, opened?.dataset.success);
    if (url) window.location.assign(url);
  });
}
