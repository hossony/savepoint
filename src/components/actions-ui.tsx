"use client";

import { Bookmark, Check, Gamepad2, Loader2, Moon, PenLine, Plus, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setLibraryStatus, toggleFollow } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { useReviewComposer, type ComposerExisting, type ComposerGame } from "./review-composer";
import { useToast } from "./ui/toast";

/* ---------------------------- Criar review ---------------------------- */

export function CreateReviewButton({ className, compact }: { className?: string; compact?: boolean }) {
  const open = useReviewComposer();
  return (
    <button onClick={() => open()} className={cn("btn-primary", className)}>
      <Plus className="size-4" strokeWidth={2.5} />
      {!compact && <span>Criar review</span>}
    </button>
  );
}

export function ComposerPrompt({ name }: { name: string }) {
  const open = useReviewComposer();
  return (
    <button
      onClick={() => open()}
      className="card flex w-full items-center gap-3 p-3 pl-4 text-left transition hover:shadow-float"
    >
      <span className="flex-1 text-[15px] text-subtle">O que você jogou recentemente, {name.split(" ")[0]}?</span>
      <span className="btn-primary h-8 px-3.5 text-[13px]">
        <PenLine className="size-3.5" /> Escrever
      </span>
    </button>
  );
}

export function GameReviewButton({
  game,
  existing,
  className,
}: {
  game: ComposerGame;
  existing: ComposerExisting;
  className?: string;
}) {
  const open = useReviewComposer();
  return (
    <button onClick={() => open({ game, existing })} className={cn("btn-primary h-10 px-5", className)}>
      <PenLine className="size-4" />
      {existing ? "Editar sua review" : "Escrever review"}
    </button>
  );
}

/* ------------------------------ Seguir ------------------------------- */

export function FollowButton({
  userId,
  initial,
  isAuthed,
  size = "md",
}: {
  userId: number;
  initial: boolean;
  isAuthed: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initial);
  const [hover, setHover] = useState(false);
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        if (!isAuthed) return router.push("/entrar");
        setFollowing(!following);
        start(async () => {
          const res = await toggleFollow(userId);
          if (!res.ok) setFollowing(following);
          router.refresh();
        });
      }}
      className={cn(
        following ? "btn-outline" : "btn-primary",
        size === "sm" && "h-8 px-3.5 text-[13px]",
        following && hover && "border-danger/40 text-danger",
        "min-w-[92px]",
      )}
    >
      {following ? (hover ? "Deixar de seguir" : "Seguindo") : "Seguir"}
    </button>
  );
}

/* ---------------------------- Biblioteca ----------------------------- */

const STATUSES = [
  { value: "played", label: "Jogado", icon: Check },
  { value: "playing", label: "Jogando", icon: Gamepad2 },
  { value: "backlog", label: "Quero jogar", icon: Bookmark },
] as const;

type Status = (typeof STATUSES)[number]["value"];

export function LibraryButtons({
  gameId,
  initial,
  isAuthed,
}: {
  gameId: number;
  initial: Status | null;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<Status | null>(initial);
  const [pending, start] = useTransition();

  useEffect(() => setStatus(initial), [initial]);

  function pick(value: Status) {
    if (!isAuthed) return router.push("/entrar");
    const next = status === value ? null : value;
    const prev = status;
    setStatus(next);
    start(async () => {
      const res = await setLibraryStatus(gameId, next);
      if (!res.ok) return setStatus(prev);
      toast(next ? `Marcado como “${STATUSES.find((s) => s.value === next)!.label}”` : "Removido da sua biblioteca");
      router.refresh();
    });
  }

  return (
    <div className="inline-flex rounded-full bg-surface-3/70 p-1" role="group" aria-label="Status na biblioteca">
      {STATUSES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => pick(value)}
          aria-pressed={status === value}
          disabled={pending}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-all",
            status === value ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
      {pending && <Loader2 className="mx-2 size-4 self-center animate-spin text-subtle" />}
    </div>
  );
}

/* ------------------------------- Tema -------------------------------- */

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn("btn-ghost size-9 px-0", className)}
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
    >
      {mounted ? dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" /> : <span className="size-[18px]" />}
    </button>
  );
}
