import { describe, expect, it } from "vitest";

import type { TimeEntry } from "@/features/time/types";
import { isEntryInMonth, isEntryInWeek } from "@/features/time/utils";

import {
  formatMonthPeriod,
  formatWeekPeriod,
  isCurrentMonth,
  isCurrentWeek,
  shiftMonth,
  shiftWeek,
} from "./periods";

const entry = (workDate: string): TimeEntry => ({
  actualMinutes: 60,
  billedMinutes: 60,
  clientId: null,
  clientName: "Client",
  createdAt: `${workDate}T12:00:00.000Z`,
  id: workDate,
  longSession: false,
  matterId: null,
  matterName: "Matter",
  narrative: "Work",
  reviewedAt: null,
  source: "manual",
  startedAt: null,
  taskCategory: "Review",
  workDate,
});

describe("historical reporting periods", () => {
  it("filters a selected Monday-to-Sunday week", () => {
    const anchor = new Date(2026, 5, 17);
    expect(isEntryInWeek(entry("2026-06-15"), anchor)).toBe(true);
    expect(isEntryInWeek(entry("2026-06-21"), anchor)).toBe(true);
    expect(isEntryInWeek(entry("2026-06-22"), anchor)).toBe(false);
    expect(formatWeekPeriod(anchor)).toBe("Jun 15 - 21, 2026");
    expect(formatWeekPeriod(shiftWeek(anchor, -1))).toBe("Jun 8 - 14, 2026");
  });

  it("filters and navigates across year boundaries by month", () => {
    const december = new Date(2026, 11, 1);
    const january = shiftMonth(december, 1);
    expect(formatMonthPeriod(january)).toBe("January 2027");
    expect(isEntryInMonth(entry("2027-01-31"), january)).toBe(true);
    expect(isEntryInMonth(entry("2026-12-31"), january)).toBe(false);
  });

  it("recognizes current periods independently from the selected day", () => {
    const now = new Date(2026, 7, 5);
    expect(isCurrentWeek(new Date(2026, 7, 9), now)).toBe(true);
    expect(isCurrentWeek(new Date(2026, 7, 10), now)).toBe(false);
    expect(isCurrentMonth(new Date(2026, 7, 31), now)).toBe(true);
    expect(isCurrentMonth(new Date(2026, 6, 31), now)).toBe(false);
  });
});
