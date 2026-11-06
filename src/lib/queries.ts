import "server-only";
import { and, asc, desc, eq, inArray, like, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  follows,
  gameGenres,
  gamePlatforms,
  games,
  genres,
  libraryEntries,
  platforms,
  reviewLikes,
  reviews,
  users,
  type LibraryStatus,
} from "@/db/schema";

/* ------------------------------------------------------------------ */
/* Expressões reutilizáveis                                             */
/* ------------------------------------------------------------------ */

const avgRating = sql<number | null>`(select avg(r.rating) from ${reviews} r where r.game_id = "games"."id")`;
const reviewCount = sql<number>`(select count(*) from ${reviews} r where r.game_id = "games"."id")`.mapWith(Number);
// Média bayesiana: evita que um jogo com 1 review nota 5 lidere o ranking
const weightedScore = sql<number>`(
  (select count(*) from ${reviews} r where r.game_id = "games"."id") * 1.0 /
  ((select count(*) from ${reviews} r where r.game_id = "games"."id") + 2.0) *
  coalesce((select avg(r.rating) from ${reviews} r where r.game_id = "games"."id"), 0)
  + 2.0 / ((select count(*) from ${reviews} r where r.game_id = "games"."id") + 2.0) * 3.5
)`;
const platformIds = sql<string | null>`(select group_concat(gp.platform_id) from ${gamePlatforms} gp where gp.game_id = "games"."id")`;
const genreIds = sql<string | null>`(select group_concat(gg.genre_id) from ${gameGenres} gg where gg.game_id = "games"."id")`;

const gameSelect = {
  id: games.id,
  slug: games.slug,
  title: games.title,
  releaseYear: games.releaseYear,
  developer: games.developer,
  coverUrl: games.coverUrl,
  headerUrl: games.headerUrl,
  avgRating,
  reviewCount,
  platformIds,
  genreIds,
};

export type PlatformInfo = { id: number; slug: string; name: string; shortName: string };
export type GenreInfo = { id: number; slug: string; name: string };

export type GameCardData = {
  id: number;
  slug: string;
  title: string;
  releaseYear: number;
  developer: string;
  coverUrl: string | null;
  headerUrl: string | null;
  avgRating: number | null;
  reviewCount: number;
  platforms: PlatformInfo[];
  genres: GenreInfo[];
};

/* ------------------------------------------------------------------ */
/* Taxonomias                                                           */
/* ------------------------------------------------------------------ */

export async function getPlatforms(): Promise<PlatformInfo[]> {
  return db
    .select({ id: platforms.id, slug: platforms.slug, name: platforms.name, shortName: platforms.shortName })
    .from(platforms)
    .orderBy(asc(platforms.sortOrder));
}

export async function getGenres(): Promise<GenreInfo[]> {
  return db
    .select({ id: genres.id, slug: genres.slug, name: genres.name })
    .from(genres)
    .orderBy(asc(genres.name));
}

async function taxonomyMaps() {
  const [p, g] = await Promise.all([getPlatforms(), getGenres()]);
  return {
    platforms: new Map(p.map((x) => [x.id, x])),
    genres: new Map(g.map((x) => [x.id, x])),
    platformOrder: new Map(p.map((x, i) => [x.id, i])),
  };
}

type RawGame = {
  id: number;
  slug: string;
  title: string;
  releaseYear: number;
  developer: string;
  coverUrl: string | null;
  headerUrl: string | null;
  avgRating: number | null;
  reviewCount: number;
  platformIds: string | null;
  genreIds: string | null;
};

async function hydrate(rows: RawGame[]): Promise<GameCardData[]> {
  const maps = await taxonomyMaps();
  const ids = (s: string | null) => (s ? s.split(",").map(Number) : []);
  return rows.map(({ platformIds: pIds, genreIds: gIds, ...g }) => ({
    ...g,
    avgRating: g.avgRating == null ? null : Number(g.avgRating),
    platforms: ids(pIds)
      .sort((a, b) => (maps.platformOrder.get(a) ?? 0) - (maps.platformOrder.get(b) ?? 0))
      .map((id) => maps.platforms.get(id)!)
      .filter(Boolean),
    genres: ids(gIds)
      .map((id) => maps.genres.get(id)!)
      .filter(Boolean),
  }));
}

/* ------------------------------------------------------------------ */
/* Jogos                                                                */
/* ------------------------------------------------------------------ */

export type GameSort = "nota" | "populares" | "recentes" | "az";

export async function listGames(opts: {
  q?: string;
  genre?: string;
  platform?: string;
  sort?: GameSort;
  limit?: number;
  minReviews?: number;
}) {
  const where: SQL[] = [];
  if (opts.q?.trim()) where.push(like(games.title, `%${opts.q.trim()}%`));
  if (opts.genre) {
    where.push(
      inArray(
        games.id,
        db
          .select({ id: gameGenres.gameId })
          .from(gameGenres)
          .innerJoin(genres, eq(genres.id, gameGenres.genreId))
          .where(eq(genres.slug, opts.genre)),
      ),
    );
  }
  if (opts.platform) {
    where.push(
      inArray(
        games.id,
        db
          .select({ id: gamePlatforms.gameId })
          .from(gamePlatforms)
          .innerJoin(platforms, eq(platforms.id, gamePlatforms.platformId))
          .where(eq(platforms.slug, opts.platform)),
      ),
    );
  }
  if (opts.minReviews) where.push(sql`${reviewCount} >= ${opts.minReviews}`);

  const orderBy = {
    nota: [desc(weightedScore), desc(reviewCount), asc(games.title)],
    populares: [desc(reviewCount), desc(weightedScore), asc(games.title)],
    recentes: [desc(games.releaseYear), asc(games.title)],
    az: [asc(games.title)],
  }[opts.sort ?? "nota"];

  const rows = await db
    .select(gameSelect)
    .from(games)
    .where(where.length ? and(...where) : undefined)
    .orderBy(...orderBy)
    .limit(opts.limit ?? 120);

  return hydrate(rows);
}

export async function searchGames(q: string, limit = 8) {
  return listGames({ q, sort: q ? "populares" : "nota", limit });
}

export async function getGameBySlug(slug: string) {
  const [row] = await db
    .select({ ...gameSelect, summary: games.summary, publisher: games.publisher })
    .from(games)
    .where(eq(games.slug, slug))
    .limit(1);
  if (!row) return null;
  const { summary, publisher, ...rest } = row;
  const [card] = await hydrate([rest]);

  const dist = await db
    .select({ rating: reviews.rating, count: sql<number>`count(*)`.mapWith(Number) })
    .from(reviews)
    .where(eq(reviews.gameId, row.id))
    .groupBy(reviews.rating);

  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: dist.find((d) => d.rating === stars)?.count ?? 0,
  }));

  const [lib] = await db
    .select({
      played: sql<number>`sum(case when ${libraryEntries.status} = 'played' then 1 else 0 end)`.mapWith(Number),
      backlog: sql<number>`sum(case when ${libraryEntries.status} = 'backlog' then 1 else 0 end)`.mapWith(Number),
    })
    .from(libraryEntries)
    .where(eq(libraryEntries.gameId, row.id));

  return { ...card, summary, publisher, distribution, playedCount: lib?.played ?? 0, backlogCount: lib?.backlog ?? 0 };
}

export async function getSimilarGames(gameId: number, genreIdList: number[], limit = 6) {
  if (!genreIdList.length) return [];
  const rows = await db
    .select(gameSelect)
    .from(games)
    .where(
      and(
        ne(games.id, gameId),
        inArray(
          games.id,
          db.select({ id: gameGenres.gameId }).from(gameGenres).where(inArray(gameGenres.genreId, genreIdList)),
        ),
      ),
    )
    .orderBy(desc(weightedScore))
    .limit(limit);
  return hydrate(rows);
}

/* ------------------------------------------------------------------ */
/* Reviews                                                              */
/* ------------------------------------------------------------------ */

export type ReviewItem = {
  id: number;
  rating: number;
  title: string;
  body: string;
  spoiler: boolean;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  liked: boolean;
  platformName: string | null;
  platformId: number | null;
  user: { id: number; username: string; name: string; avatarColor: string };
  game: { id: number; slug: string; title: string; coverUrl: string | null; headerUrl: string | null; releaseYear: number };
};

function reviewSelect(viewerId: number | null) {
  return {
    id: reviews.id,
    rating: reviews.rating,
    title: reviews.title,
    body: reviews.body,
    spoiler: reviews.spoiler,
    createdAt: reviews.createdAt,
    updatedAt: reviews.updatedAt,
    platformId: reviews.platformId,
    platformName: platforms.name,
    likeCount: sql<number>`(select count(*) from ${reviewLikes} rl where rl.review_id = "reviews"."id")`.mapWith(Number),
    liked: viewerId
      ? sql<boolean>`exists(select 1 from ${reviewLikes} rl where rl.review_id = "reviews"."id" and rl.user_id = ${viewerId})`.mapWith(Boolean)
      : sql<boolean>`0`.mapWith(Boolean),
    user: { id: users.id, username: users.username, name: users.name, avatarColor: users.avatarColor },
    game: {
      id: games.id,
      slug: games.slug,
      title: games.title,
      coverUrl: games.coverUrl,
      headerUrl: games.headerUrl,
      releaseYear: games.releaseYear,
    },
  };
}

function baseReviewQuery(viewerId: number | null) {
  return db
    .select(reviewSelect(viewerId))
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .innerJoin(games, eq(games.id, reviews.gameId))
    .leftJoin(platforms, eq(platforms.id, reviews.platformId))
    .$dynamic();
}

export const FEED_PAGE = 12;

export async function getFeed(opts: {
  viewerId: number | null;
  mode: "seguindo" | "todos";
  offset?: number;
  limit?: number;
}): Promise<ReviewItem[]> {
  let q = baseReviewQuery(opts.viewerId);
  if (opts.mode === "seguindo" && opts.viewerId) {
    q = q.where(
      or(
        eq(reviews.userId, opts.viewerId),
        inArray(
          reviews.userId,
          db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, opts.viewerId)),
        ),
      ),
    );
  }
  return q
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(opts.limit ?? FEED_PAGE)
    .offset(opts.offset ?? 0);
}

export async function getGameReviews(gameId: number, viewerId: number | null, sort: "recentes" | "curtidas" | "nota") {
  const likeExpr = sql`(select count(*) from ${reviewLikes} rl where rl.review_id = "reviews"."id")`;
  const order =
    sort === "curtidas"
      ? [desc(likeExpr), desc(reviews.createdAt)]
      : sort === "nota"
        ? [desc(reviews.rating), desc(reviews.createdAt)]
        : [desc(reviews.createdAt)];
  return baseReviewQuery(viewerId)
    .where(eq(reviews.gameId, gameId))
    .orderBy(...order)
    .limit(100);
}

export async function getUserReviews(userId: number, viewerId: number | null) {
  return baseReviewQuery(viewerId).where(eq(reviews.userId, userId)).orderBy(desc(reviews.createdAt)).limit(100);
}

export async function getMyReview(userId: number, gameId: number) {
  const [r] = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      spoiler: reviews.spoiler,
      platformId: reviews.platformId,
    })
    .from(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.gameId, gameId)))
    .limit(1);
  return r ?? null;
}

/* ------------------------------------------------------------------ */
/* Usuários                                                             */
/* ------------------------------------------------------------------ */

export async function getUserByUsername(username: string) {
  const [u] = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      bio: users.bio,
      avatarColor: users.avatarColor,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);
  return u ?? null;
}

export async function getUserStats(userId: number) {
  const [row] = await db
    .select({
      reviews: sql<number>`(select count(*) from ${reviews} where user_id = ${userId})`.mapWith(Number),
      played: sql<number>`(select count(*) from ${libraryEntries} where user_id = ${userId} and status = 'played')`.mapWith(Number),
      followers: sql<number>`(select count(*) from ${follows} where following_id = ${userId})`.mapWith(Number),
      following: sql<number>`(select count(*) from ${follows} where follower_id = ${userId})`.mapWith(Number),
      avg: sql<number | null>`(select avg(rating) from ${reviews} where user_id = ${userId})`,
    })
    .from(users)
    .where(eq(users.id, userId));
  return row;
}

export async function isFollowing(followerId: number, followingId: number) {
  const [r] = await db
    .select({ x: follows.followerId })
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
    .limit(1);
  return !!r;
}

export type UserListItem = {
  id: number;
  username: string;
  name: string;
  bio: string;
  avatarColor: string;
  reviewCount: number;
  isFollowing: boolean;
};

function userListSelect(viewerId: number | null) {
  return {
    id: users.id,
    username: users.username,
    name: users.name,
    bio: users.bio,
    avatarColor: users.avatarColor,
    reviewCount: sql<number>`(select count(*) from ${reviews} r where r.user_id = "users"."id")`.mapWith(Number),
    isFollowing: viewerId
      ? sql<boolean>`exists(select 1 from ${follows} f where f.follower_id = ${viewerId} and f.following_id = "users"."id")`.mapWith(Boolean)
      : sql<boolean>`0`.mapWith(Boolean),
  };
}

export async function getFollowers(userId: number, viewerId: number | null): Promise<UserListItem[]> {
  return db
    .select(userListSelect(viewerId))
    .from(follows)
    .innerJoin(users, eq(users.id, follows.followerId))
    .where(eq(follows.followingId, userId))
    .orderBy(desc(follows.createdAt));
}

export async function getFollowing(userId: number, viewerId: number | null): Promise<UserListItem[]> {
  return db
    .select(userListSelect(viewerId))
    .from(follows)
    .innerJoin(users, eq(users.id, follows.followingId))
    .where(eq(follows.followerId, userId))
    .orderBy(desc(follows.createdAt));
}

export async function getSuggestedUsers(viewerId: number | null, limit = 4): Promise<UserListItem[]> {
  const where: SQL[] = [];
  if (viewerId) {
    where.push(ne(users.id, viewerId));
    where.push(
      notInArray(users.id, db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, viewerId))),
    );
  }
  return db
    .select(userListSelect(viewerId))
    .from(users)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(sql`(select count(*) from ${follows} f where f.following_id = "users"."id")`))
    .limit(limit);
}

export async function getUserLibrary(userId: number, status: LibraryStatus) {
  const rows = await db
    .select(gameSelect)
    .from(libraryEntries)
    .innerJoin(games, eq(games.id, libraryEntries.gameId))
    .where(and(eq(libraryEntries.userId, userId), eq(libraryEntries.status, status)))
    .orderBy(desc(libraryEntries.updatedAt));
  return hydrate(rows);
}

export async function getLibraryStatus(userId: number, gameId: number): Promise<LibraryStatus | null> {
  const [r] = await db
    .select({ status: libraryEntries.status })
    .from(libraryEntries)
    .where(and(eq(libraryEntries.userId, userId), eq(libraryEntries.gameId, gameId)))
    .limit(1);
  return r?.status ?? null;
}

export async function getPlatformStats() {
  const row = await db.get<{ games: number; reviews: number; users: number }>(
    sql`select (select count(*) from ${games}) as games, (select count(*) from ${reviews}) as reviews, (select count(*) from ${users}) as users`,
  );
  return { games: Number(row.games), reviews: Number(row.reviews), users: Number(row.users) };
}
