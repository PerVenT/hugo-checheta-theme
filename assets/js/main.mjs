import { initToggle } from './theme.mjs';
import { initCountdowns } from './countdown.mjs';
import { captureUtm } from './utm.mjs';
import { initForms } from './forms.mjs';
import { initYoutube } from './youtube.mjs';
import { initPay } from './pay.mjs';

function sessionStore() {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

initToggle();
initCountdowns();
initYoutube();
initPay();
initForms(captureUtm(location.search, sessionStore()));
