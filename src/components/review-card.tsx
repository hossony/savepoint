"use client";

import { Heart, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteReview, toggleLike } from "@/lib/actions";
import type { ReviewItem } from "@/lib/queries";
import { cn, timeAgo } from "@/lib/utils";
import { GameCover } from "./game-cover";
import { useReviewComposer, type ComposerGame } from "./review-composer";
import { Avatar } from "./ui/avatar";
import { Stars } from "./ui/stars";
import { useToast } from "./ui/toast";

export function ReviewCard({
  review,
  viewerId,
  showGame = true,
  gamePlatforms,
}: {
  review: ReviewItem;
  viewerId: number | null;
  showGame?: boolean;
  /** plataformas do jogo, para abrir o editor */
  gamePlatforms?: ComposerGame["platforms"];
}) {
  const router = useRouter();
  const toast = useToast();
  const openComposer = useReviewComposer();
  const [liked, setLiked] = useState(review.liked);
  const [likes, setLikes] = useState(review.likeCount);
  const [revealed, setRevealed] = useState(!review.spoiler);
  const [expanded, setExpanded] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [, start] = useTransition();
  const isMine = viewerId === review.user.id;
  const long = review.body.length > 420;

  function like() {
    if (!viewerId) {
      router.push("/entrar");
      return;
    }
    setLiked(!liked);
    setLikes((n) => n + (liked ? -1 : 1));
    start(async () => {
      const res = await toggleLike(review.id);
      if (!res.ok) {
        setLiked(liked);
        setLikes(review.likeCount);
      }
    });
  }

  async function edit() {
    let platforms = gamePlatforms;
    if (!platforms) {
      const res = await fetch(`/api/games/search?q=${encodeURIComponent(review.game.title)}`);
      const data = await res.json();
      platforms = data.results.find((g: { id: number }) => g.id === review.game.id)?.platforms ?? [];
    }
    openComposer({
      game: { ...review.game, platforms: platforms ?? [] },
      existing: {
        id: review.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        spoiler: review.spoiler,
        platformId: review.platformId,
      },
    });
  }

  function remove() {
    if (!window.confirm("Excluir esta review? Essa ação não pode ser desfeita.")) return;
    setDeleted(true);
    start(async () => {
      await deleteReview(review.id);
      toast("Review excluída");
      router.refresh();
    });
  }

  if (deleted) return null;

  return (
    <article className="card p-4 transition-shadow sm:p-5">
      <header className="flex items-center gap-3">
        <Link href={`/u/${review.user.username}`} className="shrink-0">
          <Avatar name={review.user.name} color={review.user.avatarColor} size="md" />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link href={`/u/${review.user.username}`} className="block truncate text-[15px] font-semibold hover:underline">
            {review.user.name}
          </Link>
          <p className="truncate text-[13px] text-muted">
            @{review.user.username} · <time dateTime={new Date(review.createdAt).toISOString()}>{timeAgo(review.createdAt)}</time>
            {+new Date(review.updatedAt) - +new Date(review.createdAt) > 60_000 && " · editada"}
          </p>
        </div>
        {isMine && <CardMenu onEdit={edit} onDelete={remove} />}
      </header>

      <div className={cn("mt-4 flex gap-4", !showGame && "mt-3")}>
        {showGame && (
          <Link href={`/jogos/${review.game.slug}`} className="shrink-0 transition-opacity hover:opacity-90">
            <GameCover
              title={review.game.title}
              coverUrl={review.game.coverUrl}
              headerUrl={review.game.headerUrl}
              className="w-[72px] sm:w-20"
              sizes="sm"
            />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          {showGame && (
            <Link href={`/jogos/${review.game.slug}`} className="text-[13px] font-medium text-muted hover:text-fg">
              {review.game.title} <span className="text-subtle">({review.game.releaseYear})</span>
            </Link>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Stars value={review.rating} size="sm" />
            {review.platformName && <span className="chip py-px">{review.platformName}</span>}
          </div>
          {review.title && <h3 className="mt-2 text-base leading-snug font-semibold">{review.title}</h3>}

          {revealed ? (
            <p
              className={cn(
                "mt-1.5 text-[15px] leading-relaxed whitespace-pre-line text-fg/90",
                long && !expanded && "line-clamp-6",
              )}
            >
              {review.body}
            </p>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="mt-2 w-full rounded-xl border border-dashed border-line-strong bg-surface-2 px-4 py-3 text-left text-sm text-muted transition hover:text-fg"
            >
              Esta review contém spoilers. <span className="font-medium text-accent">Mostrar mesmo assim</span>
            </button>
          )}
          {revealed && long && (
            <button onClick={() => setExpanded(!expanded)} className="mt-1 text-sm font-medium text-accent">
              {expanded ? "Mostrar menos" : "Ler mais"}
            </button>
          )}
        </div>
      </div>

      <footer className="mt-3 flex items-center">
        <button
          onClick={like}
          aria-pressed={liked}
          className={cn(
            "-ml-2 flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] font-medium transition active:scale-95",
            liked ? "text-pink-500" : "text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <Heart className={cn("size-[18px] transition-transform", liked && "scale-110 fill-current")} />
          <span className="tabular-nums">{likes > 0 ? likes : "Curtir"}</span>
        </button>
      </footer>
    </article>
  );
}

function CardMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="btn-ghost size-8 px-0" aria-label="Opções da review">
        <MoreHorizontal className="size-[18px]" />
      </button>
      {open && (
        <div className="absolute top-9 right-0 z-20 w-44 animate-scale-in overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-float">
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
          >
            <Pencil className="size-4 text-muted" /> Editar
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-surface-2"
          >
            <Trash2 className="size-4" /> Excluir
          </button>
        </div>
      )}
    </div>
  );
}
