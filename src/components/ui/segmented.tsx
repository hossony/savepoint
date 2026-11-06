import Link from "next/link";
import { cn } from "@/lib/utils";

/** Controle segmentado baseado em links (estado na URL) */
export function SegmentedLinks({
  items,
  active,
  className,
}: {
  items: { href: string; label: string; value: string; count?: number }[];
  active: string;
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar overflow-x-auto", className)}>
      <div className="inline-flex rounded-full bg-surface-3/70 p-1">
        {items.map((it) => (
          <Link
            key={it.value}
            href={it.href}
            scroll={false}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-all",
              active === it.value ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
            )}
          >
            {it.label}
            {it.count != null && <span className="text-subtle tabular-nums">{it.count}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
  icon,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">{icon}</div>}
      <p className="text-base font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
