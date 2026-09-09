import {
  getInvoiceAmountPaid,
  getInvoiceBalance,
} from "@/features/billing/billing";
import type { InvoiceRecord, InvoiceStatus } from "@/features/time/types";

export type InvoiceHistoryPeriod =
  "all" | "this-month" | "last-month" | "this-year" | "last-year" | "custom";

export type InvoiceHistoryStatus = "all" | InvoiceStatus;

export type InvoiceHistoryFilters = {
  clientKey: string;
  endPeriod: string;
  period: InvoiceHistoryPeriod;
  startPeriod: string;
  status: InvoiceHistoryStatus;
};

export type InvoiceClientHistory = {
  balance: number;
  clientKey: string;
  clientName: string;
  collected: number;
  invoiceCount: number;
  totalAmount: number;
  totalBilledMinutes: number;
};

export type InvoiceHistorySummary = {
  balance: number;
  clientCount: number;
  clients: InvoiceClientHistory[];
  collected: number;
  invoiceCount: number;
  totalAmount: number;
  totalBilledMinutes: number;
};

export function getDefaultInvoiceHistoryFilters(
  now = new Date()
): InvoiceHistoryFilters {
  const currentPeriod = getMonthKey(now);

  return {
    clientKey: "all",
    endPeriod: currentPeriod,
    period: "all",
    startPeriod: `${now.getFullYear()}-01`,
    status: "all",
  };
}

export function filterInvoiceHistory(
  invoices: InvoiceRecord[],
  filters: InvoiceHistoryFilters,
  now = new Date()
) {
  const range = getInvoiceHistoryRange(filters, now);

  if (!range.valid) {
    return [];
  }

  return invoices
    .filter((invoice) => {
      if (
        filters.clientKey !== "all" &&
        getInvoiceClientKey(invoice) !== filters.clientKey
      ) {
        return false;
      }
      if (filters.status !== "all" && invoice.status !== filters.status) {
        return false;
      }
      if (range.startPeriod && invoice.periodKey < range.startPeriod) {
        return false;
      }
      if (range.endPeriod && invoice.periodKey > range.endPeriod) {
        return false;
      }
      return true;
    })
    .sort(
      (left, right) =>
        right.periodKey.localeCompare(left.periodKey) ||
        right.issuedOn.localeCompare(left.issuedOn) ||
        right.statementNumber.localeCompare(left.statementNumber)
    );
}

export function summarizeInvoiceHistory(
  invoices: InvoiceRecord[]
): InvoiceHistorySummary {
  const clients = new Map<string, InvoiceClientHistory>();
  let totalAmount = 0;
  let collected = 0;
  let balance = 0;
  let totalBilledMinutes = 0;

  for (const invoice of invoices) {
    const invoiceCollected = getInvoiceAmountPaid(invoice);
    const invoiceBalance = getInvoiceBalance(invoice);
    const clientKey = getInvoiceClientKey(invoice);
    const existing = clients.get(clientKey) ?? {
      balance: 0,
      clientKey,
      clientName: invoice.clientName,
      collected: 0,
      invoiceCount: 0,
      totalAmount: 0,
      totalBilledMinutes: 0,
    };

    existing.balance += invoiceBalance;
    existing.collected += invoiceCollected;
    existing.invoiceCount += 1;
    existing.totalAmount += invoice.totalAmount;
    existing.totalBilledMinutes += invoice.totalBilledMinutes;
    clients.set(clientKey, existing);

    totalAmount += invoice.totalAmount;
    collected += invoiceCollected;
    balance += invoiceBalance;
    totalBilledMinutes += invoice.totalBilledMinutes;
  }

  return {
    balance,
    clientCount: clients.size,
    clients: [...clients.values()].sort(
      (left, right) =>
        right.totalAmount - left.totalAmount ||
        left.clientName.localeCompare(right.clientName)
    ),
    collected,
    invoiceCount: invoices.length,
    totalAmount,
    totalBilledMinutes,
  };
}

export function getInvoiceHistoryRange(
  filters: Pick<InvoiceHistoryFilters, "endPeriod" | "period" | "startPeriod">,
  now = new Date()
) {
  const year = now.getFullYear();
  const currentPeriod = getMonthKey(now);

  switch (filters.period) {
    case "this-month":
      return {
        endPeriod: currentPeriod,
        startPeriod: currentPeriod,
        valid: true,
      };
    case "last-month": {
      const lastMonth = getMonthKey(new Date(year, now.getMonth() - 1, 1));
      return {
        endPeriod: lastMonth,
        startPeriod: lastMonth,
        valid: true,
      };
    }
    case "this-year":
      return {
        endPeriod: `${year}-12`,
        startPeriod: `${year}-01`,
        valid: true,
      };
    case "last-year":
      return {
        endPeriod: `${year - 1}-12`,
        startPeriod: `${year - 1}-01`,
        valid: true,
      };
    case "custom":
      return {
        endPeriod: filters.endPeriod,
        startPeriod: filters.startPeriod,
        valid: Boolean(
          filters.startPeriod &&
          filters.endPeriod &&
          filters.startPeriod <= filters.endPeriod
        ),
      };
    default:
      return {
        endPeriod: null,
        startPeriod: null,
        valid: true,
      };
  }
}

export function getInvoiceClientKey(
  invoice: Pick<InvoiceRecord, "clientId" | "clientName">
) {
  return invoice.clientId
    ? `id:${invoice.clientId}`
    : `name:${invoice.clientName.trim().toLocaleLowerCase()}`;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
