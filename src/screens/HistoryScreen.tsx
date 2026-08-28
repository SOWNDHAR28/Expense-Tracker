import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { fetchTransactions } from "../redux/slices/transactionSlice";
import { useTheme } from "../context/ThemeContext";
import { Transaction } from "../types/expense";
import ExpenseCard from "../components/ExpenseCard";

type FilterTab = "All" | "Income" | "Expense";
type SortOption = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

export default function HistoryScreen() {
  const transactions = useAppSelector((state) => state.transactions.items);
  const loading = useAppSelector((state) => state.transactions.loading);
  const dispatch = useAppDispatch();
  const { themeColors } = useTheme();

  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [showSortModal, setShowSortModal] = useState(false);

  const filtered = transactions.filter((tx) => {
    const q = query.toLowerCase().trim();
    const matchesSearch =
      !q ||
      tx.category.toLowerCase().includes(q) ||
      tx.note.toLowerCase().includes(q) ||
      tx.amount.toString().includes(q);

    const matchesType =
      activeTab === "All" ||
      (activeTab === "Income" && tx.type === "income") ||
      (activeTab === "Expense" && tx.type === "expense");

    return matchesSearch && matchesType;
  });

  // Sort transactions based on user preference
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "date_desc") {
      return +new Date(b.date) - +new Date(a.date);
    } else if (sortBy === "date_asc") {
      return +new Date(a.date) - +new Date(b.date);
    } else if (sortBy === "amount_desc") {
      return b.amount - a.amount;
    } else {
      return a.amount - b.amount;
    }
  });

  // Group transactions by date
  const grouped = sorted.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const txDate = new Date(tx.date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let dateLabel = txDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    if (txDate.toDateString() === today.toDateString()) {
      dateLabel = `Today - ${txDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
    } else if (txDate.toDateString() === yesterday.toDateString()) {
      dateLabel = `Yesterday - ${txDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
    }

    if (!acc[dateLabel]) acc[dateLabel] = [];
    acc[dateLabel].push(tx);
    return acc;
  }, {});

  const getDailyTotal = (items: Transaction[]) => {
    const income = items.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0);
    const expense = items.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0);
    const diff = income - expense;
    return diff >= 0 ? `+₹${diff.toLocaleString("en-IN")}` : `-₹${Math.abs(diff).toLocaleString("en-IN")}`;
  };

  const getSortLabel = (opt: SortOption) => {
    switch (opt) {
      case "date_desc":
        return "Date (Newest First)";
      case "date_asc":
        return "Date (Oldest First)";
      case "amount_desc":
        return "Amount (Highest First)";
      case "amount_asc":
        return "Amount (Lowest First)";
    }
  };

  const onRefresh = async () => {
    await dispatch(fetchTransactions());
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>History</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Ionicons name="search-outline" size={20} color={themeColors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
              onPress={() => setShowSortModal(true)}
            >
              <Ionicons name="options-outline" size={20} color={themeColors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View style={[styles.searchBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Ionicons name="search" size={18} color={themeColors.muted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: themeColors.text }]}
              placeholder="Search category, note, amount..."
              placeholderTextColor={themeColors.muted}
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color={themeColors.muted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Filter Tabs (All / Income / Expense) */}
        <View style={styles.tabRow}>
          {(["All", "Income", "Expense"] as FilterTab[]).map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: active ? themeColors.primary : themeColors.card,
                    borderColor: active ? themeColors.primary : themeColors.border,
                  },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    { color: active ? "#FFFFFF" : themeColors.text },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Current Sort Indicator */}
        <View style={styles.sortIndicatorRow}>
          <Ionicons name="funnel-outline" size={14} color={themeColors.muted} />
          <Text style={[styles.sortIndicatorText, { color: themeColors.muted }]}>
            Sorting: {getSortLabel(sortBy)}
          </Text>
        </View>

        {/* Transaction Grouped List */}
        {Object.keys(grouped).length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Ionicons name="receipt-outline" size={44} color={themeColors.muted} />
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No transactions found</Text>
            <Text style={[styles.emptySub, { color: themeColors.muted }]}>
              Try adjusting your search query or filter selection.
            </Text>
          </View>
        ) : (
          Object.entries(grouped).map(([dateLabel, items]) => {
            const daySum = getDailyTotal(items);
            const isPositive = !daySum.startsWith("-");
            return (
              <View key={dateLabel} style={styles.groupContainer}>
                {/* Date Header & Net Daily Amount */}
                <View style={styles.dateHeader}>
                  <Text style={[styles.dateLabelText, { color: themeColors.text }]}>{dateLabel}</Text>
                  <Text
                    style={[
                      styles.dateSumText,
                      { color: isPositive ? themeColors.income : themeColors.expense },
                    ]}
                  >
                    {daySum}
                  </Text>
                </View>

                {/* Items */}
                {items.map((tx) => (
                  <ExpenseCard key={tx.id} transaction={tx} compact />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Sort Modal Drawer */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSortModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>Sort Options</Text>
                  <TouchableOpacity onPress={() => setShowSortModal(false)}>
                    <Ionicons name="close" size={24} color={themeColors.text} />
                  </TouchableOpacity>
                </View>

                {(["date_desc", "date_asc", "amount_desc", "amount_asc"] as SortOption[]).map((option) => {
                  const selected = sortBy === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.sortOptionRow,
                        { borderBottomColor: themeColors.border },
                      ]}
                      onPress={() => {
                        setSortBy(option);
                        setShowSortModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.sortOptionText,
                          { color: selected ? themeColors.primary : themeColors.text },
                        ]}
                      >
                        {getSortLabel(option)}
                      </Text>
                      {selected && <Ionicons name="checkmark-circle" size={22} color={themeColors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 18, paddingBottom: 100 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  tabPill: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: "700",
  },
  sortIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  sortIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  groupContainer: {
    marginBottom: 18,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dateLabelText: {
    fontSize: 14,
    fontWeight: "700",
  },
  dateSumText: {
    fontSize: 14,
    fontWeight: "800",
  },
  emptyCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  /* Modal Overlay Drawer Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  sortOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sortOptionText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
