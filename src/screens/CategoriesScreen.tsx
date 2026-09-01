import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { addPaymentMethod, removePaymentMethod } from "../redux/slices/paymentSlice";
import { addCustomCategoryToCloud } from "../redux/slices/categorySlice";
import { useTheme } from "../context/ThemeContext";
import CustomAlertModal from "../components/CustomAlertModal";
import { formatPercent } from "../utils/format";
import { incomeCategories as staticIncome, expenseCategories as staticExpense, PALETTE_COLORS, PALETTE_ICONS } from "../constants/categories";
import * as Haptics from "expo-haptics";

export default function CategoriesScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const transactions = useAppSelector((state) => state.transactions.items);
  const paymentMethods = useAppSelector((state) => state.payments.items);
  const budgetLimits = useAppSelector((state) => state.budgets.limits);
  const customCategories = useAppSelector((state) => state.categories.customCategories);
  const { themeColors } = useTheme();
  
  const currentMonthTransactions = transactions.filter((t) => {
    const txDate = new Date(t.date);
    const today = new Date();
    return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
  });

  const expenseTotal = currentMonthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
    
  const incomeTotal = currentMonthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
    
  const expenseCategories = [...staticExpense, ...customCategories.filter(c => c.type === "expense")];
  const incomeCategories = [...staticIncome, ...customCategories.filter(c => c.type === "income")];

  const [activeTab, setActiveTab] = useState<"expense" | "income" | "payment">("expense");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    translateYAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab]);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PALETTE_COLORS[0]);
  const [newCatIcon, setNewCatIcon] = useState(PALETTE_ICONS[0]);

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

  const targetCategories = activeTab === "expense" ? expenseCategories : incomeCategories;
  const targetTotal = activeTab === "expense" ? expenseTotal : incomeTotal;

  // Map categories and calculate totals & percentages dynamically
  const categoriesWithTotals = targetCategories
    .map((cat) => {
      const currentMonthTx = currentMonthTransactions.filter((t) => {
        return t.type === activeTab && t.category.toLowerCase() === cat.label.toLowerCase();
      });

      const total = currentMonthTx.reduce((sum, t) => sum + t.amount, 0);
      const percentage = targetTotal > 0 ? parseFloat(formatPercent(total, targetTotal)) : 0;

      return {
        ...cat,
        total,
        percentage,
      };
    })
    .sort((a, b) => b.total - a.total); // Sort by highest spending

  const paymentMethodsWithTotals = paymentMethods.map((pm) => {
    const currentMonthTx = currentMonthTransactions.filter((t) => {
      return t.paymentMethod.toLowerCase() === pm.label.toLowerCase() && 
             t.type === "expense"; // Only counting expenses for payment limits
    });
    const total = currentMonthTx.reduce((sum, t) => sum + t.amount, 0);
    return { ...pm, total };
  }).sort((a, b) => b.total - a.total);

  const paymentTotal = paymentMethodsWithTotals.reduce((sum, pm) => sum + pm.total, 0);

  const handleCreateCategory = async () => {
    const cleanName = newCatName.trim();
    if (!cleanName) {
      showAlert(
        "Required",
        "Please enter a category name.",
        "alert-circle-outline",
        false,
        () => {},
        themeColors.expense,
        themeColors.softExpense
      );
      return;
    }

    if (activeTab === "payment") {
      const duplicate = paymentMethods.some(
        (c) => c.label.toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        showAlert(
          "Duplicate",
          "A payment method with this name already exists.",
          "alert-circle-outline",
          false,
          () => {},
          themeColors.expense,
          themeColors.softExpense
        );
        return;
      }
      const nextId = `custom_pm_${cleanName.toLowerCase().replace(/\s+/g, "_")}`;
      dispatch(addPaymentMethod({
        id: nextId,
        label: cleanName,
        icon: newCatIcon,
        color: newCatColor,
        isDefault: false,
      }));
      setShowAddModal(false);
      setNewCatName("");
      return;
    }

    // Check if category name already exists
    const duplicate = targetCategories.some(
      (c) => c.label.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      showAlert(
        "Duplicate",
        "A category with this name already exists.",
        "alert-circle-outline",
        false,
        () => {},
        themeColors.expense,
        themeColors.softExpense
      );
      return;
    }

    const nextId = `custom_${cleanName.toLowerCase().replace(/\s+/g, "_")}`;
    const newCat = {
      id: nextId,
      label: cleanName,
      icon: newCatIcon,
      color: newCatColor,
      type: activeTab as "income" | "expense",
    };

    dispatch(addCustomCategoryToCloud(newCat));
    setShowAddModal(false);
    setNewCatName("");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <View style={{ width: 36 }} />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Categories</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={26} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      {/* Segmented Filter Tab (Expense vs Income Categories) */}
      <View style={styles.tabContainer}>
        <View style={[styles.segmentedControl, { backgroundColor: themeColors.surface }]}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === "expense" && { backgroundColor: themeColors.card },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("expense");
            }}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === "expense" ? themeColors.primary : themeColors.muted },
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === "income" && { backgroundColor: themeColors.card },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("income");
            }}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === "income" ? themeColors.primary : themeColors.muted },
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === "payment" && { backgroundColor: themeColors.card },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("payment");
            }}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === "payment" ? themeColors.primary : themeColors.muted },
              ]}
            >
              Mode
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.container, { flexGrow: 1 }]} showsVerticalScrollIndicator={false} alwaysBounceVertical={true}>
        {/* Categories List */}
        <Animated.View style={[styles.cardList, { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }]}>
          {activeTab === "payment" ? (
            paymentMethodsWithTotals.map((item) => {
              const limit = budgetLimits[item.label];
              const isOverBudget = limit ? item.total >= limit * 0.8 : false;
              const isExceeded = limit ? item.total >= limit : false;
              const bgColor = isExceeded ? `${themeColors.expense}15` : themeColors.card;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.categoryRow,
                    { backgroundColor: bgColor, borderRadius: 16, padding: 14, marginVertical: 6 },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate("CategorySummary", { categoryName: item.label, isMode: true });
                  }}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: isExceeded ? `${themeColors.expense}20` : `${item.color}1E` }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={20} color={isExceeded ? themeColors.expense : item.color} />
                    </View>
                    <View>
                      <Text style={[styles.categoryName, { color: isExceeded ? themeColors.expense : themeColors.text }]}>{item.label}</Text>
                      {limit ? (
                        <Text style={[styles.budgetLimitText, { color: isExceeded ? themeColors.expense : themeColors.muted }]}>
                          ₹{item.total.toLocaleString("en-IN")} / ₹{limit.toLocaleString("en-IN")}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.categoryAmount, { color: isExceeded ? themeColors.expense : themeColors.text, marginBottom: limit ? 0 : 2 }]}>
                      ₹{item.total.toLocaleString("en-IN")}
                    </Text>
                    {limit ? (
                      <View style={[styles.miniProgressTrack, { backgroundColor: isExceeded ? `${themeColors.expense}20` : themeColors.border }]}>
                        <View style={[styles.miniProgressFill, { width: `${Math.min((item.total/limit)*100, 100)}%`, backgroundColor: isExceeded ? themeColors.expense : isOverBudget ? "#FF9F43" : themeColors.primary }]} />
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <Text style={[styles.categoryPercentage, { color: themeColors.muted }]} numberOfLines={1} adjustsFontSizeToFit>
                          {formatPercent(item.total, paymentTotal)}%
                        </Text>
                        {!item.isDefault && (
                          <TouchableOpacity onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            dispatch(removePaymentMethod(item.id));
                          }}>
                            <Ionicons name="trash-outline" size={16} color={themeColors.expense} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            categoriesWithTotals.map((item, index) => {
              const limit = activeTab === "expense" ? budgetLimits[item.label] : undefined;
              const isOverBudget = limit ? item.total >= limit * 0.8 : false;
              const isExceeded = limit ? item.total >= limit : false;
              const bgColor = isExceeded ? `${themeColors.expense}15` : themeColors.card;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.categoryRow,
                    { backgroundColor: bgColor, borderRadius: 16, padding: 14, marginVertical: 6 },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate("CategorySummary", { categoryName: item.label, categoryType: activeTab });
                  }}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: isExceeded ? `${themeColors.expense}20` : `${item.color}1E` }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={20} color={isExceeded ? themeColors.expense : item.color} />
                    </View>
                    <View>
                      <Text style={[styles.categoryName, { color: isExceeded ? themeColors.expense : themeColors.text }]}>{item.label}</Text>
                      {limit ? (
                        <Text style={[styles.budgetLimitText, { color: isExceeded ? themeColors.expense : themeColors.muted }]}>
                          ₹{item.total.toLocaleString("en-IN")} / ₹{limit.toLocaleString("en-IN")}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.categoryAmount, { color: isExceeded ? themeColors.expense : themeColors.text }]}>
                      ₹{item.total.toLocaleString("en-IN")}
                    </Text>
                    {limit ? (
                      <View style={[styles.miniProgressTrack, { backgroundColor: isExceeded ? `${themeColors.expense}20` : themeColors.border }]}>
                        <View style={[styles.miniProgressFill, { width: `${Math.min((item.total/limit)*100, 100)}%`, backgroundColor: isExceeded ? themeColors.expense : isOverBudget ? "#FF9F43" : themeColors.primary }]} />
                      </View>
                    ) : (
                      <Text style={[styles.categoryPercentage, { color: themeColors.muted }]} numberOfLines={1} adjustsFontSizeToFit>
                        {formatPercent(item.total, targetTotal)}%
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

      {/* Add Custom Category Bottom Modal Drawer */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAddModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                    New {activeTab === "expense" ? "Expense" : activeTab === "income" ? "Income" : "Payment"} {activeTab === "payment" ? "Method" : "Category"}
                  </Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <Ionicons name="close" size={24} color={themeColors.text} />
                  </TouchableOpacity>
                </View>

                {/* Category Name Input */}
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>{activeTab === "payment" ? "Method Name" : "Category Name"}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: themeColors.surface, color: themeColors.text, borderColor: themeColors.border }]}
                  placeholder="E.g. Gym, Subscriptions"
                  placeholderTextColor={themeColors.muted}
                  value={newCatName}
                  onChangeText={setNewCatName}
                  maxLength={24}
                />

                {/* Theme Colors Grid */}
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Color</Text>
                <View style={styles.colorGrid}>
                  {PALETTE_COLORS.map((color) => {
                    const selected = newCatColor === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: color, borderColor: themeColors.text },
                          selected && { borderWidth: 2.5 },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setNewCatColor(color);
                        }}
                      />
                    );
                  })}
                </View>

                {/* Icons Grid */}
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
                  {PALETTE_ICONS.map((icon) => {
                    const selected = newCatIcon === icon;
                    return (
                      <TouchableOpacity
                        key={icon}
                        style={[
                          styles.iconCircle,
                          { backgroundColor: selected ? themeColors.primary + "22" : themeColors.surface, borderColor: selected ? themeColors.primary : themeColors.border },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setNewCatIcon(icon);
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

                {/* Create Button */}
                <TouchableOpacity
                  style={[styles.createBtn, { backgroundColor: themeColors.primary }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    handleCreateCategory();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createBtnText}>Create Category</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
        confirmText="OK"
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContainer: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
  },
  container: {
    paddingVertical: 10,
    paddingBottom: 100,
  },
  cardList: {
    paddingHorizontal: 16,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "700",
  },
  budgetLimitText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  miniProgressTrack: {
    width: 64,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  rowRight: {
    alignItems: "flex-end",
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  categoryPercentage: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  /* Bottom Drawer Modal */
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
    marginBottom: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "600",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginVertical: 4,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  iconRow: {
    gap: 10,
    paddingVertical: 6,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  createBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
