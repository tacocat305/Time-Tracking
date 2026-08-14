import { useState } from "react";

import type { UseTimeTrackerResult } from "@/features/time/useTimeTracker";
import {
  formatCurrency,
  formatHours,
  getEntryTitle,
  isReviewed,
} from "@/features/time/utils";
import { PageHeader } from "@/shared/ui/PageHeader";
import { PeriodNavigator } from "@/shared/ui/PeriodNavigator";

import { formatMonthPeriod, isCurrentMonth, shiftMonth } from "./periods";

type MonthScreenProps = {
  tracker: UseTimeTrackerResult;
};

export function MonthScreen({ tracker }: MonthScreenProps) {
  const [monthAnchor, setMonthAnchor] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const month = tracker.getMonthReport(monthAnchor);
  const monthlySummaryCards = [
    {
      label: "Month billed",
      value: formatHours(month.summary.totalBilledMinutes),
      detail: "Lead total for the billing cycle.",
      tone: "success",
    },
    {
      label: "Estimated value",
      value: formatCurrency(month.summary.estimatedValue),
      detail: "Value stays visible before statements are generated.",
      tone: "accent",
    },
    {
      label: "Reviewed entries",
      value: `${month.summary.reviewedCount}`,
      detail: "Reviewed time is the clean path into statements.",
      tone: "neutral",
    },
    {
      label: "Pending cleanup",
      value: `${month.summary.unreviewedCount}`,
      detail: "This queue should get smaller as month-end approaches.",
      tone: "warning",
    },
  ] as const;

  return (
    <div className="screen-grid">
      <PageHeader
        eyebrow="Billing cycle"
        title="Month"
        description="Month view is the handoff point from tracked work into polished statements, invoice records, and payment follow-through."
      />

      <PeriodNavigator
        isCurrent={isCurrentMonth(monthAnchor)}
        label={formatMonthPeriod(monthAnchor)}
        nextLabel="Next month"
        onNext={() => setMonthAnchor((current) => shiftMonth(current, 1))}
        onPrevious={() => setMonthAnchor((current) => shiftMonth(current, -1))}
        onToday={() => {
          const today = new Date();
          setMonthAnchor(new Date(today.getFullYear(), today.getMonth(), 1));
        }}
        previousLabel="Previous month"
      />

      <section className="insight-layout">
        <section className="insight-hero" data-variant="billing">
          <div className="insight-hero-glow" aria-hidden="true" />
          <div className="insight-hero-top">
            <div>
              <div className="eyebrow">Billing cycle</div>
              <h3 className="insight-hero-title">
                Turn tracked work into clean month-end statements
              </h3>
              <p className="insight-hero-copy">
                See month-to-date value, resolve remaining review work, and
                prepare billing.
              </p>
            </div>
            <div className="insight-status-pill">
              {month.entries.length
                ? `${month.entries.length} entries in this month`
                : "No entries yet"}
            </div>
          </div>

          <div className="insight-hero-body">
            <div className="insight-focus-card">
              <div className="insight-focus-label">Statement readiness</div>
              <div className="insight-focus-value">
                {month.summary.unreviewedCount > 0
                  ? `${month.summary.unreviewedCount} entries still need cleanup`
                  : "Month is statement-ready"}
              </div>
              <div className="insight-focus-copy">
                {month.summary.unreviewedCount > 0
                  ? "A small cleanup queue now keeps month-end from becoming stressful later."
                  : "Everything tracked this month has been reviewed and is in good shape for billing."}
              </div>
            </div>

            <div className="insight-support-grid">
              <div className="insight-support-card">
                <span className="insight-support-label">Lead matter</span>
                <strong>
                  {month.matterBreakdown[0]?.matterName ?? "No matter yet"}
                </strong>
              </div>
              <div className="insight-support-card">
                <span className="insight-support-label">Reviewed hours</span>
                <strong>
                  {formatHours(
                    month.summary.totalBilledMinutes -
                      month.entries
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
                <span className="insight-support-label">Month value</span>
                <strong>{formatCurrency(month.summary.estimatedValue)}</strong>
              </div>
            </div>
          </div>
        </section>

        <aside className="insight-side-column">
          <section className="insight-stats-grid">
            {monthlySummaryCards.map((card) => (
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
              <div className="eyebrow">Monthly allocation</div>
              <h3 className="insight-section-title">Matter breakdown</h3>
              <p className="insight-section-copy">
                The clearest view of where the current month’s billable time is
                going.
              </p>
            </div>
            <div className="insight-section-chip">
              {formatMonthPeriod(monthAnchor)}
            </div>
          </div>

          {month.matterBreakdown.length === 0 ? (
            <div className="empty-state">
              Month totals will appear here as soon as entries land in the
              tracker.
            </div>
          ) : (
            <ul className="insight-breakdown-list">
              {month.matterBreakdown.map((matter) => (
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
                      ? `${matter.unreviewedCount} pending`
                      : "Ready"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="insight-section-card">
          <div className="insight-section-head">
            <div>
              <div className="eyebrow">Readiness queue</div>
              <h3 className="insight-section-title">Statement readiness</h3>
              <p className="insight-section-copy">
                Every time entry must be reviewed before its client-month can
                become an invoice.
              </p>
            </div>
            <div className="insight-section-chip">
              {month.entries.length
                ? `${month.entries.length} entries in this month`
                : "No entries yet"}
            </div>
          </div>

          {month.entries.length === 0 ? (
            <div className="empty-state">
              Monthly readiness will become useful once this month has tracked
              work to review.
            </div>
          ) : (
            <ul className="insight-entry-list">
              {month.entries.map((entry) => (
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
                        {entry.taskCategory
                          ? entry.taskCategory
                          : "No task category"}{" "}
                        · {isReviewed(entry) ? "Reviewed" : "Needs review"}
                      </p>
                    </div>
                  </div>
                  <div
                    className="insight-entry-badge"
                    data-tone={isReviewed(entry) ? "success" : "warning"}
                  >
                    {isReviewed(entry) ? "Statement-ready" : "Review first"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
