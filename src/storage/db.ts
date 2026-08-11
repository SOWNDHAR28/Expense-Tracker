import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Transaction } from "../types/expense";
import { CategoryItem } from "../constants/categories";

const DB_NAME = "expense_tracker.db";

// Open the database synchronously
let db: SQLite.SQLiteDatabase;
try {
  db = SQLite.openDatabaseSync(DB_NAME);
} catch (error) {
  console.error("Failed to open SQLite database:", error);
  throw error;
}

// Initialize tables and run migration in background
export async function initializeDatabase(): Promise<void> {
  try {
    // 1. Create Users Table (using id = 1 as single user profile row)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        pin TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // 2. Create Transactions Table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        note TEXT,
        date TEXT NOT NULL,
        payment_method TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 3. Create Custom Categories Table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS custom_categories (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        type TEXT NOT NULL
      );
    `);

    // 4. Seeding of July & August 2026 disabled to keep a clean zero starting point
    // seedTestData();

    // 5. Migrate data from AsyncStorage if applicable
    await migrateFromAsyncStorage();
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
}

function seedTestData() {
  try {
    const existing = db.getFirstSync<any>("SELECT COUNT(*) as count FROM transactions;");
    if (existing && existing.count > 0) return;

    const testSeedTransactions = [
      // July 2026
      {
        id: "tx_july_1",
        type: "income",
        amount: 50000,
        category: "Salary",
        note: "July Monthly Salary",
        date: "2026-07-05T09:00:00.000Z",
        paymentMethod: "Bank Transfer",
        createdAt: "2026-07-05T09:00:00.000Z",
        updatedAt: "2026-07-05T09:00:00.000Z",
      },
      {
        id: "tx_july_2",
        type: "expense",
        amount: 15000,
        category: "Rent",
        note: "July Apartment Rent",
        date: "2026-07-06T10:30:00.000Z",
        paymentMethod: "UPI / QR",
        createdAt: "2026-07-06T10:30:00.000Z",
        updatedAt: "2026-07-06T10:30:00.000Z",
      },
      {
        id: "tx_july_3",
        type: "expense",
        amount: 4500,
        category: "Food",
        note: "July Groceries",
        date: "2026-07-12T18:00:00.000Z",
        paymentMethod: "Credit Card",
        createdAt: "2026-07-12T18:00:00.000Z",
        updatedAt: "2026-07-12T18:00:00.000Z",
      },
      {
        id: "tx_july_4",
        type: "income",
        amount: 15000,
        category: "Freelance",
        note: "Website Project Payout",
        date: "2026-07-18T15:00:00.000Z",
        paymentMethod: "Bank Transfer",
        createdAt: "2026-07-18T15:00:00.000Z",
        updatedAt: "2026-07-18T15:00:00.000Z",
      },
      {
        id: "tx_july_5",
        type: "expense",
        amount: 2200,
        category: "Bills",
        note: "July Electricity Bill",
        date: "2026-07-20T11:00:00.000Z",
        paymentMethod: "UPI / QR",
        createdAt: "2026-07-20T11:00:00.000Z",
        updatedAt: "2026-07-20T11:00:00.000Z",
      },
      // August 2026
      {
        id: "tx_aug_1",
        type: "income",
        amount: 50000,
        category: "Salary",
        note: "August Monthly Salary",
        date: "2026-08-01T09:00:00.000Z",
        paymentMethod: "Bank Transfer",
        createdAt: "2026-08-01T09:00:00.000Z",
        updatedAt: "2026-08-01T09:00:00.000Z",
      },
      {
        id: "tx_aug_2",
        type: "expense",
        amount: 3850,
        category: "Food",
        note: "DMart Grocery Superstore",
        date: "2026-08-03T17:30:00.000Z",
        paymentMethod: "UPI / QR",
        createdAt: "2026-08-03T17:30:00.000Z",
        updatedAt: "2026-08-03T17:30:00.000Z",
      },
      {
        id: "tx_aug_3",
        type: "expense",
        amount: 2450,
        category: "Transport",
        note: "Car Fuel Fill",
        date: "2026-08-05T11:30:00.000Z",
        paymentMethod: "Credit Card",
        createdAt: "2026-08-05T11:30:00.000Z",
        updatedAt: "2026-08-05T11:30:00.000Z",
      },
      {
        id: "tx_aug_4",
        type: "income",
        amount: 12000,
        category: "Freelance",
        note: "Logo & UI Design",
        date: "2026-08-08T14:00:00.000Z",
        paymentMethod: "UPI / QR",
        createdAt: "2026-08-08T14:00:00.000Z",
        updatedAt: "2026-08-08T14:00:00.000Z",
      },
      {
        id: "tx_aug_5",
        type: "expense",
        amount: 4200,
        category: "Shopping",
        note: "New clothes & shoes",
        date: "2026-08-09T19:00:00.000Z",
        paymentMethod: "Credit Card",
        createdAt: "2026-08-09T19:00:00.000Z",
        updatedAt: "2026-08-09T19:00:00.000Z",
      },
    ];

    for (const t of testSeedTransactions) {
      db.runSync(
        `INSERT OR IGNORE INTO transactions 
        (id, type, amount, category, note, date, payment_method, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        t.id,
        t.type,
        t.amount,
        t.category,
        t.note,
        t.date,
        t.paymentMethod,
        t.createdAt,
        t.updatedAt
      );
    }
  } catch (err) {
    console.error("Failed to seed test data:", err);
  }
}

async function migrateFromAsyncStorage() {
  try {
    const migrationFlag = await AsyncStorage.getItem("sqlite_migration_complete_v2");
    if (migrationFlag === "true") return; // Already migrated

    // Migrate Auth Credentials
    const rawAuth = await AsyncStorage.getItem("et_auth_v1");
    if (rawAuth) {
      const auth = JSON.parse(rawAuth);
      if (auth && auth.username && auth.pin) {
        db.runSync(
          "INSERT OR REPLACE INTO users (id, username, pin, created_at) VALUES (1, ?, ?, ?);",
          auth.username.trim(),
          auth.pin.trim(),
          new Date().toISOString()
        );
      }
    }

    // Migrate Transactions
    const rawTx = await AsyncStorage.getItem("et_transactions_v1");
    if (rawTx) {
      const transactions = JSON.parse(rawTx) as Transaction[];
      if (Array.isArray(transactions)) {
        for (const t of transactions) {
          db.runSync(
            `INSERT OR IGNORE INTO transactions 
            (id, type, amount, category, note, date, payment_method, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            t.id,
            t.type,
            t.amount,
            t.category,
            t.note || "",
            t.date,
            t.paymentMethod || "Cash",
            t.createdAt || t.date,
            t.updatedAt || t.date
          );
        }
      }
    }

    // Mark migration as complete
    await AsyncStorage.setItem("sqlite_migration_complete_v2", "true");
    console.log("AsyncStorage to SQLite migration completed successfully.");
  } catch (error) {
    console.error("Migration from AsyncStorage failed:", error);
  }
}

// Database helper functions (Synchronous executions for maximum speed)
export const dbService = {
  // --- User Queries ---
  getUser(): { username: string; pin: string } | null {
    try {
      const row = db.getFirstSync<{ username: string; pin: string }>(
        "SELECT username, pin FROM users ORDER BY id DESC LIMIT 1;"
      );
      return row || null;
    } catch (error) {
      console.error("Failed to query user:", error);
      return null;
    }
  },

  createUser(username: string, pin: string): void {
    db.runSync(
      "INSERT OR REPLACE INTO users (id, username, pin, created_at) VALUES (1, ?, ?, ?);",
      username,
      pin,
      new Date().toISOString()
    );
  },

  // --- Custom Categories Queries ---
  getCustomCategories(): CategoryItem[] {
    try {
      const rows = db.getAllSync<any>(
        "SELECT * FROM custom_categories ORDER BY label ASC;"
      );
      return rows.map((row: any) => ({
        id: row.id,
        label: row.label,
        icon: row.icon,
        color: row.color,
        type: row.type as any,
      }));
    } catch (error) {
      console.error("Failed to query custom categories:", error);
      return [];
    }
  },

  addCustomCategory(cat: CategoryItem): void {
    db.runSync(
      "INSERT OR REPLACE INTO custom_categories (id, label, icon, color, type) VALUES (?, ?, ?, ?, ?);",
      cat.id,
      cat.label,
      cat.icon,
      cat.color,
      cat.type
    );
  },

  // --- Transaction Queries ---
  getAllTransactions(): Transaction[] {
    try {
      const rows = db.getAllSync<any>(
        "SELECT * FROM transactions ORDER BY date DESC;"
      );
      return rows.map((row: any) => ({
        id: row.id,
        type: row.type as any,
        amount: row.amount,
        category: row.category,
        note: row.note || "",
        date: row.date,
        paymentMethod: row.payment_method || "Cash",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error("Failed to query transactions:", error);
      return [];
    }
  },

  addTransaction(t: Transaction): void {
    db.runSync(
      `INSERT OR REPLACE INTO transactions 
      (id, type, amount, category, note, date, payment_method, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      t.id,
      t.type,
      t.amount,
      t.category,
      t.note || "",
      t.date,
      t.paymentMethod || "Cash",
      t.createdAt,
      t.updatedAt
    );
  },

  updateTransaction(id: string, fields: Partial<Transaction>): void {
    const existing = db.getFirstSync<any>("SELECT * FROM transactions WHERE id = ?;", id);
    if (!existing) return;

    const type = fields.type ?? existing.type;
    const amount = fields.amount !== undefined ? Number(fields.amount) : existing.amount;
    const category = fields.category ?? existing.category;
    const note = fields.note !== undefined ? fields.note : existing.note;
    const date = fields.date ?? existing.date;
    const paymentMethod = fields.paymentMethod ?? existing.payment_method;
    const updatedAt = new Date().toISOString();

    db.runSync(
      `UPDATE transactions 
      SET type = ?, amount = ?, category = ?, note = ?, date = ?, payment_method = ?, updated_at = ? 
      WHERE id = ?;`,
      type,
      amount,
      category,
      note,
      date,
      paymentMethod,
      updatedAt,
      id
    );
  },

  deleteTransaction(id: string): void {
    db.runSync("DELETE FROM transactions WHERE id = ?;", id);
  },

  clearAllTransactions(): void {
    db.runSync("DELETE FROM transactions;");
  },

  clearAllData(): void {
    try {
      db.runSync("DELETE FROM transactions;");
      db.runSync("DELETE FROM custom_categories;");
      db.runSync("DELETE FROM users;");
      AsyncStorage.removeItem("sqlite_migration_complete_v2");
      AsyncStorage.removeItem("et_auth_v1");
      AsyncStorage.removeItem("et_transactions_v1");
    } catch (error) {
      console.error("Failed to clear all database data:", error);
    }
  },
};
