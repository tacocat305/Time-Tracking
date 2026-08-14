import { invoke, isTauri } from "@tauri-apps/api/core";

type SendInvoiceEmailPayload = {
  body: string;
  pdfPath: string;
  recipient: string;
  subject: string;
};

export type SendInvoiceEmailResponse = {
  message: string;
  status: "accepted";
  transport: string;
};

export function canSendInvoiceEmail() {
  return isTauri();
}

export async function sendInvoiceEmail(payload: SendInvoiceEmailPayload) {
  return await invoke<SendInvoiceEmailResponse>("send_invoice_email", {
    payload,
  });
}
