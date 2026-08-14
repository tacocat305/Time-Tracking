# Legal Time Tracker

A private, local-first desktop workspace for legal time, client expenses, monthly invoices, and payment follow-up.

## Working Features

- manual time entry and an optional live timer
- quarter-hour billing with actual timer duration retained separately
- client and matter records, client rate overrides, and safe client archiving
- daily summaries plus navigable historical week and month reports
- editable time and expense records until they become part of an invoice
- monthly invoice drafts built from reviewed time and reimbursable expenses
- receipt-backed expenses with tax categories, yearly summaries, and CSV export
- reconciled partial/full payment records with automatic invoice balances
- reference-matched invoice PDFs with embedded Arial and the Krewson Law logo
- native invoice email through Apple Mail or Outlook with delivery-attempt history
- automatic closed-app scheduling, manual restore, and synced-folder backup export
- persisted app-wide rate, statement identity, seasonal themes, and light/dark mode

New installs begin empty. Older fictional seed records and invoices derived solely from those records are removed during state normalization, while real user-created time and invoice history is preserved.

## Desktop Development

Requirements: Node.js with Corepack, Rust, and the Tauri v2 platform prerequisites.

```bash
corepack pnpm install
corepack pnpm tauri dev
```

Verification:

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm lint:rust
```

Build the macOS application and disk image with:

```bash
corepack pnpm tauri build
```

Windows tester installers are built automatically on `main`. Signed-release
workflow and certificate requirements are documented in
[windows-release.md](./docs/windows-release.md).

## Data

Desktop state is stored as a cross-platform JSON document in Tauri's application data directory. Writes are committed through a temporary file, and the macOS build performs a one-time migration from the earlier SQLite payload if present. Backup snapshots are stored alongside the application data.

See [production-readiness.md](./docs/production-readiness.md) for the remaining partial workflows and release risks.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE).
