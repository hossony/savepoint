import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-fg" />
      <path d="M11 8.5h10a1.5 1.5 0 0 1 1.5 1.5v13.6l-6.5-4.1-6.5 4.1V10A1.5 1.5 0 0 1 11 8.5z" className="fill-bg" />
      <path d="m16 11.6 1.15 2.33 2.57.37-1.86 1.82.44 2.56L16 17.47l-2.3 1.21.44-2.56-1.86-1.82 2.57-.37z" fill="var(--star)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)} aria-label="Savepoint — início">
      <LogoMark className="size-7" />
      <span className="text-[17px] font-semibold tracking-tight">Savepoint</span>
    </Link>
  );
}
