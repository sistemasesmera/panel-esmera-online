"use client";

import { useState, useTransition } from "react";
import { X, Loader2, Eye, EyeOff } from "lucide-react";
import { createUser, updateUser, type UserFormData } from "@/app/(app)/admin/users/actions";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/domain/shared/permissions";
import { cn } from "@/lib/utils";
import type { UserRow } from "@/lib/data/users.repository";

type Props = {
  user?: UserRow;
  onClose: () => void;
};

const inputCls = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 bg-white transition-shadow";

const ROLE_COLORS: Record<AppRole, string> = {
  setter:         "bg-blue-50 text-blue-700 ring-1 ring-blue-200/60",
  closer:         "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
  administracion: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60",
  tutor:          "bg-teal-50 text-teal-700 ring-1 ring-teal-200/60",
};

export function UserDialog({ user, onClose }: Props) {
  const isEdit = !!user;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    email:     user?.email ?? "",
    full_name: user?.full_name ?? "",
    password:  "",
    role:      (user?.role ?? "setter") as AppRole,
  });

  function set(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = isEdit
        ? await updateUser(user.id, { full_name: form.full_name, role: form.role, password: form.password || undefined })
        : await createUser(form as UserFormData);

      if (res.error) { setError(res.error); return; }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-black tracking-tight">
            {isEdit ? "Editar usuario" : "Nuevo usuario"}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls}
              value={form.full_name}
              onChange={e => set("full_name", e.target.value)}
              placeholder="Ej: Ana García López"
              autoFocus
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Email <span className="text-red-500">*</span>
              {isEdit && <span className="text-slate-400 font-normal ml-1">(no editable)</span>}
            </label>
            <input
              type="email"
              className={cn(inputCls, isEdit && "bg-slate-50 text-slate-400 cursor-not-allowed")}
              value={form.email}
              onChange={e => set("email", e.target.value)}
              placeholder="correo@ejemplo.com"
              disabled={isEdit}
              readOnly={isEdit}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Contraseña
              {isEdit
                ? <span className="text-slate-400 font-normal ml-1">(dejar vacío para no cambiar)</span>
                : <span className="text-red-500 ml-0.5">*</span>
              }
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={cn(inputCls, "pr-10")}
                value={form.password}
                onChange={e => set("password", e.target.value)}
                placeholder={isEdit ? "Nueva contraseña (opcional)" : "Mínimo 8 caracteres"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Rol <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {APP_ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set("role", r)}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-2.5 text-xs font-semibold border transition-all text-left",
                    form.role === r
                      ? cn("border-transparent", ROLE_COLORS[r])
                      : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
