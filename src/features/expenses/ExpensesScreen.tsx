import { useState } from "react";

import type {
  ExpenseKind,
  ExpenseRecord,
  ExpenseRecordInput,
  ExpenseStatus,
} from "@/features/time/types";
import type { UseTimeTrackerResult } from "@/features/time/useTimeTracker";
import { formatCurrency } from "@/features/time/utils";
import { MetricCard } from "@/shared/ui/MetricCard";
import { PageHeader } from "@/shared/ui/PageHeader";

type ExpensesScreenProps = {
  tracker: UseTimeTrackerResult;
};

const CLIENT_EXPENSE_STATUS_OPTIONS: ExpenseStatus[] = [
  "pending",
  "submitted",
  "reimbursed",
];

const TAX_CATEGORY_OPTIONS = [
  "Advertising",
  "Contract labor",
  "Insurance",
  "Legal and professional",
  "Office expense",
  "Rent or lease",
  "Software and subscriptions",
  "Supplies",
  "Taxes and licenses",
  "Travel",
  "Utilities",
  "Other",
] as const;

export function ExpensesScreen({ tracker }: ExpensesScreenProps) {
  const defaultClientId =
    tracker.clientRecords.find((client) => client.status === "active")?.id ??
    tracker.clientRecords[0]?.id ??
    "";
  const [selectedExpenseId, setSelectedExpenseId] = useState(
    tracker.expenseRecords[0]?.id ?? ""
  );
  const [newExpenseKind, setNewExpenseKind] = useState<ExpenseKind>("client");
  const [newExpenseClientId, setNewExpenseClientId] = useState(defaultClientId);
  const [createFormVersion, setCreateFormVersion] = useState(0);
  const currentTaxYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentTaxYear);
  const [expenseExportMessage, setExpenseExportMessage] = useState<
    string | null
  >(null);
  const [isExportingExpenses, setIsExportingExpenses] = useState(false);

  const resolvedSelectedExpenseId = tracker.expenseRecords.some(
    (expense) => expense.id === selectedExpenseId
  )
    ? selectedExpenseId
    : (tracker.expenseRecords[0]?.id ?? "");
  const selectedExpense =
    tracker.expenseRecords.find(
      (expense) => expense.id === resolvedSelectedExpenseId
    ) ??
    tracker.expenseRecords[0] ??
    null;
  const linkedInvoiceByExpenseId = buildLinkedInvoiceByExpenseId(tracker);
  const selectedExpenseInvoice = selectedExpense
    ? (linkedInvoiceByExpenseId.get(selectedExpense.id) ?? null)
    : null;
  const createFormMatters =
    newExpenseKind === "client"
      ? tracker.getMattersForClient(newExpenseClientId || null)
      : [];
  const reimbursedExpenseCount = tracker.clientExpenseRecords.filter(
    (expense) => expense.status === "reimbursed"
  ).length;
  const availableTaxYears = [
    ...new Set([
      currentTaxYear,
      ...tracker.expenseRecords.map((expense) =>
        Number(expense.expenseDate.slice(0, 4))
      ),
    ]),
  ]
    .filter(Number.isFinite)
    .sort((left, right) => right - left);
  const deductibleExpenses = tracker.expenseRecords.filter(
    (expense) =>
      expense.taxDeductible && expense.expenseDate.startsWith(`${taxYear}-`)
  );
  const deductibleTotal = deductibleExpenses.reduce(
    (total, expense) => total + expense.amount,
    0
  );
  const taxCategoryTotals = buildTaxCategoryTotals(deductibleExpenses);

  function handleAddExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const expenseId = tracker.addExpense(
      buildExpenseInput(formData, newExpenseKind, tracker, newExpenseClientId)
    );

    setSelectedExpenseId(expenseId);
    setCreateFormVersion((current) => current + 1);
    setNewExpenseKind("client");
    setNewExpenseClientId(defaultClientId);
  }

  async function handleExportExpenses() {
    setIsExportingExpenses(true);
    setExpenseExportMessage(null);
    try {
      const path = await tracker.exportExpensesCsv(taxYear);
      setExpenseExportMessage(
        path
          ? `Tax-year CSV exported and opened: ${path}`
          : "Expense export is available in the desktop app."
      );
    } finally {
      setIsExportingExpenses(false);
    }
  }

  return (
    <div className="screen-grid">
      <PageHeader
        eyebrow="Expense tracking"
        title="Expenses"
        description="Client costs and business overhead now live in one simple monthly workspace, with client expenses now feeding directly into monthly billing statements."
      />

      <section className="metrics-grid">
        <MetricCard
          label="Client expenses this month"
          value={formatCurrency(tracker.currentMonthClientExpenseTotal)}
          detail="Reimbursable costs stay visible without blending into time entries."
        />
        <MetricCard
          label="Business expenses this month"
          value={formatCurrency(tracker.currentMonthBusinessExpenseTotal)}
          detail="Operational spend remains in its own lane."
          tone="warning"
        />
        <MetricCard
          label="Outstanding client costs"
          value={formatCurrency(tracker.outstandingClientExpenseTotal)}
          detail="Anything not yet marked reimbursed stays on the radar."
          tone="accent"
        />
        <MetricCard
          label="Reimbursed records"
          value={`${reimbursedExpenseCount}`}
          detail="A simple count for what has already cleared."
          tone="success"
        />
      </section>

      <section className="records-detail-card expense-tax-card">
        <div className="records-section-head">
          <div>
            <div className="eyebrow">Tax reporting</div>
            <h3 className="records-section-title">
              Deductible expense summary
            </h3>
            <p className="records-section-copy">
              Review marked deductions by tax category and export a complete CSV
              with receipt paths for your accountant.
            </p>
          </div>
          <div className="expense-tax-controls">
            <select
              aria-label="Tax year"
              className="text-input"
              value={taxYear}
              onChange={(event) => setTaxYear(Number(event.target.value))}
            >
              {availableTaxYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button
              className="button-primary"
              disabled={isExportingExpenses}
              type="button"
              onClick={handleExportExpenses}
            >
              {isExportingExpenses ? "Exporting..." : "Export tax CSV"}
            </button>
          </div>
        </div>
        <div className="expense-tax-summary">
          <div className="expense-tax-total">
            <span>Marked deductible</span>
            <strong>{formatCurrency(deductibleTotal)}</strong>
            <small>{deductibleExpenses.length} expense records</small>
          </div>
          <div className="expense-tax-category-list">
            {taxCategoryTotals.length === 0 ? (
              <p className="list-meta">
                No expenses are marked tax deductible for {taxYear}.
              </p>
            ) : (
              taxCategoryTotals.map(([category, amount]) => (
                <div key={category} className="expense-tax-category-row">
                  <span>{category}</span>
                  <strong>{formatCurrency(amount)}</strong>
                </div>
              ))
            )}
          </div>
        </div>
        {expenseExportMessage ? (
          <div className="billing-export-status" role="status">
            {expenseExportMessage}
          </div>
        ) : null}
      </section>

      <section className="records-detail-card">
        <div className="records-section-head">
          <div>
            <div className="eyebrow">New expense</div>
            <h3 className="records-section-title">Capture spend quickly</h3>
            <p className="records-section-copy">
              Use client expenses for reimbursable costs and business expenses
              for internal overhead. Client expenses now flow into month-end
              billing while business costs stay internal.
            </p>
          </div>
          <div className="records-section-chip">
            Client expenses join billing
          </div>
        </div>

        <form
          key={createFormVersion}
          className="composer-form"
          onSubmit={handleAddExpense}
        >
          <div className="field-grid">
            <label className="field">
              <span className="field-label">Expense lane</span>
              <select
                className="text-input"
                name="kind"
                value={newExpenseKind}
                onChange={(event) =>
                  setNewExpenseKind(event.target.value as ExpenseKind)
                }
              >
                <option value="client">Client expense</option>
                <option value="business">Business expense</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Expense date</span>
              <input
                className="text-input"
                defaultValue={getTodayDateKey()}
                name="expenseDate"
                required
                type="date"
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span className="field-label">Tax category</span>
              <select className="text-input" defaultValue="" name="taxCategory">
                <option value="">Not categorized</option>
                {TAX_CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-field">
              <input name="taxDeductible" type="checkbox" />
              <span>
                <strong>Tax deductible</strong>
                <small>Include this record in the yearly tax summary.</small>
              </span>
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span className="field-label">Summary</span>
              <input
                className="text-input"
                name="summary"
                placeholder="Court filing fee"
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Amount</span>
              <input
                className="text-input"
                inputMode="decimal"
                min="0"
                name="amount"
                placeholder="0.00"
                required
                step="0.01"
                type="number"
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span className="field-label">Payee or vendor</span>
              <input
                className="text-input"
                name="payee"
                placeholder="County clerk"
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Category</span>
              <input
                className="text-input"
                name="category"
                placeholder={
                  newExpenseKind === "client" ? "Filing" : "Software"
                }
                required
              />
            </label>
          </div>

          {newExpenseKind === "client" ? (
            <div className="field-grid">
              <label className="field">
                <span className="field-label">Client</span>
                <select
                  className="text-input"
                  name="clientId"
                  required
                  value={newExpenseClientId}
                  onChange={(event) =>
                    setNewExpenseClientId(event.target.value)
                  }
                >
                  {tracker.activeClientRecords.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Matter</span>
                <select className="text-input" defaultValue="" name="matterId">
                  <option value="">Unassigned matter</option>
                  {createFormMatters.map((matter) => (
                    <option key={matter.id} value={matter.id}>
                      {matter.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <div className="field-grid">
            <label className="field">
              <span className="field-label">Status</span>
              <select
                key={newExpenseKind}
                className="text-input"
                defaultValue={
                  newExpenseKind === "client" ? "pending" : "internal"
                }
                name="status"
              >
                {buildStatusOptions(newExpenseKind).map((status) => (
                  <option key={status} value={status}>
                    {formatExpenseStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span className="field-label">Notes</span>
            <textarea
              className="text-area"
              name="notes"
              placeholder="Anything you want to remember for month-end review."
              rows={3}
            />
          </label>

          <div className="button-row">
            <button className="button-primary" type="submit">
              Save expense
            </button>
          </div>
        </form>
      </section>

      <section className="records-layout">
        <aside className="records-directory-card">
          <div className="records-section-head">
            <div>
              <div className="eyebrow">Expense log</div>
              <h3 className="records-section-title">Recent records</h3>
              <p className="records-section-copy">
                Client and business expenses stay in one list, with a clear lane
                badge on every record.
              </p>
            </div>
            <div className="records-section-chip">
              {tracker.expenseRecords.length} record
              {tracker.expenseRecords.length === 1 ? "" : "s"}
            </div>
          </div>

          {tracker.expenseRecords.length === 0 ? (
            <div className="empty-state">
              No expenses yet. Add your first reimbursable or business cost
              above.
            </div>
          ) : (
            <div className="records-directory-list">
              {tracker.expenseRecords.map((expense) => {
                const linkedInvoice =
                  linkedInvoiceByExpenseId.get(expense.id) ?? null;

                return (
                  <button
                    key={expense.id}
                    type="button"
                    className={`records-directory-item${
                      expense.id === selectedExpense?.id ? " is-active" : ""
                    }`}
                    onClick={() => setSelectedExpenseId(expense.id)}
                  >
                    <span className="records-directory-name">
                      {expense.summary}
                    </span>
                    <span className="records-directory-meta">
                      {expense.expenseDate} · {expense.payee}
                    </span>
                    {linkedInvoice ? (
                      <span className="expense-linked-meta">
                        Attached to {linkedInvoice.statementNumber} ·{" "}
                        {formatInvoiceStatusLabel(linkedInvoice.status)}
                      </span>
                    ) : null}
                    {expense.receiptPath ? (
                      <span className="expense-linked-meta">
                        Receipt attached
                      </span>
                    ) : null}
                    <div className="expense-directory-footer">
                      <span
                        className="list-badge"
                        data-tone={
                          expense.kind === "client" ? "accent" : "warning"
                        }
                      >
                        {expense.kind === "client"
                          ? "Client expense"
                          : "Business expense"}
                      </span>
                      <strong className="expense-directory-amount">
                        {formatCurrency(expense.amount)}
                      </strong>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <div className="records-main-column">
          {selectedExpense ? (
            <ExpenseDetailForm
              key={selectedExpense.id}
              expense={selectedExpense}
              linkedInvoice={selectedExpenseInvoice}
              tracker={tracker}
            />
          ) : (
            <section className="records-detail-card">
              <div className="empty-state">
                Select an expense from the list to edit it.
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

type ExpenseDetailFormProps = {
  expense: ExpenseRecord;
  linkedInvoice: UseTimeTrackerResult["invoiceRecords"][number] | null;
  tracker: UseTimeTrackerResult;
};

function ExpenseDetailForm({
  expense,
  linkedInvoice,
  tracker,
}: ExpenseDetailFormProps) {
  const [expenseKind, setExpenseKind] = useState<ExpenseKind>(expense.kind);
  const [expenseClientId, setExpenseClientId] = useState(
    expense.clientId ?? ""
  );
  const expenseMatters =
    expenseKind === "client"
      ? tracker.getMattersForClient(expenseClientId || null)
      : [];
  const expenseLocked = tracker.isExpenseLocked(expense.id);
  const [receiptMessage, setReceiptMessage] = useState<string | null>(null);
  const [isUpdatingReceipt, setIsUpdatingReceipt] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (expenseLocked) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    tracker.updateExpense({
      ...expense,
      ...buildExpenseInput(formData, expenseKind, tracker, expenseClientId),
      createdAt: expense.createdAt,
      id: expense.id,
      receiptPath: expense.receiptPath,
    });
  }

  async function handleAttachReceipt() {
    setIsUpdatingReceipt(true);
    setReceiptMessage(null);
    try {
      const attached = await tracker.attachExpenseReceipt(expense.id);
      setReceiptMessage(
        attached ? "Receipt attached." : "No receipt was attached."
      );
    } finally {
      setIsUpdatingReceipt(false);
    }
  }

  async function handleRemoveReceipt() {
    setIsUpdatingReceipt(true);
    setReceiptMessage(null);
    try {
      const removed = await tracker.removeExpenseReceipt(expense.id);
      setReceiptMessage(
        removed ? "Receipt removed." : "The receipt could not be removed."
      );
    } finally {
      setIsUpdatingReceipt(false);
    }
  }

  return (
    <section className="records-detail-card">
      <div className="records-section-head">
        <div>
          <div className="eyebrow">Selected expense</div>
          <h3 className="records-section-title">{expense.summary}</h3>
          <p className="records-section-copy">
            Update the amount, lane, reimbursement state, and notes as the month
            moves forward.
          </p>
        </div>
        <div className="records-section-chip">
          {formatExpenseStatusLabel(expense.status)}
        </div>
      </div>

      {linkedInvoice ? (
        <div className="expense-link-note">
          Attached to {linkedInvoice.statementNumber} for{" "}
          {linkedInvoice.periodLabel} ·{" "}
          {formatInvoiceStatusLabel(linkedInvoice.status)}
          {expenseLocked
            ? " · Detach it from the invoice before editing or deleting the source record."
            : " · Update the invoice if this expense should move in or out of billing."}
        </div>
      ) : expense.kind === "client" ? (
        <div className="expense-link-note">
          This client expense is not attached to an invoice yet.
        </div>
      ) : null}

      <div className="expense-receipt-card">
        <div>
          <div className="eyebrow">Receipt</div>
          <p className="list-row-title">
            {expense.receiptPath
              ? "Receipt stored locally"
              : "No receipt attached"}
          </p>
          <p className="settings-backup-path">
            {expense.receiptPath ??
              "Attach a PDF or image up to 25 MB. A managed copy will be kept with app data."}
          </p>
        </div>
        <div className="button-row">
          {expense.receiptPath ? (
            <button
              className="button-secondary"
              type="button"
              onClick={() => tracker.openExpenseReceipt(expense.id)}
            >
              Open receipt
            </button>
          ) : null}
          <button
            className="button-secondary"
            disabled={expenseLocked || isUpdatingReceipt}
            type="button"
            onClick={handleAttachReceipt}
          >
            {isUpdatingReceipt
              ? "Updating..."
              : expense.receiptPath
                ? "Replace receipt"
                : "Attach receipt"}
          </button>
          {expense.receiptPath ? (
            <button
              className="button-danger"
              disabled={expenseLocked || isUpdatingReceipt}
              type="button"
              onClick={handleRemoveReceipt}
            >
              Remove receipt
            </button>
          ) : null}
        </div>
        {receiptMessage ? (
          <p className="list-meta" role="status">
            {receiptMessage}
          </p>
        ) : null}
      </div>

      <form className="composer-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label className="field">
            <span className="field-label">Expense lane</span>
            <select
              className="text-input"
              defaultValue={expense.kind}
              disabled={expenseLocked}
              name="kind"
              onChange={(event) =>
                setExpenseKind(event.target.value as ExpenseKind)
              }
            >
              <option value="client">Client expense</option>
              <option value="business">Business expense</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Expense date</span>
            <input
              className="text-input"
              defaultValue={expense.expenseDate}
              disabled={expenseLocked}
              name="expenseDate"
              required
              type="date"
            />
          </label>
        </div>

        <div className="field-grid">
          <label className="field">
            <span className="field-label">Tax category</span>
            <select
              className="text-input"
              defaultValue={expense.taxCategory}
              disabled={expenseLocked}
              name="taxCategory"
            >
              <option value="">Not categorized</option>
              {TAX_CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-field">
            <input
              defaultChecked={expense.taxDeductible}
              disabled={expenseLocked}
              name="taxDeductible"
              type="checkbox"
            />
            <span>
              <strong>Tax deductible</strong>
              <small>Include this record in the yearly tax summary.</small>
            </span>
          </label>
        </div>

        <div className="field-grid">
          <label className="field">
            <span className="field-label">Summary</span>
            <input
              className="text-input"
              defaultValue={expense.summary}
              disabled={expenseLocked}
              name="summary"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Amount</span>
            <input
              className="text-input"
              defaultValue={expense.amount}
              disabled={expenseLocked}
              min="0"
              name="amount"
              required
              step="0.01"
              type="number"
            />
          </label>
        </div>

        <div className="field-grid">
          <label className="field">
            <span className="field-label">Payee or vendor</span>
            <input
              className="text-input"
              defaultValue={expense.payee}
              disabled={expenseLocked}
              name="payee"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Category</span>
            <input
              className="text-input"
              defaultValue={expense.category}
              disabled={expenseLocked}
              name="category"
              required
            />
          </label>
        </div>

        {expenseKind === "client" ? (
          <div className="field-grid">
            <label className="field">
              <span className="field-label">Client</span>
              <select
                className="text-input"
                defaultValue={expense.clientId ?? ""}
                disabled={expenseLocked}
                name="clientId"
                required
                onChange={(event) => setExpenseClientId(event.target.value)}
              >
                {tracker.clientRecords
                  .filter(
                    (client) =>
                      client.status === "active" ||
                      client.id === expense.clientId
                  )
                  .map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Matter</span>
              <select
                className="text-input"
                defaultValue={expense.matterId ?? ""}
                disabled={expenseLocked}
                name="matterId"
              >
                <option value="">Unassigned matter</option>
                {expenseMatters.map((matter) => (
                  <option key={matter.id} value={matter.id}>
                    {matter.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <div className="field-grid">
          <label className="field">
            <span className="field-label">Status</span>
            <select
              key={expenseKind}
              className="text-input"
              defaultValue={expense.status}
              disabled={expenseLocked}
              name="status"
            >
              {buildStatusOptions(expenseKind).map((status) => (
                <option key={status} value={status}>
                  {formatExpenseStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field-label">Notes</span>
          <textarea
            className="text-area"
            defaultValue={expense.notes}
            disabled={expenseLocked}
            name="notes"
            rows={4}
          />
        </label>

        <div className="button-row">
          <button
            className="button-primary"
            disabled={expenseLocked}
            type="submit"
          >
            {expenseLocked ? "Paid invoice locked" : "Save expense changes"}
          </button>
          <button
            className="button-danger"
            disabled={expenseLocked}
            type="button"
            onClick={() => {
              if (
                window.confirm("Delete this expense? This cannot be undone.")
              ) {
                tracker.deleteExpense(expense.id);
              }
            }}
          >
            Delete expense
          </button>
        </div>
      </form>
    </section>
  );
}

function buildExpenseInput(
  formData: FormData,
  kind: ExpenseKind,
  tracker: UseTimeTrackerResult,
  selectedClientId: string
): ExpenseRecordInput {
  const resolvedClientId =
    kind === "client"
      ? selectedClientId || `${formData.get("clientId") ?? ""}`
      : "";
  const resolvedMatterId =
    kind === "client" ? `${formData.get("matterId") ?? ""}`.trim() : "";

  return {
    amount: Number(formData.get("amount") ?? 0),
    category: `${formData.get("category") ?? ""}`.trim(),
    clientId: kind === "client" ? resolvedClientId || null : null,
    clientName:
      kind === "client" ? tracker.getClientLabel(resolvedClientId || null) : "",
    expenseDate: `${formData.get("expenseDate") ?? ""}`.trim(),
    kind,
    matterId: kind === "client" ? resolvedMatterId || null : null,
    matterName:
      kind === "client" ? tracker.getMatterLabel(resolvedMatterId || null) : "",
    notes: `${formData.get("notes") ?? ""}`.trim(),
    payee: `${formData.get("payee") ?? ""}`.trim(),
    receiptPath: null,
    status:
      kind === "client"
        ? (`${formData.get("status") ?? "pending"}` as ExpenseStatus)
        : "internal",
    summary: `${formData.get("summary") ?? ""}`.trim(),
    taxCategory: `${formData.get("taxCategory") ?? ""}`.trim(),
    taxDeductible: formData.get("taxDeductible") === "on",
  };
}

function buildTaxCategoryTotals(expenses: ExpenseRecord[]) {
  const totals = new Map<string, number>();
  expenses.forEach((expense) => {
    const category = expense.taxCategory.trim() || "Uncategorized";
    totals.set(category, (totals.get(category) ?? 0) + expense.amount);
  });
  return [...totals.entries()].sort((left, right) => right[1] - left[1]);
}

function buildStatusOptions(kind: ExpenseKind) {
  return kind === "client"
    ? CLIENT_EXPENSE_STATUS_OPTIONS
    : (["internal"] as const);
}

function formatExpenseStatusLabel(status: ExpenseStatus) {
  switch (status) {
    case "internal":
      return "Tracked internally";
    case "pending":
      return "Pending";
    case "submitted":
      return "Submitted";
    case "reimbursed":
      return "Reimbursed";
  }
}

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildLinkedInvoiceByExpenseId(tracker: UseTimeTrackerResult) {
  const linkedInvoiceByExpenseId = new Map<
    string,
    UseTimeTrackerResult["invoiceRecords"][number]
  >();

  tracker.invoiceRecords.forEach((invoice) => {
    invoice.lineItems.forEach((lineItem) => {
      if (lineItem.kind === "expense") {
        linkedInvoiceByExpenseId.set(lineItem.entryId, invoice);
      }
    });
  });

  return linkedInvoiceByExpenseId;
}

function formatInvoiceStatusLabel(
  status: UseTimeTrackerResult["invoiceRecords"][number]["status"]
) {
  switch (status) {
    case "draft":
      return "Draft";
    case "sent":
      return "Sent";
    case "partial":
      return "Partially paid";
    case "paid":
      return "Paid";
  }
}
