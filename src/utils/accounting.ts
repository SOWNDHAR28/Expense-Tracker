/**
 * accounting.ts — Centralized transaction classification for the Expense Tracker.
 *
 * SINGLE SOURCE OF TRUTH for deciding whether a transaction contributes to:
 *  - expense totals
 *  - income totals
 *  - cash balance
 *  - dashboard summaries
 *  - analytics / reports
 *  - CSV exports
 *
 * Business rules:
 *  - type === "expense"         → counted in expense totals, reduces cash balance
 *  - type === "income"          → counted in income totals, increases cash balance
 *  - type === "lent_borrowed"   → NOT counted in expense or income totals
 *                                 Cash balance still changes (handled by loan layer)
 *  - write-off expenses are type === "expense" with category "Loan Write-off",
 *    so they are automatically included in expense totals (no special case needed).
 */

import { Transaction, TransactionType } from "../types/expense";

/** Types that appear in ordinary expense reports and totals */
const EXPENSE_TYPES: TransactionType[] = ["expense"];

/** Types that appear in ordinary income reports and totals */
const INCOME_TYPES: TransactionType[] = ["income"];

/**
 * Returns true if a transaction should be counted toward expense totals.
 * Write-off expenses (type === "expense") are included automatically.
 */
export function isExpenseForReporting(t: Pick<Transaction, "type">): boolean {
  return (EXPENSE_TYPES as string[]).includes(t.type);
}

/**
 * Returns true if a transaction should be counted toward income totals.
 */
export function isIncomeForReporting(t: Pick<Transaction, "type">): boolean {
  return (INCOME_TYPES as string[]).includes(t.type);
}

/**
 * Returns true if a transaction should appear in regular transaction history
 * (history screen, category breakdown, budgets).
 * Lent/Borrowed entries are shown separately in the loan ledger, not history.
 */
export function isOrdinaryTransaction(t: Pick<Transaction, "type">): boolean {
  return t.type === "expense" || t.type === "income";
}

/**
 * Filter an array of transactions to only those that count toward expenses.
 */
export function filterExpenses<T extends Pick<Transaction, "type">>(transactions: T[]): T[] {
  return transactions.filter(isExpenseForReporting);
}

/**
 * Filter an array of transactions to only those that count toward income.
 */
export function filterIncome<T extends Pick<Transaction, "type">>(transactions: T[]): T[] {
  return transactions.filter(isIncomeForReporting);
}

/**
 * Compute the total expense amount from an array of transactions.
 * Only type === "expense" entries are included (write-offs are type === "expense").
 */
export function computeExpenseTotal(transactions: Pick<Transaction, "type" | "amount">[]): number {
  return filterExpenses(transactions).reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Compute the total income amount from an array of transactions.
 */
export function computeIncomeTotal(transactions: Pick<Transaction, "type" | "amount">[]): number {
  return filterIncome(transactions).reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Filter transactions to only ordinary ones (expense + income),
 * excluding lent_borrowed entries from history lists.
 */
export function filterOrdinaryTransactions<T extends Pick<Transaction, "type">>(
  transactions: T[]
): T[] {
  return transactions.filter(isOrdinaryTransaction);
}

/**
 * Round a monetary value to 2 decimal places using integer arithmetic
 * to avoid floating-point errors in financial calculations.
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate pending balance for a loan.
 * pending = loan.amount - sum(repayment amounts)
 */
export function computePendingBalance(loanAmount: number, repaidAmounts: number[]): number {
  const totalRepaid = repaidAmounts.reduce((sum, a) => sum + a, 0);
  return roundCurrency(loanAmount - totalRepaid);
}

/**
 * Derive loan status from pending balance and whether it was written off.
 */
export function deriveLoanStatus(
  loanAmount: number,
  repaidAmounts: number[],
  isWrittenOff: boolean
): import("../types/loan").LoanStatus {
  if (isWrittenOff) return "written_off";
  const pending = computePendingBalance(loanAmount, repaidAmounts);
  if (pending <= 0) return "settled";
  if (repaidAmounts.length > 0 && repaidAmounts.some(a => a > 0)) return "partial";
  return "open";
}
