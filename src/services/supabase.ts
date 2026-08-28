import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In a real app, these should be in a .env file
const supabaseUrl = 'https://irmggvbocxbubepuxilt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybWdndmJvY3hidWJlcHV4aWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NDE0MDQsImV4cCI6MjEwMzIxNzQwNH0.oytSvgymw4PioQPA2zBeAuEGvmUyD6O6tPm13elzDzY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
