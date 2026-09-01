import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BudgetState {
  limits: Record<string, number>;
}

const initialState: BudgetState = {
  limits: {},
};

const budgetSlice = createSlice({
  name: 'budgets',
  initialState,
  reducers: {
    setCategoryLimit: (state, action: PayloadAction<{ category: string; limit: number }>) => {
      state.limits[action.payload.category] = action.payload.limit;
    },
    removeCategoryLimit: (state, action: PayloadAction<string>) => {
      delete state.limits[action.payload];
    },
    clearAllLimits: (state) => {
      state.limits = {};
    },
  },
});

export const { setCategoryLimit, removeCategoryLimit, clearAllLimits } = budgetSlice.actions;
export default budgetSlice.reducer;
