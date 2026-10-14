import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import KeyboardAwareScrollView, { KeyboardAwareScrollViewRef } from "../components/KeyboardAwareScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { addRepayment, fetchLoans } from "../redux/slices/loanSlice";
import { useTheme } from "../context/ThemeContext";
import { Loan } from "../types/loan";
import { computePendingBalance, roundCurrency } from "../utils/accounting";
import CustomAlertModal from "../components/CustomAlertModal";
import CustomTimePicker from "../components/CustomTimePicker";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";

export default function AddRepaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { loan, personName } = route.params as { loan: Loan; personName: string };

  const dispatch = useAppDispatch();
  const { themeColors } = useTheme();
  const paymentMethods = useAppSelector((state: any) => state.payments.items);

  const pending = useMemo(
    () => loan.pending_balance ?? computePendingBalance(loan.amount, (loan.repayments ?? []).map((r) => r.amount)),
    [loan]
  );

  const [amount, setAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    loan.payment_method ?? paymentMethods[0]?.label ?? "GPay"
  );
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const [noteLayoutY, setNoteLayoutY] = useState<number | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
    iconColor?: string;
    iconBg?: string;
    showCancel: boolean;
    onConfirm: () => void;
  }>({ visible: false, title: "", message: "", icon: "alert-circle-outline", showCancel: false, onConfirm: () => {} });

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

  // Live preview
  const numericAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const pendingAfter = roundCurrency(pending - numericAmount);
  const willSettle = pendingAfter <= 0 && numericAmount > 0;
  const exceedsPending = numericAmount > pending + 0.001;

  // Calendar helpers
  const getDays = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const daysInMonth = getDays(calendarMonth);
  const startDayIndex = getFirstDay(calendarMonth);
  const calCells: (number | null)[] = [];
  for (let i = 0; i < startDayIndex; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
  const monthLabel = calendarMonth.toLocaleString("en-IN", { month: "long", year: "numeric" });

  const handleDaySelect = (dayNum: number) => {
    const next = new Date(date);
    next.setFullYear(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayNum);
    setDate(next);
    setShowCustomCalendar(false);
    if (Platform.OS !== "web") setTimeout(() => setShowTimePicker(true), 300);
  };

  const handleSave = async () => {
    if (isSavingRef.current) return;

    if (numericAmount <= 0) {
      showAlert("Invalid Amount", "Enter an amount greater than 0", "alert-circle-outline", false, () => {}, themeColors.expense, themeColors.softExpense);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (exceedsPending) {
      showAlert(
        "Too much",
        `Repayment can't be more than ₹${pending.toLocaleString("en-IN")} pending`,
        "alert-circle-outline",
        false,
        () => {},
        themeColors.expense,
        themeColors.softExpense
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (new Date(date) < new Date(loan.date)) {
      showAlert("Invalid date", "Date can't be before the loan date", "alert-circle-outline", false, () => {}, themeColors.expense, themeColors.softExpense);
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const idempotencyKey = await Crypto.randomUUID();
      await dispatch(
        addRepayment({
          loan,
          amount: numericAmount,
          date: date.toISOString(),
          payment_method: selectedPaymentMethod,
          note: note.trim(),
          idempotency_key: idempotencyKey,
        })
      ).unwrap();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dispatch(fetchLoans(undefined));
      navigation.goBack();
    } catch (err: any) {
      showAlert("Error", err || "Could not save repayment.", "alert-circle-outline", false, () => {}, themeColors.expense, themeColors.softExpense);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const isLent = loan.direction === "lent";
  const accentColor = isLent ? "#2EAA5A" : "#E05345";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Add Repayment</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.headerSaveBtn, (isSaving || exceedsPending || numericAmount <= 0) && { opacity: 0.5 }]}
            disabled={isSaving || exceedsPending || numericAmount <= 0}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="checkmark" size={24} color="#6C5CE7" />
          </TouchableOpacity>
        </View>

        <KeyboardAwareScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          keyboardShouldPersistTaps="handled"
          extraScrollHeight={80}
        >
          {/* Context card */}
          <View style={[styles.contextCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.contextPerson, { color: themeColors.text }]}>{personName}</Text>
            <Text style={[styles.contextDirection, { color: themeColors.muted }]}>
              {isLent ? "You lent" : "You borrowed"} · {loan.payment_method}
            </Text>
            <View style={styles.contextAmountsRow}>
              <View>
                <Text style={[styles.contextAmtLabel, { color: themeColors.muted }]}>Original</Text>
                <Text style={[styles.contextAmtValue, { color: themeColors.text }]}>
                  ₹{loan.amount.toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={[styles.contextAmtLabel, { color: themeColors.muted }]}>Repaid</Text>
                <Text style={[styles.contextAmtValue, { color: "#27AE60" }]}>
                  ₹{((loan.repayments ?? []).reduce((s, r) => s + r.amount, 0)).toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.contextAmtLabel, { color: themeColors.muted }]}>Pending</Text>
                <Text style={[styles.contextAmtValue, { color: accentColor, fontWeight: "800" }]}>
                  ₹{pending.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          </View>

          {/* Repayment Amount */}
          <Text style={[styles.sectionLabel, { color: themeColors.muted }]}>Repayment amount</Text>
          <View style={[styles.amountBox, { backgroundColor: themeColors.card, borderColor: exceedsPending ? themeColors.expense : themeColors.border }]}>
            <Text style={[styles.rupeeSymbol, { color: accentColor }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: themeColors.text }]}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={themeColors.muted}
              value={amount}
              onChangeText={setAmount}
              onFocus={() => {
                scrollRef.current?.scrollToPosition(0, 0, true);
              }}
            />
          </View>
          {exceedsPending && (
            <Text style={styles.validationError}>
              Repayment can't be more than ₹{pending.toLocaleString("en-IN")} pending
            </Text>
          )}

          {/* Live preview */}
          {numericAmount > 0 && !exceedsPending && (
            <View style={[styles.previewBox, { backgroundColor: willSettle ? "#EAF8EF" : themeColors.card, borderColor: willSettle ? "#2EAA5A" : themeColors.border }]}>
              <Text style={[styles.previewLabel, { color: themeColors.muted }]}>Pending after this</Text>
              <Text style={[styles.previewValue, { color: willSettle ? "#2EAA5A" : themeColors.text }]}>
                ₹{Math.max(0, pendingAfter).toLocaleString("en-IN")}
                {willSettle ? "  ✓ Loan will be settled" : ""}
              </Text>
            </View>
          )}

          {/* Payment Method */}
          <Text style={[styles.sectionLabel, { color: themeColors.muted }]}>Payment method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }} contentContainerStyle={{ gap: 10 }}>
            {paymentMethods.map((pm: any) => {
              const isSelected = pm.label === selectedPaymentMethod;
              return (
                <TouchableOpacity
                  key={pm.id}
                  style={[styles.paymentChip, {
                    backgroundColor: isSelected ? "#6C5CE7" : themeColors.card,
                    borderColor: isSelected ? "#6C5CE7" : themeColors.border,
                  }]}
                  onPress={() => setSelectedPaymentMethod(pm.label)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name={pm.icon as any} size={15} color={isSelected ? "#fff" : pm.color} />
                  <Text style={[styles.paymentChipLabel, { color: isSelected ? "#fff" : themeColors.text }]}>
                    {pm.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Date */}
          <Text style={[styles.sectionLabel, { color: themeColors.muted }]}>Repayment date</Text>
          <TouchableOpacity
            style={[styles.selectorBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={() => setShowCustomCalendar(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={18} color={themeColors.muted} />
            <Text style={[styles.selectorText, { color: themeColors.text }]}>
              {date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </Text>
          </TouchableOpacity>

          {/* Note */}
          <Text style={[styles.sectionLabel, { color: themeColors.muted }]}>Note (optional)</Text>
          <View
            onLayout={(e) => {
              setNoteLayoutY(e.nativeEvent.layout.y);
            }}
          >
            <TextInput
              style={[styles.noteInput, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="Add a note..."
              placeholderTextColor={themeColors.muted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
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
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: "#6C5CE7", opacity: exceedsPending || numericAmount <= 0 ? 0.5 : 1, marginTop: 24, marginBottom: 40 }]}
            onPress={handleSave}
            disabled={isSaving || exceedsPending || numericAmount <= 0}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Repayment</Text>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>

      {/* Calendar Modal */}
      <Modal visible={showCustomCalendar} transparent animationType="fade" onRequestClose={() => setShowCustomCalendar(false)}>
        <TouchableOpacity style={styles.calendarOverlay} activeOpacity={1} onPress={() => setShowCustomCalendar(false)}>
          <View style={[styles.calendarSheet, { backgroundColor: themeColors.card }]}>
            <View style={styles.calNavRow}>
              <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                <Ionicons name="chevron-back" size={22} color={themeColors.text} />
              </TouchableOpacity>
              <Text style={[styles.calMonthLabel, { color: themeColors.text }]}>{monthLabel}</Text>
              <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                <Ionicons name="chevron-forward" size={22} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.weekRow}>
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                <Text key={d} style={[styles.weekDayText, { color: themeColors.muted }]}>{d}</Text>
              ))}
            </View>
            <View style={styles.calGrid}>
              {calCells.map((cell, i) => {
                const isSelected = cell !== null && date.getDate() === cell &&
                  date.getMonth() === calendarMonth.getMonth() &&
                  date.getFullYear() === calendarMonth.getFullYear();
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.calCell, isSelected && { backgroundColor: "#6C5CE7" }]}
                    onPress={() => cell && handleDaySelect(cell)}
                    disabled={!cell}
                  >
                    {cell && <Text style={[styles.calCellText, { color: isSelected ? "#fff" : themeColors.text }]}>{cell}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Time Picker */}
      <CustomTimePicker
        visible={showTimePicker}
        currentDate={date}
        onConfirm={(picked) => { setDate(picked); setShowTimePicker(false); }}
        onCancel={() => setShowTimePicker(false)}
      />

      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon as any}
        iconColor={alertConfig.iconColor}
        iconBg={alertConfig.iconBg}
        showCancel={alertConfig.showCancel}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerSaveBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800" },
  scrollContent: { padding: 16 },

  contextCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  contextPerson: { fontSize: 17, fontWeight: "800", marginBottom: 2 },
  contextDirection: { fontSize: 13, marginBottom: 12 },
  contextAmountsRow: { flexDirection: "row", justifyContent: "space-between" },
  contextAmtLabel: { fontSize: 11, marginBottom: 2 },
  contextAmtValue: { fontSize: 15, fontWeight: "700" },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 18,
  },

  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rupeeSymbol: { fontSize: 22, fontWeight: "800", marginRight: 6 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: "800", paddingVertical: 8 },

  validationError: { color: "#E05345", fontSize: 12, fontWeight: "600", marginTop: 6 },

  previewBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
  },
  previewLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  previewValue: { fontSize: 16, fontWeight: "800" },

  paymentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  paymentChipLabel: { fontSize: 13, fontWeight: "700" },

  selectorBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  selectorText: { fontSize: 15, fontWeight: "600" },

  noteInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 70,
    textAlignVertical: "top",
  },

  saveContainer: { padding: 16, paddingBottom: 24, borderTopWidth: 1 },
  saveButton: { borderRadius: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  calendarOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 24,
  },
  calendarSheet: { borderRadius: 20, padding: 16, width: "100%", maxWidth: 340 },
  calNavRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  calMonthLabel: { fontSize: 15, fontWeight: "800" },
  weekRow: { flexDirection: "row", marginBottom: 8 },
  weekDayText: { width: "14.28%", textAlign: "center", fontSize: 11, fontWeight: "700" },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  calCellText: { fontSize: 13, fontWeight: "600" },
});
