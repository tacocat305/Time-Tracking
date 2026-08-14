import { getWeekStart } from "@/features/time/utils";

export function shiftWeek(anchorDate: Date, amount: number) {
  const shifted = new Date(anchorDate);
  shifted.setDate(shifted.getDate() + amount * 7);
  return shifted;
}

export function shiftMonth(anchorDate: Date, amount: number) {
  return new Date(anchorDate.getFullYear(), anchorDate.getMonth() + amount, 1);
}

export function formatWeekPeriod(anchorDate: Date) {
  const start = getWeekStart(anchorDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    return `${startLabel} - ${end.getDate()}, ${end.getFullYear()}`;
  }

  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} - ${endLabel}`;
}

export function formatMonthPeriod(anchorDate: Date) {
  return anchorDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function isCurrentWeek(anchorDate: Date, now = new Date()) {
  return getWeekStart(anchorDate).getTime() === getWeekStart(now).getTime();
}

export function isCurrentMonth(anchorDate: Date, now = new Date()) {
  return (
    anchorDate.getFullYear() === now.getFullYear() &&
    anchorDate.getMonth() === now.getMonth()
  );
}
