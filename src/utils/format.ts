export const formatPercent = (amount: number, total: number): string => {
  if (total === 0) return "0.00";
  return ((amount / total) * 100).toFixed(2);
};
