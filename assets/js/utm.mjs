const KEY = 'utm';
const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

function readStored(storage) {
  try {
    const raw = storage?.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Keeps the latest UTM tags for the browser session so forms can report the source.
export function captureUtm(search, storage) {
  const params = new URLSearchParams(search);
  const fresh = {};
  for (const name of PARAMS) {
    const value = params.get(name);
    if (value) fresh[name] = value;
  }
  if (!Object.keys(fresh).length) return readStored(storage);
  try {
    storage?.setItem(KEY, JSON.stringify(fresh));
  } catch {
    // Storage unavailable: tags still apply to this page.
  }
  return fresh;
}
