/**
 * Compute the amounts paid, owed and net balance for each person.
 *
 * @param {string[]} people - List of participant names.
 * @param {Array<{payer:number,cost:number,splits:number[]}>} transactions -
 *   Transactions describing who paid and how the cost is split.
 * @returns {{paid:number[], owes:number[], nets:number[]}} Summary arrays for
 *   each person.
 */
function computeSummary(people, transactions) {
  const paid = Array(people.length).fill(0);
  const owes = Array(people.length).fill(0);

  transactions.forEach((t) => {
    paid[t.payer] += t.cost;
    const totalSplit = t.splits.reduce((a, b) => a + b, 0);
    if (totalSplit > 0) {
      t.splits.forEach((s, i) => {
        owes[i] += (s / totalSplit) * t.cost;
      });
    }
  });

  const nets = people.map((_, i) => paid[i] - owes[i]);
  return { paid, owes, nets };
}
/** @type {string[]} */
const people = [];
/** @type {Array<{name?:string, cost:number, payer:number, splits:number[]}>} */
const transactions = [];
/* global LZString */
const lz = typeof LZString !== "undefined" ? LZString : require("lz-string");

/**
 * Handle updates after state changes by refreshing derived values.
 */
function afterChange() {
  updateCurrentStateJson();
  updateShareableUrl();
  calculateSummary();
}

/**
 * Check whether a value represents a valid dollar amount.
 *
 * @param {string} value - Input string to validate.
 * @param {boolean} [allowEmpty=false] - Whether an empty string is allowed.
 * @returns {boolean} True if the value is a valid dollar amount.
 */
function isValidDollar(value, allowEmpty = false) {
  if (allowEmpty && value.trim() === "") return true;
  return /^\d+(\.\d{0,2})?$/.test(value);
}

/**
 * Validate an arbitrary number allowing any number of decimals.
 *
 * @param {string} value - Input string to validate.
 * @param {boolean} [allowEmpty=false] - Whether an empty string is allowed.
 * @returns {boolean} True if the value is numeric.
 */
function isValidNumber(value, allowEmpty = false) {
  if (allowEmpty && value.trim() === "") return true;
  return /^\d+(\.\d+)?$/.test(value);
}

// ---- PEOPLE ----

/**
 * Add a new person from the name input field.
 */
function addPerson() {
  const input = document.getElementById("person-name");
  const name = input.value.trim();
  if (!name || people.includes(name)) {
    input.classList.add("invalid-cell");
    return;
  }
  input.classList.remove("invalid-cell");
  people.push(name);
  transactions.forEach((t) => t.splits.push(0));
  input.value = "";
  renderPeople();
  renderTransactionTable();
  renderSplitTable();
  afterChange();
}

/**
 * Remove a person and any associated transactions.
 *
 * @param {number} index - Index of the person to remove.
 */
function deletePerson(index) {
  const involved = transactions.some(
    (t) => t.payer === index || (t.splits[index] && t.splits[index] > 0),
  );
  if (involved) {
    if (
      !confirm(
        "This person is involved in transactions. Deleting them will also remove those transactions. Continue?",
      )
    ) {
      return;
    }
    for (let i = transactions.length - 1; i >= 0; i--) {
      if (
        transactions[i].payer === index ||
        transactions[i].splits[index] > 0
      ) {
        transactions.splice(i, 1);
      }
    }
  }
  people.splice(index, 1);
  transactions.forEach((t) => {
    t.splits.splice(index, 1);
    if (t.payer > index) {
      t.payer--;
    }
  });
  renderPeople();
  renderTransactionTable();
  renderSplitTable();
  afterChange();
}

/**
 * Render the list of people with delete controls.
 */
function renderPeople() {
  const list = document.getElementById("people-list");
  list.innerHTML = "";
  people.forEach((p, i) => {
    const li = document.createElement("li");
    li.textContent = p;
    const del = document.createElement("span");
    del.textContent = "❌";
    del.className = "delete-btn";
    del.onclick = () => deletePerson(i);
    li.appendChild(del);
    list.appendChild(li);
  });
}

// ---- TRANSACTIONS ----

/**
 * Render the transactions table allowing editing and deletion.
 */
function renderTransactionTable() {
  const table = document.getElementById("transaction-table");
  table.innerHTML = "";
  if (people.length === 0) {
    table.innerHTML = "<tr><td>Please add people first</td></tr>";
    return;
  }
  let header =
    "<tr><th>Name</th><th>Paid By</th><th>Cost</th><th>Action</th></tr>";
  table.innerHTML = header;

  transactions.forEach((t, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
          <td><input type="text" value="${t.name || "Transaction " + (i + 1)}"
                     onchange="editTransaction(${i},'name',this.value,this)"></td>
          <td>
            <select onchange="editTransaction(${i},'payer',this.value,this)">
              ${people
                .map(
                  (p, pi) =>
                    `<option value="${pi}" ${
                      pi === t.payer ? "selected" : ""
                    }>${p}</option>`,
                )
                .join("")}
            </select>
          </td>
          <td>
            <div class="dollar-field">
              <span class="prefix">$</span>
              <input type="text" value="${t.cost.toFixed(2)}"
                     onchange="editTransaction(${i},'cost',this.value,this)">
            </div>
          </td>
          <td><button onclick="deleteTransaction(${i})">Delete</button></td>
        `;
    table.appendChild(row);
  });

  const addRow = document.createElement("tr");
  addRow.innerHTML = `
        <td><input type="text" id="new-t-name" placeholder="Name (optional)"></td>
        <td>
          <select id="new-t-payer">
            ${people
              .map((p, pi) => `<option value="${pi}">${p}</option>`)
              .join("")}
          </select>
        </td>
        <td>
          <div class="dollar-field">
            <span class="prefix">$</span>
            <input type="text" id="new-t-cost" placeholder="Cost">
          </div>
        </td>
        <td><button onclick="addTransaction()">Add</button></td>
      `;
  table.appendChild(addRow);
}
/**
 * Add a new transaction using values from the input fields.
 */
function addTransaction() {
  const nameInput = document.getElementById("new-t-name");
  const costInput = document.getElementById("new-t-cost");
  const payer = parseInt(document.getElementById("new-t-payer").value);
  const costVal = costInput.value.trim();
  if (!isValidDollar(costVal)) {
    costInput.classList.add("invalid-cell");
    return;
  }
  costInput.classList.remove("invalid-cell");
  const name = nameInput.value.trim();
  const cost = parseFloat(costVal);
  transactions.push({
    name,
    cost,
    payer,
    splits: Array(people.length).fill(0),
  });
  nameInput.value = "";
  costInput.value = "";
  renderTransactionTable();
  renderSplitTable();
  afterChange();
}

/**
 * Edit a transaction field.
 *
 * @param {number} i - Transaction index.
 * @param {"cost"|"payer"|"name"} field - Field to update.
 * @param {string} value - New value from the input element.
 * @param {HTMLInputElement|HTMLSelectElement} el - Element being edited.
 */
function editTransaction(i, field, value, el) {
  if (field === "cost") {
    if (!isValidDollar(value)) {
      el.classList.add("invalid-cell");
      return;
    }
    el.classList.remove("invalid-cell");
    transactions[i].cost = parseFloat(value);
    el.value = transactions[i].cost.toFixed(2);
  } else if (field === "payer") {
    transactions[i].payer = parseInt(value);
  } else if (field === "name") {
    transactions[i].name = value;
  }
  afterChange();
  renderSplitDetails();
}

/**
 * Delete a transaction at the given index.
 *
 * @param {number} i - Index of transaction to delete.
 */
function deleteTransaction(i) {
  transactions.splice(i, 1);
  renderTransactionTable();
  renderSplitTable();
  afterChange();
}

// ---- SPLITS ----

/**
 * Render the table showing split inputs for each transaction.
 */
function renderSplitTable() {
  const splitDiv = document.getElementById("split-table");
  splitDiv.innerHTML = "";
  if (transactions.length === 0 || people.length === 0) return;

  const table = document.createElement("table");
  let header = "<tr><th>Transaction</th>";
  people.forEach((p) => (header += `<th>${p}</th>`));
  header += "</tr>";
  table.innerHTML = header;

  transactions.forEach((t, ti) => {
    const row = document.createElement("tr");
    const tName = t.name || `Transaction ${ti + 1}`;
    let cells = `<td>${tName} - $${t.cost.toFixed(2)}</td>`;
    people.forEach((p, pi) => {
      const rawVal = t.splits[pi];
      const val = rawVal ? String(rawVal) : "";
      cells += `<td><input type="text" value="${val}"
                     onchange="editSplit(${ti},${pi},this.value,this)"></td>`;
    });
    row.innerHTML = cells;
    table.appendChild(row);
  });

  splitDiv.appendChild(table);
  renderSplitDetails();
}

/**
 * Edit an individual split value.
 *
 * @param {number} ti - Transaction index.
 * @param {number} pi - Person index.
 * @param {string} value - New value from the input element.
 * @param {HTMLInputElement} el - The input element being edited.
 */
function editSplit(ti, pi, value, el) {
  if (!isValidNumber(value, true)) {
    el.classList.add("invalid-cell");
    return;
  }
  el.classList.remove("invalid-cell");
  const num = value.trim() === "" ? 0 : parseFloat(value);
  transactions[ti].splits[pi] = num;
  el.value = num ? String(num) : "";
  renderSplitDetails();
  afterChange();
}

// ---- SPLIT DETAILS (3a) ----
/**
 * Render detailed amounts owed for each transaction and person.
 */
function renderSplitDetails() {
  const div = document.getElementById("split-details");
  div.innerHTML = "";
  if (transactions.length === 0 || people.length === 0) return;

  const table = document.createElement("table");
  const colSpan = people.length + 1;
  let header = `<tr><th colspan="${colSpan}" style="text-align: center;">Split Details</th></tr>`;
  header += "<tr><th>Transaction</th>";
  people.forEach((p) => (header += `<th>${p}</th>`));
  header += "</tr>";
  table.innerHTML = header;

  let totals = Array(people.length).fill(0);

  transactions.forEach((t, ti) => {
    const totalSplit = t.splits.reduce((a, b) => a + b, 0);
    const tName = t.name || `Transaction ${ti + 1}`;
    const row = document.createElement("tr");
    let cells = `<td>${tName} - $${t.cost.toFixed(2)}</td>`;
    people.forEach((p, pi) => {
      let portion = 0;
      if (totalSplit > 0) portion = (t.splits[pi] / totalSplit) * t.cost;
      totals[pi] += portion;
      cells += `<td>$${portion.toFixed(2)}</td>`;
    });
    row.innerHTML = cells;
    table.appendChild(row);
  });

  // totals row
  const totalRow = document.createElement("tr");
  let cells = "<td><b>Total</b></td>";
  totals.forEach((val) => (cells += `<td><b>$${val.toFixed(2)}</b></td>`));
  totalRow.innerHTML = cells;
  table.appendChild(totalRow);

  div.appendChild(table);
}

// ---- SUMMARY ----
/**
 * Render a summary table of totals paid, owed and net for each person.
 */
function calculateSummary() {
  const summaryEl = document.getElementById("summary");
  if (!summaryEl) return;
  const { paid, owes, nets } = computeSummary(people, transactions);
  const maxAbs = Math.max(...nets.map((n) => Math.abs(n)), 1);

  let html =
    "<table><tr><th>Person</th><th>Total Paid</th><th>Total Cost</th><th>Total Owed</th></tr>";
  let totalPaid = 0,
    totalOwes = 0,
    totalNet = 0;

  people.forEach((p, i) => {
    const net = nets[i];
    totalPaid += paid[i];
    totalOwes += owes[i];
    totalNet += net;

    const intensity = Math.abs(net) / maxAbs;
    let bg = "white";
    if (net > 0) bg = `rgba(0,255,0,${0.2 + 0.6 * intensity})`;
    else if (net < 0) bg = `rgba(255,0,0,${0.2 + 0.6 * intensity})`;

    const netStr =
      (net > 0 ? "+" : net < 0 ? "−" : "") + "$" + Math.abs(net).toFixed(2);
    html += `<tr>
          <td>${p}</td>
          <td>$${paid[i].toFixed(2)}</td>
          <td>$${owes[i].toFixed(2)}</td>
          <td style="background:${bg}">${netStr}</td>
        </tr>`;
  });

  html += `<tr><td><b>Total</b></td>
        <td><b>$${totalPaid.toFixed(2)}</b></td>
        <td><b>$${totalOwes.toFixed(2)}</b></td>
        <td><b>$${totalNet.toFixed(2)}</b></td></tr>`;
  html += "</table>";

  summaryEl.innerHTML = html;
}
/**
 * Clear all people and transactions from the current state.
 */
function resetState() {
  people.length = 0;
  transactions.length = 0;
  afterChange();
}

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

  // Validate people: array of non-empty strings
  if (
    !state.people.every((p) => typeof p === "string" && p.trim().length > 0)
  ) {
    throw new Error("Invalid state: people must be non-empty strings");
  }

  // Validate transactions: array of objects with expected fields
  const transactionsValid = state.transactions.every((t) => {
    return (
      t &&
      typeof t === "object" &&
      (typeof t.name === "undefined" || typeof t.name === "string") &&
      typeof t.payer === "number" &&
      Number.isInteger(t.payer) &&
      typeof t.cost === "number" &&
      isFinite(t.cost) &&
      Array.isArray(t.splits) &&
      t.splits.every((s) => typeof s === "number" && isFinite(s))
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
  const state = { people, transactions };
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
  const json = JSON.stringify({ people, transactions });
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
  state.people.forEach((p) => people.push(p));
  state.transactions.forEach((t) => transactions.push(t));

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

/**
 * Trigger a download of the current state as a JSON file.
 */
function downloadJson() {
  const state = { people, transactions };
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
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    computeSummary,
    resetState,
    addPerson,
    updateCurrentStateJson,
    updateShareableUrl,
    loadStateFromJson,
    loadStateFromJsonFile,
    loadStateFromUrl,
    _people: people,
    _transactions: transactions,
    downloadJson,
  };
}
if (typeof window !== "undefined") {
  window.computeSummary = computeSummary;
  window.addPerson = addPerson;
  window.deletePerson = deletePerson;
  window.renderPeople = renderPeople;
  window.renderTransactionTable = renderTransactionTable;
  window.addTransaction = addTransaction;
  window.editTransaction = editTransaction;
  window.deleteTransaction = deleteTransaction;
  window.renderSplitTable = renderSplitTable;
  window.editSplit = editSplit;
  window.renderSplitDetails = renderSplitDetails;
  window.calculateSummary = calculateSummary;
  window.updateCurrentStateJson = updateCurrentStateJson;
  window.loadStateFromJson = loadStateFromJson;
  window.loadStateFromJsonFile = loadStateFromJsonFile;
  window.downloadJson = downloadJson;
  window.updateShareableUrl = updateShareableUrl;
  window.loadStateFromUrl = loadStateFromUrl;
  loadStateFromUrl();
}
