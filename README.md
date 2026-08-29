# Legal Time Tracker

A private, local-first desktop workspace for legal time, client expenses, monthly invoices, and payment follow-up.

## Working Features

- primary manual-entry workflow with decimal-hour input, validation, keyboard save, reusable matter context, and an optional live timer
- quarter-hour billing with actual timer duration retained separately
- client and matter records, client rate overrides, and safe client archiving
- daily summaries plus navigable historical week and month reports with in-place historical editing
- editable time and expense records until they become part of an invoice, then consistent record locking
- monthly invoice drafts built from reviewed time and reimbursable expenses
- receipt-backed expenses with tax categories, yearly summaries, and CSV export
- reconciled partial/full payment records with automatic invoice balances
- reference-matched invoice PDFs with embedded Arial, measured source geometry/colors, the Krewson Law logo, sequential `YY-NNN` numbers, and editable draft issue metadata
- native invoice email through Apple Mail or Outlook with delivery-attempt history
- automatic closed-app scheduling, manual restore, and synced-folder backup export
- passphrase-based local encryption, launch-time unlock, and 15-minute inactivity locking
- backup integrity checks that decrypt and validate snapshots without restoring them
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

Windows tester installers are built automatically on `main`. Version tags also
publish the launch-tested `.exe` and `.msi` to the repository's
[Releases page](https://github.com/tacocat305/Time-Tracking/releases) with
checksums. See [Windows installation](./docs/windows-installation.md) for the
recipient guide and [Windows release](./docs/windows-release.md) for signing and
maintainer details.

## Data

Desktop state is stored as a cross-platform JSON document in Tauri's application data directory. Once local protection is enabled in Settings, app state and tracker backup envelopes use Argon2id-derived XChaCha20-Poly1305 encryption. The encryption key remains in process memory only while the workspace is unlocked. Writes are committed through a temporary file, and the macOS build performs a one-time migration from the earlier SQLite payload if present.

The passphrase cannot be recovered. Generated invoice PDFs, expense CSV exports, and managed receipt files remain normal files so they can be opened and shared; protect those with the operating system's disk encryption, account password, and appropriate cloud-folder permissions.

See [production-readiness.md](./docs/production-readiness.md) for the remaining partial workflows and release risks.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE).
