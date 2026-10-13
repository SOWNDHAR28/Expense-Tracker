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
  ActivityIndicator,
} from "react-native";
import KeyboardAwareScrollView, { KeyboardAwareScrollViewRef } from "../components/KeyboardAwareScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { addTransaction, updateTransaction } from "../redux/slices/transactionSlice";
import { useTheme } from "../context/ThemeContext";
import { formatPercent } from "../utils/format";
import { expenseCategories } from "../constants/categories";
import CustomAlertModal from "../components/CustomAlertModal";
import CustomTimePicker from "../components/CustomTimePicker";
import AnimatedButton from "../components/AnimatedButton";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto"; // To generate UUIDs for local items

const { width } = Dimensions.get("window");
// Responsive card width: allows 3 full columns plus a visible peek of the 4th column to hint at horizontal scrolling
const CARD_WIDTH = Math.max(94, Math.floor((width - 60) / 3.25));

const PREFERRED_PAYMENT_ORDER = ["gpay", "cash", "debit card", "credit card"];

export default function AddExpenseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const transaction = route.params?.transaction;
  const isEditing = !!transaction;

  const dispatch = useAppDispatch();
  const { themeColors } = useTheme();
  
  const customCategories = useAppSelector(state => state.categories.customCategories);
  const combinedExpenseCategories = [...expenseCategories, ...customCategories.filter(c => c.type === "expense")];
  
  const budgetLimits = useAppSelector((state) => state.budgets.limits);
  const transactions = useAppSelector((state) => state.transactions.items);

  // Categories ordered with the up-to-6 most recently used appearing first (visible by default),
  // followed by all remaining categories so users can scroll horizontally to access them.
  const orderedExpenseCategories = React.useMemo(() => {
    const seen = new Set<string>();
    const recentItems: typeof combinedExpenseCategories = [];

    if (isEditing && transaction?.category) {
      const currentMatch = combinedExpenseCategories.find(
        (c) => c.label.toLowerCase() === transaction.category.toLowerCase()
      );
      if (currentMatch) {
        seen.add(currentMatch.label.toLowerCase());
        recentItems.push(currentMatch);
      }
    }

    const expenseTxns = [...transactions]
      .filter((t) => t.type === "expense")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (const t of expenseTxns) {
      const key = t.category.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        const match = combinedExpenseCategories.find(
          (c) => c.label.toLowerCase() === key
        );
        if (match) {
          recentItems.push(match);
        }
      }
      if (recentItems.length >= 6) break;
    }

    // Append all remaining categories so none are truncated
    const remaining = combinedExpenseCategories.filter(
      (c) => !seen.has(c.label.toLowerCase())
    );

    return [...recentItems, ...remaining];
  }, [transactions, combinedExpenseCategories, isEditing, transaction]);

  const paymentMethods = useAppSelector((state) => state.payments.items);

  // Most recently used payment method from history (defaulting to GPay for first-time users)
  const recentPaymentMethod = React.useMemo(() => {
    if (isEditing && transaction?.paymentMethod) return transaction.paymentMethod;
    const recent = [...transactions]
      .filter((t) => t.paymentMethod)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return recent?.paymentMethod || "GPay";
  }, [transactions, isEditing, transaction]);

  // Dynamic payment methods ordering:
  // Places the most recently used payment method in the 1st position,
  // with remaining methods ordered by [GPay, Cash, Debit Card, Credit Card]
  const orderedPaymentMethods = React.useMemo(() => {
    const sorted = [...paymentMethods].sort((a, b) => {
      const idxA = PREFERRED_PAYMENT_ORDER.indexOf(a.label.toLowerCase());
      const idxB = PREFERRED_PAYMENT_ORDER.indexOf(b.label.toLowerCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.label.localeCompare(b.label);
    });

    const activeTarget = isEditing && transaction?.paymentMethod
      ? transaction.paymentMethod
      : recentPaymentMethod;

    if (!activeTarget) return sorted;

    const matched = sorted.find(p => p.label.toLowerCase() === activeTarget.toLowerCase());
    if (!matched) return sorted;

    return [matched, ...sorted.filter(p => p.id !== matched.id)];
  }, [paymentMethods, recentPaymentMethod, isEditing, transaction]);

  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");

  // Auto-preselect most recently used category on screen load
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (transaction?.category) return transaction.category;
    if (orderedExpenseCategories.length > 0) return orderedExpenseCategories[0].label;
    return "Food";
  });
  
  // Auto-preselect most recently used payment method on screen load
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(() => {
    if (transaction?.paymentMethod) return transaction.paymentMethod;
    return recentPaymentMethod || "GPay";
  });

  // Sync initial selections if history loads
  React.useEffect(() => {
    if (!isEditing) {
      if (orderedExpenseCategories.length > 0 && !selectedCategory) {
        setSelectedCategory(orderedExpenseCategories[0].label);
      }
      if (recentPaymentMethod && !selectedPaymentMethod) {
        setSelectedPaymentMethod(recentPaymentMethod);
      }
    }
  }, [isEditing, orderedExpenseCategories, recentPaymentMethod]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  const [date, setDate] = useState(transaction ? new Date(transaction.date) : new Date());
  const [note, setNote] = useState(transaction ? (transaction.note || "") : "");
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const [noteLayoutY, setNoteLayoutY] = useState<number | null>(null);

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

  const currentLimit = budgetLimits[selectedCategory];
  const currentMonthTransactions = transactions.filter((t) => {
    if (t.category.toLowerCase() !== selectedCategory.toLowerCase() || t.type !== "expense") return false;
    const txDate = new Date(t.date);
    const today = new Date();
    // Exclude the currently edited transaction so we don't double count it
    if (isEditing && t.id === transaction?.id) return false;
    return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
  });
  const monthlySpent = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  const numericAmountTyped = Number(amount.replace(/,/g, "")) || 0;
  const projectedTotal = monthlySpent + numericAmountTyped;
  const isApproachingLimit = currentLimit ? projectedTotal >= currentLimit * 0.8 && projectedTotal < currentLimit : false;
  const isExceedingLimit = currentLimit ? projectedTotal >= currentLimit : false;

  const handleSave = async () => {
    if (isSavingRef.current) return;

    const numericAmount = Number(amount.replace(/,/g, ""));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showAlert(
        "Invalid Amount",
        "Please enter a valid expense amount.",
        "alert-circle-outline",
        false,
        () => {},
        themeColors.expense,
        themeColors.softExpense
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      if (isEditing) {
        await dispatch(updateTransaction({
          ...transaction,
          amount: numericAmount,
          category: selectedCategory,
          paymentMethod: selectedPaymentMethod,
          note: note.trim(),
          date: date.toISOString(),
          updatedAt: new Date().toISOString(),
        })).unwrap();
      } else {
        await dispatch(addTransaction({
          id: Crypto.randomUUID(),
          type: "expense",
          amount: numericAmount,
          category: selectedCategory,
          note: note.trim(),
          date: date.toISOString(),
          paymentMethod: selectedPaymentMethod,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })).unwrap();
      }

      let alertTitle = isEditing ? "Expense Updated" : "Expense Saved";
      let alertMessage = isEditing ? "Expense transaction updated successfully!" : "Expense transaction added successfully!";
      let alertIcon = "checkmark-circle-outline";
      let iconColor = themeColors.income;
      let iconBg = themeColors.softIncome;

      if (isExceedingLimit) {
        alertTitle = "Budget Exceeded!";
        alertMessage = `You've spent ₹${projectedTotal.toLocaleString("en-IN")} and exceeded your monthly limit of ₹${currentLimit.toLocaleString("en-IN")} for ${selectedCategory}.`;
        alertIcon = "alert-circle";
        iconColor = themeColors.expense;
        iconBg = themeColors.softExpense;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else if (isApproachingLimit) {
        alertTitle = "Budget Warning";
        alertMessage = `You've reached ${formatPercent(projectedTotal, currentLimit)}% of your monthly limit for ${selectedCategory}.`;
        alertIcon = "warning";
        iconColor = "#FF9F43"; // Orange warning
        iconBg = "#FF9F4320";
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      showAlert(
        alertTitle,
        alertMessage,
        alertIcon,
        false,
        () => {
          navigation.goBack();
        },
        iconColor,
        iconBg
      );
    } catch (err: any) {
      showAlert(
        "Save Failed",
        typeof err === 'string' ? err : (err?.message || "Something went wrong."),
        "alert-circle-outline",
        false,
        () => {},
        themeColors.expense,
        themeColors.softExpense
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  const onSaveTime = (selectedDate: Date) => {
    setDate(selectedDate);
    setShowTimePicker(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <AnimatedButton onPress={() => navigation.goBack()} style={styles.iconButton} hapticFeedback="light">
            <Ionicons name="chevron-back" size={24} color={themeColors.text} />
          </AnimatedButton>
          <Text style={[styles.title, { color: themeColors.text }]}>
            {isEditing ? "Edit Expense" : "Add Expense"}
          </Text>
          <AnimatedButton
            onPress={handleSave}
            style={[styles.iconButton, isSaving && { opacity: 0.5 }]}
            disabled={isSaving}
            hapticFeedback="light"
          >
            <Ionicons name="checkmark" size={24} color={themeColors.primary} />
          </AnimatedButton>
        </View>

        <KeyboardAwareScrollView 
          ref={scrollRef}
          style={{ flex: 1 }} 
          contentContainerStyle={styles.container} 
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          keyboardShouldPersistTaps="handled"
          extraScrollHeight={60}
        >
          {/* Amount Input */}
          <Text style={[styles.label, { color: themeColors.text }]}>Amount</Text>
          <View style={[styles.amountContainer, { backgroundColor: themeColors.card, borderColor: isExceedingLimit ? themeColors.expense : isApproachingLimit ? "#FF9F43" : themeColors.border }]}>
            <Text style={[styles.rupeeSymbol, { color: themeColors.text }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: themeColors.text }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={themeColors.muted}
              maxLength={10}
              onFocus={() => {
                scrollRef.current?.scrollToPosition(0, 0, true);
              }}
            />
          </View>
            
          {/* Real-time Budget Warning */}
          {(isApproachingLimit || isExceedingLimit) && (
            <Text style={{
              color: isExceedingLimit ? themeColors.expense : "#FF9F43",
              fontSize: 12,
              fontWeight: "600",
              marginTop: 6,
              marginBottom: 10,
              marginLeft: 4,
            }}>
              {isExceedingLimit 
                ? `This exceeds your monthly budget of ₹${currentLimit.toLocaleString("en-IN")}.` 
                : `This will push you to ${formatPercent(projectedTotal, currentLimit)}% of your limit.`}
            </Text>
          )}

          {/* Category Selection — Header with label and 'More →' discoverability button */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.label, { color: themeColors.text, marginTop: 0, marginBottom: 0 }]}>
              Category
            </Text>
            <TouchableOpacity
              style={styles.moreHeaderBtn}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.moreHeaderText, { color: themeColors.primary }]}>More</Text>
              <Ionicons name="chevron-forward" size={14} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.categoryScrollContent}
            style={styles.categoryScroll}
          >
            {/* 2-row layout: columns rendered side-by-side, each column has [top, bottom] items */}
            {Array.from({ length: Math.ceil(orderedExpenseCategories.length / 2) }).map((_, colIdx) => {
              const top = orderedExpenseCategories[colIdx * 2];
              const bottom = orderedExpenseCategories[colIdx * 2 + 1];
              return (
                <View key={`col-${colIdx}`} style={styles.categoryColumn}>
                  {[top, bottom].map((item, rowIdx) =>
                    item ? (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.categoryCard,
                          {
                            backgroundColor: selectedCategory.toLowerCase() === item.label.toLowerCase()
                              ? themeColors.softExpense
                              : themeColors.card,
                            borderColor: selectedCategory.toLowerCase() === item.label.toLowerCase()
                              ? themeColors.expense
                              : themeColors.border,
                            borderWidth: selectedCategory.toLowerCase() === item.label.toLowerCase() ? 2 : 1,
                          },
                        ]}
                        onPress={() => setSelectedCategory(item.label)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.categoryIconWrap, { backgroundColor: `${item.color}22` }]}>
                          <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                        </View>
                        <Text
                          style={[
                            styles.categoryCardLabel,
                            { color: selectedCategory.toLowerCase() === item.label.toLowerCase() ? themeColors.expense : themeColors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View key={`empty-${rowIdx}`} style={[styles.categoryCard, { borderWidth: 0, backgroundColor: "transparent" }]} />
                    )
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Payment Method — single-row horizontal scroll */}
          <Text style={[styles.label, { color: themeColors.text }]}>Payment Method</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.paymentScrollContent}
          >
            {orderedPaymentMethods.map((item) => {
              const selected = selectedPaymentMethod.toLowerCase() === item.label.toLowerCase();
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.paymentCard,
                    {
                      backgroundColor: selected ? themeColors.softExpense : themeColors.card,
                      borderColor: selected ? themeColors.expense : themeColors.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedPaymentMethod(item.label)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.categoryIconWrap, { backgroundColor: `${item.color}22` }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <Text
                    style={[
                      styles.paymentCardLabel,
                      { color: selected ? themeColors.expense : themeColors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

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

          {/* Custom TimePicker */}
          <CustomTimePicker
            visible={showTimePicker}
            onClose={() => setShowTimePicker(false)}
            onSave={onSaveTime}
            initialDate={date}
          />

          {/* Note Field */}
          <Text style={[styles.label, { color: themeColors.text }]}>Note (Optional)</Text>
          <View
            onLayout={(e) => {
              setNoteLayoutY(e.nativeEvent.layout.y);
            }}
            style={[styles.noteInputRow, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
          >
            <TextInput
              style={[styles.noteFieldInput, { color: themeColors.text }]}
              value={note}
              onChangeText={setNote}
              placeholder="E.g. Coffee or dinner with friends"
              placeholderTextColor={themeColors.muted}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
              scrollEnabled={true}
              onFocus={() => {
                if (noteLayoutY !== null) {
                  scrollRef.current?.scrollToInput(noteLayoutY, 40);
                } else {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }
              }}
            />
          </View>

          {/* Save Button */}
          <AnimatedButton
            style={[
              styles.saveButton, 
              { backgroundColor: themeColors.primary, marginTop: 12 },
              isSaving && { opacity: 0.7 }
            ]}
            onPress={handleSave}
            disabled={isSaving}
            hapticFeedback="light"
          >
            {isSaving ? (
              <ActivityIndicator color={themeColors.card} />
            ) : (
              <Text style={[styles.saveButtonText, { color: themeColors.card }]}>
                {isEditing ? "Save Changes" : "Save Expense"}
              </Text>
            )}
          </AnimatedButton>
        </KeyboardAwareScrollView>

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

      {/* Category Selection Modal for 'More' discoverability */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCategoryModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.categoryModalCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                {/* Modal Header */}
                <View style={styles.categoryModalHeader}>
                  <View>
                    <Text style={[styles.categoryModalTitle, { color: themeColors.text }]}>All Categories</Text>
                    <Text style={[styles.categoryModalSubtitle, { color: themeColors.muted }]}>
                      Select an expense category
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowCategoryModal(false)}
                    style={[styles.categoryModalCloseBtn, { backgroundColor: themeColors.surface }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={20} color={themeColors.text} />
                  </TouchableOpacity>
                </View>

                {/* Categories Grid inside Modal */}
                <ScrollView
                  style={styles.categoryModalScroll}
                  contentContainerStyle={styles.categoryModalGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {combinedExpenseCategories.map((item) => {
                    const isSelected = selectedCategory.toLowerCase() === item.label.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.categoryModalItemCard,
                          {
                            backgroundColor: isSelected ? themeColors.softExpense : themeColors.surface,
                            borderColor: isSelected ? themeColors.expense : themeColors.border,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedCategory(item.label);
                          setShowCategoryModal(false);
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.categoryIconWrap, { backgroundColor: `${item.color}22` }]}>
                          <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
                        </View>
                        <Text
                          style={[
                            styles.categoryCardLabel,
                            { color: isSelected ? themeColors.expense : themeColors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  // Category horizontal scroll layout
  categoryScroll: {
    marginHorizontal: -2,
  },
  categoryScrollContent: {
    flexDirection: "row",
    paddingHorizontal: 2,
    gap: 8,
  },
  categoryColumn: {
    flexDirection: "column",
    gap: 8,
  },
  categoryCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  categoryCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  // Payment method horizontal scroll layout
  paymentScrollContent: {
    flexDirection: "row",
    paddingHorizontal: 2,
    gap: 8,
    paddingVertical: 2,
  },
  paymentCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentCardLabel: {
    fontSize: 12,
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
  noteInputRow: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 56,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "flex-start",
  },
  noteFieldInput: {
    fontSize: 15,
    fontWeight: "600",
    textAlignVertical: "top",
    minHeight: 36,
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 8,
  },
  moreHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 2,
  },
  moreHeaderText: {
    fontSize: 13,
    fontWeight: "700",
  },
  categoryModalCard: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "75%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  categoryModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.15)",
  },
  categoryModalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  categoryModalSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  categoryModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryModalScroll: {
    flexGrow: 0,
  },
  categoryModalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    paddingBottom: 8,
  },
  categoryModalItemCard: {
    width: "31%",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
