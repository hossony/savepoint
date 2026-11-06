"use client";

import { Compass, Home, LogOut, Plus, Search, Settings, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/actions";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { CreateReviewButton, ThemeToggle } from "./actions-ui";
import { Logo } from "./logo";
import { useReviewComposer } from "./review-composer";
import { Avatar } from "./ui/avatar";

const LINKS = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/jogos", label: "Explorar", icon: Compass },
  { href: "/ranking", label: "Ranking", icon: Trophy },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Navbar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-nav backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Logo />

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition",
                  isActive(pathname, l.href) ? "bg-surface-3/80 text-fg" : "text-muted hover:text-fg",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Suspense fallback={<div className="hidden w-56 lg:block" />}>
              <NavSearch />
            </Suspense>
            <Link href="/jogos" className="btn-ghost size-9 px-0 lg:hidden" aria-label="Buscar jogos">
              <Search className="size-[18px]" />
            </Link>
            <ThemeToggle />
            {user ? (
              <>
                <CreateReviewButton className="hidden h-8 px-3.5 text-[13px] md:inline-flex" />
                <UserMenu user={user} />
              </>
            ) : (
              <>
                <Link href="/entrar" className="btn-primary h-8 px-3.5 text-[13px] sm:hidden">
                  Entrar
                </Link>
                <Link href="/entrar" className="btn-ghost hidden h-8 px-3 text-[13px] sm:inline-flex">
                  Entrar
                </Link>
                <Link href="/cadastro" className="btn-primary hidden h-8 px-3.5 text-[13px] sm:inline-flex">
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {user && <MobileTabBar username={user.username} />}
    </>
  );
}

function NavSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(pathname === "/jogos" ? (params.get("q") ?? "") : "");

  useEffect(() => {
    if (pathname !== "/jogos") setQ("");
  }, [pathname]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const sp = new URLSearchParams(pathname === "/jogos" ? params.toString() : "");
        if (q.trim()) sp.set("q", q.trim());
        else sp.delete("q");
        router.push(`/jogos${sp.size ? `?${sp}` : ""}`);
      }}
      className="relative hidden lg:block"
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar jogos"
        aria-label="Buscar jogos"
        className="h-8 w-56 rounded-full bg-surface-3/70 pr-3 pl-9 text-[13px] text-fg transition-all outline-none placeholder:text-subtle focus:w-72 focus:bg-surface focus:ring-2 focus:ring-accent/40"
      />
    </form>
  );
}

function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full transition hover:opacity-85"
        aria-label="Menu da conta"
        aria-expanded={open}
      >
        <Avatar name={user.name} color={user.avatarColor} size="sm" />
      </button>
      {open && (
        <div className="absolute top-11 right-0 w-60 animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-float">
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar name={user.name} color={user.avatarColor} size="md" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted">@{user.username}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          <MenuLink href={`/u/${user.username}`} icon={User}>
            Meu perfil
          </MenuLink>
          <MenuLink href="/configuracoes" icon={Settings}>
            Configurações
          </MenuLink>
          <div className="my-1 h-px bg-line" />
          <form action={signOut}>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger hover:bg-surface-2">
              <LogOut className="size-4" /> Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon: Icon, children }: { href: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-surface-2">
      <Icon className="size-4 text-muted" />
      {children}
    </Link>
  );
}

function MobileTabBar({ username }: { username: string }) {
  const pathname = usePathname();
  const open = useReviewComposer();
  const items = [
    LINKS[0],
    LINKS[1],
    null,
    LINKS[2],
    { href: `/u/${username}`, label: "Perfil", icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-nav pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 md:hidden">
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
        {items.map((item, i) =>
          item ? (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-medium transition",
                isActive(pathname, item.href) ? "text-accent" : "text-subtle",
              )}
            >
              <item.icon className="size-[22px]" strokeWidth={isActive(pathname, item.href) ? 2.2 : 1.8} />
              {item.label}
            </Link>
          ) : (
            <div key={i} className="flex justify-center">
              <button
                onClick={() => open()}
                aria-label="Criar review"
                className="grid size-11 place-items-center rounded-full bg-accent text-white shadow-float transition active:scale-95"
              >
                <Plus className="size-5" strokeWidth={2.5} />
              </button>
            </div>
          ),
        )}
      </div>
    </nav>
  );
}
