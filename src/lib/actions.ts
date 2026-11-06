"use server";

import bcrypt from "bcryptjs";
import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { follows, gamePlatforms, games, libraryEntries, reviewLikes, reviews, users } from "@/db/schema";
import { createSession, destroySession, getCurrentUser } from "./auth";
import { FEED_PAGE, getFeed } from "./queries";
import { AVATAR_COLORS } from "./utils";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Autenticação                                                         */
/* ------------------------------------------------------------------ */

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Mínimo de 3 caracteres")
    .max(20, "Máximo de 20 caracteres")
    .regex(/^[a-z0-9_.]+$/, "Use apenas letras, números, ponto e _"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres").max(100),
});

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { name, username, email, password } = parsed.data;

  const [exists] = await db
    .select({ username: users.username, email: users.email })
    .from(users)
    .where(or(eq(users.username, username), eq(users.email, email)))
    .limit(1);
  if (exists) {
    return exists.email === email
      ? { fieldErrors: { email: "Este e-mail já está em uso" } }
      : { fieldErrors: { username: "Este nome de usuário já existe" } };
  }

  const colors = Object.keys(AVATAR_COLORS);
  const [user] = await db
    .insert(users)
    .values({
      name,
      username,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
    })
    .returning({ id: users.id });

  await createSession(user.id);
  redirect("/");
}

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Informe seu e-mail ou usuário"),
  password: z.string().min(1, "Informe sua senha"),
});

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email, password } = parsed.data;

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, email)))
    .limit(1);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "E-mail ou senha incorretos" };
  }

  await createSession(user.id);
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  await destroySession();
  redirect("/");
}

/* ------------------------------------------------------------------ */
/* Perfil                                                               */
/* ------------------------------------------------------------------ */

const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(60),
  bio: z.string().trim().max(240, "Máximo de 240 caracteres"),
  avatarColor: z.string().refine((c) => c in AVATAR_COLORS, "Cor inválida"),
});

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me) return { error: "Faça login novamente" };
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  await db.update(users).set(parsed.data).where(eq(users.id, me.id));
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Reviews                                                              */
/* ------------------------------------------------------------------ */

const reviewSchema = z.object({
  gameId: z.number().int().positive(),
  rating: z.number().int().min(1, "Escolha de 1 a 5 estrelas").max(5),
  platformId: z.number().int().positive().nullable(),
  title: z.string().trim().max(90, "Título muito longo"),
  body: z.string().trim().min(10, "Escreva ao menos 10 caracteres").max(5000, "Máximo de 5000 caracteres"),
  spoiler: z.boolean(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export async function saveReview(
  input: ReviewInput,
): Promise<{ ok: true; slug: string; updated: boolean } | { ok: false; error: string }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Você precisa entrar para publicar uma review" };

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const data = parsed.data;

  const [game] = await db.select({ id: games.id, slug: games.slug }).from(games).where(eq(games.id, data.gameId));
  if (!game) return { ok: false, error: "Jogo não encontrado" };

  if (data.platformId) {
    const [ok] = await db
      .select({ x: gamePlatforms.gameId })
      .from(gamePlatforms)
      .where(and(eq(gamePlatforms.gameId, game.id), eq(gamePlatforms.platformId, data.platformId)));
    if (!ok) return { ok: false, error: "Plataforma inválida para este jogo" };
  }

  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.userId, me.id), eq(reviews.gameId, game.id)));

  if (existing) {
    await db
      .update(reviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reviews.id, existing.id));
  } else {
    await db.insert(reviews).values({ ...data, userId: me.id });
  }

  await db
    .insert(libraryEntries)
    .values({ userId: me.id, gameId: game.id, status: "played" })
    .onConflictDoUpdate({
      target: [libraryEntries.userId, libraryEntries.gameId],
      set: { status: "played", updatedAt: new Date() },
    });

  revalidatePath("/", "layout");
  return { ok: true, slug: game.slug, updated: !!existing };
}

export async function deleteReview(reviewId: number) {
  const me = await getCurrentUser();
  if (!me) return { ok: false };
  await db.delete(reviews).where(and(eq(reviews.id, reviewId), eq(reviews.userId, me.id)));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleLike(reviewId: number) {
  const me = await getCurrentUser();
  if (!me) return { ok: false as const, error: "auth" };
  const where = and(eq(reviewLikes.userId, me.id), eq(reviewLikes.reviewId, reviewId));
  const [exists] = await db.select({ x: reviewLikes.userId }).from(reviewLikes).where(where);
  if (exists) await db.delete(reviewLikes).where(where);
  else await db.insert(reviewLikes).values({ userId: me.id, reviewId }).onConflictDoNothing();
  return { ok: true as const, liked: !exists };
}

export async function loadMoreFeed(mode: "seguindo" | "todos", offset: number) {
  const me = await getCurrentUser();
  return getFeed({ viewerId: me?.id ?? null, mode: me ? mode : "todos", offset, limit: FEED_PAGE });
}

/* ------------------------------------------------------------------ */
/* Social e biblioteca                                                  */
/* ------------------------------------------------------------------ */

export async function toggleFollow(targetId: number) {
  const me = await getCurrentUser();
  if (!me) return { ok: false as const, error: "auth" };
  if (me.id === targetId) return { ok: false as const, error: "self" };
  const where = and(eq(follows.followerId, me.id), eq(follows.followingId, targetId));
  const [exists] = await db.select({ x: follows.followerId }).from(follows).where(where);
  if (exists) await db.delete(follows).where(where);
  else await db.insert(follows).values({ followerId: me.id, followingId: targetId }).onConflictDoNothing();
  revalidatePath("/", "layout");
  return { ok: true as const, following: !exists };
}

export async function setLibraryStatus(gameId: number, status: "played" | "playing" | "backlog" | null) {
  const me = await getCurrentUser();
  if (!me) return { ok: false as const, error: "auth" };
  if (status === null) {
    await db.delete(libraryEntries).where(and(eq(libraryEntries.userId, me.id), eq(libraryEntries.gameId, gameId)));
  } else {
    await db
      .insert(libraryEntries)
      .values({ userId: me.id, gameId, status })
      .onConflictDoUpdate({
        target: [libraryEntries.userId, libraryEntries.gameId],
        set: { status, updatedAt: new Date() },
      });
  }
  revalidatePath("/", "layout");
  return { ok: true as const, status };
}
