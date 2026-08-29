# Production Readiness

## Complete Local Workflows

The app is usable as a single-user, local desktop time-and-billing workspace. Time, clients, matters, expenses, review state, invoice snapshots, payment records, preferences, and backups persist locally. Records included on invoices are protected from accidental source edits, and draft invoices can be refreshed or intentionally deleted.

- **Professional time entry:** manual entry accepts direct decimal hours without quarter-hour rounding, requires a client, matter, date, and client-facing narrative, supports Command/Ctrl+Enter, preserves matter context between entries, confirms backdated saves, and remains editable from Week and Month until invoiced.
- **Reference invoice PDF:** invoices use the supplied Krewson Law logo, embedded system Arial, US-letter geometry, measured source coordinates and colors, detailed activity rows, decimal-hour quantities, continuation pages, and the subtotal/tax/payment/amount-due block from `invoice_26-006.pdf`. New invoices use the reference-style `YY-NNN` sequence; draft number and issue date remain editable before sending.
- **Invoice release checks:** PDF export is blocked until the invoice has a number, valid issue date, billing address, positive line items, and complete firm address/phone details. Changing draft metadata clears the stale exported-file reference so the next PDF is authoritative.
- **Invoice email handoff:** macOS sends the generated PDF through Apple Mail and Windows uses Microsoft Outlook. Accepted and failed attempts retain recipient, subject, timestamp, transport, and result. Draft invoices advance to Sent only after the mail client accepts the message.
- **Payment reconciliation:** invoices retain individual payment records with date, amount, method, reference, and notes. Partial and full balances update status automatically; payment reversal recalculates the invoice and its linked client expenses. The PDF uses the reconciled amount paid and open balance.
- **Automatic backups:** the app maintains rotating local snapshots and registers a six-hour macOS LaunchAgent or Windows Scheduled Task that copies the latest valid backup envelope while the app window is closed.
- **Backup portability:** Settings can select an iCloud Drive, Dropbox, OneDrive, or other synced folder. The app writes a current backup after saves and can create timestamped exports on demand.
- **Local privacy controls:** Settings can encrypt tracker state, local snapshots, background backup sources, and synced-folder backup envelopes with a passphrase-derived key. The workspace requires the passphrase after relaunch, supports immediate manual locking, and locks after 15 minutes without keyboard, pointer, or focus activity.
- **Backup integrity checks:** every listed local snapshot can be decrypted and structurally validated without replacing live data. The result reports the time-entry, client, expense, and invoice counts found in that snapshot.
- **Historical reporting:** Week and Month support previous, next, and return-to-current navigation. Entries, values, review totals, alerts, and matter breakdowns recalculate for the selected period, and unlocked historical entries can be corrected directly from either review screen.
- **Expense records:** client and business expenses support managed PDF/image receipts, receipt opening/replacement/removal, tax categories, deductible flags, yearly summaries, and accountant-ready CSV exports.
- **Windows release gate:** a native `windows-latest` workflow runs frontend and Rust checks, imports a PFX certificate, creates NSIS and MSI installers, verifies Authenticode signatures, launch-tests the executable, and uploads only verified artifacts.

## Wired But Not Fully Usable Yet

- **Recipient inbox verification:** the app verifies that Apple Mail or Outlook accepted the message. Confirmed inbox delivery, bounce events, and open tracking require a mail provider API and delivery webhooks. The interface labels this distinction explicitly.
- **Online payment processing:** the local payment ledger and reconciliation model are complete, but the app does not yet create card or ACH checkout sessions. A processor account and provider choice are required before live payment controls can be safely enabled.
- **Signed Windows download:** the repository build/sign/test workflow is ready, but no signed installer exists until it is supplied with a code-signing `.pfx` certificate and password.
- **Tax filing forms:** tax categories, yearly totals, receipts, and CSV export are operational bookkeeping tools. The app does not prepare or electronically file tax returns.
- **Credential recovery:** the local encryption passphrase is intentionally not stored or recoverable. The user must retain it in a trusted password manager; losing it makes protected state and backup envelopes inaccessible.
- **Exported-file encryption:** generated invoice PDFs, expense CSV exports, and managed receipt attachments remain standard files so they can be opened by other applications. Their confidentiality depends on operating-system disk encryption, device access controls, and the permissions of any synced folder.
- **macOS distribution signing:** local macOS builds run for direct testing, but public distribution still requires an Apple Developer ID certificate and notarization.
- **Sustained pilot validation:** automated checks cover record workflows, encryption, backup restore, PDFs, receipts, and platform builds. A seven-day real-data pilot with daily backup verification remains the final operational gate before treating the app as the only contemporaneous time record.

## Intentionally Out Of Scope

Multi-user collaboration, AI assistance, accounting-platform sync, bank feeds, and automatic overdue collection remain out of v1. They are not presented as working features.

## One-Person Rollout Checklist

1. Enable FileVault on macOS or BitLocker/device encryption on Windows and require an operating-system login password.
2. Enable local protection in Settings and store the passphrase in a trusted password manager before locking the workspace.
3. Choose a private synced backup folder, create a manual snapshot, and use **Verify without restoring**.
4. Enter the real client profile and rate, create representative time and expense records, and compare one generated invoice with the source records.
5. Keep the prior time-record system available during a seven-day parallel pilot and compare daily and monthly totals.
6. Use only a signed installer for broader Windows distribution once the code-signing certificate is configured.
