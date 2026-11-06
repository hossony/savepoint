import { ArrowRight, Sparkles, Star, Users } from "lucide-react";
import Link from "next/link";
import { ComposerPrompt, FollowButton } from "@/components/actions-ui";
import { FeedList } from "@/components/feed-list";
import { GameCard, GameRow } from "@/components/game-card";
import { ReviewCard } from "@/components/review-card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, SegmentedLinks } from "@/components/ui/segmented";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { plural } from "@/lib/utils";
import { FEED_PAGE, getFeed, getPlatformStats, getSuggestedUsers, listGames } from "@/lib/queries";

export default async function Home({ searchParams }: { searchParams: Promise<{ feed?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return <Landing />;
  const { feed } = await searchParams;
  return <Feed user={user} mode={feed === "todos" ? "todos" : "seguindo"} />;
}

/* ------------------------------------------------------------------ */

async function Feed({ user, mode }: { user: SessionUser; mode: "seguindo" | "todos" }) {
  const [items, top, suggestions] = await Promise.all([
    getFeed({ viewerId: user.id, mode }),
    listGames({ sort: "nota", limit: 5, minReviews: 1 }),
    getSuggestedUsers(user.id, 4),
  ]);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 md:py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="mx-auto w-full max-w-2xl min-w-0 lg:mx-0">
        <h1 className="mb-5 text-3xl font-semibold tracking-tight">Feed</h1>
        <ComposerPrompt name={user.name} />

        <SegmentedLinks
          className="mt-6 mb-4"
          active={mode}
          items={[
            { value: "seguindo", label: "Seguindo", href: "/" },
            { value: "todos", label: "Para todos", href: "/?feed=todos" },
          ]}
        />

        {items.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="Seu feed está vazio"
            description="Siga outros jogadores para ver as reviews deles aqui, ou confira o que toda a comunidade está jogando."
          >
            <Link href="/?feed=todos" className="btn-primary">
              Ver todas as reviews
            </Link>
          </EmptyState>
        ) : (
          <FeedList key={mode} initial={items} mode={mode} viewerId={user.id} pageSize={FEED_PAGE} />
        )}
      </section>

      <aside className="hidden space-y-6 lg:block">
        <div className="sticky top-20 space-y-6">
          <div className="card p-2">
            <div className="flex items-center justify-between px-3 pt-3 pb-1">
              <h2 className="text-[15px] font-semibold">Mais bem avaliados</h2>
              <Link href="/ranking" className="text-[13px] font-medium text-accent">
                Ver ranking
              </Link>
            </div>
            {top.map((g, i) => (
              <GameRow key={g.id} game={g} rank={i + 1} />
            ))}
          </div>

          {suggestions.length > 0 && (
            <div className="card p-5">
              <h2 className="text-[15px] font-semibold">Quem seguir</h2>
              <ul className="mt-4 space-y-4">
                {suggestions.map((u) => (
                  <li key={u.id} className="flex items-center gap-3">
                    <Link href={`/u/${u.username}`}>
                      <Avatar name={u.name} color={u.avatarColor} size="md" />
                    </Link>
                    <div className="min-w-0 flex-1 leading-tight">
                      <Link href={`/u/${u.username}`} className="block truncate text-sm font-semibold hover:underline">
                        {u.name}
                      </Link>
                      <p className="truncate text-xs text-muted">{plural(u.reviewCount, "review", "reviews")}</p>
                    </div>
                    <FollowButton userId={u.id} initial={u.isFollowing} isAuthed size="sm" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */

async function Landing() {
  const [top, recent, stats] = await Promise.all([
    listGames({ sort: "nota", limit: 12, minReviews: 1 }),
    getFeed({ viewerId: null, mode: "todos", limit: 4 }),
    getPlatformStats(),
  ]);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center sm:px-6 md:pt-24">
          <p className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted shadow-card">
            <Sparkles className="size-3.5 text-star" /> Plataforma aberta e gratuita
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl md:text-7xl">
            Cada jogo merece uma boa crítica.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-balance text-muted md:text-xl">
            Registre o que você jogou, escreva reviews, dê suas estrelas e descubra o próximo jogo pela opinião de quem
            você confia.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/cadastro" className="btn-primary h-11 px-6 text-[15px]">
              Criar conta grátis
            </Link>
            <Link href="/jogos" className="btn-outline h-11 px-6 text-[15px]">
              Explorar jogos <ArrowRight className="size-4" />
            </Link>
          </div>
          <dl className="mx-auto mt-14 grid max-w-lg grid-cols-3 gap-4">
            {[
              { label: "jogos", value: stats.games },
              { label: "reviews", value: stats.reviews },
              { label: "jogadores", value: stats.users },
            ].map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-3xl font-semibold tracking-tight tabular-nums">{s.value}</dd>
                <p className="text-sm text-muted">{s.label}</p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="section-title">Os mais bem avaliados</h2>
          <Link href="/ranking" className="text-sm font-medium text-accent">
            Ver ranking completo
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 md:gap-5">
          {top.map((g, i) => (
            <GameCard key={g.id} game={g} rank={i + 1} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Star, title: "Avalie com estrelas", text: "De 1 a 5 estrelas, com review completa, plataforma e aviso de spoiler." },
            { icon: Users, title: "Siga quem você confia", text: "Monte um feed com as opiniões dos jogadores que têm o seu gosto." },
            { icon: Sparkles, title: "Descubra o que jogar", text: "Rankings por gênero e plataforma e uma lista de “quero jogar” só sua." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-6">
              <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 text-[17px] font-semibold">{title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="section-title mb-6">Reviews recentes da comunidade</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {recent.map((r) => (
            <ReviewCard key={r.id} review={r} viewerId={null} />
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Link href="/cadastro" className="btn-primary h-11 px-6 text-[15px]">
            Comece a escrever as suas
          </Link>
        </div>
      </section>
    </div>
  );
}
