"use client";

import { useState, useTransition } from "react";
import { Phone, Mail, Video } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createTutoringSession,
  updateTutoringSession,
  type CreateSessionInput,
} from "@/app/(app)/tutoring/actions";
import type { TutoringRow } from "@/lib/data/tutoring.repository";

const CONTACT_TYPES = ["llamada", "email", "videollamada"] as const;
type ContactType = (typeof CONTACT_TYPES)[number];

const CONTACT_CONFIG: Record<ContactType, { label: string; Icon: React.ElementType }> = {
  llamada:      { label: "Llamada",      Icon: Phone },
  email:        { label: "Email",        Icon: Mail  },
  videollamada: { label: "Videollamada", Icon: Video },
};

type Props = {
  enrollmentId: string;
  editing?:     TutoringRow;
  onSuccess:    () => void;
  onCancel:     () => void;
};

export function SessionForm({ enrollmentId, editing, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition();
  const [contactType, setContactType] = useState<ContactType>(
    (editing?.contact_type as ContactType) ?? "llamada"
  );
  const [date,  setDate]  = useState(
    editing ? editing.session_date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const fieldCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 transition-shadow";
  const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      let res;
      if (editing) {
        res = await updateTutoringSession(editing.id, {
          contact_type: contactType,
          session_date: date,
          notes:        notes.trim() || undefined,
        });
      } else {
        const input: CreateSessionInput = {
          enrollment_id: enrollmentId,
          contact_type:  contactType,
          session_date:  date,
          notes:         notes.trim() || undefined,
        };
        res = await createTutoringSession(input);
      }
      if (res.error) { setError(res.error); return; }
      toast.success(editing ? "Tutoría actualizada" : "Tutoría registrada");
      onSuccess();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 p-6">

      {/* Tipo de contacto */}
      <div>
        <label className={labelCls}>Tipo de contacto</label>
        <div className="grid grid-cols-3 gap-2">
          {CONTACT_TYPES.map(ct => {
            const { label, Icon } = CONTACT_CONFIG[ct];
            const active = contactType === ct;
            return (
              <button
                key={ct}
                type="button"
                onClick={() => setContactType(ct)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all cursor-pointer",
                  active
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-slate-700"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fecha */}
      <div>
        <label className={labelCls}>Fecha de la tutoría</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className={fieldCls}
        />
      </div>

      {/* Notas */}
      <div>
        <label className={labelCls}>Notas</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="¿Cómo fue la sesión? ¿Qué temas se trataron?"
          className={cn(fieldCls, "resize-none")}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="cursor-pointer flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="cursor-pointer flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {isPending ? "Guardando…" : editing ? "Guardar cambios" : "Registrar tutoría"}
        </button>
      </div>
    </form>
  );
}
