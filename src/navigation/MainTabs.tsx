import React from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DashboardScreen from "../screens/DashboardScreen";
import HistoryScreen from "../screens/HistoryScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import CategoriesScreen from "../screens/CategoriesScreen";
import { useTheme } from "../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Tab = createBottomTabNavigator();

// Empty component for 'Add' tab since button click intercepts navigation
function DummyAddScreen() {
  return null;
}

export default function MainTabs({ navigation }: any) {
  const { themeColors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.muted,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          borderTopWidth: 0,
          borderTopColor: "transparent",
          backgroundColor: themeColors.card,
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: "transparent",
          minHeight: 64 + (insets.bottom > 0 ? 0 : 8), // Give a little extra if no gestures
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginBottom: insets.bottom > 0 ? 0 : 6,
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
            Home: "home",
            History: "clock-outline",
            Analytics: "chart-pie",
            Categories: "view-grid-outline",
          };

          if (route.name === "Add") return null;

          return (
            <MaterialCommunityIcons
              name={iconMap[route.name] ?? "circle-outline"}
              size={24}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      
      {/* Central Floating Action Button */}
      <Tab.Screen
        name="Add"
        component={DummyAddScreen}
        options={{
          tabBarButton: (props) => (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.floatingButtonContainer}
              onPress={() => navigation.navigate("AddTransactionModal")}
            >
              <View style={[styles.floatingCircle, { backgroundColor: themeColors.primary }]}>
                <MaterialCommunityIcons name="plus" size={30} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />

      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    top: -20,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#6C5CE7",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});