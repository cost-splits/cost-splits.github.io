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
  hasUnsavedChanges,
  updatePoolSaveStatus,
  copyCurrentStateJson,
  copyShareableUrl,
} from "./share.js";

setAfterChange(() => {
  updateCurrentStateJson();
  updateShareableUrl();
  calculateSummary();
  updatePoolSaveStatus();
});

// initial load
startNewPool();
loadStateFromUrl();
renderSavedPoolsTable();

// UI bindings
document
  .getElementById("pool-name")
  .addEventListener("input", (e) => setPool(e.target.value));
document.getElementById("save-people").addEventListener("click", addPerson);
document.getElementById("person-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addPerson();
  }
});
document
  .getElementById("download-json")
  .addEventListener("click", downloadJson);
document
  .getElementById("copy-json")
  .addEventListener("click", copyCurrentStateJson);
document
  .getElementById("copy-share")
  .addEventListener("click", copyShareableUrl);
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
  if (hasUnsavedChanges() && !confirm("You have unsaved changes. Continue?")) {
    return;
  }
  startNewPool();
  renderSavedPoolsTable();
});

export * from "./state.js";
export * from "./render.js";
export * from "./share.js";
