import { useState } from "react";

import type { UseTimeTrackerResult } from "@/features/time/useTimeTracker";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Panel } from "@/shared/ui/Panel";
import {
  getThemeGroupForTheme,
  getThemePreviewSwatches,
  themeDefinitions,
  themeGroupOrder,
  themeGroups,
  type ThemeGroupId,
  type ThemeName,
} from "@/theme/themes";
import type { AppAppearance } from "@/types/app";

type SettingsScreenProps = {
  appearance: AppAppearance;
  onColorModeChange: (colorMode: AppAppearance["colorMode"]) => void;
  onThemeChange: (themeName: ThemeName) => void;
  tracker: Pick<
    UseTimeTrackerResult,
    | "appPreferences"
    | "backupSnapshots"
    | "configureBackupExportDirectory"
    | "createManualBackup"
    | "exportBackupNow"
    | "refreshBackupSnapshots"
    | "restoreBackupSnapshot"
    | "statementProfile"
    | "standardHourlyRate"
    | "supportsDesktopBackups"
    | "updateStatementProfile"
    | "updateStandardHourlyRate"
  >;
};

export function SettingsScreen({
  appearance,
  onColorModeChange,
  onThemeChange,
  tracker,
}: SettingsScreenProps) {
  const [activeThemeGroup, setActiveThemeGroup] = useState<ThemeGroupId>(() =>
    getThemeGroupForTheme(appearance.themeName)
  );
  const [profileSaved, setProfileSaved] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupMessageTone, setBackupMessageTone] = useState<
    "success" | "danger"
  >("success");
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isConfiguringBackupExport, setIsConfiguringBackupExport] =
    useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isThemeLibraryOpen, setIsThemeLibraryOpen] = useState(false);
  const [isRefreshingBackups, setIsRefreshingBackups] = useState(false);
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(
    null
  );

  const selectedTheme = themeDefinitions[appearance.themeName];
  const selectedThemeGroup =
    themeGroups[getThemeGroupForTheme(appearance.themeName)];
  const activeThemeGroupDefinition = themeGroups[activeThemeGroup];

  function handleOpenThemeLibrary() {
    setActiveThemeGroup(getThemeGroupForTheme(appearance.themeName));
    setIsThemeLibraryOpen(true);
  }

  function handleThemeSelect(themeName: ThemeName) {
    onThemeChange(themeName);
    setActiveThemeGroup(getThemeGroupForTheme(themeName));
    setIsThemeLibraryOpen(false);
  }

  function handleStatementProfileSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    tracker.updateStatementProfile({
      firmName: `${formData.get("firmName") ?? ""}`.trim(),
      footerNote: `${formData.get("footerNote") ?? ""}`.trim(),
      senderAddress: `${formData.get("senderAddress") ?? ""}`.trim(),
      senderEmail: `${formData.get("senderEmail") ?? ""}`.trim(),
      senderName: `${formData.get("senderName") ?? ""}`.trim(),
      senderPhone: `${formData.get("senderPhone") ?? ""}`.trim(),
      senderTitle: `${formData.get("senderTitle") ?? ""}`.trim(),
    });
    setProfileSaved(true);
  }

  async function handleCreateBackup() {
    if (!tracker.supportsDesktopBackups) {
      setBackupMessageTone("danger");
      setBackupMessage("Backup creation is only available in the desktop app.");
      return;
    }

    setIsCreatingBackup(true);
    setBackupMessage(null);

    try {
      const created = await tracker.createManualBackup();
      setBackupMessageTone(created ? "success" : "danger");
      setBackupMessage(
        created
          ? "Manual backup saved locally."
          : "Unable to create a backup right now."
      );
    } finally {
      setIsCreatingBackup(false);
    }
  }

  async function handleRefreshBackups() {
    if (!tracker.supportsDesktopBackups) {
      setBackupMessageTone("danger");
      setBackupMessage("Backup refresh is only available in the desktop app.");
      return;
    }

    setIsRefreshingBackups(true);
    setBackupMessage(null);

    try {
      await tracker.refreshBackupSnapshots();
      setBackupMessageTone("success");
      setBackupMessage("Backup list refreshed.");
    } finally {
      setIsRefreshingBackups(false);
    }
  }

  async function handleConfigureBackupExport() {
    setIsConfiguringBackupExport(true);
    setBackupMessage(null);
    try {
      const path = await tracker.configureBackupExportDirectory();
      setBackupMessageTone(path ? "success" : "danger");
      setBackupMessage(
        path
          ? `Backup folder connected and an initial copy was exported to ${path}.`
          : "No backup folder was selected."
      );
    } finally {
      setIsConfiguringBackupExport(false);
    }
  }

  async function handleExportBackupNow() {
    setIsExportingBackup(true);
    setBackupMessage(null);
    try {
      const path = await tracker.exportBackupNow();
      setBackupMessageTone(path ? "success" : "danger");
      setBackupMessage(
        path
          ? `Backup exported to ${path}.`
          : "Choose a synced backup folder before exporting."
      );
    } finally {
      setIsExportingBackup(false);
    }
  }

  async function handleRestoreBackup(backupId: string) {
    if (!tracker.supportsDesktopBackups) {
      setBackupMessageTone("danger");
      setBackupMessage("Backup restore is only available in the desktop app.");
      return;
    }

    setRestoringBackupId(backupId);
    setBackupMessage(null);

    try {
      const restored = await tracker.restoreBackupSnapshot(backupId);
      setBackupMessageTone(restored ? "success" : "danger");
      setBackupMessage(
        restored
          ? "Backup restored into local tracker state."
          : "Unable to restore this backup right now."
      );
    } finally {
      setRestoringBackupId(null);
    }
  }

  const statementPreviewLines = [
    tracker.statementProfile.firmName,
    tracker.statementProfile.senderName,
    tracker.statementProfile.senderTitle,
    tracker.statementProfile.senderEmail,
    tracker.statementProfile.senderPhone,
    ...tracker.statementProfile.senderAddress
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  ].filter(Boolean);

  return (
    <div className="screen-grid">
      <PageHeader
        eyebrow="Appearance and backups"
        title="Settings"
        description="Seasonal themes, statement branding, and local backup behaviors all belong here. Summer Light remains the default starting point."
      />

      <Panel
        title="Theme library"
        description="Browse the full theme library by collection, then choose the exact palette you want inside each group."
        actionLabel={`${selectedTheme.label} ${appearance.colorMode}`}
      >
        <div className="settings-theme-summary">
          <div className="theme-card is-selected settings-theme-current">
            <div className="theme-card-header">
              <div>
                <strong>{selectedTheme.label}</strong>
                <div className="theme-card-meta">
                  <span className="records-section-chip">
                    {selectedThemeGroup.label}
                  </span>
                  <span className="detail-text">{selectedTheme.category}</span>
                </div>
              </div>
              <div className="theme-swatch-row" aria-hidden="true">
                {getThemePreviewSwatches(
                  appearance.themeName,
                  appearance.colorMode
                ).map((swatch) => (
                  <span
                    key={swatch}
                    className="theme-swatch"
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </div>
            <span className="theme-card-description">
              {selectedTheme.description}
            </span>
          </div>

          <div className="settings-theme-library-cta">
            <div>
              <div className="eyebrow">Collections</div>
              <h3 className="records-section-title">Grouped theme picker</h3>
              <p className="records-section-copy">
                Open a single chooser with F1, Cities, Traditional, and Seasons,
                then drill into each group to pick the individual theme you
                want.
              </p>
            </div>

            <button
              type="button"
              className="button-primary settings-theme-launch"
              onClick={handleOpenThemeLibrary}
            >
              Open theme library
            </button>
          </div>
        </div>
      </Panel>

      <Panel
        title="Billing rate"
        description="This rate is used whenever a client does not have its own override. Existing invoice snapshots keep the rate used when they were created."
        actionLabel={`${tracker.standardHourlyRate.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}/hr`}
      >
        <form
          className="settings-rate-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            tracker.updateStandardHourlyRate(
              Number(formData.get("standardHourlyRate"))
            );
          }}
        >
          <label className="field">
            <span className="field-label">Standard hourly rate</span>
            <input
              className="text-input"
              defaultValue={tracker.standardHourlyRate}
              min="0"
              name="standardHourlyRate"
              required
              step="1"
              type="number"
            />
          </label>
          <button className="button-primary" type="submit">
            Save standard rate
          </button>
        </form>
      </Panel>

      <Panel
        title="Statement profile"
        description="This sender block and closing note feed the exported statement PDF so the document feels like your actual practice, not a generic app printout."
        actionLabel={profileSaved ? "Saved locally" : "Used in PDF exports"}
      >
        <div className="two-column-grid">
          <form
            className="composer-form"
            onSubmit={handleStatementProfileSubmit}
          >
            <div className="field-grid">
              <label className="field">
                <span className="field-label">Firm or practice name</span>
                <input
                  className="text-input"
                  defaultValue={tracker.statementProfile.firmName}
                  name="firmName"
                  onChange={() => setProfileSaved(false)}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Sender name</span>
                <input
                  className="text-input"
                  defaultValue={tracker.statementProfile.senderName}
                  name="senderName"
                  onChange={() => setProfileSaved(false)}
                />
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                <span className="field-label">Professional title</span>
                <input
                  className="text-input"
                  defaultValue={tracker.statementProfile.senderTitle}
                  name="senderTitle"
                  onChange={() => setProfileSaved(false)}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Email</span>
                <input
                  className="text-input"
                  defaultValue={tracker.statementProfile.senderEmail}
                  name="senderEmail"
                  onChange={() => setProfileSaved(false)}
                />
              </label>
            </div>

            <div className="field-grid">
              <label className="field">
                <span className="field-label">Phone</span>
                <input
                  className="text-input"
                  defaultValue={tracker.statementProfile.senderPhone}
                  name="senderPhone"
                  onChange={() => setProfileSaved(false)}
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Sender address</span>
              <textarea
                className="text-area"
                defaultValue={tracker.statementProfile.senderAddress}
                name="senderAddress"
                onChange={() => setProfileSaved(false)}
                rows={4}
              />
            </label>

            <label className="field">
              <span className="field-label">Client-facing closing note</span>
              <textarea
                className="text-area"
                defaultValue={tracker.statementProfile.footerNote}
                name="footerNote"
                onChange={() => setProfileSaved(false)}
                rows={3}
              />
            </label>

            <div className="button-row">
              <button className="button-primary" type="submit">
                Save statement profile
              </button>
            </div>
          </form>

          <div className="settings-statement-preview">
            <div className="records-section-head">
              <div>
                <div className="eyebrow">Export preview</div>
                <h3 className="records-section-title">PDF sender block</h3>
                <p className="records-section-copy">
                  This is the sender identity and closing note that will appear
                  in exported statements.
                </p>
              </div>
              <div className="records-section-chip">Client-facing</div>
            </div>

            <div className="settings-statement-card">
              <div className="settings-statement-title">
                {tracker.statementProfile.firmName}
              </div>
              <div className="settings-statement-lines">
                {(statementPreviewLines.length > 0
                  ? statementPreviewLines
                  : ["No sender details saved yet."]
                ).map((line) => (
                  <p key={line} className="list-meta">
                    {line}
                  </p>
                ))}
              </div>
              <div className="settings-statement-footer">
                {tracker.statementProfile.footerNote}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="two-column-grid">
        <Panel
          title="Color mode"
          description="Light is the default, but every theme supports a darker workspace."
          actionLabel="Default: Light"
        >
          <div className="mode-toggle" role="group" aria-label="Color mode">
            {(["light", "dark"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`mode-button${appearance.colorMode === mode ? " is-active" : ""}`}
                onClick={() => onColorModeChange(mode)}
              >
                {mode === "light" ? "Light mode" : "Dark mode"}
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          title="Local backups"
          description="Automatic snapshots continue on the operating-system schedule while the app is closed; a synced folder can keep an off-device copy."
          actionLabel={
            tracker.supportsDesktopBackups
              ? "Desktop backups live"
              : "Desktop app required"
          }
        >
          <div className="composer-form">
            <div className="button-row">
              <button
                className="button-primary"
                disabled={!tracker.supportsDesktopBackups || isCreatingBackup}
                type="button"
                onClick={handleCreateBackup}
              >
                {isCreatingBackup ? "Saving backup..." : "Create backup now"}
              </button>
              <button
                className="button-secondary"
                disabled={
                  !tracker.supportsDesktopBackups || isRefreshingBackups
                }
                type="button"
                onClick={handleRefreshBackups}
              >
                {isRefreshingBackups ? "Refreshing..." : "Refresh backup list"}
              </button>
            </div>

            <div className="settings-backup-destination">
              <div>
                <p className="list-row-title">Cloud-synced folder</p>
                <p className="settings-backup-path">
                  {tracker.appPreferences.backupExportDirectory ??
                    "No folder selected. Choose an iCloud Drive, Dropbox, OneDrive, or other synced folder."}
                </p>
              </div>
              <div className="button-row">
                <button
                  className="button-secondary"
                  disabled={
                    !tracker.supportsDesktopBackups || isConfiguringBackupExport
                  }
                  type="button"
                  onClick={handleConfigureBackupExport}
                >
                  {isConfiguringBackupExport
                    ? "Opening folder picker..."
                    : "Choose synced folder"}
                </button>
                <button
                  className="button-secondary"
                  disabled={
                    !tracker.supportsDesktopBackups ||
                    !tracker.appPreferences.backupExportDirectory ||
                    isExportingBackup
                  }
                  type="button"
                  onClick={handleExportBackupNow}
                >
                  {isExportingBackup ? "Exporting..." : "Export backup now"}
                </button>
              </div>
            </div>

            <div className="settings-backup-note">
              {tracker.supportsDesktopBackups
                ? "A six-hour macOS or Windows scheduler copies the latest saved state even when this window is closed. Local snapshots rotate when the app next opens, and the connected folder receives an updated current backup after each save."
                : "The browser preview keeps backup controls visible, but real local backup and restore only run inside the desktop Tauri app."}
            </div>

            {backupMessage ? (
              <div
                className="billing-export-status"
                data-tone={backupMessageTone}
                role="status"
              >
                {backupMessage}
              </div>
            ) : null}

            {tracker.backupSnapshots.length === 0 ? (
              <div className="empty-state">
                No local backup snapshots are available yet.
              </div>
            ) : (
              <div className="settings-backup-list">
                {tracker.backupSnapshots.map((snapshot) => (
                  <article key={snapshot.id} className="settings-backup-card">
                    <div className="settings-backup-card-top">
                      <div>
                        <p className="list-row-title">
                          {snapshot.kind === "automatic"
                            ? "Automatic snapshot"
                            : "Manual snapshot"}
                        </p>
                        <p className="list-meta">
                          {formatBackupTimestamp(snapshot.createdAt)} ·{" "}
                          {formatBackupSize(snapshot.sizeBytes)}
                        </p>
                      </div>
                      <div className="records-section-chip">
                        {snapshot.kind === "automatic" ? "Auto" : "Manual"}
                      </div>
                    </div>

                    <p className="settings-backup-path">{snapshot.path}</p>

                    <div className="button-row">
                      <button
                        className="button-secondary"
                        disabled={
                          !tracker.supportsDesktopBackups ||
                          restoringBackupId === snapshot.id
                        }
                        type="button"
                        onClick={() => handleRestoreBackup(snapshot.id)}
                      >
                        {restoringBackupId === snapshot.id
                          ? "Restoring..."
                          : "Restore this backup"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>

      {isThemeLibraryOpen ? (
        <div
          className="settings-theme-modal-backdrop"
          role="presentation"
          onClick={() => setIsThemeLibraryOpen(false)}
        >
          <div
            aria-labelledby="theme-library-title"
            aria-modal="true"
            className="settings-theme-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-theme-modal-top">
              <div>
                <div className="eyebrow">Theme library</div>
                <h3 className="records-section-title" id="theme-library-title">
                  Choose a theme collection
                </h3>
                <p className="records-section-copy">
                  Start with a group, then choose the specific palette inside
                  it. Summer Light stays the default starting point.
                </p>
              </div>

              <button
                type="button"
                className="button-secondary"
                onClick={() => setIsThemeLibraryOpen(false)}
              >
                Close
              </button>
            </div>

            <div
              className="settings-theme-group-list"
              role="tablist"
              aria-label="Theme groups"
            >
              {themeGroupOrder.map((groupId) => {
                const group = themeGroups[groupId];

                return (
                  <button
                    key={groupId}
                    type="button"
                    role="tab"
                    aria-selected={activeThemeGroup === groupId}
                    className={`settings-theme-group-button${activeThemeGroup === groupId ? " is-active" : ""}`}
                    onClick={() => setActiveThemeGroup(groupId)}
                  >
                    <span className="settings-theme-group-label">
                      {group.label}
                    </span>
                    <span className="settings-theme-group-detail">
                      {group.themes.length} themes
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="settings-theme-library-copy">
              <div>
                <div className="eyebrow">
                  {activeThemeGroupDefinition.label}
                </div>
                <p className="records-section-copy">
                  {activeThemeGroupDefinition.description}
                </p>
              </div>
            </div>

            <div className="settings-theme-grid">
              {activeThemeGroupDefinition.themes.map((themeName) => {
                const theme = themeDefinitions[themeName];

                return (
                  <button
                    key={themeName}
                    type="button"
                    className={`theme-card${appearance.themeName === themeName ? " is-selected" : ""}`}
                    onClick={() => handleThemeSelect(themeName)}
                  >
                    <div className="theme-card-header">
                      <div>
                        <strong>{theme.label}</strong>
                        <div className="theme-card-meta">
                          <span className="records-section-chip">
                            {theme.category}
                          </span>
                        </div>
                      </div>
                      <div className="theme-swatch-row" aria-hidden="true">
                        {getThemePreviewSwatches(
                          themeName,
                          appearance.colorMode
                        ).map((swatch) => (
                          <span
                            key={swatch}
                            className="theme-swatch"
                            style={{ backgroundColor: swatch }}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="theme-card-description">
                      {theme.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatBackupTimestamp(createdAt: number) {
  return new Date(createdAt).toLocaleString();
}

function formatBackupSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
