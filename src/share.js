import {
  pool,
  setPool,
  people,
  transactions,
  collapsedSplit,
  collapsedDetails,
  afterChange,
} from "./state.js";
import {
  renderPeople,
  renderTransactionTable,
  renderSplitTable,
  renderSplitDetails,
  calculateSummary,
} from "./render.js";

/* global LZString */
let lz = typeof LZString !== "undefined" ? LZString : null;
if (!lz) {
  const mod = await import("lz-string");
  lz = mod.default;
}

const LOCAL_STORAGE_KEY = "costSplitPools";

// ---- SAVE/LOAD STATE ----
// Validate the structure and types of the loaded state
/**
 * Ensure a loaded state object has the expected structure.
 *
 * @param {object} state - State object to validate.
 * @throws {Error} If the state is malformed.
 */
function validateState(state) {
  if (
    typeof state !== "object" ||
    state === null ||
    !Array.isArray(state.people) ||
    !Array.isArray(state.transactions)
  ) {
    throw new Error("Invalid state: missing people or transactions arrays");
  }

  if (typeof state.pool !== "undefined" && typeof state.pool !== "string") {
    throw new Error("Invalid state: pool must be a string");
  }

  // Validate people: array of non-empty strings
  if (
    !state.people.every((p) => typeof p === "string" && p.trim().length > 0)
  ) {
    throw new Error("Invalid state: people must be non-empty strings");
  }

  // Validate transactions: array of objects with expected fields
  const transactionsValid = state.transactions.every((t) => {
    const baseValid =
      t &&
      typeof t === "object" &&
      (typeof t.name === "undefined" || typeof t.name === "string") &&
      typeof t.payer === "number" &&
      Number.isInteger(t.payer) &&
      typeof t.cost === "number" &&
      isFinite(t.cost) &&
      Array.isArray(t.splits) &&
      t.splits.length === state.people.length &&
      t.splits.every((s) => typeof s === "number" && isFinite(s));
    if (!baseValid) return false;
    if (typeof t.items === "undefined") return true;
    if (!Array.isArray(t.items)) return false;
    return t.items.every(
      (it) =>
        it &&
        typeof it === "object" &&
        (typeof it.item === "undefined" || typeof it.item === "string") &&
        typeof it.cost === "number" &&
        isFinite(it.cost) &&
        Array.isArray(it.splits) &&
        it.splits.length === state.people.length &&
        it.splits.every((s) => typeof s === "number" && isFinite(s)),
    );
  });

  if (!transactionsValid) {
    throw new Error("Invalid state: transactions malformed");
  }
}

/**
 * Write the current state to the display input as JSON.
 */
function updateCurrentStateJson() {
  const display = document.getElementById("state-json-display");
  const state = { pool, people, transactions };
  if (display) display.value = JSON.stringify(state);
}

/**
 * Update the share URL field with a link to the current state.
 * Uses the current page URL (including file:// URLs) as the base.
 * The state JSON is compressed with LZString to shorten the URL.
 */
function updateShareableUrl() {
  const display = document.getElementById("share-url-display");
  if (!display || typeof window === "undefined") return;
  const base = window.location.href.split(/[?#]/)[0];
  const json = JSON.stringify({ pool, people, transactions });
  const compressed = lz.compressToEncodedURIComponent(json);
  display.value = `${base}?state=${compressed}`;
}

/**
 * Replace the current state with a loaded state and refresh the UI.
 *
 * @param {object} state - Parsed state object.
 */
function applyLoadedState(state) {
  validateState(state);
  people.length = 0;
  transactions.length = 0;
  collapsedSplit.clear();
  collapsedDetails.clear();
  setPool(typeof state.pool === "string" ? state.pool : "");
  state.people.forEach((p) => people.push(p));
  state.transactions.forEach((t) => transactions.push(t));

  const poolInput = document.getElementById("pool-name");
  if (poolInput) poolInput.value = pool;

  if (
    typeof renderPeople === "function" &&
    document.getElementById("people-list")
  ) {
    renderPeople();
  }
  if (
    typeof renderTransactionTable === "function" &&
    document.getElementById("transaction-table")
  ) {
    renderTransactionTable();
  }
  if (
    typeof renderSplitTable === "function" &&
    document.getElementById("split-table")
  ) {
    renderSplitTable();
  }

  const summaryEl = document.getElementById("summary");
  if (summaryEl) summaryEl.innerHTML = "";

  afterChange();
}

/**
 * Load state from the JSON text area.
 */
function loadStateFromJson() {
  const textarea = document.getElementById("state-json-input");
  try {
    const state = JSON.parse(textarea.value);
    applyLoadedState(state);
  } catch (e) {
    if (typeof alert === "function") {
      alert("Failed to load state: " + (e && e.message ? e.message : e));
    }
  }
}

/**
 * Load state from a JSON file chosen by the user.
 *
 * @param {File} file - JSON file to read.
 */
async function loadStateFromJsonFile(file) {
  try {
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
    const textarea = document.getElementById("state-json-input");
    if (textarea) textarea.value = text;
    const state = JSON.parse(text);
    applyLoadedState(state);
  } catch (e) {
    if (typeof alert === "function") {
      alert("Failed to load state: " + (e && e.message ? e.message : e));
    }
  }
}

/**
 * Load state from the `state` query parameter if present.
 * The state is assumed to be compressed with LZString.
 */
function loadStateFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("state");
    if (!value) return;
    const json = lz.decompressFromEncodedURIComponent(value);
    if (!json) throw new Error("Failed to decode state");
    const state = JSON.parse(json);
    applyLoadedState(state);
  } catch (e) {
    if (typeof alert === "function") {
      alert("Failed to load state: " + (e && e.message ? e.message : e));
    }
  }
}

// ---- LOCAL STORAGE ----

/**
 * Save a pool's people and transactions to local storage.
 *
 * @param {string} name - Name of the pool.
 * @param {{people: string[], transactions: object[]}} data - Pool data.
 */
function savePoolToLocalStorage(name, { people: p, transactions: t }) {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const pools = raw ? JSON.parse(raw) : {};
    pools[name] = { people: p, transactions: t };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pools));
  } catch (e) {
    // Fail silently; local storage may be unavailable or full.
  }
}

/**
 * Load a pool from local storage and apply it to the current state.
 *
 * @param {string} name - Name of the stored pool.
 * @returns {object|undefined} Loaded state if successful.
 */
function loadPoolFromLocalStorage(name) {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return undefined;
    const pools = JSON.parse(raw);
    if (!pools || typeof pools !== "object" || !pools[name]) return undefined;
    const state = { pool: name, ...pools[name] };
    applyLoadedState(state);
    return state;
  } catch (e) {
    return undefined;
  }
}

/**
 * List the names of pools saved in local storage.
 *
 * @returns {string[]} Array of pool names.
 */
function listSavedPools() {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const pools = JSON.parse(raw);
    return pools && typeof pools === "object" ? Object.keys(pools) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Remove a saved pool from local storage.
 *
 * @param {string} name - Pool name to remove.
 */
function deletePoolFromLocalStorage(name) {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;
    const pools = JSON.parse(raw);
    if (pools && typeof pools === "object" && name in pools) {
      delete pools[name];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pools));
    }
  } catch (e) {
    // Fail silently
  }
}

/**
 * Render a table of saved pools with load and delete actions.
 *
 * @returns {void}
 */
function renderSavedPoolsTable() {
  const table = document.getElementById("saved-pools-table");
  if (!table || typeof localStorage === "undefined") return;
  table.innerHTML = "";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Pool", "People", "Transactions", "Actions"].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let pools;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    pools = raw ? JSON.parse(raw) : {};
  } catch (e) {
    pools = {};
  }

  Object.entries(pools).forEach(([name, data]) => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = name;
    row.appendChild(nameCell);

    const peopleCell = document.createElement("td");
    peopleCell.textContent = Array.isArray(data.people)
      ? data.people.length
      : 0;
    row.appendChild(peopleCell);

    const txCell = document.createElement("td");
    txCell.textContent = Array.isArray(data.transactions)
      ? data.transactions.length
      : 0;
    row.appendChild(txCell);

    const actionsCell = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deletePoolFromLocalStorage(name);
      renderSavedPoolsTable();
    });
    actionsCell.appendChild(deleteBtn);
    row.appendChild(actionsCell);

    row.addEventListener("click", () => loadPoolFromLocalStorage(name));
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
}

/**
 * Trigger a download of the current state as a JSON file.
 */
function downloadJson() {
  const state = { pool, people, transactions };
  const dataStr = JSON.stringify(state);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cost-splits.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export {
  updateCurrentStateJson,
  updateShareableUrl,
  loadStateFromJson,
  loadStateFromJsonFile,
  loadStateFromUrl,
  savePoolToLocalStorage,
  loadPoolFromLocalStorage,
  listSavedPools,
  deletePoolFromLocalStorage,
  renderSavedPoolsTable,
  downloadJson,
  validateState,
  applyLoadedState,
};
