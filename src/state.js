/**
 * Compute the amounts paid, owed and net balance for each person.
 *
 * @param {string[]} people - List of participant names.
 * @param {Array<{payer:number,cost:number,splits:number[],items?:Array<{item?:string,cost:number,splits:number[]}>}>} transactions -
 *   Transactions describing who paid and how the cost is split, optionally
 *   containing itemized sub-splits.
 * @returns {{paid:number[], owes:number[], nets:number[]}} Summary arrays for
 *   each person.
 */
export function computeSummary(people, transactions) {
  const paid = Array(people.length).fill(0);
  const owes = Array(people.length).fill(0);

  transactions.forEach((t) => {
    paid[t.payer] += t.cost;
    if (Array.isArray(t.items) && t.items.length > 0) {
      const itemsTotal = t.items.reduce((sum, it) => sum + it.cost, 0);
      if (itemsTotal > 0) {
        const scale = t.cost / itemsTotal;
        const personTotals = Array(people.length).fill(0);
        t.items.forEach((it) => {
          const effCost = it.cost * scale;
          const splitSum = it.splits.reduce((a, b) => a + b, 0);
          if (splitSum > 0) {
            it.splits.forEach((s, i) => {
              personTotals[i] += (s / splitSum) * effCost;
            });
          }
        });
        personTotals.forEach((amt, i) => {
          owes[i] += amt;
        });
      }
    } else {
      const totalSplit = t.splits.reduce((a, b) => a + b, 0);
      if (totalSplit > 0) {
        t.splits.forEach((s, i) => {
          owes[i] += (s / totalSplit) * t.cost;
        });
      }
    }
  });

  const nets = people.map((_, i) => paid[i] - owes[i]);
  return { paid, owes, nets };
}

/**
 * Convert net balances into a minimal list of settlements.
 *
 * People with positive net values are owed money and those with negative net
 * values owe money. The resulting list describes how debts can be settled with
 * the fewest direct payments.
 *
 * @param {string[]} people - List of participant names.
 * @param {Array<{payer:number,cost:number,splits:number[],items?:Array<{item?:string,cost:number,splits:number[]}>}>} transactions -
 *   Transactions describing who paid and how the cost is split.
 * @returns {Array<{from:number,to:number,amount:number}>} Settlement transfer
 *   suggestions.
 */
export function computeSettlements(people, transactions) {
  const { nets } = computeSummary(people, transactions);
  /** @type {Array<{index:number,amount:number}>} */
  const creditors = [];
  /** @type {Array<{index:number,amount:number}>} */
  const debtors = [];
  nets.forEach((n, i) => {
    if (n > 0) creditors.push({ index: i, amount: n });
    else if (n < 0) debtors.push({ index: i, amount: -n });
  });
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amt = Math.min(credit.amount, debt.amount);
    settlements.push({ from: debt.index, to: credit.index, amount: amt });
    credit.amount -= amt;
    debt.amount -= amt;
    if (credit.amount <= 1e-8) ci++;
    if (debt.amount <= 1e-8) di++;
  }
  return settlements;
}

/** @type {string} */
export let pool = "";
/** @type {string[]} */
export const people = [];
/**
 * @type {Array<{
 *   name?: string,
 *   cost: number,
 *   payer: number,
 *   splits: number[],
 *   items?: Array<{ item?: string, cost: number, splits: number[] }>
 * }>}
 */
export const transactions = [];
/** @type {Set<number>} */
export const collapsedSplit = new Set();
/** @type {Set<number>} */
export const collapsedDetails = new Set();

let afterChangeHandler = () => {};
/**
 * Register a callback to run after state changes occur.
 *
 * @param {() => void} fn - Function to invoke whenever state is updated.
 * @returns {void}
 */
export function setAfterChange(fn) {
  afterChangeHandler = fn;
}

/**
 * Invoke the registered after-change callback.
 *
 * @returns {void}
 */
export function afterChange() {
  afterChangeHandler();
}

/**
 * Update the global pool name and notify listeners of the change.
 *
 * @param {string} name - The new pool name.
 * @returns {void}
 */
export function setPool(name) {
  pool = name;
  afterChange();
}

/**
 * Check whether a value represents a valid dollar amount.
 *
 * @param {string} value - Input string to validate.
 * @param {boolean} [allowEmpty=false] - Whether an empty string is allowed.
 * @returns {boolean} True if the value is a valid dollar amount.
 */
export function isValidDollar(value, allowEmpty = false) {
  if (allowEmpty && value.trim() === "") return true;
  return /^\d+(\.\d{0,2})?$/.test(value);
}

/**
 * Validate an arbitrary number allowing any number of decimals.
 *
 * @param {string} value - Input string to validate.
 * @param {boolean} [allowEmpty=false] - Whether an empty string is allowed.
 * @returns {boolean} True if the value is numeric.
 */
export function isValidNumber(value, allowEmpty = false) {
  if (allowEmpty && value.trim() === "") return true;
  return /^\d+(\.\d+)?$/.test(value);
}

/**
 * Reset all state containers and notify listeners of the change.
 *
 * Clears people, transactions and collapsed tracking sets, then triggers the
 * after-change callback.
 *
 * @returns {void}
 */
export function resetState() {
  people.length = 0;
  transactions.length = 0;
  collapsedSplit.clear();
  collapsedDetails.clear();
  pool = "";
  afterChange();
}
