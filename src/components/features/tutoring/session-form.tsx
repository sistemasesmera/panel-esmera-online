"use client";

import { useState, useTransition } from "react";
import { Phone, Mail, Video, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createTutoringSession, type CreateSessionInput } from "@/app/(app)/tutoring/actions";

const CONTACT_TYPES = ["escrito", "llamada", "videollamada", "presencial"] as const;
type ContactType = (typeof CONTACT_TYPES)[number];

const CONTACT_CONFIG: Record<ContactType, { label: string; Icon: React.ElementType }> = {
  escrito:      { label: "Escrito",      Icon: Mail  },
  llamada:      { label: "Llamada",      Icon: Phone },
  videollamada: { label: "Videollamada", Icon: Video },
  presencial:   { label: "Presencial",   Icon: Users },
};

type Props = {
  enrollmentId: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function SessionForm({ enrollmentId, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition();
  const [contactType, setContactType] = useState<ContactType>("llamada");
  const [date, setDate]               = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]             = useState("");
  const [duration, setDuration]       = useState("");
  const [error, setError]             = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: CreateSessionInput = {
      enrollment_id:    enrollmentId,
      contact_type:     contactType,
      session_date:     date,
      notes:            notes.trim() || undefined,
      duration_minutes: duration ? parseInt(duration, 10) : null,
    };
    startTransition(async () => {
      const res = await createTutoringSession(input);
      if (res.error) { setError(res.error); return; }
      toast.success("Tutoría registrada");
      onSuccess();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 p-6">
      {/* Contact type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de contacto</label>
        <div className="grid grid-cols-2 gap-2">
          {CONTACT_TYPES.map(ct => {
            const { label, Icon } = CONTACT_CONFIG[ct];
            const active = contactType === ct;
            return (
              <button
                key={ct}
                type="button"
                onClick={() => setContactType(ct)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
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

      {/* Date + Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Duración (min)</label>
          <input
            type="number"
            min={1}
            max={480}
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="60"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="Describe cómo fue la tutoría…"
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {isPending ? "Registrando…" : "Registrar tutoría"}
        </button>
      </div>
    </form>
  );
}
