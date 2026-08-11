import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Transaction, TransactionDraft, TransactionType } from "../types/expense";
import { getCategoryById, CategoryItem, incomeCategories as staticIncomeCategories, expenseCategories as staticExpenseCategories } from "../constants/categories";
import { dbService } from "../storage/db";

type TransactionContextValue = {
  loading: boolean;
  transactions: Transaction[];
  incomeCategories: CategoryItem[];
  expenseCategories: CategoryItem[];
  allCategories: CategoryItem[];
  addTransaction: (input: TransactionDraft) => Promise<void>;
  updateTransaction: (id: string, input: Partial<TransactionDraft>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  addCustomCategory: (cat: CategoryItem) => Promise<void>;
  incomeTotal: number;
  expenseTotal: number;
  netBalance: number;
  savingsRate: number;
  recentTransactions: Transaction[];
  getCategoryMeta: (categoryIdOrLabel: string) => {
    label: string;
    icon: string;
    color: string;
    type: TransactionType;
  };
  exportDataJSON: () => string;
  exportDataCSV: () => string;
};

const TransactionContext = createContext<TransactionContextValue | undefined>(undefined);

// Helper helper functions
const yesterdayFormatted = (hours = 0, minutes = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

const todayFormatted = (hours = 0, minutes = 0) => {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

const defaultSeedData: Transaction[] = [
  {
    id: "tx_1",
    type: "income",
    amount: 50000,
    category: "Salary",
    note: "Monthly Paycheck",
    date: todayFormatted(9, 0),
    paymentMethod: "Bank Transfer",
    createdAt: todayFormatted(9, 0),
    updatedAt: todayFormatted(9, 0),
  },
  {
    id: "tx_2",
    type: "expense",
    amount: 3850,
    category: "Food",
    note: "Weekly groceries at DMart",
    date: todayFormatted(18, 0),
    paymentMethod: "UPI / QR",
    createdAt: todayFormatted(18, 0),
    updatedAt: todayFormatted(18, 0),
  },
  {
    id: "tx_3",
    type: "expense",
    amount: 2450,
    category: "Transport",
    note: "Car fuel refill",
    date: todayFormatted(11, 30),
    paymentMethod: "Credit Card",
    createdAt: todayFormatted(11, 30),
    updatedAt: todayFormatted(11, 30),
  },
  {
    id: "tx_4",
    type: "income",
    amount: 12000,
    category: "Freelance",
    note: "Logo design payout",
    date: yesterdayFormatted(15, 0),
    paymentMethod: "UPI / QR",
    createdAt: yesterdayFormatted(15, 0),
    updatedAt: yesterdayFormatted(15, 0),
  },
  {
    id: "tx_5",
    type: "expense",
    amount: 1250,
    category: "Food",
    note: "Family dinner",
    date: yesterdayFormatted(19, 30),
    paymentMethod: "Credit Card",
    createdAt: yesterdayFormatted(19, 30),
    updatedAt: yesterdayFormatted(19, 30),
  },
];

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        // Load transactions from SQLite database
        const saved = dbService.getAllTransactions();
        setTransactions(saved || []);

        // Load custom categories from SQLite
        const customCats = dbService.getCustomCategories();
        setCustomCategories(customCats);
      } catch (err) {
        console.error("Failed to load transactions/categories on startup:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Merge static and dynamic custom categories
  const incomeCategories = useMemo(() => {
    return [...staticIncomeCategories, ...customCategories.filter((c) => c.type === "income")];
  }, [customCategories]);

  const expenseCategories = useMemo(() => {
    return [...staticExpenseCategories, ...customCategories.filter((c) => c.type === "expense")];
  }, [customCategories]);

  const allCategories = useMemo(() => {
    return [...incomeCategories, ...expenseCategories];
  }, [incomeCategories, expenseCategories]);

  const value = useMemo<TransactionContextValue>(() => {
    const incomeTotal = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseTotal = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = incomeTotal - expenseTotal;
    const savingsRate = incomeTotal > 0 ? Number(((netBalance / incomeTotal) * 100).toFixed(1)) : 0;

    const recentTransactions = [...transactions]
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 5);

    return {
      loading,
      transactions,
      incomeCategories,
      expenseCategories,
      allCategories,
      incomeTotal,
      expenseTotal,
      netBalance,
      savingsRate,
      recentTransactions,
      getCategoryMeta: (categoryIdOrLabel) => {
        const item = allCategories.find(
          (c) => c.id.toLowerCase() === categoryIdOrLabel.toLowerCase() || c.label.toLowerCase() === categoryIdOrLabel.toLowerCase()
        ) || {
          id: "other",
          label: categoryIdOrLabel || "Other",
          icon: "dots-horizontal",
          color: "#95A5A6",
          type: "expense" as const,
        };
        return {
          label: item.label,
          icon: item.icon,
          color: item.color,
          type: item.type,
        };
      },
      addTransaction: async (input) => {
        const now = new Date().toISOString();
        const next: Transaction = {
          id: `tx_${Date.now()}`,
          type: input.type,
          amount: Number(input.amount),
          category: input.category,
          note: input.note || "",
          date: input.date || now,
          paymentMethod: input.paymentMethod || "Cash",
          createdAt: now,
          updatedAt: now,
        };
        dbService.addTransaction(next);
        setTransactions((prev) => [next, ...prev]);
      },
      updateTransaction: async (id, input) => {
        const now = new Date().toISOString();
        const mappedInput: Partial<Transaction> = {
          ...input,
          amount: input.amount !== undefined ? Number(input.amount) : undefined,
        };
        dbService.updateTransaction(id, mappedInput);
        setTransactions((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            return {
              ...item,
              ...input,
              amount: input.amount !== undefined ? Number(input.amount) : item.amount,
              updatedAt: now,
            };
          })
        );
      },
      deleteTransaction: async (id) => {
        dbService.deleteTransaction(id);
        setTransactions((prev) => prev.filter((item) => item.id !== id));
      },
      clearAll: async () => {
        dbService.clearAllTransactions();
        setTransactions([]);
      },
      addCustomCategory: async (cat) => {
        dbService.addCustomCategory(cat);
        setCustomCategories((prev) => [...prev, cat]);
      },
      exportDataJSON: () => JSON.stringify(transactions, null, 2),
      exportDataCSV: () => {
        const headers = ["ID", "Type", "Category", "Amount", "Note", "Date", "Payment Method"];
        const rows = transactions.map((t) =>
          [t.id, t.type, `"${t.category}"`, t.amount, `"${t.note}"`, `"${t.date}"`, `"${t.paymentMethod}"`].join(",")
        );
        return [headers.join(","), ...rows].join("\n");
      },
    };
  }, [loading, transactions, incomeCategories, expenseCategories, allCategories]);

  return <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>;
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error("useTransactions must be used within TransactionProvider");
  return ctx;
}