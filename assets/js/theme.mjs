const KEY = 'theme';
const THEMES = ['light', 'dark'];

export function resolveTheme(stored, prefersDark) {
  if (THEMES.includes(stored)) return stored;
  return prefersDark ? 'dark' : 'light';
}

export function nextTheme(current) {
  return current === 'dark' ? 'light' : 'dark';
}

export function readStored(storage) {
  try {
    return storage?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}

export function writeStored(storage, value) {
  try {
    storage?.setItem(KEY, value);
  } catch {
    // Private mode or in-app browsers may deny storage; the choice then lasts for this page only.
  }
}

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

// Applies the theme before first paint; inlined into <head>.
export function applyInitialTheme() {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const theme = resolveTheme(readStored(safeLocalStorage()), prefersDark);
  document.documentElement.dataset.theme = theme;
  return theme;
}

export function initToggle() {
  for (const button of document.querySelectorAll('[data-theme-toggle]')) {
    button.addEventListener('click', () => {
      const theme = nextTheme(document.documentElement.dataset.theme);
      document.documentElement.dataset.theme = theme;
      writeStored(safeLocalStorage(), theme);
    });
  }
}
