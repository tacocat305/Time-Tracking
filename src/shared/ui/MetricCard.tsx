type MetricCardProps = {
  detail: string;
  label: string;
  tone?: "accent" | "danger" | "success" | "warning";
  value: string;
};

export function MetricCard({
  detail,
  label,
  tone = "accent",
  value,
}: MetricCardProps) {
  return (
    <article className="metric-card" data-tone={tone}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}
