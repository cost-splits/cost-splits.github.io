/**
 * @jest-environment jsdom
 */
import {
  renderPersonView,
  showPersonSummary,
  calculateSummary,
  renderTransactionTable,
  renderSplitTable,
} from "../src/render.js";
import { resetState, people, transactions } from "../src/state.js";

describe("person view helpers", () => {
  beforeEach(() => {
    resetState();
    people.push("A", "B");
    transactions.push(
      { name: "T1", payer: 0, cost: 10, splits: [1, 1] },
      { name: "T2", payer: 1, cost: 20, splits: [1, 1] },
    );
  });

  test("renderPersonView builds sections and highlights person", () => {
    const view = renderPersonView(0);
    const tables = view.querySelectorAll("table");
    expect(tables.length).toBe(3);

    const paidRows = tables[0].querySelectorAll("tbody tr");
    expect(paidRows.length).toBe(1);
    expect(paidRows[0].children[0].textContent).toBe("T1");
    expect(paidRows[0].children[1].classList.contains("person-highlight")).toBe(
      true,
    );

    const sharedRows = tables[1].querySelectorAll("tbody tr");
    expect(sharedRows.length).toBe(2);
    expect(sharedRows[0].children[2].textContent).toBe("$5.00");
    expect(sharedRows[1].children[2].textContent).toBe("$10.00");
    expect(
      sharedRows[0].children[1].classList.contains("person-highlight"),
    ).toBe(true);
    expect(
      sharedRows[1].children[1].classList.contains("person-highlight"),
    ).toBe(false);
    expect(
      sharedRows[0].children[2].classList.contains("person-highlight"),
    ).toBe(true);
    expect(
      sharedRows[1].children[2].classList.contains("person-highlight"),
    ).toBe(true);

    const settlementRows = tables[2].querySelectorAll("tbody tr");
    expect(settlementRows.length).toBe(1);
    expect(settlementRows[0].children[0].textContent).toBe("A");
    expect(settlementRows[0].children[1].textContent).toBe("B");
    expect(
      settlementRows[0].children[0].classList.contains("settlement-person"),
    ).toBe(true);
    expect(
      settlementRows[0].children[1].classList.contains("settlement-person"),
    ).toBe(false);
    expect(settlementRows[0].children[2].textContent).toBe("$5.00");
  });

  test("renderPersonView handles missing transactions and splits", () => {
    resetState();
    people.push("A");
    const view = renderPersonView(0);
    expect(view.querySelector("table")).toBeNull();
    expect(view.textContent).toContain("A didn't pay for any transactions.");
    expect(view.textContent).toContain("A wasn't involved in any cost splits.");
    expect(view.textContent).toContain("A has no settlements.");
  });

  test("showPersonSummary highlights related sections and closes", () => {
    transactions.push({ name: "T3", payer: 1, cost: 5, splits: [0, 1] });
    document.body.innerHTML =
      '<div id="summary"></div><div id="transaction-table"></div><div id="split-table"></div><div id="split-details"></div>';
    renderTransactionTable();
    renderSplitTable();
    calculateSummary();
    showPersonSummary(0);

    const summaryTable = document.querySelector("#summary > table");
    expect(summaryTable).not.toBeNull();
    expect(
      summaryTable
        ?.querySelectorAll("tbody tr")[0]
        .classList.contains("person-highlight"),
    ).toBe(true);

    const txRows = document.querySelectorAll("#transaction-table tbody tr");
    expect(txRows[0].classList.contains("person-highlight")).toBe(true);
    expect(txRows[1].classList.contains("person-highlight")).toBe(true);
    expect(txRows[2].classList.contains("person-highlight")).toBe(false);

    const splitRows = document.querySelectorAll("#split-table tbody tr");
    expect(
      splitRows[0].children[2].classList.contains("person-highlight"),
    ).toBe(true);
    expect(
      splitRows[1].children[2].classList.contains("person-highlight"),
    ).toBe(true);
    expect(
      splitRows[2].children[2].classList.contains("person-highlight"),
    ).toBe(false);

    const detailRows = document.querySelectorAll("#split-details tbody tr");
    expect(
      detailRows[0].children[1].classList.contains("person-highlight"),
    ).toBe(true);
    expect(
      detailRows[1].children[1].classList.contains("person-highlight"),
    ).toBe(true);
    expect(
      detailRows[2].children[1].classList.contains("person-highlight"),
    ).toBe(false);
    const totalRow = detailRows[detailRows.length - 1];
    expect(totalRow.children[1].classList.contains("person-highlight")).toBe(
      true,
    );

    expect(document.getElementById("person-summary-separator")).not.toBeNull();

    document.querySelector("#person-summary button")?.click();
    expect(document.getElementById("person-summary")).toBeNull();
    expect(document.getElementById("person-summary-separator")).toBeNull();
    expect(txRows[0].classList.contains("person-highlight")).toBe(false);
    expect(
      splitRows[0].children[2].classList.contains("person-highlight"),
    ).toBe(false);
    expect(
      detailRows[0].children[1].classList.contains("person-highlight"),
    ).toBe(false);
  });
});
