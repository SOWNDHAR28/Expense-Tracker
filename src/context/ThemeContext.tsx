import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { colors as lightColors, darkColors } from "../theme/colors";
import { readJSON, writeJSON } from "../utils/storage";

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextType = {
  themeMode: ThemeMode;
  isDark: boolean;
  themeColors: typeof lightColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  // Start with "system" immediately — no blank loading screen
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  // Load saved preference in background after mount
  useEffect(() => {
    readJSON<ThemeMode>("theme_mode", "system").then((saved) => {
      if (saved !== "system") setThemeModeState(saved);
    }).catch(() => {/* ignore storage errors on first launch */});
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await writeJSON("theme_mode", mode);
  };

  const isDark = useMemo(() => {
    if (themeMode === "dark") return true;
    if (themeMode === "light") return false;
    return systemColorScheme === "dark";
  }, [themeMode, systemColorScheme]);

  const activeColors = isDark ? darkColors : lightColors;

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      themeColors: activeColors,
      setThemeMode,
    }),
    [themeMode, isDark, activeColors]
  );

  // Always render children — no null/loading gate that blocks the app
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
