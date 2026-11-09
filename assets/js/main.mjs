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

const utm = captureUtm(location.search, sessionStore());
initToggle();
initCountdowns();
initYoutube();
initPay(utm);
initForms(utm);
