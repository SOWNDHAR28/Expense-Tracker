import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense } from '../types/expense';

const STORAGE_KEY = 'expenses';

export const expenseStorage = {
  async getAll(): Promise<Expense[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async saveAll(expenses: Expense[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  },

  async add(expense: Expense): Promise<void> {
    const expenses = await this.getAll();
    await this.saveAll([expense, ...expenses]);
  },

  async update(updated: Expense): Promise<void> {
    const expenses = await this.getAll();
    const next = expenses.map((item) => (item.id === updated.id ? updated : item));
    await this.saveAll(next);
  },

  async remove(id: string): Promise<void> {
    const expenses = await this.getAll();
    const next = expenses.filter((item) => item.id !== id);
    await this.saveAll(next);
  },
};
