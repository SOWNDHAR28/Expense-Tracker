import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: any | null; // We would use Supabase User type here
  session: any | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ user: any; session: any }>) => {
      state.user = action.payload.user;
      state.session = action.payload.session;
    },
    clearAuth: (state) => {
      state.user = null;
      state.session = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  },
});

export const { setAuth, clearAuth, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
