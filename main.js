import { setAfterChange } from "./state.js";
import { calculateSummary } from "./render.js";
import { updateCurrentStateJson, updateShareableUrl, loadStateFromUrl } from "./share.js";

setAfterChange(() => {
  updateCurrentStateJson();
  updateShareableUrl();
  calculateSummary();
});

// initial load
loadStateFromUrl();

export * from "./state.js";
export * from "./render.js";
export * from "./share.js";
