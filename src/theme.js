const THEME_KEY = "theme";

/**
 * Apply a theme to the document root.
 *
 * @param {"light"|"dark"} theme - Theme to apply.
 * @returns {void}
 */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

/**
 * Initialize theme from local storage or system preference.
 *
 * @returns {"light"|"dark"} - The applied theme.
 */
function initTheme() {
  let theme = "light";
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
      theme = stored;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }
  } catch {
    // ignore access errors
  }
  applyTheme(theme);
  return theme;
}

/**
 * Toggle between light and dark themes.
 *
 * @returns {"light"|"dark"} - The newly applied theme.
 */
function toggleTheme() {
  const current =
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // ignore write errors
  }
  return next;
}

export { initTheme, toggleTheme };
