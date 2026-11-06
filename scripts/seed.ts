import "dotenv/config";
import bcrypt from "bcryptjs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as s from "../src/db/schema";
import { GAMES, GENRES, PLATFORMS, REVIEWS, USERS } from "./data";

const STEAM = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps";
const DEMO_PASSWORD = "savepoint123";

// PRNG determinístico para curtidas/seguidores sempre iguais
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(33);

async function main() {
  const client = createClient({
    url: process.env.DATABASE_URL ?? "file:local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  const db = drizzle(client, { schema: s });

  console.log("→ Limpando dados antigos…");
  for (const table of [
    s.reviewLikes,
    s.follows,
    s.libraryEntries,
    s.reviews,
    s.gameGenres,
    s.gamePlatforms,
    s.games,
    s.genres,
    s.platforms,
    s.users,
  ]) {
    await db.delete(table);
  }

  console.log("→ Plataformas e gêneros…");
  const platformRows = await db.insert(s.platforms).values([...PLATFORMS]).returning();
  const genreRows = await db.insert(s.genres).values([...GENRES]).returning();
  const platformId = new Map(platformRows.map((p) => [p.slug, p.id]));
  const genreId = new Map(genreRows.map((g) => [g.slug, g.id]));

  console.log(`→ ${GAMES.length} jogos…`);
  const gameId = new Map<string, number>();
  for (const g of GAMES) {
    const [row] = await db
      .insert(s.games)
      .values({
        slug: g.slug,
        title: g.title,
        summary: g.summary,
        developer: g.developer,
        publisher: g.publisher,
        releaseYear: g.year,
        coverUrl: g.steamId ? `${STEAM}/${g.steamId}/library_600x900.jpg` : null,
        headerUrl: g.steamId ? `${STEAM}/${g.steamId}/header.jpg` : null,
      })
      .returning({ id: s.games.id });
    gameId.set(g.slug, row.id);
    await db
      .insert(s.gamePlatforms)
      .values(g.platforms.map((p) => ({ gameId: row.id, platformId: platformId.get(p)! })));
    await db
      .insert(s.gameGenres)
      .values(g.genres.map((x) => ({ gameId: row.id, genreId: genreId.get(x)! })));
  }

  console.log(`→ ${USERS.length} usuários…`);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = Date.now();
  const day = 86_400_000;
  const userRows = await db
    .insert(s.users)
    .values(
      USERS.map((u, i) => ({
        username: u.username,
        name: u.name,
        email: u.email,
        bio: u.bio,
        avatarColor: u.color,
        passwordHash,
        createdAt: new Date(now - (120 + i * 9) * day),
      })),
    )
    .returning();
  const userId = new Map(userRows.map((u) => [u.username, u.id]));

  console.log(`→ ${REVIEWS.length} reviews…`);
  const reviewIds: { id: number; author: number }[] = [];
  for (const r of REVIEWS) {
    const created = new Date(now - r.daysAgo * day - Math.floor(rand() * day * 0.8));
    const [row] = await db
      .insert(s.reviews)
      .values({
        userId: userId.get(r.user)!,
        gameId: gameId.get(r.game)!,
        platformId: platformId.get(r.platform)!,
        rating: r.rating,
        title: r.title,
        body: r.body,
        spoiler: r.spoiler ?? false,
        createdAt: created,
        updatedAt: created,
      })
      .returning({ id: s.reviews.id });
    reviewIds.push({ id: row.id, author: userId.get(r.user)! });
    await db
      .insert(s.libraryEntries)
      .values({ userId: userId.get(r.user)!, gameId: gameId.get(r.game)!, status: "played", updatedAt: created })
      .onConflictDoNothing();
  }

  console.log("→ Biblioteca (jogando / quero jogar)…");
  const slugs = GAMES.map((g) => g.slug);
  for (const u of userRows) {
    for (let i = 0; i < 6; i++) {
      const slug = slugs[Math.floor(rand() * slugs.length)];
      await db
        .insert(s.libraryEntries)
        .values({ userId: u.id, gameId: gameId.get(slug)!, status: i < 2 ? "playing" : "backlog" })
        .onConflictDoNothing();
    }
  }

  console.log("→ Seguidores…");
  for (const a of userRows) {
    for (const b of userRows) {
      if (a.id === b.id) continue;
      const always = a.username === "demo"; // a conta demo segue todo mundo
      if (always || rand() < 0.55) {
        await db.insert(s.follows).values({ followerId: a.id, followingId: b.id }).onConflictDoNothing();
      }
    }
  }

  console.log("→ Curtidas…");
  for (const r of reviewIds) {
    for (const u of userRows) {
      if (u.id !== r.author && rand() < 0.45) {
        await db.insert(s.reviewLikes).values({ userId: u.id, reviewId: r.id }).onConflictDoNothing();
      }
    }
  }

  console.log("\n✓ Seed concluído");
  console.log(`  Login demo: demo@savepoint.app / ${DEMO_PASSWORD}`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
