import {
  people,
  transactions,
  collapsedSplit,
  collapsedDetails,
  afterChange,
  isValidDollar,
  isValidNumber,
  computeSummary,
  computeSettlements,
  pool,
  getTransactionsPaidBy,
  getTransactionsInvolving,
  getSettlementsFor,
  getShareForTransaction,
} from "./state.js";
import {
  loadPoolFromLocalStorage,
  deletePoolFromLocalStorage,
  LOCAL_STORAGE_KEY,
  hasUnsavedChanges,
} from "./share.js";

const COST_FORMAT_MSG =
  "Cost must be digits with optional decimal point and up to two decimals (e.g., 12 or 3.50).";
const NUMBER_FORMAT_MSG =
  "Number must be digits with optional decimals (e.g., 3 or 0.75).";

/**
 * Display an error indicator next to an invalid field.
 *
 * @param {HTMLElement} el - Element to mark as invalid.
 * @param {string} message - Message describing the error.
 */
function showError(el, message) {
  el.classList.add("invalid-cell");
  let error = el.nextElementSibling;
  if (!error || !error.classList.contains("error")) {
    error = document.createElement("span");
    error.className = "error";
    error.textContent = "❗";
    el.insertAdjacentElement("afterend", error);
  }
  error.setAttribute("data-error", message);
  error.setAttribute("aria-label", message);
  error.setAttribute("role", "alert");
  error.setAttribute("tabindex", "0");
  el.addEventListener(
    "input",
    () => {
      clearError(el);
    },
    { once: true },
  );
}

/**
 * Remove error indicator from a field if present.
 *
 * @param {HTMLElement} el - Element to clear of errors.
 */
function clearError(el) {
  el.classList.remove("invalid-cell");
  const error = el.nextElementSibling;
  if (error && error.classList.contains("error")) {
    error.remove();
  }
}

/**
 * Determine zebra stripe class for table rows.
 *
 * @param {number} index - Zero-based index of a non-sub row.
 * @returns {string} CSS class name representing the stripe color.
 */
function rowClass(index) {
  return index % 2 === 0 ? "row-even" : "row-odd";
}

// ---- SAVED POOLS ----

/**
 * Render a table of saved pools with load/delete actions and active highlight.
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
    deleteBtn.classList.add("danger-btn");
    actionsCell.appendChild(deleteBtn);
    row.appendChild(actionsCell);

    if (name === pool) {
      row.classList.add("active-pool");
    }
    row.addEventListener("click", () => {
      if (
        hasUnsavedChanges() &&
        !confirm("You have unsaved changes. Continue?")
      ) {
        return;
      }
      loadPoolFromLocalStorage(name);
      renderSavedPoolsTable();
    });
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
}

// ---- PEOPLE ----

/**
 * Add a new person from the name input field.
 */
function addPerson() {
  const input = document.getElementById("person-name");
  const name = input.value.trim();
  if (!name || people.includes(name)) {
    showError(input, "Name must be unique and non-empty.");
    return;
  }
  clearError(input);
  people.push(name);
  transactions.forEach((t) => {
    t.splits.push(0);
    if (Array.isArray(t.items)) {
      t.items.forEach((it) => it.splits.push(0));
    }
  });
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
    (t) =>
      t.payer === index ||
      (t.splits[index] && t.splits[index] > 0) ||
      (Array.isArray(t.items) &&
        t.items.some((it) => it.splits[index] && it.splits[index] > 0)),
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
      const t = transactions[i];
      const hasItemSplit =
        Array.isArray(t.items) && t.items.some((it) => it.splits[index] > 0);
      if (t.payer === index || t.splits[index] > 0 || hasItemSplit) {
        transactions.splice(i, 1);
      }
    }
  }
  people.splice(index, 1);
  transactions.forEach((t) => {
    t.splits.splice(index, 1);
    if (Array.isArray(t.items)) {
      t.items.forEach((it) => it.splits.splice(index, 1));
    }
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
 * Rename an existing person.
 *
 * @param {number} index - Index of the person to rename.
 * @param {string} newName - Proposed new name.
 * @returns {boolean} True if rename succeeds.
 */
function renamePerson(index, newName) {
  const name = newName.trim();
  const oldName = people[index];
  if (name === oldName) {
    return true;
  }
  if (!name || people.includes(name)) {
    return false;
  }
  people[index] = name;
  renderPeople();
  renderTransactionTable();
  renderSplitTable();
  afterChange();
  return true;
}

/**
 * Render the list of people with editable names and delete controls.
 */
function renderPeople() {
  const list = document.getElementById("people-list");
  list.innerHTML = "";
  people.forEach((p, i) => {
    const li = document.createElement("li");
    li.classList.add("person-bubble");
    const input = document.createElement("input");
    input.value = p;
    input.size = Math.max(p.length, 1);
    input.addEventListener("input", () => {
      clearError(input);
      input.size = Math.max(input.value.length, 1);
    });
    input.onblur = () => {
      if (!renamePerson(i, input.value)) {
        showError(input, "Name must be unique and non-empty.");
      } else {
        clearError(input);
      }
    };
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        input.blur();
      }
    };
    li.appendChild(input);
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
 * Create table header row for transaction table.
 *
 * @returns {HTMLTableRowElement} Header row element.
 */
function createTransactionHeaderRow() {
  const header = document.createElement("tr");
  ["Name", "Paid By", "Cost", "Action"].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    header.appendChild(th);
  });
  return header;
}

/**
 * Create a table row for a transaction.
 *
 * @param {object} t - Transaction data.
 * @param {number} i - Index of the transaction.
 * @returns {HTMLTableRowElement} Row element representing the transaction.
 */
function createTransactionRow(t, i) {
  const row = document.createElement("tr");

  const nameCell = document.createElement("td");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = t.name || "";
  nameInput.placeholder = `Transaction ${i + 1}`;
  nameInput.id = `transaction-name-${i}`;
  nameInput.setAttribute("aria-label", `Transaction ${i + 1} name`);
  nameInput.addEventListener("change", (e) =>
    editTransaction(i, "name", e.target.value, e.target),
  );
  nameCell.appendChild(nameInput);
  row.appendChild(nameCell);

  const payerCell = document.createElement("td");
  const payerSelect = document.createElement("select");
  payerSelect.id = `transaction-payer-${i}`;
  payerSelect.setAttribute("aria-label", `Transaction ${i + 1} payer`);
  people.forEach((p, pi) => {
    const opt = document.createElement("option");
    opt.value = String(pi);
    opt.textContent = p;
    if (pi === t.payer) opt.selected = true;
    payerSelect.appendChild(opt);
  });
  payerSelect.addEventListener("change", (e) =>
    editTransaction(i, "payer", e.target.value, e.target),
  );
  payerCell.appendChild(payerSelect);
  row.appendChild(payerCell);

  const costCell = document.createElement("td");
  const costWrapper = document.createElement("div");
  costWrapper.className = "dollar-field";
  const prefix = document.createElement("span");
  prefix.className = "prefix";
  prefix.textContent = "$";
  const costInput = document.createElement("input");
  costInput.type = "text";
  costInput.value = t.cost.toFixed(2);
  costInput.id = `transaction-cost-${i}`;
  costInput.setAttribute("aria-label", `Transaction ${i + 1} cost`);
  costInput.addEventListener("change", (e) =>
    editTransaction(i, "cost", e.target.value, e.target),
  );
  costWrapper.appendChild(prefix);
  costWrapper.appendChild(costInput);
  costCell.appendChild(costWrapper);
  row.appendChild(costCell);

  const actionCell = document.createElement("td");
  const delBtn = document.createElement("button");
  delBtn.textContent = "Delete";
  delBtn.addEventListener("click", () => deleteTransaction(i));
  delBtn.classList.add("danger-btn");
  actionCell.appendChild(delBtn);
  row.appendChild(actionCell);

  return row;
}

/**
 * Create the input row for adding a transaction.
 *
 * @returns {HTMLTableRowElement} Row element for adding a transaction.
 */
function createAddTransactionRow() {
  const addRow = document.createElement("tr");

  const addNameCell = document.createElement("td");
  const addNameInput = document.createElement("input");
  addNameInput.type = "text";
  addNameInput.id = "new-t-name";
  addNameInput.placeholder = `Transaction ${transactions.length + 1}`;
  addNameInput.setAttribute("aria-label", "New transaction name");
  addNameCell.appendChild(addNameInput);
  addRow.appendChild(addNameCell);

  const addPayerCell = document.createElement("td");
  const addPayerSelect = document.createElement("select");
  addPayerSelect.id = "new-t-payer";
  addPayerSelect.setAttribute("aria-label", "New transaction payer");
  people.forEach((p, pi) => {
    const opt = document.createElement("option");
    opt.value = String(pi);
    opt.textContent = p;
    addPayerSelect.appendChild(opt);
  });
  addPayerCell.appendChild(addPayerSelect);
  addRow.appendChild(addPayerCell);

  const addCostCell = document.createElement("td");
  const addCostWrapper = document.createElement("div");
  addCostWrapper.className = "dollar-field";
  const addPrefix = document.createElement("span");
  addPrefix.className = "prefix";
  addPrefix.textContent = "$";
  const addCostInput = document.createElement("input");
  addCostInput.type = "text";
  addCostInput.id = "new-t-cost";
  addCostInput.placeholder = "Cost";
  addCostInput.setAttribute("aria-label", "New transaction cost");
  addCostInput.oninput = () => clearError(addCostInput);
  addCostWrapper.appendChild(addPrefix);
  addCostWrapper.appendChild(addCostInput);
  addCostCell.appendChild(addCostWrapper);
  addRow.appendChild(addCostCell);

  const addActionCell = document.createElement("td");
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add";
  addBtn.addEventListener("click", addTransaction);
  addActionCell.appendChild(addBtn);
  addRow.appendChild(addActionCell);

  return addRow;
}

/**
 * Render the transaction table with all existing transactions and input row.
 */
function renderTransactionTable() {
  const transactionDiv = document.getElementById("transaction-table");
  transactionDiv.innerHTML = "";

  if (people.length === 0) {
    transactionDiv.textContent = "Add people before adding transactions.";
    return;
  }
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  thead.appendChild(createTransactionHeaderRow());
  transactions.forEach((t, i) => tbody.appendChild(createTransactionRow(t, i)));
  tbody.appendChild(createAddTransactionRow());

  table.appendChild(thead);
  table.appendChild(tbody);
  transactionDiv.appendChild(table);
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
    showError(costInput, COST_FORMAT_MSG);
    return;
  }
  clearError(costInput);
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
      showError(el, COST_FORMAT_MSG);
      return;
    }
    clearError(el);
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
  if (people.length === 0) {
    splitDiv.textContent = "Add people to begin splitting costs.";
    renderSplitDetails();
    return;
  }
  if (transactions.length === 0) {
    splitDiv.textContent = "No transactions yet.";
    renderSplitDetails();
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  let header = "<tr><th>Name</th><th>Cost</th>";
  people.forEach((p) => (header += `<th>${p}</th>`));
  header += "<th>Action</th></tr>";
  thead.innerHTML = header;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  let rowIdx = 0;
  transactions.forEach((t, ti) => {
    const hasItems = Array.isArray(t.items);
    const collapsed = collapsedSplit.has(ti);
    const row = document.createElement("tr");
    const stripe = rowClass(rowIdx);
    row.classList.add(stripe);
    if (hasItems) row.classList.add("unused-row");
    const tName = t.name || `Transaction ${ti + 1}`;
    const arrow = hasItems ? (collapsed ? "▸" : "▾") : "";
    let cells = `<td ${arrow ? `data-action="toggleSplitItems" data-ti="${ti}"` : ""
      }>${arrow ? `<span class="collapse-btn">${arrow}</span>` : ""}${tName}</td>`;
    cells += `<td>$${t.cost.toFixed(2)}</td>`;
    people.forEach((p, pi) => {
      const rawVal = t.splits[pi];
      const val = rawVal ? String(rawVal) : "";
      const disabled = hasItems ? "disabled" : "";
      const splitId = `split-${ti}-${pi}`;
      const ariaLabel = `Split for ${p} in ${tName}`;
      cells += `<td><input id="${splitId}" type="text" value="${val}" ${disabled} data-action="editSplit" data-ti="${ti}" data-pi="${pi}" aria-label="${ariaLabel}"></td>`;
    });
    if (hasItems) {
      cells += `<td><button data-action="unitemizeTransaction" data-ti="${ti}">Normal</button><button data-action="addItem" data-ti="${ti}">Add Item</button></td>`;
    } else {
      cells += `<td><button data-action="itemizeTransaction" data-ti="${ti}">Itemize</button></td>`;
    }
    row.innerHTML = cells;
    tbody.appendChild(row);

    if (hasItems && !collapsed) {
      t.items.forEach((it, ii) => {
        const iRow = document.createElement("tr");
        iRow.classList.add("sub-row", stripe);
        const itemNameId = `item-name-${ti}-${ii}`;
        let cell = `<td class="indent-cell"><input id="${itemNameId}" type="text" value="${it.item || ""}" placeholder="Item ${ii + 1}" data-action="editItem" data-ti="${ti}" data-ii="${ii}" data-field="item" aria-label="Item ${ii + 1} name for ${tName}"></td>`;
        const itemCostId = `item-cost-${ti}-${ii}`;
        cell += `<td><div class="dollar-field"><span class="prefix">$</span><input id="${itemCostId}" type="text" value="${it.cost.toFixed(2)}" data-action="editItem" data-ti="${ti}" data-ii="${ii}" data-field="cost" aria-label="Item ${ii + 1} cost for ${tName}"></div></td>`;
        people.forEach((p, pi) => {
          const raw = it.splits[pi];
          const val2 = raw ? String(raw) : "";
          const splitId = `item-split-${ti}-${ii}-${pi}`;
          const aria = `Split for ${p} in item ${ii + 1} of ${tName}`;
          cell += `<td><input id="${splitId}" type="text" value="${val2}" data-action="editItemSplit" data-ti="${ti}" data-ii="${ii}" data-pi="${pi}" aria-label="${aria}"></td>`;
        });
        cell += `<td><button class="danger-btn" data-action="deleteItem" data-ti="${ti}" data-ii="${ii}">Delete</button></td>`;
        iRow.innerHTML = cell;
        tbody.appendChild(iRow);
      });
    }
    rowIdx += 1;
  });

  table.onchange = (e) => {
    const t = e.target;
    switch (t.dataset.action) {
      case "editSplit":
        editSplit(parseInt(t.dataset.ti), parseInt(t.dataset.pi), t.value, t);
        break;
      case "editItem":
        editItem(
          parseInt(t.dataset.ti),
          parseInt(t.dataset.ii),
          t.dataset.field,
          t.value,
          t,
        );
        break;
      case "editItemSplit":
        editItemSplit(
          parseInt(t.dataset.ti),
          parseInt(t.dataset.ii),
          parseInt(t.dataset.pi),
          t.value,
          t,
        );
        break;
      default:
        break;
    }
  };

  table.onclick = (e) => {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    const ti = parseInt(t.dataset.ti);
    switch (t.dataset.action) {
      case "toggleSplitItems":
        toggleSplitItems(ti);
        break;
      case "unitemizeTransaction":
        unitemizeTransaction(ti);
        break;
      case "addItem":
        addItem(ti);
        break;
      case "itemizeTransaction":
        itemizeTransaction(ti);
        break;
      case "deleteItem":
        deleteItem(ti, parseInt(t.dataset.ii));
        break;
      default:
        break;
    }
  };

  table.appendChild(tbody);
  splitDiv.appendChild(table);
  renderSplitDetails();
}

/**
 * Edit a split value for a transaction.
 *
 * @param {number} ti - Transaction index.
 * @param {number} pi - Person index.
 * @param {string} value - New split value from input.
 * @param {HTMLInputElement} el - Element being edited.
 */
function editSplit(ti, pi, value, el) {
  if (!isValidNumber(value, true)) {
    showError(el, NUMBER_FORMAT_MSG);
    return;
  }
  clearError(el);
  transactions[ti].splits[pi] = value ? parseFloat(value) : 0;
  el.value = value;
  afterChange();
  renderSplitDetails();
}

/**
 * Convert a transaction to itemized mode.
 *
 * @param {number} ti - Transaction index.
 */
function itemizeTransaction(ti) {
  const t = transactions[ti];
  t.items = [
    {
      item: "",
      cost: t.cost,
      splits: t.splits.slice(),
    },
  ];
  renderSplitTable();
  afterChange();
}

/**
 * Convert an itemized transaction back to normal.
 *
 * @param {number} ti - Transaction index.
 */
function unitemizeTransaction(ti) {
  delete transactions[ti].items;
  renderSplitTable();
  afterChange();
}

/**
 * Add a new item row to an itemized transaction.
 *
 * @param {number} ti - Transaction index.
 */
function addItem(ti) {
  const t = transactions[ti];
  if (!Array.isArray(t.items)) t.items = [];
  t.items.push({ item: "", cost: 0, splits: Array(people.length).fill(0) });
  renderSplitTable();
  afterChange();
}

/**
 * Delete an item from an itemized transaction.
 *
 * @param {number} ti - Transaction index.
 * @param {number} ii - Item index.
 */
function deleteItem(ti, ii) {
  transactions[ti].items.splice(ii, 1);
  if (transactions[ti].items.length === 0) {
    delete transactions[ti].items;
  }
  renderSplitTable();
  afterChange();
}

/**
 * Edit a field of an item within an itemized transaction.
 *
 * @param {number} ti - Transaction index.
 * @param {number} ii - Item index.
 * @param {"cost"|"item"} field - Field being edited.
 * @param {string} value - New value from input.
 * @param {HTMLInputElement} [el] - Element being edited.
 */
function editItem(ti, ii, field, value, el) {
  const item = transactions[ti].items[ii];
  if (field === "cost") {
    if (!isValidDollar(value)) {
      showError(el, COST_FORMAT_MSG);
      return;
    }
    clearError(el);
    item.cost = parseFloat(value);
    el.value = item.cost.toFixed(2);
  } else if (field === "item") {
    item.item = value;
  }
  afterChange();
  renderSplitDetails();
}

/**
 * Edit the split value for an item within an itemized transaction.
 *
 * @param {number} ti - Transaction index.
 * @param {number} ii - Item index.
 * @param {number} pi - Person index.
 * @param {string} value - New value from input.
 * @param {HTMLInputElement} el - Element being edited.
 */
function editItemSplit(ti, ii, pi, value, el) {
  if (!isValidNumber(value, true)) {
    showError(el, NUMBER_FORMAT_MSG);
    return;
  }
  clearError(el);
  transactions[ti].items[ii].splits[pi] = value ? parseFloat(value) : 0;
  afterChange();
  renderSplitDetails();
}

/**
 * Toggle visibility of item rows in the split table for a transaction.
 *
 * @param {number} ti - Transaction index.
 */
function toggleSplitItems(ti) {
  if (collapsedSplit.has(ti)) collapsedSplit.delete(ti);
  else collapsedSplit.add(ti);
  renderSplitTable();
}

/**
 * Toggle visibility of item rows in the split details table for a transaction.
 *
 * @param {number} ti - Transaction index.
 */
function toggleDetailItems(ti) {
  if (collapsedDetails.has(ti)) collapsedDetails.delete(ti);
  else collapsedDetails.add(ti);
  renderSplitDetails();
}

/**
 * Render a breakdown of each transaction showing how costs are split.
 */
function renderSplitDetails() {
  const div = document.getElementById("split-details");
  div.innerHTML = "";
  if (people.length === 0) {
    return;
  }
  if (transactions.length === 0) {
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const colSpan = people.length + 1;
  let header = `<tr><th colspan="${colSpan}" class="text-center">Split Details</th></tr>`;
  header += "<tr><th>Transaction</th>";
  people.forEach((p) => (header += `<th>${p}</th>`));
  header += "</tr>";
  thead.innerHTML = header;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  let totals = Array(people.length).fill(0);
  let rowIdx = 0;

  transactions.forEach((t, ti) => {
    const hasItems = Array.isArray(t.items) && t.items.length > 0;
    const collapsed = collapsedDetails.has(ti);
    const tName = t.name || `Transaction ${ti + 1}`;
    const row = document.createElement("tr");
    const stripe = rowClass(rowIdx);
    row.classList.add(stripe);
    const arrow = hasItems ? (collapsed ? "▸" : "▾") : "";
    let cells = `<td ${arrow ? `data-action="toggleDetailItems" data-ti="${ti}"` : ""
      }>${arrow ? `<span class="collapse-btn">${arrow}</span>` : ""}${tName} - $${t.cost.toFixed(2)}</td>`;
    const personTotals = Array(people.length).fill(0);
    if (hasItems) {
      const itemsTotal = t.items.reduce((sum, it) => sum + it.cost, 0);
      const scale = itemsTotal > 0 ? t.cost / itemsTotal : 0;
      t.items.forEach((it) => {
        const eff = it.cost * scale;
        const splitSum = it.splits.reduce((a, b) => a + b, 0);
        if (splitSum > 0) {
          it.splits.forEach((s, i) => {
            personTotals[i] += (s / splitSum) * eff;
          });
        }
      });
    } else {
      const splitSum = t.splits.reduce((a, b) => a + b, 0);
      if (splitSum > 0) {
        t.splits.forEach((s, i) => {
          personTotals[i] += (s / splitSum) * t.cost;
        });
      }
    }
    personTotals.forEach((portion, pi) => {
      totals[pi] += portion;
      cells += `<td>$${portion.toFixed(2)}</td>`;
    });
    row.innerHTML = cells;
    tbody.appendChild(row);

    if (hasItems && !collapsed) {
      const itemsTotal = t.items.reduce((sum, it) => sum + it.cost, 0);
      const scale = itemsTotal > 0 ? t.cost / itemsTotal : 0;
      t.items.forEach((it, ii) => {
        const iRow = document.createElement("tr");
        iRow.classList.add("sub-row", stripe);
        const itemName = it.item || `Item ${ii + 1}`;
        let rowCells = `<td class="indent-cell">${itemName} - $${(it.cost * scale).toFixed(2)}</td>`;
        const splitSum = it.splits.reduce((a, b) => a + b, 0);
        people.forEach((p, pi) => {
          let portion = 0;
          if (splitSum > 0)
            portion = (it.splits[pi] / splitSum) * it.cost * scale;
          rowCells += `<td>$${portion.toFixed(2)}</td>`;
        });
        iRow.innerHTML = rowCells;
        tbody.appendChild(iRow);
      });
    }
    rowIdx += 1;
  });

  // totals row
  const totalRow = document.createElement("tr");
  totalRow.classList.add(rowClass(rowIdx));
  let cells = "<td><b>Total</b></td>";
  totals.forEach((val) => (cells += `<td><b>$${val.toFixed(2)}</b></td>`));
  totalRow.innerHTML = cells;
  tbody.appendChild(totalRow);

  table.onclick = (e) => {
    const target = e.target.closest("[data-action]");
    if (target && target.dataset.action === "toggleDetailItems") {
      toggleDetailItems(parseInt(target.dataset.ti));
    }
  };

  table.appendChild(tbody);
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
  const settlements = computeSettlements(people, transactions);
  const maxAbs = Math.max(...nets.map((n) => Math.abs(n)), 1);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Person", "Total Paid", "Total Cost", "Total Owed"].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let totalPaid = 0,
    totalOwes = 0,
    totalNet = 0;

  people.forEach((p, i) => {
    const net = nets[i];
    totalPaid += paid[i];
    totalOwes += owes[i];
    totalNet += net;

    const intensity = Math.abs(net) / maxAbs;
    let background = "";
    if (net > 0) {
      background = `rgba(0,255,0,${0.2 + 0.6 * intensity})`;
    } else if (net < 0) {
      background = `rgba(255,0,0,${0.2 + 0.6 * intensity})`;
    }

    const row = document.createElement("tr");
    const personCell = document.createElement("td");
    personCell.textContent = p;
    personCell.classList.add("person-link");
    personCell.addEventListener("click", () => showPersonSummary(i));
    row.appendChild(personCell);

    const paidCell = document.createElement("td");
    paidCell.textContent = `$${paid[i].toFixed(2)}`;
    row.appendChild(paidCell);

    const owesCell = document.createElement("td");
    owesCell.textContent = `$${owes[i].toFixed(2)}`;
    row.appendChild(owesCell);

    const netCell = document.createElement("td");
    netCell.textContent =
      (net > 0 ? "+" : net < 0 ? "−" : "") + "$" + Math.abs(net).toFixed(2);
    if (background) netCell.style.background = background;
    row.appendChild(netCell);

    tbody.appendChild(row);
  });

  const totalRow = document.createElement("tr");
  totalRow.classList.add("total-row");
  totalRow.innerHTML = `<td><b>Total</b></td>
        <td><b>$${totalPaid.toFixed(2)}</b></td>
        <td><b>$${totalOwes.toFixed(2)}</b></td>
        <td><b>${(totalNet > 0
      ? "+"
      : totalNet < 0 || Object.is(totalNet, -0)
        ? "−"
        : "") +
    "$" +
    Math.abs(totalNet).toFixed(2)
    }</b></td>`;
  tbody.appendChild(totalRow);

  table.appendChild(tbody);

  summaryEl.innerHTML = "";
  summaryEl.appendChild(table);

  if (settlements.length > 0) {
    const h3 = document.createElement("h3");
    h3.textContent = "Suggested Settlements";
    summaryEl.appendChild(h3);
    const ul = document.createElement("ul");
    settlements.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = `${people[s.from]} pays ${people[s.to]} $${s.amount.toFixed(
        2,
      )}`;
      ul.appendChild(li);
    });
    summaryEl.appendChild(ul);
  }
}

/**
 * Remove highlight classes from transaction and split sections.
 *
 * @returns {void}
 */
function clearPersonHighlights() {
  document
    .querySelectorAll("#transaction-table tbody tr.person-highlight")
    .forEach((r) => r.classList.remove("person-highlight"));
  document
    .querySelectorAll("#split-table td.person-highlight")
    .forEach((c) => c.classList.remove("person-highlight"));
  document
    .querySelectorAll("#split-details td.person-highlight")
    .forEach((c) => c.classList.remove("person-highlight"));
}

/**
 * Show detailed information for a single person below the summary.
 *
 * Appends a person-specific view after the global summary table along with a
 * Close button to remove it. Any previously displayed person view is replaced
 * with the new selection.
 *
 * @param {number} index - Index of the person in the {@link people} array.
 * @returns {void}
 */
function showPersonSummary(index) {
  const summaryEl = document.getElementById("summary");
  if (!summaryEl) return;

  const existing = document.getElementById("person-summary");
  if (existing) existing.remove();
  const existingSep = document.getElementById("person-summary-separator");
  if (existingSep) existingSep.remove();

  summaryEl
    .querySelectorAll("tbody tr")
    .forEach((r) => r.classList.remove("person-highlight"));
  clearPersonHighlights();

  const container = document.createElement("div");
  container.id = "person-summary";

  const heading = document.createElement("h3");
  heading.style.display = "flex";
  heading.style.justifyContent = "space-between";
  heading.style.alignItems = "center";
  heading.textContent = `${people[index]}'s summary`;
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => {
    container.remove();
    const sep = document.getElementById("person-summary-separator");
    if (sep) sep.remove();
    summaryEl
      .querySelectorAll("tbody tr")
      .forEach((r) => r.classList.remove("person-highlight"));
    clearPersonHighlights();
  });
  heading.appendChild(closeBtn);
  container.appendChild(heading);

  container.appendChild(renderPersonView(index));

  const separator = document.createElement("hr");
  separator.id = "person-summary-separator";
  summaryEl.appendChild(separator);
  summaryEl.appendChild(container);

  const rows = summaryEl.querySelectorAll("tbody tr");
  if (rows[index]) {
    rows[index].classList.add("person-highlight");
  }

  const txRows = document.querySelectorAll("#transaction-table tbody tr");
  txRows.forEach((row, ti) => {
    if (ti >= transactions.length) return;
    const t = transactions[ti];
    if (t.payer === index) row.classList.add("person-highlight");
  });

  document
    .querySelectorAll(`#split-table input[data-pi="${index}"]`)
    .forEach((input) => {
      const td = input.parentElement;
      const val = parseFloat(input.value);
      if (td && val > 0) td.classList.add("person-highlight");
    });

  const detailBody = document.querySelector("#split-details tbody");
  if (detailBody) {
    detailBody.querySelectorAll("tr").forEach((row) => {
      const cell = row.children[index + 1];
      if (cell) {
        const num = parseFloat(cell.textContent.replace(/[^0-9.-]+/g, ""));
        if (num > 0) cell.classList.add("person-highlight");
      }
    });
  }
}

/**
 * Build a simple table listing transactions.
 *
 * @param {typeof transactions} txns - Transactions to display.
 * @param {number} [personIndex] - Person index to show individual shares for.
 * @param {number} [highlightIndex] - Person index whose payer cells should be highlighted.
 * @returns {HTMLTableElement} Table element with transaction details and a total row.
 */
function buildTransactionsTable(txns, personIndex, highlightIndex) {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const costHeader = typeof personIndex === "number" ? "Share" : "Cost";
  ["Name", "Paid By", costHeader].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let total = 0;
  txns.forEach((t) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = t.name || "";
    row.appendChild(nameCell);

    const payerCell = document.createElement("td");
    payerCell.textContent = people[t.payer] || "";
    if (typeof highlightIndex === "number" && t.payer === highlightIndex) {
      payerCell.classList.add("person-highlight");
    }
    row.appendChild(payerCell);

    const costCell = document.createElement("td");
    let cost = t.cost;
    if (typeof personIndex === "number") {
      cost = getShareForTransaction(t, personIndex);
      costCell.classList.add("person-highlight");
    }
    costCell.textContent = `$${cost.toFixed(2)}`;
    row.appendChild(costCell);
    total += cost;

    tbody.appendChild(row);
  });

  const totalRow = document.createElement("tr");
  totalRow.classList.add("total-row");
  totalRow.innerHTML =
    "<td><b>Total</b></td><td></td><td><b>$" + total.toFixed(2) + "</b></td>";
  tbody.appendChild(totalRow);

  table.appendChild(tbody);
  return table;
}

/**
 * Build a table describing settlement transfers.
 *
 * @param {Array<{from:number,to:number,amount:number}>} settlements - Suggested settlements.
 * @param {number} [personIndex] - Person index to highlight within the table.
 * @returns {HTMLTableElement} Table element with settlement details and a total row.
 */
function buildSettlementTable(settlements, personIndex) {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["From", "To", "Amount"].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let total = 0;
  settlements.forEach((s) => {
    const row = document.createElement("tr");

    const fromCell = document.createElement("td");
    fromCell.textContent = people[s.from] || "";
    if (typeof personIndex === "number" && s.from === personIndex) {
      fromCell.classList.add("settlement-person");
    }
    row.appendChild(fromCell);

    const toCell = document.createElement("td");
    toCell.textContent = people[s.to] || "";
    if (typeof personIndex === "number" && s.to === personIndex) {
      toCell.classList.add("settlement-person");
    }
    row.appendChild(toCell);

    const amountCell = document.createElement("td");
    amountCell.textContent = `$${s.amount.toFixed(2)}`;
    row.appendChild(amountCell);
    total += s.amount;

    tbody.appendChild(row);
  });

  const totalRow = document.createElement("tr");
  totalRow.classList.add("total-row");
  totalRow.innerHTML =
    "<td><b>Total</b></td><td></td><td><b>$" + total.toFixed(2) + "</b></td>";
  tbody.appendChild(totalRow);

  table.appendChild(tbody);
  return table;
}

/**
 * Create a titled section wrapping a table with project styling.
 *
 * @param {string} title - Section heading.
 * @param {HTMLTableElement} table - Table to include in the section.
 * @returns {HTMLElement} Section element containing the titled table.
 */
function buildTableSection(title, table) {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.appendChild(heading);
  const wrapper = document.createElement("div");
  wrapper.className = "table-container";
  wrapper.appendChild(table);
  section.appendChild(wrapper);
  return section;
}

/**
 * Render a view of transactions and settlements for a specific person.
 *
 * Builds sections showing transactions they paid, all transactions they
 * participated in with their individual share, and settlement suggestions
 * involving them.
 *
 * @param {number} index - Index of the person in the {@link people} array.
 * @returns {HTMLElement} Container element with the person's view.
 */
function renderPersonView(index) {
  const container = document.createElement("div");
  const name = people[index] || "";

  const paidTx = getTransactionsPaidBy(index);
  if (paidTx.length > 0) {
    container.appendChild(
      buildTableSection(
        "Paid Transactions",
        buildTransactionsTable(paidTx, undefined, index),
      ),
    );
  } else {
    const p = document.createElement("p");
    p.textContent = `${name} didn't pay for any transactions.`;
    container.appendChild(p);
  }

  const sharedTx = getTransactionsInvolving(index);
  if (sharedTx.length > 0) {
    container.appendChild(
      buildTableSection(
        "Shared Splits",
        buildTransactionsTable(sharedTx, index, index),
      ),
    );
  } else {
    const p = document.createElement("p");
    p.textContent = `${name} wasn't involved in any cost splits.`;
    container.appendChild(p);
  }

  const settlements = getSettlementsFor(index);
  if (settlements.length > 0) {
    container.appendChild(
      buildTableSection(
        "Settlement Plan",
        buildSettlementTable(settlements, index),
      ),
    );
  } else {
    const p = document.createElement("p");
    p.textContent = `${name} has no settlements.`;
    container.appendChild(p);
  }

  return container;
}

export {
  addPerson,
  deletePerson,
  renamePerson,
  renderPeople,
  createTransactionHeaderRow,
  createTransactionRow,
  createAddTransactionRow,
  renderTransactionTable,
  addTransaction,
  editTransaction,
  deleteTransaction,
  renderSplitTable,
  editSplit,
  itemizeTransaction,
  unitemizeTransaction,
  addItem,
  deleteItem,
  editItem,
  editItemSplit,
  toggleSplitItems,
  toggleDetailItems,
  renderSplitDetails,
  calculateSummary,
  renderSavedPoolsTable,
  renderPersonView,
  showPersonSummary,
};
