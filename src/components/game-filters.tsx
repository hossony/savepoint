"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

export function GameFilters({ genres, platforms }: { genres: Option[]; platforms: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  function update(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    start(() => router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  }

  // busca com debounce
  useEffect(() => {
    if ((params.get("q") ?? "") === q) return;
    const t = setTimeout(() => update("q", q.trim() || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = ["q", "genero", "plataforma", "ordem"].some((k) => params.get(k));

  return (
    <div className={cn("space-y-3 transition-opacity", pending && "opacity-70")}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome do jogo"
          aria-label="Buscar por nome do jogo"
          className="input h-12 rounded-2xl pl-11 text-base shadow-card"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-surface-3 text-muted"
            aria-label="Limpar busca"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          label="Gênero"
          value={params.get("genero") ?? ""}
          onChange={(v) => update("genero", v)}
          options={[{ value: "", label: "Todos os gêneros" }, ...genres]}
        />
        <Select
          label="Plataforma"
          value={params.get("plataforma") ?? ""}
          onChange={(v) => update("plataforma", v)}
          options={[{ value: "", label: "Todas as plataformas" }, ...platforms]}
        />
        <Select
          label="Ordenar"
          value={params.get("ordem") ?? ""}
          onChange={(v) => update("ordem", v)}
          options={[
            { value: "", label: "Mais bem avaliados" },
            { value: "populares", label: "Mais reviews" },
            { value: "recentes", label: "Lançamentos recentes" },
            { value: "az", label: "Ordem alfabética" },
          ]}
        />
        {hasFilters && (
          <button
            onClick={() => {
              setQ("");
              start(() => router.replace(pathname, { scroll: false }));
            }}
            className="btn-ghost h-9 text-[13px]"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string | null) => void;
}) {
  const active = value !== "";
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          "h-9 appearance-none rounded-full border pr-9 pl-4 text-[13px] font-medium transition outline-none focus:ring-2 focus:ring-accent/40",
          active ? "border-accent/40 bg-accent-soft text-accent" : "border-line-strong bg-surface text-fg hover:bg-surface-2",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-60" />
    </label>
  );
}
