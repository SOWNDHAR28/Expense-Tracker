import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTransactions } from "../context/TransactionContext";
import { useTheme } from "../context/ThemeContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import CustomAlertModal from "../components/CustomAlertModal";

const { width } = Dimensions.get("window");

export default function AddIncomeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const transaction = route.params?.transaction;
  const isEditing = !!transaction;

  const { addTransaction, updateTransaction, incomeCategories } = useTransactions();
  const { themeColors } = useTheme();

  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [selectedSource, setSelectedSource] = useState(
    transaction ? transaction.category : (incomeCategories.length > 0 ? incomeCategories[0].label : "Salary")
  );
  const [date, setDate] = useState(transaction ? new Date(transaction.date) : new Date());
  const [note, setNote] = useState(transaction ? (transaction.note || "") : "");

  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(date);
  const [showTimePicker, setShowTimePicker] = useState(false);

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
  }>({
    visible: false,
    title: "",
    message: "",
    icon: "alert-circle-outline",
    showCancel: false,
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    icon = "alert-circle-outline",
    showCancel = false,
    onConfirm = () => {},
    iconColor?: string,
    iconBg?: string
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
    });
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(calendarMonth);
  const startDayIndex = getFirstDayOfMonth(calendarMonth);

  const prevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const handleDaySelect = (dayNum: number) => {
    const nextDate = new Date(date);
    nextDate.setFullYear(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayNum);
    setDate(nextDate);
    setShowCustomCalendar(false);
    if (Platform.OS !== "web") {
      setTimeout(() => setShowTimePicker(true), 300);
    }
  };

  const calendarGridCells: (number | null)[] = [];
  for (let i = 0; i < startDayIndex; i++) {
    calendarGridCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarGridCells.push(d);
  }

  const monthLabel = calendarMonth.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const handleSave = async () => {
    if (isSavingRef.current) return;

    const numericAmount = Number(amount.replace(/,/g, ""));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showAlert(
        "Invalid Amount",
        "Please enter a valid income amount.",
        "alert-circle-outline",
        false,
        () => {},
        themeColors.expense,
        themeColors.softExpense
      );
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      if (isEditing) {
        await updateTransaction(transaction.id, {
          amount: String(numericAmount),
          category: selectedSource,
          note: note.trim(),
          date: date.toISOString(),
        });
        showAlert(
          "Income Updated",
          "Income transaction updated successfully!",
          "checkmark-circle-outline",
          false,
          () => {
            navigation.goBack();
          },
          themeColors.income,
          themeColors.softIncome
        );
      } else {
        await addTransaction({
          type: "income",
          amount: String(numericAmount),
          category: selectedSource,
          note: note.trim(),
          date: date.toISOString(),
          paymentMethod: "Bank Transfer",
        });
        showAlert(
          "Income Saved",
          "Income transaction added successfully!",
          "checkmark-circle-outline",
          false,
          () => {
            navigation.goBack();
          },
          themeColors.income,
          themeColors.softIncome
        );
      }
    } catch (err: any) {
      showAlert(
        "Save Failed",
        err.message || "Something went wrong.",
        "alert-circle-outline",
        false,
        () => {},
        themeColors.expense,
        themeColors.softExpense
      );
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
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
          <Text style={[styles.title, { color: themeColors.text }]}>
            {isEditing ? "Edit Income" : "Add Income"}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.iconButton, isSaving && { opacity: 0.5 }]}
            disabled={isSaving}
          >
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

          {/* Source Selection Grid - 3 items in a row */}
          <Text style={[styles.label, { color: themeColors.text }]}>Source</Text>
          <View style={styles.grid}>
            {incomeCategories.map((item) => {
              const selected = selectedSource.toLowerCase() === item.label.toLowerCase();
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.gridCard,
                    {
                      backgroundColor: selected ? themeColors.softGreen : themeColors.card,
                      borderColor: selected ? themeColors.income : themeColors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedSource(item.label)}
                >
                  <View style={[styles.gridIconWrap, { backgroundColor: `${item.color}22` }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text
                    style={[
                      styles.gridLabel,
                      { color: selected ? themeColors.income : themeColors.text },
                    ]}
                    numberOfLines={1}
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
            onPress={() => {
              setCalendarMonth(date);
              setShowCustomCalendar(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color={themeColors.muted} style={styles.fieldIcon} />
            <Text style={[styles.fieldText, { color: themeColors.text }]}>
              {formatDateText(date)}
            </Text>
            <Ionicons name="chevron-down" size={18} color={themeColors.muted} />
          </TouchableOpacity>

          {/* Platform Conditional Native TimePicker */}
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
              placeholder="E.g. Monthly payroll or dividend"
              placeholderTextColor={themeColors.muted}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: themeColors.primary }, isSaving && { opacity: 0.7 }]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Styled Premium Calendar Modal */}
      <Modal
        visible={showCustomCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCustomCalendar(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCustomCalendar(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.calendarModalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                {/* Modal Header */}
                <View style={styles.calendarModalHeader}>
                  <Text style={[styles.calendarModalTitle, { color: themeColors.text }]}>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowCustomCalendar(false)}>
                    <Ionicons name="close" size={24} color={themeColors.text} />
                  </TouchableOpacity>
                </View>

                {/* Calendar Navigation */}
                <View style={styles.calendarNavRow}>
                  <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={20} color={themeColors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.calendarMonthLabel, { color: themeColors.text }]}>{monthLabel}</Text>
                  <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={20} color={themeColors.text} />
                  </TouchableOpacity>
                </View>

                {/* Weekdays Row */}
                <View style={styles.weekdaysRow}>
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
                    <Text key={dayName} style={[styles.weekdayText, { color: themeColors.muted }]}>
                      {dayName}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                  {calendarGridCells.map((dayNum, index) => {
                    if (dayNum === null) {
                      return <View key={`empty-${index}`} style={styles.dayCell} />;
                    }

                    const isToday =
                      new Date().getDate() === dayNum &&
                      new Date().getMonth() === calendarMonth.getMonth() &&
                      new Date().getFullYear() === calendarMonth.getFullYear();

                    const isSelected =
                      date !== null &&
                      date.getDate() === dayNum &&
                      date.getMonth() === calendarMonth.getMonth() &&
                      date.getFullYear() === calendarMonth.getFullYear();

                    return (
                      <TouchableOpacity
                        key={`day-${dayNum}`}
                        style={[
                          styles.dayCell,
                          isSelected && { backgroundColor: themeColors.primary },
                          isToday && !isSelected && { borderColor: themeColors.primary, borderWidth: 1.5 },
                        ]}
                        onPress={() => handleDaySelect(dayNum)}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            { color: isSelected ? "#FFFFFF" : themeColors.text },
                            isSelected && { fontWeight: "800" },
                          ]}
                        >
                          {dayNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Custom Modern Popup Alert Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        iconBg={alertConfig.iconBg}
        showCancel={alertConfig.showCancel}
        onConfirm={alertConfig.onConfirm}
        confirmText="OK"
      />
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
    paddingTop: Platform.OS === "ios" ? 16 : 28,
    paddingBottom: 14,
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
    marginTop: 20,
    marginBottom: 8,
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
    fontWeight: "700",
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridCard: {
    width: (width - 36 - 16) / 3,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  gridIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  gridLabel: {
    fontSize: 11,
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
  /* Custom Modal Overlay Calendar Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarModalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  calendarModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  calendarNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
  },
  calendarMonthLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  weekdayText: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
