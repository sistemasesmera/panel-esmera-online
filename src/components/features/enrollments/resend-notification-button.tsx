"use client";

import { useState, useTransition } from "react";
import { Mail, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { resendEnrollmentNotification } from "@/app/(app)/enrollments/[id]/actions";

export function ResendNotificationButton({ enrollmentId }: { enrollmentId: string }) {
  const [open, setOpen]     = useState(false);
  const [done, setDone]     = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const res = await resendEnrollmentNotification(enrollmentId);
      setOpen(false);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success("Notificación reenviada correctamente");
        setDone(true);
        setTimeout(() => setDone(false), 4000);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        <Mail className="h-3.5 w-3.5" />
        {done ? "Enviado" : "Reenviar notificación"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                    <Send className="h-4 w-4 text-indigo-600" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">Reenviar notificación</h2>
                </div>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm text-slate-600 mb-5">
                Se enviará el email de nueva matrícula a todos los destinatarios (tutor, comercial y administradores). ¿Confirmas?
              </p>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Sí, reenviar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
