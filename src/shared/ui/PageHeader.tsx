type PageHeaderProps = {
  description: string;
  eyebrow?: string;
  title: string;
};

export function PageHeader({
  description,
  eyebrow = "Workspace",
  title,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="page-title">{title}</h2>
      <p className="page-copy">{description}</p>
    </header>
  );
}
