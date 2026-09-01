import React, { useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Transaction } from "../types/expense";
import { useTheme } from "../context/ThemeContext";
import { getCategoryMeta } from "../constants/categories";
import { currencyFormatter, formatTime } from "../utils/formatters";
import * as Haptics from "expo-haptics";
import { useAppSelector } from "../redux/hooks";

interface TransactionCardProps {
  transaction: Transaction;
  compact?: boolean;
  onPress?: () => void;
}

export default function ExpenseCard({
  transaction,
  compact = false,
  onPress,
}: TransactionCardProps) {
  const navigation = useNavigation<any>();
  const { themeColors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const customCategories = useAppSelector(state => state.categories.customCategories);

  const isIncome = transaction.type === "income";
  const meta = getCategoryMeta(transaction.category, customCategories);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      navigation.navigate("TransactionDetails", { transaction });
    }
  };

  const formattedAmount = isIncome
    ? `+₹${transaction.amount.toLocaleString("en-IN")}`
    : `-₹${transaction.amount.toLocaleString("en-IN")}`;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          compact && styles.compactCard,
          { backgroundColor: themeColors.card, borderColor: themeColors.border },
        ]}
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <View style={styles.row}>
          {/* Category Icon */}
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: `${meta.color}1E` },
            ]}
          >
            <MaterialCommunityIcons
              name={(meta.icon as any) || "circle"}
              size={22}
              color={meta.color}
            />
          </View>

          {/* Title and Category */}
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
              {transaction.note || transaction.category}
            </Text>
            <Text style={[styles.category, { color: themeColors.muted }]}>
              {transaction.category}
            </Text>
          </View>

          {/* Amount and Time */}
          <View style={styles.rightBlock}>
            <Text
              style={[
                styles.amount,
                { color: isIncome ? themeColors.income : themeColors.text },
              ]}
            >
              {formattedAmount}
            </Text>
            <Text style={[styles.time, { color: themeColors.muted }]}>
              {formatTime(transaction.date)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  compactCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  category: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  rightBlock: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 15,
    fontWeight: "800",
  },
  time: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: "500",
  },
});
