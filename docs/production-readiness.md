# Production Readiness

## Complete Local Workflows

The app is usable as a single-user, local desktop time-and-billing workspace. Time, clients, matters, expenses, review state, invoice snapshots, payment records, preferences, and backups persist locally. Records included on invoices are protected from accidental source edits, and draft invoices can be refreshed or intentionally deleted.

- **Reference invoice PDF:** invoices use the supplied Krewson Law logo, embedded system Arial, US-letter geometry, the reference blue accent, detailed activity rows, decimal-hour quantities, continuation pages, and the subtotal/tax/payment/amount-due block from `invoice_26-006.pdf`.
- **Invoice email handoff:** macOS sends the generated PDF through Apple Mail and Windows uses Microsoft Outlook. Accepted and failed attempts retain recipient, subject, timestamp, transport, and result. Draft invoices advance to Sent only after the mail client accepts the message.
- **Payment reconciliation:** invoices retain individual payment records with date, amount, method, reference, and notes. Partial and full balances update status automatically; payment reversal recalculates the invoice and its linked client expenses. The PDF uses the reconciled amount paid and open balance.
- **Automatic backups:** the app maintains rotating local snapshots and registers a six-hour macOS LaunchAgent or Windows Scheduled Task that copies the latest valid backup envelope while the app window is closed.
- **Backup portability:** Settings can select an iCloud Drive, Dropbox, OneDrive, or other synced folder. The app writes a current backup after saves and can create timestamped exports on demand.
- **Historical reporting:** Week and Month support previous, next, and return-to-current navigation. Entries, values, review totals, alerts, and matter breakdowns recalculate for the selected period.
- **Expense records:** client and business expenses support managed PDF/image receipts, receipt opening/replacement/removal, tax categories, deductible flags, yearly summaries, and accountant-ready CSV exports.
- **Windows release gate:** a native `windows-latest` workflow runs frontend and Rust checks, imports a PFX certificate, creates NSIS and MSI installers, verifies Authenticode signatures, launch-tests the executable, and uploads only verified artifacts.

## Wired But Not Fully Usable Yet

- **Recipient inbox verification:** the app verifies that Apple Mail or Outlook accepted the message. Confirmed inbox delivery, bounce events, and open tracking require a mail provider API and delivery webhooks. The interface labels this distinction explicitly.
- **Online payment processing:** the local payment ledger and reconciliation model are complete, but the app does not yet create card or ACH checkout sessions. A processor account and provider choice are required before live payment controls can be safely enabled.
- **Signed Windows download:** the build/sign/test workflow is ready, but no signed installer exists until the project is connected to GitHub (or another Windows runner) and supplied with a code-signing `.pfx` certificate and password.
- **Tax filing forms:** tax categories, yearly totals, receipts, and CSV export are operational bookkeeping tools. The app does not prepare or electronically file tax returns.

## Intentionally Out Of Scope

Multi-user collaboration, AI assistance, accounting-platform sync, bank feeds, and automatic overdue collection remain out of v1. They are not presented as working features.
