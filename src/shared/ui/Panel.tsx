import type { ReactNode } from "react";

type PanelProps = {
  actionLabel?: string;
  children: ReactNode;
  description?: string;
  title: string;
};

export function Panel({
  actionLabel,
  children,
  description,
  title,
}: PanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">{title}</h3>
          {description ? <p className="panel-copy">{description}</p> : null}
        </div>
        {actionLabel ? <div className="panel-action">{actionLabel}</div> : null}
      </div>
      {children}
    </section>
  );
}
