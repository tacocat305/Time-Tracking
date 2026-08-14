import { describe, expect, it } from "vitest";

import {
  getInvoiceAmountPaid,
  getInvoiceBalance,
  reconcileInvoicePayments,
} from "./billing";
import type { InvoiceRecord, PaymentRecord } from "@/features/time/types";

const invoice = (): InvoiceRecord => ({
  billingInstructions: "",
  clientAddress: "",
  clientId: "client-1",
  clientName: "Client",
  contactEmail: "billing@example.com",
  contactName: "Billing",
  deliveries: [],
  excludedExpenseIds: [],
  id: "invoice-1",
  issuedOn: "2026-07-01",
  lineItems: [],
  matterSummaries: [],
  notes: "",
  paidOn: null,
  payments: [],
  periodKey: "2026-06",
  periodLabel: "June 2026",
  reviewedCount: 0,
  statementExportedAt: null,
  statementNumber: "26-006",
  statementPdfPath: null,
  status: "sent",
  totalAmount: 1000,
  totalBilledMinutes: 0,
  unreviewedCount: 0,
});

const payment = (
  id: string,
  amount: number,
  paymentDate: string
): PaymentRecord => ({
  amount,
  createdAt: `${paymentDate}T12:00:00.000Z`,
  id,
  method: "ach",
  notes: "",
  paymentDate,
  reference: id,
});

describe("invoice payment reconciliation", () => {
  it("tracks a partial payment without marking the invoice paid", () => {
    const reconciled = reconcileInvoicePayments(invoice(), [
      payment("payment-1", 250, "2026-07-10"),
    ]);
    expect(reconciled.status).toBe("partial");
    expect(reconciled.paidOn).toBeNull();
    expect(getInvoiceAmountPaid(reconciled)).toBe(250);
    expect(getInvoiceBalance(reconciled)).toBe(750);
  });

  it("marks full settlement paid using the latest payment date", () => {
    const reconciled = reconcileInvoicePayments(invoice(), [
      payment("payment-1", 250, "2026-07-10"),
      payment("payment-2", 750, "2026-07-15"),
    ]);
    expect(reconciled.status).toBe("paid");
    expect(reconciled.paidOn).toBe("2026-07-15");
    expect(getInvoiceBalance(reconciled)).toBe(0);
  });

  it("reopens a paid invoice when a payment is reversed", () => {
    const paid = reconcileInvoicePayments(invoice(), [
      payment("payment-1", 1000, "2026-07-15"),
    ]);
    const reopened = reconcileInvoicePayments(paid, []);
    expect(reopened.status).toBe("sent");
    expect(reopened.paidOn).toBeNull();
    expect(getInvoiceBalance(reopened)).toBe(1000);
  });
});
