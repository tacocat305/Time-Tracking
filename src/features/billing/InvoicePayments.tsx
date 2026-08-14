import { useState } from "react";

import {
  getInvoiceAmountPaid,
  getInvoiceBalance,
} from "@/features/billing/billing";
import type { InvoiceRecord, PaymentMethod } from "@/features/time/types";
import type { UseTimeTrackerResult } from "@/features/time/useTimeTracker";
import { formatCurrency } from "@/features/time/utils";

type InvoicePaymentsProps = {
  invoice: InvoiceRecord;
  tracker: Pick<
    UseTimeTrackerResult,
    "addInvoicePayment" | "deleteInvoicePayment"
  >;
};

export function InvoicePayments({ invoice, tracker }: InvoicePaymentsProps) {
  const [formVersion, setFormVersion] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const amountPaid = getInvoiceAmountPaid(invoice);
  const balance = getInvoiceBalance(invoice);

  function handlePaymentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const added = tracker.addInvoicePayment(invoice.id, {
      amount: Number(formData.get("amount") ?? 0),
      method: `${formData.get("method") ?? "other"}` as PaymentMethod,
      notes: `${formData.get("notes") ?? ""}`,
      paymentDate: `${formData.get("paymentDate") ?? ""}`,
      reference: `${formData.get("reference") ?? ""}`,
    });
    setMessage(
      added
        ? "Payment recorded and invoice balance reconciled."
        : "Payment must be positive, no greater than the remaining balance, and attached to a sent invoice."
    );
    if (added) {
      setFormVersion((current) => current + 1);
    }
  }

  return (
    <section className="invoice-payment-card">
      <div className="records-section-head">
        <div>
          <div className="eyebrow">Payment reconciliation</div>
          <h3 className="records-section-title">Invoice payments</h3>
          <p className="records-section-copy">
            Each payment keeps its date, method, reference, and amount. The
            invoice status follows the reconciled balance automatically.
          </p>
        </div>
        <div className="records-section-chip">
          {formatCurrency(balance)} remaining
        </div>
      </div>

      <div className="invoice-payment-summary">
        <div>
          <span>Invoice total</span>
          <strong>{formatCurrency(invoice.totalAmount)}</strong>
        </div>
        <div>
          <span>Payments recorded</span>
          <strong>{formatCurrency(amountPaid)}</strong>
        </div>
        <div>
          <span>Open balance</span>
          <strong>{formatCurrency(balance)}</strong>
        </div>
      </div>

      {invoice.payments.length > 0 ? (
        <div className="invoice-payment-list">
          {[...invoice.payments]
            .sort((left, right) =>
              right.paymentDate.localeCompare(left.paymentDate)
            )
            .map((payment) => (
              <article key={payment.id} className="invoice-payment-row">
                <div>
                  <p className="list-row-title">
                    {formatCurrency(payment.amount)} ·{" "}
                    {formatPaymentMethod(payment.method)}
                  </p>
                  <p className="list-meta">
                    {payment.paymentDate}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </p>
                  {payment.notes ? (
                    <p className="list-meta">{payment.notes}</p>
                  ) : null}
                </div>
                <button
                  className="button-danger"
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Remove this payment record and recalculate the invoice balance?"
                      )
                    ) {
                      tracker.deleteInvoicePayment(invoice.id, payment.id);
                    }
                  }}
                >
                  Remove payment
                </button>
              </article>
            ))}
        </div>
      ) : (
        <div className="billing-inline-note">
          No payments have been recorded for this invoice.
        </div>
      )}

      {invoice.status === "draft" ? (
        <div className="billing-inline-note">
          Mark the invoice sent before recording a payment.
        </div>
      ) : balance > 0 ? (
        <form
          key={formVersion}
          className="composer-form invoice-payment-form"
          onSubmit={handlePaymentSubmit}
        >
          <div className="field-grid">
            <label className="field">
              <span className="field-label">Payment date</span>
              <input
                className="text-input"
                defaultValue={getTodayDateKey()}
                name="paymentDate"
                required
                type="date"
              />
            </label>
            <label className="field">
              <span className="field-label">Amount</span>
              <input
                className="text-input"
                defaultValue={balance.toFixed(2)}
                max={balance.toFixed(2)}
                min="0.01"
                name="amount"
                required
                step="0.01"
                type="number"
              />
            </label>
          </div>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">Method</span>
              <select className="text-input" defaultValue="ach" name="method">
                <option value="ach">ACH or bank transfer</option>
                <option value="card">Card</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Reference</span>
              <input
                className="text-input"
                name="reference"
                placeholder="Check number or transaction ID"
              />
            </label>
          </div>
          <label className="field">
            <span className="field-label">Payment notes</span>
            <input className="text-input" name="notes" />
          </label>
          <div className="button-row">
            <button className="button-primary" type="submit">
              Record and reconcile payment
            </button>
          </div>
        </form>
      ) : (
        <div className="billing-inline-note">
          This invoice is fully reconciled. Remove a payment only if a
          correction or reversal is needed.
        </div>
      )}

      {message ? (
        <div className="billing-export-status" role="status">
          {message}
        </div>
      ) : null}
    </section>
  );
}

function formatPaymentMethod(method: PaymentMethod) {
  switch (method) {
    case "ach":
      return "ACH / bank transfer";
    case "card":
      return "Card";
    case "cash":
      return "Cash";
    case "check":
      return "Check";
    case "other":
      return "Other";
  }
}

function getTodayDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
}
