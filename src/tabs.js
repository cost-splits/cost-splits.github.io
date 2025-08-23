/**
 * @file Provides tabbed navigation between calculator and about sections.
 */

/**
 * Initialize tab navigation for the site.
 * @returns {void}
 */
export function initTabs() {
  const buttons = document.querySelectorAll(".tab-button[data-tab]");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-tab");
      panels.forEach((panel) => panel.classList.add("hidden"));
      document.getElementById(targetId).classList.remove("hidden");

      buttons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });
}
