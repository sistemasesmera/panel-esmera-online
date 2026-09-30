"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Users, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/app/(app)/admin/users/actions";
import { ROLE_LABELS, type AppRole } from "@/lib/domain/shared/permissions";
import { UserDialog } from "./user-dialog";
import { cn, formatDate } from "@/lib/utils";
import type { UserRow } from "@/lib/data/users.repository";

const ROLE_COLORS: Record<AppRole, string> = {
  setter:         "bg-blue-50 text-blue-600 ring-1 ring-blue-200/60",
  closer:         "bg-violet-50 text-violet-600 ring-1 ring-violet-200/60",
  administracion: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/60",
  tutor:          "bg-teal-50 text-teal-600 ring-1 ring-teal-200/60",
};

const AVATAR_GRADIENTS = [
  "from-indigo-400 to-indigo-600",
  "from-violet-400 to-violet-600",
  "from-blue-400 to-blue-600",
  "from-teal-400 to-teal-600",
];

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

export function UsersClient({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<{ open: boolean; user?: UserRow }>({ open: false });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function handleClose() {
    setDialog({ open: false });
    router.refresh();
  }

  function confirmDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
  }

  function cancelDelete() {
    setDeletingId(null);
    setDeleteError(null);
  }

  function doDelete(id: string) {
    startDelete(async () => {
      const res = await deleteUser(id);
      if (res.error) {
        setDeleteError(res.error);
        return;
      }
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} {users.length === 1 ? "usuario registrado" : "usuarios registrados"}
          </p>
        </div>
        <button
          onClick={() => setDialog({ open: true })}
          className="cursor-pointer inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </button>
      </div>

      {/* Delete error banner */}
      {deleteError && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {deleteError}
          <button onClick={() => setDeleteError(null)} className="cursor-pointer ml-auto text-red-400 hover:text-red-700">✕</button>
        </div>
      )}

      {users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center card-shadow">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-500 mb-4">No hay usuarios registrados</p>
          <button
            onClick={() => setDialog({ open: true })}
            className="cursor-pointer inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Crear primer usuario
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden card-shadow">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Usuario</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Rol</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Alta</th>
                <th className="w-24 px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const idx = (u.full_name ?? u.email ?? "?").charCodeAt(0) % 4;
                const isDeleting = deletingId === u.id;
                const isMe = u.id === currentUserId;

                if (isDeleting) {
                  return (
                    <tr key={u.id} className="bg-red-50/60">
                      <td colSpan={4} className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                          <span className="text-sm font-semibold text-red-700">
                            ¿Eliminar a <span className="font-black">{u.full_name ?? u.email}</span>? Esta acción no se puede deshacer.
                          </span>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={cancelDelete}
                              disabled={deleting}
                              className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => doDelete(u.id)}
                              disabled={deleting}
                              className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                            >
                              {deleting && <span className="inline-block h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                              Sí, eliminar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 bg-gradient-to-br",
                          AVATAR_GRADIENTS[idx]
                        )}>
                          {initials(u.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 leading-tight">
                            {u.full_name ?? "Sin nombre"}
                            {isMe && (
                              <span className="ml-2 text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">Tú</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full", ROLE_COLORS[u.role] ?? "bg-slate-100 text-slate-500")}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-medium">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDialog({ open: true, user: u })}
                          title="Editar"
                          className="cursor-pointer p-1.5 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {!isMe && (
                          <button
                            onClick={() => confirmDelete(u.id)}
                            title="Eliminar"
                            className="cursor-pointer p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog.open && (
        <UserDialog user={dialog.user} onClose={handleClose} />
      )}
    </>
  );
}
