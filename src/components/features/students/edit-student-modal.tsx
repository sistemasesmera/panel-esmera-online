"use client";

import { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { updateStudentProfile } from "@/app/(app)/students/[id]/actions";

interface Props {
  studentId: string;
  initialData: {
    full_name: string;
    email: string;
    phone: string | null;
    dni_nie: string | null;
  };
}

export function EditStudentModal({ studentId, initialData }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1";

  function openModal() {
    setForm(initialData);
    setOpen(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateStudentProfile(studentId, form);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Datos actualizados");
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={openModal}
        className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
      >
        <Pencil className="h-3 w-3" />
        Editar
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-900">Editar datos del alumno</h2>
          <button
            onClick={() => setOpen(false)}
            className="cursor-pointer text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="full_name" className={labelCls}>Nombre completo</label>
            <input
              id="full_name"
              name="full_name"
              className={inputCls}
              value={form.full_name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className={labelCls}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className={inputCls}
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className={labelCls}>Teléfono</label>
            <input
              id="phone"
              name="phone"
              className={inputCls}
              value={form.phone ?? ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="dni_nie" className={labelCls}>DNI / NIE / Pasaporte</label>
            <input
              id="dni_nie"
              name="dni_nie"
              className={inputCls}
              value={form.dni_nie ?? ""}
              onChange={handleChange}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="cursor-pointer px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="cursor-pointer px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
