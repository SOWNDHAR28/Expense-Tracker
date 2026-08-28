import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAppSelector } from "../redux/hooks";
import MainTabs from "./MainTabs";
import AddTransactionModal from "../screens/AddTransactionModal";
import AddIncomeScreen from "../screens/AddIncomeScreen";
import AddExpenseScreen from "../screens/AddExpenseScreen";
import CategoriesScreen from "../screens/CategoriesScreen";
import TransactionDetailsScreen from "../screens/TransactionDetailsScreen";
import CategorySummaryScreen from "../screens/CategorySummaryScreen";

import LoginScreen from "../screens/Auth/LoginScreen";
import SignupScreen from "../screens/Auth/SignupScreen";

import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

const Stack = createNativeStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
  </Stack.Navigator>
);

export default function RootNavigator() {
  const { session, isLoading } = useAppSelector(state => state.auth);
  // Temporarily still using ThemeContext since we didn't remove it yet (we will eventually move it to Redux or keep it)
  const { themeColors } = useTheme(); 

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!session ? (
        <Stack.Screen name="AuthStack" component={AuthStack} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="AddTransactionModal"
            component={AddTransactionModal}
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="AddIncome" component={AddIncomeScreen} />
          <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
          <Stack.Screen name="Categories" component={CategoriesScreen} />
          <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
          <Stack.Screen name="CategorySummary" component={CategorySummaryScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
