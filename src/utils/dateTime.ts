export const formatDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatTimeInput = (value: Date) => {
  const hours = `${value.getHours()}`.padStart(2, "0");
  const minutes = `${value.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const isValidDateTimeInput = (dateText: string, timeText: string) => {
  const [year, month, day] = dateText.split("-").map(Number);
  const [hours, minutes] = timeText.split(":").map(Number);

  if ([year, month, day, hours, minutes].some((value) => Number.isNaN(value))) {
    return false;
  }

  const parsed = new Date(year, month - 1, day, hours, minutes);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day &&
    parsed.getHours() === hours &&
    parsed.getMinutes() === minutes
  );
};

export const buildIsoDateTime = (dateText: string, timeText: string, fallback = new Date()) => {
  const [year, month, day] = dateText.split("-").map(Number);
  const [hours, minutes] = timeText.split(":").map(Number);

  if ([year, month, day, hours, minutes].some((value) => Number.isNaN(value))) {
    return fallback.toISOString();
  }

  const parsed = new Date(year, month - 1, day, hours, minutes);
  return parsed.toISOString();
};

export const parseIsoDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date();
    return {
      date: formatDateInput(fallback),
      time: formatTimeInput(fallback),
    };
  }

  return {
    date: formatDateInput(parsed),
    time: formatTimeInput(parsed),
  };
};
