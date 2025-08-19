import {
  people,
  transactions,
  collapsedSplit,
  collapsedDetails,
  afterChange,
  isValidDollar,
  isValidNumber,
  computeSummary,
} from "./state.js";

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
    input.oninput = () => input.classList.remove("invalid-cell");
    input.onblur = () => {
      if (!renamePerson(i, input.value)) {
        input.classList.add("invalid-cell");
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

    const nameCell = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = t.name || `Transaction ${i + 1}`;
    nameInput.addEventListener("change", (e) =>
      editTransaction(i, "name", e.target.value, e.target),
    );
    nameCell.appendChild(nameInput);
    row.appendChild(nameCell);

    const payerCell = document.createElement("td");
    const payerSelect = document.createElement("select");
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
    actionCell.appendChild(delBtn);
    row.appendChild(actionCell);

    table.appendChild(row);
  });

  const addRow = document.createElement("tr");

  const addNameCell = document.createElement("td");
  const addNameInput = document.createElement("input");
  addNameInput.type = "text";
  addNameInput.id = "new-t-name";
  addNameInput.placeholder = "Name (optional)";
  addNameCell.appendChild(addNameInput);
  addRow.appendChild(addNameCell);

  const addPayerCell = document.createElement("td");
  const addPayerSelect = document.createElement("select");
  addPayerSelect.id = "new-t-payer";
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
  let header = "<tr><th>Name</th><th>Cost</th>";
  people.forEach((p) => (header += `<th>${p}</th>`));
  header += "<th>Action</th></tr>";
  table.innerHTML = header;

  transactions.forEach((t, ti) => {
    const hasItems = Array.isArray(t.items);
    const collapsed = collapsedSplit.has(ti);
    const row = document.createElement("tr");
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
      cells += `<td><input type="text" value="${val}" ${disabled} data-action="editSplit" data-ti="${ti}" data-pi="${pi}"></td>`;
    });
    if (hasItems) {
      cells += `<td><button data-action="unitemizeTransaction" data-ti="${ti}">Normal</button><button data-action="addItem" data-ti="${ti}">Add Item</button></td>`;
    } else {
      cells += `<td><button data-action="itemizeTransaction" data-ti="${ti}">Itemize</button></td>`;
    }
    row.innerHTML = cells;
    table.appendChild(row);

    if (hasItems && !collapsed) {
      t.items.forEach((it, ii) => {
        const iRow = document.createElement("tr");
        let cell = `<td class="indent-cell"><input type="text" value="${it.item || ""}" data-action="editItem" data-ti="${ti}" data-ii="${ii}" data-field="item"></td>`;
        cell += `<td><div class="dollar-field"><span class="prefix">$</span><input type="text" value="${it.cost.toFixed(2)}" data-action="editItem" data-ti="${ti}" data-ii="${ii}" data-field="cost"></div></td>`;
        people.forEach((p, pi) => {
          const raw = it.splits[pi];
          const val2 = raw ? String(raw) : "";
          cell += `<td><input type="text" value="${val2}" data-action="editItemSplit" data-ti="${ti}" data-ii="${ii}" data-pi="${pi}"></td>`;
        });
        cell += `<td><span class="delete-btn" data-action="deleteItem" data-ti="${ti}" data-ii="${ii}">❌</span></td>`;
        iRow.innerHTML = cell;
        table.appendChild(iRow);
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
    el.classList.add("invalid-cell");
    return;
  }
  el.classList.remove("invalid-cell");
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
      item: "Item 1",
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
      el.classList.add("invalid-cell");
      return;
    }
    el.classList.remove("invalid-cell");
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
    el.classList.add("invalid-cell");
    return;
  }
  el.classList.remove("invalid-cell");
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
  if (transactions.length === 0 || people.length === 0) return;

  const table = document.createElement("table");
  const colSpan = people.length + 1;
  let header = `<tr><th colspan="${colSpan}" class="text-center">Split Details</th></tr>`;
  header += "<tr><th>Transaction</th>";
  people.forEach((p) => (header += `<th>${p}</th>`));
  header += "</tr>";
  table.innerHTML = header;

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
    table.appendChild(row);

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
        table.appendChild(iRow);
      });
    }
  });

  // totals row
  const totalRow = document.createElement("tr");
  let cells = "<td><b>Total</b></td>";
  totals.forEach((val) => (cells += `<td><b>$${val.toFixed(2)}</b></td>`));
  totalRow.innerHTML = cells;
  table.appendChild(totalRow);

  table.onclick = (e) => {
    if (e.target.dataset.action === "toggleDetailItems") {
      toggleDetailItems(parseInt(e.target.dataset.ti));
    }
  };

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

export {
  addPerson,
  deletePerson,
  renamePerson,
  renderPeople,
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
};
