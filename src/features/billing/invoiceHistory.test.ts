import { describe, expect, it } from "vitest";

import type { InvoiceRecord } from "@/features/time/types";

import {
  filterInvoiceHistory,
  getDefaultInvoiceHistoryFilters,
  summarizeInvoiceHistory,
} from "./invoiceHistory";

describe("invoice history reporting", () => {
  const now = new Date(2026, 8, 9);
  const invoices = [
    createInvoice({
      clientId: "client-a",
      clientName: "Alpha Co.",
      id: "invoice-august",
      periodKey: "2026-08",
      status: "paid",
      totalAmount: 1000,
      totalBilledMinutes: 180,
      payments: [
        {
          amount: 1000,
          createdAt: "2026-09-02T12:00:00.000Z",
          id: "payment-1",
          method: "check",
          notes: "",
          paymentDate: "2026-09-02",
          reference: "101",
        },
      ],
    }),
    createInvoice({
      clientId: "client-a",
      clientName: "Alpha Co.",
      id: "invoice-july",
      periodKey: "2026-07",
      status: "sent",
      totalAmount: 750,
      totalBilledMinutes: 120,
    }),
    createInvoice({
      clientId: "client-b",
      clientName: "Beta LLC",
      id: "invoice-2025",
      periodKey: "2025-12",
      status: "paid",
      totalAmount: 500,
      totalBilledMinutes: 60,
    }),
  ];

  it("filters all-time, last-month, and custom billing periods", () => {
    const defaults = getDefaultInvoiceHistoryFilters(now);
    expect(filterInvoiceHistory(invoices, defaults, now)).toHaveLength(3);

    expect(
      filterInvoiceHistory(
        invoices,
        { ...defaults, period: "last-month" },
        now
      ).map((invoice) => invoice.id)
    ).toEqual(["invoice-august"]);

    expect(
      filterInvoiceHistory(
        invoices,
        {
          ...defaults,
          endPeriod: "2026-07",
          period: "custom",
          startPeriod: "2025-12",
        },
        now
      ).map((invoice) => invoice.id)
    ).toEqual(["invoice-july", "invoice-2025"]);
  });

  it("combines period, client, and status filters", () => {
    const defaults = getDefaultInvoiceHistoryFilters(now);
    const filtered = filterInvoiceHistory(
      invoices,
      {
        ...defaults,
        clientKey: "id:client-a",
        period: "this-year",
        status: "sent",
      },
      now
    );

    expect(filtered.map((invoice) => invoice.id)).toEqual(["invoice-july"]);
  });

  it("calculates overall and per-client billed totals from invoice snapshots", () => {
    const summary = summarizeInvoiceHistory(invoices);

    expect(summary.invoiceCount).toBe(3);
    expect(summary.clientCount).toBe(2);
    expect(summary.totalAmount).toBe(2250);
    expect(summary.collected).toBe(1000);
    expect(summary.balance).toBe(1250);
    expect(summary.totalBilledMinutes).toBe(360);
    expect(summary.clients).toEqual([
      expect.objectContaining({
        balance: 750,
        clientName: "Alpha Co.",
        collected: 1000,
        invoiceCount: 2,
        totalAmount: 1750,
      }),
      expect.objectContaining({
        balance: 500,
        clientName: "Beta LLC",
        collected: 0,
        invoiceCount: 1,
        totalAmount: 500,
      }),
    ]);
  });

  it("returns no records for an invalid custom range", () => {
    const defaults = getDefaultInvoiceHistoryFilters(now);
    expect(
      filterInvoiceHistory(
        invoices,
        {
          ...defaults,
          endPeriod: "2026-01",
          period: "custom",
          startPeriod: "2026-08",
        },
        now
      )
    ).toEqual([]);
  });
});

function createInvoice(
  overrides: Partial<InvoiceRecord> &
    Pick<InvoiceRecord, "id" | "periodKey" | "totalAmount">
): InvoiceRecord {
  return {
    billingInstructions: "",
    clientAddress: "123 Main St.",
    clientId: null,
    clientName: "Client",
    contactEmail: "billing@example.com",
    contactName: "Billing Contact",
    deliveries: [],
    excludedExpenseIds: [],
    issuedOn: `${overrides.periodKey}-28`,
    lineItems: [],
    matterSummaries: [],
    notes: "",
    paidOn: null,
    payments: [],
    periodLabel: overrides.periodKey,
    reviewedCount: 1,
    statementExportedAt: null,
    statementPdfPath: null,
    statementNumber: overrides.id,
    status: "draft",
    totalBilledMinutes: 0,
    unreviewedCount: 0,
    ...overrides,
  };
}
