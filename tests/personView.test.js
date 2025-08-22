/**
 * @jest-environment jsdom
 */
import { renderPersonView } from "../src/render.js";
import { resetState, people, transactions } from "../src/state.js";

describe("renderPersonView", () => {
  beforeEach(() => {
    resetState();
    people.push("A", "B");
    transactions.push(
      { name: "T1", payer: 0, cost: 10, splits: [1, 1] },
      { name: "T2", payer: 1, cost: 20, splits: [1, 1] },
    );
  });

  test("builds sections for paid, shared and settlement", () => {
    const view = renderPersonView(0);
    const tables = view.querySelectorAll("table");
    expect(tables.length).toBe(3);

    const paidRows = tables[0].querySelectorAll("tbody tr");
    expect(paidRows.length).toBe(1);
    expect(paidRows[0].children[0].textContent).toBe("T1");

    const sharedRows = tables[1].querySelectorAll("tbody tr");
    expect(sharedRows.length).toBe(2);
    expect(sharedRows[0].children[2].textContent).toBe("$5.00");
    expect(sharedRows[1].children[2].textContent).toBe("$10.00");

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
});
