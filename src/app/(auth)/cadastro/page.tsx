import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-center text-2xl font-semibold tracking-tight">Crie sua conta</h1>
      <p className="mt-2 mb-8 text-center text-sm text-muted">Comece a registrar e avaliar seus jogos.</p>
      <div className="card p-6">
        <SignUpForm />
      </div>
    </>
  );
}
