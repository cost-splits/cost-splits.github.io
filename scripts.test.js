/**
 * @jest-environment jsdom
 */
const {
  computeSummary,
  markDirty,
  markSaved,
  toggleCollapse,
  resetState,
  saveStateToJson,
  loadStateFromJson,
  _people,
  _transactions,
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
      <button id="save-transaction"></button>
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
    const saveTransaction = document.getElementById("save-transaction");
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

describe("saveStateToJson and loadStateFromJson", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <textarea id="state-json"></textarea>
      <div id="summary"></div>
      <button id="save-people"></button>
      <button id="save-transaction"></button>
      <button id="save-splits"></button>
      <button id="calculate-summary"></button>
    `;
    resetState();
    global.alert = jest.fn();
  });

  test("round trip saves and loads state", () => {
    _people.push("Alice", "Bob");
    _transactions.push({
      name: "Lunch",
      cost: 20,
      payer: 0,
      splits: [1, 1],
    });
    saveStateToJson();
    const saved = document.getElementById("state-json").value;

    resetState();
    expect(_people).toHaveLength(0);
    expect(_transactions).toHaveLength(0);

    document.getElementById("state-json").value = saved;
    loadStateFromJson();
    expect(_people).toEqual(["Alice", "Bob"]);
    expect(_transactions).toEqual([
      { name: "Lunch", cost: 20, payer: 0, splits: [1, 1] },
    ]);
  });

  test("rejects invalid state", () => {
    document.getElementById("state-json").value =
      '{"people":["Alice"],"transactions":[{"payer":0,"cost":"NaN","splits":[1]}]}';
    loadStateFromJson();
    expect(alert).toHaveBeenCalled();
    expect(_people).toEqual([]);
    expect(_transactions).toEqual([]);
  });
});
