export const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (value: string) => {
  const date = new Date(value);
  const dateText = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeText = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${dateText}, ${timeText}`;
};

export const formatTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatCompactCurrency = (value: number) => {
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }

  return currencyFormatter.format(value);
};
