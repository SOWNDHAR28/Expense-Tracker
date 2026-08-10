import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTransactions } from "../context/TransactionContext";
import { useTheme } from "../context/ThemeContext";
import ExpenseCard from "../components/ExpenseCard";

type FilterRange = "All" | "Today" | "Month" | "Year";

export default function CategorySummaryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { transactions } = useTransactions();
  const { themeColors } = useTheme();

  const categoryName = route.params?.categoryName || "Category";
  const [filterRange, setFilterRange] = useState<FilterRange>("Month");

  // Filter transactions by category and selected range
  const categoryTransactions = transactions.filter((t) => {
    if (t.category.toLowerCase() !== categoryName.toLowerCase()) return false;

    const txDate = new Date(t.date);
    const today = new Date();

    if (filterRange === "Today") {
      return txDate.toDateString() === today.toDateString();
    } else if (filterRange === "Month") {
      return (
        txDate.getMonth() === today.getMonth() &&
        txDate.getFullYear() === today.getFullYear()
      );
    } else if (filterRange === "Year") {
      return txDate.getFullYear() === today.getFullYear();
    }

    return true; // "All"
  });

  const totalSpent = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{categoryName} Summary</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Total Stat Card */}
        <View style={[styles.totalCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.totalLabel, { color: themeColors.muted }]}>Total Spent</Text>
          <Text style={[styles.totalAmount, { color: themeColors.primary }]}>
            ₹{totalSpent.toLocaleString("en-IN")}
          </Text>
          <Text style={[styles.totalCount, { color: themeColors.muted }]}>
            {categoryTransactions.length} transaction{categoryTransactions.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Filters Row */}
        <View style={styles.filterRow}>
          {(["All", "Today", "Month", "Year"] as FilterRange[]).map((range) => {
            const active = filterRange === range;
            return (
              <TouchableOpacity
                key={range}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? themeColors.primary : themeColors.card,
                    borderColor: active ? themeColors.primary : themeColors.border,
                  },
                ]}
                onPress={() => setFilterRange(range)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? "#FFFFFF" : themeColors.text },
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Transactions List */}
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Transactions</Text>

        {categoryTransactions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Ionicons name="receipt-outline" size={44} color={themeColors.muted} />
            <Text style={[styles.emptyText, { color: themeColors.text }]}>No transactions found</Text>
            <Text style={[styles.emptySub, { color: themeColors.muted }]}>
              No items logged for this category in the selected filter range.
            </Text>
          </View>
        ) : (
          categoryTransactions.map((tx) => (
            <ExpenseCard key={tx.id} transaction={tx} compact />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  container: {
    padding: 18,
    paddingBottom: 40,
  },
  totalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  totalAmount: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 4,
  },
  totalCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  filterPill: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
});
