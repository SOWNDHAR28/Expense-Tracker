import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTransactions } from "../context/TransactionContext";
import { useTheme } from "../context/ThemeContext";

const PALETTE_COLORS = [
  "#E74C3C", // Red
  "#3498DB", // Blue
  "#2ECC71", // Green
  "#9B59B6", // Purple
  "#F1C40F", // Yellow
  "#E67E22", // Orange
  "#1ABC9C", // Teal
  "#FD79A8", // Pink
];

const PALETTE_ICONS = [
  "silverware-fork-knife",
  "car",
  "shopping-outline",
  "file-document-outline",
  "movie-open-outline",
  "heart-outline",
  "school-outline",
  "airplane",
  "cash",
  "laptop",
  "gift-outline",
  "coffee",
  "weight-lifter",
  "television-play",
  "dots-horizontal",
];

export default function CategoriesScreen() {
  const navigation = useNavigation<any>();
  const {
    transactions,
    expenseTotal,
    incomeTotal,
    expenseCategories,
    incomeCategories,
    addCustomCategory,
  } = useTransactions();
  const { themeColors } = useTheme();

  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PALETTE_COLORS[0]);
  const [newCatIcon, setNewCatIcon] = useState(PALETTE_ICONS[0]);

  const targetCategories = activeTab === "expense" ? expenseCategories : incomeCategories;
  const targetTotal = activeTab === "expense" ? expenseTotal : incomeTotal;

  // Map categories and calculate totals & percentages dynamically
  const categoriesWithTotals = targetCategories
    .map((cat) => {
      const total = transactions
        .filter((t) => t.type === activeTab && t.category.toLowerCase() === cat.label.toLowerCase())
        .reduce((sum, t) => sum + t.amount, 0);

      const percentage = targetTotal > 0 ? Math.round((total / targetTotal) * 100) : 0;

      return {
        ...cat,
        total,
        percentage,
      };
    })
    .sort((a, b) => b.total - a.total); // Sort by highest spending

  const handleCreateCategory = async () => {
    const cleanName = newCatName.trim();
    if (!cleanName) {
      Alert.alert("Required", "Please enter a category name.");
      return;
    }

    // Check if category name already exists
    const duplicate = targetCategories.some(
      (c) => c.label.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      Alert.alert("Duplicate", "A category with this name already exists.");
      return;
    }

    const nextId = `custom_${cleanName.toLowerCase().replace(/\s+/g, "_")}`;
    const newCat = {
      id: nextId,
      label: cleanName,
      icon: newCatIcon,
      color: newCatColor,
      type: activeTab,
    };

    await addCustomCategory(newCat);
    Alert.alert("Success", `Category "${cleanName}" created successfully!`);
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
            onPress={() => setActiveTab("expense")}
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
            onPress={() => setActiveTab("income")}
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
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Categories List */}
        <View style={styles.cardList}>
          {categoriesWithTotals.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.categoryRow, { borderBottomColor: themeColors.border }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("CategorySummary", { categoryName: item.label })}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: `${item.color}1E` }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[styles.categoryName, { color: themeColors.text }]}>{item.label}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.categoryAmount, { color: themeColors.text }]}>
                  ₹{item.total.toLocaleString("en-IN")}
                </Text>
                <Text style={[styles.categoryPercentage, { color: themeColors.muted }]}>
                  {item.percentage}%
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
                    New {activeTab === "expense" ? "Expense" : "Income"} Category
                  </Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <Ionicons name="close" size={24} color={themeColors.text} />
                  </TouchableOpacity>
                </View>

                {/* Category Name Input */}
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>Category Name</Text>
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
                        onPress={() => setNewCatColor(color)}
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
                        onPress={() => setNewCatIcon(icon)}
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
                  onPress={handleCreateCategory}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createBtnText}>Create Category</Text>
                </TouchableOpacity>
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
  },
  cardList: {
    paddingHorizontal: 16,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
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
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  categoryPercentage: {
    fontSize: 13,
    fontWeight: "600",
    width: 38,
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
