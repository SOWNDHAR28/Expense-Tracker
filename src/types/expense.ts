export type TransactionType = "income" | "expense" | "lent_borrowed";

export interface Transaction {
  id: string;
  user_id?: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  sync_status?: 'synced' | 'pending' | 'error';
  loanDirection?: 'lent' | 'borrowed';
  loanStatus?: 'open' | 'partial' | 'settled' | 'written_off';
  personName?: string;
  loanId?: string;
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
