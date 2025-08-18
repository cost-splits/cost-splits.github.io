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
const people = [];
const transactions = [];
let dirty = { people: false, transactions: false, splits: false };

function markDirty(section) {
  dirty[section] = true;
  if (section === "people") {
    const btn = document.getElementById("save-people");
    if (btn) btn.classList.add("unsaved");
  }
  if (section === "transactions") {
    const btn = document.getElementById("save-transactions");
    if (btn) btn.classList.add("unsaved");
  }
  if (section === "splits") {
    const btn = document.getElementById("save-splits");
    if (btn) btn.classList.add("unsaved");
  }
  if (section === "transactions" || section === "splits") {
    const calc = document.getElementById("calculate-summary");
    if (calc) calc.classList.add("unsaved");
  }
  updateCurrentStateJson();
}

function markSaved(section) {
  dirty[section] = false;
  if (section === "people") {
    const btn = document.getElementById("save-people");
    if (btn) btn.classList.remove("unsaved");
  }
  if (section === "transactions") {
    const btn = document.getElementById("save-transactions");
    if (btn) btn.classList.remove("unsaved");
  }
  if (section === "splits") {
    const btn = document.getElementById("save-splits");
    if (btn) btn.classList.remove("unsaved");
  }
  if (!dirty.transactions && !dirty.splits) {
    const calc = document.getElementById("calculate-summary");
    if (calc) calc.classList.remove("unsaved");
  }
  updateCurrentStateJson();
}

// ---- PEOPLE ----
function isValidPerson(person) {
  return person && typeof person.name === "string";
}

function addPerson() {
  const name = document.getElementById("person-name").value.trim();
  if (!name) return;
  people.push(name);
  document.getElementById("person-name").value = "";
  renderPeople();
  renderTransactionTable();
  renderSplitTable();
  markSaved("people");
}

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
  markDirty("transactions");
  markDirty("splits");
}

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
// Validate that each transaction has 'payer' (string), 'amount' (number), and 'splits' (array of valid splits)
function isValidTransaction(transaction) {
  return (
    transaction &&
    typeof transaction.payer === "string" &&
    typeof transaction.amount === "number" &&
    isFinite(transaction.amount) &&
    Array.isArray(transaction.splits) &&
    transaction.splits.every(isValidSplit)
  );
}

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
                     onchange="editTransaction(${i},'name',this.value)"></td>
          <td>
            <select onchange="editTransaction(${i},'payer',this.value)">
              ${people.map((p, pi) => `<option value="${pi}" ${pi === t.payer ? "selected" : ""}>${p}</option>`).join("")}
            </select>
          </td>
          <td><input type="number" step="0.01" value="${t.cost}"
                     onchange="editTransaction(${i},'cost',this.value)"></td>
          <td><button onclick="deleteTransaction(${i})">Delete</button></td>
        `;
    table.appendChild(row);
  });

  const addRow = document.createElement("tr");
  addRow.innerHTML = `
        <td><input type="text" id="new-t-name" placeholder="Name (optional)"></td>
        <td>
          <select id="new-t-payer">
            ${people.map((p, pi) => `<option value="${pi}">${p}</option>`).join("")}
          </select>
        </td>
        <td><input type="number" step="0.01" id="new-t-cost" placeholder="Cost"></td>
        <td><button onclick="addTransaction()">Add</button></td>
      `;
  table.appendChild(addRow);
}

function addTransaction() {
  const name = document.getElementById("new-t-name").value.trim();
  const cost = parseFloat(document.getElementById("new-t-cost").value);
  const payer = parseInt(document.getElementById("new-t-payer").value);
  if (isNaN(cost)) return;
  transactions.push({
    name,
    cost,
    payer,
    splits: Array(people.length).fill(0),
  });
  renderTransactionTable();
  renderSplitTable();
  markDirty("transactions");
}

function editTransaction(i, field, value) {
  if (field === "cost") transactions[i].cost = parseFloat(value) || 0;
  else if (field === "payer") transactions[i].payer = parseInt(value);
  else if (field === "name") transactions[i].name = value;
  markDirty("transactions");
}

function deleteTransaction(i) {
  transactions.splice(i, 1);
  renderTransactionTable();
  renderSplitTable();
  markDirty("transactions");
}

function saveTransactions() {
  markSaved("transactions");
}

// ---- SPLITS ----
// Validate that each split has 'person' (string) and 'share' (number)
function isValidSplit(split) {
  return (
    split &&
    typeof split.person === "string" &&
    typeof split.share === "number" &&
    isFinite(split.share)
  );
}

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
      const val = t.splits[pi] || "";
      cells += `<td><input type="number" step="0.01" value="${val}" 
                     onchange="editSplit(${ti},${pi},this.value)"></td>`;
    });
    row.innerHTML = cells;
    table.appendChild(row);
  });

  splitDiv.appendChild(table);
  renderSplitDetails();
}

function editSplit(ti, pi, value) {
  transactions[ti].splits[pi] = parseFloat(value) || 0;
  markDirty("splits");
}

function saveAllSplits() {
  markSaved("splits");
  renderSplitDetails();
}

// ---- SPLIT DETAILS (3a) ----
function renderSplitDetails() {
  const div = document.getElementById("split-details");
  div.innerHTML = "";
  if (transactions.length === 0 || people.length === 0) return;

  const table = document.createElement("table");
  let header = "<tr><th>Transaction</th>";
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

function toggleCollapse(el) {
  const content = el.nextElementSibling;
  content.style.display = content.style.display === "block" ? "none" : "block";
}

// ---- SUMMARY ----
function calculateSummary() {
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

  document.getElementById("summary").innerHTML = html;

  markSaved("transactions");
  markSaved("splits");
}
function resetState() {
  people.length = 0;
  transactions.length = 0;
  dirty = { people: false, transactions: false, splits: false };
  updateCurrentStateJson();
}

// ---- SAVE/LOAD STATE ----
// Validate the structure and types of the loaded state
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

function updateCurrentStateJson() {
  const display = document.getElementById("state-json-display");
  const state = { people, transactions };
  if (display) display.value = JSON.stringify(state);
}

function loadStateFromJson() {
  const textarea = document.getElementById("state-json-input");
  try {
    const state = JSON.parse(textarea.value);
    validateState(state);
    people.length = 0;
    transactions.length = 0;
    state.people.forEach((p) => people.push(p));
    state.transactions.forEach((t) => transactions.push(t));

    if (typeof renderPeople === "function" && document.getElementById("people-list")) {
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

    markSaved("people");
    markSaved("transactions");
    markSaved("splits");
    updateCurrentStateJson();
  } catch (e) {
    if (typeof alert === "function") {
      alert("Failed to load state: " + (e && e.message ? e.message : e));
    }
  }
}

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
      markDirty,
      markSaved,
      toggleCollapse,
      resetState,
      updateCurrentStateJson,
      loadStateFromJson,
      _people: people,
      _transactions: transactions,
    };
  }
if (typeof window !== "undefined") {
  window.computeSummary = computeSummary;
  window.markDirty = markDirty;
  window.markSaved = markSaved;
  window.addPerson = addPerson;
  window.deletePerson = deletePerson;
  window.renderPeople = renderPeople;
  window.renderTransactionTable = renderTransactionTable;
  window.addTransaction = addTransaction;
  window.editTransaction = editTransaction;
  window.deleteTransaction = deleteTransaction;
  window.saveTransactions = saveTransactions;
  window.renderSplitTable = renderSplitTable;
  window.editSplit = editSplit;
  window.saveAllSplits = saveAllSplits;
  window.renderSplitDetails = renderSplitDetails;
  window.toggleCollapse = toggleCollapse;
  window.calculateSummary = calculateSummary;
  window.updateCurrentStateJson = updateCurrentStateJson;
  window.loadStateFromJson = loadStateFromJson;
  window.downloadJson = downloadJson;
}
