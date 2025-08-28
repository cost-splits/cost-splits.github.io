import { transactions, people, afterChange } from "./state.js";
import { renderTransactionTable, renderSplitTable } from "./render.js";

let currentTransaction = null;
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
    const tx = {
      name: "Sample Store",
      payer: 0,
      cost: 12.34,
      splits: [1],
      items: [
        { item: "Coffee", cost: 4, splits: [1] },
        { item: "Bagel", cost: 8.34, splits: [1] },
      ],
    };
    showModal("assets/icon-banner.png", tx);
  });

  addBtn.addEventListener("click", () => {
    if (!currentTransaction) return;
    transactions.push(currentTransaction);
    renderTransactionTable();
    renderSplitTable();
    afterChange();
    hideModal();
  });

  cancelBtn.addEventListener("click", hideModal);

  /**
   * Display the modal with the provided image and transaction.
   *
   * @param {string} imgUrl - Image URL for preview.
   * @param {object} tx - Transaction data to display.
   * @returns {void}
   */
  function showModal(imgUrl, tx) {
    currentTransaction = tx;
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
    currentTransaction = null;
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
    splits: people.map(() => 1),
  };
}

/**
 * Build a simple view of the proposed transaction and items.
 *
 * @param {object} tx - Transaction to render.
 * @returns {HTMLElement} Container with transaction details.
 */
function renderProposedTransaction(tx) {
  const container = document.createElement("div");
  const name = document.createElement("p");
  name.textContent = `Name: ${tx.name}`;
  const cost = document.createElement("p");
  cost.textContent = `Cost: ${tx.cost}`;
  container.appendChild(name);
  container.appendChild(cost);
  if (Array.isArray(tx.items) && tx.items.length > 0) {
    const list = document.createElement("ul");
    tx.items.forEach((it) => {
      const li = document.createElement("li");
      li.textContent = `${it.item ?? "Item"} - ${it.cost}`;
      list.appendChild(li);
    });
    container.appendChild(list);
  }
  return container;
}
