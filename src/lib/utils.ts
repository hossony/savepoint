import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const AVATAR_COLORS: Record<string, string> = {
  blue: "from-sky-400 to-blue-600",
  indigo: "from-indigo-400 to-indigo-600",
  purple: "from-violet-400 to-purple-600",
  pink: "from-pink-400 to-rose-500",
  red: "from-orange-400 to-red-500",
  orange: "from-amber-400 to-orange-500",
  green: "from-emerald-400 to-green-600",
  teal: "from-teal-400 to-cyan-600",
  graphite: "from-zinc-400 to-zinc-600",
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

export function timeAgo(date: Date | string | number) {
  const d = new Date(date).getTime();
  const diff = (d - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "agora";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: abs > 86400 * 300 ? "numeric" : undefined,
  });
}

export function formatRating(avg: number | null | undefined) {
  if (avg == null) return "—";
  return avg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;
}

/** Gradiente determinístico para capas sem imagem */
export function coverGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `linear-gradient(160deg, hsl(${h} 45% 32%), hsl(${(h + 40) % 360} 55% 14%))`;
}
