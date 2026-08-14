import type {
  ClientRecord,
  ClientStatus,
  ExpenseKind,
  ExpenseRecord,
  ExpenseStatus,
  InvoiceRecord,
  InvoiceStatus,
  MatterBreakdown,
  MatterRecord,
  MatterStatus,
  StatementProfile,
  TimeEntry,
  TimeSummary,
  TimeEntrySource,
  TrackerState,
} from "./types";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const DEFAULT_STANDARD_HOURLY_RATE = 350;
export const LONG_SESSION_MINUTES = 6 * 60;
export const QUARTER_HOUR_MINUTES = 15;
export const BROWSER_STORAGE_KEY = "legal-time-tracker.phase5.tracker";

export const DEFAULT_TASK_CATEGORY_OPTIONS = [
  "Drafting",
  "Research",
  "Client call",
  "Document review",
];

export const DEFAULT_STATEMENT_PROFILE: StatementProfile = {
  firmName: "Krewson Law LLC",
  footerNote: "Thank you for the opportunity to support this matter.",
  senderAddress: "",
  senderEmail: "",
  senderName: "",
  senderPhone: "",
  senderTitle: "Employment Law & HR Consulting",
};

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `lt_${Math.random().toString(36).slice(2, 10)}`;
}

export function slugifyRecordKey(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "record"
  );
}

export function createDefaultTrackerState(): TrackerState {
  return {
    activeTimer: null,
    appPreferences: {
      backupExportDirectory: null,
      colorMode: "light",
      themeName: "summer",
    },
    clients: [],
    entries: [],
    expenses: [],
    invoices: [],
    matters: [],
    standardHourlyRate: DEFAULT_STANDARD_HOURLY_RATE,
    statementProfile: { ...DEFAULT_STATEMENT_PROFILE },
  };
}

export function normalizeTrackerState(
  state: Partial<TrackerState> | null | undefined
): TrackerState {
  const cleanedState = removeUntouchedDemoRecords(state);
  const entries = Array.isArray(cleanedState?.entries)
    ? cleanedState.entries.map((entry) => ({
        ...entry,
        clientId: entry.clientId ?? null,
        matterId: entry.matterId ?? null,
      }))
    : [];
  const expenses = normalizeExpenseRecords(
    Array.isArray(cleanedState?.expenses) ? cleanedState.expenses : [],
    entries
  );
  const clients = normalizeClientRecords(
    Array.isArray(cleanedState?.clients) ? cleanedState.clients : [],
    entries
  );
  const invoices = normalizeInvoiceRecords(
    Array.isArray(cleanedState?.invoices) ? cleanedState.invoices : []
  );
  const matters = normalizeMatterRecords(
    Array.isArray(cleanedState?.matters) ? cleanedState.matters : [],
    entries,
    clients
  );

  return {
    activeTimer: cleanedState?.activeTimer
      ? {
          ...cleanedState.activeTimer,
          clientId: cleanedState.activeTimer.clientId ?? null,
          matterId: cleanedState.activeTimer.matterId ?? null,
        }
      : null,
    appPreferences: {
      backupExportDirectory:
        cleanedState?.appPreferences?.backupExportDirectory ?? null,
      colorMode:
        cleanedState?.appPreferences?.colorMode === "dark" ? "dark" : "light",
      themeName: cleanedState?.appPreferences?.themeName || "summer",
    },
    clients,
    entries,
    expenses,
    invoices,
    matters,
    standardHourlyRate:
      typeof cleanedState?.standardHourlyRate === "number"
        ? cleanedState.standardHourlyRate
        : DEFAULT_STANDARD_HOURLY_RATE,
    statementProfile: normalizeStatementProfile(cleanedState?.statementProfile),
  };
}

export function isTrackerStateEmpty(state: TrackerState) {
  return (
    state.activeTimer === null &&
    state.entries.length === 0 &&
    state.expenses.length === 0 &&
    state.clients.length === 0 &&
    state.invoices.length === 0 &&
    state.matters.length === 0
  );
}

export function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function roundUpToQuarterHour(minutes: number) {
  if (minutes <= 0) {
    return 0;
  }

  return Math.ceil(minutes / QUARTER_HOUR_MINUTES) * QUARTER_HOUR_MINUTES;
}

export function hoursToMinutes(hours: number) {
  return Math.round(hours * 60);
}

export function minutesToDecimalHours(minutes: number) {
  return minutes / 60;
}

export function formatHours(minutes: number) {
  const roundedHours = Number(minutesToDecimalHours(minutes).toFixed(2));

  return roundedHours.toString();
}

export function formatCurrency(amount: number) {
  return CURRENCY_FORMATTER.format(amount);
}

export function formatElapsedDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => `${value}`.padStart(2, "0"))
    .join(":");
}

export function formatTimeOfDay(isoString: string) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getEntryTitle(entry: Pick<TimeEntry, "narrative" | "source">) {
  if (entry.narrative.trim()) {
    return entry.narrative.trim();
  }

  return entry.source === "timer"
    ? "Untitled timed work session"
    : "Untitled manual entry";
}

export function normalizeEntryText(value: string, fallback: string) {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : fallback;
}

export function getEntrySourceLabel(source: TimeEntrySource) {
  return source === "timer" ? "Timer" : "Manual";
}

export function sortEntriesDescending(entries: TimeEntry[]) {
  return [...entries].sort((left, right) => {
    const rightTime = right.startedAt ?? right.createdAt;
    const leftTime = left.startedAt ?? left.createdAt;

    return rightTime.localeCompare(leftTime);
  });
}

export function isReviewed(entry: TimeEntry) {
  return entry.reviewedAt !== null;
}

export function isLongSession(
  entry: Pick<TimeEntry, "actualMinutes" | "longSession">
) {
  return entry.longSession || entry.actualMinutes >= LONG_SESSION_MINUTES;
}

export function summarizeEntries(
  entries: TimeEntry[],
  standardHourlyRate: number,
  rateResolver?: (entry: Pick<TimeEntry, "clientId" | "clientName">) => number
): TimeSummary {
  return entries.reduce<TimeSummary>(
    (summary, entry) => {
      summary.entryCount += 1;
      summary.totalActualMinutes += entry.actualMinutes;
      summary.totalBilledMinutes += entry.billedMinutes;
      const appliedRate = rateResolver
        ? rateResolver(entry)
        : standardHourlyRate;
      summary.estimatedValue +=
        minutesToDecimalHours(entry.billedMinutes) * appliedRate;

      if (isReviewed(entry)) {
        summary.reviewedCount += 1;
      } else {
        summary.unreviewedCount += 1;
      }

      if (isLongSession(entry)) {
        summary.longEntryCount += 1;
      }

      return summary;
    },
    {
      entryCount: 0,
      estimatedValue: 0,
      longEntryCount: 0,
      reviewedCount: 0,
      totalActualMinutes: 0,
      totalBilledMinutes: 0,
      unreviewedCount: 0,
    }
  );
}

export function buildMatterBreakdown(
  entries: TimeEntry[],
  standardHourlyRate: number,
  rateResolver?: (entry: Pick<TimeEntry, "clientId" | "clientName">) => number
): MatterBreakdown[] {
  const grouped = new Map<string, MatterBreakdown>();

  entries.forEach((entry) => {
    const clientName = normalizeEntryText(
      entry.clientName,
      "Unassigned client"
    );
    const matterName = normalizeEntryText(
      entry.matterName,
      "Unassigned matter"
    );
    const key = `${clientName}::${matterName}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.entryCount += 1;
      existing.totalBilledMinutes += entry.billedMinutes;
      const appliedRate = rateResolver
        ? rateResolver(entry)
        : standardHourlyRate;
      existing.estimatedValue +=
        minutesToDecimalHours(entry.billedMinutes) * appliedRate;
      if (!isReviewed(entry)) {
        existing.unreviewedCount += 1;
      }
      return;
    }

    grouped.set(key, {
      clientName,
      matterName,
      entryCount: 1,
      estimatedValue:
        minutesToDecimalHours(entry.billedMinutes) *
        (rateResolver ? rateResolver(entry) : standardHourlyRate),
      totalBilledMinutes: entry.billedMinutes,
      unreviewedCount: isReviewed(entry) ? 0 : 1,
    });
  });

  return [...grouped.values()].sort(
    (left, right) => right.totalBilledMinutes - left.totalBilledMinutes
  );
}

export function getWeekStart(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const delta = day === 0 ? -6 : 1 - day;

  copy.setDate(copy.getDate() + delta);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

export function isEntryInCurrentWeek(entry: TimeEntry, now: Date) {
  return isEntryInWeek(entry, now);
}

export function isEntryInWeek(entry: TimeEntry, anchorDate: Date) {
  const entryDate = new Date(`${entry.workDate}T12:00:00`);
  const weekStart = getWeekStart(anchorDate);
  const nextWeekStart = new Date(weekStart);

  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  return entryDate >= weekStart && entryDate < nextWeekStart;
}

export function isEntryInCurrentMonth(entry: TimeEntry, now: Date) {
  return isEntryInMonth(entry, now);
}

export function isEntryInMonth(entry: TimeEntry, anchorDate: Date) {
  const [year, month] = entry.workDate.split("-").map(Number);

  return (
    year === anchorDate.getFullYear() && month === anchorDate.getMonth() + 1
  );
}

function normalizeClientRecords(
  clients: ClientRecord[],
  entries: TimeEntry[]
): ClientRecord[] {
  if (clients.length > 0) {
    return clients.map((client) => ({
      address: client.address ?? "",
      billingInstructions: client.billingInstructions ?? "",
      contactEmail: client.contactEmail ?? "",
      contactName: client.contactName ?? "",
      contactPhone: client.contactPhone ?? "",
      id: client.id,
      name: client.name,
      notes: client.notes ?? "",
      rateOverride:
        typeof client.rateOverride === "number" ? client.rateOverride : null,
      status: normalizeClientStatus(client.status),
    }));
  }

  if (entries.length === 0) {
    return [];
  }

  const clientNames = [
    ...new Set(entries.map((entry) => entry.clientName).filter(Boolean)),
  ];

  return clientNames.map((clientName) => ({
    address: "",
    billingInstructions: "",
    contactEmail: "",
    contactName: "",
    contactPhone: "",
    id: `client-${slugifyRecordKey(clientName)}`,
    name: clientName,
    notes: "Migrated from previously tracked time entries.",
    rateOverride: null,
    status: "active",
  }));
}

function normalizeStatementProfile(
  statementProfile: Partial<StatementProfile> | null | undefined
): StatementProfile {
  const isLegacyGenericProfile =
    statementProfile?.firmName === "Independent Counsel" &&
    statementProfile.senderTitle === "Independent legal contractor" &&
    !statementProfile.senderAddress?.trim() &&
    !statementProfile.senderEmail?.trim() &&
    !statementProfile.senderName?.trim() &&
    !statementProfile.senderPhone?.trim();

  if (isLegacyGenericProfile) {
    return { ...DEFAULT_STATEMENT_PROFILE };
  }

  return {
    firmName: normalizeEntryText(
      statementProfile?.firmName ?? "",
      DEFAULT_STATEMENT_PROFILE.firmName
    ),
    footerNote: normalizeEntryText(
      statementProfile?.footerNote ?? "",
      DEFAULT_STATEMENT_PROFILE.footerNote
    ),
    senderAddress: statementProfile?.senderAddress ?? "",
    senderEmail: statementProfile?.senderEmail ?? "",
    senderName: statementProfile?.senderName ?? "",
    senderPhone: statementProfile?.senderPhone ?? "",
    senderTitle: normalizeEntryText(
      statementProfile?.senderTitle ?? "",
      DEFAULT_STATEMENT_PROFILE.senderTitle
    ),
  };
}

function normalizeInvoiceRecords(invoices: InvoiceRecord[]): InvoiceRecord[] {
  return invoices.map((invoice) => ({
    billingInstructions: invoice.billingInstructions ?? "",
    clientAddress: invoice.clientAddress ?? "",
    clientId: invoice.clientId ?? null,
    clientName: invoice.clientName,
    contactEmail: invoice.contactEmail ?? "",
    contactName: invoice.contactName ?? "",
    deliveries: Array.isArray(invoice.deliveries)
      ? invoice.deliveries.map((delivery) => ({
          id: delivery.id,
          message: delivery.message ?? "",
          recipient: delivery.recipient,
          sentAt: delivery.sentAt,
          status: delivery.status === "failed" ? "failed" : "accepted",
          subject: delivery.subject,
          transport: delivery.transport,
        }))
      : [],
    excludedExpenseIds: Array.isArray(invoice.excludedExpenseIds)
      ? invoice.excludedExpenseIds
      : [],
    id: invoice.id,
    issuedOn: invoice.issuedOn,
    lineItems: Array.isArray(invoice.lineItems)
      ? invoice.lineItems.map((lineItem) => ({
          amount: typeof lineItem.amount === "number" ? lineItem.amount : 0,
          billedMinutes:
            typeof lineItem.billedMinutes === "number"
              ? lineItem.billedMinutes
              : 0,
          category: lineItem.category ?? "",
          entryId: lineItem.entryId,
          kind: lineItem.kind === "expense" ? "expense" : "time",
          matterId: lineItem.matterId ?? null,
          matterName: lineItem.matterName ?? "",
          narrative: lineItem.narrative ?? "",
          payee: lineItem.payee ?? "",
          taskCategory: lineItem.taskCategory ?? "",
          workDate: lineItem.workDate,
        }))
      : [],
    matterSummaries: Array.isArray(invoice.matterSummaries)
      ? invoice.matterSummaries.map((matter) => ({
          amount: typeof matter.amount === "number" ? matter.amount : 0,
          entryCount:
            typeof matter.entryCount === "number" ? matter.entryCount : 0,
          matterId: matter.matterId ?? null,
          matterName: matter.matterName ?? "",
          totalBilledMinutes:
            typeof matter.totalBilledMinutes === "number"
              ? matter.totalBilledMinutes
              : 0,
        }))
      : [],
    notes: invoice.notes ?? "",
    paidOn: invoice.paidOn ?? null,
    payments:
      Array.isArray(invoice.payments) && invoice.payments.length > 0
        ? invoice.payments.map((payment) => ({
            amount: typeof payment.amount === "number" ? payment.amount : 0,
            createdAt: payment.createdAt ?? new Date().toISOString(),
            id: payment.id,
            method:
              payment.method === "ach" ||
              payment.method === "card" ||
              payment.method === "cash" ||
              payment.method === "check"
                ? payment.method
                : "other",
            notes: payment.notes ?? "",
            paymentDate:
              payment.paymentDate ?? invoice.paidOn ?? invoice.issuedOn,
            reference: payment.reference ?? "",
          }))
        : invoice.status === "paid" && invoice.totalAmount > 0
          ? [
              {
                amount: invoice.totalAmount,
                createdAt: `${invoice.paidOn ?? invoice.issuedOn}T12:00:00.000Z`,
                id: `legacy-payment-${invoice.id}`,
                method: "other",
                notes: "Migrated from the previous paid-status record.",
                paymentDate: invoice.paidOn ?? invoice.issuedOn,
                reference: "Legacy paid status",
              },
            ]
          : [],
    periodKey: invoice.periodKey,
    periodLabel: invoice.periodLabel,
    reviewedCount:
      typeof invoice.reviewedCount === "number" ? invoice.reviewedCount : 0,
    statementExportedAt: invoice.statementExportedAt ?? null,
    statementPdfPath: invoice.statementPdfPath ?? null,
    statementNumber:
      invoice.statementNumber ??
      `LTT-${invoice.periodKey.replace("-", "")}-${slugifyRecordKey(invoice.clientName).toUpperCase()}`,
    status: normalizeInvoiceStatus(invoice.status),
    totalAmount:
      typeof invoice.totalAmount === "number" ? invoice.totalAmount : 0,
    totalBilledMinutes:
      typeof invoice.totalBilledMinutes === "number"
        ? invoice.totalBilledMinutes
        : 0,
    unreviewedCount:
      typeof invoice.unreviewedCount === "number" ? invoice.unreviewedCount : 0,
  }));
}

function normalizeExpenseRecords(
  expenses: ExpenseRecord[],
  entries: TimeEntry[]
): ExpenseRecord[] {
  if (expenses.length > 0) {
    return expenses.map((expense) => {
      const kind = normalizeExpenseKind(expense.kind);
      const fallbackStatus = kind === "client" ? "pending" : "internal";

      return {
        amount: typeof expense.amount === "number" ? expense.amount : 0,
        category: expense.category ?? "",
        clientId: kind === "client" ? (expense.clientId ?? null) : null,
        clientName: kind === "client" ? (expense.clientName ?? "") : "",
        createdAt: expense.createdAt ?? new Date().toISOString(),
        expenseDate: expense.expenseDate ?? getLocalDateKey(new Date()),
        id: expense.id,
        kind,
        matterId: kind === "client" ? (expense.matterId ?? null) : null,
        matterName: kind === "client" ? (expense.matterName ?? "") : "",
        notes: expense.notes ?? "",
        payee: expense.payee ?? "",
        receiptPath: expense.receiptPath ?? null,
        status: normalizeExpenseStatus(expense.status, fallbackStatus),
        summary: expense.summary ?? "",
        taxCategory: expense.taxCategory ?? "",
        taxDeductible: expense.taxDeductible ?? false,
      };
    });
  }

  if (entries.length === 0) {
    return [];
  }

  return [];
}

function normalizeMatterRecords(
  matters: MatterRecord[],
  entries: TimeEntry[],
  clients: ClientRecord[]
): MatterRecord[] {
  if (matters.length > 0) {
    return matters.map((matter) => ({
      clientId: matter.clientId,
      defaultTaskCategory: matter.defaultTaskCategory ?? "",
      description: matter.description ?? "",
      id: matter.id,
      name: matter.name,
      notes: matter.notes ?? "",
      status: normalizeMatterStatus(matter.status),
    }));
  }

  if (entries.length === 0) {
    return [];
  }

  const clientByName = new Map(clients.map((client) => [client.name, client]));
  const matterKeys = new Set<string>();
  const inferred: MatterRecord[] = [];

  entries.forEach((entry) => {
    if (!entry.matterName.trim()) {
      return;
    }

    const key = `${entry.clientName}::${entry.matterName}`;
    if (matterKeys.has(key)) {
      return;
    }

    matterKeys.add(key);
    const client = clientByName.get(entry.clientName);

    inferred.push({
      clientId: client?.id ?? clients[0]?.id ?? "",
      defaultTaskCategory: entry.taskCategory ?? "",
      description: "Migrated from tracked time history.",
      id: `matter-${slugifyRecordKey(key)}`,
      name: entry.matterName,
      notes: "",
      status: "open",
    });
  });

  return inferred;
}

function removeUntouchedDemoRecords(
  state: Partial<TrackerState> | null | undefined
): Partial<TrackerState> | null | undefined {
  if (!state) {
    return state;
  }

  const demoExpenseIds = new Set([
    "expense-rowan-filing-fee",
    "expense-software-research-tool",
  ]);
  const demoClientIds = new Set([
    "client-baker-holdings",
    "client-rowan-advisory",
    "client-kestrel-group",
  ]);
  const demoMatterIds = new Set([
    "matter-employment-review",
    "matter-vendor-dispute",
    "matter-general-counsel-support",
    "matter-compliance-memo",
  ]);
  const entries = Array.isArray(state.entries) ? state.entries : [];
  const invoices = (Array.isArray(state.invoices) ? state.invoices : []).filter(
    (invoice) => {
      const lineItems = Array.isArray(invoice.lineItems)
        ? invoice.lineItems
        : [];
      const isDerivedOnlyFromDemoExpenses =
        typeof invoice.clientId === "string" &&
        demoClientIds.has(invoice.clientId) &&
        lineItems.length > 0 &&
        lineItems.every(
          (lineItem) =>
            lineItem.kind === "expense" &&
            typeof lineItem.entryId === "string" &&
            demoExpenseIds.has(lineItem.entryId)
        );

      return !isDerivedOnlyFromDemoExpenses;
    }
  );
  const expenses = (Array.isArray(state.expenses) ? state.expenses : []).filter(
    (expense) => !demoExpenseIds.has(expense.id)
  );
  const referencedClientIds = new Set([
    ...entries.map((entry) => entry.clientId).filter(Boolean),
    ...expenses.map((expense) => expense.clientId).filter(Boolean),
    ...invoices.map((invoice) => invoice.clientId).filter(Boolean),
  ]);
  const referencedMatterIds = new Set([
    ...entries.map((entry) => entry.matterId).filter(Boolean),
    ...expenses.map((expense) => expense.matterId).filter(Boolean),
    ...invoices.flatMap((invoice) =>
      (Array.isArray(invoice.lineItems) ? invoice.lineItems : [])
        .map((lineItem) => lineItem.matterId)
        .filter(Boolean)
    ),
  ]);

  return {
    ...state,
    clients: (Array.isArray(state.clients) ? state.clients : []).filter(
      (client) =>
        !demoClientIds.has(client.id) || referencedClientIds.has(client.id)
    ),
    expenses,
    invoices,
    matters: (Array.isArray(state.matters) ? state.matters : []).filter(
      (matter) =>
        !demoMatterIds.has(matter.id) || referencedMatterIds.has(matter.id)
    ),
  };
}

function normalizeClientStatus(status: ClientStatus | undefined): ClientStatus {
  return status === "archived" ? "archived" : "active";
}

function normalizeMatterStatus(status: MatterStatus | undefined): MatterStatus {
  if (status === "closed" || status === "archived") {
    return status;
  }

  return "open";
}

function normalizeInvoiceStatus(
  status: InvoiceStatus | undefined
): InvoiceStatus {
  if (status === "sent" || status === "partial" || status === "paid") {
    return status;
  }

  return "draft";
}

function normalizeExpenseKind(kind: ExpenseKind | undefined): ExpenseKind {
  return kind === "business" ? "business" : "client";
}

function normalizeExpenseStatus(
  status: ExpenseStatus | undefined,
  fallback: ExpenseStatus
): ExpenseStatus {
  if (
    status === "internal" ||
    status === "pending" ||
    status === "submitted" ||
    status === "reimbursed"
  ) {
    return status;
  }

  return fallback;
}
