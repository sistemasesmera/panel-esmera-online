"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, UserPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createLead } from "@/app/(app)/crm/pipeline/actions";

export function NewLeadModal({
  pipelineId,
  firstStageId,
  onClose,
}: {
  pipelineId:   string;
  firstStageId: string;
  onClose:      () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [phone,      setPhone]      = useState("");
  const [courseName, setCourseName] = useState("");
  const [done,       setDone]       = useState(false);

  function handleSubmit() {
    if (!name.trim()) { toast.error("El nombre es obligatorio"); return; }

    startTransition(async () => {
      const res = await createLead(
        pipelineId,
        firstStageId,
        name.trim(),
        email.trim() || null,
        phone.trim() || null,
        courseName.trim() || null,
      );
      if ("error" in res) { toast.error(res.error); return; }
      setDone(true);
    });
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400";
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1";

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-1">¡Lead creado!</h2>
          <p className="text-sm text-slate-500 mb-6">
            <span className="font-semibold text-slate-800">{name}</span> aparecerá en la columna <span className="font-semibold">Lead Nuevo</span> del pipeline.
          </p>
          <button
            onClick={() => { router.refresh(); onClose(); }}
            className="cursor-pointer w-full bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Ver en el pipeline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100">
              <UserPlus className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Nuevo lead orgánico</h2>
              <p className="text-[11px] text-slate-400">Se creará directamente en el pipeline</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Nombre completo <span className="text-red-400">*</span></label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Ej. Ana García López"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Curso de interés</label>
            <input
              type="text"
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              placeholder="Ej. Marketing digital"
              className={inputCls}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 pb-5 pt-1">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            className="cursor-pointer flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            {isPending ? "Creando…" : "Crear lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
