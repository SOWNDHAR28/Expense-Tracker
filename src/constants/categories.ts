import { TransactionType } from "../types/expense";
import { colors } from "../theme/colors";

export type CategoryItem = {
  id: string;
  label: string;
  icon: string; // MaterialCommunityIcons name
  color: string;
  type: TransactionType;
};

export const incomeCategories: CategoryItem[] = [
  { id: "salary", label: "Salary", icon: "cash", color: colors.salary, type: "income" },
  { id: "freelance", label: "Freelance", icon: "laptop", color: colors.freelance, type: "income" },
  { id: "business", label: "Business", icon: "briefcase-outline", color: colors.business, type: "income" },
  { id: "bonus", label: "Bonus", icon: "gift-outline", color: colors.bonus, type: "income" },
  { id: "interest", label: "Interest", icon: "percent-outline", color: colors.interest, type: "income" },
  { id: "gift", label: "Gift", icon: "gift", color: "#27AE60", type: "income" },
  { id: "other_income", label: "Other", icon: "dots-horizontal", color: colors.other, type: "income" },
];

export const expenseCategories: CategoryItem[] = [
  { id: "food", label: "Food", icon: "silverware-fork-knife", color: colors.food, type: "expense" },
  { id: "transport", label: "Transport", icon: "car", color: colors.transport, type: "expense" },
  { id: "shopping", label: "Shopping", icon: "shopping-outline", color: colors.shopping, type: "expense" },
  { id: "bills", label: "Bills", icon: "file-document-outline", color: colors.bills, type: "expense" },
  { id: "entertainment", label: "Entertainment", icon: "movie-open-outline", color: colors.entertainment, type: "expense" },
  { id: "health", label: "Health", icon: "heart-outline", color: colors.health, type: "expense" },
  { id: "education", label: "Education", icon: "school-outline", color: colors.education, type: "expense" },
  { id: "travel", label: "Travel", icon: "airplane", color: colors.travel, type: "expense" },
  { id: "other_expense", label: "Others", icon: "dots-horizontal", color: colors.other, type: "expense" },
];

export const allCategories = [...incomeCategories, ...expenseCategories];

export function getCategoryById(idOrLabel: string, customCategories: CategoryItem[] = []): CategoryItem {
  const allCombined = [...allCategories, ...customCategories];
  const match = allCombined.find(
    (item) => item.id.toLowerCase() === idOrLabel.toLowerCase() || item.label.toLowerCase() === idOrLabel.toLowerCase()
  );
  if (match) return match;

  return {
    id: "other",
    label: idOrLabel || "Other",
    icon: "dots-horizontal",
    color: colors.other,
    type: "expense",
  };
}

export function getCategoryMeta(idOrLabel: string, customCategories: CategoryItem[] = []) {
  const cat = getCategoryById(idOrLabel, customCategories);
  return {
    label: cat.label,
    icon: cat.icon,
    color: cat.color,
    type: cat.type,
  };
}

export const PALETTE_COLORS = [
  "#E74C3C", // Red
  "#3498DB", // Blue
  "#2ECC71", // Green
  "#9B59B6", // Purple
  "#F1C40F", // Yellow
  "#E67E22", // Orange
  "#1ABC9C", // Teal
  "#FD79A8", // Pink
];

export const PALETTE_ICONS = [
  "silverware-fork-knife",
  "car",
  "shopping-outline",
  "file-document-outline",
  "movie-open-outline",
  "heart-outline",
  "school-outline",
  "airplane",
  "cash",
  "laptop",
  "gift-outline",
  "coffee",
  "weight-lifter",
  "television-play",
  "dots-horizontal",
];
