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
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { useTheme } from "../context/ThemeContext";
import ExpenseCard from "../components/ExpenseCard";
import { setCategoryLimit, removeCategoryLimit } from "../redux/slices/budgetSlice";
import { incomeCategories, PALETTE_COLORS, PALETTE_ICONS } from "../constants/categories";
import { deleteCustomCategoryFromCloud, updateCustomCategoryInCloud } from "../redux/slices/categorySlice";
import { TextInput, Modal, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CustomAlertModal from "../components/CustomAlertModal";
import * as Haptics from "expo-haptics";

type FilterRange = "All" | "Today" | "Month" | "Year";

export default function CategorySummaryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const transactions = useAppSelector((state) => state.transactions.items);
  const budgets = useAppSelector((state) => state.budgets.limits);
  const customCategories = useAppSelector((state) => state.categories.customCategories);
  const dispatch = useAppDispatch();
  const { themeColors } = useTheme();

  const categoryName = route.params?.categoryName || "Category";
  const isMode = route.params?.isMode || false;
  const categoryType = route.params?.categoryType; // "expense" | "income" | "payment"
  const [filterRange, setFilterRange] = useState<FilterRange>("Month");
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const customCat = customCategories.find((c) => c.label.toLowerCase() === categoryName.toLowerCase());
  const isCustom = !!customCat;

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCatName, setEditCatName] = useState("");
  const [editCatColor, setEditCatColor] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("");

  // Custom Alert Modal configuration
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
    iconColor?: string;
    iconBg?: string;
    showCancel: boolean;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    icon: "alert-circle-outline",
    showCancel: false,
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    icon = "alert-circle-outline",
    showCancel = false,
    onConfirm = () => {},
    iconColor?: string,
    iconBg?: string
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      icon,
      showCancel,
      onConfirm: () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        onConfirm();
      },
      iconColor,
      iconBg,
    });
  };

  const isIncome =
    categoryType === "income" ||
    (!isMode && (
      incomeCategories.some((c) => c.label.toLowerCase() === categoryName.toLowerCase()) ||
      customCategories.some((c) => c.type === "income" && c.label.toLowerCase() === categoryName.toLowerCase())
    ));

  const currentLimit = !isIncome ? budgets[categoryName] : undefined;

  // Filter transactions by category and selected range
  const categoryTransactions = transactions.filter((t) => {
    if (isMode) {
      if (t.paymentMethod.toLowerCase() !== categoryName.toLowerCase()) return false;
    } else {
      if (t.category.toLowerCase() !== categoryName.toLowerCase()) return false;
      if (isIncome && t.type !== "income") return false;
      if (!isIncome && t.type !== "expense") return false;
    }

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

  // Budget progress calculations (always relative to the current month filter if applicable, but budget is a monthly limit)
  const currentMonthTransactions = transactions.filter((t) => {
    if (isMode) {
      if (t.paymentMethod.toLowerCase() !== categoryName.toLowerCase() || t.type !== "expense") return false;
    } else {
      if (t.category.toLowerCase() !== categoryName.toLowerCase() || t.type !== "expense") return false;
    }
    const txDate = new Date(t.date);
    const today = new Date();
    return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
  });
  
  const monthlySpent = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  const budgetProgress = currentLimit ? Math.min(monthlySpent / currentLimit, 1) : 0;
  const isOverBudget = currentLimit ? monthlySpent >= currentLimit * 0.8 : false;
  const isFadedAlert = currentLimit ? monthlySpent >= currentLimit : false;
  const progressBarColor = isFadedAlert ? themeColors.expense : isOverBudget ? "#FF9F43" : themeColors.primary;

  const handleSaveBudget = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const num = parseFloat(budgetInput);
    if (!isNaN(num) && num > 0) {
      dispatch(setCategoryLimit({ category: categoryName, limit: num }));
    } else if (budgetInput.trim() === "") {
      dispatch(removeCategoryLimit(categoryName));
    }
    setShowBudgetModal(false);
    setBudgetInput("");
  };

  const handleRemoveBudget = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch(removeCategoryLimit(categoryName));
    setShowBudgetModal(false);
  };

  const handleEditCustomCategory = () => {
    if (customCat) {
      setEditCatName(customCat.label);
      setEditCatColor(customCat.color);
      setEditCatIcon(customCat.icon);
      setShowEditModal(true);
    }
  };

  const saveEditCategory = () => {
    if (!editCatName.trim()) {
      showAlert("Required", "Category name cannot be empty", "alert-circle-outline", false, () => {}, themeColors.expense, themeColors.expense + "20");
      return;
    }
    if (customCat) {
      dispatch(updateCustomCategoryInCloud({
        ...customCat,
        label: editCatName.trim(),
        color: editCatColor,
        icon: editCatIcon,
      }));
      setShowEditModal(false);
      // Optional: go back if name changed, because title relies on route.params
      if (editCatName.trim().toLowerCase() !== categoryName.toLowerCase()) {
        navigation.goBack();
      }
    }
  };

  const handleDeleteCustomCategory = () => {
    if (customCat) {
      showAlert(
        "Delete Category",
        "Are you sure you want to delete this custom category?",
        "trash-outline",
        true,
        () => {
          dispatch(deleteCustomCategoryFromCloud(customCat.id));
          navigation.goBack();
        },
        themeColors.expense,
        themeColors.expense + "20"
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{categoryName} Summary</Text>
        {!isIncome ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isCustom && (
              <>
                <TouchableOpacity style={styles.backButton} onPress={handleEditCustomCategory}>
                  <Ionicons name="pencil" size={20} color={themeColors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.backButton, { marginLeft: 5 }]} onPress={handleDeleteCustomCategory}>
                  <Ionicons name="trash-outline" size={20} color={themeColors.expense} />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity 
              style={[styles.backButton, { marginLeft: 5 }]} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setBudgetInput(currentLimit ? currentLimit.toString() : "");
                setShowBudgetModal(true);
              }}
            >
              <Ionicons name="notifications-outline" size={24} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isCustom ? (
              <>
                <TouchableOpacity style={styles.backButton} onPress={handleEditCustomCategory}>
                  <Ionicons name="pencil" size={20} color={themeColors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.backButton, { marginLeft: 5 }]} onPress={handleDeleteCustomCategory}>
                  <Ionicons name="trash-outline" size={20} color={themeColors.expense} />
                </TouchableOpacity>
              </>
            ) : <View style={styles.backButton} />}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Total Stat Card */}
        <View style={[styles.totalCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.totalLabel, { color: themeColors.muted }]}>
            {isIncome ? "Total Income" : "Total Spent"}
          </Text>
          <Text style={[styles.totalAmount, { color: isIncome ? themeColors.income : themeColors.primary }]}>
            ₹{totalSpent.toLocaleString("en-IN")}
          </Text>
          <Text style={[styles.totalCount, { color: themeColors.muted }]}>
            {categoryTransactions.length} transaction{categoryTransactions.length !== 1 ? "s" : ""}
          </Text>
          
          {!isIncome && currentLimit ? (
            <View style={{ width: '100%', marginTop: 12, alignItems: 'center' }}>
              <Text style={[styles.totalLabel, { color: themeColors.muted, marginBottom: 8 }]}>
                Budget: ₹{monthlySpent.toLocaleString("en-IN")} / ₹{currentLimit.toLocaleString("en-IN")}
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: themeColors.border, width: '80%', marginTop: 0 }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${budgetProgress * 100}%`, backgroundColor: progressBarColor }
                  ]} 
                />
              </View>
            </View>
          ) : null}
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

      {/* Set Budget Modal */}
      {!isIncome && (
        <Modal visible={showBudgetModal} transparent animationType="fade" onRequestClose={() => setShowBudgetModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={() => setShowBudgetModal(false)}>
              <View style={styles.modalDismissArea} />
            </TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Set Monthly Budget</Text>
              <Text style={[styles.modalSub, { color: themeColors.muted }]}>
                Get alerts when you spend more than 80% of your limit for {categoryName}.
              </Text>
              
              <TextInput
                style={[styles.budgetInput, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }]}
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="numeric"
                placeholder="e.g. 5000"
                placeholderTextColor={themeColors.muted}
              />

              <View style={styles.modalActions}>
                {currentLimit ? (
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: themeColors.softExpense }]} onPress={handleRemoveBudget}>
                    <Text style={[styles.modalBtnText, { color: themeColors.expense }]}>Remove Limit</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: themeColors.background }]} onPress={() => setShowBudgetModal(false)}>
                    <Text style={[styles.modalBtnText, { color: themeColors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: themeColors.primary }]} onPress={handleSaveBudget}>
                  <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Save Limit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Edit Category Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
            <View style={styles.modalDismissArea} />
          </TouchableWithoutFeedback>
          <ScrollView
            contentContainerStyle={styles.editModalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableWithoutFeedback>
              <View style={[styles.addModalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <Text style={[styles.addModalTitle, { color: themeColors.text }]}>Edit Category</Text>
                
                {/* Name Input */}
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Category Name</Text>
                <TextInput
                  style={[styles.addInput, { backgroundColor: themeColors.surface, color: themeColors.text, borderColor: themeColors.border }]}
                  placeholder="e.g., Subscriptions"
                  placeholderTextColor={themeColors.muted}
                  value={editCatName}
                  onChangeText={setEditCatName}
                  maxLength={20}
                />

                {/* Colors Grid */}
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Color</Text>
                <View style={styles.colorGrid}>
                  {PALETTE_COLORS.map((color) => {
                    const selected = editCatColor === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: color },
                          selected && { borderWidth: 3, borderColor: themeColors.text },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setEditCatColor(color);
                        }}
                      />
                    );
                  })}
                </View>

                {/* Icons Grid */}
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
                  {PALETTE_ICONS.map((icon) => {
                    const selected = editCatIcon === icon;
                    return (
                      <TouchableOpacity
                        key={icon}
                        style={[
                          styles.iconCircle,
                          { backgroundColor: selected ? themeColors.primary + "22" : themeColors.surface, borderColor: selected ? themeColors.primary : themeColors.border },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setEditCatIcon(icon);
                        }}
                      >
                        <MaterialCommunityIcons
                          name={icon as any}
                          size={22}
                          color={selected ? themeColors.primary : themeColors.text}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.createBtn, { backgroundColor: themeColors.primary }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    saveEditCategory();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createBtnText}>Save Category</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Alert Modal Popup */}
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        iconBg={alertConfig.iconBg}
        showCancel={alertConfig.showCancel}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        confirmText="Delete"
        cancelText="Cancel"
      />
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
    borderRadius: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalDismissArea: {
    position: "absolute",
    top: 0, bottom: 0, left: 0, right: 0,
  },
  editModalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingVertical: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  budgetInput: {
    height: 60,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  addModalContent: {
    width: "90%",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  addModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 10,
  },
  iconRow: {
    paddingBottom: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  createBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
