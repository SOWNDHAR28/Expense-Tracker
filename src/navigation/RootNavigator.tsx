import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import AuthScreen from "../screens/AuthScreen";
import MainTabs from "./MainTabs";
import AddTransactionModal from "../screens/AddTransactionModal";
import AddIncomeScreen from "../screens/AddIncomeScreen";
import AddExpenseScreen from "../screens/AddExpenseScreen";
import CategoriesScreen from "../screens/CategoriesScreen";
import TransactionDetailsScreen from "../screens/TransactionDetailsScreen";

import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

import CategorySummaryScreen from "../screens/CategorySummaryScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { loading, username } = useAuth();
  const { themeColors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!username ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
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
