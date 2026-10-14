// Loan and repayment type definitions for the Lent / Borrowed tracking feature.

export type LoanDirection = "lent" | "borrowed";
export type LoanStatus = "open" | "partial" | "settled" | "written_off";

export interface Person {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  user_id: string;
  person_id: string;
  person_name?: string; // denormalized for display
  direction: LoanDirection;
  amount: number;
  date: string;
  note?: string;
  payment_method: string;
  status: LoanStatus;
  written_off_expense_id?: string; // links to the expense created on write-off
  created_at: string;
  updated_at: string;
  // Computed client-side
  repayments?: Repayment[];
  pending_balance?: number;
}

export interface Repayment {
  id: string;
  loan_id: string;
  amount: number;
  date: string;
  payment_method: string;
  note?: string;
  idempotency_key: string;
  created_at: string;
}

/**
 * Person-level ledger summary returned by getLedgerForPerson()
 */
export interface PersonLedger {
  person: Person;
  total_lent: number;
  total_received: number;          // repayments against lent loans
  pending_to_receive: number;
  total_borrowed: number;
  total_repaid: number;            // repayments against borrowed loans
  pending_to_pay: number;
  loans: Loan[];
}
