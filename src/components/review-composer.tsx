"use client";

import { ArrowLeft, Loader2, Search, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { saveReview } from "@/lib/actions";
import { cn, formatRating } from "@/lib/utils";
import { GameCover } from "./game-cover";
import { Modal } from "./ui/modal";
import { StarInput, Stars } from "./ui/stars";
import { useToast } from "./ui/toast";

export type ComposerGame = {
  id: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  headerUrl: string | null;
  releaseYear: number;
  avgRating?: number | null;
  reviewCount?: number;
  platforms: { id: number; name: string; shortName: string }[];
};

export type ComposerExisting = {
  id: number;
  rating: number;
  title: string;
  body: string;
  spoiler: boolean;
  platformId: number | null;
} | null;

type OpenOptions = { game?: ComposerGame; existing?: ComposerExisting };

const Ctx = createContext<(opts?: OpenOptions) => void>(() => {});
export const useReviewComposer = () => useContext(Ctx);

export function ReviewComposerProvider({ children, isAuthed }: { children: React.ReactNode; isAuthed: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<{ open: boolean; opts: OpenOptions; key: number }>({
    open: false,
    opts: {},
    key: 0,
  });

  const open = useCallback(
    (opts: OpenOptions = {}) => {
      if (!isAuthed) {
        router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      setState((s) => ({ open: true, opts, key: s.key + 1 }));
    },
    [isAuthed, router],
  );

  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  return (
    <Ctx.Provider value={open}>
      {children}
      <Modal open={state.open} onClose={close} label="Criar review">
        <Composer key={state.key} initial={state.opts} onDone={close} />
      </Modal>
    </Ctx.Provider>
  );
}

type SearchResult = ComposerGame & { myReview: ComposerExisting; avgRating: number | null; reviewCount: number };

function Composer({ initial, onDone }: { initial: OpenOptions; onDone: () => void }) {
  const [game, setGame] = useState<ComposerGame | null>(initial.game ?? null);
  const [existing, setExisting] = useState<ComposerExisting>(initial.existing ?? null);

  if (!game) {
    return (
      <GamePicker
        onPick={(g) => {
          setGame(g);
          setExisting(g.myReview);
        }}
      />
    );
  }

  return (
    <ReviewForm
      game={game}
      existing={existing}
      onBack={initial.game ? undefined : () => setGame(null)}
      onDone={onDone}
    />
  );
}

function GamePicker({ onPick }: { onPick: (g: SearchResult) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults(data.results);
        setActive(0);
      } catch {
        /* abortado */
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pt-5 pb-3 sm:px-6">
        <h2 className="text-lg font-semibold">Criar review</h2>
        <p className="mt-0.5 text-sm text-muted">Qual jogo você quer avaliar?</p>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                onPick(results[active]);
              }
            }}
            placeholder="Buscar jogo pelo nome…"
            className="input pl-10"
            aria-label="Buscar jogo"
          />
          {loading && <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-subtle" />}
        </div>
        <p className="mt-3 text-xs font-medium tracking-wide text-subtle uppercase">
          {q ? "Resultados" : "Mais bem avaliados"}
        </p>
      </div>

      <ul className="min-h-[300px] flex-1 overflow-y-auto px-3 pb-4 sm:px-4" role="listbox">
        {!loading && results.length === 0 && (
          <li className="px-3 py-10 text-center text-sm text-muted">
            Nenhum jogo encontrado para “{q}”.
          </li>
        )}
        {results.map((g, i) => (
          <li key={g.id} role="option" aria-selected={i === active}>
            <button
              onClick={() => onPick(g)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-xl px-2.5 py-2 text-left transition",
                i === active ? "bg-surface-2" : "",
              )}
            >
              <GameCover title={g.title} coverUrl={g.coverUrl} headerUrl={g.headerUrl} className="w-11 rounded-lg" sizes="xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{g.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {g.releaseYear} · {g.platforms.map((p) => p.shortName).join(", ")}
                </p>
              </div>
              {g.myReview ? (
                <span className="chip border-accent/30 text-accent">Avaliado</span>
              ) : g.reviewCount > 0 ? (
                <span className="flex items-center gap-1 text-xs font-medium text-muted">
                  <Stars value={g.avgRating} size="xs" />
                  {formatRating(g.avgRating)}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewForm({
  game,
  existing,
  onBack,
  onDone,
}: {
  game: ComposerGame;
  existing: ComposerExisting;
  onBack?: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [platformId, setPlatformId] = useState<number | null>(
    existing?.platformId ?? (game.platforms.length === 1 ? game.platforms[0].id : null),
  );
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [spoiler, setSpoiler] = useState(existing?.spoiler ?? false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = rating > 0 && body.trim().length >= 10 && !pending;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setError(rating === 0 ? "Escolha uma nota de 1 a 5 estrelas." : "Escreva ao menos 10 caracteres.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await saveReview({ gameId: game.id, rating, platformId, title, body, spoiler });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast(res.updated ? "Review atualizada" : "Review publicada");
      onDone();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3 pr-14 sm:px-5">
        {onBack && (
          <button type="button" onClick={onBack} className="btn-ghost size-8 px-0" aria-label="Escolher outro jogo">
            <ArrowLeft className="size-4" />
          </button>
        )}
        <h2 className="text-[15px] font-semibold">{existing ? "Editar review" : "Nova review"}</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="flex items-center gap-4">
          <GameCover title={game.title} coverUrl={game.coverUrl} headerUrl={game.headerUrl} className="w-16" sizes="sm" />
          <div className="min-w-0">
            <p className="text-lg leading-tight font-semibold">{game.title}</p>
            <p className="mt-1 text-sm text-muted">{game.releaseYear}</p>
          </div>
        </div>

        <div>
          <span className="label">Sua nota</span>
          <StarInput value={rating} onChange={setRating} />
        </div>

        <div>
          <span className="label">Onde você jogou?</span>
          <div className="flex flex-wrap gap-2">
            {game.platforms.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatformId(platformId === p.id ? null : p.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[13px] font-medium transition",
                  platformId === p.id
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line-strong text-muted hover:text-fg",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="rv-title" className="label">
            Título <span className="font-normal text-subtle">(opcional)</span>
          </label>
          <input
            id="rv-title"
            className="input"
            value={title}
            maxLength={90}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Resuma sua experiência em uma frase"
          />
        </div>

        <div>
          <label htmlFor="rv-body" className="label">
            Sua review
          </label>
          <textarea
            id="rv-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            rows={6}
            placeholder="O que funcionou, o que não funcionou, para quem você recomendaria…"
            className="input h-auto min-h-36 resize-y py-3 leading-relaxed"
          />
          <p className="mt-1.5 text-right text-xs text-subtle tabular-nums">{body.length}/5000</p>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-surface-2 px-4 py-3">
          <span className="flex items-center gap-2.5 text-sm">
            <ShieldAlert className="size-4 text-muted" />
            Contém spoilers
          </span>
          <Toggle checked={spoiler} onChange={setSpoiler} />
        </label>

        {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5 sm:px-6">
        <button type="button" onClick={onDone} className="btn-ghost">
          Cancelar
        </button>
        <button type="submit" disabled={pending} className="btn-primary min-w-28">
          {pending ? <Loader2 className="size-4 animate-spin" /> : existing ? "Salvar alterações" : "Publicar"}
        </button>
      </div>
    </form>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-green-500" : "bg-surface-3",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] left-[2px] size-[22px] rounded-full bg-white shadow-sm transition-transform duration-200",
          checked && "translate-x-[18px]",
        )}
      />
    </button>
  );
}
