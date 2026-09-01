import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { CategoryItem } from "../../constants/categories";
import { supabase } from "../../services/supabase";

interface CategoryState {
  customCategories: CategoryItem[];
  loading: boolean;
  error: string | null;
}

const initialState: CategoryState = {
  customCategories: [],
  loading: false,
  error: null,
};

export const fetchCustomCategories = createAsyncThunk(
  'categories/fetchCustomCategories',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.from('custom_categories').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      return data.map((cat: any) => ({
        id: cat.id,
        label: cat.label,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
      })) as CategoryItem[];
    } catch (error: any) {
      console.error("Supabase fetchCustomCategories error:", error);
      return rejectWithValue(error.message);
    }
  }
);

export const addCustomCategoryToCloud = createAsyncThunk(
  'categories/addCustomCategoryToCloud',
  async (category: CategoryItem, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const userId = state.auth.user?.id;
      
      const { data, error } = await supabase.from('custom_categories').insert([{
        id: category.id,
        user_id: userId,
        label: category.label,
        icon: category.icon,
        color: category.color,
        type: category.type,
      }]).select();
      
      if (error) throw error;
      return category;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCustomCategoryInCloud = createAsyncThunk(
  'categories/updateCustomCategoryInCloud',
  async (category: CategoryItem, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.from('custom_categories').update({
        label: category.label,
        icon: category.icon,
        color: category.color,
        type: category.type,
      }).eq('id', category.id).select();
      
      if (error) throw error;
      return category;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteCustomCategoryFromCloud = createAsyncThunk(
  'categories/deleteCustomCategoryFromCloud',
  async (id: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase.from('custom_categories').delete().eq('id', id);
      if (error) throw error;
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const categorySlice = createSlice({
  name: "category",
  initialState,
  reducers: {
    addCustomCategory: (state, action: PayloadAction<CategoryItem>) => {
      const exists = state.customCategories.find((c) => c.id === action.payload.id);
      if (!exists) {
        state.customCategories.push(action.payload);
      }
    },
    removeCustomCategory: (state, action: PayloadAction<string>) => {
      state.customCategories = state.customCategories.filter(
        (c) => c.id !== action.payload
      );
    },
    editCustomCategory: (state, action: PayloadAction<CategoryItem>) => {
      const index = state.customCategories.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.customCategories[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomCategories.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCustomCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.customCategories = action.payload;
        state.error = null;
      })
      .addCase(fetchCustomCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(addCustomCategoryToCloud.fulfilled, (state, action) => {
        const exists = state.customCategories.find((c) => c.id === action.payload.id);
        if (!exists) {
          state.customCategories.push(action.payload);
        }
      })
      .addCase(updateCustomCategoryInCloud.fulfilled, (state, action) => {
        const index = state.customCategories.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.customCategories[index] = action.payload;
        }
      })
      .addCase(deleteCustomCategoryFromCloud.fulfilled, (state, action) => {
        state.customCategories = state.customCategories.filter((c) => c.id !== action.payload);
      });
  },
});

export const { addCustomCategory, removeCustomCategory, editCustomCategory } = categorySlice.actions;
export default categorySlice.reducer;
