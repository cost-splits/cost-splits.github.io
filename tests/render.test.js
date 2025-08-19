/**
 * @jest-environment jsdom
 */
import {
  createTransactionHeaderRow,
  createTransactionRow,
  createAddTransactionRow,
} from "../src/render.js";
import { resetState, people, transactions } from "../src/state.js";

describe("transaction table helpers", () => {
  beforeEach(() => {
    resetState();
    people.push("Alice", "Bob");
    transactions.push({ name: "Lunch", payer: 0, cost: 10, splits: [1, 1] });
  });

  test("createTransactionHeaderRow builds header cells", () => {
    const header = createTransactionHeaderRow();
    const cells = header.querySelectorAll("th");
    expect(cells.length).toBe(4);
    expect(cells[0].textContent).toBe("Name");
    expect(cells[1].textContent).toBe("Paid By");
    expect(cells[2].textContent).toBe("Cost");
    expect(cells[3].textContent).toBe("Action");
  });

  test("createTransactionRow builds editable row", () => {
    const row = createTransactionRow(transactions[0], 0);
    expect(row.querySelector("#transaction-name-0").value).toBe("Lunch");
    expect(row.querySelector("#transaction-payer-0").value).toBe("0");
    expect(row.querySelector("#transaction-cost-0").value).toBe("10.00");
  });

  test("createAddTransactionRow builds add row", () => {
    const row = createAddTransactionRow();
    expect(row.querySelector("#new-t-name")).not.toBeNull();
    expect(row.querySelector("#new-t-payer").children.length).toBe(2);
    expect(row.querySelector("#new-t-cost")).not.toBeNull();
  });
});
