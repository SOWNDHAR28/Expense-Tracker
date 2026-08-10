import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Animated,
  Platform,
  Alert,
  Dimensions,
  TouchableWithoutFeedback,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTransactions } from "../context/TransactionContext";
import { useTheme, ThemeMode } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import ExpenseCard from "../components/ExpenseCard";
import { expenseCategories } from "../constants/categories";

const { width } = Dimensions.get("window");

export default function DashboardScreen() {
  const { transactions, recentTransactions, incomeTotal, expenseTotal, netBalance } = useTransactions();
  const { themeColors, isDark, themeMode, setThemeMode } = useTheme();
  const { username, logout, signUp } = useAuth();
  const navigation = useNavigation<any>();

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");

  const handleUpdateUsername = async () => {
    const clean = editedUsername.trim();
    if (!clean) {
      Alert.alert("Name Required", "Please enter a valid name.");
      return;
    }
    const res = await signUp(clean);
    if (res.ok) {
      setIsEditingUsername(false);
      Alert.alert("Updated", "Your name has been updated!");
    } else {
      Alert.alert("Failed", res.error || "Failed to update username.");
    }
  };

  // Calculate expense breakdown by category for the home screen
  const categoryBreakdown = expenseCategories
    .map((cat) => {
      const amount = transactions
        .filter((t) => t.type === "expense" && t.category.toLowerCase() === cat.label.toLowerCase())
        .reduce((sum, t) => sum + t.amount, 0);
      const percentage = expenseTotal > 0 ? Math.round((amount / expenseTotal) * 100) : 0;
      return { ...cat, amount, percentage };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Left Drawer (Menu & Settings)
  const [leftDrawerVisible, setLeftDrawerVisible] = useState(false);
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const [showAboutOptions, setShowAboutOptions] = useState(false);
  const leftSlideAnim = useRef(new Animated.Value(-width)).current;

  const openLeftDrawer = () => {
    setLeftDrawerVisible(true);
    Animated.timing(leftSlideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeLeftDrawer = () => {
    Animated.timing(leftSlideAnim, {
      toValue: -width,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setLeftDrawerVisible(false);
      setShowThemeOptions(false);
      setShowAboutOptions(false);
    });
  };

  // Right Drawer (Profile & Logout)
  const [rightDrawerVisible, setRightDrawerVisible] = useState(false);
  const rightSlideAnim = useRef(new Animated.Value(width)).current;

  const openRightDrawer = () => {
    setRightDrawerVisible(true);
    Animated.timing(rightSlideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeRightDrawer = () => {
    Animated.timing(rightSlideAnim, {
      toValue: width,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setRightDrawerVisible(false);
    });
  };

  const handleLogout = () => {
    closeRightDrawer();
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const themeLabel =
    themeMode === "system" ? "System" : themeMode === "dark" ? "Dark" : "Light";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={openLeftDrawer}
          >
            <Ionicons name="menu" size={22} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Dashboard</Text>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={openRightDrawer}
          >
            <Ionicons name="person-outline" size={22} color={themeColors.text} />
          </TouchableOpacity>
        </View>

        {/* Net Balance Card */}
        <View style={styles.netBalanceCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.netBalanceLabel}>Net Balance</Text>
              <Text style={styles.netBalanceValue}>
                ₹{netBalance.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.walletIconCircle}>
              <MaterialCommunityIcons name="wallet-outline" size={28} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.thisMonthSubtext}>This Month</Text>
        </View>

        {/* Income and Expense Cards Row */}
        <View style={styles.statsRow}>
          {/* Income Card */}
          <View style={[styles.statCard, { backgroundColor: themeColors.softIncome }]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.arrowCircle, { backgroundColor: themeColors.income }]}>
                <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.statLabel, { color: themeColors.text }]}>Income</Text>
            </View>
            <Text style={[styles.statValue, { color: themeColors.income }]}>
              ₹{incomeTotal.toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.statSub, { color: themeColors.muted }]}>This Month</Text>
          </View>

          {/* Expenses Card */}
          <View style={[styles.statCard, { backgroundColor: themeColors.softExpense }]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.arrowCircle, { backgroundColor: themeColors.expense }]}>
                <Ionicons name="arrow-down" size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.statLabel, { color: themeColors.text }]}>Expenses</Text>
            </View>
            <Text style={[styles.statValue, { color: themeColors.expense }]}>
              ₹{expenseTotal.toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.statSub, { color: themeColors.muted }]}>This Month</Text>
          </View>
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate("History")}>
            <Text style={[styles.seeAllLink, { color: themeColors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <MaterialCommunityIcons name="receipt" size={48} color={themeColors.primary} />
            <Text style={[styles.emptyText, { color: themeColors.text }]}>No transactions yet</Text>
            <Text style={[styles.emptySubtext, { color: themeColors.muted }]}>
              Tap the + button below to log your first income or expense.
            </Text>
          </View>
        ) : (
          recentTransactions.map((tx) => (
            <ExpenseCard key={tx.id} transaction={tx} compact />
          ))
        )}

        {/* Categories with Expense Breakdown */}
        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Category Breakdown</Text>
        </View>

        {categoryBreakdown.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border, minHeight: 80 }]}>
            <Text style={[styles.emptyText, { color: themeColors.text, fontSize: 14 }]}>No expenses logged yet</Text>
          </View>
        ) : (
          <View style={[styles.categoryBreakdownContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            {categoryBreakdown.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.categoryBreakdownRow,
                  index < categoryBreakdown.length - 1 && { borderBottomColor: themeColors.border, borderBottomWidth: 1 },
                ]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate("CategorySummary", { categoryName: item.label })}
              >
                <View style={styles.breakdownRowLeft}>
                  <View style={[styles.breakdownIconBox, { backgroundColor: `${item.color}1E` }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={[styles.breakdownCatName, { color: themeColors.text }]}>{item.label}</Text>
                </View>
                <View style={styles.breakdownRowRight}>
                  <Text style={[styles.breakdownCatAmount, { color: themeColors.text }]}>
                    ₹{item.amount.toLocaleString("en-IN")}
                  </Text>
                  <Text style={[styles.breakdownCatPercent, { color: themeColors.muted }]}>
                    {item.percentage}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Left Slide-out Settings Drawer */}
      <Modal
        visible={leftDrawerVisible}
        transparent={true}
        onRequestClose={closeLeftDrawer}
        animationType="none"
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop Touch to Close */}
          <TouchableWithoutFeedback onPress={closeLeftDrawer}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          {/* Left Drawer Menu Panel */}
          <Animated.View
            style={[
              styles.drawerPanel,
              {
                backgroundColor: themeColors.card,
                borderRightColor: themeColors.border,
                transform: [{ translateX: leftSlideAnim }],
              },
            ]}
          >
            <View style={{ flex: 1, paddingTop: Platform.OS === "ios" ? 44 : 20 }}>
              {/* Drawer Header */}
              <View style={[styles.drawerHeader, { borderBottomColor: themeColors.border, paddingBottom: 16 }]}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: themeColors.primary, textAlign: "center" }}>
                  Expense Tracker
                </Text>
              </View>

              {/* Drawer Menu Items */}
              <ScrollView contentContainerStyle={styles.drawerScroll} showsVerticalScrollIndicator={false}>
                {/* 1. Theme Switcher */}
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: themeColors.border, borderBottomWidth: 1 }]}
                  onPress={() => setShowThemeOptions(!showThemeOptions)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.itemIcon, { backgroundColor: themeColors.softPurple }]}>
                      <Ionicons name="sunny-outline" size={20} color={themeColors.primary} />
                    </View>
                    <Text style={[styles.itemText, { color: themeColors.text }]}>Theme</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={[styles.itemValue, { color: themeColors.muted }]}>
                      {themeLabel}
                    </Text>
                    <Ionicons name={showThemeOptions ? "chevron-down" : "chevron-forward"} size={18} color={themeColors.muted} />
                  </View>
                </TouchableOpacity>

                {/* Theme Options Sub-Panel */}
                {showThemeOptions && (
                  <View style={[styles.dropdownSubPanel, { backgroundColor: themeColors.surface }]}>
                    {(["system", "light", "dark"] as ThemeMode[]).map((mode) => {
                      const selected = themeMode === mode;
                      return (
                        <TouchableOpacity
                          key={mode}
                          style={[
                            styles.themeOptionBtn,
                            selected && { backgroundColor: themeColors.card },
                          ]}
                          onPress={() => {
                            setThemeMode(mode);
                            setShowThemeOptions(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.themeOptionText,
                              { color: selected ? themeColors.primary : themeColors.text },
                            ]}
                          >
                            {mode === "system" ? "System Default" : mode === "light" ? "Light Mode" : "Dark Mode"}
                          </Text>
                          {selected && <Ionicons name="checkmark" size={18} color={themeColors.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* 2. About App Dropdown */}
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: themeColors.border, borderBottomWidth: 1 }]}
                  onPress={() => setShowAboutOptions(!showAboutOptions)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.itemIcon, { backgroundColor: themeColors.softTeal }]}>
                      <Ionicons name="information-circle-outline" size={20} color={themeColors.teal} />
                    </View>
                    <Text style={[styles.itemText, { color: themeColors.text }]}>About App</Text>
                  </View>
                  <Ionicons name={showAboutOptions ? "chevron-down" : "chevron-forward"} size={18} color={themeColors.muted} />
                </TouchableOpacity>

                {/* About App Sub-Panel */}
                {showAboutOptions && (
                  <View style={[styles.dropdownSubPanel, { backgroundColor: themeColors.surface, padding: 12 }]}>
                    <Text style={[styles.aboutTitle, { color: themeColors.text }]}>Expense Tracker v1.0.0</Text>
                    <Text style={[styles.aboutText, { color: themeColors.muted, marginTop: 6 }]}>
                      A fully offline, fast, and modern expense & income tracking application built using React Native, TypeScript, and SQLite.
                    </Text>
                    <Text style={[styles.aboutSubtitle, { color: themeColors.text, marginTop: 10 }]}>Key Features:</Text>
                    <Text style={[styles.aboutText, { color: themeColors.muted }]}>
                      • 100% Offline SQLite database
                    </Text>
                    <Text style={[styles.aboutText, { color: themeColors.muted }]}>
                      • Income & Expense categories
                    </Text>
                    <Text style={[styles.aboutText, { color: themeColors.muted }]}>
                      • Device lock screen & biometric security
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Right Slide-out Profile Drawer */}
      <Modal
        visible={rightDrawerVisible}
        transparent={true}
        onRequestClose={closeRightDrawer}
        animationType="none"
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop Touch to Close */}
          <TouchableWithoutFeedback onPress={closeRightDrawer}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          {/* Right Drawer Profile Panel */}
          <Animated.View
            style={[
              styles.drawerPanel,
              styles.rightDrawerPanel,
              {
                backgroundColor: themeColors.card,
                borderLeftColor: themeColors.border,
                transform: [{ translateX: rightSlideAnim }],
              },
            ]}
          >
            <View style={{ flex: 1, paddingTop: Platform.OS === "ios" ? 44 : 20 }}>
              {/* Drawer Header */}
              <View style={[styles.drawerHeader, { borderBottomColor: themeColors.border, paddingBottom: 16 }]}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: themeColors.primary, textAlign: "center" }}>
                  Profile Info
                </Text>
              </View>

              {/* Drawer Content */}
              <ScrollView contentContainerStyle={styles.drawerScroll} showsVerticalScrollIndicator={false}>
                {/* Profile Badge Card */}
                <View style={[styles.profileCard, { backgroundColor: themeColors.surface }]}>
                  <View style={[styles.userAvatar, { backgroundColor: themeColors.softPurple }]}>
                    <MaterialCommunityIcons name="account" size={44} color={themeColors.primary} />
                  </View>

                  {isEditingUsername ? (
                    <View style={styles.editUsernameRow}>
                      <TextInput
                        style={[styles.editUsernameInput, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                        value={editedUsername}
                        onChangeText={setEditedUsername}
                        maxLength={16}
                        autoCapitalize="words"
                      />
                      <TouchableOpacity onPress={handleUpdateUsername} style={styles.editDoneBtn}>
                        <Ionicons name="checkmark-circle" size={24} color={themeColors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setIsEditingUsername(false)} style={styles.editDoneBtn}>
                        <Ionicons name="close-circle" size={24} color={themeColors.muted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <Text style={[styles.profileUsername, { color: themeColors.text, marginBottom: 0 }]}>
                        @{username || "User"}
                      </Text>
                      <TouchableOpacity onPress={() => {
                        setEditedUsername(username || "");
                        setIsEditingUsername(true);
                      }}>
                        <Ionicons name="create-outline" size={18} color={themeColors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={[styles.securityBadge, { backgroundColor: themeColors.softPurple, marginTop: 4 }]}>
                    <Ionicons name="lock-closed" size={14} color={themeColors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.securityBadgeText, { color: themeColors.primary }]}>
                      Device Lock Active
                    </Text>
                  </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                  style={[styles.logoutButton, { backgroundColor: themeColors.softExpense, borderColor: themeColors.expense + "33" }]}
                  onPress={handleLogout}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="logout" size={20} color={themeColors.expense} style={{ marginRight: 8 }} />
                  <Text style={[styles.logoutText, { color: themeColors.expense }]}>Logout</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 18, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  netBalanceCard: {
    backgroundColor: "#6C5CE7",
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#6C5CE7",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  netBalanceLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  netBalanceValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 6,
  },
  walletIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  thisMonthSubtext: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  statSub: {
    fontSize: 12,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  seeAllLink: { fontSize: 14, fontWeight: "700" },
  emptyCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 6,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
  categoryBreakdownContainer: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  categoryBreakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  breakdownRowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  breakdownIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  breakdownCatName: {
    fontSize: 14,
    fontWeight: "700",
  },
  breakdownRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  breakdownCatAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  breakdownCatPercent: {
    fontSize: 12,
    fontWeight: "600",
    width: 32,
    textAlign: "right",
  },
  /* Modal Drawer Styles */
  modalOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  drawerPanel: {
    width: 290,
    height: "100%",
    borderRightWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 4, height: 0 },
    elevation: 10,
    position: "absolute",
    left: 0,
  },
  rightDrawerPanel: {
    left: undefined,
    right: 0,
    borderRightWidth: 0,
    borderLeftWidth: 1,
    shadowOffset: { width: -4, height: 0 },
  },
  drawerHeader: {
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  drawerScroll: {
    paddingVertical: 18,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  itemText: {
    fontSize: 15,
    fontWeight: "700",
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  dropdownSubPanel: {
    padding: 8,
    borderRadius: 12,
    marginVertical: 4,
    gap: 2,
  },
  themeOptionBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  /* About Sub-Panel details */
  aboutTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  aboutSubtitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  aboutText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  /* Profile Drawer styles */
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  profileUsername: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "800",
  },
  editUsernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    width: "100%",
    paddingHorizontal: 12,
  },
  editUsernameInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: "700",
  },
  editDoneBtn: {
    padding: 2,
  },
});
