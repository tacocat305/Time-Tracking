import type { ScreenId } from "@/types/app";

export type AppScreen = {
  description: string;
  id: ScreenId;
  label: string;
};

export const appScreens: AppScreen[] = [
  {
    id: "today",
    label: "Today",
    description: "Manual entry, timer, and today’s work.",
  },
  {
    id: "week",
    label: "Week",
    description: "Weekly hours, review flow, and unusual sessions.",
  },
  {
    id: "month",
    label: "Month",
    description: "Monthly billing totals and statement readiness.",
  },
  {
    id: "billing",
    label: "Billing",
    description: "Invoices, PDF statements, and paid tracking.",
  },
  {
    id: "clients",
    label: "Clients",
    description: "Contacts, billing instructions, and hourly rates.",
  },
  {
    id: "expenses",
    label: "Expenses",
    description: "Client costs and business overhead tracking.",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Themes, backups, and local app preferences.",
  },
];
