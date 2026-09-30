"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check, Monitor, User2 } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import { updateEnrollmentInfo } from "@/app/(app)/enrollments/[id]/actions";

type Platform = { id: string; name: string };
type Tutor    = { id: string; full_name: string };

type Props = {
  enrollmentId:   string;
  platform:       Platform | null;
  tutor:          Tutor | null;
  startDate:      string | null;
  endDate:        string | null;
  durationMonths: number | null;
  notes:          string | null;
  platforms:      Platform[];
  tutors:         Tutor[];
};

export function EnrollmentInfoPanel({
  enrollmentId,
  platform,
  tutor,
  startDate,
  endDate,
  durationMonths,
  notes,
  platforms,
  tutors,
}: Props) {
  const router = useRouter();
  const [editing, setEditing]        = useState(false);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    platform_id:     platform?.id     ?? "",
    tutor_id:        tutor?.id        ?? "",
    start_date:      startDate?.slice(0, 10) ?? "",
    end_date:        endDate?.slice(0, 10)   ?? "",
    duration_months: durationMonths?.toString() ?? "",
    notes:           notes ?? "",
  });

  function set(key: keyof typeof form, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleSave() {
    startTransition(async () => {
      const res = await updateEnrollmentInfo(enrollmentId, {
        platform_id:     form.platform_id     || null,
        tutor_id:        form.tutor_id        || null,
        start_date:      form.start_date      || null,
        end_date:        form.end_date        || null,
        duration_months: form.duration_months ? parseInt(form.duration_months) : null,
        notes:           form.notes.trim()    || null,
      });
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Matrícula actualizada");
      setEditing(false);
      router.refresh();
    });
  }

  function handleCancel() {
    setForm({
      platform_id:     platform?.id     ?? "",
      tutor_id:        tutor?.id        ?? "",
      start_date:      startDate?.slice(0, 10) ?? "",
      end_date:        endDate?.slice(0, 10)   ?? "",
      duration_months: durationMonths?.toString() ?? "",
      notes:           notes ?? "",
    });
    setEditing(false);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelCls = "text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5";

  return (
    <div className="bg-white rounded-xl border border-slate-200 card-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">Detalles de la matrícula</h2>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X className="h-3 w-3" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              <Check className="h-3 w-3" />
              {isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {!editing ? (
          /* ── Read mode ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Plataforma">{platform?.name ?? <Dash />}</Field>
            <Field label="Tutor asignado">
              {tutor ? (
                <span className="flex items-center gap-1.5">
                  <User2 className="h-3.5 w-3.5 text-slate-400" />
                  {tutor.full_name}
                </span>
              ) : <Dash />}
            </Field>
            <Field label="Fecha de inicio">{startDate ? formatDate(startDate) : <Dash />}</Field>
            <Field label="Fecha de fin">{endDate ? formatDate(endDate) : <Dash />}</Field>
            <Field label="Duración">{durationMonths ? `${durationMonths} meses` : <Dash />}</Field>
            {notes && (
              <div className="col-span-2 sm:col-span-3">
                <p className={cn(labelCls)}>Notas</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{notes}</p>
              </div>
            )}
          </div>
        ) : (
          /* ── Edit mode ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={cn(labelCls)}>Plataforma</label>
              <select value={form.platform_id} onChange={e => set("platform_id", e.target.value)} className={inputCls}>
                <option value="">Sin plataforma</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={cn(labelCls)}>Tutor asignado</label>
              <select value={form.tutor_id} onChange={e => set("tutor_id", e.target.value)} className={inputCls}>
                <option value="">Sin tutor</option>
                {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className={cn(labelCls)}>Fecha de inicio</label>
              <input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={cn(labelCls)}>Fecha de fin</label>
              <input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={cn(labelCls)}>Duración (meses)</label>
              <input type="number" min={1} max={60} value={form.duration_months} onChange={e => set("duration_months", e.target.value)} placeholder="12" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={cn(labelCls)}>Notas internas</label>
              <textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                rows={3}
                placeholder="Notas internas sobre esta matrícula…"
                className={cn(inputCls, "resize-none")}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800">{children}</p>
    </div>
  );
}

function Dash() {
  return <span className="text-slate-300">—</span>;
}
