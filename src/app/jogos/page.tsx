import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { GameCard } from "@/components/game-card";
import { GameFilters } from "@/components/game-filters";
import { EmptyState } from "@/components/ui/segmented";
import { getGenres, getPlatforms, listGames, type GameSort } from "@/lib/queries";

export const metadata: Metadata = { title: "Explorar jogos" };

const SORTS: GameSort[] = ["nota", "populares", "recentes", "az"];

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; genero?: string; plataforma?: string; ordem?: string }>;
}) {
  const sp = await searchParams;
  const sort = SORTS.includes(sp.ordem as GameSort) ? (sp.ordem as GameSort) : "nota";
  const [games, genres, platforms] = await Promise.all([
    listGames({ q: sp.q, genre: sp.genero, platform: sp.plataforma, sort }),
    getGenres(),
    getPlatforms(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Explorar</h1>
        <p className="mt-2 text-muted">Encontre o próximo jogo pela nota da comunidade, gênero ou plataforma.</p>
      </header>

      <Suspense>
        <GameFilters
          genres={genres.map((g) => ({ value: g.slug, label: g.name }))}
          platforms={platforms.map((p) => ({ value: p.slug, label: p.name }))}
        />
      </Suspense>

      <p className="mt-8 mb-4 text-sm text-muted">
        {games.length} {games.length === 1 ? "jogo encontrado" : "jogos encontrados"}
      </p>

      {games.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-5" />}
          title="Nenhum jogo encontrado"
          description="Tente outro termo de busca ou remova alguns filtros."
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}
