import {
  setAfterChange,
  setPool,
  pool,
  people,
  transactions,
} from "./state.js";
import { calculateSummary, addPerson } from "./render.js";
import {
  updateCurrentStateJson,
  updateShareableUrl,
  loadStateFromUrl,
  loadStateFromJson,
  loadStateFromJsonFile,
  downloadJson,
  savePoolToLocalStorage,
  renderSavedPoolsTable,
} from "./share.js";

setAfterChange(() => {
  updateCurrentStateJson();
  updateShareableUrl();
  calculateSummary();
});

// initial load
loadStateFromUrl();
renderSavedPoolsTable();

// UI bindings
document
  .getElementById("pool-name")
  .addEventListener("input", (e) => setPool(e.target.value));
document.getElementById("save-people").addEventListener("click", addPerson);
document
  .getElementById("download-json")
  .addEventListener("click", downloadJson);
document
  .getElementById("load-json")
  .addEventListener("click", loadStateFromJson);
document
  .getElementById("load-json-file")
  .addEventListener("click", () =>
    document.getElementById("state-json-file").click(),
  );
document.getElementById("state-json-file").addEventListener("change", (e) => {
  if (e.target.files[0]) {
    loadStateFromJsonFile(e.target.files[0]);
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

export * from "./state.js";
export * from "./render.js";
export * from "./share.js";
