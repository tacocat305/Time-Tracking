import { useEffect, useState } from "react";

import {
  buildMatterSummaries,
  buildBillingCandidates,
  getInvoiceBalance,
  reconcileInvoicePayments,
  type BillingCandidate,
  sortInvoiceLineItems,
  sortInvoiceRecordsDescending,
} from "@/features/billing/billing";
import {
  attachReceipt,
  exportExpenseCsv,
  openExpenseExport,
  openReceipt,
  removeReceipt,
} from "@/features/expenses/files";

import type {
  ActiveTimer,
  AppPreferences,
  BackupSnapshotRecord,
  ClientRecord,
  ClientRecordInput,
  ExpenseRecord,
  ExpenseRecordInput,
  InvoiceDeliveryRecord,
  InvoiceRecord,
  InvoiceStatus,
  ManualEntryInput,
  MatterBreakdown,
  MatterRecord,
  MatterRecordInput,
  PaymentRecordInput,
  StatementProfile,
  TimeEntry,
  TimeSummary,
  TimerDraft,
  TrackerState,
} from "./types";
import {
  chooseBackupExportDirectory,
  createTrackerBackup,
  exportTrackerBackup,
  hydrateTrackerState,
  listTrackerBackups,
  loadInitialTrackerState,
  persistTrackerState,
  restoreTrackerBackup,
  shouldHydrateTrackerState,
} from "./persistence";
import {
  buildMatterBreakdown,
  createId,
  DEFAULT_TASK_CATEGORY_OPTIONS,
  formatCurrency,
  getLocalDateKey,
  isEntryInCurrentMonth,
  isEntryInCurrentWeek,
  isEntryInMonth,
  isEntryInWeek,
  normalizeEntryText,
  roundUpToQuarterHour,
  slugifyRecordKey,
  sortEntriesDescending,
  summarizeEntries,
} from "./utils";

export type PeriodReport = {
  entries: TimeEntry[];
  matterBreakdown: MatterBreakdown[];
  summary: TimeSummary;
};

export interface UseTimeTrackerResult {
  activeTimer: ActiveTimer | null;
  activeClientRecords: ClientRecord[];
  appPreferences: AppPreferences;
  backupSnapshots: BackupSnapshotRecord[];
  billingCandidates: BillingCandidate[];
  clientRecords: ClientRecord[];
  clientExpenseRecords: ExpenseRecord[];
  businessExpenseRecords: ExpenseRecord[];
  currentMonthEntries: TimeEntry[];
  currentMonthBusinessExpenseTotal: number;
  currentMonthClientExpenseTotal: number;
  currentMonthMatterBreakdown: MatterBreakdown[];
  currentMonthSummary: TimeSummary;
  currentWeekEntries: TimeEntry[];
  currentWeekMatterBreakdown: MatterBreakdown[];
  currentWeekSummary: TimeSummary;
  expenseRecords: ExpenseRecord[];
  entries: TimeEntry[];
  invoiceRecords: InvoiceRecord[];
  knownClients: string[];
  knownMatters: string[];
  knownTaskCategories: string[];
  matterRecords: MatterRecord[];
  outstandingClientExpenseTotal: number;
  standardHourlyRate: number;
  statementProfile: StatementProfile;
  supportsDesktopBackups: boolean;
  persistenceStatus: "loading" | "saving" | "saved" | "error";
  persistenceError: string | null;
  todayEntries: TimeEntry[];
  todaySummary: TimeSummary;
  addClient: (input: ClientRecordInput) => string;
  addExpense: (input: ExpenseRecordInput) => string;
  attachExpenseReceipt: (expenseId: string) => Promise<boolean>;
  createManualBackup: () => Promise<boolean>;
  configureBackupExportDirectory: () => Promise<string | null>;
  exportBackupNow: () => Promise<string | null>;
  exportExpensesCsv: (taxYear: number | null) => Promise<string | null>;
  createInvoiceRecord: (candidate: BillingCandidate) => string | null;
  addManualEntry: (input: ManualEntryInput) => void;
  addMatter: (input: MatterRecordInput) => string;
  addInvoicePayment: (invoiceId: string, input: PaymentRecordInput) => boolean;
  getClientLabel: (clientId: string | null) => string;
  getEstimatedRateLabel: (clientId: string | null) => string;
  getMatterLabel: (matterId: string | null) => string;
  getMattersForClient: (clientId: string | null) => MatterRecord[];
  getMonthReport: (anchorDate: Date) => PeriodReport;
  getWeekReport: (anchorDate: Date) => PeriodReport;
  startTimer: (draft: TimerDraft) => void;
  stopTimer: () => void;
  deleteEntry: (entryId: string) => boolean;
  deleteExpense: (expenseId: string) => boolean;
  deleteBillingCandidate: (candidate: BillingCandidate) => boolean;
  deleteInvoice: (invoiceId: string) => boolean;
  deleteInvoicePayment: (invoiceId: string, paymentId: string) => boolean;
  isEntryLocked: (entryId: string) => boolean;
  isExpenseLocked: (expenseId: string) => boolean;
  openExpenseReceipt: (expenseId: string) => Promise<boolean>;
  removeExpenseReceipt: (expenseId: string) => Promise<boolean>;
  syncInvoiceRecord: (candidate: BillingCandidate) => boolean;
  toggleEntryReviewed: (entryId: string) => void;
  updateActiveTimer: (draft: Partial<TimerDraft>) => void;
  updateClient: (client: ClientRecord) => void;
  updateEntry: (entry: TimeEntry) => boolean;
  updateInvoiceNotes: (invoiceId: string, notes: string) => void;
  attachExpenseToInvoice: (invoiceId: string, expenseId: string) => void;
  detachExpenseFromInvoice: (invoiceId: string, expenseId: string) => void;
  updateInvoiceStatementExport: (
    invoiceId: string,
    statementPdfPath: string | null,
    statementExportedAt: string | null
  ) => void;
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
  updateMatter: (matter: MatterRecord) => void;
  updateExpense: (expense: ExpenseRecord) => void;
  updateStatementProfile: (statementProfile: StatementProfile) => void;
  updateAppPreferences: (preferences: Partial<AppPreferences>) => void;
  updateStandardHourlyRate: (rate: number) => void;
  refreshBackupSnapshots: () => Promise<void>;
  recordInvoiceDelivery: (
    invoiceId: string,
    delivery: Omit<InvoiceDeliveryRecord, "id" | "sentAt">
  ) => void;
  restoreBackupSnapshot: (backupId: string) => Promise<boolean>;
}

export function useTimeTracker(): UseTimeTrackerResult {
  const [state, setState] = useState<TrackerState>(loadInitialTrackerState);
  const [isHydrated, setIsHydrated] = useState(
    () => !shouldHydrateTrackerState()
  );
  const [backupSnapshots, setBackupSnapshots] = useState<
    BackupSnapshotRecord[]
  >([]);
  const [persistenceMode, setPersistenceMode] = useState<
    "browser-local" | "tauri"
  >(() => (shouldHydrateTrackerState() ? "tauri" : "browser-local"));
  const [persistenceStatus, setPersistenceStatus] = useState<
    "loading" | "saving" | "saved" | "error"
  >(() => (shouldHydrateTrackerState() ? "loading" : "saved"));
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const now = new Date();

  useEffect(() => {
    if (!shouldHydrateTrackerState()) {
      return;
    }

    let isCancelled = false;

    void hydrateTrackerState().then(
      async ({ error, mode, state: hydratedState }) => {
        if (isCancelled) {
          return;
        }

        setState(hydratedState);
        setPersistenceMode(mode);
        setIsHydrated(!error);
        setPersistenceError(error);
        setPersistenceStatus(error ? "error" : "saved");

        if (mode === "tauri") {
          const backups = await listTrackerBackups();

          if (!isCancelled) {
            setBackupSnapshots(backups);
          }
        }
      }
    );

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    let isCancelled = false;

    const timeout = window.setTimeout(() => {
      setPersistenceStatus("saving");
      setPersistenceError(null);
      void persistTrackerState(state, persistenceMode).then((result) => {
        if (isCancelled) {
          return;
        }

        setPersistenceMode(result.mode);
        setPersistenceStatus(result.error ? "error" : "saved");
        setPersistenceError(result.error);
      });
    }, 150);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isHydrated, persistenceMode, state]);

  const entries = sortEntriesDescending(state.entries);
  const expenseRecords = sortExpensesDescending(state.expenses);
  const todayKey = getLocalDateKey(now);
  const todayEntries = entries.filter((entry) => entry.workDate === todayKey);
  const currentWeekEntries = entries.filter((entry) =>
    isEntryInCurrentWeek(entry, now)
  );
  const currentMonthEntries = entries.filter((entry) =>
    isEntryInCurrentMonth(entry, now)
  );
  const clientExpenseRecords = expenseRecords.filter(
    (expense) => expense.kind === "client"
  );
  const businessExpenseRecords = expenseRecords.filter(
    (expense) => expense.kind === "business"
  );
  const currentMonthClientExpenseTotal = clientExpenseRecords
    .filter((expense) => isDateKeyInCurrentMonth(expense.expenseDate, now))
    .reduce((total, expense) => total + expense.amount, 0);
  const currentMonthBusinessExpenseTotal = businessExpenseRecords
    .filter((expense) => isDateKeyInCurrentMonth(expense.expenseDate, now))
    .reduce((total, expense) => total + expense.amount, 0);
  const outstandingClientExpenseTotal = clientExpenseRecords
    .filter((expense) => expense.status !== "reimbursed")
    .reduce((total, expense) => total + expense.amount, 0);
  const clientRecords = [...state.clients].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const activeClientRecords = clientRecords.filter(
    (client) => client.status === "active"
  );
  const matterRecords = [...state.matters].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const invoiceRecords = sortInvoiceRecordsDescending(state.invoices);

  const rateResolver = (entry: Pick<TimeEntry, "clientId" | "clientName">) =>
    resolveHourlyRate(entry.clientId, entry.clientName, state);
  const billingCandidates = buildBillingCandidates({
    clients: state.clients,
    entries: state.entries,
    expenses: state.expenses,
    invoices: state.invoices,
    standardHourlyRate: state.standardHourlyRate,
  });

  const todaySummary = summarizeEntries(
    todayEntries,
    state.standardHourlyRate,
    rateResolver
  );
  const currentWeekSummary = summarizeEntries(
    currentWeekEntries,
    state.standardHourlyRate,
    rateResolver
  );
  const currentMonthSummary = summarizeEntries(
    currentMonthEntries,
    state.standardHourlyRate,
    rateResolver
  );
  const currentWeekMatterBreakdown = buildMatterBreakdown(
    currentWeekEntries,
    state.standardHourlyRate,
    rateResolver
  );
  const currentMonthMatterBreakdown = buildMatterBreakdown(
    currentMonthEntries,
    state.standardHourlyRate,
    rateResolver
  );

  function buildPeriodReport(periodEntries: TimeEntry[]): PeriodReport {
    return {
      entries: periodEntries,
      matterBreakdown: buildMatterBreakdown(
        periodEntries,
        state.standardHourlyRate,
        rateResolver
      ),
      summary: summarizeEntries(
        periodEntries,
        state.standardHourlyRate,
        rateResolver
      ),
    };
  }

  const knownClients = buildKnownValues(
    [
      ...clientRecords.map((client) => client.name),
      ...entries.map((entry) => entry.clientName),
    ],
    state.activeTimer?.clientName
  );
  const knownMatters = buildKnownValues(
    [
      ...matterRecords.map((matter) => matter.name),
      ...entries.map((entry) => entry.matterName),
    ],
    state.activeTimer?.matterName
  );
  const knownTaskCategories = buildKnownValues(
    [
      ...DEFAULT_TASK_CATEGORY_OPTIONS,
      ...matterRecords.map((matter) => matter.defaultTaskCategory),
      ...entries.map((entry) => entry.taskCategory),
    ],
    state.activeTimer?.taskCategory
  );

  return {
    activeTimer: state.activeTimer,
    activeClientRecords,
    appPreferences: state.appPreferences,
    backupSnapshots,
    billingCandidates,
    businessExpenseRecords,
    clientRecords,
    clientExpenseRecords,
    currentMonthEntries,
    currentMonthBusinessExpenseTotal,
    currentMonthClientExpenseTotal,
    currentMonthMatterBreakdown,
    currentMonthSummary,
    currentWeekEntries,
    currentWeekMatterBreakdown,
    currentWeekSummary,
    expenseRecords,
    entries,
    invoiceRecords,
    knownClients,
    knownMatters,
    knownTaskCategories,
    matterRecords,
    outstandingClientExpenseTotal,
    standardHourlyRate: state.standardHourlyRate,
    statementProfile: state.statementProfile,
    supportsDesktopBackups: persistenceMode === "tauri",
    persistenceError,
    persistenceStatus,
    todayEntries,
    todaySummary,
    addClient(input) {
      const normalizedName = normalizeEntryText(input.name, "Untitled client");
      const existingClient = state.clients.find(
        (client) =>
          client.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase()
      );
      if (existingClient) {
        return existingClient.id;
      }

      const client: ClientRecord = {
        ...input,
        id: `client-${slugifyRecordKey(input.name)}-${createId().slice(-6)}`,
        name: normalizedName,
      };

      setState((current) => ({
        ...current,
        clients: [...current.clients, client],
      }));

      return client.id;
    },
    addExpense(input) {
      const expense: ExpenseRecord = {
        amount: Math.max(0, Number(input.amount) || 0),
        category: input.category.trim(),
        clientId: input.kind === "client" ? input.clientId : null,
        clientName:
          input.kind === "client"
            ? normalizeEntryText(input.clientName, "Unassigned client")
            : "",
        createdAt: new Date().toISOString(),
        expenseDate: input.expenseDate,
        id: createId(),
        kind: input.kind,
        matterId: input.kind === "client" ? input.matterId : null,
        matterName:
          input.kind === "client"
            ? normalizeEntryText(input.matterName, "Unassigned matter")
            : "",
        notes: input.notes.trim(),
        payee: normalizeEntryText(input.payee, "Unknown payee"),
        receiptPath: input.receiptPath,
        status: input.kind === "business" ? "internal" : input.status,
        summary: normalizeEntryText(input.summary, "Untitled expense"),
        taxCategory: input.taxCategory.trim(),
        taxDeductible: input.taxDeductible,
      };

      setState((current) => ({
        ...current,
        expenses: [expense, ...current.expenses],
      }));

      return expense.id;
    },
    async attachExpenseReceipt(expenseId) {
      if (isLineItemLinked(state.invoices, expenseId, "expense")) {
        return false;
      }
      const receipt = await attachReceipt(expenseId);
      if (!receipt) {
        return false;
      }
      setState((current) => ({
        ...current,
        expenses: current.expenses.map((expense) =>
          expense.id === expenseId
            ? { ...expense, receiptPath: receipt.path }
            : expense
        ),
      }));
      return true;
    },
    async configureBackupExportDirectory() {
      const directory = await chooseBackupExportDirectory();
      if (!directory) {
        return null;
      }
      const nextState = {
        ...state,
        appPreferences: {
          ...state.appPreferences,
          backupExportDirectory: directory,
        },
      };
      setState(nextState);
      const exported = await exportTrackerBackup(nextState, directory);
      return exported?.path ?? null;
    },
    async createManualBackup() {
      const backup = await createTrackerBackup(state);

      if (!backup) {
        return false;
      }

      setBackupSnapshots((current) =>
        [
          backup,
          ...current.filter((snapshot) => snapshot.id !== backup.id),
        ].sort((left, right) => right.createdAt - left.createdAt)
      );

      return true;
    },
    async exportBackupNow() {
      const directory = state.appPreferences.backupExportDirectory;
      if (!directory) {
        return null;
      }
      const exported = await exportTrackerBackup(state, directory);
      return exported?.path ?? null;
    },
    async exportExpensesCsv(taxYear) {
      const exported = await exportExpenseCsv(state.expenses, taxYear);
      if (!exported) {
        return null;
      }
      await openExpenseExport(exported.path);
      return exported.path;
    },
    createInvoiceRecord(candidate) {
      if (
        candidate.existingInvoiceId ||
        candidate.unreviewedCount > 0 ||
        !candidate.clientId
      ) {
        return candidate.existingInvoiceId;
      }

      const invoiceId = createId();

      setState((current) => {
        const existingInvoice = current.invoices.find(
          (invoice) =>
            invoice.periodKey === candidate.periodKey &&
            ((invoice.clientId && invoice.clientId === candidate.clientId) ||
              (!invoice.clientId &&
                invoice.clientName === candidate.clientName &&
                candidate.clientId === null))
        );

        if (existingInvoice) {
          return current;
        }

        const invoice: InvoiceRecord = {
          billingInstructions: candidate.billingInstructions,
          clientAddress: candidate.clientAddress,
          clientId: candidate.clientId,
          clientName: candidate.clientName,
          contactEmail: candidate.contactEmail,
          contactName: candidate.contactName,
          deliveries: [],
          excludedExpenseIds: [],
          id: invoiceId,
          issuedOn: getLocalDateKey(new Date()),
          lineItems: candidate.lineItems.map((lineItem) => ({ ...lineItem })),
          matterSummaries: candidate.matterSummaries.map((matter) => ({
            ...matter,
          })),
          notes: "",
          paidOn: null,
          payments: [],
          periodKey: candidate.periodKey,
          periodLabel: candidate.periodLabel,
          reviewedCount: candidate.reviewedCount,
          statementExportedAt: null,
          statementPdfPath: null,
          statementNumber: candidate.statementNumber,
          status: "draft",
          totalAmount: candidate.totalAmount,
          totalBilledMinutes: candidate.totalBilledMinutes,
          unreviewedCount: candidate.unreviewedCount,
        };

        return {
          ...current,
          invoices: [invoice, ...current.invoices],
        };
      });

      return invoiceId;
    },
    addInvoicePayment(invoiceId, input) {
      const invoice = state.invoices.find((record) => record.id === invoiceId);
      const amount =
        Math.round(Math.max(0, Number(input.amount) || 0) * 100) / 100;
      if (
        !invoice ||
        invoice.status === "draft" ||
        amount <= 0 ||
        amount - getInvoiceBalance(invoice) > 0.005
      ) {
        return false;
      }
      const payment = {
        ...input,
        amount,
        createdAt: new Date().toISOString(),
        id: createId(),
        notes: input.notes.trim(),
        reference: input.reference.trim(),
      };
      setState((current) => {
        const currentInvoice = current.invoices.find(
          (record) => record.id === invoiceId
        );
        if (!currentInvoice) {
          return current;
        }
        const reconciled = reconcileInvoicePayments(currentInvoice, [
          ...currentInvoice.payments,
          payment,
        ]);
        return {
          ...current,
          expenses: syncExpenseStatusesForInvoice(
            current.expenses,
            current.invoices,
            invoiceId,
            reconciled.status
          ),
          invoices: current.invoices.map((record) =>
            record.id === invoiceId ? reconciled : record
          ),
        };
      });
      return true;
    },
    addManualEntry(input) {
      const actualMinutes = Math.max(0, Math.round(input.billedHours * 60));
      const billedMinutes = actualMinutes;

      const entry: TimeEntry = {
        actualMinutes,
        billedMinutes,
        clientId: input.clientId,
        clientName: normalizeEntryText(input.clientName, "Unassigned client"),
        createdAt: new Date().toISOString(),
        id: createId(),
        longSession: actualMinutes >= 6 * 60,
        matterId: input.matterId,
        matterName: normalizeEntryText(input.matterName, "Unassigned matter"),
        narrative: normalizeEntryText(input.narrative, "Untitled manual entry"),
        reviewedAt: null,
        source: "manual",
        startedAt: null,
        taskCategory: input.taskCategory.trim(),
        workDate: input.workDate,
      };

      setState((current) => ({
        ...current,
        entries: [entry, ...current.entries],
      }));
    },
    deleteEntry(entryId) {
      const canDelete =
        state.entries.some((entry) => entry.id === entryId) &&
        !isLineItemLinked(state.invoices, entryId, "time");

      if (!canDelete) {
        return false;
      }

      setState((current) => {
        if (isLineItemLinked(current.invoices, entryId, "time")) {
          return current;
        }

        return {
          ...current,
          entries: current.entries.filter((entry) => entry.id !== entryId),
        };
      });

      return true;
    },
    deleteExpense(expenseId) {
      const canDelete =
        state.expenses.some((expense) => expense.id === expenseId) &&
        !isLineItemLinked(state.invoices, expenseId, "expense");

      if (!canDelete) {
        return false;
      }

      setState((current) => {
        if (isLineItemLinked(current.invoices, expenseId, "expense")) {
          return current;
        }

        return {
          ...current,
          expenses: current.expenses.filter(
            (expense) => expense.id !== expenseId
          ),
        };
      });

      return true;
    },
    deleteBillingCandidate(candidate) {
      const sourceIds = new Set(
        candidate.lineItems.map((lineItem) => lineItem.entryId)
      );
      const linkedInvoice = candidate.existingInvoiceId
        ? state.invoices.find(
            (invoice) => invoice.id === candidate.existingInvoiceId
          )
        : null;
      const sourceLockedElsewhere = state.invoices.some(
        (invoice) =>
          invoice.id !== candidate.existingInvoiceId &&
          invoice.lineItems.some((lineItem) => sourceIds.has(lineItem.entryId))
      );

      if (
        sourceIds.size === 0 ||
        sourceLockedElsewhere ||
        (candidate.existingInvoiceId && linkedInvoice?.status !== "draft")
      ) {
        return false;
      }

      setState((current) => {
        const currentInvoice = candidate.existingInvoiceId
          ? current.invoices.find(
              (invoice) => invoice.id === candidate.existingInvoiceId
            )
          : null;
        const lockedElsewhere = current.invoices.some(
          (invoice) =>
            invoice.id !== candidate.existingInvoiceId &&
            invoice.lineItems.some((lineItem) =>
              sourceIds.has(lineItem.entryId)
            )
        );

        if (
          lockedElsewhere ||
          (candidate.existingInvoiceId && currentInvoice?.status !== "draft")
        ) {
          return current;
        }

        return {
          ...current,
          entries: current.entries.filter((entry) => !sourceIds.has(entry.id)),
          expenses: current.expenses.filter(
            (expense) => !sourceIds.has(expense.id)
          ),
          invoices: candidate.existingInvoiceId
            ? current.invoices.filter(
                (invoice) => invoice.id !== candidate.existingInvoiceId
              )
            : current.invoices,
        };
      });

      return true;
    },
    deleteInvoice(invoiceId) {
      const invoice = state.invoices.find((record) => record.id === invoiceId);
      if (!invoice || invoice.status !== "draft") {
        return false;
      }

      const linkedExpenseIds = new Set(
        invoice.lineItems
          .filter((lineItem) => lineItem.kind === "expense")
          .map((lineItem) => lineItem.entryId)
      );
      setState((current) => ({
        ...current,
        expenses: current.expenses.map((expense) =>
          linkedExpenseIds.has(expense.id) && expense.kind === "client"
            ? { ...expense, status: "pending" }
            : expense
        ),
        invoices: current.invoices.filter((record) => record.id !== invoiceId),
      }));

      return true;
    },
    deleteInvoicePayment(invoiceId, paymentId) {
      const invoice = state.invoices.find((record) => record.id === invoiceId);
      if (!invoice?.payments.some((payment) => payment.id === paymentId)) {
        return false;
      }
      setState((current) => {
        const currentInvoice = current.invoices.find(
          (record) => record.id === invoiceId
        );
        if (!currentInvoice) {
          return current;
        }
        const reconciled = reconcileInvoicePayments(
          currentInvoice,
          currentInvoice.payments.filter((payment) => payment.id !== paymentId)
        );
        return {
          ...current,
          expenses: syncExpenseStatusesForInvoice(
            current.expenses,
            current.invoices,
            invoiceId,
            reconciled.status
          ),
          invoices: current.invoices.map((record) =>
            record.id === invoiceId ? reconciled : record
          ),
        };
      });
      return true;
    },
    isEntryLocked(entryId) {
      return isLineItemLinked(state.invoices, entryId, "time");
    },
    isExpenseLocked(expenseId) {
      return isLineItemLinked(state.invoices, expenseId, "expense");
    },
    async openExpenseReceipt(expenseId) {
      const path = state.expenses.find(
        (expense) => expense.id === expenseId
      )?.receiptPath;
      return path ? await openReceipt(path) : false;
    },
    async removeExpenseReceipt(expenseId) {
      if (isLineItemLinked(state.invoices, expenseId, "expense")) {
        return false;
      }
      const path = state.expenses.find(
        (expense) => expense.id === expenseId
      )?.receiptPath;
      if (!path || !(await removeReceipt(path))) {
        return false;
      }
      setState((current) => ({
        ...current,
        expenses: current.expenses.map((expense) =>
          expense.id === expenseId ? { ...expense, receiptPath: null } : expense
        ),
      }));
      return true;
    },
    recordInvoiceDelivery(invoiceId, delivery) {
      setState((current) => {
        const invoice = current.invoices.find(
          (record) => record.id === invoiceId
        );
        if (!invoice) {
          return current;
        }
        const nextStatus =
          delivery.status === "accepted" && invoice.status === "draft"
            ? "sent"
            : invoice.status;
        const record: InvoiceDeliveryRecord = {
          ...delivery,
          id: createId(),
          sentAt: new Date().toISOString(),
        };
        return {
          ...current,
          expenses: syncExpenseStatusesForInvoice(
            current.expenses,
            current.invoices,
            invoiceId,
            nextStatus
          ),
          invoices: current.invoices.map((candidate) =>
            candidate.id === invoiceId
              ? {
                  ...candidate,
                  deliveries: [record, ...candidate.deliveries],
                  status: nextStatus,
                }
              : candidate
          ),
        };
      });
    },
    addMatter(input) {
      const normalizedName = normalizeEntryText(input.name, "Untitled matter");
      const existingMatter = state.matters.find(
        (matter) =>
          matter.clientId === input.clientId &&
          matter.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase()
      );
      if (existingMatter) {
        return existingMatter.id;
      }

      const matter: MatterRecord = {
        ...input,
        id: `matter-${slugifyRecordKey(input.name)}-${createId().slice(-6)}`,
        name: normalizedName,
      };

      setState((current) => ({
        ...current,
        matters: [...current.matters, matter],
      }));

      return matter.id;
    },
    getClientLabel(clientId) {
      if (!clientId) {
        return "Unassigned client";
      }

      return (
        state.clients.find((client) => client.id === clientId)?.name ??
        "Unassigned client"
      );
    },
    getEstimatedRateLabel(clientId) {
      const rate = resolveHourlyRate(clientId, "", state);
      return `${formatCurrency(rate)}/hr`;
    },
    getMatterLabel(matterId) {
      if (!matterId) {
        return "Unassigned matter";
      }

      return (
        state.matters.find((matter) => matter.id === matterId)?.name ??
        "Unassigned matter"
      );
    },
    getMattersForClient(clientId) {
      if (!clientId) {
        const activeClientIds = new Set(
          activeClientRecords.map((client) => client.id)
        );
        return matterRecords.filter(
          (matter) =>
            matter.status === "open" && activeClientIds.has(matter.clientId)
        );
      }

      return matterRecords.filter(
        (matter) => matter.clientId === clientId && matter.status === "open"
      );
    },
    getMonthReport(anchorDate) {
      return buildPeriodReport(
        entries.filter((entry) => isEntryInMonth(entry, anchorDate))
      );
    },
    getWeekReport(anchorDate) {
      return buildPeriodReport(
        entries.filter((entry) => isEntryInWeek(entry, anchorDate))
      );
    },
    startTimer(draft) {
      setState((current) => {
        if (current.activeTimer) {
          return current;
        }

        return {
          ...current,
          activeTimer: {
            clientId: draft.clientId,
            clientName: draft.clientName.trim(),
            id: createId(),
            matterId: draft.matterId,
            matterName: draft.matterName.trim(),
            narrative: draft.narrative.trim(),
            startedAt: new Date().toISOString(),
            taskCategory: draft.taskCategory.trim(),
          },
        };
      });
    },
    stopTimer() {
      setState((current) => {
        if (!current.activeTimer) {
          return current;
        }

        const nowIso = new Date().toISOString();
        const startedAt = new Date(current.activeTimer.startedAt);
        const elapsedMinutes = Math.max(
          1,
          Math.round((Date.now() - startedAt.getTime()) / 60000)
        );
        const billedMinutes = roundUpToQuarterHour(elapsedMinutes);

        const entry: TimeEntry = {
          actualMinutes: elapsedMinutes,
          billedMinutes,
          clientId: current.activeTimer.clientId,
          clientName: normalizeEntryText(
            current.activeTimer.clientName,
            "Unassigned client"
          ),
          createdAt: nowIso,
          id: current.activeTimer.id,
          longSession: elapsedMinutes >= 6 * 60,
          matterId: current.activeTimer.matterId,
          matterName: normalizeEntryText(
            current.activeTimer.matterName,
            "Unassigned matter"
          ),
          narrative: normalizeEntryText(
            current.activeTimer.narrative,
            "Untitled timed work session"
          ),
          reviewedAt: null,
          source: "timer",
          startedAt: current.activeTimer.startedAt,
          taskCategory: current.activeTimer.taskCategory.trim(),
          workDate: getLocalDateKey(startedAt),
        };

        return {
          ...current,
          activeTimer: null,
          entries: [entry, ...current.entries],
        };
      });
    },
    toggleEntryReviewed(entryId) {
      setState((current) => ({
        ...current,
        entries: current.entries.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                reviewedAt: entry.reviewedAt ? null : new Date().toISOString(),
              }
            : entry
        ),
      }));
    },
    updateActiveTimer(draft) {
      setState((current) => {
        if (!current.activeTimer) {
          return current;
        }

        return {
          ...current,
          activeTimer: {
            ...current.activeTimer,
            ...draft,
          },
        };
      });
    },
    updateClient(client) {
      setState((current) => {
        const previous = current.clients.find(
          (existing) => existing.id === client.id
        );

        if (!previous) {
          return current;
        }

        return {
          ...current,
          activeTimer:
            current.activeTimer?.clientId === client.id
              ? { ...current.activeTimer, clientName: client.name }
              : current.activeTimer,
          clients: current.clients.map((existing) =>
            existing.id === client.id ? client : existing
          ),
          entries: current.entries.map((entry) =>
            entry.clientId === client.id
              ? { ...entry, clientName: client.name }
              : entry
          ),
          expenses: current.expenses.map((expense) =>
            expense.clientId === client.id
              ? { ...expense, clientName: client.name }
              : expense
          ),
        };
      });
    },
    updateEntry(entry) {
      const canUpdate =
        state.entries.some((candidate) => candidate.id === entry.id) &&
        !isLineItemLinked(state.invoices, entry.id, "time");

      if (!canUpdate) {
        return false;
      }

      setState((current) => {
        if (isLineItemLinked(current.invoices, entry.id, "time")) {
          return current;
        }

        const existing = current.entries.find(
          (candidate) => candidate.id === entry.id
        );
        if (!existing) {
          return current;
        }

        return {
          ...current,
          entries: current.entries.map((candidate) =>
            candidate.id === entry.id
              ? {
                  ...entry,
                  actualMinutes: Math.max(0, Math.round(entry.actualMinutes)),
                  billedMinutes:
                    entry.source === "timer"
                      ? roundUpToQuarterHour(entry.billedMinutes)
                      : Math.max(0, Math.round(entry.billedMinutes)),
                  longSession: entry.actualMinutes >= 6 * 60,
                }
              : candidate
          ),
        };
      });

      return true;
    },
    attachExpenseToInvoice(invoiceId, expenseId) {
      setState((current) => {
        const invoice = current.invoices.find(
          (record) => record.id === invoiceId
        );
        const expense = current.expenses.find(
          (record) => record.id === expenseId
        );

        if (
          !invoice ||
          !expense ||
          expense.kind !== "client" ||
          invoice.status !== "draft" ||
          invoice.lineItems.some(
            (lineItem) =>
              lineItem.kind === "expense" && lineItem.entryId === expenseId
          ) ||
          current.invoices.some(
            (record) =>
              record.id !== invoiceId &&
              record.lineItems.some(
                (lineItem) =>
                  lineItem.kind === "expense" && lineItem.entryId === expenseId
              )
          )
        ) {
          return current;
        }

        return {
          ...current,
          expenses: current.expenses.map((record) =>
            record.id === expenseId
              ? {
                  ...record,
                  status: invoice.status === "sent" ? "submitted" : "pending",
                }
              : record
          ),
          invoices: current.invoices.map((record) =>
            record.id === invoiceId
              ? rebuildInvoiceRecordFromLineItems(
                  {
                    ...record,
                    excludedExpenseIds: record.excludedExpenseIds.filter(
                      (id) => id !== expenseId
                    ),
                  },
                  [...record.lineItems, buildExpenseInvoiceLineItem(expense)]
                )
              : record
          ),
        };
      });
    },
    detachExpenseFromInvoice(invoiceId, expenseId) {
      setState((current) => {
        const invoice = current.invoices.find(
          (record) => record.id === invoiceId
        );

        if (!invoice || invoice.status !== "draft") {
          return current;
        }

        const didContainExpense = invoice.lineItems.some(
          (lineItem) =>
            lineItem.kind === "expense" && lineItem.entryId === expenseId
        );

        if (!didContainExpense) {
          return current;
        }

        return {
          ...current,
          expenses: current.expenses.map((record) =>
            record.id === expenseId && record.kind === "client"
              ? {
                  ...record,
                  status: "pending",
                }
              : record
          ),
          invoices: current.invoices.map((record) =>
            record.id === invoiceId
              ? rebuildInvoiceRecordFromLineItems(
                  {
                    ...record,
                    excludedExpenseIds: [
                      ...new Set([...record.excludedExpenseIds, expenseId]),
                    ],
                  },
                  record.lineItems.filter(
                    (lineItem) =>
                      !(
                        lineItem.kind === "expense" &&
                        lineItem.entryId === expenseId
                      )
                  )
                )
              : record
          ),
        };
      });
    },
    updateExpense(expense) {
      setState((current) => ({
        ...current,
        expenses: current.expenses.map((existing) =>
          existing.id === expense.id ? expense : existing
        ),
      }));
    },
    updateInvoiceNotes(invoiceId, notes) {
      setState((current) => ({
        ...current,
        invoices: current.invoices.map((invoice) =>
          invoice.id === invoiceId
            ? {
                ...invoice,
                notes,
              }
            : invoice
        ),
      }));
    },
    updateInvoiceStatementExport(
      invoiceId,
      statementPdfPath,
      statementExportedAt
    ) {
      setState((current) => ({
        ...current,
        invoices: current.invoices.map((invoice) =>
          invoice.id === invoiceId
            ? {
                ...invoice,
                statementExportedAt,
                statementPdfPath,
              }
            : invoice
        ),
      }));
    },
    updateInvoiceStatus(invoiceId, status) {
      setState((current) => {
        const invoice = current.invoices.find(
          (record) => record.id === invoiceId
        );
        if (!invoice) {
          return current;
        }
        const nextStatus =
          invoice.payments.length > 0 || status === "paid"
            ? invoice.status
            : status;
        return {
          ...current,
          expenses: syncExpenseStatusesForInvoice(
            current.expenses,
            current.invoices,
            invoiceId,
            nextStatus
          ),
          invoices: current.invoices.map((record) =>
            record.id === invoiceId
              ? { ...record, paidOn: null, status: nextStatus }
              : record
          ),
        };
      });
    },
    updateMatter(matter) {
      setState((current) => ({
        ...current,
        activeTimer:
          current.activeTimer?.matterId === matter.id
            ? { ...current.activeTimer, matterName: matter.name }
            : current.activeTimer,
        entries: current.entries.map((entry) =>
          entry.matterId === matter.id
            ? { ...entry, matterName: matter.name }
            : entry
        ),
        expenses: current.expenses.map((expense) =>
          expense.matterId === matter.id
            ? { ...expense, matterName: matter.name }
            : expense
        ),
        matters: current.matters.map((existing) =>
          existing.id === matter.id ? matter : existing
        ),
      }));
    },
    syncInvoiceRecord(candidate) {
      const invoiceToSync = state.invoices.find(
        (invoice) => invoice.id === candidate.existingInvoiceId
      );
      if (
        !candidate.existingInvoiceId ||
        candidate.unreviewedCount > 0 ||
        invoiceToSync?.status !== "draft"
      ) {
        return false;
      }

      setState((current) => ({
        ...current,
        invoices: current.invoices.map((invoice) => {
          if (
            invoice.id !== candidate.existingInvoiceId ||
            invoice.status !== "draft"
          ) {
            return invoice;
          }

          const lineItems = candidate.lineItems.filter(
            (lineItem) =>
              lineItem.kind !== "expense" ||
              !invoice.excludedExpenseIds.includes(lineItem.entryId)
          );
          const rebuilt = rebuildInvoiceRecordFromLineItems(invoice, lineItems);

          return {
            ...rebuilt,
            billingInstructions: candidate.billingInstructions,
            clientAddress: candidate.clientAddress,
            clientName: candidate.clientName,
            contactEmail: candidate.contactEmail,
            contactName: candidate.contactName,
            reviewedCount: candidate.reviewedCount,
            statementExportedAt: null,
            statementPdfPath: null,
            unreviewedCount: candidate.unreviewedCount,
          };
        }),
      }));

      return true;
    },
    updateStatementProfile(statementProfile) {
      setState((current) => ({
        ...current,
        statementProfile,
      }));
    },
    updateAppPreferences(preferences) {
      setState((current) => ({
        ...current,
        appPreferences: {
          ...current.appPreferences,
          ...preferences,
        },
      }));
    },
    updateStandardHourlyRate(rate) {
      setState((current) => ({
        ...current,
        standardHourlyRate: Math.max(0, Math.round(Number(rate) || 0)),
      }));
    },
    async refreshBackupSnapshots() {
      const backups = await listTrackerBackups();
      setBackupSnapshots(backups);
    },
    async restoreBackupSnapshot(backupId) {
      const restored = await restoreTrackerBackup(backupId);

      if (!restored) {
        return false;
      }

      setState(restored.state);
      setBackupSnapshots(restored.backups);
      setPersistenceMode("tauri");
      setIsHydrated(true);

      return true;
    },
  };
}

function buildKnownValues(values: string[], activeValue: string | undefined) {
  return [
    ...new Set(
      [...values, activeValue ?? ""]
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function isLineItemLinked(
  invoices: InvoiceRecord[],
  recordId: string,
  kind: "expense" | "time"
) {
  return invoices.some((invoice) =>
    invoice.lineItems.some(
      (lineItem) => lineItem.kind === kind && lineItem.entryId === recordId
    )
  );
}

function isDateKeyInCurrentMonth(dateKey: string, now: Date) {
  const [year, month] = dateKey.split("-").map(Number);

  return year === now.getFullYear() && month === now.getMonth() + 1;
}

function sortExpensesDescending(expenses: ExpenseRecord[]) {
  return [...expenses].sort((left, right) => {
    const rightKey = `${right.expenseDate}::${right.createdAt}`;
    const leftKey = `${left.expenseDate}::${left.createdAt}`;

    return rightKey.localeCompare(leftKey);
  });
}

function syncExpenseStatusesForInvoice(
  expenses: ExpenseRecord[],
  invoices: InvoiceRecord[],
  invoiceId: string,
  status: InvoiceStatus
) {
  const invoice = invoices.find((record) => record.id === invoiceId);

  if (!invoice) {
    return expenses;
  }

  const linkedExpenseIds = new Set(
    invoice.lineItems
      .filter((lineItem) => lineItem.kind === "expense")
      .map((lineItem) => lineItem.entryId)
  );

  if (linkedExpenseIds.size === 0) {
    return expenses;
  }

  return expenses.map((expense) => {
    if (!linkedExpenseIds.has(expense.id) || expense.kind !== "client") {
      return expense;
    }

    let nextStatus: ExpenseRecord["status"] = expense.status;

    if (status === "paid") {
      nextStatus = "reimbursed";
    } else if (status === "sent" || status === "partial") {
      nextStatus = "submitted";
    } else if (expense.status === "submitted") {
      nextStatus = "pending";
    }

    return {
      ...expense,
      status: nextStatus,
    };
  });
}

function buildExpenseInvoiceLineItem(
  expense: ExpenseRecord
): InvoiceRecord["lineItems"][number] {
  return {
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
}

function rebuildInvoiceRecordFromLineItems(
  invoice: InvoiceRecord,
  lineItems: InvoiceRecord["lineItems"]
): InvoiceRecord {
  const sortedLineItems = sortInvoiceLineItems(lineItems);

  return {
    ...invoice,
    lineItems: sortedLineItems,
    matterSummaries: buildMatterSummaries(sortedLineItems),
    totalAmount: sortedLineItems.reduce(
      (total, lineItem) => total + lineItem.amount,
      0
    ),
    totalBilledMinutes: sortedLineItems.reduce(
      (total, lineItem) => total + lineItem.billedMinutes,
      0
    ),
  };
}

function resolveHourlyRate(
  clientId: string | null,
  clientName: string,
  state: TrackerState
) {
  const matchedClient =
    (clientId
      ? state.clients.find((client) => client.id === clientId)
      : undefined) ??
    state.clients.find((client) => client.name === clientName);

  return matchedClient?.rateOverride ?? state.standardHourlyRate;
}
