import { useState } from "react";

import {
  formatInvoiceStatusLabel,
  getInvoiceAmountPaid,
  getInvoiceBalance,
  getInvoiceStatusTone,
  type BillingCandidate,
} from "@/features/billing/billing";
import {
  canExportInvoicePdf,
  exportInvoicePdf,
  openInvoicePdf,
  revealInvoicePdf,
} from "@/features/billing/export";
import {
  canSendInvoiceEmail,
  sendInvoiceEmail,
} from "@/features/billing/email";
import { InvoicePayments } from "@/features/billing/InvoicePayments";
import { TimeEntryDialog } from "@/features/dashboard/TodayScreen";
import type {
  InvoiceLineItem,
  InvoiceRecord,
  StatementProfile,
} from "@/features/time/types";
import type { UseTimeTrackerResult } from "@/features/time/useTimeTracker";
import { formatCurrency, formatHours } from "@/features/time/utils";
import { PageHeader } from "@/shared/ui/PageHeader";

type BillingScreenProps = {
  tracker: UseTimeTrackerResult;
};

type BillingSelection =
  | {
      id: string;
      kind: "invoice";
    }
  | {
      id: string;
      kind: "candidate";
    };

type ExportState = {
  message: string;
  tone: "danger" | "neutral" | "success";
} | null;

export function BillingScreen({ tracker }: BillingScreenProps) {
  const [selection, setSelection] = useState<BillingSelection | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [exportState, setExportState] = useState<ExportState>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [pendingDeleteCandidate, setPendingDeleteCandidate] =
    useState<BillingCandidate | null>(null);
  const billingQueue = tracker.billingCandidates.filter((candidate) => {
    if (!candidate.existingInvoiceId) {
      return true;
    }

    return (
      tracker.invoiceRecords.find(
        (invoice) => invoice.id === candidate.existingInvoiceId
      )?.status === "draft"
    );
  });
  const resolvedSelection = resolveSelection(
    selection,
    billingQueue,
    tracker.invoiceRecords
  );
  const desktopExportAvailable = canExportInvoicePdf();
  const desktopEmailAvailable = canSendInvoiceEmail();
  const editingEntry =
    tracker.entries.find((entry) => entry.id === editingEntryId) ?? null;

  const selectedCandidate =
    resolvedSelection?.kind === "candidate"
      ? (billingQueue.find(
          (candidate) => candidate.key === resolvedSelection.id
        ) ?? null)
      : null;
  const selectedInvoice =
    resolvedSelection?.kind === "invoice"
      ? (tracker.invoiceRecords.find(
          (invoice) => invoice.id === resolvedSelection.id
        ) ?? null)
      : null;
  const selectedInvoiceLocked = selectedInvoice?.status === "paid";
  const selectedInvoiceIssues = selectedInvoice
    ? getInvoiceReadinessIssues(selectedInvoice, tracker.statementProfile)
    : [];
  const preview = selectedInvoice
    ? buildPreviewFromInvoice(selectedInvoice)
    : selectedCandidate;
  const previewSubtotals = preview
    ? summarizeBillingLineItems(preview.lineItems)
    : null;
  const attachedExpenseIds = new Set(
    selectedInvoice?.lineItems
      .filter((lineItem) => lineItem.kind === "expense")
      .map((lineItem) => lineItem.entryId) ?? []
  );
  const attachedExpenseItems =
    selectedInvoice?.lineItems.filter(
      (lineItem) => lineItem.kind === "expense"
    ) ?? [];
  const availableInvoiceExpenses = selectedInvoice
    ? tracker.clientExpenseRecords.filter(
        (expense) =>
          expense.kind === "client" &&
          expense.status !== "reimbursed" &&
          expense.expenseDate.startsWith(selectedInvoice.periodKey) &&
          matchesInvoiceClient(selectedInvoice, expense) &&
          !attachedExpenseIds.has(expense.id) &&
          !tracker.invoiceRecords.some(
            (invoice) =>
              invoice.id !== selectedInvoice.id &&
              invoice.lineItems.some(
                (lineItem) =>
                  lineItem.kind === "expense" && lineItem.entryId === expense.id
              )
          )
      )
    : [];

  const openInvoiceCount = tracker.invoiceRecords.filter(
    (invoice) => invoice.status !== "paid"
  ).length;
  const paidTotal = tracker.invoiceRecords
    .filter((invoice) => invoice.status === "paid")
    .reduce((total, invoice) => total + invoice.totalAmount, 0);
  const archivedStatementCount = tracker.invoiceRecords.length;
  const readinessCount = billingQueue.filter(
    (candidate) =>
      !candidate.existingInvoiceId &&
      candidate.clientId &&
      candidate.unreviewedCount === 0
  ).length;

  function handleCreateInvoice(candidate: BillingCandidate) {
    const invoiceId = tracker.createInvoiceRecord(candidate);

    if (!invoiceId) {
      return;
    }

    setSelection({
      id: invoiceId,
      kind: "invoice",
    });
  }

  function handleDeleteCandidate(candidate: BillingCandidate) {
    setPendingDeleteCandidate(candidate);
  }

  function handleConfirmDeleteCandidate() {
    if (!pendingDeleteCandidate) {
      return;
    }

    if (tracker.deleteBillingCandidate(pendingDeleteCandidate)) {
      setSelection(null);
      setPendingDeleteCandidate(null);
      return;
    }

    setExportState({
      message:
        "This queue item could not be deleted because one or more records are locked by an invoice.",
      tone: "danger",
    });
    setPendingDeleteCandidate(null);
  }

  async function handleExportInvoice(invoice: InvoiceRecord) {
    const readinessIssues = getInvoiceReadinessIssues(
      invoice,
      tracker.statementProfile
    );
    if (readinessIssues.length > 0) {
      setExportState({
        message: `Complete the invoice before export: ${readinessIssues.join("; ")}.`,
        tone: "danger",
      });
      return;
    }

    setIsExporting(true);
    setExportState(null);

    try {
      const path = await exportInvoicePdf(invoice, tracker.statementProfile);
      const exportedAt = new Date().toISOString();

      tracker.updateInvoiceStatementExport(invoice.id, path, exportedAt);
      setExportState({
        message: "Statement PDF exported successfully.",
        tone: "success",
      });
    } catch (error) {
      setExportState({
        message:
          error instanceof Error
            ? error.message
            : "Statement PDF export failed unexpectedly.",
        tone: "danger",
      });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleOpenExportedPdf(path: string) {
    try {
      await openInvoicePdf(path);
    } catch (error) {
      setExportState({
        message:
          error instanceof Error
            ? error.message
            : "Could not open the exported PDF.",
        tone: "danger",
      });
    }
  }

  async function handleRevealExportedPdf(path: string) {
    try {
      await revealInvoicePdf(path);
    } catch (error) {
      setExportState({
        message:
          error instanceof Error
            ? error.message
            : "Could not reveal the exported PDF.",
        tone: "danger",
      });
    }
  }

  async function handleSendInvoice(invoice: InvoiceRecord) {
    const readinessIssues = getInvoiceReadinessIssues(
      invoice,
      tracker.statementProfile
    );
    if (readinessIssues.length > 0) {
      setExportState({
        message: `Complete the invoice before sending: ${readinessIssues.join("; ")}.`,
        tone: "danger",
      });
      return;
    }

    const recipient = invoice.contactEmail.trim();
    if (!recipient) {
      setExportState({
        message:
          "Add a billing email to the client before sending this invoice.",
        tone: "danger",
      });
      return;
    }
    if (
      !window.confirm(
        `Send ${invoice.statementNumber} to ${recipient} using the configured mail app?`
      )
    ) {
      return;
    }

    setIsSendingEmail(true);
    setExportState(null);
    const subject = `Invoice ${invoice.statementNumber} from ${tracker.statementProfile.firmName}`;
    const body = `Hello ${invoice.contactName || invoice.clientName},\n\nPlease find attached invoice ${invoice.statementNumber} for ${invoice.periodLabel}. The amount due is ${formatCurrency(getInvoiceBalance(invoice))}.\n\nThank you,\n${tracker.statementProfile.senderName || tracker.statementProfile.firmName}`;
    try {
      let pdfPath = invoice.statementPdfPath;
      if (!pdfPath) {
        pdfPath = await exportInvoicePdf(invoice, tracker.statementProfile);
        tracker.updateInvoiceStatementExport(
          invoice.id,
          pdfPath,
          new Date().toISOString()
        );
      }
      const result = await sendInvoiceEmail({
        body,
        pdfPath,
        recipient,
        subject,
      });
      tracker.recordInvoiceDelivery(invoice.id, {
        message: result.message,
        recipient,
        status: result.status,
        subject,
        transport: result.transport,
      });
      setExportState({
        message: `${result.transport} accepted the invoice for sending to ${recipient}.`,
        tone: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Email failed: ${String(error)}`;
      tracker.recordInvoiceDelivery(invoice.id, {
        message,
        recipient,
        status: "failed",
        subject,
        transport: "Native mail client",
      });
      setExportState({ message, tone: "danger" });
    } finally {
      setIsSendingEmail(false);
    }
  }

  function handleInvoiceMetadataSubmit(
    event: React.FormEvent<HTMLFormElement>,
    invoice: InvoiceRecord
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const updated = tracker.updateInvoiceMetadata(invoice.id, {
      issuedOn: `${formData.get("issuedOn") ?? ""}`,
      statementNumber: `${formData.get("statementNumber") ?? ""}`,
    });
    setExportState({
      message: updated
        ? "Invoice number and issue date saved. Export a new PDF to reflect the change."
        : "Use a unique invoice number and a valid issue date. Only draft invoices can be changed.",
      tone: updated ? "success" : "danger",
    });
  }

  return (
    <div className="screen-grid">
      <PageHeader
        eyebrow="Billing records"
        title="Billing"
        description="Billing now pulls from tracked time, reimbursable client expenses, and saved client records so monthly statements and invoice history share one local source of truth."
      />

      <section className="metrics-grid">
        <article className="insight-stat-card" data-tone="warning">
          <div className="insight-stat-label">Open invoices</div>
          <div className="insight-stat-value">{openInvoiceCount}</div>
          <div className="insight-stat-detail">
            Draft and sent invoices stay visible until paid.
          </div>
        </article>
        <article className="insight-stat-card" data-tone="accent">
          <div className="insight-stat-label">Archived statements</div>
          <div className="insight-stat-value">{archivedStatementCount}</div>
          <div className="insight-stat-detail">
            Each archived invoice keeps a month-end snapshot of its line items.
          </div>
        </article>
        <article className="insight-stat-card" data-tone="success">
          <div className="insight-stat-label">Collected value</div>
          <div className="insight-stat-value">{formatCurrency(paidTotal)}</div>
          <div className="insight-stat-detail">
            Paid totals remain visible without turning the app into accounting
            software.
          </div>
        </article>
        <article className="insight-stat-card" data-tone="neutral">
          <div className="insight-stat-label">Statement-ready months</div>
          <div className="insight-stat-value">{readinessCount}</div>
          <div className="insight-stat-detail">
            Reviewed work is the cleanest path into month-end billing.
          </div>
        </article>
      </section>

      <section className="billing-layout">
        <section className="insight-section-card">
          <div className="insight-section-head">
            <div>
              <div className="eyebrow">Statement candidates</div>
              <h3 className="insight-section-title">Monthly billing queue</h3>
              <p className="insight-section-copy">
                Each client-month grouping becomes an invoice draft after every
                time entry has been reviewed.
              </p>
            </div>
            <div className="insight-section-chip">
              {billingQueue.length} month
              {billingQueue.length === 1 ? "" : "s"}
            </div>
          </div>

          {billingQueue.length === 0 ? (
            <div className="empty-state">
              Statement candidates will appear here as soon as tracked time or
              client expenses exist for a billing month.
            </div>
          ) : (
            <div className="billing-candidate-list">
              {billingQueue.map((candidate) => (
                <article
                  key={candidate.key}
                  className={`billing-candidate-card${
                    resolvedSelection?.kind === "candidate" &&
                    resolvedSelection.id === candidate.key
                      ? " is-active"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    className="billing-candidate-select"
                    onClick={() =>
                      setSelection({
                        id: candidate.key,
                        kind: "candidate",
                      })
                    }
                  >
                    <div className="billing-candidate-main">
                      <div>
                        <div className="list-row-title">
                          {candidate.periodLabel} · {candidate.clientName}
                        </div>
                        <p className="list-meta">
                          {buildCandidateMeta(candidate)}
                        </p>
                      </div>
                      <div
                        className="list-badge"
                        data-tone={
                          candidate.unreviewedCount > 0
                            ? "warning"
                            : candidate.existingInvoiceId
                              ? "accent"
                              : "success"
                        }
                      >
                        {candidate.existingInvoiceId
                          ? "Invoice created"
                          : candidate.unreviewedCount > 0
                            ? `${candidate.unreviewedCount} pending review`
                            : "Ready to invoice"}
                      </div>
                    </div>

                    <div className="billing-candidate-footer">
                      <div className="billing-candidate-detail">
                        {candidate.contactName || candidate.contactEmail
                          ? `${candidate.contactName || "Billing contact"}${
                              candidate.contactEmail
                                ? ` · ${candidate.contactEmail}`
                                : ""
                            }`
                          : "No billing contact stored yet"}
                      </div>
                    </div>
                  </button>

                  {candidate.existingInvoiceId ? (
                    <div className="button-row">
                      <button
                        className="button-secondary"
                        disabled={
                          candidate.unreviewedCount > 0 ||
                          tracker.invoiceRecords.find(
                            (invoice) =>
                              invoice.id === candidate.existingInvoiceId
                          )?.status !== "draft"
                        }
                        type="button"
                        onClick={() => {
                          if (tracker.syncInvoiceRecord(candidate)) {
                            setSelection({
                              id: candidate.existingInvoiceId!,
                              kind: "invoice",
                            });
                          }
                        }}
                      >
                        Update draft from records
                      </button>
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={() =>
                          setSelection({
                            id: candidate.existingInvoiceId!,
                            kind: "invoice",
                          })
                        }
                      >
                        Open invoice
                      </button>
                      <button
                        className="button-danger"
                        type="button"
                        onClick={() => handleDeleteCandidate(candidate)}
                      >
                        Delete queue item
                      </button>
                    </div>
                  ) : (
                    <div className="button-row">
                      <button
                        type="button"
                        className="button-secondary"
                        disabled={
                          candidate.unreviewedCount > 0 || !candidate.clientId
                        }
                        onClick={() => handleCreateInvoice(candidate)}
                      >
                        {!candidate.clientId
                          ? "Assign a client before invoicing"
                          : candidate.unreviewedCount > 0
                            ? "Review time before invoicing"
                            : "Create invoice"}
                      </button>
                      <button
                        className="button-danger"
                        type="button"
                        onClick={() => handleDeleteCandidate(candidate)}
                      >
                        Delete queue item
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="billing-preview-card">
          <div className="insight-section-head">
            <div>
              <div className="eyebrow">
                {selectedInvoice ? "Invoice record" : "Statement preview"}
              </div>
              <h3 className="insight-section-title">
                {preview
                  ? `${preview.clientName} · ${preview.periodLabel}`
                  : "Statement detail"}
              </h3>
              <p className="insight-section-copy">
                The preview stays client-facing: contact details, billing
                instructions, line items, and the month-end total.
              </p>
            </div>
            <div className="insight-section-chip">
              {preview ? preview.statementNumber : "No statement selected"}
            </div>
          </div>

          {!preview ? (
            <div className="empty-state">
              Select a statement candidate or archived invoice to see the full
              billing detail.
            </div>
          ) : (
            <div className="billing-preview-stack">
              <div className="billing-preview-top">
                <div className="billing-preview-summary">
                  <div className="billing-preview-total">
                    {formatCurrency(preview.totalAmount)}
                  </div>
                  <div className="billing-preview-meta">
                    {buildCandidateMeta(preview)}
                  </div>
                </div>
                <div
                  className="insight-breakdown-badge"
                  data-tone={
                    selectedInvoice
                      ? getInvoiceStatusTone(selectedInvoice.status)
                      : preview.unreviewedCount > 0
                        ? "warning"
                        : "success"
                  }
                >
                  {selectedInvoice
                    ? formatInvoiceStatusLabel(selectedInvoice.status)
                    : preview.unreviewedCount > 0
                      ? `${preview.unreviewedCount} pending review`
                      : "Ready"}
                </div>
              </div>

              <div className="billing-preview-grid">
                <article className="billing-preview-panel">
                  <div className="billing-preview-label">Billing contact</div>
                  <strong>{preview.contactName || preview.clientName}</strong>
                  <p className="list-meta">
                    {preview.contactEmail || "No billing email saved"}
                  </p>
                  <p className="list-meta">
                    {preview.clientAddress || "No billing address saved"}
                  </p>
                </article>

                <article className="billing-preview-panel">
                  <div className="billing-preview-label">Instructions</div>
                  <p className="list-meta">
                    {preview.billingInstructions ||
                      "No client-specific billing instructions yet."}
                  </p>
                </article>

                <article className="billing-preview-panel">
                  <div className="billing-preview-label">Statement sender</div>
                  {buildStatementSenderLines(tracker.statementProfile).map(
                    (line) => (
                      <p key={line} className="list-meta">
                        {line}
                      </p>
                    )
                  )}
                </article>

                <article className="billing-preview-panel">
                  <div className="billing-preview-label">Time subtotal</div>
                  <strong>
                    {formatCurrency(previewSubtotals?.timeAmount ?? 0)}
                  </strong>
                  <p className="list-meta">
                    {formatHours(previewSubtotals?.timeMinutes ?? 0)} billed
                    hours
                  </p>
                </article>

                <article className="billing-preview-panel">
                  <div className="billing-preview-label">Expense subtotal</div>
                  <strong>
                    {formatCurrency(previewSubtotals?.expenseAmount ?? 0)}
                  </strong>
                  <p className="list-meta">
                    {previewSubtotals?.expenseCount ?? 0} expense
                    {previewSubtotals?.expenseCount === 1 ? "" : "s"}
                  </p>
                </article>
              </div>

              {selectedInvoice ? (
                <div className="billing-history-controls">
                  <form
                    key={selectedInvoice.id}
                    className="billing-invoice-metadata"
                    onSubmit={(event) =>
                      handleInvoiceMetadataSubmit(event, selectedInvoice)
                    }
                  >
                    <label className="field">
                      <span className="field-label">Invoice number</span>
                      <input
                        className="text-input"
                        defaultValue={selectedInvoice.statementNumber}
                        disabled={selectedInvoice.status !== "draft"}
                        maxLength={40}
                        name="statementNumber"
                        required
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Issue date</span>
                      <input
                        className="text-input"
                        defaultValue={selectedInvoice.issuedOn}
                        disabled={selectedInvoice.status !== "draft"}
                        name="issuedOn"
                        required
                        type="date"
                      />
                    </label>
                    <button
                      className="button-secondary"
                      disabled={selectedInvoice.status !== "draft"}
                      type="submit"
                    >
                      Save invoice details
                    </button>
                  </form>

                  <label className="field">
                    <span className="field-label">Invoice status</span>
                    <select
                      className="text-input"
                      disabled={
                        selectedInvoiceLocked ||
                        selectedInvoice.payments.length > 0
                      }
                      value={selectedInvoice.status}
                      onChange={(event) =>
                        tracker.updateInvoiceStatus(
                          selectedInvoice.id,
                          event.target.value as InvoiceRecord["status"]
                        )
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      {selectedInvoice.status === "partial" ? (
                        <option value="partial">Partially paid</option>
                      ) : null}
                      {selectedInvoice.status === "paid" ? (
                        <option value="paid">Paid</option>
                      ) : null}
                    </select>
                  </label>

                  <div className="billing-reconciliation-readout">
                    <span>Recorded payments</span>
                    <strong>
                      {formatCurrency(getInvoiceAmountPaid(selectedInvoice))}
                    </strong>
                    <small>
                      {formatCurrency(getInvoiceBalance(selectedInvoice))} open
                    </small>
                  </div>

                  <label className="field billing-history-notes">
                    <span className="field-label">Invoice notes</span>
                    <textarea
                      className="text-area"
                      disabled={selectedInvoiceLocked}
                      rows={3}
                      value={selectedInvoice.notes}
                      onChange={(event) =>
                        tracker.updateInvoiceNotes(
                          selectedInvoice.id,
                          event.target.value
                        )
                      }
                    />
                  </label>

                  {selectedInvoiceLocked ? (
                    <div className="billing-lock-note">
                      <span>
                        Paid invoices are locked to preserve the final billing
                        snapshot.
                      </span>
                    </div>
                  ) : null}
                  {selectedInvoice.status === "draft" ? (
                    <button
                      className="button-danger"
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Delete this draft invoice? Source time and expenses will remain."
                          )
                        ) {
                          tracker.deleteInvoice(selectedInvoice.id);
                          setSelection(null);
                        }
                      }}
                    >
                      Delete draft invoice
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="billing-inline-note">
                  Create an invoice record when you want this month-end snapshot
                  stored in local invoice history.
                </div>
              )}

              {selectedInvoice ? (
                <InvoicePayments invoice={selectedInvoice} tracker={tracker} />
              ) : null}

              {selectedInvoice ? (
                <div className="billing-export-stack">
                  {selectedInvoiceIssues.length > 0 ? (
                    <div
                      className="billing-export-status"
                      data-tone="danger"
                      role="status"
                    >
                      <strong>Invoice needs attention before export.</strong>
                      <span>{selectedInvoiceIssues.join(" · ")}</span>
                    </div>
                  ) : (
                    <div
                      className="billing-export-status"
                      data-tone="success"
                      role="status"
                    >
                      Invoice details are complete and ready for PDF export.
                    </div>
                  )}
                  <div className="button-row">
                    <button
                      type="button"
                      className="button-primary"
                      disabled={
                        !desktopExportAvailable ||
                        isExporting ||
                        selectedInvoiceIssues.length > 0
                      }
                      onClick={() => handleExportInvoice(selectedInvoice)}
                    >
                      {desktopExportAvailable
                        ? isExporting
                          ? "Exporting PDF..."
                          : "Export statement PDF"
                        : "Desktop export only"}
                    </button>
                    {selectedInvoice.statementPdfPath ? (
                      <>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() =>
                            handleOpenExportedPdf(
                              selectedInvoice.statementPdfPath!
                            )
                          }
                        >
                          Open PDF
                        </button>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() =>
                            handleRevealExportedPdf(
                              selectedInvoice.statementPdfPath!
                            )
                          }
                        >
                          Reveal in Finder
                        </button>
                      </>
                    ) : null}
                    <button
                      className="button-secondary"
                      disabled={
                        !desktopEmailAvailable ||
                        isSendingEmail ||
                        !selectedInvoice.contactEmail ||
                        selectedInvoiceIssues.length > 0
                      }
                      type="button"
                      onClick={() => handleSendInvoice(selectedInvoice)}
                    >
                      {isSendingEmail
                        ? "Sending invoice..."
                        : "Send invoice by email"}
                    </button>
                  </div>

                  <div className="billing-file-meta">
                    {selectedInvoice.statementPdfPath ? (
                      <>
                        <strong>Saved file:</strong>{" "}
                        {selectedInvoice.statementPdfPath}
                        {selectedInvoice.statementExportedAt
                          ? ` · Exported ${new Date(
                              selectedInvoice.statementExportedAt
                            ).toLocaleString()}`
                          : ""}
                      </>
                    ) : desktopExportAvailable ? (
                      "PDF exports are saved into Documents/Legal Time Tracker/Statements and use your saved statement profile."
                    ) : (
                      "PDF export becomes available in the desktop Tauri app."
                    )}
                  </div>

                  <div className="invoice-delivery-history">
                    <div>
                      <p className="list-row-title">Email delivery activity</p>
                      <p className="list-meta">
                        Accepted means the configured Mail or Outlook account
                        accepted the message. Final inbox delivery requires a
                        provider delivery receipt.
                      </p>
                    </div>
                    {selectedInvoice.deliveries.length === 0 ? (
                      <p className="list-meta">No email attempts recorded.</p>
                    ) : (
                      selectedInvoice.deliveries.map((delivery) => (
                        <div key={delivery.id} className="invoice-delivery-row">
                          <div>
                            <strong>{delivery.recipient}</strong>
                            <p className="list-meta">
                              {new Date(delivery.sentAt).toLocaleString()} ·{" "}
                              {delivery.transport}
                            </p>
                          </div>
                          <span
                            className="list-badge"
                            data-tone={
                              delivery.status === "accepted"
                                ? "success"
                                : "danger"
                            }
                          >
                            {delivery.status === "accepted"
                              ? "Accepted"
                              : "Failed"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {exportState ? (
                    <div
                      className="billing-export-status"
                      data-tone={exportState.tone}
                    >
                      {exportState.message}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {selectedInvoice ? (
                <div className="billing-expense-grid">
                  <section className="insight-section-card">
                    <div className="insight-section-head">
                      <div>
                        <div className="eyebrow">Attached expenses</div>
                        <h3 className="insight-section-title">
                          Included on this invoice
                        </h3>
                      </div>
                      <div className="insight-section-chip">
                        {attachedExpenseItems.length} expense
                        {attachedExpenseItems.length === 1 ? "" : "s"}
                      </div>
                    </div>

                    {attachedExpenseItems.length === 0 ? (
                      <div className="empty-state">
                        No reimbursable client expenses are attached to this
                        invoice yet.
                      </div>
                    ) : (
                      <div className="billing-expense-list">
                        {attachedExpenseItems.map((lineItem) => (
                          <article
                            key={`${selectedInvoice.id}-${lineItem.entryId}`}
                            className="billing-expense-card"
                          >
                            <div>
                              <p className="list-row-title">
                                {lineItem.narrative}
                              </p>
                              <p className="list-meta">
                                {buildLineItemDetail(lineItem)}
                              </p>
                            </div>
                            <div className="billing-expense-actions">
                              <strong>{formatCurrency(lineItem.amount)}</strong>
                              <button
                                type="button"
                                className="button-secondary"
                                disabled={selectedInvoice.status !== "draft"}
                                onClick={() =>
                                  tracker.detachExpenseFromInvoice(
                                    selectedInvoice.id,
                                    lineItem.entryId
                                  )
                                }
                              >
                                {selectedInvoice.status !== "draft"
                                  ? "Reopen draft to edit"
                                  : "Detach expense"}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="insight-section-card">
                    <div className="insight-section-head">
                      <div>
                        <div className="eyebrow">Available expenses</div>
                        <h3 className="insight-section-title">
                          Attach late client costs
                        </h3>
                      </div>
                      <div className="insight-section-chip">
                        {availableInvoiceExpenses.length} available
                      </div>
                    </div>

                    {availableInvoiceExpenses.length === 0 ? (
                      <div className="empty-state">
                        No additional client expenses are waiting to be attached
                        for this client-month.
                      </div>
                    ) : (
                      <div className="billing-expense-list">
                        {availableInvoiceExpenses.map((expense) => (
                          <article
                            key={expense.id}
                            className="billing-expense-card"
                          >
                            <div>
                              <p className="list-row-title">
                                {expense.summary}
                              </p>
                              <p className="list-meta">
                                {expense.expenseDate} ·{" "}
                                {[
                                  expense.matterName,
                                  expense.category,
                                  expense.payee,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                            <div className="billing-expense-actions">
                              <strong>{formatCurrency(expense.amount)}</strong>
                              <button
                                type="button"
                                className="button-secondary"
                                disabled={selectedInvoice.status !== "draft"}
                                onClick={() =>
                                  tracker.attachExpenseToInvoice(
                                    selectedInvoice.id,
                                    expense.id
                                  )
                                }
                              >
                                {selectedInvoice.status !== "draft"
                                  ? "Reopen draft to edit"
                                  : "Attach expense"}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              ) : null}

              <div className="dashboard-two-up">
                <section className="insight-section-card">
                  <div className="insight-section-head">
                    <div>
                      <div className="eyebrow">Matter allocation</div>
                      <h3 className="insight-section-title">
                        Statement summary
                      </h3>
                    </div>
                    <div className="insight-section-chip">
                      {preview.matterSummaries.length} matter
                      {preview.matterSummaries.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <ul className="insight-breakdown-list">
                    {preview.matterSummaries.map((matter) => (
                      <li
                        key={`${matter.matterId ?? "none"}-${matter.matterName}`}
                        className="insight-breakdown-row"
                      >
                        <div className="insight-breakdown-hours">
                          {formatHours(matter.totalBilledMinutes)}
                          <span>hrs</span>
                        </div>
                        <div className="insight-breakdown-main">
                          <p className="insight-breakdown-title">
                            {matter.matterName}
                          </p>
                          <p className="list-meta">
                            {matter.entryCount} item
                            {matter.entryCount === 1 ? "" : "s"} ·{" "}
                            {formatCurrency(matter.amount)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="insight-section-card">
                  <div className="insight-section-head">
                    <div>
                      <div className="eyebrow">Client-facing detail</div>
                      <h3 className="insight-section-title">
                        Statement line items
                      </h3>
                    </div>
                    <div className="insight-section-chip">
                      {preview.periodLabel}
                    </div>
                  </div>

                  <div className="billing-line-items">
                    {preview.lineItems.map((lineItem) => (
                      <article
                        key={`${lineItem.entryId}-${lineItem.workDate}`}
                        className="billing-line-item"
                      >
                        <div className="billing-line-item-top">
                          <div>
                            <p className="list-row-title">
                              {lineItem.narrative}
                            </p>
                            <p className="list-meta">
                              {buildLineItemDetail(lineItem)}
                            </p>
                          </div>
                          <div className="billing-line-item-values">
                            <strong>
                              {lineItem.kind === "expense"
                                ? "Expense"
                                : `${formatHours(lineItem.billedMinutes)} hrs`}
                            </strong>
                            <span>{formatCurrency(lineItem.amount)}</span>
                            {selectedCandidate && lineItem.kind === "time" ? (
                              <div className="button-row">
                                <button
                                  className="button-secondary"
                                  type="button"
                                  onClick={() =>
                                    tracker.toggleEntryReviewed(
                                      lineItem.entryId
                                    )
                                  }
                                >
                                  {tracker.entries.find(
                                    (entry) => entry.id === lineItem.entryId
                                  )?.reviewedAt
                                    ? "Mark unreviewed"
                                    : "Mark reviewed"}
                                </button>
                                <button
                                  className="button-secondary"
                                  type="button"
                                  onClick={() =>
                                    setEditingEntryId(lineItem.entryId)
                                  }
                                >
                                  Edit time
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}
        </section>
      </section>

      <section className="insight-section-card">
        <div className="insight-section-head">
          <div>
            <div className="eyebrow">Invoice history</div>
            <h3 className="insight-section-title">Monthly invoices</h3>
            <p className="insight-section-copy">
              Stored invoice records keep payment status and a durable snapshot
              of what was billed that month.
            </p>
          </div>
          <div className="insight-section-chip">
            {tracker.invoiceRecords.length} invoice
            {tracker.invoiceRecords.length === 1 ? "" : "s"}
          </div>
        </div>

        {tracker.invoiceRecords.length === 0 ? (
          <div className="empty-state">
            Create an invoice from a reviewed billing month to start invoice
            history.
          </div>
        ) : (
          <div className="billing-history-list">
            {tracker.invoiceRecords.map((invoice) => (
              <button
                key={invoice.id}
                type="button"
                className={`billing-history-row${
                  resolvedSelection?.kind === "invoice" &&
                  resolvedSelection.id === invoice.id
                    ? " is-active"
                    : ""
                }`}
                onClick={() =>
                  setSelection({
                    id: invoice.id,
                    kind: "invoice",
                  })
                }
              >
                <div className="billing-history-main">
                  <p className="list-row-title">
                    {invoice.periodLabel} · {invoice.clientName}
                  </p>
                  <p className="list-meta">
                    {invoice.statementNumber} ·{" "}
                    {buildCandidateMeta(buildPreviewFromInvoice(invoice))}
                  </p>
                </div>
                <div className="billing-history-side">
                  <div
                    className="list-badge"
                    data-tone={getInvoiceStatusTone(invoice.status)}
                  >
                    {formatInvoiceStatusLabel(invoice.status)}
                  </div>
                  <p className="list-meta">
                    {invoice.status === "paid" && invoice.paidOn
                      ? `Paid ${invoice.paidOn}`
                      : `Issued ${invoice.issuedOn}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {pendingDeleteCandidate ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setPendingDeleteCandidate(null)}
        >
          <section
            aria-labelledby="delete-queue-item-title"
            aria-modal="true"
            className="record-modal billing-delete-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="records-section-head">
              <div>
                <div className="eyebrow">Billing queue</div>
                <h3
                  className="records-section-title"
                  id="delete-queue-item-title"
                >
                  Delete queue item?
                </h3>
              </div>
            </div>

            <p className="panel-copy">
              This permanently deletes{" "}
              {buildDeleteSourceSummary(pendingDeleteCandidate)} for{" "}
              {pendingDeleteCandidate.clientName} in{" "}
              {pendingDeleteCandidate.periodLabel}.
              {pendingDeleteCandidate.existingInvoiceId
                ? " Its draft invoice will also be deleted."
                : ""}{" "}
              This cannot be undone.
            </p>

            <div className="button-row">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setPendingDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button
                className="button-danger"
                type="button"
                onClick={handleConfirmDeleteCandidate}
              >
                Delete permanently
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {editingEntry ? (
        <TimeEntryDialog
          entry={editingEntry}
          onClose={() => setEditingEntryId(null)}
          tracker={tracker}
        />
      ) : null}
    </div>
  );
}

function getInvoiceReadinessIssues(
  invoice: InvoiceRecord,
  profile: StatementProfile
) {
  const issues: string[] = [];
  if (!invoice.statementNumber.trim()) issues.push("Add an invoice number");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoice.issuedOn)) {
    issues.push("Add a valid issue date");
  }
  if (!invoice.clientName.trim()) issues.push("Add the client name");
  if (!invoice.clientAddress.trim()) {
    issues.push("Add the client's billing address and refresh the draft");
  }
  if (invoice.lineItems.length === 0) issues.push("Add at least one line item");
  if (invoice.totalAmount <= 0) issues.push("Invoice total must be positive");
  if (!profile.firmName.trim())
    issues.push("Complete the firm name in Settings");
  if (!profile.senderPhone.trim()) {
    issues.push("Complete the firm phone in Settings");
  }
  if (!profile.senderAddress.trim()) {
    issues.push("Complete the firm address in Settings");
  }
  return issues;
}

function buildDeleteSourceSummary(candidate: BillingCandidate) {
  const timeCount = candidate.lineItems.filter(
    (lineItem) => lineItem.kind === "time"
  ).length;
  const expenseCount = candidate.lineItems.filter(
    (lineItem) => lineItem.kind === "expense"
  ).length;

  return [
    timeCount
      ? `${timeCount} time ${timeCount === 1 ? "entry" : "entries"}`
      : "",
    expenseCount
      ? `${expenseCount} client ${expenseCount === 1 ? "expense" : "expenses"}`
      : "",
  ]
    .filter(Boolean)
    .join(" and ");
}

function buildPreviewFromInvoice(invoice: InvoiceRecord): BillingCandidate {
  return {
    billingInstructions: invoice.billingInstructions,
    clientAddress: invoice.clientAddress,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    contactEmail: invoice.contactEmail,
    contactName: invoice.contactName,
    existingInvoiceId: invoice.id,
    key: invoice.id,
    lineItems: invoice.lineItems,
    matterSummaries: invoice.matterSummaries,
    periodKey: invoice.periodKey,
    periodLabel: invoice.periodLabel,
    reviewedCount: invoice.reviewedCount,
    statementNumber: invoice.statementNumber,
    totalAmount: invoice.totalAmount,
    totalBilledMinutes: invoice.totalBilledMinutes,
    unreviewedCount: invoice.unreviewedCount,
  };
}

function buildStatementSenderLines(
  statementProfile: UseTimeTrackerResult["statementProfile"]
) {
  const lines = [
    statementProfile.firmName,
    statementProfile.senderName,
    statementProfile.senderTitle,
    statementProfile.senderEmail,
    statementProfile.senderPhone,
    ...statementProfile.senderAddress
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  ].filter(Boolean);

  return lines.length > 0 ? lines : ["No statement sender details saved yet."];
}

function resolveSelection(
  selection: BillingSelection | null,
  candidates: BillingCandidate[],
  invoices: InvoiceRecord[]
): BillingSelection | null {
  if (
    selection?.kind === "candidate" &&
    candidates.some((candidate) => candidate.key === selection.id)
  ) {
    return selection;
  }

  if (
    selection?.kind === "invoice" &&
    invoices.some((invoice) => invoice.id === selection.id)
  ) {
    return selection;
  }

  if (candidates[0]) {
    return {
      id: candidates[0].key,
      kind: "candidate",
    };
  }

  if (invoices[0]) {
    return {
      id: invoices[0].id,
      kind: "invoice",
    };
  }

  return null;
}

function buildCandidateMeta(candidate: BillingCandidate) {
  const timeLineItemCount = candidate.lineItems.filter(
    (lineItem) => lineItem.kind === "time"
  ).length;
  const expenseLineItemCount = candidate.lineItems.filter(
    (lineItem) => lineItem.kind === "expense"
  ).length;
  const parts = [
    `${formatHours(candidate.totalBilledMinutes)} hours`,
    formatCurrency(candidate.totalAmount),
  ];

  if (timeLineItemCount > 0) {
    parts.push(
      `${timeLineItemCount} time item${timeLineItemCount === 1 ? "" : "s"}`
    );
  }

  if (expenseLineItemCount > 0) {
    parts.push(
      `${expenseLineItemCount} expense${expenseLineItemCount === 1 ? "" : "s"}`
    );
  }

  return parts.join(" · ");
}

function buildLineItemDetail(lineItem: BillingCandidate["lineItems"][number]) {
  if (lineItem.kind === "expense") {
    const expenseDetail = [lineItem.category, lineItem.payee]
      .filter(Boolean)
      .join(" · ");
    return `${lineItem.workDate} · ${lineItem.matterName} · Expense${
      expenseDetail ? ` · ${expenseDetail}` : ""
    }`;
  }

  return `${lineItem.workDate} · ${lineItem.matterName}${
    lineItem.taskCategory ? ` · ${lineItem.taskCategory}` : ""
  }`;
}

function summarizeBillingLineItems(lineItems: InvoiceLineItem[]) {
  return lineItems.reduce(
    (summary, lineItem) => {
      if (lineItem.kind === "expense") {
        summary.expenseAmount += lineItem.amount;
        summary.expenseCount += 1;
      } else {
        summary.timeAmount += lineItem.amount;
        summary.timeMinutes += lineItem.billedMinutes;
      }

      return summary;
    },
    {
      expenseAmount: 0,
      expenseCount: 0,
      timeAmount: 0,
      timeMinutes: 0,
    }
  );
}

function matchesInvoiceClient(
  invoice: InvoiceRecord,
  expense: UseTimeTrackerResult["expenseRecords"][number]
) {
  return (
    (invoice.clientId && expense.clientId === invoice.clientId) ||
    (!invoice.clientId && expense.clientName === invoice.clientName)
  );
}
