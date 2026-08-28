import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme, ThemeMode } from "../context/ThemeContext";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import CustomAlertModal from "../components/CustomAlertModal";

export default function SettingsScreen() {
  const { themeMode, setThemeMode, themeColors } = useTheme();
  const transactions = useAppSelector((state) => state.transactions.items);
  const user = useAppSelector((state) => state.auth.user);
  const username = user?.email?.split('@')[0] || "User";
  const dispatch = useAppDispatch();

  const exportDataJSON = () => {
    return JSON.stringify(transactions, null, 2);
  };

  const exportDataCSV = () => {
    if (transactions.length === 0) return "No transactions found.";
    const header = Object.keys(transactions[0]).join(",");
    const rows = transactions.map((t) => Object.values(t).join(","));
    return [header, ...rows].join("\n");
  };

  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showExportSubPanel, setShowExportSubPanel] = useState(false);

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

  const handleLogout = () => {
    showAlert(
      "Confirm Logout",
      "Are you sure you want to log out of your account?",
      "log-out-outline",
      true,
      async () => {
        const { clearAuth } = await import("../redux/slices/authSlice");
        const { supabase } = await import("../services/supabase");
        dispatch(clearAuth());
        await supabase.auth.signOut();
      },
      themeColors.expense,
      themeColors.softExpense,
      "Logout"
    );
  };

  const handleExportData = (type: "json" | "csv") => {
    const data = type === "json" ? exportDataJSON() : exportDataCSV();
    const title = type === "json" ? "expense_tracker_export.json" : "expense_tracker_export.csv";

    if (Platform.OS === "web") {
      try {
        const blob = new Blob([data], { type: type === "json" ? "application/json" : "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = title;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showAlert(
          "Export Success",
          `Your data has been exported as ${title}`,
          "checkmark-circle-outline",
          false,
          () => {},
          themeColors.income,
          themeColors.softIncome
        );
      } catch {
        showAlert(
          "Data Export",
          data.slice(0, 300) + "\n...",
          "document-text-outline",
          false,
          () => {},
          themeColors.primary,
          themeColors.softPurple
        );
      }
    } else {
      Share.share({
        title: "Export Expense Tracker Data",
        message: data,
      }).catch(() => {
        showAlert(
          "Export Error",
          "Unable to share data export.",
          "alert-circle-outline",
          false,
          () => {},
          themeColors.expense,
          themeColors.softExpense
        );
      });
    }
  };

  const handleAboutApp = () => {
    showAlert(
      "Expense Tracker v2.0.0",
      "A minimal, fast, and beautiful expense & income tracking application built with React Native and TypeScript.\n\nFeatures:\n• Income & Expense Tracking\n• Redux Toolkit & Offline Persistence\n• Supabase Cloud Sync & Google OAuth Sign-In\n• Dynamic SVG Analytics (Bar & Donut Charts)\n• 4-Digit Security PIN Protection\n• System Dark & Light Theme Support\n• Custom Date Range Data Export (JSON/CSV)",
      "information-circle-outline",
      false,
      () => {},
      themeColors.primary,
      themeColors.softPurple
    );
  };

  const themeLabel =
    themeMode === "system" ? "System" : themeMode === "dark" ? "Dark" : "Light";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={[styles.title, { color: themeColors.text }]}>Settings</Text>

        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={[styles.userAvatar, { backgroundColor: themeColors.softPurple }]}>
            <MaterialCommunityIcons name="account" size={28} color={themeColors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: themeColors.text }]}>
              {username || "User"}
            </Text>
            <Text style={[styles.userBadge, { color: themeColors.muted }]}>
              4-digit PIN Protection Active
            </Text>
          </View>
        </View>

        {/* Settings Group */}
        <View style={[styles.menuList, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          {/* 1. System Theme */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: themeColors.border, borderBottomWidth: 1 }]}
            onPress={() => setShowThemeModal(!showThemeModal)}
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
              <Ionicons name="chevron-forward" size={18} color={themeColors.muted} />
            </View>
          </TouchableOpacity>

          {/* Theme Selector Sub-Panel */}
          {showThemeModal && (
            <View style={[styles.themeSubPanel, { backgroundColor: themeColors.surface }]}>
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
                      setShowThemeModal(false);
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

          {/* 2. Export Data */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: themeColors.border, borderBottomWidth: 1 }]}
            onPress={() => setShowExportSubPanel(!showExportSubPanel)}
            activeOpacity={0.7}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.itemIcon, { backgroundColor: themeColors.softBlue }]}>
                <Ionicons name="download-outline" size={20} color={themeColors.blue} />
              </View>
              <Text style={[styles.itemText, { color: themeColors.text }]}>Data Export</Text>
            </View>
            <View style={styles.itemRight}>
              <Ionicons name={showExportSubPanel ? "chevron-down" : "chevron-forward"} size={18} color={themeColors.muted} />
            </View>
          </TouchableOpacity>

          {/* Export Format Selector Sub-Panel */}
          {showExportSubPanel && (
            <View style={[styles.themeSubPanel, { backgroundColor: themeColors.surface }]}>
              <TouchableOpacity
                style={styles.themeOptionBtn}
                onPress={() => {
                  handleExportData("json");
                  setShowExportSubPanel(false);
                }}
              >
                <Text style={[styles.themeOptionText, { color: themeColors.text }]}>Export JSON</Text>
                <Ionicons name="document-text-outline" size={18} color={themeColors.muted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.themeOptionBtn}
                onPress={() => {
                  handleExportData("csv");
                  setShowExportSubPanel(false);
                }}
              >
                <Text style={[styles.themeOptionText, { color: themeColors.text }]}>Export CSV</Text>
                <Ionicons name="grid-outline" size={18} color={themeColors.muted} />
              </TouchableOpacity>
            </View>
          )}

          {/* 3. About App */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleAboutApp}
            activeOpacity={0.7}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.itemIcon, { backgroundColor: themeColors.softTeal }]}>
                <Ionicons name="information-circle-outline" size={20} color={themeColors.teal} />
              </View>
              <Text style={[styles.itemText, { color: themeColors.text }]}>About App</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={themeColors.muted} />
          </TouchableOpacity>

        </View>

        {/* 4. Logout Section */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: themeColors.softExpense, borderColor: themeColors.expense + "33" }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="logout" size={20} color={themeColors.expense} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: themeColors.expense }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

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
        confirmText={alertConfig.confirmText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 18, paddingBottom: 40 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 18,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "800",
  },
  userBadge: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  menuList: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
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
  themeSubPanel: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  themeOptionBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: "700",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "800",
  },
});
