/**
 * @file Provides tabbed navigation between site sections such as calculator,
 * about, and tutorials.
 */

/**
 * Initialize tab navigation for the site.
 * @returns {void}
 */
export function initTabs() {
  const tabs = document.querySelectorAll(".tab-link[data-tab]");
  const panels = document.querySelectorAll(".tab-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("data-tab");
      panels.forEach((panel) => panel.classList.add("hidden"));
      document.getElementById(targetId).classList.remove("hidden");

      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
  });
}
