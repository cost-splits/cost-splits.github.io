/**
 * @jest-environment jsdom
 */
const {
  computeSummary,
  toggleCollapse,
  resetState,
  loadStateFromJson,
  loadStateFromJsonFile,
  downloadJson,
  _people,
  _transactions,
  addPerson,
  updateCurrentStateJson,
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
    updateCurrentStateJson();
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

  test("loads state from JSON file", async () => {
    const data = {
      people: ["Dora"],
      transactions: [{ name: "Tea", cost: 5, payer: 0, splits: [1] }],
    };
    const file = new Blob([JSON.stringify(data)], {
      type: "application/json",
    });
    await loadStateFromJsonFile(file);
    expect(_people).toEqual(["Dora"]);
    expect(_transactions).toEqual([
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
    _people.push("Eve");
    _transactions.push({ payer: 0, cost: 12, splits: [1] });

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
      JSON.stringify({ people: ["Eve"], transactions: _transactions }),
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

describe("editSplit", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="split-table"></div>
      <div id="split-details"></div>
    `;
    resetState();
    _people.push("Alice");
    _transactions.push({ name: "Item", cost: 10, payer: 0, splits: [1] });
    window.renderSplitTable();
  });

  test("accepts numbers with any decimal places", () => {
    const input = document.querySelector("#split-table input");
    window.editSplit(0, 0, "3.123", input);
    expect(_transactions[0].splits[0]).toBeCloseTo(3.123);
    expect(input.value).toBe("3.123");
  });
});
