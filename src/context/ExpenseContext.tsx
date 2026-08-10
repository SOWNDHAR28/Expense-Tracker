import React from "react";
import { useTransactions } from "./TransactionContext";
import { Transaction, TransactionDraft } from "../types/expense";

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useExpenses() {
  const { transactions, loading, addTransaction, updateTransaction, deleteTransaction } =
    useTransactions();

  return {
    expenses: transactions,
    loading,
    addExpense: async (draft: TransactionDraft) => {
      await addTransaction(draft);
    },
    updateExpense: async (item: Transaction) => {
      await updateTransaction(item.id, {
        type: item.type,
        amount: String(item.amount),
        category: item.category,
        note: item.note,
        date: item.date,
        paymentMethod: item.paymentMethod,
      });
    },
    deleteExpense: async (id: string) => {
      await deleteTransaction(id);
    },
  };
}
