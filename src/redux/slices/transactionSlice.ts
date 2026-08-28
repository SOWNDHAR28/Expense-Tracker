import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Transaction } from '../../types/expense';
import { supabase } from '../../services/supabase';

interface TransactionState {
  items: Transaction[];
  loading: boolean;
  error: string | null;
  pendingCount: number;
}

const initialState: TransactionState = {
  items: [],
  loading: false,
  error: null,
  pendingCount: 0,
};

// Async thunks for syncing with Supabase
export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    } catch (error: any) {
      console.error("Supabase fetchTransactions error:", error);
      return rejectWithValue(error.message);
    }
  }
);

export const addTransaction = createAsyncThunk(
  'transactions/addTransaction',
  async (transaction: Transaction, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const userId = state.auth.user?.id;
      
      const { data, error } = await supabase.from('transactions').insert([{
        id: transaction.id,
        user_id: userId,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        note: transaction.note,
        date: transaction.date,
        paymentMethod: transaction.paymentMethod,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      }]).select();
      if (error) throw error;
      return data[0] as Transaction;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateTransaction = createAsyncThunk(
  'transactions/updateTransaction',
  async (transaction: Transaction, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.from('transactions').update({
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        note: transaction.note,
        date: transaction.date,
        paymentMethod: transaction.paymentMethod,
        updatedAt: transaction.updatedAt
      }).eq('id', transaction.id).select();
      if (error) throw error;
      return data[0] as Transaction;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteTransaction = createAsyncThunk(
  'transactions/deleteTransaction',
  async (id: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    clearTransactionsLocally: (state) => {
      state.items = [];
      state.pendingCount = 0;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(addTransaction.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload);
      });
  }
});

export const { 
  clearTransactionsLocally 
} = transactionSlice.actions;
export default transactionSlice.reducer;
