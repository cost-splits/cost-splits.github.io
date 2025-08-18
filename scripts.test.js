/**
 * @jest-environment jsdom
 */
const {
  computeSummary,
  markDirty,
  markSaved,
  toggleCollapse,
  resetState,
  loadStateFromJson,
  _people,
  _transactions,
  addPerson,
} = require("./scripts");

describe("computeSummary", () => {
  test("calculates paid, owed and net for a simple shared expense", () => {
    const people = ["Alice", "Bob"];
    const transactions = [{ payer: 0, cost: 30, splits: [1, 1] }];
    const { paid, owes, nets } = computeSummary(people, transactions);
    expect(paid).toEqual([30, 0]);
    expect(owes).toEqual([15, 15]);
    expect(nets).toEqual([15, -15]);
  });
});

describe("markDirty and markSaved", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="save-people"></button>
      <button id="save-transactions"></button>
      <button id="save-splits"></button>
      <button id="calculate-summary"></button>
    `;
    resetState();
  });

  test("marks and saves people section", () => {
    markDirty("people");
    expect(
      document.getElementById("save-people").classList.contains("unsaved"),
    ).toBe(true);
    markSaved("people");
    expect(
      document.getElementById("save-people").classList.contains("unsaved"),
    ).toBe(false);
  });

  test("transactions dirtiness affects summary button", () => {
    markDirty("transactions");
    const saveTransaction = document.getElementById("save-transactions");
    const calcSummary = document.getElementById("calculate-summary");
    expect(saveTransaction.classList.contains("unsaved")).toBe(true);
    expect(calcSummary.classList.contains("unsaved")).toBe(true);
    markSaved("transactions");
    expect(saveTransaction.classList.contains("unsaved")).toBe(false);
    expect(calcSummary.classList.contains("unsaved")).toBe(false);
  });
});

describe("toggleCollapse", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="header"></div>
      <div id="content"></div>
    `;
  });

  test("toggles content display", () => {
    const header = document.getElementById("header");
    const content = document.getElementById("content");
    toggleCollapse(header);
    expect(content.style.display).toBe("block");
    toggleCollapse(header);
    expect(content.style.display).toBe("none");
  });
});

describe("updateCurrentStateJson and loadStateFromJson", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="state-json-display" />
      <textarea id="state-json-input"></textarea>
      <div id="summary"></div>
      <button id="save-people"></button>
      <button id="save-transactions"></button>
      <button id="save-splits"></button>
      <button id="calculate-summary"></button>
    `;
    resetState();
    global.alert = jest.fn();
  });

  test("current state display updates automatically", () => {
    _people.push("Alice");
    markSaved("people");
    expect(document.getElementById("state-json-display").value).toBe(
      JSON.stringify({ people: ["Alice"], transactions: [] }),
    );
  });

  test("round trip saves and loads state", () => {
    _people.push("Alice", "Bob");
    _transactions.push({
      name: "Lunch",
      cost: 20,
      payer: 0,
      splits: [1, 1],
    });
    markSaved("people");
    markSaved("transactions");
    const saved = document.getElementById("state-json-display").value;

    resetState();
    expect(_people).toHaveLength(0);
    expect(_transactions).toHaveLength(0);

    document.getElementById("state-json-input").value = saved;
    loadStateFromJson();
    expect(_people).toEqual(["Alice", "Bob"]);
    expect(_transactions).toEqual([
      { name: "Lunch", cost: 20, payer: 0, splits: [1, 1] },
    ]);
  });

  test("rejects invalid state", () => {
    document.getElementById("state-json-input").value =
      '{"people":["Alice"],"transactions":[{"payer":0,"cost":"NaN","splits":[1]}]}';
    loadStateFromJson();
    expect(alert).toHaveBeenCalled();
    expect(_people).toEqual([]);
    expect(_transactions).toEqual([]);
  });
});

describe("addPerson", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="person-name" />
      <ul id="people-list"></ul>
      <table id="transaction-table"></table>
      <div id="split-table"></div>
      <div id="split-details"></div>
    `;
    resetState();
    _people.push("Alice", "Bob");
    _transactions.push({
      name: "Lunch",
      cost: 20,
      payer: 0,
      splits: [1, 1],
    });
  });

  test("adds zero splits for new user", () => {
    document.getElementById("person-name").value = "Charlie";
    addPerson();
    expect(_people).toEqual(["Alice", "Bob", "Charlie"]);
    expect(_transactions[0].splits).toEqual([1, 1, 0]);
    expect(document.getElementById("split-details").textContent).not.toMatch(
      "NaN",
    );
  });
});
