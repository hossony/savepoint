import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Navbar } from "@/components/navbar";
import { Providers } from "@/components/providers";
import { LogoMark } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Savepoint — reviews de games", template: "%s · Savepoint" },
  description:
    "Savepoint é a plataforma aberta para registrar os jogos que você jogou, escrever reviews, dar estrelas e descobrir o que jogar a seguir.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers isAuthed={!!user}>
          <Navbar user={user} />
          <main className={user ? "pb-24 md:pb-0" : ""}>{children}</main>
          <footer className={`mt-20 border-t border-line ${user ? "mb-16 md:mb-0" : ""}`}>
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-subtle sm:flex-row">
              <div className="flex items-center gap-2">
                <LogoMark className="size-5" />
                <span>Savepoint · Feito por jogadores, para jogadores.</span>
              </div>
              <span>© {new Date().getFullYear()} Savepoint. Imagens dos jogos pertencem aos seus respectivos donos.</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
