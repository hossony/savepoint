"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { loadMoreFeed } from "@/lib/actions";
import type { ReviewItem } from "@/lib/queries";
import { ReviewCard } from "./review-card";

export function FeedList({
  initial,
  mode,
  viewerId,
  pageSize,
}: {
  initial: ReviewItem[];
  mode: "seguindo" | "todos";
  viewerId: number | null;
  pageSize: number;
}) {
  const [items, setItems] = useState(initial);
  const [done, setDone] = useState(initial.length < pageSize);
  const [pending, start] = useTransition();

  // quando o servidor re-renderiza (nova review, troca de aba), reinicia a lista
  useEffect(() => {
    setItems(initial);
    setDone(initial.length < pageSize);
  }, [initial, pageSize]);

  function more() {
    start(async () => {
      const next = await loadMoreFeed(mode, items.length);
      setItems((cur) => {
        const ids = new Set(cur.map((r) => r.id));
        return [...cur, ...next.filter((r) => !ids.has(r.id))];
      });
      if (next.length < pageSize) setDone(true);
    });
  }

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <ReviewCard key={r.id} review={r} viewerId={viewerId} />
      ))}
      {!done && (
        <div className="flex justify-center pt-2">
          <button onClick={more} disabled={pending} className="btn-outline min-w-40">
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Carregar mais"}
          </button>
        </div>
      )}
      {done && items.length > pageSize && (
        <p className="py-6 text-center text-sm text-subtle">Você chegou ao fim do feed.</p>
      )}
    </div>
  );
}
