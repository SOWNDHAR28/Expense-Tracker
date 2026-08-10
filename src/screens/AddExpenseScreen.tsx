import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTransactions } from "../context/TransactionContext";
import { useTheme } from "../context/ThemeContext";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function AddExpenseScreen() {
  const navigation = useNavigation<any>();
  const { addTransaction, expenseCategories } = useTransactions();
  const { themeColors } = useTheme();

  const [amount, setAmount] = useState("220");
  const [selectedCategory, setSelectedCategory] = useState(
    expenseCategories.length > 0 ? expenseCategories[0].label : "Food"
  );
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSave = async () => {
    const numericAmount = Number(amount.replace(/,/g, ""));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid expense amount.");
      return;
    }

    await addTransaction({
      type: "expense",
      amount: String(numericAmount),
      category: selectedCategory,
      note: note.trim(),
      date: date.toISOString(),
      paymentMethod: "Cash",
    });

    Alert.alert("Expense Saved", "Expense transaction added successfully!", [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  const formatDateText = (d: Date) => {
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const nextDate = new Date(date);
      nextDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDate(nextDate);
      if (Platform.OS !== "web") {
        setTimeout(() => setShowTimePicker(true), 300); // Small delay to avoid overlay conflicts on iOS/Android
      }
    }
  };

  const onChangeTime = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const nextDate = new Date(date);
      nextDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setDate(nextDate);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeColors.text }]}>Add Expense</Text>
          <TouchableOpacity onPress={handleSave} style={styles.iconButton}>
            <Ionicons name="checkmark" size={24} color={themeColors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Amount Input */}
          <Text style={[styles.label, { color: themeColors.text }]}>Amount</Text>
          <View style={[styles.amountContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.rupeeSymbol, { color: themeColors.text }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: themeColors.text }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={themeColors.muted}
            />
          </View>

          {/* Category Selection Grid */}
          <Text style={[styles.label, { color: themeColors.text }]}>Category</Text>
          <View style={styles.grid}>
            {expenseCategories.map((item) => {
              const selected = selectedCategory.toLowerCase() === item.label.toLowerCase();
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.gridCard,
                    {
                      backgroundColor: selected ? themeColors.softExpense : themeColors.card,
                      borderColor: selected ? themeColors.expense : themeColors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedCategory(item.label)}
                >
                  <View style={[styles.gridIconWrap, { backgroundColor: `${item.color}22` }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text
                    style={[
                      styles.gridLabel,
                      { color: selected ? themeColors.expense : themeColors.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date & Time Field */}
          <Text style={[styles.label, { color: themeColors.text }]}>Date & Time</Text>
          <TouchableOpacity
            style={[styles.inputRow, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color={themeColors.muted} style={styles.fieldIcon} />
            <Text style={[styles.fieldText, { color: themeColors.text }]}>
              {formatDateText(date)}
            </Text>
            <Ionicons name="chevron-down" size={18} color={themeColors.muted} />
          </TouchableOpacity>

          {/* Platform Conditional DateTimePickers */}
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onChangeDate}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display="default"
              onChange={onChangeTime}
            />
          )}

          {/* Note Field */}
          <Text style={[styles.label, { color: themeColors.text }]}>Note (Optional)</Text>
          <View style={[styles.inputRow, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <TextInput
              style={[styles.fieldInput, { color: themeColors.text }]}
              value={note}
              onChangeText={setNote}
              placeholder="E.g. Lunch with friends"
              placeholderTextColor={themeColors.muted}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  container: {
    padding: 18,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 18,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 64,
    paddingHorizontal: 16,
  },
  rupeeSymbol: {
    fontSize: 24,
    fontWeight: "800",
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    height: "100%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridCard: {
    width: (Dimensions.get("window").width - 36 - 24) / 3,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  gridIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 52,
    paddingHorizontal: 14,
  },
  fieldIcon: {
    marginRight: 10,
  },
  fieldText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  fieldInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    shadowColor: "#6C5CE7",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
