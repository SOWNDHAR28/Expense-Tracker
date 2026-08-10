export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionDraft {
  type: TransactionType;
  amount: string;
  category: string;
  note: string;
  date: string;
  paymentMethod: string;
}

// Backward compatibility types
export type ExpenseCategory = string;
export type Expense = Transaction;
export type ExpenseDraft = TransactionDraft;
