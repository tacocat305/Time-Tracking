export type TimeEntrySource = "manual" | "timer";
export type ClientStatus = "active" | "archived";
export type MatterStatus = "open" | "closed" | "archived";
export type InvoiceStatus = "draft" | "sent" | "partial" | "paid";
export type PaymentMethod = "ach" | "card" | "cash" | "check" | "other";
export type BackupSnapshotKind = "automatic" | "manual";
export type ExpenseKind = "business" | "client";
export type ExpenseStatus = "internal" | "pending" | "submitted" | "reimbursed";
export type InvoiceLineItemKind = "expense" | "time";

export interface AppPreferences {
  backupExportDirectory: string | null;
  colorMode: "light" | "dark";
  themeName: string;
}

export interface StatementProfile {
  firmName: string;
  footerNote: string;
  senderAddress: string;
  senderEmail: string;
  senderName: string;
  senderPhone: string;
  senderTitle: string;
}

export interface BackupSnapshotRecord {
  createdAt: number;
  id: string;
  kind: BackupSnapshotKind;
  path: string;
  sizeBytes: number;
}

export interface ExpenseRecord {
  amount: number;
  category: string;
  clientId: string | null;
  clientName: string;
  createdAt: string;
  expenseDate: string;
  id: string;
  kind: ExpenseKind;
  matterId: string | null;
  matterName: string;
  notes: string;
  payee: string;
  receiptPath: string | null;
  status: ExpenseStatus;
  summary: string;
  taxCategory: string;
  taxDeductible: boolean;
}

export interface ClientRecord {
  address: string;
  billingInstructions: string;
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  id: string;
  name: string;
  notes: string;
  rateOverride: number | null;
  status: ClientStatus;
}

export interface MatterRecord {
  clientId: string;
  defaultTaskCategory: string;
  description: string;
  id: string;
  name: string;
  notes: string;
  status: MatterStatus;
}

export interface InvoiceLineItem {
  amount: number;
  billedMinutes: number;
  category: string;
  entryId: string;
  kind: InvoiceLineItemKind;
  matterId: string | null;
  matterName: string;
  narrative: string;
  payee: string;
  taskCategory: string;
  workDate: string;
}

export interface InvoiceMatterSummary {
  amount: number;
  entryCount: number;
  matterId: string | null;
  matterName: string;
  totalBilledMinutes: number;
}

export interface InvoiceRecord {
  billingInstructions: string;
  clientAddress: string;
  clientId: string | null;
  clientName: string;
  contactEmail: string;
  contactName: string;
  deliveries: InvoiceDeliveryRecord[];
  excludedExpenseIds: string[];
  id: string;
  issuedOn: string;
  lineItems: InvoiceLineItem[];
  matterSummaries: InvoiceMatterSummary[];
  notes: string;
  paidOn: string | null;
  payments: PaymentRecord[];
  periodKey: string;
  periodLabel: string;
  reviewedCount: number;
  statementExportedAt: string | null;
  statementPdfPath: string | null;
  statementNumber: string;
  status: InvoiceStatus;
  totalAmount: number;
  totalBilledMinutes: number;
  unreviewedCount: number;
}

export interface InvoiceDeliveryRecord {
  id: string;
  message: string;
  recipient: string;
  sentAt: string;
  status: "accepted" | "failed";
  subject: string;
  transport: string;
}

export interface PaymentRecord {
  amount: number;
  createdAt: string;
  id: string;
  method: PaymentMethod;
  notes: string;
  paymentDate: string;
  reference: string;
}

export interface PaymentRecordInput {
  amount: number;
  method: PaymentMethod;
  notes: string;
  paymentDate: string;
  reference: string;
}

export interface TimeEntry {
  actualMinutes: number;
  billedMinutes: number;
  clientId: string | null;
  clientName: string;
  createdAt: string;
  id: string;
  longSession: boolean;
  matterId: string | null;
  matterName: string;
  narrative: string;
  reviewedAt: string | null;
  source: TimeEntrySource;
  startedAt: string | null;
  taskCategory: string;
  workDate: string;
}

export interface ActiveTimer {
  clientId: string | null;
  clientName: string;
  id: string;
  matterId: string | null;
  matterName: string;
  narrative: string;
  startedAt: string;
  taskCategory: string;
}

export interface TrackerState {
  activeTimer: ActiveTimer | null;
  appPreferences: AppPreferences;
  clients: ClientRecord[];
  entries: TimeEntry[];
  expenses: ExpenseRecord[];
  invoices: InvoiceRecord[];
  matters: MatterRecord[];
  standardHourlyRate: number;
  statementProfile: StatementProfile;
}

export interface TimerDraft {
  clientId: string | null;
  clientName: string;
  matterId: string | null;
  matterName: string;
  narrative: string;
  taskCategory: string;
}

export interface ManualEntryInput extends TimerDraft {
  billedHours: number;
  workDate: string;
}

export interface TimeSummary {
  entryCount: number;
  estimatedValue: number;
  longEntryCount: number;
  reviewedCount: number;
  totalActualMinutes: number;
  totalBilledMinutes: number;
  unreviewedCount: number;
}

export interface MatterBreakdown {
  clientName: string;
  entryCount: number;
  estimatedValue: number;
  matterName: string;
  totalBilledMinutes: number;
  unreviewedCount: number;
}

export interface ClientRecordInput {
  address: string;
  billingInstructions: string;
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  name: string;
  notes: string;
  rateOverride: number | null;
  status: ClientStatus;
}

export interface MatterRecordInput {
  clientId: string;
  defaultTaskCategory: string;
  description: string;
  name: string;
  notes: string;
  status: MatterStatus;
}

export interface ExpenseRecordInput {
  amount: number;
  category: string;
  clientId: string | null;
  clientName: string;
  expenseDate: string;
  kind: ExpenseKind;
  matterId: string | null;
  matterName: string;
  notes: string;
  payee: string;
  receiptPath: string | null;
  status: ExpenseStatus;
  summary: string;
  taxCategory: string;
  taxDeductible: boolean;
}
