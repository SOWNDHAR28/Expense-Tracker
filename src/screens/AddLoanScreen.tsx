import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import KeyboardAwareScrollView, { KeyboardAwareScrollViewRef } from "../components/KeyboardAwareScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { createLoan, createPerson, fetchLoans, fetchPersons } from "../redux/slices/loanSlice";
import { fetchTransactions } from "../redux/slices/transactionSlice";
import { useTheme } from "../context/ThemeContext";
import CustomAlertModal from "../components/CustomAlertModal";
import CustomTimePicker from "../components/CustomTimePicker";
import AnimatedButton from "../components/AnimatedButton";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import { defaultPaymentMethods } from "../redux/slices/paymentSlice";

export default function AddLoanScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { themeColors } = useTheme();

  const persons = useAppSelector((state: any) => state.loans?.persons ?? []);
  const paymentMethods = useAppSelector((state: any) => state.payments.items);

  // --- Form State ---
  const [direction, setDirection] = useState<"lent" | "borrowed">("lent");
  const [amount, setAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    paymentMethods[0]?.label ?? "GPay"
  );
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState("");

  // --- Person state ---
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string } | null>(null);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [personSearch, setPersonSearch] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(date);

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

  // --- Calendar helpers ---
  const getDaysInMonth = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(calendarMonth);
  const startDayIndex = getFirstDay(calendarMonth);
  const calendarGridCells: (number | null)[] = [];
  for (let i = 0; i < startDayIndex; i++) calendarGridCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarGridCells.push(d);

  const monthLabel = calendarMonth.toLocaleString("en-IN", { month: "long", year: "numeric" });

  const handleDaySelect = (dayNum: number) => {
    const next = new Date(date);
    next.setFullYear(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayNum);
    setDate(next);
    setShowCustomCalendar(false);
    if (Platform.OS !== "web") setTimeout(() => setShowTimePicker(true), 300);
  };

  const filteredPersons = useMemo(() => {
    const q = personSearch.trim().toLowerCase();
    if (!q) return persons;
    return persons.filter((p: any) => p.name.toLowerCase().includes(q));
  }, [persons, personSearch]);

  const handleCreatePerson = async () => {
    const name = newPersonName.trim();
    if (!name) return;
    setIsCreatingPerson(true);
    try {
      const result = await dispatch(createPerson({ name })).unwrap();
      setSelectedPerson({ id: result.id, name: result.name });
      setShowPersonModal(false);
      setNewPersonName("");
      setPersonSearch("");
    } catch (err: any) {
      showAlert("Error", err || "Could not create person.", "alert-circle-outline", false, () => {}, themeColors.expense, themeColors.softExpense);
    } finally {
      setIsCreatingPerson(false);
    }
  };

  const handleSave = async () => {
    if (isSavingRef.current) return;

    const numericAmount = Number(amount.replace(/,/g, ""));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showAlert("Invalid Amount", "Enter an amount greater than 0", "alert-circle-outline", false, () => {}, themeColors.expense, themeColors.softExpense);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!selectedPerson) {
      showAlert("No person selected", "Select a person", "person-outline", false, () => {}, themeColors.expense, themeColors.softExpense);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await dispatch(
        createLoan({
          person_id: selectedPerson.id,
          person_name: selectedPerson.name,
          direction,
          amount: numericAmount,
          date: date.toISOString(),
          payment_method: selectedPaymentMethod,
          note: note.trim(),
        })
      ).unwrap();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Refresh dashboard data
      dispatch(fetchLoans(undefined));
      dispatch(fetchTransactions());
      navigation.goBack();
    } catch (err: any) {
      showAlert("Save failed", err || "Could not save loan.", "alert-circle-outline", false, () => {}, themeColors.expense, themeColors.softExpense);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const accentColor = direction === "lent" ? "#2EAA5A" : "#E05345";
  const accentBg = direction === "lent" ? "#EAF8EF" : "#FDECEC";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {direction === "lent" ? "Lend Money" : "Borrow Money"}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.headerSaveBtn, isSaving && { opacity: 0.5 }]}
            disabled={isSaving}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="checkmark" size={24} color={accentColor} />
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
          {/* Disclaimer */}
          <View style={[styles.disclaimerBox, { backgroundColor: "#EEF2FF", borderColor: "#6C5CE733" }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color="#6C5CE7" />
            <Text style={styles.disclaimerText}>Not counted as an expense or income.</Text>
          </View>

          {/* Direction Toggle */}
          <Text style={[styles.sectionLabel, { color: themeColors.muted }]}>Direction</Text>
          <View style={[styles.toggleRow, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            {(["lent", "borrowed"] as const).map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.toggleOption,
                  direction === d && { backgroundColor: d === "lent" ? "#2EAA5A" : "#E05345" },
                ]}
                onPress={() => setDirection(d)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={d === "lent" ? "arrow-top-right" : "arrow-bottom-left"}
                  size={16}
                  color={direction === d ? "#fff" : themeColors.muted}
                />
                <Text style={[styles.toggleLabel, { color: direction === d ? "#fff" : themeColors.muted }]}>
                  {d === "lent" ? "I lent" : "I borrowed"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Person Selector */}
          <Text style={[styles.sectionLabel, { color: themeColors.muted }]}>Person</Text>
          <TouchableOpacity
            style={[styles.selectorBox, { backgroundColor: themeColors.card, borderColor: selectedPerson ? accentColor : themeColors.border }]}
            onPress={() => { dispatch(fetchPersons()); setShowPersonModal(true); }}
            activeOpacity={0.8}
          >
            {selectedPerson ? (
              <View style={styles.selectedPersonRow}>
                <View style={[styles.personAvatar, { backgroundColor: accentBg }]}>
                  <Text style={[styles.personAvatarText, { color: accentColor }]}>
                    {selectedPerson.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.selectorText, { color: themeColors.text }]}>{selectedPerson.name}</Text>
              </View>
            ) : (
              <Text style={[styles.selectorPlaceholder, { color: themeColors.muted }]}>Select a person</Text>
            )}
            <Ionicons name="chevron-down" size={18} color={themeColors.muted} />
          </TouchableOpacity>

          {/* Amount */}
          <Text style={[styles.sectionLabel, { color: themeColors.muted }]}>Amount</Text>
          <View style={[styles.amountBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
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

          {/* Payment Method */}
          <Text style={[styles.sectionLabel, { color: themeColors.muted }]}>Payment method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paymentRow} contentContainerStyle={{ gap: 10 }}>
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
          <Text style={[styles.sectionLabel, { color: themeColors.muted }]}>Date</Text>
          <TouchableOpacity
            style={[styles.selectorBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={() => setShowCustomCalendar(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={18} color={themeColors.muted} />
            <Text style={[styles.selectorText, { color: themeColors.text, flex: 1, marginLeft: 8 }]}>
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
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: accentColor, marginTop: 24, marginBottom: 40 }]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {direction === "lent" ? "Save Loan" : "Save Borrowing"}
              </Text>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>

      {/* Person Selection Modal */}
      <Modal visible={showPersonModal} transparent animationType="slide" onRequestClose={() => setShowPersonModal(false)}>
        <View style={styles.personModalOverlay}>
          <View style={[styles.personModalSheet, { backgroundColor: themeColors.card }]}>
            <View style={styles.personModalHeader}>
              <Text style={[styles.personModalTitle, { color: themeColors.text }]}>Select Person</Text>
              <TouchableOpacity onPress={() => setShowPersonModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.muted} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.searchBox, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <Ionicons name="search" size={16} color={themeColors.muted} />
              <TextInput
                style={[styles.searchInput, { color: themeColors.text }]}
                placeholder="Search persons..."
                placeholderTextColor={themeColors.muted}
                value={personSearch}
                onChangeText={setPersonSearch}
              />
            </View>

            {/* Add new person inline */}
            <View style={[styles.addPersonRow, { borderColor: themeColors.border }]}>
              <TextInput
                style={[styles.addPersonInput, { color: themeColors.text, backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
                placeholder="New person name..."
                placeholderTextColor={themeColors.muted}
                value={newPersonName}
                onChangeText={setNewPersonName}
              />
              <TouchableOpacity
                style={[styles.addPersonBtn, { backgroundColor: "#6C5CE7" }]}
                onPress={handleCreatePerson}
                disabled={isCreatingPerson || !newPersonName.trim()}
              >
                {isCreatingPerson ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.addPersonBtnText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Persons list */}
            <FlatList
              data={filteredPersons}
              keyExtractor={(item: any) => item.id}
              renderItem={({ item }: any) => (
                <TouchableOpacity
                  style={[styles.personListItem, { borderBottomColor: themeColors.border }]}
                  onPress={() => {
                    setSelectedPerson({ id: item.id, name: item.name });
                    setShowPersonModal(false);
                    setPersonSearch("");
                  }}
                >
                  <View style={[styles.personListAvatar, { backgroundColor: accentBg }]}>
                    <Text style={[styles.personAvatarText, { color: accentColor }]}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.personListName, { color: themeColors.text }]}>{item.name}</Text>
                  {item.phone && (
                    <Text style={[styles.personListPhone, { color: themeColors.muted }]}>{item.phone}</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.noPersonsText, { color: themeColors.muted }]}>
                  {personSearch ? "No results. Add a new person above." : "No saved persons yet."}
                </Text>
              }
              style={{ maxHeight: 300 }}
            />
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal visible={showCustomCalendar} transparent animationType="fade" onRequestClose={() => setShowCustomCalendar(false)}>
        <TouchableOpacity style={styles.calendarOverlay} activeOpacity={1} onPress={() => setShowCustomCalendar(false)}>
          <View style={[styles.calendarSheet, { backgroundColor: themeColors.card }]} >
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
              {calendarGridCells.map((cell, i) => {
                const isSelected = cell !== null && new Date(date).getDate() === cell &&
                  new Date(date).getMonth() === calendarMonth.getMonth() &&
                  new Date(date).getFullYear() === calendarMonth.getFullYear();
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

      {/* Alert Modal */}
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerSaveBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  scrollContent: { padding: 16 },

  disclaimerBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  disclaimerText: { color: "#6C5CE7", fontSize: 13, fontWeight: "600" },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 18,
  },

  toggleRow: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  toggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  toggleLabel: { fontSize: 14, fontWeight: "700" },

  selectorBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  selectorText: { fontSize: 15, fontWeight: "600", flex: 1 },
  selectorPlaceholder: { fontSize: 15, flex: 1 },
  selectedPersonRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  personAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  personAvatarText: { fontSize: 14, fontWeight: "800" },

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

  paymentRow: { flexGrow: 0, marginBottom: 4 },
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

  noteInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },

  saveContainer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  // Person Modal
  personModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  personModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  personModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  personModalTitle: { fontSize: 18, fontWeight: "800" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14 },
  addPersonRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    borderBottomWidth: 1,
    paddingBottom: 14,
  },
  addPersonInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addPersonBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addPersonBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  personListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  personListAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  personListName: { flex: 1, fontSize: 15, fontWeight: "600" },
  personListPhone: { fontSize: 12 },
  noPersonsText: { textAlign: "center", padding: 20, fontSize: 14 },

  // Calendar
  calendarOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 24,
  },
  calendarSheet: {
    borderRadius: 20,
    padding: 16,
    width: "100%",
    maxWidth: 340,
  },
  calNavRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  calMonthLabel: { fontSize: 15, fontWeight: "800" },
  weekRow: { flexDirection: "row", marginBottom: 8 },
  weekDayText: { width: "14.28%", textAlign: "center", fontSize: 11, fontWeight: "700" },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  calCellText: { fontSize: 13, fontWeight: "600" },
});
