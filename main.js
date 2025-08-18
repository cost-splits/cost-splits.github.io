import { setAfterChange } from "./state.js";
import { calculateSummary, addPerson } from "./render.js";
import {
  updateCurrentStateJson,
  updateShareableUrl,
  loadStateFromUrl,
  loadStateFromJson,
  loadStateFromJsonFile,
  downloadJson,
} from "./share.js";

setAfterChange(() => {
  updateCurrentStateJson();
  updateShareableUrl();
  calculateSummary();
});

// initial load
loadStateFromUrl();

// UI bindings
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

export * from "./state.js";
export * from "./render.js";
export * from "./share.js";
