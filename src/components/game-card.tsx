import Link from "next/link";
import type { GameCardData } from "@/lib/queries";
import { cn, formatRating, plural } from "@/lib/utils";
import { GameCover } from "./game-cover";
import { Stars } from "./ui/stars";

export function GameCard({ game, rank, className }: { game: GameCardData; rank?: number; className?: string }) {
  return (
    <Link href={`/jogos/${game.slug}`} className={cn("group block", className)}>
      <div className="relative">
        <GameCover
          title={game.title}
          coverUrl={game.coverUrl}
          headerUrl={game.headerUrl}
          className="shadow-card transition duration-300 group-hover:-translate-y-1 group-hover:shadow-float"
        />
        {rank != null && (
          <span className="absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-black/60 text-xs font-semibold text-white backdrop-blur-md">
            {rank}
          </span>
        )}
      </div>
      <div className="mt-2.5 px-0.5">
        <p className="truncate text-[14px] leading-snug font-medium group-hover:text-accent">{game.title}</p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          {game.reviewCount > 0 ? (
            <>
              <Stars value={game.avgRating} size="xs" />
              <span className="font-medium text-fg">{formatRating(game.avgRating)}</span>
              <span className="text-subtle">({game.reviewCount})</span>
            </>
          ) : (
            <span className="text-subtle">{game.releaseYear} · Sem reviews</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function GameRow({ game, rank }: { game: GameCardData; rank: number }) {
  return (
    <Link
      href={`/jogos/${game.slug}`}
      className="group flex items-center gap-4 rounded-2xl px-3 py-2.5 transition hover:bg-surface-2"
    >
      <span
        className={cn(
          "w-6 text-center text-lg font-semibold tabular-nums",
          rank <= 3 ? "text-fg" : "text-subtle",
        )}
      >
        {rank}
      </span>
      <GameCover title={game.title} coverUrl={game.coverUrl} headerUrl={game.headerUrl} className="w-12 rounded-lg" sizes="xs" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium group-hover:text-accent">{game.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {game.releaseYear} · {game.genres.slice(0, 2).map((g) => g.name).join(", ")}
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg leading-none font-semibold tabular-nums">{formatRating(game.avgRating)}</p>
        <p className="mt-1 text-[11px] text-subtle">{plural(game.reviewCount, "review", "reviews")}</p>
      </div>
    </Link>
  );
}

export function GameRail({ games, ranked = true }: { games: GameCardData[]; ranked?: boolean }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
      {games.map((g, i) => (
        <GameCard
          key={g.id}
          game={g}
          rank={ranked ? i + 1 : undefined}
          className="w-[132px] shrink-0 snap-start sm:w-[150px]"
        />
      ))}
    </div>
  );
}
