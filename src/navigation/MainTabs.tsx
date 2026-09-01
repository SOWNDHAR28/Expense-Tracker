import React, { useRef } from "react";
import { View, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DashboardScreen from "../screens/DashboardScreen";
import HistoryScreen from "../screens/HistoryScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import CategoriesScreen from "../screens/CategoriesScreen";
import { useTheme } from "../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

const Tab = createBottomTabNavigator();

// Empty placeholder for the FAB tab slot
function DummyAddScreen() {
  return null;
}

// Animated Floating Action Button with spring scale + medium haptic
function AnimatedFAB({ onPress, themeColors }: { onPress: () => void; themeColors: any }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 12,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={styles.floatingButtonContainer}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          styles.floatingCircle,
          { backgroundColor: themeColors.primary, transform: [{ scale }] },
        ]}
      >
        <MaterialCommunityIcons name="plus" size={30} color="#FFFFFF" />
      </Animated.View>
    </TouchableOpacity>
  );
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
          minHeight: 68 + (insets.bottom > 0 ? 0 : 8),
        },
        tabBarItemStyle: {
          paddingVertical: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginBottom: insets.bottom > 0 ? 0 : 4,
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
        // Add light haptic to every tab press
        tabBarButton: (props) => {
          if (route.name === "Add") return null;
          return (
            <TouchableOpacity
              {...props}
              onPress={(e) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                props.onPress?.(e);
              }}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />

      {/* Central Animated FAB */}
      <Tab.Screen
        name="Add"
        component={DummyAddScreen}
        options={{
          tabBarButton: () => (
            <AnimatedFAB
              themeColors={themeColors}
              onPress={() => navigation.navigate("AddTransactionModal")}
            />
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