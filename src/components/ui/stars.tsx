"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function StarIcon({ fill, className }: { fill: number; className?: string }) {
  // fill: 0..1 (permite meia estrela na média)
  const id = `s${Math.round(fill * 100)}`;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="var(--star)" />
          <stop offset={`${fill * 100}%`} stopColor="var(--surface-3)" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M12 2.6l2.83 5.74 6.33.92-4.58 4.47 1.08 6.3L12 17.05l-5.66 2.98 1.08-6.3L2.84 9.26l6.33-.92L12 2.6z"
      />
    </svg>
  );
}

export function Stars({
  value,
  size = "sm",
  className,
}: {
  value: number | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const v = value ?? 0;
  const sz = { xs: "size-3", sm: "size-4", md: "size-5", lg: "size-6" }[size];
  return (
    <span
      className={cn("inline-flex items-center gap-px", className)}
      role="img"
      aria-label={value == null ? "Sem avaliações" : `${v.toFixed(1)} de 5 estrelas`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} className={sz} fill={Math.max(0, Math.min(1, v - (i - 1)))} />
      ))}
    </span>
  );
}

const LABELS = ["", "Ruim", "Fraco", "Bom", "Ótimo", "Obra-prima"];

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center" role="radiogroup" aria-label="Nota" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} ${i === 1 ? "estrela" : "estrelas"}`}
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(i)}
            className="p-0.5 transition-transform duration-150 hover:scale-110 active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="size-8" aria-hidden>
              <path
                className="transition-colors duration-150"
                fill={i <= shown ? "var(--star)" : "var(--surface-3)"}
                d="M12 2.6l2.83 5.74 6.33.92-4.58 4.47 1.08 6.3L12 17.05l-5.66 2.98 1.08-6.3L2.84 9.26l6.33-.92L12 2.6z"
              />
            </svg>
          </button>
        ))}
      </div>
      <span className="min-w-20 text-sm font-medium text-muted">{LABELS[shown]}</span>
    </div>
  );
}
