import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-28 text-center">
      <p className="text-sm font-semibold text-accent">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Nenhum save encontrado aqui</h1>
      <p className="mt-3 text-muted">A página que você procura não existe ou foi removida.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-primary">
          Voltar ao início
        </Link>
        <Link href="/jogos" className="btn-outline">
          Explorar jogos
        </Link>
      </div>
    </div>
  );
}
