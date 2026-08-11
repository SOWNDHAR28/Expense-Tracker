import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { readJSON, removeKey, writeJSON } from "../utils/storage";
import { dbService } from "../storage/db";

type AuthRecord = {
  username: string;
  pin: string;
};

type AuthContextValue = {
  loading: boolean;
  username: string | null;
  hasAccount: boolean;
  deviceLockEnabled: boolean;
  justLoggedOut: boolean;
  setDeviceLockEnabled: (enabled: boolean) => Promise<void>;
  signUp: (username: string) => Promise<{ ok: boolean; error?: string }>;
  signIn: () => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<AuthRecord | null>(null);
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [deviceLockEnabled, setDeviceLockEnabledState] = useState(true);
  const [justLoggedOut, setJustLoggedOut] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = dbService.getUser();
        setAccount(saved);

        const lockSetting = await AsyncStorage.getItem("et_device_lock_enabled");
        if (lockSetting === "false") {
          setDeviceLockEnabledState(false);
        }

        // Do not auto-login on returning visits, they must unlock first.
        // Except for web development fallback or if device lock is turned off
        const finalLockEnabled = lockSetting !== "false";
        if (saved && (!finalLockEnabled || (typeof window !== "undefined" && window.location?.hostname === "localhost"))) {
          setActiveUser(saved.username);
        }
      } catch (err) {
        console.error("Failed to load auth session on startup:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      username: activeUser,
      hasAccount: !!account,
      deviceLockEnabled,
      justLoggedOut,
      setDeviceLockEnabled: async (enabled: boolean) => {
        try {
          setDeviceLockEnabledState(enabled);
          await AsyncStorage.setItem("et_device_lock_enabled", String(enabled));
        } catch (error) {
          console.error("Failed to save device lock settings:", error);
        }
      },
      signUp: async (username) => {
        const cleanUser = username.trim();
        if (!cleanUser) {
          return { ok: false, error: "Please enter your name." };
        }

        setJustLoggedOut(false);
        // Save username locally with a mock pin placeholder
        dbService.createUser(cleanUser, "native_device_lock");
        setAccount({ username: cleanUser, pin: "native_device_lock" });
        setActiveUser(cleanUser);
        return { ok: true };
      },
      signIn: async () => {
        const saved = dbService.getUser();
        if (!saved) {
          return { ok: false, error: "No profile found." };
        }

        setJustLoggedOut(false);
        // If lock is disabled, sign in immediately
        if (!deviceLockEnabled) {
          setActiveUser(saved.username);
          return { ok: true };
        }

        try {
          // Check if biometrics or screen lock exists
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();

          if (!hasHardware || !isEnrolled) {
            // Bypass security if device has no screen lock/biometrics (e.g. Simulator, Web)
            setActiveUser(saved.username);
            return { ok: true };
          }

          // Trigger local biometric/screen lock authentication overlay
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Authenticate to unlock your Expense Tracker",
            fallbackLabel: "Use PIN/Passcode",
            disableDeviceFallback: false,
          });

          if (result.success) {
            setActiveUser(saved.username);
            return { ok: true };
          } else {
            return { ok: false, error: "Authentication failed. Please try again." };
          }
        } catch (error) {
          console.error("LocalAuthentication error:", error);
          // Fallback bypass just in case native auth errors out on simulator
          setActiveUser(saved.username);
          return { ok: true };
        }
      },
      logout: async () => {
        const saved = dbService.getUser();
        setAccount(saved);
        setJustLoggedOut(true);
        setActiveUser(null);
      },
    }),
    [loading, account, activeUser, deviceLockEnabled, justLoggedOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
