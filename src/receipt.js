import { transactions, people, afterChange } from "./state.js";
import { renderTransactionTable, renderSplitTable } from "./render.js";

let currentImageUrl = "";

/**
 * Initialize receipt upload and debug buttons.
 *
 * Sets up handlers for uploading a receipt image, extracting a transaction,
 * and displaying a modal preview. Includes a debug button that injects a
 * sample image and transaction.
 *
 * @returns {void}
 */
export function initReceiptUpload() {
  const uploadBtn = document.getElementById("receipt-upload");
  const debugBtn = document.getElementById("receipt-debug");
  const fileInput = document.getElementById("receipt-file");
  const modal = document.getElementById("receipt-modal");
  const preview = document.getElementById("receipt-preview");
  const proposed = document.getElementById("receipt-proposed");
  const addBtn = document.getElementById("receipt-add");
  const cancelBtn = document.getElementById("receipt-cancel");

  uploadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const tx = await extractTransactionFromImage(file);
    showModal(url, tx);
    fileInput.value = "";
  });

  debugBtn.addEventListener("click", () => {
    const baseSplits = people.map(() => 1);
    const tx = {
      name: "Sample Store",
      payer: 0,
      cost: 12.34,
      splits: baseSplits.slice(),
      items: [
        { item: "Coffee", cost: 4, splits: baseSplits.slice() },
        { item: "Bagel", cost: 8.34, splits: baseSplits.slice() },
      ],
    };
    showModal("assets/icon-banner.png", tx);
  });

  addBtn.addEventListener("click", () => {
    const tx = collectTransactionFromModal();
    if (!tx) return;
    transactions.push(tx);
    renderTransactionTable();
    renderSplitTable();
    afterChange();
    hideModal();
  });

  cancelBtn.addEventListener("click", () => {
    hideModal();
    fileInput.value = "";
  });

  /**
   * Display the modal with the provided image and transaction.
   *
   * @param {string} imgUrl - Image URL for preview.
   * @param {object} tx - Transaction data to display.
   * @returns {void}
   */
  function showModal(imgUrl, tx) {
    currentImageUrl = imgUrl;
    preview.src = imgUrl;
    proposed.innerHTML = "";
    proposed.appendChild(renderProposedTransaction(tx));
    modal.classList.remove("hidden");
  }

  /**
   * Hide the receipt modal and clean up resources.
   *
   * @returns {void}
   */
  function hideModal() {
    modal.classList.add("hidden");
    preview.src = "";
    proposed.innerHTML = "";
    if (currentImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(currentImageUrl);
    }
    currentImageUrl = "";
  }

  /**
   * Collect transaction data from the modal inputs.
   *
   * @returns {object} Transaction object assembled from user edits.
   */
  function collectTransactionFromModal() {
    const name = document.getElementById("receipt-t-name").value.trim();
    const payer = parseInt(
      document.getElementById("receipt-t-payer").value,
      10,
    );
    const cost =
      parseFloat(document.getElementById("receipt-t-cost").value) || 0;
    const items = [];
    const table = document.getElementById("receipt-items-table");
    if (table) {
      const rows = table.querySelectorAll("tbody tr");
      rows.forEach((row, ii) => {
        const item = row.querySelector(`#receipt-item-${ii}-name`).value.trim();
        const itemCost =
          parseFloat(row.querySelector(`#receipt-item-${ii}-cost`).value) || 0;
        const splits = people.map((_, pi) => {
          const val = row.querySelector(
            `#receipt-item-${ii}-split-${pi}`,
          ).value;
          return val ? parseFloat(val) : 0;
        });
        items.push({ item, cost: itemCost, splits });
      });
    }
    const tx = { name, payer, cost, splits: people.map(() => 0) };
    if (items.length > 0) tx.items = items;
    return tx;
  }
}

/**
 * Stub for extracting transaction data from a receipt image.
 *
 * This placeholder simply returns an empty transaction structure. Future
 * implementations can replace this with real receipt parsing logic.
 *
 * @param {File} _file - Image file to parse.
 * @returns {Promise<object>} Proposed transaction data.
 */
export async function extractTransactionFromImage(_file) {
  return {
    name: "Receipt",
    payer: 0,
    cost: 0,
    splits: people.map(() => 0),
    items: [{ item: "", cost: 0, splits: people.map(() => 0) }],
  };
}

/**
 * Render an editable transaction proposal form.
 *
 * @param {object} tx - Transaction data to prefill.
 * @returns {HTMLElement} Container with form inputs.
 */
function renderProposedTransaction(tx) {
  const container = document.createElement("div");

  const txTable = document.createElement("table");
  const txBody = document.createElement("tbody");

  const nameRow = document.createElement("tr");
  nameRow.innerHTML = `<th>Transaction</th><td><input id="receipt-t-name" type="text" value="${
    tx.name || ""
  }" /></td>`;
  txBody.appendChild(nameRow);

  let payerCell = '<th>Payer</th><td><select id="receipt-t-payer">';
  people.forEach((p, i) => {
    const sel = i === (tx.payer || 0) ? " selected" : "";
    payerCell += `<option value="${i}"${sel}>${p}</option>`;
  });
  payerCell += "</select></td>";
  const payerRow = document.createElement("tr");
  payerRow.innerHTML = payerCell;
  txBody.appendChild(payerRow);

  const costVal = typeof tx.cost === "number" ? tx.cost.toFixed(2) : "0";
  const costRow = document.createElement("tr");
  costRow.innerHTML = `<th>Total Cost</th><td><input id="receipt-t-cost" type="number" step="0.01" value="${costVal}" /></td>`;
  txBody.appendChild(costRow);

  txTable.appendChild(txBody);
  container.appendChild(txTable);

  const items =
    Array.isArray(tx.items) && tx.items.length > 0
      ? tx.items
      : [{ item: "", cost: 0, splits: people.map(() => 0) }];
  const table = document.createElement("table");
  table.id = "receipt-items-table";
  const thead = document.createElement("thead");
  let header = "<tr><th>Item</th><th>Cost</th>";
  people.forEach((p) => {
    header += `<th>${p}</th>`;
  });
  header += "</tr>";
  thead.innerHTML = header;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  items.forEach((it, ii) => {
    let cells = `<td><input id="receipt-item-${ii}-name" type="text" value="${
      it.item || ""
    }" /></td>`;
    cells += `<td><input id="receipt-item-${ii}-cost" type="number" step="0.01" value="${it.cost.toFixed(
      2,
    )}" /></td>`;
    people.forEach((_, pi) => {
      const val = it.splits?.[pi] ?? 0;
      cells += `<td><input id="receipt-item-${ii}-split-${pi}" type="number" min="0" value="${val}" /></td>`;
    });
    const row = document.createElement("tr");
    row.innerHTML = cells;
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  return container;
}
