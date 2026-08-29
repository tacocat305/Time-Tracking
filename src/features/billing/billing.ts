import type {
  ClientRecord,
  ExpenseRecord,
  InvoiceLineItem,
  InvoiceMatterSummary,
  InvoiceRecord,
  InvoiceStatus,
  TimeEntry,
} from "@/features/time/types";
import {
  getEntryTitle,
  isReviewed,
  minutesToDecimalHours,
  normalizeEntryText,
  slugifyRecordKey,
} from "@/features/time/utils";

export interface BillingCandidate {
  billingInstructions: string;
  clientAddress: string;
  clientId: string | null;
  clientName: string;
  contactEmail: string;
  contactName: string;
  existingInvoiceId: string | null;
  key: string;
  lineItems: InvoiceLineItem[];
  matterSummaries: InvoiceMatterSummary[];
  periodKey: string;
  periodLabel: string;
  reviewedCount: number;
  statementNumber: string;
  totalAmount: number;
  totalBilledMinutes: number;
  unreviewedCount: number;
}

type BuildBillingCandidatesInput = {
  clients: ClientRecord[];
  entries: TimeEntry[];
  expenses: ExpenseRecord[];
  invoices: InvoiceRecord[];
  standardHourlyRate: number;
};

type CandidateAccumulator = BillingCandidate;

export function buildBillingCandidates({
  clients,
  entries,
  expenses,
  invoices,
  standardHourlyRate,
}: BuildBillingCandidatesInput): BillingCandidate[] {
  const grouped = new Map<string, CandidateAccumulator>();
  const existingInvoiceByKey = new Map(
    invoices.map((invoice) => [
      getBillingGroupKey(
        invoice.periodKey,
        invoice.clientId,
        invoice.clientName
      ),
      invoice,
    ])
  );

  entries.forEach((entry) => {
    const periodKey = entry.workDate.slice(0, 7);
    const matchedClient = findClientRecord(
      clients,
      entry.clientId,
      entry.clientName
    );
    const clientId = matchedClient?.id ?? entry.clientId ?? null;
    const clientName =
      matchedClient?.name ??
      normalizeEntryText(entry.clientName, "Unassigned client");
    const groupingKey = getBillingGroupKey(periodKey, clientId, clientName);
    const rate = matchedClient?.rateOverride ?? standardHourlyRate;
    const amount = minutesToDecimalHours(entry.billedMinutes) * rate;
    const lineItem: InvoiceLineItem = {
      amount,
      billedMinutes: entry.billedMinutes,
      category: "",
      entryId: entry.id,
      kind: "time",
      matterId: entry.matterId,
      matterName: normalizeEntryText(entry.matterName, "Unassigned matter"),
      narrative: getEntryTitle(entry),
      payee: "",
      taskCategory: entry.taskCategory.trim(),
      workDate: entry.workDate,
    };
    const existing = grouped.get(groupingKey);

    if (existing) {
      existing.lineItems.push(lineItem);
      existing.totalAmount += amount;
      existing.totalBilledMinutes += entry.billedMinutes;

      if (isReviewed(entry)) {
        existing.reviewedCount += 1;
      } else {
        existing.unreviewedCount += 1;
      }

      return;
    }

    const existingInvoice = existingInvoiceByKey.get(groupingKey);

    grouped.set(groupingKey, {
      billingInstructions: matchedClient?.billingInstructions ?? "",
      clientAddress: matchedClient?.address ?? "",
      clientId,
      clientName,
      contactEmail: matchedClient?.contactEmail ?? "",
      contactName: matchedClient?.contactName ?? "",
      existingInvoiceId: existingInvoice?.id ?? null,
      key: groupingKey,
      lineItems: [lineItem],
      matterSummaries: [],
      periodKey,
      periodLabel: formatPeriodLabel(periodKey),
      reviewedCount: isReviewed(entry) ? 1 : 0,
      statementNumber:
        existingInvoice?.statementNumber ??
        buildNextInvoiceNumber(invoices, new Date().toISOString().slice(0, 10)),
      totalAmount: amount,
      totalBilledMinutes: entry.billedMinutes,
      unreviewedCount: isReviewed(entry) ? 0 : 1,
    });
  });

  expenses
    .filter(
      (expense) => expense.kind === "client" && expense.status !== "reimbursed"
    )
    .forEach((expense) => {
      const periodKey = expense.expenseDate.slice(0, 7);
      const matchedClient = findClientRecord(
        clients,
        expense.clientId,
        expense.clientName
      );
      const clientId = matchedClient?.id ?? expense.clientId ?? null;
      const clientName =
        matchedClient?.name ??
        normalizeEntryText(expense.clientName, "Unassigned client");
      const groupingKey = getBillingGroupKey(periodKey, clientId, clientName);
      const lineItem: InvoiceLineItem = {
        amount: expense.amount,
        billedMinutes: 0,
        category: expense.category.trim(),
        entryId: expense.id,
        kind: "expense",
        matterId: expense.matterId,
        matterName: normalizeEntryText(expense.matterName, "Unassigned matter"),
        narrative: normalizeEntryText(expense.summary, "Untitled expense"),
        payee: expense.payee.trim(),
        taskCategory: "",
        workDate: expense.expenseDate,
      };
      const existing = grouped.get(groupingKey);

      if (existing) {
        existing.lineItems.push(lineItem);
        existing.totalAmount += expense.amount;
        return;
      }

      const existingInvoice = existingInvoiceByKey.get(groupingKey);

      grouped.set(groupingKey, {
        billingInstructions: matchedClient?.billingInstructions ?? "",
        clientAddress: matchedClient?.address ?? "",
        clientId,
        clientName,
        contactEmail: matchedClient?.contactEmail ?? "",
        contactName: matchedClient?.contactName ?? "",
        existingInvoiceId: existingInvoice?.id ?? null,
        key: groupingKey,
        lineItems: [lineItem],
        matterSummaries: [],
        periodKey,
        periodLabel: formatPeriodLabel(periodKey),
        reviewedCount: 0,
        statementNumber:
          existingInvoice?.statementNumber ??
          buildNextInvoiceNumber(
            invoices,
            new Date().toISOString().slice(0, 10)
          ),
        totalAmount: expense.amount,
        totalBilledMinutes: 0,
        unreviewedCount: 0,
      });
    });

  return [...grouped.values()]
    .map((candidate) => ({
      ...candidate,
      lineItems: sortInvoiceLineItems(candidate.lineItems),
      matterSummaries: buildMatterSummaries(candidate.lineItems),
    }))
    .sort((left, right) =>
      left.periodKey === right.periodKey
        ? left.clientName.localeCompare(right.clientName)
        : right.periodKey.localeCompare(left.periodKey)
    );
}

export function sortInvoiceLineItems(lineItems: InvoiceLineItem[]) {
  return [...lineItems].sort((left, right) =>
    left.workDate === right.workDate
      ? left.kind === right.kind
        ? left.narrative.localeCompare(right.narrative)
        : left.kind.localeCompare(right.kind)
      : left.workDate.localeCompare(right.workDate)
  );
}

export function sortInvoiceRecordsDescending(invoices: InvoiceRecord[]) {
  return [...invoices].sort((left, right) =>
    left.periodKey === right.periodKey
      ? right.issuedOn.localeCompare(left.issuedOn)
      : right.periodKey.localeCompare(left.periodKey)
  );
}

export function formatPeriodLabel(periodKey: string) {
  const [year, month] = periodKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, 1);

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatInvoiceStatusLabel(status: InvoiceStatus) {
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

export function getInvoiceStatusTone(status: InvoiceStatus) {
  switch (status) {
    case "draft":
      return "warning";
    case "sent":
      return "accent";
    case "partial":
      return "warning";
    case "paid":
      return "success";
  }
}

export function getInvoiceAmountPaid(invoice: InvoiceRecord) {
  return invoice.payments.reduce((total, payment) => total + payment.amount, 0);
}

export function getInvoiceBalance(invoice: InvoiceRecord) {
  return Math.max(0, invoice.totalAmount - getInvoiceAmountPaid(invoice));
}

export function reconcileInvoicePayments(
  invoice: InvoiceRecord,
  payments: InvoiceRecord["payments"]
): InvoiceRecord {
  const amountPaid = payments.reduce(
    (total, payment) => total + payment.amount,
    0
  );
  const isPaid = amountPaid + 0.005 >= invoice.totalAmount;
  const status: InvoiceStatus = isPaid
    ? "paid"
    : amountPaid > 0
      ? "partial"
      : invoice.status === "draft"
        ? "draft"
        : "sent";
  const paidOn = isPaid
    ? ([...payments].sort((left, right) =>
        right.paymentDate.localeCompare(left.paymentDate)
      )[0]?.paymentDate ?? null)
    : null;
  return { ...invoice, paidOn, payments, status };
}

export function buildNextInvoiceNumber(
  invoices: InvoiceRecord[],
  issuedOn: string
) {
  const year = issuedOn.slice(2, 4);
  const highestSequence = invoices.reduce((highest, invoice) => {
    const match = /^(\d{2})-(\d+)$/.exec(invoice.statementNumber.trim());
    if (!match || match[1] !== year) {
      return highest;
    }
    return Math.max(highest, Number(match[2]) || 0);
  }, 0);

  return `${year}-${String(highestSequence + 1).padStart(3, "0")}`;
}

function getBillingGroupKey(
  periodKey: string,
  clientId: string | null,
  clientName: string
) {
  return `${periodKey}::${clientId ?? slugifyRecordKey(clientName)}`;
}

function findClientRecord(
  clients: ClientRecord[],
  clientId: string | null,
  clientName: string
) {
  return (
    (clientId ? clients.find((client) => client.id === clientId) : undefined) ??
    clients.find((client) => client.name === clientName)
  );
}

export function buildMatterSummaries(lineItems: InvoiceLineItem[]) {
  const grouped = new Map<string, InvoiceMatterSummary>();

  lineItems.forEach((lineItem) => {
    const key = `${lineItem.matterId ?? "none"}::${lineItem.matterName}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.amount += lineItem.amount;
      existing.entryCount += 1;
      existing.totalBilledMinutes += lineItem.billedMinutes;
      return;
    }

    grouped.set(key, {
      amount: lineItem.amount,
      entryCount: 1,
      matterId: lineItem.matterId,
      matterName: lineItem.matterName,
      totalBilledMinutes: lineItem.billedMinutes,
    });
  });

  return [...grouped.values()].sort((left, right) =>
    right.totalBilledMinutes === left.totalBilledMinutes
      ? right.amount - left.amount
      : right.totalBilledMinutes - left.totalBilledMinutes
  );
}
