import { Bookmark, CalendarDays, Gamepad2, MessageSquareText, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/actions-ui";
import { GameCard } from "@/components/game-card";
import { ReviewCard } from "@/components/review-card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, SegmentedLinks } from "@/components/ui/segmented";
import { getCurrentUser } from "@/lib/auth";
import {
  getFollowers,
  getFollowing,
  getUserByUsername,
  getUserLibrary,
  getUserReviews,
  getUserStats,
  isFollowing,
  type UserListItem,
} from "@/lib/queries";
import { formatRating, plural } from "@/lib/utils";

type Tab = "reviews" | "jogados" | "jogando" | "quero-jogar" | "seguidores" | "seguindo";
const TABS: Tab[] = ["reviews", "jogados", "jogando", "quero-jogar", "seguidores", "seguindo"];

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ aba?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await getUserByUsername(username);
  return { title: user ? `${user.name} (@${user.username})` : "Perfil não encontrado" };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const [{ username }, { aba }] = await Promise.all([params, searchParams]);
  const [profile, me] = await Promise.all([getUserByUsername(username), getCurrentUser()]);
  if (!profile) notFound();

  const tab: Tab = TABS.includes(aba as Tab) ? (aba as Tab) : "reviews";
  const isMe = me?.id === profile.id;
  const viewerId = me?.id ?? null;
  const [stats, following] = await Promise.all([
    getUserStats(profile.id),
    me && !isMe ? isFollowing(me.id, profile.id) : false,
  ]);

  const base = `/u/${profile.username}`;
  const firstName = profile.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12">
      <header className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
        <Avatar name={profile.name} color={profile.avatarColor} size="xl" className="shadow-float" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{profile.name}</h1>
              <p className="text-muted">@{profile.username}</p>
            </div>
            {isMe ? (
              <Link href="/configuracoes" className="btn-outline">
                Editar perfil
              </Link>
            ) : (
              <FollowButton userId={profile.id} initial={following} isAuthed={!!me} />
            )}
          </div>
          {profile.bio && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-fg/85">{profile.bio}</p>}
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-subtle">
            <CalendarDays className="size-4" />
            No Savepoint desde{" "}
            {new Date(profile.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </div>
      </header>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Reviews" value={stats.reviews} href={base} />
        <Stat label="Jogos jogados" value={stats.played} href={`${base}?aba=jogados`} />
        <Stat label="Seguidores" value={stats.followers} href={`${base}?aba=seguidores`} />
        <Stat label="Seguindo" value={stats.following} href={`${base}?aba=seguindo`} />
      </dl>
      {stats.avg != null && (
        <p className="mt-3 text-center text-sm text-muted sm:text-left">
          Nota média que {isMe ? "você dá" : `${firstName} dá`}:{" "}
          <span className="font-semibold text-fg">{formatRating(Number(stats.avg))}</span> ★
        </p>
      )}

      <SegmentedLinks
        className="-mx-4 mt-8 mb-6 px-4 sm:mx-0 sm:px-0"
        active={tab}
        items={[
          { value: "reviews", label: "Reviews", href: base },
          { value: "jogados", label: "Jogados", href: `${base}?aba=jogados` },
          { value: "jogando", label: "Jogando", href: `${base}?aba=jogando` },
          { value: "quero-jogar", label: "Quero jogar", href: `${base}?aba=quero-jogar` },
          { value: "seguidores", label: "Seguidores", href: `${base}?aba=seguidores` },
          { value: "seguindo", label: "Seguindo", href: `${base}?aba=seguindo` },
        ]}
      />

      <TabContent tab={tab} userId={profile.id} viewerId={viewerId} isMe={isMe} firstName={firstName} />
    </div>
  );
}

async function TabContent({
  tab,
  userId,
  viewerId,
  isMe,
  firstName,
}: {
  tab: Tab;
  userId: number;
  viewerId: number | null;
  isMe: boolean;
  firstName: string;
}) {
  if (tab === "reviews") {
    const reviews = await getUserReviews(userId, viewerId);
    if (!reviews.length)
      return (
        <EmptyState
          icon={<MessageSquareText className="size-5" />}
          title={isMe ? "Você ainda não escreveu reviews" : `${firstName} ainda não escreveu reviews`}
          description={isMe ? "Use o botão “Criar review” para avaliar seu primeiro jogo." : undefined}
        />
      );
    return (
      <div className="space-y-3">
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} viewerId={viewerId} />
        ))}
      </div>
    );
  }

  if (tab === "seguidores" || tab === "seguindo") {
    const list = tab === "seguidores" ? await getFollowers(userId, viewerId) : await getFollowing(userId, viewerId);
    if (!list.length)
      return (
        <EmptyState
          icon={<Users className="size-5" />}
          title={tab === "seguidores" ? "Nenhum seguidor ainda" : "Não segue ninguém ainda"}
        />
      );
    return <UserList users={list} viewerId={viewerId} />;
  }

  const status = tab === "jogados" ? "played" : tab === "jogando" ? "playing" : "backlog";
  const games = await getUserLibrary(userId, status);
  if (!games.length)
    return (
      <EmptyState
        icon={status === "backlog" ? <Bookmark className="size-5" /> : <Gamepad2 className="size-5" />}
        title="Nada por aqui ainda"
        description={isMe ? "Marque jogos como jogado, jogando ou quero jogar na página de cada jogo." : undefined}
      >
        {isMe && (
          <Link href="/jogos" className="btn-primary">
            Explorar jogos
          </Link>
        )}
      </EmptyState>
    );
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5">
      {games.map((g) => (
        <GameCard key={g.id} game={g} />
      ))}
    </div>
  );
}

function UserList({ users, viewerId }: { users: UserListItem[]; viewerId: number | null }) {
  return (
    <ul className="card divide-y divide-line">
      {users.map((u) => (
        <li key={u.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <Link href={`/u/${u.username}`}>
            <Avatar name={u.name} color={u.avatarColor} size="md" />
          </Link>
          <div className="min-w-0 flex-1 leading-tight">
            <Link href={`/u/${u.username}`} className="block truncate font-semibold hover:underline">
              {u.name}
            </Link>
            <p className="truncate text-sm text-muted">
              @{u.username} · {plural(u.reviewCount, "review", "reviews")}
            </p>
          </div>
          {viewerId !== u.id && <FollowButton userId={u.id} initial={u.isFollowing} isAuthed={!!viewerId} size="sm" />}
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} scroll={false} className="card px-4 py-3.5 transition hover:shadow-float">
      <dd className="text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
      <dt className="text-[13px] text-muted">{label}</dt>
    </Link>
  );
}
