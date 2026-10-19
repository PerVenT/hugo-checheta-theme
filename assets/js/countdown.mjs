const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function msUntil(target, now) {
  return Math.max(0, target.getTime() - now.getTime());
}

// Enrolment closes at the start; the countdown appears only in the final week before it.
export function inCountdownWindow(ms) {
  return ms > 0 && ms <= 7 * DAY;
}

export function formatCountdown(ms) {
  return {
    d: Math.floor(ms / DAY),
    h: Math.floor((ms % DAY) / HOUR),
    m: Math.floor((ms % HOUR) / MINUTE),
  };
}

// Shows and fills [data-countdown] elements (rendered hidden) in the final week before the start.
// The template provides unit labels via data-units="д|год|хв".
export function initCountdowns() {
  const nodes = [...document.querySelectorAll('[data-countdown]')];
  if (!nodes.length) return;
  const tick = () => {
    for (const node of nodes) {
      const ms = msUntil(new Date(node.dataset.countdown), new Date());
      node.hidden = !inCountdownWindow(ms);
      if (node.hidden) continue;
      const [d, h, m] = (node.dataset.units || 'd|h|m').split('|');
      const t = formatCountdown(ms);
      node.querySelector('[data-countdown-value]').textContent = `${t.d} ${d} ${t.h} ${h} ${t.m} ${m}`;
    }
  };
  tick();
  setInterval(tick, MINUTE);
}
