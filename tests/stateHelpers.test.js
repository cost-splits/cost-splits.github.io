/**
 * @jest-environment jsdom
 */
import {
  resetState,
  people,
  transactions,
  getTransactionsPaidBy,
  getTransactionsInvolving,
  getSettlementsFor,
} from "../src/state.js";

describe("state helper filters", () => {
  beforeEach(() => {
    resetState();
    people.push("A", "B", "C");
  });

  test("getTransactionsPaidBy returns only matching payer", () => {
    transactions.push(
      { payer: 0, cost: 10, splits: [1, 1, 0] },
      { payer: 1, cost: 20, splits: [0, 1, 1] },
    );
    expect(getTransactionsPaidBy(1)).toEqual([
      { payer: 1, cost: 20, splits: [0, 1, 1] },
    ]);
  });

  test("getTransactionsInvolving detects splits and items", () => {
    transactions.push(
      { payer: 0, cost: 10, splits: [1, 0, 0] },
      { payer: 1, cost: 5, splits: [0, 1, 0] },
      {
        payer: 0,
        cost: 5,
        splits: [0, 0, 0],
        items: [{ cost: 5, splits: [0, 1, 0] }],
      },
    );
    expect(getTransactionsInvolving(1)).toEqual([
      { payer: 1, cost: 5, splits: [0, 1, 0] },
      {
        payer: 0,
        cost: 5,
        splits: [0, 0, 0],
        items: [{ cost: 5, splits: [0, 1, 0] }],
      },
    ]);
  });

  test("getSettlementsFor filters settlement list", () => {
    transactions.push({ payer: 0, cost: 30, splits: [1, 1, 0] });
    expect(getSettlementsFor(1)).toEqual([{ from: 1, to: 0, amount: 15 }]);
  });
});
