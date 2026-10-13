import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PaymentMethod = {
  id: string;
  label: string;
  icon: string;
  color: string;
  isDefault?: boolean;
};

export const defaultPaymentMethods: PaymentMethod[] = [
  { id: 'pm_gpay', label: 'GPay', icon: 'google', color: '#4285F4', isDefault: true },
  { id: 'pm_cash', label: 'Cash', icon: 'cash', color: '#2ECC71', isDefault: true },
  { id: 'pm_debit', label: 'Debit Card', icon: 'credit-card', color: '#F39C12', isDefault: true },
  { id: 'pm_credit', label: 'Credit Card', icon: 'credit-card-outline', color: '#9B59B6', isDefault: true },
];

export interface PaymentState {
  items: PaymentMethod[];
}

const initialState: PaymentState = {
  items: defaultPaymentMethods,
};

export const paymentSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    addPaymentMethod: (state, action: PayloadAction<PaymentMethod>) => {
      state.items.push(action.payload);
    },
    removePaymentMethod: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(pm => pm.id !== action.payload || pm.isDefault);
    },
    resetPaymentMethods: (state) => {
      state.items = defaultPaymentMethods;
    },
  },
});

export const { addPaymentMethod, removePaymentMethod, resetPaymentMethods } = paymentSlice.actions;

export default paymentSlice.reducer;
