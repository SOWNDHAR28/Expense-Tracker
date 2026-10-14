import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Loan, Repayment, Person, PersonLedger, LoanStatus } from "../../types/loan";
import { supabase } from "../../services/supabase";
import { computePendingBalance, deriveLoanStatus, roundCurrency } from "../../utils/accounting";
import * as Crypto from "expo-crypto";
import { dbService } from "../../storage/db";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
interface LoanState {
  loans: Loan[];
  persons: Person[];
  loading: boolean;
  error: string | null;
}

const initialState: LoanState = {
  loans: [],
  persons: [],
  loading: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Attach repayments and compute pending_balance / status on a loan object */
function hydrateLoan(loan: any, repayments: Repayment[]): Loan {
  const loanRepayments = repayments.filter((r) => r.loan_id === loan.id);
  const repaidAmounts = loanRepayments.map((r) => r.amount);
  const pending = computePendingBalance(loan.amount, repaidAmounts);
  const status = deriveLoanStatus(
    loan.amount,
    repaidAmounts,
    loan.status === "written_off"
  );

  return {
    ...loan,
    repayments: loanRepayments,
    pending_balance: pending,
    status,
  };
}

let hasLoggedSchemaCacheNotice = false;
let hasLoggedPermissionNotice = false;

function logSupabaseSyncWarning(context: string, err: any) {
  const isSchemaMissing =
    err?.code === "PGRST205" ||
    (typeof err?.message === "string" && err.message.includes("schema cache"));

  // RLS "permission denied" — tables exist in Supabase but user has no access
  // (e.g. unauthenticated session or wrong user_id). Fall back to SQLite silently.
  const isPermissionDenied =
    err?.code === "42501" ||
    (typeof err?.message === "string" && err.message.toLowerCase().includes("permission denied"));

  if (isSchemaMissing) {
    if (!hasLoggedSchemaCacheNotice) {
      hasLoggedSchemaCacheNotice = true;
      console.info(
        "ℹ️ [Lent/Borrowed] Supabase tables ('persons', 'loans', 'repayments') not yet created in cloud database. Running locally via SQLite. Run 'supabase/migrations/001_loans.sql' in your Supabase SQL Editor to enable cloud sync."
      );
    }
  } else if (isPermissionDenied) {
    if (!hasLoggedPermissionNotice) {
      hasLoggedPermissionNotice = true;
      console.info(
        "ℹ️ [Lent/Borrowed] Supabase returned permission denied (RLS). Running locally via SQLite until cloud authentication is set up."
      );
    }
  } else {
    console.warn(`${context}:`, err?.message || err);
  }
}

// ---------------------------------------------------------------------------
// Thunks — Persons
// ---------------------------------------------------------------------------

export const fetchPersons = createAsyncThunk(
  "loans/fetchPersons",
  async (_, { getState }) => {
    const state = getState() as any;
    const userId = state.auth.user?.id;
    try {
      const { data, error } = await supabase
        .from("persons")
        .select("*")
        .eq("user_id", userId)
        .order("name");
      if (error) throw error;
      if (Array.isArray(data)) {
        for (const p of data) {
          dbService.insertPerson(p);
        }
      }
      return data as Person[];
    } catch (err: any) {
      logSupabaseSyncWarning("Supabase fetchPersons fallback to local SQLite", err);
      const local = dbService.getPersons();
      if (local && local.length > 0) {
        return local as Person[];
      }
      return (state.loans?.persons ?? []) as Person[];
    }
  }
);

export const createPerson = createAsyncThunk(
  "loans/createPerson",
  async (
    payload: { name: string; phone?: string },
    { getState }
  ) => {
    const state = getState() as any;
    const userId = state.auth.user?.id;
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from("persons")
        .insert([
          {
            user_id: userId,
            name: payload.name.trim(),
            phone: payload.phone?.trim() || null,
            created_at: now,
            updated_at: now,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      dbService.insertPerson(data as Person);
      return data as Person;
    } catch (err: any) {
      logSupabaseSyncWarning("Supabase createPerson fallback to local SQLite", err);
      const localPerson: Person = {
        id: Crypto.randomUUID(),
        user_id: userId || "",
        name: payload.name.trim(),
        phone: payload.phone?.trim() || undefined,
        created_at: now,
        updated_at: now,
      };
      dbService.insertPerson(localPerson);
      return localPerson;
    }
  }
);

// ---------------------------------------------------------------------------
// Thunks — Loans
// ---------------------------------------------------------------------------

export const fetchLoans = createAsyncThunk(
  "loans/fetchLoans",
  async (
    filters: { status?: LoanStatus; person_id?: string } | undefined,
    { getState }
  ) => {
    const state = getState() as any;
    const userId = state.auth.user?.id;

    try {
      let query = supabase
        .from("loans")
        .select("*, persons(name)")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.person_id) query = query.eq("person_id", filters.person_id);

      const { data: loansData, error: loansError } = await query;
      if (loansError) throw loansError;

      // Fetch all repayments for these loans in one query
      const loanIds = (loansData as any[]).map((l) => l.id);
      let repayments: Repayment[] = [];
      if (loanIds.length > 0) {
        const { data: rData, error: rError } = await supabase
          .from("repayments")
          .select("*")
          .in("loan_id", loanIds)
          .order("date", { ascending: true });
        if (rError) throw rError;
        repayments = rData as Repayment[];
      }

      // Denormalize person_name
      const loans = (loansData as any[]).map((l) => ({
        ...l,
        person_name: l.persons?.name ?? "",
        persons: undefined,
      }));

      // Cache locally
      for (const l of loans) dbService.insertLoan(l);
      for (const r of repayments) dbService.insertRepayment(r);

      return { loans, repayments };
    } catch (err: any) {
      logSupabaseSyncWarning("Supabase fetchLoans fallback to local SQLite", err);
      let localLoans = dbService.getLoans();
      if (filters?.status) localLoans = localLoans.filter((l: any) => l.status === filters.status);
      if (filters?.person_id) localLoans = localLoans.filter((l: any) => l.person_id === filters.person_id);

      const localRepayments = dbService.getRepayments();
      const localPersons = dbService.getPersons();
      const personsMap = new Map(localPersons.map((p: any) => [p.id, p.name]));
      (state.loans?.persons ?? []).forEach((p: any) => personsMap.set(p.id, p.name));

      const loans = localLoans.map((l: any) => ({
        ...l,
        person_name: l.person_name || personsMap.get(l.person_id) || "Unknown",
      }));

      return { loans, repayments: localRepayments };
    }
  }
);

export const createLoan = createAsyncThunk(
  "loans/createLoan",
  async (
    payload: {
      person_id: string;
      person_name: string;
      direction: "lent" | "borrowed";
      amount: number;
      date: string;
      payment_method: string;
      note?: string;
    },
    { getState, rejectWithValue }
  ) => {
    const state = getState() as any;
    const userId = state.auth.user?.id;
    const now = new Date().toISOString();

    if (!payload.amount || payload.amount <= 0) {
      return rejectWithValue("Enter an amount greater than 0");
    }

    const roundedAmount = roundCurrency(payload.amount);

    try {
      const { data, error } = await supabase
        .from("loans")
        .insert([
          {
            user_id: userId,
            person_id: payload.person_id,
            direction: payload.direction,
            amount: roundedAmount,
            date: payload.date,
            note: payload.note?.trim() || null,
            payment_method: payload.payment_method,
            status: "open",
            created_at: now,
            updated_at: now,
          },
        ])
        .select()
        .single();
      if (error) throw error;

      const loanObj: Loan = {
        ...data,
        person_name: payload.person_name,
        repayments: [],
        pending_balance: roundedAmount,
      };
      dbService.insertLoan(loanObj);
      return loanObj;
    } catch (err: any) {
      logSupabaseSyncWarning("Supabase createLoan fallback to local SQLite", err);
      const localLoan: Loan = {
        id: Crypto.randomUUID(),
        user_id: userId || "",
        person_id: payload.person_id,
        person_name: payload.person_name,
        direction: payload.direction,
        amount: roundedAmount,
        date: payload.date,
        note: payload.note?.trim() || undefined,
        payment_method: payload.payment_method,
        status: "open",
        created_at: now,
        updated_at: now,
        repayments: [],
        pending_balance: roundedAmount,
      };
      dbService.insertLoan(localLoan);
      return localLoan;
    }
  }
);

export const addRepayment = createAsyncThunk(
  "loans/addRepayment",
  async (
    payload: {
      loan: Loan;
      amount: number;
      date: string;
      payment_method: string;
      note?: string;
      idempotency_key: string;
    },
    { rejectWithValue }
  ) => {
    const { loan, amount, date, payment_method, note, idempotency_key } = payload;

    // Client-side validation
    const pending = loan.pending_balance ?? computePendingBalance(
      loan.amount,
      (loan.repayments ?? []).map((r) => r.amount)
    );

    if (amount <= 0) {
      return rejectWithValue("Enter an amount greater than 0");
    }
    if (roundCurrency(amount) > roundCurrency(pending)) {
      return rejectWithValue(
        `Repayment can't be more than ₹${pending.toLocaleString("en-IN")} pending`
      );
    }
    if (new Date(date) < new Date(loan.date)) {
      return rejectWithValue("Date can't be before the loan date");
    }
    if (loan.status === "settled" || loan.status === "written_off") {
      return rejectWithValue(
        `This loan is already ${loan.status} and cannot be repaid`
      );
    }

    const now = new Date().toISOString();
    const roundedAmount = roundCurrency(amount);

    const allRepaidAmounts = [
      ...(loan.repayments ?? []).map((r) => r.amount),
      roundedAmount,
    ];
    const newPending = computePendingBalance(loan.amount, allRepaidAmounts);
    const newStatus: LoanStatus = newPending <= 0 ? "settled" : "partial";

    try {
      const { data, error } = await supabase
        .from("repayments")
        .upsert(
          [
            {
              loan_id: loan.id,
              amount: roundedAmount,
              date,
              payment_method,
              note: note?.trim() || null,
              idempotency_key,
              created_at: now,
            },
          ],
          { onConflict: "loan_id,idempotency_key", ignoreDuplicates: true }
        )
        .select()
        .single();
      if (error) throw error;

      await supabase
        .from("loans")
        .update({ status: newStatus, updated_at: now })
        .eq("id", loan.id);

      dbService.insertRepayment(data as Repayment);
      dbService.updateLoanStatus(loan.id, newStatus);

      return { repayment: data as Repayment, loanId: loan.id, newStatus, newPending };
    } catch (err: any) {
      logSupabaseSyncWarning("Supabase addRepayment fallback to local SQLite", err);
      const localRepayment: Repayment = {
        id: Crypto.randomUUID(),
        loan_id: loan.id,
        amount: roundedAmount,
        date,
        payment_method,
        note: note?.trim() || undefined,
        idempotency_key,
        created_at: now,
      };
      dbService.insertRepayment(localRepayment);
      dbService.updateLoanStatus(loan.id, newStatus);
      return { repayment: localRepayment, loanId: loan.id, newStatus, newPending };
    }
  }
);

export const writeOffLoan = createAsyncThunk(
  "loans/writeOffLoan",
  async (
    payload: {
      loan: Loan;
      writeOffDate: string;
      expenseId: string;
    },
    { getState, rejectWithValue }
  ) => {
    const { loan, writeOffDate, expenseId } = payload;
    const state = getState() as any;
    const userId = state.auth.user?.id;

    if (loan.direction !== "lent") {
      return rejectWithValue(
        "Write-off is only supported for money you lent. Borrowed loans must be repaid."
      );
    }
    if (loan.status === "settled") {
      return rejectWithValue("This loan is already settled and cannot be written off.");
    }
    if (loan.status === "written_off") {
      return rejectWithValue("This loan has already been written off.");
    }

    const pending = loan.pending_balance ?? computePendingBalance(
      loan.amount,
      (loan.repayments ?? []).map((r) => r.amount)
    );

    if (pending <= 0) {
      return rejectWithValue("No outstanding balance to write off.");
    }

    const now = new Date().toISOString();
    const writeOffExpense: any = {
      id: expenseId,
      user_id: userId,
      type: "expense",
      amount: roundCurrency(pending),
      category: "Loan Write-off",
      note: `Write-off: ${loan.person_name ?? "Unnamed"} (₹${pending.toLocaleString("en-IN")})`,
      date: writeOffDate,
      paymentMethod: loan.payment_method,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const { error: txError } = await supabase.from("transactions").insert([writeOffExpense]);
      if (txError) throw txError;

      const { error: loanError } = await supabase
        .from("loans")
        .update({
          status: "written_off",
          written_off_expense_id: expenseId,
          updated_at: now,
        })
        .eq("id", loan.id);
      if (loanError) throw loanError;

      dbService.addTransaction(writeOffExpense);
      dbService.updateLoanStatus(loan.id, "written_off", expenseId);

      return {
        loanId: loan.id,
        expenseId,
        writeOffAmount: roundCurrency(pending),
        writeOffDate,
      };
    } catch (err: any) {
      logSupabaseSyncWarning("Supabase writeOffLoan fallback to local SQLite", err);
      dbService.addTransaction(writeOffExpense);
      dbService.updateLoanStatus(loan.id, "written_off", expenseId);
      return {
        loanId: loan.id,
        expenseId,
        writeOffAmount: roundCurrency(pending),
        writeOffDate,
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------
const loanSlice = createSlice({
  name: "loans",
  initialState,
  reducers: {
    clearLoans: (state) => {
      state.loans = [];
      state.persons = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ---- fetchPersons ----
    builder
      .addCase(fetchPersons.fulfilled, (state, action) => {
        state.persons = action.payload;
      })
      .addCase(createPerson.fulfilled, (state, action) => {
        state.persons.push(action.payload);
      })
      // ---- fetchLoans ----
      .addCase(fetchLoans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLoans.fulfilled, (state, action) => {
        state.loading = false;
        const { loans, repayments } = action.payload;
        state.loans = loans.map((l) => hydrateLoan(l, repayments));
      })
      .addCase(fetchLoans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ---- createLoan ----
      .addCase(createLoan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLoan.fulfilled, (state, action) => {
        state.loading = false;
        state.loans.unshift(action.payload);
      })
      .addCase(createLoan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ---- addRepayment ----
      .addCase(addRepayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addRepayment.fulfilled, (state, action) => {
        state.loading = false;
        const { repayment, loanId, newStatus, newPending } = action.payload;
        const idx = state.loans.findIndex((l) => l.id === loanId);
        if (idx !== -1) {
          const loan = state.loans[idx];
          state.loans[idx] = {
            ...loan,
            status: newStatus,
            pending_balance: newPending,
            repayments: [...(loan.repayments ?? []), repayment],
          };
        }
      })
      .addCase(addRepayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ---- writeOffLoan ----
      .addCase(writeOffLoan.fulfilled, (state, action) => {
        const { loanId } = action.payload;
        const idx = state.loans.findIndex((l) => l.id === loanId);
        if (idx !== -1) {
          state.loans[idx] = {
            ...state.loans[idx],
            status: "written_off",
            pending_balance: 0,
          };
        }
      })
      .addCase(writeOffLoan.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearLoans } = loanSlice.actions;
export default loanSlice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Aggregate outstanding to-receive / to-pay balances across all open loans */
export function selectLoanSummary(loans: Loan[]): {
  totalToReceive: number;
  totalToPay: number;
} {
  let totalToReceive = 0;
  let totalToPay = 0;

  for (const loan of loans) {
    if (loan.status === "settled" || loan.status === "written_off") continue;
    const pending = loan.pending_balance ?? 0;
    if (loan.direction === "lent") totalToReceive += pending;
    else totalToPay += pending;
  }

  return {
    totalToReceive: roundCurrency(totalToReceive),
    totalToPay: roundCurrency(totalToPay),
  };
}

/** Build a PersonLedger from a flat loans array for a given person */
export function selectPersonLedger(person: Person, loans: Loan[]): PersonLedger {
  const personLoans = loans.filter((l) => l.person_id === person.id);

  let total_lent = 0;
  let total_received = 0;
  let total_borrowed = 0;
  let total_repaid = 0;

  for (const loan of personLoans) {
    const repaidTotal = roundCurrency(
      (loan.repayments ?? []).reduce((s, r) => s + r.amount, 0)
    );
    if (loan.direction === "lent") {
      total_lent += loan.amount;
      total_received += repaidTotal;
    } else {
      total_borrowed += loan.amount;
      total_repaid += repaidTotal;
    }
  }

  return {
    person,
    total_lent: roundCurrency(total_lent),
    total_received: roundCurrency(total_received),
    pending_to_receive: roundCurrency(total_lent - total_received),
    total_borrowed: roundCurrency(total_borrowed),
    total_repaid: roundCurrency(total_repaid),
    pending_to_pay: roundCurrency(total_borrowed - total_repaid),
    loans: personLoans,
  };
}
