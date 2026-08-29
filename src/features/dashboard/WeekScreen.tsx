import { useState } from "react";

import type { UseTimeTrackerResult } from "@/features/time/useTimeTracker";
import {
  formatCurrency,
  formatHours,
  formatTimeOfDay,
  getEntryTitle,
  isReviewed,
} from "@/features/time/utils";
import { PageHeader } from "@/shared/ui/PageHeader";
import { PeriodNavigator } from "@/shared/ui/PeriodNavigator";

import { TimeEntryDialog } from "./TodayScreen";
import { formatWeekPeriod, isCurrentWeek, shiftWeek } from "./periods";

type WeekScreenProps = {
  tracker: UseTimeTrackerResult;
};

export function WeekScreen({ tracker }: WeekScreenProps) {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const week = tracker.getWeekReport(weekAnchor);
  const editingEntry =
    tracker.entries.find((entry) => entry.id === editingEntryId) ?? null;
  const weeklySummaryCards = [
    {
      label: "Week billed",
      value: formatHours(week.summary.totalBilledMinutes),
      detail: "Hours stay visible as the lead pacing metric.",
      tone: "success",
    },
    {
      label: "Estimated value",
      value: formatCurrency(week.summary.estimatedValue),
      detail: "Running value keeps billing momentum obvious.",
      tone: "accent",
    },
    {
      label: "Awaiting review",
      value: `${week.summary.unreviewedCount}`,
      detail: "Unreviewed entries stay in the queue.",
      tone: "warning",
    },
    {
      label: "Long sessions",
      value: `${week.summary.longEntryCount}`,
      detail: "Sessions over six hours are flagged.",
      tone: "danger",
    },
  ] as const;

  return (
    <div className="screen-grid">
      <PageHeader
        eyebrow="Review cadence"
        title="Week"
        description="Weekly review is where time stays visible until it is checked, clarified, and ready to roll into clean monthly billing."
      />

      <PeriodNavigator
        isCurrent={isCurrentWeek(weekAnchor)}
        label={formatWeekPeriod(weekAnchor)}
        nextLabel="Next week"
        onNext={() => setWeekAnchor((current) => shiftWeek(current, 1))}
        onPrevious={() => setWeekAnchor((current) => shiftWeek(current, -1))}
        onToday={() => setWeekAnchor(new Date())}
        previousLabel="Previous week"
      />

      <section className="insight-layout">
        <section className="insight-hero" data-variant="review">
          <div className="insight-hero-glow" aria-hidden="true" />
          <div className="insight-hero-top">
            <div>
              <div className="eyebrow">Weekly discipline</div>
              <h3 className="insight-hero-title">
                Review the work before it rolls forward
              </h3>
              <p className="insight-hero-copy">
                Clean narratives, confirm hours, and resolve unusually long
                sessions.
              </p>
            </div>
            <div className="insight-status-pill">
              {week.entries.length
                ? `${week.entries.length} entries in this week`
                : "No entries yet"}
            </div>
          </div>

          <div className="insight-hero-body">
            <div className="insight-focus-card">
              <div className="insight-focus-label">Review focus</div>
              <div className="insight-focus-value">
                {week.summary.unreviewedCount > 0
                  ? `${week.summary.unreviewedCount} entries need attention`
                  : "Weekly review is clear"}
              </div>
              <div className="insight-focus-copy">
                {week.summary.unreviewedCount > 0
                  ? "Work stays visible here until you are comfortable with the narrative and billing detail."
                  : "Everything tracked this week has already been reviewed and is in good shape."}
              </div>
            </div>

            <div className="insight-support-grid">
              <div className="insight-support-card">
                <span className="insight-support-label">Top matter</span>
                <strong>
                  {week.matterBreakdown[0]?.matterName ?? "No matter yet"}
                </strong>
              </div>
              <div className="insight-support-card">
                <span className="insight-support-label">Hours reviewed</span>
                <strong>
                  {formatHours(
                    week.summary.totalBilledMinutes -
                      week.entries
                        .filter((entry) => !isReviewed(entry))
                        .reduce(
                          (total, entry) => total + entry.billedMinutes,
                          0
                        )
                  )}{" "}
                  hours
                </strong>
              </div>
              <div className="insight-support-card">
                <span className="insight-support-label">
                  Long-session alerts
                </span>
                <strong>{week.summary.longEntryCount || "None"}</strong>
              </div>
            </div>
          </div>
        </section>

        <aside className="insight-side-column">
          <section className="insight-stats-grid">
            {weeklySummaryCards.map((card) => (
              <article
                key={card.label}
                className="insight-stat-card"
                data-tone={card.tone}
              >
                <div className="insight-stat-label">{card.label}</div>
                <div className="insight-stat-value">{card.value}</div>
                <div className="insight-stat-detail">{card.detail}</div>
              </article>
            ))}
          </section>
        </aside>
      </section>

      <div className="dashboard-two-up">
        <section className="insight-section-card">
          <div className="insight-section-head">
            <div>
              <div className="eyebrow">Weekly allocation</div>
              <h3 className="insight-section-title">Matter breakdown</h3>
              <p className="insight-section-copy">
                See how the week’s billable time is distributed by matter.
              </p>
            </div>
            <div className="insight-section-chip">
              {formatWeekPeriod(weekAnchor)}
            </div>
          </div>

          {week.matterBreakdown.length === 0 ? (
            <div className="empty-state">
              This week is still empty. As soon as you add time, the matter
              breakdown will start building itself here.
            </div>
          ) : (
            <ul className="insight-breakdown-list">
              {week.matterBreakdown.map((matter) => (
                <li
                  key={`${matter.clientName}-${matter.matterName}`}
                  className="insight-breakdown-row"
                >
                  <div className="insight-breakdown-hours">
                    {formatHours(matter.totalBilledMinutes)}
                    <span>hrs</span>
                  </div>
                  <div className="insight-breakdown-main">
                    <p className="insight-breakdown-title">
                      {matter.matterName}
                    </p>
                    <p className="list-meta">
                      {matter.clientName} ·{" "}
                      {formatCurrency(matter.estimatedValue)}
                    </p>
                  </div>
                  <div
                    className="insight-breakdown-badge"
                    data-tone={
                      matter.unreviewedCount > 0 ? "warning" : "success"
                    }
                  >
                    {matter.unreviewedCount > 0
                      ? `${matter.unreviewedCount} to review`
                      : "Reviewed"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="insight-section-card">
          <div className="insight-section-head">
            <div>
              <div className="eyebrow">Review queue</div>
              <h3 className="insight-section-title">Weekly entries</h3>
              <p className="insight-section-copy">
                Mark each entry reviewed once its hours and narrative are
                correct.
              </p>
            </div>
            <div className="insight-section-chip">
              {week.entries.length
                ? `${week.entries.length} entries in this week`
                : "No entries yet"}
            </div>
          </div>

          {week.entries.length === 0 ? (
            <div className="empty-state">
              Weekly review will populate here after your first saved entry.
            </div>
          ) : (
            <ul className="insight-entry-list">
              {week.entries.map((entry) => (
                <li key={entry.id} className="insight-entry-row">
                  <div className="insight-entry-hours">
                    {formatHours(entry.billedMinutes)}
                    <span>hrs</span>
                  </div>
                  <div className="insight-entry-main">
                    <p className="insight-entry-title">
                      {getEntryTitle(entry)}
                    </p>
                    <div className="entry-meta-stack">
                      <p className="list-meta">
                        {entry.workDate} · {entry.clientName} ·{" "}
                        {entry.matterName}
                      </p>
                      <p className="list-meta">
                        {entry.startedAt
                          ? `Started ${formatTimeOfDay(entry.startedAt)}`
                          : "Manual entry"}
                      </p>
                    </div>
                  </div>
                  <div className="insight-entry-rail">
                    <div
                      className="insight-entry-badge"
                      data-tone={isReviewed(entry) ? "success" : "warning"}
                    >
                      {isReviewed(entry) ? "Reviewed" : "Awaiting review"}
                    </div>
                    <button
                      className="button-secondary"
                      disabled={tracker.isEntryLocked(entry.id)}
                      type="button"
                      onClick={() => tracker.toggleEntryReviewed(entry.id)}
                    >
                      {tracker.isEntryLocked(entry.id)
                        ? "Included on invoice"
                        : isReviewed(entry)
                          ? "Mark unreviewed"
                          : "Mark reviewed"}
                    </button>
                    <button
                      className="button-secondary"
                      disabled={tracker.isEntryLocked(entry.id)}
                      type="button"
                      onClick={() => setEditingEntryId(entry.id)}
                    >
                      {tracker.isEntryLocked(entry.id) ? "Locked" : "Edit"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
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
