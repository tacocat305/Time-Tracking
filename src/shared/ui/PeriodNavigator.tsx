type PeriodNavigatorProps = {
  isCurrent: boolean;
  label: string;
  nextLabel: string;
  onNext: () => void;
  onPrevious: () => void;
  onToday: () => void;
  previousLabel: string;
};

export function PeriodNavigator({
  isCurrent,
  label,
  nextLabel,
  onNext,
  onPrevious,
  onToday,
  previousLabel,
}: PeriodNavigatorProps) {
  return (
    <section className="period-navigator" aria-label="Reporting period">
      <button
        className="period-navigator-button"
        type="button"
        onClick={onPrevious}
      >
        {previousLabel}
      </button>
      <div className="period-navigator-current" aria-live="polite">
        <span>Viewing</span>
        <strong>{label}</strong>
      </div>
      <button
        className="period-navigator-today"
        type="button"
        onClick={onToday}
        disabled={isCurrent}
      >
        {isCurrent ? "Current period" : "Return to current"}
      </button>
      <button
        className="period-navigator-button"
        type="button"
        onClick={onNext}
      >
        {nextLabel}
      </button>
    </section>
  );
}
