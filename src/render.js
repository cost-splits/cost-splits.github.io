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
} from "./state.js";
import {
  loadPoolFromLocalStorage,
  deletePoolFromLocalStorage,
  LOCAL_STORAGE_KEY,
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
    const input = document.createElement("input");
    input.value = p;
    input.oninput = () => clearError(input);
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
  const table = document.getElementById("transaction-table");
  table.innerHTML = "";
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  if (people.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.textContent = "Please add people first";
    row.appendChild(cell);
    tbody.appendChild(row);
    table.appendChild(thead);
    table.appendChild(tbody);
    return;
  }

  thead.appendChild(createTransactionHeaderRow());
  transactions.forEach((t, i) => tbody.appendChild(createTransactionRow(t, i)));
  tbody.appendChild(createAddTransactionRow());

  table.appendChild(thead);
  table.appendChild(tbody);
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

  transactions.forEach((t, ti) => {
    const hasItems = Array.isArray(t.items);
    const collapsed = collapsedSplit.has(ti);
    const row = document.createElement("tr");
    if (hasItems) row.classList.add("unused-row");
    const tName = t.name || `Transaction ${ti + 1}`;
    const arrow = hasItems ? (collapsed ? "▶" : "▼") : "";
    let cells = `<td>${
      arrow
        ? `<span class="collapse-btn" data-action="toggleSplitItems" data-ti="${ti}">${arrow}</span>`
        : ""
    }${tName}</td>`;
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
        cell += `<td><span class="delete-btn" data-action="deleteItem" data-ti="${ti}" data-ii="${ii}">❌</span></td>`;
        iRow.innerHTML = cell;
        tbody.appendChild(iRow);
      });
    }
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
    const t = e.target;
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

  transactions.forEach((t, ti) => {
    const hasItems = Array.isArray(t.items) && t.items.length > 0;
    const collapsed = collapsedDetails.has(ti);
    const tName = t.name || `Transaction ${ti + 1}`;
    const row = document.createElement("tr");
    const arrow = hasItems ? (collapsed ? "▶" : "▼") : "";
    let cells = `<td>${
      arrow
        ? `<span class="collapse-btn" data-action="toggleDetailItems" data-ti="${ti}">${arrow}</span>`
        : ""
    }${tName} - $${t.cost.toFixed(2)}</td>`;
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
  });

  // totals row
  const totalRow = document.createElement("tr");
  let cells = "<td><b>Total</b></td>";
  totals.forEach((val) => (cells += `<td><b>$${val.toFixed(2)}</b></td>`));
  totalRow.innerHTML = cells;
  tbody.appendChild(totalRow);

  table.onclick = (e) => {
    if (e.target.dataset.action === "toggleDetailItems") {
      toggleDetailItems(parseInt(e.target.dataset.ti));
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
  totalRow.innerHTML = `<td><b>Total</b></td>
        <td><b>$${totalPaid.toFixed(2)}</b></td>
        <td><b>$${totalOwes.toFixed(2)}</b></td>
        <td><b>${
          (totalNet > 0
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
};
