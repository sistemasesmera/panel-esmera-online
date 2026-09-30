"use client";

import { useState, useTransition } from "react";
import { Plus, Phone, Mail, Video, Users, Trash2, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import { deleteTutoringSession } from "@/app/(app)/tutoring/actions";
import { SessionForm } from "@/components/features/tutoring/session-form";
import type { TutoringRow, EnrollmentForTutoring } from "@/lib/data/tutoring.repository";

const CONTACT_CONFIG: Record<string, { label: string; Icon: React.ElementType; badge: string }> = {
  escrito:      { label: "Escrito",      Icon: Mail,  badge: "bg-blue-100 text-blue-700" },
  llamada:      { label: "Llamada",      Icon: Phone, badge: "bg-emerald-100 text-emerald-700" },
  videollamada: { label: "Videollamada", Icon: Video, badge: "bg-purple-100 text-purple-700" },
  presencial:   { label: "Presencial",   Icon: Users, badge: "bg-amber-100 text-amber-700" },
};

export function TutoringClient({
  enrollments,
  sessions,
  isAdmin,
}: {
  enrollments: EnrollmentForTutoring[];
  sessions: TutoringRow[];
  isAdmin: boolean;
}) {
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [presetId, setPresetId]       = useState<string | undefined>(undefined);
  const [isPending, startTransition]  = useTransition();
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  function openForEnrollment(enrollmentId: string) {
    setPresetId(enrollmentId);
    setDialogOpen(true);
  }

  function openGeneral() {
    setPresetId(undefined);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const res = await deleteTutoringSession(id);
      setDeletingId(null);
      if (res.error) toast.error(res.error);
      else toast.success("Tutoría eliminada");
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Active enrollments ── */}
      <section>
        <h2 className="text-base font-bold text-slate-800 mb-3">
          {isAdmin ? "Matrículas activas" : "Tus matrículas activas"}
        </h2>

        {enrollments.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <CalendarCheck className="h-7 w-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {isAdmin ? "No hay matrículas activas." : "No tienes matrículas activas asignadas."}
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {enrollments.map(e => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 card-shadow"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{e.students?.full_name ?? "—"}</p>
                  <p className="text-xs text-slate-500">{e.courses?.name ?? "—"}</p>
                </div>
                <button
                  onClick={() => openForEnrollment(e.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Registrar tutoría
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── History ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">Historial de tutorías</h2>
          <button
            onClick={openGeneral}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva tutoría
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">No hay tutorías registradas aún.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden card-shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Alumno</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Curso</th>
                  {isAdmin && (
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tutor</th>
                  )}
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tipo</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Fecha</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Duración</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Notas</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => {
                  const ct = CONTACT_CONFIG[s.contact_type];
                  return (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{s.enrollments?.students?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{s.enrollments?.courses?.name ?? "—"}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-xs text-slate-600">{s.users?.full_name ?? "—"}</td>
                      )}
                      <td className="px-4 py-3">
                        {ct ? (
                          <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", ct.badge)}>
                            <ct.Icon className="h-3 w-3" />
                            {ct.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">{s.contact_type}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(s.session_date)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {s.duration_minutes ? `${s.duration_minutes} min` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">
                        <span className="line-clamp-2">{s.notes ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id || isPending}
                          className="rounded p-1 text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Dialog ── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDialogOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl animate-slide-up overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-900">Registrar tutoría</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {presetId
                  ? `Para: ${enrollments.find(e => e.id === presetId)?.students?.full_name ?? "alumno"}`
                  : "Selecciona la matrícula"}
              </p>
            </div>
            {presetId ? (
              <SessionForm
                key={presetId}
                enrollmentId={presetId}
                onSuccess={() => setDialogOpen(false)}
                onCancel={() => setDialogOpen(false)}
              />
            ) : (
              <EnrollmentSelectWrapper
                enrollments={enrollments}
                onSuccess={() => setDialogOpen(false)}
                onCancel={() => setDialogOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// When no enrollment is preset, let user pick one first
function EnrollmentSelectWrapper({
  enrollments,
  onSuccess,
  onCancel,
}: {
  enrollments: EnrollmentForTutoring[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState("");

  if (!selected) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Matrícula</label>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Selecciona una matrícula…</option>
            {enrollments.map(e => (
              <option key={e.id} value={e.id}>
                {e.students?.full_name ?? "?"} — {e.courses?.name ?? "?"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <SessionForm
      key={selected}
      enrollmentId={selected}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}
