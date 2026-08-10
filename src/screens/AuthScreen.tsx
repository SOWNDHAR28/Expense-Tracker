import React, { useState, useEffect } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function AuthScreen() {
  const { hasAccount, signIn, signUp } = useAuth();
  const { themeColors } = useTheme();

  const [username, setUsername] = useState("");

  // Trigger local lockscreen authentication automatically on returning visit
  useEffect(() => {
    if (hasAccount) {
      void handleUnlock();
    }
  }, [hasAccount]);

  const handleUnlock = async () => {
    const res = await signIn();
    if (!res.ok) {
      Alert.alert("Authentication Failed", res.error || "Lockscreen verification failed.");
    }
  };

  const handleCreateAccount = async () => {
    if (!username.trim()) {
      Alert.alert("Name Required", "Please enter your name.");
      return;
    }
    const res = await signUp(username);
    if (!res.ok) {
      Alert.alert("Error", res.error || "Failed to initialize profile.");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {/* Logo & Header */}
          <View style={styles.header}>
            <View style={[styles.logoWrap, { backgroundColor: themeColors.softPurple }]}>
              <MaterialCommunityIcons name="wallet" size={44} color={themeColors.primary} />
            </View>
            <Text style={[styles.appName, { color: themeColors.text }]}>Expense Tracker</Text>
            <Text style={[styles.tagline, { color: themeColors.muted }]}>
              Smart & Offline Personal Finance
            </Text>
          </View>

          {/* Card Container */}
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            {!hasAccount ? (
              // Onboarding Sign Up Screen
              <View>
                <Text style={[styles.formTitle, { color: themeColors.text }]}>Welcome</Text>
                <Text style={[styles.formSubtitle, { color: themeColors.muted }]}>
                  Please enter your name to personalize your offline tracker.
                </Text>

                {/* Name Input */}
                <Text style={[styles.label, { color: themeColors.text }]}>Name</Text>
                <View style={[styles.inputContainer, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <MaterialCommunityIcons name="account-outline" size={20} color={themeColors.muted} style={styles.inputIcon} />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter name"
                    placeholderTextColor={themeColors.muted}
                    style={[styles.input, { color: themeColors.text }]}
                    autoCapitalize="words"
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: themeColors.primary }]}
                  onPress={handleCreateAccount}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryText}>Get Started</Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            ) : (
              // Returning Visit Login Gateway
              <View style={{ alignItems: "center", paddingVertical: 10 }}>
                <Ionicons name="lock-closed-outline" size={54} color={themeColors.primary} style={{ marginBottom: 12 }} />
                <Text style={[styles.formTitle, { color: themeColors.text, textAlign: "center" }]}>
                  App Locked
                </Text>
                <Text style={[styles.formSubtitle, { color: themeColors.muted, textAlign: "center", marginBottom: 24 }]}>
                  Tap below to authenticate and access your transactions using your phone's native security lock.
                </Text>

                {/* Unlock Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: themeColors.primary, width: "100%" }]}
                  onPress={handleUnlock}
                  activeOpacity={0.8}
                >
                  <Ionicons name="finger-print-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryText}>Tap to Unlock</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  appName: {
    fontSize: 26,
    fontWeight: "800",
  },
  tagline: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  formSubtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 50,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
});