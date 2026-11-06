import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { ProfileForm, ThemePicker } from "@/components/settings-form";
import { signOut } from "@/lib/actions";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 md:py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Configurações</h1>

      <section className="mt-8">
        <h2 className="mb-3 px-1 text-[13px] font-medium tracking-wide text-muted uppercase">Perfil</h2>
        <div className="card p-6">
          <ProfileForm user={user} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 px-1 text-[13px] font-medium tracking-wide text-muted uppercase">Aparência</h2>
        <div className="card p-6">
          <ThemePicker />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 px-1 text-[13px] font-medium tracking-wide text-muted uppercase">Conta</h2>
        <div className="card divide-y divide-line">
          <div className="flex items-center justify-between px-6 py-4 text-sm">
            <span className="text-muted">E-mail</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <form action={signOut} className="px-6 py-4">
            <button className="flex items-center gap-2 text-sm font-medium text-danger">
              <LogOut className="size-4" /> Sair da conta
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
