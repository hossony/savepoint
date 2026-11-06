"use client";

import { Check, Laptop, Loader2, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useActionState, useEffect, useState } from "react";
import { updateProfile, type FormState } from "@/lib/actions";
import type { SessionUser } from "@/lib/auth";
import { AVATAR_COLORS, cn } from "@/lib/utils";
import { Avatar } from "./ui/avatar";
import { useToast } from "./ui/toast";

export function ProfileForm({ user }: { user: SessionUser }) {
  const toast = useToast();
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, undefined);
  const [name, setName] = useState(user.name);
  const [color, setColor] = useState(user.avatarColor);
  const [bio, setBio] = useState(user.bio);

  useEffect(() => {
    if (state?.ok) toast("Perfil atualizado");
  }, [state, toast]);

  return (
    <form action={action} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={name || user.name} color={color} size="lg" />
        <div>
          <p className="font-semibold">{name || user.name}</p>
          <p className="text-sm text-muted">@{user.username}</p>
        </div>
      </div>

      <div>
        <span className="label">Cor do avatar</span>
        <input type="hidden" name="avatarColor" value={color} />
        <div className="flex flex-wrap gap-2.5">
          {Object.entries(AVATAR_COLORS).map(([key, cls]) => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              aria-label={`Cor ${key}`}
              aria-pressed={color === key}
              className={cn(
                "grid size-8 place-items-center rounded-full bg-gradient-to-br ring-offset-2 ring-offset-surface transition",
                cls,
                color === key ? "ring-2 ring-accent" : "hover:scale-110",
              )}
            >
              {color === key && <Check className="size-4 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="name" className="label">
          Nome
        </label>
        <input id="name" name="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        {state?.fieldErrors?.name && <p className="mt-1.5 text-[13px] text-danger">{state.fieldErrors.name}</p>}
      </div>

      <div>
        <label htmlFor="bio" className="label">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={240}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Conte que tipo de jogo você curte"
          className="input h-auto resize-none py-3 leading-relaxed"
        />
        <p className="mt-1 text-right text-xs text-subtle tabular-nums">{bio.length}/240</p>
      </div>

      <div className="flex justify-end">
        <button disabled={pending} className="btn-primary min-w-32">
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const options = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "system", label: "Automático", icon: Laptop },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-sm font-medium transition",
              active ? "border-accent bg-accent-soft text-accent" : "border-line-strong text-muted hover:text-fg",
            )}
          >
            <Icon className="size-5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
