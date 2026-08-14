import { useState } from "react";

import type { ManualEntryInput, TimeEntry } from "@/features/time/types";
import type { UseTimeTrackerResult } from "@/features/time/useTimeTracker";
import {
  formatCurrency,
  formatHours,
  formatTimeOfDay,
  getEntrySourceLabel,
  getLocalDateKey,
  isReviewed,
  roundUpToQuarterHour,
} from "@/features/time/utils";

type TodayScreenProps = {
  tracker: UseTimeTrackerResult;
};

type ManualEntryDraft = Omit<ManualEntryInput, "billedHours"> & {
  billedHours: string;
};

export function TodayScreen({ tracker }: TodayScreenProps) {
  const [manualDraft, setManualDraft] = useState<ManualEntryDraft>(
    createInitialManualEntry
  );
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const manualMatters = tracker.getMattersForClient(manualDraft.clientId);
  const editingEntry =
    tracker.todayEntries.find((entry) => entry.id === editingEntryId) ?? null;
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function handleManualDraftChange<K extends keyof ManualEntryDraft>(
    field: K,
    value: ManualEntryDraft[K]
  ) {
    setManualDraft((current) => ({ ...current, [field]: value }));
  }

  function handleActiveTimerClientSelect(clientId: string) {
    const selectedClient =
      tracker.clientRecords.find((client) => client.id === clientId) ?? null;
    const keepMatter =
      tracker.activeTimer?.matterId &&
      tracker
        .getMattersForClient(clientId)
        .some((matter) => matter.id === tracker.activeTimer?.matterId);

    tracker.updateActiveTimer({
      clientId: selectedClient?.id ?? null,
      clientName: selectedClient?.name ?? "",
      matterId: keepMatter ? tracker.activeTimer?.matterId : null,
      matterName: keepMatter ? tracker.activeTimer?.matterName : "",
    });
  }

  function handleActiveTimerMatterSelect(matterId: string) {
    const selectedMatter =
      tracker.matterRecords.find((matter) => matter.id === matterId) ?? null;
    const selectedClient = selectedMatter
      ? (tracker.clientRecords.find(
          (client) => client.id === selectedMatter.clientId
        ) ?? null)
      : null;

    tracker.updateActiveTimer({
      clientId: selectedClient?.id ?? tracker.activeTimer?.clientId ?? null,
      clientName: selectedClient?.name ?? tracker.activeTimer?.clientName ?? "",
      matterId: selectedMatter?.id ?? null,
      matterName: selectedMatter?.name ?? "",
      taskCategory:
        tracker.activeTimer?.taskCategory ||
        selectedMatter?.defaultTaskCategory ||
        "",
    });
  }

  function handleManualClientSelect(clientId: string) {
    const selectedClient =
      tracker.clientRecords.find((client) => client.id === clientId) ?? null;

    setManualDraft((current) => {
      const shouldKeepMatter =
        current.matterId &&
        tracker
          .getMattersForClient(clientId)
          .some((matter) => matter.id === current.matterId);

      return {
        ...current,
        clientId: selectedClient?.id ?? null,
        clientName: selectedClient?.name ?? "",
        matterId: shouldKeepMatter ? current.matterId : null,
        matterName: shouldKeepMatter ? current.matterName : "",
      };
    });
  }

  function handleManualMatterSelect(matterId: string) {
    const selectedMatter =
      tracker.matterRecords.find((matter) => matter.id === matterId) ?? null;
    const selectedClient = selectedMatter
      ? (tracker.clientRecords.find(
          (client) => client.id === selectedMatter.clientId
        ) ?? null)
      : null;

    setManualDraft((current) => ({
      ...current,
      clientId: selectedClient?.id ?? current.clientId,
      clientName: selectedClient?.name ?? current.clientName,
      matterId: selectedMatter?.id ?? null,
      matterName: selectedMatter?.name ?? "",
      taskCategory:
        current.taskCategory || selectedMatter?.defaultTaskCategory || "",
    }));
  }

  function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const billedHours = Number(manualDraft.billedHours);
    if (!Number.isFinite(billedHours) || billedHours <= 0) {
      return;
    }

    tracker.addManualEntry({
      ...manualDraft,
      billedHours,
    });
    setManualDraft(createInitialManualEntry());
  }

  return (
    <div className="modern-today-screen">
      <section className="modern-today-workspace">
        <div className="modern-entry-editor">
          <div className="modern-workspace-heading">
            <h2>New time entry</h2>
            <span>Manual entry</span>
          </div>

          {tracker.activeTimer ? (
            <section
              className="active-timer-editor"
              aria-label="Active timer details"
            >
              <div className="active-timer-editor-head">
                <div>
                  <strong>Timer running</strong>
                  <span>
                    Started {formatTimeOfDay(tracker.activeTimer.startedAt)}
                  </span>
                </div>
                <button
                  className="button-secondary"
                  type="button"
                  onClick={tracker.stopTimer}
                >
                  Stop and save
                </button>
              </div>
              <div className="compact-field-grid">
                <label className="field">
                  <span className="field-label">Timer client</span>
                  <select
                    className="text-input"
                    value={tracker.activeTimer.clientId ?? ""}
                    onChange={(event) =>
                      handleActiveTimerClientSelect(event.currentTarget.value)
                    }
                  >
                    <option value="">Assign later</option>
                    {tracker.activeClientRecords.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Timer matter</span>
                  <select
                    className="text-input"
                    value={tracker.activeTimer.matterId ?? ""}
                    onChange={(event) =>
                      handleActiveTimerMatterSelect(event.currentTarget.value)
                    }
                  >
                    <option value="">Assign later</option>
                    {tracker
                      .getMattersForClient(tracker.activeTimer.clientId)
                      .map((matter) => (
                        <option key={matter.id} value={matter.id}>
                          {matter.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </section>
          ) : null}

          <form className="modern-entry-form" onSubmit={handleManualSubmit}>
            <label className="field">
              <span className="field-label">Client</span>
              <select
                className="text-input"
                name="manual-client"
                value={manualDraft.clientId ?? ""}
                onChange={(event) =>
                  handleManualClientSelect(event.currentTarget.value)
                }
              >
                <option value="">Search or select client...</option>
                {tracker.activeClientRecords.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Matter</span>
              <select
                className="text-input"
                name="manual-matter"
                value={manualDraft.matterId ?? ""}
                onChange={(event) =>
                  handleManualMatterSelect(event.currentTarget.value)
                }
              >
                <option value="">Search or select matter...</option>
                {manualMatters.map((matter) => (
                  <option key={matter.id} value={matter.id}>
                    {matter.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="modern-date-hours-grid">
              <label className="field">
                <span className="field-label">Date</span>
                <input
                  className="text-input"
                  name="manual-work-date"
                  type="date"
                  value={manualDraft.workDate}
                  onChange={(event) =>
                    handleManualDraftChange(
                      "workDate",
                      event.currentTarget.value
                    )
                  }
                />
              </label>
              <label className="field">
                <span className="field-label">Billable hours</span>
                <input
                  className="text-input"
                  inputMode="decimal"
                  name="manual-billed-hours"
                  pattern="[0-9]*\.?[0-9]+"
                  required
                  type="text"
                  value={manualDraft.billedHours}
                  onChange={(event) =>
                    handleManualDraftChange(
                      "billedHours",
                      event.currentTarget.value
                    )
                  }
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Task / Category</span>
              <input
                className="text-input"
                list="task-category-options"
                name="manual-task-category"
                placeholder="Select task or category..."
                value={manualDraft.taskCategory}
                onChange={(event) =>
                  handleManualDraftChange(
                    "taskCategory",
                    event.currentTarget.value
                  )
                }
              />
            </label>

            <label className="field modern-narrative-field">
              <span className="field-label">Narrative</span>
              <textarea
                aria-label="Narrative"
                className="text-area"
                name="manual-narrative"
                placeholder="Describe the work performed..."
                rows={5}
                value={manualDraft.narrative}
                onChange={(event) =>
                  handleManualDraftChange(
                    "narrative",
                    event.currentTarget.value
                  )
                }
              />
              <span className="character-count">
                {manualDraft.narrative.length} / 4000
              </span>
            </label>

            <button
              aria-label="Save manual entry"
              className="modern-add-entry-button"
              type="submit"
            >
              <span aria-hidden="true">＋</span>
              Add entry
              <kbd>⌘ ↵</kbd>
            </button>
          </form>
        </div>

        <div className="modern-activity-panel">
          <div className="modern-activity-header">
            <h2>{todayLabel}</h2>
            <span>Today’s activity</span>
          </div>

          {tracker.todayEntries.length === 0 ? (
            <div className="modern-empty-activity empty-state">
              <span className="empty-timeline-mark" aria-hidden="true" />
              <strong>Your day is ready.</strong>
              <p>
                No entries yet today. Start a timer or save a manual entry and
                it will appear here immediately.
              </p>
            </div>
          ) : (
            <ol className="modern-activity-list">
              {tracker.todayEntries.map((entry) => (
                <li key={entry.id} className="modern-activity-row">
                  <div className="activity-time">
                    {formatTimeOfDay(entry.createdAt)}
                  </div>
                  <span className="activity-timeline-dot" aria-hidden="true" />
                  <div className="activity-entry-content">
                    <div className="activity-entry-heading">
                      <div>
                        <strong>
                          {entry.clientName || "Unassigned client"}
                        </strong>
                        <span>{entry.matterName || "Unassigned matter"}</span>
                      </div>
                      <div className="activity-entry-actions">
                        <button
                          aria-label={
                            tracker.isEntryLocked(entry.id)
                              ? "Invoiced"
                              : "Edit"
                          }
                          className="icon-action"
                          disabled={tracker.isEntryLocked(entry.id)}
                          type="button"
                          onClick={() => setEditingEntryId(entry.id)}
                        >
                          ✎
                        </button>
                        <button
                          aria-label="Delete"
                          className="icon-action"
                          disabled={tracker.isEntryLocked(entry.id)}
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Delete this time entry? This cannot be undone."
                              )
                            ) {
                              tracker.deleteEntry(entry.id);
                            }
                          }}
                        >
                          ⋮
                        </button>
                      </div>
                    </div>
                    <p className="activity-narrative">
                      {entry.narrative || "No narrative entered."}
                    </p>
                    <div className="activity-entry-footer">
                      <div>
                        {entry.taskCategory ? (
                          <span className="activity-category">
                            {entry.taskCategory}
                          </span>
                        ) : null}
                        <span className="activity-source">
                          {getEntrySourceLabel(entry.source)}
                        </span>
                      </div>
                      <button
                        aria-label={
                          isReviewed(entry)
                            ? "Mark unreviewed"
                            : "Mark reviewed"
                        }
                        className="activity-review-status"
                        data-reviewed={isReviewed(entry)}
                        type="button"
                        onClick={() => tracker.toggleEntryReviewed(entry.id)}
                      >
                        {isReviewed(entry) ? "Reviewed" : "Needs review"}
                      </button>
                      <strong className="activity-hours">
                        <span>{formatHours(entry.billedMinutes)}</span> h
                      </strong>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <footer className="modern-metrics-bar">
        <div className="modern-metric">
          <span aria-hidden="true">◷</span>
          <small>Today</small>
          <strong>
            {formatHours(tracker.todaySummary.totalBilledMinutes)} h
          </strong>
        </div>
        <div className="modern-metric">
          <span aria-hidden="true">▦</span>
          <small>Week</small>
          <strong>
            {formatHours(tracker.currentWeekSummary.totalBilledMinutes)} h
          </strong>
        </div>
        <div className="modern-metric">
          <span aria-hidden="true">▦</span>
          <small>Month</small>
          <strong>
            {formatHours(tracker.currentMonthSummary.totalBilledMinutes)} h
          </strong>
        </div>
        <div className="modern-metric">
          <span aria-hidden="true">$</span>
          <small>Est. value</small>
          <strong>
            {formatCurrency(tracker.currentMonthSummary.estimatedValue)}
          </strong>
        </div>
      </footer>

      <datalist id="task-category-options">
        {tracker.knownTaskCategories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      {editingEntry ? (
        <TimeEntryDialog
          entry={editingEntry}
          onClose={() => setEditingEntryId(null)}
          tracker={tracker}
        />
      ) : null}
    </div>
  );
}

export function TimeEntryDialog({
  entry,
  onClose,
  tracker,
}: {
  entry: TimeEntry;
  onClose: () => void;
  tracker: UseTimeTrackerResult;
}) {
  const [clientId, setClientId] = useState(entry.clientId ?? "");
  const availableClients = tracker.clientRecords.filter(
    (client) => client.status === "active" || client.id === entry.clientId
  );
  const availableMatters = tracker.matterRecords.filter(
    (matter) => matter.clientId === clientId
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedClient = tracker.clientRecords.find(
      (client) => client.id === clientId
    );
    const matterId = `${formData.get("matterId") ?? ""}`;
    const selectedMatter = tracker.matterRecords.find(
      (matter) => matter.id === matterId
    );
    const minutes = Math.round(Number(formData.get("billedHours") ?? 0) * 60);

    const updated = tracker.updateEntry({
      ...entry,
      actualMinutes: minutes,
      billedMinutes:
        entry.source === "timer" ? roundUpToQuarterHour(minutes) : minutes,
      clientId: selectedClient?.id ?? null,
      clientName: selectedClient?.name ?? "Unassigned client",
      matterId: selectedMatter?.id ?? null,
      matterName: selectedMatter?.name ?? "Unassigned matter",
      narrative: `${formData.get("narrative") ?? ""}`.trim(),
      taskCategory: `${formData.get("taskCategory") ?? ""}`.trim(),
      workDate: `${formData.get("workDate") ?? entry.workDate}`,
    });

    if (updated) {
      onClose();
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-labelledby="edit-entry-title"
        aria-modal="true"
        className="record-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="records-section-head">
          <div>
            <div className="eyebrow">Time entry</div>
            <h3 className="records-section-title" id="edit-entry-title">
              Edit entry
            </h3>
          </div>
          <button className="button-secondary" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <form className="composer-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">Date</span>
              <input
                className="text-input"
                defaultValue={entry.workDate}
                name="workDate"
                required
                type="date"
              />
            </label>
            <label className="field">
              <span className="field-label">Billable hours</span>
              <input
                className="text-input"
                defaultValue={formatHours(entry.billedMinutes)}
                inputMode="decimal"
                name="billedHours"
                pattern="[0-9]*\.?[0-9]+"
                required
                type="text"
              />
            </label>
          </div>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">Client</span>
              <select
                className="text-input"
                name="clientId"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
              >
                <option value="">Unassigned client</option>
                {availableClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Matter</span>
              <select
                className="text-input"
                defaultValue={entry.matterId ?? ""}
                name="matterId"
              >
                <option value="">Unassigned matter</option>
                {availableMatters.map((matter) => (
                  <option key={matter.id} value={matter.id}>
                    {matter.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span className="field-label">Narrative</span>
            <textarea
              className="text-area"
              defaultValue={entry.narrative}
              name="narrative"
              required
              rows={4}
            />
          </label>
          <label className="field">
            <span className="field-label">Task/category</span>
            <input
              className="text-input"
              defaultValue={entry.taskCategory}
              list="task-category-options"
              name="taskCategory"
            />
          </label>
          <button className="button-primary" type="submit">
            Save entry changes
          </button>
        </form>
      </section>
    </div>
  );
}

function createInitialManualEntry(): ManualEntryDraft {
  return {
    billedHours: "",
    clientId: null,
    clientName: "",
    matterId: null,
    matterName: "",
    narrative: "",
    taskCategory: "",
    workDate: getLocalDateKey(new Date()),
  };
}
