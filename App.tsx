import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/context/ThemeContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/redux/store';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from './src/services/supabase';
import { setAuth } from './src/redux/slices/authSlice';
import { fetchTransactions, clearTransactionsLocally } from './src/redux/slices/transactionSlice';

const Loading = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#6C5CE7" />
  </View>
);

const AppContent = () => {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      store.dispatch(setAuth({ user: session?.user ?? null, session }));
      if (session?.user) {
        // Fetch fresh transactions from cloud when app starts and user is already logged in
        store.dispatch(fetchTransactions());
      }
    });

    supabase.auth.onAuthStateChange((event, session) => {
      store.dispatch(setAuth({ user: session?.user ?? null, session }));
      if (event === 'SIGNED_IN') {
        store.dispatch(fetchTransactions());
      } else if (event === 'SIGNED_OUT') {
        store.dispatch(clearTransactionsLocally());
      }
    });
  }, []);

  return (
    <ThemeProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<Loading />} persistor={persistor}>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
