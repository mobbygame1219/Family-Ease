// src/utils/balance.ts
import type { Expense, Debt, User } from '@/types';

/**
 * Compute net balances for each user in a group.
 * Positive = they are owed money (creditor).
 * Negative = they owe money (debtor).
 */
export function computeBalances(
  expenses: Expense[],
  currentUserId: string
): Map<string, number> {
  const balances = new Map<string, number>();

  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (split.settled) continue;

      // The payer is owed this split amount from the split's user
      const payerBalance = balances.get(expense.paidById) ?? 0;
      balances.set(expense.paidById, payerBalance + split.amount);

      // The split user owes this amount to the payer
      const userBalance = balances.get(split.userId) ?? 0;
      balances.set(split.userId, userBalance - split.amount);
    }
  }

  return balances;
}

/**
 * Simplify debts using a greedy algorithm.
 * Minimises the number of transactions needed to settle all debts.
 */
export function simplifyDebts(
  balances: Map<string, number>,
  users: Map<string, User>
): Debt[] {
  const creditors: Array<{ id: string; amount: number }> = [];
  const debtors: Array<{ id: string; amount: number }> = [];

  for (const [id, amount] of balances.entries()) {
    if (amount > 0.01) creditors.push({ id, amount });
    else if (amount < -0.01) debtors.push({ id, amount: -amount });
  }

  const debts: Debt[] = [];

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.amount, debtor.amount);

    debts.push({
      from: users.get(debtor.id)!,
      to: users.get(creditor.id)!,
      amount: Math.round(amount * 100) / 100,
    });

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return debts;
}

/**
 * Format a currency amount for display.
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Split an amount equally among N people, handling rounding.
 * The first person absorbs any rounding remainder.
 */
export function splitEqually(total: number, count: number): number[] {
  const base = Math.floor((total / count) * 100) / 100;
  const remainder = Math.round((total - base * count) * 100) / 100;
  const splits = Array(count).fill(base);
  splits[0] = Math.round((splits[0] + remainder) * 100) / 100;
  return splits;
}
