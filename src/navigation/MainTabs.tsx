import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DashboardScreen from "../screens/DashboardScreen";
import HistoryScreen from "../screens/HistoryScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import CategoriesScreen from "../screens/CategoriesScreen";
import { useTheme } from "../context/ThemeContext";

const Tab = createBottomTabNavigator();

// Empty component for 'Add' tab since button click intercepts navigation
function DummyAddScreen() {
  return null;
}

export default function MainTabs({ navigation }: any) {
  const { themeColors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.muted,
        tabBarStyle: {
          height: 64,
          borderTopColor: themeColors.border,
          backgroundColor: themeColors.card,
          elevation: 8,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -3 },
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginBottom: 6,
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
    top: -16,
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