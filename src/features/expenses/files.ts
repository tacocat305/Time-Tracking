import { invoke, isTauri } from "@tauri-apps/api/core";

import type { ExpenseRecord } from "@/features/time/types";

type ExpenseFileResponse = {
  path: string;
};

export async function attachReceipt(expenseId: string) {
  if (!isTauri()) {
    return null;
  }
  try {
    return await invoke<ExpenseFileResponse | null>("attach_expense_receipt", {
      expenseId,
    });
  } catch {
    return null;
  }
}

export async function openReceipt(path: string) {
  if (!isTauri()) {
    return false;
  }
  try {
    await invoke("open_expense_receipt", { path });
    return true;
  } catch {
    return false;
  }
}

export async function removeReceipt(path: string) {
  if (!isTauri()) {
    return false;
  }
  try {
    await invoke("remove_expense_receipt", { path });
    return true;
  } catch {
    return false;
  }
}

export async function exportExpenseCsv(
  expenses: ExpenseRecord[],
  taxYear: number | null
) {
  if (!isTauri()) {
    return null;
  }
  try {
    return await invoke<ExpenseFileResponse>("export_expenses_csv", {
      payload: { expenses, taxYear },
    });
  } catch {
    return null;
  }
}

export async function openExpenseExport(path: string) {
  if (!isTauri()) {
    return false;
  }
  try {
    await invoke("open_expense_export", { path });
    return true;
  } catch {
    return false;
  }
}
