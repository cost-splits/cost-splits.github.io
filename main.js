import { addPerson } from "./render.js";
import {
  loadStateFromJson,
  loadStateFromJsonFile,
  loadStateFromUrl,
  downloadJson,
} from "./share.js";

export * from "./state.js";
export * from "./render.js";
export * from "./share.js";

document.getElementById("save-people")?.addEventListener("click", addPerson);
document
  .getElementById("load-json")
  ?.addEventListener("click", loadStateFromJson);
document
  .getElementById("load-json-file")
  ?.addEventListener("click", () =>
    document.getElementById("state-json-file")?.click(),
  );
document.getElementById("state-json-file")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) loadStateFromJsonFile(file);
});
document
  .getElementById("download-json")
  ?.addEventListener("click", downloadJson);

loadStateFromUrl();
