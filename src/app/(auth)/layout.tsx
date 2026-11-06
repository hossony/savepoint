import { redirect } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/");
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <LogoMark className="mx-auto mb-6 size-12" />
        {children}
      </div>
    </div>
  );
}
