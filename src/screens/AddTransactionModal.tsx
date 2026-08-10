import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";

export default function AddTransactionModal() {
  const navigation = useNavigation<any>();
  const { themeColors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.closeButton, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
          >
            <Ionicons name="close" size={26} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Add Transaction</Text>
          <View style={{ width: 46 }} />
        </View>

        {/* Prompt */}
        <Text style={[styles.promptTitle, { color: themeColors.text }]}>
          What do you want to add?
        </Text>

        {/* Option 1: Income */}
        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: themeColors.softIncome, borderColor: themeColors.income + "44" }]}
          activeOpacity={0.85}
          onPress={() => {
            navigation.replace("AddIncome");
          }}
        >
          <View style={[styles.iconCircle, { backgroundColor: themeColors.income }]}>
            <Ionicons name="arrow-down" size={22} color="#FFFFFF" />
          </View>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>Income</Text>
          <Text style={[styles.cardSubtitle, { color: themeColors.muted }]}>
            Add money you received
          </Text>
        </TouchableOpacity>

        {/* Option 2: Expense */}
        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: themeColors.softExpense, borderColor: themeColors.expense + "44" }]}
          activeOpacity={0.85}
          onPress={() => {
            navigation.replace("AddExpense");
          }}
        >
          <View style={[styles.iconCircle, { backgroundColor: themeColors.expense }]}>
            <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
          </View>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>Expense</Text>
          <Text style={[styles.cardSubtitle, { color: themeColors.muted }]}>
            Add money you spent
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 44 : 32, // Bring down to clear notches
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  closeButton: {
    width: 46, // Slightly larger close button wrapper
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 22,
  },
  optionCard: {
    borderRadius: 20,
    paddingVertical: 18, // Shrunk from 32 to 18 to make cards neat and compact
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 48, // Shrunk icon circle size from 60 to 48
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17, // Smaller title font size
    fontWeight: "800",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12, // Smaller subtitle font size
    fontWeight: "500",
  },
});
