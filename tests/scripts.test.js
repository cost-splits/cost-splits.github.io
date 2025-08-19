/**
 * @jest-environment jsdom
 */
import {
  computeSummary,
  computeSettlements,
  resetState,
  people,
  transactions,
  setAfterChange,
} from "../src/state.js";
import {
  addPerson,
  renamePerson,
  renderPeople,
  renderSplitTable,
  editSplit,
  calculateSummary,
} from "../src/render.js";
import {
  updateCurrentStateJson,
  updateShareableUrl,
  loadStateFromJson,
  loadStateFromJsonFile,
  loadStateFromUrl,
  savePoolToLocalStorage,
  loadPoolFromLocalStorage,
  listSavedPools,
  renderSavedPoolsTable,
  downloadJson,
} from "../src/share.js";
import lz from "lz-string";
import { jest } from "@jest/globals";

setAfterChange(() => {
  updateCurrentStateJson();
  updateShareableUrl();
  calculateSummary();
});

describe("computeSummary", () => {
  test("calculates paid, owed and net for a simple shared expense", () => {
    const people = ["Alice", "Bob"];
    const transactions = [{ payer: 0, cost: 30, splits: [1, 1] }];
    const { paid, owes, nets } = computeSummary(people, transactions);
    expect(paid).toEqual([30, 0]);
    expect(owes).toEqual([15, 15]);
    expect(nets).toEqual([15, -15]);
  });

  test("handles itemized transactions with proportional extras", () => {
    const people = ["A", "B", "C"];
    const transactions = [
      {
        payer: 0,
        cost: 40,
        splits: [0, 0, 0],
        items: [
          { item: "I1", cost: 10, splits: [1, 1, 0] },
          { item: "I2", cost: 20, splits: [1, 1, 1] },
          { item: "I3", cost: 5, splits: [1, 0, 0] },
        ],
      },
    ];
    const { paid, owes, nets } = computeSummary(people, transactions);
    expect(paid).toEqual([40, 0, 0]);
    expect(owes[0]).toBeCloseTo(19.0476, 4);
    expect(owes[1]).toBeCloseTo(13.3333, 4);
    expect(owes[2]).toBeCloseTo(7.619, 4);
    expect(nets[0]).toBeCloseTo(20.9524, 4);
    expect(nets[1]).toBeCloseTo(-13.3333, 4);
    expect(nets[2]).toBeCloseTo(-7.619, 4);
  });
});

describe("computeSettlements", () => {
  test("suggests settlement for simple case", () => {
    const people = ["Alice", "Bob"];
    const transactions = [{ payer: 0, cost: 30, splits: [1, 1] }];
    const settlements = computeSettlements(people, transactions);
    expect(settlements).toEqual([{ from: 1, to: 0, amount: 15 }]);
  });

  test("handles multiple creditors and debtors", () => {
    const people = ["A", "B", "C"];
    const transactions = [
      { payer: 0, cost: 20, splits: [1, 0, 1] },
      { payer: 1, cost: 40, splits: [0, 1, 1] },
    ];
    const settlements = computeSettlements(people, transactions);
    expect(settlements).toEqual([
      { from: 2, to: 1, amount: 20 },
      { from: 2, to: 0, amount: 10 },
    ]);
  });

  test("handles uneven fractional amounts", () => {
    const people = ["A", "B", "C"];
    const transactions = [
      { payer: 0, cost: 25, splits: [2, 1, 1] },
      { payer: 1, cost: 35, splits: [3, 3, 2] },
    ];
    const settlements = computeSettlements(people, transactions);
    expect(settlements).toEqual([
      { from: 2, to: 1, amount: 15 },
      { from: 0, to: 1, amount: 0.625 },
    ]);
  });
});

describe("calculateSummary settlements", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="summary"></div>`;
    resetState();
  });

  test("renders settlement suggestions", () => {
    people.push("Alice", "Bob");
    transactions.push({ payer: 0, cost: 30, splits: [1, 1] });
    calculateSummary();
    expect(document.getElementById("summary").innerHTML).toContain(
      "Bob pays Alice $15.00",
    );
  });
});

describe("updateCurrentStateJson and loadStateFromJson", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="pool-name" />
      <input id="state-json-display" />
      <textarea id="state-json-input"></textarea>
      <input id="state-json-file" type="file" />
      <div id="summary"></div>
      <input id="person-name" />
      <ul id="people-list"></ul>
      <table id="transaction-table"></table>
      <div id="split-table"></div>
      <div id="split-details"></div>
    `;
    resetState();
    global.alert = jest.fn();
  });

  test("current state display updates automatically", () => {
    document.getElementById("person-name").value = "Alice";
    addPerson();
    expect(document.getElementById("state-json-display").value).toBe(
      JSON.stringify({ pool: "", people: ["Alice"], transactions: [] }),
    );
  });

  test("round trip saves and loads state", () => {
    people.push("Alice", "Bob");
    transactions.push({
      name: "Lunch",
      cost: 20,
      payer: 0,
      splits: [0, 0],
      items: [
        { item: "Sandwich", cost: 12, splits: [1, 1] },
        { item: "Drink", cost: 4, splits: [1, 0] },
      ],
    });
    updateCurrentStateJson();
    const saved = document.getElementById("state-json-display").value;

    resetState();
    expect(people).toHaveLength(0);
    expect(transactions).toHaveLength(0);

    document.getElementById("state-json-input").value = saved;
    loadStateFromJson();
    expect(people).toEqual(["Alice", "Bob"]);
    expect(transactions).toEqual([
      {
        name: "Lunch",
        cost: 20,
        payer: 0,
        splits: [0, 0],
        items: [
          { item: "Sandwich", cost: 12, splits: [1, 1] },
          { item: "Drink", cost: 4, splits: [1, 0] },
        ],
      },
    ]);
    expect(document.getElementById("pool-name").value).toBe("");
  });

  test("rejects invalid state", () => {
    document.getElementById("state-json-input").value =
      '{"people":["Alice"],"transactions":[{"payer":0,"cost":"NaN","splits":[1]}]}';
    loadStateFromJson();
    expect(alert).toHaveBeenCalled();
    expect(people).toEqual([]);
    expect(transactions).toEqual([]);
  });

  test("loads state from JSON file", async () => {
    const data = {
      people: ["Dora"],
      transactions: [{ name: "Tea", cost: 5, payer: 0, splits: [1] }],
    };
    const file = new Blob([JSON.stringify(data)], {
      type: "application/json",
    });
    await loadStateFromJsonFile(file);
    expect(people).toEqual(["Dora"]);
    expect(transactions).toEqual([
      { name: "Tea", cost: 5, payer: 0, splits: [1] },
    ]);
    expect(document.getElementById("state-json-input").value).toBe(
      JSON.stringify(data),
    );
  });
});

const originalCreateURL = URL.createObjectURL;
const originalRevokeURL = URL.revokeObjectURL;

describe("downloadJson", () => {
  beforeEach(() => {
    document.body.innerHTML = ``;
    resetState();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    URL.createObjectURL = originalCreateURL;
    URL.revokeObjectURL = originalRevokeURL;
  });

  test("creates downloadable file with current state", async () => {
    people.push("Eve");
    transactions.push({ payer: 0, cost: 12, splits: [1] });

    const anchor = { click: jest.fn() };
    jest.spyOn(document, "createElement").mockReturnValue(anchor);
    const appendSpy = jest
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => {});
    const removeSpy = jest
      .spyOn(document.body, "removeChild")
      .mockImplementation(() => {});
    URL.createObjectURL = jest.fn().mockReturnValue("mockurl");
    URL.revokeObjectURL = jest.fn();

    downloadJson();

    expect(anchor.download).toBe("cost-splits.json");
    expect(anchor.href).toBe("mockurl");
    expect(anchor.click).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalledWith(anchor);
    expect(removeSpy).toHaveBeenCalledWith(anchor);
    const blob = URL.createObjectURL.mock.calls[0][0];
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    expect(text).toBe(
      JSON.stringify({ pool: "", people: ["Eve"], transactions: transactions }),
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("mockurl");
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
    people.push("Alice", "Bob");
    transactions.push({
      name: "Lunch",
      cost: 20,
      payer: 0,
      splits: [1, 1],
    });
  });

  test("adds zero splits for new user", () => {
    document.getElementById("person-name").value = "Charlie";
    addPerson();
    expect(people).toEqual(["Alice", "Bob", "Charlie"]);
    expect(transactions[0].splits).toEqual([1, 1, 0]);
    expect(document.getElementById("split-details").textContent).not.toMatch(
      "NaN",
    );
  });
});

describe("renamePerson", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul id="people-list"></ul>
      <table id="transaction-table"></table>
      <div id="split-table"></div>
      <div id="split-details"></div>
    `;
    resetState();
    people.push("Alice", "Bob");
    renderPeople();
  });

  test("renames a person when new name is valid", () => {
    const result = renamePerson(1, "Charlie");
    expect(result).toBe(true);
    expect(people[1]).toBe("Charlie");
    const inputs = document.querySelectorAll("#people-list input");
    expect(inputs[1].value).toBe("Charlie");
  });

  test("accepts unchanged name without error", () => {
    const result = renamePerson(1, "Bob");
    expect(result).toBe(true);
    expect(people[1]).toBe("Bob");
    const inputs = document.querySelectorAll("#people-list input");
    expect(inputs[1].value).toBe("Bob");
  });

  test("prevents duplicate names", () => {
    const result = renamePerson(1, "Alice");
    expect(result).toBe(false);
    expect(people[1]).toBe("Bob");
    const inputs = document.querySelectorAll("#people-list input");
    expect(inputs[1].value).toBe("Bob");
  });

  test("prevents empty names", () => {
    const result = renamePerson(0, "");
    expect(result).toBe(false);
    expect(people[0]).toBe("Alice");
    const inputs = document.querySelectorAll("#people-list input");
    expect(inputs[0].value).toBe("Alice");
  });
});

describe("editSplit", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="split-table"></div>
      <div id="split-details"></div>
    `;
    resetState();
    people.push("Alice");
    transactions.push({ name: "Item", cost: 10, payer: 0, splits: [1] });
    renderSplitTable();
  });

  test("accepts numbers with any decimal places", () => {
    const input = document.querySelector("#split-table input");
    editSplit(0, 0, "3.123", input);
    expect(transactions[0].splits[0]).toBeCloseTo(3.123);
    expect(input.value).toBe("3.123");
  });
});

describe("sharing", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="pool-name" />
      <input id="state-json-display" />
      <textarea id="state-json-input"></textarea>
      <input id="state-json-file" type="file" />
      <div id="summary"></div>
      <input id="person-name" />
      <ul id="people-list"></ul>
      <table id="transaction-table"></table>
      <div id="split-table"></div>
      <div id="split-details"></div>
      <input id="share-url-display" />
    `;
    resetState();
    window.history.replaceState({}, "", "/");
  });

  test("updateShareableUrl builds URL with state", () => {
    people.push("Alice");
    transactions.push({ payer: 0, cost: 10, splits: [1] });
    updateShareableUrl();
    const json = JSON.stringify({
      pool: "",
      people: ["Alice"],
      transactions: transactions,
    });
    const expected = `http://localhost/?state=${lz.compressToEncodedURIComponent(
      json,
    )}`;
    expect(document.getElementById("share-url-display").value).toBe(expected);
  });

  test("loadStateFromUrl loads state when param present", () => {
    const state = {
      pool: "",
      people: ["Bob"],
      transactions: [{ payer: 0, cost: 5, splits: [1] }],
    };
    const compressed = lz.compressToEncodedURIComponent(JSON.stringify(state));
    window.history.replaceState({}, "", `?state=${compressed}`);
    loadStateFromUrl();
    expect(people).toEqual(["Bob"]);
    expect(transactions).toEqual([{ payer: 0, cost: 5, splits: [1] }]);
  });
});

describe("local storage helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="pool-name" />
      <input id="state-json-display" />
      <textarea id="state-json-input"></textarea>
      <input id="state-json-file" type="file" />
      <div id="summary"></div>
      <input id="person-name" />
      <ul id="people-list"></ul>
      <table id="transaction-table"></table>
      <div id="split-table"></div>
      <div id="split-details"></div>
      <input id="share-url-display" />
      <table id="saved-pools-table"></table>
    `;
    resetState();
    localStorage.clear();
  });

  test("save and load pool round trip", () => {
    people.push("Alice");
    transactions.push({ payer: 0, cost: 10, splits: [1] });
    savePoolToLocalStorage("trip", { people, transactions });
    resetState();
    loadPoolFromLocalStorage("trip");
    expect(people).toEqual(["Alice"]);
    expect(transactions).toEqual([{ payer: 0, cost: 10, splits: [1] }]);
  });

  test("listSavedPools returns stored names", () => {
    savePoolToLocalStorage("a", { people: [], transactions: [] });
    savePoolToLocalStorage("b", { people: [], transactions: [] });
    expect(listSavedPools().sort()).toEqual(["a", "b"]);
  });

  test("renderSavedPoolsTable populates DOM, loads and deletes pool", () => {
    people.push("Ann");
    transactions.push({ payer: 0, cost: 5, splits: [1] });
    savePoolToLocalStorage("picnic", { people, transactions });
    resetState();
    renderSavedPoolsTable();
    const row = document.querySelector("#saved-pools-table tbody tr");
    expect(row).not.toBeNull();
    row.click();
    expect(people).toEqual(["Ann"]);
    expect(transactions).toEqual([{ payer: 0, cost: 5, splits: [1] }]);
    renderSavedPoolsTable();
    const btn = document.querySelector("#saved-pools-table tbody tr button");
    btn.click();
    expect(listSavedPools()).toEqual([]);
  });
});
