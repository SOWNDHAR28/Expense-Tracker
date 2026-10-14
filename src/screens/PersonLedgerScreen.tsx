import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  fetchLoans,
  writeOffLoan,
  selectPersonLedger,
} from "../redux/slices/loanSlice";
import { fetchTransactions } from "../redux/slices/transactionSlice";
import { useTheme } from "../context/ThemeContext";
import { Loan } from "../types/loan";
import CustomAlertModal from "../components/CustomAlertModal";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";

export default function PersonLedgerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { personId, personName } = route.params ?? {};

  const dispatch = useAppDispatch();
  const { themeColors } = useTheme();

  const persons = useAppSelector((state: any) => state.loans?.persons ?? []);
  const loans = useAppSelector((state: any) => state.loans?.loans ?? []);
  const loading = useAppSelector((state: any) => state.loans?.loading ?? false);

  const person = persons.find((p: any) => p.id === personId) ?? {
    id: personId,
    name: personName ?? "Unknown",
    user_id: "",
    created_at: "",
    updated_at: "",
  };

  const ledger = selectPersonLedger(person, loans);

  const [refreshing, setRefreshing] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
    iconColor?: string;
    iconBg?: string;
    showCancel: boolean;
    onConfirm: () => void;
    confirmText?: string;
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
    iconBg?: string,
    confirmText = "OK"
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
      confirmText,
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchLoans({ person_id: personId }));
    setRefreshing(false);
  }, [dispatch, personId]);

  useEffect(() => {
    dispatch(fetchLoans({ person_id: personId }));
  }, [personId]);

  const handleWriteOff = (loan: Loan) => {
    const pending = loan.pending_balance ?? loan.amount;
    showAlert(
      "Write off loan?",
      `Write off ₹${pending.toLocaleString("en-IN")} outstanding from ${person.name}?\n\nThis will be recorded as an expense on today's date. The cash balance won't change again.`,
      "alert-circle-outline",
      true,
      async () => {
        try {
          const expenseId = await Crypto.randomUUID();
          await dispatch(
            writeOffLoan({
              loan,
              writeOffDate: new Date().toISOString(),
              expenseId,
            })
          ).unwrap();
          dispatch(fetchTransactions());
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showAlert(
            "Written off",
            `₹${pending.toLocaleString("en-IN")} recorded as expense.`,
            "check-circle-outline",
            false,
            () => {},
            "#2EAA5A",
            "#EAF8EF"
          );
        } catch (err: any) {
          showAlert("Error", err || "Could not write off loan.", "alert-circle-outline", false, () => {}, themeColors.expense, themeColors.softExpense);
        }
      },
      themeColors.expense,
      themeColors.softExpense,
      "Write off"
    );
  };

  const lentLoans = ledger.loans.filter((l) => l.direction === "lent");
  const borrowedLoans = ledger.loans.filter((l) => l.direction === "borrowed");

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const renderLoanCard = (loan: Loan) => {
    const isLent = loan.direction === "lent";
    const accentColor = isLent ? "#2EAA5A" : "#E05345";
    const accentBg = isLent ? "#EAF8EF" : "#FDECEC";
    const pending = loan.pending_balance ?? loan.amount;
    const repaidTotal = (loan.repayments ?? []).reduce((s, r) => s + r.amount, 0);
    const progressPct = loan.amount > 0 ? Math.min((repaidTotal / loan.amount) * 100, 100) : 0;
    const isOpen = loan.status !== "settled" && loan.status !== "written_off";

    return (
      <View
        key={loan.id}
        style={[styles.loanCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
      >
        {/* Top row */}
        <View style={styles.loanCardTop}>
          <View style={[styles.loanDirectionBadge, { backgroundColor: accentBg }]}>
            <MaterialCommunityIcons
              name={isLent ? "arrow-top-right" : "arrow-bottom-left"}
              size={13}
              color={accentColor}
            />
            <Text style={[styles.loanDirectionText, { color: accentColor }]}>
              {isLent ? "Lent" : "Borrowed"}
            </Text>
          </View>
          <View style={[styles.loanStatusBadge, { backgroundColor: `${accentColor}15` }]}>
            <Text style={[styles.loanStatusText, { color: accentColor }]}>
              {loan.status}
            </Text>
          </View>
        </View>

        {/* Amounts */}
        <View style={styles.loanAmountRow}>
          <View>
            <Text style={[styles.loanAmountLabel, { color: themeColors.muted }]}>Original</Text>
            <Text style={[styles.loanAmount, { color: themeColors.text }]}>
              ₹{loan.amount.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.loanAmountLabel, { color: themeColors.muted }]}>Repaid</Text>
            <Text style={[styles.loanAmount, { color: "#27AE60" }]}>
              ₹{repaidTotal.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.loanAmountLabel, { color: themeColors.muted }]}>Remaining</Text>
            <Text style={[styles.loanAmount, { color: accentColor, fontWeight: "800" }]}>
              ₹{pending.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressTrack, { backgroundColor: themeColors.border }]}>
          <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: accentColor }]} />
        </View>
        <Text style={[styles.progressText, { color: themeColors.muted }]}>
          {progressPct.toFixed(0)}% repaid · {formatDate(loan.date)} · {loan.payment_method}
        </Text>

        {/* Repayment history */}
        {(loan.repayments ?? []).length > 0 && (
          <View style={[styles.repaymentHistory, { borderTopColor: themeColors.border }]}>
            <Text style={[styles.repaymentHistoryTitle, { color: themeColors.muted }]}>Repayments</Text>
            {(loan.repayments ?? []).map((r) => (
              <View key={r.id} style={styles.repaymentRow}>
                <MaterialCommunityIcons name="arrow-right" size={13} color={themeColors.muted} />
                <Text style={[styles.repaymentDate, { color: themeColors.muted }]}>{formatDate(r.date)}</Text>
                <Text style={[styles.repaymentAmount, { color: "#27AE60" }]}>
                  +₹{r.amount.toLocaleString("en-IN")}
                </Text>
                <Text style={[styles.repaymentMethod, { color: themeColors.muted }]}>{r.payment_method}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        {isOpen && (
          <View style={[styles.loanActions, { borderTopColor: themeColors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#6C5CE7" }]}
              onPress={() => navigation.navigate("AddRepayment", { loan, personName: person.name })}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="plus" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Add repayment</Text>
            </TouchableOpacity>

            {isLent && (
              <TouchableOpacity
                style={[styles.actionBtnOutline, { borderColor: themeColors.expense }]}
                onPress={() => handleWriteOff(loan)}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnOutlineText, { color: themeColors.expense }]}>
                  Write off ₹{pending.toLocaleString("en-IN")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {person.name}
        </Text>
        <TouchableOpacity
          style={[styles.addLoanBtn, { backgroundColor: "#6C5CE7" }]}
          onPress={() => navigation.navigate("AddLoan")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
      >
        {loading && !refreshing && (
          <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 30 }} />
        )}

        {/* Summary Section */}
        <View style={styles.summarySection}>
          {/* Lent summary */}
          <View style={[styles.summaryCard, { backgroundColor: "#EAF8EF", borderColor: "#2EAA5A22" }]}>
            <Text style={[styles.summaryCardTitle, { color: "#2EAA5A" }]}>Money lent</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: "#2EAA5A" }]}>Total lent</Text>
              <Text style={[styles.summaryValue, { color: "#2EAA5A" }]}>₹{ledger.total_lent.toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: "#27AE60" }]}>Received back</Text>
              <Text style={[styles.summaryValue, { color: "#27AE60" }]}>₹{ledger.total_received.toLocaleString("en-IN")}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={[styles.summaryLabel, { color: "#2EAA5A", fontWeight: "800" }]}>Pending to receive</Text>
              <Text style={[styles.summaryValue, { color: "#2EAA5A", fontWeight: "800", fontSize: 17 }]}>
                ₹{ledger.pending_to_receive.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          {/* Borrowed summary */}
          <View style={[styles.summaryCard, { backgroundColor: "#FDECEC", borderColor: "#E0534522", marginTop: 12 }]}>
            <Text style={[styles.summaryCardTitle, { color: "#E05345" }]}>Money borrowed</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: "#E05345" }]}>Total borrowed</Text>
              <Text style={[styles.summaryValue, { color: "#E05345" }]}>₹{ledger.total_borrowed.toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: "#27AE60" }]}>Repaid</Text>
              <Text style={[styles.summaryValue, { color: "#27AE60" }]}>₹{ledger.total_repaid.toLocaleString("en-IN")}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={[styles.summaryLabel, { color: "#E05345", fontWeight: "800" }]}>Pending to pay</Text>
              <Text style={[styles.summaryValue, { color: "#E05345", fontWeight: "800", fontSize: 17 }]}>
                ₹{ledger.pending_to_pay.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* Lent loans */}
        {lentLoans.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Loans you gave</Text>
            {lentLoans.map(renderLoanCard)}
          </>
        )}

        {/* Borrowed loans */}
        {borrowedLoans.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: themeColors.text, marginTop: 16 }]}>Loans you took</Text>
            {borrowedLoans.map(renderLoanCard)}
          </>
        )}

        {ledger.loans.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="handshake-outline" size={48} color={themeColors.muted} />
            <Text style={[styles.emptyText, { color: themeColors.text }]}>No loans with {person.name}</Text>
            <TouchableOpacity
              style={[styles.newLoanBtn, { backgroundColor: "#6C5CE7" }]}
              onPress={() => navigation.navigate("AddLoan")}
            >
              <Text style={styles.newLoanBtnText}>Add first loan</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

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
        confirmText={alertConfig.confirmText}
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800" },
  addLoanBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16 },

  summarySection: { marginBottom: 20 },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  summaryCardTitle: { fontSize: 13, fontWeight: "800", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  summaryTotalRow: { borderTopWidth: 1, borderTopColor: "#00000011", marginTop: 6, paddingTop: 8 },
  summaryLabel: { fontSize: 13, fontWeight: "600" },
  summaryValue: { fontSize: 14, fontWeight: "700" },

  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 10 },

  loanCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  loanCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    paddingBottom: 8,
  },
  loanDirectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  loanDirectionText: { fontSize: 12, fontWeight: "700" },
  loanStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  loanStatusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },

  loanAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  loanAmountLabel: { fontSize: 11, marginBottom: 2 },
  loanAmount: { fontSize: 15, fontWeight: "700" },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 14,
    marginBottom: 6,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: { fontSize: 11, paddingHorizontal: 14, marginBottom: 10 },

  repaymentHistory: { borderTopWidth: 1, padding: 14, paddingTop: 10 },
  repaymentHistoryTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 8 },
  repaymentRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  repaymentDate: { fontSize: 12, flex: 1 },
  repaymentAmount: { fontSize: 13, fontWeight: "700" },
  repaymentMethod: { fontSize: 11 },

  loanActions: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    flexWrap: "wrap",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  actionBtnOutline: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  actionBtnOutlineText: { fontSize: 13, fontWeight: "700" },

  emptyState: { alignItems: "center", padding: 40, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  newLoanBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  newLoanBtnText: { color: "#fff", fontWeight: "700" },
});
