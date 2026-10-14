import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { formatPercent } from "../utils/format";
import { useAppSelector } from "../redux/hooks";
import { incomeCategories, expenseCategories } from "../constants/categories";
import { useTheme } from "../context/ThemeContext";
import { computeIncomeTotal, computeExpenseTotal } from "../utils/accounting";
import Svg, { Circle, Rect, Line, Text as SvgText, G, Defs, LinearGradient, Stop } from "react-native-svg";

type TimeRange = "Week" | "Month" | "Year";
type ChartView = "Bars" | "Donut";

export default function AnalyticsScreen() {
  const navigation = useNavigation<any>();
  const transactions = useAppSelector((state) => state.transactions.items);
  const customCategories = useAppSelector((state) => state.categories.customCategories);
  const loans = useAppSelector((state) => (state as any).loans?.loans ?? []);
  const { themeColors, isDark } = useTheme();

  const [timeRange, setTimeRange] = useState<TimeRange>("Month");
  const [activeChartType, setActiveChartType] = useState<"expense" | "income">("expense");
  const [chartView, setChartView] = useState<ChartView>("Donut");

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  /** Return the Monday of the week containing `date` */
  const getMondayOf = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun … 6=Sat
    const diff = day === 0 ? -6 : 1 - day; // shift to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  /** Return Sunday (end of week) given a Monday anchor */
  const getSundayOf = (monday: Date): Date => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const navPrevPeriod = () => {
    setSelectedDate(null);
    if (timeRange === "Month") {
      setSelectedMonthDate(new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() - 1, 1));
    } else if (timeRange === "Year") {
      setSelectedMonthDate(new Date(selectedMonthDate.getFullYear() - 1, 0, 1));
    } else {
      // Step back one full week (keep Monday as anchor)
      const monday = getMondayOf(selectedMonthDate);
      monday.setDate(monday.getDate() - 7);
      setSelectedMonthDate(monday);
    }
  };

  const navNextPeriod = () => {
    setSelectedDate(null);
    if (timeRange === "Month") {
      setSelectedMonthDate(new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 1));
    } else if (timeRange === "Year") {
      setSelectedMonthDate(new Date(selectedMonthDate.getFullYear() + 1, 0, 1));
    } else {
      // Step forward one full week (keep Monday as anchor)
      const monday = getMondayOf(selectedMonthDate);
      monday.setDate(monday.getDate() + 7);
      setSelectedMonthDate(monday);
    }
  };

  const periodLabel = useMemo(() => {
    if (selectedDate) {
      return selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    }
    if (timeRange === "Month") {
      return selectedMonthDate.toLocaleString("en-IN", { month: "long", year: "numeric" });
    }
    if (timeRange === "Year") return String(selectedMonthDate.getFullYear());
    // Week: show Mon – Sun label
    const monday = getMondayOf(selectedMonthDate);
    const sunday = getSundayOf(monday);
    return `${monday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  }, [selectedDate, selectedMonthDate, timeRange]);

  // Filter transactions for the current period
  const filteredTransactions = useMemo(() => {
    if (selectedDate) {
      return transactions.filter((t) => new Date(t.date).toDateString() === selectedDate.toDateString());
    }
    const year = selectedMonthDate.getFullYear();
    const month = selectedMonthDate.getMonth();
    if (timeRange === "Month") {
      return transactions.filter((t) => { const d = new Date(t.date); return d.getFullYear() === year && d.getMonth() === month; });
    }
    if (timeRange === "Year") {
      return transactions.filter((t) => new Date(t.date).getFullYear() === year);
    }
    // Week: filter by Mon–Sun window of selectedMonthDate
    const weekStart = getMondayOf(selectedMonthDate);
    const weekEnd = getSundayOf(weekStart);
    return transactions.filter((t) => { const txDate = new Date(t.date); return txDate >= weekStart && txDate <= weekEnd; });
  }, [transactions, selectedDate, selectedMonthDate, timeRange]);

  // Previous period for comparison
  const prevPeriodTransactions = useMemo(() => {
    if (selectedDate) return [];
    const year = selectedMonthDate.getFullYear();
    const month = selectedMonthDate.getMonth();
    if (timeRange === "Month") {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      return transactions.filter((t) => { const d = new Date(t.date); return d.getFullYear() === prevYear && d.getMonth() === prevMonth; });
    }
    if (timeRange === "Year") {
      return transactions.filter((t) => new Date(t.date).getFullYear() === year - 1);
    }
    return [];
  }, [transactions, selectedDate, selectedMonthDate, timeRange]);

  const prevPeriodLabel = useMemo(() => {
    if (timeRange === "Month") {
      const prev = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() - 1, 1);
      return prev.toLocaleString("en-IN", { month: "short" });
    }
    if (timeRange === "Year") return String(selectedMonthDate.getFullYear() - 1);
    return "";
  }, [selectedMonthDate, timeRange]);

  const displayIncomeTotal = useMemo(() => computeIncomeTotal(filteredTransactions), [filteredTransactions]);
  const displayExpenseTotal = useMemo(() => computeExpenseTotal(filteredTransactions), [filteredTransactions]);
  const prevIncomeTotal = useMemo(() => computeIncomeTotal(prevPeriodTransactions), [prevPeriodTransactions]);
  const prevExpenseTotal = useMemo(() => computeExpenseTotal(prevPeriodTransactions), [prevPeriodTransactions]);

  const displayNetBalance = displayIncomeTotal - displayExpenseTotal;
  const displaySavingsRate = displayIncomeTotal > 0 ? Number(((displayNetBalance / displayIncomeTotal) * 100).toFixed(1)) : 0;

  // Daily average & days left
  const daysInPeriod = useMemo(() => {
    if (timeRange === "Week") return 7;
    if (timeRange === "Year") return 365;
    return new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0).getDate();
  }, [timeRange, selectedMonthDate]);

  const dailyAverage = daysInPeriod > 0 ? Math.round(displayExpenseTotal / daysInPeriod) : 0;

  const daysLeft = useMemo(() => {
    const now = new Date();
    if (timeRange === "Month") {
      const year = selectedMonthDate.getFullYear();
      const month = selectedMonthDate.getMonth();
      const lastDay = new Date(year, month + 1, 0);
      const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
      if (!isCurrentMonth) return 0;
      return Math.max(0, lastDay.getDate() - now.getDate());
    }
    if (timeRange === "Year") {
      const isCurrentYear = now.getFullYear() === selectedMonthDate.getFullYear();
      if (!isCurrentYear) return 0;
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      return Math.max(0, Math.round((yearEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }
    return 0;
  }, [timeRange, selectedMonthDate]);

  const incomeCompareLabel = useMemo(() => {
    if (!prevPeriodLabel) return "";
    if (prevIncomeTotal === 0) return `No data for ${prevPeriodLabel}`;
    const diff = displayIncomeTotal - prevIncomeTotal;
    if (diff === 0) return `Same as ${prevPeriodLabel}`;
    return `${diff > 0 ? "+" : ""}₹${Math.abs(diff).toLocaleString("en-IN")} vs ${prevPeriodLabel}`;
  }, [displayIncomeTotal, prevIncomeTotal, prevPeriodLabel]);

  const expenseCompareLabel = useMemo(() => {
    if (!prevPeriodLabel) return "";
    if (prevExpenseTotal === 0) return `No data for ${prevPeriodLabel}`;
    const diff = displayExpenseTotal - prevExpenseTotal;
    if (diff === 0) return `Same as ${prevPeriodLabel}`;
    return `${diff > 0 ? "+" : ""}₹${Math.abs(diff).toLocaleString("en-IN")} vs ${prevPeriodLabel}`;
  }, [displayExpenseTotal, prevExpenseTotal, prevPeriodLabel]);

  // Category breakdown
  const expenseCategoriesCombined = [...expenseCategories, ...customCategories.filter(c => c.type === "expense")];
  const incomeCategoriesCombined = [...incomeCategories, ...customCategories.filter(c => c.type === "income")];
  const targetCategories = activeChartType === "expense" ? expenseCategoriesCombined : incomeCategoriesCombined;
  const targetTotal = activeChartType === "expense" ? displayExpenseTotal : displayIncomeTotal;

  const categoryBreakdown = targetCategories
    .map((cat) => {
      const amount = filteredTransactions
        .filter((t) => t.type === activeChartType && t.category.toLowerCase() === cat.label.toLowerCase())
        .reduce((sum, t) => sum + t.amount, 0);
      return { label: cat.label, amount, color: cat.color };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const topCategory = categoryBreakdown[0];
  const topCategoryPercent = topCategory && targetTotal > 0 ? Math.round((topCategory.amount / targetTotal) * 100) : 0;

  // Lent / Borrowed totals
  const lentTotal = useMemo(() => loans.filter((l: any) => l.direction === "lent" && l.status !== "settled" && l.status !== "written_off").reduce((sum: number, l: any) => sum + l.pending_balance, 0), [loans]);
  const borrowedTotal = useMemo(() => loans.filter((l: any) => l.direction === "borrowed" && l.status !== "settled" && l.status !== "written_off").reduce((sum: number, l: any) => sum + l.pending_balance, 0), [loans]);

  // Bar chart data
  const barChartData = useMemo(() => {
    const data = filteredTransactions.filter((t) => t.type === activeChartType);
    let buckets: { label: string; amount: number; isCurrent?: boolean }[] = [];

    if (timeRange === "Week") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const weekMonday = getMondayOf(selectedMonthDate);
      // Build per-day buckets for Mon(0)…Sun(6)
      buckets = days.map((d, i) => {
        const dayDate = new Date(weekMonday);
        dayDate.setDate(dayDate.getDate() + i);
        return { label: d, amount: 0, date: dayDate };
      });
      data.forEach((t) => {
        const txDate = new Date(t.date);
        // Find which bucket day this falls into (compare date string)
        const idx = (buckets as any[]).findIndex((b: any) =>
          b.date.toDateString() === txDate.toDateString()
        );
        if (idx >= 0) buckets[idx].amount += t.amount;
      });
      const now = new Date();
      const todayStr = now.toDateString();
      buckets = (buckets as any[]).map((b: any) => ({
        ...b,
        isCurrent: b.date.toDateString() === todayStr,
        isFuture: b.date > now,
      }));
    } else if (timeRange === "Month") {
      const daysInM = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0).getDate();
      const weeks = Math.ceil(daysInM / 7);
      for (let i = 1; i <= weeks; i++) buckets.push({ label: `W${i}`, amount: 0 });
      data.forEach((t) => {
        const d = new Date(t.date);
        const weekIdx = Math.floor((d.getDate() - 1) / 7);
        if (weekIdx >= 0 && weekIdx < buckets.length) buckets[weekIdx].amount += t.amount;
      });
      const now = new Date();
      const isCurrentMonth = now.getFullYear() === selectedMonthDate.getFullYear() && now.getMonth() === selectedMonthDate.getMonth();
      if (isCurrentMonth) {
        const currentWeekIdx = Math.floor((now.getDate() - 1) / 7);
        buckets = buckets.map((b, i) => ({ ...b, isCurrent: i === currentWeekIdx }));
      }
    } else {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      buckets = months.map((m) => ({ label: m, amount: 0 }));
      data.forEach((t) => { buckets[new Date(t.date).getMonth()].amount += t.amount; });
      const now = new Date();
      if (now.getFullYear() === selectedMonthDate.getFullYear()) {
        buckets = buckets.map((b, i) => ({ ...b, isCurrent: i === now.getMonth() }));
      }
    }
    return buckets;
  }, [filteredTransactions, activeChartType, timeRange, selectedMonthDate]);

  const maxChartAmount = Math.max(...barChartData.map((b) => b.amount), 1);

  // Donut dimensions
  const radius = 70;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(calendarMonth);
  const startDayIndex = getFirstDayOfMonth(calendarMonth);
  const monthLabel = calendarMonth.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const calendarGridCells: (number | null)[] = [];
  for (let i = 0; i < startDayIndex; i++) calendarGridCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarGridCells.push(d);

  // Donut segments
  const chartSegments = useMemo(() => {
    let acc = 0;
    return categoryBreakdown.map((item) => {
      const percentage = targetTotal > 0 ? (item.amount / targetTotal) * 100 : 0;
      const strokeLength = (percentage / 100) * circumference;
      const strokeOffset = -(acc / 100) * circumference;
      acc += percentage;
      return { ...item, percentage, strokeLength, strokeOffset };
    });
  }, [categoryBreakdown, targetTotal, circumference]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>Analytics</Text>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={() => { setCalendarMonth(selectedDate || new Date()); setShowDatePicker(true); }}
          >
            <Ionicons name="calendar-outline" size={20} color={selectedDate ? themeColors.primary : themeColors.text} />
          </TouchableOpacity>
        </View>

        {/* Date Filter Badge */}
        {selectedDate && (
          <View style={styles.filterBadgeContainer}>
            <View style={[styles.filterBadge, { backgroundColor: themeColors.softPurple }]}>
              <Text style={[styles.filterBadgeText, { color: themeColors.primary }]}>
                {selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDate(null)} style={{ marginLeft: 6 }}>
                <Ionicons name="close-circle" size={16} color={themeColors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Week / Month / Year Tabs ── */}
        <View style={[styles.segmentedControl, { backgroundColor: themeColors.surface }]}>
          {(["Week", "Month", "Year"] as TimeRange[]).map((tab) => {
            const active = timeRange === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.segmentBtn, active && { backgroundColor: themeColors.primary }]}
                onPress={() => { setTimeRange(tab); setSelectedDate(null); }}
              >
                <Text style={[styles.segmentText, { color: active ? "#FFFFFF" : themeColors.muted }]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Period Navigation ── */}
        <View style={styles.periodNavRow}>
          <TouchableOpacity style={styles.navChevron} onPress={navPrevPeriod}>
            <Ionicons name="chevron-back" size={18} color={themeColors.muted} />
          </TouchableOpacity>
          <Text style={[styles.periodLabel, { color: themeColors.text }]}>{periodLabel}</Text>
          <TouchableOpacity style={styles.navChevron} onPress={navNextPeriod}>
            <Ionicons name="chevron-forward" size={18} color={themeColors.muted} />
          </TouchableOpacity>
        </View>

        {/* ── Net Balance Hero Card ── */}
        <View style={[styles.heroCard, { backgroundColor: themeColors.primary }]}>
          <View style={styles.heroBlobTopRight} />
          <View style={styles.heroBlobBottomLeft} />
          <Text style={styles.heroLabel}>Net balance</Text>
          <Text style={styles.heroAmount}>₹{displayNetBalance.toLocaleString("en-IN")}</Text>
          <View style={styles.savingsPill}>
            <View style={styles.savingsDot} />
            <Text style={styles.savingsPillText}>Savings rate {displaySavingsRate}%</Text>
          </View>
          <View style={styles.heroSubCardsRow}>
            <View style={[styles.heroSubCard, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Text style={styles.heroSubCardLabel}>↑ Income</Text>
              <Text style={styles.heroSubCardValue}>₹{displayIncomeTotal.toLocaleString("en-IN")}</Text>
              {!!incomeCompareLabel && <Text style={styles.heroSubCardCompare}>{incomeCompareLabel}</Text>}
            </View>
            <View style={[styles.heroSubCard, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Text style={styles.heroSubCardLabel}>↓ Expenses</Text>
              <Text style={styles.heroSubCardValue}>₹{displayExpenseTotal.toLocaleString("en-IN")}</Text>
              {!!expenseCompareLabel && <Text style={styles.heroSubCardCompare}>{expenseCompareLabel}</Text>}
            </View>
          </View>
        </View>

        {/* ── 3 Stat Pills ── */}
        <View style={styles.statPillsRow}>
          <View style={[styles.statPill, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.statPillLabel, { color: themeColors.muted }]}>Daily average</Text>
            <Text style={[styles.statPillValue, { color: themeColors.text }]}>₹{dailyAverage.toLocaleString("en-IN")}</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.statPillLabel, { color: themeColors.muted }]}>Top category</Text>
            <Text style={[styles.statPillValue, { color: themeColors.text }]} numberOfLines={1}>
              {topCategory ? `${topCategory.label} ${topCategoryPercent}%` : "—"}
            </Text>
          </View>
          {timeRange !== "Week" && (
            <View style={[styles.statPill, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Text style={[styles.statPillLabel, { color: themeColors.muted }]}>Days left</Text>
              <Text style={[styles.statPillValue, { color: themeColors.text }]}>{daysLeft}</Text>
            </View>
          )}
        </View>

        {/* ── Trend Section ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Trend</Text>
          <View style={[styles.toggleContainer, { backgroundColor: themeColors.surface }]}>
            <TouchableOpacity
              style={[styles.toggleBtn, activeChartType === "expense" && { backgroundColor: themeColors.primary }]}
              onPress={() => setActiveChartType("expense")}
            >
              <Text style={[styles.toggleText, { color: activeChartType === "expense" ? "#FFFFFF" : themeColors.muted }]}>Expenses</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, activeChartType === "income" && { backgroundColor: themeColors.primary }]}
              onPress={() => setActiveChartType("income")}
            >
              <Text style={[styles.toggleText, { color: activeChartType === "income" ? "#FFFFFF" : themeColors.muted }]}>Income</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bar Chart Card */}
        <View style={[styles.chartCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          {barChartData.reduce((sum, b) => sum + b.amount, 0) === 0 && timeRange !== "Week" ? (
            <View style={styles.emptyChart}>
              <Ionicons name="bar-chart-outline" size={32} color={themeColors.muted} />
              <Text style={[styles.emptyChartText, { color: themeColors.muted }]}>No trend data for this period</Text>
            </View>
          ) : (
            <View style={{ overflow: "hidden" }}>
              <Svg width="100%" height={160} viewBox="0 0 320 160">
                {/* Grid lines */}
                {[0, 0.5, 1].map((ratio) => (
                  <Line key={ratio} x1="28" y1={130 - ratio * 110} x2="320" y2={130 - ratio * 110}
                    stroke={themeColors.border} strokeWidth="1" strokeDasharray="4, 4" />
                ))}
                {/* Y labels */}
                {[0, 0.5, 1].map((ratio) => {
                  const val = maxChartAmount * ratio;
                  const label = val >= 1000 ? `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k` : Math.round(val).toString();
                  return (
                    <SvgText key={`y-${ratio}`} x="0" y={130 - ratio * 110 + 4}
                      fill={themeColors.muted} fontSize="9" fontWeight="600">{label}</SvgText>
                  );
                })}
                {/* Bars */}
                {barChartData.map((item: any, index) => {
                  const barCount = barChartData.length;
                  const availableWidth = 292;
                  const barWidth = Math.min(28, (availableWidth / barCount) * 0.55);
                  const spacing = availableWidth / barCount;
                  const x = 28 + index * spacing + spacing / 2 - barWidth / 2;
                  // isFuture is set explicitly for week view; for month/year fall back to amount === 0
                  const hasFuture = item.isFuture ?? (item.amount === 0);
                  const isCurrent = item.isCurrent;
                  const barHeight = item.amount > 0 ? Math.max(4, (item.amount / maxChartAmount) * 110) : 4;
                  const y = 130 - barHeight;
                  const baseColor = activeChartType === "expense" ? themeColors.expense : themeColors.income;
                  const barColor = isCurrent ? baseColor : `${baseColor}88`;
                  return (
                    <G key={index}>
                      <Rect
                        x={x} y={hasFuture ? 20 : y}
                        width={barWidth} height={hasFuture ? 110 : barHeight}
                        rx={barWidth / 2}
                        fill={hasFuture ? "none" : (item.amount === 0 ? `${baseColor}30` : barColor)}
                        stroke={hasFuture ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)") : "none"}
                        strokeWidth={hasFuture ? 1.5 : 0}
                        strokeDasharray={hasFuture ? "4,3" : "0"}
                      />
                      {!hasFuture && item.amount > 0 && (
                        <SvgText x={x + barWidth / 2} y={y - 4}
                          fill={themeColors.muted} fontSize="9" fontWeight="700" textAnchor="middle">
                          {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}k` : item.amount.toString()}
                        </SvgText>
                      )}
                      <SvgText x={x + barWidth / 2} y={150}
                        fill={isCurrent ? themeColors.primary : themeColors.muted}
                        fontSize="9" fontWeight={isCurrent ? "800" : "600"} textAnchor="middle">
                        {item.label}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>

              {/* Footer note */}
              {(() => {
                const currentItem = barChartData.find((b) => b.isCurrent);
                if (!currentItem) return null;
                return (
                  <View style={styles.trendFooter}>
                    <Text style={[styles.trendFooterMain, { color: themeColors.text }]}>
                      {currentItem.label} so far{" "}
                      <Text style={{ color: themeColors.primary }}>₹{currentItem.amount.toLocaleString("en-IN")}</Text>
                    </Text>
                    {barChartData.some((b) => b.amount === 0 && !b.isCurrent) && (
                      <Text style={[styles.trendFooterSub, { color: themeColors.muted }]}>
                        Dashed bars have not started yet.
                      </Text>
                    )}
                  </View>
                );
              })()}
            </View>
          )}
        </View>

        {/* ── Where It Went ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Where it went</Text>
          <View style={[styles.toggleContainer, { backgroundColor: themeColors.surface }]}>
            <TouchableOpacity
              style={[styles.toggleBtn, chartView === "Bars" && { backgroundColor: themeColors.primary }]}
              onPress={() => setChartView("Bars")}
            >
              <Text style={[styles.toggleText, { color: chartView === "Bars" ? "#FFFFFF" : themeColors.muted }]}>Bars</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, chartView === "Donut" && { backgroundColor: themeColors.primary }]}
              onPress={() => setChartView("Donut")}
            >
              <Text style={[styles.toggleText, { color: chartView === "Donut" ? "#FFFFFF" : themeColors.muted }]}>Donut</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.chartCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          {categoryBreakdown.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="pie-chart-outline" size={32} color={themeColors.muted} />
              <Text style={[styles.emptyChartText, { color: themeColors.muted }]}>
                No {activeChartType} transactions recorded
              </Text>
            </View>
          ) : chartView === "Donut" ? (
            <>
              {/* Donut Chart */}
              <View style={styles.donutContainer}>
                <Svg width={180} height={180} style={{ transform: [{ rotate: "-90deg" }] }}>
                  <Circle cx={90} cy={90} r={radius} stroke={themeColors.surface} strokeWidth={strokeWidth} fill="none" />
                  {chartSegments.map((segment: any) => {
                    if (segment.percentage <= 0) return null;
                    return (
                      <Circle key={segment.label} cx={90} cy={90} r={radius}
                        stroke={segment.color} strokeWidth={strokeWidth}
                        strokeDasharray={`${segment.strokeLength} ${circumference}`}
                        strokeDashoffset={segment.strokeOffset}
                        fill="none" strokeLinecap="round" />
                    );
                  })}
                </Svg>
                <View style={[styles.donutInnerRing, { backgroundColor: themeColors.card }]}>
                  <Text style={[styles.donutTotalValue, { color: themeColors.text }]}>₹{targetTotal.toLocaleString("en-IN")}</Text>
                  <Text style={[styles.donutTotalLabel, { color: themeColors.muted }]}>Total</Text>
                </View>
              </View>
              {/* Legend */}
              <View style={styles.breakdownList}>
                {categoryBreakdown.map((item) => (
                  <View key={item.label} style={styles.breakdownRow}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.dot, { backgroundColor: item.color }]} />
                      <Text style={[styles.categoryLabelText, { color: themeColors.text }]}>{item.label}</Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={[styles.categoryPercentText, { color: themeColors.muted }]}>
                        {formatPercent(item.amount, targetTotal)}%
                      </Text>
                      <Text style={[styles.categoryAmountText, { color: themeColors.text }]}>
                        ₹{item.amount.toLocaleString("en-IN")}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            /* Bars View */
            <View style={styles.barBreakdownList}>
              {categoryBreakdown.map((item) => {
                const pct = targetTotal > 0 ? Math.round((item.amount / targetTotal) * 100) : 0;
                return (
                  <View key={item.label} style={styles.barBreakdownRow}>
                    <View style={styles.barBreakdownHeader}>
                      <View style={styles.rowLeft}>
                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                        <Text style={[styles.categoryLabelText, { color: themeColors.text }]}>{item.label}</Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={[styles.categoryPercentText, { color: themeColors.muted }]}>{pct}%</Text>
                        <Text style={[styles.categoryAmountText, { color: themeColors.text }]}>₹{item.amount.toLocaleString("en-IN")}</Text>
                      </View>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: themeColors.surface }]}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: item.color }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Lent / Borrowed Summary ── */}
        <View style={styles.lentBorrowedRow}>
          {/* Lent — green (to receive) */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.lentBorrowedPill, { backgroundColor: isDark ? "rgba(39,174,96,0.18)" : "#EDFBF3", borderColor: isDark ? "rgba(39,174,96,0.35)" : "#AADFC0" }]}
            onPress={() => navigation.navigate("Loans", { initialTab: "lent" })}
          >
            <View style={styles.lentBorrowedPillHeader}>
              <View style={[styles.lentBorrowedDot, { backgroundColor: "#27AE60" }]} />
              <Text style={[styles.lentBorrowedPillLabel, { color: isDark ? "#6EE7A8" : "#1E7A46" }]}>To receive</Text>
              <Ionicons name="chevron-forward" size={12} color={isDark ? "#6EE7A8" : "#1E7A46"} style={{ marginLeft: "auto" }} />
            </View>
            <Text style={[styles.lentBorrowedPillAmount, { color: isDark ? "#6EE7A8" : "#1E7A46" }]}>
              ₹{lentTotal.toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.lentBorrowedPillSub, { color: isDark ? "rgba(110,231,168,0.65)" : "#5aad7a" }]}>Lent out</Text>
          </TouchableOpacity>

          {/* Borrowed — red (to pay) */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.lentBorrowedPill, { backgroundColor: isDark ? "rgba(231,76,60,0.18)" : "#FEF0EE", borderColor: isDark ? "rgba(231,76,60,0.35)" : "#F5B8B2" }]}
            onPress={() => navigation.navigate("Loans", { initialTab: "borrowed" })}
          >
            <View style={styles.lentBorrowedPillHeader}>
              <View style={[styles.lentBorrowedDot, { backgroundColor: "#E74C3C" }]} />
              <Text style={[styles.lentBorrowedPillLabel, { color: isDark ? "#F5A09A" : "#C0392B" }]}>To pay</Text>
              <Ionicons name="chevron-forward" size={12} color={isDark ? "#F5A09A" : "#C0392B"} style={{ marginLeft: "auto" }} />
            </View>
            <Text style={[styles.lentBorrowedPillAmount, { color: isDark ? "#F5A09A" : "#C0392B" }]}>
              ₹{borrowedTotal.toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.lentBorrowedPillSub, { color: isDark ? "rgba(245,160,154,0.65)" : "#d4766e" }]}>Borrowed</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Calendar Modal ── */}
      <Modal visible={showDatePicker} transparent={true} animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.calendarModalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={styles.calendarModalHeader}>
                  <Text style={[styles.calendarModalTitle, { color: themeColors.text }]}>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Ionicons name="close" size={24} color={themeColors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarNavRow}>
                  <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={20} color={themeColors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.calendarMonthLabel, { color: themeColors.text }]}>{monthLabel}</Text>
                  <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={20} color={themeColors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.weekdaysRow}>
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <Text key={d} style={[styles.weekdayText, { color: themeColors.muted }]}>{d}</Text>
                  ))}
                </View>
                <View style={styles.daysGrid}>
                  {calendarGridCells.map((dayNum, index) => {
                    if (dayNum === null) return <View key={`empty-${index}`} style={styles.dayCell} />;
                    const isToday = new Date().getDate() === dayNum && new Date().getMonth() === calendarMonth.getMonth() && new Date().getFullYear() === calendarMonth.getFullYear();
                    const isSelected = selectedDate !== null && selectedDate.getDate() === dayNum && selectedDate.getMonth() === calendarMonth.getMonth() && selectedDate.getFullYear() === calendarMonth.getFullYear();
                    return (
                      <TouchableOpacity
                        key={`day-${dayNum}`}
                        style={[styles.dayCell, isSelected && { backgroundColor: themeColors.primary }, isToday && !isSelected && { borderColor: themeColors.primary, borderWidth: 1.5 }]}
                        onPress={() => { setSelectedDate(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayNum)); setShowDatePicker(false); }}
                      >
                        <Text style={[styles.dayText, { color: isSelected ? "#FFFFFF" : themeColors.text }, isSelected && { fontWeight: "800" }]}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 18, paddingBottom: 100 },

  /* Header */
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "800" },
  iconButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },

  /* Filter badge */
  filterBadgeContainer: { flexDirection: "row", marginBottom: 12 },
  filterBadge: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  filterBadgeText: { fontSize: 12, fontWeight: "700" },

  /* Tabs */
  segmentedControl: { flexDirection: "row", borderRadius: 14, padding: 4, marginBottom: 14 },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  segmentText: { fontSize: 14, fontWeight: "700" },

  /* Period nav */
  periodNavRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 16, gap: 16 },
  navChevron: { padding: 4 },
  periodLabel: { fontSize: 16, fontWeight: "800", textAlign: "center" },

  /* Hero card */
  heroCard: { borderRadius: 22, padding: 20, marginBottom: 14, overflow: "hidden", position: "relative" },
  heroBlobTopRight: { position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.08)" },
  heroBlobBottomLeft: { position: "absolute", bottom: -30, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.06)" },
  heroLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)", marginBottom: 4 },
  heroAmount: { fontSize: 32, fontWeight: "900", color: "#FFFFFF", marginBottom: 8 },
  savingsPill: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 18, gap: 5 },
  savingsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  savingsPillText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  heroSubCardsRow: { flexDirection: "row", gap: 10 },
  heroSubCard: { flex: 1, borderRadius: 14, padding: 12 },
  heroSubCardLabel: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.70)", marginBottom: 4 },
  heroSubCardValue: { fontSize: 17, fontWeight: "800", color: "#FFFFFF", marginBottom: 2 },
  heroSubCardCompare: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.60)" },

  /* Stat pills */
  statPillsRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  statPill: { flex: 1, borderRadius: 16, padding: 12, borderWidth: 1 },
  statPillLabel: { fontSize: 11, fontWeight: "600", marginBottom: 5 },
  statPillValue: { fontSize: 15, fontWeight: "800" },

  /* Section headers */
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  toggleContainer: { flexDirection: "row", borderRadius: 10, padding: 2 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  toggleText: { fontSize: 12, fontWeight: "700" },

  /* Chart card */
  chartCard: { borderRadius: 22, borderWidth: 1, padding: 16, marginBottom: 20 },
  emptyChart: { paddingVertical: 36, alignItems: "center", gap: 8 },
  emptyChartText: { fontSize: 13, fontWeight: "600" },

  /* Trend footer */
  trendFooter: { marginTop: 10, paddingHorizontal: 4 },
  trendFooterMain: { fontSize: 12, fontWeight: "700" },
  trendFooterSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },

  /* Donut */
  donutContainer: { alignItems: "center", justifyContent: "center", marginVertical: 8 },
  donutInnerRing: { width: 116, height: 116, borderRadius: 58, alignItems: "center", justifyContent: "center", position: "absolute", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
  donutTotalValue: { fontSize: 17, fontWeight: "800" },
  donutTotalLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },

  /* Category breakdown */
  breakdownList: { gap: 12, marginTop: 16 },
  breakdownRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  categoryLabelText: { fontSize: 14, fontWeight: "700" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  categoryPercentText: { fontSize: 13, fontWeight: "600" },
  categoryAmountText: { fontSize: 14, fontWeight: "700" },

  /* Bars breakdown */
  barBreakdownList: { gap: 14 },
  barBreakdownRow: { gap: 6 },
  barBreakdownHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  barTrack: { height: 7, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },

  /* Lent / Borrowed */
  lentBorrowedRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  lentBorrowedPill: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
  },
  lentBorrowedPillHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  lentBorrowedDot: { width: 8, height: 8, borderRadius: 4 },
  lentBorrowedPillLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
  lentBorrowedPillAmount: { fontSize: 20, fontWeight: "900", marginBottom: 4 },
  lentBorrowedPillSub: { fontSize: 11, fontWeight: "500" },

  /* Calendar Modal */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  calendarModalContent: { width: "100%", maxWidth: 340, borderRadius: 24, borderWidth: 1, padding: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  calendarModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  calendarModalTitle: { fontSize: 18, fontWeight: "800" },
  calendarNavRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  navBtn: { padding: 6, borderRadius: 8 },
  calendarMonthLabel: { fontSize: 15, fontWeight: "800" },
  weekdaysRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  weekdayText: { width: "14.28%", textAlign: "center", fontSize: 13, fontWeight: "700" },
  daysGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 8 },
  dayCell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  dayText: { fontSize: 13, fontWeight: "700" },
});
