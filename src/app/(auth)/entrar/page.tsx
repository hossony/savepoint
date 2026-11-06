import type { Metadata } from "next";
import { SignInForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-center text-2xl font-semibold tracking-tight">Entrar no Savepoint</h1>
      <p className="mt-2 mb-8 text-center text-sm text-muted">Bem-vindo de volta.</p>
      <div className="card p-6">
        <SignInForm next={next} />
      </div>
      <p className="mt-6 rounded-xl border border-dashed border-line-strong px-4 py-3 text-center text-xs text-muted">
        Conta de demonstração: <span className="font-medium text-fg">demo@savepoint.app</span> · senha{" "}
        <span className="font-medium text-fg">savepoint123</span>
      </p>
    </>
  );
}
