import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme, ThemeMode } from "../context/ThemeContext";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { setDeviceLockEnabled } from "../redux/slices/authSlice";
import CustomAlertModal from "../components/CustomAlertModal";
import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AnimatedButton from '../components/AnimatedButton';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const { themeMode, setThemeMode, themeColors } = useTheme();
  const transactions = useAppSelector((state) => state.transactions.items);
  const user = useAppSelector((state) => state.auth.user);
  const deviceLockEnabled = useAppSelector((state) => state.auth.deviceLockEnabled);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showAlert(
      "Expense Tracker v2.0.0",
      "A minimal, fast, and beautiful expense & income tracking application built with React Native and TypeScript.\n\nFeatures:\n• Income & Expense Tracking\n• Supabase Cloud Sync & Google OAuth Sign-In\n• Dynamic SVG Analytics (Bar & Donut Charts)\n• Native App Lock (Biometrics/PIN)\n• System Dark & Light Theme Support\n• Custom Date Range Data Export (JSON/CSV)",
      "information-circle-outline",
      false,
      () => {},
      themeColors.primary,
      themeColors.softPurple
    );
  };

  const handleToggleDeviceLock = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      // Trying to turn ON
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

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

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to enable App Lock",
        fallbackLabel: "Use Passcode",
      });

      if (result.success) {
        dispatch(setDeviceLockEnabled(true));
        showAlert(
          "App Lock Enabled",
          "Your app is now protected by your device's native lock (Face ID/Fingerprint/Passcode).",
          "lock-closed-outline",
          false,
          () => {},
          themeColors.income,
          themeColors.softIncome
        );
      } else {
        showAlert(
          "Authentication Failed",
          "Failed to verify your identity. App Lock was not enabled.",
          "close-circle-outline",
          false,
          () => {},
          themeColors.expense,
          themeColors.softExpense
        );
      }
    } else {
      // Turn OFF
      dispatch(setDeviceLockEnabled(false));
    }
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
            <Text style={[styles.userBadge, { color: deviceLockEnabled ? themeColors.primary : themeColors.muted }]}>
              {deviceLockEnabled ? "🔒 App Lock Active" : "🔓 App Lock Disabled"}
            </Text>
          </View>
        </View>

        {/* Settings Group */}
        <View style={[styles.menuList, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          {/* 1. System Theme */}
          <AnimatedButton
            style={[styles.menuItem, { borderBottomColor: themeColors.border, borderBottomWidth: 1 }]}
            onPress={() => setShowThemeModal(!showThemeModal)}
            hapticFeedback="light"
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
          </AnimatedButton>

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
          <AnimatedButton
            style={[styles.menuItem, { borderBottomColor: themeColors.border, borderBottomWidth: 1 }]}
            onPress={() => setShowExportSubPanel(!showExportSubPanel)}
            hapticFeedback="light"
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
          </AnimatedButton>

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
          <AnimatedButton
            style={styles.menuItem}
            onPress={handleAboutApp}
            hapticFeedback="light"
          >
            <View style={styles.itemLeft}>
              <View style={[styles.itemIcon, { backgroundColor: themeColors.softTeal }]}>
                <Ionicons name="information-circle-outline" size={20} color={themeColors.teal} />
              </View>
              <Text style={[styles.itemText, { color: themeColors.text }]}>About App</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={themeColors.muted} />
          </AnimatedButton>

          {/* 4. App Lock Toggle */}
          <View style={[styles.menuItem, { borderTopColor: themeColors.border, borderTopWidth: 1 }]}>
            <View style={styles.itemLeft}>
              <View style={[styles.itemIcon, { backgroundColor: themeColors.softIncome }]}>
                <Ionicons name="lock-closed-outline" size={20} color={themeColors.income} />
              </View>
              <Text style={[styles.itemText, { color: themeColors.text }]}>App Lock</Text>
            </View>
            <Switch
              value={deviceLockEnabled}
              onValueChange={handleToggleDeviceLock}
              trackColor={{ false: themeColors.border, true: themeColors.primary }}
              thumbColor={"#ffffff"}
            />
          </View>

        </View>

        {/* 5. Logout Section */}
        <AnimatedButton
          style={[styles.logoutButton, { backgroundColor: themeColors.softExpense, borderColor: themeColors.expense + "33" }]}
          onPress={handleLogout}
          hapticFeedback="light"
        >
          <MaterialCommunityIcons name="logout" size={20} color={themeColors.expense} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: themeColors.expense }]}>Logout</Text>
        </AnimatedButton>
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
