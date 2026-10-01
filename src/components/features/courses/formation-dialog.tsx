"use client";

import { useState, useTransition } from "react";
import { X, Loader2, GripVertical, Plus, Trash2 } from "lucide-react";
import { createFormation, updateFormation } from "@/app/(app)/courses/actions";
import type { Formation } from "@/lib/data/formations.repository";
import type { Course } from "@/lib/data/courses.repository";
import { cn } from "@/lib/utils";

type Props = {
  formation?: Formation;
  courses:    Course[];
  onClose:    () => void;
};

export function FormationDialog({ formation, courses, onClose }: Props) {
  const isEdit = !!formation;
  const [pending, start] = useTransition();
  const [error,   setError] = useState<string | null>(null);
  const [name,    setName]  = useState(formation?.name ?? "");
  const [selected, setSelected] = useState<string[]>(
    formation?.courses.map(fc => fc.course_id) ?? []
  );

  const activeCourses = courses.filter(c => c.active);

  function toggle(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    if (selected.length === 0) { setError("Añade al menos un curso"); return; }
    setError(null);
    start(async () => {
      const res = isEdit
        ? await updateFormation(formation.id, name, selected)
        : await createFormation(name, selected);
      if ("error" in res) { setError(res.error); return; }
      onClose();
    });
  }

  const inputCls = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-black tracking-tight">
            {isEdit ? "Editar formación" : "Nueva formación"}
          </h2>
          <button onClick={onClose} className="cursor-pointer text-slate-400 hover:text-slate-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre de la formación <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Instagram Pro"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Cursos que incluye <span className="text-red-500">*</span>
              </label>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {activeCourses.map(c => {
                  const checked = selected.includes(c.id);
                  const pos     = selected.indexOf(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={cn(
                        "cursor-pointer w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl border text-sm transition-all",
                        checked
                          ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors text-[10px] font-black",
                        checked ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300"
                      )}>
                        {checked ? pos + 1 : ""}
                      </div>
                      <span className="flex-1 truncate font-medium">{c.name}</span>
                      {c.category && (
                        <span className="text-[10px] text-slate-400 shrink-0">{c.category}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selected.length > 0 && (
                <p className="mt-2 text-[11px] text-indigo-600 font-semibold">
                  {selected.length} curso{selected.length > 1 ? "s" : ""} seleccionado{selected.length > 1 ? "s" : ""} · el número indica el orden
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear formación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
