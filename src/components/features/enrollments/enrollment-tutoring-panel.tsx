"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Phone, Mail, Video, Users, Trash2, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import { deleteTutoringSession } from "@/app/(app)/tutoring/actions";
import { SessionForm } from "@/components/features/tutoring/session-form";
import type { TutoringRow } from "@/lib/data/tutoring.repository";

const CONTACT_CONFIG: Record<string, { label: string; Icon: React.ElementType; badge: string }> = {
  escrito:      { label: "Escrito",      Icon: Mail,  badge: "bg-blue-100 text-blue-700" },
  llamada:      { label: "Llamada",      Icon: Phone, badge: "bg-emerald-100 text-emerald-700" },
  videollamada: { label: "Videollamada", Icon: Video, badge: "bg-purple-100 text-purple-700" },
  presencial:   { label: "Presencial",   Icon: Users, badge: "bg-amber-100 text-amber-700" },
};

type Props = {
  enrollmentId: string;
  initialSessions: TutoringRow[];
};

export function EnrollmentTutoringPanel({ enrollmentId, initialSessions }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen]  = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId]  = useState<string | null>(null);

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
    setDialogOpen(false);
    router.refresh();
  }

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
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
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
              <li key={s.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">
                {/* Type badge */}
                <div className="shrink-0 mt-0.5">
                  {ct ? (
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", ct.badge)}>
                      <ct.Icon className="h-3 w-3" />
                      {ct.label}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">{s.contact_type}</span>
                  )}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-semibold text-slate-700">{formatDate(s.session_date)}</span>
                    {s.duration_minutes && (
                      <span className="text-[11px] text-slate-400">{s.duration_minutes} min</span>
                    )}
                    {s.users?.full_name && (
                      <span className="text-[11px] text-slate-400">Tutor: {s.users.full_name}</span>
                    )}
                  </div>
                  {s.notes && (
                    <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{s.notes}</p>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id || isPending}
                  className="shrink-0 rounded p-1 text-slate-200 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-50 transition-all disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDialogOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl animate-slide-up overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-900">Registrar tutoría</h3>
            </div>
            <SessionForm
              enrollmentId={enrollmentId}
              onSuccess={handleSuccess}
              onCancel={() => setDialogOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
