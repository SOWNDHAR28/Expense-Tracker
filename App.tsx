import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/context/ThemeContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/redux/store';
import { ActivityIndicator, View, TouchableOpacity, Text, StyleSheet, AppState } from 'react-native';
import { supabase } from './src/services/supabase';
import { setAuth } from './src/redux/slices/authSlice';
import { fetchTransactions, clearTransactionsLocally } from './src/redux/slices/transactionSlice';
import { useAppSelector } from './src/redux/hooks';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';

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

  const deviceLockEnabled = useAppSelector((state) => state.auth.deviceLockEnabled);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  const handleBiometricAuth = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Expense Tracker',
      fallbackLabel: 'Use Passcode',
    });
    if (result.success) {
      setIsUnlocked(true);
    }
  };

  useEffect(() => {
    if (deviceLockEnabled && !isUnlocked) {
      handleBiometricAuth();
    }
  }, [deviceLockEnabled, isUnlocked]);

  // Lock the app when it goes to the background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        if (deviceLockEnabled) {
          setIsUnlocked(false); // Force re-authentication
        }
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState, deviceLockEnabled]);

  if (deviceLockEnabled && !isUnlocked) {
    return (
      <View style={styles.lockScreenContainer}>
        <StatusBar style="light" />
        <View style={styles.lockIconWrapper}>
          <Ionicons name="lock-closed" size={54} color="#6C5CE7" />
        </View>
        <Text style={styles.lockTitle}>App Locked</Text>
        <Text style={styles.lockSubtitle}>Verify your identity to continue</Text>
        
        <TouchableOpacity style={styles.unlockBtn} onPress={handleBiometricAuth} activeOpacity={0.8}>
          <Text style={styles.unlockBtnText}>Unlock App</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  lockScreenContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6C5CE722',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 40,
  },
  unlockBtn: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
  },
  unlockBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  }
});

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
