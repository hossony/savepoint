import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMyReview, searchGames } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.slice(0, 80) ?? "";
  const [me, results] = await Promise.all([getCurrentUser(), searchGames(q, 8)]);

  const withMine = await Promise.all(
    results.map(async (g) => ({
      ...g,
      myReview: me ? await getMyReview(me.id, g.id) : null,
    })),
  );

  return NextResponse.json({ results: withMine });
}
