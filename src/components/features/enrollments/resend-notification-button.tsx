"use client";

import { useState, useTransition } from "react";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resendEnrollmentNotification } from "@/app/(app)/enrollments/[id]/actions";

export function ResendNotificationButton({ enrollmentId }: { enrollmentId: string }) {
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await resendEnrollmentNotification(enrollmentId);
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
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-60"
    >
      {isPending
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Mail className="h-3.5 w-3.5" />
      }
      {done ? "Enviado" : "Reenviar notificación"}
    </button>
  );
}
