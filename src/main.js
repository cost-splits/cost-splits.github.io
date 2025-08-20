import {
  setAfterChange,
  setPool,
  pool,
  people,
  transactions,
} from "./state.js";
import {
  calculateSummary,
  addPerson,
  renderSavedPoolsTable,
} from "./render.js";
import {
  updateCurrentStateJson,
  updateShareableUrl,
  loadStateFromUrl,
  loadStateFromJson,
  loadStateFromJsonFile,
  downloadJson,
  savePoolToLocalStorage,
  startNewPool,
} from "./share.js";
import { initTheme, toggleTheme } from "./theme.js";

/**
 * Update the theme toggle icon and accessible label.
 *
 * @param {"light"|"dark"} theme - Current theme.
 * @returns {void}
 */
function updateThemeToggle(theme) {
  const icon = document.getElementById("theme-toggle");
  if (!icon) return;
  if (theme === "dark") {
    icon.textContent = "☀️";
    icon.setAttribute("aria-label", "Switch to light mode");
    icon.title = "Switch to light mode";
  } else {
    icon.textContent = "🌙";
    icon.setAttribute("aria-label", "Switch to dark mode");
    icon.title = "Switch to dark mode";
  }
}

setAfterChange(() => {
  updateCurrentStateJson();
  updateShareableUrl();
  calculateSummary();
});

// initial load
loadStateFromUrl();
renderSavedPoolsTable();
const theme = initTheme();
updateThemeToggle(theme);

// UI bindings
document
  .getElementById("pool-name")
  .addEventListener("input", (e) => setPool(e.target.value));
document.getElementById("save-people").addEventListener("click", addPerson);
document
  .getElementById("download-json")
  .addEventListener("click", downloadJson);
document.getElementById("load-json").addEventListener("click", () => {
  loadStateFromJson();
  renderSavedPoolsTable();
});
document
  .getElementById("load-json-file")
  .addEventListener("click", () =>
    document.getElementById("state-json-file").click(),
  );
document
  .getElementById("state-json-file")
  .addEventListener("change", async (e) => {
    if (e.target.files[0]) {
      await loadStateFromJsonFile(e.target.files[0]);
      renderSavedPoolsTable();
    }
  });

document.getElementById("save-local").addEventListener("click", () => {
  if (!pool) {
    alert("Enter a pool name before saving");
    return;
  }
  savePoolToLocalStorage(pool, { people, transactions });
  renderSavedPoolsTable();
});

document.getElementById("new-pool").addEventListener("click", () => {
  startNewPool();
  renderSavedPoolsTable();
});

/**
 * Toggle theme and update the icon.
 *
 * @returns {void}
 */
function onThemeToggle() {
  const newTheme = toggleTheme();
  updateThemeToggle(newTheme);
}

const themeToggleEl = document.getElementById("theme-toggle");
if (themeToggleEl) {
  themeToggleEl.addEventListener("click", onThemeToggle);
  themeToggleEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onThemeToggle();
    }
  });
}

export * from "./state.js";
export * from "./render.js";
export * from "./share.js";
export * from "./theme.js";
