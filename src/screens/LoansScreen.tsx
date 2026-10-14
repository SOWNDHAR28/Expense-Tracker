import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { fetchLoans, fetchPersons, selectLoanSummary } from "../redux/slices/loanSlice";
import { useTheme } from "../context/ThemeContext";
import { Loan, Person } from "../types/loan";
import * as Haptics from "expo-haptics";

type FilterTab = "all" | "lent" | "borrowed" | "settled";
type ViewMode = "loans" | "people";

export default function LoansScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { themeColors, isDark } = useTheme();

  const initialTab: FilterTab = route.params?.initialTab ?? "all";
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);
  const [viewMode, setViewMode] = useState<ViewMode>("loans");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loans = useAppSelector((state: any) => state.loans?.loans ?? []);
  const persons = useAppSelector((state: any) => state.loans?.persons ?? []);
  const loading = useAppSelector((state: any) => state.loans?.loading ?? false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchLoans({})),
        dispatch(fetchPersons()),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  // Aggregate stats across all loans
  const summary = useMemo(() => {
    let totalLent = 0;
    let lentPending = 0;
    let lentRecovered = 0;

    let totalBorrowed = 0;
    let borrowedPending = 0;
    let borrowedRepaid = 0;

    for (const loan of loans) {
      const repaymentsSum = (loan.repayments ?? []).reduce(
        (sum: number, r: any) => sum + r.amount,
        0
      );
      const pending = loan.pending_balance ?? Math.max(0, loan.amount - repaymentsSum);

      if (loan.direction === "lent") {
        totalLent += loan.amount;
        lentRecovered += repaymentsSum;
        if (loan.status !== "settled" && loan.status !== "written_off") {
          lentPending += pending;
        }
      } else {
        totalBorrowed += loan.amount;
        borrowedRepaid += repaymentsSum;
        if (loan.status !== "settled" && loan.status !== "written_off") {
          borrowedPending += pending;
        }
      }
    }

    return {
      totalLent,
      lentPending,
      lentRecovered,
      totalBorrowed,
      borrowedPending,
      borrowedRepaid,
      netPending: lentPending - borrowedPending,
    };
  }, [loans]);

  // Tab counts
  const counts = useMemo(() => {
    let lentCount = 0;
    let borrowedCount = 0;
    let settledCount = 0;

    for (const l of loans) {
      if (l.direction === "lent") lentCount++;
      if (l.direction === "borrowed") borrowedCount++;
      if (l.status === "settled" || l.status === "written_off") settledCount++;
    }

    return {
      all: loans.length,
      lent: lentCount,
      borrowed: borrowedCount,
      settled: settledCount,
    };
  }, [loans]);

  // Filtered loans list
  const filteredLoans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return loans.filter((loan: Loan) => {
      // Search match
      const nameMatch = (loan.person_name || "").toLowerCase().includes(q);
      const noteMatch = (loan.note || "").toLowerCase().includes(q);
      const amountMatch = loan.amount.toString().includes(q);
      if (q && !nameMatch && !noteMatch && !amountMatch) return false;

      // Tab match
      if (activeTab === "lent") return loan.direction === "lent";
      if (activeTab === "borrowed") return loan.direction === "borrowed";
      if (activeTab === "settled") {
        return loan.status === "settled" || loan.status === "written_off";
      }
      return true;
    });
  }, [loans, activeTab, searchQuery]);

  // Aggregated people summaries
  const peopleSummaries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const map = new Map<string, {
      personId: string;
      personName: string;
      totalLent: number;
      pendingToReceive: number;
      totalBorrowed: number;
      pendingToPay: number;
      loanCount: number;
      openCount: number;
    }>();

    for (const loan of loans) {
      const pid = loan.person_id;
      const name = loan.person_name || "Unknown";

      if (!map.has(pid)) {
        map.set(pid, {
          personId: pid,
          personName: name,
          totalLent: 0,
          pendingToReceive: 0,
          totalBorrowed: 0,
          pendingToPay: 0,
          loanCount: 0,
          openCount: 0,
        });
      }

      const p = map.get(pid)!;
      p.loanCount++;

      const repaymentsSum = (loan.repayments ?? []).reduce(
        (sum: number, r: any) => sum + r.amount,
        0
      );
      const pending = loan.pending_balance ?? Math.max(0, loan.amount - repaymentsSum);
      const isOpen = loan.status !== "settled" && loan.status !== "written_off";

      if (loan.direction === "lent") {
        p.totalLent += loan.amount;
        if (isOpen) {
          p.pendingToReceive += pending;
          p.openCount++;
        }
      } else {
        p.totalBorrowed += loan.amount;
        if (isOpen) {
          p.pendingToPay += pending;
          p.openCount++;
        }
      }
    }

    // Also include any person without loans if searching
    for (const pers of persons) {
      if (!map.has(pers.id)) {
        map.set(pers.id, {
          personId: pers.id,
          personName: pers.name,
          totalLent: 0,
          pendingToReceive: 0,
          totalBorrowed: 0,
          pendingToPay: 0,
          loanCount: 0,
          openCount: 0,
        });
      }
    }

    const list = Array.from(map.values());

    return list.filter((p) => {
      if (q && !p.personName.toLowerCase().includes(q)) return false;
      if (activeTab === "lent") return p.totalLent > 0;
      if (activeTab === "borrowed") return p.totalBorrowed > 0;
      if (activeTab === "settled") return p.loanCount > 0 && p.openCount === 0;
      return true;
    });
  }, [loans, persons, activeTab, searchQuery]);

  const handleTabPress = (tab: FilterTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleViewModePress = (mode: ViewMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewMode(mode);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: themeColors.surface }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={themeColors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            Lent & Borrowed
          </Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.muted }]}>
            Loans gave, received & settled ledger
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("AddLoan")}
          style={[styles.newBtn, { backgroundColor: "#6C5CE7" }]}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6C5CE7"]}
            tintColor="#6C5CE7"
          />
        }
      >
        {/* Overview Stats Cards */}
        <View style={styles.statsContainer}>
          {/* Card: Lent / Gave */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: isDark ? "#172b1d" : "#EAF8EF",
                borderColor: "#2EAA5A33",
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconWrap, { backgroundColor: "#2EAA5A22" }]}>
                <Ionicons name="arrow-up-circle" size={20} color="#2EAA5A" />
              </View>
              <Text style={[styles.cardBadge, { color: "#2EAA5A" }]}>LENT (GAVE)</Text>
            </View>
            <Text style={[styles.cardTotalAmount, { color: "#2EAA5A" }]}>
              ₹{summary.totalLent.toLocaleString("en-IN")}
            </Text>
            <View style={styles.cardBreakdownRow}>
              <Text style={[styles.breakdownLabel, { color: themeColors.muted }]}>
                Pending to collect:
              </Text>
              <Text style={[styles.breakdownValue, { color: "#2EAA5A" }]}>
                ₹{summary.lentPending.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.cardBreakdownRow}>
              <Text style={[styles.breakdownLabel, { color: themeColors.muted }]}>
                Recovered:
              </Text>
              <Text style={[styles.breakdownValue, { color: themeColors.text }]}>
                ₹{summary.lentRecovered.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          {/* Card: Borrowed / Received */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: isDark ? "#2e1b1b" : "#FDECEC",
                borderColor: "#E0534533",
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconWrap, { backgroundColor: "#E0534522" }]}>
                <Ionicons name="arrow-down-circle" size={20} color="#E05345" />
              </View>
              <Text style={[styles.cardBadge, { color: "#E05345" }]}>BORROWED (TOOK)</Text>
            </View>
            <Text style={[styles.cardTotalAmount, { color: "#E05345" }]}>
              ₹{summary.totalBorrowed.toLocaleString("en-IN")}
            </Text>
            <View style={styles.cardBreakdownRow}>
              <Text style={[styles.breakdownLabel, { color: themeColors.muted }]}>
                Pending to repay:
              </Text>
              <Text style={[styles.breakdownValue, { color: "#E05345" }]}>
                ₹{summary.borrowedPending.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.cardBreakdownRow}>
              <Text style={[styles.breakdownLabel, { color: themeColors.muted }]}>
                Repaid so far:
              </Text>
              <Text style={[styles.breakdownValue, { color: themeColors.text }]}>
                ₹{summary.borrowedRepaid.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* Net Status Banner */}
        <View
          style={[
            styles.netBanner,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.netLabel, { color: themeColors.muted }]}>
              Overall Open Position
            </Text>
            <Text
              style={[
                styles.netValue,
                {
                  color:
                    summary.netPending > 0
                      ? "#2EAA5A"
                      : summary.netPending < 0
                      ? "#E05345"
                      : themeColors.primary,
                },
              ]}
            >
              {summary.netPending > 0
                ? `+₹${summary.netPending.toLocaleString("en-IN")} (You are owed)`
                : summary.netPending < 0
                ? `-₹${Math.abs(summary.netPending).toLocaleString("en-IN")} (You owe)`
                : "All loans fully balanced & settled"}
            </Text>
          </View>
          <View
            style={[
              styles.netIconBadge,
              {
                backgroundColor:
                  summary.netPending > 0
                    ? "#EAF8EF"
                    : summary.netPending < 0
                    ? "#FDECEC"
                    : themeColors.softPurple,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={
                summary.netPending > 0
                  ? "hand-coin-outline"
                  : summary.netPending < 0
                  ? "credit-card-clock-outline"
                  : "check-decagram-outline"
              }
              size={22}
              color={
                summary.netPending > 0
                  ? "#2EAA5A"
                  : summary.netPending < 0
                  ? "#E05345"
                  : themeColors.primary
              }
            />
          </View>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
          ]}
        >
          <Ionicons name="search" size={18} color={themeColors.muted} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder="Search by person name or note..."
            placeholderTextColor={themeColors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={themeColors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Segment Tabs */}
        <View style={styles.tabBar}>
          {(
            [
              { key: "all", label: "All", count: counts.all },
              { key: "lent", label: "Lent", count: counts.lent },
              { key: "borrowed", label: "Borrowed", count: counts.borrowed },
              { key: "settled", label: "Settled", count: counts.settled },
            ] as const
          ).map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => handleTabPress(t.key)}
                style={[
                  styles.tabItem,
                  {
                    backgroundColor: active ? themeColors.primary : themeColors.card,
                    borderColor: active ? themeColors.primary : themeColors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? "#FFFFFF" : themeColors.text },
                  ]}
                >
                  {t.label}
                </Text>
                <View
                  style={[
                    styles.tabCountPill,
                    {
                      backgroundColor: active
                        ? "rgba(255,255,255,0.25)"
                        : themeColors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabCountText,
                      { color: active ? "#FFFFFF" : themeColors.muted },
                    ]}
                  >
                    {t.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* View Mode Toggle: All Loans vs By Person */}
        <View style={styles.viewModeRow}>
          <Text style={[styles.sectionHeading, { color: themeColors.text }]}>
            {viewMode === "loans" ? "Loan Records" : "Person Ledgers"}
          </Text>
          <View
            style={[
              styles.viewToggleGroup,
              { backgroundColor: themeColors.surface, borderColor: themeColors.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleViewModePress("loans")}
              style={[
                styles.viewToggleBtn,
                viewMode === "loans" && { backgroundColor: themeColors.card },
              ]}
            >
              <MaterialCommunityIcons
                name="format-list-bulleted"
                size={16}
                color={viewMode === "loans" ? themeColors.primary : themeColors.muted}
              />
              <Text
                style={[
                  styles.viewToggleText,
                  {
                    color: viewMode === "loans" ? themeColors.primary : themeColors.muted,
                    fontWeight: viewMode === "loans" ? "700" : "500",
                  },
                ]}
              >
                Loans
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleViewModePress("people")}
              style={[
                styles.viewToggleBtn,
                viewMode === "people" && { backgroundColor: themeColors.card },
              ]}
            >
              <MaterialCommunityIcons
                name="account-group-outline"
                size={16}
                color={viewMode === "people" ? themeColors.primary : themeColors.muted}
              />
              <Text
                style={[
                  styles.viewToggleText,
                  {
                    color: viewMode === "people" ? themeColors.primary : themeColors.muted,
                    fontWeight: viewMode === "people" ? "700" : "500",
                  },
                ]}
              >
                People
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTENT: Loans List */}
        {viewMode === "loans" && (
          <View style={styles.listContainer}>
            {filteredLoans.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: themeColors.card, borderColor: themeColors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    activeTab === "settled"
                      ? "check-all"
                      : activeTab === "lent"
                      ? "hand-coin-outline"
                      : activeTab === "borrowed"
                      ? "credit-card-clock-outline"
                      : "handshake-outline"
                  }
                  size={46}
                  color={themeColors.muted}
                />
                <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                  {activeTab === "settled"
                    ? "No settled loans yet"
                    : activeTab === "lent"
                    ? "No loans gave recorded"
                    : activeTab === "borrowed"
                    ? "No borrowed loans recorded"
                    : "No loans found"}
                </Text>
                <Text style={[styles.emptySubtitle, { color: themeColors.muted }]}>
                  {activeTab === "settled"
                    ? "When a loan is paid off in full, it appears here in settled history."
                    : activeTab === "lent"
                    ? "Track amounts you lend to friends or colleagues so you never lose track."
                    : activeTab === "borrowed"
                    ? "Record loans you borrowed from others to keep on top of repayments."
                    : "Track money you lend to or borrow from others with partial repayments."}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("AddLoan")}
                  style={[styles.emptyActionBtn, { backgroundColor: "#6C5CE7" }]}
                >
                  <Text style={styles.emptyActionText}>+ Record New Loan</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredLoans.map((loan: Loan) => {
                const isLent = loan.direction === "lent";
                const isSettled = loan.status === "settled";
                const isWrittenOff = loan.status === "written_off";
                const isPartial = loan.status === "partial";
                const pending = loan.pending_balance ?? 0;

                const statusColor = isSettled
                  ? "#2EAA5A"
                  : isWrittenOff
                  ? "#888888"
                  : isPartial
                  ? "#E67E22"
                  : "#6C5CE7";

                const dateStr = new Date(loan.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <TouchableOpacity
                    key={loan.id}
                    style={[
                      styles.loanItemCard,
                      {
                        backgroundColor: themeColors.card,
                        borderColor: themeColors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate("PersonLedger", {
                        personId: loan.person_id,
                        personName: loan.person_name,
                      })
                    }
                  >
                    <View style={styles.loanItemHeader}>
                      {/* Avatar & Name */}
                      <View style={styles.personHeaderWrap}>
                        <View
                          style={[
                            styles.avatarCircle,
                            {
                              backgroundColor: isLent ? "#EAF8EF" : "#FDECEC",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.avatarText,
                              { color: isLent ? "#2EAA5A" : "#E05345" },
                            ]}
                          >
                            {(loan.person_name || "?").charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.personNameText, { color: themeColors.text }]}
                            numberOfLines={1}
                          >
                            {loan.person_name || "Unknown"}
                          </Text>
                          <Text
                            style={[styles.loanSubText, { color: themeColors.muted }]}
                          >
                            {isLent ? "You gave / lent" : "You received / borrowed"} •{" "}
                            {dateStr}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.08)"
                              : statusColor + "18",
                            borderColor: statusColor + "44",
                          },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {isSettled
                            ? "Settled"
                            : isWrittenOff
                            ? "Written Off"
                            : isPartial
                            ? "Partially Repaid"
                            : "Open"}
                        </Text>
                      </View>
                    </View>

                    {/* Amount & Pending row */}
                    <View style={[styles.loanItemBody, { borderTopColor: themeColors.border }]}>
                      <View>
                        <Text style={[styles.bodyMetaLabel, { color: themeColors.muted }]}>
                          Total Amount
                        </Text>
                        <Text
                          style={[
                            styles.bodyMetaAmount,
                            { color: isLent ? "#2EAA5A" : "#E05345" },
                          ]}
                        >
                          {isLent ? "+₹" : "-₹"}
                          {loan.amount.toLocaleString("en-IN")}
                        </Text>
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.bodyMetaLabel, { color: themeColors.muted }]}>
                          {isSettled ? "Settlement" : "Pending Balance"}
                        </Text>
                        <Text
                          style={[
                            styles.bodyMetaPending,
                            {
                              color: isSettled
                                ? "#2EAA5A"
                                : isWrittenOff
                                ? themeColors.muted
                                : themeColors.text,
                            },
                          ]}
                        >
                          {isSettled
                            ? "✓ Fully Settled"
                            : isWrittenOff
                            ? "Written Off"
                            : `₹${pending.toLocaleString("en-IN")} due`}
                        </Text>
                      </View>
                    </View>

                    {/* Note & Payment Method Footer */}
                    <View style={[styles.loanItemFooter, { backgroundColor: themeColors.surface }]}>
                      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <MaterialCommunityIcons
                          name="wallet-outline"
                          size={14}
                          color={themeColors.muted}
                        />
                        <Text style={[styles.footerText, { color: themeColors.muted }]}>
                          {loan.payment_method || "Cash"}
                        </Text>
                        {loan.note ? (
                          <>
                            <Text style={{ color: themeColors.muted }}>•</Text>
                            <Text
                              style={[styles.footerText, { color: themeColors.text, flex: 1 }]}
                              numberOfLines={1}
                            >
                              {loan.note}
                            </Text>
                          </>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#6C5CE7" }}>
                          Ledger
                        </Text>
                        <Ionicons name="chevron-forward" size={13} color="#6C5CE7" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* CONTENT: People List */}
        {viewMode === "people" && (
          <View style={styles.listContainer}>
            {peopleSummaries.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: themeColors.card, borderColor: themeColors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={46}
                  color={themeColors.muted}
                />
                <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                  No contacts found
                </Text>
                <Text style={[styles.emptySubtitle, { color: themeColors.muted }]}>
                  Contacts and borrowers you lend to or borrow from will appear here with net balance.
                </Text>
              </View>
            ) : (
              peopleSummaries.map((p) => {
                const net = p.pendingToReceive - p.pendingToPay;
                return (
                  <TouchableOpacity
                    key={p.personId}
                    style={[
                      styles.personCard,
                      {
                        backgroundColor: themeColors.card,
                        borderColor: themeColors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate("PersonLedger", {
                        personId: p.personId,
                        personName: p.personName,
                      })
                    }
                  >
                    <View style={styles.personCardTop}>
                      <View style={[styles.personCardAvatar, { backgroundColor: themeColors.softPurple }]}>
                        <Text style={[styles.personCardAvatarText, { color: themeColors.primary }]}>
                          {p.personName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.personNameText, { color: themeColors.text }]}>
                          {p.personName}
                        </Text>
                        <Text style={[styles.loanSubText, { color: themeColors.muted }]}>
                          {p.loanCount} {p.loanCount === 1 ? "loan" : "loans"} •{" "}
                          {p.openCount === 0 ? "All settled" : `${p.openCount} active`}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.bodyMetaLabel, { color: themeColors.muted }]}>
                          Net Status
                        </Text>
                        <Text
                          style={[
                            styles.personNetText,
                            {
                              color:
                                net > 0
                                  ? "#2EAA5A"
                                  : net < 0
                                  ? "#E05345"
                                  : themeColors.muted,
                            },
                          ]}
                        >
                          {net > 0
                            ? `+₹${net.toLocaleString("en-IN")}`
                            : net < 0
                            ? `-₹${Math.abs(net).toLocaleString("en-IN")}`
                            : "Settled"}
                        </Text>
                      </View>
                    </View>

                    {/* Breakdown bar */}
                    <View style={[styles.personBreakdownRow, { borderTopColor: themeColors.border }]}>
                      <View style={styles.breakdownSubCol}>
                        <Text style={[styles.breakdownMiniLabel, { color: themeColors.muted }]}>
                          Total Lent (Gave)
                        </Text>
                        <Text style={[styles.breakdownMiniVal, { color: "#2EAA5A" }]}>
                          ₹{p.totalLent.toLocaleString("en-IN")}
                        </Text>
                      </View>
                      <View style={[styles.breakdownDivider, { backgroundColor: themeColors.border }]} />
                      <View style={styles.breakdownSubCol}>
                        <Text style={[styles.breakdownMiniLabel, { color: themeColors.muted }]}>
                          Total Borrowed
                        </Text>
                        <Text style={[styles.breakdownMiniVal, { color: "#E05345" }]}>
                          ₹{p.totalBorrowed.toLocaleString("en-IN")}
                        </Text>
                      </View>
                      <View style={[styles.breakdownDivider, { backgroundColor: themeColors.border }]} />
                      <View style={styles.breakdownSubCol}>
                        <Text style={[styles.breakdownMiniLabel, { color: themeColors.muted }]}>
                          To Collect
                        </Text>
                        <Text style={[styles.breakdownMiniVal, { color: themeColors.text }]}>
                          ₹{p.pendingToReceive.toLocaleString("en-IN")}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 4,
  },
  newBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  cardIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBadge: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardTotalAmount: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  cardBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 3,
  },
  breakdownLabel: {
    fontSize: 10.5,
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  netBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  netLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  netValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  netIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  tabBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  tabLabel: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  tabCountPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabCountText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  viewModeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
  },
  viewToggleGroup: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
  },
  viewToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  viewToggleText: {
    fontSize: 11.5,
  },
  listContainer: {
    gap: 12,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  emptyActionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  emptyActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  loanItemCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  loanItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  personHeaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
  },
  personNameText: {
    fontSize: 14,
    fontWeight: "700",
  },
  loanSubText: {
    fontSize: 11,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  loanItemBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  bodyMetaLabel: {
    fontSize: 10.5,
    fontWeight: "500",
    marginBottom: 2,
  },
  bodyMetaAmount: {
    fontSize: 16,
    fontWeight: "800",
  },
  bodyMetaPending: {
    fontSize: 13,
    fontWeight: "700",
  },
  loanItemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 11,
  },
  personCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  personCardTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  personCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  personCardAvatarText: {
    fontSize: 16,
    fontWeight: "800",
  },
  personNetText: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 1,
  },
  personBreakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  breakdownSubCol: {
    flex: 1,
    alignItems: "center",
  },
  breakdownMiniLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    marginBottom: 2,
  },
  breakdownMiniVal: {
    fontSize: 12,
    fontWeight: "800",
  },
  breakdownDivider: {
    width: 1,
    height: 24,
  },
});
