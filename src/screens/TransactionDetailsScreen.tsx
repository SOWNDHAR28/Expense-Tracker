import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTransactions } from "../context/TransactionContext";
import { useTheme } from "../context/ThemeContext";
import { getCategoryMeta } from "../constants/categories";
import { Transaction } from "../types/expense";

export default function TransactionDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { deleteTransaction } = useTransactions();
  const { themeColors } = useTheme();

  const transaction: Transaction | undefined = route.params?.transaction;

  if (!transaction) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <View style={styles.centerContainer}>
          <Text style={{ color: themeColors.text }}>Transaction not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
            <Text style={{ color: themeColors.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isIncome = transaction.type === "income";
  const meta = getCategoryMeta(transaction.category);

  const formattedAmount = isIncome
    ? `+₹${transaction.amount.toLocaleString("en-IN")}`
    : `-₹${transaction.amount.toLocaleString("en-IN")}`;

  const handleDelete = () => {
    Alert.alert(
      "Delete Transaction?",
      "Are you sure you want to delete this record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteTransaction(transaction.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    if (isIncome) {
      navigation.navigate("AddIncome", { transaction });
    } else {
      navigation.navigate("AddExpense", { transaction });
    }
  };

  const dateObj = new Date(transaction.date);
  const formattedDate = dateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Transaction Details</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Hero Section */}
        <View style={styles.heroSection}>
          <View style={[styles.heroIconCircle, { backgroundColor: `${meta.color}1E` }]}>
            <MaterialCommunityIcons name={meta.icon as any} size={36} color={meta.color} />
          </View>
          <Text style={[styles.heroTitle, { color: themeColors.text }]}>
            {transaction.note || transaction.category}
          </Text>
          <Text style={[styles.heroCategoryTag, { color: themeColors.muted }]}>
            {isIncome ? "Income" : "Expense"}
          </Text>
          <Text
            style={[
              styles.heroAmount,
              { color: isIncome ? themeColors.income : themeColors.text },
            ]}
          >
            {formattedAmount}
          </Text>
        </View>

        {/* Info Rows List */}
        <View style={[styles.detailsCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          {/* Date & Time */}
          <View style={styles.detailRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="calendar-outline" size={20} color={themeColors.muted} style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowLabel, { color: themeColors.muted }]}>Date & Time</Text>
                <Text style={[styles.rowValue, { color: themeColors.text }]}>
                  {formattedDate}, {formattedTime}
                </Text>
              </View>
            </View>
          </View>

          {/* Source / Category */}
          <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: themeColors.border }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="pricetag-outline" size={20} color={themeColors.muted} style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowLabel, { color: themeColors.muted }]}>
                  {isIncome ? "Source" : "Category"}
                </Text>
                <Text style={[styles.rowValue, { color: themeColors.text }]}>
                  {transaction.category}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Method */}
          <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: themeColors.border }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="wallet-outline" size={20} color={themeColors.muted} style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowLabel, { color: themeColors.muted }]}>Payment Method</Text>
                <Text style={[styles.rowValue, { color: themeColors.text }]}>
                  {transaction.paymentMethod || "Bank Transfer"}
                </Text>
              </View>
            </View>
          </View>

          {/* Note */}
          <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: themeColors.border }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="document-text-outline" size={20} color={themeColors.muted} style={styles.rowIcon} />
              <View>
                <Text style={[styles.rowLabel, { color: themeColors.muted }]}>Note</Text>
                <Text style={[styles.rowValue, { color: themeColors.text }]}>
                  {transaction.note || "No notes added"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: themeColors.softPurple, borderColor: themeColors.primary },
            ]}
            onPress={handleEdit}
          >
            <Text style={[styles.actionButtonText, { color: themeColors.primary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: themeColors.softExpense, borderColor: themeColors.expense },
            ]}
            onPress={handleDelete}
          >
            <Text style={[styles.actionButtonText, { color: themeColors.expense }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconButton: {
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
  heroSection: {
    alignItems: "center",
    marginVertical: 20,
  },
  heroIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  heroCategoryTag: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: "800",
  },
  detailsCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  detailRow: {
    paddingVertical: 16,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowIcon: {
    marginRight: 14,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
});
