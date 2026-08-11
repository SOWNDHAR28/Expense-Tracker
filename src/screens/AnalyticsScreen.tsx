import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTransactions } from "../context/TransactionContext";
import { useTheme } from "../context/ThemeContext";
import Svg, { Circle } from "react-native-svg";

type TimeRange = "Week" | "Month" | "Year";

export default function AnalyticsScreen() {
  const { transactions, incomeCategories, expenseCategories } = useTransactions();
  const { themeColors } = useTheme();

  const [timeRange, setTimeRange] = useState<TimeRange>("Month");
  
  // Interactive Donut States
  const [activeChartType, setActiveChartType] = useState<"expense" | "income">("expense");

  // Custom Calendar & Month Filter States
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const navPrevMonth = () => {
    const prev = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() - 1, 1);
    setSelectedMonthDate(prev);
    setSelectedDate(null);
  };

  const navNextMonth = () => {
    const next = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 1);
    setSelectedMonthDate(next);
    setSelectedDate(null);
  };

  // Filter transactions based on selected date OR active timeRange & month date
  const filteredTransactions = useMemo(() => {
    if (selectedDate) {
      return transactions.filter(
        (t) => new Date(t.date).toDateString() === selectedDate.toDateString()
      );
    }

    const year = selectedMonthDate.getFullYear();
    const month = selectedMonthDate.getMonth();

    if (timeRange === "Month") {
      return transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
    }

    if (timeRange === "Year") {
      return transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === year;
      });
    }

    // Week: filter transactions for the 7-day period of the active month (selectedMonthDate)
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
    
    const endDate = isCurrentMonth ? now : new Date(year, month + 1, 0, 23, 59, 59);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    return transactions.filter((t) => {
      const txDate = new Date(t.date);
      return txDate >= startDate && txDate <= endDate;
    });
  }, [transactions, selectedDate, selectedMonthDate, timeRange]);

  // Calculate dynamic totals for the selected period
  const displayIncomeTotal = useMemo(() => {
    return filteredTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  }, [filteredTransactions]);

  const displayExpenseTotal = useMemo(() => {
    return filteredTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  }, [filteredTransactions]);

  const displayNetBalance = displayIncomeTotal - displayExpenseTotal;

  const displaySavingsRate = displayIncomeTotal > 0
    ? Number(((displayNetBalance / displayIncomeTotal) * 100).toFixed(1))
    : 0;

  // Calculate breakdown categories based on active chart selection
  const targetCategories = activeChartType === "expense" ? expenseCategories : incomeCategories;
  const targetTotal = activeChartType === "expense" ? displayExpenseTotal : displayIncomeTotal;

  const categoryBreakdown = targetCategories
    .map((cat) => {
      const amount = filteredTransactions
        .filter((t) => t.type === activeChartType && t.category.toLowerCase() === cat.label.toLowerCase())
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        label: cat.label,
        amount,
        color: cat.color,
      };
    })
    .filter((item) => item.amount > 0);

  const breakdownToDisplay = categoryBreakdown;
  const activeTotalValue = targetTotal;

  // SVG Segmented Donut dimensions
  const radius = 70;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius; // Approx 439.82

  // Custom Calendar Calculation logic
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
    const chosen = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayNum);
    setSelectedDate(chosen);
    setShowDatePicker(false);
  };

  // Build calendar grid array
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

  // Calculate segments with exact stroke offsets in a dedicated useMemo
  const chartSegments = useMemo(() => {
    let acc = 0;
    return breakdownToDisplay.map((item) => {
      const percentage = activeTotalValue > 0 ? (item.amount / activeTotalValue) * 100 : 0;
      const strokeLength = (percentage / 100) * circumference;
      const strokeOffset = - (acc / 100) * circumference;
      acc += percentage;
      return {
        ...item,
        percentage,
        strokeLength,
        strokeOffset,
      };
    });
  }, [breakdownToDisplay, activeTotalValue, circumference]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>Analytics</Text>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={() => {
              setCalendarMonth(selectedDate || new Date());
              setShowDatePicker(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={selectedDate ? themeColors.primary : themeColors.text} />
          </TouchableOpacity>
        </View>

        {/* Date Filter Status Badge */}
        {selectedDate && (
          <View style={styles.filterBadgeContainer}>
            <View style={[styles.filterBadge, { backgroundColor: themeColors.softPurple }]}>
              <Text style={[styles.filterBadgeText, { color: themeColors.primary }]}>
                Showing: {selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDate(null)} style={{ marginLeft: 6 }}>
                <Ionicons name="close-circle" size={16} color={themeColors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Time Segmented Control */}
        <View style={[styles.segmentedControl, { backgroundColor: themeColors.surface }]}>
          {(["Week", "Month", "Year"] as TimeRange[]).map((tab) => {
            const active = timeRange === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.segmentBtn,
                  active && { backgroundColor: themeColors.card },
                ]}
                onPress={() => setTimeRange(tab)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? themeColors.primary : themeColors.muted },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Month Selector Bar */}
        <View style={styles.monthBar}>
          <TouchableOpacity style={styles.monthNavBtn} onPress={navPrevMonth}>
            <Ionicons name="chevron-back" size={20} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: themeColors.text }]}>
            {selectedMonthDate.toLocaleString("en-IN", { month: "long", year: "numeric" })}
          </Text>
          <TouchableOpacity style={styles.monthNavBtn} onPress={navNextMonth}>
            <Ionicons name="chevron-forward" size={20} color={themeColors.text} />
          </TouchableOpacity>
        </View>

        {/* Stat Cards 2x2 Grid */}
        <View style={styles.statsGrid}>
          {/* Income Card - Non-interactive */}
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: themeColors.softIncome,
                borderColor: themeColors.income,
                borderWidth: 1.5,
              },
            ]}
          >
            <Text style={[styles.statCardLabel, { color: themeColors.text }]}>Income</Text>
            <Text style={[styles.statCardValue, { color: themeColors.income }]}>
              ₹{displayIncomeTotal.toLocaleString("en-IN")}
            </Text>
          </View>

          {/* Expenses Card - Non-interactive */}
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: themeColors.softExpense,
                borderColor: themeColors.expense,
                borderWidth: 1.5,
              },
            ]}
          >
            <Text style={[styles.statCardLabel, { color: themeColors.text }]}>Expenses</Text>
            <Text style={[styles.statCardValue, { color: themeColors.expense }]}>
              ₹{displayExpenseTotal.toLocaleString("en-IN")}
            </Text>
          </View>

          {/* Net Balance Card */}
          <View style={[styles.statCard, { backgroundColor: themeColors.softPurple, borderColor: themeColors.primary, borderWidth: 1.5 }]}>
            <Text style={[styles.statCardLabel, { color: themeColors.primary, fontWeight: "700" }]}>Net Balance</Text>
            <Text style={[styles.statCardValue, { color: displayNetBalance >= 0 ? themeColors.primary : themeColors.expense }]}>
              ₹{displayNetBalance.toLocaleString("en-IN")}
            </Text>
          </View>

          {/* Savings Rate Card */}
          <View style={[styles.statCard, { backgroundColor: themeColors.softBlue, borderColor: themeColors.primary, borderWidth: 1.5 }]}>
            <Text style={[styles.statCardLabel, { color: themeColors.text }]} numberOfLines={1}>
              Savings Rate
            </Text>
            <Text style={[styles.statCardValue, { color: themeColors.primary }]}>
              {displaySavingsRate}%
            </Text>
            <View style={[styles.progressTrack, { marginTop: 6 }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(0, Math.min(displaySavingsRate, 100))}%`, backgroundColor: themeColors.primary },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Expense/Income by Category Section Header & Toggle Switch */}
        <View style={styles.chartTitleRow}>
          <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 0 }]}>
            {activeChartType === "expense" ? "Expenses" : "Income"} by Category
          </Text>
          <View style={[styles.toggleContainer, { backgroundColor: themeColors.surface }]}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                activeChartType === "expense" && { backgroundColor: themeColors.card },
              ]}
              onPress={() => setActiveChartType("expense")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: activeChartType === "expense" ? themeColors.primary : themeColors.muted },
                ]}
              >
                Expenses
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                activeChartType === "income" && { backgroundColor: themeColors.card },
              ]}
              onPress={() => setActiveChartType("income")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: activeChartType === "income" ? themeColors.primary : themeColors.muted },
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.chartCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          
          {/* Dynamic SVG Segmented Donut Chart */}
          <View style={styles.donutContainer}>
            <View style={styles.svgWrapper}>
              <Svg width={180} height={180} style={{ transform: [{ rotate: "-90deg" }] }}>
                {/* Background base circle */}
                <Circle
                  cx={90}
                  cy={90}
                  r={radius}
                  stroke={themeColors.surface}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {/* Dynamic Category Segments */}
                {chartSegments.map((segment: any) => {
                  if (segment.percentage <= 0) return null;
                  return (
                    <Circle
                      key={segment.label}
                      cx={90}
                      cy={90}
                      r={radius}
                      stroke={segment.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${segment.strokeLength} ${circumference}`}
                      strokeDashoffset={segment.strokeOffset}
                      fill="none"
                      strokeLinecap="round"
                    />
                  );
                })}
              </Svg>

              {/* Inner card showing text values center aligned */}
              <View style={[styles.donutInnerRing, { backgroundColor: themeColors.card }]}>
                <Text style={[styles.donutTotalValue, { color: themeColors.text }]}>
                  ₹{activeTotalValue.toLocaleString("en-IN")}
                </Text>
                <Text style={[styles.donutTotalLabel, { color: themeColors.muted }]}>Total</Text>
              </View>
            </View>
          </View>

          {/* Category Breakdown List with Tooltip info (percent & value labels) */}
          <View style={styles.breakdownList}>
            {breakdownToDisplay.length === 0 ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: themeColors.muted }}>
                  No {activeChartType === "expense" ? "expense" : "income"} transactions recorded
                </Text>
              </View>
            ) : (
              breakdownToDisplay.map((item) => {
                const percentage = activeTotalValue > 0 ? Math.round((item.amount / activeTotalValue) * 100) : 0;
                return (
                  <View key={item.label} style={styles.breakdownRow}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.dot, { backgroundColor: item.color }]} />
                      <Text style={[styles.categoryLabelText, { color: themeColors.text }]}>
                        {item.label}
                      </Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={[styles.categoryPercentText, { color: themeColors.muted }]}>
                        {percentage}%
                      </Text>
                      <Text style={[styles.categoryAmountText, { color: themeColors.text }]}>
                        ₹{item.amount.toLocaleString("en-IN")}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Custom Styled Premium Calendar Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.calendarModalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                {/* Modal Header */}
                <View style={styles.calendarModalHeader}>
                  <Text style={[styles.calendarModalTitle, { color: themeColors.text }]}>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
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
                      selectedDate !== null &&
                      selectedDate.getDate() === dayNum &&
                      selectedDate.getMonth() === calendarMonth.getMonth() &&
                      selectedDate.getFullYear() === calendarMonth.getFullYear();

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 18, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  filterBadgeContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  filterBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
  },
  monthBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  monthNavBtn: {
    padding: 4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "800",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: "47%",
    borderRadius: 18,
    padding: 16,
    minHeight: 88,
    justifyContent: "center",
    borderWidth: 1,
  },
  statCardLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  progressTrack: {
    height: 6,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  chartCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  donutContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  svgWrapper: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  donutInnerRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  donutTotalValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  donutTotalLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  breakdownList: {
    gap: 12,
    marginTop: 18,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryLabelText: {
    fontSize: 14,
    fontWeight: "700",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryPercentText: {
    fontSize: 13,
    fontWeight: "600",
  },
  categoryAmountText: {
    fontSize: 14,
    fontWeight: "700",
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
  chartTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 18,
  },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
