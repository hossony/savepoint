# Savepoint

**Savepoint** é uma plataforma aberta de reviews de video games. Cada jogador tem sua conta e seu perfil, registra os jogos que jogou, escreve reviews com estrelas, segue outros jogadores e descobre o próximo jogo pelos rankings da comunidade.

## Funcionalidades

- **Contas e perfis**: cadastro, login e sessão segura (JWT em cookie httpOnly, senhas com bcrypt). O perfil mostra bio, cor do avatar, estatísticas, reviews, jogos jogados, jogando, quero jogar, seguidores e seguindo.
- **Feed**: abas *Seguindo* e *Para todos*, com curtidas, aviso de spoiler, "ler mais" e paginação com "Carregar mais".
- **Criar review (modal)**: você busca o jogo no catálogo (que já vem com miniatura e plataformas), escolhe de 1 a 5 estrelas, a plataforma em que jogou, um título opcional, o texto e se tem spoiler. Se você já avaliou aquele jogo, o modal abre em modo de edição.
- **Ranking**: Top 10 geral e os melhores de cada categoria (gênero), com filtro por plataforma. A nota usa média bayesiana, para que um jogo com uma única review 5★ não passe na frente de um com várias.
- **Explorar**: busca por nome e filtros de gênero, plataforma e ordenação (nota, mais reviews, lançamento, A–Z). O estado fica na URL.
- **Página do jogo**: resumo, ficha técnica, plataformas, média, distribuição das notas, botões Jogado / Jogando / Quero jogar, todas as reviews (ordenadas por recentes, mais curtidas ou maior nota) e jogos parecidos.
- **Tema claro e escuro** (também automático pelo sistema), design responsivo com barra de navegação inferior no celular e sheet modal.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| UI | React 19, Tailwind CSS v4, lucide-react |
| Tipografia | SF Pro (fonte do sistema em dispositivos Apple) com Inter como fallback |
| Tema | next-themes |
| Banco | SQLite via libSQL + Drizzle ORM (local em arquivo ou Turso em produção) |
| Auth | jose (JWT) + bcryptjs |
| Validação | zod |

## Como rodar

Requisitos: Node.js 20 ou superior.

```bash
npm install
cp .env.example .env      # opcional em desenvolvimento
npm run db:setup          # cria as tabelas e popula o catálogo
npm run dev
```

Abra http://localhost:3000.

**Conta de demonstração:** `demo@savepoint.app` / `savepoint123` (todos os usuários do seed usam essa senha, por exemplo `marina@savepoint.app`).

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run db:setup` | Migra e popula o banco (`db:migrate` + `db:seed`) |
| `npm run db:seed` | Recria os dados de exemplo (**apaga os dados atuais**) |
| `npm run db:generate` | Gera uma nova migração após alterar `src/db/schema.ts` |
| `npm run db:studio` | Abre o Drizzle Studio para inspecionar o banco |

## Estrutura

```
src/
  app/
    page.tsx               Feed (logado) ou página inicial (visitante)
    jogos/page.tsx         Explorar: busca e filtros
    jogos/[slug]/page.tsx  Página do jogo
    ranking/page.tsx       Ranking por categoria e plataforma
    u/[username]/page.tsx  Perfil com abas
    configuracoes/         Editar perfil e tema
    (auth)/entrar|cadastro Login e cadastro
    api/games/search       Busca usada pelo modal de review
  components/              UI: navbar, modal de review, cards, estrelas…
  db/schema.ts             Tabelas (users, games, reviews, follows, likes…)
  lib/
    auth.ts                Sessão e usuário atual
    actions.ts             Server Actions (reviews, curtidas, seguir, biblioteca, perfil)
    queries.ts             Consultas (feed, ranking, perfis…)
scripts/
  data.ts                  Catálogo de 62 jogos, plataformas, gêneros e reviews de exemplo
  seed.ts / migrate.ts
drizzle/                   Migrações SQL
```

## Catálogo de jogos

O catálogo fica em `scripts/data.ts`. Para adicionar jogos, inclua um item em `GAMES` (com `steamId`, se o jogo estiver na Steam, para puxar a miniatura automaticamente) e rode `npm run db:seed`.

As miniaturas vêm da CDN pública da Steam. Jogos que não estão na Steam (Nintendo, alguns exclusivos de PlayStation, Minecraft…) aparecem com uma capa tipográfica elegante, gerada pela própria interface. Você pode trocar por uma URL própria preenchendo `cover_url` e `header_url` no banco.

> Os nomes e imagens dos jogos pertencem aos seus respectivos donos. Para um lançamento público, considere integrar uma API de catálogo licenciada (como IGDB ou RAWG) e revisar os termos de uso das imagens.

## Deploy (Vercel + Turso)

1. Suba o projeto para o GitHub e importe na Vercel.
2. Instale a integração **Turso Cloud** pela Vercel. Ela cria `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`, que o projeto já reconhece.
3. Adicione manualmente a variável `AUTH_SECRET` (gere com `openssl rand -base64 32`).
4. Crie as tabelas e popule o banco de produção a partir do seu computador:
   ```bash
   npx vercel link
   npx vercel env pull .env.production.local --environment=production
   npm run db:setup:prod
   ```
5. Faça um redeploy na Vercel.

> `.env.production.local` está no `.gitignore`. Nunca rode `db:setup:prod` de novo depois de ter usuários reais: o seed apaga os dados. Para mudanças de schema, use `DOTENV_CONFIG_PATH=.env.production.local npm run db:migrate`.
