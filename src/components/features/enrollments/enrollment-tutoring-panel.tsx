"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Phone, Mail, Video, Trash2, CalendarCheck, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import { deleteTutoringSession } from "@/app/(app)/tutoring/actions";
import { SessionForm } from "@/components/features/tutoring/session-form";
import type { TutoringRow } from "@/lib/data/tutoring.repository";

const CONTACT_CONFIG: Record<string, { label: string; Icon: React.ElementType; badge: string }> = {
  llamada:      { label: "Llamada",      Icon: Phone, badge: "bg-emerald-100 text-emerald-700" },
  email:        { label: "Email",        Icon: Mail,  badge: "bg-sky-100 text-sky-700"         },
  videollamada: { label: "Videollamada", Icon: Video, badge: "bg-violet-100 text-violet-700"   },
};

type Props = {
  enrollmentId:    string;
  initialSessions: TutoringRow[];
};

export function EnrollmentTutoringPanel({ enrollmentId, initialSessions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [dialogMode,  setDialogMode]  = useState<"create" | null>(null);
  const [editSession, setEditSession] = useState<TutoringRow | null>(null);

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta tutoría?")) return;
    setDeletingId(id);
    startTransition(async () => {
      const res = await deleteTutoringSession(id);
      setDeletingId(null);
      if (res.error) { toast.error(res.error); return; }
      toast.success("Tutoría eliminada");
      router.refresh();
    });
  }

  function handleSuccess() {
    setDialogMode(null);
    setEditSession(null);
    router.refresh();
  }

  const showDialog = dialogMode === "create" || editSession !== null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 card-shadow">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">Tutorías</h2>
          {initialSessions.length > 0 && (
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {initialSessions.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { setEditSession(null); setDialogMode("create"); }}
          className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Registrar tutoría
        </button>
      </div>

      {/* Body */}
      {initialSessions.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <CalendarCheck className="h-7 w-7 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No hay tutorías registradas para esta matrícula.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {initialSessions.map(s => {
            const ct = CONTACT_CONFIG[s.contact_type];
            return (
              <li key={s.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors group">
                {/* Type badge */}
                <div className="shrink-0 mt-0.5">
                  {ct ? (
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full", ct.badge)}>
                      <ct.Icon className="h-3 w-3" />
                      {ct.label}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">{s.contact_type}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-bold text-slate-800">Tutoría: {formatDate(s.session_date)}</span>
                    {s.users?.full_name && (
                      <span className="text-[11px] text-slate-400 italic">por {s.users.full_name}</span>
                    )}
                  </div>
                  <div className="mb-1">
                    <span className="text-[11px] text-slate-400">Registrada: {formatDate(s.created_at)}</span>
                  </div>
                  {s.notes && (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{s.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setDialogMode(null); setEditSession(s); }}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id || isPending}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => { setDialogMode(null); setEditSession(null); }} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl animate-slide-up overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-sm font-black text-slate-900">
                {editSession ? "Editar tutoría" : "Registrar tutoría"}
              </h3>
              <button
                onClick={() => { setDialogMode(null); setEditSession(null); }}
                className="cursor-pointer p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SessionForm
              enrollmentId={enrollmentId}
              editing={editSession ?? undefined}
              onSuccess={handleSuccess}
              onCancel={() => { setDialogMode(null); setEditSession(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
