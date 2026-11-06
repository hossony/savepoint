"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type FormState } from "@/lib/actions";

function Field({
  name,
  label,
  type = "text",
  error,
  autoComplete,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-invalid={!!error}
        className={`input ${error ? "border-danger focus:border-danger" : ""}`}
      />
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="btn-primary h-11 w-full text-[15px]">
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <Field name="email" label="E-mail ou usuário" autoComplete="username" error={state?.fieldErrors?.email} />
      <Field name="password" label="Senha" type="password" autoComplete="current-password" error={state?.fieldErrors?.password} />
      {state?.error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.error}</p>}
      <Submit pending={pending}>Entrar</Submit>
      <p className="text-center text-sm text-muted">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-accent">
          Criar conta
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, undefined);
  const e = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <Field name="name" label="Nome" autoComplete="name" placeholder="Como você quer ser chamado" error={e.name} />
      <Field name="username" label="Nome de usuário" autoComplete="username" placeholder="ex.: marina_rpg" error={e.username} />
      <Field name="email" label="E-mail" type="email" autoComplete="email" error={e.email} />
      <Field name="password" label="Senha" type="password" autoComplete="new-password" placeholder="Mínimo de 8 caracteres" error={e.password} />
      {state?.error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.error}</p>}
      <Submit pending={pending}>Criar conta</Submit>
      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-accent">
          Entrar
        </Link>
      </p>
    </form>
  );
}
