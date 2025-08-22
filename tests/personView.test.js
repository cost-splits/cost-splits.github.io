/**
 * @jest-environment jsdom
 */
import {
  renderPersonView,
  showPersonSummary,
  calculateSummary,
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

  test("showPersonSummary appends view below summary and closes", () => {
    document.body.innerHTML = '<div id="summary"></div>';
    calculateSummary();
    showPersonSummary(0);

    const summaryTable = document.querySelector("#summary > table");
    expect(summaryTable).not.toBeNull();

    const highlighted = summaryTable
      ?.querySelectorAll("tbody tr")[0]
      .classList.contains("person-highlight");
    expect(highlighted).toBe(true);

    const personDiv = document.getElementById("person-summary");
    expect(personDiv).not.toBeNull();
    expect(personDiv.querySelector("h3")?.textContent).toBe("A summary");
    expect(personDiv.querySelectorAll("table").length).toBe(3);

    personDiv.querySelector("button")?.click();
    expect(document.getElementById("person-summary")).toBeNull();
    const cleared = summaryTable
      ?.querySelectorAll("tbody tr")[0]
      .classList.contains("person-highlight");
    expect(cleared).toBe(false);
  });
});
