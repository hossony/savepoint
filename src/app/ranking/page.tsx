import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GameCard, GameRail, GameRow } from "@/components/game-card";
import { EmptyState, SegmentedLinks } from "@/components/ui/segmented";
import { getGenres, getPlatforms, listGames } from "@/lib/queries";

export const metadata: Metadata = { title: "Ranking" };

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ plataforma?: string }>;
}) {
  const { plataforma } = await searchParams;
  const [platforms, genres] = await Promise.all([getPlatforms(), getGenres()]);
  const platform = platforms.find((p) => p.slug === plataforma);

  const [overall, byGenre] = await Promise.all([
    listGames({ sort: "nota", platform: platform?.slug, minReviews: 1, limit: 10 }),
    Promise.all(
      genres.map(async (g) => ({
        genre: g,
        games: await listGames({ sort: "nota", platform: platform?.slug, genre: g.slug, minReviews: 1, limit: 10 }),
      })),
    ),
  ]);

  const sections = byGenre.filter((s) => s.games.length > 0).sort((a, b) => b.games.length - a.games.length);
  const podium = overall.slice(0, 3);
  const rest = overall.slice(3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Ranking</h1>
        <p className="mt-2 text-muted">
          Os jogos mais bem avaliados pela comunidade, por categoria e plataforma. A nota considera a quantidade de
          reviews para ser mais justa.
        </p>
      </header>

      <SegmentedLinks
        className="-mx-4 px-4 sm:mx-0 sm:px-0"
        active={platform?.slug ?? "todas"}
        items={[
          { value: "todas", label: "Todas", href: "/ranking" },
          ...platforms.map((p) => ({ value: p.slug, label: p.shortName, href: `/ranking?plataforma=${p.slug}` })),
        ]}
      />

      {overall.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Trophy className="size-5" />}
            title={`Ainda não há reviews para ${platform?.name ?? "esta plataforma"}`}
            description="Seja o primeiro a avaliar um jogo desta plataforma."
          />
        </div>
      ) : (
        <>
          <section className="mt-10">
            <h2 className="section-title">Top 10 {platform ? `no ${platform.name}` : "geral"}</h2>
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <div className="grid grid-cols-3 gap-4">
                {podium.map((g, i) => (
                  <GameCard key={g.id} game={g} rank={i + 1} />
                ))}
              </div>
              {rest.length > 0 && (
                <div className="card self-start p-2">
                  {rest.map((g, i) => (
                    <GameRow key={g.id} game={g} rank={i + 4} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <nav className="no-scrollbar -mx-4 mt-14 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {sections.map(({ genre }) => (
              <a key={genre.id} href={`#${genre.slug}`} className="btn-outline h-8 shrink-0 px-3.5 text-[13px]">
                {genre.name}
              </a>
            ))}
          </nav>

          <div className="mt-6 space-y-12">
            {sections.map(({ genre, games }) => (
              <section key={genre.id} id={genre.slug} className="scroll-mt-20">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <h2 className="section-title">Melhores em {genre.name}</h2>
                  <Link
                    href={`/jogos?genero=${genre.slug}${platform ? `&plataforma=${platform.slug}` : ""}`}
                    className="shrink-0 text-sm font-medium text-accent"
                  >
                    Ver todos
                  </Link>
                </div>
                <GameRail games={games} />
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
