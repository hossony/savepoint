"use client";

import { useState } from "react";
import { cn, coverGradient } from "@/lib/utils";

/**
 * Capa do jogo. A capa tipográfica fica sempre por baixo (carregamento e fallback);
 * por cima tenta a capa vertical e, se falhar, o banner horizontal.
 */
export function GameCover({
  title,
  coverUrl,
  headerUrl,
  className,
  sizes = "md",
}: {
  title: string;
  coverUrl: string | null;
  headerUrl?: string | null;
  className?: string;
  sizes?: "xs" | "sm" | "md" | "lg";
}) {
  const sources = [coverUrl, headerUrl].filter(Boolean) as string[];
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = sources[idx];

  const text = { xs: "text-[7px] p-1", sm: "text-[10px] p-2", md: "text-sm p-3", lg: "text-lg p-4" }[sizes];

  return (
    <div
      className={cn("relative aspect-[2/3] overflow-hidden rounded-xl ring-1 ring-line ring-inset", className)}
      style={{ background: coverGradient(title) }}
    >
      <div className={cn("absolute inset-0 flex flex-col justify-end", text)} aria-hidden={loaded}>
        <span className="line-clamp-4 leading-tight font-semibold tracking-tight text-white/95">{title}</span>
      </div>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={`Capa de ${title}`}
          loading="lazy"
          decoding="async"
          ref={(el) => {
            // imagem já carregada (ou com erro) antes da hidratação
            if (!el || !el.complete) return;
            if (el.naturalWidth > 0) setLoaded(true);
            else setIdx((i) => (sources[i] === el.getAttribute("src") ? i + 1 : i));
          }}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setIdx((i) => i + 1);
          }}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
