import { MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameReviewButton, LibraryButtons } from "@/components/actions-ui";
import { GameRail } from "@/components/game-card";
import { GameCover } from "@/components/game-cover";
import { ReviewCard } from "@/components/review-card";
import { Stars } from "@/components/ui/stars";
import { EmptyState, SegmentedLinks } from "@/components/ui/segmented";
import { getCurrentUser } from "@/lib/auth";
import { getGameBySlug, getGameReviews, getLibraryStatus, getMyReview, getSimilarGames } from "@/lib/queries";
import { formatRating, plural } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ordem?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  return game ? { title: game.title, description: game.summary } : { title: "Jogo não encontrado" };
}

export default async function GamePage({ params, searchParams }: Props) {
  const [{ slug }, { ordem }] = await Promise.all([params, searchParams]);
  const [game, me] = await Promise.all([getGameBySlug(slug), getCurrentUser()]);
  if (!game) notFound();

  const sort = ordem === "curtidas" || ordem === "nota" ? ordem : "recentes";
  const [reviews, myReview, status, similar] = await Promise.all([
    getGameReviews(game.id, me?.id ?? null, sort),
    me ? getMyReview(me.id, game.id) : null,
    me ? getLibraryStatus(me.id, game.id) : null,
    getSimilarGames(game.id, game.genres.map((g) => g.id)),
  ]);

  const total = game.reviewCount;
  const maxBar = Math.max(1, ...game.distribution.map((d) => d.count));
  const composerGame = {
    id: game.id,
    slug: game.slug,
    title: game.title,
    coverUrl: game.coverUrl,
    headerUrl: game.headerUrl,
    releaseYear: game.releaseYear,
    platforms: game.platforms,
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        {game.headerUrl && (
          <div aria-hidden className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={game.headerUrl} alt="" className="size-full scale-110 object-cover opacity-30 blur-3xl saturate-150" />
            <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/70 to-bg" />
          </div>
        )}
        <div className="relative mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-[180px_1fr] sm:gap-8 sm:px-6 md:grid-cols-[220px_1fr] md:py-14">
          <GameCover
            title={game.title}
            coverUrl={game.coverUrl}
            headerUrl={game.headerUrl}
            sizes="lg"
            className="mx-auto w-40 rounded-2xl shadow-float sm:mx-0 sm:w-full"
          />
          <div className="flex min-w-0 flex-col text-center sm:text-left">
            <p className="text-sm font-medium text-muted">
              {game.releaseYear} · {game.developer}
            </p>
            <h1 className="mt-1.5 text-3xl leading-tight font-semibold tracking-tight text-balance md:text-5xl">
              {game.title}
            </h1>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {game.genres.map((g) => (
                <Link key={g.id} href={`/jogos?genero=${g.slug}`} className="chip transition hover:border-line-strong hover:text-fg">
                  {g.name}
                </Link>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-4 sm:justify-start">
              <span className="text-5xl font-semibold tracking-tight tabular-nums">{formatRating(game.avgRating)}</span>
              <div>
                <Stars value={game.avgRating} size="md" />
                <p className="mt-1 text-sm text-muted">
                  {total ? plural(total, "review", "reviews") : "Ainda sem reviews"}
                  {game.playedCount > 0 && ` · ${plural(game.playedCount, "jogou", "jogaram")}`}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <GameReviewButton game={composerGame} existing={myReview} />
              <LibraryButtons gameId={game.id} initial={status} isAuthed={!!me} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Reviews */}
        <section className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">Reviews</h2>
            {total > 1 && (
              <SegmentedLinks
                active={sort}
                items={[
                  { value: "recentes", label: "Recentes", href: `/jogos/${game.slug}` },
                  { value: "curtidas", label: "Mais curtidas", href: `/jogos/${game.slug}?ordem=curtidas` },
                  { value: "nota", label: "Maior nota", href: `/jogos/${game.slug}?ordem=nota` },
                ]}
              />
            )}
          </div>
          {reviews.length === 0 ? (
            <EmptyState
              icon={<MessageSquareText className="size-5" />}
              title="Nenhuma review ainda"
              description={`Jogou ${game.title}? Seja o primeiro a contar o que achou.`}
            >
              <GameReviewButton game={composerGame} existing={myReview} />
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} viewerId={me?.id ?? null} showGame={false} gamePlatforms={game.platforms} />
              ))}
            </div>
          )}
        </section>

        {/* Lateral */}
        <aside className="order-first space-y-6 lg:order-none">
          <div className="card p-5">
            <h2 className="text-[15px] font-semibold">Sobre o jogo</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-fg/85">{game.summary}</p>
            <dl className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
              <Info label="Desenvolvedora" value={game.developer} />
              <Info label="Publicadora" value={game.publisher} />
              <Info label="Lançamento" value={String(game.releaseYear)} />
              <div>
                <dt className="text-muted">Plataformas</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {game.platforms.map((p) => (
                    <Link key={p.id} href={`/ranking?plataforma=${p.slug}`} className="chip hover:text-fg">
                      {p.name}
                    </Link>
                  ))}
                </dd>
              </div>
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="text-[15px] font-semibold">Distribuição das notas</h2>
            <ul className="mt-4 space-y-2">
              {game.distribution.map((d) => (
                <li key={d.stars} className="flex items-center gap-3 text-sm">
                  <span className="w-3 text-right font-medium tabular-nums">{d.stars}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-star" style={{ width: `${(d.count / maxBar) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-muted tabular-nums">{d.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
          <h2 className="section-title mb-5">Você também pode gostar</h2>
          <GameRail games={similar} ranked={false} />
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
