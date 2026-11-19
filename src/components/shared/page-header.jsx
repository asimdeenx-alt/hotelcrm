export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-2xl leading-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 print:hidden">{children}</div>}
    </div>
  );
}
