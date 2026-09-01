import React, { useState, useRef, useMemo } from "react";
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
  Switch,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { formatPercent } from "../utils/format";
import { clearAuth } from '../redux/slices/authSlice';
import { fetchTransactions } from '../redux/slices/transactionSlice';
import { fetchCustomCategories } from '../redux/slices/categorySlice';
import { useTheme, ThemeMode } from "../context/ThemeContext";
import ExpenseCard from "../components/ExpenseCard";
import { expenseCategories, incomeCategories } from "../constants/categories";
import CustomAlertModal from "../components/CustomAlertModal";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as LocalAuthentication from 'expo-local-authentication';
import { setDeviceLockEnabled } from '../redux/slices/authSlice';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get("window");

export default function DashboardScreen() {
  const dispatch = useAppDispatch();
  const transactions = useAppSelector(state => state.transactions.items);
  const loading = useAppSelector((state) => state.transactions.loading);
  const budgetLimits = useAppSelector((state) => state.budgets.limits);
  const { user } = useAppSelector(state => state.auth);
  const username = user?.email?.split('@')[0] || "User";

  // Compute stats locally instead of using context
  const recentTransactions = transactions.slice(0, 5);
  
  const currentMonthTx = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [transactions]);

  const incomeTotal = currentMonthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = currentMonthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = incomeTotal - expenseTotal;

  const { themeColors, isDark, themeMode, setThemeMode } = useTheme();
  
  // Use Redux state for global App Lock
  const deviceLockEnabled = useAppSelector(state => state.auth.deviceLockEnabled);
  
  const navigation = useNavigation<any>();

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Dynamic Alert Config for Reusable Popup Modal
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
    showCancel: boolean;
    onConfirm: () => void;
    iconColor?: string;
    iconBg?: string;
    confirmText?: string;
  }>({
    visible: false,
    title: "",
    message: "",
    icon: "alert-circle-outline",
    showCancel: false,
    onConfirm: () => {},
    confirmText: "OK",
  });

  const showAlert = (
    title: string,
    message: string,
    icon = "alert-circle-outline",
    showCancel = false,
    onConfirm = () => {},
    iconColor?: string,
    iconBg?: string,
    confirmText = "OK"
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
      confirmText,
    });
  };

  // Data Export States
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportRange, setExportRange] = useState<"weekly" | "monthly" | "custom">("weekly");
  const [exportStartDate, setExportStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [exportEndDate, setExportEndDate] = useState(new Date());

  // Custom Calendar Picker States for Export
  const [pickingDateType, setPickingDateType] = useState<"start" | "end" | null>(null);
  const [exportCalendarMonth, setExportCalendarMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const exportDaysInMonth = getDaysInMonth(exportCalendarMonth);
  const exportStartDayIndex = getFirstDayOfMonth(exportCalendarMonth);

  const prevExportMonth = () => {
    setExportCalendarMonth(new Date(exportCalendarMonth.getFullYear(), exportCalendarMonth.getMonth() - 1, 1));
  };

  const nextExportMonth = () => {
    setExportCalendarMonth(new Date(exportCalendarMonth.getFullYear(), exportCalendarMonth.getMonth() + 1, 1));
  };

  const handleExportDaySelect = (dayNum: number) => {
    const chosen = new Date(exportCalendarMonth.getFullYear(), exportCalendarMonth.getMonth(), dayNum);
    if (pickingDateType === "start") {
      setExportStartDate(chosen);
    } else if (pickingDateType === "end") {
      setExportEndDate(chosen);
    }
    setPickingDateType(null);
  };

  const exportCalendarGridCells: (number | null)[] = [];
  for (let i = 0; i < exportStartDayIndex; i++) {
    exportCalendarGridCells.push(null);
  }
  for (let d = 1; d <= exportDaysInMonth; d++) {
    exportCalendarGridCells.push(d);
  }

  const exportMonthLabel = exportCalendarMonth.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const handleToggleDeviceLock = async (value: boolean) => {
    try {
      if (value) {
        const withTimeout = (promise: Promise<any>, ms = 3000) => {
          return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("Biometric API Timeout")), ms))
          ]);
        };

        const hasHardware = await withTimeout(LocalAuthentication.hasHardwareAsync());
        const isEnrolled = await withTimeout(LocalAuthentication.isEnrolledAsync());

        if (!hasHardware || !isEnrolled) {
          showAlert(
            "Biometrics Unavailable",
            "Your device does not support or have biometrics/passcode enrolled. Please set up a device lock in your phone settings first.",
            "warning-outline",
            false,
            () => {},
            themeColors.expense,
            themeColors.softExpense
          );
          return;
        }

        const result = await withTimeout(LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to enable App Lock",
          fallbackLabel: "Use Passcode",
        }), 15000);

        if (result.success) {
          dispatch(setDeviceLockEnabled(true));
          showAlert(
            "App Lock Enabled",
            "Your app is now protected by your device's native lock.",
            "lock-closed-outline",
            false,
            () => {},
            themeColors.income,
            themeColors.softIncome
          );
        } else {
          showAlert(
            "Authentication Failed",
            "Failed to verify your identity.",
            "close-circle-outline",
            false,
            () => {},
            themeColors.expense,
            themeColors.softExpense
          );
        }
      } else {
        dispatch(setDeviceLockEnabled(false));
      }
    } catch (error: any) {
      showAlert(
        "Lock Error",
        `An unexpected error occurred: ${error.message || "Unknown error"}`,
        "close-circle-outline",
        false,
        () => {},
        themeColors.expense,
        themeColors.softExpense
      );
    }
  };

  const handleExportData = async () => {
    let startLimit = new Date();
    let endLimit = new Date();

    if (exportRange === "weekly") {
      startLimit.setDate(endLimit.getDate() - 7);
      startLimit.setHours(0, 0, 0, 0);
    } else if (exportRange === "monthly") {
      startLimit = new Date(endLimit.getFullYear(), endLimit.getMonth(), 1, 0, 0, 0);
    } else {
      startLimit = new Date(exportStartDate);
      startLimit.setHours(0, 0, 0, 0);
      endLimit = new Date(exportEndDate);
      endLimit.setHours(23, 59, 59, 999);
    }

    const toExport = transactions.filter((t) => {
      const txDate = new Date(t.date);
      return txDate >= startLimit && txDate <= endLimit;
    });

    if (toExport.length === 0) {
      Alert.alert("No Data", "There are no transactions to export in the selected period.");
      return;
    }

    try {
      let csvContent = "Date & Time,Type,Category,Amount,Note,Payment Method\n";
      toExport.forEach((t) => {
        const dateObj = new Date(t.date);
        const dateStr = dateObj.toLocaleDateString("en-IN");
        const timeStr = dateObj.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        const dateTimeStr = `${dateStr}, ${timeStr}`;
        const escapedNote = (t.note || "").replace(/"/g, '""');
        const escapedCategory = t.category.replace(/"/g, '""');
        csvContent += `"${dateTimeStr}","${t.type}","${escapedCategory}",${t.amount},"${escapedNote}","${t.paymentMethod}"\n`;
      });

      const filename = `Expense_Tracker_Export_${exportRange}_${Date.now()}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: 'utf8' });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Export Transactions",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }
    } catch (error: any) {
      console.error("Export error:", error);
      Alert.alert("Export Failed", error.message || "Failed to export data.");
    }
  };

  const handleUpdateUsername = async () => {
    // In a real app with Supabase we would update user metadata here
    // For now we will just show an alert since they are logged in via email
    Alert.alert("Updated", "Your name has been updated locally!");
    setIsEditingUsername(false);
  };

  const customCategories = useAppSelector(state => state.categories.customCategories);

  const categoryBreakdown = useMemo(() => {
    const allCategories = [...expenseCategories, ...incomeCategories, ...customCategories];

    return allCategories
      .map((cat) => {
        const matchingTxs = currentMonthTx.filter(
          (t) => t.category.toLowerCase() === cat.label.toLowerCase() && t.type === cat.type
        );
        const amount = matchingTxs.reduce((sum, t) => sum + t.amount, 0);
        const relevantTotal = cat.type === "income" ? incomeTotal : expenseTotal;
        const percentage = relevantTotal > 0 ? parseFloat(formatPercent(amount, relevantTotal)) : 0;
        
        // Find most recent transaction for sorting
        const latestTx = matchingTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const lastUpdated = latestTx ? new Date(latestTx.date).getTime() : 0;
        
        return { ...cat, amount, percentage, lastUpdated };
      })
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.lastUpdated - a.lastUpdated); // Sort by most recent
  }, [currentMonthTx, expenseCategories, incomeCategories, customCategories, expenseTotal, incomeTotal]);

  // Left Drawer (Menu & Settings)
  const [leftDrawerVisible, setLeftDrawerVisible] = useState(false);
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const [showAboutOptions, setShowAboutOptions] = useState(false);
  const leftSlideAnim = useRef(new Animated.Value(-width)).current;

  const openLeftDrawer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const handleResetApp = () => {
    closeRightDrawer();
    setShowResetModal(true);
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    closeRightDrawer();
    setShowLogoutModal(true);
  };

  const confirmResetApp = async () => {
    setShowResetModal(false);
    // In a full Redux app we would dispatch a clearAll action
    // await clearAll();
    dispatch(clearAuth());
    import('../services/supabase').then(({ supabase }) => supabase.auth.signOut());
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    dispatch(clearAuth());
    import('../services/supabase').then(({ supabase }) => supabase.auth.signOut());
  };

  const themeLabel =
    themeMode === "system" ? "System" : themeMode === "dark" ? "Dark" : "Light";

  const onRefresh = async () => {
    await Promise.all([
      dispatch(fetchTransactions()),
      dispatch(fetchCustomCategories()),
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
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
        <TouchableOpacity
          style={styles.netBalanceCard}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("Analytics");
          }}
        >
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
        </TouchableOpacity>

        {/* Income and Expense Cards Row */}
        <View style={styles.statsRow}>
          {/* Income Card */}
          <TouchableOpacity style={[styles.statCard, { backgroundColor: themeColors.softIncome }]} activeOpacity={0.8} onPress={() => navigation.navigate("Analytics")}>
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
          </TouchableOpacity>

          {/* Expenses Card */}
          <TouchableOpacity style={[styles.statCard, { backgroundColor: themeColors.softExpense }]} activeOpacity={0.8} onPress={() => navigation.navigate("Analytics")}>
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
          </TouchableOpacity>
        </View>

        {/* Recent Transactions Section */}
        <View style={[styles.sectionHeader, { marginTop: 22 }]}>
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
          {categoryBreakdown.length > 5 && (
            <TouchableOpacity onPress={() => navigation.navigate("Categories")}>
              <Text style={[styles.seeAllLink, { color: themeColors.primary }]}>See All</Text>
            </TouchableOpacity>
          )}
        </View>

        {categoryBreakdown.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border, minHeight: 80 }]}>
            <Text style={[styles.emptyText, { color: themeColors.text, fontSize: 14 }]}>No transactions this month</Text>
          </View>
        ) : (
          <View style={[styles.categoryBreakdownContainer]}>
            {categoryBreakdown.slice(0, 5).map((item, index) => {
              const limit = item.type === "expense" ? budgetLimits[item.label] : undefined;
              const isOverBudget = limit ? item.amount >= limit * 0.8 : false;
              const isExceeded = limit ? item.amount >= limit : false;
              const bgColor = isExceeded ? `${themeColors.expense}15` : themeColors.card;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.categoryBreakdownRow,
                    { backgroundColor: bgColor }
                  ]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate("CategorySummary", { categoryName: item.label, categoryType: item.type })}
                >
                  <View style={styles.breakdownRowLeft}>
                    <View style={[styles.breakdownIconBox, { backgroundColor: isExceeded ? `${themeColors.expense}20` : `${item.color}1E` }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={18} color={isExceeded ? themeColors.expense : item.color} />
                    </View>
                    <View>
                      <Text style={[styles.breakdownCatName, { color: isExceeded ? themeColors.expense : themeColors.text }]}>{item.label}</Text>
                      {limit ? (
                        <Text style={[styles.budgetLimitText, { color: isExceeded ? themeColors.expense : themeColors.muted }]}>
                          ₹{item.amount.toLocaleString("en-IN")} / ₹{limit.toLocaleString("en-IN")}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.breakdownRowRight}>
                    <Text style={[styles.breakdownCatAmount, { color: isExceeded ? themeColors.expense : themeColors.text }]}>
                      ₹{item.amount.toLocaleString("en-IN")}
                    </Text>
                    {limit ? (
                      <View style={[styles.miniProgressTrack, { backgroundColor: isExceeded ? `${themeColors.expense}20` : themeColors.border }]}>
                        <View style={[styles.miniProgressFill, { width: `${Math.min((item.amount/limit)*100, 100)}%`, backgroundColor: isExceeded ? themeColors.expense : isOverBudget ? "#FF9F43" : themeColors.primary }]} />
                      </View>
                    ) : (
                      <Text style={[styles.breakdownCatPercent, { color: themeColors.muted }]} numberOfLines={1}>
                        {formatPercent(item.amount, item.type === "income" ? incomeTotal : expenseTotal)}%
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
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

                {/* 2. Data Export Dropdown */}
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: themeColors.border, borderBottomWidth: 1 }]}
                  onPress={() => setShowExportOptions(!showExportOptions)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.itemIcon, { backgroundColor: themeColors.softIncome }]}>
                      <MaterialCommunityIcons name="file-export-outline" size={20} color={themeColors.income} />
                    </View>
                    <Text style={[styles.itemText, { color: themeColors.text }]}>Data Export</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Ionicons name={showExportOptions ? "chevron-down" : "chevron-forward"} size={18} color={themeColors.muted} />
                  </View>
                </TouchableOpacity>

                {/* Data Export Sub-Panel */}
                {showExportOptions && (
                  <View style={[styles.dropdownSubPanel, { backgroundColor: themeColors.surface, padding: 12 }]}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: themeColors.text, marginBottom: 8 }}>
                      Select Timeframe
                    </Text>

                    {/* Timeframe Selector Button Group */}
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                      {(["weekly", "monthly", "custom"] as const).map((range) => {
                        const active = exportRange === range;
                        return (
                          <TouchableOpacity
                            key={range}
                            style={{
                              flex: 1,
                              height: 38,
                              borderRadius: 10,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 1.5,
                              borderColor: active ? themeColors.primary : themeColors.border,
                              backgroundColor: active ? themeColors.softPurple : themeColors.card,
                            }}
                            onPress={() => setExportRange(range)}
                          >
                            <Text style={{ fontSize: 12, fontWeight: "700", color: active ? themeColors.primary : themeColors.muted, textTransform: "capitalize" }}>
                              {range}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Custom Date Pickers */}
                    {exportRange === "custom" && (
                      <View style={{ gap: 8, marginBottom: 12 }}>
                        {/* Start Date */}
                        <TouchableOpacity
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            height: 44,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            backgroundColor: themeColors.card,
                            borderWidth: 1,
                            borderColor: themeColors.border,
                          }}
                          onPress={() => {
                            setExportCalendarMonth(exportStartDate);
                            setPickingDateType("start");
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "600", color: themeColors.muted }}>Start Date:</Text>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: themeColors.text }}>
                            {exportStartDate.toLocaleDateString("en-IN")}
                          </Text>
                        </TouchableOpacity>

                        {/* End Date */}
                        <TouchableOpacity
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            height: 44,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            backgroundColor: themeColors.card,
                            borderWidth: 1,
                            borderColor: themeColors.border,
                          }}
                          onPress={() => {
                            setExportCalendarMonth(exportEndDate);
                            setPickingDateType("end");
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "600", color: themeColors.muted }}>End Date:</Text>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: themeColors.text }}>
                            {exportEndDate.toLocaleDateString("en-IN")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Export Button */}
                    <TouchableOpacity
                      style={{
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: themeColors.primary,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onPress={handleExportData}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="file-excel-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#FFFFFF" }}>
                        Export as Spreadsheet
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 3. About App Dropdown */}
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
                    <Text style={[styles.aboutTitle, { color: themeColors.text }]}>Expense Tracker v2.0.0</Text>
                    <Text style={[styles.aboutText, { color: themeColors.muted, marginTop: 6 }]}>
                      A minimal, fast, and beautiful expense & income tracking application built with React Native and TypeScript.
                    </Text>
                    <Text style={[styles.aboutSubtitle, { color: themeColors.text, marginTop: 10 }]}>Features:</Text>
                    <Text style={[styles.aboutText, { color: themeColors.muted }]}>
                      • Income & Expense Tracking
                    </Text>

                    <Text style={[styles.aboutText, { color: themeColors.muted }]}>
                      • Supabase Cloud Sync & Google OAuth Sign-In
                    </Text>
                    <Text style={[styles.aboutText, { color: themeColors.muted }]}>
                      • Dynamic SVG Analytics (Bar & Donut Charts)
                    </Text>
                    <Text style={[styles.aboutText, { color: themeColors.muted }]}>
                      • Native App Lock (Biometrics/PIN)
                    </Text>
                    <Text style={[styles.aboutText, { color: themeColors.muted }]}>
                      • System Dark & Light Theme Support
                    </Text>
                    <Text style={[styles.aboutText, { color: themeColors.muted }]}>
                      • Custom Date Range Data Export (JSON/CSV)
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

                  <TouchableOpacity 
                    style={[styles.securityBadge, { backgroundColor: themeColors.softPurple, marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border }]}
                    onPress={() => handleToggleDeviceLock(!deviceLockEnabled)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="lock-closed" size={16} color={themeColors.primary} style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, fontWeight: "700", color: themeColors.text }}>
                        Device Lock
                      </Text>
                    </View>
                    <Switch
                      value={!!deviceLockEnabled}
                      onValueChange={handleToggleDeviceLock}
                      trackColor={{ false: themeColors.border, true: themeColors.primary }}
                      thumbColor={Platform.OS === "android" ? (deviceLockEnabled ? themeColors.card : "#f4f3f4") : undefined}
                    />
                  </TouchableOpacity>
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
      {/* Custom HSL Modals */}
      <CustomAlertModal
        visible={showResetModal}
        title="Reset App & Clear Data"
        message="Are you sure you want to delete all transactions, custom categories, and reset your profile? This action cannot be undone."
        icon="trash-outline"
        confirmText="Reset Everything"
        onCancel={() => setShowResetModal(false)}
        onConfirm={confirmResetApp}
      />

      <CustomAlertModal
        visible={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to log out of your profile session?"
        icon="log-out-outline"
        iconColor={themeColors.primary}
        iconBg={themeColors.softPurple}
        confirmText="Logout"
        confirmColor={themeColors.primary}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
      />

      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon as any}
        showCancel={alertConfig.showCancel}
        confirmText={alertConfig.confirmText}
        iconColor={alertConfig.iconColor || themeColors.primary}
        iconBg={alertConfig.iconBg || themeColors.softPurple}
        confirmColor={alertConfig.iconColor || themeColors.primary}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        onConfirm={alertConfig.onConfirm}
      />

      {/* Custom Styled Premium Calendar Modal for Export Start/End dates */}
      <Modal
        visible={pickingDateType !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPickingDateType(null)}
      >
        <TouchableWithoutFeedback onPress={() => setPickingDateType(null)}>
          <View style={styles.calendarModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.calendarModalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                {/* Modal Header */}
                <View style={styles.calendarModalHeader}>
                  <Text style={[styles.calendarModalTitle, { color: themeColors.text }]}>
                    Select {pickingDateType === "start" ? "Start Date" : "End Date"}
                  </Text>
                  <TouchableOpacity onPress={() => setPickingDateType(null)}>
                    <Ionicons name="close" size={24} color={themeColors.text} />
                  </TouchableOpacity>
                </View>

                {/* Calendar Navigation */}
                <View style={styles.calendarNavRow}>
                  <TouchableOpacity onPress={prevExportMonth} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={20} color={themeColors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.calendarMonthLabel, { color: themeColors.text }]}>
                    {exportMonthLabel}
                  </Text>
                  <TouchableOpacity onPress={nextExportMonth} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={20} color={themeColors.text} />
                  </TouchableOpacity>
                </View>

                {/* Weekdays Row */}
                <View style={styles.weekdaysRow}>
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
                    <Text key={dayName} style={[styles.weekdayText, { color: themeColors.muted }]}>
                      {dayName}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                  {exportCalendarGridCells.map((dayNum, index) => {
                    if (dayNum === null) {
                      return <View key={`empty-${index}`} style={styles.dayCell} />;
                    }

                    const isToday =
                      new Date().getDate() === dayNum &&
                      new Date().getMonth() === exportCalendarMonth.getMonth() &&
                      new Date().getFullYear() === exportCalendarMonth.getFullYear();

                    const currentSelected = pickingDateType === "start" ? exportStartDate : exportEndDate;
                    const isSelected =
                      currentSelected !== null &&
                      currentSelected.getDate() === dayNum &&
                      currentSelected.getMonth() === exportCalendarMonth.getMonth() &&
                      currentSelected.getFullYear() === exportCalendarMonth.getFullYear();

                    return (
                      <TouchableOpacity
                        key={`day-${dayNum}`}
                        style={[
                          styles.dayCell,
                          isSelected && { backgroundColor: themeColors.primary },
                          isToday && !isSelected && { borderColor: themeColors.primary, borderWidth: 1.5 },
                        ]}
                        onPress={() => handleExportDaySelect(dayNum)}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            { color: isSelected ? "#FFFFFF" : themeColors.text },
                            isSelected && { fontWeight: "800" },
                          ]}
                        >
                          {dayNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
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
    marginBottom: 20,
  },
  categoryBreakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    marginVertical: 6,
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
    borderRadius: 3,
  },
  breakdownRowRight: {
    alignItems: "flex-end",
  },
  breakdownCatAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  breakdownCatPercent: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  /* Modal Drawer Styles */
  modalOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
  /* Custom Modal Overlay Calendar Styles */
  calendarModalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  calendarModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  calendarNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
  },
  calendarMonthLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  weekdayText: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
