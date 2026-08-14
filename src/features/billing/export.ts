import { invoke, isTauri } from "@tauri-apps/api/core";

import type { InvoiceRecord, StatementProfile } from "@/features/time/types";

type ExportInvoicePdfResponse = {
  path: string;
};

export async function exportInvoicePdf(
  invoice: InvoiceRecord,
  statementProfile: StatementProfile
) {
  if (!isTauri()) {
    throw new Error("PDF export is only available in the desktop app.");
  }

  const response = await invoke<ExportInvoicePdfResponse>(
    "export_invoice_pdf",
    {
      payload: {
        invoice,
        statementProfile,
      },
    }
  );

  return response.path;
}

export async function openInvoicePdf(path: string) {
  if (!isTauri()) {
    throw new Error("PDF opening is only available in the desktop app.");
  }

  await invoke("open_invoice_pdf", { path });
}

export async function revealInvoicePdf(path: string) {
  if (!isTauri()) {
    throw new Error("PDF reveal is only available in the desktop app.");
  }

  await invoke("reveal_invoice_pdf", { path });
}

export function canExportInvoicePdf() {
  return isTauri();
}
