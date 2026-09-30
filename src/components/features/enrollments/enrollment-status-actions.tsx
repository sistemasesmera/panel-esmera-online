"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, PlayCircle, XCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateEnrollmentStatus } from "@/app/(app)/enrollments/[id]/actions";

type Status = "pendiente_firma" | "en_curso" | "finalizada" | "cancelada";

const TRANSITIONS: Record<Status, { value: Status; label: string; icon: React.ElementType; cls: string }[]> = {
  pendiente_firma: [
    { value: "en_curso",   label: "Marcar en curso",   icon: PlayCircle,    cls: "text-emerald-600 hover:bg-emerald-50" },
    { value: "cancelada",  label: "Cancelar matrícula", icon: XCircle,       cls: "text-red-500 hover:bg-red-50" },
  ],
  en_curso: [
    { value: "finalizada", label: "Marcar finalizada",  icon: CheckCircle2,  cls: "text-blue-600 hover:bg-blue-50" },
    { value: "cancelada",  label: "Cancelar matrícula", icon: XCircle,       cls: "text-red-500 hover:bg-red-50" },
  ],
  finalizada: [
    { value: "en_curso",   label: "Reactivar",          icon: PlayCircle,    cls: "text-emerald-600 hover:bg-emerald-50" },
  ],
  cancelada: [
    { value: "en_curso",   label: "Reactivar",          icon: PlayCircle,    cls: "text-emerald-600 hover:bg-emerald-50" },
  ],
};

export function EnrollmentStatusActions({
  enrollmentId,
  currentStatus,
}: {
  enrollmentId:  string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [pending, startTransition] = useTransition();

  const status = currentStatus as Status;
  const options = TRANSITIONS[status] ?? [];
  if (!options.length) return null;

  function handleChange(next: Status) {
    setOpen(false);
    if (next === "pendiente_firma") return;
    startTransition(async () => {
      const res = await updateEnrollmentStatus(enrollmentId, next);
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Estado actualizado");
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={pending}
        className={cn(
          "cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50",
        )}
      >
        Cambiar estado
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-slate-200 shadow-lg py-1 min-w-[180px]">
            {options.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleChange(opt.value)}
                  className={cn(
                    "cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors",
                    opt.cls,
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
